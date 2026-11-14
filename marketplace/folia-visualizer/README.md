# Folia 歌词动效

Sparkle Marketplace 插件。把 [Folia Major](https://github.com/chthollyphile/folia-major) 的完整正在播放页动效群搬进 Quaver：

- 17 种歌词样式：商籁、凝彩、绘光、花火、町景、雾笺、流光、心象、云阶、浮名、倾诉、回环、莫奈、时计、群唱、镜台、静止。
- 6 种共享背景：隐现、通用、莫奈、漫游、空、嵌入。
- 整页接管（`registerNowPlayingView`）：保留宿主窗口按钮与播放条；控制胶囊浮在播放条正上方
  （不占 CSD 顶带），3 秒无操作自动隐藏，指针一动就回来。
- 样式/背景选择存在插件自己的 `ctx.storage` 命名空间里；随时可从设置页恢复默认播放页。

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
