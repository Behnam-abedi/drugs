/**
 * Negin Drug Search Application (v7.4 - Final Robust AI Parser)
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
        const proxyUrl = `/api/autocomplete?s=${encodeURIComponent(query)}`;
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
        const proxyUrl = `/api/check-interactions?drug_list=${drugListParam}`;
        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.text();
        } catch (error) {
            console.error("CRITICAL: Interaction check failed.", error);
            return `<p class="text-red-400">Error: Could not connect to the backend server. Details: ${error.message}</p>`;
        }
    };
    
    // *** تابع آپدیت شده و ضد خطا برای پارس کردن JSON از n8n ***
    const getAISummary = async (reportText) => {
        try {
            const response = await fetch('/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportText: reportText }),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Summary API Error: ${errorData}`);
            }

            const n8nResponse = await response.json();
            
            let jsonString;
            // هوشمندانه چک می‌کنیم که پاسخ آرایه است یا آبجکت
            if (Array.isArray(n8nResponse) && n8nResponse[0]?.content?.parts?.[0]?.text) {
                jsonString = n8nResponse[0].content.parts[0].text;
            } else if (n8nResponse.content?.parts?.[0]?.text) { // اگر آبجکت بود
                jsonString = n8nResponse.content.parts[0].text;
            } else {
                throw new Error("Unexpected JSON structure from n8n.");
            }
            
            // در نهایت، رشته را به یک آبجکت JSON واقعی تبدیل می‌کنیم
            return JSON.parse(jsonString);

        } catch (error) {
            console.error("AI Summary fetch/parse problem:", error);
            return null;
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
        // ... این بخش بدون تغییر است
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
        // ... این بخش بدون تغییر است
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
    
    // تابع برای نمایش حالت انتظار AI
    const showAILoadingState = () => {
        resultsContent.innerHTML = `
            <div class="flex flex-col items-center justify-center text-center text-gray-400 h-full">
                <div class="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p class="text-lg font-semibold">AI is analyzing the report...</p>
                <p class="text-sm">This may take a few moments.</p>
            </div>
        `;
        resultsModal.classList.remove('hidden');
    };

    // تابع نمایش نتیجه نهایی (جدول)
    const renderInteractionResults = (summaryJson) => {
        resultsContent.innerHTML = ''; 

        if (!summaryJson) {
            resultsContent.innerHTML = `<p class="text-red-400">An error occurred while generating the AI summary. Please check the browser console for details.</p>`;
            return;
        }

        const severityColors = {
            "Major": "bg-red-600",
            "Moderate": "bg-orange-500",
            "Minor": "bg-yellow-500",
            "None": "bg-green-500"
        };
        const severityColor = severityColors[summaryJson.highest_severity_level] || "bg-gray-500";
        
        const tableHtml = `
            <div class="space-y-4 text-gray-200">
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-bold text-teal-400 mb-2">Clinical Summary</h3>
                    <p>${summaryJson.clinical_summary || "N/A"}</p>
                </div>

                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-bold text-teal-400 mb-2">Pharmacist Recommendation</h3>
                    <p class="font-mono text-lg">${summaryJson.pharmacist_recommendation || "N/A"}</p>
                </div>
                
                <table class="w-full text-left table-auto border-collapse">
                    <tbody>
                        <tr class="border-b border-gray-600">
                            <td class="py-3 px-4 font-semibold text-gray-400 w-1/3">Overall Interaction</td>
                            <td class="py-3 px-4">${summaryJson.overall_interaction === 'Yes' ? 'Yes, interactions found' : 'No significant interactions'}</td>
                        </tr>
                        <tr class="border-b border-gray-600">
                            <td class="py-3 px-4 font-semibold text-gray-400">Highest Severity</td>
                            <td class="py-3 px-4">
                                <span class="px-3 py-1 text-sm font-bold text-white rounded-full ${severityColor}">
                                    ${summaryJson.highest_severity_level || "N/A"}
                                </span>
                            </td>
                        </tr>
                        <tr class="border-b border-gray-600">
                            <td class="py-3 px-4 font-semibold text-gray-400">Affected Drugs</td>
                            <td class="py-3 px-4">${(summaryJson.affected_drugs || []).join(', ') || "N/A"}</td>
                        </tr>
                        <tr>
                            <td class="py-3 px-4 font-semibold text-gray-400">Interaction Types</td>
                            <td class="py-3 px-4">${(summaryJson.interaction_types || []).join(', ') || "N/A"}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        resultsContent.innerHTML = tableHtml;
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
        if(submitButton.disabled) return;

        submitButtonText.textContent = 'Checking...';
        submitSpinner.classList.remove('hidden');
        submitButton.disabled = true;

        const drugListParam = state.selectedDrugs.map(drug => `${drug.ddc_id}-${drug.brand_name_id}`).join(',');
        const rawHtml = await fetchInteractionData(drugListParam);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");
        const mainContent = doc.querySelector("#content");
        
        if (!mainContent) {
            resultsContent.innerHTML = `<p class="text-red-400">Error: Could not find the main content in the report.</p>`;
            resultsModal.classList.remove('hidden');
            submitButtonText.textContent = 'Check Interactions';
            submitSpinner.classList.add('hidden');
            updateSubmitButtonState();
            return;
        }
        
        const cleanText = mainContent.innerText;
        
        submitButtonText.textContent = 'Analyzing with AI...';
        
        showAILoadingState();

        const summaryJson = await getAISummary(cleanText);

        renderInteractionResults(summaryJson);
        
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
        resultsContent.innerHTML = '';
    });

    renderSelectedDrugs();
});