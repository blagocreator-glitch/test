function updateDemolitionData() {
  // Data is already saved directly to roomData.
}

// ✅ ЭТАЛОННАЯ ФУНКЦИЯ: Генерирует опции из прайс-листа
function buildOptionsFromPriceList(categoryPath, selectedWorkId = '') {
  if (!pricesData?.works) {
    console.warn('Прайс-лист ещё не загружен');
    return '<option value="">Загрузка...</option>';
  }

  const parts = categoryPath.split('.');
  let node = pricesData.works;
  
  for (const part of parts) {
    node = node?.[part];
    if (!node) {
      console.error('Не найден путь в прайс-листе:', categoryPath);
      return '<option value="">Ошибка загрузки</option>';
    }
  }

  let options = '<option value="">Выберите</option>';
  const items = [];

  // Собираем все items из узла и подкатегорий
  function collectItems(n) {
    if (Array.isArray(n?.items)) {
      items.push(...n.items);
    }
    if (n?.subcategories) {
      Object.values(n.subcategories).forEach(collectItems);
    }
  }

  collectItems(node);

  items.forEach(item => {
    const selected = item.id === selectedWorkId ? 'selected' : '';
    options += `<option value="${item.id}" ${selected}>${item.name}</option>`;
  });

  return options;
}

// ✅ ЭТАЛОННАЯ ФУНКЦИЯ: Получает список работ из прайс-листа для автозаполнения
function getWorkListFromPriceList(categoryPath) {
  if (!pricesData?.works) {
    console.warn('Прайс-лист ещё не загружен');
    return [];
  }

  const parts = categoryPath.split('.');
  let node = pricesData.works;
  
  for (const part of parts) {
    node = node?.[part];
    if (!node) {
      console.error('Не найден путь в прайс-листе:', categoryPath);
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

function buildOptions_partition(workId) {
  return buildOptionsFromPriceList('demolition.categories.construct.subcategories.partitions', workId);
}

function updateConstructTotals(roomId) {
  if (typeof getWorkPrice !== 'function') return;
  const data = roomData.demolitionData?.[roomId] || {};
  const areaWorks = new Set(['door_dismantle_patch', 'window_dismantle_patch', 'balcony_dismantle_patch']);
  const fmt = v => v > 0 ? v.toLocaleString('ru-RU') + ' ₽' : '—';

  // Пересчитываем перегородки
  let partitionsTotal = 0;
  (data.partitions || []).forEach((p, i) => {
    const wid = p.workId || p.material || '';
    if (!wid) return;
    const isPatch  = wid === 'partition_dismantle_patch';
    const isDebris = wid === 'partition_dismantle_debris';
    const isPlinth = wid === 'partition_dismantle_plinth';
    const qty = parseFloat(isPatch || isPlinth ? p.length : isDebris ? p.volume : p.area) || 0;
    const price = getWorkPrice(wid) || 0;
    const total = Math.round(price * qty);
    partitionsTotal += total;

    // Обновляем DOM строки
    const container = document.getElementById(roomId + '_partitionsList');
    if (container) {
      const rows = container.querySelectorAll('.construct-price-cell');
      if (rows[i]) rows[i].textContent = price ? price.toLocaleString('ru-RU') + ' ₽' : '—';
      const totals = container.querySelectorAll('.construct-total-cell');
      if (totals[i]) totals[i].textContent = total ? total.toLocaleString('ru-RU') + ' ₽' : '—';
    }
  });

  // Пересчитываем проёмы
  let openingsTotal = 0;
  ['doorOpenings', 'windowOpenings', 'balconyOpenings'].forEach(field => {
    const typeMap = { doorOpenings: 'door', windowOpenings: 'window', balconyOpenings: 'balcony' };
    const otype = typeMap[field];
    (data[field] || []).forEach((o, i) => {
      const wid = o.workId || o.material || '';
      if (!wid) return;
      const qty = parseFloat(areaWorks.has(wid) ? o.area : o.qty) || 0;
      const price = getWorkPrice(wid) || 0;
      const total = Math.round(price * qty);
      openingsTotal += total;

      const container = document.getElementById(roomId + '_' + otype + 'List');
      if (container) {
        const rows = container.querySelectorAll('.construct-price-cell');
        if (rows[i]) rows[i].textContent = price ? price.toLocaleString('ru-RU') + ' ₽' : '—';
        const totals = container.querySelectorAll('.construct-total-cell');
        if (totals[i]) totals[i].textContent = total ? total.toLocaleString('ru-RU') + ' ₽' : '—';
      }
    });
  });

  // Пересчитываем лестницы и перила
  let stairsTotal = 0;
  (data.staircase || []).forEach((item, i) => {
    const workId = item.workId || '';
    if (!workId) return;
    const qtyField = _staircaseQtyMap[workId] || 'qty';
    const qty = parseFloat(item[qtyField]) || 0;
    const price = getWorkPrice(workId) || 0;
    const total = Math.round(price * qty);
    stairsTotal += total;

    const container = document.getElementById(roomId + '_staircaseList');
    if (container) {
      const rows = container.querySelectorAll('.construct-price-cell');
      if (rows[i]) rows[i].textContent = price ? price.toLocaleString('ru-RU') + ' ₽' : '—';
      const totals = container.querySelectorAll('.construct-total-cell');
      if (totals[i]) totals[i].textContent = total ? total.toLocaleString('ru-RU') + ' ₽' : '—';
    }
  });

  (data.railing || []).forEach((item, i) => {
    const workId = item.workId || '';
    if (!workId) return;
    const qtyField = _railingQtyMap[workId] || 'qty';
    const qty = parseFloat(item[qtyField]) || 0;
    const price = getWorkPrice(workId) || 0;
    const total = Math.round(price * qty);
    stairsTotal += total;

    const container = document.getElementById(roomId + '_railingList');
    if (container) {
      const rows = container.querySelectorAll('.construct-price-cell');
      if (rows[i]) rows[i].textContent = price ? price.toLocaleString('ru-RU') + ' ₽' : '—';
      const totals = container.querySelectorAll('.construct-total-cell');
      if (totals[i]) totals[i].textContent = total ? total.toLocaleString('ru-RU') + ' ₽' : '—';
    }
  });

  const constructTotal = partitionsTotal + openingsTotal + stairsTotal;

  const ptEl = document.getElementById(roomId + '_partitionsTotal');
  if (ptEl) ptEl.textContent = fmt(partitionsTotal);
  const otEl = document.getElementById(roomId + '_openingsTotal');
  if (otEl) otEl.textContent = fmt(openingsTotal);
  const stEl = document.getElementById(roomId + '_stairsTotal');
  if (stEl) stEl.textContent = fmt(stairsTotal);
  const ctEl = document.getElementById(roomId + '_constructTotal');
  if (ctEl) ctEl.textContent = fmt(constructTotal);
}

function updatePartitionCount(roomId, delta) {
  const input = document.getElementById(roomId + '_partitionCount');
  if (!input) return;
  persistPartitionDraft(roomId);

  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count + delta));
  input.value = count;

  // Clear data when count is 0.
  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId].partitions = [];

    // Remove border.
    const headerEl = document.getElementById(roomId + '_partitionsHeader');
    if (headerEl) {
      headerEl.classList.remove('section-done');
      headerEl.classList.remove('px-2', 'py-1');
    }
  }

  renderPartitionFields(roomId, count);

  checkDemolitionDone(roomId, 'partitions');
  checkDemolitionDone(roomId, '_construct');
  syncPartitionConstructState(roomId);
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function handlePartitionInput(roomId) {
  const input = document.getElementById(roomId + '_partitionCount');
  if (!input) return;
  persistPartitionDraft(roomId);

  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count));

  // When count is 0, clear all partition data.
  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId].partitions = [];
  }

  renderPartitionFields(roomId, count);

  checkDemolitionDone(roomId, 'partitions');
  checkDemolitionDone(roomId, '_construct');
  syncPartitionConstructState(roomId);
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function persistPartitionDraft(roomId) {
  const count = parseInt(document.getElementById(roomId + '_partitionCount')?.value, 10) || 0;
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = { partitions: [] };
  if (!Array.isArray(roomData.demolitionData[roomId].partitions)) {
    roomData.demolitionData[roomId].partitions = [];
  }
  for (let i = 0; i < count; i++) {
    const workIdInput = document.getElementById(`${roomId}_partition_${i}_material`);
    const areaInput   = document.getElementById(`${roomId}_partition_${i}_area`);
    const existing    = roomData.demolitionData[roomId].partitions[i] || {};
    const workId      = workIdInput ? workIdInput.value : (existing.workId || existing.material || '');
    const isPatch    = workId === 'partition_dismantle_patch';
    const isDebris2  = workId === 'partition_dismantle_debris';
    const isPlinth2  = workId === 'partition_dismantle_plinth';
    const usesLength = isPatch || isPlinth2;
    const usesVolume = isDebris2;
    roomData.demolitionData[roomId].partitions[i] = {
      ...existing,
      workId,
      material: workId,
      area:   (!usesLength && !usesVolume && areaInput) ? (parseFloat(areaInput.value) || 0) : (parseFloat(existing.area)   || 0),
      length: (usesLength && areaInput)  ? (parseFloat(areaInput.value) || 0) : (parseFloat(existing.length) || 0),
      volume: (usesVolume && areaInput)  ? (parseFloat(areaInput.value) || 0) : (parseFloat(existing.volume) || 0),
    };
  }
}

