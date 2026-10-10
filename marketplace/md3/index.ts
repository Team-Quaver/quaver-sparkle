// Material Design 3 — 主题实现
//
// 只做两件事：
//   ① 把 M3 色彩角色（--md-*）与一组静态令牌（形状刻度 / 层级阴影 / 状态层）写进
//      html[data-sparkle-theme="md3"] 作用域；
//   ② 把宿主自己的语义变量（--bg/--card/--acc/--menu-*…）**映射**到 M3 角色上，
//      再对少数硬编码了圆角/阴影的组件做形态重塑。
//
// 于是：换 Tint 方案 → 宿主重写行内染色变量 → 源色变 → 全部角色跟着重算
// → 映射与组件规则自动跟随。主题不需要知道用户选了哪套方案。
//
// 两个必须记住的约束：
//   · 宿主把 css 直接塞进 `html[data-sparkle-theme="<id>"]{ … }`，所以这里写的是
//     **CSS 嵌套**（`& .foo`）。Chromium 120+ 原生支持（esbuild 的 target 也是 chrome120）。
//   · 主题声明了 tint=presets，就**不能再写 --cvg-***（那是宿主地盘，写了也被行内样式压掉）。
//     源色只能**读**。
import { definePlugin } from "../../sdk/index";
import { ELEVATION, SHAPE, STATE, TINT_PRESETS, schemeDecls, type SchemeName } from "./tokens";

/**
 * 源色取自哪个宿主变量 —— 这里有个必须绕开的环，别随手改回 --cvg-accent：
 *
 * 本主题把 `--acc` 映射到了 `--md-primary`（设置页选中卡、更新按钮这些纯 `var(--acc)`
 * 的消费点才会跟着 M3 主色走）。而宿主 `:root` 里有 `--cvg-accent: var(--acc)`。
 * 若源色再引 `--cvg-accent`，依赖链就成了
 *   --acc → --md-primary → 源色 → --cvg-accent → --acc
 * —— 一条自反环。用户没在播放、宿主尚未写行内染色值时，这一整圈会被判为
 * 「computed-value 阶段非法」，--acc/--bg/--ink 全塌成空值，界面瞬间失去配色。
 *
 * 所以源色改用 `--cvg-bar-line`：播放条线色，**只有行内写值这一条来路**
 * （ui/src/style.css 里没有 :root 声明，只有消费点的 fallback）。它由宿主 applyTint 用
 * toBarColors 从同一个预设色派生（色相一致），且不在任何依赖环上 —— 环就此断开。
 * 未装/未启用主题（没写行内值）时回落到 M3 baseline 紫，而不是空值。
 */
const SOURCE_VAR = "var(--cvg-bar-line, #6750a4)";

/** 一套方案（亮/暗）的令牌块：全部色彩角色 + 该方案该用的层级阴影。 */
function schemeBlock(scheme: SchemeName, indent: string): string {
  const roles = schemeDecls(scheme).map((d) => `${indent}${d}`);
  const elev = Object.entries(ELEVATION[scheme]).map(([lv, v]) => `${indent}--md-elev-${lv}: ${v};`);
  return [...roles, ...elev].join("\n");
}

/** 与方案无关的静态刻度（形状 / 状态层）。 */
const STATIC_TOKENS = [
  ...Object.entries(SHAPE).map(([k, v]) => `  --md-shape-${k}: ${v};`),
  ...Object.entries(STATE).map(([k, v]) => `  --md-state-${k}: ${v};`),
].join("\n");

/**
 * 角色 → 宿主变量的映射。引用式，所以暗色方案换掉角色值后这一整块不用重写。
 * 挑值口径：surface 家族给底/卡/侧栏，container 家族给选中与占位，outline 给描边，on-* 给文字。
 */
