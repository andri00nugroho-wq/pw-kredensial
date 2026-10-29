<?php
declare(strict_types=1);

return [
    'app_name' => 'Brankas Kredensial',
    'company_name' => 'IT RAJA EMAS INDONESIA',
    // Harus cocok dengan URL aplikasi yang diakses browser, tanpa slash akhir.
    'app_url' => 'http://localhost/brankas_kredensial/public',
    'timezone' => 'Asia/Jakarta',
    'session_name' => 'rei_vault_session',
    'db' => [
        'host' => '127.0.0.1',
        'port' => '3306',
        'name' => 'brankas_kredensial',
        'user' => 'pwit',
        'pass' => 'majuterusrajaemas123',
        'charset' => 'utf8mb4',
    ],
    // Generate: php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"
    'app_key' => 'GANTI_DENGAN_BASE64_KEY_RANDOM_32_BYTE',
    'github' => [
        'client_id' => '',
        'client_secret' => '',
        'scope' => 'read:user repo',
    ],
    'repo_workspace' => dirname(__DIR__) . '/storage/repos',
];
