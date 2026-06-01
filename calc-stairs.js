// Модуль для работы с лестницами и перилами в калькуляторе
// Иерархическая структура с группами/подгруппами и списками работ

// Получение всех работ из узла прайс-листа
function getWorksFromNode(node) {
  if (!node) return [];
  if (node.items && Array.isArray(node.items)) {
    return node.items.map(item => ({
      id: item.id,
      name: item.name,
      unit: item.unit
    }));
  }
  return [];
}

// Рекурсивный обход структуры для получения всех подгрупп и работ
function buildStairsHierarchy(node, path = []) {
  if (!node) return [];
  
  const result = [];
  
  // Если есть items, это конечный узел с работами
  if (node.items && Array.isArray(node.items)) {
    return [{
      path,
      name: node.name,
      works: node.items.map(item => ({
        id: item.id,
        name: item.name,
        unit: item.unit
      }))
    }];
  }
  
  // Если есть subcategories, рекурсивно обходим
  if (node.subcategories) {
    Object.entries(node.subcategories).forEach(([key, subNode]) => {
      const subResult = buildStairsHierarchy(subNode, [...path, { key, name: subNode.name }]);
      result.push(...subResult);
    });
  }
  
  return result;
}

// Рендер полей для лестниц (новый дизайн с вложенными группами)
function renderStairsFields(roomId, stairsData = {}) {
  if (!window.pricesData?.works?.installation?.categories?.finishing?.subcategories?.stairs) {
    return '<div class="text-gray-500 text-sm p-4">Загрузка данных прайс-листа...</div>';
  }

  const stairsNode = window.pricesData.works.installation.categories.finishing.subcategories.stairs;
  const getItemPrice = (item) => {
    if (typeof getDisplayWorkPrice === 'function') {
      return getDisplayWorkPrice(item);
    }
    return item.min || 0;
  };
  
  let html = '<div class="stairs-hierarchical-container">';

  // Обходим три основные группы
  if (stairsNode.subcategories) {
    Object.entries(stairsNode.subcategories).forEach(([mainKey, mainCat], mainIdx) => {
      html += `
        <div class="mt-3 mb-2">
          <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onclick="toggleRoomContent('stairs_main_${mainIdx}')">
            <i class="fas ${mainCat.icon || 'fa-stairs'} text-brand-500"></i>
            <span class="font-semibold text-sm flex-1">${mainCat.name}</span>
            <i class="fas fa-chevron-down text-xs transition-transform" id="stairs_main_${mainIdx}Icon"></i>
          </div>
          <div class="ml-3 mt-2 space-y-2" id="stairs_main_${mainIdx}" style="display: none">
      `;

      // Обходим подгруппы
      if (mainCat.subcategories) {
        Object.entries(mainCat.subcategories).forEach(([subKey, subCat], subIdx) => {
          html += renderStairsSubGroup(roomId, mainKey, subKey, subCat, stairsData, mainIdx, subIdx, getItemPrice);
        });
      }

      html += `
            <div class="construct-total-row" data-stairs-total-prefix="${mainKey}_">
              <span class="construct-total-label">Итого — ${mainCat.name}:</span>
              <span class="construct-total-val">—</span>
            </div>
          </div>
        </div>
      `;
    });
  }

  html += '</div>';
  return html;
}

