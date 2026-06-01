// Module: calc-address.js
    function handleAddressInput(value) {
      clearTimeout(addressDebounceTimer);
      const suggestionsBox = document.getElementById('addressSuggestions');
      if (typeof updateTariffCityFromAddress === 'function') {
        updateTariffCityFromAddress(value);
      }
      
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
      if (typeof updateTariffCityFromAddress === 'function') {
        updateTariffCityFromAddress(address);
      }
      
      const selectedCityInput = document.getElementById('selectedCity');
      if (selectedCityInput && !selectedCityInput.value) {
        selectedCityInput.value = '';
      }
    }
