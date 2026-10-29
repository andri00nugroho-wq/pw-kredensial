<?php
require dirname(__DIR__,2).'/app/bootstrap.php'; require_login();
$connected=db()->prepare('SELECT github_login,scope_text,updated_at FROM github_connections WHERE user_id=?');$connected->execute([current_user()['id']]);$gh=$connected->fetch();
$error='';$repos=[];
if($gh){try{$repos=github_api('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization');}catch(Throwable $e){$error=$e->getMessage();}}
if($_SERVER['REQUEST_METHOD']==='POST'){
 verify_csrf();$action=$_POST['action']??'';
 if($action==='disconnect'){db()->prepare('DELETE FROM github_connections WHERE user_id=?')->execute([current_user()['id']]);audit('disconnect','github');flash('Koneksi GitHub diputus.');redirect('github/index.php');}
 if(in_array($action,['clone','pull','status','push'],true)){
  require_role(['admin','it']);$full=trim($_POST['full_name']??'');$branch=trim($_POST['branch']??'main');
  if(!preg_match('~^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$~',$full)||!preg_match('/^[A-Za-z0-9._\\/-]{1,100}$/',$branch)||str_contains($branch,'..')){flash('Nama repository atau branch tidak valid.','error');redirect('github/index.php');}
  $workspace=realpath(cfg('repo_workspace')); if(!$workspace){@mkdir(cfg('repo_workspace'),0700,true);$workspace=realpath(cfg('repo_workspace'));}
  $repoPath=$workspace.DIRECTORY_SEPARATOR.str_replace('/','__',$full);
  $esc=fn($s)=>escapeshellarg($s);
  if(!function_exists('exec')){flash('Fungsi exec dinonaktifkan di PHP.','error');redirect('github/index.php');}
  if($action==='clone'){
   if(is_dir($repoPath)){flash('Workspace repository sudah ada. Gunakan Pull.','error');redirect('github/index.php');}
   // Clone using a temporary authenticated URL. Credential is not written to config/database as plaintext.
   $token=github_token();$url='https://x-access-token:'.rawurlencode((string)$token).'@github.com/'.$full.'.git';
   $cmd='git clone --branch '.$esc($branch).' --single-branch '.$esc($url).' '.$esc($repoPath).' 2>&1';
  } else {
   if(!is_dir($repoPath)||!is_file($repoPath.'/.git/config')){flash('Repository belum di-clone ke workspace.','error');redirect('github/index.php');}
   if($action==='pull') $cmd='git -C '.$esc($repoPath).' pull --ff-only origin '.$esc($branch).' 2>&1';
   elseif($action==='status') $cmd='git -C '.$esc($repoPath).' status --short --branch 2>&1';
   else $cmd='git -C '.$esc($repoPath).' push origin HEAD:'.$esc($branch).' 2>&1';
  }
  $out=[];$code=0;exec($cmd,$out,$code);$output=implode("\n",$out);
  // Strip credential from command output if a git error echoed it.
  if(isset($url))$output=str_replace($url,'https://github.com/'.$full.'.git',$output);
  audit('github_'.$action,'github',null,$full.' | exit '.$code);
  $_SESSION['git_result']=['code'=>$code,'output'=>mb_substr($output,0,5000),'repo'=>$full,'action'=>$action];
  redirect('github/index.php');
 }
}
$result=$_SESSION['git_result']??null;unset($_SESSION['git_result']);
layout_header('GitHub & repository');
?>
<div class="welcome-row"><div><p class="eyebrow">DEVELOPER WORKSPACE</p><h1>GitHub & repository</h1><p class="muted">Hubungkan GitHub, lihat repository, dan kelola sinkronisasi workspace lokal.</p></div></div>
<?php if($error): ?><div class="alert error"><?=e($error)?></div><?php endif; ?>
<?php if($result): ?><section class="panel result-panel"><div class="panel-heading"><div><h2>Hasil <?=e($result['action'])?> — <?=e($result['repo'])?></h2><p>Exit code: <?=e($result['code'])?></p></div><span class="tag"><?=$result['code']===0?'Berhasil':'Perlu diperiksa'?></span></div><pre class="terminal"><?=e($result['output'])?></pre></section><?php endif; ?>
<?php if(!$gh): ?><section class="github-hero"><div class="github-symbol">⌘</div><div><h2>Hubungkan GitHub</h2><p>OAuth digunakan untuk membaca daftar repository dan menjalankan operasi Git sesuai izin akun.</p><small>Scope konfigurasi: <?=e(cfg('github')['scope']??'read:user repo')?></small></div><a class="btn btn-primary" href="<?=e(cfg('app_url'))?>/github/connect.php">Hubungkan akun →</a></section>
<?php else: ?><section class="github-hero connected"><div class="github-symbol">✓</div><div><h2>Terhubung sebagai @<?=e($gh['github_login'])?></h2><p>OAuth tersimpan terenkripsi untuk akun pengguna saat ini.</p><small>Scope: <?=e($gh['scope_text']??'Tidak tersedia')?> · Update <?=e($gh['updated_at'])?></small></div><form method="post"><input type="hidden" name="_csrf" value="<?=e(csrf_token())?>"><input type="hidden" name="action" value="disconnect"><button class="btn btn-ghost">Putuskan</button></form></section>
<section class="panel"><div class="panel-heading"><div><h2>Repository yang dapat diakses</h2><p><?=count($repos)?> repository ditampilkan (maksimal 100)</p></div></div><?php if(!$repos): ?><div class="empty-state"><p>Tidak ada repository atau akun tidak memiliki akses.</p></div><?php else: ?><div class="repo-grid"><?php foreach($repos as $repo): ?><article class="repo-card"><div class="repo-top"><span class="repo-icon">⌘</span><span class="tag"><?=!empty($repo['private'])?'Private':'Public'?></span></div><h3><?=e($repo['full_name'])?></h3><p><?=e($repo['description']??'Tidak ada deskripsi.')?></p><div class="repo-meta"><span>⑂ <?=e($repo['default_branch']??'main')?></span><span>★ <?=e($repo['stargazers_count']??0)?></span><span>Update <?=e(substr($repo['updated_at']??'',0,10))?></span></div><a class="text-link" target="_blank" rel="noopener noreferrer" href="<?=e($repo['html_url'])?>">Buka di GitHub ↗</a><?php if(can_edit()): ?><details class="repo-actions"><summary>Sinkronisasi lokal</summary><form method="post" class="form-stack"><input type="hidden" name="_csrf" value="<?=e(csrf_token())?>"><input type="hidden" name="full_name" value="<?=e($repo['full_name'])?>"><label>Branch<input name="branch" value="<?=e($repo['default_branch']??'main')?>" required></label><div class="button-row wrap"><button name="action" value="clone" class="btn btn-secondary btn-small">Clone</button><button name="action" value="pull" class="btn btn-ghost btn-small">Pull</button><button name="action" value="status" class="btn btn-ghost btn-small">Status</button><button name="action" value="push" class="btn btn-danger btn-small" onclick="return confirm('Push akan mengirim commit lokal ke GitHub. Lanjutkan hanya jika Anda memahami perubahan ini.')">Push</button></div><small class="field-help">Clone/pull/status/push berjalan pada storage/repos. Push menulis ke remote.</small></form></details><?php endif; ?></article><?php endforeach; ?></div><?php endif; ?></section><?php endif; ?>
<?php layout_footer(); ?>
