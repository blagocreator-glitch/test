<?php
declare(strict_types=1);

function floorCoverNormalizeLabel(string $value): string {
    $value = function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
    return str_replace('ё', 'е', trim($value));
}

function floorCoverDetectKey(string $cover, string $fallback = ''): string {
    $value = floorCoverNormalizeLabel($cover);
    if (preg_match('/кварц|spc|винил/iu', $value)) return 'quartz';
    if (preg_match('/керамогранит|керамическ|плитк/iu', $value)) return 'tile';
    if (preg_match('/пробк/iu', $value)) return 'cork';
    if (preg_match('/паркет|инженер/iu', $value)) return 'wood';
    if (preg_match('/линолеум/iu', $value)) return 'linoleum';
    if (preg_match('/налив/iu', $value)) return 'self_leveling';
    if (preg_match('/ламинат/iu', $value)) return 'laminate';
    return $fallback;
}

function floorCoverSelectedFormatKey(array $selected): string {
    $value = floorCoverNormalizeLabel(implode(' ', $selected));
    $map = [
        'cork_lock' => '/замков.*пробк|пробк.*замков/u',
        'cork_glue' => '/клеев.*пробк|пробк.*клеев/u',
        'tile_module' => '/плитк.*модул|модул.*плитк/u',
        'large_tile' => '/крупноформат/u',
        'figured' => '/фигур/u',
        'roll' => '/рулон/u',
        'polymer_floor' => '/полимер/u',
        'epoxy_floor' => '/эпоксид/u',
        'polyurethane_floor' => '/полиуретан/u',
        'quartz_floor' => '/кварцев/u',
        'decor_3d_floor' => '/3d|3д/u',
        'plank' => '/доск|планк/u',
    ];
    foreach ($map as $key => $pattern) {
        if (preg_match($pattern, $value)) return $key;
    }
    return '';
}

function floorCoverOptionAllowed(array $option, string $coverKey, string $formatKey): bool {
    $covers = $option['covers'] ?? [];
    if (is_array($covers) && $covers && !in_array($coverKey, $covers, true)) return false;
    $formats = $option['formats'] ?? [];
    if (is_array($formats) && $formats && $formatKey !== '' && !in_array($formatKey, $formats, true)) return false;
    return true;
}

function floorCoverRequiredGroups(array $catalog, string $cover, array $selectedLabels): array {
    $coverKey = floorCoverDetectKey($cover);
    if ($coverKey === '') return array_values(array_filter(array_map('strval', $catalog['requiredGroups'] ?? [])));
    $formatKey = floorCoverSelectedFormatKey($selectedLabels);
    $baseRequired = array_flip(array_values(array_filter(array_map('strval', $catalog['requiredGroups'] ?? []))));
    $groups = [];
    foreach (($catalog['optionGroups'] ?? []) as $group) {
        $label = trim((string)($group['group'] ?? ''));
        if ($label === '' || !isset($baseRequired[$label])) continue;
        foreach (($group['options'] ?? []) as $option) {
            if (floorCoverOptionAllowed($option, $coverKey, $formatKey)) {
                $groups[] = $label;
                break;
            }
        }
    }
    return $groups;
}
