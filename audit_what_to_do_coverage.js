const fs = require('fs');
const path = require('path');

const PRICE_LIST_PATH = path.join(__dirname, 'prices_list.json');

const WHAT_TO_DO_PATHS = {
  demolition: [
    'demolition.categories.construct.subcategories.partitions',
    'demolition.categories.construct.subcategories.openings.subcategories.door',
    'demolition.categories.construct.subcategories.openings.subcategories.window',
    'demolition.categories.construct.subcategories.openings.subcategories.balcony',
    'demolition.categories.construct.subcategories.stairs.subcategories.staircase',
    'demolition.categories.construct.subcategories.stairs.subcategories.railing',
    'demolition.categories.engineering.subcategories.electrical',
    'demolition.categories.engineering.subcategories.ventilation',
    'demolition.categories.engineering.subcategories.water',
    'demolition.categories.engineering.subcategories.drainage',
    'demolition.categories.engineering.subcategories.plumbing',
    'demolition.categories.engineering.subcategories.heating',
    'demolition.categories.finishing.subcategories.floor',
    'demolition.categories.finishing.subcategories.wall',
    'demolition.categories.finishing.subcategories.ceiling'
  ],
  installation: [
    'installation.categories.rough.subcategories.floorLeveling',
    'installation.categories.rough.subcategories.wallLeveling.subcategories.wallPlaster',
    'installation.categories.rough.subcategories.wallLeveling.subcategories.wallPutty',
    'installation.categories.rough.subcategories.wallLeveling.subcategories.wallWaterproof',
    'installation.categories.rough.subcategories.ceilingPrep',
    'installation.categories.engineering.subcategories.electrical.subcategories.sockets_switches',
    'installation.categories.engineering.subcategories.electrical.subcategories.wiring',
    'installation.categories.engineering.subcategories.electrical.subcategories.lighting',
    'installation.categories.engineering.subcategories.electrical.subcategories.panel_protection',
    'installation.categories.engineering.subcategories.electrical.subcategories.low_current',
    'installation.categories.engineering.subcategories.electrical.subcategories.smart_home',
    'installation.categories.engineering.subcategories.electrical.subcategories.warm_floor_electric',
    'installation.categories.engineering.subcategories.ventilation.subcategories.ac',
    'installation.categories.engineering.subcategories.ventilation.subcategories.exhaust',
    'installation.categories.engineering.subcategories.ventilation.subcategories.supply',
    'installation.categories.engineering.subcategories.ventilation.subcategories.service',
    'installation.categories.engineering.subcategories.water.subcategories.pipes',
    'installation.categories.engineering.subcategories.water.subcategories.collectors_valves',
    'installation.categories.engineering.subcategories.water.subcategories.filtration',
    'installation.categories.engineering.subcategories.water.subcategories.equipment',
    'installation.categories.engineering.subcategories.water.subcategories.protection_service',
    'installation.categories.engineering.subcategories.drainage.subcategories.drain_pipes',
    'installation.categories.engineering.subcategories.drainage.subcategories.drain_risers',
    'installation.categories.engineering.subcategories.drainage.subcategories.drain_outlets',
    'installation.categories.engineering.subcategories.drainage.subcategories.drain_pumps',
    'installation.categories.engineering.subcategories.drainage.subcategories.drain_service',
    'installation.categories.engineering.subcategories.heating.subcategories.radiators',
    'installation.categories.engineering.subcategories.heating.subcategories.heating_pipes',
    'installation.categories.engineering.subcategories.heating.subcategories.boilers_equipment',
    'installation.categories.engineering.subcategories.heating.subcategories.valves_control',
    'installation.categories.engineering.subcategories.heating.subcategories.floor_heating',
    'installation.categories.engineering.subcategories.heating.subcategories.heating_service',
    'installation.categories.finishing.subcategories.floor',
    'installation.categories.finishing.subcategories.wall',
    'installation.categories.finishing.subcategories.ceiling',
    'installation.categories.finishing.subcategories.openings',
    'installation.categories.finishing.subcategories.stairs',
    'installation.categories.architecturalSupervision'
  ]
};

function collectLeafPaths(node, dotPath, result = []) {
  if (!node || typeof node !== 'object') return result;

  if (Array.isArray(node.items) && node.items.length > 0) {
    result.push(dotPath);
  }

  Object.entries(node.categories || {}).forEach(([key, child]) => {
    collectLeafPaths(child, `${dotPath}.categories.${key}`, result);
  });

  Object.entries(node.subcategories || {}).forEach(([key, child]) => {
    collectLeafPaths(child, `${dotPath}.subcategories.${key}`, result);
  });

  return result;
}

function getWhatToDoPaths(pricesData, domain) {
  if (domain === 'installation') return collectLeafPaths(pricesData.works?.installation, 'installation');
  if (domain === 'demolition') return collectLeafPaths(pricesData.works?.demolition, 'demolition');
  return WHAT_TO_DO_PATHS[domain] || [];
}

function readPriceList() {
  return JSON.parse(fs.readFileSync(PRICE_LIST_PATH, 'utf8'));
}

function getNode(root, dotPath) {
  return dotPath.split('.').reduce((node, key) => node?.[key], root);
}

function collectWorkIds(node, result = new Set()) {
  if (!node || typeof node !== 'object') return result;

  if (Array.isArray(node.items)) {
    node.items.forEach(item => {
      if (item?.id) result.add(item.id);
    });
  }

  Object.values(node.categories || {}).forEach(child => collectWorkIds(child, result));
  Object.values(node.subcategories || {}).forEach(child => collectWorkIds(child, result));

  return result;
}

