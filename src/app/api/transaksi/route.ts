import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthContext, getKasirWarungId, requireKasirAccess } from '@/lib/auth'
import { apiRateLimiter } from '@/lib/rate-limiter'
import { getOpenShift } from '@/lib/kasir-shift'
import { getStoreDayRange } from '@/lib/time'
import { VALID_TABLE_NAMES } from '@/lib/table-layout'
import { isRupiahAmount } from '@/lib/rupiah'
import { isValidIdempotencyKey, MAX_ITEM_QTY, MAX_UNIT_PRICE } from '@/lib/transaksi-checkout'

type IncomingItem = {
  menuId: string
  qty: number
  hargaSatuan?: number
  diskonSatuan?: number
  catatan?: string
}

const TRANSAKSI_INCLUDE = {
  items: { orderBy: { createdAt: 'asc' as const } },
} as const

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}

function isUniqueOpenOrderError(error: unknown) {
  return isPrismaError(error, 'P2002')
}

function isTransactionConflict(error: unknown) {
  return isPrismaError(error, 'P2034')
}

// POST /api/transaksi - buat/append order sementara (kasir only)
export async function POST(request: NextRequest) {
  let warungId: string | null = null
  let nomorMeja = ''
  let idempotencyKey: string | null = null

  try {
    const context = getAuthContext(request)
    const authError = await requireKasirAccess(context)
    if (authError) return authError

    warungId = await getKasirWarungId(context)
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
    }
    const activeWarungId = warungId

    const rateLimitKey = `simpan-order:${activeWarungId}:${context!.user.id}`
    const { allowed } = apiRateLimiter.check(rateLimitKey)
    if (!allowed) {
      return NextResponse.json({ success: false, message: 'Terlalu banyak request. Coba lagi sebentar.' }, { status: 429 })
    }

    const body = await request.json()
    nomorMeja = body.nomorMeja?.toString().trim() ?? ''
    const items = body.items as IncomingItem[] | undefined
    const rawIdempotencyKey = body.idempotencyKey
    if (rawIdempotencyKey !== undefined && rawIdempotencyKey !== null && !isValidIdempotencyKey(rawIdempotencyKey)) {
      return NextResponse.json({ success: false, message: 'Kunci penyimpanan tidak valid.' }, { status: 422 })
    }
    idempotencyKey = isValidIdempotencyKey(rawIdempotencyKey) ? rawIdempotencyKey : null

    if (!nomorMeja) {
      return NextResponse.json({ success: false, message: 'Nomor meja wajib diisi.' }, { status: 422 })
    }
    const kasirId = context!.user.id

    if (!VALID_TABLE_NAMES.has(nomorMeja)) {
      return NextResponse.json({ success: false, message: 'Nomor meja harus Meja 1-50, Lesehan 1-50, atau Bungkus.' }, { status: 422 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'Tambahkan minimal 1 item pesanan.' }, { status: 422 })
    }

    for (const item of items) {
      const qty = Number(item.qty)
      if (!item.menuId || !Number.isInteger(qty) || qty < 1 || qty > MAX_ITEM_QTY) {
        return NextResponse.json({ success: false, message: `Qty harus antara 1 dan ${MAX_ITEM_QTY}.` }, { status: 422 })
      }
      if ((item.hargaSatuan !== undefined && (!isRupiahAmount(item.hargaSatuan) || item.hargaSatuan > MAX_UNIT_PRICE)) ||
        (item.diskonSatuan !== undefined && (!isRupiahAmount(item.diskonSatuan) || item.diskonSatuan > MAX_UNIT_PRICE)) ||
        (item.catatan !== undefined && (typeof item.catatan !== 'string' || item.catatan.length > 160))) {
        return NextResponse.json({ success: false, message: 'Penyesuaian item tidak valid.' }, { status: 422 })
      }
    }

    const menuIds = [...new Set(items.map((item) => item.menuId))]
    const menus = await prisma.menu.findMany({
      where: { id: { in: menuIds }, warungId: activeWarungId, isAktif: true },
      include: { warungMenus: { where: { warungId: activeWarungId }, select: { harga: true } } },
    })

    if (menus.length !== menuIds.length) {
      return NextResponse.json({
        success: false,
        message: 'Beberapa menu tidak valid atau sudah tidak aktif.',
      }, { status: 422 })
    }

    const menusById = new Map(menus.map((menu) => [menu.id, menu]))
    const processedItems: Array<{ menuId: string; namaMenu: string; hargaSatuan: number; diskonSatuan: number; catatan: string | null; qty: number; subtotal: number }> = []
    for (const item of items) {
      const menu = menusById.get(item.menuId)!
      const qty = Number(item.qty)
      const effectiveHarga = menu.warungMenus[0]?.harga ?? menu.harga
      const hargaSatuan = item.hargaSatuan === undefined ? effectiveHarga : item.hargaSatuan
      const diskonSatuan = item.diskonSatuan ?? 0
      const catatan = item.catatan?.trim() || null
      if (diskonSatuan > hargaSatuan) {
        return NextResponse.json({ success: false, message: 'Diskon tidak boleh melebihi harga satuan.' }, { status: 422 })
      }
      processedItems.push({
        menuId: menu.id,
        namaMenu: menu.nama,
        hargaSatuan,
        diskonSatuan,
        catatan,
        qty,
        subtotal: (hargaSatuan - diskonSatuan) * qty,
      })
    }
    const addedTotal = processedItems.reduce((sum, item) => sum + item.subtotal, 0)
    const saveKey = idempotencyKey

    const runSave = () => prisma.$transaction(async (tx) => {
      const shift = await getOpenShift(tx, activeWarungId)
      if (!shift) return { type: 'CLOSED' as const }

      if (saveKey) {
        const existingByKey = await tx.transaksi.findFirst({
          where: { warungId: activeWarungId, idempotencyKey: saveKey },
          include: TRANSAKSI_INCLUDE,
        })
        if (existingByKey) {
          if (existingByKey.status === 'OPEN' && existingByKey.nomorMeja === nomorMeja) {
            return { type: 'SAVED' as const, transaksi: existingByKey, idempotent: true }
          }
          return { type: 'KEY_CONFLICT' as const }
        }
      }

      const existing = await tx.transaksi.findFirst({
        where: { warungId: activeWarungId, nomorMeja, status: 'OPEN', shiftId: shift.id },
      })

      if (!existing) {
        const created = await tx.transaksi.create({
          data: {
            warungId: activeWarungId,
            kasirId,
            shiftId: shift.id,
            nomorMeja,
            status: 'OPEN',
            total: addedTotal,
            tanggal: getStoreDayRange(shift.dibukaPada ?? new Date()).today,
            ...(saveKey ? { idempotencyKey: saveKey } : {}),
            items: { create: processedItems },
          },
          include: TRANSAKSI_INCLUDE,
        })
        return { type: 'SAVED' as const, transaksi: created, idempotent: false }
      }

      await tx.transaksiItem.createMany({
        data: processedItems.map((item) => ({ ...item, transaksiId: existing.id })),
      })

      const updated = await tx.transaksi.update({
        where: { id: existing.id },
        data: {
          total: existing.total + addedTotal,
          ...(saveKey ? { idempotencyKey: saveKey } : {}),
        },
        include: TRANSAKSI_INCLUDE,
      })
      return { type: 'SAVED' as const, transaksi: updated, idempotent: false }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    const saveWithRetry = async () => {
      for (let attempt = 1; ; attempt++) {
        try {
          return await runSave()
        } catch (error) {
          if (attempt < 2 && isTransactionConflict(error)) continue
          throw error
        }
      }
    }

    const result = await saveWithRetry()

    if (result.type === 'CLOSED') {
      return NextResponse.json({
        success: false,
        message: 'Buka kasir terlebih dahulu.',
      }, { status: 409 })
    }

    if (result.type === 'KEY_CONFLICT') {
      return NextResponse.json({
        success: false,
        message: 'Penyimpanan ini sudah dipakai transaksi lain. Muat ulang halaman.',
      }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      data: result.transaksi,
      meta: { idempotent: result.idempotent },
    }, { status: result.idempotent ? 200 : 201 })
  } catch (error) {
    if (isUniqueOpenOrderError(error)) {
      if (warungId && idempotencyKey) {
        const existing = await prisma.transaksi.findFirst({
          where: { warungId, idempotencyKey },
          include: TRANSAKSI_INCLUDE,
        })
        if (existing) {
          if (existing.nomorMeja === nomorMeja && existing.status === 'OPEN') {
            return NextResponse.json({ success: true, data: existing, meta: { idempotent: true } }, { status: 200 })
          }
          return NextResponse.json({
            success: false,
            message: 'Penyimpanan ini sudah dipakai transaksi lain. Muat ulang halaman.',
          }, { status: 409 })
        }
      }
      return NextResponse.json({
        success: false,
        message: 'Meja ini sudah ada order aktif, refresh dan lanjutkan order yang sudah ada.',
      }, { status: 409 })
    }

    if (isTransactionConflict(error)) {
      return NextResponse.json({
        success: false,
        message: 'Penyimpanan sedang diproses oleh kasir lain. Coba lagi.',
      }, { status: 409 })
    }

    console.error('[POST /api/transaksi]', error)
    return NextResponse.json({
      success: false,
      message: 'Gagal menyimpan pesanan. Silakan coba lagi.',
    }, { status: 500 })
  }
}

// GET /api/transaksi - daftar transaksi selesai hari ini (kasir only)
export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = await requireKasirAccess(context)
    if (authError) return authError

    const warungId = await getKasirWarungId(context)
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
    }
    const { allowed } = apiRateLimiter.check(`transaksi-list:${warungId}:${context!.user.id}`)
    if (!allowed) {
      return NextResponse.json({ success: false, message: 'Terlalu banyak request. Coba lagi sebentar.' }, { status: 429 })
    }
    const shift = await getOpenShift(prisma, warungId)
    if (!shift) {
      return NextResponse.json({ success: true, data: [] })
    }

    const transaksis = await prisma.transaksi.findMany({
      where: {
        warungId,
        shiftId: shift.id,
        status: 'SELESAI',
      },
      include: { items: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: transaksis })
  } catch (error) {
    console.error('[GET /api/transaksi]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil transaksi.' }, { status: 500 })
  }
}
