import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { getDrivingRoute } from '../../services/MapsService';
import { getPointAlongRoute } from '../../utils/getPointAlongRoute';

const formatMoney = (value) => `$${Math.round(value || 0).toLocaleString('es-CO')} COP`;

export default function ActiveTripScreen({
  trip,
  driverLocation,
  onPassengerTrip,
  onFinish,
  onRouteLoaded,
}) {
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [routeLoading, setRouteLoading] = useState(false);
  const [simulatedLocation, setSimulatedLocation] = useState(null);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const latestDriverLocation = useRef(driverLocation);
  latestDriverLocation.current = driverLocation;
  const isOnTrip = trip.stage === 'destination';
  const routeCoordinates = route?.coordinates || [];
  const markerLocation = isOnTrip
    ? simulatedLocation || routeCoordinates[0] || trip.pickup
    : driverLocation || trip.pickup;
  const mapCoordinates = routeCoordinates.length > 1
    ? routeCoordinates
    : isOnTrip
      ? [trip.pickup, trip.dropoff]
      : [markerLocation, trip.pickup];
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

  useEffect(() => {
    let active = true;
    const origin = isOnTrip
      ? trip.pickup
      : latestDriverLocation.current || trip.pickup;
    const destination = isOnTrip ? trip.dropoff : trip.pickup;

    setRoute(null);
    setRouteError('');
    setRouteLoading(true);
    setSimulatedLocation(null);
    setSimulationProgress(0);

    getDrivingRoute(origin, destination)
      .then((result) => {
        if (!active) return;
        setRoute(result);
        if (isOnTrip) {
          onRouteLoaded?.({
            routeCoordinates: result.coordinates,
            routeDistanceKm: result.distanceKm,
            routeDurationMin: result.durationMin,
          });
        }
      })
      .catch((error) => {
        console.error('Error al obtener la ruta de Google Maps:', error);
        if (active) setRouteError(error.message);
      })
      .finally(() => {
        if (active) setRouteLoading(false);
      });

    return () => {
      active = false;
    };
  }, [trip.id, trip.stage]);

  useEffect(() => {
    if (!isOnTrip || routeCoordinates.length < 2) {
      setSimulatedLocation(null);
      setSimulationProgress(0);
      return undefined;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min((Date.now() - startedAt) / 10000, 1);
      setSimulationProgress(progress);
      setSimulatedLocation(getPointAlongRoute(routeCoordinates, progress));
      if (progress === 1) clearInterval(timer);
    }, 100);

    return () => clearInterval(timer);
  }, [isOnTrip, routeCoordinates]);

  useEffect(() => {
    if (!mapReady || routeCoordinates.length < 2) return;
    mapRef.current?.fitToCoordinates(routeCoordinates, {
      edgePadding: { top: 150, right: 60, bottom: 220, left: 60 },
      animated: true,
    });
  }, [mapReady, routeCoordinates]);

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
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onMapReady={() => setMapReady(true)}
      >
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#570376"
            strokeWidth={5}
          />
        )}
        <Marker
          coordinate={markerLocation}
          title="Tu ubicación"
          tracksViewChanges
        >
          <View style={styles.vehicleMarker}>
            <Text style={styles.vehicleMarkerIcon}>🚗</Text>
          </View>
        </Marker>
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

      <View style={styles.topCard} pointerEvents="box-none">
        <Text style={styles.startTrip}>Viaje en curso</Text>
        <Text style={styles.title}>
          {isOnTrip ? 'Destino del pasajero' : 'Dirígete al punto de recogida'}
        </Text>
        <Text style={styles.address}>{isOnTrip ? trip.destination : trip.origin}</Text>
        <Text style={[styles.route, routeError && styles.routeError]}>
          {routeError
            ? routeError
            : routeLoading
              ? 'Calculando ruta con Google Maps...'
              : route
                ? `${route.distanceKm.toFixed(1)} km • ${route.durationMin} min por carretera`
                : isOnTrip
                  ? 'Lleva al pasajero a su destino.'
                  : 'Dirígete al punto de recogida.'}
        </Text>
        {isOnTrip && routeCoordinates.length > 1 && (
          <Text style={styles.simulation}>
            Dirigiéndose al punto de destino · {Math.round(simulationProgress * 100)}%
          </Text>
        )}
      </View>

      <View style={styles.bottomCard} pointerEvents="box-none">
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
    zIndex: 2,
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
  routeError: {
    color: '#c82333',
  },
  simulation: {
    color: '#570376',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  bottomCard: {
    position: 'absolute',
    zIndex: 2,
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
