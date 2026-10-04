import config from '../config.js';
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {cacheIcons, getCachedIcon} from '../utils/cacheUtils.js';

function DisplayIcons({icons, isDarkModeActive}) {
    const iconsRef = useRef(null);
    const containerRef = useRef(null);
    const [hiddenContentWidth, setHiddenContentWidth] = useState(0);
    const [shouldScroll, setShouldScroll] = useState(false);
    const [cachedIcons, setCachedIcons] = useState([]);

    useEffect(() => {
        const objectUrls = [];
        let cancelled = false;

        async function cacheAndLoadIcons() {
            if (!icons?.length) {
                setCachedIcons([]);
                return;
            }

            await cacheIcons(icons);

            const loadedIcons = await Promise.all(
                icons.map(async (icon) => {
                    const cachedIconData = await getCachedIcon(icon._id);
                    if (!cachedIconData) {
                        return `${(icon.where === 'server' ? config.serverUrl : '') + '/' + icon.value}`;
                    }

                    if (cachedIconData.type === 'image/svg+xml') {
                        const svgContent = await cachedIconData.text();
                        let nextContent = svgContent;
                        if (isDarkModeActive) {
                            nextContent = nextContent.replace(
                                /<svg([^>]+)>/,
                                `<svg$1><style>.fill-white-when-dark-mode{fill:#fff!important}</style>`
                            );
                        } else {
                            nextContent = nextContent.replace(
                                /<style>.*?\.fill-white-when-dark-mode{fill:#fff!important}.*?<\/style>/,
                                (match) => match.replace(/\.fill-white-when-dark-mode{fill:#fff!important}/, '')
                            );
                        }
                        const updatedBlob = new Blob([nextContent], {type: 'image/svg+xml'});
                        const url = URL.createObjectURL(updatedBlob);
                        objectUrls.push(url);
                        return url;
                    }

                    const url = URL.createObjectURL(cachedIconData);
                    objectUrls.push(url);
                    return url;
                })
            );

            if (!cancelled) {
                setCachedIcons(loadedIcons);
            }
        }

        cacheAndLoadIcons();

        return () => {
            cancelled = true;
            objectUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [icons, isDarkModeActive]);

    const updateWidth = () => {
        if (iconsRef.current && containerRef.current) {
            const contentWidth = iconsRef.current.scrollWidth;
            const containerWidth = containerRef.current.clientWidth;
            const calculatedHiddenWidth = (contentWidth - containerWidth) + 20;
            if (calculatedHiddenWidth > 0) {
                setHiddenContentWidth(calculatedHiddenWidth);
                setShouldScroll(true);
            } else {
                setShouldScroll(false);
            }
        }
    };

    useLayoutEffect(() => {
        const timer = setTimeout(updateWidth, 1000);
        return () => clearTimeout(timer);
    }, [cachedIcons]);

    useLayoutEffect(() => {
        window.addEventListener('resize', updateWidth);
        return () => {
            window.removeEventListener('resize', updateWidth);
        };
    }, []);

    const animationStyle = shouldScroll ? {
        animation: `scroll-icons 20s linear infinite`,
        animationName: `scroll-${hiddenContentWidth}`,
    } : {};

    return (
        <div ref={containerRef} className={'icons-full-container card ai-fs jc-sb fc '}
             style={{flexDirection: 'row', maxWidth: '40%', overflow: 'hidden', position: 'relative'}}>
            {
                shouldScroll &&
                <style>
                    {`@keyframes scroll-${hiddenContentWidth} {
                    10%, 90% { transform: translateX(0); }
                    40%, 60% { transform: translateX(${-hiddenContentWidth}px); }
                }`}
                </style>
            }
            <div className={'icons-container fr'} ref={iconsRef}
                 style={{...animationStyle, gap: '0.5vw', top: 0, justifyContent: 'space-around'}}>
                {cachedIcons.map((icon) => (
                    <img key={icon} src={`${icon}`} alt={`Icon`}
                         style={{width: '4vw', height: '4vw', objectFit: 'contain'}}/>
                ))}
            </div>
        </div>
    );
}

export default DisplayIcons;
