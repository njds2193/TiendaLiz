# CloudStore PWA 🛒

Sistema de gestión de inventario y ventas para pequeños negocios, con soporte offline.

## ✨ Características

- 📦 **Gestión de Inventario** - Productos con categorías, precios y stock
- 💰 **Módulo de Ventas** - Carrito de compras con calculadora de cambio
- 📊 **Reportes** - Estadísticas de ventas y ganancias
- 📷 **Escáner QR** - Escaneo rápido de productos
- 📴 **Offline-First** - Funciona sin conexión con sincronización automática
- 📋 **Lista de Reabastecimiento** - Alertas de stock bajo con exportación a PDF/WhatsApp
- 📄 **Exportar a PDF** - Inventario y listas con imágenes

## 🚀 Tecnologías

- HTML5 / CSS3 (TailwindCSS)
- JavaScript Vanilla
- Supabase (Backend)
- IndexedDB / Dexie.js (Offline storage)
- jsPDF (Exportación PDF)
- PWA (Progressive Web App)

## 📱 Instalación

1. Clona el repositorio
2. Configura Supabase con el esquema en `supabase_schema.sql`
3. Actualiza las credenciales en `api.js`
4. Abre `index.html` en un servidor web o despliega en GitHub Pages

## 📂 Estructura

```
├── index.html          # App principal
├── manifest.json       # Configuración PWA
├── sw.js              # Service Worker
├── api.js             # Conexión Supabase
├── app.js             # Lógica principal
├── ui.js              # Helpers de interfaz
├── sales.js           # Módulo de ventas
├── reports.js         # Reportes y estadísticas
├── scanner.js         # Escáner QR
├── pdf-export.js      # Exportación PDF
├── restock-list.js    # Lista de reabastecimiento
├── offline-db.js      # Base de datos local
├── sync-manager.js    # Sincronización
├── category-filter.js # Filtros
├── product-history.js # Historial de productos
└── supabase_schema.sql # Esquema de base de datos
```

## 📄 Licencia

MIT License
