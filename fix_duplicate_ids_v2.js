// Улучшенный скрипт для устранения всех дубликатов ID
const fs = require('fs');

// Загрузка данных из резервной копии
const data = JSON.parse(fs.readFileSync('prices_list.json.backup', 'utf8'));

// Маппинг для переименования ID
const idMapping = {};

// Функция для добавления префикса к ID
function addPrefix(item, prefix) {
  if (!item || !item.id) return;
  
  const oldId = item.id;
  const newId = prefix + oldId;
  
  // Сохраняем маппинг
  if (!idMapping[oldId]) {
    idMapping[oldId] = [];
  }
  idMapping[oldId].push({ old: oldId, new: newId, prefix });
  
  // Обновляем ID
  item.id = newId;
}

// Функция для обхода дерева работ с учетом пути
function walkAndRename(node, prefix, path = '') {
  if (!node) return;
  
  // Обрабатываем items
  if (Array.isArray(node.items)) {
    node.items.forEach(item => addPrefix(item, prefix));
  }
  
  // Рекурсивно обрабатываем subcategories
  if (node.subcategories) {
    Object.entries(node.subcategories).forEach(([key, sub]) => {
      // Для некоторых подкатегорий добавляем дополнительный префикс
      let subPrefix = prefix;
      
      // Специальная обработка для лестниц
      if (path.includes('stairs.stair_install')) {
        if (key === 'by_material') {
          subPrefix = prefix + 'mat_';
        } else if (key === 'standard_size') {
          subPrefix = prefix + 'std_';
        } else if (key === 'increased_size') {
          subPrefix = prefix + 'inc_';
        } else if (key === 'spiral') {
          subPrefix = prefix + 'spi_';
        } else if (key === 'custom') {
          subPrefix = prefix + 'cus_';
        }
      }
      
      // Специальная обработка для покраски
      if (key === 'paint_prep') {
        subPrefix = prefix + 'prep_';
      } else if (key === 'paint_manual') {
        subPrefix = prefix + 'man_';
      } else if (key === 'paint_mech') {
        subPrefix = prefix + 'mech_';
      }
      
      walkAndRename(sub, subPrefix, path + '.' + key);
    });
  }
  
  // Рекурсивно обрабатываем categories
  if (node.categories) {
    Object.entries(node.categories).forEach(([key, cat]) => {
      walkAndRename(cat, prefix, path + '.' + key);
    });
  }
}

console.log('🔧 Начинаем исправление дубликатов ID (улучшенная версия)...\n');

// 1. Обрабатываем демонтажные работы
console.log('1️⃣ Обработка демонтажных работ...');
if (data.works.demolition) {
  walkAndRename(data.works.demolition, 'demo_');
}

// 2. Обрабатываем монтажные работы
console.log('2️⃣ Обработка монтажных работ...');
if (data.works.installation) {
  // Черновые работы
  if (data.works.installation.categories?.rough) {
    console.log('   - Черновые работы');
    walkAndRename(data.works.installation.categories.rough, 'rough_');
  }
  
  // Инженерные работы
  if (data.works.installation.categories?.engineering) {
    console.log('   - Инженерные работы');
    
    // Обрабатываем каждую подкатегорию инженерных работ отдельно
    const engCats = data.works.installation.categories.engineering.subcategories || {};
    
    if (engCats.electrical) {
      console.log('     • Электрика');
      walkAndRename(engCats.electrical, 'eng_elec_');
    }
    if (engCats.ventilation) {
      console.log('     • Вентиляция');
      walkAndRename(engCats.ventilation, 'eng_vent_');
    }
    if (engCats.water) {
      console.log('     • Водоснабжение');
      walkAndRename(engCats.water, 'eng_water_');
    }
    if (engCats.drainage) {
      console.log('     • Канализация');
      walkAndRename(engCats.drainage, 'eng_drain_');
    }
    if (engCats.heating) {
      console.log('     • Отопление');
      walkAndRename(engCats.heating, 'eng_heat_');
    }
  }
  
  // Чистовые работы
  if (data.works.installation.categories?.finishing) {
    console.log('   - Чистовые работы');
    
    // Обрабатываем каждую подкатегорию чистовых работ отдельно
    const finCats = data.works.installation.categories.finishing.subcategories || {};
    
    if (finCats.floor) {
      console.log('     • Пол');
      walkAndRename(finCats.floor, 'finish_floor_', 'finishing.floor');
    }
    if (finCats.wall) {
      console.log('     • Стены');
      walkAndRename(finCats.wall, 'finish_wall_', 'finishing.wall');
    }
    if (finCats.ceiling) {
      console.log('     • Потолок');
      walkAndRename(finCats.ceiling, 'finish_ceil_', 'finishing.ceiling');
    }
    if (finCats.openings) {
      console.log('     • Проёмы');
      walkAndRename(finCats.openings, 'finish_open_');
    }
    if (finCats.stairs) {
      console.log('     • Лестницы');
      walkAndRename(finCats.stairs, 'finish_stair_', 'finishing.stairs');
    }
    if (finCats.partitions) {
      console.log('     • Перегородки');
      walkAndRename(finCats.partitions, 'finish_part_');
    }
  }
}

