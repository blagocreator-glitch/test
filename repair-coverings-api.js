(function () {
  'use strict';

  const cache = new Map();
  const endpoints = {
    coveringCatalog: 'backend/api/coverings.php',
    coveringAutofill: 'backend/api/covering-autofill.php',
    coveringValidate: 'backend/api/covering-validate.php',
    coveringOptions: 'backend/api/covering-options.php',
    roomRepairRule: 'backend/api/room-repair-rule.php',
    roomRepairMaterialRecipe: 'backend/api/room-repair-material-recipe.php'
  };

  function normalizeCatalogKey(catalog) {
    return String(catalog || 'walls.common').trim() || 'walls.common';
  }

  async function fetchCoveringCatalog(catalog = 'walls.common') {
    const key = normalizeCatalogKey(catalog);
    if (cache.has(key)) return cache.get(key);
    const url = `${endpoints.coveringCatalog}?catalog=${encodeURIComponent(key)}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`Covering catalog request failed: ${response.status}`);
    const payload = await response.json();
    if (!payload?.ok || !payload.data) throw new Error(payload?.error || 'Covering catalog response is invalid');
    cache.set(key, payload.data);
    return payload.data;
  }

  function clearCoveringCatalogCache(catalog = '') {
    if (catalog) cache.delete(normalizeCatalogKey(catalog));
    else cache.clear();
  }

  async function autofillCoveringDetails(payload = {}) {
    const response = await fetch(endpoints.coveringAutofill, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {})
    });
    if (!response.ok) throw new Error(`Covering autofill request failed: ${response.status}`);
    const data = await response.json();
    if (!data?.ok) throw new Error(data?.error || 'Covering autofill response is invalid');
    return Array.isArray(data.suggestions) ? data.suggestions : [];
  }

  async function validateCoveringDetails(payload = {}) {
    const response = await fetch(endpoints.coveringValidate, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {})
    });
    if (!response.ok) throw new Error(`Covering validation request failed: ${response.status}`);
    const data = await response.json();
    if (!data?.ok) throw new Error(data?.error || 'Covering validation response is invalid');
    return data;
  }

  async function fetchCoveringOptions(payload = {}) {
    const response = await fetch(endpoints.coveringOptions, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {})
    });
    if (!response.ok) throw new Error(`Covering options request failed: ${response.status}`);
    const data = await response.json();
    if (!data?.ok) throw new Error(data?.error || 'Covering options response is invalid');
    return data;
  }

  async function resolveRoomRepairRule(payload = {}) {
    const response = await fetch(endpoints.roomRepairRule, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {})
    });
    if (!response.ok) throw new Error(`Room repair rule request failed: ${response.status}`);
    const data = await response.json();
    if (!data?.ok) throw new Error(data?.error || 'Room repair rule response is invalid');
    return data.rule || null;
  }

  async function fetchRoomRepairMaterialRecipes(payload = {}) {
    const response = await fetch(endpoints.roomRepairMaterialRecipe, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {})
    });
    if (!response.ok) throw new Error(`Room repair material recipe request failed: ${response.status}`);
    const data = await response.json();
    if (!data?.ok) throw new Error(data?.error || 'Room repair material recipe response is invalid');
    return data.recipes || {};
  }

  window.RepairCoveringsApi = {
    endpoints,
    fetchCoveringCatalog,
    autofillCoveringDetails,
    validateCoveringDetails,
    fetchCoveringOptions,
    resolveRoomRepairRule,
    fetchRoomRepairMaterialRecipes,
    clearCoveringCatalogCache
  };
})();
