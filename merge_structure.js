// Скрипт для добавления недостающей структуры из prices_list.js в prices_list.json
const fs = require('fs');

// Загружаем JSON
const pricesData = JSON.parse(fs.readFileSync('prices_list.json', 'utf8'));

console.log('Добавляем недостающую структуру...\n');

// Получаем существующие items из openings и stairs
const openingsItems = pricesData.works.installation.categories.finishing.subcategories.openings?.items || [];
const stairsItems = pricesData.works.installation.categories.finishing.subcategories.stairs?.items || [];

console.log(`Найдено ${openingsItems.length} работ в openings`);
console.log(`Найдено ${stairsItems.length} работ в stairs`);

// Функция для получения items по ID
function getItemsByIds(sourceItems, ids) {
  const map = new Map(sourceItems.map(item => [item.id, item]));
  return ids.map(id => map.get(id)).filter(Boolean);
}

// Реорганизуем openings с подкатегориями
pricesData.works.installation.categories.finishing.subcategories.openings = {
  name: 'Монтаж проёмов',
  subcategories: {
    door: {
      name: 'Дверной проём',
      items: getItemsByIds(openingsItems, [
        'door_install', 'door_install_with_trim', 'door_install_tall',
        'door_install_hidden', 'door_install_hidden_prep', 'door_install_hidden_tall',
        'door_install_hidden_double', 'door_install_double', 'door_install_double_trim',
        'door_install_sliding', 'door_portal', 'door_trim', 'door_trim_one_side',
        'door_frame_reinforce', 'handle_install', 'handle_install_simple',
        'lock_install', 'lock_install_latch', 'closer_install',
        'door_threshold_install', 'door_seal_install', 'door_hardware_complex'
      ])
    },
    window: {
      name: 'Оконный проём',
      items: getItemsByIds(openingsItems, [
        'window_install', 'window_install_large', 'window_install_panoramic',
        'window_trim', 'window_trim_inner', 'drip_install',
        'window_install_aluminum', 'window_install_aluminum_large',
        'window_install_aluminum_panoramic', 'window_install_aluminum_sliding',
        'window_install_wood', 'window_install_wood_large',
        'window_install_wood_panoramic', 'windowsill_install_opening',
        'window_slope_sandwich', 'window_slope_plaster', 'window_slope_gkl',
        'window_hardware_adjust', 'window_seal_replace', 'window_mosquito_install'
      ])
    },
    balcony: {
      name: 'Балконный проём',
      items: getItemsByIds(openingsItems, [
        'balcony_install', 'balcony_install_large', 'balcony_install_panoramic',
        'balcony_warm_glazing', 'balcony_warm_glazing_large',
        'balcony_warm_glazing_panoramic', 'balcony_cold_glazing',
        'balcony_cold_glazing_large', 'balcony_cold_glazing_panoramic',
        'balcony_door_block', 'balcony_door_block_large', 'balcony_sliding_portal',
        'balcony_sill_install', 'balcony_drain_install', 'balcony_trim',
        'balcony_trim_inner', 'balcony_insulation_joint'
      ])
    }
  }
};

console.log('✓ Реорганизована структура openings');

