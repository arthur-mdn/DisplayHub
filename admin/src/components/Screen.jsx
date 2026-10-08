// Screen.jsx
import React, {useEffect, useState} from 'react';
import EditScreenAttribute from "./EditScreenAttribute.jsx";
import IconManager from "./Settings/IconManager.jsx";
import DirectionsManager from "./Settings/DirectionsManager.jsx";
import PhotosManager from "./Settings/PhotosManager.jsx";
import {FaArrowRightArrowLeft, FaChevronRight, FaCopyright, FaGamepad, FaIcons, FaImages, FaSun, FaTag, FaTextWidth, FaUmbrella, FaUsers} from "react-icons/fa6";
import {FaCogs} from "react-icons/fa";
import ConfigManager from "./Settings/ConfigManager.jsx";
import DarkModeManager from "./Settings/DarkModeManager.jsx";
import TimeIndicator from "./TimeIndicator.jsx";
import TextSlidesManager from "./Settings/TextSlidesManager.jsx";
import AllowedUsersManager from "./Settings/AllowedUsersManager.jsx";
import {Link, Route, Routes, useParams} from "react-router-dom";
import {useCookies} from "react-cookie";
import axios from "axios";
import config from "../config.js";
import FeaturedImage from "./Settings/FeaturedImage.jsx";
import {useSocket} from '../SocketContext.jsx';
import Control from "./Settings/Control.jsx";

