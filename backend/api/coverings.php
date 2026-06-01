<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, max-age=300');

$allowedCatalogs = [
    'walls.common' => __DIR__ . '/../data/coverings/walls/common.json',
    'walls.decorative_plaster' => __DIR__ . '/../data/coverings/walls/decorative-plaster.json',
    'floors.common' => __DIR__ . '/../data/coverings/floors/common.json',
    'ceilings.common' => __DIR__ . '/../data/coverings/ceilings/common.json',
];

$catalog = isset($_GET['catalog']) ? trim((string) $_GET['catalog']) : 'walls.decorative_plaster';

if (!array_key_exists($catalog, $allowedCatalogs)) {
    http_response_code(404);
    echo json_encode([
        'ok' => false,
        'error' => 'catalog_not_found',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$path = $allowedCatalogs[$catalog];
if (!is_file($path)) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'catalog_file_missing',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$raw = file_get_contents($path);
$data = json_decode($raw ?: '', true);
if (!is_array($data)) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'catalog_invalid_json',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

echo json_encode([
    'ok' => true,
    'catalog' => $catalog,
    'data' => $data,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
