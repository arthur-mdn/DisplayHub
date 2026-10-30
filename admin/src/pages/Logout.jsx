import {useEffect} from 'react';
import axios from 'axios';
import {useAuth} from "../AuthContext.jsx";
import config from "../config.js";
import {useCookies} from "react-cookie";

function Logout() {
    const { clearSession } = useAuth();
    const [cookies, setCookie, removeCookie] = useCookies(['selectedScreen', 'pendingScreenId']);
    const logout = async () => {
        await axios.post(`${config.serverUrl}/auth/logout`, {}, {withCredentials: true})
            .then(() => {
                clearSession();
                removeCookie('selectedScreen', { path: '/' });
                removeCookie('pendingScreenId', { path: '/' });
            })
            .catch(error => {
                console.error('Erreur de déconnexion:', error);
                clearSession();
            });
    };

    useEffect(() => {
        logout();
    }, []);

}

export default Logout;
