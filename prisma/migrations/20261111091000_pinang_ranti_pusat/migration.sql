-- Konsolidasikan seluruh outlet Bojong Kulur menjadi satu outlet Pinang Ranti (Pusat).

UPDATE "warungs"
SET "nama" = 'Seafood Vian Jaya 08 Pinang Ranti (Pusat)',
    "alamat" = 'Jalan Raya Pondok Gede No. 11'
WHERE "kode" = 'BJK-1';

-- Pindahkan akun kasir dari outlet lama yang tidak terpakai ke outlet pusat.
UPDATE "users"
SET "warung_id" = (SELECT "id" FROM "warungs" WHERE "kode" = 'BJK-1')
WHERE "role" = 'KASIR'::"RoleUser"
  AND "warung_id" IN (SELECT "id" FROM "warungs" WHERE "kode" IN ('BJK-2', 'BJK-3'));

UPDATE "users" SET "nama_lengkap" = 'Kasir 1' WHERE "username" = 'kasir1';
UPDATE "users" SET "nama_lengkap" = 'Kasir 2' WHERE "username" = 'kasir2';
UPDATE "users"
SET "nama_lengkap" = 'Owner Pinang Ranti'
WHERE "role" = 'OWNER'::"RoleUser";

-- Pastikan selalu tersedia tiga akun kasir di outlet pusat.
INSERT INTO "users" ("id", "warung_id", "username", "password_hash", "nama_lengkap", "role", "is_active")
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid::text,
  w."id",
  'kasir3',
  COALESCE(u."password_hash", '$2b$08$HDmhD4qhOrbIAEfFj/cUm.6lwhnxeRa5PnD7YPehcJ0.4vAtq1AZC'),
  'Kasir 3',
  'KASIR'::"RoleUser",
  true
FROM "warungs" w
LEFT JOIN "users" u ON u."username" = 'kasir1'
WHERE w."kode" = 'BJK-1'
ON CONFLICT ("username") DO UPDATE
SET "warung_id" = EXCLUDED."warung_id",
    "nama_lengkap" = 'Kasir 3',
    "is_active" = true;

-- Hapus data turunan outlet lama sebelum menghapus warung.
DELETE FROM "warung_menus"
WHERE "warung_id" IN (SELECT "id" FROM "warungs" WHERE "kode" IN ('BJK-2', 'BJK-3'));

DELETE FROM "transaksis"
WHERE "warung_id" IN (SELECT "id" FROM "warungs" WHERE "kode" IN ('BJK-2', 'BJK-3'));

DELETE FROM "kasir_sesis"
WHERE "warung_id" IN (SELECT "id" FROM "warungs" WHERE "kode" IN ('BJK-2', 'BJK-3'));

DELETE FROM "kasir_shift_events"
WHERE "warung_id" IN (SELECT "id" FROM "warungs" WHERE "kode" IN ('BJK-2', 'BJK-3'));

DELETE FROM "kasir_shifts"
WHERE "warung_id" IN (SELECT "id" FROM "warungs" WHERE "kode" IN ('BJK-2', 'BJK-3'));

DELETE FROM "activity_logs"
WHERE "warung_id" IN (SELECT "id" FROM "warungs" WHERE "kode" IN ('BJK-2', 'BJK-3'));

DELETE FROM "menus"
WHERE "warung_id" IN (SELECT "id" FROM "warungs" WHERE "kode" IN ('BJK-2', 'BJK-3'));

DELETE FROM "menu_categories"
WHERE "warung_id" IN (SELECT "id" FROM "warungs" WHERE "kode" IN ('BJK-2', 'BJK-3'));

DELETE FROM "warungs"
WHERE "kode" IN ('BJK-2', 'BJK-3');
