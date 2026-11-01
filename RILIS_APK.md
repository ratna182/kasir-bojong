# Rilis APK & Backup

Prosedur rilis APK Kasir Bojong Kulur, termasuk signing di CI dan backup keystore.

## Identitas Rilis

| Item | Nilai |
|---|---|
| Package | `id.kasirbojongkulur.kasir` |
| Nama | Kasir Bojong Kulur |
| Certificate | `CN=Kasir Bojong Kulur, OU=POS, O=Bojong Kulur, L=Bogor, ST=Jawa Barat, C=ID` |
| SHA-256 sertifikat | `DD:4D:CC:D4:7F:E2:45:1E:9A:77:4E:98:4A:75:6A:7E:E0:2C:A4:FF:85:C2:0C:89:CC:DB:3F:D9:D9:97:77:4E` |
| Keystore | `android/kasir-bojongkulur-release.jks` (alias `kasirbojongkulur`, PKCS12) |
| Server | `https://kasir-bojongkulur.vercel.app` |

> Sertifikat ini **tidak boleh berubah**. APK dengan sertifikat berbeda tidak bisa meng-update APK yang sudah terpasang.

## Alur Rilis

1. Ubah kode, lalu jalankan:
   ```powershell
   npm run test:run
   npx tsc --noEmit
   ```
2. Bump versi di `android/app/build.gradle`:
   ```gradle
   versionCode 11        // selalu naik
   versionName "1.5.2"
   ```
3. Commit dan push ke `master`:
   ```powershell
   git add -A
   git commit -m "release: v1.5.2 (11)"
   git push origin master
   ```
4. CI `Build Android APK` berjalan otomatis: test → build web → build APK → verifikasi signature → upload artifact.
5. Unduh artifact:
   ```powershell
   gh run download --repo ratna182/kasir-bojong -n app-release-apk
   ```
6. Verifikasi:
   ```powershell
   $apk = "app-release.apk"
   "$env:ANDROID_HOME\build-tools\36.0.0\apksigner.bat" verify --print-certs $apk
   "$env:ANDROID_HOME\build-tools\36.0.0\aapt.exe" dump badging $apk
   ```
   Pastikan SHA-256 sama dengan tabel di atas, dan `versionCode`/`versionName` sesuai.
7. Install ke mesin iMin, lalu ikuti `PANDUAN_UJI_IMIN.md`.

Build lokal (opsional):

```powershell
npx cap sync android
cd android
.\gradlew.bat assembleRelease --no-daemon
```

## Secrets CI

Nama secret di GitHub (Settings → Secrets and variables → Actions). Nilai disimpan di password manager, **jangan** di repo.

| Secret | Isi |
|---|---|
| `KEYSTORE_BASE64` | isi file `.jks` yang di-encode base64 |
| `KEYSTORE_PASSWORD` | password keystore |
| `KEY_ALIAS` | `kasirbojongkulur` |
| `KEY_PASSWORD` | password key (sama dengan keystore) |

Set ulang:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android\kasir-bojongkulur-release.jks")) |
  gh secret set KEYSTORE_BASE64 --repo ratna182/kasir-bojong
```

## Backup Keystore (WAJIB)

File yang harus disimpan di luar repo dan di luar mesin kerja:

- `android/kasir-bojongkulur-release.jks`
- `android/keystore.properties` (berisi password)
- Password yang sama di password manager

Simpan minimal di dua tempat (mis. password manager + flashdisk offline). Jika keystore hilang, aplikasi tidak bisa di-update lagi selain dengan package baru.

## Rollback

- Android tidak mengizinkan downgrade `versionCode` lewat install biasa. Untuk kembali ke versi lama: uninstall dulu, lalu install APK lama (data lokal aplikasi ikut terhapus; data utama ada di server).
- Sertifikat dan package harus tetap sama agar APK baru bisa menggantikan yang terpasang.

## Catatan

- Workflow juga membangun APK debug (`app-debug-apk`) untuk pengujian cepat.
- APK release hanya ditandatangani jika keempat secret di atas tersedia; step "Verify release APK is signed" akan menggagalkan CI jika tidak.