function renderPartitionFields(roomId, count) {
  const container = document.getElementById(roomId + '_partitionsList');
  if (!container) return;

  let partitions = [];
  if (roomData.demolitionData && roomData.demolitionData[roomId]) {
    partitions = roomData.demolitionData[roomId].partitions || [];
  }

  let html = '';
  for (let i = 0; i < count; i++) {
    const partition = partitions[i] || {};
    const workId  = partition.workId || partition.material || '';
    const isPatch   = workId === 'partition_dismantle_patch';
    const isDebris  = workId === 'partition_dismantle_debris';
    const isPlinth  = workId === 'partition_dismantle_plinth';
    const qty       = isPatch ? (partition.length || '') : isDebris ? (partition.volume || '') : isPlinth ? (partition.length || '') : (partition.area || '');
    const qtyLabel  = isPatch ? 'Длина, м:' : isDebris ? 'Объём, м³:' : isPlinth ? 'Длина, м:' : 'Площадь, м²:';
    const qtyField  = isPatch ? 'length' : isDebris ? 'volume' : isPlinth ? 'length' : 'area';
    const unitPrice = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
    const qtyNum    = parseFloat(qty) || 0;
    const total     = (unitPrice > 0 && qtyNum > 0) ? Math.round(unitPrice * qtyNum) : 0;

    const badge = partition.manualEntry ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"><i class="fas fa-user text-[10px]"></i><span>Вручную</span></span>` : '';
    html += `
      <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
        <div class="flex flex-wrap items-center gap-2 mb-1">${badge}</div>
        <div class="flex flex-wrap items-end gap-2">
          <div>
            <label class="text-xs text-gray-500">Вид работы:</label>
            <select class="md:w-[300px] px-2 py-1 text-sm border rounded"
              onchange="updatePartitionData('${roomId}', ${i}, 'workId', this.value); renderPartitionFields('${roomId}', ${count})">
              ${buildOptions_partition(workId)}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500">${qtyLabel}</label>
            <input type="number" step="0.01" min="0" value="${qty}"
              class="w-24 px-2 py-1 text-sm border rounded"
              onchange="updatePartitionData('${roomId}', ${i}, '${qtyField}', this.value); updateConstructTotals('${roomId}')"
              oninput="updatePartitionData('${roomId}', ${i}, '${qtyField}', this.value); updateConstructTotals('${roomId}')">
          </div>
          <div>
            <label class="text-xs text-gray-500">Цена за ед.:</label>
            <div class="construct-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300">${unitPrice ? unitPrice.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
          <div>
            <label class="text-xs text-gray-500">Итого:</label>
            <div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total ? total.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
        </div>
      </div>`;
  }

  container.innerHTML = html;
  syncPartitionConstructState(roomId);
  updateConstructTotals(roomId);
}

function updatePartitionData(roomId, index, field, value) {
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = { partitions: [] };
  if (!roomData.demolitionData[roomId].partitions[index]) {
    roomData.demolitionData[roomId].partitions[index] = {};
  }
  roomData.demolitionData[roomId].partitions[index][field] = (field === 'area' || field === 'length' || field === 'volume') ? (parseFloat(value) || 0) : value;

  // Синхронизируем workId и material
  if (field === 'workId') roomData.demolitionData[roomId].partitions[index].material = value;
  roomData.demolitionData[roomId].partitions[index].manualEntry = true;

  checkDemolitionDone(roomId, 'partitions');
  checkDemolitionDone(roomId, '_construct');
  syncPartitionConstructState(roomId);
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function syncPartitionConstructState(roomId) {
  const data = roomData.demolitionData?.[roomId];
  const partitionsDone = !!data?.partitions?.some(p => {
    const wid = p.workId || p.material || '';
    if (!wid) return false;
    const isPatch = wid === 'partition_dismantle_patch';
    const isDebris = wid === 'partition_dismantle_debris';
    const isPlinth = wid === 'partition_dismantle_plinth';
    return isPatch || isPlinth ? Number(p.length) > 0 : isDebris ? Number(p.volume) > 0 : Number(p.area) > 0;
  });
  const constructDone = !!(
    partitionsDone ||
    data?.doorOpenings?.some(o => o.length && o.width && o.material) ||
    data?.windowOpenings?.some(o => o.length && o.width && o.material) ||
    data?.balconyOpenings?.some(o => o.length && o.width && o.material)
  );

  const partitionsHeader = document.getElementById(roomId + '_partitionsHeader');
  const constructDoneIcon = document.getElementById(roomId + '_constructDone');

  if (partitionsHeader) {
    partitionsHeader.classList.toggle('section-done', partitionsDone);
    partitionsHeader.classList.remove('rounded', 'px-2', 'py-1');
  }

  if (constructDoneIcon) {
    constructDoneIcon.classList.toggle('hidden', !constructDone);
  }
}
function syncOpeningConstructState(roomId) {
  const data = roomData.demolitionData?.[roomId] || {};
  const areaWorks = new Set(['door_dismantle_patch', 'window_dismantle_patch', 'balcony_dismantle_patch']);

  const typeMap = {
    door:    { field: 'doorOpenings',    headerId: roomId + '_doorOpeningsHeader' },
    window:  { field: 'windowOpenings',  headerId: roomId + '_windowOpeningsHeader' },
    balcony: { field: 'balconyOpenings', headerId: roomId + '_balconyOpeningsHeader' },
  };

  let anyDone = false;

  for (const [, cfg] of Object.entries(typeMap)) {
    const openings = data[cfg.field] || [];
    const isDone = openings.some(o => {
      const wid = o.workId || o.material || '';
      if (!wid) return false;
      const qty = parseFloat(areaWorks.has(wid) ? o.area : o.qty) || 0;
      return qty > 0;
    });
    if (isDone) anyDone = true;
    const headerEl = document.getElementById(cfg.headerId);
    if (headerEl) headerEl.classList.toggle('section-done', isDone);
  }

  // Родительская группа "Демонтаж проёмов"
  const openingsHeader = document.getElementById(roomId + '_openingsHeader');
  if (openingsHeader) openingsHeader.classList.toggle('section-done', anyDone);
}


function savePartitionData(roomId) {
  const input = document.getElementById(roomId + '_partitionCount');
  if (!input) return;

  const count = parseInt(input.value, 10) || 0;
  if (!roomData.demolitionData) roomData.demolitionData = {};
  roomData.demolitionData[roomId] = { partitions: [] };

  for (let i = 0; i < count; i++) {
    roomData.demolitionData[roomId].partitions.push({});
  }

  renderPartitionFields(roomId, count);
}

function updateOpeningCount(roomId, openingType, delta) {
  const input = document.getElementById(roomId + '_' + openingType + 'Count');
  if (!input) return;

  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count + delta));
  input.value = count;

  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId][openingType + 'Openings'] = [];

    const headerEl = document.getElementById(roomId + '_openingsSection');
    if (headerEl) {
      headerEl.classList.remove('section-done');
    }
  }

  renderOpeningFields(roomId, openingType, count);

  checkDemolitionDone(roomId, openingType + 'Openings');
  checkDemolitionDone(roomId, '_openings');
  syncOpeningConstructState(roomId);
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function handleOpeningInput(roomId, openingType) {
  const input = document.getElementById(roomId + '_' + openingType + 'Count');
  if (!input) return;

  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count));

  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId][openingType + 'Openings'] = [];
  }

  renderOpeningFields(roomId, openingType, count);

  checkDemolitionDone(roomId, openingType + 'Openings');
  checkDemolitionDone(roomId, '_openings');
  syncOpeningConstructState(roomId);
}

