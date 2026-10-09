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
      // 高亮色（tint）归谁管 —— SDK 的 SparkleTheme.tint，三种写法：
      //   · 不写这个字段      = 主题自带强调色。宿主「让位」：不再往 :root 写 --cvg-*，
      //                        高亮色回落 --acc（上面那行极光绿），设置页的「高亮颜色」整组禁用。
      //                        本示例就是这种 —— 主题覆盖了 --acc，让位后高亮色自然跟着走。
      //   · { mode: "host" }  = 高亮色交给用户调（固定青色 / 跟随封面 / 系统强调色 / 自定义色四档）
      //   · { mode: "presets", presets: [{ id, label, color }] } = 你给几套方案让用户挑，
      //                        第一个是默认；color 必须是 #rgb / #rrggbb，或哨兵值 "system"
      //                        （= 跟随系统强调色：Noctalia / matugen 模板、KDE / GNOME…），
      //                        非法项会被忽略
      //
      // 背景归谁管 —— SDK 的 SparkleTheme.background，两种写法：
      //   · 不写这个字段      = 主题自带背景。宿主「让位」：那层环境色（当前曲封面 / 用户自定义图）
      //                        整个不画，设置页的「背景」整组禁用。本示例就是这种 —— 底色由上面
      //                        的 --bg 决定；要铺渐变/纹样，自己在 css 里写伪元素。
      //   · { mode: "host" }  = 背景交给用户（关闭背景 / 专辑封面 / 自定义图片 + 模糊强度），
      //                        那你就别再自己铺整窗背景了 —— 写法：background: { mode: "host" }
      //
      // 浮层菜单的外观归谁管 —— SDK 的 SparkleTheme.menus，两种写法：
      //   · 不写这个字段      = 主题自带菜单外观。宿主「让位」：不再往 <html> 写
      //                        data-menu-glass 的 on/off，设置页的「菜单毛玻璃」整组禁用。
      //                        要美化菜单就在上面 css 里覆盖 --menu-filter / --menu-surface /
      //                        --menu-line / --menu-shadow / --menu-edge（本示例不加，让
      //                        菜单留在宿主的毛玻璃上）。
      //   · { mode: "host" }  = 菜单外观交给用户（设置里的「菜单毛玻璃」开关），
      //                        写法：menus: { mode: "host" }
      // 三件事各自独立：只声明其中一个，另两个仍按「不声明 = 主题接管」算。
    });
  },
});
