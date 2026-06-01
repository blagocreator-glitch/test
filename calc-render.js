// Module: calc-render.js
    function getRoomOpeningSubsectionClass(data = {}, field = '') {
      const countMap = {
        doors: Number(data.doors || 0),
        windows: Number(data.windows || 0),
        balcony: Number(data.balcony || 0),
        arch: Number(data.archCount || 0)
      };
      const areaFilled = field === 'arch' && Array.isArray(data.archAreas) && data.archAreas.some(value => Number(value || 0) > 0);
      return countMap[field] > 0 || areaFilled ? 'is-filled' : '';
    }

    function getRoomCompositeCount(data = {}, fields = []) {
      return fields.filter(field => {
        if (field === 'arch') return getRoomOpeningSubsectionClass(data, 'arch');
        const countField = field.endsWith('Count') ? field : `${field}Count`;
        return Number(data[field] || data[countField] || 0) > 0;
      }).length;
    }

    function getRoomConstructionSubsectionClass(data = {}, field = '') {
      return Number(data[`${field}Count`] || 0) > 0 ? 'is-filled' : '';
    }

    function renderRoomCompositeBadge(count) {
      return count ? `${count} заполн.` : 'свернуто';
    }

    function refreshRoomCompositeHighlights(data = {}, refs = {}) {
      const openingFields = ['doors', 'windows', 'balcony', 'arch'];
      const constructionFields = ['niche', 'projection', 'column'];
      if (refs.openingsKey) {
        const openingsHead = document.querySelector(`[data-room-composite="${refs.openingsKey}"]`);
        const openingsBadge = openingsHead?.querySelector('[data-composite-count]');
        if (openingsBadge) openingsBadge.textContent = renderRoomCompositeBadge(openingFields.filter(field => getRoomOpeningSubsectionClass(data, field)).length);
        openingFields.forEach(field => {
          const section = document.querySelector(`[data-room-subsection="${refs.openingsKey}:${field}"]`);
          if (section) section.classList.toggle('is-filled', Boolean(getRoomOpeningSubsectionClass(data, field)));
        });
      }
      if (refs.constructionsKey) {
        const constructionsHead = document.querySelector(`[data-room-composite="${refs.constructionsKey}"]`);
        const constructionsBadge = constructionsHead?.querySelector('[data-composite-count]');
        if (constructionsBadge) constructionsBadge.textContent = renderRoomCompositeBadge(constructionFields.filter(field => getRoomConstructionSubsectionClass(data, field)).length);
        constructionFields.forEach(field => {
          const section = document.querySelector(`[data-room-subsection="${refs.constructionsKey}:${field}"]`);
          if (section) section.classList.toggle('is-filled', Boolean(getRoomConstructionSubsectionClass(data, field)));
        });
      }
    }

    function refreshAllRoomCompositeHighlights() {
      if (typeof roomData !== 'object' || !roomData) return;
      ['living', 'nonliving'].forEach(roomId => {
        const data = roomData[roomId];
        if (!data) return;
        refreshRoomCompositeHighlights(data, {
          openingsKey: `roomOpenings_${roomId}`
        });
        (data.livingRooms || []).forEach((room, index) => {
          refreshRoomCompositeHighlights(room, {
            openingsKey: `livingOpenings_${index}`,
            constructionsKey: `livingAdditional_${index}`
          });
        });
        (data.floors || []).forEach((floor, floorIndex) => {
          (floor.livingRooms || []).forEach((room, roomIndex) => {
            refreshRoomCompositeHighlights(room, {
              openingsKey: `floorOpenings_${floorIndex}_${roomIndex}`,
              constructionsKey: `floorConstructions_${floorIndex}_${roomIndex}`
            });
          });
        });
      });
    }

    if (!window.__roomCompositeRefreshBound) {
      window.__roomCompositeRefreshBound = true;
      document.addEventListener('input', event => {
        if (event.target?.closest?.('#roomInputs')) setTimeout(refreshAllRoomCompositeHighlights, 0);
      });
      document.addEventListener('click', event => {
        if (event.target?.closest?.('#roomInputs')) setTimeout(refreshAllRoomCompositeHighlights, 0);
      });
    }

    function renderRoomOpeningsShell(roomId, groupKey, data, content) {
      const filledCount = ['doors', 'windows', 'balcony', 'arch'].filter(field => getRoomOpeningSubsectionClass(data, field)).length;
      const summary = renderRoomCompositeBadge(filledCount);
      return `
        <div class="room-openings-shell mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div class="room-openings-head" data-room-composite="${groupKey}" onclick="toggleRoomFieldGroup('${roomId}', '${groupKey}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="${groupKey}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-semibold flex-1">Двери/Окна/проемы</span>
            <em data-composite-count>${summary}</em>
          </div>
          <div id="${groupKey}Group_${roomId}" style="display: none" class="room-openings-body">
            ${content}
          </div>
        </div>
      `;
    }

    function renderLivingRoomDoors(room, data, roomId, index) {
      if (room.has_windows === false) return '';
      const doorCount = Math.min(data.doors || 0, 5);
      let doorSizeInputs = '';
      for (let i = 0; i < doorCount; i++) {
        const doorW = data.doorWidths?.[i] || 80;
        const doorH = data.doorHeights?.[i] || 200;
        doorSizeInputs += `
          <div class="text-xs text-gray-500 mb-1 mt-2">\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0434\u0432\u0435\u0440\u0438_${i + 1} (\u0441\u043C):</div>
          <div class="opening-size-grid">
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0428\u0438\u0440\u0438\u043D\u0430:</label>
              <input type="number" value="${doorW}" min="50" max="120"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomDoorSize('${roomId}', ${index}, ${i}, 'width', this.value)"
                     oninput="updateLivingRoomDoorSize('${roomId}', ${index}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0412\u044B\u0441\u043E\u0442\u0430:</label>
              <input type="number" value="${doorH}" min="150" max="250"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomDoorSize('${roomId}', ${index}, ${i}, 'height', this.value)"
                     oninput="updateLivingRoomDoorSize('${roomId}', ${index}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="room-opening-subsection ${getRoomOpeningSubsectionClass(data, 'doors')}" data-room-subsection="livingOpenings_${index}:doors">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'livingDoors_${index}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="livingDoors_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u0414\u0432\u0435\u0440\u0438</span>
          </div>
          <div id="livingDoors_${index}Group_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-28">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E (\u0448\u0442.):</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'doors', -1)">\u2212</button>
                <input type="number" value="${data.doors}" min="0" max="5"
                       class="qty-input" onchange="updateLivingRoomData('${roomId}', ${index}, 'doors', this.value)">
                <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'doors', 1)">+</button>
              </div>
            </div>
            ${doorSizeInputs}
          </div>
        </div>`;
    }
    
    function renderLivingRoomWindows(room, data, roomId, index) {
      if (room.has_windows === false) return '';
      const windowCount = Math.min(data.windows || 0, 5);
      let windowSizeInputs = '';
      for (let i = 0; i < windowCount; i++) {
        const winW = data.windowWidths?.[i] || 130;
        const winH = data.windowHeights?.[i] || 140;
        windowSizeInputs += `
          <div class="text-xs text-gray-500 mb-1 mt-2">\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u043E\u043A\u043D\u0430_${i + 1} (\u0441\u043C):</div>
          <div class="opening-size-grid">
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0428\u0438\u0440\u0438\u043D\u0430:</label>
              <input type="number" value="${winW}" min="80" max="250"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomWindowSize('${roomId}', ${index}, ${i}, 'width', this.value)"
                     oninput="updateLivingRoomWindowSize('${roomId}', ${index}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0412\u044B\u0441\u043E\u0442\u0430:</label>
              <input type="number" value="${winH}" min="80" max="200"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomWindowSize('${roomId}', ${index}, ${i}, 'height', this.value)"
                     oninput="updateLivingRoomWindowSize('${roomId}', ${index}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="room-opening-subsection ${getRoomOpeningSubsectionClass(data, 'windows')}" data-room-subsection="livingOpenings_${index}:windows">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'livingWindows_${index}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="livingWindows_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u041E\u043A\u043D\u0430</span>
          </div>
          <div id="livingWindows_${index}Group_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-28">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E (\u0448\u0442.):</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'windows', -1)">\u2212</button>
                <input type="number" value="${data.windows}" min="0" max="5"
                       class="qty-input" onchange="updateLivingRoomData('${roomId}', ${index}, 'windows', this.value)">
                <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'windows', 1)">+</button>
              </div>
            </div>
            ${windowSizeInputs}
          </div>
        </div>`;
    }
    
    function renderLivingRoomBalcony(room, data, roomId, index) {
      if (!room.has_balcony) return '';
      const balconyCount = Math.min(data.balcony || 0, 5);
      let balconySizeInputs = '';
      for (let i = 0; i < balconyCount; i++) {
        const balW = data.balconyWidths?.[i] || 80;
        const balH = data.balconyHeights?.[i] || 250;
        balconySizeInputs += `
          <div class="text-xs text-gray-500 mb-1 mt-2">\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0439 \u0434\u0432\u0435\u0440\u0438_${i + 1} (\u0441\u043C):</div>
          <div class="opening-size-grid">
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0428\u0438\u0440\u0438\u043D\u0430:</label>
              <input type="number" value="${balW}" min="60" max="400"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomBalconySize('${roomId}', ${index}, ${i}, 'width', this.value)"
                     oninput="updateLivingRoomBalconySize('${roomId}', ${index}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0412\u044B\u0441\u043E\u0442\u0430:</label>
              <input type="number" value="${balH}" min="150" max="350"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomBalconySize('${roomId}', ${index}, ${i}, 'height', this.value)"
                     oninput="updateLivingRoomBalconySize('${roomId}', ${index}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="room-opening-subsection ${getRoomOpeningSubsectionClass(data, 'balcony')}" data-room-subsection="livingOpenings_${index}:balcony">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'livingBalcony_${index}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="livingBalcony_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u0411\u0430\u043B\u043A\u043E\u043D\u043D\u0430\u044F \u0434\u0432\u0435\u0440\u044C</span>
          </div>
          <div id="livingBalcony_${index}Group_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-24">\u041A\u043E\u043B-\u0432\u043E (\u0448\u0442.):</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'balcony', -1)">\u2212</button>
                <input type="number" value="${data.balcony}" min="0" max="5"
                       class="qty-input" onchange="updateLivingRoomData('${roomId}', ${index}, 'balcony', this.value)">
                <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'balcony', 1)">+</button>
              </div>
            </div>
            ${balconySizeInputs}
          </div>
        </div>`;
    }
    
    function changeLivingRoomField(roomId, index, field, delta) {
      const room = roomData[roomId];
      const roomInfo = priceData.rooms[roomId];
      if (!room || !room.livingRooms || !room.livingRooms[index]) {
        console.log('Room or living room not found:', roomId, index);
        return;
      }
      
      let maxVal = 5;
      if (field === 'nicheCount' || field === 'projectionCount' || field === 'columnCount') {
        maxVal = 15;
      }
      
      // Get current value from input field
      const inputEl = document.getElementById(field + '_input_' + roomId + '_' + index);
      let current = inputEl ? parseInt(inputEl.value) : (parseInt(room.livingRooms[index][field]) || 0);
      
      if (delta !== 0) {
        current = Math.max(0, Math.min(maxVal, current + delta));
        room.livingRooms[index][field] = current;
        if (inputEl) inputEl.value = current;
      }
      
      if (field === 'balcony') {
        const wallsArea = calculateLivingRoomWallsArea(room.livingRooms[index]);
        room.livingRooms[index].wallsArea = wallsArea;
        const wallsInput = document.querySelector(`#livingRoom_${index}Group_${roomId} input[data-field="wallsArea"]`);
        if (wallsInput) wallsInput.value = wallsArea;
        
        renderLivingRoomBalconyInputs(roomId, index);
        // Auto-expand balcony group when count > 0
        if (current > 0) {
          const balconyGroup = document.getElementById(`livingBalcony_${index}Group_${roomId}`);
          const balconyIcon = document.getElementById(`livingBalcony_${index}Icon_${roomId}`);
          if (balconyGroup) balconyGroup.style.display = 'block';
          if (balconyIcon) balconyIcon.style.transform = 'rotate(0deg)';
        }
      } else if (field === 'doors') {
        const wallsArea = calculateLivingRoomWallsArea(room.livingRooms[index]);
        room.livingRooms[index].wallsArea = wallsArea;
        const wallsInput = document.querySelector(`#livingRoom_${index}Group_${roomId} input[data-field="wallsArea"]`);
        if (wallsInput) wallsInput.value = wallsArea;
        
        renderLivingRoomDoorsInputs(roomId, index);
        // Auto-expand doors group when count > 0
        if (current > 0) {
          const doorsGroup = document.getElementById(`livingDoors_${index}Group_${roomId}`);
          const doorsIcon = document.getElementById(`livingDoors_${index}Icon_${roomId}`);
          if (doorsGroup) doorsGroup.style.display = 'block';
          if (doorsIcon) doorsIcon.style.transform = 'rotate(0deg)';
        }
      } else if (field === 'windows') {
        const wallsArea = calculateLivingRoomWallsArea(room.livingRooms[index]);
        room.livingRooms[index].wallsArea = wallsArea;
        const wallsInput = document.querySelector(`#livingRoom_${index}Group_${roomId} input[data-field="wallsArea"]`);
        if (wallsInput) wallsInput.value = wallsArea;
        
        renderLivingRoomWindowsInputs(roomId, index);
        // Auto-expand windows group when count > 0
        if (current > 0) {
          const windowsGroup = document.getElementById(`livingWindows_${index}Group_${roomId}`);
          const windowsIcon = document.getElementById(`livingWindows_${index}Icon_${roomId}`);
          if (windowsGroup) windowsGroup.style.display = 'block';
          if (windowsIcon) windowsIcon.style.transform = 'rotate(0deg)';
        }
      } else if (field === 'archCount') {
        const wallsArea = calculateLivingRoomWallsArea(room.livingRooms[index]);
        room.livingRooms[index].wallsArea = wallsArea;
        const wallsInput = document.querySelector(`#livingRoom_${index}Group_${roomId} input[data-field="wallsArea"]`);
        if (wallsInput) wallsInput.value = wallsArea;
        
        renderLivingRoomArchInputs(roomId, index);
        // Auto-expand arch group when count > 0
        if (current > 0) {
          const archGroup = document.getElementById(`livingArch_${index}Group_${roomId}`);
          const archIcon = document.getElementById(`livingArch_${index}Icon_${roomId}`);
          if (archGroup) archGroup.style.display = 'block';
          if (archIcon) archIcon.style.transform = 'rotate(0deg)';
        }
      } else if (field === 'nicheCount' || field === 'projectionCount' || field === 'columnCount') {
        const wallsArea = calculateLivingRoomWallsArea(room.livingRooms[index]);
        room.livingRooms[index].wallsArea = wallsArea;
        const wallsInput = document.querySelector(`#livingRoom_${index}Group_${roomId} input[data-field="wallsArea"]`);
        if (wallsInput) wallsInput.value = wallsArea;
        
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
        
        if (current > 0) {
          if (subgroup) subgroup.style.display = 'block';
          if (icon) icon.style.transform = 'rotate(0deg)';
          
          // Build area inputs HTML
          let areaInputsHtml = '';
          const areas = room.livingRooms[index][areaFieldName] || [];
          for (let i = 0; i < current; i++) {
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
        
        updateTotalAreas();
        updateWorksMaterialsDisplay();
        updateDetailedCalc();
        updateLivingRoomsTotal(roomId);
        return;
      }
      
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
      updateLivingRoomsTotal(roomId);
    }
    
    function renderLivingRoomBalconyInputs(roomId, index) {
      const room = priceData.rooms[roomId];
      const data = roomData[roomId].livingRooms[index];
      const group = document.getElementById(`livingBalcony_${index}Group_${roomId}`);
      if (!group) return;
      
      const balconyCount = Math.min(data.balcony || 0, 5);
      let balconySizeInputs = '';
      for (let i = 0; i < balconyCount; i++) {
        const balW = data.balconyWidths?.[i] || 80;
        const balH = data.balconyHeights?.[i] || 250;
        balconySizeInputs += `
          <div class="text-xs text-gray-500 mb-1 mt-2">\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0439 \u0434\u0432\u0435\u0440\u0438_${i + 1} (\u0441\u043C):</div>
          <div class="opening-size-grid">
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0428\u0438\u0440\u0438\u043D\u0430:</label>
              <input type="number" value="${balW}" min="60" max="400"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomBalconySize('${roomId}', ${index}, ${i}, 'width', this.value)"
                     oninput="updateLivingRoomBalconySize('${roomId}', ${index}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0412\u044B\u0441\u043E\u0442\u0430:</label>
              <input type="number" value="${balH}" min="150" max="350"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomBalconySize('${roomId}', ${index}, ${i}, 'height', this.value)"
                     oninput="updateLivingRoomBalconySize('${roomId}', ${index}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      group.innerHTML = `
        <div class="area-input-group">
          <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
          <div class="qty-controls">
            <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'balcony', -1)">\u2212</button>
            <input type="number" value="${data.balcony}" min="0" max="5"
                   class="qty-input" onchange="updateLivingRoomData('${roomId}', ${index}, 'balcony', this.value)">
            <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'balcony', 1)">+</button>
          </div>
          <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
        </div>
        ${balconySizeInputs}`;
    }
    
    function renderLivingRoomDoorsInputs(roomId, index) {
      const room = priceData.rooms[roomId];
      const data = roomData[roomId].livingRooms[index];
      const group = document.getElementById(`livingDoors_${index}Group_${roomId}`);
      if (!group) return;
      
      const doorCount = Math.min(data.doors || 0, 5);
      let doorSizeInputs = '';
      for (let i = 0; i < doorCount; i++) {
        const doorW = data.doorWidths?.[i] || 80;
        const doorH = data.doorHeights?.[i] || 200;
        doorSizeInputs += `
          <div class="text-xs text-gray-500 mb-1 mt-2">\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0434\u0432\u0435\u0440\u0438_${i + 1} (\u0441\u043C):</div>
          <div class="opening-size-grid">
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0428\u0438\u0440\u0438\u043D\u0430:</label>
              <input type="number" value="${doorW}" min="40" max="200"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomDoorSize('${roomId}', ${index}, ${i}, 'width', this.value)"
                     oninput="updateLivingRoomDoorSize('${roomId}', ${index}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0412\u044B\u0441\u043E\u0442\u0430:</label>
              <input type="number" value="${doorH}" min="100" max="300"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomDoorSize('${roomId}', ${index}, ${i}, 'height', this.value)"
                     oninput="updateLivingRoomDoorSize('${roomId}', ${index}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      group.innerHTML = `
        <div class="area-input-group">
          <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
          <div class="qty-controls">
            <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'doors', -1)">\u2212</button>
            <input type="number" value="${data.doors}" min="0" max="5"
                   class="qty-input" onchange="updateLivingRoomData('${roomId}', ${index}, 'doors', this.value)">
            <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'doors', 1)">+</button>
          </div>
          <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
        </div>
        ${doorSizeInputs}`;
      
      // Auto-expand doors group when count > 0
      if (doorCount > 0) {
        const doorsGroup = document.getElementById(`livingDoors_${index}Group_${roomId}`);
        const doorsIcon = document.getElementById(`livingDoors_${index}Icon_${roomId}`);
        if (doorsGroup) doorsGroup.style.display = 'block';
        if (doorsIcon) doorsIcon.style.transform = 'rotate(0deg)';
      }
    }
    
    function renderLivingRoomArchInputs(roomId, index) {
      const room = priceData.rooms[roomId];
      const data = roomData[roomId].livingRooms[index];
      const group = document.getElementById(`livingArch_${index}Group_${roomId}`);
      if (!group) return;
      
      const archCount = Math.min(data.archCount || 0, 5);
      let archAreaInputs = '';
      for (let i = 0; i < archCount; i++) {
        const archArea = data.archAreas?.[i] || 0;
        archAreaInputs += `
          <div class="area-input-group mt-2">
            <label class="text-xs text-gray-500 w-32">\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0430\u0440\u043A\u0438/\u043F\u0440\u043E\u0435\u043C\u0430_${i + 1}:</label>
            <input type="number" value="${parseFloat(archArea).toFixed(2)}" min="0" max="20"
                   step="0.01" class="area-input" style="width: 80px"
                   onchange="updateLivingRoomArchArea('${roomId}', ${index}, ${i}, this.value)"
                   oninput="updateLivingRoomArchArea('${roomId}', ${index}, ${i}, this.value)">
            <span class="text-xs text-gray-500">\u043C\u00B2</span>
          </div>`;
      }
      group.innerHTML = `
        <div class="area-input-group">
          <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
          <div class="qty-controls">
            <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'archCount', -1)">\u2212</button>
            <input type="number" value="${data.archCount || 0}" min="0" max="5"
                   class="qty-input" onchange="updateLivingRoomData('${roomId}', ${index}, 'archCount', this.value)">
            <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'archCount', 1)">+</button>
          </div>
          <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
        </div>
        ${archAreaInputs}`;
      
      if (archCount > 0) {
        const archGroup = document.getElementById(`livingArch_${index}Group_${roomId}`);
        const archIcon = document.getElementById(`livingArch_${index}Icon_${roomId}`);
        if (archGroup) archGroup.style.display = 'block';
        if (archIcon) archIcon.style.transform = 'rotate(0deg)';
      }
    }

    function renderLivingRoomArchs(roomId, data, index) {
      const archCount = Math.min(data.archCount || 0, 5);
      let archAreaInputs = '';
      for (let i = 0; i < archCount; i++) {
        const archArea = data.archAreas?.[i] || 0;
        archAreaInputs += `
          <div class="area-input-group mt-2">
            <label class="text-xs text-gray-500 w-32">Площадь арки/проема_${i + 1}:</label>
            <input type="number" value="${parseFloat(archArea).toFixed(2)}" min="0" max="20"
                   step="0.01" class="area-input" style="width: 80px"
                   onchange="updateLivingRoomArchArea('${roomId}', ${index}, ${i}, this.value)"
                   oninput="updateLivingRoomArchArea('${roomId}', ${index}, ${i}, this.value)">
            <span class="text-xs text-gray-500">м²</span>
          </div>`;
      }
      return `
        <div class="room-opening-subsection ${getRoomOpeningSubsectionClass(data, 'arch')}" data-room-subsection="livingOpenings_${index}:arch">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'livingArch_${index}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="livingArch_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">Арки/проемы</span>
          </div>
          <div id="livingArch_${index}Group_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-16">Кол-во:</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'archCount', -1)">−</button>
                <input type="number" value="${data.archCount || 0}" min="0" max="5"
                       class="qty-input" onchange="updateLivingRoomData('${roomId}', ${index}, 'archCount', this.value)">
                <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'archCount', 1)">+</button>
              </div>
              <span class="text-xs text-gray-500 ml-1">шт</span>
            </div>
            ${archAreaInputs}
          </div>
        </div>`;
    }

    function renderLivingRoomOpeningsGroup(room, data, roomId, index) {
      return renderRoomOpeningsShell(roomId, `livingOpenings_${index}`, data, `
        ${renderLivingRoomDoors(room, data, roomId, index)}
        ${renderLivingRoomWindows(room, data, roomId, index)}
        ${renderLivingRoomBalcony(room, data, roomId, index)}
        ${renderLivingRoomArchs(roomId, data, index)}
      `);
    }
    
    function updateLivingRoomArchArea(roomId, index, archIndex, value) {
      const val = parseFloat(value);
      if (isNaN(val)) return;
      
      if (!roomData[roomId].livingRooms[index].archAreas) {
        roomData[roomId].livingRooms[index].archAreas = [0, 0, 0, 0, 0];
      }
      
      roomData[roomId].livingRooms[index].archAreas[archIndex] = val;
      
      const wallsArea = calculateLivingRoomWallsArea(roomData[roomId].livingRooms[index]);
      roomData[roomId].livingRooms[index].wallsArea = wallsArea;
      const wallsInput = document.querySelector(`#livingRoom_${index}Group_${roomId} input[data-field="wallsArea"]`);
      if (wallsInput) wallsInput.value = wallsArea;
      
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
    }
    
    function renderNicheAreaInputs(roomId, index, count) {
      const group = document.getElementById('livingNiche_' + index + 'Group_' + roomId);
      if (!group) return;
      
      const data = roomData[roomId].livingRooms[index];
      const areas = data.nicheAreas || [];
      
      let html = '<div class="area-input-group"><label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label><div class="qty-controls"><button type="button" class="qty-btn" onclick="var el = this.nextElementSibling; var newVal = Math.max(0, parseInt(el.value) - 1); el.value = newVal; roomData[\'' + roomId + '\'].livingRooms[' + index + '].nicheCount = newVal; renderNicheAreaInputs(\'' + roomId + '\', ' + index + ', newVal)">\u2212</button><input type="number" id="nicheCount_input_' + roomId + '_' + index + '" value="' + (data.nicheCount || 0) + '" min="0" max="15" class="qty-input" data-field="nicheCount"><button type="button" class="qty-btn" onclick="var el = this.previousElementSibling; var newVal = Math.min(15, parseInt(el.value) + 1); el.value = newVal; roomData[\'' + roomId + '\'].livingRooms[' + index + '].nicheCount = newVal; renderNicheAreaInputs(\'' + roomId + '\', ' + index + ', newVal)">+</button></div><span class="text-xs text-gray-500 ml-1">\u0448\u0442</span></div>';
      
      for (let i = 0; i < count; i++) {
        const areaVal = areas[i] || 0;
        html += '<div class="area-input-group mt-1"><label class="text-xs text-gray-500 w-28">\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043D\u0438\u0448\u0438_' + (i+1) + ':</label><input type="number" value="' + parseFloat(areaVal).toFixed(2) + '" min="0" max="50" step="0.01" class="area-input" style="width: 70px" onchange="updateLivingRoomNicheArea(\'' + roomId + '\', ' + index + ', ' + i + ', this.value)" oninput="updateLivingRoomNicheArea(\'' + roomId + '\', ' + index + ', ' + i + ', this.value)"><span class="text-xs text-gray-500">\u043C\u00B2</span></div>';
      }
      
      group.innerHTML = html;
      
      // Update walls area
      const wallsArea = calculateLivingRoomWallsArea(data);
      data.wallsArea = wallsArea;
      const wallsInput = document.querySelector('#livingRoom_' + index + 'Group_' + roomId + ' input[data-field="wallsArea"]');
      if (wallsInput) wallsInput.value = wallsArea;
      
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
      updateLivingRoomsTotal(roomId);
    }
    
    function updateLivingRoomNicheArea(roomId, index, nicheIndex, value) {
      const val = parseFloat(value);
      if (isNaN(val)) return;
      
      if (!roomData[roomId].livingRooms[index].nicheAreas) {
        roomData[roomId].livingRooms[index].nicheAreas = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      }
      
      roomData[roomId].livingRooms[index].nicheAreas[nicheIndex] = val;
      
      const wallsArea = calculateLivingRoomWallsArea(roomData[roomId].livingRooms[index]);
      roomData[roomId].livingRooms[index].wallsArea = wallsArea;
      const wallsInput = document.querySelector(`#livingRoom_${index}Group_${roomId} input[data-field="wallsArea"]`);
      if (wallsInput) wallsInput.value = wallsArea;
      
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
    }
    
    function renderProjectionAreaInputs(roomId, index, count) {
      const group = document.getElementById('livingProjection_' + index + 'Group_' + roomId);
      if (!group) return;
      
      const data = roomData[roomId].livingRooms[index];
      const areas = data.projectionAreas || [];
      
      let html = '<div class="area-input-group"><label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label><div class="qty-controls"><button type="button" class="qty-btn" onclick="var el = this.nextElementSibling; var newVal = Math.max(0, parseInt(el.value || 0) - 1); el.value = newVal; roomData[\'' + roomId + '\'].livingRooms[' + index + '].projectionCount = newVal; renderProjectionAreaInputs(\'' + roomId + '\', ' + index + ', newVal); updateTotalAreas();">\u2212</button><input type="number" id="projectionCount_input_' + roomId + '_' + index + '" value="' + (data.projectionCount || 0) + '" min="0" max="15" class="qty-input" data-field="projectionCount"><button type="button" class="qty-btn" onclick="var el = this.previousElementSibling; var newVal = Math.min(15, parseInt(el.value || 0) + 1); el.value = newVal; roomData[\'' + roomId + '\'].livingRooms[' + index + '].projectionCount = newVal; renderProjectionAreaInputs(\'' + roomId + '\', ' + index + ', newVal); updateTotalAreas();">+</button></div><span class="text-xs text-gray-500 ml-1">\u0448\u0442</span></div>';
      
      for (let i = 0; i < count; i++) {
        const areaVal = areas[i] || 0;
        html += '<div class="area-input-group mt-1"><label class="text-xs text-gray-500 w-28">\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0432\u044B\u0441\u0442\u0443\u043F\u0430_' + (i+1) + ':</label><input type="number" value="' + parseFloat(areaVal).toFixed(2) + '" min="0" max="50" step="0.01" class="area-input" style="width: 70px" onchange="updateLivingRoomProjectionArea(\'' + roomId + '\', ' + index + ', ' + i + ', this.value)" oninput="updateLivingRoomProjectionArea(\'' + roomId + '\', ' + index + ', ' + i + ', this.value)"><span class="text-xs text-gray-500">\u043C\u00B2</span></div>';
      }
      
      group.innerHTML = html;
      
      const wallsArea = calculateLivingRoomWallsArea(data);
      data.wallsArea = wallsArea;
      const wallsInput = document.querySelector('#livingRoom_' + index + 'Group_' + roomId + ' input[data-field="wallsArea"]');
      if (wallsInput) wallsInput.value = wallsArea;
      
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
      updateLivingRoomsTotal(roomId);
    }
    
    function updateLivingRoomProjectionArea(roomId, index, projIndex, value) {
      const val = parseFloat(value);
      if (isNaN(val)) return;
      
      if (!roomData[roomId].livingRooms[index].projectionAreas) {
        roomData[roomId].livingRooms[index].projectionAreas = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      }
      
      roomData[roomId].livingRooms[index].projectionAreas[projIndex] = val;
      
      const wallsArea = calculateLivingRoomWallsArea(roomData[roomId].livingRooms[index]);
      roomData[roomId].livingRooms[index].wallsArea = wallsArea;
      const wallsInput = document.querySelector(`#livingRoom_${index}Group_${roomId} input[data-field="wallsArea"]`);
      if (wallsInput) wallsInput.value = wallsArea;
      
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
    }
    
    function renderColumnAreaInputs(roomId, index, count) {
      const group = document.getElementById('livingColumn_' + index + 'Group_' + roomId);
      if (!group) return;
      
      const data = roomData[roomId].livingRooms[index];
      const areas = data.columnAreas || [];
      
      let html = '<div class="area-input-group"><label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label><div class="qty-controls"><button type="button" class="qty-btn" onclick="var el = this.nextElementSibling; var newVal = Math.max(0, parseInt(el.value || 0) - 1); el.value = newVal; roomData[\'' + roomId + '\'].livingRooms[' + index + '].columnCount = newVal; renderColumnAreaInputs(\'' + roomId + '\', ' + index + ', newVal); updateTotalAreas();">\u2212</button><input type="number" id="columnCount_input_' + roomId + '_' + index + '" value="' + (data.columnCount || 0) + '" min="0" max="15" class="qty-input" data-field="columnCount"><button type="button" class="qty-btn" onclick="var el = this.previousElementSibling; var newVal = Math.min(15, parseInt(el.value || 0) + 1); el.value = newVal; roomData[\'' + roomId + '\'].livingRooms[' + index + '].columnCount = newVal; renderColumnAreaInputs(\'' + roomId + '\', ' + index + ', newVal); updateTotalAreas();">+</button></div><span class="text-xs text-gray-500 ml-1">\u0448\u0442</span></div>';
      
      for (let i = 0; i < count; i++) {
        const areaVal = areas[i] || 0;
        html += '<div class="area-input-group mt-1"><label class="text-xs text-gray-500 w-28">\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043A\u043E\u043B\u043E\u043D\u043D\u044B_' + (i+1) + ':</label><input type="number" value="' + parseFloat(areaVal).toFixed(2) + '" min="0" max="50" step="0.01" class="area-input" style="width: 70px" onchange="updateLivingRoomColumnArea(\'' + roomId + '\', ' + index + ', ' + i + ', this.value)" oninput="updateLivingRoomColumnArea(\'' + roomId + '\', ' + index + ', ' + i + ', this.value)"><span class="text-xs text-gray-500">\u043C\u00B2</span></div>';
      }
      
      group.innerHTML = html;
      
      const wallsArea = calculateLivingRoomWallsArea(data);
      data.wallsArea = wallsArea;
      const wallsInput = document.querySelector('#livingRoom_' + index + 'Group_' + roomId + ' input[data-field="wallsArea"]');
      if (wallsInput) wallsInput.value = wallsArea;
      
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
      updateLivingRoomsTotal(roomId);
    }
    
    function updateLivingRoomColumnArea(roomId, index, colIndex, value) {
      const val = parseFloat(value);
      if (isNaN(val)) return;
      
      if (!roomData[roomId].livingRooms[index].columnAreas) {
        roomData[roomId].livingRooms[index].columnAreas = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      }
      
      roomData[roomId].livingRooms[index].columnAreas[colIndex] = val;
      
      const wallsArea = calculateLivingRoomWallsArea(roomData[roomId].livingRooms[index]);
      roomData[roomId].livingRooms[index].wallsArea = wallsArea;
      const wallsInput = document.querySelector(`#livingRoom_${index}Group_${roomId} input[data-field="wallsArea"]`);
      if (wallsInput) wallsInput.value = wallsArea;
      
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
    }
    
    function renderLivingRoomWindowsInputs(roomId, index) {
      const room = priceData.rooms[roomId];
      const data = roomData[roomId].livingRooms[index];
      const group = document.getElementById(`livingWindows_${index}Group_${roomId}`);
      if (!group) return;
      
      const windowCount = Math.min(data.windows || 0, 5);
      let windowSizeInputs = '';
      for (let i = 0; i < windowCount; i++) {
        const winW = data.windowWidths?.[i] || 130;
        const winH = data.windowHeights?.[i] || 140;
        windowSizeInputs += `
          <div class="text-xs text-gray-500 mb-1 mt-2">\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u043E\u043A\u043D\u0430_${i + 1} (\u0441\u043C):</div>
          <div class="opening-size-grid">
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0428\u0438\u0440\u0438\u043D\u0430:</label>
              <input type="number" value="${winW}" min="30" max="400"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomWindowSize('${roomId}', ${index}, ${i}, 'width', this.value)"
                     oninput="updateLivingRoomWindowSize('${roomId}', ${index}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0412\u044B\u0441\u043E\u0442\u0430:</label>
              <input type="number" value="${winH}" min="30" max="400"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomWindowSize('${roomId}', ${index}, ${i}, 'height', this.value)"
                     oninput="updateLivingRoomWindowSize('${roomId}', ${index}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      group.innerHTML = `
        <div class="area-input-group">
          <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
          <div class="qty-controls">
            <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'windows', -1)">\u2212</button>
            <input type="number" value="${data.windows}" min="0" max="5"
                   class="qty-input" onchange="updateLivingRoomData('${roomId}', ${index}, 'windows', this.value)">
            <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'windows', 1)">+</button>
          </div>
          <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
        </div>
        ${windowSizeInputs}`;
      
      // Auto-expand windows group when count > 0
      if (windowCount > 0) {
        const windowsGroup = document.getElementById(`livingWindows_${index}Group_${roomId}`);
        const windowsIcon = document.getElementById(`livingWindows_${index}Icon_${roomId}`);
        if (windowsGroup) windowsGroup.style.display = 'block';
        if (windowsIcon) windowsIcon.style.transform = 'rotate(0deg)';
      }
    }
    
    function updateLivingRoomDoorSize(roomId, index, doorIndex, dimension, value) {
      const val = parseFloat(value);
      if (isNaN(val)) val = 80;
      
      if (!roomData[roomId].livingRooms[index].doorWidths) {
        roomData[roomId].livingRooms[index].doorWidths = [80, 80, 80, 80, 80];
        roomData[roomId].livingRooms[index].doorHeights = [200, 200, 200, 200, 200];
      }
      
      if (dimension === 'width') {
        roomData[roomId].livingRooms[index].doorWidths[doorIndex] = val;
      } else {
        roomData[roomId].livingRooms[index].doorHeights[doorIndex] = val;
      }
      
      const wallsArea = calculateLivingRoomWallsArea(roomData[roomId].livingRooms[index]);
      roomData[roomId].livingRooms[index].wallsArea = wallsArea;
      const wallsInput = document.querySelector(`#livingRoom_${index}Group_${roomId} input[data-field="wallsArea"]`);
      if (wallsInput) wallsInput.value = wallsArea;
      
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
    }
    
    function updateLivingRoomWindowSize(roomId, index, windowIndex, dimension, value) {
      const val = parseFloat(value);
      if (isNaN(val)) val = 140;
      
      if (!roomData[roomId].livingRooms[index].windowWidths) {
        roomData[roomId].livingRooms[index].windowWidths = [130, 130, 130, 130, 130];
        roomData[roomId].livingRooms[index].windowHeights = [140, 140, 140, 140, 140];
      }
      
      if (dimension === 'width') {
        roomData[roomId].livingRooms[index].windowWidths[windowIndex] = val;
      } else {
        roomData[roomId].livingRooms[index].windowHeights[windowIndex] = val;
      }
      
      const wallsArea = calculateLivingRoomWallsArea(roomData[roomId].livingRooms[index]);
      roomData[roomId].livingRooms[index].wallsArea = wallsArea;
      const wallsInput = document.querySelector(`#livingRoom_${index}Group_${roomId} input[data-field="wallsArea"]`);
      if (wallsInput) wallsInput.value = wallsArea.toFixed(2);
      
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
    }
    
    function updateLivingRoomBalconySize(roomId, index, balconyIndex, dimension, value) {
      const val = parseFloat(value);
      if (isNaN(val)) val = 80;
      
      if (!roomData[roomId].livingRooms[index].balconyWidths) {
        roomData[roomId].livingRooms[index].balconyWidths = [80, 80, 80, 80, 80];
        roomData[roomId].livingRooms[index].balconyHeights = [250, 250, 250, 250, 250];
      }
      
      if (dimension === 'width') {
        roomData[roomId].livingRooms[index].balconyWidths[balconyIndex] = val;
      } else {
        roomData[roomId].livingRooms[index].balconyHeights[balconyIndex] = val;
      }
      
      const wallsArea = calculateLivingRoomWallsArea(roomData[roomId].livingRooms[index]);
      roomData[roomId].livingRooms[index].wallsArea = wallsArea;
      const wallsInput = document.querySelector(`#livingRoom_${index}Group_${roomId} input[data-field="wallsArea"]`);
      if (wallsInput) wallsInput.value = wallsArea.toFixed(2);
      
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
    }
    
    function changeLivingRoomCount(roomId, delta) {
      const input = document.querySelector(`#roomContent_${roomId} input[data-field="livingRoomCount"]`);
      if (!input) return;
      
      const maxCount = roomId === 'nonliving' ? 11 : 8;
      let current = parseInt(input.value) || 0;
      current = Math.max(0, Math.min(maxCount, current + delta));
      input.value = current;
      updateLivingRoomCount(roomId, current);
    }

    function getLivingRoomTypeDefaultAreas() {
      return {
        'Кухня': 10,
        'Душевая': 4,
        'Ванная': 4,
        'Санузел': 1.5,
        'Совмещенный С/У': 5,
        'Прихожая': 3,
        'Холл': 6,
        'Коридор': 2,
        'Гардеробная': 1.5,
        'Кладовая': 2,
        'Постирочная': 4,
        'Котельная': 6,
        'Гараж': 18,
        'Бассейн': 28,
        'SPA-зона': 12,
        'Сауна': 6,
        'Балкон': 1.2,
        'Лоджия': 2,
        'Терраса': 4,
        'Офис': 20,
        'Спальня': 20,
        'Детская': 15,
        'Гостиная': 25,
        'Кабинет': 15
      };
    }

    function getDefaultLivingRoomType(roomId, room, index = 0) {
      const buildingType = document.getElementById('detailedBuildingType')?.value || 'apartment';
      const catalog = Array.isArray(room?.room_types) ? room.room_types : [];
      if (roomId === 'nonliving' && buildingType === 'multi_floor') {
        const office = catalog.find(type => type.name === 'Офис');
        if (office) return office.name;
      }
      if (catalog.length) return catalog[index % catalog.length]?.name || catalog[0].name;
      return room?.default_room_type || (roomId === 'living' ? 'Спальня' : 'Кухня');
    }

    function openLivingRoomGroupAfterRender(roomId, index) {
      const group = document.getElementById(`livingRoom_${index}Group_${roomId}`);
      const icon = document.getElementById(`livingRoom_${index}Icon_${roomId}`);
      if (group) group.style.display = 'block';
      if (icon) icon.style.transform = 'rotate(0deg)';
      setTimeout(() => {
        document.getElementById(`livingRoom_${index}Group_${roomId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 40);
    }

    function openFloorRoomGroupAfterRender(roomId, floorIndex, roomIndex) {
      const floorGroup = document.getElementById(`floor_${floorIndex}Group_${roomId}`);
      const floorIcon = document.getElementById(`floor_${floorIndex}Icon_${roomId}`);
      const group = document.getElementById(`floorRoom_${floorIndex}_${roomIndex}Group_${roomId}`);
      const icon = document.getElementById(`floorRoom_${floorIndex}_${roomIndex}Icon_${roomId}`);
      if (floorGroup) floorGroup.style.display = 'block';
      if (floorIcon) floorIcon.style.transform = 'rotate(0deg)';
      if (group) group.style.display = 'block';
      if (icon) icon.style.transform = 'rotate(0deg)';
      setTimeout(() => {
        document.getElementById(`floorRoom_${floorIndex}_${roomIndex}Group_${roomId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 40);
    }
    
    function updateLivingRoomCount(roomId, value) {
      const val = parseInt(value) || 0;
      roomData[roomId].livingRoomCount = val;
      const previousCount = roomData[roomId].livingRooms.length;
      
      roomData[roomId].livingRooms = roomData[roomId].livingRooms.slice(0, val);
      
      // Clear demolition data when room count becomes 0
      if (val === 0 && roomData.demolitionData) {
        for (let i = 0; i < 8; i++) {
          const demoRoomId = 'demo_' + roomId + '_' + i;
          if (roomData.demolitionData[demoRoomId]) {
            roomData.demolitionData[demoRoomId] = { partitions: [], electrical: [], finishing: [] };
          }
        }
        // Clear header borders
        for (let i = 0; i < 8; i++) {
          const partitionsHeader = document.getElementById('demo_' + roomId + '_' + i + '_partitionsHeader');
          if (partitionsHeader) {
            partitionsHeader.classList.remove('border-2', 'border-green-500', 'rounded');
            partitionsHeader.style.paddingLeft = '';
            partitionsHeader.style.paddingRight = '';
          }
          const electricalHeader = document.getElementById('demo_' + roomId + '_' + i + '_electricalHeader');
          if (electricalHeader) {
            electricalHeader.classList.remove('border-2', 'border-green-500', 'rounded');
          }
          const finishingHeader = document.getElementById('demo_' + roomId + '_' + i + '_finishingHeader');
          if (finishingHeader) {
            finishingHeader.classList.remove('border-2', 'border-green-500', 'rounded');
          }
        }
      }
      
      const room = priceData.rooms[roomId];
      const roomTypeDefaultAreas = getLivingRoomTypeDefaultAreas();
      
      while (roomData[roomId].livingRooms.length < val) {
        const roomIndex = roomData[roomId].livingRooms.length;
        const defaultRoomType = getDefaultLivingRoomType(roomId, room, roomIndex);
        const newRoom = {
          area: 0,
          doors: 1,
          windows: 1,
          wallsArea: 0,
          doorWidths: [80, 80, 80, 80, 80],
          doorHeights: [200, 200, 200, 200, 200],
          windowWidths: [130, 130, 130, 130, 130],
          windowHeights: [140, 140, 140, 140, 140],
          balcony: 0,
          balconyWidths: [80, 80, 80, 80, 80],
          balconyHeights: [250, 250, 250, 250, 250],
          roomType: defaultRoomType,
          ceiling: 3,
          ceilingArea: 0,
          roomLength: 0,
          roomWidth: 0,
          roomPerimeter: 0,
          areaCalcMode: '',
          useDimensions: false,
          floorAreaManual: false,
          wallsAreaManual: false,
          ceilingAreaManual: false,
          archCount: 0,
          archAreas: [0, 0, 0, 0, 0],
          materialCoefficient: 1.1,
          nicheCount: 0,
          nicheAreas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          projectionCount: 0,
          projectionAreas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          columnCount: 0,
          columnAreas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        };
        roomData[roomId].livingRooms.push(newRoom);
      }
      
      // Save open groups state before re-render
      const openGroups = [];
      const maxRooms = roomId === 'nonliving' ? 11 : 8;
      for (let i = 0; i < maxRooms; i++) {
        const group = document.getElementById(`livingRoom_${i}Group_${roomId}`);
        const icon = document.getElementById(`livingRoom_${i}Icon_${roomId}`);
        if (group && group.style.display !== 'none') {
          openGroups.push(i);
        }
      }
      
      // Render the living room groups
      const container = document.getElementById(`livingRoomsContainer_${roomId}`);
      if (container) {
        const room = priceData.rooms[roomId];
        let html = '';
        for (let i = 0; i < val; i++) {
          html += renderLivingRoomGroup(room, roomId, i);
        }
        container.innerHTML = html;
      }
      
      // Restore open groups state
      openGroups.forEach(i => {
        const group = document.getElementById(`livingRoom_${i}Group_${roomId}`);
        const icon = document.getElementById(`livingRoom_${i}Icon_${roomId}`);
        if (group) group.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(0deg)';
      });
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
      updateLivingRoomsTotal(roomId);
    }
    
    function changeFloorCount(roomId, delta) {
      const input = document.getElementById('floorCount_' + roomId);
      if (!input) return;
      
      let current = parseInt(input.value) || 0;
      current = Math.max(1, Math.min(30, current + delta));
      input.value = current;
      updateFloorCount(roomId, current);
    }
    
    function updateFloorCount(roomId, value) {
      const val = Math.max(1, Math.min(30, parseInt(value, 10) || 1));
      if (!roomData[roomId]) roomData[roomId] = {};
      roomData[roomId].floorCount = val;
      
      if (!roomData[roomId].floors) roomData[roomId].floors = [];
      roomData[roomId].floors = roomData[roomId].floors.slice(0, val);
      
      const buildingType = document.getElementById('detailedBuildingType')?.value || 'apartment';
      const isNonliving = roomId === 'nonliving';
      
      while (roomData[roomId].floors.length < val) {
        roomData[roomId].floors.push({
          floorNumber: roomData[roomId].floors.length + 1,
          location: 'above_ground',
          livingRooms: []
        });
      }
      roomData[roomId].floors.forEach(floor => {
        floor.location = floor.location || 'above_ground';
      });
      
      renderFloors(roomId);
      
      updateTotalAreas();
      updateDetailedCalc();
    }
    
    function renderFloors(roomId) {
      const container = document.getElementById('floorsContainer_' + roomId);
      if (!container) return;
      
      const data = roomData[roomId];
      const floors = data.floors || [];
      const room = priceData.rooms[roomId];
      const isNonliving = roomId === 'nonliving';
      const roomLabel = isNonliving ? '\u041D\u0435\u0436\u0438\u043B\u043E\u0435' : '\u0416\u0438\u043B\u043E\u0435';
      
      let html = '';
      floors.forEach((floor, floorIndex) => {
        const floorNum = floorIndex + 1;
        html += `
          <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'floor_${floorIndex}')">
              <i class="fas fa-chevron-down text-xs transition-transform" id="floor_${floorIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
              <span class="text-sm font-bold text-brand-500">${roomLabel} - \u042D\u0442\u0430\u0436 ${floorNum}</span>
            </div>
            <div id="floor_${floorIndex}Group_${roomId}" style="display: none" class="mt-2">
              <span class="text-xs text-gray-400">\u041A\u043E\u043C\u043D\u0430\u0442\u044B, \u0442\u0440\u0435\u0431\u0443\u044E\u0449\u0438\u0435 \u0440\u0435\u043C\u043E\u043D\u0442\u0430</span>
              <div class="area-input-group mt-1">
                <label class="text-sm text-gray-500 w-40 font-bold">${isNonliving ? '\u041D\u0435\u0436\u0438\u043B\u044B\u0435 \u043A\u043E\u043C\u043D\u0430\u0442\u044B:' : '\u0416\u0438\u043B\u044B\u0435 \u043A\u043E\u043C\u043D\u0430\u0442\u044B:'}</label>
                <div class="qty-controls">
                  <button type="button" class="qty-btn" onclick="changeFloorRoomCount('${roomId}', ${floorIndex}, -1)">\u2212</button>
                  <input type="number" id="floorRoomCount_${roomId}_${floorIndex}" value="${floor.livingRooms?.length || 0}" min="0" max="30"
                         class="qty-input" onchange="updateFloorRoomCount('${roomId}', ${floorIndex}, this.value)">
                  <button type="button" class="qty-btn" onclick="changeFloorRoomCount('${roomId}', ${floorIndex}, 1)">+</button>
                </div>
                <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
              </div>
              <div id="floorRoomsContainer_${roomId}_${floorIndex}"></div>
            </div>
          </div>`;
      });
      
      container.innerHTML = html;
      
      floors.forEach((floor, floorIndex) => {
        renderFloorRooms(roomId, floorIndex);
      });
    }
    
    function changeFloorRoomCount(roomId, floorIndex, delta) {
      const input = document.getElementById('floorRoomCount_' + roomId + '_' + floorIndex);
      if (!input) return;
      
      let current = parseInt(input.value) || 0;
      current = Math.max(0, Math.min(30, current + delta));
      input.value = current;
      updateFloorRoomCount(roomId, floorIndex, current);
    }

    function getPremiseBuildingSubtype() {
      return document.getElementById('buildingSubtype')?.value || '';
    }

    function getPremiseBuildingType() {
      return document.getElementById('buildingType')?.value || '';
    }

    function getPremiseAppointmentOptions() {
      const buildingType = getPremiseBuildingType();
      const buildingSubtype = getPremiseBuildingSubtype();
      if (buildingType === 'business' && Array.isArray(buildingAppointments?.[buildingSubtype])) {
        return [{ value: 'commercial', label: 'Коммерческое помещение' }];
      }
      return Array.isArray(buildingAppointments?.[buildingSubtype]) ? buildingAppointments[buildingSubtype] : [];
    }

    function getPremiseSubOptions(appointment) {
      const buildingType = getPremiseBuildingType();
      const buildingSubtype = getPremiseBuildingSubtype();
      if (buildingType === 'business' && appointment === 'commercial' && Array.isArray(buildingAppointments?.[buildingSubtype])) {
        return buildingAppointments[buildingSubtype];
      }
      return Array.isArray(buildingSubAppointments?.[appointment]) ? buildingSubAppointments[appointment] : [];
    }
    
    function updateFloorRoomCount(roomId, floorIndex, value) {
      const getPremiseGroupsFn = window.getFloorPremiseGroups || (typeof getFloorPremiseGroups === 'function' ? getFloorPremiseGroups : null);
      const createPremiseChamberFn = window.createPremiseChamber || (typeof createPremiseChamber === 'function' ? createPremiseChamber : null);
      const createDefaultFloorRoomFn = window.createDefaultFloorRoom || (typeof createDefaultFloorRoom === 'function' ? createDefaultFloorRoom : null);
      const val = Math.max(0, Math.min(30, parseInt(value, 10) || 0));
      if (!roomData[roomId]) roomData[roomId] = { floors: [] };
      if (!Array.isArray(roomData[roomId].floors)) roomData[roomId].floors = [];
      while (!roomData[roomId].floors[floorIndex]) {
        roomData[roomId].floors.push({ floorNumber: roomData[roomId].floors.length + 1, location: 'above_ground', livingRooms: [] });
      }
      roomData[roomId].floors[floorIndex].location = roomData[roomId].floors[floorIndex].location || 'above_ground';
      if (!roomData[roomId].floors[floorIndex].livingRooms) {
        roomData[roomId].floors[floorIndex].livingRooms = [];
      }
      const premiseGroups = getPremiseGroupsFn ? getPremiseGroupsFn(roomId, floorIndex) : [];
      const previousCount = premiseGroups.length || roomData[roomId].floors[floorIndex].livingRooms.length;
      if (premiseGroups.length) {
        const keepIds = new Set(premiseGroups.slice(0, val).map(group => group.id));
        roomData[roomId].floors[floorIndex].livingRooms = roomData[roomId].floors[floorIndex].livingRooms.filter(room => keepIds.has(room.premiseId));
      } else {
        roomData[roomId].floors[floorIndex].livingRooms = roomData[roomId].floors[floorIndex].livingRooms.slice(0, val);
      }
      
      // Clear demolition data when room count becomes 0
      if (val === 0 && roomData.demolitionData) {
        for (let roomIdx = 0; roomIdx < 10; roomIdx++) {
          const demoRoomId = roomId + '_' + floorIndex + '_' + roomIdx;
          if (roomData.demolitionData[demoRoomId]) {
            roomData.demolitionData[demoRoomId] = { partitions: [], electrical: [], finishing: [] };
          }
        }
        // Clear header borders
        for (let roomIdx = 0; roomIdx < 10; roomIdx++) {
          const headerEl = document.getElementById(roomId + '_' + floorIndex + '_' + roomIdx + '_partitionsHeader');
          if (headerEl) {
            headerEl.classList.remove('border-2', 'border-green-500', 'rounded');
            headerEl.style.paddingLeft = '';
            headerEl.style.paddingRight = '';
          }
        }
      }
      
      let premiseCount = getPremiseGroupsFn ? getPremiseGroupsFn(roomId, floorIndex).length : roomData[roomId].floors[floorIndex].livingRooms.length;
      while (premiseCount < val) {
        const premiseIndex = premiseCount;
        const newRoom = createDefaultFloorRoomFn
          ? (createPremiseChamberFn ? createPremiseChamberFn(floorIndex, premiseIndex, 0, '') : createDefaultFloorRoomFn(floorIndex, premiseIndex, ''))
          : {
              area: 0,
              doors: 1, windows: 1, wallsArea: 0,
              doorWidths: [80, 80, 80, 80, 80],
              doorHeights: [200, 200, 200, 200, 200],
              windowWidths: [130, 130, 130, 130, 130],
              windowHeights: [140, 140, 140, 140, 140],
              balcony: 0, balconyWidths: [80, 80, 80, 80, 80],
              balconyHeights: [250, 250, 250, 250, 250],
              roomType: '', ceiling: 3,
              ceilingArea: 0, roomLength: 0, roomWidth: 0, roomPerimeter: 0, areaCalcMode: '', useDimensions: false,
              floorAreaManual: false, wallsAreaManual: false, ceilingAreaManual: false,
              archCount: 0, archAreas: [0, 0, 0, 0, 0],
              materialCoefficient: 1.1,
              nicheCount: 0, nicheAreas: Array(15).fill(0),
              projectionCount: 0, projectionAreas: Array(15).fill(0),
              columnCount: 0, columnAreas: Array(15).fill(0),
              appointment: '',
              subAppointment: '',
              roomZone: '',
              location: typeof getObjectFloorLocation === 'function' ? getObjectFloorLocation(floorIndex) : (roomData[roomId].floors[floorIndex].location || 'above_ground')
            };
        newRoom.premiseId = `premise_f${Number(floorIndex) + 1}_${premiseIndex + 1}`;
        newRoom.premiseNumber = premiseIndex + 1;
        newRoom.chamberNumber = 1;
        newRoom.displayName = `Помещение ${premiseIndex + 1}`;
        newRoom.floorDisplayName = `Этажное помещение ${premiseIndex + 1}`;
        newRoom.chamberDisplayName = 'Комната 1';
        roomData[roomId].floors[floorIndex].livingRooms.push(newRoom);
        premiseCount += 1;
      }
      roomData[roomId].floors[floorIndex].livingRooms.forEach((room, index) => {
        if (!room.premiseId) {
          room.premiseId = `premise_f${Number(floorIndex) + 1}_${index + 1}`;
        }
      });
      
      renderFloorRooms(roomId, floorIndex);
      if (typeof refreshObjectFloorCounters === 'function') {
        refreshObjectFloorCounters(floorIndex);
      }
      updateTotalAreas();
      updateDetailedCalc();
    }
    
    function escapeRoomRepairHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function escapeRoomRepairJsString(value) {
      return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '')
        .replace(/\n/g, '\\n');
    }

    function formatRoomRepairMoney(value, zeroLabel = 'Будет рассчитано') {
      const amount = Number(value || 0);
      return amount > 0 ? `${Math.round(amount).toLocaleString('ru-RU')} ₽` : zeroLabel;
    }

    function getRoomRepairLocationLabel(value) {
      if (typeof getObjectFloorLocationLabel === 'function') return getObjectFloorLocationLabel(value || 'above_ground');
      const labels = {
        above_ground: 'Надземный этаж',
        ground_floor: 'Цокольный этаж',
        basement: 'Подвал',
        attic: 'Мансарда'
      };
      return labels[value] || labels.above_ground;
    }

    function getRoomRepairCalculationState(room = {}) {
      const calc = room.repairCalculation || {};
      const status = calc.status || 'none';
      const source = calc.source || '';
      const isCalculated = status === 'calculated' || status === 'needsUpdate';
      const sourceLabel = source === 'manual'
        ? 'Вручную'
        : (source === 'auto' || source === 'quest' ? 'Автоматом' : 'Не задан');
      const statusLabel = status === 'needsUpdate'
        ? 'Требует пересчета'
        : (isCalculated ? 'Ремонт рассчитан' : 'Не рассчитан');

      return { calc, status, source, isCalculated, sourceLabel, statusLabel };
    }

    function renderRoomRepairHeaderBadges(room) {
      const state = getRoomRepairCalculationState(room);
      if (!state.isCalculated) return '';
      return `
        <span class="room-repair-header-badges">
          <em class="room-repair-badge is-calculated">${state.statusLabel}</em>
          <em class="room-repair-badge ${state.source === 'manual' ? 'is-manual' : 'is-auto'}">${state.sourceLabel}</em>
        </span>
      `;
    }

    function normalizeRoomRepairSectionItems(items) {
      if (!Array.isArray(items)) return [];
      return items
        .map(item => {
          if (typeof item === 'string') return item;
          return item?.label || item?.name || item?.title || item?.type || item?.workId || '';
        })
        .filter(Boolean)
        .slice(0, 3);
    }

    function renderRoomRepairSectionLine(label, items, fallback) {
      const normalized = normalizeRoomRepairSectionItems(items);
      const text = normalized.length ? normalized.join(', ') : fallback;
      return `
        <div class="room-repair-scope-line">
          <span>${label}</span>
          <strong>${escapeRoomRepairHtml(text)}</strong>
        </div>
      `;
    }

    function renderRoomRepairMaterialProfileSummary(profile = {}, compact = false, displayTotal = null) {
      const lines = Array.isArray(profile.lines) ? profile.lines : [];
      if (!lines.length) {
        return compact ? '' : '<div class="room-repair-material-profile is-empty">Материалы будут рассчитаны после выбора покрытий и состава работ.</div>';
      }
      const total = Number.isFinite(Number(displayTotal)) ? Number(displayTotal) : profile.total;
      const shown = compact ? lines.slice(0, 3) : lines;
      const grouped = shown.reduce((acc, line) => {
        const key = line.areaKey || line.roomRepairSection || 'other';
        if (!acc[key]) acc[key] = [];
        acc[key].push(line);
        return acc;
      }, {});
      const groupOrder = ['floor', 'walls', 'ceiling', 'electrical', 'lighting', 'smartHome', 'climate', 'plumbing', 'openings', 'stairs', 'demolition', 'other'];
      const orderedGroupKeys = [
        ...groupOrder.filter(key => grouped[key]?.length),
        ...Object.keys(grouped).filter(key => !groupOrder.includes(key) && grouped[key]?.length)
      ];
      const groupLabels = {
        smartHome: 'Умный дом',
        openings: 'Проемы',
        stairs: 'Лестницы',
        other: 'Прочее'
      };
      const renderLine = line => `
        <div>
          <span>
            ${escapeRoomRepairHtml(line.label)}
            ${!compact && line.note ? `<small>${escapeRoomRepairHtml(line.note)}</small>` : ''}
          </span>
          <strong>${Number(line.qty || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${escapeRoomRepairHtml(line.unit || '')} · ${formatRoomRepairMoney(line.total)}</strong>
        </div>
      `;
      return `
        <div class="room-repair-material-profile">
          <div class="room-repair-material-profile-head">
            <span>Материалы по работам и покрытиям</span>
            <strong>${formatRoomRepairMoney(total)}</strong>
          </div>
          ${compact ? `
            <div class="room-repair-material-profile-list">
              ${shown.map(renderLine).join('')}
            </div>
          ` : `
            <div class="room-repair-material-profile-groups">
              ${orderedGroupKeys.map(key => `
                <section>
                  <h5>${escapeRoomRepairHtml(groupLabels[key] || getRoomRepairSectionLabel(key))}</h5>
                  <div class="room-repair-material-profile-list">
                    ${grouped[key].map(renderLine).join('')}
                  </div>
                </section>
              `).join('')}
            </div>
          `}
          ${compact && lines.length > shown.length ? `<small>Еще ${lines.length - shown.length} поз. материалов в расчете комнаты.</small>` : ''}
        </div>
      `;
    }

    function renderRoomRepairCalculationBlock(roomId, floorIndex, roomIndex, room) {
      const state = getRoomRepairCalculationState(room);
      const sections = state.calc.sections || {};
      const totals = state.calc.totals || {};
      const panelImpact = state.calc.panelImpact || {};
      const materialProfile = state.calc.materialProfile || {};
      const isCollapsed = !!room?.repairCalculationCollapsed;
      const bodyId = `roomRepairCalcBody_${roomId}_${floorIndex}_${roomIndex}`;
      const panelChips = [
        panelImpact.electricalPanel ? `Электрощит: ${panelImpact.socketGroups || 0} розет. гр. / ${panelImpact.lightGroups || 0} свет` : '',
        panelImpact.smartPanel ? `SMART-щит: ${panelImpact.smartPoints || 0} точ.` : ''
      ].filter(Boolean);
      const actionLabel = state.isCalculated
        ? (state.status === 'needsUpdate' ? 'Обновить расчет' : 'Скорректировать расчет')
        : 'Произвести расчет';
      const summaryText = state.isCalculated
        ? 'Компактный состав ремонта по комнате. Детальный состав можно скорректировать в редакторе.'
        : 'Расчет еще не выполнен. Можно запустить автоматический подбор или собрать состав вручную.';
      const hasAnySection = Object.values(sections).some(value => Array.isArray(value) && value.length);

      return `
        <div class="room-repair-calc-card ${isCollapsed ? 'is-collapsed' : ''}">
          <div class="room-repair-calc-head">
            <div>
              <div class="room-repair-calc-kicker">Рассчитать ремонт</div>
              <div class="room-repair-calc-title">${state.statusLabel}</div>
              <p>${summaryText}</p>
            </div>
            <div class="room-repair-calc-head-actions">
              <div class="room-repair-calc-status">
                <span>${state.sourceLabel}</span>
                <small>${state.calc.calculatedAt ? new Date(state.calc.calculatedAt).toLocaleDateString('ru-RU') : 'ожидает расчета'}</small>
              </div>
              <button type="button" class="room-repair-calc-toggle" onclick="toggleRoomRepairCalculationBlock('${roomId}', ${floorIndex}, ${roomIndex})" aria-expanded="${isCollapsed ? 'false' : 'true'}" aria-controls="${bodyId}" title="${isCollapsed ? 'Развернуть блок расчета ремонта' : 'Свернуть блок расчета ремонта'}">
                <i class="fas fa-chevron-${isCollapsed ? 'down' : 'up'}"></i>
              </button>
            </div>
          </div>

          <div class="room-repair-calc-body" id="${bodyId}" ${isCollapsed ? 'hidden' : ''}>
            <div class="room-repair-calc-totals">
              <div><span>Работы</span><strong>${formatRoomRepairMoney(totals.works)}</strong></div>
              <div><span>Материалы</span><strong>${formatRoomRepairMoney(totals.materials)}</strong></div>
              <div><span>Итого</span><strong>${formatRoomRepairMoney(totals.total)}</strong></div>
            </div>

            <div class="room-repair-scope-grid ${hasAnySection ? '' : 'is-empty'}">
              ${renderRoomRepairSectionLine('Демонтаж', sections.demolition, state.isCalculated ? 'Состав в смете' : 'Не выбран')}
              ${renderRoomRepairSectionLine('Пол', sections.floor, state.isCalculated ? 'По расчету комнаты' : 'Не выбран')}
              ${renderRoomRepairSectionLine('Стены', sections.walls, state.isCalculated ? 'По расчету комнаты' : 'Не выбран')}
              ${renderRoomRepairSectionLine('Потолок', sections.ceiling, state.isCalculated ? 'По расчету комнаты' : 'Не выбран')}
              ${renderRoomRepairSectionLine('Электрика', sections.electrical, state.isCalculated ? 'Учтена в расчете' : 'Не выбрана')}
              ${renderRoomRepairSectionLine('Свет / Smart', [
                ...(Array.isArray(sections.lighting) ? sections.lighting : []),
                ...(Array.isArray(sections.smartHome) ? sections.smartHome : [])
              ], state.isCalculated ? 'Учтено в расчете' : 'Не выбрано')}
            </div>

            ${panelChips.length ? `
              <div class="room-repair-panel-impact">
                <span><i class="fas fa-bolt"></i> Влияет на щиты</span>
                ${panelChips.map(chip => `<em>${escapeRoomRepairHtml(chip)}</em>`).join('')}
              </div>
            ` : ''}

            ${renderRoomRepairMaterialProfileSummary(materialProfile, true, totals.materials)}

            <div class="room-repair-calc-foot">
              <button type="button" class="room-repair-calc-action" onclick="openRoomRepairCalculationDraft('${roomId}', ${floorIndex}, ${roomIndex})">
                ${actionLabel}
              </button>
              ${state.isCalculated ? `
                <button type="button" class="room-repair-secondary-action room-repair-clear-action" onclick="clearRoomRepairCalculation('${roomId}', ${floorIndex}, ${roomIndex})">
                  Очистить расчет
                </button>
              ` : ''}
              ${state.status === 'needsUpdate' ? '<span class="room-repair-calc-warning">Параметры комнаты изменились после последнего расчета</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }

    function renderRoomRepairCalculationBlockSafe(roomId, floorIndex, roomIndex, room) {
      try {
        return renderRoomRepairCalculationBlock(roomId, floorIndex, roomIndex, room);
      } catch (error) {
        console.error('Room repair calculation block render failed', error);
        return `
          <div class="room-repair-calc-card is-collapsed">
            <div class="room-repair-calc-head">
              <div>
                <div class="room-repair-calc-kicker">Рассчитать ремонт</div>
                <div class="room-repair-calc-title">Расчет временно недоступен</div>
                <p>Помещение создано. Обновите страницу или откройте расчет ремонта позже.</p>
              </div>
              <div class="room-repair-calc-head-actions">
                <div class="room-repair-calc-status">
                  <span>создание помещения не прервано</span>
                  <small>блок защищен</small>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    }

    function toggleRoomRepairCalculationBlock(roomId, floorIndex, roomIndex) {
      const room = roomData?.[roomId]?.floors?.[floorIndex]?.livingRooms?.[roomIndex];
      if (!room) return;
      room.repairCalculationCollapsed = !room.repairCalculationCollapsed;
      if (typeof saveAndRestoreFloorRoomStates === 'function' && typeof renderFloorRooms === 'function') {
        saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      } else if (typeof renderFloorRooms === 'function') {
        renderFloorRooms(roomId, floorIndex);
      }
    }

    function markRoomRepairCalculationNeedsUpdate(room, reason) {
      if (!room?.repairCalculation || room.repairCalculation.status !== 'calculated') return;
      room.repairCalculation.status = 'needsUpdate';
      room.repairCalculation.updatedAt = new Date().toISOString();
      room.repairCalculation.updateReason = reason || 'room_changed';
    }

    function openRoomRepairCalculationDraft(roomId, floorIndex, roomIndex) {
      const room = roomData?.[roomId]?.floors?.[floorIndex]?.livingRooms?.[roomIndex];
      if (!room) return;
      renderRoomRepairCalculationModal(roomId, floorIndex, roomIndex);
    }

    function getRoomRepairDesignStyleOptions() {
      return [
        { value: '', label: 'Выберите стиль' },
        { value: 'modern_minimalism', label: 'Современный минимализм' },
        { value: 'modern_classic', label: 'Современная классика' },
        { value: 'classic', label: 'Классика' },
        { value: 'scandinavian', label: 'Скандинавский стиль' },
        { value: 'modern', label: 'Модерн' },
        { value: 'art_deco', label: 'Ар-деко' },
        { value: 'japanese', label: 'Японский стиль' },
        { value: 'chinese', label: 'Китайский стиль' },
        { value: 'other', label: 'Другое' }
      ];
    }

    function getRoomRepairCalculationModeOptions() {
      return [
        { value: 'budget', label: 'Бюджет/Аренда', workMultiplier: 1, materialMultiplier: 1, hint: 'Считаем по тарифу Бюджет/Аренда.' },
        { value: 'comfort', label: 'Комфорт', workMultiplier: 1, materialMultiplier: 1, hint: 'Считаем по тарифу Комфорт.' },
        { value: 'business', label: 'Бизнес', workMultiplier: 1, materialMultiplier: 1, hint: 'Считаем по тарифу Бизнес.' },
        { value: 'premium', label: 'Премиум', workMultiplier: 1, materialMultiplier: 1, hint: 'Считаем по тарифу Премиум.' }
      ];
    }

    function getRoomRepairCalculationModeMeta(value) {
      const normalized = normalizeRoomRepairRepairTier(value);
      return getRoomRepairCalculationModeOptions().find(option => option.value === normalized) || getRoomRepairCalculationModeOptions()[1];
    }

    function getRoomRepairSolutionPackageOptions() {
      return [
        { value: 'budget', label: 'Бюджет/Аренда', mode: 'budget', icon: 'fa-seedling', hint: 'Практичный состав для аренды и быстрого обновления.' },
        { value: 'comfort', label: 'Комфорт', mode: 'comfort', icon: 'fa-layer-group', hint: 'Сбалансированный состав для жилого ремонта.' },
        { value: 'business', label: 'Бизнес', mode: 'business', icon: 'fa-briefcase', hint: 'Износостойкость, рабочие зоны, слаботочка и строгие финиши.' },
        { value: 'premium', label: 'Премиум', mode: 'premium', icon: 'fa-gem', hint: 'Сложные узлы, сценарный свет, smart и премиальные примыкания.' }
      ];
    }

    function getRoomRepairSolutionPackageMeta(value) {
      const normalized = normalizeRoomRepairRepairTier(value);
      return getRoomRepairSolutionPackageOptions().find(option => option.value === normalized) || getRoomRepairSolutionPackageOptions()[1];
    }

    function getRoomRepairSolutionPackageForMode(mode = '') {
      const normalized = normalizeRoomRepairRepairTier(mode);
      const option = getRoomRepairSolutionPackageOptions().find(item => item.mode === normalized);
      return option?.value || 'comfort';
    }

    function normalizeRoomRepairRepairTier(value = '') {
      const normalized = String(value || '').trim().toLowerCase();
      if (['budget', 'basic', 'economy', 'rent', 'rental'].includes(normalized)) return 'budget';
      if (normalized === 'premium') return 'premium';
      if (normalized === 'business') return 'business';
      if (normalized === 'comfort') return 'comfort';
      return 'comfort';
    }

    function getRoomRepairPriceTierOptions() {
      return [
        { value: 'inherit', label: 'Как у объекта', hint: 'Использует общий уровень расчета объекта.' },
        ...getRoomRepairCalculationModeOptions()
      ];
    }

    function getRoomRepairObjectPriceTier() {
      return normalizeRoomRepairRepairTier(document.getElementById('detailedRepairType')?.value || 'comfort');
    }

    function getRoomRepairPriceTierMeta(value = 'inherit') {
      if (value === 'inherit') {
        const objectTier = getRoomRepairObjectPriceTier();
        const objectMeta = getRoomRepairCalculationModeMeta(objectTier);
        return {
          value: 'inherit',
          effectiveValue: objectTier,
          label: `Как у объекта (${objectMeta.label})`,
          shortLabel: objectMeta.label,
          hint: 'Комната считается по общему уровню объекта.'
        };
      }
      const meta = getRoomRepairCalculationModeMeta(value);
      return {
        value: normalizeRoomRepairRepairTier(value),
        effectiveValue: normalizeRoomRepairRepairTier(value),
        label: meta.label,
        shortLabel: meta.label,
        hint: meta.hint
      };
    }

    function getRoomRepairPriceMarket(priceTier = 'comfort') {
      const map = {
        budget: 'Бюджет/Аренда',
        comfort: 'Комфорт',
        business: 'Бизнес',
        premium: 'Премиум'
      };
      return map[normalizeRoomRepairRepairTier(priceTier)] || map.comfort;
    }

    function removeRoomRepairAutoItemsByPattern(sections = {}, sectionKey = '', pattern) {
      sections[sectionKey] = (sections[sectionKey] || []).filter(item => !pattern.test(String(item || '')));
    }

    function limitRoomRepairAutoSection(sections = {}, sectionKey = '', count = 2) {
      sections[sectionKey] = (sections[sectionKey] || []).slice(0, count);
    }

    function getRoomRepairSectionConfig() {
      return [
        { key: 'demolition', tab: 'demo', label: 'Демонтаж', icon: 'fa-hammer', placeholder: 'Демонтаж старого пола, стен, потолка', hint: 'Только снятие, разборка и освобождение помещения перед новым ремонтом.' },
        { key: 'floor', tab: 'finish', label: 'Пол', icon: 'fa-layer-group', placeholder: 'Стяжка, наливной пол, инженерная доска', hint: 'Основание, покрытие, плинтус и акустика пола.' },
        { key: 'walls', tab: 'finish', label: 'Стены', icon: 'fa-border-all', placeholder: 'Штукатурка, шпаклевка, окраска / обои', hint: 'Черновая подготовка и чистовой материал стен.' },
        { key: 'ceiling', tab: 'finish', label: 'Потолок', icon: 'fa-grip-lines', placeholder: 'Подготовка, ГКЛ / натяжной потолок, покраска', hint: 'Плоскость, примыкания, карнизы и теневые профили.' },
        { key: 'openings', tab: 'structures', label: 'Проемы', icon: 'fa-door-open', placeholder: 'Двери, окна, балконные блоки', hint: 'Монтаж дверных, оконных и балконных проемов.' },
        { key: 'stairs', tab: 'structures', label: 'Лестницы', icon: 'fa-stairs', placeholder: 'Лестницы, ступени, поручни, ограждения', hint: 'Монтаж лестниц, облицовка ступеней и перила.' },
        { key: 'electrical', tab: 'engineering', label: 'Электрика', icon: 'fa-bolt', placeholder: 'Розетки, выключатели, линии, слаботочка', hint: 'Точки, отдельные линии и влияние на электрощит.' },
        { key: 'lighting', tab: 'engineering', label: 'Свет', icon: 'fa-lightbulb', placeholder: 'Основной, сценарный, бра, подсветка', hint: 'Сценарии света, группы управления и декоративные линии.' },
        { key: 'smartHome', tab: 'smart', label: 'Умный дом', icon: 'fa-microchip', placeholder: 'Датчики, сценарии, управление светом', hint: 'Датчики, автоматизация и влияние на SMART-щит.' },
        { key: 'climate', tab: 'climateSystems', label: 'Климат', icon: 'fa-wind', placeholder: 'Кондиционер, вентиляция, теплый пол', hint: 'Кондиционирование, вентиляция, трассы и питание.' },
        { key: 'plumbing', tab: 'waterSystems', label: 'Сантехника', icon: 'fa-faucet', placeholder: 'Водоснабжение, канализация, приборы', hint: 'Вода, канализация, гидроизоляция и влажные зоны.' }
      ];
    }

    function getRoomRepairTabConfig() {
      return [
        { key: 'demo', label: 'Демонтаж', icon: 'fa-hammer' },
        { key: 'finish', label: 'Отделка', icon: 'fa-swatchbook' },
        { key: 'structures', label: 'Проемы и лестницы', icon: 'fa-door-open' },
        { key: 'engineering', label: 'Электрика и свет', icon: 'fa-bolt' },
        { key: 'smart', label: 'SMART', icon: 'fa-microchip' },
        { key: 'climateSystems', label: 'Климат', icon: 'fa-wind' },
        { key: 'waterSystems', label: 'Вода и канализация', icon: 'fa-faucet' }
      ];
    }

    function getRoomRepairSectionPresets(key) {
      const presets = {
        demolition: ['Демонтаж старой отделки пола', 'Демонтаж старых покрытий стен', 'Демонтаж потолочного покрытия', 'Демонтаж старой сантехники / приборов в зоне подключения'],
        floor: ['Механизированная стяжка пола', 'Наливной финишный слой под чистовое покрытие', 'Инженерная доска', 'Керамогранит', 'Кварц-винил / SPC', 'Скрытый плинтус', 'Акустическая подложка'],
        walls: ['Штукатурка стен по маякам', 'Шпаклевка стен под финиш', 'Финишная подготовка стен под премиальную покраску', 'Декоративный акцент под стиль', 'Керамогранит', 'Покраска стен', 'Износостойкое покрытие'],
        ceiling: ['Базовая подготовка потолка', 'ГКЛ-потолок с теневым профилем', 'Натяжной потолок с аккуратным примыканием', 'Скрытый карниз / теневой профиль по периметру', 'Зонирование потолка под несколько сценариев света'],
        electrical: ['4 розеточных точки с группировкой по зонам', '6 розеточных точек с группировкой по зонам', '7 розеточных точек с группировкой по зонам', '8 розеточных точек с группировкой по зонам', '9 розеточных точек с группировкой по зонам', '10 розеточных точек с группировкой по зонам', '12 розеточных точек с группировкой по зонам', 'Отдельные линии для техники', 'Выключатели у входа и у ключевых сценарных зон', 'Рабочее место: питание, интернет и резерв под технику'],
        lighting: ['1 группа основного света', '2 группы света: основной и сценарный', '3 группы света по зонам', 'Основной свет с равномерной засветкой', 'Сценарная подсветка и декоративные линии света', 'Прикроватные сценарии света с двух сторон', 'Рабочий свет для учебной зоны'],
        smartHome: ['1 smart-сценарий света', '2 smart-сценария света', 'Сценарии света через умный выключатель', 'Датчик протечки с выводом в SMART-щит', 'Датчик движения / присутствия для сценариев', 'Подготовка под управление шторами / карнизом'],
        climate: ['1 кондиционер / split-система', 'Подготовка трассы кондиционера', 'Закладка дренажа и питания для внутреннего блока', 'Приточно-вытяжная вентиляция / вытяжной канал', 'Тихий режим климатического оборудования'],
        plumbing: ['Разводка водоснабжения и канализации', 'Гидроизоляция мокрых зон', 'Подключение мойки и кухонной техники', 'Ревизионный доступ к сантехническим узлам']
      };
      return presets[key] || [];
    }

    function ensureRoomRepairCalculation(room) {
      if (!room.repairCalculation) {
        room.repairCalculation = {
          status: 'none',
          source: '',
          calculatedAt: '',
          designMode: room.repairData?.designStyle ? 'style' : 'own',
          designStyle: room.repairData?.designStyle || '',
          calculationMode: 'comfort',
          solutionPackage: 'comfort',
          priceTier: 'inherit',
          totals: { works: 0, materials: 0, total: 0 },
          sections: {},
          structuredSelections: []
        };
      }
      room.repairCalculation.sections = room.repairCalculation.sections || {};
      room.repairCalculation.structuredSelections = getRoomRepairStructuredSelections(room.repairCalculation);
      room.repairCalculation.calculationMode = normalizeRoomRepairRepairTier(room.repairCalculation.calculationMode || room.repairCalculation.solutionPackage || 'comfort');
      room.repairCalculation.solutionPackage = normalizeRoomRepairRepairTier(room.repairCalculation.solutionPackage || getRoomRepairSolutionPackageForMode(room.repairCalculation.calculationMode));
      room.repairCalculation.priceTier = room.repairCalculation.priceTier || 'inherit';
      room.repairCalculation.effectivePriceTier = getRoomRepairPriceTierMeta(room.repairCalculation.priceTier).effectiveValue;
      room.repairCalculation.totals = room.repairCalculation.totals || { works: 0, materials: 0, total: 0 };
      return room.repairCalculation;
    }

    function getRoomRepairStyleLabel(value) {
      return getRoomRepairDesignStyleOptions().find(option => option.value === value)?.label || 'Свой дизайн';
    }

    function getRoomRepairCurrentStateLabel(room = {}) {
      const value = room.repairData?.currentState || '';
      const labels = typeof repairQuestCurrentStateLabels !== 'undefined' ? repairQuestCurrentStateLabels : {
        concrete_with_walls: 'Без отделки (с перегородками)',
        concrete_no_walls: 'Без отделки (без перегородок)',
        rough_finish: 'Черновая отделка',
        whitebox: 'Предчистовая White-box',
        old_finish: 'Есть старая отделка'
      };
      return labels[value] || 'Не указано';
    }

    function getRoomRepairRedesignLabel(room = {}) {
      const value = room.repairData?.requiresRedesign || '';
      if (value === 'yes') return 'Нужна';
      if (value === 'no') return 'Не нужна';
      return 'Не указано';
    }

    function getRoomRepairModalSectionValue(calc, key, limit = 24) {
      const values = calc.sections?.[key] || [];
      if (!Array.isArray(values)) return '';
      return values
        .map(item => {
          if (typeof item === 'string') return item;
          return item?.label || item?.name || item?.title || item?.type || item?.workId || '';
        })
        .filter(Boolean)
        .filter(item => !isRoomRepairObsoleteSectionItem(key, item))
        .slice(0, limit)
        .join('\n');
    }

    function normalizeRoomRepairStructuredSelections(value) {
      let list = value;
      if (typeof value === 'string') {
        try {
          list = JSON.parse(value || '[]');
        } catch (error) {
          list = [];
        }
      }
      if (!Array.isArray(list)) return [];
      return list
        .map(item => {
          if (!item || typeof item !== 'object') return null;
          const section = String(item.section || '').trim();
          const label = String(item.label || item.name || item.title || '').trim();
          if (!section || !label) return null;
          return {
            id: String(item.id || `${section}:${label}`).trim(),
            section,
            label,
            groupKey: String(item.groupKey || '').trim(),
            groupLabel: String(item.groupLabel || '').trim(),
            nodeKey: String(item.nodeKey || '').trim(),
            nodeLabel: String(item.nodeLabel || '').trim(),
            detailGroup: String(item.detailGroup || '').trim(),
            source: String(item.source || 'manual').trim(),
            quantity: Number(item.quantity || 0),
            quantityLabel: String(item.quantityLabel || '').trim(),
            quantitySource: String(item.quantitySource || '').trim(),
            zoneKey: String(item.zoneKey || '').trim(),
            zoneLabel: String(item.zoneLabel || '').trim(),
            zoneHint: String(item.zoneHint || '').trim(),
            zoneDefaultQty: Number(item.zoneDefaultQty || 0),
            zoneCover: String(item.zoneCover || '').trim(),
            wallLayer: Number(item.wallLayer || 0),
            linkedZoneId: String(item.linkedZoneId || '').trim(),
            workId: String(item.workId || '').trim(),
            targetCategory: String(item.targetCategory || '').trim(),
            qtyMode: String(item.qtyMode || '').trim()
          };
        })
        .filter(selection => selection && !isRoomRepairObsoleteSectionItem(selection.section, selection.label))
        .slice(0, 120);
    }

    function getRoomRepairStructuredSelections(calc = {}) {
      return normalizeRoomRepairStructuredSelections(calc.structuredSelections || calc.selections || []);
    }

    function splitRoomRepairSectionTextarea(value) {
      return String(value || '')
        .split(/\n|;/)
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 24);
    }

    function isRoomRepairObsoleteSectionItem(sectionKey = '', label = '') {
      const value = normalizeRoomRepairBuilderLabel(label);
      return sectionKey === 'walls'
        && /усиленн.*подготовк.*стен.*покрыт/.test(value);
    }

    function filterRoomRepairSectionItems(sectionKey = '', items = []) {
      return (items || []).filter(item => !isRoomRepairObsoleteSectionItem(sectionKey, item));
    }

    function getRoomClimateUnitLimit() {
      const buildingSubtype = typeof getPremiseBuildingSubtype === 'function'
        ? getPremiseBuildingSubtype()
        : (document.getElementById('buildingSubtype')?.value || '');
      const apartmentSubtypes = ['apartment', 'aparthotel', 'euro_apartment', 'euro_aparthotel'];
      return apartmentSubtypes.includes(buildingSubtype) ? 1 : 6;
    }

    function normalizeRoomClimateUnits(value) {
      return Math.max(1, Math.min(getRoomClimateUnitLimit(), parseInt(value, 10) || 1));
    }

    function hasRoomRepairAcDemand(sections = {}) {
      return (sections.climate || []).some(item => /кондиц|сплит|split|климат|внутрен|трасс|дренаж|питан/i.test(String(item || '')));
    }

    function getRoomRepairClimateUnits(room = {}, sections = {}) {
      if (!hasRoomRepairAcDemand(sections)) return 0;
      const text = (sections.climate || []).join(' ');
      const explicit = text.match(/(\d+)\s*(?:шт\.?|внутр|блок|кондиц|сплит|split|климат)/i);
      const stored = room.repairCalculation?.climateUnits || room.repairData?.climateUnits || 1;
      return normalizeRoomClimateUnits(explicit ? explicit[1] : stored);
    }

    function getRoomRepairClimateRouteLength(room = {}) {
      const area = Math.max(1, Number(room.area || 0));
      return Number(Math.max(3, Math.min(8, area / 4)).toFixed(2));
    }

    window.getRoomClimateUnitLimit = getRoomClimateUnitLimit;
    window.normalizeRoomClimateUnits = normalizeRoomClimateUnits;

    function isRoomRepairWetRoom(room = {}) {
      return ['Санузел', 'Совмещенный С/У', 'Ванная', 'Душевая', 'Постирочная', 'Сауна', 'SPA-зона', 'Кухня'].includes(room.roomType);
    }

    function getRoomRepairTypeLabel(room = {}) {
      const value = room.repairData?.repairTypeNew || 'clean';
      const labels = {
        turnkey: 'Под ключ (с мебелью)',
        clean: 'Чистовая отделка',
        whitebox_new: 'White-box',
        rough: 'Черновая отделка'
      };
      return labels[value] || 'Чистовая отделка';
    }

    function addRoomRepairAutoItems(target, key, items) {
      target[key] = target[key] || [];
      (Array.isArray(items) ? items : [items]).forEach(item => {
        const text = String(item || '').trim();
        if (text && !target[key].includes(text)) target[key].push(text);
      });
    }

    function getRoomRepairAutoContext(room = {}, designMode = 'own', designStyle = '') {
      const roomType = room.roomType || 'Комната';
      const text = [
        roomType,
        room.appointment,
        room.subAppointment,
        room.roomZone,
        room.category,
        room.roomName,
        room.displayName
      ].filter(Boolean).join(' ').toLowerCase();
      const area = Number(room.area || 0);
      const people = Number(room.peopleCount || 0);
      const repairData = room.repairData || {};
      const currentState = repairData.currentState || '';
      const repairType = repairData.repairTypeNew || 'clean';
      const requiresRedesign = repairData.requiresRedesign === 'yes';
      const location = room.location || repairData.location || 'above_ground';
      const hasKnownCurrentState = !!currentState && !['new_finish', 'clean_finish', 'ready'].includes(currentState);
      const styleCanAffectFinish = !['rough', 'whitebox_new'].includes(repairType);
      const style = designMode === 'style' && styleCanAffectFinish ? designStyle : '';
      const styleLabel = designMode === 'style' ? getRoomRepairStyleLabel(designStyle) : 'свой дизайн';
      const premiumStyles = ['modern_classic', 'classic', 'art_deco', 'japanese'];
      const naturalStyles = ['scandinavian', 'japanese', 'chinese'];
      return {
        roomType,
        text,
        area,
        people,
        currentState,
        repairType,
        requiresRedesign,
        location,
        style,
        styleLabel,
        styleCanAffectFinish,
        fullRepair: repairType === 'turnkey',
        roughRepair: repairType === 'rough',
        whitebox: repairType === 'whitebox_new',
        currentWhitebox: currentState === 'whitebox',
        isPremiumStyle: premiumStyles.includes(style),
        isNaturalStyle: naturalStyles.includes(style),
        isWet: isRoomRepairWetRoom(room),
        isKitchen: roomType === 'Кухня' || /кухн/.test(text),
        isChildren: roomType === 'Детская' || /детск|child/.test(text),
        isBedroom: roomType === 'Спальня' || /спальн|bedroom/.test(text),
        isLiving: roomType === 'Гостиная' || /гостин|living/.test(text),
        isCabinet: /кабинет|офис|рабоч|office|workspace/.test(text),
        isHallway: /прихож|коридор|холл|hall/.test(text),
        isWardrobe: /гардероб|кладов|storage/.test(text),
        isCommercial: /офис|торгов|кабинет|салон|обществен|commercial/.test(text),
        isLowerLevel: location === 'basement' || location === 'ground_floor',
        isAttic: location === 'attic',
        isLarge: area >= 24,
        isCompact: area > 0 && area < 9,
        hasKnownCurrentState
      };
    }

    function buildRoomRepairAutoProfile(room = {}, designMode = 'own', designStyle = '') {
      const ctx = getRoomRepairAutoContext(room, designMode, designStyle);
      const sections = {
        demolition: [],
        floor: [],
        walls: [],
        ceiling: [],
        electrical: [],
        lighting: [],
        smartHome: [],
        climate: [],
        plumbing: []
      };

      if (ctx.currentState === 'old_finish') {
        addRoomRepairAutoItems(sections, 'demolition', ['Демонтаж старой отделки пола', 'Демонтаж старых покрытий стен', 'Демонтаж потолочного покрытия']);
        if (ctx.isWet || ctx.isKitchen) addRoomRepairAutoItems(sections, 'demolition', 'Демонтаж старой сантехники / приборов в зоне подключения');
      } else if (ctx.currentState === 'concrete_no_walls') {
        addRoomRepairAutoItems(sections, 'walls', ['Проверка геометрии помещения и разметка перегородок', 'Подготовка проемов и примыканий перед строительством']);
      } else if (ctx.currentState === 'rough_finish') {
        addRoomRepairAutoItems(sections, 'floor', 'Аудит черновой отделки и локальная корректировка оснований');
      } else if (ctx.currentState) {
        addRoomRepairAutoItems(sections, 'floor', 'Локальная подготовка основания перед ремонтом');
      } else {
        addRoomRepairAutoItems(sections, 'floor', 'Аудит существующих оснований перед началом ремонта');
      }
      if (ctx.requiresRedesign) {
        addRoomRepairAutoItems(sections, 'demolition', 'Разметка зон перепланировки');
        addRoomRepairAutoItems(sections, 'walls', 'Подготовка проемов / примыканий под новую планировку');
      }

      if (ctx.roughRepair || ctx.whitebox) {
        addRoomRepairAutoItems(sections, 'floor', ['Механизированная стяжка пола', ctx.whitebox ? 'Наливной финишный слой под чистовое покрытие' : 'Подготовка основания под будущую отделку']);
      } else if (ctx.isWet || ctx.isKitchen || ctx.isHallway) {
        addRoomRepairAutoItems(sections, 'floor', ['Керамогранит с гидроизоляцией основания', ctx.isPremiumStyle ? 'Крупноформатная раскладка с минимальным швом' : 'Практичная раскладка с износостойкой затиркой']);
      } else if (ctx.isPremiumStyle) {
        addRoomRepairAutoItems(sections, 'floor', ['Инженерная доска премиального класса', 'Акустическая подложка и скрытый плинтус']);
      } else if (ctx.isNaturalStyle) {
        addRoomRepairAutoItems(sections, 'floor', ['Инженерная доска / качественный ламинат натурального тона', 'Тихая подложка для акустического комфорта']);
      } else {
        addRoomRepairAutoItems(sections, 'floor', ['Кварц-винил / SPC', 'Общая усиленная подготовка основания пола']);
      }
      if (ctx.isBedroom || ctx.isChildren || ctx.isCabinet) addRoomRepairAutoItems(sections, 'floor', 'Подложка с повышенным акустическим комфортом');
      if (ctx.isLowerLevel) addRoomRepairAutoItems(sections, 'floor', 'Дополнительная влагозащита основания нижнего уровня');

      addRoomRepairAutoItems(sections, 'walls', (ctx.roughRepair || ctx.whitebox) ? 'Штукатурка стен по маякам' : 'Шпаклевка стен под финиш');
      if (ctx.whitebox) addRoomRepairAutoItems(sections, 'walls', 'Финишная подготовка стен под чистовую отделку');
      if (!ctx.roughRepair && !ctx.whitebox) {
        if (ctx.isWet) addRoomRepairAutoItems(sections, 'walls', ['Керамогранит', 'Влагостойкая подготовка стен под плитку']);
        else if (ctx.isPremiumStyle) addRoomRepairAutoItems(sections, 'walls', [`Декоративный акцент под стиль: ${ctx.styleLabel}`, 'Финишная подготовка стен под премиальную покраску']);
        else if (ctx.isNaturalStyle) addRoomRepairAutoItems(sections, 'walls', 'Теплая матовая окраска / натуральная фактура стен');
        else addRoomRepairAutoItems(sections, 'walls', 'Покраска стен');
        if (ctx.isChildren) addRoomRepairAutoItems(sections, 'walls', 'Износостойкое покрытие для детской зоны');
        if (ctx.isCommercial) addRoomRepairAutoItems(sections, 'walls', 'Антивандальное покрытие для высокой эксплуатации');
      }

      addRoomRepairAutoItems(sections, 'ceiling', (ctx.roughRepair || ctx.whitebox) ? 'Базовая подготовка потолка' : (ctx.isPremiumStyle ? 'ГКЛ-потолок с теневым профилем' : 'Натяжной потолок с аккуратным примыканием'));
      if (ctx.whitebox) addRoomRepairAutoItems(sections, 'ceiling', 'Выравнивание / подготовка потолка под чистовую отделку');
      if (!ctx.roughRepair && !ctx.whitebox) addRoomRepairAutoItems(sections, 'ceiling', ctx.isPremiumStyle ? 'Скрытый карниз / теневой профиль по периметру' : 'Потолочный карниз / скрытое примыкание по периметру');
      if (!ctx.roughRepair && !ctx.whitebox && (ctx.isLarge || ctx.isLiving)) addRoomRepairAutoItems(sections, 'ceiling', 'Зонирование потолка под несколько сценариев света');

      const socketBase = ctx.isKitchen
        ? Math.max(10, Math.ceil(ctx.area / 2.2))
        : (ctx.isChildren ? Math.max(7, ctx.people * 3 + 2)
          : (ctx.isBedroom ? Math.max(6, ctx.people * 2 + 3)
            : (ctx.isCabinet ? Math.max(7, Math.ceil(ctx.area / 3))
              : (ctx.isCommercial ? Math.max(8, Math.ceil(ctx.area / 4))
                : Math.max(4, Math.ceil(ctx.area / 5))))));
      addRoomRepairAutoItems(sections, 'electrical', [`${socketBase} розеточных точек с группировкой по зонам`, 'Выключатели у входа и у ключевых сценарных зон', 'Штробление под скрытую проводку', 'Прокладка кабеля в гофре']);
      if (ctx.isKitchen) addRoomRepairAutoItems(sections, 'electrical', ['Отдельные линии для техники кухни', 'Розетки фартука и рабочей зоны отдельной группой']);
      if (ctx.isChildren) addRoomRepairAutoItems(sections, 'electrical', ['Детская защита розеток и учебная зона', 'Резерв розеток под рост сценариев комнаты']);
      if (ctx.isBedroom) addRoomRepairAutoItems(sections, 'electrical', 'Прикроватные розетки и управление светом с двух сторон');
      if (ctx.isCabinet) addRoomRepairAutoItems(sections, 'electrical', 'Рабочее место: питание, интернет и резерв под технику');
      if (ctx.isWet) addRoomRepairAutoItems(sections, 'electrical', 'Влагозащищенные точки и отдельная защитная группа');

      addRoomRepairAutoItems(sections, 'lighting', ['Основной свет с равномерной засветкой', ctx.isPremiumStyle ? 'Сценарная подсветка и декоративные линии света' : 'Дополнительный мягкий свет по зонам']);
      if (ctx.isBedroom) addRoomRepairAutoItems(sections, 'lighting', 'Прикроватные сценарии света с двух сторон');
      if (ctx.isChildren) addRoomRepairAutoItems(sections, 'lighting', 'Рабочий свет для учебной зоны');
      if (ctx.isKitchen) addRoomRepairAutoItems(sections, 'lighting', 'Подсветка рабочей поверхности кухни');
      if (ctx.isHallway || ctx.isWardrobe) addRoomRepairAutoItems(sections, 'lighting', 'Датчик движения для проходного света');
      if (ctx.isLarge || ctx.isLiving) addRoomRepairAutoItems(sections, 'lighting', 'Раздельные группы света для отдыха, работы и акцентов');

      if (ctx.fullRepair || ctx.isPremiumStyle || ctx.isCommercial || ctx.isLarge) {
        addRoomRepairAutoItems(sections, 'smartHome', ['Сценарии света через умный выключатель', 'Датчик движения / присутствия для сценариев']);
      }
      if (ctx.isWet || ctx.isKitchen || ctx.isLowerLevel) addRoomRepairAutoItems(sections, 'smartHome', 'Датчик протечки с выводом в SMART-щит');
      if (ctx.isBedroom || ctx.isChildren) addRoomRepairAutoItems(sections, 'smartHome', 'Ночной сценарий света без яркой засветки');
      if (ctx.isCabinet || ctx.isCommercial) addRoomRepairAutoItems(sections, 'smartHome', 'Сценарий отключения питания рабочего места');
      if (ctx.isPremiumStyle) addRoomRepairAutoItems(sections, 'smartHome', 'Подготовка под управление шторами / карнизом');

      if (ctx.area >= 14 || ctx.isBedroom || ctx.isChildren || ctx.isCabinet || ctx.isCommercial) {
        addRoomRepairAutoItems(sections, 'climate', ['1 кондиционер / split-система', 'Подготовка трассы кондиционера', 'Закладка дренажа и питания для внутреннего блока']);
      }
      if (ctx.isLowerLevel || ctx.isAttic || ctx.isWet || ctx.isWardrobe) addRoomRepairAutoItems(sections, 'climate', 'Приточно-вытяжная вентиляция / вытяжной канал по назначению комнаты');
      if (ctx.isChildren || ctx.isBedroom) addRoomRepairAutoItems(sections, 'climate', 'Тихий режим климатического оборудования для ночного сценария');

      if (ctx.isWet || ctx.isKitchen) {
        addRoomRepairAutoItems(sections, 'plumbing', [ctx.isKitchen ? 'Подключение мойки и кухонной техники' : 'Разводка водоснабжения и канализации', 'Гидроизоляция мокрых зон']);
      }
      if (ctx.isWet) addRoomRepairAutoItems(sections, 'plumbing', 'Ревизионный доступ к сантехническим узлам');
      if (ctx.isKitchen) addRoomRepairAutoItems(sections, 'plumbing', 'Выводы под посудомоечную машину и фильтр воды');
      if (ctx.fullRepair) {
        addRoomRepairAutoItems(sections, 'floor', 'Защита чистовых покрытий на этапе мебели');
        addRoomRepairAutoItems(sections, 'walls', 'Финишные примыкания под встроенную мебель');
        addRoomRepairAutoItems(sections, 'electrical', 'Резерв питания под мебельную подсветку и встроенную технику');
        addRoomRepairAutoItems(sections, 'lighting', 'Подсветка мебели / рабочих ниш по сценарию');
      }

      return sections;
    }

    function getRoomRepairPackageFloorItems(ctx = {}, packageValue = 'comfort') {
      const tier = normalizeRoomRepairRepairTier(packageValue);
      const durableZone = ctx.isWet || ctx.isKitchen || ctx.isHallway || ctx.isCommercial;
      const styleAccent = ctx.isPremiumStyle || ctx.isNaturalStyle;
      if (ctx.roughRepair || ctx.whitebox) return [];

      if (durableZone) {
        if (tier === 'budget') return ['Керамическая плитка базового формата', 'Практичная раскладка с износостойкой затиркой'];
        if (tier === 'comfort') return ['Керамогранит стандартного формата', 'Практичная раскладка с износостойкой затиркой'];
        if (tier === 'business') return ['Керамогранит повышенной износостойкости', 'Износостойкая затирка и аккуратные примыкания'];
        return ['Крупноформатный керамогранит', 'Крупноформатная раскладка с минимальным швом'];
      }

      if (tier === 'budget') {
        return ['Ламинат 32 класса', 'Базовая подложка под покрытие'];
      }
      if (tier === 'comfort') {
        return [styleAccent ? 'Кварц-винил / SPC с натуральной фактурой' : 'Кварц-винил / SPC', 'Общая усиленная подготовка основания пола'];
      }
      if (tier === 'business') {
        return [styleAccent ? 'Паркетная доска' : 'Коммерческий кварц-винил / SPC повышенной износостойкости', 'Подложка с повышенным акустическим комфортом'];
      }
      return [ctx.style === 'art_deco' ? 'Инженерная доска премиального класса' : 'Инженерная доска премиального класса', 'Акустическая подложка и скрытый плинтус'];
    }

    function applyRoomRepairPackageFloorLevel(profile = {}, ctx = {}, packageValue = 'comfort') {
      if (ctx.roughRepair || ctx.whitebox) return profile;
      profile.floor = (profile.floor || []).filter(item => !isRoomRepairPrimaryFloorCover(item));
      removeRoomRepairAutoItemsByPattern(profile, 'floor', /скрыт|акустич|тихая подложка|общая усиленная подготовка основания пола|крупноформатная раскладка|практичная раскладка|износостойк.*затирк/i);
      addRoomRepairAutoItems(profile, 'floor', getRoomRepairPackageFloorItems(ctx, packageValue));
      return profile;
    }

    function applyRoomRepairSolutionPackageToSections(sections = {}, room = {}, packageValue = 'comfort', designMode = 'own', designStyle = '') {
      const ctx = getRoomRepairAutoContext(room, designMode, designStyle);
      const profile = {
        ...sections,
        demolition: [...(sections.demolition || [])],
        floor: [...(sections.floor || [])],
        walls: [...(sections.walls || [])],
        ceiling: [...(sections.ceiling || [])],
        openings: [...(sections.openings || [])],
        stairs: [...(sections.stairs || [])],
        electrical: [...(sections.electrical || [])],
        lighting: [...(sections.lighting || [])],
        smartHome: [...(sections.smartHome || [])],
        climate: [...(sections.climate || [])],
        plumbing: [...(sections.plumbing || [])]
      };
      applyRoomRepairPackageFloorLevel(profile, ctx, packageValue);

      if (packageValue === 'budget') {
        removeRoomRepairAutoItemsByPattern(profile, 'floor', /скрыт|акустич|защита чистовых|крупноформат|премиаль/i);
        removeRoomRepairAutoItemsByPattern(profile, 'walls', /декоратив|премиаль|мдф|рееч|акцент|антиванд/i);
        removeRoomRepairAutoItemsByPattern(profile, 'ceiling', /тенев|скрыт|зонирование|гкл/i);
        removeRoomRepairAutoItemsByPattern(profile, 'lighting', /сценар|декоратив|подсвет|раздель/i);
        profile.smartHome = (profile.smartHome || []).filter(item => /протеч/i.test(item) && (ctx.isWet || ctx.isKitchen));
        profile.climate = (profile.climate || []).filter(item => (
          (/кондиц|split|сплит|трасс|дренаж|питан/i.test(item) && (ctx.area >= 14 || ctx.isBedroom || ctx.isChildren || ctx.isCabinet || ctx.isCommercial))
          || (/вентиляц|вытяж/i.test(item) && (ctx.isWet || ctx.isLowerLevel || ctx.isAttic))
        ));
        limitRoomRepairAutoSection(profile, 'electrical', ctx.isKitchen || ctx.isCommercial ? 5 : 4);
        limitRoomRepairAutoSection(profile, 'lighting', 2);
        return profile;
      }

      if (packageValue === 'business') {
        removeRoomRepairAutoItemsByPattern(profile, 'walls', /декоративный акцент под стиль/i);
        addRoomRepairAutoItems(profile, 'walls', ['Износостойкое покрытие', 'Антивандальное покрытие для высокой эксплуатации']);
        addRoomRepairAutoItems(profile, 'ceiling', 'Натяжной потолок с аккуратным примыканием');
        addRoomRepairAutoItems(profile, 'electrical', ['10 розеточных точек с группировкой по зонам', 'Рабочее место: питание, интернет и резерв под технику', 'Интернет / ТВ точка', 'Отдельные линии для техники']);
        addRoomRepairAutoItems(profile, 'lighting', ['3 группы света по зонам', 'Рабочий свет для учебной зоны', 'Раздельные группы света для отдыха, работы и акцентов']);
        addRoomRepairAutoItems(profile, 'climate', 'Приточно-вытяжная вентиляция / вытяжной канал');
        addRoomRepairAutoItems(profile, 'smartHome', 'Сценарий отключения питания рабочего места');
        return profile;
      }

      if (packageValue === 'premium') {
        addRoomRepairAutoItems(profile, 'floor', ctx.isWet || ctx.isKitchen ? 'Скрытый плинтус' : []);
        addRoomRepairAutoItems(profile, 'walls', [`Декоративный акцент под стиль: ${ctx.styleLabel}`, 'Финишная подготовка стен под премиальную покраску']);
        addRoomRepairAutoItems(profile, 'ceiling', ['ГКЛ-потолок с теневым профилем', 'Скрытый карниз / теневой профиль по периметру', 'Зонирование потолка под несколько сценариев света']);
        addRoomRepairAutoItems(profile, 'electrical', ['12 розеточных точек с группировкой по зонам', 'Отдельные линии для техники', 'Резерв питания под мебельную подсветку и встроенную технику']);
        addRoomRepairAutoItems(profile, 'lighting', ['Сценарная подсветка и декоративные линии света', 'LED-лента в нише / профиле']);
        addRoomRepairAutoItems(profile, 'smartHome', ['2 smart-сценария света', 'Подготовка под управление шторами / карнизом', 'Настройка smart-сценариев комнаты']);
        if (ctx.isWet) addRoomRepairAutoItems(profile, 'plumbing', ['Скрытая сантехника / скрытый смеситель', 'Штробление под скрытую сантехнику', 'Усиленная гидроизоляция душевой зоны']);
        return profile;
      }

      return profile;
    }

    function buildRoomRepairSolutionPackageProfile(room = {}, designMode = 'own', designStyle = '', packageValue = 'comfort') {
      const sections = buildRoomRepairAutoProfile(room, designMode, designStyle);
      return applyRoomRepairSolutionPackageToSections(sections, room, packageValue, designMode, designStyle);
    }

    function normalizeRoomRepairPackageItem(value = '') {
      const text = String(value || '').trim().toLowerCase().replace(/ё/g, 'е');
      const afterColon = text.includes(':') ? text.split(':').slice(1).join(':').trim() : text;
      return afterColon
        .replace(/^\d+([,.]\d+)?\s*(м²|м2|м\.п\.|м трассы|шт\.?|розеток|групп света|светильников|бра|люстр)\s*(·\s*[^:]+)?\s*/i, '')
        .replace(/[«»"']/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function isRoomRepairPackageItemMatch(currentItem = '', packageItem = '') {
      const current = normalizeRoomRepairPackageItem(currentItem);
      const pack = normalizeRoomRepairPackageItem(packageItem);
      if (!current || !pack) return false;
      return current === pack || current.includes(pack) || pack.includes(current);
    }

    function getRoomRepairPackageDiff(room = {}, sections = {}, designMode = 'own', designStyle = '', packageValue = 'comfort') {
      const packageMeta = getRoomRepairSolutionPackageMeta(packageValue);
      const packageSections = buildRoomRepairSolutionPackageProfile(room, designMode, designStyle, packageMeta.value);
      const added = [];
      const removed = [];
      let currentCount = 0;
      let packageCount = 0;
      let matchedCount = 0;

      getRoomRepairSectionConfig().forEach(config => {
        const currentItems = sections[config.key] || [];
        const packageItems = packageSections[config.key] || [];
        currentCount += currentItems.length;
        packageCount += packageItems.length;

        packageItems.forEach(item => {
          const matched = currentItems.some(current => isRoomRepairPackageItemMatch(current, item));
          if (matched) matchedCount += 1;
          else removed.push({ section: config.label, label: item });
        });

        currentItems.forEach(item => {
          if (!packageItems.some(packageItem => isRoomRepairPackageItemMatch(item, packageItem))) {
            added.push({ section: config.label, label: item });
          }
        });
      });

      return {
        packageMeta,
        isCustom: false,
        currentCount,
        packageCount,
        matchedCount,
        added,
        removed
      };
    }

    function renderRoomRepairPackageDiffHtml(diff = {}) {
      if (diff.isCustom) {
        return `
          <div class="room-repair-package-diff is-custom">
            <p>Выбран пакет “Свой”: система не сравнивает черновик с шаблоном и не перезаписывает состав.</p>
          </div>
        `;
      }
      const hasChanges = !!(diff.added?.length || diff.removed?.length);
      const matchPercent = diff.packageCount ? Math.round((diff.matchedCount / diff.packageCount) * 100) : 0;
      const renderList = (title, items, icon) => items?.length ? `
        <div class="room-repair-package-diff-list">
          <strong><i class="fas ${icon}"></i>${title}</strong>
          ${items.slice(0, 4).map(item => `
            <small><em>${escapeRoomRepairHtml(item.section)}</em>${escapeRoomRepairHtml(item.label)}</small>
          `).join('')}
          ${items.length > 4 ? `<small class="is-muted">Еще ${items.length - 4} поз.</small>` : ''}
        </div>
      ` : '';

      return `
        <div class="room-repair-package-diff ${hasChanges ? 'has-changes' : 'is-aligned'}">
          <div class="room-repair-package-diff-meter">
            <div><span>Совпадение</span><strong>${matchPercent}%</strong></div>
            <div><span>Сверх пакета</span><strong>${diff.added?.length || 0}</strong></div>
            <div><span>Убрано</span><strong>${diff.removed?.length || 0}</strong></div>
          </div>
          ${hasChanges ? `
            ${renderList('Добавлено вручную', diff.added, 'fa-plus')}
            ${renderList('Не хватает из пакета', diff.removed, 'fa-minus')}
            <button type="button" class="room-repair-package-restore" onclick="restoreRoomRepairDraftPackage()">
              <i class="fas fa-rotate"></i>
              Вернуть пакет “${escapeRoomRepairHtml(diff.packageMeta?.label || 'Комфорт')}”
            </button>
          ` : '<p>Черновик совпадает с выбранным пакетом. Можно переходить к расчету или точечно уточнять состав.</p>'}
        </div>
      `;
    }

    function restoreRoomRepairDraftPackage() {
      const { roomId, floorIndex, roomIndex } = getRoomRepairDraftContext();
      if (!roomId) return;
      fillRoomRepairAutoDraft(roomId, floorIndex, roomIndex, getRoomRepairDraftSolutionPackage());
    }

    window.restoreRoomRepairDraftPackage = restoreRoomRepairDraftPackage;

    function getRoomRepairMetrics(room = {}) {
      const floorArea = Math.max(0, Number(typeof getLivingRoomMaterialFloorArea === 'function' ? getLivingRoomMaterialFloorArea(room) : (room.area || 0)));
      const wallArea = Math.max(0, Number(typeof getLivingRoomMaterialWallsArea === 'function' ? getLivingRoomMaterialWallsArea(room) : (room.wallsArea || (typeof calculateLivingRoomWallsArea === 'function' ? calculateLivingRoomWallsArea(room) : 0))));
      const ceilingArea = Math.max(0, Number(typeof getLivingRoomMaterialCeilingArea === 'function' ? getLivingRoomMaterialCeilingArea(room) : (room.ceilingArea || room.area || 0)));
      const coeff = Math.max(1, Number(room.materialCoefficient || 1.1));
      return { floorArea, wallArea, ceilingArea, coeff };
    }

    function getRoomRepairZoneBaseQty(mode, metrics = {}) {
      const floorArea = Math.max(1, Number(metrics.floorArea || 1));
      const wallArea = Math.max(1, Number(metrics.wallArea || metrics.wallsArea || floorArea * 2.6));
      const ceilingArea = Math.max(1, Number(metrics.ceilingArea || floorArea));
      switch (mode) {
        case 'floorArea': return floorArea;
        case 'wallsArea': return wallArea;
        case 'ceilingArea': return ceilingArea;
        case 'wetArea': return Math.max(3, Math.min(wallArea, Math.max(floorArea, 4)));
        case 'perimeter': return Math.max(4, Math.sqrt(floorArea) * 4);
        case 'electricalLength': return Math.max(4, floorArea * 1.2);
        case 'lightingLength': return Math.max(2, Math.sqrt(ceilingArea));
        default: return 0;
      }
    }

    function createRoomRepairZoneOption(key, label, qty, hint = '') {
      return {
        key,
        label,
        qty: Number(Math.max(0.1, Number(qty || 0)).toFixed(2)),
        hint
      };
    }

    function getRoomRepairZoneOptions(room = {}, mode = '', metrics = {}) {
      const floorArea = Math.max(1, Number(metrics.floorArea || room.area || 1));
      const wallArea = Math.max(1, Number(metrics.wallArea || metrics.wallsArea || room.wallsArea || floorArea * 2.6));
      const ceilingArea = Math.max(1, Number(metrics.ceilingArea || room.ceilingArea || floorArea));
      const fullQty = getRoomRepairZoneBaseQty(mode, { floorArea, wallArea, ceilingArea });
      const options = [createRoomRepairZoneOption('full', 'Вся комната', fullQty, 'Берем полный объем комнаты')];
      const isWet = isRoomRepairWetRoom(room);
      const isKitchen = /кухн/i.test(String(room.roomType || room.chamberDisplayName || ''));
      const addAreaZones = ['floorArea', 'wallsArea', 'ceilingArea', 'wetArea', 'perimeter', 'electricalLength', 'lightingLength'].includes(mode);
      if (!addAreaZones) return [];

      if (isWet || isKitchen || mode === 'wetArea') {
        const wetFloor = Math.min(floorArea, Math.max(3, floorArea * (isWet ? 0.55 : 0.28)));
        const wetWall = Math.min(wallArea, Math.max(5, wetFloor * 2.4));
        const wetQty = mode === 'wallsArea'
          ? wetWall
          : (mode === 'ceilingArea' ? Math.min(ceilingArea, wetFloor) : (mode === 'perimeter' ? Math.max(3, Math.sqrt(wetFloor) * 3.2) : wetFloor));
        options.push(createRoomRepairZoneOption('wet', isWet ? 'Мокрая зона' : 'Влажная/кухонная зона', wetQty, 'Для душевой, ванной, кухни и плиточных зон'));
      }

      const workFloor = Math.min(floorArea, Math.max(2, floorArea * 0.22));
      const workQty = mode === 'wallsArea'
        ? Math.min(wallArea, Math.max(3, workFloor * 1.6))
        : (mode === 'ceilingArea' ? Math.min(ceilingArea, Math.max(2, workFloor)) : (mode === 'perimeter' ? Math.max(2, Math.sqrt(workFloor) * 3) : (mode === 'lightingLength' ? Math.max(2, Math.sqrt(workFloor) * 1.5) : workFloor)));
      options.push(createRoomRepairZoneOption('work', 'Рабочая зона', workQty, 'Кухонный фартук, рабочий стол, учебное место'));

      if (mode === 'wallsArea' || mode === 'perimeter' || mode === 'lightingLength') {
        const accentQty = mode === 'wallsArea'
          ? Math.min(wallArea, Math.max(4, floorArea * 0.7))
          : Math.max(2, Math.sqrt(floorArea) * 1.2);
        options.push(createRoomRepairZoneOption('accent', 'Акцентная зона', accentQty, 'Одна стена, декоративная ниша или подсветка'));
      }

      if (mode !== 'ceilingArea') {
        const furnitureQty = mode === 'wallsArea'
          ? Math.min(wallArea, Math.max(3, floorArea * 0.45))
          : (mode === 'perimeter' ? Math.max(2, Math.sqrt(floorArea) * 1.4) : Math.min(floorArea, Math.max(2, floorArea * 0.18)));
        options.push(createRoomRepairZoneOption('furniture', 'Зона мебели', furnitureQty, 'Встроенные шкафы, мебельные примыкания, ниши'));
      }

      options.push(createRoomRepairZoneOption('custom', 'Своя зона', fullQty, 'Можно сразу поправить количество вручную'));
      return options;
    }

    function getRoomRepairZoneMeta(zoneKey = '', quantityConfig = {}) {
      return (quantityConfig.zoneOptions || []).find(zone => zone.key === zoneKey) || null;
    }

    function getRoomRepairMaterialUnitPrice(materialId, qty = 1, fallback = 0) {
      if (typeof getLinkedMaterialPrice === 'function') {
        const price = Number(getLinkedMaterialPrice(materialId, qty));
        if (price > 0) return price;
      }
      const prices = window.materialsData?.prices?.[window.currentMaterialsCity || 'Москва']?.[window.currentMaterialsMarket || 'Бюджет/Аренда']
        || window.materialsData?.prices?.['Москва']?.['Бюджет/Аренда'] || {};
      const raw = prices[materialId];
      if (Number.isFinite(Number(raw))) return Number(raw);
      if (raw && typeof raw === 'object' && Number.isFinite(Number(raw.base))) return Number(raw.base);
      return fallback;
    }

    function createRoomRepairMaterialLine({ areaKey, label, materialId, qty, unit = 'м²', fallbackPrice = 0, note = '' }) {
      const unitText = String(unit || '').trim().toLowerCase().replace(/\./g, '');
      const isDiscreteUnit = ['шт', 'компл', 'комплект', 'уп', 'упак', 'упаковка', 'пач', 'пачка', 'рул', 'рулон', 'ведро', 'меш', 'мешок', 'банка'].includes(unitText);
      const rawQty = Number(qty || 0);
      const normalizedQty = isDiscreteUnit ? Math.max(1, Math.ceil(rawQty)) : rawQty;
      if (normalizedQty <= 0) return null;
      const unitPrice = getRoomRepairMaterialUnitPrice(materialId, normalizedQty, fallbackPrice);
      return {
        areaKey,
        label,
        materialId,
        qty: Number(normalizedQty.toFixed(2)),
        unit,
        unitPrice,
        total: Math.round(unitPrice * normalizedQty),
        note
      };
    }

    const roomRepairBackendMaterialRecipeCache = new Map();
    const roomRepairBackendMaterialRecipePending = new Set();

    function isRoomRepairBackendMaterialRecipeWork(workId = '') {
      return /^finish_floor_|^finish_ceil_/.test(String(workId || ''));
    }

    function requestRoomRepairBackendMaterialRecipe(workId = '') {
      if (!isRoomRepairBackendMaterialRecipeWork(workId) || !window.RepairCoveringsApi?.fetchRoomRepairMaterialRecipes) return null;
      if (roomRepairBackendMaterialRecipeCache.has(workId)) return roomRepairBackendMaterialRecipeCache.get(workId);
      if (roomRepairBackendMaterialRecipePending.has(workId)) return null;
      roomRepairBackendMaterialRecipePending.add(workId);
      window.RepairCoveringsApi.fetchRoomRepairMaterialRecipes({ workId })
        .then(recipes => {
          const recipe = Array.isArray(recipes?.[workId]) ? recipes[workId] : null;
          roomRepairBackendMaterialRecipeCache.set(workId, recipe);
          if (recipe?.length) refreshRoomRepairDraftPreview(false);
        })
        .catch(error => {
          console.warn('Room repair backend material recipe unavailable', error);
        })
        .finally(() => {
          roomRepairBackendMaterialRecipePending.delete(workId);
        });
      return null;
    }

    function getRoomRepairMaterialRecipeOverride(workId, selection = {}) {
      const backendRecipe = requestRoomRepairBackendMaterialRecipe(workId);
      if (backendRecipe?.length) return backendRecipe;
      const recipes = {
        eng_vent_ac_unit_install: [
          { materialId: 'air_conditioner_unit', materialName: 'Кондиционер / сплит-система', consumptionPerWorkUnit: 1, consumptionUnit: 'шт', rounding: 'ceil', wastePercent: 0 }
        ],
        eng_vent_ac_route: [
          { materialId: 'ac_copper_pipe_6', consumptionPerWorkUnit: 1, consumptionUnit: 'м', rounding: 'none', wastePercent: 7 },
          { materialId: 'ac_insulation_6', consumptionPerWorkUnit: 1, consumptionUnit: 'м', rounding: 'none', wastePercent: 7 },
          { materialId: 'ac_trunking', consumptionPerWorkUnit: 0.35, consumptionUnit: 'м', rounding: 'none', wastePercent: 5 }
        ],
        eng_vent_ac_drain: [
          { materialId: 'ac_drain_pipe', consumptionPerWorkUnit: 1, consumptionUnit: 'м', rounding: 'none', wastePercent: 7 }
        ],
        eng_vent_ac_power: [
          { materialId: 'ac_cable_3x1_5', consumptionPerWorkUnit: 1, consumptionUnit: 'м', rounding: 'none', wastePercent: 5 }
        ],
        eng_vent_ac_bracket: [
          { materialId: 'ac_bracket_std', consumptionPerWorkUnit: 1, consumptionUnit: 'компл.', rounding: 'ceil', wastePercent: 0 },
          { materialId: 'ac_anchor_bolt', consumptionPerWorkUnit: 4, consumptionUnit: 'шт', rounding: 'ceil', wastePercent: 0 }
        ],
        eng_vent_ac_outdoor_install: [
          { materialId: 'ac_anchor_bolt', consumptionPerWorkUnit: 2, consumptionUnit: 'шт', rounding: 'ceil', wastePercent: 0 }
        ],
        eng_water_shower_tray_install: [
          { materialId: 'project_material_package', materialName: 'Готовый душевой поддон / комплект', consumptionPerWorkUnit: 1, consumptionUnit: 'компл.', rounding: 'ceil', wastePercent: 0, unitPriceOverride: 26000 },
          { materialId: 'sanitary_silicone', consumptionPerWorkUnit: 1, consumptionUnit: 'шт', rounding: 'ceil', wastePercent: 0 }
        ],
        eng_water_hidden_mixer_rough_in: [
          { materialId: 'project_material_package', materialName: 'Комплект скрытого смесителя', consumptionPerWorkUnit: 1, consumptionUnit: 'компл.', rounding: 'ceil', wastePercent: 0, unitPriceOverride: 18500 },
          { materialId: 'metal_plastic_16', consumptionPerWorkUnit: 3, consumptionUnit: 'м', rounding: 'none', wastePercent: 8 },
          { materialId: 'sanitary_silicone', consumptionPerWorkUnit: 0.5, consumptionUnit: 'шт', rounding: 'ceil', wastePercent: 0 }
        ],
        eng_water_hidden_plumbing_chasing: [
          { materialId: 'metal_plastic_16', consumptionPerWorkUnit: 0.6, consumptionUnit: 'м', rounding: 'none', wastePercent: 8 },
          { materialId: 'repair_compound_cement', consumptionPerWorkUnit: 0.8, consumptionUnit: 'кг', rounding: 'ceil', wastePercent: 10 }
        ],
        rough_floor_shower_tray_waterproof_reinforced: [
          { materialId: 'waterproofing_floor', consumptionPerWorkUnit: 1.25, consumptionUnit: 'м²', rounding: 'none', wastePercent: 10 },
          { materialId: 'waterproofing_tape', consumptionPerWorkUnit: 0.8, consumptionUnit: 'м', rounding: 'none', wastePercent: 10 }
        ],
        rough_floor_shower_tray_slope_base: [
          { materialId: 'screed_mix_5cm', consumptionPerWorkUnit: 18, consumptionUnit: 'кг', rounding: 'ceil', wastePercent: 10 },
          { materialId: 'floor_primer', consumptionPerWorkUnit: 0.12, consumptionUnit: 'л', rounding: 'half', wastePercent: 5 }
        ],
        rough_floor_shower_tray_curb_base: [
          { materialId: 'screed_mix_5cm', consumptionPerWorkUnit: 22, consumptionUnit: 'кг', rounding: 'ceil', wastePercent: 10 },
          { materialId: 'waterproofing_tape', consumptionPerWorkUnit: 1, consumptionUnit: 'м', rounding: 'none', wastePercent: 10 }
        ],
        eng_drain_shower_channel: [
          { materialId: 'shower_drain_trap', consumptionPerWorkUnit: 1, consumptionUnit: 'шт', rounding: 'ceil', wastePercent: 0 },
          { materialId: 'pvc_drain_pipe_50', consumptionPerWorkUnit: 1.5, consumptionUnit: 'м', rounding: 'none', wastePercent: 10 },
          { materialId: 'pvc_drain_fittings', consumptionPerWorkUnit: 1, consumptionUnit: 'компл.', rounding: 'ceil', wastePercent: 0 }
        ],
        finish_floor_shower_tray_tile_matte: [
          { materialId: 'ceramic_tile', materialName: 'Матовый противоскользящий керамогранит для душевой зоны', consumptionPerWorkUnit: 1.08, consumptionUnit: 'м²', rounding: 'none', wastePercent: 0, unitPriceOverride: 1850 },
          { materialId: 'tile_adhesive_porcelain', consumptionPerWorkUnit: 4.8, consumptionUnit: 'кг', rounding: 'ceil', wastePercent: 8 },
          { materialId: 'epoxy_grout', consumptionPerWorkUnit: 0.28, consumptionUnit: 'кг', rounding: 'half', wastePercent: 5 },
          { materialId: 'tile_leveling_system', consumptionPerWorkUnit: 0.18, consumptionUnit: 'упаковка', rounding: 'ceil', wastePercent: 0 }
        ],
        finish_floor_shower_tray_tile_mosaic: [
          { materialId: 'project_material_package', materialName: 'Мозаика для душевого поддона', consumptionPerWorkUnit: 1.12, consumptionUnit: 'м²', rounding: 'none', wastePercent: 0, unitPriceOverride: 3200 },
          { materialId: 'tile_adhesive_porcelain', consumptionPerWorkUnit: 5.2, consumptionUnit: 'кг', rounding: 'ceil', wastePercent: 8 },
          { materialId: 'epoxy_grout', consumptionPerWorkUnit: 0.55, consumptionUnit: 'кг', rounding: 'half', wastePercent: 5 },
          { materialId: 'tile_profile_aluminum', consumptionPerWorkUnit: 0.35, consumptionUnit: 'м', rounding: 'none', wastePercent: 5 }
        ]
      };
      return recipes[workId] || null;
    }

    function calculateRoomRepairStructuredMaterialProfile(room = {}, sections = {}, structuredSelections = []) {
      const metrics = getRoomRepairMetrics(room);
      const workLines = getRoomRepairStructuredWorkLines(room, sections, structuredSelections)
        .filter(line => line?.workId && Number(line.qty || 0) > 0)
        .map(line => ({
          workId: line.workId,
          qty: line.qty,
          total: line.total || (Number(line.unitPrice || 0) * Number(line.qty || 0)),
          source: 'roomRepair',
          sourceLabel: line.groupLabel || 'Расчет комнаты',
          sourceMode: [line.source || '', line.section || ''].filter(Boolean).join(':'),
          roomRepairLabel: line.label || '',
          roomRepairSection: line.section || '',
          roomRepairNode: line.nodeLabel || '',
          roomRepairGroup: line.groupLabel || '',
          roomRepairDetailGroup: line.detailGroup || '',
          roomRepairZoneKey: line.roomRepairZoneKey || line.zoneKey || '',
          roomRepairZoneLabel: line.roomRepairZoneLabel || line.zoneLabel || '',
          roomRepairZoneHint: line.roomRepairZoneHint || line.zoneHint || '',
          roomRepairQuantitySource: line.roomRepairQuantitySource || line.quantitySource || '',
          roomRepairQtyMode: line.roomRepairQtyMode || line.qtyMode || '',
          roomRepairQtyTrace: line.roomRepairQtyTrace || getRoomRepairQuantityFormulaLabel(line),
          materialRecipeOverride: getRoomRepairMaterialRecipeOverride(line.workId, line)
        }));
      if (!workLines.length || typeof calculateWhatToDoMaterialsEstimate !== 'function') {
        return { lines: [], total: 0, metrics, coveredSections: new Set(), updatedAt: new Date().toISOString() };
      }

      const estimate = calculateWhatToDoMaterialsEstimate(workLines);
      const coveredSections = new Set();
      const lines = (estimate.lines || []).map(line => {
        const baseWork = workLines.find(workLine => (
          workLine.workId === line.workId
          && (!line.roomRepairLabel || line.roomRepairLabel.includes(workLine.roomRepairLabel || ''))
        )) || workLines.find(workLine => workLine.workId === line.workId) || {};
        const section = baseWork.roomRepairSection || 'structured';
        coveredSections.add(section);
        return {
          areaKey: section,
          label: line.materialName || line.materialId || 'Материал по рецепту работы',
          materialId: line.materialId || '',
          qty: Number(Number(line.qty || 0).toFixed(2)),
          unit: line.unit || '',
          unitPrice: Number(line.unitPrice || 0),
          total: Math.round(Number(line.total || 0)),
          note: [
            getRoomRepairSectionLabel(section),
            baseWork.roomRepairZoneLabel,
            baseWork.roomRepairQtyTrace
          ].filter(Boolean).join(' · '),
          workId: line.workId || '',
          roomRepairLabel: baseWork.roomRepairLabel || line.roomRepairLabel || '',
          roomRepairSection: baseWork.roomRepairSection || '',
          roomRepairNode: baseWork.roomRepairNode || '',
          roomRepairGroup: baseWork.roomRepairGroup || '',
          roomRepairDetailGroup: baseWork.roomRepairDetailGroup || '',
          roomRepairZoneKey: baseWork.roomRepairZoneKey || '',
          roomRepairZoneLabel: baseWork.roomRepairZoneLabel || '',
          roomRepairZoneHint: baseWork.roomRepairZoneHint || '',
          roomRepairQuantitySource: baseWork.roomRepairQuantitySource || '',
          roomRepairQtyMode: baseWork.roomRepairQtyMode || '',
          roomRepairQtyTrace: baseWork.roomRepairQtyTrace || '',
          source: 'structured'
        };
      }).filter(line => line.total > 0 || line.qty > 0);

      return {
        lines,
        total: Math.round(lines.reduce((sum, line) => sum + Number(line.total || 0), 0)),
        metrics,
        coveredSections,
        updatedAt: new Date().toISOString()
      };
    }

    function detectRoomRepairCovering(sectionItems = [], type = 'floor', designStyle = '') {
      const text = sectionItems.join(' ').toLowerCase();
      if (type === 'floor') {
        if (/керамогранит|плитк/.test(text)) return { label: 'Керамогранит / плитка', materialId: 'ceramic_tile', fallbackPrice: 900 };
        if (/инженер|паркет/.test(text)) return { label: 'Инженерная доска', materialId: 'parquet_board', fallbackPrice: 1800 };
        if (/ламинат/.test(text)) return { label: 'Ламинат', materialId: 'laminate_board', fallbackPrice: 650 };
        if (/spc|кварц|винил/.test(text)) return { label: 'Кварц-винил / SPC', materialId: 'vinyl_plank', fallbackPrice: 950 };
        return ['modern_classic', 'classic', 'art_deco', 'japanese'].includes(designStyle)
          ? { label: 'Инженерная доска', materialId: 'parquet_board', fallbackPrice: 1800 }
          : { label: 'Кварц-винил / SPC', materialId: 'vinyl_plank', fallbackPrice: 950 };
      }
      if (type === 'wall') {
        if (/керамогранит|плитк/.test(text)) return { label: 'Керамогранит на стены', materialId: 'ceramic_tile', fallbackPrice: 900 };
        if (/обо/.test(text)) return { label: 'Виниловые обои', materialId: 'wallpaper_vinyl', fallbackPrice: 420 };
        if (/мягк.*панел|панел.*обивк|велюр|экокож|микровелюр/.test(text)) return { label: 'Мягкие стеновые панели', materialId: 'soft_wall_panel', fallbackPrice: 3800 };
        if (/мдф|рееч|ламел|гипсов|3d/.test(text)) return { label: 'Декоративные стеновые панели', materialId: 'wall_mdf_panels', fallbackPrice: 2400 };
        if (/бамбук/.test(text)) return { label: 'Бамбуковые стеновые панели', materialId: 'project_material_package', fallbackPrice: 3200 };
        if (/гибк.*мрамор|листов.*гибк|камень|шпон/.test(text)) return { label: 'Гибкий камень / каменный шпон', materialId: 'project_material_package', fallbackPrice: 4200 };
        if (/стекл/.test(text)) return { label: 'Стеклянные стеновые панели', materialId: 'project_material_package', fallbackPrice: 6500 };
        if (/зеркал/.test(text)) return { label: 'Зеркальные стеновые панели', materialId: 'project_material_package', fallbackPrice: 7200 };
        return { label: 'Интерьерная краска для стен', materialId: 'wall_paint_latex', fallbackPrice: 520 };
      }
      if (/гкл|гипсокартон/.test(text)) return { label: 'ГКЛ и комплект потолка', materialId: 'drywall_sheet', fallbackPrice: 320 };
      if (/натяж/.test(text)) return { label: 'Натяжной потолок / комплект', materialId: 'stretch_ceiling_joint_set', fallbackPrice: 2200, unit: 'компл.' };
      return { label: 'Краска для потолка', materialId: 'ceiling_paint', fallbackPrice: 460 };
    }

    function calculateRoomRepairMaterialProfile(room = {}, sections = {}, designMode = 'own', designStyle = '', structuredSelections = []) {
      const metrics = getRoomRepairMetrics(room);
      const structuredProfile = calculateRoomRepairStructuredMaterialProfile(room, sections, structuredSelections);
      const structuredCovered = structuredProfile.coveredSections || new Set();
      const lines = [...(structuredProfile.lines || [])];
      const addLine = line => { if (line) lines.push(line); };
      const shouldUseFallback = sectionKey => !structuredCovered.has(sectionKey);
      const repairType = room.repairData?.repairTypeNew || 'clean';
      const styleCanAffectFinish = !['rough', 'whitebox_new'].includes(repairType);
      const effectiveStyle = styleCanAffectFinish ? designStyle : '';
      const floorCover = detectRoomRepairCovering(sections.floor || [], 'floor', effectiveStyle);
      const wallCover = detectRoomRepairCovering(sections.walls || [], 'wall', effectiveStyle);
      const ceilingCover = detectRoomRepairCovering(sections.ceiling || [], 'ceiling', effectiveStyle);
      const floorQty = metrics.floorArea * metrics.coeff;
      const wallQty = metrics.wallArea * (isRoomRepairWetRoom(room) ? 1.12 : 1.05);
      const ceilingQty = metrics.ceilingArea * 1.05;

      if ((sections.floor || []).length && shouldUseFallback('floor')) {
        addLine(createRoomRepairMaterialLine({ areaKey: 'floor', label: floorCover.label, materialId: floorCover.materialId, qty: floorQty, unit: floorCover.unit || 'м²', fallbackPrice: floorCover.fallbackPrice, note: `Площадь пола ${metrics.floorArea.toFixed(2)} м² · запас ${metrics.coeff.toFixed(2)}` }));
        if (!/керамогранит|плитк|стяжк|налив/i.test((sections.floor || []).join(' '))) {
          addLine(createRoomRepairMaterialLine({ areaKey: 'floor', label: 'Подложка под напольное покрытие', materialId: 'underlayment_floor', qty: floorQty, unit: 'м²', fallbackPrice: 80 }));
        }
        if (/гидроизоляц|влагозащ/i.test((sections.floor || []).join(' '))) {
          addLine(createRoomRepairMaterialLine({ areaKey: 'floor', label: 'Гидроизоляция пола', materialId: 'waterproofing_floor', qty: floorQty, unit: 'м²', fallbackPrice: 220 }));
        }
      }

      if ((sections.walls || []).length && shouldUseFallback('walls')) {
        addLine(createRoomRepairMaterialLine({ areaKey: 'walls', label: wallCover.label, materialId: wallCover.materialId, qty: wallQty, unit: 'м²', fallbackPrice: wallCover.fallbackPrice, note: `Площадь стен ${metrics.wallArea.toFixed(2)} м²` }));
        if (/обо/.test((sections.walls || []).join(' ').toLowerCase())) {
          addLine(createRoomRepairMaterialLine({ areaKey: 'walls', label: 'Клей для обоев', materialId: 'wallpaper_glue', qty: Math.max(1, Math.ceil(wallQty / 25)), unit: 'уп.', fallbackPrice: 230 }));
        } else if (!/керамогранит|плитк/.test((sections.walls || []).join(' ').toLowerCase())) {
          addLine(createRoomRepairMaterialLine({ areaKey: 'walls', label: 'Грунтовка под финиш стен', materialId: 'primer_putty', qty: wallQty, unit: 'м²', fallbackPrice: 55 }));
        }
      }

      if ((sections.ceiling || []).length && shouldUseFallback('ceiling')) {
        const ceilingQtyFinal = ceilingCover.unit === 'компл.' ? Math.max(1, Math.ceil(metrics.ceilingArea / 18)) : ceilingQty;
        addLine(createRoomRepairMaterialLine({ areaKey: 'ceiling', label: ceilingCover.label, materialId: ceilingCover.materialId, qty: ceilingQtyFinal, unit: ceilingCover.unit || 'м²', fallbackPrice: ceilingCover.fallbackPrice, note: `Площадь потолка ${metrics.ceilingArea.toFixed(2)} м²` }));
        if (/тенев|скрыт|профил|карниз/i.test((sections.ceiling || []).join(' '))) {
          addLine(createRoomRepairMaterialLine({ areaKey: 'ceiling', label: 'Теневой / примыкающий профиль', materialId: 'shadow_profile', qty: Math.max(1, Math.ceil(Math.sqrt(metrics.ceilingArea || 1) * 4)), unit: 'м.п.', fallbackPrice: 520 }));
        }
      }

      const socketMatch = (sections.electrical || []).join(' ').match(/(\d+)\s*розет/i);
      const socketQty = socketMatch ? Number(socketMatch[1]) : ((sections.electrical || []).length ? Math.max(2, Math.ceil(metrics.floorArea / 5)) : 0);
      if (socketQty > 0 && shouldUseFallback('electrical')) {
        addLine(createRoomRepairMaterialLine({ areaKey: 'electrical', label: 'Розетки / механизмы', materialId: 'socket_outlet', qty: socketQty, unit: 'шт.', fallbackPrice: 220 }));
        addLine(createRoomRepairMaterialLine({ areaKey: 'electrical', label: 'Кабель ВВГнг-LS 3x2.5', materialId: 'copper_wire_2_5', qty: Math.max(10, socketQty * 5), unit: 'м', fallbackPrice: 85 }));
      }
      const lightQty = (sections.lighting || []).length ? Math.max(1, Math.ceil(metrics.floorArea / 7)) : 0;
      if (lightQty > 0 && shouldUseFallback('lighting')) {
        addLine(createRoomRepairMaterialLine({ areaKey: 'lighting', label: 'Кабель освещения 3x1.5', materialId: 'copper_wire_1_5', qty: Math.max(8, lightQty * 4), unit: 'м', fallbackPrice: 60 }));
        if (/подсвет|led|линии/i.test((sections.lighting || []).join(' '))) {
          addLine(createRoomRepairMaterialLine({ areaKey: 'lighting', label: 'LED-профиль / комплект подсветки', materialId: 'led_profile', qty: Math.max(2, Math.ceil(Math.sqrt(metrics.ceilingArea || 1))), unit: 'м.п.', fallbackPrice: 450 }));
        }
      }
      if ((sections.smartHome || []).length && shouldUseFallback('smartHome')) {
        addLine(createRoomRepairMaterialLine({ areaKey: 'smartHome', label: 'Датчики / smart-устройства', materialId: 'project_material_package', qty: Math.max(1, (sections.smartHome || []).length), unit: 'компл.', fallbackPrice: 3200 }));
      }
      const climateUnits = getRoomRepairClimateUnits(room, sections);
      if (climateUnits > 0 && shouldUseFallback('climate')) {
        const routeLength = getRoomRepairClimateRouteLength(room) * climateUnits;
        addLine(createRoomRepairMaterialLine({ areaKey: 'climate', label: 'Кондиционер / split-система', materialId: 'project_material_package', qty: climateUnits, unit: 'шт.', fallbackPrice: 65000 }));
        addLine(createRoomRepairMaterialLine({ areaKey: 'climate', label: 'Медная трасса и дренаж кондиционера', materialId: 'project_material_package', qty: routeLength, unit: 'м.п.', fallbackPrice: 1450 }));
      }
      if ((sections.plumbing || []).length && shouldUseFallback('plumbing')) {
        const plumbingText = (sections.plumbing || []).join(' ').toLowerCase();
        if (/готов.*поддон|душев.*поддон/.test(plumbingText) && !/плит|керамогранит|вровень|бортик/.test(plumbingText)) {
          addLine(createRoomRepairMaterialLine({ areaKey: 'plumbing', label: 'Готовый душевой поддон', materialId: 'project_material_package', qty: 1, unit: 'шт.', fallbackPrice: 26000 }));
        }
        if (/поддон.*плит|поддон.*керамогранит|вровень|бортик|трап|лоток/.test(plumbingText)) {
          addLine(createRoomRepairMaterialLine({ areaKey: 'plumbing', label: 'Душевой трап / канал', materialId: 'shower_drain_trap', qty: 1, unit: 'шт.', fallbackPrice: 11000 }));
          addLine(createRoomRepairMaterialLine({ areaKey: 'plumbing', label: 'Усиленная гидроизоляция душевой зоны', materialId: 'waterproofing_floor', qty: Math.max(4, metrics.floorArea * 0.35), unit: 'м²', fallbackPrice: 320 }));
        }
        if (/скрыт.*сантех|скрыт.*смесител/.test(plumbingText)) {
          const hiddenQty = Math.max(1, (plumbingText.match(/скрыт/g) || []).length);
          addLine(createRoomRepairMaterialLine({ areaKey: 'plumbing', label: 'Комплект скрытой сантехники', materialId: 'project_material_package', qty: hiddenQty, unit: 'компл.', fallbackPrice: 18500 }));
        }
        addLine(createRoomRepairMaterialLine({ areaKey: 'plumbing', label: 'Сантехнический комплект подключения', materialId: 'appliance_connection_set', qty: Math.max(1, Math.ceil((sections.plumbing || []).length / 2)), unit: 'компл.', fallbackPrice: 1300 }));
      }

      const total = lines.reduce((sum, line) => sum + Number(line.total || 0), 0);
      return {
        lines,
        total: Math.round(total),
        metrics,
        updatedAt: new Date().toISOString()
      };
    }

    function getRoomRepairFallbackWorkUnitPrice(workId) {
      const prices = {
        rough_floor_shower_tray_waterproof_reinforced: 950,
        rough_floor_shower_tray_slope_base: 2800,
        rough_floor_shower_tray_curb_base: 3400,
        eng_water_shower_tray_install: 4500,
        eng_water_hidden_mixer_rough_in: 6500,
        eng_water_hidden_plumbing_chasing: 950,
        finish_floor_shower_tray_tile_matte: 2200,
        finish_floor_shower_tray_tile_mosaic: 2800,
        finish_floor_decor_mosaic: 2600,
        finish_floor_tile_border: 1200,
        finish_floor_tile_miter_45: 950,
        finish_floor_decor_insert: 700,
        finish_floor_linoleum_hot_weld: 380,
        finish_floor_floor_linoleum_free: 520,
        finish_floor_floor_linoleum_glue: 820,
        finish_floor_floor_carpet_glue: 880,
        finish_floor_floor_epoxy: 2900,
        finish_floor_floor_polyurethane: 3100,
        finish_ceil_ceiling_led_profile: 1300,
        finish_ceil_ceiling_stretch_curtain_niche: 2390,
        finish_ceil_ceiling_cornice_hidden: 1440,
        finish_ceil_ceiling_hatch_hidden: 8380,
        finish_ceil_ceiling_rosette: 2190
      };
      return Number(prices[workId] || 0);
    }

    function getRoomRepairWorkUnitPrice(workId, priceTier = '') {
      if (!workId) return 0;
      const fallbackPrice = getRoomRepairFallbackWorkUnitPrice(workId);
      const effectiveTier = normalizeRoomRepairRepairTier(priceTier || getRoomRepairObjectPriceTier());
      const market = getRoomRepairPriceMarket(effectiveTier);
      if (typeof pricesData !== 'undefined' || typeof window !== 'undefined') {
        try {
          const data = (typeof pricesData !== 'undefined' && pricesData) || window.pricesData;
          const city = typeof currentCity !== 'undefined' ? currentCity : (window.currentCity || 'Москва');
          const price = Number(data?.prices?.[city]?.[market]?.[workId] || data?.prices?.['Москва']?.[market]?.[workId] || 0);
          if (price > 0) return price;
        } catch (error) {
          // Fall through to the existing global price helper.
        }
      }
      if (!priceTier && typeof getWorkPrice === 'function') {
        const price = Number(getWorkPrice(workId) || 0);
        return price > 0 ? price : fallbackPrice;
      }
      try {
        const city = typeof currentCity !== 'undefined' ? currentCity : '';
        const price = Number(activePricesData?.prices?.[city]?.[market]?.[workId] || 0);
        return price > 0 ? price : fallbackPrice;
      } catch (error) {
        return fallbackPrice;
      }
    }

    function getRoomRepairStructuredSelectionRule(selection = {}) {
      if (!selection?.workId || !selection?.targetCategory) return null;
      return {
        targetCategory: selection.targetCategory,
        workId: selection.workId,
        qtyMode: selection.qtyMode || 'parsedQty',
        fallbackQty: Number(selection.quantity || 0) || undefined
      };
    }

    function getRoomRepairStructuredSelectionQty(selection, room = {}, sections = {}, metrics = {}) {
      const rule = getRoomRepairStructuredSelectionRule(selection);
      if (!rule) return 0;
      const editableModes = ['parsedQty', 'climateUnits', 'floorArea', 'wallsArea', 'ceilingArea', 'perimeter', 'wetArea', 'electricalLength', 'lightingLength', 'doorThresholdCm'];
      if (Number(selection.quantity || 0) > 0 && editableModes.includes(rule.qtyMode)) {
        const min = ['parsedQty', 'climateUnits'].includes(rule.qtyMode) ? 1 : 0.1;
        return Math.max(min, Number(selection.quantity || 0));
      }
      return getRoomRepairBuilderRuleQty(rule, room, sections, metrics, selection.label || '');
    }

    function getRoomRepairWallpaperRapportFactor(structuredSelections = [], zoneKey = '') {
      const selection = (structuredSelections || []).find(item =>
        item.nodeKey === 'finishWalls'
        && item.source === 'detail'
        && item.detailGroup === 'Рисунок / раппорт'
        && (!zoneKey || item.zoneKey === zoneKey)
      );
      const value = normalizeRoomRepairBuilderLabel(selection?.label || '');
      if (/крупн.*рис|панно/.test(value)) return { factor: 1.35, label: 'крупный рисунок / панно' };
      if (/64/.test(value)) return { factor: 1.25, label: 'подгонка до 64 см' };
      if (/32/.test(value)) return { factor: 1.15, label: 'подгонка до 32 см' };
      if (/свободн|мелк.*рис/.test(value)) return { factor: 1.08, label: 'свободная стыковка' };
      if (/без.*подгон/.test(value)) return { factor: 1.05, label: 'без подгонки' };
      return { factor: 1, label: '' };
    }

    function getRoomRepairStructuredWorkLines(room = {}, sections = {}, structuredSelections = [], priceTier = '') {
      const metrics = getRoomRepairMetrics(room);
      const normalizedMetrics = {
        floorArea: Math.max(1, Number(metrics.floorArea || room.area || 0)),
        wallsArea: Math.max(1, Number(metrics.wallArea || room.wallsArea || 0)),
        ceilingArea: Math.max(1, Number(metrics.ceilingArea || room.ceilingArea || room.area || 0))
      };
      const normalizedSelections = normalizeRoomRepairStructuredSelections(structuredSelections);
      const floorInsetArea = normalizedSelections.reduce((sum, selection) => {
        if (selection.section !== 'floor') return sum;
        const label = normalizeRoomRepairBuilderLabel(selection.label);
        if (!/мозаик|декоративн.*встав/.test(label)) return sum;
        return sum + Math.max(0, Number(selection.quantity || 0));
      }, 0);
      return normalizedSelections
        .map(selection => {
          const rule = getRoomRepairStructuredSelectionRule(selection);
          if (!rule) return null;
          let qty = getRoomRepairStructuredSelectionQty(selection, room, sections, normalizedMetrics);
          if (selection.section === 'floor' && isRoomRepairPrimaryFloorCover(selection.label) && rule.qtyMode === 'floorArea' && floorInsetArea > 0) {
            qty = Math.max(0.1, Number((qty - floorInsetArea).toFixed(2)));
          }
          if (
            selection.section === 'walls'
            && selection.nodeKey === 'finishWalls'
            && selection.source === 'wall-zone-cover'
            && /обои|фотообои/i.test(selection.zoneCover || selection.label || '')
          ) {
            const rapport = getRoomRepairWallpaperRapportFactor(normalizedSelections, selection.zoneKey || '');
            if (rapport.factor > 1) qty = Number((qty * rapport.factor).toFixed(2));
            if (rapport.label) selection = { ...selection, roomRepairQtyTrace: `${getRoomRepairQuantityFormulaLabel({ ...selection, quantity: qty })} · раппорт: ${rapport.label}` };
          }
          const unitPrice = getRoomRepairWorkUnitPrice(rule.workId, priceTier);
          const enrichedSelection = { ...selection, quantity: qty };
          return {
            ...enrichedSelection,
            qty,
            unitPrice,
            total: Math.round(qty * unitPrice),
            roomRepairGroup: selection.groupLabel || '',
            roomRepairNode: selection.nodeLabel || '',
            roomRepairDetailGroup: selection.detailGroup || '',
            roomRepairZoneKey: selection.zoneKey || '',
            roomRepairZoneLabel: selection.zoneLabel || '',
            roomRepairZoneHint: selection.zoneHint || '',
            roomRepairQuantitySource: selection.quantitySource || '',
            roomRepairQtyMode: selection.qtyMode || rule.qtyMode || '',
            roomRepairMeasureLabel: getRoomRepairBuilderRuleMeasureLabel(rule),
            roomRepairQtyTrace: selection.roomRepairQtyTrace || getRoomRepairQuantityFormulaLabel(enrichedSelection),
            roomRepairPriceTier: normalizeRoomRepairRepairTier(priceTier || getRoomRepairObjectPriceTier()),
            roomRepairPriceMarket: getRoomRepairPriceMarket(priceTier || getRoomRepairObjectPriceTier())
          };
        })
        .filter(line => line && Number(line.qty || 0) > 0);
    }

    function estimateRoomRepairStructuredWorks(room = {}, sections = {}, structuredSelections = [], priceTier = '') {
      const lines = getRoomRepairStructuredWorkLines(room, sections, structuredSelections, priceTier);
      const priced = lines.filter(line => Number(line.unitPrice || 0) > 0);
      const total = priced.reduce((sum, line) => sum + Number(line.total || 0), 0);
      return {
        lines,
        priced,
        total: Math.round(total),
        unpricedCount: lines.length - priced.length
      };
    }

    function getRoomRepairMinimumRateLevel(room = {}) {
      const repairType = room.repairData?.repairTypeNew || 'clean';
      if (repairType === 'rough') return 'rough';
      if (repairType === 'whitebox_new') return 'whitebox';
      return 'finish';
    }

    function getRoomRepairMinimumStructuredWorks(room = {}, sections = {}) {
      const metrics = getRoomRepairMetrics(room);
      const level = getRoomRepairMinimumRateLevel(room);
      const floorRate = { rough: 2600, whitebox: 3300, finish: 4300 }[level];
      const wallRate = { rough: 700, whitebox: 900, finish: 1250 }[level];
      const ceilingRate = { rough: 600, whitebox: 750, finish: 1100 }[level];
      const electricalCount = (sections.electrical || []).length + (sections.lighting || []).length;
      const smartCount = (sections.smartHome || []).length;
      const plumbingCount = (sections.plumbing || []).length;
      const climateUnits = getRoomRepairClimateUnits(room, sections);
      let total = 0;
      if ((sections.floor || []).length) total += Math.max(1, Number(metrics.floorArea || room.area || 0)) * floorRate;
      if ((sections.walls || []).length) total += Math.max(1, Number(metrics.wallArea || room.wallsArea || 0)) * wallRate;
      if ((sections.ceiling || []).length) total += Math.max(1, Number(metrics.ceilingArea || room.ceilingArea || room.area || 0)) * ceilingRate;
      total += electricalCount * 2800;
      total += smartCount * 4500;
      total += plumbingCount * 5000;
      total += climateUnits * 7000;
      return Math.round(total);
    }

    function getRoomRepairMinimumStructuredMaterials(room = {}, sections = {}) {
      const metrics = getRoomRepairMetrics(room);
      const level = getRoomRepairMinimumRateLevel(room);
      const floorRate = { rough: 600, whitebox: 900, finish: 1800 }[level];
      const wallRate = { rough: 220, whitebox: 320, finish: 520 }[level];
      const ceilingRate = { rough: 180, whitebox: 260, finish: 440 }[level];
      const electricalCount = (sections.electrical || []).length + (sections.lighting || []).length;
      const smartCount = (sections.smartHome || []).length;
      const plumbingCount = (sections.plumbing || []).length;
      const climateUnits = getRoomRepairClimateUnits(room, sections);
      let total = 0;
      if ((sections.floor || []).length) total += Math.max(1, Number(metrics.floorArea || room.area || 0)) * floorRate;
      if ((sections.walls || []).length) total += Math.max(1, Number(metrics.wallArea || room.wallsArea || 0)) * wallRate;
      if ((sections.ceiling || []).length) total += Math.max(1, Number(metrics.ceilingArea || room.ceilingArea || room.area || 0)) * ceilingRate;
      total += electricalCount * 1400;
      total += smartCount * 3000;
      total += plumbingCount * 2800;
      total += climateUnits * 65000;
      return Math.round(total);
    }

    function estimateRoomRepairDraftTotals(room = {}, sections = {}, designMode = 'own', designStyle = '', structuredSelections = [], calculationMode = 'comfort', priceTier = '') {
      const floorArea = Math.max(0, Number(room.area || 0));
      const wallArea = Math.max(0, Number(room.wallsArea || (typeof calculateLivingRoomWallsArea === 'function' ? calculateLivingRoomWallsArea(room) : 0)));
      const ceilingArea = Math.max(0, Number((typeof getLivingRoomCeilingArea === 'function' ? getLivingRoomCeilingArea(room) : room.ceilingArea) || floorArea));
      const repairType = room.repairData?.repairTypeNew || 'clean';
      const repairMultiplier = repairType === 'turnkey' ? 1.22 : (repairType === 'whitebox_new' ? 0.78 : (repairType === 'rough' ? 0.62 : 1));
      const styleCanAffectFinish = !['rough', 'whitebox_new'].includes(repairType);
      const effectiveDesignStyle = styleCanAffectFinish ? designStyle : '';
      const styleMultiplier = designMode === 'style' && ['modern_classic', 'classic', 'art_deco', 'japanese'].includes(effectiveDesignStyle) ? 1.18 : 1;
      const effectivePriceTier = normalizeRoomRepairRepairTier(priceTier || calculationMode || getRoomRepairObjectPriceTier());
      const sectionCount = Object.values(sections || {}).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);
      if (!sectionCount) {
        return { works: 0, materials: 0, total: 0 };
      }
      const electricalCount = (sections.electrical || []).length + (sections.lighting || []).length;
      const smartCount = (sections.smartHome || []).length;
      const climateCount = (sections.climate || []).length;
      const climateUnits = getRoomRepairClimateUnits(room, sections);
      const plumbingCount = (sections.plumbing || []).length;
      const works = (
        floorArea * 8500 +
        wallArea * 1450 +
        ceilingArea * 1600 +
        electricalCount * 5200 +
        smartCount * 7800 +
        climateCount * 2200 +
        climateUnits * 8500 +
        plumbingCount * 6500 +
        sectionCount * 900
      ) * repairMultiplier * styleMultiplier;
      const fallbackMaterials = (
        floorArea * 5200 +
        wallArea * 820 +
        ceilingArea * 950 +
        electricalCount * 2400 +
        smartCount * 5200 +
        climateUnits * 65000 +
        plumbingCount * 3900
      ) * repairMultiplier * styleMultiplier;
      const structuredWorks = estimateRoomRepairStructuredWorks(room, sections, structuredSelections, effectivePriceTier);
      const materialProfile = calculateRoomRepairMaterialProfile(room, sections, designMode, effectiveDesignStyle, structuredSelections);
      const minimumWorks = getRoomRepairMinimumStructuredWorks(room, sections) * repairMultiplier * styleMultiplier;
      const minimumMaterials = getRoomRepairMinimumStructuredMaterials(room, sections) * repairMultiplier * styleMultiplier;
      const structuredFallback = structuredWorks.unpricedCount > 0
        ? structuredWorks.unpricedCount * 1200 * repairMultiplier * styleMultiplier
        : 0;
      const calculatedWorks = structuredWorks.total > 0
        ? Math.max(structuredWorks.total + structuredFallback, minimumWorks)
        : works;
      const materialsBase = materialProfile.lines.length
        ? Math.max(materialProfile.total, minimumMaterials)
        : fallbackMaterials;
      const materials = materialsBase;
      return {
        works: Math.round(calculatedWorks),
        materials: Math.round(materials),
        total: Math.round(calculatedWorks + materials),
        calculationMode: normalizeRoomRepairRepairTier(calculationMode || effectivePriceTier),
        priceTier: effectivePriceTier,
        priceMarket: getRoomRepairPriceMarket(effectivePriceTier),
        structuredWorks: {
          lines: structuredWorks.lines.length,
          priced: structuredWorks.priced.length,
          unpriced: structuredWorks.unpricedCount
        }
      };
    }

    function getRoomRepairPanelImpact(room = {}, sections = {}) {
      const area = Math.max(1, Number(room.area || 0));
      const electricalText = [
        ...(sections.electrical || []),
        ...(sections.lighting || []),
        ...(sections.smartHome || []),
        ...(sections.climate || [])
      ].join(' ').toLowerCase();
      const parsedSockets = (sections.electrical || [])
        .map(text => /розет/i.test(text) ? parseInt(text, 10) : 0)
        .filter(Number.isFinite)
        .reduce((max, value) => Math.max(max, value || 0), 0);
      const socketPoints = Math.max(parsedSockets || 0, (sections.electrical || []).length ? Math.ceil(area / 4) : 0);
      const lightPoints = Math.max((sections.lighting || []).length ? Math.ceil(area / 7) : 0, /свет|бра|подсвет|люстр/.test(electricalText) ? 1 : 0);
      const smartPoints = Math.max((sections.smartHome || []).length, /smart|умн|датчик|сценар|протеч/.test(electricalText) ? 1 : 0);
      const climateUnits = /кондиц|сплит|split|климат|трасс|дренаж|питан/.test(electricalText)
        ? Math.max(1, getRoomRepairClimateUnits(room, sections) || 1)
        : 0;
      const wetProtection = /протеч|сануз|влаж|гидроизоляц|кухн/.test(electricalText) || isRoomRepairWetRoom(room);
      const socketGroups = socketPoints > 0 ? Math.max(1, Math.ceil(socketPoints / 4)) : 0;
      const lightGroups = lightPoints > 0 ? Math.max(1, Math.ceil(lightPoints / 6)) : 0;
      const smartGroups = smartPoints > 0 ? Math.max(1, Math.ceil(smartPoints / 4)) : 0;
      const breakerGroups = socketGroups + lightGroups + climateUnits + smartGroups + (wetProtection && (socketGroups || lightGroups) ? 1 : 0);
      const loadKw = Number(Math.max(0, socketGroups * 1.2 + lightGroups * 0.4 + climateUnits * 1.5 + smartGroups * 0.25).toFixed(1));
      return {
        electricalPanel: breakerGroups > 0,
        smartPanel: smartPoints > 0,
        socketPoints,
        lightPoints,
        smartPoints,
        climateUnits,
        socketGroups,
        lightGroups,
        smartGroups,
        wetProtection,
        breakerGroups,
        reserveModules: Math.ceil(Math.max(0, breakerGroups) * 1.3),
        loadKw
      };
    }

    function rebuildRoomRepairPanelImpactSummary() {
      const summary = {
        rooms: [],
        electricalRooms: 0,
        smartRooms: 0,
        socketGroups: 0,
        lightGroups: 0,
        smartGroups: 0,
        climateUnits: 0,
        breakerGroups: 0,
        reserveModules: 0,
        loadKw: 0,
        updatedAt: new Date().toISOString()
      };
      ['living', 'nonliving'].forEach(roomId => {
        (roomData?.[roomId]?.floors || []).forEach((floor, floorIndex) => {
          (floor?.livingRooms || []).forEach((room, roomIndex) => {
            const impact = room?.repairCalculation?.panelImpact;
            if (!impact || (!impact.electricalPanel && !impact.smartPanel)) return;
            const label = room.chamberDisplayName || room.displayName || `Комната ${roomIndex + 1}`;
            summary.rooms.push({
              roomId,
              floorIndex,
              roomIndex,
              label,
              roomUid: room.roomUid || '',
              globalRoomNumber: room.globalRoomNumber || 0,
              floorRoomNumber: room.floorRoomNumber || 0,
              floorDisplayName: room.floorDisplayName || '',
              roomGroupName: room.roomGroupName || '',
              fullDisplayName: room.fullDisplayName || room.displayName || label,
              roomType: room.roomType || '',
              source: room.repairCalculation?.source || '',
              status: room.repairCalculation?.status || '',
              questSyncedAt: room.repairCalculation?.questSyncedAt || '',
              impact
            });
            if (impact.electricalPanel) summary.electricalRooms += 1;
            if (impact.smartPanel) summary.smartRooms += 1;
            summary.socketGroups += Number(impact.socketGroups || 0);
            summary.lightGroups += Number(impact.lightGroups || 0);
            summary.smartGroups += Number(impact.smartGroups || 0);
            summary.climateUnits += Number(impact.climateUnits || 0);
            summary.breakerGroups += Number(impact.breakerGroups || 0);
            summary.reserveModules += Number(impact.reserveModules || 0);
            summary.loadKw += Number(impact.loadKw || 0);
          });
        });
      });
      summary.loadKw = Number(summary.loadKw.toFixed(1));
      roomData.roomRepairPanelImpact = summary;
      return summary;
    }

    function updateRoomRepairSolutionPackageUi(packageValue = '') {
      const meta = getRoomRepairSolutionPackageMeta(packageValue || getRoomRepairDraftShell()?.dataset.repairSolutionPackage || 'comfort');
      const shell = getRoomRepairDraftShell();
      if (shell) shell.dataset.repairSolutionPackage = meta.value;
      const modeInput = document.getElementById('roomRepairCalculationMode');
      if (modeInput) modeInput.value = meta.mode || modeInput.value || 'comfort';
      document.querySelectorAll('[data-room-repair-package]').forEach(button => {
        button.classList.toggle('is-active', button.dataset.roomRepairPackage === meta.value);
      });
      const contextPackage = document.getElementById('roomRepairContextPackage');
      if (contextPackage) contextPackage.textContent = meta.label;
      const priceTierSelect = document.getElementById('roomRepairPriceTier');
      const tierMeta = getRoomRepairPriceTierMeta(priceTierSelect?.value || shell?.dataset.repairPriceTier || 'inherit');
      const contextMode = document.getElementById('roomRepairContextMode');
      if (contextMode) contextMode.textContent = tierMeta.label;
    }

    function getRoomRepairDraftSolutionPackage() {
      const shell = getRoomRepairDraftShell();
      return normalizeRoomRepairRepairTier(shell?.dataset.repairSolutionPackage || getRoomRepairSolutionPackageForMode(document.getElementById('roomRepairCalculationMode')?.value || 'comfort'));
    }

    function getRoomRepairDraftPriceTier() {
      const shell = getRoomRepairDraftShell();
      const value = document.getElementById('roomRepairPriceTier')?.value || shell?.dataset.repairPriceTier || 'inherit';
      return value === 'inherit' ? 'inherit' : normalizeRoomRepairRepairTier(value);
    }

    function getRoomRepairDraftEffectivePriceTier() {
      return getRoomRepairPriceTierMeta(getRoomRepairDraftPriceTier()).effectiveValue;
    }

    function updateRoomRepairPriceTier(value = 'inherit') {
      const shell = getRoomRepairDraftShell();
      const tier = value === 'inherit' ? 'inherit' : normalizeRoomRepairRepairTier(value);
      if (shell) shell.dataset.repairPriceTier = tier;
      markRoomRepairDraftManual();
      refreshRoomRepairDraftPreview(true);
    }

    window.updateRoomRepairPriceTier = updateRoomRepairPriceTier;

    function getRoomRepairCurrentDesignDraft() {
      const mode = document.getElementById('roomRepairDesignMode')?.value || 'own';
      return {
        mode,
        style: mode === 'style' ? (document.getElementById('roomRepairDesignStyle')?.value || '') : '',
        label: mode === 'style' ? getRoomRepairStyleLabel(document.getElementById('roomRepairDesignStyle')?.value || '') : 'Свой дизайн'
      };
    }

    function getRoomRepairDraftSectionsCount() {
      return getRoomRepairSectionConfig().reduce((sum, config) => {
        const textarea = document.querySelector(`[data-repair-section="${config.key}"]`);
        return sum + splitRoomRepairSectionTextarea(textarea?.value || '').length;
      }, 0);
    }

    function updateRoomRepairDesignSummaryUi() {
      const shell = getRoomRepairDraftShell();
      const design = getRoomRepairCurrentDesignDraft();
      const packageLabel = getRoomRepairSolutionPackageMeta(getRoomRepairDraftSolutionPackage()).label;
      const tierLabel = getRoomRepairPriceTierMeta(getRoomRepairDraftPriceTier()).label;
      const compactText = document.getElementById('roomRepairDesignCompactText');
      if (compactText) compactText.innerHTML = `<i class="fas fa-sliders"></i> ${escapeRoomRepairHtml(packageLabel)} · ${escapeRoomRepairHtml(tierLabel)} · ${escapeRoomRepairHtml(design.label)}`;
      const contextDesignEl = document.getElementById('roomRepairContextDesign');
      if (contextDesignEl) contextDesignEl.textContent = design.label;
      const appliedMode = shell?.dataset.appliedDesignMode || design.mode;
      const appliedStyle = shell?.dataset.appliedDesignStyle || '';
      const designChanged = design.mode !== appliedMode || design.style !== appliedStyle;
      if (shell) shell.dataset.repairProposalStale = designChanged ? 'style' : '';
      updateRoomRepairAutoActionState();
    }

    function updateRoomRepairDesignDraft() {
      const styleWrap = document.getElementById('roomRepairDesignStyleWrap');
      const design = getRoomRepairCurrentDesignDraft();
      if (styleWrap) styleWrap.classList.toggle('is-hidden', design.mode !== 'style');
      updateRoomRepairDesignSummaryUi();
      refreshRoomRepairDraftPreview(false);
    }

    window.updateRoomRepairDesignDraft = updateRoomRepairDesignDraft;

    function getRoomRepairAutoActionState() {
      const shell = getRoomRepairDraftShell();
      const hasItems = getRoomRepairDraftSectionsCount() > 0;
      const isManual = shell?.dataset.repairDraftManual === 'true';
      const staleReason = shell?.dataset.repairProposalStale || '';
      if (!hasItems) {
        return {
          disabled: false,
          icon: 'fa-wand-magic-sparkles',
          label: 'Предложить состав',
          hint: 'Выберите пакет или нажмите, чтобы собрать состав по текущим настройкам.'
        };
      }
      if (staleReason === 'style') {
        return {
          disabled: false,
          icon: 'fa-palette',
          label: 'Обновить по стилю',
          hint: 'Стиль изменился. Обновите предложение, чтобы применить материалы и сценарии под стиль.'
        };
      }
      if (isManual) {
        return {
          disabled: false,
          icon: 'fa-rotate',
          label: 'Пересобрать состав',
          hint: 'Есть ручные правки. Обновление заменит текущий состав выбранным пакетом.'
        };
      }
      return {
        disabled: true,
        icon: 'fa-circle-check',
        label: 'Предложение актуально',
        hint: 'Состав уже собран по выбранному пакету и текущим настройкам.'
      };
    }

    function updateRoomRepairAutoActionState() {
      const button = document.getElementById('roomRepairAutoAction');
      const hint = document.getElementById('roomRepairAutoHint');
      const state = getRoomRepairAutoActionState();
      if (button) {
        button.disabled = !!state.disabled;
        button.classList.toggle('is-current', !!state.disabled);
        button.innerHTML = `<i class="fas ${state.icon}"></i>${escapeRoomRepairHtml(state.label)}`;
      }
      if (hint) hint.textContent = state.hint;
    }

    function getRoomRepairAutoFloorDetailLabels(cover = '', packageValue = 'comfort', designStyle = '') {
      const coverKey = getRoomRepairFloorCoverKey(cover);
      const isPremium = ['business', 'premium'].includes(packageValue);
      const formatKey = getRoomRepairDefaultFloorFormatKey(cover) || (coverKey === 'cork' ? 'cork_lock' : 'plank');
      const formatLabels = {
        plank: 'Формат: доска / планка',
        tile_module: 'Формат: плитка / модуль',
        roll: 'Формат: рулонное покрытие',
        polymer_floor: 'Формат: полимерные полы',
        cork_lock: 'Формат: замковая пробка',
        cork_glue: 'Формат: клеевая пробка'
      };
      const typeLabels = {
        laminate: isPremium ? 'Тип: водостойкий ламинат' : 'Тип: влагостойкий ламинат',
        quartz: packageValue === 'budget' ? 'Тип: клеевая LVT-плитка' : 'Тип: замковый SPC',
        parquet_board: isPremium ? 'Тип: масляно-восковое покрытие' : 'Тип: лакированное матовое / полуматовое покрытие',
        engineered: isPremium ? 'Тип: масляно-восковое покрытие' : 'Тип: лакированное матовое / полуматовое покрытие',
        parquet: isPremium ? 'Тип: покрытие натуральным маслом' : 'Тип: лакированное покрытие',
        porcelain: 'Тип: матовая поверхность',
        ceramic: 'Тип: матовая поверхность',
        linoleum: packageValue === 'budget' ? 'Тип: бытовой линолеум' : 'Тип: полукоммерческий линолеум',
        self_leveling: isPremium ? 'Тип: декоративный наливной пол' : 'Тип: однотонный наливной пол',
        cork: 'Тип: замковая пробка с лаком',
        cork_lock: 'Тип: замковая пробка с лаком',
        cork_glue: 'Тип: клеевая пробка с заводским лаком'
      };
      const classLabels = {
        laminate: packageValue === 'budget' ? 'Класс: 32 для активной жилой зоны' : 'Класс: 33 коммерческий легкий',
        quartz: packageValue === 'premium' ? 'Класс: 34 повышенная нагрузка' : (packageValue === 'business' ? 'Класс: 33 коммерческий легкий' : 'Класс: 32 для активной жилой зоны'),
        porcelain: packageValue === 'premium' ? 'Класс: PEI IV для активной зоны' : 'Класс: PEI III для жилых помещений',
        ceramic: packageValue === 'premium' ? 'Класс: PEI IV для активной зоны' : 'Класс: PEI III для жилых помещений',
        linoleum: packageValue === 'budget' ? 'Класс: 31 бытовой усиленный' : 'Класс: 32 для активной жилой зоны',
        cork: packageValue === 'business' || packageValue === 'premium' ? 'Класс: 33 коммерческий легкий' : 'Класс: 32 для активной жилой зоны',
        cork_lock: packageValue === 'business' || packageValue === 'premium' ? 'Класс: 33 коммерческий легкий' : 'Класс: 32 для активной жилой зоны',
        cork_glue: packageValue === 'business' || packageValue === 'premium' ? 'Класс: 33 коммерческий легкий' : 'Класс: 32 для активной жилой зоны'
      };
      const shapeKey = getRoomRepairDefaultFloorShapeKey(cover, formatKey) || 'rectangle';
      const sizeLabel = packageValue === 'premium' ? 'Размер: крупный формат' : (packageValue === 'business' ? 'Размер: широкий формат' : 'Размер: стандартный формат');
      const colorLabel = /classic|neoclassic/i.test(designStyle)
        ? 'Цвет: натуральный дуб'
        : (/loft|minimal/i.test(designStyle) ? 'Цвет: под бетон' : (isPremium ? 'Цвет: натуральный дуб' : 'Цвет: светло-коричневый'));
      const installLabel = formatKey === 'cork_lock'
        ? 'Плавающий способ укладки'
        : (['tile_module', 'large_tile', 'cork_glue'].includes(formatKey) ? 'Клеевой способ укладки' : 'Базовая прямая укладка');
      return [
        { group: 'Формат покрытия', label: formatLabels[formatKey] || 'Формат: доска / планка' },
        ...(classLabels[coverKey] ? [{ group: 'Класс покрытия', label: classLabels[coverKey] }] : []),
        { group: 'Тип покрытия', label: typeLabels[coverKey] || typeLabels.cork },
        { group: 'Форма покрытия', label: shapeKey === 'square' ? 'Форма: квадратная' : 'Форма: прямоугольная' },
        { group: 'Размер покрытия', label: sizeLabel },
        { group: 'Цветовая гамма', label: colorLabel },
        { group: 'Способ укладки', label: installLabel }
      ];
    }

    function enrichRoomRepairAutoFloorDetails(sections = {}, room = {}, packageValue = 'comfort', designStyle = '') {
      const floorItems = sections.floor || [];
      const cover = getRoomRepairSelectedPrimaryFloorCover(floorItems);
      if (!cover) return [];
      const node = getRoomRepairBuilderNode('finishFloor');
      const metrics = getRoomRepairMetrics(room);
      const area = Number(Math.max(0.1, Number(metrics.floorArea || room.area || 1)).toFixed(2));
      const zone = {
        id: 'floor_zone_1',
        cover: getRoomRepairSelectedCoreLabel(cover),
        area,
        zoneType: 'full',
        zoneLabel: 'Вся комната',
        zoneHint: 'Полный объем пола комнаты'
      };
      const zoneLabel = formatRoomRepairFloorZoneLabel(zone);
      const detailItems = getRoomRepairAutoFloorDetailLabels(cover, packageValue, designStyle);
      sections.floor = [zoneLabel, ...floorItems.filter(item => !isRoomRepairPrimaryFloorCover(item)), ...detailItems.map(item => item.label)];
      const zoneSelection = createRoomRepairBuilderStructuredSelection(node, zoneLabel, {
        source: 'floor-zone-cover',
        quantity: area,
        quantityLabel: 'м²',
        quantitySource: 'full',
        zoneKey: zone.id,
        zoneLabel: zone.zoneLabel,
        zoneHint: zone.zoneHint,
        zoneDefaultQty: area
      });
      const detailSelections = detailItems.map(item => createRoomRepairBuilderStructuredSelection(node, item.label, {
        source: 'detail',
        detailGroup: item.group,
        zoneKey: zone.id,
        zoneLabel: zone.zoneLabel,
        zoneHint: zone.zoneHint,
        zoneDefaultQty: area
      }));
      return [zoneSelection, ...detailSelections];
    }

    function getRoomRepairAutoWallDetailLabels(cover = '', packageValue = 'comfort', designStyle = '') {
      const value = normalizeRoomRepairBuilderLabel(cover);
      const isPremium = ['business', 'premium'].includes(packageValue);
      const isTile = /плитк|керамогранит/.test(value);
      const isSoftPanel = /мягк/.test(value);
      const isGypsumPanel = /гипсов|3d/.test(value);
      const isSlatPanel = /рееч/.test(value);
      const isMdfPanel = /мдф/.test(value);
      const isBambooPanel = /бамбук/.test(value);
      const isFlexMarble = /гибк|мрамор/.test(value);
      const isStoneVeneer = /камень|шпон/.test(value);
      const isGlassPanel = /стекл/.test(value);
      const isMirrorPanel = /зеркал/.test(value);
      const isPanel = /панел|мдф|рееч|стекл|зеркал|камень|шпон|бамбук|мрамор|гибк|гипсов|3d/.test(value);
      const isWallpaper = /обои/.test(value);
      const isPlaster = /штукатур|микроцемент/.test(value);
      const colorLabel = /classic|neoclassic|art_deco/i.test(designStyle)
        ? 'Цвет: кремовый'
        : (/loft|minimal/i.test(designStyle) ? 'Цвет: под бетон' : (isPremium ? 'Цвет: индивидуальный оттенок' : 'Цвет: бежевый'));
      const items = [];
      if (isTile) {
        items.push({ group: 'Формат покрытия', label: packageValue === 'premium' ? 'Формат: крупноформатная плита' : 'Формат: плитка / модуль' });
        items.push({ group: 'Класс покрытия', label: packageValue === 'premium' ? 'Класс: PEI IV для активной зоны' : 'Класс: влагостойкое покрытие' });
        items.push({ group: 'Тип покрытия', label: 'Тип: матовая поверхность' });
        items.push({ group: 'Цветовая гамма', label: colorLabel });
        items.push({ group: 'Фактура', label: isPremium ? 'Фактура: под камень' : 'Фактура: матовая' });
        items.push({ group: 'Способ монтажа / нанесения', label: 'Клеевой монтаж на стену' });
        return items;
      }
      if (isPanel) {
        const formatLabel = isSoftPanel
          ? 'Формат: мягкие панели простой формы'
          : ((isSlatPanel || isBambooPanel)
            ? 'Формат: рейки / ламели'
            : (isFlexMarble ? 'Формат: листовой гибкий камень' : 'Формат: плитка / модуль'));
        let typeLabel = 'Тип: шпонированные панели';
        if (isSoftPanel) typeLabel = 'Тип: мягкие панели с обивкой из велюра';
        else if (isFlexMarble) typeLabel = 'Тип: гибкий мрамор на стену';
        else if (isStoneVeneer) typeLabel = 'Тип: декоративный каменный шпон';
        else if (isBambooPanel) typeLabel = 'Тип: бамбуковые панели / ламели';
        else if (isGlassPanel) typeLabel = 'Тип: закаленное стекло';
        else if (isMirrorPanel) typeLabel = 'Тип: зеркальное полотно';
        else if (isGypsumPanel) typeLabel = 'Тип: гипсовые 3D панели под покраску';
        else if (isSlatPanel) typeLabel = 'Тип: реечные панели / ламели';
        const panelColor = (isMdfPanel || isSlatPanel || isBambooPanel)
          ? 'Цвет: натуральный дуб'
          : ((isStoneVeneer || isFlexMarble) ? 'Цвет: под камень' : colorLabel);
        const textureLabel = isSoftPanel
          ? 'Фактура: мягкая тканевая'
          : ((isStoneVeneer || isFlexMarble)
            ? 'Фактура: под камень'
            : (isBambooPanel
              ? 'Фактура: бамбук натуральный'
              : (isGlassPanel || isMirrorPanel ? 'Фактура: гладкая' : (isGypsumPanel ? 'Фактура: рельефная' : 'Фактура: под дерево'))));
        items.push({ group: 'Формат покрытия', label: formatLabel });
        items.push({ group: 'Класс покрытия', label: isSoftPanel ? 'Класс: базовая жилая зона' : (packageValue === 'budget' ? 'Класс: базовая жилая зона' : 'Класс: износостойкое покрытие') });
        items.push({ group: 'Тип покрытия', label: typeLabel });
        items.push({ group: 'Цветовая гамма', label: panelColor });
        items.push({ group: 'Фактура', label: textureLabel });
        items.push({ group: 'Способ монтажа / нанесения', label: isSoftPanel ? 'Монтаж мягких панелей на скрытый крепеж' : (isPremium ? 'Скрытый крепеж панелей' : 'Монтаж панелей на подсистему') });
        return items;
      }
      if (isWallpaper) {
        items.push({ group: 'Формат покрытия', label: 'Формат: рулонное покрытие' });
        items.push({ group: 'Класс покрытия', label: packageValue === 'budget' ? 'Класс: базовая жилая зона' : 'Класс: моющееся покрытие' });
        items.push({ group: 'Тип покрытия', label: packageValue === 'budget' ? 'Тип: флизелиновые обои' : 'Тип: виниловые моющиеся обои' });
        items.push({ group: 'Рисунок / раппорт', label: packageValue === 'premium' ? 'Раппорт: подгонка рисунка до 64 см' : 'Раппорт: без подгонки рисунка' });
        items.push({ group: 'Размер покрытия', label: packageValue === 'budget' ? 'Размер: стандартный рулон 0.53 x 10.05 м' : 'Размер: широкий рулон 1.06 x 10.05 м' });
        items.push({ group: 'Цветовая гамма', label: colorLabel });
        items.push({ group: 'Фактура', label: 'Фактура: матовая' });
        items.push({ group: 'Способ монтажа / нанесения', label: 'Поклейка обоев' });
        return items;
      }
      if (isPlaster) {
        const isMicrocement = /микроцемент/.test(value);
        const plasterType = isMicrocement
          ? 'Тип: микроцемент влагостойкий'
          : (packageValue === 'premium'
            ? 'Тип: Marmorino Carrara / венецианская штукатурка'
            : (packageValue === 'business'
              ? 'Тип: Эффект шелка / Damasco'
              : 'Тип: Travertino / травертин'));
        const plasterSystem = isMicrocement
          ? 'Система: декоративный бетон / loft'
          : (packageValue === 'premium'
            ? 'Система: Marmorino Carrara / каррарский мрамор'
            : (packageValue === 'business'
              ? 'Система: Damasco / мокрый шелк'
              : 'Система: травертин с прожилками'));
        const plasterColor = isMicrocement
          ? 'Цвет: Concrete Grigio Medio · RAL 7044 ориентир'
          : (packageValue === 'premium'
            ? 'Цвет: Carrara Marmorino · Settef Marmorino Carrara'
            : (packageValue === 'business'
              ? 'Цвет: Seta Champagne · перламутровый шелк'
              : colorLabel));
        const plasterTexture = isMicrocement
          ? 'Фактура: под бетон'
          : (packageValue === 'premium'
            ? 'Фактура: гладкий мраморный глянец'
            : (packageValue === 'business'
              ? 'Фактура: мягкий шелковый перелив'
              : 'Фактура: травертин с горизонтальными прожилками'));
        items.push({ group: 'Формат покрытия', label: 'Формат: нанесение сплошным слоем' });
        items.push({ group: 'Тип покрытия', label: plasterType });
        items.push({ group: 'Система / эффект', label: plasterSystem });
        items.push({ group: 'Цветовая гамма', label: plasterColor });
        items.push({ group: 'Фактура', label: plasterTexture });
        items.push({ group: 'Защитный финиш', label: isMicrocement ? 'Финиш: водоотталкивающая защита UMBRELLA' : (packageValue === 'premium' ? 'Финиш: воск SPECCHIO CERA / глянцевая защита' : 'Финиш: матовая лессировка VELATURA') });
        items.push({ group: 'Способ монтажа / нанесения', label: 'Нанесение декоративной техники' });
        return items;
      }
      items.push({ group: 'Формат покрытия', label: 'Формат: нанесение сплошным слоем' });
      items.push({ group: 'Класс покрытия', label: packageValue === 'business' || packageValue === 'premium' ? 'Класс: износостойкое покрытие' : 'Класс: моющееся покрытие' });
      items.push({ group: 'Тип покрытия', label: packageValue === 'business' || packageValue === 'premium' ? 'Тип: антивандальная краска' : 'Тип: матовая моющаяся краска' });
      items.push({ group: 'Цветовая гамма', label: colorLabel });
      items.push({ group: 'Фактура', label: packageValue === 'premium' ? 'Фактура: шелковистая' : 'Фактура: матовая' });
      items.push({ group: 'Способ монтажа / нанесения', label: 'Нанесение валиком' });
      return items;
    }

    function enrichRoomRepairAutoWallDetails(sections = {}, room = {}, packageValue = 'comfort', designStyle = '') {
      const wallItems = sections.walls || [];
      const cover = getRoomRepairSelectedPrimaryWallCover(wallItems);
      if (!cover) return [];
      const node = getRoomRepairBuilderNode('finishWalls');
      const metrics = getRoomRepairMetrics(room);
      const area = Number(Math.max(0.1, Number(metrics.wallsArea || room.wallsArea || 1)).toFixed(2));
      const zone = {
        id: 'wall_zone_1',
        cover: getRoomRepairSelectedCoreLabel(cover),
        area,
        zoneType: 'full',
        zoneLabel: 'Все стены',
        zoneHint: 'Полная площадь стен без запаса'
      };
      const zoneLabel = formatRoomRepairWallZoneLabel(zone);
      const detailItems = getRoomRepairAutoWallDetailLabels(cover, packageValue, designStyle);
      sections.walls = [zoneLabel, ...wallItems.filter(item => !isRoomRepairPrimaryWallCover(item)), ...detailItems.map(item => item.label)];
      const zoneSelection = createRoomRepairBuilderStructuredSelection(node, zoneLabel, {
        source: 'wall-zone-cover',
        quantity: area,
        quantityLabel: 'м²',
        quantitySource: 'full',
        zoneKey: zone.id,
        zoneLabel: zone.zoneLabel,
        zoneHint: zone.zoneHint,
        zoneDefaultQty: area
      });
      const detailSelections = detailItems.map(item => createRoomRepairBuilderStructuredSelection(node, item.label, {
        source: 'detail',
        detailGroup: item.group,
        zoneKey: zone.id,
        zoneLabel: zone.zoneLabel,
        zoneHint: zone.zoneHint,
        zoneDefaultQty: area
      }));
      return [zoneSelection, ...detailSelections];
    }

    function fillRoomRepairAutoDraft(roomId, floorIndex, roomIndex, packageValue = '') {
      const room = roomData?.[roomId]?.floors?.[floorIndex]?.livingRooms?.[roomIndex];
      if (!room) return;
      const solutionPackage = packageValue || getRoomRepairDraftSolutionPackage();
      const packageMeta = getRoomRepairSolutionPackageMeta(solutionPackage);
      pushRoomRepairDraftHistory(`Пакет: ${packageMeta.label}`);
      const designMode = document.getElementById('roomRepairDesignMode')?.value || 'own';
      const designStyle = designMode === 'style' ? (document.getElementById('roomRepairDesignStyle')?.value || '') : '';
      const modeSelect = document.getElementById('roomRepairCalculationMode');
      if (modeSelect) modeSelect.value = packageMeta.mode;
      const priceTierSelect = document.getElementById('roomRepairPriceTier');
      if (priceTierSelect) priceTierSelect.value = packageMeta.value;
      const sections = buildRoomRepairSolutionPackageProfile(room, designMode, designStyle, packageMeta.value);
      const autoStructuredSelections = enrichRoomRepairAutoFloorDetails(sections, room, packageMeta.value, designStyle);
      autoStructuredSelections.push(...enrichRoomRepairAutoWallDetails(sections, room, packageMeta.value, designStyle));
      getRoomRepairSectionConfig().forEach(config => {
        const textarea = document.querySelector(`[data-repair-section="${config.key}"]`);
        if (textarea) textarea.value = (sections[config.key] || []).join('\n');
      });
      setRoomRepairDraftStructuredSelections(autoStructuredSelections);
      const shell = getRoomRepairDraftShell();
      if (shell) {
        shell.dataset.repairDraftManual = 'false';
        shell.dataset.repairDraftSource = 'auto';
        shell.dataset.repairSolutionPackage = packageMeta.value;
        shell.dataset.repairPriceTier = packageMeta.value;
        shell.dataset.appliedDesignMode = designMode;
        shell.dataset.appliedDesignStyle = designStyle;
        shell.dataset.repairProposalStale = '';
        shell.dataset.activeFloorZone = 'floor_zone_1';
        shell.dataset.activeWallZone = 'wall_zone_1';
        shell.dataset.activeCeilingZone = 'ceiling_zone_1';
        shell.dataset.activeCeilingLayer = '1';
        shell.dataset.builderOpenGroups = '';
        shell.dataset.builderClosedGroups = '';
      }
      updateRoomRepairSolutionPackageUi(packageMeta.value);
      const manualHint = document.getElementById('roomRepairManualHint');
      if (manualHint) manualHint.textContent = `Состав обновлен пакетом “${packageMeta.label}”. Без ручных правок сохранится как “Автоматом”.`;
      refreshRoomRepairDraftPreview(false);
      refreshRoomRepairBuilderShellPreservingScroll(true);
      const hint = document.getElementById('roomRepairAutoHint');
      if (hint) {
        const structuredSelections = collectRoomRepairDraftStructuredSelections(true);
        const calculationMode = document.getElementById('roomRepairCalculationMode')?.value || packageMeta.value;
        const totals = estimateRoomRepairDraftTotals(room, sections, designMode, designStyle, structuredSelections, calculationMode, getRoomRepairDraftEffectivePriceTier());
        const materialProfile = calculateRoomRepairMaterialProfile(room, sections, designMode, designStyle, structuredSelections);
        const impact = getRoomRepairPanelImpact(room, sections);
        const panelText = impact.electricalPanel
          ? ` Щиты: ${impact.breakerGroups} гр., ${impact.loadKw} кВт${impact.smartPanel ? ', SMART' : ''}.`
          : '';
        const tierLabel = getRoomRepairPriceTierMeta(getRoomRepairDraftPriceTier()).label;
        const materialText = materialProfile.lines.length ? ` Материалы: ${materialProfile.lines.length} поз., ${formatRoomRepairMoney(totals.materials)}.` : '';
        hint.textContent = `Пакет “${packageMeta.label}”: ${getRoomRepairTypeLabel(room)}, ${designMode === 'style' ? getRoomRepairStyleLabel(designStyle) : 'свой дизайн'}, уровень расчета: ${tierLabel}. Предварительно: ${formatRoomRepairMoney(totals.total)}.${materialText}${panelText}`;
      }
      updateRoomRepairDesignSummaryUi();
      updateRoomRepairAutoActionState();
    }

    window.fillRoomRepairAutoDraft = fillRoomRepairAutoDraft;

    function getRoomRepairWorkIds(text, category) {
      const structuredRule = getRoomRepairBuilderWorkRuleByCategory(category, text);
      if (structuredRule?.workId) return structuredRule.workId;
      const value = String(text || '').toLowerCase();
      const maps = {
        demolitionFloor: [
          [/керамогранит|плитк/, 'floor_porcelain'],
          [/инженер/, 'floor_engineered'],
          [/ламинат/, 'floor_laminate'],
          [/стяжк/, 'floor_csp_5cm'],
          [/налив/, 'floor_self_leveling']
        ],
        demolitionWall: [
          [/керамогранит|плитк/, 'wall_porcelain'],
          [/обо/, 'wall_wallpaper'],
          [/краск|окрас/, 'wall_paint'],
          [/штукатур/, 'wall_plaster_3cm'],
          [/панел|рейк/, 'wall_panels']
        ],
        demolitionCeiling: [
          [/натяж/, 'ceiling_stretch'],
          [/гкл|гипсокартон/, 'ceiling_gk'],
          [/краск|окрас/, 'ceiling_paint'],
          [/штукатур/, 'ceiling_plaster']
        ],
        floor: [
          [/керамогранит|плитк/, 'floor_porcelain'],
          [/инженер/, 'floor_engineered'],
          [/кварц|spc|винил/, 'floor_quartzvinyl'],
          [/ламинат/, 'floor_laminate'],
          [/паркет/, 'floor_parquet_board'],
          [/налив/, 'floor_self_leveling']
        ],
        wall: [
          [/керамогранит|плитк/, 'wall_porcelain'],
          [/обо/, 'wall_wallpaper'],
          [/декоратив|акцент/, 'wall_decorative_plaster'],
          [/микроцемент/, 'wall_microcement'],
          [/панел|рейк/, 'wall_mdf_panels'],
          [/окрас|краск/, 'wall_paint']
        ],
        ceiling: [
          [/гкл|гипсокартон/, 'ceiling_gk'],
          [/тенев|парящ/, 'ceiling_stretch_shadow'],
          [/натяж/, 'ceiling_stretch'],
          [/карниз|ниш/, 'ceiling_cornice_hidden'],
          [/светов|линии/, 'ceiling_led_profile'],
          [/окрас|краск/, 'ceiling_paint']
        ],
        electrical: [
          [/розет/, 'socket_install'],
          [/выключ/, 'switch_install'],
          [/лини|кабел|провод/, 'wiring_hidden'],
          [/подрозет/, 'subsocket'],
          [/слаботоч|интернет|тв/, 'weak_current']
        ],
        lighting: [
          [/бра|настенн/, 'wall_light'],
          [/лент|подсвет/, 'led_strip'],
          [/точеч/, 'spot_light'],
          [/люстр/, 'chandelier_install'],
          [/свет/, 'light_install']
        ],
        smartHome: [
          [/датчик.*движ|присутств/, 'smart_motion_sensor'],
          [/протеч/, 'smart_home'],
          [/штор/, 'smart_curtain'],
          [/сценар|умн/, 'smart_home_setup']
        ],
        climate: [
          [/дренаж/, 'ac_drain'],
          [/питан/, 'ac_power'],
          [/трасс|кондиц/, 'ac_route'],
          [/вент/, 'vent_fan_install']
        ],
        plumbing: [
          [/скрыт.*сантех|скрыт.*смесител/, 'eng_water_hidden_mixer_rough_in'],
          [/поддон.*плит|душев.*поддон.*вровень|душев.*поддон.*бортик/, 'rough_floor_shower_tray_slope_base'],
          [/душев.*поддон|готов.*поддон/, 'eng_water_shower_tray_install'],
          [/канализ|слив/, 'drain_point'],
          [/гидроизоляц/, 'rough_wall_rough_waterproof_coat'],
          [/мойк|водоснаб|вода/, 'water_point'],
          [/смесител/, 'mixer_connection']
        ]
      };
      const list = maps[category] || [];
      return list.find(([pattern]) => pattern.test(value))?.[1] || '';
    }

    function getRoomRepairBuilderWorkRules() {
      return [
        { sections: ['floor'], categories: ['floorLeveling'], pattern: /полусух/i, targetCategory: 'floorLeveling', workId: 'rough_floor_level_halfs', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floorLeveling'], pattern: /гидроизоляц/i, targetCategory: 'floorLeveling', workId: 'rough_floor_level_waterproof', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floorLeveling', 'floor'], pattern: /шумоизоляц/i, targetCategory: 'floorLeveling', workId: 'rough_floor_level_sound', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floorLeveling', 'floor'], pattern: /тепл.*пол|подготовка.*тепл/i, targetCategory: 'floorLeveling', workId: 'rough_floor_level_warm_prep', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /запил.*45|45.*град/i, targetCategory: 'floor', workId: 'finish_floor_tile_miter_45', qtyMode: 'perimeter' },
        { sections: ['floor'], categories: ['floor'], pattern: /мозаик/i, targetCategory: 'floor', workId: 'finish_floor_decor_mosaic', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /бордюр/i, targetCategory: 'floor', workId: 'finish_floor_tile_border', qtyMode: 'perimeter' },
        { sections: ['floor'], categories: ['floor'], pattern: /декоратив.*встав/i, targetCategory: 'floor', workId: 'finish_floor_decor_insert', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /мозаик.*душ|душ.*мозаик/i, targetCategory: 'floor', workId: 'finish_floor_shower_tray_tile_mosaic', qtyMode: 'wetArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /противоскольз|матов.*плит|душев.*плит/i, targetCategory: 'floor', workId: 'finish_floor_shower_tray_tile_matte', qtyMode: 'wetArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /горяч.*свар/i, targetCategory: 'floor', workId: 'finish_floor_linoleum_hot_weld', qtyMode: 'perimeter' },
        { sections: ['floor'], categories: ['floor'], pattern: /частичн.*приклей|свободн.*уклад.*линолеум|линолеум.*без кле/i, targetCategory: 'floor', workId: 'finish_floor_floor_linoleum_free', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /коммерческ.*линолеум|линолеум.*клей|линолеум/i, targetCategory: 'floor', workId: 'finish_floor_floor_linoleum_glue', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /ковролин/i, targetCategory: 'floor', workId: 'finish_floor_floor_carpet_glue', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /эпоксид/i, targetCategory: 'floor', workId: 'finish_floor_floor_epoxy', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /полиуретан/i, targetCategory: 'floor', workId: 'finish_floor_floor_polyurethane', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /^(\d+[,.]?\d*\s*м²:\s*)?наливной пол$/i, targetCategory: 'floor', workId: 'finish_floor_floor_polyurethane', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floorLeveling'], pattern: /стяжк|основан|подготов/i, targetCategory: 'floorLeveling', workId: 'rough_floor_level_csp_5cm_mech', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floorLeveling', 'floor'], pattern: /налив/i, targetCategory: 'floorLeveling', workId: 'rough_floor_level_self', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /крупноформат/i, targetCategory: 'floor', workId: 'finish_floor_floor_porcelain_large', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /паркет.*елк/i, targetCategory: 'floor', workId: 'finish_floor_floor_parquet_herringbone', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /ламинат/i, targetCategory: 'floor', workId: 'finish_floor_floor_laminate', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /паркетная доска/i, targetCategory: 'floor', workId: 'finish_floor_floor_parquet', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /паркет/i, targetCategory: 'floor', workId: 'finish_floor_floor_parquet', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /микроцемент/i, targetCategory: 'floor', workId: 'finish_floor_floor_microcement', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /пробков/i, targetCategory: 'floor', workId: 'finish_floor_floor_cork', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /кварц|spc|винил/i, targetCategory: 'floor', workId: 'finish_floor_floor_quartzvinyl', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /инженер/i, targetCategory: 'floor', workId: 'finish_floor_floor_engineered', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /керамическ.*плит|плитк/i, targetCategory: 'floor', workId: 'finish_floor_floor_porcelain', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /керамогранит/i, targetCategory: 'floor', workId: 'finish_floor_floor_porcelain', qtyMode: 'floorArea' },
        { sections: ['floor'], categories: ['floor'], pattern: /скрытый плинтус|плинтус/i, targetCategory: 'floor', workId: 'finish_floor_floor_plinth_hidden', qtyMode: 'perimeter' },

        { sections: ['walls'], categories: ['wallPlaster'], pattern: /цементн.*штукатур|влажн.*зон/i, targetCategory: 'wallPlaster', workId: 'rough_plaster_cement_3cm', qtyMode: 'wallsArea' },
        { sections: ['walls'], categories: ['wallPlaster'], pattern: /штукатур/i, targetCategory: 'wallPlaster', workId: 'rough_plaster_gips_3cm_mech', qtyMode: 'wallsArea' },
        { sections: ['walls'], categories: ['wallPutty'], pattern: /стеклохолст/i, targetCategory: 'wallPutty', workId: 'rough_putty_fiberglass', qtyMode: 'wallsArea' },
        { sections: ['walls'], categories: ['wallPutty'], pattern: /шпаклев|финишная подготовка|под чистовую/i, targetCategory: 'wallPutty', workId: 'rough_putty_paint_mech', qtyMode: 'wallsArea' },
        { sections: ['walls'], categories: ['wall'], pattern: /фотообои/i, targetCategory: 'wall', workId: 'finish_wall_wall_photo_wallpaper', qtyMode: 'wallsArea' },
        { sections: ['walls'], categories: ['wall'], pattern: /обои/i, targetCategory: 'wall', workId: 'finish_wall_wall_wallpaper', qtyMode: 'wallsArea' },
        { sections: ['walls'], categories: ['wall'], pattern: /венециан/i, targetCategory: 'wall', workId: 'finish_wall_wall_venetian_plaster', qtyMode: 'wallsArea' },
        { sections: ['walls'], categories: ['wall'], pattern: /микроцемент/i, targetCategory: 'wall', workId: 'finish_wall_wall_microcement', qtyMode: 'wallsArea' },
        { sections: ['walls'], categories: ['wall'], pattern: /мдф/i, targetCategory: 'wall', workId: 'finish_wall_wall_mdf_panels', qtyMode: 'wallsArea' },
        { sections: ['walls'], categories: ['wall'], pattern: /рейк|рееч/i, targetCategory: 'wall', workId: 'finish_wall_wall_slat', qtyMode: 'wallsArea' },
        { sections: ['walls'], categories: ['wall'], pattern: /молдинг|профил/i, targetCategory: 'wall', workId: 'finish_wall_wall_molding', qtyMode: 'perimeter' },
        { sections: ['walls'], categories: ['wall'], pattern: /крупноформат.*керамогранит|керамогранит.*крупноформат/i, targetCategory: 'wall', workId: 'finish_wall_wall_porcelain_large', qtyMode: 'wallsArea' },
        { sections: ['walls'], categories: ['wall'], pattern: /антивандал|моющ.*краск|износостой/i, targetCategory: 'wall', workId: 'finish_wall_man_wall_paint_premium', qtyMode: 'wallsArea' },
        { sections: ['walls'], categories: ['wall'], pattern: /окраск|краск/i, targetCategory: 'wall', workId: 'finish_wall_man_wall_paint', qtyMode: 'wallsArea' },
        { sections: ['walls'], categories: ['wall'], pattern: /декоратив|акцент/i, targetCategory: 'wall', workId: 'finish_wall_wall_decorative_plaster', qtyMode: 'wallsArea' },
        { sections: ['walls'], categories: ['wall'], pattern: /керамогранит|плитк/i, targetCategory: 'wall', workId: 'finish_wall_wall_porcelain', qtyMode: 'wallsArea' },

        { sections: ['ceiling'], categories: ['ceilingPrep'], pattern: /стеклохолст/i, targetCategory: 'ceilingPrep', workId: 'rough_ceiling_fiberglass', qtyMode: 'ceilingArea' },
        { sections: ['ceiling'], categories: ['ceilingPrep'], pattern: /базовая подготовка|выравнивание|подготовка потол/i, targetCategory: 'ceilingPrep', workId: 'rough_ceiling_plaster_gips', qtyMode: 'ceilingArea' },
        { sections: ['ceiling'], categories: ['ceiling'], pattern: /тканев.*натяж/i, targetCategory: 'ceiling', workId: 'finish_ceil_ceiling_stretch_fabric', qtyMode: 'ceilingArea' },
        { sections: ['ceiling'], categories: ['ceiling'], pattern: /многоуровн/i, targetCategory: 'ceiling', workId: 'finish_ceil_ceiling_stretch_multilevel', qtyMode: 'ceilingArea' },
        { sections: ['ceiling'], categories: ['ceiling'], pattern: /тенев|парящ/i, targetCategory: 'ceiling', workId: 'finish_ceil_ceiling_stretch_shadow', qtyMode: 'ceilingArea' },
        { sections: ['ceiling'], categories: ['ceiling'], pattern: /светов.*лини|led.*профил/i, targetCategory: 'ceiling', workId: 'finish_ceil_ceiling_led_profile', qtyMode: 'lightingLength' },
        { sections: ['ceiling'], categories: ['ceiling'], pattern: /трек|шинопровод/i, targetCategory: 'ceiling', workId: 'finish_ceil_ceiling_led_profile', qtyMode: 'lightingLength' },
        { sections: ['ceiling'], categories: ['ceiling'], pattern: /ревизион.*люк|скрыт.*люк/i, targetCategory: 'ceiling', workId: 'finish_ceil_ceiling_hatch_hidden', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['ceiling'], categories: ['ceiling'], pattern: /закладн.*люстр|усилен.*люстр|платформ.*люстр/i, targetCategory: 'ceiling', workId: 'finish_ceil_ceiling_rosette', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['ceiling'], categories: ['ceiling'], pattern: /натяж/i, targetCategory: 'ceiling', workId: 'finish_ceil_ceiling_stretch', qtyMode: 'ceilingArea' },
        { sections: ['ceiling'], categories: ['ceiling'], pattern: /покраск/i, targetCategory: 'ceiling', workId: 'finish_ceil_man_ceiling_paint', qtyMode: 'ceilingArea' },
        { sections: ['ceiling'], categories: ['ceiling'], pattern: /гкл|гипсокартон/i, targetCategory: 'ceiling', workId: 'finish_ceil_ceiling_gk', qtyMode: 'ceilingArea' },
        { sections: ['ceiling'], categories: ['ceiling'], pattern: /ниша.*штор|штор.*ниша/i, targetCategory: 'ceiling', workId: 'finish_ceil_ceiling_stretch_curtain_niche', qtyMode: 'perimeter' },
        { sections: ['ceiling'], categories: ['ceiling'], pattern: /карниз|ниша/i, targetCategory: 'ceiling', workId: 'finish_ceil_ceiling_cornice_hidden', qtyMode: 'perimeter' },

        { sections: ['electrical'], categories: ['electrical'], pattern: /подрозет/i, targetCategory: 'electrical', workId: 'eng_elec_subsocket', qtyMode: 'parsedQty', fallbackQty: 4 },
        { sections: ['electrical'], categories: ['electrical'], pattern: /штроб/i, targetCategory: 'electrical', workId: 'eng_elec_wall_chasing', qtyMode: 'electricalLength' },
        { sections: ['electrical'], categories: ['electrical'], pattern: /гофр/i, targetCategory: 'electrical', workId: 'eng_elec_corrugation', qtyMode: 'electricalLength' },
        { sections: ['electrical'], categories: ['electrical'], pattern: /касс.*(интернет|эквайр|pos)|эквайр|pos|слаботоч.*касс/i, targetCategory: 'electrical', workId: 'eng_elec_internet_tv', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['electrical'], categories: ['electrical'], pattern: /касс|вывеск|витрин.*пит|отдельн.*линия.*витрин/i, targetCategory: 'electrical', workId: 'eng_elec_wiring_hidden', qtyMode: 'electricalLength' },
        { sections: ['electrical'], categories: ['electrical'], pattern: /интернет|тв|слаботоч|рабочее место/i, targetCategory: 'electrical', workId: 'eng_elec_internet_tv', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['electrical'], categories: ['electrical'], pattern: /розет/i, targetCategory: 'electrical', workId: 'eng_elec_socket_install', qtyMode: 'parsedQty', fallbackQty: 4 },
        { sections: ['electrical'], categories: ['electrical'], pattern: /выключ/i, targetCategory: 'electrical', workId: 'eng_elec_switch_install', qtyMode: 'parsedQty', fallbackQty: 2 },
        { sections: ['electrical'], categories: ['electrical'], pattern: /терморег/i, targetCategory: 'electrical', workId: 'eng_elec_switch_install', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['electrical'], categories: ['electrical'], pattern: /лини|техник|питание|влагозащ/i, targetCategory: 'electrical', workId: 'eng_elec_wiring_hidden', qtyMode: 'electricalLength' },

        { sections: ['lighting'], categories: ['lighting', 'electrical'], pattern: /трек/i, targetCategory: 'electrical', workId: 'eng_elec_track_light', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['lighting'], categories: ['lighting', 'electrical'], pattern: /точеч/i, targetCategory: 'electrical', workId: 'eng_elec_spot_light', qtyMode: 'parsedQty', fallbackQty: 4 },
        { sections: ['lighting'], categories: ['lighting', 'electrical'], pattern: /люстр/i, targetCategory: 'electrical', workId: 'eng_elec_chandelier_install', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['lighting'], categories: ['lighting', 'electrical'], pattern: /бра|настенн|прикроват/i, targetCategory: 'electrical', workId: 'eng_elec_wall_light', qtyMode: 'parsedQty', fallbackQty: 2 },
        { sections: ['lighting'], categories: ['lighting', 'electrical'], pattern: /витрин.*подсвет|подсвет.*витрин/i, targetCategory: 'electrical', workId: 'eng_elec_led_strip', qtyMode: 'lightingLength' },
        { sections: ['lighting'], categories: ['lighting', 'electrical'], pattern: /акцентн.*свет|товарн.*зон/i, targetCategory: 'electrical', workId: 'eng_elec_track_light', qtyMode: 'parsedQty', fallbackQty: 2 },
        { sections: ['lighting'], categories: ['lighting', 'electrical'], pattern: /подсвет|led|декоратив|лента/i, targetCategory: 'electrical', workId: 'eng_elec_led_strip', qtyMode: 'lightingLength' },
        { sections: ['lighting'], categories: ['lighting', 'electrical'], pattern: /датчик движения|проход/i, targetCategory: 'electrical', workId: 'eng_elec_switch_install', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['lighting'], categories: ['lighting', 'electrical'], pattern: /групп|основной свет|свет/i, targetCategory: 'electrical', workId: 'eng_elec_light_install', qtyMode: 'parsedQty', fallbackQty: 1 },

        { sections: ['smartHome'], categories: ['smartHome', 'water'], pattern: /протеч/i, targetCategory: 'water', workId: 'eng_water_smart_leak_sensor', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['smartHome'], categories: ['smartHome', 'electrical'], pattern: /движ|присутств/i, targetCategory: 'electrical', workId: 'eng_elec_smart_motion', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['smartHome'], categories: ['smartHome', 'electrical'], pattern: /климат|температур/i, targetCategory: 'electrical', workId: 'eng_elec_smart_climate', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['smartHome'], categories: ['smartHome', 'electrical'], pattern: /штор/i, targetCategory: 'electrical', workId: 'eng_elec_smart_curtain', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['smartHome'], categories: ['smartHome', 'electrical'], pattern: /сценар|умн|smart|настрой/i, targetCategory: 'electrical', workId: 'eng_elec_smart_home_setup', qtyMode: 'parsedQty', fallbackQty: 1 },

        { sections: ['climate'], categories: ['climate', 'ventilation'], pattern: /наружн.*блок|внешн.*блок/i, targetCategory: 'ventilation', workId: 'eng_vent_ac_outdoor_install', qtyMode: 'climateUnits' },
        { sections: ['climate'], categories: ['climate', 'ventilation'], pattern: /кронштейн/i, targetCategory: 'ventilation', workId: 'eng_vent_ac_bracket', qtyMode: 'climateUnits' },
        { sections: ['climate'], categories: ['climate', 'ventilation'], pattern: /трасс/i, targetCategory: 'ventilation', workId: 'eng_vent_ac_route', qtyMode: 'climateRoute' },
        { sections: ['climate'], categories: ['climate', 'ventilation'], pattern: /дренаж/i, targetCategory: 'ventilation', workId: 'eng_vent_ac_drain', qtyMode: 'climateRoute' },
        { sections: ['climate'], categories: ['climate', 'ventilation'], pattern: /питан/i, targetCategory: 'ventilation', workId: 'eng_vent_ac_power', qtyMode: 'climateRoute' },
        { sections: ['climate'], categories: ['climate', 'ventilation'], pattern: /кондиц|split|сплит|внутрен/i, targetCategory: 'ventilation', workId: 'eng_vent_ac_unit_install', qtyMode: 'climateUnits' },
        { sections: ['climate'], categories: ['climate', 'ventilation'], pattern: /диффузор/i, targetCategory: 'ventilation', workId: 'eng_vent_diffuser_install', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['climate'], categories: ['climate', 'ventilation'], pattern: /приточн.*клапан/i, targetCategory: 'ventilation', workId: 'eng_vent_vent_valve_install', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['climate'], categories: ['climate', 'ventilation'], pattern: /воздуховод|канал/i, targetCategory: 'ventilation', workId: 'eng_vent_air_duct_install', qtyMode: 'lightingLength' },
        { sections: ['climate'], categories: ['climate', 'ventilation'], pattern: /вент.*решет|решет/i, targetCategory: 'ventilation', workId: 'eng_vent_vent_grille_install', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['climate'], categories: ['climate', 'ventilation'], pattern: /вентиляц|вытяж/i, targetCategory: 'ventilation', workId: 'eng_vent_vent_fan_install', qtyMode: 'parsedQty', fallbackQty: 1 },

        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /мозаик.*душ|душ.*мозаик/i, targetCategory: 'floor', workId: 'finish_floor_shower_tray_tile_mosaic', qtyMode: 'wetArea' },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /противоскольз|матов.*плит|душев.*плит/i, targetCategory: 'floor', workId: 'finish_floor_shower_tray_tile_matte', qtyMode: 'wetArea' },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /гидроизоляц/i, targetCategory: 'wallWaterproof', workId: 'rough_wall_rough_waterproof_coat', qtyMode: 'wetArea' },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /усил.*гидроизоляц|душев.*гидроизоляц/i, targetCategory: 'floorLeveling', workId: 'rough_floor_shower_tray_waterproof_reinforced', qtyMode: 'wetArea' },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /поддон.*бортик/i, targetCategory: 'floorLeveling', workId: 'rough_floor_shower_tray_curb_base', qtyMode: 'wetArea' },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /поддон.*плит|поддон.*керамогранит|вровень/i, targetCategory: 'floorLeveling', workId: 'rough_floor_shower_tray_slope_base', qtyMode: 'wetArea' },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /готов.*поддон|душев.*поддон/i, targetCategory: 'water', workId: 'eng_water_shower_tray_install', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /скрыт.*сантех|скрыт.*смесител/i, targetCategory: 'water', workId: 'eng_water_hidden_mixer_rough_in', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /штроб.*сантех/i, targetCategory: 'water', workId: 'eng_water_hidden_plumbing_chasing', qtyMode: 'electricalLength' },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /инсталляц/i, targetCategory: 'water', workId: 'eng_water_installation_frame', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /душев.*лоток|трап/i, targetCategory: 'drainage', workId: 'eng_drain_shower_channel', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /смесител/i, targetCategory: 'water', workId: 'eng_water_mixer_connection', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /защит.*протеч|аквасторож|neptun/i, targetCategory: 'water', workId: 'eng_water_leak_protection', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /канализац|слив/i, targetCategory: 'drainage', workId: 'eng_drain_drain_point', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /мойк|водоснаб|вода|развод/i, targetCategory: 'water', workId: 'eng_water_water_point', qtyMode: 'parsedQty', fallbackQty: 1 },
        { sections: ['plumbing'], categories: ['plumbing', 'water'], pattern: /ревизион/i, targetCategory: 'water', workId: 'eng_water_collector_valve', qtyMode: 'parsedQty', fallbackQty: 1 }
      ];
    }

    const roomRepairBackendRuleCache = new Map();
    const roomRepairBackendRulePending = new Set();

    function isRoomRepairBackendRuleScope(scope = '') {
      return ['floor', 'floorLeveling', 'ceiling', 'ceilingPrep'].includes(scope);
    }

    function getRoomRepairBackendRuleKey(scope = '', label = '', mode = 'section') {
      return `${mode}|${scope}|${normalizeRoomRepairBuilderLabel(label)}`;
    }

    function requestRoomRepairBackendWorkRule(scope = '', label = '', mode = 'section') {
      if (!isRoomRepairBackendRuleScope(scope) || !label || !window.RepairCoveringsApi?.resolveRoomRepairRule) return null;
      const key = getRoomRepairBackendRuleKey(scope, label, mode);
      if (roomRepairBackendRuleCache.has(key)) return roomRepairBackendRuleCache.get(key);
      if (roomRepairBackendRulePending.has(key)) return null;
      roomRepairBackendRulePending.add(key);
      window.RepairCoveringsApi.resolveRoomRepairRule({ scope, label, mode })
        .then(rule => {
          roomRepairBackendRuleCache.set(key, rule ? {
            targetCategory: rule.targetCategory || '',
            workId: rule.workId || '',
            qtyMode: rule.qtyMode || '',
            fallbackQty: Number(rule.fallbackQty || 0),
            source: 'backend'
          } : null);
        })
        .catch(error => {
          console.warn('Room repair backend rule unavailable', error);
        })
        .finally(() => {
          roomRepairBackendRulePending.delete(key);
        });
      return null;
    }

    function getRoomRepairBuilderWorkRule(sectionKey, label) {
      const value = String(label || '');
      if (isRoomRepairInformationalClimateItem(value, sectionKey)) return null;
      if (/^(формат|размер)\s*:/i.test(value)) return null;
      if (/^(базовая прямая укладка|плавающий способ укладки|свободная укладка линолеума|частичная приклейка линолеума)$/i.test(value)) return null;
      return requestRoomRepairBackendWorkRule(sectionKey, value, 'section')
        || getRoomRepairBuilderWorkRules().find(rule => (rule.sections || []).includes(sectionKey) && rule.pattern.test(value))
        || null;
    }

    function getRoomRepairBuilderWorkRuleByCategory(category, label) {
      const value = String(label || '');
      if (isRoomRepairInformationalClimateItem(value, category)) return null;
      return requestRoomRepairBackendWorkRule(category, value, 'category')
        || getRoomRepairBuilderWorkRules().find(rule => (rule.categories || []).includes(category) && rule.pattern.test(value))
        || null;
    }

    function isRoomRepairInformationalClimateItem(label = '', sectionOrCategory = '') {
      const scope = String(sectionOrCategory || '').toLowerCase();
      if (scope && !['climate', 'ventilation'].includes(scope)) return false;
      return /тихий\s+режим|режим\s+климатического\s+оборудования/i.test(String(label || ''));
    }

    function getRoomRepairPerimeterValue(room = {}, metrics = {}) {
      const height = Math.max(2.4, Number(room.ceiling || room.ceilingHeight || 2.7));
      const direct = Number(room.perimeter || room.roomPerimeter || 0);
      if (direct > 0) return Number(direct.toFixed(2));
      if (Number(metrics.wallsArea || 0) > 0) return Number(Math.max(4, metrics.wallsArea / height).toFixed(2));
      return Number(Math.max(4, Math.sqrt(Number(metrics.floorArea || room.area || 1)) * 4).toFixed(2));
    }

    function getRoomRepairBuilderRuleQty(rule, room = {}, sections = {}, metrics = {}, label = '') {
      const parsed = parseInt(String(label || ''), 10);
      switch (rule?.qtyMode) {
        case 'floorArea': return metrics.floorArea;
        case 'wallsArea': return metrics.wallsArea;
        case 'ceilingArea': return metrics.ceilingArea;
        case 'perimeter': return getRoomRepairPerimeterValue(room, metrics);
        case 'wetArea': return Math.min(metrics.wallsArea, Math.max(metrics.floorArea, 4));
        case 'electricalLength': return Number(Math.max(4, metrics.floorArea * 1.2).toFixed(2));
        case 'lightingLength': return Number(Math.max(2, Math.sqrt(metrics.ceilingArea || metrics.floorArea || 1)).toFixed(2));
        case 'climateUnits': return Math.max(1, getRoomRepairClimateUnits(room, sections) || parsed || 1);
        case 'climateRoute': return Number((getRoomRepairClimateRouteLength(room) * Math.max(1, getRoomRepairClimateUnits(room, sections) || 1)).toFixed(2));
        case 'parsedQty': return Math.max(1, parsed || Number(rule.fallbackQty || 1));
        default: return Math.max(1, Number(rule?.fallbackQty || parsed || 1));
      }
    }

    function pushRoomRepairStructuredRule(repair, rule, room, sections, metrics, label, manualEdited, syncMeta = {}) {
      if (!rule?.targetCategory || !rule?.workId) return false;
      const qty = getRoomRepairBuilderRuleQty(rule, room, sections, metrics, label);
      pushRoomRepairItem(repair, rule.targetCategory, rule.workId, qty, label, manualEdited, {
        ...syncMeta,
        roomRepairQtyMode: rule.qtyMode || '',
        roomRepairMeasureLabel: getRoomRepairBuilderRuleMeasureLabel(rule)
      });
      return true;
    }

    function getRoomRepairStructuredEstimateMeta(selection = {}, syncMeta = {}) {
      const trace = getRoomRepairQuantityFormulaLabel(selection);
      return {
        ...syncMeta,
        roomRepairGroup: selection.groupLabel || '',
        roomRepairNode: selection.nodeLabel || '',
        roomRepairDetailGroup: selection.detailGroup || '',
        roomRepairZoneKey: selection.zoneKey || '',
        roomRepairZoneLabel: selection.zoneLabel || '',
        roomRepairZoneHint: selection.zoneHint || '',
        roomRepairQuantitySource: selection.quantitySource || '',
        roomRepairQtyMode: selection.qtyMode || '',
        roomRepairQtyTrace: trace
      };
    }

    function pushRoomRepairStructuredSelection(repair, selection, room, sections, metrics, manualEdited, syncMeta = {}) {
      const rule = getRoomRepairStructuredSelectionRule(selection);
      if (!rule) return false;
      const qty = getRoomRepairStructuredSelectionQty(selection, room, sections, metrics);
      if (!Number.isFinite(qty) || qty <= 0) return false;
      const enrichedSelection = { ...selection, quantity: qty, qtyMode: selection.qtyMode || rule.qtyMode || '' };
      pushRoomRepairItem(repair, rule.targetCategory, rule.workId, qty, selection.label || '', manualEdited, {
        ...getRoomRepairStructuredEstimateMeta(enrichedSelection, syncMeta),
        roomRepairMeasureLabel: getRoomRepairBuilderRuleMeasureLabel(rule)
      });
      return true;
    }

    function getRoomRepairOpeningDefaults(openingType) {
      const config = {
        door: { material: 'brick', productMaterial: 'painted', width: 900, height: 2100 },
        window: { material: 'brick', productMaterial: 'pvc', width: 1300, height: 1400 },
        balcony: { material: 'brick', productMaterial: 'pvc', width: 800, height: 2500 }
      };
      return config[openingType] || config.door;
    }

    function getRoomRepairOpeningType(label = '') {
      const value = String(label || '').toLowerCase();
      if (/балкон/.test(value)) return 'balcony';
      if (/окон|окн/.test(value)) return 'window';
      return 'door';
    }

    function getRoomRepairOpeningWorkTypes(label = '', openingType = 'door') {
      const value = String(label || '').toLowerCase();
      if (openingType === 'door') {
        if (/скрыт/.test(value)) return ['Установка скрытой двери'];
        if (/раздвиж/.test(value)) return ['Монтаж раздвижной двери'];
        if (/двуполь/.test(value)) return ['Монтаж двупольной двери'];
        if (/добор|налич/.test(value)) return ['Монтаж межкомнатной двери с доборами', 'Монтаж доборов и наличников'];
        return ['Монтаж распашной двери'];
      }
      if (openingType === 'window') {
        if (/откос/.test(value)) return ['Устройство внутренних откосов'];
        if (/подокон|отлив/.test(value)) return ['Монтаж подоконника', 'Монтаж отлива'];
        return ['Монтаж оконного блока', 'Устройство внутренних откосов'];
      }
      if (/откос/.test(value)) return ['Устройство откосов'];
      return ['Монтаж балконного блока'];
    }

    function pushRoomRepairOpeningItem(repair, label = '', manualEdited = true, syncMeta = {}) {
      const openingType = getRoomRepairOpeningType(label);
      const count = Math.max(1, parseInt(String(label || ''), 10) || 1);
      const defaults = getRoomRepairOpeningDefaults(openingType);
      const workTypes = getRoomRepairOpeningWorkTypes(label, openingType);
      if (!repair?.finishing?.openings?.[openingType]) return;
      for (let index = 0; index < count; index += 1) {
        repair.finishing.openings[openingType].push({
          material: defaults.material,
          productMaterial: defaults.productMaterial,
          workTypes,
          workTypeCount: workTypes.length,
          width: defaults.width,
          height: defaults.height,
          autoSource: 'roomRepair',
          manualEdited,
          roomRepairLabel: label,
          ...syncMeta
        });
      }
    }

    function getRoomRepairStairsRule(label = '') {
      const value = String(label || '').toLowerCase();
      if (/стекл|огражд/.test(value)) return { workId: 'finish_stair_railing_install_glass_panel', qtyMode: 'wallsArea', unit: 'м²' };
      if (/поруч|перил/.test(value)) return { workId: 'finish_stair_railing_install_wall_handrail', qtyMode: 'perimeter', unit: 'пог. м' };
      if (/керамогран|плитк/.test(value)) return { workId: 'finish_stair_stair_cladding_tread_tile', qtyMode: 'parsedQty', fallbackQty: 12, unit: 'шт' };
      if (/облицов|ступен/.test(value)) return { workId: 'finish_stair_stair_cladding_tread_wood', qtyMode: 'parsedQty', fallbackQty: 12, unit: 'шт' };
      if (/металл|каркас/.test(value)) return { workId: 'finish_stair_stair_frame_metal_straight', qtyMode: 'perimeter', unit: 'пог. м' };
      return { workId: 'finish_stair_mat_stair_install_wood_straight_h3_w11', qtyMode: 'parsedQty', fallbackQty: 1, unit: 'шт' };
    }

    function pushRoomRepairStairItem(repair, room, sections, metrics, label = '', manualEdited = true, syncMeta = {}) {
      if (!repair?.finishing) return;
      if (!repair.finishing.stairs || typeof repair.finishing.stairs !== 'object') repair.finishing.stairs = [];
      const rule = getRoomRepairStairsRule(label);
      const qty = getRoomRepairBuilderRuleQty(rule, room, sections, metrics, label);
      const item = {
        workId: rule.workId,
        type: rule.workId,
        qty,
        unit: rule.unit,
        autoSource: 'roomRepair',
        manualEdited,
        roomRepairLabel: label,
        roomRepairQtyMode: rule.qtyMode || '',
        roomRepairMeasureLabel: getRoomRepairBuilderRuleMeasureLabel(rule),
        ...syncMeta
      };
      if (Array.isArray(repair.finishing.stairs)) {
        repair.finishing.stairs.push(item);
      } else {
        const key = `roomRepair_${rule.workId}_${Object.keys(repair.finishing.stairs).length}`;
        repair.finishing.stairs[key] = item;
      }
    }

    function removeRoomRepairGeneratedStairs(stairs) {
      if (Array.isArray(stairs)) {
        return stairs.filter(item => item?.autoSource !== 'roomRepair' && !(item?.autoSource === 'quest' && item?.manualEdited !== true));
      }
      if (stairs && typeof stairs === 'object') {
        return Object.fromEntries(Object.entries(stairs).filter(([, item]) => item?.autoSource !== 'roomRepair' && !(item?.autoSource === 'quest' && item?.manualEdited !== true)));
      }
      return [];
    }

    function getRoomRepairBuilderRuleMeasureLabel(rule) {
      if (!rule) return '';
      const labels = {
        floorArea: 'по площади пола',
        wallsArea: 'по площади стен',
        ceilingArea: 'по площади потолка',
        perimeter: 'по периметру',
        wetArea: 'по мокрой зоне',
        parsedQty: 'в штуках',
        electricalLength: 'по трассе кабеля',
        lightingLength: 'по длине подсветки',
        climateUnits: 'по количеству блоков',
        climateRoute: 'по длине трассы'
      };
      return labels[rule.qtyMode] || '';
    }

    function getRoomRepairSourceIds(roomId, floorIndex, roomIndex) {
      return {
        demoRoomId: `demo_${roomId}_${floorIndex}_${roomIndex}`,
        repairRoomId: `repair_${roomId}_${floorIndex}_${roomIndex}`
      };
    }

    function removeRoomRepairGeneratedItems(items = []) {
      return (items || []).filter(item => item?.autoSource !== 'roomRepair' && !(item?.autoSource === 'quest' && item?.manualEdited !== true));
    }

    function createRoomRepairMeasuredItem(category, workId, value, label = '', manualEdited = true, extraMeta = {}) {
      const measureMeta = typeof getRepairMeasureMetaForCategory === 'function'
        ? getRepairMeasureMetaForCategory(category, workId)
        : { field: 'qty', integer: true };
      const amount = Number(value || 0);
      const item = {
        type: workId,
        workId,
        autoSource: 'roomRepair',
        manualEdited,
        roomRepairLabel: label
      };
      const roomRepairUnitPrice = getRoomRepairWorkUnitPrice(workId, extraMeta?.roomRepairPriceTier || '');
      if (roomRepairUnitPrice > 0) item.roomRepairUnitPrice = roomRepairUnitPrice;
      const materialRecipeOverride = getRoomRepairMaterialRecipeOverride(workId, { label, workId, targetCategory: category });
      if (materialRecipeOverride) item.materialRecipeOverride = materialRecipeOverride;
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
        'roomRepairPriceTier',
        'roomRepairPriceTierName',
        'roomRepairPriceMarket'
      ].forEach(key => {
        if (extraMeta?.[key]) item[key] = extraMeta[key];
      });
      item[measureMeta.field] = measureMeta.field === 'qty' && measureMeta.integer !== false
        ? Math.max(1, Math.round(amount || 1))
        : Number(Math.max(0, amount).toFixed(2));
      return item;
    }

    function pushRoomRepairItem(repair, category, workId, value, label = '', manualEdited = true, meta = {}) {
      if (!workId || !repair || typeof getRepairCategorySection !== 'function') return;
      const section = getRepairCategorySection(category);
      if (!repair[section] || !Array.isArray(repair[section][category])) return;
      repair[section][category].push(createRoomRepairMeasuredItem(category, workId, value, label, manualEdited, meta));
    }

    function syncRoomRepairCalculationToWhatToDo(roomId, floorIndex, roomIndex, sections, source = 'manual', structuredSelections = [], syncOptions = {}) {
      const room = roomData?.[roomId]?.floors?.[floorIndex]?.livingRooms?.[roomIndex];
      if (!room || typeof ensureRepairDataStructure !== 'function' || typeof ensureFinishingDataStructure !== 'function') return;
      const { demoRoomId, repairRoomId } = getRoomRepairSourceIds(roomId, floorIndex, roomIndex);
      const manualEdited = source === 'manual';
      const solutionPackage = syncOptions.solutionPackage || room.repairCalculation?.solutionPackage || '';
      const calculationMode = syncOptions.calculationMode || room.repairCalculation?.calculationMode || '';
      const priceTier = syncOptions.priceTier || room.repairCalculation?.priceTier || 'inherit';
      const effectivePriceTier = syncOptions.effectivePriceTier || getRoomRepairPriceTierMeta(priceTier).effectiveValue;
      const packageMeta = solutionPackage ? getRoomRepairSolutionPackageMeta(solutionPackage) : null;
      const modeMeta = calculationMode ? getRoomRepairCalculationModeMeta(calculationMode) : null;
      const priceTierMeta = getRoomRepairPriceTierMeta(priceTier);
      const syncMeta = {
        roomRepairPackage: packageMeta?.value || '',
        roomRepairPackageName: packageMeta?.label || '',
        roomRepairCalculationMode: modeMeta?.value || calculationMode || '',
        roomRepairCalculationModeName: modeMeta?.label || '',
        roomRepairPriceTier: effectivePriceTier,
        roomRepairPriceTierName: priceTierMeta.label || '',
        roomRepairPriceMarket: syncOptions.priceMarket || getRoomRepairPriceMarket(effectivePriceTier)
      };
      const metrics = {
        floorArea: Math.max(1, Number(room.area || 0)),
        wallsArea: Math.max(1, Number(room.wallsArea || (typeof calculateLivingRoomWallsArea === 'function' ? calculateLivingRoomWallsArea(room) : 0))),
        ceilingArea: Math.max(1, Number((typeof getLivingRoomCeilingArea === 'function' ? getLivingRoomCeilingArea(room) : room.ceilingArea) || room.area || 0))
      };
      const repair = ensureRepairDataStructure(repairRoomId);
      const demoFinishing = ensureFinishingDataStructure(demoRoomId);
      const clear = arr => {
        const kept = removeRoomRepairGeneratedItems(arr);
        arr.length = 0;
        arr.push(...kept);
      };

      ['floorLeveling', 'wallPlaster', 'wallPutty', 'wallWaterproof', 'ceilingPrep'].forEach(category => clear(repair.rough[category]));
      ['electrical', 'ventilation', 'water', 'drainage', 'heating'].forEach(category => clear(repair.engineering[category]));
      ['floor', 'wall', 'ceiling'].forEach(category => clear(repair.finishing[category]));
      ['door', 'window', 'balcony'].forEach(openingType => clear(repair.finishing.openings[openingType]));
      repair.finishing.stairs = removeRoomRepairGeneratedStairs(repair.finishing.stairs);
      ['floor', 'wall', 'ceiling'].forEach(category => clear(demoFinishing[category]));

      const structuredSkipCounts = new Map();
      const markStructuredPushed = selection => {
        const key = `${selection.section}||${selection.label}`;
        structuredSkipCounts.set(key, Number(structuredSkipCounts.get(key) || 0) + 1);
      };
      const shouldSkipStructuredFallback = (sectionKey, label) => {
        const key = `${sectionKey}||${label}`;
        const count = Number(structuredSkipCounts.get(key) || 0);
        if (count <= 0) return false;
        structuredSkipCounts.set(key, count - 1);
        return true;
      };

      normalizeRoomRepairStructuredSelections(structuredSelections).forEach(selection => {
        if (isRoomRepairInformationalClimateItem(selection.label, selection.section)) {
          markStructuredPushed(selection);
          return;
        }
        if (pushRoomRepairStructuredSelection(repair, selection, room, sections, metrics, manualEdited, syncMeta)) {
          markStructuredPushed(selection);
        }
      });

      (sections.demolition || []).forEach(label => {
        if (shouldSkipStructuredFallback('demolition', label)) return;
        const lower = String(label).toLowerCase();
        const target = lower.includes('потол') ? 'ceiling' : lower.includes('стен') ? 'wall' : 'floor';
        const workId = getRoomRepairWorkIds(label, target === 'floor' ? 'demolitionFloor' : target === 'wall' ? 'demolitionWall' : 'demolitionCeiling');
        if (workId) {
          demoFinishing[target].push({
            type: workId,
            area: target === 'wall' ? metrics.wallsArea : target === 'ceiling' ? metrics.ceilingArea : metrics.floorArea,
            autoSource: 'roomRepair',
            manualEdited,
            roomRepairLabel: label,
            ...syncMeta
          });
        }
      });

      (sections.floor || []).forEach(label => {
        if (shouldSkipStructuredFallback('floor', label)) return;
        const rule = getRoomRepairBuilderWorkRule('floor', label);
        if (rule && pushRoomRepairStructuredRule(repair, rule, room, sections, metrics, label, manualEdited, syncMeta)) return;
        if (/стяж|налив|основан|подготов/i.test(label)) {
          pushRoomRepairItem(repair, 'floorLeveling', getRoomRepairWorkIds(label, 'floor') || (typeof getRepairDefaultWorkId === 'function' ? getRepairDefaultWorkId('rough', 'floorLeveling') : ''), metrics.floorArea, label, manualEdited, syncMeta);
        } else {
          pushRoomRepairItem(repair, 'floor', getRoomRepairWorkIds(label, 'floor') || 'floor_quartzvinyl', metrics.floorArea, label, manualEdited, syncMeta);
        }
      });
      (sections.walls || []).forEach(label => {
        if (shouldSkipStructuredFallback('walls', label)) return;
        const rule = getRoomRepairBuilderWorkRule('walls', label);
        if (rule && pushRoomRepairStructuredRule(repair, rule, room, sections, metrics, label, manualEdited, syncMeta)) return;
        if (/штукатур/i.test(label)) pushRoomRepairItem(repair, 'wallPlaster', typeof getRepairDefaultWorkId === 'function' ? getRepairDefaultWorkId('rough', 'wallPlaster') : '', metrics.wallsArea, label, manualEdited, syncMeta);
        else if (/шпаклев|подготов/i.test(label)) pushRoomRepairItem(repair, 'wallPutty', typeof getRepairDefaultWorkId === 'function' ? getRepairDefaultWorkId('rough', 'wallPutty') : '', metrics.wallsArea, label, manualEdited, syncMeta);
        else pushRoomRepairItem(repair, 'wall', getRoomRepairWorkIds(label, 'wall') || 'wall_paint', metrics.wallsArea, label, manualEdited, syncMeta);
      });
      (sections.ceiling || []).forEach(label => {
        if (shouldSkipStructuredFallback('ceiling', label)) return;
        const rule = getRoomRepairBuilderWorkRule('ceiling', label);
        if (rule && pushRoomRepairStructuredRule(repair, rule, room, sections, metrics, label, manualEdited, syncMeta)) return;
        if (/подготов|шпаклев|базов/i.test(label)) pushRoomRepairItem(repair, 'ceilingPrep', typeof getRepairDefaultWorkId === 'function' ? getRepairDefaultWorkId('rough', 'ceilingPrep') : '', metrics.ceilingArea, label, manualEdited, syncMeta);
        else pushRoomRepairItem(repair, 'ceiling', getRoomRepairWorkIds(label, 'ceiling') || 'ceiling_stretch', metrics.ceilingArea, label, manualEdited, syncMeta);
      });
      (sections.openings || []).forEach(label => {
        if (shouldSkipStructuredFallback('openings', label)) return;
        pushRoomRepairOpeningItem(repair, label, manualEdited, syncMeta);
      });
      (sections.stairs || []).forEach(label => {
        if (shouldSkipStructuredFallback('stairs', label)) return;
        pushRoomRepairStairItem(repair, room, sections, metrics, label, manualEdited, syncMeta);
      });
      (sections.electrical || []).forEach(label => {
        if (shouldSkipStructuredFallback('electrical', label)) return;
        const rule = getRoomRepairBuilderWorkRule('electrical', label);
        if (rule && pushRoomRepairStructuredRule(repair, rule, room, sections, metrics, label, manualEdited, syncMeta)) return;
        const qty = /розет/i.test(label) ? Math.max(1, parseInt(label, 10) || Math.ceil(metrics.floorArea / 5)) : Math.max(1, Math.ceil(metrics.floorArea / 8));
        pushRoomRepairItem(repair, 'electrical', getRoomRepairWorkIds(label, 'electrical') || 'socket_install', qty, label, manualEdited, syncMeta);
      });
      (sections.lighting || []).forEach(label => {
        if (shouldSkipStructuredFallback('lighting', label)) return;
        const rule = getRoomRepairBuilderWorkRule('lighting', label);
        if (rule && pushRoomRepairStructuredRule(repair, rule, room, sections, metrics, label, manualEdited, syncMeta)) return;
        pushRoomRepairItem(repair, 'electrical', getRoomRepairWorkIds(label, 'lighting') || 'light_install', Math.max(1, Math.ceil(metrics.floorArea / 7)), label, manualEdited, syncMeta);
      });
      (sections.smartHome || []).forEach(label => {
        if (shouldSkipStructuredFallback('smartHome', label)) return;
        const rule = getRoomRepairBuilderWorkRule('smartHome', label);
        if (rule && pushRoomRepairStructuredRule(repair, rule, room, sections, metrics, label, manualEdited, syncMeta)) return;
        pushRoomRepairItem(repair, 'electrical', getRoomRepairWorkIds(label, 'smartHome') || 'smart_home_setup', 1, label, manualEdited, syncMeta);
      });
      const climateUnits = getRoomRepairClimateUnits(room, sections);
      const climateRouteLength = getRoomRepairClimateRouteLength(room);
      (sections.climate || []).forEach(label => {
        if (shouldSkipStructuredFallback('climate', label)) return;
        if (isRoomRepairInformationalClimateItem(label, 'climate')) return;
        const rule = getRoomRepairBuilderWorkRule('climate', label);
        if (rule && pushRoomRepairStructuredRule(repair, rule, room, sections, metrics, label, manualEdited, syncMeta)) return;
        const isAcLine = /кондиц|сплит|split|климат|внутрен|трасс|дренаж|питан/i.test(label);
        const isRouteLine = /трасс|дренаж|питан/i.test(label);
        const value = isRouteLine
          ? Number((climateRouteLength * Math.max(1, climateUnits || 1)).toFixed(2))
          : (isAcLine ? Math.max(1, climateUnits || 1) : 1);
        pushRoomRepairItem(repair, 'ventilation', getRoomRepairWorkIds(label, 'climate') || 'ac_route', value, label, manualEdited, syncMeta);
      });
      (sections.plumbing || []).forEach(label => {
        if (shouldSkipStructuredFallback('plumbing', label)) return;
        const rule = getRoomRepairBuilderWorkRule('plumbing', label);
        if (rule && pushRoomRepairStructuredRule(repair, rule, room, sections, metrics, label, manualEdited, syncMeta)) return;
        if (/гидроизоляц/i.test(label)) pushRoomRepairItem(repair, 'wallWaterproof', getRoomRepairWorkIds(label, 'plumbing') || 'rough_wall_rough_waterproof_coat', Math.min(metrics.wallsArea, Math.max(metrics.floorArea, 4)), label, manualEdited, syncMeta);
        else if (/канализ|слив/i.test(label)) pushRoomRepairItem(repair, 'drainage', getRoomRepairWorkIds(label, 'plumbing') || 'drain_point', 1, label, manualEdited, syncMeta);
        else pushRoomRepairItem(repair, 'water', getRoomRepairWorkIds(label, 'plumbing') || 'water_point', 1, label, manualEdited, syncMeta);
      });
    }

    function formatRoomRepairQtyValue(value) {
      return Number(value || 0).toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    }

    function getRoomRepairQuantityFormulaLabel(selection = {}) {
      const qty = Number(selection.quantity || 0);
      const mode = selection.qtyMode || '';
      const areaModes = ['floorArea', 'wallsArea', 'ceilingArea', 'wetArea', 'perimeter', 'electricalLength', 'lightingLength', 'doorThresholdCm'];
      if (!qty) {
        if (selection.source === 'dependency') return 'добавлено по рекомендации системы';
        if (selection.source === 'auto') return 'количество рассчитает система';
        return '';
      }
      const unit = selection.quantityLabel || getRoomRepairBuilderQtyUnit({ qtyMode: mode }, null);
      const formattedQty = `${formatRoomRepairQtyValue(qty)} ${unit}`;
      const zoneDefault = Number(selection.zoneDefaultQty || 0);
      const zoneChanged = zoneDefault > 0 && Math.abs(zoneDefault - qty) > 0.05;
      if (areaModes.includes(mode)) {
        const noun = ['perimeter', 'electricalLength', 'lightingLength', 'doorThresholdCm'].includes(mode) ? 'длина' : 'площадь';
        if (selection.zoneKey === 'custom') return `${noun} ${formattedQty} · своя зона`;
        if (selection.zoneKey && selection.zoneKey !== 'full') {
          return zoneChanged
            ? `${noun} ${formattedQty} · ${selection.zoneLabel || 'зона'} · ручная правка`
            : `${noun} ${formattedQty} · ${selection.zoneLabel || 'зона'}`;
        }
        if (selection.zoneKey === 'full') return `${noun} ${formattedQty} · вся комната`;
        return `${noun} ${formattedQty} · по параметрам комнаты`;
      }
      if (selection.source === 'dependency') return `количество ${formattedQty} · рекомендация системы`;
      if (selection.quantitySource === 'manual' || selection.source === 'builder') return `количество ${formattedQty}`;
      return `количество ${formattedQty}`;
    }

    function renderRoomRepairSelectedListHtml(sectionKey, items = []) {
      if (!items.length) {
        return '<span class="room-repair-selected-empty">Пока ничего не добавлено</span>';
      }
      const structured = collectRoomRepairDraftStructuredSelections(false).filter(item => item.section === sectionKey);
      const usedIndexes = new Set();
      return items.map((item, index) => `
        <span class="room-repair-selected-chip">
          <span class="room-repair-selected-chip-text">
            ${escapeRoomRepairHtml(item)}
            ${(() => {
              const metaIndex = structured.findIndex((selection, selectionIndex) => !usedIndexes.has(selectionIndex) && selection.label === item);
              if (metaIndex < 0) return '';
              usedIndexes.add(metaIndex);
              const meta = structured[metaIndex];
              const parts = [meta.groupLabel, meta.nodeLabel, meta.detailGroup].filter(Boolean);
              const formula = getRoomRepairQuantityFormulaLabel(meta);
              return [
                parts.length ? `<small>${escapeRoomRepairHtml(parts.join(' · '))}</small>` : '',
                formula ? `<small class="room-repair-selected-formula"><i class="fas fa-calculator"></i>${escapeRoomRepairHtml(formula)}</small>` : ''
              ].join('');
            })()}
          </span>
          <button type="button" onclick="removeRoomRepairSectionItem('${sectionKey}', ${index})" aria-label="Удалить пункт ${escapeRoomRepairHtml(item)}">
            <i class="fas fa-times"></i>
          </button>
        </span>
      `).join('');
    }

    function renderRoomRepairCustomAdder(sectionKey) {
      const climateMax = getRoomClimateUnitLimit();
      const configs = {
        electrical: { label: 'розеточных точек', suffix: 'розеточных точек с группировкой по зонам', min: 1, max: 40, value: 8 },
        lighting: { label: 'групп света', suffix: 'группы света по зонам', min: 1, max: 20, value: 3 },
        smartHome: { label: 'smart-сценариев', suffix: 'smart-сценария света', min: 1, max: 20, value: 2 },
        climate: { label: 'кондиционер / split-систем', suffix: 'кондиционер / split-система', min: 1, max: climateMax, value: 1 }
      };
      const config = configs[sectionKey];
      if (!config) return '';
      const inputId = `roomRepairCustom_${sectionKey}`;
      return `
        <span class="room-repair-custom-adder">
          <input id="${inputId}" type="number" min="${config.min}" max="${config.max}" step="1" value="${config.value}" inputmode="numeric" aria-label="Количество ${escapeRoomRepairHtml(config.label)}">
          <button type="button" onclick="addRoomRepairCustomCount('${sectionKey}', '${inputId}', '${escapeRoomRepairJsString(config.suffix)}')">
            Добавить ${escapeRoomRepairHtml(config.label)}
          </button>
        </span>
      `;
    }

    function createRoomRepairColorOption(label, family, code, style, extra = {}) {
      return { label, colorFamily: family, colorCode: code, colorStyle: style, ...extra };
    }

    function getRoomRepairFloorColorOptions() {
      return [
        createRoomRepairColorOption('Цвет: белый теплый · RAL 9010', 'Светлые нейтральные', 'RAL 9010', 'linear-gradient(135deg, #fffdf4, #ece7d8)'),
        createRoomRepairColorOption('Цвет: белый чистый · RAL 9016', 'Светлые нейтральные', 'RAL 9016', 'linear-gradient(135deg, #ffffff, #f1f5f9)'),
        createRoomRepairColorOption('Цвет: кремовый · RAL 9001', 'Светлые нейтральные', 'RAL 9001', 'linear-gradient(135deg, #fff7d6, #f1dea4)'),
        createRoomRepairColorOption('Цвет: слоновая кость · RAL 1015', 'Светлые нейтральные', 'RAL 1015', 'linear-gradient(135deg, #f6e6bd, #d9c08a)'),
        createRoomRepairColorOption('Цвет: бежевый песочный · RAL 1001', 'Светлые нейтральные', 'RAL 1001', 'linear-gradient(135deg, #d9c39a, #b89763)'),
        createRoomRepairColorOption('Цвет: светло-серый · RAL 7035', 'Серые и графитовые', 'RAL 7035', 'linear-gradient(135deg, #d7d7d2, #a9aaa5)'),
        createRoomRepairColorOption('Цвет: серый пыльный · RAL 7044', 'Серые и графитовые', 'RAL 7044', 'linear-gradient(135deg, #c9c5b8, #8f8b80)'),
        createRoomRepairColorOption('Цвет: графитовый · RAL 7024', 'Серые и графитовые', 'RAL 7024', 'linear-gradient(135deg, #475569, #0f172a)'),
        createRoomRepairColorOption('Цвет: антрацит · RAL 7016', 'Серые и графитовые', 'RAL 7016', 'linear-gradient(135deg, #374151, #111827)'),
        createRoomRepairColorOption('Цвет: натуральный дуб · Oak Natural', 'Дерево', 'Oak Natural', 'linear-gradient(135deg, #d7a45f, #8a5529)'),
        createRoomRepairColorOption('Цвет: беленый дуб · White Oak', 'Дерево', 'White Oak', 'linear-gradient(135deg, #fff7ed, #d8c7ad)'),
        createRoomRepairColorOption('Цвет: дымчатый дуб · Smoked Oak', 'Дерево', 'Smoked Oak', 'linear-gradient(135deg, #9a8f82, #5b5248)'),
        createRoomRepairColorOption('Цвет: ясень натуральный · Ash Natural', 'Дерево', 'Ash Natural', 'linear-gradient(135deg, #f3ead8, #d6c4a8)'),
        createRoomRepairColorOption('Цвет: орех американский · American Walnut', 'Дерево', 'American Walnut', 'linear-gradient(135deg, #7c3f18, #b8793f)'),
        createRoomRepairColorOption('Цвет: венге · Wenge', 'Дерево', 'Wenge', 'linear-gradient(135deg, #1c1008, #3f2415)'),
        createRoomRepairColorOption('Цвет: светло-коричневый · RAL 8025', 'Коричневые', 'RAL 8025', 'linear-gradient(135deg, #d9a066, #a1622d)'),
        createRoomRepairColorOption('Цвет: коричневый · RAL 8007', 'Коричневые', 'RAL 8007', 'linear-gradient(135deg, #8b451d, #5c2f14)'),
        createRoomRepairColorOption('Цвет: темно-коричневый · RAL 8017', 'Коричневые', 'RAL 8017', 'linear-gradient(135deg, #4a250f, #1f1309)'),
        createRoomRepairColorOption('Цвет: под бетон светлый · Concrete Light', 'Камень и бетон', 'Concrete Light', 'linear-gradient(135deg, #e2e8f0, #94a3b8)'),
        createRoomRepairColorOption('Цвет: под бетон теплый · Warm Concrete', 'Камень и бетон', 'Warm Concrete', 'linear-gradient(135deg, #d6d0c4, #8f8778)'),
        createRoomRepairColorOption('Цвет: под камень каррара · Carrara Marble', 'Камень и бетон', 'Carrara Marble', 'linear-gradient(135deg, #f8fafc, #cbd5e1 45%, #94a3b8 47%, #e2e8f0)'),
        createRoomRepairColorOption('Цвет: травертин · Travertine Beige', 'Камень и бетон', 'Travertine Beige', 'repeating-linear-gradient(135deg, #d9c6a3 0 10px, #bda57c 10px 14px, #efe4cf 14px 24px)'),
        createRoomRepairColorOption('Цвет: терраццо светлый · Terrazzo Light', 'Камень и бетон', 'Terrazzo Light', 'radial-gradient(circle at 25% 30%, #92400e 0 9%, transparent 10%), radial-gradient(circle at 68% 35%, #334155 0 7%, transparent 8%), radial-gradient(circle at 50% 72%, #d97706 0 8%, transparent 9%), #f8fafc'),
        createRoomRepairColorOption('Цвет: индивидуальный оттенок · NCS / RAL на выбор', 'Индивидуальные', 'NCS / RAL', 'linear-gradient(135deg, #f59e0b, #22c55e 34%, #38bdf8 67%, #a855f7)')
      ];
    }

    function getRoomRepairWallColorOptions() {
      return [
        ...getRoomRepairFloorColorOptions(),
        createRoomRepairColorOption('Цвет: мягкий greige · NCS S 2005-Y50R', 'Дизайнерские нейтральные', 'NCS S 2005-Y50R', 'linear-gradient(135deg, #d5c9bc, #a99a8d)'),
        createRoomRepairColorOption('Цвет: taupe · NCS S 4005-Y50R', 'Дизайнерские нейтральные', 'NCS S 4005-Y50R', 'linear-gradient(135deg, #9c8d82, #675b52)'),
        createRoomRepairColorOption('Цвет: шалфейный · NCS S 3010-G30Y', 'Сложные зеленые', 'NCS S 3010-G30Y', 'linear-gradient(135deg, #9aaa86, #5f7556)'),
        createRoomRepairColorOption('Цвет: оливковый · RAL 6003', 'Сложные зеленые', 'RAL 6003', 'linear-gradient(135deg, #6b7050, #3f472a)'),
        createRoomRepairColorOption('Цвет: малахитовый · RAL 6005', 'Сложные зеленые', 'RAL 6005', 'linear-gradient(135deg, #0b4f3a, #21a179 48%, #06281f)'),
        createRoomRepairColorOption('Цвет: пыльно-синий · NCS S 4010-R90B', 'Синие и дымчатые', 'NCS S 4010-R90B', 'linear-gradient(135deg, #8194a6, #46596b)'),
        createRoomRepairColorOption('Цвет: глубокий синий · RAL 5008', 'Синие и дымчатые', 'RAL 5008', 'linear-gradient(135deg, #26394d, #111827)'),
        createRoomRepairColorOption('Цвет: винный · RAL 3005', 'Акцентные глубокие', 'RAL 3005', 'linear-gradient(135deg, #641e2c, #2a0d13)'),
        createRoomRepairColorOption('Цвет: терракотовый · RAL 3012', 'Акцентные глубокие', 'RAL 3012', 'linear-gradient(135deg, #bf7058, #7c3f2c)'),
        createRoomRepairColorOption('Цвет: Marmorino Bianco Calce · RAL 9016 ориентир', 'Минеральные светлые', 'RAL 9016', 'linear-gradient(135deg, #fffef7, #f1efe3 46%, #ffffff 48%, #dedbd0)', { appliesTo: /штукатур|венециан/i }),
        createRoomRepairColorOption('Цвет: Marmorino Avorio · RAL 1013 ориентир', 'Минеральные светлые', 'RAL 1013', 'linear-gradient(135deg, #f6ead0, #fffaf0 44%, #d8c7a2 46%, #f8f1df)', { appliesTo: /штукатур|венециан/i }),
        createRoomRepairColorOption('Цвет: Travertino Sabbia · RAL 1015 ориентир', 'Травертин и песок', 'RAL 1015', 'repeating-linear-gradient(135deg, #ead7b5 0 8px, #c8aa78 8px 11px, #fff3d8 11px 20px)', { appliesTo: /штукатур|венециан/i }),
        createRoomRepairColorOption('Цвет: Travertino Noce · RAL 1001 ориентир', 'Травертин и песок', 'RAL 1001', 'repeating-linear-gradient(135deg, #b98f5d 0 9px, #7c5a38 9px 12px, #dfc098 12px 23px)', { appliesTo: /штукатур|венециан/i }),
        createRoomRepairColorOption('Цвет: Concrete Grigio Chiaro · RAL 7047 ориентир', 'Бетон и лофт', 'RAL 7047', 'linear-gradient(135deg, #e5e7eb, #b8bec6 45%, #f8fafc 48%, #9ca3af)', { appliesTo: /штукатур|микроцемент/i }),
        createRoomRepairColorOption('Цвет: Concrete Grigio Medio · RAL 7044 ориентир', 'Бетон и лофт', 'RAL 7044', 'linear-gradient(135deg, #c9c5b8, #8f8b80 46%, #d6d3c8 48%, #6b7280)', { appliesTo: /штукатур|микроцемент/i }),
        createRoomRepairColorOption('Цвет: Concrete Antracite · RAL 7016 ориентир', 'Бетон и лофт', 'RAL 7016', 'linear-gradient(135deg, #4b5563, #111827 52%, #6b7280)', { appliesTo: /штукатур|микроцемент/i }),
        createRoomRepairColorOption('Цвет: Seta Champagne · перламутровый шелк', 'Шелк и перламутр', 'Seta Champagne', 'linear-gradient(135deg, #fff7ed, #f9d9a7 35%, #ffffff 52%, #dbeafe 78%)', { appliesTo: /штукатур/i }),
        createRoomRepairColorOption('Цвет: Seta Madreperla · жемчужный шелк', 'Шелк и перламутр', 'Seta Madreperla', 'linear-gradient(135deg, #f8fafc, #f5d0fe 32%, #dbeafe 64%, #ffffff)', { appliesTo: /штукатур/i }),
        createRoomRepairColorOption('Цвет: Sabbia Oro · песок с золотом', 'Металлик и спецэффекты', 'Sabbia Oro', 'radial-gradient(circle at 24% 28%, #fde68a 0 4%, transparent 5%), radial-gradient(circle at 70% 66%, #f59e0b 0 3%, transparent 4%), linear-gradient(135deg, #e7c781, #8a6a2f)', { appliesTo: /штукатур|венециан/i }),
        createRoomRepairColorOption('Цвет: Metalline Bronzo · бронзовый металл', 'Металлик и спецэффекты', 'Metalline Bronzo', 'linear-gradient(135deg, #3b2416, #b7793f 45%, #f4c27a 48%, #5a2e18)', { appliesTo: /штукатур/i }),
        createRoomRepairColorOption('Цвет: Metalline Argento · серебристый металл', 'Металлик и спецэффекты', 'Metalline Argento', 'linear-gradient(135deg, #f8fafc, #94a3b8 42%, #ffffff 48%, #475569)', { appliesTo: /штукатур/i }),
        createRoomRepairColorOption('Цвет: Onice Ambra · янтарный оникс', 'Оникс и камень', 'Onice Ambra', 'linear-gradient(135deg, #7c2d12, #f59e0b 42%, #fff7ed 45%, #b45309 72%, #431407)', { appliesTo: /венециан|штукатур/i }),
        createRoomRepairColorOption('Цвет: Malachite Deep · малахитовый камень', 'Оникс и камень', 'Malachite Deep', 'linear-gradient(135deg, #022c22, #059669 35%, #a7f3d0 38%, #065f46 70%, #011f18)', { appliesTo: /венециан|штукатур/i }),
        createRoomRepairColorOption('Цвет: черный с золотом Imperiale · Settef Imperiale Nero Oro', 'Мрамор и венецианские эффекты', 'Settef Imperiale Nero Oro', 'linear-gradient(135deg, #09090b, #1f2937 48%, #d4af37 50%, #6b4f12)', { appliesTo: /венециан|штукатур/i }),
        createRoomRepairColorOption('Цвет: Carrara Marmorino · Settef Marmorino Carrara', 'Мрамор и венецианские эффекты', 'Settef Marmorino Carrara', 'linear-gradient(135deg, #f8fafc, #e5e7eb 42%, #94a3b8 44%, #ffffff 70%, #cbd5e1)', { appliesTo: /венециан|штукатур/i }),
        createRoomRepairColorOption('Цвет: Encausto Granito Nero · гранитный черный', 'Мрамор и венецианские эффекты', 'Encausto Granito Nero', 'radial-gradient(circle at 28% 22%, #94a3b8 0 3%, transparent 4%), radial-gradient(circle at 70% 64%, #e5e7eb 0 2%, transparent 3%), linear-gradient(135deg, #111827, #374151)', { appliesTo: /венециан|штукатур/i }),
        createRoomRepairColorOption('Цвет: Marbello Grigio · серый с глянцевыми прожилками', 'Мрамор и венецианские эффекты', 'Marbello Grigio', 'linear-gradient(135deg, #64748b, #cbd5e1 46%, #f8fafc 48%, #334155)', { appliesTo: /венециан|штукатур/i }),
        createRoomRepairColorOption('Цвет: Palmie Onice Verde · зеленый оникс', 'Мрамор и венецианские эффекты', 'Palmie Onice Verde', 'linear-gradient(135deg, #064e3b, #34d399 44%, #e0f2fe 46%, #065f46 72%, #022c22)', { appliesTo: /венециан|штукатур/i }),
        createRoomRepairColorOption('Цвет: Palmie Onice Blu · голубой оникс', 'Мрамор и венецианские эффекты', 'Palmie Onice Blu', 'linear-gradient(135deg, #0f172a, #38bdf8 42%, #e0f2fe 44%, #1d4ed8 70%, #0b1120)', { appliesTo: /венециан|штукатур/i }),
        createRoomRepairColorOption('Цвет: Perla Madre · перламутровый', 'Мрамор и венецианские эффекты', 'Perla Madre', 'linear-gradient(135deg, #fff7ed, #dbeafe 33%, #f5d0fe 66%, #ffffff)', { appliesTo: /венециан|штукатур/i }),
        createRoomRepairColorOption('Цвет: Trevignano Travertino · травертин глянцевый', 'Мрамор и венецианские эффекты', 'Trevignano Travertino', 'repeating-linear-gradient(135deg, #efe2c8 0 9px, #c9a873 9px 12px, #fff7ed 12px 22px)', { appliesTo: /венециан|штукатур/i })
      ];
    }

    function getRoomRepairBuilderCatalog() {
      return [
        {
          key: 'demolition',
          label: 'Демонтаж',
          icon: 'fa-hammer',
          hint: 'Отдельный этап для снятия старых покрытий, разборки и подготовки зоны демонтажа.',
          children: [
            { key: 'demoFinish', label: 'Демонтаж отделки', section: 'demolition', icon: 'fa-broom', hint: 'Снимаем старые покрытия пола, стен и потолка.', options: ['Демонтаж старой отделки пола', 'Демонтаж старых покрытий стен', 'Демонтаж потолочного покрытия', 'Демонтаж старой сантехники / приборов в зоне подключения'] },
            { key: 'demoPartitions', label: 'Демонтаж перегородок', section: 'demolition', icon: 'fa-person-digging', hint: 'Работы по перепланировке, разборке и освобождению проемов.', options: ['Разметка зон перепланировки', 'Демонтаж старых перегородок', 'Демонтаж старых покрытий стен', 'Подготовка проемов перед демонтажом'] }
          ]
        },
        {
          key: 'roughing',
          label: 'Черновая отделка',
          icon: 'fa-trowel-bricks',
          hint: 'Подготовка оснований, перегородки, стяжка, штукатурка и базовые слои перед чистовой отделкой.',
          children: [
            { key: 'partitionBuild', label: 'Перегородки', section: 'walls', icon: 'fa-border-all', hint: 'Новые перегородки, усиления и подготовка примыканий.', options: ['Возведение новых перегородок', 'Перегородка из ГКЛ с шумоизоляцией', 'Усиление проема под дверь', 'Подготовка проемов / примыканий под новую планировку'] },
            {
              key: 'roughFloor',
              label: 'Подготовка пола',
              section: 'floor',
              icon: 'fa-layer-group',
              hint: 'Стяжка, гидроизоляция, шумоизоляция и основание.',
              options: [
                'Механизированная стяжка пола',
                'Полусухая стяжка пола',
                'Наливной финишный слой под чистовое покрытие',
                'Гидроизоляция пола',
                'Шумоизоляция пола',
                'Подготовка основания под теплый пол',
                'Локальная подготовка основания перед ремонтом',
                'Подготовка основания под будущую отделку'
              ]
            },
            {
              key: 'roughWalls',
              label: 'Подготовка стен',
              section: 'walls',
              icon: 'fa-border-all',
              hint: 'Штукатурка, шпаклевка и подготовка под финиш.',
              options: [
                'Штукатурка стен по маякам',
                'Цементная штукатурка во влажной зоне',
                'Шпаклевка стен под финиш',
                'Стеклохолст под покраску',
                'Финишная подготовка стен под чистовую отделку'
              ]
            },
            {
              key: 'roughCeiling',
              label: 'Подготовка потолка',
              section: 'ceiling',
              icon: 'fa-layer-group',
              hint: 'Базовая подготовка потолка под выбранный тип отделки.',
              options: [
                'Базовая подготовка потолка',
                'Выравнивание потолка под покраску',
                'Стеклохолст на потолок под покраску',
                'Подготовка основания под ГКЛ-потолок',
                'Подготовка основания под натяжной потолок'
              ]
            }
          ]
        },
        {
          key: 'finish',
          label: 'Чистовая отделка',
          icon: 'fa-swatchbook',
          hint: 'Покрытия пола, стен, потолка и видимые финишные решения.',
          children: [
            {
              key: 'finishFloor',
              label: 'Пол',
              section: 'floor',
              icon: 'fa-grip',
              hint: 'Сначала выбирается один вид покрытия, затем раскрываются уточнения именно для него.',
              options: [
                'Ламинат',
                'Кварц-винил / SPC',
                'Паркетная доска',
                'Паркет',
                'Инженерная доска',
                'Керамогранит',
                'Керамическая плитка',
                'Линолеум',
                'Наливной пол',
                'Пробковое покрытие'
              ],
              detailGroups: [
                {
                  label: 'Формат покрытия',
                  choiceMode: 'single',
                  appliesTo: /ламинат|кварц|spc|паркет|инженер|керамогранит|плитк|линолеум|налив|пробков/i,
                  options: [
                    { label: 'Формат: доска / планка', appliesTo: /ламинат|кварц|spc|паркет|инженер/i, formatKey: 'plank' },
                    { label: 'Формат: замковая пробка', appliesTo: /пробков/i, formatKey: 'cork_lock' },
                    { label: 'Формат: клеевая пробка', appliesTo: /пробков/i, formatKey: 'cork_glue' },
                    { label: 'Формат: плитка / модуль', appliesTo: /кварц|spc|керамогранит|плитк/i, formatKey: 'tile_module' },
                    { label: 'Формат: короткая (мелкая) плашка', appliesTo: /паркет|инженер/i, formatKey: 'short_plank' },
                    { label: 'Формат: модуль / щит', appliesTo: /паркет|инженер/i, formatKey: 'module' },
                    { label: 'Формат: фигурная', appliesTo: /кварц|spc|керамогранит|плитк/i, formatKey: 'figured' },
                    { label: 'Формат: крупноформатная плита', appliesTo: /керамогранит|плитк/i, formatKey: 'large_tile' },
                    { label: 'Формат: рулонное покрытие', appliesTo: /линолеум/i, formatKey: 'roll' },
                    { label: 'Формат: полимерные полы', appliesTo: /налив/i, formatKey: 'polymer_floor' },
                    { label: 'Формат: эпоксидные полы', appliesTo: /налив/i, formatKey: 'epoxy_floor' },
                    { label: 'Формат: полиуретановые полы', appliesTo: /налив/i, formatKey: 'polyurethane_floor' },
                    { label: 'Формат: кварцевые полы', appliesTo: /налив/i, formatKey: 'quartz_floor' },
                    { label: 'Формат: декоративные 3D полы', appliesTo: /налив/i, formatKey: 'decor_3d_floor' }
                  ]
                },
                {
                  label: 'Класс покрытия',
                  choiceMode: 'single',
                  noAutoQuantity: true,
                  appliesTo: /ламинат|кварц|spc|керамогранит|плитк|линолеум|пробков/i,
                  options: [
                    { label: 'Класс: 31 бытовой усиленный', appliesTo: /ламинат|кварц|spc|линолеум|пробков/i, formatApplies: ['plank', 'tile_module', 'roll', 'cork_lock', 'cork_glue'] },
                    { label: 'Класс: 32 для активной жилой зоны', appliesTo: /ламинат|кварц|spc|линолеум|пробков/i, formatApplies: ['plank', 'tile_module', 'roll', 'cork_lock', 'cork_glue'] },
                    { label: 'Класс: 33 коммерческий легкий', appliesTo: /ламинат|кварц|spc|линолеум|пробков/i, formatApplies: ['plank', 'tile_module', 'roll', 'cork_lock', 'cork_glue'] },
                    { label: 'Класс: 34 повышенная нагрузка', appliesTo: /ламинат|кварц|spc|линолеум/i, formatApplies: ['plank', 'tile_module', 'roll'] },
                    { label: 'Класс: 43 промышленная нагрузка', appliesTo: /кварц|spc|линолеум/i, formatApplies: ['plank', 'tile_module', 'roll'] },
                    { label: 'Класс: PEI II для легкой нагрузки', appliesTo: /керамогранит|плитк/i, formatApplies: ['tile_module', 'figured', 'large_tile'] },
                    { label: 'Класс: PEI III для жилых помещений', appliesTo: /керамогранит|плитк/i, formatApplies: ['tile_module', 'figured', 'large_tile'] },
                    { label: 'Класс: PEI IV для активной зоны', appliesTo: /керамогранит|плитк/i, formatApplies: ['tile_module', 'figured', 'large_tile'] },
                    { label: 'Класс: PEI V для высокой нагрузки', appliesTo: /керамогранит|плитк/i, formatApplies: ['tile_module', 'figured', 'large_tile'] }
                  ]
                },
                {
                  label: 'Тип покрытия',
                  choiceMode: 'single',
                  noAutoQuantity: true,
                  appliesTo: /ламинат|кварц|spc|паркет|инженер|керамогранит|плитк|линолеум|налив|пробков/i,
                  options: [
                    { label: 'Тип: влагостойкий ламинат', appliesTo: /ламинат/i },
                    { label: 'Тип: водостойкий ламинат', appliesTo: /ламинат/i },
                    { label: 'Тип: ламинат с фаской', appliesTo: /ламинат/i },
                    { label: 'Тип: клеевая LVT-плитка', appliesTo: /кварц|spc/i, formatApplies: ['plank', 'tile_module'] },
                    { label: 'Тип: замковый SPC', appliesTo: /кварц|spc/i, formatApplies: ['plank', 'tile_module'] },
                    { label: 'Тип: жесткий Rigid Vinyl', appliesTo: /кварц|spc/i, formatApplies: ['plank', 'tile_module'] },
                    { label: 'Тип: глянцевая поверхность', appliesTo: /керамогранит|плитк/i },
                    { label: 'Тип: матовая поверхность', appliesTo: /керамогранит|плитк/i },
                    { label: 'Тип: полированная поверхность', appliesTo: /керамогранит|плитк/i },
                    { label: 'Тип: лаппатированная поверхность', appliesTo: /керамогранит|плитк/i },
                    { label: 'Тип: сатинированная поверхность', appliesTo: /керамогранит|плитк/i },
                    { label: 'Тип: структурированная поверхность', appliesTo: /керамогранит|плитк/i },
                    { label: 'Тип: неглазурованная техническая плитка', appliesTo: /керамогранит|плитк/i },
                    { label: 'Тип: лакированное глянцевое покрытие', appliesTo: /паркетная|инженер/i },
                    { label: 'Тип: лакированное матовое / полуматовое покрытие', appliesTo: /паркетная|инженер/i },
                    { label: 'Тип: масляное покрытие', appliesTo: /паркетная|инженер/i },
                    { label: 'Тип: масляно-восковое покрытие', appliesTo: /паркетная|инженер/i },
                    { label: 'Тип: УФ-масло', appliesTo: /паркетная|инженер/i },
                    { label: 'Тип: брашированное покрытие', appliesTo: /паркетная|инженер/i },
                    { label: 'Тип: без заводского покрытия', appliesTo: /паркетная|инженер/i },
                    { label: 'Тип: лакированное покрытие', appliesTo: /паркет(?!ная)/i },
                    { label: 'Тип: покрытие натуральным маслом', appliesTo: /паркет(?!ная)/i },
                    { label: 'Тип: масляно-восковое покрытие', appliesTo: /паркет(?!ная)/i },
                    { label: 'Тип: паркет без покрытия', appliesTo: /паркет(?!ная)/i },
                    { label: 'Тип: брашированный паркет с покрытием', appliesTo: /паркет(?!ная)/i },
                    { label: 'Тип: бытовой линолеум', appliesTo: /линолеум/i },
                    { label: 'Тип: полукоммерческий линолеум', appliesTo: /линолеум/i },
                    { label: 'Тип: коммерческий линолеум', appliesTo: /линолеум/i },
                    { label: 'Тип: гомогенный линолеум', appliesTo: /линолеум/i },
                    { label: 'Тип: замковая пробка с лаком', appliesTo: /пробков/i, formatApplies: ['cork_lock'] },
                    { label: 'Тип: клеевая пробка под лак', appliesTo: /пробков/i, formatApplies: ['cork_glue'] },
                    { label: 'Тип: клеевая пробка с заводским лаком', appliesTo: /пробков/i, formatApplies: ['cork_glue'] },
                    { label: 'Тип: однотонный наливной пол', appliesTo: /налив/i },
                    { label: 'Тип: декоративный наливной пол', appliesTo: /налив/i },
                    { label: 'Тип: наливной пол с кварцевым песком', appliesTo: /налив/i },
                  ]
                },
                {
                  label: 'Финиш для покрытия без обработки',
                  choiceMode: 'single',
                  noAutoQuantity: true,
                  appliesTo: /паркет|инженер/i,
                  requiresSelected: /без.*покрыт/i,
                  options: [
                    { label: 'Финиш: лак' },
                    { label: 'Финиш: натуральное масло' },
                    { label: 'Финиш: масло-воск' },
                    { label: 'Финиш: твердый воск' }
                  ]
                },
                {
                  label: 'Форма покрытия',
                  choiceMode: 'single',
                  noAutoQuantity: true,
                  appliesTo: /ламинат|кварц|spc|паркет|инженер|керамогранит|плитк|линолеум|налив|пробков/i,
                  options: [
                    { label: 'Форма: монолитная', appliesTo: /налив/i, formatApplies: ['polymer_floor', 'epoxy_floor', 'polyurethane_floor', 'quartz_floor', 'decor_3d_floor'], shapeKey: 'monolithic' },
                    { label: 'Форма: прямоугольная', appliesTo: /ламинат|кварц|spc|паркет|инженер|линолеум|пробков/i, formatApplies: ['plank', 'short_plank', 'roll', 'cork_lock'], shapeKey: 'rectangle' },
                    { label: 'Форма: квадратная', appliesTo: /кварц|spc|паркет|инженер|керамогранит|плитк|пробков/i, formatApplies: ['tile_module', 'module', 'figured', 'large_tile', 'cork_glue'], shapeKey: 'square' },
                    { label: 'Форма: прямоугольная', appliesTo: /кварц|spc|паркет|инженер|керамогранит|плитк|пробков/i, formatApplies: ['tile_module', 'module', 'figured', 'large_tile', 'cork_glue'], shapeKey: 'rectangle' }
                  ]
                },
                {
                  label: 'Размер покрытия',
                  choiceMode: 'single',
                  appliesTo: /ламинат|кварц|spc|паркет|инженер|керамогранит|плитк|линолеум|налив|пробков/i,
                  options: [
                    { label: 'Размер: по площади заливки', appliesTo: /налив/i, formatApplies: ['polymer_floor', 'epoxy_floor', 'polyurethane_floor', 'quartz_floor', 'decor_3d_floor'], sizeKey: 'pour_area' },
                    { label: 'Размер: мелкий формат', appliesTo: /ламинат|кварц|spc|паркет|инженер|керамогранит|плитк|пробков/i, formatApplies: ['plank', 'short_plank', 'module', 'tile_module', 'figured', 'large_tile', 'cork_glue'], sizeKey: 'small', dimensions: true },
                    { label: 'Размер: стандартный формат', appliesTo: /ламинат|кварц|spc|паркет|инженер|керамогранит|плитк|линолеум|пробков/i, formatApplies: ['plank', 'short_plank', 'module', 'tile_module', 'figured', 'large_tile', 'roll', 'cork_lock', 'cork_glue'], sizeKey: 'standard', dimensions: true },
                    { label: 'Размер: широкий формат', appliesTo: /ламинат|кварц|spc|паркет|инженер|пробков/i, formatApplies: ['plank', 'short_plank', 'module', 'cork_lock', 'cork_glue'], sizeKey: 'wide', dimensions: true },
                    { label: 'Размер: средний формат', appliesTo: /керамогранит|плитк/i, formatApplies: ['tile_module', 'figured', 'large_tile'], sizeKey: 'medium', dimensions: true },
                    { label: 'Размер: крупный формат', appliesTo: /ламинат|кварц|spc|паркет|инженер|керамогранит|плитк|пробков/i, formatApplies: ['plank', 'short_plank', 'module', 'tile_module', 'figured', 'large_tile', 'cork_lock', 'cork_glue'], sizeKey: 'large', dimensions: true },
                    { label: 'Размер: свой размер элемента', appliesTo: /ламинат|кварц|spc|паркет|инженер|керамогранит|плитк|пробков/i, formatApplies: ['plank', 'short_plank', 'module', 'tile_module', 'figured', 'large_tile', 'cork_lock', 'cork_glue'], sizeKey: 'custom', dimensions: true }
                  ]
                },
                {
                  label: 'Цветовая гамма',
                  choiceMode: 'single',
                  noAutoQuantity: true,
                  appliesTo: /ламинат|кварц|spc|паркет|инженер|керамогранит|плитк|линолеум|налив|пробков/i,
                  options: getRoomRepairFloorColorOptions()
                },
                {
                  label: 'Способ укладки',
                  choiceMode: 'single',
                  options: [
                    { label: 'Базовая прямая укладка', appliesTo: /ламинат|кварц|spc|паркет|инженер|керамогранит|плитк|пробков/i },
                    { label: 'Диагональная укладка с подрезкой', appliesTo: /ламинат|кварц|spc|паркет|инженер|керамогранит|плитк|пробков/i },
                    { label: 'Плавающий способ укладки', appliesTo: /ламинат|кварц|spc|паркетная|инженер|пробков/i, formatApplies: ['plank', 'short_plank', 'cork_lock'] },
                    { label: 'Клеевой способ укладки', appliesTo: /кварц|spc|паркет|инженер|пробков/i, formatApplies: ['plank', 'short_plank', 'module', 'tile_module', 'figured', 'large_tile', 'cork_glue'] },
                    { label: 'Бесшовная заливка по подготовленному основанию', appliesTo: /налив/i, formatApplies: ['polymer_floor', 'epoxy_floor', 'polyurethane_floor', 'quartz_floor', 'decor_3d_floor'] },
                    { label: 'Укладка елкой', appliesTo: /паркет|инженер|кварц|spc/i },
                    { label: 'Укладка линолеума на клей', appliesTo: /линолеум/i },
                    { label: 'Свободная укладка линолеума без клея', appliesTo: /линолеум/i },
                    { label: 'Частичная приклейка линолеума', appliesTo: /линолеум/i },
                    { label: 'Горячая сварка швов линолеума', appliesTo: /линолеум/i, quantity: { label: 'м.п.', suffix: 'м.п. горячей сварки швов', defaultValue: 8, min: 0.1, max: 200, step: 0.1, mode: 'perimeter' } }
                  ]
                },
                {
                  label: 'Дополнительные опции',
                  options: [
                    { label: 'Общая усиленная подготовка основания пола', appliesTo: /ламинат|кварц|spc|паркет|инженер|керамогранит|плитк|линолеум|налив|пробков/i, quantity: { label: 'м²', suffix: 'м² общей усиленной подготовки основания пола', mode: 'floorArea', min: 0.1, max: 2000, step: 0.1, noZoneSelector: true } },
                    { label: 'Шумоизоляция пола', appliesTo: /ламинат|паркет|инженер|пробков/i, quantity: { label: 'м²', suffix: 'м² шумоизоляции пола', mode: 'floorArea', min: 0.1, max: 2000, step: 0.1, noZoneSelector: true } },
                    { label: 'Порог / переход между покрытиями', appliesTo: /ламинат|кварц|spc|паркет|инженер|керамогранит|плитк|линолеум|пробков/i, quantity: { label: 'см', suffix: 'см', mode: 'doorThresholdCm', min: 10, max: 500, step: 1, noZoneSelector: true } },
                    { label: 'Плитка с запилом 45 градусов', appliesTo: /керамогранит|плитк/i, quantity: { label: 'м.п.', suffix: 'м.п. запила 45 градусов', defaultValue: 2, min: 0.1, max: 200, step: 0.1, mode: 'perimeter' } },
                    { label: 'Мозаика на полу отдельной зоной', appliesTo: /керамогранит|плитк/i, quantity: { label: 'м²', suffix: 'м² мозаики на полу', defaultValue: 1, min: 0.1, max: 200, step: 0.1, mode: 'floorArea' } },
                    { label: 'Бордюр по периметру', appliesTo: /керамогранит|плитк/i, quantity: { label: 'м.п.', suffix: 'м.п. бордюра', defaultValue: 12, min: 0.1, max: 300, step: 0.1, mode: 'perimeter' } },
                    { label: 'Декоративные вставки на полу', appliesTo: /керамогранит|плитк|паркет/i, quantity: { label: 'м²', suffix: 'м² декоративных вставок', defaultValue: 0.5, min: 0.1, max: 100, step: 0.1, mode: 'floorArea' } }
                  ]
                }
              ]
            },
            {
              key: 'finishWalls',
              label: 'Стены',
              section: 'walls',
              icon: 'fa-paint-roller',
              hint: 'Сначала распределите покрытия по зонам стен, затем уточните тип, цвет, фактуру и способ нанесения.',
              options: [
                'Покраска стен',
                'Обои',
                'Фотообои',
                'Декоративная / Венецианская штукатурка',
                'Микроцемент на стенах',
                'Керамическая плитка',
                'Керамогранит',
                'МДФ панели',
                'Реечные панели',
                'Молдинги / декоративные профили',
                'Гипсовые 3D панели',
                'Мягкие панели',
                'Бамбуковые панели',
                'Гибкий мрамор',
                'Декоративный камень / каменный шпон',
                'Стеклянные панели',
                'Зеркальные панели'
              ],
              detailGroups: [
                {
                  label: 'Формат покрытия',
                  choiceMode: 'single',
                  appliesTo: /обои|фотообои|штукатур|микроцемент|плитк|керамогранит|панел|бамбук|мрамор|камень|шпон|стекл|зеркал|молдинг|профил/i,
                  options: [
                    { label: 'Формат: рулонное покрытие', appliesTo: /обои|фотообои/i, formatKey: 'roll' },
                    { label: 'Формат: обои под покраску', appliesTo: /(^|[^а-яё])обои([^а-яё]|$)/i, formatKey: 'wallpaper_paint' },
                    { label: 'Формат: нанесение сплошным слоем', appliesTo: /окраск|краск|штукатур|микроцемент/i, formatKey: 'coat' },
                    { label: 'Формат: плитка / модуль', appliesTo: /плитк|керамогранит|мдф|гипсов|3d|камень|шпон|стекл|зеркал/i, formatKey: 'tile_module' },
                    { label: 'Формат: крупноформатная плита', appliesTo: /керамогранит|гипсов|3d|стекл|зеркал/i, formatKey: 'large_tile' },
                    { label: 'Формат: рейки / ламели', appliesTo: /рееч|бамбук/i, formatKey: 'slat' },
                    { label: 'Формат: листовой гибкий камень', appliesTo: /гибк|мрамор/i, formatKey: 'flex_stone_sheet' },
                    { label: 'Формат: настенный молдинг', appliesTo: /молдинг|профил/i, formatKey: 'wall_molding' },
                    { label: 'Формат: декоративная рейка / профиль', appliesTo: /молдинг|профил/i, formatKey: 'decor_profile' },
                    { label: 'Формат: рамочная композиция', appliesTo: /молдинг|профил/i, formatKey: 'frame_molding' },
                    { label: 'Формат: угловой профиль', appliesTo: /молдинг|профил/i, formatKey: 'corner_profile' },
                    { label: 'Формат: каретная стяжка', appliesTo: /мягк/i, formatKey: 'soft_carriage' },
                    { label: 'Формат: мягкие панели простой формы', appliesTo: /мягк/i, formatKey: 'soft_plain' },
                    { label: 'Формат: мягкие панели с декоративными вставками', appliesTo: /мягк/i, formatKey: 'soft_insert' }
                  ]
                },
                {
                  label: 'Класс покрытия',
                  choiceMode: 'single',
                  noAutoQuantity: true,
                  appliesTo: /краск|обои|мдф|гипсов|3d|плитк|керамогранит|бамбук/i,
                  options: [
                    { label: 'Класс: базовая жилая зона', appliesTo: /краск|обои|мдф|гипсов|3d/i },
                    { label: 'Класс: моющееся покрытие', appliesTo: /краск|обои/i },
                    { label: 'Класс: износостойкое покрытие', appliesTo: /краск|обои|мдф|гипсов|3d|бамбук/i },
                    { label: 'Класс: влагостойкое покрытие', appliesTo: /краск|обои|плитк|керамогранит/i },
                    { label: 'Класс: антивандальное покрытие', appliesTo: /краск|мдф|гипсов|3d/i }
                  ]
                },
                {
                  label: 'Тип покрытия',
                  choiceMode: 'single',
                  noAutoQuantity: true,
                  appliesTo: /покраск|окраск|краск|обои|фотообои|штукатур|микроцемент|плитк|керамогранит|панел|камень|шпон|стекл|зеркал|мрамор|бамбук|молдинг|профил/i,
                  options: [
                    { label: 'Тип: матовая моющаяся краска', appliesTo: /покраск|окраск|краск/i },
                    { label: 'Тип: глубокоматовая краска', appliesTo: /покраск|окраск|краск/i },
                    { label: 'Тип: влагостойкая краска', appliesTo: /покраск|окраск|краск/i },
                    { label: 'Тип: антивандальная краска', appliesTo: /покраск|окраск|краск|антиванд/i },
                    { label: 'Тип: флизелиновые обои', appliesTo: /обои/i },
                    { label: 'Тип: виниловые моющиеся обои', appliesTo: /обои/i },
                    { label: 'Тип: бесшовные фотообои', appliesTo: /фотообои/i },
                    { label: 'Тип: Marmorino Carrara / венецианская штукатурка', appliesTo: /штукатур/i, visualStyle: 'linear-gradient(135deg, #f8fafc, #e5e7eb 42%, #94a3b8 44%, #ffffff 70%, #cbd5e1)' },
                    { label: 'Тип: Венецианская штукатурка под мрамор', appliesTo: /штукатур/i, visualStyle: 'linear-gradient(135deg, #fff7ed, #f8fafc 36%, #cbd5e1 39%, #ffffff 64%, #94a3b8)' },
                    { label: 'Тип: Encausto / гранитная глубина', appliesTo: /штукатур/i, visualStyle: 'radial-gradient(circle at 26% 28%, #94a3b8 0 3%, transparent 4%), linear-gradient(135deg, #111827, #374151 55%, #6b7280)' },
                    { label: 'Тип: Travertino / травертин', appliesTo: /штукатур/i, visualStyle: 'repeating-linear-gradient(135deg, #ead7b5 0 8px, #c8aa78 8px 11px, #fff3d8 11px 20px)' },
                    { label: 'Тип: Декоративный бетон / Loft', appliesTo: /штукатур/i, visualStyle: 'linear-gradient(135deg, #e5e7eb, #9ca3af 48%, #6b7280)' },
                    { label: 'Тип: Эффект шелка / Damasco', appliesTo: /штукатур/i, visualStyle: 'linear-gradient(135deg, #fff7ed, #f9d9a7 35%, #ffffff 52%, #dbeafe 78%)' },
                    { label: 'Тип: Карта мира / островная фактура', appliesTo: /штукатур/i, visualStyle: 'radial-gradient(circle at 24% 34%, #d6d3d1 0 12%, transparent 13%), radial-gradient(circle at 70% 62%, #a8a29e 0 10%, transparent 11%), #f5f5f4' },
                    { label: 'Тип: Sabbia / песчаный эффект', appliesTo: /штукатур/i, visualStyle: 'radial-gradient(circle at 24% 28%, #fde68a 0 4%, transparent 5%), radial-gradient(circle at 70% 66%, #f59e0b 0 3%, transparent 4%), linear-gradient(135deg, #e7c781, #8a6a2f)' },
                    { label: 'Тип: Metalline / металлизированная техника', appliesTo: /штукатур/i, visualStyle: 'linear-gradient(135deg, #3b2416, #b7793f 45%, #f4c27a 48%, #5a2e18)' },
                    { label: 'Тип: Флоковое декоративное покрытие', appliesTo: /штукатур/i, visualStyle: 'radial-gradient(circle at 25% 30%, #92400e 0 6%, transparent 7%), radial-gradient(circle at 68% 35%, #334155 0 5%, transparent 6%), radial-gradient(circle at 50% 72%, #d97706 0 6%, transparent 7%), #f8fafc' },
                    { label: 'Тип: Авторская / трафаретная техника', appliesTo: /штукатур/i, visualStyle: 'repeating-linear-gradient(45deg, #f8fafc 0 8px, #d6d3d1 8px 10px, #ffffff 10px 18px)' },
                    { label: 'Тип: микроцемент влагостойкий', appliesTo: /микроцемент/i },
                    { label: 'Тип: матовая поверхность', appliesTo: /плитк|керамогранит/i },
                    { label: 'Тип: керамогранит для влажных зон', appliesTo: /керамогранит/i },
                    { label: 'Тип: полированная поверхность', appliesTo: /плитк|керамогранит/i },
                    { label: 'Тип: структурированная поверхность', appliesTo: /плитк|керамогранит/i },
                    { label: 'Тип: шпонированные панели', appliesTo: /мдф/i },
                    { label: 'Тип: окрашенные панели', appliesTo: /мдф/i },
                    { label: 'Тип: реечные панели / ламели', appliesTo: /рееч/i },
                    { label: 'Тип: гипсовые 3D панели под покраску', appliesTo: /гипсов|3d/i },
                    { label: 'Тип: мягкие панели с обивкой из велюра', appliesTo: /мягк/i },
                    { label: 'Тип: мягкие панели с обивкой из экокожи', appliesTo: /мягк/i },
                    { label: 'Тип: мягкие панели с обивкой из микровелюра', appliesTo: /мягк/i },
                    { label: 'Тип: мягкие панели с шумоизоляционной основой', appliesTo: /мягк/i },
                    { label: 'Тип: бамбуковые панели / ламели', appliesTo: /бамбук/i },
                    { label: 'Тип: гибкий мрамор на стену', appliesTo: /гибк|мрамор/i },
                    { label: 'Тип: декоративный каменный шпон', appliesTo: /камень|шпон/i },
                    { label: 'Тип: закаленное стекло', appliesTo: /стекл/i },
                    { label: 'Тип: зеркальное полотно', appliesTo: /зеркал/i },
                    { label: 'Тип: полиуретановый молдинг', appliesTo: /молдинг|профил/i },
                    { label: 'Тип: дюрополимерный профиль', appliesTo: /молдинг|профил/i },
                    { label: 'Тип: гипсовый декоративный профиль', appliesTo: /молдинг|профил/i },
                    { label: 'Тип: МДФ профиль', appliesTo: /молдинг|профил/i },
                    { label: 'Тип: деревянный профиль', appliesTo: /молдинг|профил/i },
                    { label: 'Тип: металлический / латунный профиль', appliesTo: /молдинг|профил/i }
                  ]
                },
                {
                  label: 'Система / эффект',
                  choiceMode: 'single',
                  noAutoQuantity: true,
                  appliesTo: /штукатур|венециан|микроцемент/i,
                  options: [
                    { label: 'Система: Marmorino Carrara / каррарский мрамор', appliesTo: /штукатур/i, requiresSelected: /marmorino carrara/i, visualStyle: 'linear-gradient(135deg, #f8fafc, #e5e7eb 42%, #94a3b8 44%, #ffffff 70%, #cbd5e1)' },
                    { label: 'Система: минеральная известковая база', appliesTo: /штукатур/i, requiresSelected: /marmorino carrara|венецианская.*мрамор/i, visualStyle: 'linear-gradient(135deg, #fffef7, #f1efe3 46%, #ffffff 48%, #dedbd0)' },
                    { label: 'Система: гладкая венецианская техника', appliesTo: /штукатур/i, requiresSelected: /венецианская.*мрамор/i, visualStyle: 'linear-gradient(135deg, #fff7ed, #ffffff 40%, #cbd5e1 43%, #f8fafc)' },
                    { label: 'Система: энкаусто / гранитная глубина', appliesTo: /штукатур/i, requiresSelected: /encausto|гранит/i, visualStyle: 'radial-gradient(circle at 28% 22%, #94a3b8 0 3%, transparent 4%), linear-gradient(135deg, #111827, #374151)' },
                    { label: 'Система: травертин с прожилками', appliesTo: /штукатур/i, requiresSelected: /travertino|травертин/i, visualStyle: 'repeating-linear-gradient(135deg, #ead7b5 0 8px, #c8aa78 8px 11px, #fff3d8 11px 20px)' },
                    { label: 'Система: декоративный бетон / loft', appliesTo: /штукатур|микроцемент/i, requiresSelected: /бетон|loft|микроцемент/i, visualStyle: 'linear-gradient(135deg, #e5e7eb, #9ca3af 48%, #6b7280)' },
                    { label: 'Система: Damasco / мокрый шелк', appliesTo: /штукатур/i, requiresSelected: /шелк|damasco/i, visualStyle: 'linear-gradient(135deg, #fff7ed, #f9d9a7 35%, #ffffff 52%, #dbeafe 78%)' },
                    { label: 'Система: Cristallo / перламутровый шелк', appliesTo: /штукатур/i, requiresSelected: /шелк|damasco/i, visualStyle: 'linear-gradient(135deg, #f8fafc, #f5d0fe 32%, #dbeafe 64%, #ffffff)' },
                    { label: 'Система: карта мира / островная фактура', appliesTo: /штукатур/i, requiresSelected: /карта мира|остров/i, visualStyle: 'radial-gradient(circle at 24% 34%, #d6d3d1 0 12%, transparent 13%), radial-gradient(circle at 70% 62%, #a8a29e 0 10%, transparent 11%), #f5f5f4' },
                    { label: 'Система: Sabbia / песчаное мерцание', appliesTo: /штукатур/i, requiresSelected: /sabbia|песчан/i, visualStyle: 'radial-gradient(circle at 24% 28%, #fde68a 0 4%, transparent 5%), linear-gradient(135deg, #e7c781, #8a6a2f)' },
                    { label: 'Система: Metalline Bronzo / Argento', appliesTo: /штукатур/i, requiresSelected: /metalline|металлиз/i, visualStyle: 'linear-gradient(135deg, #3b2416, #b7793f 45%, #f4c27a 48%, #5a2e18)' },
                    { label: 'Система: флоковое декоративное покрытие', appliesTo: /штукатур/i, requiresSelected: /флок/i, visualStyle: 'radial-gradient(circle at 25% 30%, #92400e 0 6%, transparent 7%), radial-gradient(circle at 68% 35%, #334155 0 5%, transparent 6%), #f8fafc' },
                    { label: 'Система: трафарет / авторский рисунок', appliesTo: /штукатур/i, requiresSelected: /авторская|трафарет/i, visualStyle: 'repeating-linear-gradient(45deg, #f8fafc 0 8px, #d6d3d1 8px 10px, #ffffff 10px 18px)' }
                  ]
                },
                {
                  label: 'Форма покрытия',
                  choiceMode: 'single',
                  noAutoQuantity: true,
                  appliesTo: /плитк|керамогранит|панел|мягк|бамбук|мрамор|камень|шпон|стекл|зеркал|молдинг|профил/i,
                  options: [
                    { label: 'Форма: прямой профиль', appliesTo: /молдинг|профил/i, formatApplies: ['wall_molding', 'decor_profile', 'corner_profile'] },
                    { label: 'Форма: радиусный / гибкий профиль', appliesTo: /молдинг|профил/i, formatApplies: ['wall_molding', 'decor_profile'] },
                    { label: 'Форма: рамочная раскладка', appliesTo: /молдинг|профил/i, formatApplies: ['frame_molding'] },
                    { label: 'Форма: геометрический рисунок', appliesTo: /молдинг|профил/i, formatApplies: ['frame_molding', 'decor_profile'] },
                    { label: 'Форма: прямоугольная', formatApplies: ['tile_module', 'large_tile', 'slat', 'flex_stone_sheet', 'soft_plain', 'soft_insert'] },
                    { label: 'Форма: квадратная', formatApplies: ['tile_module', 'soft_plain', 'soft_carriage'] },
                    { label: 'Форма: фигурная', formatApplies: ['tile_module', 'soft_insert'] }
                  ]
                },
                {
                  label: 'Рисунок / раппорт',
                  choiceMode: 'single',
                  noAutoQuantity: true,
                  appliesTo: /обои|фотообои/i,
                  options: [
                    { label: 'Раппорт: без подгонки рисунка', wallpaperWaste: 1.05, workComplexity: 1 },
                    { label: 'Раппорт: свободная стыковка / мелкий рисунок', wallpaperWaste: 1.08, workComplexity: 1.08 },
                    { label: 'Раппорт: подгонка рисунка до 32 см', wallpaperWaste: 1.12, workComplexity: 1.15 },
                    { label: 'Раппорт: подгонка рисунка до 64 см', wallpaperWaste: 1.18, workComplexity: 1.25 },
                    { label: 'Раппорт: крупный рисунок / панно', wallpaperWaste: 1.25, workComplexity: 1.35 }
                  ]
                },
                {
                  label: 'Размер покрытия',
                  choiceMode: 'single',
                  appliesTo: /плитк|керамогранит|панел|мягк|бамбук|мрамор|камень|шпон|стекл|зеркал|обои|фотообои|молдинг|профил/i,
                  options: [
                    { label: 'Размер: узкий профиль', appliesTo: /молдинг|профил/i, formatApplies: ['wall_molding', 'decor_profile', 'frame_molding', 'corner_profile'], sizeKey: 'molding_small' },
                    { label: 'Размер: средний профиль', appliesTo: /молдинг|профил/i, formatApplies: ['wall_molding', 'decor_profile', 'frame_molding', 'corner_profile'], sizeKey: 'molding_medium' },
                    { label: 'Размер: широкий профиль', appliesTo: /молдинг|профил/i, formatApplies: ['wall_molding', 'decor_profile', 'frame_molding', 'corner_profile'], sizeKey: 'molding_wide' },
                    { label: 'Размер: высокий декоративный профиль', appliesTo: /молдинг|профил/i, formatApplies: ['wall_molding', 'decor_profile', 'frame_molding', 'corner_profile'], sizeKey: 'molding_tall' },
                    { label: 'Размер: стандартный рулон 0.53 x 10.05 м', appliesTo: /обои|фотообои/i, formatApplies: ['roll', 'wallpaper_paint'], sizeKey: 'wallpaper_053_1005', dimensions: true, dimensionUnit: 'm', fixedDimensions: true, lengthM: 10.05, widthM: 0.53 },
                    { label: 'Размер: широкий рулон 1.06 x 10.05 м', appliesTo: /обои|фотообои/i, formatApplies: ['roll', 'wallpaper_paint'], sizeKey: 'wallpaper_106_1005', dimensions: true, dimensionUnit: 'm', fixedDimensions: true, lengthM: 10.05, widthM: 1.06 },
                    { label: 'Размер: виниловый рулон 0.53 x 15 м', appliesTo: /обои|фотообои/i, formatApplies: ['roll', 'wallpaper_paint'], sizeKey: 'wallpaper_053_1500', dimensions: true, dimensionUnit: 'm', fixedDimensions: true, lengthM: 15, widthM: 0.53 },
                    { label: 'Размер: длинный флизелиновый рулон 1.06 x 25 м', appliesTo: /обои|фотообои/i, formatApplies: ['roll', 'wallpaper_paint'], sizeKey: 'wallpaper_106_2500', dimensions: true, dimensionUnit: 'm', fixedDimensions: true, lengthM: 25, widthM: 1.06 },
                    { label: 'Размер: профессиональные обои 1.43 x 10.05 м', appliesTo: /обои|фотообои/i, formatApplies: ['roll', 'wallpaper_paint'], sizeKey: 'wallpaper_143_1005', dimensions: true, dimensionUnit: 'm', fixedDimensions: true, lengthM: 10.05, widthM: 1.43 },
                    { label: 'Размер: художественный рулон 2.00 x 30 м', appliesTo: /обои|фотообои/i, formatApplies: ['roll', 'wallpaper_paint'], sizeKey: 'wallpaper_200_3000', dimensions: true, dimensionUnit: 'm', fixedDimensions: true, lengthM: 30, widthM: 2 },
                    { label: 'Размер: свой размер обоев', appliesTo: /обои|фотообои/i, formatApplies: ['roll', 'wallpaper_paint'], sizeKey: 'wallpaper_custom', dimensions: true, dimensionUnit: 'm', customDimensions: true },
                    { label: 'Размер: стандартный формат', formatApplies: ['tile_module', 'flex_stone_sheet', 'soft_plain', 'soft_carriage', 'soft_insert'], sizeKey: 'standard', dimensions: true },
                    { label: 'Размер: крупный формат', formatApplies: ['large_tile', 'tile_module', 'soft_plain', 'soft_insert'], sizeKey: 'large', dimensions: true },
                    { label: 'Размер: узкая рейка / ламель', formatApplies: ['slat'], sizeKey: 'small', dimensions: true },
                    { label: 'Размер: свой размер элемента', appliesTo: /плитк|керамогранит|панел|мягк|бамбук|мрамор|камень|шпон|стекл|зеркал/i, formatApplies: ['tile_module', 'large_tile', 'slat', 'flex_stone_sheet', 'soft_plain', 'soft_carriage', 'soft_insert'], sizeKey: 'custom', dimensions: true },
                    { label: 'Размер: толщина мягкой панели 30 мм', appliesTo: /мягк/i, formatApplies: ['soft_plain', 'soft_carriage', 'soft_insert'] },
                    { label: 'Размер: толщина мягкой панели 50 мм', appliesTo: /мягк/i, formatApplies: ['soft_plain', 'soft_carriage', 'soft_insert'] }
                  ]
                },
                {
                  label: 'Цветовая гамма',
                  choiceMode: 'single',
                  noAutoQuantity: true,
                  appliesTo: /покраск|окраск|краск|обои|фотообои|штукатур|микроцемент|плитк|керамогранит|панел|мягк|бамбук|мрамор|камень|шпон|стекл|зеркал|молдинг|профил/i,
                  options: getRoomRepairWallColorOptions()
                },
                {
                  label: 'Фактура',
                  choiceMode: 'single',
                  noAutoQuantity: true,
                  appliesTo: /покраск|окраск|краск|обои|фотообои|штукатур|микроцемент|плитк|керамогранит|панел|мягк|бамбук|мрамор|камень|шпон|молдинг|профил/i,
                  options: [
                    { label: 'Фактура: гладкая', appliesTo: /покраск|окраск|краск|обои|фотообои|микроцемент|плитк|керамогранит|стекл|зеркал/i },
                    { label: 'Фактура: матовая', appliesTo: /покраск|окраск|краск|обои|фотообои|плитк|керамогранит/i },
                    { label: 'Фактура: шелковистая', appliesTo: /покраск|окраск|краск|обои/i },
                    { label: 'Фактура: рельефная', appliesTo: /обои|фотообои|гипсов|3d|мягк/i },
                    { label: 'Фактура: гладкий мраморный глянец', appliesTo: /штукатур/i, requiresSelected: /marmorino carrara|венецианская.*мрамор/i, visualStyle: 'linear-gradient(135deg, #f8fafc, #e5e7eb 42%, #94a3b8 44%, #ffffff 70%, #cbd5e1)' },
                    { label: 'Фактура: сатиновая минеральная', appliesTo: /штукатур/i, requiresSelected: /marmorino carrara|венецианская.*мрамор/i, visualStyle: 'linear-gradient(135deg, #fffef7, #f1efe3 46%, #ffffff 48%, #dedbd0)' },
                    { label: 'Фактура: гранитная глубина', appliesTo: /штукатур/i, requiresSelected: /encausto|гранит/i, visualStyle: 'radial-gradient(circle at 28% 22%, #94a3b8 0 3%, transparent 4%), linear-gradient(135deg, #111827, #374151)' },
                    { label: 'Фактура: травертин с горизонтальными прожилками', appliesTo: /штукатур/i, requiresSelected: /travertino|травертин/i, visualStyle: 'repeating-linear-gradient(0deg, #ead7b5 0 8px, #c8aa78 8px 11px, #fff3d8 11px 20px)' },
                    { label: 'Фактура: травертин с вертикальными прожилками', appliesTo: /штукатур/i, requiresSelected: /travertino|травертин/i, visualStyle: 'repeating-linear-gradient(90deg, #ead7b5 0 8px, #c8aa78 8px 11px, #fff3d8 11px 20px)' },
                    { label: 'Фактура: мелкозернистый бетон', appliesTo: /штукатур|микроцемент/i, requiresSelected: /бетон|loft|микроцемент/i, visualStyle: 'linear-gradient(135deg, #e5e7eb, #9ca3af 48%, #6b7280)' },
                    { label: 'Фактура: опалубочный бетон', appliesTo: /штукатур|микроцемент/i, requiresSelected: /бетон|loft|микроцемент/i, visualStyle: 'repeating-linear-gradient(0deg, #cbd5e1 0 14px, #94a3b8 14px 16px, #e5e7eb 16px 30px)' },
                    { label: 'Фактура: мягкий шелковый перелив', appliesTo: /штукатур/i, requiresSelected: /шелк|damasco/i, visualStyle: 'linear-gradient(135deg, #fff7ed, #f9d9a7 35%, #ffffff 52%, #dbeafe 78%)' },
                    { label: 'Фактура: перламутровый шелк', appliesTo: /штукатур/i, requiresSelected: /шелк|damasco/i, visualStyle: 'linear-gradient(135deg, #f8fafc, #f5d0fe 32%, #dbeafe 64%, #ffffff)' },
                    { label: 'Фактура: карта мира мелкая', appliesTo: /штукатур/i, requiresSelected: /карта мира|остров/i, visualStyle: 'radial-gradient(circle at 24% 34%, #d6d3d1 0 8%, transparent 9%), radial-gradient(circle at 70% 62%, #a8a29e 0 7%, transparent 8%), #f5f5f4' },
                    { label: 'Фактура: карта мира крупная', appliesTo: /штукатур/i, requiresSelected: /карта мира|остров/i, visualStyle: 'radial-gradient(circle at 24% 34%, #d6d3d1 0 16%, transparent 17%), radial-gradient(circle at 70% 62%, #a8a29e 0 13%, transparent 14%), #f5f5f4' },
                    { label: 'Фактура: песчаная с мерцанием', appliesTo: /штукатур/i, requiresSelected: /sabbia|песчан/i, visualStyle: 'radial-gradient(circle at 24% 28%, #fde68a 0 4%, transparent 5%), radial-gradient(circle at 70% 66%, #f59e0b 0 3%, transparent 4%), linear-gradient(135deg, #e7c781, #8a6a2f)' },
                    { label: 'Фактура: металлизированная гладкая', appliesTo: /штукатур/i, requiresSelected: /metalline|металлиз/i, visualStyle: 'linear-gradient(135deg, #3b2416, #b7793f 45%, #f4c27a 48%, #5a2e18)' },
                    { label: 'Фактура: металлизированная брашированная', appliesTo: /штукатур/i, requiresSelected: /metalline|металлиз/i, visualStyle: 'repeating-linear-gradient(100deg, #3b2416 0 5px, #b7793f 5px 8px, #f4c27a 8px 11px)' },
                    { label: 'Фактура: флоковая декоративная', appliesTo: /штукатур/i, requiresSelected: /флок/i, visualStyle: 'radial-gradient(circle at 25% 30%, #92400e 0 6%, transparent 7%), radial-gradient(circle at 68% 35%, #334155 0 5%, transparent 6%), #f8fafc' },
                    { label: 'Фактура: трафаретная рельефная', appliesTo: /штукатур/i, requiresSelected: /авторская|трафарет/i, visualStyle: 'repeating-linear-gradient(45deg, #f8fafc 0 8px, #d6d3d1 8px 10px, #ffffff 10px 18px)' },
                    { label: 'Фактура: под камень', appliesTo: /плитк|керамогранит|камень|шпон|мрамор|гибк/i },
                    { label: 'Фактура: под дерево', appliesTo: /мдф|рееч|бамбук/i },
                    { label: 'Фактура: под бетон', appliesTo: /микроцемент|плитк|керамогранит/i },
                    { label: 'Фактура: натуральные прожилки камня', appliesTo: /гибк|мрамор/i },
                    { label: 'Фактура: мягкая тканевая', appliesTo: /мягк/i },
                    { label: 'Фактура: мягкая кожаная', appliesTo: /мягк/i },
                    { label: 'Фактура: бамбук натуральный', appliesTo: /бамбук/i },
                    { label: 'Фактура: гладкий профиль', appliesTo: /молдинг|профил/i },
                    { label: 'Фактура: рельефный профиль', appliesTo: /молдинг|профил/i },
                    { label: 'Фактура: классический орнамент', appliesTo: /молдинг|профил/i },
                    { label: 'Фактура: под окраску', appliesTo: /молдинг|профил/i },
                    { label: 'Фактура: металлизированная', appliesTo: /молдинг|профил/i }
                  ]
                },
                {
                  label: 'Защитный финиш',
                  choiceMode: 'single',
                  noAutoQuantity: true,
                  appliesTo: /штукатур|венециан|микроцемент/i,
                  options: [
                    { label: 'Финиш: без дополнительной защиты', appliesTo: /штукатур|венециан|микроцемент/i },
                    { label: 'Финиш: воск SPECCHIO CERA / глянцевая защита', appliesTo: /штукатур/i, requiresSelected: /marmorino carrara|венецианская.*мрамор|encausto|гранит/i },
                    { label: 'Финиш: матовая лессировка VELATURA', appliesTo: /штукатур/i, requiresSelected: /travertino|травертин|карта мира|остров|sabbia|песчан|авторская|трафарет/i },
                    { label: 'Финиш: водоотталкивающая защита UMBRELLA', appliesTo: /штукатур|микроцемент/i, requiresSelected: /бетон|loft|микроцемент|travertino|травертин/i },
                    { label: 'Финиш: металлизированное покрытие METALLINE', appliesTo: /штукатур/i, requiresSelected: /metalline|металлиз/i },
                    { label: 'Финиш: защитный лак для влажной зоны', appliesTo: /микроцемент/i }
                  ]
                },
                {
                  label: 'Финиш профиля',
                  choiceMode: 'single',
                  noAutoQuantity: true,
                  appliesTo: /молдинг|профил/i,
                  options: [
                    { label: 'Финиш: готовый белый профиль', appliesTo: /молдинг|профил/i },
                    { label: 'Финиш: под покраску', appliesTo: /молдинг|профил/i },
                    { label: 'Финиш: окрашенный в цвет стены', appliesTo: /молдинг|профил/i },
                    { label: 'Финиш: контрастный цвет', appliesTo: /молдинг|профил/i },
                    { label: 'Финиш: металлический', appliesTo: /молдинг|профил/i },
                    { label: 'Финиш: натуральное дерево', appliesTo: /молдинг|профил/i }
                  ]
                },
                {
                  label: 'Способ монтажа / нанесения',
                  choiceMode: 'single',
                  options: [
                    { label: 'Нанесение валиком', appliesTo: /покраск|окраск|краск/i },
                    { label: 'Нанесение краскопультом', appliesTo: /покраск|окраск|краск/i },
                    { label: 'Поклейка обоев', appliesTo: /обои|фотообои/i },
                    { label: 'Нанесение декоративной техники', appliesTo: /штукатур|микроцемент/i },
                    { label: 'Клеевой монтаж на стену', appliesTo: /плитк|керамогранит|камень|шпон|мрамор|гибк/i },
                    { label: 'Клеевой монтаж молдингов', appliesTo: /молдинг|профил/i },
                    { label: 'Монтаж молдингов с запилом 45 градусов', appliesTo: /молдинг|профил/i },
                    { label: 'Монтаж молдингов с заполнением стыков', appliesTo: /молдинг|профил/i },
                    { label: 'Скрытый крепеж профиля', appliesTo: /молдинг|профил/i },
                    { label: 'Монтаж панелей на подсистему', appliesTo: /мдф|гипсов|3d|рееч|стекл|зеркал|бамбук/i },
                    { label: 'Скрытый крепеж панелей', appliesTo: /мдф|гипсов|3d|рееч|стекл|зеркал|бамбук/i },
                    { label: 'Монтаж мягких панелей на клей', appliesTo: /мягк/i },
                    { label: 'Монтаж мягких панелей на скрытый крепеж', appliesTo: /мягк/i }
                  ]
                },
                {
                  label: 'Дополнительные опции',
                  options: [
                    { label: 'Запил плитки 45 градусов на внешних углах', appliesTo: /плитк|керамогранит/i, quantity: { label: 'м.п.', suffix: 'м.п. запила 45 градусов', defaultValue: 2, min: 0.1, max: 200, step: 0.1, mode: 'perimeter' } },
                    { label: 'Акцентная зона из крупноформатного керамогранита', appliesTo: /керамогранит/i, quantity: { label: 'м²', suffix: 'м² акцентной зоны из крупноформатного керамогранита', mode: 'wallsArea', min: 0.1, max: 2000, step: 0.1 } },
                    { label: 'Герметизация примыканий во влажной зоне', appliesTo: /плитк|керамогранит|микроцемент|стекл/i, quantity: { label: 'м.п.', suffix: 'м.п. герметизации примыканий', defaultValue: 4, min: 0.1, max: 300, step: 0.1, mode: 'perimeter' } },
                    { label: 'Покраска молдингов', appliesTo: /молдинг|профил/i, quantity: { label: 'м.п.', suffix: 'м.п. покраски молдингов', defaultValue: 8, min: 0.1, max: 300, step: 0.1, mode: 'perimeter' } },
                    { label: 'Сложная раскладка по эскизу', appliesTo: /молдинг|профил/i, quantity: { label: 'м.п.', suffix: 'м.п. сложной раскладки', defaultValue: 8, min: 0.1, max: 300, step: 0.1, mode: 'perimeter' } },
                    { label: 'Нанесение защитного воска', appliesTo: /керамическ.*плитк|плитк/i, quantity: { label: 'м²', suffix: 'м² защитного воска', mode: 'wallsArea', min: 0.1, max: 2000, step: 0.1 } },
                    { label: 'Латунные / декоративные вставки между мягкими панелями', appliesTo: /мягк/i, quantity: { label: 'м.п.', suffix: 'м.п. декоративных вставок', defaultValue: 6, min: 0.1, max: 300, step: 0.1, mode: 'perimeter' } },
                    { label: 'Дополнительная шумоизоляционная подложка под мягкие панели', appliesTo: /мягк/i, quantity: { label: 'м²', suffix: 'м² шумоизоляционной подложки', mode: 'wallsArea', min: 0.1, max: 2000, step: 0.1 } }
                  ]
                }
              ]
            },
            {
              key: 'finishCeiling',
              label: 'Потолок',
              section: 'ceiling',
              icon: 'fa-grip-lines',
              hint: 'Выберите тип потолка и дополнительные узлы: карниз, люк, световые линии.',
              options: [
                'Базовая подготовка потолка',
                'Стеклохолст на потолок под покраску',
                'Покраска потолка',
                'Натяжной потолок с аккуратным примыканием',
                'Тканевый натяжной потолок',
                'Натяжной потолок теневой / парящий',
                'Натяжной потолок многоуровневый',
                'ГКЛ-потолок с теневым профилем',
                'Световые линии / LED-профиль',
                'Трековая система в потолке',
                'Скрытый карниз / теневой профиль по периметру',
                'Скрытый карниз / ниша под шторы',
                'Скрытый ревизионный люк'
              ],
              detailGroups: [
                {
                  label: 'Тип потолка',
                  choiceMode: 'single',
                  options: [
                    'Натяжной потолок с аккуратным примыканием',
                    'Тканевый натяжной потолок',
                    'Натяжной потолок теневой / парящий',
                    'Натяжной потолок многоуровневый',
                    'ГКЛ-потолок с теневым профилем',
                    'Покраска потолка',
                    'Подвесная потолочная система',
                    'Световые линии / LED-профиль',
                    'Трековая система в потолке',
                    'Скрытый карниз / ниша под шторы',
                    'Скрытый ревизионный люк',
                    'Усиление / закладная под люстру'
                  ]
                },
                {
                  label: 'Материал / система',
                  choiceMode: 'single',
                  options: [
                    'Система: ПВХ-полотно матовое',
                    'Система: тканевое бесшовное полотно',
                    'Система: теневой профиль с демпферным примыканием',
                    'Система: двухуровневый каркас с натяжным полотном',
                    'Система: ГКЛ влагостойкий на металлическом каркасе',
                    'Система: стеклохолст + финишная краска',
                    'Система: кассетная / реечная подвесная система',
                    'Система: встраиваемый алюминиевый LED-профиль с рассеивателем',
                    'Система: магнитный трек / шинопровод в потолочной плоскости',
                    'Система: скрытая ниша под шторы с подготовкой под подсветку',
                    'Система: ревизионный люк скрытого монтажа под финиш потолка',
                    'Система: закладная платформа с усилением под люстру'
                  ]
                },
                {
                  label: 'Фактура / поверхность',
                  choiceMode: 'single',
                  options: [
                    'Фактура: глубокоматовая',
                    'Фактура: сатиновая',
                    'Фактура: гладкая под покраску',
                    'Фактура: акустическая перфорация',
                    'Фактура: анодированный матовый профиль',
                    'Фактура: скрытый окрашиваемый узел',
                    'Фактура: черный архитектурный профиль'
                  ]
                },
                {
                  label: 'Цветовая гамма',
                  choiceMode: 'single',
                  options: [
                    'Цвет: белый теплый · RAL 9010',
                    'Цвет: белый холодный · RAL 9003',
                    'Цвет: светлый графит · RAL 7044',
                    'Цвет: индивидуальный оттенок · NCS / RAL на выбор',
                    'Цвет: графитовый профиль · RAL 7021',
                    'Цвет: черный матовый · RAL 9005',
                    'Цвет: алюминий матовый · RAL 9006'
                  ]
                },
                {
                  label: 'Способ монтажа',
                  choiceMode: 'single',
                  options: [
                    'Монтаж натяжного потолка по периметру',
                    'Монтаж натяжного потолка с теневым профилем',
                    'Монтаж многоуровневой потолочной системы',
                    'Подготовка и окраска потолка',
                    'Монтаж подвесной потолочной системы',
                    'Монтаж LED-профиля с подготовкой под ленту',
                    'Монтаж трековой системы с закладной и выводом питания',
                    'Монтаж скрытого карниза / ниши под шторы',
                    'Монтаж скрытого ревизионного люка в потолке',
                    'Монтаж закладной платформы под люстру'
                  ]
                },
                {
                  label: 'Дополнительные узлы',
                  options: [
                    'Световые линии / LED-профиль',
                    'Трековая система в потолке',
                    'Скрытый карниз / теневой профиль по периметру',
                    'Скрытый ревизионный люк',
                    'Ниша под шторы',
                    'Усиление под люстру'
                  ]
                }
              ]
            },
            {
              key: 'finishOpenings',
              label: 'Проемы',
              section: 'openings',
              icon: 'fa-door-open',
              hint: 'Финишное оформление дверных, оконных и балконных проемов.',
              options: [
                'Оформление дверных откосов',
                'Оформление оконных откосов',
                'Монтаж межкомнатной двери с доборами и наличниками',
                'Скрытая дверь под покраску',
                'Раздвижная дверь'
              ]
            }
          ]
        },
        {
          key: 'junctions',
          label: 'Финишные примыкания',
          icon: 'fa-ruler-combined',
          hint: 'Теневые профили, карнизы, скрытые плинтусы и аккуратные узлы сопряжений.',
          children: [
            { key: 'junctionCeiling', label: 'Потолок и стены', section: 'ceiling', icon: 'fa-grip-lines', hint: 'Чистые линии примыкания и теневые решения.', options: ['Скрытый карниз / теневой профиль по периметру', 'Натяжной потолок теневой / парящий', 'Световые линии / LED-профиль'] },
            { key: 'junctionFloor', label: 'Пол и стены', section: 'floor', icon: 'fa-ruler-combined', hint: 'Плинтусы, пороги и переходы покрытий.', options: ['Скрытый плинтус по периметру', 'Порог / переход между покрытиями', 'Декоративный бордюр пола'] },
            { key: 'junctionFurniture', label: 'Встроенная мебель', section: 'walls', icon: 'fa-vector-square', hint: 'Подготовка аккуратных примыканий под встроенные решения.', options: ['Финишные примыкания под встроенную мебель', 'Ниши / декоративные зоны', 'МДФ панели'] }
          ]
        },
        {
          key: 'structures',
          label: 'Лестницы и проемы',
          icon: 'fa-door-open',
          hint: 'Двери, окна, балконные блоки, лестницы и ограждения.',
          children: [
            {
              key: 'doorOpenings',
              label: 'Двери',
              section: 'openings',
              icon: 'fa-door-open',
              hint: 'Количество можно менять, расчет идет по проемам',
              options: [
                { label: '1 распашная дверь', quantity: { label: 'дверей', suffix: 'распашных дверей', defaultValue: 1, min: 1, max: 10 } },
                { label: '1 межкомнатная дверь с доборами и наличниками', quantity: { label: 'дверей', suffix: 'межкомнатных дверей с доборами и наличниками', defaultValue: 1, min: 1, max: 10 } },
                { label: '1 скрытая дверь', quantity: { label: 'дверей', suffix: 'скрытых дверей', defaultValue: 1, min: 1, max: 10 } },
                { label: '1 раздвижная дверь', quantity: { label: 'дверей', suffix: 'раздвижных дверей', defaultValue: 1, min: 1, max: 10 } },
                { label: '1 двупольная дверь', quantity: { label: 'дверей', suffix: 'двупольных дверей', defaultValue: 1, min: 1, max: 10 } }
              ]
            },
            {
              key: 'windowOpenings',
              label: 'Окна',
              section: 'openings',
              icon: 'fa-window-maximize',
              hint: 'Оконный блок, откосы, подоконник',
              options: [
                { label: '1 оконный блок с откосами', quantity: { label: 'окон', suffix: 'оконных блоков с откосами', defaultValue: 1, min: 1, max: 10 } },
                { label: '1 оконный блок с подоконником и отливом', quantity: { label: 'окон', suffix: 'оконных блоков с подоконником и отливом', defaultValue: 1, min: 1, max: 10 } },
                { label: '1 оформление оконных откосов', quantity: { label: 'окон', suffix: 'оформлений оконных откосов', defaultValue: 1, min: 1, max: 10 } }
              ]
            },
            {
              key: 'balconyOpenings',
              label: 'Балкон',
              section: 'openings',
              icon: 'fa-archway',
              hint: 'Балконный блок или дверь',
              options: [
                { label: '1 балконный блок', quantity: { label: 'блоков', suffix: 'балконных блоков', defaultValue: 1, min: 1, max: 5 } },
                { label: '1 балконный блок с откосами', quantity: { label: 'блоков', suffix: 'балконных блоков с откосами', defaultValue: 1, min: 1, max: 5 } },
                { label: '1 балконная дверь', quantity: { label: 'дверей', suffix: 'балконных дверей', defaultValue: 1, min: 1, max: 5 } }
              ]
            },
            {
              key: 'stairsMount',
              label: 'Лестницы',
              section: 'stairs',
              icon: 'fa-stairs',
              hint: 'Лестницы, ступени, поручни',
              options: [
                'Монтаж деревянной лестницы прямой марш',
                'Монтаж металлического каркаса лестницы',
                '12 ступеней: облицовка деревом',
                '12 ступеней: облицовка керамогранитом',
                'Поручень / перила по стене',
                'Стеклянное ограждение лестницы'
              ]
            }
          ]
        },
        {
          key: 'equipment',
          label: 'Оснащение помещения',
          icon: 'fa-kitchen-set',
          hint: 'Приборы, влажные зоны, мебельные и бытовые подключения.',
          children: [
            { key: 'equipmentCommon', label: 'Базовое оснащение', section: 'electrical', icon: 'fa-sliders', hint: 'Точки питания и подключения для оборудования.', options: ['Отдельные линии для техники', 'Рабочее место: питание, интернет и резерв под технику', 'Кассовая зона: питание, интернет и резерв под POS', 'Слаботочная точка для кассы / эквайринга', 'Отдельная линия для вывески / витрины', 'Интернет / ТВ точка'] },
            { key: 'equipmentBathroom', label: 'Санузел / душевая', section: 'plumbing', icon: 'fa-shower', hint: 'Душевые решения, инсталляции и скрытая сантехника.', options: ['Инсталляция для подвесного унитаза', 'Душевой лоток / трап', 'Готовый душевой поддон', 'Поддон из плитки / керамогранита вровень с полом', 'Поддон с бортиком', 'Матовая противоскользящая плитка в душевой зоне', 'Мозаика в душевом поддоне', 'Скрытый смеситель душа', 'Скрытый смеситель ванны', 'Скрытый смеситель раковины', 'Скрытая сантехника / скрытый смеситель', 'Штробление под скрытую сантехнику', 'Усиленная гидроизоляция душевой зоны'] },
            { key: 'equipmentKitchen', label: 'Кухонная зона', section: 'plumbing', icon: 'fa-utensils', hint: 'Мойка, техника и выводы для кухонной зоны.', options: ['Подключение мойки и кухонной техники', 'Разводка водоснабжения и канализации', 'Подключение смесителя', 'Ревизионный доступ к сантехническим узлам'] },
            { key: 'equipmentStorage', label: 'Хранение и мебель', section: 'walls', icon: 'fa-box-open', hint: 'Подготовка под встроенные шкафы и мебельные примыкания.', options: ['Финишные примыкания под встроенную мебель', 'Ниши / декоративные зоны', 'МДФ панели'] }
          ]
        },
        {
          key: 'warmFloor',
          label: 'Теплый пол',
          icon: 'fa-temperature-half',
          hint: 'Подготовка и зоны теплого пола с учетом покрытия.',
          children: [
            { key: 'warmFloorPrep', label: 'Подготовка', section: 'floor', icon: 'fa-temperature-half', hint: 'Основание и гидроизоляция под теплый пол.', options: ['Подготовка основания под теплый пол', 'Гидроизоляция пола', 'Наливной финишный слой под чистовое покрытие'] },
            { key: 'warmFloorZones', label: 'Зоны', section: 'floor', icon: 'fa-border-top-left', hint: 'Можно добавить отдельные зоны теплого пола.', options: [{ label: '3 м² теплого пола', quantity: { label: 'м²', suffix: 'м² теплого пола', defaultValue: 3, min: 1, max: 80 } }, { label: '5 м² теплого пола', quantity: { label: 'м²', suffix: 'м² теплого пола', defaultValue: 5, min: 1, max: 80 } }, { label: '8 м² теплого пола', quantity: { label: 'м²', suffix: 'м² теплого пола', defaultValue: 8, min: 1, max: 80 } }] }
          ]
        },
        {
          key: 'engineering',
          label: 'Электрика',
          icon: 'fa-bolt',
          hint: 'Точки, линии, слаботочка и влияние на щит.',
          children: [
            { key: 'sockets', label: 'Розетки', section: 'electrical', icon: 'fa-plug', hint: 'Количество можно указать вручную', quantity: { label: 'розеток', suffix: 'розеточных точек с группировкой по зонам', defaultValue: 8, min: 1, max: 40 }, options: ['4 розеточных точки с группировкой по зонам', '6 розеточных точек с группировкой по зонам', '8 розеточных точек с группировкой по зонам', '10 розеточных точек с группировкой по зонам', '12 розеточных точек с группировкой по зонам', '16 розеточных точек с группировкой по зонам'] },
            { key: 'switches', label: 'Выключатели', section: 'electrical', icon: 'fa-toggle-on', hint: 'Классика, сценарии, проходные зоны', quantity: { label: 'выключателей', suffix: 'выключателей у входа и у сценарных зон', defaultValue: 3, min: 1, max: 30 }, options: ['2 выключателя у входа и у ключевых сценарных зон', '3 выключателя у входа и у сценарных зон', { label: 'Проходной выключатель для удобного управления светом', quantity: { label: 'выключателей', suffix: 'проходных выключателей для удобного управления светом', defaultValue: 1, min: 1, max: 10 } }] },
            { key: 'electricalLines', label: 'Линии и кабель', section: 'electrical', icon: 'fa-route', hint: 'Отдельные группы, трассы и слаботочка', options: ['Отдельные линии для техники', 'Штробление под скрытую проводку', 'Прокладка кабеля в гофре', 'Установка подрозетников', 'Рабочее место: питание, интернет и резерв под технику', 'Кассовая зона: питание, интернет и резерв под POS', 'Слаботочная точка для кассы / эквайринга', 'Отдельная линия для вывески / витрины', 'Интернет / ТВ точка', 'Влагозащищенные точки и отдельная защитная группа'] }
          ]
        },
        {
          key: 'lighting',
          label: 'Организация света',
          icon: 'fa-lightbulb',
          hint: 'Основной, сценарный и декоративный свет.',
          children: [
            { key: 'lightGroups', label: 'Группы света', section: 'lighting', icon: 'fa-lightbulb', hint: 'Количество групп можно указать', quantity: { label: 'групп света', suffix: 'группы света по зонам', defaultValue: 3, min: 1, max: 20 }, options: ['1 группа основного света', '2 группы света: основной и сценарный', '3 группы света по зонам'] },
            {
              key: 'lightFixtures',
              label: 'Светильники',
              section: 'lighting',
              icon: 'fa-circle-dot',
              hint: 'Количество можно менять',
              options: [
                { label: '4 точечных светильника', quantity: { label: 'светильников', suffix: 'точечных светильников', defaultValue: 4, min: 1, max: 40 } },
                { label: '6 точечных светильников', quantity: { label: 'светильников', suffix: 'точечных светильников', defaultValue: 6, min: 1, max: 40 } },
                { label: '1 люстра / центральный светильник', quantity: { label: 'люстр', suffix: 'люстра / центральный светильник', defaultValue: 1, min: 1, max: 10 } },
                { label: '1 трековая система', quantity: { label: 'треков', suffix: 'трековая система', defaultValue: 1, min: 1, max: 10 } },
                { label: '2 трековые системы для торгового зала', quantity: { label: 'треков', suffix: 'трековые системы для торгового зала', defaultValue: 2, min: 1, max: 20 } },
                { label: '2 настенных бра', quantity: { label: 'бра', suffix: 'настенных бра', defaultValue: 2, min: 1, max: 20 } }
              ]
            },
            { key: 'lightScenarios', label: 'Сценарии', section: 'lighting', icon: 'fa-wand-magic-sparkles', hint: 'Комфортные сценарии комнаты', options: ['Основной свет с равномерной засветкой', 'Сценарная подсветка и декоративные линии света', 'LED-лента в нише / профиле', 'Витринная подсветка', 'Акцентный свет на товарные зоны', 'Прикроватные сценарии света с двух сторон', 'Рабочий свет для учебной зоны', 'Датчик движения для проходного света'] }
          ]
        },
        {
          key: 'smart',
          label: 'Умный дом',
          icon: 'fa-microchip',
          hint: 'Сценарии, датчики и влияние на SMART-щит.',
          children: [
            { key: 'smartHome', label: 'Сценарии', section: 'smartHome', icon: 'fa-wand-magic-sparkles', hint: 'Свет, климат, шторы и комплексные сценарии.', options: [{ label: '2 smart-сценария света', quantity: { label: 'smart-сценариев', suffix: 'smart-сценария света', defaultValue: 2, min: 1, max: 20 } }, 'Сценарии света через умный выключатель', 'Датчик движения / присутствия для сценариев', 'Датчик климата / температуры', 'Подготовка под управление шторами / карнизом', 'Настройка smart-сценариев комнаты'] },
            { key: 'smartSafety', label: 'Датчики и безопасность', section: 'smartHome', icon: 'fa-shield-halved', hint: 'Датчики, которые попадают в SMART-щит и паспорта.', options: ['Датчик протечки с выводом в SMART-щит', 'Датчик движения / присутствия для сценариев', 'Датчик климата / температуры', 'Защита от протечки воды'] }
          ]
        },
        {
          key: 'panels',
          label: 'Щиты',
          icon: 'fa-table-columns',
          hint: 'Распределительный щит и щит умного дома: группы, резерв, маркировка и паспорта.',
          children: [
            {
              key: 'electricalPanel',
              label: 'Распределительный щит',
              section: 'electrical',
              icon: 'fa-bolt',
              hint: 'Группы электрощита формируются по выбранным линиям и точкам.',
              options: ['Группы электрощита по выбранным линиям', 'Резерв модулей электрощита', 'Маркировка линий и паспорт электрощита']
            },
            {
              key: 'smartPanel',
              label: 'Щит для умного дома',
              section: 'smartHome',
              icon: 'fa-microchip',
              hint: 'SMART-щит собирается по сценариям, датчикам и управляющим линиям.',
              options: ['Группы SMART-щита по сценариям', 'Резерв DIN-модулей SMART-щита', 'Маркировка сценариев и паспорт SMART-щита']
            }
          ]
        },
        {
          key: 'climateSystems',
          label: 'Климат',
          icon: 'fa-wind',
          hint: 'Кондиционирование, вентиляция, трассы и питание климатического оборудования.',
          children: [
            { key: 'climateAc', label: 'Кондиционирование', section: 'climate', icon: 'fa-wind', hint: 'По умолчанию 1 шт.', options: [{ label: '1 кондиционер / split-система', quantity: { label: 'кондиционер / split-систем', suffix: 'кондиционер / split-система', defaultValue: 1, min: 1, max: getRoomClimateUnitLimit() } }, 'Подготовка трассы кондиционера', 'Закладка дренажа и питания для внутреннего блока', 'Монтаж наружного блока кондиционера', 'Кронштейн наружного блока кондиционера', 'Тихий режим климатического оборудования'] },
            { key: 'ventilation', label: 'Вентиляция', section: 'climate', icon: 'fa-fan', hint: 'Свежий воздух и вытяжка', options: ['Приточно-вытяжная вентиляция / вытяжной канал', 'Вентиляционная решетка', 'Диффузор вентиляции', 'Приточный клапан', 'Воздуховод / вентиляционный канал'] }
          ]
        },
        {
          key: 'waterSystems',
          label: 'Вода и канализация',
          icon: 'fa-faucet',
          hint: 'Водоснабжение, канализация, скрытая сантехника и мокрые зоны.',
          children: [
            { key: 'plumbingWater', label: 'Водоснабжение', section: 'plumbing', icon: 'fa-faucet', hint: 'Вода, коллекторы, смесители и скрытые узлы.', options: ['Разводка водоснабжения и канализации', 'Подключение смесителя', 'Скрытая сантехника / скрытый смеситель', 'Штробление под скрытую сантехнику', 'Ревизионный доступ к сантехническим узлам'] },
            { key: 'plumbingDrainage', label: 'Канализация', section: 'plumbing', icon: 'fa-water', hint: 'Сливы, трапы, поддоны и мокрые зоны.', options: ['Душевой лоток / трап', 'Готовый душевой поддон', 'Поддон из плитки / керамогранита вровень с полом', 'Поддон с бортиком', 'Усиленная гидроизоляция душевой зоны'] }
          ]
        },
        {
          key: 'extras',
          label: 'Дополнительные решения',
          icon: 'fa-shield-halved',
          hint: 'Опции, которые повышают комфорт, надежность и премиальность ремонта.',
          children: [
            { key: 'extraProtection', label: 'Защита', section: 'plumbing', icon: 'fa-shield-halved', hint: 'Безопасность влажных зон и инженерии.', options: ['Защита от протечки воды', 'Усиленная гидроизоляция душевой зоны', 'Ревизионный доступ к сантехническим узлам'] },
            { key: 'extraComfort', label: 'Комфорт', section: 'climate', icon: 'fa-wind', hint: 'Тишина, климат и удобство эксплуатации.', options: ['Тихий режим климатического оборудования', 'Приточный клапан', 'Вентиляционная решетка'] },
            { key: 'extraPremium', label: 'Премиальные узлы', section: 'ceiling', icon: 'fa-gem', hint: 'Визуально чистые финишные решения.', options: ['Скрытый карниз / теневой профиль по периметру', 'Натяжной потолок теневой / парящий', 'Световые линии / LED-профиль'] }
          ]
        }
      ];
    }

    function flattenRoomRepairBuilderNodes() {
      return getRoomRepairBuilderCatalog().flatMap(group => (group.children || []).map(child => ({ ...child, groupKey: group.key, groupLabel: group.label })));
    }

    function getRoomRepairBuilderGroupKeyForNode(nodeKey) {
      const node = flattenRoomRepairBuilderNodes().find(item => item.key === nodeKey);
      return node?.groupKey || getRoomRepairBuilderCatalog()[0]?.key || '';
    }

    function parseRoomRepairBuilderOpenGroups(value) {
      if (Array.isArray(value)) return new Set(value.filter(Boolean));
      return new Set(String(value || '').split(',').map(item => item.trim()).filter(Boolean));
    }

    function getRoomRepairBuilderOpenGroups(calc, activeNodeKey) {
      const openGroups = parseRoomRepairBuilderOpenGroups(calc?.openBuilderGroups || '');
      const activeGroupKey = getRoomRepairBuilderGroupKeyForNode(activeNodeKey || getRoomRepairBuilderActiveNodeKey(calc));
      if (activeGroupKey && !openGroups.size) openGroups.add(activeGroupKey);
      return openGroups;
    }

    function getRoomRepairBuilderNode(nodeKey) {
      return flattenRoomRepairBuilderNodes().find(node => node.key === nodeKey) || flattenRoomRepairBuilderNodes()[0];
    }

    function getRoomRepairBuilderActiveNodeKey(calc) {
      return calc?.activeBuilderNode || 'demoFinish';
    }

    function getRoomRepairBuilderSectionCounts(calc) {
      const counts = {};
      getRoomRepairSectionConfig().forEach(config => {
        counts[config.key] = splitRoomRepairSectionTextarea(getRoomRepairModalSectionValue(calc, config.key)).length;
      });
      return counts;
    }

    function renderRoomRepairBuilderHiddenSections(calc) {
      const structured = escapeRoomRepairHtml(JSON.stringify(getRoomRepairStructuredSelections(calc)));
      return `
        <textarea class="room-repair-builder-hidden" data-repair-structured rows="1" aria-hidden="true" tabindex="-1">${structured}</textarea>
        <textarea class="room-repair-builder-hidden" data-repair-history rows="1" aria-hidden="true" tabindex="-1">[]</textarea>
        ${getRoomRepairSectionConfig().map(config => `
        <textarea class="room-repair-builder-hidden" data-repair-section="${config.key}" rows="1" aria-hidden="true" tabindex="-1">${escapeRoomRepairHtml(getRoomRepairModalSectionValue(calc, config.key))}</textarea>
        `).join('')}
      `;
    }

    function renderRoomRepairBuilderNav(calc) {
      const counts = getRoomRepairBuilderSectionCounts(calc);
      const activeNode = getRoomRepairBuilderActiveNodeKey(calc);
      const openGroups = getRoomRepairBuilderOpenGroups(calc, activeNode);
      return getRoomRepairBuilderCatalog().map(group => {
        const groupSections = [...new Set((group.children || []).map(child => child.section).filter(Boolean))];
        const groupCount = groupSections.reduce((sum, sectionKey) => sum + Number(counts[sectionKey] || 0), 0);
        const isOpen = openGroups.has(group.key);
        return `
          <div class="room-repair-builder-group ${isOpen ? 'is-open' : ''}" data-builder-group="${group.key}">
            <button type="button" class="room-repair-builder-group-head" onclick="toggleRoomRepairBuilderGroup('${group.key}')">
              <span><i class="fas ${group.icon}"></i>${escapeRoomRepairHtml(group.label)}</span>
              <span class="room-repair-builder-group-state">
                <em>${groupCount}</em>
                <i class="fas fa-chevron-down room-repair-builder-group-chevron"></i>
              </span>
            </button>
            <div class="room-repair-builder-subnav">
              ${(group.children || []).map(child => `
                <button type="button" class="${child.key === activeNode ? 'is-active' : ''}" data-builder-node-button="${child.key}" onclick="selectRoomRepairBuilderNode('${child.key}')">
                  <i class="fas ${child.icon}"></i>
                  <span>${escapeRoomRepairHtml(child.label)}</span>
                  <em>${counts[child.section] || 0}</em>
                </button>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    function getRoomRepairBuilderOptionText(option) {
      return typeof option === 'string' ? option : option?.label;
    }

    function getRoomRepairBuilderOptionHint(node, option) {
      return typeof option === 'object' ? (option.hint || '') : '';
    }

    function getRoomRepairBuilderOptionLabel(option) {
      return String(getRoomRepairBuilderOptionText(option) || '').trim();
    }

    function getRoomRepairSelectedCoreLabel(label = '') {
      return String(label || '')
        .replace(/^\d+([,.]\d+)?\s*(м²|м2|м\.п\.|м трассы|шт\.?|мм ширина)\s*(·\s*[^:]+)?\s*:\s*/i, '')
        .replace(/\s*\([^)]*см[^)]*\)\s*$/i, '')
        .trim();
    }

    function findRoomRepairSectionItemIndex(sectionKey, optionText = '') {
      const textarea = document.querySelector(`[data-repair-section="${sectionKey}"]`);
      const target = normalizeRoomRepairBuilderLabel(optionText);
      if (!textarea || !target) return -1;
      return splitRoomRepairSectionTextarea(textarea.value).findIndex(item => {
        const itemCore = normalizeRoomRepairBuilderLabel(getRoomRepairSelectedCoreLabel(item));
        const itemFull = normalizeRoomRepairBuilderLabel(item);
        return itemCore === target || itemFull === target;
      });
    }

    function hasRoomRepairSelectedOption(items = [], optionText = '') {
      const target = normalizeRoomRepairBuilderLabel(optionText);
      if (!target) return false;
      return (items || []).some(item => {
        const itemCore = normalizeRoomRepairBuilderLabel(getRoomRepairSelectedCoreLabel(item));
        const itemFull = normalizeRoomRepairBuilderLabel(item);
        return itemCore === target || itemFull === target;
      });
    }

    function getRoomRepairFloorCoverKey(label = '') {
      const value = normalizeRoomRepairBuilderLabel(getRoomRepairSelectedCoreLabel(label));
      if (/клеев.*пробк|пробк.*клеев/.test(value)) return 'cork_glue';
      if (/замков.*пробк|пробк.*замков/.test(value)) return 'cork_lock';
      if (/кварц|spc|винил/.test(value)) return 'quartz';
      if (/паркетная/.test(value)) return 'parquet_board';
      if (/инженер/.test(value)) return 'engineered';
      if (/паркет/.test(value)) return 'parquet';
      if (/керамогранит/.test(value)) return 'porcelain';
      if (/керамическ|плитк/.test(value)) return 'ceramic';
      if (/линолеум/.test(value)) return 'linoleum';
      if (/налив/.test(value)) return 'self_leveling';
      if (/пробков/.test(value)) return 'cork';
      if (/ламинат/.test(value)) return 'laminate';
      return '';
    }

    function getRoomRepairFloorFormatKeyFromLabel(label = '') {
      const value = normalizeRoomRepairBuilderLabel(label);
      if (/замков.*пробк|пробк.*замков/.test(value)) return 'cork_lock';
      if (/клеев.*пробк|пробк.*клеев/.test(value)) return 'cork_glue';
      if (/коротк|мелк.*плаш/.test(value)) return 'short_plank';
      if (/плитк.*модул|модул.*плитк/.test(value)) return 'tile_module';
      if (/модул|щит/.test(value)) return 'module';
      if (/крупноформат/.test(value)) return 'large_tile';
      if (/фигур/.test(value)) return 'figured';
      if (/рамочн.*композ|рамочн.*расклад/.test(value)) return 'frame_molding';
      if (/углов.*профил/.test(value)) return 'corner_profile';
      if (/декоративн.*рейк|декоративн.*профил/.test(value)) return 'decor_profile';
      if (/настенн.*молдинг|молдинг|профил/.test(value)) return 'wall_molding';
      if (/обои.*покраск|покраск.*обои/.test(value)) return 'wallpaper_paint';
      if (/рулон/.test(value)) return 'roll';
      if (/листов.*гибк|гибк.*кам/.test(value)) return 'flex_stone_sheet';
      if (/сплошн.*сло|нанесен/.test(value)) return 'coat';
      if (/рейк|ламел/.test(value)) return 'slat';
      if (/полимерн/.test(value)) return 'polymer_floor';
      if (/эпоксид/.test(value)) return 'epoxy_floor';
      if (/полиуретан/.test(value)) return 'polyurethane_floor';
      if (/кварцев/.test(value)) return 'quartz_floor';
      if (/3d|3д/.test(value)) return 'decor_3d_floor';
      if (/доск|планк/.test(value)) return 'plank';
      return '';
    }

    function getRoomRepairFloorShapeKeyFromLabel(label = '') {
      const value = normalizeRoomRepairBuilderLabel(label);
      if (/квадрат/.test(value)) return 'square';
      if (/прямоуголь/.test(value)) return 'rectangle';
      return '';
    }

    function getRoomRepairDefaultFloorFormatKey(primaryFloorCover = '') {
      const coverKey = getRoomRepairFloorCoverKey(primaryFloorCover);
      if (['porcelain', 'ceramic'].includes(coverKey)) return 'tile_module';
      if (coverKey === 'linoleum') return 'roll';
      if (coverKey === 'self_leveling') return 'polymer_floor';
      if (coverKey === 'cork') return '';
      if (coverKey === 'cork_lock') return 'cork_lock';
      if (coverKey === 'cork_glue') return 'cork_glue';
      return 'plank';
    }

    function getRoomRepairSelectedFloorFormatKey(selectedItems = [], primaryFloorCover = '') {
      const selectedFormat = [...(selectedItems || [])].reverse()
        .map(getRoomRepairFloorFormatKeyFromLabel)
        .find(Boolean);
      return selectedFormat || getRoomRepairDefaultFloorFormatKey(primaryFloorCover);
    }

    function getRoomRepairDefaultFloorShapeKey(primaryFloorCover = '', formatKey = '') {
      if (['plank', 'short_plank', 'roll'].includes(formatKey)) return 'rectangle';
      if (formatKey === 'cork_lock') return 'rectangle';
      if (formatKey === 'cork_glue') return 'rectangle';
      if (['module', 'tile_module', 'figured', 'large_tile'].includes(formatKey)) return 'square';
      return '';
    }

    function getRoomRepairSelectedFloorShapeKey(selectedItems = [], primaryFloorCover = '') {
      const formatKey = getRoomRepairSelectedFloorFormatKey(selectedItems, primaryFloorCover);
      const selectedShape = [...(selectedItems || [])].reverse()
        .map(getRoomRepairFloorShapeKeyFromLabel)
        .find(Boolean);
      return selectedShape || getRoomRepairDefaultFloorShapeKey(primaryFloorCover, formatKey);
    }

    function getRoomRepairFloorDimensionPreset(primaryFloorCover = '', formatKey = '', shapeKey = '', sizeKey = 'standard') {
      const coverKey = getRoomRepairFloorCoverKey(primaryFloorCover);
      const coverValue = normalizeRoomRepairBuilderLabel(primaryFloorCover);
      if ((formatKey === 'roll' || formatKey === 'wallpaper_paint') && /обои/.test(coverValue)) {
        const wallpaperWidths = {
          wallpaper_narrow: 53,
          wallpaper_medium: 70,
          wallpaper_wide: 106,
          wallpaper_extra_wide: 140,
          standard: 53,
          custom: 106
        };
        return { length: 1000, width: wallpaperWidths[sizeKey] || wallpaperWidths.standard };
      }
      const target = {
        laminate: 'floor_quartzvinyl',
        quartz: 'floor_quartzvinyl',
        parquet_board: 'floor_parquet_board',
        engineered: 'floor_engineered',
        parquet: 'floor_parquet',
        cork: 'floor_cork',
        cork_lock: 'floor_cork',
        cork_glue: 'floor_cork'
      }[coverKey];
      const shapePresetKey = ['tile_module', 'large_tile'].includes(formatKey)
        ? (shapeKey === 'rectangle' ? 'tile_rectangle' : 'tile_square')
        : (formatKey === 'figured'
          ? (shapeKey === 'rectangle' ? 'figured_rectangle' : 'figured_square')
          : (formatKey === 'cork_glue' ? (shapeKey === 'square' ? 'cork_glue_square' : 'cork_glue_rectangle') : formatKey));
      const structuredPresets = {
        floor_quartzvinyl: {
          plank: { small: [65, 12], standard: [122, 18], wide: [152, 23], large: [180, 23] },
          tile_square: { small: [30, 30], standard: [45, 45], medium: [60, 60], large: [90, 90] },
          tile_rectangle: { small: [30, 15], standard: [60, 30], medium: [60, 45], large: [90, 45] },
          figured_square: { small: [20, 20], standard: [30, 30], medium: [40, 40], large: [50, 50] },
          figured_rectangle: { small: [20, 10], standard: [30, 26], medium: [40, 35], large: [50, 43] }
        },
        floor_parquet_board: {
          plank: { small: [120, 14], standard: [220, 18], wide: [240, 20], large: [300, 24] },
          short_plank: { small: [50, 9], standard: [70, 12], wide: [90, 14], large: [120, 16] },
          module: { small: [40, 40], standard: [60, 60], wide: [80, 80], large: [100, 100] }
        },
        floor_engineered: {
          plank: { small: [120, 14], standard: [180, 16], wide: [220, 20], large: [300, 24] },
          short_plank: { small: [50, 9], standard: [70, 12], wide: [90, 14], large: [120, 16] },
          module: { small: [40, 40], standard: [60, 60], wide: [80, 80], large: [100, 100] }
        },
        floor_parquet: {
          plank: { small: [30, 5], standard: [42, 7], wide: [50, 9], large: [60, 10] },
          short_plank: { small: [25, 5], standard: [35, 7], wide: [45, 9], large: [60, 10] },
          module: { small: [40, 40], standard: [60, 60], wide: [80, 80], large: [100, 100] }
        },
        floor_cork: {
          cork_lock: { small: [90, 30], standard: [91.5, 30.5], wide: [120, 29.5], large: [122, 18.5] },
          cork_glue_square: { small: [30, 30], standard: [45, 45], wide: [60, 60], large: [90, 90] },
          cork_glue_rectangle: { small: [30, 15], standard: [60, 30], wide: [90, 15], large: [90, 30] },
          tile_square: { small: [30, 30], standard: [45, 45], medium: [60, 60], large: [90, 90] },
          tile_rectangle: { small: [30, 15], standard: [60, 30], medium: [90, 15], large: [90, 30] }
        }
      };
      if (target) {
        const found = structuredPresets[target]?.[shapePresetKey || 'plank']?.[sizeKey];
        if (found) return { length: found[0], width: found[1] };
      }
      const tilePresets = {
        tile_square: { small: [20, 20], standard: [60, 60], medium: [80, 80], large: [120, 120] },
        tile_rectangle: { small: [30, 15], standard: [60, 30], medium: [60, 120], large: [120, 240] },
        large_square: { small: [60, 60], standard: [120, 120], medium: [160, 160], large: [240, 240] },
        large_rectangle: { small: [60, 120], standard: [120, 120], medium: [120, 240], large: [160, 320] },
        figured_square: { small: [15, 15], standard: [25, 25], medium: [35, 35], large: [45, 45] },
        figured_rectangle: { small: [15, 10], standard: [25, 22], medium: [35, 30], large: [45, 39] }
      };
      const tileSizeKey = sizeKey === 'wide' ? 'medium' : sizeKey;
      const tileKey = formatKey === 'large_tile'
        ? (shapeKey === 'rectangle' ? 'large_rectangle' : 'large_square')
        : (formatKey === 'figured' ? (shapeKey === 'rectangle' ? 'figured_rectangle' : 'figured_square') : (shapeKey === 'rectangle' ? 'tile_rectangle' : 'tile_square'));
      const tileFound = tilePresets[tileKey]?.[tileSizeKey];
      if (tileFound) return { length: tileFound[0], width: tileFound[1] };
      if (coverKey === 'linoleum') return { length: 2500, width: 300 };
      return { length: 122, width: 18 };
    }

    function isRoomRepairDetailApplicable(entity = {}, primaryFloorCover = '') {
      const appliesTo = entity?.appliesTo;
      if (!appliesTo || !primaryFloorCover) return true;
      const core = getRoomRepairSelectedCoreLabel(primaryFloorCover);
      const value = `${core} ${primaryFloorCover}`;
      if (appliesTo instanceof RegExp) return appliesTo.test(value);
      if (Array.isArray(appliesTo)) return appliesTo.some(item => isRoomRepairDetailApplicable({ appliesTo: item }, primaryFloorCover));
      return normalizeRoomRepairBuilderLabel(value).includes(normalizeRoomRepairBuilderLabel(appliesTo));
    }

    function isRoomRepairDetailSelectionRequirementMet(entity = {}, selectedItems = []) {
      const requirement = entity?.requiresSelected;
      if (!requirement) return true;
      const values = (selectedItems || []).map(item => `${getRoomRepairSelectedCoreLabel(item)} ${item}`);
      if (requirement instanceof RegExp) return values.some(value => requirement.test(value));
      if (Array.isArray(requirement)) return requirement.some(item => isRoomRepairDetailSelectionRequirementMet({ requiresSelected: item }, selectedItems));
      const target = normalizeRoomRepairBuilderLabel(requirement);
      return values.some(value => normalizeRoomRepairBuilderLabel(value).includes(target));
    }

    function isRoomRepairCommercialBuilderContext(room = {}) {
      const autoContext = getRoomRepairAutoContext(room, 'own', '');
      const text = [
        room.roomType,
        room.type,
        room.appointment,
        room.subAppointment,
        room.format,
        room.retailPremiseType,
        autoContext.premiseType
      ].join(' ').toLowerCase();
      return !!autoContext.isCommercial || /коммер|магазин|бутик|офис|торгов|бизнес|салон|кафе|ресторан|склад/.test(text);
    }

    function normalizeRoomRepairBuilderLabel(label = '') {
      return String(label || '').toLowerCase().replace(/ё/g, 'е');
    }

    function isRoomRepairShowerFloorOption(label = '') {
      return /душев|поддон|противоскольз/.test(normalizeRoomRepairBuilderLabel(label));
    }

    function isRoomRepairCommercialFloorOption(label = '') {
      return /коммерческ/.test(normalizeRoomRepairBuilderLabel(label));
    }

    function isRoomRepairPrimaryFloorCover(label = '') {
      const value = normalizeRoomRepairBuilderLabel(getRoomRepairSelectedCoreLabel(label));
      const hasCover = /ламинат|кварц|spc|винил|паркет|инженер|керамогранит|плитк|микроцемент|пробков|линолеум|ковролин|налив|эпоксид|полиуретан/.test(value);
      if (!hasCover) return false;
      if (/плинтус|порог|переход|подлож|шумоизоляц|стяжк|укладк|декоративн|формат|размер|запил|мозаик|бордюр|сварк|приклей|основан|способ/.test(value)) return false;
      return true;
    }

    function getRoomRepairSelectedPrimaryFloorCover(items = []) {
      return [...(items || [])].reverse().find(item => isRoomRepairPrimaryFloorCover(item)) || '';
    }

    function isRoomRepairPrimaryWallCover(label = '') {
      const value = normalizeRoomRepairBuilderLabel(getRoomRepairSelectedCoreLabel(label));
      const hasCover = /покраск|окраск|краск|обои|фотообои|штукатур|микроцемент|плитк|керамогранит|панел|мдф|рееч|камень|шпон|стекл|зеркал|мягк|бамбук|мрамор|молдинг|профил/.test(value);
      if (!hasCover) return false;
      if (/подготовк|штукатурк.*маяк|шпаклевк|стеклохолст|геометр|проем|перегород|запил|герметизац|способ|формат|размер|цвет|фактур|класс|тип:/.test(value)) return false;
      return true;
    }

    function getRoomRepairSelectedPrimaryWallCover(items = []) {
      return [...(items || [])].reverse().find(item => isRoomRepairPrimaryWallCover(item)) || '';
    }

    function isRoomRepairPrimaryCeilingCover(label = '') {
      const value = normalizeRoomRepairBuilderLabel(getRoomRepairSelectedCoreLabel(label));
      const hasCover = /натяж|тканев|тенев|парящ|многоуровн|гкл|гипсокартон|покраск|окраск|подвесн|реечн|кассет|грильято|акустич/.test(value);
      if (!hasCover) return false;
      if (/подготовк|стеклохолст|светов|led|карниз|ниша|люк|люстр|профил|система:|фактура:|цвет:|монтаж/.test(value)) return false;
      return true;
    }

    function getRoomRepairSelectedPrimaryCeilingCover(items = []) {
      return [...(items || [])].reverse().find(item => isRoomRepairPrimaryCeilingCover(item)) || '';
    }

    function isRoomRepairZoneCoverNode(nodeKey = '') {
      return nodeKey === 'finishFloor' || nodeKey === 'finishWalls' || nodeKey === 'finishCeiling';
    }

    function getRoomRepairZoneNodeConfig(nodeKey = '') {
      if (nodeKey === 'finishCeiling') {
        return {
          section: 'ceiling',
          source: 'ceiling-zone-cover',
          activeDataset: 'activeCeilingZone',
          cardSelector: '[data-ceiling-zone-card]',
          cardAttr: 'data-ceiling-zone-card',
          coverAttr: 'data-ceiling-zone-cover',
          typeAttr: 'data-ceiling-zone-type',
          areaAttr: 'data-ceiling-zone-area',
          areaMode: 'ceilingArea',
          labelNoun: 'потолка',
          fallbackId: 'ceiling_zone_1',
          defaultZoneLabel: 'Весь потолок',
          defaultZoneHint: 'Полная площадь потолка без запаса',
          linkedQuantitySource: 'ceiling-zone-area',
          primaryCover: getRoomRepairSelectedPrimaryCeilingCover,
          isPrimaryCover: isRoomRepairPrimaryCeilingCover
        };
      }
      return nodeKey === 'finishWalls'
        ? {
            section: 'walls',
            source: 'wall-zone-cover',
            activeDataset: 'activeWallZone',
            cardSelector: '[data-wall-zone-card]',
            cardAttr: 'data-wall-zone-card',
            coverAttr: 'data-wall-zone-cover',
            typeAttr: 'data-wall-zone-type',
            areaAttr: 'data-wall-zone-area',
            areaMode: 'wallsArea',
            labelNoun: 'стен',
            fallbackId: 'wall_zone_1',
            defaultZoneLabel: 'Все стены',
            defaultZoneHint: 'Полная площадь стен без запаса',
            linkedQuantitySource: 'wall-zone-area',
            primaryCover: getRoomRepairSelectedPrimaryWallCover,
            isPrimaryCover: isRoomRepairPrimaryWallCover
          }
        : {
            section: 'floor',
            source: 'floor-zone-cover',
            activeDataset: 'activeFloorZone',
            cardSelector: '[data-floor-zone-card]',
            cardAttr: 'data-floor-zone-card',
            coverAttr: 'data-floor-zone-cover',
            typeAttr: 'data-floor-zone-type',
            areaAttr: 'data-floor-zone-area',
            areaMode: 'floorArea',
            labelNoun: 'пола',
            fallbackId: 'floor_zone_1',
            defaultZoneLabel: 'Вся комната',
            defaultZoneHint: 'Полный объем пола комнаты',
            linkedQuantitySource: 'floor-zone-area',
            primaryCover: getRoomRepairSelectedPrimaryFloorCover,
            isPrimaryCover: isRoomRepairPrimaryFloorCover
          };
    }

    function isRoomRepairBuilderOptionApplicable(node, option, calc = {}) {
      const label = getRoomRepairBuilderOptionLabel(option);
      const room = calc.room || {};
      const autoContext = getRoomRepairAutoContext(room, 'own', '');
      const isWet = isRoomRepairWetRoom(room);
      const isCommercial = isRoomRepairCommercialBuilderContext(room);
      if (node?.key === 'finishFloor') {
        if (isRoomRepairShowerFloorOption(label) && !isWet) return false;
        if (isRoomRepairCommercialFloorOption(label) && !isCommercial) return false;
        if (/гидроизоляц/i.test(label) && !(isWet || autoContext.isKitchen || autoContext.isHallway)) return false;
      }
      if (['equipmentBathroom', 'plumbingDrainage'].includes(node?.key) && !isWet) return false;
      if (/витрин|товарн|касс|эквайр|pos|вывеск/.test(normalizeRoomRepairBuilderLabel(label)) && !isCommercial) return false;
      return true;
    }

    function getRoomRepairBuilderVisibleOptions(node, calc = {}) {
      return (node?.options || [])
        .map((option, index) => ({ option, index }))
        .filter(item => isRoomRepairBuilderOptionApplicable(node, item.option, calc));
    }

    const roomRepairBackendOptionGroupsCache = new Map();
    const roomRepairBackendOptionGroupsPending = new Set();
    const roomRepairBackendControlledDetailGroups = new Set([
      'Формат покрытия',
      'Класс покрытия',
      'Тип покрытия',
      'Система / эффект',
      'Рисунок / раппорт',
      'Тип потолка',
      'Материал / система',
      'Форма покрытия',
      'Размер покрытия',
      'Цветовая гамма',
      'Фактура',
      'Защитный финиш',
      'Финиш профиля',
      'Фактура / поверхность',
      'Способ укладки',
      'Способ монтажа / нанесения',
      'Способ монтажа'
    ]);

    function getRoomRepairBackendCatalogKey(nodeKey = '', cover = '') {
      if (nodeKey === 'finishFloor') return 'floors.common';
      if (nodeKey === 'finishCeiling') return cover ? 'ceilings.common' : '';
      if (nodeKey === 'finishWalls') return cover ? 'walls.common' : '';
      return '';
    }

    function getRoomRepairBackendOptionGroupsKey(nodeKey = '', cover = '', selectedLabels = [], selectedGroups = []) {
      const labelsKey = selectedLabels
        .map(label => normalizeRoomRepairBuilderLabel(getRoomRepairSelectedCoreLabel(label)))
        .filter(Boolean)
        .sort()
        .join('|');
      const groupsKey = selectedGroups
        .map(label => normalizeRoomRepairBuilderLabel(label))
        .filter(Boolean)
        .sort()
        .join('|');
      return `${nodeKey}|${normalizeRoomRepairBuilderLabel(cover)}|${labelsKey}|${groupsKey}`;
    }

    function getRoomRepairBackendSelectedDetails(nodeKey = '', calc = {}) {
      if (nodeKey === 'finishCeiling') {
        const zoneKey = calc.activeCeilingZoneId || '';
        return normalizeRoomRepairStructuredSelections(calc.structuredSelections || readRoomRepairDraftStructuredSelections())
          .filter(selection => selection.section === 'ceiling'
            && selection.nodeKey === 'finishCeiling'
            && (!zoneKey || !selection.zoneKey || selection.zoneKey === zoneKey)
            && (selection.source === 'detail' || (selection.source === 'ceiling-zone-cover' && isRoomRepairPrimaryCeilingCover(selection.label))))
          .map(selection => (selection.source === 'ceiling-zone-cover'
            ? { ...selection, source: 'detail', detailGroup: 'Тип потолка' }
            : selection));
      }
      const zoneKey = nodeKey === 'finishWalls' ? (calc.activeWallZoneId || '') : (calc.activeFloorZoneId || '');
      return getRoomRepairZoneDetailSelections(nodeKey, calc.structuredSelections || readRoomRepairDraftStructuredSelections(), zoneKey);
    }

    function getRoomRepairBackendSelectedOptionLabels(nodeKey = '', calc = {}) {
      return getRoomRepairBackendSelectedDetails(nodeKey, calc)
        .map(selection => getRoomRepairSelectedCoreLabel(selection.label))
        .filter(Boolean);
    }

    function getRoomRepairBackendSelectedGroupLabels(nodeKey = '', calc = {}) {
      return getRoomRepairBackendSelectedDetails(nodeKey, calc)
        .map(selection => selection.detailGroup || '')
        .filter(Boolean);
    }

    function requestRoomRepairBackendOptionGroups(nodeKey = '', cover = '', selectedLabels = [], selectedGroups = []) {
      const catalogKey = getRoomRepairBackendCatalogKey(nodeKey, cover);
      if (!catalogKey || !cover || !window.RepairCoveringsApi?.fetchCoveringOptions) return null;
      const cacheKey = getRoomRepairBackendOptionGroupsKey(nodeKey, cover, selectedLabels, selectedGroups);
      if (roomRepairBackendOptionGroupsCache.has(cacheKey)) return roomRepairBackendOptionGroupsCache.get(cacheKey);
      if (roomRepairBackendOptionGroupsPending.has(cacheKey)) return null;
      roomRepairBackendOptionGroupsPending.add(cacheKey);
      window.RepairCoveringsApi.fetchCoveringOptions({
        catalog: catalogKey,
        cover,
        selectedGroups,
        selectedLabels
      })
        .then(payload => {
          roomRepairBackendOptionGroupsCache.set(cacheKey, payload);
          refreshRoomRepairBuilderShellPreservingScroll(true);
        })
        .catch(error => {
          console.warn('Covering backend options unavailable', error);
        })
        .finally(() => {
          roomRepairBackendOptionGroupsPending.delete(cacheKey);
        });
      return null;
    }

    function getRoomRepairBackendRequiredDetailLabels(nodeKey = '', cover = '', selectedLabels = [], selectedGroups = []) {
      if (!getRoomRepairBackendCatalogKey(nodeKey, cover) || !cover) return null;
      const backendOptions = requestRoomRepairBackendOptionGroups(nodeKey, cover, selectedLabels, selectedGroups);
      const requiredGroups = Array.isArray(backendOptions?.requiredGroups)
        ? backendOptions.requiredGroups.map(label => String(label || '').trim()).filter(Boolean)
        : [];
      return requiredGroups.length ? requiredGroups : null;
    }

    function getRoomRepairBackendCompletion(nodeKey = '', cover = '', selectedLabels = [], selectedGroups = []) {
      if (!getRoomRepairBackendCatalogKey(nodeKey, cover) || !cover) return null;
      const backendOptions = requestRoomRepairBackendOptionGroups(nodeKey, cover, selectedLabels, selectedGroups);
      if (!backendOptions || !Array.isArray(backendOptions.requiredGroups)) return null;
      return {
        filled: Number(backendOptions.filled || 0),
        total: Number(backendOptions.total || backendOptions.requiredGroups.length || 0),
        percent: Number(backendOptions.percent || 0),
        missing: Array.isArray(backendOptions.missing) ? backendOptions.missing : [],
        status: backendOptions.status || 'empty'
      };
    }

    function filterRoomRepairDetailGroupsByBackend(groups = [], backendOptions = null) {
      if (!backendOptions?.groups?.length) return groups;
      const allowedByGroup = new Map((backendOptions.groups || []).map(group => [
        normalizeRoomRepairBuilderLabel(group.group || ''),
        new Set((group.options || []).map(option => normalizeRoomRepairBuilderLabel(option.label || '')).filter(Boolean))
      ]));
      return groups
        .map(group => {
          const groupKey = normalizeRoomRepairBuilderLabel(group.label || '');
          const isBackendControlled = roomRepairBackendControlledDetailGroups.has(group.label || '');
          const allowedOptions = allowedByGroup.get(groupKey);
          if (!allowedOptions) return isBackendControlled ? null : group;
          return {
            ...group,
            options: (group.options || []).filter(({ option }) =>
              allowedOptions.has(normalizeRoomRepairBuilderLabel(getRoomRepairBuilderOptionText(option)))
            )
          };
        })
        .filter(group => group && group.options?.length);
    }

    function getRoomRepairBuilderVisibleDetailGroups(node, selectedItems = [], calc = {}) {
      if (!node?.detailGroups?.length) return [];
      const isZoneNode = isRoomRepairZoneCoverNode(node.key);
      const zoneConfig = getRoomRepairZoneNodeConfig(node.key);
      const primaryCover = isZoneNode
        ? (calc.activeCeilingZoneCover || calc.activeWallZoneCover || calc.activeFloorZoneCover || zoneConfig.primaryCover(selectedItems))
        : (node.key === 'finishCeiling' ? getRoomRepairSelectedPrimaryCeilingCover(selectedItems) : '');
      const backendCatalogKey = getRoomRepairBackendCatalogKey(node.key, primaryCover);
      const backendOptions = backendCatalogKey
        ? requestRoomRepairBackendOptionGroups(
          node.key,
          primaryCover,
          getRoomRepairBackendSelectedOptionLabels(node.key, calc),
          getRoomRepairBackendSelectedGroupLabels(node.key, calc)
        )
        : null;
      const selectedFormatKey = node.key === 'finishFloor'
        ? getRoomRepairSelectedFloorFormatKey(selectedItems, primaryCover)
        : (node.key === 'finishWalls' ? getRoomRepairSelectedFloorFormatKey(selectedItems, primaryCover) : '');
      const groups = node.detailGroups
        .map((group, groupIndex) => ({ group, groupIndex }))
        .filter(item => !(node.key === 'finishCeiling' && primaryCover && item.group.label === 'Тип потолка'))
        .filter(item => !isZoneNode || isRoomRepairDetailApplicable(item.group, primaryCover))
        .filter(item => !isZoneNode || isRoomRepairDetailSelectionRequirementMet(item.group, selectedItems))
        .map(({ group, groupIndex }) => ({
          ...group,
          groupIndex,
          options: (group.options || [])
            .map((option, optionIndex) => ({ option, optionIndex }))
            .filter(item => isRoomRepairBuilderOptionApplicable(node, item.option, calc))
            .filter(item => !isZoneNode || isRoomRepairDetailApplicable(item.option, primaryCover))
            .filter(item => !isZoneNode || isRoomRepairDetailSelectionRequirementMet(item.option, selectedItems))
            .filter(item => {
              if (!isZoneNode || !item.option?.formatApplies?.length) return true;
              return item.option.formatApplies.includes(selectedFormatKey);
            })
        }))
        .filter(group => group.options.length);
      return backendCatalogKey
        ? filterRoomRepairDetailGroupsByBackend(groups, backendOptions)
        : groups;
    }

    function getRoomRepairBuilderQtyUnit(rule, quantity) {
      if (quantity?.label) return quantity.label;
      const labels = {
        floorArea: 'м²',
        wallsArea: 'м²',
        ceilingArea: 'м²',
        wetArea: 'м²',
        perimeter: 'м.п.',
        electricalLength: 'м трассы',
        lightingLength: 'м.п.',
        doorThresholdCm: 'см',
        parsedQty: 'шт.',
        climateUnits: 'шт.'
      };
      return labels[rule?.qtyMode] || 'шт.';
    }

    function getRoomRepairDoorThresholdLengthCm(room = {}) {
      const widths = Array.isArray(room?.doorWidths) ? room.doorWidths : [];
      const firstWidth = widths.map(value => Number(value)).find(value => Number.isFinite(value) && value > 0);
      return Number(Math.max(50, Math.min(180, firstWidth || Number(room?.doorWidth || 0) || 80)).toFixed(1));
    }

    function getRoomRepairBuilderDefaultQty(rule, quantity, calc = {}) {
      if (quantity && Number(quantity.defaultValue || 0) > 0) return Number(quantity.defaultValue || 1);
      const qtyMode = quantity?.mode || rule?.qtyMode;
      if (qtyMode === 'floorArea' && Number(calc.activeFloorZoneArea || 0) > 0) {
        return Number(Number(calc.activeFloorZoneArea).toFixed(2));
      }
      if (qtyMode === 'wallsArea' && Number(calc.activeWallZoneArea || 0) > 0) {
        return Number(Number(calc.activeWallZoneArea).toFixed(2));
      }
      if (qtyMode === 'ceilingArea' && Number(calc.activeCeilingZoneArea || 0) > 0) {
        return Number(Number(calc.activeCeilingZoneArea).toFixed(2));
      }
      const metrics = calc.roomMetrics || {};
      switch (qtyMode) {
        case 'floorArea': return Number(metrics.floorArea || 1).toFixed(2);
        case 'wallsArea': return Number(metrics.wallArea || metrics.wallsArea || 1).toFixed(2);
        case 'ceilingArea': return Number(metrics.ceilingArea || 1).toFixed(2);
        case 'wetArea': return Number(Math.max(4, Math.min(Number(metrics.wallArea || metrics.wallsArea || 4), Number(metrics.floorArea || 4)))).toFixed(2);
        case 'perimeter': return Number(Math.max(4, Math.sqrt(Number(metrics.floorArea || 1)) * 4)).toFixed(2);
        case 'electricalLength': return Number(Math.max(4, Number(metrics.floorArea || 1) * 1.2)).toFixed(2);
        case 'lightingLength': return Number(Math.max(2, Math.sqrt(Number(metrics.ceilingArea || metrics.floorArea || 1)))).toFixed(2);
        case 'doorThresholdCm': return getRoomRepairDoorThresholdLengthCm(calc.room || {});
        case 'parsedQty': return Number(rule?.fallbackQty || 1);
        case 'climateUnits': return 1;
        default: return 0;
      }
    }

    function getRoomRepairBuilderQuantityConfig(node, option, rule, calc = {}, group = null) {
      const explicit = typeof option === 'object' ? option.quantity : node.quantity;
      if (explicit) {
        const explicitMode = explicit.mode || rule?.qtyMode || 'parsedQty';
        const value = Number(getRoomRepairBuilderDefaultQty(rule, explicit, calc) || explicit.defaultValue || 1);
        const zoneOptions = explicit.noZoneSelector ? [] : getRoomRepairZoneOptions(calc.room || {}, explicitMode, calc.roomMetrics || {});
        return {
          ...explicit,
          value,
          mode: explicitMode,
          zoneOptions,
          zoneKey: zoneOptions.length ? 'custom' : (calc.activeCeilingZoneId || calc.activeWallZoneId || calc.activeFloorZoneId || ''),
          zoneLabel: calc.activeCeilingZoneLabel || calc.activeWallZoneLabel || calc.activeFloorZoneLabel || '',
          zoneHint: calc.activeCeilingZoneHint || calc.activeWallZoneHint || calc.activeFloorZoneHint || '',
          linkedToFloorZone: explicitMode === 'floorArea' && !zoneOptions.length && !!calc.activeFloorZoneId,
          linkedToWallZone: explicitMode === 'wallsArea' && !zoneOptions.length && !!calc.activeWallZoneId,
          linkedToCeilingZone: explicitMode === 'ceilingArea' && !zoneOptions.length && !!calc.activeCeilingZoneId
        };
      }
      if (group?.noAutoQuantity) return null;
      const editableModes = ['parsedQty', 'climateUnits', 'floorArea', 'wallsArea', 'ceilingArea', 'wetArea', 'perimeter', 'electricalLength', 'lightingLength'];
      if (!rule?.qtyMode || !editableModes.includes(rule.qtyMode)) return null;
      const unit = getRoomRepairBuilderQtyUnit(rule, null);
      const max = ['floorArea', 'wallsArea', 'ceilingArea'].includes(rule.qtyMode) ? 2000 : 200;
      const zoneOptions = getRoomRepairZoneOptions(calc.room || {}, rule.qtyMode, calc.roomMetrics || {});
      return {
        label: unit,
        suffix: unit,
        defaultValue: getRoomRepairBuilderDefaultQty(rule, null, calc),
        value: getRoomRepairBuilderDefaultQty(rule, null, calc),
        min: 0.1,
        max,
        step: ['parsedQty', 'climateUnits'].includes(rule.qtyMode) ? 1 : 0.1,
        mode: rule.qtyMode,
        zoneOptions,
        zoneKey: zoneOptions.length ? 'full' : (calc.activeCeilingZoneId || calc.activeWallZoneId || calc.activeFloorZoneId || ''),
        zoneLabel: calc.activeCeilingZoneLabel || calc.activeWallZoneLabel || calc.activeFloorZoneLabel || '',
        zoneHint: calc.activeCeilingZoneHint || calc.activeWallZoneHint || calc.activeFloorZoneHint || '',
        linkedToFloorZone: rule.qtyMode === 'floorArea' && !zoneOptions.length && !!calc.activeFloorZoneId,
        linkedToWallZone: rule.qtyMode === 'wallsArea' && !zoneOptions.length && !!calc.activeWallZoneId,
        linkedToCeilingZone: rule.qtyMode === 'ceilingArea' && !zoneOptions.length && !!calc.activeCeilingZoneId
      };
    }

    function formatRoomRepairSelectedText(rawLabel, count, quantityConfig, zoneMeta = null) {
      const label = String(rawLabel || '').trim();
      if (!quantityConfig || !Number(count || 0)) return label;
      const mode = quantityConfig.mode || '';
      const unit = quantityConfig.suffix || quantityConfig.label || 'шт.';
      if (['floorArea', 'wallsArea', 'ceilingArea', 'wetArea', 'perimeter', 'electricalLength', 'lightingLength'].includes(mode)) {
        const areaUnit = quantityConfig.label || getRoomRepairBuilderQtyUnit({ qtyMode: mode }, null);
        const zoneText = zoneMeta?.key && zoneMeta.key !== 'full' ? ` · ${zoneMeta.label}` : '';
        return `${Number(count).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${areaUnit}${zoneText}: ${label}`;
      }
      if (quantityConfig.suffix && quantityConfig.suffix !== quantityConfig.label) {
        return `${Math.max(1, Math.round(Number(count || 1)))} ${quantityConfig.suffix}`;
      }
      return `${Math.max(1, Math.round(Number(count || 1)))} ${unit}: ${label}`;
    }

    function renderRoomRepairBuilderOptionCard(node, option, index, selectedItems = [], calc = {}) {
      const optionText = getRoomRepairBuilderOptionText(option);
      const inputId = `roomRepairBuilderQty_${node.key}_${index}`;
      const zoneId = `roomRepairBuilderZone_${node.key}_${index}`;
      const rule = getRoomRepairBuilderWorkRule(node.section, optionText);
      const quantity = getRoomRepairBuilderQuantityConfig(node, option, rule, calc);
      const defaultQty = quantity ? (parseFloat(String(optionText).replace(',', '.')) || Number(quantity.value || quantity.defaultValue || 1)) : 0;
      const isAdded = hasRoomRepairSelectedOption(selectedItems, optionText);
      const measureLabel = getRoomRepairBuilderRuleMeasureLabel(rule);
      const zoneOptions = quantity?.zoneOptions || [];
      const optionHint = getRoomRepairBuilderOptionHint(node, option);
      return `
        <button type="button" class="room-repair-builder-option ${isAdded ? 'is-added' : ''}" onclick="addRoomRepairBuilderOption('${node.key}', ${index})">
          <span class="room-repair-builder-option-icon"><i class="fas ${node.icon}"></i></span>
          <span class="room-repair-builder-option-body">
            <strong>${escapeRoomRepairHtml(optionText)}</strong>
            ${optionHint ? `<small>${escapeRoomRepairHtml(optionHint)}</small>` : ''}
            ${rule ? `<span class="room-repair-builder-meta" title="${escapeRoomRepairHtml(rule.workId)}">${escapeRoomRepairHtml(measureLabel)}</span>` : ''}
            ${quantity ? `
              <span class="room-repair-builder-qty" onclick="event.stopPropagation()">
                ${zoneOptions.length ? `
                  <select id="${zoneId}" aria-label="Зона расчета" onchange="updateRoomRepairBuilderZoneQty('${node.key}', ${index})">
                    ${zoneOptions.map(zone => `<option value="${escapeRoomRepairHtml(zone.key)}" data-qty="${zone.qty}" title="${escapeRoomRepairHtml(zone.hint || '')}" ${zone.key === quantity.zoneKey ? 'selected' : ''}>${escapeRoomRepairHtml(zone.label)}</option>`).join('')}
                  </select>
                ` : ''}
                <input id="${inputId}" type="number" min="${quantity.min || 1}" max="${quantity.max || 40}" step="${quantity.step || 1}" value="${defaultQty}" inputmode="decimal">
                <em>${escapeRoomRepairHtml(quantity.label || 'шт.')}</em>
              </span>
            ` : ''}
          </span>
          <span class="room-repair-builder-option-state"><i class="fas ${isAdded ? 'fa-check' : 'fa-plus'}"></i></span>
        </button>
      `;
    }

    function formatRoomRepairFloorZoneLabel(zone = {}) {
      const area = Number(Math.max(0, Number(zone.area || 0)).toFixed(2));
      const zoneLabel = zone.zoneLabel || 'Зона покрытия';
      return `${formatRoomRepairQtyValue(area)} м² · ${zoneLabel}: ${zone.cover || 'Выберите покрытие'}`;
    }

    function getRoomRepairFloorZoneSelections(structuredSelections = []) {
      return normalizeRoomRepairStructuredSelections(structuredSelections)
        .filter(selection => selection.section === 'floor' && selection.nodeKey === 'finishFloor' && selection.source === 'floor-zone-cover');
    }

    function getRoomRepairRequiredFloorDetailGroups() {
      return ['Формат покрытия', 'Класс покрытия', 'Тип покрытия', 'Форма покрытия', 'Размер покрытия', 'Цветовая гамма', 'Способ укладки'];
    }

    function getRoomRepairRequiredDetailGroups(nodeKey = '') {
      if (nodeKey === 'finishWalls') {
        return ['Формат покрытия', 'Класс покрытия', 'Тип покрытия', 'Система / эффект', 'Рисунок / раппорт', 'Форма покрытия', 'Размер покрытия', 'Цветовая гамма', 'Фактура', 'Защитный финиш', 'Финиш профиля', 'Способ монтажа / нанесения'];
      }
      if (nodeKey === 'finishCeiling') {
        return ['Тип потолка', 'Материал / система', 'Фактура / поверхность', 'Цветовая гамма', 'Способ монтажа'];
      }
      return getRoomRepairRequiredFloorDetailGroups();
    }

    function getRoomRepairFloorZoneDetailSelections(structuredSelections = [], zoneKey = '') {
      return normalizeRoomRepairStructuredSelections(structuredSelections)
        .filter(selection => selection.section === 'floor'
          && selection.nodeKey === 'finishFloor'
          && selection.source === 'detail'
          && (!zoneKey || selection.zoneKey === zoneKey));
    }

    function cleanRoomRepairFloorDetailValue(label = '') {
      return getRoomRepairSelectedCoreLabel(label)
        .replace(/^(Формат|Тип|Форма|Размер|Цвет|Финиш):\s*/i, '')
        .trim();
    }

    function getRoomRepairFloorZoneDetailMap(structuredSelections = [], zoneKey = '') {
      return getRoomRepairFloorZoneDetailSelections(structuredSelections, zoneKey)
        .reduce((acc, selection) => {
          const group = selection.detailGroup || '';
          if (!group) return acc;
          if (!acc[group]) acc[group] = [];
          acc[group].push({
            ...selection,
            value: cleanRoomRepairFloorDetailValue(selection.label)
          });
          return acc;
        }, {});
    }

    function getRoomRepairWallZoneSelections(structuredSelections = []) {
      return normalizeRoomRepairStructuredSelections(structuredSelections)
        .filter(selection => selection.section === 'walls' && selection.nodeKey === 'finishWalls' && selection.source === 'wall-zone-cover');
    }

    function getRoomRepairWallZoneDetailSelections(structuredSelections = [], zoneKey = '') {
      return normalizeRoomRepairStructuredSelections(structuredSelections)
        .filter(selection => selection.section === 'walls'
          && selection.nodeKey === 'finishWalls'
          && selection.source === 'detail'
          && (!zoneKey || selection.zoneKey === zoneKey));
    }

    function getRoomRepairWallZoneDetailMap(structuredSelections = [], zoneKey = '') {
      return getRoomRepairWallZoneDetailSelections(structuredSelections, zoneKey)
        .reduce((acc, selection) => {
          const group = selection.detailGroup || '';
          if (!group) return acc;
          if (!acc[group]) acc[group] = [];
          acc[group].push({
            ...selection,
            value: cleanRoomRepairFloorDetailValue(selection.label)
          });
          return acc;
        }, {});
    }

    function getRoomRepairCeilingZoneSelections(structuredSelections = []) {
      return normalizeRoomRepairStructuredSelections(structuredSelections)
        .filter(selection => selection.section === 'ceiling' && selection.nodeKey === 'finishCeiling' && selection.source === 'ceiling-zone-cover');
    }

    function getRoomRepairCeilingZoneDetailSelections(structuredSelections = [], zoneKey = '') {
      return normalizeRoomRepairStructuredSelections(structuredSelections)
        .filter(selection => selection.section === 'ceiling'
          && selection.nodeKey === 'finishCeiling'
          && selection.source === 'detail'
          && (!zoneKey || selection.zoneKey === zoneKey));
    }

    function getRoomRepairCeilingZoneDetailMap(structuredSelections = [], zoneKey = '') {
      return getRoomRepairCeilingZoneDetailSelections(structuredSelections, zoneKey)
        .reduce((acc, selection) => {
          const group = selection.detailGroup || '';
          if (!group) return acc;
          if (!acc[group]) acc[group] = [];
          acc[group].push({
            ...selection,
            value: cleanRoomRepairFloorDetailValue(selection.label)
          });
          return acc;
        }, {});
    }

    function getRoomRepairZoneDetailSelections(nodeKey = '', structuredSelections = [], zoneKey = '') {
      if (nodeKey === 'finishWalls') return getRoomRepairWallZoneDetailSelections(structuredSelections, zoneKey);
      if (nodeKey === 'finishCeiling') return getRoomRepairCeilingZoneDetailSelections(structuredSelections, zoneKey);
      return getRoomRepairFloorZoneDetailSelections(structuredSelections, zoneKey);
    }

    function getRoomRepairZoneDetailMap(nodeKey = '', structuredSelections = [], zoneKey = '') {
      if (nodeKey === 'finishWalls') return getRoomRepairWallZoneDetailMap(structuredSelections, zoneKey);
      if (nodeKey === 'finishCeiling') return getRoomRepairCeilingZoneDetailMap(structuredSelections, zoneKey);
      return getRoomRepairFloorZoneDetailMap(structuredSelections, zoneKey);
    }

    function getRoomRepairFloorZonePassport(row = {}, structuredSelections = []) {
      if (!row.cover) return '';
      const details = getRoomRepairFloorZoneDetailMap(structuredSelections, row.id);
      const entries = [
        { label: 'Тип', value: details['Тип покрытия']?.[0]?.value },
        { label: 'Класс', value: details['Класс покрытия']?.[0]?.value },
        { label: 'Раппорт', value: details['Рисунок / раппорт']?.[0]?.value },
        { label: 'Размер', value: details['Размер покрытия']?.[0]?.value },
        { label: 'Цвет', value: details['Цветовая гамма']?.[0]?.value },
        { label: 'Укладка', value: details['Способ укладки']?.[0]?.value }
      ].filter(entry => entry.value);
      return entries.length ? entries : '';
    }

    function renderRoomRepairFloorZonePassport(passport = '', rowId = '') {
      if (!passport) return '';
      const entries = Array.isArray(passport)
        ? passport
        : String(passport).split(' · ').filter(Boolean).map((value, index) => ({ label: `Параметр ${index + 1}`, value }));
      if (!entries.length) return '';
      const isLong = entries.length > 3 || entries.map(entry => entry.value).join(' · ').length > 58;
      const passportId = `roomRepairFloorPassport_${String(rowId || '').replace(/[^\w-]/g, '_')}`;
      const visibleEntries = entries.slice(0, 3);
      const hiddenCount = Math.max(0, entries.length - 3);
      const hiddenLabels = entries.slice(3).map(entry => entry.label).join(', ');
      return `
        <span class="room-repair-floor-zone-passport ${isLong ? 'is-collapsible' : ''}" id="${escapeRoomRepairHtml(passportId)}">
          <span class="room-repair-floor-zone-passport-head">
            <span class="room-repair-floor-zone-passport-mark"><i class="fas fa-clipboard-check"></i></span>
            <span class="room-repair-floor-zone-passport-title">
              <em>Паспорт покрытия</em>
              <span class="room-repair-floor-zone-passport-summary">
                ${visibleEntries.map(entry => `
                  <span>
                    <em>${escapeRoomRepairHtml(entry.label)}</em>
                    <strong>${escapeRoomRepairHtml(entry.value)}</strong>
                  </span>
                `).join('')}
              </span>
            </span>
            ${isLong ? `
              <span role="button" tabindex="0" class="room-repair-floor-zone-passport-toggle" onclick="toggleRoomRepairFloorZonePassport('${escapeRoomRepairJsString(passportId)}', event)" onkeydown="if(event.key === 'Enter' || event.key === ' '){ toggleRoomRepairFloorZonePassport('${escapeRoomRepairJsString(passportId)}', event); }" aria-label="Развернуть паспорт покрытия" aria-expanded="false" title="${hiddenLabels ? `Еще параметры: ${escapeRoomRepairHtml(hiddenLabels)}` : 'Развернуть паспорт покрытия'}" data-collapsed-title="${hiddenLabels ? `Еще параметры: ${escapeRoomRepairHtml(hiddenLabels)}` : 'Развернуть паспорт покрытия'}">
                <span>${hiddenCount ? `Еще ${hiddenCount}` : 'Все'}</span>
                <i class="fas fa-chevron-down"></i>
              </span>
            ` : ''}
          </span>
          <span class="room-repair-floor-zone-passport-details">
            ${entries.map(entry => `
              <span>
                <em>${escapeRoomRepairHtml(entry.label)}</em>
                <strong>${escapeRoomRepairHtml(entry.value)}</strong>
              </span>
            `).join('')}
          </span>
        </span>
      `;
    }

    function getRoomRepairFloorZoneRows(selectedItems = [], calc = {}) {
      const metrics = calc.roomMetrics || getRoomRepairMetrics(calc.room || {});
      const floorArea = Number(Math.max(0.1, Number(metrics.floorArea || calc.room?.area || 1)).toFixed(2));
      const structured = calc.structuredSelections || readRoomRepairDraftStructuredSelections();
      const zoneSelections = getRoomRepairFloorZoneSelections(structured);
      let rows = zoneSelections.map((selection, index) => ({
        id: selection.zoneKey || `floor_zone_${index + 1}`,
        cover: selection.zoneCover || (/выберите покрытие/i.test(selection.label) ? '' : getRoomRepairSelectedCoreLabel(selection.label)),
        area: Number(Math.max(0.1, Number(selection.quantity || selection.zoneDefaultQty || floorArea)).toFixed(2)),
        zoneType: selection.quantitySource || 'custom',
        zoneLabel: selection.zoneLabel || `Покрытие ${index + 1}`,
        zoneHint: selection.zoneHint || ''
      }));

      if (!rows.length) {
        const primary = getRoomRepairSelectedPrimaryFloorCover(selectedItems);
        if (primary) {
          rows = [{
            id: 'floor_zone_1',
            cover: getRoomRepairSelectedCoreLabel(primary),
            area: floorArea,
            zoneType: 'full',
            zoneLabel: 'Вся комната',
            zoneHint: 'Полный объем пола комнаты'
          }];
        }
      }

      const usedArea = rows.reduce((sum, row) => sum + Number(row.area || 0), 0);
      const remaining = Number(Math.max(0, floorArea - usedArea).toFixed(2));
      if (!rows.length || remaining > 0.05) {
        rows.push({
          id: `floor_zone_${rows.length + 1}`,
          cover: '',
          area: remaining > 0.05 ? remaining : floorArea,
          zoneType: rows.length ? 'remainder' : 'full',
          zoneLabel: rows.length ? 'Остаток' : 'Вся комната',
          zoneHint: rows.length ? 'Площадь за вычетом выбранных покрытий' : 'Полный объем пола комнаты',
          isPlaceholder: true
        });
      }
      return { rows, floorArea };
    }

    const ROOM_REPAIR_MAX_WALL_LAYERS = 7;

    function getRoomRepairWallActiveLayer() {
      const shell = getRoomRepairDraftShell();
      const layer = Number(shell?.dataset.activeWallLayer || 1);
      return Math.max(1, Math.min(ROOM_REPAIR_MAX_WALL_LAYERS, Number.isFinite(layer) ? layer : 1));
    }

    function getRoomRepairWallRowLayer(row = {}) {
      const layer = Number(row.wallLayer || 0);
      if (Number.isFinite(layer) && layer > 0) return Math.max(1, Math.min(ROOM_REPAIR_MAX_WALL_LAYERS, layer));
      return row.zoneType === 'paint_layer' || row.isLayer ? 2 : 1;
    }

    function isRoomRepairWallLinearCover(cover = '') {
      return /молдинг|профил/.test(normalizeRoomRepairBuilderLabel(cover));
    }

    function isRoomRepairWallUpperLayerCover(cover = '') {
      return /молдинг|профил/.test(normalizeRoomRepairBuilderLabel(cover));
    }

    function showRoomRepairWallLayerNotice(message = '') {
      const workspace = document.querySelector('#roomRepairCalculationModal [data-builder-workspace]');
      if (!workspace || !message) return;
      let notice = workspace.querySelector('[data-wall-layer-notice]');
      if (!notice) {
        notice = document.createElement('div');
        notice.className = 'room-repair-wall-layer-notice';
        notice.setAttribute('data-wall-layer-notice', 'true');
        workspace.prepend(notice);
      }
      notice.innerHTML = `<i class="fas fa-circle-info"></i><span>${escapeRoomRepairHtml(message)}</span>`;
      window.clearTimeout(window.__roomRepairWallLayerNoticeTimer);
      window.__roomRepairWallLayerNoticeTimer = window.setTimeout(() => notice?.remove?.(), 4200);
    }

    function formatRoomRepairWallLayerLabel(layer = 1) {
      const safeLayer = Math.max(1, Math.min(ROOM_REPAIR_MAX_WALL_LAYERS, Number(layer || 1)));
      return safeLayer === 1 ? 'Слой 1 · основа' : `Слой ${safeLayer} · поверх`;
    }

    const ROOM_REPAIR_MAX_CEILING_LAYERS = 7;

    function getRoomRepairCeilingActiveLayer() {
      const shell = getRoomRepairDraftShell();
      const layer = Number(shell?.dataset.activeCeilingLayer || 1);
      return Math.max(1, Math.min(ROOM_REPAIR_MAX_CEILING_LAYERS, Number.isFinite(layer) ? layer : 1));
    }

    function getRoomRepairCeilingRowLayer(row = {}) {
      const layer = Number(row.ceilingLayer || 0);
      if (Number.isFinite(layer) && layer > 0) return Math.max(1, Math.min(ROOM_REPAIR_MAX_CEILING_LAYERS, layer));
      if (['line', 'point', 'node', 'profile', 'cornice', 'light_line'].includes(row.zoneType)) return 2;
      return 1;
    }

    function formatRoomRepairCeilingLayerLabel(layer = 1) {
      const safeLayer = Math.max(1, Math.min(ROOM_REPAIR_MAX_CEILING_LAYERS, Number(layer || 1)));
      return safeLayer === 1 ? 'Слой 1 · плоскость' : `Слой ${safeLayer} · уровни и узлы`;
    }

    function isRoomRepairCeilingLinearCover(cover = '') {
      return /светов.*лини|led|лед|профил|карниз|ниша|трек|шинопровод|тенев.*профил|парящ.*контур/.test(normalizeRoomRepairBuilderLabel(cover));
    }

    function isRoomRepairCeilingPointCover(cover = '') {
      return /люк|люстр|закладн|платформ|светильник|точеч/.test(normalizeRoomRepairBuilderLabel(cover));
    }

    function isRoomRepairCeilingUpperLayerCover(cover = '') {
      return /многоуровн|гкл|светов.*лини|led|лед|профил|карниз|ниша|трек|шинопровод|тенев|парящ|люк|люстр|закладн|платформ/.test(normalizeRoomRepairBuilderLabel(cover));
    }

    function formatRoomRepairWallZoneLabel(zone = {}) {
      const area = Number(Math.max(0, Number(zone.area || 0)).toFixed(2));
      const zoneLabel = zone.zoneLabel || 'Зона стен';
      const layer = getRoomRepairWallRowLayer(zone);
      const layerPrefix = layer > 1 ? `Слой ${layer} · ` : '';
      const unit = isRoomRepairWallLinearCover(zone.cover) ? 'м.п.' : 'м²';
      return `${formatRoomRepairQtyValue(area)} ${unit} · ${layerPrefix}${zoneLabel}: ${zone.cover || 'Выберите покрытие'}`;
    }

    function getRoomRepairWallZonePassport(row = {}, structuredSelections = []) {
      if (!row.cover) return '';
      const details = getRoomRepairWallZoneDetailMap(structuredSelections, row.id);
      const entries = [
        { label: 'Формат', value: details['Формат покрытия']?.[0]?.value },
        { label: 'Тип', value: details['Тип покрытия']?.[0]?.value },
        { label: 'Класс', value: details['Класс покрытия']?.[0]?.value },
        { label: 'Эффект', value: details['Система / эффект']?.[0]?.value },
        { label: 'Размер', value: details['Размер покрытия']?.[0]?.value },
        { label: 'Цвет', value: details['Цветовая гамма']?.[0]?.value },
        { label: 'Фактура', value: details['Фактура']?.[0]?.value },
        { label: 'Защита', value: details['Защитный финиш']?.[0]?.value },
        { label: 'Финиш', value: details['Финиш профиля']?.[0]?.value },
        { label: 'Монтаж', value: details['Способ монтажа / нанесения']?.[0]?.value }
      ].filter(entry => entry.value);
      return entries.length ? entries : '';
    }

    function formatRoomRepairCeilingZoneLabel(zone = {}) {
      const qty = Number(Math.max(0, Number(zone.area || 0)).toFixed(2));
      const zoneLabel = zone.zoneLabel || 'Зона потолка';
      const layer = getRoomRepairCeilingRowLayer(zone);
      const layerPrefix = layer > 1 ? `Слой ${layer} · ` : '';
      const unit = isRoomRepairCeilingPointCover(zone.cover) || zone.zoneType === 'point'
        ? 'шт.'
        : (isRoomRepairCeilingLinearCover(zone.cover) || ['line', 'profile', 'cornice', 'light_line'].includes(zone.zoneType) ? 'м.п.' : 'м²');
      return `${formatRoomRepairQtyValue(qty)} ${unit} · ${layerPrefix}${zoneLabel}: ${zone.cover || 'Выберите решение'}`;
    }

    function getRoomRepairCeilingZonePassport(row = {}, structuredSelections = []) {
      if (!row.cover) return '';
      const details = getRoomRepairCeilingZoneDetailMap(structuredSelections, row.id);
      const entries = [
        { label: 'Тип', value: details['Тип потолка']?.[0]?.value },
        { label: 'Система', value: details['Материал / система']?.[0]?.value },
        { label: 'Фактура', value: details['Фактура / поверхность']?.[0]?.value },
        { label: 'Цвет', value: details['Цветовая гамма']?.[0]?.value },
        { label: 'Монтаж', value: details['Способ монтажа']?.[0]?.value }
      ].filter(entry => entry.value);
      return entries.length ? entries : '';
    }

    function getRoomRepairZoneCompletion(nodeKey = '', row = {}, selectedItems = [], calc = {}, structuredSelections = []) {
      if (!row.cover) {
        return {
          filled: 0,
          total: 0,
          percent: 0,
          missing: [],
          status: 'empty'
        };
      }
      const groups = getRoomRepairRequiredZoneDetailGroups(nodeKey, row, selectedItems, calc, structuredSelections);
      const selections = getRoomRepairZoneDetailSelections(nodeKey, structuredSelections, row.id);
      const selectedLabels = selections.map(selection => getRoomRepairSelectedCoreLabel(selection.label)).filter(Boolean);
      const selectedGroups = selections.map(selection => selection.detailGroup || '').filter(Boolean);
      const backendCompletion = getRoomRepairBackendCompletion(nodeKey, row.cover, selectedLabels, selectedGroups);
      if (backendCompletion) return backendCompletion;
      const missing = groups
        .filter(group => !selections.some(selection => selection.detailGroup === group.label))
        .map(group => group.label);
      const total = groups.length;
      const filled = Math.max(0, total - missing.length);
      const percent = total ? Math.round((filled / total) * 100) : 100;
      return {
        filled,
        total,
        percent,
        missing,
        status: !total ? 'ready' : (percent >= 100 ? 'ready' : (percent > 0 ? 'partial' : 'empty'))
      };
    }

    function getRoomRepairRequiredZoneDetailGroups(nodeKey = '', row = {}, selectedItems = [], calc = {}, structuredSelections = []) {
      if (!row.cover) return [];
      const node = getRoomRepairBuilderNode(nodeKey);
      if (!node) return [];
      const zoneItems = [...(selectedItems || []), row.cover].filter(Boolean);
      const zoneCalc = {
        ...calc,
        structuredSelections,
        activeFloorZoneId: nodeKey === 'finishFloor' ? row.id : '',
        activeWallZoneId: nodeKey === 'finishWalls' ? row.id : '',
        activeCeilingZoneId: nodeKey === 'finishCeiling' ? row.id : '',
        activeFloorZoneCover: nodeKey === 'finishFloor' ? row.cover : calc.activeFloorZoneCover,
        activeWallZoneCover: nodeKey === 'finishWalls' ? row.cover : calc.activeWallZoneCover,
        activeCeilingZoneCover: nodeKey === 'finishCeiling' ? row.cover : calc.activeCeilingZoneCover,
        activeFloorZoneArea: nodeKey === 'finishFloor' ? row.area : calc.activeFloorZoneArea,
        activeWallZoneArea: nodeKey === 'finishWalls' ? row.area : calc.activeWallZoneArea,
        activeCeilingZoneArea: nodeKey === 'finishCeiling' ? row.area : calc.activeCeilingZoneArea,
        activeFloorZoneLabel: nodeKey === 'finishFloor' ? (row.zoneLabel || '') : calc.activeFloorZoneLabel,
        activeWallZoneLabel: nodeKey === 'finishWalls' ? (row.zoneLabel || '') : calc.activeWallZoneLabel,
        activeCeilingZoneLabel: nodeKey === 'finishCeiling' ? (row.zoneLabel || '') : calc.activeCeilingZoneLabel,
        activeFloorZoneHint: nodeKey === 'finishFloor' ? (row.zoneHint || '') : calc.activeFloorZoneHint,
        activeWallZoneHint: nodeKey === 'finishWalls' ? (row.zoneHint || '') : calc.activeWallZoneHint,
        activeCeilingZoneHint: nodeKey === 'finishCeiling' ? (row.zoneHint || '') : calc.activeCeilingZoneHint
      };
      const selectedLabels = getRoomRepairBackendSelectedOptionLabels(nodeKey, zoneCalc);
      const selectedGroups = getRoomRepairBackendSelectedGroupLabels(nodeKey, zoneCalc);
      const requiredLabels = getRoomRepairBackendRequiredDetailLabels(nodeKey, row.cover, selectedLabels, selectedGroups)
        || getRoomRepairRequiredDetailGroups(nodeKey);
      return getRoomRepairBuilderVisibleDetailGroups(node, zoneItems, zoneCalc)
        .filter(group => requiredLabels.includes(group.label));
    }

    function renderRoomRepairZoneCompletionBar(completion = {}) {
      const percent = Number(Math.max(0, Math.min(100, completion.percent || 0)).toFixed(0));
      return `
        <span class="room-repair-zone-completion is-${escapeRoomRepairHtml(completion.status || 'empty')}">
          <span>
            <i style="width: ${percent}%"></i>
          </span>
          <em>${completion.total ? `${completion.filled}/${completion.total} · ${percent}%` : 'ожидает выбора'}</em>
        </span>
      `;
    }

    function renderRoomRepairZonePassportBadge(nodeKey = '', row = {}, completion = {}) {
      if (!row.cover) return '';
      return `
        <div class="room-repair-zone-passport-row" onclick="event.stopPropagation()">
          <button type="button" class="room-repair-zone-passport-badge is-${escapeRoomRepairHtml(completion.status || 'empty')}" onclick="openRoomRepairCoverPassportPanel('${escapeRoomRepairJsString(nodeKey)}', '${escapeRoomRepairJsString(row.id)}', event)">
            <i class="fas fa-id-card-clip"></i>
            Паспорт
          </button>
          ${completion.missing?.length ? `<small>Заполнить: ${escapeRoomRepairHtml(completion.missing.slice(0, 2).join(', '))}${completion.missing.length > 2 ? ` +${completion.missing.length - 2}` : ''}</small>` : '<small>Спецификация заполнена</small>'}
        </div>
      `;
    }

    function getRoomRepairWallZoneRows(selectedItems = [], calc = {}) {
      const metrics = calc.roomMetrics || getRoomRepairMetrics(calc.room || {});
      const wallsArea = Number(Math.max(0.1, Number(metrics.wallsArea || calc.room?.wallsArea || 1)).toFixed(2));
      const structured = calc.structuredSelections || readRoomRepairDraftStructuredSelections();
      const zoneSelections = getRoomRepairWallZoneSelections(structured);
      let rows = zoneSelections.map((selection, index) => ({
        id: selection.zoneKey || `wall_zone_${index + 1}`,
        cover: selection.zoneCover || (/выберите покрытие/i.test(selection.label) ? '' : getRoomRepairSelectedCoreLabel(selection.label)),
        area: Number(Math.max(0.1, Number(selection.quantity || selection.zoneDefaultQty || wallsArea)).toFixed(2)),
        zoneType: selection.quantitySource || 'custom',
        zoneLabel: selection.zoneLabel || `Покрытие ${index + 1}`,
        zoneHint: selection.zoneHint || '',
        wallLayer: Number(selection.wallLayer || (selection.quantitySource === 'paint_layer' ? 2 : 1)),
        isLayer: Number(selection.wallLayer || 1) > 1 || selection.quantitySource === 'paint_layer',
        linkedZoneId: selection.linkedZoneId || ''
      }));
      const activeLayer = Math.max(1, Math.min(ROOM_REPAIR_MAX_WALL_LAYERS, Number(calc.activeWallLayer || getRoomRepairWallActiveLayer() || 1)));

      if (!rows.length) {
        const primary = getRoomRepairSelectedPrimaryWallCover(selectedItems);
        if (primary) {
          rows = [{
            id: 'wall_zone_1',
            cover: getRoomRepairSelectedCoreLabel(primary),
            area: wallsArea,
            zoneType: 'full',
            zoneLabel: 'Все стены',
            zoneHint: 'Полная площадь стен без запаса',
            wallLayer: 1,
            isLayer: false
          }];
        }
      }

      const baseRows = rows.filter(row => getRoomRepairWallRowLayer(row) === 1);
      const usedArea = baseRows
        .reduce((sum, row) => sum + Number(row.area || 0), 0);
      const remaining = Number(Math.max(0, wallsArea - usedArea).toFixed(2));
      if (activeLayer === 1 && (!baseRows.length || remaining > 0.05)) {
        rows.push({
          id: `wall_zone_${rows.length + 1}`,
          cover: '',
          area: remaining > 0.05 ? remaining : wallsArea,
          zoneType: baseRows.length ? 'remainder' : 'full',
          zoneLabel: baseRows.length ? 'Остаток стен' : 'Все стены',
          zoneHint: baseRows.length ? 'Площадь стен за вычетом выбранных зон' : 'Полная площадь стен без запаса',
          isPlaceholder: true,
          wallLayer: 1,
          isLayer: false
        });
      }
      const hasPaintLayer = rows.some(row => row.zoneType === 'paint_layer' || /покраск|окраск|краск/.test(normalizeRoomRepairBuilderLabel(row.cover)));
      const wallpaperPaintRow = rows.find(row => {
        if (!/обои/.test(normalizeRoomRepairBuilderLabel(row.cover)) || /фотообои/.test(normalizeRoomRepairBuilderLabel(row.cover))) return false;
        const details = getRoomRepairWallZoneDetailSelections(structured, row.id);
        return details.some(selection => selection.detailGroup === 'Формат покрытия'
          && getRoomRepairFloorFormatKeyFromLabel(selection.value || selection.label) === 'wallpaper_paint');
      });
      if (wallpaperPaintRow && !hasPaintLayer) {
        rows.push({
          id: `${wallpaperPaintRow.id}_paint_layer`,
          cover: '',
          area: Number(wallpaperPaintRow.area || wallsArea).toFixed(2),
          zoneType: 'paint_layer',
          zoneLabel: 'Покраска по обоям',
          zoneHint: 'Обязательный финишный слой поверх обоев под покраску',
          isPlaceholder: true,
          isLayer: true,
          wallLayer: 2,
          linkedZoneId: wallpaperPaintRow.id
        });
      }
      const microcementRow = rows.find(row => /микроцемент/.test(normalizeRoomRepairBuilderLabel(row.cover)));
      if (!wallpaperPaintRow && microcementRow && !hasPaintLayer) {
        rows.push({
          id: `${microcementRow.id}_paint_layer`,
          cover: '',
          area: Number(microcementRow.area || wallsArea).toFixed(2),
          zoneType: 'paint_layer',
          zoneLabel: 'Окраска микроцемента',
          zoneHint: 'Опциональный финишный слой поверх микроцемента',
          isPlaceholder: true,
          isLayer: true,
          wallLayer: 2,
          linkedZoneId: microcementRow.id
        });
      }
      const activeLayerRows = rows.filter(row => getRoomRepairWallRowLayer(row) === activeLayer);
      if (activeLayer > 1 && !activeLayerRows.length) {
        rows.push({
          id: `wall_layer_${activeLayer}_zone_1`,
          cover: '',
          area: wallsArea,
          zoneType: 'layer',
          zoneLabel: `Слой ${activeLayer}`,
          zoneHint: 'Дополнительное покрытие поверх основного слоя',
          isPlaceholder: true,
          isLayer: true,
          wallLayer: activeLayer
        });
      }
      return { rows, wallsArea };
    }

    function createRoomRepairWallLayerZoneId(layer = 2, rows = []) {
      const prefix = `wall_layer_${layer}_zone_`;
      const used = new Set((rows || []).map(row => row.id));
      let index = (rows || []).filter(row => getRoomRepairWallRowLayer(row) === layer).length + 1;
      let id = `${prefix}${index}`;
      while (used.has(id)) {
        index += 1;
        id = `${prefix}${index}`;
      }
      return id;
    }

    function getRoomRepairCeilingZoneRows(selectedItems = [], calc = {}) {
      const metrics = calc.roomMetrics || getRoomRepairMetrics(calc.room || {});
      const ceilingArea = Number(Math.max(0.1, Number(metrics.ceilingArea || calc.room?.ceilingArea || calc.room?.area || 1)).toFixed(2));
      const structured = calc.structuredSelections || readRoomRepairDraftStructuredSelections();
      const zoneSelections = getRoomRepairCeilingZoneSelections(structured);
      let rows = zoneSelections.map((selection, index) => ({
        id: selection.zoneKey || `ceiling_zone_${index + 1}`,
        cover: selection.zoneCover || (/выберите/i.test(selection.label) ? '' : getRoomRepairSelectedCoreLabel(selection.label)),
        area: Number(Math.max(0.1, Number(selection.quantity || selection.zoneDefaultQty || ceilingArea)).toFixed(2)),
        zoneType: selection.quantitySource || 'custom',
        zoneLabel: selection.zoneLabel || `Решение ${index + 1}`,
        zoneHint: selection.zoneHint || '',
        ceilingLayer: Number(selection.ceilingLayer || 1),
        isLayer: Number(selection.ceilingLayer || 1) > 1,
        linkedZoneId: selection.linkedZoneId || ''
      }));
      const activeLayer = Math.max(1, Math.min(ROOM_REPAIR_MAX_CEILING_LAYERS, Number(calc.activeCeilingLayer || getRoomRepairCeilingActiveLayer() || 1)));

      if (!rows.length) {
        const primary = getRoomRepairSelectedPrimaryCeilingCover(selectedItems);
        if (primary) {
          rows = [{
            id: 'ceiling_zone_1',
            cover: getRoomRepairSelectedCoreLabel(primary),
            area: ceilingArea,
            zoneType: 'full',
            zoneLabel: 'Весь потолок',
            zoneHint: 'Полная площадь потолка без запаса',
            ceilingLayer: 1,
            isLayer: false
          }];
        }
      }

      const baseRows = rows.filter(row => getRoomRepairCeilingRowLayer(row) === 1);
      const usedArea = baseRows
        .filter(row => !isRoomRepairCeilingLinearCover(row.cover) && !isRoomRepairCeilingPointCover(row.cover))
        .reduce((sum, row) => sum + Number(row.area || 0), 0);
      const remaining = Number(Math.max(0, ceilingArea - usedArea).toFixed(2));
      if (activeLayer === 1 && (!baseRows.length || remaining > 0.05)) {
        rows.push({
          id: `ceiling_zone_${rows.length + 1}`,
          cover: '',
          area: remaining > 0.05 ? remaining : ceilingArea,
          zoneType: baseRows.length ? 'remainder' : 'full',
          zoneLabel: baseRows.length ? 'Остаток потолка' : 'Весь потолок',
          zoneHint: baseRows.length ? 'Площадь потолка за вычетом выбранных зон' : 'Полная площадь потолка без запаса',
          isPlaceholder: true,
          ceilingLayer: 1,
          isLayer: false
        });
      }
      const activeLayerRows = rows.filter(row => getRoomRepairCeilingRowLayer(row) === activeLayer);
      if (activeLayer > 1 && !activeLayerRows.length) {
        rows.push({
          id: `ceiling_layer_${activeLayer}_zone_1`,
          cover: '',
          area: ceilingArea,
          zoneType: 'layer',
          zoneLabel: `Слой ${activeLayer}`,
          zoneHint: 'Дополнительный уровень или узел потолка',
          isPlaceholder: true,
          isLayer: true,
          ceilingLayer: activeLayer
        });
      }
      return { rows, ceilingArea };
    }

    function createRoomRepairCeilingLayerZoneId(layer = 2, rows = []) {
      const prefix = `ceiling_layer_${layer}_zone_`;
      const used = new Set((rows || []).map(row => row.id));
      let index = (rows || []).filter(row => getRoomRepairCeilingRowLayer(row) === layer).length + 1;
      let id = `${prefix}${index}`;
      while (used.has(id)) {
        index += 1;
        id = `${prefix}${index}`;
      }
      return id;
    }

    function getRoomRepairWallZoneTypeOptions(wallsArea = 1, usedBefore = 0, currentArea = 0) {
      const remainingWithCurrent = Math.max(0.1, wallsArea - usedBefore);
      return [
        { value: 'full', label: 'Все стены', area: wallsArea, hint: 'Полная площадь стен без запаса' },
        { value: 'accent', label: 'Акцентная стена', area: Math.min(remainingWithCurrent, Math.max(3, wallsArea * 0.22)), hint: 'Декоративная или выделенная стена' },
        { value: 'tv', label: 'ТВ-зона', area: Math.min(remainingWithCurrent, Math.max(4, wallsArea * 0.16)), hint: 'Стена с ТВ или медиа-зоной' },
        { value: 'headboard', label: 'Изголовье', area: Math.min(remainingWithCurrent, Math.max(4, wallsArea * 0.14)), hint: 'Зона за кроватью' },
        { value: 'wet', label: 'Мокрая зона', area: Math.min(remainingWithCurrent, Math.max(4, wallsArea * 0.25)), hint: 'Влажная зона, фартук или примыкания' },
        { value: 'work', label: 'Рабочая зона', area: Math.min(remainingWithCurrent, Math.max(3, wallsArea * 0.14)), hint: 'Рабочее место или кухонный фартук' },
        { value: 'custom', label: 'Своя зона', area: currentArea || remainingWithCurrent, hint: 'Укажите площадь вручную' },
        { value: 'layer', label: 'Слой поверх', area: currentArea || wallsArea, hint: 'Дополнительный слой поверх выбранной площади' },
        { value: 'paint_layer', label: 'Покраска финишным слоем', area: currentArea || wallsArea, hint: 'Слой поверх выбранного покрытия, не вычитает площадь из остатка' },
        { value: 'remainder', label: 'Остаток стен', area: remainingWithCurrent, hint: 'Незаполненная часть стен' }
      ];
    }

    function getRoomRepairFloorZoneTypeOptions(floorArea = 1, usedBefore = 0, currentArea = 0) {
      const remainingWithCurrent = Math.max(0.1, floorArea - usedBefore);
      return [
        { value: 'full', label: 'Вся комната', area: floorArea, hint: 'Полный объем пола комнаты' },
        { value: 'work', label: 'Рабочая зона', area: Math.min(remainingWithCurrent, Math.max(2, floorArea * 0.22)), hint: 'Кухонная, учебная или рабочая зона' },
        { value: 'furniture', label: 'Зона мебели', area: Math.min(remainingWithCurrent, Math.max(2, floorArea * 0.18)), hint: 'Встроенная мебель, шкафы, примыкания' },
        { value: 'custom', label: 'Своя зона', area: currentArea || remainingWithCurrent, hint: 'Укажите площадь вручную' },
        { value: 'remainder', label: 'Остаток', area: remainingWithCurrent, hint: 'Незаполненная часть пола' }
      ];
    }

    function getRoomRepairCeilingZoneTypeOptions(ceilingArea = 1, usedBefore = 0, currentArea = 0, cover = '') {
      const remainingWithCurrent = Math.max(0.1, ceilingArea - usedBefore);
      const defaultLine = Math.max(2, Math.sqrt(Number(ceilingArea || 1)) * 2);
      const defaultPerimeter = Math.max(4, Math.sqrt(Number(ceilingArea || 1)) * 4);
      const isLinear = isRoomRepairCeilingLinearCover(cover);
      const isPoint = isRoomRepairCeilingPointCover(cover);
      return [
        { value: 'full', label: 'Весь потолок', area: ceilingArea, hint: 'Полная площадь потолка без запаса' },
        { value: 'zone', label: 'Часть потолка', area: Math.min(remainingWithCurrent, Math.max(3, ceilingArea * 0.35)), hint: 'Отдельная зона или уровень потолка' },
        { value: 'accent', label: 'Акцентная зона', area: Math.min(remainingWithCurrent, Math.max(2, ceilingArea * 0.18)), hint: 'Декоративная часть потолка' },
        { value: 'line', label: 'Линия / контур', area: isLinear ? (currentArea || defaultLine) : defaultLine, hint: 'Линейный узел: LED, профиль, контур' },
        { value: 'perimeter', label: 'Периметр', area: currentArea || defaultPerimeter, hint: 'Профиль, карниз или теневой узел по периметру' },
        { value: 'point', label: 'Точка / штуки', area: isPoint ? (currentArea || 1) : 1, hint: 'Люк, люстра или точечный узел' },
        { value: 'layer', label: 'Слой / уровень', area: currentArea || ceilingArea, hint: 'Дополнительный уровень поверх основной плоскости' },
        { value: 'custom', label: 'Своя зона', area: currentArea || (isLinear ? defaultLine : (isPoint ? 1 : remainingWithCurrent)), hint: 'Укажите объем вручную' },
        { value: 'remainder', label: 'Остаток потолка', area: remainingWithCurrent, hint: 'Незаполненная часть потолка' }
      ];
    }

    function roomRepairCssEscape(value = '') {
      if (window.CSS?.escape) return CSS.escape(String(value || ''));
      return String(value || '').replace(/["\\]/g, '\\$&');
    }

    function getRoomRepairFloorZoneAccent(index = 0, row = {}) {
      const palette = [
        { start: '#f59e0b', end: '#b45309', text: '#92400e', soft: 'rgba(245, 158, 11, 0.12)' },
        { start: '#10b981', end: '#047857', text: '#047857', soft: 'rgba(16, 185, 129, 0.12)' },
        { start: '#38bdf8', end: '#0369a1', text: '#0369a1', soft: 'rgba(56, 189, 248, 0.12)' },
        { start: '#a855f7', end: '#6d28d9', text: '#6d28d9', soft: 'rgba(168, 85, 247, 0.12)' },
        { start: '#f43f5e', end: '#be123c', text: '#be123c', soft: 'rgba(244, 63, 94, 0.12)' },
        { start: '#14b8a6', end: '#0f766e', text: '#0f766e', soft: 'rgba(20, 184, 166, 0.12)' },
        { start: '#6366f1', end: '#3730a3', text: '#3730a3', soft: 'rgba(99, 102, 241, 0.12)' }
      ];
      if (!row.cover) return { start: '#cbd5e1', end: '#94a3b8', text: '#64748b', soft: 'rgba(148, 163, 184, 0.14)' };
      return palette[index % palette.length];
    }

    function renderRoomRepairFloorZoneBalance(rows = [], floorArea = 0, activeZoneId = '', surfaceLabel = 'Пол') {
      const totalArea = Number(floorArea || 0);
      if (!totalArea) return '';
      const isWallSurface = surfaceLabel === 'Стены';
      const isCeilingSurface = surfaceLabel === 'Потолок';
      const balanceRows = isWallSurface
        ? rows.filter(row => getRoomRepairWallRowLayer(row) === 1)
        : (isCeilingSurface
          ? rows.filter(row => getRoomRepairCeilingRowLayer(row) === 1 && !isRoomRepairCeilingLinearCover(row.cover) && !isRoomRepairCeilingPointCover(row.cover))
          : rows);
      const selectFn = isWallSurface ? 'selectRoomRepairWallZone' : (isCeilingSurface ? 'selectRoomRepairCeilingZone' : 'selectRoomRepairFloorZone');
      const coveredArea = balanceRows.filter(row => row.cover).reduce((sum, row) => sum + Number(row.area || 0), 0);
      const usedArea = balanceRows.reduce((sum, row) => sum + Number(row.area || 0), 0);
      const leftArea = Math.max(0, totalArea - coveredArea);
      const coveredPercent = Math.max(0, Math.min(100, (coveredArea / totalArea) * 100));
      const rowSegments = balanceRows
        .filter(row => Number(row.area || 0) > 0.01)
        .map((row, index) => {
          const area = Number(row.area || 0);
          const percent = Math.max(0.5, Math.min(100, (area / totalArea) * 100));
          const accent = getRoomRepairFloorZoneAccent(index, row);
          const label = row.cover || 'Остаток без покрытия';
          const zoneLabel = row.zoneLabel || `Покрытие ${index + 1}`;
          const title = `${zoneLabel}: ${label} · ${formatRoomRepairQtyValue(area)} м²`;
          return `
            <button type="button"
              class="room-repair-floor-balance-segment ${row.id === activeZoneId ? 'is-active' : ''} ${row.cover ? 'has-cover' : 'is-empty'}"
              style="flex-basis:${percent.toFixed(2)}%; --zone-start:${accent.start}; --zone-end:${accent.end}; --zone-text:${accent.text}; --zone-soft:${accent.soft};"
              title="${escapeRoomRepairHtml(title)}"
              onclick="${selectFn}('${escapeRoomRepairJsString(row.id)}')">
              <span>${escapeRoomRepairHtml(formatRoomRepairQtyValue(percent))}%</span>
            </button>
          `;
        }).join('');
      const legend = balanceRows
        .filter(row => Number(row.area || 0) > 0.01)
        .map((row, index) => {
          const accent = getRoomRepairFloorZoneAccent(index, row);
          const percent = Math.max(0, Math.min(100, (Number(row.area || 0) / totalArea) * 100));
          return `
            <button type="button"
              class="room-repair-floor-balance-chip ${row.id === activeZoneId ? 'is-active' : ''}"
              style="--zone-start:${accent.start}; --zone-end:${accent.end}; --zone-text:${accent.text}; --zone-soft:${accent.soft};"
              onclick="${selectFn}('${escapeRoomRepairJsString(row.id)}')">
              <i></i>
              <span>${escapeRoomRepairHtml(row.cover || 'Остаток')}</span>
              <strong>${formatRoomRepairQtyValue(row.area)} м² · ${formatRoomRepairQtyValue(percent)}%</strong>
            </button>
          `;
        }).join('');
      const statusLabel = coveredArea >= totalArea - 0.05
        ? `${surfaceLabel} распределен${surfaceLabel === 'Стены' ? 'ы' : ''} полностью`
        : `Осталось выбрать ${formatRoomRepairQtyValue(leftArea)} м²`;
      const surfaceGenitive = surfaceLabel === 'Стены' ? 'стен' : (surfaceLabel === 'Потолок' ? 'потолка' : 'пола');
      return `
        <div class="room-repair-floor-balance" aria-label="Контроль распределения площади ${surfaceGenitive}">
          <div class="room-repair-floor-balance-head">
            <span>Контроль остатков</span>
            <strong>${formatRoomRepairQtyValue(coveredPercent)}% покрытия</strong>
            <em>${escapeRoomRepairHtml(statusLabel)}</em>
          </div>
          <div class="room-repair-floor-balance-track" role="list" aria-label="Распределение 100% ${surfaceGenitive}">
            ${rowSegments}
          </div>
          <div class="room-repair-floor-balance-legend">
            ${legend}
          </div>
          ${usedArea > totalArea + 0.05 ? `<small>Площадь зон превышает площадь ${surfaceGenitive} на ${formatRoomRepairQtyValue(usedArea - totalArea)} м².</small>` : ''}
        </div>
      `;
    }

    function renderRoomRepairFloorZoneWorkspace(node, selectedItems = [], calc = {}) {
      const { rows, floorArea } = getRoomRepairFloorZoneRows(selectedItems, calc);
      const shell = getRoomRepairDraftShell();
      const activeZone = shell?.dataset.activeFloorZone || rows[0]?.id || 'floor_zone_1';
      const activeRow = rows.find(row => row.id === activeZone) || rows[0] || {};
      const coversOpen = shell?.dataset.floorCoverPickerOpen === 'true';
      const hasFilledCards = rows.some(row => row.cover);
      const coverToggleState = coversOpen ? 'is-open' : (activeRow.cover ? 'has-cover' : 'is-empty');
      const structuredSelections = calc.structuredSelections || readRoomRepairDraftStructuredSelections();
      const coverButtons = (node.options || []).map((option, index) => {
        const optionText = getRoomRepairBuilderOptionText(option);
        const isActiveCover = normalizeRoomRepairBuilderLabel(activeRow.cover || '') === normalizeRoomRepairBuilderLabel(optionText);
        return `
          <button type="button" class="room-repair-floor-cover-choice ${isActiveCover ? 'is-active' : ''}" onclick="setRoomRepairFloorZoneCover(${index})">
            <span>${escapeRoomRepairHtml(optionText)}</span>
            <i class="fas ${isActiveCover ? 'fa-check' : 'fa-plus'}"></i>
          </button>
        `;
      }).join('');
      let usedBefore = 0;
      const cards = rows.map((row, index) => {
        const typeOptions = getRoomRepairFloorZoneTypeOptions(floorArea, usedBefore, row.area);
        const maxArea = Number(Math.max(0.1, floorArea - usedBefore).toFixed(2));
        usedBefore += Number(row.area || 0);
        const isActive = row.id === activeRow.id;
        const completion = getRoomRepairZoneCompletion('finishFloor', row, selectedItems, calc, structuredSelections);
        return `
          <article class="room-repair-floor-zone-card ${isActive ? 'is-active' : ''} ${row.cover ? 'has-cover' : 'is-empty'}" data-floor-zone-card="${escapeRoomRepairHtml(row.id)}" data-floor-zone-cover="${escapeRoomRepairHtml(row.cover || '')}">
            <button type="button" class="room-repair-floor-zone-main" onclick="selectRoomRepairFloorZone('${escapeRoomRepairJsString(row.id)}')">
              <span class="room-repair-floor-zone-index">${String(index + 1).padStart(2, '0')}</span>
              <span class="room-repair-floor-zone-body">
                <em>${escapeRoomRepairHtml(row.zoneLabel || `Покрытие ${index + 1}`)}</em>
                <strong>${escapeRoomRepairHtml(row.cover || 'Выберите покрытие')}</strong>
                <small>${escapeRoomRepairHtml(row.zoneHint || 'Площадь зоны без запаса')}</small>
                ${renderRoomRepairZoneCompletionBar(completion)}
              </span>
              <span class="room-repair-floor-zone-state"><i class="fas ${row.cover ? 'fa-check' : 'fa-arrow-pointer'}"></i></span>
            </button>
            ${renderRoomRepairZonePassportBadge('finishFloor', row, completion)}
            <div class="room-repair-floor-zone-controls" onclick="event.stopPropagation()">
              <label>
                <span>Зона</span>
                <select data-floor-zone-type="${escapeRoomRepairHtml(row.id)}" onchange="updateRoomRepairFloorZoneType('${escapeRoomRepairJsString(row.id)}')">
                  ${typeOptions.map(option => `<option value="${option.value}" data-area="${option.area}" data-label="${escapeRoomRepairHtml(option.label)}" data-hint="${escapeRoomRepairHtml(option.hint)}" ${option.value === row.zoneType ? 'selected' : ''}>${escapeRoomRepairHtml(option.label)}</option>`).join('')}
                </select>
              </label>
              <label>
                <span>Площадь, м²</span>
                <input type="number" min="0.1" max="${maxArea}" step="0.1" value="${Number(row.area || 0).toFixed(2)}" data-floor-zone-area="${escapeRoomRepairHtml(row.id)}" oninput="syncRoomRepairFloorZonesFromCards(false)" onchange="syncRoomRepairFloorZonesFromCards(true)">
              </label>
              <span class="room-repair-zone-card-actions">
                <button type="button" title="Очистить карточку" onclick="clearRoomRepairZoneCard('finishFloor', '${escapeRoomRepairJsString(row.id)}')"><i class="fas fa-eraser"></i></button>
                <button type="button" title="Удалить крайнюю карточку" onclick="deleteRoomRepairZoneCard('finishFloor', '${escapeRoomRepairJsString(row.id)}')"><i class="fas fa-trash"></i></button>
              </span>
            </div>
          </article>
        `;
      }).join('');

      return `
        <div class="room-repair-builder-workspace" data-builder-workspace>
          <div class="room-repair-builder-workspace-head">
            <div>
              <span>${escapeRoomRepairHtml(node.groupLabel || 'Чистовая отделка')}</span>
              <h4><i class="fas ${node.icon}"></i>${escapeRoomRepairHtml(node.label)}</h4>
              <p>Выберите покрытие для активной карточки. Если зона меньше пола комнаты, остаток появится отдельной карточкой.</p>
            </div>
            <div class="room-repair-workspace-actions">
              <button type="button" class="room-repair-floor-cover-toggle ${coverToggleState}" onclick="openRoomRepairFloorCoverPicker()">
                <i class="fas ${coversOpen ? 'fa-layer-group' : 'fa-layer-group'}"></i>
                ${coversOpen ? 'Покрытия открыты' : 'Выбрать покрытие'}
              </button>
              <button type="button" class="room-repair-section-clear ${hasFilledCards ? 'has-items' : 'is-empty'}" onclick="clearRoomRepairSection('${node.section}')" title="${hasFilledCards ? 'Очистить выбранные покрытия пола' : 'Покрытия пола пока не заполнены'}">
                <i class="fas fa-eraser"></i>
                Очистить блок
              </button>
            </div>
          </div>
          ${coversOpen ? `
            <div class="room-repair-floor-cover-drawer">
              <div class="room-repair-floor-cover-drawer-head">
                <div>
                  <div>Покрытия пола</div>
                  <p>Выбор применится к активной подсвеченной карточке.</p>
                </div>
                <button type="button" class="room-repair-cover-drawer-close" onclick="toggleRoomRepairFloorCoverPicker()"><i class="fas fa-chevron-up"></i>Скрыть покрытия</button>
              </div>
              <div class="room-repair-floor-cover-grid">
                ${coverButtons}
              </div>
            </div>
          ` : ''}
          <div class="room-repair-floor-zone-shell">
            <section>
              ${renderRoomRepairFloorZoneBalance(rows, floorArea, activeRow.id)}
              <div class="room-repair-floor-zone-grid">
                ${cards}
              </div>
              <div class="room-repair-floor-zone-total">
                <span>Заполнено</span>
                <strong>${formatRoomRepairQtyValue(rows.filter(row => row.cover).reduce((sum, row) => sum + Number(row.area || 0), 0))} м² / ${formatRoomRepairQtyValue(floorArea)} м²</strong>
                <small>Площади вводятся без запаса, запас применяется только в материалах.</small>
              </div>
              ${renderRoomRepairBuilderDetailPanel(node, activeRow.cover ? [...selectedItems, activeRow.cover] : selectedItems, {
                ...calc,
                activeFloorZoneArea: activeRow.area,
                activeFloorZoneId: activeRow.id,
                activeFloorZoneCover: activeRow.cover,
                activeFloorZoneLabel: activeRow.zoneLabel,
                activeFloorZoneHint: activeRow.zoneHint
              })}
            </section>
          </div>
        </div>
      `;
    }

    function renderRoomRepairWallZoneWorkspace(node, selectedItems = [], calc = {}) {
      const shell = getRoomRepairDraftShell();
      const activeLayer = getRoomRepairWallActiveLayer();
      const { rows, wallsArea } = getRoomRepairWallZoneRows(selectedItems, { ...calc, activeWallLayer: activeLayer });
      let visibleRows = rows.filter(row => getRoomRepairWallRowLayer(row) === activeLayer);
      if (!visibleRows.length) {
        visibleRows = [{
          id: activeLayer > 1 ? `wall_layer_${activeLayer}_zone_1` : 'wall_zone_1',
          cover: '',
          area: wallsArea,
          zoneType: activeLayer > 1 ? 'layer' : 'full',
          zoneLabel: activeLayer > 1 ? `Слой ${activeLayer}` : 'Все стены',
          zoneHint: activeLayer > 1 ? 'Дополнительное покрытие поверх основного слоя' : 'Полная площадь стен без запаса',
          isPlaceholder: true,
          isLayer: activeLayer > 1,
          wallLayer: activeLayer
        }];
      }
      const activeZone = shell?.dataset.activeWallZone || visibleRows[0]?.id || 'wall_zone_1';
      const activeRow = visibleRows.find(row => row.id === activeZone) || visibleRows[0] || {};
      const coversOpen = shell?.dataset.wallCoverPickerOpen === 'true';
      const hasFilledCards = rows.some(row => row.cover);
      const coverToggleState = coversOpen ? 'is-open' : (activeRow.cover ? 'has-cover' : 'is-empty');
      const structuredSelections = calc.structuredSelections || readRoomRepairDraftStructuredSelections();
      const usedLayers = Array.from(new Set(rows.filter(row => row.cover || getRoomRepairWallRowLayer(row) === activeLayer).map(getRoomRepairWallRowLayer)))
        .filter(layer => layer >= 1 && layer <= ROOM_REPAIR_MAX_WALL_LAYERS)
        .sort((a, b) => a - b);
      if (!usedLayers.includes(1)) usedLayers.unshift(1);
      const canAddLayer = usedLayers.length < ROOM_REPAIR_MAX_WALL_LAYERS;
      const layerTabs = usedLayers.map(layer => {
        const count = rows.filter(row => getRoomRepairWallRowLayer(row) === layer && row.cover).length;
        return `
          <button type="button" class="room-repair-wall-layer-tab ${layer === activeLayer ? 'is-active' : ''}" onclick="selectRoomRepairWallLayer(${layer})">
            <span>${escapeRoomRepairHtml(formatRoomRepairWallLayerLabel(layer))}</span>
            <em>${count || 'пусто'}</em>
          </button>
        `;
      }).join('');
      const layerAreaTotal = visibleRows
        .filter(row => row.cover && !isRoomRepairWallLinearCover(row.cover))
        .reduce((sum, row) => sum + Number(row.area || 0), 0);
      const layerLinearTotal = visibleRows
        .filter(row => row.cover && isRoomRepairWallLinearCover(row.cover))
        .reduce((sum, row) => sum + Number(row.area || 0), 0);
      const coverButtons = (node.options || []).map((option, index) => {
        const optionText = getRoomRepairBuilderOptionText(option);
        const isActiveCover = normalizeRoomRepairBuilderLabel(activeRow.cover || '') === normalizeRoomRepairBuilderLabel(optionText);
        return `
          <button type="button" class="room-repair-floor-cover-choice ${isActiveCover ? 'is-active' : ''}" onclick="setRoomRepairWallZoneCover(${index})">
            <span>${escapeRoomRepairHtml(optionText)}</span>
            <i class="fas ${isActiveCover ? 'fa-check' : 'fa-plus'}"></i>
          </button>
        `;
      }).join('');
      let usedBefore = 0;
      const cards = visibleRows.map((row, index) => {
        const typeOptions = getRoomRepairWallZoneTypeOptions(wallsArea, usedBefore, row.area);
        const isLayer = row.zoneType === 'paint_layer' || row.isLayer;
        const isLinear = isRoomRepairWallLinearCover(row.cover);
        const maxArea = Number(Math.max(0.1, isLinear ? 300 : (isLayer ? wallsArea : (wallsArea - usedBefore))).toFixed(2));
        if (!isLayer && !isLinear) usedBefore += Number(row.area || 0);
        const isActive = row.id === activeRow.id;
        const completion = getRoomRepairZoneCompletion('finishWalls', row, selectedItems, { ...calc, activeWallLayer: activeLayer }, structuredSelections);
        return `
          <article class="room-repair-floor-zone-card ${isActive ? 'is-active' : ''} ${row.cover ? 'has-cover' : 'is-empty'} ${isLayer ? 'is-layer' : ''}" data-wall-zone-card="${escapeRoomRepairHtml(row.id)}" data-wall-zone-cover="${escapeRoomRepairHtml(row.cover || '')}" data-wall-layer="${activeLayer}" data-wall-linked-zone="${escapeRoomRepairHtml(row.linkedZoneId || '')}">
            <button type="button" class="room-repair-floor-zone-main" onclick="selectRoomRepairWallZone('${escapeRoomRepairJsString(row.id)}')">
              <span class="room-repair-floor-zone-index">${activeLayer}.${index + 1}</span>
              <span class="room-repair-floor-zone-body">
                <em>${escapeRoomRepairHtml(row.zoneLabel || `Покрытие ${index + 1}`)}</em>
                <strong>${escapeRoomRepairHtml(row.cover || 'Выберите покрытие')}</strong>
                <small>${escapeRoomRepairHtml(row.zoneHint || (isLayer ? 'Слой поверх выбранной зоны стен' : 'Площадь зоны стен без запаса'))}</small>
                ${renderRoomRepairZoneCompletionBar(completion)}
              </span>
              <span class="room-repair-floor-zone-state"><i class="fas ${row.cover ? 'fa-check' : 'fa-arrow-pointer'}"></i></span>
            </button>
            ${renderRoomRepairZonePassportBadge('finishWalls', row, completion)}
            <div class="room-repair-floor-zone-controls" onclick="event.stopPropagation()">
              <label>
                <span>Зона</span>
                <select data-wall-zone-type="${escapeRoomRepairHtml(row.id)}" onchange="updateRoomRepairWallZoneType('${escapeRoomRepairJsString(row.id)}')">
                  ${typeOptions.map(option => `<option value="${option.value}" data-area="${option.area}" data-label="${escapeRoomRepairHtml(option.label)}" data-hint="${escapeRoomRepairHtml(option.hint)}" ${option.value === row.zoneType ? 'selected' : ''}>${escapeRoomRepairHtml(option.label)}</option>`).join('')}
                </select>
              </label>
              <label>
                <span>${isLinear ? 'Длина, м.п.' : 'Площадь, м²'}</span>
                <input type="number" min="0.1" max="${maxArea}" step="0.1" value="${Number(row.area || 0).toFixed(2)}" data-wall-zone-area="${escapeRoomRepairHtml(row.id)}" oninput="syncRoomRepairWallZonesFromCards(false)" onchange="syncRoomRepairWallZonesFromCards(true)">
              </label>
              <span class="room-repair-zone-card-actions">
                <button type="button" title="Очистить карточку" onclick="clearRoomRepairZoneCard('finishWalls', '${escapeRoomRepairJsString(row.id)}')"><i class="fas fa-eraser"></i></button>
                <button type="button" title="${activeLayer > 1 ? 'Удалить карточку' : 'Удалить крайнюю карточку'}" onclick="deleteRoomRepairZoneCard('finishWalls', '${escapeRoomRepairJsString(row.id)}')"><i class="fas fa-trash"></i></button>
              </span>
            </div>
          </article>
        `;
      }).join('');

      return `
        <div class="room-repair-builder-workspace" data-builder-workspace>
          <div class="room-repair-builder-workspace-head">
            <div>
              <span>${escapeRoomRepairHtml(node.groupLabel || 'Чистовая отделка')}</span>
              <h4><i class="fas ${node.icon}"></i>${escapeRoomRepairHtml(node.label)}</h4>
              <p>Выберите покрытие для активной карточки. Если зона меньше площади стен, остаток появится отдельной карточкой.</p>
            </div>
            <div class="room-repair-workspace-actions">
              <button type="button" class="room-repair-floor-cover-toggle ${coverToggleState}" onclick="openRoomRepairWallCoverPicker()">
                <i class="fas fa-layer-group"></i>
                ${coversOpen ? 'Покрытия открыты' : 'Выбрать покрытие'}
              </button>
              <button type="button" class="room-repair-section-clear ${hasFilledCards ? 'has-items' : 'is-empty'}" onclick="clearRoomRepairSection('${node.section}')" title="${hasFilledCards ? 'Очистить выбранные покрытия стен' : 'Покрытия стен пока не заполнены'}">
                <i class="fas fa-eraser"></i>
                Очистить блок
              </button>
            </div>
          </div>
          <div class="room-repair-wall-layer-tabs">
            ${layerTabs}
            ${canAddLayer ? `<button type="button" class="room-repair-wall-layer-tab is-add" onclick="addRoomRepairWallLayer()"><i class="fas fa-plus"></i><span>Добавить слой</span><em>до ${ROOM_REPAIR_MAX_WALL_LAYERS}</em></button>` : ''}
          </div>
          ${activeLayer > 1 ? `
            <div class="room-repair-wall-layer-tools">
              <div>
                <span>${escapeRoomRepairHtml(formatRoomRepairWallLayerLabel(activeLayer))}</span>
                <strong>${visibleRows.filter(row => row.cover).length || 'пусто'} покрытий</strong>
                <small>${formatRoomRepairQtyValue(layerAreaTotal)} м²${layerLinearTotal ? ` · ${formatRoomRepairQtyValue(layerLinearTotal)} м.п.` : ''} поверх основного слоя</small>
              </div>
              <button type="button" onclick="addRoomRepairWallLayerCard(${activeLayer})">
                <i class="fas fa-plus"></i>
                Добавить покрытие в слой
              </button>
            </div>
          ` : ''}
          ${coversOpen ? `
            <div class="room-repair-floor-cover-drawer">
              <div class="room-repair-floor-cover-drawer-head">
                <div>
                  <div>Покрытия стен</div>
                  <p>Выбор применится к активной подсвеченной карточке.</p>
                </div>
                <button type="button" class="room-repair-cover-drawer-close" onclick="toggleRoomRepairWallCoverPicker()"><i class="fas fa-chevron-up"></i>Скрыть покрытия</button>
              </div>
              <div class="room-repair-floor-cover-grid">
                ${coverButtons}
              </div>
            </div>
          ` : ''}
          <div class="room-repair-floor-zone-shell">
            <section>
              ${renderRoomRepairFloorZoneBalance(rows, wallsArea, activeRow.id, 'Стены')}
              <div class="room-repair-floor-zone-grid">
                ${cards}
              </div>
              <div class="room-repair-floor-zone-total">
                <span>Распределено</span>
                <strong>${formatRoomRepairQtyValue(rows.filter(row => row.cover && getRoomRepairWallRowLayer(row) === 1).reduce((sum, row) => sum + Number(row.area || 0), 0))} м² / ${formatRoomRepairQtyValue(wallsArea)} м²</strong>
                <small>Площади стен указываются без коэффициента запаса. Слои покраски по обоям считаются отдельно и не занимают остаток.</small>
              </div>
            </section>
            <section>
              ${renderRoomRepairBuilderDetailPanel(node, activeRow.cover ? [...selectedItems, activeRow.cover] : selectedItems, {
                ...calc,
                activeWallZoneArea: activeRow.area,
                activeWallZoneId: activeRow.id,
                activeWallZoneCover: activeRow.cover,
                activeWallZoneLabel: activeRow.zoneLabel,
                activeWallZoneHint: activeRow.zoneHint
              })}
            </section>
          </div>
        </div>
      `;
    }

    function renderRoomRepairCeilingZoneWorkspace(node, selectedItems = [], calc = {}) {
      const shell = getRoomRepairDraftShell();
      const activeLayer = getRoomRepairCeilingActiveLayer();
      const { rows, ceilingArea } = getRoomRepairCeilingZoneRows(selectedItems, { ...calc, activeCeilingLayer: activeLayer });
      const visibleRows = rows.filter(row => getRoomRepairCeilingRowLayer(row) === activeLayer);
      const activeZone = shell?.dataset.activeCeilingZone || visibleRows[0]?.id || 'ceiling_zone_1';
      const activeRow = visibleRows.find(row => row.id === activeZone) || visibleRows[0] || rows[0] || {};
      const coversOpen = shell?.dataset.ceilingCoverPickerOpen === 'true';
      const hasFilledCards = rows.some(row => row.cover);
      const coverToggleState = coversOpen ? 'is-open' : (activeRow.cover ? 'has-cover' : 'is-empty');
      const structuredSelections = calc.structuredSelections || readRoomRepairDraftStructuredSelections();
      const layers = Array.from(new Set([
        1,
        activeLayer,
        ...rows.filter(row => row.cover || getRoomRepairCeilingRowLayer(row) === activeLayer).map(getRoomRepairCeilingRowLayer)
      ])).filter(layer => layer >= 1 && layer <= ROOM_REPAIR_MAX_CEILING_LAYERS).sort((a, b) => a - b);
      const canAddLayer = layers.length < ROOM_REPAIR_MAX_CEILING_LAYERS;
      const layerTabs = layers.map(layer => {
        const layerRows = rows.filter(row => getRoomRepairCeilingRowLayer(row) === layer && row.cover);
        const layerArea = layerRows
          .filter(row => !isRoomRepairCeilingLinearCover(row.cover) && !isRoomRepairCeilingPointCover(row.cover))
          .reduce((sum, row) => sum + Number(row.area || 0), 0);
        const layerLinear = layerRows.filter(row => isRoomRepairCeilingLinearCover(row.cover)).reduce((sum, row) => sum + Number(row.area || 0), 0);
        const layerPoints = layerRows.filter(row => isRoomRepairCeilingPointCover(row.cover)).reduce((sum, row) => sum + Number(row.area || 0), 0);
        return `
          <button type="button" class="room-repair-wall-layer-tab ${layer === activeLayer ? 'is-active' : ''}" onclick="selectRoomRepairCeilingLayer(${layer})">
            <span>${escapeRoomRepairHtml(formatRoomRepairCeilingLayerLabel(layer))}</span>
            <strong>${layerRows.length || 'пусто'}</strong>
            <em>${formatRoomRepairQtyValue(layerArea)} м²${layerLinear ? ` · ${formatRoomRepairQtyValue(layerLinear)} м.п.` : ''}${layerPoints ? ` · ${formatRoomRepairQtyValue(layerPoints)} шт.` : ''}</em>
          </button>
        `;
      }).join('');
      const coverButtons = (node.options || []).map((option, index) => {
        const optionText = getRoomRepairBuilderOptionText(option);
        const isActiveCover = normalizeRoomRepairBuilderLabel(activeRow.cover || '') === normalizeRoomRepairBuilderLabel(optionText);
        return `
          <button type="button" class="room-repair-floor-cover-choice ${isActiveCover ? 'is-active' : ''}" onclick="setRoomRepairCeilingZoneCover(${index})">
            <span>${escapeRoomRepairHtml(optionText)}</span>
            <i class="fas ${isActiveCover ? 'fa-check' : 'fa-plus'}"></i>
          </button>
        `;
      }).join('');
      let usedBefore = 0;
      const cards = visibleRows.map((row, index) => {
        const isLinear = isRoomRepairCeilingLinearCover(row.cover) || ['line', 'profile', 'cornice', 'light_line', 'perimeter'].includes(row.zoneType);
        const isPoint = isRoomRepairCeilingPointCover(row.cover) || row.zoneType === 'point';
        const isLayer = row.isLayer || getRoomRepairCeilingRowLayer(row) > 1;
        const typeOptions = getRoomRepairCeilingZoneTypeOptions(ceilingArea, usedBefore, row.area, row.cover);
        const maxArea = Number(Math.max(0.1, isPoint ? 100 : (isLinear ? 500 : (isLayer ? ceilingArea : (ceilingArea - usedBefore)))).toFixed(2));
        if (!isLayer && !isLinear && !isPoint) usedBefore += Number(row.area || 0);
        const isActive = row.id === activeRow.id;
        const completion = getRoomRepairZoneCompletion('finishCeiling', row, selectedItems, { ...calc, activeCeilingLayer: activeLayer }, structuredSelections);
        return `
          <article class="room-repair-floor-zone-card is-ceiling ${isActive ? 'is-active' : ''} ${row.cover ? 'has-cover' : 'is-empty'} ${isLayer ? 'is-layer' : ''} ${isLinear ? 'is-linear' : ''} ${isPoint ? 'is-point' : ''}" data-ceiling-zone-card="${escapeRoomRepairHtml(row.id)}" data-ceiling-zone-cover="${escapeRoomRepairHtml(row.cover || '')}" data-ceiling-layer="${activeLayer}" data-ceiling-linked-zone="${escapeRoomRepairHtml(row.linkedZoneId || '')}">
            <button type="button" class="room-repair-floor-zone-main" onclick="selectRoomRepairCeilingZone('${escapeRoomRepairJsString(row.id)}')">
              <span class="room-repair-floor-zone-index">${activeLayer}.${index + 1}</span>
              <span class="room-repair-floor-zone-body">
                <em>${escapeRoomRepairHtml(row.zoneLabel || `Решение ${index + 1}`)}</em>
                <strong>${escapeRoomRepairHtml(row.cover || 'Выберите решение')}</strong>
                <small>${escapeRoomRepairHtml(row.zoneHint || (isLinear ? 'Линейный узел потолка' : (isPoint ? 'Точечный узел потолка' : 'Площадь потолочной зоны без запаса')))}</small>
                ${renderRoomRepairZoneCompletionBar(completion)}
              </span>
              <span class="room-repair-floor-zone-state"><i class="fas ${row.cover ? 'fa-check' : 'fa-arrow-pointer'}"></i></span>
            </button>
            ${renderRoomRepairZonePassportBadge('finishCeiling', row, completion)}
            <div class="room-repair-floor-zone-controls" onclick="event.stopPropagation()">
              <label>
                <span>Тип объема</span>
                <select data-ceiling-zone-type="${escapeRoomRepairHtml(row.id)}" onchange="updateRoomRepairCeilingZoneType('${escapeRoomRepairJsString(row.id)}')">
                  ${typeOptions.map(option => `<option value="${option.value}" data-area="${option.area}" data-label="${escapeRoomRepairHtml(option.label)}" data-hint="${escapeRoomRepairHtml(option.hint)}" ${option.value === row.zoneType ? 'selected' : ''}>${escapeRoomRepairHtml(option.label)}</option>`).join('')}
                </select>
              </label>
              <label>
                <span>${isPoint ? 'Количество, шт.' : (isLinear ? 'Длина, м.п.' : 'Площадь, м²')}</span>
                <input type="number" min="0.1" max="${maxArea}" step="0.1" value="${Number(row.area || 0).toFixed(2)}" data-ceiling-zone-area="${escapeRoomRepairHtml(row.id)}" oninput="syncRoomRepairCeilingZonesFromCards(false)" onchange="syncRoomRepairCeilingZonesFromCards(true)">
              </label>
              <span class="room-repair-zone-card-actions">
                <button type="button" title="Очистить карточку" onclick="clearRoomRepairZoneCard('finishCeiling', '${escapeRoomRepairJsString(row.id)}')"><i class="fas fa-eraser"></i></button>
                <button type="button" title="${activeLayer > 1 ? 'Удалить карточку' : 'Удалить крайнюю карточку'}" onclick="deleteRoomRepairZoneCard('finishCeiling', '${escapeRoomRepairJsString(row.id)}')"><i class="fas fa-trash"></i></button>
              </span>
            </div>
          </article>
        `;
      }).join('');
      const layerAreaTotal = visibleRows
        .filter(row => row.cover && !isRoomRepairCeilingLinearCover(row.cover) && !isRoomRepairCeilingPointCover(row.cover))
        .reduce((sum, row) => sum + Number(row.area || 0), 0);
      const layerLinearTotal = visibleRows.filter(row => row.cover && isRoomRepairCeilingLinearCover(row.cover)).reduce((sum, row) => sum + Number(row.area || 0), 0);
      const layerPointTotal = visibleRows.filter(row => row.cover && isRoomRepairCeilingPointCover(row.cover)).reduce((sum, row) => sum + Number(row.area || 0), 0);

      return `
        <div class="room-repair-builder-workspace" data-builder-workspace>
          <div class="room-repair-builder-workspace-head">
            <div>
              <span>${escapeRoomRepairHtml(node.groupLabel || 'Чистовая отделка')}</span>
              <h4><i class="fas ${node.icon}"></i>${escapeRoomRepairHtml(node.label)}</h4>
              <p>Соберите потолочную схему: основная плоскость, дополнительные уровни, световые линии, карнизы и точечные узлы.</p>
            </div>
            <div class="room-repair-workspace-actions">
              <button type="button" class="room-repair-floor-cover-toggle ${coverToggleState}" onclick="openRoomRepairCeilingCoverPicker()">
                <i class="fas fa-layer-group"></i>
                ${coversOpen ? 'Решения открыты' : 'Выбрать решение'}
              </button>
              <button type="button" class="room-repair-section-clear ${hasFilledCards ? 'has-items' : 'is-empty'}" onclick="clearRoomRepairSection('${node.section}')" title="${hasFilledCards ? 'Очистить потолочную схему' : 'Потолок пока не заполнен'}">
                <i class="fas fa-eraser"></i>
                Очистить блок
              </button>
            </div>
          </div>
          <div class="room-repair-wall-layer-tabs">
            ${layerTabs}
            ${canAddLayer ? `<button type="button" class="room-repair-wall-layer-tab is-add" onclick="addRoomRepairCeilingLayer()"><i class="fas fa-plus"></i><span>Добавить слой</span><em>до ${ROOM_REPAIR_MAX_CEILING_LAYERS}</em></button>` : ''}
          </div>
          ${activeLayer > 1 ? `
            <div class="room-repair-wall-layer-tools">
              <div>
                <span>${escapeRoomRepairHtml(formatRoomRepairCeilingLayerLabel(activeLayer))}</span>
                <strong>${visibleRows.filter(row => row.cover).length || 'пусто'} карточек</strong>
                <small>${formatRoomRepairQtyValue(layerAreaTotal)} м²${layerLinearTotal ? ` · ${formatRoomRepairQtyValue(layerLinearTotal)} м.п.` : ''}${layerPointTotal ? ` · ${formatRoomRepairQtyValue(layerPointTotal)} шт.` : ''}</small>
              </div>
              <button type="button" onclick="addRoomRepairCeilingLayerCard(${activeLayer})">
                <i class="fas fa-plus"></i>
                Добавить карточку в слой
              </button>
            </div>
          ` : ''}
          ${coversOpen ? `
            <div class="room-repair-floor-cover-drawer">
              <div class="room-repair-floor-cover-drawer-head">
                <div>
                  <div>Решения потолка</div>
                  <p>Выбор применится к активной подсвеченной карточке.</p>
                </div>
                <button type="button" class="room-repair-cover-drawer-close" onclick="toggleRoomRepairCeilingCoverPicker()"><i class="fas fa-chevron-up"></i>Скрыть решения</button>
              </div>
              <div class="room-repair-floor-cover-grid">
                ${coverButtons}
              </div>
            </div>
          ` : ''}
          <div class="room-repair-floor-zone-shell">
            <section>
              ${renderRoomRepairFloorZoneBalance(rows, ceilingArea, activeRow.id, 'Потолок')}
              <div class="room-repair-floor-zone-grid">
                ${cards}
              </div>
              <div class="room-repair-floor-zone-total">
                <span>Слой ${activeLayer}</span>
                <strong>${formatRoomRepairQtyValue(layerAreaTotal)} м²${layerLinearTotal ? ` · ${formatRoomRepairQtyValue(layerLinearTotal)} м.п.` : ''}${layerPointTotal ? ` · ${formatRoomRepairQtyValue(layerPointTotal)} шт.` : ''}</strong>
                <small>Основная плоскость распределяет площадь потолка. Линейные и точечные узлы считаются отдельно и не уменьшают остаток площади.</small>
              </div>
            </section>
            <section>
              ${renderRoomRepairBuilderDetailPanel(node, activeRow.cover ? [...selectedItems, activeRow.cover] : selectedItems, {
                ...calc,
                activeCeilingZoneArea: activeRow.area,
                activeCeilingZoneId: activeRow.id,
                activeCeilingZoneCover: activeRow.cover,
                activeCeilingZoneLabel: activeRow.zoneLabel,
                activeCeilingZoneHint: activeRow.zoneHint,
                activeCeilingLayer: activeLayer
              })}
            </section>
          </div>
        </div>
      `;
    }

    function getRoomRepairBuilderDimensionPreset(node, option, primaryFloorCover, selectedItems = []) {
      if (option?.dimensionUnit === 'm') {
        return {
          length: option.customDimensions ? '' : Number(option.lengthM || 0),
          width: option.customDimensions ? '' : Number(option.widthM || 0),
          unit: 'm',
          readonly: Boolean(option.fixedDimensions),
          custom: Boolean(option.customDimensions)
        };
      }
      const formatKey = getRoomRepairSelectedFloorFormatKey(selectedItems, primaryFloorCover);
      const shapeKey = getRoomRepairSelectedFloorShapeKey(selectedItems, primaryFloorCover);
      const preset = getRoomRepairFloorDimensionPreset(primaryFloorCover, formatKey, shapeKey, option.sizeKey === 'custom' ? 'standard' : (option.sizeKey || 'standard'));
      return { length: preset.length, width: preset.width, unit: 'cm', readonly: false, custom: option.sizeKey === 'custom' };
    }

    function renderRoomRepairBuilderDimensionInputs(node, groupIndex, optionIndex, option, primaryFloorCover, selectedItems = []) {
      if (!option?.dimensions) return '';
      const preset = getRoomRepairBuilderDimensionPreset(node, option, primaryFloorCover, selectedItems);
      const lengthId = `roomRepairBuilderDetailLength_${node.key}_${groupIndex}_${optionIndex}`;
      const widthId = `roomRepairBuilderDetailWidth_${node.key}_${groupIndex}_${optionIndex}`;
      const unitLabel = preset.unit === 'm' ? 'м' : 'см';
      const step = preset.unit === 'm' ? '0.01' : '0.1';
      const min = preset.unit === 'm' ? '0.01' : '1';
      const max = preset.unit === 'm' ? '100' : '5000';
      const readonlyAttr = preset.readonly ? 'readonly aria-readonly="true"' : '';
      const placeholder = preset.custom ? 'Заполните' : '';
      return `
        <span class="room-repair-builder-dimensions ${preset.readonly ? 'is-readonly' : ''} ${preset.custom ? 'is-custom' : ''}" onclick="event.stopPropagation()">
          <label>
            <small>${preset.unit === 'm' ? 'Длина рулона, м' : 'Длина, см'}</small>
            <input id="${lengthId}" type="number" min="${min}" max="${max}" step="${step}" value="${escapeRoomRepairHtml(String(preset.length ?? ''))}" inputmode="decimal" placeholder="${placeholder}" ${readonlyAttr}>
          </label>
          <label>
            <small>${preset.unit === 'm' ? 'Ширина рулона, м' : 'Ширина, см'}</small>
            <input id="${widthId}" type="number" min="${min}" max="${max}" step="${step}" value="${escapeRoomRepairHtml(String(preset.width ?? ''))}" inputmode="decimal" placeholder="${placeholder}" ${readonlyAttr}>
          </label>
          <em>${preset.readonly ? `фиксированный размер, ${unitLabel}` : `размер в ${unitLabel}`}</em>
        </span>
      `;
    }

    function hasRoomRepairSelectedFloorZoneDetail(optionText = '', group = {}, calc = {}) {
      const zoneKey = calc.activeFloorZoneId || '';
      if (!zoneKey) return false;
      const target = normalizeRoomRepairBuilderLabel(optionText);
      if (!target) return false;
      return getRoomRepairFloorZoneDetailSelections(calc.structuredSelections || readRoomRepairDraftStructuredSelections(), zoneKey)
        .some(selection => selection.detailGroup === group.label
          && normalizeRoomRepairBuilderLabel(getRoomRepairSelectedCoreLabel(selection.label)) === target);
    }

    function hasRoomRepairSelectedZoneDetail(nodeKey = '', optionText = '', group = {}, calc = {}) {
      const zoneKey = nodeKey === 'finishWalls'
        ? (calc.activeWallZoneId || '')
        : (nodeKey === 'finishCeiling' ? (calc.activeCeilingZoneId || '') : (calc.activeFloorZoneId || ''));
      if (!zoneKey) return false;
      const target = normalizeRoomRepairBuilderLabel(optionText);
      if (!target) return false;
      return getRoomRepairZoneDetailSelections(nodeKey, calc.structuredSelections || readRoomRepairDraftStructuredSelections(), zoneKey)
        .some(selection => selection.detailGroup === group.label
          && normalizeRoomRepairBuilderLabel(getRoomRepairSelectedCoreLabel(selection.label)) === target);
    }

    function getRoomRepairFloorColorSwatch(optionText = '') {
      const value = normalizeRoomRepairBuilderLabel(optionText);
      const swatches = [
        { pattern: /imperiale|nero oro|черн.*золот/i, style: 'linear-gradient(135deg, #09090b, #1f2937 48%, #d4af37 50%, #6b4f12)' },
        { pattern: /carrara|каррара|marmorino/i, style: 'linear-gradient(135deg, #f8fafc, #e5e7eb 42%, #94a3b8 44%, #ffffff 70%, #cbd5e1)' },
        { pattern: /encausto|granito nero/i, style: 'radial-gradient(circle at 28% 22%, #94a3b8 0 3%, transparent 4%), radial-gradient(circle at 70% 64%, #e5e7eb 0 2%, transparent 3%), linear-gradient(135deg, #111827, #374151)' },
        { pattern: /marbello/i, style: 'linear-gradient(135deg, #64748b, #cbd5e1 46%, #f8fafc 48%, #334155)' },
        { pattern: /малахит|malachite|onice verde|verde/i, style: 'linear-gradient(135deg, #064e3b, #34d399 44%, #e0f2fe 46%, #065f46 72%, #022c22)' },
        { pattern: /onice blu|голуб.*оникс|blu/i, style: 'linear-gradient(135deg, #0f172a, #38bdf8 42%, #e0f2fe 44%, #1d4ed8 70%, #0b1120)' },
        { pattern: /perla|перламутр/i, style: 'linear-gradient(135deg, #fff7ed, #dbeafe 33%, #f5d0fe 66%, #ffffff)' },
        { pattern: /trevignano|travertino|травертин/i, style: 'repeating-linear-gradient(135deg, #efe2c8 0 9px, #c9a873 9px 12px, #fff7ed 12px 22px)' },
        { pattern: /шалф/i, style: 'linear-gradient(135deg, #9aaa86, #5f7556)' },
        { pattern: /олив/i, style: 'linear-gradient(135deg, #6b7050, #3f472a)' },
        { pattern: /пыльно-син|s 4010-r90b/i, style: 'linear-gradient(135deg, #8194a6, #46596b)' },
        { pattern: /винн|3005/i, style: 'linear-gradient(135deg, #641e2c, #2a0d13)' },
        { pattern: /терракот/i, style: 'linear-gradient(135deg, #bf7058, #7c3f2c)' },
        { pattern: /greige|2005-y50r/i, style: 'linear-gradient(135deg, #d5c9bc, #a99a8d)' },
        { pattern: /taupe|4005-y50r/i, style: 'linear-gradient(135deg, #9c8d82, #675b52)' },
        { pattern: /индивидуаль/, style: 'linear-gradient(135deg, #f59e0b, #22c55e 34%, #38bdf8 67%, #a855f7)' },
        { pattern: /терраццо/, style: 'radial-gradient(circle at 25% 30%, #92400e 0 9%, transparent 10%), radial-gradient(circle at 68% 35%, #334155 0 7%, transparent 8%), radial-gradient(circle at 50% 72%, #d97706 0 8%, transparent 9%), #f8fafc' },
        { pattern: /бетон/, style: 'linear-gradient(135deg, #cbd5e1, #64748b)' },
        { pattern: /камень/, style: 'linear-gradient(135deg, #f8fafc, #cbd5e1 45%, #94a3b8 47%, #e2e8f0)' },
        { pattern: /венге/, style: 'linear-gradient(135deg, #1c1008, #3f2415)' },
        { pattern: /орех/, style: 'linear-gradient(135deg, #7c3f18, #b8793f)' },
        { pattern: /ясень/, style: 'linear-gradient(135deg, #f3ead8, #d6c4a8)' },
        { pattern: /дымчат.*дуб/, style: 'linear-gradient(135deg, #9a8f82, #5b5248)' },
        { pattern: /белен.*дуб/, style: 'linear-gradient(135deg, #fff7ed, #d8c7ad)' },
        { pattern: /дуб/, style: 'linear-gradient(135deg, #d7a45f, #8a5529)' },
        { pattern: /темно-коричнев/, style: 'linear-gradient(135deg, #4a250f, #1f1309)' },
        { pattern: /светло-коричнев/, style: 'linear-gradient(135deg, #d9a066, #a1622d)' },
        { pattern: /коричнев/, style: 'linear-gradient(135deg, #8b451d, #5c2f14)' },
        { pattern: /графит/, style: 'linear-gradient(135deg, #475569, #0f172a)' },
        { pattern: /серый/, style: 'linear-gradient(135deg, #e2e8f0, #94a3b8)' },
        { pattern: /бежев/, style: 'linear-gradient(135deg, #f5e6c8, #d2b48c)' },
        { pattern: /кремов/, style: 'linear-gradient(135deg, #fff7d6, #f1dea4)' },
        { pattern: /белый/, style: 'linear-gradient(135deg, #ffffff, #f1f5f9)' }
      ];
      return swatches.find(item => item.pattern.test(value))?.style || '';
    }

    function getRoomRepairColorOptionMeta(option = {}, optionText = '') {
      const code = option.colorCode || (String(optionText).match(/(?:RAL|NCS)\s?[A-Z0-9 -]+/i)?.[0] || '');
      return {
        family: option.colorFamily || 'Цветовая гамма',
        code,
        style: option.colorStyle || getRoomRepairFloorColorSwatch(optionText),
        search: normalizeRoomRepairBuilderLabel(`${optionText} ${option.colorFamily || ''} ${code}`)
      };
    }

    function renderRoomRepairColorPreviewButton(option = {}, optionText = '') {
      const meta = getRoomRepairColorOptionMeta(option, optionText);
      if (!meta.style) return '';
      return `
        <span
          class="room-repair-color-swatch"
          style="background: ${escapeRoomRepairHtml(meta.style)}"
          role="button"
          tabindex="0"
          title="Увеличить цвет"
          onclick="openRoomRepairColorPreview('${escapeRoomRepairJsString(optionText)}', '${escapeRoomRepairJsString(meta.style)}', '${escapeRoomRepairJsString(meta.code)}', '${escapeRoomRepairJsString(meta.family)}', event)"
          onkeydown="if(event.key === 'Enter' || event.key === ' ') { openRoomRepairColorPreview('${escapeRoomRepairJsString(optionText)}', '${escapeRoomRepairJsString(meta.style)}', '${escapeRoomRepairJsString(meta.code)}', '${escapeRoomRepairJsString(meta.family)}', event); }"
        ></span>
      `;
    }

    function filterRoomRepairColorOptions(input, groupId = '') {
      const root = input?.closest?.('.room-repair-builder-detail-options')
        || (groupId ? document.getElementById(groupId) : null)
        || input?.closest?.('.room-repair-builder-detail-group');
      if (!root) return;
      const query = normalizeRoomRepairBuilderLabel(input?.value || '');
      root.querySelectorAll('[data-color-option]').forEach(option => {
        const haystack = option.getAttribute('data-color-search') || normalizeRoomRepairBuilderLabel(option.textContent || '');
        option.hidden = Boolean(query && !haystack.includes(query));
      });
      root.querySelectorAll('[data-color-family]').forEach(family => {
        const hasVisible = Array.from(family.querySelectorAll('[data-color-option]')).some(option => !option.hidden);
        const familySearch = family.getAttribute('data-color-search') || normalizeRoomRepairBuilderLabel(family.textContent || '');
        family.hidden = Boolean(query && !hasVisible && !familySearch.includes(query));
      });
    }

    window.filterRoomRepairColorOptions = filterRoomRepairColorOptions;

    function openRoomRepairColorPreview(label = '', style = '', code = '', family = '', event = null) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (!style) return;
      let preview = document.getElementById('roomRepairColorPreview');
      if (!preview) {
        preview = document.createElement('div');
        preview.id = 'roomRepairColorPreview';
        document.body.appendChild(preview);
      }
      const internetQuery = encodeURIComponent([label.replace(/^Цвет:\s*/i, ''), code].filter(Boolean).join(' '));
      preview.className = 'room-repair-color-preview is-open';
      preview.innerHTML = `
        <div class="room-repair-color-preview-backdrop" onclick="closeRoomRepairColorPreview()"></div>
        <section class="room-repair-color-preview-card" role="dialog" aria-modal="true" aria-label="Просмотр цвета">
          <button type="button" class="room-repair-color-preview-close" onclick="closeRoomRepairColorPreview()" aria-label="Закрыть"><i class="fas fa-times"></i></button>
          <div class="room-repair-color-preview-sample" style="background: ${escapeRoomRepairHtml(style)}"></div>
          <div class="room-repair-color-preview-body">
            <span>${escapeRoomRepairHtml(family || 'Цветовая гамма')}</span>
            <strong>${escapeRoomRepairHtml(label.replace(/^Цвет:\s*/i, ''))}</strong>
            ${code ? `<em>${escapeRoomRepairHtml(code)}</em>` : ''}
            <a href="https://www.google.com/search?q=${internetQuery}" target="_blank" rel="noopener">Найти оттенок в интернете</a>
          </div>
        </section>
      `;
    }

    window.openRoomRepairColorPreview = openRoomRepairColorPreview;

    function closeRoomRepairColorPreview() {
      const preview = document.getElementById('roomRepairColorPreview');
      if (preview) preview.remove();
    }

    window.closeRoomRepairColorPreview = closeRoomRepairColorPreview;

    function getRoomRepairBuilderDetailAccordionKey(nodeKey = '', zoneKey = '', groupLabel = '') {
      return `detail:${nodeKey}:${zoneKey || 'global'}:${groupLabel}`;
    }

    function getRoomRepairActiveZoneIdForNode(nodeKey = '') {
      const shell = getRoomRepairDraftShell();
      if (nodeKey === 'finishWalls') return shell?.dataset.activeWallZone || '';
      if (nodeKey === 'finishFloor') return shell?.dataset.activeFloorZone || '';
      if (nodeKey === 'finishCeiling') return shell?.dataset.activeCeilingZone || '';
      return '';
    }

    function setRoomRepairBuilderDetailProgress(nodeKey = '', zoneKey = '', completedGroupLabel = '') {
      const shell = getRoomRepairDraftShell();
      if (!shell || !nodeKey) return;
      const node = getRoomRepairBuilderNode(nodeKey);
      if (!node) return;
      const { room } = getRoomRepairDraftContext();
      const sections = collectRoomRepairDraftSections();
      const structuredSelections = readRoomRepairDraftStructuredSelections();
      const selectedItems = sections[node.section] || [];
      const rows = getRoomRepairRowsForZoneAction(nodeKey);
      const activeRow = rows.find(row => row.id === zoneKey);
      const calc = {
        sections,
        structuredSelections,
        room,
        roomMetrics: room ? getRoomRepairMetrics(room) : {},
        activeBuilderNode: nodeKey,
        activeFloorZoneId: nodeKey === 'finishFloor' ? zoneKey : '',
        activeWallZoneId: nodeKey === 'finishWalls' ? zoneKey : '',
        activeCeilingZoneId: nodeKey === 'finishCeiling' ? zoneKey : '',
        activeFloorZoneCover: nodeKey === 'finishFloor' ? (activeRow?.cover || '') : '',
        activeWallZoneCover: nodeKey === 'finishWalls' ? (activeRow?.cover || '') : '',
        activeCeilingZoneCover: nodeKey === 'finishCeiling' ? (activeRow?.cover || '') : ''
      };
      const groups = getRoomRepairBuilderVisibleDetailGroups(node, selectedItems, calc);
      if (!groups.length) return;
      const openGroups = parseRoomRepairBuilderOpenGroups(shell.dataset.builderOpenGroups || '');
      const closedGroups = parseRoomRepairBuilderOpenGroups(shell.dataset.builderClosedGroups || '');
      const detailKeys = groups.map(group => getRoomRepairBuilderDetailAccordionKey(nodeKey, zoneKey, group.label || ''));
      detailKeys.forEach(key => {
        openGroups.delete(key);
        closedGroups.add(key);
      });
      const zoneSelections = getRoomRepairZoneDetailSelections(nodeKey, structuredSelections, zoneKey);
      const nextGroup = groups.find(group => !zoneSelections.some(selection => selection.detailGroup === group.label));
      if (nextGroup) {
        const nextKey = getRoomRepairBuilderDetailAccordionKey(nodeKey, zoneKey, nextGroup.label || '');
        openGroups.add(nextKey);
        closedGroups.delete(nextKey);
      } else if (completedGroupLabel) {
        const completedKey = getRoomRepairBuilderDetailAccordionKey(nodeKey, zoneKey, completedGroupLabel);
        closedGroups.add(completedKey);
      }
      shell.dataset.builderOpenGroups = Array.from(openGroups).join(',');
      shell.dataset.builderClosedGroups = Array.from(closedGroups).join(',');
    }

    function ensureRoomRepairSingleDetailDefaults(nodeKey = '') {
      if (!isRoomRepairZoneCoverNode(nodeKey)) return false;
      const shell = getRoomRepairDraftShell();
      if (!shell) return false;
      const zoneKey = getRoomRepairActiveZoneIdForNode(nodeKey);
      if (!zoneKey) return false;
      const node = getRoomRepairBuilderNode(nodeKey);
      const textarea = document.querySelector(`[data-repair-section="${node?.section || ''}"]`);
      if (!node || !textarea) return false;
      const { room } = getRoomRepairDraftContext();
      const sections = collectRoomRepairDraftSections();
      const structuredSelections = readRoomRepairDraftStructuredSelections();
      const selectedItems = sections[node.section] || [];
      const rows = getRoomRepairRowsForZoneAction(nodeKey);
      const activeRow = rows.find(row => row.id === zoneKey);
      const activeCover = activeRow?.cover || (nodeKey === 'finishWalls'
        ? getRoomRepairSelectedPrimaryWallCover(selectedItems)
        : (nodeKey === 'finishCeiling'
          ? getRoomRepairSelectedPrimaryCeilingCover(selectedItems)
          : getRoomRepairSelectedPrimaryFloorCover(selectedItems)));
      if (!activeCover) return false;
      const calc = {
        sections,
        structuredSelections,
        room,
        roomMetrics: room ? getRoomRepairMetrics(room) : {},
        activeBuilderNode: nodeKey,
        activeFloorZoneId: nodeKey === 'finishFloor' ? zoneKey : '',
        activeWallZoneId: nodeKey === 'finishWalls' ? zoneKey : '',
        activeCeilingZoneId: nodeKey === 'finishCeiling' ? zoneKey : '',
        activeFloorZoneCover: nodeKey === 'finishFloor' ? activeCover : '',
        activeWallZoneCover: nodeKey === 'finishWalls' ? activeCover : '',
        activeCeilingZoneCover: nodeKey === 'finishCeiling' ? activeCover : '',
        activeFloorZoneLabel: nodeKey === 'finishFloor' ? (activeRow?.zoneLabel || '') : '',
        activeWallZoneLabel: nodeKey === 'finishWalls' ? (activeRow?.zoneLabel || '') : '',
        activeCeilingZoneLabel: nodeKey === 'finishCeiling' ? (activeRow?.zoneLabel || '') : '',
        activeFloorZoneHint: nodeKey === 'finishFloor' ? (activeRow?.zoneHint || '') : '',
        activeWallZoneHint: nodeKey === 'finishWalls' ? (activeRow?.zoneHint || '') : '',
        activeCeilingZoneHint: nodeKey === 'finishCeiling' ? (activeRow?.zoneHint || '') : ''
      };
      let changed = false;
      let nextStructured = structuredSelections;
      let nextItems = splitRoomRepairSectionTextarea(textarea.value);
      const requiredGroups = getRoomRepairRequiredDetailGroups(nodeKey);
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const nextSections = { ...sections, [node.section]: nextItems };
        const nextSelectedItems = nextSections[node.section] || [];
        const nextCalc = { ...calc, sections: nextSections, structuredSelections: nextStructured };
        const groups = getRoomRepairBuilderVisibleDetailGroups(node, activeCover ? [...nextSelectedItems, activeCover] : nextSelectedItems, nextCalc);
        const group = groups.find(item => requiredGroups.includes(item.label)
          && !nextStructured.some(selection =>
            selection.nodeKey === nodeKey
            && selection.source === 'detail'
            && selection.zoneKey === zoneKey
            && selection.detailGroup === item.label
          ));
        if (!group) break;
        if (group.choiceMode !== 'single' || group.options.length !== 1) break;
        const option = group.options[0]?.option;
        const label = getRoomRepairBuilderOptionText(option);
        if (!label) break;
        if (!nextItems.includes(label)) nextItems.push(label);
        nextStructured = [
          ...nextStructured.filter(selection => !(selection.nodeKey === nodeKey && selection.source === 'detail' && selection.zoneKey === zoneKey && selection.detailGroup === group.label)),
          createRoomRepairBuilderStructuredSelection(node, label, {
            source: 'detail',
            detailGroup: group.label,
            zoneKey,
            zoneLabel: nodeKey === 'finishWalls' ? (calc.activeWallZoneLabel || '') : (nodeKey === 'finishCeiling' ? (calc.activeCeilingZoneLabel || '') : (calc.activeFloorZoneLabel || '')),
            zoneHint: nodeKey === 'finishWalls' ? (calc.activeWallZoneHint || '') : (nodeKey === 'finishCeiling' ? (calc.activeCeilingZoneHint || '') : (calc.activeFloorZoneHint || '')),
            ceilingLayer: nodeKey === 'finishCeiling' ? getRoomRepairCeilingRowLayer(activeRow || {}) : 0
          })
        ];
        changed = true;
      }
      if (!changed) return false;
      textarea.value = nextItems.slice(0, 32).join('\n');
      setRoomRepairDraftStructuredSelections(nextStructured);
      setRoomRepairBuilderDetailProgress(nodeKey, zoneKey, '');
      return true;
    }

    function getRoomRepairDetailGroupSummary(group = {}, calc = {}, nodeKey = '') {
      if (!group?.label) return 'Не заполнено';
      const zoneKey = nodeKey === 'finishWalls'
        ? (calc.activeWallZoneId || '')
        : (nodeKey === 'finishCeiling' ? (calc.activeCeilingZoneId || '') : (calc.activeFloorZoneId || ''));
      const selections = zoneKey
        ? getRoomRepairZoneDetailSelections(nodeKey, calc.structuredSelections || readRoomRepairDraftStructuredSelections(), zoneKey)
        : normalizeRoomRepairStructuredSelections(calc.structuredSelections || readRoomRepairDraftStructuredSelections());
      const groupSelections = selections.filter(selection => selection.detailGroup === group.label);
      if (!groupSelections.length) return 'Не заполнено';
      return groupSelections
        .map(selection => getRoomRepairSelectedCoreLabel(selection.label).replace(/^(Формат|Тип|Форма|Размер|Цвет|Фактура|Класс|Раппорт|Система|Финиш):\s*/i, ''))
        .filter(Boolean)
        .slice(0, 2)
        .join(', ') + (groupSelections.length > 2 ? ` +${groupSelections.length - 2}` : '');
    }

    function isRoomRepairDetailGroupRequired(groupLabel = '') {
      return getRoomRepairRequiredFloorDetailGroups().includes(groupLabel);
    }

    function renderRoomRepairBuilderDetailOptionHtml({ node, group, option, optionIndex, calc, selectedItems, activeZoneId, primaryFloorCover, isZoneNode, isColorGroup }) {
      const optionText = getRoomRepairBuilderOptionText(option);
      const rule = getRoomRepairBuilderWorkRule(node.section, optionText);
      const quantity = getRoomRepairBuilderQuantityConfig(node, option, rule, calc, group);
      const inputId = `roomRepairBuilderDetailQty_${node.key}_${group.groupIndex}_${optionIndex}`;
      const zoneId = `roomRepairBuilderDetailZone_${node.key}_${group.groupIndex}_${optionIndex}`;
      const defaultQty = quantity ? (parseFloat(String(optionText).replace(',', '.')) || Number(quantity.value || quantity.defaultValue || 1)) : 0;
      const zoneOptions = quantity?.zoneOptions || [];
      const isAdded = isZoneNode && activeZoneId
        ? hasRoomRepairSelectedZoneDetail(node.key, optionText, group, calc)
        : hasRoomRepairSelectedOption(selectedItems, optionText);
      const isReadOnlyDefault = isZoneNode && group.choiceMode === 'single' && group.options.length === 1;
      const colorMeta = isColorGroup ? getRoomRepairColorOptionMeta(option, optionText) : null;
      const visualStyle = option?.visualStyle || '';
      const colorAttrs = colorMeta
        ? `data-color-option data-color-family-name="${escapeRoomRepairHtml(colorMeta.family)}" data-color-search="${escapeRoomRepairHtml(colorMeta.search)}"`
        : '';
      return `
        <span class="room-repair-builder-detail-option ${isColorGroup ? 'is-color-option' : ''} ${isAdded || isReadOnlyDefault ? 'is-added' : ''} ${isReadOnlyDefault ? 'is-readonly' : ''}" ${colorAttrs}>
          <button type="button" ${isReadOnlyDefault ? 'disabled' : `onclick="addRoomRepairBuilderDetail('${node.key}', ${group.groupIndex}, ${optionIndex})"`}>
            <i class="fas ${isAdded || isReadOnlyDefault ? 'fa-check' : 'fa-plus'}"></i>
            ${isColorGroup ? renderRoomRepairColorPreviewButton(option, optionText) : ''}
            ${!isColorGroup && visualStyle ? renderRoomRepairColorPreviewButton({ colorStyle: visualStyle, colorFamily: group.label || 'Каталог', colorCode: '' }, optionText) : ''}
            <span class="room-repair-color-option-text">
              <strong>${escapeRoomRepairHtml(optionText)}</strong>
              ${colorMeta?.code ? `<small>${escapeRoomRepairHtml(colorMeta.code)}</small>` : ''}
            </span>
          </button>
          ${isReadOnlyDefault ? '<em class="room-repair-builder-default-note">по умолчанию</em>' : ''}
          ${quantity ? `
            <span class="room-repair-builder-qty" onclick="event.stopPropagation()">
              ${zoneOptions.length ? `
                <select id="${zoneId}" aria-label="Зона расчета" onchange="updateRoomRepairBuilderDetailZoneQty('${node.key}', ${group.groupIndex}, ${optionIndex})">
                  ${zoneOptions.map(zone => `<option value="${escapeRoomRepairHtml(zone.key)}" data-qty="${zone.qty}" title="${escapeRoomRepairHtml(zone.hint || '')}" ${zone.key === quantity.zoneKey ? 'selected' : ''}>${escapeRoomRepairHtml(zone.label)}</option>`).join('')}
                </select>
              ` : ''}
              <input id="${inputId}" type="number" min="${quantity.min || 0.1}" max="${quantity.max || 200}" step="${quantity.step || 0.1}" value="${defaultQty}" inputmode="decimal">
              <em>${escapeRoomRepairHtml(quantity.label || 'шт.')}</em>
            </span>
          ` : ''}
          ${renderRoomRepairBuilderDimensionInputs(node, group.groupIndex, optionIndex, option, primaryFloorCover, selectedItems)}
        </span>
      `;
    }

    function renderRoomRepairBuilderDetailOptionsHtml({ node, group, calc, selectedItems, activeZoneId, primaryFloorCover, isZoneNode, isColorGroup }) {
      const entries = group.options || [];
      if (!isColorGroup) {
        return entries.map(({ option, optionIndex }) => renderRoomRepairBuilderDetailOptionHtml({
          node, group, option, optionIndex, calc, selectedItems, activeZoneId, primaryFloorCover, isZoneNode, isColorGroup
        })).join('');
      }
      const families = entries.reduce((acc, entry) => {
        const optionText = getRoomRepairBuilderOptionText(entry.option);
        const meta = getRoomRepairColorOptionMeta(entry.option, optionText);
        const key = meta.family || 'Цветовая гамма';
        if (!acc.has(key)) acc.set(key, { title: key, entries: [], search: normalizeRoomRepairBuilderLabel(key) });
        const family = acc.get(key);
        family.entries.push(entry);
        family.search = `${family.search} ${meta.search}`;
        return acc;
      }, new Map());
      return Array.from(families.values()).map(family => `
        <section class="room-repair-color-family" data-color-family data-color-search="${escapeRoomRepairHtml(family.search)}">
          <div class="room-repair-color-family-head">
            <strong>${escapeRoomRepairHtml(family.title)}</strong>
            <span>${family.entries.length} ${family.entries.length === 1 ? 'цвет' : 'цвета'}</span>
          </div>
          <div class="room-repair-color-family-grid">
            ${family.entries.map(({ option, optionIndex }) => renderRoomRepairBuilderDetailOptionHtml({
              node, group, option, optionIndex, calc, selectedItems, activeZoneId, primaryFloorCover, isZoneNode, isColorGroup
            })).join('')}
          </div>
        </section>
      `).join('');
    }

    function renderRoomRepairBuilderDetailPanel(node, selectedItems = [], calc = {}) {
      if (!node?.detailGroups?.length) return '';
      const isZoneNode = isRoomRepairZoneCoverNode(node.key);
      const zoneConfig = getRoomRepairZoneNodeConfig(node.key);
      const activeZoneId = node.key === 'finishWalls'
        ? (calc.activeWallZoneId || '')
        : (node.key === 'finishCeiling' ? (calc.activeCeilingZoneId || '') : (calc.activeFloorZoneId || ''));
      const primaryFloorCover = isZoneNode ? zoneConfig.primaryCover(selectedItems) : '';
      if (isZoneNode && !primaryFloorCover) {
        return `
        <div class="room-repair-builder-detail-panel is-muted">
          <div class="room-repair-builder-detail-head">
            <span>Детализация появится после выбора покрытия</span>
            <strong>Сначала выберите покрытие активной карточки. После этого здесь будут уточнения именно для него.</strong>
          </div>
        </div>
      `;
      }
      const groups = getRoomRepairBuilderVisibleDetailGroups(node, selectedItems, calc);
      if (!groups.length) return '';
      const shell = getRoomRepairDraftShell();
      const openGroups = parseRoomRepairBuilderOpenGroups(calc.openBuilderGroups || shell?.dataset.builderOpenGroups || '');
      const closedGroups = parseRoomRepairBuilderOpenGroups(calc.closedBuilderGroups || shell?.dataset.builderClosedGroups || '');
      const requiredGroups = getRoomRepairRequiredDetailGroups(node.key);
      const firstMissingRequired = isZoneNode
        ? groups.find(group => requiredGroups.includes(group.label) && !getRoomRepairZoneDetailSelections(node.key, calc.structuredSelections || readRoomRepairDraftStructuredSelections(), activeZoneId).some(selection => selection.detailGroup === group.label))
        : null;
      const detailGroupKeys = groups.map(group => getRoomRepairBuilderDetailAccordionKey(node.key, activeZoneId, group.label || ''));
      const hasManualDetailState = detailGroupKeys.some(key => openGroups.has(key) || closedGroups.has(key));
      return `
        <div class="room-repair-builder-detail-panel">
          <div class="room-repair-builder-detail-head">
            <span>${isZoneNode ? `Детализация для: ${escapeRoomRepairHtml(primaryFloorCover)}` : 'Детализация выбранного решения'}</span>
            <strong>Уточните объем, формат, способ укладки и дополнительные опции.</strong>
          </div>
          <div class="room-repair-builder-detail-groups">
            ${groups.map(group => {
              const accordionKey = getRoomRepairBuilderDetailAccordionKey(node.key, activeZoneId, group.label || '');
              const isRequired = isZoneNode && requiredGroups.includes(group.label);
              const isFilled = !isRequired || getRoomRepairZoneDetailSelections(node.key, calc.structuredSelections || readRoomRepairDraftStructuredSelections(), activeZoneId).some(selection => selection.detailGroup === group.label);
              const isOpen = openGroups.has(accordionKey)
                ? true
                : (closedGroups.has(accordionKey)
                  ? false
                  : (!hasManualDetailState && firstMissingRequired
                ? group.label === firstMissingRequired.label
                    : (isRequired && !isFilled)));
              const summary = getRoomRepairDetailGroupSummary(group, calc, node.key);
              const isColorGroup = group.label === 'Цветовая гамма';
              const colorGroupId = `roomRepairColorGroup_${String(accordionKey).replace(/[^\w-]/g, '_')}`;
              return `
              <section class="room-repair-builder-detail-group ${isOpen ? 'is-open' : 'is-collapsed'} ${isRequired ? 'is-required' : ''} ${isFilled ? 'is-filled' : 'is-missing'}">
                <button type="button" class="room-repair-builder-detail-group-head" onclick="toggleRoomRepairBuilderDetailGroup('${escapeRoomRepairJsString(accordionKey)}', ${isOpen ? 'true' : 'false'})">
                  <span>
                    <i class="fas ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>
                    ${escapeRoomRepairHtml(group.label || 'Детализация')}
                  </span>
                  <em>${escapeRoomRepairHtml(summary)}</em>
                </button>
                ${isOpen ? `<div class="room-repair-builder-detail-options ${isColorGroup ? 'is-color-palette' : ''}" ${isColorGroup ? `id="${escapeRoomRepairHtml(colorGroupId)}"` : ''}>
                  ${isColorGroup ? `
                    <label class="room-repair-color-search">
                      <i class="fas fa-magnifying-glass"></i>
                      <input type="search" placeholder="Найти цвет, код RAL/NCS или эффект" oninput="filterRoomRepairColorOptions(this, '${escapeRoomRepairJsString(colorGroupId)}')">
                    </label>
                  ` : ''}
                  ${renderRoomRepairBuilderDetailOptionsHtml({
                    node,
                    group,
                    calc,
                    selectedItems,
                    activeZoneId,
                    primaryFloorCover,
                    isZoneNode,
                    isColorGroup
                  })}
                </div>` : ''}
              </section>
            `;
            }).join('')}
          </div>
        </div>
      `;
    }

    function renderRoomRepairBuilderWorkspace(calc) {
      const activeNode = getRoomRepairBuilderNode(getRoomRepairBuilderActiveNodeKey(calc));
      const selectedItems = splitRoomRepairSectionTextarea(getRoomRepairModalSectionValue(calc, activeNode.section));
      const config = getRoomRepairSectionConfig().find(item => item.key === activeNode.section) || {};
      const visibleOptions = getRoomRepairBuilderVisibleOptions(activeNode, calc);
      if (activeNode.key === 'finishFloor') {
        return renderRoomRepairFloorZoneWorkspace(activeNode, selectedItems, calc);
      }
      if (activeNode.key === 'finishWalls') {
        return renderRoomRepairWallZoneWorkspace(activeNode, selectedItems, calc);
      }
      if (activeNode.key === 'finishCeiling') {
        return renderRoomRepairCeilingZoneWorkspace(activeNode, selectedItems, calc);
      }
      return `
        <div class="room-repair-builder-workspace" data-builder-workspace>
          <div class="room-repair-builder-workspace-head">
            <div>
              <span>${escapeRoomRepairHtml(activeNode.groupLabel || 'Раздел')}</span>
              <h4><i class="fas ${activeNode.icon}"></i>${escapeRoomRepairHtml(activeNode.label)}</h4>
              <p>${escapeRoomRepairHtml(activeNode.hint || config.hint || '')}</p>
            </div>
            <button type="button" onclick="clearRoomRepairSection('${activeNode.section}')">
              <i class="fas fa-eraser"></i>
              Очистить блок
            </button>
          </div>
          <div class="room-repair-builder-options">
            ${visibleOptions.length
              ? visibleOptions.map(({ option, index }) => renderRoomRepairBuilderOptionCard(activeNode, option, index, selectedItems, calc)).join('')
              : '<div class="room-repair-builder-empty-options">Для выбранного типа комнаты здесь нет подходящих готовых решений. Можно выбрать другой блок или добавить свою позицию ниже.</div>'}
          </div>
          ${renderRoomRepairBuilderDetailPanel(activeNode, selectedItems, calc)}
          <details class="room-repair-builder-manual">
            <summary>Своя позиция текстом <small>необязательно</small></summary>
            <label>
              <span>Если нужной работы нет в карточках</span>
              <textarea data-builder-manual="${activeNode.section}" rows="3" placeholder="${escapeRoomRepairHtml(config.placeholder || '')}" oninput="syncRoomRepairBuilderManual('${activeNode.section}', this.value)">${escapeRoomRepairHtml(getRoomRepairModalSectionValue(calc, activeNode.section))}</textarea>
            </label>
          </details>
        </div>
      `;
    }

    function renderRoomRepairBuilderSelectedSummary(calc) {
      return getRoomRepairSectionConfig().map(config => {
        const items = splitRoomRepairSectionTextarea(getRoomRepairModalSectionValue(calc, config.key));
        return `
          <div class="room-repair-selected-card ${items.length ? 'has-items' : ''}" data-builder-summary-section="${config.key}">
            <div class="room-repair-selected-card-head">
              <span><i class="fas ${config.icon}"></i>${escapeRoomRepairHtml(config.label)}</span>
              <button type="button" onclick="clearRoomRepairSection('${config.key}')" ${items.length ? '' : 'disabled'}>Очистить</button>
            </div>
            <div class="room-repair-selected-list" data-repair-section-list="${config.key}">
              ${renderRoomRepairSelectedListHtml(config.key, items)}
            </div>
          </div>
        `;
      }).join('');
    }

    function renderRoomRepairModalSection(config, calc) {
      const value = getRoomRepairModalSectionValue(calc, config.key);
      const selectedItems = splitRoomRepairSectionTextarea(value);
      const itemsCount = selectedItems.length;
      const presets = getRoomRepairSectionPresets(config.key).slice(0, 10);
      return `
        <label class="room-repair-modal-section" data-repair-tab-section="${config.tab}">
          <span class="room-repair-section-headline">
            <span><i class="fas ${config.icon}"></i>${config.label}</span>
            <em data-repair-section-count="${config.key}">${itemsCount ? `${itemsCount} поз.` : 'пусто'}</em>
          </span>
          <small>${escapeRoomRepairHtml(config.hint || '')}</small>
          <div class="room-repair-selected-list" data-repair-section-list="${config.key}">
            ${renderRoomRepairSelectedListHtml(config.key, selectedItems)}
          </div>
          <textarea data-repair-section="${config.key}" rows="3" placeholder="${escapeRoomRepairHtml(config.placeholder)}" oninput="markRoomRepairDraftManual(); refreshRoomRepairDraftPreview();">${escapeRoomRepairHtml(value)}</textarea>
          <span class="room-repair-section-tools">
            ${presets.map(preset => `
              <button type="button" class="${selectedItems.includes(preset) ? 'is-added' : ''}" data-repair-preset="${config.key}" data-repair-preset-value="${escapeRoomRepairHtml(preset)}" onclick="addRoomRepairSectionPreset('${config.key}', '${escapeRoomRepairJsString(preset)}')">
                <i class="fas ${selectedItems.includes(preset) ? 'fa-check' : 'fa-plus'}"></i>
                ${escapeRoomRepairHtml(preset)}
              </button>
            `).join('')}
            <button type="button" class="is-muted" onclick="clearRoomRepairSection('${config.key}')">Очистить</button>
          </span>
          ${renderRoomRepairCustomAdder(config.key)}
        </label>
      `;
    }

    function renderRoomRepairModalTabs(calc) {
      const sections = getRoomRepairSectionConfig();
      return getRoomRepairTabConfig().map((tab, index) => {
        const count = sections
          .filter(config => config.tab === tab.key)
          .reduce((sum, config) => sum + splitRoomRepairSectionTextarea(getRoomRepairModalSectionValue(calc, config.key)).length, 0);
        return `
          <button type="button" class="room-repair-modal-tab ${index === 0 ? 'is-active' : ''}" data-room-repair-tab="${tab.key}" onclick="selectRoomRepairModalTab('${tab.key}')">
            <i class="fas ${tab.icon}"></i>
            <span>${tab.label}</span>
            <em data-repair-tab-count="${tab.key}">${count}</em>
          </button>
        `;
      }).join('');
    }

    function renderRoomRepairModalTabPanels(calc) {
      const sections = getRoomRepairSectionConfig();
      return getRoomRepairTabConfig().map((tab, index) => {
        const tabSections = sections.filter(config => config.tab === tab.key);
        return `
          <div class="room-repair-modal-tab-panel ${index === 0 ? 'is-active' : ''}" data-room-repair-tab-panel="${tab.key}">
            <div class="room-repair-modal-sections">
              ${tabSections.map(config => renderRoomRepairModalSection(config, calc)).join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    function getRoomRepairModalShell() {
      let shell = document.getElementById('roomRepairCalculationModal');
      if (shell) return shell;
      shell = document.createElement('div');
      shell.id = 'roomRepairCalculationModal';
      shell.className = 'room-repair-modal-shell';
      shell.setAttribute('aria-hidden', 'true');
      document.body.appendChild(shell);

      if (!window.__roomRepairModalEscBound) {
        window.__roomRepairModalEscBound = true;
        document.addEventListener('keydown', event => {
          if (event.key === 'Escape') closeRoomRepairCalculationModal();
        });
      }
      if (!window.__roomRepairModalCostBound) {
        window.__roomRepairModalCostBound = true;
        document.addEventListener('click', event => {
          const activeShell = document.getElementById('roomRepairCalculationModal');
          if (!activeShell?.classList.contains('is-cost-open')) return;
          if (event.target.closest('.room-repair-mobile-summary, .room-repair-cost-toggle')) return;
          activeShell.classList.remove('is-cost-open');
        });
      }
      return shell;
    }

    function renderRoomRepairCalculationModal(roomId, floorIndex, roomIndex) {
      const room = roomData?.[roomId]?.floors?.[floorIndex]?.livingRooms?.[roomIndex];
      if (!room) return;
      const calc = ensureRoomRepairCalculation(room);
      const state = getRoomRepairCalculationState(room);
      const currentImpact = calc.panelImpact || getRoomRepairPanelImpact(room, calc.sections || {});
      const currentMaterialProfile = calc.materialProfile || calculateRoomRepairMaterialProfile(room, calc.sections || {}, calc.designMode || 'own', calc.designStyle || '', calc.structuredSelections || []);
      const currentWarnings = getRoomRepairValidationWarnings(room, calc.sections || {}, calc.structuredSelections || [], currentImpact);
      const designStyle = calc.designStyle || room.repairData?.designStyle || '';
      const designMode = calc.designMode || (designStyle ? 'style' : 'own');
      const calculationMode = normalizeRoomRepairRepairTier(calc.calculationMode || calc.solutionPackage || 'comfort');
      const solutionPackage = normalizeRoomRepairRepairTier(calc.solutionPackage || getRoomRepairSolutionPackageForMode(calculationMode));
      const priceTier = calc.priceTier || 'inherit';
      const priceTierMeta = getRoomRepairPriceTierMeta(priceTier);
      const floor = roomData?.[roomId]?.floors?.[floorIndex] || {};
      const title = room.chamberDisplayName || `Комната ${room.chamberNumber || roomIndex + 1}`;
      const area = Number(room.area || 0).toFixed(2);
      const wallsArea = Number(room.wallsArea || calculateLivingRoomWallsArea(room) || 0).toFixed(2);
      const ceilingArea = Number((typeof getLivingRoomCeilingArea === 'function' ? getLivingRoomCeilingArea(room) : room.ceilingArea) || room.area || 0).toFixed(2);
      const people = Number(room.peopleCount || 0);
      const autoContext = getRoomRepairAutoContext(room, designMode, designStyle);
      const roomMetrics = getRoomRepairMetrics(room);
      const currentPackageDiff = getRoomRepairPackageDiff(room, calc.sections || {}, designMode, designStyle, solutionPackage);
      const styleNote = autoContext.styleCanAffectFinish
        ? 'Стиль влияет на чистовые покрытия, световые сценарии и материалы.'
        : 'Для черновой отделки и White-box стиль не меняет состав работ: считаем базовые слои и подготовку.';
      const shell = getRoomRepairModalShell();

      shell.innerHTML = `
        <div class="room-repair-modal-backdrop is-head-compact is-design-compact" data-room-id="${roomId}" data-floor-index="${floorIndex}" data-room-index="${roomIndex}" data-active-builder-node="demoFinish" data-builder-open-groups="" data-repair-draft-source="${calc.source || 'auto'}" data-repair-draft-manual="${calc.manualEdited ? 'true' : 'false'}" data-repair-solution-package="${solutionPackage}" data-repair-price-tier="${priceTier}" data-applied-design-mode="${escapeRoomRepairHtml(designMode)}" data-applied-design-style="${escapeRoomRepairHtml(designStyle)}" data-repair-proposal-stale="" onclick="if(event.target === this) closeRoomRepairCalculationModal()">
          <section class="room-repair-modal" role="dialog" aria-modal="true" aria-labelledby="roomRepairModalTitle">
            <div class="room-repair-mobile-handle" aria-hidden="true"></div>
            <div class="room-repair-modal-head">
              <div class="room-repair-modal-title">
                <div class="room-repair-calc-kicker">Редактор расчета комнаты</div>
                <h3 id="roomRepairModalTitle">${escapeRoomRepairHtml(title)}</h3>
                <p>${escapeRoomRepairHtml(room.roomType || 'Тип комнаты не выбран')} · ${escapeRoomRepairHtml(state.statusLabel)} · ${escapeRoomRepairHtml(state.sourceLabel)}</p>
              </div>
              <div class="room-repair-head-context" aria-label="Контекст расчета комнаты">
                <div class="room-repair-head-chip"><span>Текущее состояние</span><strong>${escapeRoomRepairHtml(getRoomRepairCurrentStateLabel(room))}</strong></div>
                <div class="room-repair-head-chip"><span>Требуется ремонт</span><strong>${escapeRoomRepairHtml(getRoomRepairTypeLabel(room))}</strong></div>
                <div class="room-repair-head-chip"><span>Перепланировка</span><strong>${escapeRoomRepairHtml(getRoomRepairRedesignLabel(room))}</strong></div>
                <div class="room-repair-head-chip"><span>Дизайн</span><strong id="roomRepairContextDesign">${designMode === 'style' ? escapeRoomRepairHtml(getRoomRepairStyleLabel(designStyle)) : 'Свой дизайн'}</strong></div>
                <div class="room-repair-head-chip"><span>Уровень расчета</span><strong id="roomRepairContextMode">${escapeRoomRepairHtml(priceTierMeta.label)}</strong></div>
                <div class="room-repair-head-chip"><span>Пакет</span><strong id="roomRepairContextPackage">${escapeRoomRepairHtml(getRoomRepairSolutionPackageMeta(solutionPackage).label)}</strong></div>
              </div>
              <div class="room-repair-modal-head-actions">
                <button type="button" class="room-repair-head-compact-toggle" onclick="toggleRoomRepairHeaderCompact()" aria-label="Развернуть верхнюю панель" title="Развернуть верхнюю панель">
                  <i class="fas fa-expand"></i>
                </button>
                <button type="button" class="room-repair-cost-toggle" onclick="toggleRoomRepairMobileCost(event)" aria-label="Показать стоимость">
                  <i class="fas fa-coins"></i>
                  <span>Стоимость</span>
                </button>
                <button type="button" onclick="closeRoomRepairCalculationModal()" aria-label="Закрыть"><i class="fas fa-times"></i></button>
              </div>
            </div>

            <div class="room-repair-modal-body">
              <div class="room-repair-modal-main">
                <div class="room-repair-mobile-summary" aria-live="polite">
                  <div>
                    <span>Итого</span>
                    <strong id="roomRepairMobilePreviewTotal">${formatRoomRepairMoney(calc.totals?.total, '0 ₽')}</strong>
                  </div>
                  <div>
                    <span>Работы</span>
                    <strong id="roomRepairMobilePreviewWorks">${formatRoomRepairMoney(calc.totals?.works, '0 ₽')}</strong>
                  </div>
                  <div>
                    <span>Материалы</span>
                    <strong id="roomRepairMobilePreviewMaterials">${formatRoomRepairMoney(calc.totals?.materials, '0 ₽')}</strong>
                  </div>
                </div>
                <div class="room-repair-design-panel">
                  <div class="room-repair-design-compact-bar" role="button" tabindex="0" onclick="toggleRoomRepairDesignCompact()" onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleRoomRepairDesignCompact(); }" aria-label="Развернуть или свернуть настройки расчета">
                    <span id="roomRepairDesignCompactText"><i class="fas fa-sliders"></i> ${escapeRoomRepairHtml(getRoomRepairSolutionPackageMeta(solutionPackage).label)} · ${escapeRoomRepairHtml(priceTierMeta.label)} · ${designMode === 'style' ? escapeRoomRepairHtml(getRoomRepairStyleLabel(designStyle)) : 'Свой дизайн'}</span>
                    <button type="button" onclick="event.stopPropagation(); toggleRoomRepairDesignCompact()">
                      <i class="fas fa-chevron-down"></i>
                      <em>Развернуть настройки</em>
                    </button>
                  </div>
                  <div class="room-repair-design-grid">
                    <label>
                      <span>Дизайн</span>
                      <select id="roomRepairDesignMode" onchange="updateRoomRepairDesignDraft()">
                        <option value="own" ${designMode === 'own' ? 'selected' : ''}>Свой дизайн</option>
                        <option value="style" ${designMode === 'style' ? 'selected' : ''}>Стиль дизайна</option>
                      </select>
                    </label>
                    <label id="roomRepairDesignStyleWrap" class="${designMode === 'style' ? '' : 'is-hidden'}">
                      <span>Стиль</span>
                      <select id="roomRepairDesignStyle" onchange="updateRoomRepairDesignDraft()">
                        ${getRoomRepairDesignStyleOptions().map(option => `<option value="${option.value}" ${option.value === designStyle ? 'selected' : ''}>${option.label}</option>`).join('')}
                      </select>
                    </label>
                    <label>
                      <span>Уровень расчета</span>
                      <select id="roomRepairPriceTier" onchange="updateRoomRepairPriceTier(this.value)">
                        ${getRoomRepairPriceTierOptions().map(option => `<option value="${option.value}" ${option.value === priceTier ? 'selected' : ''}>${escapeRoomRepairHtml(option.label)}</option>`).join('')}
                      </select>
                    </label>
                    <input type="hidden" id="roomRepairCalculationMode" value="${escapeRoomRepairHtml(getRoomRepairSolutionPackageMeta(solutionPackage).mode || calculationMode)}">
                  </div>
                  <div class="room-repair-auto-tools">
                    <button type="button" id="roomRepairAutoAction" onclick="fillRoomRepairAutoDraft('${roomId}', ${floorIndex}, ${roomIndex})">
                      <i class="fas fa-wand-magic-sparkles"></i>
                      Предложить состав
                    </button>
                    <button type="button" class="room-repair-undo-action" data-room-repair-undo onclick="undoRoomRepairDraftChange()" disabled>
                      <i class="fas fa-rotate-left"></i>
                      Отменить
                    </button>
                    <span id="roomRepairAutoHint">Автоподбор учтет состояние, тип ремонта, перепланировку, комнату, площадь, людей и дизайн.</span>
                  </div>
                  <div class="room-repair-package-strip" aria-label="Пакеты решений">
                    ${getRoomRepairSolutionPackageOptions().map(option => `
                      <button type="button" class="${option.value === solutionPackage ? 'is-active' : ''}" data-room-repair-package="${option.value}" onclick="fillRoomRepairAutoDraft('${roomId}', ${floorIndex}, ${roomIndex}, '${option.value}')">
                        <i class="fas ${option.icon}"></i>
                        <span>${escapeRoomRepairHtml(option.label)}</span>
                        <small>${escapeRoomRepairHtml(option.hint)}</small>
                      </button>
                    `).join('')}
                  </div>
                  <p><span id="roomRepairStyleImpactNote">${styleNote}</span> <b id="roomRepairManualHint">Пока сохраняем как ${state.source === 'manual' ? 'ручную корректировку' : 'автоматический расчет'}.</b></p>
                </div>

                <div class="room-repair-modal-editor">
                  ${renderRoomRepairBuilderHiddenSections(calc)}
                  <div class="room-repair-builder">
                    <nav class="room-repair-builder-nav" aria-label="Навигация по расчету комнаты">
                      ${renderRoomRepairBuilderNav({ ...calc, activeBuilderNode: 'demoFinish', openBuilderGroups: '', roomMetrics })}
                    </nav>
                    ${renderRoomRepairBuilderWorkspace({ ...calc, activeBuilderNode: 'demoFinish', openBuilderGroups: '', roomMetrics, room })}
                  </div>
                </div>
              </div>

              <aside class="room-repair-modal-side">
                <div class="room-repair-side-card">
                  <span>Параметры</span>
                  <strong>${area} м² пола</strong>
                  <small>Стены: ${wallsArea} м² · Потолок: ${ceilingArea} м²</small>
                  <small>Людей: ${people || 'не указано'} · Этаж: ${Number(floorIndex) + 1}</small>
                  <small>Расположение: ${escapeRoomRepairHtml(getRoomRepairLocationLabel(floor.location || room.location || 'above_ground'))}</small>
                </div>
                <div class="room-repair-side-card">
                  <span>Стоимость</span>
                  <strong id="roomRepairPreviewTotal">${formatRoomRepairMoney(calc.totals?.total)}</strong>
                  <small id="roomRepairPreviewWorks">Работы: ${formatRoomRepairMoney(calc.totals?.works)}</small>
                  <small id="roomRepairPreviewMaterials">Материалы: ${formatRoomRepairMoney(calc.totals?.materials)}</small>
                  <small id="roomRepairPreviewPriceTier">Расценки работ: ${escapeRoomRepairHtml(getRoomRepairPriceMarket(priceTierMeta.effectiveValue))}</small>
                </div>
                <div class="room-repair-side-card room-repair-selected-summary-card">
                  <span>Собранный ремонт</span>
                  <div class="room-repair-selected-summary" data-builder-selected-summary>
                    ${renderRoomRepairBuilderSelectedSummary(calc)}
                  </div>
                </div>
                <div class="room-repair-side-card" id="roomRepairMaterialPreviewCard">
                  <span>Покрытия и материалы</span>
                  ${renderRoomRepairMaterialProfileSummary(currentMaterialProfile, false, calc.totals?.materials)}
                </div>
                <div class="room-repair-side-card room-repair-composition-card">
                  <span>Состав расчета</span>
                  <div id="roomRepairPreviewComposition">
                    ${renderRoomRepairCompositionHtml(calc.sections || {}, currentMaterialProfile, currentImpact, currentWarnings, calc.structuredSelections || [])}
                  </div>
                </div>
                <div class="room-repair-side-card room-repair-package-diff-card">
                  <span>Сравнение с пакетом</span>
                  <div id="roomRepairPackageDiff">
                    ${renderRoomRepairPackageDiffHtml(currentPackageDiff)}
                  </div>
                </div>
                <div class="room-repair-side-card room-repair-warning-card">
                  <span>Контроль перед расчетом</span>
                  <div id="roomRepairPreviewWarnings">
                    ${renderRoomRepairWarningsHtml(currentWarnings)}
                  </div>
                </div>
                <div class="room-repair-side-card room-repair-history-card">
                  <span>История черновика</span>
                  <div class="room-repair-history-list" data-room-repair-history-list>
                    ${renderRoomRepairHistoryHtml([])}
                  </div>
                </div>
                <div class="room-repair-side-card">
                  <span>Влияние</span>
                  <small>После сохранения состав попадет в раздел “Что нужно сделать”.</small>
                  <small>Электрика и Smart-разделы отмечаются как влияющие на щиты.</small>
                  <small id="roomRepairPreviewImpact">Сейчас: ${currentImpact.electricalPanel ? `${currentImpact.breakerGroups || 0} групп / ${currentImpact.loadKw || 0} кВт` : 'нет влияния на электрощит'}${currentImpact.smartPanel ? ' · SMART-щит' : ''}</small>
                </div>
              </aside>
            </div>

            <div class="room-repair-modal-foot">
              <button type="button" class="room-repair-secondary-action" onclick="closeRoomRepairCalculationModal()">Отмена</button>
              ${state.isCalculated ? `
                <button type="button" class="room-repair-secondary-action room-repair-clear-action" onclick="clearRoomRepairCalculation('${roomId}', ${floorIndex}, ${roomIndex})">
                  Очистить расчет
                </button>
              ` : ''}
              <button type="button" class="room-repair-calc-action" onclick="applyRoomRepairCalculationDraft('${roomId}', ${floorIndex}, ${roomIndex})">
                ${state.isCalculated ? 'Пересчитать ремонт' : 'Рассчитать ремонт'}
              </button>
            </div>
          </section>
        </div>
      `;

      shell.classList.add('is-open');
      shell.setAttribute('aria-hidden', 'false');
      document.body.classList.add('room-repair-modal-open');
      refreshRoomRepairDraftPreview(false);
    }

    function toggleRoomRepairMobileCost(event) {
      event?.stopPropagation?.();
      const shell = document.getElementById('roomRepairCalculationModal');
      if (!shell) return;
      shell.classList.toggle('is-cost-open');
    }

    window.toggleRoomRepairMobileCost = toggleRoomRepairMobileCost;

    function toggleRoomRepairHeaderCompact() {
      const shell = getRoomRepairDraftShell();
      if (!shell) return;
      shell.classList.toggle('is-head-compact');
      const icon = shell.querySelector('.room-repair-head-compact-toggle i');
      const button = shell.querySelector('.room-repair-head-compact-toggle');
      const compact = shell.classList.contains('is-head-compact');
      if (icon) {
        icon.classList.toggle('fa-compress', !compact);
        icon.classList.toggle('fa-expand', compact);
      }
      if (button) {
        const label = compact ? 'Развернуть верхнюю панель' : 'Свернуть верхнюю панель';
        button.setAttribute('aria-label', label);
        button.setAttribute('title', label);
      }
    }

    window.toggleRoomRepairHeaderCompact = toggleRoomRepairHeaderCompact;

    function toggleRoomRepairDesignCompact() {
      const shell = getRoomRepairDraftShell();
      if (!shell) return;
      shell.classList.toggle('is-design-compact');
      const button = shell.querySelector('.room-repair-design-compact-bar button');
      const icon = button?.querySelector('i');
      const label = button?.querySelector('em');
      const compact = shell.classList.contains('is-design-compact');
      if (icon) {
        icon.classList.toggle('fa-chevron-up', !compact);
        icon.classList.toggle('fa-chevron-down', compact);
      }
      if (label) label.textContent = compact ? 'Развернуть настройки' : 'Свернуть настройки';
    }

    window.toggleRoomRepairDesignCompact = toggleRoomRepairDesignCompact;

    function selectRoomRepairModalTab(tabKey) {
      document.querySelectorAll('[data-room-repair-tab]').forEach(button => {
        button.classList.toggle('is-active', button.getAttribute('data-room-repair-tab') === tabKey);
      });
      document.querySelectorAll('[data-room-repair-tab-panel]').forEach(panel => {
        panel.classList.toggle('is-active', panel.getAttribute('data-room-repair-tab-panel') === tabKey);
      });
    }

    window.selectRoomRepairModalTab = selectRoomRepairModalTab;

    function getRoomRepairDraftCalc(activeBuilderNode = '') {
      const shell = getRoomRepairDraftShell();
      const { room } = getRoomRepairDraftContext();
      return {
        sections: collectRoomRepairDraftSections(),
        structuredSelections: collectRoomRepairDraftStructuredSelections(false),
        room,
        roomMetrics: room ? getRoomRepairMetrics(room) : {},
        activeBuilderNode: activeBuilderNode || shell?.dataset.activeBuilderNode || 'demoFinish',
        openBuilderGroups: shell?.dataset.builderOpenGroups || '',
        closedBuilderGroups: shell?.dataset.builderClosedGroups || ''
      };
    }

    function refreshRoomRepairBuilderShell(rerenderWorkspace = false) {
      const shell = getRoomRepairDraftShell();
      if (!shell) return;
      const activeNode = shell.dataset.activeBuilderNode || 'demoFinish';
      const calc = getRoomRepairDraftCalc(activeNode);
      const nav = document.querySelector('#roomRepairCalculationModal .room-repair-builder-nav');
      const summary = document.querySelector('[data-builder-selected-summary]');
      const workspace = document.querySelector('[data-builder-workspace]');
      if (nav) nav.innerHTML = renderRoomRepairBuilderNav(calc);
      if (summary) summary.innerHTML = renderRoomRepairBuilderSelectedSummary(calc);
      if (rerenderWorkspace && workspace) workspace.outerHTML = renderRoomRepairBuilderWorkspace(calc);
    }

    function refreshRoomRepairBuilderShellPreservingScroll(rerenderWorkspace = false) {
      const workspace = document.querySelector('[data-builder-workspace]');
      const modalBody = document.querySelector('#roomRepairCalculationModal .room-repair-modal-body');
      const scrollTop = workspace ? workspace.scrollTop : 0;
      const bodyScrollTop = modalBody ? modalBody.scrollTop : 0;
      refreshRoomRepairBuilderShell(rerenderWorkspace);
      if (rerenderWorkspace) {
        window.requestAnimationFrame(() => {
          const nextWorkspace = document.querySelector('[data-builder-workspace]');
          const nextModalBody = document.querySelector('#roomRepairCalculationModal .room-repair-modal-body');
          if (nextWorkspace) nextWorkspace.scrollTop = scrollTop;
          if (nextModalBody) nextModalBody.scrollTop = bodyScrollTop;
        });
      }
    }

    function selectRoomRepairBuilderNode(nodeKey) {
      const shell = getRoomRepairDraftShell();
      if (shell) {
        const currentNode = shell.dataset.activeBuilderNode || 'demoFinish';
        if (nodeKey === 'finishFloor' && currentNode === 'finishFloor') {
          shell.dataset.floorCoverPickerOpen = shell.dataset.floorCoverPickerOpen === 'true' ? 'false' : 'true';
        } else if (nodeKey === 'finishFloor') {
          shell.dataset.floorCoverPickerOpen = 'true';
        }
        if (nodeKey === 'finishWalls' && currentNode === 'finishWalls') {
          shell.dataset.wallCoverPickerOpen = shell.dataset.wallCoverPickerOpen === 'true' ? 'false' : 'true';
        } else if (nodeKey === 'finishWalls') {
          shell.dataset.wallCoverPickerOpen = 'true';
        }
        if (nodeKey === 'finishCeiling' && currentNode === 'finishCeiling') {
          shell.dataset.ceilingCoverPickerOpen = shell.dataset.ceilingCoverPickerOpen === 'true' ? 'false' : 'true';
        } else if (nodeKey === 'finishCeiling') {
          shell.dataset.ceilingCoverPickerOpen = 'true';
        }
        shell.dataset.activeBuilderNode = nodeKey;
        const openGroups = parseRoomRepairBuilderOpenGroups(shell.dataset.builderOpenGroups || '');
        const groupKey = getRoomRepairBuilderGroupKeyForNode(nodeKey);
        if (groupKey) openGroups.add(groupKey);
        shell.dataset.builderOpenGroups = Array.from(openGroups).join(',');
      }
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.selectRoomRepairBuilderNode = selectRoomRepairBuilderNode;

    function toggleRoomRepairFloorCoverPicker() {
      const shell = getRoomRepairDraftShell();
      if (!shell) return;
      shell.dataset.floorCoverPickerOpen = shell.dataset.floorCoverPickerOpen === 'true' ? 'false' : 'true';
      shell.dataset.activeBuilderNode = 'finishFloor';
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.toggleRoomRepairFloorCoverPicker = toggleRoomRepairFloorCoverPicker;

    function openRoomRepairFloorCoverPicker() {
      const shell = getRoomRepairDraftShell();
      if (!shell) return;
      shell.dataset.floorCoverPickerOpen = 'true';
      shell.dataset.activeBuilderNode = 'finishFloor';
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.openRoomRepairFloorCoverPicker = openRoomRepairFloorCoverPicker;

    function toggleRoomRepairWallCoverPicker() {
      const shell = getRoomRepairDraftShell();
      if (!shell) return;
      shell.dataset.wallCoverPickerOpen = shell.dataset.wallCoverPickerOpen === 'true' ? 'false' : 'true';
      shell.dataset.activeBuilderNode = 'finishWalls';
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.toggleRoomRepairWallCoverPicker = toggleRoomRepairWallCoverPicker;

    function openRoomRepairWallCoverPicker() {
      const shell = getRoomRepairDraftShell();
      if (!shell) return;
      shell.dataset.wallCoverPickerOpen = 'true';
      shell.dataset.activeBuilderNode = 'finishWalls';
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.openRoomRepairWallCoverPicker = openRoomRepairWallCoverPicker;

    function toggleRoomRepairCeilingCoverPicker() {
      const shell = getRoomRepairDraftShell();
      if (!shell) return;
      shell.dataset.ceilingCoverPickerOpen = shell.dataset.ceilingCoverPickerOpen === 'true' ? 'false' : 'true';
      shell.dataset.activeBuilderNode = 'finishCeiling';
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.toggleRoomRepairCeilingCoverPicker = toggleRoomRepairCeilingCoverPicker;

    function openRoomRepairCeilingCoverPicker() {
      const shell = getRoomRepairDraftShell();
      if (!shell) return;
      shell.dataset.ceilingCoverPickerOpen = 'true';
      shell.dataset.activeBuilderNode = 'finishCeiling';
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.openRoomRepairCeilingCoverPicker = openRoomRepairCeilingCoverPicker;

    function toggleRoomRepairBuilderGroup(groupKey) {
      const shell = getRoomRepairDraftShell();
      if (!shell) return;
      const openGroups = parseRoomRepairBuilderOpenGroups(shell.dataset.builderOpenGroups || '');
      if (openGroups.has(groupKey)) {
        openGroups.delete(groupKey);
      } else {
        openGroups.add(groupKey);
      }
      shell.dataset.builderOpenGroups = Array.from(openGroups).join(',');
      refreshRoomRepairBuilderShell(false);
    }

    window.toggleRoomRepairBuilderGroup = toggleRoomRepairBuilderGroup;

    function toggleRoomRepairBuilderDetailGroup(groupKey, isCurrentlyOpen = false) {
      const shell = getRoomRepairDraftShell();
      if (!shell || !groupKey) return;
      const openGroups = parseRoomRepairBuilderOpenGroups(shell.dataset.builderOpenGroups || '');
      const closedGroups = parseRoomRepairBuilderOpenGroups(shell.dataset.builderClosedGroups || '');
      const currentlyOpen = isCurrentlyOpen === true || isCurrentlyOpen === 'true';
      if (currentlyOpen || openGroups.has(groupKey)) {
        openGroups.delete(groupKey);
        closedGroups.add(groupKey);
      } else {
        openGroups.add(groupKey);
        closedGroups.delete(groupKey);
      }
      shell.dataset.builderOpenGroups = Array.from(openGroups).join(',');
      shell.dataset.builderClosedGroups = Array.from(closedGroups).join(',');
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.toggleRoomRepairBuilderDetailGroup = toggleRoomRepairBuilderDetailGroup;

    function getRoomRepairCoverPassportEntries(nodeKey = '', row = {}, structuredSelections = []) {
      const map = getRoomRepairZoneDetailMap(nodeKey, structuredSelections, row.id);
      return Object.entries(map)
        .map(([group, values]) => ({
          group,
          values: (values || []).map(item => item.value || cleanRoomRepairFloorDetailValue(item.label)).filter(Boolean)
        }))
        .filter(entry => entry.values.length);
    }

    function getRoomRepairCoverPassportPreview(row = {}, entries = []) {
      const text = normalizeRoomRepairBuilderLabel([
        row.cover,
        ...entries.flatMap(entry => entry.values || [])
      ].join(' '));
      const style = getRoomRepairFloorColorSwatch(text)
        || (text.includes('травертин') ? 'repeating-linear-gradient(135deg, #ead7b5 0 8px, #c8aa78 8px 11px, #fff3d8 11px 20px)' : '')
        || (text.includes('бетон') ? 'linear-gradient(135deg, #e5e7eb, #9ca3af 48%, #6b7280)' : '')
        || (text.includes('шелк') ? 'linear-gradient(135deg, #fff7ed, #f9d9a7 35%, #ffffff 52%, #dbeafe 78%)' : '')
        || 'linear-gradient(135deg, #fff7ed, #f59e0b 48%, #ffffff)';
      return { style, sourceUrl: '' };
    }

    function renderRoomRepairCoverPassportPanel(nodeKey = '', row = {}, completion = {}, entries = []) {
      const isLinearCeiling = nodeKey === 'finishCeiling' && isRoomRepairCeilingLinearCover(row.cover);
      const isPointCeiling = nodeKey === 'finishCeiling' && isRoomRepairCeilingPointCover(row.cover);
      const unit = nodeKey === 'finishWalls' && isRoomRepairWallLinearCover(row.cover)
        ? 'м.п.'
        : (isPointCeiling ? 'шт.' : (isLinearCeiling ? 'м.п.' : 'м²'));
      const passportTitle = nodeKey === 'finishWalls'
        ? 'Паспорт покрытия стен'
        : (nodeKey === 'finishCeiling' ? 'Паспорт решения потолка' : 'Паспорт покрытия пола');
      const preview = getRoomRepairCoverPassportPreview(row, entries);
      return `
        <div class="room-repair-cover-passport-backdrop" onclick="closeRoomRepairCoverPassportPanel()"></div>
        <aside class="room-repair-cover-passport-panel" role="dialog" aria-modal="true" aria-label="Паспорт покрытия">
          <div class="room-repair-cover-passport-media" data-cover-passport-media style="background: ${escapeRoomRepairHtml(preview.style)}">
            <span>визуальный образец</span>
          </div>
          <div class="room-repair-cover-passport-head">
            <span>${escapeRoomRepairHtml(passportTitle)}</span>
            <button type="button" onclick="closeRoomRepairCoverPassportPanel()" aria-label="Закрыть"><i class="fas fa-times"></i></button>
            <strong>${escapeRoomRepairHtml(row.cover || 'Покрытие не выбрано')}</strong>
            <small>${escapeRoomRepairHtml(row.zoneLabel || 'Зона')} · ${formatRoomRepairQtyValue(row.area || 0)} ${unit}</small>
          </div>
          <div class="room-repair-cover-passport-progress is-${escapeRoomRepairHtml(completion.status || 'empty')}" data-cover-passport-progress>
            <div>
              <span>Готовность спецификации</span>
              <strong data-cover-passport-progress-text>${completion.total ? `${completion.filled} из ${completion.total}` : 'нет обязательных полей'}</strong>
            </div>
            <em><i data-cover-passport-progress-bar style="width: ${Number(completion.percent || 0)}%"></i></em>
          </div>
          ${completion.missing?.length ? `
            <div class="room-repair-cover-passport-warning" data-cover-passport-warning>
              <i class="fas fa-circle-exclamation"></i>
              <span>Нужно заполнить: ${escapeRoomRepairHtml(completion.missing.join(', '))}</span>
            </div>
          ` : '<div class="room-repair-cover-passport-warning" data-cover-passport-warning hidden></div>'}
          <div class="room-repair-cover-passport-actions">
            <button type="button" onclick="autoFillRoomRepairZoneDetails('${escapeRoomRepairJsString(nodeKey)}', '${escapeRoomRepairJsString(row.id)}')">
              <i class="fas fa-wand-magic-sparkles"></i>
              ${completion.percent ? 'Дозаполнить' : 'Автозаполнить'}
            </button>
            <button type="button" onclick="focusRoomRepairZoneDetailsFromPassport('${escapeRoomRepairJsString(nodeKey)}', '${escapeRoomRepairJsString(row.id)}')">
              <i class="fas fa-arrow-right"></i>
              К параметрам
            </button>
          </div>
          <div class="room-repair-cover-passport-details">
            ${entries.length ? entries.map(entry => `
              <section>
                <span>${escapeRoomRepairHtml(entry.group)}</span>
                ${entry.values.map(value => `<strong>${escapeRoomRepairHtml(value)}</strong>`).join('')}
              </section>
            `).join('') : '<p>Параметры еще не заполнены. Можно заполнить их вручную или автоматически.</p>'}
          </div>
          <small class="room-repair-cover-passport-foot" data-cover-passport-source>${preview.sourceUrl ? `Источник: ${escapeRoomRepairHtml(preview.sourceUrl)}` : 'Для реальных фото используется локальный каталог assets/repair-coverings; пока показан визуальный образец.'}</small>
        </aside>
      `;
    }

    function updateRoomRepairCoverPassportValidationFromBackend(validation = {}) {
      const progress = document.querySelector('#roomRepairCoverPassport [data-cover-passport-progress]');
      const progressText = document.querySelector('#roomRepairCoverPassport [data-cover-passport-progress-text]');
      const progressBar = document.querySelector('#roomRepairCoverPassport [data-cover-passport-progress-bar]');
      const warning = document.querySelector('#roomRepairCoverPassport [data-cover-passport-warning]');
      const status = validation.status || 'empty';
      const percent = Number(Math.max(0, Math.min(100, validation.percent || 0)).toFixed(0));
      if (progress) {
        progress.classList.remove('is-ready', 'is-partial', 'is-empty');
        progress.classList.add(`is-${status}`);
      }
      if (progressText) {
        progressText.textContent = validation.total ? `${validation.filled || 0} из ${validation.total}` : 'нет обязательных полей';
      }
      if (progressBar) progressBar.style.width = `${percent}%`;
      if (warning) {
        const missing = Array.isArray(validation.missing) ? validation.missing : [];
        warning.hidden = !missing.length;
        warning.innerHTML = missing.length
          ? `<i class="fas fa-circle-exclamation"></i><span>Нужно заполнить: ${escapeRoomRepairHtml(missing.join(', '))}</span>`
          : '';
      }
    }

    async function hydrateRoomRepairCoverPassportFromBackend(nodeKey = '', row = {}, entries = []) {
      const isFloorCover = nodeKey === 'finishFloor';
      const isCeilingCover = nodeKey === 'finishCeiling';
      const isWallCover = nodeKey === 'finishWalls';
      const isDecorativePlaster = isWallCover && /штукатур/.test(normalizeRoomRepairBuilderLabel(row.cover || ''));
      if (!(isFloorCover || isCeilingCover || isWallCover)) return;
      if (!window.RepairCoveringsApi?.fetchCoveringCatalog && !window.RepairCoveringsApi?.validateCoveringDetails && !window.RepairCoveringsApi?.fetchCoveringOptions) return;
      const catalogKey = isFloorCover ? 'floors.common' : (isCeilingCover ? 'ceilings.common' : 'walls.common');
      try {
        const selectedGroups = entries.map(entry => entry.group).filter(Boolean);
        const selectedLabels = entries.flatMap(entry => entry.values || []).filter(Boolean);
        if ((isFloorCover || isCeilingCover || isWallCover) && window.RepairCoveringsApi?.fetchCoveringOptions) {
          const validation = await window.RepairCoveringsApi.fetchCoveringOptions({
            catalog: catalogKey,
            cover: row.cover,
            selectedGroups,
            selectedLabels
          });
          updateRoomRepairCoverPassportValidationFromBackend(validation);
        } else if (window.RepairCoveringsApi?.validateCoveringDetails) {
          const validation = await window.RepairCoveringsApi.validateCoveringDetails({
            catalog: catalogKey,
            cover: row.cover,
            selectedGroups,
            selectedLabels
          });
          updateRoomRepairCoverPassportValidationFromBackend(validation);
        }
        if (!isDecorativePlaster || !window.RepairCoveringsApi?.fetchCoveringCatalog) return;
        const catalog = await window.RepairCoveringsApi.fetchCoveringCatalog('walls.decorative_plaster');
        const selectedText = normalizeRoomRepairBuilderLabel(entries.flatMap(entry => entry.values).join(' '));
        const technique = (catalog.techniques || []).find(item => selectedText.includes(normalizeRoomRepairBuilderLabel(item.label)))
          || (catalog.techniques || []).find(item => normalizeRoomRepairBuilderLabel(item.label).split('/').some(part => selectedText.includes(part.trim())));
        if (!technique?.preview) return;
        const media = document.querySelector('#roomRepairCoverPassport [data-cover-passport-media]');
        const source = document.querySelector('#roomRepairCoverPassport [data-cover-passport-source]');
        if (media) {
          media.style.background = technique.preview.fallbackStyle || media.style.background;
          media.innerHTML = `<span>${escapeRoomRepairHtml(technique.label || 'визуальный образец')}</span>`;
        }
        if (source && technique.preview.sourceUrl) source.textContent = `Источник каталога: ${technique.preview.sourceUrl}`;
      } catch (error) {
        console.warn('Cover passport backend catalog unavailable', error);
      }
    }

    function openRoomRepairCoverPassportPanel(nodeKey = '', zoneKey = '', event = null) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      const rows = getRoomRepairRowsForZoneAction(nodeKey);
      const row = rows.find(item => item.id === zoneKey);
      if (!row) return;
      const { room } = getRoomRepairDraftContext();
      const sections = collectRoomRepairDraftSections();
      const structuredSelections = readRoomRepairDraftStructuredSelections();
      const calc = {
        sections,
        structuredSelections,
        room,
        roomMetrics: room ? getRoomRepairMetrics(room) : {}
      };
      const selectedItems = sections[nodeKey === 'finishWalls' ? 'walls' : (nodeKey === 'finishCeiling' ? 'ceiling' : 'floor')] || [];
      const completion = getRoomRepairZoneCompletion(nodeKey, row, selectedItems, calc, structuredSelections);
      const entries = getRoomRepairCoverPassportEntries(nodeKey, row, structuredSelections);
      let root = document.getElementById('roomRepairCoverPassport');
      if (!root) {
        root = document.createElement('div');
        root.id = 'roomRepairCoverPassport';
        document.body.appendChild(root);
      }
      root.className = 'room-repair-cover-passport is-open';
      root.innerHTML = renderRoomRepairCoverPassportPanel(nodeKey, row, completion, entries);
      hydrateRoomRepairCoverPassportFromBackend(nodeKey, row, entries);
    }

    window.openRoomRepairCoverPassportPanel = openRoomRepairCoverPassportPanel;

    function closeRoomRepairCoverPassportPanel() {
      const root = document.getElementById('roomRepairCoverPassport');
      if (root) root.remove();
    }

    window.closeRoomRepairCoverPassportPanel = closeRoomRepairCoverPassportPanel;

    function focusRoomRepairZoneDetailsFromPassport(nodeKey = '', zoneKey = '') {
      closeRoomRepairCoverPassportPanel();
      if (nodeKey === 'finishWalls') selectRoomRepairWallZone(zoneKey);
      else if (nodeKey === 'finishCeiling') selectRoomRepairCeilingZone(zoneKey);
      else selectRoomRepairFloorZone(zoneKey);
    }

    window.focusRoomRepairZoneDetailsFromPassport = focusRoomRepairZoneDetailsFromPassport;

    async function getRoomRepairBackendAutofillSuggestions(nodeKey = '', row = {}, packageValue = 'comfort', designStyle = '', missing = [], selectedLabels = []) {
      const isWallCover = nodeKey === 'finishWalls';
      const isFloorCover = nodeKey === 'finishFloor';
      const isCeilingCover = nodeKey === 'finishCeiling';
      if (!(isWallCover || isFloorCover || isCeilingCover) || !window.RepairCoveringsApi?.autofillCoveringDetails) return null;
      try {
        const suggestions = await window.RepairCoveringsApi.autofillCoveringDetails({
          catalog: isFloorCover ? 'floors.common' : (isCeilingCover ? 'ceilings.common' : 'walls.common'),
          cover: row.cover,
          package: packageValue,
          designStyle,
          missing,
          selectedLabels
        });
        return suggestions;
      } catch (error) {
        console.warn('Covering backend autofill unavailable', error);
        return null;
      }
    }

    async function autoFillRoomRepairZoneDetails(nodeKey = '', zoneKey = '') {
      const rows = getRoomRepairRowsForZoneAction(nodeKey);
      const row = rows.find(item => item.id === zoneKey);
      const node = getRoomRepairBuilderNode(nodeKey);
      if (!row?.cover || !node) return;
      const textarea = document.querySelector(`[data-repair-section="${node.section}"]`);
      if (!textarea) return;
      const shell = getRoomRepairDraftShell();
      const packageValue = getRoomRepairDraftSolutionPackage();
      const designStyle = shell?.dataset.appliedDesignStyle || document.getElementById('roomRepairDesignStyle')?.value || '';
      const nextItems = splitRoomRepairSectionTextarea(textarea.value);
      let nextStructured = readRoomRepairDraftStructuredSelections();
      let usedBackend = false;
      let changed = false;
      for (let step = 0; step < 10; step += 1) {
        const sections = collectRoomRepairDraftSections();
        sections[node.section] = nextItems;
        const selectedItems = sections[node.section] || [];
        const completion = getRoomRepairZoneCompletion(nodeKey, row, selectedItems, { sections, structuredSelections: nextStructured }, nextStructured);
        const missing = new Set(completion.missing || []);
        if (!missing.size) break;
        const selectedLabels = getRoomRepairZoneDetailSelections(nodeKey, nextStructured, zoneKey)
          .map(selection => getRoomRepairSelectedCoreLabel(selection.label))
          .filter(Boolean);
        const backendSuggestions = await getRoomRepairBackendAutofillSuggestions(nodeKey, row, packageValue, designStyle, Array.from(missing), selectedLabels);
        const suggestions = Array.isArray(backendSuggestions) ? backendSuggestions : (nodeKey === 'finishWalls'
          ? getRoomRepairAutoWallDetailLabels(row.cover, packageValue, designStyle)
          : (nodeKey === 'finishCeiling' ? [] : getRoomRepairAutoFloorDetailLabels(row.cover, packageValue, designStyle)));
        if (Array.isArray(backendSuggestions)) usedBackend = true;
        let stepChanged = false;
        suggestions
          .filter(item => missing.has(item.group))
          .forEach(item => {
            if (!item.label) return;
            if (!nextItems.includes(item.label)) nextItems.push(item.label);
            nextStructured = [
              ...nextStructured.filter(selection => !(selection.nodeKey === nodeKey
                && selection.source === 'detail'
                && selection.zoneKey === zoneKey
                && selection.detailGroup === item.group)),
              createRoomRepairBuilderStructuredSelection(node, item.label, {
                source: 'detail',
                detailGroup: item.group,
                zoneKey,
                zoneLabel: row.zoneLabel,
                zoneHint: row.zoneHint,
                zoneDefaultQty: row.area,
                ceilingLayer: nodeKey === 'finishCeiling' ? getRoomRepairCeilingRowLayer(row) : 0
              })
            ];
            changed = true;
            stepChanged = true;
          });
        if (!stepChanged) break;
      }
      if (!changed) return;
      textarea.value = nextItems.slice(0, 48).join('\n');
      setRoomRepairDraftStructuredSelections(nextStructured);
      pushRoomRepairDraftHistory(usedBackend ? 'Backend-автозаполнение паспорта покрытия' : 'Автозаполнение паспорта покрытия');
      closeRoomRepairCoverPassportPanel();
      refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.autoFillRoomRepairZoneDetails = autoFillRoomRepairZoneDetails;

    function toggleRoomRepairFloorZonePassport(passportId = '', event = null) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      const passport = document.getElementById(passportId);
      if (!passport) return;
      const expanded = passport.classList.toggle('is-expanded');
      const button = passport.querySelector('.room-repair-floor-zone-passport-toggle');
      const icon = button?.querySelector('i');
      if (button) {
        const label = expanded ? 'Свернуть паспорт покрытия' : 'Развернуть паспорт покрытия';
        button.setAttribute('aria-label', label);
        button.setAttribute('title', expanded ? label : (button.dataset.collapsedTitle || label));
        button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      }
      if (icon) {
        icon.classList.toggle('fa-chevron-up', expanded);
        icon.classList.toggle('fa-chevron-down', !expanded);
      }
    }

    window.toggleRoomRepairFloorZonePassport = toggleRoomRepairFloorZonePassport;

    function syncRoomRepairBuilderManual(sectionKey, value) {
      const textarea = document.querySelector(`[data-repair-section="${sectionKey}"]`);
      if (textarea) textarea.value = value;
      refreshRoomRepairDraftPreview(true);
    }

    window.syncRoomRepairBuilderManual = syncRoomRepairBuilderManual;

    function updateRoomRepairBuilderZoneQty(nodeKey, optionIndex) {
      const node = getRoomRepairBuilderNode(nodeKey);
      if (!node) return;
      const option = (node.options || [])[Number(optionIndex)];
      const optionText = getRoomRepairBuilderOptionText(option);
      const rule = getRoomRepairBuilderWorkRule(node.section, optionText);
      const { room } = getRoomRepairDraftContext();
      const quantity = getRoomRepairBuilderQuantityConfig(node, option, rule, { room, roomMetrics: room ? getRoomRepairMetrics(room) : {} });
      const zoneSelect = document.getElementById(`roomRepairBuilderZone_${node.key}_${optionIndex}`);
      const input = document.getElementById(`roomRepairBuilderQty_${node.key}_${optionIndex}`);
      if (!zoneSelect || !input) return;
      const zone = getRoomRepairZoneMeta(zoneSelect.value, quantity);
      if (!zone || zone.key === 'custom') return;
      input.value = zone.qty;
    }

    window.updateRoomRepairBuilderZoneQty = updateRoomRepairBuilderZoneQty;

    function updateRoomRepairBuilderDetailZoneQty(nodeKey, groupIndex, optionIndex) {
      const node = getRoomRepairBuilderNode(nodeKey);
      if (!node) return;
      const group = (node.detailGroups || [])[Number(groupIndex)];
      const option = (group?.options || [])[Number(optionIndex)];
      const optionText = getRoomRepairBuilderOptionText(option);
      const rule = getRoomRepairBuilderWorkRule(node.section, optionText);
      const { room } = getRoomRepairDraftContext();
      const quantity = getRoomRepairBuilderQuantityConfig(node, option, rule, { room, roomMetrics: room ? getRoomRepairMetrics(room) : {} });
      const zoneSelect = document.getElementById(`roomRepairBuilderDetailZone_${node.key}_${groupIndex}_${optionIndex}`);
      const input = document.getElementById(`roomRepairBuilderDetailQty_${node.key}_${groupIndex}_${optionIndex}`);
      if (!zoneSelect || !input) return;
      const zone = getRoomRepairZoneMeta(zoneSelect.value, quantity);
      if (!zone || zone.key === 'custom') return;
      input.value = zone.qty;
    }

    window.updateRoomRepairBuilderDetailZoneQty = updateRoomRepairBuilderDetailZoneQty;

    function readRoomRepairFloorZoneDraftFromCards() {
      const { room } = getRoomRepairDraftContext();
      const metrics = room ? getRoomRepairMetrics(room) : {};
      const floorArea = Number(Math.max(0.1, Number(metrics.floorArea || room?.area || 1)).toFixed(2));
      const cards = Array.from(document.querySelectorAll('[data-floor-zone-card]'));
      let usedArea = 0;
      return cards.map((card, index) => {
        const id = card.getAttribute('data-floor-zone-card') || `floor_zone_${index + 1}`;
        const cover = card.getAttribute('data-floor-zone-cover') || '';
        const escapedId = roomRepairCssEscape(id);
        const typeSelect = document.querySelector(`[data-floor-zone-type="${escapedId}"]`);
        const areaInput = document.querySelector(`[data-floor-zone-area="${escapedId}"]`);
        const selectedType = typeSelect?.selectedOptions?.[0];
        const maxArea = Number(Math.max(0.1, floorArea - usedArea).toFixed(2));
        const rawArea = parseFloat(String(areaInput?.value || '').replace(',', '.'));
        const area = Number(Math.max(0.1, Math.min(maxArea, Number.isFinite(rawArea) ? rawArea : maxArea)).toFixed(2));
        usedArea += area;
        return {
          id,
          cover,
          area,
          zoneType: typeSelect?.value || (index ? 'remainder' : 'full'),
          zoneLabel: selectedType?.dataset?.label || (index ? 'Остаток' : 'Вся комната'),
          zoneHint: selectedType?.dataset?.hint || ''
        };
      });
    }

    function setRoomRepairFloorZoneSelections(rows = [], actionLabel = 'Обновлены покрытия пола', recordHistory = true) {
      const textarea = document.querySelector('[data-repair-section="floor"]');
      if (!textarea) return;
      const validRows = (rows || []).filter(row => Number(row.area || 0) > 0);
      const existingItems = splitRoomRepairSectionTextarea(textarea.value);
      const detailItems = existingItems.filter(item => !isRoomRepairPrimaryFloorCover(item) && !/выберите покрытие/i.test(item));
      const zoneLabels = validRows.map(formatRoomRepairFloorZoneLabel);
      textarea.value = [...zoneLabels, ...detailItems].slice(0, 24).join('\n');

      const existingStructured = readRoomRepairDraftStructuredSelections()
        .filter(selection => !(selection.section === 'floor' && selection.nodeKey === 'finishFloor' && selection.source === 'floor-zone-cover'))
        .filter(selection => !(selection.section === 'floor' && isRoomRepairPrimaryFloorCover(selection.label) && ['builder', 'manual', 'auto'].includes(selection.source)));
      const node = getRoomRepairBuilderNode('finishFloor');
      const zoneSelections = validRows.map((row, index) => {
        const label = formatRoomRepairFloorZoneLabel(row);
        const rule = getRoomRepairBuilderWorkRule('floor', row.cover);
        return createRoomRepairBuilderStructuredSelection(node, label, {
          source: 'floor-zone-cover',
          quantity: row.area,
          quantityLabel: 'м²',
          quantitySource: row.zoneType || 'custom',
          zoneKey: row.id || `floor_zone_${index + 1}`,
          zoneLabel: row.zoneLabel || `Покрытие ${index + 1}`,
          zoneHint: row.zoneHint || '',
          zoneDefaultQty: row.area,
          zoneCover: row.cover || ''
        });
      }).map(selection => {
        const cover = selection.zoneCover || (/выберите покрытие/i.test(selection.label) ? '' : getRoomRepairSelectedCoreLabel(selection.label));
        const rule = getRoomRepairBuilderWorkRule('floor', cover);
        return {
          ...selection,
          workId: rule?.workId || selection.workId || '',
          targetCategory: rule?.targetCategory || selection.targetCategory || '',
          qtyMode: rule?.qtyMode || selection.qtyMode || ''
        };
      });
      if (recordHistory) pushRoomRepairDraftHistory(actionLabel);
      setRoomRepairDraftStructuredSelections([...existingStructured, ...zoneSelections]);
    }

    function syncRoomRepairFloorAreaLinkedDetails(rows = []) {
      const textarea = document.querySelector('[data-repair-section="floor"]');
      if (!textarea) return;
      const zoneById = new Map((rows || []).filter(row => row.id).map(row => [row.id, row]));
      const currentItems = splitRoomRepairSectionTextarea(textarea.value);
      let changed = false;
      const nextItems = currentItems.map(item => {
        const core = getRoomRepairSelectedCoreLabel(item);
        const structured = readRoomRepairDraftStructuredSelections().find(selection =>
          selection.section === 'floor'
          && selection.nodeKey === 'finishFloor'
          && selection.source === 'detail'
          && selection.quantitySource === 'floor-zone-area'
          && getRoomRepairSelectedCoreLabel(selection.label) === core
        );
        const zone = structured ? zoneById.get(structured.zoneKey || '') : null;
        if (!zone || !core) return item;
        const nextLabel = formatRoomRepairSelectedText(core, zone.area, { mode: 'floorArea', label: structured.quantityLabel || 'м²', suffix: structured.quantityLabel || 'м²' }, {
          key: zone.id,
          label: zone.zoneLabel || 'Активная карточка покрытия'
        });
        if (nextLabel !== item) changed = true;
        return nextLabel;
      });

      if (changed) textarea.value = nextItems.join('\n');
      const nextStructured = readRoomRepairDraftStructuredSelections().map(selection => {
        if (
          selection.section !== 'floor'
          || selection.nodeKey !== 'finishFloor'
          || selection.source !== 'detail'
          || selection.quantitySource !== 'floor-zone-area'
        ) return selection;
        const zone = zoneById.get(selection.zoneKey || '');
        if (!zone) return selection;
        const core = getRoomRepairSelectedCoreLabel(selection.label);
        return {
          ...selection,
          label: formatRoomRepairSelectedText(core, zone.area, { mode: 'floorArea', label: selection.quantityLabel || 'м²', suffix: selection.quantityLabel || 'м²' }, {
            key: zone.id,
            label: zone.zoneLabel || 'Активная карточка покрытия'
          }),
          quantity: Number(zone.area || 0),
          zoneLabel: zone.zoneLabel || selection.zoneLabel || '',
          zoneHint: zone.zoneHint || selection.zoneHint || '',
          zoneDefaultQty: Number(zone.area || 0)
        };
      });
      setRoomRepairDraftStructuredSelections(nextStructured);
    }

    function syncRoomRepairFloorZonesFromCards(rerenderWorkspace = false) {
      const rows = readRoomRepairFloorZoneDraftFromCards();
      setRoomRepairFloorZoneSelections(rows, 'Изменены зоны покрытия пола', Boolean(rerenderWorkspace));
      syncRoomRepairFloorAreaLinkedDetails(rows);
      refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShellPreservingScroll(Boolean(rerenderWorkspace));
    }

    window.syncRoomRepairFloorZonesFromCards = syncRoomRepairFloorZonesFromCards;

    function selectRoomRepairFloorZone(zoneId) {
      const shell = getRoomRepairDraftShell();
      if (shell) shell.dataset.activeFloorZone = zoneId;
      const changed = ensureRoomRepairSingleDetailDefaults('finishFloor');
      if (!changed) setRoomRepairBuilderDetailProgress('finishFloor', zoneId, '');
      if (changed) refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.selectRoomRepairFloorZone = selectRoomRepairFloorZone;

    function updateRoomRepairFloorZoneType(zoneId) {
      const escapedId = roomRepairCssEscape(zoneId);
      const select = document.querySelector(`[data-floor-zone-type="${escapedId}"]`);
      const input = document.querySelector(`[data-floor-zone-area="${escapedId}"]`);
      const selected = select?.selectedOptions?.[0];
      if (selected && input && select.value !== 'custom') {
        input.value = Number(selected.dataset.area || input.value || 0).toFixed(2);
      }
      const shell = getRoomRepairDraftShell();
      if (shell) shell.dataset.activeFloorZone = zoneId;
      syncRoomRepairFloorZonesFromCards(true);
    }

    window.updateRoomRepairFloorZoneType = updateRoomRepairFloorZoneType;

    function setRoomRepairFloorZoneCover(optionIndex) {
      const node = getRoomRepairBuilderNode('finishFloor');
      const cover = getRoomRepairBuilderOptionText((node.options || [])[Number(optionIndex)]);
      if (!cover) return;
      const rows = readRoomRepairFloorZoneDraftFromCards();
      const shell = getRoomRepairDraftShell();
      const activeId = shell?.dataset.activeFloorZone || rows[0]?.id || 'floor_zone_1';
      const targetIndex = Math.max(0, rows.findIndex(row => row.id === activeId));
      const nextRows = rows.map((row, index) => index === targetIndex ? { ...row, cover } : row);
      const targetId = nextRows[targetIndex]?.id || activeId;
      if (shell) shell.dataset.activeFloorZone = targetId;
      removeRoomRepairBuilderDetailGroupsSelections('finishFloor', ['Формат покрытия', 'Класс покрытия', 'Тип покрытия', 'Финиш для покрытия без обработки', 'Форма покрытия', 'Размер покрытия', 'Цветовая гамма'], targetId);
      setRoomRepairFloorZoneSelections(nextRows, `Выбрано покрытие пола: ${cover}`);
      const changed = ensureRoomRepairSingleDetailDefaults('finishFloor');
      if (!changed) setRoomRepairBuilderDetailProgress('finishFloor', targetId, '');
      refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.setRoomRepairFloorZoneCover = setRoomRepairFloorZoneCover;

    function readRoomRepairWallZoneDraftFromCards() {
      const { room } = getRoomRepairDraftContext();
      const metrics = room ? getRoomRepairMetrics(room) : {};
      const wallsArea = Number(Math.max(0.1, Number(metrics.wallsArea || room?.wallsArea || 1)).toFixed(2));
      const cards = Array.from(document.querySelectorAll('[data-wall-zone-card]'));
      let usedArea = 0;
      return cards.map((card, index) => {
        const id = card.getAttribute('data-wall-zone-card') || `wall_zone_${index + 1}`;
        const cover = card.getAttribute('data-wall-zone-cover') || '';
        const wallLayer = Number(card.getAttribute('data-wall-layer') || getRoomRepairWallActiveLayer() || 1);
        const linkedZoneId = card.getAttribute('data-wall-linked-zone') || '';
        const escapedId = roomRepairCssEscape(id);
        const typeSelect = document.querySelector(`[data-wall-zone-type="${escapedId}"]`);
        const areaInput = document.querySelector(`[data-wall-zone-area="${escapedId}"]`);
        const selectedType = typeSelect?.selectedOptions?.[0];
        const isPaintLayer = typeSelect?.value === 'paint_layer';
        const isLinear = isRoomRepairWallLinearCover(cover);
        const maxArea = Number(Math.max(0.1, isLinear ? 300 : (isPaintLayer ? wallsArea : (wallsArea - usedArea))).toFixed(2));
        const rawArea = parseFloat(String(areaInput?.value || '').replace(',', '.'));
        const area = Number(Math.max(0.1, Math.min(maxArea, Number.isFinite(rawArea) ? rawArea : maxArea)).toFixed(2));
        if (!isPaintLayer && !isLinear) usedArea += area;
        return {
          id,
          cover,
          area,
          zoneType: typeSelect?.value || (index ? 'remainder' : 'full'),
          zoneLabel: selectedType?.dataset?.label || (index ? 'Остаток стен' : 'Все стены'),
          zoneHint: selectedType?.dataset?.hint || '',
          wallLayer,
          isLayer: wallLayer > 1 || typeSelect?.value === 'paint_layer',
          linkedZoneId
        };
      });
    }

    function setRoomRepairWallZoneSelections(rows = [], actionLabel = 'Обновлены покрытия стен', recordHistory = true) {
      const textarea = document.querySelector('[data-repair-section="walls"]');
      if (!textarea) return;
      const validRows = (rows || []).filter(row => Number(row.area || 0) > 0);
      const existingItems = splitRoomRepairSectionTextarea(textarea.value);
      const detailItems = existingItems.filter(item => !isRoomRepairPrimaryWallCover(item) && !/выберите покрытие/i.test(item));
      const zoneLabels = validRows.map(formatRoomRepairWallZoneLabel);
      textarea.value = [...zoneLabels, ...detailItems].slice(0, 28).join('\n');

      const existingStructured = readRoomRepairDraftStructuredSelections()
        .filter(selection => !(selection.section === 'walls' && selection.nodeKey === 'finishWalls' && selection.source === 'wall-zone-cover'))
        .filter(selection => !(selection.section === 'walls' && isRoomRepairPrimaryWallCover(selection.label) && ['builder', 'manual', 'auto'].includes(selection.source)));
      const node = getRoomRepairBuilderNode('finishWalls');
      const zoneSelections = validRows.map((row, index) => {
        const label = formatRoomRepairWallZoneLabel(row);
        const rule = getRoomRepairBuilderWorkRule('wall', row.cover) || getRoomRepairBuilderWorkRule('walls', row.cover);
        return createRoomRepairBuilderStructuredSelection(node, label, {
          source: 'wall-zone-cover',
          quantity: row.area,
          quantityLabel: isRoomRepairWallLinearCover(row.cover) ? 'м.п.' : 'м²',
          quantitySource: row.zoneType || 'custom',
          zoneKey: row.id || `wall_zone_${index + 1}`,
          zoneLabel: row.zoneLabel || `Покрытие ${index + 1}`,
          zoneHint: row.zoneHint || '',
          zoneDefaultQty: row.area,
          zoneCover: row.cover || '',
          wallLayer: getRoomRepairWallRowLayer(row),
          linkedZoneId: row.linkedZoneId || '',
          workId: rule?.workId || '',
          targetCategory: rule?.targetCategory || '',
          qtyMode: rule?.qtyMode || (isRoomRepairWallLinearCover(row.cover) ? 'perimeter' : 'wallsArea')
        });
      });
      if (recordHistory) pushRoomRepairDraftHistory(actionLabel);
      setRoomRepairDraftStructuredSelections([...existingStructured, ...zoneSelections]);
    }

    function syncRoomRepairWallZonesFromCards(rerenderWorkspace = false) {
      const activeLayer = getRoomRepairWallActiveLayer();
      const currentRows = readRoomRepairWallZoneDraftFromCards();
      const { room } = getRoomRepairDraftContext();
      const existingRows = getRoomRepairWallZoneRows(collectRoomRepairDraftSections().walls || [], {
        room,
        roomMetrics: room ? getRoomRepairMetrics(room) : {},
        structuredSelections: readRoomRepairDraftStructuredSelections(),
        activeWallLayer: activeLayer
      }).rows.filter(row => row.cover && getRoomRepairWallRowLayer(row) !== activeLayer);
      const rows = [...existingRows, ...currentRows];
      setRoomRepairWallZoneSelections(rows, 'Изменены зоны покрытия стен', Boolean(rerenderWorkspace));
      refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShellPreservingScroll(Boolean(rerenderWorkspace));
    }

    window.syncRoomRepairWallZonesFromCards = syncRoomRepairWallZonesFromCards;

    function selectRoomRepairWallZone(zoneId) {
      const shell = getRoomRepairDraftShell();
      if (shell) shell.dataset.activeWallZone = zoneId;
      const changed = ensureRoomRepairSingleDetailDefaults('finishWalls');
      if (!changed) setRoomRepairBuilderDetailProgress('finishWalls', zoneId, '');
      if (changed) refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.selectRoomRepairWallZone = selectRoomRepairWallZone;

    function selectRoomRepairWallLayer(layer = 1) {
      const safeLayer = Math.max(1, Math.min(ROOM_REPAIR_MAX_WALL_LAYERS, Number(layer || 1)));
      const shell = getRoomRepairDraftShell();
      if (shell) {
        shell.dataset.activeWallLayer = String(safeLayer);
        const { room } = getRoomRepairDraftContext();
        const rows = getRoomRepairWallZoneRows(collectRoomRepairDraftSections().walls || [], {
          room,
          roomMetrics: room ? getRoomRepairMetrics(room) : {},
          structuredSelections: readRoomRepairDraftStructuredSelections(),
          activeWallLayer: safeLayer
        }).rows.filter(row => getRoomRepairWallRowLayer(row) === safeLayer);
        shell.dataset.activeWallZone = rows[0]?.id || `wall_layer_${safeLayer}_zone_1`;
      }
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.selectRoomRepairWallLayer = selectRoomRepairWallLayer;

    function addRoomRepairWallLayer() {
      const { room } = getRoomRepairDraftContext();
      const rows = getRoomRepairWallZoneRows(collectRoomRepairDraftSections().walls || [], {
        room,
        roomMetrics: room ? getRoomRepairMetrics(room) : {},
        structuredSelections: readRoomRepairDraftStructuredSelections(),
        activeWallLayer: getRoomRepairWallActiveLayer()
      }).rows.filter(row => row.cover);
      const used = Array.from(new Set(rows.map(getRoomRepairWallRowLayer))).sort((a, b) => a - b);
      const nextLayer = Math.min(ROOM_REPAIR_MAX_WALL_LAYERS, Math.max(1, ...(used.length ? used : [1])) + 1);
      selectRoomRepairWallLayer(nextLayer);
    }

    window.addRoomRepairWallLayer = addRoomRepairWallLayer;

    function addRoomRepairWallLayerCard(layer = getRoomRepairWallActiveLayer()) {
      const safeLayer = Math.max(2, Math.min(ROOM_REPAIR_MAX_WALL_LAYERS, Number(layer || 2)));
      const { room } = getRoomRepairDraftContext();
      const metrics = room ? getRoomRepairMetrics(room) : {};
      const wallsArea = Number(Math.max(0.1, Number(metrics.wallsArea || room?.wallsArea || 1)).toFixed(2));
      const currentRows = readRoomRepairWallZoneDraftFromCards();
      const existingRows = getRoomRepairWallZoneRows(collectRoomRepairDraftSections().walls || [], {
        room,
        roomMetrics: metrics,
        structuredSelections: readRoomRepairDraftStructuredSelections(),
        activeWallLayer: safeLayer
      }).rows.filter(row => row.cover && getRoomRepairWallRowLayer(row) !== safeLayer);
      const layerRows = currentRows.filter(row => getRoomRepairWallRowLayer(row) === safeLayer);
      const nextId = createRoomRepairWallLayerZoneId(safeLayer, [...existingRows, ...layerRows]);
      const nextRow = {
        id: nextId,
        cover: '',
        area: wallsArea,
        zoneType: 'layer',
        zoneLabel: `Слой ${safeLayer}`,
        zoneHint: 'Дополнительное покрытие поверх основного слоя',
        isPlaceholder: true,
        isLayer: true,
        wallLayer: safeLayer
      };
      const nextRows = [...existingRows, ...layerRows, nextRow];
      setRoomRepairWallZoneSelections(nextRows, 'Добавлена карточка верхнего слоя');
      const shell = getRoomRepairDraftShell();
      if (shell) {
        shell.dataset.activeWallLayer = String(safeLayer);
        shell.dataset.activeWallZone = nextId;
        shell.dataset.wallCoverPickerOpen = 'true';
      }
      refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.addRoomRepairWallLayerCard = addRoomRepairWallLayerCard;

    function updateRoomRepairWallZoneType(zoneId) {
      const escapedId = roomRepairCssEscape(zoneId);
      const select = document.querySelector(`[data-wall-zone-type="${escapedId}"]`);
      const input = document.querySelector(`[data-wall-zone-area="${escapedId}"]`);
      const selected = select?.selectedOptions?.[0];
      if (selected && input && select.value !== 'custom') {
        input.value = Number(selected.dataset.area || input.value || 0).toFixed(2);
      }
      const shell = getRoomRepairDraftShell();
      if (shell) shell.dataset.activeWallZone = zoneId;
      syncRoomRepairWallZonesFromCards(true);
    }

    window.updateRoomRepairWallZoneType = updateRoomRepairWallZoneType;

    function setRoomRepairWallZoneCover(optionIndex) {
      const node = getRoomRepairBuilderNode('finishWalls');
      const cover = getRoomRepairBuilderOptionText((node.options || [])[Number(optionIndex)]);
      if (!cover) return;
      const rows = readRoomRepairWallZoneDraftFromCards();
      const shell = getRoomRepairDraftShell();
      const activeLayer = getRoomRepairWallActiveLayer();
      const isUpperCover = isRoomRepairWallUpperLayerCover(cover);
      const { room } = getRoomRepairDraftContext();
      const metrics = room ? getRoomRepairMetrics(room) : {};
      const moldingLength = getRoomRepairPerimeterValue(room || {}, metrics);

      if (activeLayer === 1 && isUpperCover) {
        const allRows = getRoomRepairWallZoneRows(collectRoomRepairDraftSections().walls || [], {
          room,
          roomMetrics: metrics,
          structuredSelections: readRoomRepairDraftStructuredSelections(),
          activeWallLayer: 2
        }).rows;
        const hasBaseCover = allRows.some(row =>
          getRoomRepairWallRowLayer(row) === 1
          && row.cover
          && !isRoomRepairWallUpperLayerCover(row.cover)
        );
        if (!hasBaseCover) {
          showRoomRepairWallLayerNotice('Сначала выберите основное покрытие стен. Декоративные элементы добавляются поверх базового слоя.');
          return;
        }
        const layer = 2;
        const baseAndOtherRows = allRows.filter(row => getRoomRepairWallRowLayer(row) !== layer);
        const layerRows = allRows.filter(row => getRoomRepairWallRowLayer(row) === layer && row.cover);
        const newId = createRoomRepairWallLayerZoneId(layer, allRows);
        const nextRow = {
          id: newId,
          cover,
          area: isRoomRepairWallLinearCover(cover) ? Number(Math.max(4, moldingLength).toFixed(2)) : Number(Math.max(0.1, Number(metrics.wallsArea || room?.wallsArea || 1)).toFixed(2)),
          zoneType: 'layer',
          zoneLabel: isRoomRepairWallLinearCover(cover) ? 'Декоративный слой' : `Слой ${layer}`,
          zoneHint: isRoomRepairWallLinearCover(cover) ? 'Длина молдингов / профилей в погонных метрах' : 'Дополнительное покрытие поверх основного слоя',
          isLayer: true,
          wallLayer: layer
        };
        setRoomRepairWallZoneSelections([...baseAndOtherRows, ...layerRows, nextRow], `Выбрано покрытие верхнего слоя: ${cover}`);
        if (shell) {
          shell.dataset.activeWallLayer = String(layer);
          shell.dataset.activeWallZone = newId;
          shell.dataset.wallCoverPickerOpen = 'true';
        }
        const changed = ensureRoomRepairSingleDetailDefaults('finishWalls');
        if (!changed) setRoomRepairBuilderDetailProgress('finishWalls', newId, '');
        refreshRoomRepairDraftPreview(true);
        refreshRoomRepairBuilderShellPreservingScroll(true);
        return;
      }

      const activeId = shell?.dataset.activeWallZone || rows[0]?.id || 'wall_zone_1';
      const targetIndex = Math.max(0, rows.findIndex(row => row.id === activeId));
      const nextRows = rows.map((row, index) => index === targetIndex
        ? {
            ...row,
            cover,
            area: isRoomRepairWallLinearCover(cover) ? Number(Math.max(4, moldingLength).toFixed(2)) : row.area,
            zoneType: isRoomRepairWallLinearCover(cover) ? 'layer' : row.zoneType,
            zoneLabel: isRoomRepairWallLinearCover(cover) ? 'Декоративный слой' : row.zoneLabel,
            zoneHint: isRoomRepairWallLinearCover(cover) ? 'Длина молдингов / профилей в погонных метрах' : row.zoneHint
          }
        : row);
      const targetId = nextRows[targetIndex]?.id || activeId;
      if (shell) shell.dataset.activeWallZone = targetId;
      removeRoomRepairBuilderDetailGroupsSelections('finishWalls', ['Формат покрытия', 'Класс покрытия', 'Тип покрытия', 'Система / эффект', 'Рисунок / раппорт', 'Форма покрытия', 'Размер покрытия', 'Цветовая гамма', 'Фактура', 'Защитный финиш', 'Финиш профиля'], targetId);
      const existingRows = getRoomRepairWallZoneRows(collectRoomRepairDraftSections().walls || [], {
        room,
        roomMetrics: room ? getRoomRepairMetrics(room) : {},
        structuredSelections: readRoomRepairDraftStructuredSelections(),
        activeWallLayer: activeLayer
      }).rows.filter(row => row.cover && getRoomRepairWallRowLayer(row) !== activeLayer);
      setRoomRepairWallZoneSelections([...existingRows, ...nextRows], `Выбрано покрытие стен: ${cover}`);
      const changed = ensureRoomRepairSingleDetailDefaults('finishWalls');
      if (!changed) setRoomRepairBuilderDetailProgress('finishWalls', targetId, '');
      refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.setRoomRepairWallZoneCover = setRoomRepairWallZoneCover;

    function readRoomRepairCeilingZoneDraftFromCards() {
      const { room } = getRoomRepairDraftContext();
      const metrics = room ? getRoomRepairMetrics(room) : {};
      const ceilingArea = Number(Math.max(0.1, Number(metrics.ceilingArea || room?.ceilingArea || room?.area || 1)).toFixed(2));
      const cards = Array.from(document.querySelectorAll('[data-ceiling-zone-card]'));
      let usedArea = 0;
      return cards.map((card, index) => {
        const id = card.getAttribute('data-ceiling-zone-card') || `ceiling_zone_${index + 1}`;
        const cover = card.getAttribute('data-ceiling-zone-cover') || '';
        const ceilingLayer = Number(card.getAttribute('data-ceiling-layer') || getRoomRepairCeilingActiveLayer() || 1);
        const linkedZoneId = card.getAttribute('data-ceiling-linked-zone') || '';
        const escapedId = roomRepairCssEscape(id);
        const typeSelect = document.querySelector(`[data-ceiling-zone-type="${escapedId}"]`);
        const areaInput = document.querySelector(`[data-ceiling-zone-area="${escapedId}"]`);
        const selectedType = typeSelect?.selectedOptions?.[0];
        const zoneType = typeSelect?.value || (index ? 'remainder' : 'full');
        const isLinear = isRoomRepairCeilingLinearCover(cover) || ['line', 'profile', 'cornice', 'light_line', 'perimeter'].includes(zoneType);
        const isPoint = isRoomRepairCeilingPointCover(cover) || zoneType === 'point';
        const isLayer = ceilingLayer > 1 || zoneType === 'layer' || isLinear || isPoint;
        const maxArea = Number(Math.max(0.1, isPoint ? 100 : (isLinear ? 500 : (isLayer ? ceilingArea : (ceilingArea - usedArea)))).toFixed(2));
        const rawArea = parseFloat(String(areaInput?.value || '').replace(',', '.'));
        const area = Number(Math.max(0.1, Math.min(maxArea, Number.isFinite(rawArea) ? rawArea : maxArea)).toFixed(2));
        if (!isLayer && !isLinear && !isPoint) usedArea += area;
        return {
          id,
          cover,
          area,
          zoneType,
          zoneLabel: selectedType?.dataset?.label || (index ? 'Остаток потолка' : 'Весь потолок'),
          zoneHint: selectedType?.dataset?.hint || '',
          ceilingLayer,
          isLayer,
          linkedZoneId
        };
      });
    }

    function setRoomRepairCeilingZoneSelections(rows = [], actionLabel = 'Обновлена потолочная схема', recordHistory = true) {
      const textarea = document.querySelector('[data-repair-section="ceiling"]');
      if (!textarea) return;
      const validRows = (rows || []).filter(row => Number(row.area || 0) > 0);
      const existingItems = splitRoomRepairSectionTextarea(textarea.value);
      const detailItems = existingItems.filter(item => !isRoomRepairPrimaryCeilingCover(item) && !/выберите решение/i.test(item));
      const zoneLabels = validRows.map(formatRoomRepairCeilingZoneLabel);
      textarea.value = [...zoneLabels, ...detailItems].slice(0, 32).join('\n');

      const existingStructured = readRoomRepairDraftStructuredSelections()
        .filter(selection => !(selection.section === 'ceiling' && selection.nodeKey === 'finishCeiling' && selection.source === 'ceiling-zone-cover'))
        .filter(selection => !(selection.section === 'ceiling' && isRoomRepairPrimaryCeilingCover(selection.label) && ['builder', 'manual', 'auto'].includes(selection.source)));
      const node = getRoomRepairBuilderNode('finishCeiling');
      const zoneSelections = validRows.map((row, index) => {
        const label = formatRoomRepairCeilingZoneLabel(row);
        const rule = getRoomRepairBuilderWorkRule('ceiling', row.cover);
        const isLinear = isRoomRepairCeilingLinearCover(row.cover) || ['line', 'profile', 'cornice', 'light_line', 'perimeter'].includes(row.zoneType);
        const isPoint = isRoomRepairCeilingPointCover(row.cover) || row.zoneType === 'point';
        return createRoomRepairBuilderStructuredSelection(node, label, {
          source: 'ceiling-zone-cover',
          quantity: row.area,
          quantityLabel: isPoint ? 'шт.' : (isLinear ? 'м.п.' : 'м²'),
          quantitySource: row.zoneType || 'custom',
          zoneKey: row.id || `ceiling_zone_${index + 1}`,
          zoneLabel: row.zoneLabel || `Решение ${index + 1}`,
          zoneHint: row.zoneHint || '',
          zoneDefaultQty: row.area,
          zoneCover: row.cover || '',
          ceilingLayer: getRoomRepairCeilingRowLayer(row),
          linkedZoneId: row.linkedZoneId || '',
          workId: rule?.workId || '',
          targetCategory: rule?.targetCategory || '',
          qtyMode: rule?.qtyMode || (isPoint ? 'parsedQty' : (isLinear ? 'lightingLength' : 'ceilingArea'))
        });
      });
      if (recordHistory) pushRoomRepairDraftHistory(actionLabel);
      setRoomRepairDraftStructuredSelections([...existingStructured, ...zoneSelections]);
    }

    function syncRoomRepairCeilingZonesFromCards(rerenderWorkspace = false) {
      const activeLayer = getRoomRepairCeilingActiveLayer();
      const currentRows = readRoomRepairCeilingZoneDraftFromCards();
      const { room } = getRoomRepairDraftContext();
      const existingRows = getRoomRepairCeilingZoneRows(collectRoomRepairDraftSections().ceiling || [], {
        room,
        roomMetrics: room ? getRoomRepairMetrics(room) : {},
        structuredSelections: readRoomRepairDraftStructuredSelections(),
        activeCeilingLayer: activeLayer
      }).rows.filter(row => row.cover && getRoomRepairCeilingRowLayer(row) !== activeLayer);
      const rows = [...existingRows, ...currentRows];
      setRoomRepairCeilingZoneSelections(rows, 'Изменена потолочная схема', Boolean(rerenderWorkspace));
      refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShellPreservingScroll(Boolean(rerenderWorkspace));
    }

    window.syncRoomRepairCeilingZonesFromCards = syncRoomRepairCeilingZonesFromCards;

    function selectRoomRepairCeilingZone(zoneId) {
      const shell = getRoomRepairDraftShell();
      if (shell) shell.dataset.activeCeilingZone = zoneId;
      const changed = ensureRoomRepairSingleDetailDefaults('finishCeiling');
      if (!changed) setRoomRepairBuilderDetailProgress('finishCeiling', zoneId, '');
      if (changed) refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.selectRoomRepairCeilingZone = selectRoomRepairCeilingZone;

    function selectRoomRepairCeilingLayer(layer = 1) {
      const safeLayer = Math.max(1, Math.min(ROOM_REPAIR_MAX_CEILING_LAYERS, Number(layer || 1)));
      const shell = getRoomRepairDraftShell();
      if (shell) {
        shell.dataset.activeCeilingLayer = String(safeLayer);
        const { room } = getRoomRepairDraftContext();
        const rows = getRoomRepairCeilingZoneRows(collectRoomRepairDraftSections().ceiling || [], {
          room,
          roomMetrics: room ? getRoomRepairMetrics(room) : {},
          structuredSelections: readRoomRepairDraftStructuredSelections(),
          activeCeilingLayer: safeLayer
        }).rows.filter(row => getRoomRepairCeilingRowLayer(row) === safeLayer);
        shell.dataset.activeCeilingZone = rows[0]?.id || `ceiling_layer_${safeLayer}_zone_1`;
      }
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.selectRoomRepairCeilingLayer = selectRoomRepairCeilingLayer;

    function addRoomRepairCeilingLayer() {
      const { room } = getRoomRepairDraftContext();
      const rows = getRoomRepairCeilingZoneRows(collectRoomRepairDraftSections().ceiling || [], {
        room,
        roomMetrics: room ? getRoomRepairMetrics(room) : {},
        structuredSelections: readRoomRepairDraftStructuredSelections(),
        activeCeilingLayer: getRoomRepairCeilingActiveLayer()
      }).rows.filter(row => row.cover);
      const used = Array.from(new Set(rows.map(getRoomRepairCeilingRowLayer))).sort((a, b) => a - b);
      const nextLayer = Math.min(ROOM_REPAIR_MAX_CEILING_LAYERS, Math.max(1, ...(used.length ? used : [1])) + 1);
      selectRoomRepairCeilingLayer(nextLayer);
    }

    window.addRoomRepairCeilingLayer = addRoomRepairCeilingLayer;

    function addRoomRepairCeilingLayerCard(layer = getRoomRepairCeilingActiveLayer()) {
      const safeLayer = Math.max(2, Math.min(ROOM_REPAIR_MAX_CEILING_LAYERS, Number(layer || 2)));
      const { room } = getRoomRepairDraftContext();
      const metrics = room ? getRoomRepairMetrics(room) : {};
      const ceilingArea = Number(Math.max(0.1, Number(metrics.ceilingArea || room?.ceilingArea || room?.area || 1)).toFixed(2));
      const currentRows = readRoomRepairCeilingZoneDraftFromCards();
      const existingRows = getRoomRepairCeilingZoneRows(collectRoomRepairDraftSections().ceiling || [], {
        room,
        roomMetrics: metrics,
        structuredSelections: readRoomRepairDraftStructuredSelections(),
        activeCeilingLayer: safeLayer
      }).rows.filter(row => row.cover && getRoomRepairCeilingRowLayer(row) !== safeLayer);
      const layerRows = currentRows.filter(row => getRoomRepairCeilingRowLayer(row) === safeLayer);
      const nextId = createRoomRepairCeilingLayerZoneId(safeLayer, [...existingRows, ...layerRows]);
      const nextRow = {
        id: nextId,
        cover: '',
        area: ceilingArea,
        zoneType: 'layer',
        zoneLabel: `Слой ${safeLayer}`,
        zoneHint: 'Дополнительный уровень или узел потолка',
        isPlaceholder: true,
        isLayer: true,
        ceilingLayer: safeLayer
      };
      setRoomRepairCeilingZoneSelections([...existingRows, ...layerRows, nextRow], 'Добавлена карточка потолочного слоя');
      const shell = getRoomRepairDraftShell();
      if (shell) {
        shell.dataset.activeCeilingLayer = String(safeLayer);
        shell.dataset.activeCeilingZone = nextId;
        shell.dataset.ceilingCoverPickerOpen = 'true';
      }
      refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.addRoomRepairCeilingLayerCard = addRoomRepairCeilingLayerCard;

    function updateRoomRepairCeilingZoneType(zoneId) {
      const escapedId = roomRepairCssEscape(zoneId);
      const select = document.querySelector(`[data-ceiling-zone-type="${escapedId}"]`);
      const input = document.querySelector(`[data-ceiling-zone-area="${escapedId}"]`);
      const selected = select?.selectedOptions?.[0];
      if (selected && input && select.value !== 'custom') {
        input.value = Number(selected.dataset.area || input.value || 0).toFixed(2);
      }
      const shell = getRoomRepairDraftShell();
      if (shell) shell.dataset.activeCeilingZone = zoneId;
      syncRoomRepairCeilingZonesFromCards(true);
    }

    window.updateRoomRepairCeilingZoneType = updateRoomRepairCeilingZoneType;

    function setRoomRepairCeilingZoneCover(optionIndex) {
      const node = getRoomRepairBuilderNode('finishCeiling');
      const cover = getRoomRepairBuilderOptionText((node.options || [])[Number(optionIndex)]);
      if (!cover) return;
      const rows = readRoomRepairCeilingZoneDraftFromCards();
      const shell = getRoomRepairDraftShell();
      const activeLayer = getRoomRepairCeilingActiveLayer();
      const { room } = getRoomRepairDraftContext();
      const metrics = room ? getRoomRepairMetrics(room) : {};
      const ceilingArea = Number(Math.max(0.1, Number(metrics.ceilingArea || room?.ceilingArea || room?.area || 1)).toFixed(2));
      const perimeter = getRoomRepairPerimeterValue(room || {}, metrics);
      const isUpperCover = isRoomRepairCeilingUpperLayerCover(cover);
      const isLinear = isRoomRepairCeilingLinearCover(cover);
      const isPoint = isRoomRepairCeilingPointCover(cover);

      if (activeLayer === 1 && isUpperCover && (isLinear || isPoint || /многоуровн|гкл/.test(normalizeRoomRepairBuilderLabel(cover)))) {
        const allRows = getRoomRepairCeilingZoneRows(collectRoomRepairDraftSections().ceiling || [], {
          room,
          roomMetrics: metrics,
          structuredSelections: readRoomRepairDraftStructuredSelections(),
          activeCeilingLayer: 2
        }).rows;
        const layer = 2;
        const baseAndOtherRows = allRows.filter(row => getRoomRepairCeilingRowLayer(row) !== layer);
        const layerRows = allRows.filter(row => getRoomRepairCeilingRowLayer(row) === layer && row.cover);
        const newId = createRoomRepairCeilingLayerZoneId(layer, allRows);
        const nextRow = {
          id: newId,
          cover,
          area: isPoint ? 1 : (isLinear ? Number(Math.max(2, /карниз|ниша|тенев/.test(normalizeRoomRepairBuilderLabel(cover)) ? perimeter : Math.sqrt(ceilingArea)).toFixed(2)) : ceilingArea),
          zoneType: isPoint ? 'point' : (isLinear ? (/карниз|ниша|тенев/.test(normalizeRoomRepairBuilderLabel(cover)) ? 'perimeter' : 'line') : 'layer'),
          zoneLabel: isPoint ? 'Точечный узел' : (isLinear ? 'Линейный узел' : `Слой ${layer}`),
          zoneHint: isPoint ? 'Количество точечных потолочных узлов' : (isLinear ? 'Длина профиля, линии или карниза' : 'Дополнительный уровень потолка'),
          isLayer: true,
          ceilingLayer: layer
        };
        setRoomRepairCeilingZoneSelections([...baseAndOtherRows, ...layerRows, nextRow], `Выбрано решение потолка: ${cover}`);
        if (shell) {
          shell.dataset.activeCeilingLayer = String(layer);
          shell.dataset.activeCeilingZone = newId;
          shell.dataset.ceilingCoverPickerOpen = 'true';
        }
        const changed = ensureRoomRepairSingleDetailDefaults('finishCeiling');
        if (!changed) setRoomRepairBuilderDetailProgress('finishCeiling', newId, '');
        refreshRoomRepairDraftPreview(true);
        refreshRoomRepairBuilderShellPreservingScroll(true);
        return;
      }

      const activeId = shell?.dataset.activeCeilingZone || rows[0]?.id || 'ceiling_zone_1';
      const targetIndex = Math.max(0, rows.findIndex(row => row.id === activeId));
      const nextRows = rows.map((row, index) => index === targetIndex
        ? {
            ...row,
            cover,
            area: isPoint ? 1 : (isLinear ? Number(Math.max(2, /карниз|ниша|тенев/.test(normalizeRoomRepairBuilderLabel(cover)) ? perimeter : Math.sqrt(ceilingArea)).toFixed(2)) : row.area),
            zoneType: isPoint ? 'point' : (isLinear ? (/карниз|ниша|тенев/.test(normalizeRoomRepairBuilderLabel(cover)) ? 'perimeter' : 'line') : row.zoneType),
            zoneLabel: isPoint ? 'Точечный узел' : (isLinear ? 'Линейный узел' : row.zoneLabel),
            zoneHint: isPoint ? 'Количество точечных потолочных узлов' : (isLinear ? 'Длина профиля, линии или карниза' : row.zoneHint),
            isLayer: row.isLayer || activeLayer > 1 || isLinear || isPoint,
            ceilingLayer: activeLayer
          }
        : row);
      const targetId = nextRows[targetIndex]?.id || activeId;
      if (shell) shell.dataset.activeCeilingZone = targetId;
      removeRoomRepairBuilderDetailGroupsSelections('finishCeiling', ['Тип потолка', 'Материал / система', 'Фактура / поверхность', 'Цветовая гамма', 'Способ монтажа'], targetId);
      const existingRows = getRoomRepairCeilingZoneRows(collectRoomRepairDraftSections().ceiling || [], {
        room,
        roomMetrics: metrics,
        structuredSelections: readRoomRepairDraftStructuredSelections(),
        activeCeilingLayer: activeLayer
      }).rows.filter(row => row.cover && getRoomRepairCeilingRowLayer(row) !== activeLayer);
      setRoomRepairCeilingZoneSelections([...existingRows, ...nextRows], `Выбрано решение потолка: ${cover}`);
      const changed = ensureRoomRepairSingleDetailDefaults('finishCeiling');
      if (!changed) setRoomRepairBuilderDetailProgress('finishCeiling', targetId, '');
      refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.setRoomRepairCeilingZoneCover = setRoomRepairCeilingZoneCover;

    function removeRoomRepairZoneDetailSelections(nodeKey = '', zoneKey = '') {
      if (!nodeKey || !zoneKey) return;
      const selections = readRoomRepairDraftStructuredSelections();
      const removed = selections.filter(selection => selection.nodeKey === nodeKey
        && selection.source === 'detail'
        && selection.zoneKey === zoneKey);
      const labelsBySection = removed.reduce((acc, selection) => {
        if (!acc[selection.section]) acc[selection.section] = [];
        acc[selection.section].push(selection.label);
        return acc;
      }, {});
      Object.entries(labelsBySection).forEach(([sectionKey, labels]) => {
        const textarea = document.querySelector(`[data-repair-section="${sectionKey}"]`);
        if (!textarea) return;
        let items = splitRoomRepairSectionTextarea(textarea.value);
        labels.forEach(label => {
          const index = items.findIndex(item => item === label);
          if (index >= 0) items.splice(index, 1);
        });
        textarea.value = items.join('\n');
      });
      setRoomRepairDraftStructuredSelections(selections.filter(selection => !(selection.nodeKey === nodeKey
        && selection.source === 'detail'
        && selection.zoneKey === zoneKey)));
    }

    function getRoomRepairRowsForZoneAction(nodeKey = '') {
      const { room } = getRoomRepairDraftContext();
      const sections = collectRoomRepairDraftSections();
      const structuredSelections = readRoomRepairDraftStructuredSelections();
      const context = {
        room,
        roomMetrics: room ? getRoomRepairMetrics(room) : {},
        structuredSelections,
        activeWallLayer: getRoomRepairWallActiveLayer(),
        activeCeilingLayer: getRoomRepairCeilingActiveLayer()
      };
      if (nodeKey === 'finishWalls') return getRoomRepairWallZoneRows(sections.walls || [], context).rows;
      if (nodeKey === 'finishCeiling') return getRoomRepairCeilingZoneRows(sections.ceiling || [], context).rows;
      return getRoomRepairFloorZoneRows(sections.floor || [], context).rows;
    }

    function persistRoomRepairRowsForZoneAction(nodeKey = '', rows = [], actionLabel = '') {
      if (nodeKey === 'finishWalls') {
        setRoomRepairWallZoneSelections(rows, actionLabel || 'Обновлены карточки стен');
      } else if (nodeKey === 'finishCeiling') {
        setRoomRepairCeilingZoneSelections(rows, actionLabel || 'Обновлены карточки потолка');
      } else {
        setRoomRepairFloorZoneSelections(rows, actionLabel || 'Обновлены карточки пола');
        syncRoomRepairFloorAreaLinkedDetails(rows);
      }
    }

    function normalizeRoomRepairWallLayerRows(rows = []) {
      const usedLayers = Array.from(new Set((rows || [])
        .filter(row => row.cover)
        .map(getRoomRepairWallRowLayer)
        .filter(layer => layer > 1)))
        .sort((a, b) => a - b);
      const layerMap = usedLayers.reduce((acc, layer, index) => {
        acc[layer] = index + 2;
        return acc;
      }, {});
      return (rows || []).map(row => {
        const layer = getRoomRepairWallRowLayer(row);
        if (layer <= 1) return { ...row, wallLayer: 1, isLayer: false };
        const nextLayer = layerMap[layer];
        if (!nextLayer) return row;
        return {
          ...row,
          wallLayer: nextLayer,
          isLayer: true,
          zoneLabel: /^Слой\s+\d+/i.test(String(row.zoneLabel || '')) ? `Слой ${nextLayer}` : row.zoneLabel
        };
      });
    }

    function normalizeRoomRepairCeilingLayerRows(rows = []) {
      const usedLayers = Array.from(new Set((rows || [])
        .filter(row => row.cover)
        .map(getRoomRepairCeilingRowLayer)
        .filter(layer => layer > 1)))
        .sort((a, b) => a - b);
      const layerMap = usedLayers.reduce((acc, layer, index) => {
        acc[layer] = index + 2;
        return acc;
      }, {});
      return (rows || []).map(row => {
        const layer = getRoomRepairCeilingRowLayer(row);
        if (layer <= 1) return { ...row, ceilingLayer: 1, isLayer: false };
        const nextLayer = layerMap[layer];
        if (!nextLayer) return row;
        return {
          ...row,
          ceilingLayer: nextLayer,
          isLayer: true,
          zoneLabel: /^Слой\s+\d+/i.test(String(row.zoneLabel || '')) ? `Слой ${nextLayer}` : row.zoneLabel
        };
      });
    }

    function clearRoomRepairZoneCard(nodeKey = '', zoneKey = '') {
      const rows = getRoomRepairRowsForZoneAction(nodeKey);
      const target = rows.find(row => row.id === zoneKey);
      if (!target) return;
      const nextRows = rows.map(row => row.id === zoneKey
        ? {
            ...row,
            cover: '',
            zoneType: row.zoneType || 'custom',
            zoneLabel: row.zoneLabel || 'Своя зона',
            zoneHint: row.zoneHint || 'Площадь сохранена, выберите покрытие и параметры заново'
          }
        : row);
      persistRoomRepairRowsForZoneAction(nodeKey, nextRows, 'Очищена карточка покрытия');
      removeRoomRepairZoneDetailSelections(nodeKey, zoneKey);
      const shell = getRoomRepairDraftShell();
      if (shell) {
        if (nodeKey === 'finishWalls') shell.dataset.activeWallZone = zoneKey;
        if (nodeKey === 'finishFloor') shell.dataset.activeFloorZone = zoneKey;
        if (nodeKey === 'finishCeiling') shell.dataset.activeCeilingZone = zoneKey;
      }
      refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.clearRoomRepairZoneCard = clearRoomRepairZoneCard;

    function deleteRoomRepairZoneCard(nodeKey = '', zoneKey = '') {
      const rows = getRoomRepairRowsForZoneAction(nodeKey).filter(row => row.id);
      const target = rows.find(row => row.id === zoneKey);
      if (!target) return;
      const layer = nodeKey === 'finishWalls'
        ? getRoomRepairWallRowLayer(target)
        : (nodeKey === 'finishCeiling' ? getRoomRepairCeilingRowLayer(target) : 1);
      if (nodeKey === 'finishWalls' && layer > 1) {
        const remainingRows = rows.filter(row => row.id !== zoneKey);
        const nextRows = normalizeRoomRepairWallLayerRows(remainingRows);
        persistRoomRepairRowsForZoneAction(nodeKey, nextRows, 'Удалена карточка верхнего слоя');
        removeRoomRepairZoneDetailSelections(nodeKey, zoneKey);
        const shell = getRoomRepairDraftShell();
        if (shell) {
          const nextLayer = Math.max(1, Math.min(layer, Math.max(1, ...nextRows.filter(row => row.cover).map(getRoomRepairWallRowLayer))));
          const nextActive = nextRows.find(row => getRoomRepairWallRowLayer(row) === nextLayer)?.id || 'wall_zone_1';
          shell.dataset.activeWallLayer = String(nextLayer);
          shell.dataset.activeWallZone = nextActive;
        }
        refreshRoomRepairDraftPreview(true);
        refreshRoomRepairBuilderShellPreservingScroll(true);
        return;
      }
      if (nodeKey === 'finishCeiling' && layer > 1) {
        const nextRows = normalizeRoomRepairCeilingLayerRows(rows.filter(row => row.id !== zoneKey));
        persistRoomRepairRowsForZoneAction(nodeKey, nextRows, 'Удалена карточка потолочного слоя');
        removeRoomRepairZoneDetailSelections(nodeKey, zoneKey);
        const shell = getRoomRepairDraftShell();
        if (shell) {
          const layerRows = nextRows.filter(row => getRoomRepairCeilingRowLayer(row) === layer && row.cover);
          const usedLayers = nextRows.filter(row => row.cover).map(getRoomRepairCeilingRowLayer);
          const nextLayer = layerRows.length ? layer : Math.max(1, Math.min(layer, Math.max(1, ...usedLayers)));
          shell.dataset.activeCeilingLayer = String(nextLayer);
          shell.dataset.activeCeilingZone = nextRows.find(row => getRoomRepairCeilingRowLayer(row) === nextLayer)?.id || 'ceiling_zone_1';
        }
        refreshRoomRepairDraftPreview(true);
        refreshRoomRepairBuilderShellPreservingScroll(true);
        return;
      }
      const comparableRows = rows.filter(row => {
        if (nodeKey === 'finishWalls') return getRoomRepairWallRowLayer(row) === layer;
        if (nodeKey === 'finishCeiling') return getRoomRepairCeilingRowLayer(row) === layer;
        return true;
      });
      const indexInLayer = comparableRows.findIndex(row => row.id === zoneKey);
      const isEdge = indexInLayer === 0 || indexInLayer === comparableRows.length - 1;
      if (!isEdge || comparableRows.length <= 1) {
        clearRoomRepairZoneCard(nodeKey, zoneKey);
        return;
      }
      const neighbor = comparableRows[indexInLayer - 1] || comparableRows[indexInLayer + 1];
      const nextRows = rows
        .filter(row => row.id !== zoneKey)
        .map(row => row.id === neighbor?.id
          ? {
              ...row,
              area: Number((Number(row.area || 0) + Number(target.area || 0)).toFixed(2)),
              zoneType: 'custom',
              zoneLabel: row.zoneLabel || 'Своя зона',
              zoneHint: 'Площадь увеличена после удаления соседней карточки'
            }
          : row);
      persistRoomRepairRowsForZoneAction(nodeKey, nextRows, 'Удалена карточка покрытия');
      removeRoomRepairZoneDetailSelections(nodeKey, zoneKey);
      const shell = getRoomRepairDraftShell();
      if (shell && neighbor?.id) {
        if (nodeKey === 'finishWalls') shell.dataset.activeWallZone = neighbor.id;
        if (nodeKey === 'finishFloor') shell.dataset.activeFloorZone = neighbor.id;
        if (nodeKey === 'finishCeiling') shell.dataset.activeCeilingZone = neighbor.id;
      }
      refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.deleteRoomRepairZoneCard = deleteRoomRepairZoneCard;

    function readRoomRepairBuilderZoneSelection(node, optionIndex, quantityConfig) {
      if (!quantityConfig?.zoneOptions?.length) return null;
      const select = document.getElementById(`roomRepairBuilderZone_${node.key}_${optionIndex}`);
      const zone = getRoomRepairZoneMeta(select?.value || quantityConfig.zoneKey || 'full', quantityConfig);
      return zone || null;
    }

    function readRoomRepairBuilderDetailZoneSelection(node, groupIndex, optionIndex, quantityConfig) {
      if (!quantityConfig?.zoneOptions?.length && quantityConfig?.zoneKey && quantityConfig?.linkedToFloorZone) {
        return {
          key: quantityConfig.zoneKey,
          label: quantityConfig.zoneLabel || 'Активная карточка покрытия',
          qty: Number(quantityConfig.value || quantityConfig.defaultValue || 0),
          hint: quantityConfig.zoneHint || 'Площадь берется из активной карточки покрытия'
        };
      }
      if (!quantityConfig?.zoneOptions?.length && quantityConfig?.zoneKey && quantityConfig?.linkedToWallZone) {
        return {
          key: quantityConfig.zoneKey,
          label: quantityConfig.zoneLabel || 'Активная карточка стен',
          qty: Number(quantityConfig.value || quantityConfig.defaultValue || 0),
          hint: quantityConfig.zoneHint || 'Площадь берется из активной карточки стен'
        };
      }
      if (!quantityConfig?.zoneOptions?.length && quantityConfig?.zoneKey && quantityConfig?.linkedToCeilingZone) {
        return {
          key: quantityConfig.zoneKey,
          label: quantityConfig.zoneLabel || 'Активная карточка потолка',
          qty: Number(quantityConfig.value || quantityConfig.defaultValue || 0),
          hint: quantityConfig.zoneHint || 'Количество берется из активной карточки потолка'
        };
      }
      if (!quantityConfig?.zoneOptions?.length) return null;
      const select = document.getElementById(`roomRepairBuilderDetailZone_${node.key}_${groupIndex}_${optionIndex}`);
      const zone = getRoomRepairZoneMeta(select?.value || quantityConfig.zoneKey || 'full', quantityConfig);
      return zone || null;
    }

    function addRoomRepairBuilderOption(nodeKey, optionIndex) {
      const node = getRoomRepairBuilderNode(nodeKey);
      if (!node?.section) return;
      const option = (node.options || [])[Number(optionIndex)];
      if (!option) return;
      const { room } = getRoomRepairDraftContext();
      const rawLabel = typeof option === 'string' ? option : option.label;
      const existingIndex = findRoomRepairSectionItemIndex(node.section, rawLabel);
      if (existingIndex >= 0) {
        if (node.section === 'floor' && isRoomRepairPrimaryFloorCover(rawLabel)) {
          pushRoomRepairDraftHistory(`Удалено покрытие: ${rawLabel}`);
          removeRoomRepairBuilderNodeSelections(node.key);
          refreshRoomRepairDraftPreview(true);
          refreshRoomRepairBuilderShellPreservingScroll(true);
        } else {
          removeRoomRepairSectionItem(node.section, existingIndex);
          refreshRoomRepairBuilderShellPreservingScroll(true);
        }
        const shell = getRoomRepairDraftShell();
        if (shell) shell.dataset.activeBuilderNode = node.key;
        return;
      }
      const rule = getRoomRepairBuilderWorkRule(node.section, rawLabel);
      const quantity = getRoomRepairBuilderQuantityConfig(node, option, rule, { room, roomMetrics: room ? getRoomRepairMetrics(room) : {} });
      const zone = readRoomRepairBuilderZoneSelection(node, optionIndex, quantity);
      let text = String(rawLabel || '').trim();
      let count = 0;
      if (quantity) {
        const input = document.getElementById(`roomRepairBuilderQty_${node.key}_${optionIndex}`);
        const max = Number(quantity.max || 40);
        const rawCount = parseFloat(String(input?.value || '').replace(',', '.'));
        count = Math.max(Number(quantity.min || 1), Math.min(max, Number.isFinite(rawCount) ? rawCount : Number(quantity.value || quantity.defaultValue || 1)));
        text = formatRoomRepairSelectedText(rawLabel, count, quantity, zone);
      }
      if (node.section === 'floor' && isRoomRepairPrimaryFloorCover(rawLabel)) {
        removeRoomRepairExclusiveFloorCover(text);
        removeRoomRepairBuilderDetailGroupsSelections(node.key, ['Формат покрытия', 'Класс покрытия', 'Тип покрытия', 'Рисунок / раппорт', 'Финиш для покрытия без обработки', 'Форма покрытия', 'Размер покрытия', 'Цветовая гамма'], zone?.key || '');
      }
      addRoomRepairSectionPreset(node.section, text, createRoomRepairBuilderStructuredSelection(node, text, {
        source: 'builder',
        quantity: count,
        quantityLabel: quantity?.label || '',
        quantitySource: zone?.key && zone.key !== 'custom' ? 'zone' : (quantity ? 'manual' : ''),
        zoneKey: zone?.key || '',
        zoneLabel: zone?.label || '',
        zoneHint: zone?.hint || '',
        zoneDefaultQty: zone?.qty || 0
      }));
      if (shell) shell.dataset.activeBuilderNode = node.key;
      if (isZoneNode) {
        setRoomRepairBuilderDetailProgress(node.key, zone?.key || activeZoneId || '', group?.label || '');
        ensureRoomRepairSingleDetailDefaults(node.key);
      }
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.addRoomRepairBuilderOption = addRoomRepairBuilderOption;

    function addRoomRepairBuilderDetail(nodeKey, groupIndex, optionIndex) {
      const node = getRoomRepairBuilderNode(nodeKey);
      if (!node?.section) return;
      const group = (node.detailGroups || [])[Number(groupIndex)];
      const option = (group?.options || [])[Number(optionIndex)];
      const rawLabel = String(getRoomRepairBuilderOptionText(option) || '').trim();
      const shell = getRoomRepairDraftShell();
      const zoneConfig = getRoomRepairZoneNodeConfig(node.key);
      const isZoneNode = isRoomRepairZoneCoverNode(node.key);
      const activeZoneId = node.key === 'finishWalls'
        ? (shell?.dataset.activeWallZone || '')
        : (node.key === 'finishCeiling'
          ? (shell?.dataset.activeCeilingZone || '')
          : (node.key === 'finishFloor' ? (shell?.dataset.activeFloorZone || '') : ''));
      const existingFloorZoneDetail = activeZoneId
        ? readRoomRepairDraftStructuredSelections().find(selection => selection.nodeKey === node.key
          && selection.detailGroup === (group?.label || '')
          && selection.zoneKey === activeZoneId
          && normalizeRoomRepairBuilderLabel(getRoomRepairSelectedCoreLabel(selection.label)) === normalizeRoomRepairBuilderLabel(rawLabel))
        : null;
      const existingIndex = activeZoneId && !existingFloorZoneDetail ? -1 : findRoomRepairSectionItemIndex(node.section, rawLabel);
      if (existingIndex >= 0) {
        removeRoomRepairSectionItem(node.section, existingIndex);
        removeRoomRepairFloorDependentDetails(node.key, group?.label || '', activeZoneId);
        if (shell) shell.dataset.activeBuilderNode = node.key;
        refreshRoomRepairBuilderShellPreservingScroll(true);
        return;
      }
      const { room } = getRoomRepairDraftContext();
      const rule = getRoomRepairBuilderWorkRule(node.section, rawLabel);
      const calcContext = { room, roomMetrics: room ? getRoomRepairMetrics(room) : {} };
      if (isZoneNode) {
        const rows = node.key === 'finishWalls'
          ? readRoomRepairWallZoneDraftFromCards()
          : (node.key === 'finishCeiling' ? readRoomRepairCeilingZoneDraftFromCards() : readRoomRepairFloorZoneDraftFromCards());
        if (node.key === 'finishWalls') {
          setRoomRepairWallZoneSelections(rows, 'Сохранена зона карточки стен', false);
        } else if (node.key === 'finishCeiling') {
          setRoomRepairCeilingZoneSelections(rows, 'Сохранена карточка потолка', false);
        } else {
          setRoomRepairFloorZoneSelections(rows, 'Сохранена зона карточки пола', false);
          syncRoomRepairFloorAreaLinkedDetails(rows);
        }
        const activeId = activeZoneId || rows[0]?.id || '';
        const activeRow = rows.find(row => row.id === activeId) || rows[0] || null;
        if (activeRow) {
          if (node.key === 'finishWalls') {
            calcContext.activeWallZoneArea = activeRow.area;
            calcContext.activeWallZoneId = activeRow.id;
            calcContext.activeWallZoneLabel = activeRow.zoneLabel;
            calcContext.activeWallZoneHint = activeRow.zoneHint;
          } else if (node.key === 'finishCeiling') {
            calcContext.activeCeilingZoneArea = activeRow.area;
            calcContext.activeCeilingZoneId = activeRow.id;
            calcContext.activeCeilingZoneLabel = activeRow.zoneLabel;
            calcContext.activeCeilingZoneHint = activeRow.zoneHint;
            calcContext.activeCeilingLayer = getRoomRepairCeilingRowLayer(activeRow);
          } else {
            calcContext.activeFloorZoneArea = activeRow.area;
            calcContext.activeFloorZoneId = activeRow.id;
            calcContext.activeFloorZoneLabel = activeRow.zoneLabel;
            calcContext.activeFloorZoneHint = activeRow.zoneHint;
          }
        }
      }
      const quantity = getRoomRepairBuilderQuantityConfig(node, option, rule, calcContext, group);
      const zone = readRoomRepairBuilderDetailZoneSelection(node, groupIndex, optionIndex, quantity);
      let text = rawLabel;
      let count = 0;
      if (quantity) {
        const input = document.getElementById(`roomRepairBuilderDetailQty_${node.key}_${groupIndex}_${optionIndex}`);
        const max = Number(quantity.max || 200);
        const rawCount = parseFloat(String(input?.value || '').replace(',', '.'));
        count = Math.max(Number(quantity.min || 0.1), Math.min(max, Number.isFinite(rawCount) ? rawCount : Number(quantity.value || quantity.defaultValue || 1)));
        text = formatRoomRepairSelectedText(rawLabel, count, quantity, zone);
      }
      if (option?.dimensions) {
        const lengthInput = document.getElementById(`roomRepairBuilderDetailLength_${node.key}_${groupIndex}_${optionIndex}`);
        const widthInput = document.getElementById(`roomRepairBuilderDetailWidth_${node.key}_${groupIndex}_${optionIndex}`);
        const rawLength = parseFloat(String(lengthInput?.value || '').replace(',', '.'));
        const rawWidth = parseFloat(String(widthInput?.value || '').replace(',', '.'));
        if (option.customDimensions && (!Number.isFinite(rawLength) || !Number.isFinite(rawWidth) || rawLength <= 0 || rawWidth <= 0)) {
          lengthInput?.focus?.();
          lengthInput?.closest?.('.room-repair-builder-dimensions')?.classList.add('has-error');
          return;
        }
        const isMeterDimension = option.dimensionUnit === 'm';
        const maxDimension = isMeterDimension ? 100 : 5000;
        const minDimension = isMeterDimension ? 0.01 : 1;
        const length = Math.max(minDimension, Math.min(maxDimension, Number.isFinite(rawLength) ? rawLength : 0));
        const width = Math.max(minDimension, Math.min(maxDimension, Number.isFinite(rawWidth) ? rawWidth : 0));
        if (length && width) text = `${text} (${formatRoomRepairQtyValue(width)}x${formatRoomRepairQtyValue(length)} ${isMeterDimension ? 'м' : 'см'})`;
      }
      if (!text) return;
      if (node.section === 'floor' && isRoomRepairPrimaryFloorCover(rawLabel)) {
        removeRoomRepairExclusiveFloorCover(text);
      }
      if (group?.choiceMode === 'single') {
        const targetZoneId = activeZoneId || calcContext.activeCeilingZoneId || calcContext.activeWallZoneId || calcContext.activeFloorZoneId || '';
        removeRoomRepairBuilderDetailGroupSelections(node.key, group.label || '', isZoneNode ? targetZoneId : '');
        removeRoomRepairFloorDependentDetails(node.key, group.label || '', isZoneNode ? targetZoneId : '');
      }
      const linkedToZone = quantity?.linkedToCeilingZone || quantity?.linkedToWallZone || quantity?.linkedToFloorZone;
      addRoomRepairSectionPreset(node.section, text, createRoomRepairBuilderStructuredSelection(node, text, {
        source: 'detail',
        detailGroup: group?.label || '',
        quantity: count,
        quantityLabel: quantity?.label || '',
        quantitySource: linkedToZone && zone?.key ? zoneConfig.linkedQuantitySource : (zone?.key && zone.key !== 'custom' ? 'zone' : (quantity ? 'manual' : '')),
        zoneKey: zone?.key || (isZoneNode ? (calcContext.activeCeilingZoneId || calcContext.activeWallZoneId || calcContext.activeFloorZoneId || '') : ''),
        zoneLabel: zone?.label || (isZoneNode ? (calcContext.activeCeilingZoneLabel || calcContext.activeWallZoneLabel || calcContext.activeFloorZoneLabel || '') : ''),
        zoneHint: zone?.hint || (isZoneNode ? (calcContext.activeCeilingZoneHint || calcContext.activeWallZoneHint || calcContext.activeFloorZoneHint || '') : ''),
        zoneDefaultQty: zone?.qty || (isZoneNode ? Number(calcContext.activeCeilingZoneArea || calcContext.activeWallZoneArea || calcContext.activeFloorZoneArea || 0) : 0),
        ceilingLayer: node.key === 'finishCeiling' ? Number(calcContext.activeCeilingLayer || getRoomRepairCeilingActiveLayer() || 1) : 0
      }));
      if (shell) shell.dataset.activeBuilderNode = node.key;
      if (isZoneNode) {
        const progressZoneId = activeZoneId || calcContext.activeCeilingZoneId || calcContext.activeWallZoneId || calcContext.activeFloorZoneId || '';
        setRoomRepairBuilderDetailProgress(node.key, progressZoneId, group?.label || '');
        ensureRoomRepairSingleDetailDefaults(node.key);
      }
      refreshRoomRepairBuilderShellPreservingScroll(true);
    }

    window.addRoomRepairBuilderDetail = addRoomRepairBuilderDetail;

    function refreshRoomRepairModalCounters() {
      const sections = getRoomRepairSectionConfig();
      sections.forEach(config => {
        const textarea = document.querySelector(`[data-repair-section="${config.key}"]`);
        const items = splitRoomRepairSectionTextarea(textarea?.value || '');
        const count = items.length;
        const counter = document.querySelector(`[data-repair-section-count="${config.key}"]`);
        if (counter) counter.textContent = count ? `${count} поз.` : 'пусто';
        const list = document.querySelector(`[data-repair-section-list="${config.key}"]`);
        if (list) list.innerHTML = renderRoomRepairSelectedListHtml(config.key, items);
        document.querySelectorAll(`[data-repair-preset="${config.key}"]`).forEach(button => {
          const isAdded = items.includes(button.dataset.repairPresetValue || '');
          button.classList.toggle('is-added', isAdded);
          const icon = button.querySelector('i');
          if (icon) {
            icon.classList.toggle('fa-check', isAdded);
            icon.classList.toggle('fa-plus', !isAdded);
          }
        });
      });
      getRoomRepairTabConfig().forEach(tab => {
        const count = sections
          .filter(config => config.tab === tab.key)
          .reduce((sum, config) => {
            const textarea = document.querySelector(`[data-repair-section="${config.key}"]`);
            return sum + splitRoomRepairSectionTextarea(textarea?.value || '').length;
          }, 0);
        const counter = document.querySelector(`[data-repair-tab-count="${tab.key}"]`);
        if (counter) counter.textContent = count;
      });
    }

    window.refreshRoomRepairModalCounters = refreshRoomRepairModalCounters;

    function getRoomRepairDraftShell() {
      return document.querySelector('#roomRepairCalculationModal .room-repair-modal-backdrop');
    }

    function getRoomRepairDraftContext() {
      const shell = getRoomRepairDraftShell();
      if (!shell) return {};
      const roomId = shell.dataset.roomId || '';
      const floorIndex = Number(shell.dataset.floorIndex || 0);
      const roomIndex = Number(shell.dataset.roomIndex || 0);
      const room = roomData?.[roomId]?.floors?.[floorIndex]?.livingRooms?.[roomIndex];
      return { shell, roomId, floorIndex, roomIndex, room };
    }

    function collectRoomRepairDraftSections() {
      const sections = {};
      getRoomRepairSectionConfig().forEach(config => {
        const textarea = document.querySelector(`[data-repair-section="${config.key}"]`);
        sections[config.key] = filterRoomRepairSectionItems(config.key, splitRoomRepairSectionTextarea(textarea?.value || ''));
      });
      return sections;
    }

    function readRoomRepairDraftStructuredSelections() {
      const textarea = document.querySelector('[data-repair-structured]');
      return normalizeRoomRepairStructuredSelections(textarea?.value || '[]');
    }

    function setRoomRepairDraftStructuredSelections(selections = []) {
      const textarea = document.querySelector('[data-repair-structured]');
      if (!textarea) return;
      textarea.value = JSON.stringify(normalizeRoomRepairStructuredSelections(selections));
    }

    function readRoomRepairDraftHistory() {
      const textarea = document.querySelector('[data-repair-history]');
      if (!textarea) return [];
      try {
        const value = JSON.parse(textarea.value || '[]');
        return Array.isArray(value) ? value : [];
      } catch (error) {
        return [];
      }
    }

    function setRoomRepairDraftHistory(history = []) {
      const textarea = document.querySelector('[data-repair-history]');
      if (!textarea) return;
      textarea.value = JSON.stringify((history || []).slice(-18));
      refreshRoomRepairHistoryUi();
    }

    function getRoomRepairDraftSnapshot(action = '') {
      const shell = getRoomRepairDraftShell();
      const sections = {};
      getRoomRepairSectionConfig().forEach(config => {
        const textarea = document.querySelector(`[data-repair-section="${config.key}"]`);
        sections[config.key] = filterRoomRepairSectionItems(config.key, splitRoomRepairSectionTextarea(textarea?.value || ''));
      });
      return {
        action,
        createdAt: new Date().toISOString(),
        sections,
        structuredSelections: readRoomRepairDraftStructuredSelections(),
        repairDraftManual: shell?.dataset.repairDraftManual || 'false',
        repairDraftSource: shell?.dataset.repairDraftSource || 'auto',
        repairSolutionPackage: shell?.dataset.repairSolutionPackage || 'comfort',
        repairPriceTier: shell?.dataset.repairPriceTier || document.getElementById('roomRepairPriceTier')?.value || 'inherit',
        calculationMode: document.getElementById('roomRepairCalculationMode')?.value || 'comfort',
        activeBuilderNode: shell?.dataset.activeBuilderNode || 'demoFinish',
        openBuilderGroups: shell?.dataset.builderOpenGroups || '',
        closedBuilderGroups: shell?.dataset.builderClosedGroups || ''
      };
    }

    function pushRoomRepairDraftHistory(action = 'Изменение состава') {
      if (!getRoomRepairDraftShell()) return;
      const history = readRoomRepairDraftHistory();
      history.push(getRoomRepairDraftSnapshot(action));
      setRoomRepairDraftHistory(history);
    }

    function renderRoomRepairHistoryHtml(history = []) {
      if (!history.length) {
        return '<small class="room-repair-history-empty">Пока изменений нет. Можно безопасно собирать состав.</small>';
      }
      return history.slice(-5).reverse().map((item, index) => `
        <div class="room-repair-history-item ${index === 0 ? 'is-latest' : ''}">
          <i class="fas ${index === 0 ? 'fa-clock-rotate-left' : 'fa-circle'}"></i>
          <span>
            <strong>${escapeRoomRepairHtml(item.action || 'Изменение состава')}</strong>
            <small>${escapeRoomRepairHtml(new Date(item.createdAt || Date.now()).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))}</small>
          </span>
        </div>
      `).join('');
    }

    function refreshRoomRepairHistoryUi() {
      const history = readRoomRepairDraftHistory();
      const list = document.querySelector('[data-room-repair-history-list]');
      if (list) list.innerHTML = renderRoomRepairHistoryHtml(history);
      document.querySelectorAll('[data-room-repair-undo]').forEach(button => {
        button.disabled = !history.length;
      });
    }

    function restoreRoomRepairDraftSnapshot(snapshot = {}) {
      const shell = getRoomRepairDraftShell();
      if (!shell) return;
      getRoomRepairSectionConfig().forEach(config => {
        const textarea = document.querySelector(`[data-repair-section="${config.key}"]`);
        if (textarea) textarea.value = filterRoomRepairSectionItems(config.key, snapshot.sections?.[config.key] || []).join('\n');
      });
      setRoomRepairDraftStructuredSelections(snapshot.structuredSelections || []);
      shell.dataset.repairDraftManual = snapshot.repairDraftManual || 'false';
      shell.dataset.repairDraftSource = snapshot.repairDraftSource || 'auto';
      shell.dataset.repairSolutionPackage = snapshot.repairSolutionPackage || shell.dataset.repairSolutionPackage || 'comfort';
      shell.dataset.repairPriceTier = snapshot.repairPriceTier || shell.dataset.repairPriceTier || 'inherit';
      const priceTierSelect = document.getElementById('roomRepairPriceTier');
      if (priceTierSelect) priceTierSelect.value = shell.dataset.repairPriceTier;
      const modeSelect = document.getElementById('roomRepairCalculationMode');
      if (modeSelect && snapshot.calculationMode) modeSelect.value = snapshot.calculationMode;
      shell.dataset.activeBuilderNode = snapshot.activeBuilderNode || shell.dataset.activeBuilderNode || 'demoFinish';
      shell.dataset.builderOpenGroups = snapshot.openBuilderGroups || shell.dataset.builderOpenGroups || '';
      shell.dataset.builderClosedGroups = snapshot.closedBuilderGroups || shell.dataset.builderClosedGroups || '';
      const manualHint = document.getElementById('roomRepairManualHint');
      if (manualHint) {
        manualHint.textContent = shell.dataset.repairDraftManual === 'true'
          ? 'Есть ручные правки: после сохранения комната станет “Вручную”.'
          : 'Черновик вернулся к предыдущему состоянию.';
      }
      refreshRoomRepairDraftPreview(false);
      updateRoomRepairSolutionPackageUi(shell.dataset.repairSolutionPackage);
      refreshRoomRepairBuilderShell(true);
    }

    function undoRoomRepairDraftChange() {
      const history = readRoomRepairDraftHistory();
      const snapshot = history.pop();
      if (!snapshot) return;
      setRoomRepairDraftHistory(history);
      restoreRoomRepairDraftSnapshot(snapshot);
      const hint = document.getElementById('roomRepairAutoHint');
      if (hint) hint.textContent = `Отменено: ${snapshot.action || 'последнее изменение'}.`;
    }

    window.undoRoomRepairDraftChange = undoRoomRepairDraftChange;

    function getRoomRepairSectionLabel(sectionKey) {
      return getRoomRepairSectionConfig().find(config => config.key === sectionKey)?.label || sectionKey;
    }

    function getRoomRepairStructuredSelectionKey(selection = {}) {
      return [
        selection.section,
        selection.nodeKey,
        selection.source,
        selection.detailGroup,
        selection.zoneKey,
        selection.label
      ].map(item => String(item || '').trim().toLowerCase()).join('|');
    }

    function createRoomRepairManualStructuredSelection(sectionKey, label, source = 'manual') {
      const sectionLabel = getRoomRepairSectionLabel(sectionKey);
      const rule = getRoomRepairBuilderWorkRule(sectionKey, label);
      const isAuto = source === 'auto';
      const isDependency = source === 'dependency';
      return {
        id: getRoomRepairStructuredSelectionKey({ section: sectionKey, source, label }),
        section: sectionKey,
        label,
        groupKey: isAuto ? 'auto-profile' : (isDependency ? 'dependency' : 'manual'),
        groupLabel: isAuto ? 'Автоподбор' : (isDependency ? 'Рекомендация системы' : 'Своя позиция'),
        nodeKey: sectionKey,
        nodeLabel: sectionLabel,
        detailGroup: '',
        source,
        quantity: 0,
        quantityLabel: '',
        quantitySource: '',
        zoneKey: '',
        zoneLabel: '',
        zoneHint: '',
        zoneDefaultQty: 0,
        workId: rule?.workId || '',
        targetCategory: rule?.targetCategory || '',
        qtyMode: rule?.qtyMode || ''
      };
    }

    function createRoomRepairBuilderStructuredSelection(node, label, { source = 'builder', quantity = 0, quantityLabel = '', quantitySource = '', detailGroup = '', zoneKey = '', zoneLabel = '', zoneHint = '', zoneDefaultQty = 0, zoneCover = '', wallLayer = 0, ceilingLayer = 0, linkedZoneId = '', workId = '', targetCategory = '', qtyMode = '' } = {}) {
      const rule = getRoomRepairBuilderWorkRule(node.section, label);
      const selection = {
        section: node.section,
        label,
        groupKey: node.groupKey || getRoomRepairBuilderGroupKeyForNode(node.key),
        groupLabel: node.groupLabel || getRoomRepairBuilderCatalog().find(group => group.key === getRoomRepairBuilderGroupKeyForNode(node.key))?.label || '',
        nodeKey: node.key,
        nodeLabel: node.label || '',
        detailGroup,
        source,
        quantity: Number(quantity || 0),
        quantityLabel: quantityLabel || '',
        quantitySource: quantitySource || '',
        zoneKey: zoneKey || '',
        zoneLabel: zoneLabel || '',
        zoneHint: zoneHint || '',
        zoneDefaultQty: Number(zoneDefaultQty || 0),
        zoneCover: zoneCover || '',
        wallLayer: Number(wallLayer || 0),
        ceilingLayer: Number(ceilingLayer || 0),
        linkedZoneId: linkedZoneId || '',
        workId: workId || rule?.workId || '',
        targetCategory: targetCategory || rule?.targetCategory || '',
        qtyMode: qtyMode || rule?.qtyMode || ''
      };
      selection.id = getRoomRepairStructuredSelectionKey(selection);
      return selection;
    }

    function collectRoomRepairDraftStructuredSelections(syncToDom = true) {
      const sections = collectRoomRepairDraftSections();
      const rawSelections = readRoomRepairDraftStructuredSelections();
      const usedRawIndexes = new Set();
      const normalized = [];
      const shell = getRoomRepairDraftShell();
      const inferredSource = shell?.dataset.repairDraftSource === 'auto' && shell?.dataset.repairDraftManual !== 'true'
        ? 'auto'
        : 'manual';
      getRoomRepairSectionConfig().forEach(config => {
        (sections[config.key] || []).forEach(label => {
          const rawIndex = rawSelections.findIndex((selection, index) => (
            !usedRawIndexes.has(index)
            && selection.section === config.key
            && selection.label === label
          ));
          if (rawIndex >= 0) {
            usedRawIndexes.add(rawIndex);
            normalized.push(rawSelections[rawIndex]);
          } else {
            normalized.push(createRoomRepairManualStructuredSelection(config.key, label, inferredSource));
          }
        });
      });
      rawSelections.forEach((selection, index) => {
        if (usedRawIndexes.has(index)) return;
        if (selection.source !== 'detail' || !selection.zoneKey) return;
        const hasZone = normalized.some(item => item.section === selection.section
          && item.nodeKey === selection.nodeKey
          && item.zoneKey === selection.zoneKey
          && ['floor-zone-cover', 'wall-zone-cover', 'ceiling-zone-cover'].includes(item.source));
        if (hasZone) normalized.push(selection);
      });
      if (syncToDom) setRoomRepairDraftStructuredSelections(normalized);
      return normalized;
    }

    function addRoomRepairStructuredSelection(selection) {
      if (!selection?.section || !selection?.label) return;
      const selections = readRoomRepairDraftStructuredSelections();
      const key = getRoomRepairStructuredSelectionKey(selection);
      const existingIndex = selections.findIndex(item => getRoomRepairStructuredSelectionKey(item) === key);
      if (existingIndex >= 0) {
        selections[existingIndex] = { ...selections[existingIndex], ...selection };
      } else {
        selections.push(selection);
      }
      setRoomRepairDraftStructuredSelections(selections);
    }

    function removeRoomRepairStructuredSelection(sectionKey, label, occurrenceIndex = 0) {
      const selections = readRoomRepairDraftStructuredSelections();
      let seen = 0;
      const next = selections.filter(selection => {
        if (selection.section !== sectionKey || selection.label !== label) return true;
        if (seen === occurrenceIndex) {
          seen += 1;
          return false;
        }
        seen += 1;
        return true;
      });
      setRoomRepairDraftStructuredSelections(next);
    }

    function clearRoomRepairStructuredSection(sectionKey) {
      setRoomRepairDraftStructuredSelections(readRoomRepairDraftStructuredSelections().filter(selection => selection.section !== sectionKey));
    }

    function removeRoomRepairBuilderNodeSelections(nodeKey) {
      const selections = readRoomRepairDraftStructuredSelections();
      const labelsBySection = selections
        .filter(selection => selection.nodeKey === nodeKey)
        .reduce((acc, selection) => {
          if (!acc[selection.section]) acc[selection.section] = [];
          acc[selection.section].push(selection.label);
          return acc;
        }, {});
      Object.entries(labelsBySection).forEach(([sectionKey, labels]) => {
        const textarea = document.querySelector(`[data-repair-section="${sectionKey}"]`);
        if (!textarea) return;
        let items = splitRoomRepairSectionTextarea(textarea.value);
        labels.forEach(label => {
          const index = items.findIndex(item => item === label);
          if (index >= 0) items.splice(index, 1);
        });
        textarea.value = items.join('\n');
      });
      setRoomRepairDraftStructuredSelections(selections.filter(selection => selection.nodeKey !== nodeKey));
    }

    function removeRoomRepairBuilderDetailGroupSelections(nodeKey, detailGroup = '', zoneKey = '') {
      if (!nodeKey || !detailGroup) return;
      const selections = readRoomRepairDraftStructuredSelections();
      const removed = selections.filter(selection => selection.nodeKey === nodeKey
        && selection.detailGroup === detailGroup
        && (!zoneKey || selection.zoneKey === zoneKey));
      if (!removed.length) return;
      const nextSelections = selections.filter(selection => !(selection.nodeKey === nodeKey
        && selection.detailGroup === detailGroup
        && (!zoneKey || selection.zoneKey === zoneKey)));
      const labelsBySection = removed.reduce((acc, selection) => {
        if (!acc[selection.section]) acc[selection.section] = [];
        acc[selection.section].push(selection.label);
        return acc;
      }, {});
      Object.entries(labelsBySection).forEach(([sectionKey, labels]) => {
        const textarea = document.querySelector(`[data-repair-section="${sectionKey}"]`);
        if (!textarea) return;
        let items = splitRoomRepairSectionTextarea(textarea.value);
        Array.from(new Set(labels)).forEach(label => {
          const existingCount = items.filter(item => item === label).length;
          const keepCount = nextSelections.filter(selection => selection.section === sectionKey && selection.label === label).length;
          let removeCount = Math.max(0, existingCount - keepCount);
          while (removeCount > 0) {
            const index = items.findIndex(item => item === label);
            if (index < 0) break;
            items.splice(index, 1);
            removeCount -= 1;
          }
        });
        textarea.value = items.join('\n');
      });
      setRoomRepairDraftStructuredSelections(nextSelections);
    }

    function removeRoomRepairBuilderDetailGroupsSelections(nodeKey, detailGroups = [], zoneKey = '') {
      (detailGroups || []).forEach(detailGroup => removeRoomRepairBuilderDetailGroupSelections(nodeKey, detailGroup, zoneKey));
    }

    function removeRoomRepairFloorDependentDetails(nodeKey, changedDetailGroup = '', zoneKey = '') {
      if (nodeKey === 'finishWalls') {
        if (changedDetailGroup === 'Тип покрытия') {
          removeRoomRepairBuilderDetailGroupsSelections(nodeKey, ['Система / эффект', 'Фактура', 'Защитный финиш', 'Цветовая гамма'], zoneKey);
        } else if (changedDetailGroup === 'Система / эффект') {
          removeRoomRepairBuilderDetailGroupsSelections(nodeKey, ['Фактура', 'Защитный финиш'], zoneKey);
        }
        return;
      }
      if (nodeKey !== 'finishFloor') return;
      if (changedDetailGroup === 'Формат покрытия') {
        removeRoomRepairBuilderDetailGroupsSelections(nodeKey, ['Класс покрытия', 'Тип покрытия', 'Финиш для покрытия без обработки', 'Форма покрытия', 'Размер покрытия'], zoneKey);
      } else if (changedDetailGroup === 'Тип покрытия') {
        removeRoomRepairBuilderDetailGroupSelections(nodeKey, 'Финиш для покрытия без обработки', zoneKey);
      } else if (changedDetailGroup === 'Форма покрытия') {
        removeRoomRepairBuilderDetailGroupSelections(nodeKey, 'Размер покрытия', zoneKey);
      }
    }

    function removeRoomRepairExclusiveFloorCover(nextLabel = '') {
      if (!isRoomRepairPrimaryFloorCover(nextLabel)) return;
      const textarea = document.querySelector('[data-repair-section="floor"]');
      if (!textarea) return;
      const nextText = normalizeRoomRepairBuilderLabel(nextLabel);
      const items = splitRoomRepairSectionTextarea(textarea.value)
        .filter(item => !isRoomRepairPrimaryFloorCover(item) || normalizeRoomRepairBuilderLabel(item) === nextText);
      textarea.value = items.join('\n');
      const selections = readRoomRepairDraftStructuredSelections()
        .filter(selection => selection.section !== 'floor' || !isRoomRepairPrimaryFloorCover(selection.label) || normalizeRoomRepairBuilderLabel(selection.label) === nextText);
      setRoomRepairDraftStructuredSelections(selections);
    }

    function getRoomRepairSectionText(sections = {}, sectionKey = '') {
      return (sections[sectionKey] || []).join(' ').toLowerCase();
    }

    function getRoomRepairAllSectionText(sections = {}) {
      return Object.values(sections || {}).flat().join(' ').toLowerCase();
    }

    function hasRoomRepairSectionPattern(sections = {}, sectionKey = '', pattern) {
      return pattern.test(getRoomRepairSectionText(sections, sectionKey));
    }

    function hasRoomRepairAnyPattern(sections = {}, pattern) {
      return pattern.test(getRoomRepairAllSectionText(sections));
    }

    function createRoomRepairDependencyAction(section, label) {
      return { section, label, buttonLabel: 'Добавить' };
    }

    function getRoomRepairDependencyWarnings(room = {}, sections = {}, impact = {}) {
      const warnings = [];
      const text = getRoomRepairAllSectionText(sections);
      const isWet = isRoomRepairWetRoom(room);
      const hasShowerTray = /душев.*поддон|поддон.*плит|поддон.*керамогранит|поддон.*бортик|вровень|трап|душев.*лоток/.test(text);
      const hasTileTray = /поддон.*плит|поддон.*керамогранит|вровень|поддон.*бортик/.test(text);

      if (hasTileTray && !hasRoomRepairSectionPattern(sections, 'plumbing', /усил.*гидроизоляц|душев.*гидроизоляц|гидроизоляц/)) {
        warnings.push({
          level: 'critical',
          blocking: true,
          title: 'Поддон из плитки без усиленной гидроизоляции',
          text: 'Для душевой зоны из плитки нужна усиленная гидроизоляция, иначе расчет будет неполным.',
          actions: [createRoomRepairDependencyAction('plumbing', 'Усиленная гидроизоляция душевой зоны')]
        });
      } else if (isWet && hasShowerTray && !hasRoomRepairAnyPattern(sections, /гидроизоляц/)) {
        warnings.push({
          level: 'critical',
          blocking: true,
          title: 'Влажная зона без гидроизоляции',
          text: 'Добавьте гидроизоляцию пола или душевой зоны перед расчетом.',
          actions: [createRoomRepairDependencyAction('plumbing', 'Усиленная гидроизоляция душевой зоны')]
        });
      }

      if (hasTileTray && !hasRoomRepairSectionPattern(sections, 'plumbing', /душев.*лоток|трап/)) {
        warnings.push({
          level: 'warning',
          title: 'Поддон из плитки без трапа',
          text: 'Для поддона вровень с полом обычно нужен душевой лоток или трап.',
          actions: [createRoomRepairDependencyAction('plumbing', 'Душевой лоток / трап')]
        });
      }

      if (/скрыт.*сантех|скрыт.*смесител/.test(text) && !hasRoomRepairSectionPattern(sections, 'plumbing', /штроб.*сантех/)) {
        warnings.push({
          level: 'warning',
          title: 'Скрытая сантехника без штробления',
          text: 'Скрытый монтаж требует штробления, закладных и восстановления основания.',
          actions: [createRoomRepairDependencyAction('plumbing', 'Штробление под скрытую сантехнику')]
        });
      }

      const hasWarmFloorPower = hasRoomRepairSectionPattern(sections, 'electrical', /питание.*тепл|линия.*тепл/);
      const hasWarmFloorThermostat = hasRoomRepairSectionPattern(sections, 'electrical', /терморег/);
      if (/тепл.*пол/.test(text) && (!hasWarmFloorPower || !hasWarmFloorThermostat)) {
        const warmFloorActions = [];
        if (!hasWarmFloorPower) warmFloorActions.push(createRoomRepairDependencyAction('electrical', 'Отдельная линия питания теплого пола'));
        if (!hasWarmFloorThermostat) warmFloorActions.push(createRoomRepairDependencyAction('electrical', 'Терморегулятор теплого пола'));
        warnings.push({
          level: 'warning',
          title: 'Теплый пол без питания и терморегулятора',
          text: 'Добавьте линию питания и терморегулятор, чтобы щит и смета считались корректнее.',
          actions: warmFloorActions
        });
      }

      if ((sections.lighting || []).length && !hasRoomRepairSectionPattern(sections, 'electrical', /выключ|управлен.*свет/)) {
        warnings.push({
          level: 'info',
          title: 'Свет без управления',
          text: 'Для групп света стоит добавить выключатели или сценарное управление.',
          actions: [createRoomRepairDependencyAction('electrical', '2 выключателя у входа и у ключевых сценарных зон')]
        });
      }

      const ceilingText = getRoomRepairSectionText(sections, 'ceiling');
      const lightingText = getRoomRepairSectionText(sections, 'lighting');
      if (/светов.*лини|led|лед|трек|шинопровод/.test(ceilingText) && !/подсвет|led|лента|трек|сценар|линии/.test(lightingText)) {
        warnings.push({
          level: 'info',
          title: 'Потолочный световой узел без сценария света',
          text: 'Для LED-профиля, световых линий или трека стоит добавить соответствующий световой сценарий.',
          actions: [createRoomRepairDependencyAction('lighting', /трек|шинопровод/.test(ceilingText) ? '1 трековая система' : 'LED-лента в нише / профиле')]
        });
      }

      if (/закладн.*люстр|усилен.*люстр|платформ.*люстр/.test(ceilingText) && !/люстр|центральн.*светильник/.test(lightingText)) {
        warnings.push({
          level: 'info',
          title: 'Закладная под люстру без люстры в свете',
          text: 'Если закладная нужна под центральный светильник, добавьте люстру в блок организации света.',
          actions: [createRoomRepairDependencyAction('lighting', '1 люстра / центральный светильник')]
        });
      }

      if ((sections.smartHome || []).length && !(sections.electrical || []).length && !(sections.lighting || []).length) {
        warnings.push({
          level: 'warning',
          title: 'Smart без базовой электрики',
          text: 'Smart-сценарии обычно требуют питания, линий и групп управления.',
          actions: [
            createRoomRepairDependencyAction('electrical', 'Отдельные линии для техники'),
            createRoomRepairDependencyAction('lighting', '2 группы света: основной и сценарный')
          ]
        });
      }

      if ((sections.climate || []).length) {
        const climateActions = [];
        if (!hasRoomRepairSectionPattern(sections, 'climate', /трасс/)) climateActions.push(createRoomRepairDependencyAction('climate', 'Подготовка трассы кондиционера'));
        if (!hasRoomRepairSectionPattern(sections, 'climate', /дренаж|питан/)) climateActions.push(createRoomRepairDependencyAction('climate', 'Закладка дренажа и питания для внутреннего блока'));
        if (climateActions.length) {
          warnings.push({
            level: 'info',
            title: 'Климат требует трассу, дренаж и питание',
            text: 'Для кондиционера лучше сразу заложить трассу, дренаж и питание внутреннего блока.',
            actions: climateActions
          });
        }
      }

      if (impact.electricalPanel && !impact.breakerGroups) {
        warnings.push({
          level: 'warning',
          title: 'Влияние на щит требует уточнения',
          text: 'Проверьте количество групп света, розеток и отдельных линий.',
          actions: [createRoomRepairDependencyAction('electrical', 'Отдельные линии для техники')]
        });
      }

      return warnings;
    }

    function getRoomRepairConflictWarnings(room = {}, sections = {}) {
      const warnings = [];
      const floorText = getRoomRepairSectionText(sections, 'floor');
      const ceilingText = getRoomRepairSectionText(sections, 'ceiling');
      const plumbingText = getRoomRepairSectionText(sections, 'plumbing');
      const isWet = isRoomRepairWetRoom(room);
      const primaryFloorFinishes = [
        /ламинат/.test(floorText) ? 'ламинат' : '',
        /керамогранит|плитк/.test(floorText) ? 'керамогранит/плитка' : '',
        /инженер/.test(floorText) ? 'инженерная доска' : '',
        /паркет/.test(floorText) ? 'паркет' : '',
        /кварц|spc|винил/.test(floorText) ? 'кварц-винил/SPC' : '',
        /микроцемент/.test(floorText) ? 'микроцемент' : ''
      ].filter(Boolean);
      const ceilingFinishes = [
        /натяж/.test(ceilingText) ? 'натяжной потолок' : '',
        /покраск/.test(ceilingText) ? 'покраска потолка' : '',
        /гкл|гипсокартон/.test(ceilingText) ? 'ГКЛ потолок' : ''
      ].filter(Boolean);

      if (isWet && /ламинат|паркет|инженер/.test(floorText)) {
        warnings.push({
          level: 'critical',
          blocking: true,
          title: 'Неподходящее покрытие для влажной комнаты',
          text: 'Для душевой, ванной и мокрых зон нельзя считать обычный ламинат, паркет или инженерную доску без отдельного зонирования.',
          actions: [createRoomRepairDependencyAction('floor', 'Керамогранит на полу')]
        });
      }

      if (primaryFloorFinishes.length > 1 && !/зон|остаток|частич|комбинирован/.test(floorText)) {
        warnings.push({
          level: 'warning',
          title: 'Несколько покрытий пола',
          text: `Выбрано: ${primaryFloorFinishes.join(', ')}. Уточните зоны или оставьте одно основное покрытие.`
        });
      }

      if (ceilingFinishes.length > 1 && !/зон|комбинирован|частич/.test(ceilingText)) {
        warnings.push({
          level: 'warning',
          title: 'Несколько решений по потолку',
          text: `Выбрано: ${ceilingFinishes.join(', ')}. Для точного расчета лучше разделить по зонам или выбрать одно решение.`
        });
      }

      if (/готов.*поддон|душев.*поддон/.test(plumbingText) && /поддон.*плит|поддон.*керамогранит|вровень|поддон.*бортик/.test(plumbingText)) {
        warnings.push({
          level: 'critical',
          blocking: true,
          title: 'Конфликт типа душевого поддона',
          text: 'Нельзя одновременно считать готовый поддон и поддон из плитки/керамогранита. Оставьте один сценарий.'
        });
      }

      return warnings;
    }

    function getRoomRepairFloorRequiredDetailWarnings(room = {}, sections = {}, structuredSelections = []) {
      const warnings = [];
      const normalized = normalizeRoomRepairStructuredSelections(structuredSelections);
      const floorZoneRows = getRoomRepairFloorZoneRows(sections.floor || [], {
        room,
        roomMetrics: getRoomRepairMetrics(room),
        structuredSelections: normalized
      }).rows.filter(row => row.cover);
      if (!floorZoneRows.length) return warnings;
      floorZoneRows.forEach((zone, index) => {
        const zoneDetails = getRoomRepairFloorZoneDetailSelections(normalized, zone.id);
        const requiredGroups = getRoomRepairRequiredZoneDetailGroups('finishFloor', zone, sections.floor || [], {
          room,
          roomMetrics: getRoomRepairMetrics(room),
          structuredSelections: normalized
        }, normalized).map(group => group.label);
        const missing = requiredGroups.filter(group => !zoneDetails.some(selection => selection.detailGroup === group));
        if (!missing.length) return;
        warnings.push({
          level: 'critical',
          blocking: true,
          title: `Не заполнена спецификация покрытия ${index + 1}`,
          text: `${zone.zoneLabel || `Покрытие ${index + 1}`}: ${zone.cover}. Заполните: ${missing.join(', ')}.`,
          actions: [{ section: 'floor', label: 'Открыть карточку пола', buttonLabel: 'Заполнить' }]
        });
      });
      return warnings;
    }

    function getRoomRepairWallRequiredDetailWarnings(room = {}, sections = {}, structuredSelections = []) {
      const warnings = [];
      const normalized = normalizeRoomRepairStructuredSelections(structuredSelections);
      const wallZoneRows = getRoomRepairWallZoneRows(sections.walls || [], {
        room,
        roomMetrics: getRoomRepairMetrics(room),
        structuredSelections: normalized
      }).rows.filter(row => row.cover);
      if (!wallZoneRows.length) return warnings;
      wallZoneRows.forEach((zone, index) => {
        const zoneDetails = getRoomRepairWallZoneDetailSelections(normalized, zone.id);
        const requiredGroups = getRoomRepairRequiredZoneDetailGroups('finishWalls', zone, sections.walls || [], {
          room,
          roomMetrics: getRoomRepairMetrics(room),
          structuredSelections: normalized
        }, normalized).map(group => group.label);
        const missing = requiredGroups.filter(group => !zoneDetails.some(selection => selection.detailGroup === group));
        if (!missing.length) return;
        warnings.push({
          level: 'critical',
          blocking: true,
          title: `Не заполнена спецификация стен ${index + 1}`,
          text: `${zone.zoneLabel || `Покрытие ${index + 1}`}: ${zone.cover}. Заполните: ${missing.join(', ')}.`,
          actions: [{ section: 'walls', label: 'Открыть карточку стен', buttonLabel: 'Заполнить' }]
        });
      });
      return warnings;
    }

    function getRoomRepairCeilingRequiredDetailWarnings(room = {}, sections = {}, structuredSelections = []) {
      const warnings = [];
      const normalized = normalizeRoomRepairStructuredSelections(structuredSelections);
      const ceilingZoneRows = getRoomRepairCeilingZoneRows(sections.ceiling || [], {
        room,
        roomMetrics: getRoomRepairMetrics(room),
        structuredSelections: normalized,
        activeCeilingLayer: 1
      }).rows.filter(row => row.cover);
      if (!ceilingZoneRows.length) return warnings;
      ceilingZoneRows.forEach((zone, index) => {
        const zoneDetails = getRoomRepairCeilingZoneDetailSelections(normalized, zone.id);
        const requiredGroups = getRoomRepairRequiredZoneDetailGroups('finishCeiling', zone, sections.ceiling || [], {
          room,
          roomMetrics: getRoomRepairMetrics(room),
          structuredSelections: normalized,
          activeCeilingLayer: getRoomRepairCeilingRowLayer(zone)
        }, normalized).map(group => group.label);
        const missing = requiredGroups.filter(group => !zoneDetails.some(selection => selection.detailGroup === group));
        if (!missing.length) return;
        warnings.push({
          level: 'critical',
          blocking: true,
          title: `Не заполнен паспорт потолка ${index + 1}`,
          text: `${zone.zoneLabel || `Решение ${index + 1}`}: ${zone.cover}. Заполните: ${missing.join(', ')}.`,
          actions: [{ section: 'ceiling', label: 'Открыть карточку потолка', buttonLabel: 'Заполнить' }]
        });
      });
      return warnings;
    }

    function getRoomRepairWallLayerDependencyWarnings(room = {}, sections = {}, structuredSelections = []) {
      const warnings = [];
      const normalized = normalizeRoomRepairStructuredSelections(structuredSelections);
      const rows = getRoomRepairWallZoneRows(sections.walls || [], {
        room,
        roomMetrics: getRoomRepairMetrics(room),
        structuredSelections: normalized
      }).rows;
      const wallpaperPaintRows = rows.filter(row => {
        const coverText = normalizeRoomRepairBuilderLabel(row.cover);
        if (!/обои/.test(coverText) || /фотообои/.test(coverText)) return false;
        return getRoomRepairWallZoneDetailSelections(normalized, row.id).some(selection => selection.detailGroup === 'Формат покрытия'
          && getRoomRepairFloorFormatKeyFromLabel(selection.value || selection.label) === 'wallpaper_paint');
      });
      if (!wallpaperPaintRows.length) return warnings;
      const hasPaintLayer = rows.some(row => /покраск|окраск|краск/.test(normalizeRoomRepairBuilderLabel(row.cover)));
      if (hasPaintLayer) return warnings;
      warnings.push({
        level: 'critical',
        blocking: true,
        title: 'Нужна покраска по обоям',
        text: 'Для формата “обои под покраску” добавьте вторую карточку “Покраска стен”. Она считается как слой поверх обоев и не занимает остаток площади стен.',
        actions: [{ section: 'walls', label: 'Открыть карточки стен', buttonLabel: 'Добавить покраску' }]
      });
      return warnings;
    }

    function getRoomRepairWallOptionalLayerWarnings(room = {}, sections = {}, structuredSelections = []) {
      const warnings = [];
      const normalized = normalizeRoomRepairStructuredSelections(structuredSelections);
      const rows = getRoomRepairWallZoneRows(sections.walls || [], {
        room,
        roomMetrics: getRoomRepairMetrics(room),
        structuredSelections: normalized
      }).rows;
      const hasMicrocement = rows.some(row => /микроцемент/.test(normalizeRoomRepairBuilderLabel(row.cover)));
      if (!hasMicrocement) return warnings;
      const hasPaintLayer = rows.some(row => /покраск|окраск|краск/.test(normalizeRoomRepairBuilderLabel(row.cover)));
      if (hasPaintLayer) return warnings;
      warnings.push({
        level: 'info',
        title: 'Можно добавить окраску микроцемента',
        text: 'Для микроцемента на стенах можно добавить второй карточкой “Покраска стен”, если нужен окрашенный финиш. Это рекомендация, расчет не блокируется.',
        actions: [{ section: 'walls', label: 'Открыть карточки стен', buttonLabel: 'Добавить при необходимости' }]
      });
      return warnings;
    }

    function getRoomRepairMoldingFinishWarnings(room = {}, sections = {}, structuredSelections = []) {
      const warnings = [];
      const normalized = normalizeRoomRepairStructuredSelections(structuredSelections);
      const rows = getRoomRepairWallZoneRows(sections.walls || [], {
        room,
        roomMetrics: getRoomRepairMetrics(room),
        structuredSelections: normalized
      }).rows.filter(row => row.cover && isRoomRepairWallLinearCover(row.cover));
      if (!rows.length) return warnings;
      rows.forEach((row, index) => {
        const details = getRoomRepairWallZoneDetailMap(normalized, row.id);
        const finishText = normalizeRoomRepairBuilderLabel([
          ...(details['Финиш профиля'] || []),
          ...(details['Фактура'] || []),
          ...(details['Дополнительные опции'] || [])
        ].map(item => item.value || item.label).join(' '));
        if (!/под.*покраск|под.*окраск/.test(finishText) || /покраск.*молдинг|окраск.*молдинг/.test(finishText)) return;
        warnings.push({
          level: 'info',
          title: `Проверьте покраску молдингов ${index + 1}`,
          text: `${row.zoneLabel || `Слой ${getRoomRepairWallRowLayer(row)}`}: ${row.cover}. Для финиша “под покраску” можно добавить опцию “Покраска молдингов” или учесть окраску вместе со стеной.`,
          actions: [{ section: 'walls', label: 'Открыть молдинги', buttonLabel: 'Проверить' }]
        });
      });
      return warnings;
    }

    function getRoomRepairWallLayerAreaWarnings(room = {}, sections = {}, structuredSelections = []) {
      const warnings = [];
      const metrics = getRoomRepairMetrics(room);
      const wallsArea = Number(metrics.wallsArea || metrics.wallArea || room?.wallsArea || 0);
      if (!wallsArea) return warnings;
      const rows = getRoomRepairWallZoneRows(sections.walls || [], {
        room,
        roomMetrics: metrics,
        structuredSelections: normalizeRoomRepairStructuredSelections(structuredSelections)
      }).rows.filter(row => row.cover && !isRoomRepairWallLinearCover(row.cover));
      const sums = rows.reduce((acc, row) => {
        const layer = getRoomRepairWallRowLayer(row);
        acc[layer] = (acc[layer] || 0) + Number(row.area || 0);
        return acc;
      }, {});
      Object.entries(sums).forEach(([layer, area]) => {
        if (Number(area || 0) <= wallsArea + 0.05) return;
        warnings.push({
          level: 'critical',
          blocking: true,
          title: `Слой ${layer} превышает площадь стен`,
          text: `В слое ${layer} выбрано ${formatRoomRepairQtyValue(area)} м² при площади стен ${formatRoomRepairQtyValue(wallsArea)} м². Уменьшите площади карточек слоя.`,
          actions: [{ section: 'walls', label: 'Открыть слои стен', buttonLabel: 'Проверить' }]
        });
      });
      return warnings;
    }

    function getRoomRepairFloorCompatibilityWarnings(room = {}, sections = {}, structuredSelections = []) {
      const warnings = [];
      const normalized = normalizeRoomRepairStructuredSelections(structuredSelections);
      const floorZoneRows = getRoomRepairFloorZoneRows(sections.floor || [], {
        room,
        roomMetrics: getRoomRepairMetrics(room),
        structuredSelections: normalized
      }).rows.filter(row => row.cover);
      if (!floorZoneRows.length) return warnings;
      const roomIsWet = isRoomRepairWetRoom(room);
      const floorText = getRoomRepairSectionText(sections, 'floor');
      const hasWarmFloor = /тепл.*пол/.test(floorText);
      floorZoneRows.forEach((zone, index) => {
        const details = getRoomRepairFloorZoneDetailMap(normalized, zone.id);
        const coverText = normalizeRoomRepairBuilderLabel(zone.cover);
        const typeText = normalizeRoomRepairBuilderLabel((details['Тип покрытия'] || []).map(item => item.value).join(' '));
        const formatText = normalizeRoomRepairBuilderLabel((details['Формат покрытия'] || []).map(item => item.value).join(' '));
        const sizeText = normalizeRoomRepairBuilderLabel((details['Размер покрытия'] || []).map(item => item.value).join(' '));
        const optionText = normalizeRoomRepairBuilderLabel((details['Дополнительные опции'] || []).map(item => item.value).join(' '));
        const zoneIsWet = roomIsWet || /мокр|влаж|кухон/.test(normalizeRoomRepairBuilderLabel(`${zone.zoneType} ${zone.zoneLabel}`));
        const zoneTitle = `${zone.zoneLabel || `Покрытие ${index + 1}`}: ${zone.cover}`;

        if (zoneIsWet && /паркет|инженер|ламинат/.test(coverText)) {
          warnings.push({
            level: 'critical',
            blocking: true,
            title: 'Покрытие не подходит для влажной зоны',
            text: `${zoneTitle}. Для влажных зон лучше выбрать плитку, керамогранит, SPC/кварц-винил или отдельное влагостойкое решение.`
          });
        }

        if (zoneIsWet && /глянцев/.test(typeText)) {
          warnings.push({
            level: 'warning',
            title: 'Глянцевая плитка во влажной зоне',
            text: `${zoneTitle}. Глянцевая поверхность может быть скользкой; для мокрых зон лучше матовая или структурированная.`
          });
        }

        if (/клеев.*пробк|пробк.*клеев/.test(`${formatText} ${typeText}`) && !/подготовк.*основан|основан.*подготовк/.test(optionText)) {
          warnings.push({
            level: 'warning',
            title: 'Клеевая пробка без подготовки основания',
            text: `${zoneTitle}. Клеевая пробка требует ровного основания; добавьте общую усиленную подготовку основания пола.`
          });
        }

        if (/керамогранит|плитк/.test(coverText) && /крупн/.test(sizeText) && !/подготовк.*основан|основан.*подготовк/.test(optionText)) {
          warnings.push({
            level: 'warning',
            title: 'Крупный формат без подготовки основания',
            text: `${zoneTitle}. Крупноформатная плитка чувствительна к плоскости основания; лучше добавить усиленную подготовку.`
          });
        }

        if (hasWarmFloor && /паркет|инженер|ламинат|пробков/.test(coverText)) {
          warnings.push({
            level: 'info',
            title: 'Покрытие требует проверки с теплым полом',
            text: `${zoneTitle}. Для этого покрытия нужно проверить допуск производителя к теплому полу и температурный режим.`
          });
        }
      });
      return warnings;
    }

    function getRoomRepairValidationWarnings(room = {}, sections = {}, structuredSelections = [], impact = {}) {
      const warnings = [];
      const text = getRoomRepairAllSectionText(sections);
      const metrics = getRoomRepairMetrics(room);
      const floorArea = Number(metrics.floorArea || room.area || 0);
      const wallsArea = Number(metrics.wallArea || room.wallsArea || 0);
      const ceilingArea = Number(metrics.ceilingArea || room.ceilingArea || room.area || 0);
      const sectionCount = Object.values(sections || {}).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);
      if (!sectionCount) warnings.push({ level: 'critical', blocking: true, title: 'Состав еще не выбран', text: 'Добавьте работы слева или нажмите “Предложить состав”.' });
      if (!floorArea && sectionCount) warnings.push({ level: 'critical', blocking: true, title: 'Не указана площадь пола', text: 'Расчет материалов и части работ будет некорректным.' });
      if (!wallsArea && (sections.walls || []).length) warnings.push({ level: 'critical', blocking: true, title: 'Не указана площадь стен', text: 'Позиции по стенам требуют площади для точного объема.' });
      if (!ceilingArea && (sections.ceiling || []).length) warnings.push({ level: 'critical', blocking: true, title: 'Не указана площадь потолка', text: 'Потолочные работы требуют площади потолка для точного объема.' });
      warnings.push(...getRoomRepairConflictWarnings(room, sections));
      warnings.push(...getRoomRepairDependencyWarnings(room, sections, impact));
      warnings.push(...getRoomRepairFloorRequiredDetailWarnings(room, sections, structuredSelections));
      warnings.push(...getRoomRepairWallRequiredDetailWarnings(room, sections, structuredSelections));
      warnings.push(...getRoomRepairCeilingRequiredDetailWarnings(room, sections, structuredSelections));
      warnings.push(...getRoomRepairWallLayerDependencyWarnings(room, sections, structuredSelections));
      warnings.push(...getRoomRepairWallOptionalLayerWarnings(room, sections, structuredSelections));
      warnings.push(...getRoomRepairMoldingFinishWarnings(room, sections, structuredSelections));
      warnings.push(...getRoomRepairWallLayerAreaWarnings(room, sections, structuredSelections));
      warnings.push(...getRoomRepairFloorCompatibilityWarnings(room, sections, structuredSelections));
      const unpriced = normalizeRoomRepairStructuredSelections(structuredSelections).filter(item => item.workId && getRoomRepairWorkUnitPrice(item.workId) <= 0);
      if (unpriced.length) {
        warnings.push({ level: 'info', title: 'Есть позиции без цены работы', text: `${unpriced.length} поз. будут оценены резервной нормой до пополнения прайса.` });
      }
      return warnings.slice(0, 10);
    }

    function renderRoomRepairWarningsHtml(warnings = []) {
      if (!warnings.length) {
        return '<div class="room-repair-warning-empty"><i class="fas fa-check"></i><span>Критичных уточнений нет</span></div>';
      }
      return `
        <div class="room-repair-warning-list">
          ${warnings.map(item => `
            <div class="room-repair-warning-item is-${escapeRoomRepairHtml(item.level || 'info')} ${item.blocking ? 'is-blocking' : ''}">
              <i class="fas ${item.level === 'critical' ? 'fa-triangle-exclamation' : item.level === 'warning' ? 'fa-circle-exclamation' : 'fa-circle-info'}"></i>
              <span>
                <strong>${escapeRoomRepairHtml(item.title)}</strong>
                <small>${escapeRoomRepairHtml(item.text)}</small>
                ${Array.isArray(item.actions) && item.actions.length ? `
                  <em class="room-repair-warning-actions">
                    ${item.actions.map(action => `
                      <button type="button" onclick="addRoomRepairDependencyAction('${escapeRoomRepairJsString(action.section)}', '${escapeRoomRepairJsString(action.label)}')">
                        ${escapeRoomRepairHtml(action.buttonLabel || 'Добавить')}
                      </button>
                    `).join('')}
                  </em>
                ` : ''}
              </span>
            </div>
          `).join('')}
        </div>
      `;
    }

    function renderRoomRepairZoneCardCompositionHtml(structuredSelections = []) {
      const normalized = normalizeRoomRepairStructuredSelections(structuredSelections);
      const zoneCards = normalized
        .filter(selection => ['floor-zone-cover', 'wall-zone-cover', 'ceiling-zone-cover'].includes(selection.source))
        .filter(selection => selection.nodeKey === 'finishFloor' || selection.nodeKey === 'finishWalls' || selection.nodeKey === 'finishCeiling');
      if (!zoneCards.length) return '';
      const detailsByZone = normalized.reduce((acc, selection) => {
        if (selection.source !== 'detail' || !selection.zoneKey) return acc;
        if (!acc[selection.zoneKey]) acc[selection.zoneKey] = [];
        acc[selection.zoneKey].push(selection);
        return acc;
      }, {});
      const groups = [
        { key: 'finishFloor', label: 'Пол', icon: 'fa-layer-group' },
        { key: 'finishWalls', label: 'Стены', icon: 'fa-border-all' },
        { key: 'finishCeiling', label: 'Потолок', icon: 'fa-border-top-left' }
      ];
      return `
        <div class="room-repair-card-composition">
          <span>Карточки в расчете</span>
          ${groups.map(group => {
            const cards = zoneCards.filter(selection => selection.nodeKey === group.key);
            if (!cards.length) return '';
            return `
              <section>
                <h5><i class="fas ${group.icon}"></i>${escapeRoomRepairHtml(group.label)}</h5>
                ${cards.map(selection => {
                  const cover = selection.zoneCover || (/выберите покрытие/i.test(selection.label) ? '' : getRoomRepairSelectedCoreLabel(selection.label));
                  const details = detailsByZone[selection.zoneKey] || [];
                  const detailPreview = details.map(item => item.value || getRoomRepairSelectedCoreLabel(item.label)).filter(Boolean).slice(0, 4).join(' · ');
                  const unit = selection.quantityLabel || (selection.qtyMode === 'perimeter' ? 'м.п.' : 'м²');
                  const layer = selection.nodeKey === 'finishWalls' && Number(selection.wallLayer || 1) > 1
                    ? `Слой ${Number(selection.wallLayer || 1)} · `
                    : (selection.nodeKey === 'finishCeiling' && Number(selection.ceilingLayer || 1) > 1
                      ? `Слой ${Number(selection.ceilingLayer || 1)} · `
                      : '');
                  const openAction = selection.nodeKey === 'finishWalls'
                    ? `selectRoomRepairWallLayer(${Number(selection.wallLayer || 1)}); selectRoomRepairWallZone('${escapeRoomRepairJsString(selection.zoneKey)}')`
                    : (selection.nodeKey === 'finishCeiling'
                      ? `selectRoomRepairCeilingLayer(${Number(selection.ceilingLayer || 1)}); selectRoomRepairCeilingZone('${escapeRoomRepairJsString(selection.zoneKey)}')`
                      : `selectRoomRepairFloorZone('${escapeRoomRepairJsString(selection.zoneKey)}')`);
                  const deleteTitle = (selection.nodeKey === 'finishWalls' && Number(selection.wallLayer || 1) > 1)
                    || (selection.nodeKey === 'finishCeiling' && Number(selection.ceilingLayer || 1) > 1)
                    ? 'Удалить карточку'
                    : 'Удалить крайнюю карточку';
                  return `
                    <article class="${cover ? 'has-cover' : 'is-empty'}">
                      <div>
                        <strong>${escapeRoomRepairHtml(cover || 'Выберите покрытие')}</strong>
                        <small>${escapeRoomRepairHtml(layer + (selection.zoneLabel || 'Зона'))} · ${formatRoomRepairQtyValue(selection.quantity)} ${escapeRoomRepairHtml(unit)}</small>
                        <em>${escapeRoomRepairHtml(detailPreview || 'параметры не заполнены')}</em>
                      </div>
                      <nav>
                        <button type="button" title="Открыть карточку" onclick="${openAction}"><i class="fas fa-arrow-pointer"></i></button>
                        <button type="button" title="Очистить карточку" onclick="clearRoomRepairZoneCard('${escapeRoomRepairJsString(selection.nodeKey)}', '${escapeRoomRepairJsString(selection.zoneKey)}')"><i class="fas fa-eraser"></i></button>
                        <button type="button" title="${deleteTitle}" onclick="deleteRoomRepairZoneCard('${escapeRoomRepairJsString(selection.nodeKey)}', '${escapeRoomRepairJsString(selection.zoneKey)}')"><i class="fas fa-trash"></i></button>
                      </nav>
                    </article>
                  `;
                }).join('')}
              </section>
            `;
          }).join('')}
        </div>
      `;
    }

    function renderRoomRepairCompositionHtml(sections = {}, materialProfile = {}, impact = {}, warnings = [], structuredSelections = []) {
      const workCount = Object.values(sections || {}).reduce((sum, value) => sum + (Array.isArray(value) ? value.filter(item => !/выберите покрытие/i.test(String(item || ''))).length : 0), 0);
      const materialCount = Array.isArray(materialProfile.lines) ? materialProfile.lines.length : 0;
      const blockingCount = warnings.filter(item => item.blocking || item.level === 'critical').length;
      const zoneLabels = Array.from(new Set(normalizeRoomRepairStructuredSelections(structuredSelections)
        .filter(item => item.zoneKey && item.zoneKey !== 'full')
        .map(item => item.zoneLabel || item.zoneKey)
        .filter(Boolean)));
      const panelBits = [
        impact.electricalPanel ? `${impact.breakerGroups || 0} гр. электрощита` : '',
        impact.smartPanel ? `${impact.smartGroups || 0} гр. SMART` : '',
        impact.climateUnits ? `${impact.climateUnits} климат` : ''
      ].filter(Boolean);
      return `
        <div class="room-repair-composition-grid">
          <div><span>Работы</span><strong>${workCount}</strong><small>позиций</small></div>
          <div><span>Материалы</span><strong>${materialCount}</strong><small>позиций</small></div>
          <div><span>Щиты</span><strong>${panelBits.length || 0}</strong><small>${escapeRoomRepairHtml(panelBits.join(' · ') || 'не влияет')}</small></div>
          <div class="${blockingCount ? 'has-blockers' : (warnings.length ? 'has-warnings' : '')}"><span>Контроль</span><strong>${blockingCount || warnings.length}</strong><small>${blockingCount ? 'нужно исправить' : (warnings.length ? 'есть рекомендации' : 'все спокойно')}</small></div>
        </div>
        ${zoneLabels.length ? `
          <div class="room-repair-zone-summary">
            <span>Зоны в расчете</span>
            ${zoneLabels.slice(0, 5).map(label => `<em>${escapeRoomRepairHtml(label)}</em>`).join('')}
          </div>
        ` : ''}
        ${renderRoomRepairZoneCardCompositionHtml(structuredSelections)}
      `;
    }

    function getRoomRepairBlockingWarnings(warnings = []) {
      return (warnings || []).filter(item => item?.blocking || item?.level === 'critical');
    }

    function showRoomRepairBlockingMessage(blockingWarnings = []) {
      const first = blockingWarnings[0];
      const hint = document.getElementById('roomRepairAutoHint');
      if (hint && first) {
        hint.textContent = `Расчет пока нельзя сохранить: ${first.title}. ${first.text}`;
      }
      const card = document.querySelector('#roomRepairCalculationModal .room-repair-warning-card');
      if (card) {
        card.classList.add('is-blocking');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => card.classList.remove('is-blocking'), 2400);
      }
    }

    function markRoomRepairDraftManual() {
      const shell = getRoomRepairDraftShell();
      if (!shell) return;
      shell.dataset.repairDraftManual = 'true';
      shell.dataset.repairDraftSource = 'manual';
      const hint = document.getElementById('roomRepairManualHint');
      if (hint) hint.textContent = 'Есть ручные правки: после сохранения комната станет “Вручную”.';
      updateRoomRepairAutoActionState();
    }

    window.markRoomRepairDraftManual = markRoomRepairDraftManual;

    function refreshRoomRepairDraftPreview(markManual = false) {
      if (markManual) markRoomRepairDraftManual();
      collectRoomRepairDraftStructuredSelections(true);
      refreshRoomRepairModalCounters();
      refreshRoomRepairBuilderShell(false);
      const { room } = getRoomRepairDraftContext();
      if (!room) return;
      const shell = getRoomRepairDraftShell();
      const currentDesign = getRoomRepairCurrentDesignDraft();
      const designMode = currentDesign.mode;
      const designStyle = currentDesign.style;
      const appliedDesignMode = shell?.dataset.appliedDesignMode || designMode;
      const appliedDesignStyle = shell?.dataset.appliedDesignStyle || '';
      const designChanged = designMode !== appliedDesignMode || designStyle !== appliedDesignStyle;
      const calcDesignMode = designChanged ? appliedDesignMode : designMode;
      const calcDesignStyle = designChanged ? appliedDesignStyle : designStyle;
      if (shell) shell.dataset.repairProposalStale = designChanged ? 'style' : '';
      const calculationMode = document.getElementById('roomRepairCalculationMode')?.value || getRoomRepairDraftSolutionPackage();
      const priceTier = getRoomRepairDraftPriceTier();
      const priceTierMeta = getRoomRepairPriceTierMeta(priceTier);
      const autoContext = getRoomRepairAutoContext(room, designMode, designStyle);
      const sections = collectRoomRepairDraftSections();
      const structuredSelections = collectRoomRepairDraftStructuredSelections(true);
      const totals = estimateRoomRepairDraftTotals(room, sections, calcDesignMode, calcDesignStyle, structuredSelections, calculationMode, priceTierMeta.effectiveValue);
      const materialProfile = calculateRoomRepairMaterialProfile(room, sections, calcDesignMode, calcDesignStyle, structuredSelections);
      const impact = getRoomRepairPanelImpact(room, sections);
      const warnings = getRoomRepairValidationWarnings(room, sections, structuredSelections, impact);
      const totalEl = document.getElementById('roomRepairPreviewTotal');
      const worksEl = document.getElementById('roomRepairPreviewWorks');
      const materialsEl = document.getElementById('roomRepairPreviewMaterials');
      const mobileTotalEl = document.getElementById('roomRepairMobilePreviewTotal');
      const mobileWorksEl = document.getElementById('roomRepairMobilePreviewWorks');
      const mobileMaterialsEl = document.getElementById('roomRepairMobilePreviewMaterials');
      const priceTierEl = document.getElementById('roomRepairPreviewPriceTier');
      const materialCard = document.getElementById('roomRepairMaterialPreviewCard');
      const impactEl = document.getElementById('roomRepairPreviewImpact');
      const contextDesignEl = document.getElementById('roomRepairContextDesign');
      const contextModeEl = document.getElementById('roomRepairContextMode');
      const contextPackageEl = document.getElementById('roomRepairContextPackage');
      const styleImpactEl = document.getElementById('roomRepairStyleImpactNote');
      const warningsEl = document.getElementById('roomRepairPreviewWarnings');
      const compositionEl = document.getElementById('roomRepairPreviewComposition');
      const packageDiffEl = document.getElementById('roomRepairPackageDiff');
      if (totalEl) totalEl.textContent = formatRoomRepairMoney(totals.total);
      if (worksEl) worksEl.textContent = `Работы: ${formatRoomRepairMoney(totals.works)}`;
      if (materialsEl) materialsEl.textContent = `Материалы: ${formatRoomRepairMoney(totals.materials)}`;
      if (mobileTotalEl) mobileTotalEl.textContent = formatRoomRepairMoney(totals.total, '0 ₽');
      if (mobileWorksEl) mobileWorksEl.textContent = formatRoomRepairMoney(totals.works, '0 ₽');
      if (mobileMaterialsEl) mobileMaterialsEl.textContent = formatRoomRepairMoney(totals.materials, '0 ₽');
      if (priceTierEl) priceTierEl.textContent = `Расценки работ: ${getRoomRepairPriceMarket(priceTierMeta.effectiveValue)}`;
      if (materialCard) {
        materialCard.innerHTML = `<span>Покрытия и материалы</span>${renderRoomRepairMaterialProfileSummary(materialProfile, false, totals.materials)}`;
      }
      if (impactEl) {
        impactEl.textContent = `Сейчас: ${impact.electricalPanel ? `${impact.breakerGroups || 0} групп / ${impact.loadKw || 0} кВт` : 'нет влияния на электрощит'}${impact.smartPanel ? ' · SMART-щит' : ''}`;
      }
      if (contextDesignEl) {
        contextDesignEl.textContent = designMode === 'style' ? getRoomRepairStyleLabel(designStyle) : 'Свой дизайн';
      }
      if (contextModeEl) {
        contextModeEl.textContent = priceTierMeta.label;
      }
      if (contextPackageEl) {
        contextPackageEl.textContent = getRoomRepairSolutionPackageMeta(getRoomRepairDraftSolutionPackage()).label;
      }
      updateRoomRepairSolutionPackageUi(getRoomRepairDraftSolutionPackage());
      if (styleImpactEl) {
        const modeHint = priceTierMeta.hint;
        styleImpactEl.textContent = `${autoContext.styleCanAffectFinish
          ? 'Стиль влияет на чистовые покрытия, световые сценарии и материалы.'
          : 'Для черновой отделки и White-box стиль не меняет состав работ: считаем базовые слои и подготовку.'} ${modeHint}`;
      }
      if (warningsEl) {
        warningsEl.innerHTML = renderRoomRepairWarningsHtml(warnings);
      }
      if (compositionEl) {
        compositionEl.innerHTML = renderRoomRepairCompositionHtml(sections, materialProfile, impact, warnings, structuredSelections);
      }
      if (packageDiffEl) {
        packageDiffEl.innerHTML = renderRoomRepairPackageDiffHtml(getRoomRepairPackageDiff(room, sections, calcDesignMode, calcDesignStyle, getRoomRepairDraftSolutionPackage()));
      }
      updateRoomRepairDesignSummaryUi();
    }

    window.refreshRoomRepairDraftPreview = refreshRoomRepairDraftPreview;

    function addRoomRepairSectionPreset(sectionKey, value, structuredSelection = null, actionLabel = '') {
      const textarea = document.querySelector(`[data-repair-section="${sectionKey}"]`);
      if (!textarea) return;
      const items = splitRoomRepairSectionTextarea(textarea.value);
      const text = String(value || '').trim();
      const allowDuplicate = structuredSelection?.source === 'detail' && structuredSelection?.zoneKey;
      if (text && (allowDuplicate || !items.includes(text))) {
        pushRoomRepairDraftHistory(actionLabel || `Добавлено: ${text}`);
        items.push(text);
      }
      textarea.value = items.slice(0, 24).join('\n');
      if (structuredSelection) addRoomRepairStructuredSelection(structuredSelection);
      refreshRoomRepairDraftPreview(true);
    }

    window.addRoomRepairSectionPreset = addRoomRepairSectionPreset;

    function addRoomRepairDependencyAction(sectionKey, value) {
      const text = String(value || '').trim();
      if (!sectionKey || !text) return;
      addRoomRepairSectionPreset(sectionKey, text, createRoomRepairManualStructuredSelection(sectionKey, text, 'dependency'), `Добавлено уточнение: ${text}`);
      const hint = document.getElementById('roomRepairAutoHint');
      if (hint) hint.textContent = `Добавлено системное уточнение: ${text}. Проверьте состав и пересчитайте ремонт.`;
    }

    window.addRoomRepairDependencyAction = addRoomRepairDependencyAction;

    function addRoomRepairCustomCount(sectionKey, inputId, suffix) {
      const input = document.getElementById(inputId);
      const max = sectionKey === 'climate' ? getRoomClimateUnitLimit() : 40;
      const count = Math.max(1, Math.min(max, parseInt(input?.value, 10) || 1));
      const normalizedSuffix = String(suffix || '').trim();
      const text = normalizedSuffix ? `${count} ${normalizedSuffix}` : String(count);
      const sectionLabel = getRoomRepairSectionLabel(sectionKey);
      const rule = getRoomRepairBuilderWorkRule(sectionKey, text);
      addRoomRepairSectionPreset(sectionKey, text, {
        id: getRoomRepairStructuredSelectionKey({ section: sectionKey, source: 'custom-count', label: text }),
        section: sectionKey,
        label: text,
        groupKey: 'quick-count',
        groupLabel: 'Быстрое количество',
        nodeKey: sectionKey,
        nodeLabel: sectionLabel,
        detailGroup: '',
        source: 'custom-count',
        quantity: count,
        quantityLabel: normalizedSuffix,
        workId: rule?.workId || '',
        targetCategory: rule?.targetCategory || '',
        qtyMode: rule?.qtyMode || ''
      }, `Добавлено количество: ${text}`);
    }

    window.addRoomRepairCustomCount = addRoomRepairCustomCount;

    function removeRoomRepairSectionItem(sectionKey, itemIndex) {
      const textarea = document.querySelector(`[data-repair-section="${sectionKey}"]`);
      if (!textarea) return;
      const items = splitRoomRepairSectionTextarea(textarea.value);
      const index = Number(itemIndex);
      if (Number.isNaN(index) || index < 0 || index >= items.length) return;
      const removedLabel = items[index];
      const occurrenceIndex = items.slice(0, index).filter(item => item === removedLabel).length;
      pushRoomRepairDraftHistory(`Удалено: ${removedLabel}`);
      items.splice(index, 1);
      textarea.value = items.join('\n');
      removeRoomRepairStructuredSelection(sectionKey, removedLabel, occurrenceIndex);
      refreshRoomRepairDraftPreview(true);
    }

    window.removeRoomRepairSectionItem = removeRoomRepairSectionItem;

    function clearRoomRepairSection(sectionKey) {
      const textarea = document.querySelector(`[data-repair-section="${sectionKey}"]`);
      if (!textarea) return;
      const items = splitRoomRepairSectionTextarea(textarea.value);
      if (items.length) pushRoomRepairDraftHistory(`Очищен блок: ${getRoomRepairSectionLabel(sectionKey)}`);
      textarea.value = '';
      clearRoomRepairStructuredSection(sectionKey);
      if (sectionKey === 'floor') {
        const shell = getRoomRepairDraftShell();
        if (shell) shell.dataset.activeFloorZone = 'floor_zone_1';
      }
      if (sectionKey === 'walls') {
        const shell = getRoomRepairDraftShell();
        if (shell) {
          shell.dataset.activeWallZone = 'wall_zone_1';
          shell.dataset.activeWallLayer = '1';
          shell.dataset.wallCoverPickerOpen = 'false';
        }
      }
      refreshRoomRepairDraftPreview(true);
      refreshRoomRepairBuilderShell(true);
    }

    window.clearRoomRepairSection = clearRoomRepairSection;

    function clearRoomRepairCalculation(roomId, floorIndex, roomIndex) {
      const room = roomData?.[roomId]?.floors?.[floorIndex]?.livingRooms?.[roomIndex];
      if (!room) return;
      const current = ensureRoomRepairCalculation(room);
      room.repairCalculation = {
        ...current,
        status: 'none',
        source: '',
        manualEdited: false,
        calculatedAt: '',
        updatedAt: new Date().toISOString(),
        designMode: room.repairData?.designStyle ? 'style' : 'own',
        designStyle: room.repairData?.designStyle || '',
        calculationMode: 'comfort',
        solutionPackage: 'comfort',
        priceTier: 'inherit',
        effectivePriceTier: getRoomRepairObjectPriceTier(),
        climateUnits: 0,
        totals: { works: 0, materials: 0, total: 0 },
        sections: {},
        structuredSelections: [],
        materialProfile: { total: 0, lines: [] },
        panelImpact: {},
        affectsPanels: { electricalPanel: false, smartPanel: false }
      };
      syncRoomRepairCalculationToWhatToDo(roomId, floorIndex, roomIndex, {}, 'manual');
      closeRoomRepairCalculationModal();
      if (typeof saveAndRestoreFloorRoomStates === 'function' && typeof renderFloorRooms === 'function') {
        saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      } else if (typeof renderFloorRooms === 'function') {
        renderFloorRooms(roomId, floorIndex);
      }
      if (typeof renderWhatToDoRooms === 'function') renderWhatToDoRooms();
      if (typeof renderAllDemolitionFinishingSections === 'function') renderAllDemolitionFinishingSections();
      if (typeof renderAllRepairSections === 'function') renderAllRepairSections();
      if (typeof renderAllRepairOpeningSections === 'function') renderAllRepairOpeningSections();
      rebuildRoomRepairPanelImpactSummary();
      if (typeof window.refreshRepairQuestRoomRepairScopes === 'function') window.refreshRepairQuestRoomRepairScopes();
      updateTotalAreas();
      updateDetailedCalc();
    }

    window.clearRoomRepairCalculation = clearRoomRepairCalculation;

    function toggleRoomRepairDesignStyleVisibility() {
      updateRoomRepairDesignDraft();
    }

    function closeRoomRepairCalculationModal() {
      const shell = document.getElementById('roomRepairCalculationModal');
      if (!shell) return;
      shell.classList.remove('is-open');
      shell.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('room-repair-modal-open');
    }

    function applyRoomRepairCalculationDraft(roomId, floorIndex, roomIndex) {
      const room = roomData?.[roomId]?.floors?.[floorIndex]?.livingRooms?.[roomIndex];
      if (!room) return;
      const calc = ensureRoomRepairCalculation(room);
      const designMode = document.getElementById('roomRepairDesignMode')?.value || 'own';
      const designStyle = designMode === 'style' ? (document.getElementById('roomRepairDesignStyle')?.value || '') : '';
      const calculationMode = document.getElementById('roomRepairCalculationMode')?.value || getRoomRepairDraftSolutionPackage();
      const solutionPackage = getRoomRepairDraftSolutionPackage();
      const priceTier = getRoomRepairDraftPriceTier();
      const priceTierMeta = getRoomRepairPriceTierMeta(priceTier);
      const sections = collectRoomRepairDraftSections();
      const structuredSelections = collectRoomRepairDraftStructuredSelections(true);
      const draftShell = getRoomRepairDraftShell();
      if (draftShell?.dataset.repairProposalStale === 'style') {
        const hint = document.getElementById('roomRepairAutoHint');
        if (hint) hint.textContent = 'Стиль изменился. Нажмите “Обновить по стилю”, чтобы пересобрать состав и стоимость перед сохранением.';
        updateRoomRepairAutoActionState();
        return;
      }
      const hasManualDraft = draftShell?.dataset.repairDraftManual === 'true';
      const source = hasManualDraft
        ? 'manual'
        : (draftShell?.dataset.repairDraftSource || calc.source || 'auto');
      const totals = estimateRoomRepairDraftTotals(room, sections, designMode, designStyle, structuredSelections, calculationMode, priceTierMeta.effectiveValue);
      const materialProfile = calculateRoomRepairMaterialProfile(room, sections, designMode, designStyle, structuredSelections);
      const climateUnits = getRoomRepairClimateUnits(room, sections);
      const panelImpact = getRoomRepairPanelImpact(room, sections);
      const warnings = getRoomRepairValidationWarnings(room, sections, structuredSelections, panelImpact);
      const blockingWarnings = getRoomRepairBlockingWarnings(warnings);
      if (blockingWarnings.length) {
        refreshRoomRepairDraftPreview(false);
        showRoomRepairBlockingMessage(blockingWarnings);
        return;
      }

      room.repairCalculation = {
        ...calc,
        status: 'calculated',
        source,
        manualEdited: source === 'manual',
        calculatedAt: calc.calculatedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        designMode,
        designStyle,
        designStyleName: getRoomRepairStyleLabel(designStyle),
        calculationMode: normalizeRoomRepairRepairTier(calculationMode),
        calculationModeName: getRoomRepairCalculationModeMeta(calculationMode).label,
        solutionPackage,
        solutionPackageName: getRoomRepairSolutionPackageMeta(solutionPackage).label,
        priceTier,
        priceTierName: priceTierMeta.label,
        effectivePriceTier: priceTierMeta.effectiveValue,
        priceMarket: getRoomRepairPriceMarket(priceTierMeta.effectiveValue),
        sections,
        structuredSelections,
        climateUnits,
        totals,
        materialProfile,
        panelImpact,
        affectsPanels: {
          electricalPanel: (sections.electrical || []).length > 0,
          smartPanel: (sections.smartHome || []).length > 0
        }
      };
      room.repairData = room.repairData || {};
      room.repairData.designStyle = designStyle || room.repairData.designStyle || '';
      room.repairData.climateUnits = climateUnits;
      syncRoomRepairCalculationToWhatToDo(roomId, floorIndex, roomIndex, sections, source, structuredSelections, {
        solutionPackage,
        calculationMode: normalizeRoomRepairRepairTier(calculationMode),
        priceTier,
        effectivePriceTier: priceTierMeta.effectiveValue,
        priceMarket: getRoomRepairPriceMarket(priceTierMeta.effectiveValue)
      });

      closeRoomRepairCalculationModal();
      saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      if (typeof renderWhatToDoRooms === 'function') renderWhatToDoRooms();
      if (typeof renderAllDemolitionFinishingSections === 'function') renderAllDemolitionFinishingSections();
      if (typeof renderAllRepairSections === 'function') renderAllRepairSections();
      if (typeof renderAllRepairOpeningSections === 'function') renderAllRepairOpeningSections();
      rebuildRoomRepairPanelImpactSummary();
      if (typeof window.refreshRepairQuestRoomRepairScopes === 'function') window.refreshRepairQuestRoomRepairScopes();
      updateTotalAreas();
      updateDetailedCalc();
    }

    function renderFloorRooms(roomId, floorIndex) {
      const getPremiseGroupsFn = window.getFloorPremiseGroups || (typeof getFloorPremiseGroups === 'function' ? getFloorPremiseGroups : null);
      const container = document.getElementById('floorRoomsContainer_' + roomId + '_' + floorIndex);
      if (!container) return;
      
      const floor = roomData[roomId].floors[floorIndex];
      if (typeof syncObjectFloorLocation === 'function') syncObjectFloorLocation(floorIndex);
      if (typeof buildHouseRoomRegistry === 'function') buildHouseRoomRegistry(true);
      const rooms = floor.livingRooms || [];
      const room = priceData.rooms[roomId];
      const roomName = 'Помещение';
      const renderPremiseGroups = getPremiseGroupsFn ? getPremiseGroupsFn(roomId, floorIndex) : [];
      const renderEntries = renderPremiseGroups.length
        ? renderPremiseGroups.flatMap(group => group.rooms.map(item => ({ roomDataItem: item.room, roomIndex: item.index, premiseGroup: group })))
        : rooms.map((roomDataItem, roomIndex) => ({ roomDataItem, roomIndex, premiseGroup: null }));
      const renderSubAppointmentOptions = data => {
        const options = getPremiseSubOptions(data.appointment);
        return options.map(item => `<option value="${item.value}" ${data.subAppointment === item.value ? 'selected' : ''}>${item.label}</option>`).join('');
      };
      const renderRetailPremiseTypeOptions = data => {
        const options = typeof retailPremiseTypeOptions !== 'undefined' ? retailPremiseTypeOptions : [];
        return options.map(item => `<option value="${item.value}" ${data.retailPremiseType === item.value ? 'selected' : ''}>${item.label}</option>`).join('');
      };
      const renderAppointmentOptions = data => getPremiseAppointmentOptions()
        .map(item => `<option value="${item.value}" ${data.appointment === item.value ? 'selected' : ''}>${item.label}</option>`)
        .join('');
      const renderMasterGroupControls = (firstRoom, premiseId) => {
        if (!isEuroPremiseRoom(firstRoom)) return '';
        const masterGroups = getPremiseMasterGroups(roomId, floorIndex, premiseId);
        return `
          <div class="master-room-shell">
            <div class="master-room-summary">
              <div>
                <span>Мастер-комнаты (шт.):</span>
                <div class="qty-controls">
                  <button type="button" class="qty-btn" onclick="changePremiseMasterGroupCount('${roomId}', ${floorIndex}, '${premiseId}', -1)">−</button>
                  <input type="number" value="${masterGroups.length}" min="0" max="10" class="qty-input" onchange="updatePremiseMasterGroupCount('${roomId}', ${floorIndex}, '${premiseId}', this.value)">
                  <button type="button" class="qty-btn" onclick="changePremiseMasterGroupCount('${roomId}', ${floorIndex}, '${premiseId}', 1)">+</button>
                </div>
              </div>
              <small>Доступно для евроквартир и евроапартаментов. Каждая внутренняя комната считается отдельно.</small>
            </div>
          </div>
        `;
      };
      const buildPremiseUnits = entries => {
        const units = [];
        const seen = new Set();
        (entries || []).forEach((room, index) => {
          const isMaster = !!(room?.roomGroupType && room.roomGroupType !== 'regular');
          if (isMaster) {
            const key = `master:${room.roomGroupType}:${Number(room.roomGroupIndex || 0)}`;
            if (seen.has(key)) return;
            seen.add(key);
            units.push({
              key,
              type: 'master',
              rooms: entries.filter(item => item?.roomGroupType === room.roomGroupType && Number(item?.roomGroupIndex || 0) === Number(room.roomGroupIndex || 0))
            });
            return;
          }
          units.push({
            key: `room:${room.roomUid || room.legacyRoomKey || index}`,
            type: 'regular',
            rooms: [room]
          });
        });
        return units;
      };
      const renderUnitMoveControls = (premiseId, unitKey, unitPosition, unitsTotal, label = 'элемент') => `
        <div class="room-reorder-controls" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" title="Перемещение доступно, когда ${label} свернута">
          <button type="button" class="room-reorder-btn" ${unitPosition <= 0 ? 'disabled' : ''} onclick="movePremiseRoomUnit('${roomId}', ${floorIndex}, '${premiseId}', '${unitKey}', -1)" aria-label="Переместить выше">
            <i class="fas fa-arrow-up"></i>
          </button>
          <button type="button" class="room-reorder-btn" ${unitPosition >= unitsTotal - 1 ? 'disabled' : ''} onclick="movePremiseRoomUnit('${roomId}', ${floorIndex}, '${premiseId}', '${unitKey}', 1)" aria-label="Переместить ниже">
            <i class="fas fa-arrow-down"></i>
          </button>
          <span class="room-drag-handle" draggable="true"
                ondragstart="startPremiseRoomUnitDrag(event, '${roomId}', ${floorIndex}, '${premiseId}', '${unitKey}')"
                ondragover="event.preventDefault()"
                ondrop="dropPremiseRoomUnit(event, '${roomId}', ${floorIndex}, '${premiseId}', '${unitKey}')"
                aria-label="Перетащить">
            <i class="fas fa-grip-vertical"></i>
          </span>
        </div>
      `;
      const renderMasterRoomCardOpen = (roomDataItem, currentPremiseGroup, premiseUnits) => {
        const groupIndex = Number(roomDataItem.roomGroupIndex || 0);
        const groupType = roomDataItem.roomGroupType || 'master_bedroom';
        const typeLabel = typeof getMasterRoomTypeLabel === 'function' ? getMasterRoomTypeLabel(groupType) : 'Мастер-комната';
        const groupRooms = (currentPremiseGroup?.rooms || [])
          .filter(item => item.room && item.room.roomGroupType && item.room.roomGroupType !== 'regular' && Number(item.room.roomGroupIndex || 0) === groupIndex);
        const premiseId = roomDataItem.premiseId || '';
        const safePremiseId = String(premiseId).replace(/[^a-zA-Z0-9_-]/g, '_');
        const cardId = `masterRoom_${roomId}_${floorIndex}_${safePremiseId}_${groupIndex}`;
        const unitKey = `master:${groupType}:${groupIndex}`;
        const unitPosition = (premiseUnits || []).findIndex(unit => unit.key === unitKey);
        const maxRooms = groupType === 'kitchen_living' ? 5 : 14;
        const minRooms = groupType === 'kitchen_living' ? 2 : 3;
        const icon = groupType === 'kitchen_living' ? 'fa-kitchen-set' : 'fa-bed';
        return `
          <div class="master-room-card is-collapsed" id="${cardId}" data-premise-unit-key="${unitKey}">
            <div class="master-room-card-head" onclick="toggleMasterRoomCard('${cardId}')">
              <i class="fas fa-chevron-down master-room-chevron" id="${cardId}Icon" style="transform: rotate(-90deg)"></i>
              <div class="master-room-card-title">
                <span>Мастер-комната ${groupIndex + 1}</span>
                <strong>${typeLabel}</strong>
              </div>
              ${renderUnitMoveControls(premiseId, unitKey, unitPosition, (premiseUnits || []).length, 'мастер-комната')}
              <i class="fas ${icon} master-room-card-mark"></i>
            </div>
            <div class="master-room-card-body" id="${cardId}Body" style="display: none">
              <div class="master-room-fields">
                <div class="area-input-group vertical premise-field master-room-type-field">
                  <label class="text-sm text-gray-500 font-bold">Тип мастер-комнаты:</label>
                  <select class="w-full px-3 py-2 border rounded-lg bg-bg-primary" onchange="updateMasterGroupType('${roomId}', ${floorIndex}, '${premiseId}', ${groupIndex}, this.value)">
                    ${(window.masterRoomTypeOptions || []).map(option => `<option value="${option.value}" ${option.value === groupType ? 'selected' : ''}>${option.label}</option>`).join('')}
                  </select>
                </div>
                <div class="premise-room-count premise-room-count--inline master-room-count">
                  <span>Комнаты (шт.):</span>
                  <div class="qty-controls">
                    <button type="button" class="qty-btn" onclick="changeMasterGroupRoomCount('${roomId}', ${floorIndex}, '${premiseId}', ${groupIndex}, -1)">−</button>
                    <input type="number" value="${groupRooms.length || minRooms}" min="${minRooms}" max="${maxRooms}" class="qty-input" onchange="updateMasterGroupRoomCount('${roomId}', ${floorIndex}, '${premiseId}', ${groupIndex}, this.value)">
                    <button type="button" class="qty-btn" onclick="changeMasterGroupRoomCount('${roomId}', ${floorIndex}, '${premiseId}', ${groupIndex}, 1)">+</button>
                  </div>
                  <small>до ${maxRooms}</small>
                </div>
              </div>
              <div class="master-room-chambers">
        `;
      };
      
      let html = '';
      renderEntries.forEach(({ roomDataItem, roomIndex, premiseGroup }) => {
        const floorNum = floorIndex + 1;
        const roomNum = roomIndex + 1;
        
        syncLivingRoomDerivedAreas(roomDataItem);
        const defaultZone = typeof getDefaultRoomZoneForObject === 'function' ? getDefaultRoomZoneForObject() : '';
        if (typeof ensureRoomZone === 'function') ensureRoomZone(roomDataItem, roomDataItem.roomZone || defaultZone);
        const wallsArea = calculateLivingRoomWallsArea(roomDataItem);
        const registryEntry = (roomData.roomRegistry || []).find(entry => entry.uid && entry.uid === roomDataItem.roomUid) || null;
        const displayName = typeof formatRoomRegistryLabel === 'function'
          ? formatRoomRegistryLabel(registryEntry || {
              displayName: roomName + '_' + floorNum + '_' + roomNum,
              floorDisplayName: `Этажное помещение ${roomNum}`,
              floorNumber: floorNum,
              categoryLabel: roomName,
              location: roomDataItem.location || floor.location
            }, 'short')
          : (registryEntry?.displayName || roomName + '_' + floorNum + '_' + roomNum);
        const floorDisplayName = typeof formatRoomRegistryLabel === 'function'
          ? formatRoomRegistryLabel(registryEntry || { floorDisplayName: `Этажное помещение ${roomNum}` }, 'floor')
          : (registryEntry?.floorDisplayName || `Этажное помещение ${roomNum}`);
        const registryContextLine = typeof formatRoomRegistryLabel === 'function'
          ? formatRoomRegistryLabel(registryEntry || {
              floorNumber: floorNum,
              floorDisplayName,
              categoryLabel: roomName,
              location: roomDataItem.location || floor.location
            }, 'context')
          : `Этаж ${floorNum} · ${roomName}`;
        const categoryLabel = registryEntry?.categoryLabel || (typeof getRoomZoneLabel === 'function' ? getRoomZoneLabel(roomDataItem.roomZone) : roomName);
        const roomTypeLabel = roomDataItem.roomType || 'Тип не выбран';
        const currentPremiseGroup = premiseGroup || renderPremiseGroups.find(group => group.id === roomDataItem.premiseId);
        const isFirstChamber = !roomDataItem.chamberNumber || roomDataItem.chamberNumber === 1;
        const regularRooms = (currentPremiseGroup?.rooms || []).filter(item => !item.room.roomGroupType || item.room.roomGroupType === 'regular');
        const chamberCount = isEuroPremiseRoom(roomDataItem) ? Math.max(1, regularRooms.length || 1) : (currentPremiseGroup?.rooms?.length || 1);
        const isLastChamber = !currentPremiseGroup || currentPremiseGroup.rooms?.[currentPremiseGroup.rooms.length - 1]?.index === roomIndex;
        const subOptions = getPremiseSubOptions(roomDataItem.appointment);
        const typeCatalog = roomDataItem.roomGroupType && roomDataItem.roomGroupType !== 'regular'
          ? getMasterAllowedTypes(roomDataItem.roomGroupType).map(item => {
              const fallbackCatalog = typeof getRoomTypeCatalogByZone === 'function' ? getRoomTypeCatalogByZone(item.zone, roomDataItem) : [];
              const match = fallbackCatalog.find(type => type.name === item.roomType);
              return match || { name: item.roomType, icon: item.zone === 'living' ? 'fa-bed' : 'fa-door-open', zone: item.zone };
            })
          : (typeof getRoomTypeCatalogByZone === 'function'
              ? getRoomTypeCatalogByZone(roomDataItem.roomZone || '', roomDataItem)
              : (typeof getRoomTypeCatalogForAppointment === 'function' ? getRoomTypeCatalogForAppointment(roomId, roomDataItem) : room.room_types));
        
        if (isFirstChamber) {
          html += `
            <div class="premise-card">
              <div class="premise-card-head cursor-pointer" onclick="togglePremiseCard(this)">
                <i class="fas fa-chevron-down text-xs transition-transform premise-card-icon"></i>
                <div>
                  <strong>${displayName}</strong>
                  <small>${floorDisplayName}</small>
                </div>
              </div>
              <div class="premise-card-body">
              <div class="premise-fields">
                <div class="area-input-group vertical premise-field">
                  <label class="text-sm text-gray-500 font-bold">Назначение помещения:</label>
                  <select id="floorAppointment_${roomId}_${floorIndex}_${roomIndex}" class="w-full px-3 py-2 border rounded-lg bg-bg-primary" onchange="updateFloorRoomAppointment('${roomId}', ${floorIndex}, ${roomIndex}, this.value)">
                    <option value="">Выберите назначение</option>
                    ${renderAppointmentOptions(roomDataItem)}
                  </select>
                </div>
                <div class="area-input-group vertical premise-field ${subOptions.length ? '' : 'hidden'}">
                  <label class="text-sm text-gray-500 font-bold">Формат помещения:</label>
                  <select id="floorSubAppointment_${roomId}_${floorIndex}_${roomIndex}" class="w-full px-3 py-2 border rounded-lg bg-bg-primary" onchange="updateFloorRoomSubAppointment('${roomId}', ${floorIndex}, ${roomIndex}, this.value)">
                    <option value="">Выберите</option>
                    ${renderSubAppointmentOptions(roomDataItem)}
                  </select>
                </div>
                <div class="area-input-group vertical premise-field ${typeof shouldShowRetailPremiseType === 'function' && shouldShowRetailPremiseType(roomDataItem) ? '' : 'hidden'}">
                  <label class="text-sm text-gray-500 font-bold">Тип помещения:</label>
                  <select id="floorRetailPremiseType_${roomId}_${floorIndex}_${roomIndex}" class="w-full px-3 py-2 border rounded-lg bg-bg-primary" onchange="updateFloorRoomRetailPremiseType('${roomId}', ${floorIndex}, ${roomIndex}, this.value)">
                    <option value="">Выберите тип магазина</option>
                    ${renderRetailPremiseTypeOptions(roomDataItem)}
                  </select>
                </div>
              </div>
              <div class="premise-room-count premise-room-count--inline">
                <span>Комнаты (шт.):</span>
                <div class="qty-controls">
                  <button type="button" class="qty-btn" onclick="changePremiseChamberCount('${roomId}', ${floorIndex}, '${roomDataItem.premiseId}', -1)">−</button>
                  <input type="number" value="${chamberCount}" min="1" max="25" class="qty-input" onchange="updatePremiseChamberCount('${roomId}', ${floorIndex}, '${roomDataItem.premiseId}', this.value)">
                  <button type="button" class="qty-btn" onclick="changePremiseChamberCount('${roomId}', ${floorIndex}, '${roomDataItem.premiseId}', 1)">+</button>
                </div>
              </div>
              ${renderMasterGroupControls(roomDataItem, roomDataItem.premiseId)}
          `;
        }

        const currentPremiseEntries = currentPremiseGroup?.rooms?.map(item => item.room) || [];
        const currentPremisePosition = currentPremiseEntries.indexOf(roomDataItem);
        const previousEntry = currentPremisePosition > 0 ? currentPremiseEntries[currentPremisePosition - 1] : null;
        const nextEntry = currentPremisePosition >= 0 ? currentPremiseEntries[currentPremisePosition + 1] : null;
        const currentGroupKey = `${roomDataItem.roomGroupType || 'regular'}:${Number(roomDataItem.roomGroupIndex || 0)}`;
        const previousGroupKey = previousEntry ? `${previousEntry.roomGroupType || 'regular'}:${Number(previousEntry.roomGroupIndex || 0)}` : '';
        const nextGroupKey = nextEntry ? `${nextEntry.roomGroupType || 'regular'}:${Number(nextEntry.roomGroupIndex || 0)}` : '';
        const premiseUnits = buildPremiseUnits(currentPremiseEntries);
        const regularUnitKey = `room:${roomDataItem.roomUid || roomDataItem.legacyRoomKey || roomIndex}`;
        const regularUnitPosition = premiseUnits.findIndex(unit => unit.key === regularUnitKey);
        const isMasterGroup = !!(roomDataItem.roomGroupType && roomDataItem.roomGroupType !== 'regular');
        const isGroupStart = currentGroupKey !== previousGroupKey;
        const isGroupEnd = currentGroupKey !== nextGroupKey;
        if (isGroupStart) {
          if (isMasterGroup) {
            html += renderMasterRoomCardOpen(roomDataItem, currentPremiseGroup, premiseUnits);
          } else {
            html += `<div class="chamber-group-title"><i class="fas fa-door-open"></i><span>Обычные комнаты</span></div>`;
          }
        }

        html += `
          <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 chamber-card" ${!isMasterGroup ? `data-premise-unit-key="${regularUnitKey}"` : ''}>
            <div class="floor-room-registry-head cursor-pointer" onclick="toggleFloorRoomGroup('${roomId}', '${floorIndex}', '${roomIndex}')">
              <i class="fas fa-chevron-down text-xs transition-transform" id="floorRoom_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
              <div class="floor-room-registry-main">
                <span>${roomDataItem.chamberDisplayName || `Комната ${roomDataItem.chamberNumber || 1}`}</span>
                <em class="floor-room-type-chip ${roomDataItem.roomType ? '' : 'is-empty'}">${roomTypeLabel}</em>
                ${renderRoomRepairHeaderBadges(roomDataItem)}
                <strong>${displayName}</strong>
              </div>
              <div class="floor-room-registry-meta">
                <em>${categoryLabel}</em>
                <small>${registryContextLine}</small>
              </div>
              ${!isMasterGroup ? renderUnitMoveControls(roomDataItem.premiseId || '', regularUnitKey, regularUnitPosition, premiseUnits.length, 'комната') : ''}
            </div>
<div id="floorRoom_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
              <div class="room-zone-card room-zone-card--inline">
                <label class="room-zone-label">Жилая / нежилая:</label>
                <label class="room-zone-select-wrap" aria-label="Классификация комнаты">
                  <i class="fas ${typeof getRoomZoneIcon === 'function' ? getRoomZoneIcon(roomDataItem.roomZone) : 'fa-circle-dot'}"></i>
                  <select class="room-zone-select" onchange="updateFloorRoomZone('${roomId}', ${floorIndex}, ${roomIndex}, this.value)">
                    <option value="" ${!roomDataItem.roomZone ? 'selected' : ''}>Выберите</option>
                    <option value="living" ${roomDataItem.roomZone === 'living' ? 'selected' : ''}>Жилая зона</option>
                    <option value="nonliving" ${roomDataItem.roomZone === 'nonliving' ? 'selected' : ''}>Нежилая зона</option>
                  </select>
                </label>
              </div>
              <div class="area-input-group" style="margin: 8px 0">
                <label class="text-sm text-gray-500 w-28 font-bold">\u0422\u0438\u043F \u043A\u043E\u043C\u043D\u0430\u0442\u044B:</label>
                <div class="custom-select-wrapper" style="position: relative; display: inline-block;">
                  <button type="button" class="custom-select-btn" style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; border: 2px solid #4ade80; border-radius: 6px; background: var(--bg-primary); font-size: 14px; font-weight: 600; cursor: pointer; min-width: 160px;" onclick="toggleFloorCustomSelect('${roomId}', ${floorIndex}, ${roomIndex})" ${typeCatalog?.length ? '' : 'disabled'}>
                    <i class="fas ${typeCatalog?.find(t => t.name === roomDataItem.roomType)?.icon || 'fa-home'}" id="floorRoomTypeIcon_${roomId}_${floorIndex}_${roomIndex}" style="color: #22c55e"></i>
                    <span id="floorRoomTypeText_${roomId}_${floorIndex}_${roomIndex}">${roomDataItem.roomType || (typeCatalog?.length ? '\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435' : '\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0437\u043E\u043D\u0443')}</span>
                    <i class="fas fa-chevron-down" style="margin-left: auto; font-size: 10px; color: #6b7280"></i>
                  </button>
                  <div id="floorCustomSelect_${roomId}_${floorIndex}_${roomIndex}" class="custom-select-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-primary); border: 2px solid #4ade80; border-radius: 6px; margin-top: 4px; max-height: 200px; overflow-y: auto; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                    ${typeCatalog?.map(type => `<div class="custom-select-option" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; transition: background 0.2s;" onmouseenter="this.style.background='rgba(74, 222, 128, 0.1)'" onmouseleave="this.style.background='transparent'" onclick="selectFloorRoomType('${roomId}', ${floorIndex}, ${roomIndex}, '${type.name}', '${type.icon}')"><i class="fas ${type.icon}" style="color: #22c55e !important;"></i><span style="color: inherit;">${type.name}</span></div>`).join('')}
                  </div>
                </div>
              </div>
              <div class="area-input-group">
                <label class="text-xs text-gray-500 w-32">\u0412\u044B\u0441\u043E\u0442\u0430 \u043F\u043E\u0442\u043E\u043B\u043A\u0430 (\u043C):</label>
                <input type="number" value="${parseFloat(roomDataItem.ceiling || 3).toFixed(2)}" min="2" max="6" step="0.01"
                       class="area-input" style="width: 80px"
                       onchange="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, 'ceiling', this.value)"
                       oninput="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, 'ceiling', this.value)">
              </div>
              ${renderLivingRoomAreaCalcMode(`floor:${roomId}:${floorIndex}:${roomIndex}`, roomDataItem)}
              ${renderLivingRoomAreaCalcSummary(roomDataItem)}
              ${typeof shouldShowLivingRoomSurfaceAreaFields === 'function' && shouldShowLivingRoomSurfaceAreaFields(roomDataItem) ? `
                ${renderQuestAreaStepper(`floor:${roomId}:${floorIndex}:${roomIndex}`, 'area', roomDataItem.area, '\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043F\u043E\u043B\u0430', '\u043C\u00B2', 0, typeof getLivingRoomAreaLimit === 'function' ? getLivingRoomAreaLimit(roomDataItem) : 1000)}
                ${renderQuestAreaStepper(`floor:${roomId}:${floorIndex}:${roomIndex}`, 'wallsArea', wallsArea, '\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0441\u0442\u0435\u043D', '\u043C\u00B2', 0, typeof getLivingRoomWallsAreaLimit === 'function' ? getLivingRoomWallsAreaLimit(roomDataItem) : 2000)}
                ${renderQuestAreaStepper(`floor:${roomId}:${floorIndex}:${roomIndex}`, 'ceilingArea', getLivingRoomCeilingArea(roomDataItem), '\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043F\u043E\u0442\u043E\u043B\u043A\u0430', '\u043C\u00B2', 0, 500)}
              ` : (typeof renderLivingRoomAreaModeHint === 'function' ? renderLivingRoomAreaModeHint() : '')}
              ${typeof renderRoomOccupancyStepper === 'function' ? renderRoomOccupancyStepper(`floor:${roomId}:${floorIndex}:${roomIndex}`, roomDataItem) : ''}
              ${renderFloorRoomOpeningsGroup(roomId, floorIndex, roomIndex, roomDataItem)}
              <div class="room-openings-shell mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                <div class="room-openings-head" data-room-composite="floorConstructions_${floorIndex}_${roomIndex}" onclick="toggleRoomFieldGroup('${roomId}', 'floorConstructions_${floorIndex}_${roomIndex}')">
                  <i class="fas fa-chevron-down text-xs transition-transform" id="floorConstructions_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
                  <span class="text-sm font-semibold flex-1">\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438</span>
                  <em data-composite-count>${renderRoomCompositeBadge(getRoomCompositeCount(roomDataItem, ['nicheCount', 'projectionCount', 'columnCount']))}</em>
                </div>
                <div id="floorConstructions_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="room-openings-body">
                  ${renderFloorRoomConstructions(roomId, floorIndex, roomIndex, roomDataItem, 'niche', '\u041D\u0438\u0448\u0430', 'fa-th-large')}
                  ${renderFloorRoomConstructions(roomId, floorIndex, roomIndex, roomDataItem, 'projection', '\u0412\u044B\u0441\u0442\u0443\u043F', 'fa-caret-square-up')}
                  ${renderFloorRoomConstructions(roomId, floorIndex, roomIndex, roomDataItem, 'column', '\u041A\u043E\u043B\u043E\u043D\u043D\u0430', 'fa-columns')}
                </div>
              </div>
              <div class="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'floorMaterials_${floorIndex}_${roomIndex}')">
                  <i class="fas fa-chevron-down text-xs transition-transform" id="floorMaterials_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
                  <span class="text-sm font-medium">\u041F\u043B\u043E\u0449\u0430\u0434\u0438 \u0431\u0435\u0437 \u0437\u0430\u043F\u0430\u0441\u0430</span>
                </div>
                <div id="floorMaterials_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
                  <div class="area-input-group">
                    <label class="text-xs text-gray-500 w-32">\u0417\u0430\u043F\u0430\u0441 \u0434\u043B\u044F \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432:</label>
                    <input type="number" id="floorRoomMatCoeff_${roomId}_${floorIndex}_${roomIndex}" value="${roomDataItem.materialCoefficient || 1.1}" min="1" max="2" step="0.05"
                           class="area-input" style="width: 70px"
                           onchange="updateFloorRoomMaterialCoeff('${roomId}', ${floorIndex}, ${roomIndex}, this.value)"
                           oninput="updateFloorRoomMaterialCoeff('${roomId}', ${floorIndex}, ${roomIndex}, this.value)">
                    <span class="text-xs text-gray-500 ml-1">\u00D7</span>
                  </div>
                  <div class="text-xs text-gray-500 mt-2">
                    <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043F\u043E\u043B\u0430: <span class="font-medium" id="floorRoomMatFloor_${roomId}_${floorIndex}_${roomIndex}">${getLivingRoomMaterialFloorArea(roomDataItem).toFixed(2)} \u043C\u00B2</span></div>
                    <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0441\u0442\u0435\u043D: <span class="font-medium" id="floorRoomMatWalls_${roomId}_${floorIndex}_${roomIndex}">${getLivingRoomMaterialWallsArea(roomDataItem).toFixed(2)} \u043C\u00B2</span></div>
                    <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0434\u043B\u044F \u043F\u043E\u0442\u043E\u043B\u043A\u0430: <span class="font-medium" id="floorRoomMatCeiling_${roomId}_${floorIndex}_${roomIndex}">${getLivingRoomMaterialCeilingArea(roomDataItem).toFixed(2)} \u043C\u00B2</span></div>
                  </div>
                </div>
              </div>
              <div class="room-repair-info-shell mt-2">
                <div class="room-repair-info-head cursor-pointer" onclick="toggleRoomFieldGroup('${roomId}', 'floorRepairInfo_${floorIndex}_${roomIndex}')">
                  <i class="fas fa-chevron-down text-xs transition-transform" id="floorRepairInfo_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
                  <span>\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u0440\u0435\u043C\u043E\u043D\u0442\u0435</span>
                  <em>основные параметры</em>
                </div>
                <div id="floorRepairInfo_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="room-repair-info-body">
                  ${((typeof hasLivingRoomRepairInfoArea === 'function' ? hasLivingRoomRepairInfoArea(roomDataItem) : (roomDataItem.area > 0 || roomDataItem.useDimensions))) ? `
                  <div class="room-repair-info-grid">
                    <div class="room-repair-info-field">
                      <label class="block text-sm text-gray-500 mb-1">\u0422\u0435\u043A\u0443\u0449\u0435\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435</label>
                      <select class="ml-1 w-[340px] md:w-full px-3 py-2 text-base border rounded" data-field="currentState" onchange="updateFloorRoomRepairData('${roomId}', ${floorIndex}, ${roomIndex}, 'currentState', this.value)">
                        <option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435</option>
                        <option value="concrete_with_walls" ${roomDataItem.repairData?.currentState === 'concrete_with_walls' ? 'selected' : ''}>Без отделки (с перегородками)</option>
                        <option value="concrete_no_walls" ${roomDataItem.repairData?.currentState === 'concrete_no_walls' ? 'selected' : ''}>Без отделки (без перегородок)</option>
                        <option value="rough_finish" ${roomDataItem.repairData?.currentState === 'rough_finish' ? 'selected' : ''}>\u0427\u0435\u0440\u043D\u043E\u0432\u0430\u044F \u043E\u0442\u0434\u0435\u043B\u043A\u0430</option>
                        <option value="whitebox" ${roomDataItem.repairData?.currentState === 'whitebox' ? 'selected' : ''}>\u041F\u0440\u0435\u0434\u0447\u0438\u0441\u0442\u043E\u0432\u0430\u044F White-box</option>
                        <option value="old_finish" ${roomDataItem.repairData?.currentState === 'old_finish' ? 'selected' : ''}>\u041D\u0430\u043B\u0438\u0447\u0438\u0435 \u0441\u0442\u0430\u0440\u043E\u0439 \u043E\u0442\u0434\u0435\u043B\u043A\u0438</option>
                      </select>
                    </div>
                    <div class="room-repair-info-field">
                      <label class="block text-sm text-gray-500 mb-1">\u041A\u0430\u043A\u043E\u0439 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0440\u0435\u043C\u043E\u043D\u0442</label>
                      <select class="w-[340px] md:w-full px-3 py-2 text-base border rounded" data-field="repairTypeNew" onchange="updateFloorRoomRepairData('${roomId}', ${floorIndex}, ${roomIndex}, 'repairTypeNew', this.value)">
                        <option value="turnkey" ${roomDataItem.repairData?.repairTypeNew === 'turnkey' ? 'selected' : ''}>\u041F\u043E\u0434 \u043A\u043B\u044E\u0447 (\u0441 \u043C\u0435\u0431\u0435\u043B\u044C\u044E)</option>
                        <option value="clean" ${roomDataItem.repairData?.repairTypeNew === 'clean' ? 'selected' : ''}>\u0427\u0438\u0441\u0442\u043E\u0432\u0430\u044F \u043E\u0442\u0434\u0435\u043B\u043A\u0430</option>
                        <option value="whitebox_new" ${roomDataItem.repairData?.repairTypeNew === 'whitebox_new' ? 'selected' : ''}>\u041F\u0440\u0435\u0434\u0447\u0438\u0441\u0442\u043E\u0432\u0430\u044F White-box</option>
                        <option value="rough" ${roomDataItem.repairData?.repairTypeNew === 'rough' ? 'selected' : ''}>\u0427\u0435\u0440\u043D\u043E\u0432\u0430\u044F \u043E\u0442\u0434\u0435\u043B\u043A\u0430</option>
                      </select>
                    </div>
                    <div class="room-repair-info-field">
                      <label class="block text-sm text-gray-500 mb-1">\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u0435\u0440\u0435\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u043A\u0430?</label>
                      <select class="w-[340px] md:w-full px-3 py-2 text-base border rounded" data-field="requiresRedesign" onchange="updateFloorRoomRepairData('${roomId}', ${floorIndex}, ${roomIndex}, 'requiresRedesign', this.value)">
                        <option value="no" ${roomDataItem.repairData?.requiresRedesign !== 'yes' ? 'selected' : ''}>\u041D\u0435\u0442</option>
                        <option value="yes" ${roomDataItem.repairData?.requiresRedesign === 'yes' ? 'selected' : ''}>\u0414\u0430</option>
                      </select>
                    </div>
                    <div class="room-repair-info-field">
                      <label class="block text-base text-gray-600 mb-1">\u0421\u0442\u0438\u043B\u044C \u0434\u0438\u0437\u0430\u0439\u043D\u0430:</label>
                      <select class="w-[340px] md:w-full px-3 py-2 text-base border rounded" onchange="updateFloorRoomRepairData('${roomId}', ${floorIndex}, ${roomIndex}, 'designStyle', this.value)">
                        <option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0442\u0438\u043B\u044C</option>
                        <option value="modern_minimalism" ${roomDataItem.repairData?.designStyle === 'modern_minimalism' ? 'selected' : ''}>\u0421\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0439 \u043C\u0438\u043D\u0438\u043C\u0430\u043B\u0438\u0437\u043C</option>
                        <option value="modern_classic" ${roomDataItem.repairData?.designStyle === 'modern_classic' ? 'selected' : ''}>\u0421\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F \u043A\u043B\u0430\u0441\u0441\u0438\u043A\u0430</option>
                        <option value="classic" ${roomDataItem.repairData?.designStyle === 'classic' ? 'selected' : ''}>\u041A\u043B\u0430\u0441\u0441\u0438\u043A\u0430</option>
                        <option value="scandinavian" ${roomDataItem.repairData?.designStyle === 'scandinavian' ? 'selected' : ''}>\u0421\u043A\u0430\u043D\u0434\u0438\u043D\u0430\u0432\u0441\u043A\u0438\u0439 \u0441\u0442\u0438\u043B\u044C</option>
                        <option value="modern" ${roomDataItem.repairData?.designStyle === 'modern' ? 'selected' : ''}>\u041C\u043E\u0434\u0435\u0440\u043D</option>
                        <option value="art_deco" ${roomDataItem.repairData?.designStyle === 'art_deco' ? 'selected' : ''}>\u0410\u0440-\u0434\u0435\u043A\u043E</option>
                        <option value="japanese" ${roomDataItem.repairData?.designStyle === 'japanese' ? 'selected' : ''}>\u042F\u043F\u043E\u043D\u0441\u043A\u0438\u0439 \u0441\u0442\u0438\u043B\u044C</option>
                        <option value="chinese" ${roomDataItem.repairData?.designStyle === 'chinese' ? 'selected' : ''}>\u041A\u0438\u0442\u0430\u0439\u0441\u043A\u0438\u0439 \u0441\u0442\u0438\u043B\u044C</option>
                        <option value="other" ${roomDataItem.repairData?.designStyle === 'other' ? 'selected' : ''}>\u0414\u0440\u0443\u0433\u043E\u0435</option>
                      </select>
                    </div>
                    <div class="room-repair-info-field">
                      <label class="block text-base text-gray-600 mb-1">\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0434\u0438\u0437\u0430\u0439\u043D-\u043F\u0440\u043E\u0435\u043A\u0442?</label>
                      <div class="flex gap-2 flex-wrap">
                        <label class="flex items-center gap-1 text-sm">
                          <input type="radio" name="designProject_floor_${roomId}_${floorIndex}_${roomIndex}" value="yes" ${roomDataItem.repairData?.designProject === 'yes' ? 'checked' : ''} onchange="updateFloorRoomRepairData('${roomId}', ${floorIndex}, ${roomIndex}, 'designProject', 'yes'); toggleFloorDesignOptions('${roomId}', ${floorIndex}, ${roomIndex})"> \u0414\u0430
                        </label>
                        <label class="flex items-center gap-1 text-sm">
                          <input type="radio" name="designProject_floor_${roomId}_${floorIndex}_${roomIndex}" value="has" ${roomDataItem.repairData?.designProject === 'has' ? 'checked' : ''} onchange="updateFloorRoomRepairData('${roomId}', ${floorIndex}, ${roomIndex}, 'designProject', 'has'); hideFloorDesignOptions('${roomId}', ${floorIndex}, ${roomIndex})"> \u0423\u0436\u0435 \u0435\u0441\u0442\u044C
                        </label>
                        <label class="flex items-center gap-1 text-sm">
                          <input type="radio" name="designProject_floor_${roomId}_${floorIndex}_${roomIndex}" value="no" ${roomDataItem.repairData?.designProject === 'no' || !roomDataItem.repairData?.designProject ? 'checked' : ''} onchange="updateFloorRoomRepairData('${roomId}', ${floorIndex}, ${roomIndex}, 'designProject', 'no'); hideFloorDesignOptions('${roomId}', ${floorIndex}, ${roomIndex})"> \u041D\u0435\u0442
                        </label>
                      </div>
                    </div>
                    <div id="floorDesignOptions_${roomId}_${floorIndex}_${roomIndex}" style="display: ${roomDataItem.repairData?.designProject === 'yes' ? 'block' : 'none'}" class="design-project-options room-repair-info-nested">
                    <label class="block text-sm font-medium mb-2">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0438\u0437\u0430\u0439\u043D \u043F\u0440\u043E\u0435\u043A\u0442:</label>
                      <div class="space-y-2">
                        <label class="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                          <input type="radio" name="floorDesignType_${roomId}_${floorIndex}_${roomIndex}" value="minimal" ${roomDataItem.repairData?.designProjectType === 'minimal' ? 'checked' : ''} class="mt-1" onchange="updateFloorRoomRepairData('${roomId}', ${floorIndex}, ${roomIndex}, 'designProjectType', 'minimal')">
                          <div>
                            <div class="text-xs font-medium">\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u2013 1000 \u20BD/\u043C\u00B2</div>
                            <div class="text-sm text-gray-500">\u041E\u0431\u043C\u0435\u0440\u043D\u044B\u0439 \u043F\u043B\u0430\u043D \u0438 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u043A\u0430 (3 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430), \u041F\u043E\u0434\u0431\u043E\u0440 \u0441\u0442\u0438\u043B\u044F, \u043C\u0443\u0434\u0431\u043E\u0440\u0434, \u041F\u043B\u0430\u043D \u043F\u043E \u044D\u043B\u0435\u043A\u0442\u0440\u0438\u043A\u0435 \u0438 \u043E\u0441\u0432\u0435\u0449\u0435\u043D\u0438\u044E, \u0420\u0430\u0441\u043A\u043B\u0430\u0434\u043A\u0430 \u043F\u043B\u0438\u0442\u043A\u0438 \u0438 \u043E\u0442\u0434\u0435\u043B\u043E\u0447\u043D\u044B\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432</div>
                          </div>
                        </label>
                        <label class="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                          <input type="radio" name="floorDesignType_${roomId}_${floorIndex}_${roomIndex}" value="optimal" ${roomDataItem.repairData?.designProjectType === 'optimal' ? 'checked' : ''} class="mt-1" onchange="updateFloorRoomRepairData('${roomId}', ${floorIndex}, ${roomIndex}, 'designProjectType', 'optimal')">
                          <div>
                            <div class="text-xs font-medium">\u041E\u043F\u0442\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u2013 2500 \u20BD/\u043C\u00B2</div>
                            <div class="text-sm text-gray-500">\u0412\u0441\u0451 \u0438\u0437 "\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439" + AI-\u0432\u0438\u0437\u0443\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F, \u043F\u043E\u043B\u043D\u044B\u0439 \u043A\u043E\u043C\u043F\u043B\u0435\u043A\u0442 \u0440\u0430\u0431\u043E\u0447\u0438\u0445 \u0447\u0435\u0440\u0442\u0435\u0436\u0435\u0439, \u0432\u0435\u0434\u043E\u043C\u043E\u0441\u0442\u044C \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u0438 \u043C\u0435\u0431\u0435\u043B\u0438</div>
                          </div>
                        </label>
                        <label class="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                          <input type="radio" name="floorDesignType_${roomId}_${floorIndex}_${roomIndex}" value="full" ${roomDataItem.repairData?.designProjectType === 'full' ? 'checked' : ''} class="mt-1" onchange="updateFloorRoomRepairData('${roomId}', ${floorIndex}, ${roomIndex}, 'designProjectType', 'full')">
                          <div>
                            <div class="text-xs font-medium">\u041F\u043E\u043B\u043D\u044B\u0439 \u2013 4000 \u20BD/\u043C\u00B2</div>
                            <div class="text-sm text-gray-500">\u0412\u0441\u0451 \u0438\u0437 "\u041E\u043F\u0442\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0433\u043E" + \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0434\u0438\u0437\u0430\u0439\u043D, 3D/VR-\u0432\u0438\u0437\u0443\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F, \u0440\u0430\u0437\u0432\u0451\u0440\u0442\u043A\u0438 \u0441\u0442\u0435\u043D \u0438 \u0430\u0432\u0442\u043E\u0440\u0441\u043A\u0438\u0439 \u043D\u0430\u0434\u0437\u043E\u0440</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  ` : `
                  <div class="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                    <i class="fas fa-exclamation-triangle mr-1"></i> \u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043F\u043B\u043E\u0449\u0430\u0434\u044C \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435 \u041A\u043E\u043C\u043D\u0430\u0442\u0430
                  </div>
                  `}
                </div>
</div>
              ${renderRoomRepairCalculationBlockSafe(roomId, floorIndex, roomIndex, roomDataItem)}
              </div>
            </div>
            ${isGroupEnd && isMasterGroup ? '</div></div></div>' : ''}
            ${isLastChamber ? '</div></div>' : ''}`;
      });
      
      container.innerHTML = html;
      
      // Fix any extra closing braces in room names
      container.querySelectorAll('span.text-green-600, span.text-brand-500').forEach(span => {
        if (span.textContent && span.textContent.endsWith('}')) {
          span.textContent = span.textContent.slice(0, -1);
        }
      });
      if (typeof updateRequiredFieldHints === 'function') {
        setTimeout(updateRequiredFieldHints, 0);
      }
    }

    function getPremiseRoomUnits(roomId, floorIndex, premiseId) {
      const floor = roomData?.[roomId]?.floors?.[floorIndex];
      const premiseRooms = (floor?.livingRooms || []).filter(room => room?.premiseId === premiseId);
      const units = [];
      const seen = new Set();
      premiseRooms.forEach((room, index) => {
        const isMaster = !!(room.roomGroupType && room.roomGroupType !== 'regular');
        if (isMaster) {
          const key = `master:${room.roomGroupType}:${Number(room.roomGroupIndex || 0)}`;
          if (seen.has(key)) return;
          seen.add(key);
          units.push({
            key,
            type: 'master',
            rooms: premiseRooms.filter(item => item.roomGroupType === room.roomGroupType && Number(item.roomGroupIndex || 0) === Number(room.roomGroupIndex || 0))
          });
          return;
        }
        units.push({
          key: `room:${room.roomUid || room.legacyRoomKey || index}`,
          type: 'regular',
          rooms: [room]
        });
      });
      return units;
    }

    function isPremiseRoomUnitCollapsed(roomId, floorIndex, premiseId, unitKey) {
      if (String(unitKey || '').startsWith('master:')) {
        const parts = String(unitKey).split(':');
        const safePremiseId = String(premiseId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
        const body = document.getElementById(`masterRoom_${roomId}_${floorIndex}_${safePremiseId}_${Number(parts[2] || 0)}Body`);
        return !body || body.style.display === 'none';
      }
      const units = getPremiseRoomUnits(roomId, floorIndex, premiseId);
      const unit = units.find(item => item.key === unitKey);
      const room = unit?.rooms?.[0];
      const floorRooms = roomData?.[roomId]?.floors?.[floorIndex]?.livingRooms || [];
      const roomIndex = floorRooms.indexOf(room);
      const group = document.getElementById(`floorRoom_${floorIndex}_${roomIndex}Group_${roomId}`);
      return !group || group.style.display === 'none';
    }

    function applyPremiseRoomUnitOrder(roomId, floorIndex, premiseId, units) {
      const floor = roomData?.[roomId]?.floors?.[floorIndex];
      if (!floor || !Array.isArray(floor.livingRooms)) return;
      let masterIndex = 0;
      const orderedRooms = [];
      units.forEach(unit => {
        if (unit.type === 'master') {
          unit.rooms.forEach(room => {
            room.roomGroupIndex = masterIndex;
            orderedRooms.push(room);
          });
          masterIndex += 1;
        } else {
          unit.rooms.forEach(room => {
            room.roomGroupType = 'regular';
            room.roomGroupIndex = 0;
            orderedRooms.push(room);
          });
        }
      });
      const nextRooms = [];
      let inserted = false;
      floor.livingRooms.forEach(room => {
        if (room?.premiseId === premiseId) {
          if (!inserted) {
            nextRooms.push(...orderedRooms);
            inserted = true;
          }
          return;
        }
        nextRooms.push(room);
      });
      floor.livingRooms = nextRooms;
      if (typeof buildHouseRoomRegistry === 'function') buildHouseRoomRegistry(true);
      saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      updateTotalAreas();
      updateDetailedCalc();
    }

    function movePremiseRoomUnit(roomId, floorIndex, premiseId, unitKey, delta) {
      if (!isPremiseRoomUnitCollapsed(roomId, floorIndex, premiseId, unitKey)) return;
      const units = getPremiseRoomUnits(roomId, floorIndex, premiseId);
      const from = units.findIndex(unit => unit.key === unitKey);
      const to = from + Number(delta || 0);
      if (from < 0 || to < 0 || to >= units.length) return;
      const [unit] = units.splice(from, 1);
      units.splice(to, 0, unit);
      applyPremiseRoomUnitOrder(roomId, floorIndex, premiseId, units);
    }

    function startPremiseRoomUnitDrag(event, roomId, floorIndex, premiseId, unitKey) {
      if (!isPremiseRoomUnitCollapsed(roomId, floorIndex, premiseId, unitKey)) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', JSON.stringify({ roomId, floorIndex: Number(floorIndex), premiseId, unitKey }));
    }

    function dropPremiseRoomUnit(event, roomId, floorIndex, premiseId, targetUnitKey) {
      event.preventDefault();
      let source = null;
      try {
        source = JSON.parse(event.dataTransfer.getData('text/plain') || '{}');
      } catch (error) {
        source = null;
      }
      if (!source || source.roomId !== roomId || Number(source.floorIndex) !== Number(floorIndex) || source.premiseId !== premiseId) return;
      if (source.unitKey === targetUnitKey) return;
      if (!isPremiseRoomUnitCollapsed(roomId, floorIndex, premiseId, source.unitKey) || !isPremiseRoomUnitCollapsed(roomId, floorIndex, premiseId, targetUnitKey)) return;
      const units = getPremiseRoomUnits(roomId, floorIndex, premiseId);
      const from = units.findIndex(unit => unit.key === source.unitKey);
      const to = units.findIndex(unit => unit.key === targetUnitKey);
      if (from < 0 || to < 0) return;
      const [unit] = units.splice(from, 1);
      units.splice(to, 0, unit);
      applyPremiseRoomUnitOrder(roomId, floorIndex, premiseId, units);
    }
    
    function renderFloorRoomDoors(roomId, floorIndex, roomIndex, data) {
      const doorCount = data.doors || 0;
      let doorSizeInputs = '';
      for (let i = 0; i < doorCount; i++) {
        const doorW = data.doorWidths?.[i] || 80;
        const doorH = data.doorHeights?.[i] || 200;
        doorSizeInputs += `
          <div class="text-xs text-gray-500 mb-1 mt-2">\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0434\u0432\u0435\u0440\u0438_${i + 1} (\u0441\u043C):</div>
          <div class="opening-size-grid">
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0428\u0438\u0440\u0438\u043D\u0430:</label>
              <input type="number" value="${doorW}" min="40" max="200"
                     class="area-input text-xs" 
                     onchange="updateFloorRoomDoorSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'width', this.value)"
                     oninput="updateFloorRoomDoorSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0412\u044B\u0441\u043E\u0442\u0430:</label>
              <input type="number" value="${doorH}" min="100" max="300"
                     class="area-input text-xs" 
                     onchange="updateFloorRoomDoorSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'height', this.value)"
                     oninput="updateFloorRoomDoorSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="room-opening-subsection ${getRoomOpeningSubsectionClass(data, 'doors')}" data-room-subsection="floorOpenings_${floorIndex}_${roomIndex}:doors">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'floorDoor_${floorIndex}_${roomIndex}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="floorDoor_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u0414\u0432\u0435\u0440\u0438</span>
          </div>
          <div id="floorDoor_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-24">\u041A\u043E\u043B-\u0432\u043E (\u0448\u0442.):</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'doors', -1)">\u2212</button>
                <input type="number" value="${doorCount}" min="0" max="5"
                       class="qty-input" onchange="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, 'doors', this.value)">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'doors', 1)">+</button>
              </div>
            </div>
            ${doorSizeInputs}
          </div>
        </div>`;
    }
    
    function renderFloorRoomWindows(roomId, floorIndex, roomIndex, data) {
      const windowCount = data.windows || 0;
      const isPanoramic = !!data.panoramicWindows;
      const panoramicHeight = Math.round((parseFloat(data.ceiling) || 3) * 100);
      let windowSizeInputs = '';
      for (let i = 0; i < windowCount; i++) {
        const winW = data.windowWidths?.[i] || 130;
        const winH = isPanoramic ? panoramicHeight : (data.windowHeights?.[i] || 140);
        windowSizeInputs += `
          <div class="text-xs text-gray-500 mb-1 mt-2">\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u043E\u043A\u043D\u0430_${i + 1} (\u0441\u043C):</div>
          <div class="opening-size-grid">
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0428\u0438\u0440\u0438\u043D\u0430:</label>
              <input type="number" value="${winW}" min="40" max="400"
                     class="area-input text-xs" 
                     onchange="updateFloorRoomWindowSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'width', this.value)"
                     oninput="updateFloorRoomWindowSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0412\u044B\u0441\u043E\u0442\u0430:</label>
              <input type="number" value="${winH}" min="40" max="300"
                     class="area-input text-xs" ${isPanoramic ? 'readonly' : ''}
                     onchange="updateFloorRoomWindowSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'height', this.value)"
                     oninput="updateFloorRoomWindowSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="room-opening-subsection ${getRoomOpeningSubsectionClass(data, 'windows')}" data-room-subsection="floorOpenings_${floorIndex}_${roomIndex}:windows">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'floorWindow_${floorIndex}_${roomIndex}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="floorWindow_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u041E\u043A\u043D\u0430</span>
          </div>
          <div id="floorWindow_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-24">\u041A\u043E\u043B-\u0432\u043E (\u0448\u0442.):</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'windows', -1)">\u2212</button>
                <input type="number" value="${windowCount}" min="0" max="5"
                       class="qty-input" onchange="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, 'windows', this.value)">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'windows', 1)">+</button>
              </div>
            </div>
            <label class="room-panoramic-toggle">
              <input type="checkbox" ${isPanoramic ? 'checked' : ''} onchange="toggleFloorRoomPanoramicWindows('${roomId}', ${floorIndex}, ${roomIndex}, this.checked)">
              <span>\u041F\u0430\u043D\u043E\u0440\u0430\u043C\u043D\u044B\u0435 \u043E\u043A\u043D\u0430</span>
              <small>\u0432\u044B\u0441\u043E\u0442\u0430 = \u0432\u044B\u0441\u043E\u0442\u0430 \u043A\u043E\u043C\u043D\u0430\u0442\u044B</small>
            </label>
            ${windowSizeInputs}
          </div>
        </div>`;
    }
    
    function renderFloorRoomBalcony(roomId, floorIndex, roomIndex, data) {
      const balconyCount = data.balcony || 0;
      let balconySizeInputs = '';
      for (let i = 0; i < balconyCount; i++) {
        const balW = data.balconyWidths?.[i] || 80;
        const balH = data.balconyHeights?.[i] || 250;
        balconySizeInputs += `
          <div class="text-xs text-gray-500 mb-1 mt-2">\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0439 \u0434\u0432\u0435\u0440\u0438_${i + 1} (\u0441\u043C):</div>
          <div class="opening-size-grid">
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0428\u0438\u0440\u0438\u043D\u0430:</label>
              <input type="number" value="${balW}" min="60" max="400"
                     class="area-input text-xs" 
                     onchange="updateFloorRoomBalconySize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'width', this.value)"
                     oninput="updateFloorRoomBalconySize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0412\u044B\u0441\u043E\u0442\u0430:</label>
              <input type="number" value="${balH}" min="150" max="350"
                     class="area-input text-xs" 
                     onchange="updateFloorRoomBalconySize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'height', this.value)"
                     oninput="updateFloorRoomBalconySize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="room-opening-subsection ${getRoomOpeningSubsectionClass(data, 'balcony')}" data-room-subsection="floorOpenings_${floorIndex}_${roomIndex}:balcony">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'floorBalcony_${floorIndex}_${roomIndex}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="floorBalcony_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u0411\u0430\u043B\u043A\u043E\u043D\u043D\u0430\u044F \u0434\u0432\u0435\u0440\u044C</span>
          </div>
          <div id="floorBalcony_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-28">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E (\u0448\u0442.):</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'balcony', -1)">\u2212</button>
                <input type="number" value="${balconyCount}" min="0" max="5"
                       class="qty-input" onchange="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, 'balcony', this.value)">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'balcony', 1)">+</button>
              </div>
            </div>
            ${balconySizeInputs}
          </div>
        </div>`;
    }
    
    function renderFloorRoomArchs(roomId, floorIndex, roomIndex, data) {
      const archCount = data.archCount || 0;
      let archSizeInputs = '';
      for (let i = 0; i < archCount; i++) {
        const archArea = data.archAreas?.[i] || 0;
        archSizeInputs += `
          <div class="area-input-group mt-1">
            <label class="text-xs text-gray-500 w-28">\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0430\u0440\u043A\u0438_${i + 1}:</label>
            <input type="number" value="${parseFloat(archArea).toFixed(2)}" min="0" max="20" step="0.01"
                   class="area-input" style="width: 70px"
                   onchange="updateFloorRoomArchArea('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, this.value)"
                   oninput="updateFloorRoomArchArea('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, this.value)">
            <span class="text-xs text-gray-500">\u043C\u00B2</span>
          </div>`;
      }
      return `
        <div class="room-opening-subsection ${getRoomOpeningSubsectionClass(data, 'arch')}" data-room-subsection="floorOpenings_${floorIndex}_${roomIndex}:arch">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'floorArch_${floorIndex}_${roomIndex}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="floorArch_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u0410\u0440\u043A\u0438</span>
          </div>
          <div id="floorArch_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-28">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E (\u0448\u0442.):</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'archCount', -1)">\u2212</button>
                <input type="number" value="${archCount}" min="0" max="5"
                       class="qty-input" onchange="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, 'archCount', this.value)">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'archCount', 1)">+</button>
              </div>
            </div>
            ${archSizeInputs}
          </div>
        </div>`;
    }

    function renderFloorRoomOpeningsGroup(roomId, floorIndex, roomIndex, data) {
      return renderRoomOpeningsShell(roomId, `floorOpenings_${floorIndex}_${roomIndex}`, data, `
        ${renderFloorRoomDoors(roomId, floorIndex, roomIndex, data)}
        ${renderFloorRoomWindows(roomId, floorIndex, roomIndex, data)}
        ${renderFloorRoomBalcony(roomId, floorIndex, roomIndex, data)}
        ${renderFloorRoomArchs(roomId, floorIndex, roomIndex, data)}
      `);
    }
    
    function renderFloorRoomConstructions(roomId, floorIndex, roomIndex, data, field, label, icon) {
      const count = data[field + 'Count'] || 0;
      const areas = data[field + 'Areas'] || Array(15).fill(0);
      let areaInputs = '';
      for (let i = 0; i < count; i++) {
        const areaVal = areas[i] || 0;
        areaInputs += `
          <div class="area-input-group mt-1">
            <label class="text-xs text-gray-500 w-28">\u041F\u043B\u043E\u0449\u0430\u0434\u044C ${label.toLowerCase()}_${i + 1}:</label>
            <input type="number" value="${parseFloat(areaVal).toFixed(2)}" min="0" max="50" step="0.01"
                   class="area-input" style="width: 70px"
                   onchange="updateFloorRoomConstructionArea('${roomId}', ${floorIndex}, ${roomIndex}, '${field}', ${i}, this.value)"
                   oninput="updateFloorRoomConstructionArea('${roomId}', ${floorIndex}, ${roomIndex}, '${field}', ${i}, this.value)">
            <span class="text-xs text-gray-500">\u043C\u00B2</span>
          </div>`;
      }
      return `
        <div class="room-opening-subsection ${getRoomConstructionSubsectionClass(data, field)}" data-room-subsection="floorConstructions_${floorIndex}_${roomIndex}:${field}">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'floor${field.charAt(0).toUpperCase() + field.slice(1)}_${floorIndex}_${roomIndex}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="floor${field.charAt(0).toUpperCase() + field.slice(1)}_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <i class="fas ${icon} text-xs" style="margin-left: 4px"></i>
            <span class="text-sm font-medium">${label}</span>
          </div>
          <div id="floor${field.charAt(0).toUpperCase() + field.slice(1)}_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-28">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E (\u0448\u0442.):</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, '${field}Count', -1)">\u2212</button>
                <input type="number" value="${count}" min="0" max="15"
                       class="qty-input" onchange="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, '${field}Count', this.value)">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, '${field}Count', 1)">+</button>
              </div>
            </div>
            ${areaInputs}
          </div>
        </div>`;
    }
    
    function updateFloorRoomData(roomId, floorIndex, roomIndex, field, value) {
      if (!roomData[roomId].floors[floorIndex].livingRooms[roomIndex]) return;
      
      const room = roomData[roomId].floors[floorIndex].livingRooms[roomIndex];
      const parseRoomNumber = raw => {
        const number = parseFloat(String(raw ?? '').replace(',', '.'));
        return Number.isFinite(number) ? number : 0;
      };
      
      if (field === 'area') {
        room.area = typeof clampLivingRoomFloorArea === 'function'
          ? clampLivingRoomFloorArea(value, room)
          : parseRoomNumber(value);
        room.floorAreaManual = true;
        markRoomRepairCalculationNeedsUpdate(room, 'area');
      } else if (field === 'wallsArea') {
        room.wallsArea = typeof clampLivingRoomWallsArea === 'function'
          ? clampLivingRoomWallsArea(value, room)
          : parseRoomNumber(value);
        room.wallsAreaManual = true;
        markRoomRepairCalculationNeedsUpdate(room, 'wallsArea');
      } else if (field === 'ceilingArea') {
        room.ceilingArea = parseRoomNumber(value);
        room.ceilingAreaManual = true;
        markRoomRepairCalculationNeedsUpdate(room, 'ceilingArea');
      } else if (field === 'peopleCount') {
        const maxPeople = room.roomType === '\u0414\u0435\u0442\u0441\u043A\u0430\u044F' ? 8 : 2;
        room.peopleCount = Math.max(0, Math.min(maxPeople, parseInt(value, 10) || 0));
        markRoomRepairCalculationNeedsUpdate(room, 'peopleCount');
      } else if (field === 'roomLength') {
        room.roomLength = parseRoomNumber(value);
        room.areaCalcMode = 'dimensions';
        room.useDimensions = true;
        room.floorAreaManual = false;
        room.wallsAreaManual = false;
        room.ceilingAreaManual = false;
      } else if (field === 'roomWidth') {
        room.roomWidth = parseRoomNumber(value);
        room.areaCalcMode = 'dimensions';
        room.useDimensions = true;
        room.floorAreaManual = false;
        room.wallsAreaManual = false;
        room.ceilingAreaManual = false;
      } else if (field === 'roomPerimeter') {
        room.roomPerimeter = parseRoomNumber(value);
        room.areaCalcMode = 'perimeter_area';
        room.useDimensions = false;
        room.floorAreaManual = true;
        room.wallsAreaManual = false;
        room.ceilingAreaManual = false;
      } else if (field === 'useDimensions') {
        room.useDimensions = Boolean(Number(value));
        room.areaCalcMode = room.useDimensions ? 'dimensions' : '';
        room.floorAreaManual = false;
        room.wallsAreaManual = false;
        room.ceilingAreaManual = false;
        if (room.useDimensions) {
          room.area = 0;
          room.wallsArea = 0;
          room.ceilingArea = 0;
        }
        saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      } else if (field === 'roomType') {
        room.roomType = value;
        markRoomRepairCalculationNeedsUpdate(room, 'roomType');
        if (typeof inferRoomZone === 'function' && !room.roomZoneManual) {
          room.roomZone = inferRoomZone(room);
          if (typeof ensureRoomZone === 'function') ensureRoomZone(room, room.roomZone);
        }
        const roomTypeDefaultAreas = {
          '\u041A\u0443\u0445\u043D\u044F': 10, '\u0414\u0443\u0448\u0435\u0432\u0430\u044F': 4, '\u0412\u0430\u043D\u043D\u0430\u044F': 4, '\u0421\u0430\u043D\u0443\u0437\u0435\u043B': 1.5, '\u0421\u043E\u0432\u043C\u0435\u0449\u0435\u043D\u043D\u044B\u0439 \u0421/\u0423': 5,
          '\u041F\u0440\u0438\u0445\u043E\u0436\u0430\u044F': 3, 'Холл': 6, '\u041A\u043E\u0440\u0438\u0434\u043E\u0440': 2, '\u0413\u0430\u0440\u0434\u0435\u0440\u043E\u0431\u043D\u0430\u044F': 1.5, 'Кладовая': 2, 'Постирочная': 4, 'Котельная': 6, 'Гараж': 18, 'Бассейн': 28, 'SPA-зона': 12, 'Сауна': 6, '\u0411\u0430\u043B\u043A\u043E\u043D': 1.2, '\u041B\u043E\u0434\u0436\u0438\u044F': 2,
          '\u0422\u0435\u0440\u0440\u0430\u0441\u0430': 4, '\u041E\u0444\u0438\u0441': 20, '\u0421\u043F\u0430\u043B\u044C\u043D\u044F': 20, '\u0414\u0435\u0442\u0441\u043A\u0430\u044F': 15, '\u0413\u043E\u0441\u0442\u0438\u043D\u0430\u044F': 25, '\u041A\u0430\u0431\u0438\u043D\u0435\u0442': 15
        };
        room.area = roomTypeDefaultAreas[value] || 20;
        if (value === '\u0421\u043F\u0430\u043B\u044C\u043D\u044F') {
          room.peopleCount = Math.max(1, Math.min(2, parseInt(room.peopleCount, 10) || 1));
        } else if (value === '\u0414\u0435\u0442\u0441\u043A\u0430\u044F') {
          room.peopleCount = Math.max(1, Math.min(8, parseInt(room.peopleCount, 10) || 1));
        } else {
          room.peopleCount = 0;
        }
        room.floorAreaManual = false;
        room.wallsAreaManual = false;
        room.ceilingAreaManual = false;
        saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      } else if (field === 'ceiling') {
        room.ceiling = parseFloat(value) || 3;
        markRoomRepairCalculationNeedsUpdate(room, 'ceiling');
        if (room.panoramicWindows) {
          syncFloorRoomPanoramicWindowHeights(room);
        }
      } else if (field === 'doors') {
        room.doors = parseInt(value) || 0;
        saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      } else if (field === 'windows') {
        room.windows = parseInt(value) || 0;
        if (room.panoramicWindows) {
          syncFloorRoomPanoramicWindowHeights(room);
        }
        saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      } else if (field === 'balcony') {
        room.balcony = parseInt(value) || 0;
        saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      } else if (field === 'archCount') {
        room.archCount = parseInt(value) || 0;
        saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      } else if (field === 'nicheCount') {
        room.nicheCount = parseInt(value) || 0;
        saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      } else if (field === 'projectionCount') {
        room.projectionCount = parseInt(value) || 0;
        saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      } else if (field === 'columnCount') {
        room.columnCount = parseInt(value) || 0;
        saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      }

      syncLivingRoomDerivedAreas(room, field);
      const deferDimensionCalculation = typeof shouldDeferLivingRoomDimensionCalculation === 'function'
        && shouldDeferLivingRoomDimensionCalculation(room, field);
      if (typeof updateFloorRoomAreaInputs === 'function') {
        updateFloorRoomAreaInputs(roomId, floorIndex, roomIndex, room);
      }
      if (deferDimensionCalculation) return;

      updateTotalAreas();
      updateDetailedCalc();
      updateLivingRoomsTotal(roomId);
    }

    function syncFloorRoomPanoramicWindowHeights(room) {
      if (!room) return;
      const count = Math.max(0, Math.min(5, parseInt(room.windows, 10) || 0));
      const heightCm = Math.round((parseFloat(room.ceiling) || 3) * 100);
      if (!Array.isArray(room.windowHeights)) room.windowHeights = [];
      for (let i = 0; i < count; i += 1) {
        room.windowHeights[i] = heightCm;
      }
    }

    function toggleFloorRoomPanoramicWindows(roomId, floorIndex, roomIndex, checked) {
      const room = roomData?.[roomId]?.floors?.[floorIndex]?.livingRooms?.[roomIndex];
      if (!room) return;
      room.panoramicWindows = !!checked;
      if (room.panoramicWindows) {
        syncFloorRoomPanoramicWindowHeights(room);
      }
      room.wallsArea = calculateLivingRoomWallsArea(room);
      saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      updateTotalAreas();
      updateDetailedCalc();
    }

    function updateFloorRoomZone(roomId, floorIndex, roomIndex, zone) {
      const room = roomData[roomId]?.floors?.[floorIndex]?.livingRooms?.[roomIndex];
      if (!room) return;
      const normalizedZone = zone === 'living' || zone === 'nonliving' ? zone : '';
      if (typeof ensureRoomZone === 'function') {
        room.roomZone = normalizedZone;
        room.roomZoneManual = true;
        ensureRoomZone(room, normalizedZone);
      } else {
        room.roomZone = normalizedZone;
        room.roomZoneManual = true;
        room.category = room.roomZone;
      }
      room.appointment = room.roomZone === 'nonliving' ? 'nonliving_zone' : (room.roomZone === 'living' ? 'living_zone' : '');
      markRoomRepairCalculationNeedsUpdate(room, 'roomZone');
      const catalog = typeof getRoomTypeCatalogByZone === 'function' ? getRoomTypeCatalogByZone(room.roomZone, room) : [];
      if (catalog.length && !catalog.some(type => type.name === room.roomType)) {
        room.roomType = catalog[0].name;
        room.floorAreaManual = false;
        room.wallsAreaManual = false;
        room.ceilingAreaManual = false;
      }
      if (!catalog.length) {
        room.roomType = '';
      }
      saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      if (typeof buildHouseRoomRegistry === 'function') buildHouseRoomRegistry(true);
      if (typeof refreshObjectFloorCounters === 'function') refreshObjectFloorCounters(floorIndex);
      updateTotalAreas();
      updateDetailedCalc();
    }

    function isEuroPremiseRoom(room = {}) {
      return typeof isEuroPremiseAppointment === 'function' && isEuroPremiseAppointment(room.appointment);
    }

    function getPremiseRooms(roomId, floorIndex, premiseId) {
      return (roomData[roomId]?.floors?.[floorIndex]?.livingRooms || []).filter(room => room.premiseId === premiseId);
    }

    function getPremiseMasterGroups(roomId, floorIndex, premiseId) {
      const rooms = getPremiseRooms(roomId, floorIndex, premiseId)
        .filter(room => room.roomGroupType && room.roomGroupType !== 'regular');
      const map = new Map();
      rooms.forEach(room => {
        const type = room.roomGroupType || 'master_bedroom';
        const index = Number(room.roomGroupIndex || 0);
        const key = `${type}:${index}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            type,
            index,
            label: typeof getRoomGroupDisplayName === 'function'
              ? getRoomGroupDisplayName(room, 2)
              : `${type === 'kitchen_living' ? 'Кухня-гостиная' : 'Мастер-спальня'} ${index + 1}`,
            rooms: []
          });
        }
        map.get(key).rooms.push(room);
      });
      return Array.from(map.values()).sort((a, b) => a.index - b.index);
    }

    function getMasterTemplate(type) {
      return (window.masterRoomTemplates?.[type] || window.masterRoomTemplates?.master_bedroom || []).slice();
    }

    function getMasterAllowedTypes(type) {
      return (window.masterRoomAllowedTypes?.[type] || window.masterRoomAllowedTypes?.master_bedroom || []).slice();
    }

    function applyMasterRoomPreset(room, masterType, groupIndex, insideIndex) {
      const allowed = getMasterAllowedTypes(masterType);
      const preset = allowed[insideIndex] || allowed[allowed.length - 1] || { roomType: '', zone: '' };
      room.roomGroupType = masterType;
      room.roomGroupIndex = groupIndex;
      room.roomInsideGroupNumber = insideIndex + 1;
      room.roomGroupName = typeof getRoomGroupDisplayName === 'function'
        ? getRoomGroupDisplayName(room, 2)
        : (masterType === 'kitchen_living' ? 'Кухня-гостиная' : 'Мастер-спальня');
      room.roomType = preset.roomType || room.roomType || '';
      room.roomZone = preset.zone || room.roomZone || '';
      room.appointment = room.roomZone === 'nonliving' ? 'nonliving_zone' : (room.roomZone === 'living' ? 'living_zone' : '');
      room.roomZoneManual = true;
      if (typeof ensureRoomZone === 'function') ensureRoomZone(room, room.roomZone);
      return room;
    }

    function createMasterGroupRoom(roomId, floorIndex, premiseId, masterType, groupIndex, insideIndex) {
      const floor = roomData[roomId]?.floors?.[floorIndex];
      const premiseRooms = getPremiseRooms(roomId, floorIndex, premiseId);
      const first = premiseRooms[0] || {};
      const premiseNumber = Number(first.premiseNumber || 1);
      const room = typeof createPremiseChamber === 'function'
        ? createPremiseChamber(floorIndex, premiseNumber - 1, insideIndex, '')
        : { ...first };
      room.premiseId = premiseId;
      room.premiseNumber = premiseNumber;
      room.location = first.location || floor?.location || 'above_ground';
      room.subAppointment = first.subAppointment || '';
      room.area = 0;
      room.wallsArea = 0;
      room.ceilingArea = 0;
      room.floorAreaManual = false;
      room.wallsAreaManual = false;
      room.ceilingAreaManual = false;
      return applyMasterRoomPreset(room, masterType, groupIndex, insideIndex);
    }

    function updatePremiseMasterGroupCount(roomId, floorIndex, premiseId, value) {
      const floor = roomData[roomId]?.floors?.[floorIndex];
      if (!floor || !Array.isArray(floor.livingRooms)) return;
      const target = Math.max(0, Math.min(10, parseInt(value, 10) || 0));
      const groups = getPremiseMasterGroups(roomId, floorIndex, premiseId);
      if (groups.length > target) {
        const removeIndexes = new Set(groups.slice(target).map(group => group.index));
        floor.livingRooms = floor.livingRooms.filter(room => {
          if (room.premiseId !== premiseId) return true;
          if (!room.roomGroupType || room.roomGroupType === 'regular') return true;
          return !removeIndexes.has(Number(room.roomGroupIndex || 0));
        });
      }
      while (getPremiseMasterGroups(roomId, floorIndex, premiseId).length < target) {
        const nextIndex = getPremiseMasterGroups(roomId, floorIndex, premiseId).length;
        getMasterTemplate('master_bedroom').forEach((_, insideIndex) => {
          floor.livingRooms.push(createMasterGroupRoom(roomId, floorIndex, premiseId, 'master_bedroom', nextIndex, insideIndex));
        });
      }
      if (typeof getFloorPremiseGroups === 'function') getFloorPremiseGroups(roomId, floorIndex);
      saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      if (typeof refreshObjectFloorCounters === 'function') refreshObjectFloorCounters(floorIndex);
      updateTotalAreas();
      updateDetailedCalc();
    }

    function changePremiseMasterGroupCount(roomId, floorIndex, premiseId, delta) {
      updatePremiseMasterGroupCount(roomId, floorIndex, premiseId, getPremiseMasterGroups(roomId, floorIndex, premiseId).length + Number(delta || 0));
    }

    function updateMasterGroupType(roomId, floorIndex, premiseId, groupIndex, value) {
      const floor = roomData[roomId]?.floors?.[floorIndex];
      if (!floor || !Array.isArray(floor.livingRooms)) return;
      const type = value === 'kitchen_living' ? 'kitchen_living' : 'master_bedroom';
      floor.livingRooms = floor.livingRooms.filter(room => {
        return !(room.premiseId === premiseId && room.roomGroupType && room.roomGroupType !== 'regular' && Number(room.roomGroupIndex || 0) === Number(groupIndex));
      });
      getMasterTemplate(type).forEach((_, insideIndex) => {
        floor.livingRooms.push(createMasterGroupRoom(roomId, floorIndex, premiseId, type, Number(groupIndex), insideIndex));
      });
      if (typeof getFloorPremiseGroups === 'function') getFloorPremiseGroups(roomId, floorIndex);
      saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      updateTotalAreas();
      updateDetailedCalc();
    }

    function updateMasterGroupRoomCount(roomId, floorIndex, premiseId, groupIndex, value) {
      const floor = roomData[roomId]?.floors?.[floorIndex];
      if (!floor || !Array.isArray(floor.livingRooms)) return;
      const groupRooms = floor.livingRooms.filter(room => room.premiseId === premiseId && room.roomGroupType && room.roomGroupType !== 'regular' && Number(room.roomGroupIndex || 0) === Number(groupIndex));
      const type = groupRooms[0]?.roomGroupType || 'master_bedroom';
      const max = type === 'kitchen_living' ? 5 : 14;
      const min = type === 'kitchen_living' ? 2 : 3;
      const target = Math.max(min, Math.min(max, parseInt(value, 10) || min));
      const keep = new Set(groupRooms.slice(0, target).map(room => room));
      floor.livingRooms = floor.livingRooms.filter(room => {
        if (!(room.premiseId === premiseId && room.roomGroupType && room.roomGroupType !== 'regular' && Number(room.roomGroupIndex || 0) === Number(groupIndex))) return true;
        return keep.has(room);
      });
      while (floor.livingRooms.filter(room => room.premiseId === premiseId && room.roomGroupType && room.roomGroupType !== 'regular' && Number(room.roomGroupIndex || 0) === Number(groupIndex)).length < target) {
        const insideIndex = floor.livingRooms.filter(room => room.premiseId === premiseId && room.roomGroupType && room.roomGroupType !== 'regular' && Number(room.roomGroupIndex || 0) === Number(groupIndex)).length;
        floor.livingRooms.push(createMasterGroupRoom(roomId, floorIndex, premiseId, type, Number(groupIndex), insideIndex));
      }
      if (typeof getFloorPremiseGroups === 'function') getFloorPremiseGroups(roomId, floorIndex);
      saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      updateTotalAreas();
      updateDetailedCalc();
    }

    function changeMasterGroupRoomCount(roomId, floorIndex, premiseId, groupIndex, delta) {
      const count = getPremiseRooms(roomId, floorIndex, premiseId)
        .filter(room => room.roomGroupType && room.roomGroupType !== 'regular' && Number(room.roomGroupIndex || 0) === Number(groupIndex)).length;
      updateMasterGroupRoomCount(roomId, floorIndex, premiseId, groupIndex, count + Number(delta || 0));
    }

    function changePremiseChamberCount(roomId, floorIndex, premiseId, delta) {
      const getPremiseGroupsFn = window.getFloorPremiseGroups || (typeof getFloorPremiseGroups === 'function' ? getFloorPremiseGroups : null);
      const groups = getPremiseGroupsFn ? getPremiseGroupsFn(roomId, floorIndex) : [];
      const group = groups.find(item => item.id === premiseId);
      const firstRoom = group?.rooms?.[0]?.room || {};
      const regularRooms = (group?.rooms || []).filter(item => !item.room.roomGroupType || item.room.roomGroupType === 'regular');
      const current = isEuroPremiseRoom(firstRoom) ? (regularRooms.length || 1) : (group?.rooms?.length || 1);
      updatePremiseChamberCount(roomId, floorIndex, premiseId, current + delta);
    }

    function updatePremiseChamberCount(roomId, floorIndex, premiseId, value) {
      const getPremiseGroupsFn = window.getFloorPremiseGroups || (typeof getFloorPremiseGroups === 'function' ? getFloorPremiseGroups : null);
      const createPremiseChamberFn = window.createPremiseChamber || (typeof createPremiseChamber === 'function' ? createPremiseChamber : null);
      const floor = roomData[roomId]?.floors?.[floorIndex];
      if (!floor || !Array.isArray(floor.livingRooms)) return;
      const groups = getPremiseGroupsFn ? getPremiseGroupsFn(roomId, floorIndex) : [];
      const group = groups.find(item => item.id === premiseId);
      if (!group) return;
      const val = Math.max(1, Math.min(25, parseInt(value, 10) || 1));
      const first = group.rooms[0]?.room || {};
      const isEuro = isEuroPremiseRoom(first);
      const regularRooms = group.rooms.filter(item => !item.room.roomGroupType || item.room.roomGroupType === 'regular');
      const sourceRooms = isEuro ? regularRooms : group.rooms;
      const keepIndexes = new Set(sourceRooms.slice(0, val).map(item => item.index));
      floor.livingRooms = floor.livingRooms.filter((room, index) => {
        if (room.premiseId !== premiseId) return true;
        if (isEuro && room.roomGroupType && room.roomGroupType !== 'regular') return true;
        return keepIndexes.has(index);
      });
      let currentRegularCount = floor.livingRooms.filter(room => room.premiseId === premiseId && (!room.roomGroupType || room.roomGroupType === 'regular')).length;
      while ((isEuro ? currentRegularCount : group.rooms.length) < val) {
        const chamberIndex = isEuro ? currentRegularCount : group.rooms.length;
        const chamber = createPremiseChamberFn
          ? createPremiseChamberFn(floorIndex, group.premiseNumber - 1, chamberIndex, first.roomZone || '')
          : { ...first, chamberNumber: chamberIndex + 1, chamberDisplayName: `Комната ${chamberIndex + 1}` };
        chamber.premiseId = premiseId;
        chamber.roomGroupType = 'regular';
        chamber.roomGroupIndex = 0;
        chamber.roomGroupName = 'Обычные комнаты';
        chamber.roomInsideGroupNumber = chamberIndex + 1;
        chamber.appointment = first.appointment || '';
        chamber.subAppointment = first.subAppointment || '';
        chamber.location = first.location || floor.location || 'above_ground';
        floor.livingRooms.push(chamber);
        group.rooms.push({ room: chamber, index: floor.livingRooms.length - 1 });
        currentRegularCount += 1;
      }
      if (getPremiseGroupsFn) getPremiseGroupsFn(roomId, floorIndex);
      renderFloorRooms(roomId, floorIndex);
      if (typeof refreshObjectFloorCounters === 'function') refreshObjectFloorCounters(floorIndex);
      updateTotalAreas();
      updateDetailedCalc();
    }
    
    function updateFloorRoomAppointment(roomId, floorIndex, roomIndex, value) {
      if (!roomData[roomId].floors[floorIndex].livingRooms[roomIndex]) return;
      const currentRoom = roomData[roomId].floors[floorIndex].livingRooms[roomIndex];
      const relatedRooms = roomData[roomId].floors[floorIndex].livingRooms.filter(room => room.premiseId === currentRoom.premiseId);
      relatedRooms.forEach(room => {
        room.appointment = value;
      });
      if (value === 'living_zone' || value === 'residential_house' || value === 'apartment' || value === 'aparthotel' || value === 'euro_apartment' || value === 'euro_aparthotel') {
        relatedRooms.forEach(room => {
          if (!room.roomGroupType || room.roomGroupType === 'regular') {
            room.roomZone = 'living';
            if (typeof ensureRoomZone === 'function') ensureRoomZone(room, 'living');
          }
        });
      } else if (value === 'nonliving_zone' || value === 'commercial') {
        relatedRooms.forEach(room => {
          room.roomZone = 'nonliving';
          if (typeof ensureRoomZone === 'function') ensureRoomZone(room, 'nonliving');
        });
      }
      
      const subAppointmentSelect = document.getElementById(`floorSubAppointment_${roomId}_${floorIndex}_${roomIndex}`);
      const subAppointmentContainer = subAppointmentSelect?.closest('.area-input-group');
      
      if (subAppointmentSelect) {
        subAppointmentSelect.innerHTML = '<option value="">Выберите</option>';

        const subOptions = typeof getPremiseSubOptions === 'function' ? getPremiseSubOptions(value) : [];
        if (subOptions.length) {
          subOptions.forEach(item => {
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
        relatedRooms.forEach(room => {
          room.subAppointment = '';
          room.retailPremiseType = '';
        });
        if (subAppointmentSelect) subAppointmentSelect.value = '';
        resetRoomTypeToDefault(roomId, currentRoom);
      } else {
        relatedRooms.forEach(room => {
          room.subAppointment = '';
          room.retailPremiseType = '';
          room.roomType = '';
        });
      }
      if (typeof isEuroPremiseAppointment === 'function' && !isEuroPremiseAppointment(value)) {
        roomData[roomId].floors[floorIndex].livingRooms = roomData[roomId].floors[floorIndex].livingRooms.filter(room => {
          return room.premiseId !== currentRoom.premiseId || !room.roomGroupType || room.roomGroupType === 'regular';
        });
      }
      saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      updateDetailedCalc();
    }
    
    function updateFloorRoomSubAppointment(roomId, floorIndex, roomIndex, value) {
      if (!roomData[roomId].floors[floorIndex].livingRooms[roomIndex]) return;
      const currentRoom = roomData[roomId].floors[floorIndex].livingRooms[roomIndex];
      roomData[roomId].floors[floorIndex].livingRooms
        .filter(room => room.premiseId === currentRoom.premiseId)
        .forEach(room => {
          room.subAppointment = value;
          if (typeof shouldShowRetailPremiseType === 'function' && !shouldShowRetailPremiseType(room)) {
            room.retailPremiseType = '';
          }
        });
      
      if (commercialRoomTypes[value]) {
        if (commercialRoomTypes[value].length > 0) {
          const firstType = commercialRoomTypes[value][0];
          roomData[roomId].floors[floorIndex].livingRooms
            .filter(room => room.premiseId === currentRoom.premiseId)
            .forEach(room => {
              room.roomType = firstType.name;
            });
        }
      } else {
        resetRoomTypeToDefault(roomId, roomData[roomId].floors[floorIndex].livingRooms[roomIndex]);
      }
      saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      updateDetailedCalc();
    }

    function updateFloorRoomRetailPremiseType(roomId, floorIndex, roomIndex, value) {
      const currentRoom = roomData[roomId]?.floors?.[floorIndex]?.livingRooms?.[roomIndex];
      if (!currentRoom) return;
      const relatedRooms = roomData[roomId].floors[floorIndex].livingRooms.filter(room => room.premiseId === currentRoom.premiseId);
      relatedRooms.forEach(room => {
        room.retailPremiseType = value;
        const catalog = typeof getRoomTypeCatalogByZone === 'function' ? getRoomTypeCatalogByZone(room.roomZone || 'nonliving', room) : [];
        if (catalog.length && !catalog.some(type => type.name === room.roomType)) {
          room.roomType = catalog[0].name;
          room.floorAreaManual = false;
          room.wallsAreaManual = false;
          room.ceilingAreaManual = false;
        }
      });
      saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      updateDetailedCalc();
    }
    
    function updateFloorRoomTypeSelector(roomId, floorIndex, roomIndex) {
      const room = priceData.rooms[roomId];
      const data = roomData[roomId].floors[floorIndex].livingRooms[roomIndex];
      if (!room || !data) return;
      const roomTypes = typeof getRoomTypeCatalogByZone === 'function'
        ? getRoomTypeCatalogByZone(data.roomZone || '', data)
        : applyRoomTypeCatalogForAppointment(roomId, data);
      
      const iconEl = document.getElementById(`floorRoomTypeIcon_${roomId}_${floorIndex}_${roomIndex}`);
      const textEl = document.getElementById(`floorRoomTypeText_${roomId}_${floorIndex}_${roomIndex}`);
      const dropdownEl = document.getElementById(`floorCustomSelect_${roomId}_${floorIndex}_${roomIndex}`);
      
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
        } else {
          iconEl.className = 'fas fa-circle-dot';
          textEl.textContent = 'Сначала выберите зону';
          data.roomType = '';
        }
      }
      
      if (dropdownEl && roomTypes) {
        dropdownEl.innerHTML = roomTypes.map(type => 
          `<div class="custom-select-option" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; transition: background 0.2s;" onmouseenter="this.style.background='rgba(74, 222, 128, 0.1)'" onmouseleave="this.style.background='transparent'" onclick="selectFloorRoomType('${roomId}', ${floorIndex}, ${roomIndex}, '${type.name}', '${type.icon}')"><i class="fas ${type.icon}" style="color: #22c55e !important;"></i><span style="color: inherit;">${type.name}</span></div>`
        ).join('');
      }
    }
    
    function changeFloorRoomField(roomId, floorIndex, roomIndex, field, delta) {
      const room = roomData[roomId].floors[floorIndex].livingRooms[roomIndex];
      if (!room) return;
      
      let current = parseInt(room[field]) || 0;
      let maxVal = 15;
      if (field === 'doors' || field === 'windows' || field === 'balcony' || field === 'archCount') maxVal = 5;
      current = Math.max(0, Math.min(maxVal, current + delta));
      
      updateFloorRoomData(roomId, floorIndex, roomIndex, field, current);
    }
    
    function updateFloorRoomDoorSize(roomId, floorIndex, roomIndex, index, dimension, value) {
      const room = roomData[roomId].floors[floorIndex].livingRooms[roomIndex];
      if (!room) return;
      
      const val = parseFloat(value) || 80;
      if (dimension === 'width') {
        room.doorWidths[index] = val;
      } else {
        room.doorHeights[index] = val;
      }
      
      room.wallsArea = calculateLivingRoomWallsArea(room);
      updateTotalAreas();
      updateDetailedCalc();
    }
    
    function updateFloorRoomWindowSize(roomId, floorIndex, roomIndex, index, dimension, value) {
      const room = roomData[roomId].floors[floorIndex].livingRooms[roomIndex];
      if (!room) return;
      
      const val = parseFloat(value) || 130;
      if (dimension === 'width') {
        room.windowWidths[index] = val;
      } else {
        if (room.panoramicWindows) {
          syncFloorRoomPanoramicWindowHeights(room);
          return;
        }
        room.windowHeights[index] = val;
      }
      
      room.wallsArea = calculateLivingRoomWallsArea(room);
      updateTotalAreas();
      updateDetailedCalc();
    }
    
    function updateFloorRoomBalconySize(roomId, floorIndex, roomIndex, index, dimension, value) {
      const room = roomData[roomId].floors[floorIndex].livingRooms[roomIndex];
      if (!room) return;
      
      const val = parseFloat(value) || 80;
      if (dimension === 'width') {
        room.balconyWidths[index] = val;
      } else {
        room.balconyHeights[index] = val;
      }
      
      room.wallsArea = calculateLivingRoomWallsArea(room);
      updateTotalAreas();
      updateDetailedCalc();
    }
    
    function updateFloorRoomArchArea(roomId, floorIndex, roomIndex, index, value) {
      const room = roomData[roomId].floors[floorIndex].livingRooms[roomIndex];
      if (!room) return;
      
      if (!room.archAreas) room.archAreas = Array(5).fill(0);
      room.archAreas[index] = parseFloat(value) || 0;
      
      room.wallsArea = calculateLivingRoomWallsArea(room);
      updateTotalAreas();
      updateDetailedCalc();
    }
    
    function updateFloorRoomConstructionArea(roomId, floorIndex, roomIndex, field, index, value) {
      const room = roomData[roomId].floors[floorIndex].livingRooms[roomIndex];
      if (!room) return;
      
      const areasField = field + 'Areas';
      if (!room[areasField]) room[areasField] = Array(15).fill(0);
      room[areasField][index] = parseFloat(value) || 0;
      
      room.wallsArea = calculateLivingRoomWallsArea(room);
      updateTotalAreas();
      updateDetailedCalc();
    }
    
    function updateFloorRoomMaterialCoeff(roomId, floorIndex, roomIndex, value) {
      const room = roomData[roomId].floors[floorIndex].livingRooms[roomIndex];
      if (!room) return;
      
      const coeff = parseFloat(value) || 1.1;
      room.materialCoefficient = coeff;
      
      const floorEl = document.getElementById(`floorRoomMatFloor_${roomId}_${floorIndex}_${roomIndex}`);
      const wallsEl = document.getElementById(`floorRoomMatWalls_${roomId}_${floorIndex}_${roomIndex}`);
      const ceilingEl = document.getElementById(`floorRoomMatCeiling_${roomId}_${floorIndex}_${roomIndex}`);
      
      if (floorEl) floorEl.textContent = getLivingRoomMaterialFloorArea(room).toFixed(2) + ' \u043C\u00B2';
      if (wallsEl) wallsEl.textContent = getLivingRoomMaterialWallsArea(room).toFixed(2) + ' \u043C\u00B2';
      if (ceilingEl) ceilingEl.textContent = getLivingRoomMaterialCeilingArea(room).toFixed(2) + ' \u043C\u00B2';
      
      updateTotalAreas();
      updateDetailedCalc();
    }
    
    function updateFloorRoomRepairData(roomId, floorIndex, roomIndex, field, value) {
      const room = roomData[roomId].floors[floorIndex].livingRooms[roomIndex];
      if (!room) return;
      
      if (!room.repairData) {
        room.repairData = {};
      }
      room.repairData[field] = value;
      markRoomRepairCalculationNeedsUpdate(room, `repairData.${field}`);
    }

    const repairQuestCurrentFinishOptions = {
      floor: [
        { value: 'laminate', label: 'Ламинат' },
        { value: 'linoleum', label: 'Линолеум' },
        { value: 'ceramic_tile', label: 'Керамическая плитка' },
        { value: 'porcelain_tile', label: 'Керамогранит' },
        { value: 'parquet_board', label: 'Паркетная доска' },
        { value: 'engineered_board', label: 'Инженерная доска' },
        { value: 'self_leveling', label: 'Наливной пол' },
        { value: 'screed', label: 'Стяжка' }
      ],
      wall: [
        { value: 'wallpaper', label: 'Обои' },
        { value: 'paint', label: 'Краска' },
        { value: 'plaster', label: 'Штукатурка' },
        { value: 'decorative_plaster', label: 'Декоративная / Венецианская штукатурка' },
        { value: 'ceramic_tile_wall', label: 'Керамическая плитка' },
        { value: 'porcelain_tile_wall', label: 'Керамогранит' },
        { value: 'panels', label: 'Панели / рейки' }
      ],
      ceiling: [
        { value: 'stretch_ceiling', label: 'Натяжной потолок' },
        { value: 'ceiling_paint', label: 'Покраска' },
        { value: 'ceiling_plaster', label: 'Штукатурка потолка' },
        { value: 'gypsum_ceiling', label: 'Гипсокартонный потолок' },
        { value: 'suspended_ceiling', label: 'Подвесной потолок' },
        { value: 'rack_ceiling', label: 'Реечный потолок' }
      ]
    };

    const repairQuestApproxPackages = [
      { value: 'minimal', label: 'Базовый набор', hint: 'Несколько ключевых точек и стандартный набор работ.' },
      { value: 'standard', label: 'Стандартный набор', hint: 'Подходит для большинства квартир и домов.' },
      { value: 'extended', label: 'Расширенный набор', hint: 'Больше инженерии, света и дополнительных работ.' }
    ];

    const repairQuestLightingOptions = [
      { value: 'basic', label: 'Базовый свет', hint: 'Обычный свет без сложных сценариев.' },
      { value: 'accent', label: 'Акцентные светильники', hint: 'Отдельные споты, бра или локальные светильники для выделения зоны без световых линий.' },
      { value: 'scenario', label: 'Сценарный свет', hint: 'Несколько групп света и световые линии с отдельным управлением.' }
    ];

    const repairQuestElectricalWorkScopeOptions = [
      { value: 'wall_points', label: 'Розетки и выключатели', hint: 'Работаем только с точками на стенах и слаботочкой.' },
      { value: 'lighting', label: 'Только свет', hint: 'Работаем со светильниками, выводами и сценариями света.' },
      { value: 'both', label: 'Розетки и свет', hint: 'Меняем настенные точки и свет одновременно.' }
    ];

    const repairQuestTileZoneOptions = [
      { value: 'none', label: 'Без плитки', hint: 'Только обычная отделка.' },
      { value: 'accent', label: 'Локально', hint: 'Фартук, душ, часть стены или пола.' },
      { value: 'full', label: 'Много плитки', hint: 'Плитка на полу и заметной части стен.' }
    ];

    const repairQuestCurtainOptions = [
      { value: 'none', label: 'Без карниза', hint: 'Шторы и карниз в этом помещении не закладываем.' },
      { value: 'wall', label: 'Настенный карниз', hint: 'Карниз крепится к стене над окном.' },
      { value: 'ceiling', label: 'Потолочный карниз', hint: 'Карниз крепится к потолку, без скрытой ниши.' },
      { value: 'hidden', label: 'Скрытый карниз', hint: 'Карниз прячется в нише или теневом узле потолка.' }
    ];

    const repairQuestSmartHomeOptions = [
      { value: 'no', label: 'Без автоматики', hint: 'Обычная инженерия без дополнительных сценариев.' },
      { value: 'prepare', label: 'Подготовка под smart', hint: 'Кабели, слаботочный резерв, места под датчики и контроллеры без установки устройств.' },
      { value: 'basic', label: 'Базовый smart', hint: 'Автовыключение света, датчики протечки во влажных зонах и присутствие там, где это полезно.' },
      { value: 'advanced', label: 'Расширенный smart', hint: 'Сценарии света, климат, шторы/карнизы, датчики, контроллеры и отдельное место в щите.' }
    ];

    const repairQuestSecurityOptions = [
      { value: 'none', label: 'Без системы', hint: 'Только базовые точки подключения.' },
      { value: 'video_intercom', label: 'Видеодомофон', hint: 'Smart-сценарий с видеосвязью и возможной интеграцией в систему.' },
      { value: 'video_intercom_open', label: 'Видеодомофон с открытием двери', hint: 'Видеосвязь плюс управление замком / дверью через систему.' },
      { value: 'smart_security', label: 'Умная безопасность', hint: 'Камеры, датчики, контроль доступа и связь со smart-щитом.' }
    ];

    const repairQuestEntrySecurityModeOptions = [
      { value: 'none', label: 'Не нужно', hint: 'Не закладываем звонок, домофон или smart-безопасность в этом помещении.' },
      { value: 'standard', label: 'Домофон / звонок - стандартное решение', hint: 'Обычный звонок, домофон или видеодомофон без smart-системы.' },
      { value: 'smart', label: 'Система безопасности - умный дом', hint: 'Безопасность пойдет в расчеты умного дома и SMART-щита.' }
    ];

    const repairQuestSecurityCameraTypeOptions = [
      { value: 'indoor', label: 'Внутренние камеры', hint: 'Для помещения, холла или коридора.' },
      { value: 'outdoor', label: 'Уличные / входная зона', hint: 'Для входа, фасада, террасы, участка.' },
      { value: 'mixed', label: 'Смешанные', hint: 'Есть и внутренние, и наружные камеры.' }
    ];

    const repairQuestWallAccentOptions = [
      { value: 'none', label: 'Без акцентов', hint: 'Ровная спокойная отделка.' },
      { value: 'molding', label: 'Молдинги', hint: 'Классические декоративные профили на стенах.' },
      { value: 'slats', label: 'Рейки / панели', hint: 'Выраженный современный акцент на части стен.' }
    ];

    const repairQuestWallDecorOptions = [
      { value: 'none', label: 'Без дополнительных покрытий', hint: 'Вся площадь идет в основную отделку стен.' },
      { value: 'photo_wallpaper', label: 'Фотообои', hint: 'Отдельная зона, которая вычитается из основной отделки.' },
      { value: 'wall_panels', label: 'МДФ / настенные панели', hint: 'Отдельная зона панелей поверх части стен, можно сочетать с основной отделкой.' },
      { value: 'decorative_plaster', label: 'Декоративная / Венецианская штукатурка', hint: 'Акцентная зона декоративной штукатурки, включая венецианские и минеральные техники.' },
      { value: 'ceramic_tile', label: 'Керамическая плитка', hint: 'Плитка на части стен, например зона у раковины или фартук.' },
      { value: 'porcelain_tile', label: 'Керамогранит', hint: 'Керамогранит на отдельной зоне стен.' },
      { value: 'wall_3d_gypsum', label: '3D-стена: гипсовые панели', hint: 'Объемные 3D-панели как акцентная стена.' },
      { value: 'wall_3d_polymer', label: '3D-стена: полимерные панели', hint: 'Легкие 3D-панели из полимера или акрила.' }
    ];

    const repairQuestCeilingDecorOptions = [
      { value: 'none', label: 'Без декора', hint: 'Простой чистый потолок без дополнительных профилей.' },
      { value: 'molding', label: 'Потолочный багет', hint: 'Добавим потолочный плинтус или декоративный профиль.' }
    ];

    const repairQuestFridgeOptions = [
      { value: 'no', label: 'Не нужно', hint: 'Установка холодильника не требуется.' },
      { value: 'standard', label: 'Стандартная', hint: 'Подключение обычного холодильника.' },
      { value: 'large', label: 'Большой холодильник', hint: 'Нужна подготовка для side-by-side или большой модели.' }
    ];

    const repairQuestStoveOptions = [
      { value: 'gas', label: 'Газовая плита', hint: 'Подвод газа и подключение.' },
      { value: 'electric', label: 'Электрическая плита', hint: 'Усиленная электропроводка.' }
    ];

    const repairQuestBoilerOptions = [
      { value: 'no', label: 'Не нужен', hint: 'Дополнительный водонагреватель не закладываем.' },
      { value: 'reserve', label: 'Резервный', hint: 'Подготовим подключение на случай отключений воды.' },
      { value: 'yes', label: 'Нужен бойлер', hint: 'Сразу учитываем монтаж и подключение водонагревателя.' }
    ];

    const repairQuestAirConditioningOptions = [
      { value: 'no', label: 'Не нужен', hint: 'Климатику в этой комнате не закладываем.' },
      { value: 'prepare', label: 'Подготовка', hint: 'Заложим трассу, питание и место под блок.' },
      { value: 'replace', label: 'Новый вместо старого', hint: 'Учтём демонтаж старого кондиционера и новую подготовку.' }
    ];

    const repairQuestPlinthOptions = [
      { value: 'none', label: 'Без напольного плинтуса', hint: 'Не добавляем отдельный напольный плинтус.' },
      { value: 'standard', label: 'Обычный плинтус', hint: 'Практичное решение без лишней сложности.' },
      { value: 'hidden', label: 'Скрытый плинтус', hint: 'Более сложный и дорогой, но визуально чище.' }
    ];

    const repairQuestCeilingPlinthOptions = [
      { value: 'none', label: 'Без потолочного плинтуса', hint: 'Чистое примыкание потолка к стене без багета.' },
      { value: 'standard', label: 'ПУ/МДФ багет', hint: 'Легкий потолочный плинтус или багет.' },
      { value: 'gypsum', label: 'Гипсовый потолочный багет', hint: 'Более сложный лепной профиль по примыканию потолка и стен.' }
    ];

    const repairQuestCurrentStateLabels = {
      concrete_with_walls: 'Без отделки (с перегородками)',
      concrete_no_walls: 'Без отделки (без перегородок)',
      rough_finish: 'Черновая отделка',
      whitebox: 'Предчистовая White-box',
      old_finish: 'Есть старая отделка'
    };

    const repairQuestTargetResultOptions = [
      { value: 'rough_target', label: 'Черновая отделка', hint: 'Нужны базовые черновые работы без финишных покрытий.' },
      { value: 'whitebox_target', label: 'White-box', hint: 'Подготовим поверхности под финишную отделку.' },
      { value: 'finish_target', label: 'Чистовая отделка', hint: 'Сразу учитываем итоговые покрытия и внешний вид.' },
      { value: 'turnkey_target', label: 'Под ключ (с мебелью)', hint: 'Для расчета работ равнозначно чистовой отделке, но учитывает более насыщенные сценарии инженерии и оснащения.' }
    ];

    const repairQuestReplanningApproxOptions = [
      { value: 'no', label: 'Не нужна', hint: 'Оставляем планировку без вмешательства.' },
      { value: 'local_changes', label: 'Локально', hint: 'Есть отдельные изменения или демонтаж участков.' },
      { value: 'full', label: 'Да', hint: 'Потребуется заметное вмешательство в планировку.' }
    ];

    const repairQuestReplanningFullOptions = [
      { value: 'no', label: 'Не нужна', hint: 'Планировку не трогаем.' },
      { value: 'demolish_or_move', label: 'Перенос / демонтаж', hint: 'Нужно убрать или сместить существующие перегородки.' },
      { value: 'build_new', label: 'Новые перегородки', hint: 'Нужно сформировать новые зоны.' },
      { value: 'both', label: 'И перенос, и новые', hint: 'Будет и демонтаж, и новая разбивка помещения.' }
    ];

    const repairQuestDoorActionApproxOptions = [
      { value: 'keep', label: 'Не трогаем', hint: 'Оставляем существующие двери.' },
      { value: 'install_new', label: 'Устанавливаем новые', hint: 'Закладываем новые двери без демонтажа старого блока.' },
      { value: 'replace_with_demo', label: 'Меняем с демонтажом', hint: 'Меняем двери и учитываем демонтаж старого блока.' }
    ];

    const repairQuestDoorActionFullOptions = [
      { value: 'keep', label: 'Не трогаем', hint: 'Оставляем существующие двери.' },
      { value: 'install_new', label: 'Устанавливаем новые', hint: 'Закладываем новые двери без демонтажа старого блока.' },
      { value: 'replace_with_demo', label: 'Меняем с демонтажом', hint: 'Меняем двери и учитываем демонтаж старого блока.' }
    ];

    const repairQuestWindowActionApproxOptions = [
      { value: 'keep', label: 'Не трогаем', hint: 'Оставляем существующие окна.' },
      { value: 'replace_with_demo', label: 'Меняем с демонтажом', hint: 'Меняем окно и учитываем демонтаж старой конструкции.' }
    ];

    const repairQuestWindowActionFullOptions = [
      { value: 'keep', label: 'Не трогаем', hint: 'Оставляем существующие окна.' },
      { value: 'replace_with_demo', label: 'Меняем с демонтажом', hint: 'Меняем окно и учитываем демонтаж старой конструкции.' }
    ];

    const repairQuestBalconyActionExistingOptions = [
      { value: 'keep', label: 'Не трогаем', hint: 'Оставляем существующую балконную дверь / блок.' },
      { value: 'install_new', label: 'Устанавливаем новую', hint: 'Закладываем новую балконную дверь / блок без демонтажа.' },
      { value: 'replace_with_demo', label: 'Меняем с демонтажом', hint: 'Учитываем демонтаж старого блока и установку нового.' }
    ];

    const repairQuestBalconyActionPotentialOptions = [
      { value: 'keep', label: 'Не требуется', hint: 'Балконная дверь / блок для этой комнаты не нужны.' },
      { value: 'install_new', label: 'Устанавливаем новую', hint: 'Закладываем новую балконную дверь / блок.' },
      { value: 'replace_with_demo', label: 'Меняем с демонтажом', hint: 'Если старый блок есть, учитываем его демонтаж и установку нового.' }
    ];

    const repairQuestElectricalScopeOptions = [
      { value: 'no_touch', label: 'Не трогаем', hint: 'Существующую электрику не меняем.' },
      { value: 'add_move_points', label: 'Добавляем / переносим точки', hint: 'Меняем только нужные точки без полной переделки.' },
      { value: 'full_rewire', label: 'Новая электрика по комнате', hint: 'Считаем комнату заново по электрике.' }
    ];

    const repairQuestPlumbingScopeOptions = [
      { value: 'no_touch', label: 'Не трогаем', hint: 'Сантехнику не меняем.' },
      { value: 'add_move_points', label: 'Переносим / добавляем точки', hint: 'Нужны только отдельные изменения.' },
      { value: 'full_replumbing', label: 'Новая сантехника', hint: 'Считаем полную переделку по помещению.' }
    ];

    const repairQuestHeatingScopeOptions = [
      { value: 'no_touch', label: 'Не трогаем', hint: 'Отопление не трогаем.' },
      { value: 'install_new', label: 'Устанавливаем новые', hint: 'Сразу считаем новые приборы без демонтажа старых.' },
      { value: 'replace_with_demo', label: 'Меняем с демонтажом', hint: 'Учитываем демонтаж старых приборов и установку новых.' }
    ];

    const repairQuestHeatingTypeOptions = [
      { value: 'radiator_bottom', label: 'Радиаторы с нижним подключением', hint: 'Современный вариант с аккуратной подводкой.' },
      { value: 'radiator_side', label: 'Радиаторы с боковым подключением', hint: 'Классическая схема подключения радиаторов.' },
      { value: 'infloor_convector', label: 'Внутрипольные конвекторы', hint: 'Подходит для панорамных окон и низких подоконников.' }
    ];

    const repairQuestClimateScopeOptions = [
      { value: 'not_needed', label: 'Не нужно', hint: 'Климат в этой комнате не закладываем.' },
      { value: 'prep_only', label: 'Подготовка под систему', hint: 'Трасса, питание, дренаж и закладные без установки оборудования.' },
      { value: 'new_install', label: 'Монтаж новой системы', hint: 'Сразу закладываем оборудование, трассы и пусконаладку.' },
      { value: 'replace_old', label: 'Замена старой системы', hint: 'Учитываем демонтаж старого кондиционера и новую установку.' }
    ];

    const repairQuestAcSystemOptions = [
      { value: 'wall_split', label: 'Настенная split-система', hint: 'Самый частый вариант для комнаты.' },
      { value: 'multi_split', label: 'Multi-split', hint: 'Несколько внутренних блоков от одного наружного.' },
      { value: 'duct', label: 'Канальный кондиционер', hint: 'Скрытая система с воздуховодами и решетками.' },
      { value: 'cassette', label: 'Кассетный блок', hint: 'Для подвесных потолков и больших помещений.' },
      { value: 'floor_ceiling', label: 'Напольно-потолочный', hint: 'Когда настенный блок неудобен или не подходит.' }
    ];

    const repairQuestVentilationSystemOptions = [
      { value: 'natural', label: 'Естественная вентиляция', hint: 'Без отдельной механической системы.' },
      { value: 'supply_valve', label: 'Приточный клапан', hint: 'Простой приток свежего воздуха в жилую комнату.' },
      { value: 'exhaust_fan', label: 'Вытяжной вентилятор', hint: 'Принудительная вытяжка для влажных/служебных зон.' },
      { value: 'hrv', label: 'Рекуператор', hint: 'Приток и вытяжка с частичным возвратом тепла.' },
      { value: 'supply_unit', label: 'Приточная установка', hint: 'Механический приток с отдельным оборудованием.' },
      { value: 'ducted_supply_exhaust', label: 'Канальная приточно-вытяжная', hint: 'Воздуховоды, диффузоры, настройка и балансировка.' }
    ];

    const repairQuestAcRouteOptions = [
      { value: 'hidden', label: 'Скрытая трасса', hint: 'Трасса прячется в стене/потолке на этапе ремонта.' },
      { value: 'box', label: 'В декоративном коробе', hint: 'Трасса идет в видимом коробе, подходит для готовых помещений.' }
    ];

    const repairQuestAcDrainageOptions = [
      { value: 'gravity', label: 'Самотечный дренаж', hint: 'Оптимально, если можно вывести дренаж с уклоном.' },
      { value: 'pump', label: 'Через помпу', hint: 'Когда самотеком вывести конденсат нельзя.' },
      { value: 'sewer', label: 'В канализацию', hint: 'Нужна аккуратная привязка к канализации через гидрозатвор.' }
    ];

    const repairQuestVentilationControlOptions = [
      { value: 'basic', label: 'Обычное управление', hint: 'Без отдельной автоматики.' },
      { value: 'timer', label: 'Таймер / задержка', hint: 'Вентилятор работает заданное время после выключения.' },
      { value: 'humidity', label: 'Датчик влажности', hint: 'Автоматический запуск по влажности.' },
      { value: 'smart', label: 'Smart-управление', hint: 'Подключение к сценариям умного дома.' }
    ];

    const repairQuestApplianceLoadOptions = [
      { value: 'standard', label: 'Обычный набор', hint: 'Типовой набор техники без перегруза по электрике.' },
      { value: 'high', label: 'Насыщенная техника', hint: 'Много техники и более плотное инженерное наполнение.' }
    ];

    const repairQuestIntercomOptions = [
      { value: 'none', label: 'Не нужен', hint: 'Без домофона и видеодомофона.' },
      { value: 'doorbell', label: 'Дверной звонок', hint: 'Простое стандартное решение без переговорного устройства.' },
      { value: 'intercom', label: 'Домофон', hint: 'Базовое переговорное устройство.' },
      { value: 'intercom_open', label: 'Домофон с открытием двери', hint: 'Домофон плюс управление замком / дверью.' },
      { value: 'video_intercom_open', label: 'Видеодомофон с открытием двери', hint: 'Стандартное видеорешение с управлением дверью.' }
    ];

    const repairQuestUseScenarioOptions = [
      { value: 'storage', label: 'Хранение', hint: 'Простой сценарий без насыщенной инженерии.' },
      { value: 'relax', label: 'Зона отдыха', hint: 'Свет, теплый пол и более комфортная отделка.' },
      { value: 'workspace', label: 'Рабочая зона', hint: 'Нужны розетки, свет и стабильная инженерия.' }
    ];

    const repairQuestRoughFloorOptions = [
      { value: 'screed', label: 'Стяжка пола', hint: 'Базовое выравнивание пола стяжкой. Способ устройства выбирается отдельно.' },
      { value: 'screed_warm', label: 'Стяжка с теплым полом внутри', hint: 'Теплый пол закладывается в пирог стяжки, а ниже нужно выбрать тип системы.' },
      { value: 'screed_self_leveling', label: 'Стяжка + наливной слой', hint: 'Полный пирог: стяжка, затем тонкое самовыравнивающее основание.' },
      { value: 'self_leveling', label: 'Наливной пол', hint: 'Тонкое выравнивание без полной новой стяжки, когда основание уже достаточно стабильное.' },
      { value: 'dry_screed', label: 'Сухая стяжка', hint: 'Сухая сборная система для ситуаций, где нельзя добавлять мокрые процессы.' },
      { value: 'leveling_only', label: 'Локальное выравнивание', hint: 'Небольшое вмешательство без полной стяжки.' }
    ];

    const repairQuestFloorScreedMethodOptions = [
      { value: 'mechanized', label: 'Механизированная', hint: 'Полусухая стяжка с подачей смеси, оптимальна для большинства площадей.' },
      { value: 'manual', label: 'Ручная', hint: 'Для небольших помещений, сложного доступа или локальных работ.' }
    ];

    const repairQuestFloorBaseLayerOptions = [
      { value: 'slab', label: 'Плита / бетонное основание', hint: 'Стандартное основание квартиры или надземного этажа.' },
      { value: 'soil_geotextile', label: 'Грунт + геотекстиль', hint: 'Для подвала, цоколя или первого уровня по грунту. Геотекстиль включается автоматически.' }
    ];

    const repairQuestFloorScreedCompositionOptions = [
      { value: 'expanded_clay', label: 'Керамзитовый слой', hint: 'Подсыпка для выравнивания, облегчения или дополнительной теплоизоляции.' },
      { value: 'insulation', label: 'Утеплитель под стяжку', hint: 'Для холодного основания, лоджии, цоколя или пола по грунту.' },
      { value: 'vapor_barrier', label: 'Пароизоляция / разделительная пленка', hint: 'Разделительный слой между утеплителем/подсыпкой и стяжкой.' },
      { value: 'mesh', label: 'Армирующая сетка', hint: 'Усиление стяжки при нагрузках, теплых полах и сложных основаниях.' },
      { value: 'fiber', label: 'Фиброволокно', hint: 'Добавка в смесь для снижения риска микротрещин.' },
      { value: 'plasticizer', label: 'Пластификатор', hint: 'Добавка для улучшения работы смеси и качества стяжки.' },
      { value: 'water_floor_mats', label: 'Маты / плиты для водяного пола', hint: 'Для фиксации труб водяного теплого пола в пироге стяжки.' }
    ];

    const repairQuestFloorReinforcementOptions = [
      { value: 'no', label: 'Без армирования', hint: 'Оставляем стандартную технологию без отдельного армирующего слоя.' },
      { value: 'mesh', label: 'Армирование сеткой', hint: 'Добавляем армирующую сетку для стяжки с повышенной нагрузкой или риском трещин.' },
      { value: 'fiber', label: 'Фиброволокно', hint: 'Усиливаем смесь фиброволокном без отдельной сетки.' }
    ];

    const repairQuestFloorWaterproofStageOptions = [
      { value: 'none', label: 'Не требуется', hint: 'Гидроизоляцию пола в этом сценарии не закладываем.' },
      { value: 'before_screed', label: 'Перед стяжкой', hint: 'Отсекаем влагу основания и удерживаем воду из цементной смеси.' },
      { value: 'after_screed', label: 'После стяжки', hint: 'Готовим защитный слой перед чистовой отделкой.' },
      { value: 'both', label: 'До и после стяжки', hint: 'Два контура защиты для влажных зон и сложных оснований.' }
    ];

    const repairQuestFloorWaterproofTypeOptions = [
      { value: 'coating', label: 'Обмазочная', hint: 'Самый частый вариант для санузлов, кухонь и локальных влажных зон.' },
      { value: 'roll', label: 'Рулонная / мембранная', hint: 'Подходит под стяжку и для отсечки влаги от основания.' },
      { value: 'tape_edges', label: 'Лента по примыканиям', hint: 'Усиление углов, примыканий стен и проходов коммуникаций.' },
      { value: 'combined', label: 'Комбинированная', hint: 'Обмазочная гидроизоляция плюс лента по примыканиям.' }
    ];

    const repairQuestFloorGeotextileOptions = [
      { value: 'no', label: 'Не нужен', hint: 'Оставляем стандартную подготовку основания.' },
      { value: 'yes', label: 'Нужен геотекстиль', hint: 'Добавляем разделительный слой перед стяжкой для сложного или разнородного основания.' }
    ];

    const repairQuestRoughWallOptions = [
      { value: 'plaster', label: 'Штукатурка стен', hint: 'Способ нанесения, основание и состав штукатурки выбираются отдельными шагами.' },
      { value: 'plaster_with_partitions', label: 'Штукатурка + новые зоны', hint: 'Добавляем перегородки и подбираем систему штукатурки по материалу основания.' },
      { value: 'local_prep', label: 'Локальная подготовка', hint: 'Работаем только с частью помещения.' }
    ];

    const repairQuestWallPlasterMethodOptions = [
      { value: 'mechanized', label: 'Механизированная', hint: 'Ровный быстрый способ для больших площадей и стандартных штукатурных систем.' },
      { value: 'manual', label: 'Ручная', hint: 'Подходит для небольших комнат, сложной геометрии, локальных зон и аккуратной работы по разным основаниям.' }
    ];

    const repairQuestWallBaseMaterialOptions = [
      { value: 'concrete_brick', label: 'Бетон / кирпич', hint: 'Прочное минеральное основание, допускает стандартные цементные системы во влажных зонах.' },
      { value: 'aerated_concrete', label: 'Газобетон / пеноблок', hint: 'Пористое основание быстро забирает влагу, нужна специализированная смесь или известково-цементная система.' },
      { value: 'pazogreb', label: 'Пазогребневый блок', hint: 'Ровное, но чувствительное основание: система подбирается с учетом адгезии и влагорежима.' },
      { value: 'gkl', label: 'ГКЛ / каркас', hint: 'Тяжелую цементно-песчаную штукатурку не закладываем, вместо нее нужна подготовка листов и швов.' },
      { value: 'mixed', label: 'Смешанное основание', hint: 'Если в комнате несколько оснований, расчет выбирает более осторожную систему.' }
    ];

    const repairQuestWallPlasterSystemOptions = [
      { value: 'auto', label: 'Подобрать автоматически', hint: 'Квест сам выберет систему по мокрой зоне, материалу стен и цели ремонта.' },
      { value: 'gypsum', label: 'Гипсовая штукатурка', hint: 'Для сухих помещений и подходящих оснований.' },
      { value: 'cement_lime', label: 'Специализированная / известково-цементная', hint: 'Для газобетона, пеноблока, ПГП и смешанных оснований с водоудерживающими добавками.' },
      { value: 'cement_sand', label: 'Цементно-песчаная влагостойкая', hint: 'Только для подходящих минеральных оснований в мокрых зонах.' },
      { value: 'gkl_prep', label: 'Подготовка ГКЛ без тяжелой штукатурки', hint: 'Швы, грунтование и подготовка листов вместо тяжелой цементной штукатурки.' }
    ];

    const repairQuestRoughCeilingOptions = [
      { value: 'base_prep', label: 'Базовая подготовка', hint: 'Черновая подготовка потолка без финиша.' },
      { value: 'minimal', label: 'Минимально', hint: 'Только необходимый базовый объем.' }
    ];

    const repairQuestWhiteboxFloorOptions = [
      { value: 'screed_ready', label: 'Стяжка под финиш', hint: 'Основание готовим под чистовое покрытие. Способ устройства выбирается отдельно.' },
      { value: 'self_leveling', label: 'Стяжка + наливной пол', hint: 'Более ровная подготовка под финиш.' },
      { value: 'finish_ready', label: 'Полностью под покрытие', hint: 'Доводим пол до состояния готовности под чистовой слой.' }
    ];

    const repairQuestWhiteboxWallOptions = [
      { value: 'plaster', label: 'Штукатурка', hint: 'Базовое выравнивание стен.' },
      { value: 'putty', label: 'Шпаклевка', hint: 'Подготовка стен под последующий финиш.' },
      { value: 'paint_ready', label: 'Под покраску', hint: 'Максимально чистая подготовка поверхности.' }
    ];

    const repairQuestWallReinforcementOptions = [
      { value: 'no', label: 'Не требуется', hint: 'Штукатурим без дополнительного армирования.' },
      { value: 'mesh', label: 'Армирование сеткой', hint: 'Добавим армирующую сетку в штукатурный слой для прочности и снижения риска трещин.' },
      { value: 'additive', label: 'Армирующая добавка в смесь', hint: 'Учитываем армирующие добавки в штукатурный состав без отдельной сетки.' }
    ];

    const repairQuestWhiteboxCeilingOptions = [
      { value: 'base_prep', label: 'Базовая подготовка', hint: 'Готовим потолок без декоративного финиша.' },
      { value: 'putty_ready', label: 'Шпаклевка', hint: 'Подготовка под последующие финишные работы.' },
      { value: 'paint_ready', label: 'Под покраску', hint: 'Потолок доводим до чистого состояния.' }
    ];

    function updateFloorRoomLocation(roomId, floorIndex, roomIndex, value) {
      if (!roomData[roomId].floors[floorIndex].livingRooms[roomIndex]) return;
      roomData[roomId].floors[floorIndex].livingRooms[roomIndex].location = value;
      updateDetailedCalc();
    }
