// Quaver Sparkle — 插件类型契约（纯类型，无运行时依赖）
//
// Sparkle 是 Quaver Music 的插件系统。插件是一个实现 SparklePlugin 的对象：
// 在 setup() 里通过 SparkleContext 注册扩展点（路由/侧栏/设置页/主题/播放页/
// 右键菜单/播放源/歌单分组），返回的函数（可选）作为 dispose，在插件停用时调用。
// 官方插件随宿主静态打包；第三方插件以 ESM 单文件（default export 一个
// SparklePlugin）安装到 quaver 配置目录的 plugins/<id>/ 下，经 /api/sparkle 加载。

export type PluginKind = "official" | "third-party";

export interface SparklePlugin {
  /** kebab-case 全局唯一 id；第三方插件必须与安装目录名一致 */
  id: string;
  name: string;
  /** semver 字符串 */
  version: string;
  /** 可选的最低宿主版本；低于此版本的宿主不允许安装或启用插件 */
  minHostVersion?: string;
  /** 是否允许同一版本号的 Beta 宿主满足最低版本要求；默认为 false */
  allowBeta?: boolean;
  author?: string;
  description?: string;
  kind: PluginKind;
  /** 注册扩展点；返回的函数在插件停用/卸载时调用（做资源清理） */
  setup(ctx: SparkleContext): void | (() => void);
}

// —— 扩展点载荷类型 ——

/** 路由视图：签名与宿主 views.ts 的视图一致（root 为路由容器，q 为查询参数） */
export interface SparkleView {
  (root: HTMLElement, q: URLSearchParams): (() => void) | void;
}

/** 侧栏导航项；iconSvg 缺省用 Sparkle 星形图标 */
export interface SparkleNavItem {
  /** hash 形如 "#/my-page" */
  path: string;
  label: string;
  iconSvg?: string;
}

export interface SparkleSonglistItem {
  id: string;
  title: string;
  picurl?: string;
  /** 点击跳转的 hash（通常是本插件 registerView 注册的路由） */
  href: string;
}

/** 侧栏「歌单」区的一组自定义列表（如插件自建歌单、外部来源歌单） */
export interface SparkleSonglistGroup {
  id: string;
  label: string;
  /** 每次侧栏重画时调用（返回最新列表） */
  items(): SparkleSonglistItem[];
}

/** 设置页「花火插件」面板里的一个设置分组 */
export interface SparkleSettingsSection {
  id: string;
  title: string;
  /** box 为该组的容器；返回的函数在面板销毁时调用 */
  render(box: HTMLElement): (() => void) | void;
}

/** 主题自带的一套高亮色（tint）方案，见 SparkleThemeTint。 */
export interface SparkleTintPreset {
  id: string;
  label: string;
  /**
   * 颜色字面量：`#rgb` / `#rrggbb`；或哨兵值 `"system"` = 跟随**系统强调色**（宿主探测
   * Noctalia / matugen 模板产物、KDE / GNOME / GTK / macOS / Windows 的系统强调色）；
   * `"cover"` = 跟随**当前曲封面主色**。宿主会解析校验，非法项忽略并 warn。哨兵档读不到
   * 对应颜色时，宿主回落到你的第一套非哨兵方案（一套都没有则无色，让主题自己的
   * `--acc` 显出来）。另有哨兵值 `"custom"` = 用户自选颜色：宿主在外观设置里就地弹
   * 颜色选择器，色值按主题 id 分档存储 —— 主题只需把它声明成一档方案，不需要自己
   * 提供取色 UI。
   */
  color: string;
}

/**
 * 主题对「高亮颜色（tint）」的态度。
 *
 * **不声明**（`theme.tint` 缺省）= 主题自带强调色、自己接管高亮色。宿主会**让位**：不再往
 * `:root` 写 `--cvg-accent` / `--cvg-glow` / `--cvg-bar-*`（那几个是内联样式，会压过主题
 * 的 `html[data-sparkle-theme=…]` 规则），同时把设置页的「高亮颜色」整组禁用并注明由谁接管。
 * 主题只要覆盖 `--acc` / `--cyan`，让位后的高亮色就自动跟着主题走 —— 这是最省事的写法。
 *
 * 声明了 = 主题把高亮色让给宿主，用户可在设置页继续调：
 *   · `mode: "host"`    完全交给宿主的 tint 系统（固定青色 / 跟随封面 / 系统强调色 / 自定义色四档）；
 *   · `mode: "presets"` 主题自带几套方案，用户在这些方案里挑（`presets[0]` 是默认）。
 *     方案的 `color` 还可以写 `"system"` = 跟随系统强调色，或 `"cover"` = 跟随当前封面主色
 *     （见 SparkleTintPreset）。
 * 两种模式下主题都**不应**再写 `--cvg-*` —— 那是宿主的地盘，写了也会被内联样式压掉。
 */
export interface SparkleThemeTint {
  mode: "host" | "presets";
  /** `mode: "presets"` 时用。为空 / 全部非法色时，宿主降级按 "host" 处理（总比整组不可用强）。 */
  presets?: SparkleTintPreset[];
}

