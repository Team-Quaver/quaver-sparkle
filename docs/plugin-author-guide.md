# Sparkle 插件作者指南

Sparkle 插件 = 一个实现 `SparklePlugin` 的对象。官方插件随宿主静态打包；
第三方插件以 ESM 单文件安装到 quaver 配置目录 `plugins/<id>/main.js`，
`default export` 插件对象。

## 插件骨架

```ts
import { definePlugin } from "@quaver/sparkle";

export default definePlugin({
  id: "my-plugin",        // kebab-case；第三方必须与安装目录名一致
  name: "My Plugin",
  version: "1.0.0",
  minHostVersion: "1.4.0", // 可选：低于此 Quaver 版本时不允许安装
  allowBeta: true,          // 可选：允许 1.4.0-beta.x 满足上面的最低版本
  author: "you",
  description: "…",
  kind: "third-party",    // 官方插件为 "official"
  setup(ctx) {
    // 注册扩展点…
    return () => {
      // 可选 dispose：停用/卸载时调用（清理定时器、监听等）
    };
  },
});
```

## 生命周期

- **启用**：宿主加载模块 → 形状校验（id/name/version/kind/setup）→ `setup(ctx)`。
  setup 抛错 = 插件进入 broken 态（toast 提示、不写入启用集合），不影响其它插件。
- **停用**：宿主倒序执行本插件所有注册项的反注册闭包（删路由/侧栏项/CSS/菜单项…），
  再调用 setup 返回的 dispose。
- **启用集合**持久化在 `localStorage["quaver.sparkle.enabled.v1"]`（string[]）。
- 官方插件默认启用；第三方插件安装后默认**关闭**，需手动启用。

## 扩展点

| 方法 | 效果 | 停用时 |
|---|---|---|
| `registerView(path, view)` | 注册内容区路由（`#/my-page` 可达；视图签名同宿主视图，返回清理函数可选） | 删除路由；若正停在该页则跳回首页 |
| `registerNav(item)` | 侧栏导航项（追加在内置项后） | 移除 DOM |
| `registerSonglistGroup(group)` | 侧栏歌单区追加一组自定义列表，`items()` 每次重画时取最新 | 移除分组并重画侧栏 |
| `registerSettingsSection(section)` | 设置页 Sparkle tab 的一组设置区 | 随面板销毁 |
| `registerTheme(theme)` | 自定义主题：css 注入为 `html[data-sparkle-theme="<id>"]{…}` 变量组覆盖（未覆盖的变量回落亮/暗底色）。`theme.tint` 声明**高亮色**归谁管、`theme.background` 声明**背景**归谁管、`theme.menus` 声明**浮层菜单的外观**归谁管（三者缺省都是主题自带，见相关小节） | 删 style；若正激活该主题则回落默认；高亮色/背景/菜单外观策略同步重算 |
| `registerStyleLayer(layer)` | 追加一张**全站样式层**（任意 CSS，不限变量覆盖）。`order` 决定层序，缺省 0；插件启用即生效，与主题包选择无关 | 摘掉这张 `<style>` |
| `registerThemePack(pack)` | 注册主题包（一套可切换的完整风格，如 MD3 的亮/暗/高对比）。用户在 设置 → Sparkle → 主题 里切 | 停用插件即摘除；若正选中该包则自动回落默认外观 |
| `registerNowPlayingWidget(w)` | 正在播放页歌词区下方的插件槽内挂部件 | 移除 DOM + 调 render 的清理函数 |
| `registerNowPlayingView(v)` | **整页接管**正在播放页：宿主让出 `.np-inner`、隐藏原播放条与插件槽，插件自绘整页（封面流 / 歌词 / 播放控制）。`v.enabled()` 返回 false 时不接管；`render(host, ctx)` 的 ctx 见下 | 卸载插件视图、恢复默认布局、恢复播放条 |
| `registerSongMenuItem(item|fn)` | 歌曲右键菜单追加项（可传函数按上下文动态生成） | 移除菜单项 |
| `registerPlaylistMenuItem(item|fn)` | 侧栏（主菜单栏）歌单右键菜单追加项：fn 收到 `{id,title,kind,songnum}`，`kind` 是 `created` / `fav` / `virtual`（每日 30 首、我喜欢），可据此给出不同项 | 移除菜单项 |
| `registerNowPlayingMenuItem(item|fn)` | 正在播放页「更多操作」（⋮）菜单的追加项：fn 收到 `{song}`（没在播时为 `null`）。这个面是**扁平列表**，只有 `label` / `disabled` / `run` / `danger` / `note`（作 title）生效，`sub` 与缩略图不渲染 | 移除菜单项 |
| `registerStreamSource(src)` | 备用播放源链的一环：`resolve(song, quality)` 返回 `{url,...}` 即采用，`null` 放行下一环；全链落空走官方 `/stream/resolve` | 移出源链 |
| `registerKaraokeProvider(p)` | 逐字歌词提供器：`parse(content, translation)` 返回词级时间轴行（`null` = 放弃，宿主回退行级 LRC）；`render(host, lines, ctx)` 接管正在播放页逐字歌词容器（`ctx` 为时间/播放态/翻译开关/seek 的只读闭包） | 移除 provider；正在播放页自动回退行级歌词 |

