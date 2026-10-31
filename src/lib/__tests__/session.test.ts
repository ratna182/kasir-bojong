import { describe, it, expect } from 'vitest'
import { encodeSessionToken, getSessionCookieName } from '../session'

describe('Session', () => {
  const mockUser = {
    id: 'test-id',
    username: 'testuser',
    namaLengkap: 'Test User',
    role: 'KASIR' as const,
    warungId: 'warung-1',
    warungNama: 'Warung Test',
    warungKode: 'WT-1',
  }

  it('should return correct cookie name', () => {
    const cookieName = getSessionCookieName()
    expect(cookieName).toBe('kasir_session_owner')
  })

  it('should encode session token', () => {
    const token = encodeSessionToken(mockUser)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('should produce consistent tokens for same input', () => {
    const token1 = encodeSessionToken(mockUser)
    const token2 = encodeSessionToken(mockUser)
    expect(token1).toBe(token2)
  })

  it('should produce different tokens for different users', () => {
    const user1 = { ...mockUser, id: 'user-1' }
    const user2 = { ...mockUser, id: 'user-2' }
    
    const token1 = encodeSessionToken(user1)
    const token2 = encodeSessionToken(user2)
    
    expect(token1).not.toBe(token2)
  })

  it('should handle user with null warung', () => {
    const ownerUser = {
      ...mockUser,
      role: 'OWNER' as const,
      warungId: null,
      warungNama: null,
      warungKode: null,
    }

    const token = encodeSessionToken(ownerUser)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })
})
