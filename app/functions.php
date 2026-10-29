<?php
declare(strict_types=1);

function cfg(?string $key = null): mixed {
    $c = $GLOBALS['config'];
    return $key === null ? $c : ($c[$key] ?? null);
}
function db(): PDO { return $GLOBALS['pdo']; }
function e(mixed $value): string { return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function redirect(string $path): never { header('Location: ' . rtrim(cfg('app_url'), '/') . '/' . ltrim($path, '/')); exit; }
function current_user(): ?array { return $_SESSION['user'] ?? null; }
function require_login(): void { if (!current_user()) redirect('login.php'); }
function require_role(array $roles): void {
    require_login();
    if (!in_array(current_user()['role'], $roles, true)) { http_response_code(403); exit('403 — Anda tidak memiliki izin.'); }
}
function can_edit(): bool { return in_array(current_user()['role'] ?? '', ['admin','it'], true); }
function csrf_token(): string {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}
function verify_csrf(): void {
    $token = $_POST['_csrf'] ?? '';
    if (!is_string($token) || !hash_equals($_SESSION['csrf'] ?? '', $token)) {
        http_response_code(419); exit('Token keamanan tidak valid. Muat ulang halaman dan coba lagi.');
    }
}
function flash(string $message, string $type='success'): void { $_SESSION['flash'] = ['message'=>$message,'type'=>$type]; }
function consume_flash(): ?array { $f=$_SESSION['flash']??null; unset($_SESSION['flash']); return $f; }
function audit(string $action, string $entity, ?int $id=null, string $details=''): void {
    $stmt=db()->prepare('INSERT INTO audit_logs(user_id,action,entity_type,entity_id,ip_address,details) VALUES(?,?,?,?,?,?)');
    $stmt->execute([current_user()['id']??null,$action,$entity,$id,$_SERVER['REMOTE_ADDR']??null,mb_substr($details,0,500)]);
}
function encryption_key(): string {
    $key = base64_decode((string)cfg('app_key'), true);
    if ($key === false || strlen($key) !== 32) throw new RuntimeException('APP_KEY harus berupa Base64 dari tepat 32 byte acak.');
    return $key;
}
function encrypt_secret(?string $plain): ?string {
    if ($plain === null || $plain === '') return null;
    $iv=random_bytes(12); $tag='';
    $cipher=openssl_encrypt($plain,'aes-256-gcm',encryption_key(),OPENSSL_RAW_DATA,$iv,$tag);
    if ($cipher === false) throw new RuntimeException('Enkripsi gagal.');
    return base64_encode($iv.$tag.$cipher);
}
function decrypt_secret(?string $payload): string {
    if (!$payload) return '';
    $raw=base64_decode($payload,true);
    if ($raw===false || strlen($raw)<28) return '';
    $plain=openssl_decrypt(substr($raw,28),'aes-256-gcm',encryption_key(),OPENSSL_RAW_DATA,substr($raw,0,12),substr($raw,12,16));
    return $plain===false ? '' : $plain;
}
function github_api(string $path, string $method='GET', ?array $body=null): array {
    $token = github_token();
    if (!$token) throw new RuntimeException('Hubungkan GitHub terlebih dahulu.');
    $ch=curl_init('https://api.github.com'. $path);
    $headers=['Accept: application/vnd.github+json','Authorization: Bearer '.$token,'X-GitHub-Api-Version: 2022-11-28','User-Agent: REI-Credential-Vault'];
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers,CURLOPT_TIMEOUT=>25]);
    if ($body !== null) { $headers[]='Content-Type: application/json'; curl_setopt($ch,CURLOPT_HTTPHEADER,$headers); curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode($body)); }
    $response=curl_exec($ch); $status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE); $err=curl_error($ch); curl_close($ch);
    if ($response===false) throw new RuntimeException('GitHub API gagal: '.$err);
    $data=json_decode($response,true);
    if ($status<200 || $status>=300) throw new RuntimeException('GitHub API HTTP '.$status.': '.(is_array($data)?($data['message']??'Request gagal'):'Request gagal'));
    return is_array($data)?$data:[];
}
function github_token(): ?string {
    if (!current_user()) return null;
    $q=db()->prepare('SELECT access_token_ciphertext FROM github_connections WHERE user_id=?');
    $q->execute([current_user()['id']]); $row=$q->fetch();
    return $row ? decrypt_secret($row['access_token_ciphertext']) : null;
}
function layout_header(string $title): void {
    $flash=consume_flash(); $u=current_user(); $app=rtrim(cfg('app_url'),'/');
    echo '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'.e($title).' · '.e(cfg('app_name')).'</title><link rel="stylesheet" href="'.$app.'/assets/css/app.css"></head><body>';
    if ($u) {
        echo '<aside class="sidebar"><a class="brand" href="'.$app.'/index.php"><img class="brand-mark" style="object-fit:cover;border-radius:10px" src="'.$app.'/assets/IT-LOGO.png" alt="Logo IT Division"><span><b>Brankas</b><small>IT RAJA EMAS INDONESIA</small></span></a><nav><a href="'.$app.'/index.php">▦ <span>Dashboard</span></a><a href="'.$app.'/credentials/index.php">▣ <span>Kredensial</span></a><a href="'.$app.'/github/index.php">⌘ <span>GitHub & Repo</span></a>';
        if ($u['role']==='admin') echo '<a href="'.$app.'/users/index.php">♙ <span>Pengguna</span></a><a href="'.$app.'/audit.php">◷ <span>Audit Log</span></a>';
        echo '</nav><div class="sidebar-bottom"><span class="avatar">'.e(strtoupper(substr($u['name'],0,1))).'</span><span><b>'.e($u['name']).'</b><small>'.e(strtoupper($u['role'])).'</small></span><a class="logout" href="'.$app.'/logout.php" title="Keluar">↗</a></div></aside><main class="main"><header class="topbar"><button class="menu-toggle" onclick="document.body.classList.toggle(\'nav-open\')" aria-label="Buka navigasi">☰</button><div><b>'.e($title).'</b><small>Ruang kerja internal · Aman dan terkontrol</small></div><span class="secure-pill">● Brankas aktif</span></header><section class="content">';
    } else echo '<main class="auth-shell">';
    if ($flash) echo '<div class="alert '.e($flash['type']).'">'.e($flash['message']).'</div>';
}
function layout_footer(): void {
    if (current_user()) echo '</section><footer class="footer">© '.date('Y').' IT RAJA EMAS INDONESIA <span>Brankas Kredensial · Akses terbatas</span></footer>';
    else echo '</main>';
    echo '<script src="'.rtrim(cfg('app_url'),'/').'/assets/js/app.js"></script></body></html>';
}
