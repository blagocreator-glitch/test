// ============================================================================
// INSTALLATION.JS - Монтажные работы (эталонный прайс-лист)
// ============================================================================
// Этот файл содержит функции для работы с монтажными работами из эталонного
// прайс-листа (prices_list.json). Все workId должны браться только из прайс-листа.
//
// Структура прайс-листа: installation.categories.{rough|engineering|finishing}
// ============================================================================

// ✅ ЭТАЛОННАЯ ФУНКЦИЯ: Генерирует опции из прайс-листа для монтажных работ
function buildInstallationOptionsFromPriceList(categoryPath, selectedWorkId = '') {
  if (!window.pricesData?.works?.installation) {
    console.warn('Прайс-лист монтажных работ ещё не загружен');
    return '<option value="">Загрузка...</option>';
  }

  const parts = categoryPath.split('.');
  let node = window.pricesData.works.installation;
  
  for (const part of parts) {
    node = node?.[part];
    if (!node) {
      console.error('Не найден путь в прайс-листе монтажных работ:', categoryPath);
      return '<option value="">Ошибка загрузки</option>';
    }
  }

  let options = '<option value="">Выберите</option>';

  // Рекурсивная функция для построения иерархии с плоскими optgroup
  function buildHierarchy(n, parentLabel = '') {
    let html = '';
    
    if (n?.subcategories) {
      Object.values(n.subcategories).forEach(subcat => {
        const currentLabel = parentLabel ? `${parentLabel} → ${subcat.name}` : subcat.name;
        
        // Если есть items на этом уровне, создаём группу
        if (Array.isArray(subcat.items) && subcat.items.length > 0) {
          html += `<optgroup label="${currentLabel || subcat.name}">`;
          subcat.items.forEach(item => {
            const selected = item.id === selectedWorkId ? 'selected' : '';
            html += `<option value="${item.id}" ${selected}>${item.name}</option>`;
          });
          html += '</optgroup>';
        }
        
        // Рекурсивно обрабатываем вложенные подкатегории
        if (subcat.subcategories) {
          html += buildHierarchy(subcat, currentLabel);
        }
      });
    }
    
    return html;
  }

  // Если у узла есть items напрямую (без подкатегорий)
  if (Array.isArray(node?.items)) {
    node.items.forEach(item => {
      const selected = item.id === selectedWorkId ? 'selected' : '';
      options += `<option value="${item.id}" ${selected}>${item.name}</option>`;
    });
  }

  // Обрабатываем подкатегории
  options += buildHierarchy(node);

  return options;
}

// ✅ ЭТАЛОННАЯ ФУНКЦИЯ: Получает список работ из прайс-листа для автозаполнения
function getInstallationWorkListFromPriceList(categoryPath) {
  if (!window.pricesData?.works?.installation) {
    console.warn('Прайс-лист монтажных работ ещё не загружен');
    return [];
  }

  const parts = categoryPath.split('.');
  let node = window.pricesData.works.installation;
  
  for (const part of parts) {
    node = node?.[part];
    if (!node) {
      console.error('Не найден путь в прайс-листе монтажных работ:', categoryPath);
      return [];
    }
  }

  const items = [];

  function collectItems(n) {
    if (Array.isArray(n?.items)) {
      items.push(...n.items);
    }
    if (n?.subcategories) {
      Object.values(n.subcategories).forEach(collectItems);
    }
  }

  collectItems(node);

  return items.map(item => item.name);
}

// ============================================================================
// ЧЕРНОВЫЕ РАБОТЫ (Rough Works)
// ============================================================================

// Выравнивание пола
function buildOptions_floorLeveling(workId) {
  return buildInstallationOptionsFromPriceList('categories.rough.subcategories.floorLeveling', workId);
}

// Штукатурка стен
function buildOptions_wallPlaster(workId) {
  return buildInstallationOptionsFromPriceList('categories.rough.subcategories.wallLeveling.subcategories.wallPlaster', workId);
}

// Шпаклёвка стен
function buildOptions_wallPutty(workId) {
  return buildInstallationOptionsFromPriceList('categories.rough.subcategories.wallLeveling.subcategories.wallPutty', workId);
}

// Гидроизоляция стен
function buildOptions_wallWaterproof(workId) {
  return buildInstallationOptionsFromPriceList('categories.rough.subcategories.wallLeveling.subcategories.wallWaterproof', workId);
}

// Подготовка потолка
function buildOptions_ceilingPrep(workId) {
  return buildInstallationOptionsFromPriceList('categories.rough.subcategories.ceilingPrep', workId);
}

// Перегородки
function buildOptions_partitions(workId) {
  return buildInstallationOptionsFromPriceList('categories.rough.subcategories.partitions', workId);
}

// ============================================================================
// ИНЖЕНЕРНЫЕ РАБОТЫ (Engineering Works)
// ============================================================================

