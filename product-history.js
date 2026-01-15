// Product History Functions
let currentHistoryProduct = null;
window.currentHistoryProduct = null; // Expose globally for edit button

function openHistoryModal(product) {
    currentHistoryProduct = product;
    window.currentHistoryProduct = product; // Keep global reference
    document.getElementById('history-product-img').src = product.image_url || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlN2U3ZTciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
    document.getElementById('history-product-name').textContent = product.name;
    const typeLabels = { 'paquete': '📦 Paquete', 'unidades': '🔢 Unidades', 'ambos': '📦🔢 Ambos' };
    document.getElementById('history-product-type').textContent = typeLabels[product.product_type] || '📦 Paquete';
    document.getElementById('history-modal').classList.remove('hidden');

    // Ocultar el FAB cuando se abre un modal en inventario
    if (window.appState && window.appState.currentTab === 'inventario') {
        const fabBtn = document.getElementById('fab-btn');
        if (fabBtn) fabBtn.classList.add('hidden');
    }

    loadProductHistory(product.id, product.product_type);
}
window.openHistoryModal = openHistoryModal;

function closeHistoryModal() {
    document.getElementById('history-modal').classList.add('hidden');
    currentHistoryProduct = null;

    // Mostrar el FAB si estamos en inventario y no hay otros modales abiertos
    // Usamos 150ms para dar tiempo a que se abra otro modal (ej: editar producto)
    if (window.appState && window.appState.currentTab === 'inventario') {
        setTimeout(() => {
            if (window.ui && !window.ui.hasOpenModals()) {
                const fabBtn = document.getElementById('fab-btn');
                if (fabBtn) fabBtn.classList.remove('hidden');
            }
        }, 150);
    }
}
window.closeHistoryModal = closeHistoryModal;

