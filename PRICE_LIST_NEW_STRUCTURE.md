# Новая структура ID прайс-листа (версия 4.1)

**Дата обновления:** 2026-05-06  
**Статус:** ✅ Все дубликаты устранены  
**Всего уникальных ID:** 1333

---

## 📋 Система префиксов

Все ID работ теперь имеют префиксы, которые однозначно идентифицируют их категорию и назначение.

### Демонтажные работы
**Префикс:** `demo_`

Все работы по демонтажу начинаются с префикса `demo_`:
- `demo_floor_laminate` — Демонтаж ламината
- `demo_wall_paint` — Демонтаж покраски стен
- `demo_ceiling_stretch` — Демонтаж натяжных потолков
- `demo_partition_dismantle_gk` — Демонтаж перегородки из ГКЛ
- и т.д.

### Черновые работы
**Префикс:** `rough_`

Все черновые работы начинаются с префикса `rough_`:
- `rough_floor_screed_primer` — Грунтование основания перед стяжкой
- `rough_wall_rough_primer` — Грунтование стен
- `rough_ceiling_rough_primer` — Грунтование потолка
- `rough_plaster_gips_3cm` — Гипсовая штукатурка до 3 см
- и т.д.

### Инженерные работы

Инженерные работы имеют двойной префикс: `eng_` + категория:

#### Электрика
**Префикс:** `eng_elec_`
- `eng_elec_socket_install` — Монтаж розеток
- `eng_elec_switch_install` — Монтаж выключателей
- `eng_elec_wiring_hidden` — Прокладка скрытой электропроводки
- `eng_elec_panel_install` — Сборка и монтаж электрощита

#### Вентиляция
**Префикс:** `eng_vent_`
- `eng_vent_ac_unit_install` — Монтаж внутреннего блока кондиционера
- `eng_vent_vent_fan_install` — Монтаж вытяжного вентилятора
- `eng_vent_air_duct_install` — Монтаж воздуховодов

#### Водоснабжение
**Префикс:** `eng_water_`
- `eng_water_pipe_chasing_water` — Штробление под трубы водоснабжения
- `eng_water_water_pipe_pp` — Разводка полипропиленовых труб
- `eng_water_collector_unit` — Монтаж коллекторного узла
- `eng_water_filter_install` — Монтаж фильтров

#### Канализация
**Префикс:** `eng_drain_`
- `eng_drain_drain_pipe_110` — Прокладка канализационных труб 110 мм
- `eng_drain_drain_riser` — Монтаж/замена канализационного стояка
- `eng_drain_drain_trap` — Монтаж трапа/слива
- `eng_drain_drain_pump` — Подключение сололифта/канализационного насоса

#### Отопление
**Префикс:** `eng_heat_`
- `eng_heat_radiator_install` — Монтаж радиаторов отопления
- `eng_heat_heating_pipe` — Разводка труб отопления
- `eng_heat_boiler_install` — Монтаж котла
- `eng_heat_floor_heating_water` — Монтаж водяного тёплого пола
- `eng_heat_thermostat_heating` — Установка терморегулятора (общий)
- `eng_heat_floor_thermostat` — Установка терморегулятора тёплого пола

### Чистовые работы

Чистовые работы имеют двойной префикс: `finish_` + поверхность:

#### Пол
**Префикс:** `finish_floor_`

Дополнительные префиксы для подкатегорий:
- `finish_floor_laminate` — Укладка ламината
- `finish_floor_linoleum` — Укладка линолеума
- `finish_floor_carpet` — Укладка ковролина
- `finish_floor_cork` — Укладка пробки
- `finish_floor_parquet` — Укладка паркета
- `finish_floor_engineered` — Укладка инженерной доски
- `finish_floor_solid` — Укладка массивной доски
- `finish_floor_ceramic` — Укладка керамической плитки
- `finish_floor_porcelain` — Укладка керамогранита
- `finish_floor_quartzvinyl` — Укладка SPC
- `finish_floor_plinth` — Монтаж плинтуса

#### Стены
**Префикс:** `finish_wall_`

Дополнительные префиксы для подкатегорий покраски:
- `finish_wall_prep_` — Подготовка под покраску
- `finish_wall_man_` — Ручная покраска
- `finish_wall_mech_` — Механизированная покраска

Примеры:
- `finish_wall_wallpaper` — Оклейка обоями
- `finish_wall_man_wall_paint` — Покраска стен в 2 слоя (ручная)
- `finish_wall_mech_wall_paint_mech` — Покраска стен (механизированная)
- `finish_wall_decorative_plaster` — Декоративная штукатурка
- `finish_wall_microcement` — Микроцемент на стены
- `finish_wall_ceramic` — Укладка керамической плитки на стены

#### Потолок
**Префикс:** `finish_ceil_`

Дополнительные префиксы для подкатегорий покраски:
- `finish_ceil_man_` — Ручная покраска потолка
- `finish_ceil_mech_` — Механизированная покраска потолка

