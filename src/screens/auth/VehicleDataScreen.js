import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TextInput, Text, View, KeyboardAvoidingView, Platform,
    TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVehicle } from '../../services/UserService';

export default function VehicleScreen() {
  
  const { dataVehicle, register, setDataCarValidate, showVehicleErrors } = useVehicle();

  const [showCategory, setShowCategory] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
      photoUri: dataVehicle.photoUri || '',
      category: dataVehicle.category || '',
      plate: dataVehicle.plate || '',
      mym: dataVehicle.mym || dataVehicle.model || '',
      year: dataVehicle.year || '',
      color: dataVehicle.color || '',
      passengers: dataVehicle.passengers || '',
  });

  const currentYear = new Date().getFullYear();

  const validateFormData = (dataToValidate = formData) => {
      const newErrors = {};

      if (!['Económico', 'XL', 'Premium'].includes(dataToValidate.category)) {
          newErrors.category = 'Seleccione una categoría válida';
      }
      if (!dataToValidate.photoUri) {
          newErrors.photoUri = 'La foto es obligatoria';
      }
      const plateValidate = /^[A-Z]{3}\d{3}$/;
      if (!plateValidate.test(dataToValidate.plate)) {
          newErrors.plate = 'Formato inválido (Ej: ABC123)';
      }
      if (!dataToValidate.mym || !dataToValidate.mym.trim() || dataToValidate.mym.length > 30) {
          newErrors.mym = 'Máximo 30 caracteres';
      }
      const yearNum = parseInt(dataToValidate.year, 10);
      if (!/^\d{4}$/.test(dataToValidate.year) || yearNum < 1900 || yearNum > currentYear) {
          newErrors.year = `Año inválido (4 dígitos, máx. ${currentYear})`;
      }
      if (!dataToValidate.color) {
          newErrors.color = 'Seleccione un color';
      }
      const passengersNum = parseInt(dataToValidate.passengers, 10);
      if (isNaN(passengersNum) || passengersNum <= 0) {
          newErrors.passengers = 'Ingrese una capacidad válida';
      } else if (dataToValidate.category === 'XL' && passengersNum < 6) {
          newErrors.passengers = 'La categoría XL exige mínimo 6 pasajeros';
      }

      return newErrors;
  };

  const handlePickImage = () => {
      Alert.alert('Foto del vehículo', 'Seleccione una opción', [
          { text: 'Cámara', onPress: () => selectImage(true) },
          { text: 'Galería', onPress: () => selectImage(false) },
          { text: 'Cancelar', style: 'cancel' }
      ]);
  };

  const selectImage = async (camera) => {
    try {
        const permission = camera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            Alert.alert('Error', 'Debe conceder el permiso');
            return;
        }

        const options = {
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        };

        const result = camera
            ? await ImagePicker.launchCameraAsync(options)
            : await ImagePicker.launchImageLibraryAsync(options);

        if (!result.canceled && result.assets?.length > 0) {
            handleChange('photoUri', result.assets[0].uri);
        }
    } catch (error) {
        Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleChange = (field, value) => {
    if (field === 'plate') {
        value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    } else if (field === 'year' || field === 'passengers') {
        value = value.replace(/\D/g, '');
    }

    setFormData(prev => {
        const updated = { ...prev, [field]: value };
        
        setTimeout(() => {
            const currentErrors = validateFormData(updated);
            const isValid = Object.keys(currentErrors).length === 0;
            setDataCarValidate(isValid);
            register(updated);

            if (showVehicleErrors) {
                setErrors(currentErrors);
            }
        }, 0);

        return updated;
    });
  };

  useEffect(() => {
      if (showVehicleErrors) {
          const validationErrors = validateFormData();
          setErrors(validationErrors);
      }
  }, [showVehicleErrors]);

  useEffect(() => {
      const timer = setTimeout(() => {
          const validationErrors = validateFormData();
          const isValid = Object.keys(validationErrors).length === 0;
          setDataCarValidate(isValid);
          register(formData);
      }, 0);

      return () => clearTimeout(timer);
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 120 }
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <Text style={styles.title}>Datos del Vehículo</Text>

        <View style={styles.previewContainer}>
          {formData.photoUri ? (
            <Image
              source={{ uri: formData.photoUri }}
              style={styles.previewImage}
            />
          ) : (
            <Text style={styles.placeholderText}>Sin foto</Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handlePickImage}
          style={styles.buttonPhoto}
        >
          <Text style={styles.buttonText}>
            {formData.photoUri ? 'Reemplazar foto del vehículo' : 'Cargue foto (donde se vea la placa)'}
          </Text>
        </TouchableOpacity>
        {showVehicleErrors && errors.photoUri && <Text style={styles.errorText}>{errors.photoUri}</Text>}

        <View>
          <TouchableOpacity
            style={[styles.input, showVehicleErrors && errors.category && styles.inputError]}
            onPress={() => setShowCategory(!showCategory)}
          >
            <Text style={{ color: formData.category ? '#000' : '#999' }}>
              {formData.category || 'Categoría'} ▾
            </Text>
          </TouchableOpacity>
          {showVehicleErrors && errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

          {showCategory && ['Económico', 'XL', 'Premium'].map(option => (
            <TouchableOpacity
              key={option}
              style={styles.input}
              onPress={() => {
                  handleChange('category', option);
                  setShowCategory(false);
              }}
            >
              <Text>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View>
            <TextInput
              style={[styles.input, showVehicleErrors && errors.plate && styles.inputError]}
              placeholder="Placa (Ej: ABC123)"
              value={formData.plate}
              onChangeText={(value) => handleChange('plate', value)}
              maxLength={6}
              autoCapitalize="characters"
            />
            {showVehicleErrors && errors.plate && <Text style={styles.errorText}>{errors.plate}</Text>}
        </View>

        <View>
            <TextInput
              style={[styles.input, showVehicleErrors && errors.mym && styles.inputError]}
              placeholder="Marca y modelo"
              value={formData.mym}
              onChangeText={(value) => handleChange('mym', value)}
              maxLength={30}
            />
            {showVehicleErrors && errors.mym && <Text style={styles.errorText}>{errors.mym}</Text>}
        </View>

        <View>
            <TextInput
              style={[styles.input, showVehicleErrors && errors.year && styles.inputError]}
              placeholder="Año"
              value={formData.year}
              onChangeText={(value) => handleChange('year', value)}
              maxLength={4}
              keyboardType="number-pad"
            />
            {showVehicleErrors && errors.year && <Text style={styles.errorText}>{errors.year}</Text>}
        </View>

        <View>
          <TouchableOpacity
            style={[styles.input, showVehicleErrors && errors.color && styles.inputError]}
            onPress={() => setShowColor(!showColor)}
          >
            <Text style={{ color: formData.color ? '#000' : '#999' }}>
              {formData.color || 'Color'} ▾
            </Text>
          </TouchableOpacity>
          {showVehicleErrors && errors.color && <Text style={styles.errorText}>{errors.color}</Text>}

          {showColor && ['Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul'].map(option => (
            <TouchableOpacity
              key={option}
              style={styles.input}
              onPress={() => {
                handleChange('color', option);
                setShowColor(false);
              }}
            >
              <Text>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View>
            <TextInput
                style={[styles.input, showVehicleErrors && errors.passengers && styles.inputError]}
                placeholder="Capacidad de pasajeros"
                value={formData.passengers}
                onChangeText={(value) => handleChange('passengers', value)}
                maxLength={2}
                keyboardType="number-pad"
            />
            {showVehicleErrors && errors.passengers && <Text style={styles.errorText}>{errors.passengers}</Text>}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
      padding: 20,
      gap: 15,
  },
  title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#570376',
      marginBottom: 10,
  },
  input: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      padding: 12,
      backgroundColor: '#fff',
  },
  inputError: {
      borderColor: '#ff3b30',
  },
  errorText: {
      color: '#ff3b30',
      fontSize: 12,
      marginTop: 4,
      marginLeft: 4,
  },
  previewContainer: {
      width: 200,
      height: 130,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#ccc',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      overflow: 'hidden',
      marginBottom: 10,
  },
  previewImage: { width: '100%', height: '100%' },
  placeholderText: { color: '#888', fontSize: 12 },
  buttonPhoto: {
      backgroundColor: '#570376',
      padding: 8,
      borderRadius: 8,
      alignSelf: 'center',
      alignItems: 'center',
      marginBottom: 2,
      width: 280,
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});