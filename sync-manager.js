// sync-manager.js - Synchronization between IndexedDB and Supabase
// Handles bidirectional sync with "last write wins" conflict resolution

console.log('--- Loading sync-manager.js ---');

const syncManager = (() => {
    let isSyncing = false;
    let syncInterval = null;
    const SYNC_INTERVAL_MS = 30000; // Auto-sync every 30 seconds when online

    // --- Network Status ---

    function isOnline() {
        return navigator.onLine;
    }

    function updateOnlineStatusUI() {
        const indicator = document.getElementById('online-indicator');
        const statusText = document.getElementById('online-status-text');

        if (indicator) {
            if (isOnline()) {
                indicator.classList.remove('bg-red-500', 'bg-gray-400');
                indicator.classList.add('bg-green-500');
                indicator.title = 'Conectado';
            } else {
                indicator.classList.remove('bg-green-500', 'bg-gray-400');
                indicator.classList.add('bg-red-500');
                indicator.title = 'Sin conexión';
            }
        }

        if (statusText) {
            statusText.textContent = isOnline() ? 'Online' : 'Offline';
        }
    }

    // --- Sync to Cloud (Push local changes) ---

    async function syncToCloud() {
        if (!isOnline()) {
            console.log('Sync skipped: offline');
            return { success: false, reason: 'offline' };
        }

        if (isSyncing) {
            console.log('Sync skipped: already syncing');
            return { success: false, reason: 'already_syncing' };
        }

        isSyncing = true;
        updateSyncStatusUI('syncing');

        try {
            const pendingOps = await window.offlineDB.getPendingOperations();

            if (pendingOps.length === 0) {
                console.log('No pending operations to sync');
                isSyncing = false;
                updateSyncStatusUI('idle');
                return { success: true, synced: 0 };
            }

            console.log(`Syncing ${pendingOps.length} pending operations...`);
            let syncedCount = 0;
            let errorCount = 0;

            for (const op of pendingOps) {
                try {
                    await processPendingOperation(op);
                    await window.offlineDB.clearPendingOperation(op.id);
                    syncedCount++;
                } catch (error) {
                    console.error(`Failed to sync operation ${op.id}:`, error);
                    errorCount++;
                }
            }

            console.log(`Sync complete: ${syncedCount} synced, ${errorCount} errors`);

            isSyncing = false;
            updateSyncStatusUI('idle');
            window.offlineDB.updatePendingCountUI();

            return { success: true, synced: syncedCount, errors: errorCount };

        } catch (error) {
            console.error('Sync to cloud failed:', error);
            isSyncing = false;
            updateSyncStatusUI('error');
            return { success: false, reason: error.message };
        }
    }

    async function processPendingOperation(op) {
        const { table_name, operation_type, record_id, data } = op;

        if (table_name === 'products') {
            if (operation_type === 'insert') {
                await supabaseInsertProduct(data);
            } else if (operation_type === 'update') {
                await supabaseUpdateProduct(data);
            } else if (operation_type === 'delete') {
                await supabaseDeleteProduct(record_id);
            }
        } else if (table_name === 'product_history') {
            if (operation_type === 'insert') {
                await supabaseInsertHistory(data);
            } else if (operation_type === 'delete') {
                await supabaseDeleteHistory(record_id);
            }
        }

        // Mark local record as synced
        if (operation_type !== 'delete' && data) {
            await window.offlineDB.markAsSynced(table_name, record_id);
        }
    }

    // --- Supabase Operations ---

    async function supabaseInsertProduct(data) {
        // Check if Supabase client is available
        if (!window.api || !window.api.client) {
            throw new Error('Supabase client not available');
        }

        // Remove local-only fields (sync_status and updated_at don't exist in Supabase)
        const { sync_status, updated_at, ...cleanData } = data;

        console.log('Upserting product to cloud:', cleanData.id);

        const { error } = await window.api.client
            .from('products')
            .upsert([cleanData], { onConflict: 'id' });

        if (error) {
            console.error('Supabase upsert error:', error);
            throw error;
        }
        console.log('Product upserted successfully:', cleanData.id);
    }

    async function supabaseUpdateProduct(data) {
        if (!window.api || !window.api.client) {
            throw new Error('Supabase client not available');
        }

        // Remove local-only fields (sync_status and updated_at don't exist in Supabase)
        const { sync_status, updated_at, ...cleanData } = data;

        console.log('Updating product in cloud:', cleanData.id);

        const { error } = await window.api.client
            .from('products')
            .update(cleanData)
            .eq('id', data.id);

        if (error) {
            console.error('Supabase update error:', error);
            throw error;
        }
        console.log('Product updated successfully:', cleanData.id);
    }

    async function supabaseDeleteProduct(id) {
        const { error } = await window.api.client
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async function supabaseInsertHistory(data) {
        // Remove local-only fields
        const { sync_status, updated_at, ...cleanData } = data;

        const { error } = await window.api.client
            .from('product_history')
            .upsert([cleanData], { onConflict: 'id' });

        if (error) throw error;
    }

    async function supabaseDeleteHistory(id) {
        const { error } = await window.api.client
            .from('product_history')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // --- Sync from Cloud (Pull cloud data) ---

    async function syncFromCloud() {
        if (!isOnline()) {
            console.log('Pull skipped: offline');
            return { success: false, reason: 'offline' };
        }

        if (isSyncing) {
            console.log('Pull skipped: already syncing');
            return { success: false, reason: 'already_syncing' };
        }

        isSyncing = true;
        updateSyncStatusUI('syncing');

        try {
            // Fetch all products from Supabase
            const { data: cloudProducts, error: productError } = await window.api.client
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (productError) throw productError;

            // Get local products to check for conflicts
            const localProducts = await window.offlineDB.getAllProducts();
            const localPending = await window.offlineDB.getPendingOperations();

            // Get IDs of products with pending changes
            const pendingProductIds = new Set(
                localPending
                    .filter(op => op.table_name === 'products')
                    .map(op => op.record_id)
            );

            // Merge: Cloud wins EXCEPT for products with pending local changes
            const productsToSave = cloudProducts.map(cloudProduct => {
                if (pendingProductIds.has(cloudProduct.id)) {
                    // Keep local version if we have pending changes
                    const localProduct = localProducts.find(p => p.id === cloudProduct.id);
                    if (localProduct && localProduct.updated_at > cloudProduct.updated_at) {
                        console.log(`Keeping local version of ${cloudProduct.id} (pending changes)`);
                        return localProduct;
                    }
                }
                return cloudProduct;
            });

            // Save to local DB
            await window.offlineDB.bulkPutProducts(productsToSave);

            // Also sync history (sales records)
            const { data: cloudHistory, error: historyError } = await window.api.client
                .from('product_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500); // Limit to last 500 entries

            if (historyError) throw historyError;

            if (cloudHistory && cloudHistory.length > 0) {
                await window.offlineDB.bulkPutHistory(cloudHistory);
            }

            console.log(`Synced ${productsToSave.length} products and ${cloudHistory?.length || 0} history entries from cloud`);

            isSyncing = false;
            updateSyncStatusUI('idle');

            return {
                success: true,
                products: productsToSave.length,
                history: cloudHistory?.length || 0
            };

        } catch (error) {
            console.error('Sync from cloud failed:', error);
            isSyncing = false;
            updateSyncStatusUI('error');
            return { success: false, reason: error.message };
        }
    }

    // --- Full Sync (Bidirectional) ---

    async function fullSync() {
        console.log('Starting full sync...');

        // First push local changes
        const pushResult = await syncToCloud();

        // Then pull cloud data
        const pullResult = await syncFromCloud();

        // Check for pending operations after sync
        const pendingCount = await window.offlineDB.getPendingCount();

        // Show user notification based on actual results
        if (window.ui && window.ui.showToast) {
            if (!isOnline()) {
                window.ui.showToast('📴 Sin conexión', 'warning');
            } else if (pendingCount > 0) {
                window.ui.showToast(`⚠️ ${pendingCount} operaciones pendientes`, 'warning');
            } else if (pushResult.success && pullResult.success) {
                window.ui.showToast('✅ Sincronizado!', 'success');
            } else {
                window.ui.showToast('⚠️ Error en sincronización', 'error');
            }
        }

        return { push: pushResult, pull: pullResult };
    }

    // --- Auto-sync ---

    function startAutoSync() {
        if (syncInterval) return;

        syncInterval = setInterval(() => {
            if (isOnline()) {
                syncToCloud().catch(console.error);
            }
        }, SYNC_INTERVAL_MS);

        console.log('Auto-sync started');
    }

    function stopAutoSync() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
            console.log('Auto-sync stopped');
        }
    }

    // --- UI Status ---

    function updateSyncStatusUI(status) {
        const syncIcon = document.getElementById('sync-icon');
        const syncBtn = document.getElementById('sync-btn');

        if (syncIcon) {
            if (status === 'syncing') {
                syncIcon.classList.add('animate-spin');
            } else {
                syncIcon.classList.remove('animate-spin');
            }
        }

        if (syncBtn) {
            syncBtn.disabled = status === 'syncing';
        }
    }

    // --- Initialize ---

    async function init() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('Network: online');
            updateOnlineStatusUI();
            // Auto-sync when coming back online
            setTimeout(() => fullSync(), 1000);
        });

        window.addEventListener('offline', () => {
            console.log('Network: offline');
            updateOnlineStatusUI();
        });

        // Initial status update
        updateOnlineStatusUI();
        if (window.offlineDB && window.offlineDB.updatePendingCountUI) {
            window.offlineDB.updatePendingCountUI();
        }

        // Start auto-sync
        startAutoSync();

        // CRITICAL: If online, sync from cloud IMMEDIATELY to recover any lost data
        // This ensures that after clearing cache, data is restored from Supabase
        if (isOnline()) {
            console.log('📡 Online detected - syncing from cloud immediately...');
            try {
                await syncFromCloud();
                console.log('✅ Initial cloud sync complete');
            } catch (err) {
                console.warn('Initial cloud sync failed:', err);
            }

            // Then push any pending local changes
            setTimeout(() => syncToCloud().catch(console.error), 1000);
        }
    }

    // Force sync from cloud - useful for data recovery after cache clear
    async function forceCloudSync() {
        if (!isOnline()) {
            console.warn('Cannot force sync: offline');
            return { success: false, reason: 'offline' };
        }

        console.log('🔄 Forcing cloud sync...');
        updateSyncStatusUI('syncing');

        try {
            // Clear local pending ops that might conflict
            if (window.offlineDB && window.offlineDB.db) {
                // Don't clear pending - just prioritize cloud data
            }

            const result = await syncFromCloud();
            updateSyncStatusUI('idle');

            if (window.ui && window.ui.showToast) {
                window.ui.showToast('✅ Datos sincronizados desde la nube', 'success');
            }

            return result;
        } catch (err) {
            updateSyncStatusUI('error');
            console.error('Force sync failed:', err);
            return { success: false, reason: err.message };
        }
    }

    // --- Export ---

    return {
        init,
        isOnline,
        syncToCloud,
        syncFromCloud,
        fullSync,
        forceCloudSync,
        startAutoSync,
        stopAutoSync,
        updateOnlineStatusUI
    };
})();

// Expose globally
window.syncManager = syncManager;

console.log('--- sync-manager.js loaded successfully ---');
