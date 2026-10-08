import React, {useState} from 'react';
import axios from 'axios';
import config from '../../config';
import {DragDropContext, Draggable, Droppable} from '@hello-pangea/dnd';
import {useDropzone} from 'react-dropzone';
import Loading from "../Loading.jsx";
import {toast} from "react-toastify";
import {FaTimes} from "react-icons/fa";
import DisplayImage from "../DisplayImage.jsx";

function PhotosManager({ screenId, initialPhotos, onPhotosChange }) {
    const [photos, setPhotos] = useState(initialPhotos);
    const [isLoading, setIsLoading] = useState(false);
    const uploadPhoto = async (file) => {
        const formData = new FormData();
        formData.append('photos', file);

        try {
            const response = await axios.post(`${config.serverUrl}/screens/photos`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            });
            return response.data.screen;
        } catch (error) {
            console.error('Erreur lors du téléchargement de la photo:', error);
            throw error;
        }
    };

    const onDrop = async (acceptedFiles) => {
        setIsLoading(true);

        try {
            for (const file of acceptedFiles) {
                try {
                    const updatedConfWithNewPhotos = await uploadPhoto(file);
                    setPhotos(updatedConfWithNewPhotos.photos);
                    onPhotosChange(updatedConfWithNewPhotos);
                    toast.success("Photo ajoutée avec succès !");
                } catch (error) {
                    toast.error("Erreur lors de l'ajout d'une photo");
                }
            }
        } catch (error) {
            toast.error("Erreur lors de l'ajout des photos");
        } finally {
            setIsLoading(false);
        }
    };

    const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: {'image/*': ['.jpeg', '.jpg', '.png', '.gif']}, multiple: true });

    const handleDelete = async (photoId) => {
        setIsLoading(true);
        try {
            const response = await axios.delete(`${config.serverUrl}/screens/photos`, {
                data: { photoId },
                withCredentials: true
            });
            console.log(response.data.screenObj)
            if (response.data.screenObj) {
                setPhotos(response.data.screenObj.photos);
                onPhotosChange(response.data.screenObj);
                toast.success("Photo supprimée avec succès !");
            } else {
                toast.error("Erreur lors de la suppression de la photo");
            }
        } catch (error) {
            console.error('Erreur lors de la suppression de la photo:', error);
            toast.error("Erreur lors de la suppression de la photo");
        } finally {
            setIsLoading(false);
        }
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        setIsLoading(true);

        const items = Array.from(photos);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        try {
            const response = await axios.post(`${config.serverUrl}/screens/photos/reorder`, { newOrder: items }, {
                withCredentials: true
            });
            setPhotos(response.data.screen.photos);
            onPhotosChange(response.data.screen);
            toast.success("Photos réordonnées avec succès !");
        } catch (error) {
            console.error('Erreur lors de la réorganisation des photos:', error);
            toast.error("Erreur lors de la réorganisation des photos");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return (
        <Loading/>
    );

    return (
        <div className={"p1"}>
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="droppable-photos" direction="horizontal">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className={"fr g0-5 ofy-s"}>
                            {photos.map((photo, index) => (
                                <Draggable key={photo._id} draggableId={photo._id} index={index}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={"admin-photo-card pr"}
                                        >
                                            <DisplayImage image={photo} alt={`Photo ${index}`} width={'150px'} className="admin-photo-card__img"/>
                                            <button type={"button"} className={"actionButton quickDel"}
                                                    onClick={() => handleDelete(photo._id)}><FaTimes size={12}/></button>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            <div style={{ marginTop: '20px' }}>
                <div {...getRootProps()} style={{ marginTop: '20px', border: '2px dashed #ccc', padding: '10px', textAlign: 'center' }}>
                    <input type={"file"} {...getInputProps()} />
                    Glissez et déposez des photos ici, ou cliquez pour sélectionner des photos
                </div>
            </div>
        </div>

    );
}

export default PhotosManager;
