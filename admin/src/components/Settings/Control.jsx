import React, {useEffect, useState} from "react";
import {useSocket} from "../../SocketContext.jsx";
import {v4 as uuidv4} from 'uuid';
import {toast} from 'react-toastify';
import {FaPowerOff, FaRegSun, FaSatellite, FaSatelliteDish} from "react-icons/fa";
import {FaLocationDot, FaRotate, FaRotateLeft, FaSun} from "react-icons/fa6";

export default function Control({ screen }) {
    const socket = useSocket();
    const [buttonStates, setButtonStates] = useState({});
    const [availableCommands, setAvailableCommands] = useState([]);
    const [actualScreenStatus, setActualScreenStatus] = useState(screen.status);
    const [appVersion, setAppVersion] = useState(null);
    const [brightnessSliderValue, setBrightnessSliderValue] = useState(null);

    const commands = {
        refresh: {
            title: "Recharger la page",
            icon: <FaRotateLeft />,
            command: "refresh",
            type: "basic",
            input: {
                type: "button"
            }
        },
        identify: {
            title: "Identifier l'écran",
            icon: <FaLocationDot />,
            command: "identify",
            type: "basic",
            input: {
                type: "button"
            }
        },
        shutdown: {
            title: "Éteindre l'écran",
            icon: <FaPowerOff />,
            command: "shutdown",
            type: "advanced",
            input: {
                type: "button"
            }
        },
        reboot: {
            title: "Redémarrer l'écran",
            icon: <FaRotate />,
            command: "reboot",
            type: "advanced",
            input: {
                type: "button"
            }
        },
        update: {
            title: "Mettre à jour l'écran",
            icon: <FaSatellite />,
            command: "update",
            type: "advanced",
            input: {
                type: "button"
            }
        },
        brightness: {
            title: "Luminosité",
            icon: <FaSatellite />,
            command: "brightness",
            type: "advanced",
            input: {
                type: "range",
                min: 0,
                max: 100,
                step: 1
            }
        }
    };

    useEffect(() => {
        if (socket) {
            socket.on('server_forward_client_response_to_admin', (data) => {
                console.log('server_forward_client_response_to_admin', data);
                if (data.commandId) {
                    setButtonStates(prevState => {
                        const updatedState = { ...prevState };
                        Object.keys(updatedState).forEach(key => {
                            if (updatedState[key] === data.commandId) {
                                updatedState[key] = false;
                            }
                        });
                        return updatedState;
                    });

                    if (data.response) {
                        if (data.valueConfirmed) {
                            setBrightnessSliderValue(data.valueConfirmed);
                        }
                        if (data.appVersion) {
                            setAppVersion(data.appVersion);
                        }
                        if (data.availableCommands) {
                            setAvailableCommands(data.availableCommands);
                        }
                        if (data.defaultValues) {
                            Object.entries(data.defaultValues).forEach(([key, value]) => {
                                if (key === 'brightness') {
                                    setBrightnessSliderValue(value);
                                }
                            });
                        }
                        if (!data.command || data.command !== 'getAvailableCommands') {
                            toast.success(`Command successful: ${data.response}`);
                        }
                    } else if (data.error) {
                        toast.error(`Command failed: ${data.error}`);
                        if (data.error === 'Advanced commands not available') {
                            setAvailableCommands('basic');
                        }
                    }
                }
            });

            return () => {
                socket.off('server_forward_client_response_to_admin');
            };
        }
    }, [socket]);

    const sendControlCommand = (command, value = null) => {
        const commandId = uuidv4();
        setButtonStates(prevState => ({
            ...prevState,
            [command]: commandId
        }));

        const payload = {
            screenId: screen._id,
            command,
            value,
            commandId
        };
        console.log('admin_request_client_control', payload);
        socket.emit('admin_request_client_control', payload);
    };

    const handleSliderChange = (e) => {
        setBrightnessSliderValue(e.target.value);
    };

    const handleSliderMouseUp = (command) => {
        sendControlCommand(command, brightnessSliderValue);
    };

    useEffect(() => {
        if (actualScreenStatus === 'online') {
            const statusCommandId = uuidv4();
            setButtonStates(prevState => ({
                ...prevState,
                'getAvailableCommands': statusCommandId
            }));
            socket.emit('admin_request_client_control', {
                screenId: screen._id,
                command: 'getAvailableCommands',
                commandId: statusCommandId
            });
        }
        socket.on('screen_status', (updatedScreen) => {
            if (String(updatedScreen.screenId) === String(screen._id)) {
                setActualScreenStatus(updatedScreen.status);
                if (updatedScreen.status === 'online') {
                    const statusCommandId = uuidv4();
                    setButtonStates(prevState => ({
                        ...prevState,
                        'getAvailableCommands': statusCommandId
                    }));
                    socket.emit('admin_request_client_control', {
                        screenId: screen._id,
                        command: 'getAvailableCommands',
                        commandId: statusCommandId
                    });
                }
            }
        });

        return () => {
            socket.off('server_forward_client_response_to_admin');
            socket.off('screen_status');
        };
    }, [socket, screen._id]);

    const isCommandAvailable = (command) => {
        return availableCommands.includes(command);
    };

    return (
        <div className={"p1 fc g0-5"}>
            <div className={"fc g0-5 card ai-c"}>
                <FaSatelliteDish size={30} />
                <div className={`fr g0-5 ai-c`}>
                    <div className={`${actualScreenStatus}`}>
                    </div>
                    <span className={`${actualScreenStatus}`}>
                        {actualScreenStatus === "online" ? "Connecté" : "Hors ligne"}
                    </span>
                </div>
            </div>

            <div className={"fc g0-5"}>
                <h2>Contrôles basiques</h2>
                <div className={"fr g0-5 fw-w"}>
                    {Object.entries(commands)
                        .filter(([key, command]) => command.type === 'basic')
                        .map(([key, command]) => (
                            <div key={`e-${key}`} className={"om-w100"}>
                                {command.input.type === 'button' && (
                                    <button
                                        className={"om-w100"}
                                        key={key}
                                        type={"button"}
                                        onClick={() => sendControlCommand(command.command)}
                                        disabled={buttonStates[command.command] || !isCommandAvailable(command.command) || actualScreenStatus !== 'online'}
                                    >
                                        {command.icon}
                                        {command.title}
                                    </button>
                                )}
                            </div>
                        ))}
                </div>
            </div>
            <div className={"fc g0-5"}>
                <h2>Contrôles avancés</h2>
                {availableCommands.filter(command => commands[command].type === 'advanced').length === 0 && (
                    <p style={{ color: "red", fontWeight: 'bold' }}>Les contrôles avancés ne sont pas disponibles pour cet écran.</p>
                )}
                {availableCommands.length > 0 && appVersion && screen.status === "online" && (
                    <p className={"o0-5"}>Version de l'application: {appVersion}</p>
                )}

                <div className={"fr g0-5 fw-w"}>
                    {Object.entries(commands)
                        .filter(([key, command]) => command.type === 'advanced')
                        .map(([key, command]) => (
                            <div key={`e-${key}`} className={"om-w100"}>
                                {command.input.type === 'range' && (
                                    <div className={"fc g0-5"}>
                                        <div className={"slider-container"}>
                                            <FaRegSun size={20}/>
                                            <input
                                                key={key}
                                                type={command.input.type}
                                                min={command.input.min}
                                                max={command.input.max}
                                                step={command.input.step}
                                                value={brightnessSliderValue || command.input.value}
                                                onChange={handleSliderChange}
                                                onMouseUp={() => handleSliderMouseUp(command.command)}
                                                onTouchEnd={() => handleSliderMouseUp(command.command)}
                                                disabled={buttonStates[command.command] || !isCommandAvailable(command.command) || actualScreenStatus !== 'online'}
                                            />
                                            <FaSun size={20}/>
                                        </div>
                                    </div>
                                )}
                                {command.input.type === 'button' && (
                                    <button
                                        className={"om-w100"}
                                        key={key}
                                        type={"button"}
                                        onClick={() => sendControlCommand(command.command)}
                                        disabled={buttonStates[command.command] || !isCommandAvailable(command.command) || actualScreenStatus !== 'online'}
                                    >
                                        {command.icon}
                                        {command.title}
                                    </button>
                                )}
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}