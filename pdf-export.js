// PDF Export Module for CloudStore Inventory
// Uses jsPDF + html2canvas to generate elegant grid-based PDF

const pdfExport = (() => {
    let selectedFields = {
        image: true,
        name: true,
        category: true,
        stock: true,
        qrCode: false,
        priceBuyPackage: false,
        priceBuyUnit: false,
        priceSellUnit: true,
        priceSellPackage: false,
        profit: false,
        expiryDate: false,
        supplier: false
    };

    let columns = 3;

    // Open Export Modal
    function openExportModal() {
        document.getElementById('pdf-export-modal').classList.remove('hidden');
        document.getElementById('pdf-export-modal').classList.add('flex');
        updateColumnButtons();

        // Ocultar el FAB cuando se abre un modal en inventario
        if (window.appState && window.appState.currentTab === 'inventario') {
            const fabBtn = document.getElementById('fab-btn');
            if (fabBtn) fabBtn.classList.add('hidden');
        }
    }

    // Close Export Modal
    function closeExportModal() {
        document.getElementById('pdf-export-modal').classList.add('hidden');
        document.getElementById('pdf-export-modal').classList.remove('flex');

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

    // Toggle field selection
    function toggleField(fieldName) {
        selectedFields[fieldName] = !selectedFields[fieldName];
        const checkbox = document.getElementById('pdf-field-' + fieldName);
        if (checkbox) {
            checkbox.checked = selectedFields[fieldName];
        }
    }

    // Set columns
    function setColumns(cols) {
        columns = cols;
        updateColumnButtons();
    }

    function updateColumnButtons() {
        [2, 3, 4].forEach(col => {
            const btn = document.getElementById('pdf-cols-' + col);
            if (btn) {
                if (col === columns) {
                    btn.classList.add('bg-blue-600', 'text-white');
                    btn.classList.remove('bg-white', 'text-gray-700');
                } else {
                    btn.classList.remove('bg-blue-600', 'text-white');
                    btn.classList.add('bg-white', 'text-gray-700');
                }
            }
        });
    }

    // Generate PDF
    async function generatePDF() {
        const { jsPDF } = window.jspdf;

        // Get products
        const products = window.appState?.allProducts || [];
        if (products.length === 0) {
            alert('No hay productos para exportar');
            return;
        }

        // Show loading
        const btn = document.getElementById('pdf-export-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ Generando PDF...';
        btn.disabled = true;

        try {
            // Create PDF (Letter size)
            const pdf = new jsPDF('p', 'mm', 'letter');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const usableWidth = pageWidth - (margin * 2);

            // Card dimensions based on columns
            const cardWidth = (usableWidth - ((columns - 1) * 5)) / columns;
            const cardHeight = calculateCardHeight();

            let x = margin;
            let y = margin + 15; // Space for header

            // Header
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('INVENTARIO - CloudStore', margin, margin + 8);

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            const date = new Date().toLocaleDateString('es-BO', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
            pdf.text('Fecha: ' + date, pageWidth - margin - 35, margin + 8);

            // Line separator
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, margin + 12, pageWidth - margin, margin + 12);

            // Draw products
            for (let i = 0; i < products.length; i++) {
                const product = products[i];

                // Check if we need a new page
                if (y + cardHeight > pageHeight - margin) {
                    pdf.addPage();
                    y = margin + 5;
                    x = margin;
                }

                // Draw card
                await drawProductCard(pdf, product, x, y, cardWidth, cardHeight);

                // Move to next position
                x += cardWidth + 5;
                if ((i + 1) % columns === 0) {
                    x = margin;
                    y += cardHeight + 5;
                }
            }

            // Footer
            const lastPage = pdf.getNumberOfPages();
            for (let p = 1; p <= lastPage; p++) {
                pdf.setPage(p);
                pdf.setFontSize(8);
                pdf.setTextColor(128);
                pdf.text('Página ' + p + ' de ' + lastPage + ' | Total: ' + products.length + ' productos',
                    margin, pageHeight - 5);
            }

            // Save PDF
            pdf.save('inventario_' + date.replace(/\//g, '-') + '.pdf');

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF: ' + error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
            closeExportModal();
        }
    }

    function calculateCardHeight() {
        let height = 25; // Base height for name
        if (selectedFields.image) height += 25;
        if (selectedFields.category) height += 6;
        if (selectedFields.stock) height += 6;
        if (selectedFields.priceSellUnit || selectedFields.priceSellPackage) height += 6;
        if (selectedFields.priceBuyUnit || selectedFields.priceBuyPackage) height += 6;
        if (selectedFields.profit) height += 6;
        if (selectedFields.expiryDate) height += 6;
        if (selectedFields.supplier) height += 6;
        if (selectedFields.qrCode) height += 20;
        return height;
    }

    async function drawProductCard(pdf, product, x, y, width, height) {
        // Card background
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, width, height, 2, 2, 'FD');

        let currentY = y + 3;
        const padding = 2;
        const textX = x + padding;

        // Image
        if (selectedFields.image && product.image_url) {
            try {
                const imgData = await loadImage(product.image_url);
                if (imgData) {
                    const imgSize = Math.min(width - 4, 22);
                    const imgX = x + (width - imgSize) / 2;
                    pdf.addImage(imgData, 'JPEG', imgX, currentY, imgSize, imgSize);
                    currentY += imgSize + 2;
                }
            } catch (e) {
                currentY += 5;
            }
        }

        // Name
        if (selectedFields.name) {
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(30, 30, 30);
            const name = truncateText(product.name, width - 4, pdf);
            pdf.text(name, textX, currentY + 4);
            currentY += 6;
        }

        // Category
        if (selectedFields.category) {
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 100, 100);
            pdf.text(product.category || '-', textX, currentY + 3);
            currentY += 5;
        }

        // Stock
        if (selectedFields.stock) {
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(59, 130, 246); // Blue
            const stockText = 'Stock: ' + (product.quantity || 0) + ' unidades';
            pdf.text(stockText, textX, currentY + 3);
            currentY += 5;
        }

        // Sell Price
        if (selectedFields.priceSellUnit || selectedFields.priceSellPackage) {
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(34, 197, 94); // Green
            let priceText = '';
            if (selectedFields.priceSellUnit && product.unit_price_sell) {
                priceText += 'Bs ' + parseFloat(product.unit_price_sell).toFixed(2);
            }
            if (selectedFields.priceSellPackage && product.price_sell) {
                if (priceText) priceText += ' | ';
                priceText += 'Paq: Bs ' + parseFloat(product.price_sell).toFixed(2);
            }
            pdf.text(priceText || '-', textX, currentY + 3);
            currentY += 5;
        }

        // Buy Price
        if (selectedFields.priceBuyUnit || selectedFields.priceBuyPackage) {
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(249, 115, 22); // Orange
            let costText = 'Costo: ';
            if (selectedFields.priceBuyUnit && product.unit_cost) {
                costText += 'Bs ' + parseFloat(product.unit_cost).toFixed(2);
            }
            if (selectedFields.priceBuyPackage && product.price_buy) {
                costText += ' (Paq: Bs ' + parseFloat(product.price_buy).toFixed(2) + ')';
            }
            pdf.text(costText, textX, currentY + 3);
            currentY += 5;
        }

        // Profit
        if (selectedFields.profit) {
            pdf.setFontSize(7);
            const profit = (product.unit_price_sell || 0) - (product.unit_cost || 0);
            pdf.setTextColor(profit >= 0 ? 34 : 239, profit >= 0 ? 197 : 68, profit >= 0 ? 94 : 68);
            pdf.text('Ganancia: Bs ' + profit.toFixed(2), textX, currentY + 3);
            currentY += 5;
        }

        // Expiry Date
        if (selectedFields.expiryDate && product.expiry_date) {
            pdf.setFontSize(7);
            pdf.setTextColor(100, 100, 100);
            pdf.text('Venc: ' + product.expiry_date, textX, currentY + 3);
            currentY += 5;
        }

        // Supplier
        if (selectedFields.supplier && product.supplier_contact) {
            pdf.setFontSize(6);
            pdf.setTextColor(100, 100, 100);
            const supplier = truncateText('Prov: ' + product.supplier_contact, width - 4, pdf);
            pdf.text(supplier, textX, currentY + 3);
            currentY += 5;
        }

        // QR Code
        if (selectedFields.qrCode && product.qr_code_url) {
            try {
                const qrData = await loadImage(product.qr_code_url);
                if (qrData) {
                    const qrSize = 15;
                    const qrX = x + (width - qrSize) / 2;
                    pdf.addImage(qrData, 'PNG', qrX, currentY, qrSize, qrSize);
                }
            } catch (e) {
                // QR failed to load
            }
        }
    }

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

    function truncateText(text, maxWidth, pdf) {
        if (!text) return '-';
        let truncated = text;
        while (pdf.getTextWidth(truncated) > maxWidth && truncated.length > 3) {
            truncated = truncated.slice(0, -1);
        }
        if (truncated !== text) truncated += '...';
        return truncated;
    }

    return {
        openExportModal,
        closeExportModal,
        toggleField,
        setColumns,
        generatePDF
    };
})();

// Expose to window
window.pdfExport = pdfExport;
