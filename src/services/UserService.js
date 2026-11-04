import React, { createContext, useContext, useState, useCallback } from 'react';
import { db } from '../config/Firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadImageToFirebase } from '../services/StorageService';

const UserContext = createContext(null);

export function UserProvider({ children }) {
    const [dataRegister, setDataRegister] = useState({});
    const [dataPValidate, setDataPValidate] = useState(false);

    const [showPersonalErrors, setShowPersonalErrors] = useState(false);
    const [showVehicleErrors, setShowVehicleErrors] = useState(false);

    const [dataVehicle, setDataVehicle] = useState({});
    const [dataCarValidate, setDataCarValidate] = useState(false);

    const register = useCallback((data) => {
        setDataRegister(data);
    }, []);

    const registerVehicle = useCallback((data) => {
        setDataVehicle(data);
    }, []);

    const saveCompleteRegistration = async () => {
        try {
            const profileUri = dataRegister?.photoUri || '';
            const vehicleUri = dataVehicle?.photoUri || '';

            const profilePhotoUrl = await uploadImageToFirebase(profileUri, 'profiles');
            const vehiclePhotoUrl = await uploadImageToFirebase(vehicleUri, 'vehicles');

            const rawData = {
                personal: {
                    ...dataRegister,
                    photoUri: profilePhotoUrl || '',
                },
                vehicle: {
                    ...dataVehicle,
                    photoUri: vehiclePhotoUrl || '',
                },
                createdAt: serverTimestamp(),
            };

            const cleanObject = (obj) => {
                return Object.fromEntries(
                    Object.entries(obj).map(([key, value]) => {
                        if (value && typeof value === 'object') {
                            return [key, cleanObject(value)];
                        }
                        return [key, value === undefined ? '' : value];
                    })
                );
            };

            const completeData = cleanObject(rawData);

            const docRef = await addDoc(collection(db, 'users'), completeData);
            return docRef.id;
        } catch (error) {
            console.error("Error al completar el registro en Firebase:", error);
            throw error;
        }
    };

    return (
        <UserContext.Provider
            value={{ 
                dataRegister, register, 
                dataPValidate, setDataPValidate, 
                showPersonalErrors, setShowPersonalErrors, 
                showVehicleErrors, setShowVehicleErrors, 
                dataVehicle, registerVehicle,
                dataCarValidate, setDataCarValidate,
                saveCompleteRegistration
           }}
        >
        {children}
        </UserContext.Provider>
    );
}

export const useRegister = () => useContext(UserContext);
export const useVehicle = () => useContext(UserContext);