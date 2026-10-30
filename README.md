# Brankas Kredensial — IT RAJA EMAS INDONESIA

Aplikasi full-stack React + Vite dan Node.js/Express dengan MySQL, role access control, enkripsi kredensial, audit log, dan integrasi GitHub.

## Kebutuhan
- Node.js 20 atau lebih baru
- MySQL 8+ / MariaDB yang kompatibel
- Git CLI (hanya untuk operasi repository)

## Menjalankan lokal
1. Buat database MySQL lalu impor `database/schema.sql`.
2. Salin `.env.example` menjadi `.env`.
3. Isi kredensial database, URL aplikasi, `APP_KEY`, dan `SESSION_SECRET`. Buat kunci terpisah:
   - `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`
   - `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"`
4. Instal paket dengan `npm install`.
5. Jalankan mode pengembangan dengan `npm run dev`, atau build dan mulai server dengan `npm run build` lalu `npm start`.
6. Buka URL frontend, lalu buat akun admin pertama di halaman setup. Setup otomatis ditutup setelah admin pertama dibuat.

Untuk GitHub OAuth, atur `GITHUB_CLIENT_ID` dan `GITHUB_CLIENT_SECRET`. Set callback URL OAuth menjadi `${APP_URL}/api/github/callback`.

Server Express menyajikan hasil build Vite dan API dari origin yang sama. Sesi disimpan di MySQL; tabel sesi dibuat otomatis saat server berjalan.

## Deploy Node.js
Gunakan hosting yang menjalankan proses Node.js persisten—bukan preset Static / Generic. Atur:
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Node.js: versi 20 atau lebih baru
- `NODE_ENV=production` dan `APP_URL` memakai HTTPS
- Environment variables: semua nilai produksi dari `.env.example`
- Document root/proxy: arahkan domain ke port proses Node yang dialokasikan platform

Jika hosting hanya mendukung file statis, aplikasi ini tidak dapat menjalankan autentikasi, API, atau MySQL di sana; deploy juga backend Node.js pada hosting yang mendukungnya. Jangan commit file `.env` atau `config/config.php`.

## Migrasi dari PHP lama
Skema `database/schema.sql` dan nama tabel tetap dipakai agar data akun, kategori, kredensial, audit, serta koneksi GitHub yang ada tetap kompatibel. `APP_KEY` harus tetap sama agar data AES-256-GCM yang sudah tersimpan dapat didekripsi. Jangan mengubah atau membuat `APP_KEY` baru sebelum seluruh data lama dienkripsi ulang.

## Role
- `admin`: semua fungsi termasuk pengguna, audit, hapus kredensial, serta operasi GitHub.
- `it`: CRUD kredensial, melihat dashboard, akses GitHub dan operasi repository.
- `viewer`: hanya melihat daftar dan detail kredensial; password rahasia tidak dapat dibuka.

## Keamanan
- Password kredensial dan token GitHub disimpan dengan AES-256-GCM; password akun memakai bcrypt.
- Simpan `APP_KEY`, `SESSION_SECRET`, kredensial DB, dan rahasia OAuth di environment server. Jangan masukkan rahasia ke Git atau chat.
- Gunakan HTTPS, batasi akses jaringan database, siapkan backup, dan rotasi rahasia yang pernah terunggah.
- OAuth GitHub menggunakan scope `repo`, yang memberi akses luas ke repository. Batasi aplikasi dan akun yang dihubungkan.
- Clone, pull, status, dan push berjalan di `REPO_WORKSPACE`. Push mengubah remote GitHub sungguhan; verifikasi branch dan perubahan sebelum mengeksekusinya.

## Verifikasi
- `npm test`
- `npm run build`
