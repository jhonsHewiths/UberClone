import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import EarningsScreen from '../screens/earnings/EarningsScreen';
import HomeScreen from '../screens/home/Home';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ActiveTripScreen from '../screens/trips/ActiveTripScreen';
import TripRequestScreen from '../screens/trips/TripRequestScreen';
import TripSummaryScreen from '../screens/trips/TripSummaryScreen';
import { useRegister } from '../services/UserService';

const Tab = createBottomTabNavigator();

export default function DriverApp() {
  const { accountStatus, pendingRequest, activeTrip, completedTrip, driverLocation, requestMessage,
    createRequest, acceptRequest, rejectRequest, PassengerTrip, finishTrip, solvePayment, dismissCompletedTrip,
  } = useRegister();
  const isAvailable = accountStatus.trim().toLowerCase() === 'disponible';

  useEffect(() => {
    if (!isAvailable || pendingRequest || activeTrip || completedTrip) return undefined;

    const timer = setTimeout(createRequest, 5000);
    return () => clearTimeout(timer);
  }, [activeTrip, completedTrip, createRequest,isAvailable,pendingRequest]);

  return (
    <NavigationContainer>
      <View style={styles.container}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveColor: '#570376',
            tabBarInactiveColor: '#888',
            tabBarLabelStyle: { fontWeight: 'bold', fontSize: 12 },
          }}
        >
          <Tab.Screen name="Inicio" component={HomeScreen} />
          <Tab.Screen name="Ganancias" component={EarningsScreen} />
          <Tab.Screen name="Perfil" component={ProfileScreen} />
        </Tab.Navigator>

        {pendingRequest && (
          <TripRequestScreen
            request={pendingRequest}
            onAccept={acceptRequest}
            onReject={rejectRequest}
          />
        )}

        {activeTrip && (
          <View style={styles.overlay}>
            <ActiveTripScreen
              trip={activeTrip}
              driverLocation={driverLocation}
              onPassengerOnboard={PassengerTrip}
              onFinish={finishTrip}
            />
          </View>
        )}

        {completedTrip && (
          <TripSummaryScreen
            trip={completedTrip}
            onSolvePayment={solvePayment}
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
  },
});
