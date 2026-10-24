// Lumen 流光 — 令牌定义（纯数据 + 纯类型，无运行时依赖，可在 node 里直接 import 做数值自检）
//
// 色彩体系：源色 = --cvg-bar-line（宿主按本主题的 Tint 方案写下的播放条线色，见 index.ts 顶部
// 为何不用 --cvg-accent），用 **CSS 相对颜色语法** lch(from …) 推导 M3 的 tone 体系。
//
// 模型与 M3 的 SchemeTonalSpot 对齐 —— **源色只贡献色相**：
//   · tone（= CIELAB L*）逐角色固定，取值就是 M3 规范的 tone；
//   · 彩度逐角色固定，取 M3 baseline（源色 #6750a4 的官方方案）实测的 CIELAB 彩度；
//   · 只有色相来自源色（tertiary 家族再 +60°，与 M3 一致）。
// 为什么不让彩度跟着源色的彩度缩放：宿主写的源色是 `toBarColors` 的产物（HSL L=0.4、饱和度
// 拉到 ≥0.5），彩度恒在 70 上下。拿它线性缩放到各角色，会得到一组「比 M3 艳得多」的颜色
// （tertiary 彩度 46 vs 官方 20、on-primary-container 只有 18 vs 官方 59）—— 与 MD3 的观感不符。
//
// 为什么是 lch 而不是 oklch：M3 的 tone 定义在 CIELAB 的 L* 上。
// L* 固定 ⇒ 相对亮度（WCAG 用的那个 Y）基本固定 ⇒ **任意色相下对比度一致**。
// oklch 的 L 是感知亮度、不是亮度：同一个 L 下黄色比蓝色亮得多，
// 于是「白字压在主色上」这类组合会在黄系源色上塌掉 —— 这是本插件第一版的失败原因。
//
// 注意 lch() 按 CSS Color 4 用 **D50** 白点（lab/lch 一族都是 D50；用 D65 会整体偏色）。
// 浏览器把 lch 渲成 sRGB 时做色域映射（保持 L*/H、压 C），亮度锚点不会被破坏。

/** 一条 M3 色彩角色：tone = CIELAB L*（0..100），即 M3 说的 tone。 */
export interface RoleSpec {
  /** M3 tone（= L*）。决定这层颜色的明度锚点，也决定它与谁对比度够不够。 */
  tone: number;
  /** CIELAB 彩度。0 = 纯中性；数值取 M3 baseline 方案的实测值（见文件顶部）。 */
  chroma: number;
  /** 色相偏移（度）。缺省 = 沿用源色相；tertiary 家族用 +60（M3 的 tertiary 就是源色相 +60°）。 */
  hueShift?: number;
}

/** 固定色（不参与 tone 推导的角色，如 error 家族 —— M3 里它就钉在红上）。 */
export interface FixedRole {
  fixed: string;
}

export type RoleValue = RoleSpec | FixedRole;

const role = (tone: number, chroma: number, hueShift?: number): RoleSpec =>
  (hueShift === undefined ? { tone, chroma } : { tone, chroma, hueShift });

/** 亮色方案（M3 light scheme）。tone 与彩度都取自 M3 baseline (#6750a4) 的官方方案。 */
export const LIGHT_ROLES: Record<string, RoleValue> = {
  primary: role(40, 50),
  "on-primary": role(100, 0),
  "primary-container": role(90, 18),
  "on-primary-container": role(10, 59),

  "secondary-container": role(90, 13),
  "on-secondary-container": role(10, 13),

  tertiary: role(40, 20, 60),
  "on-tertiary": role(100, 0, 60),
  "tertiary-container": role(90, 15, 60),
  "on-tertiary-container": role(10, 18, 60),

  surface: role(98, 5),
  "surface-container-low": role(96, 4),
  "surface-container": role(94, 5),
  "surface-container-high": role(92, 5),
  "surface-container-highest": role(90, 5),
  "on-surface": role(10, 4),
  "on-surface-variant": role(30, 6),
  outline: role(50, 6),
  "outline-variant": role(80, 6),

  "inverse-surface": role(20, 4),
  "inverse-on-surface": role(95, 4),

  error: { fixed: "#b3261e" },
  "on-error": { fixed: "#ffffff" },
  "error-container": { fixed: "#ffdad6" },
  "on-error-container": { fixed: "#410002" },
};

