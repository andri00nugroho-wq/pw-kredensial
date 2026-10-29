<?php
require dirname(__DIR__,2).'/app/bootstrap.php'; require_login();
$g=cfg('github');
if(empty($g['client_id'])||empty($g['client_secret'])){flash('Isi GitHub Client ID dan Client Secret di config/config.php.','error');redirect('github/index.php');}
$state=bin2hex(random_bytes(24));$_SESSION['github_oauth_state']=$state;
$params=http_build_query(['client_id'=>$g['client_id'],'redirect_uri'=>rtrim(cfg('app_url'),'/').'/github/callback.php','scope'=>$g['scope'],'state'=>$state]);
header('Location: https://github.com/login/oauth/authorize?'.$params);exit;
