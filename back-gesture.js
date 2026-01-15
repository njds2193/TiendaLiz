// back-gesture.js - Manejo del gesto de "atrás" de Android
// Permite cerrar modales y paneles con el botón/gesto de retroceso

(function () {
    'use strict';

    // Stack de estados de navegación interna
    let navigationStack = [];

    // Bandera para evitar procesar popstate cuando nosotros lo disparamos
    let isNavigatingProgrammatically = false;

    // Lista de IDs de modales que pueden cerrarse con el gesto de atrás
    const CLOSEABLE_MODALS = [
        'product-modal',
        'history-modal',
        'add-history-modal',
        'clear-history-modal',
        'sale-modal',
        'qr-modal',
        'scanner-modal',
        'pdf-export-modal',
        'restock-modal',
        'category-manager-modal',
        'batch-modal',
        'day-detail-modal',
        'expiry-modal'
    ];


    /**
     * Registra la apertura de un modal/panel en el historial
     * @param {string} type - Tipo de elemento ('modal', 'cart', 'panel')
     * @param {string} id - ID del elemento
     */
    function pushState(type, id) {
        const state = { type, id, timestamp: Date.now() };
        navigationStack.push(state);

        // Agregar entrada al historial del navegador
        history.pushState(state, '', '');

        console.log('🔙 Back gesture: Pushed state', state);
    }

    /**
     * Remueve el estado más reciente del stack
     * Se llama cuando un modal se cierra manualmente (no por gesto de atrás)
     * @param {string} id - ID del elemento cerrado
     */
    function removeState(id) {
        const index = navigationStack.findIndex(s => s.id === id);
        if (index > -1) {
            navigationStack.splice(index, 1);

            // Navegar hacia atrás en el historial sin procesar el popstate
            isNavigatingProgrammatically = true;
            history.back();

            // Restaurar la bandera después de un breve delay
            setTimeout(() => {
                isNavigatingProgrammatically = false;
            }, 50);

            console.log('🔙 Back gesture: Removed state for', id);
        }
    }

    /**
     * Encuentra el modal activo más reciente
     * @returns {Object|null} - Información del modal activo
     */
    function findActiveElement() {
        // Primero verificar el cart-panel
        const cartPanel = document.getElementById('cart-panel');
        if (cartPanel && !cartPanel.classList.contains('translate-y-full')) {
            return { type: 'cart', id: 'cart-panel', element: cartPanel };
        }

        // Buscar modales en orden inverso del stack
        for (let i = navigationStack.length - 1; i >= 0; i--) {
            const state = navigationStack[i];
            if (state.type === 'modal') {
                const modal = document.getElementById(state.id);
                if (modal && !modal.classList.contains('hidden')) {
                    return { type: 'modal', id: state.id, element: modal };
                }
            }
        }

        // Buscar cualquier modal visible (por si no está en el stack)
        for (const id of CLOSEABLE_MODALS) {
            const modal = document.getElementById(id);
            if (modal && !modal.classList.contains('hidden')) {
                return { type: 'modal', id, element: modal };
            }
        }

        return null;
    }

    /**
     * Cierra el elemento activo
     * @param {Object} activeElement - Información del elemento a cerrar
     */
    function closeActiveElement(activeElement) {
        if (!activeElement) return false;

        if (activeElement.type === 'cart') {
            // Cerrar carrito
            if (window.sales && window.sales.toggleCart) {
                window.sales.toggleCart();
                console.log('🔙 Back gesture: Cerrado carrito');
                return true;
            }
        } else if (activeElement.type === 'modal') {
            // Cerrar modal
            if (window.ui && window.ui.closeModal) {
                window.ui.closeModal(activeElement.id);
                console.log('🔙 Back gesture: Cerrado modal', activeElement.id);
                return true;
            } else {
                activeElement.element.classList.add('hidden');
                console.log('🔙 Back gesture: Cerrado modal (fallback)', activeElement.id);
                return true;
            }
        }

        return false;
    }

    /**
     * Manejador del evento popstate (gesto de atrás)
     */
    function handlePopState(event) {
        // Ignorar si estamos navegando programáticamente
        if (isNavigatingProgrammatically) {
            return;
        }

        // Buscar elemento activo para cerrar
        const activeElement = findActiveElement();

        if (activeElement) {
            // Hay algo que cerrar
            const closed = closeActiveElement(activeElement);

            if (closed) {
                // Remover del stack
                const index = navigationStack.findIndex(s => s.id === activeElement.id);
                if (index > -1) {
                    navigationStack.splice(index, 1);
                }

                // Prevenir navegación hacia atrás real
                // Re-agregamos una entrada al historial para mantener el estado
                if (navigationStack.length > 0 || findActiveElement()) {
                    // Aún hay más elementos abiertos
                } else {
                    // No hay más elementos, agregar estado base para prevenir cierre de app
                    history.pushState({ type: 'base', id: 'app' }, '', '');
                }
            }
        } else {
            // No hay modales abiertos - prevenir cierre de la app
            // Re-insertar entrada en el historial
            history.pushState({ type: 'base', id: 'app' }, '', '');
            console.log('🔙 Back gesture: No hay modales abiertos, prevenido cierre de app');
        }
    }

    /**
     * Sobrescribe las funciones de ui.js para integrar el historial
     */
    function hookUIFunctions() {
        // Esperar a que window.ui esté disponible
        const checkUI = setInterval(() => {
            if (window.ui) {
                clearInterval(checkUI);

                // Guardar referencias originales
                const originalOpenModal = window.ui.openModal;
                const originalCloseModal = window.ui.closeModal;

                // Sobrescribir openModal
                window.ui.openModal = function (modalId) {
                    originalOpenModal.call(window.ui, modalId);
                    pushState('modal', modalId);
                };

                // Sobrescribir closeModal
                window.ui.closeModal = function (modalId) {
                    originalCloseModal.call(window.ui, modalId);
                    // Remover del stack sin navegar si el modal ya estaba cerrado
                    const index = navigationStack.findIndex(s => s.id === modalId);
                    if (index > -1) {
                        navigationStack.splice(index, 1);
                        // Navegar hacia atrás programáticamente
                        isNavigatingProgrammatically = true;
                        history.back();
                        setTimeout(() => {
                            isNavigatingProgrammatically = false;
                        }, 50);
                    }
                };

                console.log('✅ Back gesture: UI functions hooked');
            }
        }, 100);

        // También observar aperturas de modales que no usen window.ui
        observeModalChanges();
    }

    /**
     * Observa cambios en modales para detectar aperturas/cierres externos
     */
    function observeModalChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const target = mutation.target;
                    const id = target.id;

                    // Verificar si es un modal conocido
                    if (CLOSEABLE_MODALS.includes(id) || id === 'cart-panel') {
                        const wasHidden = mutation.oldValue?.includes('hidden') ||
                            mutation.oldValue?.includes('translate-y-full');
                        const isHidden = target.classList.contains('hidden') ||
                            target.classList.contains('translate-y-full');

                        if (wasHidden && !isHidden) {
                            // Modal abierto
                            const existsInStack = navigationStack.some(s => s.id === id);
                            if (!existsInStack) {
                                const type = id === 'cart-panel' ? 'cart' : 'modal';
                                pushState(type, id);
                            }
                        }
                    }
                }
            });
        });

        // Observar todos los modales conocidos
        const observeModals = () => {
            CLOSEABLE_MODALS.forEach(id => {
                const modal = document.getElementById(id);
                if (modal) {
                    observer.observe(modal, {
                        attributes: true,
                        attributeFilter: ['class'],
                        attributeOldValue: true
                    });
                }
            });

            // También observar el cart-panel
            const cartPanel = document.getElementById('cart-panel');
            if (cartPanel) {
                observer.observe(cartPanel, {
                    attributes: true,
                    attributeFilter: ['class'],
                    attributeOldValue: true
                });
            }
        };

        // Intentar observar inmediatamente y también después de un delay
        observeModals();
        setTimeout(observeModals, 1000);
    }

    /**
     * Inicialización
     */
    function init() {
        // Escuchar evento popstate (gesto de atrás)
        window.addEventListener('popstate', handlePopState);

        // Agregar estado inicial para prevenir cierre inmediato de la app
        history.pushState({ type: 'base', id: 'app' }, '', '');

        // Hook a las funciones de UI
        hookUIFunctions();

        console.log('✅ Back gesture handler initialized');
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exponer API pública
    window.backGesture = {
        pushState,
        removeState,
        getStack: () => [...navigationStack],
        clearStack: () => {
            navigationStack = [];
            console.log('🔙 Back gesture: Stack cleared');
        }
    };

})();