/** 暗色方案（M3 dark scheme）：主色系整体抬到高 tone，容器压低。 */
export const DARK_ROLES: Record<string, RoleValue> = {
  primary: role(80, 35),
  "on-primary": role(20, 54),
  "primary-container": role(30, 52),
  "on-primary-container": role(90, 18),

  "secondary-container": role(30, 13),
  "on-secondary-container": role(90, 13),

  tertiary: role(80, 22, 60),
  "on-tertiary": role(20, 19, 60),
  "tertiary-container": role(30, 20, 60),
  "on-tertiary-container": role(90, 15, 60),

  surface: role(6, 4),
  "surface-container-low": role(10, 4),
  "surface-container": role(12, 5),
  "surface-container-high": role(17, 5),
  "surface-container-highest": role(22, 5),
  "on-surface": role(90, 5),
  "on-surface-variant": role(80, 6),
  outline: role(60, 6),
  "outline-variant": role(30, 6),

  "inverse-surface": role(90, 5),
  "inverse-on-surface": role(20, 4),

  error: { fixed: "#ffb4ab" },
  "on-error": { fixed: "#690005" },
  "error-container": { fixed: "#93000a" },
  "on-error-container": { fixed: "#ffdad6" },
};

/** 主题自带的 Tint 方案。色值取 M3 常见源色 —— **只用到色相**（tone/彩度由上表固定），
 *  所以前七套换出来的是七种色相家族，明度结构与对比度完全一致。宿主会经 toUiColors 换成强调色。
 *  最后两套是哨兵值："system" 跟随系统强调色，"cover" 跟随当前曲封面主色；哨兵读不到时
 *  宿主回落到第一套（紫罗兰）—— 与 M3 的 Material You 观感一致。 */
export const TINT_PRESETS: { id: string; label: string; color: string }[] = [
  { id: "md3-purple", label: "紫罗兰", color: "#6750a4" }, // M3 baseline，官方方案即由它推出
  { id: "md3-blue", label: "靛蓝", color: "#0b57d0" },
  { id: "md3-teal", label: "青碧", color: "#00696d" },
  { id: "md3-green", label: "翠绿", color: "#2e7d32" },
  { id: "md3-amber", label: "琥珀", color: "#8a5100" },
  { id: "md3-red", label: "朱红", color: "#b3261e" },
  { id: "md3-magenta", label: "品红", color: "#8e4585" },
  { id: "md3-system", label: "系统强调色", color: "system" }, // 哨兵值，见宿主 sparkle/theme-tint.ts
  { id: "md3-cover", label: "封面颜色", color: "cover" },   // 哨兵值，换曲后跟随封面主色
  { id: "md3-custom", label: "自定义颜色", color: "custom" }, // 哨兵值，宿主提供取色 UI（按主题 id 分档存储）
];

// —— 形状刻度（M3 shape scale，单位 px；full = 全圆角） ——

export const SHAPE = {
  none: "0",
  xs: "4px",
  s: "8px",
  m: "12px",
  l: "16px",
  xl: "28px",
  full: "999px",
} as const;

// —— 层级阴影（M3 elevation levels 1..5 的两段式投影）——
//
// **投影颜色由 Tint 源色派生，不是纯黑。** 这是「深色方案看不出阴影」的正解：
// M3 的规范投影确实是黑的，但它同时规定深色下的层级要靠 surface tint 表达 ——
// 本主题的层级已经由 surface-container 那五档 tone 承担了，没有再叠一层 tint 覆盖，
// 于是黑投影落在 tone 6 的表面上**等于没画**（比表面更黑的东西没有可分辨的差）。
// 两层各司其职：
//   · contact = 贴地的短距硬影，负责「贴着」的触感；浅色里它是主角（近黑，与 M3 观感一致），
//     深色里它只是压暗底衬，本来就不指望看得见；
//   · ambient = 远处的大软影，负责「浮起来」的体积感；深色下它取**比表面更亮、带彩度**的
//     源色（tone 32 / 彩度 42），这才是深色唯一看得见的一层。
// 两层都写成 `lch(from var(--md-source) …)` —— 换 Tint 方案 = 换源色 = 投影跟着换色，
// 主题不需要知道用户选了哪一套（色相来自源色，tone/彩度固定，与色彩角色同一套模型）。
//
// ⚠️ 别把这两个颜色改回 rgba(0,0,0,…)：那等于把「深色模式看不出阴影」这个 bug 请回来，
//    selfcheck 有行为不变量会打红（每级投影压在**同方案表面**上的可见度）。

