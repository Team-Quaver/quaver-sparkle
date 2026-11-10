// Folia 歌词动效 —— the now-playing takeover view and its chrome.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motionValue } from 'framer-motion';
import { ChevronDown, ChevronLeft, Sparkles, X } from 'lucide-react';
import type { SparkleNpViewCtx, SparkleSongSnapshot, SparkleStorage } from '@quaver/sparkle';
import VisualizerRenderer from './vendor/Folia/src/components/visualizer/VisualizerRenderer';
import type { Line, Theme } from './vendor/Folia/src/types';
import {
    DEFAULT_TUNINGS,
    bandLevels,
    coverFor,
    findLineIndex,
    isDaylight,
    linesFor,
    lyricSignature,
    lyricTime,
    readTheme,
    themeKey,
    type AudioBandValues,
} from './data';
import { FOLIA_BACKGROUNDS, FOLIA_MODES, isBackground, isMode, labelOf, type FoliaBackgroundId, type FoliaModeId } from './catalog';

interface FoliaViewProps {
    np: SparkleNpViewCtx;
    storage: SparkleStorage;
    /** Disable the effect and return to the default now-playing page. */
    onExit: () => void;
    /** Collapse the now-playing page, keeping the effect enabled for next time. */
    onCollapse: () => void;
}

const EMPTY_LINES: Line[] = [];

const smooth = (value: number, next: number) => value + (next - value) * 0.24;

class StageBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: unknown) {
        console.warn('[folia-visualizer] effect failed', error instanceof Error ? error.stack : error);
    }

    render() {
        return this.state.failed ? null : this.props.children;
    }
}

const Stage = React.memo(function Stage({
    mode,
    backgroundMode,
    currentTime,
    audioPower,
    audioBands,
    lines,
    lineIndex,
    theme,
    song,
    cover,
    seed,
    duration,
    paused,
    onSeek,
}: {
    mode: FoliaModeId;
    backgroundMode: FoliaBackgroundId;
    currentTime: ReturnType<typeof motionValue<number>>;
    audioPower: ReturnType<typeof motionValue<number>>;
    audioBands: AudioBandValues;
    lines: Line[];
    lineIndex: number;
    theme: Theme;
    song: SparkleSongSnapshot | null;
    cover: string;
    seed: string;
    duration: number;
    paused: boolean;
    onSeek: (seconds: number) => void;
}) {
    const artist = (song?.singer ?? []).map(x => x.name).filter(Boolean).join(' / ') || null;
    // 商籁 / 凝彩 的字号基准公式不同（商籁按词数摊、凝彩按字数摊），一个倍数没法同时对上，
    // 所以各给一档，让两边的主歌词都落在浮名的量级上。其余样式保持 Folia 的默认比例。
    // 倍率只作用在特效歌词上，底部字幕另算（见各样式里的 resolveSubtitleFontSizes）。
    const lyricScale = mode === 'sonnet' || mode === 'tempera' ? 0.3 : 1;

    return (
        <StageBoundary>
            <React.Suspense fallback={null}>
                <VisualizerRenderer
                    mode={mode}
                    visualizerTunings={DEFAULT_TUNINGS}
                    currentTime={currentTime}
                    duration={duration}
                    currentLineIndex={lineIndex}
                    lines={lines}
                    theme={theme}
                    subtitleTheme={theme}
                    isDaylight={isDaylight()}
                    audioPower={audioPower}
                    audioBands={audioBands}
                    songTitle={song?.name ?? null}
                    songArtist={artist}
                    songAlbum={song?.album?.name ?? null}
                    coverUrl={cover || null}
                    showText
                    seed={seed}
                    staticMode={false}
                    paused={paused}
                    visualizerOpacity={1}
                    background={{ mode: backgroundMode }}
                    lyricsFontScale={lyricScale}
                    subtitleFontScale={1}
                    subtitleOverlayOpacity={1}
                    subtitleOverlayBackground
                    subtitleUpcomingLyricsBlur
                    showHarmonySubtitle={false}
                    harmonySubtitleBackground={false}
                    isPlayerChromeHidden={false}
                    hideTranslationSubtitle={false}
                    showSubtitleTranslation
                    subtitleContentMode="translation"
                    subtitleOverlayLayout="current+translation"
                    isPreviewMode
                    animateStyleSwitch
                    onLyricLineSeek={onSeek}
                />
            </React.Suspense>
        </StageBoundary>
    );
});

