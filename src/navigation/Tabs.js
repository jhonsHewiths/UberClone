
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import PersonalDataScreen from '../screens/auth/PersonalDataScreen';
import VehicleDataScreen from '../screens/auth/VehicleDataScreen';
import DocumentsScreen from '../screens/auth/DocumentsScreen';
import { useRegister } from '../services/UserService';

const Tab = createMaterialTopTabNavigator();

export default function RegisterTabs() {
  const { dataPValidate } = useRegister();

  return (
    <Tab.Navigator
      screenOptions={{
        swipeEnabled: dataPValidate,
        tabBarActiveTintColor: '#570376',
        tabBarInactiveTintColor: '#888888',
        tabBarLabelStyle: {fontSize: 14, fontWeight: 'bold'},
        tabBarIndicatorStyle: {backgroundColor: '#570376', height: 4},
        swipeEnabled: dataPValidate,
      }}
    >
      <Tab.Screen
        name="Personal"
        component={PersonalDataScreen}
        options={{ title: 'Datos Personales' }}
      />

      <Tab.Screen
        name="Vehicle"
        component={VehicleDataScreen}
        options={{ title: 'Vehiculo' }}
        listeners={{
          tabPress: (e) => {
            if (!dataPValidate) e.preventDefault();
          },
        }}
      />

      <Tab.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{ title: 'Documentos' }}
        listeners={{
          tabPress: (e) => {
            if (!dataPValidate) {
              e.preventDefault();
            }
          },
        }}
      />
    </Tab.Navigator>
  );
}