const HOST_MAP = `
  --bg: var(--md-surface);
  --card: var(--md-surface-container-low);
  --side: var(--md-surface-container);
  --ink: var(--md-on-surface);
  --ink2: var(--md-on-surface-variant);
  /* ink3 介于正文与次级之间：M3 没有对应角色，用两级 on-surface 按比例调出来 */
  --ink3: color-mix(in srgb, var(--md-on-surface) 78%, var(--md-on-surface-variant));
  --idx: var(--md-outline);
  --line: var(--md-outline-variant);
  --sep: color-mix(in srgb, var(--md-outline-variant) 75%, transparent);
  --hover: var(--md-surface-container-high);
  --row-hover: var(--md-surface-container-high);
  --nav-active: var(--md-secondary-container);
  --nav-active-line: var(--md-outline-variant);
  --ph: var(--md-surface-container-high);
  --ph2: var(--md-surface-container-highest);
  --track: var(--md-surface-container-highest);
  --press: color-mix(in srgb, var(--md-on-surface) 10%, transparent);
  --tint-row: var(--md-primary-container);
  --pill: color-mix(in srgb, var(--md-surface-container-low) 55%, transparent);
  /* 面板一律**实底**：M3 是「同底满幅 + tonal surface」，压根没有玻璃那一层。
     宿主 .sidebar/.content/.player 各自还带 backdrop-filter，那几条在 COMPONENTS 里关掉。
     --glass 给侧栏（navigation drawer → surface-container-low）、--panel 给内容区（surface），
     播放条（bottom app bar）在 COMPONENTS 里单独定 surface-container。 */
  --panel: var(--md-surface);
  --panel-line: transparent;
  --glass: var(--md-surface-container-low);
  --glass-line: transparent;
  /* 强调色：纯 var(--acc) 的消费点（设置页选中卡 / 更新按钮 / 进度条…）跟着 M3 主色走 */
  --acc: var(--md-primary);
  --cyan: var(--md-tertiary);
`;

/**
 * 菜单令牌：本主题**不声明** `menus` = 接管浮层菜单外观，所以要自己提供 --menu-*。
 * M3 的菜单是 elevation 面板、不是玻璃 —— 关掉模糊（none 而非 blur(0px)：后者照样建
 * backdrop root），表面换成 M3 的 container-high，描边用 outline-variant，投影走 level 2。
 *
 * 为什么单独一条 `&[data-theme]` 而不是并进 HOST_MAP：
 *   宿主 style.css 里还有一条 `html[data-theme="dark"] { --menu-surface: … }`，
 *   与主题的 `html[data-sparkle-theme="md3"]` **特异性完全相同**（都是 0,1,1）——
 *   谁赢只取决于源码顺序（运行时 append 的 style 碰巧在后，但这不稳）。补上
 *   `[data-theme]` 这一级后特异性升到 (0,2,1)，暗色下也能确定性压过宿主。
 *   data-theme 由 lib/prefs.ts 在 boot 时恒写（documentElement.dataset.theme），存在性可靠。
 */
const MENU_TOKENS = `
  --menu-filter: none;
  --menu-surface: var(--md-surface-container-high);
  --menu-line: var(--md-outline-variant);
  --menu-shadow: var(--md-elev-2);
  --menu-edge: transparent;
`;

/**
 * 组件形态重塑。两层：
 *   ① **满幅**：拆掉宿主的「浮动玻璃卡」语言（`.body` 10px 外距 + 三块 14px 圆角 + 大阴影 +
 *      backdrop-filter），换成 M3 的同底满幅 —— 导航抽屉与内容区贴边相连，层次靠 tonal
 *      surface（surface / surface-container-low / surface-container）而不是「浮起」。
 *   ② **刻度**：按 M3 规格定尺寸 —— 顶带 64px（top app bar）、抽屉项 56px、列表/歌单行 56px、
 *      图标按钮 40px、正文 14px/20px。圆角按 M3 shape scale：菜单 4（xs）· 卡片 12（m）·
 *      对话框 28（xl）· 按钮与导航 pill 全圆。
 *
 * ⚠️ 动这一块之前先 `grep -n "side-collapsed" ui/src/style.css` 对一遍。
 *    缩态是一组特异性 (0,2,2) 的规则（如 `body.side-collapsed .nav a`），而主题选择器天然也是
 *    (0,2,2) —— 同分只靠源码顺序（运行时 append 的 style 在后，能赢）。也就是说**任何尺寸覆盖
 *    都会顺带把缩态顶掉**。所以凡缩态也声明的属性（`.nav a` 的 padding/gap、`.sidebar` 的
 *    flex-basis/padding、`.user` 的 padding、`.pl` 的 padding…），一律加
 *    `& body:not(.side-collapsed)` 门（降到 (0,3,3)）只在展开态生效；
 *    形状类（border-radius / background）缩态不管，可以无条件写。
 */
