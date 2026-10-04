function parseTimeToMinutes(time) {
    const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10));
    return (hours * 60) + minutes;
}

export function isTimeInRange(start, end, now = new Date()) {
    const currentMinutes = (now.getHours() * 60) + now.getMinutes();
    const startMinutes = parseTimeToMinutes(start);
    let endMinutes = parseTimeToMinutes(end);

    if (endMinutes === 0 && startMinutes > 0) {
        endMinutes = 24 * 60;
    }

    if (endMinutes <= startMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
