import React, {createContext, useContext, useEffect, useState} from 'react';
import {io} from 'socket.io-client';
import config from './config';
import {useAuth} from './AuthContext.jsx';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({children}) => {
    const {authStatus, clearSession} = useAuth();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (authStatus !== 'authenticated') {
            setSocket((current) => {
                current?.disconnect();
                return null;
            });
            return undefined;
        }

        const socketInstance = io(config.serverUrl, {
            reconnectionAttempts: 1500,
            reconnectionDelay: 1000,
            withCredentials: true,
        });

        const onSessionRevoked = () => {
            clearSession();
        };

        socketInstance.on('session_revoked', onSessionRevoked);
        setSocket(socketInstance);

        return () => {
            socketInstance.off('session_revoked', onSessionRevoked);
            socketInstance.disconnect();
        };
    }, [authStatus, clearSession]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