function buildOptions_door(workId) {
  return buildOptionsFromPriceList('demolition.categories.construct.subcategories.openings.subcategories.door', workId);
}
function buildOptions_window(workId) {
  return buildOptionsFromPriceList('demolition.categories.construct.subcategories.openings.subcategories.window', workId);
}
function buildOptions_balcony(workId) {
  return buildOptionsFromPriceList('demolition.categories.construct.subcategories.openings.subcategories.balcony', workId);
}

function renderOpeningFields(roomId, openingType, count) {
  const container = document.getElementById(roomId + '_' + openingType + 'List');
  if (!container) return;

  let openings = [];
  if (roomData.demolitionData && roomData.demolitionData[roomId]) {
    openings = roomData.demolitionData[roomId][openingType + 'Openings'] || [];
  }

  const areaWorks = new Set(['door_dismantle_patch', 'window_dismantle_patch', 'balcony_dismantle_patch']);
  const buildFn = openingType === 'door' ? buildOptions_door : openingType === 'window' ? buildOptions_window : buildOptions_balcony;

  let html = '';
  for (let i = 0; i < count; i++) {
    const opening   = openings[i] || {};
    const workId    = opening.workId || opening.material || '';
    const isArea    = areaWorks.has(workId);
    const qty       = isArea ? (opening.area || '') : (opening.qty !== undefined ? opening.qty : '');
    const qtyLabel  = isArea ? 'Площадь, м²:' : 'Количество, шт:';
    const qtyField  = isArea ? 'area' : 'qty';
    const unitPrice = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
    const qtyNum    = parseFloat(qty) || 0;
    const total     = (unitPrice > 0 && qtyNum > 0) ? Math.round(unitPrice * qtyNum) : 0;

    const badge = opening.manualEntry ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"><i class="fas fa-user text-[10px]"></i><span>Вручную</span></span>` : '';
    html += `
      <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
        <div class="flex flex-wrap items-center gap-2 mb-1">${badge}</div>
        <div class="flex flex-wrap items-end gap-2">
          <div>
            <label class="text-xs text-gray-500">Вид работы:</label>
            <select class="md:w-[300px] px-2 py-1 text-sm border rounded"
              onchange="updateOpeningData('${roomId}', '${openingType}', ${i}, 'workId', this.value); renderOpeningFields('${roomId}', '${openingType}', ${count})">
              ${buildFn(workId)}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500">${qtyLabel}</label>
            <input type="number" step="0.01" min="0" value="${qty}"
              class="w-24 px-2 py-1 text-sm border rounded"
              onchange="updateOpeningData('${roomId}', '${openingType}', ${i}, '${qtyField}', this.value); updateConstructTotals('${roomId}')"
              oninput="updateOpeningData('${roomId}', '${openingType}', ${i}, '${qtyField}', this.value); updateConstructTotals('${roomId}')">
          </div>
          <div>
            <label class="text-xs text-gray-500">Цена за ед.:</label>
            <div class="construct-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300">${unitPrice ? unitPrice.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
          <div>
            <label class="text-xs text-gray-500">Итого:</label>
            <div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total ? total.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
        </div>
      </div>`;
  }

  container.innerHTML = html;
  checkDemolitionDone(roomId, openingType + 'Openings');
  checkDemolitionDone(roomId, '_openings');
  updateConstructTotals(roomId);
  syncOpeningConstructState(roomId);
}

function updateOpeningData(roomId, openingType, index, field, value) {
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId][openingType + 'Openings']) {
    roomData.demolitionData[roomId][openingType + 'Openings'] = [];
  }
  if (!roomData.demolitionData[roomId][openingType + 'Openings'][index]) {
    roomData.demolitionData[roomId][openingType + 'Openings'][index] = {};
  }
  const entry = roomData.demolitionData[roomId][openingType + 'Openings'][index];
  entry[field] = value;
  // Синхронизируем workId и material
  if (field === 'workId') entry.material = value;
  if (field === 'material') entry.workId = value;
  entry.manualEntry = true;

  checkDemolitionDone(roomId, openingType + 'Openings');
  checkDemolitionDone(roomId, '_openings');
}

function updateElectricalCount(roomId, delta) {
  const input = document.getElementById(roomId + '_electricalCount');
  if (!input) return;

  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count + delta));
  input.value = count;

  // Clear data when count is 0.
  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId].electrical = [];

    // Remove border - try by ID, fallback to text search.
    let headerEl = document.getElementById(roomId + '_electricalHeader');
    if (!headerEl) {
      const spans = document.getElementsByTagName('span');
      for (const span of spans) {
        if (span.textContent === 'Отключение и снятие электрики' && span.closest('[id*="' + roomId + '"]')) {
          headerEl = span.parentElement;
          break;
        }
      }
    }
    if (headerEl) {
      headerEl.classList.remove('section-done');
    }
  }

  render_electrical_Fields(roomId, count);

  checkDemolitionDone(roomId, 'electrical');
  checkDemolitionDone(roomId, '_engineering');
}

function handleElectricalInput(roomId) {
  const input = document.getElementById(roomId + '_electricalCount');
  if (!input) return;

  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count));
  input.value = count;

  // When count is 0, clear all electrical data.
  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId].electrical = [];
  }

  render_electrical_Fields(roomId, count);

  updateDemolitionData();
  checkDemolitionDone(roomId, 'electrical');
  checkDemolitionDone(roomId, '_engineering');
}

function buildOptions_electrical(workId) {
  return buildOptionsFromPriceList('demolition.categories.engineering.subcategories.electrical', workId);
}

function render_electrical_Fields(roomId, count) {
  const container = document.getElementById(roomId + '_electricalList');
  if (!container) return;
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].electrical) roomData.demolitionData[roomId].electrical = [];

  const qtyFieldMap = {'wiring_remove': 'length', 'cable_channel_remove': 'length', 'panel_remove': 'qty', 'socket_remove': 'qty', 'lamp_remove': 'qty', 'chandelier_remove': 'qty', 'wall_lamp_remove': 'qty', 'warm_floor_remove': 'area', 'exhaust_fan_remove': 'qty', 'doorbell_remove': 'qty'};
  const qtyLabelMap = {qty: 'Количество, шт:', length: 'Длина, пог. м:', area: 'Площадь, м²:'};

  let html = '';
  for (let i = 0; i < count; i++) {
    const item = roomData.demolitionData[roomId].electrical[i] || {};
    const workId = item.workId || item.type || '';
    const qf = qtyFieldMap[workId] || 'qty';
    const qty = item[qf] !== undefined ? item[qf] : '';
    const qtyLabel = qtyLabelMap[qf] || 'Количество, шт:';
    const unitPrice = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
    const qtyNum = parseFloat(qty) || 0;
    const total = (unitPrice > 0 && qtyNum > 0) ? Math.round(unitPrice * qtyNum) : 0;
    const badge = item.manualEntry ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"><i class="fas fa-user text-[10px]"></i><span>Вручную</span></span>` : '';

    html += `
      <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
        <div class="flex flex-wrap items-center gap-2 mb-1">${badge}</div>
        <div class="flex flex-wrap items-end gap-2">
          <div>
            <label class="text-xs text-gray-500">Вид работы:</label>
            <select class="md:w-[300px] px-2 py-1 text-sm border rounded"
              onchange="update_electrical_Data('${roomId}', ${i}, 'workId', this.value); render_electrical_Fields('${roomId}', ${count})">
              ${buildOptions_electrical(workId)}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500">${qtyLabel}</label>
            <input type="number" step="0.01" min="0" value="${qty}"
              class="w-24 px-2 py-1 text-sm border rounded"
              onchange="update_electrical_Data('${roomId}', ${i}, '${qf}', this.value); updateElectricalTotals('${roomId}')"
              oninput="update_electrical_Data('${roomId}', ${i}, '${qf}', this.value); updateElectricalTotals('${roomId}')">
          </div>
          <div>
            <label class="text-xs text-gray-500">Цена за ед.:</label>
            <div class="construct-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300">${unitPrice ? unitPrice.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
          <div>
            <label class="text-xs text-gray-500">Итого:</label>
            <div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total ? total.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
        </div>
      </div>`;
  }
  container.innerHTML = html;
  updateElectricalTotals(roomId);
  checkDemolitionDone(roomId, 'electrical');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function updateElectricalTotals(roomId) {
  if (typeof getWorkPrice !== 'function') return;
  const data = roomData.demolitionData?.[roomId] || {};
  const qtyFieldMap = {'wiring_remove': 'length', 'cable_channel_remove': 'length', 'warm_floor_remove': 'area'};
  const container = document.getElementById(roomId + '_electricalList');
  (data.electrical || []).forEach((item, i) => {
    const workId = item.workId || item.type || '';
    if (!workId) return;
    const qf = qtyFieldMap[workId] || 'qty';
    const qty = parseFloat(item[qf]) || 0;
    const price = getWorkPrice(workId) || 0;
    const rowTotal = Math.round(price * qty);
    if (container) {
      const priceCells = container.querySelectorAll('.construct-price-cell');
      if (priceCells[i]) priceCells[i].textContent = price ? price.toLocaleString('ru-RU') + ' ₽' : '—';
      const totalCells = container.querySelectorAll('.construct-total-cell');
      if (totalCells[i]) totalCells[i].textContent = rowTotal ? rowTotal.toLocaleString('ru-RU') + ' ₽' : '—';
    }
  });
}

