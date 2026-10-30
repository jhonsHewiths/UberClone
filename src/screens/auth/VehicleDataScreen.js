import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TextInput, Text, View, KeyboardAvoidingView, Platform,
    TouchableOpacity, Image, Alert, Modal } from 'react-native';
import { useVehicle } from '../../services/UserService';

export default function VehicleScreen() {
  const { dataVehicle, register, setDataCarValidate } = useVehicle()
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
          driverLic: dataVehicle.driverLic || '',
          soat: dataVehicle.soat || '',
          inspection: dataVehicle.inspection || '',
          emailPay: dataVehicle.emailPay || '',
          terms: dataVehicle.terms || '',
      });

  const validateFormData = () => {
    const newErrors = {};

    if (!formData.photoUri) {
        newErrors.photoUri = 'La foto es obligatoria';
    }
        
    return newErrors;
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Pantalla de Vehículo en construcción</Text>
    </View>
  );
}