// api.js - Supabase Interaction Module with Offline-First Support
console.log('--- Loading api.js ---');

// Ensure window.api exists immediately
window.api = window.api || {};

const SUPABASE_URL = 'https://fctogwqiwtuldqhpoqtq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjdG9nd3Fpd3R1bGRxaHBvcXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjEyMzksImV4cCI6MjA4MDQzNzIzOX0.c_QRAob0LLfeZKQqemanwPtdDQj24tKj7VWJbCNuqTA';

// Initialize Supabase Client
let supabaseClient;
try {
    if (typeof supabase === 'undefined') {
        console.warn('Supabase library not loaded. Running in offline-only mode.');
        supabaseClient = null;
    } else {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
    }
} catch (error) {
    console.error('Supabase initialization failed:', error);
    supabaseClient = null;
}

// --- Helper: Check if offline DB is available ---
function hasOfflineDB() {
    return window.offlineDB && window.offlineDB.db;
}

// --- Helper: Check if online and Supabase available ---
function canUseCloud() {
    return navigator.onLine && supabaseClient;
}

// --- Products API (Offline-First) ---

async function apiFetchProducts() {
    // OFFLINE-FIRST: Always return local data first
    if (hasOfflineDB()) {
        const localProducts = await window.offlineDB.getAllProducts();

        // If we have local data, return it immediately
        if (localProducts && localProducts.length > 0) {
            console.log(`Returning ${localProducts.length} products from local DB`);

            // Trigger background sync if online
            if (canUseCloud() && window.syncManager) {
                window.syncManager.syncFromCloud().catch(err =>
                    console.log('Background sync failed:', err.message)
                );
            }

            return localProducts;
        }
    }

    // Fallback: Try to fetch from cloud if no local data
    if (canUseCloud()) {
        console.log('Fetching products from cloud (no local data)');
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Store in local DB for future offline use
        if (hasOfflineDB() && data && data.length > 0) {
            await window.offlineDB.bulkPutProducts(data);
            console.log(`Cached ${data.length} products locally`);
        }

        return data;
    }

    // Truly offline with no local data
    console.warn('No products available (offline with empty local DB)');
    return [];
}

async function apiDeleteProduct(productId) {
    // OFFLINE-FIRST: Delete locally first
    if (hasOfflineDB()) {
        await window.offlineDB.deleteProduct(productId);
        console.log(`Deleted product ${productId} locally`);

        // Background sync if online
        if (canUseCloud() && window.syncManager) {
            window.syncManager.syncToCloud().catch(console.error);
        }

        return true;
    }

    // Fallback: Direct cloud delete
    if (canUseCloud()) {
        const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) throw error;
    } else {
        throw new Error('No se puede eliminar: sin conexión y sin base de datos local');
    }

    return true;
}

async function apiSaveProduct(productData, isUpdate = false) {
    // OFFLINE-FIRST: Save locally first
    if (hasOfflineDB()) {
        const savedProduct = await window.offlineDB.saveProduct(productData, isUpdate);
        console.log(`Saved product ${productData.id} locally`);

        // Background sync if online
        if (canUseCloud() && window.syncManager) {
            window.syncManager.syncToCloud().catch(console.error);
        }

        return savedProduct;
    }

    // Fallback: Direct cloud save
    if (canUseCloud()) {
        let result;
        if (isUpdate) {
            result = await supabaseClient
                .from('products')
                .update(productData)
                .eq('id', productData.id);
        } else {
            result = await supabaseClient
                .from('products')
                .insert([productData]);
        }

        if (result.error) throw result.error;
        return result.data;
    }

    throw new Error('No se puede guardar: sin conexión y sin base de datos local');
}

async function apiUploadImage(file, fileName) {
    // Images require cloud connection
    if (!canUseCloud()) {
        // For offline, store image as blob in IndexedDB
        if (hasOfflineDB()) {
            const blob = file instanceof Blob ? file : new Blob([file]);
            const localUrl = `local://${fileName}`;
            await window.offlineDB.cacheImage(localUrl, blob);
            console.log('Image cached locally for later upload');
            return localUrl;
        }
        throw new Error('No se puede subir imagen sin conexión');
    }

    const { error } = await supabaseClient.storage
        .from('product_images')
        .upload(fileName, file);

    if (error) throw error;

    const { data } = supabaseClient.storage
        .from('product_images')
        .getPublicUrl(fileName);

    return data.publicUrl;
}