// Рендер подгруппы (рекурсивно обрабатывает любую глубину вложенности)
function renderStairsSubGroup(roomId, mainKey, subKey, subCat, stairsData, mainIdx, subIdx, getItemPrice, depth = 0) {
  let html = '';

  // Если есть вложенные подгруппы (рекурсивно обрабатываем)
  if (subCat.subcategories) {
    html += `
      <div class="ml-3 mt-2 mb-2">
        <div class="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onclick="toggleRoomContent('stairs_sub_${mainIdx}_${subIdx}')">
          <i class="fas ${subCat.icon || 'fa-folder'} text-xs"></i>
          <span class="text-sm flex-1">${subCat.name}</span>
          <i class="fas fa-chevron-down text-xs transition-transform" id="stairs_sub_${mainIdx}_${subIdx}Icon"></i>
        </div>
        <div class="ml-3 mt-2 space-y-2" id="stairs_sub_${mainIdx}_${subIdx}" style="display: none">
    `;

    // Рекурсивно обрабатываем вложенные подкатегории
    Object.entries(subCat.subcategories).forEach(([nestedKey, nestedCat], nestedIdx) => {
      const nestedId = `${mainIdx}_${subIdx}_${nestedIdx}`;
      html += renderStairsNestedSubGroup(roomId, mainKey, subKey, nestedKey, nestedCat, stairsData, nestedId, getItemPrice, depth + 1);
    });

    html += `
        </div>
      </div>
    `;
  } else if (subCat.items) {
    // Если сразу есть работы - рендерим с заголовком подгруппы
    html += `
      <div class="ml-3 mt-2 mb-2">
        <div class="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onclick="toggleRoomContent('stairs_sub_${mainIdx}_${subIdx}')">
          <i class="fas ${subCat.icon || 'fa-list'} text-xs"></i>
          <span class="text-sm flex-1">${subCat.name}</span>
          <i class="fas fa-chevron-down text-xs transition-transform" id="stairs_sub_${mainIdx}_${subIdx}Icon"></i>
        </div>
        <div class="ml-3 mt-2 space-y-2" id="stairs_sub_${mainIdx}_${subIdx}" style="display: none">
    `;
    
    html += renderStairsWorksList(roomId, mainKey, subKey, null, subCat, stairsData, mainIdx, subIdx, null, getItemPrice);
    
    html += `
        </div>
      </div>
    `;
  }

  return html;
}

// Рендер вложенной подгруппы (для обработки глубокой вложенности)
function renderStairsNestedSubGroup(roomId, mainKey, subKey, nestedKey, nestedCat, stairsData, nestedId, getItemPrice, depth = 0) {
  let html = '';

  // Если есть ещё более глубокие подкатегории
  if (nestedCat.subcategories) {
    html += `
      <div class="ml-3 mt-2 mb-2">
        <div class="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onclick="toggleRoomContent('stairs_nested_${nestedId}')">
          <i class="fas ${nestedCat.icon || 'fa-list'} text-xs"></i>
          <span class="text-xs flex-1">${nestedCat.name}</span>
          <i class="fas fa-chevron-down text-xs transition-transform" id="stairs_nested_${nestedId}Icon"></i>
        </div>
        <div class="ml-3 mt-2 space-y-2" id="stairs_nested_${nestedId}" style="display: none">
    `;

    // Рекурсивно обрабатываем ещё более глубокие подкатегории
    Object.entries(nestedCat.subcategories).forEach(([deepKey, deepCat], deepIdx) => {
      const deepId = `${nestedId}_${deepIdx}`;
      html += renderStairsNestedSubGroup(roomId, mainKey, subKey, deepKey, deepCat, stairsData, deepId, getItemPrice, depth + 1);
    });

    html += `
        </div>
      </div>
    `;
  } else if (nestedCat.items) {
    // Если есть работы, рендерим их с заголовком подгруппы
    const idParts = nestedId.split('_');
    html += renderStairsWorksList(roomId, mainKey, subKey, nestedKey, nestedCat, stairsData, idParts[0], idParts[1], idParts.slice(2).join('_'), getItemPrice);
  }

  return html;
}

