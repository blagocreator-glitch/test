# Эталонный прайс-лист работ

## Концепция

**Прайс-лист по работам (`prices_list.json`) является единственным источником истины** для всех работ в системе калькулятора ремонта.

## Принципы работы

### ✅ Что МОЖНО делать

1. **Добавлять новые работы** только в `prices_list.json`
2. **Изменять названия работ** только в `prices_list.json`
3. **Изменять единицы измерения** только в `prices_list.json`
4. **Обновлять цены** только в `prices_list.json`
5. **Использовать функции поиска** из `prices_list.js`:
   - `findWorkIdInBranch(branch, rawValue)` - поиск работы по названию
   - `getWorkPrice(workId)` - получение цены с учётом перезаписей
   - `getWorkCatalog()` - получение полного каталога работ

### ❌ Что НЕЛЬЗЯ делать

1. ❌ Создавать работы вне прайс-листа
2. ❌ Дублировать определения работ в других файлах
3. ❌ Хардкодить названия работ в коде
4. ❌ Хардкодить единицы измерения в коде
5. ❌ Переопределять цены без использования системы перезаписей

## Структура данных

```json
{
  "works": {
    "demolition": {
      "categories": {
        "construct": { ... },
        "engineering": { ... },
        "finishing": { ... }
      }
    },
    "installation": {
      "categories": {
        "rough": { ... },
        "engineering": { ... },
        "finishing": { ... }
      }
    }
  },
  "prices": {
    "Москва": {
      "Бюджет/Аренда": { "work_id": 1000, ... },
      "Комфорт": { "work_id": 1150, ... },
      "Бизнес": { "work_id": 1350, ... },
      "Премиум": { "work_id": 1600, ... }
    }
  }
}
```

## Как добавить новую работу

### Шаг 1: Добавить в каталог работ

```json
{
  "works": {
    "installation": {
      "categories": {
        "finishing": {
          "subcategories": {
            "floor": {
              "items": [
                {
                  "id": "new_work_id",
                  "name": "Название новой работы",
                  "unit": "м²"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

### Шаг 2: Добавить цены для всех городов и сегментов

```json
{
  "prices": {
    "Москва": {
      "Бюджет/Аренда": { "new_work_id": 1000 },
      "Комфорт": { "new_work_id": 1150 },
      "Бизнес": { "new_work_id": 1350 },
      "Премиум": { "new_work_id": 1600 }
    },
    "Московская область": {
      "Бюджет/Аренда": { "new_work_id": 900 },
      ...
    }
  }
}
```

### Шаг 3: Использовать в коде

```javascript
// ✅ ПРАВИЛЬНО - используем ID из прайс-листа
const workId = 'new_work_id';
const price = getWorkPrice(workId);

// ✅ ПРАВИЛЬНО - ищем работу по названию
const workId = findWorkIdInBranch(branch, 'Название новой работы');

// ❌ НЕПРАВИЛЬНО - хардкодим название
const workName = 'Название новой работы';
```

## Валидация

Система автоматически проверяет, что все используемые в коде работы есть в прайс-листе.

При загрузке страницы в консоли появится:
- ✅ `Все N используемых работ найдены в эталонном прайс-листе` - всё хорошо
- ⚠️ `Обнаружено N работ, которых нет в эталонном прайс-листе` - нужно добавить работы

Для ручной проверки:

```javascript
// Проверить список workId
const validation = validateWorkIdsAgainstPriceList(['work_id_1', 'work_id_2']);
console.log('Валидные:', validation.valid);
console.log('Невалидные:', validation.invalid);
```

## Примеры использования

### Получение цены работы

```javascript
// Получить цену с учётом города, сегмента и ручных корректировок
const price = getWorkPrice('floor_laminate');
```

### Поиск работы по названию

```javascript
const branch = pricesData.works.installation.categories.finishing.subcategories.floor;
const workId = findWorkIdInBranch(branch, 'Ламинат');
// Вернёт: 'floor_laminate'
```

### Получение каталога работ

```javascript
const catalog = getWorkCatalog();

// Поиск по ID
const work = catalog.byId.get('floor_laminate');
// { id: 'floor_laminate', name: 'Ламинат', unit: 'м²' }

// Поиск по названию
const work = catalog.byName.get('ламинат');
// { id: 'floor_laminate', name: 'Ламинат', unit: 'м²' }
```

## Интеграция с калькулятором

Все функции расчёта сметы используют эталонный прайс-лист:

```javascript
// Автоматический расчёт сметы по разделу "Что нужно сделать"
const estimate = calculateWhatToDoWorksEstimate(roomData);
// {
//   total: 150000,
//   itemCount: 45,
//   lines: [
//     { workId: 'floor_laminate', qty: 20, unitPrice: 500, total: 10000 },
//     ...
//   ]
// }
```

## Миграция существующего кода

Если в коде есть хардкод работ:

### Было (неправильно):
```javascript
const works = [
  { name: 'Ламинат', unit: 'м²', price: 500 },
  { name: 'Плитка', unit: 'м²', price: 800 }
];
```

### Стало (правильно):
```javascript
const workIds = ['floor_laminate', 'floor_ceramic'];
const works = workIds.map(id => ({
  id,
  name: getWorkCatalog().byId.get(id)?.name,
  unit: getWorkCatalog().byId.get(id)?.unit,
  price: getWorkPrice(id)
}));
```

## Поддержка

При возникновении вопросов или проблем:
1. Проверьте консоль браузера на наличие ошибок валидации
2. Убедитесь, что `prices_list.json` загружен корректно
3. Проверьте, что все используемые workId есть в прайс-листе
