import { cookies, headers } from 'next/headers'

export interface SessionUser {
  id: string
  username: string
  namaLengkap: string | null
  role: 'OWNER' | 'KASIR'
  warungId: string | null
  warungNama: string | null
  warungKode: string | null
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable is required in production')
    }
    console.warn('[SESSION] Using default secret - SET SESSION_SECRET in .env for production!')
    return 'dev-only-default-secret-change-me'
  }
  return secret
}

const SESSION_SECRET = getSessionSecret()

// Cookie names — owner & kasir terpisah supaya bisa buka di tab berbeda
export const COOKIE_OWNER = 'kasir_session_owner'
export const COOKIE_KASIR = 'kasir_session_kasir'

function getCookieNameForRole(role: string): string {
  return role === 'OWNER' ? COOKIE_OWNER : COOKIE_KASIR
}

function encodeSession(data: SessionUser): string {
  const json = JSON.stringify(data)
  const encoded = Buffer.from(json).toString('base64')
  const signature = Buffer.from(`${encoded}.${SESSION_SECRET}`).toString('base64').slice(0, 16)
  return `${encoded}.${signature}`
}

function decodeSession(token: string): SessionUser | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const encoded = parts.slice(0, -1).join('.')
    const signature = parts[parts.length - 1]
    const expectedSig = Buffer.from(`${encoded}.${SESSION_SECRET}`).toString('base64').slice(0, 16)
    if (signature !== expectedSig) return null
    const json = Buffer.from(encoded, 'base64').toString('utf-8')
    return JSON.parse(json) as SessionUser
  } catch {
    return null
  }
}

export function decodeSessionToken(token: string): SessionUser | null {
  return decodeSession(token)
}

// Baca session dari cookie yang sesuai role, atau dari keduanya
export async function getSession(): Promise<SessionUser | null> {
  // Middleware memilih sesi sesuai route dan meneruskannya ke Server Component.
  const requestHeaders = await headers()
  const id = requestHeaders.get('x-session-user-id')
  const role = requestHeaders.get('x-session-role')
  if (id && (role === 'OWNER' || role === 'KASIR')) {
    const decode = (value: string | null) => value ? decodeURIComponent(value) || null : null
    return {
      id,
      role,
      username: decode(requestHeaders.get('x-session-username')) ?? '',
      namaLengkap: decode(requestHeaders.get('x-session-nama-lengkap')),
      warungId: requestHeaders.get('x-session-warung-id'),
      warungNama: decode(requestHeaders.get('x-session-warung-nama')),
      warungKode: decode(requestHeaders.get('x-session-warung-kode')),
    }
  }

  const cookieStore = await cookies()

  // Coba owner dulu, lalu kasir
  const ownerToken = cookieStore.get(COOKIE_OWNER)?.value
  if (ownerToken) {
    const session = decodeSession(ownerToken)
    if (session) return session
  }

  const kasirToken = cookieStore.get(COOKIE_KASIR)?.value
  if (kasirToken) {
    const session = decodeSession(kasirToken)
    if (session) return session
  }

  return null
}

// Baca session dari cookie tertentu berdasarkan role
export async function getSessionByRole(role: 'OWNER' | 'KASIR'): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const cookieName = getCookieNameForRole(role)
  const token = cookieStore.get(cookieName)?.value
  if (!token) return null
  return decodeSession(token)
}

export async function createSession(user: SessionUser): Promise<string> {
  return encodeSession(user)
}

export function getSessionCookieName(role?: string): string {
  if (role) return getCookieNameForRole(role)
  return COOKIE_OWNER
}

export function encodeSessionToken(user: SessionUser): string {
  return encodeSession(user)
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}

export async function verifyTenantAccess(warungId: string): Promise<boolean> {
  const session = await getSession()
  return session?.warungId === warungId
}
