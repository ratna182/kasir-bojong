// Tombol cepat cabang Kranggan — biarkan sesuai aslinya.
export const QUICK_TABLES = [
  ...Array.from({ length: 15 }, (_, index) => `Meja ${index + 1}`),
  ...Array.from({ length: 5 }, (_, index) => `Meja ${String.fromCharCode(65 + index)}`),
  'Bungkus',
] as const

export const LESEHAN = Array.from({ length: 11 }, (_, index) => `Lesehan ${index + 1}`) as readonly string[]

export type TableKind = 'Meja' | 'Lesehan'

export const TABLE_LIMITS: Record<TableKind, number> = { Meja: 50, Lesehan: 50 }

// Server menerima nomor manual cabang Bojong Kulur sampai 50, termasuk nilai tombol cepat Kranggan.
export const VALID_TABLE_NAMES = new Set<string>([
  'Bungkus',
  ...Array.from({ length: TABLE_LIMITS.Meja }, (_, index) => `Meja ${index + 1}`),
  ...Array.from({ length: 5 }, (_, index) => `Meja ${String.fromCharCode(65 + index)}`),
  ...Array.from({ length: TABLE_LIMITS.Lesehan }, (_, index) => `Lesehan ${index + 1}`),
])

/** Builds "Meja 7" / "Lesehan 3" from a manual number entry, or null when out of range. */
export function buildTableName(kind: TableKind, nomor: number | string): string | null {
  const value = typeof nomor === 'number' ? nomor : Number(String(nomor).trim())
  if (!Number.isInteger(value) || value < 1 || value > TABLE_LIMITS[kind]) return null
  return `${kind} ${value}`
}
