<?php
declare(strict_types=1);

function ceilingCoverNormalizeLabel(string $value): string {
    $value = function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
    return str_replace('ё', 'е', trim($value));
}

function ceilingCoverDetectKey(string $cover, string $fallback = ''): string {
    $value = ceilingCoverNormalizeLabel($cover);
    if (preg_match('/светов.*лини|led|лед|профиль.*свет|свет.*профил/iu', $value)) return 'led_profile';
    if (preg_match('/трек|шинопровод/iu', $value)) return 'track_system';
    if (preg_match('/карниз|ниша.*штор|штор.*ниша/iu', $value)) return 'curtain_niche';
    if (preg_match('/ревизион.*люк|скрыт.*люк/iu', $value)) return 'hatch';
    if (preg_match('/усилен.*люстр|закладн.*люстр|платформ.*люстр/iu', $value)) return 'chandelier_support';
    if (preg_match('/гкл|гипсокартон/iu', $value)) return 'gypsum';
    if (preg_match('/тканев.*натяж|натяж.*тканев/iu', $value)) return 'fabric_stretch';
    if (preg_match('/многоуровн/iu', $value)) return 'multilevel_stretch';
    if (preg_match('/тенев|парящ/iu', $value)) return 'shadow_stretch';
    if (preg_match('/натяж/iu', $value)) return 'stretch';
    if (preg_match('/покраск|окраск|краск/iu', $value)) return 'paint';
    if (preg_match('/подвесн|реечн|кассет|грильято|акустич/iu', $value)) return 'suspended';
    return $fallback;
}

function ceilingCoverSelectedFormatKey(array $selected): string {
    $value = ceilingCoverNormalizeLabel(implode(' ', $selected));
    $map = [
        'gypsum' => '/гкл|гипсокартон/u',
        'led_profile' => '/светов.*лини|led|лед|профиль.*свет|свет.*профил/u',
        'track_system' => '/трек|шинопровод/u',
        'curtain_niche' => '/карниз|ниша.*штор|штор.*ниша/u',
        'hatch' => '/ревизион.*люк|скрыт.*люк/u',
        'chandelier_support' => '/усилен.*люстр|закладн.*люстр|платформ.*люстр/u',
        'fabric_stretch' => '/тканев.*натяж|натяж.*тканев/u',
        'multilevel_stretch' => '/многоуровн/u',
        'shadow_stretch' => '/тенев|парящ/u',
        'stretch' => '/натяж/u',
        'paint' => '/покраск|окраск|краск/u',
        'suspended' => '/подвесн|реечн|кассет|грильято|акустич/u',
    ];
    foreach ($map as $key => $pattern) {
        if (preg_match($pattern, $value)) return $key;
    }
    return '';
}

function ceilingCoverOptionAllowed(array $option, string $coverKey, string $formatKey): bool {
    $covers = $option['covers'] ?? [];
    if (is_array($covers) && $covers && $coverKey !== '' && !in_array($coverKey, $covers, true)) return false;
    $formats = $option['formats'] ?? [];
    if (is_array($formats) && $formats && $formatKey !== '' && !in_array($formatKey, $formats, true)) return false;
    return true;
}

function ceilingCoverRequiredGroups(array $catalog, string $cover, array $selectedLabels): array {
    $coverKey = ceilingCoverDetectKey($cover);
    $formatKey = ceilingCoverSelectedFormatKey($selectedLabels);
    $baseRequired = array_flip(array_values(array_filter(array_map('strval', $catalog['requiredGroups'] ?? []))));
    $groups = [];
    foreach (($catalog['optionGroups'] ?? []) as $group) {
        $label = trim((string)($group['group'] ?? ''));
        if ($label === '' || !isset($baseRequired[$label])) continue;
        foreach (($group['options'] ?? []) as $option) {
            if (ceilingCoverOptionAllowed($option, $coverKey, $formatKey)) {
                $groups[] = $label;
                break;
            }
        }
    }
    return $groups;
}
