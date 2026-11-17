import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, Polyline } from 'react-native-maps';
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../../config/Firebase';
import { getDrivingRoute } from '../../services/MapsService';
import { useRegister } from '../../services/UserService';

const PAGE_SIZE = 20;

const startOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getDateRange = (period, rangeStart, rangeEnd) => {
  const now = new Date();
  if (period === 'Hoy') {
    const start = startOfDay(now);
    return { start, end: new Date(start.getTime() + 86400000) };
  }
  if (period === 'Semana') {
    const start = startOfDay(now);
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    return { start, end: new Date(start.getTime() + 7 * 86400000) };
  }
  if (period === 'Mes') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }

  const first = startOfDay(rangeStart <= rangeEnd ? rangeStart : rangeEnd);
  const last = startOfDay(rangeStart <= rangeEnd ? rangeEnd : rangeStart);
  return { start: first, end: new Date(last.getTime() + 86400000) };
};

const getTripFromSnapshot = (snapshot) => {
  const trip = snapshot.data();
  const completedAt = trip.completedAt?.toDate
    ? trip.completedAt.toDate().getTime()
    : Number(trip.completedAt) || 0;
  return {
    ...trip,
    id: snapshot.id,
    firestoreId: snapshot.id,
    completedAt,
  };
};

const formatMoney = (value) => `$${Math.round(value || 0).toLocaleString('es-CO')} COP`;

const isCashPayment = (method) => method === 'cash' || method === 'Efectivo';

const isMercadoPagoPayment = (method) => (
  method === 'mercadopago' || method === 'Mercado Pago' || method === 'Tarjeta'
);

const formatPlace = (place) => (
  typeof place === 'string'
    ? place
    : place?.address || 'Ubicación no disponible'
);