function update_electrical_Data(roomId, index, field, value) {
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].electrical) roomData.demolitionData[roomId].electrical = [];
  if (!roomData.demolitionData[roomId].electrical[index]) roomData.demolitionData[roomId].electrical[index] = {};
  const entry = roomData.demolitionData[roomId].electrical[index];
  const numFields = ['qty', 'length', 'area'];
  entry[field] = numFields.includes(field) ? (parseFloat(value) || 0) : value;
  if (field === 'workId') { entry.type = value; entry.manualEntry = true; }
  if (numFields.includes(field)) entry.manualEntry = true;
  checkDemolitionDone(roomId, 'electrical');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function updateVentilationCount(roomId, delta) {
  const input = document.getElementById(roomId + '_ventilationCount');
  if (!input) return;
  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count + delta));
  input.value = count;
  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId].ventilation = [];
  }
  render_ventilation_Fields(roomId, count);
  checkDemolitionDone(roomId, 'ventilation');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function handleVentilationInput(roomId) {
  const input = document.getElementById(roomId + '_ventilationCount');
  if (!input) return;
  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count));
  input.value = count;
  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId].ventilation = [];
  }
  render_ventilation_Fields(roomId, count);
  checkDemolitionDone(roomId, 'ventilation');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function buildOptions_ventilation(workId) {
  return buildOptionsFromPriceList('demolition.categories.engineering.subcategories.ventilation', workId);
}

function render_ventilation_Fields(roomId, count) {
  const container = document.getElementById(roomId + '_ventilationList');
  if (!container) return;
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].ventilation) roomData.demolitionData[roomId].ventilation = [];

  const qtyFieldMap = {'ac_remove': 'qty', 'vent_fan_remove': 'qty', 'air_duct_remove': 'length'};
  const qtyLabelMap = {qty: 'Количество, шт:', length: 'Длина, пог. м:', area: 'Площадь, м²:'};

  let html = '';
  for (let i = 0; i < count; i++) {
    const item = roomData.demolitionData[roomId].ventilation[i] || {};
    const workId = item.workId || item.type || '';
    const qf = qtyFieldMap[workId] || 'qty';
    const qty = item[qf] !== undefined ? item[qf] : '';
    const qtyLabel = qtyLabelMap[qf] || 'Количество, шт:';
    const unitPrice = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
    const qtyNum = parseFloat(qty) || 0;
    const total = (unitPrice > 0 && qtyNum > 0) ? Math.round(unitPrice * qtyNum) : 0;
    const badge = item.manualEntry ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"><i class="fas fa-user text-[10px]"></i><span>Вручную</span></span>` : '';

    html += `
      <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
        <div class="flex flex-wrap items-center gap-2 mb-1">${badge}</div>
        <div class="flex flex-wrap items-end gap-2">
          <div>
            <label class="text-xs text-gray-500">Вид работы:</label>
            <select class="md:w-[300px] px-2 py-1 text-sm border rounded"
              onchange="update_ventilation_Data('${roomId}', ${i}, 'workId', this.value); render_ventilation_Fields('${roomId}', ${count})">
              ${buildOptions_ventilation(workId)}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500">${qtyLabel}</label>
            <input type="number" step="0.01" min="0" value="${qty}"
              class="w-24 px-2 py-1 text-sm border rounded"
              onchange="update_ventilation_Data('${roomId}', ${i}, '${qf}', this.value); updateVentilationTotals('${roomId}')"
              oninput="update_ventilation_Data('${roomId}', ${i}, '${qf}', this.value); updateVentilationTotals('${roomId}')">
          </div>
          <div>
            <label class="text-xs text-gray-500">Цена за ед.:</label>
            <div class="construct-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300">${unitPrice ? unitPrice.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
          <div>
            <label class="text-xs text-gray-500">Итого:</label>
            <div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total ? total.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
        </div>
      </div>`;
  }
  container.innerHTML = html;
  updateVentilationTotals(roomId);
  checkDemolitionDone(roomId, 'ventilation');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function updateVentilationTotals(roomId) {
  if (typeof getWorkPrice !== 'function') return;
  const data = roomData.demolitionData?.[roomId] || {};
  const qtyFieldMap = {'air_duct_remove': 'length'};
  const container = document.getElementById(roomId + '_ventilationList');
  (data.ventilation || []).forEach((item, i) => {
    const workId = item.workId || item.type || '';
    if (!workId) return;
    const qf = qtyFieldMap[workId] || 'qty';
    const qty = parseFloat(item[qf]) || 0;
    const price = getWorkPrice(workId) || 0;
    const rowTotal = Math.round(price * qty);
    if (container) {
      const priceCells = container.querySelectorAll('.construct-price-cell');
      if (priceCells[i]) priceCells[i].textContent = price ? price.toLocaleString('ru-RU') + ' ₽' : '—';
      const totalCells = container.querySelectorAll('.construct-total-cell');
      if (totalCells[i]) totalCells[i].textContent = rowTotal ? rowTotal.toLocaleString('ru-RU') + ' ₽' : '—';
    }
  });
}

function update_ventilation_Data(roomId, index, field, value) {
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].ventilation) roomData.demolitionData[roomId].ventilation = [];
  if (!roomData.demolitionData[roomId].ventilation[index]) roomData.demolitionData[roomId].ventilation[index] = {};
  const entry = roomData.demolitionData[roomId].ventilation[index];
  const numFields = ['qty', 'length', 'area'];
  entry[field] = numFields.includes(field) ? (parseFloat(value) || 0) : value;
  if (field === 'workId') { entry.type = value; entry.manualEntry = true; }
  if (numFields.includes(field)) entry.manualEntry = true;
  checkDemolitionDone(roomId, 'ventilation');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function updateWaterCount(roomId, delta) {
  const input = document.getElementById(roomId + '_waterCount');
  if (!input) return;
  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count + delta));
  input.value = count;
  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId].water = [];
  }
  render_water_Fields(roomId, count);
  checkDemolitionDone(roomId, 'water');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function handleWaterInput(roomId) {
  const input = document.getElementById(roomId + '_waterCount');
  if (!input) return;
  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count));
  input.value = count;
  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId].water = [];
  }
  render_water_Fields(roomId, count);
  checkDemolitionDone(roomId, 'water');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function buildOptions_water(workId) {
  return buildOptionsFromPriceList('demolition.categories.engineering.subcategories.water', workId);
}

