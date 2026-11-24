// Folia 歌词动效 —— 正在播放页的两个面
//
// 舞台（stage）= 移植自 Folia 的歌词动效；Lattice = 队列海报墙（见 lattice.tsx）。
// 这条视图**不再自绘控制条**：样式/背景/选项全在走带控制的那颗按钮 + 浮窗里
// （见 control.tsx）。页面上只留一颗返回钮（Folia 播放页同款，悬停出现、静止淡出）。
//
// 交互与 Folia 本体对齐：
//   · 点歌词行跳转（带 lyricDelay 补偿）；
//   · Space / K 播放暂停；← / → 快退/快进 5 秒；H 隐藏/显示播放条（Folia 的 KeyH）；
//   · 自动隐藏：开启后指针静止 3.2 秒收起宿主播放条，一动就回来；
//   · Esc 收起本页由宿主统一处理（NowPlaying 的 Escape 监听），这里不抢。
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motionValue } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import type { SparkleNpViewCtx, SparkleSongSnapshot, SparkleStorage } from "@quaver/sparkle";
import VisualizerRenderer from "./vendor/Folia/src/components/visualizer/VisualizerRenderer";
import type { Line, Theme } from "./vendor/Folia/src/types";
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
} from "./data";
import type { FoliaBackgroundId, FoliaModeId } from "./catalog";
import { LatticeWall } from "./lattice";
import { bindFoliaStorage, useFoliaPrefs, writeFoliaPref } from "./prefs";

interface FoliaViewProps {
    np: SparkleNpViewCtx;
    storage: SparkleStorage;
    /** 收起正在播放页（保留动效开关，下次展开还是 Folia） */
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

const isTyping = (target: EventTarget | null): boolean => {
    const el = target instanceof HTMLElement ? target : null;

    return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
};

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
    staticMode,
    translation,
    fontScale,
    chromeHidden,
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
    staticMode: boolean;
    translation: boolean;
    fontScale: number;
    chromeHidden: boolean;
    onSeek: (seconds: number) => void;
}) {
    const artist = (song?.singer ?? []).map(x => x.name).filter(Boolean).join(' / ') || null;
    // 商籁 / 凝彩 的字号基准公式不同（商籁按词数摊、凝彩按字数摊），一个倍数没法同时对上，
    // 所以各给一档，让两边的主歌词都落在浮名的量级上。其余样式保持 Folia 的默认比例。
    // 倍率只作用在特效歌词上，底部字幕另算（见各样式里的 resolveSubtitleFontSizes）。
    const lyricScale = (mode === 'sonnet' || mode === 'tempera' ? 0.3 : 1) * fontScale;

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
                    staticMode={staticMode}
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
                    isPlayerChromeHidden={chromeHidden}
                    hideTranslationSubtitle={!translation}
                    showSubtitleTranslation={translation}
                    subtitleContentMode="translation"
                    subtitleOverlayLayout={translation ? 'current+translation' : 'current'}
                    isPreviewMode
                    animateStyleSwitch
                    onLyricLineSeek={onSeek}
                />
            </React.Suspense>
        </StageBoundary>
    );
});

