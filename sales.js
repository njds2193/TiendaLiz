// sales.js - Sales Module with Tap-to-Add

let salesCategory = null;
let receivedAmount = 0;
let selectedPaymentMethod = 'cash'; // 'cash' or 'digital'

// ==================== DRAGGABLE CART FAB ====================
const CART_FAB_POSITION_KEY = 'cart-fab-position';
let cartFabDragging = false;
let cartFabDragStartX = 0;
let cartFabDragStartY = 0;
let cartFabStartX = 0;
let cartFabStartY = 0;
let cartFabHasMoved = false;

function setupCartFabDrag() {
    const fab = document.getElementById('cart-fab');
    if (!fab) return;

    fab.style.cursor = 'grab';
    fab.style.touchAction = 'none';
    fab.style.userSelect = 'none';

    fab.addEventListener('touchstart', cartFabDragStart, { passive: false });
    fab.addEventListener('mousedown', cartFabDragStart);
    document.addEventListener('touchmove', cartFabDragMove, { passive: false });
    document.addEventListener('mousemove', cartFabDragMove);
    document.addEventListener('touchend', cartFabDragEnd);
    document.addEventListener('mouseup', cartFabDragEnd);

    restoreCartFabPosition();
}

function cartFabDragStart(e) {
    const fab = document.getElementById('cart-fab');
    if (!fab) return;

    cartFabDragging = true;
    cartFabHasMoved = false;

    const touch = e.touches ? e.touches[0] : e;
    cartFabDragStartX = touch.clientX;
    cartFabDragStartY = touch.clientY;

    const rect = fab.getBoundingClientRect();
    cartFabStartX = rect.left;
    cartFabStartY = rect.top;

    fab.style.cursor = 'grabbing';
    fab.style.opacity = '0.8';
    fab.style.transform = 'scale(1.1)';
    e.preventDefault();
}

function cartFabDragMove(e) {
    if (!cartFabDragging) return;

    const touch = e.touches ? e.touches[0] : e;
    const deltaX = touch.clientX - cartFabDragStartX;
    const deltaY = touch.clientY - cartFabDragStartY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        cartFabHasMoved = true;
    }

    let newX = cartFabStartX + deltaX;
    let newY = cartFabStartY + deltaY;

    // Constrain to viewport
    const size = 64;
    const pad = 8;
    newX = Math.max(pad, Math.min(window.innerWidth - size - pad, newX));
    newY = Math.max(pad, Math.min(window.innerHeight - size - pad, newY));

    const fab = document.getElementById('cart-fab');
    if (fab) {
        fab.style.position = 'fixed';
        fab.style.left = `${newX}px`;
        fab.style.top = `${newY}px`;
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
    }

    e.preventDefault();
}

function cartFabDragEnd() {
    if (!cartFabDragging) return;

    cartFabDragging = false;
    const fab = document.getElementById('cart-fab');
    if (fab) {
        fab.style.cursor = 'grab';
        fab.style.opacity = '1';
        fab.style.transform = '';
    }
    snapCartFabToEdge();
    saveCartFabPosition();

    // If didn't move, toggle cart
    if (!cartFabHasMoved) {
        toggleCart();
    }
}

function snapCartFabToEdge() {
    const fab = document.getElementById('cart-fab');
    if (!fab) return;

    const rect = fab.getBoundingClientRect();
    const centerX = rect.left + 32;
    const screenCenter = window.innerWidth / 2;
    const padding = 16;

    const newX = centerX < screenCenter ? padding : window.innerWidth - 64 - padding;

    fab.style.transition = 'left 0.2s ease';
    fab.style.left = `${newX}px`;

    setTimeout(() => { fab.style.transition = ''; }, 200);
}

function saveCartFabPosition() {
    const fab = document.getElementById('cart-fab');
    if (!fab) return;

    const rect = fab.getBoundingClientRect();
    localStorage.setItem(CART_FAB_POSITION_KEY, JSON.stringify({ left: rect.left, top: rect.top }));
}

