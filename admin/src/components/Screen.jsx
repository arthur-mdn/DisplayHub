import React, { useState, useEffect } from 'react';
import Modal from "./Modal.jsx";
import EditScreenAttribute from "./EditScreenAttribute.jsx";
import IconManager from "./Settings/IconManager.jsx";
import MeteoViewer from "./MeteoViewer.jsx";
import DirectionsManager from "./Settings/DirectionsManager.jsx";
import PhotosManager from "./Settings/PhotosManager.jsx";
import {
    FaArrowRightArrowLeft, FaChevronRight, FaCircleHalfStroke,
    FaCopyright,
    FaHeading,
    FaIcons,
    FaImages, FaSun, FaTextWidth,
    FaUmbrella, FaUsers
} from "react-icons/fa6";
import { FaCogs, FaSignOutAlt } from "react-icons/fa";
import ConfigManager from "./Settings/ConfigManager.jsx";
import DarkModeManager from "./Settings/DarkModeManager.jsx";
import TimeIndicator from "./TimeIndicator.jsx";
import DelScreen from "./Settings/DelScreen.jsx";
import TextSlidesManager from "./Settings/TextSlidesManager.jsx";
import AllowedUsersManager from "./Settings/AllowedUsersManager.jsx";
import { useParams } from "react-router-dom";
import { useCookies } from "react-cookie";
import Loading from "./Loading.jsx";
import axios from "axios";
import config from "../config.js";

