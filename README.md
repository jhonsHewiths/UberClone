# UberClone Driver App 🚗📱

Aplicación móvil desarrollada en **React Native (Expo)** para conductores, diseñada con una arquitectura modular y sincronización en tiempo real mediante **Firebase (Firestore)**. Permite el registro multi-etapa de conductores y vehículos, gestión de perfiles, control de estado de cuenta y flujo completo de viajes con geolocalización.

---

## 📂 Estructura del Proyecto (`src/`)

```text
src/
├── config/                  # Archivos de configuración general
│   ├── Cloudinary.js        # Configuración para subida de imágenes y assets
│   └── Firebase.js          # Configuración e inicialización de Firebase / Firestore
├── navigation/              # Configuración de navegación de la app
│   ├── DriverApp.js         # Contenedor principal de navegación del conductor
│   └── Tabs.js              # Navegación por pestañas inferiores (Tabs)
├── screens/                 # Pantallas principales de la aplicación
│   ├── auth/                # Flujo de registro e inicio de sesión
│   │   ├── DocumentsScreen.js     # Carga de licencia, SOAT y técnico-mecánica
│   │   ├── PersonalDataScreen.js  # Datos personales del conductor
│   │   └── VehicleDataScreen.js   # Datos y características del vehículo
│   ├── earnings/            # Pantalla de ganancias y resumen financiero
│   ├── home/                # Pantalla de inicio, mapa y estado de disponibilidad
│   ├── profile/             # Perfil del conductor y edición de datos
│   └── trips/               # Pantallas del flujo de viajes
│       ├── ActiveTripsScreen.js    # Seguimiento del viaje en curso
│       ├── TripRequestScreen.js    # Visualización de solicitudes entrantes
│       └── TripsSummaryScreen.js   # Resumen e historial de viajes completados
├── services/                # Conexión con servicios externos y backend
│   ├── StorageService.js    # Gestión de almacenamiento (subida de fotos a la nube)
│   └── UserService.js       # Context API y lógica de negocio para usuarios y viajes
├── utils/                   # Funciones puras y de utilidad (validaciones, etc.)
└── App.js                   # Punto de entrada principal de la aplicación Expo

USO IA https://share.gemini.google/vcfhpxyMvBPH
https://share.gemini.google/7sgV8L9h5s7C