/**
 * 主题对「默认主题的背景」的态度（设置→外观→背景：关闭背景 / 专辑封面 / 自定义图片 + 模糊强度）。
 *
 * **不声明**（`theme.background` 缺省）= 主题自带视觉，自己接管背景。宿主**让位**：那一层
 * 环境色（当前曲封面 / 自定义图）整块不画 —— 否则用户的自定义壁纸会从主题的底色底下透出来，
 * 两边打架。同时把设置页的「背景」整组禁用并注明由谁接管。
 * 主题想自带背景就在自己的 `css` 里画（覆盖 `--bg`、或用伪元素铺整窗），那是你的地盘。
 *
 * 声明了 = 主题把背景让给宿主：用户的三档与模糊强度照常生效（`--ambient-*` 归宿主写）。
 * 主题**不应**再自己铺整窗背景 —— 那会与用户在设置里选的东西打架。
 */
export interface SparkleThemeBackground {
  mode: "host";
}

/**
 * 主题对「浮层菜单的外观」（设置→外观→菜单毛玻璃）的态度。
 *
 * 菜单玻璃由宿主的一组令牌统一给：`--menu-filter`（模糊）/ `--menu-surface`（底片）/
 * `--menu-line`（描边）/ `--menu-shadow`（阴影）/ `--menu-edge`（上缘内高光）。
 * 消费点七处 = `.ctx-menu`（侧栏歌单 / 歌曲右键菜单）、`.pb-qpop`（音质）、`.pb-lpop`
 * （播放模式）、`.pb-volpop`（音量）、`.np-menu`（正在播放页「更多操作」）、
 * `.np-qinfo`（音频流信息）、`.tint-pop`（设置页颜色选择器）。
 *
 * **不声明**（`theme.menus` 缺省）= 主题自带菜单外观，自己接管。宿主**让位**：不再往
 * `<html>` 写 `data-menu-glass` 的 on/off，同时把设置页的「菜单毛玻璃」整组禁用并注明
 * 由谁接管。要美化菜单，直接在自己的 `css` 里覆盖那几个 `--menu-*` 令牌
 * （`html[data-sparkle-theme="<id>"]` 的特异性高于 `:root`），或按 `.ctx-menu` 这类选择器
 * 重画形态 —— 这些都是你的地盘。宿主对 `.np`（正在播放页恒为深色玻璃）另有一套同名令牌，
 * 想连那一页一起改就写 `html[data-sparkle-theme="<id>"] .np { --menu-surface: … }`。
 *
 * 声明了 = 主题把菜单外观让给宿主：用户那棵开关照常生效（开 = 玻璃底 + 模糊；
 * 关 = 实底不模糊）。此时主题**不应**再写 `--menu-*` —— 写了也会被宿主的开关盖掉。
 */
export interface SparkleThemeMenus {
  mode: "host";
}

/**
 * 主题对「播放控制条停靠形态」（设置→外观→播放控制条）的态度。
 *
 * **不声明**（`theme.controlBar` 缺省）= 宿主偏好照常生效；主题仍然可以用自己的 CSS
 * 覆盖 `--control-bar-*` 与 `body[data-control-bar]` 的形态。
 *
 * 声明了 = 主题接管停靠形态：`bottom` / `floating` 是最终态，用户设置页对应分组禁用；
 * `mode: "host"` 表示把停靠权还给宿主偏好。
 */
export interface SparkleThemeControlBar {
  mode: "host" | "bottom" | "floating";
}

/**
 * 主题对「歌单显示模式」（设置→外观→歌单）的态度。
 *
 * 缺省 / 不声明（`theme.playlistMode` 缺省）= 宿主偏好照常生效（默认「菜单栏」，用户可在
 * 设置里切到「歌单集合页」）；主题仍可以用自己的 CSS 调整侧栏与集合页外观。
 *
 * 声明了 = 主题接管呈现形态：`menu` / `collection` 是最终态，用户设置页对应分组禁用；
 * `mode: "host"` 表示把呈现权还给宿主偏好。`collection` = 侧栏歌单区隐藏、导航按钮垂直居中，
 * 歌单改到 `#/playlists` 以 grid 分区展示。
 *
 * 「菜单栏」（`menu`）：侧栏「歌单」区照常列出「我创建的歌单 / 收藏的歌单」。
 * 「歌单集合页」（`collection`）：侧栏不再列歌单，改由集合页 grid 承载。
 */
export interface SparkleThemePlaylistMode {
  mode: "host" | "menu" | "collection";
}

/** 自定义主题：css 是一组 CSS 变量覆盖，作用于 html[data-sparkle-theme="<id>"] */
export interface SparkleTheme {
  id: string;
  name: string;
  css: string;
  /** 高亮色（tint）归谁管，见 SparkleThemeTint。**缺省 = 主题接管**。 */
  tint?: SparkleThemeTint;
  /** 背景归谁管，见 SparkleThemeBackground。**缺省 = 主题接管**。 */
  background?: SparkleThemeBackground;
  /** 浮层菜单的外观归谁管，见 SparkleThemeMenus。**缺省 = 主题接管**。 */
  menus?: SparkleThemeMenus;
  /** 播放控制条的停靠形态归谁管，见 SparkleThemeControlBar。**缺省 = 宿主接管**。 */
  controlBar?: SparkleThemeControlBar;
  /** 歌单的显示模式归谁管，见 SparkleThemePlaylistMode。**缺省 = 宿主接管**（默认「菜单栏」）。 */
  playlistMode?: SparkleThemePlaylistMode;
}