注意：插件源抛错会被宿主吞掉并 warn（不阻塞播放）；菜单项结构与宿主 MenuItem 同型
（`label/note/thumb/round/danger/disabled/sub?/run?`）。

## 整页接管正在播放页（registerNowPlayingView）

`registerNowPlayingWidget` 只是歌词区下方的一小块浮层，**拿不到传输控制**，做不了
「换一种正在播放页」。要重排整页（Cover Flow / 磁带机 / 极简大字…）用这个扩展点。

```ts
ctx.registerNowPlayingView({
  id: "my-np",
  enabled: () => ctx.storage.get("on") !== "off", // 可选总开关，宿主每次 notify 重读
  render(host, np) {
    // host 铺满 .np；宿主已隐藏默认布局（歌词列 + 右侧信息列）、插件槽与底部播放条。
    // 背景的模糊封面层（.np-bg）与压暗层（.np-scrim）仍在，可以直接借来当底色。
    host.innerHTML = `…`;
    np.prevCard.onclick = () => np.prev();   // 上下曲绑在封面上
    const off = np.onNotify(() => paint());
    return () => { off(); host.innerHTML = ""; };
  },
});
```

`np`（`SparkleNpViewCtx`）是**只读闭包 + 明确控制面**的组合，读到的永远是当前态：

| 分类 | 方法 |
|---|---|
| 页面 | `expanded()` / `gallery()` / `collapse()` |
| 曲目 | `current()` / `prevSong()` / `nextSong()` / `songAt(offset)` / `queueLength()` |
| 传输（只读） | `time()` / `duration()` / `paused()` / `loading()` / `error()` |
| 歌词（只读） | `lyrics()` / `lyricState()` / `showTrans()` / `karaoke()` / `karaokeActive()` |
| 音量（只读） | `volume()` / `muted()` |
| 音质（只读） | `quality()` / `qualityLabel()` / `lastStream()` / `qualityTiers()` |
| 控制 | `toggle()` / `seek(sec)` / `next()` / `prev()` / `jumpTo(offset)` / `setVolume(v)` / `toggleMute()` / `switchQuality(id)` / `toggleTrans()` / `loved(mid)` / `toggleLove()` |
| 订阅 | `onNotify(cb)` → 退订函数 |

`songAt(offset)` 与 `jumpTo(offset)` 是给「封面流」这类要画一整列邻曲的视图准备的：
`prevSong/nextSong` 只给相邻两首，DOM 里就只有三张卡，切歌时做不出
「中间转出去 → 右边顶上 → 新的从右边转进来」的三段式（第三张没有数据源）。

几条容易踩的：

- **邻曲别自己写 index±1**：`prevSong()/nextSong()` 走宿主的播放顺序（随机播放时
  是当日洗牌序，不是队列原序），宿主内部与播放推进共用同一条 `stepInOrder`。
- **`prev()` 是 force 语义**：忽略设置里的「重放当前曲」，直跳队列上一首。封面流
  的「点左封面 = 上一首」必须是这个，否则点了会原地重播。
