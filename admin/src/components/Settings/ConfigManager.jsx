import React, {useState} from 'react';
import axios from 'axios';
import config from '../../config';
import Loading from "../Loading.jsx";
import {toast} from "react-toastify";
import DelScreen from "./DelScreen.jsx";

function ConfigManager({ screen, initialConfig, onConfigChange, onRemoveScreenSelected }) {
    const [currentConfig, setCurrentConfig] = useState(initialConfig);
    const [isLoading, setIsLoading] = useState(false);
    const configToText = {
        "photos_interval": "Intervalle de changement des photos",
        "hide_slider_dots": "Masquer les points de navigation des photos",
        "meteo_corner": "Position du widget météo",
    }
    const meteoCornerLabels = {
        "top-left": "Haut gauche",
        "top-right": "Haut droite",
        "bottom-left": "Bas gauche",
        "bottom-right": "Bas droite",
    }
    const displayConfig = {
        photos_interval: 10,
        hide_slider_dots: false,
        meteo_corner: "top-left",
        ...currentConfig,
    }

    const handleInputChange = (key, value) => {
        const updatedConfig = { ...currentConfig, [key]: value };
        setCurrentConfig(updatedConfig);

        setIsLoading(true);
        axios.post(`${config.serverUrl}/screens/updateConfig`, { [key]: value }, {
            withCredentials: true
        })
            .then(response => {
                if (response.data.success) {
                    onConfigChange(response.data.screen);
                    toast.success(`${key} mis à jour avec succès !`);
                }
            })
            .catch(error => {
                console.error('Erreur lors de la mise à jour de la configuration :', error);
                toast.error(`Erreur lors de la mise à jour de ${key}`);
            })
            .finally(() => setIsLoading(false));
    };

    if (isLoading) return (
        <Loading/>
    );

    return (
        <div className={"p1"}>
            <div className={"fc g0-5"}>
                {Object.keys(displayConfig).map((key) => {
                    const value = displayConfig[key];

                    if (key === 'photos_interval') {
                        return (
                            <div key={key}>
                                <label htmlFor={key}>{configToText[key]} (1-60)</label>
                                <input
                                    type="range"
                                    id={key}
                                    min="1"
                                    max="60"
                                    value={value}
                                    onChange={(e) => setCurrentConfig({ ...currentConfig, [key]: parseInt(e.target.value) })}
                                    onMouseUp={(e) => handleInputChange(key, parseInt(e.target.value))}
                                    onTouchEnd={(e) => handleInputChange(key, parseInt(e.target.value))}
                                />
                                <span>{value}</span>
                            </div>
                        );
                    }

                    if (key === 'meteo_corner') {
                        return (
                            <div key={key} className="fc g0-5">
                                <label htmlFor={key}>{configToText[key]}</label>
                                <select
                                    id={key}
                                    value={value}
                                    onChange={(e) => handleInputChange(key, e.target.value)}
                                >
                                    {Object.entries(meteoCornerLabels).map(([cornerValue, label]) => (
                                        <option key={cornerValue} value={cornerValue}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        );
                    }

                    return (
                        <div key={key} className={typeof value === 'boolean' ? "fr g0-5" : "fc g0-5"}>
                            {typeof value === 'boolean' ? (
                                <>
                                    <input
                                        id={key}
                                        type="checkbox"
                                        checked={value}
                                        onChange={(e) => handleInputChange(key, e.target.checked)}
                                    />
                                    <label htmlFor={key}>{configToText[key] || key}</label>
                                </>

                            ) : (
                                <>
                                    <label htmlFor={key}>{configToText[key] || key}</label>
                                    <input
                                        id={key}
                                        type="text"
                                        value={value}
                                        onChange={(e) => handleInputChange(key, e.target.value)}
                                    />
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
            <div>
                <label>Exporter la config</label>
                <textarea value={JSON.stringify(screen)} readOnly={true} style={{width:"100%",resize:"vertical",minHeight:"60px",maxHeight:"200px"}}/>
            </div>
            <div style={{marginTop:"auto"}}>
                <DelScreen onRemoveScreenSelected={()=>{onRemoveScreenSelected()}}/>
            </div>
        </div>
    );
}

export default ConfigManager;
