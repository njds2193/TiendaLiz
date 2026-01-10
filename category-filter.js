// Category Filter Functionality
let activeCategory = null;

function updateCategoryChips() {
    const categoryCount = {};
    window.appState.allProducts.forEach(p => {
        if (p.category) {
            categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
        }
    });

    const allCategories = Object.keys(categoryCount).sort();
    const topCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(entry => entry[0]);

    // Update dropdown
    const selectEl = document.getElementById('category-select');
    if (selectEl) {
        selectEl.innerHTML = '<option value="">-- Todas las categorias --</option>' +
            allCategories.map(cat =>
                '<option value="' + cat + '"' + (activeCategory === cat ? ' selected' : '') + '>' +
                cat + ' (' + categoryCount[cat] + ')' + '</option>'
            ).join('');
    }

    // Update chips
    const chipsContainer = document.getElementById('category-chips');
    if (chipsContainer) {
        if (topCategories.length === 0) {
            chipsContainer.innerHTML = '<span class="text-gray-400 text-sm">No hay categorias</span>';
            return;
        }
        chipsContainer.innerHTML = topCategories.map(cat =>
            '<button onclick="filterByCategory(\'' + cat.replace(/'/g, "\\'") + '\')" ' +
            'class="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition ' +
            (activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700') + '">' +
            cat + '</button>'
        ).join('');
    }
}

function filterByCategory(category) {
    if (!category || category === '') {
        clearCategoryFilter();
        return;
    }
    activeCategory = category;
    const selectEl = document.getElementById('category-select');
    if (selectEl) selectEl.value = category;
    const clearBtn = document.getElementById('clear-filter-btn');
    if (clearBtn) clearBtn.classList.remove('hidden');
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    const filtered = window.appState.allProducts.filter(p => p.category === category);
    window.ui.renderProductList(filtered, 'product-list');
    updateCategoryChips();
}

function clearCategoryFilter() {
    activeCategory = null;
    const selectEl = document.getElementById('category-select');
    if (selectEl) selectEl.value = '';
    const clearBtn = document.getElementById('clear-filter-btn');
    if (clearBtn) clearBtn.classList.add('hidden');
    window.ui.renderProductList(window.appState.allProducts, 'product-list');
    updateCategoryChips();
}

window.categoryFilter = {
    updateChips: updateCategoryChips,
    filter: filterByCategory,
    clear: clearCategoryFilter
};
