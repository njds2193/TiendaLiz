// app.js - Main Application Module

// Global App State
window.appState = {
    allProducts: [],
    currentTab: 'inventario',
    cartItems: [],
    productSalesCount: {},
    currentEditingId: null,
    activeCategory: null,
    currentQRProduct: null,
    html5QrCode: null
};

// Alias for compatibility with existing modules
window.supabaseClient = window.api.client;

// --- DEBUG CONSOLE ---
function setupDebugConsole() {
    const consoleDiv = document.getElementById('console-logs');
    if (!consoleDiv) return;

    function logToUI(type, args) {
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
        const color = type === 'error' ? 'text-red-500' : (type === 'warn' ? 'text-yellow-500' : 'text-green-400');
        const line = document.createElement('div');
        line.className = 'mb-1 border-b border-gray-800 pb-1 ' + color;
        line.innerText = '[' + new Date().toLocaleTimeString() + '] ' + type.toUpperCase() + ': ' + msg;
        consoleDiv.appendChild(line);
        consoleDiv.scrollTop = consoleDiv.scrollHeight;
    }

    const originalLog = console.log;
    const originalError = console.error;

    console.log = function () { originalLog.apply(console, arguments); logToUI('log', Array.from(arguments)); };
    console.error = function () { originalError.apply(console, arguments); logToUI('error', Array.from(arguments)); };
}

function toggleDebugConsole() {
    document.getElementById('debug-console').classList.toggle('hidden');
}

// --- INITIALIZATION ---
async function initApp() {
    if (window.app.initialized) return;
    window.app.initialized = true;
    console.log('Initializing App...');
    setupDebugConsole();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error('SW Error:', err));
    }

    // Initial Fetch
    await fetchProducts();

    // Setup Event Listeners
    setupEventListeners();

    // Show filter menu if on inventario tab (default)
    if (window.filterMenu && window.appState.currentTab === 'inventario') {
        window.filterMenu.show();
        window.filterMenu.updateCategories();
    }
}

// --- DATA FETCHING ---
async function fetchProducts() {
    try {
        if (!window.api) throw new Error('API module not loaded');

        const products = await window.api.fetchProducts();
        window.appState.allProducts = products || [];

        // Always update inventory UI (even if not currently visible)
        if (window.appState.activeCategory) {
            const filtered = window.appState.allProducts.filter(p => p.category === window.appState.activeCategory);
            window.ui.renderProductList(filtered, 'product-list');
        } else {
            window.ui.renderProductList(window.appState.allProducts, 'product-list');
        }

        // Update category chips/filter
        if (window.categoryFilter && window.categoryFilter.updateChips) {
            window.categoryFilter.updateChips();
        }

        // Always update sales UI (even if not currently visible)
        if (window.sales && window.sales.renderProducts) {
            window.sales.renderProducts();
        }

        // Update restock badge after products are loaded
        if (window.restockList && window.restockList.updateBadge) {
            window.restockList.updateBadge();
        }

    } catch (error) {
        console.error('Error fetching products:', error);
        window.ui.showToast('Error: ' + error.message, 'error');

        // Show error in UI
        const list = document.getElementById('product-list');
        if (list) {
            list.innerHTML = `<div class="text-center text-red-500 mt-10 p-4 bg-red-50 rounded-lg border border-red-200">
                <p class="font-bold">Error al cargar productos</p>
                <p class="text-sm">${error.message}</p>
                <button onclick="window.location.reload()" class="mt-4 bg-red-500 text-white px-4 py-2 rounded shadow">Reintentar</button>
            </div>`;
        }
    }
}

// --- PRODUCT MANAGEMENT ---
function openAddModal() {
    window.appState.currentEditingId = null;
    document.getElementById('modal-title').textContent = 'Nuevo Producto';
    document.getElementById('product-form').reset();

    const previewImg = document.getElementById('preview-img');
    const imagePreviewDiv = document.getElementById('image-preview');
    previewImg.src = '';
    previewImg.classList.add('hidden');
    imagePreviewDiv.classList.remove('hidden');

    document.getElementById('product-id').value = '';
    document.getElementById('existing-image-url').value = '';
    document.getElementById('existing-qr-url').value = '';
    document.getElementById('product-image').required = true;

    // Default to 'unidades'
    setProductType('unidades');

    window.ui.openModal('product-modal');
}