export default function TripHistoryScreen() {
  const { userDocumentId } = useRegister();
  const [period, setPeriod] = useState('Hoy');
  const [rangeStart, setRangeStart] = useState(new Date());
  const [rangeEnd, setRangeEnd] = useState(new Date());
  const [datePicker, setDatePicker] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [trips, setTrips] = useState([]);
  const [lastDocument, setLastDocument] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const dateRange = useMemo(
    () => getDateRange(period, rangeStart, rangeEnd),
    [period, rangeStart, rangeEnd]
  );
  const dateConstraints = useMemo(() => [
    where('completedAt', '>=', Timestamp.fromDate(dateRange.start)),
    where('completedAt', '<', Timestamp.fromDate(dateRange.end)),
  ], [dateRange]);

  useEffect(() => {
    if (!userDocumentId) {
      setTrips([]);
      setLastDocument(null);
      setHasMore(false);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setErrorMessage('');
    setTrips([]);
    setLastDocument(null);
    setHasMore(false);

    const tripsQuery = query(
      collection(db, 'users', userDocumentId, 'trips'),
      ...dateConstraints,
      orderBy('completedAt', 'desc'),
      limit(PAGE_SIZE)
    );
    let initialSnapshotReceived = false;

    const unsubscribe = onSnapshot(
      tripsQuery,
      (snapshot) => {
        if (!active) return;
        const page = snapshot.docs.map(getTripFromSnapshot);
        const pageIds = new Set(page.map((trip) => trip.firestoreId));
        setTrips((currentTrips) => (
          [...page, ...currentTrips.filter((trip) => !pageIds.has(trip.firestoreId))]
            .sort((first, second) => second.completedAt - first.completedAt)
        ));
        if (!initialSnapshotReceived) {
          setLastDocument(snapshot.docs[snapshot.docs.length - 1] || null);
          setHasMore(snapshot.docs.length === PAGE_SIZE);
          initialSnapshotReceived = true;
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error al consultar el historial de viajes:', error);
        if (!active) return;
        setErrorMessage('No se pudo cargar el historial. Revisa tu conexión y los índices de Firestore.');
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [dateConstraints, userDocumentId]);

  const loadMore = useCallback(async () => {
    if (!userDocumentId || !lastDocument || !hasMore || loadingMore) return;

    setLoadingMore(true);
    setErrorMessage('');
    try {
      const nextPageQuery = query(
        collection(db, 'users', userDocumentId, 'trips'),
        ...dateConstraints,
        orderBy('completedAt', 'desc'),
        startAfter(lastDocument),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(nextPageQuery);
      const page = snapshot.docs.map(getTripFromSnapshot);
      setTrips((currentTrips) => (
        [...currentTrips, ...page.filter((trip) => !currentTrips.some(
          (existingTrip) => existingTrip.firestoreId === trip.firestoreId
        ))].sort((first, second) => second.completedAt - first.completedAt)
      ));
      setLastDocument(snapshot.docs[snapshot.docs.length - 1] || lastDocument);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error al cargar más viajes:', error);
      setErrorMessage('No se pudieron cargar más viajes.');
    } finally {
      setLoadingMore(false);
    }
  }, [dateConstraints, hasMore, lastDocument, loadingMore, userDocumentId]);

  const visibleTrips = useMemo(() => (
    paymentMethod === 'all'
      ? trips
      : trips.filter((trip) => (
        paymentMethod === 'cash'
          ? isCashPayment(trip.paymentMethod)
          : isMercadoPagoPayment(trip.paymentMethod)
      ))
  ), [paymentMethod, trips]);

  const header = (
    <View>
      <Text style={styles.title}>Historial de carreras</Text>
      <Text style={styles.subtitle}>Viajes completados, del más reciente al más antiguo</Text>

      <View style={styles.filterRow}>
        {['Hoy', 'Semana', 'Mes', 'Rango'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.filterButton, period === option && styles.filterButtonActive]}
            onPress={() => setPeriod(option)}
          >
            <Text style={[styles.filterText, period === option && styles.filterTextActive]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {period === 'Rango' && (
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.dateButton} onPress={() => setDatePicker('start')}>
            <Text style={styles.dateButtonText}>Desde: {rangeStart.toLocaleDateString('es-CO')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateButton} onPress={() => setDatePicker('end')}>
            <Text style={styles.dateButtonText}>Hasta: {rangeEnd.toLocaleDateString('es-CO')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {datePicker && (
        <DateTimePicker
          value={datePicker === 'start' ? rangeStart : rangeEnd}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            setDatePicker(null);
            if (event.type !== 'set' || !selectedDate) return;
            if (datePicker === 'start') setRangeStart(selectedDate);
            else setRangeEnd(selectedDate);
          }}
        />
      )}

      <Text style={styles.filterLabel}>Método de pago</Text>
      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'Todos' },
          { key: 'mercadopago', label: 'Mercado Pago' },
          { key: 'cash', label: 'Efectivo' },
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[styles.filterButton, paymentMethod === option.key && styles.filterButtonActive]}
            onPress={() => setPaymentMethod(option.key)}
          >
            <Text style={[styles.filterText, paymentMethod === option.key && styles.filterTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleTrips}
        keyExtractor={(trip) => trip.firestoreId}
        ListHeaderComponent={header}
        ListEmptyComponent={(
          <View style={styles.emptyCard}>
            {loading ? (
              <ActivityIndicator color="#570376" />
            ) : (
              <>
                <Text style={styles.emptyTitle}>No hay viajes para estos filtros</Text>
                <Text style={styles.emptyText}>Prueba otro periodo o método de pago.</Text>
              </>
            )}
          </View>
        )}
        ListFooterComponent={loadingMore ? (
          <ActivityIndicator style={styles.loadingMore} color="#570376" />
        ) : hasMore ? (
          <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
            <Text style={styles.loadMoreText}>Cargar 20 viajes más</Text>
          </TouchableOpacity>
        ) : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.tripCard} onPress={() => setSelectedTrip(item)}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripDate}>
                {new Date(item.completedAt).toLocaleString('es-CO', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={styles.tripStatus}>{item.paymentStatus}</Text>
            </View>
            <Text style={styles.tripRoute}>
              {formatPlace(item.origin)} → {formatPlace(item.destination)}
            </Text>
            <Text style={styles.tripMeta}>
              {item.category} • {isCashPayment(item.paymentMethod) ? 'Efectivo' : 'Mercado Pago'}
            </Text>
            <View style={styles.tripAmounts}>
              <Text style={styles.tripFare}>Tarifa {formatMoney(item.fare)}</Text>
              <Text style={styles.tripNet}>{formatMoney(item.driverEarnings)} netos</Text>
            </View>
            <Text style={styles.detailsHint}>Toca para ver el detalle y la ruta</Text>
          </TouchableOpacity>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
      <TripDetailsModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
    </View>
  );
}

function TripDetailsModal({ trip, onClose }) {
  const [route, setRoute] = useState([]);
  const [routeError, setRouteError] = useState('');
  const [routeLoading, setRouteLoading] = useState(false);
  const mapRef = React.useRef(null);
  const pickup = trip?.pickup;
  const dropoff = trip?.dropoff;
  const savedRoute = trip?.routeCoordinates;

  useEffect(() => {
    if (!trip) {
      setRoute([]);
      setRouteError('');
      return undefined;
    }
    if (savedRoute?.length > 1) {
      setRoute(savedRoute);
      return undefined;
    }
    if (!pickup || !dropoff) {
      setRouteError('Este viaje no tiene coordenadas para dibujar la ruta.');
      return undefined;
    }

    let active = true;
    setRouteLoading(true);
    setRouteError('');
    getDrivingRoute(pickup, dropoff)
      .then((result) => {
        if (active) setRoute(result.coordinates);
      })
      .catch((error) => {
        console.error('Error al cargar la ruta del viaje:', error);
        if (active) setRouteError(error.message);
      })
      .finally(() => {
        if (active) setRouteLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dropoff, pickup, savedRoute, trip]);

  useEffect(() => {
    if (route.length < 2) return;
    mapRef.current?.fitToCoordinates(route, {
      edgePadding: { top: 50, right: 45, bottom: 45, left: 45 },
      animated: true,
    });
  }, [route]);

  const initialRegion = pickup && dropoff ? {
    latitude: (pickup.latitude + dropoff.latitude) / 2,
    longitude: (pickup.longitude + dropoff.longitude) / 2,
    latitudeDelta: Math.max(Math.abs(pickup.latitude - dropoff.latitude) * 1.5, 0.02),
    longitudeDelta: Math.max(Math.abs(pickup.longitude - dropoff.longitude) * 1.5, 0.02),
  } : {
    latitude: 6.2442,
    longitude: -75.5812,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <Modal visible={Boolean(trip)} animationType="slide" onRequestClose={onClose}>
      {trip && (
        <View style={styles.detailContainer}>
          <MapView
            ref={mapRef}
            style={styles.detailMap}
            initialRegion={initialRegion}
          >
            {route.length > 1 && (
              <Polyline coordinates={route} strokeColor="#570376" strokeWidth={5} />
            )}
            {pickup && <Marker coordinate={pickup} title="Origen" />}
            {dropoff && <Marker coordinate={dropoff} title="Destino" />}
          </MapView>

          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Detalle del viaje</Text>
            <Text style={styles.tripRoute}>
              {formatPlace(trip.origin)} → {formatPlace(trip.destination)}
            </Text>
            {routeLoading && <ActivityIndicator color="#570376" />}
            {routeError ? <Text style={styles.errorText}>{routeError}</Text> : null}
            <View style={styles.detailGrid}>
              <Detail label="Categoría" value={trip.category || '—'} />
              <Detail
                label="Método de pago"
                value={isCashPayment(trip.paymentMethod) ? 'Efectivo' : 'Mercado Pago'}
              />
              <Detail
                label="Distancia"
                value={`${trip.routeDistanceKm || trip.distanceKm || 0} km`}
              />
              <Detail
                label="Duración"
                value={`${trip.routeDurationMin || trip.durationMin || 0} min`}
              />
              <Detail label="Tarifa" value={formatMoney(trip.fare)} />
              <Detail label="Comisión" value={formatMoney(trip.commission)} />
              <Detail label="Propina" value={formatMoney(trip.tip)} />
              <Detail label="Ganancia neta" value={formatMoney(trip.driverEarnings)} />
              <Detail label="Estado del pago" value={trip.paymentStatus || 'Pendiente'} />
              <Detail label="Calificación" value={trip.rating ? `${trip.rating}/5` : 'Sin calificación'} />
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Cerrar detalle</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Modal>
  );
}

function Detail({ label, value }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f2f6',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  title: {
    color: '#222',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#777',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    borderColor: '#570376',
    backgroundColor: '#570376',
  },
  filterText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  filterLabel: {
    color: '#444',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    color: '#444',
    fontSize: 12,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 13,
    padding: 14,
    marginTop: 11,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripDate: {
    color: '#777',
    fontSize: 11,
  },
  tripStatus: {
    color: '#570376',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tripRoute: {
    color: '#222',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 9,
  },
  tripMeta: {
    color: '#777',
    fontSize: 11,
    marginTop: 5,
  },
  tripAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  tripFare: {
    color: '#555',
    fontSize: 12,
  },
  tripNet: {
    color: '#1e7e34',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsHint: {
    color: '#570376',
    fontSize: 10,
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 13,
    padding: 20,
    alignItems: 'center',
    marginTop: 14,
  },
  emptyTitle: {
    color: '#333',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#777',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 7,
  },
  loadingMore: {
    marginVertical: 18,
  },
  loadMoreButton: {
    alignItems: 'center',
    padding: 14,
  },
  loadMoreText: {
    color: '#570376',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#c82333',
    fontSize: 12,
    marginVertical: 8,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#f4f2f6',
  },
  detailMap: {
    height: '48%',
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    marginTop: -15,
  },
  detailTitle: {
    color: '#222',
    fontSize: 20,
    fontWeight: 'bold',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  detailItem: {
    width: '48%',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
  detailLabel: {
    color: '#777',
    fontSize: 10,
  },
  detailValue: {
    color: '#222',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#570376',
    borderRadius: 10,
    padding: 13,
    marginTop: 'auto',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
