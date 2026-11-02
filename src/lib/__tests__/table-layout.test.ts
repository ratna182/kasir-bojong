import { describe, expect, it } from 'vitest'
import { LESEHAN, QUICK_TABLES, TABLE_LIMITS, TABLE_ROWS, VALID_TABLE_NAMES, buildTableName } from '../table-layout'

describe('quick tables untuk Kranggan', () => {
  it('tetap Meja 1-15, Lesehan 1-11, dan Bungkus', () => {
    expect(QUICK_TABLES).toHaveLength(21)
    expect(QUICK_TABLES[0]).toBe('Meja 1')
    expect(QUICK_TABLES[14]).toBe('Meja 15')
    expect(QUICK_TABLES[15]).toBe('Meja A')
    expect(QUICK_TABLES[16]).toBe('Meja B')
    expect(QUICK_TABLES[17]).toBe('Meja C')
    expect(QUICK_TABLES[18]).toBe('Meja D')
    expect(QUICK_TABLES[19]).toBe('Meja E')
    expect(QUICK_TABLES[20]).toBe('Bungkus')
    expect(LESEHAN).toHaveLength(11)
    expect(LESEHAN[10]).toBe('Lesehan 11')
  })
})

describe('buildTableName', () => {
  it('uses five rows A-E', () => {
    expect(TABLE_ROWS).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('builds a name from row and number', () => {
    expect(buildTableName('Meja', 'A', 1)).toBe('Meja A 1')
    expect(buildTableName('Lesehan', 'E', 50)).toBe('Lesehan E 50')
    expect(buildTableName('Meja', 'b', '7')).toBe('Meja B 7')
  })

  it('allows up to 50 meja and 50 lesehan per row', () => {
    expect(TABLE_LIMITS.Meja).toBe(50)
    expect(TABLE_LIMITS.Lesehan).toBe(50)
    expect(buildTableName('Meja', 'C', 50)).toBe('Meja C 50')
    expect(buildTableName('Lesehan', 'C', 50)).toBe('Lesehan C 50')
    expect(buildTableName('Meja', 'C', 51)).toBeNull()
    expect(buildTableName('Lesehan', 'C', 51)).toBeNull()
  })

  it('trims the input before parsing', () => {
    expect(buildTableName('Meja', ' a ', '  12 ')).toBe('Meja A 12')
  })

  it('accepts the highest allowed number for each kind', () => {
    expect(buildTableName('Meja', 'E', TABLE_LIMITS.Meja)).toBe(`Meja E ${TABLE_LIMITS.Meja}`)
    expect(buildTableName('Lesehan', 'E', TABLE_LIMITS.Lesehan)).toBe(`Lesehan E ${TABLE_LIMITS.Lesehan}`)
  })

  it('rejects unknown rows', () => {
    expect(buildTableName('Meja', 'F', 1)).toBeNull()
    expect(buildTableName('Meja', '', 1)).toBeNull()
  })

  it('rejects empty, zero, negative and out-of-range numbers', () => {
    expect(buildTableName('Meja', 'A', '')).toBeNull()
    expect(buildTableName('Meja', 'A', 0)).toBeNull()
    expect(buildTableName('Meja', 'A', -1)).toBeNull()
    expect(buildTableName('Meja', 'A', TABLE_LIMITS.Meja + 1)).toBeNull()
    expect(buildTableName('Lesehan', 'A', TABLE_LIMITS.Lesehan + 1)).toBeNull()
  })

  it('rejects fractions and non-numeric text', () => {
    expect(buildTableName('Meja', 'A', '2.5')).toBeNull()
    expect(buildTableName('Meja', 'A', 'abc')).toBeNull()
  })
})

describe('VALID_TABLE_NAMES', () => {
  it('accepts the new row format for every kind and row', () => {
    expect(VALID_TABLE_NAMES.has('Meja A 1')).toBe(true)
    expect(VALID_TABLE_NAMES.has('Meja E 50')).toBe(true)
    expect(VALID_TABLE_NAMES.has('Lesehan A 1')).toBe(true)
    expect(VALID_TABLE_NAMES.has('Lesehan E 50')).toBe(true)
    expect(VALID_TABLE_NAMES.has('Bungkus')).toBe(true)
  })

  it('keeps legacy names so existing orders still work', () => {
    expect(VALID_TABLE_NAMES.has('Meja 7')).toBe(true)
    expect(VALID_TABLE_NAMES.has('Meja A')).toBe(true)
    expect(VALID_TABLE_NAMES.has('Lesehan 11')).toBe(true)
  })
})