// —— 样式层 / 主题包 ——
//
// 为什么需要这一层：`registerTheme` 只能覆盖 --bg/--card/--acc 那十来个变量，而宿主
// style.css 里有大量**硬编码**（圆角 73 处、阴影 28 处、色值字面量 182 个）。想做
// Lumen 流光 / 毛玻璃 / 极简体这种「换一套设计语言」的主题，变量组远远不够
// ——圆角体系、阴影层级、组件形态都得重写。那就得让插件能注入**任意 CSS**。
//
// 注入的是整页样式（作用于 :root 之下的一切，含插件自己的 UI），因此：
//   · order 决定层序（小的先注入/在下，大的后注入/在上）——多个样式层可叠加，
//     后注册的可有意覆盖先注册的；
//   · 只在**选中**的 style sheet 生效，切走时整张 <style> 摘掉，不留残留；
//   · 第三方样式层能改宿主 UI，这是**设计意图**（主题就该全站生效），不是漏洞。
//     但也意味着它同样能改掉播放条/正在播放页 —— 宿主无法审查，只能提示信任来源。

/**
 * 样式层：一份可全站生效的 CSS。层序由 order 决定（缺省 0）。
 * 与 registerTheme 的关系：registerTheme 是「只换变量」的轻量入口，本接口是
 * 「重写设计语言」的完整入口 —— 两者可共存，主题包的每个风格内部通常两者都用。
 */
export interface SparkleStyleLayer {
  id: string;
  /** 任意合法 CSS（可含 @media/@supports/@font-face/@layer）。不要写 position:fixed 的
   *  自绘层盖住窗口按钮簇（右上角三钮在 .winbtns，z-index 90）。 */
  css: string;
  /** 层序，小的在下。缺省 0。相同时按注册顺序叠加。 */
  order?: number;
}

/**
 * 主题包：插件提供的一整套风格（每套一个 style layer），用户在设置页切换。
 * 典型用法 = Lumen 流光：一个包给「亮 / 暗 / 高对比」三套。
 */
export interface SparkleThemePack {
  id: string;
  name: string;
  author?: string;
  description?: string;
  /** 供设置页展示的预览（一个小色板即可；纯展示，宿主不解析语义） */
  preview?: string[];
  /** 该包提供的风格列表。**第一个是默认风格**（用户没切过时用它）。 */
  variants: SparkleStyleVariant[];
}

/** 主题包里的一套风格 = 一张样式层 + 元信息 */
export interface SparkleStyleVariant {
  id: string;
  name: string;
  css: string;
  /** 层序；缺省用 pack 缺省的 +1000（压过常驻层） */
  order?: number;
  /** 声明这套风格是亮底还是暗底：宿主据此协调 color-scheme（滚动条、原生控件、
   *  表单元素），避免出现「暗底页面 + 亮色滚动条」这类割裂。
   *  不声明 = 尊重用户的「跟随系统」设置，宿主不动 color-scheme。 */
  scheme?: "light" | "dark";
  /** 设置页色板预览（几个代表色即可，宿主只当色块渲染，不解析语义）。
   *  缺省时回落到 pack.preview。 */
  preview?: string[];
}

/** 宿主当前生效的样式层状态（只读快照；通过 ctx.style 订阅变化） */
export interface SparkleStyleState {
  /** 激活的主题包 id（无 = 未选主题包，走宿主默认外观） */
  packId: string | null;
  /** 激活的风格 id */
  variantId: string | null;
  /** 强制关闭所有样式层（设置页的「暂停第三方样式」总闸；出问题时用户的救命出口） */
  suspended: boolean;
}

/** 正在播放页的插件小部件（挂在歌词区下方的插件槽内） */
export interface SparkleNpWidget {
  id: string;
  /** box 为部件容器；返回的函数在停用时调用 */
  render(box: HTMLElement): (() => void) | void;
}

/** 一行歌词（行级；秒 + 文本 + 可选辅助行） */
export interface SparkleLyricLine {
  /** 行起始时间（秒） */
  t: number;
  text: string;
  /**
   * 辅助行（歌词下方那一行）。宿主已按「翻译选项」挑好：
   * 翻译档 = 优先翻译、该行没翻译则回落音译；音译档 = 优先音译、没音译则回落翻译；
   * 关闭档 = 空串。视图只管显示，不再自己判两路数据（逐字行见 karaoke()，那里是原始两路）。
   */
  trans?: string;
}

/** 正在播放页频谱的一帧真实音频数据。 */
export interface SparkleSpectrumFrame {
  /**
   * FFT 频域幅度，已归一化到 0..1，下标就是 AnalyserNode 的原始频点
   * （length = frequencyBinCount，通常为 fftSize / 2）。数组会被下一帧原地复用，
   * 要跨帧保留请自行 copy。
   */
  bins: Float32Array;
  /** 时域波形，-1..1（length = fftSize）。同样按帧复用，不要原地改。 */
  wave: Float32Array;
  /** 当前时域 RMS 能量，0..1（便于做呼吸/发光包络，不必自己扫 wave）。 */
  level: number;
  /** AudioContext 采样率；用于把频点下标换算成 Hz。 */
  sampleRate: number;
  /** 取帧时刻（performance.now 口径，毫秒）。 */
  timestamp: number;
  /** 当前音频是否真的在播放；暂停时 bins/wave 会衰减到静默。 */
  active: boolean;
}

/** 频谱采集状态；unavailable = 当前流无法被 WebAudio 解码/分析。 */
export type SparkleSpectrumStatus = "idle" | "starting" | "live" | "unavailable";

