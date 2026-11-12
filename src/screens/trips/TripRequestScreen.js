import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const formatMoney = (value) => `$${Math.round(value || 0).toLocaleString('es-CO')} COP`;

export default function TripRequestScreen({ request, onAccept, onReject }) {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const expired = useRef(false);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const remaining = Math.max(0, 10 - Math.floor((Date.now() - startedAt) / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0 && !expired.current) {
        expired.current = true;
        clearInterval(timer);
        onReject(true);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [onReject, request.id]);

  return (
    <ScrollView style={styles.overlay} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>SOLICITUD SIMULADA</Text>
            <Text style={styles.title}>Nuevo viaje</Text>
          </View>
          <View style={styles.timer}>
            <Text style={styles.timerNumber}>{secondsLeft}</Text>
            <Text style={styles.timerLabel}>seg</Text>
          </View>
        </View>

        <View style={styles.mockNotice}>
          <Text style={styles.mockNoticeText}>
            Solicitud de demostración: no corresponde a un pasajero real.
          </Text>
        </View>

        <View style={styles.route}>
          <View style={styles.routeLine}>
            <View style={styles.pickupDot} />
            <View style={styles.dash} />
            <View style={styles.destinationDot} />
          </View>
          <View style={styles.addresses}>
            <Text style={styles.label}>RECOGER EN</Text>
            <Text style={styles.address}>{request.origin}</Text>
            <Text style={[styles.label, styles.destinationLabel]}>DESTINO</Text>
            <Text style={styles.address}>{request.destination}</Text>
          </View>
        </View>

        <View style={styles.details}>
          <Detail label="Distancia" value={`${request.distanceKm} km`} />
          <Detail label="Duración aprox." value={`${request.durationMin} min`} />
          <Detail label="Categoría" value={request.category} />
          <Detail label="Pago" value={request.paymentMethod} />
        </View>

        <View style={styles.fareBox}>
          <View>
            <Text style={styles.label}>TARIFA ESTIMADA</Text>
            <Text style={styles.fare}>{formatMoney(request.fare)}</Text>
          </View>
          <View style={styles.earnings}>
            <Text style={styles.label}>GANANCIA NETA</Text>
            <Text style={styles.net}>{formatMoney(request.driverEarnings)}</Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.rejectButton} onPress={() => onReject(false)}>
            <Text style={styles.rejectText}>Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptText}>Aceptar viaje</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function Detail({ label, value }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 10, 30, 0.55)',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    color: '#570376',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  title: {
    color: '#222',
    fontSize: 23,
    fontWeight: 'bold',
    marginTop: 4,
  },
  timer: {
    width: 54,
    height: 54,
    borderWidth: 3,
    borderColor: '#570376',
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerNumber: {
    color: '#570376',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  timerLabel: {
    color: '#777',
    fontSize: 10,
  },
  mockNotice: {
    backgroundColor: '#f4eff7',
    borderRadius: 8,
    padding: 9,
    marginTop: 16,
  },
  mockNoticeText: {
    color: '#570376',
    fontSize: 11,
    textAlign: 'center',
  },
  route: {
    flexDirection: 'row',
    marginTop: 20,
  },
  routeLine: {
    alignItems: 'center',
    width: 22,
    paddingTop: 3,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#28a745',
  },
  dash: {
    width: 2,
    height: 30,
    backgroundColor: '#bbb',
  },
  destinationDot: {
    width: 12,
    height: 12,
    backgroundColor: '#570376',
  },
  addresses: {
    flex: 1,
    paddingLeft: 10,
  },
  label: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
  },
  destinationLabel: {
    marginTop: 13,
  },
  address: {
    color: '#222',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 3,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingVertical: 13,
  },
  detail: {
    width: '50%',
    paddingVertical: 5,
  },
  detailValue: {
    color: '#222',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  fareBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 17,
  },
  fare: {
    color: '#222',
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 4,
  },
  earnings: {
    alignItems: 'flex-end',
  },
  net: {
    color: '#1e7e34',
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 4,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  rejectButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 13,
  },
  rejectText: {
    color: '#555',
    fontWeight: 'bold',
  },
  acceptButton: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#570376',
    borderRadius: 10,
    padding: 13,
  },
  acceptText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
