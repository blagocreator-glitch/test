// Скрипт для проверки, какие дополнения из prices_list.js отсутствуют в prices_list.json
const fs = require('fs');

// Загружаем JSON
const pricesData = JSON.parse(fs.readFileSync('prices_list.json', 'utf8'));

console.log('=== ПРОВЕРКА СТРУКТУРЫ ===\n');

// 1. Проверяем demolition.construct.openings
const hasOpenings = pricesData?.works?.demolition?.categories?.construct?.subcategories?.openings;
console.log('1. demolition.construct.openings:', hasOpenings ? '✓ ЕСТЬ' : '✗ НЕТ');

if (hasOpenings) {
  const hasDoorSubcat = hasOpenings.subcategories?.door;
  const hasWindowSubcat = hasOpenings.subcategories?.window;
  const hasBalconySubcat = hasOpenings.subcategories?.balcony;
  console.log('   - door подкатегория:', hasDoorSubcat ? '✓' : '✗');
  console.log('   - window подкатегория:', hasWindowSubcat ? '✓' : '✗');
  console.log('   - balcony подкатегория:', hasBalconySubcat ? '✓' : '✗');
}

// 2. Проверяем demolition.construct.stairs
const hasStairs = pricesData?.works?.demolition?.categories?.construct?.subcategories?.stairs;
console.log('\n2. demolition.construct.stairs:', hasStairs ? '✓ ЕСТЬ' : '✗ НЕТ');

if (hasStairs) {
  const hasStaircaseSubcat = hasStairs.subcategories?.staircase;
  const hasRailingSubcat = hasStairs.subcategories?.railing;
  console.log('   - staircase подкатегория:', hasStaircaseSubcat ? '✓' : '✗');
  console.log('   - railing подкатегория:', hasRailingSubcat ? '✓' : '✗');
}

// 3. Проверяем цены для лестниц
console.log('\n3. Проверка цен для лестниц:');
const stairWorkIds = [
  'stair_wooden_remove', 'stair_metal_remove', 'stair_concrete_remove',
  'stair_step_remove', 'stair_cladding_remove', 'stair_baluster_remove',
  'stair_newel_remove', 'railing_wooden_remove', 'railing_metal_remove',
  'railing_glass_remove', 'railing_handrail_remove', 'railing_post_remove'
];

const moscow = pricesData?.prices?.['Москва']?.['Бюджет/Аренда'];
if (moscow) {
  const missingPrices = stairWorkIds.filter(id => moscow[id] === undefined);
  if (missingPrices.length === 0) {
    console.log('   ✓ Все цены для лестниц присутствуют');
  } else {
    console.log('   ✗ Отсутствуют цены для:', missingPrices.join(', '));
  }
} else {
  console.log('   ✗ Не найден раздел цен Москва/Бюджет');
}

// 4. Проверяем installation.finishing.openings
const hasInstallOpenings = pricesData?.works?.installation?.categories?.finishing?.subcategories?.openings;
console.log('\n4. installation.finishing.openings:', hasInstallOpenings ? '✓ ЕСТЬ' : '✗ НЕТ');

if (hasInstallOpenings) {
  const hasDoor = hasInstallOpenings.subcategories?.door;
  const hasWindow = hasInstallOpenings.subcategories?.window;
  const hasBalcony = hasInstallOpenings.subcategories?.balcony;
  console.log('   - door подкатегория:', hasDoor ? '✓' : '✗');
  console.log('   - window подкатегория:', hasWindow ? '✓' : '✗');
  console.log('   - balcony подкатегория:', hasBalcony ? '✓' : '✗');
}

// 5. Проверяем installation.finishing.stairs
const hasInstallStairs = pricesData?.works?.installation?.categories?.finishing?.subcategories?.stairs;
console.log('\n5. installation.finishing.stairs:', hasInstallStairs ? '✓ ЕСТЬ' : '✗ НЕТ');

if (hasInstallStairs) {
  const hasStairInstall = hasInstallStairs.subcategories?.stair_install;
  const hasStairCladding = hasInstallStairs.subcategories?.stair_cladding;
  const hasRailingInstall = hasInstallStairs.subcategories?.railing_install;
  console.log('   - stair_install подкатегория:', hasStairInstall ? '✓' : '✗');
  console.log('   - stair_cladding подкатегория:', hasStairCladding ? '✓' : '✗');
  console.log('   - railing_install подкатегория:', hasRailingInstall ? '✓' : '✗');
}

console.log('\n=== ИТОГ ===');
console.log('Файл prices_list.json уже содержит большую часть структуры.');
console.log('Функции sync* в prices_list.js нужны для обратной совместимости со старыми версиями JSON.');
