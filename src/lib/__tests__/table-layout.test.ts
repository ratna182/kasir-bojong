import { describe, expect, it } from 'vitest'
import { TABLE_LIMITS, buildTableName } from '../table-layout'

describe('buildTableName', () => {
  it('builds a table name from a typed number', () => {
    expect(buildTableName('Meja', '7')).toBe('Meja 7')
    expect(buildTableName('Lesehan', 3)).toBe('Lesehan 3')
  })

  it('trims the input before parsing', () => {
    expect(buildTableName('Meja', '  12 ')).toBe('Meja 12')
  })

  it('accepts the highest allowed number for each kind', () => {
    expect(buildTableName('Meja', TABLE_LIMITS.Meja)).toBe(`Meja ${TABLE_LIMITS.Meja}`)
    expect(buildTableName('Lesehan', TABLE_LIMITS.Lesehan)).toBe(`Lesehan ${TABLE_LIMITS.Lesehan}`)
  })

  it('rejects empty, zero, negative and out-of-range numbers', () => {
    expect(buildTableName('Meja', '')).toBeNull()
    expect(buildTableName('Meja', 0)).toBeNull()
    expect(buildTableName('Meja', -1)).toBeNull()
    expect(buildTableName('Meja', TABLE_LIMITS.Meja + 1)).toBeNull()
    expect(buildTableName('Lesehan', TABLE_LIMITS.Lesehan + 1)).toBeNull()
  })

  it('rejects fractions and non-numeric text', () => {
    expect(buildTableName('Meja', '2.5')).toBeNull()
    expect(buildTableName('Meja', 'abc')).toBeNull()
  })
})
