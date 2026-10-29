<?php
require dirname(__DIR__).'/app/bootstrap.php';
require_login();
$counts=[];
foreach (['credentials'=>'Kredensial','users'=>'Pengguna','categories'=>'Kategori'] as $table=>$label) {
    $counts[$table]=(int)db()->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
}
$recent=db()->query('SELECT c.id,c.title,c.service_type,c.url,c.updated_at,u.name AS owner FROM credentials c LEFT JOIN users u ON u.id=c.updated_by ORDER BY COALESCE(c.updated_at,c.created_at) DESC LIMIT 6')->fetchAll();
$github=db()->prepare('SELECT github_login FROM github_connections WHERE user_id=?'); $github->execute([current_user()['id']]); $gh=$github->fetchColumn();
layout_header('Dashboard');
?>
<div class="welcome-row"><div><p class="eyebrow">OVERVIEW</p><h1>Selamat datang, <?=e(current_user()['name'])?>.</h1><p class="muted">Kelola akses digital perusahaan dalam satu tempat yang terkontrol.</p></div><a class="btn btn-primary" href="<?=e(cfg('app_url'))?>/credentials/create.php">＋ Tambah kredensial</a></div>
<div class="stats-grid">
<div class="stat-card"><span class="stat-icon violet">▣</span><p>Total kredensial</p><strong><?=$counts['credentials']?></strong><small>Data akses tersimpan</small></div>
<div class="stat-card"><span class="stat-icon gold">♙</span><p>Pengguna sistem</p><strong><?=$counts['users']?></strong><small>Akun terdaftar</small></div>
<div class="stat-card"><span class="stat-icon blue">▤</span><p>Kategori</p><strong><?=$counts['categories']?></strong><small>Kelompok layanan</small></div>
<div class="stat-card"><span class="stat-icon green">⌘</span><p>GitHub</p><strong class="stat-word"><?= $gh ? 'Terhubung' : 'Belum' ?></strong><small><?= $gh ? '@'.e($gh) : 'Hubungkan repository' ?></small></div>
</div>
<div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h2>Kredensial terbaru</h2><p>Terakhir dibuat atau diperbarui</p></div><a class="text-link" href="<?=e(cfg('app_url'))?>/credentials/index.php">Lihat semua →</a></div>
<?php if(!$recent): ?><div class="empty-state"><span>▣</span><b>Belum ada kredensial</b><p>Tambahkan website atau aplikasi pertama.</p><a class="btn btn-secondary" href="<?=e(cfg('app_url'))?>/credentials/create.php">Tambah data</a></div>
<?php else: ?><div class="table-wrap"><table><thead><tr><th>Nama layanan</th><th>Tipe</th><th>URL</th><th>Terakhir diubah</th></tr></thead><tbody><?php foreach($recent as $r): ?><tr><td><a class="table-title" href="<?=e(cfg('app_url'))?>/credentials/view.php?id=<?=$r['id']?>"><?=e($r['title'])?></a></td><td><span class="tag"><?=e($r['service_type'])?></span></td><td><?php if($r['url']): ?><a class="truncate-link" target="_blank" rel="noopener noreferrer" href="<?=e($r['url'])?>"><?=e($r['url'])?></a><?php else: ?>—<?php endif; ?></td><td><?=e($r['updated_at']??'Baru dibuat')?></td></tr><?php endforeach; ?></tbody></table></div><?php endif; ?></section>
<aside class="panel quick-panel"><div class="panel-heading"><div><h2>Akses cepat</h2><p>Shortcut operasional</p></div></div><a class="quick-link" href="<?=e(cfg('app_url'))?>/credentials/index.php"><span class="quick-icon">▣</span><span><b>Brankas kredensial</b><small>Cari dan kelola akses</small></span><span>→</span></a><a class="quick-link" href="<?=e(cfg('app_url'))?>/github/index.php"><span class="quick-icon gold-bg">⌘</span><span><b>GitHub repository</b><small>Kelola koneksi dan sinkronisasi</small></span><span>→</span></a><?php if(current_user()['role']==='admin'): ?><a class="quick-link" href="<?=e(cfg('app_url'))?>/users/index.php"><span class="quick-icon">♙</span><span><b>Pengguna sistem</b><small>Atur role dan akses</small></span><span>→</span></a><?php endif; ?><div class="security-note"><b>◈ Tips keamanan</b><p>Jangan bagikan password melalui chat. Gunakan fitur salin hanya saat diperlukan dan logout setelah selesai.</p></div></aside></div>
<?php layout_footer(); ?>
