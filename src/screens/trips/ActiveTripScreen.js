import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const formatMoney = (value) => `$${Math.round(value || 0).toLocaleString('es-CO')} COP`;

export default function ActiveTripScreen({ trip, driverLocation, onPassengerTrip, onFinish}) {
  const [loading, setLoading] = useState(false);
  const isOnTrip = trip.stage === 'destination';
  const mapCoordinates = isOnTrip
    ? [trip.pickup, trip.dropoff]
    : [driverLocation || trip.pickup, trip.pickup];
  const minLatitude = Math.min(...mapCoordinates.map((point) => point.latitude));
  const maxLatitude = Math.max(...mapCoordinates.map((point) => point.latitude));
  const minLongitude = Math.min(...mapCoordinates.map((point) => point.longitude));
  const maxLongitude = Math.max(...mapCoordinates.map((point) => point.longitude));
  const region = {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.4, 0.025),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.4, 0.025),
  };

  const finishTrip = async () => {
    setLoading(true);
    try {
      await onFinish();
    } catch (error) {
      console.error('Error al finalizar el viaje:', error);
      Alert.alert('Error', 'No se pudo guardar el viaje. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        key={`${trip.id}-${trip.stage}`}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
      >
        {driverLocation && (
          <Marker coordinate={driverLocation} title="Tu ubicación">
            <View style={styles.vehicleMarker}>
              <Text style={styles.vehicleMarkerIcon}>🚗</Text>
            </View>
          </Marker>
        )}
        <Marker coordinate={trip.pickup} title="Punto de recogida">
          <View style={styles.pickupMarker}>
            <Text style={styles.markerLabel}>P</Text>
          </View>
        </Marker>
        <Marker coordinate={trip.dropoff} title="Destino">
          <View style={styles.destinationMarker}>
            <Text style={styles.markerLabel}>D</Text>
          </View>
        </Marker>
      </MapView>

      <View style={styles.topCard}>
        <Text style={styles.startTrip}>Viaje en curso</Text>
        <Text style={styles.title}>
          {isOnTrip ? 'Destino del pasajero' : 'Dirígete al punto de recogida'}
        </Text>
        <Text style={styles.address}>{isOnTrip ? trip.destination : trip.origin}</Text>
        <Text style={styles.route}>
          {isOnTrip ? 'Lleva al pasajero a su destino.' : 'Dirígete al punto de recogida.'}
        </Text>
      </View>

      <View style={styles.bottomCard}>
        <View style={styles.tripInfo}>
          <View>
            <Text style={styles.label}>Categoría</Text>
            <Text style={styles.value}>{trip.category}</Text>
          </View>
          <View style={styles.rightInfo}>
            <Text style={styles.label}>Tarifa estimada</Text>
            <Text style={styles.value}>{formatMoney(trip.fare)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={isOnTrip ? finishTrip : onPassengerTrip}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isOnTrip ? 'Finalizar viaje' : 'Pasajero a bordo'}
            </Text>
          )}
        </TouchableOpacity>
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
  },
  startTrip: {
    color: '#570376',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  title: {
    color: '#222',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  address: {
    color: '#444',
    fontSize: 14,
    marginTop: 4,
  },
  route: {
    color: '#888',
    fontSize: 10,
    marginTop: 8,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    elevation: 4,
  },
  tripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  rightInfo: {
    alignItems: 'flex-end',
  },
  label: {
    color: '#888',
    fontSize: 11,
  },
  value: {
    color: '#222',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 3,
  },
  button: {
    backgroundColor: '#570376',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  vehicleMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#570376',
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  vehicleMarkerIcon: {
    fontSize: 20,
  },
  pickupMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#28a745',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e65f36',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
