import {useLayoutEffect, useRef, useState} from "react";

function DirectionsViewer({screen}) {
    const directionsRef = useRef(null);
    const containerRef = useRef(null);
    const [hiddenContentHeight, setHiddenContentHeight] = useState(0);
    const [shouldScroll, setShouldScroll] = useState(false);
    const count = screen.directions?.length || 0;
    const hasPhotos = screen.photos?.length > 0;

    const updateHeight = () => {
        if (directionsRef.current && containerRef.current) {
            const contentHeight = directionsRef.current.scrollHeight;
            const containerHeight = containerRef.current.clientHeight;
            const calculatedHiddenHeight = contentHeight - containerHeight;
            if (calculatedHiddenHeight > 0) {
                setHiddenContentHeight(calculatedHiddenHeight);
                setShouldScroll(true);
            } else {
                setShouldScroll(false);
            }
        }
    };

    useLayoutEffect(() => {
        const timer = setTimeout(updateHeight, 400);
        return () => clearTimeout(timer);
    }, [screen, count]);

    useLayoutEffect(() => {
        window.addEventListener('resize', updateHeight);
        return () => {
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    const animationStyle = shouldScroll ? {
        animation: `scroll-directions 20s linear infinite`,
        animationName: `scroll-${hiddenContentHeight}`,
    } : {};

    return (
        <div
            ref={containerRef}
            className="display-directions"
            data-has-photos={hasPhotos ? "true" : "false"}
            data-scrolling={shouldScroll ? "true" : "false"}
            style={{'--dir-count': count}}
        >
            {shouldScroll && (
                <style>
                    {`@keyframes scroll-${hiddenContentHeight} {
                    10%, 90% { transform: translateY(0); }
                    40%, 60% { transform: translateY(${-hiddenContentHeight}px); }
                }`}
                </style>
            )}

            <div className="display-directions__list" ref={directionsRef} style={animationStyle}>
                {screen.directions.map((direction, index) => (
                    <div className="display-direction" key={index}>
                        <img
                            src={`/elements/arrows/${direction.arrow.style}`}
                            alt="Flèche"
                            style={{transform: `rotate(${direction.arrow.orientation}deg)`}}
                            className="display-direction__arrow"
                        />
                        <div className="display-direction__sep" aria-hidden="true"/>
                        <div className="display-direction__text">
                            <h3
                                className="display-direction__title"
                                style={{
                                    color: direction.title.color === "#000000" ? undefined : direction.title.color
                                }}
                            >
                                {direction.title.text}
                            </h3>
                            {direction.description ? (
                                <p className="display-direction__subtitle">{direction.description}</p>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default DirectionsViewer;
