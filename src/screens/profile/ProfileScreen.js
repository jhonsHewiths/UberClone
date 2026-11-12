import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, 
  TextInput, TouchableOpacity, View } from 'react-native';
import { useRegister } from '../../services/UserService';

const personalData = [
  ['name', 'Nombre completo'],
  ['idNumber', 'Documento de identidad'],
  ['phone', 'Celular'],
  ['birthdate', 'Fecha de nacimiento'],
  ['gender', 'Género'],
  ['email', 'Correo electrónico'],
];

const vehicleData = [
  ['category', 'Categoría'],
  ['plate', 'Placa'],
  ['mym', 'Marca y modelo'],
  ['year', 'Año'],
  ['color', 'Color'],
  ['passengers', 'Capacidad de pasajeros'],
];

const documentData = [
  ['numberLC', 'Número de licencia'],
  ['dateLC', 'Vencimiento de licencia'],
  ['dateSOAT', 'Vencimiento del SOAT'],
  ['dateRT', 'Vencimiento técnico-mecánica'],
  ['email', 'Correo para documentos'],
];

const createData = (personal, vehicle, documents) => ({
  personal: { ...personal },
  vehicle: { ...vehicle },
  document: { ...documents },
});

export default function ProfileScreen() {
  const { statusAcc, dataDocument, dataRegister, dataVehicle, closeSec, updateProfile } = useRegister();

  const [formData, setFormData] = useState(() => (
    createData(dataRegister, dataVehicle, dataDocument)
  ));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData(createData(dataRegister, dataVehicle, dataDocument));
  }, [dataDocument, dataRegister, dataVehicle]);

  const handleChange = (section, field, value) => {
    setFormData((previous) => ({
      ...previous,
      [section]: {
        ...previous[section],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!formData.personal.name?.trim()) {
      Alert.alert('Revisa tus datos', 'El nombre completo es obligatorio.');
      return;
    }

    if (!/^\d{10}$/.test(formData.personal.phone || '')) {
      Alert.alert('Revisa tus datos', 'El celular debe tener 10 dígitos.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personal.email || '')) {
      Alert.alert('Revisa tus datos', 'Ingresa un correo electrónico válido.');
      return;
    }

    setLoading(true);
    try {
      await updateDriverProfile(formData);
      Alert.alert('Perfil actualizado', 'Tus cambios se guardaron correctamente.');
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
      Alert.alert('Error', 'No se pudo guardar el perfil. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const confirmCloseSec = () => {
    Alert.alert(
      'Cerrar sesión',
      'Se cerrará la sesión en este dispositivo. Tus datos y viajes guardados se conservarán.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: closeSec },
      ]
    );
  };

  const firstName = formData.personal.name?.trim().split(/\s+/)[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Mi perfil</Text>

      <View style={styles.headerCard}>
        {formData.personal.photoUri ? (
          <Image source={{ uri: formData.personal.photoUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.photoPer, styles.photoPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {firstName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{formData.personal.name || 'Conductor'}</Text>
          <Text style={styles.email}>{formData.personal.email || 'Sin correo registrado'}</Text>
          <Text style={[
            styles.status,
            statusAcc.trim().toLowerCase() === 'disponible'
              ? styles.available
              : styles.unavailable,
          ]}>
            {statusAcc.toUpperCase()}
          </Text>
        </View>
      </View>

      <ProfileSection title="Datos personales" fields={personalData} section="personal" values={formData.personal} onChange={handleChange} />
      <View style={styles.language}>
        <Text style={styles.sectionTitle}>Idioma</Text>
        <Text style={styles.boxLabel}>Idioma de la aplicación</Text>
        <View style={styles.languageOptions}>
          {['Español', 'Inglés'].map((language) => {
            const selected = formData.personal.language === language;
            return (
              <TouchableOpacity
                key={language}
                style={[styles.languageOption, selected && styles.languageOptionSelected]}
                onPress={() => handleChange('personal', 'language', language)}
              >
                <Text style={[
                  styles.languageText,
                  selected && styles.languageTextSelected,
                ]}>
                  {language}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ProfileSection title="Vehículo" fields={vehicleData} section="vehicle" values={formData.vehicle} onChange={handleChange} />
      <PhotoSection
        title="Foto del vehículo"
        uri={formData.vehicle.photoUri}
      />

      <ProfileSection title="Documentos" fields={documentData} section="document" values={formData.document} onChange={handleChange} />
      <PhotoSection title="Licencia de conducción" uri={formData.document.photoUri} />
      <PhotoSection title="SOAT" uri={formData.document.photoSOAT} />
      <PhotoSection title="Revisión técnico-mecánica" uri={formData.document.photoRT} />

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.disabledButton]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Guardar cambios</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={confirmCloseSec}>
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ProfileSection({ title, fields, section, values, onChange }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {fields.map(([field, label]) => (
        <View key={`${section}-${field}`} style={styles.box}>
          <Text style={styles.boxLabel}>{label}</Text>
          <TextInput
            style={styles.input}
            value={String(values[field] ?? '')}
            onChangeText={(value) => onChange(section, field, value)}
            placeholder={label}
            keyboardType={field === 'phone' || field === 'idNumber' || field === 'year' || field === 'passengers'
              ? 'number-pad'
              : field === 'email'
                ? 'email-address'
                : 'default'}
            autoCapitalize={field === 'email' ? 'none' : 'sentences'}
          />
        </View>
      ))}
    </View>
  );
}

function PhotoSection({ title, uri }) {
  return (
    <View style={styles.photoCard}>
      <Text style={styles.boxLabel}>{title}</Text>
      {uri ? (
        <Image source={{ uri }} style={styles.documentImage} resizeMode="cover" />
      ) : (
        <Text style={styles.missingPhoto}>No hay una foto guardada</Text>
      )}
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
    paddingBottom: 36,
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
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 15,
    marginTop: 18,
    marginBottom: 14,
  },
  photoPer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#eee',
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0e7f4',
  },
  photo: {
    color: '#570376',
    fontSize: 26,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 13,
  },
  name: {
    color: '#222',
    fontSize: 17,
    fontWeight: 'bold',
  },
  email: {
    color: '#777',
    fontSize: 12,
    marginTop: 3,
  },
  status: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 7,
  },
  available: {
    color: '#1e7e34',
  },
  unavailable: {
    color: '#c82333',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
  },
  language: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  box: {
    marginBottom: 10,
  },
  boxLabel: {
    color: '#777',
    fontSize: 11,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    color: '#222',
    fontSize: 14,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  languageOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  languageOption: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 11,
  },
  languageOptionSelected: {
    borderColor: '#570376',
    backgroundColor: '#f7f0fa',
  },
  languageText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  languageTextSelected: {
    color: '#570376',
  },
  photoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 13,
    marginBottom: 12,
  },
  documentImage: {
    width: '100%',
    height: 155,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  missingPhoto: {
    color: '#999',
    fontSize: 12,
    paddingVertical: 12,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#570376',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoutButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c82333',
    borderRadius: 10,
    padding: 13,
    marginTop: 11,
  },
  logoutButtonText: {
    color: '#c82333',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
