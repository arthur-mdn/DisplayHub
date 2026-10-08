import React, {useEffect, useState} from 'react';
import axios from "axios";
import config from "../config.js";
import {useDropzone} from "react-dropzone";
import Loading from "./Loading.jsx";
import {toast} from 'react-toastify';
import {FaLocationDot} from "react-icons/fa6";
import {FaTimes} from "react-icons/fa";
import MeteoViewer from "./MeteoViewer.jsx";
import DisplayImage from "./DisplayImage.jsx";

const METEO_CORNERS = [
    {value: 'top-left', label: 'Haut gauche'},
    {value: 'top-right', label: 'Haut droite'},
    {value: 'bottom-left', label: 'Bas gauche'},
    {value: 'bottom-right', label: 'Bas droite'},
];

function EditScreenAttribute({ screen, screenId, attribute, value, onSave, inputType = "text" }) {
    const [isLoading, setIsLoading] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState([]);
    const [meteoCorner, setMeteoCorner] = useState(screen?.config?.meteo_corner || 'top-left');

    useEffect(() => {
        setMeteoCorner(screen?.config?.meteo_corner || 'top-left');
    }, [screen?.config?.meteo_corner]);

    const infosAboutAttribute = {
        "name": {
            label: "Nom de l'écran",
            inputType: "text"
        },
        "logo": {
            label: "Logo",
            inputType: "file"
        },
        "meteo.city": {
            label: "Configurez la ville souhaitée pour le widget météo",
            inputType: "text"
        }
    }
    useEffect(() => {
        if (attribute === 'meteo.city' && inputValue.length >= 2) {
            axios.get(`${config.serverUrl}/autocomplete/${inputValue}`)
                .then(res => setSuggestions(res.data))
                .catch(err => console.error('Erreur d\'autocomplétion:', err));
        }
    }, [inputValue, attribute]);
    const selectCity = async (city) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${config.serverUrl}/screens/update`, {
                attribute,
                value: city
            }, {
                withCredentials: true
            });
            onSave(response.data.screenObj);
            toast.success("Ville mise à jour avec succès !");
        } catch (error) {
            console.error('Erreur lors de la modification :', error);
            toast.error("Erreur lors de la mise à jour de la ville");
        } finally {
            setIsLoading(false);
        }
    };

    const resetMeteo = async () => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${config.serverUrl}/screens/update`, {
                attribute,
                value: ''
            }, {
                withCredentials: true
            });
            onSave(response.data.screenObj);
            toast.success("Ville supprimée avec succès !");
        } catch (error) {
            console.error('Erreur lors de la modification :', error);
            toast.error("Erreur lors de la suppression de la ville");
        } finally {
            setIsLoading(false);
        }
    }

    const updateMeteoCorner = async (corner) => {
        setMeteoCorner(corner);
        setIsLoading(true);
        try {
            const response = await axios.post(`${config.serverUrl}/screens/update`, {
                attribute: 'config.meteo_corner',
                value: corner
            }, {
                withCredentials: true
            });
            onSave(response.data.screenObj);
            toast.success("Position météo mise à jour !");
        } catch (error) {
            console.error('Erreur lors de la modification :', error);
            toast.error("Erreur lors de la mise à jour de la position");
            setMeteoCorner(screen?.config?.meteo_corner || 'top-left');
        } finally {
            setIsLoading(false);
        }
    }

    const resetLogo = async () => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${config.serverUrl}/screens/update`, {
                attribute,
                value: ''
            }, {
                withCredentials: true
            });
            onSave(response.data.screenObj);
            toast.success("Logo supprimé avec succès !");
        } catch (error) {
            console.error('Erreur lors de la modification :', error);
            toast.error("Erreur lors de la suppression du logo");
        } finally {
            setIsLoading(false);
        }
    }

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append(attribute, file);
        setIsLoading(true);
        try {
            const response = await axios.post(`${config.serverUrl}/screens/update`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            });
            onSave(response.data.screenObj);
            toast.success("Logo mis à jour avec succès !");
        } catch (error) {
            console.error('Erreur lors de la modification :', error);
            toast.error("Erreur lors de la mise à jour du logo");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTextChange = (e) => {
        setInputValue(e.target.value);
    };

    const handleSaveText = async () => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${config.serverUrl}/screens/update`, {
                attribute,
                value: inputValue
            }, {
                withCredentials: true
            });
            onSave(response.data.screenObj);
            toast.success("Valeur mise à jour avec succès !");
        } catch (error) {
            console.error('Erreur lors de la modification :', error);
            toast.error("Erreur lors de la mise à jour de la valeur");
        } finally {
            setIsLoading(false);
        }
    };

    const onDrop = async (acceptedFiles) => {
        const file = acceptedFiles[0];
        const formData = new FormData();
        formData.append(attribute, file);
        setIsLoading(true);
        try {
            const response = await axios.post(`${config.serverUrl}/screens/update`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            });
            onSave(response.data.screenObj);
            toast.success("Logo mis à jour avec succès !");
        } catch (error) {
            console.error('Erreur lors du téléchargement :', error);
            toast.error("Erreur lors de la mise à jour du logo");
        } finally {
            setIsLoading(false);
        }
    };

    const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: {'image/*': ['.jpeg', '.jpg', '.png', '.gif']} });

    if (isLoading) return (
        <Loading/>
    );

    if ( attribute === 'meteo.city' ) {
        return (
            <div className={"p1 fc g1"}>
                {
                    infosAboutAttribute[attribute].label
                }
                {screen.meteo && (
                    <>
                        <MeteoViewer screen={screen} onResetMeteo={()=>{resetMeteo()}}/>
                    </>
                )}
                <div className={"fc"}>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Recherchez une ville..."
                    />
                    {suggestions.length > 0 && (
                        <div className={"city-suggestions"}>
                            {suggestions.map((suggestion, index) => (
                                <div key={index} onClick={() => selectCity(suggestion.id)} className={"city-suggestion"}>
                                    <FaLocationDot/> <div>{suggestion.name}, {suggestion.country}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className={"fc g0-5"}>
                    <label htmlFor="meteo-corner">Position du widget météo</label>
                    <select
                        id="meteo-corner"
                        value={meteoCorner}
                        onChange={(e) => updateMeteoCorner(e.target.value)}
                    >
                        {METEO_CORNERS.map((corner) => (
                            <option key={corner.value} value={corner.value}>
                                {corner.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }
    if (attribute === 'logo') {
        return (
            <div className={"p1 fc g1"}>
                <label>
                    { infosAboutAttribute[attribute].label }
                </label>
                {
                    value && (
                        <div className={"pr wfc"}>
                            <DisplayImage image={value} alt="Image actuelle" height='4rem' />
                            <button type={"button"} className={"actionButton quickDel"} onClick={resetLogo}><FaTimes size={12}/></button>
                        </div>
                    )
                }


                <div {...getRootProps()} style={{ border: '2px dashed #ccc', padding: '10px', textAlign: 'center' }}>
                    <input {...getInputProps()} />
                    Glissez et déposez le logo ici, ou cliquez pour sélectionner un fichier
                </div>
            </div>

        );
    }
    return (
        <div className={"fc g1 p1"}>
            {
                infosAboutAttribute[attribute].label
            }
            {inputType === "file" ? (
                <>
                    {
                        value && (
                            <div>
                                <DisplayImage image={value} alt="Image actuelle" width='150px' />
                            </div>
                        )
                    }
                    <input type="file" onChange={handleFileChange} />
                </>
            ) : (
                <>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleTextChange}
                    />
                    <button type={"button"} onClick={handleSaveText}>Enregistrer</button>

                </>

            )}
        </div>
    );
}
export default EditScreenAttribute;


