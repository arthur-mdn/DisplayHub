import {useEffect, useState} from 'react';
import config from '../config.js';
import {cacheImages, getCachedImage} from '../utils/cacheUtils.js';

function DisplayImage({image, alt, width, height, borderRadius}) {
    const [src, setSrc] = useState(null);

    useEffect(() => {
        let objectUrl;
        let cancelled = false;

        async function load() {
            if (!image) {
                setSrc(null);
                return;
            }

            await cacheImages([image]);
            const cached = await getCachedImage(image._id);
            if (cancelled) return;

            if (cached) {
                objectUrl = URL.createObjectURL(cached);
                setSrc(objectUrl);
            } else {
                setSrc(`${(image.where === 'server' ? config.serverUrl : '') + '/' + image.value}`);
            }
        }

        load();

        return () => {
            cancelled = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [image]);

    if (!src) return null;

    return (
        <img
            src={src}
            alt={alt || 'Image'}
            style={{width: width || '', height: height || '', borderRadius: borderRadius || ''}}
        />
    );
}

export default DisplayImage;
