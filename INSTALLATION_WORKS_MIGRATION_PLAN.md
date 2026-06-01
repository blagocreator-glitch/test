# План миграции Монтажных работ к эталонному прайс-листу

## Цель
Привести структуру Монтажных работ из раздела "Что нужно сделать" к эталонной структуре из `prices_list.json`.

## Текущая ситуация

### Структура в прайс-листе (prices_list.json)
```
installation (Монтажные работы по ремонту)
├── rough (Черновые работы)
│   ├── floorLeveling (Черновые работы - пол)
│   │   ├── floor_screed (Стяжка пола)
│   │   ├── floor_base_prep (Подготовка основания пола)
│   │   ├── floor_waterproof (Гидроизоляция пола)
│   │   └── floor_sound_insulation (Звукоизоляция пола)
│   ├── wallLeveling (Черновые работы - стены)
│   │   ├── wallWaterproof (Гидроизоляция стен)
│   │   ├── wallPlaster (Штукатурка стен)
│   │   │   ├── plaster_gypsum (Гипсовая штукатурка)
│   │   │   ├── plaster_cement (Цементная штукатурка)
│   │   │   ├── plaster_reinforced (Спецработы)
│   │   │   └── plaster_gkl (ГКЛ и звукоизоляция стен)
│   │   └── wallPutty (Шпаклёвка стен)
│   │       ├── putty_base (Базовая шпаклёвка)
│   │       └── putty_prep (Грунтование и армирование)
│   └── ceilingPrep (Черновые работы - потолок)
│       ├── ceiling_waterproof (Гидроизоляция потолка)
│       ├── ceiling_leveling (Выравнивание потолка)
│       ├── ceiling_putty_prime (Шпаклёвка и грунтование потолка)
│       └── ceiling_insulation (Звуко- и теплоизоляция потолка)
├── engineering (Инженерные работы)
│   ├── electrical (Электрика)
│   │   ├── sockets_switches (Розетки и выключатели)
│   │   ├── wiring (Проводка и кабельные трассы)
│   │   ├── lighting (Освещение)
│   │   ├── panel_protection (Электрощит и защита)
│   │   ├── low_current (Слаботочные системы)
│   │   ├── smart_home (Умный дом и автоматика)
│   │   └── warm_floor_electric (Электрический тёплый пол)
│   ├── ventilation (Монтаж вентиляции / кондиционирования)
│   │   ├── ac (Кондиционирование)
│   │   ├── exhaust (Вытяжная вентиляция)
│   │   ├── supply (Приточная вентиляция и рекуперация)
│   │   └── service (Пусконаладка и обслуживание)
│   ├── water (Водоснабжение)
│   │   ├── pipes (Трубы и разводка)
│   │   ├── collectors_valves (Коллекторы и арматура)
│   │   ├── filtration (Фильтрация и водоподготовка)
│   │   ├── equipment (Подключение оборудования)
│   │   └── protection_service (Защита и обслуживание)
│   ├── drainage (Канализация)
│   │   ├── drain_pipes (Трубы и разводка)
│   │   ├── drain_risers (Стояки и фановая труба)
│   │   ├── drain_outlets (Сливы, трапы и сифоны)
│   │   ├── drain_pumps (Насосное оборудование)
│   │   └── drain_service (Обслуживание и ремонт)
│   └── heating (Отопление)
│       ├── radiators (Радиаторы и конвекторы)
│       ├── heating_pipes (Трубы и разводка)
│       ├── boilers_equipment (Котлы и оборудование)
│       ├── valves_control (Арматура и регулировка)
│       ├── floor_heating (Тёплый пол)
│       └── heating_service (Пусконаладка и обслуживание)
└── finishing (Чистовые работы)
    ├── floor (Чистовые работы - пол)
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
    ├── wall (Чистовые работы - стены)
    │   ├── paint (Покраска стен)
    │   ├── decorative_plaster (Декоративные штукатурки и микроцемент)
    │   ├── panels (Панели и реечные системы)
    │   ├── wood_cork (Пробка и древесные покрытия)
    │   ├── wallpaper (Обои)
    │   └── tile (Плитка и керамогранит)
    └── ceiling (Чистовые работы - потолок)
        ├── paint (Покраска потолка)
        ├── suspended (Подвесные потолки)
        ├── stretch (Натяжные потолки)
        └── decorative (Декоративные потолки)
```