const COMPONENTS = `
  /* ===== ① 满幅：去掉浮动面板与玻璃 ===== */
  & .body { padding: 0; gap: 0; }
  /* .side-resizer 本来用 margin:0 -10px 去「吃掉」.body 那 10px 间距；间距归零后它会盖住
     侧栏/内容各 10px，而它 z-index:30 —— 那片区域的点击（含导航项右缘）会被它吞掉。
     改成不重叠的 10px 拖拽槽。 */
  & .side-resizer { margin: 0; }
  /* 玻璃在 M3 里不存在：三块面板 + 播放条那层伪元素的模糊全部关掉（none 而非 blur(0)） */
  & .sidebar, & .content, & .player, & .player::before { backdrop-filter: none; }
  & .sidebar, & .content { border-radius: 0; box-shadow: none; }
  & .sidebar { border: 0; border-right: 1px solid var(--md-outline-variant); }
  /* 播放条 = M3 bottom app bar：满幅（去掉 0 10px 10px 外距与 14px 圆角），靠色阶 + 上边线分层 */
  & .player {
    margin: 0; border-radius: 0; box-shadow: none; border: 0;
    border-top: 1px solid var(--md-outline-variant); background: var(--md-surface-container);
  }
  /* 进度条裁切层原与播放条的 14px 圆角配成一对；播放条改直角后这里也归零 */
  & .pb-fill-clip { border-radius: 0; }
  /* 顶带那条 112px 渐隐是给浮动卡做「标题栏」过渡的；满幅下顶栏是实底 app bar，
     本来整条 display:none —— 但**不能真删**：宿主下翻贴顶的吸顶条 / 吸顶页头
     （歌单/歌手页的「名字 + 搜索/排序」、首页与我喜欢这类页头）就是吃这一层压住
     从下面滚过去的行；删了它，长列表会直接从吸顶区底下透出来，看着很怪。
     所以改成 M3 口径的同一层：app bar + 吸顶区 = 实底 surface，只有最底下 22px 化开。
     高度对齐宿主：64px app bar + JS 写的 --stuck-h（当前吸顶区高度）。 */
  & .content::before {
    height: calc(64px + var(--stuck-h, 0px));
    min-height: 120px;
    background: linear-gradient(to bottom,
      var(--md-surface) calc(100% - 22px),
      color-mix(in srgb, var(--md-surface) 55%, transparent) calc(100% - 10px),
      transparent 100%);
  }
  /* 抽屉宽度：M3 navigation drawer = 360。宿主读的是 <body> 的 --side-w，所以写在 body 上。
     用户拖过分隔条后 body 上是**行内**值（shell.ts 写），行内优先 —— 那时以用户的为准。 */
  & body { --side-w: 360px; font-size: 14px; line-height: 20px; }

  /* ===== ② M3 刻度 ===== */
  /* 顶带 = top app bar：64px（宿主 42px）。左右 24px 与 .route 对齐 */
  & .content-top { min-height: 64px; padding: 0 24px; }
  /* 搜索框：M3 search 是 56px，但顶栏里还并排着别的东西，取 40px 与 app bar 的比例协调 */
  & .sb-field { height: 40px; padding: 0 16px; border-color: transparent; background: var(--md-surface-container-high); }
  /* 菜单项回到 40px，项间 Gap 回到 4px：min-height 是命中区，nav gap 才是纵向节奏。
     只在展开态覆盖（缩态自己声明了 padding/gap，见上面 ⚠️） */
  & body:not(.side-collapsed) .nav a { min-height: 40px; padding: 0 14px; gap: 12px; }
  & body:not(.side-collapsed) .sidebar { padding: 14px 10px; gap: 8px; }
  & .nav { gap: 4px; }

  /* 正在播放页标题/歌手不吃全局 body 的 14/20 排版：
     宿主这两行原本没钉 line-height，标题 22px 会被 20px 行高裁边。 */
  & .np-title { line-height: 1.25; }
  & .np-artist { line-height: 1.35; }

  /* 搜索页大标题 + Tag 栏是一行式页头：M3 刻度下再给一点纵向气口，
     否则 26px 标题沿用全局 20px 行高，Tag 又贴在 4px 下边距上，观感很挤。 */
  & .search-head .page-title { margin: 4px 0 16px; line-height: 1.2; }
  & .search-head .search-tabs { gap: 8px; margin-bottom: 18px; }

  /* Flowscape 信息行同理：fs-title 用 clamp 到 29px，也必须按字号钉回行高。 */
  & .fs-title { line-height: 1.25; }
  & .fs-artist, & .fs-album { line-height: 1.35; }
  /* M3 图标按钮 40px 全圆（宿主 36px / 9px 圆角） */
  & .side-btn { width: 40px; height: 40px; border-radius: var(--md-shape-full); }
  & .user { border-radius: var(--md-shape-full); }

  /* —— 导航项：M3 抽屉的 pill 选中 —— */
  & .nav a { border-radius: var(--md-shape-full); }
  /* M3 用整条 pill 表示选中，不需要本体的左侧竖条 */
  & .nav a::before { display: none; }
  & .nav a.active { background: var(--md-secondary-container); color: var(--md-on-secondary-container); }

  /* —— 列表行 / 歌单行：歌单条目保持 40px 命中区，条目间给 4px 纵向 Gap；
     两行标题/副题再留 2px 内部行距。compact 版会让歌单区挤成一团。 —— */
  & .row { min-height: 56px; padding: 0 16px; border-radius: var(--md-shape-s); }
  & .pl { min-height: 56px; border-radius: var(--md-shape-full); }
  & body:not(.side-collapsed) .pl { min-height: 40px; padding: 4px 8px; }
  & body:not(.side-collapsed) .pl .pname { gap: 2px; }
  & .playlists { gap: 4px; }
  & .pl-group { padding: 8px 8px 2px; }
  & .row.sel { box-shadow: inset 3px 0 0 var(--md-primary); }
  & .row.playing { background: var(--md-secondary-container); color: var(--md-on-secondary-container); }
  /* 侧栏歌单当前项：与导航 / 正在播放行同一对「选中容器」语义 */
  & .pl.active { background: var(--md-secondary-container); }
  & .pl.active .pname { color: var(--md-on-secondary-container); }

  /* —— 队列面板「正在播放」那条 ——
     本体（style.css:1097）把它写成 color-mix(--cvg-glow 26%, --tint-row) 的底 +
     var(--cvg-accent) 的字：底和字**同源**染出来，等于紫字压紫底，暗色方案下几乎读不出。
     按 M3 的「选中列表项」改：container 底 + on-container 字，与 .row.playing 同一对角色 ——
     列表页与队列里的「正在播放」看起来才一致。序号 .qi-i 同理（本体也把它染成了 --cvg-accent）。
     ⚠️ 本段在**模板字符串内部**，注释里不能出现反引号 —— 会把 COMPONENTS 提前闭合掉。 */
  & .qp-item.cur { color: var(--md-on-secondary-container); }
  /* 底色必须排除拖拽态：本体的 .qp-item.dragging（0,2,0，写在 .cur 之后）本来靠源码顺序赢过
     .qp-item.cur；主题一加特异性就反过来把拖拽高亮顶掉了 —— 拖着正在播放那行时它不浮起。 */
  & .qp-item.cur:not(.dragging) { background: var(--md-secondary-container); }
  & .qp-item.cur .qi-i { color: var(--md-on-secondary-container); }

  /* —— 卡片 —— */
  & .card, & .opt-card, & .home-panel { border-radius: var(--md-shape-m); }
  & .card .art, & .rthumb, & .pl .thumb, & .pl-art, & .pb-cover, & .qi-thumb, & .thumb, & .qr { border-radius: var(--md-shape-s); }
  & .avatar-big { border-radius: var(--md-shape-m); }

  /* —— 按钮：M3 全圆角 —— */
  & .ghost-btn, & .fav-btn, & .hk-btn, & .row-btn button { border-radius: var(--md-shape-full); }
  /* 更新按钮：本体是「--acc 底 + 白字」，白字压 M3 主色在暗色方案下会塌 —— 换成 M3 的一对 */
  & .upd-primary { background: var(--md-primary); color: var(--md-on-primary); border-radius: var(--md-shape-full); }

  /* —— 胶囊 / 标签 —— */
  & .chip, & .tag, & .badge, & .sparkle-badge { border-radius: var(--md-shape-s); }
  & .pb-q { border-radius: var(--md-shape-full); }

  /* —— 输入 / 搜索 —— */
  & .sb-field, & .searchbar { border-radius: var(--md-shape-full); }
  & .tint-field input, & .tint-hex-row input, & .qp-q { border-radius: var(--md-shape-xs); }

  /* —— 浮层：M3 菜单 4px —— */
  & .ctx-menu, & .pb-qpop, & .pb-lpop, & .pb-volpop, & .np-menu, & .np-qinfo, & .tint-pop { border-radius: var(--md-shape-xs); }

  /* —— 对话框 / 提示条 —— */
  & .upd-dialog, & .sparkle-settings-dialog { border-radius: var(--md-shape-xl); box-shadow: var(--md-elev-3); }
  & .toast {
    background: var(--md-inverse-surface); color: var(--md-inverse-on-surface);
    border-radius: var(--md-shape-xs); box-shadow: var(--md-elev-3);
  }
  /* 正在播放页恒为深色玻璃：菜单表面另起一份（暗色 surface-container-high 那一档：tone 17 / 彩度 5） */
  & .np {
    --menu-surface: lch(from var(--md-source) 17 5 h);
    --menu-line: rgba(255, 255, 255, .16);
  }
`;

