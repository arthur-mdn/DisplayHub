import React, {useEffect, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import axios from 'axios';
import {useAuth} from '../AuthContext';
import config from '../config';
import {useCookies} from "react-cookie";

function Login() {
    const { screenId } = useParams();
    const { refreshUser } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [cookies, setCookie, removeCookie] = useCookies(['pendingScreenId']);

    useEffect(() => {
        if (screenId) {
            setCookie('pendingScreenId', screenId, { path: '/' });
        }
    });

    const login = (email, password) => {
        axios.post(`${config.serverUrl}/auth/login`, { email, password }, { withCredentials: true })
            .then(() => refreshUser())
            .catch(error => {
                if (error.response) {
                    setErrorMessage(error.response.data.message || 'Erreur de connexion');
                } else {
                    setErrorMessage('Erreur de connexion');
                }
            });
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setErrorMessage('');
        login(email, password);
    };

    return (
        <form onSubmit={handleSubmit} className={"form"} id={"login_form"}>
            <img src={"/elements/logo.svg"} style={{height:'4rem'}} alt={"DisplayHub_logo"}/>
            <h2>Connexion</h2>
            {errorMessage && <div style={{color:"red",fontWeight:"bold"}}>{errorMessage}</div>}
            <div className={"input_container"}>
                <label htmlFor="email">Email</label>
                <input
                    id={"email"}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div className={"input_container"}>
                <label htmlFor="password">Mot de passe</label>
                <input
                    id={"password"}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>

            <Link to={"/mot-de-passe-oublie"} type={"button"} className={"w100 ta-r forgot_password_button"}>Mot de passe oublié ?</Link>
            <button type="submit" className={"w100"}>Connexion</button>
            <p className={"w100 ta-l"}>Vous n'avez pas de compte ?</p>
            <Link to={'/register'} className={"force_button_style sub_button"}>Créer un compte</Link>
        </form>
    );

}

export default Login;
