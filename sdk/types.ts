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

/** 设置页 Sparkle tab 里的一个设置分组 */
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
   * Noctalia / matugen 模板产物、KDE / GNOME / GTK / macOS / Windows 的系统强调色）。
   * 宿主会解析校验，非法项忽略并 warn。`"system"` 读不到系统强调色时，宿主回落到你的
   * 第一套非哨兵方案（一套都没有则无色，让主题自己的 `--acc` 显出来）。
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
 *     方案的 `color` 还可以写 `"system"` = 跟随系统强调色（Noctalia / matugen / KDE / GNOME…，
 *     见 SparkleTintPreset）。
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
}

// —— 样式层 / 主题包 ——
//
// 为什么需要这一层：`registerTheme` 只能覆盖 --bg/--card/--acc 那十来个变量，而宿主
// style.css 里有大量**硬编码**（圆角 73 处、阴影 28 处、色值字面量 182 个）。想做
// Material Design 3 / 毛玻璃 / 极简体这种「换一套设计语言」的主题，变量组远远不够
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
 * 典型用法 = Material Design 3：一个包给「MD3 亮 / MD3 暗 / MD3 高对比」三套。
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

/** 一行歌词（行级；秒 + 文本 + 可选翻译） */
export interface SparkleLyricLine {
  /** 行起始时间（秒） */
  t: number;
  text: string;
  trans?: string;
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
  /** 队列里的上一首（按当前播放顺序，随机播放时也按当日洗牌序）；无则 null */
  prevSong(): SparkleSongSnapshot | null;
  /** 队列里的下一首；无则 null */
  nextSong(): SparkleSongSnapshot | null;
  /**
   * 以当前曲为原点、按播放顺序偏移取曲：0 = 当前，1 = 下一首，-1 = 上一首，
   * 2 = 下下首（随机播放时按当日洗牌序）。越界/到序列末尾返回 null。
   *
   * 「封面流」这类要画一整列的视图需要它：只有 prev/next 各一首时，
   * 切歌动画做不出「中间转出去 → 右边顶上 → 新的从右边转进来」的三段式
   * —— 第三张没有数据源，DOM 只能停在两张。
   */
  songAt(offset: number): SparkleSongSnapshot | null;
  /** 队列长度（0 = 空） */
  queueLength(): number;

  // —— 传输（只读） ——
  /** 当前播放位置（秒） */
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
   * 逐字歌词行（毫秒时间轴）。空数组 = 当前没有逐字数据。
   *
   * 数据来自**宿主已激活的逐字提供器**（registerKaraokeProvider，如 AMLL 插件）的
   * 解析结果 —— 整页接管视图可以据此把「当前这一句」画成逐字高亮，而不必自己
   * 重新解析 QRC/TTML。没装提供器、提供器解析失败、或该曲没有逐字内容时都是空数组。
   */
  karaoke(): SparkleKaraokeLine[];
  /**
   * 逐字歌词此刻是否接管中 = 有逐字数据 **且** 提供器在位并启用（提供器自己的
   * 总开关）。false 时视图应回退到行级歌词（lyrics()）。
   * 宿主在每次 notify 重读，所以提供器开关一改就即时反映（最迟下一个播放事件/4Hz）。
   */
  karaokeActive(): boolean;

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
  /** 可选档位（/stream/tiers 拉回；未就绪时为空数组，宿主在就绪时 notify 一次） */
  qualityTiers(): SparkleQualityTier[];

  /** 订阅宿主 notify（约 4Hz + 播放态/展开收起等状态变化即发）；返回退订函数 */
  onNotify(cb: () => void): () => void;

  // —— 控制 ——
  toggle(): void;
  seek(sec: number): void;
  next(): void;
  /** 跳到队列里的上一首（force：忽略「重放当前曲」设置，直跳队列上一首） */
  prev(): void;
  /**
   * 直接跳到「播放顺序上偏移 offset 首」的那首歌（0 = 当前，2 = 下下首）。
   * 封面流里点第几张侧封面就该跳到第几首 —— 只有 next/prev 两个动作时，
   * 多张侧封面只能全部指向同一首，交互是假的。
   */
  jumpTo(offset: number): void;
  setVolume(v: number): void;
  toggleMute(): void;
  /** 切档（会话级，不持久化；高档不可及自动回退） */
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
}

