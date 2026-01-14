// realtime-sync.js - Supabase Realtime Subscriptions for Multi-Device Sync
// Receives instant notifications when products are updated from other devices

console.log('--- Loading realtime-sync.js ---');

const realtimeSync = (() => {
    let productChannel = null;
    let historyChannel = null;
    let isSubscribed = false;
    let lastRemoteUpdate = null;

    // Initialize realtime subscriptions
    async function init() {
        if (!window.api || !window.api.client) {
            console.warn('Supabase client not available for realtime');
            return;
        }

        if (isSubscribed) {
            console.log('Realtime already subscribed');
            return;
        }

        try {
            await subscribeToProducts();
            await subscribeToHistory();
            isSubscribed = true;
            console.log('✅ Realtime sync initialized - Multi-device ready');
        } catch (error) {
            console.error('Failed to initialize realtime:', error);
        }
    }

    // Subscribe to product changes
    async function subscribeToProducts() {
        const client = window.api.client;

        productChannel = client
            .channel('product-updates')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'products'
                },
                (payload) => {
                    console.log('📡 Product change from another device:', payload.eventType);
                    handleProductChange(payload);
                }
            )
            .subscribe((status) => {
                console.log('Product channel status:', status);
                if (status === 'SUBSCRIBED') {
                    updateRealtimeIndicator(true);
                }
            });
    }

    // Subscribe to history changes (sales)
    async function subscribeToHistory() {
        const client = window.api.client;

        historyChannel = client
            .channel('history-updates')
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'product_history'
                },
                (payload) => {
                    console.log('📡 New sale from another device detected');
                    handleHistoryChange(payload);
                }
            )
            .subscribe();
    }

    // Handle product changes from other devices
    function handleProductChange(payload) {
        const { eventType, new: newData, old: oldData } = payload;

        // Ignore changes we just made (within last 2 seconds)
        const now = Date.now();
        if (lastRemoteUpdate && (now - lastRemoteUpdate) < 2000) {
            return;
        }
        lastRemoteUpdate = now;

        if (eventType === 'UPDATE' && newData) {
            // Update local product data
            const index = window.appState.allProducts.findIndex(p => p.id === newData.id);

            if (index !== -1) {
                const oldQuantity = window.appState.allProducts[index].quantity;
                const newQuantity = newData.quantity;

                // Update the product
                window.appState.allProducts[index] = {
                    ...window.appState.allProducts[index],
                    ...newData
                };

                // Also update in IndexedDB
                if (window.offlineDB && window.offlineDB.db) {
                    window.offlineDB.db.products.put({
                        ...newData,
                        sync_status: 'synced'
                    }).catch(e => console.warn('Failed to update local DB:', e));
                }

                // Show notification if stock changed significantly
                if (oldQuantity !== newQuantity) {
                    showRemoteUpdateNotification(newData.name, oldQuantity, newQuantity);
                }

                // Refresh UI
                refreshUI();
            }
        } else if (eventType === 'INSERT' && newData) {
            // New product added from another device
            const exists = window.appState.allProducts.find(p => p.id === newData.id);
            if (!exists) {
                window.appState.allProducts.unshift(newData);

                // Also add to IndexedDB
                if (window.offlineDB && window.offlineDB.db) {
                    window.offlineDB.db.products.put({
                        ...newData,
                        sync_status: 'synced'
                    }).catch(console.warn);
                }

                refreshUI();

                if (window.ui && window.ui.showToast) {
                    window.ui.showToast(`📦 Nuevo producto: ${newData.name}`, 'info');
                }
            }
        } else if (eventType === 'DELETE' && oldData) {
            // Product deleted from another device
            window.appState.allProducts = window.appState.allProducts.filter(p => p.id !== oldData.id);

            // Also remove from IndexedDB
            if (window.offlineDB && window.offlineDB.db) {
                window.offlineDB.db.products.delete(oldData.id).catch(console.warn);
            }

            refreshUI();

            if (window.ui && window.ui.showToast) {
                window.ui.showToast(`🗑️ Producto eliminado: ${oldData.name}`, 'warning');
            }
        }
    }

    // Handle history changes (sales from other devices)
    function handleHistoryChange(payload) {
        const { new: newData } = payload;

        if (newData && newData.action_type === 'venta') {
            // A sale happened on another device
            // The product stock will be updated via product channel
            // Just show a subtle notification
            const productName = newData.product_name || 'Producto';
            console.log(`🛒 Venta en otro dispositivo: ${productName}`);

            // Flash the sync indicator
            flashSyncIndicator();
        }
    }

    // Show notification for remote stock update
    function showRemoteUpdateNotification(productName, oldQty, newQty) {
        const diff = newQty - oldQty;
        let message;

        if (diff < 0) {
            // Stock decreased (sale on other device)
            message = `📱 ${productName}: ${Math.abs(diff)} vendido(s) en otro dispositivo`;
        } else {
            // Stock increased (restock on other device)
            message = `📦 ${productName}: +${diff} agregado(s)`;
        }

        if (window.ui && window.ui.showToast) {
            window.ui.showToast(message, 'info');
        }
    }

    // Refresh UI after remote changes - RESPECTING ACTIVE FILTERS
    function refreshUI() {
        // Check if we're on the inventory tab
        const isInventoryTab = window.appState.currentTab === 'inventario';

        // Refresh inventory list ONLY if we should
        if (window.ui && window.ui.renderProductList && isInventoryTab) {
            // Check for active filters from filter-menu.js
            // filterMenu stores its state internally, we need to check if a filter is active

            // Check 1: Search filter (single product search from filterMenu)
            const fabBadge = document.getElementById('fab-filter-badge');
            const hasActiveFilter = fabBadge && !fabBadge.classList.contains('hidden');

            if (hasActiveFilter) {
                // A filter is active - don't change the displayed products
                // Just update the data in window.appState.allProducts (already done)
                // The currently displayed products should stay the same
                console.log('📌 Filter active - keeping current view, only updating data');

                // However, we should update the displayed product if it's the one that changed
                // Re-render with the same filter by not calling renderProductList
                // The data is already updated in allProducts
                return; // Don't refresh the product list - keep the filter intact
            }

            // Check 2: Category filter (from appState or categoryFilter)
            if (window.appState.activeCategory) {
                const filtered = window.appState.allProducts.filter(p => p.category === window.appState.activeCategory);
                window.ui.renderProductList(filtered, 'product-list');
            } else {
                // No filter active - show all products
                window.ui.renderProductList(window.appState.allProducts, 'product-list');
            }
        }

        // Refresh sales grid - RESPECTING ACTIVE SEARCH FILTER
        if (window.sales && window.sales.renderProducts) {
            // Check if salesSearch has an active filter (search query or category)
            const salesHasFilter = window.salesSearch && window.salesSearch.hasActiveFilter && window.salesSearch.hasActiveFilter();

            if (salesHasFilter) {
                // Sales search is active - don't reset the view
                console.log('📌 Sales filter active - keeping current view');
                // Data in allProducts is already updated, the current filtered view stays
            } else {
                // No filter in sales - safe to refresh
                window.sales.renderProducts();
            }
        }

        // Update restock badge
        if (window.restockList && window.restockList.updateBadge) {
            window.restockList.updateBadge();
        }
    }

    // Update sync indicator to show realtime is active
    function updateRealtimeIndicator(connected) {
        const indicator = document.getElementById('sync-status');
        if (indicator) {
            if (connected) {
                indicator.classList.remove('bg-yellow-400');
                indicator.classList.add('bg-green-400');
                indicator.title = 'Tiempo real activo';
                // Add pulse effect
                indicator.classList.add('shadow-[0_0_8px_rgba(74,222,128,0.8)]');
            } else {
                indicator.classList.remove('bg-green-400');
                indicator.classList.add('bg-yellow-400');
                indicator.title = 'Sincronizando...';
            }
        }
    }

    // Flash sync indicator when remote activity detected
    function flashSyncIndicator() {
        const indicator = document.getElementById('sync-status');
        if (indicator) {
            indicator.classList.add('animate-ping');
            setTimeout(() => {
                indicator.classList.remove('animate-ping');
            }, 500);
        }
    }

    // Unsubscribe from all channels
    function cleanup() {
        if (productChannel) {
            productChannel.unsubscribe();
            productChannel = null;
        }
        if (historyChannel) {
            historyChannel.unsubscribe();
            historyChannel = null;
        }
        isSubscribed = false;
        console.log('Realtime channels unsubscribed');
    }

    // Force refresh from server (manual sync button)
    async function forceRefresh() {
        console.log('🔄 Force refreshing from server...');

        if (window.syncManager && window.syncManager.syncFromCloud) {
            await window.syncManager.syncFromCloud();
        }

        if (window.app && window.app.fetchProducts) {
            await window.app.fetchProducts();
        }

        if (window.ui && window.ui.showToast) {
            window.ui.showToast('✅ Datos actualizados', 'success');
        }
    }

    // Mark that we just made a local change (to avoid duplicate notifications)
    function markLocalChange() {
        lastRemoteUpdate = Date.now();
    }

    // Export
    return {
        init,
        cleanup,
        forceRefresh,
        markLocalChange,
        updateRealtimeIndicator
    };
})();

// Expose globally
window.realtimeSync = realtimeSync;

// Initialize after DOM is ready and Supabase is available
function initRealtimeWhenReady() {
    if (window.api && window.api.client && window.appState) {
        realtimeSync.init();
    } else {
        // Wait and retry
        setTimeout(initRealtimeWhenReady, 1000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initRealtimeWhenReady, 2000);
    });
} else {
    setTimeout(initRealtimeWhenReady, 2000);
}

console.log('--- realtime-sync.js loaded successfully ---');
