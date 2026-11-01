import { describe, expect, it } from 'vitest'
import { LESEHAN, QUICK_TABLES, TABLE_LIMITS, buildTableName } from '../table-layout'

describe('quick tables untuk Kranggan', () => {
  it('tetap Meja 1-15, Lesehan 1-11, dan Bungkus', () => {
    expect(QUICK_TABLES).toHaveLength(16)
    expect(QUICK_TABLES[0]).toBe('Meja 1')
    expect(QUICK_TABLES[14]).toBe('Meja 15')
    expect(QUICK_TABLES[15]).toBe('Bungkus')
    expect(LESEHAN).toHaveLength(11)
    expect(LESEHAN[10]).toBe('Lesehan 11')
  })
})

describe('buildTableName', () => {
  it('allows up to 50 meja and 50 lesehan', () => {
    expect(TABLE_LIMITS.Meja).toBe(50)
    expect(TABLE_LIMITS.Lesehan).toBe(50)
    expect(buildTableName('Meja', 50)).toBe('Meja 50')
    expect(buildTableName('Lesehan', 50)).toBe('Lesehan 50')
    expect(buildTableName('Meja', 51)).toBeNull()
    expect(buildTableName('Lesehan', 51)).toBeNull()
  })
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
