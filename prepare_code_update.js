// Скрипт для обновления ID работ в коде калькулятора
const fs = require('fs');
const path = require('path');

// Загружаем маппинг ID
const mapping = JSON.parse(fs.readFileSync('price_list_id_mapping.json', 'utf8'));

console.log('🔄 Обновление ID в коде калькулятора...\n');

// Создаём обратный маппинг: старый ID -> список новых ID с контекстом
const reverseMapping = {};
Object.entries(mapping.mappings).forEach(([oldId, newIds]) => {
  reverseMapping[oldId] = newIds;
});

console.log(`📋 Загружено ${Object.keys(reverseMapping).length} маппингов\n`);

// Функция для определения контекста по префиксу
function getContextByPrefix(prefix) {
  if (prefix.startsWith('demo_')) return 'demolition';
  if (prefix.startsWith('rough_')) return 'rough';
  if (prefix.startsWith('eng_')) return 'engineering';
  if (prefix.startsWith('finish_')) return 'finishing';
  return 'unknown';
}

// Функция для создания рекомендаций по замене
function generateReplacementRecommendations() {
  const recommendations = [];
  
  Object.entries(reverseMapping).forEach(([oldId, newIds]) => {
    if (newIds.length === 1) {
      // Простая замена 1:1
      recommendations.push({
        type: 'simple',
        oldId,
        newId: newIds[0].new,
        action: `Заменить '${oldId}' на '${newIds[0].new}'`
      });
    } else {
      // Множественная замена - требует анализа контекста
      recommendations.push({
        type: 'contextual',
        oldId,
        newIds: newIds.map(n => n.new),
        contexts: newIds.map(n => getContextByPrefix(n.prefix)),
        action: `Заменить '${oldId}' на один из:\n` +
                newIds.map(n => `      - '${n.new}' (${getContextByPrefix(n.prefix)})`).join('\n')
      });
    }
  });
  
  return recommendations;
}

// Генерируем рекомендации
const recommendations = generateReplacementRecommendations();

// Разделяем на простые и контекстные замены
const simpleReplacements = recommendations.filter(r => r.type === 'simple');
const contextualReplacements = recommendations.filter(r => r.type === 'contextual');

console.log('📊 Статистика замен:');
console.log(`   - Простых замен (1:1): ${simpleReplacements.length}`);
console.log(`   - Контекстных замен (1:N): ${contextualReplacements.length}`);
console.log(`   - Всего: ${recommendations.length}\n`);

// Создаём файл с рекомендациями
const report = {
  date: new Date().toISOString(),
  summary: {
    totalReplacements: recommendations.length,
    simpleReplacements: simpleReplacements.length,
    contextualReplacements: contextualReplacements.length
  },
  simpleReplacements: simpleReplacements.map(r => ({
    oldId: r.oldId,
    newId: r.newId,
    searchPattern: `['"]${r.oldId}['"]`,
    replaceWith: `'${r.newId}'`
  })),
  contextualReplacements: contextualReplacements.map(r => ({
    oldId: r.oldId,
    options: r.newIds ? r.newIds.map((newId, i) => ({
      newId,
      context: r.contexts ? r.contexts[i] : 'unknown',
      description: getContextDescription(r.contexts ? r.contexts[i] : 'unknown')
    })) : [],
    note: 'Требуется ручной анализ контекста использования'
  }))
};

function getContextDescription(context) {
  const descriptions = {
    'demolition': 'Используется в демонтажных работах',
    'rough': 'Используется в черновых работах',
    'engineering': 'Используется в инженерных работах',
    'finishing': 'Используется в чистовых работах'
  };
  return descriptions[context] || 'Неизвестный контекст';
}

fs.writeFileSync(
  'code_update_recommendations.json',
  JSON.stringify(report, null, 2),
  'utf8'
);

console.log('✅ Создан файл с рекомендациями: code_update_recommendations.json\n');

