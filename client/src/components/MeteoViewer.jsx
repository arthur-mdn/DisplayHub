function MeteoViewer({screen}) {
    if (!screen.meteo || Object.keys(screen.meteo.data || {}).length === 0) {
        return null;
    }

    const weather = screen.meteo.data.weather?.[0];
    const icon = weather?.icon;
    const iconSrc = icon === '01n'
        ? '/elements/meteo/01n-edited.png'
        : `https://openweathermap.org/img/wn/${icon}@2x.png`;
    const temp = `${screen.meteo.data.main.temp.toFixed(1)}°`;
    const description = weather?.description;

    return (
        <div className="display-meteo">
            {weather && (
                <img src={iconSrc} alt="" className="display-meteo__icon"/>
            )}
            <div className="display-meteo__meta">
                <p className="display-meteo__title">
                    <span className="display-meteo__temp">{temp}</span>
                    {description && (
                        <>
                            <span className="display-meteo__sep" aria-hidden="true">.</span>
                            <span className="display-meteo__desc">{description}</span>
                        </>
                    )}
                </p>
                <p className="display-meteo__city">
                    <svg className="display-meteo__pin" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            fill="currentColor"
                            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
                        />
                    </svg>
                    <span>{screen.meteo.data.name}</span>
                </p>
            </div>
        </div>
    );
}

export default MeteoViewer;