function Screen() {
    const {screenId} = useParams();
    const [screen, setScreen] = useState({});
    const [cookies, setCookie] = useCookies(['selectedScreen']);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const socket = useSocket();

    useEffect(() => {
        setCookie('selectedScreen', screenId, {path: '/', domain: config.cookieDomain});
    }, [screenId, setCookie]);

    const fetchScreenDetails = async () => {
        try {
            const response = await axios.get(`${config.serverUrl}/screens/${screenId}`, {withCredentials: true});
            if (response.status === 404) {
                throw new Error("Screen not found");
            } else {
                return response.data.screenObj;
            }
        } catch (error) {
            console.error("Error fetching screen details:", error);
            throw error;
        }
    };

    useEffect(() => {
        const loadScreenDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const screenObj = await fetchScreenDetails();
                setScreen(screenObj);
            } catch (error) {
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        loadScreenDetails();
    }, [screenId]);

    useEffect(() => {
        if (socket) {
            console.log("Socket is connected");
            socket.on('screen_status', (updatedScreen) => {
                if (String(updatedScreen.screenId) === String(screenId)) {
                    setScreen((prevScreen) => ({...prevScreen, status: updatedScreen.status}));
                }
            });

            return () => {
                socket.off('screen_status');
            };
        }
    }, [socket, screenId]);


    const onScreenUpdate = (updatedScreen) => {
        setScreen(updatedScreen);
    };

    const buttons = [
        {id: "name", label: "Nom de l'écran", icon: <FaTag/>},
        {id: "logo", label: "Logo", icon: <FaCopyright/>},
        {id: "icons", label: "Icônes", icon: <FaIcons/>},
        {id: "meteo", label: "Météo de ville", icon: <FaUmbrella/>},
        {id: "directions", label: "Directions", icon: <FaArrowRightArrowLeft/>},
        {id: "photos", label: "Galerie de photos", icon: <FaImages/>},
        {id: "dark_mode", label: "Mode sombre", icon: <FaSun/>},
        {id: "text_slides", label: "Textes défilants", icon: <FaTextWidth/>},
        {id: "allowed_users", label: "Utilisateurs autorisés", icon: <FaUsers/>},
        {id: "control", label: "Contrôle", icon: <FaGamepad/>},
        {id: "avanced_settings", label: "Paramètres avancés", icon: <FaCogs/>}
    ];

    let allowedButtons = [];
    if (screen.permissions && screen.permissions.length > 0) {
        allowedButtons = buttons.filter(button => screen.permissions.includes(button.id) || screen.permissions.includes("creator"));
    }

    if (isLoading) {
        return <div className={"fc"}>
            <div className={"skeleton-screen b0"}>
                <div className={"skeleton-screen-img"}/>
                <div className={"fc ai-fs g0-75 h100 w100"}>
                    <div className={"skeleton-screen-title"}></div>
                    <div className={`fr g0-5 ai-c w100`}>
                        <div className={`skeleton-screen-status-bubble`}></div>
                        <div className={`skeleton-screen-status-bar`}></div>
                    </div>
                </div>
            </div>
            {buttons.map((button) => (
                <div key={button.id} className={"setting_element g1 ai-c jc-c cna"}>
                    <div className={"skeleton-screen-status-bubble"}></div>
                    <div className={"skeleton-screen-status-bar"}></div>
                    <div className={"h1-5"}></div>
                </div>
            ))}
        </div>
    }

    if (error) {
        return <div>Error: {error}</div>;
    }
    return (
        <>
            <Routes>
                <Route path="/name" element={<EditScreenAttribute
                    screenId={screen._id}
                    attribute={"name"}
                    value={screen.name}
                    onSave={(screenObj) => {
                        onScreenUpdate(screenObj)
                    }}
                />}/>
                <Route path="/logo" element={<EditScreenAttribute
                    screenId={screen._id}
                    attribute="logo"
                    value={screen.logo}
                    onSave={(screenObj) => {
                        onScreenUpdate(screenObj)
                    }}
                    inputType="file"
                />}/>
                <Route path="/icons" element={<IconManager
                    screenId={screen._id}
                    initialIcons={screen.icons}
                    onIconsChange={(newConfig) => {
                        onScreenUpdate(newConfig)
                    }}
                />}/>
                <Route path="/meteo" element={<>
                    <EditScreenAttribute
                        screen={screen}
                        screenId={screen._id}
                        attribute="meteo.city"
                        value={(screen.meteo && screen.meteo.weatherId) ? screen.meteo.data.name : ""}
                        onSave={(screenObj) => {
                            onScreenUpdate(screenObj)
                        }}
                    />
                </>}/>
                <Route path="/directions" element={<DirectionsManager
                    screenId={screen._id}
                    initialDirections={screen.directions}
                    onDirectionsChange={(newConfig) => {
                        onScreenUpdate(newConfig)
                    }}
                />}/>
                <Route path="/photos" element={<PhotosManager
                    screenId={screen._id}
                    initialPhotos={screen.photos}
                    onPhotosChange={(newConfig) => {
                        onScreenUpdate(newConfig)
                    }}
                />}/>
                <Route path="/dark_mode" element={<>
                    <TimeIndicator ranges={screen.dark_mode.ranges}/>
                    <DarkModeManager
                        screenId={screen._id}
                        initialDarkMode={screen.dark_mode}
                        onConfigChange={(newConfig) => {
                            onScreenUpdate(newConfig)
                        }}
                    />
                </>}/>
                <Route path="/text_slides" element={<>
                    <TimeIndicator ranges={screen.text_slides.ranges}/>
                    <TextSlidesManager
                        screenId={screen._id}
                        initialTextSlides={screen.text_slides}
                        onConfigChange={(newConfig) => {
                            onScreenUpdate(newConfig)
                        }}
                    />
                </>}/>
                <Route path="/allowed_users" element={<AllowedUsersManager
                    screenId={screen._id}
                    initialAllowedUsers={screen.users}
                    onConfigChange={(newConfig) => {
                        onScreenUpdate(newConfig)
                    }}
                />}/>
                <Route path="/control" element={<Control
                    screen={screen}
                />}/>
                <Route path="/avanced_settings" element={<ConfigManager
                    screen={screen}
                    initialConfig={screen.config}
                    onConfigChange={(newConfig) => {
                        onScreenUpdate(newConfig)
                    }}
                    onRemoveScreenSelected={() => {
                        setScreen(null);
                    }}
                />}/>
                <Route path="*" element={<>
                    <div className={"screen-detail screen b0"}>
                        <div className={"img-container"}>
                            <FeaturedImage permissions={screen.permissions} featured_image={screen.featured_image}
                                           onSave={(screenObj) => {
                                               onScreenUpdate(screenObj)
                                           }}/>
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
                    </div>

                    <div className={"fc jc-sb"}>
                        <div>
                            {allowedButtons.map((button) => (
                                <Link
                                    key={button.id}
                                    to={button.id}
                                    className={"setting_element"}
                                >
                                    <div className={"fr g1 ai-c"} style={{textAlign: "left"}}>
                                        <div className={"skeleton-status-bubble fr ai-c"}>
                                            {button.icon}
                                        </div>
                                        <div className={"skeleton-title fr ai-c"}>
                                            {button.label}
                                        </div>
                                    </div>
                                    <FaChevronRight style={{marginLeft: "auto"}}/>
                                </Link>
                            ))}
                        </div>
                    </div>
                </>}/>
            </Routes>
        </>
    );
}

export default Screen;
