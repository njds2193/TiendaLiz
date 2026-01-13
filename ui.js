// ui.js - UI Helper Module

// --- TOAST ---
function showToast(message, type = 'success') {
    let background;

    switch (type) {
        case 'success':
            background = 'linear-gradient(to right, #00b09b, #96c93d)';
            break;
        case 'warning':
            background = 'linear-gradient(to right, #f7971e, #ffd200)';
            break;
        case 'error':
        default:
            background = 'linear-gradient(to right, #ff5f6d, #ffc371)';
            break;
    }

    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "center",
        style: { background }
    }).showToast();
}

// --- TAB SWITCHING ---
// List of modal IDs that should be checked before switching tabs
const modalIds = [
    'product-modal',
    'history-modal',
    'add-history-modal',
    'clear-history-modal',
    'sale-modal',
    'qr-modal',
    'batch-modal',
    'category-manager-modal',
    'restock-modal'
];

function hasOpenModals() {
    return modalIds.some(id => {
        const modal = document.getElementById(id);
        return modal && !modal.classList.contains('hidden');
    });
}

function closeAllModals() {
    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('hidden');
    });
}

function switchTab(tabName, forceSwitch = false) {
    // Check if there are open modals
    if (!forceSwitch && hasOpenModals()) {
        if (confirm('¿Deseas cerrar la ventana abierta y cambiar de sección?')) {
            closeAllModals();
        } else {
            return false; // Don't switch if user cancels
        }
    }

    window.appState.currentTab = tabName;

    // Hide all content
    document.getElementById('content-inventario').classList.add('hidden');
    document.getElementById('content-ventas').classList.add('hidden');
    document.getElementById('content-reportes').classList.add('hidden');

    // Keep old filter section hidden (replaced by floating menu)
    const oldFilterSection = document.getElementById('category-filter-section');
    if (oldFilterSection) oldFilterSection.classList.add('hidden');

    // Hide FABs by default
    const fabBtn = document.getElementById('fab-btn');
    const cartFab = document.getElementById('cart-fab');
    if (fabBtn) fabBtn.classList.add('hidden');
    if (cartFab) cartFab.classList.add('hidden');

    // Hide filter menu by default
    if (window.filterMenu) window.filterMenu.hide();

    // Reset tab styles
    ['inventario', 'ventas', 'reportes'].forEach(t => {
        const tabEl = document.getElementById('tab-' + t);
        if (tabEl) tabEl.className = 'flex-1 py-2 rounded-lg text-sm font-bold transition-all text-blue-100 hover:bg-white/10';
    });

    // Activate current tab
    const activeTabEl = document.getElementById('tab-' + tabName);
    if (activeTabEl) activeTabEl.className = 'flex-1 py-2 rounded-lg text-sm font-bold transition-all bg-white text-blue-600 shadow-sm';

    document.getElementById('content-' + tabName).classList.remove('hidden');

    // Specific tab logic
    if (tabName === 'inventario') {
        // Show floating filter menu
        if (window.filterMenu) {
            window.filterMenu.show();
            window.filterMenu.updateCategories();
        }
        if (fabBtn) fabBtn.classList.remove('hidden');
    } else if (tabName === 'ventas') {
        if (cartFab) cartFab.classList.remove('hidden');
        if (window.sales) {
            window.sales.loadCategories();
            window.sales.renderProducts();
        }
    } else if (tabName === 'reportes') {
        if (window.reports) {
            window.reports.load();
        }
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
}

// --- MODALS ---
function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// --- RENDER HELPERS ---
function renderProductList(products, containerId = 'product-list') {
    const list = document.getElementById(containerId);
    if (!list) return;

    if (!products || products.length === 0) {
        list.innerHTML = '<div class="text-center text-gray-500 mt-10">No hay productos</div>';
        return;
    }

    list.innerHTML = products.map(p => {
        let stockDisplay = '';
        if (p.product_type === 'ambos' && p.units_per_package > 1) {
            const boxes = Math.floor((p.quantity || 0) / p.units_per_package);
            const units = (p.quantity || 0) % p.units_per_package;
            stockDisplay = `${boxes} Cajas + ${units} Unid.`;
        } else if (p.product_type === 'paquete') {
            stockDisplay = (p.quantity || 0) + ' Paquetes';
        } else {
            stockDisplay = (p.quantity || 0) + ' Unidades';
        }

        let priceDisplay = '';
        if (p.product_type === 'ambos') {
            priceDisplay = '<div class="flex flex-col gap-1 bg-gradient-to-r from-green-50 to-blue-50 p-2 rounded-lg border border-gray-100">' +
                '<div class="flex items-center gap-1.5">' +
                '<span class="text-xs text-gray-500">📦</span>' +
                '<span class="text-green-700 font-bold text-sm">Bs ' + Number(p.price_sell || 0).toFixed(2) + '</span>' +
                '</div>' +
                '<div class="flex items-center gap-1.5">' +
                '<span class="text-xs text-gray-500">🔢</span>' +
                '<span class="text-blue-700 font-semibold text-sm">Bs ' + Number(p.unit_price_sell || 0).toFixed(2) + '</span>' +
                '</div>' +
                '</div>';
        } else if (p.product_type === 'paquete') {
            priceDisplay = '<div class="bg-green-50 px-2 py-1 rounded-lg border border-green-100">' +
                '<span class="text-xs text-gray-500 mr-1">📦</span>' +
                '<span class="text-green-700 font-bold">Bs ' + Number(p.price_sell || 0).toFixed(2) + '</span>' +
                '</div>';
        } else {
            priceDisplay = '<div class="bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">' +
                '<span class="text-xs text-gray-500 mr-1">🔢</span>' +
                '<span class="text-blue-700 font-bold">Bs ' + Number(p.unit_price_sell || p.price_sell || 0).toFixed(2) + '</span>' +
                '</div>';
        }

        return '<div class="bg-white rounded-lg shadow-md overflow-hidden product-card">' +
            '<div class="flex">' +
            '<img src="' + (p.image_url || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlN2U3ZTciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==') + '" class="w-24 h-24 object-cover cursor-pointer" onclick="window.app.openHistory(window.appState.allProducts.find(x => x.id === \'' + p.id + '\'))">' +
            '<div class="p-3 flex-1 cursor-pointer" onclick="window.app.openHistory(window.appState.allProducts.find(x => x.id === \'' + p.id + '\'))">' +
            '<h3 class="font-bold text-gray-800 truncate">' + p.name + '</h3>' +
            '<p class="text-sm text-gray-500">' + (p.category || 'Sin categoría') + '</p>' +
            '<div class="flex justify-between items-center mt-1">' +
            priceDisplay +
            '<span class="text-xs text-gray-400">' + stockDisplay + '</span>' +
            '</div></div>' +
            '<div class="flex flex-col border-l border-gray-100">' +
            '<button onclick="event.stopPropagation(); window.app.openQR(window.appState.allProducts.find(x => x.id === \'' + p.id + '\'))" class="flex-1 px-3 flex items-center justify-center hover:bg-gray-100 text-gray-400">' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>' +
            '</button>' +
            '</div>' +
            '</div>' +
            '<div class="flex border-t border-gray-100 divide-x divide-gray-100">' +
            (() => {
                const isInRestock = window.restockList && window.restockList.isInList && window.restockList.isInList(p.id);
                const btnClass = isInRestock
                    ? 'text-green-500 bg-green-50 border border-green-200'
                    : 'text-orange-500 hover:bg-orange-50';
                const btnIcon = isInRestock ? '✅' : '📋';

                return '<button id="btn-restock-' + p.id + '" onclick="event.stopPropagation(); window.restockList && window.restockList.toggleProduct(\'' + p.id + '\')" class="py-2 px-3 font-medium text-sm flex items-center justify-center ' + btnClass + '" title="Alternar en lista de reabastecimiento">' +
                    btnIcon +
                    '</button>';
            })() +
            '<button onclick="event.stopPropagation(); window.app.openEditModal(window.appState.allProducts.find(x => x.id === \'' + p.id + '\'))" class="flex-1 py-2 text-blue-600 font-medium text-sm hover:bg-blue-50 flex items-center justify-center gap-1">' +
            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg> Editar' +
            '</button>' +
            '<button onclick="event.stopPropagation(); window.app.deleteProduct(\'' + p.id + '\', \'' + p.name.replace(/'/g, "\\'") + '\')" class="flex-1 py-2 text-red-500 font-medium text-sm hover:bg-red-50 flex items-center justify-center gap-1">' +
            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> Eliminar' +
            '</button>' +
            '</div>' +
            '</div>';
    }).join('');
}

// Export functions to window
window.ui = {
    showToast,
    switchTab,
    openModal,
    closeModal,
    renderProductList,
    hasOpenModals,
    closeAllModals
};

// Expose switchTab globally for HTML onclick
window.switchTab = switchTab;
