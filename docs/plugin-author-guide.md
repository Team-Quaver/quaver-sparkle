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
| `registerTheme(theme)` | 自定义主题：css 注入为 `html[data-sparkle-theme="<id>"]{…}` 变量组覆盖（未覆盖的变量回落亮/暗底色） | 删 style；若正激活该主题则回落默认 |
| `registerNowPlayingWidget(w)` | 正在播放页歌词区下方的插件槽内挂部件 | 移除 DOM + 调 render 的清理函数 |
| `registerSongMenuItem(item|fn)` | 歌曲右键菜单追加项（可传函数按上下文动态生成） | 移除菜单项 |
| `registerStreamSource(src)` | 备用播放源链的一环：`resolve(song, quality)` 返回 `{url,...}` 即采用，`null` 放行下一环；全链落空走官方 `/stream/resolve` | 移出源链 |
| `registerKaraokeProvider(p)` | 逐字歌词提供器：`parse(content, translation)` 返回词级时间轴行（`null` = 放弃，宿主回退行级 LRC）；`render(host, lines, ctx)` 接管正在播放页逐字歌词容器（`ctx` 为时间/播放态/翻译开关/seek 的只读闭包） | 移除 provider；正在播放页自动回退行级歌词 |

注意：插件源抛错会被宿主吞掉并 warn（不阻塞播放）；菜单项结构与宿主 MenuItem 同型
（`label/note/thumb/round/danger/disabled/sub?/run?`）。

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

已知取舍：sparkle 主题是独立覆盖层，不参与「跟随系统」的明暗切换；也不会写进
`Style.Style` 配置。未来并入外观选择器时会迁移。

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
