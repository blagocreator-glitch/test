<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

require_once __DIR__ . '/../lib/room-repair-rules.php';

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
$scope = trim((string)($body['scope'] ?? $body['section'] ?? ''));
$label = trim((string)($body['label'] ?? ''));
$mode = trim((string)($body['mode'] ?? 'section'));
$mode = $mode === 'category' ? 'category' : 'section';

if ($scope === '' || $label === '') {
    respond(400, ['ok' => false, 'error' => 'scope_and_label_required']);
}

if (!in_array($scope, [
    'floor',
    'floorLeveling',
    'wall',
    'walls',
    'wallPlaster',
    'wallPutty',
    'wallWaterproof',
    'ceiling',
    'ceilingPrep',
    'demolition'
], true)) {
    respond(404, ['ok' => false, 'error' => 'scope_not_backend_controlled']);
}

$rule = roomRepairResolveRule($scope, $label, $mode);

respond(200, [
    'ok' => true,
    'scope' => $scope,
    'mode' => $mode,
    'label' => $label,
    'rule' => $rule,
]);
