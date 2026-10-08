import React, {useEffect, useState} from 'react';

function TimeViewer() {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timerId);
    }, []);

    const jours = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

    const jourDeLaSemaine = jours[currentTime.getDay()];
    const jourDuMois = currentTime.getDate();
    const moisEnCours = mois[currentTime.getMonth()];
    const anneeEnCours = currentTime.getFullYear();

    const heures = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');

    return (
        <div className="display-time">
            <div className="display-time__date">
                <p className="display-time__weekday">{jourDeLaSemaine}</p>
                <p className="display-time__fulldate">{`${jourDuMois} ${moisEnCours} ${anneeEnCours}`}</p>
            </div>
            <div className="display-header__sep" aria-hidden="true"/>
            <p className="display-time__clock">{`${heures}:${minutes}`}</p>
        </div>
    );
}

export default TimeViewer;