/**
 * 正在播放页频谱门面。既能把 `frame()` 透传给插件自绘，也允许插件读写宿主开关与形态。
 * 开关/形态与宿主 ⋮ 菜单是同一份持久化偏好；`setMode()` 只接受已注册的模式 id。
 */
export interface SparkleSpectrumFacade {
  enabled(): boolean;
  setEnabled(on: boolean): void;
  status(): SparkleSpectrumStatus;
  /** 当前形态 id（内置 bars / mirror / wave，或 Sparkle 插件注册的模式）。 */
  mode(): string;
  /** 可选项（内置 + 当前启用插件注册的模式）。 */
  modes(): { id: string; label: string }[];
  setMode(id: string): void;
  /** 按需取一帧；首次调用会异步启动分析器，启动前返回 null。 */
  frame(): SparkleSpectrumFrame | null;
  /** 宿主逐帧取样回调；返回退订函数。 */
  onFrame(cb: (frame: SparkleSpectrumFrame) => void): () => void;
}

/** 插件自绘频谱模式的渲染上下文。 */
export interface SparkleNpSpectrumRenderCtx {
  frame(): SparkleSpectrumFrame | null;
  onFrame(cb: (frame: SparkleSpectrumFrame) => void): () => void;
  expanded(): boolean;
  paused(): boolean;
  current(): SparkleSongSnapshot | null;
}

/**
 * 可插拔的正在播放页频谱形态。宿主内置 bars / mirror / wave，插件可注册自己的形态；
 * render 收到的 host 是频谱条内的区域，尺寸随窗口变化，返回函数在切走/停用时清理。
 */
export interface SparkleNpSpectrumMode {
  /** 小写 kebab-case，全局唯一（与其它插件/内置模式同表）。 */
  id: string;
  label: string;
  render(host: HTMLElement, ctx: SparkleNpSpectrumRenderCtx): (() => void) | void;
}

/**
 * 正在播放页**整页接管**视图：宿主把 .np-inner 整块让给插件，插件自绘全部内容
 * （封面流 / 信息 / 歌词 / 播放控制），并按约定隐藏底部播放条。
 *
 * 与 registerNowPlayingWidget 的分工：widget 只是歌词区下方的一小块浮层，
 * 拿不到传输控制（seek/音量/音质/上下曲），做不了「换一种正在播放页」。
 */
export interface SparkleNpView {
  id: string;
  /**
   * 可选的总开关：false 时宿主不接管（正在播放页回默认布局）。
   * 宿主在每次 notify 重读，切换即时生效（最迟下一个播放事件/4Hz）。
   */
  enabled?(): boolean;
  /**
   * 接管渲染：host 是铺满 .np-inner 的容器（宿主已把默认布局与插件槽隐藏）。
   * 返回的函数在停用插件时调用。
   */
  render(host: HTMLElement, ctx: SparkleNpViewCtx): (() => void) | void;
}

/** 正在播放页接管视图的实时状态与控制面（闭包取值，读到的永远是当前态） */
export interface SparkleNpViewCtx {
  /** 正在播放页是否展开；收起时渲染循环应冻结（rAF 自停后靠 onNotify 唤醒） */
  expanded(): boolean;
  /** 是否处于画廊模式（全屏会话） */
  gallery(): boolean;
  /** 收起正在播放页（退出全屏等收尾由宿主统一做） */
  collapse(): void;

  // —— 曲目 ——
  current(): SparkleSongSnapshot | null;
  /** 队列里的上一首（按当前播放顺序，随机播放时也按当日洗牌序）。
   *  普通播放一律**回绕**（顺序播放档已移除）—— 队首的上一首就是队尾那首；只有空队列才 null。
   *  无限电台没有上一首（恒为 null）。 */
  prevSong(): SparkleSongSnapshot | null;
  /** 队列里的下一首（普通播放回绕：队尾的下一首是队首；只有空队列才 null）。
   *  无限电台轮末尚未取回下一轮时为 null，不会把本轮第一首当成下一首。 */
  nextSong(): SparkleSongSnapshot | null;
  /**
   * 以当前曲为原点、按播放顺序偏移取曲：0 = 当前，1 = 下一首，-1 = 上一首，
   * 2 = 下下首（随机播放时按当日洗牌序）。
   *
   * **回绕**：与 `jumpTo(offset)` 同一条语义 —— 队首的上一首 / 上上首会绕到队尾。
   * 所以歌单第一首的左侧两格照样有封面（点了也真的会跳到那一首），不会空着。
   * 只有空队列才返回 null。offset 传天文数字也安全：内部按队列长度取模，不会空转。
   *
   * **无限电台例外**：电台只向前走，`offset < 0` 恒为 null；正向偏移不越过当前队列末尾，
   * 也不回绕。轮末正在续轮时右侧邻曲会暂时为空，配合 `radioLoading()` 画等待态。
   *
   * 「封面流」这类要画一整列的视图需要它：只有 prev/next 各一首时，
   * 切歌动画做不出「中间转出去 → 右边顶上 → 新的从右边转进来」的三段式
   * —— 第三张没有数据源，DOM 只能停在两张。
   */
  songAt(offset: number): SparkleSongSnapshot | null;
  /** 队列长度（0 = 空；无限电台里是当前已取回、尚未裁掉的曲目数） */
  queueLength(): number;

