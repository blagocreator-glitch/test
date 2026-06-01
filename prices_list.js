// Price List Management System
// ВАЖНО: prices_list.json хранит структуру активного прайс-листа:
// названия, ID работ, единицы измерения, города и сегменты.
// Базовые цены берутся из годового справочника
// прайс-лист_YYYY_демонтаж_монтаж.json и накладываются при загрузке.
// Для 2026 года источник: прайс-лист_2026_демонтаж_монтаж.json.

// Глобальные переменные (доступны через window)
window.pricesData = window.pricesData || null;
window.pricesOverrides = {}; // Для сохранения скорректированных цен
window.currentCity = 'Москва';
window.currentTariffCity = window.currentTariffCity || '';
window.currentMarket = 'Бюджет/Аренда';
window.allowPriceEdit = false;
window.showWorkDuration = false;
window.showTechnologicalInterval = false;
window.showPriceListCheckboxes = false;
window.expandedSections = new Set(); // Для отслеживания развернутых разделов
window.cityNameMap = {}; // Для маппинга ID городов в названия
window.priceSearchQuery = ''; // Для поиска по прайс-листу
window.workCatalogCache = null;

// Локальные ссылки для удобства
let pricesData = window.pricesData;
let pricesOverrides = window.pricesOverrides;
let currentCity = window.currentCity;
let currentTariffCity = window.currentTariffCity;
let currentMarket = window.currentMarket;
let allowPriceEdit = window.allowPriceEdit;
let showWorkDuration = window.showWorkDuration;
let showTechnologicalInterval = window.showTechnologicalInterval;
let showPriceListCheckboxes = window.showPriceListCheckboxes;
let expandedSections = window.expandedSections;
let cityNameMap = window.cityNameMap;
let priceSearchQuery = window.priceSearchQuery;
let workCatalogCache = window.workCatalogCache;

function getActivePricesData() {
  return pricesData || window.pricesData || null;
}

function syncActivePricesData() {
  const activePricesData = getActivePricesData();
  if (activePricesData && pricesData !== activePricesData) {
    pricesData = activePricesData;
  }
  return activePricesData;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeWorkName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

function walkWorkTree(node, callback) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.items)) {
    node.items.forEach(item => callback(item, node));
  }
  for (const category of Object.values(node.categories || {})) {
    walkWorkTree(category, callback);
  }
  for (const subCategory of Object.values(node.subcategories || {})) {
    walkWorkTree(subCategory, callback);
  }
}

function getWorkCatalog() {
  const activePricesData = syncActivePricesData();
  if (!activePricesData?.works) return null;
  if (workCatalogCache?.source === activePricesData) {
    return workCatalogCache;
  }

  const byId = new Map();
  const byName = new Map();

  for (const domain of Object.values(activePricesData.works || {})) {
    walkWorkTree(domain, item => {
      if (!item?.id) return;
      byId.set(item.id, item);
      byName.set(normalizeWorkName(item.name), item);
    });
  }

  workCatalogCache = { source: activePricesData, byId, byName };
  window.workCatalogCache = workCatalogCache;
  return workCatalogCache;
}

function getActivePriceListYear() {
  const explicitYear = Number(window.activePriceListYear || window.priceListYear || 0);
  if (explicitYear >= 2020 && explicitYear <= 2100) return explicitYear;
  return new Date().getFullYear();
}

function getYearlyReferencePriceListUrl(year) {
  return `прайс-лист_${year}_демонтаж_монтаж.json?v=shower-tray-hidden-plumbing-${year}-20260525`;
}

function fetchOptionalJson(url) {
  return fetch(encodeURI(url))
    .then(response => (response.ok ? response.json() : null))
    .catch(() => null);
}

function collectWorkIdsFromPriceData(data) {
  const ids = new Set();
  if (!data?.works) return ids;
  for (const domain of Object.values(data.works || {})) {
    walkWorkTree(domain, item => {
      if (item?.id) ids.add(item.id);
    });
  }
  return ids;
}

function collectYearlyReferenceItems(referenceData) {
  const items = [];
  const walk = (node, path = []) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, path.concat(index)));
      return;
    }
    if (node.id && Number.isFinite(Number(node.price))) {
      const pathText = path.join(' ').toLowerCase();
      const nameText = String(node.name || '').toLowerCase();
      items.push({
        id: node.id,
        name: node.name || node.id,
        unit: node.unit || '',
        price: Number(node.price),
        min: Number(node.min || 0),
        max: Number(node.max || 0),
        isDemolition: /демонтаж|dismant|demo/.test(`${pathText} ${nameText}`)
      });
    }
    for (const [key, value] of Object.entries(node)) {
      walk(value, path.concat(key));
    }
  };
  walk(referenceData);
  return items;
}

function resolveYearlyReferenceTargetIds(referenceItem, mappingData, activeWorkIds) {
  const targets = [];
  if (activeWorkIds.has(referenceItem.id)) targets.push(referenceItem.id);

  const mapped = mappingData?.mappings?.[referenceItem.id] || [];
  mapped.forEach(entry => {
    const nextId = entry?.new;
    if (!nextId || !activeWorkIds.has(nextId)) return;
    if (referenceItem.isDemolition && !nextId.startsWith('demo_')) return;
    if (!referenceItem.isDemolition && nextId.startsWith('demo_')) return;
    targets.push(nextId);
  });

  return Array.from(new Set(targets));
}

function getYearlyReferenceMarketPrice(referenceItem, market, cityCoefficient = 1) {
  const base = Number(referenceItem.price || 0);
  if (!base) return 0;
  const min = Number(referenceItem.min || 0);
  const max = Number(referenceItem.max || 0);
  let marketBase = base;
  if (market === 'Бюджет/Аренда') marketBase = min || base * 0.85;
  if (market === 'Комфорт') marketBase = base;
  if (market === 'Бизнес') marketBase = max ? (base + max) / 2 : base * 1.25;
  if (market === 'Премиум') marketBase = max || base * 1.4;
  return Math.max(0, Math.round((marketBase * Number(cityCoefficient || 1)) / 10) * 10);
}

function applyYearlyReferencePrices(priceData, referenceData, mappingData, year) {
  if (!priceData?.prices || !referenceData) return { applied: 0, year, status: 'missing' };
  const activeWorkIds = collectWorkIdsFromPriceData(priceData);
  const referenceItems = collectYearlyReferenceItems(referenceData);
  let applied = 0;

  referenceItems.forEach(referenceItem => {
    const targetIds = resolveYearlyReferenceTargetIds(referenceItem, mappingData, activeWorkIds);
    if (!targetIds.length) return;
    for (const [city, markets] of Object.entries(priceData.prices || {})) {
      const cityCoefficient = priceData.countries?.RU?.cities?.[city]?.pricingCoefficient || 1;
      for (const market of Object.keys(markets || {})) {
        const nextPrice = getYearlyReferenceMarketPrice(referenceItem, market, cityCoefficient);
        if (!nextPrice) continue;
        targetIds.forEach(targetId => {
          markets[market][targetId] = nextPrice;
          applied += 1;
        });
      }
    }
  });

  priceData.meta = priceData.meta || {};
  priceData.meta.yearlyReferenceYear = year;
  priceData.meta.yearlyReferenceSource = `прайс-лист_${year}_демонтаж_монтаж.json`;
  priceData.meta.yearlyReferenceAppliedAt = new Date().toISOString();
  return { applied, year, status: 'applied' };
}

function findWorkIdInBranch(branch, rawValue) {
  if (!branch || !rawValue) return null;

  const catalog = getWorkCatalog();
  const rawString = String(rawValue).trim();

  if (catalog?.byId.has(rawString)) {
    return rawString;
  }

  const normalized = normalizeWorkName(rawValue);
  let foundId = null;

  walkWorkTree(branch, item => {
    if (!foundId && item.id === rawString) {
      foundId = item.id;
    } else if (!foundId && normalizeWorkName(item.name) === normalized) {
      foundId = item.id;
    }
  });

  return foundId;
}

