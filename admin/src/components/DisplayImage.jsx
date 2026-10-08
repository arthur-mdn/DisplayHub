import config from "../config.js";

function DisplayImage({ image, alt, width, height, className }) {
    return (
        <img
            className={className}
            src={(image.where === "server" ? config.serverUrl : "") + "/" + image.value}
            alt={alt || "Image"}
            style={{width: width || '', height: height || ''}}
        />
    );
}

export default DisplayImage;