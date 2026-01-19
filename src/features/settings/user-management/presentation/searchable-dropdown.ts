/**
 * Searchable Dropdown Utility
 * Converts regular select elements into searchable dropdowns
 */

/**
 * Convert a select element to a searchable dropdown
 */
export function makeSearchable(selectId: string): void {
  const select = document.getElementById(selectId) as HTMLSelectElement;
  if (!select) return;

  // Skip if already converted
  if (select.hasAttribute('data-searchable')) return;

  // Mark as searchable
  select.setAttribute('data-searchable', 'true');

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'searchable-dropdown-wrapper';
  wrapper.style.cssText = 'position: relative; width: 100%;';

  // Create search input
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'searchable-dropdown-input';
  searchInput.placeholder = select.querySelector('option[value=""]')?.textContent || 'Search...';
  searchInput.style.cssText = `
    width: 100%;
    padding: 0.5rem 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    font-family: 'Poppins', sans-serif;
    background-color: #ffffff;
    color: #111827;
    box-sizing: border-box;
  `;

  // Create dropdown list
  const dropdownList = document.createElement('div');
  dropdownList.className = 'searchable-dropdown-list';
  dropdownList.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    max-height: 12rem;
    overflow-y: auto;
    z-index: 1000;
    display: none;
    margin-top: 0.25rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  `;

  // Store original options and function to refresh options
  let options: Array<{ value: string; text: string }> = [];
  
  const refreshOptions = () => {
    options = [];
    Array.from(select.options).forEach(option => {
      options.push({
        value: option.value,
        text: option.textContent || option.value
      });
    });
  };
  
  // Initial options
  refreshOptions();

  // Render options
  const renderOptions = (filteredOptions: Array<{ value: string; text: string }>) => {
    dropdownList.innerHTML = '';
    
    // If no options, show a message
    if (filteredOptions.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'searchable-dropdown-item';
      noResults.textContent = 'No options available';
      noResults.style.cssText = `
        padding: 0.5rem 0.75rem;
        font-size: 0.8125rem;
        font-family: 'Poppins', sans-serif;
        color: #6b7280;
        font-style: italic;
      `;
      dropdownList.appendChild(noResults);
      return;
    }
    
    filteredOptions.forEach(option => {
      const item = document.createElement('div');
      item.className = 'searchable-dropdown-item';
      item.textContent = option.text;
      item.dataset.value = option.value;
      item.style.cssText = `
        padding: 0.5rem 0.75rem;
        cursor: pointer;
        font-size: 0.8125rem;
        font-family: 'Poppins', sans-serif;
        color: #111827;
      `;

      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f9fafb';
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = '';
      });

      item.addEventListener('click', () => {
        select.value = option.value;
        searchInput.value = option.value ? option.text : '';
        dropdownList.style.display = 'none';
        searchInput.style.borderColor = '';
        
        // Clear any validation errors
        const errorElement = document.getElementById(`${select.id}_error`);
        if (errorElement) {
          errorElement.remove();
        }
        select.style.borderColor = '';
        select.style.borderWidth = '';
        
        // Trigger change event
        select.dispatchEvent(new Event('change', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      dropdownList.appendChild(item);
    });
  };

  // Initialize with all options
  renderOptions(options);

  // Update search input when select changes
  const updateSearchInput = () => {
    const selectedOption = options.find(opt => opt.value === select.value);
    if (selectedOption) {
      searchInput.value = selectedOption.value ? selectedOption.text : '';
    } else {
      searchInput.value = '';
    }
    
    // Sync border color for validation
    if (select.style.borderColor) {
      searchInput.style.borderColor = select.style.borderColor;
      searchInput.style.borderWidth = select.style.borderWidth || '2px';
    } else {
      searchInput.style.borderColor = '';
      searchInput.style.borderWidth = '';
    }
  };

  // Search functionality - refresh options before filtering
  searchInput.addEventListener('input', (e) => {
    refreshOptions(); // Refresh options in case they were added dynamically
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    const filtered = options.filter(opt => 
      opt.text.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query)
    );
    renderOptions(filtered);
    dropdownList.style.display = filtered.length > 0 ? 'block' : 'none';
  });

  // Show dropdown on focus - refresh options first
  searchInput.addEventListener('focus', () => {
    refreshOptions(); // Refresh options in case they were added dynamically
    const query = searchInput.value.toLowerCase();
    const filtered = options.filter(opt => 
      opt.text.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query)
    );
    renderOptions(filtered);
    dropdownList.style.display = filtered.length > 0 ? 'block' : 'none';
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target as Node)) {
      dropdownList.style.display = 'none';
    }
  });

  // Hide select visually but keep it for form submission
  select.style.cssText = 'position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0;';

  // Wrap elements
  wrapper.appendChild(searchInput);
  wrapper.appendChild(dropdownList);
  select.parentNode?.insertBefore(wrapper, select);
  wrapper.appendChild(select);

  // Initialize search input value
  updateSearchInput();

  // Update when select changes programmatically
  select.addEventListener('change', updateSearchInput);
  
  // Watch for option changes (when dropdowns are populated dynamically)
  const observer = new MutationObserver(() => {
    const oldLength = options.length;
    refreshOptions();
    // If options were added, update the display
    if (options.length > oldLength && dropdownList.style.display === 'block') {
      const query = searchInput.value.toLowerCase();
      const filtered = options.filter(opt => 
        opt.text.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query)
      );
      renderOptions(filtered);
    }
    updateSearchInput();
  });
  
  observer.observe(select, {
    childList: true,
    subtree: true
  });
  
  // Expose refresh function for external use
  (select as any).refreshSearchableOptions = refreshOptions;
}

/**
 * Make all dropdowns in a form searchable
 * Waits for dropdowns to be populated before making them searchable
 */
export function makeAllDropdownsSearchable(formId: string): void {
  const form = document.getElementById(formId) as HTMLFormElement;
  if (!form) return;

  const selects = form.querySelectorAll('select:not([data-searchable])');
  
  selects.forEach(select => {
    if (select.id) {
      // Wait for options to be populated (check multiple times)
      let attempts = 0;
      const maxAttempts = 10;
      const checkAndMakeSearchable = () => {
        attempts++;
        const selectElement = document.getElementById(select.id) as HTMLSelectElement;
        if (!selectElement) return;
        
        // Check if dropdown has options (more than just the default empty option)
        // For some dropdowns like Role, Country, Designation - they have hardcoded options
        // For others like Channel, Team Lead - they depend on async data
        const hasOptions = selectElement.options.length > 1 || 
                          (selectElement.options.length === 1 && selectElement.options[0].value !== '');
        
        // Always make searchable after max attempts, even if no options yet
        // The MutationObserver will update options when they're added
        if (hasOptions || attempts >= maxAttempts) {
          makeSearchable(select.id);
        } else {
          // Wait a bit more and check again
          setTimeout(checkAndMakeSearchable, 150);
        }
      };
      
      // Start checking after a short delay
      setTimeout(checkAndMakeSearchable, 100);
    }
  });
}