/** 逐字歌词行（与 @applemusic-like-lyrics/core 的 LyricLine 结构兼容） */
export interface SparkleKaraokeLine {
  words: SparkleKaraokeWord[];
  /** 行起始时间（毫秒） */
  startTime: number;
  /** 行结束时间（毫秒） */
  endTime: number;
  /** 翻译歌词（宿主「翻译」开关关闭时由渲染方自行剔除） */
  translatedLyric?: string;
  /** 背景人声行 */
  isBG?: boolean;
  /** 对唱行（靠右对齐） */
  isDuet?: boolean;
}

/** 渲染期间宿主提供的实时状态只读视图（闭包取值，读到的永远是当前态） */
export interface SparkleKaraokeRenderCtx {
  /** 当前播放位置（毫秒，已含宿主的时间补偿） */
  time(): number;
  paused(): boolean;
  /** 正在播放页是否展开；收起时应冻结渲染循环省资源 */
  expanded(): boolean;
  showTrans(): boolean;
  /** 跳转到指定位置（毫秒） */
  seek(ms: number): void;
  /** 订阅宿主 notify（约 4Hz + 播放态/展开收起等状态变化即发）；返回退订函数。
   *  渲染循环据此在页面重新展开时唤醒自己（收起时自停的 rAF 没有人会替你重启）。 */
  onNotify(cb: () => void): () => void;
}

/**
 * 逐字歌词提供器：解析（player 拉到原始歌词后先问 provider）+ 渲染（正在播放页
 * 的逐字歌词容器整体交给 provider）。停用插件时宿主移除 provider，自动回退行级歌词。
 */
export interface SparkleKaraokeProvider {
  /** 解析逐字歌词；返回 null（或空行表）= 放弃，宿主回退普通 LRC 行级歌词 */
  parse(content: string, translation: string): SparkleKaraokeLine[] | null;
  /** 接管逐字歌词容器（容器尺寸随宿主布局变化）；返回的函数在换曲/停用时调用 */
  render(host: HTMLElement, lines: SparkleKaraokeLine[], ctx: SparkleKaraokeRenderCtx): (() => void) | void;
  /** 可选的总开关（如插件设置里的「逐字歌词」开关）：false 时宿主回退行级歌词；
   *  宿主在每次 notify 时重读，切换即时生效（最迟下一个播放事件/4Hz）。 */
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
  /** 注册设置页 Sparkle tab 的设置分组 */
  registerSettingsSection(section: SparkleSettingsSection): void;
  /** 注册自定义主题（css = 一组 CSS 变量覆盖） */
  registerTheme(theme: SparkleTheme): void;
  /** 追加一张全站样式层（任意 CSS；order 决定层序，缺省 0）。与主题包的选择无关 */
  registerStyleLayer(layer: SparkleStyleLayer): void;
  /** 注册主题包（一套可切换的完整风格，如 Material Design 3 的亮/暗/高对比） */
  registerThemePack(pack: SparkleThemePack): void;
  /** 注册正在播放页小部件 */
  registerNowPlayingWidget(widget: SparkleNpWidget): void;
  /** 注册正在播放页整页接管视图（先注册先得；停用/关掉开关即回默认布局） */
  registerNowPlayingView(view: SparkleNpView): void;
  /** 注册歌曲右键菜单项（追加在「更多操作」之前） */
  registerSongMenuItem(item: SparkleMenuItem | ((ctx: SparkleSongMenuCtx) => SparkleMenuItem)): void;
  /** 注册侧栏（主菜单栏）歌单右键菜单项（追加在内置项之后） */
  registerPlaylistMenuItem(item: SparkleMenuItem | ((ctx: SparklePlaylistMenuCtx) => SparkleMenuItem)): void;
  /** 注册正在播放页「更多操作」（⋮）菜单项（追加在内置项之后） */
  registerNowPlayingMenuItem(item: SparkleMenuItem | ((ctx: SparkleNpMenuCtx) => SparkleMenuItem)): void;
  /** 注册备用播放源（源链按注册顺序，先注册先试） */
  registerStreamSource(source: SparkleStreamSource): void;
  /** 注册逐字歌词提供器（先注册先得；停用即回退行级歌词） */
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
