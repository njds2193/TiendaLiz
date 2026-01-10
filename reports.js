// reports.js - Enhanced Reports Module with Tabs, Filters, Charts, and Rankings

// State variables
let currentPeriod = 'day'; // 'day', 'week', 'month'
let currentCategory = null; // null = all categories
let selectedWeekDay = 'total'; // 'total' or date string like '2025-12-31'
let selectedMonth = new Date(); // For month navigation
let allHistory = [];

// Set period filter
function setPeriod(period) {
    currentPeriod = period;
    selectedWeekDay = 'total'; // Reset to total when changing period
    selectedMonthDay = 'total'; // Reset month selection
    selectedMonth = new Date(); // Reset to current month
    loadReports();
}

// Set category filter
function setCategory(category) {
    currentCategory = category === 'all' ? null : category;
    loadReports();
}

// Set selected day for week view
function setWeekDay(dateStr) {
    selectedWeekDay = dateStr;
    loadReports();
}

// Set selected day for month view
let selectedMonthDay = 'total';
function setMonthDay(day) {
    selectedMonthDay = day;
    loadReports();
}

// Navigate to previous month
function prevMonth() {
    selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    loadReports();
}

// Navigate to next month
function nextMonth() {
    const now = new Date();
    const current = new Date(now.getFullYear(), now.getMonth(), 1);
    const selected = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);

    // Don't go beyond current month
    if (selected < current) {
        selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
        loadReports();
    }
}

// Delete transaction and restore stock
async function deleteTransaction(historyId, productId, quantity) {
    if (!confirm('¿Eliminar esta venta y devolver ' + quantity + ' unidades al stock?')) {
        return;
    }

    try {
        // Get current product stock
        const products = await window.api.fetchProducts();
        const product = products.find(p => p.id === productId);

        if (product) {
            // Restore stock
            const newQuantity = (product.quantity || 0) + quantity;
            await window.api.updateProductStock(productId, newQuantity);
        }

        // Delete history entry
        await window.api.deleteHistoryEntry(historyId);

        // Reload reports
        loadReports();

        // Show success message
        if (window.showToast) {
            window.showToast('Venta eliminada y stock restaurado', 'success');
        }
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error al eliminar: ' + error.message);
    }
}

// Filter history by period
function filterHistoryByPeriod(history, period) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return history.filter(item => {
        const itemDate = new Date(item.created_at);
        const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

        switch (period) {
            case 'day':
                return itemDay.getTime() === today.getTime();
            case 'week':
                // Get Monday and Sunday of current week
                const dayOfWeek = today.getDay();
                const monday = new Date(today);
                monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                return itemDay >= monday && itemDay <= sunday;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setMonth(today.getMonth() - 1);
                return itemDay >= monthAgo;
            default:
                return true;
        }
    });
}

// Filter history by category
function filterHistoryByCategory(history, category) {
    if (!category || category === 'all') return history;
    console.log('Filtering by category:', category);
    return history.filter(item => {
        // Fix: Use product_category which is mapped in api.js
        const itemCat = item.product_category || item.products?.category;
        return itemCat && itemCat === category;
    });
}

// Calculate sales by type (box vs unit)
function calculateSalesByType(history) {
    let boxSales = 0, boxProfit = 0, boxCount = 0;
    let unitSales = 0, unitProfit = 0, unitCount = 0;

    history.forEach(item => {
        const sale = item.price_sell * item.quantity;
        const cost = (item.unit_cost || item.price_buy || 0) * item.quantity;
        const profit = sale - cost;

        // Check if it's a box sale (from notes or other indicator)
        const isBox = item.notes && item.notes.includes('Caja');

        if (isBox) {
            boxSales += sale;
            boxProfit += profit;
            boxCount += item.quantity;
        } else {
            unitSales += sale;
            unitProfit += profit;
            unitCount += item.quantity;
        }
    });

    return { boxSales, boxProfit, boxCount, unitSales, unitProfit, unitCount };
}

