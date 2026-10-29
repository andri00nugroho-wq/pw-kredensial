<?php
declare(strict_types=1);

$configFile = dirname(__DIR__) . '/config/config.php';
$projectRoot = dirname(__DIR__);
$envFile = $projectRoot . '/.env';
if (is_file($envFile)) {
    $envLines = file($envFile, FILE_IGNORE_NEW_LINES);
    if ($envLines === false) {
        http_response_code(500);
        exit('File .env tidak dapat dibaca.');
    }
    foreach ($envLines as $index => $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (!preg_match('/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/', $line, $matches)) {
            http_response_code(500);
            exit('Format .env tidak valid pada baris ' . ($index + 1) . '.');
        }
        $value = trim($matches[2]);
        if (strlen($value) >= 2 && ($value[0] === '"' || $value[0] === "'")) {
            if ($value[strlen($value) - 1] !== $value[0]) {
                http_response_code(500);
                exit('Format .env tidak valid pada baris ' . ($index + 1) . '.');
            }
            $value = substr($value, 1, -1);
        } else {
            $value = preg_replace('/\s+#.*$/', '', $value);
        }
        if (getenv($matches[1]) === false) {
            putenv($matches[1] . '=' . $value);
            $_ENV[$matches[1]] = $value;
        }
    }
}

$GLOBALS['config'] = is_file($configFile)
    ? require $configFile
    : require $projectRoot . '/config/config.example.php';
if (!is_array($GLOBALS['config'])) {
    http_response_code(500);
    exit('Konfigurasi aplikasi tidak valid.');
}
$envMap = [
    'APP_NAME' => 'app_name',
    'COMPANY_NAME' => 'company_name',
    'APP_URL' => 'app_url',
    'APP_TIMEZONE' => 'timezone',
    'SESSION_NAME' => 'session_name',
    'APP_KEY' => 'app_key',
    'GITHUB_CLIENT_ID' => 'client_id',
    'GITHUB_CLIENT_SECRET' => 'client_secret',
    'GITHUB_SCOPE' => 'scope',
    'REPO_WORKSPACE' => 'repo_workspace',
];
foreach ($envMap as $name => $key) {
    $value = getenv($name);
    if ($value === false) continue;
    if (in_array($key, ['client_id', 'client_secret', 'scope'], true)) {
        $GLOBALS['config']['github'][$key] = $value;
    } else {
        $GLOBALS['config'][$key] = $value;
    }
}
foreach (['DB_HOST' => 'host', 'DB_PORT' => 'port', 'DB_NAME' => 'name', 'DB_USER' => 'user', 'DB_PASS' => 'pass', 'DB_CHARSET' => 'charset'] as $name => $key) {
    $value = getenv($name);
    if ($value !== false) $GLOBALS['config']['db'][$key] = $value;
}
if (!is_file($configFile)) {
    foreach (['APP_URL', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'APP_KEY'] as $name) {
        if (getenv($name) === false) {
            http_response_code(500);
            exit('Konfigurasi deploy belum lengkap. Atur variabel di .env sesuai .env.example.');
        }
    }
    $decodedKey = base64_decode((string)$GLOBALS['config']['app_key'], true);
    if ($decodedKey === false || strlen($decodedKey) !== 32) {
        http_response_code(500);
        exit('APP_KEY harus berupa Base64 dari tepat 32 byte acak.');
    }
}
date_default_timezone_set($GLOBALS['config']['timezone'] ?? 'Asia/Jakarta');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name($GLOBALS['config']['session_name'] ?? 'rei_vault_session');
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params(['httponly'=>true,'secure'=>$secure,'samesite'=>'Lax','path'=>'/']);
    session_start();
}
require_once __DIR__ . '/functions.php';

try {
    $db = $GLOBALS['config']['db'];
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $db['host'], $db['port'], $db['name'], $db['charset']);
    $GLOBALS['pdo'] = new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    exit('Koneksi database gagal. Periksa config/config.php dan pastikan MySQL aktif.');
}