function restoreCartFabPosition() {
    const fab = document.getElementById('cart-fab');
    if (!fab) return;

    const saved = localStorage.getItem(CART_FAB_POSITION_KEY);
    if (saved) {
        try {
            const pos = JSON.parse(saved);

            // Validate position is within current viewport
            const fabWidth = 64; // FAB width
            const fabHeight = 64; // FAB height
            const maxX = window.innerWidth - fabWidth;
            const maxY = window.innerHeight - fabHeight;

            // Check if saved position is within bounds
            const isValidX = pos.left >= 0 && pos.left <= maxX;
            const isValidY = pos.top >= 0 && pos.top <= maxY;

            if (isValidX && isValidY) {
                fab.style.position = 'fixed';
                fab.style.left = `${pos.left}px`;
                fab.style.top = `${pos.top}px`;
                fab.style.right = 'auto';
                fab.style.bottom = 'auto';
            } else {
                // Position is out of bounds, reset to default (bottom-right)
                resetCartFabToDefault();
            }
        } catch (e) {
            resetCartFabToDefault();
        }
    }
}

// Reset FAB to default bottom-right position
function resetCartFabToDefault() {
    const fab = document.getElementById('cart-fab');
    if (!fab) return;

    fab.style.position = 'fixed';
    fab.style.left = 'auto';
    fab.style.top = 'auto';
    fab.style.right = '24px';
    fab.style.bottom = '24px';

    // Clear saved invalid position
    localStorage.removeItem(CART_FAB_POSITION_KEY);
}

// Re-validate FAB position on window resize
window.addEventListener('resize', () => {
    const fab = document.getElementById('cart-fab');
    if (!fab || fab.classList.contains('hidden')) return;

    const rect = fab.getBoundingClientRect();
    const isOutOfBounds = rect.right > window.innerWidth ||
        rect.bottom > window.innerHeight ||
        rect.left < 0 ||
        rect.top < 0;

    if (isOutOfBounds) {
        resetCartFabToDefault();
    }
});

// Initialize drag on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCartFabDrag);
} else {
    setTimeout(setupCartFabDrag, 100);
}

function loadCategories() {
    const allProducts = window.appState.allProducts;
    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))].sort();
    const container = document.getElementById('sales-category-buttons');

    let html = `<button onclick="window.sales.selectCategory(null)" 
        class="sales-cat-btn flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold ${salesCategory === null ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}">
        📦 Todos
    </button>`;

    categories.forEach(cat => {
        html += `<button onclick="window.sales.selectCategory('${cat.replace(/'/g, "\\'")}')" 
            class="sales-cat-btn flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium ${salesCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
            ${cat}
        </button>`;
    });

    container.innerHTML = html;
}

function selectCategory(category) {
    salesCategory = category;
    loadCategories();
    renderProducts();
}

