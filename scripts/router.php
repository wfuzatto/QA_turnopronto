<?php
// Servidor local exclusivo do QA: entrega arquivos estaticos reais e roteia URLs da aplicacao.
$root = realpath(__DIR__ . '/../app-under-test');
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$target = realpath($root . $uri);
if ($target && is_file($target) && str_starts_with($target, $root . DIRECTORY_SEPARATOR)) {
    return false;
}
require $root . '/index.php';
