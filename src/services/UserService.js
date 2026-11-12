import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { db } from '../config/Firebase';
import { collection, addDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { uploadImageToFirebase } from '../services/StorageService';
import { calculateFare } from '../utils/calculateFare';

const UserContext = createContext(null);

const medCenter = { latitude: 6.2442, longitude: -75.5812 };
const medData = {
    minLatitude: 6.15,
    maxLatitude: 6.35,
    minLongitude: -75.68,
    maxLongitude: -75.48,
};  
const medDestinations = [
    { name: 'Parque Lleras', latitude: 6.2088, longitude: -75.5675 },
    { name: 'Plaza Botero', latitude: 6.2518, longitude: -75.5636 },
    { name: 'Estadio Atanasio Girardot', latitude: 6.2561, longitude: -75.5905 },
    { name: 'Jardín Botánico', latitude: 6.2706, longitude: -75.5639 },
    { name: 'Terminal del Norte', latitude: 6.2854, longitude: -75.5686 },
    { name: 'Pueblito Paisa', latitude: 6.2344, longitude: -75.5764 },
];

const isInMedellin = (location) => (
    location
    && location.latitude >= medData.minLatitude
    && location.latitude <= medData.maxLatitude
    && location.longitude >= medData.minLongitude
    && location.longitude <= medData.maxLongitude
);

const getDistanceKm = (start, end) => {
    const toRadians = (degrees) => degrees * Math.PI / 180;
    const latitudeDifference = toRadians(end.latitude - start.latitude);
    const longitudeDifference = toRadians(end.longitude - start.longitude);
    const startLatitude = toRadians(start.latitude);
    const endLatitude = toRadians(end.latitude);
    const value = Math.sin(latitudeDifference / 2) ** 2
        + Math.cos(startLatitude) * Math.cos(endLatitude)
        * Math.sin(longitudeDifference / 2) ** 2;

    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

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
    const [isLoggedOut, setIsLoggedOut] = useState(false);
    const [accountStatus, setAccountStatus] = useState('No Disponible');
    const [userDocumentId, setUserDocumentId] = useState(null);
    const [isApproved, setIsApproved] = useState(false);
    const [driverLocation, setDriverLocation] = useState(null);
    const driverLocationRef = React.useRef(null);
    const [pendingRequest, setPendingRequest] = useState(null);
    const [activeTrip, setActiveTrip] = useState(null);
    const [completedTrip, setCompletedTrip] = useState(null);
    const [tripHistory, setTripHistory] = useState([]);
    const [requestMessage, setRequestMessage] = useState('');
    const RequestNumber = React.useRef(0);

    useEffect(() => {
        if (!userDocumentId) return undefined;

        return onSnapshot(
            doc(db, 'users', userDocumentId),
            (snapshot) => {
                if (!snapshot.exists()) return;

                const userData = snapshot.data();
                const status = userData.document?.statusAccount ?? userData.statusAccount;
                if (typeof status === 'string') {
                    setAccountStatus(status);
                    if (status.trim().toLowerCase() === 'disponible') {
                        setIsApproved(true);
                    }
                }
            },
            (error) => {
                console.error('Error al sincronizar el estado de la cuenta:', error);
            }
        );
    }, [userDocumentId]);

    useEffect(() => {
        if (!userDocumentId) return undefined;

        return onSnapshot(
            collection(db, 'users', userDocumentId, 'trips'),
            (snapshot) => {
                const trips = snapshot.docs.map((tripDoc) => {
                    const trip = tripDoc.data();
                    const completedAt = trip.completedAt?.toDate
                        ? trip.completedAt.toDate().getTime()
                        : Date.now();
                    return {
                        ...trip,
                        id: tripDoc.id,
                        firestoreId: tripDoc.id,
                        completedAt,
                    };
                });
                setTripHistory(trips.sort((first, second) => second.completedAt - first.completedAt));
            },
            (error) => {
                console.error('Error al sincronizar los viajes:', error);
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

    const updateDriverProfile = useCallback(async (profileData) => {
        if (!userDocumentId) {
            throw new Error('No se pudo actualizar el perfil del conductor.');
        }

        const updatedFields = {};
        Object.entries(profileData).forEach(([section, values]) => {
            Object.entries(values).forEach(([field, value]) => {
                if (!field.startsWith('photo') && field !== 'statusAccount' && value !== undefined) {
                    updatedFields[`${section}.${field}`] = value;
                }
            });
        });

        await updateDoc(doc(db, 'users', userDocumentId), {
            ...updatedFields,
            profileUpdatedAt: serverTimestamp(),
        });

        setDataRegister(profileData.personal);
        setDataVehicle(profileData.vehicle);
        setDataDocument(profileData.document);
    }, [userDocumentId]);

    const logoutDriver = useCallback(() => {
        setDataRegister({});
        setDataVehicle({});
        setDataDocument({});
        setDataPValidate(false);
        setShowPersonalErrors(false);
        setDataCarValidate(false);
        setShowVehicleErrors(false);
        setDataDocumentValidate(false);
        setIsSubmitted(false);
        setAccountStatus('No Disponible');
        setUserDocumentId(null);
        setIsApproved(false);
        setDriverLocation(null);
        driverLocationRef.current = null;
        setPendingRequest(null);
        setActiveTrip(null);
        setCompletedTrip(null);
        setTripHistory([]);
        setRequestMessage('');
        setIsLoggedOut(true);
    }, []);

    const setDriverAvailability = useCallback(async (status) => {
        if (!userDocumentId || !isApproved) {
            throw new Error('No se pudo actualizar el estado del conductor.');
        }

        await updateDoc(doc(db, 'users', userDocumentId), {
            'document.statusAccount': status,
            availabilityUpdatedAt: serverTimestamp(),
        });
        setAccountStatus(status);
        if (status !== 'Disponible') {
            setPendingRequest(null);
            setRequestMessage('');
        }
    }, [isApproved, userDocumentId]);

    const updateDriverLocation = useCallback(async (location) => {
        if (!userDocumentId) {
            throw new Error('No se pudo guardar la ubicación del conductor.');
        }

        await updateDoc(doc(db, 'users', userDocumentId), {
            location: {
                latitude: location.latitude,
                longitude: location.longitude,
                heading: location.heading ?? null,
                speed: location.speed ?? null,
            },
            locationUpdatedAt: serverTimestamp(),
        });
        setDriverLocation(location);
        driverLocationRef.current = location;
    }, [userDocumentId]);

    const createMockRequest = useCallback(() => {
        const reportedLocation = driverLocationRef.current;
        const start = isInMedellin(reportedLocation)
            ? {
                latitude: reportedLocation.latitude,
                longitude: reportedLocation.longitude,
            }
            : medCenter;
        const pickupOffsets = [
            { latitude: 0.0015, longitude: 0.0015 },
            { latitude: -0.0012, longitude: 0.0018 },
            { latitude: 0.0011, longitude: -0.0017 },
        ];
        const offset = pickupOffsets[RequestNumber.current % pickupOffsets.length];
        const pickup = {
            latitude: Math.max(
                medData.minLatitude,
                Math.min(medData.maxLatitude, start.latitude + offset.latitude)
            ),
            longitude: Math.max(
                medData.minLongitude,
                Math.min(medData.maxLongitude, start.longitude + offset.longitude)
            ),
        };
        const nearbyDestinations = medDestinations
            .filter((destination) => getDistanceKm(pickup, destination) > 1)
            .sort((first, second) => (
                getDistanceKm(pickup, first) - getDistanceKm(pickup, second)
            ));
        const destination = nearbyDestinations[
            RequestNumber.current % Math.min(3, nearbyDestinations.length)
        ] || medDestinations[0];
        const dropoff = {
            latitude: destination.latitude,
            longitude: destination.longitude,
        };
        const distanceKm = Math.max(
            1,
            Math.round(getDistanceKm(pickup, dropoff) * 1.35 * 10) / 10
        );
        const durationMin = Math.max(5, Math.round(distanceKm * 2.5));
        const categories = ['Económico', 'XL', 'Premium'];
        const category = categories[RequestNumber.current % categories.length];
        const paymentMethod = RequestNumber.current % 2 === 0 ? 'Tarjeta' : 'Efectivo';
        const fare = calculateFare({
            distanceKm,
            durationMin,
            category,
        });

        RequestNumber.current += 1;
        setRequestMessage('');
        setPendingRequest({
            origin: isInMedellin(reportedLocation)
                ? 'Cerca de tu ubicación actual'
                : 'Cerca del centro de Medellín',
            destination: destination.name,
            pickup,
            dropoff,
            distanceKm,
            durationMin,
            ...fare,
            id: `mock-${Date.now()}`,
            category,
            paymentMethod,
            requestedAt: Date.now(),
            isSimulated: true,
        });
    }, []);

    const acceptMockRequest = useCallback(() => {
        if (!pendingRequest) return;

        setActiveTrip({
            ...pendingRequest,
            status: 'accepted',
            stage: 'pickup',
            acceptedAt: Date.now(),
        });
        setPendingRequest(null);
        setRequestMessage('');
    }, [pendingRequest]);

    const rejectMockRequest = useCallback((expired = false) => {
        setPendingRequest(null);
        setRequestMessage(
            expired
                ? 'Se agotó el tiempo.'
                : 'Solicitud rechazada.'
        );
    }, []);

    const markPassengerOnboard = useCallback(() => {
        setActiveTrip((trip) => (
            trip ? { ...trip, status: 'in_progress', stage: 'destination' } : trip
        ));
    }, []);

    const finishMockTrip = useCallback(async () => {
        if (!activeTrip || !userDocumentId) {
            throw new Error('No se pudo guardar el viaje.');
        }

        const tripData = {
            ...activeTrip,
            status: 'completed',
            paymentStatus: 'Pendiente',
            completedAt: Date.now(),
            isSimulated: true,
        };
        const tripRef = await addDoc(
            collection(db, 'users', userDocumentId, 'trips'),
            {
                ...tripData,
                completedAt: serverTimestamp(),
            }
        );
        const savedTrip = { ...tripData, id: tripRef.id, firestoreId: tripRef.id };

        setActiveTrip(null);
        setCompletedTrip(savedTrip);
    }, [activeTrip, userDocumentId]);

    const resolveMockPayment = useCallback(async (paymentStatus) => {
        if (!completedTrip?.firestoreId || !userDocumentId) {
            throw new Error('No se pudo actualizar el pago del viaje.');
        }

        await updateDoc(
            doc(db, 'users', userDocumentId, 'trips', completedTrip.firestoreId),
            { paymentStatus, paymentUpdatedAt: serverTimestamp() }
        );
        setCompletedTrip((trip) => ({ ...trip, paymentStatus }));
        setTripHistory((trips) => trips.map((trip) => (
            trip.firestoreId === completedTrip.firestoreId
                ? { ...trip, paymentStatus }
                : trip
        )));
    }, [completedTrip, userDocumentId]);

    const dismissCompletedTrip = useCallback(() => {
        setCompletedTrip(null);
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
            setIsLoggedOut(false);
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
                isLoggedOut,
                accountStatus, setAccountStatus,
                isApproved,
                setDriverAvailability,
                updateDriverProfile,
                logoutDriver,
                updateDriverLocation,
                driverLocation,
                pendingRequest,
                activeTrip,
                completedTrip,
                tripHistory,
                requestMessage,
                createMockRequest,
                acceptMockRequest,
                rejectMockRequest,
                markPassengerOnboard,
                finishMockTrip,
                resolveMockPayment,
                dismissCompletedTrip,
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