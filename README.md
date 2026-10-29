
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
