function getSelectedItemsCount(groupName) {
  return Object.values(selectedItems[groupName] || {}).reduce((sum, keys) => {
    return sum + (Array.isArray(keys) ? keys.length : 0);
  }, 0);
}

function isFilledWhatToDoValue(value) {
  return value !== undefined && value !== null && value !== '' && Number(value) > 0;
}

function hasMeasuredWhatToDoItem(item) {
  return !!item?.type && (
    isFilledWhatToDoValue(item.qty)
    || isFilledWhatToDoValue(item.length)
    || isFilledWhatToDoValue(item.area)
    || isFilledWhatToDoValue(item.depth)
    || isFilledWhatToDoValue(item.width)
  );
}

function hasDemolitionRoomData(roomId) {
  const data = roomData.demolitionData?.[roomId];
  if (!data) return false;

  return !!(
    data.partitions?.some(item => item.material && isFilledWhatToDoValue(item.area)) ||
    data.electrical?.some(item => item.type && isFilledWhatToDoValue(item.qty)) ||
    data.ventilation?.some(item => item.type && (isFilledWhatToDoValue(item.qty) || isFilledWhatToDoValue(item.length))) ||
    data.water?.some(item => item.type && isFilledWhatToDoValue(item.qty)) ||
    data.drainage?.some(item => item.type && (isFilledWhatToDoValue(item.qty) || isFilledWhatToDoValue(item.length) || isFilledWhatToDoValue(item.depth))) ||
    data.plumbing?.some(item => item.type && isFilledWhatToDoValue(item.qty)) ||
    data.heating?.some(item => item.type && (isFilledWhatToDoValue(item.qty) || isFilledWhatToDoValue(item.length) || isFilledWhatToDoValue(item.width))) ||
    data.finishing?.floor?.some(item => item.type) ||
    data.finishing?.wall?.some(item => item.type) ||
    data.finishing?.ceiling?.some(item => item.type) ||
    data.doorOpenings?.some(item => item.material && isFilledWhatToDoValue(item.length) && isFilledWhatToDoValue(item.width)) ||
    data.windowOpenings?.some(item => item.material && isFilledWhatToDoValue(item.length) && isFilledWhatToDoValue(item.width)) ||
    data.balconyOpenings?.some(item => item.material && isFilledWhatToDoValue(item.length) && isFilledWhatToDoValue(item.width))
  );
}

function hasRepairRoomData(roomId) {
  const data = roomData.repairData?.[roomId];
  if (!data) return false;

  return !!(
    data.rough?.floorLeveling?.some(hasMeasuredWhatToDoItem) ||
    data.rough?.wallPlaster?.some(hasMeasuredWhatToDoItem) ||
    data.rough?.wallPutty?.some(hasMeasuredWhatToDoItem) ||
    data.rough?.wallWaterproof?.some(hasMeasuredWhatToDoItem) ||
    data.rough?.partitions?.some(hasMeasuredWhatToDoItem) ||
    data.rough?.ceilingPrep?.some(hasMeasuredWhatToDoItem) ||
    data.engineering?.electrical?.some(item => item.type && (isFilledWhatToDoValue(item.qty) || isFilledWhatToDoValue(item.length) || isFilledWhatToDoValue(item.area))) ||
    data.engineering?.ventilation?.some(item => item.type && (isFilledWhatToDoValue(item.qty) || isFilledWhatToDoValue(item.length) || isFilledWhatToDoValue(item.area))) ||
    data.engineering?.water?.some(item => item.type && (isFilledWhatToDoValue(item.qty) || isFilledWhatToDoValue(item.length) || isFilledWhatToDoValue(item.area))) ||
    data.engineering?.drainage?.some(item => item.type && (isFilledWhatToDoValue(item.qty) || isFilledWhatToDoValue(item.length) || isFilledWhatToDoValue(item.area))) ||
    data.engineering?.heating?.some(item => item.type && (isFilledWhatToDoValue(item.qty) || isFilledWhatToDoValue(item.length) || isFilledWhatToDoValue(item.area))) ||
    data.finishing?.floor?.some(item => item.type && (isFilledWhatToDoValue(item.area) || isFilledWhatToDoValue(item.length) || isFilledWhatToDoValue(item.qty))) ||
    data.finishing?.wall?.some(item => item.type && (isFilledWhatToDoValue(item.area) || isFilledWhatToDoValue(item.length) || isFilledWhatToDoValue(item.qty))) ||
    data.finishing?.ceiling?.some(item => item.type && (isFilledWhatToDoValue(item.area) || isFilledWhatToDoValue(item.length) || isFilledWhatToDoValue(item.qty))) ||
    data.finishing?.openings?.door?.some(item => isRepairOpeningComplete(item, 'door')) ||
    data.finishing?.openings?.window?.some(item => isRepairOpeningComplete(item, 'window')) ||
    data.finishing?.openings?.balcony?.some(item => isRepairOpeningComplete(item, 'balcony')) ||
    Object.values(data.architecturalSupervision || {}).some(item => isFilledWhatToDoValue(item?.qty))
  );
}

function setWhatToDoHeaderState(headerId, done) {
  const doneIcon = document.getElementById(headerId + 'Done');
  if (doneIcon) doneIcon.classList.toggle('hidden', !done);
}

function getConfiguredWhatToDoRoomIds(prefix) {
  const ids = [];

  (roomData.living?.livingRooms || []).forEach((room, index) => {
    if (room && Number(room.area) > 0) ids.push(`${prefix}_living_${index}`);
  });

  (roomData.nonliving?.livingRooms || []).forEach((room, index) => {
    if (room && Number(room.area) > 0) ids.push(`${prefix}_nonliving_${index}`);
  });

  (roomData.nonliving?.floors || []).forEach((floor, floorIndex) => {
    (floor?.livingRooms || []).forEach((room, roomIndex) => {
      if (room && Number(room.area) > 0) ids.push(`${prefix}_nonliving_${floorIndex}_${roomIndex}`);
    });
  });

  return ids;
}
