export const QUICK_TABLES = [
  ...Array.from({ length: 15 }, (_, index) => `Meja ${index + 1}`),
  'Bungkus',
] as const

export const LESEHAN = Array.from({ length: 11 }, (_, index) => `Lesehan ${index + 1}`) as readonly string[]

export const VALID_TABLE_NAMES = new Set<string>([...QUICK_TABLES, ...LESEHAN])