// Get top products
function getTopProducts(history, limit = 5) {
    const productMap = {};

    history.forEach(item => {
        // Fix: Use product_name from API which handles deleted products correctly
        const name = item.product_name || item.products?.name || 'Producto eliminado';
        const id = item.product_id;

        if (!productMap[id]) {
            productMap[id] = {
                name,
                quantity: 0,
                sales: 0,
                profit: 0,
                image: item.product_image_url || item.products?.image_url
            };
        }

        const qty = parseInt(item.quantity) || 0;
        const price = parseFloat(item.price_sell) || 0;
        const cost = parseFloat(item.unit_cost) || parseFloat(item.price_buy) || 0;

        // Fallback to price * qty if total_price is missing/zero
        const total = parseFloat(item.total_price) || (price * qty) || 0;
        const itemProfit = (price - cost) * qty;

        productMap[id].quantity += qty;
        productMap[id].sales += total;
        productMap[id].profit += itemProfit;
    });

    return Object.values(productMap)
        .filter(p => p.name !== 'Producto eliminado') // Filter out truly unknown products
        .sort((a, b) => b.sales - a.sales)
        .slice(0, limit);
}

// Get top categories
function getTopCategories(history, limit = 5) {
    const categoryMap = {};

    history.forEach(item => {
        const category = item.products?.category || 'Sin categoría';

        if (!categoryMap[category]) {
            categoryMap[category] = { name: category, quantity: 0, sales: 0 };
        }
        categoryMap[category].quantity += item.quantity;
        categoryMap[category].sales += item.price_sell * item.quantity;
    });

    return Object.values(categoryMap)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, limit);
}

// Get chart data based on period
function getChartData(history, period) {
    const dataMap = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Helper to get local date string (YYYY-MM-DD) without UTC conversion
    const getLocalDateStr = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    if (period === 'week') {
        // Get Monday of current week
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

        // Generate Mon to Sun
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = getLocalDateStr(d);
            dataMap[dateStr] = 0;
        }
    } else {
        // Day or Month: use last X days
        let days = period === 'day' ? 1 : 30;
        for (let i = 0; i < days; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = getLocalDateStr(d);
            dataMap[dateStr] = 0;
        }
    }

    // Fill data using LOCAL date
    history.forEach(item => {
        const dateStr = getLocalDateStr(new Date(item.created_at));
        if (dataMap.hasOwnProperty(dateStr)) {
            dataMap[dateStr] += item.price_sell * item.quantity;
        }
    });

    return Object.entries(dataMap).sort();
}

