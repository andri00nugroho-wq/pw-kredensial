<?php
require dirname(__DIR__,2).'/app/bootstrap.php'; require_role(['admin']);
$error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
 verify_csrf();$action=$_POST['action']??'';
 if($action==='create'){
  $name=trim($_POST['name']??'');$email=filter_var(trim($_POST['email']??''),FILTER_VALIDATE_EMAIL);$pass=(string)($_POST['password']??'');$role=$_POST['role']??'viewer';
  if(strlen($name)<2||!$email||strlen($pass)<12||!in_array($role,['admin','it','viewer'],true))$error='Periksa input. Password minimal 12 karakter.';
  else{try{$s=db()->prepare('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)');$s->execute([$name,$email,password_hash($pass,PASSWORD_DEFAULT),$role]);audit('create','user',(int)db()->lastInsertId(),'Pengguna baru');flash('Pengguna berhasil dibuat.');redirect('users/index.php');}catch(PDOException $e){$error='Email sudah digunakan atau data tidak valid.';}}
 }elseif($action==='toggle'){
  $id=(int)($_POST['id']??0);if($id!==(int)current_user()['id']){db()->prepare('UPDATE users SET is_active=1-is_active WHERE id=?')->execute([$id]);audit('toggle','user',$id,'Status akun diubah');flash('Status akun diperbarui.');redirect('users/index.php');}
 }
}
$users=db()->query('SELECT id,name,email,role,is_active,last_login_at,created_at FROM users ORDER BY created_at DESC')->fetchAll();
layout_header('Pengguna sistem');
?>
<div class="welcome-row"><div><p class="eyebrow">ACCESS CONTROL</p><h1>Pengguna sistem</h1><p class="muted">Buat akun dan tentukan hak akses minimum yang diperlukan.</p></div></div>
<?php if($error): ?><div class="alert error"><?=e($error)?></div><?php endif; ?>
<div class="dashboard-grid user-layout"><section class="panel"><div class="panel-heading"><div><h2>Daftar pengguna</h2><p><?=count($users)?> akun</p></div></div><div class="table-wrap"><table><thead><tr><th>Pengguna</th><th>Role</th><th>Status</th><th>Login terakhir</th><th>Aksi</th></tr></thead><tbody><?php foreach($users as $u): ?><tr><td><b><?=e($u['name'])?></b><small class="cell-sub"><?=e($u['email'])?></small></td><td><span class="tag"><?=e($u['role'])?></span></td><td><span class="status-dot <?=$u['is_active']?'active':'inactive'?>"><?=$u['is_active']?'Aktif':'Nonaktif'?></span></td><td><?=e($u['last_login_at']??'Belum login')?></td><td><?php if((int)$u['id']!==(int)current_user()['id']): ?><form method="post"><input type="hidden" name="_csrf" value="<?=e(csrf_token())?>"><input type="hidden" name="action" value="toggle"><input type="hidden" name="id" value="<?=$u['id']?>"><button class="btn btn-ghost btn-small"><?=$u['is_active']?'Nonaktifkan':'Aktifkan'?></button></form><?php else: ?>Anda<?php endif; ?></td></tr><?php endforeach; ?></tbody></table></div></section><aside class="panel"><div class="panel-heading"><div><h2>Tambah pengguna</h2><p>Semua password minimal 12 karakter</p></div></div><form method="post" class="form-stack"><input type="hidden" name="_csrf" value="<?=e(csrf_token())?>"><input type="hidden" name="action" value="create"><label>Nama<input name="name" required maxlength="120"></label><label>Email<input type="email" name="email" required maxlength="190"></label><label>Password<input type="password" name="password" required minlength="12" autocomplete="new-password"></label><label>Role<select name="role"><option value="viewer">Viewer — hanya lihat</option><option value="it">IT — kelola kredensial</option><option value="admin">Admin — semua akses</option></select></label><button class="btn btn-primary">Buat pengguna</button></form></aside></div>
<?php layout_footer(); ?>
