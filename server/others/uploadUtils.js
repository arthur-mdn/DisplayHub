const fs = require('fs');
const path = require('path');
const multer = require('multer');

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

const IMAGE_SIGNATURES = [
    {exts: ['.jpg', '.jpeg'], bytes: [0xFF, 0xD8, 0xFF]},
    {exts: ['.png'], bytes: [0x89, 0x50, 0x4E, 0x47]},
    {exts: ['.gif'], bytes: [0x47, 0x49, 0x46]},
    {exts: ['.webp'], bytes: [0x52, 0x49, 0x46, 0x46], offsetCheck: (buf) => buf.slice(8, 12).toString() === 'WEBP'}
];

function removeUploadedFiles(files) {
    const list = [];
    if (!files) return;
    if (Array.isArray(files)) {
        list.push(...files);
    } else if (typeof files === 'object') {
        Object.values(files).forEach((group) => {
            if (Array.isArray(group)) list.push(...group);
        });
    }
    for (const file of list) {
        if (file?.path) {
            fs.unlink(file.path, () => {});
        }
    }
}

function imageFilter(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext === '.svg' || file.mimetype === 'image/svg+xml') {
        return cb(new Error('Les fichiers SVG ne sont pas autorisés'), false);
    }
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return cb(new Error('Extension de fichier non autorisée'), false);
    }
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Seuls les fichiers image sont autorisés'), false);
    }
    cb(null, true);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.bin';
        cb(null, file.fieldname + '-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8) + safeExt);
    }
});

const upload = multer({
    storage,
    fileFilter: imageFilter,
    limits: {fileSize: MAX_FILE_SIZE}
});

function validateImageMagic(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.svg') {
        return false;
    }
    const fd = fs.openSync(filePath, 'r');
    try {
        const buf = Buffer.alloc(16);
        fs.readSync(fd, buf, 0, 16, 0);
        const signature = IMAGE_SIGNATURES.find((s) => s.exts.includes(ext));
        if (!signature) return false;
        for (let i = 0; i < signature.bytes.length; i++) {
            if (buf[i] !== signature.bytes[i]) return false;
        }
        if (signature.offsetCheck && !signature.offsetCheck(buf)) return false;
        return true;
    } finally {
        fs.closeSync(fd);
    }
}

function validateUploadedFiles(files) {
    const list = [];
    if (!files) return true;
    if (Array.isArray(files)) list.push(...files);
    else Object.values(files).forEach((group) => {
        if (Array.isArray(group)) list.push(...group);
    });

    for (const file of list) {
        if (!validateImageMagic(file.path)) {
            removeUploadedFiles(files);
            return false;
        }
    }
    return true;
}

module.exports = {
    upload,
    MAX_FILE_SIZE,
    removeUploadedFiles,
    validateUploadedFiles
};
