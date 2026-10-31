import { NextRequest, NextResponse } from 'next/server'
import { decodeSessionToken, SessionUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { DEFAULT_BRANCH_KODE } from '@/lib/branch-config'

export interface AuthContext {
  user: SessionUser
  warungId: string | null
}

export type Role = 'OWNER' | 'KASIR'

/**
 * Extract session dari request headers (set oleh middleware)
 */
export function getAuthContext(request: NextRequest): AuthContext | null {
  const userId = request.headers.get('x-session-user-id')
  const role = request.headers.get('x-session-role') as Role | null
  const warungId = request.headers.get('x-session-warung-id')

  if (!userId || !role) {
    return null
  }

  return {
    user: {
      id: userId,
      username: '', // Tidak perlu di authorization check
      namaLengkap: null,
      role,
      warungId,
      warungNama: null,
      warungKode: null,
    },
    warungId,
  }
}

/**
 * Check apakah user punya role tertentu
 */
export function hasRole(context: AuthContext | null, role: Role): boolean {
  return context?.user.role === role
}

/**
 * Check apakah user adalah owner
 */
export function isOwner(context: AuthContext | null): boolean {
  return hasRole(context, 'OWNER')
}

/**
 * Check apakah user adalah kasir
 */
export function isKasir(context: AuthContext | null): boolean {
  return hasRole(context, 'KASIR')
}

/**
 * Check apakah user punya akses ke warung tertentu
 */
export function hasWarungAccess(context: AuthContext | null, warungId: string): boolean {
  if (!context) return false
  // Owner punya akses ke semua warung
  if (isOwner(context)) return true
  // Kasir hanya punya akses ke warungnya sendiri
  return context.warungId === warungId
}

/**
 * Return unauthorized response
 */
export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json(
    { success: false, message },
    { status: 401 }
  )
}

/**
 * Return forbidden response
 */
export function forbidden(message = 'Forbidden') {
  return NextResponse.json(
    { success: false, message },
    { status: 403 }
  )
}

/**
 * Require specific role, return forbidden jika tidak cocok
 */
export function requireRole(context: AuthContext | null, role: Role): NextResponse | null {
  if (!context) return unauthorized()
  if (!hasRole(context, role)) return forbidden(`Role ${role} required`)
  return null
}

// Owner boleh menjalankan kasir pada cabang default yang dipilih sistem.
export async function requireKasirAccess(context: AuthContext | null): Promise<NextResponse | null> {
  if (!context) return unauthorized()
  if (context.user.role !== 'KASIR' && context.user.role !== 'OWNER') {
    return forbidden('Akses kasir diperlukan')
  }
  if (context.user.role === 'KASIR') {
    const user = await prisma.user.findUnique({ where: { id: context.user.id }, select: { isActive: true } })
    if (!user?.isActive) return forbidden('Akun kasir sedang dinonaktifkan owner')
  }
  return null
}

export async function getKasirWarungId(context: AuthContext | null) {
  if (!context) return null
  if (context.user.role === 'KASIR') return context.warungId
  const warung = await prisma.warung.findUnique({ where: { kode: DEFAULT_BRANCH_KODE }, select: { id: true } })
  return warung?.id ?? null
}

/**
 * Require akses ke warung tertentu
 */
export function requireWarungAccess(context: AuthContext | null, warungId: string): NextResponse | null {
  if (!context) return unauthorized()
  if (!hasWarungAccess(context, warungId)) return forbidden('Tidak punya akses ke warung ini')
  return null
}
