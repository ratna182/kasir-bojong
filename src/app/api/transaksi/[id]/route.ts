import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'

// DELETE /api/transaksi/[id] — hapus pesanan OPEN (owner only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const { id } = await params

    const transaksi = await prisma.transaksi.findFirst({
      where: { id, status: 'OPEN' },
    })

    if (!transaksi) {
      return NextResponse.json({ success: false, message: 'Pesanan aktif tidak ditemukan atau sudah dibayar.' }, { status: 404 })
    }

    // Hapus items dulu, lalu transaksi
    await prisma.$transaction([
      prisma.transaksiItem.deleteMany({ where: { transaksiId: id } }),
      prisma.transaksi.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true, message: 'Pesanan berhasil dihapus.' })
  } catch (error) {
    console.error('[DELETE /api/transaksi/[id]]', error)
    return NextResponse.json({ success: false, message: 'Gagal menghapus pesanan.' }, { status: 500 })
  }
}