function openEditModal(productId) {
    // If passed an object (from legacy code), extract ID
    if (typeof productId === 'object') productId = productId.id;

    const product = window.appState.allProducts.find(p => p.id === productId);
    if (!product) return;

    window.appState.currentEditingId = productId;
    document.getElementById('modal-title').textContent = 'Editar Producto';

    // Populate form
    document.getElementById('product-id').value = product.id;
    document.getElementById('name').value = product.name;
    document.getElementById('category').value = product.category || '';
    document.getElementById('quantity').value = product.quantity || 0;
    document.getElementById('price-buy').value = product.price_buy || '';
    document.getElementById('price-sell').value = product.price_sell || '';
    document.getElementById('unit-price').value = product.unit_price_sell || '';
    document.getElementById('expiry-date').value = product.expiry_date || '';

    // New fields
    document.getElementById('units-per-package').value = product.units_per_package || 1;
    document.getElementById('unit-cost').value = product.unit_cost || '';

    // Stock control fields
    document.getElementById('track-stock').checked = product.track_stock !== false; // default true
    document.getElementById('min-stock').value = product.min_stock || 0;

    const contact = product.supplier_contact || '';
    const parts = contact.split('-');
    document.getElementById('supplier-code').value = parts[0] ? parts[0].trim() : '';
    document.getElementById('supplier-phone').value = parts[1] ? parts[1].trim() : '';

    document.getElementById('existing-image-url').value = product.image_url || '';
    document.getElementById('existing-qr-url').value = product.qr_code_url || '';

    const previewImg = document.getElementById('preview-img');
    const imagePreviewDiv = document.getElementById('image-preview');

    if (product.image_url) {
        previewImg.src = product.image_url;
        previewImg.classList.remove('hidden');
        imagePreviewDiv.classList.add('hidden');
    } else {
        previewImg.src = '';
        previewImg.classList.add('hidden');
        imagePreviewDiv.classList.remove('hidden');
    }

    document.getElementById('product-image').required = false;

    // Set type
    setProductType(product.product_type || 'unidades');

    window.ui.openModal('product-modal');
}

function setProductType(type) {
    document.getElementById('product-type').value = type;

    // Update buttons
    ['unidades', 'paquete', 'ambos'].forEach(t => {
        const btn = document.getElementById('type-' + t);
        if (t === type) {
            btn.classList.add('bg-blue-50', 'text-blue-700', 'ring-2', 'ring-blue-700', 'z-10');
            btn.classList.remove('bg-white', 'text-gray-900');
        } else {
            btn.classList.remove('bg-blue-50', 'text-blue-700', 'ring-2', 'ring-blue-700', 'z-10');
            btn.classList.add('bg-white', 'text-gray-900');
        }
    });

    // Show/Hide fields
    const unitsPerPkgContainer = document.getElementById('units-per-pkg-container');
    const costPkgContainer = document.getElementById('cost-pkg-container');
    const pricePkgContainer = document.getElementById('price-pkg-container');
    const profitPkgContainer = document.getElementById('profit-pkg-container');
    const profitUnitContainer = document.getElementById('profit-unit-container');
    const quantityLabel = document.getElementById('quantity-label');
    const stockDisplay = document.getElementById('stock-display');

    if (type === 'unidades') {
        unitsPerPkgContainer.classList.add('hidden');
        costPkgContainer.classList.add('hidden');
        pricePkgContainer.classList.add('hidden');
        profitPkgContainer.classList.add('hidden');
        profitUnitContainer.classList.remove('hidden');
        quantityLabel.textContent = 'Stock (Unidades)';
        stockDisplay.classList.add('hidden');
        // Show simple quantity input
        document.getElementById('quantity-simple-container').classList.remove('hidden');
        document.getElementById('quantity-ambos-container').classList.add('hidden');
        document.getElementById('quantity').required = true;
    } else if (type === 'paquete') {
        unitsPerPkgContainer.classList.remove('hidden');
        costPkgContainer.classList.remove('hidden');
        pricePkgContainer.classList.remove('hidden');
        profitPkgContainer.classList.remove('hidden');
        profitUnitContainer.classList.add('hidden');
        quantityLabel.textContent = 'Stock (Paquetes)';
        stockDisplay.classList.add('hidden');
        // Show simple quantity input
        document.getElementById('quantity-simple-container').classList.remove('hidden');
        document.getElementById('quantity-ambos-container').classList.add('hidden');
        document.getElementById('quantity').required = true;
    } else { // ambos
        unitsPerPkgContainer.classList.remove('hidden');
        costPkgContainer.classList.remove('hidden');
        pricePkgContainer.classList.remove('hidden');
        profitPkgContainer.classList.remove('hidden');
        profitUnitContainer.classList.remove('hidden');
        quantityLabel.textContent = 'Stock Total (Unidades)';
        stockDisplay.classList.remove('hidden');
        // Show box-based input for Ambos
        document.getElementById('quantity-simple-container').classList.add('hidden');
        document.getElementById('quantity-ambos-container').classList.remove('hidden');
        document.getElementById('quantity').required = false;
    }

    calculateCosts();
}

