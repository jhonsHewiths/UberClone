import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { db } from '../config/Firebase';
import { collection, addDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { uploadImageToFirebase } from '../services/StorageService';

const UserContext = createContext(null);

export function UserProvider({ children }) {
    const [dataRegister, setDataRegister] = useState({});
    const [dataPValidate, setDataPValidate] = useState(false);
    const [showPersonalErrors, setShowPersonalErrors] = useState(false);

    const [dataVehicle, setDataVehicle] = useState({});
    const [dataCarValidate, setDataCarValidate] = useState(false);
    const [showVehicleErrors, setShowVehicleErrors] = useState(false);

    const [dataDocument, setDataDocument] = useState({});
    const [dataDocumentValidate, setDataDocumentValidate] = useState(false);

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [accountStatus, setAccountStatus] = useState('No Disponible'); 
    const [userDocumentId, setUserDocumentId] = useState(null);

    useEffect(() => {
        if (!userDocumentId) return undefined;

        return onSnapshot(
            doc(db, 'users', userDocumentId),
            (snapshot) => {
                if (!snapshot.exists()) return;

                const userData = snapshot.data();
                const status = userData.document?.statusAccount ?? userData.statusAccount;
                if (typeof status === 'string') setAccountStatus(status);
            },
            (error) => {
                console.error('Error al sincronizar el estado de la cuenta:', error);
            }
        );
    }, [userDocumentId]);

    const register = useCallback((data) => {
        setDataRegister(data);
    }, []);

    const registerVehicle = useCallback((data) => {
        setDataVehicle(data);
    }, []);

    const registerDocument = useCallback((data) => {
        setDataDocument(data);
    }, []);

    const saveCompleteRegistration = async ({
        personalData = dataRegister,
        vehicleData = dataVehicle,
        documentData = dataDocument,
    } = {}) => {
        try {
            if (!dataPValidate || !dataCarValidate) {
                throw new Error('Los datos personales y del vehículo deben ser válidos antes de guardar.');
            }

            const profileUri = personalData?.photoUri || '';
            const vehicleUri = vehicleData?.photoUri || '';
            const documentUri = documentData?.photoUri || '';
            const soatUri = documentData?.photoSOAT || '';
            const rtUri = documentData?.photoRT || '';

            const profilePhotoUrl = await uploadImageToFirebase(profileUri, 'profiles');
            const vehiclePhotoUrl = await uploadImageToFirebase(vehicleUri, 'vehicles');
            const documentPhotoUrl = await uploadImageToFirebase(documentUri, 'documents');
            const soatPhotoUrl = await uploadImageToFirebase(soatUri, 'documents');
            const rtPhotoUrl = await uploadImageToFirebase(rtUri, 'documents');

            const cleanObject = (obj) => Object.fromEntries(
                Object.entries(obj).filter(([, value]) => value !== undefined)
            );

            const completeData = {
                personal: {
                    ...cleanObject(personalData),
                    photoUri: profilePhotoUrl || '',
                },
                vehicle: {
                    ...cleanObject(vehicleData),
                    photoUri: vehiclePhotoUrl || '',
                },
                document: {
                    ...cleanObject(documentData),
                    photoUri: documentPhotoUrl || '',
                    photoSOAT: soatPhotoUrl || '',
                    photoRT: rtPhotoUrl || '',
                    statusAccount: 'No Disponible'
                },
                createdAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'users'), completeData);
            setUserDocumentId(docRef.id);
            setIsSubmitted(true);
            setAccountStatus('No Disponible');
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
                dataDocument, registerDocument, 
                setDataDocument,
                dataDocumentValidate, setDataDocumentValidate,
                isSubmitted, setIsSubmitted,
                accountStatus, setAccountStatus,
                saveCompleteRegistration
           }}
        >
        {children}
        </UserContext.Provider>
    );
}

export const useRegister = () => useContext(UserContext);
export const useVehicle = () => useContext(UserContext);
export const useDocument = () => useContext(UserContext);