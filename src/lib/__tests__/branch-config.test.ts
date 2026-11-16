import { describe, expect, it } from 'vitest'
import { DEFAULT_BRANCH_NAME, formatBranchLine, stripPusat } from '../branch-config'

describe('stripPusat', () => {
  it('removes the legacy (Pusat) suffix from printed labels', () => {
    expect(stripPusat('Seafood Vian Jaya 08 Pinang Ranti (Pusat)')).toBe('Seafood Vian Jaya 08 Pinang Ranti')
    expect(stripPusat('Pinang Ranti (PUSAT)')).toBe('Pinang Ranti')
    expect(stripPusat('Pinang Ranti - Pusat')).toBe('Pinang Ranti')
  })

  it('keeps names that do not carry the legacy label', () => {
    expect(stripPusat('Seafood Vian Jaya 08 - Cabang 2')).toBe('Seafood Vian Jaya 08 - Cabang 2')
    expect(stripPusat('  Pinang Ranti  ')).toBe('Pinang Ranti')
    expect(stripPusat(null)).toBe('')
    expect(stripPusat(undefined)).toBe('')
  })
})

describe('formatBranchLine', () => {
  it('never prints Pusat on the receipt branch line', () => {
    expect(formatBranchLine('Pinang Ranti (Pusat)')).toBe('Cabang : Pinang Ranti')
    expect(formatBranchLine(null)).toBe(`Cabang : ${DEFAULT_BRANCH_NAME}`)
    expect(DEFAULT_BRANCH_NAME).not.toMatch(/pusat/i)
  })
})
