<?php
require dirname(__DIR__,2).'/app/bootstrap.php'; require_login();
$state=$_GET['state']??'';
if(!$state || !hash_equals($_SESSION['github_oauth_state']??'',(string)$state)){http_response_code(400);exit('OAuth state tidak valid.');}
unset($_SESSION['github_oauth_state']);
$code=$_GET['code']??'';if(!$code){flash('Otorisasi GitHub dibatalkan.','error');redirect('github/index.php');}
$g=cfg('github');$ch=curl_init('https://github.com/login/oauth/access_token');
curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_HTTPHEADER=>['Accept: application/json','User-Agent: REI-Credential-Vault'],CURLOPT_POSTFIELDS=>http_build_query(['client_id'=>$g['client_id'],'client_secret'=>$g['client_secret'],'code'=>$code]),CURLOPT_TIMEOUT=>20]);
$raw=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);$tokenData=json_decode((string)$raw,true);
if($status!==200||empty($tokenData['access_token'])){flash('Gagal mendapatkan token GitHub. Periksa konfigurasi OAuth.','error');redirect('github/index.php');}
try {
 $token=$tokenData['access_token'];$ch=curl_init('https://api.github.com/user');curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_HTTPHEADER=>['Accept: application/vnd.github+json','Authorization: Bearer '.$token,'User-Agent: REI-Credential-Vault'],CURLOPT_TIMEOUT=>20]);$userRaw=curl_exec($ch);$userStatus=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);$gh=json_decode((string)$userRaw,true);
 if($userStatus!==200||empty($gh['login']))throw new RuntimeException('Profil GitHub tidak dapat dibaca.');
 $stmt=db()->prepare('INSERT INTO github_connections(user_id,github_user_id,github_login,access_token_ciphertext,scope_text) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE github_user_id=VALUES(github_user_id),github_login=VALUES(github_login),access_token_ciphertext=VALUES(access_token_ciphertext),scope_text=VALUES(scope_text)');
 $stmt->execute([current_user()['id'],$gh['id']??null,$gh['login'],encrypt_secret($token),$tokenData['scope']??($g['scope']??'')]);audit('connect','github',null,'GitHub account '.$gh['login']);flash('GitHub berhasil dihubungkan.');redirect('github/index.php');
} catch(Throwable $e){flash('Koneksi GitHub gagal: '.$e->getMessage(),'error');redirect('github/index.php');}