function render_water_Fields(roomId, count) {
  const container = document.getElementById(roomId + '_waterList');
  if (!container) return;
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].water) roomData.demolitionData[roomId].water = [];

  const qtyFieldMap = {'steel_pipe_15': 'length', 'steel_pipe_20': 'length', 'steel_pipe_25': 'length', 'steel_pipe_32': 'length', 'steel_pipe_40': 'length', 'steel_pipe_50': 'length', 'copper_pipe_10': 'length', 'copper_pipe_12': 'length', 'copper_pipe_15': 'length', 'copper_pipe_18': 'length', 'copper_pipe_22': 'length', 'copper_pipe_28': 'length', 'pp_pipe_16': 'length', 'pp_pipe_20': 'length', 'pp_pipe_25': 'length', 'pp_pipe_32': 'length', 'pp_pipe_40': 'length', 'metalplastic_pipe_16': 'length', 'metalplastic_pipe_20': 'length', 'metalplastic_pipe_25': 'length', 'metalplastic_pipe_32': 'length', 'pex_pipe_16': 'length', 'pex_pipe_20': 'length', 'pex_pipe_25': 'length', 'valve_remove': 'qty', 'collector_remove': 'qty', 'filter_remove': 'qty', 'reducer_remove': 'qty'};
  const qtyLabelMap = {qty: 'Количество, шт:', length: 'Длина, пог. м:', area: 'Площадь, м²:'};

  let html = '';
  for (let i = 0; i < count; i++) {
    const item = roomData.demolitionData[roomId].water[i] || {};
    const workId = item.workId || item.type || '';
    const qf = qtyFieldMap[workId] || 'qty';
    const qty = item[qf] !== undefined ? item[qf] : '';
    const qtyLabel = qtyLabelMap[qf] || 'Количество, шт:';
    const unitPrice = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
    const qtyNum = parseFloat(qty) || 0;
    const total = (unitPrice > 0 && qtyNum > 0) ? Math.round(unitPrice * qtyNum) : 0;
    const badge = item.manualEntry ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"><i class="fas fa-user text-[10px]"></i><span>Вручную</span></span>` : '';

    html += `
      <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
        <div class="flex flex-wrap items-center gap-2 mb-1">${badge}</div>
        <div class="flex flex-wrap items-end gap-2">
          <div>
            <label class="text-xs text-gray-500">Вид работы:</label>
            <select class="md:w-[300px] px-2 py-1 text-sm border rounded"
              onchange="update_water_Data('${roomId}', ${i}, 'workId', this.value); render_water_Fields('${roomId}', ${count})">
              ${buildOptions_water(workId)}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500">${qtyLabel}</label>
            <input type="number" step="0.01" min="0" value="${qty}"
              class="w-24 px-2 py-1 text-sm border rounded"
              onchange="update_water_Data('${roomId}', ${i}, '${qf}', this.value); updateWaterTotals('${roomId}')"
              oninput="update_water_Data('${roomId}', ${i}, '${qf}', this.value); updateWaterTotals('${roomId}')">
          </div>
          <div>
            <label class="text-xs text-gray-500">Цена за ед.:</label>
            <div class="construct-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300">${unitPrice ? unitPrice.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
          <div>
            <label class="text-xs text-gray-500">Итого:</label>
            <div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total ? total.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
        </div>
      </div>`;
  }
  container.innerHTML = html;
  updateWaterTotals(roomId);
  checkDemolitionDone(roomId, 'water');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function updateWaterTotals(roomId) {
  if (typeof getWorkPrice !== 'function') return;
  const data = roomData.demolitionData?.[roomId] || {};
  const qtyFieldMap = {'steel_pipe_15':'length','steel_pipe_20':'length','steel_pipe_25':'length','steel_pipe_32':'length','steel_pipe_40':'length','steel_pipe_50':'length','copper_pipe_10':'length','copper_pipe_12':'length','copper_pipe_15':'length','copper_pipe_18':'length','copper_pipe_22':'length','copper_pipe_28':'length','pp_pipe_16':'length','pp_pipe_20':'length','pp_pipe_25':'length','pp_pipe_32':'length','pp_pipe_40':'length','metalplastic_pipe_16':'length','metalplastic_pipe_20':'length','metalplastic_pipe_25':'length','metalplastic_pipe_32':'length','pex_pipe_16':'length','pex_pipe_20':'length','pex_pipe_25':'length'};
  const container = document.getElementById(roomId + '_waterList');
  (data.water || []).forEach((item, i) => {
    const workId = item.workId || item.type || '';
    if (!workId) return;
    const qf = qtyFieldMap[workId] || 'qty';
    const qty = parseFloat(item[qf]) || 0;
    const price = getWorkPrice(workId) || 0;
    const rowTotal = Math.round(price * qty);
    if (container) {
      const priceCells = container.querySelectorAll('.construct-price-cell');
      if (priceCells[i]) priceCells[i].textContent = price ? price.toLocaleString('ru-RU') + ' ₽' : '—';
      const totalCells = container.querySelectorAll('.construct-total-cell');
      if (totalCells[i]) totalCells[i].textContent = rowTotal ? rowTotal.toLocaleString('ru-RU') + ' ₽' : '—';
    }
  });
}

function update_water_Data(roomId, index, field, value) {
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].water) roomData.demolitionData[roomId].water = [];
  if (!roomData.demolitionData[roomId].water[index]) roomData.demolitionData[roomId].water[index] = {};
  const entry = roomData.demolitionData[roomId].water[index];
  const numFields = ['qty', 'length', 'area'];
  entry[field] = numFields.includes(field) ? (parseFloat(value) || 0) : value;
  if (field === 'workId') { entry.type = value; entry.manualEntry = true; }
  if (numFields.includes(field)) entry.manualEntry = true;
  checkDemolitionDone(roomId, 'water');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function buildOptions_drainage(workId) {
  return buildOptionsFromPriceList('demolition.categories.engineering.subcategories.drainage', workId);
}

function render_drainage_Fields(roomId, count) {
  const container = document.getElementById(roomId + '_drainageList');
  if (!container) return;
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].drainage) roomData.demolitionData[roomId].drainage = [];

  const qtyFieldMap = {'cast_iron_50': 'length', 'cast_iron_100': 'length', 'cast_iron_150': 'length', 'flue_110': 'length', 'flue_160': 'length', 'plastic_32': 'length', 'plastic_40': 'length', 'plastic_50': 'length', 'plastic_110': 'length', 'plastic_160': 'length', 'drainage_fitting_remove': 'qty', 'syphon_remove': 'qty', 'drainage_stand_remove': 'qty', 'hydrolock_remove': 'qty', 'revision_luk_remove': 'qty', 'well_remove': 'qty'};
  const qtyLabelMap = {qty: 'Количество, шт:', length: 'Длина, пог. м:', area: 'Площадь, м²:'};

  let html = '';
  for (let i = 0; i < count; i++) {
    const item = roomData.demolitionData[roomId].drainage[i] || {};
    const workId = item.workId || item.type || '';
    const qf = qtyFieldMap[workId] || 'qty';
    const qty = item[qf] !== undefined ? item[qf] : '';
    const qtyLabel = qtyLabelMap[qf] || 'Количество, шт:';
    const unitPrice = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
    const qtyNum = parseFloat(qty) || 0;
    const total = (unitPrice > 0 && qtyNum > 0) ? Math.round(unitPrice * qtyNum) : 0;
    const badge = item.manualEntry ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"><i class="fas fa-user text-[10px]"></i><span>Вручную</span></span>` : '';

    html += `
      <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
        <div class="flex flex-wrap items-center gap-2 mb-1">${badge}</div>
        <div class="flex flex-wrap items-end gap-2">
          <div>
            <label class="text-xs text-gray-500">Вид работы:</label>
            <select class="md:w-[300px] px-2 py-1 text-sm border rounded"
              onchange="update_drainage_Data('${roomId}', ${i}, 'workId', this.value); render_drainage_Fields('${roomId}', ${count})">
              ${buildOptions_drainage(workId)}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500">${qtyLabel}</label>
            <input type="number" step="0.01" min="0" value="${qty}"
              class="w-24 px-2 py-1 text-sm border rounded"
              onchange="update_drainage_Data('${roomId}', ${i}, '${qf}', this.value); updateDrainageTotals('${roomId}')"
              oninput="update_drainage_Data('${roomId}', ${i}, '${qf}', this.value); updateDrainageTotals('${roomId}')">
          </div>
          <div>
            <label class="text-xs text-gray-500">Цена за ед.:</label>
            <div class="construct-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300">${unitPrice ? unitPrice.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
          <div>
            <label class="text-xs text-gray-500">Итого:</label>
            <div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total ? total.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
        </div>
      </div>`;
  }
  container.innerHTML = html;
  updateDrainageTotals(roomId);
  checkDemolitionDone(roomId, 'drainage');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function updateDrainageTotals(roomId) {
  if (typeof getWorkPrice !== 'function') return;
  const data = roomData.demolitionData?.[roomId] || {};
  const qtyFieldMap = {'cast_iron_50':'length','cast_iron_100':'length','cast_iron_150':'length','flue_110':'length','flue_160':'length','plastic_32':'length','plastic_40':'length','plastic_50':'length','plastic_110':'length','plastic_160':'length'};
  const container = document.getElementById(roomId + '_drainageList');
  (data.drainage || []).forEach((item, i) => {
    const workId = item.workId || item.type || '';
    if (!workId) return;
    const qf = qtyFieldMap[workId] || 'qty';
    const qty = parseFloat(item[qf]) || 0;
    const price = getWorkPrice(workId) || 0;
    const rowTotal = Math.round(price * qty);
    if (container) {
      const priceCells = container.querySelectorAll('.construct-price-cell');
      if (priceCells[i]) priceCells[i].textContent = price ? price.toLocaleString('ru-RU') + ' ₽' : '—';
      const totalCells = container.querySelectorAll('.construct-total-cell');
      if (totalCells[i]) totalCells[i].textContent = rowTotal ? rowTotal.toLocaleString('ru-RU') + ' ₽' : '—';
    }
  });
}

