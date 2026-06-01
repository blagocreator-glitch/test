const fs = require('fs');
const path = require('path');

const PRICE_LIST_PATH = path.join(__dirname, 'prices_list.json');
const MATERIALS_PATH = path.join(__dirname, 'prices_materials.json');

const VALID_RECIPE_STATUSES = new Set(['complete', 'not_required', 'todo']);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectWorkItems(node, result = []) {
  if (!node || typeof node !== 'object') return result;

  if (Array.isArray(node.items)) {
    node.items.forEach(item => {
      if (item?.id) {
        result.push({
          id: item.id,
          name: item.name || item.id,
          unit: item.unit || ''
        });
      }
    });
  }

  Object.values(node.categories || {}).forEach(child => collectWorkItems(child, result));
  Object.values(node.subcategories || {}).forEach(child => collectWorkItems(child, result));

  return result;
}

function collectTreeRefs(node, result = new Set()) {
  if (!node || typeof node !== 'object') return result;

  if (Array.isArray(node.items)) {
    node.items.forEach(item => {
      if (item?.workId) result.add(item.workId);
    });
  }

  Object.values(node.categories || {}).forEach(child => collectTreeRefs(child, result));
  Object.values(node.subcategories || {}).forEach(child => collectTreeRefs(child, result));

  return result;
}

function validatePriceValue(value) {
  if (Number.isFinite(Number(value)) && Number(value) >= 0) return true;
  if (!value || typeof value !== 'object') return false;
  if (!Number.isFinite(Number(value.base)) || Number(value.base) < 0) return false;
  if (!Array.isArray(value.tiers)) return true;

  return value.tiers.every(tier => {
    return Number.isFinite(Number(tier.fromQty))
      && Number(tier.fromQty) >= 0
      && Number.isFinite(Number(tier.price))
      && Number(tier.price) >= 0;
  });
}

function buildDomainReport(priceList, materialsData, domain) {
  const workItems = collectWorkItems(priceList.works?.[domain]);
  const workIds = new Set(workItems.map(item => item.id));
  const treeRefs = collectTreeRefs(materialsData.workMaterialTree?.[domain]);
  const recipes = materialsData.workMaterialRecipes || {};

  const missingTreeRefs = workItems.filter(item => !treeRefs.has(item.id)).map(item => item.id);
  const missingRecipes = workItems.filter(item => !recipes[item.id]).map(item => item.id);
  const extraTreeRefs = [...treeRefs].filter(id => !workIds.has(id));

  const recipeStatusProblems = workItems
    .map(item => ({ id: item.id, recipe: recipes[item.id] }))
    .filter(entry => entry.recipe && !VALID_RECIPE_STATUSES.has(entry.recipe.status))
    .map(entry => entry.id);

  const completeWithoutMaterials = workItems
    .map(item => ({ id: item.id, recipe: recipes[item.id] }))
    .filter(entry => entry.recipe?.status === 'complete'
      && (!Array.isArray(entry.recipe.materials) || entry.recipe.materials.length === 0))
    .map(entry => entry.id);

  const todoRecipes = workItems
    .filter(item => recipes[item.id]?.status === 'todo')
    .map(item => item.id);

  const notRequiredRecipes = workItems
    .filter(item => recipes[item.id]?.status === 'not_required')
    .map(item => item.id);

  const completeRecipes = workItems
    .filter(item => recipes[item.id]?.status === 'complete')
    .map(item => item.id);

  return {
    domain,
    totalWorks: workItems.length,
    treeRefs: treeRefs.size,
    recipes: workItems.filter(item => recipes[item.id]).length,
    complete: completeRecipes.length,
    notRequired: notRequiredRecipes.length,
    todo: todoRecipes.length,
    missingTreeRefs,
    missingRecipes,
    extraTreeRefs,
    recipeStatusProblems,
    completeWithoutMaterials
  };
}

