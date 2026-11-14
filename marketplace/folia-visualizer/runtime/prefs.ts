// Folia 歌词动效 —— 插件偏好（一个极小的可订阅存储）
//
// 为什么不是每个 React 根各自读 localStorage：控制面板（走带浮窗）与正在播放页（舞台 /
// Lattice）是两个独立的 React root，用户在前者改样式、后者要立刻跟上。Sparkle 的
// ctx.storage 只是 localStorage 的命名空间，没有变更通知，所以这里补一层：
//   bindFoliaStorage() 绑定一次 → readFoliaPrefs() 读快照 → writeFoliaPref() 改并广播。
// 快照是**惰性重建 + 缓存**的，useSyncExternalStore 能拿到稳定引用（否则每次 getSnapshot
// 都返回新对象，React 会判定「一直在变」并死循环）。
//
// 键与 Folia 本体的设置项对齐（样式 / 背景 / 播放页 / 静态模式 / 字幕 / 字号 / 自动隐藏），
// 旧版已有的 enabled / style / background 三个键保持原义，不迁移用户的既有选择。
import { useSyncExternalStore } from "react";
import type { SparkleStorage } from "@quaver/sparkle";
import { FOLIA_BACKGROUNDS, FOLIA_MODES, isBackground, isMode, type FoliaBackgroundId, type FoliaModeId } from "./catalog";

/** 正在播放页的两个面：舞台（歌词动效）/ Lattice（队列海报墙） */
export type FoliaSurface = "stage" | "lattice";

export interface FoliaPrefs {
  /** 总开关：false = 让出正在播放页，回到宿主默认布局 */
  enabled: boolean;
  /** 歌词样式（17 种之一，Folia 的 visualizer mode） */
  style: FoliaModeId;
  /** 共享背景（6 种之一） */
  background: FoliaBackgroundId;
  /** 播放页当前的面 */
  surface: FoliaSurface;
  /** 静态模式：画面降级成低占用（Folia 的预览/省电档） */
  staticMode: boolean;
  /** 显示翻译/音译辅助行（跟随宿主「翻译选项」） */
  translation: boolean;
  /** 歌词字号倍率（0.8 / 1 / 1.2 / 1.4） */
  fontScale: number;
  /** Lattice 墙面暗角 */
  vignette: boolean;
  /** 自动隐藏宿主播放条（Folia 的 autoHidePlayerChrome） */
  autoHideChrome: boolean;
}

export const FOLIA_FONT_SCALES = [0.8, 1, 1.2, 1.4] as const;

const DEFAULT_PREFS: FoliaPrefs = {
  enabled: true,
  style: "classic",
  background: "latent",
  surface: "stage",
  staticMode: false,
  translation: true,
  fontScale: 1,
  vignette: true,
  // Folia 播放页默认「裸歌词」：走动后 3.2s 收起宿主播放条（可关）。
  autoHideChrome: true,
};

let storage: SparkleStorage | null = null;
let snapshot: FoliaPrefs | null = null;
const listeners = new Set<() => void>();

/** 绑定插件自己的存储命名空间（mount 时调用一次；重复调用无害）。 */
export function bindFoliaStorage(store: SparkleStorage): void {
  storage = store;
  snapshot = null;
}

const read = (key: string): string | null => storage?.get(key) ?? null;
const flag = (key: string, fallback: boolean): boolean => {
  const v = read(key);

  return v === null ? fallback : v === "1";
};

/** 当前偏好快照（同一版本内引用稳定，供 useSyncExternalStore 使用）。 */
export function readFoliaPrefs(): FoliaPrefs {
  if (snapshot) return snapshot;

  const style = read("style") ?? "";
  const background = read("background") ?? "";
  const surface = read("surface");
  const scale = Number(read("scale"));
  snapshot = {
    enabled: flag("enabled", DEFAULT_PREFS.enabled),
    style: isMode(style) ? style : DEFAULT_PREFS.style,
    background: isBackground(background) ? background : DEFAULT_PREFS.background,
    surface: surface === "lattice" ? "lattice" : "stage",
    staticMode: flag("static", DEFAULT_PREFS.staticMode),
    translation: flag("translation", DEFAULT_PREFS.translation),
    fontScale: FOLIA_FONT_SCALES.includes(scale as (typeof FOLIA_FONT_SCALES)[number]) ? scale : DEFAULT_PREFS.fontScale,
    vignette: flag("vignette", DEFAULT_PREFS.vignette),
    autoHideChrome: flag("autoHide", DEFAULT_PREFS.autoHideChrome),
  };

  return snapshot;
}

const STORAGE_KEYS: Record<keyof FoliaPrefs, string> = {
  enabled: "enabled",
  style: "style",
  background: "background",
  surface: "surface",
  staticMode: "static",
  translation: "translation",
  fontScale: "scale",
  vignette: "vignette",
  autoHideChrome: "autoHide",
};

/** 写一项并广播（控制面板与设置页共用；播放页据此重画）。 */
export function writeFoliaPref<K extends keyof FoliaPrefs>(key: K, value: FoliaPrefs[K]): void {
  const encoded = typeof value === "boolean" ? (value ? "1" : "0") : String(value);
  storage?.set(STORAGE_KEYS[key], encoded);
  snapshot = null;

  for (const cb of [...listeners]) {
    try { cb(); } catch { /* 某个根已卸载 */ }
  }
}

/** 订阅偏好变化；返回退订函数。 */
export function onFoliaPrefs(cb: () => void): () => void {
  listeners.add(cb);

  return () => listeners.delete(cb);
}

/** React 侧读偏好（订阅 + 稳定快照）。 */
export function useFoliaPrefs(): FoliaPrefs {
  return useSyncExternalStore(onFoliaPrefs, readFoliaPrefs, readFoliaPrefs);
}

/** 只读选择器：给「当前样式名」这类纯展示用。 */
export const styleLabel = (prefs: FoliaPrefs): string =>
  FOLIA_MODES.find((m) => m.id === prefs.style)?.label ?? "流光";

export const backgroundLabel = (prefs: FoliaPrefs): string =>
  FOLIA_BACKGROUNDS.find((b) => b.id === prefs.background)?.label ?? "隐现";
