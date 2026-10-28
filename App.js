
import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import RegisterTabs from './src/navigation/Tabs';
import { UserProvider } from './src/services/UserService';

export default function App() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <SafeAreaView
          style={styles.container}
          edges={['top']}
        >
          <NavigationContainer>
            <RegisterTabs />
          </NavigationContainer>
        </SafeAreaView>
      </UserProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});




/* src/
├── assets/                  # Imágenes, iconos, fuentes (ej. fotos de perfil por defecto)
├── components/              # Componentes reutilizables (botones, tarjetas de viajes, modales)
│   ├── common/              # Elementos genéricos (Botones, inputs con validación)
│   └── driver/              # Componentes específicos (Tarjeta de solicitud entrante, interruptor de disponibilidad)
├── config/                  # Archivos de configuración general
│   ├── pricing.js           # Tarifas base, multiplicadores y comisiones (ej. 20%)
│   └── firebase.js          # Configuración de Firebase / base de datos[cite: 7]
├── hooks/                   # Hooks personalizados obligatorios y auxiliares
│   ├── useDriverLocation.js # Seguimiento de ubicación en tiempo real[cite: 3, 7]
│   ├── useTripRequests.js   # Escucha de solicitudes de viaje[cite: 3, 7]
│   └── useEarnings.js       # Cálculo memorizado (useMemo) de ganancias[cite: 3, 5]
├── navigation/              # Configuración de navegación (Stack, Tabs, Drawer)
│   ├── AppNavigator.js      # Contenedor principal
│   ├── AuthNavigator.js     # Flujo de registro e inicio de sesión[cite: 2]
│   ├── MainDrawerNavigator.js # Drawer para perfil, historial, ganancias y configuración
│   └── TripStackNavigator.js  # Flujo en tiempo real del viaje (recogida, destino, cobro)[cite: 1]
├── screens/                 # Pantallas principales de la aplicación[cite: 3]
│   ├── auth/                # Pantallas de registro (Datos personales, Vehículo, Documentos)[cite: 2, 3]
│   ├── home/                # Pantalla de Inicio (Mapa y botón Disponible/No disponible)[cite: 3]
│   ├── trip/                # Pantallas del flujo de viaje (Solicitud entrante, En curso, Cobro)[cite: 3]
│   ├── earnings/            # Pantalla de Ganancias (Día, semana, mes)[cite: 3, 5]
│   ├── history/             # Historial de carreras y filtros[cite: 3, 6]
│   └── profile/             # Perfil y configuración del conductor[cite: 3]
├── services/                # Conexión con APIs externas y backend
│   ├── api.js               # Llamadas HTTP al backend (Node.js / Firebase Cloud Functions)[cite: 4]
│   ├── directions.js        # Integración con Google Directions API[cite: 1, 7]
│   └── payment.js           # Pasarela de pagos (Mercado Pago / Stripe)[cite: 4]
├── theme/                   # Estilos globales, paleta de colores, tipografías
│   ├── colors.js
│   └── typography.js
└── utils/                   # Funciones puras y de utilidad
    ├── calculateFare.js     # Lógica matemática pura para tarifas y comisión[cite: 5]
    └── validators.js        # Validaciones para formularios (placas colombianas ABC123, cédulas, etc.)[cite: 2] */