/**
 * 正在播放 / Flowscape 的可选接管。
 *
 * 宿主默认页和 Flowscape 都铺在 .np 上：默认页自带深色玻璃，Flowscape 则直接借这层
 * 背景。这里的开关就是把「主题要不要越过这层默认视觉」拆出来 —— 关闭时保持
 * Quaver Design 的原版封面氛围；开启后颜色只在「随主题设置 / 深空黑」里选。
 *
 * 历史版本曾把 default 作为颜色档位；现在运行时把旧值或缺省值都归一到 theme，
 * 避免接管开着却仍然保留原版视觉的歧义。
 */
const NP_OVERRIDES = `
  &[data-md3-np="on"] .np {
    background: var(--md-surface);
    /* 封面氛围层只服务原来的深色玻璃；接管后关掉它，避免 M3 表面底下漏出随机封面色 */
    & .np-bg { opacity: 0 !important; }
    & .np-scrim { background: transparent; }
    /* 默认页的标题 / 歌词沿用白字口径；换成 M3 on-surface 才能在浅色方案下读清 */
    & .np-title, & .np-ly-line, & .np-ly-line.cur { color: var(--md-on-surface); }
    & .np-artist { color: var(--md-on-surface-variant); }
    & .np-ly-empty { color: color-mix(in srgb, var(--md-on-surface) 62%, transparent); }
    /* 页内菜单从「恒深色玻璃」改回 M3 的 elevation 表面，与全站菜单一致 */
    --menu-surface: var(--md-surface-container-high);
    --menu-line: var(--md-outline-variant);
    & .np-menu-item, & .np-menu-switch, & .np-menu-size, & .np-menu-size button { color: var(--md-on-surface); }
    & .np-menu-empty, & .np-size-val { color: var(--md-on-surface-variant); }
    & .np-menu-item:hover:not(:disabled),
    & .np-menu-switch:hover,
    & .np-menu-size:hover,
    & .np-menu-size button:hover:not(:disabled) {
      color: var(--md-on-surface);
      background: color-mix(in srgb, var(--md-on-surface) 8%, transparent);
    }
    /* Flowscape 自绘文字默认白字；只覆盖主要信息层，控制带的硬编码色留给深空黑档 */
    & .fs-title { color: var(--md-on-surface); }
    & .fs-artist { color: color-mix(in srgb, var(--md-on-surface) 82%, transparent); }
    & .fs-album { color: color-mix(in srgb, var(--md-on-surface) 64%, transparent); }
    & .fs-ly-empty { color: color-mix(in srgb, var(--md-on-surface) 58%, transparent); }
    & .fs-iconbtn { color: color-mix(in srgb, var(--md-on-surface) 84%, transparent); }
    & .fs-qbtn { color: color-mix(in srgb, var(--md-on-surface) 88%, transparent); border-color: var(--md-outline-variant); }
    & .fs-pop { background: var(--md-surface-container-high); border-color: var(--md-outline-variant); }
    & .fs-qi, & .fs-mrow { color: color-mix(in srgb, var(--md-on-surface) 88%, transparent); }
    & .fs-qi:hover, & .fs-mrow:hover { color: var(--md-on-surface); background: color-mix(in srgb, var(--md-on-surface) 8%, transparent); }
  }

  /* 颜色档位 = 随主题设置：M3 surface 本身已带明暗两套角色 */
  &[data-md3-np="on"][data-md3-np-color="theme"] .np {
    background: var(--md-surface);
  }

  /* 颜色档位 = 深空黑：和封面氛围彻底脱钩，保留接管态原有白字的可读性 */
  &[data-md3-np="on"][data-md3-np-color="deep"] .np {
    background: #000;
    & .np-scrim { background: #000; }
    /* deep 档把 on 块换掉的菜单表面再拿回「恒深色」那一版 */
    --menu-surface: #10131c;
    --menu-line: rgba(255, 255, 255, .16);
    & .np-title, & .np-ly-line, & .np-ly-line.cur { color: #fff; }
    & .np-artist { color: #ffffffb8; }
    & .np-ly-empty { color: #ffffff80; }
    & .np-menu-item, & .np-menu-switch, & .np-menu-size, & .np-menu-size button { color: #ffffffe6; }
    & .np-menu-empty, & .np-size-val { color: #ffffff8c; }
    & .np-menu-item:hover:not(:disabled),
    & .np-menu-switch:hover,
    & .np-menu-size:hover,
    & .np-menu-size button:hover:not(:disabled) {
      color: #fff;
      background: #ffffff1f;
    }
    & .fs-title { color: #fff; }
    & .fs-artist { color: #ffffffcc; }
    & .fs-album { color: #ffffff8f; }
    & .fs-ly-empty { color: #ffffff7a; }
  }
`;

