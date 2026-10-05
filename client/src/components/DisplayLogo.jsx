import React, {useEffect, useState} from 'react';
import {cacheLogo, getCachedLogo} from '../utils/cacheUtils.js';
import config from '../config.js';

export default function DisplayLogo({logo, isDarkModeActive}) {
    const [cachedLogo, setCachedLogo] = useState(null);

    useEffect(() => {
        let objectUrl;
        let cancelled = false;

        const loadLogo = async () => {
            if (!logo) {
                setCachedLogo(null);
                return;
            }

            await cacheLogo(logo);
            const cachedLogoData = await getCachedLogo(logo._id);
            if (cancelled) return;

            if (cachedLogoData) {
                if (cachedLogoData.type === 'image/svg+xml') {
                    const reader = new FileReader();
                    reader.onload = function (event) {
                        if (cancelled) return;
                        let svgContent = event.target.result;

                        if (isDarkModeActive) {
                            svgContent = svgContent.replace(
                                /<svg([^>]+)>/,
                                `<svg$1><style>.fill-white-when-dark-mode{fill:#fff}</style>`
                            );
                        } else {
                            svgContent = svgContent.replace(
                                /<style>.*?\.fill-white-when-dark-mode{fill:#fff}.*?<\/style>/,
                                (match) => match.replace(/\.fill-white-when-dark-mode{fill:#fff}/, '')
                            );
                        }

                        const updatedBlob = new Blob([svgContent], {type: 'image/svg+xml'});
                        objectUrl = URL.createObjectURL(updatedBlob);
                        setCachedLogo(objectUrl);
                    };
                    reader.readAsText(cachedLogoData);
                } else {
                    objectUrl = URL.createObjectURL(cachedLogoData);
                    setCachedLogo(objectUrl);
                }
            } else {
                setCachedLogo(`${(logo.where === 'server' ? config.serverUrl : '') + '/' + logo.value}`);
            }
        };

        loadLogo();

        return () => {
            cancelled = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [logo, isDarkModeActive]);

    if (!cachedLogo || !logo) return null;

    return <img src={cachedLogo} className="display-logo" alt="Logo"/>;
}
