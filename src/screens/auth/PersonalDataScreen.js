import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TextInput, Text, KeyboardAvoidingView, Platform } from 'react-native';

import { useRegister } from '../../services/UserService';

export default function FormPersonalData() {
    const { dataRegister, register, setDataPValidate} = useRegister();

    const [formData, setFormData] = useState({
        photo: dataRegister.photo || '',
        name: dataRegister.name || '',
        idNumber: dataRegister.idNumber || '',
        phone: dataRegister.phone || '',
        birthdate: dataRegister.birthdate || '',
        gender: dataRegister.gender || '',
        email: dataRegister.email || '',
        language: dataRegister.language || '',
    });

    const [errors, setErrors] = useState({});

    const handleChange = (field, value) => {
        setFormData(prev => ({
        ...prev,
        [field]: value,
        }));
    };

    const isFormValid =
        formData.name.trim() !== '' &&
        formData.idNumber.trim() !== '' &&
        formData.phone.trim() !== '' &&
        formData.birthdate.trim() !== '' &&
        formData.gender.trim() !== '' &&
        formData.email.trim() !== '' &&
        formData.language.trim() !== '' &&
        Object.keys(errors).length === 0;

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

        {[
            ['name', 'Nombre'],
            ['idNumber', 'Identificación'],
            ['phone', 'Teléfono'],
            ['birthdate', 'Fecha de nacimiento'],
            ['gender', 'Género'],
            ['email', 'Correo electrónico'],
            ['language', 'Idioma'],
            ].map(([field, label]) => (
            <TextInput
                key={field}
                style={styles.input}
                placeholder={label}
                value={formData[field]}
                onChangeText={(value) => handleChange(field, value)}
            />
        ))}

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
  message: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
  },
});
