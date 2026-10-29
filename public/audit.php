<?php
require dirname(__DIR__).'/app/bootstrap.php'; require_role(['admin']);
$rows=db()->query('SELECT a.*,u.name,u.email FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 250')->fetchAll();
layout_header('Audit log');
?>
<div class="welcome-row"><div><p class="eyebrow">SECURITY</p><h1>Audit log</h1><p class="muted">Riwayat login, perubahan data, dan pembukaan secret.</p></div></div><section class="panel"><div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Objek</th><th>IP</th><th>Detail</th></tr></thead><tbody><?php foreach($rows as $r): ?><tr><td><?=e($r['created_at'])?></td><td><?=e($r['name']??'System')?><small class="cell-sub"><?=e($r['email']??'')?></small></td><td><span class="tag"><?=e($r['action'])?></span></td><td><?=e($r['entity_type'])?> #<?=e($r['entity_id']??'—')?></td><td><?=e($r['ip_address']??'—')?></td><td><?=e($r['details']??'')?></td></tr><?php endforeach; ?></tbody></table></div></section>
<?php layout_footer(); ?>