function collectWorkItems(node, result = []) {
  if (!node || typeof node !== 'object') return result;

  if (Array.isArray(node.items)) {
    node.items.forEach(item => {
      if (item?.id) result.push(item);
    });
  }

  Object.values(node.categories || {}).forEach(child => collectWorkItems(child, result));
  Object.values(node.subcategories || {}).forEach(child => collectWorkItems(child, result));

  return result;
}

function collectLeaves(node, dotPath, result = []) {
  if (!node || typeof node !== 'object') return result;

  if (Array.isArray(node.items) && node.items.length > 0) {
    result.push({
      path: dotPath,
      name: node.name || dotPath,
      ids: node.items.map(item => item.id).filter(Boolean)
    });
  }

  Object.entries(node.categories || {}).forEach(([key, child]) => {
    collectLeaves(child, `${dotPath}.categories.${key}`, result);
  });

  Object.entries(node.subcategories || {}).forEach(([key, child]) => {
    collectLeaves(child, `${dotPath}.subcategories.${key}`, result);
  });

  return result;
}

function auditDomain(pricesData, domain, reachablePaths) {
  const domainNode = pricesData.works?.[domain];
  const allIds = collectWorkIds(domainNode);
  const allItems = collectWorkItems(domainNode);
  const reachableIds = new Set();
  const missingConfiguredPaths = [];

  reachablePaths.forEach(dotPath => {
    const node = getNode(pricesData.works, dotPath);
    if (!node) {
      missingConfiguredPaths.push(dotPath);
      return;
    }
    collectWorkIds(node, reachableIds);
  });

  const missingIds = [...allIds].filter(id => !reachableIds.has(id));
  const leavesWithMissingIds = collectLeaves(domainNode, domain)
    .map(leaf => ({
      ...leaf,
      missingIds: leaf.ids.filter(id => !reachableIds.has(id))
    }))
    .filter(leaf => leaf.missingIds.length > 0);

  return {
    domain,
    total: allIds.size,
    reachable: [...allIds].filter(id => reachableIds.has(id)).length,
    missing: missingIds.length,
    missingDurationIds: allItems
      .filter(item => !Number.isFinite(Number(item.hoursPerUnit)) || Number(item.hoursPerUnit) < 0)
      .map(item => item.id),
    missingTechnologicalIntervalIds: allItems
      .filter(item => !Number.isFinite(Number(item.technologicalIntervalHours)) || Number(item.technologicalIntervalHours) < 0)
      .map(item => item.id),
    missingConfiguredPaths,
    leavesWithMissingIds
  };
}

function printDomainReport(report) {
  console.log(`\n${report.domain}`);
  console.log(`  total work ids: ${report.total}`);
  console.log(`  reachable from What To Do: ${report.reachable}`);
  console.log(`  missing: ${report.missing}`);
  console.log(`  missing duration: ${report.missingDurationIds.length}`);
  console.log(`  missing technological interval: ${report.missingTechnologicalIntervalIds.length}`);

  if (report.missingConfiguredPaths.length > 0) {
    console.log('  configured paths not found:');
    report.missingConfiguredPaths.forEach(dotPath => console.log(`    - ${dotPath}`));
  }

  if (report.leavesWithMissingIds.length > 0) {
    console.log('  price-list leaves not reachable:');
    report.leavesWithMissingIds.forEach(leaf => {
      console.log(`    - ${leaf.path} (${leaf.name}): ${leaf.missingIds.length}`);
      leaf.missingIds.slice(0, 12).forEach(id => console.log(`      * ${id}`));
      if (leaf.missingIds.length > 12) {
        console.log(`      ... ${leaf.missingIds.length - 12} more`);
      }
    });
  }

  if (report.missingDurationIds.length > 0) {
    console.log('  works without valid hoursPerUnit:');
    report.missingDurationIds.slice(0, 24).forEach(id => console.log(`    - ${id}`));
    if (report.missingDurationIds.length > 24) {
      console.log(`    ... ${report.missingDurationIds.length - 24} more`);
    }
  }

  if (report.missingTechnologicalIntervalIds.length > 0) {
    console.log('  works without valid technologicalIntervalHours:');
    report.missingTechnologicalIntervalIds.slice(0, 24).forEach(id => console.log(`    - ${id}`));
    if (report.missingTechnologicalIntervalIds.length > 24) {
      console.log(`    ... ${report.missingTechnologicalIntervalIds.length - 24} more`);
    }
  }
}

function main() {
  const pricesData = readPriceList();
  const reports = Object.keys(WHAT_TO_DO_PATHS).map(domain => {
    return auditDomain(pricesData, domain, getWhatToDoPaths(pricesData, domain));
  });

  console.log('What To Do price-list coverage audit');
  reports.forEach(printDomainReport);

  const failed = reports.some(report => {
    return report.missing > 0
      || report.missingConfiguredPaths.length > 0
      || report.missingDurationIds.length > 0
      || report.missingTechnologicalIntervalIds.length > 0;
  });

  if (failed) {
    console.error('\nFAIL: some price-list works are not reachable from What To Do or have no valid timing data.');
    process.exitCode = 1;
    return;
  }

  console.log('\nOK: every price-list work is reachable from What To Do and has valid timing data.');
}

main();
