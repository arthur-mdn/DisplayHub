import {useEffect, useRef, useState} from 'react';
import {isTimeInRange} from '../utils/timeRange';

function useTextSlides(configData) {
    const [textSlide, setTextSlide] = useState(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const checkTextSlides = () => {
            const ranges = (configData?.text_slides?.ranges || []).filter((range) => range.enabled !== false);

            if (ranges.length === 0) {
                setTextSlide(null);
                return;
            }

            const currentDateTime = new Date();
            const activeSlide = ranges.find((range) => isTimeInRange(range.start, range.end, currentDateTime));

            if (activeSlide) {
                setTextSlide({
                    text: activeSlide.text,
                    textColor: activeSlide.textColor,
                    backgroundColor: activeSlide.backgroundColor,
                    slideTime: activeSlide.slideTime
                });
            } else {
                setTextSlide(null);
            }

            const nextMinuteDelay = (60 - currentDateTime.getSeconds()) * 1000;

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(checkTextSlides, nextMinuteDelay);
        };

        checkTextSlides();

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [configData, configData?.text_slides]);

    return textSlide;
}

export default useTextSlides;