const questWorkIdAliases = {
  wiring: 'demo_wiring_remove',
  outlets: 'demo_socket_remove',
  lights: 'demo_lamp_remove',
  warm_floor: 'demo_warm_floor_remove',
  ac: 'demo_ac_remove',
  pp: 'demo_pp_pipe_20',
  plastic: 'demo_plastic_50',
  radiator: 'demo_radiator_remove',
  sink: 'demo_sink_remove',
  faucet: 'demo_faucet_remove',
  toilet: 'demo_toilet_remove',
  bathtub: 'demo_bathtub_remove',
  shower: 'demo_bathtub_remove',
  towel_dryer: 'demo_towel_dryer_remove',
  dishwasher: 'demo_dishwasher_remove',

  socket_install: 'eng_elec_socket_install',
  subsocket: 'eng_elec_subsocket',
  switch_install: 'eng_elec_switch_install',
  light_install: 'eng_elec_light_install',
  wiring_hidden: 'eng_elec_wiring_hidden',
  socket_group: 'eng_elec_socket_group',
  socket_child_protection: 'eng_elec_socket_child',
  socket_moisture_proof: 'eng_elec_socket_moisture',
  master_switch_socket: 'eng_elec_master_switch_socket',
  master_switch_light: 'eng_elec_master_switch_light',
  spot_light: 'eng_elec_spot_light',
  led_strip: 'eng_elec_led_strip',
  chandelier_install: 'eng_elec_chandelier_install',
  wall_light: 'eng_elec_wall_light',
  track_light: 'eng_elec_track_light',
  motion_switch: 'eng_elec_motion_switch',
  weak_current: 'eng_elec_weak_current',
  internet_tv: 'eng_elec_internet_tv',
  smart_home_preparation: 'eng_elec_smart_home_prep',
  smart_home_setup: 'eng_elec_smart_home_setup',
  smart_home: 'eng_elec_smart_home_elem',
  smart_curtain: 'eng_elec_smart_curtain',
  smart_motion_sensor: 'eng_elec_smart_motion',
  smart_light_sensor: 'eng_elec_smart_light_sensor',
  smart_climate_sensor: 'eng_elec_smart_climate',
  intercom: 'eng_elec_intercom',
  intercom_video: 'eng_elec_intercom_video',
  cctv: 'eng_elec_cctv',
  warm_floor_electric: 'eng_elec_warm_floor_el',

  ac_route: 'eng_vent_ac_route',
  ac_power: 'eng_vent_ac_power',
  ac_drain: 'eng_vent_ac_drain',
  wall_drilling: 'eng_vent_wall_drilling',
  ac_unit_install: 'eng_vent_ac_unit_install',
  ac_outdoor_install: 'eng_vent_ac_outdoor_install',
  vent_fan_install: 'eng_vent_vent_fan_install',

  water_point: 'eng_water_water_point',
  smart_leak_sensor: 'eng_water_smart_leak_sensor',
  mixer_connection: 'eng_water_mixer_connection',
  installation_frame: 'eng_water_installation_frame',
  boiler_connection: 'eng_water_boiler_connection',
  leak_protection: 'eng_water_leak_protection',

  drain_point: 'eng_drain_drain_point',
  shower_channel: 'eng_drain_shower_channel',

  radiator_bottom_install: 'eng_heat_radiator_bottom',
  radiator_side_install: 'eng_heat_radiator_side',
  infloor_convector: 'eng_heat_infloor_convector',
  heated_towel_rail: 'eng_heat_heated_towel_rail',
  floor_heating_water: 'eng_heat_floor_heating_water',
  floor_heating_collector: 'eng_heat_floor_heating_collector',
  floor_heating_electric: 'eng_heat_floor_heating_electric',
  floor_heating_ir: 'eng_heat_floor_heating_ir',
  floor_heating_mat: 'eng_heat_floor_heating_mat',
  floor_heating_film: 'eng_heat_floor_heating_film',
  floor_heating_screed: 'eng_heat_floor_heating_screed',
  floor_heating_insulation: 'eng_heat_floor_heating_insulation',
  floor_heating_test: 'eng_heat_floor_heating_test',
  floor_heating_thermostat: 'finish_floor_floor_heating_thermostat',

  gk_partition: 'drywall_partition',
  gazobeton_partition: 'rough_partition_gazobeton',
  pazogreb_partition: 'rough_partition_pazogreb',
  brick_partition: 'brick_wall',
  floor_laminate: 'finish_floor_floor_laminate',
  floor_quartzvinyl: 'finish_floor_floor_quartzvinyl',
  floor_vinyl_glue: 'finish_floor_floor_vinyl_glue',
  floor_engineered: 'finish_floor_floor_engineered',
  floor_parquet_board: 'finish_floor_floor_engineered',
  floor_parquet: 'finish_floor_floor_parquet',
  floor_parquet_herringbone: 'finish_floor_floor_parquet_herringbone',
  floor_linoleum: 'finish_floor_floor_vinyl_roll_glue',
  floor_ceramic: 'finish_floor_floor_ceramic',
  floor_porcelain: 'finish_floor_floor_porcelain',
  floor_tile_large_format: 'finish_floor_floor_porcelain_large',
  floor_self_leveling: 'finish_floor_floor_self_leveling_finish',
  floor_self_leveling_finish: 'finish_floor_floor_self_leveling_finish',
  floor_polymer: 'finish_floor_floor_epoxy',
  floor_epoxy: 'finish_floor_floor_epoxy',
  floor_decorative: 'finish_floor_floor_microcement',
  floor_microcement: 'finish_floor_floor_microcement',
  floor_terrazzo: 'finish_floor_floor_terrazzo',
  floor_plinth: 'finish_floor_floor_plinth',
  floor_plinth_hidden: 'finish_floor_floor_plinth_hidden',

  wall_wallpaper: 'finish_wall_wall_wallpaper',
  wall_wallpaper_pattern_match: 'finish_wall_wall_wallpaper_pattern_match',
  wall_paint: 'finish_wall_man_wall_paint',
  wall_decorative_plaster: 'finish_wall_wall_decorative_plaster',
  wall_venetian_plaster: 'finish_wall_wall_venetian_plaster',
  wall_ceramic: 'finish_wall_wall_ceramic',
  wall_porcelain: 'finish_wall_wall_porcelain',
  wall_tile_large_format: 'finish_wall_wall_porcelain_large',
  wall_mdf_panels: 'finish_wall_wall_mdf_panels',
  wall_photo_wallpaper: 'finish_wall_wall_photo_wallpaper',
  ceiling_led_profile: 'finish_ceil_ceiling_led_profile',
  ceiling_molding: 'finish_ceil_ceiling_molding',
  ceiling_molding_gypsum: 'finish_ceil_ceiling_molding_gypsum',
  ceiling_cornice_hidden: 'finish_ceil_ceiling_cornice_hidden',
  ceiling_hatch_hidden: 'finish_ceil_ceiling_hatch_hidden',
  ceiling_stretch: 'finish_ceil_ceiling_stretch',
  ceiling_stretch_shadow: 'finish_ceil_ceiling_stretch_shadow',
  ceiling_stretch_multilevel: 'finish_ceil_ceiling_stretch_multilevel',
  ceiling_gk: 'finish_ceil_ceiling_gk',
  ceiling_gk_multilevel: 'finish_ceil_ceiling_gk_multilevel',
  ceiling_paint: 'finish_ceil_man_ceiling_paint',
  ceiling_suspended: 'finish_ceil_ceiling_suspended',
  wall_molding: 'finish_wall_wall_molding',
  wall_slat: 'finish_wall_wall_slat',

  door_install: 'finish_open_door_install',
  door_install_with_trim: 'finish_open_door_install_with_trim',
  door_install_hidden: 'finish_open_door_install_hidden',
  door_install_double: 'finish_open_door_install_double',
  door_install_double_trim: 'finish_open_door_install_double_trim',
  door_install_hidden_double: 'finish_open_door_install_hidden_double',
  door_install_sliding: 'finish_open_door_install_sliding',
  door_install_folding: 'finish_open_door_install_folding',
  door_install_pivot: 'finish_open_door_install_pivot',
  door_trim: 'finish_open_door_trim',
  handle_install: 'finish_open_handle_install',
  lock_install: 'finish_open_lock_install',
  closer_install: 'finish_open_closer_install',
  window_install: 'finish_open_window_install',
  window_trim: 'finish_open_window_trim',
  drip_install: 'finish_open_drip_install',
  balcony_install: 'finish_open_balcony_install'
};

function resolveWorkId(branch, rawValue) {
  if (!rawValue) return null;
  const catalog = getWorkCatalog();
  const rawString = String(rawValue).trim();

  if (catalog?.byId.has(rawString)) return rawString;
  const branchMatch = findWorkIdInBranch(branch, rawString);
  if (branchMatch) return branchMatch;

  const alias = questWorkIdAliases[rawString];
  if (alias && catalog?.byId.has(alias)) return alias;
  if (alias && !catalog) return alias;

  return null;
}

function getPositiveNumber(...values) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) {
      return num;
    }
  }
  return 0;
}

function addEstimateLine(lines, workId, qty, meta = {}) {
  const safeQty = Number(qty);
  if (!workId || !Number.isFinite(safeQty) || safeQty <= 0) return;
  const overrideUnitPrice = Number(meta.roomRepairUnitPrice || meta.unitPriceOverride || 0);
  const unitPrice = overrideUnitPrice > 0 ? overrideUnitPrice : getWorkPrice(workId);

  lines.push({
    workId,
    qty: safeQty,
    ...meta,
    unitPrice,
    total: unitPrice * safeQty
  });
}

function getDemolitionMaterialSuffix(material) {
  const materialMap = {
    'гипсокартон': 'gk',
    'гипсокартон/каркас': 'gyproc',
    'каркас': 'frame',
    'каркасная стена': 'frame',
    'газобетон': 'gasblock',
    'газобетон/пеноблок': 'gasblock',
    'пеноблок': 'gasblock',
    'пазогребневая плита': 'pzp',
    'пазогребневые плиты': 'pazogreb',
    'кирпич': 'brick',
    'бетон/монолит': 'concrete',
    'бетон': 'concrete',
    'монолит': 'concrete',
    'стекло': 'glass',
    'дерево': 'wood'
  };

  return materialMap[normalizeWorkName(material)] || null;
}

function resolveRepairOpeningWorkId(workType, openingType) {
  const normalized = normalizeWorkName(workType);
  if (!normalized) return null;

  if (openingType === 'door') {
    if (normalized.includes('довод')) return 'closer_install';
    if (normalized.includes('замк')) return 'lock_install';
    if (normalized.includes('ручк')) return 'handle_install';
    if (normalized.includes('складн')) return 'door_install_folding';
    if (normalized.includes('поворот')) return 'door_install_pivot';
    if (normalized.includes('раздвиж')) return 'door_install_sliding';
    if (normalized.includes('двуполь') && normalized.includes('скрыт')) return 'door_install_hidden_double';
    if (normalized.includes('двуполь') && (normalized.includes('добор') || normalized.includes('налич'))) return 'door_install_double_trim';
    if (normalized.includes('двуполь')) return 'door_install_double';
    if (normalized.includes('скрыт')) return 'door_install_hidden';
    if (normalized.includes('монтаж') && normalized.includes('добор')) return 'door_install_with_trim';
    if (normalized.includes('откос') || normalized.includes('отделк')) return 'door_trim';
    if (normalized.includes('добор') || normalized.includes('налич')) return 'door_trim';
    if (normalized.includes('двер')) return 'door_install';
  }

  if (openingType === 'window') {
    if (normalized.includes('отлив')) return 'drip_install';
    if (normalized.includes('откос')) return 'window_trim';
    if (normalized.includes('окн') || normalized.includes('подокон')) return 'window_install';
  }

  if (openingType === 'balcony') {
    if (
      normalized.includes('балкон') ||
      normalized.includes('двер') ||
      normalized.includes('подокон') ||
      normalized.includes('порог') ||
      normalized.includes('откос') ||
      normalized.includes('гермет')
    ) {
      return 'balcony_install';
    }
  }

  return null;
}

