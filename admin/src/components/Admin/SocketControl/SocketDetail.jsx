import React, {useCallback, useEffect, useState} from "react";
import {useSocket} from "../../../SocketContext.jsx";
import {useNavigate, useParams} from "react-router-dom";
import DisplayImage from "../../DisplayImage.jsx";
import {FaArrowRotateLeft, FaPen, FaTrash} from "react-icons/fa6";
import {QRCodeSVG} from "qrcode.react";
import config from "../../../config";
import Control from "../../Settings/Control.jsx";

function SocketDetail() {
    const {screenId, socketId} = useParams();
    const [socketDetails, setSocketDetails] = useState({});
    const [newScreenId, setNewScreenId] = useState("");
    const socket = useSocket();
    const navigate = useNavigate();

    const targetPayload = screenId ? {screenId} : {socketId};

    const requestDetails = useCallback(() => {
        if (!socket) return;
        if (screenId) {
            socket.emit("adminAskSocketDetails", {screenId});
        } else if (socketId) {
            socket.emit("adminAskSocketDetails", {socketId});
        }
    }, [socket, screenId, socketId]);

    useEffect(() => {
        if (!socket) return;

        const onDetails = (data) => {
            if (!data || data.error === 'not_found') {
                setSocketDetails({error: 'not_found'});
                return;
            }
            setSocketDetails(data);

            if (screenId && data.screenId && data.screenId !== screenId) {
                navigate(`/admin/socketControl/screen/${data.screenId}`, {replace: true});
            }
        };

        const onList = () => {
            requestDetails();
        };

        requestDetails();
        socket.on("adminSocketDetails", onDetails);
        socket.on("adminSocketList", onList);
        return () => {
            socket.off("adminSocketDetails", onDetails);
            socket.off("adminSocketList", onList);
        };
    }, [socket, screenId, socketId, requestDetails, navigate]);

    const handleRefresh = () => socket.emit("adminAskSocketRefresh", targetPayload);

    const handleSetNewScreenId = () => {
        if (newScreenId.length >= 5) {
            socket.emit("adminOrderToChangeScreenId", {...targetPayload, newScreenId});
            navigate(`/admin/socketControl/screen/${newScreenId}`);
        }
    };

    const handleReset = () => socket.emit("adminOrderToResetScreen", targetPayload);

    const liveSocketId = socketDetails.socketId;
    const statusLabel = socketDetails.disconnected || !liveSocketId
        ? "Hors ligne"
        : (socketDetails.screen?.status === "online" ? "En ligne" : "Hors ligne");
    const statusClass = socketDetails.disconnected || !liveSocketId
        ? "offline"
        : (socketDetails.screen?.status || "offline");

    const renderScreenDetail = (type, label, statusClassName, imageSrc) => (
        <div className="screen without-arrow">
            <div className="img-container">
                <DisplayImage image={imageSrc} />
            </div>
            <div className="fc ai-fs g0-5 h100">
                <h3 className="fw-b">{socketDetails[type].name}</h3>
                <div className="fr g0-5 ai-c">
                    <div className={`${statusClassName} status-bubble`}/>
                    <span className={statusClassName}>{label}</span>
                </div>
                <p style={{opacity: 0.4}}>{socketDetails[type]._id}</p>
                <p style={{opacity: 0.4}}>{liveSocketId || 'socket déconnecté'}</p>
                <p style={{opacity: 0.4}}>{socketDetails.added ? new Date(socketDetails.added).toLocaleString() : '-'}</p>
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
                <p style={{opacity: 0.4}}>{liveSocketId || socketId}</p>
                <p style={{opacity: 0.4}}>{socketDetails.added ? new Date(socketDetails.added).toLocaleString() : '-'}</p>
            </div>
        </div>
    );

    if (socketDetails.error === 'not_found') {
        return (
            <>
                <h2>SocketControl</h2>
                <p>Socket ou écran introuvable.</p>
            </>
        );
    }

    return (
        <>
            <h2>SocketControl</h2>

            {socketDetails.screen &&
                renderScreenDetail(
                    "screen",
                    statusLabel,
                    statusClass,
                    socketDetails.screen.featured_image
                )}

            {socketDetails.debugScreen &&
                renderScreenDetail("debugScreen", "Debug", "debug", socketDetails.debugScreen?.featured_image)}

            {socketDetails.associationCode && renderQRCode()}

            <div>
                <button type="button" onClick={handleRefresh} disabled={!liveSocketId}>
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
                <button type="button" onClick={handleSetNewScreenId} disabled={!liveSocketId}>
                    <FaPen />
                    Définir
                </button>
            </div>

            <div>
                <button type="button" onClick={handleReset} disabled={!liveSocketId}>
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
