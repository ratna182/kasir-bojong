import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const { id } = await params
    const body = await request.json()
    const { nama, sortOrder, isAktif } = body

    const category = await prisma.menuCategory.findUnique({ where: { id } })
    if (!category) {
      return NextResponse.json({ success: false, message: 'Kategori tidak ditemukan.' }, { status: 404 })
    }

    const errors: Record<string, string> = {}
    if (nama !== undefined && !nama.trim()) errors.nama = 'Nama kategori tidak boleh kosong.'

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 422 })
    }

    if (nama && nama.trim() !== category.nama) {
      const existing = await prisma.menuCategory.findFirst({
        where: { warungId: category.warungId, nama: nama.trim(), id: { not: id } },
      })
      if (existing) {
        return NextResponse.json({ success: false, errors: { nama: 'Nama kategori sudah ada.' } }, { status: 422 })
      }
    }

    const updated = await prisma.menuCategory.update({
      where: { id },
      data: {
        ...(nama !== undefined && { nama: nama.trim() }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
        ...(isAktif !== undefined && { isAktif: Boolean(isAktif) }),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[PUT /api/menu/categories/:id]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengupdate kategori.' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const { id } = await params

    const category = await prisma.menuCategory.findUnique({
      where: { id },
      include: { _count: { select: { menus: true } } },
    })
    if (!category) {
      return NextResponse.json({ success: false, message: 'Kategori tidak ditemukan.' }, { status: 404 })
    }

    if (category._count.menus > 0) {
      return NextResponse.json({
        success: false,
        message: `Kategori masih memiliki ${category._count.menus} menu. Pindahkan atau hapus menu terlebih dahulu.`,
      }, { status: 409 })
    }

    await prisma.menuCategory.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Kategori berhasil dihapus.' })
  } catch (error) {
    console.error('[DELETE /api/menu/categories/:id]', error)
    return NextResponse.json({ success: false, message: 'Gagal menghapus kategori.' }, { status: 500 })
  }
}