### Текущая структура в calc-init.js
Нужно изучить функцию `renderRepairRoomSection` (строка 2074)

## План работы

### Этап 1: Анализ текущего кода ✅
- [x] Изучить структуру прайс-листа
- [x] Изучить функцию `renderRepairRoomSection`
- [x] Определить все места, где используются монтажные работы
- [x] Создать маппинг старых ID на новые

**Результаты анализа:**
- Монтажные работы используют старые массивы опций: `repairRoughOptions`, `repairEngineeringOptions`, `repairFinishingOptions`
- Функция `renderRepairCategoryFields` генерирует HTML с выпадающими списками из этих массивов
- Функция `updateRepairItem` обновляет данные при изменении
- Функция `checkRepairDone` проверяет заполненность
- Данные хранятся в `roomData.repairData[roomId]` с структурой: `{rough: {...}, engineering: {...}, finishing: {...}}`

### Этап 2: Создание вспомогательных функций ✅
- [x] Создать функции для работы с эталонным прайс-листом монтажных работ (аналогично demolition.js)
- [x] Создать функции `buildInstallationOptionsFromPriceList(categoryPath, selectedWorkId)`
- [x] Создать функции `getInstallationWorkListFromPriceList(categoryPath)`
- [x] Создать файл `installation.js` с эталонными функциями
- [x] Подключить `installation.js` в `index.html`

### Этап 3: Обновление структуры данных ✅
- [x] Заменить использование старых массивов опций на функции из `installation.js`
- [x] Обновить `renderRepairCategoryFields` для использования эталонного прайс-листа
- [x] Обновить `updateRepairItem` для работы с workId из прайс-листа
- [x] Обновить `getRepairEngineeringMeasureMeta` для получения единиц измерения из прайс-листа
- [x] Обновить `getRepairFinishingMeasureMeta` для получения единиц измерения из прайс-листа

**Результаты:**
- Функция `renderRepairCategoryFields` теперь использует `getRepairRoughOptionsFromPriceList`, `getRepairEngineeringOptionsFromPriceList`, `getRepairFinishingOptionsFromPriceList`
- Добавлено сохранение `workId` в `updateRepairItem`
- Функции `getRepairEngineeringMeasureMeta` и `getRepairFinishingMeasureMeta` теперь получают единицы измерения из прайс-листа через `getInstallationWorkUnit`
- Сохранена обратная совместимость со старыми массивами опций (fallback)

### Этап 4: Обновление UI-рендеринга
- [ ] Обновить `renderRepairRoomSection` для использования новой структуры
- [ ] Обновить все связанные функции рендеринга
- [ ] Обновить функции подсчёта итогов

### Этап 5: Тестирование
- [ ] Проверить работу всех секций
- [ ] Проверить сохранение и загрузку данных
- [ ] Проверить расчёт цен
- [ ] Проверить автозаполнение

### Этап 6: Документация
- [ ] Обновить ARCHITECTURE.md
- [ ] Обновить REFERENCE_PRICE_LIST.md
- [ ] Создать CHANGELOG для монтажных работ

## Детальный план изменений

### Файлы для изменения:
1. **calc-init.js** - основная логика рендеринга
2. **calc-utils.js** - утилиты для проверки заполненности
3. **calc-pricing.js** - расчёт цен
4. **Возможно новый файл installation.js** - аналог demolition.js для монтажных работ

### Ключевые функции для обновления:
1. `renderRepairRoomSection(roomId)` - главная функция рендеринга
2. `renderRepairCategoryFields(roomId, category, count)` - рендеринг полей категории
3. `updateRepairItem(roomId, category, index, source)` - обновление данных
4. `checkRepairDone(roomId, subType)` - проверка заполненности
5. `getRepairCategoryConfig(category)` - конфигурация категорий

## Примечания
- Сохранить обратную совместимость с существующими данными
- Использовать те же паттерны, что и в demolition.js
- Все workId должны браться из прайс-листа
- Добавить валидацию workId при загрузке

## Следующие шаги
1. Изучить текущую реализацию `renderRepairRoomSection`
2. Создать детальный маппинг старых категорий на новые
3. Начать реализацию с создания вспомогательных функций
