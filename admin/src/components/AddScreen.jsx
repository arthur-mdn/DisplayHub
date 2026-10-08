import React, {useEffect, useState} from "react";
import axios from "axios";
import {toast} from "react-toastify";
import Loading from "./Loading.jsx";
import {useNavigate, useParams} from "react-router-dom";
import {useCookies} from "react-cookie";
import Modal from "./Modal.jsx";
import Scan from "./Scan.jsx";
import config from "../config.js";
import {FaQrcode} from "react-icons/fa6";

function AddScreen({ fromUrl = false }) {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [scanModalIsOpen, setScanModalIsOpen] = useState(false);
    const { screenId } = useParams();
    const [cookies, setCookie, removeCookie] = useCookies(['selectedScreen', 'pendingScreenId']);
    const navigate = useNavigate();

    useEffect(() => {
        if (screenId) {
            setCode(screenId);
            handleSubmit(screenId);
        } else if (cookies.pendingScreenId) {
            setCode(cookies.pendingScreenId);
            handleSubmit(cookies.pendingScreenId);
        }
    }, [cookies.pendingScreenId, screenId]);

    const handleSubmit = async (codeToSubmit) => {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!uuidPattern.test(codeToSubmit)) {
            toast.error("Code invalide. Veuillez entrer un code valide.");
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post(`${config.serverUrl}/associate-screen`, { code: codeToSubmit }, { withCredentials: true });
            toast.success("Écran associé avec succès !");
            removeCookie('pendingScreenId', { path: '/' });
            setCookie('selectedScreen', response.data.screen._id, { path: '/', domain: config.cookieDomain });
            navigate(`/screens/list/${response.data.screen._id}`);
        } catch (error) {
            toast.error("Erreur lors de l'association de l'écran.");
        } finally {
            setIsLoading(false);
        }
    };

    const onScanSuccess = (decodedText, decodedResult) => {
        const regexPattern = `${config.adminUrl.replace(/\//g, "\\/")}\\/screens\\/add\\/([\\w-]+)`;
        const regex = new RegExp(regexPattern);
        const match = decodedText.match(regex);
        if (match && match[1]) {
            const scannedCode = match[1];
            setCode(scannedCode);
            setScanModalIsOpen(false);
            handleSubmit(scannedCode);
        } else {
            toast.error("QR code invalide.");
        }
    };

    const onScanError = (error) => {
        console.error(`Erreur de scan: ${error}`);
    };

    if (isLoading) return <Loading />;

    return (
        <div className={"p1"}>
            {(cookies.pendingScreenId && fromUrl) && (
                <button type={"button"} style={{ marginRight: "auto" }} onClick={() => {
                    removeCookie('pendingScreenId', { path: '/' });
                    navigate("/");
                }}>Annuler</button>
            )}
            {!screenId && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(code); }} className={"fc g1"}>
                    <label htmlFor={"code"}>Code d'écran</label>
                    <input
                        type={"text"}
                        id={"code"}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder={"Code d'écran"}
                        required={true}
                    />
                    <button type="button" className={"forgot_password_button"} onClick={() => setScanModalIsOpen(true)}>
                        <FaQrcode /> Scanner QR Code
                    </button>
                    <button type="submit">Associer l'écran</button>
                </form>
            )}
            <Modal isOpen={scanModalIsOpen} onClose={() => setScanModalIsOpen(false)} title={"Scanner le QRCode de l'écran"}>
                <Scan onScanSuccess={onScanSuccess} onScanError={onScanError} />
            </Modal>
        </div>
    );
}

export default AddScreen;
