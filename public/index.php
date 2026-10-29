
<?php

declare(strict_types=1);

/**
 * Dashboard Brankas Kredensial
 * PHP Native 8.5
 *
 * File: public/index.php
 * Bootstrap: app/bootstrap.php
 */

require_once dirname(__DIR__) . '/app/bootstrap.php';

require_login();

/**
 * Ambil data pengguna yang sedang login.
 */
$user = current_user();

if (!$user || !isset($user['id'])) {
    header('Location: ' . rtrim((string) cfg('app_url'), '/') . '/login.php');
    exit;
}

/**
 * Escape output untuk mencegah XSS.
 */
if (!function_exists('dashboard_escape')) {
    function dashboard_escape(mixed $value): string
    {
        return htmlspecialchars(
            (string) ($value ?? ''),
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8'
        );
    }
}

/**
 * Membuat URL aplikasi secara konsisten.
 */
$appUrl = rtrim((string) cfg('app_url'), '/');

if ($appUrl === '') {
    throw new RuntimeException(
        'APP_URL belum dikonfigurasi. Periksa konfigurasi aplikasi.'
    );
}

/**
 * Mengambil jumlah data.
 */
$counts = [
    'credentials' => 0,
    'users'       => 0,
    'categories'  => 0,
];

try {
    $pdo = db();

    foreach (array_keys($counts) as $table) {
        // Nama tabel berasal dari daftar tetap, bukan input pengguna.
        $stmt = $pdo->query(
            "SELECT COUNT(*) FROM `{$table}`"
        );

        $counts[$table] = (int) $stmt->fetchColumn();
    }

    /**
     * Kredensial terbaru.
     */
    $recentQuery = $pdo->query(
        'SELECT
            c.id,
            c.title,
            c.service_type,
            c.url,
            c.updated_at,
            c.created_at,
            u.name AS owner
        FROM credentials c
        LEFT JOIN users u ON u.id = c.updated_by
        ORDER BY
            COALESCE(c.updated_at, c.created_at) DESC,
            c.id DESC
        LIMIT 6'
    );

    $recent = $recentQuery->fetchAll(PDO::FETCH_ASSOC);

    /**
     * Koneksi GitHub milik pengguna.
     */
    $githubQuery = $pdo->prepare(
        'SELECT github_login
         FROM github_connections
         WHERE user_id = ?
         LIMIT 1'
    );

    $githubQuery->execute([(int) $user['id']]);
    $githubLogin = $githubQuery->fetchColumn();

    $githubConnected = is_string($githubLogin)
        && $githubLogin !== '';

} catch (Throwable $exception) {
    // Detail kesalahan disimpan di log server, bukan ditampilkan ke browser.
    error_log(
        '[PW-KREDENSIAL DASHBOARD] ' .
        $exception->getMessage()
    );

    http_response_code(500);

    exit(
        'Dashboard tidak dapat memuat data. ' .
        'Periksa konfigurasi database dan log server.'
    );
}

/**
 * Format tanggal.
 */
$formatDate = static function (?string $date): string {
    if (!$date) {
        return 'Baru dibuat';
    }

    try {
        return (new DateTimeImmutable($date))
            ->format('d M Y, H:i');
    } catch (Throwable) {
        return $date;
    }
};

$isAdmin = ($user['role'] ?? '') === 'admin';

/**
 * Header layout aplikasi.
 */
layout_header('Dashboard');

?>

