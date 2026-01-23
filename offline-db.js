// offline-db.js - IndexedDB Database with Dexie.js
// Provides offline-first data storage with sync capabilities

console.log('--- Loading offline-db.js ---');

// Initialize Dexie database
const db = new Dexie('CloudStoreDB');

// Define schema - Version 1
db.version(1).stores({
    // Products table - mirrors Supabase products table
    products: 'id, name, category, created_at, updated_at, sync_status',

    // Product history - purchases and sales
    product_history: 'id, product_id, action_type, created_at, sync_status',

    // Pending operations queue - for offline changes
    pending_operations: '++id, table_name, operation_type, record_id, created_at',

    // Image cache - store images as blobs
    image_cache: 'url, blob, cached_at'
});

// Sync status constants
const SYNC_STATUS = {
    SYNCED: 'synced',      // Data is in sync with cloud
    PENDING: 'pending',     // Local changes not yet synced
    CONFLICT: 'conflict'    // Conflict detected during sync
};

// Operation types for pending queue
const OPERATION_TYPE = {
    INSERT: 'insert',
    UPDATE: 'update',
    DELETE: 'delete'
};

// --- Products Operations ---

async function dbGetAllProducts() {
    // Get all products and sort by created_at (handling null values)
    const products = await db.products.toArray();
    return products.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB - dateA; // Descending order (newest first)
    });
}

async function dbGetProduct(id) {
    return await db.products.get(id);
}

async function dbSaveProduct(productData, isUpdate = false) {
    const now = new Date().toISOString();
    let record;

    if (isUpdate) {
        // For updates, get existing record first to preserve all fields
        const existingProduct = await db.products.get(productData.id);
        if (existingProduct) {
            // Merge: existing data + new data + updated timestamp
            record = {
                ...existingProduct,
                ...productData,
                updated_at: now,
                sync_status: SYNC_STATUS.PENDING,
                // Preserve original created_at
                created_at: existingProduct.created_at || now
            };
        } else {
            // Product doesn't exist locally, treat as insert
            record = {
                ...productData,
                created_at: now,
                updated_at: now,
                sync_status: SYNC_STATUS.PENDING
            };
        }
    } else {
        // New product
        record = {
            ...productData,
            created_at: now,
            updated_at: now,
            sync_status: SYNC_STATUS.PENDING
        };
    }

    // Save to local database
    await db.products.put(record);

    // Queue for sync
    await dbQueueOperation('products', isUpdate ? OPERATION_TYPE.UPDATE : OPERATION_TYPE.INSERT, productData.id, record);

    return record;
}

async function dbDeleteProduct(id) {
    // Mark as deleted locally (soft delete for sync purposes)
    await db.products.delete(id);

    // Queue delete operation for sync
    await dbQueueOperation('products', OPERATION_TYPE.DELETE, id, null);

    return true;
}

async function dbUpdateProductStock(productId, newQuantity) {
    const product = await db.products.get(productId);
    if (!product) throw new Error('Product not found');

    const now = new Date().toISOString();
    product.quantity = newQuantity;
    product.updated_at = now;
    product.sync_status = SYNC_STATUS.PENDING;

    await db.products.put(product);
    await dbQueueOperation('products', OPERATION_TYPE.UPDATE, productId, { id: productId, quantity: newQuantity });

    return true;
}

// DIRECT UPDATE: Update stock without creating pending operations
// Use this when we've already synced directly with cloud (e.g., after RPC)
// This prevents sync-manager from blocking cloud updates due to "pending changes"
async function dbUpdateProductStockDirect(productId, newQuantity) {
    const product = await db.products.get(productId);
    if (!product) {
        console.warn('Product not found for direct update:', productId);
        return false;
    }

    const now = new Date().toISOString();
    product.quantity = newQuantity;
    product.updated_at = now;
    product.sync_status = SYNC_STATUS.SYNCED; // Mark as SYNCED, not PENDING

    await db.products.put(product);
    // NO queue operation - we've already synced directly

    console.log(`📌 Stock updated directly (no queue): ${product.name} = ${newQuantity}`);
    return true;
}

// --- History Operations ---

async function dbGetProductHistory(productId) {
    return await db.product_history
        .where('product_id')
        .equals(productId)
        .reverse()
        .sortBy('created_at');
}

async function dbSaveHistoryEntry(historyData) {
    const now = new Date().toISOString();

    const record = {
        ...historyData,
        id: historyData.id || crypto.randomUUID(),
        created_at: now,
        sync_status: SYNC_STATUS.PENDING
    };

    await db.product_history.put(record);
    await dbQueueOperation('product_history', OPERATION_TYPE.INSERT, record.id, record);

    return record;
}

async function dbDeleteHistoryEntry(historyId) {
    await db.product_history.delete(historyId);
    await dbQueueOperation('product_history', OPERATION_TYPE.DELETE, historyId, null);
    return true;
}

async function dbGetSalesHistory() {
    return await db.product_history
        .where('action_type')
        .equals('venta')
        .reverse()
        .sortBy('created_at');
}

// --- Pending Operations Queue ---

