import React, { useEffect } from 'react';
import { Alert, Linking, Modal, StyleSheet, Text, View } from 'react-native';
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
import { createTripCheckout } from '../services/PaymentService';

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

  const startPayment = async () => {
    try {
      const checkoutUrl = await createTripCheckout({
        driverId: userDocumentId,
        tripId: completedTrip.firestoreId,
      });
      await Linking.openURL(checkoutUrl);
    } catch (error) {
      console.error('Error al iniciar el pago con Mercado Pago:', error);
      Alert.alert('No se pudo iniciar el pago', error.message);
    }
  };

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
