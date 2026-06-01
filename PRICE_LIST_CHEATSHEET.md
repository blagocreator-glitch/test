# Памятка: Работа с эталонным прайс-листом

## Быстрый старт

### ✅ Правильно

```javascript
// Получить цену работы
const price = getWorkPrice('floor_laminate');

// Найти работу по названию
const workId = findWorkIdInBranch(branch, 'Ламинат');

// Получить информацию о работе
const catalog = getWorkCatalog();
const work = catalog.byId.get('floor_laminate');
console.log(work.name, work.unit); // "Ламинат" "м²"
```

### ❌ Неправильно

```javascript
// ❌ Хардкод названия
const workName = 'Ламинат';

// ❌ Хардкод единицы измерения
const unit = 'м²';

// ❌ Хардкод цены
const price = 500;

// ❌ Создание работы вне прайс-листа
const work = { id: 'my_work', name: 'Моя работа', unit: 'шт' };
```

## Добавление новой работы

1. Открыть `prices_list.json`
2. Найти нужную категорию в `works.installation.categories` или `works.demolition.categories`
3. Добавить работу в `items`:
   ```json
   {
     "id": "new_work_id",
     "name": "Название работы",
     "unit": "м²"
   }
   ```
4. Добавить цены для всех городов и сегментов в `prices`:
   ```json
   "Москва": {
     "Бюджет/Аренда": { "new_work_id": 1000 },
     "Комфорт": { "new_work_id": 1150 },
     "Бизнес": { "new_work_id": 1350 },
     "Премиум": { "new_work_id": 1600 }
   }
   ```

## Проверка

Открыть консоль браузера после загрузки страницы:
- ✅ `Все N используемых работ найдены в эталонном прайс-листе` — всё ОК
- ⚠️ `Обнаружено N работ, которых нет в эталонном прайс-листе` — нужно добавить

## Полная документация

📖 [REFERENCE_PRICE_LIST.md](./REFERENCE_PRICE_LIST.md) — подробное руководство
📖 [PRICE_LIST_README.md](./PRICE_LIST_README.md) — описание системы прайс-листа