// --- History API (Offline-First) ---

async function apiFetchProductHistory(productId) {
    // OFFLINE-FIRST
    if (hasOfflineDB()) {
        const localHistory = await window.offlineDB.getProductHistory(productId);

        if (localHistory && localHistory.length > 0) {
            return localHistory;
        }
    }

    // Fallback to cloud
    if (canUseCloud()) {
        const { data, error } = await supabaseClient
            .from('product_history')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    return [];
}

async function apiSaveHistoryEntry(historyData) {
    // OFFLINE-FIRST
    if (hasOfflineDB()) {
        const savedEntry = await window.offlineDB.saveHistoryEntry(historyData);
        console.log(`Saved history entry locally`);

        if (canUseCloud() && window.syncManager) {
            window.syncManager.syncToCloud().catch(console.error);
        }

        return savedEntry;
    }

    // Fallback to cloud
    if (canUseCloud()) {
        const { error } = await supabaseClient
            .from('product_history')
            .insert([historyData]);

        if (error) throw error;
        return true;
    }

    throw new Error('No se puede guardar: sin conexión');
}

// --- Sales API (Offline-First) ---

async function apiUpdateProductStock(productId, newQuantity) {
    // OFFLINE-FIRST
    if (hasOfflineDB()) {
        await window.offlineDB.updateProductStock(productId, newQuantity);
        console.log(`Updated stock for ${productId} locally`);

        if (canUseCloud() && window.syncManager) {
            window.syncManager.syncToCloud().catch(console.error);
        }

        return true;
    }

    // Fallback to cloud
    if (canUseCloud()) {
        const { error } = await supabaseClient
            .from('products')
            .update({ quantity: newQuantity })
            .eq('id', productId);

        if (error) throw error;
    } else {
        throw new Error('No se puede actualizar stock: sin conexión');
    }

    return true;
}

// --- Reports API (Offline-First) ---

async function apiFetchSalesHistory() {
    // OFFLINE-FIRST
    if (hasOfflineDB()) {
        const localSales = await window.offlineDB.getSalesHistory();

        if (localSales && localSales.length > 0) {
            // Map local data to expected format
            return localSales.map(item => ({
                ...item,
                product_name: item.product_name || 'Producto',
                product_category: item.product_category || 'Sin categoría',
                product_image_url: item.product_image_url || null
            }));
        }
    }

    // Fallback to cloud
    if (canUseCloud()) {
        const { data, error } = await supabaseClient
            .from('product_history')
            .select('*, products(name, category, image_url, quantity)')
            .eq('action_type', 'venta')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(item => ({
            ...item,
            product_name: item.product_name || item.products?.name || 'Producto eliminado',
            product_category: item.product_category || item.products?.category || 'Sin categoría',
            product_image_url: item.product_image_url || item.products?.image_url || null
        }));
    }

    return [];
}

// Delete history entry
async function apiDeleteHistoryEntry(historyId) {
    // OFFLINE-FIRST
    if (hasOfflineDB()) {
        await window.offlineDB.deleteHistoryEntry(historyId);

        if (canUseCloud() && window.syncManager) {
            window.syncManager.syncToCloud().catch(console.error);
        }

        return true;
    }

    if (canUseCloud()) {
        const { error } = await supabaseClient
            .from('product_history')
            .delete()
            .eq('id', historyId);

        if (error) throw error;
    }

    return true;
}

// Clear history by period (Cloud-only operation)
async function apiClearHistoryByPeriod(period) {
    if (!canUseCloud()) {
        throw new Error('Esta operación requiere conexión a internet');
    }

    let query = supabaseClient.from('product_history').delete().eq('action_type', 'venta');

    // Create a new Date for calculations to avoid modifying the original
    const now = new Date();
    let startDate;

    if (period === 'day') {
        // Today at midnight
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        startDate = today.toISOString();
    } else if (period === 'week') {
        // Start of week (Monday)
        const dayOfWeek = now.getDay() || 7; // 1=Mon, 7=Sun
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dayOfWeek - 1), 0, 0, 0, 0);
        startDate = monday.toISOString();
    } else if (period === 'month') {
        // First day of current month
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        startDate = firstDay.toISOString();
    }

    if (period !== 'all' && startDate) {
        query = query.gte('created_at', startDate);
    }

    const { error } = await query;
    if (error) throw error;

    // Also clear from local IndexedDB
    if (hasOfflineDB() && window.offlineDB && window.offlineDB.db) {
        try {
            const allLocalHistory = await window.offlineDB.db.product_history.toArray();
            const idsToDelete = [];

            for (const entry of allLocalHistory) {
                if (entry.action_type !== 'venta') continue;

                const entryDate = new Date(entry.created_at);

                if (period === 'all') {
                    idsToDelete.push(entry.id);
                } else if (startDate) {
                    const startDateObj = new Date(startDate);
                    if (entryDate >= startDateObj) {
                        idsToDelete.push(entry.id);
                    }
                }
            }

            if (idsToDelete.length > 0) {
                await window.offlineDB.db.product_history.bulkDelete(idsToDelete);
                console.log(`Deleted ${idsToDelete.length} local history entries`);
            }
        } catch (localErr) {
            console.warn('Error clearing local history:', localErr);
        }
    }

    // Re-sync to update local DB
    if (window.syncManager) {
        await window.syncManager.syncFromCloud();
    }

    return true;
}

