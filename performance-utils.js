// performance-utils.js - Performance optimization utilities for CloudStore PWA

/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last invocation.
 * @param {Function} func - The function to debounce
 * @param {number} wait - Milliseconds to wait (default: 300ms)
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Creates a throttled function that only invokes the provided function
 * at most once per specified time period.
 * @param {Function} func - The function to throttle
 * @param {number} limit - Milliseconds between allowed calls (default: 100ms)
 * @returns {Function} Throttled function
 */
function throttle(func, limit = 100) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Renders items in chunks to avoid blocking the main thread.
 * Uses requestIdleCallback when available, falls back to setTimeout.
 * @param {Array} items - Array of items to render
 * @param {Function} renderFn - Function that renders a single item, returns HTML string
 * @param {HTMLElement} container - Container element to append rendered items
 * @param {number} chunkSize - Number of items per chunk (default: 20)
 */
function renderChunked(items, renderFn, container, chunkSize = 20) {
    // Clear container first
    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 mt-10">No hay productos</div>';
        return;
    }

    let index = 0;
    const fragment = document.createDocumentFragment();

    function processChunk(deadline) {
        // Process items while we have time (or at least one item)
        while (index < items.length && (typeof deadline === 'undefined' || deadline.timeRemaining() > 0 || index % chunkSize !== 0)) {
            const item = items[index];
            const html = renderFn(item);

            // Create temp container to parse HTML
            const temp = document.createElement('div');
            temp.innerHTML = html;

            // Move all children to fragment
            while (temp.firstChild) {
                fragment.appendChild(temp.firstChild);
            }

            index++;

            // After each chunk, append to container
            if (index % chunkSize === 0) {
                container.appendChild(fragment);
                break;
            }
        }

        // Append remaining items in fragment
        if (fragment.childNodes.length > 0) {
            container.appendChild(fragment);
        }

        // Schedule next chunk if more items remain
        if (index < items.length) {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(processChunk, { timeout: 50 });
            } else {
                setTimeout(() => processChunk(), 16);
            }
        }
    }

    // Start processing
    if ('requestIdleCallback' in window) {
        requestIdleCallback(processChunk, { timeout: 50 });
    } else {
        processChunk();
    }
}

// Cache for resolved local:// URLs to blob URLs (Global to share between initImageCaching and getSafeImageUrl)
const localUrlCache = new Map();
// Track pending fetches to avoid duplicate async work
const pendingLocalFetches = new Set();

/**
 * Initialize image caching for product images.
 * Call this after product lists are rendered to cache images progressively.
 * Uses IntersectionObserver to cache images as they become visible.
 */
function initImageCaching() {
    if (!window.offlineDB || !window.offlineDB.getOrFetchImage) {
        console.log('Image caching not available (offlineDB not loaded)');
        return;
    }

    // Cache for object URLs (http/https) to avoid memory leaks
    // Note: local:// URLs are stored in the global localUrlCache
    const objectURLCache = new Map();

    // Process an image element
    async function processImage(img) {
        // PRIORITY: Check data-local-url first (set by UI renderers)
        let originalSrc = img.dataset.localUrl;

        // Fallback to other attributes
        if (!originalSrc) {
            originalSrc = img.dataset.originalSrc || img.src;
        }

        // Skip if no valid source found
        if (!originalSrc) return;

        // If it's a local:// URL, we MUST process it to get the blob
        const isLocalProtocol = originalSrc.startsWith('local://');

        // Skip data/blob URIs only if it's NOT a local protocol URL we need to resolve
        if (!isLocalProtocol && (originalSrc.startsWith('data:') || originalSrc.startsWith('blob:'))) {
            return;
        }

        // Store original URL for reference if not already there
        if (!img.dataset.originalSrc) {
            img.dataset.originalSrc = originalSrc;
        }

        // Check caches
        if (isLocalProtocol) {
            if (localUrlCache.has(originalSrc)) {
                const cachedUrl = localUrlCache.get(originalSrc);
                if (img.src !== cachedUrl) img.src = cachedUrl;
                return;
            }
        } else {
            if (objectURLCache.has(originalSrc)) {
                const cachedUrl = objectURLCache.get(originalSrc);
                if (img.src !== cachedUrl) img.src = cachedUrl;
                return;
            }
        }

        try {
            let cachedUrl;

            if (isLocalProtocol) {
                // For local://, we specifically need the cached blob
                if (window.offlineDB.getCachedImage) {
                    // Check if already fetching
                    if (pendingLocalFetches.has(originalSrc)) {
                        // It's being fetched by getSafeImageUrl or another process
                    }

                    const blob = await window.offlineDB.getCachedImage(originalSrc);
                    if (blob) {
                        cachedUrl = URL.createObjectURL(blob);
                        localUrlCache.set(originalSrc, cachedUrl); // Update global cache
                    }
                }
            } else {
                // For http://, fetch and cache
                cachedUrl = await window.offlineDB.getOrFetchImage(originalSrc);
                if (cachedUrl && cachedUrl !== originalSrc) {
                    objectURLCache.set(originalSrc, cachedUrl);
                }
            }

            if (cachedUrl && cachedUrl !== originalSrc) {
                img.src = cachedUrl;
            }
        } catch (e) {
            console.warn('Image process error:', e);
        }
    }

    // Use IntersectionObserver to cache images as they become visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                processImage(img);
                observer.unobserve(img); // Only process once
            }
        });
    }, {
        rootMargin: '1000px' // Aggressive pre-loading (approx 2-3 screens ahead) to prevent blank spaces
    });

    // Observe all product images
    function observeProductImages() {
        document.querySelectorAll('.product-card img, #product-list img, #sales-products-grid img, .sales-search-result img, #cart-items img').forEach(img => {
            if (!img.dataset.cacheObserved) {
                img.dataset.cacheObserved = 'true';
                observer.observe(img);
            }
        });
    }

    // Initial observation
    observeProductImages();

    // Re-observe after DOM changes (for dynamic content)
    const mutationObserver = new MutationObserver(() => {
        observeProductImages();
    });

    // Observe product containers
    ['product-list', 'sales-products-grid', 'sales-search-results', 'cart-items'].forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            mutationObserver.observe(container, { childList: true, subtree: true });
        }
    });

    console.log('📸 Image caching initialized');

    // BACKGROUND PRELOADER (Low Priority)
    // Fetch all images sequentially to ensure they are ready when scrolling
    if (window.requestIdleCallback) {
        requestIdleCallback(() => preloadAllImages());
    } else {
        setTimeout(() => preloadAllImages(), 3000);
    }

    async function preloadAllImages() {
        if (!window.appState || !window.appState.allProducts) return;

        const products = window.appState.allProducts;
        console.log(`🔄 Starting background image preload for ${products.length} products...`);

        // Process in small chunks to not block main thread
        let index = 0;
        const chunkSize = 5;

        function processNextChunk() {
            if (index >= products.length) {
                console.log('✅ Background preload complete');
                return;
            }

            const chunk = products.slice(index, index + chunkSize);
            index += chunkSize;

            chunk.forEach(p => {
                if (p.image_url && p.image_url.startsWith('local://')) {
                    // Only fetch if not already cached or pending
                    if (!localUrlCache.has(p.image_url) && !pendingLocalFetches.has(p.image_url)) {
                        // We use the same logic as processImage but with lower priority?
                        // Actually, just calling processImage logic here is fine, 
                        // but we don't have the img element. We just want to populate the cache.

                        pendingLocalFetches.add(p.image_url);
                        window.offlineDB.getCachedImage(p.image_url).then(blob => {
                            if (blob) {
                                const blobUrl = URL.createObjectURL(blob);
                                localUrlCache.set(p.image_url, blobUrl);
                                // Update any images currently in DOM that might be waiting
                                document.querySelectorAll(`img[data-local-url="${p.image_url}"]`).forEach(img => {
                                    img.src = blobUrl;
                                });
                            }
                        }).catch(() => { }).finally(() => {
                            pendingLocalFetches.delete(p.image_url);
                        });
                    }
                }
            });

            // Schedule next chunk
            if (window.requestIdleCallback) {
                requestIdleCallback(processNextChunk, { timeout: 100 });
            } else {
                setTimeout(processNextChunk, 50);
            }
        }

        processNextChunk();
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initImageCaching, 1000); // Wait for products to load
    });
} else {
    setTimeout(initImageCaching, 1000);
}

