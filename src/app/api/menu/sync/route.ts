import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'
import { syncMenusAcrossWarungs } from '@/lib/menu-sync'

export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    // Diagnostic: check master warung state
    const masterWarung = await prisma.warung.findFirst({ orderBy: { kode: 'asc' }, select: { id: true, nama: true, kode: true } })
    if (!masterWarung) {
      return NextResponse.json({ success: false, message: 'Tidak ada warung.' }, { status: 404 })
    }

    const masterCategories = await prisma.menuCategory.findMany({
      where: { warungId: masterWarung.id },
      select: { id: true, nama: true },
      orderBy: { sortOrder: 'asc' },
    })

    const masterMenus = await prisma.menu.findMany({
      where: { warungId: masterWarung.id },
      select: { nama: true, categoryId: true, category: { select: { nama: true } } },
      orderBy: [{ sortOrder: 'asc' }, { nama: 'asc' }],
    })

    if (masterMenus.length === 0) {
      return NextResponse.json({ success: false, message: 'Master warung belum punya menu. Buat menu dulu di owner.' }, { status: 404 })
    }

    // Run sync
    await syncMenusAcrossWarungs()

    // Count results
    const warungs = await prisma.warung.findMany({ select: { id: true, nama: true } })
    const warungResults = await Promise.all(
      warungs.filter(w => w.id !== masterWarung.id).map(async (w) => {
        const menuCount = await prisma.menu.count({ where: { warungId: w.id } })
        const catCount = await prisma.menuCategory.count({ where: { warungId: w.id } })
        return { nama: w.nama, menus: menuCount, categories: catCount }
      })
    )

    return NextResponse.json({
      success: true,
      message: `Sync selesai. Master: ${masterMenus.length} menu, ${masterCategories.length} kategori.`,
      data: {
        master: { nama: masterWarung.nama, kode: masterWarung.kode, menus: masterMenus.length, categories: masterCategories.length, categoryNames: masterCategories.map(c => c.nama) },
        warungs: warungResults,
      },
    })
  } catch (error: any) {
    console.error('[POST /api/menu/sync]', error)
    return NextResponse.json({ success: false, message: `Gagal sync menu: ${error.message}` }, { status: 500 })
  }
}