Примеры:
- `finish_ceil_stretch` — Монтаж натяжных потолков
- `finish_ceil_gk` — Монтаж гипсокартонного потолка
- `finish_ceil_suspended` — Монтаж подвесных потолков
- `finish_ceil_man_ceiling_paint` — Покраска потолка (ручная)
- `finish_ceil_mech_ceiling_paint_mech` — Покраска потолка (механизированная)

#### Проёмы
**Префикс:** `finish_open_`
- `finish_open_door_install` — Монтаж дверей
- `finish_open_window_install` — Монтаж окон
- `finish_open_balcony_install` — Монтаж балконного блока

#### Лестницы
**Префикс:** `finish_stair_`

Дополнительные префиксы для типов лестниц:
- `finish_stair_mat_` — По материалу (by_material)
- `finish_stair_std_` — Стандартные размеры (standard_size)
- `finish_stair_inc_` — Увеличенные размеры (increased_size)
- `finish_stair_spi_` — Винтовые (spiral)
- `finish_stair_cus_` — Индивидуальные (custom)

Примеры:
- `finish_stair_mat_stair_install_concrete_straight_h3_w11` — Бетонная прямая лестница (по материалу)
- `finish_stair_std_stair_install_concrete_straight_h3_w11` — Бетонная прямая лестница (стандартный размер)
- `finish_stair_spi_stair_install_wood_spiral_d2_h3` — Деревянная винтовая лестница
- `finish_stair_cladding_wood` — Облицовка лестницы деревом

#### Перегородки
**Префикс:** `finish_part_`
- `finish_part_partition_gkl` — Монтаж перегородки из ГКЛ
- `finish_part_partition_gasblock` — Монтаж перегородки из газобетона

---

## 🔄 Маппинг старых ID на новые

Файл `price_list_id_mapping.json` содержит полный маппинг всех переименованных ID.

### Примеры маппинга:

```json
{
  "floor_laminate": [
    { "old": "floor_laminate", "new": "demo_floor_laminate", "prefix": "demo_" },
    { "old": "floor_laminate", "new": "finish_floor_laminate", "prefix": "finish_floor_" }
  ],
  "wall_paint": [
    { "old": "wall_paint", "new": "demo_wall_paint", "prefix": "demo_" },
    { "old": "wall_paint", "new": "finish_wall_man_wall_paint", "prefix": "finish_wall_man_" }
  ]
}
```

---

## 📊 Статистика

- **Всего работ:** 1333
- **Уникальных ID:** 1333 (100%)
- **Дубликатов:** 0 ✅
- **Переименовано ID:** 1226
- **Обновлено цен:** 26,660

---

## 🔧 Использование в коде

### Старый код (до версии 4.1):
```javascript
const workId = 'floor_laminate'; // Неоднозначно!
```

### Новый код (версия 4.1+):
```javascript
// Демонтаж
const demolitionWorkId = 'demo_floor_laminate';

// Монтаж
const installationWorkId = 'finish_floor_laminate';
```

### Получение цены:
```javascript
function getWorkPrice(workId) {
  if (pricesOverrides[workId] !== undefined) {
    return pricesOverrides[workId];
  }
  return pricesData.prices[currentCity]?.[currentMarket]?.[workId] || 0;
}

// Использование
const price = getWorkPrice('finish_floor_laminate'); // Цена монтажа ламината
const demoPrice = getWorkPrice('demo_floor_laminate'); // Цена демонтажа ламината
```

---

## ⚠️ Важные замечания

1. **Обратная совместимость:** Старые ID больше не работают. Необходимо обновить весь код, использующий ID работ.

2. **Файл маппинга:** Используйте `price_list_id_mapping.json` для автоматической миграции кода.

3. **Резервная копия:** Оригинальный прайс-лист сохранён в `prices_list.json.backup`.

4. **Цены:** Все цены автоматически перенесены на новые ID. Проверка показала 100% соответствие.

---

## 🎯 Преимущества новой структуры

1. ✅ **Уникальность:** Каждый ID уникален
2. ✅ **Читаемость:** По префиксу сразу понятна категория работы
3. ✅ **Масштабируемость:** Легко добавлять новые категории
4. ✅ **Безопасность:** Исключены ошибки из-за дубликатов
5. ✅ **Совместимость:** Все цены корректно перенесены

---

## 📝 Следующие шаги

1. ✅ Устранены все дубликаты ID
2. ✅ Обновлены цены для всех новых ID
3. ✅ Создан файл маппинга
4. ⏳ Обновить код калькулятора для использования новых ID
5. ⏳ Протестировать все функции калькулятора
6. ⏳ Обновить документацию

---

## 🔗 Связанные файлы

- `prices_list.json` — Обновленный прайс-лист (версия 4.1)
- `prices_list.json.backup` — Резервная копия (версия 4.0)
- `price_list_id_mapping.json` — Маппинг старых ID на новые
- `PRICE_LIST_AUDIT_REPORT.md` — Отчёт аудита
- `fix_duplicate_ids_v2.js` — Скрипт исправления дубликатов
