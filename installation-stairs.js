// Модуль для монтажных работ по лестницам и перилам
// Дизайн соответствует демонтажным работам

function buildOptions_stairs(workId) {
  const pricesDataToUse = pricesData || window.pricesData;
  if (!pricesDataToUse?.works?.installation?.categories?.finishing?.subcategories?.stairs) {
    return '<option value="">Загрузка...</option>';
  }

  const stairsNode = pricesDataToUse.works.installation.categories.finishing.subcategories.stairs;
  let options = '<option value="">Выберите</option>';

  console.log('=== buildOptions_stairs DEBUG ===');
  console.log('stairsNode.subcategories:', Object.keys(stairsNode.subcategories || {}));

  // Рекурсивная функция для построения иерархии с плоскими optgroup
  function buildHierarchy(node, parentLabel = '', level = 0) {
    let html = '';
    
    if (node?.subcategories) {
      Object.entries(node.subcategories).forEach(([key, subcat]) => {
        const currentLabel = parentLabel ? `${parentLabel} → ${subcat.name}` : subcat.name;
        console.log(`${'  '.repeat(level)}[${key}] ${currentLabel}, items: ${subcat.items?.length || 0}`);
        
        // Если есть items на этом уровне, создаём группу
        if (Array.isArray(subcat.items) && subcat.items.length > 0) {
          html += `<optgroup label="${currentLabel || subcat.name}">`;
          subcat.items.forEach(item => {
            const selected = item.id === workId ? 'selected' : '';
            html += `<option value="${item.id}" ${selected}>${item.name}</option>`;
          });
          html += '</optgroup>';
        }
        
        // Рекурсивно обрабатываем вложенные подкатегории
        if (subcat.subcategories) {
          html += buildHierarchy(subcat, currentLabel, level + 1);
        }
      });
    }
    
    return html;
  }

  options += buildHierarchy(stairsNode);
  console.log('Generated options count:', (options.match(/<option/g) || []).length);
  console.log('Generated optgroups:', (options.match(/<optgroup/g) || []).length);
  console.log('First 500 chars of HTML:', options.substring(0, 500));
  return options;
}

const _stairsQtyMap = {
  // Монтаж лестниц - по материалу
  'finish_stair_mat_stair_install_concrete_straight': 'qty',
  'finish_stair_mat_stair_install_concrete_l_shape': 'qty',
  'finish_stair_mat_stair_install_concrete_u_shape': 'qty',
  'finish_stair_mat_stair_install_concrete_spiral': 'qty',
  'finish_stair_mat_stair_install_metal_straight': 'qty',
  'finish_stair_mat_stair_install_metal_l_shape': 'qty',
  'finish_stair_mat_stair_install_metal_u_shape': 'qty',
  'finish_stair_mat_stair_install_metal_spiral': 'qty',
  'finish_stair_mat_stair_install_wood_straight': 'qty',
  'finish_stair_mat_stair_install_wood_on_metal': 'qty',
  'finish_stair_mat_stair_install_wood_hardwood': 'qty',
  'finish_stair_mat_stair_install_wood_spiral': 'qty',
  'finish_stair_mat_stair_install_stone': 'qty',
  'finish_stair_mat_stair_install_granite': 'qty',
  'finish_stair_mat_stair_install_marble': 'qty',
  'finish_stair_mat_stair_install_composite_dpk': 'qty',
  'finish_stair_mat_stair_install_composite_on_metal': 'qty',
  'finish_stair_mat_stair_install_composite_outdoor': 'qty',
  // Облицовка
  'finish_stair_stair_cladding_porcelain_standard': 'area',
  'finish_stair_stair_cladding_porcelain_large': 'area',
  'finish_stair_stair_cladding_ceramic': 'area',
  'finish_stair_stair_cladding_tile_nosing': 'length',
  'finish_stair_stair_cladding_natural_stone': 'area',
  'finish_stair_stair_cladding_granite': 'area',
  'finish_stair_stair_cladding_marble': 'area',
  'finish_stair_stair_cladding_wood_soft': 'area',
  'finish_stair_stair_cladding_wood_hard': 'area',
  'finish_stair_stair_cladding_engineered_board': 'area',
  'finish_stair_stair_cladding_metal_sheet': 'area',
  'finish_stair_stair_cladding_metal_anti_slip': 'area',
  'finish_stair_stair_cladding_composite': 'area',
  'finish_stair_stair_cladding_dpk_tread': 'area',
  'finish_stair_stair_cladding_terrace_board': 'area',
  // Перила
  'finish_stair_railing_install_wood': 'length',
  'finish_stair_railing_install_wood_handrail': 'length',
  'finish_stair_railing_install_wood_balusters': 'qty',
  'finish_stair_railing_install_metal': 'length',
  'finish_stair_railing_install_stainless': 'length',
  'finish_stair_railing_install_black_metal': 'length',
  'finish_stair_railing_install_glass': 'length',
  'finish_stair_railing_install_glass_profile': 'length',
  'finish_stair_railing_install_glass_point': 'length',
  'finish_stair_railing_install_forged': 'length',
  'finish_stair_railing_install_forged_premium': 'length',
  'finish_stair_railing_install_composite': 'length',
  'finish_stair_railing_install_pvc_handrail': 'length',
  'finish_stair_railing_install_dpk_system': 'length',
};

