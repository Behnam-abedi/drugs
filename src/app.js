/**
 * Negin Drug Search Application
 * Final Version: Includes Preloader, Live Search, Delete/Clear Buttons, and UI Animations.
 */

// --- Page Preloader Logic ---
// This runs as soon as the window's resources are fully loaded.
window.onload = () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        // Adding this class triggers the CSS animations defined in the HTML file.
        preloader.classList.add('preloader-hidden');
    }
};

// --- Main Application Logic ---
// This runs after the basic HTML structure is ready.
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DOM Element Selection ---
    // All elements we need to interact with are gathered here.
    const searchInput = document.getElementById('search-input');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const selectedDrugsList = document.getElementById('selected-drugs-list');
    const noSelectionPlaceholder = document.getElementById('no-selection-placeholder');
    const loadingIndicator = document.getElementById('loading-indicator');
    const clearSearchButton = document.getElementById('clear-search-button');

    // --- 2. Application State ---
    // A single source of truth for our application's data.
    let state = {
        selectedDrugs: [],
    };

    // --- 3. API Communication ---
    // Handles fetching data from the external API.
    const fetchFromApi = async (query) => {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://www.drugs.com/api/autocomplete/?type=interaction&s=${encodedQuery}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Network response was not ok`);
            const data = await response.json();
            // Correctly parse the API response structure
            if (data.categories && data.categories.length > 0) {
                return data.categories[0].results || [];
            }
            return [];
        } catch (error) {
            console.error("Fetch problem:", error);
            return [];
        }
    };

    // --- 4. Utility Functions ---
    // Reusable helper functions.
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // --- 5. Rendering Functions ---
    // These functions are responsible for updating the UI based on the state.
    const renderSuggestions = (suggestions) => {
        suggestionsContainer.innerHTML = '';
        if (!suggestions || suggestions.length === 0) {
            suggestionsContainer.classList.add('opacity-0', '-translate-y-2', 'pointer-events-none');
            return;
        }
        suggestionsContainer.classList.remove('opacity-0', '-translate-y-2', 'pointer-events-none');
        suggestions.forEach(item => {
            const suggestionEl = document.createElement('div');
            suggestionEl.className = 'px-4 py-3 cursor-pointer hover:bg-gray-700 transition-colors duration-150';
            suggestionEl.textContent = item.suggestion;
            suggestionEl.dataset.suggestion = item.suggestion;
            suggestionEl.dataset.ddcId = item.ddc_id;
            suggestionEl.dataset.brandNameId = item.brand_name_id;
            suggestionEl.addEventListener('click', handleSuggestionClick);
            suggestionsContainer.appendChild(suggestionEl);
        });
    };

    const renderSelectedDrugs = () => {
        selectedDrugsList.innerHTML = '';
        if (state.selectedDrugs.length === 0) {
            selectedDrugsList.appendChild(noSelectionPlaceholder);
        } else {
            state.selectedDrugs.forEach(drug => {
                const listItem = document.createElement('li');
                listItem.className = 'bg-gray-800 p-3 rounded-lg flex justify-between items-center transition-all duration-500 opacity-0 transform -translate-x-4';
                
                const drugName = document.createElement('span');
                drugName.textContent = drug.suggestion;
                
                const deleteButton = document.createElement('button');
                deleteButton.className = 'text-gray-500 hover:text-red-500 transition-colors p-1';
                deleteButton.title = `Remove ${drug.suggestion}`;
                deleteButton.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
                deleteButton.addEventListener('click', () => handleDeleteDrug(drug.suggestion));

                listItem.appendChild(drugName);
                listItem.appendChild(deleteButton);
                selectedDrugsList.appendChild(listItem);

                requestAnimationFrame(() => {
                    listItem.classList.remove('opacity-0', '-translate-x-4');
                });
            });
        }
    };

    // --- 6. Event Handlers ---
    // Functions that respond to user interactions.
    const handleDeleteDrug = (suggestionToDelete) => {
        state.selectedDrugs = state.selectedDrugs.filter(drug => drug.suggestion !== suggestionToDelete);
        renderSelectedDrugs();
    };

    const handleSuggestionClick = (event) => {
        const clickedElement = event.currentTarget;
        const newDrug = {
            suggestion: clickedElement.dataset.suggestion,
            ddc_id: clickedElement.dataset.ddcId,
            brand_name_id: clickedElement.dataset.brandNameId,
        };
        const isAlreadySelected = state.selectedDrugs.some(drug => drug.suggestion === newDrug.suggestion);
        if (!isAlreadySelected) {
            state.selectedDrugs.push(newDrug);
            renderSelectedDrugs();
        }
        searchInput.value = '';
        clearSearchButton.classList.add('hidden');
        renderSuggestions([]);
        searchInput.focus();
    };

    const handleSearchInput = async (event) => {
        const query = event.target.value.trim();

        if (query.length > 0) {
            clearSearchButton.classList.remove('hidden');
        } else {
            clearSearchButton.classList.add('hidden');
        }

        if (query.length < 1) {
            renderSuggestions([]);
            return;
        }
        
        loadingIndicator.classList.remove('hidden');
        clearSearchButton.classList.add('hidden');
        
        try {
            const results = await fetchFromApi(query);
            renderSuggestions(results);
        } finally {
            loadingIndicator.classList.add('hidden');
            if (searchInput.value.length > 0) {
                clearSearchButton.classList.remove('hidden');
            }
        }
    };

    // --- 7. Initialization ---
    // Setting up the initial event listeners when the app starts.
    const debouncedSearchHandler = debounce(handleSearchInput, 300);
    searchInput.addEventListener('input', debouncedSearchHandler);

    clearSearchButton.addEventListener('click', () => {
        searchInput.value = '';
        renderSuggestions([]);
        clearSearchButton.classList.add('hidden');
        searchInput.focus();
    });

    document.addEventListener('click', (event) => {
        if (!searchInput.contains(event.target) && !suggestionsContainer.contains(event.target)) {
            renderSuggestions([]);
        }
    });

    renderSelectedDrugs();
});