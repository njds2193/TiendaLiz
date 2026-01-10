// filter-menu.js - Floating Filter Button with Vertical Panel

(function () {
    'use strict';

    let isPanelOpen = false;
    let isCategoriesPanelOpen = false;
    let activeCategory = null;
    let searchFilterActive = false; // Track when single product is shown from search
    let searchFilterProductName = '';

    // Draggable state
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let fabStartX = 0;
    let fabStartY = 0;
    let hasMoved = false;
    let dragTimeout = null;

    const POSITION_KEY = 'filter-fab-position';

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
        setupDrag();
        restorePosition();
        console.log('Filter menu initialized');
    }

    // ==================== CREATE HTML ====================
    function createHTML() {
        const html = `
            <!-- Filter FAB Container -->
            <div id="filter-fab-container" class="fixed z-[45] hidden" style="left: 16px; bottom: 100px;">
                
                <!-- Main Panel (appears above/below FAB) -->
                <div id="filter-panel" class="absolute bottom-16 left-0 bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 overflow-hidden transform scale-95 opacity-0 pointer-events-none transition-all duration-200 origin-bottom-left">
                    
                    <!-- Search Section -->
                    <div class="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                        <div class="relative">
                            <input type="text" id="filter-search-input" 
                                placeholder="🔍 Buscar producto..." 
                                class="w-full pl-4 pr-10 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm bg-white"
                                autocomplete="off">
                            <button id="clear-search-btn" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 hidden">✕</button>
                        </div>
                        <div id="search-results" class="mt-2 max-h-40 overflow-y-auto hidden bg-white rounded-lg border"></div>
                    </div>
                    
                    <!-- Actions Section -->
                    <div class="p-2 space-y-1">
                        <button id="btn-all-categories" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-left">
                            <span class="text-xl">📂</span>
                            <span class="font-medium text-gray-700">Ver todas las categorías</span>
                        </button>
                        <button id="btn-export-pdf" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-purple-50 transition-colors text-left">
                            <span class="text-xl">📄</span>
                            <span class="font-medium text-gray-700">Exportar PDF</span>
                        </button>
                    </div>
                    
                    <!-- Quick Categories -->
                    <div class="p-3 bg-gray-50 border-t">
                        <div class="text-xs text-gray-500 mb-2">Top categorías:</div>
                        <div id="quick-categories" class="flex flex-wrap gap-2">
                            <!-- Populated dynamically -->
                        </div>
                    </div>
                    
                    <!-- Active Filter Indicator -->
                    <div id="active-filter-bar" class="hidden px-3 py-2 bg-blue-500 text-white text-sm flex items-center justify-between">
                        <span id="active-filter-text">Filtro activo: </span>
                        <button id="btn-clear-filter" class="px-2 py-0.5 bg-white/20 rounded hover:bg-white/30 text-xs">✕ Limpiar</button>
                    </div>
                </div>
                
                <!-- FAB Button with Badge -->
                <div id="filter-fab-wrapper" class="relative">
                    <button id="filter-fab" class="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg flex items-center justify-center text-2xl transition-all duration-200 hover:scale-105 active:scale-95 border-2 border-white/30">
                        <span id="fab-icon-open">⚙️</span>
                        <span id="fab-icon-close" class="hidden">✕</span>
                    </button>
                    <!-- Filter Badge (shows filter name when active) -->
                    <div id="fab-filter-badge" class="hidden absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full bg-blue-600 text-white text-xs font-bold pl-2 pr-1 py-1 rounded-lg shadow-md whitespace-nowrap max-w-[140px] flex items-center gap-1">
                        <span id="fab-badge-text" class="truncate">filtro</span>
                        <button id="badge-clear-btn" class="ml-1 w-5 h-5 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-[10px] transition-colors">✕</button>
                    </div>
                </div>
            </div>
            
            <!-- Full Categories Panel (slides up from bottom) -->
            <div id="full-categories-panel" class="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-[50] transform translate-y-full transition-transform duration-300" style="max-height: 70vh;">
                <div class="max-w-md mx-auto">
                    <div class="flex justify-between items-center p-4 border-b sticky top-0 bg-white rounded-t-3xl">
                        <h3 class="text-lg font-bold text-gray-800">📂 Categorías</h3>
                        <div class="flex items-center gap-2">
                            <button id="open-category-manager" class="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-1">⚙️ Gestionar</button>
                            <button id="close-categories-panel" class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl hover:bg-gray-200">✕</button>
                        </div>
                    </div>
                    <div class="p-3 border-b bg-gray-50">
                        <input type="text" id="category-filter-input" placeholder="Buscar categoría..." 
                            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" autocomplete="off">
                    </div>
                    <div id="categories-list" class="p-3 pb-24 overflow-y-auto" style="max-height: calc(70vh - 130px);"></div>
                </div>
            </div>
            
            <!-- Overlay for categories panel -->
            <div id="categories-overlay" class="fixed inset-0 bg-black/30 z-[49] hidden"></div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        injectStyles();
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #filter-fab-container { touch-action: none; }
            #filter-fab { cursor: grab; user-select: none; }
            #filter-fab.dragging { cursor: grabbing; opacity: 0.8; transform: scale(1.1); }
            #filter-fab.has-filter {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            }
            #filter-panel.open { opacity: 1; transform: scale(1); pointer-events: auto; }
            
            #fab-filter-badge {
                animation: badge-pop 0.2s ease-out;
            }
            @keyframes badge-pop {
                0% { transform: translate(-50%, -100%) scale(0.8); opacity: 0; }
                100% { transform: translate(-50%, -100%) scale(1); opacity: 1; }
            }
            
            .category-chip {
                padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
                background: #f3f4f6; color: #4b5563; cursor: pointer;
                transition: all 0.2s; border: 2px solid transparent;
            }
            .category-chip:hover { background: #e5e7eb; }
            .category-chip.active { background: #3b82f6; color: white; border-color: #3b82f6; }
            
            .category-list-item {
                display: flex; align-items: center; justify-content: space-between;
                padding: 12px 16px; border-radius: 12px; cursor: pointer;
                transition: all 0.2s; margin-bottom: 8px; background: #f9fafb;
            }
            .category-list-item:hover { background: #eff6ff; }
            .category-list-item.active { background: #3b82f6; color: white; }
            .category-list-item.active .cat-count { background: rgba(255,255,255,0.2); color: white; }
            .cat-count { background: #e5e7eb; color: #6b7280; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: bold; }
            
            .search-result-item {
                display: flex; align-items: center; gap: 10px; padding: 8px;
                cursor: pointer; transition: background 0.2s; border-bottom: 1px solid #f3f4f6;
            }
            .search-result-item:hover { background: #f9fafb; }
            .search-result-item:last-child { border-bottom: none; }
            .search-result-img { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; background: #e5e7eb; }
        `;
        document.head.appendChild(style);
    }

    // ==================== EVENT HANDLERS ====================
    function attachEvents() {
        // Panel toggle removed from fab - handled in drag end
        document.getElementById('btn-all-categories')?.addEventListener('click', () => { closePanel(); openCategoriesPanel(); });
        document.getElementById('btn-export-pdf')?.addEventListener('click', () => { closePanel(); if (window.pdfExport) window.pdfExport.openExportModal(); });
        document.getElementById('btn-clear-filter')?.addEventListener('click', clearFilter);

        // Badge clear button (X on the badge)
        document.getElementById('badge-clear-btn')?.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering FAB click
            clearFilter();
        });

        // Search
        const searchInput = document.getElementById('filter-search-input');
        searchInput?.addEventListener('input', handleSearch);
        searchInput?.addEventListener('focus', () => { searchInput.select(); });
        document.getElementById('clear-search-btn')?.addEventListener('click', clearSearch);

        // Categories panel
        document.getElementById('close-categories-panel')?.addEventListener('click', closeCategoriesPanel);
        document.getElementById('categories-overlay')?.addEventListener('click', closeCategoriesPanel);
        document.getElementById('category-filter-input')?.addEventListener('input', (e) => renderCategoriesList(e.target.value));

        // Category manager
        document.getElementById('open-category-manager')?.addEventListener('click', () => {
            if (window.categoryManager) window.categoryManager.open();
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (isCategoriesPanelOpen) closeCategoriesPanel();
                else if (isPanelOpen) closePanel();
            }
        });
    }

    // ==================== DRAG FUNCTIONALITY ====================
    function setupDrag() {
        const fab = document.getElementById('filter-fab');
        if (!fab) return;

        fab.addEventListener('touchstart', dragStart, { passive: false });
        fab.addEventListener('mousedown', dragStart);
        document.addEventListener('touchmove', dragMove, { passive: false });
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('touchend', dragEnd);
        document.addEventListener('mouseup', dragEnd);
    }

    function dragStart(e) {
        const container = document.getElementById('filter-fab-container');
        if (!container) return;

        isDragging = true;
        hasMoved = false;

        const touch = e.touches ? e.touches[0] : e;
        dragStartX = touch.clientX;
        dragStartY = touch.clientY;

        const rect = container.getBoundingClientRect();
        fabStartX = rect.left;
        fabStartY = rect.top;

        document.getElementById('filter-fab')?.classList.add('dragging');
        e.preventDefault();
    }

    function dragMove(e) {
        if (!isDragging) return;

        const touch = e.touches ? e.touches[0] : e;
        const deltaX = touch.clientX - dragStartX;
        const deltaY = touch.clientY - dragStartY;

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            hasMoved = true;
            if (isPanelOpen) closePanel(); // Close panel while dragging
        }

        let newX = fabStartX + deltaX;
        let newY = fabStartY + deltaY;

        // Constrain to viewport
        const size = 56;
        const pad = 8;
        newX = Math.max(pad, Math.min(window.innerWidth - size - pad, newX));
        newY = Math.max(pad, Math.min(window.innerHeight - size - pad, newY));

        const container = document.getElementById('filter-fab-container');
        if (container) {
            container.style.left = `${newX}px`;
            container.style.top = `${newY}px`;
            container.style.bottom = 'auto';
        }

        e.preventDefault();
    }

    function dragEnd() {
        if (!isDragging) return;

        isDragging = false;
        document.getElementById('filter-fab')?.classList.remove('dragging');
        snapToEdge();
        savePosition();

        // If didn't move, toggle panel
        if (!hasMoved) {
            togglePanel();
        }
    }

    function snapToEdge() {
        const container = document.getElementById('filter-fab-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const centerX = rect.left + 28;
        const screenCenter = window.innerWidth / 2;
        const padding = 16;

        const newX = centerX < screenCenter ? padding : window.innerWidth - 56 - padding;

        container.style.transition = 'left 0.2s ease';
        container.style.left = `${newX}px`;

        // Update panel position based on new FAB position
        updatePanelPosition();

        setTimeout(() => { container.style.transition = ''; }, 200);
    }

    function savePosition() {
        const container = document.getElementById('filter-fab-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        localStorage.setItem(POSITION_KEY, JSON.stringify({ left: rect.left, top: rect.top }));
    }

    function restorePosition() {
        const container = document.getElementById('filter-fab-container');
        if (!container) return;

        const saved = localStorage.getItem(POSITION_KEY);
        if (saved) {
            try {
                const pos = JSON.parse(saved);
                container.style.left = `${pos.left}px`;
                container.style.top = `${pos.top}px`;
                container.style.bottom = 'auto';
            } catch (e) { }
        }
        updatePanelPosition();
    }

    // ==================== PANEL TOGGLE ====================
    function togglePanel() {
        if (isPanelOpen) closePanel();
        else openPanel();
    }

    function openPanel() {
        isPanelOpen = true;
        updatePanelPosition();
        updateQuickCategories();

        const panel = document.getElementById('filter-panel');
        const fabIconOpen = document.getElementById('fab-icon-open');
        const fabIconClose = document.getElementById('fab-icon-close');

        panel?.classList.add('open');
        fabIconOpen?.classList.add('hidden');
        fabIconClose?.classList.remove('hidden');
    }

    function closePanel() {
        isPanelOpen = false;

        const panel = document.getElementById('filter-panel');
        const fabIconOpen = document.getElementById('fab-icon-open');
        const fabIconClose = document.getElementById('fab-icon-close');

        panel?.classList.remove('open');
        fabIconOpen?.classList.remove('hidden');
        fabIconClose?.classList.add('hidden');

        clearSearch();
    }

    function updatePanelPosition() {
        const container = document.getElementById('filter-fab-container');
        const panel = document.getElementById('filter-panel');
        if (!container || !panel) return;

        const rect = container.getBoundingClientRect();
        const isNearBottom = rect.top > window.innerHeight / 2;
        const isOnLeft = rect.left < window.innerWidth / 2;

        // Position panel above or below FAB
        if (isNearBottom) {
            panel.style.bottom = '64px';
            panel.style.top = 'auto';
            panel.classList.remove('origin-top-left', 'origin-top-right');
            panel.classList.add(isOnLeft ? 'origin-bottom-left' : 'origin-bottom-right');
        } else {
            panel.style.top = '64px';
            panel.style.bottom = 'auto';
            panel.classList.remove('origin-bottom-left', 'origin-bottom-right');
            panel.classList.add(isOnLeft ? 'origin-top-left' : 'origin-top-right');
        }

        // Position panel left or right
        if (isOnLeft) {
            panel.style.left = '0';
            panel.style.right = 'auto';
        } else {
            panel.style.left = 'auto';
            panel.style.right = '0';
        }
    }

    // ==================== SEARCH ====================
    function handleSearch(e) {
        const query = e.target.value.toLowerCase().trim();
        const resultsDiv = document.getElementById('search-results');
        const clearBtn = document.getElementById('clear-search-btn');

        if (query.length > 0) {
            clearBtn?.classList.remove('hidden');
        } else {
            clearBtn?.classList.add('hidden');
        }

        if (query.length < 2) {
            resultsDiv?.classList.add('hidden');
            return;
        }

        const products = window.appState?.allProducts || [];
        const matches = products.filter(p =>
            p.name?.toLowerCase().includes(query) || p.category?.toLowerCase().includes(query)
        ).slice(0, 6);

        if (matches.length === 0) {
            resultsDiv.innerHTML = '<p class="text-center text-gray-400 py-3 text-sm">No se encontraron productos</p>';
        } else {
            resultsDiv.innerHTML = matches.map(p => `
                <div class="search-result-item" onclick="window.filterMenu.selectProduct('${p.id}')">
                    <img src="${p.image_url || ''}" class="search-result-img" onerror="this.style.display='none'">
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-800 text-sm truncate">${p.name}</p>
                        <p class="text-xs text-gray-500">${p.category || 'Sin categoría'}</p>
                    </div>
                    <span class="text-green-600 font-bold text-sm">Bs ${(p.unit_price_sell || p.price_sell || 0).toFixed(2)}</span>
                </div>
            `).join('');
        }
        resultsDiv?.classList.remove('hidden');
    }

    function selectProduct(productId) {
        closePanel();
        const product = window.appState?.allProducts?.find(p => p.id === productId);
        if (product && window.ui) {
            window.ui.renderProductList([product], 'product-list');
            searchFilterActive = true;
            searchFilterProductName = product.name;
            activeCategory = null; // Clear category filter
            updateFilterIndicator();
        }
    }

    function showAllProducts() {
        searchFilterActive = false;
        searchFilterProductName = '';
        activeCategory = null;

        if (window.ui && window.appState?.allProducts) {
            window.ui.renderProductList(window.appState.allProducts, 'product-list');
        }

        updateFilterIndicator();
        updateQuickCategories();
        if (window.ui?.showToast) window.ui.showToast('Mostrando todos los productos', 'success');
    }

    function clearSearch() {
        const input = document.getElementById('filter-search-input');
        const results = document.getElementById('search-results');
        const clearBtn = document.getElementById('clear-search-btn');

        if (input) input.value = '';
        results?.classList.add('hidden');
        clearBtn?.classList.add('hidden');
    }

    // ==================== QUICK CATEGORIES ====================
    function updateQuickCategories() {
        const container = document.getElementById('quick-categories');
        if (!container || !window.appState?.allProducts) return;

        const categoryCount = {};
        window.appState.allProducts.forEach(p => {
            const cat = p.category?.trim();
            if (cat) categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });

        const topCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

        if (topCategories.length === 0) {
            container.innerHTML = '<span class="text-gray-400 text-sm">No hay categorías</span>';
            return;
        }

        container.innerHTML = topCategories.map(([cat, count]) => `
            <button class="category-chip ${activeCategory === cat ? 'active' : ''}" onclick="window.filterMenu.filterByCategory('${cat.replace(/'/g, "\\'")}')">
                ${cat} (${count})
            </button>
        `).join('');

        // Update filter indicator
        updateFilterIndicator();
    }

    function updateFilterIndicator() {
        const bar = document.getElementById('active-filter-bar');
        const text = document.getElementById('active-filter-text');
        const fab = document.getElementById('filter-fab');

        // Badge elements (shows filter name on FAB)
        const badge = document.getElementById('fab-filter-badge');
        const badgeText = document.getElementById('fab-badge-text');

        if (searchFilterActive) {
            // Search filter active
            bar?.classList.remove('hidden');
            if (text) text.textContent = `Buscando: ${searchFilterProductName}`;
            fab?.classList.add('has-filter');

            // Show badge with product name
            badge?.classList.remove('hidden');
            if (badgeText) badgeText.textContent = searchFilterProductName.substring(0, 12);

        } else if (activeCategory) {
            // Category filter active
            bar?.classList.remove('hidden');
            if (text) text.textContent = `Filtro: ${activeCategory}`;
            fab?.classList.add('has-filter');

            // Show badge with category name
            badge?.classList.remove('hidden');
            if (badgeText) badgeText.textContent = activeCategory.substring(0, 12);

        } else {
            // No filter active
            bar?.classList.add('hidden');
            fab?.classList.remove('has-filter');
            badge?.classList.add('hidden');
        }
    }

    // ==================== FULL CATEGORIES PANEL ====================
    function openCategoriesPanel() {
        isCategoriesPanelOpen = true;
        document.getElementById('full-categories-panel')?.classList.remove('translate-y-full');
        document.getElementById('categories-overlay')?.classList.remove('hidden');
        renderCategoriesList();
    }

    function closeCategoriesPanel() {
        isCategoriesPanelOpen = false;
        document.getElementById('full-categories-panel')?.classList.add('translate-y-full');
        document.getElementById('categories-overlay')?.classList.add('hidden');
        const input = document.getElementById('category-filter-input');
        if (input) input.value = '';
    }

    function renderCategoriesList(filterQuery = '') {
        const container = document.getElementById('categories-list');
        if (!container || !window.appState?.allProducts) return;

        const categoryCount = {};
        window.appState.allProducts.forEach(p => {
            const cat = p.category?.trim();
            if (cat) categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });

        let categories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
        if (filterQuery) {
            categories = categories.filter(([cat]) => cat.toLowerCase().includes(filterQuery.toLowerCase()));
        }

        const total = window.appState.allProducts.length;

        let html = `
            <div class="category-list-item ${!activeCategory ? 'active' : ''}" onclick="window.filterMenu.filterByCategory('')">
                <span>🏠 Todas las categorías</span>
                <span class="cat-count">${total}</span>
            </div>
        `;

        categories.forEach(([cat, count]) => {
            html += `
                <div class="category-list-item ${activeCategory === cat ? 'active' : ''}" onclick="window.filterMenu.filterByCategory('${cat.replace(/'/g, "\\'")}')">
                    <span>🏷️ ${cat}</span>
                    <span class="cat-count">${count}</span>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // ==================== FILTER ====================
    function filterByCategory(category) {
        closeCategoriesPanel();
        closePanel();

        if (!category) {
            clearFilter();
            return;
        }

        activeCategory = category;

        if (window.categoryFilter?.filter) {
            window.categoryFilter.filter(category);
        } else {
            const filtered = window.appState?.allProducts?.filter(p => p.category?.trim() === category) || [];
            if (window.ui) window.ui.renderProductList(filtered, 'product-list');
        }

        updateFilterIndicator();
    }

    function clearFilter() {
        activeCategory = null;
        searchFilterActive = false;
        searchFilterProductName = '';

        if (window.categoryFilter?.clear) {
            window.categoryFilter.clear();
        } else if (window.ui && window.appState?.allProducts) {
            window.ui.renderProductList(window.appState.allProducts, 'product-list');
        }

        updateFilterIndicator();
        updateQuickCategories();
    }

    // ==================== VISIBILITY ====================
    function show() {
        document.getElementById('filter-fab-container')?.classList.remove('hidden');
        restorePosition();
    }

    function hide() {
        closePanel();
        closeCategoriesPanel();
        document.getElementById('filter-fab-container')?.classList.add('hidden');
    }

    // ==================== EXPORT ====================
    window.filterMenu = {
        init,
        show,
        hide,
        filterByCategory,
        clearFilter,
        selectProduct,
        showAllProducts,
        updateCategories: updateQuickCategories
    };

    init();
})();
