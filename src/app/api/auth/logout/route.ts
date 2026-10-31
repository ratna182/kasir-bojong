import { NextRequest, NextResponse } from 'next/server'
import { decodeSessionToken, COOKIE_OWNER, COOKIE_KASIR } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { recordActivity } from '@/lib/activity-log'

export async function POST(request: NextRequest) {
  const cashierSession = request.cookies.get(COOKIE_KASIR)?.value
    ? decodeSessionToken(request.cookies.get(COOKIE_KASIR)!.value)
    : null
  const userId = cashierSession?.role === 'KASIR'
    ? cashierSession.id
    : request.headers.get('x-session-role') === 'KASIR'
      ? request.headers.get('x-session-user-id')
      : null
  if (userId) {
    await recordActivity(prisma, {
      userId,
      warungId: cashierSession?.warungId ?? request.headers.get('x-session-warung-id'),
      aktivitas: 'LOGOUT',
      detail: 'Kasir logout',
    })
  }
  const response = NextResponse.json({ success: true, message: 'Logout berhasil.' })

  const isProduction = process.env.NODE_ENV === 'production'
  const opts = { httpOnly: true, secure: isProduction, sameSite: 'lax' as const, maxAge: 0, path: '/' }

  response.cookies.set(COOKIE_OWNER, '', opts)
  response.cookies.set(COOKIE_KASIR, '', opts)

  return response
}
