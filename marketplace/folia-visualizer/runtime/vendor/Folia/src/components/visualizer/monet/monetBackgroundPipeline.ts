import type { MonetBackgroundImage, MonetBackgroundTuning, Theme } from '../../../types';
import type { MonetBackgroundPaintRequest } from './monetBackground.worker';
import { MONET_BACKGROUND_HEIGHT, MONET_BACKGROUND_WIDTH, paintMonetBackground } from './monetBackgroundPaint';

// src/components/visualizer/monet/monetBackgroundPipeline.ts
// Builds and caches the static Monet poster background so the visualizer only recomputes when inputs change.
// The picture is painted in a worker (monetBackground.worker.ts); this thread only loads the image
// and hands it over.
interface PictureEntry {
    url: Promise<string | null>;
    /** Layers that still want the picture: one no one wants by its turn in the worker is not made. */
    holders: number;
}

const monetBackgroundCache = new Map<string, PictureEntry>();

interface BuildMonetBackgroundOptions {
    coverUrl?: string | null;
    monetBackgroundImage?: MonetBackgroundImage | null;
    theme: Theme;
    tuning: MonetBackgroundTuning;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const resolveSourceUrl = ({
    coverUrl,
    monetBackgroundImage,
    tuning,
}: Pick<BuildMonetBackgroundOptions, 'coverUrl' | 'monetBackgroundImage' | 'tuning'>) => (
    tuning.backgroundSource === 'uploaded-global'
        ? monetBackgroundImage?.url ?? coverUrl ?? null
        : coverUrl ?? monetBackgroundImage?.url ?? null
);

const loadImage = async (src: string): Promise<HTMLImageElement> => {
    const image = new Image();
    if (src.startsWith('http://') || src.startsWith('https://')) {
        image.crossOrigin = 'anonymous';
    }
    image.decoding = 'async';
    
    // Create a promise for the fallback load event
    const loadPromise = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    });

    image.src = src;

    try {
        await image.decode();
    } catch (e) {
        // Fallback to waiting for onload if decode() fails or is unsupported
        await loadPromise;
    }
    
    return image;
};

export const getMonetBackgroundCacheKey = ({
    coverUrl,
    monetBackgroundImage,
    theme,
    tuning,
}: BuildMonetBackgroundOptions) => JSON.stringify({
    sourceUrl: resolveSourceUrl({ coverUrl, monetBackgroundImage, tuning }),
    uploadedId: tuning.backgroundSource === 'uploaded-global' ? monetBackgroundImage?.id ?? null : null,
    theme: {
        backgroundColor: theme.backgroundColor,
        primaryColor: theme.primaryColor,
        accentColor: theme.accentColor,
    },
    tuning: {
        backgroundSource: tuning.backgroundSource,
        backgroundBlurPx: tuning.backgroundBlurPx,
        backgroundOverlayOpacity: tuning.backgroundOverlayOpacity,
        backgroundGrayscale: tuning.backgroundGrayscale,
        backgroundSaturation: tuning.backgroundSaturation,
        backgroundWash: tuning.backgroundWash,
        backgroundWashColorMode: tuning.backgroundWashColorMode,
        backgroundWashCustomColor: tuning.backgroundWashCustomColor,
        // Drift is a DOM-side transform and never reaches the bitmap, so it stays out of the key
        // the same way backgroundLayout does; streaks are baked in and must invalidate it.
        backgroundStreaksEnabled: tuning.backgroundStreaksEnabled,
    },
});

let isCanvasFilterSupportedCached: boolean | null = null;

/**
 * Checks if the browser's Canvas 2D context actually supports and applies the filter property.
 * This handles cases like iOS Safari where ctx.filter is defined but silently does nothing.
 */
