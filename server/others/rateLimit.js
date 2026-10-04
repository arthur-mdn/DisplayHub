const attempts = new Map();

function cleanup(key, windowMs) {
    const entry = attempts.get(key);
    if (!entry) return;
    if (Date.now() - entry.start > windowMs) {
        attempts.delete(key);
    }
}

function rateLimit({windowMs = 15 * 60 * 1000, max = 10, keyFn}) {
    return (req, res, next) => {
        const key = keyFn ? keyFn(req) : req.ip;
        cleanup(key, windowMs);

        const now = Date.now();
        let entry = attempts.get(key);
        if (!entry || now - entry.start > windowMs) {
            entry = {start: now, count: 0};
            attempts.set(key, entry);
        }

        entry.count += 1;
        if (entry.count > max) {
            return res.status(429).json({message: 'Trop de tentatives, réessayez plus tard'});
        }

        next();
    };
}

module.exports = {rateLimit};
