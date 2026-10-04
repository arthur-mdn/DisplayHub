import React, {useEffect, useState} from "react";
import {useSocket} from "../../../SocketContext.jsx";
import {Link} from "react-router-dom";
import DisplayImage from "../../DisplayImage.jsx";
import {QRCodeSVG} from "qrcode.react";
import config from "../../../config";

function SocketList() {
    const [socketList, setSocketList] = useState([]);
    const socket = useSocket();

    useEffect(() => {
        if (socket) {
            socket.emit("adminAskSocketList");
            socket.on("adminSocketList", (data) => {
                console.log(data);
                setSocketList(data)
            });
            return () => socket.off("adminSocketList");
        }
    }, [socket]);

    const renderScreenLink = (socketElement, type, label, statusClass, imageSrc) => (
        <Link to={`/admin/socketControl/${socketElement.socketId}`} key={type === "association" ? socketElement.socketId : socketElement[type]._id} className="screen">
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
                <p style={{ opacity: 0.4 }}>{socketElement.socketId}</p>
                <p style={{ opacity: 0.4 }}>{new Date(socketElement.added).toLocaleString()}</p>
            </div>
        </Link>
    );

    return (
        <>
            <h3>SocketList</h3>
            <div className="fc g0-5">
                {socketList.map((socketElement) => (
                    <div key={socketElement.socketId}>
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
                            <Link to={socketElement.socketId} className="screen" key={socketElement.socketId}>
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