-- Idempotent migration: apply menu category hierarchy
-- Handles both cases: migration partially applied or not applied at all

-- Step 1: Create menu_categories table (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'menu_categories') THEN
    CREATE TABLE "menu_categories" (
      "id" TEXT NOT NULL,
      "warung_id" TEXT NOT NULL,
      "nama" TEXT NOT NULL,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "is_aktif" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX "menu_categories_warung_id_nama_key" ON "menu_categories"("warung_id", "nama");
    ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "warungs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 2: Add category_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'category_id') THEN
    ALTER TABLE "menus" ADD COLUMN "category_id" TEXT;
  END IF;
END $$;

-- Step 3: Add sort_order column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'sort_order') THEN
    ALTER TABLE "menus" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Step 4: Add index if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'menus_warung_id_category_id_sort_order_idx') THEN
    CREATE INDEX "menus_warung_id_category_id_sort_order_idx" ON "menus"("warung_id", "category_id", "sort_order");
  END IF;
END $$;

-- Step 5: Insert default "Lainnya" category for each warung
INSERT INTO "menu_categories" ("id", "warung_id", "nama", "sort_order", "is_aktif", "created_at")
SELECT gen_random_uuid(), "id", 'Lainnya', 0, true, NOW()
FROM "warungs"
ON CONFLICT ("warung_id", "nama") DO NOTHING;

-- Step 6: Assign menus without category to "Lainnya"
UPDATE "menus" SET "category_id" = (
  SELECT "id" FROM "menu_categories"
  WHERE "menu_categories"."warung_id" = "menus"."warung_id"
    AND "menu_categories"."nama" = 'Lainnya'
  LIMIT 1
) WHERE "category_id" IS NULL;

-- Step 7: Make category_id NOT NULL (only if all rows have a value)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'category_id' AND is_nullable = 'YES') THEN
    IF NOT EXISTS (SELECT 1 FROM "menus" WHERE "category_id" IS NULL) THEN
      ALTER TABLE "menus" ALTER COLUMN "category_id" SET NOT NULL;
    END IF;
  END IF;
END $$;

-- Step 8: Drop old kategori column if it still exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'kategori') THEN
    ALTER TABLE "menus" DROP COLUMN "kategori";
  END IF;
END $$;

-- Step 9: Drop old enum if it still exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KategoriMenu') THEN
    DROP TYPE "KategoriMenu";
  END IF;
END $$;
