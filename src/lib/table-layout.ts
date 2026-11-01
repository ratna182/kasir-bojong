export const QUICK_TABLES = [
  ...Array.from({ length: 50 }, (_, index) => `Meja ${index + 1}`),
  'Bungkus',
] as const

export const LESEHAN = Array.from({ length: 50 }, (_, index) => `Lesehan ${index + 1}`) as readonly string[]

export const VALID_TABLE_NAMES = new Set<string>([...QUICK_TABLES, ...LESEHAN])

export type TableKind = 'Meja' | 'Lesehan'

export const TABLE_LIMITS: Record<TableKind, number> = { Meja: 50, Lesehan: 50 }

/** Builds "Meja 7" / "Lesehan 3" from a manual number entry, or null when out of range. */
export function buildTableName(kind: TableKind, nomor: number | string): string | null {
  const value = typeof nomor === 'number' ? nomor : Number(String(nomor).trim())
  if (!Number.isInteger(value) || value < 1 || value > TABLE_LIMITS[kind]) return null
  return `${kind} ${value}`
}
