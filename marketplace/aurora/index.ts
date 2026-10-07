// Aurora 夜辉 — Marketplace 流水线示例插件（category: theme）
//
// marketplace/ 目录的最小范例：plugin.json 声明元数据（id 必须与目录名一致），
// index.ts 是打包入口；CI（.github/workflows/marketplace.yml）把它打成单文件 ESM
// 发布到 quaver.0w0.red，用户从 设置 → Sparkle → 主题 安装并启用。
// 只注册一个 Sparkle 主题：深蓝夜空底 + 极光绿强调，未覆盖的变量跟随明暗两态。
import { definePlugin } from "../../sdk/index";

export default definePlugin({
  id: "aurora",
  name: "Aurora 夜辉",
  version: "1.0.0",
  kind: "third-party",
  description: "极光色调主题：深蓝夜空底 + 极光绿强调色",
  setup(ctx) {
    ctx.registerTheme({
      id: "aurora",
      name: "Aurora 夜辉",
      css: `
        --bg: #0a1220; --card: #101b30; --side: #0d1526; --ink: #dfe9f5; --ink2: #8fa3bd;
        --acc: #57d9a3; --hover: #16233c; --line: #1e2d49;
      `,
    });
  },
});
