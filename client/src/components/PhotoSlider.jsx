import React, {useEffect, useState} from 'react';
import SlickSlider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import config from '../config.js';
import {cacheImages, getCachedImage} from '../utils/cacheUtils.js';
import MeteoViewer from './MeteoViewer.jsx';

const Slider = SlickSlider.default || SlickSlider;

const VALID_CORNERS = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right']);

function PhotoSlider({photos, interval, hideDots, screen}) {
    const [cachedPhotos, setCachedPhotos] = useState([]);
    const hasDirections = screen.directions?.length > 0;
    const hasMeteo = Boolean(screen.meteo && Object.keys(screen.meteo.data || {}).length > 0);
    const meteoCorner = VALID_CORNERS.has(screen.config?.meteo_corner)
        ? screen.config.meteo_corner
        : 'top-left';

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

    const settings = {
        dots: !hideDots,
        infinite: true,
        arrows: false,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: (interval || 10) * 1000
    };

    return (
        <div
            className="display-gallery"
            data-has-directions={hasDirections ? "true" : "false"}
            data-hide-dots={hideDots ? "true" : "false"}
        >
            <Slider {...settings}>
                {cachedPhotos.map((photo, index) => (
                    <div key={index} className="display-gallery__slide">
                        <img src={photo} alt={`Slide ${index}`} className="display-gallery__img"/>
                    </div>
                ))}
            </Slider>
            {hasMeteo && (
                <div className="display-meteo-card" data-corner={meteoCorner}>
                    <MeteoViewer screen={screen}/>
                </div>
            )}
        </div>
    );
}

export default PhotoSlider;
