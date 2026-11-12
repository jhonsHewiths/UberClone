import React, { useState, useEffect } from 'react';
import {
    StyleSheet, ScrollView, TextInput, Text, View, KeyboardAvoidingView, Platform,
    TouchableOpacity, Image, Alert, Modal
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

import { useRegister } from '../../services/UserService';

export default function FormPersonalData() {
    const { dataRegister, register, setDataPValidate, showPersonalErrors, isSubmitted } = useRegister();

    const [showPicker, setShowPicker] = useState(false);
    const [showGender, setShowGender] = useState(false);
    const [showLanguage, setShowLanguage] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        photoUri: dataRegister.photoUri || '',
        name: dataRegister.name || '',
        idNumber: dataRegister.idNumber || '',
        phone: dataRegister.phone || '',
        birthdate: dataRegister.birthdate || '',
        gender: dataRegister.gender || '',
        email: dataRegister.email || '',
        language: dataRegister.language || '',
    });

    const today = new Date();
    const maxDate = new Date(
        today.getFullYear() - 18,
        today.getMonth(),
        today.getDate()
    );

    const validateFormData = (dataToValidate = formData) => {
        const newErrors = {};
        if (!dataToValidate.photoUri) newErrors.photoUri = 'La foto es obligatoria';
        const nameVal = dataToValidate.name || '';
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{1,50}$/.test(nameVal) || nameVal.trim() === '') {
            newErrors.name = 'Solo letras y espacios';
        }
        if (!/^\d{6,10}$/.test(dataToValidate.idNumber)) newErrors.idNumber = 'Entre 6 y 10 dígitos';
        if (!/^\d{10}$/.test(dataToValidate.phone)) newErrors.phone = 'Debe tener 10 dígitos';
        if (!dataToValidate.birthdate) {
            newErrors.birthdate = 'Seleccione una fecha';
        } else {
            const birth = new Date(dataToValidate.birthdate + 'T12:00:00');
            if (Number.isNaN(birth.getTime()) || birth > maxDate) newErrors.birthdate = 'Mínimo 18 años';
        }
        if (!dataToValidate.gender) newErrors.gender = 'Seleccione un género';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dataToValidate.email)) newErrors.email = 'Correo inválido';
        if (!['Español', 'Inglés'].includes(dataToValidate.language)) newErrors.language = 'Seleccione un idioma';

        return newErrors;
    };

    // Sincronización asíncrona segura con el Contexto Global (Cero errores de render)
    useEffect(() => {
        const currentErrors = validateFormData(formData);
        const isValid = Object.keys(currentErrors).length === 0;
        setDataPValidate(isValid);
        register(formData);
    }, [formData]);

    const onChangeDate = (event, selectedDate) => {
        if (Platform.OS === 'android') setShowPicker(false);
        if (event.type === 'dismissed' || !selectedDate) return;
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        handleChange('birthdate', `${year}-${month}-${day}`);
    };

    const handlePickImage = () => {
        if (isSubmitted) return;
        Alert.alert('Foto de perfil', 'Seleccione una opción', [
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
            const options = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
            const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
            if (!result.canceled && result.assets?.length > 0) {
                handleChange('photoUri', result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo seleccionar la imagen');
        }
    };

    const handleChange = (field, value) => {
        if (isSubmitted) return;
        if (field === 'idNumber' || field === 'phone') value = value.replace(/\D/g, '');

        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            const currentErrors = validateFormData(updated);
            if (showPersonalErrors) setErrors(currentErrors);
            return updated;
        });
    };

    useEffect(() => {
        if (showPersonalErrors) {
            setErrors(validateFormData());
        }
    }, [showPersonalErrors]);

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.container, { paddingBottom: 120 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Mis Datos</Text>

                <View style={styles.previewContainer}>
                    {formData.photoUri ? (
                        <Image source={{ uri: formData.photoUri }} style={styles.previewImage} />
                    ) : (
                        <Text style={styles.placeholderText}>Sin foto</Text>
                    )}
                </View>

                <TouchableOpacity onPress={handlePickImage} style={[styles.buttonPhoto, isSubmitted && styles.disabledButton]} disabled={isSubmitted}>
                    <Text style={styles.buttonText}>{formData.photoUri ? 'Reemplazar foto' : 'Cargue su foto de perfil'}</Text>
                </TouchableOpacity>
                {showPersonalErrors && errors.photoUri && <Text style={styles.errorText}>{errors.photoUri}</Text>}

                {[
                    ['name', 'Nombre'],
                    ['idNumber', 'Identificación'],
                    ['phone', 'Teléfono'],
                    ['birthdate', 'Fecha de nacimiento'],
                    ['gender', 'Género'],
                    ['email', 'Correo electrónico'],
                    ['language', 'Idioma'],
                ].map(([field, label]) => {
                    if (field === 'birthdate') {
                        const hasValue = Boolean(formData[field]);
                        return (
                            <View key={field}>
                                <TouchableOpacity onPress={() => !isSubmitted && setShowPicker(true)} disabled={isSubmitted}>
                                    <View style={[styles.input, styles.dateInputContainer, showPersonalErrors && errors[field] && styles.inputError, isSubmitted && styles.disabledInput]}>
                                        <Text style={[styles.dateText, !hasValue && styles.placeholderStyle]}>
                                            {hasValue ? formData[field] : label}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                                {showPersonalErrors && errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}

                                {showPicker && (
                                    <Modal
                                        transparent={true}
                                        animationType="slide"
                                        visible={showPicker}
                                        onRequestClose={() => setShowPicker(false)}
                                    >
                                        <View style={styles.modalOverlay}>
                                            <View style={styles.modalContent}>
                                                <DateTimePicker
                                                    value={formData.birthdate ? new Date(formData.birthdate + 'T12:00:00') : maxDate}
                                                    mode="date"
                                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                    onChange={onChangeDate}
                                                    maximumDate={maxDate}
                                                    textColor="#000"
                                                />
                                                <TouchableOpacity
                                                    style={styles.confirmButton}
                                                    onPress={() => setShowPicker(false)}
                                                >
                                                    <Text style={styles.confirmButtonText}>Aceptar</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </Modal>
                                )}
                            </View>
                        );
                    }

                    if (field === 'gender' || field === 'language') {
                        const options = field === 'gender' ? ['Masculino', 'Femenino', 'Otro'] : ['Español', 'Inglés'];
                        const visible = field === 'gender' ? showGender : showLanguage;
                        const setVisible = field === 'gender' ? setShowGender : setShowLanguage;

                        return (
                            <View key={field}>
                                <TouchableOpacity
                                    style={[
                                        styles.input,
                                        showPersonalErrors && errors[field] && styles.inputError, 
                                        isSubmitted && styles.disabledInput
                                    ]}
                                    onPress={() => !isSubmitted && setVisible(!visible)}
                                    disabled={isSubmitted}
                                >
                                    <Text style={{ color: formData[field] ? '#000' : '#999' }}>
                                {formData[field] || label} ▾
                                    </Text>
                                </TouchableOpacity>
                                
                                {showPersonalErrors && errors[field] && (
                                    <Text style={styles.errorText}>{errors[field]}</Text>
                                )}

                                {visible && options.map(option => (
                                    <TouchableOpacity
                                        key={option}
                                        style={[styles.input, { backgroundColor: '#f9f9f9', paddingLeft: 20 }]}
                                        onPress={() => {
                                            handleChange(field, option);
                                            setVisible(false);
                                        }}
                                    >
                                        <Text style={{ color: '#333' }}>{option}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        );
                    }

                    return (
                        <View key={field}>
                            <TextInput
                                style={[styles.input, showPersonalErrors && errors[field] && styles.inputError, isSubmitted && styles.disabledInput]}
                                placeholder={label}
                                value={formData[field]}
                                onChangeText={(value) => handleChange(field, value)}
                                editable={!isSubmitted}
                                maxLength={field === 'name' ? 50 : field === 'idNumber' || field === 'phone' ? 10 : undefined}
                                keyboardType={field === 'email' ? 'email-address' : field === 'phone' || field === 'idNumber' ? 'number-pad' : 'default'}
                                autoCapitalize={field === 'email' ? 'none' : 'sentences'}
                            />
                            {showPersonalErrors && errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
                        </View>
                    );
                })}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, gap: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#570376', marginBottom: 10 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, backgroundColor: '#fff' },
    inputError: { borderColor: '#ff3b30' },
    disabledInput: { backgroundColor: '#f2f2f2', color: '#888' },
    errorText: { color: '#ff3b30', fontSize: 12, marginTop: 4, marginLeft: 4 },
    dateInputContainer: { justifyContent: 'center' },
    dateText: { fontSize: 14, color: '#000' },
    placeholderStyle: { color: '#999' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
    modalContent: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
    confirmButton: { backgroundColor: '#570376', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
    confirmButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    previewContainer: { width: 150, height: 150, borderRadius: 10, borderWidth: 1, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', overflow: 'hidden', marginBottom: 10 },
    previewImage: { width: '100%', height: '100%' },
    placeholderText: { color: '#888', fontSize: 12 },
    buttonPhoto: { backgroundColor: '#570376', padding: 8, borderRadius: 8, alignSelf: 'center', alignItems: 'center', marginBottom: 2, width: 250 },
    disabledButton: { backgroundColor: '#b1a2b8' },
    buttonText: { color: '#fff', fontWeight: 'bold' },
});