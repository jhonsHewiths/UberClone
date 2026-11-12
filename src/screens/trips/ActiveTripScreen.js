import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

const formatMoney = (value) => `$${Math.round(value || 0).toLocaleString('es-CO')} COP`;

export default function ActiveTripScreen({ trip, driverLocation, onPassengerTrip, onFinish}) {
  const [loading, setLoading] = useState(false);
  const isOnTrip = trip.stage === 'destination';
  const routeCoordinates = isOnTrip
    ? trip.destinationRoute || [trip.pickup, trip.dropoff]
    : trip.pickupRoute || [driverLocation || trip.pickup, trip.pickup];
  const [routeProgress, setRouteProgress] = useState(0);

  useEffect(() => {
    setRouteProgress(0);
    const interval = setInterval(() => {
      setRouteProgress((progress) => Math.min(progress + 0.05, routeCoordinates.length - 1));
    }, 500);

    return () => clearInterval(interval);
  }, [routeCoordinates.length, trip.id, trip.stage]);

  const count = Math.min(Math.floor(routeProgress), routeCoordinates.length - 2);
  const progress = routeProgress - count;
  const routePosition = {
    latitude: routeCoordinates[count].latitude
      + (routeCoordinates[count + 1].latitude - routeCoordinates[count].latitude) * progress,
    longitude: routeCoordinates[count].longitude
      + (routeCoordinates[count + 1].longitude - routeCoordinates[count].longitude) * progress,
  };
  const minLatitude = Math.min(...routeCoordinates.map((point) => point.latitude));
  const maxLatitude = Math.max(...routeCoordinates.map((point) => point.latitude));
  const minLongitude = Math.min(...routeCoordinates.map((point) => point.longitude));
  const maxLongitude = Math.max(...routeCoordinates.map((point) => point.longitude));
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
      <MapView style={StyleSheet.absoluteFill} initialRegion={region} region={region}>
        <Polyline coordinates={routeCoordinates} strokeColor="#570376" strokeWidth={5} />
        <Marker coordinate={routePosition} title="Vehículo" pinColor="#570376" />
        <Marker coordinate={trip.pickup} title="Punto de recogida" pinColor="#28a745" />
        <Marker coordinate={trip.dropoff} title="Destino" pinColor="#570376" />
      </MapView>

      <View style={styles.topCard}>
        <Text style={styles.startTrip}>Viaje en curso</Text>
        <Text style={styles.title}>{isOnTrip ? 'Destino del pasajero' : 'Dirígete al pasajero'}</Text>
        <Text style={styles.address}>{isOnTrip ? trip.destination : trip.origin}</Text>
        <Text style={styles.route}>
          El vehículo se dirige al destino.
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
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