// Рендер списка работ с полями ввода количества (новый дизайн)
function renderStairsWorksList(roomId, mainKey, subKey, subSubKey, node, stairsData, mainIdx, subIdx, subSubIdx, getItemPrice) {
  if (!node.items || !Array.isArray(node.items)) return '';

  let html = '';
  
  // Если есть subSubKey, показываем заголовок подгруппы
  if (subSubKey) {
    html += `
      <div class="ml-3 mt-2 mb-2">
        <div class="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onclick="toggleRoomContent('stairs_subsub_${mainIdx}_${subIdx}_${subSubIdx}')">
          <i class="fas ${node.icon || 'fa-list'} text-xs"></i>
          <span class="text-xs flex-1">${node.name}</span>
          <i class="fas fa-chevron-down text-xs transition-transform" id="stairs_subsub_${mainIdx}_${subIdx}_${subSubIdx}Icon"></i>
        </div>
        <div class="ml-3 mt-2 space-y-2" id="stairs_subsub_${mainIdx}_${subIdx}_${subSubIdx}" style="display: none">
    `;
  }

  // Рендерим каждую работу в новом стиле
  node.items.forEach((work, idx) => {
    const workKey = `${mainKey}_${subKey}_${subSubKey || 'main'}_${work.id}`;
    const currentQty = stairsData?.[workKey]?.qty || 0;
    const isSelected = currentQty > 0;
    const displayPrice = getItemPrice(work);
    const itemTotal = displayPrice * (currentQty || 1);
    
    html += `
      <div class="calc-item ${isSelected ? 'selected' : ''}" 
           data-key="${workKey}" data-cat="stairs"
           onclick="toggleStairsItem(this, '${roomId}', '${workKey}', '${work.id}', '${work.unit}')">
        <div class="calc-checkbox">
          <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium">${work.name}</div>
          <div class="text-xs text-gray-500">
            <span>${displayPrice.toLocaleString('ru-RU')} ₽</span>
            <span class="text-gray-400"> / ${work.unit}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="stairs-item-total bg-brand-500 text-white px-2 py-1 rounded-full text-xs font-medium">${isSelected ? itemTotal.toLocaleString('ru-RU') + ' ₽' : '—'}</span>
          <button class="qty-btn" onclick="event.stopPropagation(); changeStairsQty('${roomId}', '${workKey}', '${work.id}', '${work.unit}', -1)">−</button>
          <input type="number" value="${currentQty || 1}" min="1" max="50"
                 class="qty-input" onchange="changeStairsQty('${roomId}', '${workKey}', '${work.id}', '${work.unit}', 0, this.value)"
                 onclick="event.stopPropagation()">
          <button class="qty-btn" onclick="event.stopPropagation(); changeStairsQty('${roomId}', '${workKey}', '${work.id}', '${work.unit}', 1)">+</button>
        </div>
      </div>
    `;
  });

  html += `
    <div class="construct-subtotal" data-stairs-total-prefix="${mainKey}_${subKey}_${subSubKey || 'main'}_">
      <span class="construct-subtotal-label">Итого по подгруппе:</span>
      <span class="construct-subtotal-val">—</span>
    </div>
  `;
  
  if (subSubKey) {
    html += `
        </div>
      </div>
    `;
  }

  return html;
}

function formatStairsMoney(value) {
  return value > 0 ? `${value.toLocaleString('ru-RU')} ₽` : '—';
}

function getStairsEntryTotal(entry) {
  if (!entry?.workId || typeof getWorkPrice !== 'function') return 0;
  return Math.round((getWorkPrice(entry.workId) || 0) * (parseFloat(entry.qty) || 0));
}

function getStairsPrefixTotal(roomId, prefix) {
  const stairs = roomData.repairData?.[roomId]?.finishing?.stairs || {};
  return Object.entries(stairs).reduce((sum, [key, entry]) => {
    return key.startsWith(prefix) ? sum + getStairsEntryTotal(entry) : sum;
  }, 0);
}

function updateStairsHierarchyTotals(roomId) {
  const root = document.getElementById(`${roomId}_stairsMount_list`);
  if (!root) return;

  root.querySelectorAll('[data-stairs-total-prefix]').forEach(el => {
    const prefix = el.getAttribute('data-stairs-total-prefix') || '';
    const totalEl = el.querySelector('.construct-subtotal-val, .construct-total-val');
    if (totalEl) totalEl.textContent = formatStairsMoney(getStairsPrefixTotal(roomId, prefix));
  });

  root.querySelectorAll('.calc-item[data-key]').forEach(itemEl => {
    const key = itemEl.getAttribute('data-key');
    const entry = roomData.repairData?.[roomId]?.finishing?.stairs?.[key];
    const totalBadge = itemEl.querySelector('.stairs-item-total');
    if (totalBadge) totalBadge.textContent = formatStairsMoney(entry ? getStairsEntryTotal(entry) : 0);
  });

  if (typeof window.updateRepairCategoryTotals === 'function') window.updateRepairCategoryTotals(roomId);
}

