(function initializeApp(global) {
  "use strict";

  const App = global.App || {};

  App.state = App.state || {
    priceData: null,
    roomData: {},
    itemQuantities: {},
    selectedItems: { works: {}, materials: {}, additional: {} },
    repairQuestState: {}
  };

  App.calc = App.calc || {};
  App.pricing = App.pricing || {};

  App.calc.recalculate = function recalculate() {
    if (typeof global.calculateAndUpdateTotals === "function") {
      global.calculateAndUpdateTotals();
      return;
    }
    if (typeof global.updateDetailedCalc === "function") {
      global.updateDetailedCalc();
    }
  };

  App.pricing.getWorkPrice = function getWorkPriceSafe(workId) {
    if (typeof global.getWorkPrice === "function") {
      return global.getWorkPrice(workId);
    }
    return 0;
  };

  App.pricing.updateEstimates = function updateEstimatesSafe() {
    if (typeof global.updateEstimates === "function") {
      global.updateEstimates();
      return;
    }
    App.calc.recalculate();
  };

  App.init = function initApp() {
    if (typeof global.syncAppStateToNamespace === "function") {
      global.syncAppStateToNamespace();
    }

    if (typeof global.loadPrices === "function") {
      global.loadPrices();
    }
  };

  global.App = App;
})(window);