function updateDrainageCount(roomId, delta) {
  const input = document.getElementById(roomId + '_drainageCount');
  if (!input) return;
  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count + delta));
  input.value = count;
  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId].drainage = [];
  }
  render_drainage_Fields(roomId, count);
  checkDemolitionDone(roomId, 'drainage');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function handleDrainageInput(roomId) {
  const input = document.getElementById(roomId + '_drainageCount');
  if (!input) return;
  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count));
  input.value = count;
  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId].drainage = [];
  }
  render_drainage_Fields(roomId, count);
  checkDemolitionDone(roomId, 'drainage');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function update_drainage_Data(roomId, index, field, value) {
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].drainage) roomData.demolitionData[roomId].drainage = [];
  if (!roomData.demolitionData[roomId].drainage[index]) roomData.demolitionData[roomId].drainage[index] = {};
  const entry = roomData.demolitionData[roomId].drainage[index];
  const numFields = ['qty', 'length', 'area'];
  entry[field] = numFields.includes(field) ? (parseFloat(value) || 0) : value;
  if (field === 'workId') { entry.type = value; entry.manualEntry = true; }
  if (numFields.includes(field)) entry.manualEntry = true;
  checkDemolitionDone(roomId, 'drainage');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function buildOptions_plumbing(workId) {
  return buildOptionsFromPriceList('demolition.categories.engineering.subcategories.plumbing', workId);
}

function render_plumbing_Fields(roomId, count) {
  const container = document.getElementById(roomId + '_plumbingList');
  if (!container) return;
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].plumbing) roomData.demolitionData[roomId].plumbing = [];

  const qtyFieldMap = {'sink_remove': 'qty', 'bathtub_remove': 'qty', 'shower_remove': 'qty', 'faucet_remove': 'qty', 'toilet_remove': 'qty', 'bidet_remove': 'qty', 'towel_dryer_remove': 'qty', 'washing_machine_remove': 'qty', 'dishwasher_remove': 'qty'};
  const qtyLabelMap = {qty: 'Количество, шт:', length: 'Длина, пог. м:', area: 'Площадь, м²:'};

  let html = '';
  for (let i = 0; i < count; i++) {
    const item = roomData.demolitionData[roomId].plumbing[i] || {};
    const workId = item.workId || item.type || '';
    const qf = qtyFieldMap[workId] || 'qty';
    const qty = item[qf] !== undefined ? item[qf] : '';
    const qtyLabel = qtyLabelMap[qf] || 'Количество, шт:';
    const unitPrice = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
    const qtyNum = parseFloat(qty) || 0;
    const total = (unitPrice > 0 && qtyNum > 0) ? Math.round(unitPrice * qtyNum) : 0;
    const badge = item.manualEntry ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"><i class="fas fa-user text-[10px]"></i><span>Вручную</span></span>` : '';

    html += `
      <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
        <div class="flex flex-wrap items-center gap-2 mb-1">${badge}</div>
        <div class="flex flex-wrap items-end gap-2">
          <div>
            <label class="text-xs text-gray-500">Вид работы:</label>
            <select class="md:w-[300px] px-2 py-1 text-sm border rounded"
              onchange="update_plumbing_Data('${roomId}', ${i}, 'workId', this.value); render_plumbing_Fields('${roomId}', ${count})">
              ${buildOptions_plumbing(workId)}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500">${qtyLabel}</label>
            <input type="number" step="0.01" min="0" value="${qty}"
              class="w-24 px-2 py-1 text-sm border rounded"
              onchange="update_plumbing_Data('${roomId}', ${i}, '${qf}', this.value); updatePlumbingTotals('${roomId}')"
              oninput="update_plumbing_Data('${roomId}', ${i}, '${qf}', this.value); updatePlumbingTotals('${roomId}')">
          </div>
          <div>
            <label class="text-xs text-gray-500">Цена за ед.:</label>
            <div class="construct-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300">${unitPrice ? unitPrice.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
          <div>
            <label class="text-xs text-gray-500">Итого:</label>
            <div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total ? total.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
        </div>
      </div>`;
  }
  container.innerHTML = html;
  updatePlumbingTotals(roomId);
  checkDemolitionDone(roomId, 'plumbing');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function updatePlumbingTotals(roomId) {
  if (typeof getWorkPrice !== 'function') return;
  const data = roomData.demolitionData?.[roomId] || {};
  const qtyFieldMap = {};
  const container = document.getElementById(roomId + '_plumbingList');
  (data.plumbing || []).forEach((item, i) => {
    const workId = item.workId || item.type || '';
    if (!workId) return;
    const qf = qtyFieldMap[workId] || 'qty';
    const qty = parseFloat(item[qf]) || 0;
    const price = getWorkPrice(workId) || 0;
    const rowTotal = Math.round(price * qty);
    if (container) {
      const priceCells = container.querySelectorAll('.construct-price-cell');
      if (priceCells[i]) priceCells[i].textContent = price ? price.toLocaleString('ru-RU') + ' ₽' : '—';
      const totalCells = container.querySelectorAll('.construct-total-cell');
      if (totalCells[i]) totalCells[i].textContent = rowTotal ? rowTotal.toLocaleString('ru-RU') + ' ₽' : '—';
    }
  });
}

function updatePlumbingCount(roomId, delta) {
  const input = document.getElementById(roomId + '_plumbingCount');
  if (!input) return;
  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count + delta));
  input.value = count;
  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId].plumbing = [];
  }
  render_plumbing_Fields(roomId, count);
  checkDemolitionDone(roomId, 'plumbing');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function handlePlumbingInput(roomId) {
  const input = document.getElementById(roomId + '_plumbingCount');
  if (!input) return;
  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count));
  input.value = count;
  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId].plumbing = [];
  }
  render_plumbing_Fields(roomId, count);
  checkDemolitionDone(roomId, 'plumbing');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function update_plumbing_Data(roomId, index, field, value) {
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].plumbing) roomData.demolitionData[roomId].plumbing = [];
  if (!roomData.demolitionData[roomId].plumbing[index]) roomData.demolitionData[roomId].plumbing[index] = {};
  const entry = roomData.demolitionData[roomId].plumbing[index];
  const numFields = ['qty', 'length', 'area'];
  entry[field] = numFields.includes(field) ? (parseFloat(value) || 0) : value;
  if (field === 'workId') { entry.type = value; entry.manualEntry = true; }
  if (numFields.includes(field)) entry.manualEntry = true;
  checkDemolitionDone(roomId, 'plumbing');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function updateHeatingCount(roomId, delta) {
  const input = document.getElementById(roomId + '_heatingCount');
  if (!input) return;
  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count + delta));
  input.value = count;
  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId].heating = [];
  }
  render_heating_Fields(roomId, count);
  checkDemolitionDone(roomId, 'heating');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function handleHeatingInput(roomId) {
  const input = document.getElementById(roomId + '_heatingCount');
  if (!input) return;
  let count = parseInt(input.value, 10) || 0;
  count = Math.max(0, Math.min(20, count));
  input.value = count;
  if (count === 0) {
    if (!roomData.demolitionData) roomData.demolitionData = {};
    if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
    roomData.demolitionData[roomId].heating = [];
  }
  render_heating_Fields(roomId, count);
  checkDemolitionDone(roomId, 'heating');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function buildOptions_heating(workId) {
  return buildOptionsFromPriceList('demolition.categories.engineering.subcategories.heating', workId);
}

function render_heating_Fields(roomId, count) {
  const container = document.getElementById(roomId + '_heatingList');
  if (!container) return;
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].heating) roomData.demolitionData[roomId].heating = [];

  const qtyFieldMap = {'radiator_remove': 'qty', 'infloor_convector_remove': 'qty'};
  const qtyLabelMap = {qty: 'Количество, шт:', length: 'Длина, пог. м:', area: 'Площадь, м²:'};

  let html = '';
  for (let i = 0; i < count; i++) {
    const item = roomData.demolitionData[roomId].heating[i] || {};
    const workId = item.workId || item.type || '';
    const qf = qtyFieldMap[workId] || 'qty';
    const qty = item[qf] !== undefined ? item[qf] : '';
    const qtyLabel = qtyLabelMap[qf] || 'Количество, шт:';
    const unitPrice = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
    const qtyNum = parseFloat(qty) || 0;
    const total = (unitPrice > 0 && qtyNum > 0) ? Math.round(unitPrice * qtyNum) : 0;
    const badge = item.manualEntry ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"><i class="fas fa-user text-[10px]"></i><span>Вручную</span></span>` : '';

    html += `
      <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
        <div class="flex flex-wrap items-center gap-2 mb-1">${badge}</div>
        <div class="flex flex-wrap items-end gap-2">
          <div>
            <label class="text-xs text-gray-500">Вид работы:</label>
            <select class="md:w-[300px] px-2 py-1 text-sm border rounded"
              onchange="update_heating_Data('${roomId}', ${i}, 'workId', this.value); render_heating_Fields('${roomId}', ${count})">
              ${buildOptions_heating(workId)}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500">${qtyLabel}</label>
            <input type="number" step="0.01" min="0" value="${qty}"
              class="w-24 px-2 py-1 text-sm border rounded"
              onchange="update_heating_Data('${roomId}', ${i}, '${qf}', this.value); updateHeatingTotals('${roomId}')"
              oninput="update_heating_Data('${roomId}', ${i}, '${qf}', this.value); updateHeatingTotals('${roomId}')">
          </div>
          <div>
            <label class="text-xs text-gray-500">Цена за ед.:</label>
            <div class="construct-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300">${unitPrice ? unitPrice.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
          <div>
            <label class="text-xs text-gray-500">Итого:</label>
            <div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total ? total.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
          </div>
        </div>
      </div>`;
  }
  container.innerHTML = html;
  updateHeatingTotals(roomId);
  checkDemolitionDone(roomId, 'heating');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}