  // —— 无限电台（只读） ——
  /** 当前是否处在「猜你喜欢」无限电台会话。
   *  电台只向前走：没有上一首、不显示队列、循环/随机也不生效。接管视图应据此把左侧
   *  「上一首/上上首」卡收掉，并且不要把 `songAt(-1)` 当作可跳转目标。
   *  旧宿主没有这个方法：用 `ctx.radioActive?.() ?? false` 兼容。 */
  radioActive?(): boolean;
  /** 无限电台是否正在取下一轮；轮末下一首暂不可用时为 true。旧宿主缺省 false。 */
  radioLoading?(): boolean;
  /** 无限电台最近一次续轮错误（空串 = 无错误）。旧宿主缺省空串。 */
  radioError?(): string;

  // —— 传输（只读） ——
  /** 当前播放位置（秒，裸播放头；不含歌词延迟，见 lyricDelay()） */
  time(): number;
  /** 当前流时长（秒）；未知为 0 */
  duration(): number;
  paused(): boolean;
  loading(): boolean;
  error(): string;

  // —— 歌词（只读） ——
  lyrics(): SparkleLyricLine[];
  /** 歌词状态：idle / loading / ok / none */
  lyricState(): "idle" | "loading" | "ok" | "none";
  showTrans(): boolean;
  /**
   * 歌词辅助行模式：off=关闭 / translation=翻译 / romanization=音译。
   * 两档都是「优先自己那一路，本行缺数据就回落另一路」；辅助行永远只有一行。
   * lyrics() 的 trans 已按此规则挑好；karaoke() 给的是原始两路，渲染方自己挑。
   */
  lyricAux(): "off" | "translation" | "romanization";
  /**
   * 用户为当前歌曲设置的「歌词延迟」（毫秒；正数 = 歌词更晚出现）。按歌曲存宿主 localStorage。
   *  time() 不含它：视图选「当前行」用 `time() − lyricDelay()/1000`，点击行 seek 时加回
   *  （`seek(行秒 + lyricDelay()/1000)`）—— 与宿主内置引擎/行级视图同一口径。
   *  旧宿主没有这个方法：读取一律走 `ctx.lyricDelay?.() ?? 0`（缺省 = 不调整）。
   */
  lyricDelay?(): number;
  /**
   * 逐字歌词行（毫秒时间轴）。空数组 = 当前没有逐字数据。
   *
   * 数据来自此刻在位的**逐字提供器**的解析结果：插件注册的提供器优先，没有插件提供器时
   * 是宿主内置的 AMLL 引擎（逐字 QRC/TTML 与行级 LRC 都归它解析，含 `[kana:]` 振假名）。
   * 整页接管视图据此把「当前这一句」画成逐字高亮，而不必自己重新解析 QRC/TTML/LRC。
   * 提供器解析失败、或该曲没有逐字内容时是空数组。
   */
  karaoke(): SparkleKaraokeLine[];
  /**
   * 逐字歌词此刻是否接管中 = 有逐字数据 **且** 提供器在位并启用（提供器自己的
   * 总开关）。false 时视图应回退到行级歌词（lyrics()）。
   * 内置 AMLL 不注册 `enabled()`，所以「提供器在位」对内置引擎恒为真；能把它变成 false 的
   * 只有插件提供器自带的开关。宿主在每次 notify 重读，开关一改就即时反映（最迟下一个播放事件/4Hz）。
   */
  karaokeActive(): boolean;

  /**
   * 真实音频频谱门面：`frame()` 取归一化 FFT/波形，`onFrame()` 逐帧订阅；
   * 也可读写宿主开关与形态。旧宿主没有此方法：用 `ctx.spectrum?.()` 判空。
   */
  spectrum?(): SparkleSpectrumFacade;

  // —— 音量（只读） ——
  /** 0..1（静音时保留原值） */
  volume(): number;
  muted(): boolean;

  // —— 音质（只读） ——
  /** 当前生效档位 id（会话选择优先，回落设置页默认） */
  quality(): string;
  /** 档位短标签（播放条胶囊口径：自动 / HQ / SQ / 母带 …） */
  qualityLabel(): string;
  /** 最后实际应用的档位：被回退降档时 degraded=true */
  lastStream(): { tier: string; label: string; degraded: boolean } | null;
  /** 可选档位（/stream/tiers 拉回；未就绪时为空数组，宿主在就绪时 notify 一次；
   *  本地/NAS 曲目恒为空数组 —— 文件本身就是那一档，没有阶梯可切） */
  qualityTiers(): SparkleQualityTier[];

  /** 订阅宿主 notify（约 4Hz + 播放态/展开收起等状态变化即发）；返回退订函数 */
  onNotify(cb: () => void): () => void;

  // —— 控制 ——
  toggle(): void;
  /** `immediate` 仅供明确点击跳转（如歌词行）：宿主可跳过淡出直接出声。 */
  seek(sec: number, opts?: { immediate?: boolean }): void;
  next(): void;
  /** 跳到队列里的上一首（force：忽略「重放当前曲」设置，直跳队列上一首） */
  prev(): void;
  /**
   * 直接跳到「播放顺序上偏移 offset 首」的那首歌（0 = 当前，2 = 下下首）。
   * 封面流里点第几张侧封面就该跳到第几首 —— 只有 next/prev 两个动作时，
   * 多张侧封面只能全部指向同一首，交互是假的。
   *
   * 无限电台会忽略 `offset <= 0` 与越过当前队列末尾的跳转（只向前、不回绕）。
   */
  jumpTo(offset: number): void;
  setVolume(v: number): void;
  toggleMute(): void;
  /** 切档（会话级，不持久化；高档不可及自动回退；本地/NAS 曲目无档位，调用为空操作） */
  switchQuality(id: string): void;
  toggleTrans(): void;
  /** 该曲是否已收藏（本地红心） */
  loved(mid: string): boolean;
  /** 单曲收藏切换；返回切换后的收藏态 */
  toggleLove(): boolean;
}

