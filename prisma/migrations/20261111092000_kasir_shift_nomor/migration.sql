-- Nomor shift 1..3 yang berputar terus tanpa reset harian.
ALTER TABLE "kasir_shifts" ADD COLUMN "nomor" INTEGER NOT NULL DEFAULT 1;

WITH numbered AS (
  SELECT
    "id",
    ((ROW_NUMBER() OVER (
      PARTITION BY "warung_id"
      ORDER BY COALESCE("dibuka_pada", "created_at"), "created_at"
    ) - 1) % 3) + 1 AS "nomor"
  FROM "kasir_shifts"
)
UPDATE "kasir_shifts" AS s
SET "nomor" = n."nomor"
FROM numbered AS n
WHERE s."id" = n."id";

ALTER TABLE "kasir_shifts"
  ADD CONSTRAINT "kasir_shifts_nomor_check" CHECK ("nomor" BETWEEN 1 AND 3);

CREATE INDEX "kasir_shifts_warung_id_nomor_idx" ON "kasir_shifts"("warung_id", "nomor");