async function dbQueueOperation(tableName, operationType, recordId, data) {
    await db.pending_operations.add({
        table_name: tableName,
        operation_type: operationType,
        record_id: recordId,
        data: data,
        created_at: new Date().toISOString()
    });

    // Update pending count UI
    updatePendingCountUI();
}

async function dbGetPendingOperations() {
    return await db.pending_operations.orderBy('created_at').toArray();
}

async function dbClearPendingOperation(id) {
    await db.pending_operations.delete(id);
    updatePendingCountUI();
}

async function dbClearAllPendingOperations() {
    await db.pending_operations.clear();
    updatePendingCountUI();
}

async function dbGetPendingCount() {
    return await db.pending_operations.count();
}

// --- Image Cache Operations ---

async function dbCacheImage(url, blob) {
    await db.image_cache.put({
        url: url,
        blob: blob,
        cached_at: new Date().toISOString()
    });
}

async function dbGetCachedImage(url) {
    const cached = await db.image_cache.get(url);
    return cached ? cached.blob : null;
}

// Get image from cache or fetch from network and cache it
async function dbGetOrFetchImage(url) {
    if (!url || url.startsWith('data:')) return url; // Skip data URIs

    try {
        // Check cache first
        const cached = await db.image_cache.get(url);
        if (cached && cached.blob) {
            // Return cached blob as object URL
            return URL.createObjectURL(cached.blob);
        }

        // Not in cache - fetch from network
        const response = await fetch(url);
        if (!response.ok) throw new Error('Fetch failed');

        const blob = await response.blob();

        // Cache the blob
        await db.image_cache.put({
            url: url,
            blob: blob,
            cached_at: new Date().toISOString()
        });

        console.log('📸 Image cached:', url.substring(0, 50) + '...');
        return URL.createObjectURL(blob);
    } catch (error) {
        console.warn('Image cache error:', error.message);
        return url; // Fallback to original URL
    }
}

// Clear all cached images
async function dbClearImageCache() {
    const count = await db.image_cache.count();
    await db.image_cache.clear();
    console.log(`🗑️ Cleared ${count} cached images`);
    return count;
}

// Delete a specific cached image (call when product image is changed)
async function dbDeleteCachedImage(url) {
    await db.image_cache.delete(url);
}

// --- Bulk Operations for Sync ---

async function dbBulkPutProducts(products) {
    // Mark all as synced
    const records = products.map(p => ({
        ...p,
        sync_status: SYNC_STATUS.SYNCED
    }));
    await db.products.bulkPut(records);
}

async function dbBulkPutHistory(historyEntries) {
    const records = historyEntries.map(h => ({
        ...h,
        sync_status: SYNC_STATUS.SYNCED
    }));
    await db.product_history.bulkPut(records);
}

async function dbMarkAsSynced(tableName, id) {
    if (tableName === 'products') {
        await db.products.update(id, { sync_status: SYNC_STATUS.SYNCED });
    } else if (tableName === 'product_history') {
        await db.product_history.update(id, { sync_status: SYNC_STATUS.SYNCED });
    }
}

// --- UI Helper ---

function updatePendingCountUI() {
    dbGetPendingCount().then(count => {
        const badge = document.getElementById('sync-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count + ' pendiente' + (count > 1 ? 's' : '');
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    });
}

// --- Export ---

window.offlineDB = {
    db,
    SYNC_STATUS,
    OPERATION_TYPE,

    // Products
    getAllProducts: dbGetAllProducts,
    getProduct: dbGetProduct,
    saveProduct: dbSaveProduct,
    deleteProduct: dbDeleteProduct,
    updateProductStock: dbUpdateProductStock,
    updateProductStockDirect: dbUpdateProductStockDirect, // Direct update without pending queue

    // History
    getProductHistory: dbGetProductHistory,
    saveHistoryEntry: dbSaveHistoryEntry,
    deleteHistoryEntry: dbDeleteHistoryEntry,
    getSalesHistory: dbGetSalesHistory,

    // Pending Queue
    queueOperation: dbQueueOperation,
    getPendingOperations: dbGetPendingOperations,
    clearPendingOperation: dbClearPendingOperation,
    clearAllPendingOperations: dbClearAllPendingOperations,
    getPendingCount: dbGetPendingCount,

    // Image Cache
    cacheImage: dbCacheImage,
    getCachedImage: dbGetCachedImage,
    getOrFetchImage: dbGetOrFetchImage,
    clearImageCache: dbClearImageCache,
    deleteCachedImage: dbDeleteCachedImage,

    // Bulk Sync
    bulkPutProducts: dbBulkPutProducts,
    bulkPutHistory: dbBulkPutHistory,
    markAsSynced: dbMarkAsSynced,

    // Recovery: Clear local and reload from cloud
    clearAndReloadFromCloud: async function () {
        console.log('Clearing local database...');
        await db.products.clear();
        await db.product_history.clear();
        await db.pending_operations.clear();
        console.log('Local database cleared. Reload the page to sync from cloud.');
        return true;
    },

    // UI
    updatePendingCountUI
};

console.log('--- offline-db.js loaded successfully ---');
