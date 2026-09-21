# quaver-sparkle

Quaver Music 插件系统 **Sparkle** 的 SDK 与官方插件仓库。本仓库以 git submodule 形式
挂在 quaver-music 的 `vendor/Sparkle`（与 `vendor/Typhoeus`、`vendor/QQMusicApi` 同模式），
由 ui 的 Vite 经 `@quaver/sparkle` alias 源码级打进 `ui/dist`，本包不单独构建。

```
sdk/      类型契约（sdk/types.ts）+ definePlugin 辅助（sdk/index.ts）
plugins/  官方插件（随宿主静态打包，如 plugins/die-for-you）
market/   Marketplace 索引格式约定与默认索引 URL 常量
docs/     插件作者指南 / Marketplace 与安全模型
```

## 快速上手（插件作者）

```ts
import { definePlugin } from "@quaver/sparkle";

export default definePlugin({
  id: "hello-world",           // kebab-case，第三方插件须与目录名一致
  name: "Hello World",
  version: "1.0.0",
  kind: "third-party",
  setup(ctx) {
    ctx.registerSettingsSection({
      id: "hello",
      title: "Hello",
      render(box) {
        const p = document.createElement("p");
        p.textContent = "Hello from Sparkle!";
        box.append(p);
      },
    });
  },
});
```

完整扩展点说明见 `docs/plugin-author-guide.md`；第三方插件的打包/发布/安装见
`docs/marketplace.md`。

## 宿主侧索引

- 宿主运行时：`ui/src/sparkle/`（registry / host / loader / settings / init）
- 路由别名：`@quaver/sparkle` → `vendor/Sparkle/sdk/index.ts`，`@quaver/sparkle/*` → `vendor/Sparkle/*`
- 本仓库变更流程：在 quaver-sparkle 仓库提交 → quaver-music 仓库 `git add vendor/Sparkle` 固定版本