async function loadProductHistory(productId, productType) {
    const listEl = document.getElementById('history-list');
    listEl.innerHTML = '<div class="text-center text-gray-400 py-4">Cargando...</div>';

    try {
        const { data, error } = await window.supabaseClient
            .from('product_history')
            .select('*')
            .eq('product_id', productId)
            .eq('action_type', 'compra')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            listEl.innerHTML = '<div class="text-center text-gray-400 py-8"><p class="text-2xl mb-2">📭</p><p>Sin historial</p><p class="text-xs">Registra tu primera compra</p></div>';
            return;
        }

        listEl.innerHTML = data.map((entry, idx) => {
            const date = new Date(entry.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' });
            const expiryDate = entry.expiry_date ? new Date(entry.expiry_date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' }) : null;


            // Calculate profit correctly based on what was purchased
            let profit = 0;

            if (productType === 'ambos') {
                // For ambos, we need to calculate based on actual units sold
                // Use unit prices if unit_price_sell exists, otherwise use package prices
                if (entry.unit_price_sell && entry.unit_cost) {
                    // Calculate using unit prices (most accurate for ambos)
                    const unitProfit = (entry.unit_price_sell - entry.unit_cost);
                    profit = unitProfit * (entry.quantity || 0);
                } else {
                    // Fallback to package prices
                    const pkgProfit = (entry.price_sell || 0) - (entry.price_buy || 0);
                    profit = pkgProfit * (entry.quantity || 0);
                }
            } else if (productType === 'unidades') {
                // For units: use unit prices or unit_cost
                const unitSellPrice = entry.unit_price_sell || entry.price_sell || 0;
                const unitBuyPrice = entry.unit_cost || entry.price_buy || 0;
                profit = (unitSellPrice - unitBuyPrice) * (entry.quantity || 0);
            } else {
                // For packages: use package prices
                profit = ((entry.price_sell || 0) - (entry.price_buy || 0)) * (entry.quantity || 0);
            }

            // Build header section with edit/delete icons
            let html = '<div class="bg-white border-2 border-gray-200 rounded-lg p-3 shadow-sm" data-history-id="' + entry.id + '">' +
                '<div class="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">' +
                '<span class="text-sm text-gray-600 font-medium">📅 ' + date + '</span>' +
                '<div class="flex items-center gap-2">' +
                '<span class="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded font-medium">' + (entry.action_type || 'compra') + '</span>' +
                '<button onclick="editHistoryEntry(\'' + entry.id + '\')" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Editar">' +
                '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>' +
                '</button>' +
                '<button onclick="deleteHistoryEntry(\'' + entry.id + '\')" class="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Eliminar">' +
                '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>' +
                '</button>' +
                '</div>' +
                '</div>';

            // Quantity and Total Buy row
            html += '<div class="grid grid-cols-2 gap-2 text-sm mb-2">' +
                '<div class="bg-gray-50 rounded p-2"><span class="text-gray-500 text-xs block">Cantidad</span><span class="font-bold text-gray-800">' + (entry.quantity || 0) + '</span></div>' +
                (entry.total_buy ? '<div class="bg-gray-50 rounded p-2"><span class="text-gray-500 text-xs block">Total Compra</span><span class="font-bold text-gray-800">Bs ' + Number(entry.total_buy).toFixed(2) + '</span></div>' : '') +
                '</div>';

            // For "ambos" type - show PAQUETE and UNIDADES sections
            if (productType === 'ambos') {
                // PAQUETE Section
                html += '<div class="mb-2">' +
                    '<p class="text-xs font-bold text-gray-600 mb-1">paquete</p>' +
                    '<div class="grid grid-cols-2 gap-2 text-sm">' +
                    '<div class="bg-red-50 rounded p-2 border border-red-200"><span class="text-red-600 text-xs block font-medium">💰 Precio Compra</span><span class="font-bold text-red-600 text-lg">Bs ' + Number(entry.price_buy || 0).toFixed(2) + '</span></div>' +
                    '<div class="bg-green-50 rounded p-2 border border-green-200"><span class="text-green-600 text-xs block font-medium">🏷️ Precio Venta</span><span class="font-bold text-green-600 text-lg">Bs ' + Number(entry.price_sell || 0).toFixed(2) + '</span></div>' +
                    '</div></div>';

                // UNIDADES Section
                html += '<div class="mb-2">' +
                    '<p class="text-xs font-bold text-gray-600 mb-1">unidades</p>' +
                    '<div class="grid grid-cols-2 gap-2 text-sm">' +
                    '<div class="bg-red-50 rounded p-2 border border-red-200"><span class="text-red-600 text-xs block font-medium">💰 Precio Compra</span><span class="font-bold text-red-600 text-lg">Bs ' + Number(entry.unit_price_buy || entry.unit_cost || 0).toFixed(2) + '</span></div>' +
                    '<div class="bg-green-50 rounded p-2 border border-green-200"><span class="text-green-600 text-xs block font-medium">🏷️ Precio Venta</span><span class="font-bold text-green-600 text-lg">Bs ' + Number(entry.unit_price_sell || entry.price_sell || 0).toFixed(2) + '</span></div>' +
                    '</div></div>';
            } else {
                // Single section for paquete or unidades type
                html += '<div class="grid grid-cols-2 gap-2 text-sm mb-2">' +
                    '<div class="bg-red-50 rounded p-2 border border-red-200"><span class="text-red-600 text-xs block font-medium">💰 Precio Compra</span><span class="font-bold text-red-600 text-lg">Bs ' + Number(entry.price_buy || 0).toFixed(2) + '</span></div>' +
                    '<div class="bg-green-50 rounded p-2 border border-green-200"><span class="text-green-600 text-xs block font-medium">🏷️ Precio Venta</span><span class="font-bold text-green-600 text-lg">Bs ' + Number(entry.price_sell || 0).toFixed(2) + '</span></div>' +
                    '</div>';
            }

            // Unit Cost row (if exists)
            if (entry.unit_cost) {
                html += '<div class="bg-blue-50 rounded p-2 text-sm mb-2"><span class="text-blue-600 text-xs block">Costo Unitario</span><span class="font-bold text-blue-600">Bs ' + Number(entry.unit_cost).toFixed(2) + '</span></div>';
            }

            // Profit row - Show individual profit AND total profit for all types
            if (productType === 'ambos') {
                // Calculate package profit per unit
                const pkgProfit = (entry.price_sell || 0) - (entry.price_buy || 0);
                // Calculate unit profit per unit
                const unitProfit = (entry.unit_price_sell || 0) - (entry.unit_cost || 0);
                // Total profit (using unit profit as base since quantity is in units)
                const totalProfit = unitProfit * (entry.quantity || 0);

                html += '<div class="mb-2">' +
                    '<p class="text-xs font-bold text-green-700 mb-1">📈 Ganancia Estimada</p>' +
                    '<div class="grid grid-cols-2 gap-2 text-sm mb-2">' +
                    '<div class="bg-gradient-to-r from-blue-100 to-blue-50 rounded p-2 border border-blue-200">' +
                    '<span class="text-blue-600 text-xs block font-medium">Por Paquete</span>' +
                    '<span class="font-bold text-blue-700 text-lg">Bs ' + pkgProfit.toFixed(2) + '</span></div>' +
                    '<div class="bg-gradient-to-r from-green-100 to-green-50 rounded p-2 border border-green-200">' +
                    '<span class="text-green-600 text-xs block font-medium">Por Unidad</span>' +
                    '<span class="font-bold text-green-700 text-lg">Bs ' + unitProfit.toFixed(2) + '</span></div>' +
                    '</div>' +
                    '<div class="bg-gradient-to-r from-purple-100 to-purple-50 rounded p-2 border border-purple-200">' +
                    '<span class="text-purple-600 text-xs block font-medium">💰 Ganancia Total de Compra</span>' +
                    '<span class="font-bold text-purple-700 text-lg">Bs ' + totalProfit.toFixed(2) + '</span></div>' +
                    '</div>';
            } else if (productType === 'unidades') {
                // For unidades: show profit per unit AND total profit
                const unitSellPrice = entry.unit_price_sell || entry.price_sell || 0;
                const unitBuyPrice = entry.unit_cost || entry.price_buy || 0;
                const unitProfit = unitSellPrice - unitBuyPrice;
                const totalProfit = unitProfit * (entry.quantity || 0);

                html += '<div class="mb-2">' +
                    '<p class="text-xs font-bold text-green-700 mb-1">📈 Ganancia Estimada</p>' +
                    '<div class="grid grid-cols-2 gap-2 text-sm">' +
                    '<div class="bg-gradient-to-r from-green-100 to-green-50 rounded p-2 border border-green-200">' +
                    '<span class="text-green-600 text-xs block font-medium">Por Unidad</span>' +
                    '<span class="font-bold text-green-700 text-lg">Bs ' + unitProfit.toFixed(2) + '</span></div>' +
                    '<div class="bg-gradient-to-r from-purple-100 to-purple-50 rounded p-2 border border-purple-200">' +
                    '<span class="text-purple-600 text-xs block font-medium">💰 Total Compra</span>' +
                    '<span class="font-bold text-purple-700 text-lg">Bs ' + totalProfit.toFixed(2) + '</span></div>' +
                    '</div></div>';
            } else {
                // For paquete: show profit per package AND total profit
                const pkgProfit = (entry.price_sell || 0) - (entry.price_buy || 0);
                const totalProfit = pkgProfit * (entry.quantity || 0);

                html += '<div class="mb-2">' +
                    '<p class="text-xs font-bold text-green-700 mb-1">📈 Ganancia Estimada</p>' +
                    '<div class="grid grid-cols-2 gap-2 text-sm">' +
                    '<div class="bg-gradient-to-r from-blue-100 to-blue-50 rounded p-2 border border-blue-200">' +
                    '<span class="text-blue-600 text-xs block font-medium">Por Paquete</span>' +
                    '<span class="font-bold text-blue-700 text-lg">Bs ' + pkgProfit.toFixed(2) + '</span></div>' +
                    '<div class="bg-gradient-to-r from-purple-100 to-purple-50 rounded p-2 border border-purple-200">' +
                    '<span class="text-purple-600 text-xs block font-medium">💰 Total Compra</span>' +
                    '<span class="font-bold text-purple-700 text-lg">Bs ' + totalProfit.toFixed(2) + '</span></div>' +
                    '</div></div>';
            }

            // Expiry date (if exists)
            if (expiryDate) {
                html += '<div class="bg-orange-50 rounded p-2 text-sm mb-2"><span class="text-orange-600 text-xs block">📅 Vencimiento</span><span class="font-bold text-orange-600">' + expiryDate + '</span></div>';
            }

            // Notes (if exists)
            if (entry.notes) {
                html += '<p class="text-xs text-gray-400 mt-2 italic border-t pt-2">📝 ' + entry.notes + '</p>';
            }

            html += '</div>';
            return html;
        }).join('');
    } catch (err) {
        console.error('Error loading history:', err);
        listEl.innerHTML = '<div class="text-center text-red-400 py-4">Error al cargar</div>';
    }
}

function openAddHistoryEntry() {
    if (!currentHistoryProduct) return;

    // Verify modal exists before opening
    const modal = document.getElementById('add-history-modal');
    if (!modal) {
        console.error('add-history-modal not found');
        return;
    }

    const productType = currentHistoryProduct.product_type || 'unidades';

    document.getElementById('hist-product-type').value = productType;

    const unidadesBtn = document.getElementById('hist-type-unidades');
    const paqueteBtn = document.getElementById('hist-type-paquete');
    const ambosBtn = document.getElementById('hist-type-ambos');

    [unidadesBtn, paqueteBtn, ambosBtn].forEach(btn => {
        if (btn) btn.classList.remove('bg-blue-600', 'text-white');
        if (btn) btn.classList.add('bg-white', 'text-gray-900');
    });

    if (productType === 'unidades' && unidadesBtn) {
        unidadesBtn.classList.add('bg-blue-600', 'text-white');
        unidadesBtn.classList.remove('bg-white', 'text-gray-900');
    } else if (productType === 'paquete' && paqueteBtn) {
        paqueteBtn.classList.add('bg-blue-600', 'text-white');
        paqueteBtn.classList.remove('bg-white', 'text-gray-900');
    } else if (ambosBtn) {
        ambosBtn.classList.add('bg-blue-600', 'text-white');
        ambosBtn.classList.remove('bg-white', 'text-gray-900');
    }

    const unitsPerPkgContainer = document.getElementById('hist-units-per-pkg-container');
    const quantitySimpleContainer = document.getElementById('hist-quantity-simple-container');
    const quantityAmbosContainer = document.getElementById('hist-quantity-ambos-container');
    const costPkgContainer = document.getElementById('hist-cost-pkg-container');
    const costUnitContainer = document.getElementById('hist-cost-unit-container');
    const pricePkgContainer = document.getElementById('hist-price-pkg-container');
    const priceUnitContainer = document.getElementById('hist-price-unit-container');
    const profitPkgContainer = document.getElementById('hist-profit-pkg-container');
    const profitUnitContainer = document.getElementById('hist-profit-unit-container');
    const quantityLabel = document.getElementById('hist-quantity-label');

    [unitsPerPkgContainer, quantitySimpleContainer, quantityAmbosContainer,
        costPkgContainer, costUnitContainer, pricePkgContainer, priceUnitContainer,
        profitPkgContainer, profitUnitContainer].forEach(el => {
            if (el) el.classList.add('hidden');
        });

    if (productType === 'unidades') {
        quantitySimpleContainer?.classList.remove('hidden');
        costUnitContainer?.classList.remove('hidden');
        priceUnitContainer?.classList.remove('hidden');
        profitUnitContainer?.classList.remove('hidden');
        if (quantityLabel) quantityLabel.textContent = 'Stock a Agregar (Unidades)';

    } else if (productType === 'paquete') {
        quantitySimpleContainer?.classList.remove('hidden');
        unitsPerPkgContainer?.classList.remove('hidden');
        costPkgContainer?.classList.remove('hidden');
        pricePkgContainer?.classList.remove('hidden');
        profitPkgContainer?.classList.remove('hidden');
        if (quantityLabel) quantityLabel.textContent = 'Stock a Agregar (Paquetes)';

    } else {
        quantityAmbosContainer?.classList.remove('hidden');
        unitsPerPkgContainer?.classList.remove('hidden');
        costPkgContainer?.classList.remove('hidden');
        costUnitContainer?.classList.remove('hidden');
        pricePkgContainer?.classList.remove('hidden');
        priceUnitContainer?.classList.remove('hidden');
        profitPkgContainer?.classList.remove('hidden');
        profitUnitContainer?.classList.remove('hidden');
    }

    document.getElementById('hist-units-per-package').value = currentHistoryProduct.units_per_package || 1;
    document.getElementById('hist-quantity').value = 1;
    document.getElementById('hist-box-quantity').value = 0;
    document.getElementById('hist-loose-units').value = 0;
    document.getElementById('hist-price-buy').value = currentHistoryProduct.price_buy || 0;
    document.getElementById('hist-unit-cost').value = currentHistoryProduct.unit_cost || 0;
    document.getElementById('hist-price-sell').value = currentHistoryProduct.price_sell || 0;
    document.getElementById('hist-unit-price').value = currentHistoryProduct.unit_price_sell || 0;
    document.getElementById('hist-expiry-date').value = currentHistoryProduct.expiry_date || '';
    document.getElementById('hist-notes').value = '';

    calculateHistProfit();

    document.getElementById('add-history-modal').classList.remove('hidden');

    // Ocultar el FAB cuando se abre un modal en inventario
    if (window.appState && window.appState.currentTab === 'inventario') {
        const fabBtn = document.getElementById('fab-btn');
        if (fabBtn) fabBtn.classList.add('hidden');
    }
}

function closeAddHistoryModal() {
    document.getElementById('add-history-modal').classList.add('hidden');

    // Mostrar el FAB si estamos en inventario y no hay otros modales abiertos
    // Usamos 150ms para dar tiempo a que se abra otro modal
    if (window.appState && window.appState.currentTab === 'inventario') {
        setTimeout(() => {
            if (window.ui && !window.ui.hasOpenModals()) {
                const fabBtn = document.getElementById('fab-btn');
                if (fabBtn) fabBtn.classList.remove('hidden');
            }
        }, 150);
    }
}

// NOTE: calculateHistoryPackage and calculateHistoryProfit removed
// Now using: calculateHistCosts() and calculateHistProfit() (defined at end of file)



// Direct function called by form onsubmit
async function saveHistoryEntry(event) {
    event.preventDefault();

    if (!currentHistoryProduct) {
        window.ui.showToast('Error: No hay producto seleccionado', 'error');
        return false;
    }

    const productType = currentHistoryProduct.product_type || 'paquete';
    let quantity, priceBuy, priceSell, totalBuy, unitCost, unitsPerPackage, unitPriceBuy, unitPriceSell;

    if (productType === 'unidades') {
        // Simple: solo unidades
        quantity = parseInt(document.getElementById('hist-quantity').value) || 0;
        unitCost = parseFloat(document.getElementById('hist-unit-cost').value) || 0;
        priceBuy = unitCost;
        priceSell = parseFloat(document.getElementById('hist-unit-price').value) || 0;
        totalBuy = unitCost * quantity;
        unitsPerPackage = 1;
        unitPriceBuy = null;
        unitPriceSell = null;
    } else if (productType === 'paquete') {
        // Simple: solo paquetes
        quantity = parseInt(document.getElementById('hist-quantity').value) || 0;
        priceBuy = parseFloat(document.getElementById('hist-price-buy').value) || 0;
        priceSell = parseFloat(document.getElementById('hist-price-sell').value) || 0;
        totalBuy = priceBuy * quantity;
        unitCost = null;
        unitsPerPackage = parseInt(document.getElementById('hist-units-per-package').value) || 1;
        unitPriceBuy = null;
        unitPriceSell = null;
    } else { // ambos
        // Complejo: puede tener cajas + unidades sueltas
        const boxes = parseInt(document.getElementById('hist-box-quantity').value) || 0;
        const looseUnits = parseInt(document.getElementById('hist-loose-units').value) || 0;
        unitsPerPackage = parseInt(document.getElementById('hist-units-per-package').value) || 1;

        // Cantidad total en unidades
        quantity = (boxes * unitsPerPackage) + looseUnits;

        // Precios de paquete
        priceBuy = parseFloat(document.getElementById('hist-price-buy').value) || 0;
        priceSell = parseFloat(document.getElementById('hist-price-sell').value) || 0;

        // Precios unitarios
        unitCost = parseFloat(document.getElementById('hist-unit-cost').value) || 0;
        unitPriceBuy = unitCost;
        unitPriceSell = parseFloat(document.getElementById('hist-unit-price').value) || 0;

        // Total de compra: (cajas * precio_paquete) + (unidades_sueltas * costo_unitario)
        totalBuy = (boxes * priceBuy) + (looseUnits * unitCost);
    }

    const expiryDate = document.getElementById('hist-expiry-date').value || null;
    const notes = document.getElementById('hist-notes')?.value.trim() || '';

    try {
        console.log('Saving history entry...');

        // 1. Save history entry with all fields
        const historyData = {
            product_id: currentHistoryProduct.id,
            action_type: 'compra',
            quantity: quantity,
            total_buy: totalBuy,
            price_buy: priceBuy,
            price_sell: priceSell,
            unit_cost: unitCost,
            units_per_package: unitsPerPackage,
            unit_price_buy: unitPriceBuy,
            unit_price_sell: unitPriceSell,
            expiry_date: expiryDate,
            notes: notes || null
        };

        console.log('History data:', historyData);

        const { error: historyError } = await window.supabaseClient
            .from('product_history')
            .insert([historyData]);

        if (historyError) {
            console.error('History insert error:', historyError);
            throw historyError;
        }

        // 2. Update products table
        // Calculate new total stock
        let newTotalStock = currentHistoryProduct.quantity || 0;

        // quantity ya contiene el total correcto de unidades para todos los tipos
        // - unidades: cantidad de unidades
        // - paquete: cantidad de paquetes  
        // - ambos: (cajas * unitsPerPackage) + unidades sueltas
        newTotalStock += quantity;

        const productUpdate = {
            quantity: newTotalStock,
            price_buy: priceBuy,
            price_sell: priceSell,
            expiry_date: expiryDate
        };

        if (productType === 'ambos' || productType === 'paquete') {
            productUpdate.units_per_package = unitsPerPackage;
        }

        if (productType === 'ambos') {
            productUpdate.unit_price_sell = unitPriceSell;
            productUpdate.unit_cost = unitCost;
        }

        console.log('Product update:', productUpdate);

        const { error: updateError } = await window.supabaseClient
            .from('products')
            .update(productUpdate)
            .eq('id', currentHistoryProduct.id);

        if (updateError) {
            console.error('Product update error:', updateError);
            throw updateError;
        }

        // 3. Update local data
        currentHistoryProduct.quantity = newTotalStock;
        currentHistoryProduct.price_buy = productUpdate.price_buy;
        currentHistoryProduct.price_sell = priceSell;
        currentHistoryProduct.expiry_date = expiryDate;
        if (productType === 'ambos') {
            currentHistoryProduct.units_per_package = unitsPerPackage;
            currentHistoryProduct.unit_price_sell = unitPriceSell;
            currentHistoryProduct.unit_cost = unitCost;
        }

        closeAddHistoryModal();
        loadProductHistory(currentHistoryProduct.id, productType);
        // window.ui.showToast('✅ Compra registrada y producto actualizado');

        // Update local IndexedDB to sync immediately
        if (window.offlineDB && window.offlineDB.saveProduct) {
            await window.offlineDB.saveProduct(currentHistoryProduct, true);
        }

        if (window.app && window.app.fetchProducts) {
            await window.app.fetchProducts();
        }

    } catch (err) {
        console.error('Error saving:', err);
        window.ui.showToast('Error: ' + (err.message || 'Error desconocido'), 'error');
    }


    return false;
}

// ===== NUEVAS FUNCIONES PARA FORMULARIO REDISEÑADO =====

function calculateHistTotalStock() {
    const boxes = parseInt(document.getElementById('hist-box-quantity')?.value) || 0;
    const looseUnits = parseInt(document.getElementById('hist-loose-units')?.value) || 0;
    const unitsPerPkg = parseInt(document.getElementById('hist-units-per-package')?.value) || 1;

    const totalUnits = (boxes * unitsPerPkg) + looseUnits;

    document.getElementById('hist-quantity').value = totalUnits;
    document.getElementById('hist-total-stock-display').textContent = totalUnits + ' unidades';
    document.getElementById('hist-stock-display').textContent = boxes + ' Cajas + ' + looseUnits + ' Unid.';
}

function calculateHistCosts() {
    calculateHistProfit();
}

function calculateHistProfit() {
    if (!currentHistoryProduct) return;

    const productType = currentHistoryProduct.product_type || 'unidades';

    if (productType === 'paquete' || productType === 'ambos') {
        const pkgCost = parseFloat(document.getElementById('hist-price-buy')?.value) || 0;
        const pkgPrice = parseFloat(document.getElementById('hist-price-sell')?.value) || 0;
        const pkgProfit = pkgPrice - pkgCost;

        const profitPkgEl = document.getElementById('hist-profit-pkg');
        if (profitPkgEl) {
            profitPkgEl.textContent = 'Bs ' + pkgProfit.toFixed(2);
            profitPkgEl.className = 'block text-lg font-bold ' + (pkgProfit >= 0 ? 'text-green-700' : 'text-red-600');
        }
    }

    if (productType === 'unidades' || productType === 'ambos') {
        const unitCost = parseFloat(document.getElementById('hist-unit-cost')?.value) || 0;
        const unitPrice = parseFloat(document.getElementById('hist-unit-price')?.value) || 0;
        const unitProfit = unitPrice - unitCost;

        const profitUnitEl = document.getElementById('hist-profit-unit');
        if (profitUnitEl) {
            profitUnitEl.textContent = 'Bs ' + unitProfit.toFixed(2);
            profitUnitEl.className = 'block text-lg font-bold ' + (unitProfit >= 0 ? 'text-green-700' : 'text-red-600');
        }
    }
}

// Variable para almacenar datos del historial
let historyEntriesCache = [];

// Guardar datos del historial cuando se carga
const originalLoadProductHistory = loadProductHistory;
async function loadProductHistoryWithCache(productId, productType) {
    const listEl = document.getElementById('history-list');
    listEl.innerHTML = '<div class="text-center text-gray-400 py-4">Cargando...</div>';

    try {
        const { data, error } = await window.supabaseClient
            .from('product_history')
            .select('*')
            .eq('product_id', productId)
            .eq('action_type', 'compra')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Guardar en cache
        historyEntriesCache = data || [];

        if (!data || data.length === 0) {
            listEl.innerHTML = '<div class="text-center text-gray-400 py-8"><p class="text-2xl mb-2">📭</p><p>Sin historial</p><p class="text-xs">Registra tu primera compra</p></div>';
            return;
        }

        listEl.innerHTML = data.map((entry, idx) => {
            const date = new Date(entry.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' });
            const expiryDate = entry.expiry_date ? new Date(entry.expiry_date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' }) : null;

            // Calculate profit correctly based on what was purchased
            let profit = 0;

            if (productType === 'ambos') {
                if (entry.unit_price_sell && entry.unit_cost) {
                    const unitProfit = (entry.unit_price_sell - entry.unit_cost);
                    profit = unitProfit * (entry.quantity || 0);
                } else {
                    const pkgProfit = (entry.price_sell || 0) - (entry.price_buy || 0);
                    profit = pkgProfit * (entry.quantity || 0);
                }
            } else if (productType === 'unidades') {
                const unitSellPrice = entry.unit_price_sell || entry.price_sell || 0;
                const unitBuyPrice = entry.unit_cost || entry.price_buy || 0;
                profit = (unitSellPrice - unitBuyPrice) * (entry.quantity || 0);
            } else {
                profit = ((entry.price_sell || 0) - (entry.price_buy || 0)) * (entry.quantity || 0);
            }

            // Build header section with edit/delete icons
            let html = '<div class="bg-white border-2 border-gray-200 rounded-lg p-3 shadow-sm" data-history-id="' + entry.id + '">' +
                '<div class="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">' +
                '<span class="text-sm text-gray-600 font-medium">📅 ' + date + '</span>' +
                '<div class="flex items-center gap-2">' +
                '<span class="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded font-medium">' + (entry.action_type || 'compra') + '</span>' +
                '<button onclick="editHistoryEntry(\'' + entry.id + '\')" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Editar">' +
                '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>' +
                '</button>' +
                '<button onclick="deleteHistoryEntry(\'' + entry.id + '\')" class="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Eliminar">' +
                '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>' +
                '</button>' +
                '</div>' +
                '</div>';

            // Quantity and Total Buy row
            html += '<div class="grid grid-cols-2 gap-2 text-sm mb-2">' +
                '<div class="bg-gray-50 rounded p-2"><span class="text-gray-500 text-xs block">Cantidad</span><span class="font-bold text-gray-800">' + (entry.quantity || 0) + '</span></div>' +
                (entry.total_buy ? '<div class="bg-gray-50 rounded p-2"><span class="text-gray-500 text-xs block">Total Compra</span><span class="font-bold text-gray-800">Bs ' + Number(entry.total_buy).toFixed(2) + '</span></div>' : '') +
                '</div>';

            // For "ambos" type - show PAQUETE and UNIDADES sections
            if (productType === 'ambos') {
                html += '<div class="mb-2">' +
                    '<p class="text-xs font-bold text-gray-600 mb-1">paquete</p>' +
                    '<div class="grid grid-cols-2 gap-2 text-sm">' +
                    '<div class="bg-red-50 rounded p-2 border border-red-200"><span class="text-red-600 text-xs block font-medium">💰 Precio Compra</span><span class="font-bold text-red-600 text-lg">Bs ' + Number(entry.price_buy || 0).toFixed(2) + '</span></div>' +
                    '<div class="bg-green-50 rounded p-2 border border-green-200"><span class="text-green-600 text-xs block font-medium">🏷️ Precio Venta</span><span class="font-bold text-green-600 text-lg">Bs ' + Number(entry.price_sell || 0).toFixed(2) + '</span></div>' +
                    '</div></div>';

                html += '<div class="mb-2">' +
                    '<p class="text-xs font-bold text-gray-600 mb-1">unidades</p>' +
                    '<div class="grid grid-cols-2 gap-2 text-sm">' +
                    '<div class="bg-red-50 rounded p-2 border border-red-200"><span class="text-red-600 text-xs block font-medium">💰 Precio Compra</span><span class="font-bold text-red-600 text-lg">Bs ' + Number(entry.unit_price_buy || entry.unit_cost || 0).toFixed(2) + '</span></div>' +
                    '<div class="bg-green-50 rounded p-2 border border-green-200"><span class="text-green-600 text-xs block font-medium">🏷️ Precio Venta</span><span class="font-bold text-green-600 text-lg">Bs ' + Number(entry.unit_price_sell || entry.price_sell || 0).toFixed(2) + '</span></div>' +
                    '</div></div>';
            } else {
                html += '<div class="grid grid-cols-2 gap-2 text-sm mb-2">' +
                    '<div class="bg-red-50 rounded p-2 border border-red-200"><span class="text-red-600 text-xs block font-medium">💰 Precio Compra</span><span class="font-bold text-red-600 text-lg">Bs ' + Number(entry.price_buy || 0).toFixed(2) + '</span></div>' +
                    '<div class="bg-green-50 rounded p-2 border border-green-200"><span class="text-green-600 text-xs block font-medium">🏷️ Precio Venta</span><span class="font-bold text-green-600 text-lg">Bs ' + Number(entry.price_sell || 0).toFixed(2) + '</span></div>' +
                    '</div>';
            }

            // Unit Cost row (if exists)
            if (entry.unit_cost) {
                html += '<div class="bg-blue-50 rounded p-2 text-sm mb-2"><span class="text-blue-600 text-xs block">Costo Unitario</span><span class="font-bold text-blue-600">Bs ' + Number(entry.unit_cost).toFixed(2) + '</span></div>';
            }

            // Profit row - Show individual profit AND total profit for all types
            if (productType === 'ambos') {
                // Calculate package profit per unit
                const pkgProfit = (entry.price_sell || 0) - (entry.price_buy || 0);
                // Calculate unit profit per unit
                const unitProfit = (entry.unit_price_sell || 0) - (entry.unit_cost || 0);
                // Total profit (using unit profit as base since quantity is in units)
                const totalProfit = unitProfit * (entry.quantity || 0);

                html += '<div class="mb-2">' +
                    '<p class="text-xs font-bold text-green-700 mb-1">📈 Ganancia Estimada</p>' +
                    '<div class="grid grid-cols-2 gap-2 text-sm mb-2">' +
                    '<div class="bg-gradient-to-r from-blue-100 to-blue-50 rounded p-2 border border-blue-200">' +
                    '<span class="text-blue-600 text-xs block font-medium">Por Paquete</span>' +
                    '<span class="font-bold text-blue-700 text-lg">Bs ' + pkgProfit.toFixed(2) + '</span></div>' +
                    '<div class="bg-gradient-to-r from-green-100 to-green-50 rounded p-2 border border-green-200">' +
                    '<span class="text-green-600 text-xs block font-medium">Por Unidad</span>' +
                    '<span class="font-bold text-green-700 text-lg">Bs ' + unitProfit.toFixed(2) + '</span></div>' +
                    '</div>' +
                    '<div class="bg-gradient-to-r from-purple-100 to-purple-50 rounded p-2 border border-purple-200">' +
                    '<span class="text-purple-600 text-xs block font-medium">💰 Ganancia Total de Compra</span>' +
                    '<span class="font-bold text-purple-700 text-lg">Bs ' + totalProfit.toFixed(2) + '</span></div>' +
                    '</div>';
            } else if (productType === 'unidades') {
                // For unidades: show profit per unit AND total profit
                const unitSellPrice = entry.unit_price_sell || entry.price_sell || 0;
                const unitBuyPrice = entry.unit_cost || entry.price_buy || 0;
                const unitProfit = unitSellPrice - unitBuyPrice;
                const totalProfit = unitProfit * (entry.quantity || 0);

                html += '<div class="mb-2">' +
                    '<p class="text-xs font-bold text-green-700 mb-1">📈 Ganancia Estimada</p>' +
                    '<div class="grid grid-cols-2 gap-2 text-sm">' +
                    '<div class="bg-gradient-to-r from-green-100 to-green-50 rounded p-2 border border-green-200">' +
                    '<span class="text-green-600 text-xs block font-medium">Por Unidad</span>' +
                    '<span class="font-bold text-green-700 text-lg">Bs ' + unitProfit.toFixed(2) + '</span></div>' +
                    '<div class="bg-gradient-to-r from-purple-100 to-purple-50 rounded p-2 border border-purple-200">' +
                    '<span class="text-purple-600 text-xs block font-medium">💰 Total Compra</span>' +
                    '<span class="font-bold text-purple-700 text-lg">Bs ' + totalProfit.toFixed(2) + '</span></div>' +
                    '</div></div>';
            } else {
                // For paquete: show profit per package AND total profit
                const pkgProfit = (entry.price_sell || 0) - (entry.price_buy || 0);
                const totalProfit = pkgProfit * (entry.quantity || 0);

                html += '<div class="mb-2">' +
                    '<p class="text-xs font-bold text-green-700 mb-1">📈 Ganancia Estimada</p>' +
                    '<div class="grid grid-cols-2 gap-2 text-sm">' +
                    '<div class="bg-gradient-to-r from-blue-100 to-blue-50 rounded p-2 border border-blue-200">' +
                    '<span class="text-blue-600 text-xs block font-medium">Por Paquete</span>' +
                    '<span class="font-bold text-blue-700 text-lg">Bs ' + pkgProfit.toFixed(2) + '</span></div>' +
                    '<div class="bg-gradient-to-r from-purple-100 to-purple-50 rounded p-2 border border-purple-200">' +
                    '<span class="text-purple-600 text-xs block font-medium">💰 Total Compra</span>' +
                    '<span class="font-bold text-purple-700 text-lg">Bs ' + totalProfit.toFixed(2) + '</span></div>' +
                    '</div></div>';
            }

            // Expiry date (if exists)
            if (expiryDate) {
                html += '<div class="bg-orange-50 rounded p-2 text-sm mb-2"><span class="text-orange-600 text-xs block">📅 Vencimiento</span><span class="font-bold text-orange-600">' + expiryDate + '</span></div>';
            }

            // Notes (if exists)
            if (entry.notes) {
                html += '<p class="text-xs text-gray-400 mt-2 italic border-t pt-2">📝 ' + entry.notes + '</p>';
            }

            html += '</div>';
            return html;
        }).join('');
    } catch (err) {
        console.error('Error loading history:', err);
        listEl.innerHTML = '<div class="text-center text-red-400 py-4">Error al cargar</div>';
    }
}

// Reemplazar la función original
loadProductHistory = loadProductHistoryWithCache;

// Eliminar entrada del historial
async function deleteHistoryEntry(entryId) {
    if (!confirm('¿Estás seguro de eliminar esta compra del historial?')) return;

    try {
        // Buscar la entrada en el cache
        const entry = historyEntriesCache.find(e => e.id === entryId);
        if (!entry) {
            window.ui.showToast('Entrada no encontrada', 'error');
            return;
        }

        // Eliminar de la base de datos
        const { error } = await window.supabaseClient
            .from('product_history')
            .delete()
            .eq('id', entryId);

        if (error) throw error;

        // Actualizar el stock del producto (restar la cantidad)
        if (currentHistoryProduct) {
            const newStock = Math.max(0, (currentHistoryProduct.quantity || 0) - (entry.quantity || 0));

            const { error: updateError } = await window.supabaseClient
                .from('products')
                .update({ quantity: newStock })
                .eq('id', currentHistoryProduct.id);

            if (updateError) throw updateError;

            currentHistoryProduct.quantity = newStock;
        }

        window.ui.showToast('✅ Entrada eliminada');

        // Recargar historial
        if (currentHistoryProduct) {
            loadProductHistory(currentHistoryProduct.id, currentHistoryProduct.product_type);

            // Update local IndexedDB to sync immediately
            if (window.offlineDB && window.offlineDB.saveProduct) {
                await window.offlineDB.saveProduct(currentHistoryProduct, true);
            }
        }

        // Actualizar lista de productos
        if (window.app && window.app.fetchProducts) {
            await window.app.fetchProducts();
        }

    } catch (err) {
        console.error('Error deleting entry:', err);
        window.ui.showToast('Error al eliminar: ' + (err.message || 'Error desconocido'), 'error');
    }
}

// Variable para almacenar entrada en edición
let currentEditingEntry = null;

// Editar entrada del historial
function editHistoryEntry(entryId) {
    // Buscar la entrada en el cache
    const entry = historyEntriesCache.find(e => e.id === entryId);
    if (!entry) {
        window.ui.showToast('Entrada no encontrada', 'error');
        return;
    }

    currentEditingEntry = entry;

    // Abrir el modal de agregar historial pero con los datos existentes
    openAddHistoryEntry();

    // Cambiar el título del modal para indicar edición
    const modalTitle = document.querySelector('#add-history-modal h2');
    if (modalTitle) {
        modalTitle.textContent = '✏️ Editar Compra';
    }

    // Cambiar el botón de guardar
    const submitBtn = document.querySelector('#add-history-modal button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Actualizar Compra';
        submitBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        submitBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    }

    // Llenar los campos con los datos existentes
    setTimeout(() => {
        const productType = currentHistoryProduct?.product_type || 'unidades';

        if (productType === 'unidades') {
            document.getElementById('hist-quantity').value = entry.quantity || 0;
            document.getElementById('hist-unit-cost').value = entry.unit_cost || entry.price_buy || 0;
            document.getElementById('hist-unit-price').value = entry.unit_price_sell || entry.price_sell || 0;
        } else if (productType === 'paquete') {
            document.getElementById('hist-quantity').value = entry.quantity || 0;
            document.getElementById('hist-price-buy').value = entry.price_buy || 0;
            document.getElementById('hist-price-sell').value = entry.price_sell || 0;
            document.getElementById('hist-units-per-package').value = entry.units_per_package || 1;
        } else { // ambos
            const unitsPerPkg = entry.units_per_package || 1;
            const totalUnits = entry.quantity || 0;
            const boxes = Math.floor(totalUnits / unitsPerPkg);
            const loose = totalUnits % unitsPerPkg;

            document.getElementById('hist-box-quantity').value = boxes;
            document.getElementById('hist-loose-units').value = loose;
            document.getElementById('hist-units-per-package').value = unitsPerPkg;
            document.getElementById('hist-price-buy').value = entry.price_buy || 0;
            document.getElementById('hist-price-sell').value = entry.price_sell || 0;
            document.getElementById('hist-unit-cost').value = entry.unit_cost || 0;
            document.getElementById('hist-unit-price').value = entry.unit_price_sell || 0;

            calculateHistTotalStock();
        }

        document.getElementById('hist-expiry-date').value = entry.expiry_date || '';
        const notesEl = document.getElementById('hist-notes');
        if (notesEl) notesEl.value = entry.notes || '';

        calculateHistProfit();
    }, 100);
}

// Sobrescribir saveHistoryEntry para manejar edición
const originalSaveHistoryEntry = saveHistoryEntry;
window.saveHistoryEntryHandler = async function (event) {
    event.preventDefault();

    // Si estamos editando, actualizar en lugar de crear
    if (currentEditingEntry) {
        await updateHistoryEntry();
        return false;
    }

    // De lo contrario, usar la función original
    return originalSaveHistoryEntry(event);
};

// Función para actualizar una entrada existente
async function updateHistoryEntry() {
    if (!currentHistoryProduct || !currentEditingEntry) {
        window.ui.showToast('Error: No hay entrada seleccionada', 'error');
        return;
    }

    const productType = currentHistoryProduct.product_type || 'paquete';
    let quantity, priceBuy, priceSell, totalBuy, unitCost, unitsPerPackage, unitPriceBuy, unitPriceSell;
    const oldQuantity = currentEditingEntry.quantity || 0;

    if (productType === 'unidades') {
        quantity = parseInt(document.getElementById('hist-quantity').value) || 0;
        unitCost = parseFloat(document.getElementById('hist-unit-cost').value) || 0;
        priceBuy = unitCost;
        priceSell = parseFloat(document.getElementById('hist-unit-price').value) || 0;
        totalBuy = unitCost * quantity;
        unitsPerPackage = 1;
        unitPriceBuy = null;
        unitPriceSell = null;
    } else if (productType === 'paquete') {
        quantity = parseInt(document.getElementById('hist-quantity').value) || 0;
        priceBuy = parseFloat(document.getElementById('hist-price-buy').value) || 0;
        priceSell = parseFloat(document.getElementById('hist-price-sell').value) || 0;
        totalBuy = priceBuy * quantity;
        unitCost = null;
        unitsPerPackage = parseInt(document.getElementById('hist-units-per-package').value) || 1;
        unitPriceBuy = null;
        unitPriceSell = null;
    } else { // ambos
        const boxes = parseInt(document.getElementById('hist-box-quantity').value) || 0;
        const looseUnits = parseInt(document.getElementById('hist-loose-units').value) || 0;
        unitsPerPackage = parseInt(document.getElementById('hist-units-per-package').value) || 1;
        quantity = (boxes * unitsPerPackage) + looseUnits;
        priceBuy = parseFloat(document.getElementById('hist-price-buy').value) || 0;
        priceSell = parseFloat(document.getElementById('hist-price-sell').value) || 0;
        unitCost = parseFloat(document.getElementById('hist-unit-cost').value) || 0;
        unitPriceBuy = unitCost;
        unitPriceSell = parseFloat(document.getElementById('hist-unit-price').value) || 0;
        totalBuy = (boxes * priceBuy) + (looseUnits * unitCost);
    }

    const expiryDate = document.getElementById('hist-expiry-date').value || null;
    const notes = document.getElementById('hist-notes')?.value.trim() || '';

    try {
        // 1. Actualizar entrada del historial
        const historyData = {
            quantity: quantity,
            total_buy: totalBuy,
            price_buy: priceBuy,
            price_sell: priceSell,
            unit_cost: unitCost,
            units_per_package: unitsPerPackage,
            unit_price_buy: unitPriceBuy,
            unit_price_sell: unitPriceSell,
            expiry_date: expiryDate,
            notes: notes || null
        };

        const { error: historyError } = await window.supabaseClient
            .from('product_history')
            .update(historyData)
            .eq('id', currentEditingEntry.id);

        if (historyError) throw historyError;

        // 2. Actualizar stock del producto (diferencia entre cantidad nueva y antigua)
        const quantityDiff = quantity - oldQuantity;
        const newTotalStock = (currentHistoryProduct.quantity || 0) + quantityDiff;

        const productUpdate = {
            quantity: Math.max(0, newTotalStock),
            price_buy: priceBuy,
            price_sell: priceSell,
            expiry_date: expiryDate
        };

        if (productType === 'ambos' || productType === 'paquete') {
            productUpdate.units_per_package = unitsPerPackage;
        }

        if (productType === 'ambos') {
            productUpdate.unit_price_sell = unitPriceSell;
            productUpdate.unit_cost = unitCost;
        }

        const { error: updateError } = await window.supabaseClient
            .from('products')
            .update(productUpdate)
            .eq('id', currentHistoryProduct.id);

        if (updateError) throw updateError;

        // Actualizar datos locales
        currentHistoryProduct.quantity = Math.max(0, newTotalStock);
        currentHistoryProduct.price_buy = priceBuy;
        currentHistoryProduct.price_sell = priceSell;
        currentHistoryProduct.expiry_date = expiryDate;

        // Limpiar estado de edición
        currentEditingEntry = null;

        // Restaurar modal a estado normal
        const modalTitle = document.querySelector('#add-history-modal h2');
        if (modalTitle) {
            modalTitle.textContent = '➕ Nueva Compra';
        }
        const submitBtn = document.querySelector('#add-history-modal button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Guardar Compra';
            submitBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            submitBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        }

        closeAddHistoryModal();
        loadProductHistory(currentHistoryProduct.id, productType);
        window.ui.showToast('✅ Compra actualizada');

        // Update local IndexedDB to sync immediately
        if (window.offlineDB && window.offlineDB.saveProduct) {
            await window.offlineDB.saveProduct(currentHistoryProduct, true);
        }

        if (window.app && window.app.fetchProducts) {
            await window.app.fetchProducts();
        }

    } catch (err) {
        console.error('Error updating:', err);
        window.ui.showToast('Error: ' + (err.message || 'Error desconocido'), 'error');
    }
}

// Limpiar estado de edición al cerrar modal
const originalCloseAddHistoryModal = closeAddHistoryModal;
closeAddHistoryModal = function () {
    currentEditingEntry = null;

    // Restaurar modal a estado normal
    const modalTitle = document.querySelector('#add-history-modal h2');
    if (modalTitle) {
        modalTitle.textContent = '➕ Nueva Compra';
    }
    const submitBtn = document.querySelector('#add-history-modal button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Guardar Compra';
        submitBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        submitBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    }

    originalCloseAddHistoryModal();
};

// Exportar funciones globalmente
window.editHistoryEntry = editHistoryEntry;
window.deleteHistoryEntry = deleteHistoryEntry;
window.calculateHistTotalStock = calculateHistTotalStock;
window.calculateHistCosts = calculateHistCosts;
window.calculateHistProfit = calculateHistProfit;