function calculateCosts(fromUnit = false) {
    // Simply trigger profit calculation and stock display update
    // No more automatic synchronization between package and unit costs
    calculateProfit();
    updateStockDisplay();
}

function calculateTotalStock() {
    const boxes = parseInt(document.getElementById('box-quantity').value) || 0;
    const looseUnits = parseInt(document.getElementById('loose-units').value) || 0;
    const unitsPerPkg = parseInt(document.getElementById('units-per-package').value) || 1;

    const totalUnits = (boxes * unitsPerPkg) + looseUnits;

    // Update hidden quantity field (this is what gets saved)
    document.getElementById('quantity').value = totalUnits;

    // Update display
    document.getElementById('total-stock-display').textContent = totalUnits + ' unidades';

    // Update box/unit breakdown display
    updateStockDisplay();
}

function calculateProfit() {
    const type = document.getElementById('product-type').value;

    // Unit Profit
    const unitPrice = parseFloat(document.getElementById('unit-price').value) || 0;
    const unitCost = parseFloat(document.getElementById('unit-cost').value) ||
        (parseFloat(document.getElementById('price-buy').value) || 0); // Fallback if simple unit

    const profitUnit = unitPrice - unitCost;
    document.getElementById('profit-unit').textContent = 'Bs ' + profitUnit.toFixed(2);
    document.getElementById('profit-unit').className = 'block text-lg font-bold ' + (profitUnit >= 0 ? 'text-green-700' : 'text-red-600');

    // Package Profit
    if (type !== 'unidades') {
        const pkgPrice = parseFloat(document.getElementById('price-sell').value) || 0;
        const pkgCost = parseFloat(document.getElementById('price-buy').value) || 0;

        const profitPkg = pkgPrice - pkgCost;
        document.getElementById('profit-pkg').textContent = 'Bs ' + profitPkg.toFixed(2);
        document.getElementById('profit-pkg').className = 'block text-lg font-bold ' + (profitPkg >= 0 ? 'text-green-700' : 'text-red-600');
    }
}

function updateStockDisplay() {
    const type = document.getElementById('product-type').value;
    if (type !== 'ambos') return;

    // Read directly from the input fields
    const boxes = parseInt(document.getElementById('box-quantity')?.value) || 0;
    const units = parseInt(document.getElementById('loose-units')?.value) || 0;

    document.getElementById('stock-display').textContent = `${boxes} Cajas + ${units} Unid.`;
}

// Add event listener for quantity change to update display
document.getElementById('quantity')?.addEventListener('input', updateStockDisplay);


