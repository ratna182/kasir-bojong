import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    kasirShift: { findFirst: vi.fn() },
    menu: { findMany: vi.fn() },
    transaksi: { findMany: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  getAuthContext: vi.fn(),
  requireRole: vi.fn(),
  requireKasirAccess: vi.fn(),
  getKasirWarungId: vi.fn(),
}))

vi.mock('@/lib/rate-limiter', () => ({
  apiRateLimiter: { check: vi.fn(() => ({ allowed: true, remaining: 99, resetIn: 60000 })) },
}))

import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { apiRateLimiter } from '@/lib/rate-limiter'
import { getAuthContext, requireRole, requireKasirAccess, getKasirWarungId } from '@/lib/auth'
import type { AuthContext } from '@/lib/auth'

const context: AuthContext = {
  user: {
    id: 'kasir1',
    username: 'kasir1',
    namaLengkap: null,
    role: 'KASIR',
    warungId: 'warung1',
    warungNama: null,
    warungKode: null,
  },
  warungId: 'warung1',
}
const menu = {
  id: 'menu1',
  nama: 'Ikan Bakar',
  harga: 25000,
  warungId: 'warung1',
  categoryId: 'cat-1',
  sortOrder: 0,
  isAktif: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  warungMenus: [{ harga: 25000 }],
}
const saveKey = 'abcdef1234567890abcdef1234567890'
const openShift = { id: 'shift1', dibukaPada: new Date() }

function saveRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/transaksi', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function txWith(overrides: Record<string, unknown>) {
  return {
    kasirShift: { findFirst: vi.fn().mockResolvedValue(openShift) },
    transaksi: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'trx1', nomorMeja: 'Meja 1', status: 'OPEN', total: 25000, items: [] }),
      update: vi.fn(),
    },
    transaksiItem: { createMany: vi.fn() },
    ...overrides,
  }
}

