# Design System — Kasir Vian Jaya 08

Dokumen ini adalah rujukan visual untuk seluruh UI aplikasi kasir Vian Jaya 08
(Seafood & Nasi Uduk, 3 cabang). Target rasa: **premium & classy**, setara
sistem kasir kelas atas (Toast POS, Lightspeed Restaurant, SumUp Solo,
sistem kasir retail butik seperti Aesop) — tapi tetap cepat dan utilitarian
untuk dipakai kasir di lingkungan warung yang sibuk, bukan lambat atau
dekoratif.

Identitas brand yang sudah ada (`cover-seafood.webp`) — logo lingkaran
"VIAN JAYA 08" dengan bintang, ilustrasi naturalis udang/kepiting/ikan warna
penuh, tipografi serif condensed merah — adalah fondasi sistem ini, bukan
elemen terpisah yang ditambahkan belakangan.

---

## 1. Color

Palet memakai **light cream + olive green**: hangat, terang, dan tetap tenang
saat dipakai lama di area kasir. Merah dari logo dipertahankan sebagai aksen
minor untuk aksi destruktif agar identitas brand tetap hadir tanpa mendominasi
seluruh UI.

| Token | Hex | Peran |
|---|---|---|
| `--color-base` | `#EAE7DE` | Background utama, cream hangat |
| `--color-surface` | `#F5F3EC` | Card, modal, elemen terangkat dari base |
| `--color-surface-raised` | `#FFFFFF` | Dropdown, popover, tombol stepper |
| `--color-text-primary` | `#1B1B1B` | Teks utama, hampir hitam |
| `--color-text-muted` | `#6B6B6B` | Teks sekunder, label, meta |
| `--color-brand` | `#4F5D23` | Olive gelap, aksen primer dan CTA utama |
| `--color-brand-soft` | `#C3D3B3` | Background badge, avatar, dan chip |
| `--color-accent` | `#6E7A1E` | Aksen sekunder: addon dan highlight opsional |
| `--color-accent-soft` | `#F2E7B4` | Fill pill dan badge aksen sekunder |
| `--color-danger` | `#B4222B` | Aksi hapus, batal, dan error destruktif saja |
| `--color-success` | `#4F5D23` | Status "PAID" memakai brand olive |
| `--color-pending` | `#6E7A1E` | Status "OPEN" atau meja masih aktif |

**Aturan pakai:**
- `--color-brand` dipakai untuk CTA utama, nav aktif, focus ring, dan status
  PAID. `--color-accent` bukan CTA utama.
- `--color-danger` hanya untuk aksi menghapus atau membatalkan; jangan
  digunakan sebagai warna status normal atau aksen luas.
- Tombol qty/stepper selalu putih solid, rounded penuh, shadow lembut, dan
  ikon gelap. Checkbox memakai outline hitam tegas dengan tanda centang gelap.
- Warna angka di statistik/card **tidak boleh dibedakan sembarangan**.
  Beda warna hanya kalau memang beda makna status (contoh: total
  penjualan pakai `--color-text-primary` besar, bukan merah/hijau/ungu
  campur seperti di versi lama).
- Kontras `--color-text-primary` di atas base/surface harus lolos WCAG AA
  (rasio ≥ 4.5:1). `--color-text-muted` dipakai hanya untuk caption/meta;
  label penting memakai teks sekunder yang lebih gelap.

---

## 2. Typography

Dua typeface, peran jelas berbeda:

- **Display / heading** — serif condensed tebal, senada dengan gaya logo
  brand. Rekomendasi: **Fraunces** (varian bold/black, optical size tinggi)
  atau **Tiempos Headline** kalau tersedia lisensinya. Dipakai untuk judul
  halaman, nominal total di layar pembayaran, nama produk di struk.
- **UI / data** — grotesk humanis yang bersih, dengan **tabular figures**
  aktif untuk semua angka (harga, qty, nomor meja) supaya rapi saat
  berubah cepat. Rekomendasi: **Inter** atau **General Sans**.

| Level | Font | Size | Weight | Pemakaian |
|---|---|---|---|---|
| Display XL | Fraunces | 40px | 600 | Total tagihan di layar pembayaran |
| Display L | Fraunces | 28px | 600 | Judul halaman |
| Heading | Inter | 18px | 600 | Judul card, nama menu |
| Body | Inter | 15px | 400 | Teks UI umum |
| Data | Inter (tabular-nums) | 16px | 500 | Harga, qty, nomor meja |
| Caption | Inter | 13px | 400 | Label, meta, timestamp |

Larangan: **jangan** pakai label ALL-CAPS dengan letter-spacing lebar untuk
section header (mis. "AKSES CEPAT") — pakai Heading biasa dengan hierarki
ukuran, bukan gaya "eyeing label".

---

## 3. Iconography

- Satu icon set konsisten: **Lucide** (outline, stroke-width 1.75px di
  semua ukuran).
- **Tidak ada emoji sebagai icon fungsional** di UI manapun — dashboard,
  tombol, status badge. Emoji render beda-beda antar device dan langsung
  menurunkan kesan premium.
- Icon dipakai secukupnya untuk memperjelas aksi (cetak, tambah, hapus),
  bukan ditempel di setiap card sebagai dekorasi.

---

## 4. Layout & Komponen Kunci

> Halaman login di luar scope dokumen ini — tidak diubah, tetap seperti
> kondisi sekarang. Fokus bagian ini ke halaman-halaman setelah login.