async function handleProductSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = window.appState.currentEditingId ? 'Actualizando...' : 'Guardando...';

    try {
        let imageUrl = document.getElementById('existing-image-url').value;
        let qrUrl = document.getElementById('existing-qr-url').value;
        let productId = window.appState.currentEditingId || crypto.randomUUID();

        const imageInput = document.getElementById('product-image');

        // Upload Image
        if (imageInput.files.length > 0) {
            const file = imageInput.files[0];
            const fileName = Date.now() + '.' + file.name.split('.').pop();
            imageUrl = await window.api.uploadImage(file, fileName);
        }

        // Generate QR if new
        if (!window.appState.currentEditingId) {
            const qrBlob = await generateQRCodeBlob(productId);
            const qrFileName = 'qr_' + Date.now() + '.png';
            qrUrl = await window.api.uploadImage(qrBlob, qrFileName);
        }

        const productData = {
            name: document.getElementById('name').value,
            category: document.getElementById('category').value.trim(),
            quantity: parseInt(document.getElementById('quantity').value),
            price_buy: parseFloat(document.getElementById('price-buy').value) || 0,
            price_sell: parseFloat(document.getElementById('price-sell').value) || 0,
            unit_price_sell: parseFloat(document.getElementById('unit-price').value) || null,
            expiry_date: document.getElementById('expiry-date').value || null,
            supplier_contact: (document.getElementById('supplier-code').value + ' - ' + document.getElementById('supplier-phone').value).trim(),
            image_url: imageUrl,
            qr_code_url: qrUrl,
            // Type fields
            product_type: document.getElementById('product-type').value,
            units_per_package: parseInt(document.getElementById('units-per-package').value) || 1,
            unit_cost: parseFloat(document.getElementById('unit-cost').value) || null,
            // Stock control fields
            track_stock: document.getElementById('track-stock').checked,
            min_stock: parseInt(document.getElementById('min-stock').value) || 0
        };

        if (window.appState.currentEditingId) {
            productData.id = window.appState.currentEditingId;
            await window.api.saveProduct(productData, true);
            window.ui.showToast('Actualizado!');
        } else {
            productData.id = productId;
            await window.api.saveProduct(productData, false);
            window.ui.showToast('Guardado con QR!');
        }

        window.ui.closeModal('product-modal');
        fetchProducts();

    } catch (error) {
        console.error(error);
        window.ui.showToast('Error: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Guardar Producto';
    }
}

async function deleteProduct(productId, productName) {
    if (!confirm('¿Eliminar "' + productName + '"?')) return;
    try {
        await window.api.deleteProduct(productId);
        window.ui.showToast('Eliminado!');
        fetchProducts();
    } catch (error) {
        console.error(error);
        window.ui.showToast('Error al eliminar', 'error');
    }
}

// --- QR HELPERS ---
function generateQRCodeBlob(text) {
    return new Promise(resolve => {
        const tempDiv = document.createElement('div');
        new QRCode(tempDiv, { text: text, width: 256, height: 256 });
        setTimeout(() => {
            tempDiv.querySelector('canvas').toBlob(blob => resolve(blob));
        }, 100);
    });
}

function openQRModal(productId) {
    // If passed object
    if (typeof productId === 'object') productId = productId.id;

    const product = window.appState.allProducts.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('qr-product-name').textContent = product.name;
    const qrDisplay = document.getElementById('qr-display');
    qrDisplay.innerHTML = '';
    new QRCode(qrDisplay, { text: product.id, width: 200, height: 200 });

    // Store current QR product for download
    window.appState.currentQRProduct = product;

    window.ui.openModal('qr-modal');
}

function downloadQR() {
    if (!window.appState.currentQRProduct) return;
    const link = document.createElement('a');
    link.download = 'QR_' + window.appState.currentQRProduct.name + '.png';
    link.href = document.querySelector('#qr-display canvas').toDataURL();
    link.click();
    window.ui.showToast('QR descargado!');
}

// --- SCANNER LOGIC ---
function openScanner() {
    document.getElementById('scanner-modal').classList.remove('hidden');
    startScanner();
}

function closeScanner() {
    stopScanner();
    document.getElementById('scanner-modal').classList.add('hidden');
}

function startScanner() {
    document.getElementById('start-scan-btn').classList.add('hidden');
    document.getElementById('stop-scan-btn').classList.remove('hidden');
    document.getElementById('scan-result').classList.add('hidden');

    if (!window.appState.html5QrCode) {
        window.appState.html5QrCode = new Html5Qrcode("reader");
    }

    window.appState.html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText, decodedResult) => {
            // Handle success
            stopScanner();
            const product = window.appState.allProducts.find(p => p.id === decodedText);

            if (product) {
                // Play beep
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play().catch(e => console.log('Audio error', e));

                if (window.appState.currentTab === 'ventas') {
                    window.sales.addToCart(product.id);
                    window.ui.showToast('Agregado: ' + product.name);
                    closeScanner();
                } else {
                    document.getElementById('scan-result-name').textContent = product.name;
                    document.getElementById('scan-result').classList.remove('hidden');
                    setTimeout(() => {
                        closeScanner();
                        openHistory(product);
                    }, 1000);
                }
            } else {
                window.ui.showToast('Producto no encontrado', 'error');
            }
        },
        (errorMessage) => {
            // ignore errors
        }
    ).catch(err => {
        console.error(err);
        window.ui.showToast('Error al iniciar cámara', 'error');
    });
}

