
import React, { createContext, useContext, useState, useCallback } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
    const [dataRegister, setDataRegister] = useState({});
    const [dataPValidate, setDataPValidate] = useState(false);
    
    const [dataVehicle, setDataVehicle] = useState({});
    const [dataCarValidate, setDataCarValidate] = useState(false);

    const register = useCallback((data) => {
        setDataRegister(data);
    }, []);

    return (
        <UserContext.Provider
            value={{ dataRegister, register, dataPValidate, setDataPValidate,
                dataVehicle, setDataVehicle, dataCarValidate, setDataCarValidate
             }}
        >
        {children}
        </UserContext.Provider>
    );

}

export const useRegister = () => useContext(UserContext);
export const useVehicle = () => useContext(UserContext);

