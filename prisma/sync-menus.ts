import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Syncing menus across all warungs...')

  const warungs = await prisma.warung.findMany({ orderBy: { kode: 'asc' } })
  if (warungs.length === 0) {
    console.log('❌ Tidak ada warung ditemukan.')
    return
  }

  const sourceWarung = warungs[0]
  const sourceCategories = await prisma.menuCategory.findMany({
    where: { warungId: sourceWarung.id },
    orderBy: { sortOrder: 'asc' },
  })

  const sourceMenus = await prisma.menu.findMany({
    where: { warungId: sourceWarung.id },
    include: { category: { select: { nama: true } } },
    orderBy: [{ sortOrder: 'asc' }, { nama: 'asc' }],
  })

  if (sourceMenus.length === 0) {
    console.log(`❌ Tidak ada menu di warung ${sourceWarung.nama}. Buat menu dulu di warung ini.`)
    return
  }

  console.log(`📋 Source: ${sourceWarung.nama} (${sourceMenus.length} menu)`)

  for (const warung of warungs) {
    if (warung.id === sourceWarung.id) continue

    await prisma.menuCategory.deleteMany({ where: { warungId: warung.id } })
    await prisma.menu.deleteMany({ where: { warungId: warung.id } })

    const categoryMap = new Map<string, string>()
    for (const cat of sourceCategories) {
      const created = await prisma.menuCategory.create({
        data: { warungId: warung.id, nama: cat.nama, sortOrder: cat.sortOrder, isAktif: cat.isAktif },
      })
      categoryMap.set(cat.nama, created.id)
    }

    await prisma.menu.createMany({
      data: sourceMenus.map((m) => ({
        warungId: warung.id,
        categoryId: categoryMap.get(m.category.nama) ?? '',
        nama: m.nama,
        harga: m.harga,
        isAktif: m.isAktif,
        sortOrder: m.sortOrder,
      })),
    })

    console.log(`✅ ${warung.nama} — ${sourceMenus.length} menu disalin`)
  }

  console.log('')
  console.log(`🎉 Semua ${warungs.length} warung sekarang punya menu yang sama`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