function render_stairs_Fields(roomId, count) {
  console.log('=== render_stairs_Fields CALLED ===', roomId, count);
  console.log('pricesData exists:', !!pricesData);
  console.log('pricesData.works exists:', !!pricesData?.works);
  console.log('stairs path exists:', !!pricesData?.works?.installation?.categories?.finishing?.subcategories?.stairs);
  
  const container = document.getElementById(roomId + '_stairsList');
  if (!container) {
    console.log('Container NOT found:', roomId + '_stairsList');
    return;
  }
  console.log('Container found:', roomId + '_stairsList');
  
  // Тестовый вызов для проверки
  if (count > 0) {
    const testOptions = buildOptions_stairs('');
    console.log('TEST: buildOptions_stairs returned', testOptions.length, 'chars');
  }
  
  if (!roomData.repairData) roomData.repairData = {};
  if (!roomData.repairData[roomId]) roomData.repairData[roomId] = {};
  if (!roomData.repairData[roomId].finishing) roomData.repairData[roomId].finishing = {};
  if (!roomData.repairData[roomId].finishing.stairs) roomData.repairData[roomId].finishing.stairs = [];

  const qtyLabelMap = {qty: 'Количество, шт:', length: 'Длина, пог. м:', area: 'Площадь, м²:'};

  let html = '';
  for (let i = 0; i < count; i++) {
    const item = roomData.repairData[roomId].finishing.stairs[i] || {};
    const workId = item.workId || '';
    const qf = _stairsQtyMap[workId] || 'qty';
    const qty = item[qf] !== undefined ? item[qf] : '';
    const qtyLabel = qtyLabelMap[qf] || 'Количество, шт:';
    const unitPrice = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
    const qtyNum = parseFloat(qty) || 0;
    const total = (unitPrice > 0 && qtyNum > 0) ? Math.round(unitPrice * qtyNum) : 0;
    const badge = item.manualEntry ? `<span class=\"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300\"><i class=\"fas fa-user text-[10px]\"></i><span>Вручную</span></span>` : '';

    html += `
      <div class=\"mb-2 p-2 bg-white dark:bg-gray-700 rounded border\">
        <div class=\"flex flex-wrap items-center gap-2 mb-1\">${badge}</div>
        <div class=\"flex flex-wrap items-end gap-2\">
          <div>
            <label class=\"text-xs text-gray-500\">Вид работы:</label>
            <select class=\"md:w-[300px] px-2 py-1 text-sm border rounded\"
              onchange=\"update_stairs_Data('${roomId}', ${i}, 'workId', this.value); render_stairs_Fields('${roomId}', ${count})\">
              ${buildOptions_stairs(workId)}
            </select>
          </div>
          <div>
            <label class=\"text-xs text-gray-500\">${qtyLabel}</label>
            <input type=\"number\" step=\"0.01\" min=\"0\" value=\"${qty}\"
              class=\"w-24 px-2 py-1 text-sm border rounded\"
              onchange=\"update_stairs_Data('${roomId}', ${i}, '${qf}', this.value); updateStairsInstallTotals('${roomId}')\"
              oninput=\"update_stairs_Data('${roomId}', ${i}, '${qf}', this.value); updateStairsInstallTotals('${roomId}')\">
          </div>
          <div>
            <label class=\"text-xs text-gray-500\">Цена за ед.:</label>
            <div class=\"construct-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300\">${unitPrice ? unitPrice.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
          <div>
            <label class=\"text-xs text-gray-500\">Итого:</label>
            <div class=\"construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600\">${total ? total.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
        </div>
      </div>`;
  }
  container.innerHTML = html;
  updateStairsInstallTotals(roomId);
}

