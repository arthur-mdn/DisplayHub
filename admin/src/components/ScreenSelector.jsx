import React, {useEffect, useState} from 'react';
import axios from "axios";
import config from "../config.js";
import {useCookies} from "react-cookie";
import {toast} from "react-toastify";
import {Link} from "react-router-dom";
import {useSocket} from "../SocketContext.jsx";
import {MonitorSmartphone, MonitorX} from "lucide-react";
import DisplayImage from "./DisplayImage.jsx";

function ScreenSelector({onSelectScreen}) {
    const [cookies, setCookie] = useCookies(['selectedScreen']);
    const [screens, setScreens] = useState([]);
    const selectedScreenId = cookies.selectedScreen;
    const [isLoading, setIsLoading] = useState(false);
    const socket = useSocket();

    useEffect(() => {
        setIsLoading(true);
        axios.get(`${config.serverUrl}/screens`, {withCredentials: true})
            .then(response => {
                setScreens(response.data.screens);
            })
            .catch(error => {
                console.log(error || 'Erreur lors de la récupération des écrans');
                toast.error("Erreur lors de la récupération des écrans.");
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    useEffect(() => {
        if (socket) {
            socket.on('screen_status', (updatedScreen) => {
                setScreens((prevScreens) =>
                    prevScreens.map((screen) =>
                        screen._id === updatedScreen.screenId ? {...screen, status: updatedScreen.status} : screen
                    )
                );
            });

            socket.on('disconnect', () => {
                setScreens((prevScreens) =>
                    prevScreens.map((screen) =>
                        screen.status === "online" ? {...screen, status: "offline"} : screen
                    )
                );
            });

            return () => {
                socket.off('screen_status');
            };
        }
    }, [socket]);

    if (isLoading) return <div style={{padding: "1rem", height: '100%'}} className={"fc jc-sb"}>
        <div className={"fc g0-5 w100"}>
            {[1, 2, 3].map((i) => (
                <div key={i} className={"skeleton-screen"}>
                    <div className={"skeleton-screen-img"}/>
                    <div className={"fc ai-fs g0-75 h100 w100"}>
                        <div className={"skeleton-screen-title"}></div>
                        <div className={`fr g0-5 ai-c w100`}>
                            <div className={`skeleton-screen-status-bubble`}></div>
                            <div className={`skeleton-screen-status-bar`}></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>;

    return (
        <>
            <div style={{padding: "1rem", height: '100%'}} className={"fc jc-sb"}>
                <div className={"fc g0-75"}>
                    {screens.map(screen => (
                        <Link to={`/screens/list/${screen._id}`} key={screen._id} className={"screen"}>
                            <div className={"img-container"}>
                                <DisplayImage image={screen.featured_image}/>
                            </div>
                            <div className={"screen__meta"}>
                                <h3 className={"fw-b"}>
                                    {screen.name}
                                </h3>
                                <div className={`screen__status fr g0-5 ai-c`}>
                                    <div className={`${screen.status} status-bubble`}/>
                                    <span className={`${screen.status}`}>
                                        {screen.status === "online" ? "En ligne" : "Hors ligne"}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {(screens.length === 0) && <div className={"fc jc-c ai-c g1"} style={{height: '100%'}}>
                        <MonitorX size={86} style={{opacity: 0.4}}/>
                        <h2 style={{opacity: 0.4}}>Aucun écran</h2>
                        <br/>
                        <Link to={"/screens/add"} className={`w100 setting-button fr g0-5 ai-c`}>
                            <MonitorSmartphone size={24}/>
                            <h4>Associer un nouvel écran</h4>
                        </Link>
                    </div>}
                </div>
            </div>
        </>

    );
}

export default ScreenSelector;
