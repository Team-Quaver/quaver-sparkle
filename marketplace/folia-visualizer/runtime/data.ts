// Folia 歌词动效 —— host snapshot → visualizer contracts.
import type { SparkleNpViewCtx, SparkleSongSnapshot } from '@quaver/sparkle';
import type { Line, Theme } from './vendor/Folia/src/types';
import { getVisualizerTuning } from './vendor/Folia/src/components/visualizer/tuningRegistry';
import { VISUALIZER_REGISTRY } from './vendor/Folia/src/components/visualizer/registry';

export type AudioBandValues = {
    bass: number;
    lowMid: number;
    mid: number;
    vocal: number;
    treble: number;
    spectrum: Uint8Array<ArrayBuffer>;
};

export function coverFor(song: SparkleSongSnapshot | null): string {
    if (!song) return '';

    if (song.localCover) return song.localCover;

    const base = song.album?.pmid ? song.album.pmid.split('_')[0] : song.album?.mid;

    if (!base) return '';

    // 1024 is not one of QQ's real cover sizes; 800 is, and the relay keeps canvas colour
    // extraction same-origin (the CDN sends no Access-Control-Allow-Origin).
    const raw = `https://y.gtimg.cn/music/photo_new/T002R800x800M000${base}.jpg`;

    return `/api/img?u=${encodeURIComponent(raw)}`;
}