- **notify 只有 ~4Hz**。位置是外推时钟，要跟手的进度条/歌词高亮得自驱 rAF；
  收起时自停、重新展开靠 `onNotify` 唤醒（自停的 rAF 没人会替你重启）。
- **`qualityTiers()` 初次可能为空**：档位表是异步拉的，就绪时宿主会主动多广播一次
  notify，不必自己轮询。
- 接管期间**不要再自己画背景模糊**：宿主那两层还在，重复铺只会白烧一次解码。
- **想画逐字歌词就复用宿主已激活的提供器**：`karaoke()` 直接给出词级行（毫秒时间轴），
  这些行是 `registerKaraokeProvider` 的插件（如 AMLL）解析好的 —— 别自己重写 QRC/TTML 解析。
  `karaokeActive()` 表示此刻是否真的接管中（有数据 + 提供器在位且启用；提供器自带开关关掉时
  为 false 但 `karaoke()` 可能还留着上次的结果），false 时务必回退 `lyrics()` 行级，
  否则用户在设置里关掉逐字，你的页面还在逐字跳。逐词高亮的时钟用自己的 rAF（notify 只有 4Hz）。
- **要「跳转歌手/专辑/搜索」直接写 hash 路由**（`location.hash = "#/singer?mid=…&name=…"`、
  `#/album?mid=…&name=…`、`#/search?keyword=…`），歌手/专辑的 mid 在曲目快照里。
  但记住：**正在播放页是铺满全窗的常驻悬浮层，只换路由它仍盖在最上面** —— 跳转前先
  `np.collapse()`，否则用户点完什么都看不到变。
- 插件仍拿不到队列本体（只能读当前曲与两个邻曲），也改不了播放模式。

参考实现：`marketplace/flowscape/`（Flowscape 流境 —— 专辑流 + 自绘控制带）。

## storage / toast / log / player

- `ctx.storage`：localStorage 命名空间（`sparkle.<pluginId>.<key>`），get/set/remove/keys。
- `ctx.toast(msg, "ok"|"err")`：右上提示条。
- `ctx.log.info/warn/error`：控制台输出自动带 `[sparkle:<id>]` 前缀。
- `ctx.player`：只读门面（current/time/paused/on）。`on` 约 4Hz + 状态变化触发，
  返回退订函数——请在 dispose 里退订。插件**不能**直接改队列或播放状态。

## 自定义主题写法

`theme.css` 是一组 CSS 变量（变量名与 `ui/src/style.css` 的主题组一致），例如：

```ts
ctx.registerTheme({
  id: "my-theme",
  name: "我的主题",
  css: `--bg:#101014; --card:#17171d; --ink:#e8e8f0; --acc:#8a7dff;`,
});
```

### 高亮色（tint）归谁管 —— `theme.tint`

宿主的高亮色（`--cvg-accent` / `--cvg-glow` / 播放条的 `--cvg-bar-fill` / `--cvg-bar-line`）
平时由用户「设置 → 外观 → 高亮颜色」控制（固定青色 / 跟随封面 / **系统强调色** / 自定义色），
并且是以**行内样式**写在 `:root` 上的。行内样式压过任何选择器 —— 所以你在 `css` 里写
`--cvg-accent` 抢不赢。要拿到高亮色，靠的是**声明归属**，而不是抢变量：

| 写法 | 谁管高亮色 | 效果 |
| --- | --- | --- |
| **不写 `tint`**（默认） | 主题 | 宿主**让位**：不再写那几个变量，`--cvg-accent` 回落 `:root { --cvg-accent: var(--acc) }`。你只要在 `css` 里覆盖 `--acc`，高亮色就跟着走。设置页的「高亮颜色」整组禁用并注明由你接管 |
| `tint: { mode: "host" }` | 用户 | 宿主那四档照常生效，用户可自由改 |
| `tint: { mode: "presets", presets: [...] }` | 用户（在你的方案里挑） | 你在设置页提供几套高亮方案，用户选一套。`presets[0]` 是默认；`color` 必须是 `#rgb` / `#rrggbb` 或哨兵值 `"system"`（跟随系统强调色）、`"cover"`（跟随当前封面主色），`id`/`label` 非空且 `id` 不重复，非法项会被忽略 |

