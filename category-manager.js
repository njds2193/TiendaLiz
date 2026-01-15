// category-manager.js - Category Management Panel

(function () {
    'use strict';

    let isOpen = false;
    let editingCategory = null;

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
        console.log('Category manager initialized');
    }

    // ==================== CREATE HTML ====================
    function createHTML() {
        const html = `
            <!-- Category Manager Modal -->
            <div id="category-manager-modal" class="fixed inset-0 z-[60] hidden">
                <div class="absolute inset-0 bg-black/50" id="category-manager-overlay"></div>
                <div class="absolute inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto">
                    <div class="bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
                        <!-- Header -->
                        <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
                            <h2 class="text-lg font-bold flex items-center gap-2">⚙️ Gestionar Categorías</h2>
                            <button id="close-category-manager" class="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">✕</button>
                        </div>
                        
                        <!-- Content -->
                        <div class="flex-1 overflow-y-auto p-4">
                            <p class="text-sm text-gray-500 mb-4">Edita o elimina categorías. Los cambios afectan a todos los productos.</p>
                            <div id="category-manager-list" class="space-y-2">
                                <!-- Categories rendered here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Edit Category Modal -->
            <div id="edit-category-modal" class="fixed inset-0 z-[65] hidden">
                <div class="absolute inset-0 bg-black/50" id="edit-category-overlay"></div>
                <div class="absolute inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto">
                    <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <div class="bg-blue-600 text-white p-4">
                            <h3 class="font-bold">✏️ Renombrar Categoría</h3>
                        </div>
                        <div class="p-4">
                            <label class="block text-sm text-gray-600 mb-2">Nombre actual: <span id="edit-current-name" class="font-bold text-gray-800"></span></label>
                            <input type="text" id="edit-category-input" placeholder="Nuevo nombre..." 
                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" autocomplete="off">
                            <div class="flex gap-2 mt-4">
                                <button id="cancel-edit-category" class="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium">Cancelar</button>
                                <button id="save-edit-category" class="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium">Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Delete Category Modal -->
            <div id="delete-category-modal" class="fixed inset-0 z-[65] hidden">
                <div class="absolute inset-0 bg-black/50" id="delete-category-overlay"></div>
                <div class="absolute inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto">
                    <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <div class="bg-red-600 text-white p-4">
                            <h3 class="font-bold">🗑️ Eliminar Categoría</h3>
                        </div>
                        <div class="p-4">
                            <p class="text-gray-700 mb-2">¿Eliminar <span id="delete-category-name" class="font-bold"></span>?</p>
                            <p id="delete-product-count" class="text-sm text-gray-500 mb-4"></p>
                            
                            <!-- Options -->
                            <div class="space-y-3 mb-4">
                                <label class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                                    <input type="radio" name="delete-action" value="reassign" checked class="w-4 h-4 text-blue-600">
                                    <div>
                                        <span class="font-medium">Reasignar productos</span>
                                        <p class="text-xs text-gray-500">Mover a otra categoría</p>
                                    </div>
                                </label>
                                <label class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                                    <input type="radio" name="delete-action" value="delete-all" class="w-4 h-4 text-red-600">
                                    <div>
                                        <span class="font-medium text-red-600">Eliminar productos</span>
                                        <p class="text-xs text-gray-500">⚠️ Acción irreversible</p>
                                    </div>
                                </label>
                            </div>
                            
                            <!-- Reassign target -->
                            <div id="reassign-target-section" class="mb-4">
                                <label class="block text-sm text-gray-600 mb-2">Mover productos a:</label>
                                <select id="reassign-target-select" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none">
                                    <!-- Options populated dynamically -->
                                </select>
                            </div>
                            
                            <div class="flex gap-2">
                                <button id="cancel-delete-category" class="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium">Cancelar</button>
                                <button id="confirm-delete-category" class="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium">Eliminar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        injectStyles();
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .category-manager-item {
                display: flex; align-items: center; justify-content: space-between;
                padding: 12px 16px; background: #f9fafb; border-radius: 12px;
                transition: all 0.2s;
            }
            .category-manager-item:hover { background: #f3f4f6; }
            .category-manager-item .cat-name { font-weight: 500; color: #374151; }
            .category-manager-item .cat-count { font-size: 12px; color: #9ca3af; margin-left: 8px; }
            .category-manager-item .cat-actions { display: flex; gap: 8px; }
            .category-manager-item .cat-btn {
                width: 32px; height: 32px; border-radius: 8px; display: flex;
                align-items: center; justify-content: center; transition: all 0.2s;
            }
            .category-manager-item .cat-btn.edit { background: #dbeafe; color: #2563eb; }
            .category-manager-item .cat-btn.edit:hover { background: #bfdbfe; }
            .category-manager-item .cat-btn.delete { background: #fee2e2; color: #dc2626; }
            .category-manager-item .cat-btn.delete:hover { background: #fecaca; }
        `;
        document.head.appendChild(style);
    }

    // ==================== EVENT HANDLERS ====================
    function attachEvents() {
        // Main modal
        document.getElementById('close-category-manager')?.addEventListener('click', closeManager);
        document.getElementById('category-manager-overlay')?.addEventListener('click', closeManager);

        // Edit modal
        document.getElementById('cancel-edit-category')?.addEventListener('click', closeEditModal);
        document.getElementById('edit-category-overlay')?.addEventListener('click', closeEditModal);
        document.getElementById('save-edit-category')?.addEventListener('click', saveEditCategory);
        document.getElementById('edit-category-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveEditCategory();
        });

        // Delete modal
        document.getElementById('cancel-delete-category')?.addEventListener('click', closeDeleteModal);
        document.getElementById('delete-category-overlay')?.addEventListener('click', closeDeleteModal);
        document.getElementById('confirm-delete-category')?.addEventListener('click', confirmDeleteCategory);

        // Toggle reassign section
        document.querySelectorAll('input[name="delete-action"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const section = document.getElementById('reassign-target-section');
                if (section) {
                    section.style.display = e.target.value === 'reassign' ? 'block' : 'none';
                }
            });
        });
    }

    // ==================== OPEN/CLOSE ====================
    function openManager() {
        isOpen = true;
        document.getElementById('category-manager-modal')?.classList.remove('hidden');
        renderCategoryList();

        // Ocultar el FAB cuando se abre un modal en inventario
        if (window.appState && window.appState.currentTab === 'inventario') {
            const fabBtn = document.getElementById('fab-btn');
            if (fabBtn) fabBtn.classList.add('hidden');
        }
    }

    function closeManager() {
        isOpen = false;
        document.getElementById('category-manager-modal')?.classList.add('hidden');

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

    function renderCategoryList() {
        const container = document.getElementById('category-manager-list');
        if (!container || !window.appState?.allProducts) return;

        const categoryCount = {};
        window.appState.allProducts.forEach(p => {
            const cat = p.category?.trim();
            if (cat) categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });

        const categories = Object.entries(categoryCount).sort((a, b) => a[0].localeCompare(b[0]));

        if (categories.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 py-8">No hay categorías</p>';
            return;
        }

        container.innerHTML = categories.map(([cat, count]) => `
            <div class="category-manager-item">
                <div>
                    <span class="cat-name">${cat}</span>
                    <span class="cat-count">(${count} producto${count !== 1 ? 's' : ''})</span>
                </div>
                <div class="cat-actions">
                    <button class="cat-btn edit" onclick="window.categoryManager.editCategory('${cat.replace(/'/g, "\\'")}')">✏️</button>
                    <button class="cat-btn delete" onclick="window.categoryManager.deleteCategory('${cat.replace(/'/g, "\\'")}')">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    // ==================== EDIT CATEGORY ====================
    function openEditModal(category) {
        editingCategory = category;
        document.getElementById('edit-current-name').textContent = category;
        document.getElementById('edit-category-input').value = category;
        document.getElementById('edit-category-modal')?.classList.remove('hidden');
        document.getElementById('edit-category-input')?.focus();
    }

    function closeEditModal() {
        editingCategory = null;
        document.getElementById('edit-category-modal')?.classList.add('hidden');
    }

    async function saveEditCategory() {
        const newName = document.getElementById('edit-category-input')?.value?.trim();
        if (!newName || !editingCategory) return;
        if (newName === editingCategory) {
            closeEditModal();
            return;
        }

        // Update all products with this category
        const productsToUpdate = window.appState.allProducts.filter(p => p.category?.trim() === editingCategory);

        if (productsToUpdate.length === 0) {
            if (window.ui?.showToast) window.ui.showToast('No hay productos que actualizar', 'error');
            return;
        }

        try {
            // Update in database
            for (const product of productsToUpdate) {
                product.category = newName;
                if (window.api?.updateProduct) {
                    await window.api.updateProduct(product.id, { category: newName });
                }
            }

            // Refresh UI
            if (window.ui) window.ui.renderProductList(window.appState.allProducts, 'product-list');
            if (window.categoryFilter) window.categoryFilter.updateChips();
            if (window.filterMenu) window.filterMenu.updateCategories();

            closeEditModal();
            renderCategoryList();
            if (window.ui?.showToast) window.ui.showToast(`Categoría renombrada: ${newName}`, 'success');

        } catch (error) {
            console.error('Error updating category:', error);
            if (window.ui?.showToast) window.ui.showToast('Error al renombrar', 'error');
        }
    }

    // ==================== DELETE CATEGORY ====================
    function openDeleteModal(category) {
        editingCategory = category;

        // Count products
        const count = window.appState?.allProducts?.filter(p => p.category?.trim() === category).length || 0;
        document.getElementById('delete-category-name').textContent = category;
        document.getElementById('delete-product-count').textContent = count > 0
            ? `Esta categoría tiene ${count} producto${count !== 1 ? 's' : ''}.`
            : 'Esta categoría no tiene productos.';

        // Populate reassign options
        const select = document.getElementById('reassign-target-select');
        if (select) {
            const categoryCount = {};
            window.appState.allProducts.forEach(p => {
                const cat = p.category?.trim();
                if (cat && cat !== category) categoryCount[cat] = (categoryCount[cat] || 0) + 1;
            });

            const options = Object.keys(categoryCount).sort();
            select.innerHTML = options.length > 0
                ? options.map(cat => `<option value="${cat}">${cat}</option>`).join('')
                : '<option value="">No hay otras categorías</option>';
        }

        // Reset to reassign option
        const reassignRadio = document.querySelector('input[name="delete-action"][value="reassign"]');
        if (reassignRadio) reassignRadio.checked = true;
        document.getElementById('reassign-target-section').style.display = 'block';

        document.getElementById('delete-category-modal')?.classList.remove('hidden');
    }

    function closeDeleteModal() {
        editingCategory = null;
        document.getElementById('delete-category-modal')?.classList.add('hidden');
    }

    async function confirmDeleteCategory() {
        if (!editingCategory) return;

        const action = document.querySelector('input[name="delete-action"]:checked')?.value;
        const targetCategory = document.getElementById('reassign-target-select')?.value;
        const productsToProcess = window.appState.allProducts.filter(p => p.category?.trim() === editingCategory);

        try {
            if (action === 'reassign' && targetCategory) {
                // Reassign products
                for (const product of productsToProcess) {
                    product.category = targetCategory;
                    if (window.api?.updateProduct) {
                        await window.api.updateProduct(product.id, { category: targetCategory });
                    }
                }
                if (window.ui?.showToast) window.ui.showToast(`${productsToProcess.length} producto(s) movidos a "${targetCategory}"`, 'success');

            } else if (action === 'delete-all') {
                // Delete all products in category
                for (const product of productsToProcess) {
                    if (window.api?.deleteProduct) {
                        await window.api.deleteProduct(product.id);
                    }
                    // Remove from local state
                    const index = window.appState.allProducts.findIndex(p => p.id === product.id);
                    if (index > -1) window.appState.allProducts.splice(index, 1);
                }
                if (window.ui?.showToast) window.ui.showToast(`Categoría y ${productsToProcess.length} producto(s) eliminados`, 'success');
            }

            // Refresh UI
            if (window.ui) window.ui.renderProductList(window.appState.allProducts, 'product-list');
            if (window.categoryFilter) window.categoryFilter.updateChips();
            if (window.filterMenu) window.filterMenu.updateCategories();

            closeDeleteModal();
            renderCategoryList();

        } catch (error) {
            console.error('Error deleting category:', error);
            if (window.ui?.showToast) window.ui.showToast('Error al eliminar', 'error');
        }
    }

    // ==================== EXPORT ====================
    window.categoryManager = {
        init,
        open: openManager,
        close: closeManager,
        editCategory: openEditModal,
        deleteCategory: openDeleteModal
    };

    init();
})();
