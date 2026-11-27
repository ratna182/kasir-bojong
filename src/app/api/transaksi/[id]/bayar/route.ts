import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, getKasirWarungId, requireKasirAccess } from '@/lib/auth'
import { apiRateLimiter } from '@/lib/rate-limiter'
import { getOpenShift } from '@/lib/kasir-shift'
import {
  DAILY_TRANSACTION_LIMIT,
  parseMetodePembayaran,
  paymentFields,
  validateCashPayment,
  validateSplitPayment,
  type CashPaymentMeta,
} from '@/lib/transaksi-checkout'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = getAuthContext(request)
    const authError = await requireKasirAccess(context)
    if (authError) return authError

    const warungId = await getKasirWarungId(context)
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
    }

    const { id } = await params

    const rateLimitKey = `bayar:${warungId}:${id}`
    const { allowed } = apiRateLimiter.check(rateLimitKey)
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak request. Coba lagi sebentar.' },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, message: 'Data pembayaran tidak valid.' }, { status: 422 })
    }
    const payload = body as Record<string, unknown>
    const metodePembayaran = parseMetodePembayaran(payload.metodePembayaran)

    if (!metodePembayaran) {
      return NextResponse.json({ success: false, message: 'Metode bayar wajib dipilih.' }, { status: 422 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const shift = await getOpenShift(tx, warungId)
      if (!shift) return 'CLOSED'

      const openOrder = await tx.transaksi.findFirst({
        where: { id, warungId, shiftId: shift.id, status: 'OPEN' },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      })

      if (!openOrder) return null
      if (openOrder.items.length === 0 || openOrder.total < 1) return 'EMPTY'

      const completedInShift = await tx.transaksi.count({
        where: {
          warungId,
          shiftId: shift.id,
          status: 'SELESAI',
        },
      })
      if (completedInShift >= DAILY_TRANSACTION_LIMIT) return 'LIMIT'

      let cash: CashPaymentMeta | null = null
      if (metodePembayaran === 'CASH' || metodePembayaran === 'SPLIT') {
        const validated = metodePembayaran === 'CASH'
          ? validateCashPayment(payload.uangDiterima, openOrder.total)
          : validateSplitPayment(payload.jumlahTransfer, payload.uangDiterima, openOrder.total)
        if (!validated.ok) return { error: 'INVALID_PAYMENT', message: validated.message }
        cash = validated.meta
      }

      const claimed = await tx.transaksi.updateMany({
        where: { id, warungId, shiftId: shift.id, status: 'OPEN' },
        data: {
          status: 'SELESAI',
          metodePembayaran,
          ...paymentFields(metodePembayaran, openOrder.total, cash),
          printedAt: new Date(),
        },
      })
      if (claimed.count !== 1) return 'CONFLICT'

      const transaksi = await tx.transaksi.findUnique({
        where: { id },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      })
      return transaksi ? { transaksi, cash } : null
    })

    if (!result) {
      return NextResponse.json({ success: false, message: 'Order aktif tidak ditemukan.' }, { status: 404 })
    }

    if (typeof result === 'string') {
      const messages: Record<string, { message: string; status: number }> = {
        CLOSED: { message: 'Buka kasir terlebih dahulu.', status: 409 },
        EMPTY: { message: 'Order belum punya item pesanan.', status: 422 },
        LIMIT: { message: `Batas ${DAILY_TRANSACTION_LIMIT} transaksi per shift sudah tercapai.`, status: 409 },
        CONFLICT: { message: 'Order ini baru saja dibayar oleh proses lain. Muat ulang halaman.', status: 409 },
      }
      const failure = messages[result]
      return NextResponse.json({ success: false, message: failure.message }, { status: failure.status })
    }

    if ('error' in result) {
      return NextResponse.json({ success: false, message: result.message }, { status: 422 })
    }

    return NextResponse.json({ success: true, data: result.transaksi, meta: { cash: result.cash } })
  } catch (error) {
    console.error('[POST /api/transaksi/[id]/bayar]', error)
    return NextResponse.json({ success: false, message: 'Gagal memproses pembayaran.' }, { status: 500 })
  }
}
