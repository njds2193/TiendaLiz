// pwa-install.js - PWA Installation Handler

let deferredPrompt = null;

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA: Install prompt available');
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
});

// Listen for successful installation
window.addEventListener('appinstalled', () => {
    console.log('PWA: App was installed');
    deferredPrompt = null;
    hideInstallButton();
});

// Show the install button
function showInstallButton() {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) {
        btn.classList.remove('hidden');
    }
}

// Hide the install button
function hideInstallButton() {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) {
        btn.classList.add('hidden');
    }
}

// Trigger the install prompt
async function installPWA() {
    if (!deferredPrompt) {
        // Show alternative instructions
        showInstallInstructions();
        return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log('PWA: User choice:', outcome);

    // Clear the deferred prompt
    deferredPrompt = null;
    hideInstallButton();
}

// Show manual installation instructions
function showInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let message = '';

    if (isIOS) {
        message = '📱 Para instalar en iPhone/iPad:\n\n1. Toca el botón Compartir (cuadro con flecha)\n2. Selecciona "Añadir a pantalla de inicio"\n3. Toca "Añadir"';
    } else if (isAndroid) {
        message = '📱 Para instalar en Android:\n\n1. Toca el menú (3 puntos arriba)\n2. Selecciona "Agregar a pantalla principal"\n3. Toca "Agregar"';
    } else {
        message = '💻 Para instalar en PC:\n\n1. Busca el icono de instalación en la barra de direcciones\n2. O usa el menú del navegador → "Instalar aplicación"';
    }

    alert(message);
}

// Check if app is already installed (standalone mode)
function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Hide install button if already installed
    if (isAppInstalled()) {
        console.log('PWA: App is already installed');
        hideInstallButton();
    }
});

// Export for global access
window.installPWA = installPWA;
window.isAppInstalled = isAppInstalled;