function update_stairs_Data(roomId, index, field, value) {
  if (!roomData.repairData) roomData.repairData = {};
  if (!roomData.repairData[roomId]) roomData.repairData[roomId] = {};
  if (!roomData.repairData[roomId].finishing) roomData.repairData[roomId].finishing = {};
  if (!roomData.repairData[roomId].finishing.stairs) roomData.repairData[roomId].finishing.stairs = [];
  if (!roomData.repairData[roomId].finishing.stairs[index]) roomData.repairData[roomId].finishing.stairs[index] = {};
  
  const entry = roomData.repairData[roomId].finishing.stairs[index];
  const numFields = ['qty', 'length', 'area'];
  entry[field] = numFields.includes(field) ? (parseFloat(value) || 0) : value;
  if (field === 'workId') entry.manualEntry = true;
  if (numFields.includes(field)) entry.manualEntry = true;
}

function updateStairsInstallCount(roomId, delta) {
  const input = document.getElementById(roomId + '_stairsCount');
  if (!input) return;
  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count + delta));
  input.value = count;
  if (count === 0) {
    if (!roomData.repairData) roomData.repairData = {};
    if (!roomData.repairData[roomId]) roomData.repairData[roomId] = {};
    if (!roomData.repairData[roomId].finishing) roomData.repairData[roomId].finishing = {};
    roomData.repairData[roomId].finishing.stairs = [];
  }
  render_stairs_Fields(roomId, count);
}

function handleStairsInstallInput(roomId) {
  const input = document.getElementById(roomId + '_stairsCount');
  if (!input) return;
  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count));
  input.value = count;
  if (count === 0) {
    if (!roomData.repairData) roomData.repairData = {};
    if (!roomData.repairData[roomId]) roomData.repairData[roomId] = {};
    if (!roomData.repairData[roomId].finishing) roomData.repairData[roomId].finishing = {};
    roomData.repairData[roomId].finishing.stairs = [];
  }
  render_stairs_Fields(roomId, count);
}

function updateStairsInstallTotals(roomId) {
  if (typeof getWorkPrice !== 'function') return;
  const data = roomData.repairData?.[roomId]?.finishing || {};
  const container = document.getElementById(roomId + '_stairsList');
  
  let stairsTotal = 0;
  (data.stairs || []).forEach((item, i) => {
    const workId = item.workId || '';
    if (!workId) return;
    const qf = _stairsQtyMap[workId] || 'qty';
    const qty = parseFloat(item[qf]) || 0;
    const price = getWorkPrice(workId) || 0;
    const rowTotal = Math.round(price * qty);
    stairsTotal += rowTotal;
    
    if (container) {
      const priceCells = container.querySelectorAll('.construct-price-cell');
      if (priceCells[i]) priceCells[i].textContent = price ? price.toLocaleString('ru-RU') + ' ₽' : '—';
      const totalCells = container.querySelectorAll('.construct-total-cell');
      if (totalCells[i]) totalCells[i].textContent = rowTotal ? rowTotal.toLocaleString('ru-RU') + ' ₽' : '—';
    }
  });
  
  const totEl = document.getElementById(roomId + '_stairsInstallTotal');
  if (totEl) totEl.textContent = stairsTotal > 0 ? stairsTotal.toLocaleString('ru-RU') + ' ₽' : '—';
}

// Экспорт функций
window.render_stairs_Fields = render_stairs_Fields;
window.update_stairs_Data = update_stairs_Data;
window.updateStairsInstallCount = updateStairsInstallCount;
window.handleStairsInstallInput = handleStairsInstallInput;
window.updateStairsInstallTotals = updateStairsInstallTotals;

