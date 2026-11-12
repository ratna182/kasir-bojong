# Panduan Printer Comson 80mm USB & LAN

Panduan ini untuk cabang **Pinang Ranti** yang memakai perangkat Android generik dan printer thermal **Comson 80mm** dengan auto cutter, terhubung lewat **LAN** atau **USB OTG**.

## 1. Konfigurasi Build

Printer LAN adalah default. Set environment variable berikut sebelum `npm run build` dan `npx cap sync android`:

```powershell
$env:NEXT_PUBLIC_PRINTER_TYPE="network"
$env:NEXT_PUBLIC_PRINTER_HOST="192.168.1.50"
$env:NEXT_PUBLIC_PRINTER_PORT="9100"
$env:NEXT_PUBLIC_PRINTER_WIDTH="80mm"
$env:NEXT_PUBLIC_PRINTER_ALLOWED="network,usb"
```

- `NEXT_PUBLIC_PRINTER_HOST` boleh dikosongkan; kasir dapat mencari printer lewat tombol **Cari Printer**.
- `NEXT_PUBLIC_PRINTER_ALLOWED` membatasi pilihan yang tampil di Setup Printer. Gunakan `network,usb` untuk cabang ini.
- Nilai env di-inline saat build, jadi APK harus dibangun ulang setelah env berubah.

## 2. Setup LAN

1. Hubungkan printer ke router/access point yang sama dengan perangkat kasir.
2. Pastikan printer mendapat IP tetap, misalnya lewat DHCP reservation di router.
3. Buka **Setup Printer** di aplikasi, pilih **Printer LAN (Comson)**.
4. Isi IP dan port `9100`, lalu tekan **Hubungkan LAN**.
5. Jika IP belum diketahui, tekan **Cari Printer**. Aplikasi memindai subnet lokal pada port 9100 selama beberapa detik.
6. Setelah status `connected`, buka `/printer-test` dan tekan **Cetak Struk Uji**.

Catatan:

- Port standar printer raw adalah `9100`.
- Access point dengan **client isolation** dapat memblokir koneksi kasir ke printer. Matikan fitur tersebut atau gunakan jaringan yang sama tanpa isolasi.
- Jika scan tidak menemukan printer, masukkan IP manual. Scan bergantung pada subnet perangkat dan izin jaringan Android.

## 3. Setup USB OTG

1. Sambungkan printer Comson ke perangkat Android memakai kabel USB OTG.
2. Buka **Setup Printer**, pilih **Printer USB (Comson)**, lalu tekan **Muat Ulang**.
3. Pilih perangkat printer. Android akan menampilkan dialog izin akses USB; pilih **Izinkan**.
4. Setelah status `connected`, cetak struk uji dari `/printer-test`.

Catatan:

- Perangkat harus mendukung **USB Host (OTG)**.
- Jika printer tidak muncul, cek kabel OTG, daya printer, dan coba cabut-pasang ulang.
- Izin USB dapat diminta ulang setelah perangkat di-reboot atau printer dicabut.

## 4. Auto Cutter

Struk diakhiri dengan 4 baris kosong lalu perintah potong `GS V 0`. Jika printer tidak memotong:

1. Pastikan model printer memang memiliki auto cutter.
2. Coba perintah potong alternatif `GS V 66 0` pada firmware/printer yang mendukung.
3. Tambah atau kurangi jarak feed sebelum potong agar pisau tidak mengenai teks.

Perubahan feed ada di `CUT_FEED_LINES` pada `src/lib/printer/escpos.ts`.

## 5. Diagnostik

- Halaman `/printer-test` menampilkan status bridge, versi APK, diagnostik native, daftar USB, hasil scan LAN, dan tombol cetak uji.
- Log native:

```powershell
adb logcat -s IMinPrinter AndroidRuntime
```

- Diagnostik menyimpan host/port LAN terakhir, hasil koneksi, nama perangkat USB, dan pesan kegagalan. Gunakan tombol **Salin** di `/printer-test` saat melaporkan masalah.

## 6. Troubleshooting

| Gejala | Penyebab umum | Tindakan |
|---|---|---|
| `Bridge printer native tidak tersedia` | Halaman dibuka di browser, bukan APK | Jalankan lewat APK Android |
| Scan LAN tidak menemukan host | Client isolation, subnet berbeda, printer mati | Matikan isolasi, samakan jaringan, isi IP manual |
| Koneksi LAN timeout | IP/port salah atau printer sibuk | Cek IP printer, port 9100, lalu reconnect |
| USB tidak terdeteksi | OTG tidak aktif atau kabel bermasalah | Aktifkan OTG, ganti kabel, muat ulang |
| Izin USB ditolak | Dialog izin tidak disetujui | Cabut-pasang printer dan setujui izin |
| Cetak berhasil tetapi tidak terpotong | Auto cutter tidak aktif atau perintah tidak didukung | Cek model printer dan coba perintah potong alternatif |
| Teks terpotong di kanan | Lebar kertas salah | Set 80mm (48 kolom) di Setup Printer |

## 7. Checklist Uji Fisik

- [ ] APK versi terbaru terpasang.
- [ ] Printer LAN terhubung dan status `connected`.
- [ ] Printer USB terdeteksi dan izin diberikan.
- [ ] Struk uji 80mm tercetak rapi.
- [ ] Auto cutter memotong setelah struk.
- [ ] Cetak transaksi asli berhasil.
- [ ] Cetak ulang dari Riwayat berhasil.
- [ ] Laporan 80mm berhasil.
- [ ] Reconnect setelah printer dimatikan dan dinyalakan kembali.
