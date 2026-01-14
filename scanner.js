// scanner.js - QR Code Scanner Module

const scanner = (() => {
    let html5QrCode;
    let isScanning = false;

    function openScanner() {
        const modal = document.getElementById('scanner-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            startScanner();
        }
    }

    function closeScanner() {
        const modal = document.getElementById('scanner-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            stopScanner();
        }
    }

    function startScanner() {
        if (isScanning) return;

        // Check if library is loaded
        if (typeof Html5Qrcode === 'undefined') {
            alert('Error: La librería del escáner no se ha cargado. Verifica tu conexión a internet.');
            return;
        }

        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
            .then(() => {
                isScanning = true;
                document.getElementById('stop-scan-btn').classList.remove('hidden');
            })
            .catch(err => {
                console.error("Error starting scanner", err);
                alert("No se pudo iniciar la cámara. Asegúrate de dar permisos.");
                closeScanner();
            });
    }

    function stopScanner() {
        if (html5QrCode && isScanning) {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                isScanning = false;
                document.getElementById('stop-scan-btn').classList.add('hidden');
            }).catch(err => {
                console.error("Failed to stop scanner", err);
            });
        }
    }

    function onScanSuccess(decodedText, decodedResult) {
        // Play beep sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio play failed', e));

        // Stop scanning temporarily
        stopScanner();
        closeScanner();

        // Handle the scanned code (product ID)
        console.log(`Scan result: ${decodedText}`, decodedResult);

        // Try to find product by ID
        if (window.app && window.app.handleScannedProduct) {
            window.app.handleScannedProduct(decodedText);
        } else {
            // Fallback if app not ready
            alert('Producto escaneado: ' + decodedText);
        }
    }

    function onScanFailure(error) {
        // handle scan failure, usually better to ignore and keep scanning.
        // console.warn(`Code scan error = ${error}`);
    }

    return {
        openScanner,
        closeScanner,
        startScanner,
        stopScanner
    };
})();

// Expose to window
window.scanner = scanner;
