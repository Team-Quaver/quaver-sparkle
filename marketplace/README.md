# marketplace/ — 官方 Marketplace 收录的插件源码

本目录是官方索引（https://quaver.0w0.red/marketplace.json）的**源码真相**：每个子目录
一个待收录插件，CI（`.github/workflows/marketplace.yml`）把它们打成单文件 ESM、汇总出
索引 JSON，然后整树发布到 quaver-doc 仓库（Team-Quaver/quaver-website）：

```
marketplace/<id>/
├── plugin.json   # 元数据（见下）；id 必须与目录名一致
└── index.ts      # 打包入口：export default definePlugin({...})
```

## plugin.json 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | ✓ | kebab-case，必须与目录名一致（同时是用户侧安装目录名） |
| `name` | ✓ | 展示名 |
| `version` | ✓ | semver |
| `author` |  | 作者 |
| `description` |  | 一句话说明（列表里展示） |
| `category` |  | `theme` / `plugin` / `extension`；缺省按 `plugin`（设置页分类据此归档） |
| `homepage` |  | 主页链接 |

## 本地构建

```sh
pnpm install
pnpm build:marketplace
```

产物在 `dist/site/`：`marketplace.json` + `sparkle/plugins/<id>.js`，可直接拷进
quaver-doc 仓库的 `public/`（本地调试也可以 `pnpm build:marketplace -- --base http://127.0.0.1:8080/`）。

## 收录流程

1. 在本目录加插件（注意：官方随宿主打包的插件不进这里，id 会撞车）；
2. 合入 main → CI 自动构建并把 `marketplace.json` + 插件文件推到 quaver-doc；
3. 用户端刷新 Marketplace 即可见。插件格式与安装布局见 `docs/marketplace.md`。