// Переключение выбора работы по лестницам
function toggleStairsItem(element, roomId, workKey, workId, unit) {
  const isSelected = element.classList.contains('selected');
  const qtyInput = element.querySelector('input[type="number"]');
  const qty = parseFloat(qtyInput?.value) || 1;
  
  if (!roomData.repairData[roomId]) {
    roomData.repairData[roomId] = { rough: {}, engineering: {}, finishing: {} };
  }
  if (!roomData.repairData[roomId].finishing) {
    roomData.repairData[roomId].finishing = {};
  }
  if (!roomData.repairData[roomId].finishing.stairs) {
    roomData.repairData[roomId].finishing.stairs = {};
  }

  if (isSelected) {
    // Снимаем выбор
    element.classList.remove('selected');
    element.querySelector('.calc-checkbox i').classList.add('hidden');
    delete roomData.repairData[roomId].finishing.stairs[workKey];
  } else {
    // Добавляем выбор
    element.classList.add('selected');
    element.querySelector('.calc-checkbox i').classList.remove('hidden');
    roomData.repairData[roomId].finishing.stairs[workKey] = {
      workId: workId,
      qty: qty,
      unit: unit
    };
  }

  if (typeof updateEstimates === 'function') {
    updateEstimates();
  }
  updateStairsHierarchyTotals(roomId);
}

// Изменение количества работы по лестницам
function changeStairsQty(roomId, workKey, workId, unit, delta, newValue = null) {
  const element = document.querySelector(`[data-key="${workKey}"]`);
  if (!element) return;
  
  const qtyInput = element.querySelector('input[type="number"]');
  if (!qtyInput) return;
  
  let qty = newValue !== null ? parseFloat(newValue) : parseFloat(qtyInput.value) || 1;
  
  if (delta !== 0) {
    qty += delta;
  }
  
  qty = Math.max(1, Math.min(50, qty));
  qtyInput.value = qty;
  
  // Обновляем данные, если работа выбрана
  if (element.classList.contains('selected')) {
    if (!roomData.repairData[roomId]) {
      roomData.repairData[roomId] = { rough: {}, engineering: {}, finishing: {} };
    }
    if (!roomData.repairData[roomId].finishing) {
      roomData.repairData[roomId].finishing = {};
    }
    if (!roomData.repairData[roomId].finishing.stairs) {
      roomData.repairData[roomId].finishing.stairs = {};
    }
    
    roomData.repairData[roomId].finishing.stairs[workKey] = {
      workId: workId,
      qty: qty,
      unit: unit
    };
    
    if (typeof updateEstimates === 'function') {
      updateEstimates();
    }
  }
  updateStairsHierarchyTotals(roomId);
}

// Обновление количества работы (для обратной совместимости)
function updateStairsWorkQty(roomId, workKey, workId, unit, qty) {
  const qtyNum = parseFloat(qty) || 0;
  
  if (!roomData.repairData[roomId]) {
    roomData.repairData[roomId] = { rough: {}, engineering: {}, finishing: {} };
  }
  if (!roomData.repairData[roomId].finishing) {
    roomData.repairData[roomId].finishing = {};
  }
  if (!roomData.repairData[roomId].finishing.stairs) {
    roomData.repairData[roomId].finishing.stairs = {};
  }

  if (qtyNum > 0) {
    roomData.repairData[roomId].finishing.stairs[workKey] = {
      workId: workId,
      qty: qtyNum,
      unit: unit
    };
  } else {
    // Удаляем, если количество 0
    delete roomData.repairData[roomId].finishing.stairs[workKey];
  }

  if (typeof updateEstimates === 'function') {
    updateEstimates();
  }
  updateStairsHierarchyTotals(roomId);
}

// Экспорт функций в глобальную область
window.renderStairsFields = renderStairsFields;
window.updateStairsWorkQty = updateStairsWorkQty;
window.toggleStairsItem = toggleStairsItem;
window.changeStairsQty = changeStairsQty;
window.updateStairsHierarchyTotals = updateStairsHierarchyTotals;
