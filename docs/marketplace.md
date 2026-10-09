# Sparkle Marketplace

Marketplace 是一个**静态 JSON 索引** + 主进程代下载的最小分发机制。

## 索引格式（version 1）

```json
{
  "version": 1,
  "updated": "2026-10-07T00:00:00Z",
  "plugins": [
    {
      "id": "die-for-you",
      "name": "Die For You 歌词",
      "version": "1.0.0",
      "minHostVersion": "1.4.0",
      "allowBeta": true,
      "author": "quaver",
      "description": "设置页随机展示《Die For You》歌词",
      "category": "plugin",
      "download": "https://quaver.0w0.red/sparkle/plugins/die-for-you.js",
      "homepage": "https://github.com/…",
      "hash": "<sha256 hex，可选>"
    }
  ]
}
```

- `download` 必须直指**单文件 ESM .js**（default export 插件对象）。v1 不做 zip 分发。
- `hash` 存在时主进程下载后校验 sha256，不匹配拒绝落盘（只防运输损坏，不防恶意）。
- `minHostVersion` 可选，表示插件要求的最低 Quaver 版本（SemVer）；宿主版本低于该值时拒绝安装。
- `allowBeta` 可选布尔值，默认为 `false`；为 `true` 时允许同一版本号的 Beta 宿主满足 `minHostVersion`。
- `id` 必须匹配 `^[a-z0-9][a-z0-9-]*$`（同时也是安装目录名）。
- `category` 是设置页里的分类归档：`theme`（主题）/ `plugin`（插件）/ `extension`（扩展）；
  缺省或未知值按 `plugin` 处理。

## 索引源（固定）

- 官方索引 URL 固定为 `https://quaver.0w0.red/marketplace.json`
  （`quaver-sparkle/market/default-index.ts` 的 `DEFAULT_MARKET_URL`）。
- 设置页里索引源**不可更改**：UI 只读展示 + 刷新，无自定义入口（早期版本的
  `localStorage["quaver.sparkle.market.url.v1"]` 已废弃）。
- 索引与下载均由**主进程** fetch（规避渲染层 CORS），经 `quaver:sparkle` IPC 的
  `market` / `install` op。

## 官方索引的构建与发布（CI）

官方索引的源码真相在本仓库 `marketplace/` 目录（每插件一个目录：`plugin.json` +
`index.ts`，见 `marketplace/README.md`）：

1. `scripts/build-marketplace.mjs` 用 esbuild 把每个插件打成单文件 ESM，算 sha256，
   汇总出 `dist/site/` 树（`marketplace.json` + `sparkle/plugins/<id>.js`）；
2. CI（`.github/workflows/marketplace.yml`）在 push 到 main 时跑构建，并把 `dist/site/`
   整树提交到 quaver-doc 仓库（Team-Quaver/quaver-website）的 `public/` ——
   于是 `https://quaver.0w0.red/marketplace.json` 与各插件安装包同步更新。

## 本地手装（添加本地插件）

Marketplace 标签里**红色渐变的「添加本地插件」**按钮：

1. 先弹**红色渐变警告弹窗**（复用更新弹窗的开闭动画），5 秒倒计时后才解锁「确认」
   —— Quaver 不审查、不背书手动安装的插件；
2. 确认后选一个单文件 ESM `.js`：主进程读文件交渲染层经 blob URL 动态 import 做
   形状校验（default export 需为 SparklePlugin，元数据取自插件本体），校验失败原地拒绝；
3. 校验通过走 `install-local` op 落盘，布局与 Marketplace 安装完全一致。

## 安装布局

```
<configDir()>/plugins/<plugin-id>/
├── plugin.json   # { id, name, version, minHostVersion?, allowBeta?, author?, description?, category?, main: "main.js" }
└── main.js       # ESM：export default <SparklePlugin>
```

- 目录解析：`QUAVER_SPARKLE_DIR` env 优先（开发调试），否则 `configDir()/plugins`。
- 宿主经 `/api/sparkle/plugin/<id>/<file>` 把插件文件以 `text/javascript` 提供给
  渲染层动态 `import()`（dev relay 与打包态 native-server 双侧同构实现）。
- `plugin.json` 由安装时的索引元数据生成（`category` 随之持久化，宿主设置页据此把
  已装内容归入 主题/插件/扩展）；本地手装插件的元数据取自插件本体（无 category，
  一律归入「插件」）。

## 安全模型

- 安装 ≠ 启用：新装插件默认关闭，需用户在设置页手动开启。
- 插件与页面同源、无沙箱，能访问页面数据。Quaver 无法保证 Marketplace 插件的
  可用性与安全性，也不推荐手动安装 —— 只安装信任来源。
