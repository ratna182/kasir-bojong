import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    menuCategory: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    menu: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  getAuthContext: vi.fn(),
  requireRole: vi.fn(),
}))

vi.mock('@/lib/menu-sync', () => ({
  getMasterWarungId: vi.fn().mockResolvedValue('warung-1'),
}))

import { GET, POST } from '../route'
import { PUT, DELETE } from '../[id]/route'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'

describe('Menu Categories API — Permission Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const kasirContext = {
    user: { id: 'kasir-1', role: 'KASIR', warungId: 'warung-1' },
    warungId: 'warung-1',
  }

  const ownerContext = {
    user: { id: 'owner-1', role: 'OWNER', warungId: null },
    warungId: null,
  }

  describe('GET /api/menu/categories', () => {
    it('should return 403 for kasir', async () => {
      vi.mocked(getAuthContext).mockReturnValue(kasirContext as any)
      vi.mocked(requireRole).mockReturnValue(new NextResponse(JSON.stringify({ success: false, message: 'Forbidden: Role OWNER required' }), { status: 403 }))

      const request = new NextRequest('http://localhost/api/menu/categories')
      const response = await GET(request)

      expect(response.status).toBe(403)
    })

    it('should return 200 for owner', async () => {
      vi.mocked(getAuthContext).mockReturnValue(ownerContext as any)
      vi.mocked(requireRole).mockReturnValue(null)
      vi.mocked(prisma.menuCategory.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/menu/categories')
      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/menu/categories', () => {
    it('should return 403 for kasir', async () => {
      vi.mocked(getAuthContext).mockReturnValue(kasirContext as any)
      vi.mocked(requireRole).mockReturnValue(new NextResponse(JSON.stringify({ success: false, message: 'Forbidden: Role OWNER required' }), { status: 403 }))

      const request = new NextRequest('http://localhost/api/menu/categories', {
        method: 'POST',
        body: JSON.stringify({ nama: 'Udang' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(403)
    })
  })

  describe('PUT /api/menu/categories/:id', () => {
    it('should return 403 for kasir', async () => {
      vi.mocked(getAuthContext).mockReturnValue(kasirContext as any)
      vi.mocked(requireRole).mockReturnValue(new NextResponse(JSON.stringify({ success: false, message: 'Forbidden: Role OWNER required' }), { status: 403 }))

      const request = new NextRequest('http://localhost/api/menu/categories/cat-1', {
        method: 'PUT',
        body: JSON.stringify({ nama: 'Renamed' }),
      })
      const response = await PUT(request, { params: Promise.resolve({ id: 'cat-1' }) })

      expect(response.status).toBe(403)
    })
  })

  describe('DELETE /api/menu/categories/:id', () => {
    it('should return 403 for kasir', async () => {
      vi.mocked(getAuthContext).mockReturnValue(kasirContext as any)
      vi.mocked(requireRole).mockReturnValue(new NextResponse(JSON.stringify({ success: false, message: 'Forbidden: Role OWNER required' }), { status: 403 }))

      const request = new NextRequest('http://localhost/api/menu/categories/cat-1', { method: 'DELETE' })
      const response = await DELETE(request, { params: Promise.resolve({ id: 'cat-1' }) })

      expect(response.status).toBe(403)
    })
  })
})
