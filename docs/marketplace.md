# Sparkle Marketplace

Marketplace 是一个**静态 JSON 索引** + 主进程代下载的最小分发机制。

## 索引格式（version 1）

```json
{
  "version": 1,
  "updated": "2026-09-21T00:00:00Z",
  "plugins": [
    {
      "id": "die-for-you",
      "name": "Die For You 歌词",
      "version": "1.0.0",
      "author": "quaver",
      "description": "设置页随机展示《Die For You》歌词",
      "download": "https://example.com/sparkle/die-for-you.js",
      "homepage": "https://github.com/…",
      "hash": "<sha256 hex，可选>"
    }
  ]
}
```

- `download` 必须直指**单文件 ESM .js**（default export 插件对象）。v1 不做 zip 分发。
- `hash` 存在时主进程下载后校验 sha256，不匹配拒绝落盘（只防运输损坏，不防恶意）。
- `id` 必须匹配 `^[a-z0-9][a-z0-9-]*$`（同时也是安装目录名）。

## 索引源

- 默认 URL：`quaver-sparkle/market/default-index.ts` 的 `DEFAULT_MARKET_URL`
  （当前为空串 = 面板提示未配置索引源）。
- 用户可在设置页 Sparkle → Marketplace 覆盖索引 URL，存
  `localStorage["quaver.sparkle.market.url.v1"]`。
- 索引与下载均由**主进程** fetch（规避渲染层 CORS），经 `quaver:sparkle` IPC 的
  `market` / `install` op。

## 安装布局

```
<configDir()>/plugins/<plugin-id>/
├── plugin.json   # { id, name, version, author?, description?, main: "main.js" }
└── main.js       # ESM：export default <SparklePlugin>
```

- 目录解析：`QUAVER_SPARKLE_DIR` env 优先（开发调试），否则 `configDir()/plugins`。
- 宿主经 `/api/sparkle/plugin/<id>/<file>` 把插件文件以 `text/javascript` 提供给
  渲染层动态 `import()`（dev relay 与打包态 native-server 双侧同构实现）。
- `plugin.json` 由安装时的索引元数据生成；本地手装插件需自行提供。

## 提交插件到官方索引（规划）

官方索引仓库与收录流程后续单独建仓；v1 阶段先以自建索引 + 手动安装为主。
