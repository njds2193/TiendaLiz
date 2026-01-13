/**
 * Tienda LIZ - Theme Loader
 * Inyecta el tema Terracota Elegante y Navegación Inferior
 */

(function () {
    'use strict';

    // Colores del tema Terracota Elegante
    const COLORS = {
        terracotta: '#D4714A',
        terracottaDark: '#BF5540',
        terracottaLight: '#E8A598',
        sienna: '#C75B39',
        creamBg: '#FFF8F5',
        dustyRose: '#E8A598',
        white: '#FFFFFF',
        gray: '#9CA3AF'
    };

    // CSS del tema y navegación
    const themeCSS = `
        /* Logo 3D Effect */
        .logo-3d {
            font-family: 'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif;
            font-weight: 900;
            color: #fff;
            text-shadow:
                0 1px 0 #E8A598,
                0 2px 0 #D4714A,
                0 3px 0 #C75B39,
                0 4px 0 #BF5540,
                0 5px 10px rgba(0,0,0,0.2);
            letter-spacing: 1px;
        }

        /* --- OVERRIDES FOR DYNAMIC ELEMENTS --- */
        
        /* Sales: Category Buttons */
        .sales-cat-btn.bg-blue-600 {
            background-color: #D4714A !important;
            color: white !important;
        }
        
        /* Sales: Product Box Button (📦+) */
        button.bg-blue-600 {
            background-color: #C75B39 !important;
        }
        button.bg-blue-600:hover {
            background-color: #BF5540 !important;
        }

        /* Reports: Period Buttons */
        #report-period-buttons button.bg-blue-600,
        #report-period-buttons button.bg-blue-500 {
            background-color: #D4714A !important;
        }

        /* Reports: Summary Cards */
        .bg-blue-500 {
            background: linear-gradient(135deg, #D4714A 0%, #C75B39 100%) !important;
        }

        /* General Blue Overrides */
        .text-blue-600 { color: #C75B39 !important; }
        .text-blue-500 { color: #D4714A !important; }
        .bg-blue-100 { background-color: #FFE5DC !important; color: #6B3A2E !important; }
        .border-blue-200, .border-blue-300 { border-color: #E8A598 !important; }
        .bg-blue-50 { background-color: #FFF8F5 !important; }

        /* --- BOTTOM NAVIGATION STYLES --- */
        
        /* Hide original top tabs */
        #app > header .flex.mt-4.bg-blue-700\\/50 {
            display: none !important;
        }

        /* Body padding to prevent content hiding */
        body {
            padding-bottom: 80px !important;
        }

        /* Fixed Bottom Nav */
        .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            display: flex;
            justify-content: space-around;
            align-items: center;
            padding: 10px 0;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
            z-index: 9999;
            border-top: 1px solid #FFE5DC;
        }

        .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #9CA3AF; /* Gray inactive */
            text-decoration: none;
            font-size: 10px;
            font-weight: 600;
            transition: all 0.2s;
            width: 33%;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
        }

        .nav-item svg {
            width: 24px;
            height: 24px;
            margin-bottom: 4px;
            transition: transform 0.2s;
        }

        .nav-item.active {
            color: #D4714A; /* Terracotta active */
        }

        .nav-item.active svg {
            transform: translateY(-2px);
            filter: drop-shadow(0 4px 6px rgba(212, 113, 74, 0.4));
        }

        /* Adjust Floating Buttons Position */
        #fab-btn:not(.hidden) {
            bottom: 90px !important; /* Main action (Add) at bottom */
            z-index: 10001 !important;
            position: fixed !important;
            right: 20px !important;
            display: flex !important;
        }

        #cart-fab:not(.hidden) {
            bottom: 160px !important; /* Cart above Add button */
            z-index: 10001 !important;
            position: fixed !important;
            right: 20px !important;
            display: flex !important;
        }
        
        /* Fix Inventory Overlap */
        #product-list {
            padding-top: 20px !important; /* Add space for sticky header */
        }

        /* Adjust Cart Panel max-height */
        #cart-panel {
            bottom: 70px !important; /* Sit above nav */
            max-height: calc(90vh - 70px) !important;
        }
    `;

    // Inyectar CSS
    function injectCSS() {
        const style = document.createElement('style');
        style.textContent = themeCSS;
        document.head.appendChild(style);

        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) themeMeta.setAttribute('content', COLORS.terracotta);
        document.title = 'Tienda LIZ';
    }

    // Crear Barra de Navegación Inferior
    function createBottomNav() {
        // Evitar duplicados
        if (document.querySelector('.bottom-nav')) return;

        const nav = document.createElement('div');
        nav.className = 'bottom-nav';
        nav.innerHTML = `
            <div class="nav-item active" onclick="window.ui.switchTab('inventario')" id="nav-inventario">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Inventario</span>
            </div>
            <div class="nav-item" onclick="window.ui.switchTab('ventas')" id="nav-ventas">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Ventas</span>
            </div>
            <div class="nav-item" onclick="window.ui.switchTab('reportes')" id="nav-reportes">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Reportes</span>
            </div>
        `;
        document.body.appendChild(nav);
    }

    // Actualizar estado activo de la navegación
    function updateActiveNav(tabName) {
        const items = document.querySelectorAll('.nav-item');
        items.forEach(item => {
            item.classList.remove('active');
            if (item.id === `nav-${tabName}`) {
                item.classList.add('active');
            }
        });
    }

    // Aplicar tema al login y header (código existente simplificado)
    function applyThemes() {
        // Login
        const loginHeader = document.querySelector('#login-container .bg-blue-600');
        if (loginHeader) {
            loginHeader.classList.remove('bg-blue-600');
            loginHeader.style.background = `linear-gradient(135deg, ${COLORS.terracotta} 0%, ${COLORS.sienna} 100%)`;
            const title = loginHeader.querySelector('h1');
            if (title) { title.textContent = 'Tienda LIZ'; title.classList.add('logo-3d'); }
        }
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.style.background = `linear-gradient(135deg, ${COLORS.sienna} 0%, ${COLORS.terracottaDark} 100%)`;
        }

        // Header Principal
        const header = document.querySelector('#app > header');
        if (header) {
            header.classList.remove('bg-blue-600');
            header.style.background = `linear-gradient(135deg, ${COLORS.terracotta} 0%, ${COLORS.sienna} 100%)`;
            const h1 = header.querySelector('h1');
            if (h1) h1.innerHTML = '<span class="logo-3d text-2xl">🏪 Tienda LIZ</span>';
        }

        // Cart FAB
        const cartFab = document.getElementById('cart-fab');
        if (cartFab) {
            cartFab.style.background = `linear-gradient(135deg, ${COLORS.terracotta} 0%, ${COLORS.sienna} 100%)`;
        }
    }

    // Patch switchTab
    function patchTabSwitch() {
        const originalSwitchTab = window.ui?.switchTab;
        if (originalSwitchTab) {
            window.ui.switchTab = function (tabName, forceSwitch) {
                const result = originalSwitchTab(tabName, forceSwitch);
                // Only update nav if the switch was successful (not cancelled)
                if (result !== false) {
                    updateActiveNav(tabName);
                }
                return result;
            };
        }
    }

    // Init
    function init() {
        injectCSS();
        applyThemes();
        createBottomNav();

        // Observer para elementos dinámicos
        const observer = new MutationObserver((mutations) => {
            // Verificar si los cambios son relevantes para evitar bucles
            let shouldUpdate = false;
            for (const mutation of mutations) {
                // Ignorar cambios en atributos de estilo o clases que nosotros mismos hacemos
                if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                    continue;
                }
                shouldUpdate = true;
                break;
            }

            if (shouldUpdate) {
                observer.disconnect(); // Pausar observación
                applyThemes();
                observer.observe(document.body, { childList: true, subtree: true }); // Reanudar
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Wait for UI
        const checkUI = setInterval(() => {
            if (window.ui?.switchTab) {
                patchTabSwitch();
                clearInterval(checkUI);
            }
        }, 100);

        console.log('🎨 Tema Terracota + Bottom Nav aplicado - Tienda LIZ');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
