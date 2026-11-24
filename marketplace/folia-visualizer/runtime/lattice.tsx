// Folia 歌词动效 —— Lattice（队列海报墙）
//
// 直接搬 Folia 本体（AGPL-3.0）：
//   · 墙 = 12×8 世界格（`wallTemplates.ts` 的 4 套模板 × 4 镜像），128px 格 / 8px 缝；
//   · 正在播放的那张在墙内**原地放大成 6×6 的卡片**，同块的其余 11 张按 `BLOCK_REFLOWS`
//     重新齿轮让位（`wall.ts: layoutExpandedBlock`）—— 不是另浮一张卡；
//   · 卡片构造照 `LatticePoster` + `LatticeLyrics`：封面铺底（cover）+ 压暗层 + 角标 +
//     左上「正在播放 · 01」/ 标题 / 歌手 + 中间当前歌词行与进度点 + 底部播放 / 进度 / 打开播放页；
//   · 相机 `scale` 0.52 / 0.64 / 0.76，可拖拽平移；队列不够长时整格循环补满。
//
// 数据边界：Sparkle 插件只能经 np.songAt(offset) 按播放顺序取曲（0 = 当前），所以墙面是
// 「正在播放 + 接下来」，卡片角标只能是 01（原版的绝对队列序号拿不到）。
//
// 交互（照原版）：点海报 = 播放那张（当前那张 = 播放/暂停）；拖拽平移墙面；
//       Space 播放/暂停；Esc / Ctrl+B 回舞台；卡片控制条静止后像 Folia 一样收进阴影。
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, LocateFixed, Pause, Play, Settings2 } from "lucide-react";
import type { SparkleNpViewCtx, SparkleSongSnapshot } from "@quaver/sparkle";
import { coverFor } from "./data";
import { useFoliaPrefs } from "./prefs";
import {
    CELL, buildInstance, getLatticeGeometry, layoutExpandedBlock, layoutLattice,
    type WallInstance, type WorldGeometry,
} from "./wall";

type Song = SparkleSongSnapshot;

const songsFor = (np: SparkleNpViewCtx): Song[] => {
    const total = np.queueLength();
    const out: Song[] = [];

    for (let offset = 0; offset < total; offset++) {
        const song = np.songAt(offset);

        if (song) out.push(song);
    }

    if (!out.length) {
        const current = np.current();

        if (current) out.push(current);
    }

    return out;
};

const artistOf = (song: Song): string =>
    (song.singer ?? []).map(s => s.name).filter(Boolean).join(" / ") || song.album?.name || "未知歌手";

const fmt = (seconds: number): string => {
    const total = Math.max(0, Math.floor(seconds || 0));

    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const isTyping = (target: EventTarget | null): boolean => {
    const el = target instanceof HTMLElement ? target : null;

    return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
};

const scaleFor = (width: number): number => (width < 640 ? 0.52 : width < 1100 ? 0.64 : 0.76);

/** 当前歌词行 + 行号；逐字优先，退回行级。 */
const lyricAt = (np: SparkleNpViewCtx): { text: string; index: number; total: number } => {
    const t = np.time() - (np.lyricDelay?.() ?? 0) / 1000;

    if (np.karaokeActive()) {
        const lines = np.karaoke();

        if (lines.length) {
            let index = -1;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startTime <= t * 1000) index = i;
                else break;
            }

            const line = lines[index];

            return { text: line ? line.words.map(w => w.word).join("") : "", index, total: lines.length };
        }
    }

    const lines = np.lyrics();
    let index = -1;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].t <= t) index = i;
        else break;
    }

    return { text: index >= 0 ? lines[index].text : "", index, total: lines.length };
};

const dotWindow = (index: number, total: number): number[] => {
    if (total <= 0) return [];
    const span = Math.min(7, total);
    const start = Math.max(0, Math.min(total - span, index - Math.floor(span / 2)));

    return Array.from({ length: span }, (_, i) => start + i);
};