export function FoliaView({ np, storage, onCollapse }: FoliaViewProps) {
    bindFoliaStorage(storage);

    const prefs = useFoliaPrefs();
    const [song, setSong] = useState<SparkleSongSnapshot | null>(() => np.current());
    const [lines, setLines] = useState<Line[]>(EMPTY_LINES);
    const [lineIndex, setLineIndex] = useState(-1);
    const [theme, setTheme] = useState<Theme>(() => readTheme());
    const [duration, setDuration] = useState(0);
    const [paused, setPaused] = useState(false);
    const [expanded, setExpanded] = useState(() => np.expanded());
    const [chromeHidden, setChromeHidden] = useState(false);

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

    // —— 宿主态同步（换曲 / 歌词 / 时长 / 暂停 / 展开） ——
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
            setExpanded(prev => prev === np.expanded() ? prev : np.expanded());
        };

        sync();
        return np.onNotify(sync);
    }, [np]);

    // —— 真实音频频谱（宿主门面；不可用就静默跳过） ——
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

    // —— 歌词时钟（自驱 rAF；Lattice 与收起态不跑） ——
    useEffect(() => {
        if (prefs.surface === 'lattice') return;

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
    }, [currentTime, np, prefs.surface]);

    const cover = useMemo(() => coverFor(song), [song]);
    const seed = song?.mid ?? '';
    const seek = useMemo(
        () => (seconds: number) => np.seek(seconds + (np.lyricDelay?.() ?? 0) / 1000, { immediate: true }),
        [np],
    );

    // —— 播放条显隐：只在「本页真的展开 + 用户/自动隐藏」时挂 body 标记 ——
    // 收起到别的页面时插件视图仍然挂载（syncNpView 的语义），所以不能只按 chromeHidden
    // 写 body class —— 那会把播放条在全站藏掉。
    useEffect(() => {
        const on = expanded && chromeHidden;
        document.body.classList.toggle('fvr-bar-hidden', on);

        return () => document.body.classList.remove('fvr-bar-hidden');
    }, [expanded, chromeHidden]);

    // —— 自动隐藏（Folia 的 autoHidePlayerChrome）：静止 3.2 秒收起，指针/键盘一动就回来 ——
    useEffect(() => {
        if (!prefs.autoHideChrome) {
            setChromeHidden(false);

            return;
        }

        let timer = 0;
        const wake = () => {
            setChromeHidden(false);
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                // 宿主的走带浮窗开着时不收：浮窗就挂在播放条里，收起播放条等于把用户
                // 正在点的面板一起藏掉（宿主在任意走带浮窗打开时挂 body.sparkle-pop-open）。
                if (document.body.classList.contains('sparkle-pop-open')) return;
                setChromeHidden(true);
            }, 3200);
        };

        wake();
        window.addEventListener('pointermove', wake, { passive: true });
        window.addEventListener('pointerdown', wake, { passive: true });
        window.addEventListener('keydown', wake);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('pointermove', wake);
            window.removeEventListener('pointerdown', wake);
            window.removeEventListener('keydown', wake);
        };
    }, [prefs.autoHideChrome]);

    // —— 键盘交互（只在舞台上；Lattice 有自己的导航） ——
    useEffect(() => {
        if (prefs.surface !== 'stage') return;

        const seekBy = (delta: number) => {
            const total = np.duration();
            const next = Math.max(0, total > 0 ? Math.min(total, np.time() + delta) : np.time() + delta);
            np.seek(next, { immediate: true });
        };

        const onKey = (event: KeyboardEvent) => {
            if (event.defaultPrevented || isTyping(event.target)) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;

            const key = event.key.toLowerCase();

            if (event.key === ' ' || key === 'k') {
                event.preventDefault();
                np.toggle();
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                seekBy(-5);
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                seekBy(5);
            } else if (key === 'h') {
                event.preventDefault();
                setChromeHidden(hidden => !hidden);
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [np, prefs.surface]);

    const wake = () => setChromeHidden(false);

    if (prefs.surface === 'lattice') {
        return (
            <div className={`fvr${chromeHidden ? ' is-idle' : ''}`} onPointerMove={wake} onPointerDown={wake}>
                <div className="fvr-drag" aria-hidden="true" />
                <LatticeWall np={np} onBack={() => writeFoliaPref('surface', 'stage')} />
            </div>
        );
    }

    return (
        <div className={`fvr${chromeHidden ? ' is-idle' : ''}`} onPointerMove={wake} onPointerDown={wake}>
            <div className="fvr-drag" aria-hidden="true" />

            <Stage
                mode={prefs.style}
                backgroundMode={prefs.background}
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
                staticMode={prefs.staticMode}
                translation={prefs.translation}
                fontScale={prefs.fontScale}
                chromeHidden={chromeHidden}
                onSeek={seek}
            />

            {/* 唯一的页面内控件：返回（Folia 播放页同款）。样式/背景在走带控制的浮窗里。 */}
            <div className={`fvr-chrome${chromeHidden ? ' fvr-chrome-hidden' : ''}`}>
                <button type="button" className="fvr-back" onClick={onCollapse} data-tooltip="收起播放页（Esc）" aria-label="收起播放页">
                    <ChevronLeft size={18} />
                </button>
                <span className="fvr-keyhint">H 隐藏播放条 · ←/→ 快退/快进 5s</span>
            </div>
        </div>
    );
}
