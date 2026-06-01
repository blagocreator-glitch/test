(function () {
  const ESTIMATE_SITE_NAME = 'Вашимастера.рф';
  const PRO_EXPORT_MESSAGE = 'Экспорт PDF и Excel доступен в PRO-версии';

  window.estimateExportConfig = {
    siteName: ESTIMATE_SITE_NAME,
    paid_access: true,
    enforcePaidAccess: false,
    proMessage: PRO_EXPORT_MESSAGE
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeXml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function formatMoney(value) {
    return toNumber(value).toLocaleString('ru-RU', {
      maximumFractionDigits: 0
    }) + ' ₽';
  }

  function formatQty(value) {
    const number = Math.round(toNumber(value) * 100) / 100;
    return number.toLocaleString('ru-RU', {
      minimumFractionDigits: number % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    });
  }

  function getSelectText(id, fallback = '') {
    const select = document.getElementById(id);
    if (!select) return fallback;
    const option = select.options?.[select.selectedIndex];
    return option?.text?.trim() || select.value || fallback;
  }

  function getSelectedGroupingLevel() {
    const value = Number(document.getElementById('estimateGroupingLevel')?.value);
    if (Number.isFinite(value) && value >= 1 && value <= 4) return value;
    return 2;
  }

  function shouldShowEstimateTechIntervals() {
    const input = document.getElementById('estimateShowTechIntervals');
    return input ? input.checked : true;
  }

  function shouldShowEstimateZoneTotals() {
    const input = document.getElementById('estimateShowZoneTotals');
    return input ? input.checked : false;
  }

  function getLabelFromList(list, value, fallback = '') {
    if (!value) return fallback;
    const item = Array.isArray(list) ? list.find(entry => entry.value === value || entry.name === value) : null;
    return item?.label || item?.name || fallback || value;
  }

  function getAppointmentLabel(value) {
    const buildingSubtype = document.getElementById('buildingSubtype')?.value || '';
    if (typeof buildingAppointments !== 'undefined') {
      for (const list of Object.values(buildingAppointments || {})) {
        const label = getLabelFromList(list, value);
        if (label) return label;
      }
      return getLabelFromList(buildingAppointments[buildingSubtype], value, value || 'Не указано');
    }
    return value || 'Не указано';
  }

  function getSubAppointmentLabel(value) {
    if (typeof buildingSubAppointments !== 'undefined') {
      for (const list of Object.values(buildingSubAppointments || {})) {
        const label = getLabelFromList(list, value);
        if (label) return label;
      }
    }
    if (typeof buildingAppointments !== 'undefined') {
      for (const list of Object.values(buildingAppointments || {})) {
        const label = getLabelFromList(list, value);
        if (label) return label;
      }
    }
    return value || 'Не указано';
  }

  function getRetailTypeLabel(value) {
    if (typeof getRetailPremiseTypeLabel === 'function') return getRetailPremiseTypeLabel(value);
    return getLabelFromList(typeof retailPremiseTypeOptions !== 'undefined' ? retailPremiseTypeOptions : [], value, value || '');
  }

  function getLocationLabel(value) {
    const map = {
      above_ground: 'Надземный этаж',
      basement: 'Подвальный этаж',
      ground_floor: 'Цокольный этаж',
      attic: 'Мансарда',
      loft: 'Чердак'
    };
    return map[value] || 'Надземный этаж';
  }

  function getRoomWallsArea(room) {
    if (toNumber(room?.wallsArea) > 0) return toNumber(room.wallsArea);
    if (typeof calculateLivingRoomWallsArea === 'function') return toNumber(calculateLivingRoomWallsArea(room || {}));
    return 0;
  }

  function getRoomName(categoryLabel, floorIndex, roomIndex, isMultiFloor) {
    const base = (categoryLabel === 'Жилое' || categoryLabel === 'Жилая' || categoryLabel === 'Жилая зона') ? 'Жилая зона' : 'Нежилая зона';
    return isMultiFloor
      ? `${base}_${floorIndex + 1}_${roomIndex + 1}`
      : `${base}_${roomIndex + 1}`;
  }

  function pushEstimateRoom(rooms, idPrefix, categoryLabel, room, floorIndex, roomIndex, isMultiFloor, floorLocation = '') {
    if (!room) return;
    const floorNumber = isMultiFloor ? floorIndex + 1 : toNumber(document.getElementById('floorNumber')?.value) || 1;
    const repairId = isMultiFloor
      ? `repair_${idPrefix}_${floorIndex}_${roomIndex}`
      : `repair_${idPrefix}_${roomIndex}`;
    const demoId = isMultiFloor
      ? `demo_${idPrefix}_${floorIndex}_${roomIndex}`
      : `demo_${idPrefix}_${roomIndex}`;
    const registryEntry = typeof getRoomRegistryEntry === 'function'
      ? getRoomRegistryEntry(idPrefix, floorIndex, roomIndex)
      : null;
    const registryName = typeof formatRoomRegistryLabel === 'function'
      ? formatRoomRegistryLabel(registryEntry || room, 'short')
      : '';
    const registryFullName = typeof formatRoomRegistryLabel === 'function'
      ? formatRoomRegistryLabel(registryEntry || room, 'full')
      : '';
    const registryContext = typeof formatRoomRegistryLabel === 'function'
      ? formatRoomRegistryLabel(registryEntry || room, 'context')
      : '';
    const registryExportLabel = typeof formatRoomRegistryLabel === 'function'
      ? formatRoomRegistryLabel(registryEntry || room, 'export')
      : '';
    const meta = {
      id: repairId,
      aliases: [repairId, demoId],
      floorNumber,
      categoryKey: idPrefix,
      categoryLabel,
      name: registryName || room.displayName || getRoomName(categoryLabel, floorIndex, roomIndex, isMultiFloor),
      legacyName: getRoomName(categoryLabel, floorIndex, roomIndex, isMultiFloor),
      roomUid: registryEntry?.uid || room.roomUid || '',
      globalRoomNumber: registryEntry?.globalRoomNumber || room.globalRoomNumber || 0,
      floorRoomNumber: registryEntry?.floorRoomNumber || room.floorRoomNumber || roomIndex + 1,
      floorDisplayName: registryEntry?.floorDisplayName || room.floorDisplayName || `Этажное помещение ${roomIndex + 1}`,
      fullDisplayName: registryFullName || room.fullDisplayName || room.displayName || getRoomName(categoryLabel, floorIndex, roomIndex, isMultiFloor),
      chamberDisplayName: registryEntry?.chamberDisplayName || room.chamberDisplayName || 'Комната 1',
      roomZone: room.roomZone || room.category || '',
      registryContextLine: registryContext || room.registryContextLine || '',
      registryExportLabel: registryExportLabel || room.registryExportLabel || '',
      appointment: getAppointmentLabel(room.appointment),
      format: getSubAppointmentLabel(room.subAppointment),
      retailPremiseType: getRetailTypeLabel(room.retailPremiseType),
      location: getLocationLabel(room.location || floorLocation),
      roomType: room.roomType || ((categoryLabel === 'Жилое' || categoryLabel === 'Жилая' || categoryLabel === 'Жилая зона') ? 'Спальня' : 'Санузел'),
      peopleCount: toNumber(room.peopleCount),
      ceiling: toNumber(room.ceiling) || 3,
      floorArea: toNumber(room.area),
      wallsArea: getRoomWallsArea(room),
      ceilingArea: typeof getLivingRoomCeilingArea === 'function'
        ? toNumber(getLivingRoomCeilingArea(room))
        : (toNumber(room.ceilingArea) || toNumber(room.area))
    };
    rooms.push(meta);
  }

  function collectEstimateRooms() {
    const rooms = [];
    const state = typeof roomData !== 'undefined' ? roomData : {};
    if (typeof getHouseRoomWorkItems === 'function') {
      return getHouseRoomWorkItems({ includeZeroArea: true }).map(item => {
        const room = item.room || {};
        return {
          id: item.repairRoomId,
          aliases: [item.repairRoomId, item.demoRoomId, item.key].filter(Boolean),
          floorNumber: item.floorNumber,
          categoryKey: item.sourceCategory,
          categoryLabel: item.categoryLabel,
          name: item.estimateLabel || item.fullDisplayName || item.displayName || 'Помещение',
          legacyName: item.sourceCategory === 'living'
            ? `Жилое помещение_${item.floorIndex + 1}_${item.roomIndex + 1}`
            : `Нежилое помещение_${item.floorIndex + 1}_${item.roomIndex + 1}`,
          roomUid: item.roomUid,
          globalRoomNumber: item.globalRoomNumber,
          floorRoomNumber: item.floorRoomNumber,
          floorDisplayName: item.floorDisplayName,
          fullDisplayName: item.fullDisplayName,
          chamberDisplayName: item.chamberDisplayName,
          roomGroupType: item.roomGroupType,
          roomGroupName: item.roomGroupName,
          roomInsideGroupNumber: item.roomInsideGroupNumber,
          roomZone: item.category,
          registryContextLine: item.floorRoomPath || item.registryContextLine || '',
          registryExportLabel: item.registryExportLabel || item.floorRoomPath || '',
          appointment: getAppointmentLabel(item.appointment || room.appointment),
          format: getSubAppointmentLabel(item.subAppointment || room.subAppointment),
          retailPremiseType: getRetailTypeLabel(item.retailPremiseType || room.retailPremiseType),
          location: item.floorLocationLabel || getLocationLabel(item.floorLocation || room.location),
          roomType: room.roomType || item.roomType || ((item.category === 'living') ? 'Спальня' : 'Санузел'),
          peopleCount: toNumber(room.peopleCount || item.peopleCount),
          ceiling: toNumber(room.ceiling) || 3,
          floorArea: toNumber(room.area),
          wallsArea: getRoomWallsArea(room),
          ceilingArea: typeof getLivingRoomCeilingArea === 'function'
            ? toNumber(getLivingRoomCeilingArea(room))
            : (toNumber(room.ceilingArea) || toNumber(room.area))
        };
      });
    }
    if (typeof validateHouseRoomRegistry === 'function') {
      const registryCheck = validateHouseRoomRegistry();
      if (!registryCheck.ok) {
        console.warn('Room registry validation issues:', registryCheck.issues);
      }
    } else if (typeof buildHouseRoomRegistry === 'function') {
      buildHouseRoomRegistry(true);
    }
    ['living', 'nonliving'].forEach(key => {
      const categoryLabel = key === 'living' ? 'Жилое' : 'Нежилое';
      const branch = state?.[key];
      let floorRoomCount = 0;
      if (Array.isArray(branch?.floors) && branch.floors.length) {
        branch.floors.forEach((floor, floorIndex) => {
          (floor.livingRooms || []).forEach((room, roomIndex) => {
            floorRoomCount += 1;
            const zoneLabel = typeof getRoomZoneLabel === 'function'
              ? getRoomZoneLabel(room.roomZone || room.category || key).replace(' зона', '')
              : categoryLabel;
            pushEstimateRoom(rooms, key, zoneLabel, room, floorIndex, roomIndex, true, floor?.location);
          });
        });
      }
      if (floorRoomCount === 0) {
        (branch?.livingRooms || []).forEach((room, roomIndex) => {
          const zoneLabel = typeof getRoomZoneLabel === 'function'
            ? getRoomZoneLabel(room.roomZone || room.category || key).replace(' зона', '')
            : categoryLabel;
          pushEstimateRoom(rooms, key, zoneLabel, room, 0, roomIndex, false);
        });
      }
    });
    return rooms;
  }

  function buildRoomMap(rooms) {
    const map = new Map();
    rooms.forEach(room => {
      room.aliases.forEach(alias => map.set(alias, room));
    });
    return map;
  }

  function getWorkItem(workId) {
    const catalog = typeof getWorkCatalog === 'function' ? getWorkCatalog() : null;
    return catalog?.byId?.get(workId) || {};
  }

  function getEstimatePricesData() {
    if (typeof syncActivePricesData === 'function') return syncActivePricesData();
    return window.pricesData || null;
  }

  function buildWorkPathCatalog() {
    const data = getEstimatePricesData();
    const byId = new Map();
    if (!data?.works) return byId;

    function walk(node, path) {
      if (!node || typeof node !== 'object') return;
      const nodeName = node.name || '';
      const nextPath = nodeName ? [...path, nodeName] : path;
      (node.items || []).forEach(item => {
        if (item?.id) byId.set(item.id, nextPath);
      });
      Object.values(node.categories || {}).forEach(child => walk(child, nextPath));
      Object.values(node.subcategories || {}).forEach(child => walk(child, nextPath));
    }

    Object.values(data.works || {}).forEach(domain => walk(domain, []));
    return byId;
  }

  function getWorkPath(workId) {
    if (!window.estimateWorkPathCatalog || window.estimateWorkPathCatalogSource !== getEstimatePricesData()) {
      window.estimateWorkPathCatalogSource = getEstimatePricesData();
      window.estimateWorkPathCatalog = buildWorkPathCatalog();
    }
    return window.estimateWorkPathCatalog?.get(workId) || [];
  }

  function normalizeWorkLine(line) {
    const item = getWorkItem(line.workId);
    const workPath = getWorkPath(line.workId);
    const qty = toNumber(line.qty);
    const hoursPerUnit = toNumber(item.hoursPerUnit);
    const technologicalIntervalHours = toNumber(item.technologicalIntervalHours);
    const workHours = hoursPerUnit * qty;
    const techHours = technologicalIntervalHours;
    return {
      ...line,
      kind: 'works',
      name: line.displayName || item.name || line.name || line.workId || 'Работа',
      workPath,
      unit: item.unit || line.unit || 'ед.',
      qty,
      unitPrice: toNumber(line.unitPrice),
      total: toNumber(line.total),
      workHours,
      techHours,
      totalHours: workHours + techHours
    };
  }

  function isEstimateDiscreteUnit(unit = '') {
    const normalized = String(unit || '').trim().toLowerCase().replace(/\./g, '');
    return ['шт', 'компл', 'комплект', 'уп', 'упак', 'упаковка', 'пач', 'пачка', 'рул', 'рулон', 'ведро', 'меш', 'мешок', 'банка'].includes(normalized);
  }

  function normalizeMaterialLine(line) {
    const unit = line.unit || 'ед.';
    const rawQty = toNumber(line.qty);
    const qty = isEstimateDiscreteUnit(unit) && rawQty > 0 ? Math.max(1, Math.ceil(rawQty)) : rawQty;
    const unitPrice = toNumber(line.unitPrice);
    return {
      ...line,
      kind: 'materials',
      name: line.materialName || line.name || line.materialId || 'Материал',
      workPath: getWorkPath(line.workId),
      unit,
      qty,
      unitPrice,
      total: isEstimateDiscreteUnit(unit) ? unitPrice * qty : toNumber(line.total),
      workHours: 0,
      techHours: 0,
      totalHours: 0
    };
  }

  function getSelectedEstimateType() {
    return document.querySelector('input[name="estimateExportType"]:checked')?.value || 'all';
  }

  function getSelectedEstimateFormat() {
    return document.querySelector('input[name="estimateExportFormat"]:checked')?.value || 'pdf';
  }

  function getEstimateTypeLabel(type) {
    const map = {
      works: 'Смета по работам',
      materials: 'Смета по материалам',
      all: 'Общая смета'
    };
    return map[type] || map.all;
  }

  function getEstimateNumber() {
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('');
    const time = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join('');
    return `VM-${stamp}-${time}-${Math.floor(Math.random() * 900 + 100)}`;
  }

  function getObjectFloorCount() {
    const state = typeof roomData !== 'undefined' ? roomData : {};
    const floorNumbers = new Set();
    ['living', 'nonliving'].forEach(key => {
      (state?.[key]?.floors || []).forEach((floor, index) => floorNumbers.add(index + 1));
    });
    return floorNumbers.size || 1;
  }

  function cleanEstimateText(value) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    if (/^(не указано|нет данных)$/i.test(text) || /^(выберите|сначала выберите|загрузка)\b/i.test(text)) return '';
    return text;
  }

  function getInputValue(id) {
    return cleanEstimateText(document.getElementById(id)?.value || '');
  }

  function getElementVisibleText(id) {
    return cleanEstimateText(document.getElementById(id)?.textContent || '');
  }

  function getEstimateObjectInfo() {
    const cityText = getElementVisibleText('tariffCityControl') || getInputValue('selectedCity');
    const floorValue = getInputValue('floorNumber');
    const cards = [
      ['Тип здания', getSelectText('buildingType', '')],
      ['Тип строения', getSelectText('buildingSubtype', '')],
      ['Материал здания', getSelectText('buildingMaterial', '')],
      ['Грузовой лифт', getSelectText('cargoElevator', '')],
      ['Этаж объекта', floorValue],
      ['Местоположение', getInputValue('addressInput')],
      ['Город тарифов', cityText],
      ['Тип ремонта', getSelectText('detailedRepairType', '')],
      ['Этажность ремонта', getSelectText('detailedBuildingType', '')]
    ]
      .map(([label, value]) => [label, cleanEstimateText(value)])
      .filter(([, value]) => value);
    return { title: 'Информация об объекте ремонта', cards };
  }

  function createEmptyTotals() {
    return { works: 0, materials: 0, total: 0, workHours: 0, techHours: 0, totalHours: 0 };
  }

  function addToTotals(target, line) {
    if (line.kind === 'works') {
      target.works += line.total;
      target.workHours += line.workHours;
      target.techHours += line.techHours;
      target.totalHours += line.totalHours;
    } else {
      target.materials += line.total;
    }
    target.total = target.works + target.materials;
  }

  function groupEstimate(rooms, lines) {
    const byFloor = new Map();
    const byCategory = new Map();

    rooms.forEach(room => {
      const floorKey = String(room.floorNumber);
      if (!byFloor.has(floorKey)) {
        byFloor.set(floorKey, { floorNumber: room.floorNumber, categories: new Map(), totals: createEmptyTotals() });
      }
      const floor = byFloor.get(floorKey);
      if (!floor.categories.has(room.categoryLabel)) {
        floor.categories.set(room.categoryLabel, { label: room.categoryLabel, roomGroups: new Map(), rooms: [], totals: createEmptyTotals() });
      }
      const category = floor.categories.get(room.categoryLabel);
      const roomNode = { room, lines: [], totals: createEmptyTotals() };
      const roomGroupLabel = room.roomGroupName || 'Обычные комнаты';
      if (!category.roomGroups.has(roomGroupLabel)) {
        category.roomGroups.set(roomGroupLabel, {
          label: roomGroupLabel,
          type: room.roomGroupType || 'regular',
          rooms: [],
          totals: createEmptyTotals()
        });
      }
      category.rooms.push(roomNode);
      category.roomGroups.get(roomGroupLabel).rooms.push(roomNode);
      if (!byCategory.has(room.categoryLabel)) {
        byCategory.set(room.categoryLabel, { label: room.categoryLabel, totals: createEmptyTotals() });
      }
    });

    const roomIndex = new Map();
    byFloor.forEach(floor => {
      floor.categories.forEach(category => {
        category.rooms.forEach(roomNode => {
          roomNode.room.aliases.forEach(alias => roomIndex.set(alias, roomNode));
        });
      });
    });

    lines.forEach(line => {
      const roomNode = roomIndex.get(line.roomId) || null;
      if (!roomNode) return;
      roomNode.lines.push(line);
      addToTotals(roomNode.totals, line);
    });

    const objectTotals = createEmptyTotals();
    byFloor.forEach(floor => {
      floor.categories.forEach(category => {
        category.rooms.forEach(roomNode => {
          ['works', 'materials', 'workHours', 'techHours', 'totalHours'].forEach(key => {
            category.totals[key] += roomNode.totals[key];
            floor.totals[key] += roomNode.totals[key];
            byCategory.get(category.label).totals[key] += roomNode.totals[key];
            objectTotals[key] += roomNode.totals[key];
          });
        });
        category.roomGroups.forEach(group => {
          group.rooms.forEach(roomNode => {
            ['works', 'materials', 'workHours', 'techHours', 'totalHours'].forEach(key => {
              group.totals[key] += roomNode.totals[key];
            });
          });
          group.totals.total = group.totals.works + group.totals.materials;
        });
        category.totals.total = category.totals.works + category.totals.materials;
      });
      floor.totals.total = floor.totals.works + floor.totals.materials;
    });
    byCategory.forEach(category => {
      category.totals.total = category.totals.works + category.totals.materials;
    });
    objectTotals.total = objectTotals.works + objectTotals.materials;

    return {
      floors: Array.from(byFloor.values()).sort((a, b) => a.floorNumber - b.floorNumber),
      categoryTotals: Array.from(byCategory.values()),
      objectTotals
    };
  }

  function buildProfessionalEstimate(type = getSelectedEstimateType()) {
    const state = typeof roomData !== 'undefined' ? roomData : {};
    const rooms = collectEstimateRooms();
    const roomMap = buildRoomMap(rooms);
    const workEstimate = typeof calculateWhatToDoWorksEstimate === 'function'
      ? calculateWhatToDoWorksEstimate(state)
      : { total: 0, itemCount: 0, lines: [] };
    const materialEstimate = typeof calculateWhatToDoMaterialsEstimate === 'function'
      ? calculateWhatToDoMaterialsEstimate(workEstimate.lines || [])
      : { total: 0, itemCount: 0, lines: [] };

    const lines = [];
    if (type === 'works' || type === 'all') {
      (workEstimate.lines || []).forEach(line => {
        if (roomMap.has(line.roomId)) lines.push(normalizeWorkLine(line));
      });
    }
    if (type === 'materials' || type === 'all') {
      (materialEstimate.lines || []).forEach(line => {
        if (roomMap.has(line.roomId)) lines.push(normalizeMaterialLine(line));
      });
    }

    return {
      id: getEstimateNumber(),
      createdAt: new Date(),
      siteName: window.estimateExportConfig?.siteName || ESTIMATE_SITE_NAME,
      type,
      typeLabel: getEstimateTypeLabel(type),
      repairType: getSelectText('detailedRepairType', 'Комфорт'),
      objectFloors: getObjectFloorCount(),
      objectInfo: getEstimateObjectInfo(),
      groupingLevel: getSelectedGroupingLevel(),
      showTechIntervals: shouldShowEstimateTechIntervals(),
      showZoneTotals: shouldShowEstimateZoneTotals(),
      rooms,
      lines,
      grouped: groupEstimate(rooms, lines)
    };
  }

  function getEstimateSections(estimate) {
    if (estimate.type === 'works') return [{ kind: 'works', title: 'Смета по работам' }];
    if (estimate.type === 'materials') return [{ kind: 'materials', title: 'Смета по материалам' }];
    return [
      { kind: 'works', title: 'Смета по работам' },
      { kind: 'materials', title: 'Смета по материалам' }
    ];
  }

  function getSectionGroupedEstimate(estimate, kind) {
    return groupEstimate(estimate.rooms, estimate.lines.filter(line => line.kind === kind));
  }

  function getSectionAmount(totals, kind) {
    return kind === 'works' ? totals.works : totals.materials;
  }

  function getSectionTotalLabel(kind) {
    return kind === 'works' ? 'Итого по работам' : 'Итого по материалам';
  }

  function getRoomCategoryPlural(label) {
    if (label === 'Жилая' || label === 'Жилая зона') return 'Жилая зона';
    if (label === 'Нежилая' || label === 'Нежилая зона') return 'Нежилая зона';
    return label === 'Жилое' ? 'Жилые помещения' : 'Нежилые помещения';
  }

  function getRoomCategoryTotalsLabel(label) {
    if (label === 'Жилая' || label === 'Жилая зона') return 'Итого по жилой зоне';
    if (label === 'Нежилая' || label === 'Нежилая зона') return 'Итого по нежилой зоне';
    return label === 'Жилое' ? 'Итого по жилым помещениям' : 'Итого по нежилым помещениям';
  }

  function showTechColumns(estimate = {}) {
    return estimate.showTechIntervals !== false;
  }

  function showZoneTotals(estimate = {}) {
    return estimate.showZoneTotals === true;
  }

  function columnCount(kind, estimate = {}) {
    if (kind !== 'works') return 6;
    return showTechColumns(estimate) ? 9 : 7;
  }

  function tableHeaderHtml(kind, estimate = {}) {
    const columns = kind === 'works'
      ? showTechColumns(estimate)
        ? ['№', 'Наименование', 'Ед.', 'Кол-во', 'Цена', 'Стоимость', 'Раб. часы', 'Тех. интерв.', 'Всего часов']
        : ['№', 'Наименование', 'Ед.', 'Кол-во', 'Цена', 'Стоимость', 'Раб. часы']
      : ['№', 'Наименование', 'Ед.', 'Кол-во', 'Цена', 'Стоимость'];
    return `<tr class="estimate-column-row">${columns.map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr>`;
  }

  function tableColgroupHtml(kind, estimate = {}) {
    const widths = kind === 'works'
      ? showTechColumns(estimate)
        ? ['5%', '37%', '5%', '7%', '10%', '11%', '8%', '8%', '9%']
        : ['5%', '47%', '6%', '8%', '11%', '13%', '10%']
      : ['5%', '49%', '7%', '10%', '14%', '15%'];
    return `<colgroup>${widths.map(width => `<col style="width:${width}">`).join('')}</colgroup>`;
  }

  function getLineSourceText(line) {
    if (line?.source !== 'roomRepair') return '';
    const source = line.sourceLabel || 'Рассчитать ремонт';
    const roomLabel = line.roomRepairLabel ? ` · ${line.roomRepairLabel}` : '';
    const mode = line.sourceMode === 'manual' ? ' · Вручную' : line.sourceMode === 'auto' ? ' · Автоматом' : '';
    const packageName = line.roomRepairPackageName ? ` · Пакет: ${line.roomRepairPackageName}` : '';
    const zone = line.roomRepairZoneLabel ? ` · Зона: ${line.roomRepairZoneLabel}` : '';
    return `${source}${roomLabel}${mode}${packageName}${zone}`;
  }

  function lineSourceHtml(line) {
    return '';
  }

  function getLineExportName(line) {
    const source = getLineSourceText(line);
    return source ? `${line.name}\nИсточник: ${source}` : line.name;
  }

  function totalsHtml(title, totals, kind, className = '', estimate = {}) {
    const amount = getSectionAmount(totals, kind);
    if (kind === 'materials') {
      return `
        <tr class="estimate-total-row ${className}">
          <td colspan="5">${escapeHtml(title)}</td>
          <td>${formatMoney(amount)}</td>
        </tr>
      `;
    }
    return `
      <tr class="estimate-total-row ${className}">
        <td colspan="5">${escapeHtml(title)}</td>
        <td>${formatMoney(amount)}</td>
        <td>${formatQty(totals.workHours)}</td>
        ${showTechColumns(estimate) ? `
          <td>${formatQty(totals.techHours)}</td>
          <td>${formatQty(totals.totalHours)}</td>
        ` : ''}
      </tr>
    `;
  }

  function getLineGroupPath(line, level = 3) {
    const fallbackDomain = line.domain === 'demolition' ? 'Демонтажные работы' : 'Монтажные работы по ремонту';
    const path = Array.isArray(line.workPath) && line.workPath.length ? line.workPath : [fallbackDomain];
    return path.slice(0, Math.max(1, Math.min(4, level)));
  }

  function createLineGroupNode(label, depth) {
    return { label, depth, children: new Map(), lines: [], totals: createEmptyTotals() };
  }

  function buildLineGroupTree(lines, level) {
    const root = createLineGroupNode('root', 0);
    lines.forEach(line => {
      const path = getLineGroupPath(line, level);
      let node = root;
      path.forEach((label, index) => {
        if (!node.children.has(label)) {
          node.children.set(label, createLineGroupNode(label, index + 1));
        }
        node = node.children.get(label);
        addToTotals(node.totals, line);
      });
      node.lines.push(line);
    });
    return Array.from(root.children.values());
  }

  function sumRoomNodeTotals(roomNodes = []) {
    const totals = createEmptyTotals();
    roomNodes.forEach(roomNode => {
      const source = roomNode?.totals || {};
      ['works', 'materials', 'workHours', 'techHours', 'totalHours'].forEach(key => {
        totals[key] += toNumber(source[key]);
      });
    });
    totals.total = totals.works + totals.materials;
    return totals;
  }

  function isLivingCategory(label = '') {
    return ['жилое', 'жилая', 'жилая зона'].includes(String(label || '').trim().toLowerCase());
  }

  function getEstimateRoomNumber(room = {}) {
    return toNumber(room.roomInsideGroupNumber) || toNumber(room.floorRoomNumber) || toNumber(room.globalRoomNumber) || 1;
  }

  function getEstimatePremiseNumber(room = {}) {
    return toNumber(room.floorRoomNumber) || toNumber(room.globalRoomNumber) || getEstimateRoomNumber(room);
  }

  function uniqueCleanTexts(values = []) {
    const used = new Set();
    return values
      .map(cleanEstimateText)
      .filter(value => {
        const key = value.toLowerCase();
        if (!value || used.has(key)) return false;
        used.add(key);
        return true;
      });
  }

  function getEstimatePremiseParts(room = {}) {
    return uniqueCleanTexts([
      room.appointment,
      room.format,
      room.retailPremiseType || room.roomType
    ]);
  }

  function getEstimatePremiseTitle(room = {}) {
    return `Помещение ${getEstimatePremiseNumber(room)}`;
  }

  function getEstimateRoomLabel(room = {}) {
    return `Комната ${getEstimateRoomNumber(room)}`;
  }

  function groupCategoryRoomsByPremise(category = {}) {
    const groups = new Map();
    (category.rooms || []).forEach(roomNode => {
      const room = roomNode.room || {};
      const key = [
        room.floorNumber || '',
        room.floorRoomNumber || '',
        room.floorDisplayName || '',
        room.registryExportLabel || '',
        room.globalRoomNumber || ''
      ].join('|') || 'premise';
      if (!groups.has(key)) {
        groups.set(key, {
          room: room,
          rooms: [],
          totals: createEmptyTotals()
        });
      }
      groups.get(key).rooms.push(roomNode);
    });
    groups.forEach(group => {
      group.totals = sumRoomNodeTotals(group.rooms);
    });
    return Array.from(groups.values());
  }

  function groupRoomNodesByRoomGroup(roomNodes = []) {
    const groups = new Map();
    roomNodes.forEach(roomNode => {
      const room = roomNode.room || {};
      const label = cleanEstimateText(room.roomGroupName) || 'Обычные комнаты';
      const key = label;
      if (!groups.has(key)) {
        groups.set(key, {
          label,
          type: room.roomGroupType || 'regular',
          rooms: [],
          totals: createEmptyTotals()
        });
      }
      groups.get(key).rooms.push(roomNode);
    });
    groups.forEach(group => {
      group.totals = sumRoomNodeTotals(group.rooms);
    });
    return Array.from(groups.values());
  }

  function roomInfoHtml(room) {
    const rows = [
      ['Площадь пола', `${formatQty(room.floorArea)} м²`],
      ['Площадь стен', `${formatQty(room.wallsArea)} м²`],
      ['Площадь потолка', `${formatQty(room.ceilingArea || room.floorArea)} м²`],
      ['Высота', `${formatQty(room.ceiling)} м`],
      ['Количество человек', toNumber(room.peopleCount) > 0 ? formatQty(room.peopleCount) : 'не указано']
    ].filter(([, value]) => String(value || '').trim());
    return rows.map(([label, value]) => `<span><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</span>`).join('');
  }

  function getEstimateRoomPrintTitle(room = {}) {
    const type = String(room.roomType || '').trim();
    return type ? `${getEstimateRoomLabel(room)} · ${type}` : getEstimateRoomLabel(room);
  }

  function getEstimateFloorRoomCount(floor = {}) {
    return Array.from(floor.categories?.values?.() || floor.categories || [])
      .reduce((sum, category) => sum + (category.rooms?.length || 0), 0);
  }

  function shouldShowEstimateFloorRows(grouped = {}) {
    const floors = Array.isArray(grouped.floors) ? grouped.floors : [];
    if (floors.length > 1) return true;
    return floors.some(floor => getEstimateFloorRoomCount(floor) > 1);
  }

  function getEstimateRoomTotalLabel(room = {}) {
    return `Итого по комнате: ${getEstimateRoomPrintTitle(room)}`;
  }

  function getEstimateRoomGroupTotalLabel(roomGroup = {}, isGenericRoomGroup = false) {
    if (isGenericRoomGroup) return 'Итого по помещению';
    return `Итого по еврокомнате: ${roomGroup.label || 'еврокомната'}`;
  }

  function lineHtml(line, index, kind, estimate = {}) {
    if (kind === 'materials') {
      return `
        <tr>
          <td>${index}</td>
          <td>${escapeHtml(line.name)}${lineSourceHtml(line)}</td>
          <td>${escapeHtml(line.unit)}</td>
          <td>${formatQty(line.qty)}</td>
          <td>${formatMoney(line.unitPrice)}</td>
          <td>${formatMoney(line.total)}</td>
        </tr>
      `;
    }
    return `
      <tr>
        <td>${index}</td>
        <td>${escapeHtml(line.name)}${lineSourceHtml(line)}</td>
        <td>${escapeHtml(line.unit)}</td>
        <td>${formatQty(line.qty)}</td>
        <td>${formatMoney(line.unitPrice)}</td>
        <td>${formatMoney(line.total)}</td>
        <td>${formatQty(line.workHours)}</td>
        ${showTechColumns(estimate) ? `
          <td>${formatQty(line.techHours)}</td>
          <td>${formatQty(line.totalHours)}</td>
        ` : ''}
      </tr>
    `;
  }

  function groupHeaderHtml(group, kind, estimate = {}) {
    return `<tr class="estimate-group-row estimate-group-row--level-${group.depth}"><td colspan="${columnCount(kind, estimate)}">${escapeHtml(group.label)}</td></tr>`;
  }

  function groupTotalHtml(group, kind, estimate = {}) {
    return totalsHtml(`Итого по группе: ${group.label}`, group.totals, kind, `estimate-group-total estimate-group-total--level-${group.depth}`, estimate);
  }

  function renderLineGroupHtml(groups, kind, indexRef, estimate = {}) {
    const rows = [];
    groups.forEach(group => {
      rows.push(groupHeaderHtml(group, kind, estimate));
      if (group.children.size) {
        rows.push(...renderLineGroupHtml(Array.from(group.children.values()), kind, indexRef, estimate));
      }
      group.lines.forEach(line => {
        rows.push(lineHtml(line, indexRef.value++, kind, estimate));
      });
      rows.push(groupTotalHtml(group, kind, estimate));
    });
    return rows;
  }

  function objectInfoHtml(estimate = {}) {
    const cards = estimate.objectInfo?.cards || [];
    if (!cards.length) return '';
    return `
      <section class="estimate-object-info">
        <div class="estimate-object-info-head">
          <span>Объект</span>
          <h2>${escapeHtml(estimate.objectInfo?.title || 'Информация об объекте ремонта')}</h2>
        </div>
        <div class="estimate-object-info-grid">
          ${cards.map(([label, value]) => `
            <div class="estimate-object-info-card">
              <span>${escapeHtml(label)}</span>
              <b>${escapeHtml(value)}</b>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function premiseHeaderHtml(room, kind, estimate = {}) {
    const parts = getEstimatePremiseParts(room);
    return `
      <tr class="estimate-premise-row">
        <td colspan="${columnCount(kind, estimate)}">
          <div class="estimate-premise-line">
            <span>Помещения</span>
            <b>${escapeHtml(getEstimatePremiseTitle(room))}</b>
            ${parts.map(part => `<em>${escapeHtml(part)}</em>`).join('')}
          </div>
        </td>
      </tr>
    `;
  }

  function roomHeaderHtml(room) {
    const type = cleanEstimateText(room.roomType);
    return `
      <div class="estimate-room-title">
        <span>${escapeHtml(getEstimateRoomLabel(room))}</span>
        ${type ? `<strong>${escapeHtml(type)}</strong>` : ''}
      </div>
      <div class="estimate-room-meta">${roomInfoHtml(room)}</div>
    `;
  }

  function buildEstimateSectionHtml(estimate, section) {
    const grouped = getSectionGroupedEstimate(estimate, section.kind);
    const renderFloorRows = shouldShowEstimateFloorRows(grouped);
    const indexRef = { value: 1 };
    const rows = [];
    grouped.floors.forEach(floor => {
      if (renderFloorRows) {
        rows.push(`<tr class="estimate-floor-row"><td colspan="${columnCount(section.kind, estimate)}">Этаж ${floor.floorNumber}</td></tr>`);
      }
      floor.categories.forEach(category => {
        const categoryClass = isLivingCategory(category.label) ? 'estimate-living-row' : 'estimate-nonliving-row';
        groupCategoryRoomsByPremise(category).forEach(premiseGroup => {
          rows.push(premiseHeaderHtml(premiseGroup.room, section.kind, estimate));
          rows.push(`<tr class="${categoryClass}"><td colspan="${columnCount(section.kind, estimate)}">${escapeHtml(getRoomCategoryPlural(category.label))}</td></tr>`);
          groupRoomNodesByRoomGroup(premiseGroup.rooms).forEach(roomGroup => {
            const isGenericRoomGroup = ['regular', 'common'].includes(String(roomGroup.type || '').toLowerCase())
              || /^(обычные|общие)\s+комнаты$/i.test(String(roomGroup.label || '').trim());
            if (!isGenericRoomGroup) {
              rows.push(`<tr class="estimate-room-group-row estimate-room-group-row--${escapeHtml(roomGroup.type || 'regular')}"><td colspan="${columnCount(section.kind, estimate)}">${escapeHtml(roomGroup.label)} · ${roomGroup.rooms.length} комн.</td></tr>`);
            }
            roomGroup.rooms.forEach(roomNode => {
              rows.push(`
                <tr class="estimate-room-row">
                  <td colspan="${columnCount(section.kind, estimate)}">
                    ${roomHeaderHtml(roomNode.room)}
                  </td>
                </tr>
              `);
              rows.push(tableHeaderHtml(section.kind, estimate));
              if (!roomNode.lines.length) {
                rows.push(`<tr><td colspan="${columnCount(section.kind, estimate)}" class="estimate-empty-cell">По этой комнате нет выбранных ${section.kind === 'works' ? 'работ' : 'материалов'}.</td></tr>`);
              }
              rows.push(...renderLineGroupHtml(buildLineGroupTree(roomNode.lines, estimate.groupingLevel), section.kind, indexRef, estimate));
              rows.push(totalsHtml(getEstimateRoomTotalLabel(roomNode.room), roomNode.totals, section.kind, 'estimate-room-total', estimate));
            });
            if (roomGroup.rooms.length > 1) {
              rows.push(totalsHtml(getEstimateRoomGroupTotalLabel(roomGroup, isGenericRoomGroup), roomGroup.totals, section.kind, 'estimate-room-group-total', estimate));
            }
          });
        });
        if (showZoneTotals(estimate)) {
          rows.push(totalsHtml(getRoomCategoryTotalsLabel(category.label), category.totals, section.kind, 'estimate-category-total', estimate));
        }
      });
      if (renderFloorRows) {
        rows.push(totalsHtml(`Итого по этажу ${floor.floorNumber}`, floor.totals, section.kind, 'estimate-floor-total', estimate));
      }
    });

    return `
      <section class="estimate-table-section">
        <h2>${escapeHtml(section.title)}</h2>
        <table class="estimate-table estimate-table--${section.kind} ${section.kind === 'works' && !showTechColumns(estimate) ? 'estimate-table--no-tech' : ''}">
          ${tableColgroupHtml(section.kind, estimate)}
          <tbody>
            ${rows.join('')}
            ${totalsHtml(`Общий ${getSectionTotalLabel(section.kind).toLowerCase()} по объекту`, grouped.objectTotals, section.kind, 'estimate-object-total', estimate)}
          </tbody>
        </table>
      </section>
    `;
  }

  function summaryCardsHtml(estimate) {
    const dateLabel = estimate.createdAt instanceof Date
      ? estimate.createdAt.toLocaleDateString('ru-RU')
      : new Date().toLocaleDateString('ru-RU');
    const cards = [];
    if (estimate.type === 'works' || estimate.type === 'all') {
      cards.push(`<div class="estimate-summary-card"><span>Итого работы</span><b>${formatMoney(estimate.grouped.objectTotals.works)}</b><small>${formatQty(estimate.grouped.objectTotals.workHours)} ч работ</small></div>`);
    }
    if (estimate.type === 'materials' || estimate.type === 'all') {
      cards.push(`<div class="estimate-summary-card"><span>Итого материалы</span><b>${formatMoney(estimate.grouped.objectTotals.materials)}</b><small>Дата формирования сметы: ${dateLabel}</small></div>`);
    }
    const hoursSummary = showTechColumns(estimate)
      ? `${formatQty(estimate.grouped.objectTotals.totalHours)} ч с интервалами`
      : `${formatQty(estimate.grouped.objectTotals.workHours)} ч работ`;
    cards.push(`<div class="estimate-summary-card estimate-summary-card--accent"><span>Общий итог</span><b>${formatMoney(estimate.grouped.objectTotals.total)}</b><small>${estimate.type === 'materials' ? 'материалы' : hoursSummary}</small></div>`);
    return cards.join('');
  }

  function buildEstimateHtml(estimate) {
    const sections = getEstimateSections(estimate)
      .map(section => buildEstimateSectionHtml(estimate, section))
      .join('');

    return `<!doctype html>
      <html lang="ru">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(estimate.typeLabel)} ${escapeHtml(estimate.id)}</title>
        <style>${getEstimatePrintCss()}</style>
      </head>
      <body>
        <header class="estimate-doc-header">
          <div class="estimate-brand">
            <div class="estimate-logo">ВМ</div>
            <div>
              <div class="estimate-site">${escapeHtml(estimate.siteName)}</div>
              <div class="estimate-subtitle">Профессиональная смета ремонта</div>
            </div>
          </div>
          <div class="estimate-doc-meta">
            <div><b>Тип сметы:</b> ${escapeHtml(estimate.typeLabel)}</div>
            <div><b>Тип ремонта:</b> ${escapeHtml(estimate.repairType)}</div>
            <div><b>Этажность объекта:</b> ${estimate.objectFloors}</div>
            <div><b>Дата:</b> ${estimate.createdAt.toLocaleDateString('ru-RU')}</div>
            <div><b>Номер:</b> ${escapeHtml(estimate.id)}</div>
          </div>
        </header>
        <section class="estimate-summary">${summaryCardsHtml(estimate)}</section>
        ${objectInfoHtml(estimate)}
        ${sections}
      </body>
      </html>`;
  }

  function getEstimatePrintCss() {
    return `
      :root { color-scheme: light; --brand:#f97316; --brand-dark:#c2410c; --ink:#172033; --muted:#64748b; --line:#d9e2ef; --soft:#fff7ed; --living:#ecfdf5; --nonliving:#eef2ff; --total:#fffbeb; }
      * { box-sizing: border-box; }
      body { margin:0; padding:10mm; font-family: Inter, Arial, sans-serif; color:var(--ink); background:#fff; font-size:11.4px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .estimate-doc-header { display:flex; justify-content:space-between; gap:14px; align-items:flex-start; border-bottom:2px solid var(--brand); padding-bottom:12px; margin-bottom:12px; }
      .estimate-brand { display:flex; align-items:center; gap:12px; }
      .estimate-logo { width:48px; height:48px; border-radius:13px; display:flex; align-items:center; justify-content:center; background:#f97316 !important; color:#fff !important; font-weight:900; font-size:19px; box-shadow:inset 0 1px 0 rgba(255,255,255,.24); -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .estimate-site { font-size:20px; font-weight:900; }
      .estimate-subtitle { color:#334155; margin-top:3px; font-size:13px; font-weight:800; }
      .estimate-doc-meta { min-width:238px; line-height:1.55; background:#fff7ed; border:1px solid #fed7aa; border-radius:11px; padding:10px 11px; font-size:12px; font-weight:750; }
      .estimate-doc-meta b { color:#7c2d12; font-weight:900; }
      .estimate-summary { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:9px; margin-bottom:13px; }
      .estimate-summary-card { border:1px solid var(--line); border-radius:11px; padding:10px; background:#fff; break-inside:avoid; }
      .estimate-summary-card span { display:block; color:#334155; font-size:11.5px; font-weight:900; text-transform:uppercase; letter-spacing:.02em; }
      .estimate-summary-card b { display:block; font-size:18px; margin-top:4px; color:#0f172a; }
      .estimate-summary-card small { display:block; color:#475569; font-size:12px; font-weight:800; margin-top:4px; line-height:1.25; }
      .estimate-summary-card--accent { background:var(--soft); border-color:#fed7aa; }
      .estimate-object-info { margin:0 0 14px; padding:12px; border:1px solid #fed7aa; border-radius:14px; background:linear-gradient(135deg, #fff7ed, #ffffff 58%, #f8fafc); break-inside:avoid; }
      .estimate-object-info-head { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin-bottom:10px; border-bottom:1px solid #fed7aa; padding-bottom:8px; }
      .estimate-object-info-head span { color:#c2410c; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:.08em; }
      .estimate-object-info-head h2 { margin:0; color:#0f172a; font-size:15px; font-weight:900; }
      .estimate-object-info-grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:7px; }
      .estimate-object-info-card { min-height:42px; border:1px solid #e2e8f0; border-radius:10px; background:rgba(255,255,255,.86); padding:7px 8px; }
      .estimate-object-info-card span { display:block; color:#64748b; font-size:9.5px; font-weight:850; text-transform:uppercase; letter-spacing:.03em; }
      .estimate-object-info-card b { display:block; margin-top:3px; color:#172033; font-size:11.5px; font-weight:900; line-height:1.25; }
      .estimate-table-section { margin-top:12px; break-inside:auto; }
      .estimate-table-section + .estimate-table-section { margin-top:10mm; padding-top:3mm; border-top:1px solid #fed7aa; }
      .estimate-table-section h2 { margin:0 0 8px; font-size:16px; color:#9a3412; }
      .estimate-table { width:100%; border-collapse:collapse; table-layout:fixed; page-break-inside:auto; }
      .estimate-table th { background:#f97316 !important; color:#fff !important; padding:5px 3px; border:1px solid #ea580c; font-size:8.7px; text-align:left; font-weight:900; line-height:1.1; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .estimate-table td { border:1px solid var(--line); padding:4px 3px; vertical-align:top; word-break:normal; overflow-wrap:anywhere; font-size:9.7px; line-height:1.18; }
      .estimate-table tr:nth-child(even):not(.estimate-floor-row):not(.estimate-premise-row):not(.estimate-room-row):not(.estimate-total-row):not(.estimate-living-row):not(.estimate-nonliving-row):not(.estimate-column-row):not(.estimate-group-row) td { background:#f8fafc; }
      .estimate-table--works th:nth-child(1), .estimate-table--works td:nth-child(1), .estimate-table--materials th:nth-child(1), .estimate-table--materials td:nth-child(1) { text-align:center; white-space:nowrap; font-size:8.8px; padding-left:1px; padding-right:1px; }
      .estimate-table--works th:nth-child(2), .estimate-table--works td:nth-child(2), .estimate-table--materials th:nth-child(2), .estimate-table--materials td:nth-child(2) { overflow-wrap:break-word; hyphens:auto; }
      .estimate-table--works th:nth-child(3), .estimate-table--works td:nth-child(3), .estimate-table--materials th:nth-child(3), .estimate-table--materials td:nth-child(3) { text-align:center; }
      .estimate-table--works td:nth-child(4), .estimate-table--works td:nth-child(5), .estimate-table--works td:nth-child(6), .estimate-table--works td:nth-child(7), .estimate-table--works td:nth-child(8), .estimate-table--works td:nth-child(9), .estimate-table--materials td:nth-child(4), .estimate-table--materials td:nth-child(5), .estimate-table--materials td:nth-child(6) { white-space:nowrap; font-size:8.9px; letter-spacing:0; overflow-wrap:normal; word-break:normal; }
      .estimate-table--works th:nth-child(4), .estimate-table--works th:nth-child(5), .estimate-table--works th:nth-child(6), .estimate-table--works th:nth-child(7), .estimate-table--works th:nth-child(8), .estimate-table--works th:nth-child(9), .estimate-table--materials th:nth-child(4), .estimate-table--materials th:nth-child(5), .estimate-table--materials th:nth-child(6) { font-size:8px; letter-spacing:0; }
      .estimate-table--works td:nth-child(5), .estimate-table--works td:nth-child(6), .estimate-table--materials td:nth-child(5), .estimate-table--materials td:nth-child(6), .estimate-total-row td:nth-last-child(-n+4) { font-size:8.5px; }
      .estimate-table--no-tech td:nth-child(2) { font-size:9.5px; }
      .estimate-floor-row td { background:#fff7ed !important; color:var(--brand-dark); font-weight:900; font-size:13px; border-top:2px solid #fdba74; }
      .estimate-premise-row td { background:#172033 !important; color:#fff; border-top:2px solid #f97316; border-bottom:0; padding:7px 8px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .estimate-premise-line { display:flex; align-items:center; gap:7px; flex-wrap:wrap; font-size:11px; line-height:1.25; }
      .estimate-premise-line span { color:#fdba74; font-size:9.5px; font-weight:900; text-transform:uppercase; letter-spacing:.08em; }
      .estimate-premise-line b { color:#fff; font-size:12.5px; font-weight:900; }
      .estimate-premise-line em { font-style:normal; color:#ffedd5; border:1px solid rgba(253,186,116,.45); border-radius:999px; padding:2px 7px; font-weight:850; }
      .estimate-living-row td { background:var(--living) !important; font-weight:900; color:#047857; }
      .estimate-nonliving-row td { background:var(--nonliving) !important; font-weight:900; color:#4338ca; }
      .estimate-room-group-row td { background:linear-gradient(135deg, #ecfdf5, #fff7ed) !important; color:#166534; font-weight:900; border-top:2px solid #bbf7d0; }
      .estimate-room-group-row--master_bedroom td, .estimate-room-group-row--kitchen_living td { color:#9a3412; background:linear-gradient(135deg, #fff7ed, #ecfdf5) !important; border-top-color:#fdba74; }
      .estimate-room-row td { background:#ffffff !important; border-top:2px solid #e2e8f0; }
      .estimate-room-title { display:flex; justify-content:center; align-items:center; gap:8px; flex-wrap:wrap; font-weight:900; margin-bottom:5px; font-size:13px; text-align:center; }
      .estimate-room-title span { color:#9a3412; }
      .estimate-room-title strong { color:#0f172a; font-weight:900; }
      .estimate-room-meta { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:4px 8px; color:#334155; font-size:10.4px; line-height:1.32; }
      .estimate-room-meta b { color:#0f172a; font-weight:900; }
      .estimate-group-row td { background:#f1f5f9 !important; color:#334155; font-weight:900; }
      .estimate-group-row--level-1 td { background:#fff7ed !important; color:#9a3412; }
      .estimate-group-row--level-2 td { background:#fffbeb !important; color:#92400e; padding-left:12px; }
      .estimate-group-row--level-3 td { background:#f8fafc !important; color:#334155; padding-left:18px; }
      .estimate-group-row--level-4 td { background:#f1f5f9 !important; color:#475569; padding-left:24px; }
      .estimate-empty-cell { color:#94a3b8; font-style:italic; }
      .estimate-total-row td { background:var(--total) !important; font-weight:900; }
      .estimate-group-total td { color:#78350f; }
      .estimate-group-total--level-1 td { background:#fed7aa !important; color:#7c2d12; }
      .estimate-group-total--level-2 td { background:#ffedd5 !important; color:#9a3412; }
      .estimate-group-total--level-3 td { background:#fef3c7 !important; color:#92400e; }
      .estimate-group-total--level-4 td { background:#fff7ed !important; color:#9a3412; }
      .estimate-floor-total td, .estimate-object-total td { background:#ffedd5 !important; color:#9a3412; }
      .estimate-room-group-total td { background:#f0fdf4 !important; color:#166534; }
      .estimate-object-total td { font-size:12.5px; border-top:2px solid var(--brand); }
      @media print {
        body { padding:10mm; }
        tr, .estimate-summary-card, .estimate-doc-header { break-inside:avoid; page-break-inside:avoid; }
      }
      @page { size:A4 portrait; margin:10mm; }
    `;
  }

  function canExportEstimate() {
    const config = window.estimateExportConfig || {};
    return Boolean(config.paid_access) || !config.enforcePaidAccess;
  }

  function showEstimateMessage(message, type = 'info') {
    const target = document.getElementById('estimateExportMessage');
    if (!target) return;
    target.textContent = message;
    target.className = `estimate-export-message estimate-export-message--${type}`;
  }

  function decorateEstimatePrintHtml(html, estimate, options = {}) {
    const autoPrint = options.autoPrint !== false;
    const toolbar = `
      <div class="estimate-print-toolbar">
        <div>
          <strong>PDF-смета с выделяемым текстом</strong>
          <span>В окне печати выберите “Сохранить как PDF”. Таблицы и текст останутся текстом, а не картинкой.</span>
        </div>
        <button type="button" onclick="window.print()">Сохранить PDF</button>
      </div>
      <style>
        .estimate-print-toolbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin: -14mm -14mm 12px;
          padding: 12px 14mm;
          border-bottom: 1px solid #fed7aa;
          background: linear-gradient(135deg, #fff7ed, #ffffff);
          color: #0f172a;
          font-family: Inter, Arial, sans-serif;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
        }
        .estimate-print-toolbar strong,
        .estimate-print-toolbar span {
          display: block;
        }
        .estimate-print-toolbar strong {
          font-size: 13px;
          font-weight: 900;
        }
        .estimate-print-toolbar span {
          margin-top: 2px;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }
        .estimate-print-toolbar button {
          min-height: 38px;
          padding: 8px 14px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(135deg, #f59e0b, #92400e);
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
        }
        @media print {
          .estimate-print-toolbar { display: none !important; }
        }
      </style>
      ${autoPrint ? `
        <script>
          (function () {
            function runPrint() {
              setTimeout(function () { window.print(); }, 350);
            }
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(runPrint).catch(runPrint);
            } else {
              runPrint();
            }
          })();
        </script>
      ` : ''}
    `;
    return html.replace('</body>', `${toolbar}</body>`);
  }

  function exportEstimatePrintWindow(estimate, options = {}) {
    const html = decorateEstimatePrintHtml(buildEstimateHtml(estimate), estimate, options);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showEstimateMessage('Разрешите открытие нового окна, чтобы сформировать PDF.', 'error');
      return false;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    return true;
  }

  async function exportEstimatePdf(estimate) {
    const opened = exportEstimatePrintWindow(estimate, { autoPrint: true });
    if (!opened) {
      throw new Error('Print window was blocked');
    }
  }

  function cellXml(value, type = 's', style = null) {
    const styleAttr = style !== null ? ` s="${style}"` : '';
    if (type === 'n') return `<c${styleAttr}><v>${toNumber(value)}</v></c>`;
    if (type === 'f') return `<c${styleAttr}><f>${escapeXml(value)}</f></c>`;
    return `<c${styleAttr} t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
  }

  function rowXml(cells, rowIndex) {
    return `<row r="${rowIndex}">${cells.join('')}</row>`;
  }

  function xlsxTotalRowXml(label, amountCell, section, rowIndex, hourCells = []) {
    const labelCell = cellXml(label, 's', 8);
    if (section.kind === 'materials') {
      return rowXml([cellXml(''), labelCell, cellXml(''), cellXml(''), cellXml(''), amountCell], rowIndex);
    }
    return rowXml([cellXml(''), labelCell, cellXml(''), cellXml(''), cellXml(''), amountCell, ...hourCells], rowIndex);
  }

  function appendXlsxGroupRows(rows, rowState, groups, section, lineIndexRef, estimate = {}) {
    groups.forEach(group => {
      rows.push(rowXml([cellXml(group.label, 's', 7)], rowState.value++));
      appendXlsxGroupRows(rows, rowState, Array.from(group.children.values()), section, lineIndexRef, estimate);
      const groupStart = rowState.value;
      group.lines.forEach(line => {
        if (section.kind === 'materials') {
          rows.push(rowXml([
            cellXml(lineIndexRef.value++, 'n'),
            cellXml(getLineExportName(line)),
            cellXml(line.unit),
            cellXml(line.qty, 'n'),
            cellXml(line.unitPrice, 'n'),
            cellXml(`D${rowState.value}*E${rowState.value}`, 'f')
          ], rowState.value++));
        } else {
          rows.push(rowXml([
            cellXml(lineIndexRef.value++, 'n'),
            cellXml(getLineExportName(line)),
            cellXml(line.unit),
            cellXml(line.qty, 'n'),
            cellXml(line.unitPrice, 'n'),
            cellXml(`D${rowState.value}*E${rowState.value}`, 'f'),
            cellXml(line.workHours, 'n'),
            ...(showTechColumns(estimate)
              ? [cellXml(line.techHours, 'n'), cellXml(`G${rowState.value}+H${rowState.value}`, 'f')]
              : [])
          ], rowState.value++));
        }
      });
      const groupEnd = Math.max(groupStart, rowState.value - 1);
      if (section.kind === 'materials') {
        rows.push(xlsxTotalRowXml(
          `Итого по группе: ${group.label}`,
          cellXml(group.lines.length ? `SUM(F${groupStart}:F${groupEnd})` : group.totals.materials, group.lines.length ? 'f' : 'n', 8),
          section,
          rowState.value++
        ));
      } else {
        rows.push(xlsxTotalRowXml(
          `Итого по группе: ${group.label}`,
          cellXml(group.lines.length ? `SUM(F${groupStart}:F${groupEnd})` : group.totals.works, group.lines.length ? 'f' : 'n', 8),
          section,
          rowState.value++,
          showTechColumns(estimate)
            ? [cellXml(group.totals.workHours, 'n', 8), cellXml(group.totals.techHours, 'n', 8), cellXml(group.totals.totalHours, 'n', 8)]
            : [cellXml(group.totals.workHours, 'n', 8)]
        ));
      }
    });
  }

  function buildEstimateXlsxRows(estimate) {
    const rows = [];
    const rowState = { value: 1 };
    rows.push(rowXml([cellXml(`ВМ · ${estimate.siteName} · Профессиональная смета ремонта`, 's', 1)], rowState.value++));
    rows.push(rowXml([cellXml('Номер сметы', 's', 2), cellXml(estimate.id), cellXml('Дата', 's', 2), cellXml(estimate.createdAt.toLocaleDateString('ru-RU'))], rowState.value++));
    rows.push(rowXml([cellXml('Тип сметы', 's', 2), cellXml(estimate.typeLabel), cellXml('Тип ремонта', 's', 2), cellXml(estimate.repairType), cellXml('Этажность', 's', 2), cellXml(estimate.objectFloors, 'n'), cellXml('Уровень группировки', 's', 2), cellXml(estimate.groupingLevel, 'n')], rowState.value++));
    rows.push(rowXml([], rowState.value++));
    if (estimate.objectInfo?.cards?.length) {
      rows.push(rowXml([cellXml(estimate.objectInfo.title || 'Информация об объекте ремонта', 's', 1)], rowState.value++));
      for (let index = 0; index < estimate.objectInfo.cards.length; index += 3) {
        const cards = estimate.objectInfo.cards.slice(index, index + 3);
        const cells = [];
        cards.forEach(([label, value]) => {
          cells.push(cellXml(label, 's', 2), cellXml(value));
        });
        rows.push(rowXml(cells, rowState.value++));
      }
      rows.push(rowXml([], rowState.value++));
    }

    getEstimateSections(estimate).forEach(section => {
      const grouped = getSectionGroupedEstimate(estimate, section.kind);
      const renderFloorRows = shouldShowEstimateFloorRows(grouped);
      rows.push(rowXml([cellXml(section.title, 's', 1)], rowState.value++));
      const lineIndexRef = { value: 1 };
      grouped.floors.forEach(floor => {
        if (renderFloorRows) {
          rows.push(rowXml([cellXml(`Этаж ${floor.floorNumber}`, 's', 3)], rowState.value++));
        }
        floor.categories.forEach(category => {
          groupCategoryRoomsByPremise(category).forEach(premiseGroup => {
            const premiseParts = getEstimatePremiseParts(premiseGroup.room);
            rows.push(rowXml([
              cellXml('Помещения', 's', 3),
              cellXml(getEstimatePremiseTitle(premiseGroup.room), 's', 2),
              ...premiseParts.map(part => cellXml(part))
            ], rowState.value++));
            rows.push(rowXml([cellXml(getRoomCategoryPlural(category.label), 's', isLivingCategory(category.label) ? 4 : 5)], rowState.value++));
            groupRoomNodesByRoomGroup(premiseGroup.rooms).forEach(roomGroup => {
              const isGenericRoomGroup = ['regular', 'common'].includes(String(roomGroup.type || '').toLowerCase())
                || /^(обычные|общие)\s+комнаты$/i.test(String(roomGroup.label || '').trim());
              if (!isGenericRoomGroup) {
                rows.push(rowXml([cellXml(`${roomGroup.label} · ${roomGroup.rooms.length} комн.`, 's', 7)], rowState.value++));
              }
              roomGroup.rooms.forEach(roomNode => {
                rows.push(rowXml([
                  cellXml(getEstimateRoomLabel(roomNode.room), 's', 2),
                  cellXml(cleanEstimateText(roomNode.room.roomType), 's', 2)
                ], rowState.value++));
                rows.push(rowXml([
                  cellXml('Площадь пола', 's', 2), cellXml(roomNode.room.floorArea, 'n'),
                  cellXml('Площадь стен', 's', 2), cellXml(roomNode.room.wallsArea, 'n'),
                  cellXml('Площадь потолка', 's', 2), cellXml(roomNode.room.ceilingArea || roomNode.room.floorArea, 'n'),
                  cellXml('Высота / людей', 's', 2), cellXml(`${formatQty(roomNode.room.ceiling)} м / ${toNumber(roomNode.room.peopleCount) > 0 ? formatQty(roomNode.room.peopleCount) : 'не указано'}`)
                ], rowState.value++));
                const header = section.kind === 'works'
                  ? showTechColumns(estimate)
                    ? ['№', 'Наименование', 'Ед.', 'Кол-во', 'Цена', 'Стоимость', 'Раб. часы', 'Тех. интервалы', 'Всего часов']
                    : ['№', 'Наименование', 'Ед.', 'Кол-во', 'Цена', 'Стоимость', 'Раб. часы']
                  : ['№', 'Наименование', 'Ед.', 'Кол-во', 'Цена', 'Стоимость'];
                rows.push(rowXml(header.map(column => cellXml(column, 's', 6)), rowState.value++));
                if (!roomNode.lines.length) {
                  rows.push(rowXml([cellXml(`По этой комнате нет выбранных ${section.kind === 'works' ? 'работ' : 'материалов'}.`)], rowState.value++));
                }
                appendXlsxGroupRows(rows, rowState, buildLineGroupTree(roomNode.lines, estimate.groupingLevel), section, lineIndexRef, estimate);
                if (section.kind === 'materials') {
                  rows.push(xlsxTotalRowXml(getEstimateRoomTotalLabel(roomNode.room), cellXml(roomNode.totals.materials, 'n', 8), section, rowState.value++));
                } else {
                  rows.push(xlsxTotalRowXml(getEstimateRoomTotalLabel(roomNode.room), cellXml(roomNode.totals.works, 'n', 8), section, rowState.value++, showTechColumns(estimate) ? [cellXml(roomNode.totals.workHours, 'n', 8), cellXml(roomNode.totals.techHours, 'n', 8), cellXml(roomNode.totals.totalHours, 'n', 8)] : [cellXml(roomNode.totals.workHours, 'n', 8)]));
                }
              });
              if (roomGroup.rooms.length > 1) {
                if (section.kind === 'materials') {
                  rows.push(xlsxTotalRowXml(getEstimateRoomGroupTotalLabel(roomGroup, isGenericRoomGroup), cellXml(roomGroup.totals.materials, 'n', 8), section, rowState.value++));
                } else {
                  rows.push(xlsxTotalRowXml(getEstimateRoomGroupTotalLabel(roomGroup, isGenericRoomGroup), cellXml(roomGroup.totals.works, 'n', 8), section, rowState.value++, showTechColumns(estimate) ? [cellXml(roomGroup.totals.workHours, 'n', 8), cellXml(roomGroup.totals.techHours, 'n', 8), cellXml(roomGroup.totals.totalHours, 'n', 8)] : [cellXml(roomGroup.totals.workHours, 'n', 8)]));
                }
              }
            });
          });
          if (showZoneTotals(estimate)) {
            if (section.kind === 'materials') {
              rows.push(xlsxTotalRowXml(getRoomCategoryTotalsLabel(category.label), cellXml(category.totals.materials, 'n', 8), section, rowState.value++));
            } else {
              rows.push(xlsxTotalRowXml(getRoomCategoryTotalsLabel(category.label), cellXml(category.totals.works, 'n', 8), section, rowState.value++, showTechColumns(estimate) ? [cellXml(category.totals.workHours, 'n', 8), cellXml(category.totals.techHours, 'n', 8), cellXml(category.totals.totalHours, 'n', 8)] : [cellXml(category.totals.workHours, 'n', 8)]));
            }
          }
        });
        if (renderFloorRows) {
          if (section.kind === 'materials') {
            rows.push(xlsxTotalRowXml(`Итого по этажу ${floor.floorNumber}`, cellXml(floor.totals.materials, 'n', 8), section, rowState.value++));
          } else {
            rows.push(xlsxTotalRowXml(`Итого по этажу ${floor.floorNumber}`, cellXml(floor.totals.works, 'n', 8), section, rowState.value++, showTechColumns(estimate) ? [cellXml(floor.totals.workHours, 'n', 8), cellXml(floor.totals.techHours, 'n', 8), cellXml(floor.totals.totalHours, 'n', 8)] : [cellXml(floor.totals.workHours, 'n', 8)]));
          }
        }
      });
      if (section.kind === 'materials') {
        rows.push(xlsxTotalRowXml('Общий итог по материалам', cellXml(grouped.objectTotals.materials, 'n', 8), section, rowState.value++));
      } else {
        rows.push(xlsxTotalRowXml('Общий итог по работам', cellXml(grouped.objectTotals.works, 'n', 8), section, rowState.value++, showTechColumns(estimate) ? [cellXml(grouped.objectTotals.workHours, 'n', 8), cellXml(grouped.objectTotals.techHours, 'n', 8), cellXml(grouped.objectTotals.totalHours, 'n', 8)] : [cellXml(grouped.objectTotals.workHours, 'n', 8)]));
      }
      rows.push(rowXml([], rowState.value++));
    });

    const finalCells = [];
    if (estimate.type === 'works' || estimate.type === 'all') {
      finalCells.push(cellXml('Итого работы', 's', 2), cellXml(estimate.grouped.objectTotals.works, 'n', 8));
    }
    if (estimate.type === 'materials' || estimate.type === 'all') {
      finalCells.push(cellXml('Итого материалы', 's', 2), cellXml(estimate.grouped.objectTotals.materials, 'n', 8));
    }
    finalCells.push(cellXml('Общий итог', 's', 2), cellXml(estimate.grouped.objectTotals.total, 'n', 8));
    rows.push(rowXml(finalCells, rowState.value++));
    return rows.join('');
  }

  function buildEstimateXlsxColsXml(estimate) {
    const lastColumn = showTechColumns(estimate) ? 9 : 7;
    return [
      '<col min="1" max="1" width="8" customWidth="1"/>',
      `<col min="2" max="2" width="${showTechColumns(estimate) ? 66 : 78}" customWidth="1"/>`,
      '<col min="3" max="3" width="10" customWidth="1"/>',
      '<col min="4" max="4" width="12" customWidth="1"/>',
      '<col min="5" max="5" width="15" customWidth="1"/>',
      '<col min="6" max="6" width="18" customWidth="1"/>',
      `<col min="7" max="${lastColumn}" width="${showTechColumns(estimate) ? 13 : 14}" customWidth="1"/>`
    ].join('');
  }

  function getEstimateXlsxMergeRef(estimate) {
    return showTechColumns(estimate) ? 'A1:I1' : 'A1:G1';
  }

  function buildXlsxBlob(estimate) {
    const files = {
      '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Смета" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FF9A3412"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="8"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFEDD5"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF7ED"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF2FF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF97316"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFBEB"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9E2EF"/></left><right style="thin"><color rgb="FFD9E2EF"/></right><top style="thin"><color rgb="FFD9E2EF"/></top><bottom style="thin"><color rgb="FFD9E2EF"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="4" borderId="1" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="5" borderId="1" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="6" borderId="1" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="7" borderId="1" applyFill="1" applyFont="1"/></cellXfs></styleSheet>',
      'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${buildEstimateXlsxColsXml(estimate)}</cols><sheetData>${buildEstimateXlsxRows(estimate)}</sheetData><mergeCells count="1"><mergeCell ref="${getEstimateXlsxMergeRef(estimate)}"/></mergeCells></worksheet>`
    };
    return new Blob([binaryStringToBytes(createZip(files))], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  function crc32(bytes) {
    let crc = -1;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return (crc ^ -1) >>> 0;
  }

  function uint16(value) {
    return String.fromCharCode(value & 255, (value >>> 8) & 255);
  }

  function uint32(value) {
    return String.fromCharCode(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
  }

  function bytesToBinary(bytes) {
    let output = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      output += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return output;
  }

  function binaryStringToBytes(binary) {
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i) & 255;
    }
    return bytes;
  }

  function createZip(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    Object.entries(files).forEach(([path, content]) => {
      const nameBytes = encoder.encode(path);
      const dataBytes = encoder.encode(content);
      const crc = crc32(dataBytes);
      const localHeader =
        uint32(0x04034b50) + uint16(20) + uint16(0) + uint16(0) + uint16(0) + uint16(0) +
        uint32(crc) + uint32(dataBytes.length) + uint32(dataBytes.length) +
        uint16(nameBytes.length) + uint16(0) + bytesToBinary(nameBytes);
      localParts.push(localHeader, bytesToBinary(dataBytes));

      const centralHeader =
        uint32(0x02014b50) + uint16(20) + uint16(20) + uint16(0) + uint16(0) + uint16(0) + uint16(0) +
        uint32(crc) + uint32(dataBytes.length) + uint32(dataBytes.length) +
        uint16(nameBytes.length) + uint16(0) + uint16(0) + uint16(0) + uint16(0) + uint32(0) +
        uint32(offset) + bytesToBinary(nameBytes);
      centralParts.push(centralHeader);
      offset += localHeader.length + dataBytes.length;
    });

    const centralDirectory = centralParts.join('');
    const endRecord =
      uint32(0x06054b50) + uint16(0) + uint16(0) + uint16(Object.keys(files).length) +
      uint16(Object.keys(files).length) + uint32(centralDirectory.length) + uint32(offset) + uint16(0);
    return localParts.join('') + centralDirectory + endRecord;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportEstimateXlsx(estimate) {
    const blob = buildXlsxBlob(estimate);
    downloadBlob(blob, `${estimate.id}.xlsx`);
  }

  async function handleEstimateExportClick() {
    if (!canExportEstimate()) {
      showEstimateMessage(window.estimateExportConfig?.proMessage || PRO_EXPORT_MESSAGE, 'error');
      return;
    }
    const type = getSelectedEstimateType();
    const format = getSelectedEstimateFormat();
    const estimate = buildProfessionalEstimate(type);
    if (!estimate.rooms.length) {
      showEstimateMessage('Добавьте помещения и данные для расчета, чтобы сформировать смету.', 'error');
      return;
    }
    if (!estimate.lines.length) {
      showEstimateMessage('В смете пока нет выбранных работ или материалов. Проверьте раздел «Что нужно сделать».', 'error');
      return;
    }
    if (format === 'xlsx') {
      exportEstimateXlsx(estimate);
      showEstimateMessage(`Excel-смета ${estimate.id} сформирована.`, 'success');
    } else {
      showEstimateMessage(`Открываю PDF-смету ${estimate.id} для сохранения с выделяемым текстом...`, 'info');
      try {
        await exportEstimatePdf(estimate);
        showEstimateMessage(`Окно печати открыто. Выберите “Сохранить как PDF”, чтобы текст в смете можно было выделять и копировать.`, 'success');
      } catch (error) {
        console.error(error);
        showEstimateMessage('Не удалось открыть окно PDF. Разрешите всплывающие окна для сайта и попробуйте снова.', 'error');
      }
    }
  }

  window.ESTIMATE_SITE_NAME = ESTIMATE_SITE_NAME;
  window.buildProfessionalEstimate = buildProfessionalEstimate;
  window.exportEstimatePdf = exportEstimatePdf;
  window.exportEstimatePrintWindow = exportEstimatePrintWindow;
  window.exportEstimateXlsx = exportEstimateXlsx;
  window.handleEstimateExportClick = handleEstimateExportClick;
  window.setEstimatePaidAccess = function (value, enforce = true) {
    window.estimateExportConfig.paid_access = Boolean(value);
    window.estimateExportConfig.enforcePaidAccess = Boolean(enforce);
  };
})();
