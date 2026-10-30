
import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TextInput, Text, View, KeyboardAvoidingView, Platform,
    TouchableOpacity, Image, Alert, Modal } from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

import { useRegister } from '../../services/UserService';

export default function FormPersonalData() {
    const { dataRegister, register, setDataPValidate } = useRegister();

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

    const validateFormData = () => {
        const newErrors = {};

        if (!formData.photoUri) {
            newErrors.photoUri = 'La foto es obligatoria';
        }
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{1,50}$/.test(formData.name) || !formData.name.trim()) {
            newErrors.name = 'Solo letras y espacios, máximo 50 caracteres';
        }
        if (!/^\d{6,10}$/.test(formData.idNumber)) {
            newErrors.idNumber = 'Debe tener entre 6 y 10 dígitos';
        }
        if (!/^\d{10}$/.test(formData.phone)) {
            newErrors.phone = 'Debe tener 10 dígitos';
        }
        if (!formData.birthdate) {
            newErrors.birthdate = 'Seleccione una fecha';
        } else {
            const birth = new Date(formData.birthdate + 'T12:00:00');

            if (Number.isNaN(birth.getTime()) || birth > maxDate){
                newErrors.birthdate = 'Debe tener mínimo 18 años';  
            }
        }

        if (!formData.gender) {
            newErrors.gender = 'Seleccione un género';
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Correo electrónico inválido';
        }
            
        if (!['Español', 'Inglés'].includes(formData.language)) {
            newErrors.language = 'Seleccione un idioma';
        }
            
        return newErrors;
    };

    const onChangeDate = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }

        if (event.type === 'dismissed' || !selectedDate) return;

        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');

        handleChange('birthdate', `${year}-${month}-${day}`);
    };

    const handlePickImage = () => {
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

            const options = {
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
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
        if (field === 'idNumber' || field === 'phone') {
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

    const isFormValid =
        Object.keys(validateFormData()).length === 0;

    useEffect(() => {
        setDataPValidate(isFormValid);
        register(formData);
    }, [formData, isFormValid, setDataPValidate, register]);

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
                <Text style={styles.title}>Mis Datos</Text>

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
                        {formData.photoUri
                            ? 'Reemplazar foto'
                            : 'Cargue su foto de perfil'}
                    </Text>
                </TouchableOpacity>

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
                                <TouchableOpacity
                                    onPress={() => setShowPicker(true)}
                                >
                                    <View style={[
                                        styles.input,
                                        styles.dateInputContainer
                                    ]}>
                                        <Text style={[
                                            styles.dateText,
                                            !hasValue && styles.placeholderStyle
                                        ]}>
                                            {hasValue ? formData[field] : label}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                {showPicker && Platform.OS === 'ios' && (
                                    <Modal
                                        transparent={true}
                                        animationType="slide"
                                        visible={showPicker}
                                        onRequestClose={() => setShowPicker(false)}
                                    >
                                        <View style={styles.modalOverlay}>
                                            <View style={styles.modalContent}>
                                                <DateTimePicker
                                                    value={
                                                        formData.birthdate
                                                            ? new Date(formData.birthdate + 'T12:00:00')
                                                            : maxDate
                                                    }
                                                    mode="date"
                                                    display="spinner"
                                                    onChange={onChangeDate}
                                                    maximumDate={maxDate}
                                                    textColor="#000"
                                                />

                                                <TouchableOpacity
                                                    style={styles.confirmButton}
                                                    onPress={() => setShowPicker(false)}
                                                >
                                                    <Text style={styles.confirmButtonText}>
                                                        Aceptar
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </Modal>
                                )}

                                {showPicker && Platform.OS === 'android' && (
                                    <DateTimePicker
                                        value={
                                            formData.birthdate
                                                ? new Date(formData.birthdate + 'T12:00:00')
                                                : maxDate
                                        }
                                        mode="date"
                                        display="default"
                                        onChange={onChangeDate}
                                        maximumDate={maxDate}
                                    />
                                )}
                            </View>
                        );
                    }

                    if (field === 'gender' || field === 'language') {
                        const options = field === 'gender'
                            ? ['Masculino', 'Femenino', 'Otro']
                            : ['Español', 'Inglés'];

                        const visible = field === 'gender'
                            ? showGender : showLanguage;

                        const setVisible = field === 'gender'
                            ? setShowGender : setShowLanguage;

                        return (
                            <View key={field}>
                                <TouchableOpacity
                                    style={styles.input}
                                    onPress={() => setVisible(!visible)}
                                >
                                    <Text style={{
                                        color: formData[field] ? '#000' : '#999'
                                    }}>
                                        {formData[field] || label} ▾
                                    </Text>
                                </TouchableOpacity>

                                {visible && options.map(option => (
                                    <TouchableOpacity
                                        key={option}
                                        style={styles.input}
                                        onPress={() => {
                                            handleChange(field, option);
                                            setVisible(false);
                                        }}
                                    >
                                        <Text>{option}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        );
                    }

                    return (
                        <TextInput
                            key={field}
                            style={styles.input}
                            placeholder={label}
                            value={formData[field]}
                            onChangeText={(value) => handleChange(field, value)}
                            maxLength={
                                field === 'name' ? 50 :
                                field === 'idNumber' || field === 'phone' ? 10 :
                                undefined
                            }
                            keyboardType={
                                field === 'email' ? 'email-address' :
                                field === 'phone' || field === 'idNumber'
                                    ? 'number-pad' : 'default'
                            }
                            autoCapitalize={
                                field === 'email' ? 'none' : 'sentences'
                            }
                        />
                    );
                })}

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
    dateInputContainer: {
        justifyContent: 'center',
    },
    dateText: {
        fontSize: 14,
        color: '#000',
    },
    placeholderStyle: {
        color: '#999',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
    },
    confirmButton: {
        backgroundColor: '#570376',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 15,
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    previewContainer: {
        width: 150,
        height: 150,
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
        width: 250,
    },
    buttonText: { color: '#fff', fontWeight: 'bold' },
});