// Электрика
function buildOptions_electrical_install(workId) {
  return buildInstallationOptionsFromPriceList('categories.engineering.subcategories.electrical', workId);
}

// Вентиляция
function buildOptions_ventilation_install(workId) {
  return buildInstallationOptionsFromPriceList('categories.engineering.subcategories.ventilation', workId);
}

// Водоснабжение
function buildOptions_water_install(workId) {
  return buildInstallationOptionsFromPriceList('categories.engineering.subcategories.water', workId);
}

// Канализация
function buildOptions_drainage_install(workId) {
  return buildInstallationOptionsFromPriceList('categories.engineering.subcategories.drainage', workId);
}

// Отопление
function buildOptions_heating_install(workId) {
  return buildInstallationOptionsFromPriceList('categories.engineering.subcategories.heating', workId);
}

// ============================================================================
// ЧИСТОВЫЕ РАБОТЫ (Finishing Works)
// ============================================================================

// Пол
function buildOptions_floor_install(workId) {
  return buildInstallationOptionsFromPriceList('categories.finishing.subcategories.floor', workId);
}

// Стены
function buildOptions_wall_install(workId) {
  return buildInstallationOptionsFromPriceList('categories.finishing.subcategories.wall', workId);
}

// Потолок
function buildOptions_ceiling_install(workId) {
  return buildInstallationOptionsFromPriceList('categories.finishing.subcategories.ceiling', workId);
}

// Монтаж проёмов
function buildOptions_openings_install(workId) {
  return buildInstallationOptionsFromPriceList('categories.finishing.subcategories.openings', workId);
}