### 4.1 Dashboard Owner

Redesain total dari versi lama (card seragam + emoji + warna acak).
Prinsip: **hierarki**, bukan grid seragam.

```
┌─────────────────────────────────────────────────────┐
│  Vian Jaya 08 · Cabang 1          Owner ▾    Keluar  │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Dashboard                                           │
│  Kamis, 10 September 2026                            │
│                                                       │
│  ┌───────────────────────────┐  ┌─────┐ ┌─────┐    │
│  │  Total Penjualan Hari Ini │  │  0  │ │  3  │    │
│  │  Rp 0                     │  │Trans│ │Kasir│    │
│  │  (Display XL, dominan)    │  └─────┘ └─────┘    │
│  └───────────────────────────┘                      │
│                                                       │
│  Akses Cepat                                         │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐         │
│  │ Laporan   │ │ Kelola    │ │ Manajemen │         │
│  │ [icon]    │ │ Menu      │ │ Kasir     │         │
│  └───────────┘ └───────────┘ └───────────┘         │
└─────────────────────────────────────────────────────┘
```

- Total penjualan hari ini jadi card **dominan** (lebih besar, Display XL),
  bukan disamakan ukurannya dengan "Total Transaksi"/"Kasir Aktif" yang
  sifatnya sekunder.
- Card sekunder boleh lebih kecil dan padat, tanpa shadow berat — cukup
  beda `--color-surface` vs `--color-base` untuk pemisahan.
- "Akses Cepat" ditulis title case biasa (Heading), bukan all-caps
  letter-spaced.
- Logo di header pakai versi lingkaran dari brand asli, bukan badge kotak
  generik.

### 4.2 Input Pesanan (per meja)

- Grid menu dengan foto (kalau ada) atau nama besar + harga dalam Data
  style (tabular).
- Tap menu → stepper qty muncul inline, langsung ke ringkasan order di
  panel bawah/samping (bukan modal terpisah, biar cepat untuk input
  berkali-kali).
- Nomor meja ditampilkan persisten di top bar selama sesi input.

### 4.3 List "Meja Aktif"

- Grid card per meja berstatus OPEN, tiap card: nomor meja besar (Display),
  jumlah item, subtotal running (Data style), durasi sejak dibuka (Caption
  muted).
- Warna indikator status pakai `--color-pending` (bukan merah — merah
  dicadangkan untuk aksi/brand, bukan status netral "masih berjalan").
- Tap card → detail order meja tsb.

### 4.4 Detail Order per Meja

- List item dengan qty, harga satuan, subtotal per baris (Data style,
  tabular-nums rata kanan).
- Tombol tambah item & hapus item jelas terpisah dari tombol lanjut ke
  pembayaran (hindari mis-tap saat tangan basah/terburu-buru — touch
  target ≥ 44px).

### 4.5 Flow Pembayaran

- Total tagihan pakai Display XL, paling dominan di layar.
- Pilihan metode: Cash / QRIS sebagai toggle besar, bukan dropdown.
- Konfirmasi bayar → transisi status ke PAID (lihat Motion) → langsung
  trigger preview cetak struk.

### 4.6 Preview/Print Struk Thermal 80mm

- Layout struk tetap monokrom (keterbatasan printer thermal), tapi
  hierarki tetap dijaga: nama warung + logo (versi simpel, monokrom) di
  atas, item dengan alignment rata kanan untuk harga, total digarisbawahi
  tebal, metode bayar & nomor meja di footer.

---

## 5. Motion

| Interaksi | Bentuk | Durasi |
|---|---|---|
| Item ditambahkan ke order | Angka qty/subtotal update dengan micro fade+scale singkat pada angka yang berubah; highlight memakai `--color-brand-soft` | 150ms ease-out |
| Meja OPEN → PAID | Card meja fade out dari list "Meja Aktif" | 200ms ease-in |
| Konfirmasi pembayaran berhasil | Checkmark muncul dengan scale-in, bukan confetti/animasi berlebihan | 250ms ease-out |
| Struk siap cetak | Slide-up panel preview struk | 200ms ease-out |

Tidak ada animasi otomatis saat halaman/card dimuat (no fade-and-slide-up
on load) — motion hanya merespons aksi kasir.

---

## 6. Voice / Copy

Bahasa Indonesia, sudut pandang kasir, bukan istilah teknis sistem.

| Konteks | Pakai | Hindari |
|---|---|---|
| Tombol cetak | "Cetak Struk" | "Print" |
| Notifikasi sukses cetak | "Struk dicetak" | "Success" |
| Tombol simpan order sementara | "Simpan Pesanan" | "Save" / "Submit" |
| Status meja | "Meja masih aktif" | "Status: OPEN" (istilah sistem) |
| Konfirmasi bayar | "Konfirmasi & Cetak" | "Confirm Payment" |

---

## 7. Quality Floor (non-negotiable)

- Kontras teks vs background minimal WCAG AA (4.5:1 untuk teks normal).
- Focus state keyboard terlihat jelas (ring 2px `--color-brand`) di semua
  elemen interaktif — penting untuk aksesibilitas dan debugging di browser.
- Responsive dari layar HP kecil (360px) sampai tablet (1024px+).
- Touch target minimal 44×44px untuk semua elemen interaktif di halaman
  kasir (tombol menu, stepper qty, tombol bayar).
- Tabular figures aktif (`font-variant-numeric: tabular-nums`) di semua
  tampilan angka yang berubah dinamis (qty, subtotal, total).
