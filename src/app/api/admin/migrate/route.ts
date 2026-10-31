import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'

interface ColumnExistsResult {
  exists: boolean
}

interface MenuItem {
  id: string
  nama: string
  warung_id: string
  isAktif: boolean
  category_id: string | null
}

interface CategoryItem {
  id: string
  nama: string
  warung_id: string
  sort_order: number
}

export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const hasKategoriCol = await prisma.$queryRaw`
      SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'kategori') as exists
    ` as ColumnExistsResult[]
    const hasCategoryCol = await prisma.$queryRaw`
      SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'category_id') as exists
    ` as ColumnExistsResult[]
    const hasMenuCategoriesTable = await prisma.$queryRaw`
      SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_categories') as exists
    ` as ColumnExistsResult[]

    const allMenus = await prisma.$queryRaw`
      SELECT m.id, m.nama, m.warung_id, m.isAktif, m.category_id
      FROM menus m
      ORDER BY m.warung_id, m.nama
    ` as MenuItem[]

    const ayamMenus = allMenus.filter((m) => m.nama?.toLowerCase().includes('ayam'))

    let categories: CategoryItem[] = []
    if (hasMenuCategoriesTable[0].exists) {
      categories = await prisma.$queryRaw`SELECT * FROM menu_categories ORDER BY sort_order` as CategoryItem[]
    }

    return NextResponse.json({
      success: true,
      schema: {
        hasKategoriColumn: hasKategoriCol[0].exists,
        hasCategoryColumn: hasCategoryCol[0].exists,
        hasMenuCategoriesTable: hasMenuCategoriesTable[0].exists,
      },
      totalMenus: allMenus.length,
      ayamMenus,
      categories: categories.map((c) => ({ id: c.id, nama: c.nama, warung_id: c.warung_id, sortOrder: c.sort_order })),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[GET /api/admin/migrate]', error)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const results: string[] = []

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "menu_categories" (
          "id" TEXT NOT NULL,
          "warung_id" TEXT NOT NULL,
          "nama" TEXT NOT NULL,
          "sort_order" INTEGER NOT NULL DEFAULT 0,
          "is_aktif" BOOLEAN NOT NULL DEFAULT true,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
        )
      `)
      results.push('menu_categories table: OK')
    } catch (e: any) { results.push(`menu_categories table: ${e.message}`) }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "menu_categories_warung_id_nama_key" ON "menu_categories"("warung_id", "nama")
      `)
      results.push('unique index: OK')
    } catch (e: any) { results.push(`unique index: ${e.message}`) }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_warung_id_fkey"
          FOREIGN KEY ("warung_id") REFERENCES "warungs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN null;
        END $$
      `)
      results.push('foreign key: OK')
    } catch (e: unknown) { results.push(`foreign key: ${e instanceof Error ? e.message : 'Unknown error'}`) }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "menus" ADD COLUMN "category_id" TEXT;
        EXCEPTION WHEN duplicate_column THEN null;
        END $$
      `)
      results.push('category_id column: OK')
    } catch (e: unknown) { results.push(`category_id column: ${e instanceof Error ? e.message : 'Unknown error'}`) }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "menus" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
        EXCEPTION WHEN duplicate_column THEN null;
        END $$
      `)
      results.push('sort_order column: OK')
    } catch (e: unknown) { results.push(`sort_order column: ${e instanceof Error ? e.message : 'Unknown error'}`) }

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "menu_categories" ("id", "warung_id", "nama", "sort_order", "is_aktif", "created_at")
        SELECT gen_random_uuid(), "id", 'Lainnya', 0, true, NOW()
        FROM "warungs"
        ON CONFLICT ("warung_id", "nama") DO NOTHING
      `)
      results.push('default categories: OK')
    } catch (e: unknown) { results.push(`default categories: ${e instanceof Error ? e.message : 'Unknown error'}`) }

    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "menus" SET "category_id" = (
          SELECT "id" FROM "menu_categories"
          WHERE "menu_categories"."warung_id" = "menus"."warung_id"
            AND "menu_categories"."nama" = 'Lainnya'
          LIMIT 1
        ) WHERE "category_id" IS NULL
      `)
      results.push('assign menus to Lainnya: OK')
    } catch (e: unknown) { results.push(`assign menus: ${e instanceof Error ? e.message : 'Unknown error'}`) }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "menus" ALTER COLUMN "category_id" SET NOT NULL;
        EXCEPTION WHEN others THEN null;
        END $$
      `)
      results.push('category_id NOT NULL: OK')
    } catch (e: unknown) { results.push(`category_id NOT NULL: ${e instanceof Error ? e.message : 'Unknown error'}`) }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "menus" DROP COLUMN "kategori";
        EXCEPTION WHEN undefined_column THEN null;
        END $$
      `)
      results.push('drop kategori: OK')
    } catch (e: unknown) { results.push(`drop kategori: ${e instanceof Error ? e.message : 'Unknown error'}`) }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          DROP TYPE "KategoriMenu";
        EXCEPTION WHEN undefined_object THEN null;
        END $$
      `)
      results.push('drop KategoriMenu enum: OK')
    } catch (e: unknown) { results.push(`drop enum: ${e instanceof Error ? e.message : 'Unknown error'}`) }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "menus_warung_id_category_id_sort_order_idx" ON "menus"("warung_id", "category_id", "sort_order")
      `)
      results.push('sort index: OK')
    } catch (e: unknown) { results.push(`sort index: ${e instanceof Error ? e.message : 'Unknown error'}`) }

    // Step 12: Cleanup old soft-deleted menus with "(nonaktif" suffix
    // First delete transaksi_items that reference these menus, then delete menus
    try {
      await prisma.$executeRawUnsafe(`
        DELETE FROM "transaksi_items"
        WHERE "menu_id" IN (
          SELECT "id" FROM "menus" WHERE "nama" LIKE '%(nonaktif%'
        )
      `)
      await prisma.$executeRawUnsafe(`DELETE FROM "menus" WHERE "nama" LIKE '%(nonaktif%'`)
      results.push('cleanup nonaktif menus: OK')
    } catch (e: unknown) { results.push(`cleanup nonaktif menus: ${e instanceof Error ? e.message : 'Unknown error'}`) }

    // Step 13: Create warung_menus table for price overrides per cabang
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "warung_menus" (
          "id" TEXT NOT NULL,
          "warung_id" TEXT NOT NULL,
          "menu_id" TEXT NOT NULL,
          "harga" INTEGER NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "warung_menus_pkey" PRIMARY KEY ("id")
        )
      `)
      results.push('warung_menus table: OK')
    } catch (e: unknown) { results.push(`warung_menus table: ${e instanceof Error ? e.message : 'Unknown error'}`) }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "warung_menus_warung_id_menu_id_key" ON "warung_menus"("warung_id", "menu_id")
      `)
      results.push('warung_menus unique index: OK')
    } catch (e: unknown) { results.push(`warung_menus unique index: ${e instanceof Error ? e.message : 'Unknown error'}`) }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "warung_menus" ADD CONSTRAINT "warung_menus_warung_id_fkey"
          FOREIGN KEY ("warung_id") REFERENCES "warungs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN null;
        END $$
      `)
      results.push('warung_menus FK warung: OK')
    } catch (e: unknown) { results.push(`warung_menus FK warung: ${e instanceof Error ? e.message : 'Unknown error'}`) }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "warung_menus" ADD CONSTRAINT "warung_menus_menu_id_fkey"
          FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN null;
        END $$
      `)
      results.push('warung_menus FK menu: OK')
    } catch (e: unknown) { results.push(`warung_menus FK menu: ${e instanceof Error ? e.message : 'Unknown error'}`) }

    interface CountResult {
      count: number
    }

    const catCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "menu_categories"`
    const menuCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "menus" WHERE "category_id" IS NOT NULL`
    const menuTotal = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "menus"`

    return NextResponse.json({
      success: true,
      steps: results,
      verification: {
        categories: (catCount as CountResult[])[0].count,
        menusWithCategory: (menuCount as CountResult[])[0].count,
        totalMenus: (menuTotal as CountResult[])[0].count,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[POST /api/admin/migrate]', error)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
