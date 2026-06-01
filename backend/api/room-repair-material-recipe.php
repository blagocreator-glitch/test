<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

require_once __DIR__ . '/../lib/room-repair-material-recipes.php';

function readJsonBody(): array {
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$body = readJsonBody();
$workIds = $body['workIds'] ?? [];
if (isset($body['workId'])) $workIds[] = $body['workId'];
if (!is_array($workIds)) $workIds = [];

$workIds = array_values(array_unique(array_filter(array_map(static fn($value) => trim((string)$value), $workIds))));
if (!$workIds) {
    respond(400, ['ok' => false, 'error' => 'work_id_required']);
}

$recipes = [];
foreach ($workIds as $workId) {
    $recipe = roomRepairMaterialRecipeForWork($workId);
    if ($recipe !== null) $recipes[$workId] = $recipe;
}

respond(200, [
    'ok' => true,
    'recipes' => $recipes,
]);
