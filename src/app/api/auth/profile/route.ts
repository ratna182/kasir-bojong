import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// GET /api/auth/profile — ambil data profil user
export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    if (!context?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: context.user.id },
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        role: true,
        isActive: true,
        createdAt: true,
        warung: {
          select: {
            id: true,
            nama: true,
            kode: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: 'User tidak ditemukan.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('[GET /api/auth/profile]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil data profil.' }, { status: 500 })
  }
}

// PUT /api/auth/profile — update profil atau ganti password
export async function PUT(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    if (!context?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { namaLengkap, currentPassword, newPassword } = body

    const updateData: any = {}

    // Update nama lengkap
    if (namaLengkap !== undefined) {
      updateData.namaLengkap = namaLengkap?.trim() || null
    }

    // Ganti password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({
          success: false,
          errors: { currentPassword: 'Password lama wajib diisi.' },
        }, { status: 422 })
      }

      if (newPassword.length < 6) {
        return NextResponse.json({
          success: false,
          errors: { newPassword: 'Password baru minimal 6 karakter.' },
        }, { status: 422 })
      }

      // Verifikasi password lama
      const user = await prisma.user.findUnique({
        where: { id: context.user.id },
        select: { passwordHash: true },
      })

      if (!user) {
        return NextResponse.json({ success: false, message: 'User tidak ditemukan.' }, { status: 404 })
      }

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isValid) {
        return NextResponse.json({
          success: false,
          errors: { currentPassword: 'Password lama salah.' },
        }, { status: 422 })
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, 8)
    }

    // Update user
    const updated = await prisma.user.update({
      where: { id: context.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        role: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[PUT /api/auth/profile]', error)
    return NextResponse.json({ success: false, message: 'Gagal update profil.' }, { status: 500 })
  }
}