function stopScanner() {
    if (window.appState.html5QrCode && window.appState.html5QrCode.isScanning) {
        window.appState.html5QrCode.stop().then(() => {
            document.getElementById('start-scan-btn').classList.remove('hidden');
            document.getElementById('stop-scan-btn').classList.add('hidden');
        }).catch(err => console.log(err));
    } else {
        // Scanner not running, just reset button states
        const startBtn = document.getElementById('start-scan-btn');
        const stopBtn = document.getElementById('stop-scan-btn');
        if (startBtn) startBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
    }
}

// --- CATEGORY AUTOCOMPLETE ---
function setupCategoryAutocomplete() {
    const categoryInput = document.getElementById('category');
    const suggestionsBox = document.getElementById('category-suggestions');

    if (!categoryInput || !suggestionsBox) return;

    categoryInput.addEventListener('input', function () {
        const val = this.value.toLowerCase();
        const categories = [...new Set(window.appState.allProducts.map(p => p.category).filter(Boolean))];
        const matches = categories.filter(c => c.toLowerCase().includes(val));

        if (matches.length > 0 && val.length > 0) {
            suggestionsBox.innerHTML = matches.map(c =>
                `<div class="p-2 hover:bg-gray-100 cursor-pointer" onclick="window.app.selectCategorySuggestion('${c.replace(/'/g, "\\'")}')">${c}</div>`
            ).join('');
            suggestionsBox.classList.remove('hidden');
        } else {
            suggestionsBox.classList.add('hidden');
        }
    });

    // Hide when clicking outside
    document.addEventListener('click', function (e) {
        if (e.target !== categoryInput && e.target !== suggestionsBox) {
            suggestionsBox.classList.add('hidden');
        }
    });
}

function selectCategorySuggestion(cat) {
    document.getElementById('category').value = cat;
    document.getElementById('category-suggestions').classList.add('hidden');
}

// --- HISTORY ---
function openHistory(productId) {
    // If passed object
    if (typeof productId === 'object') productId = productId.id;

    const product = window.appState.allProducts.find(p => p.id === productId);
    if (!product) return;

    // Use the existing global function from product-history.js
    if (window.openHistoryModal) {
        window.openHistoryModal(product);
    } else {
        console.error('product-history.js not loaded');
    }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Form Submit
    const form = document.getElementById('product-form');
    if (form) form.addEventListener('submit', handleProductSubmit);

    // Image Preview
    const imageInput = document.getElementById('product-image');
    if (imageInput) {
        imageInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = ev => {
                    const previewImg = document.getElementById('preview-img');
                    const imagePreviewDiv = document.getElementById('image-preview');
                    previewImg.src = ev.target.result;
                    previewImg.classList.remove('hidden');
                    imagePreviewDiv.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Search Input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (window.appState.currentTab === 'inventario') {
                const filtered = window.appState.allProducts.filter(p =>
                    p.name.toLowerCase().includes(query) ||
                    (p.category && p.category.toLowerCase().includes(query))
                );
                window.ui.renderProductList(filtered, 'product-list');
            } else if (window.appState.currentTab === 'ventas') {
                window.sales.renderProducts(query);
            }
        });
    }

    setupCategoryAutocomplete();
}

// --- EXPORT ---
window.app = {
    init: initApp,
    fetchProducts,
    openAddModal,
    openEditModal,
    deleteProduct,
    openQR: openQRModal,
    downloadQR,
    openHistory,
    toggleDebugConsole,
    openScanner,
    closeScanner,
    startScanner,
    stopScanner,
    selectCategorySuggestion,
    setProductType,
    calculateCosts,
    calculateProfit,
    calculateTotalStock
};

// Start App
// Window load handled by index.html / auth.js
