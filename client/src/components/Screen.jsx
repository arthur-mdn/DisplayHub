import React from "react";
import TimeViewer from "./TimeViewer";
import DirectionsViewer from "./DirectionsViewer";
import PhotoSlider from "./PhotoSlider.jsx";
import DisplayLogo from "./DisplayLogo.jsx";
import {Helmet} from "react-helmet-async";
import DisplayIcons from "./DisplayIcons.jsx";

function Screen({configData, isDarkModeActive}) {
    const hasDirections = configData.directions?.length > 0;
    const hasPhotos = configData.photos?.length > 0;
    const hasIcons = configData.icons?.length > 0;

    return (
        <div
            className="display-shell"
            style={{'--dir-count': configData.directions?.length || 0, '--icon-count': configData.icons?.length || 0}}
        >
            <Helmet>
                <title>{configData.name}</title>
            </Helmet>

            <header className="display-header">
                <div className="display-header__left">
                    {configData.logo && (
                        <DisplayLogo logo={configData.logo} isDarkModeActive={isDarkModeActive}/>
                    )}
                </div>

                <div className="display-header__center">
                    <TimeViewer/>
                </div>

                <div className="display-header__right">
                    {hasIcons && (
                        <DisplayIcons icons={configData.icons} isDarkModeActive={isDarkModeActive}/>
                    )}
                </div>
            </header>

            <main
                className="display-main"
                data-has-directions={hasDirections ? "true" : "false"}
                data-has-photos={hasPhotos ? "true" : "false"}
            >
                {hasDirections && <DirectionsViewer screen={configData}/>}
                {hasPhotos && (
                    <PhotoSlider
                        photos={configData.photos}
                        interval={configData.config?.photos_interval || 10}
                        hideDots={configData.config?.hide_slider_dots}
                        screen={configData}
                    />
                )}
            </main>
        </div>
    );
}

export default Screen;
