import React, {useEffect, useState} from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import config from '../config.js';
import {cacheImages, getCachedImage} from '../utils/cacheUtils.js';

function PhotoSlider({photos, interval, hideDots, screen}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [cachedPhotos, setCachedPhotos] = useState([]);

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
        autoplaySpeed: interval * 1000,
        beforeChange: (current, next) => setCurrentIndex(next),
    };

    return (
        <div style={{width: screen.directions.length > 0 ? '60%' : '100%'}} className={'photos-full-container'}>
            <Slider {...settings}>
                {cachedPhotos.map((photo, index) => (
                    <div key={index} style={{width: '100%', height: '100%'}}>
                        <img src={photo} alt={`Slide ${index}`}
                             style={{width: '100%', height: '100%', objectFit: 'cover'}}/>
                    </div>
                ))}
            </Slider>
        </div>
    );
}

export default PhotoSlider;