function collectDemolitionEstimateLines(roomDataState) {
  const lines = [];
  const demolitionRooms = roomDataState?.demolitionData || {};
  const activePricesData = syncActivePricesData();
  const demolitionCategories = activePricesData?.works?.demolition?.categories || {};
  const constructCategory = demolitionCategories.construct;
  const engineeringCategory = demolitionCategories.engineering;
  const finishingCategory = demolitionCategories.finishing;

  for (const [roomId, data] of Object.entries(demolitionRooms)) {
    (data.partitions || []).forEach(item => {
      const workId = resolveWorkId(constructCategory?.subcategories?.partitions || constructCategory, item.workId || item.material);
      const isPatch = workId === 'partition_dismantle_patch';
      const qty = isPatch ? getPositiveNumber(item.length) : getPositiveNumber(item.area);
      addEstimateLine(lines, workId, qty, {
        roomId,
        domain: 'demolition',
        category: 'construct'
      });
    });

    [
      ['doorOpenings', 'door'],
      ['windowOpenings', 'window'],
      ['balconyOpenings', 'balcony']
    ].forEach(([field, openingType]) => {
      (data[field] || []).forEach(item => {
        const workId = resolveWorkId(constructCategory, item.workId || item.material);
        const patchWorks = new Set(['door_dismantle_patch', 'window_dismantle_patch', 'balcony_dismantle_patch']);
        const qty = patchWorks.has(workId)
          ? getPositiveNumber(item.area)
          : getPositiveNumber(item.qty, 1);
        addEstimateLine(lines, workId, qty, {
          roomId,
          domain: 'demolition',
          category: 'construct'
        });
      });
    });

    (data.electrical || []).forEach(item => {
      const workId = resolveWorkId(engineeringCategory?.subcategories?.electrical || engineeringCategory, item.workId || item.type);
      const qtyFieldMap = {'wiring_remove': item.length, 'cable_channel_remove': item.length, 'warm_floor_remove': item.area};
      const qty = workId in qtyFieldMap ? getPositiveNumber(qtyFieldMap[workId]) : getPositiveNumber(item.qty, item.length, item.area);
      addEstimateLine(lines, workId, qty, {
        roomId,
        domain: 'demolition',
        category: 'engineering'
      });
    });

    (data.ventilation || []).forEach(item => {
      const workId = resolveWorkId(engineeringCategory?.subcategories?.ventilation || engineeringCategory, item.workId || item.type);
      const qtyFieldMap = {'air_duct_remove': item.length};
      const qty = workId in qtyFieldMap ? getPositiveNumber(qtyFieldMap[workId]) : getPositiveNumber(item.qty, item.length, item.area);
      addEstimateLine(lines, workId, qty, {
        roomId,
        domain: 'demolition',
        category: 'engineering'
      });
    });

    (data.water || []).forEach(item => {
      const workId = resolveWorkId(engineeringCategory?.subcategories?.water || engineeringCategory, item.workId || item.type);
      addEstimateLine(lines, workId, getPositiveNumber(item.length, item.qty, item.area), {
        roomId,
        domain: 'demolition',
        category: 'engineering'
      });
    });

    (data.drainage || []).forEach(item => {
      const workId = resolveWorkId(engineeringCategory?.subcategories?.drainage || engineeringCategory, item.workId || item.type);
      addEstimateLine(lines, workId, getPositiveNumber(item.length, item.qty, item.area), {
        roomId,
        domain: 'demolition',
        category: 'engineering'
      });
    });

    (data.plumbing || []).forEach(item => {
      const workId = resolveWorkId(engineeringCategory?.subcategories?.plumbing || engineeringCategory, item.workId || item.type);
      addEstimateLine(lines, workId, getPositiveNumber(item.qty, 1), {
        roomId,
        domain: 'demolition',
        category: 'engineering'
      });
    });

    (data.heating || []).forEach(item => {
      const workId = resolveWorkId(engineeringCategory?.subcategories?.heating || engineeringCategory, item.workId || item.type);
      addEstimateLine(lines, workId, getPositiveNumber(item.qty, 1), {
        roomId,
        domain: 'demolition',
        category: 'engineering'
      });
    });

    ['floor', 'wall', 'ceiling'].forEach(categoryKey => {
      const branch = finishingCategory?.subcategories?.[categoryKey];
      (data.finishing?.[categoryKey] || []).forEach(item => {
        const workId = resolveWorkId(branch, item.workId || item.type);
        addEstimateLine(lines, workId, getPositiveNumber(item.area, item.length, item.qty), {
          roomId,
          domain: 'demolition',
          category: 'finishing',
          ...getRoomRepairEstimateMeta(item)
        });
      });
    });
  }

  return lines;
}

function collectRepairEstimateLines(roomDataState) {
  const lines = [];
  const repairRooms = roomDataState?.repairData || {};
  const activePricesData = syncActivePricesData();
  const installationCategories = activePricesData?.works?.installation?.categories || {};

  for (const [roomId, repair] of Object.entries(repairRooms)) {
    const rough = repair?.rough || {};
    const engineering = repair?.engineering || {};
    const finishing = repair?.finishing || {};

    ['floorLeveling', 'wallPlaster', 'wallPutty', 'wallWaterproof', 'surfaceProtection', 'ceilingPrep'].forEach(categoryKey => {
      const branch = installationCategories.rough?.subcategories?.[categoryKey]
        || installationCategories.rough?.subcategories?.wallLeveling?.subcategories?.[categoryKey];
      (rough[categoryKey] || []).forEach(item => {
        addEstimateLine(lines, resolveWorkId(branch, item.workId || item.type), getPositiveNumber(item.area, item.length, item.qty), {
          roomId,
          domain: 'installation',
          category: 'rough',
          ...getRoomRepairEstimateMeta(item)
        });
      });
    });

    (rough.partitions || []).forEach(item => {
      const workId = resolveWorkId(installationCategories.rough?.subcategories?.partitions, item.workId || item.type);
      addEstimateLine(lines, workId, getPositiveNumber(item.area, item.length, item.qty), {
        roomId,
        domain: 'installation',
        category: 'rough',
        subcategory: 'partitions'
      });
    });

    ['electrical', 'ventilation', 'water', 'drainage', 'heating'].forEach(categoryKey => {
      const branch = installationCategories.engineering?.subcategories?.[categoryKey];
      (engineering[categoryKey] || []).forEach(item => {
        const workId = resolveWorkId(branch, item.workId || item.type);
        addEstimateLine(lines, workId, getPositiveNumber(item.length, item.area, item.qty), {
          roomId,
          domain: 'installation',
          category: 'engineering',
          displayName: item.displayName || item.label || null,
          materialRecipeOverride: item.materialRecipeOverride || null,
          cablePurpose: item.cablePurpose || null,
          ...getRoomRepairEstimateMeta(item)
        });
      });
    });

    ['floor', 'wall', 'ceiling'].forEach(categoryKey => {
      const branch = installationCategories.finishing?.subcategories?.[categoryKey];
      (finishing[categoryKey] || []).forEach(item => {
        const workId = resolveWorkId(branch, item.workId || item.type);
        addEstimateLine(lines, workId, getPositiveNumber(item.length, item.area, item.qty), {
          roomId,
          domain: 'installation',
          category: 'finishing',
          displayName: item.displayName || item.label || null,
          materialRecipeOverride: item.materialRecipeOverride || null,
          comment: item.comment || null,
          ...getRoomRepairEstimateMeta(item)
        });
      });
    });

    const stairsEntries = Array.isArray(finishing.stairs)
      ? finishing.stairs
      : Object.values(finishing.stairs || {});
    stairsEntries.forEach(item => {
      const workId = resolveWorkId(installationCategories.finishing?.subcategories?.stairs, item?.workId || item?.type);
      addEstimateLine(lines, workId, getPositiveNumber(item?.qty, item?.length, item?.area), {
        roomId,
        domain: 'installation',
        category: 'finishing',
        subcategory: 'stairs',
        ...getRoomRepairEstimateMeta(item)
      });
    });

    ['door', 'window', 'balcony'].forEach(openingType => {
      (finishing.openings?.[openingType] || []).forEach(item => {
        const workTypes = Array.isArray(item.workTypes)
          ? item.workTypes
          : item.workType
            ? [item.workType]
            : [];

        workTypes.forEach(workType => {
          addEstimateLine(lines, resolveWorkId(installationCategories.finishing?.subcategories?.openings, resolveRepairOpeningWorkId(workType, openingType)), 1, {
            roomId,
            domain: 'installation',
            category: 'finishing',
            ...getRoomRepairEstimateMeta(item)
          });
        });
      });
    });

    Object.values(repair?.architecturalSupervision || {}).forEach(item => {
      const workId = item?.workId || null;
      addEstimateLine(lines, workId, getPositiveNumber(item?.qty), {
        roomId,
        domain: 'installation',
        category: 'architecturalSupervision'
      });
    });
  }

  return lines;
}

function calculateWhatToDoWorksEstimate(roomDataState) {
  const activePricesData = syncActivePricesData();
  if (!activePricesData?.works || !roomDataState) {
    return { total: 0, itemCount: 0, lines: [] };
  }

  const lines = [
    ...collectDemolitionEstimateLines(roomDataState),
    ...collectRepairEstimateLines(roomDataState)
  ];

  const total = lines.reduce((sum, line) => sum + line.total, 0);
  return {
    total,
    itemCount: lines.length,
    lines
  };
}

window.calculateWhatToDoWorksEstimate = calculateWhatToDoWorksEstimate;

// Валидация: проверяет, что все используемые workId есть в прайс-листе
function validateWorkIdsAgainstPriceList(workIds) {
  const activePricesData = syncActivePricesData();
  if (!activePricesData?.works) {
    console.warn('Прайс-лист ещё не загружен');
    return { valid: [], invalid: [] };
  }

  const catalog = getWorkCatalog();
  const valid = [];
  const invalid = [];

  workIds.forEach(workId => {
    if (catalog?.byId.has(workId)) {
      valid.push(workId);
    } else {
      invalid.push(workId);
    }
  });

  if (invalid.length > 0) {
    console.error('⚠️ Найдены работы, которых НЕТ в эталонном прайс-листе:', invalid);
    console.error('Добавьте эти работы в prices_list.json');
  }

  return { valid, invalid };
}