// Создаём скрипт для автоматической замены простых случаев
const autoReplaceScript = `// Автоматическая замена простых ID (1:1)
// ВНИМАНИЕ: Проверьте результат перед коммитом!

const fs = require('fs');
const path = require('path');

const replacements = ${JSON.stringify(
  simpleReplacements.map(r => ({ from: r.oldId, to: r.newId })),
  null,
  2
)};

// Список файлов для обработки
const filesToProcess = [
  'prices_list.js',
  'calc-core.js',
  'calc-utils.js',
  'demolition.js',
  'calc-init.js',
  'calc-render.js',
  'calc-repair-quest.js',
  'calc-building.js',
  'calc-pricing.js',
  'calc-flow.js'
];

let totalReplacements = 0;

filesToProcess.forEach(filename => {
  const filepath = path.join(__dirname, filename);
  
  if (!fs.existsSync(filepath)) {
    console.log(\`⚠️  Файл не найден: \${filename}\`);
    return;
  }
  
  let content = fs.readFileSync(filepath, 'utf8');
  let fileReplacements = 0;
  
  replacements.forEach(({ from, to }) => {
    // Ищем ID в строках и комментариях
    const patterns = [
      new RegExp(\`['"]\${from}['\"]\`, 'g'),
      new RegExp(\`workId:\\\\s*['"]\${from}['\"]\`, 'g'),
      new RegExp(\`id:\\\\s*['"]\${from}['\"]\`, 'g')
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, (match) => match.replace(from, to));
        fileReplacements += matches.length;
      }
    });
  });
  
  if (fileReplacements > 0) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(\`✓ \${filename}: \${fileReplacements} замен\`);
    totalReplacements += fileReplacements;
  }
});

console.log(\`\\n✅ Всего выполнено замен: \${totalReplacements}\`);
console.log('⚠️  ВАЖНО: Проверьте изменения и протестируйте код!');
`;

fs.writeFileSync('auto_replace_simple_ids.js', autoReplaceScript, 'utf8');

console.log('✅ Создан скрипт автозамены: auto_replace_simple_ids.js\n');

// Создаём руководство по ручной замене
const manualGuide = `# Руководство по обновлению ID в коде

## 🔄 Автоматическая замена (простые случаи)

Для автоматической замены простых ID (1:1) выполните:

\`\`\`bash
node auto_replace_simple_ids.js
\`\`\`

Это обновит ${simpleReplacements.length} простых замен в следующих файлах:
- prices_list.js
- calc-core.js
- calc-utils.js
- demolition.js
- calc-init.js
- calc-render.js
- calc-repair-quest.js
- calc-building.js
- calc-pricing.js
- calc-flow.js

## ⚠️ Ручная замена (контекстные случаи)

Следующие ${contextualReplacements.length} ID требуют ручного анализа контекста:

${contextualReplacements.map(r => `
### \`${r.oldId}\`

Этот ID используется в нескольких контекстах. Выберите правильную замену:

${(r.options || []).map(opt => `- **\`${opt.newId}\`** — ${opt.description}`).join('\n')}

**Как определить правильный контекст:**
1. Найдите все использования \`'${r.oldId}'\` в коде
2. Определите, в каком разделе используется ID:
   - Демонтаж → используйте ID с префиксом \`demo_\`
   - Черновые работы → используйте ID с префиксом \`rough_\`
   - Инженерные работы → используйте ID с префиксом \`eng_\`
   - Чистовые работы → используйте ID с префиксом \`finish_\`
3. Замените на соответствующий новый ID
`).join('\n---\n')}

## 📋 Чек-лист после обновления

- [ ] Выполнена автоматическая замена простых ID
- [ ] Выполнена ручная замена контекстных ID
- [ ] Проверены все файлы калькулятора
- [ ] Запущены тесты (если есть)
- [ ] Проверена работа калькулятора в браузере
- [ ] Проверена корректность расчёта цен
- [ ] Проверена работа демонтажа
- [ ] Проверена работа монтажа
- [ ] Создан коммит с изменениями

## 🔍 Поиск использований ID

Для поиска всех использований конкретного ID:

\`\`\`bash
# Windows
findstr /s /i "old_id_name" *.js

# Unix/Linux/Mac
grep -r "old_id_name" *.js
\`\`\`

## 📊 Статистика

- Всего ID для замены: ${recommendations.length}
- Простых замен: ${simpleReplacements.length}
- Контекстных замен: ${contextualReplacements.length}

## 🔗 Полезные файлы

- \`price_list_id_mapping.json\` — Полный маппинг всех ID
- \`code_update_recommendations.json\` — Детальные рекомендации
- \`PRICE_LIST_NEW_STRUCTURE.md\` — Документация по новой структуре
`;

fs.writeFileSync('CODE_UPDATE_GUIDE.md', manualGuide, 'utf8');

console.log('✅ Создано руководство: CODE_UPDATE_GUIDE.md\n');

console.log('🎉 Подготовка завершена!\n');
console.log('📄 Созданные файлы:');
console.log('   1. code_update_recommendations.json - детальные рекомендации');
console.log('   2. auto_replace_simple_ids.js - скрипт автозамены');
console.log('   3. CODE_UPDATE_GUIDE.md - руководство по обновлению\n');
console.log('🚀 Следующие шаги:');
console.log('   1. Прочитайте CODE_UPDATE_GUIDE.md');
console.log('   2. Запустите auto_replace_simple_ids.js для автозамены');
console.log('   3. Вручную обновите контекстные ID');
console.log('   4. Протестируйте калькулятор');
