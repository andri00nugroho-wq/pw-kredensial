<?php
require dirname(__DIR__).'/app/bootstrap.php';
if ((int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn()>0) { http_response_code(403); exit('Setup ditutup karena pengguna sudah ada. Hapus file setup.php.'); }
$error='';
if ($_SERVER['REQUEST_METHOD']==='POST') {
 verify_csrf(); $name=trim($_POST['name']??''); $email=filter_var(trim($_POST['email']??''),FILTER_VALIDATE_EMAIL); $pass=(string)($_POST['password']??'');
 if (strlen($name)<2 || !$email || strlen($pass)<12) $error='Isi nama dan email valid. Password minimal 12 karakter.';
 else { $q=db()->prepare('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)'); $q->execute([$name,$email,password_hash($pass,PASSWORD_DEFAULT),'admin']); echo 'Admin berhasil dibuat. Sekarang HAPUS public/setup.php, lalu buka login.php.'; exit; }
}
layout_header('Setup admin');
?>
<div class="login-card"><div class="login-brand"><img class="brand-mark large" style="width:112px;height:112px;object-fit:cover;border-radius:14px" src="<?=e(cfg('app_url'))?>/assets/IT-LOGO.png" alt="Logo IT Division"><h1>Buat admin pertama</h1><p class="muted">Halaman ini hanya aktif ketika database belum memiliki pengguna.</p></div><?php if($error): ?><div class="alert error"><?=e($error)?></div><?php endif; ?><form method="post" class="form-stack"><input type="hidden" name="_csrf" value="<?=e(csrf_token())?>"><label>Nama lengkap<input name="name" required maxlength="120"></label><label>Email<input type="email" name="email" required></label><label>Password (minimal 12 karakter)<input type="password" name="password" minlength="12" required></label><button class="btn btn-primary btn-block">Buat admin</button></form></div>
<?php layout_footer(); ?>
