<?php
require dirname(__DIR__).'/app/bootstrap.php';
if (current_user()) redirect('index.php');
$error='';
if ($_SERVER['REQUEST_METHOD']==='POST') {
    verify_csrf();
    $email=filter_var(trim($_POST['email']??''),FILTER_VALIDATE_EMAIL);
    $pass=(string)($_POST['password']??'');
    $stmt=db()->prepare('SELECT id,name,email,password,role,is_active FROM users WHERE email=? LIMIT 1'); $stmt->execute([$email?:'']); $user=$stmt->fetch();
    if ($user && $user['is_active'] && password_verify($pass,$user['password'])) {
        session_regenerate_id(true); unset($user['password']); $_SESSION['user']=$user;
        db()->prepare('UPDATE users SET last_login_at=NOW() WHERE id=?')->execute([$user['id']]);
        audit('login','user',(int)$user['id'],'Login berhasil'); redirect('index.php');
    }
    $error='Email atau password salah, atau akun tidak aktif.';
}
layout_header('Masuk');
?>
<div class="login-card"><div class="login-brand"><img class="brand-mark large" style="width:112px;height:112px;object-fit:cover;border-radius:14px" src="<?=e(cfg('app_url'))?>/assets/IT-LOGO.png" alt="Logo IT Division"><p class="eyebrow">IT RAJA EMAS INDONESIA</p><h1>Brankas Kredensial</h1><p class="muted">Satu tempat aman untuk mengelola akses digital tim.</p></div><?php if($error): ?><div class="alert error"><?=e($error)?></div><?php endif; ?><form method="post" class="form-stack"><input type="hidden" name="_csrf" value="<?=e(csrf_token())?>"><label>Email kantor<input type="email" name="email" autocomplete="username" required placeholder="nama@rajaemas.co.id"></label><label>Password<div class="password-field"><input type="password" name="password" id="password" autocomplete="current-password" required placeholder="Masukkan password"><button type="button" class="reveal-btn" data-toggle-password="password">Lihat</button></div></label><button class="btn btn-primary btn-block" type="submit">Masuk ke brankas <span>→</span></button></form><div class="login-foot"><span>◈ Enkripsi aktif</span><span>• Akses terbatas</span></div></div>
<?php layout_footer(); ?>
