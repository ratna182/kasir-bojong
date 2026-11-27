/**
 * Reset semua data public schema di Supabase, lalu import dari Neon.
 * Urutan truncate/insert mengikuti dependency foreign key.
 *
 * Jalankan: node scripts/migrate-neon-to-supabase.mjs
 */

import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = resolve(__dir, '..', '.env')
  const env = {}
  readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/^([A-Z_]+)="?([^"]*)"?$/)
    if (m) env[m[1]] = m[2]
  })
  return env
}

const env = loadEnv()
if (!env.NEON_URL)    { console.error('❌  NEON_URL tidak ada di .env'); process.exit(1) }
if (!env.DIRECT_URL)  { console.error('❌  DIRECT_URL tidak ada di .env'); process.exit(1) }

// Urutan insert mengikuti FK dependency (parent dulu)
const TABLES_INSERT = [
  ['warungs',            'created_at'],
  ['menu_categories',    'created_at'],
  ['users',              'created_at'],
  ['menus',              'created_at'],
  ['warung_menus',       'created_at'],
  ['kasir_shifts',       'created_at'],
  ['transaksis',         'created_at'],
  ['transaksi_items',    'created_at'],
  ['kasir_sesis',        'ditutup_pada'],
  ['kasir_shift_events', 'created_at'],
  ['activity_logs',      'created_at'],
]

// Urutan truncate kebalikan FK (child dulu)
const TABLES_TRUNCATE = [...TABLES_INSERT].reverse().map(t => t[0])

async function main() {
  console.log('\n🔌 Menghubungkan ke Neon…')
  const neon = new pg.Client({ connectionString: env.NEON_URL, ssl: { rejectUnauthorized: false } })
  await neon.connect()
  console.log('✅ Neon terhubung')

  console.log('🔌 Menghubungkan ke Supabase…')
  const supa = new pg.Client({ connectionString: env.DIRECT_URL, ssl: { rejectUnauthorized: false } })
  await supa.connect()
  console.log('✅ Supabase terhubung\n')

  // ── 1. Ambil semua data dari Neon ────────────────────────────────────────
  console.log('📦 Mengambil data dari Neon…')
  const data = {}
  for (const [tbl, order] of TABLES_INSERT) {
    const { rows } = await neon.query(`SELECT * FROM ${tbl} ORDER BY ${order}`)
    data[tbl] = rows
    console.log(`  📋 ${tbl}: ${rows.length} baris`)
  }
  await neon.end()
  console.log()

  // ── 2. Truncate data lama di Supabase (child → parent) ──────────────────
  console.log('🗑  Menghapus data lama di Supabase…')
  await supa.query('BEGIN')
  try {
    for (const tbl of TABLES_TRUNCATE) {
      await supa.query(`TRUNCATE TABLE ${tbl} RESTART IDENTITY CASCADE`)
      console.log(`  🗑  ${tbl} dikosongkan`)
    }
    await supa.query('COMMIT')
  } catch (e) {
    await supa.query('ROLLBACK')
    throw e
  }
  console.log()

  // ── 3. Insert data dari Neon ke Supabase (parent → child) ───────────────
  console.log('📤 Mengimpor ke Supabase…')
  for (const [tbl] of TABLES_INSERT) {
    const rows = data[tbl]
    if (!rows.length) { console.log(`  ⏭  ${tbl}: kosong`); continue }

    const cols   = Object.keys(rows[0])
    const colSql = cols.map(c => `"${c}"`).join(', ')

    await supa.query('BEGIN')
    try {
      for (const row of rows) {
        const vals = cols.map(c => row[c])
        const ph   = vals.map((_, i) => `$${i + 1}`).join(', ')
        await supa.query(`INSERT INTO ${tbl} (${colSql}) VALUES (${ph})`, vals)
      }
      await supa.query('COMMIT')
      console.log(`  ✅  ${tbl}: ${rows.length} baris`)
    } catch (e) {
      await supa.query('ROLLBACK')
      console.error(`  ❌  ${tbl}: ${e.message}`)
      await supa.end()
      process.exit(1)
    }
  }

  await supa.end()
  console.log('\n🎉 Migrasi data selesai! Semua data Neon sudah ada di Supabase.')
}

main().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
