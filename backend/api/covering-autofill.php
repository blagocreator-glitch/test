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

function firstColorLabel(array $catalog, string $familyId): string {
    $family = $catalog['colorFamilies'][$familyId] ?? null;
    if (!is_array($family) || empty($family['colors'][0])) return '';
    $color = $family['colors'][0];
    $label = (string)($color['label'] ?? '');
    $code = (string)($color['code'] ?? '');
    return trim('Цвет: ' . $label . ($code !== '' ? ' · ' . $code : ''));
}

function floorSuggestions(array $catalog, string $cover, string $tier): array {
    $coverKey = floorCoverDetectKey($cover, 'quartz');
    $rules = $catalog['autofillRules'][$coverKey] ?? null;
    if (!is_array($rules)) return [];
    $fallbackTier = $tier === 'budget' ? 'comfort' : ($tier === 'business' ? 'comfort' : 'comfort');
    $suggestions = $rules[$tier] ?? $rules[$fallbackTier] ?? $rules['comfort'] ?? reset($rules);
    return is_array($suggestions) ? $suggestions : [];
}

function ceilingSuggestions(array $catalog, string $cover, string $tier): array {
    $coverKey = ceilingCoverDetectKey($cover, 'stretch');
    $rules = $catalog['autofillRules'][$coverKey] ?? null;
    if (!is_array($rules)) return [];
    $fallbackTier = $tier === 'budget' ? 'comfort' : ($tier === 'business' ? 'comfort' : 'comfort');
    $suggestions = $rules[$tier] ?? $rules[$fallbackTier] ?? $rules['comfort'] ?? $rules['business'] ?? $rules['premium'] ?? reset($rules);
    return is_array($suggestions) ? $suggestions : [];
}

function wallSuggestions(array $catalog, string $cover, string $tier): array {
    $coverKey = wallCoverDetectKey($cover, 'paint');
    $rules = $catalog['autofillRules'][$coverKey] ?? null;
    if (!is_array($rules)) return [];
    $fallbackTier = $tier === 'budget' ? 'comfort' : ($tier === 'business' ? 'comfort' : 'comfort');
    $suggestions = $rules[$tier] ?? $rules[$fallbackTier] ?? $rules['comfort'] ?? $rules['business'] ?? $rules['premium'] ?? reset($rules);
    return is_array($suggestions) ? $suggestions : [];
}

function floorSuggestionAllowed(array $catalog, array $suggestion, string $cover, array $selectedLabels): bool {
    $group = (string)($suggestion['group'] ?? '');
    $label = (string)($suggestion['label'] ?? '');
    if ($group === '' || $label === '') return false;
    $coverKey = floorCoverDetectKey($cover, 'quartz');
    $formatKey = floorCoverSelectedFormatKey($selectedLabels);
    foreach (($catalog['optionGroups'] ?? []) as $optionGroup) {
        if ((string)($optionGroup['group'] ?? '') !== $group) continue;
        foreach (($optionGroup['options'] ?? []) as $option) {
            if ((string)($option['label'] ?? '') !== $label) continue;
            return floorCoverOptionAllowed($option, $coverKey, $formatKey);
        }
    }
    return true;
}

function ceilingSuggestionAllowed(array $catalog, array $suggestion, string $cover, array $selectedLabels): bool {
    $group = (string)($suggestion['group'] ?? '');
    $label = (string)($suggestion['label'] ?? '');
    if ($group === '' || $label === '') return false;
    $coverKey = ceilingCoverDetectKey($cover, 'stretch');
    $formatKey = ceilingCoverSelectedFormatKey($selectedLabels);
    foreach (($catalog['optionGroups'] ?? []) as $optionGroup) {
        if ((string)($optionGroup['group'] ?? '') !== $group) continue;
        foreach (($optionGroup['options'] ?? []) as $option) {
            if ((string)($option['label'] ?? '') !== $label) continue;
            return ceilingCoverOptionAllowed($option, $coverKey, $formatKey);
        }
    }
    return true;
}

function wallSuggestionAllowed(array $catalog, array $suggestion, string $cover, array $selectedLabels): bool {
    $group = (string)($suggestion['group'] ?? '');
    $label = (string)($suggestion['label'] ?? '');
    if ($group === '' || $label === '') return false;
    $coverKey = wallCoverDetectKey($cover, 'paint');
    $formatKey = wallCoverSelectedFormatKey($selectedLabels);
    foreach (($catalog['optionGroups'] ?? []) as $optionGroup) {
        if ((string)($optionGroup['group'] ?? '') !== $group) continue;
        foreach (($optionGroup['options'] ?? []) as $option) {
            if ((string)($option['label'] ?? '') !== $label) continue;
            return wallCoverOptionAllowed($option, $coverKey, $formatKey);
        }
    }
    return true;
}

