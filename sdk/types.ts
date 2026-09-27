// Quaver Sparkle — 插件类型契约（纯类型，无运行时依赖）
//
// Sparkle 是 Quaver Music 的插件系统。插件是一个实现 SparklePlugin 的对象：
// 在 setup() 里通过 SparkleContext 注册扩展点（路由/侧栏/设置页/主题/播放页/
// 右键菜单/播放源/歌单分组），返回的函数（可选）作为 dispose，在插件停用时调用。
//
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

/** 自定义主题：css 是一组 CSS 变量覆盖，作用于 html[data-sparkle-theme="<id>"] */
export interface SparkleTheme {
  id: string;
  name: string;
  css: string;
}

/** 正在播放页的插件小部件（挂在歌词区下方的插件槽内） */
export interface SparkleNpWidget {
  id: string;
  /** box 为部件容器；返回的函数在停用时调用 */
  render(box: HTMLElement): (() => void) | void;
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
  singer?: { name: string }[];
  album?: { name?: string; mid?: string };
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
  /** 注册正在播放页小部件 */
  registerNowPlayingWidget(widget: SparkleNpWidget): void;
  /** 注册歌曲右键菜单项（追加在「更多操作」之前） */
  registerSongMenuItem(item: SparkleMenuItem | ((ctx: SparkleSongMenuCtx) => SparkleMenuItem)): void;
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
}
