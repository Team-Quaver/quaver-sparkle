# Folia 辞境（Folia 歌词动效 · Lattice）

Sparkle Marketplace 插件。把 [Folia Major](https://github.com/chthollyphile/folia-major) 的正在播放页
搬进 Quaver：

- 17 种歌词样式：商籁、凝彩、绘光、花火、町景、雾笺、流光、心象、云阶、浮名、倾诉、回环、莫奈、时计、群唱、镜台、静止。
- 6 种共享背景：隐现、通用、莫奈、漫游、空、嵌入。
- **Lattice 队列海报墙**（照 Folia 本体的 12×8 世界格移植）：4 套 block template × 4 镜像、
  128px 格 / 8px 缝、相机缩放 0.52/0.64/0.76，队列不够长时整格循环补满 —— 原版那种大小错落
  的海报拼贴；可拖拽平移。**正在播放的那张在墙内原地放大成 6×6 卡片**，同块邻居按原版的
  让位表重新齿轮（不是另浮一张卡）；卡片是封面铺底 + 左上「正在播放 · 01」/ 标题 / 歌手 +
  中间当前歌词行与进度点 + 底部播放 / 进度 / 打开播放页，静止后控制条像原版一样淡出。
  点任意海报 = 播放那张，`Ctrl/Cmd+B` / Esc 回舞台。
- **控制面在走带控制里**（`registerTransportControl`）：播放条右侧多一颗 Folia 按钮，
  点开是完整控制浮窗（播放页两面 / 歌词样式 / 背景 / 字幕 / 字号 / 静态模式 / 自动隐藏）。
  正在播放页本身**不再自绘控制条**，只剩一颗返回钮。浮窗由宿主挂到 `document.body` 上
  （按按钮矩形定位），**独立于播放条**：不会被整条拖拽 seek 当成拖进度，也不随播放条的
  自动隐藏 / 停靠动画一起淡出。
- **菜单栏入口**（`registerMenuBarItem`）：主菜单里的「Folia 播放页」「Lattice」，以及侧栏
  底部调整区的总开关；显隐可在 设置 → 外观 → 菜单栏 → 插件选项 里逐项调整。
- 交互对齐 Folia：点歌词行跳转、空格暂停、`←/→` ±5s、`H` 隐藏播放条、自动隐藏（可选）。
- 样式 / 背景 / 播放页等选择存在插件自己的 `ctx.storage` 命名空间里；随时可从控制浮窗或
  设置页恢复默认播放页。

最低宿主版本 2.0.0（走带控件 / 菜单栏项 / 主题透明模式是这一版新增的 Sparkle 扩展点）。

## 结构

```
runtime/
  index.tsx     打包入口：mountFolia（播放页）/ mountFoliaControl（走带浮窗）
  view.tsx      正在播放页：舞台 / Lattice 两面 + 键盘交互 + 自动隐藏
  lattice.tsx   队列海报墙
  control.tsx   走带控制浮窗（控制面板）
  control.css   控制面板样式（挂进宿主播放条，运行时注入 document.head）
  prefs.ts      插件偏好（可订阅存储，两个 React root 共用）
  plugin.css    播放页外壳样式（Shadow DOM）
  catalog.ts    样式 / 背景清单
  vendor/Folia  Folia Major 源码快照（只取 visualizer 与共享组件）
```

## 构建

插件源码在 `vendor/Sparkle/marketplace/folia-visualizer`：

```sh
cd vendor/Sparkle/marketplace/folia-visualizer
pnpm install                         # 独立 checkout 需先装插件自己的构建依赖
node build.mjs                       # 生成 runtime.js（单文件 ESM，React/Pixi/three/CSS 内联）
node ../../scripts/build-marketplace.mjs
```

`runtime.js` 与 `node_modules` 都不入库；`build.mjs` 会在缺失时借用 `ui/node_modules` 的构建依赖。
独立 checkout / CI 没有宿主 `ui/` 时，先在本目录 `pnpm install`；构建脚本不再依赖主仓库路径。
最终发行包由 Marketplace 构建脚本输出到 `vendor/Sparkle/dist/site/sparkle/plugins/folia-visualizer.js`。

## 许可

AGPL-3.0。`runtime/vendor/Folia` 是 Folia Major 的源码快照（作者 chthollyphile），上游许可证见 `LICENSE`。