$body = readJsonBody();
$catalogKey = trim((string)($body['catalog'] ?? 'walls.decorative_plaster'));
$package = trim((string)($body['package'] ?? 'comfort'));
$cover = trim((string)($body['cover'] ?? ''));
$missing = $body['missing'] ?? [];
$selectedLabels = $body['selectedLabels'] ?? [];

if (!array_key_exists($catalogKey, $allowedCatalogs)) {
    respond(404, ['ok' => false, 'error' => 'catalog_not_found']);
}

$path = $allowedCatalogs[$catalogKey];
$catalog = json_decode(file_get_contents($path) ?: '', true);
if (!is_array($catalog)) {
    respond(500, ['ok' => false, 'error' => 'catalog_invalid_json']);
}

$tier = in_array($package, ['budget', 'comfort', 'business', 'premium'], true) ? $package : 'comfort';

$missingSet = [];
if (is_array($missing)) {
    foreach ($missing as $group) {
        $missingSet[(string)$group] = true;
    }
}

if ($catalogKey === 'floors.common') {
    $selectedLabelValues = is_array($selectedLabels) ? array_map('strval', $selectedLabels) : [];
    $suggestions = [];
    foreach (floorSuggestions($catalog, $cover, $tier) as $item) {
        $group = (string)($item['group'] ?? '');
        $label = (string)($item['label'] ?? '');
        if ($group === '' || $label === '') continue;
        if ($missingSet && !isset($missingSet[$group])) continue;
        if (!floorSuggestionAllowed($catalog, $item, $cover, $selectedLabelValues)) continue;
        $suggestions[] = [
            'group' => $group,
            'label' => $label,
            'source' => 'backend',
        ];
    }
    respond(200, [
        'ok' => true,
        'catalog' => $catalogKey,
        'package' => $tier,
        'suggestions' => $suggestions,
    ]);
}

if ($catalogKey === 'ceilings.common') {
    $selectedLabelValues = is_array($selectedLabels) ? array_map('strval', $selectedLabels) : [];
    $suggestions = [];
    foreach (ceilingSuggestions($catalog, $cover, $tier) as $item) {
        $group = (string)($item['group'] ?? '');
        $label = (string)($item['label'] ?? '');
        if ($group === '' || $label === '') continue;
        if ($missingSet && !isset($missingSet[$group])) continue;
        $suggestions[] = [
            'group' => $group,
            'label' => $label,
            'source' => 'backend',
        ];
    }
    respond(200, [
        'ok' => true,
        'catalog' => $catalogKey,
        'package' => $tier,
        'suggestions' => $suggestions,
    ]);
}

if ($catalogKey === 'walls.common') {
    $selectedLabelValues = is_array($selectedLabels) ? array_map('strval', $selectedLabels) : [];
    $suggestions = [];
    foreach (wallSuggestions($catalog, $cover, $tier) as $item) {
        $group = (string)($item['group'] ?? '');
        $label = (string)($item['label'] ?? '');
        if ($group === '' || $label === '') continue;
        if ($missingSet && !isset($missingSet[$group])) continue;
        if (!wallSuggestionAllowed($catalog, $item, $cover, $selectedLabelValues)) continue;
        $suggestions[] = [
            'group' => $group,
            'label' => $label,
            'source' => 'backend',
        ];
    }
    respond(200, [
        'ok' => true,
        'catalog' => $catalogKey,
        'package' => $tier,
        'suggestions' => $suggestions,
    ]);
}

$rule = $catalog['autofillRules'][$tier] ?? $catalog['autofillRules']['comfort'] ?? null;
if (!is_array($rule)) {
    respond(500, ['ok' => false, 'error' => 'autofill_rule_missing']);
}

$techniqueId = (string)($rule['technique'] ?? '');
$technique = null;
foreach (($catalog['techniques'] ?? []) as $item) {
    if (($item['id'] ?? '') === $techniqueId) {
        $technique = $item;
        break;
    }
}

$labels = [
    'Формат покрытия' => (string)($catalog['format']['label'] ?? ''),
    'Тип покрытия' => $technique ? 'Тип: ' . (string)($technique['label'] ?? '') : '',
    'Система / эффект' => (string)($catalog['systems'][$rule['system'] ?? ''] ?? ''),
    'Фактура' => (string)($catalog['textures'][$rule['texture'] ?? ''] ?? ''),
    'Защитный финиш' => (string)($catalog['finishes'][$rule['finish'] ?? ''] ?? ''),
    'Цветовая гамма' => firstColorLabel($catalog, (string)($rule['colorFamily'] ?? '')),
    'Способ монтажа / нанесения' => 'Нанесение декоративной техники',
];

$suggestions = [];
foreach ($labels as $group => $label) {
    if ($label === '') continue;
    if ($missingSet && !isset($missingSet[$group])) continue;
    $suggestions[] = [
        'group' => $group,
        'label' => $label,
        'source' => 'backend',
    ];
}

respond(200, [
    'ok' => true,
    'catalog' => $catalogKey,
    'package' => $tier,
    'suggestions' => $suggestions,
]);
