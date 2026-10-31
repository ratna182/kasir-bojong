import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const warungs = await prisma.warung.findMany({
      orderBy: { kode: 'asc' },
      select: { id: true, nama: true, kode: true },
    })

    return NextResponse.json({ success: true, data: warungs })
  } catch (error) {
    console.error('[GET /api/admin/warungs]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil data warung.' }, { status: 500 })
  }
}