// Show day detail modal
function showDayDetail(dateStr) {
    const dayHistory = allHistory.filter(item => {
        // Fix: Use local date for comparison, not UTC
        const d = new Date(item.created_at);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const itemDateLocal = `${year}-${month}-${day}`;
        return itemDateLocal === dateStr;
    });

    // Apply category filter if active
    const filtered = currentCategory
        ? dayHistory.filter(item => (item.product_category || item.products?.category) === currentCategory)
        : dayHistory;

    const totalSales = filtered.reduce((sum, item) => sum + (item.price_sell * item.quantity), 0);
    const totalProfit = filtered.reduce((sum, item) => {
        const cost = item.unit_cost || item.price_buy || 0;
        return sum + ((item.price_sell - cost) * item.quantity);
    }, 0);

    const dateFormatted = new Date(dateStr + 'T12:00:00').toLocaleDateString('es', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    let modalHtml = `
        <div id="day-detail-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onclick="if(event.target.id==='day-detail-modal') window.reports.closeDayDetail()">
            <div class="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl">
                <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="text-sm opacity-80">📅 Detalle del día</p>
                            <p class="font-bold text-lg capitalize">${dateFormatted}</p>
                        </div>
                        <button onclick="window.reports.closeDayDetail()" class="text-2xl hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">✕</button>
                    </div>
                </div>
                <div class="p-4">
                    <div class="grid grid-cols-2 gap-3 mb-4">
                        <div class="bg-blue-50 p-3 rounded-xl">
                            <p class="text-xs text-blue-600">💰 Ventas</p>
                            <p class="text-xl font-bold text-blue-800">Bs ${totalSales.toFixed(2)}</p>
                        </div>
                        <div class="bg-green-50 p-3 rounded-xl">
                            <p class="text-xs text-green-600">📈 Ganancia</p>
                            <p class="text-xl font-bold text-green-800">Bs ${totalProfit.toFixed(2)}</p>
                        </div>
                    </div>
                    <h4 class="font-bold text-gray-700 mb-2">📋 Productos vendidos (${filtered.length})</h4>
                    <div class="max-h-60 overflow-y-auto divide-y">
    `;

    if (filtered.length === 0) {
        modalHtml += '<p class="text-center text-gray-400 py-4">Sin ventas este día</p>';
    } else {
        filtered.forEach(item => {
            const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            modalHtml += `
                <div class="py-2 flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <img src="${item.products?.image_url || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlN2U3ZTciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}" class="w-8 h-8 rounded object-cover" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlN2U3ZTciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                        <div>
                            <p class="text-sm font-medium text-gray-800">${item.products?.name || 'Eliminado'}</p>
                            <p class="text-xs text-gray-400">${time} • ${item.quantity} un.</p>
                        </div>
                    </div>
                    <span class="font-bold text-green-600">Bs ${(item.price_sell * item.quantity).toFixed(2)}</span>
                </div>
            `;
        });
    }

    modalHtml += `
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existing = document.getElementById('day-detail-modal');
    if (existing) existing.remove();

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Close day detail modal
function closeDayDetail() {
    const modal = document.getElementById('day-detail-modal');
    if (modal) modal.remove();
}

// Get calendar data for month view
function getCalendarData(history) {
    // Use selectedMonth for navigation
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    // First day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon...

    // Build map of sales per day
    const salesByDay = {};
    history.forEach(item => {
        const date = new Date(item.created_at);
        if (date.getMonth() === month && date.getFullYear() === year) {
            const day = date.getDate();
            if (!salesByDay[day]) salesByDay[day] = 0;
            salesByDay[day] += item.price_sell * item.quantity;
        }
    });

    // Check if this is the current month
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    return { year, month, daysInMonth, startDayOfWeek, salesByDay, isCurrentMonth };
}

// Get all unique categories
function getAllCategories(history) {
    const categories = new Set();
    history.forEach(item => {
        // Fix: Use product_category which is mapped in api.js
        const cat = item.product_category || item.products?.category;
        if (cat) {
            categories.add(cat);
        }
    });
    return [...categories].sort();
}

// Main load function
async function loadReports() {
    const container = document.getElementById('content-reportes');
    container.innerHTML = '<div class="text-center text-gray-500 mt-10">Cargando reportes...</div>';

    try {
        // Always fetch fresh data to show recent sales
        allHistory = await window.api.fetchSalesHistory() || [];

        if (allHistory.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 mt-10">No hay datos de ventas aún.</div>';
            return;
        }

        // Apply filters
        let filtered = filterHistoryByPeriod(allHistory, currentPeriod);
        filtered = filterHistoryByCategory(filtered, currentCategory);

        // For week view, create display-filtered data based on selected day
        let displayFiltered = filtered;
        if (currentPeriod === 'week' && selectedWeekDay !== 'total') {
            displayFiltered = filtered.filter(item => {
                // Fix: Use local date for comparison, not UTC (toISOString)
                const d = new Date(item.created_at);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const itemDateLocal = `${year}-${month}-${day}`;

                return itemDateLocal === selectedWeekDay;
            });
        } else if (currentPeriod === 'month' && selectedMonthDay !== 'total') {
            // Filter by selected day in month view
            displayFiltered = filtered.filter(item => {
                const d = new Date(item.created_at);
                return d.getDate() === selectedMonthDay;
            });
        }

        // Calculate stats (always use filtered for totals)
        const totalSales = filtered.reduce((sum, item) => sum + (item.price_sell * item.quantity), 0);
        const totalProfit = filtered.reduce((sum, item) => {
            const cost = item.unit_cost || item.price_buy || 0;
            return sum + ((item.price_sell - cost) * item.quantity);
        }, 0);

        // Calculate display stats (based on selected day if week view)
        const displaySales = displayFiltered.reduce((sum, item) => sum + (item.price_sell * item.quantity), 0);
        const displayProfit = displayFiltered.reduce((sum, item) => {
            const cost = item.unit_cost || item.price_buy || 0;
            return sum + ((item.price_sell - cost) * item.quantity);
        }, 0);

        const byType = calculateSalesByType(displayFiltered);
        const topProducts = getTopProducts(displayFiltered, 5);
        const topCategories = getTopCategories(displayFiltered, 5);
        const chartData = getChartData(allHistory, currentPeriod);
        const categories = getAllCategories(allHistory);

        // Period labels
        const periodLabels = { day: 'Hoy', week: 'Semana', month: 'Mes' };

        // Build HTML
        let html = `
            <div class="p-4 space-y-4 max-w-md mx-auto pb-24">
                <!-- Header -->
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-800">📊 Reportes</h2>
                    <button onclick="window.reports.showClearHistoryModal()" 
                        class="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg">
                        🗑️ Limpiar
                    </button>
                </div>
                
                <!-- Period Tabs -->
                <div class="flex gap-2 bg-gray-100 p-1 rounded-xl">
                    <button onclick="window.reports.setPeriod('day')" 
                        class="flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${currentPeriod === 'day' ? 'bg-blue-500 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}">
                        📅 Hoy
                    </button>
                    <button onclick="window.reports.setPeriod('week')" 
                        class="flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${currentPeriod === 'week' ? 'bg-blue-500 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}">
                        📆 Semana
                    </button>
                    <button onclick="window.reports.setPeriod('month')" 
                        class="flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${currentPeriod === 'month' ? 'bg-blue-500 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}">
                        🗓️ Mes
                    </button>
                </div>
                
                <!-- Category Filter -->
                <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-600">Categoría:</span>
                    <select onchange="window.reports.setCategory(this.value)" 
                        class="flex-1 py-2 px-3 rounded-lg border border-gray-200 text-sm bg-white">
                        <option value="all" ${!currentCategory ? 'selected' : ''}>Todas</option>
                        ${categories.map(cat => `<option value="${cat}" ${currentCategory === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                    </select>
                </div>
                
                <!-- Summary Cards -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white">
                        <p class="text-xs opacity-80">💰 Ventas ${periodLabels[currentPeriod]}</p>
                        <p class="text-2xl font-bold">Bs ${totalSales.toFixed(2)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white">
                        <p class="text-xs opacity-80">📈 Ganancia</p>
                        <p class="text-2xl font-bold">Bs ${totalProfit.toFixed(2)}</p>
                    </div>
                </div>
                
                <!-- Sales by Type -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <p class="text-xs text-gray-500">📦 Paquetes</p>
                        <p class="text-lg font-bold text-purple-600">Bs ${byType.boxSales.toFixed(2)}</p>
                        <p class="text-xs text-gray-400">${byType.boxCount} vendidos</p>
                    </div>
                    <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <p class="text-xs text-gray-500">🔢 Unidades</p>
                        <p class="text-lg font-bold text-orange-600">Bs ${byType.unitSales.toFixed(2)}</p>
                        <p class="text-xs text-gray-400">${byType.unitCount} vendidos</p>
                    </div>
                </div>
                
                <!-- Chart / Calendar -->
                <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        `;

        // Different views based on period
        if (currentPeriod === 'month') {
            // Calendar view for month
            // Calendar view for month
            const calData = getCalendarData(allHistory);
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

            // Calculate Month Total
            const monthTotal = Object.values(calData.salesByDay).reduce((a, b) => a + b, 0);
            const isTotalSelected = selectedMonthDay === 'total';

            html += `
                <div class="flex items-center justify-between mb-3">
                    <button onclick="window.reports.prevMonth()" 
                        class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition-all">
                        ◀
                    </button>
                    <h3 class="font-bold text-gray-700">🗓️ ${monthNames[calData.month]} ${calData.year}</h3>
                    <button onclick="window.reports.nextMonth()" 
                        class="w-8 h-8 rounded-lg ${calData.isCurrentMonth ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} flex items-center justify-center font-bold transition-all"
                        ${calData.isCurrentMonth ? 'disabled' : ''}>
                        ▶
                    </button>
                </div>

                <!-- TOTAL MONTH BUTTON -->
                <button onclick="window.reports.setMonthDay('total')" 
                    class="w-full mb-4 py-3 rounded-xl flex items-center justify-between px-4 transition-all ${isTotalSelected ? 'bg-blue-500 text-white shadow-lg scale-[1.02]' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">📊</span>
                        <span class="font-bold">TOTAL MES</span>
                    </div>
                    <span class="font-bold text-lg">Bs ${monthTotal.toFixed(2)}</span>
                </button>

                <div class="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                    <span class="text-gray-400 font-medium">D</span>
                    <span class="text-gray-400 font-medium">L</span>
                    <span class="text-gray-400 font-medium">M</span>
                    <span class="text-gray-400 font-medium">M</span>
                    <span class="text-gray-400 font-medium">J</span>
                    <span class="text-gray-400 font-medium">V</span>
                    <span class="text-gray-400 font-medium">S</span>
                </div>
                <div class="grid grid-cols-7 gap-1">
            `;

            // Empty cells for days before first of month
            for (let i = 0; i < calData.startDayOfWeek; i++) {
                html += '<div class="h-10"></div>';
            }

            // Days of month
            const today = new Date().getDate();
            const isCurrentMonth = calData.isCurrentMonth;

            for (let day = 1; day <= calData.daysInMonth; day++) {
                const hasSales = calData.salesByDay[day] > 0;
                const isToday = isCurrentMonth && day === today;
                const isSelected = selectedMonthDay === day;

                // Determine classes based on state
                let classes = 'h-10 rounded-lg flex flex-col items-center justify-center text-xs cursor-pointer transition-all active:scale-95 ';

                if (isSelected) {
                    classes += 'bg-blue-500 text-white font-bold shadow-md ring-2 ring-blue-300';
                } else if (isToday) {
                    classes += 'bg-blue-100 text-blue-700 font-bold border border-blue-200';
                } else if (hasSales) {
                    classes += 'bg-green-50 text-green-700 font-medium border border-green-100 hover:bg-green-100';
                } else {
                    classes += 'text-gray-400 hover:bg-gray-50';
                }

                html += `
                    <div class="${classes}" onclick="window.reports.setMonthDay(${day})">
                        <span>${day}</span>
                        ${hasSales ? `<span class="text-[8px] ${isSelected ? 'text-white/90' : 'text-green-600'}">Bs ${calData.salesByDay[day].toFixed(0)}</span>` : ''}
                    </div>
                `;
            }

            html += '</div>';
        } else if (currentPeriod === 'week') {
            // WEEK VIEW: Grid layout 4x2
            html += `<h3 class="font-bold text-gray-700 mb-3">📊 Semana</h3>`;

            // Day selector chips in 4-column grid (TOTAL + 7 days = 8 items)
            html += `<div class="grid grid-cols-4 gap-2">`;

            // TOTAL button first
            const isTotalSelected = selectedWeekDay === 'total';
            const weekTotal = chartData.slice(0, 7).reduce((sum, [, amt]) => sum + amt, 0);
            html += `
                <button onclick="window.reports.setWeekDay('total')" 
                    class="py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center ${isTotalSelected ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                    <span class="text-sm">📊</span>
                    <span>TOTAL</span>
                    <span class="text-[10px] ${isTotalSelected ? 'text-white/80' : 'text-gray-400'}">Bs ${weekTotal.toFixed(0)}</span>
                </button>
            `;

            // Day chips with amounts (Mon to Sun)
            chartData.slice(0, 7).forEach(([date, amount]) => {
                const dayDate = new Date(date + 'T12:00:00');
                const dayName = dayDate.toLocaleDateString('es', { weekday: 'short' });
                const dayNum = dayDate.getDate();
                const isSelected = selectedWeekDay === date;
                const hasSales = amount > 0;

                let btnClass = '';
                if (isSelected) {
                    btnClass = 'bg-blue-500 text-white shadow-lg';
                } else if (hasSales) {
                    btnClass = 'bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100';
                } else {
                    btnClass = 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100';
                }

                html += `
                    <button onclick="window.reports.setWeekDay('${date}')" 
                        class="py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center ${btnClass}">
                        <span class="capitalize">${dayName}</span>
                        <span class="text-lg font-bold">${dayNum}</span>
                        ${hasSales ? `<span class="text-[10px] ${isSelected ? 'text-white/80' : 'text-green-600'}">Bs ${amount.toFixed(0)}</span>` : '<span class="text-[10px]">-</span>'}
                    </button>
                `;
            });

            html += `</div>`;
        } else {
            // DAY VIEW
            const dayAmount = chartData[0] ? chartData[0][1] : 0;
            const shortDate = chartData[0] ? new Date(chartData[0][0] + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }) : '';

            html += `
                <h3 class="font-bold text-gray-700 mb-3">📊 Hoy</h3>
                <div class="text-center py-4">
                    <p class="text-sm text-gray-500 mb-2 capitalize">${shortDate}</p>
                    <p class="text-3xl font-bold text-blue-600">Bs ${dayAmount.toFixed(2)}</p>
                </div>
            `;
        }

        html += `
                </div>
                
                <!-- Top Products -->
                <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <h3 class="font-bold text-gray-700 mb-3">🏆 Top Productos</h3>
                    <div class="space-y-2">
        `;

        if (topProducts.length === 0) {
            html += '<p class="text-sm text-gray-400 text-center py-2">Sin ventas en este período</p>';
        } else {
            topProducts.forEach((product, i) => {
                html += `
                    <div class="flex items-center gap-3">
                        <span class="text-lg font-bold text-gray-300">${i + 1}</span>
                        <img src="${product.image || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlN2U3ZTciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}" class="w-8 h-8 rounded-lg object-cover" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlN2U3ZTciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                        <div class="flex-1">
                            <p class="text-sm font-medium text-gray-800 truncate">${product.name}</p>
                            <p class="text-xs text-gray-400">${product.quantity} un.</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm font-bold text-green-600">Bs ${product.sales.toFixed(2)}</p>
                            <p class="text-[10px] text-orange-500 font-medium">Gan. Bs ${product.profit.toFixed(2)}</p>
                        </div>
                    </div>
                `;
            });
        }

        html += `
                    </div>
                </div>
                
                <!-- Top Categories -->
                <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <h3 class="font-bold text-gray-700 mb-3">📂 Top Categorías</h3>
                    <div class="space-y-2">
        `;

        if (topCategories.length === 0) {
            html += '<p class="text-sm text-gray-400 text-center py-2">Sin ventas en este período</p>';
        } else {
            const catColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
            topCategories.forEach((cat, i) => {
                const percent = (cat.sales / totalSales) * 100 || 0;
                html += `
                    <div class="flex items-center gap-3">
                        <span class="w-3 h-3 rounded-full ${catColors[i % catColors.length]}"></span>
                        <div class="flex-1">
                            <div class="flex justify-between">
                                <span class="text-sm font-medium text-gray-800">${cat.name}</span>
                                <span class="text-sm font-bold text-gray-700">Bs ${cat.sales.toFixed(2)}</span>
                            </div>
                            <div class="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                                <div class="${catColors[i % catColors.length]} h-1.5 rounded-full" style="width: ${percent}%"></div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        html += `
                    </div>
                </div>
                
                <!-- Recent Transactions -->
                <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <h3 class="font-bold text-gray-700 mb-3">📋 Transacciones Recientes</h3>
                    <div class="divide-y">
        `;

        let lastTransactionId = null;
        // Palette of warm colors with better contrast between adjacent ones
        // Orange -> Rose -> Yellow -> Red -> Amber
        const warmColors = ['bg-orange-100', 'bg-rose-100', 'bg-yellow-100', 'bg-red-100', 'bg-amber-100'];
        let colorIndex = 0;

        displayFiltered.slice(0, 15).forEach(item => {
            const date = new Date(item.created_at).toLocaleDateString() + ' ' + new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const hasExtra = item.notes && item.notes.includes('Extra:');

            // Extract extra amount from notes
            let extraInfo = '';
            if (hasExtra) {
                const extraMatch = item.notes.match(/Extra: ([+-]?Bs [\d.-]+)/);
                if (extraMatch) {
                    extraInfo = extraMatch[1];
                }
            }

            // Calculate profit for this item
            const saleTotal = item.price_sell * item.quantity;
            const costTotal = (item.unit_cost || 0) * item.quantity;
            const profit = saleTotal - costTotal;

            // Transaction Grouping Logic
            // If transaction_id exists and is different from last one, switch color
            // If no transaction_id (legacy data), treat as separate transaction
            if (item.transaction_id) {
                if (item.transaction_id !== lastTransactionId) {
                    // Change to next color in palette
                    colorIndex = (colorIndex + 1) % warmColors.length;
                    lastTransactionId = item.transaction_id;
                }
            } else {
                // For legacy items without ID, change color every time
                colorIndex = (colorIndex + 1) % warmColors.length;
                lastTransactionId = null;
            }

            const bgClass = warmColors[colorIndex];

            html += `
                <div class="py-2 px-2 flex justify-between items-center gap-2 ${bgClass} rounded-lg mb-1">
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-sm text-gray-800 truncate">
                            ${item.product_name || item.products?.name || 'Producto eliminado'}
                            ${hasExtra ? `<span class="text-purple-500 cursor-pointer" onclick="alert('Ajuste aplicado: ${extraInfo}')" title="Clic para ver ajuste">⚠️</span>` : ''}
                        </p>
                        <p class="text-xs text-gray-500">${date}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-sm text-green-600">+Bs ${saleTotal.toFixed(2)}</p>
                        <p class="text-xs ${profit > 0 ? 'text-orange-500' : 'text-gray-400'}">
                            ${profit > 0 ? '📈 ' : ''}Bs ${profit.toFixed(2)} gan.
                        </p>
                        <p class="text-xs text-gray-400">${item.quantity} un.</p>
                    </div>
                    <button onclick="window.reports.deleteTransaction('${item.id}', '${item.product_id}', ${item.quantity})" 
                        class="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                        title="Eliminar venta">
                        🗑️
                    </button>
                </div>
            `;
        });

        if (displayFiltered.length === 0) {
            html += '<p class="text-sm text-gray-400 text-center py-4">Sin transacciones en este período</p>';
        }

        html += `
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="text-center text-red-500 mt-10">Error al cargar reportes</div>';
    }
}

// Show Clear History Modal
let originalClearModalContent = '';

function showClearHistoryModal() {
    const modal = document.getElementById('clear-history-modal');
    const contentContainer = modal.querySelector('.bg-white');

    if (!originalClearModalContent) {
        originalClearModalContent = contentContainer.innerHTML;
    } else {
        contentContainer.innerHTML = originalClearModalContent;
    }

    modal.classList.remove('hidden');
}

// Close Clear History Modal
function closeClearHistoryModal() {
    document.getElementById('clear-history-modal').classList.add('hidden');
}

// Show granular options for Week/Month
function showGranularDeleteOptions(period) {
    const modal = document.getElementById('clear-history-modal');
    const contentContainer = modal.querySelector('.bg-white');

    const periodName = period === 'week' ? 'esta SEMANA' : 'este MES';
    const periodIcon = period === 'week' ? '📆' : '🗓️';
    const bgClass = period === 'week' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700';

    contentContainer.innerHTML = `
        <h3 class="text-xl font-bold text-gray-800 mb-4">🗑️ Opciones de Borrado</h3>
        <p class="text-gray-600 mb-6">¿Qué deseas eliminar de ${periodName}?</p>
        
        <div class="space-y-3">
            <button onclick="window.reports.executeClear('${period}')" 
                class="w-full ${bgClass} py-3 rounded-lg font-bold hover:opacity-80 transition">
                ${periodIcon} Todo el Periodo
            </button>
            
            <button onclick="window.reports.showDateSelector()" 
                class="w-full bg-orange-100 text-orange-700 py-3 rounded-lg font-bold hover:bg-orange-200 transition">
                📅 Un día específico
            </button>
        </div>
        
        <button onclick="window.reports.showClearHistoryModal()" 
            class="mt-6 w-full text-gray-500 font-medium hover:text-gray-700">Volver</button>
    `;
}

// Show Date Selector
function showDateSelector() {
    const modal = document.getElementById('clear-history-modal');
    const contentContainer = modal.querySelector('.bg-white');

    const today = new Date().toISOString().split('T')[0];

    contentContainer.innerHTML = `
        <h3 class="text-xl font-bold text-gray-800 mb-4">📅 Seleccionar Día</h3>
        <p class="text-gray-600 mb-4">Elige la fecha que deseas eliminar:</p>
        
        <div class="space-y-4">
            <input type="date" id="delete-date-input" max="${today}" value="${today}"
                class="w-full p-3 border border-gray-300 rounded-lg text-lg">
                
            <button onclick="window.reports.executeClearDate()" 
                class="w-full bg-red-500 text-white py-3 rounded-lg font-bold hover:bg-red-600 transition shadow-lg">
                🗑️ Eliminar Ventas del Día
            </button>
        </div>
        
        <button onclick="window.reports.showClearHistoryModal()" 
            class="mt-6 w-full text-gray-500 font-medium hover:text-gray-700">Cancelar</button>
    `;
}

// Execute Clear Date
async function executeClearDate() {
    const dateInput = document.getElementById('delete-date-input');
    if (!dateInput) return;

    const dateStr = dateInput.value;
    if (!dateStr) {
        alert('Por favor selecciona una fecha');
        return;
    }

    if (!confirm(`¿Estás seguro de eliminar TODAS las ventas del día ${dateStr}?`)) return;

    try {
        await window.api.clearHistoryByDate(dateStr);
        window.ui.showToast('Ventas del día eliminadas');
        closeClearHistoryModal();
        loadReports();
    } catch (error) {
        console.error(error);
        window.ui.showToast('Error al eliminar: ' + error.message, 'error');
    }
}

// Execute Clear Period (renamed from clearHistory to avoid confusion, but kept compatible)
async function executeClear(period) {
    let confirmMsg = '¿Estás seguro de eliminar el historial de ventas?';
    if (period === 'day') confirmMsg = '¿Eliminar ventas de HOY?';
    if (period === 'week') confirmMsg = '¿Eliminar TODAS las ventas de esta SEMANA?';
    if (period === 'month') confirmMsg = '¿Eliminar TODAS las ventas de este MES?';
    if (period === 'all') confirmMsg = '⚠️ ¿ELIMINAR TODO EL HISTORIAL DE VENTAS? Esta acción no se puede deshacer.';

    if (!confirm(confirmMsg)) return;

    try {
        await window.api.clearHistoryByPeriod(period);
        window.ui.showToast('Historial eliminado correctamente');
        closeClearHistoryModal();
        loadReports();
    } catch (error) {
        console.error(error);
        window.ui.showToast('Error al eliminar historial', 'error');
    }
}

// Entry point for clear history buttons
function clearHistory(period) {
    if (period === 'week' || period === 'month') {
        showGranularDeleteOptions(period);
    } else {
        executeClear(period);
    }
}

// Refresh data (clear cache)
function refreshReports() {
    allHistory = [];
    loadReports();
}

// Export
window.reports = {
    load: loadReports,
    setPeriod,
    setCategory,
    setWeekDay,
    setMonthDay,
    prevMonth,
    nextMonth,
    deleteTransaction,
    refresh: refreshReports,
    showDayDetail,
    closeDayDetail,
    showClearHistoryModal,
    closeClearHistoryModal,
    clearHistory,
    executeClear,
    executeClearDate,
    showGranularDeleteOptions,
    showDateSelector
};