window.validateWorkIdsAgainstPriceList = validateWorkIdsAgainstPriceList;

function getNestedItemCount(node) {
  if (!node || typeof node !== 'object') return 0;
  const itemsCount = Array.isArray(node.items) ? node.items.length : 0;
  const subcategories = node.subcategories || {};
  return itemsCount + Object.values(subcategories).reduce((sum, sub) => sum + getNestedItemCount(sub), 0);
}

function filterNestedSubcategories(subcategories, lowerQuery) {
  const result = {};

  for (const [subKey, subCategory] of Object.entries(subcategories || {})) {
    const matchedItems = (subCategory.items || []).filter(item =>
      item.name.toLowerCase().includes(lowerQuery) || item.id.toLowerCase().includes(lowerQuery)
    );

    const matchedNestedSubcategories = filterNestedSubcategories(subCategory.subcategories || {}, lowerQuery);

    if (matchedItems.length > 0 || Object.keys(matchedNestedSubcategories).length > 0) {
      result[subKey] = { ...subCategory };
      if (matchedItems.length > 0) result[subKey].items = matchedItems;
      if (Object.keys(matchedNestedSubcategories).length > 0) {
        result[subKey].subcategories = matchedNestedSubcategories;
      } else {
        delete result[subKey].subcategories;
      }
    }
  }

  return result;
}



function syncDemolitionEngineeringStructure() {
  // Placeholder for future implementation
}

function syncDemolitionFinishingStructure() {
  // Placeholder for future implementation
}

function syncInstallationStructure() {
  // Placeholder for future implementation
}

function detectTariffCityFromAddress(address) {
  const normalizedAddress = normalizePriceCitySearch(address);
  if (!normalizedAddress) return null;
  return getSortedPriceCities()
    .slice()
    .sort((a, b) => b.length - a.length)
    .find(city => normalizedAddress.includes(normalizePriceCitySearch(city))) || null;
}

function initializeLocationFromAddress() {
  const locationInput = document.getElementById('addressInput') || document.getElementById('objectLocation');
  if (locationInput?.value) {
    updateTariffCityFromAddress(locationInput.value);
  } else {
    renderTariffCityControl(currentTariffCity || currentCity || '');
  }
}

// Маппинг значений detailedRepairType → ключ рынка
const REPAIR_TYPE_TO_MARKET = {
  'budget':   'Бюджет/Аренда',
  'comfort':  'Комфорт',
  'business': 'Бизнес',
  'premium':  'Премиум',
};
const MARKET_TO_REPAIR_TYPE = Object.fromEntries(
  Object.entries(REPAIR_TYPE_TO_MARKET).map(([k, v]) => [v, k])
);

function syncMarketFromRepairType() {
  const sel = document.getElementById('detailedRepairType');
  if (!sel) return;
  const market = REPAIR_TYPE_TO_MARKET[sel.value];
  if (market && market !== currentMarket) {
    currentMarket = market;
  }
}

function syncPriceListFromRepairType(repairTypeVal) {
  const market = REPAIR_TYPE_TO_MARKET[repairTypeVal];
  if (!market) return;
  if (market !== currentMarket) {
    currentMarket = market;
    const sel = document.getElementById('priceListMarket');
    if (sel) {
      sel.value = market;
    } else if (pricesData) {
      // priceListMarket ещё не в DOM — перерендерим настройки
      renderPriceListSettings();
    }
    const summaryEl = document.querySelector('.price-list-summary');
    if (summaryEl) summaryEl.outerHTML = getPriceListSummaryHtml();
    if (pricesData) {
      if (priceSearchQuery) {
        performPriceSearch(priceSearchQuery);
      } else {
        renderPriceListContent();
      }
    }
  }
  updateEstimates();
}

function getTotalWorkCount(structure) {
  return Object.values(structure || {}).reduce((sum, category) => sum + getNestedItemCount(category), 0);
}

function getPriceListSummaryHtml() {
  const demolitionCount = getTotalWorkCount(pricesData?.works?.demolition?.categories);
  const installationCount = getTotalWorkCount(pricesData?.works?.installation?.categories);
  const totalCount = demolitionCount + installationCount;

  return `
    <div class="price-list-summary">
      <div class="price-summary-chip">
        <span class="price-summary-label">Локация</span>
        <strong>${escapeHtml(currentCity)}</strong>
      </div>
      <div class="price-summary-chip">
        <span class="price-summary-label">Сегмент</span>
        <strong>${escapeHtml(currentMarket)}</strong>
      </div>
      <div class="price-summary-chip">
        <span class="price-summary-label">Работ</span>
        <strong>${totalCount}</strong>
      </div>
      <div class="price-summary-chip">
        <span class="price-summary-label">Режим</span>
        <strong>${allowPriceEdit ? 'Корректировка' : 'Просмотр'}</strong>
      </div>
    </div>
  `;
}

function getPriceCityMeta(city) {
  return pricesData?.countries?.RU?.cities?.[city] || {};
}

function getPriceCityRegionLabel(city) {
  const meta = getPriceCityMeta(city);
  return meta.region || meta.subject || meta.name || 'Регион не указан';
}

function normalizePriceCitySearch(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').trim();
}

