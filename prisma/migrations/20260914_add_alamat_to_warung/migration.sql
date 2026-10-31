-- Add alamat column if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warungs' AND column_name = 'alamat') THEN
    ALTER TABLE "warungs" ADD COLUMN "alamat" TEXT;
  END IF;
END $$;

-- Update kasir Antarsari
UPDATE "warungs" SET "alamat" = 'Jl. Pangeran Antasari No.20' WHERE "nama" ILIKE '%antarsari%';

-- Update kasir Kranggan
UPDATE "warungs" SET "alamat" = 'Jl. Raya Kranggan No. 18' WHERE "kode" = 'VJ08-1';