function buildCatalogReport(materialsData) {
  const catalogIds = Object.keys(materialsData.materialCatalog || {});
  const countries = materialsData.countries || {};
  const markets = materialsData.markets || {};
  const cities = Object.values(countries)
    .flatMap(country => Object.keys(country.cities || {}));
  const marketNames = Object.keys(markets);
  const prices = materialsData.prices || {};

  const missingPrices = [];
  const invalidPrices = [];

  cities.forEach(city => {
    marketNames.forEach(market => {
      const cityMarketPrices = prices[city]?.[market] || {};
      catalogIds.forEach(materialId => {
        if (cityMarketPrices[materialId] === undefined) {
          missingPrices.push(`${city} / ${market} / ${materialId}`);
          return;
        }
        if (!validatePriceValue(cityMarketPrices[materialId])) {
          invalidPrices.push(`${city} / ${market} / ${materialId}`);
        }
      });
    });
  });

  return {
    catalogItems: catalogIds.length,
    cities: cities.length,
    markets: marketNames.length,
    missingPrices,
    invalidPrices
  };
}

function printList(title, items, limit = 20) {
  if (!items.length) return;
  console.log(`  ${title}: ${items.length}`);
  items.slice(0, limit).forEach(item => console.log(`    - ${item}`));
  if (items.length > limit) console.log(`    ... ${items.length - limit} more`);
}

function printDomainReport(report) {
  console.log(`\n${report.domain}`);
  console.log(`  works: ${report.totalWorks}`);
  console.log(`  work tree refs: ${report.treeRefs}`);
  console.log(`  recipes: ${report.recipes}`);
  console.log(`  complete recipes: ${report.complete}`);
  console.log(`  not required: ${report.notRequired}`);
  console.log(`  todo recipes: ${report.todo}`);

  printList('missing from workMaterialTree', report.missingTreeRefs);
  printList('missing from workMaterialRecipes', report.missingRecipes);
  printList('extra tree refs', report.extraTreeRefs);
  printList('invalid recipe statuses', report.recipeStatusProblems);
  printList('complete recipes without materials array', report.completeWithoutMaterials);
}

function printCatalogReport(report) {
  console.log('\nmaterial catalog');
  console.log(`  catalog items: ${report.catalogItems}`);
  console.log(`  cities: ${report.cities}`);
  console.log(`  markets: ${report.markets}`);
  printList('missing city/market prices', report.missingPrices);
  printList('invalid price values', report.invalidPrices);
}

function main() {
  const priceList = readJson(PRICE_LIST_PATH);
  const materialsData = readJson(MATERIALS_PATH);
  const strict = process.argv.includes('--strict');

  const domainReports = ['demolition', 'installation']
    .map(domain => buildDomainReport(priceList, materialsData, domain));
  const catalogReport = buildCatalogReport(materialsData);

  console.log('Materials price-list coverage audit');
  domainReports.forEach(printDomainReport);
  printCatalogReport(catalogReport);

  const structuralFailed = domainReports.some(report => {
    return report.missingTreeRefs.length > 0
      || report.missingRecipes.length > 0
      || report.extraTreeRefs.length > 0
      || report.recipeStatusProblems.length > 0
      || report.completeWithoutMaterials.length > 0;
  }) || catalogReport.missingPrices.length > 0
    || catalogReport.invalidPrices.length > 0;

  const todoCount = domainReports.reduce((sum, report) => sum + report.todo, 0);
  if (strict && todoCount > 0) {
    console.error(`\nFAIL: ${todoCount} material recipes still have todo status.`);
    process.exitCode = 1;
    return;
  }

  if (structuralFailed) {
    console.error('\nFAIL: materials price-list structure is not fully synchronized with prices_list.json.');
    process.exitCode = 1;
    return;
  }

  console.log('\nOK: materials structure is synchronized with prices_list.json.');
  if (todoCount > 0) {
    console.log(`NOTE: ${todoCount} recipes are marked todo; run with --strict when filling materials is mandatory.`);
  }
}

main();