function escapePriceCityJs(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getSortedPriceCities() {
  return Object.keys(pricesData?.countries?.RU?.cities || {})
    .sort((a, b) => a.localeCompare(b, 'ru'));
}

function getFilteredPriceCities(query, showAll = false) {
  const cities = getSortedPriceCities();
  const normalizedQuery = normalizePriceCitySearch(query);
  if (showAll || !normalizedQuery) return cities;

  return cities
    .map(city => {
      const citySearch = normalizePriceCitySearch(city);
      const regionSearch = normalizePriceCitySearch(getPriceCityRegionLabel(city));
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

function getPriceCityChangeHandler(id, fallback = 'changePriceListCity') {
  return document.getElementById(`${id}Combo`)?.dataset.cityChange || fallback;
}

function callPriceCityChangeHandler(handlerName, city) {
  const handler = window[handlerName];
  if (typeof handler === 'function') {
    handler(city);
  } else {
    changePriceListCity(city);
  }
}

function renderPriceCityDropdownOptions(id, query = '', showAll = false, onChange = 'changePriceListCity') {
  const cities = getFilteredPriceCities(query, showAll);
  if (!cities.length) {
    return '<div class="city-option-empty">Город не найден. Выберите значение из списка.</div>';
  }
  return cities.map(city => `
    <button type="button" class="city-option" onclick="selectPriceCity('${escapePriceCityJs(id)}', '${escapePriceCityJs(city)}', '${escapePriceCityJs(onChange)}')">
      <span>${escapeHtml(city)}</span>
      <small>${escapeHtml(getPriceCityRegionLabel(city))}</small>
    </button>
  `).join('');
}

function renderPriceCitySearchControl({ id, value, onChange }) {
  const resolvedValue = resolvePriceCity(value);
  const regionHint = resolvedValue ? getPriceCityRegionLabel(resolvedValue) : 'Выберите город';
  return `
    <div class="city-search-control">
      <div class="city-search-main">
        <div class="city-combobox" id="${id}Combo" data-city-change="${escapeHtml(onChange)}">
          <input type="search" id="${id}" value="${escapeHtml(value)}"
                 class="price-search-input city-search-input"
                 placeholder="Начните вводить город"
                 autocomplete="off"
                 onfocus="renderPriceCityDropdown('${escapePriceCityJs(id)}', this.value, false, '${escapePriceCityJs(onChange)}')"
                 oninput="handlePriceCityInput('${escapePriceCityJs(id)}', this.value, '${escapePriceCityJs(onChange)}')"
                 onchange="${onChange}(this.value)">
          <button type="button" class="city-combobox-toggle" onclick="togglePriceCityDropdown('${escapePriceCityJs(id)}')" aria-label="Открыть список городов">
            <i class="fas fa-chevron-down"></i>
          </button>
          <div class="city-dropdown" id="${id}Dropdown">
            ${renderPriceCityDropdownOptions(id, value, false, onChange)}
          </div>
        </div>
        <div class="city-region-hint${resolvedValue ? '' : ' city-region-hint--warning'}" id="${id}Region">${escapeHtml(regionHint)}</div>
      </div>
    </div>
  `;
}

function resolvePriceCity(rawCity) {
  const cities = Object.keys(pricesData?.countries?.RU?.cities || {});
  const normalized = normalizePriceCitySearch(rawCity);
  return cities.find(city => normalizePriceCitySearch(city) === normalized) || null;
}

function renderPriceCityDropdown(id, query = '', showAll = false, onChange = getPriceCityChangeHandler(id)) {
  const dropdown = document.getElementById(`${id}Dropdown`);
  if (!dropdown) return;
  dropdown.innerHTML = renderPriceCityDropdownOptions(id, query, showAll, onChange);
  dropdown.classList.add('is-open');
}

function closePriceCityDropdowns(exceptId = '') {
  document.querySelectorAll('.city-dropdown.is-open').forEach(dropdown => {
    if (!exceptId || dropdown.id !== `${exceptId}Dropdown`) dropdown.classList.remove('is-open');
  });
}

function getRoomRepairEstimateMeta(item = {}) {
  if (item?.autoSource !== 'roomRepair' && !item?.roomRepairLabel) return {};
  const label = item?.roomRepairLabel || item?.displayName || item?.label || item?.name || '';
  const meta = {
    displayName: label || undefined,
    source: 'roomRepair',
    sourceLabel: 'Рассчитать ремонт',
    sourceMode: item?.manualEdited ? 'manual' : 'auto',
    roomRepairLabel: label
  };
  [
    'roomRepairGroup',
    'roomRepairNode',
    'roomRepairDetailGroup',
    'roomRepairZoneKey',
    'roomRepairZoneLabel',
    'roomRepairZoneHint',
    'roomRepairQuantitySource',
    'roomRepairQtyMode',
    'roomRepairQtyTrace',
    'roomRepairMeasureLabel',
    'roomRepairPackage',
    'roomRepairPackageName',
    'roomRepairCalculationMode',
    'roomRepairCalculationModeName',
    'roomRepairUnitPrice'
  ].forEach(key => {
    if (item?.[key]) meta[key] = item[key];
  });
  return meta;
}

function handlePriceCityInput(id, value, onChange = getPriceCityChangeHandler(id)) {
  renderPriceCityDropdown(id, value, false, onChange);
  const resolvedCity = resolvePriceCity(value);
  const regionEl = document.getElementById(`${id}Region`);
  if (resolvedCity) {
    callPriceCityChangeHandler(onChange, resolvedCity);
  } else if (regionEl) {
    regionEl.textContent = 'Выберите город из списка';
    regionEl.classList.add('city-region-hint--warning');
  }
}

function togglePriceCityDropdown(id) {
  const dropdown = document.getElementById(`${id}Dropdown`);
  const input = document.getElementById(id);
  if (!dropdown) return;
  const willOpen = !dropdown.classList.contains('is-open');
  closePriceCityDropdowns(id);
  if (willOpen) {
    dropdown.innerHTML = renderPriceCityDropdownOptions(id, '', true, getPriceCityChangeHandler(id));
    dropdown.classList.add('is-open');
    if (input) input.focus();
  } else {
    dropdown.classList.remove('is-open');
  }
}

function selectPriceCity(id, city, onChange = getPriceCityChangeHandler(id)) {
  const input = document.getElementById(id);
  if (input) input.value = city;
  closePriceCityDropdowns();
  callPriceCityChangeHandler(onChange, city);
}

document.addEventListener('click', event => {
  if (!event.target.closest('.city-combobox')) closePriceCityDropdowns();
});

function syncTariffCityField(city, options = {}) {
  const resolvedCity = resolvePriceCity(city);
  const value = resolvedCity || '';
  currentTariffCity = value;
  window.currentTariffCity = value;

  const input = document.getElementById('tariffCity');
  if (input && input.value !== value) input.value = value;

  const hiddenInput = document.getElementById('selectedCity');
  if (hiddenInput) hiddenInput.value = value;

  const regionEl = document.getElementById('tariffCityRegion');
  if (regionEl) {
    regionEl.textContent = resolvedCity
      ? getPriceCityRegionLabel(resolvedCity)
      : (options.message || 'Выберите город');
    regionEl.classList.toggle('city-region-hint--warning', !resolvedCity);
  }
  if (typeof updateRequiredFieldHints === 'function') updateRequiredFieldHints();
}

function renderTariffCityControl(value = currentTariffCity || currentCity || '') {
  const container = document.getElementById('tariffCityControl');
  if (!container || !pricesData?.countries?.RU?.cities) return;
  const resolvedCity = resolvePriceCity(value);
  container.innerHTML = renderPriceCitySearchControl({
    id: 'tariffCity',
    value: resolvedCity || '',
    onChange: 'changeTariffCity'
  });
  syncTariffCityField(resolvedCity || '', { message: 'Выберите город' });
}

function markTariffCityUnresolved(message = 'Выберите город') {
  currentTariffCity = '';
  window.currentTariffCity = '';
  const input = document.getElementById('tariffCity');
  if (input) input.value = '';
  const hiddenInput = document.getElementById('selectedCity');
  if (hiddenInput) hiddenInput.value = '';
  const regionEl = document.getElementById('tariffCityRegion');
  if (regionEl) {
    regionEl.textContent = message;
    regionEl.classList.add('city-region-hint--warning');
  }
  if (typeof updateRequiredFieldHints === 'function') updateRequiredFieldHints();
}

function updateTariffCityFromAddress(address) {
  if (!pricesData?.countries?.RU?.cities) return;
  const trimmedAddress = String(address || '').trim();
  if (!trimmedAddress) {
    markTariffCityUnresolved('Выберите город');
    return;
  }
  const detectedCity = detectTariffCityFromAddress(trimmedAddress);
  if (detectedCity) {
    changeTariffCity(detectedCity);
  } else {
    markTariffCityUnresolved('Выберите город');
  }
}

function changeTariffCity(city) {
  const resolvedCity = resolvePriceCity(city);
  if (!resolvedCity) {
    markTariffCityUnresolved('Выберите город из списка');
    return;
  }

  syncTariffCityField(resolvedCity);

  if (currentCity !== resolvedCity) {
    changePriceListCity(resolvedCity, { skipTariff: true });
  }
  if (typeof changeMaterialsCity === 'function' && window.currentMaterialsCity !== resolvedCity) {
    changeMaterialsCity(resolvedCity, { skipTariff: true });
  }
  if (typeof updateRequiredFieldHints === 'function') updateRequiredFieldHints();
  if (typeof updateDetailedCalc === 'function') updateDetailedCalc();
}

function getWorkDurationHours(item) {
  const duration = Number(item?.hoursPerUnit);
  return Number.isFinite(duration) && duration >= 0 ? duration : 0;
}

function getTechnologicalIntervalHours(item) {
  const interval = Number(item?.technologicalIntervalHours);
  return Number.isFinite(interval) && interval >= 0 ? interval : 0;
}

function renderPriceTable(items, prices, compact = false) {
  const rows = items
    .filter(item => prices[item.id] !== undefined && prices[item.id] !== null)
    .map(item => {
      const itemPrice = prices[item.id];
      const overridePrice = pricesOverrides[item.id];
      const displayPrice = overridePrice !== undefined ? overridePrice : (itemPrice || 0);

      return `
        <tr class="price-table-row">
          <td class="price-table-cell price-name-cell" data-label="Работа">${escapeHtml(item.name)}</td>
          <td class="price-table-cell price-unit-cell" data-label="Ед.изм.">${escapeHtml(item.unit)}</td>
          <td class="price-table-cell price-value-cell" data-label="Цена">
            ${allowPriceEdit ? `
              <div class="price-edit-box${compact ? ' compact' : ''}">
                <input type="number" id="price_${item.id}" value="${displayPrice}" class="price-edit-input${compact ? ' compact' : ''}" onchange="updatePriceOverride('${item.id}', this.value)">
                <span class="price-currency">₽</span>
              </div>
            ` : `
              <span class="price-value-text">${displayPrice.toFixed(0)} ₽</span>
            `}
          </td>
          ${showWorkDuration ? `
            <td class="price-table-cell price-hours-cell" data-label="Часы работы">
              <span class="price-hours-text">${getWorkDurationHours(item).toFixed(2)}</span>
            </td>
          ` : ''}
          ${showTechnologicalInterval ? `
            <td class="price-table-cell price-interval-cell" data-label="Тех. интервал">
              <span class="price-interval-text">${getTechnologicalIntervalHours(item).toFixed(2)}</span>
            </td>
          ` : ''}
          ${allowPriceEdit ? `
            <td class="price-table-cell price-action-cell" data-label="Корр-ка" id="price-action-cell_${item.id}">
              ${overridePrice !== undefined ? `
                <div class="price-action-stack">
                  <span class="price-adjusted-badge">Вручную</span>
                  <button class="price-reset-btn" onclick="resetPriceOverride('${item.id}')" title="Сбросить цену">
                    <i class="fas fa-rotate-left"></i>
                  </button>
                </div>
              ` : '<span class="price-action-placeholder">—</span>'}
            </td>
          ` : ''}
        </tr>
      `;
    })
    .join('');

  if (!rows) {
    return '<div class="price-empty-inline">Для выбранных параметров цены не найдены.</div>';
  }

  return `
    <div class="price-table-wrap">
      <table class="price-table${compact ? ' compact' : ''}">
        <thead>
          <tr>
            <th>Работа</th>
            <th class="price-unit-heading">Ед.изм.</th>
            <th class="price-value-heading">Цена</th>
            ${showWorkDuration ? '<th class="price-hours-heading">Часы работы</th>' : ''}
            ${showTechnologicalInterval ? '<th class="price-interval-heading">Тех. интервал</th>' : ''}
            ${allowPriceEdit ? '<th class="price-action-heading">Корр-ка</th>' : ''}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// Рендер настроек прайс-листа (выбор города, рынка, опции корректировки)
function renderPriceListSettings() {
  const markets = Object.keys(pricesData.markets || {});
  
  const settingsHtml = `
    <div class="price-list-shell">
      <div class="price-list-toolbar">
        <div class="price-list-toolbar-head">
          <div>
            <div class="price-list-eyebrow">Навигация по прайсу</div>
            <div class="price-list-toolbar-title">Выбор параметров прайс-листа по работам</div>
          </div>
          <div class="price-list-toolbar-note">Цены и состав работ обновляются мгновенно.</div>
        </div>

        ${getPriceListSummaryHtml()}

        <div class="price-list-controls-grid">
          <div class="price-filter-card">
            <label class="price-filter-label">
              <i class="fas fa-map-marker-alt text-brand-500"></i>
              <span>Город</span>
            </label>
            ${renderPriceCitySearchControl({ id: 'priceListCity', value: currentCity, onChange: 'changePriceListCity' })}
          </div>
          
          <div class="price-filter-card">
            <label class="price-filter-label">
              <i class="fas fa-layer-group text-brand-500"></i>
              <span>Тип ремонта</span>
            </label>
            <select id="priceListMarket" class="price-filter-select" onchange="changePriceListMarket(this.value)">
            ${markets.map(market => `
              <option value="${market}" ${market === currentMarket ? 'selected' : ''}>${market}</option>
            `).join('')}
            </select>
          </div>

          <div class="price-filter-card price-filter-card-search">
            <label class="price-filter-label">
              <i class="fas fa-search text-brand-500"></i>
              <span>Поиск по работам</span>
            </label>
            <input type="text" id="priceSearchInput" placeholder="Например: керамогранит, электрика, окно" class="price-search-input" oninput="performPriceSearch(this.value)">
          </div>

          <button type="button" class="price-checkbox-toggle" onclick="togglePriceListCheckboxes()" aria-expanded="${showPriceListCheckboxes}" aria-controls="priceListCheckboxPanel">
            <span>${showPriceListCheckboxes ? 'Скрыть чек-боксы' : 'Показать чек-боксы'}</span>
            <i class="fas fa-chevron-down" style="transform:${showPriceListCheckboxes ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>
          </button>

          <div class="price-checkbox-panel ${showPriceListCheckboxes ? 'is-open' : ''}" id="priceListCheckboxPanel">
            <div class="price-checkbox-panel-inner">
              <label class="price-edit-toggle" for="allowPriceEdit">
                <input type="checkbox" id="allowPriceEdit" ${allowPriceEdit ? 'checked' : ''} onchange="togglePriceEditing(this.checked)">
                <span class="price-edit-toggle-box">
                  <span class="price-edit-toggle-title">Ручная корректировка</span>
                  <span class="price-edit-toggle-text">Переключает прайс в режим редактирования цен по строкам.</span>
                </span>
              </label>

              <label class="price-edit-toggle" for="showWorkDuration">
                <input type="checkbox" id="showWorkDuration" ${showWorkDuration ? 'checked' : ''} onchange="toggleWorkDuration(this.checked)">
                <span class="price-edit-toggle-box">
                  <span class="price-edit-toggle-title">Показать продолжительность работ</span>
                  <span class="price-edit-toggle-text">Добавляет колонку с часами работы на единицу измерения.</span>
                </span>
              </label>

              <label class="price-edit-toggle" for="showTechnologicalInterval">
                <input type="checkbox" id="showTechnologicalInterval" ${showTechnologicalInterval ? 'checked' : ''} onchange="toggleTechnologicalInterval(this.checked)">
                <span class="price-edit-toggle-box">
                  <span class="price-edit-toggle-title">Технологический интервал</span>
                  <span class="price-edit-toggle-text">Показывает часы выдержки перед следующим этапом работ.</span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const settingsContainer = document.getElementById('priceListSettings');
  if (settingsContainer) {
    settingsContainer.innerHTML = settingsHtml;
  }
}

function togglePriceListCheckboxes() {
  showPriceListCheckboxes = !showPriceListCheckboxes;
  window.showPriceListCheckboxes = showPriceListCheckboxes;
  renderPriceListSettings();
}

// Поиск по прайс-листу
function performPriceSearch(query) {
  priceSearchQuery = query;
  const contentContainer = document.getElementById('priceListContent');
  if (!contentContainer) return;
  
  if (!query.trim()) {
    renderPriceListContent();
    return;
  }
  
  const lowerQuery = query.toLowerCase();
  const searchResults = {
    demolition: {},
    installation: {}
  };
  
  // Поиск в демонтажных работах
  for (const [catKey, category] of Object.entries(pricesData.works.demolition.categories || {})) {
    // Если есть подкатегории
    if (category.subcategories) {
      let matchedSubcategories = filterNestedSubcategories(category.subcategories, lowerQuery);
      if (Object.keys(matchedSubcategories).length > 0) {
        searchResults.demolition[catKey] = { ...category, subcategories: matchedSubcategories };
      }
    } else {
      // Просто items
      const matchedItems = (category.items || []).filter(item =>
        item.name.toLowerCase().includes(lowerQuery) || item.id.toLowerCase().includes(lowerQuery)
      );
      if (matchedItems.length > 0) {
        searchResults.demolition[catKey] = { ...category, items: matchedItems };
      }
    }
  }
  
  // Поиск в монтажных работах
  for (const [catKey, category] of Object.entries(pricesData.works.installation.categories || {})) {
    // Если есть подкатегории
    if (category.subcategories) {
      let matchedSubcategories = filterNestedSubcategories(category.subcategories, lowerQuery);
      if (Object.keys(matchedSubcategories).length > 0) {
        searchResults.installation[catKey] = { ...category, subcategories: matchedSubcategories };
      }
    } else {
      // Просто items
      const matchedItems = (category.items || []).filter(item =>
        item.name.toLowerCase().includes(lowerQuery) || item.id.toLowerCase().includes(lowerQuery)
      );
      if (matchedItems.length > 0) {
        searchResults.installation[catKey] = { ...category, items: matchedItems };
      }
    }
  }
  
  const prices = pricesData.prices[currentCity]?.[currentMarket] || {};
  let html = '<div class="price-list-results">';
  
  if (Object.keys(searchResults.demolition).length === 0 && Object.keys(searchResults.installation).length === 0) {
    html += `
      <div class="price-empty-state">
        <div class="price-empty-icon"><i class="fas fa-search"></i></div>
        <div class="price-empty-title">Работы не найдены</div>
        <div class="price-empty-text">Попробуйте сократить запрос или выбрать другой тип ремонта.</div>
      </div>
    `;
  } else {
    if (Object.keys(searchResults.demolition).length > 0) {
      html += `<section class="price-domain-panel"><div class="price-domain-header">
        <div class="price-domain-title"><i class="fas fa-dumpster text-brand-500"></i><span>Демонтажные работы</span></div>
        <div class="price-domain-count">${getTotalWorkCount(searchResults.demolition)}</div>
      </div><div class="space-y-3">`;
      
      for (const [catKey, category] of Object.entries(searchResults.demolition)) {
        html += renderPriceCategory(category, prices, 'demolition_' + catKey, true);
      }
      html += '</div></section>';
    }
    
    if (Object.keys(searchResults.installation).length > 0) {
      html += `<section class="price-domain-panel"><div class="price-domain-header">
        <div class="price-domain-title"><i class="fas fa-hammer text-brand-500"></i><span>Монтажные работы</span></div>
        <div class="price-domain-count">${getTotalWorkCount(searchResults.installation)}</div>
      </div><div class="space-y-3">`;
      
      for (const [catKey, category] of Object.entries(searchResults.installation)) {
        html += renderPriceCategory(category, prices, 'installation_' + catKey, true);
      }
      html += '</div></section>';
    }
  }
  
  html += '</div>';
  contentContainer.innerHTML = html;
}

// Изменение выбранного города
function changePriceListCity(city, options = {}) {
  const resolvedCity = resolvePriceCity(city);
  const regionEl = document.getElementById('priceListCityRegion');
  if (!resolvedCity) {
    if (regionEl) {
      regionEl.textContent = 'Выберите город из списка';
      regionEl.classList.add('city-region-hint--warning');
    }
    return;
  }
  currentCity = resolvedCity;
  window.currentCity = resolvedCity;
  if (regionEl) {
    regionEl.textContent = getPriceCityRegionLabel(resolvedCity);
    regionEl.classList.remove('city-region-hint--warning');
  }
  const cityInput = document.getElementById('priceListCity');
  if (cityInput && cityInput.value !== resolvedCity) cityInput.value = resolvedCity;
  if (!options.skipTariff) syncTariffCityField(resolvedCity);
  if (!options.skipMaterials && typeof changeMaterialsCity === 'function' && window.currentMaterialsCity !== resolvedCity) {
    changeMaterialsCity(resolvedCity, { skipTariff: true });
  }
  const summaryEl = document.querySelector('.price-list-summary');
  if (summaryEl) summaryEl.outerHTML = getPriceListSummaryHtml();
  console.log('Changed city to:', resolvedCity);
  
  if (priceSearchQuery) {
    performPriceSearch(priceSearchQuery);
  } else {
    renderPriceListContent();
  }
  updateEstimates();
}

// Изменение выбранного типа рынка
function changePriceListMarket(market) {
  currentMarket = market;
  console.log('Changed market to:', market);
  // Синхронизируем detailedRepairType
  const repairTypeVal = MARKET_TO_REPAIR_TYPE[market];
  const sel = document.getElementById('detailedRepairType');
    if (sel && repairTypeVal) sel.value = repairTypeVal;
  const summaryEl = document.querySelector('.price-list-summary');
  if (summaryEl) summaryEl.outerHTML = getPriceListSummaryHtml();
  if (priceSearchQuery) {
    performPriceSearch(priceSearchQuery);
  } else {
    renderPriceListContent();
  }
  updateEstimates();

}

// Включение/выключение редактирования цен
function togglePriceEditing(enabled) {
  allowPriceEdit = enabled;
  window.allowPriceEdit = enabled;
  if (!enabled) {
    pricesOverrides = {};
    window.pricesOverrides = pricesOverrides;
  }
  const summaryEl = document.querySelector('.price-list-summary');
  if (summaryEl) summaryEl.outerHTML = getPriceListSummaryHtml();
  if (priceSearchQuery) {
    performPriceSearch(priceSearchQuery);
  } else {
    renderPriceListContent();
  }
  updateEstimates();
}

// Включение/выключение колонки продолжительности работ
function toggleWorkDuration(enabled) {
  showWorkDuration = enabled;
  window.showWorkDuration = enabled;
  if (priceSearchQuery) {
    performPriceSearch(priceSearchQuery);
  } else {
    renderPriceListContent();
  }
}

// Включение/выключение колонки технологических интервалов
function toggleTechnologicalInterval(enabled) {
  showTechnologicalInterval = enabled;
  window.showTechnologicalInterval = enabled;
  if (priceSearchQuery) {
    performPriceSearch(priceSearchQuery);
  } else {
    renderPriceListContent();
  }
}

// Переключение раздела (свернуть/развернуть)
function togglePriceSection(sectionKey) {
  if (expandedSections.has(sectionKey)) {
    expandedSections.delete(sectionKey);
  } else {
    expandedSections.add(sectionKey);
  }
  if ((sectionKey === 'demolition' || sectionKey === 'installation') && !priceSearchQuery) {
    renderPriceListContent(false);
    return;
  }
  const icon = document.getElementById('priceIcon_' + sectionKey);
  const content = document.getElementById('priceContent_' + sectionKey);
  
  if (icon) {
    icon.style.transform = expandedSections.has(sectionKey) ? 'rotate(180deg)' : 'rotate(0deg)';
  }
  if (content) {
    content.style.display = expandedSections.has(sectionKey) ? 'block' : 'none';
  }
}

const PRICE_SECTION_ICONS = {
  // ── Финишные работы: пол ──────────────────────────────────────────────
  floor:                    'fa-table-cells',
  laminate:                 'fa-grip-lines-vertical',
  parquet:                  'fa-chess-board',
  engineered:               'fa-layer-group',
  solid:                    'fa-grip-lines',
  tile_ceramic:             'fa-th-large',
  tile_porcelain:           'fa-th',
  self_leveling:            'fa-water',
  polymer_coat:             'fa-flask',
  decorative:               'fa-paint-roller',
  decorative_plaster:       'fa-palette',
  spc:                      'fa-lock',
  lvt:                      'fa-ellipsis',
  vinyl_roll:               'fa-scroll',
  cork:                     'fa-leaf',
  carpet:                   'fa-couch',
  linoleum:                 'fa-scroll',
  general:                  'fa-toolbox',
  // ── Финишные работы: стены ────────────────────────────────────────────
  wall:                     'fa-border-all',
  wallpaper:                'fa-newspaper',
  photo_wallpaper:          'fa-image',
  paint:                    'fa-fill-drip',
  paint_manual:             'fa-paint-roller',
  paint_mech:               'fa-spray-can',
  manual:                   'fa-paint-roller',
  mech:                     'fa-spray-can',
  ceramic:                  'fa-th-large',
  porcelain:                'fa-th',
  mosaic:                   'fa-border-all',
  wall_tile_ceramic:        'fa-th-large',
  wall_tile_porcelain:      'fa-th',
  wall_tile_mosaic:         'fa-border-all',
  panels:                   'fa-table-columns',
  wood_cork:                'fa-tree',
  decor_elements:           'fa-star',
  decor:                    'fa-palette',
  // ── Финишные работы: потолок ──────────────────────────────────────────
  ceiling:                  'fa-table-cells-large',
  stretch:                  'fa-expand',
  gkl:                      'fa-square-full',
  suspended:                'fa-grip-lines',
  paint_finish:             'fa-fill-drip',
  wood:                     'fa-tree',
  // ── Финишные работы: проёмы ───────────────────────────────────────────
  partitions:               'fa-border-none',
  openings:                 'fa-door-open',
  stairs:                   'fa-stairs',
  staircase:                'fa-stairs',
  stair_install:            'fa-stairs',
  stair_cladding:           'fa-trowel-bricks',
  railing_install:          'fa-grip-lines',
  railing:                  'fa-grip-lines',
  door:                     'fa-door-closed',
  window:                   'fa-window-maximize',
  balcony:                  'fa-person-walking-arrow-right',
  concrete:                 'fa-cubes',
  metal:                    'fa-industry',
  glass:                    'fa-panorama',
  forged:                   'fa-wand-magic-sparkles',
  composite:                'fa-layer-group',
  natural_stone:            'fa-mountain',
  // ── Инженерные работы ─────────────────────────────────────────────────
  electrical:               'fa-bolt',
  ventilation:              'fa-wind',
  water:                    'fa-faucet',
  plumbing:                 'fa-faucet',
  drainage:                 'fa-arrow-down-short-wide',
  heating:                  'fa-thermometer-half',
  sockets_switches:         'fa-plug',
  switches:                 'fa-plug',
  wiring:                   'fa-ethernet',
  lighting:                 'fa-lightbulb',
  panel_protection:         'fa-shield-halved',
  protection:               'fa-shield-halved',
  low_current:              'fa-wifi',
  current:                  'fa-wifi',
  smart_home:               'fa-house-signal',
  home:                     'fa-house-signal',
  warm_floor_electric:      'fa-fire',
  electric:                 'fa-fire',
  ac:                       'fa-snowflake',
  exhaust:                  'fa-upload',
  supply:                   'fa-download',
  service:                  'fa-screwdriver-wrench',
  pipes:                    'fa-minus',
  collectors_valves:        'fa-sliders',
  valves:                   'fa-sliders',
  filtration:               'fa-filter',
  equipment:                'fa-plug',
  protection_service:       'fa-shield-halved',
  drain_pipes:              'fa-minus',
  drain_risers:             'fa-arrow-down-long',
  risers:                   'fa-arrow-down-long',
  drain_outlets:            'fa-circle-dot',
  outlets:                  'fa-circle-dot',
  drain_pumps:              'fa-pump-soap',
  pumps:                    'fa-pump-soap',
  drain_service:            'fa-screwdriver-wrench',
  radiators:                'fa-radiation',
  heating_pipes:            'fa-minus',
  boilers_equipment:        'fa-fire',
  valves_control:           'fa-sliders',
  floor_heating:            'fa-temperature-half',
  heating_service:          'fa-screwdriver-wrench',
  // ── Черновые работы: L1 (suffix2 = rough_XXX, suffix1 = XXX) ─────────
  rough_floorLeveling:      'fa-layer-group',
  floorLeveling:            'fa-layer-group',
  rough_wallLeveling:       'fa-border-all',
  wallLeveling:             'fa-border-all',
  rough_wallPlaster:        'fa-trowel',
  wallPlaster:              'fa-trowel',
  rough_wallPutty:          'fa-paint-roller',
  wallPutty:                'fa-paint-roller',
  rough_wallWaterproof:     'fa-droplet',
  wallWaterproof:           'fa-droplet',
  rough_ceilingPrep:        'fa-table-cells-large',
  ceilingPrep:              'fa-table-cells-large',
  // ── Черновые работы: L2 выравнивание пола ────────────────────────────
  floor_screed:             'fa-layer-group',
  screed:                   'fa-layer-group',
  base_prep:                'fa-toolbox',
  floor_base_prep:          'fa-toolbox',
  prep:                     'fa-toolbox',
  floor_waterproof:         'fa-droplet',
  waterproof:               'fa-droplet',
  sound_insulation:         'fa-volume-xmark',
  floor_sound_insulation:   'fa-volume-xmark',
  insulation:               'fa-volume-xmark',
  // ── Черновые работы: L2 штукатурка стен ──────────────────────────────
  plaster_gypsum:           'fa-fill-drip',
  gypsum:                   'fa-fill-drip',
  plaster_cement:           'fa-industry',
  cement:                   'fa-industry',
  plaster_reinforced:       'fa-grip-lines',
  reinforced:               'fa-grip-lines',
  plaster_gkl:              'fa-square-full',
  // ── Черновые работы: L2 шпаклёвка стен ───────────────────────────────
  putty_base:               'fa-paint-roller',
  base:                     'fa-paint-roller',
  putty_prep:               'fa-brush',
  // ── Черновые работы: L2 подготовка потолка ───────────────────────────
  ceiling_leveling:         'fa-table-cells-large',
  leveling:                 'fa-table-cells-large',
  putty_prime:              'fa-fill-drip',
  ceiling_putty_prime:      'fa-fill-drip',
  prime:                    'fa-fill-drip',
  ceiling_insulation:       'fa-shield-halved',
};

function getPriceSectionIcon(sectionKey) {
  const parts = sectionKey.split('_');
  // Проверяем сначала двойной суффикс (tile_ceramic, tile_porcelain), затем одиночный
  const suffix2 = parts.slice(-2).join('_');
  const suffix1 = parts[parts.length - 1];
  const icon = PRICE_SECTION_ICONS[suffix2] || PRICE_SECTION_ICONS[suffix1];
  return icon ? `<i class="fas ${icon} text-brand-500" style="font-size:0.85em;opacity:0.7;"></i>` : '';
}

// Рендер основного содержимого прайс-листа
function renderPriceListContent(resetExpanded = false) {
  if (!pricesData || !pricesData.prices) {
    console.error('Prices data not loaded yet');
    return;
  }
  
  console.log('Rendering prices for city:', currentCity, 'market:', currentMarket);
  
  const prices = pricesData.prices[currentCity]?.[currentMarket];
  
  if (!prices) {
    console.error('No prices found for', currentCity, currentMarket);
    return;
  }
  
  console.log('Prices loaded:', Object.keys(prices).length, 'items');

  if (resetExpanded) expandedSections.clear();

  let html = '<div class="price-list-results">';
  
  // Демонтажные работы
  html += '<section class="price-domain-panel">';
  html += `
    <div class="price-domain-header is-clickable" onclick="togglePriceSection('demolition')">
      <h4 class="price-domain-title">
        <i class="fas fa-dumpster text-brand-500"></i>
        <span>Демонтажные работы</span>
      </h4>
      <div class="price-domain-actions">
        <span class="price-domain-count">${getTotalWorkCount(pricesData.works.demolition.categories || {})}</span>
        <i class="fas fa-chevron-down text-gray-600 dark:text-gray-300 transition-transform" id="priceIcon_demolition" style="transform: ${expandedSections.has('demolition') ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
      </div>
    </div>
    <div id="priceContent_demolition" class="mt-3 space-y-3" style="display: ${expandedSections.has('demolition') ? 'block' : 'none'};">
  `;
  
  if (expandedSections.has('demolition')) {
    for (const [catKey, category] of Object.entries(pricesData.works.demolition.categories || {})) {
      html += renderPriceCategory(category, prices, `demolition_${catKey}`);
    }
  }
  
  html += '</div></section>';
  
  // Монтажные работы
  html += '<section class="price-domain-panel">';
  html += `
    <div class="price-domain-header is-clickable" onclick="togglePriceSection('installation')">
      <h4 class="price-domain-title">
        <i class="fas fa-hammer text-brand-500"></i>
        <span>Монтажные работы по ремонту</span>
      </h4>
      <div class="price-domain-actions">
        <span class="price-domain-count">${getTotalWorkCount(pricesData.works.installation.categories || {})}</span>
        <i class="fas fa-chevron-down text-gray-600 dark:text-gray-300 transition-transform" id="priceIcon_installation" style="transform: ${expandedSections.has('installation') ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
      </div>
    </div>
    <div id="priceContent_installation" class="mt-3 space-y-3" style="display: ${expandedSections.has('installation') ? 'block' : 'none'};">
  `;
  
  if (expandedSections.has('installation')) {
    for (const [catKey, category] of Object.entries(pricesData.works.installation.categories || {})) {
      html += renderPriceCategory(category, prices, `installation_${catKey}`);
    }
  }
  
  html += '</div></section>';
  
  html += '</div>';
  
  const contentContainer = document.getElementById('priceListContent');
  if (contentContainer) {
    contentContainer.innerHTML = html;
  }
}

// Рендер категории работ с подкатегориями
function renderPriceCategory(category, prices, sectionKey, forceExpanded = false) {
  const items = category.items || [];
  const subcategories = category.subcategories || {};
  
  // Если есть подкатегории
  if (Object.keys(subcategories).length > 0) {
    const isExpanded = forceExpanded || expandedSections.has(sectionKey);
    const totalItems = Object.values(subcategories).reduce((sum, sub) => sum + getNestedItemCount(sub), 0);
    
    let html = `
      <div class="price-category-card">
        <div class="price-category-header" onclick="togglePriceSection('${sectionKey}')">
          <span class="price-category-title">${getPriceSectionIcon(sectionKey)}${category.name}</span>
          <span class="price-category-count">${totalItems}</span>
          <i class="fas fa-chevron-down text-gray-600 dark:text-gray-300 transition-transform" id="priceIcon_${sectionKey}" style="transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
        </div>
        <div id="priceContent_${sectionKey}" class="price-category-content" style="display: ${isExpanded ? 'block' : 'none'};">
    `;
    
    // Рендерим подкатегории
    for (const [subKey, subCategory] of Object.entries(subcategories)) {
      html += renderPriceSubCategory(subCategory, prices, `${sectionKey}_${subKey}`);
    }
    
    html += '</div></div>';
    return html;
  }
  
  // Если есть только items (без подкатегорий)
  if (!items || items.length === 0) return '';
  
  const isExpanded = forceExpanded || expandedSections.has(sectionKey);
  
  let html = `
    <div class="price-category-card">
      <div class="price-category-header" onclick="togglePriceSection('${sectionKey}')">
        <span class="price-category-title">${getPriceSectionIcon(sectionKey)}${category.name}</span>
        <span class="price-category-count">${items.length}</span>
        <i class="fas fa-chevron-down text-gray-600 dark:text-gray-300 transition-transform" id="priceIcon_${sectionKey}" style="transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
      </div>
      <div id="priceContent_${sectionKey}" class="price-category-table" style="display: none;">
        ${renderPriceTable(items, prices, false)}
      </div>
    </div>
  `;
  return html;
}

// Рендер подкатегории
function renderPriceSubCategory(subCategory, prices, sectionKey, forceExpanded = false, depth = 0) {
  const items = subCategory.items || [];
  const nestedSubcategories = subCategory.subcategories || {};
  const hasNestedSubcategories = Object.keys(nestedSubcategories).length > 0;
  const deepClass = depth >= 1 ? ' price-subcategory-card--deep' : '';

  if (hasNestedSubcategories && items.length === 0) {
    const totalItems = Object.values(nestedSubcategories).reduce((sum, sub) => sum + getNestedItemCount(sub), 0);
    const isExpanded = forceExpanded || expandedSections.has(sectionKey);

    let html = `
      <div class="price-subcategory-card${deepClass}">
        <div class="price-subcategory-header" onclick="togglePriceSection('${sectionKey}')">
          <span class="price-subcategory-title price-subcategory-title--dark">${getPriceSectionIcon(sectionKey)}${subCategory.name}</span>
          <span class="price-subcategory-count">${totalItems}</span>
          <i class="fas fa-chevron-down text-gray-500 dark:text-gray-300 transition-transform text-xs" id="priceIcon_${sectionKey}" style="transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
        </div>
        <div id="priceContent_${sectionKey}" class="price-subcategory-content" style="display: ${isExpanded ? 'block' : 'none'};">
    `;

    for (const [nestedKey, nestedSub] of Object.entries(nestedSubcategories)) {
      html += renderPriceSubCategory(nestedSub, prices, `${sectionKey}_${nestedKey}`, false, depth + 1);
    }

    html += '</div></div>';
    return html;
  }

  if (!items || items.length === 0) return '';

  const isExpanded = forceExpanded || expandedSections.has(sectionKey);

  let html = `
    <div class="price-subcategory-card${deepClass}">
      <div class="price-subcategory-header" onclick="togglePriceSection('${sectionKey}')">
        <span class="price-subcategory-title price-subcategory-title--dark">${getPriceSectionIcon(sectionKey)}${subCategory.name}</span>
        <span class="price-subcategory-count">${items.length}</span>
        <i class="fas fa-chevron-down text-gray-500 dark:text-gray-300 transition-transform text-xs" id="priceIcon_${sectionKey}" style="transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
      </div>
      <div id="priceContent_${sectionKey}" class="price-subcategory-table" style="display: ${isExpanded ? 'block' : 'none'};">
        ${renderPriceTable(items, prices, true)}
      </div>
    </div>
  `;

  return html;
}
// Обновить перезаписанную цену
function updatePriceOverride(itemId, value) {
  const numValue = parseFloat(value);
  if (!isNaN(numValue) && numValue >= 0) {
    pricesOverrides[itemId] = numValue;
    const cell = document.getElementById(`price-action-cell_${itemId}`);
    if (cell) {
      cell.innerHTML = `
        <div class="price-action-stack">
          <span class="price-adjusted-badge">Вручную</span>
          <button class="price-reset-btn" onclick="resetPriceOverride('${itemId}')" title="Сбросить цену">
            <i class="fas fa-rotate-left"></i>
          </button>
        </div>`;
    }
    updateEstimates();
  }
}

// Сбросить перезаписанную цену
function resetPriceOverride(itemId) {
  delete pricesOverrides[itemId];
  const originalPrice = pricesData.prices[currentCity]?.[currentMarket]?.[itemId] || 0;
  const inputElement = document.getElementById(`price_${itemId}`);
  if (inputElement) {
    inputElement.value = originalPrice;
  }
  const cell = document.getElementById(`price-action-cell_${itemId}`);
  if (cell) {
    cell.innerHTML = '<span class="price-action-placeholder">—</span>';
  }
  updateEstimates();
}

// Получить цену работы с учетом перезаписей
function getWorkPrice(workId) {
  if (pricesOverrides[workId] !== undefined) {
    return pricesOverrides[workId];
  }
  const activePricesData = syncActivePricesData();
  return activePricesData?.prices?.[currentCity]?.[currentMarket]?.[workId] || 0;
}

// Обновить сметы при изменении цен
function updateEstimates() {
  // Пересчитываем DOM-ячейки в разделе "Что нужно сделать"
  if (typeof roomData !== 'undefined' && roomData.demolitionData) {
    Object.keys(roomData.demolitionData).forEach(rid => {
      if (typeof updateConstructTotals === 'function') updateConstructTotals(rid);
      if (typeof updateElectricalTotals === 'function') updateElectricalTotals(rid);
      if (typeof updateEngineeringTotals === 'function') updateEngineeringTotals(rid);
      if (typeof updateFinishingTotals === 'function') updateFinishingTotals(rid);
      if (typeof updateStairsTotals === 'function') updateStairsTotals(rid);
    });
  }
  // Bridge through App adapter if available.
  if (window.App?.calc && typeof window.App.calc.recalculate === 'function') {
    window.App.calc.recalculate();
    return;
  }
  if (typeof calculateAndUpdateTotals === 'function') {
    calculateAndUpdateTotals();
  }
}

// Инициализация прайс-листа
function initPriceList() {
  const priceYear = getActivePriceListYear();
  Promise.all([
    fetch('prices_list.json?v=shower-tray-hidden-plumbing-20260525').then(response => response.json()),
    fetchOptionalJson(getYearlyReferencePriceListUrl(priceYear)),
    fetchOptionalJson('price_list_id_mapping.json?v=shower-tray-hidden-plumbing-20260525')
  ])
    .then(([data, yearlyReferenceData, mappingData]) => {
      const yearlySync = applyYearlyReferencePrices(data, yearlyReferenceData, mappingData, priceYear);
      window.pricesData = data;
      pricesData = data;
      workCatalogCache = null;
      window.workCatalogCache = null;
      console.log('Price list loaded successfully', yearlySync);
      
      // Инициализация маппинга городов
      if (pricesData.countries?.RU?.cities) {
        window.cityNameMap = pricesData.countries.RU.cities;
        cityNameMap = window.cityNameMap;
      }
      const resolvedLinkedCity = resolvePriceCity(window.currentTariffCity || window.currentCity || currentCity);
      if (resolvedLinkedCity) {
        currentCity = resolvedLinkedCity;
        window.currentCity = resolvedLinkedCity;
      }
      
      // Автоопределение города из адреса
      initializeLocationFromAddress();
      
      // Синхронизация рынка из типа ремонта
      syncMarketFromRepairType();
      
      // Рендер настроек и содержимого
      renderPriceListSettings();
      renderPriceListContent(true);
      if (typeof renderAllDemolitionFinishingSections === 'function') {
        renderAllDemolitionFinishingSections();
      }
      if (typeof renderAllRepairSections === 'function') {
        renderAllRepairSections();
        if (typeof restoreWhatToDoSubSections === 'function') restoreWhatToDoSubSections();
      }
      if (typeof scheduleWhatToDoEstimateUpdate === 'function') {
        scheduleWhatToDoEstimateUpdate();
      } else if (typeof updateDetailedCalc === 'function') {
        updateDetailedCalc();
      }
    })
    .catch(error => {
      console.error('Failed to load price list:', error);
      const settingsContainer = document.getElementById('priceListSettings');
      const contentContainer = document.getElementById('priceListContent');
      if (settingsContainer) {
        settingsContainer.innerHTML = '<div class="price-empty-state"><div class="price-empty-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="price-empty-title">Ошибка загрузки прайс-листа</div><div class="price-empty-text">Не удалось загрузить данные. Проверьте наличие файла prices_list.json и годового справочника работ.</div></div>';
      }
      if (contentContainer) {
        contentContainer.innerHTML = '';
      }
    });
}

// Инициализировать при загрузке страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPriceList);
} else {
  initPriceList();
}
