import config from '../config';
import {openDB, deleteDB} from 'idb';

export async function deleteDatabases() {
    try {
        await deleteDB('ImageCache', {
            blocked() {
                console.log('Database deletion blocked');
            },
        });
        await deleteDB('LogoCache', {
            blocked() {
                console.log('Database deletion blocked');
            },
        });
        await deleteDB('IconCache', {
            blocked() {
                console.log('Database deletion blocked');
            },
        });
        console.log('Databases deleted successfully');
    } catch (error) {
        console.error('Failed to delete databases', error);
    }
}

async function fetchAndStore(db, storeName, item) {
    try {
        const response = await fetch(`${(item.where === 'server' ? config.serverUrl : '') + '/' + item.value}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        await db.put(storeName, blob, item._id);
        return true;
    } catch (error) {
        console.error('Failed to cache media', item?._id, error);
        return false;
    }
}

async function initImagesDB() {
    return openDB('ImageCache', 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('images')) {
                db.createObjectStore('images');
            }
        },
    });
}

export async function cacheImages(photos) {
    const db = await initImagesDB();
    await Promise.allSettled(photos.map(async (photo) => {
        const cachedImage = await db.get('images', photo._id);
        if (!cachedImage) {
            await fetchAndStore(db, 'images', photo);
        }
    }));
}

export async function getCachedImage(photo) {
    const db = await initImagesDB();
    return await db.get('images', photo);
}

async function initLogosDB() {
    return openDB('LogoCache', 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('logos')) {
                db.createObjectStore('logos');
            }
        },
    });
}

export async function cacheLogo(logo) {
    if (!logo) return;
    const db = await initLogosDB();
    const cachedLogo = await db.get('logos', logo._id);
    if (!cachedLogo) {
        await fetchAndStore(db, 'logos', logo);
    }
}

export async function getCachedLogo(logo) {
    const db = await initLogosDB();
    return await db.get('logos', logo);
}

async function initIconsDB() {
    return openDB('IconCache', 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('icons')) {
                db.createObjectStore('icons');
            }
        },
    });
}

export async function cacheIcons(icons) {
    const db = await initIconsDB();
    await Promise.allSettled(icons.map(async (icon) => {
        const cachedIcon = await db.get('icons', icon._id);
        if (!cachedIcon) {
            await fetchAndStore(db, 'icons', icon);
        }
    }));
}

export async function getCachedIcon(icon) {
    const db = await initIconsDB();
    return await db.get('icons', icon);
}