export function FoliaView({ np, storage, onExit, onCollapse }: FoliaViewProps) {
    const [mode, setMode] = useState<FoliaModeId>(() => {
        const saved = storage.get('style') ?? '';
        return isMode(saved) ? saved : 'classic';
    });
    const [backgroundMode, setBackgroundMode] = useState<FoliaBackgroundId>(() => {
        const saved = storage.get('background') ?? '';
        return isBackground(saved) ? saved : 'latent';
    });
    const [pickerOpen, setPickerOpen] = useState(false);
    const [chromeVisible, setChromeVisible] = useState(true);
    const hideTimer = useRef<number | null>(null);
    const [song, setSong] = useState<SparkleSongSnapshot | null>(() => np.current());
    const [lines, setLines] = useState<Line[]>(EMPTY_LINES);
    const [lineIndex, setLineIndex] = useState(-1);
    const [theme, setTheme] = useState<Theme>(() => readTheme());
    const [duration, setDuration] = useState(0);
    const [paused, setPaused] = useState(false);

    const currentTime = useRef(motionValue(0)).current;
    const audioPower = useRef(motionValue(0)).current;
    const bass = useRef(motionValue(0)).current;
    const lowMid = useRef(motionValue(0)).current;
    const mid = useRef(motionValue(0)).current;
    const vocal = useRef(motionValue(0)).current;
    const treble = useRef(motionValue(0)).current;
    const spectrum = useRef(motionValue(new Uint8Array(0))).current;
    const audioBands = useMemo(() => ({ bass, lowMid, mid, vocal, treble, spectrum }), [bass, lowMid, mid, spectrum, treble, vocal]);

    const linesRef = useRef<Line[]>(EMPTY_LINES);
    const lyricSignatureRef = useRef('');
    const lineIndexRef = useRef(-1);
    const durationRef = useRef(0);
    const themeRef = useRef(themeKey(theme));
    const songRef = useRef<string | null>(null);

    useEffect(() => {
        const syncLines = () => {
            const signature = lyricSignature(np);

            if (signature === lyricSignatureRef.current) return;

            lyricSignatureRef.current = signature;
            const next = linesFor(np);
            linesRef.current = next;
            setLines(next);
        };

        const sync = () => {
            const nextSong = np.current();
            const nextKey = nextSong?.mid ?? '';

            if (nextKey !== songRef.current) {
                songRef.current = nextKey;
                setSong(nextSong);
                const nextTheme = readTheme();
                const key = themeKey(nextTheme);

                if (key !== themeRef.current) {
                    themeRef.current = key;
                    setTheme(nextTheme);
                }
            }

            syncLines();

            const nextDuration = np.duration();

            if (nextDuration !== durationRef.current) {
                durationRef.current = nextDuration;
                setDuration(nextDuration);
            }

            setPaused(prev => prev === np.paused() ? prev : np.paused());
        };

        sync();
        return np.onNotify(sync);
    }, [np]);

    useEffect(() => {
        const facade = np.spectrum?.();

        if (!facade?.onFrame) return;

        return facade.onFrame(frame => {
            const bands = bandLevels(frame);

            audioPower.set(frame.level);
            bass.set(smooth(bass.get(), bands.bass));
            lowMid.set(smooth(lowMid.get(), bands.lowMid));
            mid.set(smooth(mid.get(), bands.mid));
            vocal.set(smooth(vocal.get(), bands.vocal));
            treble.set(smooth(treble.get(), bands.treble));
            spectrum.set(bands.spectrum);
        });
    }, [np, audioPower, bass, lowMid, mid, spectrum, treble, vocal]);

    useEffect(() => {
        let raf = 0;

        const tick = () => {
            const time = lyricTime(np);
            currentTime.set(time);

            const nextIndex = findLineIndex(linesRef.current, time);

            if (nextIndex !== lineIndexRef.current) {
                lineIndexRef.current = nextIndex;
                setLineIndex(nextIndex);
            }

            raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(raf);
    }, [currentTime, np]);

    const cover = useMemo(() => coverFor(song), [song]);
    const seed = song?.mid ?? '';
    const seek = useMemo(() => (seconds: number) => np.seek(seconds + (np.lyricDelay?.() ?? 0) / 1000, { immediate: true }), [np]);

    const armHide = () => {
        if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
        if (pickerOpen) return;
        hideTimer.current = window.setTimeout(() => {
            hideTimer.current = null;
            setChromeVisible(false);
        }, 3000);
    };

    const wake = () => {
        setChromeVisible(true);
        armHide();
    };

    useEffect(() => {
        wake();
        return () => {
            if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
        };
        // The timer restarts when the picker opens/closes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pickerOpen]);

    useEffect(() => {
        // The host's own player bar is the transport inside Folia; hide it with the plugin chrome.
        document.body.classList.toggle('fvr-bar-hidden', !(chromeVisible || pickerOpen));
        return () => document.body.classList.remove('fvr-bar-hidden');
    }, [chromeVisible, pickerOpen]);

    const chooseMode = (next: FoliaModeId) => {
        setMode(next);
        storage.set('style', next);
    };

    const chooseBackground = (next: FoliaBackgroundId) => {
        setBackgroundMode(next);
        storage.set('background', next);
    };

    const stepMode = (delta: number) => {
        const index = FOLIA_MODES.findIndex(item => item.id === mode);
        chooseMode(FOLIA_MODES[(index + delta + FOLIA_MODES.length) % FOLIA_MODES.length].id);
    };

    return (
        <div className="fvr" onPointerMove={wake} onPointerDown={wake}>
            <div className="fvr-drag" aria-hidden="true" />

            <Stage
                mode={mode}
                backgroundMode={backgroundMode}
                currentTime={currentTime}
                audioPower={audioPower}
                audioBands={audioBands}
                lines={lines}
                lineIndex={lineIndex}
                theme={theme}
                song={song}
                cover={cover}
                seed={seed}
                duration={duration}
                paused={paused}
                onSeek={seek}
            />

            <div className={`fvr-toolbar fvr-chrome${chromeVisible || pickerOpen ? '' : ' fvr-chrome-hidden'}`}>
                <button type="button" className="fvr-prev" aria-label="上一个歌词动效" title="上一个歌词动效" onClick={() => stepMode(-1)}>
                    <ChevronLeft size={15} />
                </button>
                <button type="button" className="fvr-name" aria-haspopup="dialog" aria-expanded={pickerOpen} onClick={() => setPickerOpen(open => !open)}>
                    <Sparkles size={15} />
                    <span>{labelOf(mode)}</span>
                </button>
                <button type="button" className="fvr-next" aria-label="下一个歌词动效" title="下一个歌词动效" onClick={() => stepMode(1)}>
                    <ChevronLeft size={15} />
                </button>
                <button type="button" aria-label="收回正在播放页" title="收回正在播放页" onClick={onCollapse}>
                    <ChevronDown size={15} />
                </button>
            </div>

            {pickerOpen && (
                <div className="fvr-picker" role="dialog" aria-modal="true" aria-label="歌词动效" onClick={event => { if (event.target === event.currentTarget) setPickerOpen(false); }}>
                    <div className="fvr-panel">
                        <header className="fvr-head">
                            <div>
                                <b>歌词动效</b>
                                <small>Folia Major · 全套 {FOLIA_MODES.length} 种</small>
                            </div>
                            <button type="button" className="fvr-x" aria-label="关闭" onClick={() => setPickerOpen(false)}>
                                <X size={15} />
                            </button>
                        </header>
                        <div className="fvr-grid" role="radiogroup" aria-label="歌词动效">
                            {FOLIA_MODES.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`fvr-card${item.id === mode ? ' sel' : ''}`}
                                    role="radio"
                                    aria-checked={item.id === mode}
                                    onClick={() => chooseMode(item.id)}
                                >
                                    <b>{item.label}</b>
                                    <small>{item.hint}</small>
                                </button>
                            ))}
                        </div>
                        <div className="fvr-bgs">
                            <span>背景</span>
                            <div className="fvr-bg-list" role="radiogroup" aria-label="背景">
                                {FOLIA_BACKGROUNDS.map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={`fvr-bg${item.id === backgroundMode ? ' sel' : ''}`}
                                        role="radio"
                                        aria-checked={item.id === backgroundMode}
                                        onClick={() => chooseBackground(item.id)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="fvr-foot">
                            <button type="button" className="fvr-foot-danger" onClick={onExit}>关闭歌词动效</button>
                            <button type="button" className="fvr-foot-quiet" onClick={onCollapse}>收回播放页</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