/** 歌曲右键菜单项：与宿主 MenuItem 同型 */
export interface SparkleMenuItem {
  label: string;
  note?: string;
  thumb?: string;
  round?: boolean;
  danger?: boolean;
  disabled?: boolean;
  sub?: () => SparkleMenuItem[] | Promise<SparkleMenuItem[]>;
  run?: () => void | Promise<void>;
}

export interface SparkleSongMenuCtx {
  song: unknown;
  list: unknown[];
  index: number;
}

/**
 * 侧栏（主菜单栏）歌单右键菜单的上下文：菜单每次打开时按当时那个歌单现算，
 * 所以运行中切歌单不会残留上一份 ctx。字段是只读快照，改歌单请走 player 门面或自己的数据源。
 */
export interface SparklePlaylistMenuCtx {
  /** 歌单 id（自建/收藏是 disstid·tid；虚拟歌单是它的稳定 id） */
  id: string;
  title: string;
  /** created = 我创建的歌单｜fav = 收藏的歌单｜virtual = 系统虚拟歌单（每日 30 首 / 我喜欢） */
  kind: "created" | "fav" | "virtual";
  /** 曲目数（上游没给时为 0） */
  songnum: number;
}

/**
 * 正在播放页「更多操作」（⋮）菜单的上下文。
 * `song` 为 null = 当前没在播放（宿主此时显示空态，插件项仍会追加）。
 */
export interface SparkleNpMenuCtx {
  song: SparkleSongSnapshot | null;
}

export interface SparkleStreamResult {
  /** 可直接挂给播放器的 URL（相对 /api/... 或绝对均可） */
  url: string;
  tier?: string;
  label?: string;
}

/**
 * 备用播放源。按注册顺序组成源链：resolve 返回非 null 即采用；
 * 返回 null（或抛错）放行给下一环，全链落空后由宿主走官方 /stream/resolve。
 */
export interface SparkleStreamSource {
  id: string;
  resolve(song: unknown, quality: string): Promise<SparkleStreamResult | null>;
}

/** 当前播放曲目的只读快照 */
export interface SparkleSongSnapshot {
  mid: string;
  name: string;
  /** 歌手（mid 用于「跳转歌手」这类需要路由参数的场景，宿主原样透传上游值） */
  singer?: { name: string; mid?: string }[];
  album?: { name?: string; mid?: string; pmid?: string };
  /** 曲长（秒）；未知为 0 */
  interval?: number;
  /**
   * 曲目来源：省略 / "online" = QQ 曲库在线曲目；"local" = 本地音乐库文件；
   * "nas" = WebDAV/NAS 串流。
   *
   * 本地/NAS 曲目是**另一个播放世界**：没有在线档位阶梯（音质即文件本身，
   * qualityTiers() 恒为空、switchQuality 无效）、没有红心（QQ 侧概念，
   * loved/toggleLove 无从谈起）、封面可能只存在于本地（见 localCover）。
   * 接管视图据此收掉对应控件，别给用户点了没反应的按钮。
   * （旧宿主不带这字段：判定可退回 mid 前缀约定 "local:"。）
   */
  src?: "online" | "local" | "nas";
  /** 本地/NAS 曲目同源封面 URL（相对路径，自带防缓存 query）；无本地封面 = 空串，在线曲目 = 省略 */
  localCover?: string;
}

/** 一档音质（id 形如 auto / 128 / 320 / flac / master …，与 /stream/tiers 对齐） */
export interface SparkleQualityTier {
  id: string;
  label: string;
  /** 会员锁定：可选但会自动回退到可播档 */
  locked?: boolean;
}

/** 播放器只读门面（插件不能直接改队列/状态） */
export interface SparklePlayerFacade {
  readonly current: SparkleSongSnapshot | null;
  /** 秒 */
  readonly time: number;
  readonly paused: boolean;
  /** 订阅播放器通知（约 4Hz + 状态变化即发）；返回退订函数 */
  on(cb: () => void): () => void;
  /** 当前真实音频频谱帧；未启动时按需拉起分析器。旧宿主可缺省。 */
  spectrum?(): SparkleSpectrumFrame | null;
  /** 逐帧订阅频谱（不受 4Hz notify 限制）；返回退订函数。 */
  onSpectrum?(cb: (frame: SparkleSpectrumFrame) => void): () => void;
}

/**
 * 样式门面：插件可**追加**自己的常驻样式层，并读/切主题包。
 *
 * 刻意只给这三件事（不给「随便改 DOM 样式」的 API）：
 *   1. register —— 追加一张样式层（层序可控，多插件可叠加）；
 *   2. packs    —— 读已注册的主题包（供插件按当前风格调整自己的行为，如 MD3
 *                 高对比风格下把强调色换成 on-error 色）；
 *   3. activate —— 请求切换到某包/某风格（宿主裁决：未注册则拒绝、不存在则回落）。
 * 切走别人的主题包是允许的（宿主自带「恢复默认」），但插件不能**强删**别人的层 ——
 * 层的生命周期只归宿主管，停用插件时由宿主精确摘掉。
 */
