import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';

import { useRegister } from '../../services/UserService';

const regionMed = {
  latitude: 6.2442,
  longitude: -75.5812,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function HomeScreen() {
  const { accountStatus, dataRegister, requestMessage, setDriverAvailability, updateDriverLocation } = useRegister();

  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const locationWriteInProgress = useRef(false);
  const isAvailable = accountStatus.trim().toLowerCase() === 'disponible';

  useEffect(() => {
    if (!isAvailable) {
      setLoadingLocation(false);
      return undefined;
    }

    let isActive = true;
    let locationSubscription;

    const handleLocation = (position) => {
      const currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
      };
      setLocation(currentLocation);
      setLocationError('');

      if (locationWriteInProgress.current) return;
      locationWriteInProgress.current = true;
      updateDriverLocation(currentLocation)
        .catch((error) => {
          console.error('Error al actualizar la ubicación del conductor:', error);
          setLocationError('No se pudo guardar tu ubicación.');
        })
        .finally(() => {
          locationWriteInProgress.current = false;
        });
    };

    const startLocationTracking = async () => {
      setLoadingLocation(true);
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!isActive) return;

        if (permission.status !== 'granted') {
          try {
            await setDriverAvailability('No Disponible');
          } catch (error) {
            console.error('Error al desactivar la disponibilidad:', error);
            Alert.alert('Error', 'No se pudo actualizar tu estado en Firebase.');
            return;
          }
          Alert.alert(
            'Permiso de ubicación',
            'Necesitas permitir el acceso a tu ubicación para estar disponible.'
          );
          return;
        }

        const currentPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!isActive) return;
        handleLocation(currentPosition);

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 3000,
            distanceInterval: 10,
          },
          handleLocation
        );

        if (!isActive) locationSubscription.remove();
      } catch (error) {
        console.error('Error al iniciar el seguimiento de ubicación:', error);
        if (isActive) {
          try {
            await setDriverAvailability('No Disponible');
          } catch (statusError) {
            console.error('Error al desactivar la disponibilidad:', statusError);
          }
          Alert.alert(
            'Error de ubicación',
            'No se pudo obtener tu ubicación. Intenta nuevamente.'
          );
        }
      } finally {
        if (isActive) setLoadingLocation(false);
      }
    };

    startLocationTracking();

    return () => {
      isActive = false;
      locationSubscription?.remove();
    };
  }, [isAvailable, setDriverAvailability, updateDriverLocation]);

  const handleAvailabilityChange = async (available) => {
    setUpdatingAvailability(true);
    try {
      await setDriverAvailability(available ? 'Disponible' : 'No Disponible');
    } catch (error) {
      console.error('Error al cambiar la disponibilidad:', error);
      Alert.alert(
        'Error',
        'No se pudo actualizar tu estado. Revisa tu conexión e intenta nuevamente.'
      );
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const region = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }
    : regionMed;

  const firstName = dataRegister.name?.trim().split(/\s+/)[0];

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={regionMed}
        region={region}
        showsUserLocation={Boolean(location)}
        showsMyLocationButton
      />

      <View style={styles.topCard}>
        <Text style={styles.greeting}>
          Hola{firstName ? `, ${firstName}` : ''}
        </Text>
        <Text style={styles.subtitle}>Conduce seguro y disfruta tu viaje</Text>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusInfo}>
          <View
            style={[
              styles.statusIndicator,
              isAvailable ? styles.availableIndicator : styles.unavailableIndicator,
            ]}
          />
          <View>
            <Text style={styles.statusLabel}>Estado del conductor</Text>
            <Text
              style={[
                styles.statusValue,
                isAvailable ? styles.availableText : styles.unavailableText,
              ]}
            >
              {accountStatus.toUpperCase()}
            </Text>
          </View>
        </View>
        <Switch
          value={isAvailable}
          onValueChange={handleAvailabilityChange}
          disabled={updatingAvailability}
          trackColor={{ false: '#d1d1d6', true: '#91d6a2' }}
          thumbColor={isAvailable ? '#28a745' : '#f4f3f4'}
        />
      </View>

      {requestMessage ? (
        <View style={styles.requestMessage}>
          <Text style={styles.requestMessageText}>{requestMessage}</Text>
        </View>
      ) : null}

      <View style={styles.locationCard}>
        {loadingLocation ? (
          <ActivityIndicator color="#570376" />
        ) : (
          <View
            style={[
              styles.statusIndicator,
              location ? styles.availableIndicator : styles.unavailableIndicator,
            ]}
          />
        )}
        <Text style={styles.locationText}>
          {locationError
            ? locationError
            : loadingLocation
              ? 'Buscando tu ubicación...'
              : location
                ? 'Ubicación actualizada en tiempo real'
                : 'Activa tu ubicación para recibir viajes'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  topCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  greeting: {
    color: '#570376',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    fontSize: 13,
    marginTop: 4,
  },
  statusCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  availableIndicator: {
    backgroundColor: '#28a745',
  },
  unavailableIndicator: {
    backgroundColor: '#c82333',
  },
  statusLabel: {
    color: '#666',
    fontSize: 12,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 3,
  },
  availableText: {
    color: '#1e7e34',
  },
  unavailableText: {
    color: '#c82333',
  },
  locationCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 13,
    elevation: 3,
  },
  requestMessage: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 143,
    backgroundColor: '#f4eff7',
    borderRadius: 10,
    padding: 11,
  },
  requestMessageText: {
    color: '#570376',
    fontSize: 11,
    textAlign: 'center',
  },
  locationText: {
    color: '#555',
    fontSize: 12,
    flex: 1,
  },
});