// Module: calc-flow.js
    function toggleFloorDesignOptions(roomId, floorIndex, roomIndex) {
      const container = document.getElementById('floorDesignOptions_' + roomId + '_' + floorIndex + '_' + roomIndex);
      if (container) {
        container.style.display = 'block';
      }
    }
    
    function hideFloorDesignOptions(roomId, floorIndex, roomIndex) {
      const container = document.getElementById('floorDesignOptions_' + roomId + '_' + floorIndex + '_' + roomIndex);
      if (container) {
        container.style.display = 'none';
      }
    }
    
    function updateLivingRoomsTotal(roomId) {
      const container = document.getElementById(`livingRoomsTotal_${roomId}`);
      if (!container) return;
      
      const livingRooms = roomData[roomId]?.livingRooms || [];
      const floors = roomData[roomId]?.floors || [];
      let totalFloorArea = 0;
      let totalWallsArea = 0;
      let totalCeilingArea = 0;
      
      livingRooms.forEach(room => {
        totalFloorArea += getLivingRoomFloorArea(room);
        totalWallsArea += calculateLivingRoomWallsArea(room);
        totalCeilingArea += getLivingRoomCeilingArea(room);
      });
      
      floors.forEach(floor => {
        if (floor.livingRooms) {
          floor.livingRooms.forEach(room => {
            totalFloorArea += getLivingRoomFloorArea(room);
            totalWallsArea += calculateLivingRoomWallsArea(room);
            totalCeilingArea += getLivingRoomCeilingArea(room);
          });
        }
      });
      
      container.innerHTML = `
        <div class="text-sm font-bold text-gray-700 dark:text-gray-300">\u0418\u0442\u043E\u0433\u043E \u043F\u043B\u043E\u0449\u0430\u0434\u044C:</div>
        <div class="text-xs text-gray-500 mt-1">
          <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043F\u043E\u043B\u044B: <span class="font-medium">${totalFloorArea.toFixed(2)} \u043C\u00B2</span></div>
          <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0441\u0442\u0435\u043D\u044B: <span class="font-medium">${totalWallsArea.toFixed(2)} \u043C\u00B2</span></div>
          <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043F\u043E\u0442\u043E\u043B\u043A\u0430: <span class="font-medium">${totalCeilingArea.toFixed(2)} \u043C\u00B2</span></div>
        </div>
      `;
    }
    
    function updateLivingRoomData(roomId, index, field, value) {
      const room = priceData.rooms[roomId];
      if (!roomData[roomId].livingRooms[index]) {
        roomData[roomId].livingRooms[index] = {};
      }
      
      let val;
      if (field === 'roomType') {
        val = value;
        const roomTypeDefaultAreas = {
          '\u041A\u0443\u0445\u043D\u044F': 10,
          '\u0414\u0443\u0448\u0435\u0432\u0430\u044F': 4,
          '\u0412\u0430\u043D\u043D\u0430\u044F': 4,
          '\u0421\u0430\u043D\u0443\u0437\u0435\u043B': 1.5,
          '\u0421\u043E\u0432\u043C\u0435\u0449\u0435\u043D\u043D\u044B\u0439 \u0421/\u0423': 5,
          '\u041F\u0440\u0438\u0445\u043E\u0436\u0430\u044F': 3,
          'Холл': 6,
          '\u041A\u043E\u0440\u0438\u0434\u043E\u0440': 2,
          '\u0413\u0430\u0440\u0434\u0435\u0440\u043E\u0431\u043D\u0430\u044F': 1.5,
          'Кладовая': 2,
          'Постирочная': 4,
          'Котельная': 6,
          'Гараж': 18,
          'Бассейн': 28,
          'SPA-зона': 12,
          'Сауна': 6,
          '\u0411\u0430\u043B\u043A\u043E\u043D': 1.2,
          '\u041B\u043E\u0434\u0436\u0438\u044F': 2,
          '\u0422\u0435\u0440\u0440\u0430\u0441\u0430': 4,
        '\u041E\u0444\u0438\u0441': 20,
          '\u0421\u043F\u0430\u043B\u044C\u043D\u044F': 20,
          '\u0414\u0435\u0442\u0441\u043A\u0430\u044F': 15,
          '\u0413\u043E\u0441\u0442\u0438\u043D\u0430\u044F': 25,
          '\u041A\u0430\u0431\u0438\u043D\u0435\u0442': 15
        };
        roomData[roomId].livingRooms[index].area = roomTypeDefaultAreas[val] || 20;
      } else {
        val = parseFloat(value);
        if (isNaN(val)) val = 0;
      }
      if (field === 'area' && typeof clampLivingRoomFloorArea === 'function') {
        val = clampLivingRoomFloorArea(val, roomData[roomId].livingRooms[index]);
      } else if (field === 'wallsArea' && typeof clampLivingRoomWallsArea === 'function') {
        val = clampLivingRoomWallsArea(val, roomData[roomId].livingRooms[index]);
      }
      
      roomData[roomId].livingRooms[index][field] = val;
      const currentRoom = roomData[roomId].livingRooms[index];
      if (field === 'area') {
        currentRoom.floorAreaManual = true;
      } else if (field === 'wallsArea') {
        currentRoom.wallsAreaManual = true;
      } else if (field === 'ceilingArea') {
        currentRoom.ceilingAreaManual = true;
      } else if (field === 'roomLength' || field === 'roomWidth') {
        currentRoom.areaCalcMode = 'dimensions';
        currentRoom.useDimensions = true;
        currentRoom.floorAreaManual = false;
        currentRoom.wallsAreaManual = false;
        currentRoom.ceilingAreaManual = false;
      } else if (field === 'roomPerimeter') {
        currentRoom.areaCalcMode = 'perimeter_area';
        currentRoom.useDimensions = false;
        currentRoom.floorAreaManual = true;
        currentRoom.wallsAreaManual = false;
        currentRoom.ceilingAreaManual = false;
      } else if (field === 'roomType') {
        currentRoom.floorAreaManual = false;
        currentRoom.wallsAreaManual = false;
        currentRoom.ceilingAreaManual = false;
      }
      syncLivingRoomDerivedAreas(currentRoom, field);
      const deferDimensionCalculation = typeof shouldDeferLivingRoomDimensionCalculation === 'function'
        && shouldDeferLivingRoomDimensionCalculation(currentRoom, field);
      
      // Update walls area display
      updateLivingRoomAreaInputs(roomId, index, currentRoom);
      if (deferDimensionCalculation) return;
      updateMaterialAreasDisplay(roomId, index);
      
      // Handle field-specific updates
      if (field === 'balcony') {
        renderLivingRoomBalconyInputs(roomId, index);
      } else if (field === 'doors') {
        renderLivingRoomDoorsInputs(roomId, index);
        // Auto-expand doors group when count > 0
        if (val > 0) {
          const doorsGroup = document.getElementById(`livingDoors_${index}Group_${roomId}`);
          const doorsIcon = document.getElementById(`livingDoors_${index}Icon_${roomId}`);
          if (doorsGroup) doorsGroup.style.display = 'block';
          if (doorsIcon) doorsIcon.style.transform = 'rotate(0deg)';
        }
      } else if (field === 'windows') {
        renderLivingRoomWindowsInputs(roomId, index);
        // Auto-expand windows group when count > 0
        if (val > 0) {
          const windowsGroup = document.getElementById(`livingWindows_${index}Group_${roomId}`);
          const windowsIcon = document.getElementById(`livingWindows_${index}Icon_${roomId}`);
          if (windowsGroup) windowsGroup.style.display = 'block';
          if (windowsIcon) windowsIcon.style.transform = 'rotate(0deg)';
        }
      } else if (field === 'archCount') {
        renderLivingRoomArchInputs(roomId, index);
        // Auto-expand arch group when count > 0
        if (val > 0) {
          const archGroup = document.getElementById(`livingArch_${index}Group_${roomId}`);
          const archIcon = document.getElementById(`livingArch_${index}Icon_${roomId}`);
          if (archGroup) archGroup.style.display = 'block';
          if (archIcon) archIcon.style.transform = 'rotate(0deg)';
        }
      } else if (field === 'nicheCount' || field === 'projectionCount' || field === 'columnCount') {
        // Find and update the specific subgroup
        let subgroupId, iconId, areaFieldName, updateFunc, labelName;
        if (field === 'nicheCount') {
          subgroupId = `livingNiche_${index}Group_${roomId}`;
          iconId = `livingNiche_${index}Icon_${roomId}`;
          areaFieldName = 'nicheAreas';
          updateFunc = 'updateLivingRoomNicheArea';
          labelName = '\u043D\u0438\u0448\u0438';
        } else if (field === 'projectionCount') {
          subgroupId = `livingProjection_${index}Group_${roomId}`;
          iconId = `livingProjection_${index}Icon_${roomId}`;
          areaFieldName = 'projectionAreas';
          updateFunc = 'updateLivingRoomProjectionArea';
          labelName = '\u0432\u044B\u0441\u0442\u0443\u043F\u0430';
        } else if (field === 'columnCount') {
          subgroupId = `livingColumn_${index}Group_${roomId}`;
          iconId = `livingColumn_${index}Icon_${roomId}`;
          areaFieldName = 'columnAreas';
          updateFunc = 'updateLivingRoomColumnArea';
          labelName = '\u043A\u043E\u043B\u043E\u043D\u043D\u044B';
        }
        
        const subgroup = document.getElementById(subgroupId);
        const icon = document.getElementById(iconId);
        
        if (val > 0) {
          if (subgroup) subgroup.style.display = 'block';
          if (icon) icon.style.transform = 'rotate(0deg)';
          
          // Build area inputs HTML
          let areaInputsHtml = '';
          const areas = roomData[roomId].livingRooms[index][areaFieldName] || [];
          for (let i = 0; i < val; i++) {
            const areaVal = areas[i] || 0;
            areaInputsHtml += `
              <div class="area-input-group mt-1">
                <label class="text-xs text-gray-500 w-28">\u041F\u043B\u043E\u0449\u0430\u0434\u044C ${labelName}_${i + 1}:</label>
                <input type="number" value="${parseFloat(areaVal).toFixed(2)}" min="0" max="50" step="0.01"
                       class="area-input" style="width: 70px"
                       onchange="${updateFunc}('${roomId}', ${index}, ${i}, this.value)"
                       oninput="${updateFunc}('${roomId}', ${index}, ${i}, this.value)">
                <span class="text-xs text-gray-500">\u043C\u00B2</span>
              </div>`;
          }
          
          // Replace subgroup content keeping the count input
          if (subgroup) {
            const countGroup = subgroup.querySelector('.area-input-group');
            if (countGroup) {
              subgroup.innerHTML = countGroup.outerHTML + areaInputsHtml;
            }
          }
        } else {
          if (subgroup) subgroup.style.display = 'none';
          if (icon) icon.style.transform = 'rotate(-90deg)';
        }
      }
      
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
      updateLivingRoomsTotal(roomId);
    }
    
    function getDefaultRoomTypeCatalog(roomId) {
      const room = priceData?.rooms?.[roomId];
      if (!room) return [];
      if (!room.default_room_types && room.room_types) {
        room.default_room_types = JSON.parse(JSON.stringify(room.room_types));
      }
      return room.default_room_types ? JSON.parse(JSON.stringify(room.default_room_types)) : [];
    }

    function restoreDefaultRoomTypeCatalog(roomId) {
      const room = priceData?.rooms?.[roomId];
      if (!room) return [];
      const defaultTypes = getDefaultRoomTypeCatalog(roomId);
      if (defaultTypes.length) {
        room.room_types = defaultTypes;
      }
      return room.room_types || [];
    }

    function getResidentialHouseRoomTypeCatalog(roomId) {
      const defaultTypes = getDefaultRoomTypeCatalog(roomId);
      if (roomId !== 'nonliving') return defaultTypes;
      const extraTypes = [
        { name: 'Котельная', icon: 'fa-fire-flame-simple' },
        { name: 'Гараж', icon: 'fa-warehouse' },
        { name: 'Бассейн', icon: 'fa-person-swimming' },
        { name: 'SPA-зона', icon: 'fa-spa' },
        { name: 'Сауна', icon: 'fa-hot-tub-person' }
      ];
      const existing = new Set(defaultTypes.map(type => type.name));
      return [...defaultTypes, ...extraTypes.filter(type => !existing.has(type.name))];
    }

    function getRoomTypeCatalogForAppointment(roomId, roomItem = {}) {
      if (typeof getRetailRoomTypeCatalog === 'function') {
        const retailCatalog = getRetailRoomTypeCatalog(roomItem);
        if (Array.isArray(retailCatalog)) return retailCatalog;
      }
      if (roomItem.subAppointment && commercialRoomTypes[roomItem.subAppointment]) {
        return commercialRoomTypes[roomItem.subAppointment];
      }
      if (roomItem.appointment === 'residential_house') {
        return getResidentialHouseRoomTypeCatalog(roomId);
      }
      return getDefaultRoomTypeCatalog(roomId);
    }

    function applyRoomTypeCatalogForAppointment(roomId, roomItem = {}) {
      const room = priceData?.rooms?.[roomId];
      if (!room) return [];
      const catalog = getRoomTypeCatalogForAppointment(roomId, roomItem);
      room.room_types = JSON.parse(JSON.stringify(catalog));
      return room.room_types;
    }

    function resetRoomTypeToDefault(roomId, roomItem) {
      if (!roomItem) return;
      const catalog = applyRoomTypeCatalogForAppointment(roomId, roomItem);
      if (catalog.length && !catalog.some(type => type.name === roomItem.roomType)) {
        roomItem.roomType = catalog[0].name;
      }
    }

    function resetAllRoomTypeCatalogsToDefault() {
      if (!priceData?.rooms) return;
      Object.keys(priceData.rooms).forEach(restoreDefaultRoomTypeCatalog);
    }

    function updateRoomAppointment(roomId, index, value) {
      if (!roomData[roomId].livingRooms[index]) {
        roomData[roomId].livingRooms[index] = {};
      }
      roomData[roomId].livingRooms[index].appointment = value;
      
      const subAppointmentSelect = document.getElementById(`subAppointment_${roomId}_${index}`);
      const subAppointmentContainer = subAppointmentSelect?.closest('.area-input-group');
      
      if (subAppointmentSelect) {
        subAppointmentSelect.innerHTML = '<option value="">Выберите</option>';
        
        if (buildingSubAppointments[value]) {
          buildingSubAppointments[value].forEach(item => {
            subAppointmentSelect.innerHTML += `<option value="${item.value}">${item.label}</option>`;
          });
          if (subAppointmentContainer) {
            subAppointmentContainer.style.display = 'flex';
          }
        } else {
          if (subAppointmentContainer) {
            subAppointmentContainer.style.display = 'none';
          }
        }
      }
      
      if (value !== 'commercial') {
        roomData[roomId].livingRooms[index].subAppointment = '';
        roomData[roomId].livingRooms[index].retailPremiseType = '';
        if (subAppointmentSelect) subAppointmentSelect.value = '';
        resetRoomTypeToDefault(roomId, roomData[roomId].livingRooms[index]);
        updateRoomTypeSelector(roomId, index);
      }
      
      updateDetailedCalc();
    }
    
    function updateRoomLocation(roomId, index, value) {
      if (!roomData[roomId].livingRooms[index]) {
        roomData[roomId].livingRooms[index] = {};
      }
      roomData[roomId].livingRooms[index].location = value;
      updateDetailedCalc();
    }
    
    function updateRoomSubAppointment(roomId, index, value) {
      if (!roomData[roomId].livingRooms[index]) {
        roomData[roomId].livingRooms[index] = {};
      }
      roomData[roomId].livingRooms[index].subAppointment = value;
      if (typeof shouldShowRetailPremiseType === 'function' && !shouldShowRetailPremiseType(roomData[roomId].livingRooms[index])) {
        roomData[roomId].livingRooms[index].retailPremiseType = '';
      }
      
      if (commercialRoomTypes[value]) {
        const room = priceData.rooms[roomId];
        if (room && room.room_types) {
          room.room_types = commercialRoomTypes[value];
          
          if (commercialRoomTypes[value].length > 0) {
            const firstType = commercialRoomTypes[value][0];
            roomData[roomId].livingRooms[index].roomType = firstType.name;
          }
          
          updateRoomTypeSelector(roomId, index);
        }
      } else {
        resetRoomTypeToDefault(roomId, roomData[roomId].livingRooms[index]);
        updateRoomTypeSelector(roomId, index);
      }
      
      updateDetailedCalc();
    }

    function updateRoomRetailPremiseType(roomId, index, value) {
      if (!roomData[roomId].livingRooms[index]) {
        roomData[roomId].livingRooms[index] = {};
      }
      roomData[roomId].livingRooms[index].retailPremiseType = value;
      resetRoomTypeToDefault(roomId, roomData[roomId].livingRooms[index]);
      updateRoomTypeSelector(roomId, index);
      updateDetailedCalc();
    }
    
    function updateRoomTypeSelector(roomId, index) {
      const room = priceData.rooms[roomId];
      const data = roomData[roomId].livingRooms[index];
      if (!room || !data) return;
      const roomTypes = applyRoomTypeCatalogForAppointment(roomId, data);
      
      const iconEl = document.getElementById(`roomTypeIcon_${roomId}_${index}`);
      const textEl = document.getElementById(`roomTypeText_${roomId}_${index}`);
      const dropdownEl = document.getElementById(`customSelect_${roomId}_${index}`);
      
      if (iconEl && textEl && roomTypes) {
        const currentType = roomTypes.find(t => t.name === data.roomType);
        if (currentType) {
          iconEl.className = `fas ${currentType.icon}`;
          iconEl.style.color = '#22c55e';
          textEl.textContent = currentType.name;
        } else if (roomTypes.length > 0) {
          const firstType = roomTypes[0];
          iconEl.className = `fas ${firstType.icon}`;
          iconEl.style.color = '#22c55e';
          textEl.textContent = firstType.name;
          data.roomType = firstType.name;
        }
      }
      
      if (dropdownEl && roomTypes) {
        dropdownEl.innerHTML = roomTypes.map(type => 
          `<div class="custom-select-option" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; transition: background 0.2s;" onmouseenter="this.style.background='rgba(74, 222, 128, 0.1)'" onmouseleave="this.style.background='transparent'" onclick="selectRoomType('${roomId}', ${index}, '${type.name}', '${type.icon}')"><i class="fas ${type.icon}" style="color: #22c55e !important;"></i><span style="color: inherit;">${type.name}</span></div>`
        ).join('');
      }
    }
    
    function renderBalconySizes(room, data, roomId) {
      if (!room.has_balcony) return '';
      const balconyCount = Math.min(data.balcony || 0, 5);
      let balconySizeInputs = '';
      for (let i = 0; i < balconyCount; i++) {
        const balW = data.balconyWidths?.[i] || 80;
        const balH = data.balconyHeights?.[i] || 250;
        balconySizeInputs += `
          <div class="text-xs text-gray-500 mb-1 mt-2">\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0439 \u0434\u0432\u0435\u0440\u0438_${i + 1} (\u0441\u043C):</div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0428\u0438\u0440:</label>
              <input type="number" value="${balW}" min="60" max="400"
                     class="area-input text-xs" data-field="balconyWidth_${i}"
                     onchange="updateBalconySize('${roomId}', ${i}, 'width', this.value)"
                     oninput="updateBalconySize('${roomId}', ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0412\u044B\u0441:</label>
              <input type="number" value="${balH}" min="150" max="350"
                     class="area-input text-xs" data-field="balconyHeight_${i}"
                     onchange="updateBalconySize('${roomId}', ${i}, 'height', this.value)"
                     oninput="updateBalconySize('${roomId}', ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'balcony')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="balconyIcon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u0411\u0430\u043B\u043A\u043E\u043D\u043D\u0430\u044F \u0434\u0432\u0435\u0440\u044C</span>
          </div>
          <div id="balconyGroup_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'balcony', -1)">\u2212</button>
                <input type="number" value="${data.balcony}" min="0" max="5"
                       class="qty-input" data-field="balcony" onchange="updateRoomData('${roomId}', 'balcony', this.value)">
                <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'balcony', 1)">+</button>
              </div>
              <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
            </div>
            ${balconySizeInputs}
          </div>
        </div>`;
    }
    
    function resetRoomDataOnTypeChange() {
      const buildingType = document.getElementById('detailedBuildingType')?.value || 'apartment';
      resetAllRoomTypeCatalogsToDefault();
      
      roomData = {
        living: {
          area: 0,
          wallsArea: 0,
          livingRoomCount: 0,
          livingRooms: [],
          floorCount: 1,
          floors: [{ floorNumber: 1, location: 'above_ground', livingRooms: [] }]
        },
        nonliving: {
          area: 0,
          wallsArea: 0,
          livingRoomCount: 0,
          livingRooms: [],
          floorCount: 1,
          floors: [{ floorNumber: 1, location: 'above_ground', livingRooms: [] }]
        }
      };
      
      document.getElementById('totalAreaCalc').textContent = '0 м²';
      document.getElementById('totalWallsCalc').textContent = '0 \u043C\u00B2';
    }
    
    

    function calculateAndUpdateTotals() {
      syncAppStateToNamespace();
      updateDetailedCalc();
    }
    
    function showDetailedCalc() {
      console.log('showDetailedCalc called, priceData:', !!priceData);
      const section = document.getElementById('detailedCalc');
      console.log('section:', !!section);
      if (section) {
        section.classList.remove('hidden');
        section.style.display = 'block';
        console.log('Section shown');
      }
      
      if (!priceData) {
        console.log('Loading prices.json...');
        fetch('prices.json')
          .then(response => response.json())
          .then(data => {
            priceData = data;
            for (const [roomId, room] of Object.entries(priceData.rooms || {})) {
              if (room.room_types) {
                room.room_types = room.room_types.filter(type => !['Мансарда', 'Цокольное помещение', 'Подвал'].includes(type.name));
              }
            }
            syncAppStateToNamespace();
            initRoomData();
            renderRoomInputs();
            renderWorksByRoom();
            renderMaterialsByRoom();
            renderAdditionalServices();
            toggleSection('estimateDataSection', false);
            toggleSection('repairInfoSection', false);
            toggleSection('worksSection', false);
            toggleSection('materialsSection', false);
            toggleSection('additionalSection', false);
            toggleSection('whatToDoSection', false);
            updateDetailedCalc();
          })
          .catch(error => console.log('Error loading prices:', error));
      } else {
        if (Object.keys(roomData).length === 0) {
          initRoomData();
        }
        renderRoomInputs();
        renderWorksByRoom();
        renderMaterialsByRoom();
        renderAdditionalServices();
        toggleSection('estimateDataSection', false);
        toggleSection('repairInfoSection', false);
        toggleSection('worksSection', false);
        toggleSection('materialsSection', false);
        toggleSection('additionalSection', false);
        toggleSection('whatToDoSection', false);
        updateDetailedCalc();
      }
      
      setTimeout(() => {
        section.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    
    function hideDetailedCalc() {
      const section = document.getElementById('detailedCalc');
      section.classList.add('hidden');
      document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
    }
    
    function resetDetailedCalc() {
      roomData = {};
      initRoomData();
      itemQuantities = {};
      selectedItems = {works: {}, materials: {}, additional: {}};
      syncAppStateToNamespace();
      initDetailedCalculator();
      updateTotalAreas();
    }
    
    function openModalWithDetailedCalc() {
      try {
        const repairTypeSelect = document.getElementById('detailedRepairType');
        const repairType = repairTypeSelect ? repairTypeSelect.options[repairTypeSelect.selectedIndex].text : 'Бизнес';
        const total = document.getElementById('detailedGrandTotal').textContent;
        const metrics = getConfiguredDetailedRooms();
        
        let summary = `📐 Общая площадь: ${metrics.totalArea} м²\n`;
        summary += `🔧 Тип ремонта: ${repairType}\n\n`;
        summary += `💰 РАБОТЫ: ${document.getElementById('detailedWorksTotal').textContent}\n`;
        summary += `🧱 МАТЕРИАЛЫ: ${document.getElementById('detailedMaterialsTotal').textContent}\n`;
        summary += `➕ ДОП. УСЛУГИ: ${document.getElementById('detailedAdditionalTotal').textContent}\n`;
        summary += `━━━━━━━━━━━━━━━━━━━━\n`;
        summary += `💵 ИТОГО: ${total}`;
        
        document.getElementById('formCalcData').value = summary;
        document.getElementById('formService').value = repairType;
        openModal();
      } catch (e) {
        console.error('Error opening modal:', e);
        alert('Ошибка при открытии формы. Проверьте консоль.');
      }
    }
    
    document.addEventListener('DOMContentLoaded', () => {
      if (window.__smetaProPage) {
        return;
      }

      if (window.App && typeof window.App.init === 'function') {
        window.App.init();
      } else {
        loadPrices();
      }
    });
