// Module: calc-ui-toggles.js
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
