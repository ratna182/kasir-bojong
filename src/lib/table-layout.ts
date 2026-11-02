// Tombol cepat cabang Kranggan - biarkan sesuai aslinya.
export const QUICK_TABLES = [
  ...Array.from({ length: 15 }, (_, index) => `Meja ${index + 1}`),
  ...Array.from({ length: 5 }, (_, index) => `Meja ${String.fromCharCode(65 + index)}`),
  'Bungkus',
] as const

export const LESEHAN = Array.from({ length: 11 }, (_, index) => `Lesehan ${index + 1}`) as readonly string[]

export type TableKind = 'Meja' | 'Lesehan'

export const TABLE_LIMITS: Record<TableKind, number> = { Meja: 50, Lesehan: 50 }

export const TABLE_ROWS = ['A', 'B', 'C', 'D', 'E'] as const
export type TableRow = (typeof TABLE_ROWS)[number]

// Server menerima format baru (Meja A 1) plus format lama cabang Kranggan.
export const VALID_TABLE_NAMES = new Set<string>([
  'Bungkus',
  ...(Object.keys(TABLE_LIMITS) as TableKind[]).flatMap((kind) =>
    TABLE_ROWS.flatMap((row) =>
      Array.from({ length: TABLE_LIMITS[kind] }, (_, index) => `${kind} ${row} ${index + 1}`)
    )
  ),
  ...Array.from({ length: TABLE_LIMITS.Meja }, (_, index) => `Meja ${index + 1}`),
  ...Array.from({ length: 5 }, (_, index) => `Meja ${String.fromCharCode(65 + index)}`),
  ...Array.from({ length: TABLE_LIMITS.Lesehan }, (_, index) => `Lesehan ${index + 1}`),
])

/** Builds "Meja A 7" / "Lesehan B 3" from a row and manual number, or null when out of range. */
export function buildTableName(kind: TableKind, row: string, nomor: number | string): string | null {
  const value = typeof nomor === 'number' ? nomor : Number(String(nomor).trim())
  const normalizedRow = String(row).trim().toUpperCase()
  if (!TABLE_ROWS.includes(normalizedRow as TableRow)) return null
  if (!Number.isInteger(value) || value < 1 || value > TABLE_LIMITS[kind]) return null
  return `${kind} ${normalizedRow} ${value}`
}