function renderProducts(searchQuery = '') {
    let products = [...window.appState.allProducts];
    if (salesCategory) products = products.filter(p => p.category === salesCategory);
    if (searchQuery) products = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Sort by sales count
    products.sort((a, b) => (window.appState.productSalesCount[b.id] || 0) - (window.appState.productSalesCount[a.id] || 0));

    const grid = document.getElementById('sales-products-grid');
    if (products.length === 0) {
        grid.innerHTML = '<div class="col-span-3 text-center text-gray-400 py-8">No hay productos</div>';
        return;
    }

    grid.innerHTML = products.map(p => {
        const salesCount = window.appState.productSalesCount[p.id] || 0;
        let priceDisplay = '';
        let boxButton = '';
        let stockDisplay = '';

        // Calculate stock display
        if (p.product_type === 'ambos' && p.units_per_package > 1) {
            const boxes = Math.floor((p.quantity || 0) / p.units_per_package);
            const units = (p.quantity || 0) % p.units_per_package;
            stockDisplay = `<div class="text-[10px] text-gray-500 mt-0.5">📦 ${boxes} + 🔢 ${units}</div>`;
        } else if (p.product_type === 'paquete') {
            stockDisplay = `<div class="text-[10px] text-gray-500 mt-0.5">📦 ${p.quantity || 0}</div>`;
        } else {
            stockDisplay = `<div class="text-[10px] text-gray-500 mt-0.5">🔢 ${p.quantity || 0}</div>`;
        }

        // Determine what happens when tapping the card/image
        // Default: add unit (most common action)
        let tapAction = `window.sales.addToCart('${p.id}', false)`;

        if (p.product_type === 'ambos') {
            // Show both prices
            priceDisplay = `<div class="flex justify-between items-center text-xs font-bold px-1">
                <span class="text-green-600">🔢 Bs ${Number(p.unit_price_sell || 0).toFixed(2)}</span>
                <span class="text-blue-500 text-[10px]">📦 ${Number(p.price_sell || 0).toFixed(2)}</span>
            </div>`;
            // Show box button for "ambos"
            boxButton = `<button onclick="event.stopPropagation(); window.sales.addToCart('${p.id}', true)" 
                class="absolute top-1 left-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-lg shadow-lg font-bold hover:bg-blue-700 active:scale-95 transition-transform">
                📦+
            </button>`;
        } else if (p.product_type === 'paquete') {
            priceDisplay = `<span class="text-green-600 font-bold text-sm">📦 Bs ${Number(p.price_sell || 0).toFixed(2)}</span>`;
            // For package-only products, tap adds package
            tapAction = `window.sales.addToCart('${p.id}', true)`;
        } else {
            // unidades
            priceDisplay = `<span class="text-green-600 font-bold text-sm">Bs ${Number(p.unit_price_sell || p.price_sell || 0).toFixed(2)}</span>`;
        }

        return `<div class="product-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg cursor-pointer active:scale-95 transition-transform" 
                     data-product-id="${p.id}"
                     onclick="${tapAction}">
            <div class="relative">
                ${boxButton}
                <img src="${p.image_url || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlN2U3ZTciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}\" class="w-full h-24 object-cover">
                ${salesCount > 0 ? `<span class="absolute top-1 right-1 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">${salesCount}</span>` : ''}
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                    <p class="text-white text-xs truncate font-medium text-center" title="${p.name}">${p.name}</p>
                </div>
            </div>
            <div class="p-1.5 text-center bg-gray-50">
                ${priceDisplay}
                ${stockDisplay}
            </div>
        </div>`;
    }).join('');
}

function addToCart(productId, isBox = false) {
    const product = window.appState.allProducts.find(p => p.id === productId);
    if (!product) return;

    // Visual feedback
    const card = document.querySelector(`[data-product-id="${productId}"]`);
    if (card) {
        card.classList.add('added');
        // Flash effect
        const flash = document.createElement('div');
        flash.className = 'absolute inset-0 bg-green-400 opacity-50 pointer-events-none animate-ping';
        card.style.position = 'relative';
        card.appendChild(flash);
        setTimeout(() => {
            flash.remove();
            card.classList.remove('added');
        }, 300);
    }

    // Determine price and name suffix
    let price = 0;
    let nameSuffix = '';
    let typeId = '';

    if (isBox) {
        price = parseFloat(product.price_sell);
        nameSuffix = ' (Caja)';
        typeId = productId + '_box';
    } else {
        if (product.product_type === 'unidades') {
            price = parseFloat(product.unit_price_sell || product.price_sell);
        } else {
            price = parseFloat(product.unit_price_sell);
        }
        nameSuffix = product.product_type === 'ambos' ? ' (Unid.)' : '';
        typeId = productId + '_unit';
    }

    const existingItem = window.appState.cartItems.find(item => item.typeId === typeId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        window.appState.cartItems.push({
            typeId,
            productId,
            isBox,
            name: product.name + nameSuffix,
            image: product.image_url,
            quantity: 1,
            price: price
        });
    }

    updateCartDisplay();
    // Toast removed for faster sales flow
}

