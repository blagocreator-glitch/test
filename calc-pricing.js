// Module: calc-pricing.js
    function formatSidebarMoney(value) {
      const rounded = Math.round(Number(value) || 0);
      return `${rounded.toLocaleString('ru-RU')} ₽`;
    }

    function toggleCalcItem(element, key, catId, type) {
      if (!selectedItems[type]) selectedItems[type] = {};
      
      // Для электротоваров и дверей/окон catId должен быть правильным, а не полный keyPrefix
      let effectiveCatId = catId;
      if (type === 'materials') {
        if (key.includes('electrical_materials')) {
          effectiveCatId = 'electrical_materials';
        } else if (key.includes('doors_windows')) {
          effectiveCatId = 'doors_windows';
        } else if (key.includes('doors_windows')) {
          effectiveCatId = 'doors_windows';
        }
      }
      
      if (!selectedItems[type][effectiveCatId]) selectedItems[type][effectiveCatId] = [];
      
      element.classList.toggle('selected');
      const icon = element.querySelector('.fa-check');
      if (icon) icon.classList.toggle('hidden');
      
      const idx = selectedItems[type][effectiveCatId].indexOf(key);
      if (idx > -1) {
        selectedItems[type][effectiveCatId].splice(idx, 1);
        // Сброс количества для электротоваров
        if (type === 'materials' && (key.includes('electrical_materials') || key.includes('doors_windows'))) {
          itemQuantities[key] = 0;
          const qtyInput = element.querySelector('.qty-input');
          if (qtyInput) qtyInput.value = 0;
        }
        // Сброс количества и итога для демонтажных работ
        if (type === 'works' && key.startsWith('dismantling_')) {
          itemQuantities[key] = 1;
          const displayPrice = getDisplayWorkPrice(findPriceItem(key, 'works'));
          const itemTotal = displayPrice * 1;
          const qtyInput = element.querySelector('.qty-input');
          if (qtyInput) qtyInput.value = 1;
          const totalEl = element.querySelector('.dismantling-total');
          if (totalEl) {
            totalEl.textContent = itemTotal.toLocaleString('ru-RU') + ' ₽';
          }
        }
      } else {
        selectedItems[type][effectiveCatId].push(key);
        // Ensure we have a sensible default quantity for area-based materials
        // This helps avoid 0 cost when the item is selected but no explicit quantity was set yet.
        // We apply this heuristic mainly to materials related to glue, wallpaper, and electrical.
        if (type === 'materials' && (key.includes('glue') || key.includes('wallpaper') || key.includes('electrical_materials') || key.includes('doors_windows'))) {
          if (itemQuantities[key] === undefined || itemQuantities[key] === 0) {
            itemQuantities[key] = 1;
            const qtyInput = element.querySelector('.qty-input');
            if (qtyInput) qtyInput.value = 1;
          }
        }
      }
      
      // Обновление Итого для материалов (гидроизоляция и обычные) при переключении
      if (key.includes('waterproofing') || key.startsWith('mat_')) {
        const totalEl = document.getElementById(`total_${key}`);
        if (totalEl) {
          const item = findPriceItem(key, 'materials');
          if (item) {
            const isSelected = selectedItems[type][effectiveCatId]?.includes(key);
            if (isSelected) {
              const matPrice = getDisplayMaterialPrice(item);
              const consumption = item.consumption || 1;
              // Для электротоваров qty по умолчанию 1, для остальных 0
              const qty = (key.includes('electrical_materials') || key.includes('doors_windows')) ? (itemQuantities[key] || 1) : ((typeof itemQuantities[key] === 'number' && isFinite(itemQuantities[key])) ? itemQuantities[key] : 0);
              
              let area = 0;
              if (key.includes('waterproofing')) {
                for (const roomId of Object.keys(roomData)) {
                  const roomD = getEstimateRoomData(roomId);
                  if (key.includes(`_${roomId}_`) || key.includes(`_${roomId}`)) {
                    if (key.includes('wall')) {
                      area = roomD.materialWallsArea || roomD.wallsArea || 0;
                    } else if (key.includes('ceiling')) {
                      area = roomD.materialCeilingArea || roomD.ceilingArea || roomD.area || 0;
                    } else {
                      area = roomD.materialFloorArea || roomD.area || 0;
                    }
                    break;
                  }
                }
              } else {
                // Для обычных материалов
                const parts = key.split('_');
                if (parts.length >= 3) {
                  const roomId = parts[1];
                  const surface = parts[2];
                  
                  // Электротовары и двери/окна - только поштучно, без площади
                  if (key.includes('electrical_materials') || key.includes('doors_windows')) {
                    area = 0;
                  } else {
                    const roomD = getEstimateRoomData(roomId);
                    if (roomD) {
                      // Определяем площадь по surface
                      if (surface === 'ceiling' || surface === 'floor') {
                        area = surface === 'ceiling'
                          ? (roomD.materialCeilingArea || roomD.ceilingArea || roomD.area || 0)
                          : (roomD.materialFloorArea || roomD.area || 0);
                      } else {
                        area = roomD.materialWallsArea || roomD.wallsArea || 0;
                      }
                    }
                  }
                }
              }
              
              const baseCost = matPrice * area * consumption;
              const extraCost = matPrice * qty;
              const totalCost = baseCost + extraCost;
              // Ensure we never display NaN; fall back to baseCost if totalCost is invalid
              const displayTotal = Number.isFinite(totalCost) ? totalCost : baseCost;
              console.log('DEBUG toggleCalcItem MATERIAL total:', { key, matPrice, consumption, qty, area, baseCost, extraCost, totalCost: displayTotal });
              totalEl.textContent = `Итого: ${displayTotal.toLocaleString('ru-RU')} ₽`;
            } else {
              totalEl.textContent = '';
            }
          }
        }
      }
      
      updateDetailedCalc();
    }
    
    function changeItemQty(key, delta, newVal = null, maxVal = 100, allowZero = false, allowNegative = false) {
      const minVal = allowNegative ? -10 : (allowZero ? 0 : 1);
      if (newVal !== null) {
        itemQuantities[key] = Math.max(minVal, Math.min(maxVal, parseInt(newVal) || minVal));
      } else {
        const current = itemQuantities[key];
        const startVal = (current === undefined || current === null) ? 0 : current;
        const newQty = startVal + delta;
        itemQuantities[key] = Math.max(minVal, Math.min(maxVal, newQty));
      }
      
      const element = document.querySelector(`[data-key="${key}"]`);
      if (element) {
        const qtyInput = element.querySelector('.qty-input');
        if (qtyInput) qtyInput.value = itemQuantities[key];
        
        // Update dismantling item total
        if (element.classList.contains('dismantling-item')) {
          const item = findPriceItem(key, 'works');
          if (item) {
            const displayPrice = getDisplayWorkPrice(item);
            const qty = itemQuantities[key] || 1;
            const itemTotal = displayPrice * qty;
            const totalEl = element.querySelector('.dismantling-total');
            if (totalEl) {
              totalEl.textContent = itemTotal.toLocaleString('ru-RU') + ' ₽';
            }
            const priceEl = element.querySelector('.dismantling-price');
            if (priceEl) {
              priceEl.textContent = displayPrice.toLocaleString('ru-RU') + ' ₽';
            }
          }
        }
      }
      
      // Обновление итога для материалов (гидроизоляция и обычные)
      if (key.includes('waterproofing') || key.startsWith('mat_')) {
        const totalEl = document.getElementById(`total_${key}`);
        if (totalEl) {
          const item = findPriceItem(key, 'materials');
          if (item) {
            // Всегда показывать итог, если элемент выбран (не скрывать при изменении qty)
            let isSelected = false;
            for (const [catId, keys] of Object.entries(selectedItems.materials)) {
              if (keys && keys.includes(key)) {
                isSelected = true;
                break;
              }
            }
            
              if (isSelected) {
              const matPrice = getDisplayMaterialPrice(item);
              const consumption = item.consumption || 1;
              // Для электротоваров по умолчанию 1
              const qty = (key.includes('electrical_materials') || key.includes('doors_windows')) ? (itemQuantities[key] || 1) : (itemQuantities[key] || 0);
              
              // Найти площадь комнаты
              let area = 0;
              if (key.includes('waterproofing')) {
                const parts = key.split('_');
                const roomId = parts[1];
                const roomD = getEstimateRoomData(roomId);
                if (roomD) {
                  if (key.includes('wall')) {
                    area = roomD.materialWallsArea || roomD.wallsArea || 0;
                  } else if (key.includes('ceiling')) {
                    area = roomD.materialCeilingArea || roomD.ceilingArea || roomD.area || 0;
                  } else {
                    area = roomD.materialFloorArea || roomD.area || 0;
                  }
                }
              } else {
                // Для обычных материалов - определить поверхность из ключа
                const parts = key.split('_');
                if (parts.length >= 3) {
                  const roomId = parts[1];
                  const surface = parts[2];
                  
                  // Электротовары и двери/окна - только поштучно, без площади
                  if (key.includes('electrical_materials') || key.includes('doors_windows')) {
                    area = 0;
                  } else {
                    const roomD = getEstimateRoomData(roomId);
                    if (roomD) {
                      // Определяем площадь по surface
                      if (surface === 'ceiling' || surface === 'floor') {
                        area = surface === 'ceiling'
                          ? (roomD.materialCeilingArea || roomD.ceilingArea || roomD.area || 0)
                          : (roomD.materialFloorArea || roomD.area || 0);
                      } else {
                        area = roomD.materialWallsArea || roomD.wallsArea || 0;
                      }
                    }
                  }
                }
              }
              
              const baseCost = matPrice * area * consumption;
              const extraCost = matPrice * qty;
              const totalCost = baseCost + extraCost;
              totalEl.textContent = `Итого: ${totalCost.toLocaleString('ru-RU')} ₽`;
            } else {
              totalEl.textContent = '';
            }
          }
        }
      }
      
      updateDetailedCalc();
    }
    
    function findPriceItem(key, type) {
      if (!priceData) return null;
      
      const parts = key.split('_');
      let itemId, category;
      
      if (type === 'works') {
        if (key.startsWith('works_')) {
          const surface = parts[2];
          const surfaceMap = {
            'floor': 'flooring',
            'walls': 'walls',
            'ceiling': 'ceiling'
          };
          category = priceData.works?.[surfaceMap[surface]];
          itemId = parts.slice(3).join('_');
        } else if (key.startsWith('electrical_')) {
          category = priceData.works?.electrical;
          itemId = key.replace('electrical_', '');
        } else if (key.startsWith('plumbing_')) {
          category = priceData.works?.plumbing;
          itemId = key.replace('plumbing_', '');
        } else if (key.startsWith('doors_windows_')) {
          category = priceData.works?.windows_doors;
          itemId = key.replace('doors_windows_', '');
        } else if (key.startsWith('dismantling_')) {
          category = priceData.works?.dismantling;
          itemId = key.replace('dismantling_', '');
          if (category) {
            for (const item of category.items || []) {
              if (item.subitems) {
                for (const subItem of item.subitems) {
                  if (subItem.id === itemId) {
                    return { ...subItem, parentName: item.name, parentIcon: item.icon };
                  }
                }
              } else if (item.id === itemId) {
                return { ...item };
              }
            }
          }
        } else {
          category = priceData.works?.[parts[0]];
          itemId = parts.slice(1).join('_');
        }
      } else if (type === 'materials') {
        if (key.startsWith('mat_') && key.includes('waterproofing')) {
          category = priceData.materials?.waterproofing;
          if (category) {
            for (const item of category.items || []) {
              if (item.subitems) {
                for (const subItem of item.subitems) {
                  if (key.endsWith('_' + subItem.id)) {
                    return { ...subItem, parentName: item.name, parentIcon: item.icon };
                  }
                }
              }
            }
          }
          itemId = key;
        } else if (key.startsWith('mat_')) {
          // Для электротоваров и дверей/окон ищем по ключу
          let surface = parts[2];
          if (key.includes('electrical_materials')) {
            surface = 'electrical_materials';
          } else if (key.includes('doors_windows')) {
            surface = 'doors_windows';
          }
          const surfaceMap = {
            'flooring': 'flooring',
            'walls': 'walls_materials',
            'wallpapers': 'walls_materials',
            'paints': 'walls_materials',
            'plaster_group': 'walls_materials',
            'tile_walls': 'walls_materials',
            'brick_wall': 'walls_materials',
            'decorative': 'walls_materials',
            'walls_materials': 'walls_materials',
            'ceiling': 'ceiling_materials',
            'ceiling_materials': 'ceiling_materials',
            'glue': 'walls_materials',
            'wallpaper_glue': 'walls_materials',
            'electrical_materials': 'electrical_materials',
            'doors_windows': 'doors_windows'
          };
          category = priceData.materials?.[surfaceMap[surface]];
          
          // Поиск в подкатегориях (до 4 уровней вложенности для ламината и кварцвинила)
          if (category && category.items) {
            for (const item of category.items) {
              if (item.subitems) {
                // Pass 1: search deepest levels first (subSubSubItem and subSubItem)
                // across ALL subItems before checking subItem level.
                // This prevents a subItem.id that is a suffix of a deeper item's id
                // from being matched prematurely (e.g. 'wallpaper_fleece' matching
                // a key meant for 'glue_wallpaper_fleece').
                for (const subItem of item.subitems) {
                  if (subItem.subitems) {
                    for (const subSubItem of subItem.subitems) {
                      if (subSubItem.subitems) {
                        for (const subSubSubItem of subSubItem.subitems) {
                          if (key.endsWith('_' + subSubSubItem.id)) {
                            return { ...subSubSubItem, parentName: subSubItem.name, parentIcon: subSubItem.icon };
                          }
                        }
                      }
                      if (key.endsWith('_' + subSubItem.id)) {
                        return { ...subSubItem, parentName: subItem.name, parentIcon: subItem.icon };
                      }
                    }
                  }
                }
                // Pass 2: only after all deeper levels have been checked, match subItem level
                for (const subItem of item.subitems) {
                  if (key.endsWith('_' + subItem.id)) {
                    return { ...subItem, parentName: item.name, parentIcon: item.icon };
                  }
                }
              }
            }
          }
          
          // Для электротоваров и дверей/окон - правильный парсинг id
          if (key.includes('electrical_materials')) {
            itemId = key.replace(/^mat_\w+_electrical_materials_/, '');
          } else if (key.includes('doors_windows')) {
            itemId = key.replace(/^mat_\w+_doors_windows_/, '');
          } else {
            itemId = parts.slice(3).join('_');
          }
        } else if (key.startsWith('plumb_')) {
          category = priceData.materials?.plumbing_materials;
          const idx = key.indexOf('_', 6);
          itemId = idx > -1 ? key.substring(idx + 1) : key.substring(6);
        } else if (key.startsWith('bath_plumb_')) {
          category = priceData.materials?.plumbing_materials;
          const parts = key.split('_');
          itemId = parts.slice(3).join('_');
        } else if (key.startsWith('water_')) {
          category = priceData.materials?.water_supply;
          const parts = key.split('_');
          itemId = parts.slice(2).join('_');
        } else if (key.startsWith('doors_')) {
          category = priceData.materials?.doors_windows;
          const idx = key.indexOf('_', 6);
          itemId = idx > -1 ? key.substring(idx + 1) : key.substring(6);
        } else if (key.startsWith('doors_windows_')) {
          category = priceData.materials?.doors_windows;
          itemId = key.replace('doors_windows_', '');
        } else if (key.startsWith('heat_')) {
          category = priceData.materials?.heating_equipment;
          itemId = key;
        } else if (key.startsWith('water_filt_')) {
          category = priceData.materials?.water_filtration;
          const idx = key.indexOf('_', 10);
          itemId = idx > -1 ? key.substring(idx + 1) : key.substring(10);
        } else {
          category = priceData.materials?.[parts[0]];
          itemId = parts.slice(1).join('_');
        }
      } else {
        if (key.startsWith('add_')) {
          category = priceData.additional_services?.furniture_assembly;
          itemId = key.replace('add_', '');
        } else if (key.startsWith('clean_')) {
          category = priceData.additional_services?.cleaning;
          itemId = key.replace('clean_', '');
        } else if (key.startsWith('disposal_')) {
          category = priceData.additional_services?.disposal;
          itemId = key.replace('disposal_', '');
        } else {
          category = priceData.additional_services?.[parts[0]];
          itemId = parts.slice(1).join('_');
        }
      }
      
      return category?.items?.find(i => i.id === itemId);
    }
    
    function findHeatingItem(key) {
      if (!priceData?.materials?.heating_equipment) return null;
      
      const heatCat = priceData.materials.heating_equipment;
      const parts = key.split('_');
      
      for (const areaItem of heatCat.items || []) {
        if (areaItem.subitems) {
          for (const connItem of areaItem.subitems || []) {
            if (connItem.subitems) {
              const found = connItem.subitems.find(i => key.endsWith('_' + i.id));
              if (found) return found;
            } else {
              if (key.endsWith('_' + connItem.id)) return connItem;
            }
          }
        }
      }
      return null;
    }
    
    function getDisplayWorkPrice(item) {
      const avgPrice = item.price || 0;
      const maxPrice = item.max || avgPrice;
      const repairType = document.getElementById('detailedRepairType')?.value || 'business';
      
      if (repairType === 'budget') {
        return avgPrice;
      } else if (repairType === 'comfort') {
        return Math.round(maxPrice * 0.85);
      } else if (repairType === 'business') {
        return maxPrice;
      } else if (repairType === 'premium') {
        return Math.round(maxPrice * 1.7);
      } else {
        return avgPrice;
      }
    }
    
    function updateWorkPricesDisplay() {
      if (!priceData) return;
      
      document.querySelectorAll('.calc-item[data-type="work"]').forEach(el => {
        const key = el.dataset.key;
        const item = findPriceItem(key, 'works');
        if (item) {
          const priceEl = el.querySelector('.price-badge');
          if (priceEl) {
            const newPrice = getDisplayWorkPrice(item);
            priceEl.textContent = newPrice.toLocaleString('ru-RU') + ' ₽';
          }
        }
      });
      
      // Update dismantling prices
      document.querySelectorAll('.dismantling-item').forEach(el => {
        const key = el.dataset.key;
        const item = findPriceItem(key, 'works');
        if (item) {
          const displayPrice = getDisplayWorkPrice(item);
          const qty = itemQuantities[key] || 1;
          const itemTotal = displayPrice * qty;
          
          const priceEl = el.querySelector('.dismantling-price');
          if (priceEl) {
            priceEl.textContent = displayPrice.toLocaleString('ru-RU') + ' ₽';
          }
          
          const totalEl = el.querySelector('.dismantling-total');
          if (totalEl) {
            totalEl.textContent = itemTotal.toLocaleString('ru-RU') + ' ₽';
          }
        }
      });
    }
    
    function getDisplayMaterialPrice(item) {
      const avgPrice = item.price || 0;
      const maxPrice = item.max || avgPrice;
      const repairType = document.getElementById('detailedRepairType')?.value || 'business';
      
      if (repairType === 'budget') {
        return avgPrice;
      } else if (repairType === 'comfort') {
        return Math.round(maxPrice * 0.75);
      } else if (repairType === 'business') {
        return Math.round(maxPrice * 0.80);
      } else if (repairType === 'premium') {
        return maxPrice;
      } else {
        return avgPrice;
      }
    }
    
    function updateMaterialPricesDisplay() {
      if (!priceData) return;
      
      document.querySelectorAll('.calc-item[data-type="material"]').forEach(el => {
        const key = el.dataset.key;
        let item = findPriceItem(key, 'materials');
        if (!item && key.startsWith('heat_')) {
          item = findHeatingItem(key);
        }
        if (item) {
          const priceEl = el.querySelector('.price-badge');
          if (priceEl) {
            const newPrice = getDisplayMaterialPrice(item);
            priceEl.textContent = newPrice.toLocaleString('ru-RU') + ' ₽';
          }
          
          // Обновление "Итого по материалу"
          const totalEl = document.getElementById(`total_${key}`);
          if (totalEl) {
            let isSelected = false;
            if (selectedItems.materials) {
              for (const keys of Object.values(selectedItems.materials)) {
                if (keys && keys.includes(key)) {
                  isSelected = true;
                  break;
                }
              }
            }
            if (isSelected) {
              const matPrice = getDisplayMaterialPrice(item);
              const consumption = item.consumption || 1;
              const qty = (key.includes('electrical_materials') || key.includes('doors_windows')) ? (itemQuantities[key] || 1) : ((typeof itemQuantities[key] === 'number' && isFinite(itemQuantities[key])) ? itemQuantities[key] : 0);
              
              let area = 0;
              if (key.includes('electrical_materials') || key.includes('doors_windows')) {
                area = 0;
              } else {
                const parts = key.split('_');
                if (parts.length >= 3) {
                  const roomId = parts[1];
                  const surface = parts[2];
                  const roomD = getEstimateRoomData(roomId);
                  if (roomD) {
                    if (surface === 'ceiling' || surface === 'floor') {
                      area = surface === 'ceiling'
                        ? (roomD.materialCeilingArea || roomD.ceilingArea || roomD.area || 0)
                        : (roomD.materialFloorArea || roomD.area || 0);
                    } else {
                      area = roomD.materialWallsArea || roomD.wallsArea || 0;
                    }
                  }
                }
              }
              
              const baseCost = matPrice * area * consumption;
              const extraCost = matPrice * qty;
              const totalCost = baseCost + extraCost;
              const displayTotal = Number.isFinite(totalCost) ? totalCost : baseCost;
              totalEl.textContent = `Итого: ${displayTotal.toLocaleString('ru-RU')} ₽`;
            }
          }
        }
      });
    }
    
    function updateAllPricesDisplay() {
      updateWorkPricesDisplay();
      updateMaterialPricesDisplay();
    }

    function getEstimateRoomData(roomId) {
      const source = roomData?.[roomId];
      const roomMeta = priceData?.rooms?.[roomId];
      if (!source) return null;
      if (!roomMeta?.has_room_type) return source;

      const totals = {
        area: 0,
        wallsArea: 0,
        ceilingArea: 0,
        materialFloorArea: 0,
        materialWallsArea: 0,
        materialCeilingArea: 0
      };
      const addRoom = (room) => {
        if (!room) return;
        const floorArea = typeof getLivingRoomFloorArea === 'function'
          ? getLivingRoomFloorArea(room)
          : (Number(room.area) || 0);
        const wallsArea = typeof calculateLivingRoomWallsArea === 'function'
          ? calculateLivingRoomWallsArea(room)
          : (Number(room.wallsArea) || 0);
        const ceilingArea = typeof getLivingRoomCeilingArea === 'function'
          ? getLivingRoomCeilingArea(room)
          : (Number(room.ceilingArea) || floorArea);
        totals.area += floorArea;
        totals.wallsArea += wallsArea;
        totals.ceilingArea += ceilingArea;
        totals.materialFloorArea += typeof getLivingRoomMaterialFloorArea === 'function'
          ? getLivingRoomMaterialFloorArea(room)
          : (Number(room.materialFloorArea) || floorArea);
        totals.materialWallsArea += typeof getLivingRoomMaterialWallsArea === 'function'
          ? getLivingRoomMaterialWallsArea(room)
          : (Number(room.materialWallsArea) || wallsArea);
        totals.materialCeilingArea += typeof getLivingRoomMaterialCeilingArea === 'function'
          ? getLivingRoomMaterialCeilingArea(room)
          : (Number(room.materialCeilingArea) || ceilingArea || floorArea);
      };

      if (Array.isArray(source.livingRooms)) source.livingRooms.forEach(addRoom);
      if (Array.isArray(source.floors)) {
        source.floors.forEach(floor => (floor?.livingRooms || []).forEach(addRoom));
      }

      return { ...source, ...totals };
    }

    window.whatToDoIncludeMaterials = window.whatToDoIncludeMaterials !== false;

    function isWhatToDoMaterialsEnabled() {
      const toggle = document.getElementById('whatToDoIncludeMaterials');
      return toggle ? toggle.checked : window.whatToDoIncludeMaterials !== false;
    }

    function selectTieredMaterialPrice(priceEntry, qty) {
      if (Number.isFinite(Number(priceEntry))) return Number(priceEntry);
      if (!priceEntry || typeof priceEntry !== 'object') return 0;
      const overrideBase = Number(priceEntry.base);
      let selected = Number.isFinite(overrideBase) ? overrideBase : 0;
      const tiers = Array.isArray(priceEntry.tiers) ? priceEntry.tiers : [];
      tiers
        .filter(tier => Number.isFinite(Number(tier.fromQty)) && Number.isFinite(Number(tier.price)))
        .sort((a, b) => Number(a.fromQty) - Number(b.fromQty))
        .forEach(tier => {
          if (qty >= Number(tier.fromQty)) selected = Number(tier.price);
        });
      return selected;
    }

    function getLinkedMaterialPrice(materialId, qty) {
      const data = window.materialsData;
      const city = window.currentMaterialsCity || 'Москва';
      const market = window.currentMaterialsMarket || 'Бюджет/Аренда';
      const prices = data?.prices?.[city]?.[market] || data?.prices?.['Москва']?.['Бюджет/Аренда'];
      if (window.materialsOverrides && window.materialsOverrides[materialId] !== undefined) {
        return Number(window.materialsOverrides[materialId]) || 0;
      }
      return selectTieredMaterialPrice(prices?.[materialId], qty);
    }

    function isDiscreteMaterialUnit(unit = '') {
      const normalized = String(unit || '').trim().toLowerCase().replace(/\./g, '');
      return [
        'шт',
        'компл',
        'комплект',
        'уп',
        'упак',
        'упаковка',
        'пач',
        'пачка',
        'рул',
        'рулон',
        'ведро',
        'меш',
        'мешок',
        'банка'
      ].includes(normalized);
    }

    function normalizeMaterialQty(qty, rounding, unit = '') {
      if (!Number.isFinite(qty) || qty <= 0) return 0;
      if (rounding === 'ceil' || isDiscreteMaterialUnit(unit)) return Math.max(1, Math.ceil(qty));
      if (rounding === 'half') return Math.ceil(qty * 2) / 2;
      return qty;
    }

    function calculateWhatToDoMaterialsEstimate(workLines) {
      const data = window.materialsData;
      const recipes = data?.workMaterialRecipes;
      const catalog = data?.materialCatalog || {};
      if (!recipes || !Array.isArray(workLines) || !workLines.length) {
        return { total: 0, itemCount: 0, lines: [] };
      }

      const lineMap = new Map();
      workLines.forEach(workLine => {
        const overrideMaterials = Array.isArray(workLine.materialRecipeOverride) ? workLine.materialRecipeOverride : null;
        const recipe = overrideMaterials ? { materials: overrideMaterials } : recipes[workLine.workId];
        const materials = Array.isArray(recipe?.materials) ? recipe.materials : [];
        if (!recipe || recipe.status === 'not_required' || !materials.length) return;

        materials.forEach(entry => {
          const consumption = Number(entry.consumptionPerWorkUnit) || 0;
          const wasteMultiplier = 1 + ((Number(entry.wastePercent) || 0) / 100);
          const rawQty = (Number(workLine.qty) || 0) * consumption * wasteMultiplier;
          const material = catalog[entry.materialId] || {};
          const unit = material.purchaseUnit || material.consumptionUnit || entry.consumptionUnit || '';
          const qty = normalizeMaterialQty(rawQty, entry.rounding, unit);
          if (qty <= 0) return;

          const unitPriceOverride = Number(entry.unitPriceOverride ?? entry.priceOverride ?? entry.unitPrice);
          const hasUnitPriceOverride = Number.isFinite(unitPriceOverride) && unitPriceOverride > 0;
          const key = [
            workLine.roomId || '',
            entry.materialId || '',
            unit || '',
            hasUnitPriceOverride ? unitPriceOverride : '',
            workLine.source || '',
            workLine.sourceMode || ''
          ].join('|');
          const existing = lineMap.get(key);
          if (existing) {
            existing.rawQty += rawQty;
            existing.workTotal += Number(workLine.total || 0);
            existing.workIds.add(workLine.workId || '');
            if (workLine.roomRepairLabel) existing.roomRepairLabels.add(workLine.roomRepairLabel);
            if (workLine.roomRepairZoneLabel) existing.roomRepairZoneLabels.add(workLine.roomRepairZoneLabel);
            if (workLine.roomRepairQtyTrace) existing.roomRepairQtyTraces.add(workLine.roomRepairQtyTrace);
            if (workLine.roomRepairPackageName) existing.roomRepairPackageNames.add(workLine.roomRepairPackageName);
            return;
          }
          lineMap.set(key, {
            baseLine: { ...workLine },
            workTotal: workLine.total || 0,
            materialId: entry.materialId,
            materialName: entry.materialName || material.name || entry.materialId,
            rawQty,
            rounding: entry.rounding,
            unit,
            unitPriceOverride: hasUnitPriceOverride ? unitPriceOverride : null,
            workIds: new Set([workLine.workId || '']),
            source: workLine.source || '',
            sourceLabel: workLine.sourceLabel || '',
            sourceMode: workLine.sourceMode || '',
            roomRepairLabels: new Set(workLine.roomRepairLabel ? [workLine.roomRepairLabel] : []),
            roomRepairZoneLabels: new Set(workLine.roomRepairZoneLabel ? [workLine.roomRepairZoneLabel] : []),
            roomRepairQtyTraces: new Set(workLine.roomRepairQtyTrace ? [workLine.roomRepairQtyTrace] : []),
            roomRepairPackageNames: new Set(workLine.roomRepairPackageName ? [workLine.roomRepairPackageName] : [])
          });
        });
      });

      const lines = Array.from(lineMap.values()).map(entry => {
        const qty = normalizeMaterialQty(entry.rawQty, entry.rounding, entry.unit);
        const unitPrice = Number(entry.unitPriceOverride || 0) > 0
          ? Number(entry.unitPriceOverride)
          : getLinkedMaterialPrice(entry.materialId, qty);
        return {
          ...entry.baseLine,
          workTotal: entry.workTotal || 0,
          workId: Array.from(entry.workIds).filter(Boolean)[0] || entry.baseLine.workId,
          materialId: entry.materialId,
          materialName: entry.materialName,
          qty,
          rawQty: entry.rawQty,
          unit: entry.unit,
          unitPrice,
          total: unitPrice * qty,
          source: entry.source,
          sourceLabel: entry.sourceLabel,
          sourceMode: entry.sourceMode,
          roomRepairLabel: Array.from(entry.roomRepairLabels).filter(Boolean).join(', '),
          roomRepairZoneLabel: Array.from(entry.roomRepairZoneLabels).filter(Boolean).join(', '),
          roomRepairQtyTrace: Array.from(entry.roomRepairQtyTraces).filter(Boolean).slice(0, 3).join('; '),
          roomRepairPackageName: Array.from(entry.roomRepairPackageNames).filter(Boolean).join(', ')
        };
      });

      return {
        total: lines.reduce((sum, line) => sum + line.total, 0),
        itemCount: lines.length,
        lines
      };
    }

    window.calculateWhatToDoMaterialsEstimate = calculateWhatToDoMaterialsEstimate;

    function getWhatToDoCategoryLabel(line) {
      const map = {
        'demolition:construct': 'Демонтаж внутренних конструкций',
        'demolition:engineering': 'Демонтаж инженерных систем',
        'demolition:finishing': 'Демонтаж отделочных материалов и покрытий',
        'installation:rough': 'Черновые работы',
        'installation:engineering': 'Инженерные работы',
        'installation:finishing': 'Чистовые работы',
        'installation:architecturalSupervision': 'Архитектурный надзор'
      };
      return map[`${line.domain}:${line.category}`] || line.category || 'Работы';
    }

    function getWhatToDoRoomMeta(roomId, state) {
      const id = roomId || 'unknown';
      const isDemolition = id.startsWith('demo_');
      const isInstallation = id.startsWith('repair_');
      const section = isDemolition ? 'Демонтаж' : isInstallation ? 'Монтаж' : 'Работы';
      if (typeof getHouseRoomWorkItems === 'function') {
        const item = getHouseRoomWorkItems({ includeZeroArea: true }).find(room => {
          return [room.demoRoomId, room.repairRoomId, room.key, room.stableKey].filter(Boolean).includes(id);
        });
        if (item) {
          return {
            id,
            floor: `Этаж ${item.floorNumber}`,
            usage: item.categoryLabel || 'Зона не указана',
            type: item.estimateLabel || item.fullDisplayName || item.displayName || 'Помещение',
            section,
            registryLine: item.floorRoomPath || item.registryContextLine || '',
            location: item.floorLocationLabel || ''
          };
        }
      }
      const isLiving = id.includes('_living_');
      const usage = isLiving ? 'жилое' : id.includes('_nonliving_') ? 'нежилое' : 'тип не указан';
      const multiFloorMatch = id.match(/^(?:demo|repair)_(living|nonliving)_(\d+)_(\d+)$/);
      const singleFloorMatch = id.match(/^(?:demo|repair)_(living|nonliving)_(\d+)$/);
      const explicitFloorMatch = id.match(/(?:floor|этаж)[_-]?(\d+)/i);
      const floorIndex = multiFloorMatch ? Number(multiFloorMatch[2]) : explicitFloorMatch ? Number(explicitFloorMatch[1]) : null;
      const roomIndex = multiFloorMatch ? Number(multiFloorMatch[3]) : singleFloorMatch ? Number(singleFloorMatch[2]) : null;
      const floor = floorIndex !== null ? `Этаж ${floorIndex + 1}` : 'Этаж не указан';
      const roomBranch = multiFloorMatch
        ? state?.[multiFloorMatch[1]]?.floors?.[floorIndex]?.livingRooms?.[roomIndex]
        : singleFloorMatch
          ? state?.[singleFloorMatch[1]]?.livingRooms?.[roomIndex]
          : null;
      const data = state?.demolitionData?.[id] || state?.repairData?.[id] || state?.[id] || {};
      const type = roomBranch?.roomType || data.roomType || data.type || data.name || (isLiving ? 'Жилое помещение' : id.includes('_nonliving_') ? 'Нежилое помещение' : id);
      return { id, floor, usage, type, section };
    }

    function addGroupedAmount(target, key, initial, field, value) {
      if (!target[key]) target[key] = { ...initial, works: 0, materials: 0 };
      target[key][field] += value;
    }

    function renderLinkedEstimateBreakdown(workEstimate, materialEstimate, state, includeMaterials) {
      const roomGroups = {};
      const categoryGroups = {};
      const sourceGroups = {};
      const materialLines = includeMaterials ? (materialEstimate?.lines || []) : [];
      const normalizedRoomMetaMap = new Map();
      if (typeof getHouseRoomWorkItems === 'function') {
        getHouseRoomWorkItems({ includeZeroArea: true }).forEach(item => {
          const meta = {
            id: item.repairRoomId,
            floor: `Этаж ${item.floorNumber}`,
            usage: item.categoryLabel || 'Зона не указана',
            type: item.estimateLabel || item.fullDisplayName || item.displayName || 'Помещение',
            section: 'Работы',
            registryLine: item.floorRoomPath || item.registryContextLine || '',
            location: item.floorLocationLabel || ''
          };
          [item.repairRoomId, item.demoRoomId, item.key, item.stableKey].filter(Boolean).forEach(alias => {
            normalizedRoomMetaMap.set(alias, meta);
          });
        });
      }
      const resolveRoomMeta = (roomId) => {
        const meta = normalizedRoomMetaMap.get(roomId);
        if (!meta) return getWhatToDoRoomMeta(roomId, state);
        return {
          ...meta,
          id: roomId,
          section: String(roomId || '').startsWith('demo_') ? 'Демонтаж' : String(roomId || '').startsWith('repair_') ? 'Монтаж' : meta.section
        };
      };
      const addRoomRepairSourceMeta = (line) => {
        if (!line || line.source !== 'roomRepair' || !sourceGroups.roomRepair) return;
        if (line.roomRepairLabel) sourceGroups.roomRepair.labels.add(line.roomRepairLabel);
        if (line.roomRepairPackageName) sourceGroups.roomRepair.packages.add(line.roomRepairPackageName);
        if (line.roomRepairZoneLabel) {
          String(line.roomRepairZoneLabel)
            .split(',')
            .map(value => value.trim())
            .filter(Boolean)
            .forEach(value => sourceGroups.roomRepair.zones.add(value));
        }
      };

      (workEstimate?.lines || []).forEach(line => {
        const meta = resolveRoomMeta(line.roomId);
        addGroupedAmount(roomGroups, meta.id, meta, 'works', line.total || 0);

        const categoryKey = `${line.domain}:${line.category}`;
        addGroupedAmount(categoryGroups, categoryKey, {
          title: getWhatToDoCategoryLabel(line),
          section: line.domain === 'demolition' ? 'Демонтажные' : 'Монтажные'
        }, 'works', line.total || 0);

        if (line.source === 'roomRepair') {
          addGroupedAmount(sourceGroups, 'roomRepair', {
            title: 'Рассчитать ремонт',
            section: 'Источник позиций',
            labels: new Set(),
            packages: new Set(),
            zones: new Set()
          }, 'works', line.total || 0);
          addRoomRepairSourceMeta(line);
        }
      });

      materialLines.forEach(line => {
        const meta = resolveRoomMeta(line.roomId);
        addGroupedAmount(roomGroups, meta.id, meta, 'materials', line.total || 0);

        const categoryKey = `${line.domain}:${line.category}`;
        addGroupedAmount(categoryGroups, categoryKey, {
          title: getWhatToDoCategoryLabel(line),
          section: line.domain === 'demolition' ? 'Демонтажные' : 'Монтажные'
        }, 'materials', line.total || 0);

        if (line.source === 'roomRepair') {
          addGroupedAmount(sourceGroups, 'roomRepair', {
            title: 'Рассчитать ремонт',
            section: 'Источник позиций',
            labels: new Set(),
            packages: new Set(),
            zones: new Set()
          }, 'materials', line.total || 0);
          addRoomRepairSourceMeta(line);
        }
      });

      const roomHtml = Object.values(roomGroups)
        .filter(group => group.works + group.materials > 0)
        .map(group => {
          const total = group.works + group.materials;
          return `
            <div class="py-2 border-b border-gray-700">
              <div class="flex justify-between gap-2 text-xs">
                <span class="text-gray-300">${group.floor} · ${group.section}</span>
                <span class="text-white font-semibold">${formatSidebarMoney(total)}</span>
              </div>
              <div class="text-[11px] text-gray-500 mt-0.5">${group.type} · ${group.usage}</div>
              ${group.registryLine ? `<div class="text-[10px] text-gray-600 mt-0.5">${group.registryLine}</div>` : ''}
              <div class="flex justify-between text-[11px] text-gray-400 mt-1">
                <span>Работы: ${formatSidebarMoney(group.works)}</span>
                <span>Материалы: ${formatSidebarMoney(group.materials)}</span>
              </div>
            </div>
          `;
        })
        .join('');

      const categoryHtml = Object.values(categoryGroups)
        .filter(group => group.works + group.materials > 0)
        .map(group => {
          const total = group.works + group.materials;
          const hasWorks = group.works > 0;
          const hasMaterials = group.materials > 0;
          return `
            <div class="py-2 border-b border-gray-700">
              <div class="flex justify-between gap-2 text-xs">
                <span class="text-gray-300">${group.section}: ${group.title}</span>
                <span class="text-white font-semibold">${formatSidebarMoney(total)}</span>
              </div>
              <div class="mt-1 space-y-0.5 text-[11px]">
                <div class="flex justify-between gap-2 ${hasWorks ? 'text-gray-400' : 'text-gray-600'}">
                  <span>Работы</span>
                  <span>${formatSidebarMoney(group.works)}</span>
                </div>
                <div class="flex justify-between gap-2 ${hasMaterials ? 'text-amber-200' : 'text-gray-600'}">
                  <span>Материалы</span>
                  <span>${formatSidebarMoney(group.materials)}</span>
                </div>
              </div>
            </div>
          `;
        })
        .join('');

      const sourceHtml = Object.values(sourceGroups)
        .filter(group => group.works + group.materials > 0)
        .map(group => {
          const labels = Array.from(group.labels || []).slice(0, 4);
          const packages = Array.from(group.packages || []).slice(0, 2);
          const zones = Array.from(group.zones || []).slice(0, 3);
          return `
            <div class="py-2 border-b border-gray-700">
              <div class="flex justify-between gap-2 text-xs">
                <span class="text-emerald-200">${group.title}</span>
                <span class="text-white font-semibold">${formatSidebarMoney(group.works + group.materials)}</span>
              </div>
              <div class="flex justify-between text-[11px] text-gray-400 mt-1">
                <span>Работы: ${formatSidebarMoney(group.works)}</span>
                <span>Материалы: ${formatSidebarMoney(group.materials)}</span>
              </div>
              ${packages.length || zones.length ? `<div class="text-[10px] text-emerald-100 mt-1">${packages.length ? `Пакет: ${packages.join(', ')}` : ''}${packages.length && zones.length ? ' · ' : ''}${zones.length ? `Зоны: ${zones.join(', ')}` : ''}</div>` : ''}
              ${labels.length ? `<div class="text-[10px] text-gray-500 mt-1">${labels.join(', ')}${(group.labels?.size || 0) > labels.length ? ` +${group.labels.size - labels.length}` : ''}</div>` : ''}
            </div>
          `;
        })
        .join('');

      return `
        ${sourceHtml ? `<div class="text-[11px] uppercase tracking-wide text-gray-500 mb-1">По источникам</div>${sourceHtml}` : ''}
        ${roomHtml ? `<div class="text-[11px] uppercase tracking-wide text-gray-500 mb-1">По помещениям</div>${roomHtml}` : ''}
        ${categoryHtml ? `<div class="text-[11px] uppercase tracking-wide text-gray-500 mt-3 mb-1">По видам работ и материалов</div>${categoryHtml}` : ''}
      `;
    }

    function formatAuditQuantity(value, unit = '') {
      const rounded = Math.round((Number(value) || 0) * 10) / 10;
      return `${rounded.toLocaleString('ru-RU', {
        minimumFractionDigits: rounded % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 1
      })}${unit ? ` ${unit}` : ''}`;
    }

    function getWorkHoursPerUnit(workId) {
      const catalog = typeof getWorkCatalog === 'function' ? getWorkCatalog() : null;
      const item = catalog?.byId?.get(workId);
      const hours = Number(item?.hoursPerUnit);
      return Number.isFinite(hours) && hours > 0 ? hours : 0;
    }

    function summarizeLinkedWorkHours(workLines = []) {
      return workLines.reduce((sum, line) => {
        return sum + (getWorkHoursPerUnit(line.workId) * (Number(line.qty) || 0));
      }, 0);
    }

    function normalizeAuditUnit(unit = '') {
      const value = String(unit || '').trim().toLowerCase();
      const compact = value.replace(/\s+/g, '');
      if (['шт', 'штука', 'штуки', 'штук', 'pcs', 'pc'].includes(compact)) return 'шт';
      if (['л', 'литр', 'литра', 'литров', 'l'].includes(compact)) return 'л';
      if (['м2', 'м²', 'кв.м', 'кв.м.', 'м^2'].includes(compact)) return 'м²';
      if (['м3', 'м³', 'куб.м', 'куб.м.', 'м^3'].includes(compact)) return 'м³';
      if (['м', 'п.м', 'п.м.', 'пог.м', 'пог.м.'].includes(compact)) return 'м';
      if (['кг', 'килограмм', 'килограмма', 'килограммов'].includes(compact)) return 'кг';
      return unit || 'ед.';
    }

    function summarizeMaterialQuantities(materialLines = []) {
      const totalsByUnit = {};
      materialLines.forEach(line => {
        const qty = Number(line.qty) || 0;
        if (qty <= 0) return;
        const unit = normalizeAuditUnit(line.unit);
        totalsByUnit[unit] = (totalsByUnit[unit] || 0) + qty;
      });

      const preferredOrder = ['шт', 'л', 'м²', 'м³', 'м', 'кг'];
      return Object.entries(totalsByUnit)
        .sort(([unitA], [unitB]) => {
          const indexA = preferredOrder.indexOf(unitA);
          const indexB = preferredOrder.indexOf(unitB);
          if (indexA === -1 && indexB === -1) return unitA.localeCompare(unitB, 'ru');
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        })
        .map(([unit, qty]) => formatAuditQuantity(qty, unit))
        .join(' · ');
    }

    window.toggleWhatToDoMaterialsEstimate = function toggleWhatToDoMaterialsEstimate(checked) {
      window.whatToDoIncludeMaterials = checked;
      if (typeof updateDetailedCalc === 'function') updateDetailedCalc();
    };

    let whatToDoEstimateUpdateTimer = null;

    function scheduleWhatToDoEstimateUpdate() {
      clearTimeout(whatToDoEstimateUpdateTimer);
      whatToDoEstimateUpdateTimer = setTimeout(() => {
        if (typeof syncAppStateToNamespace === 'function') syncAppStateToNamespace();
        if (typeof updateDetailedCalc === 'function') updateDetailedCalc();
      }, 0);
    }

    window.scheduleWhatToDoEstimateUpdate = scheduleWhatToDoEstimateUpdate;

    function initWhatToDoEstimateAutoUpdate() {
      const section = document.getElementById('whatToDoSection');
      if (!section || section.dataset.estimateAutoUpdateBound === 'true') return;
      section.dataset.estimateAutoUpdateBound = 'true';
      section.addEventListener('change', scheduleWhatToDoEstimateUpdate);
      section.addEventListener('input', scheduleWhatToDoEstimateUpdate);
      section.addEventListener('click', scheduleWhatToDoEstimateUpdate);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initWhatToDoEstimateAutoUpdate);
    } else {
      initWhatToDoEstimateAutoUpdate();
    }
    
    function updateDetailedCalc() {
      if (!priceData) return;
      
      const buildingType = document.getElementById('detailedBuildingType')?.value || 'apartment';
      const buildingMultiplier = priceData.building_types?.[buildingType]?.multiplier || 1;
      const repairType = document.getElementById('detailedRepairType')?.value || 'business';
      
      // Get adjusted work price based on repair type
      function getWorkPrice(item) {
        const avgPrice = item.price || 0;
        const maxPrice = item.max || avgPrice;
        
        if (repairType === 'budget') {
          return avgPrice;
        } else if (repairType === 'comfort') {
          return maxPrice * 0.85;
        } else if (repairType === 'business') {
          return maxPrice;
        } else if (repairType === 'premium') {
          return maxPrice * 1.7;
        } else {
          return avgPrice;
        }
      }
      
      let worksTotal = 0;
      let materialsTotal = 0;
      let additionalTotal = 0;
      let manualWorkHoursTotal = 0;
      const manualMaterialQtyByUnit = {};
      const addManualMaterialQty = (qty, unit) => {
        const safeQty = Number(qty) || 0;
        if (safeQty <= 0) return;
        const normalizedUnit = normalizeAuditUnit(unit || 'шт');
        manualMaterialQtyByUnit[normalizedUnit] = (manualMaterialQtyByUnit[normalizedUnit] || 0) + safeQty;
      };
      const addManualWorkHours = (item, qty) => {
        const hoursPerUnit = Number(item?.hoursPerUnit) || getWorkHoursPerUnit(item?.id);
        if (hoursPerUnit > 0) {
          manualWorkHoursTotal += hoursPerUnit * (Number(qty) || 0);
        }
      };
      const linkedWorksEstimate = typeof calculateWhatToDoWorksEstimate === 'function'
        ? calculateWhatToDoWorksEstimate(roomData)
        : null;
      const hasLinkedWorksEstimate = linkedWorksEstimate && linkedWorksEstimate.itemCount > 0;
      const includeLinkedMaterials = hasLinkedWorksEstimate && isWhatToDoMaterialsEnabled();
      const linkedMaterialsEstimate = includeLinkedMaterials
        ? calculateWhatToDoMaterialsEstimate(linkedWorksEstimate.lines)
        : { total: 0, itemCount: 0, lines: [] };
      
      const roomBreakdown = {};
      
      // Calculate works (excluding dismantling categories - they are handled separately)
      const dismantlingCategories = ['dismantling'];
      for (const [catId, keys] of Object.entries(selectedItems.works)) {
        if (!keys || !keys.length) continue;
        if (dismantlingCategories.includes(catId)) continue;
        
        let catSum = 0;
        for (const key of keys) {
          const item = findPriceItem(key, 'works');
          if (!item) continue;
          
          const parts = key.split('_');
          let qty = itemQuantities[key] || 1;
          
          // Check if this is a surface-based item
          if (parts[1] && priceData.rooms[parts[1]]) {
            const roomId = parts[1];
            const surface = parts[2];
            const data = getEstimateRoomData(roomId);
            if (!data) continue;
            
            if (item.is_perimeter) {
              qty = Math.sqrt(data.area) * 4 * 1.1;
            } else if (surface === 'walls') {
              qty = data.wallsArea;
            } else if (surface === 'ceiling') {
              qty = data.ceilingArea || data.area;
            } else {
              qty = data.area;
            }
          }
          
          addManualWorkHours(item, qty);
          catSum += getWorkPrice(item) * qty;
        }
        worksTotal += catSum;
      }
      
      // Calculate dismantling works separately (global, not per room)
      for (const dismantlingCat of dismantlingCategories) {
        const dismantlingKeys = selectedItems.works[dismantlingCat];
        if (dismantlingKeys && dismantlingKeys.length > 0) {
          for (const key of dismantlingKeys) {
            const item = findPriceItem(key, 'works');
            if (item) {
              const qty = itemQuantities[key] || 1;
              addManualWorkHours(item, qty);
              worksTotal += getWorkPrice(item) * qty;
            }
          }
        }
      }
      
      // Calculate materials
      for (const [catId, keys] of Object.entries(selectedItems.materials)) {
        if (!keys || !keys.length) continue;
        
        let catSum = 0;
        for (const key of keys) {
          let item = findPriceItem(key, 'materials');
          if (!item && key.startsWith('heat_')) {
            item = findHeatingItem(key);
          }
          if (!item) continue;
          
          const parts = key.split('_');
          let qty;
          if (key.includes('waterproofing')) {
            qty = itemQuantities[key];
            if (qty === undefined || qty === null) qty = 0;
          } else {
            qty = itemQuantities[key] || 1;
          }
          
          // Get material price based on repair type
          const materialPrice = getDisplayMaterialPrice(item);
          const consumption = item.consumption || 1;
          
          // Check if this is waterproofing material first
          if (key.includes('waterproofing')) {
            // Waterproofing: базовая площадь ± дополнительные единицы
            // qty не задан (undefined) или qty = 0: только базовая площадь
            // qty = -1: базовая площадь - цена за единицу
            // qty = 1: базовая площадь + цена за единицу
            let area = 0;
            const roomCategories = ['living', 'nonliving'];
            for (const roomId of roomCategories) {
              const room = priceData.rooms?.[roomId];
              if (!room) continue;
              if (key.includes(`_${roomId}_`) || key.includes(`_${roomId}`)) {
                const roomD = getEstimateRoomData(roomId);
                if (roomD) {
                  if (room.has_room_type) {
                    if (key.includes('wall')) {
                      area += roomD.materialWallsArea || roomD.wallsArea;
                    } else if (key.includes('ceiling')) {
                      area += roomD.materialCeilingArea || roomD.ceilingArea || roomD.area;
                    } else {
                      area += roomD.materialFloorArea || roomD.area;
                    }
                  } else {
                    if (key.includes('wall')) {
                      area += roomD.wallsArea || 0;
                    } else if (key.includes('ceiling')) {
                      area += roomD.ceilingArea || roomD.area || 0;
                    } else {
                      area += roomD.area || 0;
                    }
                  }
                }
              }
            }
            
            const baseCost = materialPrice * area * consumption;
            const qtyValue = (qty === undefined || qty === null) ? 0 : qty;
            const extraCost = materialPrice * qtyValue;
            addManualMaterialQty((area * consumption) + qtyValue, item.purchaseUnit || item.consumptionUnit || item.unit);
            catSum += baseCost + extraCost;
          } else if (key.startsWith('mat_') && parts[1] && priceData.rooms[parts[1]] && !key.includes('waterproofing') && !key.includes('electrical_materials') && !key.includes('doors_windows')) {
            // Regular surface-based items (mat_roomId_surface_xxx) - но НЕ электротовары
            const roomId = parts[1];
            const surface = parts[2];
            let data = getEstimateRoomData(roomId);
            if (!data) continue;
            
            let area = 0;
            // Определяем площадь по surface, а не по ключу
            if (surface === 'ceiling' || surface === 'floor') {
              area = surface === 'ceiling' ? (data.materialCeilingArea || data.ceilingArea || data.area || 0) : (data.materialFloorArea || data.area || 0);
            } else {
              area = data.materialWallsArea || data.wallsArea || 0;
            }
            
            // Новая формула: база + дополнительные единицы
            const baseCost = materialPrice * area * consumption;
            const qtyValue = itemQuantities[key];
            const qtyExtra = (qtyValue === undefined || qtyValue === null) ? 0 : qtyValue;
            const extraCost = materialPrice * qtyExtra;
            addManualMaterialQty((area * consumption) + qtyExtra, item.purchaseUnit || item.consumptionUnit || item.unit);
            catSum += baseCost + extraCost;
          } else if (key.includes('electrical_materials') || key.includes('doors_windows')) {
            // Электротовары и двери/окна - только поштучно, без площади
            const qty = itemQuantities[key] || 1;
            addManualMaterialQty(qty, item.purchaseUnit || item.consumptionUnit || item.unit || 'шт');
            catSum += materialPrice * qty;
          } else {
            // Per-piece items (electrical, plumbing, doors)
            addManualMaterialQty(qty, item.purchaseUnit || item.consumptionUnit || item.unit || 'шт');
            catSum += materialPrice * qty;
          }
        }
        materialsTotal += catSum;
      }
      
      // Calculate additional
      for (const [catId, keys] of Object.entries(selectedItems.additional)) {
        if (!keys || !keys.length) continue;
        
        for (const key of keys) {
          const item = findPriceItem(key, 'additional');
          if (item) {
            const qty = itemQuantities[key] || 1;
            additionalTotal += item.price * qty;
          }
        }
      }
      
      if (hasLinkedWorksEstimate) {
        worksTotal = linkedWorksEstimate.total;
        materialsTotal = linkedMaterialsEstimate.total;
      } else {
        worksTotal *= buildingMultiplier;
        materialsTotal *= buildingMultiplier;
      }
      
      const grandTotal = worksTotal + materialsTotal + additionalTotal;
      
      const worksTotalEl = document.getElementById('worksTotalDisplay');
      const materialsTotalEl = document.getElementById('materialsTotalDisplay');
      const additionalTotalEl = document.getElementById('additionalTotalDisplay');
      const detailedWorksTotalEl = document.getElementById('detailedWorksTotal');
      const detailedMaterialsTotalEl = document.getElementById('detailedMaterialsTotal');
      const detailedAdditionalTotalEl = document.getElementById('detailedAdditionalTotal');
      const detailedGrandTotalEl = document.getElementById('detailedGrandTotal');
      const detailedTotalEl = document.getElementById('detailedTotal');
      
      if (worksTotalEl) worksTotalEl.textContent = formatSidebarMoney(worksTotal);
      if (materialsTotalEl) materialsTotalEl.textContent = formatSidebarMoney(materialsTotal);
      if (additionalTotalEl) additionalTotalEl.textContent = formatSidebarMoney(additionalTotal);
      if (detailedWorksTotalEl) detailedWorksTotalEl.textContent = formatSidebarMoney(worksTotal);
      if (detailedMaterialsTotalEl) detailedMaterialsTotalEl.textContent = formatSidebarMoney(materialsTotal);
      if (detailedAdditionalTotalEl) detailedAdditionalTotalEl.textContent = formatSidebarMoney(additionalTotal);
      if (detailedGrandTotalEl) detailedGrandTotalEl.textContent = formatSidebarMoney(grandTotal);
      if (detailedTotalEl) detailedTotalEl.textContent = formatSidebarMoney(grandTotal);
      
      // Room breakdown
      let breakdownHtml = '';
      const formatLinkedRoomLabel = (roomId) => {
        if (roomId.startsWith('demo_living_')) return 'Демонтаж: жилое помещение';
        if (roomId.startsWith('demo_nonliving_')) return 'Демонтаж: нежилое помещение';
        if (roomId.startsWith('repair_living_')) return 'Ремонт: жилое помещение';
        if (roomId.startsWith('repair_nonliving_')) return 'Ремонт: нежилое помещение';
        return roomId;
      };

      if (hasLinkedWorksEstimate) {
        breakdownHtml = renderLinkedEstimateBreakdown(
          linkedWorksEstimate,
          linkedMaterialsEstimate,
          roomData,
          includeLinkedMaterials
        );
      } else {
        for (const roomId of Object.keys(roomData)) {
          const room = priceData.rooms[roomId];
          if (!room) continue;
          const data = getEstimateRoomData(roomId);
          if (!data) continue;
          let worksTotalRoom = 0;
          let materialsTotalRoom = 0;
          
          for (const [catId, keys] of Object.entries(selectedItems.works)) {
            if (!keys) continue;
            for (const key of keys) {
              if (key.startsWith(`works_${roomId}`)) {
                const item = findPriceItem(key, 'works');
                if (item) {
                  const parts = key.split('_');
                  let qty = itemQuantities[key] || 1;
                  if (item.is_perimeter) {
                    qty = Math.sqrt(data.area) * 4 * 1.1;
                  } else if (parts[2] === 'walls') {
                    qty = data.wallsArea;
                  } else if (parts[2]) {
                    qty = data.area;
                  }
                  worksTotalRoom += getWorkPrice(item) * qty;
                }
              }
            }
          }
          
          for (const [catId, keys] of Object.entries(selectedItems.materials)) {
            if (!keys) continue;
            for (const key of keys) {
              if (key.includes('waterproofing') && key.includes(roomId)) {
                const item = findPriceItem(key, 'materials');
                if (item) {
                  const matPrice = getDisplayMaterialPrice(item);
                  const consumption = item.consumption || 1;
                  let area = 0;
                  if (key.includes('_wall')) area = data.materialWallsArea || data.wallsArea;
                  else if (key.includes('_ceiling')) area = data.materialCeilingArea || data.ceilingArea || data.area;
                  else area = data.materialFloorArea || data.area;
                  const qtyValue = itemQuantities[key];
                  const qty = (qtyValue === undefined || qtyValue === null) ? 0 : qtyValue;
                  const baseCost = matPrice * area * consumption;
                  const extraCost = matPrice * qty;
                  materialsTotalRoom += baseCost + extraCost;
                }
              } else if (key.startsWith(`mat_${roomId}`) && !key.includes('waterproofing')) {
                const parts = key.split('_');
                
                if (key.includes('electrical_materials') || key.includes('doors_windows')) {
                  const item = findPriceItem(key, 'materials');
                  if (item) {
                    const qty = itemQuantities[key] || 1;
                    materialsTotalRoom += getDisplayMaterialPrice(item) * qty;
                  }
                } else {
                  const catPart = parts[2];
                  const item = findPriceItem(key, 'materials');
                  if (item) {
                    let area = 0;
                    if (catPart === 'ceiling' || catPart === 'floor') {
                      area = catPart === 'ceiling' ? (data.materialCeilingArea || data.ceilingArea || data.area || 0) : (data.materialFloorArea || data.area || 0);
                    } else {
                      area = data.materialWallsArea || data.wallsArea || 0;
                    }
                    
                    const consumption = item.consumption || 1;
                    const matPrice = getDisplayMaterialPrice(item);
                    const qtyValue = itemQuantities[key];
                    const qtyExtra = (qtyValue === undefined || qtyValue === null) ? 0 : qtyValue;
                    
                    const baseCost = matPrice * area * consumption;
                    const extraCost = matPrice * qtyExtra;
                    materialsTotalRoom += baseCost + extraCost;
                  }
                }
              } else if (key.startsWith(`elec_${roomId}`) || key.startsWith(`doors_${roomId}`) || key.startsWith(`plumb_${roomId}`) || key.startsWith(`bath_plumb_${roomId}`) || key.startsWith(`water_${roomId}`)) {
                const item = findPriceItem(key, 'materials');
                if (item) {
                  const qty = itemQuantities[key] || 1;
                  materialsTotalRoom += getDisplayMaterialPrice(item) * qty;
                }
              }
            }
          }
          
          const roomTotal = (worksTotalRoom + materialsTotalRoom) * buildingMultiplier;
          if (roomTotal > 0) {
            breakdownHtml += `
              <div class="flex justify-between text-xs py-1 border-b border-gray-700">
                <span class="text-gray-400">${room.name}:</span>
                <span class="text-white">${formatSidebarMoney(roomTotal)}</span>
              </div>
            `;
          }
        }
      }
      document.getElementById('roomBreakdown').innerHTML = breakdownHtml || `
        <div class="rounded-xl border border-dashed border-white/10 px-3 py-3 text-xs text-gray-400">
          Здесь появится разрез по помещениям после выбора работ или материалов.
        </div>
      `;
      updateCalcAuditPanel(grandTotal, {
        worksTotal,
        materialsTotal,
        additionalTotal,
        worksCount: hasLinkedWorksEstimate ? linkedWorksEstimate.itemCount : getSelectedItemsCount('works'),
        materialsCount: hasLinkedWorksEstimate ? linkedMaterialsEstimate.itemCount : getSelectedItemsCount('materials'),
        additionalCount: getSelectedItemsCount('additional'),
        worksDisplay: hasLinkedWorksEstimate
          ? formatAuditQuantity(summarizeLinkedWorkHours(linkedWorksEstimate.lines), 'ч')
          : formatAuditQuantity(manualWorkHoursTotal, 'ч'),
        materialsDisplay: hasLinkedWorksEstimate && linkedMaterialsEstimate.itemCount > 0
          ? (summarizeMaterialQuantities(linkedMaterialsEstimate.lines) || '0')
          : (Object.entries(manualMaterialQtyByUnit)
              .sort(([unitA], [unitB]) => unitA.localeCompare(unitB, 'ru'))
              .map(([unit, qty]) => formatAuditQuantity(qty, unit))
              .join(' · ') || null)
      });
      if (typeof updateRequiredFieldHints === 'function') {
        updateRequiredFieldHints();
      }
    }