export interface SparkleStyleFacade {
  /** 追加一张样式层。返回反注册函数（= 摘掉这张 <style>）。 */
  register(layer: SparkleStyleLayer): () => void;
  /** 已注册的主题包（按注册序） */
  packs(): SparkleThemePack[];
  /** 当前生效状态 */
  state(): SparkleStyleState;
  /** 请求激活某包的某风格（variantId 省略 = 该包默认风格）。
   *  返回实际生效的 { packId, variantId }；目标不存在时返回当前状态（不抛）。 */
  activate(packId: string, variantId?: string): SparkleStyleState;
  /** 恢复宿主默认外观（取消主题包选择；插件自带的常驻样式层不受影响） */
  reset(): SparkleStyleState;
  /** 订阅样式状态变化（切换/停用/总闸）；返回退订函数 */
  onChange(cb: (s: SparkleStyleState) => void): () => void;
}

/** 逐字歌词的一个单词（毫秒时间轴） */
export interface SparkleKaraokeWord {
  word: string;
  startTime: number;
  endTime: number;
  /** 单词级音译（AMLL 的 romanWord）；宿主不用 —— 音译是行级子行 */
  romanWord?: string;
  /**
   * 单词级注音（AMLL 的 Ruby，词上方小字）：这是**日文振假名**那种逐词注音的位置，
   * 由宿主内置引擎从 QRC 的 `[kana: ...]` 标签解出（QRCKana，移植自 SPlayer-Dev/lyric-kit）。
   * 想显示注音就渲染它，不想显示就忽略 —— 它与音译无关：romaji/拼音属行级 romanLyric
   * （歌词下方的辅助行），两路谁也别挪到对方的位置上。
   */
  ruby?: SparkleKaraokeRuby[];
}

/** Ruby 注音片段：时间轴供渲染器同步动画使用 */
export interface SparkleKaraokeRuby {
  word: string;
  startTime: number;
  endTime: number;
}

/** 逐字歌词行（与 @applemusic-like-lyrics/core 的 LyricLine 结构兼容） */
export interface SparkleKaraokeLine {
  words: SparkleKaraokeWord[];
  /** 行起始时间（毫秒） */
  startTime: number;
  /** 行结束时间（毫秒） */
  endTime: number;
  /** 翻译歌词（原始两路都留在数据里；上屏哪一路由 lyricAux() 决定，缺则回落另一路） */
  translatedLyric?: string;
  /** 行级音译（romaji/拼音）：与翻译同一个位置 —— 歌词下方的辅助行 */
  romanLyric?: string;
  /** 背景人声行 */
  isBG?: boolean;
  /** 对唱行（靠右对齐） */
  isDuet?: boolean;
}

/** 渲染期间宿主提供的实时状态只读视图（闭包取值，读到的永远是当前态） */
export interface SparkleKaraokeRenderCtx {
  /** 当前播放位置（毫秒，已含宿主的固定时间补偿；**不含**用户调的歌词延迟 —— 那是 lyricDelay()） */
  time(): number;
  /** 用户为当前歌曲设置的「歌词延迟」（毫秒；**正数 = 歌词更晚出现**，负数 = 提前）。
   *  按歌曲持久化在宿主 localStorage，每次取值都是当前播放曲的当前档位（菜单改完下一帧就是新值）。
   *  时钟由渲染方自己扣：驱动动画用 `time() − lyricDelay()`；「点击歌词行跳转」再把延迟加回真实
   *  播放位（`seek(行起始 + lyricDelay())`），点哪行屏幕才停在哪行。宿主内置 AMLL 与行级兜底
   *  视图都按这套口径执行 —— 覆盖内置的提供器照做，用户调的延迟才不会在你的渲染器上凭空失效。
   *  旧宿主没有这个方法：读取一律走 `ctx.lyricDelay?.() ?? 0`（缺省 = 不调整）。 */
  lyricDelay?(): number;
  paused(): boolean;
  /** 正在播放页是否展开；收起时应冻结渲染循环省资源 */
  expanded(): boolean;
  showTrans(): boolean;
  /** 歌词辅助行模式：off=关闭 / translation=翻译 / romanization=音译。
   *  渲染方自己按档位挑辅助行：优先所选那一路，本行缺数据则回落另一路，off 不显示
   *  （宿主内置 AMLL 与宿主行级视图共用 src/lyric.ts:pickAux 那一份实现）。 */
  lyricAux(): "off" | "translation" | "romanization";
  /** 是否隐藏当前行之前的已播放行。宿主会按设置切换；普通滚轮浏览时宿主会临时返回 false，
   *  让用户仍能上下翻到旧行。旧宿主没有这个方法：读取一律走 `ctx.hidePassedLines?.() ?? false`。 */
  hidePassedLines?(): boolean;
  /** 隐藏已播放行时，当前行顶部在歌词容器内的纵向锚位（0..1）。
   *  null / 缺省 = 使用渲染器自己的默认对齐。旧宿主没有这个方法，按缺省处理即可。 */
  lyricTopAnchor?(): number | null;
  /** 跳转到指定位置（毫秒，**真实播放位**，不是歌词时钟 —— 见 lyricDelay() 的换算口径）。
   *  `immediate` 仅供明确点击跳转（如歌词行）：宿主可跳过淡出直接出声。 */
  seek(ms: number, opts?: { immediate?: boolean }): void;
  /** 订阅宿主 notify（约 4Hz + 播放态/展开收起等状态变化即发）；返回退订函数。
   *  渲染循环据此在页面重新展开时唤醒自己（收起时自停的 rAF 没有人会替你重启）。 */
  onNotify(cb: () => void): () => void;
}

