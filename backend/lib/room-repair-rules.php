<?php
declare(strict_types=1);

function roomRepairRuleNormalize(string $value): string {
    $value = function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
    return str_replace('ё', 'е', trim($value));
}

function roomRepairRuleDefinitions(): array {
    return [
        ['sections' => ['floor'], 'categories' => ['floorLeveling'], 'pattern' => '/полусух/iu', 'targetCategory' => 'floorLeveling', 'workId' => 'rough_floor_level_halfs', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floorLeveling'], 'pattern' => '/гидроизоляц/iu', 'targetCategory' => 'floorLeveling', 'workId' => 'rough_floor_level_waterproof', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floorLeveling', 'floor'], 'pattern' => '/шумоизоляц/iu', 'targetCategory' => 'floorLeveling', 'workId' => 'rough_floor_level_sound', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floorLeveling', 'floor'], 'pattern' => '/тепл.*пол|подготовка.*тепл/iu', 'targetCategory' => 'floorLeveling', 'workId' => 'rough_floor_level_warm_prep', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/запил.*45|45.*град/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_tile_miter_45', 'qtyMode' => 'perimeter'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/мозаик.*душ|душ.*мозаик/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_shower_tray_tile_mosaic', 'qtyMode' => 'wetArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/мозаик/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_decor_mosaic', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/бордюр/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_tile_border', 'qtyMode' => 'perimeter'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/декоратив.*встав/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_decor_insert', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/противоскольз|матов.*плит|душев.*плит/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_shower_tray_tile_matte', 'qtyMode' => 'wetArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/горяч.*свар/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_linoleum_hot_weld', 'qtyMode' => 'perimeter'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/частичн.*приклей|свободн.*уклад.*линолеум|линолеум.*без кле/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_linoleum_free', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/коммерческ.*линолеум|линолеум.*клей|линолеум/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_linoleum_glue', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/ковролин/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_carpet_glue', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/эпоксид/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_epoxy', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/полиуретан/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_polyurethane', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/^(\\d+[,.]?\\d*\\s*м²:\\s*)?наливной пол$/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_polyurethane', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floorLeveling'], 'pattern' => '/стяжк|основан|подготов/iu', 'targetCategory' => 'floorLeveling', 'workId' => 'rough_floor_level_csp_5cm_mech', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floorLeveling', 'floor'], 'pattern' => '/налив/iu', 'targetCategory' => 'floorLeveling', 'workId' => 'rough_floor_level_self', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/крупноформат/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_porcelain_large', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/паркет.*елк/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_parquet_herringbone', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/ламинат/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_laminate', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/паркетная доска/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_parquet', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/паркет/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_parquet', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/микроцемент/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_microcement', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/пробков/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_cork', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/кварц|spc|винил/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_quartzvinyl', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/инженер/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_engineered', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/керамическ.*плит|плитк/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_porcelain', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/керамогранит/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_porcelain', 'qtyMode' => 'floorArea'],
        ['sections' => ['floor'], 'categories' => ['floor'], 'pattern' => '/скрытый плинтус|плинтус/iu', 'targetCategory' => 'floor', 'workId' => 'finish_floor_floor_plinth_hidden', 'qtyMode' => 'perimeter'],

        ['sections' => ['walls'], 'categories' => ['wallPlaster'], 'pattern' => '/цементн.*штукатур|влажн.*зон/iu', 'targetCategory' => 'wallPlaster', 'workId' => 'rough_plaster_cement_3cm', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls'], 'categories' => ['wallPlaster'], 'pattern' => '/штукатур/iu', 'targetCategory' => 'wallPlaster', 'workId' => 'rough_plaster_gips_3cm_mech', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls'], 'categories' => ['wallPutty'], 'pattern' => '/стеклохолст/iu', 'targetCategory' => 'wallPutty', 'workId' => 'rough_putty_fiberglass', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls'], 'categories' => ['wallPutty'], 'pattern' => '/шпаклев|финишная подготовка|под чистовую/iu', 'targetCategory' => 'wallPutty', 'workId' => 'rough_putty_paint_mech', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls', 'wall'], 'categories' => ['wall'], 'pattern' => '/фотообои/iu', 'targetCategory' => 'wall', 'workId' => 'finish_wall_wall_photo_wallpaper', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls', 'wall'], 'categories' => ['wall'], 'pattern' => '/обои/iu', 'targetCategory' => 'wall', 'workId' => 'finish_wall_wall_wallpaper', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls', 'wall'], 'categories' => ['wall'], 'pattern' => '/венециан|декоратив.*штукатур/iu', 'targetCategory' => 'wall', 'workId' => 'finish_wall_wall_venetian_plaster', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls', 'wall'], 'categories' => ['wall'], 'pattern' => '/микроцемент/iu', 'targetCategory' => 'wall', 'workId' => 'finish_wall_wall_microcement', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls', 'wall'], 'categories' => ['wall'], 'pattern' => '/мдф/iu', 'targetCategory' => 'wall', 'workId' => 'finish_wall_wall_mdf_panels', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls', 'wall'], 'categories' => ['wall'], 'pattern' => '/рейк|рееч|бамбук/iu', 'targetCategory' => 'wall', 'workId' => 'finish_wall_wall_slat', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls', 'wall'], 'categories' => ['wall'], 'pattern' => '/молдинг|профил/iu', 'targetCategory' => 'wall', 'workId' => 'finish_wall_wall_molding', 'qtyMode' => 'perimeter'],
        ['sections' => ['walls', 'wall'], 'categories' => ['wall'], 'pattern' => '/гипсов.*3d|гипсов.*3д|3d.*панел|3д.*панел/iu', 'targetCategory' => 'wall', 'workId' => 'finish_wall_wall_mdf_panels', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls', 'wall'], 'categories' => ['wall'], 'pattern' => '/крупноформат.*керамогранит|керамогранит.*крупноформат/iu', 'targetCategory' => 'wall', 'workId' => 'finish_wall_wall_porcelain_large', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls', 'wall'], 'categories' => ['wall'], 'pattern' => '/антивандал|моющ.*краск|износостой/iu', 'targetCategory' => 'wall', 'workId' => 'finish_wall_man_wall_paint_premium', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls', 'wall'], 'categories' => ['wall'], 'pattern' => '/окраск|покраск|краск/iu', 'targetCategory' => 'wall', 'workId' => 'finish_wall_man_wall_paint', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls', 'wall'], 'categories' => ['wall'], 'pattern' => '/керамогранит|керамическ.*плит|плитк/iu', 'targetCategory' => 'wall', 'workId' => 'finish_wall_wall_porcelain', 'qtyMode' => 'wallsArea'],
        ['sections' => ['walls', 'wall'], 'categories' => ['wall'], 'pattern' => '/гибк.*мрамор|камень|шпон|стекл|зеркал|мягк.*панел/iu', 'targetCategory' => 'wall', 'workId' => 'finish_wall_wall_decorative_plaster', 'qtyMode' => 'wallsArea'],

        ['sections' => ['ceiling'], 'categories' => ['ceilingPrep'], 'pattern' => '/стеклохолст/iu', 'targetCategory' => 'ceilingPrep', 'workId' => 'rough_ceiling_fiberglass', 'qtyMode' => 'ceilingArea'],
        ['sections' => ['ceiling'], 'categories' => ['ceilingPrep'], 'pattern' => '/базовая подготовка|выравнивание|подготовка потол/iu', 'targetCategory' => 'ceilingPrep', 'workId' => 'rough_ceiling_plaster_gips', 'qtyMode' => 'ceilingArea'],
        ['sections' => ['ceiling'], 'categories' => ['ceiling'], 'pattern' => '/тканев.*натяж/iu', 'targetCategory' => 'ceiling', 'workId' => 'finish_ceil_ceiling_stretch_fabric', 'qtyMode' => 'ceilingArea'],
        ['sections' => ['ceiling'], 'categories' => ['ceiling'], 'pattern' => '/многоуровн/iu', 'targetCategory' => 'ceiling', 'workId' => 'finish_ceil_ceiling_stretch_multilevel', 'qtyMode' => 'ceilingArea'],
        ['sections' => ['ceiling'], 'categories' => ['ceiling'], 'pattern' => '/гкл|гипсокартон/iu', 'targetCategory' => 'ceiling', 'workId' => 'finish_ceil_ceiling_gk', 'qtyMode' => 'ceilingArea'],
        ['sections' => ['ceiling'], 'categories' => ['ceiling'], 'pattern' => '/тенев|парящ/iu', 'targetCategory' => 'ceiling', 'workId' => 'finish_ceil_ceiling_stretch_shadow', 'qtyMode' => 'ceilingArea'],
        ['sections' => ['ceiling'], 'categories' => ['ceiling'], 'pattern' => '/светов.*лини|led.*профил/iu', 'targetCategory' => 'ceiling', 'workId' => 'finish_ceil_ceiling_led_profile', 'qtyMode' => 'lightingLength'],
        ['sections' => ['ceiling'], 'categories' => ['ceiling'], 'pattern' => '/трек|шинопровод/iu', 'targetCategory' => 'ceiling', 'workId' => 'finish_ceil_ceiling_led_profile', 'qtyMode' => 'lightingLength'],
        ['sections' => ['ceiling'], 'categories' => ['ceiling'], 'pattern' => '/ревизион.*люк|скрыт.*люк/iu', 'targetCategory' => 'ceiling', 'workId' => 'finish_ceil_ceiling_hatch_hidden', 'qtyMode' => 'parsedQty', 'fallbackQty' => 1],
        ['sections' => ['ceiling'], 'categories' => ['ceiling'], 'pattern' => '/закладн.*люстр|усилен.*люстр|платформ.*люстр/iu', 'targetCategory' => 'ceiling', 'workId' => 'finish_ceil_ceiling_rosette', 'qtyMode' => 'parsedQty', 'fallbackQty' => 1],
        ['sections' => ['ceiling'], 'categories' => ['ceiling'], 'pattern' => '/натяж/iu', 'targetCategory' => 'ceiling', 'workId' => 'finish_ceil_ceiling_stretch', 'qtyMode' => 'ceilingArea'],
        ['sections' => ['ceiling'], 'categories' => ['ceiling'], 'pattern' => '/покраск/iu', 'targetCategory' => 'ceiling', 'workId' => 'finish_ceil_man_ceiling_paint', 'qtyMode' => 'ceilingArea'],
        ['sections' => ['ceiling'], 'categories' => ['ceiling'], 'pattern' => '/ниша.*штор|штор.*ниша/iu', 'targetCategory' => 'ceiling', 'workId' => 'finish_ceil_ceiling_stretch_curtain_niche', 'qtyMode' => 'perimeter'],
        ['sections' => ['ceiling'], 'categories' => ['ceiling'], 'pattern' => '/карниз|ниша/iu', 'targetCategory' => 'ceiling', 'workId' => 'finish_ceil_ceiling_cornice_hidden', 'qtyMode' => 'perimeter'],
    ];
}

function roomRepairResolveRule(string $scope, string $label, string $mode = 'section'): ?array {
    $label = trim($label);
    if ($label === '') return null;
    if (preg_match('/^(формат|размер)\s*:/iu', $label)) return null;
    if (preg_match('/^(базовая прямая укладка|плавающий способ укладки|свободная укладка линолеума|частичная приклейка линолеума)$/iu', $label)) return null;
    $scopeKey = $mode === 'category' ? 'categories' : 'sections';
    foreach (roomRepairRuleDefinitions() as $rule) {
        if (!in_array($scope, $rule[$scopeKey] ?? [], true)) continue;
        if (!preg_match((string)$rule['pattern'], $label)) continue;
        return [
            'targetCategory' => (string)$rule['targetCategory'],
            'workId' => (string)$rule['workId'],
            'qtyMode' => (string)$rule['qtyMode'],
            'fallbackQty' => isset($rule['fallbackQty']) ? (float)$rule['fallbackQty'] : 0,
            'source' => 'backend',
        ];
    }
    return null;
}