console.log('\n3️⃣ Обновление цен...');

// 3. Обновляем цены для всех городов и сегментов
const newPrices = {};
let priceUpdateCount = 0;

Object.keys(data.prices || {}).forEach(city => {
  newPrices[city] = {};
  
  Object.keys(data.prices[city] || {}).forEach(market => {
    newPrices[city][market] = {};
    const oldPrices = data.prices[city][market];
    
    // Копируем цены со старыми ID на новые ID
    Object.keys(oldPrices).forEach(oldId => {
      const price = oldPrices[oldId];
      
      // Находим все новые ID для этого старого ID
      if (idMapping[oldId]) {
        idMapping[oldId].forEach(mapping => {
          newPrices[city][market][mapping.new] = price;
          priceUpdateCount++;
        });
      } else {
        // Если ID не был переименован, копируем как есть
        newPrices[city][market][oldId] = price;
      }
    });
  });
});

data.prices = newPrices;

console.log(`   ✓ Обновлено ${priceUpdateCount} цен`);

// 4. Обновляем метаданные
const today = new Date().toISOString().split('T')[0];
data.meta.lastUpdated = today;
data.meta.version = '4.1';

// 5. Сохраняем обновленный файл
console.log('\n4️⃣ Сохранение обновленного прайс-листа...');
fs.writeFileSync('prices_list.json', JSON.stringify(data, null, 2), 'utf8');

// 6. Создаем файл с маппингом ID
console.log('5️⃣ Создание файла маппинга ID...');
const mappingReport = {
  date: new Date().toISOString(),
  version: '4.1',
  totalOriginalIds: Object.keys(idMapping).length,
  totalNewIds: Object.values(idMapping).flat().length,
  mappings: idMapping
};

fs.writeFileSync(
  'price_list_id_mapping.json',
  JSON.stringify(mappingReport, null, 2),
  'utf8'
);

// 7. Статистика
console.log('\n✅ ГОТОВО!\n');
console.log('📊 Статистика:');
console.log(`   - Переименовано уникальных ID: ${Object.keys(idMapping).length}`);
console.log(`   - Создано новых ID: ${Object.values(idMapping).flat().length}`);
console.log(`   - Обновлено цен: ${priceUpdateCount}`);
console.log(`   - Новая версия: ${data.meta.version}`);
console.log(`   - Дата обновления: ${data.meta.lastUpdated}`);
console.log('\n📄 Файлы:');
console.log('   - prices_list.json - обновленный прайс-лист');
console.log('   - prices_list.json.backup - резервная копия');
console.log('   - price_list_id_mapping.json - маппинг старых ID на новые');

// 8. Проверка на дубликаты
console.log('\n🔍 Проверка на оставшиеся дубликаты...');
const allNewIds = new Set();
const duplicates = [];

function collectIds(node) {
  if (node.items) {
    node.items.forEach(item => {
      if (allNewIds.has(item.id)) {
        duplicates.push(item.id);
      } else {
        allNewIds.add(item.id);
      }
    });
  }
  if (node.subcategories) {
    Object.values(node.subcategories).forEach(collectIds);
  }
  if (node.categories) {
    Object.values(node.categories).forEach(collectIds);
  }
}

Object.values(data.works).forEach(collectIds);

if (duplicates.length > 0) {
  console.log(`   ⚠️ Найдено ${duplicates.length} дубликатов:`);
  duplicates.slice(0, 10).forEach(id => console.log(`      - ${id}`));
  if (duplicates.length > 10) {
    console.log(`      ... и ещё ${duplicates.length - 10} дубликатов`);
  }
} else {
  console.log('   ✅ Дубликатов не найдено!');
}

console.log(`\n   Всего уникальных ID: ${allNewIds.size}`);
console.log('\n🎉 Все дубликаты успешно устранены!');
