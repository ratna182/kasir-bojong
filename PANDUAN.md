# Panduan Penggunaan Sistem Kasir Digital — Vian Jaya 08

## 1. Login

1. Buka aplikasi di browser: `kasir-seafood.vercel.app/login`
2. Masukkan **Username** dan **Password** yang telah didaftarkan
3. Klik **Masuk**
4. Akan diarahkan ke halaman sesuai role:
   - **OWNER** → Dashboard Owner
   - **KASIR** → Dashboard Kasir

---

## 2. Dashboard

### Dashboard Owner

Menampilkan ringkasan seluruh warung:

| Komponen | Keterangan |
|----------|------------|
| Total Penjualan Hari Ini | Jumlah rupiah dari semua transaksi SELESAI hari ini |
| Total Transaksi | Jumlah transaksi yang sudah selesai |
| Kasir Aktif | Jumlah akun kasir yang aktif |
| Total Warung | Jumlah warung yang terdaftar |
| Penjualan Per Warung | Rincian penjualan per outlet |
| Menu Terlaris | Top 5 menu berdasarkan total penjualan |

**Akses Cepat:** Laporan, Kelola Menu, Manajemen Kasir

### Dashboard Kasir

Menampilkan status shift kasir hari ini:

- **Kasir Buka** = bisa membuat transaksi baru
- **Kasir Sudah Ditutup** = transaksi baru dinonaktifkan sampai besok

| Komponen | Keterangan |
|----------|------------|
| Transaksi Hari Ini | Jumlah transaksi selesai hari ini |
| Pendapatan Hari Ini | Total rupiah pendapatan hari ini |

**Menu Utama:**
- **Transaksi Baru** → buat pesanan pelanggan
- **Riwayat Transaksi** → lihat & cetak ulang struk

---

## 3. Transaksi (Kasir)

Halaman utama untuk mencatat pesanan pelanggan.

### Alur Kerja

1. **Pilih/Isi Nomor Meja**
   - Ketik manual, atau klik tombol cepat: Meja 1–8, Bungkus
   - Jika meja sudah ada order aktif, akan langsung terbuka

2. **Pilih Menu**
   - Klik kartu menu di kolom kiri untuk menambahkan ke keranjang
   - Gunakan filter **Semua / Makanan / Minuman** atau **kolom pencarian** untuk mempercepat
   - Badge angka pada kartu = jumlah yang sudah dipilih

3. **Atur Jumlah (Qty)**
   - Gunakan tombol **+** / **−** pada item di keranjang
   - Klik **Hapus** untuk menghapus item dari keranjang

4. **Simpan Order Sementara**
   - Klik **Simpan Order Sementara** untuk menyimpan pesanan
   - Pesanan akan muncul di bagian **Meja Aktif** di atas
   - Pelanggan bisa pesan tambahan nanti

5. **Tambah Item ke Order yang Sudah Ada**
   - Klik tombol meja di bagian **Meja Aktif**
   - Pilih menu tambahan di kolom kiri
   - Klik **Simpan Order Sementara** lagi

6. **Bayar & Cetak Struk**
   - Pilih metode pembayaran: **CASH** atau **QRIS**
   - Klik **Bayar & Cetak Struk**
   - Pratinjau struk akan muncul → klik **Cetak Struk** untuk mencetak

### Tips

- Semua item di keranjang harus disimpan dulu sebelum bayar
- Jika kasir sudah ditutup, tombol transaksi baru akan nonaktif
- Struk dicetak ukuran termal 80mm

---

## 4. Riwayat Transaksi

Melihat semua transaksi hari ini dan mencetak ulang struk.

- Gunakan **kolom pencarian** untuk mencari berdasarkan nomor meja, nama menu, atau ID transaksi
- Klik **Cetak Struk** pada transaksi yang diinginkan
- Pratinjau struk muncul → klik **Cetak** untuk mencetak ulang

---

## 5. Laporan Penjualan Harian (Owner/Kasir)

Menampilkan rekapitulasi penjualan per menu untuk hari ini.

| Komponen | Keterangan |
|----------|------------|
| Jumlah Transaksi | Total transaksi selesai hari ini |
| Total Porsi/Item Terjual | Total jumlah item yang terjual |
| Total Pendapatan | Total rupiah pendapatan |
| Rincian Per Menu | Nama menu, kategori, qty terjual, subtotal |

### Aksi yang Tersedia

