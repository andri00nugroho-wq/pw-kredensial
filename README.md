
# Brankas Kredensial — IT RAJA EMAS INDONESIA

Aplikasi internal PHP Native 8.5 + MySQL dengan CSS responsif, role access control, enkripsi kredensial, audit log, dan integrasi GitHub OAuth/repository.

## Kebutuhan
- PHP 8.5 (ekstensi `pdo_mysql`, `openssl`, `curl`, `json`)
- MySQL 8+ / MariaDB yang kompatibel
- Apache (Laragon/XAMPP)
- Git CLI hanya diperlukan jika ingin menggunakan fitur sinkronisasi Git lokal

## Instalasi Laragon
1. Ekstrak folder `brankas_kredensial` ke `C:\laragon\www\brankas_kredensial`.
2. Buat database dengan mengimpor `database/schema.sql` melalui phpMyAdmin.
3. Salin `config/config.example.php` menjadi `config/config.php`.
4. Atur database, `APP_URL` (contoh `http://localhost/brankas_kredensial/public`), `APP_KEY`, dan kredensial GitHub.
5. Buat key enkripsi acak dengan PHP:
   `php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"`
   Masukkan hasilnya ke `APP_KEY`. Jangan commit `config/config.php`.
6. Buat GitHub OAuth App di GitHub Developer Settings. Set callback URL:
   `http://localhost/brankas_kredensial/public/github/callback.php`
   Isi `GITHUB_CLIENT_ID` dan `GITHUB_CLIENT_SECRET` di config.
7. Buka `http://localhost/brankas_kredensial/public/setup.php` satu kali untuk membuat admin awal. Hapus/rename `public/setup.php` setelah akun admin dibuat.
8. Login menggunakan email dan password admin yang dibuat di setup.

## Catatan URL
Untuk Laragon, Virtual Host lebih disarankan. Jika memakai URL `/public`, pastikan `APP_URL` sesuai persis. Idealnya document root diarahkan langsung ke folder `public/`.

## Deploy ke Plesk
1. Pilih runtime **PHP** (bukan Static / Generic) dan gunakan PHP 8.5 dengan ekstensi `pdo_mysql`, `openssl`, `curl`, dan `json`.
2. Deploy seluruh repository, lalu atur document root domain ke folder `public/`. Jangan arahkan document root ke root repository.
3. Buat database MySQL dan impor `database/schema.sql`.
4. Atur variabel lingkungan yang tercantum di `.env.example` melalui pengaturan deploy/PHP Plesk. Aplikasi juga membaca file `.env` di root repository bila platform menaruh variabel di sana. Buat `APP_KEY` acak 32 byte Base64; jangan memakai nilai contoh.
5. Isi `APP_URL` dengan URL HTTPS domain tanpa slash di akhir, serta kredensial database produksi. Pastikan folder `storage/repos` dapat ditulis oleh PHP jika fitur GitHub repository digunakan.
6. Setelah konfigurasi selesai, buka `/setup.php` untuk membuat admin awal, lalu hapus atau nonaktifkan `public/setup.php`.

Deployment sebagai Static / Generic tidak menjalankan PHP dan tidak dapat digunakan untuk aplikasi ini.

## Role
- `admin`: semua fungsi termasuk pengelolaan pengguna dan koneksi GitHub.
- `it`: CRUD kredensial, melihat dashboard, akses GitHub yang diizinkan.
- `viewer`: hanya melihat daftar kredensial; password rahasia tidak dapat dibuka.

## Keamanan penting
- Kredensial layanan dienkripsi dengan AES-256-GCM melalui OpenSSL. Simpan `APP_KEY` di luar repository/di environment secret dan buat backup aman.
- Password akun pengguna memakai `password_hash()` dan `password_verify()`.
- Semua form mutasi memakai CSRF token; query memakai PDO prepared statements.
- Untuk penggunaan produksi, wajib HTTPS, batasi akses jaringan, aktifkan backup, audit log, rate limiting, dan review keamanan. Jangan gunakan akun admin bersama.
- OAuth `repo` scope memberi izin luas pada repository. Gunakan hanya akun/organisasi yang berwenang dan batasi izin aplikasi sesuai kebutuhan.
- Fitur GitHub di versi ini menampilkan repository dan melakukan operasi Git lokal `clone`, `pull`, `status`, dan `push` pada folder workspace yang ditentukan. Push mengubah remote repository sungguhan; lakukan hanya setelah memastikan branch dan perubahan.
- Jangan simpan token GitHub plaintext di database. Token OAuth disimpan terenkripsi.
- Git command hanya boleh berjalan di folder `storage/repos` yang dikelola aplikasi. Untuk deployment multi-user/produksi, pisahkan worker dan sandbox proses Git.

## Fitur
- Dashboard ringkasan
- CRUD kredensial + pencarian/kategori
- Enkripsi/dekripsi password tersimpan
- Pengguna dan role (admin)
- Audit log
- GitHub OAuth, list repository, clone/pull/status/push
