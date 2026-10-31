import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'
import { apiRateLimiter } from '@/lib/rate-limiter'

export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const limit = apiRateLimiter.check(`activity-logs:${context!.user.id}`)
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak request. Coba lagi sebentar.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.resetIn / 1000)) } },
      )
    }

    const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || 100)
    const take = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 100
    const logs = await prisma.activityLog.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { username: true, namaLengkap: true, role: true } },
        warung: { select: { nama: true, kode: true } },
      },
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('[GET /api/activity-logs]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil log aktivitas.' }, { status: 500 })
  }
}