| Tombol | Keterangan |
|--------|------------|
| Export Excel | Download laporan dalam format .xlsx |
| Export PDF | Download laporan dalam format .pdf |
| Cetak Laporan (80mm) | Cetak laporan ke printer termal |
| Tutup Kasir Hari Ini | Menutup shift kasir (tidak bisa dibatalkan) |

### Menutup Kasir

1. Klik **Tutup Kasir Hari Ini**
2. Tinjau total transaksi dan pendapatan
3. Klik **Ya, Tutup Kasir** untuk konfirmasi
4. Setelah ditutup, **transaksi baru tidak bisa dibuat** sampai esok hari
5. Laporan penutupan bisa dicetak

---

## 6. Kelola Menu (Owner Only)

Mengelola daftar makanan dan minuman yang tersedia.

### Menambah Menu

1. Klik **+ Tambah Menu Baru**
2. Isi:
   - **Nama Menu** (wajib)
   - **Kategori**: Makanan / Minuman
   - **Harga Jual** (wajib, minimal 0)
3. Klik **Tambah Menu**

### Mengedit Menu

1. Klik **Edit** pada menu yang ingin diubah
2. Ubah data yang diperlukan
3. Centang/hapus **Menu Aktif** untuk mengatur apakah menu tampil di halaman kasir
4. Klik **Simpan Perubahan**

### Menghapus Menu

1. Klik ikon **🗑️** pada menu yang ingin dihapus
2. Konfirmasi dengan klik **OK**
3. Menu yang sudah pernah ditransaksikan tidak bisa dihapus, hanya bisa dinonaktifkan

### Filter & Pencarian

- Gunakan tombol **Semua / Makanan / Minuman** untuk filter kategori
- Pilih **Semua Status / Hanya Aktif / Hanya Nonaktif** dari dropdown
- Ketik nama menu di kolom pencarian

---

## 7. Manajemen Kasir (Owner Only)

Mengelola akun kasir untuk setiap warung/outlet.

### Melihat Daftar Kasir

1. Pilih warung dari dropdown **Pilih Warung**
2. Daftar kasir untuk warung tersebut akan ditampilkan

### Menambah Kasir

1. Klik **+ Tambah Kasir**
2. Isi:
   - **Username** (wajib, unik)
   - **Password** (wajib, minimal 6 karakter)
   - **Nama Lengkap** (opsional)
3. Klik **Simpan**

### Mengedit Kasir

1. Klik **Edit** pada kasir yang ingin diubah
2. Ubah data yang diperlukan (password dikosongkan jika tidak diubah)
3. Klik **Update**

### Mengaktifkan/Menonaktifkan Kasir

1. Klik **Nonaktifkan** → kasir tidak bisa login
2. Klik **Aktifkan** → kasir bisa login kembali

### Menghapus Kasir

1. Klik **Hapus** pada kasir yang ingin dihapus
2. Konfirmasi dengan klik **OK**

---

## 8. Profil Saya

Mengelola informasi akun pribadi.

### Edit Profil

1. Klik tab **Profil**
2. Ubah **Nama Lengkap** jika diperlukan
3. Klik **Simpan Perubahan**

### Ganti Password

1. Klik tab **Ganti Password**
2. Masukkan **Password Lama**
3. Masukkan **Password Baru** (minimal 6 karakter)
4. **Ulangi Password Baru** untuk konfirmasi
5. Klik **Ubah Password**

---

## 9. Navigasi

| Menu | Keterangan | Role |
|------|------------|------|
| Dashboard | Ringkasan data | Owner & Kasir |
| Transaksi | POS / catat pesanan | Kasir |
| Riwayat | Daftar transaksi hari ini | Kasir |
| Laporan | Rekap penjualan harian | Owner & Kasir |
| Kelola Menu | CRUD menu | Owner |
| Manajemen Kasir | CRUD akun kasir | Owner |
| Profil | Edit profil & password | Semua |
| Keluar | Logout dari sistem | Semua |

---

## 10. Catatan Penting

- **Satu transaksi = satu meja.** Untuk meja yang sama, tambahkan item ke order yang sudah ada.
- **Kasir harus ditutup** di akhir hari sebelum bisa membuat transaksi baru di hari berikutnya.
- **Struk hanya bisa dicetak** saat pembayaran atau melalui Riwayat Transaksi.
- **Metode pembayaran:** CASH atau QRIS.
- **Menu nonaktif** tidak tampil di halaman kasir tapi tetap ada di database.
- **Printer termal** menggunakan lebar 80mm.
