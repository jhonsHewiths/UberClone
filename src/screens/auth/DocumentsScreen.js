import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRegister } from '../../services/UserService'; 

export default function DocumentsScreen({ navigation }) {
  const { saveCompleteRegistration } = useRegister();
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    try {
      setLoading(true);
      const userId = await saveCompleteRegistration();
      
      Alert.alert("¡Éxito!", `Registro guardado correctamente con ID: ${userId}`);
    } catch (error) {
      Alert.alert("Error", "No se pudo completar el registro. Revisa tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        Paso Final: Confirmar Registro
      </Text>

      <TouchableOpacity 
        style={{ backgroundColor: '#570376', padding: 15, borderRadius: 8, alignItems: 'center' }}
        onPress={handleFinish}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Completar Registro</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}