const LINE_TOKEN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[A-Za-z0-9]+(?:['’][A-Za-z]+)?|\s+|./gu;

/** LRC lines have no word timeline. Give the visualizer synthetic word units so word-level
 *  effects still have something to reveal, while keeping the text identical when joined. */
const splitLineWords = (text: string, start: number, end: number): Line['words'] => {
    const tokens = text.match(LINE_TOKEN)?.filter(Boolean) ?? [text];
    if (tokens.length <= 1) {
        return [{ text, startTime: start, endTime: end }];
    }

    const weights = tokens.map(token => /\s/.test(token) ? 0.25 : Math.max(1, Array.from(token).length));
    const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    let cursor = start;

    return tokens.map((token, index) => {
        const duration = Math.max(0.001, (end - start) * (weights[index] ?? 1) / total);
        const word = { text: token, startTime: cursor, endTime: index === tokens.length - 1 ? end : cursor + duration };
        cursor = word.endTime;
        return word;
    });
};

export function linesFor(np: SparkleNpViewCtx): Line[] {
    // The host keeps parsed QRC/TTML in karaoke() even when its provider flag says inactive;
    // word timing is what these styles animate, so prefer it whenever it exists.
    if (np.karaoke().length > 0) {
        const aux = np.lyricAux();

        return np.karaoke().map((line, index) => ({
            id: `kara-${index}`,
            words: line.words.map(word => ({
                text: word.word,
                startTime: word.startTime / 1000,
                endTime: word.endTime / 1000,
            })),
            startTime: line.startTime / 1000,
            endTime: line.endTime / 1000,
            fullText: line.words.map(word => word.word).join(''),
            translation: aux === 'off' ? undefined : aux === 'romanization'
                ? line.romanLyric || line.translatedLyric
                : line.translatedLyric || line.romanLyric,
            romanization: line.romanLyric,
        }));
    }

    const lines = np.lyrics();

    return lines.map((line, index) => {
        const start = line.t;
        const next = lines[index + 1]?.t;
        const end = Math.max(start + 0.01, next ?? start + 4);

        return {
            id: `lrc-${index}`,
            words: splitLineWords(line.text, start, end),
            startTime: start,
            endTime: end,
            fullText: line.text,
            translation: line.trans,
        };
    });
}


/** Cheap content fingerprint: the host's lyrics() builds a new array every call (4Hz notify). */
export function lyricSignature(np: SparkleNpViewCtx): string {
    let hash = 2166136261;
    const mix = (value: number) => {
        hash = Math.imul(hash ^ value, 16777619);
    };
    const mixText = (text: string | undefined) => {
        for (let i = 0; i < (text?.length ?? 0); i += 1) mix(text!.charCodeAt(i));
        mix(text?.length ?? 0);
    };
    const karaoke = np.karaoke();
    const active = np.karaokeActive() && karaoke.length > 0;

    mixText(np.lyricAux());
    mix(active ? 1 : 0);

    if (active) {
        mix(karaoke.length);
        for (const line of karaoke) {
            mix(line.startTime);
            mix(line.endTime);
            mixText(line.translatedLyric);
            mixText(line.romanLyric);
            mix(line.words.length);
            for (const word of line.words) {
                mix(word.startTime);
                mix(word.endTime);
                mixText(word.word);
            }
        }
        return `${hash >>> 0}|k`;
    }

    const lines = np.lyrics();
    mix(lines.length);
    for (const line of lines) {
        mix(line.t * 1000);
        mixText(line.text);
        mixText(line.trans);
    }

    return `${hash >>> 0}|l`;
}

export function lyricTime(np: SparkleNpViewCtx): number {
    return Math.max(0, np.time() - (np.lyricDelay?.() ?? 0) / 1000);
}

export function findLineIndex(lines: Line[], time: number): number {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
        const line = lines[index];

        if (!line || time < line.startTime) continue;

        if (time <= (line.renderHints?.renderEndTime ?? line.endTime)) return index;
    }

    return -1;
}

export function readTheme(): Theme {
    const style = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;

    return {
        name: 'Quaver',
        backgroundColor: read('--bg', '#131417'),
        primaryColor: read('--ink', '#ffffff'),
        accentColor: read('--cvg-accent', read('--cyan', '#19c2d8')),
        secondaryColor: read('--ink2', '#a6adb8'),
        fontStyle: 'sans',
        fontFamily: read('--font-lyric', read('--font-default', '')),
        animationIntensity: 'normal',
    };
}

export function themeKey(theme: Theme): string {
    return [theme.backgroundColor, theme.primaryColor, theme.accentColor, theme.secondaryColor, theme.fontFamily].join('|');
}

export function isDaylight(): boolean {
    return document.documentElement.dataset.theme === 'light';
}

export function bandLevels(frame: { bins: Float32Array; sampleRate: number; level: number } | null): AudioBandValues {
    if (!frame || frame.bins.length === 0) {
        return { bass: 0, lowMid: 0, mid: 0, vocal: 0, treble: 0, spectrum: new Uint8Array(0) };
    }

    const { bins, sampleRate } = frame;
    const hzPerBin = sampleRate / 2 / bins.length;
    const pick = (from: number, to: number) => {
        const start = Math.max(1, Math.floor(from / hzPerBin));
        const end = Math.min(bins.length, Math.max(start + 1, Math.ceil(to / hzPerBin)));
        let sum = 0;

        for (let i = start; i < end; i += 1) sum += bins[i] ?? 0;

        return Math.min(1, Math.sqrt(sum / Math.max(1, end - start)));
    };
    const spectrum = new Uint8Array(bins.length);

    for (let i = 0; i < bins.length; i += 1) spectrum[i] = Math.round(Math.min(1, bins[i] ?? 0) * 255);

    return {
        bass: pick(20, 150),
        lowMid: pick(150, 400),
        mid: pick(400, 1200),
        vocal: pick(1000, 3500),
        treble: pick(3500, Math.min(16000, sampleRate / 2)),
        spectrum,
    };
}

export const DEFAULT_TUNINGS: Record<string, unknown> = Object.fromEntries(
    VISUALIZER_REGISTRY.map(entry => {
        const adapter = getVisualizerTuning(entry.mode);
        return [entry.mode, adapter ? adapter.read(undefined) : undefined];
    }).filter(([, value]) => value !== undefined),
);

export function formatClock(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

    const whole = Math.floor(seconds);

    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