// Лестницы и перила
function buildOptions_stairs_install(workId) {
  return buildInstallationOptionsFromPriceList('categories.finishing.subcategories.stairs', workId);
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

// Привести единицы из прайса к единому виду для полей калькулятора
function normalizeInstallationUnit(unit) {
  return String(unit || 'м²')
    .trim()
    .replace(/\s+/g, ' ')
    .replace('м2', 'м²')
    .replace('м^2', 'м²');
}

function getInstallationMeasureMetaFromUnit(unit, fallbackUnit = 'м²') {
  const normalized = normalizeInstallationUnit(unit || fallbackUnit);
  const compact = normalized.replace(/\s+/g, '').toLowerCase();

  if (compact === 'м²') {
    return { field: 'area', label: 'Площадь, м²', step: '0.01', min: '0', unit: 'м²', integer: false };
  }

  if (compact === 'м' || compact === 'пог.м') {
    const displayUnit = compact === 'пог.м' ? 'пог. м' : 'м';
    return { field: 'length', label: `Длина, ${displayUnit}`, step: '0.1', min: '0', unit: displayUnit, integer: false };
  }

  const displayUnit = normalized === 'шт.' ? 'шт' : normalized;
  const decimalUnits = ['л'];
  return {
    field: 'qty',
    label: `Количество, ${displayUnit}`,
    step: decimalUnits.includes(compact) ? '0.1' : '1',
    min: '0',
    unit: displayUnit,
    integer: !decimalUnits.includes(compact)
  };
}

function getInstallationMeasureMeta(workId, fallbackUnit = 'м²') {
  return getInstallationMeasureMetaFromUnit(getInstallationWorkUnit(workId), fallbackUnit);
}

function getInstallationMeasureTypeFromUnit(unit) {
  return getInstallationMeasureMetaFromUnit(unit).field === 'area'
    ? 'area'
    : getInstallationMeasureMetaFromUnit(unit).field === 'length'
      ? 'length'
      : 'qty';
}

// Получить единицу измерения для работы
function getInstallationWorkUnit(workId) {
  if (!window.pricesData?.works?.installation || !workId) return 'м²';
  
  // Поиск работы во всех категориях
  function findWork(node) {
    if (Array.isArray(node?.items)) {
      const found = node.items.find(item => item.id === workId);
      if (found) return found.unit || 'м²';
    }
    if (node?.subcategories) {
      for (const subcat of Object.values(node.subcategories)) {
        const result = findWork(subcat);
        if (result) return result;
      }
    }
    if (node?.categories) {
      for (const category of Object.values(node.categories)) {
        const result = findWork(category);
        if (result) return result;
      }
    }
    return null;
  }
  
  return findWork(window.pricesData.works.installation) || 'м²';
}

// Получить название работы по ID
function getInstallationWorkName(workId) {
  if (!window.pricesData?.works?.installation || !workId) return '';
  
  function findWork(node) {
    if (Array.isArray(node?.items)) {
      const found = node.items.find(item => item.id === workId);
      if (found) return found.name;
    }
    if (node?.subcategories) {
      for (const subcat of Object.values(node.subcategories)) {
        const result = findWork(subcat);
        if (result) return result;
      }
    }
    if (node?.categories) {
      for (const category of Object.values(node.categories)) {
        const result = findWork(category);
        if (result) return result;
      }
    }
    return null;
  }
  
  return findWork(window.pricesData.works.installation) || '';
}

// Проверить, существует ли работа в прайс-листе
function validateInstallationWorkId(workId) {
  if (!workId) return false;
  return getInstallationWorkName(workId) !== '';
}

// ============================================================================
// ФУНКЦИИ ДЛЯ СОВМЕСТИМОСТИ СО СТАРЫМ КОДОМ
// ============================================================================
// Эти функции возвращают опции в формате, совместимом с текущим кодом

// Получить опции для черновых работ в старом формате
function getRepairRoughOptionsFromPriceList(category) {
  const categoryPaths = {
    floorLeveling: 'categories.rough.subcategories.floorLeveling',
    wallPlaster: 'categories.rough.subcategories.wallLeveling.subcategories.wallPlaster',
    wallPutty: 'categories.rough.subcategories.wallLeveling.subcategories.wallPutty',
    wallWaterproof: 'categories.rough.subcategories.wallLeveling.subcategories.wallWaterproof',
    partitions: 'categories.rough.subcategories.partitions',
    ceilingPrep: 'categories.rough.subcategories.ceilingPrep'
  };
  
  const path = categoryPaths[category];
  if (!path) {
    console.warn('getRepairRoughOptionsFromPriceList: неизвестная категория', category);
    return [];
  }
  
  if (!window.window.pricesData?.works?.installation) {
    console.warn('getRepairRoughOptionsFromPriceList: прайс-лист не загружен');
    return [];
  }
  
  const items = [];
  const parts = path.split('.');
  let node = window.pricesData.works.installation;
  
  for (const part of parts) {
    node = node?.[part];
    if (!node) {
      console.error('getRepairRoughOptionsFromPriceList: не найден путь', path, 'на части', part);
      return [];
    }
  }
  
  function collectItems(n) {
    if (Array.isArray(n?.items)) {
      items.push(...n.items);
    }
    if (n?.subcategories) {
      Object.values(n.subcategories).forEach(collectItems);
    }
  }
  
  collectItems(node);
  
  console.log('getRepairRoughOptionsFromPriceList:', category, 'найдено работ:', items.length);
  
  // Возвращаем массив объектов {value, label} для совместимости
  return items.map(item => ({
    value: item.id,
    label: item.name
  }));
}

// Получить опции для инженерных работ в старом формате
function getRepairEngineeringOptionsFromPriceList(category) {
  const categoryPaths = {
    electrical: 'categories.engineering.subcategories.electrical',
    ventilation: 'categories.engineering.subcategories.ventilation',
    water: 'categories.engineering.subcategories.water',
    drainage: 'categories.engineering.subcategories.drainage',
    heating: 'categories.engineering.subcategories.heating'
  };
  
  const path = categoryPaths[category];
  if (!path || !window.pricesData?.works?.installation) return [];
  
  const items = [];
  const parts = path.split('.');
  let node = window.pricesData.works.installation;
  
  for (const part of parts) {
    node = node?.[part];
    if (!node) return [];
  }
  
  function collectItems(n) {
    if (Array.isArray(n?.items)) {
      items.push(...n.items);
    }
    if (n?.subcategories) {
      Object.values(n.subcategories).forEach(collectItems);
    }
  }
  
  collectItems(node);
  
  // Возвращаем массив объектов {value, label, measure} для совместимости
  return items.map(item => ({
    value: item.id,
    label: item.name,
    measure: getInstallationMeasureTypeFromUnit(item.unit)
  }));
}

// Получить опции для чистовых работ в старом формате
function getRepairFinishingOptionsFromPriceList(category) {
  const categoryPaths = {
    floor: 'categories.finishing.subcategories.floor',
    wall: 'categories.finishing.subcategories.wall',
    ceiling: 'categories.finishing.subcategories.ceiling',
    openings: 'categories.finishing.subcategories.openings',
    stairs: 'categories.finishing.subcategories.stairs'
  };
  
  const path = categoryPaths[category];
  if (!path || !window.pricesData?.works?.installation) return [];
  
  const items = [];
  const parts = path.split('.');
  let node = window.pricesData.works.installation;
  
  for (const part of parts) {
    node = node?.[part];
    if (!node) return [];
  }
  
  function collectItems(n) {
    if (Array.isArray(n?.items)) {
      items.push(...n.items);
    }
    if (n?.subcategories) {
      Object.values(n.subcategories).forEach(collectItems);
    }
  }
  
  collectItems(node);
  
  // Возвращаем массив объектов {value, label, measure} для совместимости
  return items.map(item => ({
    value: item.id,
    label: item.name,
    measure: getInstallationMeasureTypeFromUnit(item.unit)
  }));
}
