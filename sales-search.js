// sales-search.js - Bottom Search Bar with Predictive Search for Sales

(function () {
    'use strict';

    let isCategoriesPanelOpen = false;
    let currentSearchQuery = '';
    let activeCategory = null;

    // ==================== INITIALIZATION ====================
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setup);
        } else {
            setup();
        }
    }

    function setup() {
        createHTML();
        attachEvents();
        setupKeyboardHandler(); // Handle keyboard visibility on mobile
        console.log('Sales search bar initialized');
    }

    // ==================== KEYBOARD HANDLER (Mobile) ====================
    // Reposition search bar when keyboard opens/closes
    function setupKeyboardHandler() {
        const searchBar = document.getElementById('sales-search-bar');
        if (!searchBar) return;

        // Use visualViewport API for better keyboard detection
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                adjustForKeyboard(searchBar);
            });
            window.visualViewport.addEventListener('scroll', () => {
                adjustForKeyboard(searchBar);
            });
        }

        // Fallback: detect focus on input
        const searchInput = document.getElementById('sales-search-input');
        if (searchInput) {
            searchInput.addEventListener('focus', () => {
                // Small delay to let keyboard open
                setTimeout(() => adjustForKeyboard(searchBar), 100);
            });
            searchInput.addEventListener('blur', () => {
                // Reset position when keyboard closes
                setTimeout(() => {
                    searchBar.style.bottom = '56px';
                    searchBar.style.transform = '';
                }, 100);
            });
        }
    }

    function adjustForKeyboard(searchBar) {
        if (!window.visualViewport || !searchBar) return;

        const viewport = window.visualViewport;
        const layoutHeight = window.innerHeight;
        const viewportHeight = viewport.height;
        const keyboardHeight = layoutHeight - viewportHeight;

        if (keyboardHeight > 100) {
            // Keyboard is open - position search bar above it
            // The bar needs to be at the bottom of the visible viewport
            const bottomOffset = keyboardHeight + 10; // 10px padding above keyboard
            searchBar.style.bottom = `${bottomOffset}px`;
            searchBar.style.transform = 'translateZ(0)'; // Force GPU acceleration
        } else {
            // Keyboard is closed - reset to normal position
            searchBar.style.bottom = '56px';
            searchBar.style.transform = '';
        }
    }

    // ==================== CREATE HTML ====================
    function createHTML() {
        // Create the bottom search bar container
        const searchBarHTML = `
            <!-- Sales Bottom Search Bar -->
            <div id="sales-search-bar" class="fixed bottom-[56px] left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-[100] hidden">
                <div class="max-w-md mx-auto">
                    <!-- Main Search Row -->
                    <div class="flex items-center gap-2 p-2">
                        <!-- Category Toggle Button -->
                        <button id="toggle-categories-btn" 
                            class="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl flex items-center justify-center text-lg shadow-md active:scale-95 transition-transform flex-shrink-0">
                            <span id="cat-btn-icon">📁</span>
                        </button>
                        
                        <!-- Search Input -->
                        <div class="flex-1 relative">
                            <input type="text" id="sales-search-input" 
                                placeholder="🔍 Buscar producto..." 
                                class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm bg-gray-50"
                                autocomplete="off">
                            <button id="clear-sales-search" 
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 hidden text-lg">✕</button>
                        </div>
                        
                        <!-- QR Scanner Button -->
                        <button onclick="window.app.openScanner()" 
                            class="w-11 h-11 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-xl flex items-center justify-center text-lg shadow-md active:scale-95 transition-transform flex-shrink-0">
                            📷
                        </button>
                    </div>
                    
                    <!-- Predictive Search Results -->
                    <div id="sales-search-results" class="hidden border-t border-gray-100 bg-white max-h-52 overflow-y-auto">
                        <!-- Populated dynamically -->
                    </div>
                    
                    <!-- Collapsible Categories Panel -->
                    <div id="sales-categories-panel" class="hidden border-t border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
                        <div class="p-2">
                            <!-- Active Filter Indicator -->
                            <div id="sales-active-filter" class="hidden mb-2 flex items-center justify-between bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg text-sm">
                                <span id="sales-filter-text">📁 Categoría activa</span>
                                <button id="clear-category-filter" class="text-blue-600 hover:text-blue-800 font-bold">✕</button>
                            </div>
                            <!-- Category Chips -->
                            <div id="sales-categories-chips" class="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                <!-- Category chips populated dynamically -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', searchBarHTML);
        injectStyles();
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #sales-search-bar {
                box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
            }
            
            .sales-search-result {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 12px;
                cursor: pointer;
                transition: background 0.15s;
                border-bottom: 1px solid #f3f4f6;
            }
            .sales-search-result:hover, .sales-search-result:active {
                background: #eff6ff;
            }
            .sales-search-result:last-child {
                border-bottom: none;
            }
            .sales-search-result img {
                width: 44px;
                height: 44px;
                border-radius: 10px;
                object-fit: cover;
                background: #e5e7eb;
                flex-shrink: 0;
            }
            .sales-search-result .result-info {
                flex: 1;
                min-width: 0;
            }
            .sales-search-result .result-name {
                font-weight: 600;
                color: #1f2937;
                font-size: 14px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .sales-search-result .result-category {
                font-size: 12px;
                color: #6b7280;
            }
            .sales-search-result .result-price {
                font-weight: 700;
                color: #059669;
                font-size: 14px;
                flex-shrink: 0;
            }
            .sales-search-result .result-add-btn {
                width: 36px;
                height: 36px;
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                color: white;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                flex-shrink: 0;
                transition: transform 0.1s;
            }
            .sales-search-result .result-add-btn:active {
                transform: scale(0.9);
            }
            
            .sales-cat-chip {
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                background: white;
                color: #4b5563;
                cursor: pointer;
                transition: all 0.2s;
                border: 2px solid #e5e7eb;
                white-space: nowrap;
            }
            .sales-cat-chip:hover {
                border-color: #3b82f6;
                background: #eff6ff;
            }
            .sales-cat-chip.active {
                background: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }
            .sales-cat-chip.all {
                background: #f3f4f6;
                border-color: #d1d5db;
            }
            .sales-cat-chip.all.active {
                background: #6b7280;
                border-color: #6b7280;
                color: white;
            }
        `;
        document.head.appendChild(style);
    }

    // ==================== EVENT HANDLERS ====================
    function attachEvents() {
        // Search input
        const searchInput = document.getElementById('sales-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', handleSearchInput);
            searchInput.addEventListener('focus', () => {
                searchInput.select();
                if (isCategoriesPanelOpen) closeCategoriesPanel();
            });
        }

        // Clear search button
        document.getElementById('clear-sales-search')?.addEventListener('click', clearSearch);

        // Category toggle button
        document.getElementById('toggle-categories-btn')?.addEventListener('click', toggleCategoriesPanel);

        // Clear category filter
        document.getElementById('clear-category-filter')?.addEventListener('click', () => {
            filterByCategory(null);
        });

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            const searchBar = document.getElementById('sales-search-bar');
            const resultsDiv = document.getElementById('sales-search-results');
            if (searchBar && !searchBar.contains(e.target)) {
                resultsDiv?.classList.add('hidden');
            }
        });
    }

    // ==================== SEARCH ====================
    function handleSearchInput(e) {
        const query = e.target.value.trim().toLowerCase();
        currentSearchQuery = query;

        const resultsDiv = document.getElementById('sales-search-results');
        const clearBtn = document.getElementById('clear-sales-search');

        // Show/hide clear button
        if (query.length > 0) {
            clearBtn?.classList.remove('hidden');
        } else {
            clearBtn?.classList.add('hidden');
        }

        // Need at least 1 character to search
        if (query.length < 1) {
            resultsDiv?.classList.add('hidden');
            // If no query, show all products (with active category filter if any)
            if (window.sales && window.sales.renderProducts) {
                window.sales.renderProducts('');
            }
            return;
        }

        // Close categories panel when searching
        if (isCategoriesPanelOpen) closeCategoriesPanel();

        // Filter products
        let products = window.appState?.allProducts || [];

        // Apply category filter if active
        if (activeCategory) {
            products = products.filter(p => p.category === activeCategory);
        }

        // Apply search filter
        const matches = products.filter(p =>
            p.name?.toLowerCase().includes(query) ||
            p.category?.toLowerCase().includes(query)
        ).slice(0, 8);

        renderSearchResults(matches);

        // Also filter the main grid in real-time
        if (window.sales && window.sales.renderProducts) {
            window.sales.renderProducts(query);
        }
    }

    function renderSearchResults(products) {
        const resultsDiv = document.getElementById('sales-search-results');
        if (!resultsDiv) return;

        if (products.length === 0) {
            resultsDiv.innerHTML = `
                <div class="p-4 text-center text-gray-400 text-sm">
                    No se encontraron productos
                </div>
            `;
            resultsDiv.classList.remove('hidden');
            return;
        }

        resultsDiv.innerHTML = products.map(p => {
            const price = p.unit_price_sell || p.price_sell || 0;
            const imgSrc = p.image_url || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjwvc3ZnPg==';

            return `
                <div class="sales-search-result" onclick="window.salesSearch.selectProduct('${p.id}')">
                    <img src="${imgSrc}" alt="${p.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjwvc3ZnPg=='">
                    <div class="result-info">
                        <div class="result-name">${p.name}</div>
                        <div class="result-category">${p.category || 'Sin categoría'}</div>
                    </div>
                    <span class="result-price">Bs ${Number(price).toFixed(2)}</span>
                    <div class="result-add-btn">+</div>
                </div>
            `;
        }).join('');

        resultsDiv.classList.remove('hidden');
    }

    function selectProduct(productId) {
        // Add to cart
        if (window.sales && window.sales.addToCart) {
            const product = window.appState?.allProducts?.find(p => p.id === productId);
            if (product) {
                // Determine if it's a box or unit based on product type
                const isBox = product.product_type === 'paquete';
                window.sales.addToCart(productId, isBox);

                // Show brief feedback
                if (window.ui?.showToast) {
                    window.ui.showToast(`✅ ${product.name} agregado`, 'success');
                }
            }
        }

        // Clear search
        clearSearch();
    }

    function clearSearch() {
        const searchInput = document.getElementById('sales-search-input');
        const resultsDiv = document.getElementById('sales-search-results');
        const clearBtn = document.getElementById('clear-sales-search');

        if (searchInput) searchInput.value = '';
        resultsDiv?.classList.add('hidden');
        clearBtn?.classList.add('hidden');
        currentSearchQuery = '';

        // Refresh products with current category filter
        if (window.sales && window.sales.renderProducts) {
            window.sales.renderProducts('');
        }
    }

    // ==================== CATEGORIES PANEL ====================
    function toggleCategoriesPanel() {
        if (isCategoriesPanelOpen) {
            closeCategoriesPanel();
        } else {
            openCategoriesPanel();
        }
    }

    function openCategoriesPanel() {
        isCategoriesPanelOpen = true;
        const panel = document.getElementById('sales-categories-panel');
        const btn = document.getElementById('toggle-categories-btn');
        const icon = document.getElementById('cat-btn-icon');

        panel?.classList.remove('hidden');
        btn?.classList.add('ring-2', 'ring-blue-300');
        if (icon) icon.textContent = '✕';

        // Hide search results
        document.getElementById('sales-search-results')?.classList.add('hidden');

        renderCategoryChips();
    }

    function closeCategoriesPanel() {
        isCategoriesPanelOpen = false;
        const panel = document.getElementById('sales-categories-panel');
        const btn = document.getElementById('toggle-categories-btn');
        const icon = document.getElementById('cat-btn-icon');

        panel?.classList.add('hidden');
        btn?.classList.remove('ring-2', 'ring-blue-300');
        if (icon) icon.textContent = '📁';
    }

    function renderCategoryChips() {
        const container = document.getElementById('sales-categories-chips');
        if (!container || !window.appState?.allProducts) return;

        const categoryCount = {};
        window.appState.allProducts.forEach(p => {
            const cat = p.category?.trim();
            if (cat) categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });

        const categories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
        const totalProducts = window.appState.allProducts.length;

        let html = `
            <button class="sales-cat-chip all ${!activeCategory ? 'active' : ''}" 
                onclick="window.salesSearch.filterByCategory(null)">
                📦 Todos (${totalProducts})
            </button>
        `;

        categories.forEach(([cat, count]) => {
            html += `
                <button class="sales-cat-chip ${activeCategory === cat ? 'active' : ''}" 
                    onclick="window.salesSearch.filterByCategory('${cat.replace(/'/g, "\\'")}')">
                    ${cat} (${count})
                </button>
            `;
        });

        container.innerHTML = html;
    }

    function filterByCategory(category) {
        activeCategory = category;

        // Update UI
        renderCategoryChips();
        updateFilterIndicator();

        // Close panel after selection
        closeCategoriesPanel();

        // Update sales module category
        if (window.sales && window.sales.selectCategory) {
            window.sales.selectCategory(category);
        }

        // Clear search
        clearSearch();
    }

    function updateFilterIndicator() {
        const filterDiv = document.getElementById('sales-active-filter');
        const filterText = document.getElementById('sales-filter-text');
        const catBtn = document.getElementById('toggle-categories-btn');

        if (activeCategory) {
            filterDiv?.classList.remove('hidden');
            if (filterText) filterText.textContent = `📁 ${activeCategory}`;
            catBtn?.classList.add('ring-2', 'ring-orange-400');
        } else {
            filterDiv?.classList.add('hidden');
            catBtn?.classList.remove('ring-2', 'ring-orange-400');
        }
    }

    // ==================== VISIBILITY ====================
    function show() {
        const bar = document.getElementById('sales-search-bar');
        if (bar) {
            bar.classList.remove('hidden');
            renderCategoryChips();
            updateFilterIndicator();
        }
    }

    function hide() {
        const bar = document.getElementById('sales-search-bar');
        if (bar) {
            bar.classList.add('hidden');
            closeCategoriesPanel();
            clearSearch();
        }
    }

    // ==================== EXPORT ====================
    window.salesSearch = {
        init,
        show,
        hide,
        selectProduct,
        filterByCategory,
        clearSearch,
        renderCategoryChips,
        // New: expose filter state for realtime-sync
        hasActiveFilter: () => currentSearchQuery.length > 0 || activeCategory !== null,
        getCurrentQuery: () => currentSearchQuery,
        getActiveCategory: () => activeCategory
    };

    init();
})();
