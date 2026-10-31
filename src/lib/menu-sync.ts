import { prisma } from '@/lib/prisma'

type SharedCategory = {
  nama: string
  sortOrder: number
  isAktif: boolean
}

type SharedMenu = {
  nama: string
  harga: number
  isAktif: boolean
  sortOrder: number
  categoryName: string
}

async function getMasterWarungId(): Promise<string | null> {
  const w = await prisma.warung.findFirst({ orderBy: { kode: 'asc' }, select: { id: true } })
  return w?.id ?? null
}

async function getSharedCategories(masterId: string): Promise<SharedCategory[]> {
  return prisma.menuCategory.findMany({
    where: { warungId: masterId },
    select: { nama: true, sortOrder: true, isAktif: true },
    orderBy: { sortOrder: 'asc' },
  })
}

async function getSharedMenus(masterId: string): Promise<SharedMenu[]> {
  return prisma.menu.findMany({
    where: { warungId: masterId },
    select: { nama: true, harga: true, isAktif: true, sortOrder: true, category: { select: { nama: true } } },
    orderBy: [{ sortOrder: 'asc' }, { nama: 'asc' }],
  }).then((menus) => menus.map((m) => ({
    nama: m.nama,
    harga: m.harga,
    isAktif: m.isAktif,
    sortOrder: m.sortOrder,
    categoryName: m.category.nama,
  })))
}

export async function syncWarungCategories(warungId: string) {
  const masterId = await getMasterWarungId()
  if (!masterId) return
  const categories = await getSharedCategories(masterId)
  const existing = new Set(
    (await prisma.menuCategory.findMany({ where: { warungId }, select: { nama: true } })).map((c) => c.nama)
  )

  for (const cat of categories) {
    if (!existing.has(cat.nama)) {
      await prisma.menuCategory.create({
        data: { warungId, nama: cat.nama, sortOrder: cat.sortOrder, isAktif: cat.isAktif },
      })
    }
  }
}

export async function syncWarungMenus(warungId: string, overwrite = false) {
  const masterId = await getMasterWarungId()
  if (!masterId) return
  if (masterId === warungId) return // skip master itu sendiri

  // 1. Sync categories
  await syncWarungCategories(warungId)

  // 2. Ambil master menus
  const menus = await getSharedMenus(masterId)
  const masterMenuNames = new Set(menus.map((m) => m.nama))

  // 3. Map categories di target
  const categoriesInTarget = await prisma.menuCategory.findMany({
    where: { warungId },
    select: { id: true, nama: true },
  })
  const categoryMap = new Map(categoriesInTarget.map((c) => [c.nama, c.id]))

  // 4. Upsert setiap menu dari master
  for (const menu of menus) {
    const categoryId = categoryMap.get(menu.categoryName)
    if (!categoryId) continue

    await prisma.menu.upsert({
      where: { warungId_nama: { warungId, nama: menu.nama } },
      update: overwrite
        ? { harga: menu.harga, isAktif: menu.isAktif, sortOrder: menu.sortOrder, categoryId }
        : {},
      create: {
        warungId,
        categoryId,
        nama: menu.nama,
        harga: menu.harga,
        isAktif: menu.isAktif,
        sortOrder: menu.sortOrder,
      },
    })
  }

  // 5. Hapus menu di target yang tidak ada di master (beserta warungMenus dan transaksiItems terkait)
  if (overwrite) {
    const masterNama = Array.from(masterMenuNames)
    const menusToDelete = await prisma.menu.findMany({
      where: { warungId, nama: { notIn: masterNama } },
      select: { id: true },
    })

    if (menusToDelete.length > 0) {
      const menuIds = menusToDelete.map((m) => m.id)

      // Hapus warungMenus terlebih dahulu
      await prisma.warungMenu.deleteMany({ where: { menuId: { in: menuIds } } })

      // Hapus transaksiItems terlebih dahulu (agar tidak foreign key error)
      await prisma.transaksiItem.deleteMany({ where: { menuId: { in: menuIds } } })

      // Baru hapus menu-nya
      await prisma.menu.deleteMany({ where: { id: { in: menuIds } } })
    }
  }
}

export async function syncMenusAcrossWarungs() {
  const masterId = await getMasterWarungId()
  if (!masterId) return

  const warungs = await prisma.warung.findMany({
    where: { id: { not: masterId } },
    select: { id: true },
  })

  // Sync satu per satu untuk hindari race condition
  for (const warung of warungs) {
    await syncWarungMenus(warung.id, true)
  }
}

export { getMasterWarungId }
