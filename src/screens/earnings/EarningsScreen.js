import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRegister } from '../../services/UserService';

const formatMoney = (value) => `$${Math.round(value || 0).toLocaleString('es-CO')} COP`;

const dataDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result.getTime();
};

const dataWeek = (date) => {
  const result = new Date(dataDay(date));
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result.getTime();
};

const dataMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getTime();

export default function EarningsScreen() {
  const { tripHistory } = useRegister();
  const [period, setPeriod] = useState('Hoy');

  const { filteredTrips, totals, balance } = useMemo(() => {
    const now = new Date();
    const periodStart = period === 'Hoy'
      ? dataDay(now)
      : period === 'Semana'
        ? dataWeek(now)
        : dataMonth(now);
    const filtered = tripHistory.filter((trip) => trip.completedAt >= periodStart);
    const summary = filtered.reduce((result, trip) => ({
      fare: result.fare + (trip.fare || 0),
      commission: result.commission + (trip.commission || 0),
      tips: result.tips + (trip.tip || 0),
      driverEarnings: result.driverEarnings + (trip.driverEarnings || 0),
    }), { fare: 0, commission: 0, tips: 0, driverEarnings: 0 });

    const currentBalance = tripHistory.reduce((total, trip) => {
      if (trip.paymentStatus === 'Aprobado') return total + (trip.driverEarnings || 0);
      if (trip.paymentStatus === 'Efectivo') return total - (trip.commission || 0);
      return total;
    }, 0);

    return {
      filteredTrips: filtered,
      totals: summary,
      balance: currentBalance,
    };
  }, [period, tripHistory]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Ganancias</Text>
      <Text style={styles.subtitle}>Resumen de tus viajes</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo del conductor</Text>
        <Text style={styles.balanceValue}>{formatMoney(balance)}</Text>
        <Text style={styles.balanceHint}>
          Pagos aprobados menos comisiones de viajes en efectivo
        </Text>
      </View>

      <View style={styles.periodSelector}>
        {['Hoy', 'Semana', 'Mes'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.periodButton, period === option && styles.periodButtonActive]}
            onPress={() => setPeriod(option)}
          >
            <Text style={[styles.periodText, period === option && styles.periodTextActive]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.summaryCard}>
        <Metric label="Viajes" value={String(filteredTrips.length)} />
        <Metric label="Total facturado" value={formatMoney(totals.fare)} />
        <Metric label="Comisiones" value={formatMoney(totals.commission)} />
        <Metric label="Propinas" value={formatMoney(totals.tips)} />
        <Metric label="Ganancia neta" value={formatMoney(totals.driverEarnings)} highlight />
        <Metric
          label="Promedio por viaje"
          value={formatMoney(filteredTrips.length ? totals.driverEarnings / filteredTrips.length : 0)}
        />
      </View>

      <Text style={styles.sectionTitle}>Viajes recientes</Text>
      {filteredTrips.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Aún no tienes viajes</Text>
          <Text style={styles.emptyText}>
            Los viajes completados aparecerán aquí con su tarifa y estado de pago.
          </Text>
        </View>
      ) : (
        filteredTrips.map((trip) => (
          <View key={trip.firestoreId || trip.id} style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripDate}>
                {new Date(trip.completedAt).toLocaleString('es-CO', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={[
                styles.tripStatus,
                trip.paymentStatus === 'Aprobado' || trip.paymentStatus === 'Efectivo'
                  ? styles.paidStatus
                  : styles.pendingStatus,
              ]}>
                {trip.paymentStatus}
              </Text>
            </View>
            <Text style={styles.tripRoute}>{trip.origin} → {trip.destination}</Text>
            <View style={styles.tripAmounts}>
              <Text style={styles.tripAmountLabel}>Tarifa {formatMoney(trip.fare)}</Text>
              <Text style={styles.tripNet}>{formatMoney(trip.driverEarnings)} netos</Text>
            </View>
            <Text style={styles.simulatedLabel}>Viaje pedido por usuario</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Metric({ label, value, highlight = false }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, highlight && styles.metricHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f4f6',
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  title: {
    color: '#570376',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#777',
    fontSize: 13,
    marginTop: 4,
  },
  balanceCard: {
    backgroundColor: '#570376',
    borderRadius: 16,
    padding: 19,
    marginTop: 18,
  },
  balanceLabel: {
    color: '#eadcf0',
    fontSize: 13,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 25,
    fontWeight: 'bold',
    marginTop: 5,
  },
  balanceHint: {
    color: '#eadcf0',
    fontSize: 10,
    marginTop: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#e9e6eb',
    borderRadius: 10,
    padding: 4,
    marginTop: 17,
  },
  periodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#fff',
    elevation: 1,
  },
  periodText: {
    color: '#777',
    fontSize: 13,
    fontWeight: '600',
  },
  periodTextActive: {
    color: '#570376',
  },
  summaryCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginTop: 13,
  },
  metric: {
    width: '50%',
    paddingVertical: 10,
  },
  metricLabel: {
    color: '#888',
    fontSize: 11,
  },
  metricValue: {
    color: '#222',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  metricHighlight: {
    color: '#1e7e34',
  },
  sectionTitle: {
    color: '#222',
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 22,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 13,
    padding: 14,
    marginBottom: 10,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripDate: {
    color: '#888',
    fontSize: 11,
  },
  tripStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  paidStatus: {
    color: '#1e7e34',
  },
  pendingStatus: {
    color: '#a66b00',
  },
  tripRoute: {
    color: '#333',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  tripAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  tripAmountLabel: {
    color: '#666',
    fontSize: 11,
  },
  tripNet: {
    color: '#1e7e34',
    fontSize: 11,
    fontWeight: 'bold',
  },
  simulatedLabel: {
    color: '#999',
    fontSize: 10,
    marginTop: 7,
  },
});
