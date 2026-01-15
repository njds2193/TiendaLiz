// edge-swipe.js - Gesto de borde lateral para cerrar modales
// Deslizar desde el borde izquierdo hacia la derecha cierra ventanas

(function () {
    'use strict';

    // Configuración
    const EDGE_THRESHOLD = 25;           // Zona de detección desde el borde izquierdo (px)
    const MIN_SWIPE_DISTANCE = 80;       // Distancia mínima para activar cierre (px)
    const VELOCITY_THRESHOLD = 0.3;       // Velocidad mínima para cierre rápido (px/ms)

    // Estado del gesto
    let isSwipeActive = false;
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let currentModal = null;
    let modalContent = null;

    // Lista de IDs de modales soportados
    const MODAL_IDS = [
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
        'day-detail-modal'
    ];

    // Encontrar modal activo
    function findActiveModal() {
        // Primero verificar el cart-panel (caso especial)
        const cartPanel = document.getElementById('cart-panel');
        if (cartPanel && !cartPanel.classList.contains('translate-y-full')) {
            return { modal: cartPanel, isCart: true };
        }

        // Buscar modales normales
        for (const id of MODAL_IDS) {
            const modal = document.getElementById(id);
            if (modal && !modal.classList.contains('hidden')) {
                const content = modal.querySelector('.bg-white, [class*="bg-white"]');
                return { modal, content, isCart: false };
            }
        }
        return null;
    }

    // Cerrar modal activo
    function closeActiveModal(activeModal) {
        if (!activeModal) return;

        if (activeModal.isCart) {
            // Cerrar carrito
            if (window.sales && window.sales.toggleCart) {
                window.sales.toggleCart();
            }
        } else {
            // Cerrar modal normal
            if (window.ui && window.ui.closeModal) {
                window.ui.closeModal(activeModal.modal.id);
            } else {
                activeModal.modal.classList.add('hidden');
            }
        }
    }

    // Evento: inicio del toque
    function handleTouchStart(e) {
        const touch = e.touches[0];

        // Solo activar si el toque comienza en el borde izquierdo
        if (touch.clientX > EDGE_THRESHOLD) {
            return;
        }

        // Buscar modal activo
        const activeModal = findActiveModal();
        if (!activeModal) return;

        isSwipeActive = true;
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = Date.now();
        currentModal = activeModal;
        modalContent = activeModal.content || activeModal.modal;

        // Preparar para animación
        if (modalContent) {
            modalContent.style.transition = 'none';
        }
    }

    // Evento: movimiento del toque
    function handleTouchMove(e) {
        if (!isSwipeActive || !currentModal) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        // Si el movimiento vertical es mayor, cancelar (el usuario está scrolleando)
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
            resetSwipe();
            return;
        }

        // Solo procesar swipes hacia la derecha
        if (deltaX < 0) return;

        // Prevenir scroll mientras se desliza
        e.preventDefault();

        // Calcular opacidad y posición
        const progress = Math.min(deltaX / MIN_SWIPE_DISTANCE, 1);
        const translateX = deltaX * 0.6; // Factor de amortiguación
        const opacity = 1 - (progress * 0.3);

        // Aplicar transformación visual
        if (modalContent && !currentModal.isCart) {
            modalContent.style.transform = `translateX(${translateX}px)`;
            modalContent.style.opacity = opacity;
        } else if (currentModal.isCart) {
            // Para el carrito, mostrar feedback sutil
            currentModal.modal.style.transform = `translateX(${translateX * 0.5}px)`;
        }
    }

    // Evento: fin del toque
    function handleTouchEnd(e) {
        if (!isSwipeActive || !currentModal) {
            resetSwipe();
            return;
        }

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - startX;
        const deltaTime = Date.now() - startTime;
        const velocity = deltaX / deltaTime;

        // Determinar si se debe cerrar
        const shouldClose = deltaX >= MIN_SWIPE_DISTANCE || velocity >= VELOCITY_THRESHOLD;

        if (shouldClose && deltaX > 30) {
            // Animar salida
            if (modalContent && !currentModal.isCart) {
                modalContent.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
                modalContent.style.transform = 'translateX(100%)';
                modalContent.style.opacity = '0';

                setTimeout(() => {
                    closeActiveModal(currentModal);
                    resetModalStyles();
                }, 200);
            } else {
                closeActiveModal(currentModal);
                resetModalStyles();
            }
        } else {
            // Volver a posición original
            resetModalStyles(true);
        }

        resetSwipe();
    }

    // Resetear estado del swipe
    function resetSwipe() {
        isSwipeActive = false;
        startX = 0;
        startY = 0;
        startTime = 0;
    }

    // Resetear estilos del modal
    function resetModalStyles(animate = false) {
        if (!modalContent) return;

        if (animate) {
            modalContent.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
        }

        modalContent.style.transform = '';
        modalContent.style.opacity = '';

        if (currentModal && currentModal.isCart) {
            currentModal.modal.style.transform = '';
        }

        setTimeout(() => {
            if (modalContent) {
                modalContent.style.transition = '';
            }
        }, 200);

        currentModal = null;
        modalContent = null;
    }

    // Inicializar listeners
    function init() {
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        document.addEventListener('touchcancel', () => {
            resetModalStyles(true);
            resetSwipe();
        }, { passive: true });

        console.log('✅ Edge swipe gestures initialized');
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exponer API para agregar modales dinámicos
    window.edgeSwipe = {
        addModal: (id) => {
            if (!MODAL_IDS.includes(id)) {
                MODAL_IDS.push(id);
            }
        },
        removeModal: (id) => {
            const index = MODAL_IDS.indexOf(id);
            if (index > -1) {
                MODAL_IDS.splice(index, 1);
            }
        }
    };
})();
