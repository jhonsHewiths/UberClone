import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TextInput, Text, View, KeyboardAvoidingView, Platform,
    TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVehicle } from '../../services/UserService';

export default function VehicleScreen() {
  
  const { dataVehicle, register, setDataCarValidate } = useVehicle();

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

  const validateFormData = () => {
      const newErrors = {};

      if (!['Economico', 'XL', 'Premium'].includes(formData.category)) {
          newErrors.category = 'Seleccione una categoria valida';
      }
      if (!formData.photoUri) {
          newErrors.photoUri = 'La foto es obligatoria';
      }
      const plateValidate = /^[A-Z]{3}\d{3}$/;
      if (!plateValidate.test(formData.plate)) {
          newErrors.plate = 'Formato invalido (Ej: ABC123)';
      }
      if (!formData.mym || !formData.mym.trim() || formData.mym.length > 30) {
          newErrors.mym = 'Maximo 30 caracteres';
      }
      const yearNum = parseInt(formData.year, 10);
      if (!/^\d{4}$/.test(formData.year) || yearNum < 1900 || yearNum > currentYear) {
          newErrors.year = `Año invalido (4 digitos, max. ${currentYear})`;
      }
      if (!formData.color) {
          newErrors.color = 'Seleccione un color';
      }
      const passengersNum = parseInt(formData.passengers, 10);
      if (isNaN(passengersNum) || passengersNum <= 0) {
          newErrors.passengers = 'Ingrese una capacidad valida';
      } else if (formData.category === 'XL' && passengersNum < 6) {
          newErrors.passengers = 'La categoria XL exige minimo 6 pasajeros';
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

    setFormData(prev => ({
        ...prev,
        [field]: value,
    }));

    setErrors(prev => ({
        ...prev,
        [field]: undefined
    }));
  };

 const isFormValid = Object.keys(validateFormData()).length === 0;

    useEffect(() => {
        setDataCarValidate(isFormValid);
        register(formData);
    }, [formData, isFormValid, setDataCarValidate, register]);

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

        <View>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowCategory(!showCategory)}
          >
            <Text style={{ color: formData.category ? '#000' : '#999' }}>
              {formData.category || 'Categoría'} ▾
            </Text>
          </TouchableOpacity>

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

        <TextInput
          style={styles.input}
          placeholder="Placa (Ej: ABC123)"
          value={formData.plate}
          onChangeText={(value) => handleChange('plate', value)}
          maxLength={6}
          autoCapitalize="characters"
        />
        <TextInput
          style={styles.input}
          placeholder="Marca y modelo"
          value={formData.mym}
          onChangeText={(value) => handleChange('mym', value)}
          maxLength={30}
        />
        <TextInput
          style={styles.input}
          placeholder="Año"
          value={formData.year}
          onChangeText={(value) => handleChange('year', value)}
          maxLength={4}
          keyboardType="number-pad"
        />
        <View>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowColor(!showColor)}
          >
            <Text style={{ color: formData.color ? '#000' : '#999' }}>
              {formData.color || 'Color'} ▾
            </Text>
          </TouchableOpacity>

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
        <TextInput
            style={styles.input}
            placeholder="Capacidad de pasajeros"
            value={formData.passengers}
            onChangeText={(value) => handleChange('passengers', value)}
            maxLength={2}
            keyboardType="number-pad"
        />

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
      marginBottom: 10,
      width: 280,
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});