function adjustCartQuantity(typeId, delta) {
    const item = window.appState.cartItems.find(i => i.typeId === typeId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        window.appState.cartItems = window.appState.cartItems.filter(i => i.typeId !== typeId);
    }
    updateCartDisplay();
}

function clearCart() {
    window.appState.cartItems = [];
    extraAmount = 0;
    receivedAmount = 0;
    updateCartDisplay();
    updateChangeDisplay();
}

function updateCartDisplay() {
    const itemsContainer = document.getElementById('cart-items');
    const totalItems = window.appState.cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = window.appState.cartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const totalPrice = subtotal + extraAmount;

    document.getElementById('cart-count').textContent = totalItems + ' item' + (totalItems !== 1 ? 's' : '');
    document.getElementById('cart-total').textContent = 'Bs ' + totalPrice.toFixed(2);

    // Update subtotal and extra displays
    const subtotalEl = document.getElementById('cart-subtotal');
    if (subtotalEl) subtotalEl.textContent = 'Bs ' + subtotal.toFixed(2);

    const extraDisplayEl = document.getElementById('cart-extra-display');
    if (extraDisplayEl) extraDisplayEl.textContent = 'Bs ' + extraAmount.toFixed(2);

    const extraAmountEl = document.getElementById('extra-amount');
    if (extraAmountEl) extraAmountEl.textContent = 'Bs ' + extraAmount.toFixed(2);

    // Update floating badge
    const badge = document.getElementById('cart-badge');
    if (badge) {
        if (totalItems > 0) {
            badge.textContent = totalItems > 99 ? '99+' : totalItems;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    if (window.appState.cartItems.length === 0) {
        itemsContainer.innerHTML = '<div class="text-center text-gray-400 text-sm py-4">Carrito vacío - Toca un producto para agregar</div>';
        return;
    }

    itemsContainer.innerHTML = window.appState.cartItems.map(item =>
        `<div class="flex items-center gap-2 bg-white rounded-lg p-2 mb-2 shadow-sm">
            <img src="${item.image || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlN2U3ZTciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}" class="w-10 h-10 rounded object-cover">
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">${item.name}</p>
                <p class="text-xs text-gray-500">Bs ${item.price.toFixed(2)}</p>
            </div>
            <div class="flex items-center gap-1">
                <button onclick="event.stopPropagation(); window.sales.adjustCartQuantity('${item.typeId}', -1)" 
                        class="w-8 h-8 bg-red-100 text-red-600 rounded-full font-bold text-lg active:scale-90 transition-transform">−</button>
                <span class="w-8 text-center font-bold">${item.quantity}</span>
                <button onclick="event.stopPropagation(); window.sales.adjustCartQuantity('${item.typeId}', 1)" 
                        class="w-8 h-8 bg-green-100 text-green-600 rounded-full font-bold text-lg active:scale-90 transition-transform">+</button>
            </div>
            <span class="text-green-600 font-bold text-sm w-16 text-right">Bs ${(item.quantity * item.price).toFixed(2)}</span>
        </div>`
    ).join('');
}

async function confirmCartSale() {
    if (window.appState.cartItems.length === 0) {
        window.ui.showToast('Carrito vacío', 'error');
        return;
    }

    const subtotal = window.appState.cartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const finalTotal = subtotal + extraAmount;

    // ========== OPTIMISTIC UI: Respond immediately ==========

    // 1. Show success toast IMMEDIATELY
    let toastMsg = `✅ Venta: Bs ${finalTotal.toFixed(2)}`;
    if (extraAmount !== 0) {
        toastMsg += ` (${extraAmount >= 0 ? '+' : ''}${extraAmount.toFixed(2)} extra)`;
    }
    window.ui.showToast(toastMsg, 'success');

    // 2. Copy cart data for background processing
    const itemsToProcess = [...window.appState.cartItems];
    const extraToProcess = extraAmount;
    const paymentToProcess = selectedPaymentMethod;
    const transactionId = crypto.randomUUID();

    // 3. Update local stock IMMEDIATELY (optimistic update)
    itemsToProcess.forEach(item => {
        const product = window.appState.allProducts.find(p => p.id === item.productId);
        if (product && product.track_stock !== false) {
            let unitsToDeduct = item.quantity;
            if (item.isBox) {
                unitsToDeduct = item.quantity * (product.units_per_package || 1);
            }
            product.quantity = Math.max(0, (product.quantity || 0) - unitsToDeduct);
        }
        window.appState.productSalesCount[item.productId] = (window.appState.productSalesCount[item.productId] || 0) + item.quantity;
    });

    // 4. Clear cart and close panel IMMEDIATELY
    clearCart();
    selectedPaymentMethod = 'cash';
    setPaymentMethod('cash');
    closeCart();
    renderProducts();

    // 5. Update restock badge IMMEDIATELY
    if (window.restockList && window.restockList.updateBadge) {
        window.restockList.updateBadge();
    }

    // ========== BACKGROUND SYNC: Process server updates without blocking ==========

    (async () => {
        try {
            for (const item of itemsToProcess) {
                const product = window.appState.allProducts.find(p => p.id === item.productId);
                if (!product) continue;

                let unitsToDeduct = item.quantity;
                if (item.isBox) {
                    unitsToDeduct = item.quantity * (product.units_per_package || 1);
                }

                // Sync stock to server
                if (product.track_stock !== false) {
                    window.api.updateProductStock(item.productId, product.quantity).catch(e => {
                        console.warn('Stock sync pending:', e.message);
                    });
                }

                // Build notes
                let notes = `Venta: ${item.quantity} ${item.isBox ? 'Caja(s)' : 'Unidad(es)'}`;
                if (extraToProcess !== 0) {
                    notes += ` | Extra: ${extraToProcess >= 0 ? '+' : ''}Bs ${extraToProcess.toFixed(2)}`;
                }

                const unitPrice = item.isBox ? (item.price / (product.units_per_package || 1)) : item.price;

                // Save history entry
                window.api.saveHistoryEntry({
                    product_id: item.productId,
                    action_type: 'venta',
                    quantity: unitsToDeduct,
                    price_sell: unitPrice,
                    unit_cost: product.unit_cost || 0,
                    total_buy: (product.unit_cost || 0) * unitsToDeduct,
                    notes: notes,
                    payment_method: paymentToProcess,
                    product_name: product.name,
                    product_category: product.category,
                    product_image_url: product.image_url,
                    transaction_id: transactionId
                }).catch(e => {
                    console.warn('History sync pending:', e.message);
                });
            }
        } catch (error) {
            console.error('Background sync error:', error);
        }
    })();
}

// Toggle Cart Panel (Slide up/down)
let cartOpen = false;

function toggleCart() {
    const panel = document.getElementById('cart-panel');
    const overlay = document.getElementById('cart-overlay');
    const fab = document.getElementById('cart-fab');

    if (!panel || !overlay || !fab) {
        console.warn('Cart elements not found');
        return;
    }

    cartOpen = !cartOpen;

    if (cartOpen) {
        panel.classList.remove('translate-y-full');
        panel.classList.add('translate-y-0');
        overlay.classList.remove('hidden');
        fab.classList.add('hidden');
    } else {
        panel.classList.add('translate-y-full');
        panel.classList.remove('translate-y-0');
        overlay.classList.add('hidden');
        fab.classList.remove('hidden');
    }
}

// Explicitly close cart (used after sale confirmation to ensure state sync)
function closeCart() {
    const panel = document.getElementById('cart-panel');
    const overlay = document.getElementById('cart-overlay');
    const fab = document.getElementById('cart-fab');

    if (!panel || !overlay || !fab) return;

    // Force close state
    cartOpen = false;
    panel.classList.add('translate-y-full');
    panel.classList.remove('translate-y-0');
    overlay.classList.add('hidden');
    fab.classList.remove('hidden');
}

// Extra functionality
let extraAmount = 0;
let extraMode = 'add'; // 'add' or 'sub'

function setExtraMode(mode) {
    extraMode = mode;
    const addBtn = document.getElementById('extra-mode-add');
    const subBtn = document.getElementById('extra-mode-sub');

    if (mode === 'add') {
        addBtn.className = 'flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all duration-200 bg-green-500 text-white shadow-md';
        subBtn.className = 'flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all duration-200 bg-gray-200 text-gray-500';
    } else {
        addBtn.className = 'flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all duration-200 bg-gray-200 text-gray-500';
        subBtn.className = 'flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all duration-200 bg-red-500 text-white shadow-md';
    }
}

function addExtra(value) {
    if (extraMode === 'add') {
        extraAmount += value;
    } else {
        extraAmount -= value;
        // Allow negative values for discounts
    }
    updateExtraDisplay();
    updateCartDisplay();
}

function resetExtra() {
    extraAmount = 0;
    updateExtraDisplay();
    updateCartDisplay();
}

function updateExtraDisplay() {
    const extraEl = document.getElementById('extra-amount');
    if (extraEl) {
        extraEl.textContent = 'Bs ' + extraAmount.toFixed(2);
    }
    const extraDisplayEl = document.getElementById('cart-extra-display');
    if (extraDisplayEl) {
        extraDisplayEl.textContent = 'Bs ' + extraAmount.toFixed(2);
    }
}

// Payment Method
function setPaymentMethod(method) {
    selectedPaymentMethod = method;
    const cashBtn = document.getElementById('pay-method-cash');
    const digitalBtn = document.getElementById('pay-method-digital');
    if (cashBtn && digitalBtn) {
        if (method === 'cash') {
            cashBtn.className = 'flex-1 py-2 px-3 rounded-xl font-bold text-sm transition-all bg-white text-green-600 shadow-md';
            digitalBtn.className = 'flex-1 py-2 px-3 rounded-xl font-bold text-sm transition-all bg-white/20 text-white';
        } else {
            cashBtn.className = 'flex-1 py-2 px-3 rounded-xl font-bold text-sm transition-all bg-white/20 text-white';
            digitalBtn.className = 'flex-1 py-2 px-3 rounded-xl font-bold text-sm transition-all bg-white text-green-600 shadow-md';
        }
    }
}

// Export
window.sales = {
    loadCategories,
    selectCategory,
    renderProducts,
    addToCart,
    adjustCartQuantity,
    clearCart,
    confirmCartSale,
    toggleCart,
    closeCart,
    setExtraMode,
    addExtra,
    resetExtra,
    addReceived,
    resetReceived,
    setPaymentMethod
};

// Change Calculator functionality

function addReceived(value) {
    receivedAmount += value;
    updateChangeDisplay();
}

function resetReceived() {
    receivedAmount = 0;
    updateChangeDisplay();
}

function updateChangeDisplay() {
    const receivedEl = document.getElementById('received-amount');
    const changeEl = document.getElementById('change-amount');

    if (receivedEl) {
        receivedEl.textContent = 'Bs ' + receivedAmount.toFixed(2);
    }

    if (changeEl) {
        const subtotal = window.appState.cartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const total = subtotal + extraAmount;
        const change = receivedAmount - total;

        // If no money received yet, show neutral state
        if (receivedAmount === 0) {
            changeEl.textContent = 'Bs 0.00';
            changeEl.className = 'text-lg font-bold text-white/70'; // Neutral
        } else if (change < 0) {
            changeEl.textContent = 'Bs ' + change.toFixed(2);
            changeEl.className = 'text-lg font-bold text-red-300'; // Not enough money
        } else if (change > 0) {
            changeEl.textContent = 'Bs ' + change.toFixed(2);
            changeEl.className = 'text-lg font-bold text-yellow-300'; // Change to return
        } else {
            changeEl.textContent = 'Bs 0.00';
            changeEl.className = 'text-lg font-bold text-green-300'; // Exact amount
        }
    }
}