/**
 * 歌词提供器：解析（player 拉到原始歌词后先问 provider）+ 渲染（正在播放页的歌词
 * 容器整体交给 provider）。逐字（QRC/TTML）与行级（LRC）都要认。
 *
 * 宿主自带一个内置实现（AMLL：逐字 QRC/TTML + 行级 LRC + QRC `[kana:]` 振假名注音），
 * 它在注册表里排在**所有插件提供器之后**。于是：
 *   - 不注册 = 歌词继续由内置 AMLL 渲染（做整页接管视图时照样能读 `karaoke()` 的解析结果）；
 *   - 注册了 = 你的提供器**顶掉**内置实现（先注册先得），解析 + 渲染整条管线归你 ——
 *     这是给「换一套歌词 / 播放器效果」留的门（把别的逐字引擎搬进来就走这条）。
 * 覆盖内置时 `parse` 请写成全格式都认（词级 + 行级 + 注音）：解不动的部分不会回落给
 * AMLL，而是直接掉回宿主的内置行级歌词 DOM。
 */
export interface SparkleKaraokeProvider {
  /** 解析歌词；返回 null（或空行表）= 放弃，宿主回退普通 LRC 行级歌词。
   *  行级内容也要认：返回「每行一个覆盖整行的音节」即让宿主把 LRC 也交给本提供器渲染。 */
  parse(content: string, translation: string, romanization?: string): SparkleKaraokeLine[] | null;
  /** 接管歌词容器（容器尺寸随宿主布局变化）；返回的函数在换曲/停用时调用 */
  render(host: HTMLElement, lines: SparkleKaraokeLine[], ctx: SparkleKaraokeRenderCtx): (() => void) | void;
  /** 可选总开关：false 时宿主回退行级歌词；宿主每次 notify 重读，切换即时生效。
   *  内置 AMLL 不注册它 —— 内置引擎没有「关掉」这一档，想换渲染器请注册你自己的提供器。 */
  enabled?(): boolean;
}

// —— 上下文 ——


export interface SparkleStorage {
  get(k: string): string | null;
  set(k: string, v: string): void;
  remove(k: string): void;
  /** 本插件命名空间下的全部 key（不含前缀） */
  keys(): string[];
}

export interface SparkleContext {
  readonly pluginId: string;
  /** 注册内容区路由（path 形如 "/my-page"，自动获得 hashchange/动画/错误兜底） */
  registerView(path: string, view: SparkleView): void;
  /** 注册侧栏导航项（追加在内置导航之后） */
  registerNav(item: SparkleNavItem): void;
  /** 注册侧栏歌单分组 */
  registerSonglistGroup(group: SparkleSonglistGroup): void;
  /** 注册设置页「花火插件」面板的设置分组 */
  registerSettingsSection(section: SparkleSettingsSection): void;
  /** 注册自定义主题（css = 一组 CSS 变量覆盖） */
  registerTheme(theme: SparkleTheme): void;
  /** 追加一张全站样式层（任意 CSS；order 决定层序，缺省 0）。与主题包的选择无关 */
  registerStyleLayer(layer: SparkleStyleLayer): void;
  /** 注册主题包（一套可切换的完整风格，如 Lumen 流光的亮/暗/高对比） */
  registerThemePack(pack: SparkleThemePack): void;
  /** 注册正在播放页小部件 */
  registerNowPlayingWidget(widget: SparkleNpWidget): void;
  /** 注册正在播放页整页接管视图（先注册先得；停用/关掉开关即回默认布局） */
  registerNowPlayingView(view: SparkleNpView): void;
  /** 注册正在播放页频谱形态（与内置 bars/mirror/wave 同表；停用插件即移除） */
  registerNowPlayingSpectrumMode(mode: SparkleNpSpectrumMode): void;
  /** 注册歌曲右键菜单项（追加在「更多操作」之前） */
  registerSongMenuItem(item: SparkleMenuItem | ((ctx: SparkleSongMenuCtx) => SparkleMenuItem)): void;
  /** 注册侧栏（主菜单栏）歌单右键菜单项（追加在内置项之后） */
  registerPlaylistMenuItem(item: SparkleMenuItem | ((ctx: SparklePlaylistMenuCtx) => SparkleMenuItem)): void;
  /** 注册正在播放页「更多操作」（⋮）菜单项（追加在内置项之后） */
  registerNowPlayingMenuItem(item: SparkleMenuItem | ((ctx: SparkleNpMenuCtx) => SparkleMenuItem)): void;
  /** 注册备用播放源（源链按注册顺序，先注册先试） */
  registerStreamSource(source: SparkleStreamSource): void;
  /** 注册逐字歌词提供器（先注册先得；排在宿主内置 AMLL 之前 = 覆盖它，停用即回落内置） */
  registerKaraokeProvider(provider: SparkleKaraokeProvider): void;
  /** 插件专属持久化（localStorage 命名空间） */
  storage: SparkleStorage;
  toast(msg: string, kind?: "ok" | "err"): void;
  log: {
    info(...a: unknown[]): void;
    warn(...a: unknown[]): void;
    error(...a: unknown[]): void;
  };
  player: SparklePlayerFacade;
  /** 样式门面：追加常驻样式层 / 读写主题包（详见 SparkleStyleFacade） */
  style: SparkleStyleFacade;
}
