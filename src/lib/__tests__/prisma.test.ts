import { describe, it, expect } from 'vitest'
import { prisma } from '../prisma'

describe('Prisma Client', () => {
  it('should be defined', () => {
    expect(prisma).toBeDefined()
  })

  it('should have expected models', () => {
    expect(prisma.warung).toBeDefined()
    expect(prisma.user).toBeDefined()
    expect(prisma.menu).toBeDefined()
    expect(prisma.transaksi).toBeDefined()
    expect(prisma.transaksiItem).toBeDefined()
    expect(prisma.kasirSesi).toBeDefined()
  })
})