```ts
// 1) 不写 tint：主题自带强调色（下面 --acc 的紫），宿主让位 → 高亮色跟着紫走
ctx.registerTheme({
  id: "my-theme", name: "我的主题",
  css: `--bg:#101014; --card:#17171d; --ink:#e8e8f0; --acc:#8a7dff;`,
});

// 2) 想让用户自己调高亮色
ctx.registerTheme({ id: "t2", name: "T2", css: `…`, tint: { mode: "host" } });

// 3) 想让用户在你的两套配色里挑
ctx.registerTheme({
  id: "t3", name: "T3", css: `…`,
  tint: { mode: "presets", presets: [
    { id: "violet", label: "紫罗兰", color: "#8a7dff" },
    { id: "amber", label: "琥珀", color: "#ffb648" },
  ] },
});

// 4) 再加哨兵档：color 写 "system" = 跟随系统强调色（Noctalia / matugen 模板产物、
//    KDE / GNOME / GTK / macOS / Windows），换桌面配色自动跟随；color 写 "cover" =
//    跟随当前曲封面主色，换曲自动跟随。哨兵读不到时宿主回落到你的第一套非哨兵方案
//    （所以至少留一套具体色值更稳）。
ctx.registerTheme({
  id: "t4", name: "T4", css: `…`,
  tint: { mode: "presets", presets: [
    { id: "violet", label: "紫罗兰", color: "#8a7dff" },
    { id: "system", label: "系统强调色", color: "system" },
    { id: "cover", label: "封面颜色", color: "cover" },
  ] },
});
```

**「系统强调色」是什么**：宿主按这个顺序探测一个源色 —— 用户配置目录里的
`system-theme.json` / `system-theme.css`（Noctalia / matugen 的模板写给它，最推荐）→
Noctalia 的当前配色（`colors.json`、v5 `palettes/<name>.json`、社区配色缓存）→
`~/.cache/matugen/colors.json` → KDE `kdeglobals` 的 `AccentColor` → GNOME `gsettings
accent-color` → GTK css 的 `@define-color accent_bg_color` → macOS / Windows 的系统强调色。
Noctalia 用户在 `~/.config/noctalia/templates.toml` 里加一条：

```toml
[theme.templates.user.quaver]
input_path  = "$XDG_CONFIG_HOME/noctalia/templates/quaver-music.json"
output_path = "$XDG_CONFIG_HOME/quaver-music/system-theme.json"
```

配一个模板文件 `~/.config/noctalia/templates/quaver-music.json`（matugen 同款语法）：

```json
{
  "dark":  { "primary": "{{ colors.primary.dark.hex }}" },
  "light": { "primary": "{{ colors.primary.light.hex }}" }
}
```

用户挑了哪一套按主题 id 存在本地，在主题之间来回切不丢。无论哪种模式，你都**不该**再写 `--cvg-*`。

### 背景归谁管 —— `theme.background`

「设置 → 外观 → 背景」是宿主的一层环境色：关闭背景 / 专辑封面 / 自定义图片 + 模糊强度。
它是铺在主界面最底下的一整层（`ui/src/lib/ambient.ts`），用户的自定义壁纸会从主题的底色底下
透出来 —— 自带视觉的主题和它很容易打架。所以归属同样是**声明制**：

| 写法 | 谁管背景 | 效果 |
| --- | --- | --- |
| **不写 `background`**（默认） | 主题 | 宿主**让位**：那一层整个不画，设置页的「背景」整组禁用并注明由你接管。想自带背景就在 `css` 里画（覆盖 `--bg`、或用伪元素铺整窗） |
| `background: { mode: "host" }` | 用户 | 用户的三档与模糊强度照常生效。你就**别**再自己铺整窗背景了 —— 那会和用户选的东西打架 |

```ts
// 1) 不写 background：主题自带背景（比如自己在 css 里铺一层渐变/纹样），宿主让位
ctx.registerTheme({
  id: "my-theme", name: "我的主题",
  css: `--bg:#101014; --card:#17171d;
        html[data-sparkle-theme="my-theme"] body::before{ content:""; position:fixed; inset:0;
          background: radial-gradient(60% 50% at 20% 10%, #1b2b4a 0, transparent 70%); z-index:-1; }`,
});

