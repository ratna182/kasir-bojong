import { describe, it, expect } from 'vitest'
import {
  hasRole,
  isOwner,
  isKasir,
  hasWarungAccess,
  requireRole,
  requireWarungAccess,
  AuthContext,
} from '../auth'

describe('Auth Helper', () => {
  const ownerContext: AuthContext = {
    user: {
      id: 'owner-1',
      username: 'owner',
      namaLengkap: 'Owner',
      role: 'OWNER',
      warungId: null,
      warungNama: null,
      warungKode: null,
    },
    warungId: null,
  }

  const kasirContext: AuthContext = {
    user: {
      id: 'kasir-1',
      username: 'kasir1',
      namaLengkap: 'Kasir 1',
      role: 'KASIR',
      warungId: 'warung-1',
      warungNama: 'Warung 1',
      warungKode: 'W1',
    },
    warungId: 'warung-1',
  }

  describe('hasRole', () => {
    it('should return true for matching role', () => {
      expect(hasRole(ownerContext, 'OWNER')).toBe(true)
      expect(hasRole(kasirContext, 'KASIR')).toBe(true)
    })

    it('should return false for non-matching role', () => {
      expect(hasRole(ownerContext, 'KASIR')).toBe(false)
      expect(hasRole(kasirContext, 'OWNER')).toBe(false)
    })

    it('should return false for null context', () => {
      expect(hasRole(null, 'OWNER')).toBe(false)
    })
  })

  describe('isOwner', () => {
    it('should return true for owner', () => {
      expect(isOwner(ownerContext)).toBe(true)
    })

    it('should return false for kasir', () => {
      expect(isOwner(kasirContext)).toBe(false)
    })

    it('should return false for null context', () => {
      expect(isOwner(null)).toBe(false)
    })
  })

  describe('isKasir', () => {
    it('should return true for kasir', () => {
      expect(isKasir(kasirContext)).toBe(true)
    })

    it('should return false for owner', () => {
      expect(isKasir(ownerContext)).toBe(false)
    })

    it('should return false for null context', () => {
      expect(isKasir(null)).toBe(false)
    })
  })

  describe('hasWarungAccess', () => {
    it('should return true for owner accessing any warung', () => {
      expect(hasWarungAccess(ownerContext, 'warung-1')).toBe(true)
      expect(hasWarungAccess(ownerContext, 'warung-2')).toBe(true)
    })

    it('should return true for kasir accessing own warung', () => {
      expect(hasWarungAccess(kasirContext, 'warung-1')).toBe(true)
    })

    it('should return false for kasir accessing other warung', () => {
      expect(hasWarungAccess(kasirContext, 'warung-2')).toBe(false)
    })

    it('should return false for null context', () => {
      expect(hasWarungAccess(null, 'warung-1')).toBe(false)
    })
  })

  describe('requireRole', () => {
    it('should return null if role matches', () => {
      expect(requireRole(ownerContext, 'OWNER')).toBeNull()
      expect(requireRole(kasirContext, 'KASIR')).toBeNull()
    })

    it('should return 403 response if role does not match', () => {
      const response = requireRole(ownerContext, 'KASIR')
      expect(response).not.toBeNull()
      expect(response?.status).toBe(403)
    })

    it('should return 401 response if context is null', () => {
      const response = requireRole(null, 'OWNER')
      expect(response).not.toBeNull()
      expect(response?.status).toBe(401)
    })
  })

  describe('requireWarungAccess', () => {
    it('should return null if has access', () => {
      expect(requireWarungAccess(ownerContext, 'warung-1')).toBeNull()
      expect(requireWarungAccess(kasirContext, 'warung-1')).toBeNull()
    })

    it('should return 403 response if no access', () => {
      const response = requireWarungAccess(kasirContext, 'warung-2')
      expect(response).not.toBeNull()
      expect(response?.status).toBe(403)
    })

    it('should return 401 response if context is null', () => {
      const response = requireWarungAccess(null, 'warung-1')
      expect(response).not.toBeNull()
      expect(response?.status).toBe(401)
    })
  })
})
