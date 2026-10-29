<?php
require dirname(__DIR__,2).'/app/bootstrap.php'; require_login();
$q=trim($_GET['q']??''); $type=$_GET['type']??'';
$sql='SELECT c.id,c.title,c.service_type,c.url,c.username,c.email,c.created_at,c.updated_at,cat.name category FROM credentials c LEFT JOIN categories cat ON cat.id=c.category_id WHERE (c.title LIKE ? OR c.url LIKE ? OR c.username LIKE ? OR c.email LIKE ?)';
$args=array_fill(0,4,'%'.$q.'%');
$allowed=['website','application','server','database','other'];
if(in_array($type,$allowed,true)){ $sql.=' AND c.service_type=?'; $args[]=$type; }
$sql.=' ORDER BY c.title ASC LIMIT 300'; $st=db()->prepare($sql); $st->execute($args); $rows=$st->fetchAll();
layout_header('Kredensial');
?>
<div class="welcome-row"><div><p class="eyebrow">VAULT</p><h1>Brankas kredensial</h1><p class="muted">Kelola login website, aplikasi, server, dan layanan.</p></div><?php if(can_edit()): ?><a class="btn btn-primary" href="<?=e(cfg('app_url'))?>/credentials/create.php">＋ Tambah kredensial</a><?php endif; ?></div>
<section class="panel"><form class="filters" method="get"><input name="q" value="<?=e($q)?>" placeholder="Cari nama, URL, username, email…"><select name="type"><option value="">Semua tipe</option><?php foreach($allowed as $t): ?><option value="<?=e($t)?>" <?=$type===$t?'selected':''?>><?=e(ucfirst($t))?></option><?php endforeach; ?></select><button class="btn btn-secondary">Cari</button><a class="btn btn-ghost" href="<?=e(cfg('app_url'))?>/credentials/index.php">Reset</a></form><div class="table-wrap"><table><thead><tr><th>Layanan</th><th>Tipe</th><th>Username / Email</th><th>Kategori</th><th>Aksi</th></tr></thead><tbody><?php foreach($rows as $r): ?><tr><td><a class="table-title" href="<?=e(cfg('app_url'))?>/credentials/view.php?id=<?=$r['id']?>"><?=e($r['title'])?></a><small class="cell-sub"><?=e($r['url']??'URL belum diisi')?></small></td><td><span class="tag"><?=e($r['service_type'])?></span></td><td><?=e($r['username']?:$r['email']?:'—')?></td><td><?=e($r['category']??'Tanpa kategori')?></td><td class="actions"><a class="text-link" href="<?=e(cfg('app_url'))?>/credentials/view.php?id=<?=$r['id']?>">Detail</a><?php if(can_edit()): ?> <a class="text-link" href="<?=e(cfg('app_url'))?>/credentials/edit.php?id=<?=$r['id']?>">Edit</a><?php endif; ?></td></tr><?php endforeach; if(!$rows): ?><tr><td colspan="5" class="muted center">Tidak ada data yang cocok.</td></tr><?php endif; ?></tbody></table></div><p class="table-foot"><?=$count=count($rows)?> data ditampilkan (maksimal 300 hasil).</p></section>
<?php layout_footer(); ?>