// Clear history by specific date (Cloud-only)
async function apiClearHistoryByDate(dateStr) {
    if (!canUseCloud()) {
        throw new Error('Esta operación requiere conexión a internet');
    }

    // Date string expected: YYYY-MM-DD
    // Create range for that day
    const start = new Date(dateStr + 'T00:00:00').toISOString();
    const end = new Date(dateStr + 'T23:59:59.999').toISOString();

    const { error } = await supabaseClient
        .from('product_history')
        .delete()
        .eq('action_type', 'venta')
        .gte('created_at', start)
        .lte('created_at', end);

    if (error) throw error;

    // Also clear from local IndexedDB
    if (hasOfflineDB() && window.offlineDB && window.offlineDB.db) {
        try {
            const allLocalHistory = await window.offlineDB.db.product_history.toArray();
            const idsToDelete = [];

            const startDate = new Date(start);
            const endDate = new Date(end);

            for (const entry of allLocalHistory) {
                if (entry.action_type !== 'venta') continue;

                const entryDate = new Date(entry.created_at);
                if (entryDate >= startDate && entryDate <= endDate) {
                    idsToDelete.push(entry.id);
                }
            }

            if (idsToDelete.length > 0) {
                await window.offlineDB.db.product_history.bulkDelete(idsToDelete);
                console.log(`Deleted ${idsToDelete.length} local history entries for ${dateStr}`);
            }
        } catch (localErr) {
            console.warn('Error clearing local history:', localErr);
        }
    }

    // Re-sync
    if (window.syncManager) {
        await window.syncManager.syncFromCloud();
    }

    return true;
}

// Export functions globally
Object.assign(window.api, {
    fetchProducts: apiFetchProducts,
    deleteProduct: apiDeleteProduct,
    saveProduct: apiSaveProduct,
    uploadImage: apiUploadImage,
    fetchProductHistory: apiFetchProductHistory,
    saveHistoryEntry: apiSaveHistoryEntry,
    deleteHistoryEntry: apiDeleteHistoryEntry,
    clearHistoryByPeriod: apiClearHistoryByPeriod,
    clearHistoryByDate: apiClearHistoryByDate,
    updateProductStock: apiUpdateProductStock,
    fetchSalesHistory: apiFetchSalesHistory,
    client: supabaseClient,
    // New helpers
    hasOfflineDB,
    canUseCloud
});

console.log('--- api.js loaded successfully ---');