/** 把「正在播放」那张的实例摆到视口正中（原版打开 Lattice 时相机对焦正在播放）。 */
const homeFor = (width: number, height: number, scale: number, total: number): { x: number; y: number; scale: number } => {
    const count = Math.max(1, total);
    const geometry = getLatticeGeometry(count);
    const first = buildInstance(geometry, count, 0, 0, 0);

    if (!first) return { x: width / 2, y: height / 2, scale };

    // 对焦的是**放大后**的那张（6×6）：原版相机把正在播放的卡片摆在正中，不是它的小格。
    const grown = layoutExpandedBlock(geometry, count, first).get(first.instanceId) ?? first;

    return {
        x: width / 2 - (grown.x + grown.width / 2) * scale,
        y: height / 2 - (grown.y + grown.height / 2) * scale,
        scale,
    };
};

interface Props {
    np: SparkleNpViewCtx;
    onBack: () => void;
}

export function LatticeWall({ np, onBack }: Props) {
    const prefs = useFoliaPrefs();
    const fieldRef = useRef<HTMLDivElement>(null);
    const worldRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLSpanElement>(null);
    const cameraRef = useRef(homeFor(1280, 720, 0.76, 1));
    const homeRef = useRef(cameraRef.current);
    const totalRef = useRef(1);
    const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
    const movedRef = useRef(false);
    const seekRef = useRef(false);
    const hideTimer = useRef(0);
    const hoverRef = useRef(false);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [camera, setCamera] = useState(() => cameraRef.current);
    const [songs, setSongs] = useState<Song[]>(() => songsFor(np));
    const [paused, setPaused] = useState(() => np.paused());
    const [time, setTime] = useState(() => np.time());
    const [duration, setDuration] = useState(() => np.duration());
    const [lyric, setLyric] = useState(() => lyricAt(np));
    const [revealed, setRevealed] = useState(true);

    totalRef.current = Math.max(1, songs.length);

    // 量容器：几何/缩放/相机落点都按它算；拖拽中只改 transform，不重建 React 树。
    useEffect(() => {
        const el = fieldRef.current;

        if (!el) return;

        const measure = () => {
            const rect = el.getBoundingClientRect();
            const scale = scaleFor(rect.width);
            const home = homeFor(rect.width, rect.height, scale, totalRef.current);

            homeRef.current = home;
            setSize({ width: rect.width, height: rect.height });
            cameraRef.current = home;
            setCamera(home);

            if (worldRef.current) {
                worldRef.current.style.transform = `translate(${home.x}px, ${home.y}px) scale(${home.scale})`;
            }
        };

        measure();

        const observer = new ResizeObserver(measure);

        observer.observe(el);

        return () => observer.disconnect();
    }, []);

    // 宿主态同步（曲 / 队列 / 进度）
    useEffect(() => {
        const sync = () => {
            const mid = np.current()?.mid ?? "";
            const total = np.queueLength();

            setPaused(np.paused());
            setTime(np.time());
            setDuration(np.duration());
            setLyric(lyricAt(np));
            setSongs(prev => (prev.length === total && prev[0]?.mid === mid ? prev : songsFor(np)));
        };

        sync();

        return np.onNotify(sync);
    }, [np]);

    // 卡片展开时逐帧走歌词与进度（宿主 notify 只有 4Hz）
    useEffect(() => {
        let raf = 0;

        const tick = () => {
            setTime(np.time());
            setDuration(prev => {
                const next = np.duration();

                return prev === next ? prev : next;
            });
            setLyric(prev => {
                const next = lyricAt(np);

                return prev.text === next.text && prev.index === next.index && prev.total === next.total ? prev : next;
            });
            raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(raf);
    }, [np]);

    const geometry: WorldGeometry = useMemo(() => getLatticeGeometry(songs.length), [songs.length]);

    const expanded = useMemo<WallInstance | null>(
        () => buildInstance(geometry, Math.max(1, songs.length), 0, 0, 0),
        [geometry, songs.length],
    );

    const posters = useMemo(() => {
        const bounds = {
            left: -camera.x / camera.scale,
            top: -camera.y / camera.scale,
            right: (-camera.x + (size.width || 1280)) / camera.scale,
            bottom: (-camera.y + (size.height || 720)) / camera.scale,
        };

        return layoutLattice(geometry, songs.length, bounds, CELL * 2);
    }, [camera, geometry, size.height, size.width, songs.length]);

    const reflow = useMemo(
        () => (expanded ? layoutExpandedBlock(geometry, songs.length, expanded) : new Map()),
        [expanded, geometry, songs.length],
    );

    const applyCamera = useCallback((next: { x: number; y: number; scale: number }) => {
        cameraRef.current = next;

        if (worldRef.current) worldRef.current.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
    }, []);

    // 卡片控制条：静止 2.6 秒收进阴影，指针一动再出现（Folia 的 chrome disclosure）
    const reveal = useCallback(() => {
        setRevealed(true);
        window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => {
            // 指针还停在卡片上时不收（Folia 的 chrome disclosure：悬停保持可见）。
            if (!hoverRef.current) setRevealed(false);
        }, 2600);
    }, []);

    useEffect(() => {
        reveal();

        return () => window.clearTimeout(hideTimer.current);
    }, [reveal]);

    // 键盘：Esc / Ctrl+B 回舞台；Space 播放暂停
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.defaultPrevented || isTyping(event.target)) return;
            if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "b") {
                event.preventDefault();
                onBack();

                return;
            }

            if (event.ctrlKey || event.metaKey || event.altKey) return;

            if (event.key === "Escape") {
                event.preventDefault();
                onBack();

                return;
            }

            if (event.code === "Space") {
                event.preventDefault();
                np.toggle();
            }
        };

        window.addEventListener("keydown", onKey);

        return () => window.removeEventListener("keydown", onKey);
    }, [np, onBack]);

    const playPoster = (queueIndex: number) => {
        reveal();

        if (queueIndex === 0) {
            np.toggle();

            return;
        }

        np.jumpTo(queueIndex);
    };

    const seekFromPointer = (clientX: number) => {
        const el = progressRef.current;
        const total = duration || np.duration();

        if (!el || total <= 0) return;
        const rect = el.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

        np.seek(ratio * total, { immediate: true });
        setTime(ratio * total);
    };

    // 墙面拖拽：**不**在 pointerdown 里 setPointerCapture —— 捕获会把随后的 click 重定向到
    // 墙面，海报的点击就再也到不了（点封面跳歌失效就是这么来的）。
    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        movedRef.current = false;
        reveal();
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        reveal();

        const drag = dragRef.current;

        if (!drag || drag.id !== event.pointerId) return;

        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;

        if (!movedRef.current && Math.abs(dx) + Math.abs(dy) < 6) return;

        movedRef.current = true;
        drag.x = event.clientX;
        drag.y = event.clientY;
        const start = cameraRef.current;

        applyCamera({ ...start, x: start.x + dx, y: start.y + dy });
    };

    const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.id !== event.pointerId) return;
        dragRef.current = null;
        if (movedRef.current) setCamera({ ...cameraRef.current });
    };

    const song = songs[0] ?? np.current();
    const cover = coverFor(song);
    const pct = duration > 0 ? Math.min(1, time / duration) : 0;
    const dots = dotWindow(lyric.index, lyric.total);

    return (
        <div className={`fvr-lat${prefs.vignette ? " fvr-lat--vignette" : ""}${expanded ? " fvr-lat--expanded" : ""}`} aria-label="Folia Lattice 队列海报墙">
            <button type="button" className="fvr-lat-back" onClick={onBack} title="返回舞台（Ctrl+B）" aria-label="返回舞台">
                <ChevronLeft size={18} />
            </button>

            <div
                className="fvr-lat-field"
                ref={fieldRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onPointerLeave={onPointerUp}
            >
                <div
                    className="fvr-lat-world"
                    ref={worldRef}
                    style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }}
                >
                    {posters.map((poster: WallInstance) => {
                        const isExpanded = poster.instanceId === expanded?.instanceId;
                        const rect = reflow.get(poster.instanceId) ?? poster;
                        const item = songs[poster.queueIndex];
                        const art = item ? coverFor(item) : "";

                        return (
                            <button
                                key={poster.instanceId}
                                type="button"
                                className={`fvr-lat-poster${isExpanded ? " is-expanded" : ""}${poster.queueIndex === 0 ? " is-now" : ""}`}
                                style={{
                                    left: `${rect.x}px`,
                                    top: `${rect.y}px`,
                                    width: `${rect.width}px`,
                                    height: `${rect.height}px`,
                                    backgroundImage: art ? `url("${art}")` : undefined,
                                }}
                                onClick={(event) => {
                                    if (movedRef.current) return;
                                    if ((event.target as HTMLElement).closest(".fvr-lat-chrome, .fvr-lat-back, .fvr-lat-action")) return;
                                    if (isExpanded) {
                                        np.toggle();

                                        return;
                                    }
                                    if (item) playPoster(poster.queueIndex);
                                }}
                                onPointerEnter={() => {
                                    if (isExpanded) hoverRef.current = true;
                                    reveal();
                                }}
                                onPointerLeave={() => {
                                    if (isExpanded) hoverRef.current = false;
                                    reveal();
                                }}
                                title={item ? `${item.name} · ${artistOf(item)}` : ""}
                            >
                                <span className="fvr-lat-shade" aria-hidden="true" />
                                <span className="fvr-lat-badge">
                                    {poster.queueIndex === 0 ? "正在播放 · " : ""}
                                    {String(poster.queueIndex + 1).padStart(2, "0")}
                                </span>

                                {item && (
                                    <span className="fvr-lat-copy">
                                        <strong>{item.name}</strong>
                                        <small>{artistOf(item)}</small>
                                    </span>
                                )}

                                {isExpanded && item && (
                                    <>
                                        <span className="fvr-lat-lyrics" aria-live="polite">
                                            {dots.length > 1 && (
                                                <span className="fvr-lat-dots" aria-hidden="true">
                                                    {dots.map(i => <i key={i} className={i === lyric.index ? "on" : ""} />)}
                                                </span>
                                            )}
                                            <p>{lyric.text || "…"}</p>
                                        </span>

                                        <span className={`fvr-lat-chrome${revealed ? " is-revealed" : ""}`}>
                                            <span className="fvr-lat-transport">
                                                <button
                                                    type="button"
                                                    className="fvr-lat-play"
                                                    onClick={(event) => { event.stopPropagation(); np.toggle(); }}
                                                    title={paused ? "播放" : "暂停"}
                                                    aria-label={paused ? "播放" : "暂停"}
                                                >
                                                    {paused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
                                                </button>
                                                <span className="fvr-lat-time">{fmt(time)}</span>
                                                <span
                                                    className="fvr-lat-progress"
                                                    ref={progressRef}
                                                    role="slider"
                                                    tabIndex={0}
                                                    aria-label="播放进度"
                                                    aria-valuemin={0}
                                                    aria-valuemax={Math.round(duration)}
                                                    aria-valuenow={Math.round(time)}
                                                    onClick={(event) => { event.stopPropagation(); seekFromPointer(event.clientX); }}
                                                    onPointerDown={(event) => {
                                                        event.stopPropagation();
                                                        seekRef.current = true;
                                                        event.currentTarget.setPointerCapture(event.pointerId);
                                                        seekFromPointer(event.clientX);
                                                    }}
                                                    onPointerMove={(event) => {
                                                        if (seekRef.current) seekFromPointer(event.clientX);
                                                    }}
                                                    onPointerUp={(event) => { event.stopPropagation(); seekRef.current = false; }}
                                                    onPointerCancel={() => { seekRef.current = false; }}
                                                >
                                                    <i style={{ width: `${pct * 100}%` }} />
                                                </span>
                                                <span className="fvr-lat-time">{fmt(duration)}</span>
                                                <button
                                                    type="button"
                                                    className="fvr-lat-open"
                                                    onClick={(event) => { event.stopPropagation(); onBack(); }}
                                                    title="打开歌词动效（舞台）"
                                                    aria-label="打开歌词动效"
                                                >
                                                    <ArrowUpRight size={18} />
                                                </button>
                                            </span>
                                        </span>
                                    </>
                                )}
                            </button>
                        );
                    })}
                </div>

                {songs.length === 0 && (
                    <div className="fvr-lat-empty">
                        <strong>队列是空的</strong>
                        <span>从歌单 / 搜索里放一首歌，队列就会铺在这里。</span>
                    </div>
                )}
            </div>

            <div className="fvr-lat-actions">
                <button
                    type="button"
                    className="fvr-lat-action"
                    onClick={() => { applyCamera(homeRef.current); setCamera(homeRef.current); }}
                    title="定位正在播放"
                    aria-label="定位正在播放"
                >
                    <LocateFixed size={17} />
                </button>
                <button
                    type="button"
                    className="fvr-lat-action"
                    onClick={() => {
                        np.collapse();
                        location.hash = "#/settings";
                    }}
                    title="播放页设置"
                    aria-label="播放页设置"
                >
                    <Settings2 size={17} />
                </button>
            </div>
        </div>
    );
}