/** 组装整份主题 CSS。 */
function buildCss(): string {
  return `
  /* ===== Material Design 3 · 令牌 =====
     源色 = 宿主按本主题 Tint 方案写下的染色（见文件顶部的“为什么不用 --cvg-accent”） */
  --md-source: ${SOURCE_VAR};

${schemeBlock("light", "  ")}

${STATIC_TOKENS}

${HOST_MAP}

  /* 菜单接管（不声明 menus）：升一级特异性，暗色压过宿主的 html[data-theme="dark"] */
  &[data-theme] {
${MENU_TOKENS}
  }

  /* ===== 暗色方案：只换角色值，映射与组件规则自然跟随 ===== */
  &[data-theme="dark"] {
${schemeBlock("dark", "    ")}
  }

  /* ===== 组件形态 ===== */
${COMPONENTS}

  /* ===== 正在播放 / Flowscape 接管 ===== */
${NP_OVERRIDES}
`;
}

export default definePlugin({
  id: "md3",
  name: "Lumen 流光",
  version: "1.3.1",
  minHostVersion: "1.4.1",
  allowBeta: true,
  kind: "third-party",
  author: "Team Quaver",
  // 这里**不能**写 category —— SDK 的 SparklePlugin 没有这个字段（写了 tsc 报 TS2353）。
  // category 是安装元数据，只属于 plugin.json（设置页据此把已装内容归入主题/插件/扩展）。
  description: "一款复刻 Material You 设计的主题插件",
  setup(ctx) {
    // 两个开关都以 html dataset 暴露给主题 CSS：读 storage 初始化，设置页点击即时改。
    const npOn = () => ctx.storage.get("np") !== "off";
    const npColor = () => {
      const v = ctx.storage.get("npColor");
      // 旧版本可能存过 default；接管开启后不再允许这档，统一回落到随主题设置。
      return v === "deep" ? "deep" : "theme";
    };
    const syncNpDataset = () => {
      if (typeof document === "undefined") return;
      document.documentElement.dataset.md3Np = npOn() ? "on" : "off";
      document.documentElement.dataset.md3NpColor = npColor();
    };
    syncNpDataset();

    ctx.registerTheme({
      id: "md3",
      name: "Material Design 3",
      css: buildCss(),
      // Tint 交给主题自带方案：用户在设置页挑（第一个是默认）。
      // 这就是本插件的「Tint 设置」入口 —— 换方案 = 换源色 = 整套 M3 角色重算。
      tint: { mode: "presets", presets: TINT_PRESETS },
      // background / menus 都不声明 = 主题接管：
      // 背景走纯 M3 surface（不铺封面环境色），菜单走 M3 elevation 面板（不透玻璃）。
    });

    ctx.registerSettingsSection({
      id: "md3-theme",
      title: "主题设置",
      render(box) {
        box.innerHTML = `
          <div class="set-label">是否介入正在播放页/Flowscape</div>
          <div class="opt-cards">
            <button class="opt-card" data-np="on" type="button">开启</button>
            <button class="opt-card" data-np="off" type="button">关闭</button>
          </div>
          <p class="muted set-hint">开启后 Lumen 会统一正在播放页与 Flowscape 的表面色；关闭时保留它们原有的深色封面氛围。</p>

          <div class="set-label" style="margin-top:14px">正在播放页/Flowscape 颜色</div>
          <div class="opt-cards">
            <button class="opt-card" data-np-color="theme" type="button">随主题设置</button>
            <button class="opt-card" data-np-color="deep" type="button">深空黑</button>
          </div>
          <p class="muted set-hint">「随主题设置」使用当前 Lumen 明暗方案的 M3 表面；「深空黑」使用纯黑底色。</p>`;

        const npCards = [...box.querySelectorAll<HTMLButtonElement>("[data-np]")];
        const colorCards = [...box.querySelectorAll<HTMLButtonElement>("[data-np-color]")];
        const sync = () => {
          npCards.forEach((b) => b.classList.toggle("sel", (b.dataset.np === "on") === npOn()));
          colorCards.forEach((b) => b.classList.toggle("sel", b.dataset.npColor === npColor()));
        };
        npCards.forEach((b) => {
          b.onclick = () => {
            ctx.storage.set("np", b.dataset.np === "on" ? "on" : "off");
            syncNpDataset();
            sync();
          };
        });
        colorCards.forEach((b) => {
          b.onclick = () => {
            ctx.storage.set("npColor", b.dataset.npColor === "deep" ? "deep" : "theme");
            syncNpDataset();
            sync();
          };
        });
        sync();
      },
    });
  },
});
