/**
 * Negin Drug Search Application (v5.0 - Final Clean Render Version)
 */

window.onload = () => {
    const preloader = document.getElementById('preloader');
    setTimeout(() => {
        if (preloader) {
            preloader.classList.add('preloader-hidden');
        }
        const elementsToAnimate = document.querySelectorAll('.animate-on-load');
        elementsToAnimate.forEach((element, index) => {
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }, 500);
};

document.addEventListener('DOMContentLoaded', () => {

    const searchInput = document.getElementById('search-input');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const selectedDrugsList = document.getElementById('selected-drugs-list');
    const noSelectionPlaceholder = document.getElementById('no-selection-placeholder');
    const loadingIndicator = document.getElementById('loading-indicator');
    const clearSearchButton = document.getElementById('clear-search-button');
    const submitButton = document.getElementById('submit-button');
    const submitButtonText = document.getElementById('submit-button-text');
    const submitSpinner = document.getElementById('submit-spinner');
    const resultsModal = document.getElementById('results-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const resultsContent = document.getElementById('results-content');
    
    let state = { selectedDrugs: [] };

    const fetchFromApi = async (query) => {
        const proxyUrl = `http://localhost:3000/api/autocomplete?s=${encodeURIComponent(query)}`;
        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            if (data.categories && data.categories.length > 0) {
                return data.categories[0].results || [];
            }
            return [];
        } catch (error) {
            console.error("Autocomplete fetch problem:", error);
            return [];
        }
    };

    const fetchInteractionData = async (drugListParam) => {
        const proxyUrl = `http://localhost:3000/api/check-interactions?drug_list=${drugListParam}`;
        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.text();
        } catch (error) {
            console.error("CRITICAL: Interaction check failed.", error);
            return `<p class="text-red-400">Error: Could not connect to the backend server. Is it running? Details: ${error.message}</p>`;
        }
    };

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

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
        updateSubmitButtonState();
    };

    const updateSubmitButtonState = () => {
        submitButton.disabled = state.selectedDrugs.length < 2;
    };
    
    // *** راه‌حل نهایی با منطق هوشمندانه شما ***
    const renderInteractionResults = (htmlContent) => {
        const startComment = 'Content start';
        const endComment = 'Content end';

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT, null, false);
        
        let isInside = false;
        let contentFragment = document.createDocumentFragment();

        let currentNode = walker.nextNode();
        while (currentNode) {
            if (currentNode.nodeValue.trim() === startComment) {
                isInside = true;
                // حرکت به نود بعدی برای شروع جمع‌آوری
                let nextNode = currentNode.nextSibling; 
                while(nextNode) {
                    if (nextNode.nodeType === Node.COMMENT_NODE && nextNode.nodeValue.trim() === endComment) {
                        isInside = false;
                        break;
                    }
                    // کلون کردن نود برای جلوگیری از مشکلات مالکیت
                    contentFragment.appendChild(nextNode.cloneNode(true));
                    nextNode = nextNode.nextSibling;
                }
                break; // از حلقه اصلی خارج می‌شویم چون کارمان تمام است
            }
            currentNode = walker.nextNode();
        }

        resultsContent.innerHTML = ''; // پاک کردن محتوای قبلی
        resultsContent.appendChild(contentFragment);
        resultsModal.classList.remove('hidden');
    };

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
        clearSearchButton.classList.toggle('hidden', query.length === 0);

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
    
    const handleSubmit = async (event) => {
        event.preventDefault(); 
        
        submitButtonText.textContent = 'Checking...';
        submitSpinner.classList.remove('hidden');
        submitButton.disabled = true;

        const drugListParam = state.selectedDrugs
            .map(drug => `${drug.ddc_id}-${drug.brand_name_id}`)
            .join(',');

        const resultHtml = await fetchInteractionData(drugListParam);
        
        renderInteractionResults(resultHtml);
        
        submitButtonText.textContent = 'Check Interactions';
        submitSpinner.classList.add('hidden');
        updateSubmitButtonState();
    };

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
    
    submitButton.addEventListener('click', handleSubmit);
    
    closeModalButton.addEventListener('click', () => {
        resultsModal.classList.add('hidden');
        resultsContent.innerHTML = ''; // خالی کردن محتوا هنگام بستن
    });

    renderSelectedDrugs();
});