function updateHeatingTotals(roomId) {
  if (typeof getWorkPrice !== 'function') return;
  const data = roomData.demolitionData?.[roomId] || {};
  const qtyFieldMap = {};
  const container = document.getElementById(roomId + '_heatingList');
  (data.heating || []).forEach((item, i) => {
    const workId = item.workId || item.type || '';
    if (!workId) return;
    const qf = qtyFieldMap[workId] || 'qty';
    const qty = parseFloat(item[qf]) || 0;
    const price = getWorkPrice(workId) || 0;
    const rowTotal = Math.round(price * qty);
    if (container) {
      const priceCells = container.querySelectorAll('.construct-price-cell');
      if (priceCells[i]) priceCells[i].textContent = price ? price.toLocaleString('ru-RU') + ' ₽' : '—';
      const totalCells = container.querySelectorAll('.construct-total-cell');
      if (totalCells[i]) totalCells[i].textContent = rowTotal ? rowTotal.toLocaleString('ru-RU') + ' ₽' : '—';
    }
  });
}

function buildOptions_staircase(workId) {
  return buildOptionsFromPriceList('demolition.categories.construct.subcategories.stairs.subcategories.staircase', workId);
}

const _staircaseQtyMap = {
  'stair_wooden_remove':'length','stair_metal_remove':'length','stair_concrete_remove':'length',
  'stair_step_remove':'qty','stair_cladding_remove':'area','stair_baluster_remove':'qty','stair_newel_remove':'qty'
};

function render_staircase_Fields(roomId, count) {
  const container = document.getElementById(roomId + '_staircaseList');
  if (!container) return;
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].staircase) roomData.demolitionData[roomId].staircase = [];
  const qtyLabelMap = {qty:'Количество, шт:',length:'Длина, пог. м:',area:'Площадь, м²:'};
  let html = '';
  for (let i = 0; i < count; i++) {
    const item = roomData.demolitionData[roomId].staircase[i] || {};
    const workId = item.workId || '';
    const qf = _staircaseQtyMap[workId] || 'qty';
    const qty = item[qf] !== undefined ? item[qf] : '';
    const qtyLabel = qtyLabelMap[qf] || 'Количество, шт:';
    const unitPrice = (typeof getWorkPrice==='function'&&workId)?(getWorkPrice(workId)||0):0;
    const total = (unitPrice>0&&parseFloat(qty)>0)?Math.round(unitPrice*parseFloat(qty)):0;
    const badge = item.manualEntry?`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"><i class="fas fa-user text-[10px]"></i><span>Вручную</span></span>`:'';
    html += `<div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border"><div class="flex flex-wrap items-center gap-2 mb-1">${badge}</div><div class="flex flex-wrap items-end gap-2"><div><label class="text-xs text-gray-500">Вид работы:</label><select class="md:w-[300px] px-2 py-1 text-sm border rounded" onchange="update_staircase_Data('${roomId}',${i},'workId',this.value);render_staircase_Fields('${roomId}',${count})">${buildOptions_staircase(workId)}</select></div><div><label class="text-xs text-gray-500">${qtyLabel}</label><input type="number" step="0.01" min="0" value="${qty}" class="w-24 px-2 py-1 text-sm border rounded" onchange="update_staircase_Data('${roomId}',${i},'${qf}',this.value);updateStairsTotals('${roomId}')" oninput="update_staircase_Data('${roomId}',${i},'${qf}',this.value);updateStairsTotals('${roomId}')"></div><div><label class="text-xs text-gray-500">Цена за ед.:</label><div class="construct-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300">${unitPrice?unitPrice.toLocaleString('ru-RU')+' ₽':'—'}</div></div><div><label class="text-xs text-gray-500">Итого:</label><div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total?total.toLocaleString('ru-RU')+' ₽':'—'}</div></div></div></div>`;
  }
  container.innerHTML = html;
  updateStairsTotals(roomId);
  if (typeof checkDemolitionDone==='function') { checkDemolitionDone(roomId,'staircase'); checkDemolitionDone(roomId,'_stairs'); }
  if (typeof updateWhatToDoAutofillIndicators==='function') updateWhatToDoAutofillIndicators();
}

function update_staircase_Data(roomId, index, field, value) {
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].staircase) roomData.demolitionData[roomId].staircase = [];
  if (!roomData.demolitionData[roomId].staircase[index]) roomData.demolitionData[roomId].staircase[index] = {};
  const entry = roomData.demolitionData[roomId].staircase[index];
  const numFields = ['qty','length','area'];
  entry[field] = numFields.includes(field)?(parseFloat(value)||0):value;
  if (field==='workId'){entry.type=value;entry.manualEntry=true;}
  if (numFields.includes(field)) entry.manualEntry=true;
  if (typeof checkDemolitionDone==='function') { checkDemolitionDone(roomId,'staircase'); checkDemolitionDone(roomId,'_stairs'); }
  if (typeof updateWhatToDoAutofillIndicators==='function') updateWhatToDoAutofillIndicators();
}

function updateStaircaseCount(roomId, delta) {
  const input = document.getElementById(roomId+'_staircaseCount');
  if (!input) return;
  let count = parseInt(input.value,10)||0;
  count = Math.max(0,Math.min(20,count+delta));
  input.value = count;
  if (count===0){if(!roomData.demolitionData)roomData.demolitionData={};if(!roomData.demolitionData[roomId])roomData.demolitionData[roomId]={};roomData.demolitionData[roomId].staircase=[];}
  render_staircase_Fields(roomId, count);
  if (typeof checkDemolitionDone==='function'){checkDemolitionDone(roomId,'staircase');checkDemolitionDone(roomId,'_stairs');}
  if (typeof updateWhatToDoAutofillIndicators==='function') updateWhatToDoAutofillIndicators();
}

function handleStaircaseInput(roomId) {
  const input = document.getElementById(roomId+'_staircaseCount');
  if (!input) return;
  let count = parseInt(input.value,10)||0;
  count = Math.max(0,Math.min(20,count));
  input.value = count;
  if (count===0){if(!roomData.demolitionData)roomData.demolitionData={};if(!roomData.demolitionData[roomId])roomData.demolitionData[roomId]={};roomData.demolitionData[roomId].staircase=[];}
  render_staircase_Fields(roomId, count);
  if (typeof checkDemolitionDone==='function'){checkDemolitionDone(roomId,'staircase');checkDemolitionDone(roomId,'_stairs');}
}

