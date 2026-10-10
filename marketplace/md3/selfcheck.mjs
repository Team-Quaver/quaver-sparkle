// Material Design 3 — 插件自检（不依赖宿主，可在 node 里直接跑）
//
// 为什么放在插件目录：本插件的硬约束是「只读本体、不改本体」，所以不能往
// ui/scripts/verify-sparkle.ts 里加断言。token 表与 CSS 生成的完整性属于插件自己的事，
// 断言就该跟着插件走，也不能依赖「先跑一次构建」才能验。
//
// 跑法（Node ≥ 22.18：原生类型剥离 + module.registerHooks，可直接 import .ts）：
//   cd vendor/Sparkle/marketplace/md3 && node selfcheck.mjs
//
// 覆盖的回归点：
//   · 亮/暗角色集必须同构 —— 少一条 = 某角色在暗色下静默不生效，
//     是 lch 相对颜色最容易出的「只剩一半颜色」故障；
//   · 源色必须锚在 --cvg-bar-line 而不是 --cvg-accent（后者经 --acc → --md-primary
//     成自反环，会把整族角色塌成空值）；
//   · 菜单令牌的特异性、版本号两处一致、CSS 里没有悬空 --md-* 引用。
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";

// index.ts 用的是打包器风格的无扩展名相对导入（../../sdk/index）；node ESM 要求带扩展名。
// 这里补一个解析钩子：只在原样解析失败时，给无扩展名的相对路径补 .ts 再试一次。
// （必须用动态 import —— 静态导入在模块体执行前就解析完了，钩子来不及生效。）
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith(".") && !/\.[cm]?[jt]s$/.test(spec)) {
      try { return next(spec + ".ts", ctx); } catch { /* 回落到原样解析 */ }
    }
    return next(spec, ctx);
  },
});

const { ELEVATION, LIGHT_ROLES, DARK_ROLES, SHAPE, STATE, TINT_PRESETS } = await import("./tokens.ts");
const { default: plugin } = await import("./index.ts");

let failed = 0;
function ok(name, cond, extra = "") {
  if (cond) console.log(`PASS md3: ${name}`);
  else { failed++; console.log(`FAIL md3: ${name}${extra ? " — " + extra : ""}`); }
}

// —— 1. 亮/暗角色集同构 ——
const lightKeys = Object.keys(LIGHT_ROLES).sort();
const darkKeys = Object.keys(DARK_ROLES).sort();
ok("亮/暗角色集同构（不同构 = 某个角色在暗色下静默不生效）",
  lightKeys.length === darkKeys.length && lightKeys.every((k, i) => k === darkKeys[i]),
  `亮 ${lightKeys.length} 条 / 暗 ${darkKeys.length} 条；` +
  `仅亮有 [${lightKeys.filter((k) => !darkKeys.includes(k))}]，仅暗有 [${darkKeys.filter((k) => !lightKeys.includes(k))}]`);