// 2) 背景交给用户（他可以在设置里选封面 / 自定义图，还能调模糊强度）
ctx.registerTheme({ id: "t2", name: "T2", css: `…`, background: { mode: "host" } });
```

### 浮层菜单的外观归谁管 —— `theme.menus`

宿主的浮层菜单共用一套玻璃（令牌 `--menu-filter` / `--menu-surface` / `--menu-line` /
`--menu-shadow` / `--menu-edge`），用户在「设置 → 外观 → 菜单毛玻璃」里用一棵开关控制
（开 = 玻璃底 + 模糊；关 = 实底不模糊）。「归谁管」的判定口径与 `tint` / `background` 完全一致：

| 写法 | 谁管菜单外观 | 效果 |
| --- | --- | --- |
| **不写 `menus`**（默认） | 主题 | 宿主**让位**：不再往 `<html>` 写 `data-menu-glass` 的 on/off，设置页的「菜单毛玻璃」整组禁用并注明由你接管。你在 `css` 里覆盖那几个 `--menu-*` 令牌即可 —— `html[data-sparkle-theme="<id>"]` 的特异性本来就高于 `:root` |
| `menus: { mode: "host" }` | 用户 | 用户那棵开关照常生效。你就**别**再写 `--menu-*` 了 —— 写了会被开关盖掉 |

消费这套令牌的七处菜单（想直接按选择器重画形态就用这些类名）：`.ctx-menu`（侧栏歌单 /
歌曲右键菜单）、`.pb-qpop`（音质）、`.pb-lpop`（播放模式）、`.pb-volpop`（音量）、
`.np-menu`（正在播放页「更多操作」）、`.np-qinfo`（音频流信息）、`.tint-pop`（设置页颜色
选择器）。注意`.np`（正在播放页）对同名令牌另有一套深色值，想连那一页一起改就写
`html[data-sparkle-theme="<id>"] .np { --menu-surface: … }`。

```ts
// 1) 不写 menus：主题自带菜单外观（比如把右键菜单做成不透明的大圆角卡片），宿主让位
ctx.registerTheme({
  id: "my-theme", name: "我的主题",
  css: `--menu-filter:none; --menu-surface:#1b1c22; --menu-line:#ffffff1a;
        --menu-shadow:0 16px 40px #0008; --menu-edge:transparent;
        .ctx-menu, .pb-qpop { border-radius: 16px; }`,
});

