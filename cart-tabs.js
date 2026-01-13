// cart-tabs.js - Cart Panel Tab Navigation

(function () {
    'use strict';

    let currentCartTab = 'items';

    // Initialize cart tabs
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setup);
        } else {
            setup();
        }
    }

    function setup() {
        // Inject the tab HTML after cart header
        injectTabsHTML();
        console.log('Cart tabs initialized');
    }

    function injectTabsHTML() {
        const cartPanel = document.getElementById('cart-panel');
        if (!cartPanel) return;

        // Find the cart header
        const cartHeader = cartPanel.querySelector('div[style*="C2714F"]');
        if (!cartHeader) return;

        // Create tabs container
        const tabsDiv = document.createElement('div');
        tabsDiv.id = 'cart-tabs-container';
        tabsDiv.className = 'flex bg-gray-100 p-1 gap-1';
        tabsDiv.innerHTML = `
            <button id="cart-tab-items" onclick="window.cartTabs.switchTab('items')"
                class="flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all bg-white text-gray-800 shadow-sm">
                🛒 Items
            </button>
            <button id="cart-tab-extra" onclick="window.cartTabs.switchTab('extra')"
                class="flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all text-gray-500 hover:bg-gray-200">
                ✨ Extra <span id="extra-tab-badge" class="hidden text-xs bg-purple-500 text-white px-1.5 py-0.5 rounded-full ml-1">0</span>
            </button>
            <button id="cart-tab-change" onclick="window.cartTabs.switchTab('change')"
                class="flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all text-gray-500 hover:bg-gray-200">
                💵 Cambio
            </button>
        `;

        // Insert after header
        cartHeader.after(tabsDiv);

        // Wrap existing sections with IDs for tab switching
        wrapContentSections();
    }

    function wrapContentSections() {
        // Get the cart-items, extra section, and change calculator sections
        const cartItems = document.getElementById('cart-items');
        const cartPanel = document.getElementById('cart-panel');

        if (!cartItems || !cartPanel) return;

        // Find Extra section (the one with purple gradient)
        const extraSection = cartPanel.querySelector('.bg-gradient-to-r.from-purple-50');
        if (extraSection) {
            extraSection.id = 'cart-section-extra';
            extraSection.classList.add('hidden'); // Hide by default
        }

        // Find change calculator section (inside green footer)
        const footer = cartPanel.querySelector('div[style*="48BB78"]');
        if (footer) {
            const changeCalc = footer.querySelector('.bg-white\\/10');
            if (changeCalc) {
                // Create wrapper for change section
                const changeWrapper = document.createElement('div');
                changeWrapper.id = 'cart-section-change';
                changeWrapper.className = 'hidden p-4';
                changeWrapper.style.background = 'linear-gradient(to bottom right, #48BB78, #38A169)';
                changeWrapper.style.minHeight = '180px';

                // Move change calc content to wrapper and create bigger version
                changeWrapper.innerHTML = `
                    <div class="text-center mb-4">
                        <p class="text-white/80 text-sm mb-1">💵 Monto Recibido</p>
                        <span class="text-4xl font-bold text-white" id="received-amount-big">Bs 0.00</span>
                    </div>
                    <div class="grid grid-cols-4 gap-2 mb-4">
                        <button onclick="window.sales.addReceived(1)"
                            class="py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl active:scale-95 transition-all">1</button>
                        <button onclick="window.sales.addReceived(5)"
                            class="py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl active:scale-95 transition-all">5</button>
                        <button onclick="window.sales.addReceived(10)"
                            class="py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl active:scale-95 transition-all">10</button>
                        <button onclick="window.sales.addReceived(20)"
                            class="py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl active:scale-95 transition-all">20</button>
                        <button onclick="window.sales.addReceived(50)"
                            class="py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl active:scale-95 transition-all">50</button>
                        <button onclick="window.sales.addReceived(100)"
                            class="py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl active:scale-95 transition-all">100</button>
                        <button onclick="window.sales.addReceived(200)"
                            class="py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl active:scale-95 transition-all">200</button>
                        <button onclick="window.sales.resetReceived()"
                            class="py-3 bg-red-400/50 hover:bg-red-400/70 text-white font-bold rounded-xl active:scale-95 transition-all">🔄</button>
                    </div>
                    <div class="bg-white/20 rounded-xl p-4 text-center">
                        <p class="text-white/80 text-sm mb-1">📢 CAMBIO A DEVOLVER</p>
                        <span id="change-amount-big" class="text-4xl font-bold text-yellow-300">Bs 0.00</span>
                    </div>
                `;

                // Insert before extra section
                if (extraSection) {
                    extraSection.after(changeWrapper);
                }

                // Hide the original change calc in footer
                changeCalc.classList.add('hidden');
                changeCalc.id = 'change-calc-original';
            }
        }

        // Keep cart-items ID but add a data attribute for tab switching
        cartItems.dataset.tabSection = 'items';
    }

    function switchTab(tabName) {
        currentCartTab = tabName;

        // Update tab buttons
        const tabs = ['items', 'extra', 'change'];
        tabs.forEach(tab => {
            const btn = document.getElementById(`cart-tab-${tab}`);
            if (btn) {
                if (tab === tabName) {
                    btn.className = 'flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all bg-white text-gray-800 shadow-sm';
                } else {
                    btn.className = 'flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all text-gray-500 hover:bg-gray-200';
                }
            }
        });

        // Show/hide sections - cart-items keeps original ID
        const itemsSection = document.getElementById('cart-items');
        const extraSection = document.getElementById('cart-section-extra');
        const changeSection = document.getElementById('cart-section-change');

        // Hide all first
        if (itemsSection) itemsSection.classList.add('hidden');
        if (extraSection) extraSection.classList.add('hidden');
        if (changeSection) changeSection.classList.add('hidden');

        // Show selected
        if (tabName === 'items' && itemsSection) {
            itemsSection.classList.remove('hidden');
        } else if (tabName === 'extra' && extraSection) {
            extraSection.classList.remove('hidden');
        } else if (tabName === 'change' && changeSection) {
            changeSection.classList.remove('hidden');
        }
    }

    function updateExtraBadge(amount) {
        const badge = document.getElementById('extra-tab-badge');
        if (badge) {
            if (amount !== 0) {
                badge.textContent = amount > 0 ? `+${amount.toFixed(0)}` : amount.toFixed(0);
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    function syncChangeDisplay() {
        // Sync the big display with the values from sales.js
        const receivedSmall = document.getElementById('received-amount');
        const receivedBig = document.getElementById('received-amount-big');
        const changeSmall = document.getElementById('change-amount');
        const changeBig = document.getElementById('change-amount-big');

        if (receivedSmall && receivedBig) {
            receivedBig.textContent = receivedSmall.textContent;
        }
        if (changeSmall && changeBig) {
            changeBig.textContent = changeSmall.textContent;
            changeBig.className = changeSmall.className.replace('text-2xl', 'text-4xl');
        }
    }

    // Watch for changes to received/change amounts
    function setupObservers() {
        const receivedEl = document.getElementById('received-amount');
        const changeEl = document.getElementById('change-amount');

        const observer = new MutationObserver(syncChangeDisplay);
        const config = { childList: true, characterData: true, subtree: true };

        if (receivedEl) observer.observe(receivedEl, config);
        if (changeEl) observer.observe(changeEl, config);
    }

    // Export
    window.cartTabs = {
        init,
        switchTab,
        updateExtraBadge,
        syncChangeDisplay
    };

    // Also add to sales namespace for backwards compatibility
    if (window.sales) {
        window.sales.switchCartTab = switchTab;
    } else {
        // Wait for sales to load then add
        const checkSales = setInterval(() => {
            if (window.sales) {
                window.sales.switchCartTab = switchTab;
                clearInterval(checkSales);
            }
        }, 100);
    }

    init();

    // Setup observers after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(setupObservers, 500);
        });
    } else {
        setTimeout(setupObservers, 500);
    }
})();