// Placeholder image for invalid/missing images
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlN2U3ZTciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

/**
 * Synchronous function that returns a safe image URL.
 * Handles local:// URLs by returning cached blob URL or placeholder.
 * Use this in render functions where async is not possible.
 * @param {string} url - Image URL
 * @returns {string} Safe URL that browser can load
 */
function getSafeImageUrl(url) {
    // Handle empty/null URLs
    if (!url) return PLACEHOLDER_IMAGE;

    // Handle data: and blob: URLs directly
    if (url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
    }

    // Handle local:// URLs
    if (url.startsWith('local://')) {
        // Check if we already resolved this URL
        if (localUrlCache.has(url)) {
            return localUrlCache.get(url);
        }

        // OPTIMIZATION: Do NOT auto-fetch here.
        // This function is called 500+ times during "Load All" render.
        // Triggering 500 DB requests here chokes the browser.
        // We rely on IntersectionObserver (for visible items) and Background Preloader (for the rest).
        /*
            pendingLocalFetches.add(url);

            window.offlineDB.getCachedImage(url).then(blob => {
                if (blob) {
                    const blobUrl = URL.createObjectURL(blob);
                    localUrlCache.set(url, blobUrl);
                    // Update any images using this local URL
                    document.querySelectorAll(`img[data-local-url="${url}"]`).forEach(img => {
                        img.src = blobUrl;
                    });
                }
            }).catch(err => {
                console.warn(`Failed to resolve ${url}:`, err);
            }).finally(() => {
                pendingLocalFetches.delete(url);
            });
        } */

        // Return placeholder for now
        return PLACEHOLDER_IMAGE;
    }

    // For https:// URLs, return as-is
    return url;
}

/**
 * Compresses an image file before upload.
 * Resizes to max 1024x1024 and converts to JPEG with 0.7 quality.
 * @param {File} file - The image file to compress
 * @returns {Promise<Blob>} Compressed image blob
 */
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        const QUALITY = 0.7;

        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(img.src);

            let width = img.width;
            let height = img.height;

            // Calculate new dimensions
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height = Math.round(height * (MAX_WIDTH / width));
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width = Math.round(width * (MAX_HEIGHT / height));
                    height = MAX_HEIGHT;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (blob) {
                    console.log(`Image compressed: ${(file.size / 1024).toFixed(0)}KB -> ${(blob.size / 1024).toFixed(0)}KB`);
                    resolve(blob);
                } else {
                    reject(new Error('Compression failed'));
                }
            }, 'image/jpeg', QUALITY);
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(img.src);
            reject(err);
        };
    });
}

// Export globally
window.perfUtils = {
    debounce,
    throttle,
    renderChunked,
    initImageCaching,
    getSafeImageUrl,
    compressImage,
    PLACEHOLDER_IMAGE
};

console.log('--- performance-utils.js loaded ---');

