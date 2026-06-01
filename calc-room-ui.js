// Module: calc-room-ui.js
    const objectFloorLocationOptions = [
      { value: 'above_ground', label: 'Надземный этаж', icon: 'fa-building' },
      { value: 'basement', label: 'Подвальный этаж', icon: 'fa-dungeon' },
      { value: 'ground_floor', label: 'Цокольный этаж', icon: 'fa-layer-group' },
      { value: 'attic', label: 'Мансарда', icon: 'fa-house-chimney-window' },
      { value: 'loft', label: 'Чердак', icon: 'fa-warehouse' }
    ];

    function getObjectFloorLocation(floorIndex) {
      const livingFloor = roomData.living?.floors?.[floorIndex];
      const nonlivingFloor = roomData.nonliving?.floors?.[floorIndex];
      return livingFloor?.location
        || nonlivingFloor?.location
        || livingFloor?.rooms?.find(room => room?.location)?.location
        || livingFloor?.livingRooms?.find(room => room?.location)?.location
        || nonlivingFloor?.livingRooms?.find(room => room?.location)?.location
        || 'above_ground';
    }

    function getObjectFloorLocationLabel(value) {
      return objectFloorLocationOptions.find(option => option.value === value)?.label || 'Надземный этаж';
    }

    function syncObjectFloorLocation(floorIndex, value = null) {
      const location = value || getObjectFloorLocation(floorIndex);
      ['living', 'nonliving'].forEach(roomId => {
        const floor = roomData[roomId]?.floors?.[floorIndex];
        if (!floor) return;
        floor.location = location;
        (floor.rooms || []).forEach(room => {
          room.location = location;
        });
        (floor.livingRooms || []).forEach(room => {
          room.location = location;
        });
      });
      return location;
    }

    function updateObjectFloorLocation(floorIndex, value) {
      syncObjectFloorLocation(floorIndex, value || 'above_ground');
      renderRoomInputs();
      updateTotalAreas();
      updateDetailedCalc();
    }

    function renderObjectFloorLocationPicker(floorIndex) {
      const selected = getObjectFloorLocation(floorIndex);
      return `
        <div class="object-floor-location object-floor-location--inline" onclick="event.stopPropagation()">
          <div class="object-floor-location-select-wrap">
            <i class="fas ${objectFloorLocationOptions.find(option => option.value === selected)?.icon || 'fa-building'}"></i>
            <span>Расположение:</span>
            <select class="object-floor-location-select" onchange="updateObjectFloorLocation(${floorIndex}, this.value)">
              ${objectFloorLocationOptions.map(option => `
                <option value="${option.value}" ${selected === option.value ? 'selected' : ''}>${option.label}</option>
              `).join('')}
            </select>
          </div>
        </div>
      `;
    }

    window.getObjectFloorLocation = getObjectFloorLocation;
    window.getObjectFloorLocationLabel = getObjectFloorLocationLabel;
    window.syncObjectFloorLocation = syncObjectFloorLocation;
    window.updateObjectFloorLocation = updateObjectFloorLocation;

    function getHouseObjectInfo() {
      const getValue = id => document.getElementById(id)?.value || '';
      return {
        entity: 'house',
        label: 'Дом',
        buildingType: getValue('buildingType'),
        buildingSubtype: getValue('buildingSubtype'),
        buildingMaterial: getValue('buildingMaterial'),
        cargoElevator: getValue('cargoElevator'),
        floorNumber: getValue('floorNumber'),
        address: getValue('addressInput'),
        tariffCity: window.currentTariffCity || window.currentCity || ''
      };
    }

    function makeRoomUid(roomId, floorIndex, roomIndex, fallbackNumber = 0) {
      const prefix = roomId === 'nonliving' ? 'nonliving' : 'room';
      return `${prefix}_f${Number(floorIndex) + 1}_r${Number(roomIndex) + 1}_${fallbackNumber || 0}`;
    }

    function getRoomRegistryCategoryLabel(roomId) {
      return roomId === 'nonliving' ? 'Нежилое помещение' : 'Жилое помещение';
    }

    const roomZoneOptions = [
      { value: '', label: 'Выберите', icon: 'fa-circle-dot' },
      { value: 'living', label: 'Жилая зона', icon: 'fa-couch' },
      { value: 'nonliving', label: 'Нежилая зона', icon: 'fa-warehouse' }
    ];

    const livingRoomTypeNames = ['Спальня', 'Детская', 'Гостиная', 'Кабинет'];
    const nonlivingRoomTypeNames = ['Кухня', 'Душевая', 'Ванная', 'Санузел', 'Совмещенный С/У', 'Прихожая', 'Холл', 'Коридор', 'Гардеробная', 'Кладовая', 'Постирочная', 'Котельная', 'Гараж', 'Бассейн', 'SPA-зона', 'Сауна', 'Балкон', 'Лоджия', 'Терраса', 'Офис'];

    function getRoomZoneLabel(zone) {
      return roomZoneOptions.find(option => option.value === zone)?.label || 'Выберите';
    }

    function getRoomZoneIcon(zone) {
      return roomZoneOptions.find(option => option.value === zone)?.icon || 'fa-circle-dot';
    }

    function inferRoomZone(room = {}) {
      const text = `${room.roomType || ''} ${room.appointment || ''} ${room.subAppointment || ''}`.toLowerCase();
      if (/кухн|душ|ванн|сануз|туалет|прихож|холл|коридор|гардероб|кладов|постир|котельн|гараж|бассейн|spa|спа|сауна|балкон|лодж|террас|офис|commercial|nonliving|нежил/.test(text)) {
        return 'nonliving';
      }
      return 'living';
    }

    function ensureRoomZone(room = {}, fallback = '') {
      const normalizedFallback = fallback === 'living' || fallback === 'nonliving' ? fallback : '';
      if (!room.roomZone && room.zone) room.roomZone = room.zone;
      if (!room.roomZone && normalizedFallback) room.roomZone = normalizedFallback;
      if (!room.roomZone && room.roomZoneManual !== true && room.roomType) room.roomZone = inferRoomZone(room);
      if (room.roomZone !== 'living' && room.roomZone !== 'nonliving') room.roomZone = '';
      room.zone = room.roomZone;
      room.category = room.roomZone;
      room.categoryLabel = getRoomZoneLabel(room.roomZone);
      room.roomEntity = room.roomEntity || 'room';
      room.chamberEntity = 'chamber';
      room.chamberDisplayName = room.chamberDisplayName || 'Комната 1';
      return room.roomZone;
    }

    function makePremiseId(floorIndex, premiseIndex = 0) {
      return `premise_f${Number(floorIndex) + 1}_${Number(premiseIndex) + 1}`;
    }

    const masterRoomTypeOptions = [
      { value: 'master_bedroom', label: 'Мастер-спальня', icon: 'fa-bed' },
      { value: 'kitchen_living', label: 'Кухня-гостиная', icon: 'fa-kitchen-set' }
    ];

    const masterRoomTemplates = {
      master_bedroom: [
        { roomType: 'Спальня', zone: 'living' },
        { roomType: 'Гардеробная', zone: 'nonliving' },
        { roomType: 'Совмещенный С/У', zone: 'nonliving' }
      ],
      kitchen_living: [
        { roomType: 'Кухня', zone: 'nonliving' },
        { roomType: 'Гостиная', zone: 'living' }
      ]
    };

    const masterRoomAllowedTypes = {
      master_bedroom: [
        { roomType: 'Спальня', zone: 'living' },
        { roomType: 'Гардеробная', zone: 'nonliving' },
        { roomType: 'Совмещенный С/У', zone: 'nonliving' },
        { roomType: 'Душевая', zone: 'nonliving' },
        { roomType: 'Ванная', zone: 'nonliving' },
        { roomType: 'Санузел', zone: 'nonliving' },
        { roomType: 'Кухня', zone: 'nonliving' },
        { roomType: 'Коридор', zone: 'nonliving' },
        { roomType: 'Кладовая', zone: 'nonliving' },
        { roomType: 'Постирочная', zone: 'nonliving' },
        { roomType: 'Балкон', zone: 'nonliving' },
        { roomType: 'Лоджия', zone: 'nonliving' },
        { roomType: 'Терраса', zone: 'nonliving' },
        { roomType: 'Холл', zone: 'nonliving' }
      ],
      kitchen_living: [
        { roomType: 'Кухня', zone: 'nonliving' },
        { roomType: 'Гостиная', zone: 'living' },
        { roomType: 'Балкон', zone: 'nonliving' },
        { roomType: 'Лоджия', zone: 'nonliving' },
        { roomType: 'Терраса', zone: 'nonliving' }
      ]
    };

    function isEuroPremiseAppointment(value) {
      return value === 'euro_apartment' || value === 'euro_aparthotel';
    }

    function getMasterRoomTypeLabel(type) {
      return masterRoomTypeOptions.find(option => option.value === type)?.label || 'Мастер-комната';
    }

    function getRoomGroupBaseLabel(room = {}) {
      if (room.roomGroupType === 'master_bedroom') return 'Мастер-спальня';
      if (room.roomGroupType === 'kitchen_living') return 'Кухня-гостиная';
      return 'Обычные комнаты';
    }

    function getRoomGroupDisplayName(room = {}, sameTypeCount = 1) {
      if (!room || !room.roomGroupType || room.roomGroupType === 'regular') return 'Обычные комнаты';
      const base = getRoomGroupBaseLabel(room);
      return sameTypeCount > 1 ? `${base} ${Number(room.roomGroupIndex || 0) + 1}` : base;
    }

    function getFloorPremiseGroups(roomId = 'living', floorIndex = 0) {
      const floor = roomData?.[roomId]?.floors?.[floorIndex];
      const rooms = floor?.livingRooms || [];
      const groups = [];
      const groupMap = new Map();
      rooms.forEach((room, index) => {
        if (!room.premiseId) room.premiseId = makePremiseId(floorIndex, groups.length);
        if (!groupMap.has(room.premiseId)) {
          const group = {
            id: room.premiseId,
            premiseNumber: groups.length + 1,
            floorIndex,
            rooms: []
          };
          groupMap.set(room.premiseId, group);
          groups.push(group);
        }
        const group = groupMap.get(room.premiseId);
        room.premiseNumber = group.premiseNumber;
        room.chamberNumber = group.rooms.length + 1;
        room.displayName = `Помещение ${group.premiseNumber}`;
        room.floorDisplayName = `Этажное помещение ${group.premiseNumber}`;
        if (!room.roomGroupType) room.roomGroupType = 'regular';
        if (!Number.isFinite(Number(room.roomInsideGroupNumber))) {
          const groupType = room.roomGroupType || 'regular';
          const groupIndex = Number(room.roomGroupIndex || 0);
          const sameGroupBefore = group.rooms.filter(item => {
            const other = item.room || {};
            return (other.roomGroupType || 'regular') === groupType && Number(other.roomGroupIndex || 0) === groupIndex;
          }).length;
          room.roomInsideGroupNumber = sameGroupBefore + 1;
        }
        room.roomGroupName = getRoomGroupDisplayName(room, 1);
        room.chamberDisplayName = room.roomGroupType && room.roomGroupType !== 'regular'
          ? `Комната ${room.roomInsideGroupNumber || room.chamberNumber}`
          : `Комната ${room.chamberNumber}`;
        group.rooms.push({ room, index });
      });
      groups.forEach(group => {
        const typeCounts = {};
        group.rooms.forEach(({ room }) => {
          if (room.roomGroupType && room.roomGroupType !== 'regular') {
            typeCounts[room.roomGroupType] = Math.max(typeCounts[room.roomGroupType] || 0, Number(room.roomGroupIndex || 0) + 1);
          }
        });
        const insideCounters = {};
        group.rooms.forEach(({ room }) => {
          const type = room.roomGroupType || 'regular';
          const index = Number(room.roomGroupIndex || 0);
          const key = `${type}:${index}`;
          insideCounters[key] = (insideCounters[key] || 0) + 1;
          room.roomInsideGroupNumber = insideCounters[key];
          room.roomGroupName = getRoomGroupDisplayName(room, typeCounts[type] || 1);
          room.chamberDisplayName = type !== 'regular'
            ? `Комната ${room.roomInsideGroupNumber}`
            : `Комната ${room.chamberNumber}`;
        });
      });
      return groups;
    }

    function getDefaultRoomZoneForObject() {
      const buildingType = document.getElementById('buildingType')?.value || '';
      const buildingSubtype = document.getElementById('buildingSubtype')?.value || '';
      if (buildingType === 'business' || ['office', 'retail', 'conference', 'public', 'infrastructure', 'fitness', 'special', 'warehouse', 'commercial'].includes(buildingSubtype)) {
        return 'nonliving';
      }
      if (buildingType === 'multiapartment') return 'living';
      return '';
    }

    function getRetailPremiseTypeLabel(value) {
      if (!value || typeof retailPremiseTypeOptions === 'undefined') return '';
      return retailPremiseTypeOptions.find(option => option.value === value)?.label || value;
    }

    function shouldShowRetailPremiseType(room = {}) {
      const buildingType = document.getElementById('buildingType')?.value || '';
      const buildingSubtype = document.getElementById('buildingSubtype')?.value || '';
      if (room.appointment !== 'commercial') return false;
      if (buildingType === 'business') {
        return buildingSubtype === 'retail' && room.subAppointment === 'store';
      }
      if (buildingType === 'multiapartment') {
        return room.subAppointment === 'retail';
      }
      return false;
    }

    function getRetailRoomTypeCatalog(room = {}) {
      if (!shouldShowRetailPremiseType(room)) return null;
      const type = room.retailPremiseType || '';
      if (type && typeof retailPremiseRoomTypes !== 'undefined' && Array.isArray(retailPremiseRoomTypes[type])) {
        return retailPremiseRoomTypes[type];
      }
      return typeof commercialRoomTypes !== 'undefined' ? commercialRoomTypes.retail : null;
    }

    function createPremiseChamber(floorIndex, premiseIndex = 0, chamberIndex = 0, zone = '') {
      const chamber = createDefaultFloorRoom(floorIndex, chamberIndex, zone);
      chamber.premiseId = makePremiseId(floorIndex, premiseIndex);
      chamber.premiseNumber = premiseIndex + 1;
      chamber.chamberNumber = chamberIndex + 1;
      chamber.displayName = `Помещение ${premiseIndex + 1}`;
      chamber.floorDisplayName = `Этажное помещение ${premiseIndex + 1}`;
      chamber.chamberDisplayName = `Комната ${chamberIndex + 1}`;
      chamber.roomGroupType = 'regular';
      chamber.roomGroupIndex = 0;
      chamber.roomInsideGroupNumber = chamberIndex + 1;
      chamber.roomGroupName = 'Обычные комнаты';
      return chamber;
    }

    function getRoomTypeCatalogByZone(zone, room = {}) {
      if (zone !== 'living' && zone !== 'nonliving') return [];
      const retailCatalog = getRetailRoomTypeCatalog(room);
      if (zone === 'nonliving' && Array.isArray(retailCatalog)) {
        return retailCatalog;
      }
      if (zone === 'nonliving' && room?.subAppointment && typeof commercialRoomTypes !== 'undefined' && Array.isArray(commercialRoomTypes[room.subAppointment])) {
        return commercialRoomTypes[room.subAppointment];
      }
      const legacyRoomId = zone === 'nonliving' ? 'nonliving' : 'living';
      const sourceRoom = priceData?.rooms?.[legacyRoomId] || priceData?.rooms?.living || {};
      const baseCatalog = Array.isArray(sourceRoom.room_types) ? sourceRoom.room_types : [];
      const allowed = zone === 'nonliving' ? nonlivingRoomTypeNames : livingRoomTypeNames;
      const filtered = baseCatalog.filter(type => allowed.includes(type.name));
      if (filtered.length) return filtered;
      return baseCatalog;
    }

    function createDefaultFloorRoom(floorIndex, roomIndex = 0, zone = '') {
      const roomZone = zone === 'living' || zone === 'nonliving' ? zone : getDefaultRoomZoneForObject();
      const catalog = getRoomTypeCatalogByZone(roomZone);
      const defaultType = catalog[roomIndex % Math.max(1, catalog.length)]?.name || (roomZone === 'nonliving' ? 'Кухня' : '');
      const room = {
        area: 0,
        doors: 1, windows: 1, wallsArea: 0,
        doorWidths: [80, 80, 80, 80, 80],
        doorHeights: [200, 200, 200, 200, 200],
        windowWidths: [130, 130, 130, 130, 130],
        windowHeights: [140, 140, 140, 140, 140],
        balcony: 0, balconyWidths: [80, 80, 80, 80, 80],
        balconyHeights: [250, 250, 250, 250, 250],
        roomType: defaultType, ceiling: 3,
        ceilingArea: 0, roomLength: 0, roomWidth: 0, roomPerimeter: 0, areaCalcMode: '', useDimensions: false,
        floorAreaManual: false, wallsAreaManual: false, ceilingAreaManual: false,
        archCount: 0, archAreas: [0, 0, 0, 0, 0],
        materialCoefficient: 1.1,
        nicheCount: 0, nicheAreas: Array(15).fill(0),
        projectionCount: 0, projectionAreas: Array(15).fill(0),
        columnCount: 0, columnAreas: Array(15).fill(0),
        appointment: roomZone === 'nonliving' ? 'nonliving_zone' : (roomZone === 'living' ? 'living_zone' : ''),
        subAppointment: '',
        roomGroupType: 'regular',
        roomGroupIndex: 0,
        roomInsideGroupNumber: roomIndex + 1,
        roomGroupName: 'Обычные комнаты',
        location: typeof getObjectFloorLocation === 'function' ? getObjectFloorLocation(floorIndex) : 'above_ground'
      };
      ensureRoomZone(room, roomZone);
      return room;
    }

    function normalizeRoomRegistryEntity(input = {}) {
      if (!input || typeof input !== 'object') return {};
      return {
        uid: input.uid || input.roomUid || '',
        displayName: input.displayName || (input.globalRoomNumber ? `Помещение ${input.globalRoomNumber}` : 'Помещение'),
        floorDisplayName: input.floorDisplayName || (input.floorRoomNumber ? `Этажное помещение ${input.floorRoomNumber}` : 'Этажное помещение'),
        fullDisplayName: input.fullDisplayName || [input.displayName, input.floorDisplayName].filter(Boolean).join(' · ') || 'Помещение',
        globalRoomNumber: Number(input.globalRoomNumber || 0),
        floorRoomNumber: Number(input.floorRoomNumber || 0),
        floorNumber: Number(input.floorNumber || (Number(input.floorIndex) + 1) || 1),
        floorIndex: Number(input.floorIndex || 0),
        categoryLabel: input.categoryLabel || getRoomRegistryCategoryLabel(input.category),
        chamberDisplayName: input.chamberDisplayName || 'Комната 1',
        roomGroupName: input.roomGroupName || '',
        roomGroupType: input.roomGroupType || 'regular',
        roomGroupIndex: Number(input.roomGroupIndex || 0),
        locationLabel: input.locationLabel || getObjectFloorLocationLabel(input.location || 'above_ground'),
        roomType: input.roomType || '',
        retailPremiseType: input.retailPremiseType || '',
        retailPremiseTypeLabel: input.retailPremiseTypeLabel || getRetailPremiseTypeLabel(input.retailPremiseType || '')
      };
    }

    function formatRoomRegistryLabel(input = {}, mode = 'full') {
      const entry = normalizeRoomRegistryEntity(input);
      if (mode === 'short') return entry.displayName;
      if (mode === 'floor') return entry.floorDisplayName;
      if (mode === 'context') {
        return [
          `Этаж ${entry.floorNumber}`,
          entry.floorDisplayName,
          entry.roomGroupName,
          entry.chamberDisplayName,
          entry.categoryLabel,
          entry.locationLabel
        ].filter(Boolean).join(' · ');
      }
      if (mode === 'export') {
        return [
          entry.fullDisplayName,
          entry.uid,
          `Этаж ${entry.floorNumber}`,
          entry.categoryLabel
        ].filter(Boolean).join(' · ');
      }
      return entry.fullDisplayName;
    }

    function assignRoomRegistryIdentity(room, context) {
      if (!room || !context) return null;
      const uid = room.roomUid || makeRoomUid(context.category, context.floorIndex, context.roomIndex, context.globalRoomNumber);
      room.roomUid = uid;
      room.roomEntity = 'room';
      room.floorRoomEntity = 'floor_room';
      room.globalRoomNumber = context.globalRoomNumber;
      room.floorRoomNumber = context.floorRoomNumber;
      room.floorNumber = context.floorNumber;
      ensureRoomZone(room, context.category);
      room.category = room.roomZone;
      room.categoryLabel = getRoomZoneLabel(room.roomZone);
      room.legacyRoomKey = `${context.category}:${context.floorIndex}:${context.roomIndex}`;
      room.displayName = `Помещение ${context.globalRoomNumber}`;
      room.floorDisplayName = `Этажное помещение ${context.floorRoomNumber}`;
      room.chamberDisplayName = room.chamberDisplayName || `Комната ${room.chamberNumber || 1}`;
      room.roomGroupType = room.roomGroupType || 'regular';
      room.roomGroupName = room.roomGroupName || getRoomGroupDisplayName(room, 1);
      room.fullDisplayName = `${room.displayName} · ${room.floorDisplayName}`;
      room.registryContextLine = formatRoomRegistryLabel({
        ...room,
        floorIndex: context.floorIndex,
        floorNumber: context.floorNumber,
        category: room.roomZone,
        location: room.location
      }, 'context');
      room.registryExportLabel = formatRoomRegistryLabel(room, 'export');
      return room;
    }

    function buildHouseRoomRegistry(skipEnsure = false) {
      const floorsCount = skipEnsure
        ? Math.max(1, Number(roomData.objectFloorCount || roomData.living?.floors?.length || roomData.nonliving?.floors?.length || 1))
        : ensureObjectFloorRoomData();
      const registry = {
        house: getHouseObjectInfo(),
        floors: [],
        rooms: []
      };
      let globalRoomNumber = 0;

      for (let floorIndex = 0; floorIndex < floorsCount; floorIndex += 1) {
        const floorNumber = floorIndex + 1;
        const floorEntry = {
          entity: 'floor',
          floorIndex,
          floorNumber,
          location: getObjectFloorLocation(floorIndex),
          locationLabel: getObjectFloorLocationLabel(getObjectFloorLocation(floorIndex)),
          rooms: []
        };
        let floorRoomNumber = 0;

        ['living', 'nonliving'].forEach(category => {
          const floor = roomData[category]?.floors?.[floorIndex];
          const premiseGroups = category === 'living' && typeof getFloorPremiseGroups === 'function'
            ? getFloorPremiseGroups(category, floorIndex)
            : null;
          const roomEntries = premiseGroups?.length
            ? premiseGroups.flatMap(group => {
                globalRoomNumber += 1;
                floorRoomNumber += 1;
                return group.rooms.map(item => ({
                  room: item.room,
                  roomIndex: item.index,
                  globalRoomNumber,
                  floorRoomNumber
                }));
              })
            : (floor?.livingRooms || []).map((room, roomIndex) => {
              globalRoomNumber += 1;
              floorRoomNumber += 1;
              return { room, roomIndex, globalRoomNumber, floorRoomNumber };
            });

          roomEntries.forEach(({ room, roomIndex, globalRoomNumber, floorRoomNumber }) => {
            const effectiveCategory = ensureRoomZone(room, category === 'nonliving' ? 'nonliving' : (room.roomZone || getDefaultRoomZoneForObject()));
            assignRoomRegistryIdentity(room, {
              category: effectiveCategory,
              floorIndex,
              roomIndex,
              floorNumber,
              globalRoomNumber,
              floorRoomNumber
            });
            const entry = {
              uid: room.roomUid,
              entity: 'room',
              floorRoomEntity: 'floor_room',
              globalRoomNumber,
              floorRoomNumber,
              floorIndex,
              floorNumber,
              category: room.roomZone || effectiveCategory,
              categoryLabel: room.categoryLabel,
              floorLabel: `Этаж ${floorNumber}`,
              locationLabel: floorEntry.locationLabel,
              chamberEntity: room.chamberEntity || 'chamber',
              chamberDisplayName: room.chamberDisplayName || 'Комната 1',
              roomGroupType: room.roomGroupType || 'regular',
              roomGroupIndex: Number(room.roomGroupIndex || 0),
              roomGroupName: room.roomGroupName || '',
              roomType: room.roomType || '',
              appointment: room.appointment || '',
              subAppointment: room.subAppointment || '',
              retailPremiseType: room.retailPremiseType || '',
              retailPremiseTypeLabel: getRetailPremiseTypeLabel(room.retailPremiseType || ''),
              displayName: room.displayName,
              floorDisplayName: room.floorDisplayName,
              fullDisplayName: room.fullDisplayName,
              registryContextLine: room.registryContextLine,
              registryExportLabel: room.registryExportLabel,
              legacyRoomKey: room.legacyRoomKey,
              room
            };
            floorEntry.rooms.push(entry);
            registry.rooms.push(entry);
          });
        });
        registry.floors.push(floorEntry);
      }

      roomData.house = registry.house;
      roomData.roomRegistry = registry.rooms.map(({ room, ...entry }) => entry);
      return registry;
    }

    function getRoomRegistryEntry(category, floorIndex, roomIndex) {
      buildHouseRoomRegistry(true);
      const room = roomData[category]?.floors?.[floorIndex]?.livingRooms?.[roomIndex];
      if (!room) return null;
      return (roomData.roomRegistry || []).find(entry => entry.uid === room.roomUid) || null;
    }

    function getHouseRoomWorkItems(options = {}) {
      const includeZeroArea = options.includeZeroArea !== false;
      const registry = buildHouseRoomRegistry(true);
      const registryByUid = new Map((registry.rooms || []).map(entry => [entry.uid, entry]));
      const items = [];

      const pushItem = (room, sourceCategory, floorIndex = 0, roomIndex = 0, isMultiFloor = true, floorLocation = '') => {
        if (!room) return;
        const floorArea = Number(room.area || room.floorArea || 0);
        if (!includeZeroArea && !(floorArea > 0)) return;

        const floorNumber = isMultiFloor ? floorIndex + 1 : (Number(room.floorNumber || 1) || 1);
        const registryEntry = registryByUid.get(room.roomUid) || getRoomRegistryEntry(sourceCategory, floorIndex, roomIndex) || {};
        const effectiveCategory = room.roomZone || room.category || registryEntry.category || sourceCategory;
        const categoryLabel = typeof getRoomZoneLabel === 'function'
          ? getRoomZoneLabel(effectiveCategory)
          : (effectiveCategory === 'living' ? 'Жилая зона' : 'Нежилая зона');
        const location = floorLocation || room.location || getObjectFloorLocation(floorIndex);
        const locationLabel = typeof getObjectFloorLocationLabel === 'function'
          ? getObjectFloorLocationLabel(location)
          : 'Надземный этаж';
        const displayName = registryEntry.displayName || room.displayName || `Помещение ${registryEntry.globalRoomNumber || room.globalRoomNumber || roomIndex + 1}`;
        const floorDisplayName = registryEntry.floorDisplayName || room.floorDisplayName || `Этажное помещение ${registryEntry.floorRoomNumber || room.floorRoomNumber || roomIndex + 1}`;
        const chamberDisplayName = registryEntry.chamberDisplayName || room.chamberDisplayName || 'Комната 1';
        const roomGroupName = registryEntry.roomGroupName || room.roomGroupName || '';
        const fullDisplayName = registryEntry.fullDisplayName || room.fullDisplayName || `${displayName} · ${floorDisplayName}`;
        const baseKey = isMultiFloor
          ? (sourceCategory === 'living' ? `living_floor_${floorIndex}_${roomIndex}` : `floor_${floorIndex}_${roomIndex}`)
          : `${sourceCategory}_${roomIndex}`;
        const repairRoomId = isMultiFloor
          ? `repair_${sourceCategory}_${floorIndex}_${roomIndex}`
          : `repair_${sourceCategory}_${roomIndex}`;
        const demoRoomId = isMultiFloor
          ? `demo_${sourceCategory}_${floorIndex}_${roomIndex}`
          : `demo_${sourceCategory}_${roomIndex}`;
        const floorRoomPath = ['Дом', `Этаж ${floorNumber}`, displayName, floorDisplayName, roomGroupName, chamberDisplayName].filter(Boolean).join(' · ');
        const estimateLabel = [fullDisplayName, roomGroupName, chamberDisplayName].filter(Boolean).join(' · ');

        items.push({
          key: baseKey,
          stableKey: `${sourceCategory}:${floorIndex}:${roomIndex}`,
          sourceCategory,
          category: effectiveCategory,
          categoryLabel,
          room,
          source: room,
          floorIndex,
          floorNumber,
          floorLabel: `Этаж ${floorNumber}`,
          floorLocation: location,
          floorLocationLabel: locationLabel,
          roomIndex,
          roomUid: registryEntry.uid || room.roomUid || '',
          globalRoomNumber: registryEntry.globalRoomNumber || room.globalRoomNumber || 0,
          floorRoomNumber: registryEntry.floorRoomNumber || room.floorRoomNumber || roomIndex + 1,
          premiseId: room.premiseId || '',
          premiseNumber: room.premiseNumber || '',
          chamberNumber: room.chamberNumber || 1,
          roomGroupType: room.roomGroupType || 'regular',
          roomGroupIndex: Number(room.roomGroupIndex || 0),
          roomGroupName,
          roomInsideGroupNumber: room.roomInsideGroupNumber || room.chamberNumber || 1,
          displayName,
          floorDisplayName,
          chamberDisplayName,
          fullDisplayName,
          registryContextLine: registryEntry.registryContextLine || room.registryContextLine || '',
          registryExportLabel: registryEntry.registryExportLabel || room.registryExportLabel || '',
          roomType: room.roomType || '',
          appointment: room.appointment || '',
          subAppointment: room.subAppointment || '',
          retailPremiseType: room.retailPremiseType || '',
          retailPremiseTypeLabel: getRetailPremiseTypeLabel(room.retailPremiseType || ''),
          demoRoomId,
          repairRoomId,
          floorRoomPath,
          estimateLabel,
          passportLabel: estimateLabel
        });
      };

      const floorsCount = Math.max(
        1,
        Number(roomData.objectFloorCount || 0),
        roomData.living?.floors?.length || 0,
        roomData.nonliving?.floors?.length || 0
      );
      const hasFloors = roomData.living?.floors?.length || roomData.nonliving?.floors?.length;
      if (hasFloors) {
        for (let floorIndex = 0; floorIndex < floorsCount; floorIndex += 1) {
          ['living', 'nonliving'].forEach(sourceCategory => {
            const floor = roomData[sourceCategory]?.floors?.[floorIndex];
            const floorLocation = floor?.location || getObjectFloorLocation(floorIndex);
            (floor?.livingRooms || []).forEach((room, roomIndex) => {
              pushItem(room, sourceCategory, floorIndex, roomIndex, true, floorLocation);
            });
          });
        }
        return items;
      }

      ['living', 'nonliving'].forEach(sourceCategory => {
        (roomData[sourceCategory]?.livingRooms || []).forEach((room, roomIndex) => {
          pushItem(room, sourceCategory, 0, roomIndex, false, room.location || 'above_ground');
        });
      });
      return items;
    }

    function validateHouseRoomRegistry() {
      const registry = buildHouseRoomRegistry(true);
      const uidSet = new Set();
      const numberSet = new Set();
      const issues = [];
      registry.rooms.forEach(entry => {
        if (!entry.uid) issues.push(`У помещения ${entry.displayName} нет ID.`);
        if (entry.uid && uidSet.has(entry.uid)) issues.push(`Дублируется ID помещения: ${entry.uid}.`);
        if (entry.uid) uidSet.add(entry.uid);
        if (entry.globalRoomNumber && numberSet.has(entry.globalRoomNumber)) issues.push(`Дублируется сквозной номер помещения: ${entry.globalRoomNumber}.`);
        if (entry.globalRoomNumber) numberSet.add(entry.globalRoomNumber);
        if (!entry.floorRoomNumber) issues.push(`${entry.displayName}: не задан номер этажного помещения.`);
        if (!entry.floorNumber) issues.push(`${entry.displayName}: не задан этаж.`);
      });
      return {
        ok: issues.length === 0,
        issues,
        roomsTotal: registry.rooms.length,
        floorsTotal: registry.floors.length
      };
    }

    window.getHouseObjectInfo = getHouseObjectInfo;
    window.buildHouseRoomRegistry = buildHouseRoomRegistry;
    window.getRoomRegistryEntry = getRoomRegistryEntry;
    window.getHouseRoomWorkItems = getHouseRoomWorkItems;
    window.assignRoomRegistryIdentity = assignRoomRegistryIdentity;
    window.formatRoomRegistryLabel = formatRoomRegistryLabel;
    window.normalizeRoomRegistryEntity = normalizeRoomRegistryEntity;
    window.validateHouseRoomRegistry = validateHouseRoomRegistry;
    window.getRoomZoneLabel = getRoomZoneLabel;
    window.getRoomZoneIcon = getRoomZoneIcon;
    window.inferRoomZone = inferRoomZone;
    window.ensureRoomZone = ensureRoomZone;
    window.getDefaultRoomZoneForObject = getDefaultRoomZoneForObject;
    window.shouldShowRetailPremiseType = shouldShowRetailPremiseType;
    window.getRetailPremiseTypeLabel = getRetailPremiseTypeLabel;
    window.getRetailRoomTypeCatalog = getRetailRoomTypeCatalog;
    window.isEuroPremiseAppointment = isEuroPremiseAppointment;
    window.masterRoomTypeOptions = masterRoomTypeOptions;
    window.masterRoomTemplates = masterRoomTemplates;
    window.masterRoomAllowedTypes = masterRoomAllowedTypes;
    window.getMasterRoomTypeLabel = getMasterRoomTypeLabel;
    window.getRoomGroupDisplayName = getRoomGroupDisplayName;
    window.getRoomTypeCatalogByZone = getRoomTypeCatalogByZone;
    window.createDefaultFloorRoom = createDefaultFloorRoom;
    window.getFloorPremiseGroups = getFloorPremiseGroups;
    window.createPremiseChamber = createPremiseChamber;

    function ensureObjectFloorRoomData() {
      if (!roomData || typeof roomData !== 'object') return 1;
      const buildingType = document.getElementById('detailedBuildingType')?.value || 'single_floor';
      const categories = ['living', 'nonliving'];
      let maxFloors = Math.max(1, Number(roomData.objectFloorCount || 0));

      categories.forEach(roomId => {
        if (!roomData[roomId]) roomData[roomId] = {};
        const data = roomData[roomId];
        if (!Array.isArray(data.floors)) data.floors = [];
        if (Array.isArray(data.livingRooms) && data.livingRooms.length) {
          if (!data.floors[0]) data.floors[0] = { floorNumber: 1, livingRooms: [] };
          if (!Array.isArray(data.floors[0].livingRooms)) data.floors[0].livingRooms = [];
          if (!data.floors[0].livingRooms.length) {
            data.floors[0].livingRooms = data.livingRooms;
          } else {
            data.floors[0].livingRooms = data.floors[0].livingRooms.concat(data.livingRooms);
          }
          data.livingRooms = [];
          data.livingRoomCount = 0;
        }
        maxFloors = Math.max(maxFloors, data.floors.length || 0);
      });

      const targetFloors = buildingType === 'multi_floor'
        ? Math.max(1, Math.min(30, maxFloors))
        : 1;
      roomData.objectFloorCount = targetFloors;

      categories.forEach(roomId => {
        const data = roomData[roomId];
        data.floorCount = targetFloors;
        data.floors = data.floors.slice(0, targetFloors);
        while (data.floors.length < targetFloors) {
          data.floors.push({ floorNumber: data.floors.length + 1, location: 'above_ground', livingRooms: [], rooms: [] });
        }
        data.floors.forEach((floor, index) => {
          floor.floorNumber = index + 1;
          floor.location = floor.location || 'above_ground';
          if (!Array.isArray(floor.livingRooms)) floor.livingRooms = [];
          if (roomId === 'living') {
            if (!Array.isArray(floor.rooms)) floor.rooms = floor.livingRooms;
            if (floor.rooms !== floor.livingRooms) floor.rooms = floor.livingRooms;
            floor.livingRooms.forEach(room => ensureRoomZone(room, room.roomZone || (room.roomType ? inferRoomZone(room) : '')));
          } else {
            floor.livingRooms.forEach(room => ensureRoomZone(room, 'nonliving'));
          }
        });
      });

      for (let floorIndex = 0; floorIndex < targetFloors; floorIndex += 1) {
        const livingFloor = roomData.living?.floors?.[floorIndex];
        const nonlivingFloor = roomData.nonliving?.floors?.[floorIndex];
        if (livingFloor && nonlivingFloor && Array.isArray(nonlivingFloor.livingRooms) && nonlivingFloor.livingRooms.length) {
          const alreadyMoved = new Set((livingFloor.livingRooms || []).map(room => room.roomUid || room.legacyRoomKey).filter(Boolean));
          nonlivingFloor.livingRooms.forEach((room, roomIndex) => {
            ensureRoomZone(room, 'nonliving');
            const marker = room.roomUid || room.legacyRoomKey || `nonliving:${floorIndex}:${roomIndex}`;
            if (!alreadyMoved.has(marker)) livingFloor.livingRooms.push(room);
          });
          nonlivingFloor.livingRooms = [];
        }
        if (livingFloor) {
          livingFloor.rooms = livingFloor.livingRooms;
          livingFloor.livingRooms.forEach(room => ensureRoomZone(room, room.roomZone || (room.roomType ? inferRoomZone(room) : '')));
        }
      }

      for (let floorIndex = 0; floorIndex < targetFloors; floorIndex += 1) {
        syncObjectFloorLocation(floorIndex);
      }
      buildHouseRoomRegistry(true);

      return targetFloors;
    }

    function getObjectFloorCount() {
      return ensureObjectFloorRoomData();
    }

    function changeObjectFloorCount(delta) {
      const input = document.getElementById('objectFloorCount');
      const current = parseInt(input?.value || roomData.objectFloorCount || 1, 10) || 1;
      updateObjectFloorCount(current + delta);
    }

    function updateObjectFloorCount(value) {
      const buildingTypeEl = document.getElementById('detailedBuildingType');
      if (buildingTypeEl && buildingTypeEl.value !== 'multi_floor') {
        buildingTypeEl.value = 'multi_floor';
      }
      const nextCount = Math.max(1, Math.min(30, parseInt(value, 10) || 1));
      roomData.objectFloorCount = nextCount;
      ['living', 'nonliving'].forEach(roomId => {
        if (!roomData[roomId]) roomData[roomId] = {};
        if (!Array.isArray(roomData[roomId].floors)) roomData[roomId].floors = [];
        roomData[roomId].floorCount = nextCount;
        roomData[roomId].floors = roomData[roomId].floors.slice(0, nextCount);
        while (roomData[roomId].floors.length < nextCount) {
          roomData[roomId].floors.push({ floorNumber: roomData[roomId].floors.length + 1, location: 'above_ground', livingRooms: [] });
        }
        roomData[roomId].floors.forEach((floor, index) => {
          floor.floorNumber = index + 1;
          floor.location = floor.location || 'above_ground';
          if (!Array.isArray(floor.livingRooms)) floor.livingRooms = [];
        });
      });
      for (let floorIndex = 0; floorIndex < nextCount; floorIndex += 1) {
        syncObjectFloorLocation(floorIndex);
      }
      renderRoomInputs();
      updateTotalAreas();
      updateDetailedCalc();
    }

    function toggleObjectFloorGroup(floorIndex) {
      const group = document.getElementById('objectFloor_' + floorIndex + 'Group');
      const icon = document.getElementById('objectFloor_' + floorIndex + 'Icon');
      if (!group || !icon) return;
      const isOpen = group.style.display !== 'none';
      group.style.display = isOpen ? 'none' : 'block';
      icon.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
    }

    function refreshObjectFloorCounters(floorIndex) {
      const rooms = roomData.living?.floors?.[floorIndex]?.livingRooms || [];
      const premises = typeof getFloorPremiseGroups === 'function' ? getFloorPremiseGroups('living', floorIndex) : [];
      const defaultZone = getDefaultRoomZoneForObject();
      const livingCount = rooms.filter(room => ensureRoomZone(room, room.roomZone || defaultZone) === 'living').length;
      const nonlivingCount = rooms.filter(room => ensureRoomZone(room, room.roomZone || defaultZone) === 'nonliving').length;
      const totalCount = premises.length || rooms.length;
      const floorCounter = document.getElementById('objectFloorCounter_' + floorIndex);
      const roomsCounter = document.getElementById('objectFloorRoomsCounter_' + floorIndex);
      const previewCount = document.getElementById('objectFloorPreviewCount_' + floorIndex);
      const previewLiving = document.getElementById('objectFloorPreviewLiving_' + floorIndex);
      const previewNonliving = document.getElementById('objectFloorPreviewNonliving_' + floorIndex);
      if (floorCounter) floorCounter.textContent = `${totalCount} помещ. · ${rooms.length} комн. · ${livingCount} жил. · ${nonlivingCount} нежил.`;
      if (roomsCounter) roomsCounter.textContent = `${totalCount} помещ.`;
      if (previewCount) previewCount.textContent = totalCount ? `${totalCount} помещ. · ${rooms.length} комн.` : 'Пока без помещений';
      if (previewLiving) previewLiving.textContent = `${livingCount} жилая зона`;
      if (previewNonliving) previewNonliving.textContent = `${nonlivingCount} нежилая зона`;
      refreshObjectStructureCounters();
    }

    function getObjectStructureCounts() {
      const floorCount = getObjectFloorCount();
      let premisesTotal = 0;
      let roomsTotal = 0;
      for (let floorIndex = 0; floorIndex < floorCount; floorIndex += 1) {
        const rooms = roomData.living?.floors?.[floorIndex]?.livingRooms || [];
        const premises = typeof getFloorPremiseGroups === 'function' ? getFloorPremiseGroups('living', floorIndex) : [];
        premisesTotal += premises.length || rooms.length;
        roomsTotal += rooms.length;
      }
      return { floorCount, premisesTotal, roomsTotal };
    }

    function refreshObjectStructureCounters() {
      const { floorCount, premisesTotal, roomsTotal } = getObjectStructureCounts();
      const chip = document.getElementById('objectStructureChip');
      const premises = document.getElementById('objectStructurePremises');
      const rooms = document.getElementById('objectStructureRooms');
      if (chip) chip.textContent = `${floorCount} эт. · ${premisesTotal} помещ. · ${roomsTotal} комн.`;
      if (premises) premises.textContent = premisesTotal;
      if (rooms) rooms.textContent = roomsTotal;
    }

    function renderObjectFloorRoomsControl(floorIndex) {
      const floor = roomData.living?.floors?.[floorIndex] || { livingRooms: [] };
      const count = typeof getFloorPremiseGroups === 'function' ? getFloorPremiseGroups('living', floorIndex).length : (floor.livingRooms?.length || 0);
      return `
        <div class="object-floor-category neutral">
          <div class="object-floor-category-head">
            <div class="flex items-center gap-2">
              <i class="fas fa-vector-square text-brand-500"></i>
              <span class="text-sm font-bold">Помещения на этаже</span>
            </div>
            <span class="text-xs text-gray-500" id="objectFloorRoomsCounter_${floorIndex}">${count} помещ.</span>
          </div>
          <div class="area-input-group mt-2">
            <label class="text-sm text-gray-500 w-44 font-bold">Помещения (шт.):</label>
            <div class="qty-controls">
              <button type="button" class="qty-btn" onclick="changeFloorRoomCount('living', ${floorIndex}, -1)">−</button>
              <input type="number" id="floorRoomCount_living_${floorIndex}" value="${count}" min="0" max="30"
                     class="qty-input" onchange="updateFloorRoomCount('living', ${floorIndex}, this.value)">
              <button type="button" class="qty-btn" onclick="changeFloorRoomCount('living', ${floorIndex}, 1)">+</button>
            </div>
          </div>
          <div id="floorRoomsContainer_living_${floorIndex}" class="mt-2"></div>
        </div>
      `;
    }

    function renderObjectFloorRegistryPreview(registry) {
      const floors = Array.isArray(registry?.floors) ? registry.floors : [];
      return `
        <div class="object-floor-preview">
          ${floors.map(floor => {
            const premiseIds = new Set();
            floor.rooms.forEach(room => premiseIds.add(room.room?.premiseId || `${room.floorIndex}:${room.floorRoomNumber}`));
            const premiseCount = premiseIds.size || (typeof getFloorPremiseGroups === 'function' ? getFloorPremiseGroups('living', floor.floorIndex).length : 0);
            const livingCount = floor.rooms.filter(room => room.category === 'living').length;
            const nonlivingCount = floor.rooms.filter(room => room.category === 'nonliving').length;
            return `
              <div class="object-floor-preview-card">
                <div class="object-floor-preview-top">
                  <strong>Этаж ${floor.floorNumber}</strong>
                  <span>${floor.locationLabel}</span>
                </div>
                <div class="object-floor-preview-count" id="objectFloorPreviewCount_${floor.floorIndex}">${premiseCount ? `${premiseCount} помещ. · ${floor.rooms.length} комн.` : 'Пока без помещений'}</div>
                <div class="object-floor-preview-meta">
                  <em id="objectFloorPreviewLiving_${floor.floorIndex}">${livingCount} жилая зона</em>
                  <em id="objectFloorPreviewNonliving_${floor.floorIndex}">${nonlivingCount} нежилая зона</em>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    function renderObjectFloors() {
      const buildingType = document.getElementById('detailedBuildingType')?.value || 'single_floor';
      const floorCount = getObjectFloorCount();
      const registry = buildHouseRoomRegistry(true);
      const { premisesTotal, roomsTotal } = getObjectStructureCounts();
      const showFloorControl = buildingType === 'multi_floor';
      let html = `
        <div class="room-card object-floors-card">
          <div class="room-card-header" onclick="toggleRoomCard('objectFloors')">
            <i class="fas fa-layer-group text-brand-500"></i>
            <span class="font-semibold flex-1">Структура объекта</span>
            <span class="object-house-chip" id="objectStructureChip">${floorCount} эт. · ${premisesTotal} помещ. · ${roomsTotal} комн.</span>
            <i class="fas fa-chevron-down text-xs transition-transform" id="roomIcon_objectFloors"></i>
          </div>
          <div class="room-card-content open" id="roomContent_objectFloors" style="display: block">
            <div class="object-house-summary">
              <div>
                <span>Сущность</span>
                <strong>Дом</strong>
              </div>
              <div>
                <span>Сквозные помещения</span>
                <strong id="objectStructurePremises">${premisesTotal}</strong>
              </div>
              <div>
                <span>Комнаты</span>
                <strong id="objectStructureRooms">${roomsTotal}</strong>
              </div>
            </div>
            ${renderObjectFloorRegistryPreview(registry)}
            <div class="text-xs text-gray-500 mb-3">На этаже создаются нейтральные помещения. Внутри каждого помещения есть “Комната” с классификацией: жилая или нежилая зона.</div>
            ${showFloorControl ? `
              <div class="area-input-group object-floor-count-control mb-3">
                <label class="text-sm text-gray-500 font-bold">Количество этажей (шт.):</label>
                <div class="qty-controls">
                  <button type="button" class="qty-btn" onclick="changeObjectFloorCount(-1)">−</button>
                  <input type="number" id="objectFloorCount" value="${floorCount}" min="1" max="30" class="qty-input" onchange="updateObjectFloorCount(this.value)">
                  <button type="button" class="qty-btn" onclick="changeObjectFloorCount(1)">+</button>
                </div>
                <span class="text-xs text-gray-500 ml-1">до 30</span>
              </div>
            ` : `
              <div class="rounded-xl bg-brand-50/70 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 px-3 py-2 text-xs text-brand-700 dark:text-brand-200 mb-3">
                По умолчанию создан Этаж 1. Чтобы добавить этажи, выберите “Более 1-го этажа”.
              </div>
            `}
      `;
      for (let floorIndex = 0; floorIndex < floorCount; floorIndex += 1) {
        const isFirst = floorIndex === 0;
        const floorRooms = roomData.living?.floors?.[floorIndex]?.livingRooms || [];
        const floorPremises = typeof getFloorPremiseGroups === 'function' ? getFloorPremiseGroups('living', floorIndex) : [];
        const defaultZone = getDefaultRoomZoneForObject();
        const livingCount = floorRooms.filter(room => ensureRoomZone(room, room.roomZone || defaultZone) === 'living').length;
        const nonlivingCount = floorRooms.filter(room => ensureRoomZone(room, room.roomZone || defaultZone) === 'nonliving').length;
        html += `
          <div class="object-floor-shell">
            <div class="object-floor-head" onclick="toggleObjectFloorGroup(${floorIndex})">
              <i class="fas fa-chevron-down text-xs transition-transform" id="objectFloor_${floorIndex}Icon" style="transform: rotate(${isFirst ? 0 : -90}deg)"></i>
              <div class="flex-1">
                <strong>Этаж ${floorIndex + 1}</strong>
                <span id="objectFloorCounter_${floorIndex}">${floorPremises.length || floorRooms.length} помещ. · ${floorRooms.length} комн. · ${livingCount} жил. · ${nonlivingCount} нежил.</span>
              </div>
              ${renderObjectFloorLocationPicker(floorIndex)}
            </div>
            <div id="objectFloor_${floorIndex}Group" class="object-floor-body" style="display: ${isFirst ? 'block' : 'none'}">
              ${renderObjectFloorRoomsControl(floorIndex)}
            </div>
          </div>
        `;
      }
      html += `
          </div>
        </div>
      `;
      return html;
    }

    function renderRoomInputs() {
      const container = document.getElementById('roomInputs');
      if (!container) return;
      try {
        ensureObjectFloorRoomData();
        const nextHtml = renderObjectFloors();
        if (nextHtml) container.innerHTML = nextHtml;
      } catch (error) {
        console.error('renderRoomInputs failed:', error);
        if (!container.innerHTML.trim()) {
          container.innerHTML = `
            <div class="room-card object-floors-card">
              <div class="room-card-header">
                <i class="fas fa-layer-group text-brand-500"></i>
                <span class="font-semibold flex-1">Структура объекта</span>
                <span class="object-house-chip">загрузка</span>
              </div>
              <div class="room-card-content open" style="display:block;max-height:none;overflow:visible;">
                <div class="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  Раздел помещений временно не удалось пересобрать. Обновите страницу или проверьте консоль.
                </div>
              </div>
            </div>
          `;
        }
        return;
      }
      const floorCount = getObjectFloorCount();
      for (let floorIndex = 0; floorIndex < floorCount; floorIndex += 1) {
        renderFloorRooms('living', floorIndex);
      }
      refreshObjectStructureCounters();
      
      updateTotalAreas();
      
      for (const roomId of ['living', 'nonliving']) {
        const room = priceData.rooms[roomId];
        if (room && room.has_room_type) {
          updateLivingRoomsTotal(roomId);
        }
      }
    }
    
    function toggleRoomCard(roomId) {
      const content = document.getElementById('roomContent_' + roomId);
      const icon = document.getElementById('roomIcon_' + roomId);
      const isOpen = content.classList.contains('open');
      
      if (isOpen) {
        content.classList.remove('open');
        content.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
      } else {
        content.classList.add('open');
        content.style.display = 'block';
        icon.style.transform = 'rotate(0deg)';
      }
    }
    
    function saveAndRestoreFloorRoomStates(roomId, floorIndex, renderFn) {
      const expandedStates = {};
      const masterRoomStates = {};
      const nestedFields = [
        'floorOpenings',
        'floorDoor',
        'floorWindow',
        'floorBalcony',
        'floorArch',
        'floorConstructions',
        'floorNiche',
        'floorProjection',
        'floorColumn',
        'floorMaterials',
        'floorRepairInfo'
      ];
      const rooms = roomData[roomId]?.floors?.[floorIndex]?.livingRooms || [];
      rooms.forEach((room, idx) => {
        if (room?.roomGroupType && room.roomGroupType !== 'regular') {
          const safePremiseId = String(room.premiseId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
          const groupIndex = Number(room.roomGroupIndex || 0);
          const cardId = `masterRoom_${roomId}_${floorIndex}_${safePremiseId}_${groupIndex}`;
          const card = document.getElementById(cardId);
          const body = document.getElementById(cardId + 'Body');
          if (body) {
            masterRoomStates[cardId] = body.style.display !== 'none' || card?.classList.contains('is-open');
          }
        }
        const groupId = 'floorRoom_' + floorIndex + '_' + idx + 'Group_' + roomId;
        const group = document.getElementById(groupId);
        expandedStates[idx] = group && group.classList.contains('expanded');

        nestedFields.forEach(field => {
          const fieldId = `${field}_${floorIndex}_${idx}`;
          const fieldGroup = document.getElementById(fieldId + 'Group_' + roomId);
          expandedStates[fieldId] = fieldGroup && fieldGroup.classList.contains('expanded');
        });
      });
      
      renderFn();

      Object.entries(masterRoomStates).forEach(([cardId, wasOpen]) => {
        if (!wasOpen) return;
        const card = document.getElementById(cardId);
        const body = document.getElementById(cardId + 'Body');
        const icon = document.getElementById(cardId + 'Icon');
        if (!body) return;
        body.style.display = 'block';
        if (card) {
          card.classList.remove('is-collapsed');
          card.classList.add('is-open');
        }
        if (icon) icon.style.transform = 'rotate(0deg)';
      });
      
      rooms.forEach((room, idx) => {
        const groupId = 'floorRoom_' + floorIndex + '_' + idx + 'Group_' + roomId;
        const group = document.getElementById(groupId);
        if (group && expandedStates[idx]) {
          group.classList.add('expanded');
          group.style.display = 'block';
          const icon = document.getElementById('floorRoom_' + floorIndex + '_' + idx + 'Icon_' + roomId);
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
        
        nestedFields.forEach(field => {
          const fieldId = `${field}_${floorIndex}_${idx}`;
          const fieldGroup = document.getElementById(fieldId + 'Group_' + roomId);
          if (fieldGroup && expandedStates[fieldId]) {
            fieldGroup.classList.add('expanded');
            fieldGroup.style.display = 'block';
            const icon = document.getElementById(fieldId + 'Icon_' + roomId);
            if (icon) icon.style.transform = 'rotate(0deg)';
          }
        });
      });
    }
    
    function toggleFloorRoomGroup(roomId, floorIndex, roomIndex) {
      const groupId = 'floorRoom_' + floorIndex + '_' + roomIndex + 'Group_' + roomId;
      const iconId = 'floorRoom_' + floorIndex + '_' + roomIndex + 'Icon_' + roomId;
      const group = document.getElementById(groupId);
      const icon = document.getElementById(iconId);
      
      if (!group || !icon) return;
      
      if (group.classList.contains('expanded')) {
        group.classList.remove('expanded');
        group.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
      } else {
        group.classList.add('expanded');
        group.style.display = 'block';
        icon.style.transform = 'rotate(0deg)';
      }
    }

    function togglePremiseCard(headerEl) {
      const card = headerEl?.closest?.('.premise-card');
      if (!card) return;
      const body = card.querySelector('.premise-card-body');
      const icon = card.querySelector('.premise-card-icon');
      if (!body) return;
      const isCollapsed = card.classList.toggle('is-collapsed');
      body.style.display = isCollapsed ? 'none' : 'block';
      if (icon) icon.style.transform = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
    }

    function toggleMasterRoomCard(cardId) {
      const card = document.getElementById(cardId);
      const body = document.getElementById(cardId + 'Body');
      const icon = document.getElementById(cardId + 'Icon');
      if (!body) return;
      const isCollapsed = body.style.display !== 'none';
      body.style.display = isCollapsed ? 'none' : 'block';
      if (card) card.classList.toggle('is-collapsed', isCollapsed);
      if (card) card.classList.toggle('is-open', !isCollapsed);
      if (icon) icon.style.transform = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
    }
    
    function toggleRoomFieldGroup(roomId, field) {
      const group = document.getElementById(field + 'Group_' + roomId);
      const icon = document.getElementById(field + 'Icon_' + roomId);
      
      if (!group || !icon) return;
      
      if (group.classList.contains('expanded')) {
        group.classList.remove('expanded');
        group.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
      } else {
        group.classList.add('expanded');
        group.style.display = 'block';
        icon.style.transform = 'rotate(0deg)';
      }
    }
    
    function toggleCustomSelect(roomId, index) {
      const dropdown = document.getElementById('customSelect_' + roomId + '_' + index);
      if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      }
    }
    
    function selectRoomType(roomId, index, value, icon) {
      const iconEl = document.getElementById('roomTypeIcon_' + roomId + '_' + index);
      const textEl = document.getElementById('roomTypeText_' + roomId + '_' + index);
      const dropdown = document.getElementById('customSelect_' + roomId + '_' + index);
      
      if (iconEl) iconEl.className = 'fas ' + icon;
      if (textEl) textEl.textContent = value;
      if (dropdown) dropdown.style.display = 'none';
      
      const areaValue = value === 'Офис' ? '20.00' : value === 'Кухня' ? '10.00' : value === 'Душевая' || value === 'Ванная' ? '4.00' : value === 'Санузел' ? '1.50' : value === 'Совмещенный С/У' ? '5.00' : value === 'Прихожая' ? '3.00' : value === 'Коридор' ? '2.00' : value === 'Гардеробная' ? '1.50' : value === 'Балкон' ? '1.20' : value === 'Лоджия' ? '2.00' : value === 'Терраса' ? '4.00' : value === 'Спальня' ? '20.00' : value === 'Детская' ? '15.00' : value === 'Гостиная' ? '25.00' : '15.00';
      
      updateLivingRoomData(roomId, index, 'roomType', value);
      const areaInput = document.getElementById('livingRoomArea_' + roomId + '_' + index);
      if (areaInput) areaInput.value = areaValue;
    }
    
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-dropdown').forEach(d => d.style.display = 'none');
      }
    });
    
    function toggleFloorCustomSelect(roomId, floorIndex, roomIndex) {
      const dropdown = document.getElementById('floorCustomSelect_' + roomId + '_' + floorIndex + '_' + roomIndex);
      if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      }
    }
    
    function selectFloorRoomType(roomId, floorIndex, roomIndex, value, icon) {
      const iconEl = document.getElementById('floorRoomTypeIcon_' + roomId + '_' + floorIndex + '_' + roomIndex);
      const textEl = document.getElementById('floorRoomTypeText_' + roomId + '_' + floorIndex + '_' + roomIndex);
      const dropdown = document.getElementById('floorCustomSelect_' + roomId + '_' + floorIndex + '_' + roomIndex);
      const room = roomData?.[roomId]?.floors?.[floorIndex]?.livingRooms?.[roomIndex];
      
      if (iconEl) iconEl.className = 'fas ' + icon;
      if (textEl) textEl.textContent = value;
      if (dropdown) dropdown.style.display = 'none';

      if (room?.roomGroupType && room.roomGroupType !== 'regular') {
        const preset = (masterRoomAllowedTypes?.[room.roomGroupType] || []).find(item => item.roomType === value);
        if (preset?.zone) {
          room.roomZone = preset.zone;
          room.appointment = preset.zone === 'nonliving' ? 'nonliving_zone' : 'living_zone';
          room.roomZoneManual = true;
          ensureRoomZone(room, preset.zone);
        }
      }
      
      updateFloorRoomData(roomId, floorIndex, roomIndex, 'roomType', value);
    }
    
    function changeRoomField(roomId, field, delta) {
      const input = document.querySelector(`#roomContent_${roomId} input[data-field="${field}"]`);
      if (!input) return;
      
      let current = parseInt(input.value) || 0;
      let maxVal = 10;
      if (field === 'doors' || field === 'windows' || field === 'balcony') maxVal = 5;
      current = Math.max(0, Math.min(maxVal, current + delta));
      input.value = current;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      updateRoomData(roomId, field, current);
    }
    
    function updateDoorSize(roomId, index, dimension, value) {
      const val = parseFloat(value);
      if (isNaN(val)) val = 80;
      
      if (dimension === 'width') {
        roomData[roomId].doorWidths[index] = val;
      } else {
        roomData[roomId].doorHeights[index] = val;
      }
      
      calculateWallsArea(roomId);
      const wallsInput = document.querySelector(`#roomContent_${roomId} input[data-field="wallsArea"]`);
      if (wallsInput) wallsInput.value = Math.round(roomData[roomId].wallsArea);
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
      
      console.log('DEBUG door size changed:', { roomId, index, dimension, val, wallsArea: roomData[roomId].wallsArea });
    }
    
    function updateWindowSize(roomId, index, dimension, value) {
      const val = parseFloat(value);
      if (isNaN(val)) val = 140;
      
      if (dimension === 'width') {
        roomData[roomId].windowWidths[index] = val;
      } else {
        roomData[roomId].windowHeights[index] = val;
      }
      
      calculateWallsArea(roomId);
      const wallsInput = document.querySelector(`#roomContent_${roomId} input[data-field="wallsArea"]`);
      if (wallsInput) wallsInput.value = Math.round(roomData[roomId].wallsArea);
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
    }
    
    function updateBalconySize(roomId, index, dimension, value) {
      const val = parseFloat(value);
      if (isNaN(val)) val = 80;
      
      if (dimension === 'width') {
        roomData[roomId].balconyWidths[index] = val;
      } else {
        roomData[roomId].balconyHeights[index] = val;
      }
      
      calculateWallsArea(roomId);
      const wallsInput = document.querySelector(`#roomContent_${roomId} input[data-field="wallsArea"]`);
      if (wallsInput) wallsInput.value = Math.round(roomData[roomId].wallsArea);
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
    }
    
    function updateRoomData(roomId, field, value) {
      let val;
      if (field === 'roomType') {
        val = value;
      } else {
        val = parseFloat(value);
        if (isNaN(val)) val = 0;
      }
      
      roomData[roomId][field] = val;
      
      if (field === 'area' || field === 'doors' || field === 'windows' || 
          field === 'doorWidth' || field === 'doorHeight' || 
          field === 'windowWidth' || field === 'windowHeight' ||
          field === 'balcony' || field === 'balconyWidth' || field === 'balconyHeight') {
        calculateWallsArea(roomId);
        const wallsInput = document.querySelector(`#roomContent_${roomId} input[data-field="wallsArea"]`);
        if (wallsInput) wallsInput.value = Math.round(roomData[roomId].wallsArea);
        
        if (field === 'balcony') {
          const room = priceData.rooms[roomId];
          const data = roomData[roomId];
          const balconyGroup = document.getElementById('balconyGroup_' + roomId);
          
          // Инициализировать массивы если их нет
          if (!data.balconyWidths) data.balconyWidths = [80, 80, 80, 80, 80];
          if (!data.balconyHeights) data.balconyHeights = [250, 250, 250, 250, 250];
          
          // При увеличении количества - сбросить новые балконные двери на значения по умолчанию
          const oldCount = data._lastBalconyCount || 0;
          if (val > oldCount) {
            for (let i = oldCount; i < val; i++) {
              data.balconyWidths[i] = 80;
              data.balconyHeights[i] = 250;
            }
          }
          data._lastBalconyCount = val;
          
          if (balconyGroup) {
            const balconyCount = Math.min(data.balcony || 0, 5);
            let balconySizeInputs = '';
            for (let i = 0; i < balconyCount; i++) {
              const balW = data.balconyWidths[i] || 80;
              const balH = data.balconyHeights[i] || 250;
              balconySizeInputs += `
                <div class="text-xs text-gray-500 mb-1 mt-2">Размеры балконной двери_${i + 1} (см):</div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="flex items-center gap-1">
                    <label class="text-xs text-gray-400 w-8">Шир:</label>
                    <input type="number" value="${balW}" min="60" max="400"
                           class="area-input text-xs" data-field="balconyWidth_${i}"
                           onchange="updateBalconySize('${roomId}', ${i}, 'width', this.value)"
                           oninput="updateBalconySize('${roomId}', ${i}, 'width', this.value)">
                  </div>
                  <div class="flex items-center gap-1">
                    <label class="text-xs text-gray-400 w-8">Выс:</label>
                    <input type="number" value="${balH}" min="150" max="350"
                           class="area-input text-xs" data-field="balconyHeight_${i}"
                           onchange="updateBalconySize('${roomId}', ${i}, 'height', this.value)"
                           oninput="updateBalconySize('${roomId}', ${i}, 'height', this.value)">
                  </div>
                </div>`;
            }
            balconyGroup.innerHTML = `
              <div class="area-input-group">
                <label class="text-xs text-gray-500 w-24">Кол-во (шт.):</label>
                <div class="qty-controls">
                  <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'balcony', -1)">−</button>
                  <input type="number" value="${data.balcony}" min="0" max="5"
                         class="qty-input" data-field="balcony" onchange="updateRoomData('${roomId}', 'balcony', this.value)">
                  <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'balcony', 1)">+</button>
                </div>
              </div>
              ${balconySizeInputs}`;
          }
        }
        
        if (field === 'windows') {
          const room = priceData.rooms[roomId];
          const data = roomData[roomId];
          const windowsGroup = document.getElementById('windowsGroup_' + roomId);
          
          // Инициализировать массивы если их нет
          if (!data.windowWidths) data.windowWidths = [130, 130, 130, 130, 130];
          if (!data.windowHeights) data.windowHeights = [140, 140, 140, 140, 140];
          
          // При увеличении количества - сбросить новые окна на значения по умолчанию
          const oldCount = data._lastWindowCount || 0;
          if (val > oldCount) {
            for (let i = oldCount; i < val; i++) {
              data.windowWidths[i] = 130;
              data.windowHeights[i] = 140;
            }
          }
          data._lastWindowCount = val;
          
          if (windowsGroup) {
            const windowCount = Math.min(data.windows || 0, 5);
            let windowSizeInputs = '';
            for (let i = 0; i < windowCount; i++) {
              const winW = data.windowWidths[i] || 130;
              const winH = data.windowHeights[i] || 140;
              windowSizeInputs += `
                <div class="text-xs text-gray-500 mb-1 mt-2">Размеры окна_${i + 1} (см):</div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="flex items-center gap-1">
                    <label class="text-xs text-gray-400 w-8">Шир:</label>
                    <input type="number" value="${winW}" min="80" max="250"
                           class="area-input text-xs" data-field="windowWidth_${i}"
                           onchange="updateWindowSize('${roomId}', ${i}, 'width', this.value)"
                           oninput="updateWindowSize('${roomId}', ${i}, 'width', this.value)">
                  </div>
                  <div class="flex items-center gap-1">
                    <label class="text-xs text-gray-400 w-8">Выс:</label>
                    <input type="number" value="${winH}" min="80" max="200"
                           class="area-input text-xs" data-field="windowHeight_${i}"
                           onchange="updateWindowSize('${roomId}', ${i}, 'height', this.value)"
                           oninput="updateWindowSize('${roomId}', ${i}, 'height', this.value)">
                  </div>
                </div>`;
            }
            windowsGroup.innerHTML = `
              <div class="area-input-group">
                <label class="text-xs text-gray-500 w-24">Кол-во (шт.):</label>
                <div class="qty-controls">
                  <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'windows', -1)">−</button>
                  <input type="number" value="${data.windows}" min="0" max="5"
                         class="qty-input" data-field="windows" onchange="updateRoomData('${roomId}', 'windows', this.value)">
                  <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'windows', 1)">+</button>
                </div>
              </div>
              ${windowSizeInputs}`;
          }
        }
        
        if (field === 'doors') {
          const room = priceData.rooms[roomId];
          const data = roomData[roomId];
          const doorsGroup = document.getElementById('doorsGroup_' + roomId);
          
          // Инициализировать массивы если их нет
          if (!data.doorWidths) data.doorWidths = [80, 80, 80, 80, 80];
          if (!data.doorHeights) data.doorHeights = [200, 200, 200, 200, 200];
          
          // При увеличении количества - сбросить новые двери (индекс >= старого количества) на значения по умолчанию
          const oldCount = data._lastDoorCount || 0;
          if (val > oldCount) {
            for (let i = oldCount; i < val; i++) {
              data.doorWidths[i] = 80;
              data.doorHeights[i] = 200;
            }
          }
          data._lastDoorCount = val;
          
          if (doorsGroup) {
            const doorCount = Math.min(data.doors || 0, 5);
            let doorSizeInputs = '';
            for (let i = 0; i < doorCount; i++) {
              const doorW = data.doorWidths[i] || 80;
              const doorH = data.doorHeights[i] || 200;
              doorSizeInputs += `
                <div class="text-xs text-gray-500 mb-1 mt-2">Размеры двери_${i + 1} (см):</div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="flex items-center gap-1">
                    <label class="text-xs text-gray-400 w-8">Шир:</label>
                    <input type="number" value="${doorW}" min="50" max="120"
                           class="area-input text-xs" data-field="doorWidth_${i}"
                           onchange="updateDoorSize('${roomId}', ${i}, 'width', this.value)"
                           oninput="updateDoorSize('${roomId}', ${i}, 'width', this.value)">
                  </div>
                  <div class="flex items-center gap-1">
                    <label class="text-xs text-gray-400 w-8">Выс:</label>
                    <input type="number" value="${doorH}" min="150" max="250"
                           class="area-input text-xs" data-field="doorHeight_${i}"
                           onchange="updateDoorSize('${roomId}', ${i}, 'height', this.value)"
                           oninput="updateDoorSize('${roomId}', ${i}, 'height', this.value)">
                  </div>
                </div>`;
            }
            doorsGroup.innerHTML = `
              <div class="area-input-group">
                <label class="text-xs text-gray-500 w-24">Кол-во (шт.):</label>
                <div class="qty-controls">
                  <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'doors', -1)">−</button>
                  <input type="number" value="${data.doors}" min="0" max="5"
                         class="qty-input" data-field="doors" onchange="updateRoomData('${roomId}', 'doors', this.value)">
                  <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'doors', 1)">+</button>
                </div>
              </div>
              ${doorSizeInputs}`;
          }
        }
      }
      
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
    }
