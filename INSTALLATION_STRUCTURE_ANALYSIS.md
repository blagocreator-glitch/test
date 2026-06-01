# Анализ текущей структуры Монтажных работ

## Текущая структура в calc-init.js (renderRepairRoomSection)

### 1. Черновые работы (rough)
```
rough/
├── floorLeveling (Выравнивание пола)
├── wallPlaster (Штукатурка стен)
├── wallPutty (Шпаклевка стен)
└── ceilingPrep (Подготовка потолка)
```

### 2. Инженерные работы (engineering)
```
engineering/
├── electrical (Электрика)
├── ventilation (Монтаж вентиляции / кондиционирования)
├── water (Водоснабжение)
├── drainage (Канализация)
└── heating (Отопление)
```

### 3. Чистовые работы (finishing)
```
finishing/
├── floor (Пол)
├── wall (Стены)
├── ceiling (Потолок)
└── openings/ (Монтаж проемов)
    ├── door (Дверной проем)
    ├── window (Оконный проем)
    └── balcony (Балконный проем)
```

## Структура в прайс-листе (prices_list.json)

### 1. Черновые работы (rough)
```
rough/
├── floorLeveling/ (Черновые работы - пол)
│   ├── floor_screed (Стяжка пола)
│   ├── floor_base_prep (Подготовка основания пола)
│   ├── floor_waterproof (Гидроизоляция пола)
│   └── floor_sound_insulation (Звукоизоляция пола)
├── wallLeveling/ (Черновые работы - стены)
│   ├── wallWaterproof (Гидроизоляция стен)
│   ├── wallPlaster/ (Штукатурка стен)
│   │   ├── plaster_gypsum (Гипсовая штукатурка)
│   │   ├── plaster_cement (Цементная штукатурка)
│   │   ├── plaster_reinforced (Спецработы)
│   │   └── plaster_gkl (ГКЛ и звукоизоляция стен)
│   └── wallPutty/ (Шпаклёвка стен)
│       ├── putty_base (Базовая шпаклёвка)
│       └── putty_prep (Грунтование и армирование)
└── ceilingPrep/ (Черновые работы - потолок)
    ├── ceiling_waterproof (Гидроизоляция потолка)
    ├── ceiling_leveling (Выравнивание потолка)
    ├── ceiling_putty_prime (Шпаклёвка и грунтование потолка)
    └── ceiling_insulation (Звуко- и теплоизоляция потолка)
```

### 2. Инженерные работы (engineering)
```
engineering/
├── electrical/ (Электрика)
│   ├── sockets_switches (Розетки и выключатели)
│   ├── wiring (Проводка и кабельные трассы)
│   ├── lighting (Освещение)
│   ├── panel_protection (Электрощит и защита)
│   ├── low_current (Слаботочные системы)
│   ├── smart_home (Умный дом и автоматика)
│   └── warm_floor_electric (Электрический тёплый пол)
├── ventilation/ (Монтаж вентиляции / кондиционирования)
│   ├── ac (Кондиционирование)
│   ├── exhaust (Вытяжная вентиляция)
│   ├── supply (Приточная вентиляция и рекуперация)
│   └── service (Пусконаладка и обслуживание)
├── water/ (Водоснабжение)
│   ├── pipes (Трубы и разводка)
│   ├── collectors_valves (Коллекторы и арматура)
│   ├── filtration (Фильтрация и водоподготовка)
│   ├── equipment (Подключение оборудования)
│   └── protection_service (Защита и обслуживание)
├── drainage/ (Канализация)
│   ├── drain_pipes (Трубы и разводка)
│   ├── drain_risers (Стояки и фановая труба)
│   ├── drain_outlets (Сливы, трапы и сифоны)
│   ├── drain_pumps (Насосное оборудование)
│   └── drain_service (Обслуживание и ремонт)
└── heating/ (Отопление)
    ├── radiators (Радиаторы и конвекторы)
    ├── heating_pipes (Трубы и разводка)
    ├── boilers_equipment (Котлы и оборудование)
    ├── valves_control (Арматура и регулировка)
    ├── floor_heating (Тёплый пол)
    └── heating_service (Пусконаладка и обслуживание)
```

