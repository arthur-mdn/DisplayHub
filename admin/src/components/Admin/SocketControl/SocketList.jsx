import React, {useEffect, useState} from "react";
import {useSocket} from "../../../SocketContext.jsx";
import {Link} from "react-router-dom";
import DisplayImage from "../../DisplayImage.jsx";
import {QRCodeSVG} from "qrcode.react";
import config from "../../../config";

function detailPath(socketElement, type) {
    if (type === "association" || (!socketElement.screen && !socketElement.debugScreen)) {
        return `/admin/socketControl/socket/${socketElement.socketId}`;
    }
    const screenId = socketElement.screenId
        || socketElement[type]?._id
        || socketElement.socketId;
    return `/admin/socketControl/screen/${screenId}`;
}

function SocketList() {
    const [socketList, setSocketList] = useState([]);
    const socket = useSocket();

    useEffect(() => {
        if (socket) {
            socket.emit("adminAskSocketList");
            socket.on("adminSocketList", (data) => {
                setSocketList(data)
            });
            return () => socket.off("adminSocketList");
        }
    }, [socket]);

    const renderScreenLink = (socketElement, type, label, statusClass, imageSrc) => (
        <Link
            to={detailPath(socketElement, type)}
            key={type === "association" ? socketElement.socketId : (socketElement.screenId || socketElement[type]?._id || socketElement.socketId)}
            className="screen"
        >
            <div className="img-container">
                {type === "association" ? (
                    <QRCodeSVG value={`${config.adminUrl}/screens/add/${socketElement.associationCode}`} size={100} />
                ) : (
                    <DisplayImage image={imageSrc} />
                )}
            </div>
            <div className="fc ai-fs g0-5 h100">
                {type !== "association" && <h3 className="fw-b">{socketElement[type].name}</h3>}
                <div className="fr g0-5 ai-c">
                    <div className={`${statusClass} status-bubble`} />
                    <span className={statusClass}>{label}</span>
                </div>
                <p style={{ opacity: 0.4 }}>{type !== "association" ? socketElement[type]._id : socketElement.associationCode}</p>
                <p style={{ opacity: 0.4 }}>{socketElement.socketId || 'déconnecté'}</p>
                <p style={{ opacity: 0.4 }}>{socketElement.added ? new Date(socketElement.added).toLocaleString() : '-'}</p>
            </div>
        </Link>
    );

    return (
        <>
            <h3>SocketList</h3>
            <div className="fc g0-5">
                {socketList.map((socketElement) => (
                    <div key={socketElement.socketId || socketElement.screenId}>
                        {socketElement.screen &&
                            renderScreenLink(
                                socketElement,
                                "screen",
                                socketElement.screen.status === "online" ? "En ligne" : "Hors ligne",
                                socketElement.screen.status,
                                socketElement.screen?.featured_image
                            )}
                        {socketElement.debugScreen &&
                            renderScreenLink(socketElement, "debugScreen", "Debug", "debug", socketElement.debugScreen?.featured_image)}
                        {socketElement.associationCode &&
                            renderScreenLink(socketElement, "association", "Attente de configuration", "config", null)}
                        {!socketElement.screen && !socketElement.debugScreen && !socketElement.associationCode && (
                            <Link to={`/admin/socketControl/socket/${socketElement.socketId}`} className="screen" key={socketElement.socketId}>
                                <div className="img-container">
                                    <DisplayImage image={socketElement.socketId} />
                                </div>
                                <div className="fc ai-fs g0-5 h100">
                                    <h3 className="fw-b">{socketElement.socketId}</h3>
                                    <div className="fr g0-5 ai-c">
                                        <div className="online status-bubble" />
                                        <span className="online">En ligne</span>
                                    </div>
                                </div>
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
}

export default SocketList;