// Рендер вложенных подкатегорий лестниц
function renderStairsSubcategories(roomId) {
  console.log('=== renderStairsSubcategories CALLED ===', roomId);
  const pricesDataToUse = pricesData || window.pricesData;
  if (!pricesDataToUse?.works?.installation?.categories?.finishing?.subcategories?.stairs) {
    console.warn('Stairs data not available');
    return;
  }

  const stairsNode = pricesDataToUse.works.installation.categories.finishing.subcategories.stairs;
  const listContainer = document.getElementById(`${roomId}_stairsMount_list`);
  if (!listContainer) {
    console.warn('List container not found:', `${roomId}_stairsMount_list`);
    return;
  }

  console.log('Stairs node:', stairsNode.name);
  console.log('Subcategories:', Object.keys(stairsNode.subcategories || {}));

  let html = '';

  // Создаём вложенные аккордеоны для каждой основной категории
  if (stairsNode.subcategories) {
    Object.entries(stairsNode.subcategories).forEach(([catKey, category]) => {
      const catId = `${roomId}_stairs_${catKey}`;
      
      html += `
        <div class="repair-work-subgroup mb-2">
          <div class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600" onclick="toggleStairsSubcategory('${catId}')">
            <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${catId}_icon" style="transform: rotate(-90deg)"></i>
            <span>${category.name}</span>
          </div>
          <div id="${catId}_content" class="pl-4 mt-1" style="display: none;">
      `;

      // Если есть вложенные подкатегории, создаём ещё один уровень
      if (category.subcategories) {
        Object.entries(category.subcategories).forEach(([subKey, subcat]) => {
          const subId = `${catId}_${subKey}`;
          
          html += `
            <div class="repair-work-subgroup mb-2">
              <div class="flex items-center gap-2 py-1 cursor-pointer text-xs text-gray-600" onclick="toggleStairsSubcategory('${subId}')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${subId}_icon" style="transform: rotate(-90deg)"></i>
                <span>${subcat.name}</span>
              </div>
              <div id="${subId}_content" class="pl-4 mt-1" style="display: none;">
                <div class="mb-2">
                  <label class="text-xs text-gray-500 mb-1 block">Количество работ:</label>
                  <div class="flex items-center gap-2">
                    <button class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 text-xs" onclick="updateStairsSubcatCount('${roomId}', '${catKey}', '${subKey}', -1)">−</button>
                    <input type="number" id="${subId}_count" value="0" min="0" max="20" class="w-16 px-2 py-1 text-xs border rounded text-center" oninput="handleStairsSubcatInput('${roomId}', '${catKey}', '${subKey}')"/>
                    <button class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 text-xs" onclick="updateStairsSubcatCount('${roomId}', '${catKey}', '${subKey}', 1)">+</button>
                  </div>
                </div>
                <div id="${subId}_list"></div>
                <div class="mt-1 text-xs font-semibold text-right">
                  <span class="text-gray-600">Итого:</span>
                  <span id="${subId}_total" class="text-brand-600 ml-2">—</span>
                </div>
              </div>
            </div>
          `;
        });
      } else if (Array.isArray(category.items)) {
        // Если нет подкатегорий, но есть items напрямую
        html += `
          <div class="mb-2">
            <label class="text-xs text-gray-500 mb-1 block">Количество работ:</label>
            <div class="flex items-center gap-2">
              <button class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 text-xs" onclick="updateStairsSubcatCount('${roomId}', '${catKey}', null, -1)">−</button>
              <input type="number" id="${catId}_count" value="0" min="0" max="20" class="w-16 px-2 py-1 text-xs border rounded text-center" oninput="handleStairsSubcatInput('${roomId}', '${catKey}', null)"/>
              <button class="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 text-xs" onclick="updateStairsSubcatCount('${roomId}', '${catKey}', null, 1)">+</button>
            </div>
          </div>
          <div id="${catId}_list"></div>
          <div class="mt-1 text-xs font-semibold text-right">
            <span class="text-gray-600">Итого:</span>
            <span id="${catId}_total" class="text-brand-600 ml-2">—</span>
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    });
  }

  listContainer.innerHTML = html;
}

function toggleStairsSubcategory(subcatId) {
  const content = document.getElementById(subcatId + '_content');
  const icon = document.getElementById(subcatId + '_icon');
  if (!content) return;

  if (content.style.display === 'none') {
    content.style.display = 'block';
    if (icon) icon.style.transform = 'rotate(0deg)';
  } else {
    content.style.display = 'none';
    if (icon) icon.style.transform = 'rotate(-90deg)';
  }
}

function updateStairsSubcatCount(roomId, catKey, subKey, delta) {
  const subcatId = subKey ? `${roomId}_stairs_${catKey}_${subKey}` : `${roomId}_stairs_${catKey}`;
  const input = document.getElementById(subcatId + '_count');
  if (!input) return;
  
  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count + delta));
  input.value = count;
  
  renderStairsSubcatFields(roomId, catKey, subKey, count);
}

function handleStairsSubcatInput(roomId, catKey, subKey) {
  const subcatId = subKey ? `${roomId}_stairs_${catKey}_${subKey}` : `${roomId}_stairs_${catKey}`;
  const input = document.getElementById(subcatId + '_count');
  if (!input) return;
  
  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count));
  input.value = count;
  
  renderStairsSubcatFields(roomId, catKey, subKey, count);
}

// Рендер полей для конкретной подкатегории
function renderStairsSubcatFields(roomId, catKey, subKey, count) {
  console.log('=== renderStairsSubcatFields ===', roomId, catKey, subKey, count);
  const subcatId = subKey ? `${roomId}_stairs_${catKey}_${subKey}` : `${roomId}_stairs_${catKey}`;
  const listContainer = document.getElementById(subcatId + '_list');
  if (!listContainer) {
    console.warn('List container not found:', subcatId + '_list');
    return;
  }

  const pricesDataToUse = pricesData || window.pricesData;
  if (!pricesDataToUse?.works?.installation?.categories?.finishing?.subcategories?.stairs) {
    console.warn('Stairs data not found in pricesData');
    return;
  }

  // Находим нужную подкатегорию
  const stairsNode = pricesDataToUse.works.installation.categories.finishing.subcategories.stairs;
  let targetNode = stairsNode.subcategories?.[catKey];
  if (subKey && targetNode?.subcategories) {
    targetNode = targetNode.subcategories[subKey];
  }

  if (!targetNode) {
    console.warn('Target node not found:', catKey, subKey);
    return;
  }

  console.log('Target node found:', targetNode.name);

  // Инициализируем данные
  if (!roomData.repairData) roomData.repairData = {};
  if (!roomData.repairData[roomId]) roomData.repairData[roomId] = {};
  if (!roomData.repairData[roomId].finishing) roomData.repairData[roomId].finishing = {};
  if (!roomData.repairData[roomId].finishing.stairsSubcat) roomData.repairData[roomId].finishing.stairsSubcat = {};
  if (!roomData.repairData[roomId].finishing.stairsSubcat[subcatId]) roomData.repairData[roomId].finishing.stairsSubcat[subcatId] = [];

  const dataArray = roomData.repairData[roomId].finishing.stairsSubcat[subcatId];
  const qtyLabelMap = {qty: 'Количество, шт:', length: 'Длина, пог. м:', area: 'Площадь, м²:'};

  let html = '';
  for (let i = 0; i < count; i++) {
    const item = dataArray[i] || {};
    const workId = item.workId || '';
    const qf = _stairsQtyMap[workId] || 'qty';
    const qty = item[qf] !== undefined ? item[qf] : '';
    const qtyLabel = qtyLabelMap[qf] || 'Количество, шт:';
    const unitPrice = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
    const qtyNum = parseFloat(qty) || 0;
    const total = (unitPrice > 0 && qtyNum > 0) ? Math.round(unitPrice * qtyNum) : 0;

    console.log(`Rendering item ${i}: workId=${workId}, qty=${qty}, price=${unitPrice}, total=${total}`);

    html += `
      <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
        <div class="flex flex-wrap items-end gap-2">
          <div>
            <label class="text-xs text-gray-500">Вид работы:</label>
            <select class="md:w-[300px] px-2 py-1 text-sm border rounded"
              onchange="updateStairsSubcatData('${roomId}', '${subcatId}', ${i}, 'workId', this.value); renderStairsSubcatFields('${roomId}', '${catKey}', ${subKey ? "'" + subKey + "'" : 'null'}, ${count})">
              ${buildStairsSubcatOptions(targetNode, workId)}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500">${qtyLabel}</label>
            <input type="number" step="0.01" min="0" value="${qty}"
              class="w-24 px-2 py-1 text-sm border rounded"
              onchange="updateStairsSubcatData('${roomId}', '${subcatId}', ${i}, '${qf}', this.value); updateStairsSubcatTotals('${roomId}', '${subcatId}')"
              oninput="updateStairsSubcatData('${roomId}', '${subcatId}', ${i}, '${qf}', this.value); updateStairsSubcatTotals('${roomId}', '${subcatId}')">
          </div>
          <div>
            <label class="text-xs text-gray-500">Цена за ед.:</label>
            <div class="stairs-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300">${unitPrice ? unitPrice.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
          <div>
            <label class="text-xs text-gray-500">Итого:</label>
            <div class="stairs-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total ? total.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
        </div>
      </div>`;
  }
  listContainer.innerHTML = html;
  console.log('HTML rendered, calling updateStairsSubcatTotals');
  updateStairsSubcatTotals(roomId, subcatId);
}

// Создаём опции для конкретной подкатегории
function buildStairsSubcatOptions(node, selectedWorkId = '') {
  let options = '<option value="">Выберите</option>';

  function collectItems(n, parentLabel = '') {
    let html = '';
    
    if (n?.subcategories) {
      Object.values(n.subcategories).forEach(subcat => {
        const currentLabel = parentLabel ? `${parentLabel} → ${subcat.name}` : subcat.name;
        
        if (Array.isArray(subcat.items) && subcat.items.length > 0) {
          html += `<optgroup label="${currentLabel || subcat.name}">`;
          subcat.items.forEach(item => {
            const selected = item.id === selectedWorkId ? 'selected' : '';
            html += `<option value="${item.id}" ${selected}>${item.name}</option>`;
          });
          html += '</optgroup>';
        }
        
        if (subcat.subcategories) {
          html += collectItems(subcat, currentLabel);
        }
      });
    }
    
    // Если есть items напрямую
    if (Array.isArray(n?.items)) {
      n.items.forEach(item => {
        const selected = item.id === selectedWorkId ? 'selected' : '';
        html += `<option value="${item.id}" ${selected}>${item.name}</option>`;
      });
    }
    
    return html;
  }

  options += collectItems(node);
  return options;
}

function updateStairsSubcatData(roomId, subcatId, index, field, value) {
  if (!roomData.repairData) roomData.repairData = {};
  if (!roomData.repairData[roomId]) roomData.repairData[roomId] = {};
  if (!roomData.repairData[roomId].finishing) roomData.repairData[roomId].finishing = {};
  if (!roomData.repairData[roomId].finishing.stairsSubcat) roomData.repairData[roomId].finishing.stairsSubcat = {};
  if (!roomData.repairData[roomId].finishing.stairsSubcat[subcatId]) roomData.repairData[roomId].finishing.stairsSubcat[subcatId] = [];
  if (!roomData.repairData[roomId].finishing.stairsSubcat[subcatId][index]) roomData.repairData[roomId].finishing.stairsSubcat[subcatId][index] = {};
  
  const entry = roomData.repairData[roomId].finishing.stairsSubcat[subcatId][index];
  const numFields = ['qty', 'length', 'area'];
  entry[field] = numFields.includes(field) ? (parseFloat(value) || 0) : value;
}

function updateStairsSubcatTotals(roomId, subcatId) {
  console.log('=== updateStairsSubcatTotals ===', roomId, subcatId);
  if (typeof getWorkPrice !== 'function') {
    console.warn('getWorkPrice function not available');
    return;
  }
  const data = roomData.repairData?.[roomId]?.finishing?.stairsSubcat?.[subcatId] || [];
  console.log('Data items:', data.length);
  const container = document.getElementById(subcatId + '_list');
  
  let total = 0;
  data.forEach((item, i) => {
    const workId = item.workId || '';
    if (!workId) return;
    const qf = _stairsQtyMap[workId] || 'qty';
    const qty = parseFloat(item[qf]) || 0;
    const price = getWorkPrice(workId) || 0;
    const rowTotal = Math.round(price * qty);
    console.log(`Item ${i}: workId=${workId}, qty=${qty}, price=${price}, total=${rowTotal}`);
    total += rowTotal;
    
    if (container) {
      const priceCells = container.querySelectorAll('.stairs-price-cell');
      if (priceCells[i]) priceCells[i].textContent = price ? price.toLocaleString('ru-RU') + ' ₽' : '—';
      const totalCells = container.querySelectorAll('.stairs-total-cell');
      if (totalCells[i]) totalCells[i].textContent = rowTotal ? rowTotal.toLocaleString('ru-RU') + ' ₽' : '—';
    }
  });
  
  console.log('Total for subcategory:', total);
  const totEl = document.getElementById(subcatId + '_total');
  if (totEl) {
    totEl.textContent = total > 0 ? total.toLocaleString('ru-RU') + ' ₽' : '—';
    console.log('Total element updated');
  } else {
    console.warn('Total element not found:', subcatId + '_total');
  }
}

window.renderStairsSubcategories = renderStairsSubcategories;
window.toggleStairsSubcategory = toggleStairsSubcategory;
window.updateStairsSubcatCount = updateStairsSubcatCount;
window.handleStairsSubcatInput = handleStairsSubcatInput;
window.renderStairsSubcatFields = renderStairsSubcatFields;
window.updateStairsSubcatData = updateStairsSubcatData;
window.updateStairsSubcatTotals = updateStairsSubcatTotals;
