import React, { useEffect, useRef } from 'react';
import { Alert, AppState, Linking, Modal, StyleSheet, Text, View } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import EarningsScreen from '../screens/earnings/EarningsScreen';
import HomeScreen from '../screens/home/Home';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ActiveTripScreen from '../screens/trips/ActiveTripScreen';
import TripRequestScreen from '../screens/trips/TripRequestScreen';
import TripHistoryScreen from '../screens/trips/TripHistoryScreen';
import TripSummaryScreen from '../screens/trips/TripSummaryScreen';
import { useRegister } from '../services/UserService';
import { createTripCheckout, verifyTripPayment } from '../services/PaymentService';

const Tab = createBottomTabNavigator();

export default function DriverApp() {
  const { accountStatus, pendingRequest, activeTrip, completedTrip, driverLocation, userDocumentId,
    createMockRequest: createRequest,
    acceptMockRequest: acceptRequest,
    rejectMockRequest: rejectRequest,
    markPassengerOnboard: PassengerTrip,
    updateActiveTripNavigation,
    finishMockTrip: finishTrip,
    resolveMockPayment: solvePayment,
    dismissCompletedTrip,
  } = useRegister();
  const isAvailable = accountStatus.trim().toLowerCase() === 'disponible';
  const paymentReturnInProgress = useRef(false);
  const pendingPaymentId = useRef(null);
  const lastPaymentId = useRef(null);
  const checkoutOpened = useRef(false);
  const currentAppState = useRef(AppState.currentState);

  const startPayment = async () => {
    try {
      const checkoutUrl = await createTripCheckout({
        driverId: userDocumentId,
        tripId: completedTrip.firestoreId,
        returnUrl: ExpoLinking.createURL('payment-return'),
      });
      checkoutOpened.current = true;
      await Linking.openURL(checkoutUrl);
    } catch (error) {
      checkoutOpened.current = false;
      console.error('Error al iniciar el pago con Mercado Pago:', error);
      Alert.alert('No se pudo iniciar el pago', error.message);
    }
  };

  const verifyPendingPayment = async () => verifyTripPayment({
    driverId: userDocumentId,
    tripId: completedTrip.firestoreId,
    ...(lastPaymentId.current ? { paymentId: lastPaymentId.current } : {}),
  });

  useEffect(() => {
    if (!completedTrip?.firestoreId || !userDocumentId) return undefined;
    pendingPaymentId.current = null;
    lastPaymentId.current = null;
    checkoutOpened.current = false;
    let active = true;
    let verificationTimer;

    const verifyPayment = async (paymentId) => {
      if (paymentId) {
        lastPaymentId.current = String(paymentId);
      }
      if (paymentReturnInProgress.current) {
        if (paymentId) pendingPaymentId.current = String(paymentId);
        return;
      }
      paymentReturnInProgress.current = true;
      try {
        const result = await verifyTripPayment({
          driverId: userDocumentId,
          tripId: completedTrip.firestoreId,
          ...(lastPaymentId.current ? { paymentId: lastPaymentId.current } : {}),
        });
        if (result.paymentStatus === 'Aprobado') {
          checkoutOpened.current = false;
          lastPaymentId.current = null;
        } else if (active) {
          Alert.alert('Pago pendiente', `Mercado Pago informa: ${result.paymentStatus}.`);
        }
      } catch (error) {
        console.error('Error al verificar el pago con Mercado Pago:', error);
        if (active) Alert.alert('No se pudo verificar el pago', error.message);
      } finally {
        paymentReturnInProgress.current = false;
        const queuedPaymentId = pendingPaymentId.current;
        pendingPaymentId.current = null;
        if (active && queuedPaymentId) verifyPayment(queuedPaymentId);
      }
    };

    const handlePaymentReturn = (url) => {
      const parsedUrl = ExpoLinking.parse(url);
      const isPaymentReturn = (
        parsedUrl.hostname === 'payment-return'
        || parsedUrl.path?.endsWith('/payment-return')
      );
      if (!isPaymentReturn) return;

      const paymentIdValue = (
        parsedUrl.queryParams?.payment_id
        || parsedUrl.queryParams?.collection_id
      );
      const paymentId = Array.isArray(paymentIdValue) ? paymentIdValue[0] : paymentIdValue;
      verifyPayment(paymentId);
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handlePaymentReturn(url);
    });
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      const returnedToApp = (
        ['inactive', 'background'].includes(currentAppState.current)
        && nextState === 'active'
      );
      currentAppState.current = nextState;
      if (returnedToApp && checkoutOpened.current) {
        verificationTimer = setTimeout(() => {
          if (active && checkoutOpened.current) verifyPayment();
        }, 1500);
      }
    });
    Linking.getInitialURL()
      .then((url) => {
        if (url && active) handlePaymentReturn(url);
      })
      .catch((error) => {
        console.error('No se pudo leer el enlace de retorno del pago:', error);
      });

    return () => {
      active = false;
      clearTimeout(verificationTimer);
      subscription.remove();
      appStateSubscription.remove();
    };
  }, [completedTrip?.firestoreId, userDocumentId]);

  useEffect(() => {
    if (!isAvailable || pendingRequest || activeTrip || completedTrip) return undefined;

    const timer = setTimeout(createRequest, 5000);
    return () => clearTimeout(timer);
  }, [activeTrip, completedTrip, createRequest,isAvailable,pendingRequest]);

  return (
    <NavigationContainer>
      <View style={styles.container}>
        <Tab.Navigator
          initialRouteName="Inicio"
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#570376',
            tabBarInactiveTintColor: '#888',
            tabBarLabelStyle: { fontWeight: 'bold', fontSize: 12 },
          }}
        >
          <Tab.Screen
            name="Historial"
            component={TripHistoryScreen}
            options={{
              tabBarIcon: ({ color }) => (
                <Text style={[styles.homeIcon, { color }]}>↻</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Inicio"
            component={HomeScreen}
            options={{
              tabBarIcon: ({ color }) => (
                <Text style={[styles.homeIcon, { color }]}>⌂</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Ganancias"
            component={EarningsScreen}
            options={{
              tabBarIcon: ({ color }) => (
                <View style={[styles.chartIcon, { borderColor: color }]}>
                  {[8, 14, 20].map((height) => (
                    <View
                      key={height}
                      style={[styles.chartBar, { height, backgroundColor: color }]}
                    />
                  ))}
                </View>
              ),
            }}
          />
          <Tab.Screen
            name="Perfil"
            component={ProfileScreen}
            options={{
              tabBarIcon: ({ color }) => (
                <View style={styles.profileIcon}>
                  <View style={[styles.profileHead, { backgroundColor: color }]} />
                  <View style={[styles.profileBody, { backgroundColor: color }]} />
                </View>
              ),
            }}
          />
        </Tab.Navigator>

        {pendingRequest && (
          <TripRequestScreen
            request={pendingRequest}
            onAccept={acceptRequest}
            onReject={rejectRequest}
          />
        )}

        {activeTrip && (
          <Modal
            visible
            animationType="none"
            presentationStyle="fullScreen"
            onRequestClose={() => {}}
          >
            <ActiveTripScreen
              trip={activeTrip}
              driverLocation={driverLocation}
              onPassengerTrip={PassengerTrip}
              onFinish={finishTrip}
              onRouteLoaded={updateActiveTripNavigation}
            />
          </Modal>
        )}

        {completedTrip && (
          <TripSummaryScreen
            trip={completedTrip}
            onSolvePayment={solvePayment}
            onStartPayment={startPayment}
            onVerifyPayment={verifyPendingPayment}
            onClose={dismissCompletedTrip}
          />
        )}

      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  homeIcon: {
    fontSize: 27,
    lineHeight: 29,
  },
  chartIcon: {
    width: 25,
    height: 24,
    borderBottomWidth: 2,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
    paddingBottom: 2,
  },
  chartBar: {
    width: 4,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  profileIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  profileHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  profileBody: {
    width: 17,
    height: 9,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
});
