<?php
declare(strict_types=1);

function wallCoverNormalizeLabel(string $value): string {
    $value = function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
    return str_replace('ё', 'е', trim($value));
}

function wallCoverDetectKey(string $cover, string $fallback = ''): string {
    $value = wallCoverNormalizeLabel($cover);
    if (preg_match('/штукатур|венециан/iu', $value)) return 'decorative_plaster';
    if (preg_match('/микроцемент/iu', $value)) return 'microcement';
    if (preg_match('/фотообои/iu', $value)) return 'photo_wallpaper';
    if (preg_match('/обои/iu', $value)) return 'wallpaper';
    if (preg_match('/керамогранит/iu', $value)) return 'porcelain';
    if (preg_match('/керамическ|плитк/iu', $value)) return 'tile';
    if (preg_match('/мдф/iu', $value)) return 'mdf';
    if (preg_match('/рееч|рейк|ламел/iu', $value)) return 'slat';
    if (preg_match('/молдинг|профил/iu', $value)) return 'molding';
    if (preg_match('/гипсов.*3d|гипсов.*3д|3d.*панел|3д.*панел/iu', $value)) return 'gypsum_3d';
    if (preg_match('/мягк/iu', $value)) return 'soft_panel';
    if (preg_match('/бамбук/iu', $value)) return 'bamboo';
    if (preg_match('/гибк.*мрамор|мрамор/iu', $value)) return 'flex_marble';
    if (preg_match('/камень|шпон/iu', $value)) return 'stone_veneer';
    if (preg_match('/стекл/iu', $value)) return 'glass';
    if (preg_match('/зеркал/iu', $value)) return 'mirror';
    if (preg_match('/покраск|окраск|краск/iu', $value)) return 'paint';
    return $fallback;
}

function wallCoverSelectedFormatKey(array $selected): string {
    $value = wallCoverNormalizeLabel(implode(' ', $selected));
    $map = [
        'wallpaper_paint' => '/обои.*покраск|покраск.*обои/u',
        'roll' => '/рулон/u',
        'coat' => '/сплошн.*сло|нанесен/u',
        'large_tile' => '/крупноформ/u',
        'tile_module' => '/плитк|модул/u',
        'slat' => '/рейк|ламел/u',
        'flex_stone_sheet' => '/листов.*гибк|гибк.*кам/u',
        'wall_molding' => '/молдинг/u',
        'decor_profile' => '/профил/u',
        'frame_molding' => '/рамоч/u',
        'corner_profile' => '/углов/u',
        'soft_carriage' => '/каретн/u',
        'soft_plain' => '/мягк.*прост/u',
        'soft_insert' => '/мягк.*встав/u',
    ];
    foreach ($map as $key => $pattern) {
        if (preg_match($pattern, $value)) return $key;
    }
    return '';
}

function wallCoverOptionAllowed(array $option, string $coverKey, string $formatKey): bool {
    $covers = $option['covers'] ?? [];
    if (is_array($covers) && $covers && !in_array($coverKey, $covers, true)) return false;
    $formats = $option['formats'] ?? [];
    if (is_array($formats) && $formats && $formatKey !== '' && !in_array($formatKey, $formats, true)) return false;
    return true;
}

function wallCoverRequiredGroups(array $catalog, string $cover, array $selectedLabels): array {
    $coverKey = wallCoverDetectKey($cover);
    if ($coverKey === '') return array_values(array_filter(array_map('strval', $catalog['requiredGroups'] ?? [])));
    $formatKey = wallCoverSelectedFormatKey($selectedLabels);
    $baseRequired = array_flip(array_values(array_filter(array_map('strval', $catalog['requiredGroups'] ?? []))));
    $groups = [];
    foreach (($catalog['optionGroups'] ?? []) as $group) {
        $label = trim((string)($group['group'] ?? ''));
        if ($label === '' || !isset($baseRequired[$label])) continue;
        foreach (($group['options'] ?? []) as $option) {
            if (wallCoverOptionAllowed($option, $coverKey, $formatKey)) {
                $groups[] = $label;
                break;
            }
        }
    }
    return $groups;
}
