<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

require_once __DIR__ . '/../lib/covering-floor.php';
require_once __DIR__ . '/../lib/covering-ceiling.php';
require_once __DIR__ . '/../lib/covering-wall.php';

$allowedCatalogs = [
    'walls.common' => __DIR__ . '/../data/coverings/walls/common.json',
    'walls.decorative_plaster' => __DIR__ . '/../data/coverings/walls/decorative-plaster.json',
    'floors.common' => __DIR__ . '/../data/coverings/floors/common.json',
    'ceilings.common' => __DIR__ . '/../data/coverings/ceilings/common.json',
];

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
$catalogKey = trim((string)($body['catalog'] ?? 'walls.decorative_plaster'));
$cover = trim((string)($body['cover'] ?? ''));
$selectedGroups = $body['selectedGroups'] ?? [];
$selectedLabels = $body['selectedLabels'] ?? [];

if (!array_key_exists($catalogKey, $allowedCatalogs)) {
    respond(404, ['ok' => false, 'error' => 'catalog_not_found']);
}

$catalog = json_decode(file_get_contents($allowedCatalogs[$catalogKey]) ?: '', true);
if (!is_array($catalog)) {
    respond(500, ['ok' => false, 'error' => 'catalog_invalid_json']);
}

$selectedSet = [];
if (is_array($selectedGroups)) {
    foreach ($selectedGroups as $group) {
        $label = trim((string)$group);
        if ($label !== '') $selectedSet[$label] = true;
    }
}

$selectedLabelValues = is_array($selectedLabels) ? array_map('strval', $selectedLabels) : [];
$requiredGroups = $catalogKey === 'floors.common'
    ? floorCoverRequiredGroups($catalog, $cover, $selectedLabelValues)
    : ($catalogKey === 'ceilings.common'
        ? ceilingCoverRequiredGroups($catalog, $cover, $selectedLabelValues)
        : ($catalogKey === 'walls.common'
            ? wallCoverRequiredGroups($catalog, $cover, $selectedLabelValues)
            : array_values(array_filter(array_map(fn($group) => trim((string)$group), $catalog['requiredGroups'] ?? [])))));

$missing = [];
foreach ($requiredGroups as $group) {
    if (!isset($selectedSet[$group])) $missing[] = $group;
}

$total = count($requiredGroups);
$filled = max(0, $total - count($missing));
$percent = $total > 0 ? (int)round(($filled / $total) * 100) : 100;

respond(200, [
    'ok' => true,
    'catalog' => $catalogKey,
    'requiredGroups' => $requiredGroups,
    'missing' => $missing,
    'filled' => $filled,
    'total' => $total,
    'percent' => $percent,
    'status' => $total === 0 ? 'ready' : ($percent >= 100 ? 'ready' : ($percent > 0 ? 'partial' : 'empty')),
]);