/** 一条 Tint 派生的投影色（tone/彩度固定，色相取源色；α 直接烘进值里）。 */
const shadowColor = (tone: number, chroma: number, alpha: number) =>
  `lch(from var(--md-source) ${tone} ${chroma} h / ${alpha})`;

/** 每方案两个浓度：贴地硬影 / 远处软影。 */
export const SHADOW_COLORS = {
  light: {
    contact: shadowColor(20, 8, 0.30),
    ambient: shadowColor(30, 10, 0.15),
  },
  dark: {
    contact: shadowColor(0, 0, 0.35),
    ambient: shadowColor(32, 42, 0.50),
  },
} as const;

/** 每级两层投影的几何（M3 elevation 规格；两套方案共用，只有颜色/浓度不同）。 */
const ELEV_GEOMETRY = {
  1: ["0 1px 2px", "0 1px 3px 1px"],
  2: ["0 1px 2px", "0 2px 6px 2px"],
  3: ["0 1px 3px", "0 4px 8px 3px"],
  4: ["0 2px 3px", "0 6px 10px 4px"],
  5: ["0 4px 4px", "0 8px 12px 6px"],
} as const;

const elevLevel = (scheme: "light" | "dark", level: keyof typeof ELEV_GEOMETRY) => {
  const [contact, ambient] = ELEV_GEOMETRY[level];
  return `${contact} ${SHADOW_COLORS[scheme].contact}, ${ambient} ${SHADOW_COLORS[scheme].ambient}`;
};

export const ELEVATION = {
  light: Object.fromEntries([1, 2, 3, 4, 5].map((lv) => [lv, elevLevel("light", lv as 1)])),
  dark: Object.fromEntries([1, 2, 3, 4, 5].map((lv) => [lv, elevLevel("dark", lv as 1)])),
} as Record<"light" | "dark", Record<1 | 2 | 3 | 4 | 5, string>>;

/**
 * 播放页封面的「悬浮」投影：几何沿用宿主（0 20px 60px 那一档大范围软影 + 一层贴地硬影），
 * 颜色换成 Tint 派生。深色下这两层是**唯一能读出来的层级**，也是「播放有影 / 暂停无影」
 * 那条特效在本主题里看得见的前提（开关本身仍归宿主的 .np.playing 管，主题只换颜色）。
 */
export const COVER_ELEVATION = {
  light: `0 20px 60px ${shadowColor(24, 12, 0.4)}, 0 6px 18px ${shadowColor(18, 10, 0.3)}`,
  dark: `0 20px 60px ${shadowColor(34, 46, 0.55)}, 0 6px 18px ${shadowColor(26, 36, 0.5)}`,
} as const;

/** M3 状态层不透明度（叠在组件自身表面色之上的 on-* 覆盖量）。 */
export const STATE = { hover: 0.08, focus: 0.1, pressed: 0.1, drag: 0.16 } as const;

/** 亮/暗方案的角色表（CSS 生成与数值自检共用一份）。 */
export const SCHEMES = { light: LIGHT_ROLES, dark: DARK_ROLES } as const;
export type SchemeName = keyof typeof SCHEMES;

/** 把一条角色渲染成 CSS 自定义属性值（lch 相对颜色语法 / 固定色）。 */
export function roleValue(spec: RoleValue): string {
  if ("fixed" in spec) return spec.fixed;
  const hue = spec.hueShift === undefined ? "h" : `calc(h + ${spec.hueShift})`;
  return `lch(from var(--md-source) ${spec.tone} ${spec.chroma} ${hue})`;
}

/** 角色名 → 自定义属性名（`primary` → `--md-primary`）。 */
export const roleVar = (name: string): string => `--md-${name}`;

/** 产出一套方案的全部角色声明（每行一条，便于对照自检脚本）。 */
export function schemeDecls(scheme: SchemeName): string[] {
  return Object.entries(SCHEMES[scheme]).map(([name, spec]) => `${roleVar(name)}:${roleValue(spec)};`);
}
