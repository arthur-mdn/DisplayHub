import React, {useEffect, useState} from "react";
import {useSocket} from "../../../SocketContext.jsx";
import {useParams} from "react-router-dom";
import DisplayImage from "../../DisplayImage.jsx";
import {FaArrowRotateLeft, FaPen, FaTrash} from "react-icons/fa6";
import {QRCodeSVG} from "qrcode.react";
import config from "../../../config";
import Control from "../../Settings/Control.jsx";

function SocketDetail() {
    const { socketId } = useParams();
    const [socketDetails, setSocketDetails] = useState({});
    const [newScreenId, setNewScreenId] = useState("");
    const socket = useSocket();

    useEffect(() => {
        if (socket) {
            socket.emit("adminAskSocketDetails", socketId);
            socket.on("adminSocketDetails", (data) => {
                console.log(data);
                setSocketDetails(data);
            });
            return () => socket.off("adminSocketDetails");
        }
    }, [socket, socketId]);

    const handleRefresh = () => socket.emit("adminAskSocketRefresh", socketId);

    const handleSetNewScreenId = () => {
        if (newScreenId.length >= 5) {
            socket.emit("adminOrderToChangeScreenId", { socketId, newScreenId });
        }
    };

    const handleReset = () => socket.emit("adminOrderToResetScreen", { socketId });

    const renderScreenDetail = (type, label, statusClass, imageSrc) => (
        <div className="screen without-arrow">
            <div className="img-container">
                <DisplayImage image={imageSrc} />
            </div>
            <div className="fc ai-fs g0-5 h100">
                <h3 className="fw-b">{socketDetails[type].name}</h3>
                <div className="fr g0-5 ai-c">
                    <div className={`${statusClass} status-bubble`}/>
                    <span className={statusClass}>{label}</span>
                </div>
                <p style={{opacity: 0.4}}>{socketDetails[type]._id}</p>
                <p style={{opacity: 0.4}}>{new Date(socketDetails.added).toLocaleString()}</p>
            </div>
        </div>
    );

    const renderQRCode = () => (
        <div className="screen without-arrow">
            <div className="img-container">
                <QRCodeSVG
                    value={`${config.adminUrl}/screens/add/${socketDetails.associationCode}`}
                    size={100}
                />
            </div>
            <div className="fc ai-fs g0-5 h100">
                <div className="fr g0-5 ai-c">
                    <div className="config status-bubble"/>
                    <span className="config">Attente de configuration</span>
                </div>
                <p style={{opacity: 0.4}}>{socketDetails.associationCode}</p>
                <p style={{opacity: 0.4}}>{socketId}</p>
                <p style={{opacity: 0.4}}>{new Date(socketDetails.added).toLocaleString()}</p>
            </div>
        </div>
    );

    return (
        <>
            <h2>SocketControl</h2>

            {socketDetails.screen &&
                renderScreenDetail(
                    "screen",
                    socketDetails.screen.status === "online" ? "En ligne" : "Hors ligne",
                    socketDetails.screen.status,
                    socketDetails.screen.featured_image
                )}

            {socketDetails.debugScreen &&
                renderScreenDetail("debugScreen", "Debug", "debug", socketDetails.debugScreen?.featured_image)}

            {socketDetails.associationCode && renderQRCode()}

            <div>
                <button type="button" onClick={handleRefresh}>
                    <FaArrowRotateLeft />
                    Recharger la page
                </button>
            </div>

            <div>
                <label>Définir un nouveau screenId</label>
                <input
                    type="text"
                    value={newScreenId}
                    placeholder="New Screen Id"
                    onChange={(e) => setNewScreenId(e.target.value)}
                />
                <button type="button" onClick={handleSetNewScreenId}>
                    <FaPen />
                    Définir
                </button>
            </div>

            <div>
                <button type="button" onClick={handleReset}>
                    <FaTrash />
                    Réinitialiser l'écran
                </button>
            </div>
            {socketDetails.screen &&
                (
                    <Control screen={socketDetails.screen} />
                )
            }
        </>
    );
}

export default SocketDetail;