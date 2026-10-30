import React, {useEffect, useRef, useState} from "react";
import {useSocket} from "../../SocketContext.jsx";
import {useAuth} from '../../AuthContext.jsx';
import Modal from '../Modal.jsx';
import {v4 as uuidv4} from 'uuid';
import {toast} from 'react-toastify';
import {FaPowerOff, FaRegSun, FaSatellite, FaSatelliteDish} from "react-icons/fa";
import {FaLocationDot, FaRotate, FaRotateLeft, FaSun} from "react-icons/fa6";

export default function Control({ screen }) {
    const socket = useSocket();
    const {user} = useAuth();
    const isSystemAdmin = user?.userRole === 'superadmin';
    const [buttonStates, setButtonStates] = useState({});
    const [availableCommands, setAvailableCommands] = useState([]);
    const [actualScreenStatus, setActualScreenStatus] = useState(screen.status);
    const [appVersion, setAppVersion] = useState(null);
    const [brightnessSliderValue, setBrightnessSliderValue] = useState(null);
    const [systemUpdateChallenge, setSystemUpdateChallenge] = useState(null);
    const [systemUpdate, setSystemUpdate] = useState(null);
    const [systemUpdateError, setSystemUpdateError] = useState(null);
    const commandTimers = useRef(new Map());
    const systemUpdateBusy = ['starting', 'running'].includes(systemUpdate?.state);

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
            title: "Mettre à jour l’agent DisplayHub",
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
            const onResponse = (data) => {
                if (data.screenId && String(data.screenId) !== String(screen._id)) return;
                console.log('server_forward_client_response_to_admin', data);
                if (data.commandId) {
                    clearTimeout(commandTimers.current.get(data.commandId));
                    commandTimers.current.delete(data.commandId);
                    if (data.systemUpdateChallenge) setSystemUpdateChallenge(data.systemUpdateChallenge);
                    if (data.systemUpdate) {
                        setSystemUpdate(data.systemUpdate);
                        setSystemUpdateError(null);
                    }
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
                        if (!['getAvailableCommands', 'prepareSystemUpdate', 'systemUpdateStatus'].includes(data.command)) {
                            toast.success(`Command successful: ${data.response}`);
                        }
                    } else if (data.error) {
                        if (data.command === 'systemUpdateStatus') {
                            setSystemUpdateError(data.error);
                            return;
                        }
                        toast.error(`Command failed: ${data.error}`);
                        if (data.error === 'Advanced commands not available') {
                            setAvailableCommands(['refresh', 'identify']);
                        }
                    }
                }
            };
            socket.on('server_forward_client_response_to_admin', onResponse);

            return () => {
                socket.off('server_forward_client_response_to_admin', onResponse);
                for (const timer of commandTimers.current.values()) clearTimeout(timer);
                commandTimers.current.clear();
            };
        }
    }, [socket, screen._id]);

    const sendControlCommand = (command, value = null) => {
        if (!socket?.connected) {
            toast.error('Connexion de contrôle indisponible');
            return;
        }
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
        commandTimers.current.set(commandId, setTimeout(() => {
            commandTimers.current.delete(commandId);
            setButtonStates(previous => ({...previous, [command]: previous[command] === commandId ? false : previous[command]}));
            toast.error('Aucune réponse de l’écran ; vérifier son état avant de réessayer');
        }, 20000));
    };

    const handleSliderChange = (e) => {
        setBrightnessSliderValue(e.target.value);
    };

    const handleSliderMouseUp = (command) => {
        sendControlCommand(command, brightnessSliderValue);
    };

    useEffect(() => {
        if (!socket) return;
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
            socket.off('screen_status');
        };
    }, [socket, screen._id]);

    useEffect(() => {
        if (!socket || !isSystemAdmin || actualScreenStatus !== 'online' || !availableCommands.includes('systemUpdateStatus')) return;
        const requestStatus = () => {
            if (socket.connected) socket.emit('admin_request_client_control', {
                screenId: screen._id, command: 'systemUpdateStatus', commandId: uuidv4()
            });
        };
        requestStatus();
        const timer = setInterval(requestStatus, 10000);
        return () => clearInterval(timer);
    }, [socket, screen._id, isSystemAdmin, actualScreenStatus, availableCommands]);

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
                {availableCommands.filter(command => commands[command]?.type === 'advanced').length === 0 && (
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
            {isSystemAdmin && availableCommands.includes('systemUpdate') && (
                <div className="fc g0-5">
                    <h2>Maintenance Raspberry Pi OS</h2>
                    <p>Met à jour les paquets du système. Des services peuvent être interrompus. Le Pi ne redémarre pas automatiquement.</p>
                    {systemUpdateError && <p role="alert">État indisponible : {systemUpdateError}</p>}
                    {systemUpdate && (
                        <p role="status">
                            {{idle: 'Aucune mise à jour lancée', starting: 'Démarrage demandé', running: 'Mise à jour en cours',
                                succeeded: 'Mise à jour terminée', failed: 'Échec de la mise à jour : consulter les journaux du Pi'}[systemUpdate.state]}
                            {systemUpdate.rebootRequired && ' — un redémarrage est signalé comme nécessaire par le système.'}
                        </p>
                    )}
                    <button type="button" disabled={systemUpdateBusy || buttonStates.prepareSystemUpdate || buttonStates.systemUpdate || actualScreenStatus !== 'online'}
                        onClick={() => sendControlCommand('prepareSystemUpdate')}>
                        Préparer la mise à jour système
                    </button>
                    <Modal isOpen={Boolean(systemUpdateChallenge)} onClose={() => setSystemUpdateChallenge(null)} title="Confirmer la mise à jour système">
                        <div className="p1 fc g1">
                            <p>Lancer la mise à jour de Raspberry Pi OS pour « {screen.name} » ? Prévoir une fenêtre de maintenance : la connexion ou l’affichage peuvent être interrompus.</p>
                            <p>Les dépôts système existants sont utilisés. Aucun changement de version majeure de l’OS ni redémarrage automatique n’est demandé. Cette confirmation expire après 90 secondes.</p>
                            <button type="button" onClick={() => {
                                sendControlCommand('systemUpdate', systemUpdateChallenge);
                                setSystemUpdateChallenge(null);
                            }}>Confirmer la mise à jour</button>
                            <button type="button" onClick={() => setSystemUpdateChallenge(null)}>Annuler</button>
                        </div>
                    </Modal>
                </div>
            )}
        </div>
    );
}
