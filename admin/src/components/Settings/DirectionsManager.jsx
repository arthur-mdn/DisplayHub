import React, {useState} from 'react';
import axios from 'axios';
import config from '../../config';
import {DragDropContext, Draggable, Droppable} from '@hello-pangea/dnd';
import {FaPencil, FaTrash} from "react-icons/fa6";
import Modal from "../Modal.jsx";
import AddDirection from "./AddDirection.jsx";
import Loading from "../Loading.jsx";
import {toast} from "react-toastify";

function DirectionsManager({ screenId, initialDirections, onDirectionsChange }) {
    const [newDirectionOpen, setNewDirectionOpen] = useState(false);
    const [editDirection, setEditDirection] = useState(null);
    const [directions, setDirections] = useState(initialDirections || []);

    const [isLoading, setIsLoading] = useState(false);

    const handleAddDirection = (newConfig) => {
        setDirections(newConfig.directions);
        onDirectionsChange(newConfig);
        setNewDirectionOpen(false);
    };

    const handleEditDirection = (editedConfig) => {
        setDirections(editedConfig.directions);
        onDirectionsChange(editedConfig);
        setEditDirection(null);
    }
    const onDragEnd = async (result) => {
        if (!result.destination) return;

        const items = Array.from(directions);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setIsLoading(true);
        try {
            const response = await axios.post(`${config.serverUrl}/screens/directions/reorder`, { newOrder: items }, { withCredentials: true });
            setDirections(response.data.screenObj.directions);
            onDirectionsChange(response.data.screenObj);
            toast.success("Directions réordonnées avec succès !");
        } catch (error) {
            console.error('Erreur lors de la réorganisation des directions:', error);
            toast.error("Erreur lors de la réorganisation des directions");
        } finally {
            setIsLoading(false);
        }
    };

    const deleteDirection = async (directionIndex) => {
        setIsLoading(true);
        try {
            const response = await axios.delete(`${config.serverUrl}/screens/directions/${directionIndex}`, { withCredentials: true });
            setDirections(response.data.screenObj.directions);
            onDirectionsChange(response.data.screenObj);
            toast.success("Direction supprimée avec succès !");
        } catch (error) {
            console.error('Erreur lors de la suppression d\'une direction:', error);
            toast.error("Erreur lors de la suppression de la direction");
        } finally {
            setIsLoading(false);
        }
    };

    const arrowImages = ['arrow.png', 'arrow_bold.png', 'left-turn.png', 'turn.png', 'location-pin.png'];

    if (isLoading) return (
        <Loading/>
    );

    return (
        <div className={"p1 fc g1"}>
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="droppable-directions">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef}>
                            {directions.map((direction, index) => (
                                <Draggable key={index} draggableId={`direction-${index}`} index={index}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={provided.draggableProps.style}
                                            className="admin-direction-card"
                                        >
                                            <div className="admin-direction-card__body">
                                                <img
                                                    src={`/elements/arrows/${direction.arrow.style}`}
                                                    alt="Flèche"
                                                    className="admin-direction-card__arrow"
                                                    style={{transform: `rotate(${direction.arrow.orientation}deg)`}}
                                                />
                                                <div className="admin-direction-card__sep" aria-hidden="true"/>
                                                <div className="admin-direction-card__text">
                                                    <h3
                                                        className="admin-direction-card__title"
                                                        style={{
                                                            color: direction.title.color === "#000000"
                                                                ? undefined
                                                                : direction.title.color
                                                        }}
                                                    >
                                                        {direction.title.text}
                                                    </h3>
                                                    {direction.description ? (
                                                        <p className="admin-direction-card__subtitle">
                                                            {direction.description}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="admin-direction-card__actions fr g0-5">
                                                <button type={"button"} className={"actionButton"} onClick={() => setEditDirection(direction)}>
                                                    <FaPencil/>
                                                </button>
                                                <button type={"button"} className={"actionButton"} onClick={() => deleteDirection(direction._id)}>
                                                    <FaTrash/>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            <button type={"button"} onClick={() => setNewDirectionOpen(true)}>Ajouter une direction</button>

            <Modal isOpen={newDirectionOpen} title={"Ajouter une direction"} onClose={()=> {setNewDirectionOpen(false)}}>
                <AddDirection
                    screenId={screenId}
                    arrowImages={arrowImages}
                    onDirectionAdd={(newConfig) => {handleAddDirection(newConfig)}}
                />
            </Modal>

            <Modal isOpen={editDirection !== null} title={"Modifier une direction"} onClose={()=> {setEditDirection(null)}}>
                <AddDirection
                    screenId={screenId}
                    arrowImages={arrowImages}
                    direction={editDirection}
                    onDirectionEdit={(editedConfig) => {handleEditDirection(editedConfig)}}
                />
            </Modal>

        </div>
    );
}

export default DirectionsManager;
