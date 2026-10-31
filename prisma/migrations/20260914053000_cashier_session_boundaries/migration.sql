ALTER TABLE "kasir_sesis"
ADD COLUMN IF NOT EXISTS "dibuka_kembali_pada" TIMESTAMP(3);

DROP INDEX IF EXISTS "kasir_sesis_warung_id_tanggal_key";

CREATE INDEX IF NOT EXISTS "kasir_sesis_warung_id_tanggal_ditutup_pada_idx"
ON "kasir_sesis" ("warung_id", "tanggal", "ditutup_pada");
