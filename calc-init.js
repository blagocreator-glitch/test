// Module: calc-init.js
    function applySavedInterfaceModes() {
      const root = document.documentElement;
      const savedTheme = localStorage.getItem('vmTheme');
      const savedVision = localStorage.getItem('vmVisionMode');
      root.classList.toggle('dark', savedTheme === 'dark');
      root.classList.toggle('vision-accessibility', savedVision === 'on');
      const visionBtn = document.getElementById('visionModeBtn');
      if (visionBtn) {
        visionBtn.classList.toggle('is-active', savedVision === 'on');
        visionBtn.setAttribute('aria-pressed', savedVision === 'on' ? 'true' : 'false');
      }
    }

    function toggleTheme() {
      const root = document.documentElement;
      const nextDark = !root.classList.contains('dark');
      root.classList.toggle('dark', nextDark);
      localStorage.setItem('vmTheme', nextDark ? 'dark' : 'light');
    }

    function toggleVisionMode() {
      const root = document.documentElement;
      const nextEnabled = !root.classList.contains('vision-accessibility');
      root.classList.toggle('vision-accessibility', nextEnabled);
      localStorage.setItem('vmVisionMode', nextEnabled ? 'on' : 'off');
      const visionBtn = document.getElementById('visionModeBtn');
      if (visionBtn) {
        visionBtn.classList.toggle('is-active', nextEnabled);
        visionBtn.setAttribute('aria-pressed', nextEnabled ? 'true' : 'false');
      }
    }

    window.toggleTheme = toggleTheme;
    window.toggleVisionMode = toggleVisionMode;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applySavedInterfaceModes);
    } else {
      applySavedInterfaceModes();
    }

    function loadPrices() {
      if (!priceData) {
        fetch('prices.json?v=' + new Date().getTime())
          .then(response => response.json())
          .then(data => {
            priceData = data;
            for (const [roomId, room] of Object.entries(priceData.rooms)) {
              if (room.room_types) {
                room.room_types = room.room_types.filter(type => !['Мансарда', 'Цокольное помещение', 'Подвал'].includes(type.name));
                room.default_room_types = JSON.parse(JSON.stringify(room.room_types));
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
          livingRooms: [],
          floorCount: 1,
          floors: [{ floorNumber: 1, location: 'above_ground', livingRooms: [] }]
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

    function hasMeaningfulWhatToDoValue(value) {
      if (Array.isArray(value)) return value.some(hasMeaningfulWhatToDoValue);
      if (!value || typeof value !== 'object') return false;
      if (value.manualEntry || value.manualEdited || value.autoFilled || value.autoSource === 'quest') return true;
      return ['type', 'workId', 'id', 'material', 'mounting', 'standard'].some(key => value[key])
        || ['qty', 'area', 'length', 'width', 'height', 'total', 'amount'].some(key => Number(value[key] || 0) > 0)
        || Object.values(value).some(item => Array.isArray(item) && item.some(hasMeaningfulWhatToDoValue));
    }

    function hasDemolitionRoomData(roomId) {
      const data = roomData.demolitionData?.[roomId];
      if (!data) return false;
      return [
        data.partitions,
        data.doorOpenings,
        data.windowOpenings,
        data.balconyOpenings,
        data.electrical,
        data.ventilation,
        data.water,
        data.drainage,
        data.plumbing,
        data.heating,
        data.staircase,
        data.railing,
        data.finishing?.floor,
        data.finishing?.wall,
        data.finishing?.ceiling
      ].some(hasMeaningfulWhatToDoValue);
    }

    function hasRepairRoomData(roomId) {
      const data = roomData.repairData?.[roomId];
      if (!data) return false;
      return [
        data.rough?.floorLeveling,
        data.rough?.wallPlaster,
        data.rough?.wallPutty,
        data.rough?.wallWaterproof,
        data.rough?.partitions,
        data.rough?.surfaceProtection,
        data.rough?.ceilingPrep,
        data.engineering?.electrical,
        data.engineering?.ventilation,
        data.engineering?.water,
        data.engineering?.drainage,
        data.engineering?.heating,
        data.finishing?.floor,
        data.finishing?.wall,
        data.finishing?.ceiling,
        data.finishing?.stairs,
        data.finishing?.openings?.door,
        data.finishing?.openings?.window,
        data.finishing?.openings?.balcony,
        Object.values(data.architecturalSupervision || {})
      ].some(hasMeaningfulWhatToDoValue);
    }

    function getConfiguredWhatToDoRoomIds(type = 'demo') {
      const prefix = type === 'repair' ? 'repair' : 'demo';
      if (typeof getHouseRoomWorkItems === 'function') {
        return getHouseRoomWorkItems({ includeZeroArea: true })
          .map(room => prefix === 'repair' ? room.repairRoomId : room.demoRoomId)
          .filter(Boolean);
      }
      const ids = [];
      const pushRooms = (roomId, category) => {
        (roomData[category]?.floors || []).forEach((floor, floorIndex) => {
          (floor?.livingRooms || []).forEach((room, roomIndex) => {
            if (room && typeof room === 'object') ids.push(`${prefix}_${roomId}_${floorIndex}_${roomIndex}`);
          });
        });
        if (!ids.some(id => id.startsWith(`${prefix}_${roomId}_`))) {
          (roomData[category]?.livingRooms || []).forEach((room, roomIndex) => {
            if (room && typeof room === 'object') ids.push(`${prefix}_${roomId}_${roomIndex}`);
          });
        }
      };
      pushRooms('living', 'living');
      pushRooms('nonliving', 'nonliving');
      return ids;
    }

    function setWhatToDoHeaderState(sectionId, isDone) {
      const doneIcon = document.getElementById(sectionId + 'Done');
      const header = document.getElementById(sectionId + 'CardHeader') || document.getElementById(sectionId + 'Header');
      if (doneIcon) doneIcon.classList.toggle('hidden', !isDone);
      if (header) {
        header.classList.toggle('bg-green-50', Boolean(isDone));
        header.classList.toggle('dark:bg-green-900/20', Boolean(isDone));
      }
    }

    function updateWhatToDoRoomCardState(roomId, type) {
      const isDone = type === 'demo' ? hasDemolitionRoomData(roomId) : hasRepairRoomData(roomId);
      const cardHeader = document.getElementById(roomId + 'CardHeader');
      const doneIcon = document.getElementById(roomId + 'Done');

      if (doneIcon) doneIcon.classList.toggle('hidden', !isDone);
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

      const sectionAudit = typeof buildRepairQuestSectionAudit === 'function'
        ? buildRepairQuestSectionAudit()
        : (repairQuestState.sectionAudit || { issues: [] });
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

    function updateCalcAuditPanel(grandTotal = 0, estimateSummary = {}) {
      const roomsEl = document.getElementById('calcAuditRooms');
      const areaEl = document.getElementById('calcAuditArea');
      const worksEl = document.getElementById('calcAuditWorks');
      const materialsEl = document.getElementById('calcAuditMaterials');
      const worksLabelEl = worksEl?.previousElementSibling;
      const materialsLabelEl = materialsEl?.previousElementSibling;
      const badgeEl = document.getElementById('calcAuditBadge');
      const hintEl = document.getElementById('calcAuditHint');
      const warningsWrapEl = document.getElementById('calcAuditWarnings');
      const warningsListEl = document.getElementById('calcAuditWarningsList');

      if (!roomsEl || !areaEl || !worksEl || !materialsEl || !badgeEl || !hintEl || !warningsWrapEl || !warningsListEl) return;

      const metrics = getConfiguredDetailedRooms();
      if (worksLabelEl) worksLabelEl.textContent = 'Работы, часы';
      if (materialsLabelEl) materialsLabelEl.textContent = 'Материалы, количество';
      const worksCount = estimateSummary.worksCount ?? getSelectedItemsCount('works');
      const materialsCount = estimateSummary.materialsCount ?? getSelectedItemsCount('materials');
      const additionalCount = estimateSummary.additionalCount ?? getSelectedItemsCount('additional');
      const worksTotal = Number(estimateSummary.worksTotal || 0);
      const materialsTotal = Number(estimateSummary.materialsTotal || 0);
      const additionalTotal = Number(estimateSummary.additionalTotal || 0);
      const materialsAndServicesTotal = materialsTotal + additionalTotal;
      const hasCalculatedAmount = grandTotal > 0 || worksTotal > 0 || materialsAndServicesTotal > 0;
      const worksDisplay = estimateSummary.worksDisplay || null;
      const materialsDisplay = estimateSummary.materialsDisplay || null;
      const combinedAudit = getRepairQuestCombinedAudit();
      const formatAuditValue = (total, count) => {
        if (total > 0) {
          const countText = count > 0 ? ` · ${count.toLocaleString('ru-RU')} поз.` : '';
          return `${Math.round(total).toLocaleString('ru-RU')} ₽${countText}`;
        }
        return count.toLocaleString('ru-RU');
      };
      const renderMaterialsAuditDisplay = (value) => {
        if (!value || !String(value).includes(' · ')) {
          materialsEl.textContent = value || formatAuditValue(materialsAndServicesTotal, materialsCount + additionalCount);
          return;
        }

        materialsEl.innerHTML = String(value)
          .split(' · ')
          .filter(Boolean)
          .map(part => {
            const match = part.trim().match(/^(.+?)\s+([^\s]+)$/);
            const qty = match ? match[1] : part.trim();
            const unit = match ? match[2] : '';
            return `
              <span class="inline-flex items-baseline justify-between gap-2 rounded-lg bg-white/7 px-2 py-1 text-[11px] leading-none text-white">
                <span class="font-semibold">${qty}</span>
                ${unit ? `<span class="text-white/55">${unit}</span>` : ''}
              </span>
            `;
          })
          .join('');
      };

      roomsEl.textContent = metrics.roomsCount.toLocaleString('ru-RU');
      areaEl.textContent = metrics.totalArea.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' м²';
      worksEl.textContent = worksDisplay || formatAuditValue(worksTotal, worksCount);
      materialsEl.className = materialsDisplay && String(materialsDisplay).includes(' · ')
        ? 'mt-1 flex flex-wrap gap-1 font-semibold text-white'
        : 'mt-1 font-semibold text-white';
      renderMaterialsAuditDisplay(materialsDisplay);
      warningsWrapEl.classList.add('hidden');
      warningsListEl.innerHTML = '';

      badgeEl.className = 'rounded-full px-2.5 py-1 text-[11px] font-semibold';

      if (hasCalculatedAmount) {
        badgeEl.dataset.calculated = 'true';
        badgeEl.classList.add('border', 'border-emerald-400/30', 'bg-emerald-500/10', 'text-emerald-200');
        badgeEl.textContent = 'Произведен расчет';
        hintEl.textContent = `Расчет выполнен: ${worksCount + materialsCount + additionalCount} позиций на сумму ${Math.round(grandTotal).toLocaleString('ru-RU')} ₽.`;
        if (combinedAudit.issueCount) {
          warningsWrapEl.classList.remove('hidden');
          warningsListEl.innerHTML = combinedAudit.issues
            .slice(0, 5)
            .map(issue => `<div>• ${issue}</div>`)
            .join('') + (combinedAudit.issueCount > 5 ? `<div>• И ещё ${combinedAudit.issueCount - 5} замечаний.</div>` : '');
        }
      } else if (metrics.roomsCount === 0) {
        delete badgeEl.dataset.calculated;
        badgeEl.classList.add('border', 'border-amber-400/30', 'bg-amber-500/10', 'text-amber-200');
        badgeEl.textContent = 'Заполните помещения';
        hintEl.textContent = 'Добавьте хотя бы одно помещение, чтобы калькулятор начал собирать итоговые данные.';
      } else if (worksCount + materialsCount + additionalCount === 0) {
        delete badgeEl.dataset.calculated;
        badgeEl.classList.add('border', 'border-sky-400/30', 'bg-sky-500/10', 'text-sky-200');
        badgeEl.textContent = 'Выберите работы';
        hintEl.textContent = 'Площади уже посчитаны. Теперь выберите работы, материалы или доп. услуги, чтобы собрать смету.';
      } else {
        delete badgeEl.dataset.calculated;
        badgeEl.classList.add('border', 'border-emerald-400/30', 'bg-emerald-500/10', 'text-emerald-200');
        badgeEl.textContent = 'Смета сформирована';
        hintEl.textContent = `Сейчас в смете ${worksCount + materialsCount + additionalCount} позиций на сумму ${Math.round(grandTotal).toLocaleString('ru-RU')} ₽.`;
        if (combinedAudit.issueCount) {
          warningsWrapEl.classList.remove('hidden');
          warningsListEl.innerHTML = combinedAudit.issues
            .slice(0, 5)
            .map(issue => `<div>• ${issue}</div>`)
            .join('') + (combinedAudit.issueCount > 5 ? `<div>• И ещё ${combinedAudit.issueCount - 5} замечаний.</div>` : '');
        }
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
      toggleSection('repairInfoSection', false);
      toggleSection('worksSection', false);
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

    function getRequiredFieldWrapper(control, fallbackSelector = '') {
      if (!control) return null;
      return control.closest('[data-required-wrap], .estimate-object-field, .premise-field, .area-input-group, .room-repair-info-field') ||
        (fallbackSelector ? control.closest(fallbackSelector) : null);
    }

    function isRequiredFieldAvailable(wrapper) {
      if (!wrapper) return false;
      if (wrapper.classList.contains('hidden')) return false;
      const style = window.getComputedStyle(wrapper);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }

    function isRequiredValueFilled(control) {
      if (!control) return false;
      if (control.type === 'number') return Number(String(control.value || '').replace(',', '.')) > 0;
      return String(control.value || '').trim().length > 0;
    }

    function setRequiredFieldState(wrapper, isMissing) {
      if (!wrapper) return;
      wrapper.classList.add('required-field');
      wrapper.classList.toggle('is-required-missing', isMissing);
      wrapper.classList.toggle('is-required-filled', !isMissing);
      const label = wrapper.querySelector('label');
      const controls = wrapper.classList.contains('area-input-group') ? wrapper.querySelector('.qty-controls') : null;
      let badge = label?.querySelector(':scope > .required-field-badge') ||
        controls?.querySelector(':scope > .required-field-badge') ||
        wrapper.querySelector(':scope > .required-field-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'required-field-badge';
      }
      if (controls) controls.appendChild(badge);
      else if (label) label.appendChild(badge);
      else wrapper.insertBefore(badge, wrapper.firstChild);
      badge.textContent = isMissing ? 'Обязательно' : 'Заполнено';
    }

    function evaluateRequiredControl(control, collection, options = {}) {
      const wrapper = getRequiredFieldWrapper(control, options.fallbackSelector || '');
      if (!isRequiredFieldAvailable(wrapper)) return;
      const isMissing = !isRequiredValueFilled(control);
      setRequiredFieldState(wrapper, isMissing);
      collection.push({
        section: options.section || 'rooms',
        missing: isMissing,
        label: options.label || control?.getAttribute('aria-label') || wrapper?.querySelector('label')?.textContent || ''
      });
    }

    function updateRequiredSectionStatus(id, total, missing) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('is-complete', missing === 0 && total > 0);
      el.classList.toggle('is-warning', missing > 0);
      if (!total) el.textContent = 'Обязательно';
      else if (missing > 0) el.textContent = `Осталось ${missing}`;
      else el.textContent = 'Готово';
    }

    function updateRequiredFieldHints() {
      const checks = [];

      ['buildingType', 'buildingSubtype', 'cargoElevator'].forEach(id => {
        evaluateRequiredControl(document.getElementById(id), checks, { section: 'estimate' });
      });

      const tariffInput = document.getElementById('tariffCity');
      const tariffWrapper = document.getElementById('tariffCityContainer');
      if (tariffWrapper) {
        const tariffMissing = !(window.currentTariffCity || tariffInput?.value || '').trim();
        setRequiredFieldState(tariffWrapper, tariffMissing);
        checks.push({ section: 'estimate', missing: tariffMissing, label: 'Город применения тарифов' });
      }

      document.querySelectorAll('select[id^="floorAppointment_"]').forEach(select => {
        evaluateRequiredControl(select, checks, { section: 'rooms' });
      });
      document.querySelectorAll('select[id^="floorSubAppointment_"]').forEach(select => {
        evaluateRequiredControl(select, checks, { section: 'rooms' });
      });

      document.querySelectorAll('[id^="floorRoom_"][id*="Group_"]').forEach(group => {
        ['area', 'wallsArea', 'ceilingArea'].forEach(field => {
          evaluateRequiredControl(group.querySelector(`input[data-field="${field}"]`), checks, { section: 'rooms' });
        });
        const perimeter = group.querySelector('input[data-field="roomPerimeter"]');
        if (perimeter) evaluateRequiredControl(perimeter, checks, { section: 'rooms' });

        const ceilingInput = Array.from(group.querySelectorAll('input[type="number"]')).find(input => {
          const label = input.closest('.area-input-group')?.querySelector('label')?.textContent || '';
          return /Высота потолка/i.test(label);
        });
        evaluateRequiredControl(ceilingInput, checks, { section: 'rooms' });

        ['currentState', 'repairTypeNew', 'requiresRedesign'].forEach(field => {
          evaluateRequiredControl(group.querySelector(`select[data-field="${field}"], .room-repair-info-field select[onchange*="'${field}'"]`), checks, { section: 'rooms' });
        });
      });

      const estimateChecks = checks.filter(item => item.section === 'estimate');
      const roomChecks = checks.filter(item => item.section === 'rooms');
      updateRequiredSectionStatus('estimateDataRequiredStatus', estimateChecks.length, estimateChecks.filter(item => item.missing).length);
      updateRequiredSectionStatus('roomsRequiredStatus', roomChecks.length, roomChecks.filter(item => item.missing).length);
      return checks;
    }

    window.updateRequiredFieldHints = updateRequiredFieldHints;

    document.addEventListener('input', event => {
      if (event.target.closest('#detailedCalc')) updateRequiredFieldHints();
    });
    document.addEventListener('change', event => {
      if (event.target.closest('#detailedCalc')) setTimeout(updateRequiredFieldHints, 0);
    });
    document.addEventListener('DOMContentLoaded', () => setTimeout(updateRequiredFieldHints, 350));
    
    function toggleWhatToDoSubSection(subsectionId) {
      const content = document.getElementById(subsectionId + 'Content');
      const icon = document.getElementById(subsectionId + 'Icon');
      
      if (!content) return;
      
      if (content.style.display === 'none') {
        content.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(180deg)';
        openWhatToDoSubSections.add(subsectionId);
        
        // Рендер лестниц при открытии секции
        if (subsectionId.includes('_stairsMount')) {
          const roomId = subsectionId.replace('_stairsMount', '');
          const listContainer = document.getElementById(subsectionId + '_list');
          if (listContainer && typeof renderStairsSubcategories === 'function') {
            renderStairsSubcategories(roomId);
          }
        }
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
        } else if (subsectionId.includes('floorLeveling') || subsectionId.includes('wallPlaster') || subsectionId.includes('wallPutty') || subsectionId.includes('wallWaterproof') || subsectionId.includes('partitions') || subsectionId.includes('surfaceProtection') || subsectionId.includes('ceilingPrep')) {
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
        isDone = data?.electrical?.some(e => (e.workId || e.type) && (e.qty > 0 || e.length > 0 || e.area > 0));
      } else if (subType === 'ventilation') {
        isDone = data?.ventilation?.some(v => (v.workId || v.type) && ((v.qty || 0) > 0 || (v.length || 0) > 0));
      } else if (subType === 'finishing') {
        const floorDone = data?.finishing?.floor?.some(f => f.workId || f.type);
        const wallDone = data?.finishing?.wall?.some(f => f.workId || f.type);
        const ceilingDone = data?.finishing?.ceiling?.some(f => f.workId || f.type);
        isDone = !!(floorDone || wallDone || ceilingDone);
      } else if (subType === 'finishing_floor') {
        isDone = !!data?.finishing?.floor?.some(f => f.workId || f.type);
      } else if (subType === 'finishing_wall') {
        isDone = !!data?.finishing?.wall?.some(f => f.workId || f.type);
      } else if (subType === 'finishing_ceiling') {
        isDone = !!data?.finishing?.ceiling?.some(f => f.workId || f.type);
      } else if (subType === 'water') {
        isDone = data?.water?.some(w => (w.workId || w.type) && (w.qty > 0 || w.length > 0));
      } else if (subType === 'drainage') {
        isDone = data?.drainage?.some(d => (d.workId || d.type) && (d.qty > 0 || d.length > 0));
      } else if (subType === 'plumbing') {
        isDone = data?.plumbing?.some(p => (p.workId || p.type) && p.qty > 0);
      } else if (subType === 'heating') {
        isDone = data?.heating?.some(h => (h.workId || h.type) && h.qty > 0);
      } else if (subType === 'staircase') {
        isDone = data?.staircase?.some(s => (s.workId || s.type) && (s.qty > 0 || s.length > 0 || s.area > 0));
      } else if (subType === 'railing') {
        isDone = data?.railing?.some(r => (r.workId || r.type) && (r.qty > 0 || r.length > 0));
      } else if (subType === '_stairs') {
        isDone = data?.staircase?.some(s => (s.workId || s.type) && (s.qty > 0 || s.length > 0 || s.area > 0)) ||
                 data?.railing?.some(r => (r.workId || r.type) && (r.qty > 0 || r.length > 0));
      } else if (subType === '_construct') {
        isDone = data?.partitions?.some(p => p.material && p.area > 0) ||
                data?.doorOpenings?.some(o => o.length && o.width && o.material) ||
                data?.windowOpenings?.some(o => o.length && o.width && o.material) ||
                data?.balconyOpenings?.some(o => o.length && o.width && o.material);
      } else if (subType === '_engineering') {
        isDone = data?.electrical?.some(e => (e.workId || e.type) && (e.qty > 0 || e.length > 0 || e.area > 0)) ||
                data?.ventilation?.some(v => (v.workId || v.type) && ((v.qty || 0) > 0 || (v.length || 0) > 0)) ||
                data?.water?.some(w => (w.workId || w.type) && (w.qty > 0 || w.length > 0)) ||
                data?.drainage?.some(d => (d.workId || d.type) && (d.qty > 0 || d.length > 0)) ||
                data?.plumbing?.some(p => (p.workId || p.type) && p.qty > 0) ||
                data?.heating?.some(h => (h.workId || h.type) && h.qty > 0);
      } else if (subType === 'doorOpenings' || subType === 'windowOpenings' || subType === 'balconyOpenings') {
        isDone = data?.[subType]?.some(o => o.length && o.width && o.material);
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
      const hideCheck = (subType === 'partitions' || subType === 'finishing_floor' || subType === 'finishing_wall' || subType === 'finishing_ceiling' || subType === 'electrical' || subType === 'ventilation' || subType === 'water' || subType === 'drainage' || subType === 'plumbing' || subType === 'heating' || subType === 'staircase' || subType === 'railing');
      
      if (checkIcon && ((showCheckForFinishing || showCheckForConstruct) || !hideCheck)) {
        checkIcon.classList.toggle('hidden', !isDone);
      }
      
      // Green border for leaf sections only; parent sections keep only the check icon
      if (isDone && (subType === 'partitions' || subType === 'electrical' || subType === 'ventilation' || subType === 'water' || subType === 'drainage' || subType === 'plumbing' || subType === 'heating' || subType === 'staircase' || subType === 'railing' || subType === '_stairs' || subType === 'finishing_floor' || subType === 'finishing_wall' || subType === 'finishing_ceiling' || subType === '_openings')) {
        let headerEl;
        let targetId = '';
        
        // Use querySelector as most reliable method with roomId
        if (subType === 'partitions') {
          targetId = roomId + '_partitionsHeader';
          headerEl = document.getElementById(targetId);
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
        } else if (subType === '_engineering') {
          headerEl = document.getElementById(roomId + '_engineeringHeader');

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
          headerEl.classList.add('section-done');
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
          headerEl.classList.add('section-done');
        }
      }
      
// Remove border when not done
      if (!isDone && (subType === 'partitions' || subType === 'finishing_floor' || subType === 'finishing_wall' || subType === 'finishing_ceiling' || subType === 'doorOpenings' || subType === 'windowOpenings' || subType === 'balconyOpenings' || subType === '_openings' || subType === 'electrical' || subType === 'ventilation' || subType === 'water' || subType === 'drainage' || subType === 'plumbing' || subType === 'heating' || subType === 'staircase' || subType === 'railing' || subType === '_stairs')) {
        let headerEl;
        
        if (subType === 'partitions') {
          headerEl = document.getElementById(roomId + '_partitionsHeader') || document.getElementById(roomId + '_partitionsSection');
        } else if (subType === 'finishing_floor' || subType === 'finishing_wall' || subType === 'finishing_ceiling') {
          headerEl = document.getElementById(roomId + '_' + subType + 'Header');
        } else if (subType === '_openings') {
          headerEl = document.getElementById(roomId + '_openingsHeader');
        } else if (subType === 'doorOpenings' || subType === 'windowOpenings' || subType === 'balconyOpenings') {
          headerEl = document.getElementById(roomId + '_' + subType + 'Header');
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
        } else if (subType === 'heating') {
          headerEl = document.getElementById(roomId + '_heatingHeader');
        } else if (subType === 'staircase') {
          headerEl = document.getElementById(roomId + '_staircaseHeader');
        } else if (subType === 'railing') {
          headerEl = document.getElementById(roomId + '_railingHeader');
        } else if (subType === '_stairs') {
          headerEl = document.getElementById(roomId + '_stairsHeader');
        } else if (subType === '_engineering') {
          headerEl = document.getElementById(roomId + '_engineeringHeader');
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
          headerEl.classList.remove('section-done');
        }
        
        if (headerEl && (subType === 'doorOpenings' || subType === 'windowOpenings' || subType === 'balconyOpenings')) {
          headerEl.classList.remove('text-green-600', 'font-semibold');
        }
      }

      if (typeof updateEngineeringTotals === 'function') updateEngineeringTotals(roomId);
      if (typeof updateFinishingTotals === 'function') updateFinishingTotals(roomId);
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
      
      if (count === 0) {
        if (!roomData.demolitionData) roomData.demolitionData = {};
        if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
        roomData.demolitionData[roomId].water = [];
      }
      
      renderWaterSupplyFields(roomId, count);
      
      checkDemolitionDone(roomId, 'water');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function handleWaterSupplyInput(roomId) {
      const input = document.getElementById(roomId + '_waterCount');
      if (!input) return;
      
      let count = parseInt(input.value) || 0;
      count = Math.max(0, Math.min(20, count));
      input.value = count;
      
      if (count === 0) {
        if (!roomData.demolitionData) roomData.demolitionData = {};
        if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
        roomData.demolitionData[roomId].water = [];
      }
      
      renderWaterSupplyFields(roomId, count);
      
      checkDemolitionDone(roomId, 'water');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function renderWaterSupplyFields(roomId, count) {
      if (typeof render_water_Fields === 'function') render_water_Fields(roomId, count);
    }
    
    function updateWaterSupplyData(roomId, index) {
      const typeEl = document.getElementById(roomId + '_water_' + index + '_type');
      const diamEl = document.getElementById(roomId + '_water_' + index + '_diameter');
      if (!typeEl) return;
      const t = typeEl.value;
      const d = diamEl ? diamEl.value : '';
      const workId = (t && d) ? t + '_pipe_' + d : (t && !['steel','copper','pp','metalplastic','pex'].includes(t)) ? t + '_remove' : '';
      if (typeof update_water_Data === 'function') update_water_Data(roomId, index, 'workId', workId);
      if (typeof render_water_Fields === 'function') render_water_Fields(roomId, parseInt(document.getElementById(roomId + '_waterCount')?.value) || 0);
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
      
      if (count === 0) {
        if (!roomData.demolitionData) roomData.demolitionData = {};
        if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
        roomData.demolitionData[roomId].drainage = [];
      }
      
      render_drainage_Fields(roomId, count);
      
      checkDemolitionDone(roomId, 'drainage');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function handleDrainageInput(roomId) {
      const input = document.getElementById(roomId + '_drainageCount');
      if (!input) return;
      
      let count = parseInt(input.value) || 0;
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
    }
    
    function render_drainage_Fields(roomId, count) {
      const container = document.getElementById(roomId + '_drainageList');
      if (!container) return;
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
      if (!roomData.demolitionData[roomId].drainage) roomData.demolitionData[roomId].drainage = [];
      const qtyFieldMap = {'cast_iron_50':'length','cast_iron_100':'length','cast_iron_150':'length','flue_110':'length','flue_160':'length','plastic_32':'length','plastic_40':'length','plastic_50':'length','plastic_110':'length','plastic_160':'length','drainage_fitting_remove':'qty','syphon_remove':'qty','drainage_stand_remove':'qty','hydrolock_remove':'qty','revision_luk_remove':'qty','well_remove':'qty'};
      const qtyLabelMap = {qty: 'Количество, шт:', length: 'Длина, пог. м:'};
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
        html += `<div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border"><div class="flex flex-wrap items-end gap-2"><div><label class="text-xs text-gray-500">Вид работы:</label><select class="md:w-[300px] px-2 py-1 text-sm border rounded" onchange="update_drainage_Data('${roomId}', ${i}, 'workId', this.value); render_drainage_Fields('${roomId}', ${count})">${buildOptions_drainage(workId)}</select></div><div><label class="text-xs text-gray-500">${qtyLabel}</label><input type="number" step="0.01" min="0" value="${qty}" class="w-24 px-2 py-1 text-sm border rounded" onchange="update_drainage_Data('${roomId}', ${i}, '${qf}', this.value); updateDrainageTotals('${roomId}')" oninput="update_drainage_Data('${roomId}', ${i}, '${qf}', this.value); updateDrainageTotals('${roomId}')"></div><div><label class="text-xs text-gray-500">Цена за ед.:</label><div class="construct-price-cell px-2 py-1 text-sm text-gray-600">${unitPrice ? unitPrice.toLocaleString('ru-RU') + ' ?' : '—'}</div></div><div><label class="text-xs text-gray-500">Итого:</label><div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total ? total.toLocaleString('ru-RU') + ' ?' : '—'}</div></div></div></div>`;
      }
      container.innerHTML = html;
      if (typeof updateDrainageTotals === 'function') updateDrainageTotals(roomId);
      checkDemolitionDone(roomId, 'drainage');
      checkDemolitionDone(roomId, '_engineering');
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
    }
    
    function updateDrainageItemQty(roomId, index, delta) {
    }
    
    function updatePlumbingCount(roomId, delta) {
      const input = document.getElementById(roomId + '_plumbingCount');
      if (!input) return;
      let count = parseInt(input.value) || 0;
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
    }
    
    function handlePlumbingInput(roomId) {
      const input = document.getElementById(roomId + '_plumbingCount');
      if (!input) return;
      let count = parseInt(input.value) || 0;
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
    }
    
    function render_plumbing_Fields(roomId, count) {
      const container = document.getElementById(roomId + '_plumbingList');
      if (!container) return;
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
      if (!roomData.demolitionData[roomId].plumbing) roomData.demolitionData[roomId].plumbing = [];
      const qtyFieldMap = {'sink_remove':'qty','bathtub_remove':'qty','shower_remove':'qty','faucet_remove':'qty','toilet_remove':'qty','bidet_remove':'qty','towel_dryer_remove':'qty','washing_machine_remove':'qty','dishwasher_remove':'qty'};
      let html = '';
      for (let i = 0; i < count; i++) {
        const item = roomData.demolitionData[roomId].plumbing[i] || {};
        const workId = item.workId || item.type || '';
        const qf = qtyFieldMap[workId] || 'qty';
        const qty = item[qf] !== undefined ? item[qf] : '';
        const unitPrice = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
        const qtyNum = parseFloat(qty) || 0;
        const total = (unitPrice > 0 && qtyNum > 0) ? Math.round(unitPrice * qtyNum) : 0;
        html += `<div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border"><div class="flex flex-wrap items-end gap-2"><div><label class="text-xs text-gray-500">Вид работы:</label><select class="md:w-[300px] px-2 py-1 text-sm border rounded" onchange="update_plumbing_Data('${roomId}', ${i}, 'workId', this.value); render_plumbing_Fields('${roomId}', ${count})">${buildOptions_plumbing(workId)}</select></div><div><label class="text-xs text-gray-500">Количество, шт:</label><input type="number" step="1" min="0" value="${qty}" class="w-24 px-2 py-1 text-sm border rounded" onchange="update_plumbing_Data('${roomId}', ${i}, 'qty', this.value); updatePlumbingTotals('${roomId}')" oninput="update_plumbing_Data('${roomId}', ${i}, 'qty', this.value); updatePlumbingTotals('${roomId}')"></div><div><label class="text-xs text-gray-500">Цена за ед.:</label><div class="construct-price-cell px-2 py-1 text-sm text-gray-600">${unitPrice ? unitPrice.toLocaleString('ru-RU') + ' ?' : '—'}</div></div><div><label class="text-xs text-gray-500">Итого:</label><div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total ? total.toLocaleString('ru-RU') + ' ?' : '—'}</div></div></div></div>`;
      }
      container.innerHTML = html;
      if (typeof updatePlumbingTotals === 'function') updatePlumbingTotals(roomId);
      checkDemolitionDone(roomId, 'plumbing');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function update_plumbing_Data(roomId, index, field, value) {
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
      if (!roomData.demolitionData[roomId].plumbing) roomData.demolitionData[roomId].plumbing = [];
      if (!roomData.demolitionData[roomId].plumbing[index]) roomData.demolitionData[roomId].plumbing[index] = {};
      const entry = roomData.demolitionData[roomId].plumbing[index];
      const numFields = ['qty'];
      entry[field] = numFields.includes(field) ? (parseFloat(value) || 0) : value;
      if (field === 'workId') { entry.type = value; entry.manualEntry = true; }
      if (numFields.includes(field)) entry.manualEntry = true;
      checkDemolitionDone(roomId, 'plumbing');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function updatePlumbingItemQty(roomId, index, delta) {
    }
    
    function updateHeatingCount(roomId, delta) {
      const input = document.getElementById(roomId + '_heatingCount');
      if (!input) return;
      let count = parseInt(input.value) || 0;
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
    }
    
    function handleHeatingInput(roomId) {
      const input = document.getElementById(roomId + '_heatingCount');
      if (!input) return;
      let count = parseInt(input.value) || 0;
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
    }
    
    function render_heating_Fields(roomId, count) {
      const container = document.getElementById(roomId + '_heatingList');
      if (!container) return;
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
      if (!roomData.demolitionData[roomId].heating) roomData.demolitionData[roomId].heating = [];
      const qtyFieldMap = {'radiator_remove':'qty','infloor_convector_remove':'qty'};
      let html = '';
      for (let i = 0; i < count; i++) {
        const item = roomData.demolitionData[roomId].heating[i] || {};
        const workId = item.workId || item.type || '';
        const qf = qtyFieldMap[workId] || 'qty';
        const qty = item[qf] !== undefined ? item[qf] : '';
        const unitPrice = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
        const qtyNum = parseFloat(qty) || 0;
        const total = (unitPrice > 0 && qtyNum > 0) ? Math.round(unitPrice * qtyNum) : 0;
        html += `<div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border"><div class="flex flex-wrap items-end gap-2"><div><label class="text-xs text-gray-500">Вид работы:</label><select class="md:w-[300px] px-2 py-1 text-sm border rounded" onchange="update_heating_Data('${roomId}', ${i}, 'workId', this.value); render_heating_Fields('${roomId}', ${count})">${buildOptions_heating(workId)}</select></div><div><label class="text-xs text-gray-500">Количество, шт:</label><input type="number" step="1" min="0" value="${qty}" class="w-24 px-2 py-1 text-sm border rounded" onchange="update_heating_Data('${roomId}', ${i}, 'qty', this.value); updateHeatingTotals('${roomId}')" oninput="update_heating_Data('${roomId}', ${i}, 'qty', this.value); updateHeatingTotals('${roomId}')"></div><div><label class="text-xs text-gray-500">Цена за ед.:</label><div class="construct-price-cell px-2 py-1 text-sm text-gray-600">${unitPrice ? unitPrice.toLocaleString('ru-RU') + ' ?' : '—'}</div></div><div><label class="text-xs text-gray-500">Итого:</label><div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total ? total.toLocaleString('ru-RU') + ' ?' : '—'}</div></div></div></div>`;
      }
      container.innerHTML = html;
      if (typeof updateHeatingTotals === 'function') updateHeatingTotals(roomId);
      checkDemolitionDone(roomId, 'heating');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function update_heating_Data(roomId, index, field, value) {
      if (!roomData.demolitionData) roomData.demolitionData = {};
      if (!roomData.demolitionData[roomId]) roomData.demolitionData[roomId] = {};
      if (!roomData.demolitionData[roomId].heating) roomData.demolitionData[roomId].heating = [];
      if (!roomData.demolitionData[roomId].heating[index]) roomData.demolitionData[roomId].heating[index] = {};
      const entry = roomData.demolitionData[roomId].heating[index];
      const numFields = ['qty'];
      entry[field] = numFields.includes(field) ? (parseFloat(value) || 0) : value;
      if (field === 'workId') { entry.type = value; entry.manualEntry = true; }
      if (numFields.includes(field)) entry.manualEntry = true;
      checkDemolitionDone(roomId, 'heating');
      checkDemolitionDone(roomId, '_engineering');
    }
    
    function updateHeatingItemQty(roomId, index, delta) {
    }
    

function updateEngineeringTotals(roomId) {
  if (typeof getWorkPrice !== 'function') return;
  const data = roomData.demolitionData?.[roomId] || {};
  const fmt = v => v > 0 ? v.toLocaleString('ru-RU') + ' ?' : '—';

  const groups = {
    electrical: { items: data.electrical || [], qtyMap: {'wiring_remove':'length','cable_channel_remove':'length','warm_floor_remove':'area'} },
    ventilation: { items: data.ventilation || [], qtyMap: {'air_duct_remove':'length'} },
    water: { items: data.water || [], qtyMap: {'steel_pipe_15':'length','steel_pipe_20':'length','steel_pipe_25':'length','steel_pipe_32':'length','steel_pipe_40':'length','steel_pipe_50':'length','copper_pipe_10':'length','copper_pipe_12':'length','copper_pipe_15':'length','copper_pipe_18':'length','copper_pipe_22':'length','copper_pipe_28':'length','pp_pipe_16':'length','pp_pipe_20':'length','pp_pipe_25':'length','pp_pipe_32':'length','pp_pipe_40':'length','metalplastic_pipe_16':'length','metalplastic_pipe_20':'length','metalplastic_pipe_25':'length','metalplastic_pipe_32':'length','pex_pipe_16':'length','pex_pipe_20':'length','pex_pipe_25':'length'} },
    drainage: { items: data.drainage || [], qtyMap: {'cast_iron_50':'length','cast_iron_100':'length','cast_iron_150':'length','flue_110':'length','flue_160':'length','plastic_32':'length','plastic_40':'length','plastic_50':'length','plastic_110':'length','plastic_160':'length'} },
    plumbing: { items: data.plumbing || [], qtyMap: {} },
    heating: { items: data.heating || [], qtyMap: {} },
  };

  let grandTotal = 0;
  for (const [key, cfg] of Object.entries(groups)) {
    let subtotal = 0;
    cfg.items.forEach(item => {
      const workId = item.workId || item.type || '';
      if (!workId) return;
      const qf = cfg.qtyMap[workId] || 'qty';
      const qty = parseFloat(item[qf]) || 0;
      subtotal += Math.round((getWorkPrice(workId) || 0) * qty);
    });
    grandTotal += subtotal;
    const el = document.getElementById(roomId + '_' + key + 'Total');
    if (el) el.textContent = fmt(subtotal);
  }

  const totalEl = document.getElementById(roomId + '_engineeringTotal');
  if (totalEl) totalEl.textContent = fmt(grandTotal);
}


function renderAllDemolitionFinishingSections() {
  if (!roomData.demolitionData) return;
  for (const roomId of Object.keys(roomData.demolitionData)) {
    renderFinishingCategoryFields(roomId, 'floor');
    renderFinishingCategoryFields(roomId, 'wall');
    renderFinishingCategoryFields(roomId, 'ceiling');
  }
}

function updateFinishingTotals(roomId) {
  if (typeof getWorkPrice !== 'function') return;
  const finishing = roomData.demolitionData?.[roomId]?.finishing || {};
  const fmt = v => v > 0 ? v.toLocaleString('ru-RU') + ' ?' : '—';
  let grand = 0;
  for (const cat of ['floor', 'wall', 'ceiling']) {
    let sub = 0;
    (finishing[cat] || []).forEach(item => {
      const workId = item.workId || '';
      if (!workId) return;
      sub += Math.round((getWorkPrice(workId) || 0) * (parseFloat(item.area) || 0));
    });
    grand += sub;
    const el = document.getElementById(roomId + '_finishing_' + cat + 'Total');
    if (el) el.textContent = fmt(sub);
  }
  const totalEl = document.getElementById(roomId + '_finishingTotal');
  if (totalEl) totalEl.textContent = fmt(grand);
}

function renderFinishingCategoryFields(roomId, category, count) {
  if (count === undefined) count = null;
  const container = document.getElementById(`${roomId}_finishing_${category}_list`);
  if (!container) return;
  const finishing = ensureFinishingDataStructure(roomId);
  const config = getFinishingCategoryConfig(category);
  const metrics = getDemolitionRoomMetrics(roomId);
  const defaultArea = Number(metrics[config.defaultAreaKey] || 0);
  const items = finishing[category];
  const finalCount = count === null ? items.length : count;
  const categoryOptions = typeof getDemolitionFinishingOptions === 'function'
    ? getDemolitionFinishingOptions(category)
    : (((typeof demolitionFinishingOptions !== 'undefined' ? demolitionFinishingOptions : window.demolitionFinishingOptions) || {})[category] || []);
  items.length = finalCount;
  for (let j = 0; j < finalCount; j++) {
if (!items[j]) {
  items[j] = { workId: '', area: defaultArea > 0 ? Number(defaultArea.toFixed(2)) : 0 };
} else {
  const hasValidWorkId = !items[j].workId || categoryOptions.some(o => o.id === items[j].workId);
  if (!hasValidWorkId && items[j].type) {
    const match = categoryOptions.find(o => o.name === items[j].type);
    items[j].workId = match ? match.id : '';
  } else if (!items[j].workId && items[j].type) {
    const match = categoryOptions.find(o => o.name === items[j].type);
    items[j].workId = match ? match.id : '';
  }
  if (items[j].area === undefined || items[j].area === null || items[j].area === '') {
    items[j].area = defaultArea > 0 ? Number(defaultArea.toFixed(2)) : 0;
  }
}
  }
  let html = '';
  for (let i = 0; i < finalCount; i++) {
const item = items[i] || {};
const workId = item.workId || '';
const area = Number(item.area || 0).toFixed(2);
const unitPrice = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
const total = (unitPrice > 0 && parseFloat(area) > 0) ? Math.round(unitPrice * parseFloat(area)) : 0;
const badge = item.manualEntry ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"><i class="fas fa-user text-[10px]"></i><span>\u0412\u0440\u0443\u0447\u043d\u0443\u044e</span></span>` : '';
const optHtml = categoryOptions.map(o => `<option value="${o.id}" ${workId === o.id ? 'selected' : ''}>${o.name}</option>`).join('');
html += `
  <div class="mb-2 p-2 bg-white dark:bg-gray-700 rounded border">
    <div class="flex flex-wrap items-center gap-2 mb-1">${badge}</div>
    <div class="flex flex-wrap items-end gap-2">
      <div>
        <label class="text-xs text-gray-500">\u0412\u0438\u0434 \u0440\u0430\u0431\u043e\u0442\u044b:</label>
        <select class="md:w-[300px] px-2 py-1 text-sm border rounded"
          onchange="updateFinishingCategoryItem('${roomId}', '${category}', ${i}, 'workId', this.value)">
          <option value="">\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435</option>
          ${optHtml}
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-500">\u041f\u043b\u043e\u0449\u0430\u0434\u044c, \u043c\u00b2:</label>
        <input type="number" step="0.01" min="0" value="${area}"
          class="w-24 px-2 py-1 text-sm border rounded"
          onchange="updateFinishingCategoryItem('${roomId}', '${category}', ${i}, 'area', this.value); updateFinishingTotals('${roomId}')"
          oninput="updateFinishingCategoryItem('${roomId}', '${category}', ${i}, 'area', this.value); updateFinishingTotals('${roomId}')">
      </div>
      <div>
        <label class="text-xs text-gray-500">\u0426\u0435\u043d\u0430 \u0437\u0430 \u0435\u0434.:</label>
        <div class="construct-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300">${unitPrice ? unitPrice.toLocaleString('ru-RU') + ' \u20bd' : '\u2014'}</div>
      </div>
      <div>
        <label class="text-xs text-gray-500">\u0418\u0442\u043e\u0433\u043e:</label>
        <div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${total ? total.toLocaleString('ru-RU') + ' \u20bd' : '\u2014'}</div>
      </div>
    </div>
  </div>`;
  }
  container.innerHTML = html;
  updateFinishingTotals(roomId);
  checkDemolitionDone(roomId, 'finishing');
  checkDemolitionDone(roomId, 'finishing_' + category);
}

function updateFinishingCategoryItem(roomId, category, index, field, value) {
  var finishing = ensureFinishingDataStructure(roomId);
  if (!finishing[category][index]) finishing[category][index] = {};
  var item = finishing[category][index];
  var categoryOptions = typeof getDemolitionFinishingOptions === 'function'
    ? getDemolitionFinishingOptions(category)
    : (((typeof demolitionFinishingOptions !== 'undefined' ? demolitionFinishingOptions : window.demolitionFinishingOptions) || {})[category] || []);
  if (field === 'area') {
    item.area = Number(parseFloat(value).toFixed(2)) || 0;
    item.manualEntry = true;
  } else if (field === 'workId') {
    item.workId = value;
    var found = categoryOptions.filter(function(o) { return o.id === value; })[0];
    item.type = found ? found.name : value;
    item.manualEntry = true;
  }
  renderFinishingCategoryFields(roomId, category, finishing[category].length);
  checkDemolitionDone(roomId, 'finishing');
  checkDemolitionDone(roomId, 'finishing_' + category);
  if (typeof updateWhatToDoAutofillIndicators === 'function') updateWhatToDoAutofillIndicators();
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
      if (!existing.rough) existing.rough = { floorLeveling: [], wallPlaster: [], wallPutty: [], wallWaterproof: [], partitions: [], ceilingPrep: [], surfaceProtection: [] };
      if (!Array.isArray(existing.rough.floorLeveling)) existing.rough.floorLeveling = [];
      if (!Array.isArray(existing.rough.wallPlaster)) existing.rough.wallPlaster = [];
      if (!Array.isArray(existing.rough.wallPutty)) existing.rough.wallPutty = [];
      if (!Array.isArray(existing.rough.wallWaterproof)) existing.rough.wallWaterproof = [];
      if (!Array.isArray(existing.rough.partitions)) existing.rough.partitions = [];
      if (!Array.isArray(existing.rough.ceilingPrep)) existing.rough.ceilingPrep = [];
      if (!Array.isArray(existing.rough.surfaceProtection)) existing.rough.surfaceProtection = [];
      if (!existing.engineering) existing.engineering = { electrical: [], ventilation: [], water: [], drainage: [], heating: [] };
      if (!Array.isArray(existing.engineering.electrical)) existing.engineering.electrical = [];
      if (!Array.isArray(existing.engineering.ventilation)) existing.engineering.ventilation = [];
      if (!Array.isArray(existing.engineering.water)) existing.engineering.water = [];
      if (!Array.isArray(existing.engineering.drainage)) existing.engineering.drainage = [];
      if (!Array.isArray(existing.engineering.heating)) existing.engineering.heating = [];
      if (!existing.finishing) existing.finishing = { floor: [], wall: [], ceiling: [], stairs: [], openings: { door: [], window: [], balcony: [] } };
      if (!existing.finishing.stairs || typeof existing.finishing.stairs !== 'object') existing.finishing.stairs = [];
      if (!existing.finishing.openings) existing.finishing.openings = { door: [], window: [], balcony: [] };
      if (!Array.isArray(existing.finishing.openings.door)) existing.finishing.openings.door = [];
      if (!Array.isArray(existing.finishing.openings.window)) existing.finishing.openings.window = [];
      if (!Array.isArray(existing.finishing.openings.balcony)) existing.finishing.openings.balcony = [];
      if (!existing.architecturalSupervision || Array.isArray(existing.architecturalSupervision)) existing.architecturalSupervision = {};
      return roomData.repairData[roomId];
    }
    
    function getRepairRoomMetrics(roomId) {
      let source = null;
      let label = roomId;
      
      const livingMatch = roomId.match(/^repair_living_(\d+)$/);
      const livingFloorMatch = roomId.match(/^repair_living_(\d+)_(\d+)$/);
      const nonlivingMatch = roomId.match(/^repair_nonliving_(\d+)$/);
      const nonlivingFloorMatch = roomId.match(/^repair_nonliving_(\d+)_(\d+)$/);
      
      if (livingFloorMatch && roomData.living?.floors?.[parseInt(livingFloorMatch[1], 10)]?.livingRooms?.[parseInt(livingFloorMatch[2], 10)]) {
        source = roomData.living.floors[parseInt(livingFloorMatch[1], 10)].livingRooms[parseInt(livingFloorMatch[2], 10)];
        label = `Жилое помещение_${parseInt(livingFloorMatch[1], 10) + 1}_${parseInt(livingFloorMatch[2], 10) + 1}`;
      } else if (livingMatch && roomData.living?.livingRooms?.[parseInt(livingMatch[1], 10)]) {
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
          ceilingArea: Number(source.ceilingArea || source.area || source.floorArea || 0),
          height: Number(source.height || 2.7)
        };
      }
      return { floorArea: 0, wallsArea: 0, ceilingArea: 0, height: 2.7 };
    }
    
    function getDemolitionRoomMetrics(roomId) {
      let source = null;
      let label = roomId;

      const livingMatch = roomId.match(/^demo_living_(\d+)$/);
      const livingFloorMatch = roomId.match(/^demo_living_(\d+)_(\d+)$/);
      const nonlivingFlatMatch = roomId.match(/^demo_nonliving_(\d+)$/);
      const nonlivingFloorMatch = roomId.match(/^demo_nonliving_(\d+)_(\d+)$/);

      if (livingFloorMatch && roomData.living?.floors?.[parseInt(livingFloorMatch[1], 10)]?.livingRooms?.[parseInt(livingFloorMatch[2], 10)]) {
        source = roomData.living.floors[parseInt(livingFloorMatch[1], 10)].livingRooms[parseInt(livingFloorMatch[2], 10)];
        label = `\u0416\u0438\u043B\u043E\u0435 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0435_${parseInt(livingFloorMatch[1], 10) + 1}_${parseInt(livingFloorMatch[2], 10) + 1}`;
      } else if (livingMatch && roomData.living?.livingRooms?.[parseInt(livingMatch[1], 10)]) {
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
        {id:'floor_linoleum',name:'Линолеум'},
        {id:'floor_ceramic',name:'Керамическая плитка'},
        {id:'floor_porcelain',name:'Керамогранит'},
        {id:'floor_quartzvinyl',name:'Кварцвиниловая плитка'},
        {id:'floor_laminate',name:'Ламинат'},
        {id:'floor_carpet',name:'Ковролин'},
        {id:'floor_engineered',name:'Инженерная доска'},
        {id:'floor_parquet_board',name:'Паркетная доска'},
        {id:'floor_solid',name:'Массивная доска'},
        {id:'floor_parquet',name:'Паркет'},
        {id:'floor_cork',name:'Пробковое покрытие'},
        {id:'floor_self_leveling',name:'Наливной пол'},
        {id:'floor_dry_screed',name:'Сухая стяжка'},
        {id:'floor_csp_5cm',name:'Цементно-песчаная стяжка до 5 см'},
        {id:'floor_csp_over_5cm',name:'Цементно-песчаная стяжка от 5 см'},
        {id:'floor_reinforced_csp_5cm',name:'Армированная цементно-песчаная стяжка до 5 см'},
        {id:'floor_reinforced_csp_over_5cm',name:'Армированная цементно-песчаная стяжка от 5 см'},
        {id:'floor_diamond_cut',name:'Снятие любого покрытия алмазной резкой'},
        {id:'floor_brick',name:'Кирпичная кладка'},
      ],
      wall: [
        {id:'wall_wallpaper',name:'Обои'},
        {id:'wall_paint',name:'Покраска'},
        {id:'wall_decorative_plaster',name:'Декоративная штукатурка'},
        {id:'wall_microcement',name:'Микроцемент'},
        {id:'wall_plaster_3cm',name:'Гипсовая штукатурка до 3 см'},
        {id:'wall_plaster_5cm',name:'Гипсовая штукатурка до 5 см'},
        {id:'wall_plaster_reinforced_5cm',name:'Арм. гипсовая штукатурка до 5 см'},
        {id:'wall_cement_3cm',name:'Цементная штукатурка до 3 см'},
        {id:'wall_cement_5cm',name:'Цементная штукатурка до 5 см'},
        {id:'wall_cement_reinforced_3cm',name:'Арм. цементная штукатурка до 3 см'},
        {id:'wall_cement_reinforced_5cm',name:'Арм. цементная штукатурка до 5 см'},
        {id:'wall_ceramic',name:'Керамическая плитка'},
        {id:'wall_porcelain',name:'Керамогранит'},
        {id:'wall_mosaic',name:'Мозаика'},
        {id:'wall_mdf_pvc',name:'МДФ/ПВХ панели'},
        {id:'wall_ree_panel',name:'Реечные/декоративные панели'},
        {id:'wall_panels',name:'Панели'},
      ],
      ceiling: [
        {id:'ceiling_suspended',name:'Подвесные потолки'},
        {id:'ceiling_stretch',name:'Натяжные потолки'},
        {id:'ceiling_ree',name:'Реечные потолки'},
        {id:'ceiling_gk',name:'Гипсокартонный потолок'},
        {id:'ceiling_cassette',name:'Кассетный / Армстронг'},
        {id:'ceiling_grilyato',name:'Грильято'},
        {id:'ceiling_paint',name:'Краска'},
        {id:'ceiling_plaster',name:'Гипсовая штукатурка'},
        {id:'ceiling_waterproof',name:'Гидроизоляция'},
      ],
    };

    function getDemolitionFinishingOptions(category) {
      const branch = window.pricesData?.works?.demolition?.categories?.finishing?.subcategories?.[category];
      if (!branch) return demolitionFinishingOptions[category] || [];

      const items = [];
      const collectItems = node => {
        if (Array.isArray(node?.items)) {
          items.push(...node.items);
        }
        if (node?.subcategories) {
          Object.values(node.subcategories).forEach(collectItems);
        }
      };

      collectItems(branch);
      return items.length
        ? items.map(item => ({ id: item.id, name: item.name, unit: item.unit || 'м²' }))
        : demolitionFinishingOptions[category] || [];
    }

    window.getDemolitionFinishingOptions = getDemolitionFinishingOptions;
    
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
      wallWaterproof: [
        { value: 'rough_wall_rough_waterproof_coat', label: '\u0413\u0438\u0434\u0440\u043E\u0438\u0437\u043E\u043B\u044F\u0446\u0438\u044F \u0441\u0442\u0435\u043D \u043E\u0431\u043C\u0430\u0437\u043E\u0447\u043D\u0430\u044F', measure: 'area' },
        { value: 'rough_wall_rough_waterproof_roll', label: '\u0413\u0438\u0434\u0440\u043E\u0438\u0437\u043E\u043B\u044F\u0446\u0438\u044F \u0441\u0442\u0435\u043D \u0440\u0443\u043B\u043E\u043D\u043D\u0430\u044F', measure: 'area' },
        { value: 'rough_wall_rough_waterproof_tape', label: '\u0413\u0435\u0440\u043C\u0435\u0442\u0438\u0437\u0438\u0440\u0443\u044E\u0449\u0430\u044F \u043B\u0435\u043D\u0442\u0430', measure: 'length' }
      ],
      partitions: [
        { value: 'drywall_partition', label: 'Монтаж перегородки из ГКЛ по каркасу', measure: 'area' },
        { value: 'rough_partition_gazobeton', label: 'Кладка перегородки из газобетона / пеноблока', measure: 'area' },
        { value: 'rough_partition_gazobeton_metal_tape', label: 'Армирование перегородки металлической лентой', measure: 'length' },
        { value: 'rough_partition_joint_foam', label: 'Пропенивание стыков примыкания перегородок', measure: 'length' },
        { value: 'rough_partition_pazogreb', label: 'Монтаж перегородки из пазогребневой плиты', measure: 'area' },
        { value: 'brick_wall', label: 'Кладка кирпичной перегородки', measure: 'area' },
        { value: 'glass_partition', label: 'Монтаж стеклянной перегородки', measure: 'area' },
        { value: 'wood_partition', label: 'Монтаж деревянной или каркасной перегородки', measure: 'area' }
      ],
      surfaceProtection: [
        { value: 'rough_protection_windows_film', label: 'Защита окон пленкой', measure: 'qty' },
        { value: 'rough_protection_doors_film', label: 'Защита дверей пленкой', measure: 'qty' },
        { value: 'rough_protection_floor_film', label: 'Укрытие пола пленкой', measure: 'area' },
        { value: 'rough_protection_floor_hardboard', label: 'Укрытие пола оргалитом', measure: 'area' },
        { value: 'rough_protection_floor_penoplex', label: 'Укрытие пола пеноплексом', measure: 'area' },
        { value: 'rough_protection_common_areas_film', label: 'Укрытие мест общего пользования пленкой', measure: 'area' }
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
      if (measure === 'length') return { field: 'length', label: '\u0414\u043b\u0438\u043d\u0430, \u043c', step: '0.1', min: '0', unit: '\u043c', integer: false };
      if (measure === 'area') return { field: 'area', label: '\u041f\u043b\u043e\u0449\u0430\u0434\u044c, \u043c\u00b2', step: '0.01', min: '0', unit: '\u043c\u00b2', integer: false };
      return { field: 'qty', label: '\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e, \u0448\u0442', step: '1', min: '0', unit: '\u0448\u0442', integer: true };
    }

    function getRepairEngineeringValue(item, meta) {
      if (!item) return 0;
      return Number(item[meta.field] || 0);
    }

    function getRepairRoughMeasureMeta(category, value) {
      if (typeof getInstallationMeasureMeta === 'function' && value) {
        return getInstallationMeasureMeta(value, '\u043c\u00b2');
      }
      return { field: 'area', label: '\u041f\u043b\u043e\u0449\u0430\u0434\u044c, \u043c\u00b2', step: '0.01', min: '0', unit: '\u043c\u00b2', integer: false };
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
        { value: 'floor_self_leveling', label: 'Наливные полы', measure: 'area' },
        { value: 'floor_polymer', label: 'Полимерные полы', measure: 'area' },
        { value: 'floor_decorative', label: 'Декоративные полы', measure: 'area' },
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
      ]
    };

    function getRepairFinishingOption(category, value) {
      return (repairFinishingOptions[category] || []).find(option => option.value === value);
    }

    function getRepairFinishingMeasureMeta(category, value) {
      if (typeof getInstallationMeasureMeta === 'function' && value) {
        return getInstallationMeasureMeta(value, '\u043c\u00b2');
      }
      const option = getRepairFinishingOption(category, value) || repairFinishingOptions[category]?.[0];
      const measure = option?.measure || 'area';
      if (measure === 'length') return { field: 'length', label: '\u0414\u043b\u0438\u043d\u0430, \u043c', step: '0.1', min: '0', unit: '\u043c', integer: false };
      if (measure === 'qty') return { field: 'qty', label: '\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e, \u0448\u0442', step: '1', min: '0', unit: '\u0448\u0442', integer: true };
      return { field: 'area', label: '\u041f\u043b\u043e\u0449\u0430\u0434\u044c, \u043c\u00b2', step: '0.01', min: '0', unit: '\u043c\u00b2', integer: false };
    }

    function getRepairFinishingValue(item, meta) {
      if (!item) return 0;
      return Number(item[meta.field] || 0);
    }

    const repairCategoryGroups = {
      rough: ['floorLeveling', 'wallPlaster', 'wallPutty', 'wallWaterproof', 'partitions', 'surfaceProtection', 'ceilingPrep'],
      engineering: ['electrical', 'ventilation', 'water', 'drainage', 'heating'],
      finishing: ['floor', 'wall', 'ceiling']
    };

    function formatRepairMoney(value) {
      return value > 0 ? `${value.toLocaleString('ru-RU')} \u20bd` : '\u2014';
    }

    function getRepairCategorySection(category) {
      if (repairCategoryGroups.engineering.includes(category)) return 'engineering';
      if (repairCategoryGroups.finishing.includes(category)) return 'finishing';
      return 'rough';
    }

    function getRepairOptionValue(option) {
      return typeof option === 'string' ? option : option?.value || '';
    }

    function getRepairOptionsForCategory(section, category) {
      let optionsGroup = [];
      if (section === 'rough') {
        optionsGroup = typeof getRepairRoughOptionsFromPriceList === 'function'
          ? getRepairRoughOptionsFromPriceList(category)
          : [];
        if (!optionsGroup || optionsGroup.length === 0) {
          optionsGroup = repairRoughOptions[category] || [];
        }
      } else if (section === 'engineering') {
        optionsGroup = typeof getRepairEngineeringOptionsFromPriceList === 'function'
          ? getRepairEngineeringOptionsFromPriceList(category)
          : [];
        if (!optionsGroup || optionsGroup.length === 0) {
          optionsGroup = repairEngineeringOptions[category] || [];
        }
      } else if (section === 'finishing') {
        optionsGroup = typeof getRepairFinishingOptionsFromPriceList === 'function'
          ? getRepairFinishingOptionsFromPriceList(category)
          : [];
        if (!optionsGroup || optionsGroup.length === 0) {
          optionsGroup = repairFinishingOptions[category] || [];
        }
      }
      return optionsGroup || [];
    }

    function getRepairDefaultWorkId(section, category, optionsGroup = null) {
      const options = optionsGroup || getRepairOptionsForCategory(section, category);
      return getRepairOptionValue(options[0]) || '';
    }

    function getRepairCategoryItems(roomId, category) {
      const section = getRepairCategorySection(category);
      return roomData.repairData?.[roomId]?.[section]?.[category] || [];
    }

    function getRepairMeasureMetaForCategory(category, workId) {
      const section = getRepairCategorySection(category);
      if (section === 'engineering') return getRepairEngineeringMeasureMeta(category, workId);
      if (section === 'finishing') return getRepairFinishingMeasureMeta(category, workId);
      return getRepairRoughMeasureMeta(category, workId);
    }

    function getRepairItemQty(category, item) {
      const workId = item?.workId || item?.type || '';
      const meta = getRepairMeasureMetaForCategory(category, workId);
      return Number(item?.[meta.field] || 0);
    }

    function getRepairItemUnitPrice(item) {
      const workId = item?.workId || item?.type || '';
      const roomRepairPrice = Number(item?.roomRepairUnitPrice || 0);
      if (roomRepairPrice > 0) return roomRepairPrice;
      if (!workId || typeof getWorkPrice !== 'function') return 0;
      return Number(getWorkPrice(workId) || 0);
    }

    function getRepairItemTotal(category, item) {
      return Math.round(getRepairItemUnitPrice(item) * getRepairItemQty(category, item));
    }

    function getRepairCategoryTotal(roomId, category) {
      return getRepairCategoryItems(roomId, category)
        .reduce((sum, item) => sum + getRepairItemTotal(category, item), 0);
    }

    function getRepairStairsTotal(roomId) {
      const stairs = roomData.repairData?.[roomId]?.finishing?.stairs;
      if (!stairs || typeof getWorkPrice !== 'function') return 0;
      const entries = Array.isArray(stairs) ? stairs : Object.values(stairs);
      return entries.reduce((sum, item) => {
        const workId = item?.workId || '';
        const qty = Number(item?.qty || item?.length || item?.area || 0);
        return sum + (workId && qty > 0 ? Math.round(getRepairItemUnitPrice(item) * qty) : 0);
      }, 0);
    }

    function getRepairArchitecturalSupervisionTotal(roomId) {
      const supervision = roomData.repairData?.[roomId]?.architecturalSupervision || {};
      if (typeof getWorkPrice !== 'function') return 0;
      return Object.values(supervision).reduce((sum, item) => {
        const workId = item?.workId || '';
        const qty = Number(item?.qty || 0);
        return sum + (workId && qty > 0 ? Math.round((getWorkPrice(workId) || 0) * qty) : 0);
      }, 0);
    }

    function updateRepairCategoryTotals(roomId) {
      if (!roomId) return;

      Object.entries(repairCategoryGroups).forEach(([groupKey, categories]) => {
        let groupTotal = 0;

        categories.forEach(category => {
          const items = getRepairCategoryItems(roomId, category);
          const domKey = getRepairCategoryDomKey(category);
          const container = document.getElementById(`${roomId}_${domKey}_list`);
          let categoryTotal = 0;

          items.forEach((item, index) => {
            const workId = item?.workId || item?.type || '';
            const price = getRepairItemUnitPrice(item);
            const rowTotal = getRepairItemTotal(category, item);
            categoryTotal += rowTotal;

            const scopedPriceCell = document.querySelector(`[data-repair-price-cell="${roomId}_${category}_${index}"]`);
            const scopedTotalCell = document.querySelector(`[data-repair-total-cell="${roomId}_${category}_${index}"]`);
            if (scopedPriceCell) scopedPriceCell.textContent = formatRepairMoney(price);
            if (scopedTotalCell) scopedTotalCell.textContent = formatRepairMoney(rowTotal);

            if (container) {
              const priceCells = container.querySelectorAll('.construct-price-cell');
              if (!scopedPriceCell && priceCells[index]) priceCells[index].textContent = formatRepairMoney(price);
              const totalCells = container.querySelectorAll('.construct-total-cell');
              if (!scopedTotalCell && totalCells[index]) totalCells[index].textContent = formatRepairMoney(rowTotal);
            }
          });

          if (['rough', 'engineering', 'finishing'].includes(groupKey)) {
            getRepairCategoryLeafSubcategories(groupKey, category).forEach(subcategory => {
              const subDomKey = getRepairCategorySubcategoryDomKey(category, subcategory.key);
              const subcategoryTotalEl = document.getElementById(`${roomId}_${subDomKey}_total`);
              if (subcategoryTotalEl) {
                const subcategoryTotal = getRepairSubcategoryItems(roomId, groupKey, category, subcategory.key)
                  .reduce((sum, item) => sum + getRepairItemTotal(category, item), 0);
                subcategoryTotalEl.textContent = formatRepairMoney(subcategoryTotal);
              }
            });
          }

          groupTotal += categoryTotal;
          const categoryTotalEl = document.getElementById(`${roomId}_${domKey}_total`);
          if (categoryTotalEl) categoryTotalEl.textContent = formatRepairMoney(categoryTotal);
        });

        if (groupKey === 'finishing') {
          groupTotal += getRepairStairsTotal(roomId);
        }

        const groupTotalEl = document.getElementById(`${roomId}_${groupKey}Total`);
        if (groupTotalEl) groupTotalEl.textContent = formatRepairMoney(groupTotal);
      });

      updateRepairArchitecturalSupervisionTotals(roomId);
    }

    window.updateRepairCategoryTotals = updateRepairCategoryTotals;

    function getRepairArchitecturalSupervisionNode() {
      return window.pricesData?.works?.installation?.categories?.architecturalSupervision || null;
    }

    function collectRepairArchitecturalSupervisionIds(node, result = []) {
      if (Array.isArray(node?.items)) {
        node.items.forEach(item => result.push(item.id));
      }
      if (node?.subcategories) {
        Object.values(node.subcategories).forEach(child => collectRepairArchitecturalSupervisionIds(child, result));
      }
      return result;
    }

    function getRepairArchitecturalSupervisionItemTotal(roomId, workId) {
      const item = roomData.repairData?.[roomId]?.architecturalSupervision?.[workId];
      const qty = Number(item?.qty || 0);
      const price = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
      return Math.round(price * qty);
    }

    function updateRepairArchitecturalSupervisionTotals(roomId) {
      const root = document.getElementById(`${roomId}_architecturalSupervisionContent`);
      if (!root) return;

      root.querySelectorAll('[data-arch-work-id]').forEach(row => {
        const workId = row.getAttribute('data-arch-work-id') || '';
        const price = (typeof getWorkPrice === 'function' && workId) ? (getWorkPrice(workId) || 0) : 0;
        const rowTotal = getRepairArchitecturalSupervisionItemTotal(roomId, workId);
        const priceEl = row.querySelector('.construct-price-cell');
        const totalEl = row.querySelector('.construct-total-cell');
        if (priceEl) priceEl.textContent = formatRepairMoney(price);
        if (totalEl) totalEl.textContent = formatRepairMoney(rowTotal);
      });

      root.querySelectorAll('[data-arch-total-ids]').forEach(totalRow => {
        const ids = (totalRow.getAttribute('data-arch-total-ids') || '').split(' ').filter(Boolean);
        const total = ids.reduce((sum, workId) => sum + getRepairArchitecturalSupervisionItemTotal(roomId, workId), 0);
        const totalEl = totalRow.querySelector('.construct-subtotal-val, .construct-total-val');
        if (totalEl) totalEl.textContent = formatRepairMoney(total);
      });

      const totalEl = document.getElementById(`${roomId}_architecturalSupervisionTotal`);
      if (totalEl) totalEl.textContent = formatRepairMoney(getRepairArchitecturalSupervisionTotal(roomId));
    }

    function updateRepairArchitecturalSupervisionQty(roomId, workId, value) {
      const repair = ensureRepairDataStructure(roomId);
      const qty = Math.max(0, Number(parseFloat(value) || 0));
      if (qty > 0) {
        repair.architecturalSupervision[workId] = {
          workId,
          qty: Number(qty.toFixed(2)),
          unit: '1 час',
          manualEntry: true
        };
      } else {
        delete repair.architecturalSupervision[workId];
      }

      updateRepairArchitecturalSupervisionTotals(roomId);
      checkRepairDone(roomId, 'architecturalSupervision');
      updateWhatToDoAutofillIndicators();
    }

    window.updateRepairArchitecturalSupervisionQty = updateRepairArchitecturalSupervisionQty;
    
    function getRepairCategoryConfig(category) {
      const metrics = {
        floorLeveling: { defaultAreaKey: 'floorArea', maxCount: 5, title: '\u0412\u044B\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u043D\u0438\u0435 \u043F\u043E\u043B\u0430', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 5 },
        wallPlaster: { defaultAreaKey: 'wallsArea', maxCount: 6, title: '\u0428\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0441\u0442\u0435\u043D', itemLabel: '\u0422\u0438\u043F \u0448\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0438', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 6 },
        wallPutty: { defaultAreaKey: 'wallsArea', maxCount: 5, title: '\u0428\u043F\u0430\u043A\u043B\u0435\u0432\u043A\u0430 \u0441\u0442\u0435\u043D', itemLabel: '\u0422\u0438\u043F \u0448\u043F\u0430\u043A\u043B\u0435\u0432\u043A\u0438', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 5 },
        wallWaterproof: { defaultAreaKey: 'wallsArea', maxCount: 6, title: '\u0413\u0438\u0434\u0440\u043E\u0438\u0437\u043E\u043B\u044F\u0446\u0438\u044F \u0441\u0442\u0435\u043D', itemLabel: '\u0422\u0438\u043F \u0433\u0438\u0434\u0440\u043E\u0438\u0437\u043E\u043B\u044F\u0446\u0438\u0438', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 6 },
        partitions: { defaultAreaKey: 'wallsArea', maxCount: 6, title: 'Перегородки', itemLabel: 'Тип перегородки', countLabel: 'Количество', countMax: 6 },
        surfaceProtection: { defaultAreaKey: 'floorArea', maxCount: 6, title: 'Укрытие поверхностей', itemLabel: 'Тип защиты', countLabel: 'Количество', countMax: 6 },
        ceilingPrep: { defaultAreaKey: 'floorArea', maxCount: 4, title: '\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043F\u043E\u0442\u043E\u043B\u043A\u0430', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 4 },
        electrical: { maxCount: 12, title: '\u042D\u043B\u0435\u043A\u0442\u0440\u0438\u043A\u0430', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 16 },
        ventilation: { maxCount: 20, title: '\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u0435\u043D\u0442\u0438\u043B\u044F\u0446\u0438\u0438 / \u043A\u043E\u043D\u0434\u0438\u0446\u0438\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 20 },
        water: { maxCount: 10, title: '\u0412\u043E\u0434\u043E\u0441\u043D\u0430\u0431\u0436\u0435\u043D\u0438\u0435', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 14 },
        drainage: { maxCount: 10, title: '\u041A\u0430\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 12 },
        heating: { maxCount: 10, title: '\u041E\u0442\u043E\u043F\u043B\u0435\u043D\u0438\u0435', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 12 },
        floor: { defaultAreaKey: 'floorArea', maxCount: 10, title: '\u041F\u043E\u043B', itemLabel: '\u0422\u0438\u043F \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u044F', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 10 },
        wall: { defaultAreaKey: 'wallsArea', maxCount: 14, title: '\u0421\u0442\u0435\u043D\u044B', itemLabel: '\u0422\u0438\u043F \u043E\u0442\u0434\u0435\u043B\u043A\u0438', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 14 },
        ceiling: { defaultAreaKey: 'floorArea', maxCount: 8, title: '\u041F\u043E\u0442\u043E\u043B\u043E\u043A', itemLabel: '\u0422\u0438\u043F \u043E\u0442\u0434\u0435\u043B\u043A\u0438', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 8 },
        stairs: { maxCount: 10, title: '\u041B\u0435\u0441\u0442\u043D\u0438\u0446\u044B \u0438 \u043F\u0435\u0440\u0438\u043B\u0430', itemLabel: '\u0422\u0438\u043F \u0440\u0430\u0431\u043E\u0442', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 10 }
      };
      return metrics[category];
    }
    
    function getFinishingCategoryConfig(category) {
      const metrics = {
        floor: { defaultAreaKey: 'floorArea', maxCount: 5, title: '\u0421\u043D\u044F\u0442\u0438\u0435 \u043D\u0430\u043F\u043E\u043B\u044C\u043D\u044B\u0445 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0439', itemLabel: '\u0412\u0438\u0434 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u044F \u043F\u043E\u043B\u0430', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 5 },
        wall: { defaultAreaKey: 'wallsArea', maxCount: 10, title: '\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0441\u0442\u0435\u043D\u043E\u0432\u044B\u0445 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0439', itemLabel: '\u0412\u0438\u0434 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u044F \u0441\u0442\u0435\u043D', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 10 },
        ceiling: { defaultAreaKey: 'floorArea', maxCount: 10, title: '\u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0442\u043E\u043B\u043E\u0447\u043D\u044B\u0445 \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0439', itemLabel: '\u0412\u0438\u0434 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u044F \u043F\u043E\u0442\u043E\u043B\u043A\u0430', countLabel: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E', countMax: 10 }
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
      if (['floorLeveling', 'wallPlaster', 'wallPutty', 'wallWaterproof', 'partitions', 'surfaceProtection', 'ceilingPrep'].includes(category)) return 'rough';
      if (['electrical', 'ventilation', 'water', 'drainage', 'heating'].includes(category)) return 'engineering';
      if (['floor', 'wall', 'ceiling', 'stairs', 'openingsMount', 'doorOpeningMount', 'windowOpeningMount', 'balconyOpeningMount'].includes(category)) return 'finishing';
      return null;
    }

    function getRepairEngineeringCategoryNode(category) {
      return window.pricesData?.works?.installation?.categories?.engineering?.subcategories?.[category] || null;
    }

    function getRepairCategoryPriceNode(section, category) {
      const categories = window.pricesData?.works?.installation?.categories || {};
      if (section === 'engineering') return categories.engineering?.subcategories?.[category] || null;
      if (section === 'finishing') return categories.finishing?.subcategories?.[category] || null;
      return categories.rough?.subcategories?.[category]
        || categories.rough?.subcategories?.wallLeveling?.subcategories?.[category]
        || null;
    }

    function collectRepairPriceLeafSubcategories(node, result = [], keyPath = []) {
      if (!node || typeof node !== 'object') return result;

      if (Array.isArray(node.items) && node.items.length > 0) {
        result.push({
          key: keyPath.join('__') || 'items',
          name: node.name || keyPath[keyPath.length - 1] || '',
          items: node.items
        });
      }

      Object.entries(node.subcategories || {}).forEach(([key, child]) => {
        collectRepairPriceLeafSubcategories(child, result, [...keyPath, key]);
      });

      return result;
    }

    function getRepairCategoryLeafSubcategories(section, category) {
      const node = getRepairCategoryPriceNode(section, category);
      return collectRepairPriceLeafSubcategories(node);
    }

    function getRepairEngineeringSubcategories(category) {
      return getRepairCategoryLeafSubcategories('engineering', category);
    }

    function getRepairCategorySubcategoryDomKey(category, subcategoryKey) {
      return `${getRepairCategoryDomKey(category)}_${String(subcategoryKey || '').replace(/[^a-zA-Z0-9_]/g, '_')}`;
    }

    function getRepairEngineeringSubcategoryDomKey(category, subcategoryKey) {
      return getRepairCategorySubcategoryDomKey(category, subcategoryKey);
    }

    function getRepairSubcategoryOptions(section, category, subcategoryKey) {
      const subcategory = getRepairCategoryLeafSubcategories(section, category).find(item => item.key === subcategoryKey);
      return (subcategory?.items || []).map(item => ({
        value: item.id,
        label: item.name,
        measure: typeof getInstallationMeasureTypeFromUnit === 'function' ? getInstallationMeasureTypeFromUnit(item.unit) : 'qty'
      }));
    }

    function getRepairEngineeringSubcategoryOptions(category, subcategoryKey) {
      return getRepairSubcategoryOptions('engineering', category, subcategoryKey);
    }

    function getRepairSubcategoryKeyByWorkId(section, category, workId) {
      if (!workId) return '';
      const match = getRepairCategoryLeafSubcategories(section, category)
        .find(subcategory => subcategory.items.some(item => item.id === workId));
      return match?.key || '';
    }

    function getRepairEngineeringSubcategoryKeyByWorkId(category, workId) {
      return getRepairSubcategoryKeyByWorkId('engineering', category, workId);
    }

    function normalizeRepairItemSubcategory(section, category, item) {
      if (!item) return '';
      const workId = item.workId || item.type || '';
      const actualSubcategory = getRepairSubcategoryKeyByWorkId(section, category, workId);
      if (actualSubcategory) item.subcategory = actualSubcategory;
      return item.subcategory || actualSubcategory || '';
    }

    function normalizeRepairEngineeringSubcategory(category, item) {
      return normalizeRepairItemSubcategory('engineering', category, item);
    }

    function getRepairSubcategoryItems(roomId, section, category, subcategoryKey) {
      const repair = ensureRepairDataStructure(roomId);
      const items = repair[section]?.[category] || [];
      return items.filter(item => normalizeRepairItemSubcategory(section, category, item) === subcategoryKey);
    }

    function getRepairEngineeringSubcategoryTotal(roomId, category, subcategoryKey) {
      return getRepairSubcategoryItems(roomId, 'engineering', category, subcategoryKey)
        .reduce((sum, item) => sum + getRepairItemTotal(category, item), 0);
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

    const repairOpeningDoorTypeWorkOptions = [
      'Монтаж распашной двери',
      'Монтаж межкомнатной двери с доборами',
      'Установка скрытой двери',
      'Монтаж раздвижной двери',
      'Монтаж складной двери',
      'Монтаж поворотной двери',
      'Монтаж двупольной двери',
      'Монтаж двупольной двери с доборами',
      'Монтаж двупольной скрытой двери'
    ];

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
      const baseList = group[material] || group.default || [];
      if (openingType !== 'door') return baseList;
      const extended = [...baseList];
      repairOpeningDoorTypeWorkOptions.forEach(option => {
        if (!extended.includes(option)) extended.push(option);
      });
      return extended;
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
      if (['wallPlaster', 'wallPutty', 'wallWaterproof', 'wall'].includes(category)) {
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
            <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_finishingIcon"></i>
            <span>\u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u043E\u0442\u0434\u0435\u043B\u043E\u0447\u043D\u044B\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u0438 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0439</span>
            <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_finishingDone"></i>
          </div>
          <div id="${roomId}_finishingContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2.5" style="display: none;">
            <div class="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div id="${roomId}_finishing_floorHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_finishing_floor')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_finishing_floorIcon"></i>
                <span>\u0421\u043D\u044F\u0442\u0438\u0435 \u043D\u0430\u043F\u043E\u043B\u044C\u043D\u044B\u0445 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0439</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_finishing_floorDone"></i>
              </div>
              <div id="${roomId}_finishing_floorContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="flex items-center gap-2 py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="flex items-center gap-1">
                    <button type="button" class="qty-btn-mini" onclick="updateFinishingCategoryCount('${roomId}', 'floor', -1)">\u2212</button>
                    <input type="number" id="${roomId}_finishing_floor_count" value="${floorCount}" min="0" max="5" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleFinishingCategoryInput('${roomId}', 'floor')">
                    <button type="button" class="qty-btn-mini" onclick="updateFinishingCategoryCount('${roomId}', 'floor', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_finishing_floor_list"></div>
                <div class="construct-subtotal"><span class="construct-subtotal-label">\u0418\u0442\u043E\u0433\u043E:</span><span class="construct-subtotal-val" id="${roomId}_finishing_floorTotal">\u2014</span></div>
              </div>
            </div>
            <div class="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div id="${roomId}_finishing_wallHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_finishing_wall')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_finishing_wallIcon"></i>
                <span>\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0441\u0442\u0435\u043D\u043E\u0432\u044B\u0445 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0439</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_finishing_wallDone"></i>
              </div>
              <div id="${roomId}_finishing_wallContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="flex items-center gap-2 py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="flex items-center gap-1">
                    <button type="button" class="qty-btn-mini" onclick="updateFinishingCategoryCount('${roomId}', 'wall', -1)">\u2212</button>
                    <input type="number" id="${roomId}_finishing_wall_count" value="${wallCount}" min="0" max="10" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleFinishingCategoryInput('${roomId}', 'wall')">
                    <button type="button" class="qty-btn-mini" onclick="updateFinishingCategoryCount('${roomId}', 'wall', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_finishing_wall_list"></div>
                <div class="construct-subtotal"><span class="construct-subtotal-label">\u0418\u0442\u043E\u0433\u043E:</span><span class="construct-subtotal-val" id="${roomId}_finishing_wallTotal">\u2014</span></div>
              </div>
            </div>
            <div class="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div id="${roomId}_finishing_ceilingHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_finishing_ceiling')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_finishing_ceilingIcon"></i>
                <span>\u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u043F\u043E\u0442\u043E\u043B\u043E\u0447\u043D\u044B\u0445 \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0439</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_finishing_ceilingDone"></i>
              </div>
              <div id="${roomId}_finishing_ceilingContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div class="flex items-center gap-2 py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="flex items-center gap-1">
                    <button type="button" class="qty-btn-mini" onclick="updateFinishingCategoryCount('${roomId}', 'ceiling', -1)">\u2212</button>
                    <input type="number" id="${roomId}_finishing_ceiling_count" value="${ceilingCount}" min="0" max="10" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleFinishingCategoryInput('${roomId}', 'ceiling')">
                    <button type="button" class="qty-btn-mini" onclick="updateFinishingCategoryCount('${roomId}', 'ceiling', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_finishing_ceiling_list"></div>
                <div class="construct-subtotal"><span class="construct-subtotal-label">\u0418\u0442\u043E\u0433\u043E:</span><span class="construct-subtotal-val" id="${roomId}_finishing_ceilingTotal">\u2014</span></div>
              </div>
            </div>
            <div class="construct-total-row">
              <span class="construct-total-label">\u0418\u0442\u043E\u0433\u043E \u2014 \u0414\u0435\u043C\u043E\u043D\u0442\u0430\u0436 \u043E\u0442\u0434\u0435\u043B\u043E\u0447\u043D\u044B\u0445:</span>
              <span class="construct-total-val" id="${roomId}_finishingTotal">\u2014</span>
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

;

    function escapeRepairHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderRepairCategorySubgroups(roomId, section, category, repair) {
      const subcategories = getRepairCategoryLeafSubcategories(section, category);
      const config = getRepairCategoryConfig(category);
      const domKeyBase = getRepairCategoryDomKey(category);
      const legacyItems = repair[section]?.[category] || [];

      if (subcategories.length === 0) {
        return `
                <div class="repair-controls py-2">
                  <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                  <div class="repair-qty">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', '${category}', -1)">\u2212</button>
                    <input type="number" id="${roomId}_${domKeyBase}_count" value="${legacyItems.length || 0}" min="0" max="${config.countMax}" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', '${category}')">
                    <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', '${category}', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_${domKeyBase}_list"></div>`;
      }

      return subcategories.map(subcategory => {
        const domKey = getRepairCategorySubcategoryDomKey(category, subcategory.key);
        const count = getRepairSubcategoryItems(roomId, section, category, subcategory.key).length;
        const countMax = Math.max(subcategory.items.length, config.countMax);
        return `
                <div class="repair-work-group">
                  <div id="${roomId}_${domKey}Header" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_${domKey}')">
                    <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_${domKey}Icon" style="transform: rotate(-90deg)"></i>
                    <span>${escapeRepairHtml(subcategory.name)}</span>
                  </div>
                  <div id="${roomId}_${domKey}Content" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                    <div class="repair-controls py-2">
                      <label class="text-sm text-gray-500 w-20 sm:w-24">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E:</label>
                      <div class="repair-qty">
                        <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', '${category}', -1, '${subcategory.key}')">\u2212</button>
                        <input type="number" id="${roomId}_${domKey}_count" value="${count}" min="0" max="${countMax}" class="repair-count-input px-2 py-1 text-sm border rounded" oninput="handleRepairCategoryInput('${roomId}', '${category}', '${subcategory.key}')">
                        <button type="button" class="qty-btn-mini" onclick="updateRepairCategoryCount('${roomId}', '${category}', 1, '${subcategory.key}')">+</button>
                      </div>
                    </div>
                    <div id="${roomId}_${domKey}_list"></div>
                    <div class="construct-subtotal">
                      <span class="construct-subtotal-label">Итого по подгруппе:</span>
                      <span class="construct-subtotal-val" id="${roomId}_${domKey}_total">—</span>
                    </div>
                  </div>
                </div>`;
      }).join('');
    }

    function renderRepairEngineeringCategorySubgroups(roomId, category, repair) {
      return renderRepairCategorySubgroups(roomId, 'engineering', category, repair);
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
                ${renderRepairCategorySubgroups(roomId, 'rough', 'floorLeveling', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по выравниванию пола:</span>
                  <span class="construct-subtotal-val" id="${roomId}_floorLeveling_total">—</span>
                </div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_wallPlasterHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_wallPlaster')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_wallPlasterIcon" style="transform: rotate(-90deg)"></i>
                <span>\u0428\u0442\u0443\u043A\u0430\u0442\u0443\u0440\u043A\u0430 \u0441\u0442\u0435\u043D</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_wallPlasterDone"></i>
              </div>
              <div id="${roomId}_wallPlasterContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                ${renderRepairCategorySubgroups(roomId, 'rough', 'wallPlaster', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по штукатурке стен:</span>
                  <span class="construct-subtotal-val" id="${roomId}_wallPlaster_total">—</span>
                </div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_wallPuttyHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_wallPutty')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_wallPuttyIcon" style="transform: rotate(-90deg)"></i>
                <span>\u0428\u043F\u0430\u043A\u043B\u0435\u0432\u043A\u0430 \u0441\u0442\u0435\u043D</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_wallPuttyDone"></i>
              </div>
              <div id="${roomId}_wallPuttyContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                ${renderRepairCategorySubgroups(roomId, 'rough', 'wallPutty', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по шпаклёвке стен:</span>
                  <span class="construct-subtotal-val" id="${roomId}_wallPutty_total">—</span>
                </div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_wallWaterproofHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_wallWaterproof')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_wallWaterproofIcon" style="transform: rotate(-90deg)"></i>
                <span>Гидроизоляция стен</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_wallWaterproofDone"></i>
              </div>
              <div id="${roomId}_wallWaterproofContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                ${renderRepairCategorySubgroups(roomId, 'rough', 'wallWaterproof', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по гидроизоляции стен:</span>
                  <span class="construct-subtotal-val" id="${roomId}_wallWaterproof_total">—</span>
                </div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_partitionsHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_partitions')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_partitionsIcon" style="transform: rotate(-90deg)"></i>
                <span>Перегородки</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_partitionsDone"></i>
              </div>
              <div id="${roomId}_partitionsContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                ${renderRepairCategorySubgroups(roomId, 'rough', 'partitions', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по перегородкам:</span>
                  <span class="construct-subtotal-val" id="${roomId}_partitions_total">—</span>
                </div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_surfaceProtectionHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_surfaceProtection')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_surfaceProtectionIcon" style="transform: rotate(-90deg)"></i>
                <span>Укрытие поверхностей</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_surfaceProtectionDone"></i>
              </div>
              <div id="${roomId}_surfaceProtectionContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                ${renderRepairCategorySubgroups(roomId, 'rough', 'surfaceProtection', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по укрытию поверхностей:</span>
                  <span class="construct-subtotal-val" id="${roomId}_surfaceProtection_total">—</span>
                </div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_ceilingPrepHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_ceilingPrep')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_ceilingPrepIcon" style="transform: rotate(-90deg)"></i>
                <span>\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043F\u043E\u0442\u043E\u043B\u043A\u0430</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_ceilingPrepDone"></i>
              </div>
              <div id="${roomId}_ceilingPrepContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                ${renderRepairCategorySubgroups(roomId, 'rough', 'ceilingPrep', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по подготовке потолка:</span>
                  <span class="construct-subtotal-val" id="${roomId}_ceilingPrep_total">—</span>
                </div>
              </div>
            </div>
            <div class="construct-total-row">
              <span class="construct-total-label">Итого — Черновые работы:</span>
              <span class="construct-total-val" id="${roomId}_roughTotal">—</span>
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
                ${renderRepairCategorySubgroups(roomId, 'engineering', 'electrical', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по электрике:</span>
                  <span class="construct-subtotal-val" id="${roomId}_electrical_total">—</span>
                </div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_ventilationHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_ventilation')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_ventilationIcon" style="transform: rotate(-90deg)"></i>
                <span>\u041C\u043E\u043D\u0442\u0430\u0436 \u0432\u0435\u043D\u0442\u0438\u043B\u044F\u0446\u0438\u0438 / \u043A\u043E\u043D\u0434\u0438\u0446\u0438\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_ventilationDone"></i>
              </div>
              <div id="${roomId}_ventilationContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                ${renderRepairCategorySubgroups(roomId, 'engineering', 'ventilation', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по вентиляции / кондиционированию:</span>
                  <span class="construct-subtotal-val" id="${roomId}_ventilation_total">—</span>
                </div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_waterHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_water')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_waterIcon" style="transform: rotate(-90deg)"></i>
                <span>\u0412\u043E\u0434\u043E\u0441\u043D\u0430\u0431\u0436\u0435\u043D\u0438\u0435</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_waterDone"></i>
              </div>
              <div id="${roomId}_waterContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                ${renderRepairCategorySubgroups(roomId, 'engineering', 'water', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по водоснабжению:</span>
                  <span class="construct-subtotal-val" id="${roomId}_water_total">—</span>
                </div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_drainageHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_drainage')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_drainageIcon" style="transform: rotate(-90deg)"></i>
                <span>\u041A\u0430\u043D\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_drainageDone"></i>
              </div>
              <div id="${roomId}_drainageContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                ${renderRepairCategorySubgroups(roomId, 'engineering', 'drainage', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по канализации:</span>
                  <span class="construct-subtotal-val" id="${roomId}_drainage_total">—</span>
                </div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_heatingHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_heating')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_heatingIcon" style="transform: rotate(-90deg)"></i>
                <span>\u041E\u0442\u043E\u043F\u043B\u0435\u043D\u0438\u0435</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_heatingDone"></i>
              </div>
              <div id="${roomId}_heatingContent" class="pl-3 sm:pl-4 mt-1 sm:mt-2" style="display: none;">
                ${renderRepairCategorySubgroups(roomId, 'engineering', 'heating', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по отоплению:</span>
                  <span class="construct-subtotal-val" id="${roomId}_heating_total">—</span>
                </div>
              </div>
            </div>
            <div class="construct-total-row">
              <span class="construct-total-label">Итого — Инженерные работы:</span>
              <span class="construct-total-val" id="${roomId}_engineeringTotal">—</span>
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
                ${renderRepairCategorySubgroups(roomId, 'finishing', 'floor', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по полу:</span>
                  <span class="construct-subtotal-val" id="${roomId}_floorFinish_total">—</span>
                </div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_wallFinishHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_wallFinish')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_wallFinishIcon" style="transform: rotate(-90deg)"></i>
                <span>\u0421\u0442\u0435\u043D\u044B</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_wallFinishDone"></i>
              </div>
              <div id="${roomId}_wallFinishContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                ${renderRepairCategorySubgroups(roomId, 'finishing', 'wall', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по стенам:</span>
                  <span class="construct-subtotal-val" id="${roomId}_wallFinish_total">—</span>
                </div>
              </div>
            </div>
            <div class="repair-work-group">
              <div id="${roomId}_ceilingFinishHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_ceilingFinish')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_ceilingFinishIcon" style="transform: rotate(-90deg)"></i>
                <span>\u041F\u043E\u0442\u043E\u043B\u043E\u043A</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_ceilingFinishDone"></i>
              </div>
              <div id="${roomId}_ceilingFinishContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                ${renderRepairCategorySubgroups(roomId, 'finishing', 'ceiling', repair)}
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по потолку:</span>
                  <span class="construct-subtotal-val" id="${roomId}_ceilingFinish_total">—</span>
                </div>
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
            <div class="repair-work-group">
              <div id="${roomId}_stairsMountHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_stairsMount')">
                <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_stairsMountIcon" style="transform: rotate(-90deg)"></i>
                <span>\u041B\u0435\u0441\u0442\u043D\u0438\u0446\u044B \u0438 \u043F\u0435\u0440\u0438\u043B\u0430</span>
                <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_stairsMountDone"></i>
              </div>
              <div id="${roomId}_stairsMountContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
                <div id="${roomId}_stairsMount_list"></div>
              </div>
            </div>
            <div class="construct-total-row">
              <span class="construct-total-label">Итого — Чистовые работы:</span>
              <span class="construct-total-val" id="${roomId}_finishingTotal">—</span>
            </div>
          </div>
        </div>
        ${renderRepairArchitecturalSupervisionSection(roomId)}
      `;
    }
    
    function updateRepairCategoryCount(roomId, category, delta, subcategory = '') {
      const section = getRepairCategorySection(category);
      const domKey = subcategory
        ? getRepairCategorySubcategoryDomKey(category, subcategory)
        : getRepairCategoryDomKey(category);
      const input = document.getElementById(`${roomId}_${domKey}_count`);
      if (!input) return;
      const config = getRepairCategoryConfig(category);
      const subcategoryOptions = subcategory ? getRepairSubcategoryOptions(section, category, subcategory) : [];
      const countMax = subcategory ? Math.max(subcategoryOptions.length, config.countMax) : config.countMax;
      let count = parseInt(input.value, 10) || 0;
      count = Math.max(0, Math.min(countMax, count + delta));
      input.value = count;
      renderRepairCategoryFields(roomId, category, count, 'manual', subcategory);
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

    function renderRepairArchitecturalSupervisionSection(roomId) {
      const node = getRepairArchitecturalSupervisionNode();
      if (!node) {
        return `
          <div class="mb-2 sm:mb-3">
            <div class="text-sm text-gray-500 p-3 bg-gray-50 dark:bg-gray-800 rounded">Архитектурный надзор пока не загружен из прайс-листа.</div>
          </div>
        `;
      }

      const repair = ensureRepairDataStructure(roomId);
      const supervision = repair.architecturalSupervision || {};

      const renderWorks = (items = []) => items.map(item => {
        const saved = supervision[item.id] || {};
        const qty = saved.qty !== undefined ? saved.qty : '';
        const price = (typeof getWorkPrice === 'function') ? (getWorkPrice(item.id) || 0) : 0;
        const total = price > 0 && Number(qty) > 0 ? Math.round(price * Number(qty)) : 0;
        const badge = saved.manualEntry ? renderRepairStatusBadge({
          label: 'Вручную',
          icon: 'fa-user',
          className: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
          title: 'Пункт архитектурного надзора заполнен вручную'
        }) : '';

        return `
          <div class="repair-item" data-arch-work-id="${item.id}">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <div class="text-xs font-medium text-gray-500">${item.name}</div>
              ${badge}
            </div>
            <div class="flex flex-wrap items-end gap-2">
              <div>
                <label class="text-xs text-gray-500 block mb-1">Количество часов:</label>
                <input type="number" value="${qty}" min="0" step="0.25" class="repair-area-input w-24 px-2 py-1 text-sm border rounded" oninput="updateRepairArchitecturalSupervisionQty('${roomId}', '${item.id}', this.value)" onchange="updateRepairArchitecturalSupervisionQty('${roomId}', '${item.id}', this.value)">
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">Цена за 1 час:</label>
                <div class="construct-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300">${formatRepairMoney(price)}</div>
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">Итого:</label>
                <div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600">${formatRepairMoney(total)}</div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      const renderNode = (currentNode, path = [], depth = 0) => {
        const nodeId = `${roomId}_arch_${path.join('_') || 'root'}`;
        const ids = collectRepairArchitecturalSupervisionIds(currentNode, []).join(' ');
        const hasChildren = currentNode?.subcategories && Object.keys(currentNode.subcategories).length > 0;
        const hasItems = Array.isArray(currentNode?.items) && currentNode.items.length > 0;
        const titleSize = depth === 0 ? 'text-sm font-semibold' : depth === 1 ? 'text-sm' : 'text-xs';
        const wrapperClass = depth === 0 ? 'repair-work-group' : 'repair-work-group ml-3';

        let html = `
          <div class="${wrapperClass}">
            <div class="flex items-center gap-2 py-1.5 cursor-pointer ${titleSize} text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${nodeId}')">
              <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${nodeId}Icon" style="transform: rotate(-90deg)"></i>
              <span class="flex-1">${currentNode.name}</span>
            </div>
            <div id="${nodeId}Content" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2" style="display: none;">
        `;

        if (hasChildren) {
          Object.entries(currentNode.subcategories).forEach(([key, child]) => {
            html += renderNode(child, [...path, key], depth + 1);
          });
        }

        if (hasItems) {
          html += renderWorks(currentNode.items);
        }

        html += depth === 0
          ? `
              <div class="construct-total-row" data-arch-total-ids="${ids}">
                <span class="construct-total-label">Итого — ${currentNode.name}:</span>
                <span class="construct-total-val">—</span>
              </div>
            `
          : `
              <div class="construct-subtotal" data-arch-total-ids="${ids}">
                <span class="construct-subtotal-label">Итого по подгруппе:</span>
                <span class="construct-subtotal-val">—</span>
              </div>
            `;

        html += `
            </div>
          </div>
        `;
        return html;
      };

      return `
        <div class="mb-2 sm:mb-3">
          <div id="${roomId}_architecturalSupervisionHeader" class="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-600 border-2 border-transparent" onclick="toggleWhatToDoSubSection('${roomId}_architecturalSupervision')">
            <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform" id="${roomId}_architecturalSupervisionIcon" style="transform: rotate(-90deg)"></i>
            <span>Архитектурный надзор</span>
            <i class="fas fa-check text-green-500 text-xs hidden" id="${roomId}_architecturalSupervisionDone"></i>
          </div>
          <div id="${roomId}_architecturalSupervisionContent" class="pl-3 sm:pl-4 mt-1.5 sm:mt-2.5" style="display: none;">
            ${Object.entries(node.subcategories || {}).map(([key, child]) => renderNode(child, [key], 0)).join('')}
            <div class="construct-total-row">
              <span class="construct-total-label">Итого — Архитектурный надзор:</span>
              <span class="construct-total-val" id="${roomId}_architecturalSupervisionTotal">—</span>
            </div>
          </div>
        </div>
      `;
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
      ['floorLeveling', 'wallPlaster', 'wallPutty', 'wallWaterproof', 'partitions', 'surfaceProtection', 'ceilingPrep'].forEach(category => markRepairItemsAutoFilled(repair.rough?.[category] || []));
      ['electrical', 'ventilation', 'water', 'drainage', 'heating'].forEach(category => markRepairItemsAutoFilled(repair.engineering?.[category] || []));
      ['floor', 'wall', 'ceiling', 'stairs'].forEach(category => markRepairItemsAutoFilled(repair.finishing?.[category] || []));
      ['door', 'window', 'balcony'].forEach(openingType => markRepairItemsAutoFilled(repair.finishing?.openings?.[openingType] || []));
    }

    function hasAutoFilledRepairRoom(roomId) {
      const repair = roomData.repairData?.[roomId];
      if (!repair) return false;
      const sections = [
        ...(repair.rough?.floorLeveling || []),
        ...(repair.rough?.wallPlaster || []),
        ...(repair.rough?.wallPutty || []),
        ...(repair.rough?.wallWaterproof || []),
        ...(repair.rough?.partitions || []),
        ...(repair.rough?.surfaceProtection || []),
        ...(repair.rough?.ceilingPrep || []),
        ...(repair.engineering?.electrical || []),
        ...(repair.engineering?.ventilation || []),
        ...(repair.engineering?.water || []),
        ...(repair.engineering?.drainage || []),
        ...(repair.engineering?.heating || []),
        ...(repair.finishing?.floor || []),
        ...(repair.finishing?.wall || []),
        ...(repair.finishing?.ceiling || []),
        ...(repair.finishing?.stairs || []),
        ...(repair.finishing?.openings?.door || []),
        ...(repair.finishing?.openings?.window || []),
        ...(repair.finishing?.openings?.balcony || []),
        ...Object.values(repair.architecturalSupervision || {})
      ];
      return sections.some(hasAutoFilledRepairItem);
    }

    function hasAnyAutoFilledWhatToDo() {
      return Object.keys(roomData.repairData || {}).some(hasAutoFilledRepairRoom);
    }

    function hasDemolitionManualEntry(roomId) {
      const demo = roomData.demolitionData?.[roomId];
      if (!demo) return false;
      const allItems = [
        ...(demo.partitions || []),
        ...(demo.doorOpenings || []),
        ...(demo.windowOpenings || []),
        ...(demo.balconyOpenings || []),
        ...(demo.electrical || []),
        ...(demo.ventilation || []),
        ...(demo.water || []),
        ...(demo.drainage || []),
        ...(demo.plumbing || []),
        ...(demo.heating || []),
        ...(demo.finishing?.floor || []),
        ...(demo.finishing?.wall || []),
        ...(demo.finishing?.ceiling || []),
      ];
      return allItems.some(item => item?.manualEntry === true);
    }

    function hasManualEditedRepairRoom(roomId) {
      const repair = roomData.repairData?.[roomId];
      if (!repair) return false;
      const sections = [
        ...(repair.rough?.floorLeveling || []),
        ...(repair.rough?.wallPlaster || []),
        ...(repair.rough?.wallPutty || []),
        ...(repair.rough?.wallWaterproof || []),
        ...(repair.rough?.partitions || []),
        ...(repair.rough?.surfaceProtection || []),
        ...(repair.rough?.ceilingPrep || []),
        ...(repair.engineering?.electrical || []),
        ...(repair.engineering?.ventilation || []),
        ...(repair.engineering?.water || []),
        ...(repair.engineering?.drainage || []),
        ...(repair.engineering?.heating || []),
        ...(repair.finishing?.floor || []),
        ...(repair.finishing?.wall || []),
        ...(repair.finishing?.ceiling || []),
        ...(repair.finishing?.stairs || []),
        ...(repair.finishing?.openings?.door || []),
        ...(repair.finishing?.openings?.window || []),
        ...(repair.finishing?.openings?.balcony || []),
        ...Object.values(repair.architecturalSupervision || {})
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
        ...(repair.rough?.wallWaterproof || []),
        ...(repair.rough?.partitions || []),
        ...(repair.rough?.surfaceProtection || []),
        ...(repair.rough?.ceilingPrep || []),
        ...(repair.engineering?.electrical || []),
        ...(repair.engineering?.ventilation || []),
        ...(repair.engineering?.water || []),
        ...(repair.engineering?.drainage || []),
        ...(repair.engineering?.heating || []),
        ...(repair.finishing?.floor || []),
        ...(repair.finishing?.wall || []),
        ...(repair.finishing?.ceiling || []),
        ...(repair.finishing?.stairs || []),
        ...(repair.finishing?.openings?.door || []),
        ...(repair.finishing?.openings?.window || []),
        ...(repair.finishing?.openings?.balcony || []),
        ...Object.values(repair.architecturalSupervision || {})
      ];
      return sections.some(hasManualOnlyRepairItem);
    }

    function hasAnyManualOnlyWhatToDo() {
      const repairHas = Object.keys(roomData.repairData || {}).some(hasManualOnlyRepairRoom);
      const demolitionHas = Object.keys(roomData.demolitionData || {}).some(hasDemolitionManualEntry);
      return repairHas || demolitionHas;
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
    
    function handleRepairCategoryInput(roomId, category, subcategory = '') {
      const section = getRepairCategorySection(category);
      const domKey = subcategory
        ? getRepairCategorySubcategoryDomKey(category, subcategory)
        : getRepairCategoryDomKey(category);
      const input = document.getElementById(`${roomId}_${domKey}_count`);
      if (!input) return;
      const config = getRepairCategoryConfig(category);
      const subcategoryOptions = subcategory ? getRepairSubcategoryOptions(section, category, subcategory) : [];
      const countMax = subcategory ? Math.max(subcategoryOptions.length, config.countMax) : config.countMax;
      let count = parseInt(input.value, 10) || 0;
      count = Math.max(0, Math.min(countMax, count));
      input.value = count;
      renderRepairCategoryFields(roomId, category, count, 'manual', subcategory);
    }
    
    function renderRepairCategoryFields(roomId, category, count = null, changeSource = 'system', subcategory = '') {
      // Специальная обработка для лестниц
      if (category === 'stairs') {
        const domKey = getRepairCategoryDomKey(category);
        const container = document.getElementById(`${roomId}_${domKey}_list`);
        if (!container) return;
        
        const repair = ensureRepairDataStructure(roomId);
        const stairsData = repair.finishing?.stairs || [];
        
        // Используем новый модуль для рендера лестниц
        if (typeof window.renderStairsFields === 'function') {
          container.innerHTML = window.renderStairsFields(roomId, stairsData);
          if (typeof window.updateStairsHierarchyTotals === 'function') window.updateStairsHierarchyTotals(roomId);
        } else {
          container.innerHTML = '<div class="text-gray-500 text-sm p-4">Модуль лестниц не загружен. Подключите calc-stairs.js</div>';
        }
        
        updateWhatToDoAutofillIndicators();
        checkRepairDone(roomId, category);
        checkRepairDone(roomId, 'finishing');
        return;
      }
      
      let categoryKey = category;
      let section = getRepairCategorySection(category);
      
      const domKey = subcategory
        ? getRepairCategorySubcategoryDomKey(category, subcategory)
        : getRepairCategoryDomKey(category);
      const container = document.getElementById(`${roomId}_${domKey}_list`);
      if (!container) return;
      
      const repair = ensureRepairDataStructure(roomId);
      const config = getRepairCategoryConfig(category);
      const metrics = getRepairRoomMetrics(roomId);
      const defaultArea = getRepairAutoAreaValue(category, metrics, config);
      const items = repair[section][categoryKey];
      if (subcategory) {
        items.forEach(item => normalizeRepairItemSubcategory(section, category, item));
      }
      const optionsGroup = subcategory
        ? getRepairSubcategoryOptions(section, category, subcategory)
        : getRepairOptionsForCategory(section, category);
      const optionValues = new Set(optionsGroup.map(getRepairOptionValue).filter(Boolean));
      const defaultWorkId = getRepairDefaultWorkId(section, category, optionsGroup);
      const scopedItems = subcategory
        ? items.filter(item => normalizeRepairItemSubcategory(section, category, item) === subcategory)
        : items;
      const previousLength = scopedItems.length;
      const finalCount = count === null ? scopedItems.length : count;
      
      scopedItems.length = finalCount;
      for (let i = 0; i < finalCount; i++) {
        if (!scopedItems[i]) {
          if (section === 'engineering') {
            const measureMeta = getRepairEngineeringMeasureMeta(category, defaultWorkId);
            scopedItems[i] = { type: defaultWorkId, workId: defaultWorkId, [measureMeta.field]: 0 };
            if (subcategory) scopedItems[i].subcategory = subcategory;
          } else if (section === 'finishing') {
            const measureMeta = getRepairFinishingMeasureMeta(category, defaultWorkId);
            const defaultValue = measureMeta.field === 'area' && defaultArea > 0
              ? Number(defaultArea.toFixed(2))
              : 0;
            scopedItems[i] = { type: defaultWorkId, workId: defaultWorkId, [measureMeta.field]: defaultValue, autoFilled: measureMeta.field === 'area' };
          } else {
            const measureMeta = getRepairRoughMeasureMeta(category, defaultWorkId);
            const defaultValue = measureMeta.field === 'area' && defaultArea > 0
              ? Number(defaultArea.toFixed(2))
              : 0;
            scopedItems[i] = { type: defaultWorkId, workId: defaultWorkId, [measureMeta.field]: defaultValue, autoFilled: measureMeta.field === 'area' };
          }
          if (changeSource === 'manual') {
            scopedItems[i].manualEntry = true;
          }
        } else {
          const itemType = scopedItems[i].workId || scopedItems[i].type || '';
          if (!itemType || (optionValues.size > 0 && !optionValues.has(itemType))) {
            scopedItems[i].type = defaultWorkId;
            scopedItems[i].workId = defaultWorkId;
          } else {
            scopedItems[i].type = itemType;
            scopedItems[i].workId = itemType;
          }
          if (subcategory) {
            scopedItems[i].subcategory = subcategory;
          }
          if (section === 'rough') {
            const measureMeta = getRepairRoughMeasureMeta(category, scopedItems[i].type);
            if (measureMeta.field === 'area' && scopedItems[i].autoFilled !== false) {
              scopedItems[i][measureMeta.field] = defaultArea > 0 ? Number(defaultArea.toFixed(2)) : 0;
              scopedItems[i].autoFilled = true;
            } else if (measureMeta.field !== 'area' && scopedItems[i][measureMeta.field] === undefined) {
              delete scopedItems[i].area;
              scopedItems[i][measureMeta.field] = 0;
              scopedItems[i].autoFilled = false;
            }
          }
          if (section === 'finishing') {
            const measureMeta = getRepairFinishingMeasureMeta(category, scopedItems[i].type);
            if (measureMeta.field === 'area' && scopedItems[i].autoFilled !== false) {
              scopedItems[i][measureMeta.field] = defaultArea > 0 ? Number(defaultArea.toFixed(2)) : 0;
              scopedItems[i].autoFilled = true;
            }
          } else if (section !== 'engineering' && section !== 'rough' && (scopedItems[i].area === undefined || scopedItems[i].area === null || scopedItems[i].area === '')) {
            scopedItems[i].area = defaultArea > 0 ? Number(defaultArea.toFixed(2)) : 0;
            scopedItems[i].autoFilled = true;
          }
        }
        if (changeSource === 'manual' && i >= previousLength && scopedItems[i].autoSource !== 'quest') {
          scopedItems[i].manualEntry = true;
        }
      }

      if (subcategory) {
        const otherItems = items.filter(item => normalizeRepairItemSubcategory(section, category, item) !== subcategory);
        items.length = 0;
        items.push(...otherItems, ...scopedItems);
      }
      
      let html = '';
      for (let i = 0; i < finalCount; i++) {
        const item = scopedItems[i] || {};
        const globalIndex = subcategory ? items.indexOf(item) : i;
        const currentType = item.workId || item.type || defaultWorkId;
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
        const unitPrice = getRepairItemUnitPrice(item);
        const rowTotal = unitPrice > 0 && Number(rawValue) > 0 ? Math.round(unitPrice * Number(rawValue)) : 0;
        const autoFilledBadge = renderRepairItemStatusBadge(item);

        // Генерируем HTML для опций с поддержкой нового формата (workId)
        let selectOptionsHtml = '';
        if (section === 'rough') {
          // Черновые работы: массив {value, label}
          selectOptionsHtml = optionsGroup.map(option => {
            const val = option.value || option;
            const lbl = option.label || (typeof getInstallationWorkName === 'function' ? getInstallationWorkName(val) : val);
            return `<option value="${val}" ${currentType === val ? 'selected' : ''}>${lbl}</option>`;
          }).join('');
        } else if (section === 'engineering' || section === 'finishing') {
          // Инженерные и чистовые: массив {value, label, measure}
          selectOptionsHtml = optionsGroup.map(option => `<option value="${option.value}" ${currentType === option.value ? 'selected' : ''}>${option.label}</option>`).join('');
        }
        
        html += `
          <div class="repair-item">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <div class="text-xs font-medium text-gray-500">${itemLabel}</div>
              ${autoFilledBadge}
            </div>
            <div class="flex flex-wrap items-end gap-2">
              <div>
                <label class="text-xs text-gray-500 block mb-1">${config.itemLabel}:</label>
                <select id="${roomId}_${category}_${globalIndex}_type" class="repair-type-select md:w-[300px] px-2 py-1 text-sm border rounded" onchange="updateRepairItem('${roomId}', '${category}', ${globalIndex}, 'type')">
                  ${selectOptionsHtml}
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">${measureMeta.label}:</label>
                <input type="number" id="${roomId}_${category}_${globalIndex}_value" value="${inputValue}" min="${measureMeta.min}" step="${measureMeta.step}" class="repair-area-input w-24 px-2 py-1 text-sm border rounded" onchange="updateRepairItem('${roomId}', '${category}', ${globalIndex}, 'value')" oninput="updateRepairItemValue('${roomId}', '${category}', ${globalIndex})">
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">Цена за ед.:</label>
                <div class="construct-price-cell px-2 py-1 text-sm text-gray-600 dark:text-gray-300" data-repair-price-cell="${roomId}_${category}_${globalIndex}">${formatRepairMoney(unitPrice)}</div>
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">Итого:</label>
                <div class="construct-total-cell px-2 py-1 text-sm font-semibold text-brand-600" data-repair-total-cell="${roomId}_${category}_${globalIndex}">${formatRepairMoney(rowTotal)}</div>
              </div>
            </div>
          </div>`;
      }
      
      container.innerHTML = html;
      updateRepairCategoryTotals(roomId);
      updateWhatToDoAutofillIndicators();
      checkRepairDone(roomId, category);
      const parentSubType = getRepairParentSubType(category);
      if (parentSubType) checkRepairDone(roomId, parentSubType);
    }
    
    function updateRepairItem(roomId, category, index, source = 'value') {
      // Лестницы обрабатываются отдельным модулем
      if (category === 'stairs') return;
      
      let categoryKey = category;
      let section = getRepairCategorySection(category);
      
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
      // Сохраняем workId для совместимости с эталонным прайс-листом
      categoryData[index].workId = type;
      if (section) {
        const subcategory = getRepairSubcategoryKeyByWorkId(section, category, type);
        if (subcategory) categoryData[index].subcategory = subcategory;
      }
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

      const currentSubcategory = categoryData[index].subcategory || getRepairSubcategoryKeyByWorkId(section, category, type);
      if (currentSubcategory) {
        const scopedCount = getRepairSubcategoryItems(roomId, section, category, currentSubcategory).length;
        renderRepairCategoryFields(roomId, category, scopedCount, 'system', currentSubcategory);
      } else {
        renderRepairCategoryFields(roomId, category, categoryData.length);
      }
    }

    function updateRepairItemValue(roomId, category, index) {
      let section = getRepairCategorySection(category);
      const repair = ensureRepairDataStructure(roomId);
      const categoryData = repair[section]?.[category];
      if (!categoryData || !categoryData[index]) return;

      const inputValue = document.getElementById(`${roomId}_${category}_${index}_value`);
      const inputType = document.getElementById(`${roomId}_${category}_${index}_type`);
      const type = inputType?.value || categoryData[index].type || '';
      const measureMeta = getRepairMeasureMetaForCategory(category, type);
      const parsedValue = parseFloat(inputValue?.value) || 0;

      categoryData[index].type = type;
      categoryData[index].workId = type;
      if (section) {
        const subcategory = getRepairSubcategoryKeyByWorkId(section, category, type);
        if (subcategory) categoryData[index].subcategory = subcategory;
      }
      delete categoryData[index].qty;
      delete categoryData[index].length;
      delete categoryData[index].area;
      categoryData[index][measureMeta.field] = measureMeta.field === 'qty'
        ? (measureMeta.integer === false ? Number(parsedValue.toFixed(2)) : Math.max(0, Math.round(parsedValue)))
        : Number(parsedValue.toFixed(2));

      if (categoryData[index].autoSource === 'quest') {
        categoryData[index].manualEdited = true;
      } else {
        categoryData[index].manualEntry = true;
      }
      categoryData[index].autoFilled = false;

      updateRepairCategoryTotals(roomId);
      checkRepairDone(roomId, category);
      const parentSubType = getRepairParentSubType(category);
      if (parentSubType) checkRepairDone(roomId, parentSubType);
      updateWhatToDoAutofillIndicators();
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
        const wallWaterproofDone = data.rough?.wallWaterproof?.some(f => f.type);
        const partitionsDone = data.rough?.partitions?.some(f => f.type);
        const surfaceProtectionDone = data.rough?.surfaceProtection?.some(f => f.type);
        const ceilingDone = data.rough?.ceilingPrep?.some(f => f.type);
        isDone = !!(floorDone || wallPlasterDone || wallPuttyDone || wallWaterproofDone || partitionsDone || surfaceProtectionDone || ceilingDone);
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
        const openingsDone = data.finishing?.openings?.door?.some(f => isRepairOpeningComplete(f, 'door')) ||
          data.finishing?.openings?.window?.some(f => isRepairOpeningComplete(f, 'window')) ||
          data.finishing?.openings?.balcony?.some(f => isRepairOpeningComplete(f, 'balcony'));
        isDone = !!(floorDone || wallDone || ceilingDone || openingsDone);
      } else if (['floorLeveling', 'wallPlaster', 'wallPutty', 'wallWaterproof', 'partitions', 'surfaceProtection', 'ceilingPrep'].includes(subType)) {
        isDone = !!data.rough?.[subType]?.some(f => f.type);
      } else if (['electrical', 'ventilation', 'water', 'drainage', 'heating'].includes(subType)) {
        isDone = !!data.engineering?.[subType]?.some(f => f.type);
      } else if (['floor', 'wall', 'ceiling'].includes(subType)) {
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
      } else if (subType === 'architecturalSupervision') {
        isDone = !!Object.values(data.architecturalSupervision || {}).some(item => Number(item?.qty || 0) > 0);
      }
      
      if (doneIcon) {
        doneIcon.classList.toggle('hidden', isParentSection ? !isDone : true);
      }
      
      if (headerEl) {
        if (isParentSection) {
          headerEl.classList.remove('section-done');
        } else {
          const useTextHighlight = ['doorOpeningMount', 'windowOpeningMount', 'balconyOpeningMount'].includes(subType);
          if (useTextHighlight) {
            headerEl.classList.remove('section-done');
            headerEl.classList.toggle('text-green-600', isDone);
            headerEl.classList.toggle('dark:text-green-400', isDone);
            headerEl.classList.toggle('font-semibold', isDone);
          } else {
            headerEl.classList.remove('text-green-600', 'dark:text-green-400', 'font-semibold', 'section-done');
            headerEl.classList.toggle('section-done', isDone);
            if (false) {
              void 0;
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
        Object.entries(repairCategoryGroups).forEach(([section, categories]) => {
          categories.forEach(category => {
          const subcategories = getRepairCategoryLeafSubcategories(section, category);
          if (subcategories.length > 0) {
            subcategories.forEach(subcategory => renderRepairCategoryFields(roomId, category, null, 'system', subcategory.key));
          } else {
            renderRepairCategoryFields(roomId, category);
          }
          });
        });
        ['door', 'window', 'balcony'].forEach(openingType => renderRepairOpeningFields(roomId, openingType));
        updateRepairArchitecturalSupervisionTotals(roomId);
        checkRepairDone(roomId, 'architecturalSupervision');
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
                <div class="construct-subtotal">
                  <span class="construct-subtotal-label">Итого по демонтажу перегородок:</span>
                  <span class="construct-subtotal-val" id="${roomId}_partitionsTotal">—</span>
                </div>
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
                <div class="construct-subtotal construct-subtotal--openings mt-2">
                <span class="construct-subtotal-label">Итого по проёмам:</span>
                <span class="construct-subtotal-val" id="${roomId}_openingsTotal">—</span>
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
                        <button type="button" class="qty-btn-mini" onclick="updateStaircaseCount('${roomId}', -1)">?</button>
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
                        <button type="button" class="qty-btn-mini" onclick="updateRailingCount('${roomId}', -1)">?</button>
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
          <div id="${roomId}_engineeringHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_engineering')">
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
                <div class="construct-subtotal"><span class="construct-subtotal-label">Итого:</span><span class="construct-subtotal-val" id="${roomId}_electricalTotal">—</span></div>
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
                    <button type="button" class="qty-btn-mini" onclick="updateVentilationCount('${roomId}', -1)">?</button>
                    <input type="number" id="${roomId}_ventilationCount" value="${roomData.demolitionData?.[roomId]?.ventilation?.length || 0}" min="0" max="20" class="w-12 px-2 py-1 text-sm border rounded" oninput="handleVentilationInput('${roomId}')">
                    <button type="button" class="qty-btn-mini" onclick="updateVentilationCount('${roomId}', 1)">+</button>
                  </div>
                </div>
                <div id="${roomId}_ventilationList"></div>
                <div class="construct-subtotal"><span class="construct-subtotal-label">Итого:</span><span class="construct-subtotal-val" id="${roomId}_ventilationTotal">—</span></div>
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
                <div class="construct-subtotal"><span class="construct-subtotal-label">Итого:</span><span class="construct-subtotal-val" id="${roomId}_waterTotal">—</span></div>
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
                <div class="construct-subtotal"><span class="construct-subtotal-label">Итого:</span><span class="construct-subtotal-val" id="${roomId}_drainageTotal">—</span></div>
              </div>
            </div>
            <div class="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div id="${roomId}_plumbingHeader" class="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-600 border-2 border-transparent rounded" onclick="toggleWhatToDoSubSection('${roomId}_plumbing')">
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
                <div class="construct-subtotal"><span class="construct-subtotal-label">Итого:</span><span class="construct-subtotal-val" id="${roomId}_plumbingTotal">—</span></div>
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
                <div class="construct-subtotal"><span class="construct-subtotal-label">Итого:</span><span class="construct-subtotal-val" id="${roomId}_heatingTotal">—</span></div>
              </div>
            </div>
            <div class="construct-total-row">
              <span class="construct-total-label">Итого — Демонтаж инженерных систем:</span>
              <span class="construct-total-val" id="${roomId}_engineeringTotal">—</span>
            </div>
          </div>
        </div>
        ${renderDemolitionFinishingSection(roomId)}
      `;
    }

    function renderWhatToDoRooms() {
      if (typeof ensureObjectFloorRoomData === 'function') {
        ensureObjectFloorRoomData();
      }
      if (typeof buildHouseRoomRegistry === 'function') {
        buildHouseRoomRegistry(true);
      }
      const whatToDoTree = document.getElementById('whatToDoTree');
      const demolitionFloors = document.getElementById('demolitionFloorRooms');
      const repairFloors = document.getElementById('repairFloorRooms');
      const demolitionLiving = document.getElementById('demolitionLivingRooms');
      const demolitionNonliving = document.getElementById('demolitionNonlivingRooms');
      const repairLiving = document.getElementById('repairLivingRooms');
      const repairNonliving = document.getElementById('repairNonlivingRooms');
      if (!demolitionLiving || !demolitionNonliving || !repairLiving || !repairNonliving) return;
      updateWhatToDoAutofillIndicators();

      const escapeText = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      const getSelectedText = (id) => {
        const select = document.getElementById(id);
        return select?.selectedOptions?.[0]?.textContent?.trim() || '';
      };
      const findOptionLabel = (lists, value) => {
        if (!value) return '';
        for (const list of lists) {
          const match = Array.isArray(list) ? list.find(item => item?.value === value) : null;
          if (match?.label) return match.label;
        }
        return String(value);
      };
      const getHouseLabel = () => {
        const subtypeText = getSelectedText('buildingSubtype');
        const typeText = getSelectedText('buildingType');
        return subtypeText || typeText || roomData.house?.buildingSubtype || 'Дом';
      };
      const getAppointmentLabel = (room = {}) => {
        const buildingSubtype = document.getElementById('buildingSubtype')?.value || '';
        const appointmentLists = [
          typeof getPremiseAppointmentOptions === 'function' ? getPremiseAppointmentOptions() : [],
          typeof buildingAppointments !== 'undefined' ? buildingAppointments?.[buildingSubtype] : []
        ];
        return findOptionLabel(appointmentLists, room.appointment);
      };
      const getSubAppointmentLabel = (room = {}) => {
        if (!room.subAppointment) return '';
        const buildingSubtype = document.getElementById('buildingSubtype')?.value || '';
        const lists = [
          typeof getPremiseSubOptions === 'function' ? getPremiseSubOptions(room.appointment) : [],
          typeof buildingSubAppointments !== 'undefined' ? buildingSubAppointments?.[room.appointment] : [],
          typeof buildingAppointments !== 'undefined' ? buildingAppointments?.[buildingSubtype] : []
        ];
        return findOptionLabel(lists, room.subAppointment);
      };
      const getRetailTypeLabel = (room = {}) => {
        if (!room.retailPremiseType) return '';
        if (typeof getRetailPremiseTypeLabel === 'function') return getRetailPremiseTypeLabel(room.retailPremiseType);
        return findOptionLabel([typeof retailPremiseTypeOptions !== 'undefined' ? retailPremiseTypeOptions : []], room.retailPremiseType);
      };
      const fmtArea = (value) => {
        const number = Number(value || 0);
        return `${number.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} м²`;
      };
      const getRoomMetrics = (room = {}) => {
        const walls = typeof calculateLivingRoomWallsArea === 'function'
          ? calculateLivingRoomWallsArea(room)
          : Number(room.wallsArea || 0);
        const ceiling = typeof getLivingRoomCeilingArea === 'function'
          ? getLivingRoomCeilingArea(room)
          : Number(room.ceilingArea || room.area || 0);
        return [
          `Площадь пола: ${fmtArea(room.area)}`,
          `Площадь стен: ${fmtArea(walls)}`,
          `Площадь потолка: ${fmtArea(ceiling)}`
        ].join(' · ');
      };
      const getTreeStats = () => {
        const premises = new Set();
        let rooms = 0;
        for (let floorIndex = 0; floorIndex < floorCount; floorIndex += 1) {
          ['living', 'nonliving'].forEach(sourceCategory => {
            (roomData[sourceCategory]?.floors?.[floorIndex]?.livingRooms || []).forEach((room, roomIndex) => {
              if (!room || typeof room !== 'object') return;
              rooms += 1;
              premises.add(`${floorIndex}:${room.premiseId || `${sourceCategory}_${floorIndex}_${roomIndex}`}`);
            });
          });
        }
        return { premises: premises.size, rooms };
      };
      const buildTreeCard = (id, title, iconClass, contentHtml, {
        kicker = '',
        meta = '',
        path = '',
        badge = '',
        className = '',
        defaultOpen = false,
        done = false
      } = {}) => `
        <div class="what-tree-card ${className}">
          <div id="${id}CardHeader" class="what-tree-head" onclick="toggleWhatToDoSubSection('${id}')">
            <i class="fas fa-chevron-down what-tree-chevron transition-transform" id="${id}Icon" style="transform: rotate(${defaultOpen ? '0' : '-90deg'})"></i>
            <i class="fas ${iconClass} what-tree-icon"></i>
            <span class="what-tree-title">
              ${kicker ? `<small>${escapeText(kicker)}</small>` : ''}
              <strong>${escapeText(title)}</strong>
              ${path ? `<span class="what-tree-path">${escapeText(path)}</span>` : ''}
              ${meta ? `<em>${escapeText(meta)}</em>` : ''}
            </span>
            ${badge ? `<span class="what-tree-badge">${escapeText(badge)}</span>` : ''}
            <i class="fas fa-check text-green-500 text-xs ${done ? '' : 'hidden'} ml-auto" id="${id}Done"></i>
          </div>
          <div id="${id}Content" class="what-tree-content" style="display: ${defaultOpen ? 'block' : 'none'};">
            ${contentHtml}
          </div>
        </div>
      `;

      const emptyText = '<div class="text-sm text-gray-400">Нет данных</div>';
      const floorCount = Math.max(
        1,
        Number(roomData.objectFloorCount || 0),
        roomData.living?.floors?.length || 0,
        roomData.nonliving?.floors?.length || 0
      );
      let floorsHtml = '';
      const treeStats = getTreeStats();

      const buildFloorPremises = (floorIndex) => {
        let floorContent = '';
        const sourceCategories = ['living', 'nonliving'];

        sourceCategories.forEach(sourceCategory => {
          const rooms = roomData[sourceCategory]?.floors?.[floorIndex]?.livingRooms || [];
          const groupMap = new Map();
          rooms.forEach((room, roomIndex) => {
            if (!room || typeof room !== 'object') return;
            const fallbackId = `${sourceCategory}_${floorIndex}_${roomIndex}`;
            const premiseId = room.premiseId || fallbackId;
            if (!groupMap.has(premiseId)) {
              groupMap.set(premiseId, {
                sourceCategory,
                floorIndex,
                premiseId,
                rooms: []
              });
            }
            groupMap.get(premiseId).rooms.push({ room, roomIndex, sourceCategory });
          });

          Array.from(groupMap.values()).forEach((group, groupIndex) => {
            const firstRoom = group.rooms[0]?.room || {};
            const registryEntry = group.rooms
              .map(item => typeof getRoomRegistryEntry === 'function' ? getRoomRegistryEntry(item.sourceCategory, floorIndex, item.roomIndex) : null)
              .find(Boolean);
            const premiseTitle = firstRoom.displayName || registryEntry?.displayName || `Помещение ${registryEntry?.globalRoomNumber || groupIndex + 1}`;
            const appointment = getAppointmentLabel(firstRoom);
            const subAppointment = getSubAppointmentLabel(firstRoom);
              const retailType = getRetailTypeLabel(firstRoom);
              const premiseMeta = [appointment, subAppointment, retailType].filter(Boolean).join(' · ');
            const premiseKey = `what_premise_${sourceCategory}_${floorIndex}_${groupIndex}`;
            const floorPath = `${getHouseLabel()} / Этаж ${floorIndex + 1}`;
            let chambersHtml = '';
            const groupedRooms = new Map();

            group.rooms.forEach(item => {
              const groupType = item.room.roomGroupType || 'regular';
              const groupIndexValue = Number(item.room.roomGroupIndex || 0);
              const roomGroupName = item.room.roomGroupName || (groupType === 'regular' ? 'Обычные комнаты' : 'Мастер-комната');
              const key = `${groupType}:${groupIndexValue}:${roomGroupName}`;
              if (!groupedRooms.has(key)) {
                groupedRooms.set(key, {
                  key,
                  groupType,
                  roomGroupName,
                  rooms: []
                });
              }
              groupedRooms.get(key).rooms.push(item);
            });

            Array.from(groupedRooms.values()).forEach((roomGroup, roomGroupIndex) => {
              let groupRoomsHtml = '';
              roomGroup.rooms.forEach(({ room, roomIndex, sourceCategory: roomSource }, chamberIndex) => {
              const demoRoomId = `demo_${roomSource}_${floorIndex}_${roomIndex}`;
              const repairRoomId = `repair_${roomSource}_${floorIndex}_${roomIndex}`;
              const roomNodeId = `what_room_${roomSource}_${floorIndex}_${roomIndex}`;
              const zoneLabel = typeof getRoomZoneLabel === 'function'
                ? getRoomZoneLabel(room.roomZone || room.category || roomSource)
                : (room.roomZone === 'nonliving' ? 'Нежилая зона' : 'Жилая зона');
              const roomType = room.roomType || 'Тип помещения не выбран';
              const chamberName = room.chamberDisplayName || `Комната ${chamberIndex + 1}`;
              const chamberMeta = [zoneLabel, roomType].filter(Boolean).join(' · ');
              const metrics = getRoomMetrics(room);
              const icon = room.roomZone === 'nonliving' ? 'fa-door-open' : 'fa-couch';
              const demoDone = hasDemolitionRoomData(demoRoomId);
              const repairDone = hasRepairRoomData(repairRoomId);
              const roomWorksHtml = [
                buildTreeCard(demoRoomId, 'Демонтажные работы', 'fa-dumpster', renderDemolitionRoomSection(demoRoomId), {
                  kicker: 'Работы в комнате',
                  path: `${floorPath} / ${premiseTitle} / ${roomGroup.roomGroupName} / ${chamberName}`,
                  meta: 'Демонтаж конструкций, инженерии, покрытий и проемов',
                  badge: demoDone ? 'Заполнено' : 'Не заполнено',
                  className: 'what-tree-card--work what-tree-card--demo',
                  done: demoDone
                }),
                buildTreeCard(repairRoomId, 'Монтажные работы по ремонту', 'fa-hammer', renderRepairRoomSection(repairRoomId), {
                  kicker: 'Работы в комнате',
                  path: `${floorPath} / ${premiseTitle} / ${roomGroup.roomGroupName} / ${chamberName}`,
                  meta: 'Черновые, инженерные, чистовые работы и надзор',
                  badge: repairDone ? 'Заполнено' : 'Не заполнено',
                  className: 'what-tree-card--work what-tree-card--repair',
                  done: repairDone
                })
              ].join('');
              groupRoomsHtml += buildTreeCard(roomNodeId, chamberName, icon, roomWorksHtml, {
                kicker: chamberMeta,
                path: `${floorPath} / ${premiseTitle} / ${roomGroup.roomGroupName}`,
                meta: metrics,
                className: 'what-tree-card--room',
                done: demoDone || repairDone
              });
              });
              const groupIcon = roomGroup.groupType === 'kitchen_living' ? 'fa-kitchen-set' : roomGroup.groupType === 'master_bedroom' ? 'fa-bed' : 'fa-door-open';
              chambersHtml += buildTreeCard(`what_room_group_${sourceCategory}_${floorIndex}_${groupIndex}_${roomGroupIndex}`, roomGroup.roomGroupName, groupIcon, groupRoomsHtml || emptyText, {
                kicker: 'Группа комнат',
                path: `${floorPath} / ${premiseTitle}`,
                meta: `${roomGroup.rooms.length} комн.`,
                badge: roomGroup.groupType === 'regular' ? 'обычные' : 'мастер',
                className: 'what-tree-card--room-group'
              });
            });

            floorContent += buildTreeCard(premiseKey, premiseTitle, 'fa-vector-square', chambersHtml || emptyText, {
              kicker: 'Помещение на этаже',
              path: floorPath,
              meta: premiseMeta,
              badge: `${group.rooms.length} комн.`,
              className: 'what-tree-card--premise'
            });
          });
        });
        return floorContent || emptyText;
      };

      for (let floorIndex = 0; floorIndex < floorCount; floorIndex += 1) {
        const floorLocation = typeof getObjectFloorLocation === 'function'
          ? getObjectFloorLocation(floorIndex)
          : (roomData.living?.floors?.[floorIndex]?.location || 'above_ground');
        const floorLocationLabel = typeof getObjectFloorLocationLabel === 'function'
          ? getObjectFloorLocationLabel(floorLocation)
          : 'Надземный этаж';
        const floorContent = buildFloorPremises(floorIndex);

        floorsHtml += buildTreeCard(`what_floor_${floorIndex}`, `Этаж ${floorIndex + 1}`, 'fa-layer-group', floorContent, {
          kicker: 'Уровень дома',
          path: getHouseLabel(),
          meta: `Расположение этажа: ${floorLocationLabel}`,
          badge: floorLocationLabel,
          className: 'what-tree-card--floor'
        });
      }

      const houseHtml = buildTreeCard('what_house', getHouseLabel(), 'fa-home', floorsHtml || emptyText, {
        kicker: 'Дом',
        meta: `${floorCount} эт. · ${treeStats.premises} помещ. · ${treeStats.rooms} комн.`,
        badge: 'Что нужно сделать',
        className: 'what-tree-card--house',
        defaultOpen: true
      });

      if (whatToDoTree) whatToDoTree.innerHTML = houseHtml || emptyText;
      if (demolitionFloors) demolitionFloors.innerHTML = '';
      if (repairFloors) repairFloors.innerHTML = '';
      demolitionLiving.innerHTML = '';
      demolitionNonliving.innerHTML = '';
      repairLiving.innerHTML = '';
      repairNonliving.innerHTML = '';

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
          syncCountInput('staircase', demolition.staircase?.length || 0);
          syncCountInput('railing', demolition.railing?.length || 0);
          render_electrical_Fields(roomId, roomData.demolitionData?.[roomId]?.electrical?.length || 0);
          render_ventilation_Fields(roomId, roomData.demolitionData?.[roomId]?.ventilation?.length || 0);
          renderWaterSupplyFields(roomId, roomData.demolitionData?.[roomId]?.water?.length || 0);
          render_drainage_Fields(roomId, roomData.demolitionData?.[roomId]?.drainage?.length || 0);
          render_plumbing_Fields(roomId, roomData.demolitionData?.[roomId]?.plumbing?.length || 0);
          render_heating_Fields(roomId, roomData.demolitionData?.[roomId]?.heating?.length || 0);
          if (typeof render_staircase_Fields==='function') render_staircase_Fields(roomId, roomData.demolitionData?.[roomId]?.staircase?.length || 0);
          if (typeof render_railing_Fields==='function') render_railing_Fields(roomId, roomData.demolitionData?.[roomId]?.railing?.length || 0);
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
          <div class="opening-size-grid">
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0428\u0438\u0440\u0438\u043D\u0430:</label>
              <input type="number" value="${doorW}" min="50" max="120"
                     class="area-input text-xs" data-field="doorWidth_${i}"
                     onchange="updateDoorSize('${roomId}', ${i}, 'width', this.value)"
                     oninput="updateDoorSize('${roomId}', ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0412\u044B\u0441\u043E\u0442\u0430:</label>
              <input type="number" value="${doorH}" min="150" max="250"
                     class="area-input text-xs" data-field="doorHeight_${i}"
                     onchange="updateDoorSize('${roomId}', ${i}, 'height', this.value)"
                     oninput="updateDoorSize('${roomId}', ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="room-opening-subsection ${typeof getRoomOpeningSubsectionClass === 'function' ? getRoomOpeningSubsectionClass(data, 'doors') : ''}" data-room-subsection="roomOpenings_${roomId}:doors">
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
          <div class="opening-size-grid">
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0428\u0438\u0440\u0438\u043D\u0430:</label>
              <input type="number" value="${winW}" min="80" max="250"
                     class="area-input text-xs" data-field="windowWidth_${i}"
                     onchange="updateWindowSize('${roomId}', ${i}, 'width', this.value)"
                     oninput="updateWindowSize('${roomId}', ${i}, 'width', this.value)">
            </div>
            <div class="flex items-center gap-1">
              <label class="opening-size-label">\u0412\u044B\u0441\u043E\u0442\u0430:</label>
              <input type="number" value="${winH}" min="80" max="200"
                     class="area-input text-xs" data-field="windowHeight_${i}"
                     onchange="updateWindowSize('${roomId}', ${i}, 'height', this.value)"
                     oninput="updateWindowSize('${roomId}', ${i}, 'height', this.value)">
            </div>
          </div>`;
      }
      return `
        <div class="room-opening-subsection ${typeof getRoomOpeningSubsectionClass === 'function' ? getRoomOpeningSubsectionClass(data, 'windows') : ''}" data-room-subsection="roomOpenings_${roomId}:windows">
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
      
      const data = roomData[roomId].livingRooms[index] || {
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
        nicheArea: 0,
        columnArea: 0,
        archCount: 0,
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
        retailPremiseType: '',
        location: 'above_ground'
      };
      roomData[roomId].livingRooms[index] = data;
      syncLivingRoomDerivedAreas(data);
      
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
                ${(() => {
                  // For now, leave empty, can be updated based on appointment
                  return '';
                })()}
              </select>
            </div>
            <div class="object-floor-room-inherited">
              <i class="fas fa-layer-group"></i>
              <span>Расположение задается на уровне этажа и наследуется помещением.</span>
            </div>
            <div class="area-input-group vertical ${typeof shouldShowRetailPremiseType === 'function' && shouldShowRetailPremiseType(data) ? '' : 'hidden'}" style="margin: 8px 0">
              <label class="text-sm text-gray-500 font-bold">Тип помещения:</label>
              <select id="retailPremiseType_${roomId}_${index}" class="w-full px-3 py-2 border rounded-lg bg-bg-primary" onchange="updateRoomRetailPremiseType('${roomId}', ${index}, this.value)">
                <option value="">Выберите тип магазина</option>
                ${(typeof retailPremiseTypeOptions !== 'undefined' ? retailPremiseTypeOptions : []).map(item => `<option value="${item.value}" ${data.retailPremiseType === item.value ? 'selected' : ''}>${item.label}</option>`).join('')}
              </select>
            </div>
            <div class="area-input-group" style="margin: 8px 0">
              <label class="text-sm text-gray-500 w-12 font-bold">\u0422\u0438\u043F:</label>
              <div class="custom-select-wrapper" style="position: relative; display: inline-block;">
                <button type="button" class="custom-select-btn" style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; border: 2px solid #4ade80; border-radius: 6px; background: var(--bg-primary); font-size: 14px; font-weight: 600; cursor: pointer; min-width: 160px;" onclick="toggleCustomSelect('${roomId}', ${index})">
                  <i class="fas ${(typeof getRoomTypeCatalogForAppointment === 'function' ? getRoomTypeCatalogForAppointment(roomId, data) : room.room_types).find(t => t.name === data.roomType)?.icon || 'fa-home'}" id="roomTypeIcon_${roomId}_${index}" style="color: #22c55e"></i>
                  <span id="roomTypeText_${roomId}_${index}">${data.roomType}</span>
                  <i class="fas fa-chevron-down" style="margin-left: auto; font-size: 10px; color: #6b7280"></i>
                </button>
                <div id="customSelect_${roomId}_${index}" class="custom-select-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-primary); border: 2px solid #4ade80; border-radius: 6px; margin-top: 4px; max-height: 200px; overflow-y: auto; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                  ${(() => {
                    const buildingType = document.getElementById('detailedBuildingType')?.value || 'apartment';
                    let types = [...(typeof getRoomTypeCatalogForAppointment === 'function' ? getRoomTypeCatalogForAppointment(roomId, data) : room.room_types)];
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
            ${renderLivingRoomAreaCalcMode(`living:${roomId}:${index}`, data)}
            ` : ''}
            ${shouldShowLivingRoomSurfaceAreaFields(data) ? `
              ${renderQuestAreaStepper(`living:${roomId}:${index}`, 'area', data.area, '\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043F\u043E\u043B\u0430', '\u043C\u00B2', 0, getLivingRoomAreaLimit(data))}
              ${renderQuestAreaStepper(`living:${roomId}:${index}`, 'wallsArea', calculateLivingRoomWallsArea(data), '\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0441\u0442\u0435\u043D', '\u043C\u00B2', 0, getLivingRoomWallsAreaLimit(data))}
              ${renderQuestAreaStepper(`living:${roomId}:${index}`, 'ceilingArea', getLivingRoomCeilingArea(data), '\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043F\u043E\u0442\u043E\u043B\u043A\u0430', '\u043C\u00B2', 0, 500)}
            ` : renderLivingRoomAreaModeHint()}
            ${renderRoomOccupancyStepper(`living:${roomId}:${index}`, data)}
            ${renderLivingRoomOpeningsGroup(room, data, roomId, index)}
            <div class="room-openings-shell mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <div class="room-openings-head" data-room-composite="livingAdditional_${index}" onclick="toggleRoomFieldGroup('${roomId}', 'livingAdditional_${index}')">
                <i class="fas fa-chevron-down text-xs transition-transform" id="livingAdditional_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
                <span class="text-sm font-semibold flex-1">\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438</span>
                <em data-composite-count>${typeof renderRoomCompositeBadge === 'function' ? renderRoomCompositeBadge(getRoomCompositeCount(data, ['nicheCount', 'projectionCount', 'columnCount'])) : 'свернуто'}</em>
              </div>
              <div id="livingAdditional_${index}Group_${roomId}" style="display: none" class="room-openings-body">
                <div class="room-opening-subsection ${typeof getRoomConstructionSubsectionClass === 'function' ? getRoomConstructionSubsectionClass(data, 'niche') : ''}" data-room-subsection="livingAdditional_${index}:niche">
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
                <div class="room-opening-subsection ${typeof getRoomConstructionSubsectionClass === 'function' ? getRoomConstructionSubsectionClass(data, 'projection') : ''}" data-room-subsection="livingAdditional_${index}:projection">
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
                <div class="room-opening-subsection ${typeof getRoomConstructionSubsectionClass === 'function' ? getRoomConstructionSubsectionClass(data, 'column') : ''}" data-room-subsection="livingAdditional_${index}:column">
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
                  <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043F\u043E\u043B\u0430: <span class="font-medium" id="livingRoomMatFloor_${roomId}_${index}">${getLivingRoomMaterialFloorArea(data).toFixed(2)} \u043C\u00B2</span></div>
                  <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0441\u0442\u0435\u043D: <span class="font-medium" id="livingRoomMatWalls_${roomId}_${index}">${getLivingRoomMaterialWallsArea(data).toFixed(2)} \u043C\u00B2</span></div>
                  <div>\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u0434\u043B\u044F \u043F\u043E\u0442\u043E\u043B\u043A\u0430: <span class="font-medium" id="livingRoomMatCeiling_${roomId}_${index}">${getLivingRoomMaterialCeilingArea(data).toFixed(2)} \u043C\u00B2</span></div>
                </div>
              </div>
            </div>
            <div class="room-repair-info-shell mt-2">
              <div class="room-repair-info-head cursor-pointer" onclick="toggleRoomFieldGroup('${roomId}', 'repairInfo_${index}')">
                <i class="fas fa-chevron-down text-xs transition-transform" id="repairInfo_${index}Icon_${roomId}" style="transform: rotate(-90deg)"></i>
                <span>\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u0440\u0435\u043C\u043E\u043D\u0442\u0435</span>
                <em>основные параметры</em>
              </div>
              <div id="repairInfo_${index}Group_${roomId}" style="display: none" class="room-repair-info-body">
                ${((typeof hasLivingRoomRepairInfoArea === 'function' ? hasLivingRoomRepairInfoArea(data) : (data.area > 0 || data.useDimensions))) ? `
                  <div class="room-repair-info-grid">
                    <div class="room-repair-info-field">
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
                  <div class="room-repair-info-field">
                    <label class="block text-sm text-gray-500 mb-1">\u041A\u0430\u043A\u043E\u0439 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0440\u0435\u043C\u043E\u043D\u0442</label>
                    <select class="w-[340px] md:w-full px-3 py-2 text-base border rounded" data-field="repairTypeNew" onchange="updateLivingRoomRepairData('${roomId}', ${index}, 'repairTypeNew', this.value)">
                      <option value="turnkey" ${data.repairData?.repairTypeNew === 'turnkey' ? 'selected' : ''}>\u041F\u043E\u0434 \u043A\u043B\u044E\u0447 (\u0441 \u043C\u0435\u0431\u0435\u043B\u044C\u044E)</option>
                      <option value="clean" ${data.repairData?.repairTypeNew === 'clean' ? 'selected' : ''}>\u0427\u0438\u0441\u0442\u043E\u0432\u0430\u044F \u043E\u0442\u0434\u0435\u043B\u043A\u0430</option>
                      <option value="whitebox_new" ${data.repairData?.repairTypeNew === 'whitebox_new' ? 'selected' : ''}>\u041F\u0440\u0435\u0434\u0447\u0438\u0441\u0442\u043E\u0432\u0430\u044F White-box</option>
                      <option value="rough" ${data.repairData?.repairTypeNew === 'rough' ? 'selected' : ''}>\u0427\u0435\u0440\u043D\u043E\u0432\u0430\u044F \u043E\u0442\u0434\u0435\u043B\u043A\u0430</option>
                    </select>
                  </div>
                  <div class="room-repair-info-field">
                    <label class="block text-sm text-gray-500 mb-1">\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u0435\u0440\u0435\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u043A\u0430?</label>
                    <select class="w-[340px] md:w-full px-3 py-2 text-base border rounded" data-field="requiresRedesign" onchange="updateLivingRoomRepairData('${roomId}', ${index}, 'requiresRedesign', this.value)">
                      <option value="no" ${data.repairData?.requiresRedesign !== 'yes' ? 'selected' : ''}>\u041D\u0435\u0442</option>
                      <option value="yes" ${data.repairData?.requiresRedesign === 'yes' ? 'selected' : ''}>\u0414\u0430</option>
                    </select>
                  </div>
                  <div class="room-repair-info-field">
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
                  <div id="designProjectOptions_${roomId}_${index}" style="display: ${data.repairData?.designProject === 'yes' ? 'block' : 'none'}" class="room-repair-info-nested">
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
                  <div class="room-repair-info-field">
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
                  <i class="fas fa-exclamation-triangle mr-1"></i> \u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043F\u043B\u043E\u0449\u0430\u0434\u044C \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435 \u041A\u043E\u043C\u043D\u0430\u0442\u0430 \u0434\u043B\u044F ${room.name}
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
      const ceilingEl = document.getElementById(`livingRoomMatCeiling_${roomId}_${index}`);
      
      if (floorEl) floorEl.textContent = getLivingRoomMaterialFloorArea(data).toFixed(2) + ' \u043C\u00B2';
      if (wallsEl) wallsEl.textContent = getLivingRoomMaterialWallsArea(data).toFixed(2) + ' \u043C\u00B2';
      if (ceilingEl) ceilingEl.textContent = getLivingRoomMaterialCeilingArea(data).toFixed(2) + ' \u043C\u00B2';
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

    function getRoomNumber(value, fallback = 0) {
      const number = parseFloat(String(value ?? '').replace(',', '.'));
      return Number.isFinite(number) ? number : fallback;
    }

    function getLivingRoomFloorArea(data) {
      return Math.max(0, getRoomNumber(data?.area, 0));
    }

    function getLivingRoomCeilingArea(data) {
      if (!data) return 0;
      const ceilingArea = getRoomNumber(data.ceilingArea, NaN);
      if (Number.isFinite(ceilingArea) && ceilingArea > 0) return ceilingArea;
      return getLivingRoomFloorArea(data);
    }

    function getLivingRoomMaterialCoefficient(data) {
      return Math.max(1, getRoomNumber(data?.materialCoefficient, 1.1));
    }

    function getLivingRoomMaterialFloorArea(data) {
      return getLivingRoomFloorArea(data);
    }

    function getLivingRoomMaterialWallsArea(data) {
      return calculateLivingRoomWallsArea(data);
    }

    function getLivingRoomMaterialCeilingArea(data) {
      return getLivingRoomCeilingArea(data);
    }

    function renderQuestAreaStepper(roomKey, field, value, label, unit = 'м²', min = 0, max = 9999) {
      return `
        <div class="area-input-group">
          <label class="text-xs text-gray-500 w-32">${label} (${unit}):</label>
          <div class="qty-controls">
            <button type="button" class="qty-btn" onclick="changeLivingRoomAreaValue('${roomKey}', '${field}', -1, ${min}, ${max})">−</button>
            <input type="number" value="${Number(value || 0).toFixed(2)}" min="${min}" max="${max}" step="0.01" inputmode="decimal"
                   class="area-input" style="width: 86px" data-field="${field}"
                   onchange="commitLivingRoomAreaInput(this, '${roomKey}', '${field}')"
                   onblur="commitLivingRoomAreaInput(this, '${roomKey}', '${field}')">
            <button type="button" class="qty-btn" onclick="changeLivingRoomAreaValue('${roomKey}', '${field}', 1, ${min}, ${max})">+</button>
          </div>
        </div>
      `;
    }

    function shouldShowLivingRoomSurfaceAreaFields(data = {}) {
      const mode = getLivingRoomAreaCalcMode(data);
      return mode === 'dimensions' || mode === 'perimeter_area';
    }

    function renderLivingRoomAreaModeHint() {
      return `
        <div class="room-area-calc-empty">
          <i class="fas fa-ruler-combined"></i>
          <span>Выберите способ расчета площади, чтобы открыть поля пола, стен и потолка.</span>
        </div>
      `;
    }

    function getLivingRoomAreaLimit(data = null) {
      const buildingSubtype = document.getElementById('buildingSubtype')?.value || '';
      const apartmentSubtypes = ['apartment', 'aparthotel', 'euro_apartment', 'euro_aparthotel'];
      if (apartmentSubtypes.includes(buildingSubtype)) return 200;
      return 1000;
    }

    function getLivingRoomWallsAreaLimit(data = null) {
      const buildingSubtype = document.getElementById('buildingSubtype')?.value || '';
      const apartmentSubtypes = ['apartment', 'aparthotel', 'euro_apartment', 'euro_aparthotel'];
      if (apartmentSubtypes.includes(buildingSubtype)) return 700;
      return 2000;
    }

    function clampLivingRoomFloorArea(value, data = null) {
      const parsed = Number(String(value ?? '').replace(',', '.'));
      const max = getLivingRoomAreaLimit(data);
      return Math.max(0, Math.min(max, Number.isFinite(parsed) ? parsed : 0));
    }

    function clampLivingRoomWallsArea(value, data = null) {
      const parsed = Number(String(value ?? '').replace(',', '.'));
      const max = getLivingRoomWallsAreaLimit(data);
      return Math.max(0, Math.min(max, Number.isFinite(parsed) ? parsed : 0));
    }

    window.getLivingRoomAreaLimit = getLivingRoomAreaLimit;
    window.getLivingRoomWallsAreaLimit = getLivingRoomWallsAreaLimit;
    window.clampLivingRoomFloorArea = clampLivingRoomFloorArea;
    window.clampLivingRoomWallsArea = clampLivingRoomWallsArea;

    function commitLivingRoomAreaInput(input, roomKey, field) {
      if (!input) return;
      const min = Number(input.min || 0);
      const roomDataItem = getLivingRoomDataByKey(roomKey);
      const max = field === 'area'
        ? getLivingRoomAreaLimit(roomDataItem)
        : field === 'wallsArea'
          ? getLivingRoomWallsAreaLimit(roomDataItem)
          : Number(input.max || 9999);
      const raw = String(input.value || '').replace(',', '.');
      if (raw === '' || raw === '-' || raw === '.' || raw === ',') return;
      const parsed = parseFloat(raw);
      const value = Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : 0;
      input.value = value.toFixed(2);
      updateLivingRoomDataByKey(roomKey, field, value);
    }

    function getRoomOccupancyConfig(data = {}) {
      const roomType = String(data?.roomType || '').trim().toLowerCase();
      if (roomType === 'спальня') return { max: 2, defaultValue: 1, label: 'Количество человек' };
      if (roomType === 'детская') return { max: 8, defaultValue: 1, label: 'Количество человек' };
      return null;
    }

    function renderRoomOccupancyStepper(roomKey, data = {}) {
      const config = getRoomOccupancyConfig(data);
      if (!config) return '';
      const value = Math.max(0, Math.min(config.max, parseInt(data.peopleCount, 10) || config.defaultValue));
      return `
        <div class="area-input-group room-occupancy-stepper">
          <label class="text-xs text-gray-500 w-32">${config.label} (чел.):</label>
          <div class="qty-controls">
            <button type="button" class="qty-btn" onclick="changeRoomOccupancyValue('${roomKey}', -1)">−</button>
            <input type="number" value="${value}" min="0" max="${config.max}" step="1"
                   class="qty-input" data-field="peopleCount"
                   onchange="updateLivingRoomDataByKey('${roomKey}', 'peopleCount', this.value)"
                   oninput="updateLivingRoomDataByKey('${roomKey}', 'peopleCount', this.value)">
            <button type="button" class="qty-btn" onclick="changeRoomOccupancyValue('${roomKey}', 1)">+</button>
          </div>
          <span class="text-[10px] text-gray-400">до ${config.max}</span>
        </div>
      `;
    }

    function changeRoomOccupancyValue(roomKey, delta) {
      const data = getLivingRoomDataByKey(roomKey);
      const config = getRoomOccupancyConfig(data);
      if (!data || !config) return;
      const next = Math.max(0, Math.min(config.max, (parseInt(data.peopleCount, 10) || config.defaultValue) + Number(delta || 0)));
      updateLivingRoomDataByKey(roomKey, 'peopleCount', next);
    }

    function updateLivingRoomDataByKey(roomKey, field, value) {
      const parts = String(roomKey || '').split(':');
      if (parts[0] === 'floor') {
        updateFloorRoomData(parts[1], Number(parts[2]), Number(parts[3]), field, value);
        scheduleLivingRoomRepairInfoAvailabilityRefresh(roomKey, field);
        return;
      }
      updateLivingRoomData(parts[1], Number(parts[2]), field, value);
      scheduleLivingRoomRepairInfoAvailabilityRefresh(roomKey, field);
    }

    function getLivingRoomDataByKey(roomKey) {
      const parts = String(roomKey || '').split(':');
      if (parts[0] === 'floor') return roomData[parts[1]]?.floors?.[Number(parts[2])]?.livingRooms?.[Number(parts[3])] || null;
      return roomData[parts[1]]?.livingRooms?.[Number(parts[2])] || null;
    }

    const livingRoomRepairInfoRefreshTimers = {};

    function isLivingRoomAreaSetupField(field) {
      return ['area', 'roomPerimeter', 'roomLength', 'roomWidth'].includes(String(field || ''));
    }

    function scheduleLivingRoomRepairInfoAvailabilityRefresh(roomKey, field) {
      if (!isLivingRoomAreaSetupField(field)) return;
      const data = getLivingRoomDataByKey(roomKey);
      if (!data || !hasLivingRoomRepairInfoArea(data)) return;
      const key = String(roomKey || '');
      clearTimeout(livingRoomRepairInfoRefreshTimers[key]);
      livingRoomRepairInfoRefreshTimers[key] = setTimeout(() => {
        refreshLivingRoomRepairInfoAvailability(key);
        delete livingRoomRepairInfoRefreshTimers[key];
      }, 320);
    }

    function refreshLivingRoomRepairInfoAvailability(roomKey) {
      const parts = String(roomKey || '').split(':');
      if (parts[0] === 'floor') {
        const roomId = parts[1];
        const floorIndex = Number(parts[2]);
        if (typeof saveAndRestoreFloorRoomStates === 'function' && typeof renderFloorRooms === 'function') {
          saveAndRestoreFloorRoomStates(roomId, floorIndex, () => renderFloorRooms(roomId, floorIndex));
        }
        return;
      }

      if (parts[0] !== 'living' || typeof renderLivingRooms !== 'function') return;
      const roomId = parts[1];
      const index = Number(parts[2]);
      const roomGroup = document.getElementById(`livingRoom_${index}Group_${roomId}`);
      const repairGroup = document.getElementById(`repairInfo_${index}Group_${roomId}`);
      const roomWasOpen = !!roomGroup && (roomGroup.style.display !== 'none' || roomGroup.classList.contains('expanded'));
      const repairWasOpen = !!repairGroup && (repairGroup.style.display !== 'none' || repairGroup.classList.contains('expanded'));

      renderLivingRooms(roomId);

      const nextRoomGroup = document.getElementById(`livingRoom_${index}Group_${roomId}`);
      const nextRoomIcon = document.getElementById(`livingRoom_${index}Icon_${roomId}`);
      if (nextRoomGroup && roomWasOpen) {
        nextRoomGroup.classList.add('expanded');
        nextRoomGroup.style.display = 'block';
        if (nextRoomIcon) nextRoomIcon.style.transform = 'rotate(0deg)';
      }

      const nextRepairGroup = document.getElementById(`repairInfo_${index}Group_${roomId}`);
      const nextRepairIcon = document.getElementById(`repairInfo_${index}Icon_${roomId}`);
      if (nextRepairGroup && repairWasOpen) {
        nextRepairGroup.classList.add('expanded');
        nextRepairGroup.style.display = 'block';
        if (nextRepairIcon) nextRepairIcon.style.transform = 'rotate(0deg)';
      }
    }

    function changeLivingRoomAreaValue(roomKey, field, delta, min = 0, max = 9999) {
      const data = getLivingRoomDataByKey(roomKey);
      if (!data) return;
      const resolvedMax = field === 'area'
        ? getLivingRoomAreaLimit(data)
        : field === 'wallsArea'
          ? getLivingRoomWallsAreaLimit(data)
          : Number(max || 9999);
      const next = Math.max(Number(min || 0), Math.min(resolvedMax, Number(data[field] || 0) + Number(delta || 0)));
      updateLivingRoomDataByKey(roomKey, field, Number(next.toFixed(2)));
    }

    function syncLivingRoomDerivedAreas(data, changedField = '') {
      if (!data) return;
      const length = getRoomNumber(data.roomLength, 0);
      const width = getRoomNumber(data.roomWidth, 0);
      const mode = getLivingRoomAreaCalcMode(data);
      data.useDimensions = mode === 'dimensions';
      const hasDimensions = mode === 'dimensions' && length > 0 && width > 0;

      if (mode === 'dimensions' && !data.floorAreaManual) {
        if (!hasDimensions) return;
        data.area = clampLivingRoomFloorArea(Number((length * width).toFixed(2)), data);
        data.roomPerimeter = Number(((length + width) * 2).toFixed(2));
      }

      if (!data.wallsAreaManual) {
        const autoWallsArea = Number(calculateLivingRoomWallsArea({ ...data, wallsAreaManual: false, wallsArea: 0 }).toFixed(2));
        data.wallsArea = clampLivingRoomWallsArea(autoWallsArea, data);
      }

      if (!data.ceilingAreaManual) {
        data.ceilingArea = getLivingRoomFloorArea(data);
      }
    }

    function shouldDeferLivingRoomDimensionCalculation(data = {}, field = '') {
      if (!['roomLength', 'roomWidth'].includes(String(field || ''))) return false;
      if (getLivingRoomAreaCalcMode(data) !== 'dimensions') return false;
      return getRoomNumber(data.roomLength, 0) <= 0 || getRoomNumber(data.roomWidth, 0) <= 0;
    }

    function updateLivingRoomAreaInputs(roomId, index, data) {
      const group = document.querySelector(`#livingRoom_${index}Group_${roomId}`);
      if (!group || !data) return;
      const lengthInput = group.querySelector('input[data-field="roomLength"]');
      const widthInput = group.querySelector('input[data-field="roomWidth"]');
      const perimeterInput = group.querySelector('input[data-field="roomPerimeter"]');
      const peopleInput = group.querySelector('input[data-field="peopleCount"]');
      const areaInput = group.querySelector('input[data-field="area"]');
      const wallsInput = group.querySelector('input[data-field="wallsArea"]');
      const ceilingInput = group.querySelector('input[data-field="ceilingArea"]');
      const perimeterInfo = group.querySelector('[data-room-area-perimeter]');
      if (lengthInput && document.activeElement !== lengthInput) lengthInput.value = getRoomNumber(data.roomLength, 0).toFixed(2);
      if (widthInput && document.activeElement !== widthInput) widthInput.value = getRoomNumber(data.roomWidth, 0).toFixed(2);
      if (perimeterInput && document.activeElement !== perimeterInput) perimeterInput.value = getRoomNumber(data.roomPerimeter, 0).toFixed(2);
      if (peopleInput && document.activeElement !== peopleInput) peopleInput.value = String(Math.max(0, parseInt(data.peopleCount, 10) || 0));
      if (areaInput && document.activeElement !== areaInput) areaInput.value = getLivingRoomFloorArea(data).toFixed(2);
      if (wallsInput && document.activeElement !== wallsInput) wallsInput.value = calculateLivingRoomWallsArea(data).toFixed(2);
      if (ceilingInput && document.activeElement !== ceilingInput) ceilingInput.value = getLivingRoomCeilingArea(data).toFixed(2);
      if (perimeterInfo) perimeterInfo.textContent = getLivingRoomPerimeter(data).toFixed(2) + ' м';
    }

    function updateFloorRoomAreaInputs(roomId, floorIndex, roomIndex, data) {
      const group = document.querySelector(`#floorRoom_${floorIndex}_${roomIndex}Group_${roomId}`);
      if (!group || !data) return;
      const lengthInput = group.querySelector('input[data-field="roomLength"]');
      const widthInput = group.querySelector('input[data-field="roomWidth"]');
      const perimeterInput = group.querySelector('input[data-field="roomPerimeter"]');
      const peopleInput = group.querySelector('input[data-field="peopleCount"]');
      const areaInput = group.querySelector('input[data-field="area"]');
      const wallsInput = group.querySelector('input[data-field="wallsArea"]');
      const ceilingInput = group.querySelector('input[data-field="ceilingArea"]');
      const perimeterInfo = group.querySelector('[data-room-area-perimeter]');
      const materialFloor = document.getElementById(`floorRoomMatFloor_${roomId}_${floorIndex}_${roomIndex}`);
      const materialWalls = document.getElementById(`floorRoomMatWalls_${roomId}_${floorIndex}_${roomIndex}`);
      const materialCeiling = document.getElementById(`floorRoomMatCeiling_${roomId}_${floorIndex}_${roomIndex}`);
      if (lengthInput && document.activeElement !== lengthInput) lengthInput.value = getRoomNumber(data.roomLength, 0).toFixed(2);
      if (widthInput && document.activeElement !== widthInput) widthInput.value = getRoomNumber(data.roomWidth, 0).toFixed(2);
      if (perimeterInput && document.activeElement !== perimeterInput) perimeterInput.value = getRoomNumber(data.roomPerimeter, 0).toFixed(2);
      if (peopleInput && document.activeElement !== peopleInput) peopleInput.value = String(Math.max(0, parseInt(data.peopleCount, 10) || 0));
      if (areaInput && document.activeElement !== areaInput) areaInput.value = getLivingRoomFloorArea(data).toFixed(2);
      if (wallsInput && document.activeElement !== wallsInput) wallsInput.value = calculateLivingRoomWallsArea(data).toFixed(2);
      if (ceilingInput && document.activeElement !== ceilingInput) ceilingInput.value = getLivingRoomCeilingArea(data).toFixed(2);
      if (perimeterInfo) perimeterInfo.textContent = getLivingRoomPerimeter(data).toFixed(2) + ' м';
      if (materialFloor) materialFloor.textContent = getLivingRoomMaterialFloorArea(data).toFixed(2) + ' м²';
      if (materialWalls) materialWalls.textContent = getLivingRoomMaterialWallsArea(data).toFixed(2) + ' м²';
      if (materialCeiling) materialCeiling.textContent = getLivingRoomMaterialCeilingArea(data).toFixed(2) + ' м²';
    }

    function getLivingRoomPerimeter(data) {
      const mode = getLivingRoomAreaCalcMode(data);
      const length = getRoomNumber(data?.roomLength, 0);
      const width = getRoomNumber(data?.roomWidth, 0);
      if (mode === 'dimensions' && length > 0 && width > 0) return (length + width) * 2;
      if (mode === 'perimeter_area') return Math.max(0, getRoomNumber(data?.roomPerimeter, 0));
      const area = getLivingRoomFloorArea(data);
      if (area <= 0) return 0;
      const compactPerimeter = Math.sqrt(area) * 4;
      const elongatedPerimeter = (area / 4 + 4) * 2;
      const shapeFactor = area >= 80 ? 1.03 : area >= 40 ? 1.06 : 1.1;
      return Math.min(elongatedPerimeter, compactPerimeter * shapeFactor);
    }

    function renderLivingRoomAreaCalcSummary(data = {}) {
      const mode = getLivingRoomAreaCalcMode(data);
      if (mode !== 'dimensions' && mode !== 'perimeter_area') return '';
      return `
        <div class="room-area-perimeter-info">
          <span>Периметр (м):</span>
          <strong data-room-area-perimeter>${getLivingRoomPerimeter(data).toFixed(2)} м</strong>
        </div>
      `;
    }

    function getLivingRoomAreaCalcMode(data) {
      if (data?.areaCalcMode === 'perimeter_area') return 'perimeter_area';
      if (data?.areaCalcMode === 'dimensions' || data?.useDimensions) return 'dimensions';
      return '';
    }

    function hasLivingRoomRepairInfoArea(data) {
      if (!data) return false;
      const mode = getLivingRoomAreaCalcMode(data);
      const floorArea = getLivingRoomFloorArea(data);
      if (mode === 'dimensions') {
        return getRoomNumber(data.roomLength, 0) > 0 && getRoomNumber(data.roomWidth, 0) > 0;
      }
      if (mode === 'perimeter_area') {
        return getRoomNumber(data.roomPerimeter, 0) > 0 && floorArea > 0;
      }
      return floorArea > 0;
    }

    function renderLivingRoomAreaCalcMode(roomKey, data = {}) {
      const mode = getLivingRoomAreaCalcMode(data);
      const isDimensions = mode === 'dimensions';
      const isPerimeter = mode === 'perimeter_area';
      return `
        <div class="room-area-calc-panel">
          <div class="room-area-calc-title">\u0420\u0430\u0441\u0447\u0435\u0442 \u043F\u043B\u043E\u0449\u0430\u0434\u0438</div>
          <div class="room-area-calc-options">
            <button type="button" class="room-area-calc-option ${isDimensions ? 'is-active' : ''}" onclick="event.stopPropagation(); setLivingRoomAreaCalcMode('${roomKey}', 'dimensions')">
              <span class="room-area-calc-radio" aria-hidden="true"></span>
              <span>
                <strong>\u0423\u043A\u0430\u0437\u0430\u0442\u044C \u0434\u043B\u0438\u043D\u0443 \u0438 \u0448\u0438\u0440\u0438\u043D\u0443</strong>
                <small>(\u0434\u043B\u044F \u043F\u0440\u044F\u043C\u043E\u0443\u0433\u043E\u043B\u044C\u043D\u044B\u0445 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0439)</small>
              </span>
            </button>
            <button type="button" class="room-area-calc-option ${isPerimeter ? 'is-active' : ''}" onclick="event.stopPropagation(); setLivingRoomAreaCalcMode('${roomKey}', 'perimeter_area')">
              <span class="room-area-calc-radio" aria-hidden="true"></span>
              <span>
                <strong>\u0412\u0432\u0435\u0441\u0442\u0438 \u043F\u0435\u0440\u0438\u043C\u0435\u0442\u0440 \u0438 \u043F\u043B\u043E\u0449\u0430\u0434\u044C</strong>
                <small>(\u0434\u043B\u044F \u0441\u043B\u043E\u0436\u043D\u044B\u0445 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0438\u0439)</small>
              </span>
            </button>
          </div>
          ${isDimensions ? `
            <div class="room-area-calc-fields">
              <div class="area-input-group">
                <label class="text-xs text-gray-500 w-24">\u0414\u043B\u0438\u043D\u0430 (\u043C):</label>
                <div class="qty-controls">
                  <button type="button" class="qty-btn" onclick="changeLivingRoomAreaValue('${roomKey}', 'roomLength', -1, 0, 100)">−</button>
                  <input type="number" value="${getRoomNumber(data.roomLength, 0).toFixed(2)}" min="0" max="100" step="0.01" inputmode="decimal"
                         class="area-input" style="width: 80px" data-field="roomLength"
                         onchange="commitLivingRoomAreaInput(this, '${roomKey}', 'roomLength')"
                         onblur="commitLivingRoomAreaInput(this, '${roomKey}', 'roomLength')">
                  <button type="button" class="qty-btn" onclick="changeLivingRoomAreaValue('${roomKey}', 'roomLength', 1, 0, 100)">+</button>
                </div>
              </div>
              <div class="area-input-group">
                <label class="text-xs text-gray-500 w-24">\u0428\u0438\u0440\u0438\u043D\u0430 (\u043C):</label>
                <div class="qty-controls">
                  <button type="button" class="qty-btn" onclick="changeLivingRoomAreaValue('${roomKey}', 'roomWidth', -1, 0, 100)">−</button>
                  <input type="number" value="${getRoomNumber(data.roomWidth, 0).toFixed(2)}" min="0" max="100" step="0.01" inputmode="decimal"
                         class="area-input" style="width: 80px" data-field="roomWidth"
                         onchange="commitLivingRoomAreaInput(this, '${roomKey}', 'roomWidth')"
                         onblur="commitLivingRoomAreaInput(this, '${roomKey}', 'roomWidth')">
                  <button type="button" class="qty-btn" onclick="changeLivingRoomAreaValue('${roomKey}', 'roomWidth', 1, 0, 100)">+</button>
                </div>
              </div>
            </div>
          ` : ''}
          ${isPerimeter ? `
            <div class="room-area-calc-fields">
              <div class="area-input-group">
                <label class="text-xs text-gray-500 w-28">\u041F\u0435\u0440\u0438\u043C\u0435\u0442\u0440 (\u043C):</label>
                <div class="qty-controls">
                  <button type="button" class="qty-btn" onclick="changeLivingRoomAreaValue('${roomKey}', 'roomPerimeter', -1, 0, 500)">−</button>
                  <input type="number" value="${getRoomNumber(data.roomPerimeter, 0).toFixed(2)}" min="0" max="500" step="0.01" inputmode="decimal"
                         class="area-input" style="width: 86px" data-field="roomPerimeter"
                         onchange="commitLivingRoomAreaInput(this, '${roomKey}', 'roomPerimeter')"
                         onblur="commitLivingRoomAreaInput(this, '${roomKey}', 'roomPerimeter')">
                  <button type="button" class="qty-btn" onclick="changeLivingRoomAreaValue('${roomKey}', 'roomPerimeter', 1, 0, 500)">+</button>
                </div>
              </div>
              <div class="text-[10px] text-gray-400">\u041F\u043B\u043E\u0449\u0430\u0434\u044C \u043F\u043E\u043B\u0430 \u0432\u0432\u043E\u0434\u0438\u0442\u0441\u044F \u043D\u0438\u0436\u0435, \u0441\u0442\u0435\u043D\u044B \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043E\u0442 \u043F\u0435\u0440\u0438\u043C\u0435\u0442\u0440\u0430 \u0441 \u0443\u0447\u0435\u0442\u043E\u043C \u043F\u0440\u043E\u0435\u043C\u043E\u0432.</div>
            </div>
          ` : ''}
        </div>
      `;
    }

    function setLivingRoomAreaCalcMode(roomKey, mode) {
      const data = getLivingRoomDataByKey(roomKey);
      if (!data) return;
      data.areaCalcMode = mode;
      data.useDimensions = mode === 'dimensions';
      data.floorAreaManual = mode === 'perimeter_area';
      data.wallsAreaManual = false;
      data.ceilingAreaManual = false;
      if (mode === 'dimensions') {
        data.area = 0;
        data.wallsArea = 0;
        data.ceilingArea = 0;
      } else if (mode === 'perimeter_area') {
        data.roomLength = 0;
        data.roomWidth = 0;
        data.area = 0;
        data.wallsArea = 0;
        data.ceilingArea = 0;
      }
      syncLivingRoomDerivedAreas(data);
      const parts = String(roomKey || '').split(':');
      if (parts[0] === 'floor') {
        saveAndRestoreFloorRoomStates(parts[1], Number(parts[2]), () => renderFloorRooms(parts[1], Number(parts[2])));
        const group = document.getElementById('floorRoom_' + parts[2] + '_' + parts[3] + 'Group_' + parts[1]);
        const icon = document.getElementById('floorRoom_' + parts[2] + '_' + parts[3] + 'Icon_' + parts[1]);
        if (group) {
          group.classList.add('expanded');
          group.style.display = 'block';
        }
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        renderLivingRooms(parts[1]);
        const group = document.getElementById('livingRoom_' + parts[2] + 'Group_' + parts[1]);
        const icon = document.getElementById('livingRoom_' + parts[2] + 'Icon_' + parts[1]);
        if (group) group.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(0deg)';
      }
      updateLivingRoomsTotal(parts[1]);
      updateTotalAreas();
      updateWorksMaterialsDisplay();
      updateDetailedCalc();
    }

    function renderLivingRooms(roomId) {
      const container = document.getElementById(`livingRoomsContainer_${roomId}`);
      const room = priceData.rooms[roomId];
      const rooms = roomData[roomId]?.livingRooms || [];
      if (!container || !room) return;

      const openGroups = [];
      rooms.forEach((_, index) => {
        const group = document.getElementById(`livingRoom_${index}Group_${roomId}`);
        if (group && group.style.display !== 'none') openGroups.push(index);
      });

      container.innerHTML = rooms.map((_, index) => renderLivingRoomGroup(room, roomId, index)).join('');

      openGroups.forEach(index => {
        const group = document.getElementById(`livingRoom_${index}Group_${roomId}`);
        const icon = document.getElementById(`livingRoom_${index}Icon_${roomId}`);
        if (group) group.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(0deg)';
      });
    }

    function toggleLivingRoomDimensions(roomId, index) {
      const data = roomData[roomId]?.livingRooms?.[index];
      if (!data) return;
      setLivingRoomAreaCalcMode(`living:${roomId}:${index}`, getLivingRoomAreaCalcMode(data) === 'dimensions' ? '' : 'dimensions');
    }
    
    function calculateLivingRoomWallsArea(data) {
      if (!data) return 0;
      if (data.wallsAreaManual) {
        return Math.max(0, getRoomNumber(data.wallsArea, 0));
      }

      const area = getLivingRoomFloorArea(data);
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
      
      const length = getRoomNumber(data.roomLength, 0);
      const width = getRoomNumber(data.roomWidth, 0);
      const mode = getLivingRoomAreaCalcMode(data);
      if (mode === 'dimensions' && (length <= 0 || width <= 0)) {
        return 0;
      }

      let perimeter;
      if (mode === 'dimensions' && length > 0 && width > 0) {
        perimeter = (length + width) * 2;
      } else if (mode === 'perimeter_area') {
        perimeter = getRoomNumber(data.roomPerimeter, 0);
        if (perimeter <= 0) return 0;
      } else {
        if (area <= 0) return 0;
        const compactPerimeter = Math.sqrt(area) * 4;
        const elongatedPerimeter = (area / 4 + 4) * 2;
        const shapeFactor = area >= 80 ? 1.03 : area >= 40 ? 1.06 : 1.1;
        perimeter = Math.min(elongatedPerimeter, compactPerimeter * shapeFactor);
      }

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
    



