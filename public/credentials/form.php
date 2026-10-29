<?php
require dirname(__DIR__,2).'/app/bootstrap.php'; require_role(['admin','it']);
$id=(int)($_GET['id']??0); $editing=$id>0; $row=['title'=>'','service_type'=>'website','url'=>'','username'=>'','email'=>'','notes'=>'','category_id'=>''];
if($editing){$st=db()->prepare('SELECT * FROM credentials WHERE id=?');$st->execute([$id]);$row=$st->fetch();if(!$row){http_response_code(404);exit('Data tidak ditemukan.');}}
$categories=db()->query('SELECT id,name FROM categories ORDER BY name')->fetchAll(); $error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
 verify_csrf();
 $title=trim($_POST['title']??''); $type=$_POST['service_type']??'website'; $url=trim($_POST['url']??''); $username=trim($_POST['username']??''); $email=trim($_POST['email']??''); $secret=(string)($_POST['password']??''); $notes=trim($_POST['notes']??''); $cat=(int)($_POST['category_id']??0);
 $types=['website','application','server','database','other'];
 if($title==='' || !in_array($type,$types,true)) $error='Nama layanan dan tipe wajib diisi.';
 elseif($url!=='' && !filter_var($url,FILTER_VALIDATE_URL)) $error='URL tidak valid. Gunakan https:// atau http://.';
 elseif($email!=='' && !filter_var($email,FILTER_VALIDATE_EMAIL)) $error='Format email tidak valid.';
 else {
   $oldCipher=$row['password_ciphertext']??null;
   $cipher=$secret!==''?encrypt_secret($secret):$oldCipher;
   if($editing){
     $st=db()->prepare('UPDATE credentials SET title=?,service_type=?,url=?,username=?,email=?,password_ciphertext=?,notes=?,category_id=?,updated_by=? WHERE id=?');
     $st->execute([$title,$type,$url?:null,$username?:null,$email?:null,$cipher,$notes?:null,$cat?:null,current_user()['id'],$id]); audit('update','credential',$id,'Data kredensial diperbarui');
   } else {
     $st=db()->prepare('INSERT INTO credentials(title,service_type,url,username,email,password_ciphertext,notes,category_id,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?)');
     $st->execute([$title,$type,$url?:null,$username?:null,$email?:null,$cipher,$notes?:null,$cat?:null,current_user()['id'],current_user()['id']]); $id=(int)db()->lastInsertId(); audit('create','credential',$id,'Kredensial baru dibuat');
   }
   flash('Kredensial berhasil '.($editing?'diperbarui.':'ditambahkan.')); redirect('credentials/view.php?id='.$id);
 }
 $row=array_merge($row,['title'=>$title,'service_type'=>$type,'url'=>$url,'username'=>$username,'email'=>$email,'notes'=>$notes,'category_id'=>$cat]);
}
layout_header($editing?'Edit kredensial':'Tambah kredensial');
?>
<div class="welcome-row"><div><p class="eyebrow">VAULT / FORM</p><h1><?=$editing?'Edit kredensial':'Tambah kredensial'?></h1><p class="muted">Password dienkripsi sebelum disimpan ke database.</p></div><a class="btn btn-ghost" href="<?=e(cfg('app_url'))?>/credentials/index.php">← Kembali</a></div>
<section class="panel form-panel"><?php if($error): ?><div class="alert error"><?=e($error)?></div><?php endif; ?><form method="post" class="form-grid"><input type="hidden" name="_csrf" value="<?=e(csrf_token())?>"><label class="span-2">Nama layanan *<input name="title" maxlength="160" required value="<?=e($row['title'])?>" placeholder="Contoh: Admin CMS Raja Emas"></label><label>Tipe layanan<select name="service_type"><?php foreach(['website'=>'Website','application'=>'Aplikasi','server'=>'Server','database'=>'Database','other'=>'Lainnya'] as $v=>$label): ?><option value="<?=$v?>" <?=$row['service_type']===$v?'selected':''?>><?=$label?></option><?php endforeach; ?></select></label><label>Kategori<select name="category_id"><option value="">Tanpa kategori</option><?php foreach($categories as $c): ?><option value="<?=$c['id']?>" <?=(string)$row['category_id']===(string)$c['id']?'selected':''?>><?=e($c['name'])?></option><?php endforeach; ?></select></label><label class="span-2">URL website / halaman aplikasi<input type="url" name="url" maxlength="2048" value="<?=e($row['url'])?>" placeholder="https://example.com"></label><label>Username<input name="username" maxlength="190" value="<?=e($row['username'])?>" autocomplete="off"></label><label>Email login<input type="email" name="email" maxlength="190" value="<?=e($row['email'])?>" autocomplete="off"></label><label class="span-2">Password layanan<div class="password-field"><input type="password" name="password" id="secret" autocomplete="new-password" <?=$editing?'':'required'?> placeholder="<?=$editing?'Kosongkan jika tidak ingin mengubah password':'Masukkan password layanan'?>"><button type="button" class="reveal-btn" data-toggle-password="secret">Lihat</button></div><small class="field-help">Password dienkripsi AES-256-GCM. Jangan gunakan password yang sama untuk banyak layanan.</small></label><label class="span-2">Catatan<textarea name="notes" rows="4" maxlength="5000" placeholder="Informasi tambahan, pemilik layanan, atau prosedur akses"><?=e($row['notes'])?></textarea></label><div class="form-actions span-2"><button class="btn btn-primary">Simpan kredensial</button><a class="btn btn-ghost" href="<?=e(cfg('app_url'))?>/credentials/index.php">Batal</a></div></form></section>
<?php layout_footer(); ?>