// —— 2. 每条角色形状合法 ——
const badRoles = [];
for (const [scheme, table] of [["light", LIGHT_ROLES], ["dark", DARK_ROLES]]) {
  for (const [name, spec] of Object.entries(table)) {
    if ("fixed" in spec) {
      if (!/^#[0-9a-f]{6}$/i.test(spec.fixed)) badRoles.push(`${scheme}.${name} 固定色非法`);
      continue;
    }
    if (!(spec.tone >= 0 && spec.tone <= 100)) badRoles.push(`${scheme}.${name} tone 越界(${spec.tone})`);
    if (!(spec.chroma >= 0 && spec.chroma <= 150)) badRoles.push(`${scheme}.${name} 彩度越界(${spec.chroma})`);
    if (spec.hueShift !== undefined && !Number.isFinite(spec.hueShift)) badRoles.push(`${scheme}.${name} 色相偏移非法`);
  }
}
ok("每条角色的 tone ∈ [0,100]、彩度 ∈ [0,150]、色相偏移为数字", badRoles.length === 0, badRoles.join("; "));

// —— 2b. 模型口径：源色只贡献色相（tone/彩度固定）。若哪天又改成「彩度跟源色缩放」，
//        会退回「比 M3 艳得多」的那版观感，这里拦一下。 ——
const roleText = JSON.stringify([LIGHT_ROLES, DARK_ROLES]);
ok("角色的 tone/彩度是常量，只有色相表达式里出现 h（源色只贡献色相）",
  !/"chroma":\s*"[^"]*c/.test(roleText) && !/"tone":\s*"/.test(roleText));

// —— 3. 关键角色齐备（M3 里缺了会明显少色的那几个） ——
const REQUIRED = [
  "primary", "on-primary", "primary-container", "on-primary-container",
  "secondary-container", "on-secondary-container",
  "tertiary", "on-tertiary",
  "surface", "surface-container-low", "surface-container", "surface-container-high", "surface-container-highest",
  "on-surface", "on-surface-variant", "outline", "outline-variant",
  "inverse-surface", "inverse-on-surface",
  "error", "on-error", "error-container", "on-error-container",
];
const missing = REQUIRED.filter((k) => !(k in LIGHT_ROLES) || !(k in DARK_ROLES));
ok("M3 关键角色齐备", missing.length === 0, `缺 [${missing}]`);

// —— 4. 形状刻度 / 层级档位 / 状态层 ——
ok("形状刻度齐备（none/xs/s/m/l/xl/full）", ["none", "xs", "s", "m", "l", "xl", "full"].every((k) => k in SHAPE));
ok("层级阴影 1..5 两套方案齐备",
  ["light", "dark"].every((s) => [1, 2, 3, 4, 5].every((lv) => typeof ELEVATION[s][lv] === "string" && ELEVATION[s][lv].includes("rgba("))));
ok("状态层四档齐备（hover/focus/pressed/drag）", ["hover", "focus", "pressed", "drag"].every((k) => typeof STATE[k] === "number"));

// —— 5. 预设色表 ——
ok("预设色至少 2 套（1 套 = Tint 设置里没得选）", TINT_PRESETS.length >= 2, `当前 ${TINT_PRESETS.length}`);
ok("预设色 id 唯一", new Set(TINT_PRESETS.map((p) => p.id)).size === TINT_PRESETS.length);
ok("预设色色值与标签齐备（#hex，或 host 的 'system'/'cover' 哨兵）",
  TINT_PRESETS.every((p) =>
    (/^#[0-9a-f]{6}$/i.test(p.color) || p.color === "system" || p.color === "cover") && p.label && p.id));
ok("哨兵方案只出现一次、且不在第一位（第一位是默认档，得是具体色值）",
  TINT_PRESETS.filter((p) => p.color === "system").length <= 1 &&
  TINT_PRESETS.filter((p) => p.color === "cover").length === 1 &&
  TINT_PRESETS[0].color !== "system" && TINT_PRESETS[0].color !== "cover");

// —— 6. 接线：走真实的 setup() 注册路径取主题对象（不是另调一个字符串构造函数） ——
let theme;
let settingsSection;
plugin.setup({
  storage: { get: () => null, set: () => {}, remove: () => {}, keys: () => [] },
  registerTheme: (t) => { theme = t; },
  registerSettingsSection: (s) => { settingsSection = s; },
});
const css = theme?.css ?? "";
ok("setup() 确实 registerTheme 了一个主题", !!theme);
ok("主题 id 与插件 id 一致", theme?.id === plugin.id && plugin.id === "md3");
ok("tint 交给主题自带方案（presets）—— 这就是设置页的 Tint 入口", theme?.tint?.mode === "presets");
ok("Tint 方案就是 token 表里那份（没在 index.ts 里另抄一份）", theme?.tint?.presets === TINT_PRESETS);
ok("Tint 方案包含封面颜色哨兵档", theme?.tint?.presets?.some((p) => p.color === "cover") === true);
ok("不声明 menus / background（缺省 = 主题接管）", theme?.menus === undefined && theme?.background === undefined);
ok("插件 kind = third-party", plugin.kind === "third-party");
ok("主题设置区注册成功（正在播放 / Flowscape 接管开关）",
  settingsSection?.id === "md3-theme" && settingsSection?.title === "主题设置");
// SDK 的 SparklePlugin 只有 id/name/version/kind/author/description/setup —— 多写一个字段
// 会被 TS 的 excess-property 检查直接判死（TS2353）。category/main 是**安装元数据**，
// 只属于 plugin.json。这条断言就是为「顺手把 category 写进插件对象」这个坑准备的。
ok("插件对象不含 SDK 未定义的字段（category / main 只属于 plugin.json）",
  !("category" in plugin) && !("main" in plugin),
  `多了 [${["category", "main"].filter((k) => k in plugin)}]`);

// —— 7. 元数据两处一致（plugin.json 与 index.ts，只改一处是常见疏漏） ——
const meta = JSON.parse(readFileSync(new URL("./plugin.json", import.meta.url), "utf8"));
ok("plugin.json 与 index.ts 的 version 一致", meta.version === plugin.version, `json=${meta.version} ts=${plugin.version}`);
ok("plugin.json 的 id/name/author 与插件本体一致",
  meta.id === plugin.id && meta.name === plugin.name && meta.author === plugin.author,
  `json={${meta.id},${meta.name},${meta.author}} ts={${plugin.id},${plugin.name},${plugin.author}}`);
ok("plugin.json 的 category = theme（决定设置页归入哪个标签）", meta.category === "theme");

// —— 8. CSS 生成结果 ——
ok("CSS 声明源色 --md-source（读宿主行内 --cvg-bar-line，避开 --cvg-accent 自反环）",
  css.includes("--md-source: var(--cvg-bar-line, #6750a4)"));
ok("CSS 里不残留 --md-seed（与 --md-source 混用 = 源色永不生效）", !css.includes("--md-seed"));
ok("亮/暗两套方案都发射到 CSS",
  css.includes('&[data-theme="dark"]') && css.includes("--md-primary:lch(from var(--md-source) 40"));
ok("菜单令牌放在更高特异性的 &[data-theme] 下（暗色要压过宿主 html[data-theme=dark]）",
  /&\[data-theme\]\s*\{[^}]*--menu-surface/.test(css));
ok("主题不写 --cvg-*（那是宿主地盘，写了也被行内样式压掉）", !/--cvg-[a-z-]+\s*:/.test(css));

// —— 9. 引用一致性：CSS 里用到的 --md-* 都必须真的被声明过 ——
const declared = new Set([...css.matchAll(/(--md-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const used = new Set([...css.matchAll(/var\((--md-[a-z0-9-]+)/g)].map((m) => m[1]));
const undeclared = [...used].filter((v) => !declared.has(v));
ok("CSS 引用的 --md-* 全部有声明（悬空引用 = 那条规则静默失效）", undeclared.length === 0, `悬空 [${undeclared}]`);

// —— 9b. 满幅 + 缩态护栏 ——
// 先剥注释再匹配：注释正文里也写着 .sidebar / .nav a 这些标识符，不剥会被假过（见 SKILL.md）。
const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
const hasSel = (sel, target) =>
  new RegExp("(^|[\\s,>])" + target.replace(/\./g, "\\.") + "($|[\\s,{:>])").test(sel);

// 缩态（body.side-collapsed）声明过的属性，主题必须在 :not(.side-collapsed) 门内覆盖 ——
// 两边特异性都是 (0,2,2)，同分只靠源码顺序；主题不加门就会把宿主的缩态整个顶掉。
const COLLAPSE_OWNED = {
  ".sidebar": /flex-basis|padding/,
  ".nav a": /padding|gap|justify-content|max-width/,
  ".user": /padding/,
  ".pl": /padding/,
};
const leaked = [];
for (const m of noComments.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
  const sel = m[1].trim(), body = m[2];
  if (!sel) continue;
  for (const [target, propRe] of Object.entries(COLLAPSE_OWNED)) {
    if (!hasSel(sel, target) || !propRe.test(body)) continue;
    const bad = sel.split(",").map((s) => s.trim())
      .filter((s) => hasSel(s, target) && !s.includes(":not(.side-collapsed)"));
    if (bad.length) leaked.push(`${bad.join(" / ")} { ${body.trim().replace(/\s+/g, " ").slice(0, 46)} }`);
  }
}
ok("缩态护栏：覆盖缩态也声明过的属性（.sidebar/.nav a/.user/.pl）都关在 :not(.side-collapsed) 里",
  leaked.length === 0, leaked.join(" ｜ "));

ok("展开态主菜单项高度与项间 Gap 回到 40px / 4px",
  /& body:not\(\.side-collapsed\) \.nav a \{[^}]*min-height:\s*40px/.test(noComments) &&
  /& \.nav \{[^}]*gap:\s*4px/.test(noComments));
ok("侧栏歌单区不再压缩成 0 Gap（40px 条目 + 4px 间距 + 2px 行距）",
  /& body:not\(\.side-collapsed\) \.pl \{[^}]*min-height:\s*40px/.test(noComments) &&
  /& \.playlists \{[^}]*gap:\s*4px/.test(noComments) &&
  /& body:not\(\.side-collapsed\) \.pl \.pname \{[^}]*gap:\s*2px/.test(noComments));

ok("正在播放页与 Flowscape 信息行有独立行高（不被全局 body 20px 行高压扁）",
  /& \.np-title \{[^}]*line-height:\s*1\.25/.test(noComments) &&
  /& \.np-artist \{[^}]*line-height:\s*1\.35/.test(noComments) &&
  /& \.fs-title \{[^}]*line-height:\s*1\.25/.test(noComments) &&
  /& \.fs-artist, & \.fs-album \{[^}]*line-height:\s*1\.35/.test(noComments));
ok("搜索页标题与 Tag 栏有独立气口（不吃全局 20px 行高 / 旧 4px 下距）",
  /& \.search-head \.page-title \{[^}]*margin:[^;]*16px/.test(noComments) &&
  /& \.search-head \.page-title \{[^}]*line-height:\s*1\.2/.test(noComments) &&
  /& \.search-head \.search-tabs \{[^}]*margin-bottom:\s*18px/.test(noComments));


ok("接管颜色不再有 default 档（开启即 theme/deep，关闭才是原版）",
  !noComments.includes(':not([data-md3-np-color="default"])') &&
  /&\[data-md3-np="on"\] \.np/.test(noComments) &&
  /&\[data-md3-np="on"\]\[data-md3-np-color="theme"\] \.np/.test(noComments) &&
  /&\[data-md3-np="on"\]\[data-md3-np-color="deep"\] \.np/.test(noComments));

ok("满幅：.body 去掉了外距与间距",
  /& \.body\s*\{(?=[^}]*padding:\s*0)(?=[^}]*gap:\s*0)/.test(noComments));
// 顶带底片（.content::before）：宿主那条 112px 渐隐铺在 .route 之上，满幅下顶栏是
// 实底 app bar，不再需要它来做「标题栏」质感。但**不能整条删** —— 宿主把「吸顶条/页头
// 压住下滚内容」全交给了这一层。上一版把它做成「app bar + 吸顶区」一整块的实底渐变，
// 结果把内容区第一屏里不吸顶的大标题（我喜欢 / 设置 / 搜索页）整条盖掉（明暗都黑）。
// 口径钉成：底片只收在 app bar 那一格（高度与顶带同为 64px，且不再跟 --stuck-h 联动）。
ok("满幅：顶带底片只收在 64px 的 app bar 那格，不再向下盖住第一屏页头",
  /& \.content::before\s*\{[^}]*height:\s*64px/.test(noComments) &&
  /& \.content::before\s*\{[^}]*min-height:\s*64px/.test(noComments) &&
  !/& \.content::before\s*\{[^}]*--stuck-h/.test(noComments));
// 挡下滚内容的责任转到吸顶节点自己身上：没有这条，长列表会从吸顶条底下透出来。
ok("满幅：吸顶条 / 吸顶页头自己铺实底 surface（否则下滚内容从吸顶区透出来）",
  /& \.sticky-bar, & \.sticky-head\s*\{[^}]*background:\s*var\(--md-surface\)/.test(noComments));
// 光有实底还是不够：宿主那边「压不住的那截」一向是交给 .content::before 的渐隐化开的
// （Quaver Design 下吸顶节点不画底）。M3 把底片搬到节点自己身上后，下缘成了硬边 ——
// 正下滚过的行被拦腰切一刀，观感像 bug 而不是像 app bar。贴顶态必须补一条同色短渐隐
// 化开切边 + 一根 outline-variant 发丝线画清 app bar 下界，且用 .stuck 门控
// （未贴顶时不铺，第一屏版式纹丝不动）。
ok("满幅：吸顶条 / 吸顶页头贴顶时下缘化开（硬边 = 内容被拦腰切一刀）",
  /& \.sticky-bar::after, & \.sticky-head::after\s*\{[^}]*top:\s*100%[^}]*linear-gradient\([^}]*transparent/.test(noComments) &&
  /& \.sticky-bar\.stuck::after, & \.sticky-head\.stuck::after\s*\{[^}]*opacity:\s*1/.test(noComments));
ok("满幅：分隔条的负边距归零（否则盖住侧栏/内容各 10px 并吞掉那片点击）",
  /& \.side-resizer\s*\{[^}]*margin:\s*0/.test(noComments));
ok("玻璃退场：主题显式关掉模糊，且不引入任何 blur",
  /backdrop-filter:\s*none/.test(noComments) && !/backdrop-filter:\s*blur/.test(noComments));
ok("面板令牌是实底（--panel / --glass 不含 transparent）",
  !/--panel:\s*[^;]*transparent/.test(noComments) && !/--glass:\s*[^;]*transparent/.test(noComments));

// —— 9c. 宿主那几处「文字被 Tint」要脱染 ——
// 队列面板「正在播放」那条（style.css:1097）本体把文字和序号都写成 `--cvg-accent`，底色又是
// 同源染出来的（紫字压紫底，暗色下几乎读不出）。主题必须换成 M3 的 container 对；
// 漏掉任何一条就是「播放列表文字被 Tint」这个回归。
ok("队列「正在播放」行脱染：文字走 on-secondary-container",
  /& \.qp-item\.cur\s*\{[^}]*color:\s*var\(--md-on-secondary-container\)/.test(noComments));
ok("队列「正在播放」行脱染：底色走 secondary-container，且排除拖拽态（否则拖拽高亮被顶掉）",
  /& \.qp-item\.cur:not\(\.dragging\)\s*\{[^}]*background:\s*var\(--md-secondary-container\)/.test(noComments));
ok("队列「正在播放」行的序号也脱染（本体把 .qi-i 一并染了）",
  /& \.qp-item\.cur \.qi-i\s*\{[^}]*--md-on-secondary-container/.test(noComments));
ok("主题不用 --cvg-accent / --cvg-glow 表达强调（只读 --cvg-bar-line 当源色）",
  !/--cvg-(accent|glow)/.test(noComments));

// —— 10. 色彩行为不变量（纯数值核算，不需要 GUI） ——
// 本机沙箱跑不起 Electron GUI，主题的实际配色无法目视 —— 用数值证据代替：
//   · 源色用宿主自己的 toBarColors（import ui/src/lib/color.ts），口径与运行时一致，不另抄一份；
//   · lch 按 CSS Color 4 用 **D50** 白点（lab/lch 一族都是 D50；用 D65 会整体偏色）。
// 钉住两件事：
//   ① 任何预设下「白字压主色」的对比度都够（≥ 4.5 = WCAG AA）—— 这正是 tone 锚定要解决的问题
//      （第一版用 HSL 固定饱和度，黄系源色上会塌）；
//   ② 跨 7 种色相的对比度**波动极小**（≤ 0.6）—— 波动大就说明明度锚点没锚住。
// 读不到宿主 color.ts 就报红：那说明本体的颜色模块挪了位置，这条路值得知道。
try {
  const { parseHex, toBarColors } = await import(new URL("../../../../ui/src/lib/color.ts", import.meta.url).href);
  const D50 = [0.9642956764295677, 1, 0.8251046025104602];
  const M = [0.436065742824811, 0.3851514688337912, 0.14307845442264197,
             0.22249319175623702, 0.7168870538238823, 0.06061979053616537,
             0.013923904500943465, 0.09708128566574634, 0.7140993584005155];
  const MI = [3.1341359569958707, -1.6173863321612538, -0.4906619460083532,
              -0.9787955028765266, 1.916254567259524, 0.03344273116131949,
              0.0719553798841167, -0.2289768264158322, 1.405386058324125];
  const EPS = 216 / 24389, KAPPA = 24389 / 27;
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  const fFwd = (t) => (t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
  const fInv = (t) => (t ** 3 > EPS ? t ** 3 : (116 * t - 16) / KAPPA);

  const lchToLinear = (L, C, H) => {
    const hr = (H * Math.PI) / 180, a = C * Math.cos(hr), b = C * Math.sin(hr);
    const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
    const X = fInv(fx) * D50[0], Y = fInv(fy) * D50[1], Z = fInv(fz) * D50[2];
    return [MI[0] * X + MI[1] * Y + MI[2] * Z, MI[3] * X + MI[4] * Y + MI[5] * Z, MI[6] * X + MI[7] * Y + MI[8] * Z];
  };
  /** 与浏览器一致：保持 L/H，把 C 二分压进 sRGB 色域 */
  const lchToRgb = (L, C, H) => {
    const inGamut = (c) => lchToLinear(L, c, H).every((v) => v >= -1e-6 && v <= 1 + 1e-6);
    let c = C;
    if (!inGamut(c)) {
      let lo = 0, hi = C;
      for (let i = 0; i < 26; i++) { const mid = (lo + hi) / 2; if (inGamut(mid)) lo = mid; else hi = mid; }
      c = lo;
    }
    return lchToLinear(L, c, H).map((v) => Math.max(0, Math.min(1, gam(Math.max(0, Math.min(1, v))))) * 255);
  };
  const rgbToLch = ([r, g, b]) => {
    const R = lin(r / 255), G = lin(g / 255), B = lin(b / 255);
    const X = M[0] * R + M[1] * G + M[2] * B, Y = M[3] * R + M[4] * G + M[5] * B, Z = M[6] * R + M[7] * G + M[8] * B;
    const fx = fFwd(X / D50[0]), fy = fFwd(Y / D50[1]), fz = fFwd(Z / D50[2]);
    const a = 500 * (fx - fy), bb = 200 * (fy - fz);
    return { L: 116 * fy - 16, C: Math.hypot(a, bb), H: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 };
  };
  const anyColor = (s) => {
    const h = parseHex(s);
    if (h) return [h.r, h.g, h.b];
    const m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(String(s));
    return [+m[1], +m[2], +m[3]];
  };
  const relLum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
  const contrast = (p, q) => {
    const [a, b] = [relLum(p), relLum(q)].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
  };

  // 每个预设实际渲染出的 on-primary / primary 对比度（宿主写的源色只贡献色相）。
  // "system" 哨兵跳过：源色运行时才知（宿主探测的系统强调色），静态算不了；
  // 任意色相下对比度恒定本就是 tone 锚定的不变量，用其余七套色相家族代表。
  const perScheme = { light: [], dark: [] };
  for (const p of TINT_PRESETS) {
    if (p.color === "system" || p.color === "cover") continue;
    const src = rgbToLch(anyColor(toBarColors(anyColor(p.color)).line));
    for (const [scheme, table] of [["light", LIGHT_ROLES], ["dark", DARK_ROLES]]) {
      const render = (name) => {
        const s = table[name];
        return "fixed" in s ? anyColor(s.fixed) : lchToRgb(s.tone, s.chroma, src.H + (s.hueShift ?? 0));
      };
      perScheme[scheme].push({ id: p.id, v: contrast(render("on-primary"), render("primary")) });
    }
  }
  for (const scheme of ["light", "dark"]) {
    const vs = perScheme[scheme];
    const lo = Math.min(...vs.map((x) => x.v)), hi = Math.max(...vs.map((x) => x.v));
    const worst = vs.find((x) => x.v === lo);
    ok(`${scheme}: 白字压主色的对比度全部 ≥ 4.5（WCAG AA）`, lo >= 4.5, `最低 ${lo.toFixed(2)}（${worst.id}）`);
    ok(`${scheme}: 跨色相波动 ≤ 0.6（明度锚住 = 对比度与色相无关）`, hi - lo <= 0.6, `${lo.toFixed(2)}–${hi.toFixed(2)}`);
  }
} catch (e) {
  ok("色彩行为不变量（读宿主 ui/src/lib/color.ts 核算对比度）", false, String(e.message));
}

console.log(failed === 0 ? "\nmd3 自检全绿" : `\nmd3 自检失败 ${failed} 条`);
process.exit(failed === 0 ? 0 : 1);