<main class="dashboard-container">

    <!-- Welcome -->
    <section class="welcome-row">
        <div>
            <p class="eyebrow">OVERVIEW</p>

            <h1>
                Selamat datang,
                <?= dashboard_escape($user['name'] ?? 'Pengguna') ?>.
            </h1>

            <p class="muted">
                Kelola akses digital perusahaan dalam satu tempat
                yang terkontrol.
            </p>
        </div>

        <a
            class="btn btn-primary"
            href="<?= dashboard_escape($appUrl) ?>/credentials/create.php"
        >
            + Tambah kredensial
        </a>
    </section>


    <!-- Statistik -->
    <section class="stats-grid">

        <article class="stat-card">
            <span class="stat-icon violet">▣</span>
            <p>Total kredensial</p>
            <strong><?= $counts['credentials'] ?></strong>
            <small>Data akses tersimpan</small>
        </article>

        <article class="stat-card">
            <span class="stat-icon gold">♙</span>
            <p>Pengguna sistem</p>
            <strong><?= $counts['users'] ?></strong>
            <small>Akun terdaftar</small>
        </article>

        <article class="stat-card">
            <span class="stat-icon blue">▤</span>
            <p>Kategori</p>
            <strong><?= $counts['categories'] ?></strong>
            <small>Kelompok layanan</small>
        </article>

        <article class="stat-card">
            <span class="stat-icon green">⌘</span>
            <p>GitHub</p>

            <strong class="stat-word">
                <?= $githubConnected ? 'Terhubung' : 'Belum' ?>
            </strong>

            <small>
                <?php if ($githubConnected): ?>
                    @<?= dashboard_escape($githubLogin) ?>
                <?php else: ?>
                    Hubungkan repository
                <?php endif; ?>
            </small>
        </article>

    </section>


    <!-- Konten dashboard -->
    <section class="dashboard-grid">

        <!-- Kredensial terbaru -->
        <section class="panel">

            <div class="panel-heading">
                <div>
                    <h2>Kredensial terbaru</h2>
                    <p>Terakhir dibuat atau diperbarui</p>
                </div>

                <a
                    class="text-link"
                    href="<?= dashboard_escape($appUrl) ?>/credentials/index.php"
                >
                    Lihat semua →
                </a>
            </div>

            <?php if (empty($recent)): ?>

                <div class="empty-state">
                    <span>▣</span>
                    <b>Belum ada kredensial</b>

                    <p>
                        Tambahkan website atau aplikasi pertama
                        ke dalam brankas.
                    </p>

                    <a
                        class="btn btn-secondary"
                        href="<?= dashboard_escape($appUrl) ?>/credentials/create.php"
                    >
                        Tambah data
                    </a>
                </div>

            <?php else: ?>

                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Nama layanan</th>
                                <th>Tipe</th>
                                <th>URL</th>
                                <th>Terakhir diubah</th>
                            </tr>
                        </thead>

                        <tbody>

                            <?php foreach ($recent as $item): ?>

                                <tr>
                                    <td>
                                        <a
                                            class="table-title"
                                            href="<?= dashboard_escape($appUrl) ?>/credentials/view.php?id=<?= (int) $item['id'] ?>"
                                        >
                                            <?= dashboard_escape($item['title']) ?>
                                        </a>
                                    </td>

                                    <td>
                                        <span class="tag">
                                            <?= dashboard_escape($item['service_type']) ?>
                                        </span>
                                    </td>

                                    <td>
                                        <?php
                                        $serviceUrl = trim(
                                            (string) ($item['url'] ?? '')
                                        );

                                        $parsedUrl = $serviceUrl !== ''
                                            ? parse_url($serviceUrl)
                                            : false;

                                        $validUrl = is_array($parsedUrl)
                                            && isset($parsedUrl['scheme'])
                                            && in_array(
                                                strtolower($parsedUrl['scheme']),
                                                ['http', 'https'],
                                                true
                                            )
                                            && isset($parsedUrl['host']);
                                        ?>

                                        <?php if ($validUrl): ?>

                                            <a
                                                class="truncate-link"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                href="<?= dashboard_escape($serviceUrl) ?>"
                                            >
                                                <?= dashboard_escape($serviceUrl) ?>
                                            </a>

                                        <?php elseif ($serviceUrl !== ''): ?>

                                            <?= dashboard_escape($serviceUrl) ?>

                                        <?php else: ?>

                                            &mdash;

                                        <?php endif; ?>
                                    </td>

                                    <td>
                                        <?= dashboard_escape(
                                            $formatDate(
                                                $item['updated_at']
                                                    ?: $item['created_at']
                                            )
                                        ) ?>
                                    </td>
                                </tr>

                            <?php endforeach; ?>

                        </tbody>
                    </table>
                </div>

            <?php endif; ?>

        </section>


        <!-- Akses cepat -->
        <aside class="panel quick-panel">

            <div class="panel-heading">
                <div>
                    <h2>Akses cepat</h2>
                    <p>Shortcut operasional</p>
                </div>
            </div>

            <a
                class="quick-link"
                href="<?= dashboard_escape($appUrl) ?>/credentials/index.php"
            >
                <span class="quick-icon">▣</span>

                <span>
                    <b>Brankas kredensial</b>
                    <small>Cari dan kelola akses</small>
                </span>

                <span>→</span>
            </a>


            <a
                class="quick-link"
                href="<?= dashboard_escape($appUrl) ?>/github/index.php"
            >
                <span class="quick-icon gold-bg">⌘</span>

                <span>
                    <b>GitHub repository</b>
                    <small>Kelola koneksi dan sinkronisasi</small>
                </span>

                <span>→</span>
            </a>


            <?php if ($isAdmin): ?>

                <a
                    class="quick-link"
                    href="<?= dashboard_escape($appUrl) ?>/users/index.php"
                >
                    <span class="quick-icon">♙</span>

                    <span>
                        <b>Pengguna sistem</b>
                        <small>Atur role dan akses</small>
                    </span>

                    <span>→</span>
                </a>

            <?php endif; ?>


            <div class="security-note">
                <b>◈ Tips keamanan</b>

                <p>
                    Jangan bagikan password melalui chat.
                    Salin kredensial hanya saat diperlukan,
                    jangan tampilkan rahasia di layar publik,
                    dan logout setelah selesai.
                </p>
            </div>

        </aside>

    </section>

</main>

<?php

layout_footer();
