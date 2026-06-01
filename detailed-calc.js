    function loadPrices() {
      if (!priceData) {
        fetch('prices.json?v=' + new Date().getTime())
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
            initDetailedCalculator();
          })
          .catch(error => {
            // Error loading prices
          });
      } else {
        initDetailedCalculator();
      }
    }
    
    function initRoomData() {
      for (const [roomId, room] of Object.entries(priceData.rooms)) {
        let defaultDoors = 1;
        roomData[roomId] = {
          area: room.default_area,
          ceiling: room.default_ceiling,
          doors: defaultDoors,
          doors_0: 1,
          windows: room.default_windows !== undefined ? room.default_windows : (room.has_windows === false ? 0 : 1),
          wallsArea: 0,
          doorWidths: [80, 80, 80, 80, 80],
          doorHeights: [200, 200, 200, 200, 200],
          windowWidths: [130, 130, 130, 130, 130],
          windowHeights: [140, 140, 140, 140, 140],
          balcony: room.default_balcony !== undefined ? room.default_balcony : (room.has_balcony ? 1 : 0),
          balconyWidths: [80, 80, 80, 80, 80],
          balconyHeights: [250, 250, 250, 250, 250],
          roomType: room.default_room_type || '',
          livingRoomCount: 0,
          livingRooms: []
        };
        calculateWallsArea(roomId);
      }
    }
    
    function calculateWallsArea(roomId) {
      const data = roomData[roomId];
      const ceiling = data.ceiling || 3;
      const room = priceData.rooms[roomId];
      
      // Двери
      let doorArea = 0;
      const maxDoors = Math.min(data.doors, 5);
      for (let i = 0; i < maxDoors; i++) {
        const doorW = (data.doorWidths?.[i] || 80) / 100;
        const doorH = (data.doorHeights?.[i] || 200) / 100;
        doorArea += doorW * doorH;
      }
      
      // Окна
      let windowArea = 0;
      if (room.has_windows !== false) {
        const maxWindows = Math.min(data.windows || 0, 5);
        for (let i = 0; i < maxWindows; i++) {
          const winW = (data.windowWidths?.[i] || 130) / 100;
          const winH = (data.windowHeights?.[i] || 140) / 100;
          windowArea += winW * winH;
        }
      }
      
      // Балконные двери
      let balconyArea = 0;
      if (room.has_balcony) {
        const maxBalconies = Math.min(data.balcony || 0, 5);
        for (let i = 0; i < maxBalconies; i++) {
          const balW = (data.balconyWidths?.[i] || 80) / 100;
          const balH = (data.balconyHeights?.[i] || 250) / 100;
          balconyArea += balW * balH;
        }
      }
      
      if (data.area <= 0) {
        data.wallsArea = 0;
        return 0;
      }
      
      const perimeter = Math.sqrt(data.area) * 4 * 1.1;
      const grossWalls = perimeter * ceiling;
      data.wallsArea = Math.max(0, grossWalls - doorArea - windowArea - balconyArea);
      return Math.round(data.wallsArea);
    }

    function getConfiguredDetailedRooms() {
      let roomsCount = 0;
      let totalArea = 0;
      let totalWalls = 0;

      const roomCategories = ['living', 'nonliving'];
      for (const roomId of roomCategories) {
        const data = roomData[roomId];
        if (!data) continue;

        if (Array.isArray(data.livingRooms)) {
          data.livingRooms.forEach(room => {
            const area = parseFloat(room?.area) || 0;
            if (area > 0) {
              roomsCount += 1;
              totalArea += area;
              totalWalls += calculateLivingRoomWallsArea(room);
            }
          });
        }

        if (Array.isArray(data.floors)) {
          data.floors.forEach(floor => {
            if (!Array.isArray(floor?.livingRooms)) return;
            floor.livingRooms.forEach(room => {
              const area = parseFloat(room?.area) || 0;
              if (area > 0) {
                roomsCount += 1;
                totalArea += area;
                totalWalls += calculateLivingRoomWallsArea(room);
              }
            });
          });
        }
      }

      return {
        roomsCount,
        totalArea: Number(totalArea.toFixed(2)),
        totalWalls: Number(totalWalls.toFixed(2))
      };
    }

    function scheduleWhatToDoRender() {
      if (whatToDoRenderTimer) {
        clearTimeout(whatToDoRenderTimer);
      }
      whatToDoRenderTimer = setTimeout(() => {
        renderWhatToDoRooms();
        whatToDoRenderTimer = null;
      }, 80);
    }


    function updateWhatToDoRoomCardState(roomId, type) {
      const isDone = type === 'demo' ? hasDemolitionRoomData(roomId) : hasRepairRoomData(roomId);
      const cardHeader = document.getElementById(roomId + 'CardHeader');
      const doneIcon = document.getElementById(roomId + 'Done');

      if (doneIcon) doneIcon.classList.add('hidden');
      if (cardHeader) {
        cardHeader.classList.toggle('bg-green-50', isDone);
        cardHeader.classList.toggle('dark:bg-green-900/20', isDone);
        cardHeader.classList.toggle('px-2', isDone);
        cardHeader.classList.toggle('py-1', isDone);
        if (!isDone) {
          cardHeader.classList.remove('bg-green-50', 'dark:bg-green-900/20', 'px-2', 'py-1');
        }
      }
    }

    function updateWhatToDoSectionStates() {
      const demoRoomIds = getConfiguredWhatToDoRoomIds('demo');
      const repairRoomIds = getConfiguredWhatToDoRoomIds('repair');

      const demolitionLivingDone = demoRoomIds.filter(id => id.startsWith('demo_living_')).some(id => hasDemolitionRoomData(id));
      const demolitionNonlivingDone = demoRoomIds.filter(id => id.startsWith('demo_nonliving_')).some(id => hasDemolitionRoomData(id));
      const repairLivingDone = repairRoomIds.filter(id => id.startsWith('repair_living_')).some(id => hasRepairRoomData(id));
      const repairNonlivingDone = repairRoomIds.filter(id => id.startsWith('repair_nonliving_')).some(id => hasRepairRoomData(id));

      setWhatToDoHeaderState('demolitionLiving', demolitionLivingDone);
      setWhatToDoHeaderState('demolitionNonliving', demolitionNonlivingDone);
      setWhatToDoHeaderState('demolitionWorks', demolitionLivingDone || demolitionNonlivingDone);
      setWhatToDoHeaderState('repairLiving', repairLivingDone);
      setWhatToDoHeaderState('repairNonliving', repairNonlivingDone);
      setWhatToDoHeaderState('repairWorks', repairLivingDone || repairNonlivingDone);
    }

    function getRepairQuestCombinedAudit() {
      const issues = [];

      if (Array.isArray(repairQuestState.lastAudit?.issues)) {
        issues.push(...repairQuestState.lastAudit.issues);
      }

      const sectionAudit = buildRepairQuestSectionAudit();
      repairQuestState.sectionAudit = sectionAudit;
      if (Array.isArray(sectionAudit?.issues)) {
        issues.push(...sectionAudit.issues);
      }

      const uniqueIssues = [...new Set(issues)];
      return {
        issues: uniqueIssues,
        issueCount: uniqueIssues.length
      };
    }

    function updateCalcAuditPanel(grandTotal = 0) {
      const roomsEl = document.getElementById('calcAuditRooms');
      const areaEl = document.getElementById('calcAuditArea');
      const worksEl = document.getElementById('calcAuditWorks');
      const materialsEl = document.getElementById('calcAuditMaterials');
      const badgeEl = document.getElementById('calcAuditBadge');
      const hintEl = document.getElementById('calcAuditHint');
      const warningsWrapEl = document.getElementById('calcAuditWarnings');
      const warningsListEl = document.getElementById('calcAuditWarningsList');

      if (!roomsEl || !areaEl || !worksEl || !materialsEl || !badgeEl || !hintEl || !warningsWrapEl || !warningsListEl) return;

      const metrics = getConfiguredDetailedRooms();
      const worksCount = getSelectedItemsCount('works');
      const materialsCount = getSelectedItemsCount('materials');
      const additionalCount = getSelectedItemsCount('additional');
      const combinedAudit = getRepairQuestCombinedAudit();

      roomsEl.textContent = metrics.roomsCount.toLocaleString('ru-RU');
      areaEl.textContent = metrics.totalArea.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' м²';
      worksEl.textContent = worksCount.toLocaleString('ru-RU');
      materialsEl.textContent = (materialsCount + additionalCount).toLocaleString('ru-RU');
      warningsWrapEl.classList.add('hidden');
      warningsListEl.innerHTML = '';

      badgeEl.className = 'rounded-full px-2.5 py-1 text-[11px] font-semibold';

      if (metrics.roomsCount === 0) {
        badgeEl.classList.add('border', 'border-amber-400/30', 'bg-amber-500/10', 'text-amber-200');
        badgeEl.textContent = 'Заполните помещения';
        hintEl.textContent = 'Добавьте хотя бы одно помещение, чтобы калькулятор начал собирать итоговые данные.';
      } else if (worksCount + materialsCount + additionalCount === 0) {
        badgeEl.classList.add('border', 'border-sky-400/30', 'bg-sky-500/10', 'text-sky-200');
        badgeEl.textContent = 'Выберите работы';
        hintEl.textContent = 'Площади уже посчитаны. Теперь выберите работы, материалы или доп. услуги, чтобы собрать смету.';
      } else if (combinedAudit.issueCount) {
        badgeEl.classList.add('border', 'border-amber-400/30', 'bg-amber-500/10', 'text-amber-200');
        badgeEl.textContent = `Нужно проверить: ${combinedAudit.issueCount}`;
        hintEl.textContent = `Аудит ответов и заполненных разделов нашёл ${combinedAudit.issueCount} момент(а), которые стоит перепроверить.`;
        warningsWrapEl.classList.remove('hidden');
        warningsListEl.innerHTML = combinedAudit.issues
          .slice(0, 5)
          .map(issue => `<div>• ${issue}</div>`)
          .join('') + (combinedAudit.issueCount > 5 ? `<div>• И ещё ${combinedAudit.issueCount - 5} замечаний.</div>` : '');
      } else {
        badgeEl.classList.add('border', 'border-emerald-400/30', 'bg-emerald-500/10', 'text-emerald-200');
        badgeEl.textContent = 'Смета сформирована';
        hintEl.textContent = `Сейчас в смете ${worksCount + materialsCount + additionalCount} позиций на сумму ${Math.round(grandTotal).toLocaleString('ru-RU')} ₽.`;
      }
    }
    
    function updateAllAreas() {
      for (const roomId of Object.keys(roomData)) {
        calculateWallsArea(roomId);
      }
      renderRoomInputs();
      updateDetailedCalc();
    }
    
    function initDetailedCalculator() {
      if (!priceData) return;
      renderRoomInputs();
      renderWorksByRoom();
      renderMaterialsByRoom();
      renderWhatToDoRooms();
      renderMaterialsByRoom();
      updateMaterialPricesDisplay();
      renderAdditionalServices();
      toggleSection('estimateDataSection', true);
      toggleSection('repairPlanSection', false);
      toggleSection('whatToDoSection', false);
      toggleSection('priceListSection', false);
      toggleSection('materialsSection', false);
      toggleSection('additionalSection', false);
      updateDetailedCalc();
    }
    
    function toggleSection(sectionId, forceOpen = null) {
      const content = document.getElementById(sectionId);
      const icon = document.getElementById(sectionId + 'Icon');
      
      if (!content) return;
      
      const isOpen = content.style.display === 'block';
      let nextOpen = isOpen;
      
      if (forceOpen !== null) {
        if (forceOpen) {
          content.style.display = 'block';
          content.classList.add('open');
          if (icon) icon.style.transform = 'rotate(180deg)';
          nextOpen = true;
        } else {
          content.style.display = 'none';
          content.classList.remove('open');
          if (icon) icon.style.transform = 'rotate(0deg)';
          nextOpen = false;
        }
      } else {
        if (isOpen) {
          content.style.display = 'none';
          content.classList.remove('open');
          if (icon) icon.style.transform = 'rotate(0deg)';
          nextOpen = false;
        } else {
          content.style.display = 'block';
          content.classList.add('open');
          if (icon) icon.style.transform = 'rotate(180deg)';
          nextOpen = true;
        }
      }

      if (sectionId === 'materialsSection' && typeof setDetailedSidePanelCollapsed === 'function') {
        setDetailedSidePanelCollapsed('summary', nextOpen);
      }
    }
    
    function toggleWhatToDoSubSection(subsectionId) {
      const content = document.getElementById(subsectionId + 'Content');
      const icon = document.getElementById(subsectionId + 'Icon');
      
      if (!content) return;
      
      if (content.style.display === 'none') {
        content.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(180deg)';
        openWhatToDoSubSections.add(subsectionId);
      } else {
        content.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
        openWhatToDoSubSections.delete(subsectionId);
      }
      
      const roomMatch = subsectionId.match(/^(demo_\w+_\w+)/);
      const repairMatch = subsectionId.match(/^(repair_\w+_\w+)/);
      if (roomMatch) {
        const roomId = roomMatch[1];
        if (subsectionId.includes('partitions')) {
          checkDemolitionDone(roomId, 'partitions');
        } else if (subsectionId.includes('electrical')) {
          checkDemolitionDone(roomId, 'electrical');
        } else if (subsectionId.includes('ventilation')) {
          checkDemolitionDone(roomId, 'ventilation');
        } else if (subsectionId.includes('heating')) {
          checkDemolitionDone(roomId, 'heating');
        } else if (subsectionId.includes('finishing')) {
          checkDemolitionDone(roomId, 'finishing');
        }
      } else if (repairMatch) {
        const roomId = repairMatch[1];
        if (subsectionId.includes('rough')) {
          checkRepairDone(roomId, 'rough');
        } else if (subsectionId.includes('engineering')) {
          checkRepairDone(roomId, 'engineering');
        } else if (subsectionId.includes('finishing')) {
          checkRepairDone(roomId, 'finishing');
        } else if (subsectionId.includes('floorLeveling') || subsectionId.includes('wallPlaster') || subsectionId.includes('wallPutty') || subsectionId.includes('ceilingPrep')) {
          checkRepairDone(roomId, 'rough');
        } else if (subsectionId.includes('electrical') || subsectionId.includes('ventilation') || subsectionId.includes('water') || subsectionId.includes('drainage') || subsectionId.includes('heating')) {
          checkRepairDone(roomId, 'engineering');
        } else if (subsectionId.includes('openingsMount') || subsectionId.includes('doorOpeningMount') || subsectionId.includes('windowOpeningMount') || subsectionId.includes('balconyOpeningMount')) {
          checkRepairDone(roomId, 'openingsMount');
          checkRepairDone(roomId, 'finishing');
        } else if (subsectionId.includes('floorFinish') || subsectionId.includes('wallFinish') || subsectionId.includes('ceilingFinish')) {
          checkRepairDone(roomId, 'finishing');
        }
      }
    }
    
    function checkDemolitionDone(roomId, subType) {
      let doneIconId;
      if (subType.startsWith('_')) {
        doneIconId = roomId + subType + 'Done';
      } else {
        doneIconId = roomId + '_' + subType + 'Done';
      }
      const doneIcon = document.getElementById(doneIconId);
      // Allow processing even without done icon (for _openings)
      
      let isDone = false;
      const data = roomData.demolitionData?.[roomId];
      
      if (subType === 'partitions') {
        isDone = data?.partitions?.some(p => p.material && p.area > 0);
      } else if (subType === 'electrical') {
        isDone = data?.electrical?.some(e => e.type && e.qty > 0);
      } else if (subType === 'ventilation') {
        isDone = data?.ventilation?.some(v => v.type && ((v.qty || 0) > 0 || (v.length || 0) > 0));
      } else if (subType === 'finishing') {
        const floorDone = data?.finishing?.floor?.some(f => f.type);
        const wallDone = data?.finishing?.wall?.some(f => f.type);
        const ceilingDone = data?.finishing?.ceiling?.some(f => f.type);
        isDone = !!(floorDone || wallDone || ceilingDone);
      } else if (subType === 'finishing_floor') {
        isDone = !!data?.finishing?.floor?.some(f => f.type);
      } else if (subType === 'finishing_wall') {
        isDone = !!data?.finishing?.wall?.some(f => f.type);
      } else if (subType === 'finishing_ceiling') {
        isDone = !!data?.finishing?.ceiling?.some(f => f.type);
      } else if (subType === 'water') {
        isDone = data?.water?.some(w => w.type && w.qty > 0);
      } else if (subType === 'drainage') {
        isDone = data?.drainage?.some(d => d.type);
      } else if (subType === 'plumbing') {
        isDone = data?.plumbing?.some(p => p.type && p.qty > 0);
      } else if (subType === 'heating') {
        isDone = data?.heating?.some(h => h.type && h.qty > 0);
      } else if (subType === '_construct') {
        isDone = data?.partitions?.some(p => p.material && p.area > 0) ||
                data?.doorOpenings?.some(o => o.length && o.width && o.material) ||
                data?.windowOpenings?.some(o => o.length && o.width && o.material) ||
                data?.balconyOpenings?.some(o => o.length && o.width && o.material) ||
                data?.staircase?.some(s => s.workId || s.material) ||
                data?.railing?.some(r => r.workId || r.material);
      } else if (subType === '_engineering') {
        isDone = data?.electrical?.some(e => e.type && e.qty > 0) ||
                data?.ventilation?.some(v => v.type && ((v.qty || 0) > 0 || (v.length || 0) > 0)) ||
                data?.water?.some(w => w.type && w.qty > 0) ||
                data?.drainage?.some(d => d.type) ||
                data?.plumbing?.some(p => p.type && p.qty > 0) ||
                data?.heating?.some(h => h.type && h.qty > 0);
      } else if (subType === 'doorOpenings' || subType === 'windowOpenings' || subType === 'balconyOpenings') {
        isDone = data?.[subType]?.some(o => o.length && o.width && o.material);
      } else if (subType === 'staircase') {
        isDone = data?.staircase?.some(s => s.workId || s.material);
      } else if (subType === 'railing') {
        isDone = data?.railing?.some(r => r.workId || r.material);
      } else if (subType === '_stairs') {
        isDone = data?.staircase?.some(s => s.workId || s.material) || data?.railing?.some(r => r.workId || r.material);
      } else if (subType === '_openings') {
        isDone = data?.doorOpenings?.some(o => o.length && o.width && o.material) || 
                data?.windowOpenings?.some(o => o.length && o.width && o.material) || 
                data?.balconyOpenings?.some(o => o.length && o.width && o.material);
      }
      
      // Show check icon for _construct - also try direct search
      let checkIcon = doneIcon;
      if (!checkIcon && subType === '_construct') {
        const possibleIds = [roomId + '_constructDone', roomId + 'constructDone'];
        for (const id of possibleIds) {
          checkIcon = document.getElementById(id);
          if (checkIcon) {
            break;
          }
        }
      }
      
      // Show check only for parent sections, not for sub-sections
      // Show for: finishing, _construct. Hide for: partitions, finishing_floor/wall/ceiling
      const showCheckForFinishing = (subType === 'finishing');
      const showCheckForConstruct = (subType === '_construct');
      const hideCheck = (subType === 'partitions' || subType === 'finishing_floor' || subType === 'finishing_wall' || subType === 'finishing_ceiling');
      
      if (checkIcon && ((showCheckForFinishing || showCheckForConstruct) || !hideCheck)) {
        checkIcon.classList.toggle('hidden', !isDone);
      }
      
      // Green border for leaf sections only; parent sections keep only the check icon
      if (isDone && (subType === 'partitions' || subType === 'electrical' || subType === 'ventilation' || subType === 'water' || subType === 'drainage' || subType === 'plumbing' || subType === 'heating' || subType === 'finishing_floor' || subType === 'finishing_wall' || subType === 'finishing_ceiling' || subType === '_engineering' || subType === '_openings' || subType === 'staircase' || subType === 'railing' || subType === '_stairs')) {
        let headerEl;
        let targetId = '';
        
        // Use querySelector as most reliable method with roomId
        if (subType === 'partitions') {
          targetId = roomId + '_partitionsHeader';
          headerEl = document.getElementById(targetId) || document.getElementById(roomId + '_partitionsSection');
        } else if (subType === 'electrical') {
          headerEl = document.getElementById(roomId + '_electricalHeader');
        } else if (subType === 'ventilation') {
          headerEl = document.getElementById(roomId + '_ventilationHeader');
        } else if (subType === 'water') {
          headerEl = document.getElementById(roomId + '_waterHeader');
        } else if (subType === 'drainage') {
          headerEl = document.getElementById(roomId + '_drainageHeader');
        } else if (subType === 'plumbing') {
          headerEl = document.getElementById(roomId + '_plumbingHeader');
        } else if (subType === '_openings') {
          headerEl = document.getElementById(roomId + '_openingsHeader');
        } else if (subType === 'finishing_floor' || subType === 'finishing_wall' || subType === 'finishing_ceiling') {
          headerEl = document.getElementById(roomId + '_' + subType + 'Header');
        } else if (subType === 'staircase') {
          headerEl = document.getElementById(roomId + '_staircaseHeader');
        } else if (subType === 'railing') {
          headerEl = document.getElementById(roomId + '_railingHeader');
        } else if (subType === '_stairs') {
          headerEl = document.getElementById(roomId + '_stairsHeader');
        } else if (subType === '_engineering') {
          headerEl = document.getElementById(roomId + '_electricalHeader') || document.getElementById(roomId + '_ventilationHeader');
        }

// For electrical
        if (!headerEl && subType === 'electrical') {
          const engineeringContent = document.getElementById(roomId + '_engineeringContent');
          if (engineeringContent) {
            const spans = engineeringContent.querySelectorAll('span');
            for (let span of spans) {
              if (span.textContent === 'Отключение и снятие электрики') {
                headerEl = span.parentElement;
                break;
              }
            }
          }
        }
        
        // For _engineering (when electrical, water, drainage or plumbing may have data)
        if (!headerEl && subType === '_engineering') {
          const data = roomData.demolitionData?.[roomId];
          const hasElectrical = data?.electrical?.some(e => e.type && e.qty > 0);
          const hasVentilation = data?.ventilation?.some(v => v.type && ((v.qty || 0) > 0 || (v.length || 0) > 0));
          const hasWater = data?.water?.some(w => w.type && w.qty > 0);
          const hasDrainage = data?.drainage?.some(d => d.type);
          const hasPlumbing = data?.plumbing?.some(p => p.type && p.qty > 0);
          const hasHeating = data?.heating?.some(h => h.type && h.qty > 0);
          const engineeringContent = document.getElementById(roomId + '_engineeringContent');
          if (engineeringContent) {
            const spans = engineeringContent.querySelectorAll('span');
            let searchText;
            if (hasHeating) searchText = 'Демонтаж систем отопления';
            else if (hasPlumbing) searchText = 'Демонтаж сантехнических приборов';
            else if (hasDrainage) searchText = 'Демонтаж канализации';
            else if (hasWater) searchText = 'Демонтаж систем водоснабжения';
            else if (hasVentilation) searchText = 'Демонтаж вентиляции / кондиционирования';
            else searchText = 'Отключение и снятие электрики';
            for (let span of spans) {
              if (span.textContent === searchText) {
                headerEl = span.parentElement;
                break;
              }
            }
          }
        }
        
        // For plumbing
        if (!headerEl && subType === 'plumbing') {
          const engineeringContent = document.getElementById(roomId + '_engineeringContent');
          if (engineeringContent) {
            const spans = engineeringContent.querySelectorAll('span');
            for (let span of spans) {
              if (span.textContent === 'Демонтаж сантехнических приборов') {
                headerEl = span.parentElement;
                break;
              }
            }
          }
        }
        
        // For partitions fallback only
        if (!headerEl && subType === 'partitions') {
          // Search in constructContent
          const constructContent = document.getElementById(roomId + '_constructContent');
          if (constructContent) {
            const spans = constructContent.querySelectorAll('span');
            for (let span of spans) {
              if (span.textContent === 'Демонтаж перегородок') {
                headerEl = span.parentElement;
                break;
              }
            }
          }
          headerEl = headerEl || document.getElementById(roomId + '_partitionsHeader');
        }
        
        // For water
        if (!headerEl && subType === 'water') {
const engineeringContent = document.getElementById(roomId + '_engineeringContent');
          if (engineeringContent) {
            const spans = engineeringContent.querySelectorAll('span');
            for (let span of spans) {
              if (span.textContent === 'Демонтаж систем водоснабжения') {
                headerEl = span.parentElement;
                break;
              }
            }
          }
        }
        
        // For drainage
        if (!headerEl && subType === 'drainage') {
          const engineeringContent = document.getElementById(roomId + '_engineeringContent');
          if (engineeringContent) {
            const spans = engineeringContent.querySelectorAll('span');
            for (let span of spans) {
              if (span.textContent === 'Демонтаж канализации') {
                headerEl = span.parentElement;
                break;
              }
            }
          }
        }
        
        // Fallback: find any element that contains the text
        if (!headerEl && subType !== 'water' && subType !== 'drainage' && subType !== 'plumbing' && subType !== 'partitions' && subType !== '_construct' && subType !== 'electrical' && subType !== '_engineering') {
          const searchTexts = {
            'finishing': 'Демонтаж отделочных',
            '_openings': 'Демонтаж проёмов'
          };
          const spans = document.querySelectorAll('span');
          for (let span of spans) {
            if (searchTexts[subType] && span.textContent.includes(searchTexts[subType].split(' ')[0])) {
              headerEl = span.parentElement;
              while (headerEl && !headerEl.id) {
                headerEl = headerEl.parentElement;
              }
              break;
            }
          }
        }
        
        if (headerEl) {
          headerEl.classList.add('border-2', 'border-green-500', 'rounded');
          headerEl.classList.add('px-2', 'py-1');
        }
      }
      
      // Green text color for door/window/balcony openings
      if (isDone && (subType === 'doorOpenings' || subType === 'windowOpenings' || subType === 'balconyOpenings')) {
        let headerId;
        if (subType === 'doorOpenings') headerId = roomId + '_doorOpeningsHeader';
        else if (subType === 'windowOpenings') headerId = roomId + '_windowOpeningsHeader';
        else if (subType === 'balconyOpenings') headerId = roomId + '_balconyOpeningsHeader';
        else headerId = roomId + '_' + subType + 'Header';
        
        let headerEl = document.getElementById(headerId);
        
        if (!headerEl) {
          // Fallback: find by text content
          const spans = document.getElementsByTagName('span');
          let text = 'Демонтаж перегородок';
          if (subType === '_engineering') text = 'Отключение и снятие электрики';
          else if (subType === '_openings') text = 'Демонтаж проёмов';
          for (let span of spans) {
            if (span.textContent === text && span.closest('[id*="' + roomId + '"]')) {
              headerEl = span.parentElement;
              break;
            }
          }
        }
        
        if (headerEl) {
          headerEl.classList.add('text-green-600', 'font-semibold');
        }
      }
      
// Remove border when not done
      if (!isDone && (subType === 'partitions' || subType === 'finishing_floor' || subType === 'finishing_wall' || subType === 'finishing_ceiling' || subType === 'doorOpenings' || subType === 'windowOpenings' || subType === 'balconyOpenings' || subType === '_openings' || subType === '_engineering' || subType === 'electrical' || subType === 'ventilation')) {
        let headerEl;
        
        if (subType === 'partitions') {
          headerEl = document.getElementById(roomId + '_partitionsHeader') || document.getElementById(roomId + '_partitionsSection');
        } else if (subType === 'finishing_floor' || subType === 'finishing_wall' || subType === 'finishing_ceiling') {
          headerEl = document.getElementById(roomId + '_' + subType + 'Header');
        } else if (subType === '_openings') {
          headerEl = document.getElementById(roomId + '_openingsHeader');
        } else if (subType === 'doorOpenings' || subType === 'windowOpenings' || subType === 'balconyOpenings') {
          headerEl = document.getElementById(roomId + '_' + subType + 'Header');
        } else if (subType === 'electrical' || subType === '_engineering') {
          headerEl = document.getElementById(roomId + '_electricalHeader');
        } else if (subType === 'ventilation') {
          headerEl = document.getElementById(roomId + '_ventilationHeader');
        }
        
        // For electrical - just remove border from immediate parent of span
        if (!headerEl && (subType === 'electrical' || subType === '_engineering')) {
          const spans = document.querySelectorAll('span');
          for (let span of spans) {
            if (span.textContent === 'Отключение и снятие электрики' && span.closest('[id*="' + roomId + '"]')) {
              headerEl = span.parentElement;
              break;
            }
          }
        }
        
        // Fallback search for header
        if (!headerEl) {
          const searchTexts = {
            'partitions': 'Демонтаж перегородок',
            '_construct': 'Демонтаж перегородок',
            'electrical': 'Отключение и снятие электрики',
            '_engineering': 'Отключение и снятие электрики',
            'finishing_floor': 'Снятие напольных покрытий',
            'finishing_wall': 'Удаление стеновых покрытий',
            'finishing_ceiling': 'Демонтаж потолочных конструкций',
            '_openings': 'Демонтаж проёмов'
          };
          const spans = document.querySelectorAll('span');
          for (let span of spans) {
            if (searchTexts[subType] && span.textContent.includes(searchTexts[subType].split(' ')[0])) {
              headerEl = span.parentElement;
              while (headerEl && !headerEl.id) {
                headerEl = headerEl.parentElement;
              }
              break;
            }
          }
        }
        
        if (headerEl) {
          headerEl.classList.remove('border-2', 'border-green-500', 'rounded');
        }
        
        if (subType === 'doorOpenings' || subType === 'windowOpenings' || subType === 'balconyOpenings') {
          headerEl.classList.remove('text-green-600', 'font-semibold');
        }
      }

      updateWhatToDoRoomCardState(roomId, 'demo');
      updateWhatToDoSectionStates();
    }
    
    function updateEngineeringCount(roomId, workType, delta) {
      const input = document.getElementById(roomId + '_' + workType + 'Count');
      if (!input) return;
      
      let count = parseInt(input.value) || 0;
      count = Math.max(0, count + delta);
      input.value = count;
      
      renderEngineeringFields(roomId, workType, count);
    }
    
    function handleEngineeringInput(roomId, workType) {
      const input = document.getElementById(roomId + '_' + workType + 'Count');
      if (!input) return;
      
      let count = parseInt(input.value) || 0;
      count = Math.max(0, count);
      
      renderEngineeringFields(roomId, workType, count);
    }
    
    function renderEngineeringFields(roomId, workType, count) {
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = { engineering: {} };
      if (!roomData.demolitionData[roomId].engineering) roomData.demolitionData[roomId].engineering = {};
    }
    
    function updateWaterSupplyCount(roomId, delta) {
      const input = document.getElementById(roomId + '_waterCount');
      if (!input) return;
      
      let count = parseInt(input.value) || 0;
      count = Math.max(0, Math.min(20, count + delta));
      input.value = count;
      
      renderWaterSupplyFields(roomId, count);
      
      if (count === 0) {
        if (!roomData.demolitionData) roomData.demolitionData = {};
        if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
        roomData.demolitionData[roomId].water = [];
      }
      
      checkDemolitionDone(roomId, 'water');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function handleWaterSupplyInput(roomId) {
      const input = document.getElementById(roomId + '_waterCount');
      if (!input) return;
      
      let count = parseInt(input.value) || 0;
      count = Math.max(0, Math.min(20, count));
      input.value = count;
      renderWaterSupplyFields(roomId, count);
      
      if (count === 0) {
        if (!roomData.demolitionData) roomData.demolitionData = {};
        if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
        roomData.demolitionData[roomId].water = [];
      }
      
      checkDemolitionDone(roomId, 'water');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function renderWaterSupplyFields(roomId, count) {
      const container = document.getElementById(roomId + '_waterList');
      if (!container) return;
      
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
      if (!roomData.demolitionData[roomId].water) roomData.demolitionData[roomId].water = [];
      
      const pipeDiameters = {
        steel: ['15', '20', '25', '32', '40', '50'],
        copper: ['10', '12', '15', '18', '22', '28'],
        pp: ['16', '20', '25', '32', '40'],
        metalplastic: ['16', '20', '25', '32'],
        pex: ['16', '20', '25']
      };
      
      const waterTypes = [
        { value: 'steel', label: 'Демонтаж стальных труб', diameters: pipeDiameters.steel },
        { value: 'copper', label: 'Демонтаж медных труб', diameters: pipeDiameters.copper },
        { value: 'pp', label: 'Демонтаж полипропиленовых труб', diameters: pipeDiameters.pp },
        { value: 'metalplastic', label: 'Демонтаж металлопластиковых труб', diameters: pipeDiameters.metalplastic },
        { value: 'pex', label: 'Демонтаж PEX-труб', diameters: pipeDiameters.pex },
        { value: 'valve', label: 'Демонтаж запорной арматуры', unit: 'шт.' },
        { value: 'collector', label: 'Демонтаж коллекторов', unit: 'шт.' },
        { value: 'filter', label: 'Демонтаж фильтров', unit: 'шт.' },
        { value: 'reducer', label: 'Демонтаж редукторов давления', unit: 'шт.' }
      ];
      
      let html = '';
      for (let i = 0; i < count; i++) {
        const existing = roomData.demolitionData[roomId].water[i] || {};
        const existingType = existing.type || '';
        const existingDiameter = existing.diameter || '';
        
        const isPipeType = ['steel', 'copper', 'pp', 'metalplastic', 'pex'].includes(existingType);
        const currentType = waterTypes.find(t => t.value === existingType);
        
        let diameterOptions = '';
        if (currentType && currentType.diameters) {
          diameterOptions = currentType.diameters.map(d => `<option value="${d}" ${existingDiameter === d ? 'selected' : ''}>${d}</option>`).join('');
        }
        
        html += `
          <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
            <div class="flex flex-wrap items-end gap-2">
              <div>
                <label class="text-xs text-gray-500">Тип работ:</label>
                <select id="${roomId}_water_${i}_type" class="md:w-[280px] px-2 py-1 text-sm border rounded" onchange="updateWaterSupplyData('${roomId}', ${i})">
                  <option value="">Выберите тип работ</option>
                  ${waterTypes.map(t => `<option value="${t.value}" ${existing.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
                </select>
              </div>
              ${isPipeType ? `
              <div>
                <label class="text-xs text-gray-500">Диаметр, мм:</label>
                <select id="${roomId}_water_${i}_diameter" class="w-20 px-2 py-1 text-sm border rounded" onchange="updateWaterSupplyData('${roomId}', ${i})">
                  <option value="">--</option>
                  ${diameterOptions}
                </select>
              </div>` : ''}
              <div>
                <label class="text-xs text-gray-500">${isPipeType ? 'Длина, м:' : (currentType?.unit || 'Кол-во:')}</label>
                <div class="flex items-center gap-1">
                  <button type="button" class="qty-btn-mini" onclick="updateWaterSupplyItemQty('${roomId}', ${i}, -1)">−</button>
                  <input type="number" id="${roomId}_water_${i}_qty" value="${existing.qty || 0}" min="0" class="w-16 px-2 py-1 text-sm border rounded" onchange="updateWaterSupplyData('${roomId}', ${i})">
                  <button type="button" class="qty-btn-mini" onclick="updateWaterSupplyItemQty('${roomId}', ${i}, 1)">+</button>
                </div>
              </div>
            </div>
          </div>`;
      }
      container.innerHTML = html;
      checkDemolitionDone(roomId, 'water');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function updateWaterSupplyData(roomId, index) {
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
      if (!roomData.demolitionData[roomId].water) roomData.demolitionData[roomId].water = [];
      
      const type = document.getElementById(roomId + '_water_' + index + '_type')?.value || '';
      const diameter = document.getElementById(roomId + '_water_' + index + '_diameter')?.value || '';
      const qty = parseFloat(document.getElementById(roomId + '_water_' + index + '_qty')?.value) || 0;
      
      roomData.demolitionData[roomId].water[index] = { type, diameter, qty };
      
      const isPipeType = ['steel', 'copper', 'pp', 'metalplastic', 'pex'].includes(type);
      const container = document.getElementById(roomId + '_waterList');
      if (container) {
        renderWaterSupplyFields(roomId, parseInt(document.getElementById(roomId + '_waterCount')?.value) || 0);
      }
      
      checkDemolitionDone(roomId, 'water');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function updateWaterSupplyItemQty(roomId, index, delta) {
      const input = document.getElementById(roomId + '_water_' + index + '_qty');
      if (!input) return;
      
      let qty = parseFloat(input.value) || 0;
      qty = Math.max(0, qty + delta);
      input.value = qty;
      
      updateWaterSupplyData(roomId, index);
    }
    
    function updateDrainageCount(roomId, delta) {
      const input = document.getElementById(roomId + '_drainageCount');
      if (!input) return;
      
      let count = parseInt(input.value) || 0;
      count = Math.max(0, Math.min(20, count + delta));
      input.value = count;
      
      renderDrainageFields(roomId, count);
      
      if (count === 0) {
        if (!roomData.demolitionData) roomData.demolitionData = {};
        if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
        roomData.demolitionData[roomId].drainage = [];
      }
      
      checkDemolitionDone(roomId, 'drainage');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function handleDrainageInput(roomId) {
      const input = document.getElementById(roomId + '_drainageCount');
      if (!input) return;
      
      let count = parseInt(input.value) || 0;
      count = Math.max(0, Math.min(20, count));
      input.value = count;
      renderDrainageFields(roomId, count);
      
      if (count === 0) {
        if (!roomData.demolitionData) roomData.demolitionData = {};
        if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
        roomData.demolitionData[roomId].drainage = [];
      }
      
      checkDemolitionDone(roomId, 'drainage');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function renderDrainageFields(roomId, count) {
      const container = document.getElementById(roomId + '_drainageList');
      if (!container) return;
      
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
      if (!roomData.demolitionData[roomId].drainage) roomData.demolitionData[roomId].drainage = [];
      
      const drainageTypes = [
        { value: 'cast_iron', label: 'Демонтаж чугунных канализационных труб', diameters: ['50', '100', '150'], unit: 'пог.м' },
        { value: 'flue', label: 'Демонтаж фановых труб', diameters: ['110', '160'], unit: 'пог.м' },
        { value: 'plastic', label: 'Демонтаж пластиковых канализационных труб', diameters: ['32', '40', '50', '110', '160'], unit: 'пог.м' },
        { value: 'fitting', label: 'Демонтаж канализационных фитингов', unit: 'шт.' },
        { value: 'syphon', label: 'Демонтаж сифонов', unit: 'шт.' },
        { value: 'stand', label: 'Демонтаж канализационных стояков', hasDiameter: true, hasLength: true, unit: 'шт.' },
        { value: 'hydrolock', label: 'Демонтаж гидрозатворов', unit: 'шт.' },
        { value: 'revision', label: 'Демонтаж ревизионных люков', unit: 'шт.' },
        { value: 'well', label: 'Демонтаж канализационных колодцев', hasDiameter: true, hasDepth: true, unit: 'шт.' }
      ];
      
      let html = '';
      for (let i = 0; i < count; i++) {
        const existing = roomData.demolitionData[roomId].drainage[i] || {};
        const existingType = existing.type || '';
        const existingDiameter = existing.diameter || '';
        const existingLength = existing.length || '';
        const existingDepth = existing.depth || '';
        
        const currentType = drainageTypes.find(t => t.value === existingType);
        const showDiameter = currentType?.diameters || currentType?.hasDiameter;
        const showLength = currentType?.hasLength;
        const showDepth = currentType?.hasDepth;
        
        html += `
          <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
            <div class="flex flex-wrap items-end gap-2">
              <div>
                <label class="text-xs text-gray-500">Вид работы:</label>
                <select id="${roomId}_drainage_${i}_type" class="md:w-[280px] px-2 py-1 text-sm border rounded" onchange="updateDrainageData('${roomId}', ${i})">
                  <option value="">Выберите вид работы</option>
                  ${drainageTypes.map(t => `<option value="${t.value}" ${existing.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
                </select>
              </div>
              ${showDiameter ? `
              <div>
                <label class="text-xs text-gray-500">Диаметр, мм:</label>
                <select id="${roomId}_drainage_${i}_diameter" class="w-20 px-2 py-1 text-sm border rounded" onchange="updateDrainageData('${roomId}', ${i})">
                  <option value="">--</option>
                  ${currentType?.diameters ? currentType.diameters.map(d => `<option value="${d}" ${existingDiameter === d ? 'selected' : ''}>${d}</option>`).join('') : ''}
                </select>
              </div>` : ''}
              ${showLength ? `
              <div>
                <label class="text-xs text-gray-500">Длина, м:</label>
                <input type="number" id="${roomId}_drainage_${i}_length" value="${existingLength || ''}" min="0" step="0.1" class="w-16 px-2 py-1 text-sm border rounded" onchange="updateDrainageData('${roomId}', ${i})">
              </div>` : ''}
              ${showDepth ? `
              <div>
                <label class="text-xs text-gray-500">Глубина, м:</label>
                <input type="number" id="${roomId}_drainage_${i}_depth" value="${existingDepth || ''}" min="0" step="0.1" class="w-16 px-2 py-1 text-sm border rounded" onchange="updateDrainageData('${roomId}', ${i})">
              </div>` : ''}
              ${!showLength && !showDepth ? `
              <div>
                <label class="text-xs text-gray-500">${currentType?.unit || 'Кол-во:'}</label>
                <div class="flex items-center gap-1">
                  <button type="button" class="qty-btn-mini" onclick="updateDrainageItemQty('${roomId}', ${i}, -1)">−</button>
                  <input type="number" id="${roomId}_drainage_${i}_qty" value="${existing.qty || 0}" min="0" class="w-16 px-2 py-1 text-sm border rounded" onchange="updateDrainageData('${roomId}', ${i})">
                  <button type="button" class="qty-btn-mini" onclick="updateDrainageItemQty('${roomId}', ${i}, 1)">+</button>
                </div>
              </div>` : ''}
            </div>
          </div>`;
      }
      container.innerHTML = html;
      checkDemolitionDone(roomId, 'drainage');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function updateDrainageData(roomId, index) {
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
      if (!roomData.demolitionData[roomId].drainage) roomData.demolitionData[roomId].drainage = [];
      
      const type = document.getElementById(roomId + '_drainage_' + index + '_type')?.value || '';
      const diameter = document.getElementById(roomId + '_drainage_' + index + '_diameter')?.value || '';
      const length = document.getElementById(roomId + '_drainage_' + index + '_length')?.value || '';
      const depth = document.getElementById(roomId + '_drainage_' + index + '_depth')?.value || '';
      const qty = parseFloat(document.getElementById(roomId + '_drainage_' + index + '_qty')?.value) || 0;
      
      roomData.demolitionData[roomId].drainage[index] = { type, diameter, length, depth, qty };
      
      renderDrainageFields(roomId, parseInt(document.getElementById(roomId + '_drainageCount')?.value) || 0);
      
      checkDemolitionDone(roomId, 'drainage');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function updateDrainageItemQty(roomId, index, delta) {
      const input = document.getElementById(roomId + '_drainage_' + index + '_qty');
      if (!input) return;
      
      let qty = parseFloat(input.value) || 0;
      qty = Math.max(0, qty + delta);
      input.value = qty;
      
      updateDrainageData(roomId, index);
    }
    
    function updatePlumbingCount(roomId, delta) {
      const input = document.getElementById(roomId + '_plumbingCount');
      if (!input) return;
      let count = parseInt(input.value) || 0;
      count = Math.max(0, Math.min(20, count + delta));
      input.value = count;
      renderPlumbingFields(roomId, count);
      if (count === 0) {
        if (!roomData.demolitionData) roomData.demolitionData = {};
        if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
        roomData.demolitionData[roomId].plumbing = [];
      }
      checkDemolitionDone(roomId, 'plumbing');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function handlePlumbingInput(roomId) {
      const input = document.getElementById(roomId + '_plumbingCount');
      if (!input) return;
      let count = parseInt(input.value) || 0;
      count = Math.max(0, Math.min(20, count));
      input.value = count;
      renderPlumbingFields(roomId, count);
      if (count === 0) {
        if (!roomData.demolitionData) roomData.demolitionData = {};
        if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
        roomData.demolitionData[roomId].plumbing = [];
      }
      checkDemolitionDone(roomId, 'plumbing');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function renderPlumbingFields(roomId, count) {
      const container = document.getElementById(roomId + '_plumbingList');
      if (!container) return;
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
      if (!roomData.demolitionData[roomId].plumbing) roomData.demolitionData[roomId].plumbing = [];
      const plumbingTypes = [
        { value: 'sink', label: 'Демонтаж раковины/умывальника', unit: 'шт.' },
        { value: 'bathtub', label: 'Демонтаж ванны', unit: 'шт.' },
        { value: 'shower', label: 'Демонтаж душевой кабины', unit: 'шт.' },
        { value: 'faucet', label: 'Демонтаж смесителей', unit: 'шт.' },
        { value: 'toilet', label: 'Демонтаж унитаза', unit: 'шт.' },
        { value: 'bidet', label: 'Демонтаж биде', unit: 'шт.' },
        { value: 'towel_dryer', label: 'Демонтаж полотенцесушителя', unit: 'шт.' },
        { value: 'washing_machine', label: 'Демонтаж стиральной машины', unit: 'шт.' },
        { value: 'dishwasher', label: 'Демонтаж посудомоечной машины', unit: 'шт.' }
      ];
      let html = '';
      for (let i = 0; i < count; i++) {
        const existing = roomData.demolitionData[roomId].plumbing[i] || {};
        html += '<div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border"><div class="flex flex-wrap items-end gap-2"><div><label class="text-xs text-gray-500">Вид работы:</label><select id="' + roomId + '_plumbing_' + i + '_type" class="md:w-[280px] px-2 py-1 text-sm border rounded" onchange="updatePlumbingData(\'' + roomId + '\', ' + i + ')"><option value="">Выберите вид работы</option>' + plumbingTypes.map(t => '<option value="' + t.value + '"' + (existing.type === t.value ? ' selected' : '') + '>' + t.label + '</option>').join('') + '</select></div><div><label class="text-xs text-gray-500">Кол-во:</label><div class="flex items-center gap-1"><button type="button" class="qty-btn-mini" onclick="updatePlumbingItemQty(\'' + roomId + '\', ' + i + ', -1)">−</button><input type="number" id="' + roomId + '_plumbing_' + i + '_qty" value="' + (existing.qty || 0) + '" min="0" class="w-16 px-2 py-1 text-sm border rounded" onchange="updatePlumbingData(\'' + roomId + '\', ' + i + ')"><button type="button" class="qty-btn-mini" onclick="updatePlumbingItemQty(\'' + roomId + '\', ' + i + ', 1)">+</button></div></div></div></div>';
      }
      container.innerHTML = html;
      checkDemolitionDone(roomId, 'plumbing');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function updatePlumbingData(roomId, index) {
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
      if (!roomData.demolitionData[roomId].plumbing) roomData.demolitionData[roomId].plumbing = [];
      const type = document.getElementById(roomId + '_plumbing_' + index + '_type')?.value || '';
      const qty = parseFloat(document.getElementById(roomId + '_plumbing_' + index + '_qty')?.value) || 0;
      roomData.demolitionData[roomId].plumbing[index] = { type, qty };
      renderPlumbingFields(roomId, parseInt(document.getElementById(roomId + '_plumbingCount')?.value) || 0);
      checkDemolitionDone(roomId, 'plumbing');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function updatePlumbingItemQty(roomId, index, delta) {
      const input = document.getElementById(roomId + '_plumbing_' + index + '_qty');
      if (!input) return;
      let qty = parseFloat(input.value) || 0;
      qty = Math.max(0, qty + delta);
      input.value = qty;
      updatePlumbingData(roomId, index);
    }
    
    function updateHeatingCount(roomId, delta) {
      const input = document.getElementById(roomId + '_heatingCount');
      if (!input) return;
      let count = parseInt(input.value) || 0;
      count = Math.max(0, Math.min(20, count + delta));
      input.value = count;
      renderHeatingFields(roomId, count);
      if (count === 0) {
        if (!roomData.demolitionData) roomData.demolitionData = {};
        if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
        roomData.demolitionData[roomId].heating = [];
      }
      checkDemolitionDone(roomId, 'heating');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function handleHeatingInput(roomId) {
      const input = document.getElementById(roomId + '_heatingCount');
      if (!input) return;
      let count = parseInt(input.value) || 0;
      count = Math.max(0, Math.min(20, count));
      input.value = count;
      renderHeatingFields(roomId, count);
      if (count === 0) {
        if (!roomData.demolitionData) roomData.demolitionData = {};
        if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
        roomData.demolitionData[roomId].heating = [];
      }
      checkDemolitionDone(roomId, 'heating');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function renderHeatingFields(roomId, count) {
      const container = document.getElementById(roomId + '_heatingList');
      if (!container) return;
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
      if (!roomData.demolitionData[roomId].heating) roomData.demolitionData[roomId].heating = [];
      const heatingTypes = [
        { value: 'radiator', label: 'Демонтаж радиатора' },
        { value: 'floor_convector', label: 'Демонтаж внутрипольного конвектора' }
      ];
      let html = '';
      for (let i = 0; i < count; i++) {
        const existing = roomData.demolitionData[roomId].heating[i] || {};
        const existingType = existing.type || '';
        const isRadiator = existingType === 'radiator';
        const isFloorConvector = existingType === 'floor_convector';
        html += '<div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border"><div class="flex flex-wrap items-end gap-2"><div><label class="text-xs text-gray-500">Вид работы:</label><select id="' + roomId + '_heating_' + i + '_type" class="md:w-[280px] px-2 py-1 text-sm border rounded" onchange="updateHeatingData(\'' + roomId + '\', ' + i + ')"><option value="">Выберите вид работы</option>' + heatingTypes.map(t => '<option value="' + t.value + '"' + (existing.type === t.value ? ' selected' : '') + '>' + t.label + '</option>').join('') + '</select></div>';
        if (existingType) {
          html += '<div class="flex flex-wrap items-end gap-2"><div><label class="text-xs text-gray-500">Кол-во:</label><div class="flex items-center gap-1"><button type="button" class="qty-btn-mini" onclick="updateHeatingItemQty(\'' + roomId + '\', ' + i + ', -1)">−</button><input type="number" id="' + roomId + '_heating_' + i + '_qty" value="' + (existing.qty || 0) + '" min="0" class="w-16 px-2 py-1 text-sm border rounded" onchange="updateHeatingData(\'' + roomId + '\', ' + i + ')"><button type="button" class="qty-btn-mini" onclick="updateHeatingItemQty(\'' + roomId + '\', ' + i + ', 1)">+</button></div></div>';
          if (isRadiator) {
            const materials = ['Чугунные', 'Биметаллические', 'Алюминиевые', 'Стальные'];
            const mountings = ['Боковое', 'Нижнее'];
            const standards = ['Стандартное', 'Нестандартное'];
            html += '<div class="mr-2"><label class="text-xs text-gray-500 block mb-1">Материал:</label><select id="' + roomId + '_heating_' + i + '_material" class="w-28 md:w-[160px] px-2 py-1 text-sm border rounded" onchange="updateHeatingData(\'' + roomId + '\', ' + i + ')"><option value="">Выберите</option>' + materials.map(m => '<option value="' + m.toLowerCase() + '"' + (existing.material === m.toLowerCase() ? ' selected' : '') + '>' + m + '</option>').join('') + '</select></div><div class="mr-2"><label class="text-xs text-gray-500 block mb-1">Крепление:</label><select id="' + roomId + '_heating_' + i + '_mounting" class="w-24 md:w-[110px] px-2 py-1 text-sm border rounded" onchange="updateHeatingData(\'' + roomId + '\', ' + i + ')"><option value="">Выберите</option>' + mountings.map(m => '<option value="' + m + '"' + (existing.mounting === m ? ' selected' : '') + '>' + m + '</option>').join('') + '</select></div><div><label class="text-xs text-gray-500 block mb-1">Размер:</label><select id="' + roomId + '_heating_' + i + '_standard" class="w-28 md:w-[130px] px-2 py-1 text-sm border rounded" onchange="updateHeatingData(\'' + roomId + '\', ' + i + ')"><option value="">Выберите</option>' + standards.map(s => '<option value="' + s + '"' + (existing.standard === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div>';
            if (existing.standard === 'Нестандартное') {
              html += '<div class="flex items-end gap-2"><div><label class="text-xs text-gray-500">Длина, мм:</label><input type="number" id="' + roomId + '_heating_' + i + '_length" value="' + (existing.length || '') + '" placeholder="Длина" class="w-20 px-2 py-1 text-sm border rounded" onchange="updateHeatingData(\'' + roomId + '\', ' + i + ')"></div><div><label class="text-xs text-gray-500">Ширина, мм:</label><input type="number" id="' + roomId + '_heating_' + i + '_width" value="' + (existing.width || '') + '" placeholder="Ширина" class="w-20 px-2 py-1 text-sm border rounded" onchange="updateHeatingData(\'' + roomId + '\', ' + i + ')"></div></div>';
            }
            html += '</div>';
          } else if (isFloorConvector) {
            html += '<div class="flex items-end gap-2"><div><label class="text-xs text-gray-500">Длина, мм:</label><input type="number" id="' + roomId + '_heating_' + i + '_length" value="' + (existing.length || '') + '" placeholder="Длина" class="w-20 px-2 py-1 text-sm border rounded" onchange="updateHeatingData(\'' + roomId + '\', ' + i + ')"></div><div><label class="text-xs text-gray-500">Ширина, мм:</label><input type="number" id="' + roomId + '_heating_' + i + '_width" value="' + (existing.width || '') + '" placeholder="Ширина" class="w-20 px-2 py-1 text-sm border rounded" onchange="updateHeatingData(\'' + roomId + '\', ' + i + ')"></div></div></div>';
          }
          html += '</div>';
        } else {
          html += '<div><label class="text-xs text-gray-500">Кол-во:</label><div class="flex items-center gap-1"><button type="button" class="qty-btn-mini" onclick="updateHeatingItemQty(\'' + roomId + '\', ' + i + ', -1)">−</button><input type="number" id="' + roomId + '_heating_' + i + '_qty" value="' + (existing.qty || 0) + '" min="0" class="w-16 px-2 py-1 text-sm border rounded" onchange="updateHeatingData(\'' + roomId + '\', ' + i + ')"><button type="button" class="qty-btn-mini" onclick="updateHeatingItemQty(\'' + roomId + '\', ' + i + ', 1)">+</button></div></div></div>';
        }
        html += '</div>';
      }
      container.innerHTML = html;
      checkDemolitionDone(roomId, 'heating');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function updateHeatingData(roomId, index) {
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
      if (!roomData.demolitionData[roomId].heating) roomData.demolitionData[roomId].heating = [];
      const type = document.getElementById(roomId + '_heating_' + index + '_type')?.value || '';
      const qty = parseFloat(document.getElementById(roomId + '_heating_' + index + '_qty')?.value) || 0;
      const material = document.getElementById(roomId + '_heating_' + index + '_material')?.value || '';
      const mounting = document.getElementById(roomId + '_heating_' + index + '_mounting')?.value || '';
      const standard = document.getElementById(roomId + '_heating_' + index + '_standard')?.value || '';
      const length = document.getElementById(roomId + '_heating_' + index + '_length')?.value || '';
      const width = document.getElementById(roomId + '_heating_' + index + '_width')?.value || '';
      roomData.demolitionData[roomId].heating[index] = { type, qty, material, mounting, standard, length, width };
      renderHeatingFields(roomId, parseInt(document.getElementById(roomId + '_heatingCount')?.value) || 0);
      checkDemolitionDone(roomId, 'heating');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function updateHeatingItemQty(roomId, index, delta) {
      const input = document.getElementById(roomId + '_heating_' + index + '_qty');
      if (!input) return;
      let qty = parseFloat(input.value) || 0;
      qty = Math.max(0, qty + delta);
      input.value = qty;
      updateHeatingData(roomId, index);
    }
    
    function ensureFinishingDataStructure(roomId) {
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
      const existing = roomData.demolitionData[roomId].finishing;
      if (!existing || Array.isArray(existing)) {
        roomData.demolitionData[roomId].finishing = { floor: [], wall: [], ceiling: [] };
      } else {
        if (!Array.isArray(existing.floor)) existing.floor = [];
        if (!Array.isArray(existing.wall)) existing.wall = [];
        if (!Array.isArray(existing.ceiling)) existing.ceiling = [];
      }
return roomData.demolitionData[roomId].finishing;
    }
    
    function ensureRepairDataStructure(roomId) {
      if (!roomData.repairData) roomData.repairData = {};
      if (!roomData.repairData[roomId]) roomData.repairData[roomId] = {};
      const existing = roomData.repairData[roomId];
      if (!existing.rough) existing.rough = { floorLeveling: [], wallPlaster: [], wallPutty: [], ceilingPrep: [] };
      if (!existing.engineering) existing.engineering = { electrical: [], ventilation: [], water: [], drainage: [], heating: [] };
      if (!Array.isArray(existing.engineering.electrical)) existing.engineering.electrical = [];
      if (!Array.isArray(existing.engineering.ventilation)) existing.engineering.ventilation = [];
      if (!Array.isArray(existing.engineering.water)) existing.engineering.water = [];
      if (!Array.isArray(existing.engineering.drainage)) existing.engineering.drainage = [];
      if (!Array.isArray(existing.engineering.heating)) existing.engineering.heating = [];
      if (!existing.finishing) existing.finishing = { floor: [], wall: [], ceiling: [], stairs: [], openings: { door: [], window: [], balcony: [] } };
      if (!Array.isArray(existing.finishing.stairs)) existing.finishing.stairs = [];
      if (!existing.finishing.openings) existing.finishing.openings = { door: [], window: [], balcony: [] };
      if (!Array.isArray(existing.finishing.openings.door)) existing.finishing.openings.door = [];
      if (!Array.isArray(existing.finishing.openings.window)) existing.finishing.openings.window = [];
      if (!Array.isArray(existing.finishing.openings.balcony)) existing.finishing.openings.balcony = [];
      return roomData.repairData[roomId];
    }
    
    function getRepairRoomMetrics(roomId) {
      let source = null;
      let label = roomId;
      
      const livingMatch = roomId.match(/^repair_living_(\d+)$/);
      const nonlivingMatch = roomId.match(/^repair_nonliving_(\d+)$/);
      const nonlivingFloorMatch = roomId.match(/^repair_nonliving_(\d+)_(\d+)$/);
      
      if (livingMatch && roomData.living?.livingRooms?.[parseInt(livingMatch[1], 10)]) {
        source = roomData.living.livingRooms[parseInt(livingMatch[1], 10)];
        label = 'living';
      } else if (nonlivingMatch && roomData.nonliving?.livingRooms?.[parseInt(nonlivingMatch[1], 10)]) {
        source = roomData.nonliving.livingRooms[parseInt(nonlivingMatch[1], 10)];
        label = 'nonliving';
      } else if (nonlivingFloorMatch && roomData.nonliving?.floors?.[parseInt(nonlivingFloorMatch[1], 10)]?.livingRooms?.[parseInt(nonlivingFloorMatch[2], 10)]) {
        source = roomData.nonliving.floors[parseInt(nonlivingFloorMatch[1], 10)].livingRooms[parseInt(nonlivingFloorMatch[2], 10)];
        label = 'nonliving-floor';
      }
      
      if (source) {
        const computedWallsArea = Number(source.wallsArea || 0) > 0
          ? Number(source.wallsArea || 0)
          : Number(calculateLivingRoomWallsArea(source) || 0);
        return {
          floorArea: Number(source.area || source.floorArea || 0),
          wallsArea: computedWallsArea,
          ceilingArea: Number(source.area || source.floorArea || 0),
          height: Number(source.height || 2.7)
        };
      }
      return { floorArea: 0, wallsArea: 0, ceilingArea: 0, height: 2.7 };
    }
    
    function getDemolitionRoomMetrics(roomId) {
      let source = null;
      let label = roomId;

      const livingMatch = roomId.match(/^demo_living_(\d+)$/);
      const nonlivingFlatMatch = roomId.match(/^demo_nonliving_(\d+)$/);
      const nonlivingFloorMatch = roomId.match(/^demo_nonliving_(\d+)_(\d+)$/);

      if (livingMatch && roomData.living?.livingRooms?.[parseInt(livingMatch[1], 10)]) {
        source = roomData.living.livingRooms[parseInt(livingMatch[1], 10)];
        label = `\u0416\u0438\u043B\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435_${parseInt(livingMatch[1], 10) + 1}`;
      } else if (nonlivingFloorMatch && roomData.nonliving?.floors?.[parseInt(nonlivingFloorMatch[1], 10)]?.livingRooms?.[parseInt(nonlivingFloorMatch[2], 10)]) {
        source = roomData.nonliving.floors[parseInt(nonlivingFloorMatch[1], 10)].livingRooms[parseInt(nonlivingFloorMatch[2], 10)];
        label = `\u041D\u0435\u0436\u0438\u043B\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435_${parseInt(nonlivingFloorMatch[1], 10) + 1}_${parseInt(nonlivingFloorMatch[2], 10) + 1}`;
      } else if (nonlivingFlatMatch && roomData.nonliving?.livingRooms?.[parseInt(nonlivingFlatMatch[1], 10)]) {
        source = roomData.nonliving.livingRooms[parseInt(nonlivingFlatMatch[1], 10)];
        label = `\u041D\u0435\u0436\u0438\u043B\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435_${parseInt(nonlivingFlatMatch[1], 10) + 1}`;
      }

      return {
        label,
        floorArea: Number(source?.area || 0),
        wallsArea: Number(source?.wallsArea || 0)
      };
    }

    const demolitionFinishingOptions = {
      floor: [
        '\u041B\u0438\u043D\u043E\u043B\u0435\u0443\u043C',
        '\u041A\u0435\u0440\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043F\u043B\u0438\u0442\u043A\u0430',
        '\u041A\u0435\u0440\u0430\u043C\u043E\u0433\u0440\u0430\u043D\u0438\u0442',
        '\u041A\u0432\u0430\u0440\u0446\u0432\u0438\u043D\u0438\u043B\u043E\u0432\u0430\u044F \u043F\u043B\u0438\u0442\u043A\u0430',
        '\u041B\u0430\u043C\u0438\u043D\u0430\u0442',
        '\u041A\u043E\u0432\u0440\u043E\u043B\u0438\u043D',
        '\u0418\u043D\u0436\u0435\u043D\u0435\u0440\u043D\u0430\u044F \u0434\u043E\u0441\u043A\u0430',
        '\u041F\u0430\u0440\u043A\u0435\u0442\u043D\u0430\u044F \u0434\u043E\u0441\u043A\u0430',
        '\u041C\u0430\u0441\u0441\u0438\u0432\u043D\u0430\u044F \u0434\u043E\u0441\u043A\u0430',
        '\u041F\u0430\u0440\u043A\u0435\u0442',
        '\u041F\u0440\u043E\u0431\u043A\u043E\u0432\u043E\u0435 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435',
        '\u041D\u0430\u043B\u0438\u0432\u043D\u043E\u0439 \u043F\u043E\u043B',
        '\u0421\u0443\u0445\u0430\u044F \u0441\u0442\u044F\u0436\u043A\u0430',
        '\u0426\u0435\u043C\u0435\u043D\u0442\u043D\u043E-\u043F\u0435\u0441\u0447\u0430\u043D\u0430\u044F \u0441\u0442\u044F\u0436\u043A\u0430 \u0434\u043E 5 \u0441\u043C',
        '\u0426\u0435\u043C\u0435\u043D\u0442\u043D\u043E-\u043F\u0435\u0441\u0447\u0430\u043D\u0430\u044F \u0441\u0442\u044F\u0436\u043A\u0430 \u043E\u0442 5 \u0441\u043C',
        '\u0410\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u0446\u0435\u043C\u0435\u043D\u0442\u043D\u043E-\u043F\u0435\u0441\u0447\u0430\u043D\u0430\u044F \u0441\u0442\u044F\u0436\u043A\u0430 \u0434\u043E 5 \u0441\u043C',
        '\u0410\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u0446\u0435\u043C\u0435\u043D\u0442\u043D\u043E-\u043F\u0435\u0441\u0447\u0430\u043D\u0430\u044F \u0441\u0442\u044F\u0436\u043A\u0430 \u043E\u0442 5 \u0441\u043C',
        '\u0421\u043D\u044F\u0442\u0438\u0435 \u043B\u044E\u0431\u043E\u0433\u043E \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u044F \u0430\u043B\u043C\u0430\u0437\u043D\u043E\u0439 \u0440\u0435\u0437\u043A\u043E\u0439 \u043D\u0430 \u0441\u0435\u0433\u043C\u0435\u043D\u0442\u044B',
        '\u041A\u0438\u0440\u043F\u0438\u0447\u043D\u0430\u044F \u043A\u043B\u0430\u0434\u043A\u0430'
      ],
      wall: [
        '\u041E\u0431\u043E\u0438',
        '\u041F\u043E\u043A\u0440\u0430\u0441\u043A\u0430',
        '\u0414\u0435\u043A\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430',
        '\u041C\u0438\u043A\u0440\u043E\u0446\u0435\u043C\u0435\u043D\u0442',
        '\u0413\u0438\u043F\u0441\u043E\u0432\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0434\u043E 3 \u0441\u043C.',
        '\u0413\u0438\u043F\u0441\u043E\u0432\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0434\u043E 5 \u0441\u043C.',
        '\u0410\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u0433\u0438\u043F\u0441\u043E\u0432\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0434\u043E 5 \u0441\u043C.',
        '\u0426\u0435\u043C\u0435\u043D\u0442\u043D\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0434\u043E 3 \u0441\u043C.',
        '\u0426\u0435\u043C\u0435\u043D\u0442\u043D\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0434\u043E 5 \u0441\u043C.',
        '\u0410\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u0446\u0435\u043C\u0435\u043D\u0442\u043D\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0434\u043E 3 \u0441\u043C.',
        '\u0410\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u0446\u0435\u043C\u0435\u043D\u0442\u043D\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0434\u043E 5 \u0441\u043C.',
        '\u041A\u0435\u0440\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043F\u043B\u0438\u0442\u043A\u0430',
        '\u041A\u0435\u0440\u0430\u043C\u043E\u0433\u0440\u0430\u043D\u0438\u0442',
        '\u041C\u043E\u0437\u0430\u0438\u043A\u0430',
        '\u041C\u0414\u0424/\u041F\u0412\u0425 \u043F\u0430\u043D\u0435\u043B\u0438',
        '\u0420\u0435\u0435\u0447\u043D\u044B\u0435/\u0434\u0435\u043A\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0435 \u043F\u0430\u043D\u0435\u043B\u0438',
        '\u041F\u0430\u043D\u0435\u043B\u0438'
      ],
      ceiling: [
        '\u041F\u043E\u0434\u0432\u0435\u0441\u043D\u044B\u0435 \u043F\u043E\u0442\u043E\u043B\u043A\u0438',
        '\u041D\u0430\u0442\u044F\u0436\u043D\u044B\u0435 \u043F\u043E\u0442\u043E\u043B\u043A\u0438',
        '\u0420\u0435\u0435\u0447\u043D\u044B\u0435 \u043F\u043E\u0442\u043E\u043B\u043A\u0438',
        '\u0413\u0438\u043F\u0441\u043E\u043A\u0430\u0440\u0442\u043E\u043D\u043D\u044B\u0439 \u043F\u043E\u0442\u043E\u043B\u043E\u043A',
        '\u041A\u0430\u0441\u0441\u0435\u0442\u043D\u044B\u0439 / \u0410\u0440\u043C\u0441\u0442\u0440\u043E\u043D\u0433',
        '\u0413\u0440\u0438\u043B\u044C\u044F\u0442\u043E',
        '\u041A\u0440\u0430\u0441\u043A\u0430',
        '\u0413\u0438\u043F\u0441\u043E\u0432\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430',
        '\u0413\u0438\u0434\u0440\u043E\u0438\u0437\u043E\u043B\u044F\u0446\u0438\u044F'
      ]
    };
    
    const repairRoughOptions = {
      floorLeveling: [
        '\u0426\u0435\u043C\u0435\u043D\u0442\u043D\u043E-\u043F\u0435\u0441\u0447\u0430\u043D\u0430\u044F \u0441\u0442\u044F\u0436\u043A\u0430 \u0434\u043E 5 \u0441\u043C',
        '\u0426\u0435\u043C\u0435\u043D\u0442\u043D\u043E-\u043F\u0435\u0441\u0447\u0430\u043D\u0430\u044F \u0441\u0442\u044F\u0436\u043A\u0430 \u043E\u0442 5 \u0441\u043C',
        '\u041D\u0430\u043B\u0438\u0432\u043D\u043E\u0439 \u043F\u043E\u043B',
        '\u041F\u043E\u043B\u0443\u0441\u0443\u0445\u0430\u044F \u0441\u0442\u044F\u0436\u043A\u0430',
        '\u0421\u0443\u0445\u0430\u044F \u0441\u0442\u044F\u0436\u043A\u0430 (\u041A\u043D\u0430\u0443\u0444)',
        '\u041F\u043E\u043B\u0438\u043C\u0435\u0440\u043D\u044B\u0439 \u043D\u0430\u043B\u0438\u0432\u043D\u043E\u0439 \u043F\u043E\u043B',
        '\u0413\u0438\u0434\u0440\u043E\u0438\u0437\u043E\u043B\u044F\u0446\u0438\u044F \u043F\u043E\u043B\u0430',
        '\u0428\u0443\u043C\u043E\u0438\u0437\u043E\u043B\u044F\u0446\u0438\u044F \u043F\u043E\u043B\u0430',
        '\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u044F \u043F\u043E\u0434 \u0442\u0435\u043F\u043B\u044B\u0439 \u043F\u043E\u043B'
      ],
      wallPlaster: [
        '\u0413\u0438\u043F\u0441\u043E\u0432\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0434\u043E 3 \u0441\u043C',
        '\u0413\u0438\u043F\u0441\u043E\u0432\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0434\u043E 5 \u0441\u043C',
        '\u0426\u0435\u043C\u0435\u043D\u0442\u043D\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0434\u043E 3 \u0441\u043C',
        '\u0426\u0435\u043C\u0435\u043D\u0442\u043D\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0434\u043E 5 \u0441\u043C',
        '\u041C\u0430\u0448\u0438\u043D\u043D\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430',
        '\u0410\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u043F\u043E \u0441\u0435\u0442\u043A\u0435',
        '\u0410\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0438 \u0434\u043E\u0431\u0430\u0432\u043A\u043E\u0439 \u0432 \u0441\u043C\u0435\u0441\u044C',
        '\u041E\u0431\u043B\u0438\u0446\u043E\u0432\u043A\u0430 \u0441\u0442\u0435\u043D \u0413\u041A\u041B \u043F\u043E \u043A\u0430\u0440\u043A\u0430\u0441\u0443',
        '\u0417\u0432\u0443\u043A\u043E\u0438\u0437\u043E\u043B\u044F\u0446\u0438\u044F \u0441\u0442\u0435\u043D'
      ],
      wallPutty: [
        '\u0428\u043F\u0430\u043A\u043B\u0435\u0432\u043A\u0430 \u043F\u043E\u0434 \u043E\u0431\u043E\u0438',
        '\u0428\u043F\u0430\u043A\u043B\u0435\u0432\u043A\u0430 \u043F\u043E\u0434 \u043F\u043E\u043A\u0440\u0430\u0441\u043A\u0443',
        '\u0428\u043F\u0430\u043A\u043B\u0435\u0432\u043A\u0430 \u0412\u0435\u0442\u043E\u043D\u0438\u0442',
        '\u0428\u043F\u0430\u043A\u043B\u0435\u0432\u043A\u0430 \u0420\u043E\u0442\u0431\u0430\u043D\u0434',
        '\u0413\u0440\u0443\u043D\u0442\u043E\u0432\u043A\u0430 \u0441\u0442\u0435\u043D',
        '\u0421\u0442\u0435\u043A\u043B\u043E\u0445\u043E\u043B\u0441\u0442 / \u043C\u0430\u043B\u044F\u0440\u043D\u044B\u0439 \u0445\u043E\u043B\u0441\u0442',
        '\u0417\u0430\u0434\u0435\u043B\u043A\u0430 \u0448\u0432\u043E\u0432 \u0413\u041A\u041B'
      ],
      ceilingPrep: [
        '\u0412\u044B\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u043D\u0438\u0435 \u043F\u043E\u0442\u043E\u043B\u043A\u0430',
        '\u0428\u043F\u0430\u043A\u043B\u0435\u0432\u043A\u0430 \u043F\u043E\u0442\u043E\u043B\u043A\u0430',
        '\u0413\u0440\u0443\u043D\u0442\u043E\u0432\u043A\u0430',
        '\u0421\u0442\u0435\u043A\u043B\u043E\u0445\u043E\u043B\u0441\u0442 \u043D\u0430 \u043F\u043E\u0442\u043E\u043B\u043E\u043A',
        '\u0417\u0432\u0443\u043A\u043E\u0438\u0437\u043E\u043B\u044F\u0446\u0438\u044F \u043F\u043E\u0442\u043E\u043B\u043A\u0430'
      ]
    };
    
    const repairEngineeringOptions = {
      electrical: [
        { value: 'socket_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0440\u043E\u0437\u0435\u0442\u043E\u043A', measure: 'qty' },
        { value: 'socket_child_protection', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0440\u043E\u0437\u0435\u0442\u043E\u043A \u0441 \u0437\u0430\u0449\u0438\u0442\u043E\u0439 \u043E\u0442 \u0434\u0435\u0442\u0435\u0439', measure: 'qty' },
        { value: 'socket_moisture_proof', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u043B\u0430\u0433\u043E\u0437\u0430\u0449\u0438\u0449\u0435\u043D\u043D\u044B\u0445 \u0440\u043E\u0437\u0435\u0442\u043E\u043A', measure: 'qty' },
        { value: 'switch_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u044B\u043A\u043B\u044E\u0447\u0430\u0442\u0435\u043B\u0435\u0439', measure: 'qty' },
        { value: 'socket_group', label: '\u0421\u0431\u043E\u0440\u043A\u0430 \u0431\u043B\u043E\u043A\u0430 \u0440\u043E\u0437\u0435\u0442\u043E\u043A/\u0432\u044B\u043A\u043B\u044E\u0447\u0430\u0442\u0435\u043B\u0435\u0439', measure: 'qty' },
        { value: 'subsocket', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0434\u0440\u043E\u0437\u0435\u0442\u043D\u0438\u043A\u043E\u0432', measure: 'qty' },
        { value: 'junction_box', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0440\u0430\u0441\u043F\u0430\u0435\u0447\u043D\u044B\u0445 \u043A\u043E\u0440\u043E\u0431\u043E\u043A', measure: 'qty' },
        { value: 'wiring_hidden', label: '\u041F\u0440\u043E\u043A\u043B\u0430\u0434\u043A\u0430 \u0441\u043A\u0440\u044B\u0442\u043E\u0439 \u044D\u043B\u0435\u043A\u0442\u0440\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u043A\u0438', measure: 'length' },
        { value: 'wiring_open', label: '\u041F\u0440\u043E\u043A\u043B\u0430\u0434\u043A\u0430 \u043E\u0442\u043A\u0440\u044B\u0442\u043E\u0439 \u044D\u043B\u0435\u043A\u0442\u0440\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u043A\u0438', measure: 'length' },
        { value: 'wall_chasing', label: '\u0428\u0442\u0440\u043E\u0431\u043B\u0435\u043D\u0438\u0435 \u043F\u043E\u0434 \u043A\u0430\u0431\u0435\u043B\u044C', measure: 'length' },
        { value: 'corrugation', label: '\u041F\u0440\u043E\u043A\u043B\u0430\u0434\u043A\u0430 \u043A\u0430\u0431\u0435\u043B\u044F \u0432 \u0433\u043E\u0444\u0440\u0435', measure: 'length' },
        { value: 'cable_channel', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043A\u0430\u0431\u0435\u043B\u044C-\u043A\u0430\u043D\u0430\u043B\u0430', measure: 'length' },
        { value: 'led_strip', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0441\u0432\u0435\u0442\u043E\u0434\u0438\u043E\u0434\u043D\u043E\u0439 \u043B\u0435\u043D\u0442\u044B', measure: 'length' },
        { value: 'spot_light', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0442\u043E\u0447\u0435\u0447\u043D\u044B\u0445 \u0441\u0432\u0435\u0442\u0438\u043B\u044C\u043D\u0438\u043A\u043E\u0432', measure: 'qty' },
        { value: 'light_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0441\u0432\u0435\u0442\u0438\u043B\u044C\u043D\u0438\u043A\u043E\u0432', measure: 'qty' },
        { value: 'chandelier_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043B\u044E\u0441\u0442\u0440', measure: 'qty' },
        { value: 'wall_light', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0431\u0440\u0430/\u043D\u0430\u0441\u0442\u0435\u043D\u043D\u044B\u0445 \u0441\u0432\u0435\u0442\u0438\u043B\u044C\u043D\u0438\u043A\u043E\u0432', measure: 'qty' },
        { value: 'fan_install', label: '\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0432\u044B\u0442\u044F\u0436\u043D\u043E\u0433\u043E \u0432\u0435\u043D\u0442\u0438\u043B\u044F\u0442\u043E\u0440\u0430', measure: 'qty' },
        { value: 'panel_install', label: '\u0421\u0431\u043E\u0440\u043A\u0430 \u0438 \u043C\u043E\u043D\u0442\u0430\u0436 \u044D\u043B\u0435\u043A\u0442\u0440\u043E\u0449\u0438\u0442\u0430', measure: 'qty' },
        { value: 'breaker_install', label: '\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u043E\u0432', measure: 'qty' },
        { value: 'uzo_install', label: '\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0423\u0417\u041E/\u0434\u0438\u0444\u0430\u0432\u0442\u043E\u043C\u0430\u0442\u043E\u0432', measure: 'qty' },
        { value: 'grounding', label: '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u0437\u0430\u0437\u0435\u043C\u043B\u0435\u043D\u0438\u044F / \u0443\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u043D\u0438\u044F \u043F\u043E\u0442\u0435\u043D\u0446\u0438\u0430\u043B\u043E\u0432', measure: 'qty' },
        { value: 'surge_protection', label: '\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0440\u0435\u043B\u0435 \u043D\u0430\u043F\u0440\u044F\u0436\u0435\u043D\u0438\u044F / \u0437\u0430\u0449\u0438\u0442\u044B \u043E\u0442 \u043F\u0435\u0440\u0435\u043D\u0430\u043F\u0440\u044F\u0436\u0435\u043D\u0438\u044F', measure: 'qty' },
        { value: 'weak_current', label: '\u0421\u043B\u0430\u0431\u043E\u0442\u043E\u0447\u043D\u0430\u044F \u0442\u043E\u0447\u043A\u0430', measure: 'qty' },
        { value: 'internet_tv', label: '\u0420\u043E\u0437\u0435\u0442\u043A\u0430 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442/\u0422\u0412', measure: 'qty' },
        { value: 'intercom', label: '\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0434\u043E\u043C\u043E\u0444\u043E\u043D\u0430/\u0437\u0432\u043E\u043D\u043A\u0430', measure: 'qty' },
        { value: 'intercom_video', label: '\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0432\u0438\u0434\u0435\u043E\u0434\u043E\u043C\u043E\u0444\u043E\u043D\u0430', measure: 'qty' },
        { value: 'cctv', label: '\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0432\u0438\u0434\u0435\u043E\u043D\u0430\u0431\u043B\u044E\u0434\u0435\u043D\u0438\u044F / \u043A\u0430\u043C\u0435\u0440\u044B', measure: 'qty' },
        { value: 'smart_home_preparation', label: '\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043F\u043E\u0434 \u0443\u043C\u043D\u044B\u0439 \u0434\u043E\u043C', measure: 'qty' },
        { value: 'smart_home_setup', label: '\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430/\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0443\u043C\u043D\u043E\u0433\u043E \u0434\u043E\u043C\u0430', measure: 'qty' },
        { value: 'smart_home', label: '\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u0441\u0438\u0441\u0442\u0435\u043C\u044B \u0443\u043C\u043D\u044B\u0439 \u0434\u043E\u043C', measure: 'qty' },
        { value: 'smart_curtain', label: '\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0443\u043C\u043D\u044B\u0445 \u0448\u0442\u043E\u0440 / \u043A\u0430\u0440\u043D\u0438\u0437\u0430', measure: 'qty' },
        { value: 'smart_motion_sensor', label: '\u0414\u0430\u0442\u0447\u0438\u043A \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F / \u043F\u0440\u0438\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u044F', measure: 'qty' },
        { value: 'smart_light_sensor', label: '\u0414\u0430\u0442\u0447\u0438\u043A \u0430\u0432\u0442\u043E\u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0441\u0432\u0435\u0442\u0430', measure: 'qty' },
        { value: 'smart_climate_sensor', label: '\u0414\u0430\u0442\u0447\u0438\u043A \u043A\u043B\u0438\u043C\u0430\u0442\u0430 / \u0442\u0435\u0440\u043C\u043E\u0441\u0442\u0430\u0442', measure: 'qty' },
        { value: 'warm_floor_electric', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u044D\u043B\u0435\u043A\u0442\u0440\u0438\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u0442\u0435\u043F\u043B\u043E\u0433\u043E \u043F\u043E\u043B\u0430', measure: 'area' },
        { value: 'thermostat', label: '\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0442\u0435\u0440\u043C\u043E\u0440\u0435\u0433\u0443\u043B\u044F\u0442\u043E\u0440\u0430', measure: 'qty' }
      ],
      ventilation: [
        { value: 'ac_route', label: '\u041F\u0440\u043E\u043A\u043B\u0430\u0434\u043A\u0430 \u0442\u0440\u0430\u0441\u0441\u044B \u043F\u043E\u0434 \u043A\u043E\u043D\u0434\u0438\u0446\u0438\u043E\u043D\u0435\u0440', measure: 'length' },
        { value: 'ac_power', label: '\u041F\u043E\u0434\u0432\u043E\u0434 \u043F\u0438\u0442\u0430\u043D\u0438\u044F \u043A \u043A\u043E\u043D\u0434\u0438\u0446\u0438\u043E\u043D\u0435\u0440\u0443', measure: 'length' },
        { value: 'ac_drain', label: '\u041F\u0440\u043E\u043A\u043B\u0430\u0434\u043A\u0430 \u0434\u0440\u0435\u043D\u0430\u0436\u0430 \u043A\u043E\u043D\u0434\u0438\u0446\u0438\u043E\u043D\u0435\u0440\u0430', measure: 'length' },
        { value: 'ac_bracket', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043A\u0440\u043E\u043D\u0448\u0442\u0435\u0439\u043D\u043E\u0432 \u043A\u043E\u043D\u0434\u0438\u0446\u0438\u043E\u043D\u0435\u0440\u0430', measure: 'qty' },
        { value: 'ac_unit_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0435\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u043A\u043E\u043D\u0434\u0438\u0446\u0438\u043E\u043D\u0435\u0440\u0430', measure: 'qty' },
        { value: 'ac_outdoor_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043D\u0430\u0440\u0443\u0436\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u043A\u043E\u043D\u0434\u0438\u0446\u0438\u043E\u043D\u0435\u0440\u0430', measure: 'qty' },
        { value: 'ac_service_port', label: '\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u0441\u0435\u0440\u0432\u0438\u0441\u043D\u043E\u0433\u043E \u043B\u044E\u043A\u0430 / \u043D\u0438\u0448\u0438', measure: 'qty' },
        { value: 'vent_fan_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u044B\u0442\u044F\u0436\u043D\u043E\u0433\u043E \u0432\u0435\u043D\u0442\u0438\u043B\u044F\u0442\u043E\u0440\u0430', measure: 'qty' },
        { value: 'vent_grille_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u0435\u043D\u0442\u0438\u043B\u044F\u0446\u0438\u043E\u043D\u043D\u043E\u0439 \u0440\u0435\u0448\u0435\u0442\u043A\u0438', measure: 'qty' },
        { value: 'air_duct_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u043E\u0437\u0434\u0443\u0445\u043E\u0432\u043E\u0434\u043E\u0432', measure: 'length' },
        { value: 'air_duct_insulation', label: '\u0422\u0435\u043F\u043B\u043E\u0438\u0437\u043E\u043B\u044F\u0446\u0438\u044F \u0432\u043E\u0437\u0434\u0443\u0445\u043E\u0432\u043E\u0434\u043E\u0432', measure: 'length' },
        { value: 'flex_duct_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0433\u0438\u0431\u043A\u043E\u0433\u043E \u0432\u043E\u0437\u0434\u0443\u0445\u043E\u0432\u043E\u0434\u0430', measure: 'length' },
        { value: 'plenum_box', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043B\u0435\u043D\u0443\u043C\u0430 / \u0440\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0439 \u043A\u043E\u0440\u043E\u0431\u043A\u0438', measure: 'qty' },
        { value: 'diffuser_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u0438\u0444\u0444\u0443\u0437\u043E\u0440\u0430 / \u0430\u043D\u0435\u043C\u043E\u0441\u0442\u0430\u0442\u0430', measure: 'qty' },
        { value: 'vent_valve_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u0440\u0438\u0442\u043E\u0447\u043D\u043E\u0433\u043E \u043A\u043B\u0430\u043F\u0430\u043D\u0430', measure: 'qty' },
        { value: 'wall_drilling', label: '\u0410\u043B\u043C\u0430\u0437\u043D\u043E\u0435 \u0431\u0443\u0440\u0435\u043D\u0438\u0435 \u043F\u043E\u0434 \u0442\u0440\u0430\u0441\u0441\u0443 / \u0432\u043E\u0437\u0434\u0443\u0445\u043E\u0432\u043E\u0434', measure: 'qty' },
        { value: 'vent_shaft_adaptation', label: '\u0410\u0434\u0430\u043F\u0442\u0430\u0446\u0438\u044F \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u043A \u0432\u0435\u043D\u0442\u0448\u0430\u0445\u0442\u0435', measure: 'qty' },
        { value: 'hood_connection', label: '\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u043A\u0443\u0445\u043E\u043D\u043D\u043E\u0439 \u0432\u044B\u0442\u044F\u0436\u043A\u0438', measure: 'qty' },
        { value: 'system_startup', label: '\u041F\u0443\u0441\u043A\u043E\u043D\u0430\u043B\u0430\u0434\u043A\u0430 \u0432\u0435\u043D\u0442\u0438\u043B\u044F\u0446\u0438\u0438 / \u043A\u043E\u043D\u0434\u0438\u0446\u0438\u043E\u043D\u0435\u0440\u0430', measure: 'qty' },
        { value: 'ventilation_panel', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u0435\u043A\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u043E\u0433\u043E \u043A\u043E\u0440\u043E\u0431\u0430 / \u043F\u0430\u043D\u0435\u043B\u0438', measure: 'area' }
      ],
      water: [
        { value: 'water_point', label: '\u0422\u043E\u0447\u043A\u0430 \u0432\u043E\u0434\u043E\u0441\u043D\u0430\u0431\u0436\u0435\u043D\u0438\u044F', measure: 'qty' },
        { value: 'water_pipe_pp', label: '\u0420\u0430\u0437\u0432\u043E\u0434\u043A\u0430 \u043F\u043E\u043B\u0438\u043F\u0440\u043E\u043F\u0438\u043B\u0435\u043D\u043E\u0432\u044B\u0445 \u0442\u0440\u0443\u0431', measure: 'length' },
        { value: 'water_pipe_pex', label: '\u0420\u0430\u0437\u0432\u043E\u0434\u043A\u0430 PEX-\u0442\u0440\u0443\u0431', measure: 'length' },
        { value: 'water_pipe_metalplastic', label: '\u0420\u0430\u0437\u0432\u043E\u0434\u043A\u0430 \u043C\u0435\u0442\u0430\u043B\u043B\u043E\u043F\u043B\u0430\u0441\u0442\u0438\u043A\u043E\u0432\u044B\u0445 \u0442\u0440\u0443\u0431', measure: 'length' },
        { value: 'water_pipe_copper', label: '\u0420\u0430\u0437\u0432\u043E\u0434\u043A\u0430 \u043C\u0435\u0434\u043D\u044B\u0445 \u0442\u0440\u0443\u0431', measure: 'length' },
        { value: 'collector_unit', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043A\u043E\u043B\u043B\u0435\u043A\u0442\u043E\u0440\u043D\u043E\u0433\u043E \u0443\u0437\u043B\u0430', measure: 'qty' },
        { value: 'collector_cabinet', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043A\u043E\u043B\u043B\u0435\u043A\u0442\u043E\u0440\u043D\u043E\u0433\u043E \u0448\u043A\u0430\u0444\u0430', measure: 'qty' },
        { value: 'shutoff_valve', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0437\u0430\u043F\u043E\u0440\u043D\u043E\u0439 \u0430\u0440\u043C\u0430\u0442\u0443\u0440\u044B', measure: 'qty' },
        { value: 'filter_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0444\u0438\u043B\u044C\u0442\u0440\u043E\u0432', measure: 'qty' },
        { value: 'main_filter_unit', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043C\u0430\u0433\u0438\u0441\u0442\u0440\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0444\u0438\u043B\u044C\u0442\u0440\u0430/\u0443\u0437\u043B\u0430 \u0432\u0432\u043E\u0434\u0430', measure: 'qty' },
        { value: 'pressure_reducer', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0440\u0435\u0434\u0443\u043A\u0442\u043E\u0440\u043E\u0432 \u0434\u0430\u0432\u043B\u0435\u043D\u0438\u044F', measure: 'qty' },
        { value: 'water_meter', label: '\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0441\u0447\u0435\u0442\u0447\u0438\u043A\u043E\u0432 \u0432\u043E\u0434\u044B', measure: 'qty' },
        { value: 'boiler_connection', label: '\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0431\u043E\u0439\u043B\u0435\u0440\u0430/\u0432\u043E\u0434\u043E\u043D\u0430\u0433\u0440\u0435\u0432\u0430\u0442\u0435\u043B\u044F', measure: 'qty' },
        { value: 'installation_frame', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0438\u043D\u0441\u0442\u0430\u043B\u043B\u044F\u0446\u0438\u0438', measure: 'qty' },
        { value: 'mixer_connection', label: '\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0441\u043C\u0435\u0441\u0438\u0442\u0435\u043B\u044F / \u0441\u0430\u043D\u0442\u0435\u0445\u043F\u0440\u0438\u0431\u043E\u0440\u0430', measure: 'qty' },
        { value: 'leak_protection', label: '\u0421\u0438\u0441\u0442\u0435\u043C\u0430 \u0437\u0430\u0449\u0438\u0442\u044B \u043E\u0442 \u043F\u0440\u043E\u0442\u0435\u0447\u0435\u043A', measure: 'qty' },
        { value: 'smart_leak_sensor', label: '\u0414\u0430\u0442\u0447\u0438\u043A \u043F\u0440\u043E\u0442\u0435\u0447\u043A\u0438 \u0432\u043E\u0434\u044B', measure: 'qty' }
      ],
      drainage: [
        { value: 'drain_point', label: '\u0422\u043E\u0447\u043A\u0430 \u043A\u0430\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438', measure: 'qty' },
        { value: 'drain_pipe_32', label: '\u041F\u0440\u043E\u043A\u043B\u0430\u0434\u043A\u0430 \u043A\u0430\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0445 \u0442\u0440\u0443\u0431 32 \u043C\u043C', measure: 'length' },
        { value: 'drain_pipe_40', label: '\u041F\u0440\u043E\u043A\u043B\u0430\u0434\u043A\u0430 \u043A\u0430\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0445 \u0442\u0440\u0443\u0431 40 \u043C\u043C', measure: 'length' },
        { value: 'drain_pipe_50', label: '\u041F\u0440\u043E\u043A\u043B\u0430\u0434\u043A\u0430 \u043A\u0430\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0445 \u0442\u0440\u0443\u0431 50 \u043C\u043C', measure: 'length' },
        { value: 'drain_pipe_110', label: '\u041F\u0440\u043E\u043A\u043B\u0430\u0434\u043A\u0430 \u043A\u0430\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0445 \u0442\u0440\u0443\u0431 110 \u043C\u043C', measure: 'length' },
        { value: 'drain_riser', label: '\u041C\u043E\u043D\u0442\u0430\u0436/\u0437\u0430\u043C\u0435\u043D\u0430 \u043A\u0430\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u043E\u043D\u043D\u043E\u0433\u043E \u0441\u0442\u043E\u044F\u043A\u0430', measure: 'qty' },
        { value: 'drain_revision', label: '\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0440\u0435\u0432\u0438\u0437\u0438\u0438', measure: 'qty' },
        { value: 'drain_fan_pipe', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0444\u0430\u043D\u043E\u0432\u043E\u0439 \u0442\u0440\u0443\u0431\u044B', measure: 'length' },
        { value: 'drain_trap', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0442\u0440\u0430\u043F\u0430/\u0441\u043B\u0438\u0432\u0430', measure: 'qty' },
        { value: 'shower_channel', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u0443\u0448\u0435\u0432\u043E\u0433\u043E \u043B\u043E\u0442\u043A\u0430 / \u043A\u0430\u043D\u0430\u043B\u0430', measure: 'qty' },
        { value: 'silent_drainage', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0448\u0443\u043C\u043E\u043F\u043E\u0433\u043B\u043E\u0449\u0430\u044E\u0449\u0435\u0439 \u043A\u0430\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438', measure: 'length' },
        { value: 'drain_pump', label: '\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0441\u043E\u043B\u043E\u043B\u0438\u0444\u0442\u0430/\u043A\u0430\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u043E\u043D\u043D\u043E\u0433\u043E \u043D\u0430\u0441\u043E\u0441\u0430', measure: 'qty' }
      ],
      heating: [
        { value: 'radiator_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0440\u0430\u0434\u0438\u0430\u0442\u043E\u0440\u043E\u0432 \u043E\u0442\u043E\u043F\u043B\u0435\u043D\u0438\u044F', measure: 'qty' },
        { value: 'radiator_bottom_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0440\u0430\u0434\u0438\u0430\u0442\u043E\u0440\u043E\u0432 \u0441 \u043D\u0438\u0436\u043D\u0438\u043C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435\u043C', measure: 'qty' },
        { value: 'radiator_side_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0440\u0430\u0434\u0438\u0430\u0442\u043E\u0440\u043E\u0432 \u0441 \u0431\u043E\u043A\u043E\u0432\u044B\u043C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435\u043C', measure: 'qty' },
        { value: 'radiator_relocation', label: '\u041F\u0435\u0440\u0435\u043D\u043E\u0441 \u0440\u0430\u0434\u0438\u0430\u0442\u043E\u0440\u0430', measure: 'qty' },
        { value: 'radiator_connection', label: '\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0440\u0430\u0434\u0438\u0430\u0442\u043E\u0440\u0430', measure: 'qty' },
        { value: 'convector_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043A\u043E\u043D\u0432\u0435\u043A\u0442\u043E\u0440\u043E\u0432', measure: 'qty' },
        { value: 'infloor_convector', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u043D\u0443\u0442\u0440\u0438\u043F\u043E\u043B\u044C\u043D\u043E\u0433\u043E \u043A\u043E\u043D\u0432\u0435\u043A\u0442\u043E\u0440\u0430', measure: 'qty' },
        { value: 'heated_towel_rail', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u043B\u043E\u0442\u0435\u043D\u0446\u0435\u0441\u0443\u0448\u0438\u0442\u0435\u043B\u044F', measure: 'qty' },
        { value: 'heating_pipe', label: '\u0420\u0430\u0437\u0432\u043E\u0434\u043A\u0430 \u0442\u0440\u0443\u0431 \u043E\u0442\u043E\u043F\u043B\u0435\u043D\u0438\u044F', measure: 'length' },
        { value: 'floor_heating_water', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u043E\u0434\u044F\u043D\u043E\u0433\u043E \u0442\u0435\u043F\u043B\u043E\u0433\u043E \u043F\u043E\u043B\u0430', measure: 'area' },
        { value: 'floor_heating_collector', label: '\u041A\u043E\u043B\u043B\u0435\u043A\u0442\u043E\u0440 \u0442\u0435\u043F\u043B\u043E\u0433\u043E \u043F\u043E\u043B\u0430', measure: 'qty' },
        { value: 'thermostat_heating', label: '\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0442\u0435\u0440\u043C\u043E\u0440\u0435\u0433\u0443\u043B\u044F\u0442\u043E\u0440\u0430', measure: 'qty' },
        { value: 'pump_group', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043D\u0430\u0441\u043E\u0441\u043D\u043E\u0439 \u0433\u0440\u0443\u043F\u043F\u044B', measure: 'qty' },
        { value: 'boiler_install', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043A\u043E\u0442\u043B\u0430', measure: 'qty' },
        { value: 'heat_meter', label: '\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0442\u0435\u043F\u043B\u043E\u0441\u0447\u0435\u0442\u0447\u0438\u043A\u0430', measure: 'qty' },
        { value: 'crimping', label: '\u041E\u043F\u0440\u0435\u0441\u0441\u043E\u0432\u043A\u0430 / \u043F\u0443\u0441\u043A\u043E\u043D\u0430\u043B\u0430\u0434\u043A\u0430 \u0441\u0438\u0441\u0442\u0435\u043C\u044B \u043E\u0442\u043E\u043F\u043B\u0435\u043D\u0438\u044F', measure: 'qty' },
        { value: 'valve_heating', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043A\u0440\u0430\u043D\u043E\u0432/\u0442\u0435\u0440\u043C\u043E\u0433\u043E\u043B\u043E\u0432\u043E\u043A', measure: 'qty' }
      ]
    };

    function getRepairEngineeringOption(category, value) {
      return (repairEngineeringOptions[category] || []).find(option => option.value === value);
    }

    function getRepairEngineeringMeasureMeta(category, value) {
      if (typeof getInstallationMeasureMeta === 'function' && value) {
        return getInstallationMeasureMeta(value, '\u0448\u0442');
      }
      const option = getRepairEngineeringOption(category, value) || repairEngineeringOptions[category]?.[0];
      const measure = option?.measure || 'qty';

      if (measure === 'length') {
        return { field: 'length', label: '\u0414\u043B\u0438\u043D\u0430, \u043C', step: '0.1', min: '0', unit: '\u043C', integer: false };
      }
      if (measure === 'area') {
        return { field: 'area', label: '\u041F\u043B\u043E\u0449\u0430\u0434\u044C, \u043C\u00B2', step: '0.01', min: '0', unit: '\u043C\u00B2', integer: false };
      }
      return { field: 'qty', label: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E, \u0448\u0442', step: '1', min: '0', unit: '\u0448\u0442', integer: true };
    }

    function getRepairEngineeringValue(item, meta) {
      if (!item) return 0;
      return Number(item[meta.field] || 0);
    }

    function getRepairRoughMeasureMeta(category, value) {
      if (typeof getInstallationMeasureMeta === 'function' && value) {
        return getInstallationMeasureMeta(value, '\u043C\u00B2');
      }
      return { field: 'area', label: '\u041F\u043B\u043E\u0449\u0430\u0434\u044C, \u043C\u00B2', step: '0.01', min: '0', unit: '\u043C\u00B2', integer: false };
    }

    function getRepairRoughValue(item, meta) {
      if (!item) return 0;
      return Number(item[meta.field] || 0);
    }
    
    const repairFinishingOptions = {
      floor: [
        { value: 'floor_laminate', label: '\u041B\u0430\u043C\u0438\u043D\u0430\u0442', measure: 'area' },
        { value: 'floor_quartzvinyl', label: '\u041A\u0432\u0430\u0440\u0446\u0432\u0438\u043D\u0438\u043B / SPC', measure: 'area' },
        { value: 'floor_vinyl_glue', label: '\u0412\u0438\u043D\u0438\u043B\u043E\u0432\u0430\u044F \u043F\u043B\u0438\u0442\u043A\u0430 \u043A\u043B\u0435\u0435\u0432\u0430\u044F', measure: 'area' },
        { value: 'floor_parquet_board', label: '\u041F\u0430\u0440\u043A\u0435\u0442\u043D\u0430\u044F \u0434\u043E\u0441\u043A\u0430', measure: 'area' },
        { value: 'floor_engineered', label: '\u0418\u043D\u0436\u0435\u043D\u0435\u0440\u043D\u0430\u044F \u0434\u043E\u0441\u043A\u0430', measure: 'area' },
        { value: 'floor_solid', label: '\u041C\u0430\u0441\u0441\u0438\u0432\u043D\u0430\u044F \u0434\u043E\u0441\u043A\u0430', measure: 'area' },
        { value: 'floor_parquet', label: '\u041F\u0430\u0440\u043A\u0435\u0442', measure: 'area' },
        { value: 'floor_linoleum', label: '\u041B\u0438\u043D\u043E\u043B\u0435\u0443\u043C', measure: 'area' },
        { value: 'floor_carpet', label: '\u041A\u043E\u0432\u0440\u043E\u043B\u0438\u043D', measure: 'area' },
        { value: 'floor_cork', label: '\u041F\u0440\u043E\u0431\u043A\u043E\u0432\u043E\u0435 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435', measure: 'area' },
        { value: 'floor_ceramic', label: '\u041A\u0435\u0440\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043F\u043B\u0438\u0442\u043A\u0430', measure: 'area' },
        { value: 'floor_porcelain', label: '\u041A\u0435\u0440\u0430\u043C\u043E\u0433\u0440\u0430\u043D\u0438\u0442', measure: 'area' },
        { value: 'floor_tile_large_format', label: '\u041A\u0440\u0443\u043F\u043D\u043E\u0444\u043E\u0440\u043C\u0430\u0442\u043D\u044B\u0439 \u043A\u0435\u0440\u0430\u043C\u043E\u0433\u0440\u0430\u043D\u0438\u0442', measure: 'area' },
        { value: 'floor_parquet_herringbone', label: '\u041F\u0430\u0440\u043A\u0435\u0442 \u0451\u043B\u043A\u043E\u0439', measure: 'area' },
        { value: 'floor_microcement', label: '\u041C\u0438\u043A\u0440\u043E\u0446\u0435\u043C\u0435\u043D\u0442', measure: 'area' },
        { value: 'floor_terrazzo', label: '\u0422\u0435\u0440\u0440\u0430\u0446\u0446\u043E / \u0434\u0435\u043A\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0439 \u0431\u0435\u0442\u043E\u043D\u043D\u044B\u0439 \u043F\u043E\u043B', measure: 'area' },
        { value: 'floor_self_leveling_finish', label: '\u041D\u0430\u043B\u0438\u0432\u043D\u043E\u0439 \u043F\u043E\u043B \u0444\u0438\u043D\u0438\u0448\u043D\u044B\u0439', measure: 'area' },
        { value: 'floor_epoxy', label: '\u042D\u043F\u043E\u043A\u0441\u0438\u0434\u043D\u043E\u0435 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435 \u043F\u043E\u043B\u0430', measure: 'area' },
        { value: 'floor_warm_cover', label: '\u0424\u0438\u043D\u0438\u0448\u043D\u043E\u0435 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435 \u043F\u043E \u0442\u0435\u043F\u043B\u043E\u043C\u0443 \u043F\u043E\u043B\u0443', measure: 'area' },
        { value: 'floor_plinth', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043D\u0430\u043F\u043E\u043B\u044C\u043D\u043E\u0433\u043E \u043F\u043B\u0438\u043D\u0442\u0443\u0441\u0430', measure: 'length' },
        { value: 'floor_plinth_hidden', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0441\u043A\u0440\u044B\u0442\u043E\u0433\u043E \u043F\u043B\u0438\u043D\u0442\u0443\u0441\u0430', measure: 'length' },
        { value: 'floor_threshold', label: '\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u043F\u043E\u0440\u043E\u0433\u043E\u0432/\u0441\u0442\u044B\u043A\u043E\u0432\u043E\u0447\u043D\u044B\u0445 \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439', measure: 'qty' },
        { value: 'floor_tile_profile', label: '\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u043F\u043B\u0438\u0442\u043E\u0447\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F', measure: 'length' }
      ],
      wall: [
        { value: 'wall_wallpaper', label: '\u041E\u0431\u043E\u0438', measure: 'area' },
        { value: 'wall_photo_wallpaper', label: '\u0424\u043E\u0442\u043E\u043E\u0431\u043E\u0438', measure: 'area' },
        { value: 'wall_paint', label: '\u041F\u043E\u043A\u0440\u0430\u0441\u043A\u0430', measure: 'area' },
        { value: 'wall_glass_fiber', label: '\u0421\u0442\u0435\u043A\u043B\u043E\u0445\u043E\u043B\u0441\u0442 \u043F\u043E\u0434 \u043F\u043E\u043A\u0440\u0430\u0441\u043A\u0443', measure: 'area' },
        { value: 'wall_decorative_plaster', label: '\u0414\u0435\u043A\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430', measure: 'area' },
        { value: 'wall_venetian_plaster', label: '\u0412\u0435\u043D\u0435\u0446\u0438\u0430\u043D\u0441\u043A\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430', measure: 'area' },
        { value: 'wall_microcement', label: '\u041C\u0438\u043A\u0440\u043E\u0446\u0435\u043C\u0435\u043D\u0442', measure: 'area' },
        { value: 'wall_ceramic', label: '\u041A\u0435\u0440\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043F\u043B\u0438\u0442\u043A\u0430', measure: 'area' },
        { value: 'wall_porcelain', label: '\u041A\u0435\u0440\u0430\u043C\u043E\u0433\u0440\u0430\u043D\u0438\u0442', measure: 'area' },
        { value: 'wall_tile_large_format', label: '\u041A\u0440\u0443\u043F\u043D\u043E\u0444\u043E\u0440\u043C\u0430\u0442\u043D\u0430\u044F \u043F\u043B\u0438\u0442\u043A\u0430', measure: 'area' },
        { value: 'wall_wallpaper_pattern_match', label: '\u041E\u0431\u043E\u0438 \u0441 \u043F\u043E\u0434\u0431\u043E\u0440\u043E\u043C \u0440\u0438\u0441\u0443\u043D\u043A\u0430', measure: 'area' },
        { value: 'wall_mosaic', label: '\u041C\u043E\u0437\u0430\u0438\u043A\u0430', measure: 'area' },
        { value: 'wall_soft_panels', label: '\u041C\u044F\u0433\u043A\u0438\u0435 \u043F\u0430\u043D\u0435\u043B\u0438', measure: 'area' },
        { value: 'wall_laminate', label: '\u041B\u0430\u043C\u0438\u043D\u0430\u0442 \u043D\u0430 \u0441\u0442\u0435\u043D\u0443', measure: 'area' },
        { value: 'wall_mdf_panels', label: '\u041C\u0414\u0424 \u043F\u0430\u043D\u0435\u043B\u0438', measure: 'area' },
        { value: 'wall_pvc_panels', label: '\u041F\u043B\u0430\u0441\u0442\u0438\u043A\u043E\u0432\u044B\u0435 \u043F\u0430\u043D\u0435\u043B\u0438', measure: 'area' },
        { value: 'wall_slat', label: '\u0420\u0435\u0435\u0447\u043D\u044B\u0435/\u0434\u0435\u043A\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0435 \u043F\u0430\u043D\u0435\u043B\u0438', measure: 'area' },
        { value: 'wall_3d_gypsum', label: '3D \u0433\u0438\u043F\u0441\u043E\u0432\u044B\u0435 \u043F\u0430\u043D\u0435\u043B\u0438', measure: 'area' },
        { value: 'wall_mirror_panels', label: '\u0417\u0435\u0440\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u043F\u0430\u043D\u0435\u043B\u0438', measure: 'area' },
        { value: 'wall_cork', label: '\u041F\u0440\u043E\u0431\u043A\u043E\u0432\u043E\u0435 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435 \u0441\u0442\u0435\u043D\u044B', measure: 'area' },
        { value: 'wall_molding', label: '\u041C\u043E\u043B\u0434\u0438\u043D\u0433\u0438 / \u0434\u0435\u043A\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u0438', measure: 'length' },
        { value: 'wall_corner_profile', label: '\u0423\u0433\u043E\u043B\u043A\u0438 / \u0442\u043E\u0440\u0446\u0435\u0432\u044B\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u0438', measure: 'length' },
        { value: 'wall_sill', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u043E\u0432', measure: 'qty' }
      ],
      ceiling: [
        { value: 'ceiling_stretch', label: '\u041D\u0430\u0442\u044F\u0436\u043D\u043E\u0439 \u043F\u043E\u0442\u043E\u043B\u043E\u043A', measure: 'area' },
        { value: 'ceiling_stretch_shadow', label: '\u041D\u0430\u0442\u044F\u0436\u043D\u043E\u0439 \u043F\u043E\u0442\u043E\u043B\u043E\u043A \u0442\u0435\u043D\u0435\u0432\u043E\u0439 / \u043F\u0430\u0440\u044F\u0449\u0438\u0439', measure: 'area' },
        { value: 'ceiling_stretch_multilevel', label: '\u041D\u0430\u0442\u044F\u0436\u043D\u043E\u0439 \u043F\u043E\u0442\u043E\u043B\u043E\u043A \u043C\u043D\u043E\u0433\u043E\u0443\u0440\u043E\u0432\u043D\u0435\u0432\u044B\u0439', measure: 'area' },
        { value: 'ceiling_stretch_fabric', label: '\u0422\u043A\u0430\u043D\u0435\u0432\u044B\u0439 \u043D\u0430\u0442\u044F\u0436\u043D\u043E\u0439 \u043F\u043E\u0442\u043E\u043B\u043E\u043A', measure: 'area' },
        { value: 'ceiling_gk', label: '\u0413\u0438\u043F\u0441\u043E\u043A\u0430\u0440\u0442\u043E\u043D\u043D\u044B\u0439 \u043F\u043E\u0442\u043E\u043B\u043E\u043A', measure: 'area' },
        { value: 'ceiling_gk_multilevel', label: '\u0413\u0438\u043F\u0441\u043E\u043A\u0430\u0440\u0442\u043E\u043D\u043D\u044B\u0439 \u043F\u043E\u0442\u043E\u043B\u043E\u043A 2+ \u0443\u0440\u043E\u0432\u043D\u044F', measure: 'area' },
        { value: 'ceiling_suspended', label: '\u041F\u043E\u0434\u0432\u0435\u0441\u043D\u043E\u0439 \u043F\u043E\u0442\u043E\u043B\u043E\u043A', measure: 'area' },
        { value: 'ceiling_ree', label: '\u0420\u0435\u0435\u0447\u043D\u044B\u0439 \u043F\u043E\u0442\u043E\u043B\u043E\u043A', measure: 'area' },
        { value: 'ceiling_cassette', label: '\u041A\u0430\u0441\u0441\u0435\u0442\u043D\u044B\u0439 / \u0410\u0440\u043C\u0441\u0442\u0440\u043E\u043D\u0433', measure: 'area' },
        { value: 'ceiling_grilyato', label: '\u041F\u043E\u0442\u043E\u043B\u043E\u043A \u0413\u0440\u0438\u043B\u044C\u044F\u0442\u043E', measure: 'area' },
        { value: 'ceiling_acoustic', label: '\u0410\u043A\u0443\u0441\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u043F\u043E\u0442\u043E\u043B\u043E\u043A', measure: 'area' },
        { value: 'ceiling_paint', label: '\u041F\u043E\u043A\u0440\u0430\u0441\u043A\u0430 \u043F\u043E\u0442\u043E\u043B\u043A\u0430', measure: 'area' },
        { value: 'ceiling_decorative', label: '\u0414\u0435\u043A\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u0430\u044F \u043E\u0442\u0434\u0435\u043B\u043A\u0430 \u043F\u043E\u0442\u043E\u043B\u043A\u0430', measure: 'area' },
        { value: 'ceiling_molding', label: '\u041F\u043E\u0442\u043E\u043B\u043E\u0447\u043D\u044B\u0439 \u043F\u043B\u0438\u043D\u0442\u0443\u0441 / \u0431\u0430\u0433\u0435\u0442', measure: 'length' },
        { value: 'ceiling_cornice_hidden', label: '\u041A\u0430\u0440\u043D\u0438\u0437 / \u043D\u0438\u0448\u0430 \u043F\u043E\u0434 \u0448\u0442\u043E\u0440\u044B', measure: 'length' },
        { value: 'ceiling_led_profile', label: '\u0421\u0432\u0435\u0442\u043E\u0432\u044B\u0435 \u043B\u0438\u043D\u0438\u0438 / \u043F\u0440\u043E\u0444\u0438\u043B\u0438', measure: 'length' },
        { value: 'ceiling_hatch_hidden', label: '\u0420\u0435\u0432\u0438\u0437\u0438\u043E\u043D\u043D\u044B\u0439 \u043B\u044E\u043A', measure: 'qty' }
      ],
      stairs: [
        { value: 'stair_install_concrete_straight', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u0440\u044F\u043C\u043E\u0439 \u043C\u043E\u043D\u043E\u043B\u0438\u0442\u043D\u043E\u0439 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B', measure: 'qty' },
        { value: 'stair_install_concrete_l_shape', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0413-\u043E\u0431\u0440\u0430\u0437\u043D\u043E\u0439 \u043C\u043E\u043D\u043E\u043B\u0438\u0442\u043D\u043E\u0439 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B', measure: 'qty' },
        { value: 'stair_install_concrete_u_shape', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u041F-\u043E\u0431\u0440\u0430\u0437\u043D\u043E\u0439 \u043C\u043E\u043D\u043E\u043B\u0438\u0442\u043D\u043E\u0439 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B', measure: 'qty' },
        { value: 'stair_install_concrete_spiral', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u0438\u043D\u0442\u043E\u0432\u043E\u0439 \u0431\u0435\u0442\u043E\u043D\u043D\u043E\u0439 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B', measure: 'qty' },
        { value: 'stair_install_metal_straight', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u0440\u044F\u043C\u043E\u0439 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B \u043D\u0430 \u043C\u0435\u0442\u0430\u043B\u043B\u043E\u043A\u0430\u0440\u043A\u0430\u0441\u0435', measure: 'qty' },
        { value: 'stair_install_metal_l_shape', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0413-\u043E\u0431\u0440\u0430\u0437\u043D\u043E\u0439 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B \u043D\u0430 \u043C\u0435\u0442\u0430\u043B\u043B\u043E\u043A\u0430\u0440\u043A\u0430\u0441\u0435', measure: 'qty' },
        { value: 'stair_install_metal_u_shape', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u041F-\u043E\u0431\u0440\u0430\u0437\u043D\u043E\u0439 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B \u043D\u0430 \u043C\u0435\u0442\u0430\u043B\u043B\u043E\u043A\u0430\u0440\u043A\u0430\u0441\u0435', measure: 'qty' },
        { value: 'stair_install_metal_spiral', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u0438\u043D\u0442\u043E\u0432\u043E\u0439 \u043C\u0435\u0442\u0430\u043B\u043B\u0438\u0447\u0435\u0441\u043A\u043E\u0439 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B', measure: 'qty' },
        { value: 'stair_install_wood_straight', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u0440\u044F\u043C\u043E\u0439 \u0434\u0435\u0440\u0435\u0432\u044F\u043D\u043D\u043E\u0439 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B', measure: 'qty' },
        { value: 'stair_install_wood_on_metal', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u0435\u0440\u0435\u0432\u044F\u043D\u043D\u043E\u0439 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B \u043D\u0430 \u043C\u0435\u0442\u0430\u043B\u043B\u043E\u043A\u0430\u0440\u043A\u0430\u0441\u0435', measure: 'qty' },
        { value: 'stair_install_wood_hardwood', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B \u0438\u0437 \u0442\u0432\u0451\u0440\u0434\u044B\u0445 \u043F\u043E\u0440\u043E\u0434 \u0434\u0435\u0440\u0435\u0432\u0430', measure: 'qty' },
        { value: 'stair_install_wood_spiral', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u0438\u043D\u0442\u043E\u0432\u043E\u0439 \u0434\u0435\u0440\u0435\u0432\u044F\u043D\u043D\u043E\u0439 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B', measure: 'qty' },
        { value: 'stair_install_stone', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B \u0438\u0437 \u043D\u0430\u0442\u0443\u0440\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043A\u0430\u043C\u043D\u044F', measure: 'qty' },
        { value: 'stair_install_granite', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0433\u0440\u0430\u043D\u0438\u0442\u043D\u043E\u0439 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B', measure: 'qty' },
        { value: 'stair_install_marble', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043C\u0440\u0430\u043C\u043E\u0440\u043D\u043E\u0439 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B', measure: 'qty' },
        { value: 'stair_install_composite_dpk', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B \u0438\u0437 \u0414\u041F\u041A', measure: 'length' },
        { value: 'stair_install_composite_on_metal', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0441\u0442\u0443\u043F\u0435\u043D\u0435\u0439 \u0414\u041F\u041A \u043D\u0430 \u043C\u0435\u0442\u0430\u043B\u043B\u043E\u043A\u0430\u0440\u043A\u0430\u0441\u0435', measure: 'length' },
        { value: 'stair_install_composite_outdoor', label: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0443\u043B\u0438\u0447\u043D\u043E\u0439 \u043B\u0435\u0441\u0442\u043D\u0438\u0446\u044B \u0438\u0437 \u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0442\u0430', measure: 'length' }
      ]
    };

    function getRepairFinishingOption(category, value) {
      return (repairFinishingOptions[category] || []).find(option => option.value === value);
    }

    function getRepairFinishingMeasureMeta(category, value) {
      if (typeof getInstallationMeasureMeta === 'function' && value) {
        return getInstallationMeasureMeta(value, '\u043C\u00B2');
      }
      const option = getRepairFinishingOption(category, value) || repairFinishingOptions[category]?.[0];
      const measure = option?.measure || 'area';

      if (measure === 'length') {
        return { field: 'length', label: '\u0414\u043B\u0438\u043D\u0430, \u043C', step: '0.1', min: '0', unit: '\u043C', integer: false };
      }
      if (measure === 'qty') {
        return { field: 'qty', label: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E, \u0448\u0442', step: '1', min: '0', unit: '\u0448\u0442', integer: true };
      }
      return { field: 'area', label: '\u041F\u043B\u043E\u0449\u0430\u0434\u044C, \u043C\u00B2', step: '0.01', min: '0', unit: '\u043C\u00B2', integer: false };
    }

    function getRepairFinishingValue(item, meta) {
      if (!item) return 0;
      return Number(item[meta.field] || 0);
    }
    
    function getRepairCategoryConfig(category) {
      const metrics = {
        floorLeveling: { defaultAreaKey: 'floorArea', maxCount: 5, title: '\u0412\u044B\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u043D\u0438\u0435 \u043F\u043E\u043B\u0430', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 5, defaultType: '\u0426\u0435\u043C\u0435\u043D\u0442\u043D\u043E-\u043F\u0435\u0441\u0447\u0430\u043D\u0430\u044F \u0441\u0442\u044F\u0436\u043A\u0430 \u0434\u043E 5 \u0441\u043C' },
        wallPlaster: { defaultAreaKey: 'wallsArea', maxCount: 6, title: '\u0428\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0441\u0442\u0435\u043D', itemLabel: '\u0422\u0438\u043F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0438', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 6, defaultType: '\u0413\u0438\u043F\u0441\u043E\u0432\u0430\u044F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0434\u043E 3 \u0441\u043C' },
        wallPutty: { defaultAreaKey: 'wallsArea', maxCount: 5, title: '\u0428\u043F\u0430\u043A\u043B\u0435\u0432\u043A\u0430 \u0441\u0442\u0435\u043D', itemLabel: '\u0422\u0438\u043F \u0448\u043F\u0430\u043A\u043B\u0435\u0432\u043A\u0438', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 5, defaultType: '\u0428\u043F\u0430\u043A\u043B\u0435\u0432\u043A\u0430 \u043F\u043E\u0434 \u043E\u0431\u043E\u0438' },
        ceilingPrep: { defaultAreaKey: 'floorArea', maxCount: 4, title: '\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043F\u043E\u0442\u043E\u043B\u043A\u0430', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 4, defaultType: '\u0412\u044B\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u043D\u0438\u0435 \u043F\u043E\u0442\u043E\u043B\u043A\u0430' },
        electrical: { maxCount: 12, title: '\u042D\u043B\u0435\u043A\u0442\u0440\u0438\u043A\u0430', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 16, defaultType: 'socket_install' },
        ventilation: { maxCount: 20, title: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u0435\u043D\u0442\u0438\u043B\u044F\u0446\u0438\u0438 / \u043A\u043E\u043D\u0434\u0438\u0446\u0438\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 20, defaultType: 'ac_route' },
        water: { maxCount: 10, title: '\u0412\u043E\u0434\u043E\u0441\u043D\u0430\u0431\u0436\u0435\u043D\u0438\u0435', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 14, defaultType: 'water_point' },
        drainage: { maxCount: 10, title: '\u041A\u0430\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 12, defaultType: 'drain_point' },
        heating: { maxCount: 10, title: '\u041E\u0442\u043E\u043F\u043B\u0435\u043D\u0438\u0435', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 12, defaultType: 'radiator_install' },
        floor: { defaultAreaKey: 'floorArea', maxCount: 10, title: '\u041F\u043E\u043B', itemLabel: '\u0422\u0438\u043F \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u044F', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 10, defaultType: 'floor_laminate' },
        wall: { defaultAreaKey: 'wallsArea', maxCount: 14, title: '\u0421\u0442\u0435\u043D\u044B', itemLabel: '\u0422\u0438\u043F \u043E\u0442\u0434\u0435\u043B\u043A\u0438', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 14, defaultType: 'wall_wallpaper' },
        ceiling: { defaultAreaKey: 'floorArea', maxCount: 8, title: '\u041F\u043E\u0442\u043E\u043B\u043E\u043A', itemLabel: '\u0422\u0438\u043F \u043E\u0442\u0434\u0435\u043B\u043A\u0438', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 8, defaultType: 'ceiling_stretch' },
        stairs: { maxCount: 10, title: '\u041B\u0435\u0441\u0442\u043D\u0438\u0446\u044B \u0438 \u043F\u0435\u0440\u0438\u043B\u0430', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 10, defaultType: 'stair_install_concrete_straight' }
      };
      return metrics[category];
    }
    
    function getFinishingCategoryConfig(category) {
      const metrics = {
        floor: { defaultAreaKey: 'floorArea', maxCount: 5, title: '\u0421\u043D\u044F\u0442\u0438\u0435 \u043D\u0430\u043F\u043E\u043B\u044C\u043D\u044B\u0445 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0439', itemLabel: '\u0412\u0438\u0434 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u044F \u043F\u043E\u043B\u0430', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 5, defaultType: '\u041A\u0435\u0440\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043F\u043B\u0438\u0442\u043A\u0430' },
        wall: { defaultAreaKey: 'wallsArea', maxCount: 10, title: '\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0441\u0442\u0435\u043D\u043E\u0432\u044B\u0445 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0439', itemLabel: '\u0412\u0438\u0434 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u044F \u0441\u0442\u0435\u043D', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 10, defaultType: '\u041E\u0431\u043E\u0438' },
        ceiling: { defaultAreaKey: 'floorArea', maxCount: 10, title: '\u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0442\u043E\u043B\u043E\u0447\u043D\u044B\u0445 \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0439', itemLabel: '\u0412\u0438\u0434 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u044F \u043F\u043E\u0442\u043E\u043B\u043A\u0430', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 10, defaultType: '\u041F\u043E\u0434\u0432\u0435\u0441\u043D\u044B\u0435 \u043F\u043E\u0442\u043E\u043B\u043A\u0438' }
      };
      return metrics[category];
    }

    function getRepairCategoryDomKey(category) {
      if (category === 'floor') return 'floorFinish';
      if (category === 'wall') return 'wallFinish';
      if (category === 'ceiling') return 'ceilingFinish';
      if (category === 'stairs') return 'stairsMount';
      if (category === 'openingsMount') return 'openingsMount';
      if (category === 'doorOpeningMount') return 'doorOpeningMount';
      if (category === 'windowOpeningMount') return 'windowOpeningMount';
      if (category === 'balconyOpeningMount') return 'balconyOpeningMount';
      return category;
    }

    function getRepairParentSubType(category) {
      if (['floorLeveling', 'wallPlaster', 'wallPutty', 'ceilingPrep'].includes(category)) return 'rough';
      if (['electrical', 'ventilation', 'water', 'drainage', 'heating'].includes(category)) return 'engineering';
      if (['floor', 'wall', 'ceiling', 'stairs', 'openingsMount', 'doorOpeningMount', 'windowOpeningMount', 'balconyOpeningMount'].includes(category)) return 'finishing';
      return null;
    }


    const repairOpeningMaterials = {
      door: [
        { value: 'brick', label: '\u041A\u0438\u0440\u043F\u0438\u0447' },
        { value: 'concrete', label: '\u0411\u0435\u0442\u043E\u043D / \u043C\u043E\u043D\u043E\u043B\u0438\u0442' },
        { value: 'gasblock', label: '\u0413\u0430\u0437\u043E\u0431\u0435\u0442\u043E\u043D / \u043F\u0435\u043D\u043E\u0431\u043B\u043E\u043A' },
        { value: 'pzp', label: '\u041F\u0430\u0437\u043E\u0433\u0440\u0435\u0431\u043D\u0435\u0432\u0430\u044F \u043F\u043B\u0438\u0442\u0430' },
        { value: 'gyproc', label: '\u0413\u0438\u043F\u0441\u043E\u043A\u0430\u0440\u0442\u043E\u043D / \u043A\u0430\u0440\u043A\u0430\u0441' },
        { value: 'frame', label: '\u041A\u0430\u0440\u043A\u0430\u0441\u043D\u0430\u044F \u0441\u0442\u0435\u043D\u0430' },
        { value: 'wood', label: '\u0414\u0435\u0440\u0435\u0432\u043E' }
      ],
      window: [
        { value: 'brick', label: '\u041A\u0438\u0440\u043F\u0438\u0447' },
        { value: 'concrete', label: '\u0411\u0435\u0442\u043E\u043D / \u043C\u043E\u043D\u043E\u043B\u0438\u0442' },
        { value: 'gasblock', label: '\u0413\u0430\u0437\u043E\u0431\u0435\u0442\u043E\u043D / \u043F\u0435\u043D\u043E\u0431\u043B\u043E\u043A' },
        { value: 'pzp', label: '\u041F\u0430\u0437\u043E\u0433\u0440\u0435\u0431\u043D\u0435\u0432\u0430\u044F \u043F\u043B\u0438\u0442\u0430' },
        { value: 'wood', label: '\u0414\u0435\u0440\u0435\u0432\u043E' },
        { value: 'frame', label: '\u041A\u0430\u0440\u043A\u0430\u0441\u043D\u0430\u044F \u0441\u0442\u0435\u043D\u0430' }
      ],
      balcony: [
        { value: 'brick', label: '\u041A\u0438\u0440\u043F\u0438\u0447' },
        { value: 'concrete', label: '\u0411\u0435\u0442\u043E\u043D / \u043C\u043E\u043D\u043E\u043B\u0438\u0442' },
        { value: 'gasblock', label: '\u0413\u0430\u0437\u043E\u0431\u0435\u0442\u043E\u043D / \u043F\u0435\u043D\u043E\u0431\u043B\u043E\u043A' },
        { value: 'pzp', label: '\u041F\u0430\u0437\u043E\u0433\u0440\u0435\u0431\u043D\u0435\u0432\u0430\u044F \u043F\u043B\u0438\u0442\u0430' },
        { value: 'frame', label: '\u041A\u0430\u0440\u043A\u0430\u0441\u043D\u0430\u044F \u0441\u0442\u0435\u043D\u0430' },
        { value: 'wood', label: '\u0414\u0435\u0440\u0435\u0432\u043E' }
      ]
    };

    const repairOpeningProductMaterials = {
      door: [
        { value: 'eco_veneer', label: '\u042D\u043A\u043E\u0448\u043F\u043E\u043D' },
        { value: 'veneer', label: '\u0428\u043F\u043E\u043D' },
        { value: 'solid_wood', label: '\u041C\u0430\u0441\u0441\u0438\u0432 \u0434\u0435\u0440\u0435\u0432\u0430' },
        { value: 'mdf', label: '\u041C\u0414\u0424' },
        { value: 'laminated', label: '\u041B\u0430\u043C\u0438\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u0434\u0432\u0435\u0440\u044C' },
        { value: 'painted', label: '\u041E\u043A\u0440\u0430\u0448\u0435\u043D\u043D\u0430\u044F \u0434\u0432\u0435\u0440\u044C' },
        { value: 'pvc', label: '\u041F\u0412\u0425' },
        { value: 'aluminum', label: '\u0410\u043B\u044E\u043C\u0438\u043D\u0438\u0439' },
        { value: 'steel', label: '\u0421\u0442\u0430\u043B\u044C' },
        { value: 'glass', label: '\u0421\u0442\u0435\u043A\u043B\u043E' },
        { value: 'composite', label: '\u041A\u043E\u043C\u043F\u043E\u0437\u0438\u0442' }
      ],
      window: [
        { value: 'pvc', label: '\u041F\u0412\u0425' },
        { value: 'aluminum', label: '\u0410\u043B\u044E\u043C\u0438\u043D\u0438\u0439' },
        { value: 'aluminum_warm', label: '\u0410\u043B\u044E\u043C\u0438\u043D\u0438\u0439 \u0442\u0435\u043F\u043B\u044B\u0439' },
        { value: 'aluminum_cold', label: '\u0410\u043B\u044E\u043C\u0438\u043D\u0438\u0439 \u0445\u043E\u043B\u043E\u0434\u043D\u044B\u0439' },
        { value: 'wood', label: '\u0414\u0435\u0440\u0435\u0432\u043E' },
        { value: 'wood_aluminum', label: '\u0414\u0435\u0440\u0435\u0432\u043E-\u0430\u043B\u044E\u043C\u0438\u043D\u0438\u0439' }
      ],
      balcony: [
        { value: 'pvc', label: '\u041F\u0412\u0425' },
        { value: 'aluminum', label: '\u0410\u043B\u044E\u043C\u0438\u043D\u0438\u0439' },
        { value: 'aluminum_warm', label: '\u0410\u043B\u044E\u043C\u0438\u043D\u0438\u0439 \u0442\u0435\u043F\u043B\u044B\u0439' },
        { value: 'aluminum_cold', label: '\u0410\u043B\u044E\u043C\u0438\u043D\u0438\u0439 \u0445\u043E\u043B\u043E\u0434\u043D\u044B\u0439' },
        { value: 'wood', label: '\u0414\u0435\u0440\u0435\u0432\u043E' },
        { value: 'wood_aluminum', label: '\u0414\u0435\u0440\u0435\u0432\u043E-\u0430\u043B\u044E\u043C\u0438\u043D\u0438\u0439' },
        { value: 'glass_composite', label: '\u0421\u0442\u0435\u043A\u043B\u043E\u043A\u043E\u043C\u043F\u043E\u0437\u0438\u0442' }
      ]
    };

    const repairOpeningWorkOptions = {
      door: {
        default: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u0432\u0435\u0440\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u0432\u0435\u0440\u043D\u043E\u0439 \u043A\u043E\u0440\u043E\u0431\u043A\u0438',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u043E\u0431\u043E\u0440\u043E\u0432 \u0438 \u043D\u0430\u043B\u0438\u0447\u043D\u0438\u043A\u043E\u0432',
          '\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u0438 \u0432\u044B\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u043D\u0438\u0435 \u043E\u0442\u043A\u043E\u0441\u043E\u0432',
          '\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0441\u043A\u0440\u044B\u0442\u043E\u0439 \u0434\u0432\u0435\u0440\u0438',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0440\u0430\u0441\u043F\u0430\u0448\u043D\u043E\u0439 \u0434\u0432\u0435\u0440\u0438',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0440\u0430\u0437\u0434\u0432\u0438\u0436\u043D\u043E\u0439 \u0434\u0432\u0435\u0440\u0438'
        ],
        brick: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u0432\u0435\u0440\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u043A\u0438\u0440\u043F\u0438\u0447\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C',
          '\u041A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0435 \u043A\u043E\u0440\u043E\u0431\u043A\u0438 \u0432 \u043A\u0438\u0440\u043F\u0438\u0447',
          '\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u0438 \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u043E\u0442\u043A\u043E\u0441\u043E\u0432 \u043A\u0438\u0440\u043F\u0438\u0447\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0435\u043C\u0430',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u043E\u0431\u043E\u0440\u043E\u0432 \u0438 \u043D\u0430\u043B\u0438\u0447\u043D\u0438\u043A\u043E\u0432'
        ],
        concrete: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u0432\u0435\u0440\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u0431\u0435\u0442\u043E\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C',
          '\u0410\u043D\u043A\u0435\u0440\u043D\u043E\u0435 \u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0435 \u043A\u043E\u0440\u043E\u0431\u043A\u0438 \u0432 \u043C\u043E\u043D\u043E\u043B\u0438\u0442',
          '\u0412\u044B\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u043D\u0438\u0435 \u043E\u0442\u043A\u043E\u0441\u043E\u0432 \u0431\u0435\u0442\u043E\u043D\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0435\u043C\u0430',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u043E\u0431\u043E\u0440\u043E\u0432 \u0438 \u043D\u0430\u043B\u0438\u0447\u043D\u0438\u043A\u043E\u0432'
        ],
        gasblock: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u0432\u0435\u0440\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u043F\u0440\u043E\u0435\u043C \u0438\u0437 \u0433\u0430\u0437\u043E\u0431\u0435\u0442\u043E\u043D\u0430',
          '\u0423\u0441\u0438\u043B\u0435\u043D\u0438\u0435 \u0438 \u0437\u0430\u043A\u043B\u0430\u0434\u043D\u044B\u0435 \u043F\u043E\u0434 \u0434\u0432\u0435\u0440\u043D\u043E\u0439 \u0431\u043B\u043E\u043A',
          '\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043E\u0442\u043A\u043E\u0441\u043E\u0432 \u043F\u0440\u043E\u0435\u043C\u0430 \u0438\u0437 \u0433\u0430\u0437\u043E\u0431\u043B\u043E\u043A\u0430',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u043E\u0431\u043E\u0440\u043E\u0432 \u0438 \u043D\u0430\u043B\u0438\u0447\u043D\u0438\u043A\u043E\u0432'
        ],
        pzp: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u0432\u0435\u0440\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u043F\u0440\u043E\u0435\u043C \u0438\u0437 \u041F\u0413\u041F',
          '\u0423\u0441\u0438\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043C\u0430 \u0438\u0437 \u041F\u0413\u041F',
          '\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043E\u0442\u043A\u043E\u0441\u043E\u0432',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u043E\u0431\u043E\u0440\u043E\u0432 \u0438 \u043D\u0430\u043B\u0438\u0447\u043D\u0438\u043A\u043E\u0432'
        ],
        gyproc: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u0432\u0435\u0440\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u043A\u0430\u0440\u043A\u0430\u0441\u043D\u0443\u044E \u043F\u0435\u0440\u0435\u0433\u043E\u0440\u043E\u0434\u043A\u0443',
          '\u0423\u0441\u0438\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043C\u0430 \u0437\u0430\u043A\u043B\u0430\u0434\u043D\u044B\u043C\u0438 \u0432 \u0413\u041A\u041B',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u043E\u0431\u043E\u0440\u043E\u0432 \u0438 \u043D\u0430\u043B\u0438\u0447\u043D\u0438\u043A\u043E\u0432',
          '\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u0438 \u043E\u0431\u0448\u0438\u0432\u043A\u0430 \u043E\u0442\u043A\u043E\u0441\u043E\u0432'
        ],
        frame: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u0432\u0435\u0440\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u043A\u0430\u0440\u043A\u0430\u0441\u043D\u0443\u044E \u0441\u0442\u0435\u043D\u0443',
          '\u0423\u0441\u0438\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043C\u0430 \u0437\u0430\u043A\u043B\u0430\u0434\u043D\u044B\u043C\u0438 \u0432 \u043A\u0430\u0440\u043A\u0430\u0441\u043D\u043E\u0439 \u0441\u0442\u0435\u043D\u0435',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u043E\u0431\u043E\u0440\u043E\u0432 \u0438 \u043D\u0430\u043B\u0438\u0447\u043D\u0438\u043A\u043E\u0432',
          '\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u0438 \u043E\u0431\u0448\u0438\u0432\u043A\u0430 \u043E\u0442\u043A\u043E\u0441\u043E\u0432'
        ],
        wood: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u0432\u0435\u0440\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u0434\u0435\u0440\u0435\u0432\u044F\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C',
          '\u041A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0435 \u043A\u043E\u0440\u043E\u0431\u043A\u0438 \u043F\u043E \u0434\u0435\u0440\u0435\u0432\u044F\u043D\u043D\u043E\u043C\u0443 \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u044E',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0434\u043E\u0431\u043E\u0440\u043E\u0432 \u0438 \u043D\u0430\u043B\u0438\u0447\u043D\u0438\u043A\u043E\u0432',
          '\u041F\u043E\u0434\u0433\u043E\u043D\u043A\u0430 \u0438 \u0440\u0435\u0433\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0430 \u043F\u043E\u043B\u043E\u0442\u043D\u0430'
        ]
      },
      window: {
        default: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043E\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u0430',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043E\u0442\u043B\u0438\u0432\u0430',
          '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u0432\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u0445 \u043E\u0442\u043A\u043E\u0441\u043E\u0432',
          '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043D\u0430\u0440\u0443\u0436\u043D\u044B\u0445 \u043E\u0442\u043A\u043E\u0441\u043E\u0432',
          '\u0413\u0435\u0440\u043C\u0435\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u043C\u043E\u043D\u0442\u0430\u0436\u043D\u043E\u0433\u043E \u0448\u0432\u0430'
        ],
        brick: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043E\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u043A\u0438\u0440\u043F\u0438\u0447\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u0430 \u0438 \u043E\u0442\u043B\u0438\u0432\u0430',
          '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043E\u0442\u043A\u043E\u0441\u043E\u0432 \u043A\u0438\u0440\u043F\u0438\u0447\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0435\u043C\u0430',
          '\u0413\u0435\u0440\u043C\u0435\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u043C\u043E\u043D\u0442\u0430\u0436\u043D\u043E\u0433\u043E \u0448\u0432\u0430'
        ],
        concrete: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043E\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u0431\u0435\u0442\u043E\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C',
          '\u0410\u043D\u043A\u0435\u0440\u043D\u043E\u0435 \u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0435 \u043E\u043A\u043D\u0430',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u0430 \u0438 \u043E\u0442\u043B\u0438\u0432\u0430',
          '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043E\u0442\u043A\u043E\u0441\u043E\u0432 \u0431\u0435\u0442\u043E\u043D\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0435\u043C\u0430'
        ],
        gasblock: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043E\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u043F\u0440\u043E\u0435\u043C \u0438\u0437 \u0433\u0430\u0437\u043E\u0431\u0435\u0442\u043E\u043D\u0430',
          '\u0423\u0441\u0438\u043B\u0435\u043D\u0438\u0435 \u0437\u043E\u043D\u044B \u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u044F \u043E\u043A\u043D\u0430',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u0430 \u0438 \u043E\u0442\u043B\u0438\u0432\u0430',
          '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043E\u0442\u043A\u043E\u0441\u043E\u0432'
        ],
        pzp: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043E\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u043F\u0440\u043E\u0435\u043C \u0438\u0437 \u041F\u0413\u041F',
          '\u0423\u0441\u0438\u043B\u0435\u043D\u0438\u0435 \u0437\u043E\u043D\u044B \u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u044F \u043E\u043A\u043D\u0430',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u0430',
          '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043E\u0442\u043A\u043E\u0441\u043E\u0432'
        ],
        wood: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043E\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u0434\u0435\u0440\u0435\u0432\u044F\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043E\u0431\u0441\u0430\u0434\u043D\u043E\u0439 \u043A\u043E\u0440\u043E\u0431\u043A\u0438 / \u043E\u043A\u043E\u0441\u044F\u0447\u043A\u0438',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u0430 \u0438 \u043E\u0442\u043B\u0438\u0432\u0430',
          '\u0413\u0435\u0440\u043C\u0435\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u0438 \u0440\u0435\u0433\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0430 \u043E\u043A\u043D\u0430'
        ],
        frame: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043E\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u043A\u0430\u0440\u043A\u0430\u0441\u043D\u0443\u044E \u0441\u0442\u0435\u043D\u0443',
          '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u0437\u0430\u043A\u043B\u0430\u0434\u043D\u044B\u0445 \u0438 \u0443\u0441\u0438\u043B\u0435\u043D\u0438\u0439',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u0430 \u0438 \u043E\u0442\u043B\u0438\u0432\u0430',
          '\u0413\u0435\u0440\u043C\u0435\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u0440\u0438\u043C\u044B\u043A\u0430\u043D\u0438\u0439'
        ]
      },
      balcony: {
        default: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0439 \u0434\u0432\u0435\u0440\u0438',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u0430 \u0438 \u043F\u043E\u0440\u043E\u0433\u0430',
          '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043E\u0442\u043A\u043E\u0441\u043E\u0432',
          '\u0413\u0435\u0440\u043C\u0435\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u0440\u0438\u043C\u044B\u043A\u0430\u043D\u0438\u0439'
        ],
        brick: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u043A\u0438\u0440\u043F\u0438\u0447\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0439 \u0434\u0432\u0435\u0440\u0438 \u0438 \u043E\u043A\u043D\u0430',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0440\u043E\u0433\u0430 \u0438 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u0430',
          '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043E\u0442\u043A\u043E\u0441\u043E\u0432 \u043A\u0438\u0440\u043F\u0438\u0447\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0435\u043C\u0430'
        ],
        concrete: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u0431\u0435\u0442\u043E\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C',
          '\u0410\u043D\u043A\u0435\u0440\u043D\u043E\u0435 \u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u0435 \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0440\u043E\u0433\u0430 \u0438 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u0430',
          '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043E\u0442\u043A\u043E\u0441\u043E\u0432'
        ],
        gasblock: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u043F\u0440\u043E\u0435\u043C \u0438\u0437 \u0433\u0430\u0437\u043E\u0431\u0435\u0442\u043E\u043D\u0430',
          '\u0423\u0441\u0438\u043B\u0435\u043D\u0438\u0435 \u0437\u043E\u043D\u044B \u043A\u0440\u0435\u043F\u043B\u0435\u043D\u0438\u044F \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0440\u043E\u0433\u0430 \u0438 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u0430',
          '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043E\u0442\u043A\u043E\u0441\u043E\u0432'
        ],
        pzp: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u043F\u0440\u043E\u0435\u043C \u0438\u0437 \u041F\u0413\u041F',
          '\u0423\u0441\u0438\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043C\u0430 \u043F\u043E\u0434 \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u044B\u0439 \u0431\u043B\u043E\u043A',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0440\u043E\u0433\u0430 \u0438 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u0430',
          '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043E\u0442\u043A\u043E\u0441\u043E\u0432'
        ],
        frame: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u043A\u0430\u0440\u043A\u0430\u0441\u043D\u0443\u044E \u0441\u0442\u0435\u043D\u0443',
          '\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u0437\u0430\u043A\u043B\u0430\u0434\u043D\u044B\u0445 \u043F\u043E\u0434 \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u044B\u0439 \u0431\u043B\u043E\u043A',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0440\u043E\u0433\u0430 \u0438 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u0430',
          '\u0413\u0435\u0440\u043C\u0435\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u0440\u0438\u043C\u044B\u043A\u0430\u043D\u0438\u0439'
        ],
        wood: [
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u0432 \u0434\u0435\u0440\u0435\u0432\u044F\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043E\u0431\u0441\u0430\u0434\u043D\u043E\u0439 \u043A\u043E\u0440\u043E\u0431\u043A\u0438 / \u043E\u043A\u043E\u0441\u044F\u0447\u043A\u0438',
          '\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0440\u043E\u0433\u0430 \u0438 \u043F\u043E\u0434\u043E\u043A\u043E\u043D\u043D\u0438\u043A\u0430',
          '\u0413\u0435\u0440\u043C\u0435\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u0438 \u0440\u0435\u0433\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0430 \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0439 \u0434\u0432\u0435\u0440\u0438'
        ]
      }
    };

    function getRepairOpeningConfig(openingType) {
      const configs = {
        door: { domKey: 'doorOpeningMount', label: '\u0414\u0432\u0435\u0440\u043D\u043E\u0439 \u043F\u0440\u043E\u0435\u043C', defaultWidth: 900, defaultHeight: 2100, countMax: 10, workTypeMax: 7 },
        window: { domKey: 'windowOpeningMount', label: '\u041E\u043A\u043E\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C', defaultWidth: 1300, defaultHeight: 1400, countMax: 10, workTypeMax: 6 },
        balcony: { domKey: 'balconyOpeningMount', label: '\u0411\u0430\u043B\u043A\u043E\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C', defaultWidth: 800, defaultHeight: 2500, countMax: 10, workTypeMax: 5 }
      };
      return configs[openingType];
    }

    function getRepairOpeningWorkList(openingType, material) {
      const group = repairOpeningWorkOptions[openingType] || {};
      return group[material] || group.default || [];
    }

    function mapBuildingMaterialToOpeningMaterial(buildingMaterial) {
      const materialMap = {
        brick: 'brick',
        monolithic: 'concrete',
        brick_monolithic: 'concrete',
        panel: 'concrete',
        wood: 'wood',
        aerated_concrete: 'gasblock',
        aerated_silicate: 'gasblock',
        foam_concrete: 'gasblock',
        sip: 'frame'
      };
      return materialMap[buildingMaterial] || '';
    }

    function getDefaultRepairOpeningMaterial() {
      const buildingMaterial = document.getElementById('buildingMaterial')?.value || '';
      return mapBuildingMaterialToOpeningMaterial(buildingMaterial);
    }

    function normalizeRepairOpeningWorkTypes(item, openingType) {
      const config = getRepairOpeningConfig(openingType);
      const rawWorkTypes = Array.isArray(item?.workTypes)
        ? item.workTypes
        : item?.workType
          ? [item.workType]
          : [];
      return rawWorkTypes
        .map(type => String(type || '').trim())
        .filter(Boolean)
        .slice(0, config?.workTypeMax || rawWorkTypes.length);
    }

    function getRepairOpeningWorkTypeCount(item, openingType) {
      const config = getRepairOpeningConfig(openingType);
      const normalizedCount = normalizeRepairOpeningWorkTypes(item, openingType).length;
      const storedCount = parseInt(item?.workTypeCount, 10) || 0;
      return Math.max(1, Math.min(config.workTypeMax, storedCount || normalizedCount || 1));
    }

    function syncRepairOpeningWorkTypes(item, openingType, material, targetCount = null) {
      const config = getRepairOpeningConfig(openingType);
      const availableWorks = getRepairOpeningWorkList(openingType, material);
      const requestedCount = Math.max(
        1,
        Math.min(
          config.workTypeMax,
          targetCount === null ? getRepairOpeningWorkTypeCount(item, openingType) : (parseInt(targetCount, 10) || 1)
        )
      );

      const existing = normalizeRepairOpeningWorkTypes(item, openingType);
      const orderedSelected = availableWorks.filter(option => existing.includes(option));
      const uniqueSelected = [];
      orderedSelected.forEach(option => {
        if (!uniqueSelected.includes(option)) uniqueSelected.push(option);
      });

      for (const option of availableWorks) {
        if (uniqueSelected.length >= requestedCount) break;
        if (!uniqueSelected.includes(option)) uniqueSelected.push(option);
      }

      return uniqueSelected.slice(0, requestedCount);
    }

    function isRepairOpeningComplete(item, openingType = null) {
      const hasWorkType = openingType
        ? normalizeRepairOpeningWorkTypes(item, openingType).length > 0
        : !!(item && (item.workType || (Array.isArray(item.workTypes) && item.workTypes.some(Boolean))));
      return !!(item && item.material && item.productMaterial && hasWorkType && Number(item.width) > 0 && Number(item.height) > 0);
    }

    function getRepairAutoAreaValue(category, metrics, config) {
      if (['wallPlaster', 'wallPutty', 'wall'].includes(category)) {
        return Number(metrics.wallsArea || 0);
      }
      return Number(metrics[config.defaultAreaKey] || 0);
    }

    function renderDemolitionFinishingSection(roomId) {
      const finishing = ensureFinishingDataStructure(roomId);
      const floorCount = finishing.floor.length;
      const wallCount = finishing.wall.length;
      const ceilingCount = finishing.ceiling.length;

      return `
        <div class="mb-2 sm:mb-3">
          <div id="${roomId}_finishingHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600" onclick="toggleWhatToDoSubSection('${roomId}_finishing')">
            <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_finishingIcon" style="transform: rotate(-90deg)"></i>
            <span>\u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u043E\u0442\u0434\u0435\u043B\u043E\u0447\u043D\u044B\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u0438 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0439</span>
            <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_finishingDone"></i>
          </div>
          <div id="${roomId}_finishingContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
            <div class="demolition-finishing-group">
              <div id="${roomId}_finishing_floorHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_finishing_floor')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_finishing_floorIcon" style="transform: rotate(-90deg)"></i>
<span>\u0421\u043D\u044F\u0442\u0438\u0435 \u043D\u0430\u043F\u043E\u043B\u044C\u043D\u044B\u0445 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0439</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_finishing_floorDone"></i>
              </div>
              <div id="${roomId}_finishing_floorContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                <div class="demolition-finishing-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="demolition-finishing-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateFinishingCategoryCount('${roomId}', 'floor', -1)">\u2212</button>
                    <input type="number" id="${roomId}_finishing_floor_count" value="${floorCount}" min="0" max="5" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleFinishingCategoryInput('${roomId}', 'floor')">
                    <button type="button" class="qty-btn-mini" onclick="updateFinishingCategoryCount('${roomId}', 'floor', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_finishing_floor_list"></div>
              </div>
            </div>
            <div class="demolition-finishing-group">
              <div id="${roomId}_finishing_wallHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_finishing_wall')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_finishing_wallIcon" style="transform: rotate(-90deg)"></i>
                <span>\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0441\u0442\u0435\u043D\u043E\u0432\u044B\u0445 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0439</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_finishing_wallDone"></i>
              </div>
              <div id="${roomId}_finishing_wallContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                <div class="demolition-finishing-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="demolition-finishing-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateFinishingCategoryCount('${roomId}', 'wall', -1)">\u2212</button>
                    <input type="number" id="${roomId}_finishing_wall_count" value="${wallCount}" min="0" max="10" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleFinishingCategoryInput('${roomId}', 'wall')">
                    <button type="button" class="qty-btn-mini" onclick="updateFinishingCategoryCount('${roomId}', 'wall', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_finishing_wall_list"></div>
              </div>
            </div>
            <div class="demolition-finishing-group">
              <div id="${roomId}_finishing_ceilingHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_finishing_ceiling')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_finishing_ceilingIcon" style="transform: rotate(-90deg)"></i>
                <span>\u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0442\u043E\u043B\u043E\u0447\u043D\u044B\u0445 \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0439</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_finishing_ceilingDone"></i>
              </div>
              <div id="${roomId}_finishing_ceilingContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                <div class="demolition-finishing-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="demolition-finishing-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateFinishingCategoryCount('${roomId}', 'ceiling', -1)">\u2212</button>
                    <input type="number" id="${roomId}_finishing_ceiling_count" value="${ceilingCount}" min="0" max="10" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleFinishingCategoryInput('${roomId}', 'ceiling')">
                    <button type="button" class="qty-btn-mini" onclick="updateFinishingCategoryCount('${roomId}', 'ceiling', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_finishing_ceiling_list"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    function updateFinishingCategoryCount(roomId, category, delta) {
      const input = document.getElementById(`${roomId}_finishing_${category}_count`);
      if (!input) return;
      const config = getFinishingCategoryConfig(category);
      let count = parseInt(input.value, 10) || 0;
      count = Math.max(0, Math.min(config.countMax, count + delta));
      input.value = count;
      renderFinishingCategoryFields(roomId, category, count);
      checkDemolitionDone(roomId, 'finishing');
      checkDemolitionDone(roomId, 'finishing_' + category);
    }

    function handleFinishingCategoryInput(roomId, category) {
      const input = document.getElementById(`${roomId}_finishing_${category}_count`);
      if (!input) return;
      const config = getFinishingCategoryConfig(category);
      let count = parseInt(input.value, 10) || 0;
      count = Math.max(0, Math.min(config.countMax, count));
      input.value = count;
      renderFinishingCategoryFields(roomId, category, count);
      checkDemolitionDone(roomId, 'finishing');
      checkDemolitionDone(roomId, 'finishing_' + category);
    }

    function renderFinishingCategoryFields(roomId, category, count = null) {
      const container = document.getElementById(`${roomId}_finishing_${category}_list`);
      if (!container) return;

      const finishing = ensureFinishingDataStructure(roomId);
      const config = getFinishingCategoryConfig(category);
      const metrics = getDemolitionRoomMetrics(roomId);
      const defaultArea = Number(metrics[config.defaultAreaKey] || 0);
      const items = finishing[category];
      const finalCount = count === null ? items.length : count;

      items.length = finalCount;
      for (let i = 0; i < finalCount; i++) {
        if (!items[i]) {
          items[i] = { type: config.defaultType, area: defaultArea > 0 ? Number(defaultArea.toFixed(2)) : 0 };
          if (category === 'floor' && (items[i].type === '\u0410\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u0446\u0435\u043C\u0435\u043D\u0442\u043D\u043E-\u043F\u0435\u0441\u0447\u0430\u043D\u0430\u044F \u0441\u0442\u044F\u0436\u043A\u0430 \u043E\u0442 5 \u0441\u043C' || items[i].type === '\u041A\u0438\u0440\u043F\u0438\u0447\u043D\u0430\u044F \u043A\u043B\u0430\u0434\u043A\u0430')) {
            items[i].depth = 1;
          }
        } else {
          if (!items[i].type) items[i].type = config.defaultType;
          if (items[i].area === undefined || items[i].area === null || items[i].area === '') {
            items[i].area = defaultArea > 0 ? Number(defaultArea.toFixed(2)) : 0;
          }
        }
      }

      let html = '';
      for (let i = 0; i < finalCount; i++) {
        const item = items[i] || {};
        const currentType = item.type || config.defaultType;
        const needsDepth = category === 'floor' && (currentType === '\u0410\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u0446\u0435\u043C\u0435\u043D\u0442\u043D\u043E-\u043F\u0435\u0441\u0447\u0430\u043D\u0430\u044F \u0441\u0442\u044F\u0436\u043A\u0430 \u043E\u0442 5 \u0441\u043C' || currentType === '\u041A\u0438\u0440\u043F\u0438\u0447\u043D\u0430\u044F \u043A\u043B\u0430\u0434\u043A\u0430');
        const itemLabel = `${config.itemLabel}_${i + 1}`;

        html += `
          <div class="demolition-finishing-item">
            <div class="text-xs font-medium text-gray-500 mb-2">${itemLabel}</div>
            <div class="demolition-finishing-grid gap-2">
              <div>
                <label class="text-xs text-gray-500 block mb-1">${config.itemLabel}:</label>
                <select id="${roomId}_finishing_${category}_${i}_type" class="w-full px-2 py-1 text-sm border rounded" onchange="updateFinishingCategoryItem('${roomId}', '${category}', ${i})">
                  ${demolitionFinishingOptions[category].map(option => `<option value="${option}" ${currentType === option ? 'selected' : ''}>${option}</option>`).join('')}
                </select>
              </div>
              <div class="demolition-finishing-grid cols-2">
                <div>
                  <label class="text-xs text-gray-500 block mb-1">\u041F\u043B\u043E\u0449\u0430\u0434\u044C (\u043C\u00B2):</label>
                  <input type="number" id="${roomId}_finishing_${category}_${i}_area" value="${Number(item.area || 0).toFixed(2)}" min="0" step="0.01" class="w-full px-2 py-1 text-sm border rounded" onchange="updateFinishingCategoryItem('${roomId}', '${category}', ${i})">
                </div>
                ${needsDepth ? `
                <div>
                  <label class="text-xs text-gray-500 block mb-1">\u0413\u043B\u0443\u0431\u0438\u043D\u0430 (\u0441\u043C):</label>
                  <input type="number" id="${roomId}_finishing_${category}_${i}_depth" value="${parseInt(item.depth, 10) || 1}" min="1" max="10" step="1" class="w-full px-2 py-1 text-sm border rounded" onchange="updateFinishingCategoryItem('${roomId}', '${category}', ${i})">
                </div>` : ''}
              </div>
            </div>
          </div>
        `;
      }

      container.innerHTML = html;
      checkDemolitionDone(roomId, 'finishing');
      checkDemolitionDone(roomId, 'finishing_' + category);
    }

    function updateFinishingCategoryItem(roomId, category, index) {
      const finishing = ensureFinishingDataStructure(roomId);
      const config = getFinishingCategoryConfig(category);
      const type = document.getElementById(`${roomId}_finishing_${category}_${index}_type`)?.value || config.defaultType;
      const area = parseFloat(document.getElementById(`${roomId}_finishing_${category}_${index}_area`)?.value) || 0;

      finishing[category][index] = { type, area: Number(area.toFixed(2)) };

      if (category === 'floor' && (type === '\u0410\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u0446\u0435\u043C\u0435\u043D\u0442\u043D\u043E-\u043F\u0435\u0441\u0447\u0430\u043D\u0430\u044F \u0441\u0442\u044F\u0436\u043A\u0430 \u043E\u0442 5 \u0441\u043C' || type === '\u041A\u0438\u0440\u043F\u0438\u0447\u043D\u0430\u044F \u043A\u043B\u0430\u0434\u043A\u0430')) {
        const depth = parseInt(document.getElementById(`${roomId}_finishing_${category}_${index}_depth`)?.value, 10) || 1;
        finishing[category][index].depth = Math.max(1, Math.min(10, depth));
      }

renderFinishingCategoryFields(roomId, category, finishing[category].length);
      checkDemolitionDone(roomId, 'finishing');
      checkDemolitionDone(roomId, 'finishing_' + category);
    }

function renderAllDemolitionFinishingSections() {
      if (!roomData.demolitionData) return;
      for (const roomId of Object.keys(roomData.demolitionData)) {
        renderFinishingCategoryFields(roomId, 'floor');
        renderFinishingCategoryFields(roomId, 'wall');
        renderFinishingCategoryFields(roomId, 'ceiling');
      }
    }
    
    function renderRepairRoomSection(roomId) {
      const repair = ensureRepairDataStructure(roomId);
      const metrics = getRepairRoomMetrics(roomId);
      
      return `
        <div class="mb-2 sm:mb-3">
          <div id="${roomId}_roughHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent" onclick="toggleWhatToDoSubSection('${roomId}_rough')">
            <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_roughIcon" style="transform: rotate(-90deg)"></i>
            <span>\u0427\u0435\u0440\u043D\u043E\u0432\u044B\u0435 \u0440\u0430\u0431\u043E\u0442\u044B</span>
            <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_roughDone"></i>
          </div>
          <div id="${roomId}_roughContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2.5" style="display: none;">
            <div class="repair-work-group">
              <div id="${roomId}_floorLevelingHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_floorLeveling')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_floorLevelingIcon" style="transform: rotate(-90deg)"></i>
                <span>\u0412\u044B\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u043D\u0438\u0435 \u043F\u043E\u043B\u0430</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_floorLevelingDone"></i>
              </div>
              <div id="${roomId}_floorLevelingContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="repair-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="repair-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'floorLeveling', -1)">\u2212</button>
                    <input type="number" id="${roomId}_floorLeveling_count" value="${repair.rough?.floorLeveling?.length || 0}" min="0" max="3" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', 'floorLeveling')">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'floorLeveling', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_floorLeveling_list"></div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_wallPlasterHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_wallPlaster')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_wallPlasterIcon" style="transform: rotate(-90deg)"></i>
                <span>\u0428\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0441\u0442\u0435\u043D</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_wallPlasterDone"></i>
              </div>
              <div id="${roomId}_wallPlasterContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="repair-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="repair-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'wallPlaster', -1)">\u2212</button>
                    <input type="number" id="${roomId}_wallPlaster_count" value="${repair.rough?.wallPlaster?.length || 0}" min="0" max="5" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', 'wallPlaster')">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'wallPlaster', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_wallPlaster_list"></div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_wallPuttyHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_wallPutty')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_wallPuttyIcon" style="transform: rotate(-90deg)"></i>
                <span>\u0428\u043F\u0430\u043A\u043B\u0435\u0432\u043A\u0430 \u0441\u0442\u0435\u043D</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_wallPuttyDone"></i>
              </div>
              <div id="${roomId}_wallPuttyContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="repair-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="repair-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'wallPutty', -1)">\u2212</button>
                    <input type="number" id="${roomId}_wallPutty_count" value="${repair.rough?.wallPutty?.length || 0}" min="0" max="3" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', 'wallPutty')">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'wallPutty', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_wallPutty_list"></div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_ceilingPrepHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_ceilingPrep')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_ceilingPrepIcon" style="transform: rotate(-90deg)"></i>
                <span>\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043F\u043E\u0442\u043E\u043B\u043A\u0430</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_ceilingPrepDone"></i>
              </div>
              <div id="${roomId}_ceilingPrepContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="repair-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="repair-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'ceilingPrep', -1)">\u2212</button>
                    <input type="number" id="${roomId}_ceilingPrep_count" value="${repair.rough?.ceilingPrep?.length || 0}" min="0" max="2" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', 'ceilingPrep')">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'ceilingPrep', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_ceilingPrep_list"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="mb-2 sm:mb-3">
          <div id="${roomId}_engineeringHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent" onclick="toggleWhatToDoSubSection('${roomId}_engineering')">
            <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_engineeringIcon" style="transform: rotate(-90deg)"></i>
            <span>\u0418\u043D\u0436\u0435\u043D\u0435\u0440\u043D\u044B\u0435 \u0440\u0430\u0431\u043E\u0442\u044B</span>
            <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_engineeringDone"></i>
          </div>
          <div id="${roomId}_engineeringContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
            <div class="repair-work-group">
              <div id="${roomId}_electricalHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_electrical')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_electricalIcon" style="transform: rotate(-90deg)"></i>
                <span>\u042D\u043B\u0435\u043A\u0442\u0440\u0438\u043A\u0430</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_electricalDone"></i>
              </div>
              <div id="${roomId}_electricalContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                <div class="repair-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="repair-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'electrical', -1)">\u2212</button>
                    <input type="number" id="${roomId}_electrical_count" value="${repair.engineering?.electrical?.length || 0}" min="0" max="12" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', 'electrical')">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'electrical', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_electrical_list"></div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_ventilationHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_ventilation')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_ventilationIcon" style="transform: rotate(-90deg)"></i>
                <span>\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u0435\u043D\u0442\u0438\u043B\u044F\u0446\u0438\u0438 / \u043A\u043E\u043D\u0434\u0438\u0446\u0438\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_ventilationDone"></i>
              </div>
              <div id="${roomId}_ventilationContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                <div class="repair-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="repair-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'ventilation', -1)">\u2212</button>
                    <input type="number" id="${roomId}_ventilation_count" value="${repair.engineering?.ventilation?.length || 0}" min="0" max="20" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', 'ventilation')">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'ventilation', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_ventilation_list"></div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_waterHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_water')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_waterIcon" style="transform: rotate(-90deg)"></i>
                <span>\u0412\u043E\u0434\u043E\u0441\u043D\u0430\u0431\u0436\u0435\u043D\u0438\u0435</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_waterDone"></i>
              </div>
              <div id="${roomId}_waterContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                <div class="repair-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="repair-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'water', -1)">\u2212</button>
                    <input type="number" id="${roomId}_water_count" value="${repair.engineering?.water?.length || 0}" min="0" max="10" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', 'water')">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'water', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_water_list"></div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_drainageHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_drainage')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_drainageIcon" style="transform: rotate(-90deg)"></i>
                <span>\u041A\u0430\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_drainageDone"></i>
              </div>
              <div id="${roomId}_drainageContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                <div class="repair-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="repair-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'drainage', -1)">\u2212</button>
                    <input type="number" id="${roomId}_drainage_count" value="${repair.engineering?.drainage?.length || 0}" min="0" max="10" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', 'drainage')">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'drainage', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_drainage_list"></div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_heatingHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_heating')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_heatingIcon" style="transform: rotate(-90deg)"></i>
                <span>\u041E\u0442\u043E\u043F\u043B\u0435\u043D\u0438\u0435</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_heatingDone"></i>
              </div>
              <div id="${roomId}_heatingContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                <div class="repair-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="repair-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'heating', -1)">\u2212</button>
                    <input type="number" id="${roomId}_heating_count" value="${repair.engineering?.heating?.length || 0}" min="0" max="10" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', 'heating')">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'heating', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_heating_list"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="mb-2 sm:mb-3">
          <div id="${roomId}_finishingHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent" onclick="toggleWhatToDoSubSection('${roomId}_finishing')">
            <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_finishingIcon" style="transform: rotate(-90deg)"></i>
            <span>\u0427\u0438\u0441\u0442\u043E\u0432\u044B\u0435 \u0440\u0430\u0431\u043E\u0442\u044B</span>
            <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_finishingDone"></i>
          </div>
          <div id="${roomId}_finishingContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2.5" style="display: none;">
            <div class="repair-work-group">
              <div id="${roomId}_floorFinishHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_floorFinish')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_floorFinishIcon" style="transform: rotate(-90deg)"></i>
                <span>\u041F\u043E\u043B</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_floorFinishDone"></i>
              </div>
              <div id="${roomId}_floorFinishContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="repair-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="repair-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'floor', -1)">\u2212</button>
                    <input type="number" id="${roomId}_floorFinish_count" value="${repair.finishing?.floor?.length || 0}" min="0" max="8" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', 'floor')">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'floor', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_floorFinish_list"></div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_wallFinishHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_wallFinish')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_wallFinishIcon" style="transform: rotate(-90deg)"></i>
                <span>\u0421\u0442\u0435\u043D\u044B</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_wallFinishDone"></i>
              </div>
              <div id="${roomId}_wallFinishContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="repair-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="repair-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'wall', -1)">\u2212</button>
                    <input type="number" id="${roomId}_wallFinish_count" value="${repair.finishing?.wall?.length || 0}" min="0" max="12" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', 'wall')">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'wall', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_wallFinish_list"></div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_ceilingFinishHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_ceilingFinish')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_ceilingFinishIcon" style="transform: rotate(-90deg)"></i>
                <span>\u041F\u043E\u0442\u043E\u043B\u043E\u043A</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_ceilingFinishDone"></i>
              </div>
              <div id="${roomId}_ceilingFinishContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="repair-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="repair-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'ceiling', -1)">\u2212</button>
                    <input type="number" id="${roomId}_ceilingFinish_count" value="${repair.finishing?.ceiling?.length || 0}" min="0" max="6" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', 'ceiling')">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'ceiling', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_ceilingFinish_list"></div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_stairsMountHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_stairsMount')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_stairsMountIcon" style="transform: rotate(-90deg)"></i>
                <span>\u041B\u0435\u0441\u0442\u043D\u0438\u0446\u044B \u0438 \u043F\u0435\u0440\u0438\u043B\u0430</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_stairsMountDone"></i>
              </div>
              <div id="${roomId}_stairsMountContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="repair-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="repair-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'stairs', -1)">\u2212</button>
                    <input type="number" id="${roomId}_stairsMount_count" value="${repair.finishing?.stairs?.length || 0}" min="0" max="10" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', 'stairs')">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', 'stairs', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_stairsMount_list"></div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_openingsMountHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_openingsMount')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_openingsMountIcon" style="transform: rotate(-90deg)"></i>
                <span>\u041C\u043E\u043D\u0442\u0430\u0436 \u043F\u0440\u043E\u0435\u043C\u043E\u0432</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_openingsMountDone"></i>
              </div>
              <div id="${roomId}_openingsMountContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="repair-work-group">
                  <div id="${roomId}_doorOpeningMountHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_doorOpeningMount')">
                    <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_doorOpeningMountIcon" style="transform: rotate(-90deg)"></i>
                    <span>\u0414\u0432\u0435\u0440\u043D\u043E\u0439 \u043F\u0440\u043E\u0435\u043C</span>
                    <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_doorOpeningMountDone"></i>
                  </div>
                  <div id="${roomId}_doorOpeningMountContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                    <div class="repair-controls py-2">
                      <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                      <div class="repair-qty">
                        <button type="button" class="qty-btn-mini" onclick="updateRepairOpeningCount('${roomId}', 'door', -1)">\u2212</button>
                        <input type="number" id="${roomId}_doorOpeningMount_count" value="${repair.finishing?.openings?.door?.length || 0}" min="0" max="${getRepairOpeningConfig('door').countMax}" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairOpeningInput('${roomId}', 'door')">
                        <button type="button" class="qty-btn-mini" onclick="updateRepairOpeningCount('${roomId}', 'door', 1)">+</button>
                      </div>
                    </div>
                    <div id="${roomId}_doorOpeningMount_list"></div>
                  </div>
                </div>
                <div class="repair-work-group">
                  <div id="${roomId}_windowOpeningMountHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_windowOpeningMount')">
                    <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_windowOpeningMountIcon" style="transform: rotate(-90deg)"></i>
                    <span>\u041E\u043A\u043E\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C</span>
                    <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_windowOpeningMountDone"></i>
                  </div>
                  <div id="${roomId}_windowOpeningMountContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                    <div class="repair-controls py-2">
                      <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                      <div class="repair-qty">
                        <button type="button" class="qty-btn-mini" onclick="updateRepairOpeningCount('${roomId}', 'window', -1)">\u2212</button>
                        <input type="number" id="${roomId}_windowOpeningMount_count" value="${repair.finishing?.openings?.window?.length || 0}" min="0" max="${getRepairOpeningConfig('window').countMax}" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairOpeningInput('${roomId}', 'window')">
                        <button type="button" class="qty-btn-mini" onclick="updateRepairOpeningCount('${roomId}', 'window', 1)">+</button>
                      </div>
                    </div>
                    <div id="${roomId}_windowOpeningMount_list"></div>
                  </div>
                </div>
                <div class="repair-work-group">
                  <div id="${roomId}_balconyOpeningMountHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_balconyOpeningMount')">
                    <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_balconyOpeningMountIcon" style="transform: rotate(-90deg)"></i>
                    <span>\u0411\u0430\u043B\u043A\u043E\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C</span>
                    <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_balconyOpeningMountDone"></i>
                  </div>
                  <div id="${roomId}_balconyOpeningMountContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                    <div class="repair-controls py-2">
                      <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                      <div class="repair-qty">
                        <button type="button" class="qty-btn-mini" onclick="updateRepairOpeningCount('${roomId}', 'balcony', -1)">\u2212</button>
                        <input type="number" id="${roomId}_balconyOpeningMount_count" value="${repair.finishing?.openings?.balcony?.length || 0}" min="0" max="${getRepairOpeningConfig('balcony').countMax}" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairOpeningInput('${roomId}', 'balcony')">
                        <button type="button" class="qty-btn-mini" onclick="updateRepairOpeningCount('${roomId}', 'balcony', 1)">+</button>
                      </div>
                    </div>
                    <div id="${roomId}_balconyOpeningMount_list"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    function updateRepairCategoryCount(roomId, category, delta) {
      const domKey = getRepairCategoryDomKey(category);
      const input = document.getElementById(`${roomId}_${domKey}_count`);
      if (!input) return;
      const config = getRepairCategoryConfig(category);
      let count = parseInt(input.value, 10) || 0;
      count = Math.max(0, Math.min(config.countMax, count + delta));
      input.value = count;
      renderRepairCategoryFields(roomId, category, count, 'manual');
    }

    function renderRepairStatusBadge({
      label = '\u0418\u0437 \u043E\u043F\u0440\u043E\u0441\u0430',
      icon = 'fa-magic',
      className = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      title = '\u0417\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043E \u043F\u043E \u0434\u0430\u043D\u043D\u044B\u043C \u043E\u043F\u0440\u043E\u0441\u0430',
      extraClasses = ''
    } = {}) {
      return `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${className}${extraClasses ? ` ${extraClasses}` : ''}" title="${title}">
          <i class="fas ${icon} text-[10px]"></i>
          <span>${label}</span>
        </span>
      `;
    }

    function hasAutoFilledRepairItem(item) {
      return item?.autoSource === 'quest' && item?.manualEdited !== true;
    }

    function hasManualEditedRepairItem(item) {
      return item?.autoSource === 'quest' && item?.manualEdited === true;
    }

    function hasManualOnlyRepairItem(item) {
      return item?.manualEntry === true && item?.autoSource !== 'quest';
    }

    function renderRepairItemStatusBadge(item) {
      if (hasManualEditedRepairItem(item)) {
        return renderRepairStatusBadge({
          label: '\u0420\u0443\u0447\u043D\u044B\u0435 \u043F\u0440\u0430\u0432\u043A\u0438',
          icon: 'fa-pen',
          className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
          title: '\u0414\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u043E\u043F\u0440\u043E\u0441\u0430 \u0431\u044B\u043B\u0438 \u0441\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u044B \u0432\u0440\u0443\u0447\u043D\u0443\u044E'
        });
      }

      if (hasAutoFilledRepairItem(item)) {
        return renderRepairStatusBadge();
      }

      if (hasManualOnlyRepairItem(item)) {
        return renderRepairStatusBadge({
          label: '\u0412\u0440\u0443\u0447\u043D\u0443\u044E',
          icon: 'fa-user',
          className: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
          title: '\u041F\u0443\u043D\u043A\u0442 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D \u0438\u043B\u0438 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D \u0432\u0440\u0443\u0447\u043D\u0443\u044E'
        });
      }

      return '';
    }

    function markRepairItemsAutoFilled(items = []) {
      items.forEach(item => {
        if (item && typeof item === 'object') {
          item.autoFilled = true;
          item.autoSource = 'quest';
          delete item.manualEdited;
          delete item.manualEntry;
        }
      });
    }

    function markRepairRoomAutoFilled(repair) {
      if (!repair) return;
      ['floorLeveling', 'wallPlaster', 'wallPutty', 'ceilingPrep'].forEach(category => markRepairItemsAutoFilled(repair.rough?.[category] || []));
      ['electrical', 'ventilation', 'water', 'drainage', 'heating'].forEach(category => markRepairItemsAutoFilled(repair.engineering?.[category] || []));
      ['floor', 'wall', 'ceiling'].forEach(category => markRepairItemsAutoFilled(repair.finishing?.[category] || []));
      ['door', 'window', 'balcony'].forEach(openingType => markRepairItemsAutoFilled(repair.finishing?.openings?.[openingType] || []));
    }

    function hasAutoFilledRepairRoom(roomId) {
      const repair = roomData.repairData?.[roomId];
      if (!repair) return false;
      const sections = [
        ...(repair.rough?.floorLeveling || []),
        ...(repair.rough?.wallPlaster || []),
        ...(repair.rough?.wallPutty || []),
        ...(repair.rough?.ceilingPrep || []),
        ...(repair.engineering?.electrical || []),
        ...(repair.engineering?.ventilation || []),
        ...(repair.engineering?.water || []),
        ...(repair.engineering?.drainage || []),
        ...(repair.engineering?.heating || []),
        ...(repair.finishing?.floor || []),
        ...(repair.finishing?.wall || []),
        ...(repair.finishing?.ceiling || []),
        ...(repair.finishing?.openings?.door || []),
        ...(repair.finishing?.openings?.window || []),
        ...(repair.finishing?.openings?.balcony || [])
      ];
      return sections.some(hasAutoFilledRepairItem);
    }

    function hasAnyAutoFilledWhatToDo() {
      return Object.keys(roomData.repairData || {}).some(hasAutoFilledRepairRoom);
    }

    function hasManualEditedRepairRoom(roomId) {
      const repair = roomData.repairData?.[roomId];
      if (!repair) return false;
      const sections = [
        ...(repair.rough?.floorLeveling || []),
        ...(repair.rough?.wallPlaster || []),
        ...(repair.rough?.wallPutty || []),
        ...(repair.rough?.ceilingPrep || []),
        ...(repair.engineering?.electrical || []),
        ...(repair.engineering?.ventilation || []),
        ...(repair.engineering?.water || []),
        ...(repair.engineering?.drainage || []),
        ...(repair.engineering?.heating || []),
        ...(repair.finishing?.floor || []),
        ...(repair.finishing?.wall || []),
        ...(repair.finishing?.ceiling || []),
        ...(repair.finishing?.openings?.door || []),
        ...(repair.finishing?.openings?.window || []),
        ...(repair.finishing?.openings?.balcony || [])
      ];
      return sections.some(hasManualEditedRepairItem);
    }

    function hasAnyManualEditedWhatToDo() {
      return Object.keys(roomData.repairData || {}).some(hasManualEditedRepairRoom);
    }

    function hasManualOnlyRepairRoom(roomId) {
      const repair = roomData.repairData?.[roomId];
      if (!repair) return false;
      const sections = [
        ...(repair.rough?.floorLeveling || []),
        ...(repair.rough?.wallPlaster || []),
        ...(repair.rough?.wallPutty || []),
        ...(repair.rough?.ceilingPrep || []),
        ...(repair.engineering?.electrical || []),
        ...(repair.engineering?.ventilation || []),
        ...(repair.engineering?.water || []),
        ...(repair.engineering?.drainage || []),
        ...(repair.engineering?.heating || []),
        ...(repair.finishing?.floor || []),
        ...(repair.finishing?.wall || []),
        ...(repair.finishing?.ceiling || []),
        ...(repair.finishing?.openings?.door || []),
        ...(repair.finishing?.openings?.window || []),
        ...(repair.finishing?.openings?.balcony || [])
      ];
      return sections.some(hasManualOnlyRepairItem);
    }

    function hasAnyManualOnlyWhatToDo() {
      return Object.keys(roomData.repairData || {}).some(hasManualOnlyRepairRoom);
    }

    function updateWhatToDoAutofillIndicators() {
      const autofillHeaderBadge = document.getElementById('whatToDoAutofillBadge');
      const autofillHeaderText = document.getElementById('whatToDoAutofillHeaderText');
      const autofillNotice = document.getElementById('whatToDoAutofillNotice');
      const hasAutoFilled = hasAnyAutoFilledWhatToDo();
      const hasManualEdited = hasAnyManualEditedWhatToDo();
      const hasManualOnly = hasAnyManualOnlyWhatToDo();

      if (autofillHeaderBadge) {
        const badges = [];
        if (hasAutoFilled) {
          badges.push(renderRepairStatusBadge());
        }
        if (hasManualEdited) {
          badges.push(renderRepairStatusBadge({
            label: '\u0420\u0443\u0447\u043D\u044B\u0435 \u043F\u0440\u0430\u0432\u043A\u0438',
            icon: 'fa-pen',
            className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
            title: '\u0412 \u0440\u0430\u0437\u0434\u0435\u043B \u0432\u043D\u0435\u0441\u0435\u043D\u044B \u0440\u0443\u0447\u043D\u044B\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u043A\u0438'
          }));
        }
        if (hasManualOnly) {
          badges.push(renderRepairStatusBadge({
            label: '\u0412\u0440\u0443\u0447\u043D\u0443\u044E',
            icon: 'fa-user',
            className: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
            title: '\u0412 \u0440\u0430\u0437\u0434\u0435\u043B \u0435\u0441\u0442\u044C \u043F\u0443\u043D\u043A\u0442\u044B, \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435 \u0431\u0435\u0437 \u043E\u043F\u0440\u043E\u0441\u0430'
          }));
        }
        autofillHeaderBadge.innerHTML = badges.join(' ');
      }

      if (autofillHeaderText) {
        let helperText = '';
        if (hasAutoFilled && hasManualEdited && hasManualOnly) {
          helperText = '\u0412 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \u0435\u0441\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u043E\u043F\u0440\u043E\u0441\u0430, \u0441\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043F\u0443\u043D\u043A\u0442\u044B \u0438 \u043F\u043E\u0437\u0438\u0446\u0438\u0438, \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.';
        } else if (hasAutoFilled && hasManualEdited) {
          helperText = '\u0427\u0430\u0441\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0445 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0430 \u043F\u043E \u043E\u043F\u0440\u043E\u0441\u0443, \u0447\u0430\u0441\u0442\u044C \u0441\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0430 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.';
        } else if (hasAutoFilled && hasManualOnly) {
          helperText = '\u0427\u0430\u0441\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0445 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0430 \u043F\u043E \u043E\u043F\u0440\u043E\u0441\u0443, \u0447\u0430\u0441\u0442\u044C \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.';
        } else if (hasManualEdited && hasManualOnly) {
          helperText = '\u0412 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \u0435\u0441\u0442\u044C \u0441\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043F\u043E \u043E\u043F\u0440\u043E\u0441\u0443 \u0438 \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u0440\u0443\u0447\u043D\u044B\u0435 \u043F\u0443\u043D\u043A\u0442\u044B.';
        } else if (hasManualEdited) {
          helperText = '\u0414\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u043E\u043F\u0440\u043E\u0441\u0430 \u0441\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u044B \u0432\u0440\u0443\u0447\u043D\u0443\u044E.';
        } else if (hasManualOnly) {
          helperText = '\u0420\u0430\u0437\u0434\u0435\u043B \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D \u0432\u0440\u0443\u0447\u043D\u0443\u044E.';
        } else if (hasAutoFilled) {
          helperText = '\u0420\u0430\u0437\u0434\u0435\u043B \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D \u043D\u0430 \u0434\u0430\u043D\u043D\u044B\u0445 \u043E\u043F\u0440\u043E\u0441\u0430 (\u043C\u043E\u0436\u043D\u043E \u0441\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0440\u0443\u0447\u043D\u0443\u044E).';
        }

        autofillHeaderText.textContent = helperText;
        autofillHeaderText.classList.toggle('hidden', !helperText);
      }

      if (autofillNotice) {
        autofillNotice.innerHTML = '';
      }
    }
    
    function handleRepairCategoryInput(roomId, category) {
      const domKey = getRepairCategoryDomKey(category);
      const input = document.getElementById(`${roomId}_${domKey}_count`);
      if (!input) return;
      const config = getRepairCategoryConfig(category);
      let count = parseInt(input.value, 10) || 0;
      count = Math.max(0, Math.min(config.countMax, count));
      input.value = count;
      renderRepairCategoryFields(roomId, category, count, 'manual');
    }
    
    function renderRepairCategoryFields(roomId, category, count = null, changeSource = 'system') {
      let categoryKey = category;
      let section = 'rough';
      if (['electrical', 'ventilation', 'water', 'drainage', 'heating'].includes(category)) {
        section = 'engineering';
        categoryKey = category;
      } else if (['floor', 'wall', 'ceiling', 'stairs'].includes(category)) {
        section = 'finishing';
        categoryKey = category;
      }
      
      const domKey = getRepairCategoryDomKey(category);
      const container = document.getElementById(`${roomId}_${domKey}_list`);
      if (!container) return;
      
      const repair = ensureRepairDataStructure(roomId);
      const config = getRepairCategoryConfig(category);
      const metrics = getRepairRoomMetrics(roomId);
      const defaultArea = getRepairAutoAreaValue(category, metrics, config);
      const items = repair[section][categoryKey];
      const previousLength = items.length;
      const finalCount = count === null ? items.length : count;
      
      items.length = finalCount;
      for (let i = 0; i < finalCount; i++) {
        if (!items[i]) {
          if (section === 'engineering') {
            const measureMeta = getRepairEngineeringMeasureMeta(category, config.defaultType);
            items[i] = { type: config.defaultType, [measureMeta.field]: 0 };
          } else if (section === 'finishing') {
            const measureMeta = getRepairFinishingMeasureMeta(category, config.defaultType);
            const defaultValue = measureMeta.field === 'area' && defaultArea > 0
              ? Number(defaultArea.toFixed(2))
              : 0;
            items[i] = { type: config.defaultType, [measureMeta.field]: defaultValue, autoFilled: measureMeta.field === 'area' };
          } else {
            const measureMeta = getRepairRoughMeasureMeta(category, config.defaultType);
            const defaultValue = measureMeta.field === 'area' && defaultArea > 0
              ? Number(defaultArea.toFixed(2))
              : 0;
            items[i] = { type: config.defaultType, [measureMeta.field]: defaultValue, autoFilled: measureMeta.field === 'area' };
          }
          if (changeSource === 'manual') {
            items[i].manualEntry = true;
          }
        } else {
          if (!items[i].type) items[i].type = config.defaultType;
          if (section === 'rough') {
            const measureMeta = getRepairRoughMeasureMeta(category, items[i].type);
            if (measureMeta.field === 'area' && items[i].autoFilled !== false) {
              items[i][measureMeta.field] = defaultArea > 0 ? Number(defaultArea.toFixed(2)) : 0;
              items[i].autoFilled = true;
            } else if (measureMeta.field !== 'area' && items[i][measureMeta.field] === undefined) {
              delete items[i].area;
              items[i][measureMeta.field] = 0;
              items[i].autoFilled = false;
            }
          }
          if (section === 'finishing') {
            const measureMeta = getRepairFinishingMeasureMeta(category, items[i].type);
            if (measureMeta.field === 'area' && items[i].autoFilled !== false) {
              items[i][measureMeta.field] = defaultArea > 0 ? Number(defaultArea.toFixed(2)) : 0;
              items[i].autoFilled = true;
            }
          } else if (section !== 'engineering' && section !== 'rough' && (items[i].area === undefined || items[i].area === null || items[i].area === '')) {
            items[i].area = defaultArea > 0 ? Number(defaultArea.toFixed(2)) : 0;
            items[i].autoFilled = true;
          }
        }
        if (changeSource === 'manual' && i >= previousLength && items[i].autoSource !== 'quest') {
          items[i].manualEntry = true;
        }
      }
      
      let optionsGroup = repairRoughOptions[category] || repairEngineeringOptions[category] || repairFinishingOptions[category];
      if (!optionsGroup) optionsGroup = repairFinishingOptions[category];
      
      let html = '';
      for (let i = 0; i < finalCount; i++) {
        const item = items[i] || {};
        const currentType = item.type || config.defaultType;
        const itemLabel = `${config.itemLabel}_${i + 1}`;
        const isRoughCategory = section === 'rough';
        const isEngineeringCategory = section === 'engineering';
        const isFinishingCategory = section === 'finishing';
        const measureMeta = isRoughCategory
          ? getRepairRoughMeasureMeta(category, currentType)
          : isEngineeringCategory
            ? getRepairEngineeringMeasureMeta(category, currentType)
            : getRepairFinishingMeasureMeta(category, currentType);
        const rawValue = isRoughCategory
          ? getRepairRoughValue(item, measureMeta)
          : isEngineeringCategory
            ? getRepairEngineeringValue(item, measureMeta)
            : getRepairFinishingValue(item, measureMeta);
        const inputValue = isRoughCategory || isEngineeringCategory || isFinishingCategory
          ? (measureMeta.field === 'qty' && measureMeta.integer !== false ? String(Math.round(rawValue)) : String(rawValue || 0))
          : Number(rawValue).toFixed(2);
        const autoFilledBadge = renderRepairItemStatusBadge(item);
        const selectOptionsHtml = isEngineeringCategory
          ? optionsGroup.map(option => `<option value="${option.value}" ${currentType === option.value ? 'selected' : ''}>${option.label}</option>`).join('')
          : isFinishingCategory
            ? optionsGroup.map(option => `<option value="${option.value}" ${currentType === option.value ? 'selected' : ''}>${option.label}</option>`).join('')
            : optionsGroup.map(option => `<option value="${option}" ${currentType === option ? 'selected' : ''}>${option}</option>`).join('');
        
        html += `
          <div class="repair-item">
            <div class="flex items-center gap-2 mb-2">
              <div class="text-xs font-medium text-gray-500">${itemLabel}</div>
              ${autoFilledBadge}
            </div>
            <div class="repair-grid gap-2">
              <div>
                <label class="text-xs text-gray-500 block mb-1">${config.itemLabel}:</label>
                <select id="${roomId}_${category}_${i}_type" class="repair-type-select w-full px-2 py-1 text-sm border rounded" onchange="updateRepairItem('${roomId}', '${category}', ${i}, 'type')">
                  ${selectOptionsHtml}
                </select>
              </div>
              <div class="repair-grid cols-2">
                <div>
                  <label class="text-xs text-gray-500 block mb-1">${measureMeta.label}:</label>
                  <input type="number" id="${roomId}_${category}_${i}_value" value="${inputValue}" min="${measureMeta.min}" step="${measureMeta.step}" class="repair-area-input w-full px-2 py-1 text-sm border rounded" onchange="updateRepairItem('${roomId}', '${category}', ${i}, 'value')">
                </div>
              </div>
            </div>
          </div>`;
      }
      
      container.innerHTML = html;
      updateWhatToDoAutofillIndicators();
      checkRepairDone(roomId, category);
      const parentSubType = getRepairParentSubType(category);
      if (parentSubType) checkRepairDone(roomId, parentSubType);
    }
    
    function updateRepairItem(roomId, category, index, source = 'value') {
      let categoryKey = category;
      let section = 'rough';
      if (['electrical', 'ventilation', 'water', 'drainage', 'heating'].includes(category)) {
        section = 'engineering';
      } else if (['floor', 'wall', 'ceiling'].includes(category)) {
        section = 'finishing';
      }
      
      const repair = ensureRepairDataStructure(roomId);
      const categoryData = repair[section][categoryKey];
      const config = getRepairCategoryConfig(category);
      const metrics = getRepairRoomMetrics(roomId);
      const defaultArea = getRepairAutoAreaValue(category, metrics, config);
      const inputValue = document.getElementById(`${roomId}_${category}_${index}_value`);
      const inputType = document.getElementById(`${roomId}_${category}_${index}_type`);
      
      if (!categoryData[index]) categoryData[index] = {};
      const wasQuestionnaireBased = categoryData[index].autoSource === 'quest' || categoryData[index].manualEdited === true;
      const type = inputType?.value || '';
      categoryData[index].type = type;
      if (wasQuestionnaireBased) {
        categoryData[index].autoSource = 'quest';
        categoryData[index].manualEdited = true;
      } else {
        delete categoryData[index].manualEdited;
      }
      if (section === 'engineering') {
        const measureMeta = getRepairEngineeringMeasureMeta(category, type);
        const parsedValue = parseFloat(inputValue?.value) || 0;
        delete categoryData[index].qty;
        delete categoryData[index].length;
        delete categoryData[index].area;
        categoryData[index][measureMeta.field] = measureMeta.field === 'qty'
          ? (measureMeta.integer === false ? Number(parsedValue.toFixed(2)) : Math.max(0, Math.round(parsedValue)))
          : Number(parsedValue.toFixed(2));
        categoryData[index].autoFilled = false;
      } else if (section === 'finishing') {
        const measureMeta = getRepairFinishingMeasureMeta(category, type);
        delete categoryData[index].qty;
        delete categoryData[index].length;
        delete categoryData[index].area;
        if (source === 'type' && measureMeta.field === 'area' && categoryData[index].autoFilled !== false) {
          categoryData[index].area = defaultArea > 0 ? Number(defaultArea.toFixed(2)) : 0;
          categoryData[index].autoFilled = true;
        } else {
          const parsedValue = parseFloat(inputValue?.value) || 0;
          categoryData[index][measureMeta.field] = measureMeta.field === 'qty'
            ? (measureMeta.integer === false ? Number(parsedValue.toFixed(2)) : Math.max(0, Math.round(parsedValue)))
            : Number(parsedValue.toFixed(2));
          categoryData[index].autoFilled = measureMeta.field === 'area' ? false : false;
        }
      } else {
        const measureMeta = getRepairRoughMeasureMeta(category, type);
        delete categoryData[index].qty;
        delete categoryData[index].length;
        delete categoryData[index].area;
        if (source === 'type' && measureMeta.field === 'area' && categoryData[index].autoFilled !== false) {
          categoryData[index][measureMeta.field] = defaultArea > 0 ? Number(defaultArea.toFixed(2)) : 0;
          categoryData[index].autoFilled = true;
        } else {
          const parsedValue = parseFloat(inputValue?.value) || 0;
          categoryData[index][measureMeta.field] = measureMeta.field === 'qty'
            ? (measureMeta.integer === false ? Number(parsedValue.toFixed(2)) : Math.max(0, Math.round(parsedValue)))
            : Number(parsedValue.toFixed(2));
          categoryData[index].autoFilled = false;
        }
      }
      
      if (wasQuestionnaireBased) {
        delete categoryData[index].manualEntry;
      } else {
        categoryData[index].manualEntry = true;
      }

      renderRepairCategoryFields(roomId, category, categoryData.length);
    }

    function updateRepairOpeningCount(roomId, openingType, delta) {
      const config = getRepairOpeningConfig(openingType);
      const input = document.getElementById(`${roomId}_${config.domKey}_count`);
      if (!input) return;

      let count = parseInt(input.value, 10) || 0;
      count = Math.max(0, Math.min(config.countMax, count + delta));
      input.value = count;
      renderRepairOpeningFields(roomId, openingType, count, 'manual');
    }

    function handleRepairOpeningInput(roomId, openingType) {
      const config = getRepairOpeningConfig(openingType);
      const input = document.getElementById(`${roomId}_${config.domKey}_count`);
      if (!input) return;

      let count = parseInt(input.value, 10) || 0;
      count = Math.max(0, Math.min(config.countMax, count));
      input.value = count;
      renderRepairOpeningFields(roomId, openingType, count, 'manual');
    }

    function handleBuildingMaterialChange() {
      renderAllRepairOpeningSections();
    }

    function updateRepairOpeningWorkTypeCount(roomId, openingType, index, delta) {
      const config = getRepairOpeningConfig(openingType);
      const input = document.getElementById(`${roomId}_${config.domKey}_${index}_workTypeCount`);
      if (!input) return;

      let count = parseInt(input.value, 10) || 1;
      count = Math.max(1, Math.min(config.workTypeMax, count + delta));
      input.value = count;
      updateRepairOpeningItem(roomId, openingType, index, 'workTypeCount');
    }

    function renderRepairOpeningFields(roomId, openingType, count = null, changeSource = 'system') {
      const repair = ensureRepairDataStructure(roomId);
      const config = getRepairOpeningConfig(openingType);
      const container = document.getElementById(`${roomId}_${config.domKey}_list`);
      if (!container) return;
      const defaultOpeningMaterial = getDefaultRepairOpeningMaterial();

      const items = repair.finishing.openings[openingType];
      const previousLength = items.length;
      const finalCount = count === null ? items.length : count;
      items.length = finalCount;

      for (let i = 0; i < finalCount; i++) {
        if (!items[i]) {
          items[i] = {
            material: defaultOpeningMaterial || '',
            productMaterial: '',
            workTypes: [],
            workTypeCount: 1,
            width: config.defaultWidth,
            height: config.defaultHeight
          };
          if (changeSource === 'manual') {
            items[i].manualEntry = true;
          }
        } else {
          if (!items[i].material && defaultOpeningMaterial) items[i].material = defaultOpeningMaterial;
          if (!items[i].width) items[i].width = config.defaultWidth;
          if (!items[i].height) items[i].height = config.defaultHeight;
          items[i].workTypeCount = getRepairOpeningWorkTypeCount(items[i], openingType);
          items[i].workTypes = syncRepairOpeningWorkTypes(items[i], openingType, items[i].material || '', items[i].workTypeCount);
          delete items[i].workType;
        }
        if (changeSource === 'manual' && i >= previousLength && items[i].autoSource !== 'quest') {
          items[i].manualEntry = true;
        }
      }

      let html = '';
      for (let i = 0; i < finalCount; i++) {
        const item = items[i] || {};
        const material = item.material || defaultOpeningMaterial || '';
        const productMaterial = item.productMaterial || '';
        const workTypeCount = getRepairOpeningWorkTypeCount(item, openingType);
        const workOptions = getRepairOpeningWorkList(openingType, material);
        const workTypes = syncRepairOpeningWorkTypes(item, openingType, material, workTypeCount);
        const autoFilledBadge = renderRepairItemStatusBadge(item);
        const productLabel = openingType === 'door'
          ? '\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u0434\u0432\u0435\u0440\u0438'
          : openingType === 'window'
            ? '\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u043E\u043A\u043D\u0430'
            : '\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u0431\u0430\u043B\u043A\u043E\u043D\u043D\u043E\u0439 \u0434\u0432\u0435\u0440\u0438';

        html += `
          <div class="repair-item">
            <div class="flex items-center gap-2 mb-2">
              <div class="text-xs font-medium text-gray-500">${config.label}_${i + 1}</div>
              ${autoFilledBadge}
            </div>
            <div class="repair-grid gap-2">
              <div>
                <label class="text-xs text-gray-500 block mb-1">\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u043F\u0440\u043E\u0435\u043C\u0430:</label>
                <select id="${roomId}_${config.domKey}_${i}_material" class="repair-type-select w-full px-2 py-1 text-sm border rounded" onchange="updateRepairOpeningItem('${roomId}', '${openingType}', ${i}, 'material')">
                  <option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B</option>
                  ${repairOpeningMaterials[openingType].map(option => `<option value="${option.value}" ${material === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">${productLabel}:</label>
                <select id="${roomId}_${config.domKey}_${i}_productMaterial" class="repair-type-select w-full px-2 py-1 text-sm border rounded" onchange="updateRepairOpeningItem('${roomId}', '${openingType}', ${i}, 'productMaterial')">
                  <option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B</option>
                  ${repairOpeningProductMaterials[openingType].map(option => `<option value="${option.value}" ${productMaterial === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0432\u0438\u0434\u043E\u0432 \u0440\u0430\u0431\u043E\u0442\u044B:</label>
                <div class="repair-qty">
                  <button type="button" class="qty-btn-mini" onclick="updateRepairOpeningWorkTypeCount('${roomId}', '${openingType}', ${i}, -1)">\u2212</button>
                  <input type="number" id="${roomId}_${config.domKey}_${i}_workTypeCount" value="${workTypeCount}" min="1" max="${config.workTypeMax}" class="w-16 px-2 py-1 text-sm border rounded" oninput="updateRepairOpeningItem('${roomId}', '${openingType}', ${i}, 'workTypeCount')">
                  <button type="button" class="qty-btn-mini" onclick="updateRepairOpeningWorkTypeCount('${roomId}', '${openingType}', ${i}, 1)">+</button>
                </div>
              </div>
              ${Array.from({ length: workTypeCount }, (_, workIndex) => {
                const selectedValue = workTypes[workIndex] || '';
                return `<div>
                <label class="text-xs text-gray-500 block mb-1">\u0412\u0438\u0434 \u0440\u0430\u0431\u043E\u0442\u044B_${workIndex + 1}:</label>
                <select id="${roomId}_${config.domKey}_${i}_workType_${workIndex}" class="repair-type-select w-full px-2 py-1 text-sm border rounded" onchange="updateRepairOpeningItem('${roomId}', '${openingType}', ${i}, 'workType')">
                  <option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0438\u0434 \u0440\u0430\u0431\u043E\u0442\u044B</option>
                  ${workOptions.map(option => `<option value="${option}" ${selectedValue === option ? 'selected' : ''}>${option}</option>`).join('')}
                </select>
              </div>`;
              }).join('')}
              <div class="repair-grid cols-2">
                <div>
                  <label class="text-xs text-gray-500 block mb-1">\u0428\u0438\u0440\u0438\u043D\u0430, \u043C\u043C:</label>
                  <input type="number" id="${roomId}_${config.domKey}_${i}_width" value="${parseInt(item.width, 10) || config.defaultWidth}" min="100" step="10" class="w-full px-2 py-1 text-sm border rounded" onchange="updateRepairOpeningItem('${roomId}', '${openingType}', ${i}, 'width')">
                </div>
                <div>
                  <label class="text-xs text-gray-500 block mb-1">\u0412\u044B\u0441\u043E\u0442\u0430, \u043C\u043C:</label>
                  <input type="number" id="${roomId}_${config.domKey}_${i}_height" value="${parseInt(item.height, 10) || config.defaultHeight}" min="100" step="10" class="w-full px-2 py-1 text-sm border rounded" onchange="updateRepairOpeningItem('${roomId}', '${openingType}', ${i}, 'height')">
                </div>
              </div>
            </div>
          </div>`;
      }

      container.innerHTML = html;
      updateWhatToDoAutofillIndicators();
      checkRepairDone(roomId, config.domKey);
      checkRepairDone(roomId, 'openingsMount');
      checkRepairDone(roomId, 'finishing');
    }

    function updateRepairOpeningItem(roomId, openingType, index, source = 'value') {
      const repair = ensureRepairDataStructure(roomId);
      const config = getRepairOpeningConfig(openingType);
      const material = document.getElementById(`${roomId}_${config.domKey}_${index}_material`)?.value || '';
      const productMaterial = document.getElementById(`${roomId}_${config.domKey}_${index}_productMaterial`)?.value || '';
      const workTypeCount = Math.max(1, Math.min(config.workTypeMax, parseInt(document.getElementById(`${roomId}_${config.domKey}_${index}_workTypeCount`)?.value, 10) || 1));
      const width = parseInt(document.getElementById(`${roomId}_${config.domKey}_${index}_width`)?.value, 10) || config.defaultWidth;
      const height = parseInt(document.getElementById(`${roomId}_${config.domKey}_${index}_height`)?.value, 10) || config.defaultHeight;
      const workTypes = Array.from({ length: workTypeCount }, (_, workIndex) => {
        const value = document.getElementById(`${roomId}_${config.domKey}_${index}_workType_${workIndex}`)?.value || '';
        return value;
      }).filter(Boolean);
      const syncedWorkTypes = syncRepairOpeningWorkTypes({ workTypes, workTypeCount }, openingType, material, workTypeCount);

      if (!repair.finishing.openings[openingType][index]) {
        repair.finishing.openings[openingType][index] = {};
      }

      const currentItem = repair.finishing.openings[openingType][index] || {};
      const wasQuestionnaireBased = currentItem.autoSource === 'quest' || currentItem.manualEdited === true;

      repair.finishing.openings[openingType][index] = {
        material,
        productMaterial,
        workTypes: syncedWorkTypes,
        workTypeCount,
        width,
        height,
        autoFilled: false,
        ...(wasQuestionnaireBased ? { autoSource: 'quest', manualEdited: true } : { manualEntry: true })
      };

      renderRepairOpeningFields(roomId, openingType, repair.finishing.openings[openingType].length);
    }

    function renderAllRepairOpeningSections() {
      if (!roomData.repairData) return;
      for (const roomId of Object.keys(roomData.repairData)) {
        ['door', 'window', 'balcony'].forEach(openingType => renderRepairOpeningFields(roomId, openingType));
      }
    }
    
    function checkRepairDone(roomId, subType) {
      const domKey = getRepairCategoryDomKey(subType);
      const doneIconId = roomId + '_' + domKey + 'Done';
      const doneIcon = document.getElementById(doneIconId);
      const isParentSection = ['rough', 'engineering', 'finishing'].includes(subType);
      const headerId = roomId + '_' + (isParentSection ? subType : domKey) + 'Header';
      const headerEl = document.getElementById(headerId);
      
      let isDone = false;
      const data = roomData.repairData?.[roomId];
      
      if (!data) {
        isDone = false;
      } else if (subType === 'rough') {
        const floorDone = data.rough?.floorLeveling?.some(f => f.type);
        const wallPlasterDone = data.rough?.wallPlaster?.some(f => f.type);
        const wallPuttyDone = data.rough?.wallPutty?.some(f => f.type);
        const ceilingDone = data.rough?.ceilingPrep?.some(f => f.type);
        isDone = !!(floorDone || wallPlasterDone || wallPuttyDone || ceilingDone);
      } else if (subType === 'engineering') {
        const electricalDone = data.engineering?.electrical?.some(f => f.type);
        const ventilationDone = data.engineering?.ventilation?.some(f => f.type);
        const waterDone = data.engineering?.water?.some(f => f.type);
        const drainageDone = data.engineering?.drainage?.some(f => f.type);
        const heatingDone = data.engineering?.heating?.some(f => f.type);
        isDone = !!(electricalDone || ventilationDone || waterDone || drainageDone || heatingDone);
      } else if (subType === 'finishing') {
        const floorDone = data.finishing?.floor?.some(f => f.type);
        const wallDone = data.finishing?.wall?.some(f => f.type);
        const ceilingDone = data.finishing?.ceiling?.some(f => f.type);
        const stairsDone = data.finishing?.stairs?.some(f => f.type);
        const openingsDone = data.finishing?.openings?.door?.some(f => isRepairOpeningComplete(f, 'door')) ||
          data.finishing?.openings?.window?.some(f => isRepairOpeningComplete(f, 'window')) ||
          data.finishing?.openings?.balcony?.some(f => isRepairOpeningComplete(f, 'balcony'));
        isDone = !!(floorDone || wallDone || ceilingDone || stairsDone || openingsDone);
      } else if (['floorLeveling', 'wallPlaster', 'wallPutty', 'ceilingPrep'].includes(subType)) {
        isDone = !!data.rough?.[subType]?.some(f => f.type);
      } else if (['electrical', 'ventilation', 'water', 'drainage', 'heating'].includes(subType)) {
        isDone = !!data.engineering?.[subType]?.some(f => f.type);
      } else if (['floor', 'wall', 'ceiling', 'stairs'].includes(subType)) {
        isDone = !!data.finishing?.[subType]?.some(f => f.type);
      } else if (subType === 'openingsMount') {
        isDone = !!(
          data.finishing?.openings?.door?.some(f => isRepairOpeningComplete(f, 'door')) ||
          data.finishing?.openings?.window?.some(f => isRepairOpeningComplete(f, 'window')) ||
          data.finishing?.openings?.balcony?.some(f => isRepairOpeningComplete(f, 'balcony'))
        );
      } else if (subType === 'doorOpeningMount') {
        isDone = !!data.finishing?.openings?.door?.some(f => isRepairOpeningComplete(f, 'door'));
      } else if (subType === 'windowOpeningMount') {
        isDone = !!data.finishing?.openings?.window?.some(f => isRepairOpeningComplete(f, 'window'));
      } else if (subType === 'balconyOpeningMount') {
        isDone = !!data.finishing?.openings?.balcony?.some(f => isRepairOpeningComplete(f, 'balcony'));
      }
      
      if (doneIcon) {
        doneIcon.classList.toggle('hidden', isParentSection ? !isDone : true);
      }
      
      if (headerEl) {
        if (isParentSection) {
          headerEl.classList.remove('border-2', 'border-green-500', 'rounded', 'px-2', 'py-1');
        } else {
          const useTextHighlight = ['doorOpeningMount', 'windowOpeningMount', 'balconyOpeningMount'].includes(subType);
          if (useTextHighlight) {
            headerEl.classList.remove('border-2', 'border-green-500', 'rounded', 'px-2', 'py-1');
            headerEl.classList.toggle('text-green-600', isDone);
            headerEl.classList.toggle('dark:text-green-400', isDone);
            headerEl.classList.toggle('font-semibold', isDone);
          } else {
            headerEl.classList.remove('text-green-600', 'dark:text-green-400', 'font-semibold');
            headerEl.classList.toggle('border-2', isDone);
            headerEl.classList.toggle('border-green-500', isDone);
            headerEl.classList.toggle('rounded', isDone);
            headerEl.classList.toggle('px-2', isDone);
            if (!isDone) {
              headerEl.classList.remove('py-1');
            }
          }
        }
      }

      updateWhatToDoRoomCardState(roomId, 'repair');
      updateWhatToDoSectionStates();
    }
    
    function renderAllRepairSections() {
      if (!roomData.repairData) return;
      for (const roomId of Object.keys(roomData.repairData)) {
        const categories = ['floorLeveling', 'wallPlaster', 'wallPutty', 'ceilingPrep', 'electrical', 'ventilation', 'water', 'drainage', 'heating', 'floor', 'wall', 'ceiling'];
        for (const cat of categories) {
          renderRepairCategoryFields(roomId, cat);
        }
        ['door', 'window', 'balcony'].forEach(openingType => renderRepairOpeningFields(roomId, openingType));
      }
    }
    
    function restoreWhatToDoSubSections() {
      openWhatToDoSubSections.forEach((subsectionId) => {
        const content = document.getElementById(subsectionId + 'Content');
        const icon = document.getElementById(subsectionId + 'Icon');
        if (content) {
          content.style.display = 'block';
          if (icon) icon.style.transform = 'rotate(180deg)';
        }
      });
    }
    
    function refreshAllDemolitionBorders() {
      if (!roomData.demolitionData) return;
      for (const roomId in roomData.demolitionData) {
        checkDemolitionDone(roomId, 'partitions');
        checkDemolitionDone(roomId, 'electrical');
        checkDemolitionDone(roomId, 'finishing');
        checkDemolitionDone(roomId, 'finishing_floor');
        checkDemolitionDone(roomId, 'finishing_wall');
        checkDemolitionDone(roomId, 'finishing_ceiling');
        checkDemolitionDone(roomId, '_construct');
        checkDemolitionDone(roomId, '_engineering');
        checkDemolitionDone(roomId, '_openings');
        checkDemolitionDone(roomId, 'doorOpenings');
        checkDemolitionDone(roomId, 'windowOpenings');
        checkDemolitionDone(roomId, 'balconyOpenings');
        checkDemolitionDone(roomId, 'staircase');
        checkDemolitionDone(roomId, 'railing');
        checkDemolitionDone(roomId, '_stairs');
      }
    }
    
    function renderDemolitionRoomSection(roomId) {
      return `
        <div class="mb-2 sm:mb-3">
          <div id="${roomId}_constructHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600" onclick="toggleWhatToDoSubSection('${roomId}_construct')">
            <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_constructIcon"></i>
            <span>\u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u0432\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u0445 \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0439</span>
            <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_constructDone"></i>
          </div>
          <div id="${roomId}_constructContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
            <div id="${roomId}_partitionsSection" class="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded transition-all">
              <div id="${roomId}_partitionsHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600" onclick="toggleWhatToDoSubSection('${roomId}_partitions')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_partitionsIcon"></i>
                <span>\u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u043F\u0435\u0440\u0435\u0433\u043E\u0440\u043E\u0434\u043E\u043A</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_partitionsDone"></i>
              </div>
              <div id="${roomId}_partitionsContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                <div class="flex items-center gap-2 py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="flex items-center gap-1">
                    <button type="button" class="qty-btn-mini" onclick="updatePartitionCount('${roomId}', -1)">\u2212</button>
                    <input type="number" id="${roomId}_partitionCount" value="0" min="0" max="20" class="w-12 px-2 py-1 text-sm border rounded" oninput="handlePartitionInput('${roomId}')">
                    <button type="button" class="qty-btn-mini" onclick="updatePartitionCount('${roomId}', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_partitionsList"></div>
              </div>
            </div>
            <div id="${roomId}_openingsSection" class="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border-2 border-transparent transition-all">
              <div id="${roomId}_openingsHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600 border-2 border-transparent" onclick="toggleWhatToDoSubSection('${roomId}_openings')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_openingsIcon"></i>
                <span>\u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u043F\u0440\u043E\u0451\u043C\u043E\u0432</span>
              </div>
              <div id="${roomId}_openingsContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
                  <div id="${roomId}_doorOpeningsHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600 border-2 border-transparent" onclick="toggleWhatToDoSubSection('${roomId}_doorOpenings')">
                    <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_doorOpeningsIcon"></i>
                    <span>\u0414\u0432\u0435\u0440\u043D\u043E\u0439 \u043F\u0440\u043E\u0435\u043C</span>
                  </div>
                  <div id="${roomId}_doorOpeningsContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                    <div class="flex items-center gap-2 py-2">
                      <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                      <div class="flex items-center gap-1">
                        <button type="button" class="qty-btn-mini" onclick="updateOpeningCount('${roomId}', 'door', -1)">\u2212</button>
                        <input type="number" id="${roomId}_doorCount" value="0" min="0" max="20" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleOpeningInput('${roomId}', 'door')">
                        <button type="button" class="qty-btn-mini" onclick="updateOpeningCount('${roomId}', 'door', 1)">+</button>
                      </div>
                    </div>
                    <div id="${roomId}_doorList"></div>
                  </div>
                </div>
                <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
                  <div id="${roomId}_windowOpeningsHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm border-2 border-transparent" onclick="toggleWhatToDoSubSection('${roomId}_windowOpenings')">
                    <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_windowOpeningsIcon"></i>
                    <span>\u041E\u043A\u043E\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C</span>
                  </div>
                  <div id="${roomId}_windowOpeningsContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                    <div class="flex items-center gap-2 py-2">
                      <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                      <div class="flex items-center gap-1">
                        <button type="button" class="qty-btn-mini" onclick="updateOpeningCount('${roomId}', 'window', -1)">\u2212</button>
                        <input type="number" id="${roomId}_windowCount" value="0" min="0" max="20" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleOpeningInput('${roomId}', 'window')">
                        <button type="button" class="qty-btn-mini" onclick="updateOpeningCount('${roomId}', 'window', 1)">+</button>
                      </div>
                    </div>
                    <div id="${roomId}_windowList"></div>
                  </div>
                </div>
                <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
                  <div id="${roomId}_balconyOpeningsHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm border-2 border-transparent" onclick="toggleWhatToDoSubSection('${roomId}_balconyOpenings')">
                    <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_balconyOpeningsIcon"></i>
                    <span>\u0411\u0430\u043B\u043A\u043E\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0435\u043C</span>
                  </div>
                  <div id="${roomId}_balconyOpeningsContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                    <div class="flex items-center gap-2 py-2">
                      <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                      <div class="flex items-center gap-1">
                        <button type="button" class="qty-btn-mini" onclick="updateOpeningCount('${roomId}', 'balcony', -1)">\u2212</button>
                        <input type="number" id="${roomId}_balconyCount" value="0" min="0" max="20" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleOpeningInput('${roomId}', 'balcony')">
                        <button type="button" class="qty-btn-mini" onclick="updateOpeningCount('${roomId}', 'balcony', 1)">+</button>
                      </div>
                    </div>
                    <div id="${roomId}_balconyList"></div>
                  </div>
                </div>
              </div>
            </div>
            <div id="${roomId}_stairsSection" class="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border-2 border-transparent transition-all">
              <div id="${roomId}_stairsHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600" onclick="toggleWhatToDoSubSection('${roomId}_stairs')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_stairsIcon"></i>
                <span>Демонтаж лестниц и перил</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_stairsDone"></i>
              </div>
              <div id="${roomId}_stairsContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded">
                  <div id="${roomId}_staircaseHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_staircase')">
                    <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_staircaseIcon"></i>
                    <span>Демонтаж лестниц</span>
                    <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_staircaseDone"></i>
                  </div>
                  <div id="${roomId}_staircaseContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                    <div class="flex items-center gap-2 py-2">
                      <label class="text-sm text-gray-500 w-20 sm:w-24">Количество:</label>
                      <div class="flex items-center gap-1">
                        <button type="button" class="qty-btn-mini" onclick="updateStaircaseCount('${roomId}', -1)">−</button>
                        <input type="number" id="${roomId}_staircaseCount" value="0" min="0" max="20" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleStaircaseInput('${roomId}')">
                        <button type="button" class="qty-btn-mini" onclick="updateStaircaseCount('${roomId}', 1)">+</button>
                      </div>
                    </div>
                    <div id="${roomId}_staircaseList"></div>
                    <div class="construct-subtotal"><span class="construct-subtotal-label">Итого:</span><span class="construct-subtotal-val" id="${roomId}_staircaseTotal">—</span></div>
                  </div>
                </div>
                <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded">
                  <div id="${roomId}_railingHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_railing')">
                    <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_railingIcon"></i>
                    <span>Демонтаж перил</span>
                    <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_railingDone"></i>
                  </div>
                  <div id="${roomId}_railingContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                    <div class="flex items-center gap-2 py-2">
                      <label class="text-sm text-gray-500 w-20 sm:w-24">Количество:</label>
                      <div class="flex items-center gap-1">
                        <button type="button" class="qty-btn-mini" onclick="updateRailingCount('${roomId}', -1)">−</button>
                        <input type="number" id="${roomId}_railingCount" value="0" min="0" max="20" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleRailingInput('${roomId}')">
                        <button type="button" class="qty-btn-mini" onclick="updateRailingCount('${roomId}', 1)">+</button>
                      </div>
                    </div>
                    <div id="${roomId}_railingList"></div>
                    <div class="construct-subtotal"><span class="construct-subtotal-label">Итого:</span><span class="construct-subtotal-val" id="${roomId}_railingTotal">—</span></div>
                  </div>
                </div>
                <div class="construct-total-row">
                  <span class="construct-total-label">Итого — Демонтаж лестниц и перил:</span>
                  <span class="construct-total-val" id="${roomId}_stairsTotal">—</span>
                </div>
              </div>
            </div>
            <div class="construct-total-row">
              <span class="construct-total-label">Итого — Демонтаж внутренних конструкций:</span>
              <span class="construct-total-val" id="${roomId}_constructTotal">—</span>
            </div>
          </div>
        </div>
        <div class="mb-2 sm:mb-3">
          <div class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600" onclick="toggleWhatToDoSubSection('${roomId}_engineering')">
            <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_engineeringIcon"></i>
            <span>\u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u0438\u043D\u0436\u0435\u043D\u0435\u0440\u043D\u044B\u0445 \u0441\u0438\u0441\u0442\u0435\u043C</span>
            <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_engineeringDone"></i>
          </div>
          <div id="${roomId}_engineeringContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2.5" style="display: none;">
            <div class="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600" onclick="toggleWhatToDoSubSection('${roomId}_electrical')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_electricalIcon"></i>
                <span>\u041E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0438 \u0441\u043D\u044F\u0442\u0438\u0435 \u044D\u043B\u0435\u043A\u0442\u0440\u0438\u043A\u0438</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_electricalDone"></i>
              </div>
              <div id="${roomId}_electricalContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="flex items-center gap-2 py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="flex items-center gap-1">
                    <button type="button" class="qty-btn-mini" onclick="updateElectricalCount('${roomId}', -1)">\u2212</button>
                    <input type="number" id="${roomId}_electricalCount" value="0" min="0" max="20" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleElectricalInput('${roomId}')">
                    <button type="button" class="qty-btn-mini" onclick="updateElectricalCount('${roomId}', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_electricalList"></div>
              </div>
            </div>
            <div class="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div id="${roomId}_ventilationHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600" onclick="toggleWhatToDoSubSection('${roomId}_ventilation')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_ventilationIcon"></i>
                <span>Демонтаж вентиляции / кондиционирования</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_ventilationDone"></i>
              </div>
              <div id="${roomId}_ventilationContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="flex items-center gap-2 py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">Количество:</label>
                  <div class="flex items-center gap-1">
                    <button type="button" class="qty-btn-mini" onclick="updateVentilationCount('${roomId}', -1)">−</button>
                    <input type="number" id="${roomId}_ventilationCount" value="${roomData.demolitionData?.[roomId]?.ventilation?.length || 0}" min="0" max="20" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleVentilationInput('${roomId}')">
                    <button type="button" class="qty-btn-mini" onclick="updateVentilationCount('${roomId}', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_ventilationList"></div>
              </div>
            </div>
            <div class="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600" onclick="toggleWhatToDoSubSection('${roomId}_water')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_waterIcon"></i>
                <span>\u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u0441\u0438\u0441\u0442\u0435\u043C \u0432\u043E\u0434\u043E\u0441\u043D\u0430\u0431\u0436\u0435\u043D\u0438\u044F</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_waterDone"></i>
              </div>
              <div id="${roomId}_waterContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="flex items-center gap-2 py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="flex items-center gap-1">
                    <button type="button" class="qty-btn-mini" onclick="updateWaterSupplyCount('${roomId}', -1)">\u2212</button>
                    <input type="number" id="${roomId}_waterCount" value="0" min="0" max="20" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleWaterSupplyInput('${roomId}')">
                    <button type="button" class="qty-btn-mini" onclick="updateWaterSupplyCount('${roomId}', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_waterList"></div>
              </div>
            </div>
            <div class="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600" onclick="toggleWhatToDoSubSection('${roomId}_drainage')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_drainageIcon"></i>
                <span>\u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u043A\u0430\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_drainageDone"></i>
              </div>
              <div id="${roomId}_drainageContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="flex items-center gap-2 py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="flex items-center gap-1">
                    <button type="button" class="qty-btn-mini" onclick="updateDrainageCount('${roomId}', -1)">\u2212</button>
                    <input type="number" id="${roomId}_drainageCount" value="0" min="0" max="20" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleDrainageInput('${roomId}')">
                    <button type="button" class="qty-btn-mini" onclick="updateDrainageCount('${roomId}', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_drainageList"></div>
              </div>
            </div>
            <div class="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600" onclick="toggleWhatToDoSubSection('${roomId}_plumbing')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_plumbingIcon"></i>
                <span>\u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u0441\u0430\u043D\u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u043F\u0440\u0438\u0431\u043E\u0440\u043E\u0432</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_plumbingDone"></i>
              </div>
              <div id="${roomId}_plumbingContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                <div class="flex items-center gap-2 py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="flex items-center gap-1">
                    <button type="button" class="qty-btn-mini" onclick="updatePlumbingCount('${roomId}', -1)">\u2212</button>
                    <input type="number" id="${roomId}_plumbingCount" value="0" min="0" max="20" class="w-12 px-2 py-1 text-sm border rounded" oninput="handlePlumbingInput('${roomId}')">
                    <button type="button" class="qty-btn-mini" onclick="updatePlumbingCount('${roomId}', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_plumbingList"></div>
              </div>
            </div>
            <div class="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600" onclick="toggleWhatToDoSubSection('${roomId}_heating')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_heatingIcon"></i>
                <span>\u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u0441\u0438\u0441\u0442\u0435\u043C \u043E\u0442\u043E\u043F\u043B\u0435\u043D\u0438\u044F</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_heatingDone"></i>
              </div>
              <div id="${roomId}_heatingContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="flex items-center gap-2 py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="flex items-center gap-1">
                    <button type="button" class="qty-btn-mini" onclick="updateHeatingCount('${roomId}', -1)">\u2212</button>
                    <input type="number" id="${roomId}_heatingCount" value="0" min="0" max="20" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleHeatingInput('${roomId}')">
                    <button type="button" class="qty-btn-mini" onclick="updateHeatingCount('${roomId}', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_heatingList"></div>
              </div>
            </div>
          </div>
        </div>
        ${renderDemolitionFinishingSection(roomId)}
      `;
    }

    function renderWhatToDoRooms() {
      const demolitionLiving = document.getElementById('demolitionLivingRooms');
      const demolitionNonliving = document.getElementById('demolitionNonlivingRooms');
      const repairLiving = document.getElementById('repairLivingRooms');
      const repairNonliving = document.getElementById('repairNonlivingRooms');
      if (!demolitionLiving || !demolitionNonliving || !repairLiving || !repairNonliving) return;
      updateWhatToDoAutofillIndicators();

      let demolitionLivingHtml = '';
      let demolitionNonlivingHtml = '';
      let repairLivingHtml = '';
      let repairNonlivingHtml = '';

      const buildRoomCard = (roomId, roomName, iconClass, contentHtml) => `
        <div class="bg-white dark:bg-gray-600 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3">
          <div id="${roomId}CardHeader" class="flex items-center gap-2 py-1 cursor-pointer rounded transition-colors" style="font-size: 14px; font-weight: 600;" onclick="toggleWhatToDoSubSection('${roomId}')">
            <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}Icon"></i>
            <i class="fas ${iconClass} text-green-500"></i>
            <span class="text-green-500">${roomName}</span>
            <i class="fas fa-check text-green-500 text-xs hidden ml-auto" id="${roomId}Done"></i>
          </div>
          <div id="${roomId}Content" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
            ${contentHtml}
          </div>
        </div>
      `;

      if (roomData.living?.livingRooms) {
        roomData.living.livingRooms.forEach((room, index) => {
          if (!room || !(room.area > 0)) return;
          const roomName = `\u0416\u0438\u043B\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435_${index + 1}`;
          demolitionLivingHtml += buildRoomCard(`demo_living_${index}`, roomName, 'fa-couch', renderDemolitionRoomSection(`demo_living_${index}`));
          repairLivingHtml += buildRoomCard(`repair_living_${index}`, roomName, 'fa-hammer', renderRepairRoomSection(`repair_living_${index}`));
        });
      }

      if (roomData.nonliving?.livingRooms) {
        roomData.nonliving.livingRooms.forEach((room, index) => {
          if (!room || !(room.area > 0)) return;
          const roomName = `\u041D\u0435\u0436\u0438\u043B\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435_${index + 1}`;
          demolitionNonlivingHtml += buildRoomCard(`demo_nonliving_${index}`, roomName, 'fa-building', renderDemolitionRoomSection(`demo_nonliving_${index}`));
          repairNonlivingHtml += buildRoomCard(`repair_nonliving_${index}`, roomName, 'fa-building', renderRepairRoomSection(`repair_nonliving_${index}`));
        });
      }

      if (roomData.nonliving?.floors) {
        roomData.nonliving.floors.forEach((floor, floorIndex) => {
          if (!floor?.livingRooms) return;
          floor.livingRooms.forEach((room, roomIndex) => {
            if (!room || !(room.area > 0)) return;
            const roomName = `\u041D\u0435\u0436\u0438\u043B\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435_${floorIndex + 1}_${roomIndex + 1}`;
            demolitionNonlivingHtml += buildRoomCard(`demo_nonliving_${floorIndex}_${roomIndex}`, roomName, 'fa-building', renderDemolitionRoomSection(`demo_nonliving_${floorIndex}_${roomIndex}`));
            repairNonlivingHtml += buildRoomCard(`repair_nonliving_${floorIndex}_${roomIndex}`, roomName, 'fa-building', renderRepairRoomSection(`repair_nonliving_${floorIndex}_${roomIndex}`));
          });
        });
      }

      demolitionLiving.innerHTML = demolitionLivingHtml || '<div class="text-sm text-gray-400">\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445</div>';
      demolitionNonliving.innerHTML = demolitionNonlivingHtml || '<div class="text-sm text-gray-400">\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445</div>';
      repairLiving.innerHTML = repairLivingHtml || '<div class="text-sm text-gray-400">\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445</div>';
      repairNonliving.innerHTML = repairNonlivingHtml || '<div class="text-sm text-gray-400">\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445</div>';

      setTimeout(() => {
        renderAllDemolitionFinishingSections();
        Object.keys(roomData.demolitionData || {}).forEach(roomId => {
          const demolition = roomData.demolitionData?.[roomId] || {};
          const syncCountInput = (suffix, count) => {
            const input = document.getElementById(`${roomId}_${suffix}Count`);
            if (input) input.value = count;
          };
          const partitionCount = demolition.partitions?.length || 0;
          const partitionInput = document.getElementById(`${roomId}_partitionCount`);
          if (partitionInput) partitionInput.value = partitionCount;
          renderPartitionFields(roomId, partitionCount);
          ['door', 'window', 'balcony'].forEach(openingType => {
            const openingCount = demolition[`${openingType}Openings`]?.length || 0;
            syncCountInput(openingType, openingCount);
            renderOpeningFields(roomId, openingType, openingCount);
          });
          syncCountInput('electrical', demolition.electrical?.length || 0);
          syncCountInput('ventilation', demolition.ventilation?.length || 0);
          syncCountInput('water', demolition.water?.length || 0);
          syncCountInput('drainage', demolition.drainage?.length || 0);
          syncCountInput('plumbing', demolition.plumbing?.length || 0);
          syncCountInput('heating', demolition.heating?.length || 0);
          renderElectricalFields(roomId, roomData.demolitionData?.[roomId]?.electrical?.length || 0);
          renderVentilationFields(roomId, roomData.demolitionData?.[roomId]?.ventilation?.length || 0);
          renderWaterSupplyFields(roomId, roomData.demolitionData?.[roomId]?.water?.length || 0);
          renderDrainageFields(roomId, roomData.demolitionData?.[roomId]?.drainage?.length || 0);
          renderPlumbingFields(roomId, roomData.demolitionData?.[roomId]?.plumbing?.length || 0);
          renderHeatingFields(roomId, roomData.demolitionData?.[roomId]?.heating?.length || 0);
        });
        refreshAllDemolitionBorders();
        renderAllRepairSections();
        restoreWhatToDoSubSections();
        Object.keys(roomData.demolitionData || {}).forEach(roomId => updateWhatToDoRoomCardState(roomId, 'demo'));
        Object.keys(roomData.repairData || {}).forEach(roomId => updateWhatToDoRoomCardState(roomId, 'repair'));
        updateWhatToDoSectionStates();
      }, 100);
    }
    
    function toggleRoomContent(roomId) {
      const content = document.getElementById(roomId);
      const icon = document.getElementById(roomId + 'Icon');
      if (!content) return;
      
      const isOpen = content.style.display !== 'none';
      
      if (isOpen) {
        content.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(-90deg)';
      } else {
        content.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(0deg)';
      }
    }
    
    function renderDoorSizes(room, data, roomId) {
      if (room.has_windows === false) return '';
      const doorCount = Math.min(data.doors || 0, 5);
      let doorSizeInputs = '';
      for (let i = 0; i < doorCount; i++) {
        const doorW = data.doorWidths?.[i] || 80;
        const doorH = data.doorHeights?.[i] || 200;
        doorSizeInputs += `
          <div class="text-xs text-gray-500 mb-1 mt-2">\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0434\u0432\u0435\u0440\u0438_${i + 1} (\u0441\u043C):</div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0428\u0438\u0440:</label>
              <input type="number" value="${doorW}" min="50" max="120"
                     class="area-input text-xs" data-field="doorWidth_${i}"
                     onchange="updateDoorSize('${roomId}', ${i}, 'width', this.value)"
                     oninput="updateDoorSize('${roomId}', ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0412\u044B\u0441:</label>
              <input type="number" value="${doorH}" min="150" max="250"
                     class="area-input text-xs" data-field="doorHeight_${i}"
                     onchange="updateDoorSize('${roomId}', ${i}, 'height', this.value)"
                     oninput="updateDoorSize('${roomId}', ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'doors')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="doorsIcon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u0414\u0432\u0435\u0440\u0438</span>
          </div>
          <div id="doorsGroup_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'doors', -1)">\u2212</button>
                <input type="number" value="${data.doors}" min="0" max="5"
                       class="qty-input" data-field="doors" onchange="updateRoomData('${roomId}', 'doors', this.value)">
                <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'doors', 1)">+</button>
              </div>
              <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
            </div>
            ${doorSizeInputs}
          </div>
        </div>`;
    }
    
    function renderWindowSizes(room, data, roomId) {
      if (room.has_windows === false) return '';
      const windowCount = Math.min(data.windows || 0, 5);
      let windowSizeInputs = '';
      for (let i = 0; i < windowCount; i++) {
        const winW = data.windowWidths?.[i] || 130;
        const winH = data.windowHeights?.[i] || 140;
        windowSizeInputs += `
          <div class="text-xs text-gray-500 mb-1 mt-2">\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u043E\u043A\u043D\u0430_${i + 1} (\u0441\u043C):</div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0428\u0438\u0440:</label>
              <input type="number" value="${winW}" min="80" max="250"
                     class="area-input text-xs" data-field="windowWidth_${i}"
                     onchange="updateWindowSize('${roomId}', ${i}, 'width', this.value)"
                     oninput="updateWindowSize('${roomId}', ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0412\u044B\u0441:</label>
              <input type="number" value="${winH}" min="80" max="200"
                     class="area-input text-xs" data-field="windowHeight_${i}"
                     onchange="updateWindowSize('${roomId}', ${i}, 'height', this.value)"
                     oninput="updateWindowSize('${roomId}', ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'windows')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="windowsIcon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u041E\u043A\u043D\u0430</span>
          </div>
          <div id="windowsGroup_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'windows', -1)">\u2212</button>
                <input type="number" value="${data.windows}" min="0" max="5"
                       class="qty-input" data-field="windows" onchange="updateRoomData('${roomId}', 'windows', this.value)">
                <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'windows', 1)">+</button>
              </div>
              <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
            </div>
            ${windowSizeInputs}
          </div>
        </div>`;
    }
    
    function renderLivingRoomGroup(room, roomId, index) {
      const buildingType = document.getElementById('detailedBuildingType')?.value || 'apartment';
      let defaultRoomType = room.default_room_type || room.room_types?.[0]?.name || '\u0421\u043F\u0430\u043B\u044C\u043D\u044F';
      if (roomId === 'nonliving' && buildingType === 'multi_floor') {
        defaultRoomType = '\u041E\u0444\u0438\u0441';
      }
      
      const roomTypeDefaultAreas = {
        '\u041A\u0443\u0445\u043D\u044F': 10,
        '\u0414\u0443\u0448\u0435\u0432\u0430\u044F': 4,
        '\u0412\u0430\u043D\u043D\u0430\u044F': 4,
        '\u0421\u0430\u043D\u0443\u0437\u0435\u043B': 1.5,
        '\u0421\u043E\u0432\u043C\u0435\u0449\u0435\u043D\u043D\u044B\u0439 \u0421/\u0423': 5,
        '\u041F\u0440\u0438\u0445\u043E\u0436\u0430\u044F': 3,
        '\u041A\u043E\u0440\u0438\u0434\u043E\u0440': 2,
        '\u0413\u0430\u0440\u0434\u0435\u0440\u043E\u0431\u043D\u0430\u044F': 1.5,
        '\u0411\u0430\u043B\u043A\u043E\u043D': 1.2,
        '\u041B\u043E\u0434\u0436\u0438\u044F': 2,
        '\u0422\u0435\u0440\u0440\u0430\u0441\u0430': 4,
        '\u041E\u0444\u0438\u0441': 20,
        '\u0421\u043F\u0430\u043B\u044C\u043D\u044F': 20,
        '\u0414\u0435\u0442\u0441\u043A\u0430\u044F': 15,
        '\u0413\u043E\u0441\u0442\u0438\u043D\u0430\u044F': 25,
        '\u041A\u0430\u0431\u0438\u043D\u0435\u0442': 15
      };
      
      const defaultArea = roomTypeDefaultAreas[defaultRoomType] || 20;
      
      const data = roomData[roomId].livingRooms[index] || {
        area: defaultArea,
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
        nicheArea: 0,
        columnArea: 0,
        archCount: 1,
        archAreas: [0, 0, 0, 0, 0],
        materialCoefficient: 1.1,
        nicheCount: 0,
        nicheAreas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        projectionCount: 0,
        projectionAreas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        columnCount: 0,
        columnAreas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        appointment: '',
        subAppointment: '',
        location: 'above_ground'
      };
      roomData[roomId].livingRooms[index] = data;
      
      const groupId = `livingRoom_${index}`;
      return `
        <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', '${groupId}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="${groupId}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-bold text-green-600 dark:text-green-400">${room.name}_${index + 1}</span>
          </div>
          <div id="${groupId}Group_${roomId}" style="display: none" class="mt-2">
            ${room.has_room_type ? `
            <div class="area-input-group vertical" style="margin: 8px 0">
              <label class="text-sm text-gray-500 font-bold">Назначение:</label>
              <select id="appointment_${roomId}_${index}" class="w-full px-3 py-2 border rounded-lg bg-bg-primary" onchange="updateRoomAppointment('${roomId}', ${index}, this.value)">
                <option value="">Выберите назначение</option>
                ${(() => {
                  const buildingSubtype = document.getElementById('buildingSubtype')?.value || '';
                  if (buildingAppointments[buildingSubtype]) {
                    return buildingAppointments[buildingSubtype].map(item => `<option value="${item.value}" ${data.appointment === item.value ? 'selected' : ''}>${item.label}</option>`).join('');
                  }
                  return '';
                })()}
              </select>
            </div>
            <div class="area-input-group vertical" style="margin: 8px 0">
              <label class="text-sm text-gray-500 font-bold">Формат помещения:</label>
              <select id="subAppointment_${roomId}_${index}" class="w-full px-3 py-2 border rounded-lg bg-bg-primary" onchange="updateRoomSubAppointment('${roomId}', ${index}, this.value)">
                <option value="">Выберите</option>
              </select>
            </div>
            <div class="area-input-group vertical" style="margin: 8px 0">
              <label class="text-sm text-gray-500 font-bold">Расположение:</label>
              <select id="location_${roomId}_${index}" class="w-full px-3 py-2 border rounded-lg bg-bg-primary" onchange="updateRoomLocation('${roomId}', ${index}, this.value)">
                <option value="above_ground" ${data.location === 'above_ground' || !data.location ? 'selected' : ''}>Надземное помещение</option>
                <option value="basement" ${data.location === 'basement' ? 'selected' : ''}>Подвальное помещение</option>
                <option value="ground_floor" ${data.location === 'ground_floor' ? 'selected' : ''}>Цокольное помещение</option>
                <option value="attic" ${data.location === 'attic' ? 'selected' : ''}>Мансарда</option>
              </select>
            </div>
            <div class="area-input-group" style="margin: 8px 0">
              <label class="text-sm text-gray-500 w-12 font-bold">\u0422\u0438\u043F:</label>
              <div class="custom-select-wrapper" style="position: relative; display: inline-block;">
                <button type="button" class="custom-select-btn" style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; border: 2px solid #4ade80; border-radius: 6px; background: var(--bg-primary); font-size: 14px; font-weight: 600; cursor: pointer; min-width: 160px;" onclick="toggleCustomSelect('${roomId}', ${index})">
                  <i class="fas ${room.room_types.find(t => t.name === data.roomType)?.icon || 'fa-home'}" id="roomTypeIcon_${roomId}_${index}" style="color: #22c55e"></i>
                  <span id="roomTypeText_${roomId}_${index}">${data.roomType}</span>
                  <i class="fas fa-chevron-down" style="margin-left: auto; font-size: 10px; color: #6b7280"></i>
                </button>
                <div id="customSelect_${roomId}_${index}" class="custom-select-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-primary); border: 2px solid #4ade80; border-radius: 6px; margin-top: 4px; max-height: 200px; overflow-y: auto; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                  ${(() => {
                    const buildingType = document.getElementById('detailedBuildingType')?.value || 'apartment';
                    let types = [...room.room_types];
                    if (roomId === 'nonliving' && buildingType === 'multi_floor') {
                      types.unshift({name: '\u041E\u0444\u0438\u0441', icon: 'fa-briefcase'});
                    }
                    return types.map(type => `<div class="custom-select-option" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; transition: background 0.2s;" onmouseenter="this.style.background='rgba(74, 222, 128, 0.1)'" onmouseleave="this.style.background='transparent'" onclick="selectRoomType('${roomId}', ${index}, '${type.name}', '${type.icon}')"><i class="fas ${type.icon} text-brand-500" style="color: #22c55e !important;"></i><span style="color: inherit;">${type.name}</span></div>`).join('');
                  })()}
                </div>
              </div>
            </div>
            <div class="area-input-group" style="margin: 8px 0">
              <label class="text-sm text-gray-500 w-24 font-bold">\u0412\u044B\u0441\u043E\u0442\u0430 \u043F\u043E\u0442\u043E\u043B\u043A\u0430:</label>
              <input type="number" value="${parseFloat(data.ceiling || 3).toFixed(2)}" min="2" max="5.00" step="0.01"
                     class="area-input" style="width: 70px" data-field="ceiling"
                     onchange="updateLivingRoomData('${roomId}', ${index}, 'ceiling', this.value)"
                     oninput="updateLivingRoomData('${roomId}', ${index}, 'ceiling', this.value)">
              <span class="text-xs text-gray-500 ml-1">\u043C</span>
            </div>
            ` : ''}
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-24">\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043F\u043E\u043B\u0430:</label>
              <input type="number" id="livingRoomArea_${roomId}_${index}" value="${parseFloat(data.area).toFixed(2)}" min="1" max="200" step="0.01"
                     class="area-input" style="width: 80px" data-field="area"
                     onchange="updateLivingRoomData('${roomId}', ${index}, 'area', this.value)"
                     oninput="updateLivingRoomData('${roomId}', ${index}, 'area', this.value)">
              <span class="text-xs text-gray-500">\u043C\u00B2</span>
            </div>
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-24">\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0441\u0442\u0435\u043D:</label>
              <input type="number" value="${calculateLivingRoomWallsArea(data).toFixed(2)}" min="0" max="500"
                     class="area-input" style="width: 80px; border: 1px solid #4ade80; border-radius: 6px" data-field="wallsArea" readonly>
              <span class="text-xs text-gray-500">\u043C\u00B2</span>
            </div>
            <div class="text-[10px] text-gray-400 mb-2">\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0441\u0442\u0435\u043D \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438</div>
            ${renderLivingRoomDoors(room, data, roomId, index)}
            ${renderLivingRoomWindows(room, data, roomId, index)}
            ${renderLivingRoomBalcony(room, data, roomId, index)}
            <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'livingArch_${index}')">
                <i class="fas fa-chevron-down text-xs transition-transform" id="livingArch_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
                <span class="text-sm font-medium">\u0410\u0440\u043A\u0438/\u043F\u0440\u043E\u0435\u043C\u044B</span>
              </div>
              <div id="livingArch_${index}Group_${roomId}" style="display: none" class="mt-2">
                <div class="area-input-group">
                  <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
                  <div class="qty-controls">
                    <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'archCount', -1)">\u2212</button>
                    <input type="number" value="${data.archCount || 1}" min="0" max="5"
                           class="qty-input" onchange="updateLivingRoomData('${roomId}', ${index}, 'archCount', this.value)">
                    <button type="button" class="qty-btn" onclick="changeLivingRoomField('${roomId}', ${index}, 'archCount', 1)">+</button>
                  </div>
                  <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
                </div>
                ${(() => {
                  const archCount = Math.min(data.archCount || 1, 5);
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
                  return archAreaInputs;
                })()}
              </div>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'livingAdditional_${index}')">
                <i class="fas fa-chevron-down text-xs transition-transform" id="livingAdditional_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
                <span class="text-sm font-medium">\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438</span>
              </div>
              <div id="livingAdditional_${index}Group_${roomId}" style="display: none" class="mt-2">
                <div class="mb-2">
                  <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'livingNiche_${index}')">
                    <i class="fas fa-chevron-down text-xs transition-transform" id="livingNiche_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
                    <i class="fas fa-th-large text-gray-500 text-xs"></i>
                    <span class="text-sm font-medium text-gray-600">\u041D\u0438\u0448\u0430</span>
                  </div>
                  <div id="livingNiche_${index}Group_${roomId}" style="display: none" class="mt-1 ml-2">
                    <div class="area-input-group">
                      <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
                      <div class="qty-controls">
                        <button type="button" class="qty-btn" onclick="var el = this.nextElementSibling; var newVal = Math.max(0, parseInt(el.value || 0) - 1); el.value = newVal; roomData['${roomId}'].livingRooms[${index}].nicheCount = newVal; renderNicheAreaInputs('${roomId}', ${index}, newVal); updateTotalAreas();">\u2212</button>
                        <input type="number" id="nicheCount_input_${roomId}_${index}" value="${data.nicheCount || 0}" min="0" max="15"
                               class="qty-input" data-field="nicheCount">
                        <button type="button" class="qty-btn" onclick="var el = this.previousElementSibling; var newVal = Math.min(15, parseInt(el.value || 0) + 1); el.value = newVal; roomData['${roomId}'].livingRooms[${index}].nicheCount = newVal; renderNicheAreaInputs('${roomId}', ${index}, newVal); updateTotalAreas();">+</button>
                      </div>
                      <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
                    </div>
                    ${(() => {
                      const nicheCount = Math.min(data.nicheCount || 0, 15);
                      let nicheInputs = '';
                      for (let i = 0; i < nicheCount; i++) {
                        const nicheArea = data.nicheAreas?.[i] || 0;
                        nicheInputs += `
                          <div class="area-input-group mt-1">
                            <label class="text-xs text-gray-500 w-28">\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043D\u0438\u0448\u0438_${i + 1}:</label>
                            <input type="number" value="${parseFloat(nicheArea).toFixed(2)}" min="0" max="50" step="0.01"
                                   class="area-input" style="width: 70px"
                                   onchange="updateLivingRoomNicheArea('${roomId}', ${index}, ${i}, this.value)"
                                   oninput="updateLivingRoomNicheArea('${roomId}', ${index}, ${i}, this.value)">
                            <span class="text-xs text-gray-500">\u043C\u00B2</span>
                          </div>`;
                      }
                      return nicheInputs;
                    })()}
                  </div>
                </div>
                <div class="mb-2">
                  <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'livingProjection_${index}')">
                    <i class="fas fa-chevron-down text-xs transition-transform" id="livingProjection_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
                    <i class="fas fa-caret-square-up text-gray-500 text-xs"></i>
                    <span class="text-sm font-medium text-gray-600">\u0412\u044B\u0441\u0442\u0443\u043F</span>
                  </div>
                  <div id="livingProjection_${index}Group_${roomId}" style="display: none" class="mt-1 ml-2">
                    <div class="area-input-group">
                      <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
                      <div class="qty-controls">
                        <button type="button" class="qty-btn" onclick="var el = this.nextElementSibling; var newVal = Math.max(0, parseInt(el.value || 0) - 1); el.value = newVal; roomData['${roomId}'].livingRooms[${index}].projectionCount = newVal; renderProjectionAreaInputs('${roomId}', ${index}, newVal); updateTotalAreas();">\u2212</button>
                        <input type="number" id="projectionCount_input_${roomId}_${index}" value="${data.projectionCount || 0}" min="0" max="15"
                               class="qty-input" data-field="projectionCount">
                        <button type="button" class="qty-btn" onclick="var el = this.previousElementSibling; var newVal = Math.min(15, parseInt(el.value || 0) + 1); el.value = newVal; roomData['${roomId}'].livingRooms[${index}].projectionCount = newVal; renderProjectionAreaInputs('${roomId}', ${index}, newVal); updateTotalAreas();">+</button>
                      </div>
                      <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
                    </div>
                    ${(() => {
                      const projCount = Math.min(data.projectionCount || 0, 15);
                      let projInputs = '';
                      for (let i = 0; i < projCount; i++) {
                        const projArea = data.projectionAreas?.[i] || 0;
                        projInputs += `
                          <div class="area-input-group mt-1">
                            <label class="text-xs text-gray-500 w-28">\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0432\u044B\u0441\u0442\u0443\u043F\u0430_${i + 1}:</label>
                            <input type="number" value="${parseFloat(projArea).toFixed(2)}" min="0" max="50" step="0.01"
                                   class="area-input" style="width: 70px"
                                   onchange="updateLivingRoomProjectionArea('${roomId}', ${index}, ${i}, this.value)"
                                   oninput="updateLivingRoomProjectionArea('${roomId}', ${index}, ${i}, this.value)">
                            <span class="text-xs text-gray-500">\u043C\u00B2</span>
                          </div>`;
                      }
                      return projInputs;
                    })()}
                  </div>
                </div>
                <div>
                  <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'livingColumn_${index}')">
                    <i class="fas fa-chevron-down text-xs transition-transform" id="livingColumn_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
                    <i class="fas fa-columns text-gray-500 text-xs"></i>
                    <span class="text-sm font-medium text-gray-600">\u041A\u043E\u043B\u043E\u043D\u043D\u0430</span>
                  </div>
                  <div id="livingColumn_${index}Group_${roomId}" style="display: none" class="mt-1 ml-2">
                    <div class="area-input-group">
                      <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
                      <div class="qty-controls">
                        <button type="button" class="qty-btn" onclick="var el = this.nextElementSibling; var newVal = Math.max(0, parseInt(el.value || 0) - 1); el.value = newVal; roomData['${roomId}'].livingRooms[${index}].columnCount = newVal; renderColumnAreaInputs('${roomId}', ${index}, newVal); updateTotalAreas();">\u2212</button>
                        <input type="number" id="columnCount_input_${roomId}_${index}" value="${data.columnCount || 0}" min="0" max="15"
                               class="qty-input" data-field="columnCount">
                        <button type="button" class="qty-btn" onclick="var el = this.previousElementSibling; var newVal = Math.min(15, parseInt(el.value || 0) + 1); el.value = newVal; roomData['${roomId}'].livingRooms[${index}].columnCount = newVal; renderColumnAreaInputs('${roomId}', ${index}, newVal); updateTotalAreas();">+</button>
                      </div>
                      <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
                    </div>
                    ${(() => {
                      const colCount = Math.min(data.columnCount || 0, 15);
                      let colInputs = '';
                      for (let i = 0; i < colCount; i++) {
                        const colArea = data.columnAreas?.[i] || 0;
                        colInputs += `
                          <div class="area-input-group mt-1">
                            <label class="text-xs text-gray-500 w-28">\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043A\u043E\u043B\u043E\u043D\u043D\u044B_${i + 1}:</label>
                            <input type="number" value="${parseFloat(colArea).toFixed(2)}" min="0" max="50" step="0.01"
                                   class="area-input" style="width: 70px"
                                   onchange="updateLivingRoomColumnArea('${roomId}', ${index}, ${i}, this.value)"
                                   oninput="updateLivingRoomColumnArea('${roomId}', ${index}, ${i}, this.value)">
                            <span class="text-xs text-gray-500">\u043C\u00B2</span>
                          </div>`;
                      }
                      return colInputs;
                    })()}
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'livingMaterials_${index}')">
                <i class="fas fa-chevron-down text-xs transition-transform" id="livingMaterials_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
                <span class="text-sm font-medium">\u041F\u043B\u043E\u0449\u0430\u0434\u0438 \u0431\u0435\u0437 \u0437\u0430\u043F\u0430\u0441\u0430</span>
              </div>
              <div id="livingMaterials_${index}Group_${roomId}" style="display: none" class="mt-2">
                <div class="area-input-group">
                  <label class="text-xs text-gray-500 w-32">\u0417\u0430\u043F\u0430\u0441 \u0434\u043B\u044F \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432:</label>
                  <input type="number" id="livingRoomMatCoeff_${roomId}_${index}" value="${data.materialCoefficient || 1.1}" min="1" max="2" step="0.05"
                         class="area-input" style="width: 70px" data-field="materialCoefficient"
                         onchange="updateLivingRoomData('${roomId}', ${index}, 'materialCoefficient', this.value); updateMaterialAreasDisplay('${roomId}', ${index})"
                         oninput="updateLivingRoomData('${roomId}', ${index}, 'materialCoefficient', this.value); updateMaterialAreasDisplay('${roomId}', ${index})">
                  <span class="text-xs text-gray-500 ml-1">\u00D7</span>
                </div>
                <div class="text-xs text-gray-500 mt-2">
                  <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043F\u043E\u043B\u0430: <span class="font-medium" id="livingRoomMatFloor_${roomId}_${index}">${parseFloat(data.area || 0).toFixed(2)} \u043C\u00B2</span></div>
                  <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0441\u0442\u0435\u043D: <span class="font-medium" id="livingRoomMatWalls_${roomId}_${index}">${calculateLivingRoomWallsArea(data).toFixed(2)} \u043C\u00B2</span></div>
                </div>
              </div>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'repairInfo_${index}')">
                <i class="fas fa-chevron-down text-xs transition-transform" id="repairInfo_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
                <span class="text-sm font-medium">\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u0440\u0435\u043C\u043E\u043D\u0442\u0435</span>
              </div>
              <div id="repairInfo_${index}Group_${roomId}" style="display: none" class="mt-2">
                ${(data.area > 0) ? `
                  <div class="space-y-3">
                    <div>
                      <label class="block text-sm text-gray-500 mb-1">\u0422\u0435\u043A\u0443\u0449\u0435\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435</label>
                      <select class="ml-1 w-[340px] md:w-full px-3 py-2 text-base border rounded" data-field="currentState" onchange="updateLivingRoomRepairData('${roomId}', ${index}, 'currentState', this.value)">
                        <option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435</option>
                        <option value="concrete_with_walls" ${data.repairData?.currentState === 'concrete_with_walls' ? 'selected' : ''}>Без отделки (с перегородками)</option>
                        <option value="concrete_no_walls" ${data.repairData?.currentState === 'concrete_no_walls' ? 'selected' : ''}>Без отделки (без перегородок)</option>
                        <option value="rough_finish" ${data.repairData?.currentState === 'rough_finish' ? 'selected' : ''}>\u0427\u0435\u0440\u043D\u043E\u0432\u0430\u044F \u043E\u0442\u0434\u0435\u043B\u043A\u0430</option>
                        <option value="whitebox" ${data.repairData?.currentState === 'whitebox' ? 'selected' : ''}>\u041F\u0440\u0435\u0434\u0447\u0438\u0441\u0442\u043E\u0432\u0430\u044F White-box</option>
                        <option value="old_finish" ${data.repairData?.currentState === 'old_finish' ? 'selected' : ''}>\u041D\u0430\u043B\u0438\u0447\u0438\u0435 \u0441\u0442\u0430\u0440\u043E\u0439 \u043E\u0442\u0434\u0435\u043B\u043A\u0438</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-base text-gray-600 mb-1">\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u0435\u0440\u0435\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u043A\u0430:</label>
                      <div class="flex gap-3">
                      <label class="flex items-center gap-1 text-sm">
                        <input type="radio" name="requiresRedesign_${roomId}_${index}" value="yes" ${data.repairData?.requiresRedesign === 'yes' ? 'checked' : ''} onchange="updateLivingRoomRepairData('${roomId}', ${index}, 'requiresRedesign', 'yes')"> \u0414\u0430
                      </label>
                      <label class="flex items-center gap-1 text-sm">
                        <input type="radio" name="requiresRedesign_${roomId}_${index}" value="no" ${data.repairData?.requiresRedesign !== 'yes' ? 'checked' : ''} onchange="updateLivingRoomRepairData('${roomId}', ${index}, 'requiresRedesign', 'no')"> \u041D\u0435\u0442
                      </label>
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm text-gray-500 mb-1">\u041A\u0430\u043A\u043E\u0439 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0440\u0435\u043C\u043E\u043D\u0442</label>
                    <select class="w-[340px] md:w-full px-3 py-2 text-base border rounded" data-field="repairTypeNew" onchange="updateLivingRoomRepairData('${roomId}', ${index}, 'repairTypeNew', this.value)">
                      <option value="turnkey" ${data.repairData?.repairTypeNew === 'turnkey' ? 'selected' : ''}>\u041F\u043E\u0434 \u043A\u043B\u044E\u0447 (\u0441 \u043C\u0435\u0431\u0435\u043B\u044C\u044E)</option>
                      <option value="clean" ${data.repairData?.repairTypeNew === 'clean' ? 'selected' : ''}>\u0427\u0438\u0441\u0442\u043E\u0432\u0430\u044F \u043E\u0442\u0434\u0435\u043B\u043A\u0430</option>
                      <option value="whitebox_new" ${data.repairData?.repairTypeNew === 'whitebox_new' ? 'selected' : ''}>\u041F\u0440\u0435\u0434\u0447\u0438\u0441\u0442\u043E\u0432\u0430\u044F White-box</option>
                      <option value="rough" ${data.repairData?.repairTypeNew === 'rough' ? 'selected' : ''}>\u0427\u0435\u0440\u043D\u043E\u0432\u0430\u044F \u043E\u0442\u0434\u0435\u043B\u043A\u0430</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-base text-gray-600 mb-1">\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0434\u0438\u0437\u0430\u0439\u043D-\u043F\u0440\u043E\u0435\u043A\u0442?</label>
                    <div class="flex gap-2 flex-wrap">
                      <label class="flex items-center gap-1 text-sm">
                        <input type="radio" name="designProject_${roomId}_${index}" value="yes" ${data.repairData?.designProject === 'yes' ? 'checked' : ''} onchange="updateLivingRoomRepairData('${roomId}', ${index}, 'designProject', 'yes'); toggleRoomDesignOptions('${roomId}', ${index})"> \u0414\u0430
                      </label>
                      <label class="flex items-center gap-1 text-sm">
                        <input type="radio" name="designProject_${roomId}_${index}" value="has" ${data.repairData?.designProject === 'has' ? 'checked' : ''} onchange="updateLivingRoomRepairData('${roomId}', ${index}, 'designProject', 'has'); hideRoomDesignOptions('${roomId}', ${index})"> \u0423\u0436\u0435 \u0435\u0441\u0442\u044C
                      </label>
                      <label class="flex items-center gap-1 text-sm">
                        <input type="radio" name="designProject_${roomId}_${index}" value="no" ${data.repairData?.designProject === 'no' || !data.repairData?.designProject ? 'checked' : ''} onchange="updateLivingRoomRepairData('${roomId}', ${index}, 'designProject', 'no'); hideRoomDesignOptions('${roomId}', ${index})"> \u041D\u0435\u0442
                      </label>
                    </div>
                  </div>
                  <div id="designProjectOptions_${roomId}_${index}" style="display: ${data.repairData?.designProject === 'yes' ? 'block' : 'none'}" class="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <label class="block text-sm font-medium mb-2">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0438\u0437\u0430\u0439\u043D \u043F\u0440\u043E\u0435\u043A\u0442:</label>
                    <div class="space-y-2">
                      <label class="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        <input type="radio" name="designProjectType_${roomId}_${index}" value="minimal" ${data.repairData?.designProjectType === 'minimal' ? 'checked' : ''} class="mt-1" onchange="updateLivingRoomRepairData('${roomId}', ${index}, 'designProjectType', 'minimal')">
                        <div>
                          <div class="text-xs font-medium">\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u2013 1000 \u20BD/\u043C\u00B2</div>
                            <div class="text-sm text-gray-500">\u041E\u0431\u043C\u0435\u0440\u043D\u044B\u0439 \u043F\u043B\u0430\u043D \u0438 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u043A\u0430 (3 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430), \u041F\u043E\u0434\u0431\u043E\u0440 \u0441\u0442\u0438\u043B\u044F, \u043C\u0443\u0434\u0431\u043E\u0440\u0434, \u041F\u043B\u0430\u043D \u043F\u043E \u044D\u043B\u0435\u043A\u0442\u0440\u0438\u043A\u0435 \u0438 \u043E\u0441\u0432\u0435\u0449\u0435\u043D\u0438\u044E, \u0420\u0430\u0441\u043A\u043B\u0430\u0434\u043A\u0430 \u043F\u043B\u0438\u0442\u043A\u0438 \u0438 \u043E\u0442\u0434\u0435\u043B\u043E\u0447\u043D\u044B\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432</div>
                        </div>
                      </label>
                      <label class="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        <input type="radio" name="designProjectType_${roomId}_${index}" value="optimal" ${data.repairData?.designProjectType === 'optimal' ? 'checked' : ''} class="mt-1" onchange="updateLivingRoomRepairData('${roomId}', ${index}, 'designProjectType', 'optimal')">
                        <div>
                          <div class="text-xs font-medium">\u041E\u043F\u0442\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u2013 2900 \u20BD/\u043C\u00B2</div>
                            <div class="text-sm text-gray-500">\u0412\u0441\u0451 \u0438\u0437 "\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439" + AI-\u0432\u0438\u0437\u0443\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F, \u041F\u043E\u043B\u043D\u044B\u0439 \u043A\u043E\u043C\u043F\u043B\u0435\u043A\u0442 \u0440\u0430\u0431\u043E\u0447\u0438\u0445 \u0447\u0435\u0440\u0442\u0435\u0436\u0435\u0439, \u0412\u0435\u0434\u043E\u043C\u043E\u0441\u0442\u044C \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u0438 \u043C\u0435\u0431\u0435\u043B\u0438</div>
                        </div>
                      </label>
                      <label class="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        <input type="radio" name="designProjectType_${roomId}_${index}" value="full" ${data.repairData?.designProjectType === 'full' ? 'checked' : ''} class="mt-1" onchange="updateLivingRoomRepairData('${roomId}', ${index}, 'designProjectType', 'full')">
                        <div>
                          <div class="text-xs font-medium">\u041F\u043E\u043B\u043D\u044B\u0439 \u2013 2900 \u20BD/\u043C\u00B2</div>
                            <div class="text-sm text-gray-500">\u0412\u0441\u0451 \u0438\u0437 "\u041E\u043F\u0442\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0433\u043E" + \u0418\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0434\u0438\u0437\u0430\u0439\u043D + 3D/VR-\u0432\u0438\u0437\u0443\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F, \u0420\u0430\u0437\u0432\u0451\u0440\u0442\u043A\u0438 \u0441\u0442\u0435\u043D, \u0410\u0432\u0442\u043E\u0440\u0441\u043A\u0438\u0439 \u043D\u0430\u0434\u0437\u043E\u0440 (4 \u0432\u044B\u0435\u0437\u0434\u0430/\u043C\u0435\u0441)</div>
                        </div>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label class="block text-base text-gray-600 mb-1">\u0421\u0442\u0438\u043B\u044C \u0434\u0438\u0437\u0430\u0439\u043D\u0430:</label>
                    <select class="w-[340px] md:w-full px-3 py-2 text-base border rounded" data-field="designStyle" onchange="updateLivingRoomRepairData('${roomId}', ${index}, 'designStyle', this.value)">
                      <option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0442\u0438\u043B\u044C</option>
                      <option value="modern_minimalism" ${data.repairData?.designStyle === 'modern_minimalism' ? 'selected' : ''}>\u0421\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0439 \u043C\u0438\u043D\u0438\u043C\u0430\u043B\u0438\u0437\u043C</option>
                      <option value="modern_classic" ${data.repairData?.designStyle === 'modern_classic' ? 'selected' : ''}>\u0421\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F \u043A\u043B\u0430\u0441\u0441\u0438\u043A\u0430</option>
                      <option value="classic" ${data.repairData?.designStyle === 'classic' ? 'selected' : ''}>\u041A\u043B\u0430\u0441\u0441\u0438\u043A\u0430</option>
                      <option value="scandinavian" ${data.repairData?.designStyle === 'scandinavian' ? 'selected' : ''}>\u0421\u043A\u0430\u043D\u0434\u0438\u043D\u0430\u0432\u0441\u043A\u0438\u0439 \u0441\u0442\u0438\u043B\u044C</option>
                      <option value="modern" ${data.repairData?.designStyle === 'modern' ? 'selected' : ''}>\u041C\u043E\u0434\u0435\u0440\u043D</option>
                      <option value="art_deco" ${data.repairData?.designStyle === 'art_deco' ? 'selected' : ''}>\u0410\u0440-\u0434\u0435\u043A\u043E</option>
                      <option value="japanese" ${data.repairData?.designStyle === 'japanese' ? 'selected' : ''}>\u042F\u043F\u043E\u043D\u0441\u043A\u0438\u0439 \u0441\u0442\u0438\u043B\u044C</option>
                      <option value="chinese" ${data.repairData?.designStyle === 'chinese' ? 'selected' : ''}>\u041A\u0438\u0442\u0430\u0439\u0441\u043A\u0438\u0439 \u0441\u0442\u0438\u043B\u044C</option>
                      <option value="other" ${data.repairData?.designStyle === 'other' ? 'selected' : ''}>\u0414\u0440\u0443\u0433\u043E\u0435</option>
                    </select>
                  </div>
                </div>
                ` : `
                <div class="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                  <i class="fas fa-exclamation-triangle mr-1"></i> \u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043F\u043B\u043E\u0449\u0430\u0434\u044C \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435 \u041F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435 \u0434\u043B\u044F ${room.name}
                </div>
                `}
              </div>
            </div>
          </div>
        </div>`;
    }
    
    function updateMaterialAreasDisplay(roomId, index) {
      const data = roomData[roomId]?.livingRooms?.[index];
      if (!data) return;
      
      const coeff = data.materialCoefficient || 1.1;
      const floorEl = document.getElementById(`livingRoomMatFloor_${roomId}_${index}`);
      const wallsEl = document.getElementById(`livingRoomMatWalls_${roomId}_${index}`);
      
      if (floorEl) floorEl.textContent = (parseFloat(data.area || 0)).toFixed(2) + ' \u043C\u00B2';
      if (wallsEl) wallsEl.textContent = calculateLivingRoomWallsArea(data).toFixed(2) + ' \u043C\u00B2';
    }
    
    function updateLivingRoomRepairData(roomId, index, field, value) {
      if (!roomData[roomId].livingRooms[index]) {
        roomData[roomId].livingRooms[index] = {};
      }
      if (!roomData[roomId].livingRooms[index].repairData) {
        roomData[roomId].livingRooms[index].repairData = {};
      }
      roomData[roomId].livingRooms[index].repairData[field] = value;
    }
    
    function toggleRoomDesignOptions(roomId, index) {
      const container = document.getElementById('designProjectOptions_' + roomId + '_' + index);
      if (container) {
        container.style.display = 'block';
      }
    }
    
    function hideRoomDesignOptions(roomId, index) {
      const container = document.getElementById('designProjectOptions_' + roomId + '_' + index);
      if (container) {
        container.style.display = 'none';
      }
    }
    
    function calculateLivingRoomWallsArea(data) {
      const area = data.area || 0;
      const ceiling = data.ceiling || 3;
      
      // \u0414\u0432\u0435\u0440\u0438
      let doorArea = 0;
      const maxDoors = Math.min(data.doors || 0, 5);
      for (let i = 0; i < maxDoors; i++) {
        const doorW = (data.doorWidths?.[i] || 80) / 100;
        const doorH = (data.doorHeights?.[i] || 200) / 100;
        doorArea += doorW * doorH;
      }
      
      // \u041E\u043A\u043D\u0430
      let windowArea = 0;
      const maxWindows = Math.min(data.windows || 0, 5);
      for (let i = 0; i < maxWindows; i++) {
        const winW = (data.windowWidths?.[i] || 130) / 100;
        const winH = (data.windowHeights?.[i] || 140) / 100;
        windowArea += winW * winH;
      }
      
      // \u0411\u0430\u043B\u043A\u043E\u043D\u043D\u044B\u0435 \u0434\u0432\u0435\u0440\u0438
      let balconyArea = 0;
      const maxBalconies = Math.min(data.balcony || 0, 5);
      for (let i = 0; i < maxBalconies; i++) {
        const balW = (data.balconyWidths?.[i] || 80) / 100;
        const balH = (data.balconyHeights?.[i] || 250) / 100;
        balconyArea += balW * balH;
      }
      
      if (area <= 0) return 0;
      
      const perimeter = Math.sqrt(area) * 4 * 1.1;
      const grossWalls = perimeter * ceiling;
      
      // \u041D\u0438\u0448\u0438
      let nicheArea = 0;
      const maxNiches = Math.min(data.nicheCount || 0, 15);
      for (let i = 0; i < maxNiches; i++) {
        nicheArea += parseFloat(data.nicheAreas?.[i]) || 0;
      }
      
      // \u0412\u044B\u0441\u0442\u0443\u043F\u044B
      let projectionArea = 0;
      const maxProjections = Math.min(data.projectionCount || 0, 15);
      for (let i = 0; i < maxProjections; i++) {
        projectionArea += parseFloat(data.projectionAreas?.[i]) || 0;
      }
      
      // \u041A\u043E\u043B\u043E\u043D\u043D\u044B
      let columnArea = 0;
      const maxColumns = Math.min(data.columnCount || 0, 15);
      for (let i = 0; i < maxColumns; i++) {
        columnArea += parseFloat(data.columnAreas?.[i]) || 0;
      }
      
      // \u0410\u0440\u043A\u0438/\u043F\u0440\u043E\u0435\u043C\u044B
      let archArea = 0;
      const maxArchs = Math.min(data.archCount || 0, 5);
      for (let i = 0; i < maxArchs; i++) {
        archArea += parseFloat(data.archAreas?.[i]) || 0;
      }
      
      const wallsArea = Math.max(0, grossWalls - doorArea - windowArea - balconyArea - archArea) + nicheArea + projectionArea + columnArea;
      return Math.round(wallsArea * 100) / 100;
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
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0428\u0438\u0440:</label>
              <input type="number" value="${doorW}" min="50" max="120"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomDoorSize('${roomId}', ${index}, ${i}, 'width', this.value)"
                     oninput="updateLivingRoomDoorSize('${roomId}', ${index}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0412\u044B\u0441:</label>
              <input type="number" value="${doorH}" min="150" max="250"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomDoorSize('${roomId}', ${index}, ${i}, 'height', this.value)"
                     oninput="updateLivingRoomDoorSize('${roomId}', ${index}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'livingDoors_${index}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="livingDoors_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u0414\u0432\u0435\u0440\u0438</span>
          </div>
          <div id="livingDoors_${index}Group_${roomId}" style="display: none" class="mt-2">
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
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0428\u0438\u0440:</label>
              <input type="number" value="${winW}" min="80" max="250"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomWindowSize('${roomId}', ${index}, ${i}, 'width', this.value)"
                     oninput="updateLivingRoomWindowSize('${roomId}', ${index}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0412\u044B\u0441:</label>
              <input type="number" value="${winH}" min="80" max="200"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomWindowSize('${roomId}', ${index}, ${i}, 'height', this.value)"
                     oninput="updateLivingRoomWindowSize('${roomId}', ${index}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'livingWindows_${index}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="livingWindows_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u041E\u043A\u043D\u0430</span>
          </div>
          <div id="livingWindows_${index}Group_${roomId}" style="display: none" class="mt-2">
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
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0428\u0438\u0440:</label>
              <input type="number" value="${balW}" min="60" max="400"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomBalconySize('${roomId}', ${index}, ${i}, 'width', this.value)"
                     oninput="updateLivingRoomBalconySize('${roomId}', ${index}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0412\u044B\u0441:</label>
              <input type="number" value="${balH}" min="150" max="350"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomBalconySize('${roomId}', ${index}, ${i}, 'height', this.value)"
                     oninput="updateLivingRoomBalconySize('${roomId}', ${index}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'livingBalcony_${index}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="livingBalcony_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u0411\u0430\u043B\u043A\u043E\u043D\u043D\u0430\u044F \u0434\u0432\u0435\u0440\u044C</span>
          </div>
          <div id="livingBalcony_${index}Group_${roomId}" style="display: none" class="mt-2">
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
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0428\u0438\u0440:</label>
              <input type="number" value="${balW}" min="60" max="400"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomBalconySize('${roomId}', ${index}, ${i}, 'width', this.value)"
                     oninput="updateLivingRoomBalconySize('${roomId}', ${index}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0412\u044B\u0441:</label>
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
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0428\u0438\u0440:</label>
              <input type="number" value="${doorW}" min="40" max="200"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomDoorSize('${roomId}', ${index}, ${i}, 'width', this.value)"
                     oninput="updateLivingRoomDoorSize('${roomId}', ${index}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0412\u044B\u0441:</label>
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
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0428\u0438\u0440:</label>
              <input type="number" value="${winW}" min="30" max="400"
                     class="area-input text-xs" 
                     onchange="updateLivingRoomWindowSize('${roomId}', ${index}, ${i}, 'width', this.value)"
                     oninput="updateLivingRoomWindowSize('${roomId}', ${index}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0412\u044B\u0441:</label>
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
    
    function updateLivingRoomCount(roomId, value) {
      const val = parseInt(value) || 0;
      roomData[roomId].livingRoomCount = val;
      
      roomData[roomId].livingRooms = roomData[roomId].livingRooms.slice(0, val);
      
      // Clear demolition data when room count becomes 0
      if (val === 0 && roomData.demolitionData) {
        for (let i = 0; i < 8; i++) {
          const demoRoomId = 'demo_' + roomId + '_' + i;
          if (roomData.demolitionData[demoRoomId]) {
            roomData.demolitionData[demoRoomId] = { partitions: [], electrical: [], finishing: [], staircase: [], railing: [] };
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
      const buildingType = document.getElementById('detailedBuildingType')?.value || 'apartment';
      let defaultRoomType = room?.default_room_type || room?.room_types?.[0]?.name || '\u0421\u043F\u0430\u043B\u044C\u043D\u044F';
      if (roomId === 'nonliving' && buildingType === 'office') {
        defaultRoomType = '\u041E\u0444\u0438\u0441';
      }
      
      const roomTypeDefaultAreas = {
        '\u041A\u0443\u0445\u043D\u044F': 10,
        '\u0414\u0443\u0448\u0435\u0432\u0430\u044F': 4,
        '\u0412\u0430\u043D\u043D\u0430\u044F': 4,
        '\u0421\u0430\u043D\u0443\u0437\u0435\u043B': 1.5,
        '\u0421\u043E\u0432\u043C\u0435\u0449\u0435\u043D\u043D\u044B\u0439 \u0421/\u0423': 5,
        '\u041F\u0440\u0438\u0445\u043E\u0436\u0430\u044F': 3,
        '\u041A\u043E\u0440\u0438\u0434\u043E\u0440': 2,
        '\u0413\u0430\u0440\u0434\u0435\u0440\u043E\u0431\u043D\u0430\u044F': 1.5,
        '\u0411\u0430\u043B\u043A\u043E\u043D': 1.2,
        '\u041B\u043E\u0434\u0436\u0438\u044F': 2,
        '\u0422\u0435\u0440\u0440\u0430\u0441\u0430': 4,
        '\u041E\u0444\u0438\u0441': 20,
        '\u0421\u043F\u0430\u043B\u044C\u043D\u044F': 20,
        '\u0414\u0435\u0442\u0441\u043A\u0430\u044F': 15,
        '\u0413\u043E\u0441\u0442\u0438\u043D\u0430\u044F': 25,
        '\u041A\u0430\u0431\u0438\u043D\u0435\u0442': 15
      };
      
      const defaultArea = roomTypeDefaultAreas[defaultRoomType] || 20;
      
      while (roomData[roomId].livingRooms.length < val) {
        const newRoom = {
          area: defaultArea,
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
          archCount: 1,
          archAreas: [0, 0, 0, 0, 0],
          materialCoefficient: 1.1,
          nicheCount: 0,
          nicheAreas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          projectionCount: 0,
          projectionAreas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          columnCount: 0,
          columnAreas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        };
        newRoom.wallsArea = calculateLivingRoomWallsArea(newRoom);
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
      current = Math.max(0, Math.min(5, current + delta));
      input.value = current;
      updateFloorCount(roomId, current);
    }
    
    function updateFloorCount(roomId, value) {
      const val = parseInt(value) || 0;
      if (!roomData[roomId]) roomData[roomId] = {};
      roomData[roomId].floorCount = val;
      
      if (!roomData[roomId].floors) roomData[roomId].floors = [];
      roomData[roomId].floors = roomData[roomId].floors.slice(0, val);
      
      const buildingType = document.getElementById('detailedBuildingType')?.value || 'apartment';
      const isNonliving = roomId === 'nonliving';
      
      while (roomData[roomId].floors.length < val) {
        roomData[roomId].floors.push({
          floorNumber: roomData[roomId].floors.length + 1,
          livingRooms: []
        });
      }
      
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
                  <input type="number" id="floorRoomCount_${roomId}_${floorIndex}" value="${floor.livingRooms?.length || 0}" min="0" max="8"
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
      current = Math.max(0, Math.min(8, current + delta));
      input.value = current;
      updateFloorRoomCount(roomId, floorIndex, current);
    }
    
    function updateFloorRoomCount(roomId, floorIndex, value) {
      const val = parseInt(value) || 0;
      if (!roomData[roomId].floors[floorIndex].livingRooms) {
        roomData[roomId].floors[floorIndex].livingRooms = [];
      }
      roomData[roomId].floors[floorIndex].livingRooms = roomData[roomId].floors[floorIndex].livingRooms.slice(0, val);
      
      // Clear demolition data when room count becomes 0
      if (val === 0 && roomData.demolitionData) {
        for (let roomIdx = 0; roomIdx < 10; roomIdx++) {
          const demoRoomId = roomId + '_' + floorIndex + '_' + roomIdx;
          if (roomData.demolitionData[demoRoomId]) {
            roomData.demolitionData[demoRoomId] = { partitions: [], electrical: [], finishing: [], staircase: [], railing: [] };
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
      
      const room = priceData.rooms[roomId];
      const buildingType = document.getElementById('detailedBuildingType')?.value || 'apartment';
      let defaultRoomType = room?.default_room_type || room?.room_types?.[0]?.name || '\u0421\u043F\u0430\u043B\u044C\u043D\u044F';
      if (roomId === 'nonliving' && buildingType === 'office') {
        defaultRoomType = '\u041E\u0444\u0438\u0441';
      }
      
      const roomTypeDefaultAreas = {
        '\u041A\u0443\u0445\u043D\u044F': 10, '\u0414\u0443\u0448\u0435\u0432\u0430\u044F': 4, '\u0412\u0430\u043D\u043D\u0430\u044F': 4, '\u0421\u0430\u043D\u0443\u0437\u0435\u043B': 1.5, '\u0421\u043E\u0432\u043C\u0435\u0449\u0435\u043D\u043D\u044B\u0439 \u0421/\u0423': 5,
        '\u041F\u0440\u0438\u0445\u043E\u0436\u0430\u044F': 3, '\u041A\u043E\u0440\u0438\u0434\u043E\u0440': 2, '\u0413\u0430\u0440\u0434\u0435\u0440\u043E\u0431\u043D\u0430\u044F': 1.5, '\u0411\u0430\u043B\u043A\u043E\u043D': 1.2, '\u041B\u043E\u0434\u0436\u0438\u044F': 2,
        '\u0422\u0435\u0440\u0440\u0430\u0441\u0430': 4, '\u041E\u0444\u0438\u0441': 20, '\u0421\u043F\u0430\u043B\u044C\u043D\u044F': 20, '\u0414\u0435\u0442\u0441\u043A\u0430\u044F': 15, '\u0413\u043E\u0441\u0442\u0438\u043D\u0430\u044F': 25, '\u041A\u0430\u0431\u0438\u043D\u0435\u0442': 15
      };
      const defaultArea = roomTypeDefaultAreas[defaultRoomType] || 20;
      
      while (roomData[roomId].floors[floorIndex].livingRooms.length < val) {
        const newRoom = {
          area: defaultArea,
          doors: 1, windows: 1, wallsArea: 0,
          doorWidths: [80, 80, 80, 80, 80],
          doorHeights: [200, 200, 200, 200, 200],
          windowWidths: [130, 130, 130, 130, 130],
          windowHeights: [140, 140, 140, 140, 140],
          balcony: 0, balconyWidths: [80, 80, 80, 80, 80],
          balconyHeights: [250, 250, 250, 250, 250],
          roomType: defaultRoomType, ceiling: 3,
          archCount: 1, archAreas: [0, 0, 0, 0, 0],
          materialCoefficient: 1.1,
          nicheCount: 0, nicheAreas: Array(15).fill(0),
          projectionCount: 0, projectionAreas: Array(15).fill(0),
          columnCount: 0, columnAreas: Array(15).fill(0)
        };
        newRoom.wallsArea = calculateLivingRoomWallsArea(newRoom);
        roomData[roomId].floors[floorIndex].livingRooms.push(newRoom);
      }
      
      renderFloorRooms(roomId, floorIndex);
      
      updateTotalAreas();
      updateDetailedCalc();
    }
    
    function renderFloorRooms(roomId, floorIndex) {
      const container = document.getElementById('floorRoomsContainer_' + roomId + '_' + floorIndex);
      if (!container) return;
      
      const floor = roomData[roomId].floors[floorIndex];
      const rooms = floor.livingRooms || [];
      const room = priceData.rooms[roomId];
const isNonliving = roomId === 'nonliving';
      const roomName = isNonliving ? '\u041D\u0435\u0436\u0438\u043B\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435' : '\u0416\u0438\u043B\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435';
      
      let html = '';
      rooms.forEach((roomDataItem, roomIndex) => {
        const floorNum = floorIndex + 1;
        const roomNum = roomIndex + 1;
        
        const wallsArea = calculateLivingRoomWallsArea(roomDataItem);
        const displayName = roomName + '_' + floorNum + '_' + roomNum;
        
        html += `
          <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleFloorRoomGroup('${roomId}', '${floorIndex}', '${roomIndex}')">
              <i class="fas fa-chevron-down text-xs transition-transform" id="floorRoom_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
              <span class="text-sm font-bold text-green-600 dark:text-green-400">${displayName}</span>
            </div>
<div id="floorRoom_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
              <div class="area-input-group" style="margin: 8px 0">
                <label class="text-sm text-gray-500 w-12 font-bold">\u0422\u0438\u043F:</label>
                <div class="custom-select-wrapper" style="position: relative; display: inline-block;">
                  <button type="button" class="custom-select-btn" style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; border: 2px solid #4ade80; border-radius: 6px; background: var(--bg-primary); font-size: 14px; font-weight: 600; cursor: pointer; min-width: 160px;" onclick="toggleFloorCustomSelect('${roomId}', ${floorIndex}, ${roomIndex})">
                    <i class="fas ${room.room_types?.find(t => t.name === roomDataItem.roomType)?.icon || 'fa-home'}" id="floorRoomTypeIcon_${roomId}_${floorIndex}_${roomIndex}" style="color: #22c55e"></i>
                    <span id="floorRoomTypeText_${roomId}_${floorIndex}_${roomIndex}">${roomDataItem.roomType || '\u0421\u043F\u0430\u043B\u044C\u043D\u044F'}</span>
                    <i class="fas fa-chevron-down" style="margin-left: auto; font-size: 10px; color: #6b7280"></i>
                  </button>
                  <div id="floorCustomSelect_${roomId}_${floorIndex}_${roomIndex}" class="custom-select-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-primary); border: 2px solid #4ade80; border-radius: 6px; margin-top: 4px; max-height: 200px; overflow-y: auto; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                    ${room.room_types?.map(type => `<div class="custom-select-option" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; transition: background 0.2s;" onmouseenter="this.style.background='rgba(74, 222, 128, 0.1)'" onmouseleave="this.style.background='transparent'" onclick="selectFloorRoomType('${roomId}', ${floorIndex}, ${roomIndex}, '${type.name}', '${type.icon}')"><i class="fas ${type.icon}" style="color: #22c55e !important;"></i><span style="color: inherit;">${type.name}</span></div>`).join('')}
                  </div>
                </div>
              </div>
              <div class="area-input-group">
                <label class="text-xs text-gray-500 w-24">\u0412\u044B\u0441\u043E\u0442\u0430 \u043F\u043E\u0442\u043E\u043B\u043A\u0430:</label>
                <input type="number" value="${parseFloat(roomDataItem.ceiling || 3).toFixed(2)}" min="2" max="6" step="0.01"
                       class="area-input" style="width: 80px"
                       onchange="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, 'ceiling', this.value)"
                       oninput="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, 'ceiling', this.value)">
                <span class="text-xs text-gray-500">\u043C</span>
              </div>
              <div class="area-input-group">
                <label class="text-xs text-gray-500 w-24">\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043F\u043E\u043B\u0430:</label>
                <input type="number" value="${parseFloat(roomDataItem.area).toFixed(2)}" min="1" max="200" step="0.01"
                       class="area-input" style="width: 80px"
                       onchange="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, 'area', this.value)"
                       oninput="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, 'area', this.value)">
                <span class="text-xs text-gray-500">\u043C\u00B2</span>
              </div>
              <div class="area-input-group">
                <label class="text-xs text-gray-500 w-24">\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0441\u0442\u0435\u043D:</label>
                <input type="number" value="${wallsArea.toFixed(2)}" min="0" max="500" step="0.01"
                       class="area-input" style="width: 80px; border: 2px solid #4ade80; border-radius: 6px; padding: 4px 8px; font-weight: 600; color: #16a34a;" disabled>
                <span class="text-xs text-gray-500">\u043C\u00B2</span>
              </div>
              ${renderFloorRoomDoors(roomId, floorIndex, roomIndex, roomDataItem)}
              ${renderFloorRoomWindows(roomId, floorIndex, roomIndex, roomDataItem)}
              ${renderFloorRoomBalcony(roomId, floorIndex, roomIndex, roomDataItem)}
              ${renderFloorRoomArchs(roomId, floorIndex, roomIndex, roomDataItem)}
              <div class="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'floorConstructions_${floorIndex}_${roomIndex}')">
                  <i class="fas fa-chevron-down text-xs transition-transform" id="floorConstructions_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
                  <span class="text-sm font-medium">\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438</span>
                </div>
                <div id="floorConstructions_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
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
                    <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043F\u043E\u043B\u0430: <span class="font-medium" id="floorRoomMatFloor_${roomId}_${floorIndex}_${roomIndex}">${parseFloat(roomDataItem.area || 0).toFixed(2)} \u043C\u00B2</span></div>
                    <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0441\u0442\u0435\u043D: <span class="font-medium" id="floorRoomMatWalls_${roomId}_${floorIndex}_${roomIndex}">${calculateLivingRoomWallsArea(roomDataItem).toFixed(2)} \u043C\u00B2</span></div>
                  </div>
                </div>
              </div>
              <div class="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'floorRepairInfo_${floorIndex}_${roomIndex}')">
                  <i class="fas fa-chevron-down text-xs transition-transform" id="floorRepairInfo_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
                  <span class="text-sm font-medium">\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u0440\u0435\u043C\u043E\u043D\u0442\u0435</span>
                </div>
                <div id="floorRepairInfo_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
                  ${(roomDataItem.area > 0) ? `
                  <div class="space-y-3">
                    <div>
                      <label class="block text-sm text-gray-500 mb-1">\u0422\u0435\u043A\u0443\u0449\u0435\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435</label>
                      <select class="ml-1 w-[340px] md:w-full px-3 py-2 text-base border rounded" onchange="updateFloorRoomRepairData('${roomId}', ${floorIndex}, ${roomIndex}, 'currentState', this.value)">
                        <option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435</option>
                        <option value="concrete_with_walls" ${roomDataItem.repairData?.currentState === 'concrete_with_walls' ? 'selected' : ''}>Без отделки (с перегородками)</option>
                        <option value="concrete_no_walls" ${roomDataItem.repairData?.currentState === 'concrete_no_walls' ? 'selected' : ''}>Без отделки (без перегородок)</option>
                        <option value="rough_finish" ${roomDataItem.repairData?.currentState === 'rough_finish' ? 'selected' : ''}>\u0427\u0435\u0440\u043D\u043E\u0432\u0430\u044F \u043E\u0442\u0434\u0435\u043B\u043A\u0430</option>
                        <option value="whitebox" ${roomDataItem.repairData?.currentState === 'whitebox' ? 'selected' : ''}>\u041F\u0440\u0435\u0434\u0447\u0438\u0441\u0442\u043E\u0432\u0430\u044F White-box</option>
                        <option value="old_finish" ${roomDataItem.repairData?.currentState === 'old_finish' ? 'selected' : ''}>\u041D\u0430\u043B\u0438\u0447\u0438\u0435 \u0441\u0442\u0430\u0440\u043E\u0439 \u043E\u0442\u0434\u0435\u043B\u043A\u0438</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm text-gray-500 mb-1">\u041A\u0430\u043A\u043E\u0439 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0440\u0435\u043C\u043E\u043D\u0442</label>
                      <select class="w-[340px] md:w-full px-3 py-2 text-base border rounded" onchange="updateFloorRoomRepairData('${roomId}', ${floorIndex}, ${roomIndex}, 'repairTypeNew', this.value)">
                        <option value="turnkey" ${roomDataItem.repairData?.repairTypeNew === 'turnkey' ? 'selected' : ''}>\u041F\u043E\u0434 \u043A\u043B\u044E\u0447 (\u0441 \u043C\u0435\u0431\u0435\u043B\u044C\u044E)</option>
                        <option value="clean" ${roomDataItem.repairData?.repairTypeNew === 'clean' ? 'selected' : ''}>\u0427\u0438\u0441\u0442\u043E\u0432\u0430\u044F \u043E\u0442\u0434\u0435\u043B\u043A\u0430</option>
                        <option value="whitebox_new" ${roomDataItem.repairData?.repairTypeNew === 'whitebox_new' ? 'selected' : ''}>\u041F\u0440\u0435\u0434\u0447\u0438\u0441\u0442\u043E\u0432\u0430\u044F White-box</option>
                        <option value="rough" ${roomDataItem.repairData?.repairTypeNew === 'rough' ? 'selected' : ''}>\u0427\u0435\u0440\u043D\u043E\u0432\u0430\u044F \u043E\u0442\u0434\u0435\u043B\u043A\u0430</option>
                      </select>
                    </div>
                    <div>
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
                    <div>
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
                    <div id="floorDesignOptions_${roomId}_${floorIndex}_${roomIndex}" style="display: ${roomDataItem.repairData?.designProject === 'yes' ? 'block' : 'none'}" class="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <label class="block text-sm font-medium mb-2">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0438\u0437\u0430\u0439\u043D \u043F\u0440\u043E\u0435\u043A\u0442:</label>
                      <div class="space-y-2">
                        <label class="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                          <input type="radio" name="floorDesignType_${roomId}_${floorIndex}_${roomIndex}" value="minimal" ${roomDataItem.repairData?.designProjectType === 'minimal' ? 'checked' : ''} class="mt-1" onchange="updateFloorRoomRepairData('${roomId}', ${floorIndex}, ${roomIndex}, 'designProjectType', 'minimal')">
                          <div>
                            <div class="text-xs font-medium">\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u2013 1000 \u20BD/\u043C\u00B2</div>
                            <div class="text-sm text-gray-500">\u041E\u0431\u043C\u0435\u0440\u043D\u044B\u0439 \u043F\u043B\u0430\u043D \u0438 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u043A\u0430 (3 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430), \u041F\u043E\u0434\u0431\u043E\u0440 \u0441\u0442\u0438\u043B\u044F, \u043C\u0443\u0434\u0431\u043E\u0440\u0434, \u041F\u043B\u0430\u043D \u043F\u043E \u044D\u043B\u0435\u043A\u0442\u0440\u0438\u043A\u0435 \u0438 \u043E\u0441\u0432\u0435\u0449\u0435\u043D\u0438\u044E, \u0420\u0430\u0441\u043A\u043B\u0430\u0434\u043A\u0430 \u043F\u043B\u0438\u0442\u043A\u0438 \u0438 \u043E\u0442\u0434\u0435\u043B\u043E\u0447\u043D\u044B\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432</div>
                            <div class="text-sm text-gray-500">\u0412\u0441\u0451 \u0438\u0437 "\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439" + AI-\u0432\u0438\u0437\u0443\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F, \u041F\u043E\u043B\u043D\u044B\u0439 \u043A\u043E\u043C\u043F\u043B\u0435\u043A\u0442 \u0440\u0430\u0431\u043E\u0447\u0438\u0445 \u0447\u0435\u0440\u0442\u0435\u0436\u0435\u0439, \u0412\u0435\u0434\u043E\u043C\u043E\u0441\u0442\u044C \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u0438 \u043C\u0435\u0431\u0435\u043B\u0438</div>
                            <div class="text-sm text-gray-500">\u0412\u0441\u0451 \u0438\u0437 "\u041E\u043F\u0442\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0433\u043E" + \u0418\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0434\u0438\u0437\u0430\u0439\u043D + 3D/VR-\u0432\u0438\u0437\u0443\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F, \u0420\u0430\u0437\u0432\u0451\u0440\u0442\u043A\u0438 \u0441\u0442\u0435\u043D, \u0410\u0432\u0442\u043E\u0440\u0441\u043A\u0438\u0439 \u043D\u0430\u0434\u0437\u043E\u0440 (4 \u0432\u044B\u0435\u0437\u0434\u0430/\u043C\u0435\u0441)</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  ` : `
                  <div class="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                    <i class="fas fa-exclamation-triangle mr-1"></i> \u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043F\u043B\u043E\u0449\u0430\u0434\u044C \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435 \u041F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435
                  </div>
                  `}
                </div>
</div>
              </div>
            </div>
            </div>`;
      });
      
      container.innerHTML = html;
      
      // Fix any extra closing braces in room names
      container.querySelectorAll('span.text-green-600, span.text-brand-500').forEach(span => {
        if (span.textContent && span.textContent.endsWith('}')) {
          span.textContent = span.textContent.slice(0, -1);
        }
      });
    }
    
    function renderFloorRoomDoors(roomId, floorIndex, roomIndex, data) {
      const doorCount = data.doors || 0;
      let doorSizeInputs = '';
      for (let i = 0; i < doorCount; i++) {
        const doorW = data.doorWidths?.[i] || 80;
        const doorH = data.doorHeights?.[i] || 200;
        doorSizeInputs += `
          <div class="text-xs text-gray-500 mb-1 mt-2">\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0434\u0432\u0435\u0440\u0438_${i + 1} (\u0441\u043C):</div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0428\u0438\u0440:</label>
              <input type="number" value="${doorW}" min="40" max="200"
                     class="area-input text-xs" 
                     onchange="updateFloorRoomDoorSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'width', this.value)"
                     oninput="updateFloorRoomDoorSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0412\u044B\u0441:</label>
              <input type="number" value="${doorH}" min="100" max="300"
                     class="area-input text-xs" 
                     onchange="updateFloorRoomDoorSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'height', this.value)"
                     oninput="updateFloorRoomDoorSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'floorDoor_${floorIndex}_${roomIndex}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="floorDoor_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u0414\u0432\u0435\u0440\u0438</span>
          </div>
          <div id="floorDoor_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'doors', -1)">\u2212</button>
                <input type="number" value="${doorCount}" min="0" max="5"
                       class="qty-input" onchange="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, 'doors', this.value)">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'doors', 1)">+</button>
              </div>
              <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
            </div>
            ${doorSizeInputs}
          </div>
        </div>`;
    }
    
    function renderFloorRoomWindows(roomId, floorIndex, roomIndex, data) {
      const windowCount = data.windows || 0;
      let windowSizeInputs = '';
      for (let i = 0; i < windowCount; i++) {
        const winW = data.windowWidths?.[i] || 130;
        const winH = data.windowHeights?.[i] || 140;
        windowSizeInputs += `
          <div class="text-xs text-gray-500 mb-1 mt-2">\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u043E\u043A\u043D\u0430_${i + 1} (\u0441\u043C):</div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0428\u0438\u0440:</label>
              <input type="number" value="${winW}" min="40" max="400"
                     class="area-input text-xs" 
                     onchange="updateFloorRoomWindowSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'width', this.value)"
                     oninput="updateFloorRoomWindowSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0412\u044B\u0441:</label>
              <input type="number" value="${winH}" min="40" max="300"
                     class="area-input text-xs" 
                     onchange="updateFloorRoomWindowSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'height', this.value)"
                     oninput="updateFloorRoomWindowSize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'floorWindow_${floorIndex}_${roomIndex}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="floorWindow_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u041E\u043A\u043D\u0430</span>
          </div>
          <div id="floorWindow_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'windows', -1)">\u2212</button>
                <input type="number" value="${windowCount}" min="0" max="5"
                       class="qty-input" onchange="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, 'windows', this.value)">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'windows', 1)">+</button>
              </div>
              <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
            </div>
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
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0428\u0438\u0440:</label>
              <input type="number" value="${balW}" min="60" max="400"
                     class="area-input text-xs" 
                     onchange="updateFloorRoomBalconySize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'width', this.value)"
                     oninput="updateFloorRoomBalconySize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="text-xs text-gray-400 w-8">\u0412\u044B\u0441:</label>
              <input type="number" value="${balH}" min="150" max="350"
                     class="area-input text-xs" 
                     onchange="updateFloorRoomBalconySize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'height', this.value)"
                     oninput="updateFloorRoomBalconySize('${roomId}', ${floorIndex}, ${roomIndex}, ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'floorBalcony_${floorIndex}_${roomIndex}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="floorBalcony_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u0411\u0430\u043B\u043A\u043E\u043D\u043D\u0430\u044F \u0434\u0432\u0435\u0440\u044C</span>
          </div>
          <div id="floorBalcony_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'balcony', -1)">\u2212</button>
                <input type="number" value="${balconyCount}" min="0" max="5"
                       class="qty-input" onchange="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, 'balcony', this.value)">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'balcony', 1)">+</button>
              </div>
              <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
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
        <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'floorArch_${floorIndex}_${roomIndex}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="floorArch_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <span class="text-sm font-medium">\u0410\u0440\u043A\u0438</span>
          </div>
          <div id="floorArch_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'archCount', -1)">\u2212</button>
                <input type="number" value="${archCount}" min="0" max="5"
                       class="qty-input" onchange="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, 'archCount', this.value)">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, 'archCount', 1)">+</button>
              </div>
              <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
            </div>
            ${archSizeInputs}
          </div>
        </div>`;
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
        <div class="mt-2">
          <div class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-2" onclick="toggleRoomFieldGroup('${roomId}', 'floor${field.charAt(0).toUpperCase() + field.slice(1)}_${floorIndex}_${roomIndex}')">
            <i class="fas fa-chevron-down text-xs transition-transform" id="floor${field.charAt(0).toUpperCase() + field.slice(1)}_${floorIndex}_${roomIndex}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
            <i class="fas ${icon} text-xs" style="margin-left: 4px"></i>
            <span class="text-sm font-medium">${label}</span>
          </div>
          <div id="floor${field.charAt(0).toUpperCase() + field.slice(1)}_${floorIndex}_${roomIndex}Group_${roomId}" style="display: none" class="mt-2">
            <div class="area-input-group">
              <label class="text-xs text-gray-500 w-16">\u041A\u043E\u043B-\u0432\u043E:</label>
              <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, '${field}Count', -1)">\u2212</button>
                <input type="number" value="${count}" min="0" max="15"
                       class="qty-input" onchange="updateFloorRoomData('${roomId}', ${floorIndex}, ${roomIndex}, '${field}Count', this.value)">
                <button type="button" class="qty-btn" onclick="changeFloorRoomField('${roomId}', ${floorIndex}, ${roomIndex}, '${field}Count', 1)">+</button>
              </div>
              <span class="text-xs text-gray-500 ml-1">\u0448\u0442</span>
            </div>
            ${areaInputs}
          </div>
        </div>`;
    }
    
    function updateFloorRoomData(roomId, floorIndex, roomIndex, field, value) {
      if (!roomData[roomId].floors[floorIndex].livingRooms[roomIndex]) return;
      
      const room = roomData[roomId].floors[floorIndex].livingRooms[roomIndex];
      
      if (field === 'area') {
        room.area = parseFloat(value) || 0;
      } else if (field === 'roomType') {
        room.roomType = value;
        const roomTypeDefaultAreas = {
          '\u041A\u0443\u0445\u043D\u044F': 10, '\u0414\u0443\u0448\u0435\u0432\u0430\u044F': 4, '\u0412\u0430\u043D\u043D\u0430\u044F': 4, '\u0421\u0430\u043D\u0443\u0437\u0435\u043B': 1.5, '\u0421\u043E\u0432\u043C\u0435\u0449\u0435\u043D\u043D\u044B\u0439 \u0421/\u0423': 5,
          '\u041F\u0440\u0438\u0445\u043E\u0436\u0430\u044F': 3, '\u041A\u043E\u0440\u0438\u0434\u043E\u0440': 2, '\u0413\u0430\u0440\u0434\u0435\u0440\u043E\u0431\u043D\u0430\u044F': 1.5, '\u0411\u0430\u043B\u043A\u043E\u043D': 1.2, '\u041B\u043E\u0434\u0436\u0438\u044F': 2,
          '\u0422\u0435\u0440\u0440\u0430\u0441\u0430': 4, '\u041E\u0444\u0438\u0441': 20, '\u0421\u043F\u0430\u043B\u044C\u043D\u044F': 20, '\u0414\u0435\u0442\u0441\u043A\u0430\u044F': 15, '\u0413\u043E\u0441\u0442\u0438\u043D\u0430\u044F': 25, '\u041A\u0430\u0431\u0438\u043D\u0435\u0442': 15
        };
        room.area = roomTypeDefaultAreas[value] || 20;
        saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      } else if (field === 'ceiling') {
        room.ceiling = parseFloat(value) || 3;
      } else if (field === 'doors') {
        room.doors = parseInt(value) || 0;
        saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
      } else if (field === 'windows') {
        room.windows = parseInt(value) || 0;
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
      
      if (field !== 'roomType' && field !== 'doors' && field !== 'windows' && field !== 'balcony' && field !== 'archCount' && field !== 'nicheCount' && field !== 'projectionCount' && field !== 'columnCount') {
        const wallsArea = calculateLivingRoomWallsArea(room);
        room.wallsArea = wallsArea;
      }
      
      updateTotalAreas();
      updateDetailedCalc();
      updateLivingRoomsTotal(roomId);
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
      
      if (floorEl) floorEl.textContent = (parseFloat(room.area || 0)).toFixed(2) + ' \u043C\u00B2';
      if (wallsEl) wallsEl.textContent = calculateLivingRoomWallsArea(room).toFixed(2) + ' \u043C\u00B2';
      
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
    }

    const repairQuestCurrentFinishOptions = {
      floor: [
        { value: 'floor_laminate', label: 'Ламинат' },
        { value: 'floor_linoleum', label: 'Линолеум' },
        { value: 'floor_ceramic', label: 'Керамическая плитка' },
        { value: 'floor_porcelain', label: 'Керамогранит' },
        { value: 'floor_parquet_board', label: 'Паркетная доска' },
        { value: 'floor_engineered', label: 'Инженерная доска' },
        { value: 'self_leveling', label: 'Наливной пол' },
        { value: 'screed', label: 'Стяжка' }
      ],
      wall: [
        { value: 'wall_wallpaper', label: 'Обои' },
        { value: 'wall_paint', label: 'Краска' },
        { value: 'plaster', label: 'Штукатурка' },
        { value: 'wall_decorative_plaster', label: 'Декоративная штукатурка' },
        { value: 'wall_ceramic', label: 'Керамическая плитка' },
        { value: 'wall_porcelain', label: 'Керамогранит' },
        { value: 'panels', label: 'Панели / рейки' }
      ],
      ceiling: [
        { value: 'ceiling_stretch', label: 'Натяжной потолок' },
        { value: 'ceiling_paint', label: 'Покраска' },
        { value: 'ceiling_plaster', label: 'Штукатурка потолка' },
        { value: 'ceiling_gk', label: 'Гипсокартонный потолок' },
        { value: 'ceiling_suspended', label: 'Подвесной потолок' },
        { value: 'ceiling_ree', label: 'Реечный потолок' }
      ]
    };

    const repairQuestApproxPackages = [
      { value: 'minimal', label: 'Базовый набор', hint: 'Несколько ключевых точек и стандартный набор работ.' },
      { value: 'standard', label: 'Стандартный набор', hint: 'Подходит для большинства квартир и домов.' },
      { value: 'extended', label: 'Расширенный набор', hint: 'Больше инженерии, света и дополнительных работ.' }
    ];

    const repairQuestLightingOptions = [
      { value: 'basic', label: 'Базовый свет', hint: 'Обычный свет без сложных сценариев.' },
      { value: 'accent', label: 'С акцентами', hint: 'Добавим точечный свет или подсветку.' },
      { value: 'scenario', label: 'Сценарный свет', hint: 'Световые линии, группы и более гибкая схема.' }
    ];

    const repairQuestTileZoneOptions = [
      { value: 'none', label: 'Без плитки', hint: 'Только обычная отделка.' },
      { value: 'accent', label: 'Локально', hint: 'Фартук, душ, часть стены или пола.' },
      { value: 'full', label: 'Много плитки', hint: 'Плитка на полу и заметной части стен.' }
    ];

    const repairQuestCurtainOptions = [
      { value: 'none', label: 'Без подготовки', hint: 'Обычное решение без дополнительных потолочных узлов.' },
      { value: 'cornice', label: 'Карниз', hint: 'Нужно предусмотреть установку карниза под шторы.' },
      { value: 'niche', label: 'Ниша под шторы', hint: 'Потребуется закладная и более продуманное потолочное решение.' }
    ];

    const repairQuestSmartHomeOptions = [
      { value: 'no', label: 'Без автоматики', hint: 'Обычная инженерия без дополнительных сценариев.' },
      { value: 'prepare', label: 'Подготовка под умный дом', hint: 'Прокладка кабелей и слаботочки для будущей системы.' },
      { value: 'basic', label: 'Базовый smart', hint: 'Установка нескольких устройств и простых сценариев.' },
      { value: 'advanced', label: 'Расширенный smart', hint: 'Полная система с датчиками, сценариями и интеграцией.' }
    ];

    const repairQuestSecurityOptions = [
      { value: 'none', label: 'Без системы', hint: 'Только базовые точки подключения.' },
      { value: 'intercom', label: 'Домофон / звонок', hint: 'Нужен контроль входа без камер.' },
      { value: 'video_intercom', label: 'Видеодомофон', hint: 'Подключение видеодомофона для входа с картинкой.' },
      { value: 'smart_security', label: 'Умная безопасность', hint: 'Домофон, камеры и подготовка под контроль доступа.' }
    ];

    const repairQuestWallAccentOptions = [
      { value: 'none', label: 'Без акцентов', hint: 'Ровная спокойная отделка.' },
      { value: 'molding', label: 'Молдинги', hint: 'Классические декоративные профили на стенах.' },
      { value: 'slats', label: 'Рейки / панели', hint: 'Выраженный современный акцент на части стен.' }
    ];

    const repairQuestWallDecorOptions = [
      { value: 'none', label: 'Без декора', hint: 'Простая отделка стен.' },
      { value: 'wall_photo_wallpaper', label: 'Фотообои', hint: 'Акцентная стена с изображением.' },
      { value: 'wall_panels', label: 'Настенные панели', hint: 'Декоративные панели для стиля.' }
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
      { value: 'standard', label: 'Обычный плинтус', hint: 'Практичное решение без лишней сложности.' },
      { value: 'hidden', label: 'Скрытый плинтус', hint: 'Более сложный и дорогой, но визуально чище.' }
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
      { value: 'turnkey_target', label: 'Под ключ', hint: 'Финишный результат с более полным наполнением помещения.' }
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
      { value: 'prep_only', label: 'Подготовка', hint: 'Только трасса, питание и закладные.' },
      { value: 'new_install', label: 'Монтаж нового', hint: 'Сразу закладываем новый комплект.' },
      { value: 'replace_old', label: 'Замена старого', hint: 'Учитываем демонтаж и новую установку.' }
    ];

    const repairQuestApplianceLoadOptions = [
      { value: 'standard', label: 'Обычный набор', hint: 'Типовой набор техники без перегруза по электрике.' },
      { value: 'high', label: 'Насыщенная техника', hint: 'Много техники и более плотное инженерное наполнение.' }
    ];

    const repairQuestIntercomOptions = [
      { value: 'none', label: 'Не нужен', hint: 'Без домофона и видеодомофона.' },
      { value: 'intercom', label: 'Домофон', hint: 'Базовое решение для входа.' },
      { value: 'video_intercom', label: 'Видеодомофон', hint: 'Сразу учитываем вариант с экраном.' }
    ];

    const repairQuestUseScenarioOptions = [
      { value: 'storage', label: 'Хранение', hint: 'Простой сценарий без насыщенной инженерии.' },
      { value: 'relax', label: 'Зона отдыха', hint: 'Свет, теплый пол и более комфортная отделка.' },
      { value: 'workspace', label: 'Рабочая зона', hint: 'Нужны розетки, свет и стабильная инженерия.' }
    ];

    const repairQuestRoughFloorOptions = [
      { value: 'screed', label: 'Стяжка', hint: 'Базовая цементно-песчаная стяжка.' },
      { value: 'screed_warm', label: 'Стяжка + теплый пол', hint: 'Сразу готовим основание под теплый пол.' },
      { value: 'leveling_only', label: 'Локальное выравнивание', hint: 'Небольшое вмешательство без полной стяжки.' }
    ];

    const repairQuestRoughWallOptions = [
      { value: 'plaster', label: 'Штукатурка стен', hint: 'Стандартная подготовка стен.' },
      { value: 'plaster_with_partitions', label: 'Штукатурка + новые зоны', hint: 'Нужна более глубокая подготовка стен.' },
      { value: 'local_prep', label: 'Локальная подготовка', hint: 'Работаем только с частью помещения.' }
    ];

    const repairQuestRoughCeilingOptions = [
      { value: 'base_prep', label: 'Базовая подготовка', hint: 'Черновая подготовка потолка без финиша.' },
      { value: 'minimal', label: 'Минимально', hint: 'Только необходимый базовый объем.' }
    ];

    const repairQuestWhiteboxFloorOptions = [
      { value: 'screed_ready', label: 'Стяжка под финиш', hint: 'Основание готовим под чистовое покрытие.' },
      { value: 'self_leveling', label: 'Наливной пол', hint: 'Более ровная подготовка под финиш.' },
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

    function setRepairQuestMode(mode) {
      repairQuestState.mode = mode === 'full' ? 'full' : 'approx';
      const approxEl = document.getElementById('repairPlanApproxOption');
      const fullEl = document.getElementById('repairPlanFullOption');
      approxEl?.classList.toggle('is-active', repairQuestState.mode === 'approx');
      fullEl?.classList.toggle('is-active', repairQuestState.mode === 'full');

      const hint = document.getElementById('repairQuestModeHint');
      if (hint) {
        hint.textContent = repairQuestState.mode === 'full'
          ? 'Для полного расчета пройдем более подробный, но простой опрос по каждой комнате.'
          : 'Для примерного расчета мы спросим только самое важное, а остальное подставим по типу ремонта.';
      }

      if (repairQuestState.active) {
        initializeRepairQuestState();
        renderRepairQuest();
      }
    }

    function getRepairQuestTier() {
      return document.getElementById('detailedRepairType')?.value || 'business';
    }

    function getRepairQuestTierPreset() {
      const tier = getRepairQuestTier();
      const presets = {
        budget: {
          floor: 'laminate',
          wall: 'wallpaper',
          ceiling: 'stretch_ceiling',
          currentFloor: 'linoleum',
          currentWall: 'wallpaper',
          currentCeiling: 'ceiling_paint',
          package: 'minimal'
        },
        comfort: {
          floor: 'quartz_vinyl',
          wall: 'paint',
          ceiling: 'stretch_ceiling',
          currentFloor: 'laminate',
          currentWall: 'paint',
          currentCeiling: 'stretch_ceiling',
          package: 'standard'
        },
        business: {
          floor: 'engineered_board',
          wall: 'paint',
          ceiling: 'stretch_shadow',
          currentFloor: 'laminate',
          currentWall: 'wallpaper',
          currentCeiling: 'stretch_ceiling',
          package: 'standard'
        },
        premium: {
          floor: 'parquet_board',
          wall: 'decorative_plaster',
          ceiling: 'gypsum_ceiling',
          currentFloor: 'engineered_board',
          currentWall: 'paint',
          currentCeiling: 'gypsum_ceiling',
          package: 'extended'
        }
      };
      return presets[tier] || presets.business;
    }

    function getRepairQuestRooms() {
      const rooms = [];

      const pushRoom = (source, title, demoRoomId, repairRoomId, key) => {
        if (!source || !(Number(source.area || 0) > 0)) return;
        rooms.push({
          key,
          title,
          source,
          demoRoomId,
          repairRoomId
        });
      };

      if (roomData.living?.livingRooms) {
        roomData.living.livingRooms.forEach((room, index) => {
          pushRoom(room, `Жилое помещение_${index + 1}`, `demo_living_${index}`, `repair_living_${index}`, `living_${index}`);
        });
      }

      if (roomData.nonliving?.livingRooms) {
        roomData.nonliving.livingRooms.forEach((room, index) => {
          pushRoom(room, `Нежилое помещение_${index + 1}`, `demo_nonliving_${index}`, `repair_nonliving_${index}`, `nonliving_${index}`);
        });
      }

      if (roomData.nonliving?.floors) {
        roomData.nonliving.floors.forEach((floor, floorIndex) => {
          floor?.livingRooms?.forEach((room, roomIndex) => {
            pushRoom(
              room,
              `Нежилое помещение_${floorIndex + 1}_${roomIndex + 1}`,
              `demo_nonliving_${floorIndex}_${roomIndex}`,
              `repair_nonliving_${floorIndex}_${roomIndex}`,
              `floor_${floorIndex}_${roomIndex}`
            );
          });
        });
      }

      return rooms;
    }

    function getRepairQuestOpenings(source) {
      return {
        door: Math.min(parseInt(source?.doors, 10) || 0, 5),
        window: Math.min(parseInt(source?.windows, 10) || 0, 5),
        balcony: Math.min(parseInt(source?.balcony, 10) || 0, 5)
      };
    }

    function getRepairQuestRoomMetrics(source) {
      const area = Number(source?.area || 0);
      const walls = Number(source?.wallsArea || calculateLivingRoomWallsArea(source) || 0);
      return {
        floorArea: area,
        wallArea: walls,
        ceilingArea: area
      };
    }

    function getRepairQuestBaseCounts(meta, metrics, packageType) {
      const openings = getRepairQuestOpenings(meta.source);
      const isBathroom = isRepairQuestBathroomRoom(meta);
      const isKitchen = isRepairQuestKitchenRoom(meta);
      const isHallway = isRepairQuestHallwayRoom(meta);
      const isOffice = /офис/i.test(String(meta?.source?.roomType || meta?.title || ''));
      const multiplierMap = { minimal: 0.8, standard: 1, extended: 1.35 };
      const factor = multiplierMap[packageType] || 1;

      let socketsBase = Math.max(2, Math.ceil(metrics.floorArea / 8));
      let switchesBase = Math.max(1, Math.ceil(metrics.floorArea / 18));
      let lightsBase = Math.max(1, Math.ceil(metrics.floorArea / 12));
      let internetBase = Math.max(0, Math.round(metrics.floorArea / 25));
      let waterBase = 0;
      let drainageBase = 0;

      if (isBathroom) {
        socketsBase = Math.max(2, Math.ceil(metrics.floorArea / 3));
        switchesBase = Math.max(1, Math.ceil(metrics.floorArea / 6));
        lightsBase = Math.max(2, Math.ceil(metrics.floorArea / 3.5));
        internetBase = 0;
        waterBase = 3;
        drainageBase = 3;
      } else if (isKitchen) {
        socketsBase = Math.max(5, Math.ceil(metrics.floorArea / 3));
        switchesBase = Math.max(2, Math.ceil(metrics.floorArea / 10));
        lightsBase = Math.max(2, Math.ceil(metrics.floorArea / 5));
        internetBase = Math.max(0, Math.round(metrics.floorArea / 30));
        waterBase = 3;
        drainageBase = 2;
      } else if (isHallway) {
        socketsBase = Math.max(2, Math.ceil(metrics.floorArea / 5));
        switchesBase = Math.max(1, Math.ceil(metrics.floorArea / 10));
        lightsBase = Math.max(1, Math.ceil(metrics.floorArea / 6));
        internetBase = 0;
      } else if (isOffice) {
        socketsBase = Math.max(4, Math.ceil(metrics.floorArea / 5));
        switchesBase = Math.max(2, Math.ceil(metrics.floorArea / 12));
        lightsBase = Math.max(2, Math.ceil(metrics.floorArea / 7));
        internetBase = Math.max(1, Math.round(metrics.floorArea / 18));
      }

      const heatingBase = openings.window + openings.balcony > 0 && !isBathroom ? 1 : 0;

      return {
        sockets: Math.max(1, Math.round(socketsBase * factor)),
        switches: Math.max(1, Math.round(switchesBase * factor)),
        lights: Math.max(1, Math.round(lightsBase * factor)),
        internetPoints: Math.max(0, Math.round(internetBase * factor)),
        waterPoints: Math.max(0, Math.round(waterBase * factor)),
        drainagePoints: Math.max(0, Math.round(drainageBase * factor)),
        heatingDevices: Math.max(0, Math.round(heatingBase * factor))
      };
    }

    function buildRepairQuestDefaults(meta) {
      const preset = getRepairQuestTierPreset();
      const sourceRepair = meta.source?.repairData || {};
      const metrics = getRepairQuestRoomMetrics(meta.source);
      const packageType = preset.package || 'standard';
      const openings = getRepairQuestOpenings(meta.source);
      const baseCounts = getRepairQuestBaseCounts(meta, metrics, packageType);
      const socketMix = getRepairQuestSocketMix(baseCounts.sockets, meta);
      const isBathroom = isRepairQuestBathroomRoom(meta);
      const isKitchen = isRepairQuestKitchenRoom(meta);
      const roomType = getRepairQuestNormalizedRoomType(meta);
      const repairGoal = sourceRepair.repairTypeNew || 'clean';
      const targetResult = getRepairQuestTargetResultFromGoal(repairGoal);
      const hasPlumbing = isRepairQuestPlumbingRoom(meta);
      const hasHeating = isRepairQuestHeatingRoom(meta);
      const hasClimate = isRepairQuestClimateRoom(meta);

      const defaults = {
        currentState: sourceRepair.currentState || 'old_finish',
        oldFinishScope: sourceRepair.currentState === 'old_finish' ? 'all_room' : null,
        replanningAction: isRepairQuestReplanningRequired(meta) ? (repairQuestState.mode === 'full' ? 'demolish_or_move' : 'local_changes') : 'no',
        targetResult,
        repairGoal,
        targetStage: 'final',
        currentFloor: [preset.currentFloor],
        currentWall: [preset.currentWall],
        currentCeiling: [preset.currentCeiling],
        targetFloor: preset.floor,
        targetWall: preset.wall,
        targetCeiling: preset.ceiling,
        roughFloorPlan: 'screed',
        roughWallPlan: sourceRepair.currentState === 'concrete_no_walls' ? 'plaster_with_partitions' : 'plaster',
        roughCeilingPlan: 'base_prep',
        whiteboxFloorPlan: 'self_leveling',
        whiteboxWallPlan: 'putty',
        whiteboxCeilingPlan: 'putty_ready',
        wallReinforcement: 'no',
        doorsAction: openings.door > 0 ? 'install_new' : null,
        windowsAction: openings.window > 0 ? 'keep' : null,
        balconyAction: openings.balcony > 0 || canRepairQuestHaveBalconyOpening(meta) ? 'keep' : null,
        openingDetails: [],
        engineeringPackage: packageType,
        electricalScope: sourceRepair.currentState === 'whitebox' ? 'add_move_points' : 'full_rewire',
        plumbingScope: hasPlumbing ? 'add_move_points' : 'no_touch',
        heatingScope: hasHeating && baseCounts.heatingDevices > 0
          ? (sourceRepair.currentState === 'old_finish' ? 'no_touch' : 'install_new')
          : 'no_touch',
        heatingSystemType: hasHeating ? getRepairQuestDefaultHeatingType({ currentState: sourceRepair.currentState || 'old_finish' }, meta) : 'radiator_bottom',
        climateScope: hasClimate ? (metrics.floorArea >= 16 ? 'prep_only' : 'not_needed') : 'not_needed',
        lightingScenario: packageType === 'extended' ? 'scenario' : packageType === 'standard' ? 'accent' : 'basic',
        tileZones: isBathroom ? 'full' : 'none',
        curtainSolution: 'none',
        wallAccent: 'none',
        plinthType: 'standard',
        smartHome: 'no',
        smartCurtains: 'no',
        smartLeakSensors: (isBathroom || isKitchen) ? 'yes' : 'no',
        smartLightOffSensors: 'no',
        smartMotionSensors: ['hallway', 'corridor', 'wardrobe'].includes(roomType) ? 'yes' : 'no',
        smartClimateSensors: 'no',
        leakProtection: isBathroom || isKitchen ? 'yes' : 'no',
        airConditioning: hasClimate ? (metrics.floorArea >= 16 ? 'prepare' : 'no') : 'no',
        securityLevel: 'none',
        internetTv: 'no',
        internetPoints: baseCounts.internetPoints,
        ceilingAccent: packageType === 'extended' ? 'yes' : 'no',
        replaceElectrical: (sourceRepair.currentState || 'old_finish') !== 'whitebox' ? 'yes' : 'no',
        replacePlumbing: hasPlumbing ? 'yes' : 'no',
        replaceHeating: 'no',
        sockets: baseCounts.sockets,
        singleSockets: socketMix.singleSockets,
        doubleSockets: socketMix.doubleSockets,
        tripleSockets: socketMix.tripleSockets,
        childProtectedSockets: roomType === 'children' ? Math.min(2, baseCounts.sockets) : 0,
        moistureProofSockets: isRepairQuestMoistureSocketRoom(meta) ? Math.min(1, baseCounts.sockets) : 0,
        switches: baseCounts.switches,
        lights: baseCounts.lights,
        waterPoints: baseCounts.waterPoints,
        drainagePoints: baseCounts.drainagePoints,
        heatingDevices: baseCounts.heatingDevices,
        warmFloor: 'no',
        waterproofing: isBathroom ? 'yes' : 'no',
        soundproofing: 'no',
        changeDoor: openings.door > 0 ? 'yes' : 'no',
        changeWindow: openings.window > 0 ? 'yes' : 'no',
        changeBalcony: openings.balcony > 0 ? 'yes' : 'no',
        bathroomFixture: isBathroom ? 'bath' : 'none',
        toiletFormat: isBathroom ? 'wall' : 'floor',
        installationFrame: isBathroom ? 'yes' : 'no',
        towelDryer: isBathroom ? 'yes' : 'no',
        boilerOption: isBathroom ? 'no' : 'no',
        kitchenLayout: isKitchen ? 'linear' : null,
        backsplash: isKitchen ? 'accent' : 'none',
        ventilation: isKitchen ? 'enhanced' : 'standard',
        dishwasher: isKitchen ? 'no' : 'no',
        fridgeInstallation: isKitchen ? 'standard' : 'no',
        applianceCount: isKitchen ? 3 : 0,
        stoveType: isKitchen ? 'gas' : null,
        tvZone: ['living_room', 'bedroom', 'kitchen'].includes(roomType) ? 'no' : 'no',
        bedsideLight: roomType === 'bedroom' ? 'yes' : 'no',
        workPlace: ['children', 'cabinet'].includes(roomType) ? 'yes' : 'no',
        extraLight: ['children', 'balcony', 'loggia', 'terrace'].includes(roomType) ? 'yes' : 'no',
        acoustics: 'no',
        decorativeLighting: 'no',
        extraSockets: ['cabinet', 'wardrobe', 'balcony', 'loggia', 'terrace', 'office'].includes(roomType) ? 'yes' : 'no',
        taskLight: roomType === 'cabinet' ? 'yes' : 'no',
        oven: isKitchen ? 'yes' : 'no',
        hoodType: isKitchen ? 'standard' : 'standard',
        waterFilter: 'no',
        disposer: 'no',
        applianceLoad: isKitchen ? 'standard' : 'standard',
        showerDrain: roomType === 'shower' ? 'drain' : 'tray',
        washingMachine: ['shower', 'bathroom', 'combined_bath'].includes(roomType) ? 'yes' : 'no',
        hiddenMixers: isBathroom ? 'no' : 'no',
        hygienicShower: roomType === 'toilet' ? 'no' : 'no',
        miniSink: roomType === 'toilet' ? 'no' : 'no',
        intercomType: roomType === 'hallway' ? 'none' : 'none',
        wardrobeLight: ['hallway', 'wardrobe'].includes(roomType) ? 'yes' : 'no',
        passageLight: roomType === 'corridor' ? 'yes' : 'no',
        accentLight: roomType === 'corridor' ? 'no' : 'no',
        ventilationBoost: roomType === 'wardrobe' ? 'no' : 'no',
        insulation: ['balcony', 'loggia'].includes(roomType) ? 'no' : 'no',
        useScenario: ['balcony', 'loggia'].includes(roomType) ? 'storage' : null,
        outdoorFlooring: roomType === 'terrace' ? 'yes' : 'no',
        moistureProtection: roomType === 'terrace' ? 'yes' : 'no',
        workPlaces: roomType === 'office' ? 4 : 0,
        wallDecor: 'none',
        ceilingDecor: 'none',
        ceilingHatch: 'no',
        blockConfirmation: getRepairQuestEmptyBlockConfirmation()
      };

      defaults.wallReinforcement = getRepairQuestDefaultWallReinforcement(defaults, meta);
      return defaults;
    }

    function initializeRepairQuestState() {
      const rooms = getRepairQuestRooms();
      repairQuestState.rooms = rooms;
      repairQuestState.step = 0;
      repairQuestState.answers = {};
      repairQuestState.lastAudit = null;
      repairQuestState.sectionAudit = null;
      rooms.forEach(meta => {
        repairQuestState.answers[meta.key] = buildRepairQuestDefaults(meta);
        synchronizeRepairQuestDerivedFields(meta.key);
      });
    }

    function startRepairQuest() {
      const rooms = getRepairQuestRooms();
      if (!rooms.length) {
        alert('Сначала добавьте хотя бы одно помещение в разделе "Помещения".');
        return;
      }

      initializeRepairQuestState();
      repairQuestState.active = true;

      const screen = document.getElementById('repairQuestScreen');
      if (screen) {
        screen.style.display = 'block';
        screen.setAttribute('aria-hidden', 'false');
      }

      document.body.style.overflow = 'hidden';
      renderRepairQuest();
    }

    function closeRepairQuest() {
      repairQuestState.active = false;
      const screen = document.getElementById('repairQuestScreen');
      if (screen) {
        screen.style.display = 'none';
        screen.setAttribute('aria-hidden', 'true');
      }
      document.body.style.overflow = '';
    }

    function updateRepairQuestAnswer(roomKey, field, value) {
      if (!repairQuestState.answers[roomKey]) return;
      repairQuestState.answers[roomKey][field] = value;
      resetRepairQuestBlockConfirmation(roomKey, field);

      if (field === 'currentState' && value !== 'old_finish') {
        repairQuestState.answers[roomKey].currentFloor = [];
        repairQuestState.answers[roomKey].currentWall = [];
        repairQuestState.answers[roomKey].currentCeiling = [];
      } else if (field === 'currentState' && value === 'old_finish') {
        const defaults = buildRepairQuestDefaults(repairQuestState.rooms.find(room => room.key === roomKey));
        if (!Array.isArray(repairQuestState.answers[roomKey].currentFloor) || !repairQuestState.answers[roomKey].currentFloor.length) {
          repairQuestState.answers[roomKey].currentFloor = [...defaults.currentFloor];
        }
        if (!Array.isArray(repairQuestState.answers[roomKey].currentWall) || !repairQuestState.answers[roomKey].currentWall.length) {
          repairQuestState.answers[roomKey].currentWall = [...defaults.currentWall];
        }
        if (!Array.isArray(repairQuestState.answers[roomKey].currentCeiling) || !repairQuestState.answers[roomKey].currentCeiling.length) {
          repairQuestState.answers[roomKey].currentCeiling = [...defaults.currentCeiling];
        }
      }

      if (field === 'engineeringPackage') {
        syncRepairQuestPackageCounts(roomKey);
      }

      if (field === 'targetResult') {
        repairQuestState.answers[roomKey].repairGoal = mapRepairQuestTargetResultToGoal(value);
      }

      synchronizeRepairQuestDerivedFields(roomKey);

      renderRepairQuest();
    }

    function syncRepairQuestPackageCounts(roomKey) {
      const meta = repairQuestState.rooms.find(room => room.key === roomKey);
      const answer = repairQuestState.answers[roomKey];
      if (!meta || !answer) return;
      const packageValue = answer.engineeringPackage || getRepairQuestTierPreset().package || 'standard';
      const counts = getRepairQuestBaseCounts(meta, getRepairQuestRoomMetrics(meta.source), packageValue);
      const socketMix = getRepairQuestSocketMix(counts.sockets, meta);
      answer.sockets = counts.sockets;
      answer.singleSockets = socketMix.singleSockets;
      answer.doubleSockets = socketMix.doubleSockets;
      answer.tripleSockets = socketMix.tripleSockets;
      answer.childProtectedSockets = getRepairQuestNormalizedRoomType(meta) === 'children' ? Math.min(2, counts.sockets) : 0;
      answer.moistureProofSockets = isRepairQuestMoistureSocketRoom(meta) ? Math.min(1, counts.sockets) : 0;
      answer.switches = counts.switches;
      answer.lights = counts.lights;
      answer.internetPoints = counts.internetPoints;
      answer.waterPoints = counts.waterPoints;
      answer.drainagePoints = counts.drainagePoints;
      answer.heatingDevices = counts.heatingDevices;
      if (repairQuestState.mode === 'approx') {
        answer.lightingScenario = packageValue === 'extended' ? 'scenario' : packageValue === 'standard' ? 'accent' : 'basic';
        answer.ceilingAccent = packageValue === 'extended' ? 'yes' : 'no';
        if (isRepairQuestClimateRoom(meta)) {
          answer.airConditioning = packageValue === 'extended' || getRepairQuestRoomMetrics(meta.source).floorArea >= 16 ? 'prepare' : 'no';
        }
      }
      synchronizeRepairQuestDerivedFields(roomKey);
    }

    function toggleRepairQuestMultiAnswer(roomKey, field, value) {
      const answer = repairQuestState.answers[roomKey];
      if (!answer) return;
      if (!Array.isArray(answer[field])) {
        answer[field] = answer[field] ? [answer[field]] : [];
      }
      const currentValues = answer[field];
      const exists = currentValues.includes(value);
      const nextValues = exists
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      answer[field] = nextValues;
      resetRepairQuestBlockConfirmation(roomKey, field);
      synchronizeRepairQuestDerivedFields(roomKey);
      renderRepairQuest();
    }

    function getRepairQuestRoomCategory(meta) {
      const roomType = String(meta?.source?.roomType || meta?.title || '').toLowerCase();
      if (/санузел|ванна|душ|туалет/.test(roomType)) return 'Санузел';
      if (/кухня/.test(roomType)) return 'Кухня';
      if (/прихожая|коридор|гардеробная|балкон|лоджия|терраса/.test(roomType)) return 'Служебное помещение';
      if (/офис/.test(roomType)) return 'Офис';
      return 'Жилое помещение';
    }

    function isRepairQuestBathroomRoom(meta) {
      const roomType = String(meta?.source?.roomType || meta?.title || '').toLowerCase();
      return /санузел|ванна|душ|туалет/.test(roomType);
    }

    function isRepairQuestKitchenRoom(meta) {
      const roomType = String(meta?.source?.roomType || meta?.title || '').toLowerCase();
      return /кухня/.test(roomType);
    }

    function isRepairQuestHallwayRoom(meta) {
      const roomType = String(meta?.source?.roomType || meta?.title || '').toLowerCase();
      return /прихожая|коридор|гардеробная/.test(roomType);
    }

    function getRepairQuestNormalizedRoomType(meta) {
      const roomType = String(meta?.source?.roomType || meta?.title || '').toLowerCase();
      if (/спальня/.test(roomType)) return 'bedroom';
      if (/детская/.test(roomType)) return 'children';
      if (/гостиная/.test(roomType)) return 'living_room';
      if (/кабинет/.test(roomType)) return 'cabinet';
      if (/мансард/.test(roomType)) return 'attic';
      if (/кухня/.test(roomType)) return 'kitchen';
      if (/душ/.test(roomType)) return 'shower';
      if (/ванна/.test(roomType) && !/совмещ/.test(roomType)) return 'bathroom';
      if (/совмещ/.test(roomType)) return 'combined_bath';
      if (/санузел|туалет/.test(roomType)) return 'toilet';
      if (/прихожая/.test(roomType)) return 'hallway';
      if (/коридор/.test(roomType)) return 'corridor';
      if (/гардероб/.test(roomType)) return 'wardrobe';
      if (/балкон/.test(roomType)) return 'balcony';
      if (/лодж/.test(roomType)) return 'loggia';
      if (/террас/.test(roomType)) return 'terrace';
      if (/цоколь/.test(roomType)) return 'crawl_space';
      if (/подвал/.test(roomType)) return 'basement';
      if (/офис/.test(roomType)) return 'office';
      return 'living_room';
    }

    function isRepairQuestBathroomRoom(meta) {
      return ['shower', 'bathroom', 'toilet', 'combined_bath'].includes(getRepairQuestNormalizedRoomType(meta));
    }

    function isRepairQuestKitchenRoom(meta) {
      return getRepairQuestNormalizedRoomType(meta) === 'kitchen';
    }

    function isRepairQuestHallwayRoom(meta) {
      return ['hallway', 'corridor', 'wardrobe'].includes(getRepairQuestNormalizedRoomType(meta));
    }

    function isRepairQuestClimateRoom(meta) {
      return !['shower', 'bathroom', 'toilet', 'combined_bath', 'hallway', 'corridor', 'wardrobe', 'balcony', 'loggia', 'terrace'].includes(getRepairQuestNormalizedRoomType(meta));
    }

    function isRepairQuestOfficeRoom(meta) {
      return getRepairQuestNormalizedRoomType(meta) === 'office';
    }

    function canRepairQuestHaveBalconyOpening(meta) {
      return ['bedroom', 'children', 'living_room', 'cabinet', 'kitchen', 'balcony', 'loggia', 'terrace'].includes(getRepairQuestNormalizedRoomType(meta));
    }

    function isRepairQuestPlumbingRoom(meta) {
      return ['kitchen', 'shower', 'bathroom', 'toilet', 'combined_bath'].includes(getRepairQuestNormalizedRoomType(meta));
    }

    function isRepairQuestHeatingRoom(meta) {
      return !['shower', 'bathroom', 'toilet', 'combined_bath', 'terrace'].includes(getRepairQuestNormalizedRoomType(meta));
    }

    function isRepairQuestWetRoom(meta) {
      return isRepairQuestBathroomRoom(meta) || isRepairQuestKitchenRoom(meta);
    }

    function isRepairQuestMoistureSocketRoom(meta) {
      return ['kitchen', 'shower', 'bathroom', 'toilet', 'combined_bath', 'balcony', 'loggia'].includes(getRepairQuestNormalizedRoomType(meta));
    }

    function isRepairQuestReplanningRequired(meta) {
      const source = meta?.source || {};
      return !!(source.replanningRequired || source.requiresReplanning || source.needReplanning || source.repairData?.replanningRequired);
    }

    function hasRepairQuestOpenings(meta) {
      const openings = getRepairQuestOpenings(meta?.source);
      return openings.door > 0 || openings.window > 0 || openings.balcony > 0 || canRepairQuestHaveBalconyOpening(meta);
    }

    function hasRepairQuestOpeningRework(answer) {
      return answer?.doorsAction === 'replace_with_demo'
        || answer?.windowsAction === 'replace_with_demo'
        || answer?.balconyAction === 'replace_with_demo';
    }

    function shouldRequireRepairQuestOpeningDetails(answer) {
      return answer?.doorsAction === 'replace_with_demo'
        || answer?.windowsAction === 'replace_with_demo'
        || answer?.balconyAction === 'replace_with_demo';
    }

    function getRepairQuestBalconyActionOptions(meta) {
      const openings = getRepairQuestOpenings(meta?.source);
      return openings.balcony > 0 ? repairQuestBalconyActionExistingOptions : repairQuestBalconyActionPotentialOptions;
    }

    function getRepairQuestDefaultHeatingType(answer, meta) {
      if (!isRepairQuestHeatingRoom(meta)) return 'radiator_bottom';
      return answer?.currentState === 'old_finish' ? 'radiator_side' : 'radiator_bottom';
    }

    function getRepairQuestSocketMix(totalSockets, meta) {
      let remaining = Math.max(0, Number(totalSockets || 0));
      const roomType = getRepairQuestNormalizedRoomType(meta);
      let tripleSockets = 0;
      let doubleSockets = 0;
      let singleSockets = 0;

      if (remaining <= 0) {
        return { singleSockets: 0, doubleSockets: 0, tripleSockets: 0 };
      }

      if (roomType === 'kitchen') {
        tripleSockets = Math.min(2, Math.floor(remaining / 5));
      } else if (['living_room', 'office', 'cabinet'].includes(roomType)) {
        tripleSockets = Math.min(1, Math.floor(remaining / 6));
      }
      remaining -= tripleSockets * 3;

      if (remaining >= 2) {
        doubleSockets = Math.floor(remaining / 3);
        remaining -= doubleSockets * 2;
      }

      singleSockets = remaining;

      return {
        singleSockets: Math.max(0, singleSockets),
        doubleSockets: Math.max(0, doubleSockets),
        tripleSockets: Math.max(0, tripleSockets)
      };
    }

    function getRepairQuestTotalSockets(answer) {
      if (!answer) return 0;
      if (repairQuestState.mode !== 'full') {
        return Math.max(0, Number(answer.sockets || 0));
      }
      return Math.max(0, Number(answer.singleSockets || 0))
        + Math.max(0, Number(answer.doubleSockets || 0) * 2)
        + Math.max(0, Number(answer.tripleSockets || 0) * 3);
    }

    function doesRepairQuestNeedWallPlaster(answer) {
      if (!answer) return false;
      if (answer.targetResult === 'rough_target') {
        return ['plaster', 'plaster_with_partitions'].includes(answer.roughWallPlan);
      }
      if (answer.targetResult === 'whitebox_target') {
        return ['plaster', 'putty', 'paint_ready'].includes(answer.whiteboxWallPlan);
      }
      return ['concrete_with_walls', 'concrete_no_walls', 'rough_finish', 'old_finish'].includes(answer.currentState);
    }

    function getRepairQuestDefaultWallReinforcement(answer, meta) {
      if (!doesRepairQuestNeedWallPlaster(answer)) return 'no';
      if (answer.currentState === 'concrete_no_walls') return 'mesh';
      if (answer.roughWallPlan === 'plaster_with_partitions') return 'mesh';
      if (answer.whiteboxWallPlan === 'paint_ready') return 'mesh';
      if (answer.targetWall === 'paint') return 'mesh';
      if (answer.targetWall === 'decorative_plaster') return 'mesh';
      if (isRepairQuestReplanningRequired(meta)) return 'mesh';
      return 'no';
    }

    function shouldShowRepairQuestWallReinforcement(meta, answer) {
      return doesRepairQuestNeedWallPlaster(answer);
    }

    function shouldShowRepairQuestCeilingHatch(answer) {
      if (!answer || !['finish_target', 'turnkey_target'].includes(answer.targetResult)) return false;
      return ['stretch_ceiling', 'stretch_shadow', 'gypsum_ceiling', 'suspended_ceiling'].includes(answer.targetCeiling);
    }

    function shouldShowRepairQuestDemolition(meta, answer) {
      return isRepairQuestReplanningRequired(meta) || answer?.currentState === 'old_finish' || hasRepairQuestOpeningRework(answer);
    }

    function getRepairQuestEmptyBlockConfirmation() {
      return {
        state: false,
        demolition: false,
        result: false,
        roughing: false,
        openings: false,
        engineering: false,
        smart: false,
        equipment: false,
        surfaces: false,
        extras: false
      };
    }

    function getRepairQuestTargetResultFromGoal(repairGoal) {
      const map = {
        rough: 'rough_target',
        whitebox_new: 'whitebox_target',
        clean: 'finish_target',
        turnkey: 'turnkey_target'
      };
      return map[repairGoal] || 'finish_target';
    }

    function mapRepairQuestTargetResultToGoal(targetResult) {
      const map = {
        rough_target: 'rough',
        whitebox_target: 'whitebox_new',
        finish_target: 'clean',
        turnkey_target: 'turnkey'
      };
      return map[targetResult] || 'clean';
    }

    function synchronizeRepairQuestDerivedFields(roomKey) {
      const answer = repairQuestState.answers[roomKey];
      if (!answer) return;
      answer.repairGoal = mapRepairQuestTargetResultToGoal(answer.targetResult);
      if (repairQuestState.mode === 'full') {
        answer.sockets = getRepairQuestTotalSockets(answer);
        const totalSockets = answer.sockets;
        answer.childProtectedSockets = Math.min(Math.max(0, Number(answer.childProtectedSockets || 0)), totalSockets);
        answer.moistureProofSockets = Math.min(Math.max(0, Number(answer.moistureProofSockets || 0)), totalSockets);
      }
      answer.changeDoor = answer.doorsAction && answer.doorsAction !== 'keep' ? 'yes' : 'no';
      answer.changeWindow = answer.windowsAction && answer.windowsAction !== 'keep' ? 'yes' : 'no';
      answer.changeBalcony = answer.balconyAction && answer.balconyAction !== 'keep' ? 'yes' : 'no';
      answer.replaceElectrical = answer.electricalScope && answer.electricalScope !== 'no_touch' ? 'yes' : 'no';
      answer.replacePlumbing = answer.plumbingScope && answer.plumbingScope !== 'no_touch' ? 'yes' : 'no';
      answer.replaceHeating = answer.heatingScope && answer.heatingScope !== 'no_touch' ? 'yes' : 'no';
      if (!shouldShowRepairQuestCeilingHatch(answer)) {
        answer.ceilingHatch = 'no';
      }
      if (answer.climateScope === 'prep_only') {
        answer.airConditioning = 'prepare';
      } else if (answer.climateScope === 'replace_old') {
        answer.airConditioning = 'replace';
      } else if (answer.climateScope === 'new_install') {
        answer.airConditioning = 'prepare';
      } else {
        answer.airConditioning = 'no';
      }
      if (answer.tvZone === 'yes') {
        answer.internetTv = 'yes';
      }
      if (answer.smartHome === 'no') {
        ['smartCurtains', 'smartLeakSensors', 'smartLightOffSensors', 'smartMotionSensors', 'smartClimateSensors'].forEach(field => {
          answer[field] = 'no';
        });
      }
      if (!answer.blockConfirmation) {
        answer.blockConfirmation = getRepairQuestEmptyBlockConfirmation();
      }
    }

    function getRepairQuestEquipmentConfigs(meta) {
      const roomType = getRepairQuestNormalizedRoomType(meta);
      const configs = {
        bedroom: [
          { field: 'tvZone', label: 'ТВ-зона', type: 'toggle' },
          { field: 'bedsideLight', label: 'Прикроватный свет', type: 'toggle' },
          { field: 'workPlace', label: 'Рабочее место', type: 'toggle' }
        ],
        children: [
          { field: 'workPlace', label: 'Рабочая зона', type: 'toggle' },
          { field: 'extraLight', label: 'Дополнительный свет', type: 'toggle' }
        ],
        living_room: [
          { field: 'tvZone', label: 'ТВ-зона', type: 'toggle' },
          { field: 'acoustics', label: 'Акустика / кинотеатр', type: 'toggle' },
          { field: 'decorativeLighting', label: 'Декоративная подсветка', type: 'toggle' }
        ],
        cabinet: [
          { field: 'workPlace', label: 'Рабочее место', type: 'toggle' },
          { field: 'extraSockets', label: 'Нужен запас розеток', type: 'toggle' },
          { field: 'taskLight', label: 'Локальный рабочий свет', type: 'toggle' }
        ],
        kitchen: [
          { field: 'kitchenLayout', label: 'Планировка кухни', type: 'choice', options: [
            { value: 'linear', label: 'Линейная', hint: 'Классическое решение вдоль одной стены.' },
            { value: 'corner', label: 'Угловая', hint: 'Удобное решение с большим рабочим фронтом.' },
            { value: 'island', label: 'Островная', hint: 'Более сложный и насыщенный вариант.' }
          ]},
          { field: 'stoveType', label: 'Тип плиты', type: 'choice', options: repairQuestStoveOptions },
          { field: 'oven', label: 'Духовой шкаф отдельно', type: 'toggle', fullOnly: true },
          { field: 'dishwasher', label: 'Посудомоечная машина', type: 'toggle' },
          { field: 'fridgeInstallation', label: 'Холодильник', type: 'choice', options: repairQuestFridgeOptions },
          { field: 'ventilation', label: 'Вентиляция / вытяжка', type: 'choice', options: [
            { value: 'standard', label: 'Стандартная', hint: 'Обычный базовый вариант.' },
            { value: 'enhanced', label: 'Усиленная', hint: 'Более заметный объем по вентиляции.' }
          ]},
          { field: 'hoodType', label: 'Вытяжка', type: 'choice', options: [
            { value: 'standard', label: 'Стандартная', hint: 'Обычное решение без сложного узла.' },
            { value: 'built_in', label: 'Встроенная', hint: 'Нужна более продуманная подготовка.' }
          ], fullOnly: true },
          { field: 'waterFilter', label: 'Фильтр воды', type: 'toggle', fullOnly: true },
          { field: 'disposer', label: 'Измельчитель', type: 'toggle', fullOnly: true },
          { field: 'tvZone', label: 'ТВ-зона', type: 'toggle' },
          { field: 'applianceLoad', label: 'Насыщенность техникой', type: 'choice', options: repairQuestApplianceLoadOptions }
        ],
        shower: [
          { field: 'bathroomFixture', label: 'Что будет в зоне', type: 'choice', options: [
            { value: 'shower', label: 'Душевая', hint: 'Основной сценарий для душевой.' },
            { value: 'combined', label: 'Душевая с доп. сантехникой', hint: 'Более насыщенный узел.' }
          ]},
          { field: 'showerDrain', label: 'Поддон или трап', type: 'choice', options: [
            { value: 'tray', label: 'Поддон', hint: 'Стандартное решение.' },
            { value: 'drain', label: 'Трап / канал', hint: 'Нужен более сложный узел.' }
          ], fullOnly: true },
          { field: 'washingMachine', label: 'Стиральная машина', type: 'toggle' },
          { field: 'boilerOption', label: 'Бойлер', type: 'choice', options: repairQuestBoilerOptions },
          { field: 'towelDryer', label: 'Полотенцесушитель', type: 'toggle' },
          { field: 'hiddenMixers', label: 'Скрытые смесители', type: 'toggle', fullOnly: true }
        ],
        bathroom: [
          { field: 'bathroomFixture', label: 'Что будет в ванной', type: 'choice', options: [
            { value: 'bath', label: 'Ванна', hint: 'Классический вариант.' },
            { value: 'shower', label: 'Душевая', hint: 'Если ванна не нужна.' },
            { value: 'combined', label: 'Комбинированно', hint: 'Смешанный формат сантехкабины.' }
          ]},
          { field: 'washingMachine', label: 'Стиральная машина', type: 'toggle' },
          { field: 'boilerOption', label: 'Бойлер', type: 'choice', options: repairQuestBoilerOptions },
          { field: 'towelDryer', label: 'Полотенцесушитель', type: 'toggle' },
          { field: 'hiddenMixers', label: 'Скрытые смесители', type: 'toggle', fullOnly: true }
        ],
        toilet: [
          { field: 'toiletFormat', label: 'Унитаз', type: 'choice', options: [
            { value: 'wall', label: 'Инсталляция', hint: 'Подвесной вариант.' },
            { value: 'floor', label: 'Напольный', hint: 'Классический вариант.' }
          ]},
          { field: 'hygienicShower', label: 'Гигиенический душ', type: 'toggle', fullOnly: true },
          { field: 'miniSink', label: 'Мини-раковина', type: 'toggle', fullOnly: true },
          { field: 'boilerOption', label: 'Бойлер', type: 'choice', options: repairQuestBoilerOptions, fullOnly: true }
        ],
        combined_bath: [
          { field: 'bathroomFixture', label: 'Ванна или душевая', type: 'choice', options: [
            { value: 'bath', label: 'Ванна', hint: 'Классический вариант.' },
            { value: 'shower', label: 'Душевая', hint: 'Более компактное решение.' },
            { value: 'combined', label: 'Оба сценария', hint: 'Более насыщенное решение.' }
          ]},
          { field: 'toiletFormat', label: 'Унитаз', type: 'choice', options: [
            { value: 'wall', label: 'Инсталляция', hint: 'Подвесной вариант.' },
            { value: 'floor', label: 'Напольный', hint: 'Классический вариант.' }
          ]},
          { field: 'washingMachine', label: 'Стиральная машина', type: 'toggle' },
          { field: 'boilerOption', label: 'Бойлер', type: 'choice', options: repairQuestBoilerOptions },
          { field: 'towelDryer', label: 'Полотенцесушитель', type: 'toggle' },
          { field: 'hiddenMixers', label: 'Скрытые смесители', type: 'toggle', fullOnly: true }
        ],
        hallway: [
          { field: 'intercomType', label: 'Домофон', type: 'choice', options: repairQuestIntercomOptions },
          { field: 'wardrobeLight', label: 'Подсветка шкафа', type: 'toggle', fullOnly: true },
          { field: 'securityLevel', label: 'Безопасность', type: 'choice', options: repairQuestSecurityOptions, fullOnly: true }
        ],
        corridor: [
          { field: 'passageLight', label: 'Проходной свет', type: 'toggle' },
          { field: 'accentLight', label: 'Подсветка', type: 'toggle' }
        ],
        wardrobe: [
          { field: 'wardrobeLight', label: 'Подсветка', type: 'toggle' },
          { field: 'extraSockets', label: 'Розетки', type: 'toggle' },
          { field: 'ventilationBoost', label: 'Вентиляция', type: 'toggle', fullOnly: true }
        ],
        balcony: [
          { field: 'insulation', label: 'Утепление', type: 'toggle' },
          { field: 'extraLight', label: 'Свет', type: 'toggle' },
          { field: 'extraSockets', label: 'Розетка', type: 'toggle' },
          { field: 'useScenario', label: 'Сценарий использования', type: 'choice', options: repairQuestUseScenarioOptions }
        ],
        loggia: [
          { field: 'insulation', label: 'Утепление', type: 'toggle' },
          { field: 'extraLight', label: 'Свет', type: 'toggle' },
          { field: 'extraSockets', label: 'Розетки', type: 'toggle' },
          { field: 'useScenario', label: 'Сценарий использования', type: 'choice', options: repairQuestUseScenarioOptions }
        ],
        terrace: [
          { field: 'outdoorFlooring', label: 'Уличное покрытие', type: 'toggle' },
          { field: 'extraLight', label: 'Освещение', type: 'toggle' },
          { field: 'extraSockets', label: 'Розетки', type: 'toggle' },
          { field: 'moistureProtection', label: 'Защита от влаги', type: 'toggle' }
        ],
        office: [
          { field: 'workPlaces', label: 'Рабочие места', type: 'counter', min: 0, max: 20 },
          { field: 'extraSockets', label: 'Много розеток', type: 'toggle' },
          { field: 'securityLevel', label: 'Безопасность', type: 'choice', options: repairQuestSecurityOptions, fullOnly: true }
        ]
      };
      return (configs[roomType] || configs.living_room).filter(config => !config.fullOnly || repairQuestState.mode === 'full');
    }

    function getRepairQuestSmartConfigs(meta) {
      const roomType = getRepairQuestNormalizedRoomType(meta);
      const configs = [];

      if (['bedroom', 'children', 'living_room', 'cabinet', 'kitchen', 'balcony', 'loggia', 'terrace'].includes(roomType)) {
        configs.push({ field: 'smartCurtains', label: 'Автоматика штор / карниза', type: 'toggle' });
      }
      if (isRepairQuestWetRoom(meta)) {
        configs.push({ field: 'smartLeakSensors', label: 'Датчики протечки', type: 'toggle' });
      }
      if (['hallway', 'corridor', 'wardrobe', 'toilet', 'shower', 'bathroom', 'combined_bath'].includes(roomType)) {
        configs.push({ field: 'smartMotionSensors', label: 'Датчик движения / присутствия', type: 'toggle', fullOnly: true });
      }
      if (isRepairQuestClimateRoom(meta)) {
        configs.push({ field: 'smartClimateSensors', label: 'Климат-датчики / термостат', type: 'toggle', fullOnly: true });
      }
      if (roomType !== 'terrace') {
        configs.push({ field: 'smartLightOffSensors', label: 'Автовыключение света', type: 'toggle' });
      }

      return configs.filter(config => !config.fullOnly || repairQuestState.mode === 'full');
    }

    function getRepairQuestBlockKeys(meta) {
      const answer = repairQuestState.answers[meta.key];
      const blocks = ['state'];
      if (shouldShowRepairQuestDemolition(meta, answer)) blocks.push('demolition');
      blocks.push('result');
      if (shouldShowRepairQuestRoughBlock(answer)) blocks.push('roughing');
      if (hasRepairQuestOpenings(meta)) blocks.push('openings');
      blocks.push('engineering', 'smart', 'equipment');
      if (shouldShowRepairQuestFinishingBlock(answer)) blocks.push('surfaces');
      blocks.push('extras');
      return blocks;
    }

    function getRepairQuestFieldBlockMap() {
      return {
        currentState: 'state',
        oldFinishScope: 'state',
        replanningAction: 'demolition',
        currentFloor: 'demolition',
        currentWall: 'demolition',
        currentCeiling: 'demolition',
        targetResult: 'result',
        targetStage: 'result',
        doorsAction: 'openings',
        windowsAction: 'openings',
        balconyAction: 'openings',
        openingDetails: 'openings',
        electricalScope: 'engineering',
        plumbingScope: 'engineering',
        heatingScope: 'engineering',
        heatingSystemType: 'engineering',
        climateScope: 'engineering',
        sockets: 'engineering',
        singleSockets: 'engineering',
        doubleSockets: 'engineering',
        tripleSockets: 'engineering',
        childProtectedSockets: 'engineering',
        moistureProofSockets: 'engineering',
        switches: 'engineering',
        lights: 'engineering',
        internetPoints: 'engineering',
        waterPoints: 'engineering',
        drainagePoints: 'engineering',
        heatingDevices: 'engineering',
        smartHome: 'smart',
        smartCurtains: 'smart',
        smartLeakSensors: 'smart',
        smartLightOffSensors: 'smart',
        smartMotionSensors: 'smart',
        smartClimateSensors: 'smart',
        tvZone: 'equipment',
        bedsideLight: 'equipment',
        workPlace: 'equipment',
        extraLight: 'equipment',
        acoustics: 'equipment',
        decorativeLighting: 'equipment',
        extraSockets: 'equipment',
        kitchenLayout: 'equipment',
        taskLight: 'equipment',
        stoveType: 'equipment',
        oven: 'equipment',
        dishwasher: 'equipment',
        fridgeInstallation: 'equipment',
        ventilation: 'equipment',
        hoodType: 'equipment',
        waterFilter: 'equipment',
        disposer: 'equipment',
        applianceLoad: 'equipment',
        bathroomFixture: 'equipment',
        showerDrain: 'equipment',
        washingMachine: 'equipment',
        boilerOption: 'equipment',
        towelDryer: 'equipment',
        hiddenMixers: 'equipment',
        toiletFormat: 'equipment',
        hygienicShower: 'equipment',
        miniSink: 'equipment',
        intercomType: 'equipment',
        wardrobeLight: 'equipment',
        securityLevel: 'equipment',
        passageLight: 'equipment',
        accentLight: 'equipment',
        ventilationBoost: 'equipment',
        insulation: 'equipment',
        useScenario: 'equipment',
        outdoorFlooring: 'equipment',
        moistureProtection: 'equipment',
        workPlaces: 'equipment',
        roughFloorPlan: 'roughing',
        roughWallPlan: 'roughing',
        roughCeilingPlan: 'roughing',
        whiteboxFloorPlan: 'roughing',
        whiteboxWallPlan: 'roughing',
        whiteboxCeilingPlan: 'roughing',
        wallReinforcement: 'roughing',
        targetFloor: 'surfaces',
        targetWall: 'surfaces',
        targetCeiling: 'surfaces',
        tileZones: 'surfaces',
        backsplash: 'surfaces',
        wallDecor: 'surfaces',
        wallAccent: 'surfaces',
        curtainSolution: 'surfaces',
        ceilingDecor: 'surfaces',
        ceilingHatch: 'surfaces',
        lightingScenario: 'extras',
        plinthType: 'extras',
        warmFloor: 'extras',
        waterproofing: 'extras',
        soundproofing: 'extras',
        leakProtection: 'extras',
        ceilingAccent: 'extras',
        internetTv: 'engineering',
        airConditioning: 'equipment'
      };
    }

    function resetRepairQuestBlockConfirmation(roomKey, field) {
      const answer = repairQuestState.answers[roomKey];
      if (!answer) return;
      if (!answer.blockConfirmation) {
        answer.blockConfirmation = getRepairQuestEmptyBlockConfirmation();
      }
      const map = getRepairQuestFieldBlockMap();
      const blockKey = map[field];
      if (blockKey) answer.blockConfirmation[blockKey] = false;
      if (field === 'currentState' && answer.currentState !== 'old_finish') {
        answer.blockConfirmation.demolition = false;
      }
    }

    function confirmRepairQuestBlock(roomKey, blockKey) {
      const answer = repairQuestState.answers[roomKey];
      if (!answer) return;
      if (!isRepairQuestBlockReady(roomKey, blockKey)) {
        alert('Сначала заполните этот блок, затем подтвердите выбор.');
        return;
      }
      if (!answer.blockConfirmation) {
        answer.blockConfirmation = getRepairQuestEmptyBlockConfirmation();
      }
      answer.blockConfirmation[blockKey] = true;
      renderRepairQuest();
    }

    function isRepairQuestBlockConfirmed(roomKey, blockKey) {
      return !!repairQuestState.answers[roomKey]?.blockConfirmation?.[blockKey];
    }

    function getRepairQuestConfirmedBlocks() {
      return repairQuestState.rooms.reduce((sum, room) => sum + getRepairQuestBlockKeys(room).filter(block => isRepairQuestBlockConfirmed(room.key, block)).length, 0);
    }

    function getRepairQuestTotalBlocks() {
      return repairQuestState.rooms.reduce((sum, room) => sum + getRepairQuestBlockKeys(room).length, 0);
    }

    function updateRepairQuestCounter(roomKey, field, delta, minValue = 0, maxValue = 25) {
      const answer = repairQuestState.answers[roomKey];
      if (!answer) return;
      let nextValue = (parseInt(answer[field], 10) || 0) + delta;
      nextValue = Math.max(minValue, Math.min(maxValue, nextValue));
      answer[field] = nextValue;
      synchronizeRepairQuestDerivedFields(roomKey);
      resetRepairQuestBlockConfirmation(roomKey, field);
      renderRepairQuest();
    }

    function setRepairQuestCounter(roomKey, field, value, minValue = 0, maxValue = 25) {
      const answer = repairQuestState.answers[roomKey];
      if (!answer) return;
      let nextValue = parseInt(value, 10);
      if (!Number.isFinite(nextValue)) nextValue = minValue;
      answer[field] = Math.max(minValue, Math.min(maxValue, nextValue));
      synchronizeRepairQuestDerivedFields(roomKey);
      resetRepairQuestBlockConfirmation(roomKey, field);
      renderRepairQuest();
    }

    function goRepairQuestStep(delta) {
      const maxStep = repairQuestState.rooms.length;
      repairQuestState.step = Math.max(0, Math.min(maxStep, repairQuestState.step + delta));
      renderRepairQuest();
    }

    function getRepairQuestStepCompletion(stepIndex = repairQuestState.step) {
      const meta = repairQuestState.rooms[stepIndex];
      if (!meta) return 1;
      const answer = repairQuestState.answers[meta.key];
      if (!answer) return 0;
      const blockKeys = getRepairQuestBlockKeys(meta);
      const confirmed = blockKeys.filter(blockKey => isRepairQuestBlockConfirmed(meta.key, blockKey)).length;
      return blockKeys.length ? confirmed / blockKeys.length : 1;
    }

    function getRepairQuestOverallProgress() {
      const totalBlocks = getRepairQuestTotalBlocks();
      if (!totalBlocks) return 0;
      return Math.min(1, getRepairQuestConfirmedBlocks() / totalBlocks);
    }

    function hasRepairQuestAnswerValue(value) {
      return Array.isArray(value) ? value.length > 0 : value !== '' && value !== null && value !== undefined;
    }

    function getRepairQuestDisplayedEquipmentFields(meta) {
      return getRepairQuestEquipmentConfigs(meta).map(config => config.field);
    }

    function getRepairQuestDisplayedSurfaceFields(answer) {
      return ['targetFloor', 'targetWall', 'targetCeiling', 'backsplash', 'ceilingDecor'];
    }

    function shouldShowRepairQuestRoughBlock(answer) {
      return ['rough_target', 'whitebox_target'].includes(answer?.targetResult);
    }

    function shouldShowRepairQuestFinishingBlock(answer) {
      return ['finish_target', 'turnkey_target'].includes(answer?.targetResult);
    }

    function getRepairQuestDisplayedRoughFields(meta, answer) {
      if (!shouldShowRepairQuestRoughBlock(answer)) return [];
      const fields = answer.targetResult === 'rough_target'
        ? ['roughFloorPlan', 'roughWallPlan', 'roughCeilingPlan']
        : ['whiteboxFloorPlan', 'whiteboxWallPlan', 'whiteboxCeilingPlan'];
      if (shouldShowRepairQuestWallReinforcement(meta, answer)) {
        fields.push('wallReinforcement');
      }
      return fields;
    }

    function getRepairQuestDisplayedExtraFields(meta, answer) {
      const fields = ['lightingScenario', 'plinthType', 'warmFloor', 'soundproofing'];
      if (isRepairQuestWetRoom(meta)) {
        fields.push('waterproofing', 'leakProtection');
      }
      if (['finish_target', 'turnkey_target'].includes(answer.targetResult)) {
        fields.push('ceilingAccent');
      }
      return fields;
    }

    function getRepairQuestDisplayedSmartFields(meta, answer) {
      const fields = ['smartHome'];
      if (answer?.smartHome !== 'no') {
        fields.push(...getRepairQuestSmartConfigs(meta).map(config => config.field));
      }
      return fields;
    }

    function getRepairQuestBlockRequiredFields(answer, blockKey, meta) {
      if (!answer) return [];
      const openings = getRepairQuestOpenings(meta.source);
      const map = {
        state: ['currentState'],
        demolition: ['replanningAction'],
        result: ['targetResult'],
        roughing: getRepairQuestDisplayedRoughFields(meta, answer),
        openings: [],
        engineering: ['electricalScope'],
        smart: getRepairQuestDisplayedSmartFields(meta, answer),
        equipment: getRepairQuestDisplayedEquipmentFields(meta),
        surfaces: getRepairQuestDisplayedSurfaceFields(answer),
        extras: getRepairQuestDisplayedExtraFields(meta, answer)
      };

      if (repairQuestState.mode === 'full' && answer.currentState === 'old_finish') {
        map.state.push('oldFinishScope');
      }
      if (answer.currentState === 'old_finish') {
        map.demolition.push('currentFloor', 'currentWall', 'currentCeiling');
      }
      if (repairQuestState.mode === 'full') {
        map.result.push('targetStage');
      }
      if (openings.door > 0) map.openings.push('doorsAction');
      if (openings.window > 0) map.openings.push('windowsAction');
      if (openings.balcony > 0 || canRepairQuestHaveBalconyOpening(meta)) map.openings.push('balconyAction');
      if (repairQuestState.mode === 'full' && map.openings.length && shouldRequireRepairQuestOpeningDetails(answer)) {
        map.openings.push('openingDetails');
      }

      if (isRepairQuestPlumbingRoom(meta)) map.engineering.push('plumbingScope');
      if (isRepairQuestHeatingRoom(meta)) map.engineering.push('heatingScope');
      if (isRepairQuestClimateRoom(meta)) map.engineering.push('climateScope');
      if (repairQuestState.mode === 'full' && answer.electricalScope !== 'no_touch') {
        map.engineering.push('singleSockets', 'doubleSockets', 'tripleSockets', 'childProtectedSockets', 'switches', 'lights', 'internetPoints');
        if (isRepairQuestMoistureSocketRoom(meta)) {
          map.engineering.push('moistureProofSockets');
        }
      }
      if (repairQuestState.mode === 'full' && isRepairQuestPlumbingRoom(meta) && answer.plumbingScope !== 'no_touch') {
        map.engineering.push('waterPoints', 'drainagePoints');
      }
      if (repairQuestState.mode === 'full' && isRepairQuestHeatingRoom(meta) && answer.heatingScope !== 'no_touch') {
        map.engineering.push('heatingDevices', 'heatingSystemType');
      }
      if (!isRepairQuestKitchenRoom(meta)) {
        map.surfaces = map.surfaces.filter(field => field !== 'backsplash');
      }
      if (['finish_target', 'turnkey_target'].includes(answer.targetResult)) {
        map.surfaces.push('curtainSolution');
      }
      if (shouldShowRepairQuestCeilingHatch(answer)) {
        map.surfaces.push('ceilingHatch');
      }

      if (blockKey === 'demolition' && !shouldShowRepairQuestDemolition(meta, answer)) return [];
      if (blockKey === 'roughing' && !shouldShowRepairQuestRoughBlock(answer)) return [];
      if (blockKey === 'openings' && !hasRepairQuestOpenings(meta)) return [];
      if (blockKey === 'surfaces' && !shouldShowRepairQuestFinishingBlock(answer)) return [];
      return map[blockKey] || [];
    }

    function isRepairQuestBlockReady(roomKey, blockKey) {
      const answer = repairQuestState.answers[roomKey];
      if (!answer) return false;
      return getRepairQuestBlockRequiredFields(answer, blockKey, repairQuestState.rooms.find(room => room.key === roomKey))
        .every(field => hasRepairQuestAnswerValue(answer[field]));
    }

    function getQuestOptionLabel(options, value) {
      return options.find(option => option.value === value)?.label || '';
    }

    function getRepairQuestBlockSummary(roomKey, blockKey) {
      const answer = repairQuestState.answers[roomKey];
      const meta = repairQuestState.rooms.find(room => room.key === roomKey);
      if (!answer || !meta) return '';

      if (blockKey === 'state') {
        return repairQuestCurrentStateLabels[answer.currentState] || '';
      }

      if (blockKey === 'demolition') {
        const floorCount = Array.isArray(answer.currentFloor) ? answer.currentFloor.length : 0;
        const wallCount = Array.isArray(answer.currentWall) ? answer.currentWall.length : 0;
        const ceilingCount = Array.isArray(answer.currentCeiling) ? answer.currentCeiling.length : 0;
        return [
          getQuestOptionLabel(repairQuestState.mode === 'full' ? repairQuestReplanningFullOptions : repairQuestReplanningApproxOptions, answer.replanningAction),
          answer.currentState === 'old_finish' ? `слои ${floorCount}/${wallCount}/${ceilingCount}` : ''
        ].filter(Boolean).join(' • ');
      }

      if (blockKey === 'result') {
        return getQuestOptionLabel(repairQuestTargetResultOptions, answer.targetResult);
      }

      if (blockKey === 'roughing') {
        if (answer.targetResult === 'rough_target') {
          return [
            getQuestOptionLabel(repairQuestRoughFloorOptions, answer.roughFloorPlan),
            getQuestOptionLabel(repairQuestRoughWallOptions, answer.roughWallPlan),
            getQuestOptionLabel(repairQuestRoughCeilingOptions, answer.roughCeilingPlan),
            answer.wallReinforcement === 'mesh' ? 'Армирование сеткой' : answer.wallReinforcement === 'additive' ? 'Армирующая добавка' : ''
          ].filter(Boolean).join(' • ');
        }
        if (answer.targetResult === 'whitebox_target') {
          return [
            getQuestOptionLabel(repairQuestWhiteboxFloorOptions, answer.whiteboxFloorPlan),
            getQuestOptionLabel(repairQuestWhiteboxWallOptions, answer.whiteboxWallPlan),
            getQuestOptionLabel(repairQuestWhiteboxCeilingOptions, answer.whiteboxCeilingPlan),
            answer.wallReinforcement === 'mesh' ? 'Армирование сеткой' : answer.wallReinforcement === 'additive' ? 'Армирующая добавка' : ''
          ].filter(Boolean).join(' • ');
        }
        return '';
      }

      if (blockKey === 'openings') {
        const parts = [];
        if (answer.doorsAction) parts.push(`Двери: ${getQuestOptionLabel(repairQuestState.mode === 'full' ? repairQuestDoorActionFullOptions : repairQuestDoorActionApproxOptions, answer.doorsAction)}`);
        if (answer.windowsAction) parts.push(`Окна: ${getQuestOptionLabel(repairQuestState.mode === 'full' ? repairQuestWindowActionFullOptions : repairQuestWindowActionApproxOptions, answer.windowsAction)}`);
        if (answer.balconyAction) parts.push(`Балкон: ${getQuestOptionLabel(getRepairQuestBalconyActionOptions(meta), answer.balconyAction)}`);
        return parts.join(' • ');
      }

      if (blockKey === 'engineering') {
        const parts = [
          getQuestOptionLabel(repairQuestElectricalScopeOptions, answer.electricalScope),
          isRepairQuestPlumbingRoom(meta) ? getQuestOptionLabel(repairQuestPlumbingScopeOptions, answer.plumbingScope) : '',
          isRepairQuestHeatingRoom(meta) ? getQuestOptionLabel(repairQuestHeatingScopeOptions, answer.heatingScope) : '',
          isRepairQuestClimateRoom(meta) ? getQuestOptionLabel(repairQuestClimateScopeOptions, answer.climateScope) : ''
        ].filter(Boolean);
          if (repairQuestState.mode === 'full') {
          parts.push(`розетки ${getRepairQuestTotalSockets(answer) || 0}`);
          if (isRepairQuestHeatingRoom(meta) && answer.heatingScope !== 'no_touch') {
            parts.push(getQuestOptionLabel(repairQuestHeatingTypeOptions, answer.heatingSystemType));
          }
          if (isRepairQuestPlumbingRoom(meta)) parts.push(`вода ${answer.waterPoints || 0}`);
        }
        return parts.join(' • ');
      }

      if (blockKey === 'smart') {
        const parts = [getQuestOptionLabel(repairQuestSmartHomeOptions, answer.smartHome)];
        const configMap = Object.fromEntries(getRepairQuestSmartConfigs(meta).map(config => [config.field, config.label]));
        getRepairQuestSmartConfigs(meta)
          .filter(config => answer[config.field] === 'yes')
          .slice(0, 3)
          .forEach(config => parts.push(configMap[config.field] || config.field));
        return parts.filter(Boolean).join(' • ');
      }

      if (blockKey === 'equipment') {
        const configMap = Object.fromEntries(getRepairQuestEquipmentConfigs(meta).map(config => [config.field, config.label]));
        return getRepairQuestDisplayedEquipmentFields(meta)
          .filter(field => {
            const value = answer[field];
            return value === 'yes' || (typeof value === 'string' && value !== 'no' && value !== 'none' && value !== 'standard') || (typeof value === 'number' && value > 0);
          })
          .slice(0, 3)
          .map(field => configMap[field] || field)
          .join(' • ');
      }

      if (blockKey === 'surfaces') {
        return [
          getRepairFinishingOption('floor', answer.targetFloor)?.label,
          getRepairFinishingOption('wall', answer.targetWall)?.label,
          getRepairFinishingOption('ceiling', answer.targetCeiling)?.label,
          getQuestOptionLabel(repairQuestCurtainOptions, answer.curtainSolution),
          answer.ceilingDecor === 'molding' ? 'Потолочный багет' : '',
          answer.ceilingHatch === 'yes' ? 'Ревизионный люк' : ''
        ].filter(Boolean).join(' • ');
      }

      if (blockKey === 'extras') {
        return [
          getQuestOptionLabel(repairQuestLightingOptions, answer.lightingScenario),
          answer.warmFloor === 'yes' ? 'Теплый пол' : '',
          answer.waterproofing === 'yes' ? 'Гидроизоляция' : '',
          answer.soundproofing === 'yes' ? 'Шумоизоляция' : ''
        ].filter(Boolean).join(' • ');
      }

      return '';
    }

    function getRepairQuestSceneState() {
      const scene = {
        targetWall: 'paint',
        targetFloor: 'engineered_board',
        targetCeiling: 'stretch_shadow',
        lightingScenario: 'basic',
        tileZones: 'none',
        wallAccent: 'none',
        plinthType: 'standard',
        smartHome: 'no',
        securityLevel: 'none',
        curtainSolution: 'none',
        changeWindow: 'no',
        changeDoor: 'no',
        warmFloor: 'no',
        internetTv: 'no',
        stateConfirmed: false,
        demolitionConfirmed: false,
        roughingConfirmed: false,
        surfacesConfirmed: false,
        engineeringConfirmed: false,
        smartConfirmed: false,
        extrasConfirmed: false
      };

      repairQuestState.rooms.forEach(room => {
        const answer = repairQuestState.answers[room.key];
        if (!answer) return;
        if (isRepairQuestBlockConfirmed(room.key, 'state')) scene.stateConfirmed = true;
        if (isRepairQuestBlockConfirmed(room.key, 'demolition')) scene.demolitionConfirmed = true;
        if (isRepairQuestBlockConfirmed(room.key, 'roughing')) scene.roughingConfirmed = true;
        if (isRepairQuestBlockConfirmed(room.key, 'surfaces')) {
          scene.surfacesConfirmed = true;
          scene.targetWall = answer.targetWall || scene.targetWall;
          scene.targetFloor = answer.targetFloor || scene.targetFloor;
          scene.targetCeiling = answer.targetCeiling || scene.targetCeiling;
        }
        if (isRepairQuestBlockConfirmed(room.key, 'engineering')) {
          scene.engineeringConfirmed = true;
          scene.securityLevel = answer.securityLevel || scene.securityLevel;
          scene.internetTv = answer.internetTv || scene.internetTv;
        }
        if (isRepairQuestBlockConfirmed(room.key, 'smart')) {
          scene.smartConfirmed = true;
          scene.smartHome = answer.smartHome || scene.smartHome;
        }
        if (isRepairQuestBlockConfirmed(room.key, 'extras')) {
          scene.extrasConfirmed = true;
          scene.lightingScenario = answer.lightingScenario || scene.lightingScenario;
          scene.tileZones = answer.tileZones || scene.tileZones;
          scene.wallAccent = answer.wallAccent || scene.wallAccent;
          scene.plinthType = answer.plinthType || scene.plinthType;
          scene.curtainSolution = answer.curtainSolution || scene.curtainSolution;
          scene.changeWindow = answer.changeWindow || scene.changeWindow;
          scene.changeDoor = answer.changeDoor || scene.changeDoor;
          scene.warmFloor = answer.warmFloor || scene.warmFloor;
        }
      });

      return scene;
    }

    function renderRepairQuestScene(progress, currentRoom) {
      const stageCount = 10;
      const activeStage = Math.max(0, Math.min(stageCount, Math.ceil(progress * stageCount)));
      
      // Выбираем финальное фото на основе стиля дизайна
      const designStyle = currentRoom?.source?.repairData?.designStyle || 'other';
      const villaImageMap = {
        'modern_minimalism': 'Villa_modern_min.jpg',
        'modern_classic': 'Villa_modern_classic.webp',
        'classic': 'Villa_classic.jpg',
        'scandinavian': 'Villa_Scandinavian.png',
        'modern': 'Villa_modern.webp',
        'art_deco': 'Villa_Art-deko.jpg',
        'japanese': 'Villa_Japan.jpg',
        'chinese': 'Villa_China.webp'
      };
      const villaImageName = villaImageMap[designStyle] || 'Villa_other.webp';
      const finalPhotoUrl = `images/${villaImageName}`;

      const puzzlePieces = [
        { id: 1, icon: '🏗️', label: 'Фундамент', color: '#111827' },
        { id: 2, icon: '🧱', label: 'Стены', color: '#1f2937' },
        { id: 3, icon: '🪟', label: 'Окна', color: '#334155' },
        { id: 4, icon: '🚪', label: 'Двери', color: '#4338ca' },
        { id: 5, icon: '🏠', label: 'Крыша', color: '#2563eb' },
        { id: 6, icon: '💡', label: 'Освещение', color: '#2563eb' },
        { id: 7, icon: '🔌', label: 'Розетки', color: '#1d4ed8' },
        { id: 8, icon: '🏡', label: 'Умный дом', color: '#10b981' },
        { id: 9, icon: '🛡️', label: 'Безопасность', color: '#7c3aed' },
        { id: 10, icon: '✅', label: 'Готово!', color: '#0f172a' }
      ];

      const confettiHtml = activeStage === stageCount
        ? Array.from({ length: 20 }, (_, index) => {
            const left = Math.round(Math.random() * 90);
            const size = 6 + Math.round(Math.random() * 8);
            const delay = (Math.random() * 0.8).toFixed(2);
            const colors = ['#f59e0b', '#fb7185', '#38bdf8', '#34d399', '#8b5cf6', '#f97316'];
            return `<span class="confetti" style="left:${left}%; width:${size}px; height:${size}px; background:${colors[index % colors.length]}; animation-delay:${delay}s"></span>`;
          }).join('')
        : '';

      return `
        <div class="puzzle-container">
          <div class="confetti-layer">${confettiHtml}</div>
          <div class="puzzle-grid">
            ${puzzlePieces.map(piece => {
              let pieceClass = '';
              if (piece.id === activeStage) {
                pieceClass = 'active';
              } else if (piece.id < activeStage) {
                pieceClass = 'completed';
              }
              return `
              <div class="puzzle-piece ${pieceClass}">
                <div class="puzzle-icon">${piece.icon}</div>
                <div class="puzzle-label">${piece.label}</div>
              </div>
            `;
            }).join('')}
          </div>
          <div class="puzzle-status">
            ${activeStage === stageCount ? '🎉 Пазл собран! Ваш проект готов!' : `Собираем пазл: ${activeStage}/${stageCount} шагов`}
          </div>
          ${activeStage === stageCount ? `
            <div class="puzzle-final">
              <img class="puzzle-final-image" src="${finalPhotoUrl}" alt="Премиальный особняк" loading="lazy">
              <div class="puzzle-final-copy">
                <div>
                  <h3>Вы справились! Запускаем расчет сметы!</h3>
                  <p>Все этапы проекта собраны. Теперь мы подготовим точную смету для вашего премиального ремонта.</p>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }

    function renderRepairQuestRoomList() {
      const container = document.getElementById('repairQuestRoomList');
      if (!container) return;

      container.innerHTML = repairQuestState.rooms.map((room, index) => {
        const isCurrent = index === repairQuestState.step;
        const totalBlocks = getRepairQuestBlockKeys(room).length;
        const confirmedBlocks = getRepairQuestBlockKeys(room).filter(blockKey => isRepairQuestBlockConfirmed(room.key, blockKey)).length;
        const isCompleted = totalBlocks > 0 && confirmedBlocks === totalBlocks;
        const badge = isCompleted ? '<i class="fas fa-check text-green-500"></i>' : isCurrent ? '<i class="fas fa-hammer text-brand-500"></i>' : `<span class="text-xs text-gray-400">${confirmedBlocks}/${totalBlocks}</span>`;
        return `
          <div class="quest-room-chip ${isCurrent ? 'ring-2 ring-brand-300 dark:ring-brand-700' : ''}">
            <span>${room.title}<span class="block text-xs text-gray-400 mt-1">Подтверждено блоков: ${confirmedBlocks}/${totalBlocks}</span></span>
            <span>${badge}</span>
          </div>`;
      }).join('');
    }

    function renderQuestChoiceButtons(roomKey, field, choices) {
      const current = repairQuestState.answers[roomKey]?.[field] || '';
      return `
        <div class="quest-choice-grid">
          ${choices.map(choice => `
            <button type="button" class="quest-choice ${current === choice.value ? 'is-selected' : ''}" onclick="updateRepairQuestAnswer('${roomKey}', '${field}', '${choice.value}')">
              <div class="font-semibold text-sm">${choice.label}</div>
              ${choice.hint ? `<div class="text-xs text-gray-500 mt-1">${choice.hint}</div>` : ''}
            </button>
          `).join('')}
        </div>
      `;
    }

    function renderQuestMultiChoiceButtons(roomKey, field, choices, hintText = '') {
      const current = Array.isArray(repairQuestState.answers[roomKey]?.[field]) ? repairQuestState.answers[roomKey][field] : [];
      return `
        ${hintText ? `<div class="text-xs text-gray-500 mb-2">${hintText}</div>` : ''}
        <div class="quest-choice-grid">
          ${choices.map(choice => `
            <button type="button" class="quest-choice ${current.includes(choice.value) ? 'is-selected' : ''}" onclick="toggleRepairQuestMultiAnswer('${roomKey}', '${field}', '${choice.value}')">
              <div class="font-semibold text-sm">${choice.label}</div>
              ${choice.hint ? `<div class="text-xs text-gray-500 mt-1">${choice.hint}</div>` : ''}
            </button>
          `).join('')}
        </div>
      `;
    }

    function renderQuestToggle(roomKey, field, selectedValue) {
      const current = repairQuestState.answers[roomKey]?.[field] || selectedValue || 'no';
      return `
        <div class="quest-toggle-row">
          <button type="button" class="quest-toggle-pill ${current === 'yes' ? 'is-selected' : ''}" onclick="updateRepairQuestAnswer('${roomKey}', '${field}', 'yes')">Да</button>
          <button type="button" class="quest-toggle-pill ${current === 'no' ? 'is-selected' : ''}" onclick="updateRepairQuestAnswer('${roomKey}', '${field}', 'no')">Нет</button>
        </div>
      `;
    }

    function renderQuestCounter(roomKey, field, label, minValue = 0, maxValue = 25) {
      const value = parseInt(repairQuestState.answers[roomKey]?.[field], 10) || 0;
      return `
        <div class="rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
          <div class="text-sm font-medium mb-2">${label}</div>
          <div class="quest-stepper">
            <button type="button" onclick="updateRepairQuestCounter('${roomKey}', '${field}', -1, ${minValue}, ${maxValue})">−</button>
            <input type="number" value="${value}" min="${minValue}" max="${maxValue}" oninput="setRepairQuestCounter('${roomKey}', '${field}', this.value, ${minValue}, ${maxValue})">
            <button type="button" onclick="updateRepairQuestCounter('${roomKey}', '${field}', 1, ${minValue}, ${maxValue})">+</button>
          </div>
        </div>
      `;
    }

    function renderRepairQuestBlock(roomKey, blockKey, title, content, helperText = '') {
      const confirmed = isRepairQuestBlockConfirmed(roomKey, blockKey);
      const ready = isRepairQuestBlockReady(roomKey, blockKey);
      const summary = getRepairQuestBlockSummary(roomKey, blockKey);
      return `
        <div class="quest-block ${confirmed ? 'is-confirmed' : ''}">
          <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
            <div>
              <div class="text-sm font-semibold">${title}</div>
              ${helperText ? `<div class="text-xs text-gray-500 mt-1">${helperText}</div>` : ''}
              ${summary ? `<div class="text-xs text-slate-600 mt-2 font-medium">Выбрано: ${summary}</div>` : ''}
            </div>
            <div class="inline-flex items-center gap-2 text-xs ${confirmed ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}">
              <i class="fas ${confirmed ? 'fa-circle-check' : 'fa-circle'}"></i>
              <span>${confirmed ? 'Выбор подтвержден' : 'Ожидает подтверждения'}</span>
            </div>
          </div>
          ${content}
          <div class="quest-block-actions">
            <button type="button" class="quest-confirm-btn ${confirmed ? 'is-confirmed' : ''}" onclick="confirmRepairQuestBlock('${roomKey}', '${blockKey}')" ${ready ? '' : 'disabled'}>
              ${confirmed ? 'Подтверждено' : 'Подтвердить выбор'}
            </button>
            <span class="text-xs text-gray-500">${ready ? 'После подтверждения эта часть виллы будет достроена.' : 'Сначала выберите ответы внутри блока.'}</span>
          </div>
        </div>
      `;
    }

    function renderRepairQuestConfiguredField(roomKey, config) {
      const options = repairQuestState.mode === 'full' && Array.isArray(config.options_full)
        ? config.options_full
        : repairQuestState.mode === 'approx' && Array.isArray(config.options_approx)
          ? config.options_approx
          : config.options;
      const helper = config.helper ? `<div class="text-xs text-gray-500 mb-2">${config.helper}</div>` : '';
      if (config.type === 'toggle') {
        return `
          <div>
            <div class="text-sm font-medium mb-2">${config.label}</div>
            ${helper}
            ${renderQuestToggle(roomKey, config.field, repairQuestState.answers[roomKey]?.[config.field])}
          </div>
        `;
      }
      if (config.type === 'counter') {
        return renderQuestCounter(roomKey, config.field, config.label, config.min || 0, config.max || 25);
      }
      return `
        <div>
          <div class="text-sm font-medium mb-2">${config.label}</div>
          ${helper}
          ${renderQuestChoiceButtons(roomKey, config.field, options || [])}
        </div>
      `;
    }

    function renderRepairQuestDemolitionContent(meta, answer) {
      const currentFloorChoices = repairQuestCurrentFinishOptions.floor;
      const currentWallChoices = repairQuestCurrentFinishOptions.wall;
      const currentCeilingChoices = repairQuestCurrentFinishOptions.ceiling;
      const replanningOptions = repairQuestState.mode === 'full' ? repairQuestReplanningFullOptions : repairQuestReplanningApproxOptions;
      return `
        <div class="space-y-4">
          <div>
            <div class="text-sm font-medium mb-2">Нужна перепланировка?</div>
            ${renderQuestChoiceButtons(meta.key, 'replanningAction', replanningOptions)}
          </div>
          ${answer.currentState === 'old_finish' ? `
            <div>
              <div class="text-sm font-medium mb-2">Пол</div>
              ${renderQuestMultiChoiceButtons(meta.key, 'currentFloor', currentFloorChoices, 'Можно отметить несколько слоев.')}
            </div>
            <div>
              <div class="text-sm font-medium mb-2">Стены</div>
              ${renderQuestMultiChoiceButtons(meta.key, 'currentWall', currentWallChoices, 'Если слоев несколько, отметьте все.')}
            </div>
            <div>
              <div class="text-sm font-medium mb-2">Потолок</div>
              ${renderQuestMultiChoiceButtons(meta.key, 'currentCeiling', currentCeilingChoices, 'Отметьте все конструкции, которые предстоит снять.')}
            </div>
          ` : `
            <div class="text-sm text-gray-500">Если перепланировка не нужна и старой отделки нет, этот блок можно просто подтвердить.</div>
          `}
        </div>
      `;
    }

    function renderRepairQuestOpeningsContent(meta, answer) {
      const openings = getRepairQuestOpenings(meta.source);
      const isApprox = repairQuestState.mode === 'approx';
      return `
        <div class="space-y-4">
          <div class="rounded-2xl border border-slate-200 dark:border-slate-700 p-3 text-sm text-gray-500">
            Уже указано: дверей ${openings.door}, окон ${openings.window}, балконных блоков ${openings.balcony}.
          </div>
          ${openings.door > 0 ? `
            <div>
              <div class="text-sm font-medium mb-2">Что делаем с дверями?</div>
              ${renderQuestChoiceButtons(meta.key, 'doorsAction', isApprox ? repairQuestDoorActionApproxOptions : repairQuestDoorActionFullOptions)}
            </div>
          ` : ''}
          ${openings.window > 0 ? `
            <div>
              <div class="text-sm font-medium mb-2">Что делаем с окнами?</div>
              ${renderQuestChoiceButtons(meta.key, 'windowsAction', isApprox ? repairQuestWindowActionApproxOptions : repairQuestWindowActionFullOptions)}
            </div>
          ` : ''}
          ${(openings.balcony > 0 || canRepairQuestHaveBalconyOpening(meta)) ? `
            <div>
              <div class="text-sm font-medium mb-2">Что делаем с балконной дверью / блоком?</div>
              ${renderQuestChoiceButtons(meta.key, 'balconyAction', getRepairQuestBalconyActionOptions(meta))}
            </div>
          ` : ''}
          ${!isApprox ? `
            <div>
              <div class="text-sm font-medium mb-2">Уточнения по проемам</div>
              ${renderQuestMultiChoiceButtons(meta.key, 'openingDetails', [
                { value: 'need_old_demo', label: 'Нужен демонтаж старого' },
                { value: 'need_slopes', label: 'Нужны откосы / подоконник' },
                { value: 'need_architraves', label: 'Нужны доборы / наличники' },
                { value: 'opening_size_changes', label: 'Меняется сам проем' }
              ])}
            </div>
          ` : ''}
        </div>
      `;
    }

    function renderRepairQuestEngineeringContent(meta, answer) {
      const showPlumbing = isRepairQuestPlumbingRoom(meta);
      const showHeating = isRepairQuestHeatingRoom(meta);
      const showClimate = isRepairQuestClimateRoom(meta);
      return `
        <div class="space-y-4">
          <div class="space-y-4">
            ${renderRepairQuestConfiguredField(meta.key, { field: 'electricalScope', label: 'Что делаем с электрикой?', type: 'choice', options: repairQuestElectricalScopeOptions })}
            ${showPlumbing ? renderRepairQuestConfiguredField(meta.key, { field: 'plumbingScope', label: 'Что делаем с сантехникой?', type: 'choice', options: repairQuestPlumbingScopeOptions }) : ''}
            ${showHeating ? renderRepairQuestConfiguredField(meta.key, { field: 'heatingScope', label: 'Что делаем с отоплением?', type: 'choice', options: repairQuestHeatingScopeOptions }) : ''}
            ${showClimate ? renderRepairQuestConfiguredField(meta.key, { field: 'climateScope', label: 'Что делаем с климатом / вентиляцией?', type: 'choice', options: repairQuestClimateScopeOptions }) : ''}
          </div>
          ${repairQuestState.mode === 'full' ? `
            <div class="quest-info-grid">
              ${answer.electricalScope !== 'no_touch' ? renderQuestCounter(meta.key, 'singleSockets', 'Одинарные розетки', 0, 30) : ''}
              ${answer.electricalScope !== 'no_touch' ? renderQuestCounter(meta.key, 'doubleSockets', 'Двойные розетки', 0, 20) : ''}
              ${answer.electricalScope !== 'no_touch' ? renderQuestCounter(meta.key, 'tripleSockets', 'Тройные розетки', 0, 12) : ''}
              ${answer.electricalScope !== 'no_touch' ? renderQuestCounter(meta.key, 'childProtectedSockets', 'Розетки с защитой от детей', 0, 30) : ''}
              ${answer.electricalScope !== 'no_touch' && isRepairQuestMoistureSocketRoom(meta) ? renderQuestCounter(meta.key, 'moistureProofSockets', 'Влагозащищенные розетки', 0, 20) : ''}
              ${answer.electricalScope !== 'no_touch' ? renderQuestCounter(meta.key, 'switches', 'Выключатели', 0, 25) : ''}
              ${answer.electricalScope !== 'no_touch' ? renderQuestCounter(meta.key, 'lights', 'Светильники', 0, 40) : ''}
              ${answer.electricalScope !== 'no_touch' ? renderQuestCounter(meta.key, 'internetPoints', 'Интернет / ТВ точки', 0, 16) : ''}
              ${showPlumbing && answer.plumbingScope !== 'no_touch' ? renderQuestCounter(meta.key, 'waterPoints', 'Водоточки', 0, 20) : ''}
              ${showPlumbing && answer.plumbingScope !== 'no_touch' ? renderQuestCounter(meta.key, 'drainagePoints', 'Канализационные точки', 0, 20) : ''}
              ${showHeating && answer.heatingScope !== 'no_touch' ? renderQuestCounter(meta.key, 'heatingDevices', 'Радиаторы / приборы', 0, 12) : ''}
            </div>
          ` : ''}
          ${repairQuestState.mode === 'full' && showHeating && answer.heatingScope !== 'no_touch' ? `
            <div>
              <div class="text-sm font-medium mb-2">Какой тип отопления нужен?</div>
              ${renderQuestChoiceButtons(meta.key, 'heatingSystemType', repairQuestHeatingTypeOptions)}
            </div>
          ` : ''}
          <div class="quest-info-grid">
            ${renderRepairQuestConfiguredField(meta.key, { field: 'internetTv', label: 'Нужен интернет / ТВ?', type: 'toggle' })}
            ${isRepairQuestWetRoom(meta) ? renderRepairQuestConfiguredField(meta.key, { field: 'leakProtection', label: 'Защита от протечек', type: 'toggle' }) : ''}
          </div>
        </div>
      `;
    }

    function renderRepairQuestSmartContent(meta, answer) {
      const configs = getRepairQuestSmartConfigs(meta);
      return `
        <div class="space-y-4">
          ${renderRepairQuestConfiguredField(meta.key, { field: 'smartHome', label: 'Уровень умного дома', type: 'choice', options: repairQuestSmartHomeOptions })}
          ${answer.smartHome !== 'no' && configs.length ? `
            <div class="quest-info-grid">
              ${configs.map(config => renderRepairQuestConfiguredField(meta.key, config)).join('')}
            </div>
          ` : `
            <div class="text-sm text-gray-500">Если автоматизация не нужна, этот блок можно сразу подтвердить.</div>
          `}
        </div>
      `;
    }

    function renderRepairQuestEquipmentContent(meta) {
      const configs = getRepairQuestEquipmentConfigs(meta);
      return `
        <div class="quest-info-grid">
          ${configs.map(config => renderRepairQuestConfiguredField(meta.key, config)).join('')}
        </div>
      `;
    }

    function renderRepairQuestRoughContent(meta, answer) {
      if (!shouldShowRepairQuestRoughBlock(answer)) return '';

      const isWhitebox = answer.targetResult === 'whitebox_target';
      const floorField = isWhitebox ? 'whiteboxFloorPlan' : 'roughFloorPlan';
      const wallField = isWhitebox ? 'whiteboxWallPlan' : 'roughWallPlan';
      const ceilingField = isWhitebox ? 'whiteboxCeilingPlan' : 'roughCeilingPlan';
      const floorOptions = isWhitebox ? repairQuestWhiteboxFloorOptions : repairQuestRoughFloorOptions;
      const wallOptions = isWhitebox ? repairQuestWhiteboxWallOptions : repairQuestRoughWallOptions;
      const ceilingOptions = isWhitebox ? repairQuestWhiteboxCeilingOptions : repairQuestRoughCeilingOptions;

      return `
        <div class="space-y-4">
          <div>
            <div class="text-sm font-medium mb-2">Пол</div>
            ${renderQuestChoiceButtons(meta.key, floorField, floorOptions)}
          </div>
          <div class="space-y-4">
            <div>
              <div class="text-sm font-medium mb-2">Стены</div>
              ${renderQuestChoiceButtons(meta.key, wallField, wallOptions)}
            </div>
            ${shouldShowRepairQuestWallReinforcement(meta, answer) ? renderRepairQuestConfiguredField(meta.key, {
              field: 'wallReinforcement',
              label: 'Нужно ли армирование штукатурки стен?',
              type: 'choice',
              options: repairQuestWallReinforcementOptions,
              helper: 'Обычно учитывается для стен с риском трещин, новых зон, толстого слоя штукатурки и при подготовке стен под покраску.'
            }) : ''}
          </div>
          <div>
            <div class="text-sm font-medium mb-2">Потолок</div>
            ${renderQuestChoiceButtons(meta.key, ceilingField, ceilingOptions)}
          </div>
        </div>
      `;
    }

    function renderRepairQuestSurfacesContent(meta, answer) {
      const isBathroom = isRepairQuestBathroomRoom(meta);
      const isKitchen = isRepairQuestKitchenRoom(meta);
      const floorChoices = repairFinishingOptions.floor
        .filter(option => isBathroom || isKitchen
          ? ['quartz_vinyl', 'ceramic_tile', 'porcelain_tile', 'laminate'].includes(option.value)
          : ['laminate', 'quartz_vinyl', 'engineered_board', 'parquet_board', 'linoleum', 'ceramic_tile', 'porcelain_tile'].includes(option.value)
        )
        .map(option => ({ value: option.value, label: option.label }));
      const wallChoices = repairFinishingOptions.wall
        .filter(option => isBathroom || isKitchen
          ? ['ceramic_tile_wall', 'porcelain_tile_wall', 'paint'].includes(option.value)
          : ['wallpaper', 'paint', 'decorative_plaster', 'ceramic_tile_wall', 'porcelain_tile_wall', 'mdf_panels'].includes(option.value)
        )
        .map(option => ({ value: option.value, label: option.label }));
      const ceilingChoices = repairFinishingOptions.ceiling
        .filter(option => ['stretch_ceiling', 'stretch_shadow', 'gypsum_ceiling', 'ceiling_paint', 'suspended_ceiling'].includes(option.value))
        .map(option => ({ value: option.value, label: option.label }));

      return `
        <div class="space-y-4">
          <div>
            <div class="text-sm font-medium mb-2">Напольное покрытие</div>
            ${renderQuestChoiceButtons(meta.key, 'targetFloor', floorChoices)}
          </div>
          <div>
            <div class="text-sm font-medium mb-2">Отделка стен</div>
            ${renderQuestChoiceButtons(meta.key, 'targetWall', wallChoices)}
          </div>
          <div>
            <div class="text-sm font-medium mb-2">Потолок</div>
            ${renderQuestChoiceButtons(meta.key, 'targetCeiling', ceilingChoices)}
          </div>
          <div class="quest-info-grid">
            ${isBathroom ? renderRepairQuestConfiguredField(meta.key, { field: 'tileZones', label: 'Плитка', type: 'choice', options: repairQuestTileZoneOptions }) : isKitchen ? renderRepairQuestConfiguredField(meta.key, { field: 'backsplash', label: 'Фартук и рабочая зона', type: 'choice', options: [
              { value: 'full', label: 'Полный фартук', hint: 'Более насыщенный и защищенный вариант.' },
              { value: 'accent', label: 'Акцентная зона', hint: 'Фартук только на основной рабочей зоне.' },
              { value: 'none', label: 'Без фартука', hint: 'Фартук не закладываем.' }
            ]}) : renderRepairQuestConfiguredField(meta.key, { field: 'wallDecor', label: 'Декор стен', type: 'choice', options: repairQuestWallDecorOptions })}
            ${renderRepairQuestConfiguredField(meta.key, { field: 'wallAccent', label: 'Акценты на стенах', type: 'choice', options: repairQuestWallAccentOptions })}
            ${renderRepairQuestConfiguredField(meta.key, { field: 'curtainSolution', label: 'Карниз или ниша', type: 'choice', options: repairQuestCurtainOptions })}
            ${renderRepairQuestConfiguredField(meta.key, { field: 'ceilingDecor', label: 'Декор потолка', type: 'choice', options: repairQuestCeilingDecorOptions })}
            ${shouldShowRepairQuestCeilingHatch(answer) ? renderRepairQuestConfiguredField(meta.key, { field: 'ceilingHatch', label: 'Нужен ревизионный люк?', type: 'toggle' }) : ''}
          </div>
        </div>
      `;
    }

    function renderRepairQuestExtrasContent(meta) {
      return `
        <div class="quest-info-grid">
          ${renderRepairQuestConfiguredField(meta.key, { field: 'lightingScenario', label: 'Сценарий света', type: 'choice', options: repairQuestLightingOptions })}
          ${renderRepairQuestConfiguredField(meta.key, { field: 'plinthType', label: 'Тип плинтуса', type: 'choice', options: repairQuestPlinthOptions })}
          ${renderRepairQuestConfiguredField(meta.key, { field: 'warmFloor', label: 'Теплый пол', type: 'toggle' })}
          ${isRepairQuestWetRoom(meta) ? renderRepairQuestConfiguredField(meta.key, { field: 'waterproofing', label: 'Гидроизоляция', type: 'toggle' }) : ''}
          ${renderRepairQuestConfiguredField(meta.key, { field: 'soundproofing', label: 'Шумоизоляция', type: 'toggle' })}
          ${renderRepairQuestConfiguredField(meta.key, { field: 'ceilingAccent', label: 'Подсветка / акцент потолка', type: 'toggle' })}
        </div>
      `;
    }

    function renderRepairQuestRoomStep(meta) {
      const answer = repairQuestState.answers[meta.key];
      const roomTypeLabel = meta.source?.roomType || meta.title;
      const roomCategory = getRepairQuestRoomCategory(meta);
      const requiredBlocks = getRepairQuestBlockKeys(meta);
      const canProceed = requiredBlocks.every(blockKey => isRepairQuestBlockConfirmed(meta.key, blockKey));

      return `
        <div class="space-y-5">
          <div>
            <div class="text-sm uppercase tracking-[0.2em] text-brand-500 font-semibold">Комната ${repairQuestState.step + 1}</div>
            <h4 class="text-2xl font-bold mt-2">${roomTypeLabel}</h4>
            <div class="text-sm text-slate-500 mt-2">${roomCategory}</div>
            <p class="text-sm text-gray-500 mt-3">Площадь пола: ${Number(meta.source?.area || 0).toFixed(2)} м², площадь стен: ${Number(meta.source?.wallsArea || calculateLivingRoomWallsArea(meta.source) || 0).toFixed(2)} м².</p>
          </div>

          ${renderRepairQuestBlock(
            meta.key,
            'state',
            'Исходное состояние',
            `
              ${renderQuestChoiceButtons(meta.key, 'currentState', [
                { value: 'concrete_with_walls', label: 'Без отделки', hint: 'Есть перегородки, но отделки еще нет.' },
                { value: 'concrete_no_walls', label: 'Без отделки без перегородок', hint: 'Нужно заложить больше черновых работ.' },
                { value: 'rough_finish', label: 'Черновая', hint: 'Часть черновых работ уже сделана.' },
                { value: 'whitebox', label: 'White-box', hint: 'Основания подготовлены под чистовую отделку.' },
                { value: 'old_finish', label: 'Есть старая отделка', hint: 'Нужно понять, что демонтируем.' }
              ])}
              ${repairQuestState.mode === 'full' && answer.currentState === 'old_finish' ? `
                <div class="mt-4">
                  <div class="text-sm font-medium mb-2">Старая отделка по всей комнате или местами?</div>
                  ${renderQuestChoiceButtons(meta.key, 'oldFinishScope', [
                    { value: 'all_room', label: 'По всей комнате', hint: 'Считаем демонтаж почти по всей площади.' },
                    { value: 'local', label: 'Только местами', hint: 'Старые слои есть только на части помещения.' }
                  ])}
                </div>
              ` : ''}
            `,
            'Сначала задайте стартовую точку. От этого зависит весь маршрут расчета.'
          )}

          ${shouldShowRepairQuestDemolition(meta, answer) ? renderRepairQuestBlock(
            meta.key,
            'demolition',
            'Демонтаж и перепланировка',
            renderRepairQuestDemolitionContent(meta, answer),
            'Показываем этот блок, если нужна перепланировка, есть старая отделка или меняются проемы с демонтажем.'
          ) : ''}

          ${renderRepairQuestBlock(
            meta.key,
            'result',
            'Что нужно получить',
            `
              ${renderQuestChoiceButtons(meta.key, 'targetResult', repairQuestTargetResultOptions)}
              ${repairQuestState.mode === 'full' ? `
                <div class="mt-4">
                  <div class="text-sm font-medium mb-2">Это конечный результат или промежуточный этап?</div>
                  ${renderQuestChoiceButtons(meta.key, 'targetStage', [
                    { value: 'final', label: 'Окончательный результат', hint: 'Комната должна быть полностью доведена до выбранного состояния.' },
                    { value: 'intermediate', label: 'Промежуточный этап', hint: 'Это один из этапов, а не финальный финиш комнаты.' }
                  ])}
                </div>
              ` : ''}
            `,
            'Этот блок определяет, какие работы по поверхностям и отделке мы покажем дальше.'
          )}

          ${shouldShowRepairQuestRoughBlock(answer) ? renderRepairQuestBlock(
            meta.key,
            'roughing',
            'Черновая отделка',
            renderRepairQuestRoughContent(meta, answer),
            'Собираем решения по полу, стенам и потолку для черновой подготовки этой комнаты.'
          ) : ''}

          ${hasRepairQuestOpenings(meta) ? renderRepairQuestBlock(
            meta.key,
            'openings',
            'Проемы: двери и окна',
            renderRepairQuestOpeningsContent(meta, answer),
            'Показываем уже известные размеры и спрашиваем только, что нужно с ними сделать.'
          ) : ''}

          ${renderRepairQuestBlock(
            meta.key,
            'engineering',
            'Инженерные системы',
            renderRepairQuestEngineeringContent(meta, answer),
            'Здесь мы собираем основу для электрики, сантехники, отопления и климата.'
          )}

          ${renderRepairQuestBlock(
            meta.key,
            'smart',
            'Умный дом',
            renderRepairQuestSmartContent(meta, answer),
            repairQuestState.mode === 'full'
              ? 'Собираем сценарии автоматики отдельно, чтобы они не терялись среди обычной электрики.'
              : 'На этом шаге понимаем, нужна ли подготовка или базовые сценарии умного дома.'
          )}

          ${renderRepairQuestBlock(
            meta.key,
            'equipment',
            'Оснащение помещения',
            renderRepairQuestEquipmentContent(meta),
            'Здесь собираем оборудование и сценарий использования именно этого типа помещения.'
          )}

          ${shouldShowRepairQuestFinishingBlock(answer) ? renderRepairQuestBlock(
            meta.key,
            'surfaces',
            'Чистовая отделка',
            renderRepairQuestSurfacesContent(meta, answer),
            'Выбираем финишные решения по полу, стенам и потолку с учетом типа комнаты.'
          ) : ''}

          ${renderRepairQuestBlock(
            meta.key,
            'extras',
            'Дополнительные решения',
            renderRepairQuestExtrasContent(meta),
            'Собираем теплый пол, защиту, шумоизоляцию и другие дополнительные решения.'
          )}

          <div class="flex flex-col sm:flex-row gap-3 pt-1">
            <button type="button" class="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-medium" onclick="goRepairQuestStep(-1)" ${repairQuestState.step === 0 ? 'disabled' : ''}>Назад</button>
            <button type="button" class="px-5 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-orange-500 text-white font-semibold shadow-lg ${canProceed ? '' : 'opacity-60'}" onclick="goRepairQuestStep(1)" ${canProceed ? '' : 'disabled'}>
              ${repairQuestState.step === repairQuestState.rooms.length - 1 ? 'Подтвердить данные' : 'Следующий вопрос'}
            </button>
          </div>
        </div>
      `;
    }

    function renderRepairQuestSummary() {
      const isFullyConfirmed = repairQuestState.rooms.every(room => {
        const blockKeys = getRepairQuestBlockKeys(room);
        return blockKeys.length > 0 && blockKeys.every(blockKey => isRepairQuestBlockConfirmed(room.key, blockKey));
      });
      const previewAudit = buildRepairQuestAudit();
      return `
        <div class="space-y-5">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Проверка и подтверждение</div>
            <h4 class="text-2xl font-bold mt-3">Все комнаты собраны, можно запускать расчет</h4>
            <p class="text-sm text-gray-500 mt-2">Перед выполнением расчета проверьте краткую сводку и замечания, если они появились.</p>
          </div>
          <div class="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            ${repairQuestState.rooms.map(room => {
              const answer = repairQuestState.answers[room.key];
              return `
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                  <div class="font-medium">${room.title}</div>
                  <div class="text-sm text-gray-500">${repairQuestCurrentStateLabels[answer.currentState] || 'Не указано'} → ${getQuestOptionLabel(repairQuestTargetResultOptions, answer.targetResult) || ''}</div>
                </div>
              `;
            }).join('')}
          </div>
          ${previewAudit.issueCount ? `
            <div class="rounded-2xl border border-amber-300/40 bg-amber-50/80 dark:bg-amber-500/10 p-4">
              <div class="font-semibold text-sm mb-2">Проверьте перед расчетом</div>
              <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                ${previewAudit.issues.slice(0, 6).map(issue => `<div>• ${issue}</div>`).join('')}
              </div>
            </div>
          ` : ''}
          <div class="flex flex-col sm:flex-row gap-3">
            <button type="button" class="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-medium" onclick="goRepairQuestStep(-1)">Назад</button>
            <button type="button" class="px-5 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold shadow-lg ${isFullyConfirmed ? '' : 'opacity-50 cursor-not-allowed'}" onclick="applyRepairQuestResults()" ${isFullyConfirmed ? '' : 'disabled'}>Выполнить расчет</button>
          </div>
        </div>
      `;
    }

    function renderRepairQuest() {
      if (!repairQuestState.active) return;

      const content = document.getElementById('repairQuestContent');
      const progressBar = document.getElementById('repairQuestProgressBar');
      const progressText = document.getElementById('repairQuestProgressText');
      const progressPercent = document.getElementById('repairQuestProgressPercent');
      const scene = document.getElementById('repairQuestScene');
      const modeBadge = document.getElementById('repairQuestModeBadge');
      const lead = document.getElementById('repairQuestLead');
      const roomTypeLabel = document.getElementById('repairQuestRoomTypeLabel');

      const currentRoom = repairQuestState.step >= repairQuestState.rooms.length 
        ? repairQuestState.rooms[repairQuestState.rooms.length - 1] || {}
        : repairQuestState.rooms[repairQuestState.step] || {};
      const totalSteps = repairQuestState.rooms.length + 1;
      const currentStepLabel = Math.min(repairQuestState.step + 1, totalSteps);
      const progress = getRepairQuestOverallProgress();
      const confirmedBlocks = getRepairQuestConfirmedBlocks();
      const totalBlocks = getRepairQuestTotalBlocks();

      if (modeBadge) {
        modeBadge.textContent = repairQuestState.mode === 'full' ? 'Полный расчет' : 'Примерный расчет';
      }
      if (lead) {
        lead.textContent = repairQuestState.mode === 'full'
          ? 'Полный сценарий собирает больше деталей, но остается понятным даже без опыта в ремонте.'
          : 'Короткий сценарий спрашивает только ключевые параметры, а остальное мы подставим автоматически.';
      }
      if (roomTypeLabel) {
        roomTypeLabel.textContent = currentRoom?.source?.roomType || currentRoom?.title || '—';
      }

      if (progressBar) progressBar.style.width = `${Math.round(progress * 100)}%`;
      if (progressText) progressText.textContent = `Шаг ${currentStepLabel} из ${totalSteps} • Подтверждено блоков: ${confirmedBlocks}/${totalBlocks}`;
      if (progressPercent) progressPercent.textContent = `${Math.round(progress * 100)}%`;
      if (scene) scene.innerHTML = renderRepairQuestScene(progress, currentRoom);

      renderRepairQuestRoomList();

      if (!content) return;

      if (repairQuestState.step >= repairQuestState.rooms.length) {
        content.innerHTML = renderRepairQuestSummary();
      } else {
        content.innerHTML = renderRepairQuestRoomStep(repairQuestState.rooms[repairQuestState.step]);
      }
    }

    function mapRepairQuestCurrentToDemolition(category, value) {
      const maps = {
        floor: {
          laminate: 'Ламинат',
          linoleum: 'Линолеум',
          ceramic_tile: 'Керамическая плитка',
          porcelain_tile: 'Керамогранит',
          parquet_board: 'Паркетная доска',
          engineered_board: 'Инженерная доска',
          self_leveling: 'Наливной пол',
          screed: 'Цементно-песчаная стяжка до 5 см'
        },
        wall: {
          wallpaper: 'Обои',
          paint: 'Покраска',
          plaster: 'Гипсовая штукатурка до 3 см.',
          decorative_plaster: 'Декоративная штукатурка',
          ceramic_tile_wall: 'Керамическая плитка',
          porcelain_tile_wall: 'Керамогранит',
          panels: 'Панели'
        },
        ceiling: {
          stretch_ceiling: 'Натяжные потолки',
          ceiling_paint: 'Краска',
          ceiling_plaster: 'Гипсовая штукатурка',
          gypsum_ceiling: 'Гипсокартонный потолок',
          suspended_ceiling: 'Подвесные потолки',
          rack_ceiling: 'Реечные потолки'
        }
      };
      return maps[category]?.[value] || '';
    }

    function getRepairQuestDefaultOpeningProduct(openingType) {
      if (openingType === 'door') return 'mdf';
      return 'pvc';
    }

    function getRepairQuestDemolitionOpeningMaterial(openingType) {
      if (openingType === 'door') return 'wood';
      return 'plastic';
    }

    function getRepairQuestOpeningDimensions(source, openingType, index) {
      if (openingType === 'door') {
        return {
          width: (parseFloat(source?.doorWidths?.[index]) || 80) * 10,
          height: (parseFloat(source?.doorHeights?.[index]) || 200) * 10
        };
      }
      if (openingType === 'window') {
        return {
          width: (parseFloat(source?.windowWidths?.[index]) || 130) * 10,
          height: (parseFloat(source?.windowHeights?.[index]) || 140) * 10
        };
      }
      return {
        width: (parseFloat(source?.balconyWidths?.[index]) || 80) * 10,
        height: (parseFloat(source?.balconyHeights?.[index]) || 250) * 10
      };
    }

    function buildRepairQuestOpeningItems(source, openingType, shouldInclude) {
      if (!shouldInclude) return [];
      const count = getRepairQuestOpenings(source)[openingType];
      const defaultMaterial = getDefaultRepairOpeningMaterial();
      const productMaterial = getRepairQuestDefaultOpeningProduct(openingType);
      const items = [];

      for (let i = 0; i < count; i++) {
        const dimensions = getRepairQuestOpeningDimensions(source, openingType, i);
        items.push({
          material: defaultMaterial || '',
          productMaterial,
          workTypeCount: 1,
          workTypes: syncRepairOpeningWorkTypes({ workTypes: [], workTypeCount: 1 }, openingType, defaultMaterial || '', 1),
          width: dimensions.width,
          height: dimensions.height
        });
      }

      return items;
    }

    function getRepairQuestPerimeterEstimate(area) {
      const normalizedArea = Math.max(4, Number(area || 0));
      return Number((Math.sqrt(normalizedArea) * 4).toFixed(2));
    }

    function pushRepairQuestFinishItem(list, category, type, value) {
      const normalizedValue = Number(value || 0);
      if (!type || normalizedValue <= 0) return;
      const measureMeta = getRepairFinishingMeasureMeta(category, type);
      list.push({
        type,
        [measureMeta.field]: Number(normalizedValue.toFixed(2)),
        autoFilled: true
      });
    }

    function getRepairQuestFinishPlan(meta, answer, metrics) {
      const isBathroom = isRepairQuestBathroomRoom(meta);
      const isKitchen = isRepairQuestKitchenRoom(meta);
      const wallIsTileFinish = ['ceramic_tile_wall', 'porcelain_tile_wall'].includes(answer.targetWall);
      const floorIsTileFinish = ['ceramic_tile', 'porcelain_tile'].includes(answer.targetFloor);
      const tileMode = isKitchen ? (answer.backsplash || 'none') : (answer.tileZones || 'none');
      const tileWallShare = tileMode === 'full' ? 0.42 : tileMode === 'accent' ? 0.18 : 0;
      const tileFloorShare = isBathroom && tileMode === 'full' ? 0.55 : 0;
      let decorativeWallType = null;
      let decorativeWallArea = 0;

      if (!isBathroom && answer.wallDecor === 'photo_wallpaper') {
        decorativeWallType = 'photo_wallpaper';
        decorativeWallArea = Math.max(3, metrics.wallArea * 0.16);
      } else if (!isBathroom && answer.wallDecor === 'wall_panels') {
        decorativeWallType = 'mdf_panels';
        decorativeWallArea = Math.max(3, metrics.wallArea * 0.14);
      }

      const tileWallArea = wallIsTileFinish ? metrics.wallArea : metrics.wallArea * tileWallShare;
      const baseWallArea = Math.max(0, metrics.wallArea - tileWallArea - decorativeWallArea);
      const tileFloorArea = floorIsTileFinish ? metrics.floorArea : metrics.floorArea * tileFloorShare;
      const baseFloorArea = Math.max(0, metrics.floorArea - tileFloorArea);
      const wallNeedsPutty = ['paint', 'wallpaper'].includes(answer.targetWall);

      return {
        isBathroom,
        isKitchen,
        wallIsTileFinish,
        floorIsTileFinish,
        tileMode,
        decorativeWallType,
        decorativeWallArea,
        tileWallArea,
        baseWallArea,
        tileFloorArea,
        baseFloorArea,
        wallNeedsPutty
      };
    }

    function buildRepairQuestAudit() {
      const issues = [];

      repairQuestState.rooms.forEach(meta => {
        const answer = repairQuestState.answers[meta.key];
        if (!answer) return;
        const roomLabel = meta.source?.roomType || meta.title;
        const isBathroom = isRepairQuestBathroomRoom(meta);
        const isKitchen = isRepairQuestKitchenRoom(meta);
        const isClimateRoom = isRepairQuestClimateRoom(meta);
        const metrics = getRepairQuestRoomMetrics(meta.source);

        if (answer.internetTv === 'yes' && Number(answer.internetPoints || 0) === 0) {
          issues.push(`${roomLabel}: включены интернет/ТВ точки, но их количество равно 0.`);
        }

        if (isBathroom) {
          if (answer.waterproofing !== 'yes') {
            issues.push(`${roomLabel}: для санузла не включена гидроизоляция пола.`);
          }
          if (answer.replacePlumbing === 'yes' && (Number(answer.waterPoints || 0) < 3 || Number(answer.drainagePoints || 0) < 3)) {
            issues.push(`${roomLabel}: для санузла маловато водоточек или канализационных точек.`);
          }
          if (answer.bathroomFixture === 'shower' && Number(answer.drainagePoints || 0) < 2) {
            issues.push(`${roomLabel}: душевая обычно требует как минимум 2 канализационные точки.`);
          }
          if (answer.leakProtection !== 'yes') {
            issues.push(`${roomLabel}: для мокрой зоны не включена защита от протечек.`);
          }
        }

        if (isKitchen) {
          const plannedKitchenWaterPoints = Number(answer.waterPoints || 0)
            + (answer.dishwasher === 'yes' ? 1 : 0)
            + (answer.waterFilter === 'yes' ? 1 : 0);
          const plannedKitchenDrainagePoints = Number(answer.drainagePoints || 0)
            + (answer.dishwasher === 'yes' ? 1 : 0)
            + (answer.disposer === 'yes' ? 1 : 0);
          if (answer.stoveType === 'electric' && Number(answer.sockets || 0) < 6) {
            issues.push(`${roomLabel}: для электрической плиты и кухни в целом розеток может быть недостаточно.`);
          }
          if (answer.kitchenLayout === 'island' && Number(answer.sockets || 0) < 8) {
            issues.push(`${roomLabel}: островная кухня обычно требует больше электроточек.`);
          }
          if (answer.dishwasher === 'yes' && (plannedKitchenWaterPoints < 4 || plannedKitchenDrainagePoints < 3)) {
            issues.push(`${roomLabel}: для кухни с посудомоечной машиной стоит проверить количество воды и канализации.`);
          }
          if (answer.leakProtection !== 'yes') {
            issues.push(`${roomLabel}: для кухни не включена защита от протечек.`);
          }
        }

        if (answer.replaceElectrical === 'no' && (Number(answer.sockets || 0) + Number(answer.switches || 0) + Number(answer.lights || 0) >= 12)) {
          issues.push(`${roomLabel}: много новых электроточек при отключенной замене электрики.`);
        }

        if (isClimateRoom && Number(metrics.floorArea || 0) >= 16 && answer.airConditioning === 'no') {
          issues.push(`${roomLabel}: для комнаты такой площади стоит проверить, нужна ли подготовка под кондиционер.`);
        }

        if (answer.airConditioning && answer.airConditioning !== 'no' && answer.replaceElectrical === 'no') {
          issues.push(`${roomLabel}: кондиционер обычно требует трассу и питание, а замена электрики отключена.`);
        }

        if (answer.currentState === 'whitebox' && answer.replaceElectrical === 'yes' && Number(answer.sockets || 0) <= 2 && Number(answer.lights || 0) <= 1) {
          issues.push(`${roomLabel}: для white-box полная замена электрики может быть лишней, если точек почти нет.`);
        }

        if (doesRepairQuestNeedWallPlaster(answer) && answer.wallReinforcement === 'no' && (answer.targetWall === 'paint' || answer.currentState === 'concrete_no_walls' || answer.roughWallPlan === 'plaster_with_partitions')) {
          issues.push(`${roomLabel}: стоит проверить, не нужно ли армирование штукатурки стен.`);
        }
      });

      return {
        issues,
        issueCount: issues.length
      };
    }

    function buildRepairQuestSectionAudit() {
      const issues = [];
      const rooms = getRepairQuestRooms();

      const hasMeasuredItems = (items = []) => items.some(item => {
        const value = Number(item?.qty || item?.length || item?.area || item?.depth || item?.width || 0);
        return !!item?.type && value > 0;
      });
      const hasTextAreaItems = (items = []) => items.some(item => !!item?.type && (Number(item?.area || 0) > 0 || Number(item?.length || 0) > 0 || Number(item?.qty || 0) > 0));
      const hasTypeItem = (items = [], type) => items.some(item => item?.type === type && Number(item?.qty || item?.length || item?.area || 0) > 0);
      const sumQtyByTypes = (items = [], types = []) => items
        .filter(item => types.includes(item?.type))
        .reduce((sum, item) => sum + Number(item?.qty || 0), 0);

      rooms.forEach(meta => {
        const roomLabel = meta.source?.roomType || meta.title;
        const demo = roomData.demolitionData?.[meta.demoRoomId] || {};
        const repair = roomData.repairData?.[meta.repairRoomId] || {};
        const rough = repair.rough || {};
        const engineering = repair.engineering || {};
        const finishing = repair.finishing || {};
        const currentState = meta.source?.repairData?.currentState || 'old_finish';
        const metrics = getRepairQuestRoomMetrics(meta.source);
        const isBathroom = isRepairQuestBathroomRoom(meta);
        const isKitchen = isRepairQuestKitchenRoom(meta);
        const isClimateRoom = isRepairQuestClimateRoom(meta);

        const hasRepairData = hasRepairRoomData(meta.repairRoomId);
        const hasDemoData = hasDemolitionRoomData(meta.demoRoomId);
        const hasRoughData = hasTextAreaItems(rough.floorLeveling || []) || hasTextAreaItems(rough.wallPlaster || []) || hasTextAreaItems(rough.wallPutty || []) || hasTextAreaItems(rough.ceilingPrep || []);
        const hasFinishingData = hasTextAreaItems(finishing.floor || []) || hasTextAreaItems(finishing.wall || []) || hasTextAreaItems(finishing.ceiling || []);
        const hasWaterWorks = hasMeasuredItems(engineering.water || []) || hasMeasuredItems(engineering.drainage || []);
        const hasLeakProtection = hasTypeItem(engineering.water || [], 'leak_protection');
        const hasWeakCurrent = hasTypeItem(engineering.electrical || [], 'weak_current');
        const hasInternetTv = hasTypeItem(engineering.electrical || [], 'internet_tv');
        const hasWiring = hasTypeItem(engineering.electrical || [], 'wiring_hidden');
        const hasAcPreparation = (engineering.ventilation || []).some(item => item?.questTag === 'air_conditioning' && Number(item?.qty || item?.length || item?.area || 0) > 0);
        const hasAcDemolition = hasTypeItem(demo.ventilation || [], 'ac');
        const electricalPoints = sumQtyByTypes(engineering.electrical || [], ['socket_install', 'switch_install', 'light_install', 'internet_tv']);
        const hasWallTile = (finishing.wall || []).some(item => ['ceramic_tile_wall', 'porcelain_tile_wall'].includes(item?.type) && Number(item?.area || 0) > 0);
        const hasWaterproofing = (rough.floorLeveling || []).some(item => String(item?.type || '').toLowerCase().includes('гидро'));
        const hasPlasterReinforcement = (rough.wallPlaster || []).some(item => ['Армированная штукатурка по сетке', 'Армирование штукатурки добавкой в смесь'].includes(item?.type) && Number(item?.area || 0) > 0);
        const needsRough = ['concrete_with_walls', 'concrete_no_walls', 'rough_finish', 'old_finish'].includes(currentState);

        if (!hasRepairData && !hasDemoData) return;

        if (currentState === 'old_finish' && hasRepairData && !hasDemoData) {
          issues.push(`${roomLabel}: есть ремонтные работы, но раздел демонтажа остался пустым.`);
        }

        if (needsRough && hasFinishingData && !hasRoughData) {
          issues.push(`${roomLabel}: есть чистовая отделка, но не заполнены черновые работы.`);
        }

        if (hasInternetTv && !hasWeakCurrent) {
          issues.push(`${roomLabel}: добавлены интернет/ТВ точки, но нет слаботочной подготовки.`);
        }

        if (electricalPoints >= 10 && !hasWiring) {
          issues.push(`${roomLabel}: много электроточек, но не видно прокладки скрытой проводки.`);
        }

        if ((isBathroom || isKitchen) && hasWaterWorks && !hasLeakProtection) {
          issues.push(`${roomLabel}: для мокрой зоны в работах не заложена защита от протечек.`);
        }

        if (isBathroom && hasWallTile && !hasWaterproofing) {
          issues.push(`${roomLabel}: есть плитка в санузле, но в черновых работах нет гидроизоляции пола.`);
        }

        if (isClimateRoom && Number(metrics.floorArea || 0) >= 16 && !hasAcPreparation && !hasAcDemolition) {
          issues.push(`${roomLabel}: не видно подготовки под кондиционер, хотя для комнаты такой площади это стоит проверить.`);
        }

        if (hasAcDemolition && !hasAcPreparation) {
          issues.push(`${roomLabel}: запланирован демонтаж кондиционера, но новая подготовка под него не заполнена.`);
        }

        if ((currentState === 'concrete_no_walls' || (finishing.wall || []).some(item => item?.type === 'paint' && Number(item?.area || 0) > 0)) && hasRoughData && !hasPlasterReinforcement) {
          issues.push(`${roomLabel}: проверьте, нужно ли добавить армирование штукатурки стен.`);
        }
      });

      return {
        issues,
        issueCount: issues.length
      };
    }

    function getRepairQuestDemoAreaFactor(answer) {
      return answer.oldFinishScope === 'local' ? 0.45 : 1;
    }

    function getRepairQuestOpeningNeedsDemolition(action, openingType = 'door') {
      if (!action || action === 'keep') return false;
      if (openingType === 'door') {
        return action === 'replace_with_demo';
      }
      return ['window', 'balcony'].includes(openingType)
        ? action === 'replace_with_demo' || action === 'replace_with_rework'
        : false;
    }

    function getRepairQuestApproxCounts(meta, answer) {
      const metrics = getRepairQuestRoomMetrics(meta.source);
      const baseCounts = getRepairQuestBaseCounts(meta, metrics, 'standard');
      const counts = {
        sockets: 0,
        switches: 0,
        lights: 0,
        internetPoints: 0,
        waterPoints: 0,
        drainagePoints: 0,
        heatingDevices: 0
      };

      if (answer.electricalScope === 'add_move_points') {
        counts.sockets = Math.max(1, Math.round(baseCounts.sockets * 0.45));
        counts.switches = Math.max(1, Math.round(baseCounts.switches * 0.5));
        counts.lights = Math.max(1, Math.round(baseCounts.lights * 0.45));
        counts.internetPoints = answer.internetTv === 'yes' ? Math.max(1, Math.round(baseCounts.internetPoints * 0.5) || 1) : 0;
      } else if (answer.electricalScope === 'full_rewire') {
        counts.sockets = baseCounts.sockets;
        counts.switches = baseCounts.switches;
        counts.lights = baseCounts.lights;
        counts.internetPoints = answer.internetTv === 'yes' ? Math.max(1, baseCounts.internetPoints) : 0;
      }

      if (answer.plumbingScope === 'add_move_points') {
        counts.waterPoints = isRepairQuestPlumbingRoom(meta) ? Math.max(1, Math.round(baseCounts.waterPoints * 0.5)) : 0;
        counts.drainagePoints = isRepairQuestPlumbingRoom(meta) ? Math.max(1, Math.round(baseCounts.drainagePoints * 0.5)) : 0;
      } else if (answer.plumbingScope === 'full_replumbing') {
        counts.waterPoints = baseCounts.waterPoints;
        counts.drainagePoints = baseCounts.drainagePoints;
      }

      if (answer.heatingScope === 'install_new') {
        counts.heatingDevices = Math.max(1, baseCounts.heatingDevices || 1);
      } else if (answer.heatingScope === 'replace_with_demo') {
        counts.heatingDevices = Math.max(1, baseCounts.heatingDevices || 1);
      }

      if (answer.tvZone === 'yes') {
        counts.sockets += 2;
        counts.internetPoints = Math.max(1, counts.internetPoints + 1);
      }
      if (answer.workPlace === 'yes') {
        counts.sockets += 3;
        counts.lights += 1;
        counts.internetPoints = Math.max(counts.internetPoints, 1);
      }
      if (answer.bedsideLight === 'yes') {
        counts.lights += 2;
        counts.switches += 1;
      }
      if (answer.extraLight === 'yes' || answer.decorativeLighting === 'yes' || answer.taskLight === 'yes') {
        counts.lights += 1;
      }
      if (answer.extraSockets === 'yes') {
        counts.sockets += 2;
      }
      if (answer.dishwasher === 'yes') {
        counts.sockets += 1;
        counts.waterPoints += 1;
        counts.drainagePoints += 1;
      }
      if (answer.oven === 'yes') {
        counts.sockets += 1;
      }
      if (answer.waterFilter === 'yes') {
        counts.waterPoints += 1;
      }
      if (answer.disposer === 'yes') {
        counts.sockets += 1;
        counts.drainagePoints += 1;
      }
      if (answer.washingMachine === 'yes') {
        counts.sockets += 1;
        counts.waterPoints += 1;
        counts.drainagePoints += 1;
      }
      if (answer.applianceLoad === 'high') {
        counts.sockets += 3;
      }
      if (Number(answer.workPlaces || 0) > 0) {
        counts.sockets += Number(answer.workPlaces || 0) * 2;
        counts.internetPoints = Math.max(counts.internetPoints, Number(answer.workPlaces || 0));
        counts.lights += Math.max(1, Math.ceil(Number(answer.workPlaces || 0) / 2));
      }
      if (answer.intercomType && answer.intercomType !== 'none') {
        counts.sockets += 1;
      }
      if (answer.securityLevel && answer.securityLevel !== 'none') {
        counts.sockets += 1;
      }

      return counts;
    }

    function getRepairQuestEffectiveCounts(meta, answer) {
      if (repairQuestState.mode === 'full') {
        return {
          sockets: answer.electricalScope === 'no_touch' ? 0 : Math.max(0, Number(answer.sockets || 0)),
          switches: answer.electricalScope === 'no_touch' ? 0 : Math.max(0, Number(answer.switches || 0)),
          lights: answer.electricalScope === 'no_touch' ? 0 : Math.max(0, Number(answer.lights || 0)),
          internetPoints: answer.electricalScope === 'no_touch' ? 0 : Math.max(0, Number(answer.internetPoints || 0)),
          waterPoints: answer.plumbingScope === 'no_touch' ? 0 : Math.max(0, Number(answer.waterPoints || 0)),
          drainagePoints: answer.plumbingScope === 'no_touch' ? 0 : Math.max(0, Number(answer.drainagePoints || 0)),
          heatingDevices: answer.heatingScope === 'no_touch' ? 0 : Math.max(0, Number(answer.heatingDevices || 0))
        };
      }
      return getRepairQuestApproxCounts(meta, answer);
    }

    function applyRepairQuestToRoom(meta) {
      const answer = repairQuestState.answers[meta.key];
      if (!answer) return;

      const source = meta.source;
      const sourceOpenings = getRepairQuestOpenings(source);
      const shouldMaterializeBalconyOpening = canRepairQuestHaveBalconyOpening(meta) && answer.balconyAction && answer.balconyAction !== 'keep';
      const effectiveBalconyCount = shouldMaterializeBalconyOpening ? Math.max(1, sourceOpenings.balcony) : sourceOpenings.balcony;
      if (effectiveBalconyCount !== sourceOpenings.balcony) {
        source.balcony = effectiveBalconyCount;
        if (!Array.isArray(source.balconyWidths)) source.balconyWidths = [80, 80, 80, 80, 80];
        if (!Array.isArray(source.balconyHeights)) source.balconyHeights = [250, 250, 250, 250, 250];
      }
      const demoRoomId = meta.demoRoomId;
      const repairRoomId = meta.repairRoomId;
      const demoFinishing = ensureFinishingDataStructure(demoRoomId);
      const repair = ensureRepairDataStructure(repairRoomId);
      const metrics = getRepairQuestRoomMetrics(source);
      const perimeterEstimate = getRepairQuestPerimeterEstimate(metrics.floorArea);
      const targetResult = answer.targetResult || getRepairQuestTargetResultFromGoal(answer.repairGoal || source?.repairData?.repairTypeNew || 'clean');
      const repairGoal = mapRepairQuestTargetResultToGoal(targetResult);
      const finishPlan = getRepairQuestFinishPlan(meta, answer, metrics);
      const effectiveCounts = getRepairQuestEffectiveCounts(meta, answer);
      const socketGroupCount = repairQuestState.mode === 'full'
        ? Math.max(0, Number(answer.doubleSockets || 0) + Number(answer.tripleSockets || 0))
        : Math.max(0, Math.round((effectiveCounts.sockets || 0) * 0.35));
      const smartCurtainQty = answer.smartCurtains === 'yes'
        ? Math.max(1, getRepairQuestOpenings(source).window + getRepairQuestOpenings(source).balcony)
        : 0;
      const smartMotionQty = answer.smartMotionSensors === 'yes' ? Math.max(1, Math.ceil(metrics.floorArea / 12)) : 0;
      const smartLightQty = answer.smartLightOffSensors === 'yes' ? Math.max(1, Math.ceil((effectiveCounts.lights || 1) / 3)) : 0;
      const smartClimateQty = answer.smartClimateSensors === 'yes' ? 1 : 0;
      const smartLeakQty = answer.smartLeakSensors === 'yes' ? 1 : 0;
      const smartFeatureCount = [smartCurtainQty > 0, smartMotionQty > 0, smartLightQty > 0, smartClimateQty > 0, smartLeakQty > 0].filter(Boolean).length;
      const demoAreaFactor = getRepairQuestDemoAreaFactor(answer);
      const partitionAreaEstimate = Number(Math.max(3, metrics.wallArea * 0.18).toFixed(2));
      const needsPartitionDemo = ['demolish_or_move', 'both', 'full', 'local_changes'].includes(answer.replanningAction) && (answer.currentState === 'old_finish' || isRepairQuestReplanningRequired(meta));
      const increasesWallScope = ['build_new', 'both'].includes(answer.replanningAction) || answer.roughWallPlan === 'plaster_with_partitions';
      const adjustedWallArea = Number((metrics.wallArea * (increasesWallScope ? 1.15 : 1)).toFixed(2));
      const adjustedFloorArea = Number(metrics.floorArea.toFixed(2));

      source.repairData = source.repairData || {};
      source.repairData.currentState = answer.currentState;
      source.repairData.repairTypeNew = repairGoal;

      demoFinishing.floor = [];
      demoFinishing.wall = [];
      demoFinishing.ceiling = [];

      roomData.demolitionData[demoRoomId].doorOpenings = [];
      roomData.demolitionData[demoRoomId].windowOpenings = [];
      roomData.demolitionData[demoRoomId].balconyOpenings = [];
      roomData.demolitionData[demoRoomId].electrical = [];
      roomData.demolitionData[demoRoomId].ventilation = [];
      roomData.demolitionData[demoRoomId].water = [];
      roomData.demolitionData[demoRoomId].drainage = [];
      roomData.demolitionData[demoRoomId].heating = [];
      roomData.demolitionData[demoRoomId].plumbing = [];
      roomData.demolitionData[demoRoomId].partitions = [];

      repair.rough = { floorLeveling: [], wallPlaster: [], wallPutty: [], ceilingPrep: [] };
      repair.engineering = { electrical: [], ventilation: [], water: [], drainage: [], heating: [] };
      repair.finishing = { floor: [], wall: [], ceiling: [], openings: { door: [], window: [], balcony: [] } };

      if (answer.currentState === 'old_finish') {
        const floorTypes = (Array.isArray(answer.currentFloor) ? answer.currentFloor : [answer.currentFloor])
          .map(value => mapRepairQuestCurrentToDemolition('floor', value))
          .filter(Boolean);
        const wallTypes = (Array.isArray(answer.currentWall) ? answer.currentWall : [answer.currentWall])
          .map(value => mapRepairQuestCurrentToDemolition('wall', value))
          .filter(Boolean);
        const ceilingTypes = (Array.isArray(answer.currentCeiling) ? answer.currentCeiling : [answer.currentCeiling])
          .map(value => mapRepairQuestCurrentToDemolition('ceiling', value))
          .filter(Boolean);

        floorTypes.forEach(type => demoFinishing.floor.push({ type, area: Number((metrics.floorArea * demoAreaFactor).toFixed(2)) }));
        wallTypes.forEach(type => demoFinishing.wall.push({ type, area: Number((metrics.wallArea * demoAreaFactor).toFixed(2)) }));
        ceilingTypes.forEach(type => demoFinishing.ceiling.push({ type, area: Number((metrics.ceilingArea * demoAreaFactor).toFixed(2)) }));
      }

      if (needsPartitionDemo) {
        roomData.demolitionData[demoRoomId].partitions = [{ material: 'Пеноблок', area: partitionAreaEstimate }];
      }

      if (answer.currentState !== 'concrete_no_walls' && getRepairQuestOpeningNeedsDemolition(answer.doorsAction, 'door')) {
        roomData.demolitionData[demoRoomId].doorOpenings = buildRepairQuestOpeningItems(source, 'door', true).map(item => ({
          length: item.height,
          width: item.width,
          material: getRepairQuestDemolitionOpeningMaterial('door')
        }));
      }
      if (getRepairQuestOpeningNeedsDemolition(answer.windowsAction, 'window')) {
        roomData.demolitionData[demoRoomId].windowOpenings = buildRepairQuestOpeningItems(source, 'window', true).map(item => ({
          length: item.height,
          width: item.width,
          material: getRepairQuestDemolitionOpeningMaterial('window')
        }));
      }
      if (getRepairQuestOpeningNeedsDemolition(answer.balconyAction, 'balcony')) {
        roomData.demolitionData[demoRoomId].balconyOpenings = buildRepairQuestOpeningItems(source, 'balcony', true).map(item => ({
          length: item.height,
          width: item.width,
          material: getRepairQuestDemolitionOpeningMaterial('balcony')
        }));
      }

      const needsBasePrep = ['concrete_with_walls', 'concrete_no_walls', 'rough_finish', 'old_finish'].includes(answer.currentState);

      if (targetResult === 'rough_target') {
        if (answer.roughFloorPlan === 'screed' || answer.roughFloorPlan === 'screed_warm') {
          repair.rough.floorLeveling.push({ type: answer.roughFloorPlan === 'screed_warm' ? 'Подготовка основания под теплый пол' : 'Цементно-песчаная стяжка до 5 см', area: adjustedFloorArea, autoFilled: true });
        } else if (answer.roughFloorPlan === 'leveling_only') {
          repair.rough.floorLeveling.push({ type: 'Выравнивание пола', area: adjustedFloorArea, autoFilled: true });
        }
        if (answer.soundproofing === 'yes') {
          repair.rough.floorLeveling.push({ type: 'Шумоизоляция пола', area: adjustedFloorArea, autoFilled: true });
        }
        if (answer.waterproofing === 'yes') {
          repair.rough.floorLeveling.push({ type: 'Гидроизоляция пола', area: adjustedFloorArea, autoFilled: true });
        }
        repair.rough.wallPlaster.push({
          type: 'Гипсовая штукатурка до 3 см',
          area: adjustedWallArea,
          autoFilled: true
        });
        if (answer.roughCeilingPlan !== 'minimal') {
          repair.rough.ceilingPrep.push({ type: 'Выравнивание потолка', area: Number(metrics.ceilingArea.toFixed(2)), autoFilled: true });
        }
      } else if (targetResult === 'whitebox_target') {
        if (answer.whiteboxFloorPlan === 'screed_ready') {
          repair.rough.floorLeveling.push({ type: 'Цементно-песчаная стяжка до 5 см', area: adjustedFloorArea, autoFilled: true });
        } else if (answer.whiteboxFloorPlan === 'self_leveling') {
          repair.rough.floorLeveling.push({ type: 'Цементно-песчаная стяжка до 5 см', area: adjustedFloorArea, autoFilled: true });
          repair.rough.floorLeveling.push({ type: 'Наливной пол', area: adjustedFloorArea, autoFilled: true });
        } else if (answer.whiteboxFloorPlan === 'finish_ready') {
          repair.rough.floorLeveling.push({ type: 'Цементно-песчаная стяжка до 5 см', area: adjustedFloorArea, autoFilled: true });
          repair.rough.floorLeveling.push({ type: 'Наливной пол', area: adjustedFloorArea, autoFilled: true });
        }
        repair.rough.wallPlaster.push({ type: 'Гипсовая штукатурка до 3 см', area: adjustedWallArea, autoFilled: true });
        if (['putty', 'paint_ready'].includes(answer.whiteboxWallPlan)) {
          repair.rough.wallPutty.push({ type: answer.whiteboxWallPlan === 'paint_ready' ? 'Шпаклевка под покраску' : 'Шпаклевка под обои', area: adjustedWallArea, autoFilled: true });
        }
        repair.rough.ceilingPrep.push({ type: 'Выравнивание потолка', area: Number(metrics.ceilingArea.toFixed(2)), autoFilled: true });
        if (['putty_ready', 'paint_ready'].includes(answer.whiteboxCeilingPlan)) {
          repair.rough.ceilingPrep.push({ type: 'Шпаклевка потолка', area: Number(metrics.ceilingArea.toFixed(2)), autoFilled: true });
        }
      } else {
        if (needsBasePrep) {
          const floorRoughArea = answer.warmFloor === 'yes' ? metrics.floorArea : Math.max(metrics.floorArea, finishPlan.tileFloorArea);
          repair.rough.floorLeveling.push({ type: answer.warmFloor === 'yes' ? 'Подготовка основания под теплый пол' : 'Цементно-песчаная стяжка до 5 см', area: Number(floorRoughArea.toFixed(2)), autoFilled: true });
          if (answer.waterproofing === 'yes') {
            repair.rough.floorLeveling.push({ type: 'Гидроизоляция пола', area: Number(metrics.floorArea.toFixed(2)), autoFilled: true });
          }
          if (answer.soundproofing === 'yes') {
            repair.rough.floorLeveling.push({ type: 'Шумоизоляция пола', area: Number(metrics.floorArea.toFixed(2)), autoFilled: true });
          }
          repair.rough.wallPlaster.push({
            type: finishPlan.isBathroom || finishPlan.wallIsTileFinish ? 'Цементная штукатурка до 3 см' : 'Гипсовая штукатурка до 3 см',
            area: adjustedWallArea,
            autoFilled: true
          });
          if (finishPlan.wallNeedsPutty && finishPlan.baseWallArea > 0) {
            repair.rough.wallPutty.push({
              type: answer.targetWall === 'paint' ? 'Шпаклевка под покраску' : 'Шпаклевка под обои',
              area: Number(finishPlan.baseWallArea.toFixed(2)),
              autoFilled: true
            });
          }
          if (!['stretch_ceiling', 'stretch_shadow', 'suspended_ceiling'].includes(answer.targetCeiling)) {
            repair.rough.ceilingPrep.push({ type: 'Выравнивание потолка', area: Number(metrics.ceilingArea.toFixed(2)), autoFilled: true });
            repair.rough.ceilingPrep.push({ type: 'Шпаклевка потолка', area: Number(metrics.ceilingArea.toFixed(2)), autoFilled: true });
          }
        } else if (answer.currentState === 'whitebox') {
          if (!['stretch_ceiling', 'stretch_shadow', 'suspended_ceiling'].includes(answer.targetCeiling)) {
            repair.rough.ceilingPrep.push({ type: 'Грунтовка', area: Number(metrics.ceilingArea.toFixed(2)), autoFilled: true });
          }
        }
      }

      if (doesRepairQuestNeedWallPlaster(answer) && adjustedWallArea > 0) {
        if (answer.wallReinforcement === 'mesh') {
          repair.rough.wallPlaster.push({
            type: 'Армированная штукатурка по сетке',
            area: adjustedWallArea,
            autoFilled: true
          });
        } else if (answer.wallReinforcement === 'additive') {
          repair.rough.wallPlaster.push({
            type: 'Армирование штукатурки добавкой в смесь',
            area: adjustedWallArea,
            autoFilled: true
          });
        }
      }

      if (['finish_target', 'turnkey_target'].includes(targetResult)) {
        if (finishPlan.decorativeWallType && finishPlan.decorativeWallArea > 0) {
          pushRepairQuestFinishItem(repair.finishing.wall, 'wall', finishPlan.decorativeWallType, finishPlan.decorativeWallArea);
        }

        if (finishPlan.wallIsTileFinish) {
          pushRepairQuestFinishItem(repair.finishing.wall, 'wall', answer.targetWall, metrics.wallArea);
        } else {
          pushRepairQuestFinishItem(repair.finishing.wall, 'wall', answer.targetWall, finishPlan.baseWallArea);
          if (finishPlan.tileWallArea > 0) {
            pushRepairQuestFinishItem(repair.finishing.wall, 'wall', finishPlan.isBathroom ? 'porcelain_tile_wall' : 'ceramic_tile_wall', finishPlan.tileWallArea);
          }
        }

        if (finishPlan.floorIsTileFinish) {
          pushRepairQuestFinishItem(repair.finishing.floor, 'floor', answer.targetFloor, metrics.floorArea);
        } else {
          pushRepairQuestFinishItem(repair.finishing.floor, 'floor', answer.targetFloor, finishPlan.baseFloorArea);
          if (finishPlan.tileFloorArea > 0) {
            pushRepairQuestFinishItem(repair.finishing.floor, 'floor', 'porcelain_tile', finishPlan.tileFloorArea);
          }
        }

        pushRepairQuestFinishItem(repair.finishing.ceiling, 'ceiling', answer.targetCeiling, metrics.ceilingArea);

        if (answer.ceilingAccent === 'yes') {
          repair.finishing.ceiling.push({ type: 'ceiling_light_line', length: Number(Math.max(3, metrics.floorArea / 2).toFixed(2)), autoFilled: true });
        }

        const curtainLength = answer.curtainSolution === 'niche'
          ? Number(Math.max(2.5, perimeterEstimate * 0.62).toFixed(2))
          : answer.curtainSolution === 'cornice'
            ? Number(Math.max(2, perimeterEstimate * 0.45).toFixed(2))
            : 0;

        if (answer.ceilingDecor === 'molding') {
          repair.finishing.ceiling.push({ type: 'ceiling_molding', length: Number((perimeterEstimate * 0.92).toFixed(2)), autoFilled: true });
        }

        if (curtainLength > 0) {
          repair.finishing.ceiling.push({ type: 'cornice_niche', length: curtainLength, autoFilled: true });
        }

        if (answer.ceilingHatch === 'yes') {
          repair.finishing.ceiling.push({ type: 'ceiling_hatch', qty: 1, autoFilled: true });
        }

        repair.finishing.floor.push({
          type: answer.plinthType === 'hidden' ? 'hidden_plinth' : 'floor_plinth',
          length: Number((perimeterEstimate * 0.92).toFixed(2)),
          autoFilled: true
        });

        if (answer.wallAccent === 'molding') {
          repair.finishing.wall.push({ type: 'wall_molding', length: Number(Math.max(4, perimeterEstimate * 0.65).toFixed(2)), autoFilled: true });
        } else if (answer.wallAccent === 'slats') {
          repair.finishing.wall.push({ type: 'wall_slats', area: Number(Math.max(3, metrics.wallArea * 0.14).toFixed(2)), autoFilled: true });
        }
      }

      const estimatedWireLength = Math.max(5, Math.round(metrics.floorArea * 2.4));
      const needsElectricalWork = answer.electricalScope !== 'no_touch'
        || (effectiveCounts.sockets || 0) > 0
        || (effectiveCounts.switches || 0) > 0
        || (effectiveCounts.lights || 0) > 0
        || answer.internetTv === 'yes'
        || answer.smartHome !== 'no'
        || answer.securityLevel !== 'none'
        || answer.warmFloor === 'yes';

      if (answer.currentState === 'old_finish' && answer.electricalScope === 'full_rewire') {
        roomData.demolitionData[demoRoomId].electrical = [];
        roomData.demolitionData[demoRoomId].electrical.push({ type: 'wiring', qty: estimatedWireLength });
        if ((effectiveCounts.sockets || 0) + (effectiveCounts.switches || 0) > 0) {
          roomData.demolitionData[demoRoomId].electrical.push({ type: 'outlets', qty: (effectiveCounts.sockets || 0) + (effectiveCounts.switches || 0) });
        }
        if ((effectiveCounts.lights || 0) > 0) {
          roomData.demolitionData[demoRoomId].electrical.push({ type: 'lights', qty: effectiveCounts.lights || 0 });
        }
      }

      if (needsElectricalWork) {
        if ((effectiveCounts.sockets || 0) > 0) {
          repair.engineering.electrical.push({ type: 'socket_install', qty: effectiveCounts.sockets || 0 });
          repair.engineering.electrical.push({ type: 'subsocket', qty: effectiveCounts.sockets || 0 });
        }
        if ((effectiveCounts.switches || 0) > 0) {
          repair.engineering.electrical.push({ type: 'switch_install', qty: effectiveCounts.switches || 0 });
        }
        if ((effectiveCounts.lights || 0) > 0) {
          repair.engineering.electrical.push({ type: 'light_install', qty: effectiveCounts.lights || 0 });
        }
        repair.engineering.electrical.push({ type: 'wiring_hidden', length: Number(estimatedWireLength.toFixed(2)) });
        if (socketGroupCount > 0) {
          repair.engineering.electrical.push({ type: 'socket_group', qty: socketGroupCount });
        }
        if (repairQuestState.mode === 'full' && Number(answer.childProtectedSockets || 0) > 0) {
          repair.engineering.electrical.push({ type: 'socket_child_protection', qty: Number(answer.childProtectedSockets || 0) });
        }
        if (repairQuestState.mode === 'full' && Number(answer.moistureProofSockets || 0) > 0) {
          repair.engineering.electrical.push({ type: 'socket_moisture_proof', qty: Number(answer.moistureProofSockets || 0) });
        }
        if (answer.lightingScenario === 'accent') {
          repair.engineering.electrical.push({ type: 'spot_light', qty: Math.max(2, Math.round((effectiveCounts.lights || 0) * 0.6)) });
        } else if (answer.lightingScenario === 'scenario') {
          repair.engineering.electrical.push({ type: 'spot_light', qty: Math.max(4, effectiveCounts.lights || 0) });
          repair.engineering.electrical.push({ type: 'led_strip', length: Number(Math.max(4, metrics.floorArea / 2).toFixed(2)) });
        }
        if (answer.internetTv === 'yes') {
          repair.engineering.electrical.push({ type: 'weak_current', qty: Math.max(1, Math.ceil(metrics.floorArea / 20)) });
          repair.engineering.electrical.push({ type: 'internet_tv', qty: Math.max(1, effectiveCounts.internetPoints || Math.ceil(metrics.floorArea / 25)) });
        }
        if (answer.smartHome === 'prepare') {
          repair.engineering.electrical.push({ type: 'smart_home_preparation', qty: Math.max(1, smartFeatureCount) });
        } else if (answer.smartHome === 'basic') {
          repair.engineering.electrical.push({ type: 'smart_home_setup', qty: 1 });
          repair.engineering.electrical.push({ type: 'smart_home', qty: Math.max(1, smartFeatureCount) });
        } else if (answer.smartHome === 'advanced') {
          repair.engineering.electrical.push({ type: 'smart_home_setup', qty: Math.max(2, smartFeatureCount) });
          repair.engineering.electrical.push({ type: 'smart_home', qty: Math.max(3, smartFeatureCount + 1) });
        }
        if (smartCurtainQty > 0) {
          repair.engineering.electrical.push({ type: 'smart_curtain', qty: smartCurtainQty });
        }
        if (smartMotionQty > 0) {
          repair.engineering.electrical.push({ type: 'smart_motion_sensor', qty: smartMotionQty });
        }
        if (smartLightQty > 0) {
          repair.engineering.electrical.push({ type: 'smart_light_sensor', qty: smartLightQty });
        }
        if (smartClimateQty > 0) {
          repair.engineering.electrical.push({ type: 'smart_climate_sensor', qty: smartClimateQty });
        }
        if (answer.securityLevel === 'intercom') {
          repair.engineering.electrical.push({ type: 'intercom', qty: 1 });
        } else if (answer.securityLevel === 'video_intercom') {
          repair.engineering.electrical.push({ type: 'intercom_video', qty: 1 });
        } else if (answer.securityLevel === 'smart_security') {
          repair.engineering.electrical.push({ type: 'intercom', qty: 1 });
          repair.engineering.electrical.push({ type: 'cctv', qty: Math.max(2, Math.ceil(metrics.floorArea / 18)) });
        }
        if (answer.warmFloor === 'yes') {
          repair.engineering.electrical.push({ type: 'warm_floor_electric', area: Number(metrics.floorArea.toFixed(2)) });
          if (answer.currentState === 'old_finish') {
            roomData.demolitionData[demoRoomId].electrical.push({ type: 'warm_floor', qty: Number(metrics.floorArea.toFixed(2)) });
          }
        }
        if (answer.climateScope && answer.climateScope !== 'not_needed') {
          const isReplaceAc = answer.climateScope === 'replace_old';
          const acRouteLength = Number(Math.max(4, Math.min(12, metrics.floorArea / 2.5 + (isReplaceAc ? 1.5 : 0))).toFixed(2));
          repair.engineering.ventilation.push({ type: 'ac_route', length: acRouteLength, questTag: 'air_conditioning' });
          repair.engineering.ventilation.push({ type: 'ac_power', length: Number((acRouteLength * 0.9).toFixed(2)), questTag: 'air_conditioning' });
          repair.engineering.ventilation.push({ type: 'ac_drain', length: Number((acRouteLength * 0.75).toFixed(2)), questTag: 'air_conditioning' });
          repair.engineering.ventilation.push({ type: 'wall_drilling', qty: 1, questTag: 'air_conditioning' });
          if (answer.climateScope === 'new_install' || answer.climateScope === 'replace_old') {
            repair.engineering.ventilation.push({ type: 'ac_unit_install', qty: 1, questTag: 'air_conditioning' });
            repair.engineering.ventilation.push({ type: 'ac_outdoor_install', qty: 1, questTag: 'air_conditioning' });
          }
          if (answer.currentState === 'old_finish' && answer.climateScope === 'replace_old') {
            roomData.demolitionData[demoRoomId].ventilation = [{ type: 'ac', qty: 1 }];
          }
        }
      }

      if (answer.plumbingScope !== 'no_touch' && ((effectiveCounts.waterPoints || 0) > 0 || (effectiveCounts.drainagePoints || 0) > 0)) {
        roomData.demolitionData[demoRoomId].water = answer.plumbingScope === 'full_replumbing' && effectiveCounts.waterPoints > 0 ? [{ type: 'pp', diameter: '20', qty: effectiveCounts.waterPoints }] : [];
        roomData.demolitionData[demoRoomId].drainage = answer.plumbingScope === 'full_replumbing' && effectiveCounts.drainagePoints > 0 ? [{ type: 'plastic', diameter: '50', length: effectiveCounts.drainagePoints, depth: 0, qty: effectiveCounts.drainagePoints }] : [];
        if (effectiveCounts.waterPoints > 0) repair.engineering.water.push({ type: 'water_point', qty: effectiveCounts.waterPoints });
        if (effectiveCounts.drainagePoints > 0) repair.engineering.drainage.push({ type: 'drain_point', qty: effectiveCounts.drainagePoints });
      }

      if (smartLeakQty > 0) {
        repair.engineering.water.push({ type: 'smart_leak_sensor', qty: smartLeakQty });
      }

      if (answer.heatingScope !== 'no_touch' && (effectiveCounts.heatingDevices || 0) > 0) {
        roomData.demolitionData[demoRoomId].heating = answer.heatingScope === 'replace_with_demo'
          ? [{ type: 'radiator', qty: effectiveCounts.heatingDevices, material: '', mounting: '', standard: '', length: 0, width: 0 }]
          : [];
        const heatingWorkType = answer.heatingSystemType === 'infloor_convector'
          ? 'infloor_convector'
          : answer.heatingSystemType === 'radiator_side'
            ? 'radiator_side_install'
            : 'radiator_bottom_install';
        repair.engineering.heating.push({ type: heatingWorkType, qty: effectiveCounts.heatingDevices });
      }

      if (isRepairQuestBathroomRoom(meta)) {
        const plumbingDemolition = [];
        if (answer.currentState === 'old_finish' && answer.plumbingScope === 'full_replumbing') {
          plumbingDemolition.push({ type: 'sink', qty: 1 });
          if (getRepairQuestNormalizedRoomType(meta) !== 'shower') {
            plumbingDemolition.push({ type: 'toilet', qty: 1 });
          }
          plumbingDemolition.push({ type: answer.bathroomFixture === 'shower' ? 'shower' : 'bathtub', qty: 1 });
        }
        roomData.demolitionData[demoRoomId].plumbing = plumbingDemolition;

        if (answer.plumbingScope !== 'no_touch') {
          repair.engineering.water.push({ type: 'mixer_connection', qty: answer.bathroomFixture === 'combined' ? 3 : 2 });
          if (answer.toiletFormat === 'wall' || answer.installationFrame === 'yes') {
            repair.engineering.water.push({ type: 'installation_frame', qty: 1 });
          }
          if (answer.boilerOption && answer.boilerOption !== 'no') {
            repair.engineering.water.push({ type: 'boiler_connection', qty: 1 });
          }
          if (answer.leakProtection === 'yes') {
            repair.engineering.water.push({ type: 'leak_protection', qty: 1 });
          }
          if (answer.bathroomFixture === 'shower') {
            if (answer.showerDrain === 'drain') {
              repair.engineering.drainage.push({ type: 'shower_channel', qty: 1 });
            }
          }
        }
        if (answer.towelDryer === 'yes') {
          if (answer.currentState === 'old_finish' && answer.heatingScope !== 'no_touch') {
            roomData.demolitionData[demoRoomId].plumbing.push({ type: 'towel_dryer', qty: 1 });
          }
          repair.engineering.heating.push({ type: 'heated_towel_rail', qty: 1 });
        }
      }

      if (isRepairQuestKitchenRoom(meta)) {
        const extraWaterPoints = (answer.dishwasher === 'yes' && repairQuestState.mode === 'full' ? 1 : 0) + ((answer.applianceCount || 0) >= 4 && repairQuestState.mode === 'full' ? 1 : 0);
        const extraDrainPoints = answer.dishwasher === 'yes' ? 1 : 0;
        const extraSocketGroups = (answer.kitchenLayout === 'island' ? 1 : 0) + (answer.fridgeInstallation === 'large' ? 1 : 0);
        const applianceSockets = Math.max(1, Number(answer.applianceCount || 0)) + (answer.stoveType === 'electric' ? 1 : 0);

        if (answer.currentState === 'old_finish' && answer.plumbingScope === 'full_replumbing') {
          roomData.demolitionData[demoRoomId].plumbing = [
            { type: 'sink', qty: 1 },
            { type: 'faucet', qty: 1 },
            ...(answer.dishwasher === 'yes' ? [{ type: 'dishwasher', qty: 1 }] : [])
          ];
        }

        if (answer.plumbingScope !== 'no_touch' && extraWaterPoints > 0) {
          repair.engineering.water.push({ type: 'water_point', qty: extraWaterPoints });
          repair.engineering.water.push({ type: 'mixer_connection', qty: 1 + (answer.dishwasher === 'yes' ? 1 : 0) });
        }
        if (answer.plumbingScope !== 'no_touch' && answer.leakProtection === 'yes') {
          repair.engineering.water.push({ type: 'leak_protection', qty: 1 });
        }
        if (answer.plumbingScope !== 'no_touch' && extraDrainPoints > 0) {
          repair.engineering.drainage.push({ type: 'drain_point', qty: extraDrainPoints });
        }

        if (repairQuestState.mode !== 'full') {
          repair.engineering.electrical.push({ type: 'socket_group', qty: Math.max(1, extraSocketGroups + Math.ceil(applianceSockets / 3)) });
        }
        if (answer.ventilation === 'enhanced') {
          repair.engineering.ventilation.push({ type: 'vent_fan_install', qty: 1 });
        }
      }

      repair.finishing.openings.door = buildRepairQuestOpeningItems(source, 'door', answer.doorsAction && answer.doorsAction !== 'keep');
      repair.finishing.openings.window = buildRepairQuestOpeningItems(source, 'window', answer.windowsAction && answer.windowsAction !== 'keep');
      repair.finishing.openings.balcony = buildRepairQuestOpeningItems(source, 'balcony', answer.balconyAction && answer.balconyAction !== 'keep');
      markRepairRoomAutoFilled(repair);
    }

    function applyRepairQuestResults() {
      repairQuestState.lastAudit = buildRepairQuestAudit();
      repairQuestState.rooms.forEach(applyRepairQuestToRoom);
      repairQuestState.sectionAudit = buildRepairQuestSectionAudit();

      renderWhatToDoRooms();
      setTimeout(() => {
        renderAllDemolitionFinishingSections();
        renderAllRepairSections();
        renderAllRepairOpeningSections();
        updateDetailedCalc();
        toggleSection('whatToDoSection', true);
        closeRepairQuest();
      }, 120);
    }
    
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
      
      livingRooms.forEach(room => {
        totalFloorArea += parseFloat(room.area) || 0;
        totalWallsArea += calculateLivingRoomWallsArea(room);
      });
      
      floors.forEach(floor => {
        if (floor.livingRooms) {
          floor.livingRooms.forEach(room => {
            totalFloorArea += parseFloat(room.area) || 0;
            totalWallsArea += calculateLivingRoomWallsArea(room);
          });
        }
      });
      
      container.innerHTML = `
        <div class="text-sm font-bold text-gray-700 dark:text-gray-300">\u0418\u0442\u043E\u0433\u043E \u043F\u043B\u043E\u0449\u0430\u0434\u044C:</div>
        <div class="text-xs text-gray-500 mt-1">
          <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043F\u043E\u043B\u0430: <span class="font-medium">${totalFloorArea.toFixed(2)} \u043C\u00B2</span></div>
          <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0441\u0442\u0435\u043D: <span class="font-medium">${totalWallsArea.toFixed(2)} \u043C\u00B2</span></div>
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
          '\u041A\u043E\u0440\u0438\u0434\u043E\u0440': 2,
          '\u0413\u0430\u0440\u0434\u0435\u0440\u043E\u0431\u043D\u0430\u044F': 1.5,
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
      
      roomData[roomId].livingRooms[index][field] = val;
      
      // Update walls area display
      const wallsArea = calculateLivingRoomWallsArea(roomData[roomId].livingRooms[index]);
      roomData[roomId].livingRooms[index].wallsArea = wallsArea;
      
      // Update the input field
      const wallsInput = document.querySelector(`#livingRoom_${index}Group_${roomId} input[data-field="wallsArea"]`);
      if (wallsInput) {
        wallsInput.value = wallsArea.toFixed(2);
      }
      
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
      
      roomData = {
        living: {
          area: 0,
          wallsArea: 0,
          livingRoomCount: 0,
          livingRooms: [],
          floors: []
        },
        nonliving: {
          area: 0,
          wallsArea: 0,
          livingRoomCount: 0,
          livingRooms: [],
          floors: []
        }
      };
      
      document.getElementById('totalAreaCalc').textContent = '0 м²';
      document.getElementById('totalWallsCalc').textContent = '0 \u043C\u00B2';
    }
    
    const buildingSubtypes = {
      'multiapartment': [
        {value: 'modern', label: '\u0421\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0439 \u0434\u043E\u043C'},
        {value: 'stalinka', label: '\u0421\u0442\u0430\u043B\u0438\u043D\u043A\u0430 (1930\u20131950 \u0445 \u0433\u0433.)'},
        {value: 'khrushchevka', label: '\u0425\u0440\u0443\u0449\u0435\u0432\u043A\u0430 (1950\u20131960 \u0445 \u0433\u0433.)'},
        {value: 'brezhnevka', label: '\u0411\u0440\u0435\u0436\u043D\u0435\u0432\u043A\u0430 (1970\u20131990 \u0445 \u0433\u0433.)'}
      ],
      'individual': [
        {value: 'cottage', label: '\u041A\u043E\u0442\u0442\u0435\u0434\u0436'},
        {value: 'villa', label: '\u0412\u0438\u043B\u043B\u0430'},
        {value: 'mansion', label: '\u041E\u0441\u043E\u0431\u043D\u044F\u043A'},
        {value: 'estate', label: '\u0423\u0441\u0430\u0434\u044C\u0431\u0430'},
        {value: 'residence', label: '\u0420\u0435\u0437\u0438\u0434\u0435\u043D\u0446\u0438\u044F'},
        {value: 'ecohome', label: '\u042D\u043A\u043E\u0434\u043E\u043C'}
      ],
      'blocked': [
        {value: 'townhouse', label: '\u0422\u0430\u0443\u043D\u0445\u0430\u0443\u0441'},
        {value: 'lanehouse', label: '\u041B\u0435\u0439\u043D\u0445\u0430\u0443\u0441'},
        {value: 'duplex', label: '\u0414\u0443\u043F\u043B\u0435\u043A\u0441'},
        {value: 'triplex', label: '\u0422\u0440\u0438\u043F\u043B\u0435\u043A\u0441'},
        {value: 'quadrohouse', label: '\u041A\u0432\u0430\u0434\u0440\u043E\u0445\u0430\u0443\u0441'},
        {value: 'maisonette', label: '\u041C\u0435\u0437\u043E\u043D\u0435\u0442'}
      ],
      'business': [
        {value: 'office', label: '\u041E\u0444\u0438\u0441\u043D\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435'},
        {value: 'retail', label: '\u0422\u043E\u0440\u0433\u043E\u0432\u043E\u0435 \u0438\u043B\u0438 \u0431\u044B\u0442\u043E\u0432\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435'},
        {value: 'conference', label: '\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446-\u0437\u043E\u043D\u0430, \u043F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u043D\u0430\u044F'},
        {value: 'public', label: '\u041E\u0431\u0449\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u0430\u044F \u0438 \u0441\u0435\u0440\u0432\u0438\u0441\u043D\u0430\u044F \u0437\u043E\u043D\u0430'},
        {value: 'infrastructure', label: '\u0418\u043D\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u043D\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435'},
        {value: 'fitness', label: '\u041F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435 \u0434\u043B\u044F \u0441\u043F\u043E\u0440\u0442\u0430 \u0438 \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F'},
        {value: 'special', label: '\u0421\u043F\u0435\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435'},
        {value: 'warehouse', label: '\u0421\u043A\u043B\u0430\u0434\u0441\u043A\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435'}
      ]
    };
    
    const buildingAppointments = {
      'office': [
        {value: 'open_space', label: 'Open space'},
        {value: 'corridor', label: '\u041A\u0430\u0431\u0438\u043D\u0435\u0442\u043D\u043E-\u043A\u043E\u0440\u0438\u0434\u043E\u0440\u043D\u0430\u044F \u0441\u0438\u0441\u0442\u0435\u043C\u0430'},
        {value: 'mixed', label: '\u0421\u043C\u0435\u0448\u0430\u043D\u043D\u0430\u044F \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u043A\u0430'},
        {value: 'rent_floors', label: '\u0410\u0440\u0435\u043D\u0434\u0443\u0435\u043C\u044B\u0435 \u044D\u0442\u0430\u0436\u0438'}
      ],
      'retail': [
        {value: 'store', label: '\u041C\u0430\u0433\u0430\u0437\u0438\u043D \u0438\u043B\u0438 \u0431\u0443\u0442\u0438\u043A'},
        {value: 'beauty_salon', label: '\u0421\u0430\u043B\u043E\u043D \u043A\u0440\u0430\u0441\u043E\u0442\u044B'},
        {value: 'pharmacy', label: '\u0410\u043F\u0442\u0435\u043A\u0430'},
        {value: 'laundry', label: '\u041F\u0440\u0430\u0447\u0435\u0447\u043D\u0430\u044F \u0438\u043B\u0438 \u0445\u0438\u043C\u0447\u0438\u0441\u0442\u043A\u0430'}
      ],
      'conference': [
        {value: 'conference_hall', label: '\u041A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446-\u0437\u0430\u043B'},
        {value: 'video_conference', label: '\u0412\u0438\u0434\u0435\u043E\u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446-\u0437\u0430\u043B'},
        {value: 'meeting_room', label: '\u041F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u043D\u0430\u044F \u043A\u043E\u043C\u043D\u0430\u0442\u0430'},
        {value: 'brainstorm', label: '\u0417\u043E\u043D\u0430 \u0434\u043B\u044F \u043C\u043E\u0437\u0433\u043E\u0432\u043E\u0433\u043E \u0448\u0442\u0443\u0440\u043C\u0430'}
      ],
      'public': [
        {value: 'lobby', label: '\u041B\u043E\u0431\u0431\u0438'},
        {value: 'reception', label: '\u0420\u0435\u0441\u0435\u043F\u0448\u0435\u043D'},
        {value: 'elevator_hall', label: '\u041B\u0438\u0444\u0442\u043E\u0432\u043E\u0439 \u0445\u043E\u043B\u043B'},
        {value: 'coworking', label: '\u041A\u043E\u0432\u043E\u0440\u043A\u0438\u043D\u0433 \u0437\u043E\u043D\u0430'},
        {value: 'cafe', label: '\u041A\u0430\u0444\u0435'},
        {value: 'dining', label: '\u0421\u0442\u043E\u043B\u043E\u0432\u0430\u044F'},
        {value: 'atm_zone', label: '\u0417\u043E\u043D\u0430 \u0434\u043B\u044F \u0431\u0430\u043D\u043A\u043E\u043C\u0430\u0442\u0430'},
        {value: 'post_zone', label: '\u041F\u043E\u0447\u0442\u043E\u0432\u043E-\u043A\u0443\u0440\u044C\u0435\u0440\u0441\u043A\u0430\u044F \u0437\u043E\u043D\u0430'}
      ],
      'infrastructure': [
        {value: 'wardrobe', label: '\u0413\u0430\u0440\u0434\u0435\u0440\u043E\u0431\u043D\u0430\u044F'},
        {value: 'shower', label: '\u0414\u0443\u0448\u0435\u0432\u0430\u044F \u0438 \u0440\u0430\u0437\u0434\u0435\u0432\u0430\u043B\u043A\u0430'},
        {value: 'parking', label: '\u041F\u0430\u0440\u043A\u043E\u0432\u043A\u0430'},
        {value: 'bike_parking', label: '\u0412\u0435\u043B\u043E\u043F\u0430\u0440\u043A\u043E\u0432\u043A\u0430'},
        {value: 'ev_charging', label: '\u0421\u0442\u0430\u043D\u0446\u0438\u044F \u0437\u0430\u0440\u044F\u0434\u043A\u0438 \u044D\u043B\u0435\u043A\u0442\u0440\u043E\u043A\u0430\u0440\u043E\u0432'}
      ],
      'fitness': [
        {value: 'gym', label: '\u0424\u0438\u0442\u043D\u0435\u0441-\u0437\u0430\u043B'},
        {value: 'spa', label: '\u0421\u043F\u0430-\u0437\u043E\u043D\u0430'},
        {value: 'massage', label: '\u041C\u0430\u0441\u0441\u0430\u0436\u043D\u044B\u0439 \u043A\u0430\u0431\u0438\u043D\u0435\u0442'},
        {value: 'gymnastics', label: '\u041A\u0430\u0431\u0438\u043D\u0435\u0442 \u0434\u043B\u044F \u0433\u0438\u043C\u043D\u0430\u0441\u0442\u0438\u043A\u0438'}
      ],
      'special': [
        {value: 'security', label: '\u041F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435 \u0434\u043B\u044F \u043E\u0445\u0440\u0430\u043D\u044B'},
        {value: 'archive', label: '\u0410\u0440\u0445\u0438\u0432\u043D\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435'}
      ],
      'warehouse': [
        {value: 'warehouse_zone', label: '\u0421\u043A\u043B\u0430\u0434\u0441\u043A\u0430\u044F \u0437\u043E\u043D\u0430'},
        {value: 'storage', label: '\u041A\u043B\u0430\u0434\u043E\u0432\u0430\u044F'}
      ]
    };
    
    const buildingMaterials = {
      'multiapartment_modern': [
        {value: 'monolithic', label: '\u041C\u043E\u043D\u043E\u043B\u0438\u0442\u043D\u044B\u0439'},
        {value: 'brick_monolithic', label: '\u041A\u0438\u0440\u043F\u0438\u0447\u043D\u043E-\u043C\u043E\u043D\u043E\u043B\u0438\u0442\u043D\u044B\u0439'},
        {value: 'panel', label: '\u041F\u0430\u043D\u0435\u043B\u044C\u043D\u044B\u0439'},
        {value: 'brick', label: '\u041A\u0438\u0440\u043F\u0438\u0447\u043D\u044B\u0439'},
        {value: 'wood', label: '\u0414\u0435\u0440\u0435\u0432\u044F\u043D\u043D\u044B\u0439'},
        {value: 'aerated_concrete', label: '\u0418\u0437 \u0433\u0430\u0437\u043E\u0431\u0435\u0442\u043E\u043D\u0430'},
        {value: 'aerated_silicate', label: '\u0418\u0437 \u0433\u0430\u0437\u043E\u0441\u0438\u043B\u0438\u043A\u0430\u0442\u0430'},
        {value: 'foam_concrete', label: '\u0418\u0437 \u043F\u0435\u043D\u043E\u0431\u0435\u0442\u043E\u043D\u0430'},
        {value: 'sip', label: '\u0418\u0437 SIP \u043F\u0430\u043D\u0435\u043B\u0435\u0439'}
      ],
      'multiapartment_stalinka': [
        {value: 'brick', label: '\u041A\u0438\u0440\u043F\u0438\u0447\u043D\u044B\u0439'}
      ],
      'multiapartment_khrushchevka': [
        {value: 'panel', label: '\u041F\u0430\u043D\u0435\u043B\u044C\u043D\u044B\u0439'}
      ],
      'multiapartment_brezhnevka': [
        {value: 'panel', label: '\u041F\u0430\u043D\u0435\u043B\u044C\u043D\u044B\u0439'}
      ],
      'individual': [
        {value: 'monolithic', label: '\u041C\u043E\u043D\u043E\u043B\u0438\u0442\u043D\u044B\u0439'},
        {value: 'brick_monolithic', label: '\u041A\u0438\u0440\u043F\u0438\u0447\u043D\u043E-\u043C\u043E\u043D\u043E\u043B\u0438\u0442\u043D\u044B\u0439'},
        {value: 'panel', label: '\u041F\u0430\u043D\u0435\u043B\u044C\u043D\u044B\u0439'},
        {value: 'brick', label: '\u041A\u0438\u0440\u043F\u0438\u0447\u043D\u044B\u0439'},
        {value: 'wood', label: '\u0414\u0435\u0440\u0435\u0432\u044F\u043D\u043D\u044B\u0439'},
        {value: 'aerated_concrete', label: '\u0418\u0437 \u0433\u0430\u0437\u043E\u0431\u0435\u0442\u043E\u043D\u0430'},
        {value: 'aerated_silicate', label: '\u0418\u0437 \u0433\u0430\u0437\u043E\u0441\u0438\u043B\u0438\u043A\u0430\u0442\u0430'},
        {value: 'foam_concrete', label: '\u0418\u0437 \u043F\u0435\u043D\u043E\u0431\u0435\u0442\u043E\u043D\u0430'},
        {value: 'sip', label: '\u0418\u0437 SIP \u043F\u0430\u043D\u0435\u043B\u0435\u0439'}
      ],
      'blocked': [
        {value: 'monolithic', label: '\u041C\u043E\u043D\u043E\u043B\u0438\u0442\u043D\u044B\u0439'},
        {value: 'brick_monolithic', label: '\u041A\u0438\u0440\u043F\u0438\u0447\u043D\u043E-\u043C\u043E\u043D\u043E\u043B\u0438\u0442\u043D\u044B\u0439'},
        {value: 'panel', label: '\u041F\u0430\u043D\u0435\u043B\u044C\u043D\u044B\u0439'},
        {value: 'brick', label: '\u041A\u0438\u0440\u043F\u0438\u0447\u043D\u044B\u0439'},
        {value: 'wood', label: '\u0414\u0435\u0440\u0435\u0432\u044F\u043D\u043D\u044B\u0439'},
        {value: 'aerated_concrete', label: '\u0418\u0437 \u0433\u0430\u0437\u043E\u0431\u0435\u0442\u043E\u043D\u0430'},
        {value: 'aerated_silicate', label: '\u0418\u0437 \u0433\u0430\u0437\u043E\u0441\u0438\u043B\u0438\u043A\u0430\u0442\u0430'},
        {value: 'foam_concrete', label: '\u0418\u0437 \u043F\u0435\u043D\u043E\u0431\u0435\u0442\u043E\u043D\u0430'},
        {value: 'sip', label: '\u0418\u0437 SIP \u043F\u0430\u043D\u0435\u043B\u0435\u0439'}
      ],
      'business': [
        {value: 'monolithic', label: '\u041C\u043E\u043D\u043E\u043B\u0438\u0442\u043D\u044B\u0439'},
        {value: 'brick_monolithic', label: '\u041A\u0438\u0440\u043F\u0438\u0447\u043D\u043E-\u043C\u043E\u043D\u043E\u043B\u0438\u0442\u043D\u044B\u0439'},
        {value: 'panel', label: '\u041F\u0430\u043D\u0435\u043B\u044C\u043D\u044B\u0439'},
        {value: 'brick', label: '\u041A\u0438\u0440\u043F\u0438\u0447\u043D\u044B\u0439'},
        {value: 'sip', label: '\u0418\u0437 SIP \u043F\u0430\u043D\u0435\u043B\u0435\u0439'}
      ]
    };
    
    function updateBuildingSubtype() {
      const buildingType = document.getElementById('buildingType').value;
      const subtypeContainer = document.getElementById('buildingSubtypeContainer');
      const subtypeSelect = document.getElementById('buildingSubtype');
      const appointmentContainer = document.getElementById('buildingAppointmentContainer');
      const materialContainer = document.getElementById('buildingMaterialContainer');
      
      subtypeSelect.innerHTML = '<option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0438\u043F \u0441\u0442\u0440\u043E\u0435\u043D\u0438\u044F</option>';
      appointmentContainer.style.display = 'none';
      materialContainer.style.display = 'none';
      
      if (buildingType && buildingSubtypes[buildingType]) {
        subtypeContainer.style.display = 'block';
        buildingSubtypes[buildingType].forEach(item => {
          subtypeSelect.innerHTML += `<option value="${item.value}">${item.label}</option>`;
        });
      } else {
        subtypeContainer.style.display = 'none';
      }
      
      document.getElementById('buildingSubAppointmentContainer').style.display = 'none';
    }
    
    function updateBuildingMaterial() {
      const buildingType = document.getElementById('buildingType').value;
      const buildingSubtype = document.getElementById('buildingSubtype').value;
      const materialContainer = document.getElementById('buildingMaterialContainer');
      const materialSelect = document.getElementById('buildingMaterial');
      const appointmentContainer = document.getElementById('buildingAppointmentContainer');
      
      materialSelect.innerHTML = '<option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B</option>';
      materialContainer.style.display = 'none';
      
      if (buildingType === 'business' && buildingSubtype) {
        appointmentContainer.style.display = 'block';
        const appointmentSelect = document.getElementById('buildingAppointment');
        appointmentSelect.innerHTML = '<option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435</option>';
        
        if (buildingAppointments[buildingSubtype]) {
          buildingAppointments[buildingSubtype].forEach(item => {
            appointmentSelect.innerHTML += `<option value="${item.value}">${item.label}</option>`;
          });
        }
        
        if (buildingMaterials[buildingType]) {
          materialContainer.style.display = 'block';
          buildingMaterials[buildingType].forEach(item => {
            materialSelect.innerHTML += `<option value="${item.value}">${item.label}</option>`;
          });
        }
      } else if (buildingType && buildingSubtype) {
        appointmentContainer.style.display = 'none';
        document.getElementById('buildingSubAppointmentContainer').style.display = 'none';
        
        let key = buildingType + '_' + buildingSubtype;
        if (!buildingMaterials[key]) {
          key = buildingType;
        }
        
        if (buildingMaterials[key]) {
          materialContainer.style.display = 'block';
          buildingMaterials[key].forEach(item => {
            materialSelect.innerHTML += `<option value="${item.value}">${item.label}</option>`;
          });
        }
      }
    }
    
    function updateBuildingSubAppointment() {
      const buildingSubtype = document.getElementById('buildingSubtype').value;
      const appointment = document.getElementById('buildingAppointment').value;
      const subAppointmentContainer = document.getElementById('buildingSubAppointmentContainer');
      const subAppointmentSelect = document.getElementById('buildingSubAppointment');
      const materialContainer = document.getElementById('buildingMaterialContainer');
      const materialSelect = document.getElementById('buildingMaterial');
      
      subAppointmentSelect.innerHTML = '<option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435</option>';
      subAppointmentContainer.style.display = 'none';
      materialContainer.style.display = 'none';
      
      if (buildingMaterials['business']) {
        materialContainer.style.display = 'block';
        materialSelect.innerHTML = '<option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B</option>';
        buildingMaterials['business'].forEach(item => {
          materialSelect.innerHTML += `<option value="${item.value}">${item.label}</option>`;
        });
      }
    }
    
    function toggleFloorField() {
      const cargoElevator = document.getElementById('cargoElevator').value;
      const floorContainer = document.getElementById('floorContainer');
      
      if (cargoElevator === 'yes') {
        floorContainer.style.display = 'none';
      } else {
        floorContainer.style.display = 'block';
      }
    }
    
    let addressDebounceTimer;
    function handleAddressInput(value) {
      clearTimeout(addressDebounceTimer);
      const suggestionsBox = document.getElementById('addressSuggestions');
      
      if (value.length < 3) {
        suggestionsBox.style.display = 'none';
        return;
      }
      
      addressDebounceTimer = setTimeout(() => {
        fetchAddressSuggestions(value);
      }, 300);
    }
    
    async function fetchAddressSuggestions(query) {
      const suggestionsBox = document.getElementById('addressSuggestions');
      
      try {
        const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Token 2f7c999c9a25c4c0a3f0addd2c89120bb02731f9'
          },
          body: JSON.stringify({
            query: query,
            count: 5
          })
        });
        
        if (!response.ok) throw new Error('API error: ' + response.status);
        
        const data = await response.json();
        if (data.suggestions) {
          displaySuggestionsFromSuggest(data.suggestions);
        }
      } catch (error) {
        console.error('Address API error:', error);
        suggestionsBox.style.display = 'none';
      }
    }
    
    function displaySuggestionsFromSuggest(suggestions) {
      const suggestionsBox = document.getElementById('addressSuggestions');
      
      if (!suggestions || suggestions.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
      }
      
      let html = '';
      suggestions.forEach(item => {
        const address = item.value;
        if (address) {
          html += `<div class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onclick="selectAddress('${address.replace(/'/g, "\\'")}')">${address}</div>`;
        }
      });
      
      if (html) {
        suggestionsBox.innerHTML = html;
        suggestionsBox.style.display = 'block';
      } else {
        suggestionsBox.style.display = 'none';
      }
    }
    
    function displaySuggestions(results) {
      const suggestionsBox = document.getElementById('addressSuggestions');
      
      if (!results || results.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
      }
      
      let html = '';
      results.forEach(item => {
        const address = item.value || item.presentation;
        if (address) {
          html += `<div class="p-2 hover:bg-gray-100 cursor-pointer" onclick="selectAddress('${address.replace(/'/g, "\\'")}')">${address}</div>`;
        }
      });
      
      if (html) {
        suggestionsBox.innerHTML = html;
        suggestionsBox.style.display = 'block';
      } else {
        suggestionsBox.style.display = 'none';
      }
    }
    
    function selectAddress(address) {
      document.getElementById('addressInput').value = address;
      document.getElementById('addressSuggestions').style.display = 'none';
      
      const isMoscow = address.toLowerCase().includes('москва') || !address.toLowerCase().includes('область');
      document.getElementById('selectedCity').value = isMoscow ? 'moscow' : 'mo';
    }
    
    function toggleWetPoints() {
      const requiresRedesign = document.querySelector('input[name="requiresRedesign"]:checked')?.value;
      const wetPointsContainer = document.getElementById('wetPointsContainer');
      
      if (requiresRedesign === 'yes') {
        wetPointsContainer.style.display = 'block';
      } else {
        wetPointsContainer.style.display = 'none';
        document.getElementById('wetPointsCountContainer').style.display = 'none';
      }
    }
    
    function toggleWetPointsCount() {
      const wetPoints = document.querySelector('input[name="wetPoints"]:checked')?.value;
      const wetPointsCountContainer = document.getElementById('wetPointsCountContainer');
      
      if (wetPoints === 'yes') {
        wetPointsCountContainer.style.display = 'block';
      } else {
        wetPointsCountContainer.style.display = 'none';
      }
    }
    
    function toggleDesignProjectOptions() {
      const designProject = document.querySelector('input[name="designProject"]:checked')?.value;
      const designProjectOptions = document.getElementById('designProjectOptions');
      
      if (designProject === 'yes') {
        designProjectOptions.style.display = 'block';
      } else {
        designProjectOptions.style.display = 'none';
      }
    }
    
    function toggleCustomStyle() {
      const designStyle = document.getElementById('designStyle').value;
      const customStyleContainer = document.getElementById('customStyleContainer');
      
      if (designStyle === 'other') {
        customStyleContainer.style.display = 'block';
      } else {
        customStyleContainer.style.display = 'none';
      }
    }
    
    document.addEventListener('click', function(e) {
      if (!e.target.closest('#addressInput') && !e.target.closest('#addressSuggestions')) {
        document.getElementById('addressSuggestions').style.display = 'none';
      }
    });
    
    function renderRoomInputs() {
      const container = document.getElementById('roomInputs');
      container.innerHTML = '';
      
      const roomCategories = ['living', 'nonliving'];
      
      for (const roomId of roomCategories) {
        const room = priceData.rooms[roomId];
        if (!room) continue;
        
        const data = roomData[roomId];
        const wallsAreaRounded = Math.round(data.wallsArea);
        const isNonliving = roomId === 'nonliving';
        const roomLabel = isNonliving ? 'Нежилые комнаты:' : 'Жилые комнаты:';
        
        container.innerHTML += `
          <div class="room-card">
            <div class="room-card-header" onclick="toggleRoomCard('${roomId}')">
              <i class="fas ${room.icon} text-brand-500"></i>
              <span class="font-semibold flex-1">${room.name}</span>
              <i class="fas fa-chevron-down text-xs transition-transform" id="roomIcon_${roomId}" style="transform: rotate(-90deg)"></i>
            </div>
            <div class="room-card-content" id="roomContent_${roomId}" style="display: none">
              ${room.has_room_type ? `
              ${(() => {
                const buildingType = document.getElementById('detailedBuildingType')?.value || 'single_floor';
                if (buildingType === 'single_floor') {
                  return `
                  <div class="area-input-group">
                    <label class="text-sm text-gray-500 w-40 font-bold">${roomLabel}</label>
                    <div class="qty-controls">
                      <button type="button" class="qty-btn" onclick="changeLivingRoomCount('${roomId}', -1)">−</button>
                      <input type="number" value="${data.livingRoomCount || 0}" min="0" max="${isNonliving ? 11 : 8}"
                             class="qty-input" data-field="livingRoomCount" onchange="updateLivingRoomCount('${roomId}', this.value)">
                      <button type="button" class="qty-btn" onclick="changeLivingRoomCount('${roomId}', 1)">+</button>
                    </div>
                    <span class="text-xs text-gray-500 ml-1">шт</span>
                  </div>`;
                }
                return '';
              })()}
              ${(() => {
                const buildingType = document.getElementById('detailedBuildingType')?.value || 'single_floor';
                if (buildingType === 'multi_floor') {
                  return `
                  <div class="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                    <div class="area-input-group">
                      <label class="text-sm text-gray-500 w-24 font-bold">Этажи:</label>
                      <div class="qty-controls">
                        <button type="button" class="qty-btn" onclick="changeFloorCount('${roomId}', -1)">−</button>
                        <input type="number" id="floorCount_${roomId}" value="${data.floorCount || 0}" min="0" max="5"
                               class="qty-input" onchange="updateFloorCount('${roomId}', this.value)">
                        <button type="button" class="qty-btn" onclick="changeFloorCount('${roomId}', 1)">+</button>
                      </div>
                      <span class="text-xs text-gray-500 ml-1">этажей</span>
                    </div>
                    <div id="floorsContainer_${roomId}"></div>
                  </div>`;
                }
                return '';
              })()}
              ${(() => {
                const buildingType = document.getElementById('detailedBuildingType')?.value || 'single_floor';
                if (buildingType === 'single_floor') {
                  return `<span class="text-xs text-gray-400">${isNonliving ? 'Комнаты, требующие ремонта' : 'Комнаты, требующие ремонта'}</span>`;
                }
                return '';
              })()}
              <div id="livingRoomsContainer_${roomId}"></div>
              <div id="livingRoomsTotal_${roomId}" class="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600"></div>
              ` : `
              <div class="area-input-group">
                <label class="text-xs text-gray-500 w-16">Площадь:</label>
                <input type="number" value="${data.area}" min="1" max="200"
                       class="area-input" data-field="area"
                       onchange="updateRoomData('${roomId}', 'area', this.value)"
                       oninput="updateRoomData('${roomId}', 'area', this.value)">
                <span class="text-xs text-gray-500">м²</span>
              </div>
              <div class="area-input-group">
                <label class="text-xs text-gray-500 w-16">Стены:</label>
                <input type="number" value="${wallsAreaRounded}" min="0" max="500"
                       class="area-input" data-field="wallsArea"
                       onchange="updateRoomData('${roomId}', 'wallsArea', this.value)"
                       oninput="updateRoomData('${roomId}', 'wallsArea', this.value)">
                <span class="text-xs text-gray-500">м²</span>
              </div>
              <div class="text-[10px] text-gray-400 mb-2">Площадь стен считается автоматически</div>
              ${renderDoorSizes(room, data, roomId)}
              ${renderWindowSizes(room, data, roomId)}
              ${renderBalconySizes(room, data, roomId)}
              `}
            </div>
          </div>
        `;
      }
      
      updateTotalAreas();
      
      for (const roomId of roomCategories) {
        const room = priceData.rooms[roomId];
        if (room && room.has_room_type && roomData[roomId].livingRoomCount > 0) {
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
      const rooms = roomData[roomId]?.floors?.[floorIndex]?.livingRooms || [];
      rooms.forEach((room, idx) => {
        const groupId = 'floorRoom_' + floorIndex + '_' + idx + 'Group_' + roomId;
        const group = document.getElementById(groupId);
        expandedStates[idx] = group && group.classList.contains('expanded');
        
        const constructionsGroup = document.getElementById('floorConstructions_' + floorIndex + '_' + idx + 'Group_' + roomId);
        expandedStates['constructions_' + idx] = constructionsGroup && constructionsGroup.classList.contains('expanded');
        
        const materialsGroup = document.getElementById('floorMaterials_' + floorIndex + '_' + idx + 'Group_' + roomId);
        expandedStates['materials_' + idx] = materialsGroup && materialsGroup.classList.contains('expanded');
      });
      
      renderFn();
      
      rooms.forEach((room, idx) => {
        const groupId = 'floorRoom_' + floorIndex + '_' + idx + 'Group_' + roomId;
        const group = document.getElementById(groupId);
        if (group && expandedStates[idx]) {
          group.classList.add('expanded');
          group.style.display = 'block';
          const icon = document.getElementById('floorRoom_' + floorIndex + '_' + idx + 'Icon_' + roomId);
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
        
        const constructionsGroup = document.getElementById('floorConstructions_' + floorIndex + '_' + idx + 'Group_' + roomId);
        if (constructionsGroup && expandedStates['constructions_' + idx]) {
          constructionsGroup.classList.add('expanded');
          constructionsGroup.style.display = 'block';
          const icon = document.getElementById('floorConstructions_' + floorIndex + '_' + idx + 'Icon_' + roomId);
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
        
        const materialsGroup = document.getElementById('floorMaterials_' + floorIndex + '_' + idx + 'Group_' + roomId);
        if (materialsGroup && expandedStates['materials_' + idx]) {
          materialsGroup.classList.add('expanded');
          materialsGroup.style.display = 'block';
          const icon = document.getElementById('floorMaterials_' + floorIndex + '_' + idx + 'Icon_' + roomId);
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
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
      
      if (iconEl) iconEl.className = 'fas ' + icon;
      if (textEl) textEl.textContent = value;
      if (dropdown) dropdown.style.display = 'none';
      
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
                <label class="text-xs text-gray-500 w-16">Кол-во:</label>
                <div class="qty-controls">
                  <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'balcony', -1)">−</button>
                  <input type="number" value="${data.balcony}" min="0" max="5"
                         class="qty-input" data-field="balcony" onchange="updateRoomData('${roomId}', 'balcony', this.value)">
                  <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'balcony', 1)">+</button>
                </div>
                <span class="text-xs text-gray-500 ml-1">шт</span>
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
                <label class="text-xs text-gray-500 w-16">Кол-во:</label>
                <div class="qty-controls">
                  <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'windows', -1)">−</button>
                  <input type="number" value="${data.windows}" min="0" max="5"
                         class="qty-input" data-field="windows" onchange="updateRoomData('${roomId}', 'windows', this.value)">
                  <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'windows', 1)">+</button>
                </div>
                <span class="text-xs text-gray-500 ml-1">шт</span>
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
                <label class="text-xs text-gray-500 w-16">Кол-во:</label>
                <div class="qty-controls">
                  <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'doors', -1)">−</button>
                  <input type="number" value="${data.doors}" min="0" max="5"
                         class="qty-input" data-field="doors" onchange="updateRoomData('${roomId}', 'doors', this.value)">
                  <button type="button" class="qty-btn" onclick="changeRoomField('${roomId}', 'doors', 1)">+</button>
                </div>
                <span class="text-xs text-gray-500 ml-1">шт</span>
              </div>
              ${doorSizeInputs}`;
          }
        }
      }
      
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
    }
    
    function updateWorksMaterialsDisplay() {
      for (const [roomId, room] of Object.entries(priceData.rooms)) {
        let data = roomData[roomId];
        if (!data) continue;

        if (room?.has_room_type) {
          let totalFloorArea = 0;
          let totalWallsArea = 0;
          if (Array.isArray(data.livingRooms) && data.livingRooms.length > 0) {
            data.livingRooms.forEach(item => {
              totalFloorArea += parseFloat(item?.area) || 0;
              totalWallsArea += calculateLivingRoomWallsArea(item || {});
            });
          }
          if (Array.isArray(data.floors) && data.floors.length > 0) {
            data.floors.forEach(floor => {
              if (!Array.isArray(floor?.livingRooms)) return;
              floor.livingRooms.forEach(item => {
                totalFloorArea += parseFloat(item?.area) || 0;
                totalWallsArea += calculateLivingRoomWallsArea(item || {});
              });
            });
          }
          data = { ...data, area: totalFloorArea, wallsArea: totalWallsArea };
        }
        
        const roomInfoSpan = document.getElementById(`roomInfo_${roomId}`);
        if (roomInfoSpan) {
          roomInfoSpan.textContent = `(${data.area} м² пол, ${Math.round(data.wallsArea)} м² стен)`;
        }
        
        for (const surface of ['floor', 'walls', 'ceiling']) {
          const area = surface === 'walls' ? Math.round(data.wallsArea) : data.area;
          
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
      const container = document.getElementById('worksByRoom');
      if (!container) return;
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
        
        let data = roomData[roomId];
        
        // For rooms with has_room_type, calculate totals from livingRooms + floors
        if (room.has_room_type) {
          let totalFloorArea = 0;
          let totalWallsArea = 0;
          if (data.livingRooms?.length > 0) {
            data.livingRooms.forEach(r => {
              totalFloorArea += parseFloat(r.area) || 0;
              totalWallsArea += calculateLivingRoomWallsArea(r);
            });
          }
          if (data.floors?.length > 0) {
            data.floors.forEach(floor => {
              if (floor.livingRooms?.length > 0) {
                floor.livingRooms.forEach(r => {
                  totalFloorArea += parseFloat(r.area) || 0;
                  totalWallsArea += calculateLivingRoomWallsArea(r);
                });
              }
            });
          }
          data = { ...data, area: totalFloorArea, wallsArea: totalWallsArea };
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
          
          const surfaceArea = surface.id === 'floor' || surface.id === 'ceiling' ? data.area : data.wallsArea;
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
        
        let data = roomData[roomId];
        
        // For rooms with has_room_type, calculate totals from livingRooms
        if (room.has_room_type && data.livingRooms?.length > 0) {
          let totalFloorArea = 0;
          let totalWallsArea = 0;
          data.livingRooms.forEach(r => {
            totalFloorArea += parseFloat(r.area) || 0;
            totalWallsArea += calculateLivingRoomWallsArea(r);
          });
          data = { ...data, area: totalFloorArea, wallsArea: totalWallsArea };
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
          
          const surfaceArea = !data ? 0 : ((surface.id === 'electrical' || surface.id === 'doors_windows') ? 0 : (surface.id === 'floor' || surface.id === 'ceiling' ? (data.area || 0) : (data.wallsArea || 0)));
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
                                                      const roomD = roomData[roomId];
                                                      if (roomD) {
                                                        // Определяем площадь по surface.id, а не по ключу
                                                        if (surface.id === 'ceiling') {
                                                          area = roomD.area || 0;
                                                        } else if (surface.id === 'floor') {
                                                          area = roomD.area || 0;
                                                        } else {
                                                          area = roomD.wallsArea || 0;
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
                                        const roomD = roomData[roomId];
                                        if (roomD) {
                                          // Определяем площадь по surface.id
                                          if (surface.id === 'ceiling') {
                                            area = roomD.area || 0;
                                          } else if (surface.id === 'floor') {
                                            area = roomD.area || 0;
                                          } else {
                                            area = roomD.wallsArea || 0;
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
                for (const [roomId, roomD] of Object.entries(roomData)) {
                  if (key.includes(`_${roomId}_`) || key.includes(`_${roomId}`)) {
                    if (key.includes('wall')) {
                      area = roomD.wallsArea;
                    } else if (key.includes('ceiling')) {
                      area = roomD.area;
                    } else {
                      area = roomD.area;
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
                    const roomD = roomData[roomId];
                    if (roomD) {
                      // Определяем площадь по surface
                      if (surface === 'ceiling' || surface === 'floor') {
                        area = roomD.area || 0;
                      } else {
                        area = roomD.wallsArea || 0;
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
                const roomD = roomData[roomId];
                if (roomD) {
                  if (key.includes('wall')) {
                    area = roomD.wallsArea;
                  } else if (key.includes('ceiling')) {
                    area = roomD.area;
                  } else {
                    area = roomD.area;
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
                    const roomD = roomData[roomId];
                    if (roomD) {
                      // Определяем площадь по surface
                      if (surface === 'ceiling' || surface === 'floor') {
                        area = roomD.area || 0;
                      } else {
                        area = roomD.wallsArea || 0;
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
                  const roomD = roomData[roomId];
                  if (roomD) {
                    if (surface === 'ceiling' || surface === 'floor') {
                      area = roomD.area || 0;
                    } else {
                      area = roomD.wallsArea || 0;
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
      const linkedWorksEstimate = typeof calculateWhatToDoWorksEstimate === 'function'
        ? calculateWhatToDoWorksEstimate(roomData)
        : null;
      
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
            const room = priceData.rooms[roomId];
            let data = roomData[roomId];
            
            // For rooms with has_room_type, calculate totals from livingRooms
            if (room?.has_room_type && data.livingRooms?.length > 0) {
              let totalFloorArea = 0;
              let totalWallsArea = 0;
              data.livingRooms.forEach(r => {
                totalFloorArea += parseFloat(r.area) || 0;
                totalWallsArea += calculateLivingRoomWallsArea(r);
              });
              data = { ...data, area: totalFloorArea, wallsArea: totalWallsArea };
            }
            
            if (item.is_perimeter) {
              qty = Math.sqrt(data.area) * 4 * 1.1;
            } else if (surface === 'walls') {
              qty = data.wallsArea;
            } else {
              qty = data.area;
            }
          }
          
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
                const roomD = roomData[roomId];
                if (roomD) {
                  // For rooms with has_room_type, calculate totals from livingRooms
                  if (room.has_room_type && roomD.livingRooms?.length > 0) {
                    let totalFloorArea = 0;
                    let totalWallsArea = 0;
                    roomD.livingRooms.forEach(r => {
                      totalFloorArea += parseFloat(r.area) || 0;
                      totalWallsArea += calculateLivingRoomWallsArea(r);
                    });
                    if (key.includes('wall')) {
                      area += totalWallsArea;
                    } else {
                      area += totalFloorArea;
                    }
                  } else {
                    if (key.includes('wall')) {
                      area += roomD.wallsArea || 0;
                    } else if (key.includes('ceiling')) {
                      area += roomD.area || 0;
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
            catSum += baseCost + extraCost;
          } else if (key.startsWith('mat_') && parts[1] && priceData.rooms[parts[1]] && !key.includes('waterproofing') && !key.includes('electrical_materials') && !key.includes('doors_windows')) {
            // Regular surface-based items (mat_roomId_surface_xxx) - но НЕ электротовары
            const roomId = parts[1];
            const room = priceData.rooms[roomId];
            const surface = parts[2];
            let data = roomData[roomId];
            if (!data) continue;
            
            // For rooms with has_room_type, calculate totals from livingRooms
            if (room?.has_room_type && data.livingRooms?.length > 0) {
              let totalFloorArea = 0;
              let totalWallsArea = 0;
              data.livingRooms.forEach(r => {
                totalFloorArea += parseFloat(r.area) || 0;
                totalWallsArea += calculateLivingRoomWallsArea(r);
              });
              data = { ...data, area: totalFloorArea, wallsArea: totalWallsArea };
            }
            
            let area = 0;
            // Определяем площадь по surface, а не по ключу
            if (surface === 'ceiling' || surface === 'floor') {
              area = data.area || 0;
            } else {
              area = data.wallsArea || 0;
            }
            
            // Новая формула: база + дополнительные единицы
            const baseCost = materialPrice * area * consumption;
            const qtyValue = itemQuantities[key];
            const qtyExtra = (qtyValue === undefined || qtyValue === null) ? 0 : qtyValue;
            const extraCost = materialPrice * qtyExtra;
            catSum += baseCost + extraCost;
          } else if (key.includes('electrical_materials') || key.includes('doors_windows')) {
            // Электротовары и двери/окна - только поштучно, без площади
            const qty = itemQuantities[key] || 1;
            catSum += materialPrice * qty;
          } else {
            // Per-piece items (electrical, plumbing, doors)
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
      
      if (linkedWorksEstimate && linkedWorksEstimate.itemCount > 0) {
        worksTotal = linkedWorksEstimate.total;
      } else {
        worksTotal *= buildingMultiplier;
      }
      materialsTotal *= buildingMultiplier;
      
      const grandTotal = worksTotal + materialsTotal + additionalTotal;
      
      const worksTotalEl = document.getElementById('worksTotalDisplay');
      const materialsTotalEl = document.getElementById('materialsTotalDisplay');
      const additionalTotalEl = document.getElementById('additionalTotalDisplay');
      const detailedWorksTotalEl = document.getElementById('detailedWorksTotal');
      const detailedMaterialsTotalEl = document.getElementById('detailedMaterialsTotal');
      const detailedAdditionalTotalEl = document.getElementById('detailedAdditionalTotal');
      const detailedGrandTotalEl = document.getElementById('detailedGrandTotal');
      const detailedTotalEl = document.getElementById('detailedTotal');
      
      if (worksTotalEl) worksTotalEl.textContent = worksTotal.toLocaleString('ru-RU') + ' ₽';
      if (materialsTotalEl) materialsTotalEl.textContent = materialsTotal.toLocaleString('ru-RU') + ' ₽';
      if (additionalTotalEl) additionalTotalEl.textContent = additionalTotal.toLocaleString('ru-RU') + ' ₽';
      if (detailedWorksTotalEl) detailedWorksTotalEl.textContent = worksTotal.toLocaleString('ru-RU') + ' ₽';
      if (detailedMaterialsTotalEl) detailedMaterialsTotalEl.textContent = materialsTotal.toLocaleString('ru-RU') + ' ₽';
      if (detailedAdditionalTotalEl) detailedAdditionalTotalEl.textContent = additionalTotal.toLocaleString('ru-RU') + ' ₽';
      if (detailedGrandTotalEl) detailedGrandTotalEl.textContent = grandTotal.toLocaleString('ru-RU') + ' ₽';
      if (detailedTotalEl) detailedTotalEl.textContent = grandTotal.toLocaleString('ru-RU') + ' ₽';
      
      // Room breakdown
      let breakdownHtml = '';
      const formatLinkedRoomLabel = (roomId) => {
        if (roomId.startsWith('demo_living_')) return 'Демонтаж: жилое помещение';
        if (roomId.startsWith('demo_nonliving_')) return 'Демонтаж: нежилое помещение';
        if (roomId.startsWith('repair_living_')) return 'Ремонт: жилое помещение';
        if (roomId.startsWith('repair_nonliving_')) return 'Ремонт: нежилое помещение';
        return roomId;
      };

      if (linkedWorksEstimate && linkedWorksEstimate.itemCount > 0) {
        const grouped = linkedWorksEstimate.lines.reduce((acc, line) => {
          const key = line.roomId || 'unknown';
          acc[key] = (acc[key] || 0) + line.total;
          return acc;
        }, {});

        breakdownHtml = Object.entries(grouped)
          .filter(([, total]) => total > 0)
          .map(([roomId, total]) => `
            <div class="flex justify-between text-xs py-1 border-b border-gray-700">
              <span class="text-gray-400">${formatLinkedRoomLabel(roomId)}:</span>
              <span class="text-white">${total.toLocaleString('ru-RU')} ₽</span>
            </div>
          `)
          .join('');
      } else {
        for (const [roomId, data] of Object.entries(roomData)) {
          const room = priceData.rooms[roomId];
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
                  if (key.includes('_wall')) area = data.wallsArea;
                  else if (key.includes('_ceiling')) area = data.area;
                  else area = data.area;
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
                      area = data.area || 0;
                    } else {
                      area = data.wallsArea || 0;
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
                <span class="text-white">${roomTotal.toLocaleString('ru-RU')} ₽</span>
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
      updateCalcAuditPanel(grandTotal);
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
            syncAppStateToNamespace();
            initRoomData();
            renderRoomInputs();
            renderWorksByRoom();
            renderMaterialsByRoom();
            renderAdditionalServices();
            toggleSection('estimateDataSection', true);
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
        toggleSection('estimateDataSection', true);
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
      if (window.App && typeof window.App.init === 'function') {
        window.App.init();
      } else {
        loadPrices();
      }
    });
