<?php
declare(strict_types=1);

function roomRepairMaterialRecipes(): array {
    return [
        'finish_floor_floor_laminate' => [
            ['materialId' => 'laminate_board', 'materialName' => 'Ламинат', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 7],
            ['materialId' => 'underlayment_floor', 'materialName' => 'Подложка под ламинат', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 5],
        ],
        'finish_floor_floor_quartzvinyl' => [
            ['materialId' => 'vinyl_plank', 'materialName' => 'Кварц-винил / SPC', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 7],
            ['materialId' => 'floor_primer', 'materialName' => 'Грунтовка под напольное покрытие', 'consumptionPerWorkUnit' => 0.12, 'consumptionUnit' => 'л', 'rounding' => 'half', 'wastePercent' => 5],
        ],
        'finish_floor_floor_engineered' => [
            ['materialId' => 'parquet_board', 'materialName' => 'Инженерная доска', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 9],
            ['materialId' => 'parquet_glue', 'materialName' => 'Клей для инженерной доски', 'consumptionPerWorkUnit' => 1.15, 'consumptionUnit' => 'кг', 'rounding' => 'ceil', 'wastePercent' => 5],
        ],
        'finish_floor_floor_parquet' => [
            ['materialId' => 'parquet_board', 'materialName' => 'Паркет / паркетная доска', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 10],
            ['materialId' => 'parquet_glue', 'materialName' => 'Паркетный клей', 'consumptionPerWorkUnit' => 1.2, 'consumptionUnit' => 'кг', 'rounding' => 'ceil', 'wastePercent' => 5],
        ],
        'finish_floor_floor_parquet_herringbone' => [
            ['materialId' => 'parquet_board', 'materialName' => 'Паркет для укладки елкой', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 14],
            ['materialId' => 'parquet_glue', 'materialName' => 'Паркетный клей', 'consumptionPerWorkUnit' => 1.25, 'consumptionUnit' => 'кг', 'rounding' => 'ceil', 'wastePercent' => 5],
        ],
        'finish_floor_floor_cork' => [
            ['materialId' => 'project_material_package', 'materialName' => 'Пробковое покрытие', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 8, 'unitPriceOverride' => 2400],
            ['materialId' => 'floor_primer', 'materialName' => 'Грунтовка под пробковое покрытие', 'consumptionPerWorkUnit' => 0.12, 'consumptionUnit' => 'л', 'rounding' => 'half', 'wastePercent' => 5],
        ],
        'finish_floor_floor_porcelain' => [
            ['materialId' => 'ceramic_tile', 'materialName' => 'Керамогранит / керамическая плитка', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 10],
            ['materialId' => 'tile_adhesive_porcelain', 'materialName' => 'Клей для керамогранита', 'consumptionPerWorkUnit' => 4.5, 'consumptionUnit' => 'кг', 'rounding' => 'ceil', 'wastePercent' => 7],
            ['materialId' => 'grout', 'materialName' => 'Затирка для плитки', 'consumptionPerWorkUnit' => 0.22, 'consumptionUnit' => 'кг', 'rounding' => 'half', 'wastePercent' => 5],
        ],
        'finish_floor_floor_porcelain_large' => [
            ['materialId' => 'ceramic_tile', 'materialName' => 'Крупноформатный керамогранит', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 12],
            ['materialId' => 'tile_adhesive_porcelain', 'materialName' => 'Клей C2 для крупного формата', 'consumptionPerWorkUnit' => 5.5, 'consumptionUnit' => 'кг', 'rounding' => 'ceil', 'wastePercent' => 8],
            ['materialId' => 'tile_leveling_system', 'materialName' => 'СВП для крупноформатной плитки', 'consumptionPerWorkUnit' => 0.2, 'consumptionUnit' => 'упаковка', 'rounding' => 'ceil', 'wastePercent' => 0],
        ],
        'finish_floor_floor_linoleum_glue' => [
            ['materialId' => 'linoleum_roll', 'materialName' => 'Линолеум / рулонное покрытие', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 8],
            ['materialId' => 'floor_covering_glue', 'materialName' => 'Клей для рулонного покрытия', 'consumptionPerWorkUnit' => 0.35, 'consumptionUnit' => 'кг', 'rounding' => 'ceil', 'wastePercent' => 5],
        ],
        'finish_floor_floor_linoleum_free' => [
            ['materialId' => 'linoleum_roll', 'materialName' => 'Линолеум / рулонное покрытие', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 8],
        ],
        'finish_floor_floor_epoxy' => [
            ['materialId' => 'epoxy_floor_compound', 'materialName' => 'Эпоксидный состав для наливного пола', 'consumptionPerWorkUnit' => 2.2, 'consumptionUnit' => 'кг', 'rounding' => 'ceil', 'wastePercent' => 8],
            ['materialId' => 'floor_primer', 'materialName' => 'Грунт под наливной пол', 'consumptionPerWorkUnit' => 0.18, 'consumptionUnit' => 'л', 'rounding' => 'half', 'wastePercent' => 5],
        ],
        'finish_floor_floor_polyurethane' => [
            ['materialId' => 'polyurethane_floor_compound', 'materialName' => 'Полиуретановый состав для наливного пола', 'consumptionPerWorkUnit' => 2.1, 'consumptionUnit' => 'кг', 'rounding' => 'ceil', 'wastePercent' => 8],
            ['materialId' => 'floor_primer', 'materialName' => 'Грунт под наливной пол', 'consumptionPerWorkUnit' => 0.18, 'consumptionUnit' => 'л', 'rounding' => 'half', 'wastePercent' => 5],
        ],
        'finish_floor_floor_plinth_hidden' => [
            ['materialId' => 'hidden_plinth_profile', 'materialName' => 'Профиль скрытого плинтуса', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м', 'rounding' => 'none', 'wastePercent' => 7],
        ],

        'finish_ceil_ceiling_stretch' => [
            ['materialId' => 'stretch_ceiling_canvas', 'materialName' => 'Полотно натяжного потолка', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 5],
            ['materialId' => 'stretch_ceiling_profile', 'materialName' => 'Профиль натяжного потолка', 'consumptionPerWorkUnit' => 0.45, 'consumptionUnit' => 'м', 'rounding' => 'none', 'wastePercent' => 7],
        ],
        'finish_ceil_ceiling_stretch_fabric' => [
            ['materialId' => 'fabric_stretch_ceiling_canvas', 'materialName' => 'Тканевое потолочное полотно', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 6],
            ['materialId' => 'stretch_ceiling_profile', 'materialName' => 'Профиль натяжного потолка', 'consumptionPerWorkUnit' => 0.45, 'consumptionUnit' => 'м', 'rounding' => 'none', 'wastePercent' => 7],
        ],
        'finish_ceil_ceiling_stretch_shadow' => [
            ['materialId' => 'stretch_ceiling_canvas', 'materialName' => 'Полотно натяжного потолка', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 5],
            ['materialId' => 'shadow_profile', 'materialName' => 'Теневой профиль потолка', 'consumptionPerWorkUnit' => 0.5, 'consumptionUnit' => 'м', 'rounding' => 'none', 'wastePercent' => 8],
        ],
        'finish_ceil_ceiling_stretch_multilevel' => [
            ['materialId' => 'stretch_ceiling_canvas', 'materialName' => 'Полотно для многоуровневого потолка', 'consumptionPerWorkUnit' => 1.08, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 6],
            ['materialId' => 'ceiling_frame_profile', 'materialName' => 'Профиль каркаса многоуровневого потолка', 'consumptionPerWorkUnit' => 0.75, 'consumptionUnit' => 'м', 'rounding' => 'none', 'wastePercent' => 8],
        ],
        'finish_ceil_ceiling_gk' => [
            ['materialId' => 'drywall_sheet', 'materialName' => 'ГКЛ для потолка', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м²', 'rounding' => 'none', 'wastePercent' => 8],
            ['materialId' => 'ceiling_frame_profile', 'materialName' => 'Потолочный металлический профиль', 'consumptionPerWorkUnit' => 2.2, 'consumptionUnit' => 'м', 'rounding' => 'none', 'wastePercent' => 8],
            ['materialId' => 'drywall_screws', 'materialName' => 'Саморезы для ГКЛ', 'consumptionPerWorkUnit' => 18, 'consumptionUnit' => 'шт', 'rounding' => 'ceil', 'wastePercent' => 5],
        ],
        'finish_ceil_man_ceiling_paint' => [
            ['materialId' => 'ceiling_paint', 'materialName' => 'Краска для потолка', 'consumptionPerWorkUnit' => 0.18, 'consumptionUnit' => 'л', 'rounding' => 'half', 'wastePercent' => 7],
            ['materialId' => 'primer_putty', 'materialName' => 'Грунтовка под покраску потолка', 'consumptionPerWorkUnit' => 0.12, 'consumptionUnit' => 'л', 'rounding' => 'half', 'wastePercent' => 5],
        ],
        'finish_ceil_ceiling_led_profile' => [
            ['materialId' => 'led_profile', 'materialName' => 'LED-профиль потолочный', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м', 'rounding' => 'none', 'wastePercent' => 7],
            ['materialId' => 'led_strip', 'materialName' => 'LED-лента', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м', 'rounding' => 'none', 'wastePercent' => 7],
        ],
        'finish_ceil_ceiling_stretch_light_lines' => [
            ['materialId' => 'led_profile', 'materialName' => 'Профиль световой линии потолка', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м', 'rounding' => 'none', 'wastePercent' => 7],
            ['materialId' => 'led_strip', 'materialName' => 'LED-лента для световой линии', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м', 'rounding' => 'none', 'wastePercent' => 7],
        ],
        'finish_ceil_ceiling_cornice_hidden' => [
            ['materialId' => 'shadow_profile', 'materialName' => 'Профиль скрытого карниза / ниши', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м', 'rounding' => 'none', 'wastePercent' => 8],
        ],
        'finish_ceil_ceiling_stretch_curtain_niche' => [
            ['materialId' => 'shadow_profile', 'materialName' => 'Профиль скрытой ниши под шторы', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'м', 'rounding' => 'none', 'wastePercent' => 8],
            ['materialId' => 'ceiling_frame_profile', 'materialName' => 'Каркас ниши под шторы', 'consumptionPerWorkUnit' => 0.6, 'consumptionUnit' => 'м', 'rounding' => 'none', 'wastePercent' => 8],
        ],
        'finish_ceil_ceiling_hatch_hidden' => [
            ['materialId' => 'hidden_revision_hatch', 'materialName' => 'Скрытый ревизионный люк', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'шт', 'rounding' => 'ceil', 'wastePercent' => 0],
        ],
        'finish_ceil_ceiling_rosette' => [
            ['materialId' => 'chandelier_support_platform', 'materialName' => 'Закладная платформа / усиление под люстру', 'consumptionPerWorkUnit' => 1, 'consumptionUnit' => 'шт', 'rounding' => 'ceil', 'wastePercent' => 0],
        ],
    ];
}

function roomRepairMaterialRecipeForWork(string $workId): ?array {
    $recipes = roomRepairMaterialRecipes();
    return $recipes[$workId] ?? null;
}