describe('Transaksi held order API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthContext).mockReturnValue(context)
    vi.mocked(requireRole).mockReturnValue(null)
    vi.mocked(requireKasirAccess).mockResolvedValue(null)
    vi.mocked(getKasirWarungId).mockResolvedValue('warung1')
    vi.mocked(apiRateLimiter.check).mockReturnValue({ allowed: true, remaining: 99, resetIn: 60000 })
    vi.mocked(prisma.kasirShift.findFirst).mockResolvedValue(null)
  })

  it('rejects empty table number', async () => {
    const request = saveRequest({ nomorMeja: '', items: [{ menuId: 'menu1', qty: 1 }] })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.message).toContain('Nomor meja')
  })

  it('rejects an invalid idempotency key', async () => {
    const response = await POST(saveRequest({ nomorMeja: 'Meja 1', items: [{ menuId: 'menu1', qty: 1 }], idempotencyKey: 'short' }))
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.message).toContain('Kunci penyimpanan')
  })

  it('creates an open order when table has no active order', async () => {
    vi.mocked(prisma.menu.findMany).mockResolvedValue([menu])
    const create = vi.fn().mockResolvedValue({ id: 'trx1', nomorMeja: 'Meja 1', status: 'OPEN', total: 25000, items: [] })
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(txWith({
      transaksi: { findFirst: vi.fn().mockResolvedValue(null), create, update: vi.fn() },
    }) as never))

    const response = await POST(saveRequest({ nomorMeja: 'Meja 1', items: [{ menuId: 'menu1', qty: 1 }] }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.status).toBe('OPEN')
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ kasirId: 'kasir1' }) }))
  })

  it('stores the idempotency key on a newly saved order', async () => {
    vi.mocked(prisma.menu.findMany).mockResolvedValue([menu])
    const create = vi.fn().mockResolvedValue({ id: 'trx1', nomorMeja: 'Meja 1', status: 'OPEN', total: 25000, items: [] })
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(txWith({
      transaksi: { findFirst: vi.fn().mockResolvedValue(null), create, update: vi.fn() },
    }) as never))

    const response = await POST(saveRequest({ nomorMeja: 'Meja 1', items: [{ menuId: 'menu1', qty: 1 }], idempotencyKey: saveKey }))

    expect(response.status).toBe(201)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ idempotencyKey: saveKey }),
    }))
  })

  it('returns the same order when a save request is retried with the same key', async () => {
    vi.mocked(prisma.menu.findMany).mockResolvedValue([menu])
    const existing = { id: 'trx1', nomorMeja: 'Meja 1', status: 'OPEN', total: 25000, items: [] }
    const create = vi.fn()
    const createMany = vi.fn()
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(txWith({
      transaksi: { findFirst: vi.fn().mockResolvedValue(existing), create, update: vi.fn() },
      transaksiItem: { createMany },
    }) as never))

    const response = await POST(saveRequest({ nomorMeja: 'Meja 1', items: [{ menuId: 'menu1', qty: 1 }], idempotencyKey: saveKey }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.meta.idempotent).toBe(true)
    expect(data.data.id).toBe('trx1')
    expect(create).not.toHaveBeenCalled()
    expect(createMany).not.toHaveBeenCalled()
  })

  it('appends items to an existing table order and remembers the save key', async () => {
    vi.mocked(prisma.menu.findMany).mockResolvedValue([menu])
    const createMany = vi.fn().mockResolvedValue({ count: 1 })
    const update = vi.fn().mockResolvedValue({ id: 'trx1', nomorMeja: 'Meja 1', status: 'OPEN', total: 50000, items: [] })
    const findFirst = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'trx1', total: 25000 })
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(txWith({
      transaksi: { findFirst, create: vi.fn(), update },
      transaksiItem: { createMany },
    }) as never))

    const response = await POST(saveRequest({ nomorMeja: 'Meja 1', items: [{ menuId: 'menu1', qty: 1 }], idempotencyKey: saveKey }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.total).toBe(50000)
    expect(createMany).toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ idempotencyKey: saveKey }),
    }))
  })

  it('rejects reusing a save key on a different table', async () => {
    vi.mocked(prisma.menu.findMany).mockResolvedValue([menu])
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(txWith({
      transaksi: {
        findFirst: vi.fn().mockResolvedValue({ id: 'trx2', nomorMeja: 'Meja 2', status: 'OPEN', total: 25000, items: [] }),
        create: vi.fn(),
        update: vi.fn(),
      },
    }) as never))

    const response = await POST(saveRequest({ nomorMeja: 'Meja 1', items: [{ menuId: 'menu1', qty: 1 }], idempotencyKey: saveKey }))
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.message).toContain('transaksi lain')
  })

  it('retries once when the transaction hits a serialization conflict', async () => {
    vi.mocked(prisma.menu.findMany).mockResolvedValue([menu])
    const create = vi.fn().mockResolvedValue({ id: 'trx1', nomorMeja: 'Meja 1', status: 'OPEN', total: 25000, items: [] })
    let attempts = 0
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      attempts++
      if (attempts === 1) {
        throw new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 'test' })
      }
      return callback(txWith({
        transaksi: { findFirst: vi.fn().mockResolvedValue(null), create, update: vi.fn() },
      }) as never)
    })

    const response = await POST(saveRequest({ nomorMeja: 'Meja 1', items: [{ menuId: 'menu1', qty: 1 }] }))

    expect(response.status).toBe(201)
    expect(attempts).toBe(2)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('reports a conflict when two serialization retries both fail', async () => {
    vi.mocked(prisma.menu.findMany).mockResolvedValue([menu])
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 'test' }),
    )

    const response = await POST(saveRequest({ nomorMeja: 'Meja 1', items: [{ menuId: 'menu1', qty: 1 }] }))
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.message).toContain('kasir lain')
  })

  it('returns a retried order when the save key already exists after a unique conflict', async () => {
    vi.mocked(prisma.menu.findMany).mockResolvedValue([menu])
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' }),
    )
    vi.mocked(prisma.transaksi.findFirst).mockResolvedValue({ id: 'trx1', nomorMeja: 'Meja 1', status: 'OPEN', total: 25000, items: [] } as never)

    const response = await POST(saveRequest({ nomorMeja: 'Meja 1', items: [{ menuId: 'menu1', qty: 1 }], idempotencyKey: saveKey }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.meta.idempotent).toBe(true)
  })

  it('rate limits repeated saves', async () => {
    vi.mocked(apiRateLimiter.check).mockReturnValue({ allowed: false, remaining: 0, resetIn: 1000 })

    const response = await POST(saveRequest({ nomorMeja: 'Meja 1', items: [{ menuId: 'menu1', qty: 1 }] }))
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.message).toContain('Terlalu banyak')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('lists completed transactions for the current open shift', async () => {
    vi.mocked(prisma.kasirShift.findFirst).mockResolvedValue({
      id: 'shift1',
      warungId: 'warung1',
      nomor: 1,
      status: 'TERBUKA',
      dibukaPada: new Date('2026-09-14T05:00:00.000Z'),
      ditutupPada: null,
      dibukaOleh: 'kasir1',
      ditutupOleh: null,
      catatanBuka: null,
      catatanTutup: null,
      createdAt: new Date('2026-09-14T05:00:00.000Z'),
      updatedAt: new Date('2026-09-14T05:00:00.000Z'),
    })
    vi.mocked(prisma.transaksi.findMany).mockResolvedValue([])

    const response = await GET(new NextRequest('http://localhost/api/transaksi'))

    expect(response.status).toBe(200)
    expect(prisma.transaksi.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ warungId: 'warung1', shiftId: 'shift1', status: 'SELESAI' }),
    }))
  })

  it('returns no transactions while cashier is closed', async () => {
    vi.mocked(prisma.kasirShift.findFirst).mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/transaksi'))
    const data = await response.json()

    expect(data.data).toEqual([])
    expect(prisma.transaksi.findMany).not.toHaveBeenCalled()
  })
})