function buildOptions_railing(workId) {
  return buildOptionsFromPriceList('demolition.categories.construct.subcategories.stairs.subcategories.railing', workId);
}

const _railingQtyMap = {
  'railing_wooden_remove':'length','railing_metal_remove':'length','railing_glass_remove':'length',
  'railing_handrail_remove':'length','railing_post_remove':'qty'
};

function render_railing_Fields(roomId, count) {
  const container = document.getElementById(roomId + '_railingList');
  if (!container) return;
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].railing) roomData.demolitionData[roomId].railing = [];
  const qtyLabelMap = {qty:'Количество, шт:',length:'Длина, пог. м:',area:'Площадь, м²:'};
  let html = '';
  for (let i = 0; i < count; i++) {
    const item = roomData.demolitionData[roomId].railing[i] || {};
    const workId = item.workId || '';
    const qf = _railingQtyMap[workId] || 'qty';
    const qty = item[qf] !== undefined ? item[qf] : '';
    const qtyLabel = qtyLabelMap[qf] || 'Количество, шт:';
    const unitPrice = (typeof getWorkPrice==='function'&&workId)?(getWorkPrice(workId)||0):0;
    const total = (unitPrice>0&&parseFloat(qty)>0)?Math.round(unitPrice*parseFloat(qty)):0;
    const badge = item.manualEntry?`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"><i class="fas fa-user text-[10px]"></i><span>Вручную</span></span>`:'';
    html += `<div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border"><div class="flex flex-wrap items-center gap-2 mb-1">${badge}</div><div class="flex flex-wrap items-end gap-2"><div><label class="text-xs text-gray-500">Вид работы:</label><select class="md:w-[300px] px-2 py-1 text-sm border rounded" onchange="update_railing_Data('${roomId}',${i},'workId',this.value);render_railing_Fields('${roomId}',${count})">${buildOptions_railing(workId)}</select></div><div><label class="text-xs text-gray-500">${qtyLabel}</label><input type="number" step="0.01" min="0" value="${qty}" class="w-24 px-2 py-1 text-sm border rounded" onchange="update_railing_Data('${roomId}',${i},'${qf}',this.value);updateStairsTotals('${roomId}')" oninput="update_railing_Data('${roomId}',${i},'${qf}',this.value);updateStairsTotals('${roomId}')"></div><div><label class="text-xs text-gray-500">Цена за ед.:</label><div class="construct-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300">${unitPrice?unitPrice.toLocaleString('ru-RU')+' ₽':'—'}</div></div><div><label class="text-xs text-gray-500">Итого:</label><div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total?total.toLocaleString('ru-RU')+' ₽':'—'}</div></div></div></div>`;
  }
  container.innerHTML = html;
  updateStairsTotals(roomId);
  if (typeof checkDemolitionDone==='function'){checkDemolitionDone(roomId,'railing');checkDemolitionDone(roomId,'_stairs');}
  if (typeof updateWhatToDoAutofillIndicators==='function') updateWhatToDoAutofillIndicators();
}

function update_railing_Data(roomId, index, field, value) {
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].railing) roomData.demolitionData[roomId].railing = [];
  if (!roomData.demolitionData[roomId].railing[index]) roomData.demolitionData[roomId].railing[index] = {};
  const entry = roomData.demolitionData[roomId].railing[index];
  const numFields = ['qty','length','area'];
  entry[field] = numFields.includes(field)?(parseFloat(value)||0):value;
  if (field==='workId'){entry.type=value;entry.manualEntry=true;}
  if (numFields.includes(field)) entry.manualEntry=true;
  if (typeof checkDemolitionDone==='function'){checkDemolitionDone(roomId,'railing');checkDemolitionDone(roomId,'_stairs');}
  if (typeof updateWhatToDoAutofillIndicators==='function') updateWhatToDoAutofillIndicators();
}

function updateRailingCount(roomId, delta) {
  const input = document.getElementById(roomId+'_railingCount');
  if (!input) return;
  let count = parseInt(input.value,10)||0;
  count = Math.max(0,Math.min(20,count+delta));
  input.value = count;
  if (count===0){if(!roomData.demolitionData)roomData.demolitionData={};if(!roomData.demolitionData[roomId])roomData.demolitionData[roomId]={};roomData.demolitionData[roomId].railing=[];}
  render_railing_Fields(roomId, count);
  if (typeof checkDemolitionDone==='function'){checkDemolitionDone(roomId,'railing');checkDemolitionDone(roomId,'_stairs');}
  if (typeof updateWhatToDoAutofillIndicators==='function') updateWhatToDoAutofillIndicators();
}

function handleRailingInput(roomId) {
  const input = document.getElementById(roomId+'_railingCount');
  if (!input) return;
  let count = parseInt(input.value,10)||0;
  count = Math.max(0,Math.min(20,count));
  input.value = count;
  if (count===0){if(!roomData.demolitionData)roomData.demolitionData={};if(!roomData.demolitionData[roomId])roomData.demolitionData[roomId]={};roomData.demolitionData[roomId].railing=[];}
  render_railing_Fields(roomId, count);
  if (typeof checkDemolitionDone==='function'){checkDemolitionDone(roomId,'railing');checkDemolitionDone(roomId,'_stairs');}
}

function updateStairsTotals(roomId) {
  if (typeof getWorkPrice!=='function') return;
  const data = roomData.demolitionData?.[roomId]||{};
  const fmt = v => v>0?v.toLocaleString('ru-RU')+' ₽':'—';
  let staircaseTotal=0, railingTotal=0;
  (data.staircase||[]).forEach((item,i)=>{
    const workId=item.workId||'';if(!workId)return;
    const qf=_staircaseQtyMap[workId]||'qty';
    const qty=parseFloat(item[qf])||0;
    const price=getWorkPrice(workId)||0;
    const rowTotal=Math.round(price*qty);
    staircaseTotal+=rowTotal;
    const c=document.getElementById(roomId+'_staircaseList');
    if(c){const pc=c.querySelectorAll('.construct-price-cell');if(pc[i])pc[i].textContent=price?price.toLocaleString('ru-RU')+' ₽':'—';const tc=c.querySelectorAll('.construct-total-cell');if(tc[i])tc[i].textContent=rowTotal?rowTotal.toLocaleString('ru-RU')+' ₽':'—';}
  });
  (data.railing||[]).forEach((item,i)=>{
    const workId=item.workId||'';if(!workId)return;
    const qf=_railingQtyMap[workId]||'qty';
    const qty=parseFloat(item[qf])||0;
    const price=getWorkPrice(workId)||0;
    const rowTotal=Math.round(price*qty);
    railingTotal+=rowTotal;
    const c=document.getElementById(roomId+'_railingList');
    if(c){const pc=c.querySelectorAll('.construct-price-cell');if(pc[i])pc[i].textContent=price?price.toLocaleString('ru-RU')+' ₽':'—';const tc=c.querySelectorAll('.construct-total-cell');if(tc[i])tc[i].textContent=rowTotal?rowTotal.toLocaleString('ru-RU')+' ₽':'—';}
  });
  const stEl=document.getElementById(roomId+'_staircaseTotal');if(stEl)stEl.textContent=fmt(staircaseTotal);
  const rlEl=document.getElementById(roomId+'_railingTotal');if(rlEl)rlEl.textContent=fmt(railingTotal);
  const totEl=document.getElementById(roomId+'_stairsTotal');if(totEl)totEl.textContent=fmt(staircaseTotal+railingTotal);
  updateConstructTotals(roomId);
}


function update_heating_Data(roomId, index, field, value) {
  if (!roomData.demolitionData) roomData.demolitionData = {};
  if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
  if (!roomData.demolitionData[roomId].heating) roomData.demolitionData[roomId].heating = [];
  if (!roomData.demolitionData[roomId].heating[index]) roomData.demolitionData[roomId].heating[index] = {};
  const entry = roomData.demolitionData[roomId].heating[index];
  const numFields = ['qty', 'length', 'area'];
  entry[field] = numFields.includes(field) ? (parseFloat(value) || 0) : value;
  if (field === 'workId') { entry.type = value; entry.manualEntry = true; }
  if (numFields.includes(field)) entry.manualEntry = true;
  checkDemolitionDone(roomId, 'heating');
  checkDemolitionDone(roomId, '_engineering');
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
}


