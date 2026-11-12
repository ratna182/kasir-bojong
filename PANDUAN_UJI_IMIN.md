# Panduan Uji APK di Mesin iMin

Dokumen ini untuk memastikan APK **Pinang Ranti** terpasang dan semua fungsi berjalan di mesin kasir iMin.

## Identitas APK

| Item | Nilai |
|---|---|
| Nama aplikasi | Pinang Ranti |
| Package | `id.kasirbojongkulur.kasir` |
| Versi | 1.5.4 (versionCode 13) |
| Server | `https://kasir-bojongkulur.vercel.app` |
| Printer | Bluetooth SPP, LAN, dan USB |

Catatan: aplikasi ini adalah build kasir untuk outlet Pinang Ranti.

## Prasyarat

- Mesin iMin dalam kondisi menyala dan terhubung internet.
- File `pinang-ranti.apk` (dari CI artifact atau build lokal).
- Kabel USB + adb (opsional, untuk install lewat komputer).

## Cara Install

Lewat adb:

```powershell
adb install -r pinang-ranti.apk
```

Atau salin `pinang-ranti.apk` ke mesin, lalu buka file-nya dan izinkan "Install unknown apps".

Jika muncul "App not installed": uninstall versi lama dengan package yang sama lebih dulu (`adb uninstall id.kasirbojongkulur.kasir`).

## Checklist Uji

Centang satu per satu. Kalau ada yang gagal, catat langkah nomornya.

1. **Buka aplikasi** — halaman login tampil, tidak ada layar putih/error.
2. **Login** — pakai akun owner/kasir yang berlaku.
3. **Setup Printer (sekali saja)** — pilih "Gunakan Printer Built-in (iMin)".
4. **Halaman `/printer-test`** — status harus menunjukkan APK (bukan `Web/browser`).
5. **Connect printer** — status berubah menjadi terhubung.
6. **Cetak Struk Uji** — kertas keluar, teks terbaca, tidak terpotong.
7. **Tes Cetak SPP** — berhasil tanpa error di layar.
8. **Transaksi baru** — pilih menu, simpan, bayar (Cash/QRIS/Transfer).
9. **Struk transaksi** — tercetak otomatis; cek header:
   ```
   LOGO
   Seafood Vian Jaya 08
   Seafood Vian Jaya 08 Pinang Ranti (Pusat)
   Jalan Raya Pondok Gede No. 11
   IG : Seafoodvianjaya.id
   FB : Seafoodvianjaya
   TT : Seafoodvianjaya
   ```
   Lalu cek item, total, bayar, kembalian benar.
10. **Riwayat** — buka transaksi tadi, coba "Cetak Ulang"; struk bertanda CETAK ULANG.
11. **Laporan** — tutup shift, cetak laporan 80mm; semua baris muat dalam 48 kolom.
12. **Refresh / buka ulang aplikasi** — sesi masih aktif, printer masih tersimpan.

## Troubleshooting

| Gejala | Penyebab umum | Tindakan |
|---|---|---|
| `Bridge: tidak tersedia` | Dibuka di browser, bukan APK | Jalankan dari aplikasi APK |
| Tombol iMin tidak muncul | `window.IMinPrinter` tidak ada | Pastikan memakai APK terbaru (1.5.1) |
| Printer tidak terhubung | Printer belum pairing / dipakai app lain | Putuskan koneksi Bluetooth lain, ulangi Connect |
| Kertas kosong | Lebar/encoding tidak cocok | Coba 58mm/80mm di Setup Printer |
| Struk terpotong | Lebar melebihi kertas | Gunakan 80mm untuk printer built-in |
| Alamat kosong di struk | Data warung belum terisi | Cek `warungs.alamat` di database |

## Catatan

- Cetak lewat browser (`window.print` / `window.open`) sengaja diblokir di APK.
- Perubahan teks/UI di server langsung berlaku setelah refresh; perubahan kode web butuh deploy Vercel.
- Pembuktian akhir tetap di kertas: test otomatis hanya memastikan encoding dan isi struk benar.
