import {useEffect, useState} from 'react';
import {isTimeInRange} from '../utils/timeRange';

function useDarkMode(configData) {
    const [isDarkModeActive, setIsDarkModeActive] = useState(false);

    useEffect(() => {
        let timeoutId;

        const checkDarkMode = () => {
            const ranges = (configData?.dark_mode?.ranges || []).filter((range) => range.enabled !== false);

            if (ranges.length === 0) {
                setIsDarkModeActive(false);
                return;
            }

            const currentDateTime = new Date();
            const isDark = ranges.some((range) => isTimeInRange(range.start, range.end, currentDateTime));
            setIsDarkModeActive(isDark);

            timeoutId = setTimeout(checkDarkMode, 60 * 1000);
        };

        checkDarkMode();

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [configData]);

    return isDarkModeActive;
}

export default useDarkMode;
