// restock-list.js - Restock List Module
// Provides low-stock detection, manual restock list, and WhatsApp sharing

console.log('--- Loading restock-list.js ---');

const restockList = (() => {
    // Manual restock list (stored in localStorage for persistence)
    const STORAGE_KEY = 'cloudstore_restock_list';

    // Get products with low stock (quantity <= min_stock)
    function getLowStockProducts() {
        const products = window.appState?.allProducts || [];
        return products.filter(p => {
            // Only check products with min_stock > 0
            if (!p.min_stock || p.min_stock <= 0) return false;
            return (p.quantity || 0) <= p.min_stock;
        });
    }

    // Get manually added restock items
    function getManualList() {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    // Save manual list
    function saveManualList(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        updateBadge();
    }

    // Add product to manual restock list
    function addToList(productId, note = '') {
        const products = window.appState?.allProducts || [];
        const product = products.find(p => p.id === productId);
        if (!product) return false;

        const list = getManualList();

        // Check if already in list
        if (list.some(item => item.productId === productId)) {
            window.ui?.showToast('Ya está en la lista', 'warning');
            return false;
        }

        list.push({
            productId: productId,
            name: product.name,
            category: product.category,
            currentStock: product.quantity || 0,
            note: note,
            addedAt: new Date().toISOString()
        });

        saveManualList(list);
        return true;
    }

    // Remove from manual list
    function removeFromList(productId) {
        let list = getManualList();
        list = list.filter(item => item.productId !== productId);
        saveManualList(list);
        renderRestockModal();
    }

    // Clear manual list
    function clearManualList() {
        saveManualList([]);
        renderRestockModal();
    }

    // Get total count for badge
    function getTotalCount() {
        const lowStock = getLowStockProducts().length;
        const manual = getManualList().length;
        return lowStock + manual;
    }

    // Update badge in header
    function updateBadge() {
        const badge = document.getElementById('restock-badge');
        if (!badge) return;

        const count = getTotalCount();
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // Render restock modal content
    function renderRestockModal() {
        const container = document.getElementById('restock-list-content');
        if (!container) return;

        const lowStock = getLowStockProducts();
        const manualList = getManualList();

        let html = '';

        // Low Stock Section
        if (lowStock.length > 0) {
            html += `<div class="mb-4">
                <h4 class="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
                    ⚠️ Stock Bajo (${lowStock.length})
                </h4>
                <div class="space-y-2">`;

            for (const p of lowStock) {
                html += `<div class="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-3">
                    <img src="${p.image_url || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlN2U3ZTciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <span class="font-medium block truncate">${p.name}</span>
                        <span class="text-xs text-gray-500">${p.category || 'Sin categoría'}</span>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <span class="text-red-600 font-bold">${p.quantity || 0}</span>
                        <span class="text-gray-400">/ ${p.min_stock}</span>
                    </div>
                </div>`;
            }
            html += `</div></div>`;
        }

        // Manual List Section
        if (manualList.length > 0) {
            html += `<div class="mb-4">
                <h4 class="text-sm font-bold text-blue-600 mb-2 flex items-center gap-2">
                    📋 Agregados Manualmente (${manualList.length})
                </h4>
                <div class="space-y-2">`;

            for (const item of manualList) {
                // Get current product data for image
                const product = (window.appState?.allProducts || []).find(p => p.id === item.productId);
                const imageUrl = product?.image_url || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlN2U3ZTciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

                html += `<div class="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center gap-3">
                    <img src="${imageUrl}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <span class="font-medium block truncate">${item.name}</span>
                        <span class="text-xs text-gray-500">${item.category || 'Sin categoría'}</span>
                        ${item.note ? `<span class="text-xs text-blue-600 block">📝 ${item.note}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <span class="text-gray-600 text-sm">${item.currentStock} uds</span>
                        <button onclick="window.restockList.removeFromList('${item.productId}')" 
                            class="text-red-500 hover:text-red-700 p-1" title="Quitar">✕</button>
                    </div>
                </div>`;
            }
            html += `</div></div>`;
        }

        // Empty state
        if (lowStock.length === 0 && manualList.length === 0) {
            html = `<div class="text-center py-8 text-gray-500">
                <span class="text-4xl">✅</span>
                <p class="mt-2">No hay productos para reabastecer</p>
            </div>`;
        }

        container.innerHTML = html;
    }

    // Open restock modal
    function openModal() {
        renderRestockModal();
        window.ui?.openModal('restock-modal');
    }

    // Close modal
    function closeModal() {
        window.ui?.closeModal('restock-modal');
    }

    // Share via WhatsApp
    function shareViaWhatsApp() {
        const lowStock = getLowStockProducts();
        const manualList = getManualList();

        let message = '🛒 *Lista de Reabastecimiento*\n';
        message += `📅 ${new Date().toLocaleDateString('es-ES')}\n\n`;

        if (lowStock.length > 0) {
            message += '⚠️ *Stock Bajo:*\n';
            for (const p of lowStock) {
                message += `• ${p.name} - ${p.quantity || 0}/${p.min_stock} unidades\n`;
            }
            message += '\n';
        }

        if (manualList.length > 0) {
            message += '📋 *Agregados manualmente:*\n';
            for (const item of manualList) {
                message += `• ${item.name} - ${item.currentStock} unidades`;
                if (item.note) message += ` (${item.note})`;
                message += '\n';
            }
        }

        message += '\n---\nGenerado por CloudStore';

        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }

    // Helper to load image as data URL
    function loadImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                try {
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                } catch (e) {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }

    // Export to PDF
    async function exportToPDF() {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            window.ui?.showToast('Error: jsPDF no disponible', 'error');
            return;
        }

        const lowStock = getLowStockProducts();
        const manualList = getManualList();

        if (lowStock.length === 0 && manualList.length === 0) {
            window.ui?.showToast('No hay productos en la lista', 'warning');
            return;
        }

        window.ui?.showToast('📄 Generando PDF...', 'success');

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        let y = margin;

        // Title
        pdf.setFillColor(255, 140, 0); // Orange
        pdf.rect(0, 0, pageWidth, 25, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Lista de Reabastecimiento', margin, 16);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(new Date().toLocaleDateString('es-ES', { dateStyle: 'long' }), pageWidth - margin, 16, { align: 'right' });

        y = 35;

        // Low Stock Section
        if (lowStock.length > 0) {
            pdf.setTextColor(220, 38, 38); // Red
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`[!] Stock Bajo (${lowStock.length})`, margin, y);
            y += 8;

            for (const p of lowStock) {
                if (y > pageHeight - 40) {
                    pdf.addPage();
                    y = margin;
                }

                // Product row background
                pdf.setFillColor(254, 242, 242); // Red-50
                pdf.roundedRect(margin, y - 4, pageWidth - 2 * margin, 20, 2, 2, 'F');

                // Try to load and draw image
                try {
                    if (p.image_url) {
                        const imgData = await loadImage(p.image_url);
                        if (imgData) {
                            pdf.addImage(imgData, 'JPEG', margin + 2, y - 2, 16, 16);
                        }
                    }
                } catch (e) { }

                // Product name and category
                pdf.setTextColor(0, 0, 0);
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'bold');
                pdf.text(p.name, margin + 22, y + 4);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);
                pdf.setTextColor(100, 100, 100);
                pdf.text(p.category || 'Sin categoría', margin + 22, y + 10);

                // Stock count
                pdf.setTextColor(220, 38, 38);
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`${p.quantity || 0} / ${p.min_stock}`, pageWidth - margin, y + 6, { align: 'right' });

                y += 24;
            }
        }

        // Manual List Section
        if (manualList.length > 0) {
            y += 5;
            if (y > pageHeight - 50) {
                pdf.addPage();
                y = margin;
            }

            pdf.setTextColor(37, 99, 235); // Blue
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`[+] Agregados Manualmente (${manualList.length})`, margin, y);
            y += 8;

            for (const item of manualList) {
                if (y > pageHeight - 40) {
                    pdf.addPage();
                    y = margin;
                }

                // Get current product for image
                const product = (window.appState?.allProducts || []).find(p => p.id === item.productId);

                // Product row background
                pdf.setFillColor(239, 246, 255); // Blue-50
                pdf.roundedRect(margin, y - 4, pageWidth - 2 * margin, 20, 2, 2, 'F');

                // Try to load and draw image
                try {
                    const imgUrl = product?.image_url || item.image_url;
                    if (imgUrl) {
                        const imgData = await loadImage(imgUrl);
                        if (imgData) {
                            pdf.addImage(imgData, 'JPEG', margin + 2, y - 2, 16, 16);
                        }
                    }
                } catch (e) { }

                // Product name and category
                pdf.setTextColor(0, 0, 0);
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'bold');
                pdf.text(item.name, margin + 22, y + 4);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);
                pdf.setTextColor(100, 100, 100);
                pdf.text(item.category || 'Sin categoría', margin + 22, y + 10);

                // Stock count
                pdf.setTextColor(37, 99, 235);
                pdf.setFontSize(10);
                pdf.text(`${item.currentStock} uds`, pageWidth - margin, y + 6, { align: 'right' });

                y += 24;
            }
        }

        // Footer
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(8);
        pdf.text('Generado por CloudStore', pageWidth / 2, pageHeight - 10, { align: 'center' });

        // Save
        pdf.save(`reabastecimiento_${new Date().toISOString().split('T')[0]}.pdf`);
        window.ui?.showToast('✅ PDF descargado', 'success');
    }

    // Initialize
    function init() {
        // Update badge on load
        setTimeout(updateBadge, 1000);

        // Update badge every time products change
        const originalFetch = window.app?.fetchProducts;
        if (originalFetch) {
            window.app.fetchProducts = async function () {
                await originalFetch.apply(this, arguments);
                updateBadge();
            };
        }
    }

    // Export
    return {
        getLowStockProducts,
        getManualList,
        addToList,
        removeFromList,
        clearManualList,
        getTotalCount,
        updateBadge,
        openModal,
        closeModal,
        shareViaWhatsApp,
        exportToPDF,
        renderRestockModal,
        init
    };
})();

window.restockList = restockList;

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restockList.init);
} else {
    restockList.init();
}

console.log('--- restock-list.js loaded successfully ---');
