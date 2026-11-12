import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const formatMoney = (value) => `$${Math.round(value || 0).toLocaleString('es-CO')} COP`;

export default function TripSummaryScreen({ trip, onSolvePayment, onClose }) {
  const [loading, setLoading] = useState(false);

  const solvePayment = async (status) => {
    setLoading(true);
    try {
      await onSolvePayment(status);
    } catch (error) {
      console.error('Error al actualizar el pago:', error);
      Alert.alert('Error', 'No se pudo actualizar el pago. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const paymentSolved = trip.paymentStatus !== 'Pendiente';
  const isCash = trip.paymentMethod === 'Efectivo';

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.box}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.successIcon}>
              <Text style={styles.successCheck}>✓</Text>
            </View>
            <Text style={styles.summary}>Resumen del viaje</Text>
            <Text style={styles.title}>Viaje finalizado</Text>
            <Text style={styles.route}>{trip.origin} → {trip.destination}</Text>

            <View style={styles.fareRow}>
              <Text style={styles.rowLabel}>Tarifa del viaje</Text>
              <Text style={styles.rowValue}>{formatMoney(trip.fare)}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.rowLabel}>Comisión (20 %)</Text>
              <Text style={styles.commission}>− {formatMoney(trip.commission)}</Text>
            </View>
            {trip.tip > 0 && (
              <View style={styles.fareRow}>
                <Text style={styles.rowLabel}>Propina</Text>
                <Text style={styles.rowValue}>{formatMoney(trip.tip)}</Text>
              </View>
            )}
            <View style={styles.netRow}>
              <Text style={styles.netLabel}>Ganancia neta</Text>
              <Text style={styles.netValue}>{formatMoney(trip.driverEarnings)}</Text>
            </View>

            <View style={styles.paymentBox}>
              <Text style={styles.rowLabel}>Medio de pago: {trip.paymentMethod}</Text>
              <Text
                style={[
                  styles.paymentStatus,
                  trip.paymentStatus === 'Aprobado' || trip.paymentStatus === 'Efectivo'
                    ? styles.paid
                    : trip.paymentStatus === 'Rechazado'
                      ? styles.rejected
                      : styles.pending,
                ]}
              >
                Estado: {trip.paymentStatus}
              </Text>
            </View>

            {!paymentSolved && (
              <View style={styles.actions}>
                {isCash ? (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => solvePayment('Efectivo')}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Confirmar efectivo recibido</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => solvePayment('Aprobado')}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Pago aprobado</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => solvePayment('Rechazado')}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>Pago rechazado</Text>
                </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {paymentSolved && (
              <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
                <Text style={styles.primaryButtonText}>Volver al inicio</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: '#f3f1f5',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    elevation: 5,
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e6f7eb',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 13,
  },
  successCheck: {
    color: '#28a745',
    fontSize: 28,
    fontWeight: 'bold',
  },
  summary: {
    color: '#570376',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  title: {
    color: '#222',
    fontSize: 23,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
  },
  route: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLabel: {
    color: '#666',
    fontSize: 13,
  },
  rowValue: {
    color: '#222',
    fontSize: 13,
    fontWeight: '600',
  },
  commission: {
    color: '#c82333',
    fontSize: 13,
    fontWeight: '600',
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#eee',
    marginTop: 5,
    paddingTop: 15,
    paddingBottom: 10,
  },
  netLabel: {
    color: '#222',
    fontSize: 15,
    fontWeight: 'bold',
  },
  netValue: {
    color: '#1e7e34',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentBox: {
    backgroundColor: '#f7f6f8',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  paymentStatus: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 5,
  },
  paid: {
    color: '#1e7e34',
  },
  rejected: {
    color: '#c82333',
  },
  pending: {
    color: '#a66b00',
  },
  actions: {
    gap: 9,
    marginTop: 18,
  },
  primaryButton: {
    backgroundColor: '#570376',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#c82333',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#c82333',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
