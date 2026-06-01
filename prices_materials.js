// Materials Price List Management System
let materialsData = null;
window.materialsData = window.materialsData || null;
let materialsOverrides = {};
window.materialsOverrides = window.materialsOverrides || materialsOverrides;
let currentMaterialsCity = 'Москва';
let currentMaterialsMarket = 'Бюджет/Аренда';
window.currentMaterialsCity = window.currentMaterialsCity || currentMaterialsCity;
window.currentMaterialsMarket = window.currentMaterialsMarket || currentMaterialsMarket;
let allowMaterialsPriceEdit = false;
let expandedMaterialsSections = new Set();
let materialsPriceSearchQuery = '';
let showOnlyWorksWithMaterials = true;
let showMaterialsConsumptionUnit = false;
let showMaterialsWholesalePrices = false;
let showMaterialsPriceCheckboxes = false;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function initMaterialsPriceList() {
  try {
    const response = await fetch('prices_materials.json?v=city-prices-20260520');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    materialsData = await response.json();
    window.materialsData = materialsData;
    const linkedCity = window.currentTariffCity || window.currentCity || currentMaterialsCity;
    const resolvedLinkedCity = resolveMaterialsCity(linkedCity);
    if (resolvedLinkedCity) {
      currentMaterialsCity = resolvedLinkedCity;
      window.currentMaterialsCity = resolvedLinkedCity;
    }
    renderMaterialsPriceListSettings();
    renderMaterialsPriceListContent();
    if (typeof updateDetailedCalc === 'function') updateDetailedCalc();
  } catch (error) {
    console.error('Ошибка при загрузке прайс-листа материалов:', error);
    const settingsContainer = document.getElementById('materialsPriceListSettings');
    if (settingsContainer) {
      settingsContainer.innerHTML = `
        <div class="price-list-shell">
          <div class="price-list-toolbar">
            <div class="price-list-toolbar-title">Не удалось загрузить прайс-лист материалов</div>
            <div class="price-list-toolbar-note">${error.message}</div>
          </div>
        </div>
      `;
    }
  }
}