// Реорганизуем stairs с подкатегориями
pricesData.works.installation.categories.finishing.subcategories.stairs = {
  name: 'Лестницы и перила',
  subcategories: {
    stair_install: {
      name: 'Монтаж лестниц',
      subcategories: {
        by_material: {
          name: 'По материалу',
          subcategories: {
            concrete: {
              name: 'Бетон',
              items: getItemsByIds(stairsItems, [
                'stair_install_concrete_straight_h3_w11', 'stair_install_concrete_straight_h6_w15',
                'stair_install_concrete_l_h3_w11', 'stair_install_concrete_l_h6_w15',
                'stair_install_concrete_u_h3_w11', 'stair_install_concrete_u_h6_w15',
                'stair_install_concrete_spiral_d2_h3', 'stair_install_concrete_spiral_d3_h6',
                'stair_install_concrete_straight', 'stair_install_concrete_l_shape',
                'stair_install_concrete_u_shape', 'stair_install_concrete_spiral'
              ])
            },
            metal: {
              name: 'Металл / металлокаркас',
              items: getItemsByIds(stairsItems, [
                'stair_install_metal_straight_h3_w11', 'stair_install_metal_straight_h6_w15',
                'stair_install_metal_l_h3_w11', 'stair_install_metal_l_h6_w15',
                'stair_install_metal_u_h3_w11', 'stair_install_metal_u_h6_w15',
                'stair_install_metal_spiral_d2_h3', 'stair_install_metal_spiral_d3_h6',
                'stair_install_metal_straight', 'stair_install_metal_l_shape',
                'stair_install_metal_u_shape', 'stair_install_metal_spiral'
              ])
            },
            wood: {
              name: 'Дерево',
              items: getItemsByIds(stairsItems, [
                'stair_install_wood_straight_h3_w11', 'stair_install_wood_straight_h6_w15',
                'stair_install_wood_on_metal_h3_w11', 'stair_install_wood_on_metal_h6_w15',
                'stair_install_wood_hardwood_h3_w11', 'stair_install_wood_hardwood_h6_w15',
                'stair_install_wood_spiral_d2_h3', 'stair_install_wood_spiral_d3_h6',
                'stair_install_wood_straight', 'stair_install_wood_on_metal',
                'stair_install_wood_hardwood', 'stair_install_wood_spiral'
              ])
            },
            stone: {
              name: 'Камень',
              items: getItemsByIds(stairsItems, [
                'stair_install_stone_15steps_w11', 'stair_install_stone_25steps_w15',
                'stair_install_granite_15steps_w11', 'stair_install_granite_25steps_w15',
                'stair_install_marble_15steps_w11', 'stair_install_marble_25steps_w15',
                'stair_install_stone', 'stair_install_granite', 'stair_install_marble'
              ])
            },
            composite: {
              name: 'ДПК / композит',
              items: getItemsByIds(stairsItems, [
                'stair_install_composite_dpk_h15_w12', 'stair_install_composite_dpk_h3_w15',
                'stair_install_composite_outdoor_h15_w12', 'stair_install_composite_outdoor_h3_w15',
                'stair_install_composite_dpk', 'stair_install_composite_on_metal',
                'stair_install_composite_outdoor'
              ])
            }
          }
        },
        standard_size: {
          name: 'Типовая лестница',
          items: getItemsByIds(stairsItems, [
            'stair_install_concrete_straight_h3_w11', 'stair_install_concrete_u_h3_w11',
            'stair_install_concrete_l_h3_w11', 'stair_install_metal_straight_h3_w11',
            'stair_install_metal_u_h3_w11', 'stair_install_metal_l_h3_w11',
            'stair_install_wood_straight_h3_w11', 'stair_install_wood_on_metal_h3_w11',
            'stair_install_wood_hardwood_h3_w11', 'stair_install_stone_15steps_w11',
            'stair_install_granite_15steps_w11', 'stair_install_marble_15steps_w11',
            'stair_install_composite_dpk_h15_w12', 'stair_install_composite_outdoor_h15_w12'
          ])
        },
        increased_size: {
          name: 'Увеличенная лестница',
          items: getItemsByIds(stairsItems, [
            'stair_install_concrete_straight_h6_w15', 'stair_install_concrete_u_h6_w15',
            'stair_install_concrete_l_h6_w15', 'stair_install_metal_straight_h6_w15',
            'stair_install_metal_u_h6_w15', 'stair_install_metal_l_h6_w15',
            'stair_install_wood_straight_h6_w15', 'stair_install_wood_on_metal_h6_w15',
            'stair_install_wood_hardwood_h6_w15', 'stair_install_stone_25steps_w15',
            'stair_install_granite_25steps_w15', 'stair_install_marble_25steps_w15',
            'stair_install_composite_dpk_h3_w15', 'stair_install_composite_outdoor_h3_w15'
          ])
        },
        spiral: {
          name: 'Винтовая лестница',
          items: getItemsByIds(stairsItems, [
            'stair_install_wood_spiral_d2_h3', 'stair_install_wood_spiral_d3_h6',
            'stair_install_metal_spiral_d2_h3', 'stair_install_metal_spiral_d3_h6',
            'stair_install_concrete_spiral_d2_h3', 'stair_install_concrete_spiral_d3_h6'
          ])
        },
        custom: {
          name: 'Индивидуальный проект',
          items: getItemsByIds(stairsItems, [
            'stair_install_stone', 'stair_install_granite', 'stair_install_marble',
            'stair_install_concrete_straight', 'stair_install_concrete_l_shape',
            'stair_install_concrete_u_shape', 'stair_install_concrete_spiral',
            'stair_install_metal_straight', 'stair_install_metal_l_shape',
            'stair_install_metal_u_shape', 'stair_install_metal_spiral',
            'stair_install_wood_straight', 'stair_install_wood_on_metal',
            'stair_install_wood_hardwood', 'stair_install_wood_spiral',
            'stair_install_composite_dpk', 'stair_install_composite_on_metal',
            'stair_install_composite_outdoor'
          ])
        },
        element: {
          name: 'Поэлементный монтаж',
          items: getItemsByIds(stairsItems, [
            'stair_concrete_formwork', 'stair_concrete_rebar', 'stair_concrete_pour',
            'stair_frame_metal_straight', 'stair_frame_metal_turn', 'stair_frame_metal_spiral',
            'stair_step_install_wood', 'stair_riser_install_wood', 'stair_winder_steps_install',
            'stair_landing_install', 'stair_step_install_stone',
            'stair_install_composite_on_metal_step_w12', 'stair_install_composite_on_metal_step_w15'
          ])
        }
      }
    },
    stair_cladding: {
      name: 'Облицовка лестниц',
      subcategories: {
        porcelain: {
          name: 'Керамогранит / керамика',
          items: getItemsByIds(stairsItems, [
            'stair_cladding_porcelain_standard', 'stair_cladding_porcelain_large',
            'stair_cladding_ceramic', 'stair_cladding_tile_nosing',
            'stair_cladding_tread_tile', 'stair_cladding_riser_tile',
            'stair_cladding_landing_tile', 'stair_cladding_end_profile',
            'stair_anti_slip_strip'
          ])
        },
        natural_stone: {
          name: 'Натуральный камень',
          items: getItemsByIds(stairsItems, [
            'stair_cladding_natural_stone', 'stair_cladding_granite',
            'stair_cladding_marble', 'stair_cladding_step_stone'
          ])
        },
        wood: {
          name: 'Дерево / массив',
          items: getItemsByIds(stairsItems, [
            'stair_cladding_wood_soft', 'stair_cladding_wood_hard',
            'stair_cladding_engineered_board', 'stair_cladding_tread_wood',
            'stair_cladding_riser_wood', 'stair_cladding_skirting'
          ])
        },
        metal: {
          name: 'Металл',
          items: getItemsByIds(stairsItems, [
            'stair_cladding_metal_sheet', 'stair_cladding_metal_anti_slip'
          ])
        },
        composite: {
          name: 'ДПК / композит',
          items: getItemsByIds(stairsItems, [
            'stair_cladding_composite', 'stair_cladding_dpk_tread',
            'stair_cladding_terrace_board'
          ])
        }
      }
    },
    railing_install: {
      name: 'Монтаж перил',
      subcategories: {
        wood: {
          name: 'Дерево',
          items: getItemsByIds(stairsItems, [
            'railing_install_wood', 'railing_install_wood_handrail',
            'railing_install_wood_balusters', 'railing_install_wall_handrail',
            'railing_install_post_wood', 'railing_install_baluster_wood_piece'
          ])
        },
        metal: {
          name: 'Металл',
          items: getItemsByIds(stairsItems, [
            'railing_install_metal', 'railing_install_stainless',
            'railing_install_black_metal', 'railing_install_handrail_metal',
            'railing_install_handrail_stainless', 'railing_install_post_metal',
            'railing_install_baluster_metal_piece', 'railing_install_rigel'
          ])
        },
        glass: {
          name: 'Стекло',
          items: getItemsByIds(stairsItems, [
            'railing_install_glass', 'railing_install_glass_profile',
            'railing_install_glass_point', 'railing_install_glass_panel'
          ])
        },
        forged: {
          name: 'Ковка',
          items: getItemsByIds(stairsItems, [
            'railing_install_forged', 'railing_install_forged_premium',
            'railing_install_forged_section'
          ])
        },
        composite: {
          name: 'ДПК / ПВХ',
          items: getItemsByIds(stairsItems, [
            'railing_install_composite', 'railing_install_pvc_handrail',
            'railing_install_dpk_system'
          ])
        }
      }
    }
  }
};

console.log('✓ Реорганизована структура stairs');

// Сохраняем обновлённый JSON
fs.writeFileSync('prices_list.json', JSON.stringify(pricesData, null, 2), 'utf8');

console.log('\n✓ Файл prices_list.json успешно обновлён!');
console.log('\nТеперь все дополнения из prices_list.js интегрированы в JSON.');
console.log('Функции sync* в prices_list.js можно удалить или оставить для обратной совместимости.');
