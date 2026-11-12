import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
    createMockRequest: createRequest,
    acceptMockRequest: acceptRequest,
    rejectMockRequest: rejectRequest,
    markPassengerOnboard: PassengerTrip,
    finishMockTrip: finishTrip,
    resolveMockPayment: solvePayment,
    dismissCompletedTrip,
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
            tabBarActiveTintColor: '#570376',
            tabBarInactiveTintColor: '#888',
            tabBarLabelStyle: { fontWeight: 'bold', fontSize: 12 },
          }}
        >
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
          <View style={styles.overlay}>
            <ActiveTripScreen
              trip={activeTrip}
              driverLocation={driverLocation}
              onPassengerTrip={PassengerTrip}
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
