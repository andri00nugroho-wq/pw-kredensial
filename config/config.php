<?php
declare(strict_types=1);

return [
    'app_name' => 'Brankas Kredensial',
    'company_name' => 'IT RAJA EMAS INDONESIA',
    'app_url' => 'http://localhost/brankas_kredensial/public',
    'timezone' => 'Asia/Jakarta',
    'session_name' => 'rei_vault_session',
    'db' => [
        'host' => '127.0.0.1',
        'port' => '3306',
        'name' => 'pwit',
        'user' => 'brankas_kredensial',
        'pass' => 'majuterusrajaemas123',
        'charset' => 'utf8mb4',
    ],
    // Generate: php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"
    'app_key' => 'T7N1ekQ8rkqv8maGwqyDxG6VlbCCIbqZIi3xEix3dIk=',
    'github' => [
        'client_id' => '',
        'client_secret' => '',
        'scope' => 'read:user repo',
    ],
    'repo_workspace' => dirname(__DIR__) . '/storage/repos',
];
