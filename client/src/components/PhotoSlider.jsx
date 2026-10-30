import React, {useCallback, useEffect, useRef, useState} from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import config from '../config.js';
import {cacheImages, getCachedImage} from '../utils/cacheUtils.js';
import MeteoViewer from './MeteoViewer.jsx';

const VALID_CORNERS = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right']);

function PhotoSlider({photos, interval, hideDots, screen}) {
    const [cachedPhotos, setCachedPhotos] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const hasDirections = screen.directions?.length > 0;
    const hasMeteo = Boolean(screen.meteo && Object.keys(screen.meteo.data || {}).length > 0);
    const meteoCorner = VALID_CORNERS.has(screen.config?.meteo_corner)
        ? screen.config.meteo_corner
        : 'top-left';
    const delayRef = useRef((interval || 10) * 1000);
    delayRef.current = (interval || 10) * 1000;
    const autoplayRef = useRef(
        Autoplay({
            delay: (scrollSnaps) => scrollSnaps.map(() => delayRef.current),
            stopOnInteraction: false
        })
    );

    const [emblaRef, emblaApi] = useEmblaCarousel(
        {loop: true, duration: 25},
        [autoplayRef.current]
    );

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        emblaApi.on('select', onSelect);
        emblaApi.on('reInit', onSelect);
        return () => {
            emblaApi.off('select', onSelect);
            emblaApi.off('reInit', onSelect);
        };
    }, [emblaApi, onSelect]);

    useEffect(() => {
        const objectUrls = [];
        let cancelled = false;

        async function cacheAndLoadImages() {
            if (!photos?.length) {
                setCachedPhotos([]);
                return;
            }

            await cacheImages(photos);
            const loadedPhotos = await Promise.all(photos.map(async (photo) => {
                const cachedImage = await getCachedImage(photo._id);
                if (cachedImage) {
                    const url = URL.createObjectURL(cachedImage);
                    objectUrls.push(url);
                    return url;
                }
                return `${(photo.where === 'server' ? config.serverUrl : '') + '/' + photo.value}`;
            }));

            if (!cancelled) {
                setCachedPhotos(loadedPhotos);
            }
        }

        cacheAndLoadImages();

        return () => {
            cancelled = true;
            objectUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [photos]);

    useEffect(() => {
        emblaApi?.reInit();
    }, [emblaApi, cachedPhotos]);

    return (
        <div
            className="display-gallery"
            data-has-directions={hasDirections ? "true" : "false"}
            data-hide-dots={hideDots ? "true" : "false"}
        >
            <div className="display-gallery__viewport" ref={emblaRef}>
                <div className="display-gallery__container">
                    {cachedPhotos.map((photo, index) => (
                        <div key={photo} className="display-gallery__slide">
                            <img src={photo} alt={`Slide ${index + 1}`} className="display-gallery__img"/>
                        </div>
                    ))}
                </div>
            </div>
            {!hideDots && cachedPhotos.length > 1 && (
                <div className="display-gallery__dots" aria-hidden="true">
                    {cachedPhotos.map((photo, index) => (
                        <button
                            key={photo}
                            type="button"
                            className="display-gallery__dot"
                            data-active={index === selectedIndex ? "true" : "false"}
                            onClick={() => emblaApi?.scrollTo(index)}
                        />
                    ))}
                </div>
            )}
            {hasMeteo && (
                <div className="display-meteo-card" data-corner={meteoCorner}>
                    <MeteoViewer screen={screen}/>
                </div>
            )}
        </div>
    );
}

export default PhotoSlider;
