import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import axios from "axios";
import config from './config';

export const AuthContext = createContext();

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [authStatus, setAuthStatus] = useState("loading");

    const clearSession = useCallback(() => {
        setUser(null);
        setAuthStatus("unauthenticated");
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const response = await axios.get(`${config.serverUrl}/auth/validate-session`, {withCredentials: true});
            if (response.data.isAuthenticated && response.data.user) {
                const {password, ...safeUser} = response.data.user;
                setUser(safeUser);
                setAuthStatus("authenticated");
                return true;
            }
            clearSession();
            return false;
        } catch {
            clearSession();
            return false;
        }
    }, [clearSession]);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    return (
        <AuthContext.Provider value={{authStatus, setAuthStatus, user, refreshUser, clearSession}}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