// 2) 菜单外观交给用户（他可以在设置里开关毛玻璃）
ctx.registerTheme({ id: "t2", name: "T2", css: `…`, menus: { mode: "host" } });
```

`tint`、`background` 与 `menus` 各自独立声明：只声明其中一个，另两个仍然按
「不声明 = 主题接管」算。

已知取舍：sparkle 主题是独立覆盖层，不参与「跟随系统」的明暗切换；也不会写进
`Style.Style` 配置。未来并入外观选择器时会迁移。

## 全站样式层与主题包（换一套设计语言）

`registerTheme` 只能覆盖 `--bg / --card / --acc` 那十来个变量。宿主样式表里**硬编码**
的部分它管不到 —— 实测 `ui/src/style.css` 有 405 处 `var()` 引用，但同时有 182 个色值
字面量、73 处 `border-radius`、28 处 `box-shadow`。所以想做 Material Design 3 / 毛玻璃 /
极简大字这种「圆角体系、阴影层级、组件形态全换一遍」的主题，得能注入**任意 CSS**。

### 常驻样式层（随插件启停）

不需要用户选择、只想给自己的功能配一套视觉时用这个：

```ts
ctx.registerStyleLayer({
  id: "my-ui",
  css: `.toast { border-radius: 4px; box-shadow: none; }`,
  order: 10, // 层序，小的在下；缺省 0
});
```

- 层序 = `order` 升序，同 `order` 按注册序。**主题风格的 order 缺省是 +1000** ——
  也就是说主题压得过常驻层，插件不能靠微调样式层悄悄盖掉用户选的主题。
- 切主题不影响常驻层；停用插件时整张 `<style>` 精确摘掉（key 由宿主生成，反注册
  闭包已绑好，插件不用自己管）。
- 想按当前主题风格调整自己的行为（比如高对比风格下换强调色），用 `ctx.style.state()`
  + `ctx.style.onChange(cb)` 订阅，别去解析 CSS。

### 主题包（一套可切换的完整风格）

```ts
ctx.registerThemePack({
  id: "md3",
  name: "Material Design 3",
  author: "…",
  description: "圆润的 MD3 风格",
  preview: ["#6750a4", "#eaddff", "#1d1b20"], // 设置页色板（纯展示）
  variants: [
    { id: "light", name: "MD3 亮", scheme: "light", preview: ["#6750a4", "#eaddff"],
      css: `:root { --bg: #fef7ff; --card: #fffbfe; --acc: #6750a4; --radius: 16px; }` },
    { id: "dark", name: "MD3 暗", scheme: "dark", preview: ["#d0bcff", "#4f378b"],
      css: `:root { --bg: #141218; --card: #1d1b20; --acc: #d0bcff; --radius: 16px; }` },
  ],
});
```

- **第一个 variant 是默认风格**（用户没切过时用它）。用户在 设置 → Sparkle → 主题 里
  选；选中态持久化在 `localStorage`。
- `scheme` 声明亮底/暗底，宿主据此写 `html[data-sparkle-scheme]` → `color-scheme`，
  让滚动条、原生控件、表单元素跟着对（否则会出现「暗底页面 + 亮色滚动条」）。
  **不声明 = 尊重用户的「跟随系统」，宿主不动它。** 注意 `color-scheme` 只管原生控件，
  页面背景仍归宿主 `html[data-theme]` 的变量组，别在 `scheme` 上纠缠。
- **只注入选中的那一张**，切走时整张 `<style>` 摘掉（不留残留声明 —— 这与
  `registerTheme` 靠选择器自然失活的做法不同）。
- 选中包所属插件被**停用/卸载**时自动回落默认外观。否则用户会卡在一张已经没人提供
  的样式上，而设置页列表里已无那个包，无从切走。
- 想额外给某套风格配设置项，用 `ctx.registerSettingsSection`（渲染在插件的齿轮弹窗
  里），不要在样式层里自己造 UI。

### 逃生通道

第三方样式能改宿主全部 UI —— 这是**设计意图**（主题就该全站生效），但也意味着一个
坏主题能把界面搞得没法用。所以设置页 Sparkle → 主题 底部有「暂停全部插件样式」总闸：
一个 localStorage 键，不经过任何插件，是唯一不依赖插件的退出路径。

给插件作者的两条自律（宿主不审查，但这两条是社区约定）：
1. 别用 `position: fixed` 自绘层盖住右上角窗口按钮簇（`.winbtns`，z-index 90）。
2. 别把 `--font-default` 之外的字体族写死到 `body` 级别 —— 用户在 设置 → 外观 选的
   界面/歌词字体会被你的 `body { font-family: … }` 顶掉。

## 调试第三方插件

1. 开发机设 `QUAVER_SPARKLE_DIR=/path/to/my-plugins`（主进程与 dev relay 同读）。
2. 目录里放 `my-plugin/main.js`（ESM，default export 插件对象）与 `plugin.json`
   （`{ id, name, version, main: "main.js" }`）。
3. 打开设置页 Sparkle tab：列表应出现该插件 → 启用。改完 main.js 后「卸载→重装」
   或直接重启应用（`?v=` 缓存破坏以安装时间戳为键）。

## 安全须知

第三方插件在渲染层运行**任意 JS**（contextIsolation 开启、nodeIntegration 关闭，
插件只能触达宿主暴露的桥）。只安装信任来源；宿主侧的 `hash` 字段仅防运输损坏，
不构成签名校验。