function renderMaterialsPriceListSettings() {
  const markets = Object.keys(materialsData.markets || {});
  const isWorkLinked = Boolean(materialsData.workMaterialTree && materialsData.workMaterialRecipes && materialsData.materialCatalog);
  const recipesCount = isWorkLinked ? Object.keys(materialsData.workMaterialRecipes || {}).length : 0;
  const catalogCount = isWorkLinked ? Object.keys(materialsData.materialCatalog || {}).length : 0;

  const container = document.getElementById('materialsPriceListSettings');
  if (!container) return;

  container.innerHTML = `
    <div class="price-list-shell">
      <div class="price-list-toolbar">
        <div class="price-list-toolbar-head">
          <div>
            <div class="price-list-eyebrow">Навигация по прайсу</div>
            <div class="price-list-toolbar-title">Выбор параметров прайс-листа по материалам</div>
          </div>
          <div class="price-list-toolbar-note">
            ${isWorkLinked
              ? `Новая схема: ${recipesCount.toLocaleString('ru-RU')} работ связано с ${catalogCount.toLocaleString('ru-RU')} материалами.`
              : 'Цены и состав материалов обновляются мгновенно.'}
          </div>
        </div>
        <div class="price-list-controls-grid">
          <div class="price-filter-card">
            <label class="price-filter-label">
              <i class="fas fa-map-marker-alt text-brand-500"></i>
              <span>Город</span>
            </label>
            ${renderMaterialsCitySearchControl('materialsPriceListCity', currentMaterialsCity)}
          </div>
          <div class="price-filter-card">
            <label class="price-filter-label">
              <i class="fas fa-layer-group text-brand-500"></i>
              <span>Тип рынка</span>
            </label>
            <select id="materialsPriceListMarket" class="price-filter-select" onchange="changeMaterialsMarket(this.value)">
              ${markets.map(m => `<option value="${m}" ${m === currentMaterialsMarket ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="price-filter-card price-filter-card-search">
            <label class="price-filter-label">
              <i class="fas fa-search text-brand-500"></i>
              <span>Поиск по материалам</span>
            </label>
            <input type="text" id="materialsPriceSearchInput" placeholder="Например: ламинат, гипсокартон, плитка"
                   class="price-search-input" oninput="performMaterialsPriceSearch(this.value)">
          </div>
          <button type="button" class="price-checkbox-toggle" onclick="toggleMaterialsPriceCheckboxes()" aria-expanded="${showMaterialsPriceCheckboxes}" aria-controls="materialsPriceCheckboxPanel">
            <span>${showMaterialsPriceCheckboxes ? 'Скрыть чек-боксы' : 'Показать чек-боксы'}</span>
            <i class="fas fa-chevron-down" style="transform:${showMaterialsPriceCheckboxes ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
          </button>

          <div class="price-checkbox-panel ${showMaterialsPriceCheckboxes ? 'is-open' : ''}" id="materialsPriceCheckboxPanel">
            <div class="price-checkbox-panel-inner">
              <label class="price-edit-toggle" for="allowMaterialsPriceEdit">
                <input type="checkbox" id="allowMaterialsPriceEdit" ${allowMaterialsPriceEdit ? 'checked' : ''} onchange="toggleMaterialsPriceEditing(this.checked)">
                <span class="price-edit-toggle-box">
                  <span class="price-edit-toggle-title">Ручная корректировка</span>
                  <span class="price-edit-toggle-text">Переключает прайс в режим редактирования цен по строкам.</span>
                </span>
              </label>
              ${isWorkLinked ? `
                <label class="price-edit-toggle" for="showOnlyWorksWithMaterials">
                  <input type="checkbox" id="showOnlyWorksWithMaterials" ${showOnlyWorksWithMaterials ? 'checked' : ''} onchange="toggleWorksWithMaterialsFilter(this.checked)">
                  <span class="price-edit-toggle-box">
                    <span class="price-edit-toggle-title">Работы с материалами</span>
                    <span class="price-edit-toggle-text">Показывает только работы, для которых требуются материалы.</span>
                  </span>
                </label>
                <label class="price-edit-toggle" for="showMaterialsConsumptionUnit">
                  <input type="checkbox" id="showMaterialsConsumptionUnit" ${showMaterialsConsumptionUnit ? 'checked' : ''} onchange="toggleMaterialsConsumptionUnit(this.checked)">
                  <span class="price-edit-toggle-box">
                    <span class="price-edit-toggle-title">Показать единицу расхода</span>
                    <span class="price-edit-toggle-text">Добавляет отдельную колонку с единицей нормы расхода.</span>
                  </span>
                </label>
                <label class="price-edit-toggle" for="showMaterialsWholesalePrices">
                  <input type="checkbox" id="showMaterialsWholesalePrices" ${showMaterialsWholesalePrices ? 'checked' : ''} onchange="toggleMaterialsWholesalePrices(this.checked)">
                  <span class="price-edit-toggle-box">
                    <span class="price-edit-toggle-title">Оптовые цены</span>
                    <span class="price-edit-toggle-text">Показывает колонку с ценами при закупке объёмом.</span>
                  </span>
                </label>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getMaterialsCityMeta(city) {
  return materialsData?.countries?.RU?.cities?.[city] || {};
}

function getMaterialsCityRegionLabel(city) {
  const meta = getMaterialsCityMeta(city);
  return meta.region || meta.subject || meta.name || 'Регион не указан';
}

function normalizeMaterialsCitySearch(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').trim();
}

function escapeMaterialsCityJs(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function resolveMaterialsCity(rawCity) {
  const cities = Object.keys(materialsData?.countries?.RU?.cities || {});
  const normalized = normalizeMaterialsCitySearch(rawCity);
  return cities.find(city => normalizeMaterialsCitySearch(city) === normalized) || null;
}

function getSortedMaterialsCities() {
  return Object.keys(materialsData?.countries?.RU?.cities || {})
    .sort((a, b) => a.localeCompare(b, 'ru'));
}

function getFilteredMaterialsCities(query, showAll = false) {
  const cities = getSortedMaterialsCities();
  const normalizedQuery = normalizeMaterialsCitySearch(query);
  if (showAll || !normalizedQuery) return cities;

  return cities
    .map(city => {
      const citySearch = normalizeMaterialsCitySearch(city);
      const regionSearch = normalizeMaterialsCitySearch(getMaterialsCityRegionLabel(city));
      let score = 99;
      if (citySearch.startsWith(normalizedQuery)) score = 0;
      else if (citySearch.includes(normalizedQuery)) score = 1;
      else if (regionSearch.includes(normalizedQuery)) score = 2;
      return { city, score };
    })
    .filter(item => item.score < 99)
    .sort((a, b) => a.score - b.score || a.city.localeCompare(b.city, 'ru'))
    .map(item => item.city);
}

function renderMaterialsCityDropdownOptions(id, query = '', showAll = false) {
  const cities = getFilteredMaterialsCities(query, showAll);
  if (!cities.length) {
    return '<div class="city-option-empty">Город не найден. Выберите значение из списка.</div>';
  }
  return cities.map(city => `
    <button type="button" class="city-option" onclick="selectMaterialsCity('${escapeMaterialsCityJs(id)}', '${escapeMaterialsCityJs(city)}')">
      <span>${escapeHtml(city)}</span>
      <small>${escapeHtml(getMaterialsCityRegionLabel(city))}</small>
    </button>
  `).join('');
}

function renderMaterialsCitySearchControl(id, value) {
  return `
    <div class="city-search-control">
      <div class="city-search-main">
        <div class="city-combobox" id="${id}Combo">
          <input type="search" id="${id}" value="${escapeHtml(value)}"
                 class="price-search-input city-search-input"
                 placeholder="Начните вводить город"
                 autocomplete="off"
                 onfocus="renderMaterialsCityDropdown('${escapeMaterialsCityJs(id)}', this.value, false)"
                 oninput="handleMaterialsCityInput('${escapeMaterialsCityJs(id)}', this.value)"
                 onchange="changeMaterialsCity(this.value)">
          <button type="button" class="city-combobox-toggle" onclick="toggleMaterialsCityDropdown('${escapeMaterialsCityJs(id)}')" aria-label="Открыть список городов">
            <i class="fas fa-chevron-down"></i>
          </button>
          <div class="city-dropdown" id="${id}Dropdown">
            ${renderMaterialsCityDropdownOptions(id, value, false)}
          </div>
        </div>
        <div class="city-region-hint" id="${id}Region">${escapeHtml(getMaterialsCityRegionLabel(value))}</div>
      </div>
    </div>
  `;
}

function renderMaterialsCityDropdown(id, query = '', showAll = false) {
  const dropdown = document.getElementById(`${id}Dropdown`);
  if (!dropdown) return;
  dropdown.innerHTML = renderMaterialsCityDropdownOptions(id, query, showAll);
  dropdown.classList.add('is-open');
}

function closeMaterialsCityDropdowns(exceptId = '') {
  document.querySelectorAll('.city-dropdown.is-open').forEach(dropdown => {
    if (!exceptId || dropdown.id !== `${exceptId}Dropdown`) dropdown.classList.remove('is-open');
  });
}

function handleMaterialsCityInput(id, value) {
  renderMaterialsCityDropdown(id, value, false);
  const resolvedCity = resolveMaterialsCity(value);
  const regionEl = document.getElementById(`${id}Region`);
  if (resolvedCity) {
    changeMaterialsCity(resolvedCity);
  } else if (regionEl) {
    regionEl.textContent = 'Выберите город из списка';
  }
}

function toggleMaterialsCityDropdown(id) {
  const dropdown = document.getElementById(`${id}Dropdown`);
  const input = document.getElementById(id);
  if (!dropdown) return;
  const willOpen = !dropdown.classList.contains('is-open');
  closeMaterialsCityDropdowns(id);
  if (willOpen) {
    dropdown.innerHTML = renderMaterialsCityDropdownOptions(id, '', true);
    dropdown.classList.add('is-open');
    if (input) input.focus();
  } else {
    dropdown.classList.remove('is-open');
  }
}

function selectMaterialsCity(id, city) {
  const input = document.getElementById(id);
  if (input) input.value = city;
  closeMaterialsCityDropdowns();
  changeMaterialsCity(city);
}

document.addEventListener('click', event => {
  if (!event.target.closest('.city-combobox')) closeMaterialsCityDropdowns();
});

// Подсчёт всех позиций в дереве
function countMatItems(node) {
  if (!node) return 0;
  let count = Array.isArray(node.items) ? node.items.length : 0;
  for (const sub of Object.values(node.subcategories || {})) count += countMatItems(sub);
  return count;
}

function getTotalMaterialsCount(categories) {
  return Object.values(categories || {}).reduce((sum, cat) => sum + countMatItems(cat), 0);
}

function renderMaterialsPriceListContent() {
  if (!materialsData?.prices) return;
  const prices = materialsData.prices[currentMaterialsCity]?.[currentMaterialsMarket];
  if (!prices) return;

  const query = materialsPriceSearchQuery.trim().toLowerCase();

  if (materialsData.workMaterialTree && materialsData.workMaterialRecipes && materialsData.materialCatalog) {
    renderWorkLinkedMaterialsPriceListContent(prices, query);
    return;
  }

  let html = '<div class="price-list-results">';

  html += renderMatDomain('mat_demolition', 'Материалы для демонтажных работ', 'fa-trash',
    materialsData.materials.demolition.categories || {}, prices, query);

  html += renderMatDomain('mat_installation', 'Материалы для монтажных работ', 'fa-hammer',
    materialsData.materials.installation.categories || {}, prices, query);

  html += '</div>';

  const container = document.getElementById('materialsPriceListContent');
  if (container) container.innerHTML = html;
}

function renderWorkLinkedMaterialsPriceListContent(prices, query) {
  let html = '<div class="price-list-results">';

  html += renderWorkMaterialDomain('workmat_demolition', materialsData.workMaterialTree.demolition, 'fa-trash', prices, query);
  html += renderWorkMaterialDomain('workmat_installation', materialsData.workMaterialTree.installation, 'fa-hammer', prices, query);

  html += '</div>';

  const container = document.getElementById('materialsPriceListContent');
  if (container) container.innerHTML = html;
}

function countWorkMaterialRows(node) {
  if (!node) return 0;
  let count = Array.isArray(node.items) ? node.items.length : 0;
  Object.values(node.categories || {}).forEach(child => { count += countWorkMaterialRows(child); });
  Object.values(node.subcategories || {}).forEach(child => { count += countWorkMaterialRows(child); });
  return count;
}

function renderWorkMaterialDomain(key, domain, icon, prices, query) {
  if (!domain) return '';
  const totalCount = countWorkMaterialRows(domain);
  const isExp = expandedMaterialsSections.has(key);
  let inner = '';

  if (isExp || query) {
    Object.entries(domain.categories || {}).forEach(([catKey, cat]) => {
      inner += renderWorkMaterialNode(cat, prices, `${key}_${catKey}`, query, 0);
    });
  }

  if (!inner && (isExp || query)) return '';

  return `
    <section class="price-domain-panel">
      <div class="price-domain-header is-clickable" onclick="toggleMaterialsSection('${key}')">
        <h4 class="price-domain-title">
          <i class="fas ${icon} text-brand-500"></i>
          <span>${domain.name || 'Материалы'}</span>
        </h4>
        <div class="price-domain-actions">
          <span class="price-domain-count">${totalCount}</span>
          <i class="fas fa-chevron-down text-gray-600 dark:text-gray-300 transition-transform"
             id="matIcon_${key}" style="transform:${isExp ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
        </div>
      </div>
      <div id="matContent_${key}" class="mt-3 space-y-3" style="display:${isExp ? 'block' : 'none'}">
        ${inner}
      </div>
    </section>
  `;
}

function renderWorkMaterialNode(node, prices, key, query, depth) {
  const categories = node.categories || {};
  const subcategories = node.subcategories || {};
  const children = Object.keys(categories).length ? categories : subcategories;
  const hasChildren = Object.keys(children).length > 0;
  const items = Array.isArray(node.items) ? node.items : [];
  const isExp = expandedMaterialsSections.has(key);
  const cardClass = depth === 0 ? 'price-category-card' : 'price-subcategory-card';
  const headerClass = depth === 0 ? 'price-category-header' : 'price-subcategory-header';
  const titleClass = depth === 0 ? 'price-category-title' : 'price-subcategory-title';
  const countClass = depth === 0 ? 'price-category-count' : 'price-subcategory-count';
  const contentClass = depth === 0 ? 'price-category-content' : 'price-subcategory-content';

  if (hasChildren) {
    let inner = '';
    Object.entries(children).forEach(([childKey, child]) => {
      inner += renderWorkMaterialNode(child, prices, `${key}_${childKey}`, query, depth + 1);
    });
    if (!inner) return '';

    return `
      <div class="${cardClass}">
        <div class="${headerClass}" onclick="toggleMaterialsSection('${key}')">
          <span class="${titleClass}">${node.name || key}</span>
          <span class="${countClass}">${countWorkMaterialRows(node)}</span>
          <i class="fas fa-chevron-down text-gray-600 dark:text-gray-300 transition-transform"
             id="matIcon_${key}" style="transform:${isExp ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
        </div>
        <div id="matContent_${key}" class="${contentClass}" style="display:${isExp ? 'block' : 'none'}">
          ${inner}
        </div>
      </div>
    `;
  }

  const filtered = filterWorkMaterialItems(items, query);
  if (!filtered.length) return '';

  return `
    <div class="${cardClass}">
      <div class="${headerClass}" onclick="toggleMaterialsSection('${key}')">
        <span class="${titleClass}">${node.name || key}</span>
        <span class="${countClass}">${filtered.length}</span>
        <i class="fas fa-chevron-down text-gray-500 dark:text-gray-300 transition-transform text-xs"
           id="matIcon_${key}" style="transform:${isExp ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
      </div>
      <div id="matContent_${key}" class="price-subcategory-table" style="display:${isExp ? 'block' : 'none'}">
        ${renderWorkMaterialTable(filtered, prices)}
      </div>
    </div>
  `;
}

function filterWorkMaterialItems(items, query) {
  return items.filter(item => {
    const recipe = materialsData.workMaterialRecipes[item.workId] || {};
    const recipeMaterials = Array.isArray(recipe.materials) ? recipe.materials : [];
    const hasMaterials = recipe.status !== 'not_required' && recipeMaterials.length > 0;

    if (showOnlyWorksWithMaterials && !hasMaterials) return false;
    if (!query) return true;

    const materialNames = recipeMaterials
      .map(entry => materialsData.materialCatalog[entry.materialId]?.name || entry.materialId)
      .join(' ')
      .toLowerCase();

    return (item.workName || '').toLowerCase().includes(query)
      || (item.workId || '').toLowerCase().includes(query)
      || materialNames.includes(query);
  });
}

function getMaterialPriceValue(materialId, prices) {
  const overridePrice = materialsOverrides[materialId];
  if (overridePrice !== undefined) return overridePrice;
  const price = prices?.[materialId];
  if (Number.isFinite(Number(price))) return Number(price);
  if (price && typeof price === 'object' && Number.isFinite(Number(price.base))) return Number(price.base);
  return 0;
}

function formatMaterialPriceTiers(materialId, prices) {
  const price = prices?.[materialId];
  if (!price || typeof price !== 'object' || !Array.isArray(price.tiers) || price.tiers.length === 0) return '—';
  return price.tiers
    .map(tier => `от ${Number(tier.fromQty).toLocaleString('ru-RU')}: ${Number(tier.price).toLocaleString('ru-RU')} ₽`)
    .join('<br>');
}

function renderWorkMaterialTable(items, prices) {
  const rows = [];

  items.forEach(item => {
    const recipe = materialsData.workMaterialRecipes[item.workId] || {};
    const recipeMaterials = Array.isArray(recipe.materials) ? recipe.materials : [];

    if (recipe.status === 'not_required') {
      rows.push(`
        <tr class="price-table-row">
          <td class="price-table-cell price-name-cell" data-label="Работа">${item.workName}</td>
          <td class="price-table-cell price-unit-cell" data-label="Ед. работы">${item.workUnit || recipe.workUnit || '—'}</td>
          <td class="price-table-cell price-name-cell" data-label="Материал">Материалы не требуются</td>
          <td class="price-table-cell price-unit-cell" data-label="Расход">—</td>
          ${showMaterialsConsumptionUnit ? '<td class="price-table-cell price-unit-cell" data-label="Ед. расхода">—</td>' : ''}
          <td class="price-table-cell price-unit-cell" data-label="Ед. закупки">—</td>
          <td class="price-table-cell price-value-cell" data-label="Цена">—</td>
          ${showMaterialsWholesalePrices ? '<td class="price-table-cell price-name-cell" data-label="Оптовые цены">—</td>' : ''}
          ${allowMaterialsPriceEdit ? '<td class="price-table-cell price-action-cell" data-label="Корр-ка">—</td>' : ''}
        </tr>
      `);
      return;
    }

    recipeMaterials.forEach((entry, index) => {
      const material = materialsData.materialCatalog[entry.materialId] || {};
      const priceValue = getMaterialPriceValue(entry.materialId, prices);
      const purchaseUnit = material.purchaseUnit || material.consumptionUnit || entry.consumptionUnit || '—';
      const overridePrice = materialsOverrides[entry.materialId];

      rows.push(`
        <tr class="price-table-row">
          <td class="price-table-cell price-name-cell" data-label="Работа">${index === 0 ? item.workName : ''}</td>
          <td class="price-table-cell price-unit-cell" data-label="Ед. работы">${index === 0 ? (item.workUnit || recipe.workUnit || '—') : ''}</td>
          <td class="price-table-cell price-name-cell" data-label="Материал">${material.name || entry.materialId}</td>
          <td class="price-table-cell price-unit-cell" data-label="Расход">${Number(entry.consumptionPerWorkUnit || 0).toLocaleString('ru-RU', { maximumFractionDigits: 3 })}</td>
          ${showMaterialsConsumptionUnit ? `<td class="price-table-cell price-unit-cell" data-label="Ед. расхода">${entry.consumptionUnit || material.consumptionUnit || '—'}</td>` : ''}
          <td class="price-table-cell price-unit-cell" data-label="Ед. закупки">${purchaseUnit}</td>
          <td class="price-table-cell price-value-cell" data-label="Цена">
            ${allowMaterialsPriceEdit ? `
              <div class="price-edit-box compact">
                <input type="number" id="matprice_${entry.materialId}" value="${priceValue}"
                       class="price-edit-input compact"
                       onchange="updateMaterialsPriceOverride('${entry.materialId}', this.value)">
                <span class="price-currency">₽</span>
              </div>
            ` : `<span class="price-value-text">${priceValue.toFixed(0)} ₽</span>`}
          </td>
          ${showMaterialsWholesalePrices ? `<td class="price-table-cell price-name-cell" data-label="Оптовые цены" style="color:var(--text-secondary);font-size:12px;">${formatMaterialPriceTiers(entry.materialId, prices)}</td>` : ''}
          ${allowMaterialsPriceEdit ? `
            <td class="price-table-cell price-action-cell" data-label="Корр-ка">
              ${overridePrice !== undefined ? `
                <div class="price-action-stack">
                  <span class="price-adjusted-badge">Изменено</span>
                  <button class="price-reset-btn" onclick="resetMaterialsPriceOverride('${entry.materialId}')" title="Сбросить цену">
                    <i class="fas fa-rotate-left"></i>
                  </button>
                </div>
              ` : '<span class="price-action-placeholder">—</span>'}
            </td>
          ` : ''}
        </tr>
      `);
    });
  });

  if (!rows.length) return '';

  return `
    <div class="price-table-wrap">
      <table class="price-table">
        <thead>
          <tr>
            <th>Работа</th>
            <th>Ед. работы</th>
            <th>Материал</th>
            <th>Расход</th>
            ${showMaterialsConsumptionUnit ? '<th>Ед. расхода</th>' : ''}
            <th>Ед. закупки</th>
            <th>Цена</th>
            ${showMaterialsWholesalePrices ? '<th>Оптовые цены</th>' : ''}
            ${allowMaterialsPriceEdit ? '<th>Корр-ка</th>' : ''}
          </tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
  `;
}

// Верхний уровень — домен (демонтаж / монтаж)
function renderMatDomain(key, title, icon, categories, prices, query) {
  const totalCount = getTotalMaterialsCount(categories);
  const isExp = expandedMaterialsSections.has(key);

  let inner = '';
  if (isExp || query) {
    for (const [catKey, cat] of Object.entries(categories)) {
      inner += renderMatCategory(cat, prices, `${key}_${catKey}`, query);
    }
  }
  if (!inner && (isExp || query)) return '';

  return `
    <section class="price-domain-panel">
      <div class="price-domain-header is-clickable" onclick="toggleMaterialsSection('${key}')">
        <h4 class="price-domain-title">
          <i class="fas ${icon} text-brand-500"></i>
          <span>${title}</span>
        </h4>
        <div class="price-domain-actions">
          <span class="price-domain-count">${totalCount}</span>
          <i class="fas fa-chevron-down text-gray-600 dark:text-gray-300 transition-transform"
             id="matIcon_${key}" style="transform:${isExp ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
        </div>
      </div>
      <div id="matContent_${key}" class="mt-3 space-y-3" style="display:${isExp ? 'block' : 'none'}">
        ${inner}
      </div>
    </section>
  `;
}

// Категория (например: "Гидроизоляция", "Напольные покрытия")
function renderMatCategory(category, prices, key, query) {
  const subcategories = category.subcategories || {};
  const items = category.items || [];
  const hasSubs = Object.keys(subcategories).length > 0;
  const isExp = expandedMaterialsSections.has(key);

  if (hasSubs) {
    let inner = '';
    for (const [subKey, sub] of Object.entries(subcategories)) {
      inner += renderMatSubCategory(sub, prices, `${key}_${subKey}`, query);
    }
    if (!inner) return '';

    const totalCount = countMatItems(category);
    return `
      <div class="price-category-card">
        <div class="price-category-header" onclick="toggleMaterialsSection('${key}')">
          <span class="price-category-title">${category.name}</span>
          <span class="price-category-count">${totalCount}</span>
          <i class="fas fa-chevron-down text-gray-600 dark:text-gray-300 transition-transform"
             id="matIcon_${key}" style="transform:${isExp ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
        </div>
        <div id="matContent_${key}" class="price-category-content" style="display:${isExp ? 'block' : 'none'}">
          ${inner}
        </div>
      </div>
    `;
  }

  // Без подкатегорий — таблица
  const filtered = filterMatItems(items, prices, query);
  if (!filtered.length) return '';

  return `
    <div class="price-category-card">
      <div class="price-category-header" onclick="toggleMaterialsSection('${key}')">
        <span class="price-category-title">${category.name}</span>
        <span class="price-category-count">${filtered.length}</span>
        <i class="fas fa-chevron-down text-gray-600 dark:text-gray-300 transition-transform"
           id="matIcon_${key}" style="transform:${isExp ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
      </div>
      <div id="matContent_${key}" class="price-category-table" style="display:${isExp ? 'block' : 'none'}">
        ${renderMatTable(filtered, prices)}
      </div>
    </div>
  `;
}

// Подкатегория (например: "Цементная гидроизоляция", "Линолеум 21 класс")
function renderMatSubCategory(subCategory, prices, key, query) {
  const nestedSubs = subCategory.subcategories || {};
  const items = subCategory.items || [];
  const hasNested = Object.keys(nestedSubs).length > 0;
  const isExp = expandedMaterialsSections.has(key);

  if (hasNested) {
    let inner = '';
    for (const [nKey, nSub] of Object.entries(nestedSubs)) {
      inner += renderMatSubCategory(nSub, prices, `${key}_${nKey}`, query);
    }
    if (!inner) return '';

    const totalCount = countMatItems(subCategory);
    return `
      <div class="price-subcategory-card">
        <div class="price-subcategory-header" onclick="toggleMaterialsSection('${key}')">
          <span class="price-subcategory-title">${subCategory.name}</span>
          <span class="price-subcategory-count">${totalCount}</span>
          <i class="fas fa-chevron-down text-gray-500 dark:text-gray-300 transition-transform text-xs"
             id="matIcon_${key}" style="transform:${isExp ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
        </div>
        <div id="matContent_${key}" class="price-subcategory-content" style="display:${isExp ? 'block' : 'none'}">
          ${inner}
        </div>
      </div>
    `;
  }

  const filtered = filterMatItems(items, prices, query);
  if (!filtered.length) return '';

  return `
    <div class="price-subcategory-card">
      <div class="price-subcategory-header" onclick="toggleMaterialsSection('${key}')">
        <span class="price-subcategory-title">${subCategory.name}</span>
        <span class="price-subcategory-count">${filtered.length}</span>
        <i class="fas fa-chevron-down text-gray-500 dark:text-gray-300 transition-transform text-xs"
           id="matIcon_${key}" style="transform:${isExp ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
      </div>
      <div id="matContent_${key}" class="price-subcategory-table" style="display:${isExp ? 'block' : 'none'}">
        ${renderMatTable(filtered, prices)}
      </div>
    </div>
  `;
}

function filterMatItems(items, prices, query) {
  return (items || []).filter(item => {
    if (prices[item.id] === undefined || prices[item.id] === null) return false;
    if (!query) return true;
    return item.name.toLowerCase().includes(query) || item.id.toLowerCase().includes(query);
  });
}

function renderMatTable(items, prices) {
  if (!items.length) return '';

  const rows = items.map(item => {
    const itemPrice = prices[item.id];
    if (itemPrice === undefined || itemPrice === null) return '';
    const overridePrice = materialsOverrides[item.id];
    const displayPrice = overridePrice !== undefined ? overridePrice : (itemPrice || 0);

    return `
      <tr class="price-table-row">
        <td class="price-table-cell price-name-cell" data-label="Материал">${item.name}</td>
        <td class="price-table-cell price-unit-cell" data-label="Ед.изм.">${item.unit}</td>
        <td class="price-table-cell price-value-cell" data-label="Цена">
          ${allowMaterialsPriceEdit ? `
            <div class="price-edit-box compact">
              <input type="number" id="matprice_${item.id}" value="${displayPrice}"
                     class="price-edit-input compact"
                     onchange="updateMaterialsPriceOverride('${item.id}', this.value)">
              <span class="price-currency">₽</span>
            </div>
          ` : `<span class="price-value-text">${displayPrice.toFixed(0)} ₽</span>`}
        </td>
        ${allowMaterialsPriceEdit ? `
          <td class="price-table-cell price-action-cell" data-label="Корректировка">
            ${overridePrice !== undefined ? `
              <div class="price-action-stack">
                <span class="price-adjusted-badge">Изменено</span>
                <button class="price-reset-btn" onclick="resetMaterialsPriceOverride('${item.id}')" title="Сбросить цену">
                  <i class="fas fa-rotate-left"></i>
                </button>
              </div>
            ` : '<span class="price-action-placeholder">—</span>'}
          </td>
        ` : ''}
      </tr>
    `;
  }).join('');

  if (!rows.trim()) return '';

  return `
    <div class="price-table-wrap">
      <table class="price-table">
        <thead>
          <tr>
            <th>Материал</th>
            <th>Ед.изм.</th>
            <th>Цена</th>
            ${allowMaterialsPriceEdit ? '<th>Корректировка</th>' : ''}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function toggleMaterialsSection(key) {
  const wasTopLevel = ['workmat_demolition', 'workmat_installation', 'mat_demolition', 'mat_installation'].includes(key);
  const icon = document.getElementById(`matIcon_${key}`);
  const content = document.getElementById(`matContent_${key}`);

  const isExpanded = expandedMaterialsSections.has(key);
  if (isExpanded) expandedMaterialsSections.delete(key);
  else expandedMaterialsSections.add(key);

  if (wasTopLevel && !materialsPriceSearchQuery) {
    renderMaterialsPriceListContent();
    return;
  }

  if (!icon || !content) return;
  content.style.display = isExpanded ? 'none' : 'block';
  icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
}

function changeMaterialsCity(city, options = {}) {
  const resolvedCity = resolveMaterialsCity(city);
  const regionEl = document.getElementById('materialsPriceListCityRegion');
  if (!resolvedCity) {
    if (regionEl) {
      regionEl.textContent = 'Выберите город из списка';
      regionEl.classList.add('city-region-hint--warning');
    }
    return;
  }
  currentMaterialsCity = resolvedCity;
  window.currentMaterialsCity = resolvedCity;
  if (regionEl) {
    regionEl.textContent = getMaterialsCityRegionLabel(resolvedCity);
    regionEl.classList.remove('city-region-hint--warning');
  }
  const cityInput = document.getElementById('materialsPriceListCity');
  if (cityInput && cityInput.value !== resolvedCity) cityInput.value = resolvedCity;
  if (!options.skipTariff) {
    if (typeof syncTariffCityField === 'function') syncTariffCityField(resolvedCity);
    if (typeof changePriceListCity === 'function' && window.currentCity !== resolvedCity) {
      changePriceListCity(resolvedCity, { skipTariff: true, skipMaterials: true });
    }
  }
  renderMaterialsPriceListContent();
  if (typeof updateDetailedCalc === 'function') updateDetailedCalc();
}

function changeMaterialsMarket(market) {
  currentMaterialsMarket = market;
  window.currentMaterialsMarket = market;
  renderMaterialsPriceListContent();
  if (typeof updateDetailedCalc === 'function') updateDetailedCalc();
}

function performMaterialsPriceSearch(query) {
  materialsPriceSearchQuery = query;
  renderMaterialsPriceListContent();
}

function toggleMaterialsPriceEditing(checked) {
  allowMaterialsPriceEdit = checked;
  renderMaterialsPriceListContent();
}

function toggleWorksWithMaterialsFilter(checked) {
  showOnlyWorksWithMaterials = checked;
  renderMaterialsPriceListContent();
}

function toggleMaterialsConsumptionUnit(checked) {
  showMaterialsConsumptionUnit = checked;
  renderMaterialsPriceListContent();
}

function toggleMaterialsWholesalePrices(checked) {
  showMaterialsWholesalePrices = checked;
  renderMaterialsPriceListContent();
}

function toggleMaterialsPriceCheckboxes() {
  showMaterialsPriceCheckboxes = !showMaterialsPriceCheckboxes;
  renderMaterialsPriceListSettings();
}

function updateMaterialsPriceOverride(itemId, value) {
  const numValue = parseFloat(value);
  if (!isNaN(numValue) && numValue >= 0) {
    materialsOverrides[itemId] = numValue;
    window.materialsOverrides = materialsOverrides;
  }
  if (typeof updateDetailedCalc === 'function') updateDetailedCalc();
}

function resetMaterialsPriceOverride(itemId) {
  delete materialsOverrides[itemId];
  window.materialsOverrides = materialsOverrides;
  const originalPrice = getMaterialPriceValue(itemId, materialsData.prices[currentMaterialsCity]?.[currentMaterialsMarket]);
  const input = document.getElementById(`matprice_${itemId}`);
  if (input) input.value = originalPrice;
  renderMaterialsPriceListContent();
  if (typeof updateDetailedCalc === 'function') updateDetailedCalc();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMaterialsPriceList);
} else {
  initMaterialsPriceList();
}
