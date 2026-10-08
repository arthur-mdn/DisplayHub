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
        if (!iconsRef.current || !containerRef.current) return;

        const contentWidth = iconsRef.current.scrollWidth;
        const containerWidth = containerRef.current.clientWidth;
        const overflow = contentWidth - containerWidth;

        if (overflow > 2) {
            setHiddenContentWidth(overflow);
            setShouldScroll(true);
        } else {
            setHiddenContentWidth(0);
            setShouldScroll(false);
        }
    };

    useLayoutEffect(() => {
        updateWidth();
        const timer = setTimeout(updateWidth, 50);
        const timer2 = setTimeout(updateWidth, 300);

        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => updateWidth())
            : null;
        if (observer && containerRef.current) {
            observer.observe(containerRef.current);
        }
        if (observer && iconsRef.current) {
            observer.observe(iconsRef.current);
        }

        window.addEventListener('resize', updateWidth);
        return () => {
            clearTimeout(timer);
            clearTimeout(timer2);
            observer?.disconnect();
            window.removeEventListener('resize', updateWidth);
        };
    }, [cachedIcons]);

    const animationStyle = shouldScroll ? {
        animation: `scroll-icons 20s linear infinite`,
        animationName: `scroll-icons-${Math.round(hiddenContentWidth)}`,
    } : undefined;

    return (
        <div
            ref={containerRef}
            className="display-icons"
            data-scrolling={shouldScroll ? 'true' : 'false'}
            style={{'--icon-count': icons?.length || 0}}
        >
            {shouldScroll && (
                <style>
                    {`@keyframes scroll-icons-${Math.round(hiddenContentWidth)} {
                    10%, 90% { transform: translateX(0); }
                    40%, 60% { transform: translateX(${-hiddenContentWidth}px); }
                }`}
                </style>
            )}
            <div className="display-icons__track" ref={iconsRef} style={animationStyle}>
                {cachedIcons.map((icon) => (
                    <img
                        key={icon}
                        src={icon}
                        alt="Icon"
                        className="display-icons__item"
                        onLoad={updateWidth}
                    />
                ))}
            </div>
        </div>
    );
}

export default DisplayIcons;