### 3. Чистовые работы (finishing)
```
finishing/
├── floor/ (Чистовые работы - пол)
│   ├── laminate (Ламинат)
│   ├── linoleum (Линолеум / ПВХ рулонные покрытия)
│   ├── carpet (Ковролин)
│   ├── cork (Пробковые покрытия)
│   ├── general (Сопутствующие и завершающие работы)
│   ├── parquet (Паркет)
│   ├── engineered (Инженерная доска)
│   ├── solid (Массивная доска)
│   ├── tile_ceramic (Плитка)
│   ├── tile_porcelain (Керамогранит)
│   ├── self_leveling (Наливные полы)
│   ├── polymer_coat (Полимерные полы)
│   ├── decorative (Декоративные полы)
│   ├── spc (SPC - замковый кварцвинил)
│   ├── lvt (LVT - клеевой кварцвинил)
│   └── vinyl_roll (Кварцвинил рулонный / мелкоформатный)
├── wall/ (Чистовые работы - стены)
│   ├── paint/ (Покраска стен)
│   │   ├── paint_prep (Подготовка под покраску)
│   │   ├── paint_manual (Ручная покраска)
│   │   └── paint_mech (Механизированная покраска)
│   ├── decorative_plaster (Декоративные штукатурки и микроцемент)
│   ├── panels (Панели и реечные системы)
│   ├── wood_cork (Пробка и древесные покрытия)
│   ├── wallpaper/ (Обои)
│   │   ├── wallpaper_prep (Подготовка под обои)
│   │   ├── wallpaper_paper (Бумажные обои)
│   │   ├── wallpaper_vinyl (Виниловые обои)
│   │   ├── wallpaper_nonwoven (Флизелиновые обои)
│   │   ├── wallpaper_textile (Текстильные обои)
│   │   └── wallpaper_special (Специальные обои)
│   └── tile/ (Плитка и керамогранит)
│       ├── tile_ceramic (Керамическая плитка)
│       ├── tile_porcelain (Керамогранит)
│       └── tile_mosaic (Мозаика)
└── ceiling/ (Чистовые работы - потолок)
    ├── paint/ (Покраска потолка)
    │   ├── ceiling_paint_prep (Подготовка под покраску)
    │   └── ceiling_paint_work (Покраска)
    ├── suspended/ (Подвесные потолки)
    │   ├── gypsum_board (Гипсокартонные потолки)
    │   ├── armstrong (Кассетные потолки Армстронг)
    │   ├── rack (Реечные потолки)
    │   └── grilyato (Грильято)
    ├── stretch/ (Натяжные потолки)
    │   ├── stretch_pvc (ПВХ натяжные потолки)
    │   └── stretch_fabric (Тканевые натяжные потолки)
    └── decorative/ (Декоративные потолки)
        ├── decorative_plaster (Декоративная штукатурка)
        └── decorative_panels (Декоративные панели)
```

## Сравнение и выводы

### ✅ Совпадения (не требуют изменений на верхнем уровне)
1. **Инженерные работы** - структура полностью совпадает:
   - electrical ✅
   - ventilation ✅
   - water ✅
   - drainage ✅
   - heating ✅

### ⚠️ Частичные совпадения (требуют расширения)
1. **Черновые работы** - нужно добавить подкатегории:
   - floorLeveling → нужно добавить подкатегории (floor_screed, floor_base_prep, floor_waterproof, floor_sound_insulation)
   - wallPlaster → нужно добавить подкатегории (plaster_gypsum, plaster_cement, plaster_reinforced, plaster_gkl)
   - wallPutty → нужно добавить подкатегории (putty_base, putty_prep)
   - ceilingPrep → нужно добавить подкатегории (ceiling_waterproof, ceiling_leveling, ceiling_putty_prime, ceiling_insulation)

2. **Чистовые работы** - нужно добавить подкатегории:
   - floor → нужно добавить подкатегории (laminate, linoleum, carpet, cork, parquet, engineered, solid, tile_ceramic, tile_porcelain, self_leveling, polymer_coat, decorative, spc, lvt, vinyl_roll, general)
   - wall → нужно добавить подкатегории (paint, decorative_plaster, panels, wood_cork, wallpaper, tile)
   - ceiling → нужно добавить подкатегории (paint, suspended, stretch, decorative)

### ❌ Отличия (требуют переработки)
1. **Монтаж проемов** - в текущей структуре находится в finishing.openings, но в прайс-листе это отдельные работы, которые могут быть в разных категориях

## Ключевые функции для обновления

### 1. Функции рендеринга
- `renderRepairRoomSection(roomId)` - главная функция
- `renderRepairCategoryFields(roomId, category, count)` - рендеринг полей категории
- `renderRepairOpeningFields(roomId, openingType, count)` - рендеринг проемов

### 2. Функции обновления данных
- `updateRepairCategoryCount(roomId, category, delta)` - изменение количества
- `handleRepairCategoryInput(roomId, category)` - обработка ввода
- `updateRepairItem(roomId, category, index, source)` - обновление элемента

### 3. Функции проверки
- `checkRepairDone(roomId, subType)` - проверка заполненности
- `hasAutoFilledRepairItem(item)` - проверка автозаполнения
- `hasManualEditedRepairItem(item)` - проверка ручного редактирования

### 4. Конфигурационные функции
- `getRepairCategoryConfig(category)` - конфигурация категории
- `getRepairEngineeringOption(category, value)` - опции инженерных работ
- `getRepairFinishingOption(category, value)` - опции чистовых работ

## План миграции

### Этап 1: Создание вспомогательных функций (аналог demolition.js)
Создать файл `installation.js` с функциями:
- `buildOptionsFromInstallationPriceList(categoryPath, selectedWorkId)` - генерация опций из прайс-листа
- `getInstallationWorkListFromPriceList(categoryPath)` - получение списка работ
- Специализированные функции для каждой категории (аналогично `buildOptions_partition`, `buildOptions_door` и т.д.)

### Этап 2: Обновление структуры данных
- Расширить `roomData.repairData` для поддержки подкатегорий
- Создать миграционные функции для старых данных

### Этап 3: Обновление UI
- Обновить `renderRepairRoomSection` для рендеринга подкатегорий
- Обновить все связанные функции рендеринга

### Этап 4: Обновление логики
- Обновить функции подсчета итогов
- Обновить функции проверки заполненности
- Обновить функции автозаполнения

## Следующие шаги
1. ✅ Изучена текущая структура
2. ⏭️ Создать файл `installation.js` с базовыми функциями
3. ⏭️ Обновить структуру данных
4. ⏭️ Обновить UI-рендеринг
5. ⏭️ Тестирование
