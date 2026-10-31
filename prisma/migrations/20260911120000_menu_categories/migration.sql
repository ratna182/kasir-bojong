-- CreateTable
CREATE TABLE "menu_categories" (
    "id" TEXT NOT NULL,
    "warung_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menu_categories_warung_id_nama_key" ON "menu_categories"("warung_id", "nama");

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "warungs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddColumn: category_id (nullable first)
ALTER TABLE "menus" ADD COLUMN "category_id" TEXT;

-- AddColumn: sort_order
ALTER TABLE "menus" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex for new sort_order
CREATE INDEX "menus_warung_id_category_id_sort_order_idx" ON "menus"("warung_id", "category_id", "sort_order");

-- Insert default "Lainnya" category for each warung
INSERT INTO "menu_categories" ("id", "warung_id", "nama", "sort_order", "is_aktif", "created_at")
SELECT gen_random_uuid(), "id", 'Lainnya', 0, true, NOW()
FROM "warungs"
ON CONFLICT ("warung_id", "nama") DO NOTHING;

-- Assign all menus without category to "Lainnya"
UPDATE "menus" SET "category_id" = (
  SELECT "id" FROM "menu_categories"
  WHERE "menu_categories"."warung_id" = "menus"."warung_id"
    AND "menu_categories"."nama" = 'Lainnya'
  LIMIT 1
) WHERE "category_id" IS NULL;

-- Make category_id NOT NULL after all data is assigned
ALTER TABLE "menus" ALTER COLUMN "category_id" SET NOT NULL;

-- DropColumn: kategori
ALTER TABLE "menus" DROP COLUMN "kategori";

-- DropEnum
DROP TYPE "KategoriMenu";