export const checkCanvasFilterSupport = (): boolean => {
    if (isCanvasFilterSupportedCached !== null) {
        return isCanvasFilterSupportedCached;
    }
    if (typeof document === 'undefined') {
        return false;
    }
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 2;
        const ctx = canvas.getContext('2d');
        if (!ctx || typeof ctx.filter !== 'string') {
            isCanvasFilterSupportedCached = false;
            if (import.meta.env.DEV) {
                console.log('[MonetBackground] Canvas filter support detection: Unsupported (ctx.filter is missing)');
            }
            return false;
        }
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 2, 2);
        ctx.filter = 'blur(1px)';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1, 1);
        const imgData = ctx.getImageData(1, 1, 1, 1);
        isCanvasFilterSupportedCached = imgData.data[0] > 0;
        if (import.meta.env.DEV) {
            console.log(`[MonetBackground] Canvas filter support detection: ${isCanvasFilterSupportedCached ? 'Supported (native)' : 'Unsupported (CSS blur fallback will be used)'}`);
        }
        return isCanvasFilterSupportedCached;
    } catch (e) {
        isCanvasFilterSupportedCached = false;
        if (import.meta.env.DEV) {
            console.log('[MonetBackground] Canvas filter support detection failed:', e);
        }
        return false;
    }
};

interface PaintJob {
    request: Omit<MonetBackgroundPaintRequest, 'id'>;
    /** Whether a layer still wants the picture, asked when its turn comes. */
    wanted: () => boolean;
    /** The picture, null where it could not be made, undefined where no one wanted it any more. */
    settle: (picture: Blob | null | undefined) => void;
}

// Quaver plugin port: the Marketplace install is a single JS file, so the upstream worker
// cannot be shipped as a sibling asset. Paint on the main thread instead; this is one picture
// per song change, and the cache below still keeps it off the animation loop.
const paintOffThread = async (request: PaintJob['request'], wanted: PaintJob['wanted']): Promise<Blob | null | undefined> => {
    if (!wanted()) {
        request.image.close();
        return undefined;
    }

    try {
        const canvas = new OffscreenCanvas(MONET_BACKGROUND_WIDTH, MONET_BACKGROUND_HEIGHT);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('no 2D context');
        paintMonetBackground(context, request.image, request.colors, request.tuning, request.blurPx);
        return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
    } catch {
        return null;
    } finally {
        request.image.close();
    }
};

/** The picture's blob URL; null where it could not be made, undefined where no one wanted it by its turn. */
const buildMonetBackgroundUrl = async ({
    coverUrl,
    monetBackgroundImage,
    theme,
    tuning,
}: BuildMonetBackgroundOptions, wanted: PaintJob['wanted']): Promise<string | null | undefined> => {
    const sourceUrl = resolveSourceUrl({ coverUrl, monetBackgroundImage, tuning });
    if (!sourceUrl) {
        return null;
    }

    const image = await createImageBitmap(await loadImage(sourceUrl));
    const picture = await paintOffThread({
        image,
        colors: {
            backgroundColor: theme.backgroundColor,
            primaryColor: theme.primaryColor,
            accentColor: theme.accentColor,
        },
        tuning,
        blurPx: checkCanvasFilterSupport() ? clamp(tuning.backgroundBlurPx, 0, 60) : null,
    }, wanted);
    if (!picture) {
        return picture;
    }

    const url = URL.createObjectURL(picture);
    // Decoded (off this thread) before it is handed over: the background says it is ready only once
    // its picture can be drawn.
    const decoded = new Image();
    decoded.src = url;
    try {
        await decoded.decode();
    } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
    }
    return url;
};

/**
 * The picture for these inputs, made once and kept. The caller releases it once it no longer wants
 * it: a picture no one wants by its turn in the worker is not made, and is made if asked for again.
 */
export const wantMonetBackgroundUrl = (options: BuildMonetBackgroundOptions): { url: Promise<string | null>; release: () => void } => {
    const cacheKey = getMonetBackgroundCacheKey(options);
    let entry = monetBackgroundCache.get(cacheKey);
    if (!entry) {
        const made: PictureEntry = { url: Promise.resolve(null), holders: 0 };
        const wanted = () => {
            if (made.holders > 0) {
                return true;
            }
            if (monetBackgroundCache.get(cacheKey) === made) {
                monetBackgroundCache.delete(cacheKey);
            }
            return false;
        };
        made.url = buildMonetBackgroundUrl(options, wanted).then(url => url ?? null, () => null);
        monetBackgroundCache.set(cacheKey, made);
        entry = made;
    }
    const held = entry;
    held.holders += 1;
    let released = false;
    return {
        url: held.url,
        release: () => {
            if (!released) {
                released = true;
                held.holders -= 1;
            }
        },
    };
};
