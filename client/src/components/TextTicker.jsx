import React, {useLayoutEffect, useRef, useState} from 'react';

function TextTicker({text, backgroundColor, textColor, slideTime}) {
    const trackRef = useRef(null);
    const measureRef = useRef(null);
    const [shouldScroll, setShouldScroll] = useState(false);

    useLayoutEffect(() => {
        const measure = () => {
            if (!trackRef.current || !measureRef.current) return;
            const overflow = measureRef.current.scrollWidth > trackRef.current.clientWidth + 4;
            setShouldScroll(overflow);
        };

        measure();
        const timer = setTimeout(measure, 200);
        window.addEventListener('resize', measure);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', measure);
        };
    }, [text]);

    const duration = Math.max(12, (slideTime || 20) / 2);

    return (
        <div
            className="messagedefilant"
            data-scrolling={shouldScroll ? "true" : "false"}
            style={{backgroundColor, color: textColor}}
        >
            <div className="messagedefilant__info" aria-hidden="true">
                <span className="messagedefilant__info-icon">i</span>
            </div>
            <div className="messagedefilant__sep" aria-hidden="true"/>
            <div className="messagedefilant__track" ref={trackRef}>
                <span className="messagedefilant__measure" ref={measureRef}>{text}</span>
                {shouldScroll ? (
                    <div
                        className="messagedefilant__text messagedefilant__text--scroll"
                        style={{animationDuration: `${duration}s`}}
                    >
                        <span className="messagedefilant__chunk">{text}</span>
                        <span className="messagedefilant__gap" aria-hidden="true">•</span>
                        <span className="messagedefilant__chunk">{text}</span>
                        <span className="messagedefilant__gap" aria-hidden="true">•</span>
                    </div>
                ) : (
                    <div className="messagedefilant__text messagedefilant__text--static">
                        {text}
                    </div>
                )}
            </div>
        </div>
    );
}

export default TextTicker;
