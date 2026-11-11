import React, { useState } from 'react';
import {
  StyleSheet, ScrollView, TextInput, Text, View, KeyboardAvoidingView, Platform,
  TouchableOpacity, Image, Alert, ActivityIndicator, Modal
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

import { useDocument } from '../../services/UserService';

export default function DocumentsScreen() {
  const {
    dataRegister,
    dataVehicle,
    dataDocument,
    registerDocument,
    saveCompleteRegistration,
    isSubmitted,
    accountStatus,
  } = useDocument();

  const [errors, setErrors] = useState({});
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeDateField, setActiveDateField] = useState(null);

  const [formData, setFormData] = useState({
    photoUri: dataDocument.photoUri || '',
    numberLC: dataDocument.numberLC || '',
    dateLC: dataDocument.dateLC || '',
    photoSOAT: dataDocument.photoSOAT || '',
    dateSOAT: dataDocument.dateSOAT || '',
    photoRT: dataDocument.photoRT || '',
    dateRT: dataDocument.dateRT || '',
    email: dataDocument.email || '',
    terms: dataDocument.terms || false,
  });

  const today = new Date();
  const minDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const validateFormData = (dataToValidate = formData) => {
    const newErrors = {};
    if (!dataToValidate.photoUri) newErrors.photoUri = 'La foto de la licencia es obligatoria';
    if (!dataToValidate.numberLC?.trim()) newErrors.numberLC = 'El número de licencia es obligatorio';
    if (!dataToValidate.dateLC) newErrors.dateLC = 'Fecha obligatoria';
    if (!dataToValidate.photoSOAT) newErrors.photoSOAT = 'La foto del SOAT es obligatoria';
    if (!dataToValidate.dateSOAT) newErrors.dateSOAT = 'Fecha obligatoria';
    if (!dataToValidate.photoRT) newErrors.photoRT = 'La foto técnico-mecánica es obligatoria';
    if (!dataToValidate.dateRT) newErrors.dateRT = 'Fecha obligatoria';
    if (!dataToValidate.email) newErrors.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dataToValidate.email)) newErrors.email = 'Correo inválido';
    if (!dataToValidate.terms) newErrors.terms = 'Debe aceptar los términos';
    return newErrors;
  };

  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed' || !selectedDate || !activeDateField) return;

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');

    handleChange(activeDateField, `${year}-${month}-${day}`);
  };

  const handleChange = (field, value) => {
    if (isSubmitted) return;
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    setErrors(prevErrors => ({ ...prevErrors, [field]: undefined }));
    registerDocument(updated);
  };

  const selectImage = async (useCamera, fieldType) => {
    if (isSubmitted) return;
    try {
      const permissionResult = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync() 
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permiso denegado', 'Se necesitan permisos.');
        return;
      }

      const pickerResult = useCamera 
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 }) 
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });

      if (!pickerResult.canceled && pickerResult.assets?.[0]?.uri) {
        handleChange(fieldType, pickerResult.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleFinish = async () => {
    const currentErrors = validateFormData(formData);
    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      Alert.alert("Atención", "Por favor complete correctamente todos los campos obligatorios.");
      return;
    }

    try {
      setLoading(true);
      const finalData = { ...formData, terms: true };

      registerDocument(finalData);
      setFormData(finalData);

      await saveCompleteRegistration({
        personalData: dataRegister,
        vehicleData: dataVehicle,
        documentData: finalData,
      });
      Alert.alert("¡Éxito!", "Su registro ha sido enviado y está pendiente por aprobación.");
    } catch (error) {
      Alert.alert("Error", "No se pudo completar el registro. Revisa tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  const isAvailable = accountStatus.trim().toLowerCase() === 'disponible';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Documentos y Registro</Text>

        <Text style={styles.sectionLabel}>Licencia de Conducción</Text>
        <TextInput
          style={[styles.input, errors.numberLC && styles.inputError, isSubmitted && styles.disabledInput]}
          placeholder="Número de Licencia"
          value={formData.numberLC}
          onChangeText={(value) => handleChange('numberLC', value)}
          editable={!isSubmitted}
        />
        {errors.numberLC && <Text style={styles.errorText}>{errors.numberLC}</Text>}

        <TouchableOpacity
          style={[styles.input, styles.dateInputContainer, errors.dateLC && styles.inputError, isSubmitted && styles.disabledInput]}
          onPress={() => { if (!isSubmitted) { setActiveDateField('dateLC'); setShowPicker(true); }}}
          disabled={isSubmitted}
        >
          <Text style={[styles.dateText, !formData.dateLC && styles.placeholderStyle]}>
            {formData.dateLC ? `Vencimiento LC: ${formData.dateLC}` : 'Fecha de vencimiento (Licencia)'}
          </Text>
        </TouchableOpacity>
        {errors.dateLC && <Text style={styles.errorText}>{errors.dateLC}</Text>}

        <View style={styles.previewContainer}>
          {formData.photoUri ? <Image source={{ uri: formData.photoUri }} style={styles.previewImage} /> : <Text style={styles.placeholderText}>Sin foto</Text>}
        </View>
        <TouchableOpacity onPress={() => selectImage(false, 'photoUri')} style={[styles.buttonPhoto, isSubmitted && styles.disabledButton]} disabled={isSubmitted}>
          <Text style={styles.buttonText}>{formData.photoUri ? 'Reemplazar foto' : 'Cargar foto de Licencia'}</Text>
        </TouchableOpacity>
        {errors.photoUri && <Text style={styles.errorText}>{errors.photoUri}</Text>}

        <Text style={[styles.sectionLabel, { marginTop: 15 }]}>SOAT</Text>
        <TouchableOpacity
          style={[styles.input, styles.dateInputContainer, errors.dateSOAT && styles.inputError, isSubmitted && styles.disabledInput]}
          onPress={() => { if (!isSubmitted) { setActiveDateField('dateSOAT'); setShowPicker(true); }}}
          disabled={isSubmitted}
        >
          <Text style={[styles.dateText, !formData.dateSOAT && styles.placeholderStyle]}>
            {formData.dateSOAT ? `Vencimiento SOAT: ${formData.dateSOAT}` : 'Fecha de vencimiento (SOAT)'}
          </Text>
        </TouchableOpacity>
        {errors.dateSOAT && <Text style={styles.errorText}>{errors.dateSOAT}</Text>}

        <View style={styles.previewContainer}>
          {formData.photoSOAT ? <Image source={{ uri: formData.photoSOAT }} style={styles.previewImage} /> : <Text style={styles.placeholderText}>Sin foto</Text>}
        </View>
        <TouchableOpacity onPress={() => selectImage(false, 'photoSOAT')} style={[styles.buttonPhoto, isSubmitted && styles.disabledButton]} disabled={isSubmitted}>
          <Text style={styles.buttonText}>{formData.photoSOAT ? 'Reemplazar foto' : 'Cargar foto SOAT'}</Text>
        </TouchableOpacity>
        {errors.photoSOAT && <Text style={styles.errorText}>{errors.photoSOAT}</Text>}

        <Text style={[styles.sectionLabel, { marginTop: 15 }]}>Revisión Técnico-Mecánica</Text>
        <TouchableOpacity
          style={[styles.input, styles.dateInputContainer, errors.dateRT && styles.inputError, isSubmitted && styles.disabledInput]}
          onPress={() => { if (!isSubmitted) { setActiveDateField('dateRT'); setShowPicker(true); }}}
          disabled={isSubmitted}
        >
          <Text style={[styles.dateText, !formData.dateRT && styles.placeholderStyle]}>
            {formData.dateRT ? `Vencimiento RTM: ${formData.dateRT}` : 'Fecha de vencimiento (Técnico-mecánica)'}
          </Text>
        </TouchableOpacity>
        {errors.dateRT && <Text style={styles.errorText}>{errors.dateRT}</Text>}

        <View style={styles.previewContainer}>
          {formData.photoRT ? <Image source={{ uri: formData.photoRT }} style={styles.previewImage} /> : <Text style={styles.placeholderText}>Sin foto</Text>}
        </View>
        <TouchableOpacity onPress={() => selectImage(false, 'photoRT')} style={[styles.buttonPhoto, isSubmitted && styles.disabledButton]} disabled={isSubmitted}>
          <Text style={styles.buttonText}>{formData.photoRT ? 'Reemplazar foto' : 'Cargar foto Técnico-Mecánica'}</Text>
        </TouchableOpacity>
        {errors.photoRT && <Text style={styles.errorText}>{errors.photoRT}</Text>}

        <Text style={[styles.sectionLabel, { marginTop: 15 }]}>Correo electrónico</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError, isSubmitted && styles.disabledInput]}
          placeholder="Correo electrónico"
          value={formData.email}
          onChangeText={(value) => handleChange('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isSubmitted}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <TouchableOpacity 
          onPress={() => !isSubmitted && handleChange('terms', !formData.terms)}
          style={styles.checkboxRow}
          disabled={isSubmitted}
        >
          <View style={[styles.checkbox, formData.terms && styles.checkboxChecked]}>
            {formData.terms && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.termsText}>Acepto los términos y condiciones</Text>
        </TouchableOpacity>
        {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

        <TouchableOpacity
          style={[styles.buttonPhoto, { marginTop: 25, width: '100%', padding: 14 }, isSubmitted && styles.disabledButton]}
          onPress={handleFinish}
          disabled={loading || isSubmitted}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isSubmitted ? 'Registro Enviado' : 'Completar Registro'}</Text>}
        </TouchableOpacity>

        {isSubmitted && (
          <View style={styles.statusWrapper}>
            <View style={[styles.statusBadge, isAvailable ? styles.statusAvailable : styles.statusUnavailable]}>
              <View style={[styles.miniCheckbox, isAvailable ? styles.bgGreen : styles.bgRed]}>
                <Text style={styles.miniCheckText}>✓</Text>
              </View>
              <Text style={[styles.statusText, isAvailable ? styles.textGreen : styles.textRed]}>
                Estado: {accountStatus.toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {showPicker && (
          <Modal transparent={true} animationType="slide" visible={showPicker} onRequestClose={() => setShowPicker(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <DateTimePicker
                  value={formData[activeDateField] ? new Date(formData[activeDateField] + 'T12:00:00') : minDate}
                  mode="date"
                  display="spinner"
                  onChange={onChangeDate}
                  minimumDate={minDate}
                  textColor="#000"
                />
                <TouchableOpacity style={styles.confirmButton} onPress={() => setShowPicker(false)}>
                  <Text style={styles.confirmButtonText}>Aceptar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#570376', marginBottom: 10 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, backgroundColor: '#fff' },
  inputError: { borderColor: '#ff3b30' },
  disabledInput: { backgroundColor: '#f2f2f2', color: '#888' },
  errorText: { color: '#ff3b30', fontSize: 12, marginTop: 4, marginLeft: 4 },
  dateInputContainer: { justifyContent: 'center' },
  dateText: { fontSize: 14, color: '#000' },
  placeholderStyle: { color: '#999' },
  previewContainer: { width: 150, height: 150, borderRadius: 10, borderWidth: 1, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', overflow: 'hidden', marginBottom: 5 },
  previewImage: { width: '100%', height: '100%' },
  placeholderText: { color: '#888', fontSize: 12 },
  buttonPhoto: { backgroundColor: '#570376', padding: 10, borderRadius: 8, alignSelf: 'center', alignItems: 'center', width: 250 },
  disabledButton: { backgroundColor: '#b1a2b8' },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 15 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: '#570376', borderRadius: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  checkboxChecked: { backgroundColor: '#570376' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  termsText: { flex: 1, fontSize: 13, color: '#333' },
  statusWrapper: { marginTop: 20, alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 12, borderWidth: 1.5, gap: 12 },
  statusUnavailable: { backgroundColor: '#ffe6e6', borderColor: '#ff3b30' },
  statusAvailable: { backgroundColor: '#e6ffe6', borderColor: '#28a745' },
  miniCheckbox: { width: 20, height: 20, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  bgRed: { backgroundColor: '#ff3b30' },
  bgGreen: { backgroundColor: '#28a745' },
  miniCheckText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  statusText: { fontWeight: 'bold', fontSize: 15 },
  textRed: { color: '#c82333' },
  textGreen: { color: '#1e7e34' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  confirmButton: { backgroundColor: '#570376', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  confirmButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});