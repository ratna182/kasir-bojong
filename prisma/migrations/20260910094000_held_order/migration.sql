-- Held order MVP: one active order per table per warung.
ALTER TYPE "StatusTransaksi" ADD VALUE IF NOT EXISTS 'OPEN';

CREATE TYPE "MetodePembayaran" AS ENUM ('CASH', 'QRIS');

ALTER TABLE "transaksis"
  ADD COLUMN "metode_pembayaran" "MetodePembayaran",
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "status" SET DEFAULT 'OPEN',
  ALTER COLUMN "total" SET DEFAULT 0;

ALTER TABLE "transaksi_items"
  ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "transaksis_warung_id_nomor_meja_status_idx"
ON "transaksis" ("warung_id", "nomor_meja", "status");

CREATE UNIQUE INDEX "transaksis_open_meja_unique"
ON "transaksis" ("warung_id", "nomor_meja")
WHERE "status" = 'OPEN';
