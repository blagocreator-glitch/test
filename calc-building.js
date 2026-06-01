// Module: calc-building.js
    function updateBuildingSubtype() {
      const buildingType = document.getElementById('buildingType').value;
      const subtypeContainer = document.getElementById('buildingSubtypeContainer');
      const subtypeSelect = document.getElementById('buildingSubtype');
      const materialContainer = document.getElementById('buildingMaterialContainer');
      
      subtypeSelect.innerHTML = buildingType
        ? '<option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0438\u043F \u0441\u0442\u0440\u043E\u0435\u043D\u0438\u044F</option>'
        : '<option value="">\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0438\u043F \u0437\u0434\u0430\u043D\u0438\u044F</option>';
      materialContainer.style.display = 'none';
      subtypeContainer.style.display = 'block';
      
      if (buildingType && buildingSubtypes[buildingType]) {
        buildingSubtypes[buildingType].forEach(item => {
          subtypeSelect.innerHTML += `<option value="${item.value}">${item.label}</option>`;
        });
      }
      
      const subAppointmentContainer = document.getElementById('buildingSubAppointmentContainer');
      if (subAppointmentContainer) {
        subAppointmentContainer.style.display = 'none';
      }
      if (typeof renderRoomInputs === 'function') renderRoomInputs();
      if (typeof updateTotalAreas === 'function') updateTotalAreas();
    }
    
    function updateBuildingMaterial() {
      const buildingType = document.getElementById('buildingType').value;
      const buildingSubtype = document.getElementById('buildingSubtype').value;
      const materialContainer = document.getElementById('buildingMaterialContainer');
      const materialSelect = document.getElementById('buildingMaterial');
      
      materialSelect.innerHTML = '<option value="">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B</option>';
      materialContainer.style.display = 'none';

      if (buildingSubtype && buildingAppointments[buildingSubtype]) {
        updateRoomAppointmentOptions(buildingSubtype);
      }
      
      if ((buildingType === 'business' || buildingType === 'multiapartment') && buildingSubtype) {
        let materialKey = buildingType;
        if (buildingType === 'multiapartment') {
          materialKey = buildingType + '_' + buildingSubtype;
        }
        
        if (buildingMaterials[materialKey]) {
          materialContainer.style.display = 'block';
          buildingMaterials[materialKey].forEach(item => {
            materialSelect.innerHTML += `<option value="${item.value}">${item.label}</option>`;
          });
        }
      } else if (buildingType && buildingSubtype) {
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
    
    function updateRoomAppointmentOptions(buildingSubtype) {
      if (!buildingAppointments[buildingSubtype]) return;
      
      const appointmentOptions = buildingAppointments[buildingSubtype];
      const validValues = appointmentOptions.map(item => item.value);
      
      ['living', 'nonliving'].forEach(roomId => {
        if (!roomData[roomId]) return;
        
        if (roomData[roomId].livingRooms) {
          roomData[roomId].livingRooms.forEach((room, index) => {
            if (room.appointment && !validValues.includes(room.appointment)) {
              room.appointment = '';
            }
            if (room.appointment !== 'commercial') {
              room.subAppointment = '';
              room.retailPremiseType = '';
              if (typeof resetRoomTypeToDefault === 'function') {
                resetRoomTypeToDefault(roomId, room);
              }
            }
            const appointmentSelect = document.getElementById(`appointment_${roomId}_${index}`);
            if (appointmentSelect) {
              const currentValue = room.appointment || '';
              appointmentSelect.innerHTML = '<option value="">Выберите назначение</option>';
              appointmentOptions.forEach(item => {
                const selected = currentValue === item.value ? 'selected' : '';
                appointmentSelect.innerHTML += `<option value="${item.value}" ${selected}>${item.label}</option>`;
              });
            }
          });
        }
        
        if (roomData[roomId].floors) {
          roomData[roomId].floors.forEach((floor, floorIndex) => {
            if (floor.livingRooms) {
              floor.livingRooms.forEach((room, roomIndex) => {
                if (room.appointment && !validValues.includes(room.appointment)) {
                  room.appointment = '';
                }
                if (room.appointment !== 'commercial') {
                  room.subAppointment = '';
                  room.retailPremiseType = '';
                  if (typeof resetRoomTypeToDefault === 'function') {
                    resetRoomTypeToDefault(roomId, room);
                  }
                }
                const appointmentSelect = document.getElementById(`floorAppointment_${roomId}_${floorIndex}_${roomIndex}`);
                if (appointmentSelect) {
                  const currentValue = room.appointment || '';
                  appointmentSelect.innerHTML = '<option value="">Выберите назначение</option>';
                  appointmentOptions.forEach(item => {
                    const selected = currentValue === item.value ? 'selected' : '';
                    appointmentSelect.innerHTML += `<option value="${item.value}" ${selected}>${item.label}</option>`;
                  });
                }
              });
            }
          });
        }
      });
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
      const locationRow = document.getElementById('estimateLocationRow');
      const addressContainer = document.getElementById('addressContainer');
      const tariffCityRow = document.getElementById('tariffCityRow');
      const tariffCityContainer = document.getElementById('tariffCityContainer');
      
      if (cargoElevator === 'yes') {
        floorContainer.style.display = 'none';
        locationRow?.classList.add('floor-hidden');
        addressContainer?.classList.add('md:col-span-2');
        tariffCityRow?.classList.add('floor-hidden');
        tariffCityContainer?.classList.add('md:col-span-2');
      } else {
        floorContainer.style.display = 'block';
        locationRow?.classList.remove('floor-hidden');
        addressContainer?.classList.remove('md:col-span-2');
        tariffCityRow?.classList.remove('floor-hidden');
        tariffCityContainer?.classList.remove('md:col-span-2');
      }
    }
    
    let addressDebounceTimer;