function Screen() {
    const { screenId } = useParams();
    const [screen, setScreen] = useState({});
    const [cookies, setCookie] = useCookies(['selectedScreen']);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [editNameOpen, setEditNameOpen] = useState(false);
    const [editLogoOpen, setEditLogoOpen] = useState(false);
    const [editIconsOpen, setEditIconsOpen] = useState(false);
    const [editMeteoOpen, setEditMeteoOpen] = useState(false);
    const [editDirectionsOpen, setEditDirectionsOpen] = useState(false);
    const [editPhotosOpen, setEditPhotosOpen] = useState(false);
    const [editDarkMode, setEditDarkMode] = useState(false);
    const [editTextSlidesOpen, setEditTextSlidesOpen] = useState(false);
    const [editAllowedUsersOpen, setEditAllowedUsersOpen] = useState(false);
    const [editSettingsOpen, setEditSettingsOpen] = useState(false);

    useEffect(() => {
        setCookie('selectedScreen', screenId, { path: '/', domain: config.cookieDomain });
    }, [screenId, setCookie]);

    const fetchScreenDetails = async () => {
        try {
            const response = await axios.get(`${config.serverUrl}/screens/${screenId}`, { withCredentials: true });
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

    const onScreenUpdate = (updatedScreen) => {
        setScreen(updatedScreen);
    };


    const buttons = [
        { id: "nom", label: "Nom de l'écran", icon: <FaHeading />, onClick: () => setEditNameOpen(true) },
        { id: "logo", label: "Logo", icon: <FaCopyright />, onClick: () => setEditLogoOpen(true) },
        { id: "icons", label: "Icônes", icon: <FaIcons />, onClick: () => setEditIconsOpen(true) },
        { id: "meteo", label: "Météo de ville", icon: <FaUmbrella />, onClick: () => setEditMeteoOpen(true) },
        { id: "directions", label: "Directions", icon: <FaArrowRightArrowLeft />, onClick: () => setEditDirectionsOpen(true) },
        { id: "photos", label: "Galerie de photos", icon: <FaImages />, onClick: () => setEditPhotosOpen(true) },
        { id: "dark_mode", label: "Mode sombre", icon: <FaSun />, onClick: () => setEditDarkMode(true) },
        { id: "text_slides", label: "Textes défilants", icon: <FaTextWidth />, onClick: () => setEditTextSlidesOpen(true) },
        { id: "allowed_users", label: "Utilisateurs autorisés", icon: <FaUsers />, onClick: () => setEditAllowedUsersOpen(true) },
        { id: "config", label: "Paramètres avancés", icon: <FaCogs />, onClick: () => setEditSettingsOpen(true) }
    ];

    let allowedButtons = []
    if (screen.permissions && screen.permissions.length > 0) {
        allowedButtons = buttons.filter(button => screen.permissions.includes(button.id) || screen.permissions.includes("creator"));
    }

    if (isLoading) {
        return <Loading />;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <>
            <div className={"screen-detail"}>
                <img src={`${screen.image}`}/>
                <div className={"fc ai-fs g0-25 h100"}>
                    <h3 className={"fw-b"}>
                        {screen.nom}
                    </h3>
                    <div className={`fr g0-5 ai-c`}>
                        <div className={`${screen.status}`}>
                        </div>
                        <span className={`${screen.status}`}>
                                        {screen.status === "online" ? "En ligne" : "Hors ligne"}
                                    </span>
                    </div>
                    <p style={{opacity: 0.4}}>
                        {screen._id}
                    </p>
                </div>
            </div>

            <div style={{height: '100%'}} className={"fc jc-sb"}>
                <div>
                    {allowedButtons.map((button) => (
                        <button
                            key={button.id}
                            type={"button"}
                            onClick={button.onClick}
                            className={"setting_element"}
                        >
                            <div className={"fr g1 ai-c"} style={{textAlign: "left"}}>
                                {button.icon}
                                {button.label}
                            </div>
                            <FaChevronRight style={{marginLeft: "auto"}}/>
                        </button>
                    ))}
                </div>

                <Modal isOpen={editNameOpen} title={"Modifier le nom"} onClose={() => {
                    setEditNameOpen(false)
                }}>
                    <EditScreenAttribute
                        screenId={screen._id}
                        attribute="nom"
                        value={screen.nom}
                        onSave={(screenObj) => {
                            onScreenUpdate(screenObj)
                        }}
                    />
                </Modal>
                <Modal isOpen={editLogoOpen} title={"Modifier le logo"} onClose={() => {
                    setEditLogoOpen(false)
                }}>
                    <EditScreenAttribute
                        screenId={screen._id}
                        attribute="logo"
                        value={screen.logo}
                        onSave={(screenObj) => {
                            onScreenUpdate(screenObj)
                        }}
                        inputType="file"
                    />
                </Modal>
                <Modal isOpen={editMeteoOpen} title={"Modifier la météo"} onClose={() => {
                    setEditMeteoOpen(false)
                }}>
                    <MeteoViewer screen={screen}/>
                    <EditScreenAttribute
                        screenId={screen._id}
                        attribute="meteo.city"
                        value={(screen.meteo && screen.meteo.weatherId) ? screen.meteo.data.name : ""}
                        onSave={(screenObj) => {
                            onScreenUpdate(screenObj)
                        }}
                    />
                </Modal>
                <Modal isOpen={editIconsOpen} title={"Modifier les icônes"} onClose={() => {
                    setEditIconsOpen(false)
                }} overflowY={true}>
                    <IconManager
                        screenId={screen._id}
                        initialIcons={screen.icons}
                        onIconsChange={(newConfig) => {
                            onScreenUpdate(newConfig)
                        }}
                    />
                </Modal>
                <Modal isOpen={editDirectionsOpen} title={"Modifier les directions"} onClose={() => {
                    setEditDirectionsOpen(false)
                }} overflowY={true}>
                    <DirectionsManager
                        screenId={screen._id}
                        initialDirections={screen.directions}
                        onDirectionsChange={(newConfig) => {
                            onScreenUpdate(newConfig)
                        }}
                    />
                </Modal>
                <Modal isOpen={editPhotosOpen} title={"Modifier les photos"} onClose={() => {
                    setEditPhotosOpen(false)
                }} overflowY={true}>
                    <PhotosManager
                        screenId={screen._id}
                        initialPhotos={screen.photos}
                        onPhotosChange={(newConfig) => {
                            onScreenUpdate(newConfig)
                        }}
                    />
                </Modal>
                <Modal isOpen={editSettingsOpen} title={"Modifier les paramètres avancés"} onClose={() => {
                    setEditSettingsOpen(false)
                }}>
                    <ConfigManager
                        screen={screen}
                        initialConfig={screen.config}
                        onConfigChange={(newConfig) => {
                            onScreenUpdate(newConfig)
                        }}
                        onRemoveScreenSelected={() => {
                            onRemoveScreenSelected()
                        }}
                    />
                </Modal>
                <Modal isOpen={editDarkMode} title={"Modifier le mode sombre"} onClose={() => {
                    setEditDarkMode(false)
                }}>
                    <TimeIndicator ranges={screen.dark_mode.ranges}/>
                    <DarkModeManager
                        screenId={screen._id}
                        initialDarkMode={screen.dark_mode}
                        onConfigChange={(newConfig) => {
                            onScreenUpdate(newConfig)
                        }}
                    />
                </Modal>
                <Modal isOpen={editTextSlidesOpen} title={"Modifier les textes défilants"} onClose={() => {
                    setEditTextSlidesOpen(false)
                }}>
                    <TimeIndicator ranges={screen.text_slides.ranges}/>
                    <TextSlidesManager
                        screenId={screen._id}
                        initialTextSlides={screen.text_slides}
                        onConfigChange={(newConfig) => {
                            onScreenUpdate(newConfig)
                        }}
                    />
                </Modal>
                <Modal isOpen={editAllowedUsersOpen} title={"Modifier les utilisateurs autorisés"} onClose={() => {
                    setEditAllowedUsersOpen(false)
                }}>
                    <AllowedUsersManager
                        screenId={screen._id}
                        initialAllowedUsers={screen.users}
                        onConfigChange={(newConfig) => {
                            onScreenUpdate(newConfig)
                        }}
                    />
                </Modal>
            </div>
        </>

    );
}

export default Screen;
