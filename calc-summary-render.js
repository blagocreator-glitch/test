// Module: calc-summary-render.js
    function updateWorksMaterialsDisplay() {
      for (const [roomId, room] of Object.entries(priceData.rooms)) {
        let data = typeof getEstimateRoomData === 'function'
          ? getEstimateRoomData(roomId)
          : roomData[roomId];
        if (!data) continue;

        if (room?.has_room_type && typeof getEstimateRoomData !== 'function') {
          let totalFloorArea = 0;
          let totalWallsArea = 0;
          let totalCeilingArea = 0;
          if (Array.isArray(data.livingRooms) && data.livingRooms.length > 0) {
            data.livingRooms.forEach(item => {
              totalFloorArea += getLivingRoomFloorArea(item);
              totalWallsArea += calculateLivingRoomWallsArea(item || {});
              totalCeilingArea += getLivingRoomCeilingArea(item || {});
            });
          }
          if (Array.isArray(data.floors) && data.floors.length > 0) {
            data.floors.forEach(floor => {
              if (!Array.isArray(floor?.livingRooms)) return;
              floor.livingRooms.forEach(item => {
                totalFloorArea += getLivingRoomFloorArea(item);
                totalWallsArea += calculateLivingRoomWallsArea(item || {});
                totalCeilingArea += getLivingRoomCeilingArea(item || {});
              });
            });
          }
          data = { ...data, area: totalFloorArea, wallsArea: totalWallsArea, ceilingArea: totalCeilingArea };
        }
        
        const roomInfoSpan = document.getElementById(`roomInfo_${roomId}`);
        if (roomInfoSpan) {
          roomInfoSpan.textContent = `(${data.area} м² пол, ${Math.round(data.wallsArea)} м² стен)`;
        }
        
        for (const surface of ['floor', 'walls', 'ceiling']) {
          const area = surface === 'walls' ? Math.round(data.wallsArea) : (surface === 'ceiling' ? Math.round(data.ceilingArea || data.area || 0) : data.area);
          
          const surfaceInfo = document.getElementById(`surface_${roomId}_${surface}`);
          if (surfaceInfo) {
            surfaceInfo.textContent = `${area} м²`;
          }
          
          const matSurfaceInfo = document.getElementById(`mat_surface_${roomId}_${surface}`);
          if (matSurfaceInfo) {
            matSurfaceInfo.textContent = `${area} м²`;
          }
        }
      }
    }
    
    function updateTotalAreas() {
      const metrics = getConfiguredDetailedRooms();
      document.getElementById('totalAreaCalc').textContent = metrics.totalArea.toFixed(1) + ' м²';
      document.getElementById('totalWallsCalc').textContent = Math.round(metrics.totalWalls) + ' м²';
      
      if (typeof renderWhatToDoRooms === 'function') {
        scheduleWhatToDoRender();
      }
    }
    
    function renderWorksByRoom() {
      console.log('=== renderWorksByRoom CALLED ===');
      const container = document.getElementById('worksByRoom');
      if (!container) {
        console.log('worksByRoom container NOT FOUND');
        return;
      }
      console.log('worksByRoom container FOUND, starting render');
      container.innerHTML = '';
      
      const surfaces = [
        {id: 'floor', name: 'Пол', icon: 'fa-layer-group'},
        {id: 'walls', name: 'Стены', icon: 'fa-border-all'},
        {id: 'ceiling', name: 'Потолок', icon: 'fa-stand-reach'}
      ];
      
      const roomCategories = ['living', 'nonliving'];
      
      for (const roomId of roomCategories) {
        const room = priceData.rooms[roomId];
        if (!room) continue;
        
        let data = typeof getEstimateRoomData === 'function'
          ? getEstimateRoomData(roomId)
          : roomData[roomId];
        
        // For rooms with has_room_type, calculate totals from livingRooms + floors
        if (room.has_room_type && typeof getEstimateRoomData !== 'function') {
          let totalFloorArea = 0;
          let totalWallsArea = 0;
          let totalCeilingArea = 0;
          if (data.livingRooms?.length > 0) {
            data.livingRooms.forEach(r => {
              totalFloorArea += getLivingRoomFloorArea(r);
              totalWallsArea += calculateLivingRoomWallsArea(r);
              totalCeilingArea += getLivingRoomCeilingArea(r);
            });
          }
          if (data.floors?.length > 0) {
            data.floors.forEach(floor => {
              if (floor.livingRooms?.length > 0) {
                floor.livingRooms.forEach(r => {
                  totalFloorArea += getLivingRoomFloorArea(r);
                  totalWallsArea += calculateLivingRoomWallsArea(r);
                  totalCeilingArea += getLivingRoomCeilingArea(r);
                });
              }
            });
          }
          data = { ...data, area: totalFloorArea, wallsArea: totalWallsArea, ceilingArea: totalCeilingArea };
        }
        
        let html = `<div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">`;
        html += `
          <div class="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors" onclick="toggleRoomContent('worksRoom_${roomId}')">
            <i class="fas ${room.icon} text-brand-500"></i>
            <h4 class="font-bold flex-1">${room.name}</h4>
            <span class="text-xs text-gray-500" id="roomInfo_${roomId}">(${data.area.toFixed(1)} м² пол, ${Math.round(data.wallsArea)} м² стен)</span>
            <i class="fas fa-chevron-down text-xs transition-transform" id="worksRoomIcon_${roomId}" style="transform: rotate(-90deg)"></i>
          </div>
          <div id="worksRoom_${roomId}" style="display: none">
        `;
        
        for (const surface of surfaces) {
          let catFound = null;
          let catId = null;
          for (const [cId, cat] of Object.entries(priceData.works)) {
            if (cat.applicable_surface === surface.id) {
              catFound = cat;
              catId = cId;
              break;
            }
          }
          
          if (!catFound) continue;
          
          const surfaceArea = surface.id === 'floor' ? data.area : (surface.id === 'ceiling' ? (data.ceilingArea || data.area || 0) : data.wallsArea);
          const perimeter = Math.sqrt(data.area) * 4 * 1.1;
          const keyPrefix = `works_${roomId}_${surface.id}`;
          
          html += `
            <div class="category-section">
              <div class="category-title cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                   onclick="toggleRoomContent('workSurf_${roomId}_${surface.id}')">
                <i class="fas ${surface.icon}"></i>
                ${surface.name}
                <span class="surface-info" id="surface_${roomId}_${surface.id}">${Math.round(surfaceArea)} м²</span>
                <i class="fas fa-chevron-down text-xs transition-transform ml-2" id="workSurfIcon_${roomId}_${surface.id}" style="transform: rotate(-90deg)"></i>
              </div>
              <div id="workSurf_${roomId}_${surface.id}" style="display: none">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  ${catFound.items.filter(item => {
                    if (item.exclude_rooms && item.exclude_rooms.includes(roomId)) return false;
                    return true;
                  }).map(item => {
                    const key = `${keyPrefix}_${item.id}`;
                    const isSelected = selectedItems.works[keyPrefix]?.includes(key);
                    const displayUnit = item.unit || catFound.unit || 'м²';
                    const itemArea = item.is_perimeter ? perimeter : surfaceArea;
                    return `
                      <div class="calc-item ${isSelected ? 'selected' : ''}" 
                           data-key="${key}" data-surface="${surface.id}" data-type="work"
                           data-perimeter="${item.is_perimeter ? 'true' : 'false'}"
                           onclick="toggleCalcItem(this, '${key}', '${keyPrefix}', 'works')">
                        <div class="calc-checkbox">
                          <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium">${item.name}</div>
                          <div class="text-xs text-gray-500">${item.min?.toLocaleString('ru-RU')} - ${item.max?.toLocaleString('ru-RU')} ₽/${displayUnit}</div>
                        </div>
                        <div class="price-badge">${getDisplayWorkPrice(item).toLocaleString('ru-RU')} ₽</div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          `;
        }
        
        html += `</div></div>`;
        container.innerHTML += html;
      }
      
      // Dismantling works - main category
      const dismantlingCat = priceData.works.dismantling;
      if (dismantlingCat) {
        let html = `<div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">`;
        html += `
          <div class="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors" onclick="toggleRoomContent('works_dismantling')">
            <i class="fas ${dismantlingCat.icon} text-brand-500"></i>
            <h4 class="font-bold flex-1">${dismantlingCat.name}</h4>
            <i class="fas fa-chevron-down text-xs transition-transform" id="works_dismantlingIcon" style="transform: rotate(-90deg)"></i>
          </div>
          <div id="works_dismantling" style="display: none">
          <div class="grid grid-cols-1 gap-2">
            ${dismantlingCat.items.map((item, idx) => {
              const getItemPrice = (i) => getDisplayWorkPrice(i);
              
              if (item.has_subitems && item.subitems) {
                return `
                  <div class="mt-3 mb-2">
                    <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onclick="toggleRoomContent('dismantling_sub_${idx}')">
                      <i class="fas ${item.icon || 'fa-folder'} text-brand-500"></i>
                      <span class="font-semibold text-sm flex-1">${item.name}</span>
                      <i class="fas fa-chevron-down text-xs transition-transform" id="dismantling_sub_${idx}Icon"></i>
                    </div>
                    <div class="ml-3 mt-2 space-y-2" id="dismantling_sub_${idx}" style="display: none">
                      ${item.subitems.map(subItem => {
                        const key = `dismantling_${subItem.id}`;
                        const isSelected = selectedItems.works.dismantling?.includes(key);
                        const qty = itemQuantities[key] || 1;
                        const displayPrice = getItemPrice(subItem);
                        const itemTotal = displayPrice * qty;
                        return `
                          <div class="calc-item dismantling-item ${isSelected ? 'selected' : ''}" 
                               data-key="${key}" data-cat="dismantling"
                               onclick="toggleCalcItem(this, '${key}', 'dismantling', 'works')">
                            <div class="calc-checkbox">
                              <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                              <div class="text-sm font-medium">${subItem.name}</div>
                              <div class="text-xs text-gray-500">
                                <span class="dismantling-price">${displayPrice.toLocaleString('ru-RU')} ₽</span>
                                <span class="text-gray-400"> / ${subItem.unit || dismantlingCat.unit || 'м²'}</span>
                              </div>
                            </div>
                            <div class="flex items-center gap-2">
                              <span class="dismantling-total bg-brand-500 text-white px-2 py-1 rounded-full text-xs font-medium">${itemTotal.toLocaleString('ru-RU')} ₽</span>
                              <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', -1)">−</button>
                              <input type="number" value="${qty}" min="1" max="50"
                                     class="qty-input" onchange="changeItemQty('${key}', 0, this.value)"
                                     onclick="event.stopPropagation()">
                              <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', 1)">+</button>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                `;
              } else {
                const key = `dismantling_${item.id}`;
                const isSelected = selectedItems.works.dismantling?.includes(key);
                const qty = itemQuantities[key] || 1;
                const displayPrice = getItemPrice(item);
                const itemTotal = displayPrice * qty;
                return `
                  <div class="calc-item dismantling-item ${isSelected ? 'selected' : ''}" 
                       data-key="${key}" data-cat="dismantling"
                       onclick="toggleCalcItem(this, '${key}', 'dismantling', 'works')">
                    <div class="calc-checkbox">
                      <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium">${item.name}</div>
                      <div class="text-xs text-gray-500">
                        <span class="dismantling-price">${displayPrice.toLocaleString('ru-RU')} ₽</span>
                        <span class="text-gray-400"> / ${item.unit || dismantlingCat.unit || 'м²'}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="dismantling-total bg-brand-500 text-white px-2 py-1 rounded-full text-xs font-medium">${itemTotal.toLocaleString('ru-RU')} ₽</span>
                      <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', -1)">−</button>
                      <input type="number" value="${qty}" min="1" max="50"
                             class="qty-input" onchange="changeItemQty('${key}', 0, this.value)"
                             onclick="event.stopPropagation()">
                      <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', 1)">+</button>
                    </div>
                  </div>
                `;
              }
            }).join('')}
          </div>
        </div></div>`;
        container.innerHTML += html;
      }
      
      console.log('=== AFTER DISMANTLING ===');
      
      // Installation works - stairs and railings from categories.finishing.subcategories.stairs
      const stairsNode = (typeof pricesData !== 'undefined' && pricesData) ? pricesData.works?.installation?.categories?.finishing?.subcategories?.stairs : null;
      if (stairsNode && stairsNode.subcategories) {
        let html = `<div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">`;
        html += `
          <div class="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors" onclick="toggleRoomContent('works_stairs')">
            <i class="fas fa-stairs text-brand-500"></i>
            <h4 class="font-bold flex-1">${stairsNode.name}</h4>
            <i class="fas fa-chevron-down text-xs transition-transform" id="works_stairsIcon" style="transform: rotate(-90deg)"></i>
          </div>
          <div id="works_stairs" style="display: none">
          <div class="grid grid-cols-1 gap-2">
        `;
        
        // Обходим основные категории (stair_install, stair_cladding, railing_install)
        Object.entries(stairsNode.subcategories).forEach(([mainKey, mainCat], mainIdx) => {
          html += `
            <div class="mt-3 mb-2">
              <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onclick="toggleRoomContent('stairs_main_${mainIdx}')">
                <i class="fas fa-layer-group text-brand-500"></i>
                <span class="font-semibold text-sm flex-1">${mainCat.name}</span>
                <i class="fas fa-chevron-down text-xs transition-transform" id="stairs_main_${mainIdx}Icon"></i>
              </div>
              <div class="ml-3 mt-2 space-y-2" id="stairs_main_${mainIdx}" style="display: none">
          `;
          
          // Обходим подкатегории (by_material, standard_size, etc. или porcelain, natural_stone, etc.)
          if (mainCat.subcategories) {
            Object.entries(mainCat.subcategories).forEach(([subKey, subCat], subIdx) => {
              // Если есть еще один уровень вложенности (например, by_material -> concrete, metal, wood)
              if (subCat.subcategories) {
                html += `
                  <div class="ml-3 mt-2 mb-2">
                    <div class="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onclick="toggleRoomContent('stairs_sub_${mainIdx}_${subIdx}')">
                      <i class="fas fa-folder text-xs"></i>
                      <span class="text-sm flex-1">${subCat.name}</span>
                      <i class="fas fa-chevron-down text-xs transition-transform" id="stairs_sub_${mainIdx}_${subIdx}Icon"></i>
                    </div>
                    <div class="ml-3 mt-2 space-y-2" id="stairs_sub_${mainIdx}_${subIdx}" style="display: none">
                `;
                
                // Обходим материалы (concrete, metal, wood, stone, composite)
                Object.entries(subCat.subcategories).forEach(([matKey, matCat], matIdx) => {
                  if (matCat.items && Array.isArray(matCat.items)) {
                    html += `
                      <div class="ml-3 mt-2 mb-2">
                        <div class="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" onclick="toggleRoomContent('stairs_mat_${mainIdx}_${subIdx}_${matIdx}')">
                          <i class="fas fa-list text-xs"></i>
                          <span class="text-xs flex-1">${matCat.name}</span>
                          <i class="fas fa-chevron-down text-xs transition-transform" id="stairs_mat_${mainIdx}_${subIdx}_${matIdx}Icon"></i>
                        </div>
                        <div class="ml-3 mt-2 space-y-2" id="stairs_mat_${mainIdx}_${subIdx}_${matIdx}" style="display: none">
                    `;
                    
                    // Рендерим работы
                    matCat.items.forEach(work => {
                      const key = `stairs_${work.id}`;
                      const isSelected = selectedItems.works.stairs?.includes(key);
                      const qty = itemQuantities[key] || 1;
                      const displayPrice = typeof getDisplayWorkPrice === 'function' ? getDisplayWorkPrice(work) : (work.min || 0);
                      const itemTotal = displayPrice * qty;
                      
                      html += `
                        <div class="calc-item ${isSelected ? 'selected' : ''}" 
                             data-key="${key}" data-cat="stairs"
                             onclick="toggleCalcItem(this, '${key}', 'stairs', 'works')">
                          <div class="calc-checkbox">
                            <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                          </div>
                          <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium">${work.name}</div>
                            <div class="text-xs text-gray-500">
                              <span>${displayPrice.toLocaleString('ru-RU')} ₽</span>
                              <span class="text-gray-400"> / ${work.unit || 'шт'}</span>
                            </div>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="bg-brand-500 text-white px-2 py-1 rounded-full text-xs font-medium">${itemTotal.toLocaleString('ru-RU')} ₽</span>
                            <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', -1)">−</button>
                            <input type="number" value="${qty}" min="1" max="50"
                                   class="qty-input" onchange="changeItemQty('${key}', 0, this.value)"
                                   onclick="event.stopPropagation()">
                            <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', 1)">+</button>
                          </div>
                        </div>
                      `;
                    });
                    
                    html += `
                        </div>
                      </div>
                    `;
                  }
                });
                
                html += `
                    </div>
                  </div>
                `;
              } else if (subCat.items && Array.isArray(subCat.items)) {
                // Если сразу есть items без дополнительной вложенности
                html += `
                  <div class="ml-3 mt-2 mb-2">
                    <div class="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onclick="toggleRoomContent('stairs_sub_${mainIdx}_${subIdx}')">
                      <i class="fas fa-list text-xs"></i>
                      <span class="text-sm flex-1">${subCat.name}</span>
                      <i class="fas fa-chevron-down text-xs transition-transform" id="stairs_sub_${mainIdx}_${subIdx}Icon"></i>
                    </div>
                    <div class="ml-3 mt-2 space-y-2" id="stairs_sub_${mainIdx}_${subIdx}" style="display: none">
                `;
                
                // Рендерим работы
                subCat.items.forEach(work => {
                  const key = `stairs_${work.id}`;
                  const isSelected = selectedItems.works.stairs?.includes(key);
                  const qty = itemQuantities[key] || 1;
                  const displayPrice = typeof getDisplayWorkPrice === 'function' ? getDisplayWorkPrice(work) : (work.min || 0);
                  const itemTotal = displayPrice * qty;
                  
                  html += `
                    <div class="calc-item ${isSelected ? 'selected' : ''}" 
                         data-key="${key}" data-cat="stairs"
                         onclick="toggleCalcItem(this, '${key}', 'stairs', 'works')">
                      <div class="calc-checkbox">
                        <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium">${work.name}</div>
                        <div class="text-xs text-gray-500">
                          <span>${displayPrice.toLocaleString('ru-RU')} ₽</span>
                          <span class="text-gray-400"> / ${work.unit || 'шт'}</span>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="bg-brand-500 text-white px-2 py-1 rounded-full text-xs font-medium">${itemTotal.toLocaleString('ru-RU')} ₽</span>
                        <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', -1)">−</button>
                        <input type="number" value="${qty}" min="1" max="50"
                               class="qty-input" onchange="changeItemQty('${key}', 0, this.value)"
                               onclick="event.stopPropagation()">
                        <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', 1)">+</button>
                      </div>
                    </div>
                  `;
                });
                
                html += `
                    </div>
                  </div>
                `;
              }
            });
          }
          
          html += `
              </div>
            </div>
          `;
        });
        
        html += `
          </div>
        </div></div>`;
        container.innerHTML += html;
      }
      
      // Electrical & Plumbing (per piece)
      for (const catId of ['electrical', 'plumbing']) {
        const cat = priceData.works[catId];
        if (!cat) continue;
        
        let applicableRooms = [];
        for (const [roomId, room] of Object.entries(priceData.rooms)) {
          if (room.is_wet && catId === 'plumbing') applicableRooms.push(roomId);
          if (!room.is_wet || catId === 'electrical') applicableRooms.push(roomId);
        }
        
        if (applicableRooms.length === 0) continue;
        
        let html = `<div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">`;
        html += `
          <div class="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors" onclick="toggleRoomContent('works_${catId}')">
            <i class="fas ${cat.icon} text-brand-500"></i>
            <h4 class="font-bold flex-1">${cat.name}</h4>
            <i class="fas fa-chevron-down text-xs transition-transform" id="works_${catId}Icon" style="transform: rotate(-90deg)"></i>
          </div>
<div id="works_${catId}" style="display: none">
          <div class="grid grid-cols-1 gap-2">
            ${cat.items.map(item => {
              const key = `${catId}_${item.id}`;
              const isSelected = selectedItems.works[catId]?.includes(key);
              const qty = itemQuantities[key] || 1;
              return `
                <div class="calc-item ${isSelected ? 'selected' : ''}" 
                     data-key="${key}" data-cat="${catId}"
                     onclick="toggleCalcItem(this, '${key}', '${catId}', 'works')">
                  <div class="calc-checkbox">
                    <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium">${item.name}</div>
                    <div class="text-xs text-gray-500">${item.min?.toLocaleString('ru-RU')} - ${item.max?.toLocaleString('ru-RU')} ₽/${item.unit || cat.unit || 'шт'}</div>
                  </div>
                  <div class="flex items-center gap-1">
                    <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', -1)">−</button>
                    <input type="number" value="${qty}" min="1" max="50"
                           class="qty-input" onchange="changeItemQty('${key}', 0, this.value)"
                           onclick="event.stopPropagation()">
                    <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', 1)">+</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div></div>`;
      }
      
      // Windows & Doors
      const doorCat = priceData.works.windows_doors;
      if (doorCat) {
        let html = `<div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">`;
        html += `
          <div class="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors" onclick="toggleRoomContent('works_windows_doors')">
            <i class="fas ${doorCat.icon} text-brand-500"></i>
            <h4 class="font-bold flex-1">${doorCat.name}</h4>
            <i class="fas fa-chevron-down text-xs transition-transform" id="works_windows_doorsIcon" style="transform: rotate(-90deg)"></i>
          </div>
          <div id="works_windows_doors" style="display: none">
          <div class="grid grid-cols-1 gap-2">
            ${doorCat.items.map(item => {
              const key = `doors_windows_${item.id}`;
              const isSelected = selectedItems.works.doors_windows?.includes(key);
              const qty = itemQuantities[key] || 1;
              return `
                <div class="calc-item ${isSelected ? 'selected' : ''}" 
                     data-key="${key}" data-cat="doors_windows"
                     onclick="toggleCalcItem(this, '${key}', 'doors_windows', 'works')">
                  <div class="calc-checkbox">
                    <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium">${item.name}</div>
                    <div class="text-xs text-gray-500">${item.min?.toLocaleString('ru-RU')} - ${item.max?.toLocaleString('ru-RU')} ₽</div>
                  </div>
                  <div class="flex items-center gap-1">
                    <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', -1)">−</button>
                    <input type="number" value="${qty}" min="1" max="20"
                           class="qty-input" onchange="changeItemQty('${key}', 0, this.value)"
                           onclick="event.stopPropagation()">
                    <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', 1)">+</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div></div>`;
        container.innerHTML += html;
      }
    }
    
    function renderWaterGroup(cat, keyPrefix, groupName, itemIds, icon) {
      const items = cat.items.filter(item => itemIds.includes(item.id));
      if (items.length === 0) return '';
      
      const groupId = keyPrefix + '_' + groupName.toLowerCase().replace(/[^а-яa-z0-9]/g, '_');
      let html = `
        <div class="ml-4 mt-3 mb-2">
          <div class="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors text-sm font-medium text-gray-600 dark:text-gray-400"
               onclick="toggleRoomContent('${groupId}')">
            <i class="fas ${icon || 'fa-pipe-section'} text-xs"></i>
            <span class="flex-1">${groupName}</span>
            <i class="fas fa-chevron-down text-xs transition-transform" id="${groupId}Icon" style="transform: rotate(-90deg)"></i>
          </div>
          <div id="${groupId}" class="pl-4" style="display: none;">
            <div class="grid grid-cols-1 gap-2 mt-2">
      `;
      
      items.forEach(item => {
        const key = `${keyPrefix}_${item.id}`;
        const isSelected = selectedItems.materials[keyPrefix]?.includes(key);
        const qty = itemQuantities[key] || 1;
        html += `
          <div class="calc-item ${isSelected ? 'selected' : ''}" 
               data-key="${key}" data-cat="${keyPrefix}" data-type="material"
               onclick="toggleCalcItem(this, '${key}', '${keyPrefix}', 'materials')">
            <div class="calc-checkbox">
              <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium">${item.name}</div>
              <div class="text-xs text-gray-500">${item.min?.toLocaleString('ru-RU')} - ${item.max?.toLocaleString('ru-RU')} ₽/${item.unit || cat.unit || 'шт'}</div>
            </div>
            <div class="price-badge">${getDisplayMaterialPrice(item).toLocaleString('ru-RU')} ₽</div>
            <div class="flex items-center gap-1">
              <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', -1)">−</button>
              <input type="number" value="${qty}" min="1" max="100"
                     class="qty-input" onchange="changeItemQty('${key}', 0, this.value)"
                     onclick="event.stopPropagation()">
              <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', 1)">+</button>
            </div>
          </div>
        `;
      });
      
      html += `
            </div>
          </div>
        </div>
      `;
      return html;
    }
    
    function renderMaterialsByRoom() {
      console.log('=== renderMaterialsByRoom START ===');
      const container = document.getElementById('materialsByRoom');
      if (!container) {
        console.log('materialsByRoom container not found - skipping render');
        return;
      }
      container.innerHTML = '';
      
      const surfaces = [
        {id: 'floor', name: 'Напольные покрытия', icon: 'fa-rug'},
        {id: 'walls', name: 'Для стен', icon: 'fa-brush'},
        {id: 'ceiling', name: 'Для потолков', icon: 'fa-angles-up'},
        {id: 'electrical', name: 'Электротовары', icon: 'fa-plug'},
        {id: 'doors_windows', name: 'Двери и окна', icon: 'fa-door-closed'}
      ];
      
      const roomCategories = ['living', 'nonliving'];
       
      for (const roomId of roomCategories) {
        const room = priceData.rooms[roomId];
        if (!room) continue;
        
        let data = typeof getEstimateRoomData === 'function'
          ? getEstimateRoomData(roomId)
          : roomData[roomId];
        
        // For rooms with has_room_type, calculate totals from livingRooms
        if (room.has_room_type && typeof getEstimateRoomData !== 'function' && ((data.livingRooms?.length || 0) > 0 || (data.floors?.length || 0) > 0)) {
          let totalFloorArea = 0;
          let totalWallsArea = 0;
          let totalCeilingArea = 0;
          let totalMatFloorArea = 0;
          let totalMatWallsArea = 0;
          let totalMatCeilingArea = 0;
          data.livingRooms.forEach(r => {
            totalFloorArea += getLivingRoomFloorArea(r);
            totalWallsArea += calculateLivingRoomWallsArea(r);
            totalCeilingArea += getLivingRoomCeilingArea(r);
            totalMatFloorArea += getLivingRoomMaterialFloorArea(r);
            totalMatWallsArea += getLivingRoomMaterialWallsArea(r);
            totalMatCeilingArea += getLivingRoomMaterialCeilingArea(r);
          });
          if (data.floors?.length > 0) {
            data.floors.forEach(floor => {
              (floor.livingRooms || []).forEach(r => {
                totalFloorArea += getLivingRoomFloorArea(r);
                totalWallsArea += calculateLivingRoomWallsArea(r);
                totalCeilingArea += getLivingRoomCeilingArea(r);
                totalMatFloorArea += getLivingRoomMaterialFloorArea(r);
                totalMatWallsArea += getLivingRoomMaterialWallsArea(r);
                totalMatCeilingArea += getLivingRoomMaterialCeilingArea(r);
              });
            });
          }
          data = { ...data, area: totalFloorArea, wallsArea: totalWallsArea, ceilingArea: totalCeilingArea, materialFloorArea: totalMatFloorArea, materialWallsArea: totalMatWallsArea, materialCeilingArea: totalMatCeilingArea };
        }
        
        let roomHtml = `<div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">`;
        roomHtml += `
          <div class="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors" onclick="toggleRoomContent('matRoom_${roomId}')">
            <i class="fas ${room.icon} text-brand-500"></i>
            <h4 class="font-bold flex-1">${room.name}</h4>
            <i class="fas fa-chevron-down text-xs transition-transform" id="matRoomIcon_${roomId}" style="transform: rotate(-90deg)"></i>
          </div>
          <div id="matRoom_${roomId}" style="display: none">
        `;
        
        for (const surface of surfaces) {
          console.log('=== SURFACE DEBUG ===', surface.id, surface.name);
          let categories = [];
          for (const [cId, cat] of Object.entries(priceData.materials)) {
            if (cat.applicable_surface === surface.id) {
              categories.push({cat, cId});
            }
          }
          
          if (categories.length === 0) continue;
          
          for (const {cat: catFound, cId: catId} of categories) {
          
          const surfaceArea = !data ? 0 : ((surface.id === 'electrical' || surface.id === 'doors_windows') ? 0 : (surface.id === 'floor' ? (data.materialFloorArea || data.area || 0) : (surface.id === 'ceiling' ? (data.materialCeilingArea || data.ceilingArea || data.area || 0) : (data.materialWallsArea || data.wallsArea || 0))));
          if (catFound.exclude_rooms && catFound.exclude_rooms.includes(roomId)) continue;
          
          const keyPrefix = `mat_${roomId}_${catId}`;
          const filteredItems = catFound.items.filter(item => {
            if (item.exclude_rooms && item.exclude_rooms.includes(roomId)) return false;
            if (roomId === 'bathroom') {
              const excludeFloorItems = ['laminate_32', 'laminate_33', 'laminate_34', 'vinyl_rigid', 'linoleum_stand', 'substrate_foam', 'parquet_oak', 'parquet_ash', 'parquet_premium', 'engineered_2layer', 'engineered_3layer', 'engineered_oak', 'quartz_click', 'quartz_glue', 'quartz_spc', 'quartz_substrate_group', 'quartz_glue_group', 'lam_31', 'lam_32', 'lam_33', 'lam_34', 'lam_substrate'];
              if (excludeFloorItems.includes(item.id)) return false;
            }
            return true;
          });
          
          if (filteredItems.length > 0) {
            // Не показывать площадь для электротоваров
            const showSurfaceInfo = surface.id !== 'electrical' && surface.id !== 'doors_windows';
            roomHtml += `
              <div class="category-section">
                <div class="category-title cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                     onclick="toggleRoomContent('matSurf_${roomId}_${catId}')">
                  <i class="fas ${catFound.icon || surface.icon}"></i>
                  ${catFound.name}
                  ${showSurfaceInfo ? `<span class="surface-info" id="mat_surface_${roomId}_${catId}">${Math.round(surfaceArea)} м²</span>` : ''}
                  <i class="fas fa-chevron-down text-xs transition-transform ml-2" id="matSurfIcon_${roomId}_${catId}" style="transform: rotate(-90deg)"></i>
                </div>
                <div id="matSurf_${roomId}_${catId}" style="display: none">
                  <div class="grid grid-cols-1 gap-2 mt-2">
                    ${filteredItems.map(item => {
                      console.log('Item processed:', item.id, item.name, 'subitems count:', item.subitems?.length);
                      if (item.id === 'laminate_group') {
                        console.log('LAMINATE GROUP FOUND! Items:', item.subitems?.map(s => ({id: s.id, name: s.name})));
                      }
              if (item.subitems) {
                console.log('=== RENDER SUBITEMS for:', item.id, item.name, 'subitems count:', item.subitems?.length);
                const subKeyPrefix = `${keyPrefix}_${item.id}`;
                  console.log('Rendering subitems for item.id=', item.id, 'keyPrefix=', keyPrefix);
                return `
                          <div class="col-span-1 sm:col-span-2 mt-2">
                            <div class="ml-3 mt-2 mb-2">
                              <div class="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors text-sm font-medium text-gray-600 dark:text-gray-400"
                                   onclick="toggleRoomContent('${subKeyPrefix}')">
                                <i class="fas ${item.icon || 'fa-layer-group'} text-xs"></i>
                                <span class="flex-1">${item.name}</span>
                                <i class="fas fa-chevron-down text-xs transition-transform" id="${subKeyPrefix}Icon" style="transform: rotate(-90deg)"></i>
                              </div>
                              <div id="${subKeyPrefix}" class="pl-4" style="display: none;">
                                <div class="grid grid-cols-1 gap-2 mt-2">
                                  ${item.subitems.map(subItem => {
                                    console.log('subItem.id=', subItem.id, 'name=', subItem.name);
                                    if (item.id === 'laminate_group') {
                                      console.log('Laminate subItem:', subItem.id, subItem.name, 'has_subitems:', subItem.has_subitems, 'subitems:', !!subItem.subitems);
                                    }
                                    const hasSubs = subItem.has_subitems || subItem.subitems;
                                    if (!hasSubs) {
                                      console.log('NOT GROUP:', subItem.id, subItem.name, subItem);
                                    }
                                    const hasSubItemsArray = subItem.subitems && Array.isArray(subItem.subitems);
                                    if (hasSubs && hasSubItemsArray) {
                                      const subSubKeyPrefix = `${subKeyPrefix}_${subItem.id}`;
                                      return `
                                        <div class="col-span-1 sm:col-span-2 mt-2">
                                          <div class="ml-3 mt-2 mb-2">
                                            <div class="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors text-sm font-medium text-gray-600 dark:text-gray-400"
                                                 onclick="toggleRoomContent('${subSubKeyPrefix}')">
                                              <i class="fas ${subItem.icon || 'fa-chevron-down'} text-xs"></i>
                                              <span class="flex-1">${subItem.name}</span>
                                              <i class="fas fa-chevron-down text-xs transition-transform" id="${subSubKeyPrefix}Icon" style="transform: rotate(-90deg)"></i>
                                            </div>
                                            <div id="${subSubKeyPrefix}" class="pl-4" style="display: none;">
                                              <div class="grid grid-cols-1 gap-2 mt-2">
                                                ${subItem.subitems.map(subSubItem => {
                                                  const subSubKey = `${subSubKeyPrefix}_${subSubItem.id}`;
                                                  const isSelected = selectedItems.materials[keyPrefix]?.includes(subSubKey);
                                                   const qty = itemQuantities[subSubKey] !== undefined ? itemQuantities[subSubKey] : 0;
                                                  const displayUnit = subSubItem.unit || catFound.unit || 'м²';
                                                  const consumption = subSubItem.consumption || 1;
                                                  const matPrice = getDisplayMaterialPrice(subSubItem);
                                                  
                                                  let area = 0;
                                                  const checkKey = subSubKey;
                                                  // Для электротоваров площадь не нужна
                                                  if (!checkKey.includes('electrical_materials')) {
                                                    if (checkKey.includes(`_${roomId}`)) {
                                                      const roomD = typeof getEstimateRoomData === 'function'
                                                        ? getEstimateRoomData(roomId)
                                                        : roomData[roomId];
                                                      if (roomD) {
                                                        // Определяем площадь по surface.id, а не по ключу
                                                        if (surface.id === 'ceiling') {
                                                          area = roomD.materialCeilingArea || roomD.ceilingArea || roomD.area || 0;
                                                        } else if (surface.id === 'floor') {
                                                          area = roomD.materialFloorArea || roomD.area || 0;
                                                        } else {
                                                          area = roomD.materialWallsArea || roomD.wallsArea || 0;
                                                        }
                                                      }
                                                    }
                                                  }
                                                  const baseCost = matPrice * area * consumption;
                                                  const extraCost = matPrice * qty;
                                                  const totalCost = baseCost + extraCost;
                                                  
                                                  return `
                                                    <div class="calc-item ${isSelected ? 'selected' : ''}" 
                                                         data-key="${subSubKey}" data-surface="${surface.id}" data-type="material"
                                                         onclick="toggleCalcItem(this, '${subSubKey}', '${keyPrefix}', 'materials')">
                                                      <div class="calc-checkbox">
                                                        <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                                                      </div>
                                                      <div class="flex-1 min-w-0">
                                                        <div class="text-sm font-medium">${subSubItem.name}</div>
                                                        <div class="text-xs text-gray-500">${subSubItem.min?.toLocaleString('ru-RU')} - ${subSubItem.max?.toLocaleString('ru-RU')} ₽/${displayUnit}</div>
                                                        <div class="flex items-center gap-2">
                                                          <span class="text-[10px] text-gray-400">Расход: ${consumption}</span>
                                                          <span class="text-[10px] text-orange-600 font-medium" id="total_${subSubKey}">${isSelected ? 'Итого: ' + totalCost.toLocaleString('ru-RU') + ' ₽' : ''}</span>
                                                        </div>
                                                      </div>
                                                      <div class="price-badge">${matPrice.toLocaleString('ru-RU')} ₽</div>
                                                      <div class="flex items-center gap-1">
                                                        <button class="qty-btn" onclick="event.stopPropagation(); event.preventDefault(); changeItemQty('${subSubKey}', -1, null, 20, true, true)">−</button>
                                                        <input type="number" value="${qty}" min="-10" max="20"
                                                               class="qty-input" onchange="changeItemQty('${subSubKey}', 0, this.value, 20, true, true)"
                                                               onclick="event.stopPropagation()">
                                                        <button class="qty-btn" onclick="event.stopPropagation(); event.preventDefault(); changeItemQty('${subSubKey}', 1, null, 20, true, true)">+</button>
                                                      </div>
                                                    </div>
                                                  `;
                                                }).join('')}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      `;
                                    } else if (subItem.has_subitems && !subItem.subitems) {
                                      // Item is marked as group but has no subitems (e.g., laminate class groups)
                                      const subSubKeyPrefix = `${subKeyPrefix}_${subItem.id}`;
                                      return `
                                        <div class="col-span-1 sm:col-span-2 mt-2">
                                          <div class="ml-3 mt-2 mb-2">
                                            <div class="flex items-center gap-2 p-2 rounded-lg text-sm font-medium text-gray-400 italic"
                                                 title="Выберите класс ламината">
                                              <i class="fas ${subItem.icon || 'fa-folder'} text-xs"></i>
                                              <span class="flex-1">${subItem.name}</span>
                                            </div>
                                          </div>
                                        </div>
                                      `;
                                    }
                                    
                                    const subKey = `${subKeyPrefix}_${subItem.id}`;
                                    const isSelected = selectedItems.materials[keyPrefix]?.includes(subKey);
                                    const qty = itemQuantities[subKey] !== undefined ? itemQuantities[subKey] : 0;
                                    const displayUnit = subItem.unit || catFound.unit || 'м²';
                                    const consumption = subItem.consumption || 1;
                                    const matPrice = getDisplayMaterialPrice(subItem);
                                    
                                    // Расчет стоимости
                                    let area = 0;
                                    const checkKey = subKey;
                                    // Для электротоваров площадь не нужна
                                    if (!checkKey.includes('electrical_materials')) {
                                      if (checkKey.includes(`_${roomId}`)) {
                                        const roomD = typeof getEstimateRoomData === 'function'
                                          ? getEstimateRoomData(roomId)
                                          : roomData[roomId];
                                        if (roomD) {
                                          // Определяем площадь по surface.id
                                          if (surface.id === 'ceiling') {
                                            area = roomD.materialCeilingArea || roomD.ceilingArea || roomD.area || 0;
                                          } else if (surface.id === 'floor') {
                                            area = roomD.materialFloorArea || roomD.area || 0;
                                          } else {
                                            area = roomD.materialWallsArea || roomD.wallsArea || 0;
                                          }
                                        }
                                      }
                                    }
                                    const baseCost = matPrice * area * consumption;
                                    const extraCost = matPrice * qty;
                                    const totalCost = baseCost + extraCost;
                                    
                                    return `
                                      <div class="calc-item ${isSelected ? 'selected' : ''}" 
                                           data-key="${subKey}" data-surface="${surface.id}" data-type="material"
                                           onclick="toggleCalcItem(this, '${subKey}', '${keyPrefix}', 'materials')">
                                        <div class="calc-checkbox">
                                          <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                          <div class="text-sm font-medium">${subItem.name}</div>
                                          <div class="text-xs text-gray-500">${subItem.min?.toLocaleString('ru-RU')} - ${subItem.max?.toLocaleString('ru-RU')} ₽/${displayUnit}</div>
                                          <div class="flex items-center gap-2">
                                            <span class="text-[10px] text-gray-400">Расход: ${consumption}</span>
                                            <span class="text-[10px] text-orange-600 font-medium" id="total_${subKey}">${isSelected ? 'Итого: ' + totalCost.toLocaleString('ru-RU') + ' ₽' : ''}</span>
                                          </div>
                                        </div>
                                        <div class="price-badge">${matPrice.toLocaleString('ru-RU')} ₽</div>
                                        <div class="flex items-center gap-1">
                                          <button class="qty-btn" onclick="event.stopPropagation(); event.preventDefault(); changeItemQty('${subKey}', -1, null, 20, true, true)">−</button>
                                          <input type="number" value="${qty}" min="-10" max="20"
                                                 class="qty-input" onchange="changeItemQty('${subKey}', 0, this.value, 20, true, true)"
                                                 onclick="event.stopPropagation()">
                                          <button class="qty-btn" onclick="event.stopPropagation(); event.preventDefault(); changeItemQty('${subKey}', 1, null, 20, true, true)">+</button>
                                        </div>
                                      </div>
                                    `;
                                  }).join('')}
                                </div>
                              </div>
                            </div>
                          </div>
                        `;
                      }
                      const key = `${keyPrefix}_${item.id}`;
                      const isSelected = selectedItems.materials[keyPrefix]?.includes(key);
                      // Для электротоваров по умолчанию 1, иначе 0
                      const qty = (typeof itemQuantities[key] === 'number' && isFinite(itemQuantities[key])) ? itemQuantities[key] : 0;
                      const displayUnit = item.unit || catFound.unit || 'м²';
                      const consumption = item.consumption || 1;
                      const matPrice = getDisplayMaterialPrice(item);
                      
                      // Расчет стоимости - для электротоваров площадь не нужна
                      let surfaceArea = 0;
                      if (!key.includes('electrical_materials') && !key.includes('doors_windows')) {
                        surfaceArea = (surface.id === 'walls') ? (data?.wallsArea || 0) : (data?.area || 0);
                      }
                      const baseCost = matPrice * surfaceArea * consumption;
                      const extraCost = matPrice * qty;
                      const totalCost = baseCost + extraCost;
                      
                      return `
                        <div class="calc-item ${isSelected ? 'selected' : ''}" 
                             data-key="${key}" data-surface="${surface.id}" data-type="material"
                             onclick="toggleCalcItem(this, '${key}', '${keyPrefix}', 'materials')">
                          <div class="calc-checkbox">
                            <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                          </div>
                          <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium">${item.name}</div>
                            <div class="text-xs text-gray-500">${item.min?.toLocaleString('ru-RU')} - ${item.max?.toLocaleString('ru-RU')} ₽/${displayUnit}</div>
                            <div class="flex items-center gap-2">
                              <span class="text-[10px] text-gray-400">Расход: ${consumption}</span>
                              <span class="text-[10px] text-orange-600 font-medium" id="total_${key}">${isSelected ? 'Итого: ' + totalCost.toLocaleString('ru-RU') + ' ₽' : ''}</span>
                            </div>
                          </div>
                          <div class="price-badge">${matPrice.toLocaleString('ru-RU')} ₽</div>
                          <div class="flex items-center gap-1">
                            <button class="qty-btn" onclick="event.stopPropagation(); event.preventDefault(); changeItemQty('${key}', -1, null, 20, true, true)">−</button>
                            <input type="number" value="${qty}" min="-10" max="20"
                                   class="qty-input" onchange="changeItemQty('${key}', 0, this.value, 20, true, true)"
                                   onclick="event.stopPropagation()">
                            <button class="qty-btn" onclick="event.stopPropagation(); event.preventDefault(); changeItemQty('${key}', 1, null, 20, true, true)">+</button>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>
            `;
          }
          }
        }
        
        // Plumbing materials (for kitchen only)
        if (roomId === 'kitchen') {
          const plumbCat = priceData.materials.plumbing_materials;
          if (plumbCat) {
            const plumbKeyPrefix = `plumb_${roomId}`;
            const filteredPlumbItems = plumbCat.items.filter(item => {
              return !['bath_steel', 'toilet_compact'].includes(item.id);
            });
            if (filteredPlumbItems.length > 0) {
              roomHtml += `
                <div class="category-section">
                  <div class="category-title cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                       onclick="toggleRoomContent('mat_${plumbKeyPrefix}')">
                    <i class="fas ${plumbCat.icon}"></i>
                    ${plumbCat.name}
                    <i class="fas fa-chevron-down text-xs transition-transform ml-2" id="mat_${plumbKeyPrefix}Icon" style="transform: rotate(-90deg)"></i>
                  </div>
                  <div id="mat_${plumbKeyPrefix}" style="display: none">
                    <div class="grid grid-cols-1 gap-2 mt-2">
                      ${filteredPlumbItems.map(item => {
                        const key = `${plumbKeyPrefix}_${item.id}`;
                        const isSelected = selectedItems.materials[plumbKeyPrefix]?.includes(key);
                        const qty = itemQuantities[key] || 1;
                        return `
                          <div class="calc-item ${isSelected ? 'selected' : ''}" 
                               data-key="${key}" data-cat="${plumbKeyPrefix}" data-type="material"
                               onclick="toggleCalcItem(this, '${key}', '${plumbKeyPrefix}', 'materials')">
                            <div class="calc-checkbox">
                              <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                              <div class="text-sm font-medium">${item.name}</div>
                              <div class="text-xs text-gray-500">${item.min?.toLocaleString('ru-RU')} - ${item.max?.toLocaleString('ru-RU')} ₽/${item.unit || plumbCat.unit || 'шт'}</div>
                            </div>
                            <div class="price-badge">${getDisplayMaterialPrice(item).toLocaleString('ru-RU')} ₽</div>
                            <div class="flex items-center gap-1">
                              <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', -1)">−</button>
                              <input type="number" value="${qty}" min="1" max="100"
                                     class="qty-input" onchange="changeItemQty('${key}', 0, this.value)"
                                     onclick="event.stopPropagation()">
                              <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', 1)">+</button>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                </div>
              `;
            }
          }
        }
        
        // Water filtration (for kitchen only)
        if (roomId === 'kitchen') {
          const waterFiltCat = priceData.materials.water_filtration;
          if (waterFiltCat) {
            const filtKeyPrefix = `water_filt_${roomId}`;
            roomHtml += `
              <div class="category-section">
                <div class="category-title cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                     onclick="toggleRoomContent('mat_${filtKeyPrefix}')">
                  <i class="fas ${waterFiltCat.icon}"></i>
                  ${waterFiltCat.name}
                  <i class="fas fa-chevron-down text-xs transition-transform ml-2" id="mat_${filtKeyPrefix}Icon" style="transform: rotate(-90deg)"></i>
                </div>
                <div id="mat_${filtKeyPrefix}" style="display: none">
                  <div class="grid grid-cols-1 gap-2 mt-2">
                    ${waterFiltCat.items.map(item => {
                      const key = `${filtKeyPrefix}_${item.id}`;
                      const isSelected = selectedItems.materials[filtKeyPrefix]?.includes(key);
                      const qty = itemQuantities[key] || 1;
                      return `
                        <div class="calc-item ${isSelected ? 'selected' : ''}" 
                             data-key="${key}" data-cat="${filtKeyPrefix}" data-type="material"
                             onclick="toggleCalcItem(this, '${key}', '${filtKeyPrefix}', 'materials')">
                          <div class="calc-checkbox">
                            <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                          </div>
                          <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium">${item.name}</div>
                            <div class="text-xs text-gray-500">${item.min?.toLocaleString('ru-RU')} - ${item.max?.toLocaleString('ru-RU')} ₽/${item.unit || waterFiltCat.unit || 'шт'}</div>
                          </div>
                          <div class="price-badge">${getDisplayMaterialPrice(item).toLocaleString('ru-RU')} ₽</div>
                          <div class="flex items-center gap-1">
                            <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', -1)">−</button>
                            <input type="number" value="${qty}" min="1" max="100"
                                   class="qty-input" onchange="changeItemQty('${key}', 0, this.value)"
                                   onclick="event.stopPropagation()">
                            <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', 1)">+</button>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>
            `;
          }
        }
        
        // Plumbing materials (for bathroom only)
        if (roomId === 'bathroom') {
          const plumbCat = priceData.materials.plumbing_materials;
          if (plumbCat) {
            const plumbKeyPrefix = `bath_plumb_${roomId}`;
            const filteredPlumbItems = plumbCat.items.filter(item => {
              return ['bath_steel', 'shower_cabin', 'toilet_compact', 'mixer_standard', 'mixer_quality', 'boiler_50', 'toilet_installation'].includes(item.id);
            });
            if (filteredPlumbItems.length > 0) {
              roomHtml += `
                <div class="category-section">
                  <div class="category-title cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                       onclick="toggleRoomContent('mat_${plumbKeyPrefix}')">
                    <i class="fas ${plumbCat.icon}"></i>
                    ${plumbCat.name}
                    <i class="fas fa-chevron-down text-xs transition-transform ml-2" id="mat_${plumbKeyPrefix}Icon" style="transform: rotate(-90deg)"></i>
                  </div>
                  <div id="mat_${plumbKeyPrefix}" style="display: none">
                    <div class="grid grid-cols-1 gap-2 mt-2">
                      ${filteredPlumbItems.map(item => {
                        const key = `${plumbKeyPrefix}_${item.id}`;
                        const isSelected = selectedItems.materials[plumbKeyPrefix]?.includes(key);
                        const qty = itemQuantities[key] || 1;
                        return `
                          <div class="calc-item ${isSelected ? 'selected' : ''}" 
                               data-key="${key}" data-cat="${plumbKeyPrefix}" data-type="material"
                               onclick="toggleCalcItem(this, '${key}', '${plumbKeyPrefix}', 'materials')">
                            <div class="calc-checkbox">
                              <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                              <div class="text-sm font-medium">${item.name}</div>
                              <div class="text-xs text-gray-500">${item.min?.toLocaleString('ru-RU')} - ${item.max?.toLocaleString('ru-RU')} ₽/${item.unit || plumbCat.unit || 'шт'}</div>
                            </div>
                            <div class="price-badge">${getDisplayMaterialPrice(item).toLocaleString('ru-RU')} ₽</div>
                            <div class="flex items-center gap-1">
                              <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', -1)">−</button>
                              <input type="number" value="${qty}" min="1" max="100"
                                     class="qty-input" onchange="changeItemQty('${key}', 0, this.value)"
                                     onclick="event.stopPropagation()">
                              <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', 1)">+</button>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                </div>
              `;
            }
          }
        }
        
        // Water supply (for kitchen and bathroom)
        if (roomId === 'kitchen' || roomId === 'bathroom') {
          const waterCat = priceData.materials.water_supply;
          if (waterCat) {
            const waterKeyPrefix = `water_${roomId}`;
            const pipes = ['rehau_stabil_16', 'rehau_20', 'rehau_25'];
            const valves = ['valve_bugatti_straight', 'valve_bugatti_corner', 'valve_bugatti_3way'];
            const filters = ['filter_gvs', 'filter_hvs', 'filter_coarse'];
            const instruments = ['manometer_radial', 'manometer_axial'];
            const sewage = ['pipe_sewage_noise', 'pipe_sewage_50', 'pipe_sewage_40', 'pipe_sewage_32', 'elbow_noise_110', 'elbow_sewage_50', 'elbow_sewage_40', 'elbow_sewage_32', 'tee_noise_110', 'tee_sewage_50', 'tee_sewage_40', 'tee_sewage_32'];
            const fittings = ['tee_rehau_25', 'eurocone', 'angle_90', 'adapter_vtm', 'coupling_vtm', 'collector_6', 'collector_5'];
            const safety = ['reducer_membrane', 'reducer_piston'];
            
            roomHtml += `
              <div class="category-section">
                <div class="category-title cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors" onclick="toggleRoomContent('mat_${waterKeyPrefix}')">
                  <i class="fas ${waterCat.icon}"></i>
                  ${waterCat.name}
                  <i class="fas fa-chevron-down text-xs transition-transform ml-2" id="mat_${waterKeyPrefix}Icon" style="transform: rotate(-90deg)"></i>
                </div>
                <div id="mat_${waterKeyPrefix}" style="display: none">
                
                ${renderWaterGroup(waterCat, waterKeyPrefix, 'Трубопровод', pipes, 'fa-pipe-section')}
                ${renderWaterGroup(waterCat, waterKeyPrefix, 'Запорно-регулирующая арматура', valves, 'fa-valve')}
                ${renderWaterGroup(waterCat, waterKeyPrefix, 'Магистральные фильтры', filters, 'fa-filter')}
                ${renderWaterGroup(waterCat, waterKeyPrefix, 'Контрольно-измерительные приборы', instruments, 'fa-gauge')}
                ${renderWaterGroup(waterCat, waterKeyPrefix, 'Канализация', sewage, 'fa-drain')}
                ${renderWaterGroup(waterCat, waterKeyPrefix, 'Фитинги и коллекторы', fittings, 'fa-link')}
                ${renderWaterGroup(waterCat, waterKeyPrefix, 'Предохранительная арматура', safety, 'fa-shield-alt')}
                
                </div></div>
            `;
          }
        }
        
        // Heating equipment (for living and kitchen)
        if (roomId === 'living' || roomId === 'kitchen') {
          const heatCat = priceData.materials.heating_equipment;
          if (heatCat) {
            const heatKeyPrefix = `heat_${roomId}`;
            roomHtml += `
              <div class="category-section">
                <div class="category-title cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                     onclick="toggleRoomContent('mat_${heatKeyPrefix}')">
                  <i class="fas ${heatCat.icon}"></i>
                  ${heatCat.name}
                  <i class="fas fa-chevron-down text-xs transition-transform ml-2" id="mat_${heatKeyPrefix}Icon" style="transform: rotate(-90deg)"></i>
                </div>
                <div id="mat_${heatKeyPrefix}" style="display: none">
                  ${heatCat.items.map(areaItem => {
                    if (!areaItem.subitems) return '';
                    const areaKey = `${heatKeyPrefix}_${areaItem.id}`;
                    return `
                      <div class="ml-3 mt-3 mb-2">
                        <div class="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors text-sm font-medium text-gray-600 dark:text-gray-400"
                             onclick="toggleRoomContent('${areaKey}')">
                          <span class="mobile-nested-icons md:hidden flex items-center gap-0.5 mr-1">
                            <i class="fas ${heatCat.icon} text-[10px] opacity-40"></i>
                            <i class="fas fa-chevron-right text-[8px] opacity-40"></i>
                          </span>
                          <i class="fas ${areaItem.icon || 'fa-temperature-high'} text-xs"></i>
                          <span class="flex-1">${areaItem.name}</span>
                          <i class="fas fa-chevron-down text-xs transition-transform" id="${areaKey}Icon" style="transform: rotate(-90deg)"></i>
                        </div>
                        <div id="${areaKey}" class="pl-4" style="display: none;">
                          ${areaItem.subitems.map(connItem => {
                            const connKey = `${areaKey}_${connItem.id}`;
                            if (connItem.subitems) {
                              return `
                                <div class="ml-3 mt-2 mb-2">
                                  <div class="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors text-sm font-medium text-gray-500 dark:text-gray-400"
                                       onclick="toggleRoomContent('${connKey}')">
                                    <span class="mobile-nested-icons md:hidden flex items-center gap-0.5 mr-1">
                                      <i class="fas ${areaItem.icon || 'fa-temperature-high'} text-[10px] opacity-40"></i>
                                      <i class="fas fa-chevron-right text-[8px] opacity-40"></i>
                                    </span>
                                    <i class="fas ${connItem.icon || 'fa-link'} text-xs"></i>
                                    <span class="flex-1">${connItem.name}</span>
                                    <i class="fas fa-chevron-down text-xs transition-transform" id="${connKey}Icon" style="transform: rotate(-90deg)"></i>
                                  </div>
                                  <div id="${connKey}" class="pl-4" style="display: none;">
                                    <div class="grid grid-cols-1 gap-2 mt-2">
                                      ${connItem.subitems.map(radItem => {
                                        const key = `${connKey}_${radItem.id}`;
                                        const isSelected = selectedItems.materials[heatKeyPrefix]?.includes(key);
                                        const qty = itemQuantities[key] || 1;
                                        return `
                                          <div class="calc-item ${isSelected ? 'selected' : ''}" 
                                               data-key="${key}" data-cat="${heatKeyPrefix}" data-type="material"
                                               onclick="toggleCalcItem(this, '${key}', '${heatKeyPrefix}', 'materials')">
                                            <div class="calc-checkbox">
                                              <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                              <div class="text-sm font-medium">${radItem.name}</div>
                                              <div class="text-xs text-gray-500">${radItem.min?.toLocaleString('ru-RU')} - ${radItem.max?.toLocaleString('ru-RU')} ₽</div>
                                            </div>
                                            <div class="price-badge">${getDisplayMaterialPrice(radItem).toLocaleString('ru-RU')} ₽</div>
                                            <div class="flex items-center gap-1">
                                              <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', -1)">−</button>
                                              <input type="number" value="${qty}" min="1" max="100"
                                                     class="qty-input" onchange="changeItemQty('${key}', 0, this.value)"
                                                     onclick="event.stopPropagation()">
                                              <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', 1)">+</button>
                                            </div>
                                          </div>
                                        `;
                                      }).join('')}
                                    </div>
                                  </div>
                                </div>
                              `;
                            } else {
                              const isSelected = selectedItems.materials[heatKeyPrefix]?.includes(connKey);
                              const qty = itemQuantities[connKey] || 1;
                              return `
                                <div class="calc-item ${isSelected ? 'selected' : ''}" 
                                     data-key="${connKey}" data-cat="${heatKeyPrefix}" data-type="material"
                                     onclick="toggleCalcItem(this, '${connKey}', '${heatKeyPrefix}', 'materials')">
                                  <div class="calc-checkbox">
                                    <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                                  </div>
                                  <div class="flex-1 min-w-0">
                                    <div class="text-sm font-medium">${connItem.name}</div>
                                    <div class="text-xs text-gray-500">${connItem.min?.toLocaleString('ru-RU')} - ${connItem.max?.toLocaleString('ru-RU')} ₽</div>
                                  </div>
                                  <div class="price-badge">${getDisplayMaterialPrice(connItem).toLocaleString('ru-RU')} ₽</div>
                                  <div class="flex items-center gap-1">
                                    <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${connKey}', -1)">−</button>
                                    <input type="number" value="${qty}" min="1" max="100"
                                           class="qty-input" onchange="changeItemQty('${connKey}', 0, this.value)"
                                           onclick="event.stopPropagation()">
                                    <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${connKey}', 1)">+</button>
                                  </div>
                                </div>
                              `;
                            }
                          }).join('')}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }
        }
        
        roomHtml += `</div></div>`;
        container.innerHTML += roomHtml;
      }
    }
    
    function renderAdditionalServices() {
      const container = document.getElementById('additionalServices');
      container.innerHTML = '';
      
      for (const [catId, cat] of Object.entries(priceData.additional_services)) {
        container.innerHTML += `
          <div class="grid grid-cols-1 gap-2">
            ${cat.items.map(item => {
              const key = `add_${item.id}`;
              const isSelected = selectedItems.additional[catId]?.includes(key);
              const qty = itemQuantities[key] || 1;
              return `
                <div class="calc-item ${isSelected ? 'selected' : ''}" 
                     data-key="${key}" data-cat="${catId}"
                     onclick="toggleCalcItem(this, '${key}', '${catId}', 'additional')">
                  <div class="calc-checkbox">
                    <i class="fas fa-check text-xs ${isSelected ? '' : 'hidden'}"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium">${item.name}</div>
                    <div class="text-xs text-gray-500">${item.min?.toLocaleString('ru-RU')} - ${item.max?.toLocaleString('ru-RU')} ₽</div>
                  </div>
                  <div class="flex items-center gap-1">
                    <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', -1)">−</button>
                    <input type="number" value="${qty}" min="1" max="50"
                           class="qty-input" onchange="changeItemQty('${key}', 0, this.value)"
                           onclick="event.stopPropagation()">
                    <button class="qty-btn" onclick="event.stopPropagation(); changeItemQty('${key}', 1)">+</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    }
