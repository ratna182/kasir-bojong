ALTER TABLE "transaksis"
ADD COLUMN IF NOT EXISTS "kasir_id" TEXT;

CREATE INDEX IF NOT EXISTS "transaksis_kasir_id_created_at_idx"
ON "transaksis" ("kasir_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transaksis_kasir_id_fkey'
  ) THEN
    ALTER TABLE "transaksis"
    ADD CONSTRAINT "transaksis_kasir_id_fkey"
    FOREIGN KEY ("kasir_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
