// Flowscape 流境 — 把「正在播放」页变成专辑流（Cover Flow）
//
// 布局：中间大封面（点击=播放/暂停），左右两侧相邻封面（点击=切到那一首，
// 上下曲就绑在这两张封面上，不另设按钮）；中间封面下方依次是歌名 / 歌手 /
// 专辑 / 当前这一句歌词（点行跳播）。底部自绘一条控制带：进度条（拖拽 seek）+
// 音量（滑杆 + 静音）+ 音质（浮窗选档）。
//
// 接管语义（SDK 的 registerNowPlayingView）：宿主把 .np-inner 整块让出来、
// 隐藏原播放条（body.np-takeover），背景的模糊封面与压暗层继续铺着当底色。
// 关掉本插件（或设置里关掉「流境模式」）即整块卸载、回到默认正在播放页。
//
// **接管必须自带出口**：播放条一收（点封面展开的唯一入口跟着没了）、.np-inner
// 一让（⋮ 更多菜单在那儿），用户就被关在本页里只剩 ESC。所以本视图左上角
// 常驻「收起」与「更多选项」两颗按钮 —— 这不是装饰，是接管态的必备件。
//
// 工程要点：
//   · ctx.onNotify 是 ~4Hz 的位置广播，**所有 DOM 写入先比对签名再落** —— 否则
//     每帧重建 <img> 会反复触发图片重解码，堆顶长期高位。
//   · 进度条/歌词高亮走自驱 rAF（传输层 position 是外推时钟，4Hz 上去是台阶）；
//     收起时自停，重新展开靠 onNotify 唤醒（rAF 自停后没人替你重启）。
//   · enabled() 由宿主每次 notify 重读：设置里的总开关直接落在这里，切完即时生效。
import {
  definePlugin,
  type SparkleKaraokeLine,
  type SparkleLyricLine,
  type SparkleNpViewCtx,
  type SparkleSongSnapshot,
} from "../../sdk/index";

// —— 小工具 ——

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

const clampNum = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const fmtDur = (sec: number) => {
  if (!isFinite(sec) || sec < 0) sec = 0;
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
};

/**
 * 封面 URL（与宿主 lib/api:coverUrl 同规则；pmid 优先，退到 album.mid）。
 *
 * **size 必须是 CDN 的固定档位**（y.gtimg.cn 只认这一组，实测其余全 404）：
 * 90 / 120 / 150 / 180 / 300 / 500 / 800。随手写 400 或 200 会拿到 404 →
 * <img> 碎图 + 一堆控制台报错。改这个表之前先 curl 验一下，别凭直觉填。
 */
const COVER_SIZES = [90, 120, 150, 180, 300, 500, 800] as const;

/** 就近吸附到合法档位（不小于请求值，overshoot 优先：宁可大图不缩，避免糊） */
const coverSize = (want: number): number => {
  for (const s of COVER_SIZES) if (s >= want) return s;
  return COVER_SIZES[COVER_SIZES.length - 1];
};

const coverOf = (s: SparkleSongSnapshot | null, want: number): string => {
  const pmid = s?.album?.pmid ?? "";
  const base = pmid ? pmid.split("_")[0] : (s?.album?.mid ?? "");
  if (!base) return "";
  const size = coverSize(want);
  return `https://y.gtimg.cn/music/photo_new/T002R${size}x${size}M000${base}.jpg`;
};

const artistsOf = (s: SparkleSongSnapshot | null) => (s?.singer ?? []).map((x) => x.name).filter(Boolean).join(" / ");

/** 换槽动画时长（ms）。必须与 CSS 里 .fs-card / .fs-art 的 transform 过渡时长一致 ——
 *  短了会在半路清 data-to（卡片弹回原槽），长了会卡着不动。 */
const ANIM_MS = 440;

// —— 图标（内联 SVG；全部 currentColor，跟随现用色） ——

const svg = (d: string, extra = "") =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

const ICON = {
  play: `<svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true"><path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z"/></svg>`,
  volHigh: svg('<path d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z" fill="currentColor" stroke="none"/><path d="M15.6 9a4.2 4.2 0 0 1 0 6"/><path d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/>'),
  volMid: svg('<path d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z" fill="currentColor" stroke="none"/><path d="M15.6 9a4.2 4.2 0 0 1 0 6"/>'),
  volLow: svg('<path d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z" fill="currentColor" stroke="none"/><path d="M15.6 9a4.2 4.2 0 0 1 0 6"/>'),
  volMute: svg('<path d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z" fill="currentColor" stroke="none"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  heart: svg('<path d="M12 20s-7-4.6-9-9c-1.3-3 .8-6.5 4-6.5 2 0 3.5 1.2 5 3 1.5-1.8 3-3 5-3 3.2 0 5.3 3.5 4 6.5-2 4.4-9 9-9 9z"/>'),
  heartFill: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 20s-7-4.6-9-9c-1.3-3 .8-6.5 4-6.5 2 0 3.5 1.2 5 3 1.5-1.8 3-3 5-3 3.2 0 5.3 3.5 4 6.5-2 4.4-9 9-9 9z"/></svg>`,
  // 收起：向下的 chevron —— 播放条在下面，箭头指回去的方向
  collapse: svg('<path d="M6 9.5l6 6 6-6"/>', 'width="17" height="17"'),
  // ⋮：三点用 fill，别走 svg() 的描边（描边圆点会糊成一团）
  more: `<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.85"/><circle cx="12" cy="12" r="1.85"/><circle cx="12" cy="19" r="1.85"/></svg>`,
};

// —— 样式（插件自带，不依赖宿主 style.css；打包成单文件后由 setup 注入一次） ——

const CSS = `
.fs-root{
  position:absolute; inset:0; display:flex; flex-direction:column;
  /* 顶部只留 18px：左上角的按钮簇不与窗口按钮（.winbtns，fixed top:18 right:12，
     z-index 90）争位 —— 所以本页的操作按钮一律靠左放。 */
  padding:18px 30px 18px; gap:12px; color:#fff; min-height:0; overflow:hidden;
  font-family:var(--font-ui,inherit);

  /* 三个封面用**同一个基准尺寸** --fs-cover，侧卡只靠 --slot-scale + rotateY
     表达纵深。之前侧卡另有一套 --fs-side（clamp(80px,13vh,170px)，比中间小一半），
     等于两套尺寸体系 → 中间巨大、两侧迷你，既不统一也不像一叠专辑。
     --fs-gap 也改成按 --fs-cover 的比例算：间距与尺寸同源，窗口缩放时整体等比，
     不会出现「封面变小了、间距没变」的散架。槽位距 < 主体宽 → 侧卡压住主封面
     一点边，才有一叠的交叠感。 */
  --fs-cover:min(28vh, 24vw, 300px);
  --fs-gap:calc(var(--fs-cover) * .66);
  --fs-radius:13px;

  /* 控制带染色：**直连**宿主的封面主色变量，不做 JS 每首去 getComputedStyle 抄一遍 ——
     宿主对 --cvg-accent 注册了 @property 并在 :root 上挂了 .45s 过渡，直连就白拿一份
     「换曲时平滑扫色」；JS 抄一次只能硬跳，还会停在上一次读到的颜色上。
     兜底链与宿主正在播放页的口径一致（--cvg-accent → --cyan）。
     --fs-acc 是**填充色**（进度条/旋钮/音量条），--fs-acc-ink 是**前景色**——
     原色直接当字/图标色在浅色封面上会糊，用 color-mix 把亮度锚到白侧。 */
  --fs-acc:var(--cvg-accent, var(--cyan, #7fd7ff));
  --fs-acc-ink:color-mix(in srgb, var(--fs-acc) 42%, #fff);
}
.fs-root, .fs-root *{ -webkit-user-select:none; user-select:none; }

/* 顶部操作条：接管态的出口（收起）+ 更多选项。左对齐。 */
.fs-top{
  flex:0 0 auto; display:flex; align-items:center; gap:6px; min-height:28px;
}
.fs-top .fs-iconbtn{ width:28px; height:28px; }

/* 舞台：封面 + 信息 + 歌词。flex:1 1 auto + min-height:0 允许它在窗口变矮时
   收缩；歌词与底部控制带是 flex:0 0 auto，永远不会被挤出可视区。 */
.fs-stage{
  flex:1 1 auto; min-height:0; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:16px;
}

/* —— 封面流 ——
   **绝对定位按 offset 摆位**，不用 flex + 负 margin。
   负 margin 的坑：它只收「自己这一侧」，多张卡会**累加**——多张卡各自带一段
   收缩，整排越算越散。绝对定位的槽位互不干扰，且切歌动画只需改 --slot 变量。
   槽位：--slot 是卡片中心相对容器中心的水平偏移（负=左）。
   高度按 --fs-cover 给（侧卡被缩到 .82，纵向不会超出主封面）。 */
.fs-covers{
  position:relative; flex:0 0 auto;
  width:100%; height:calc(var(--fs-cover) + 10px);
  /* 刻意**不**用 transform-style:preserve-3d：这里的立方体感全部来自 .fs-art 自己
     那一段 perspective() + rotateY()（自带透视，自成一体），不需要子元素共享 3D 空间。
     反而挂上 preserve-3d 会把 z-index 的层级判定交给 3D 排序，卡片的层序会变得不可
     预期（谁盖谁看运气）。 */
}
.fs-card{
  position:absolute; left:50%; top:50%; border:0; padding:0; background:none; color:inherit;
  font:inherit; cursor:pointer;
  /* 位移 + 缩放在 .fs-card 上（槽位），角度在 .fs-art 上（Cover Flow 的外翻）——
    两者分开，动画时各改各的互不覆盖，但 transition 用同一条曲线，时序对齐。 */
  transform:translate(-50%,-50%) translateX(var(--slot,0px)) scale(var(--slot-scale,1));
  transition:transform .44s cubic-bezier(.22,.61,.36,1), opacity .3s ease;
  isolation:isolate; /* 让 ::after 的 z-index:-1 压在本卡内层，不穿透到 np 背景 */
}
.fs-card:focus-visible{ outline:2px solid #fff9; outline-offset:6px; border-radius:var(--fs-radius); }
.fs-card:disabled{ cursor:default; }

/* 封面盒：**三张同一个宽度**（--fs-cover），大小差异全部来自 --slot-scale。 */
.fs-card .fs-art{
  position:relative; display:block; overflow:hidden;
  width:var(--fs-cover); aspect-ratio:1; border-radius:var(--fs-radius);
  background:#ffffff1a;
  box-shadow:0 18px 46px #000000a6, 0 2px 0 #ffffff1f inset;
  transition:transform .44s cubic-bezier(.22,.61,.36,1), opacity .34s ease, filter .34s ease, box-shadow .3s ease;
  /* 外翻的轴：左卡绕右边缘、右卡绕左边缘（--fs-dir 定方向，见下） */
  transform-origin:calc((1 - var(--fs-dir,0)) * 50%) center;
}
/* 占位符与图片**必须绝对定位**：两者都是 width/height:100% 的块级盒，
   若按普通流排，占位符会先占满整个封面盒、把 <img> 挤到盒外被 overflow 裁掉
   —— 结果封面永远不显示，只剩 .fs-art 那层 #ffffff1a 半透明底（「封面是透明的」
   就是这个）。图片盖在占位符之上，谁显谁隐由 JS 的 display 切换控制。 */
.fs-card .fs-art img, .fs-card .fs-ph{ position:absolute; inset:0; }
.fs-card .fs-art img{ width:100%; height:100%; object-fit:cover; display:block; }
.fs-card .fs-ph{ display:flex; align-items:center; justify-content:center; color:#ffffff40; }

/* 槽位：--slot 中心偏移、--slot-scale 纵深缩放、--fs-dir 决定外翻方向
   （-1 左 / 0 中 / +1 右，一个变量同时驱动 rotateY 的符号与 <img> 之外的轴心，
   省掉「左边一套、右边一套」的镜像规则 —— 镜像规则漏改一边就是错位）。 */
.fs-card[data-off="0"]{ --slot:0px; --slot-scale:1; --fs-dir:0; z-index:3; }
.fs-card[data-off="-1"]{ --slot:calc(-1 * var(--fs-gap)); --slot-scale:.82; --fs-dir:-1; z-index:2; }
.fs-card[data-off="1"]{ --slot:var(--fs-gap); --slot-scale:.82; --fs-dir:1; z-index:2; }

/* 侧封面：Cover Flow 的招牌 = 强透视 + 绕 Y 轴外翻。
   角度够大是关键 —— 20° 在正视下几乎看不出旋转，整排就「平铺」了。
   perspective 写在 transform 首位（作用于此元素自身）；旋转量由 --fs-dir 定符号。 */
.fs-card[data-off="-1"] .fs-art,
.fs-card[data-off="1"] .fs-art{
  transform:perspective(1500px) rotateY(calc(var(--fs-dir) * -48deg)) translateZ(-60px);
  opacity:.74; filter:saturate(.85) brightness(.92);
}
/* 当前曲：**不透明、不旋转、不压暗**。主卡不得带 .left/.right 语义类，
   否则会吃到侧卡的 transform/opacity（上一版中间封面发灰发透的原因）。 */
.fs-card[data-off="0"] .fs-art{ transform:none; opacity:1; filter:none; }
/* 悬停：转到接近正面并抬亮 —— 明确告诉用户「这张可点」。
   只在**非动画期间**生效，免得跟 data-to 的目标态抢 transform。 */
.fs-covers:not(.fs-anim-next):not(.fs-anim-prev) .fs-card[data-off="-1"]:hover .fs-art{
  transform:perspective(1500px) rotateY(26deg) translateZ(-14px); opacity:1; filter:none;
}
.fs-covers:not(.fs-anim-next):not(.fs-anim-prev) .fs-card[data-off="1"]:hover .fs-art{
  transform:perspective(1500px) rotateY(-26deg) translateZ(-14px); opacity:1; filter:none;
}
/* 纵深堆叠：侧封面后方再叠一张「更外侧的轮廓」伪元素（不占 DOM、不需更多邻曲），
   这是 Cover Flow「一叠 albums 铺开」观感的来源。 */
.fs-card::after{
  content:""; position:absolute; inset:0; z-index:-1; border-radius:var(--fs-radius);
  background:#ffffff14; box-shadow:0 8px 24px #00000073;
  transform:perspective(1500px) translate3d(calc(var(--fs-dir,0) * 26px),0,-70px) rotateY(calc(var(--fs-dir,0) * -26deg)) scale(.9);
  opacity:0; transition:transform .44s cubic-bezier(.22,.61,.36,1), opacity .3s ease;
}
.fs-card[data-off="-1"]::after, .fs-card[data-off="1"]::after{ opacity:1; }
/* 邻曲不存在（队列到头）：整张卡隐掉，不留空壳占槽位 */
.fs-card.empty{ opacity:0; pointer-events:none; }

.fs-card .fs-cap{
  position:absolute; left:0; right:0; bottom:0; padding:16px 8px 7px; text-align:center;
  font-size:11.5px; line-height:1.35; color:#ffffffe0;
  background:linear-gradient(180deg,transparent,#000000b8);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  opacity:0; transition:opacity .22s ease;
}
.fs-card .fs-badge{
  position:absolute; top:6px; left:6px; width:20px; height:20px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  background:#00000073; color:#fff; opacity:0; transition:opacity .22s ease;
}
.fs-card .fs-badge svg{ width:11px; height:11px; }
/* 歌名条 / 转向角标只属于侧槽：中间槽位（以及动画中转到中间的那张）不显示。
   —— 三张卡的 DOM 长得一样，靠这里的槽位断言分工。 */
.fs-card[data-off="0"] .fs-cap, .fs-card[data-off="0"] .fs-badge,
.fs-card[data-to="0"] .fs-cap, .fs-card[data-to="0"] .fs-badge{ display:none; }
/* 角标图标统一是「指向右」，左槽镜像（节点会转格，图标不能按创建时的槽位写死） */
.fs-card[data-off="1"] .fs-badge svg, .fs-card[data-to="1"] .fs-badge svg,
.fs-card[data-to="2"] .fs-badge svg{ transform:scaleX(-1); }
.fs-card[data-off="-1"]:hover .fs-cap, .fs-card[data-off="1"]:hover .fs-cap{ opacity:1; }
.fs-card[data-off="-1"]:hover .fs-badge, .fs-card[data-off="1"]:hover .fs-badge{ opacity:.95; }
/* 中间：最大、最亮、可点播放/暂停（尺寸与侧卡同源，只差 --slot-scale 与角的差） */
.fs-card[data-off="0"] .fs-art{
  box-shadow:0 30px 80px #000a, 0 0 0 1px #ffffff1f, 0 1px 0 #ffffff2e inset;
}
.fs-card[data-off="0"] .fs-veil{
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  background:#0000004d; opacity:0; transition:opacity .2s ease;
}
.fs-card[data-off="0"]:hover .fs-veil{ opacity:1; }
.fs-card .fs-spin{
  position:absolute; inset:0; display:none; align-items:center; justify-content:center;
  background:#00000066; color:#fff;
}
.fs-card.loading .fs-spin{ display:flex; }
.fs-spin svg{ animation:fs-spin .9s linear infinite; }
@keyframes fs-spin{ to{ transform:rotate(360deg); } }
.fs-card .fs-err{
  position:absolute; left:0; right:0; bottom:0; padding:7px 10px; display:none;
  background:#c0263acc; color:#fff; font-size:11.5px; text-align:center;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.fs-card.has-err .fs-err{ display:block; }

/* —— 曲目信息 —— */
.fs-meta{ flex:0 0 auto; max-width:min(720px,90%); text-align:center; display:flex; flex-direction:column; gap:3px; }
.fs-line{ position:relative; overflow:hidden; max-width:100%; }
.fs-line > span{ display:inline-block; white-space:nowrap; will-change:transform; }
.fs-line.over{ mask-image:linear-gradient(90deg,transparent,#000 12px,#000 calc(100% - 12px),transparent); }
.fs-line.over > span{ animation:fs-marq var(--fs-md,8s) ease-in-out infinite alternate; }
.fs-line.over:hover > span{ animation-play-state:paused; }
@keyframes fs-marq{ from{ transform:translateX(0); } to{ transform:translateX(var(--fs-mx,0)); } }
.fs-title{ font-size:clamp(19px,2.3vw,29px); font-weight:800; letter-spacing:.2px; }
.fs-artist{ font-size:clamp(12.5px,1.25vw,15px); color:#ffffffcc; }
.fs-album{ font-size:12.5px; color:#ffffff8f; }
/* 收藏按钮**不能**放在 .fs-line 里面：.fs-line 是 overflow:hidden 的跑马灯窗口
   （正是靠它裁掉溢出文字），贴在它右缘外侧的按钮会被整块裁掉 —— 于是红心
   永远不显示、也点不到。放到一个「刚好裹住歌名」的定位容器里，按钮落在标题
   文字右侧（不在裁剪盒内）。 */
.fs-titlewrap{ position:relative; width:fit-content; max-width:100%; align-self:center; }
.fs-love{
  position:absolute; top:50%; left:calc(100% + 7px); transform:translateY(-50%);
  width:24px; height:24px; border:0; border-radius:50%; cursor:pointer; padding:0;
  background:transparent; color:#ffffff59; transition:color .16s ease, transform .16s ease;
}
.fs-love:hover{ color:#fff; transform:translateY(-50%) scale(1.12); }
.fs-love.on{ color:#ff5c72; }
.fs-love svg{ width:15px; height:15px; }

/* —— 歌词（只有单行版式）——
   只显示当前这一句（+ 翻译），但**高度要预定**：不预定的话，翻译出现/消失、
   长句折到第二行都会让整块变高 → 上面的封面跟着上下跳，观感就是「歌词挤着封面
   一起挤」。min-height 覆盖「一句原文 + 一句翻译」，并留出与歌名、与控制带的
   呼吸距离（stage 的 gap + 这里的 margin-top），让这句话落在封面下方、控制带上
   方的独立区间里。 */
.fs-lyrics{
  flex:0 1 auto; width:min(720px,92%);
  min-height:4.3em; max-height:8.6em; overflow:hidden;
  margin-top:6px;
  display:flex; align-items:center; justify-content:center;
  text-align:center; padding:0 8px;
  font-size:calc(clamp(17px,2.1vw,26px) * var(--fs-ly-scale,1));
  font-family:var(--font-lyric,inherit);
}
.fs-ll{
  padding:.1em 4px; cursor:pointer; color:#fff; max-width:100%;
  font-size:1em; font-weight:700; line-height:1.4;
  text-shadow:0 2px 22px #00000073;
  transition:opacity .26s ease, transform .26s ease;
}
.fs-ll .t2{
  display:block; font-size:.56em; font-weight:400; opacity:.82; margin-top:.28em;
  text-shadow:0 1px 12px #00000059;
}
.fs-lyrics.no-trans .fs-ll .t2{ display:none; }
/* —— 逐字单行（宿主有逐字提供器 + 用户在设置里没关时接管）——
   复用宿主已激活的提供器（AMLL）解析好的词级行，本插件只负责「当前这一句」的逐词染色。
   染色做法：每个词底下垫一层同字文本的伪元素，用 clip-path 按 --p 从左往右揭开 ——
   只写一个 CSS 变量就是一个词的进度，比逐词换 color 少一半重绘，也不用量任何坐标。
   基色取 65% 白（暗底上半透明白低于 .5 会看不清），已唱部分走高亮（主色 + 白，别拿
   封面原色当字色，浅色封面上会糊）。 */
.fs-ll.kara{ font-weight:800; }
.fs-ll .kw{ position:relative; white-space:pre; color:#ffffffa6; }
.fs-ll .kw::after{
  content:attr(data-t); position:absolute; left:0; top:0; white-space:pre;
  color:color-mix(in srgb, var(--fs-acc) 45%, #fff);
  clip-path:inset(0 calc((1 - var(--p,0)) * 100%) 0 0);
}
.fs-ly-empty{ text-align:center; color:#ffffff7a; font-size:13px; padding:8px 0; }

/* —— 切歌动画（Cover Flow 的灵魂）——
   三张卡（-1 / 0 / +1）整排平移一格：
     下一首（方向 +1，目标槽位 = 当前 offset **减** 1）：
       +1 → 0  转正、放大、成新中间（下一首本来就在右边，滚进来）
        0 → -1 向左转出、后退、压暗（现在的封面给下一首让位）
       -1 → -2 继续左移、淡出（它已经是「上上首」，离开视野）
     上一首镜像。

   槽位用 --slot / --slot-scale / --fs-dir 表达，JS 只需在动画期间把每张卡的
   **目标槽位**写进 data-to，由属性选择器换上一整套（位移+缩放+角度+透明度）。
   好处：不用在 JS 里量坐标（间距随尺寸变，算不准），且位移与角度共用同一条
   transition 曲线，不会「位移走了、角度还没到」。

   这一组规则对 ±方向是**同一套**（目标槽位本身就带符号），不再写 anim-next /
   anim-prev 两份镜像 —— 两份镜像必然漏改一边。 */
.fs-card[data-to="0"]{ --slot:0px; --slot-scale:1; --fs-dir:0; z-index:3; }
.fs-card[data-to="-1"]{ --slot:calc(-1 * var(--fs-gap)); --slot-scale:.82; --fs-dir:-1; z-index:2; }
.fs-card[data-to="1"]{ --slot:var(--fs-gap); --slot-scale:.82; --fs-dir:1; z-index:2; }
.fs-card[data-to="-2"]{ --slot:calc(-2.1 * var(--fs-gap)); --slot-scale:.64; --fs-dir:-1; z-index:1; opacity:0; pointer-events:none; }
.fs-card[data-to="2"]{ --slot:calc(2.1 * var(--fs-gap)); --slot-scale:.64; --fs-dir:1; z-index:1; opacity:0; pointer-events:none; }
.fs-card[data-to] .fs-art{ transform:perspective(1500px) rotateY(calc(var(--fs-dir) * -48deg)) translateZ(-60px); opacity:.74; filter:saturate(.85) brightness(.92); }
.fs-card[data-to="0"] .fs-art{ transform:none; opacity:1; filter:none; }
.fs-card[data-to]::after{ opacity:1; }
/* 转到中间的那张不能拖着自己的堆叠轮廓走（轮廓属于侧卡） */
.fs-card[data-to="0"]::after{ opacity:0; }
/* 「瞬移」用：出画的那张要绕到对侧去当新邻曲。位移必须瞬间完成（否则会横穿整排），
   但透明度照常过渡 —— 它是在不可见状态下换好图再淡入的。 */
.fs-card.fs-hop{ transition:opacity .3s ease; }
.fs-card.fs-hop .fs-art{ transition:opacity .34s ease, filter .34s ease; }
.fs-card.fs-hop::after{ transition:opacity .3s ease; }

@keyframes fs-meta-in{ from{ opacity:0; transform:translate3d(0,10px,0); } to{ opacity:1; transform:none; } }
.fs-title.fs-anim-next,.fs-title.fs-anim-prev,
.fs-artist.fs-anim-next,.fs-artist.fs-anim-prev,
.fs-album.fs-anim-next,.fs-album.fs-anim-prev{ animation:fs-meta-in .32s cubic-bezier(.22,.61,.36,1) both; }
.fs-artist.fs-anim-next,.fs-artist.fs-anim-prev{ animation-delay:.06s; }
.fs-album.fs-anim-next,.fs-album.fs-anim-prev{ animation-delay:.12s; }

/* —— 底部控制带 —— */
/* flex:0 0 auto —— 永远可见，窗口变矮时被压的是上方舞台。
   给一点 min-height 兜底：极端小窗下 flex 收缩可能把它压成一条缝。 */
.fs-bar{ flex:0 0 auto; min-height:60px; width:min(860px,94%); margin:0 auto; display:flex; flex-direction:column; justify-content:flex-end; gap:9px; }
.fs-prow{ display:flex; align-items:center; gap:11px; }
.fs-time{ flex:0 0 auto; font-size:11.5px; color:#ffffffa1; font-variant-numeric:tabular-nums; min-width:38px; }
.fs-time.dur{ text-align:right; }
.fs-track{
  position:relative; flex:1 1 auto; height:16px; cursor:pointer; touch-action:none;
  display:flex; align-items:center;
}
.fs-track::before{
  content:""; position:absolute; left:0; right:0; height:4px; border-radius:999px;
  background:#ffffff26; transition:height .14s ease;
}
.fs-track:hover::before,.fs-track.scrub::before{ height:6px; }
.fs-fill{
  position:absolute; left:0; height:4px; border-radius:999px; width:calc((100% - 0px) * var(--fs-pf,0));
  background:var(--fs-acc); transition:height .14s ease; pointer-events:none;
}
.fs-track:hover .fs-fill,.fs-track.scrub .fs-fill{ height:6px; }
.fs-knob{
  position:absolute; left:calc(100% * var(--fs-pf,0)); width:11px; height:11px; border-radius:50%;
  background:var(--fs-acc); transform:translateX(-50%) scale(0); transition:transform .14s ease;
  box-shadow:0 1px 5px #0007; pointer-events:none;
}
.fs-track:hover .fs-knob,.fs-track.scrub .fs-knob{ transform:translateX(-50%) scale(1); }

.fs-ctl{ display:flex; align-items:center; justify-content:space-between; gap:16px; }
.fs-ctl-group{ display:flex; align-items:center; gap:10px; min-width:0; }
.fs-iconbtn{
  flex:0 0 auto; width:30px; height:30px; border:0; border-radius:50%; padding:0; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  background:transparent; color:#ffffffc7; transition:background .14s ease, color .14s ease;
}
.fs-iconbtn:hover{ background:#ffffff1f; color:#fff; }
.fs-iconbtn.on{ color:var(--fs-acc-ink); }
.fs-vol{ position:relative; width:96px; height:16px; display:flex; align-items:center; touch-action:none; cursor:pointer; }
.fs-vol::before{ content:""; position:absolute; left:0; right:0; height:4px; border-radius:999px; background:#ffffff26; }
/* 音量条用「封面主色 + 白」调亮一档：与进度条同源但不同明度，一眼能分开两个控制。
   不额外挂 background 过渡 —— 宿主对 --cvg-accent 注册了 @property 且有 .45s 过渡，
   过渡链上再叠一层只会变成「追着跑」的迟滞。 */
.fs-volfill{ position:absolute; left:0; height:4px; border-radius:999px; background:color-mix(in srgb, var(--fs-acc) 58%, #fff); width:calc(100% * var(--fs-v,0.8)); }
.fs-volnum{ font-size:11px; color:#ffffff8c; font-variant-numeric:tabular-nums; min-width:34px; text-align:right; }
.fs-qwrap{ position:relative; }
.fs-qbtn{
  height:26px; min-width:56px; padding:0 11px; border-radius:999px; cursor:pointer; font:inherit;
  font-size:11.5px; font-weight:600; letter-spacing:.2px; white-space:nowrap;
  border:1px solid #ffffff2e; background:#ffffff14; color:#fffc;
  transition:background .14s ease, border-color .14s ease;
}
.fs-qbtn:hover,.fs-qbtn.open{ background:#ffffff24; border-color:#ffffff4d; }
/* 弹出层（音质 / 更多选项共用一套玻璃语言；top 或 bottom 由各自的 wrap 决定） */
.fs-pop{
  position:absolute; min-width:186px; padding:6px;
  border-radius:12px; background:#10131cd9; border:1px solid #ffffff1f; box-shadow:0 14px 40px #0007;
  backdrop-filter:blur(24px) saturate(1.5); -webkit-backdrop-filter:blur(24px) saturate(1.5);
  display:none; flex-direction:column; gap:1px; z-index:6;
}
.fs-pop.open{ display:flex; }
.fs-qpop{ right:0; bottom:calc(100% + 8px); }
.fs-mwrap{ position:relative; }
.fs-mmenu{ left:0; top:calc(100% + 8px); min-width:224px; }
.fs-qi{
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:7px 9px; border:0; border-radius:8px; cursor:pointer; font:inherit; font-size:12.5px;
  background:transparent; color:#ffffffe0; text-align:left; width:100%;
}
.fs-qi:hover{ background:#ffffff17; color:#fff; }
.fs-qi.sel{ background:color-mix(in srgb, var(--fs-acc) 30%, transparent); color:#fff; font-weight:700; }
.fs-qi em{ font-style:normal; font-size:11px; color:#ffffff8f; }
.fs-qempty{ padding:9px 10px; font-size:12px; color:#ffffff8f; }
/* 跳转三项（同名搜索 / 跳转歌手 / 跳转专辑）每次开菜单按当前曲现算，所以是动态填的；
   多歌手时逐项列出，缺 mid 的项禁用 —— 口径同宿主正在播放页的 ⋮ 菜单。 */
.fs-mjump{ display:flex; flex-direction:column; gap:1px; }
.fs-mjump:empty{ display:none; }
.fs-msep{ height:1px; margin:5px 6px; background:#ffffff1a; }
/* 更多选项里的「开关行」与「歌词大小行」 */
.fs-mrow{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:7px 9px; border-radius:8px; font-size:12.5px; color:#ffffffe0; cursor:pointer; }
.fs-mrow:hover{ background:#ffffff17; color:#fff; }
.fs-mrow input{ position:absolute; opacity:0; pointer-events:none; }
.fs-sw{ position:relative; flex:0 0 auto; width:30px; height:16px; border-radius:999px; background:#ffffff2e; transition:background .16s ease; }
.fs-sw::after{ content:""; position:absolute; top:2px; left:2px; width:12px; height:12px; border-radius:50%; background:#fff; transition:transform .16s ease; }
.fs-mrow input:checked + .fs-sw{ background:color-mix(in srgb, var(--fs-acc) 55%, #0b0e19); }
.fs-mrow input:checked + .fs-sw::after{ transform:translateX(14px); }
.fs-msize{ display:flex; align-items:center; gap:2px; flex:0 0 auto; }
.fs-msize button{
  width:22px; height:22px; border:0; border-radius:6px; padding:0; cursor:pointer;
  background:#ffffff1a; color:#fff; font:inherit; font-size:13px; line-height:1; display:grid; place-items:center;
}
.fs-msize button:hover:not(:disabled){ background:#ffffff2b; }
.fs-msize button:disabled{ opacity:.32; cursor:default; }
.fs-mval{ min-width:42px; text-align:center; font-size:11.5px; color:#fffb; font-variant-numeric:tabular-nums; }

@media (prefers-reduced-motion: reduce){
  /* 位移与角度都关掉：封面瞬移到新槽位（内容仍会更新，只是不再「翻」） */
  .fs-card, .fs-card .fs-art, .fs-card::after{ transition:none; }
  .fs-line.over > span{ animation:none; }
  .fs-ll{ transition:none; }
  .fs-title.fs-anim-next,.fs-title.fs-anim-prev,
  .fs-artist.fs-anim-next,.fs-artist.fs-anim-prev,
  .fs-album.fs-anim-next,.fs-album.fs-anim-prev{ animation:none; }
}
`;

// —— 视图实现 ——

/** 注入一次即可（同一插件可能多次 setup/停用，重复注入由宿主按 style 元素去重不了，
 *  这里自己做幂等：按 data 标记查重）。 */
function ensureStyle() {
  if (document.querySelector("style[data-sparkle-css='flowscape']")) return;
  const st = document.createElement("style");
  st.dataset.sparkleCss = "flowscape";
  st.textContent = CSS;
  document.head.append(st);
}

/**
 * 本插件的 storage（setup 时捕获）。
 *
 * render() 的签名由 SDK 定死（host + np 视图 ctx），而 storage 挂在**插件** ctx 上 ——
 * 两者不是同一个对象。模块级引用是这里的正确解法：插件是单例，setup 只跑一次，
 * 而 np 视图的挂载/重挂都要晚于它。
 */
let store: { get(k: string): string | null; set(k: string, v: string): void } | null = null;

const LY_MIN = 0.8, LY_MAX = 1.5;

function renderFlowscape(host: HTMLElement, ctx: SparkleNpViewCtx) {
  // 追加而不是覆写 className：宿主给的容器类（.np-view-root）留着，将来宿主给它
  // 加样式也不会被本插件抹掉。
  host.classList.add("fs-root");
  // 封面卡按 **offset** 数据驱动生成：-1 / 0 / +1 三张（上一首 / 当前 / 下一首）。
  // 为什么数据驱动而不是硬编码 prev/main/next：切歌动画要让「每张卡去下一个槽位」，
  // 卡片与 offset 的对应关系必须显式存在 DOM 上（data-off），CSS 才能按目标槽位
  // 出过渡态。三张足够 —— 槽位换完后新数据填进各卡，视觉上就是「整排翻一格」。
  const CARD_OFFSETS = [-1, 0, 1] as const;
  const cardHtml = (o: number) => {
    const isMain = o === 0;
    // 中间卡**只带 .main**：.left / .right 是「侧卡」语义（外翻 + 压暗），
    // 中间卡若沾上任何一个就会吃到侧卡的 transform/opacity —— 上一版正是
    // `o < 0 ? "left" : "right"` 让 offset 0 也拿到了 "right"，封面因此发灰发透。
    const side = isMain ? " main" : ` side ${o < 0 ? "left" : "right"}`;
    // 歌名条与转向角标**三张卡都建**（哪个槽位显示由 CSS 按 data-off 决定）：
    // 节点身份会随切歌整排转格，若只在侧卡里建，转到侧槽的那张就会缺角标、
    // 缺悬停歌名。角标图标统一用「指向右」，左侧用 CSS 镜像。
    return `<button class="fs-card${side}" data-off="${o}"
        type="button" aria-label="${isMain ? "播放/暂停" : o < 0 ? "上一首" : "下一首"}">
        <span class="fs-art"><span class="fs-ph"></span><img alt="" decoding="async"/>
          <span class="fs-badge">${svg('<path d="M10 6l6 6-6 6"/>', 'width="11" height="11"')}</span>
          <span class="fs-cap"></span>
          ${isMain ? `<span class="fs-spin">${svg('<path d="M12 3a9 9 0 1 1-6.4 2.6" stroke-width="2.4"/>', 'width="30" height="30"')}</span>
          <span class="fs-veil"></span><span class="fs-err"></span>` : ""}</span>
      </button>`;
  };
  host.innerHTML = `
    <div class="fs-top">
      <button class="fs-iconbtn" id="fs-collapse" type="button" title="收起正在播放页" aria-label="收起正在播放页">${ICON.collapse}</button>
      <div class="fs-mwrap">
        <button class="fs-iconbtn" id="fs-more" type="button" title="更多选项" aria-label="更多选项" aria-haspopup="menu" aria-expanded="false">${ICON.more}</button>
        <div class="fs-pop fs-mmenu" id="fs-mmenu" role="menu">
          <div id="fs-mjump"></div>
          <div class="fs-msep"></div>
          <label class="fs-mrow" for="fs-mtrans"><span>翻译歌词</span><input type="checkbox" id="fs-mtrans"><span class="fs-sw" aria-hidden="true"></span></label>
          <div class="fs-mrow">
            <span>歌词大小</span>
            <div class="fs-msize">
              <button type="button" id="fs-ly-dec" aria-label="缩小歌词" title="缩小歌词">−</button>
              <span class="fs-mval" id="fs-ly-val">100%</span>
              <button type="button" id="fs-ly-inc" aria-label="放大歌词" title="放大歌词">+</button>
            </div>
          </div>
          <div class="fs-msep"></div>
          <button class="fs-qi" id="fs-mcollapse" type="button"><span>收起正在播放页</span></button>
        </div>
      </div>
    </div>
    <div class="fs-stage">
      <div class="fs-covers" id="fs-covers">${CARD_OFFSETS.map(cardHtml).join("")}</div>
      <div class="fs-meta">
        <div class="fs-titlewrap">
          <div class="fs-line fs-title" id="fs-title"><span></span></div>
          <button class="fs-love" id="fs-love" type="button" aria-label="收藏" title="收藏"></button>
        </div>
        <div class="fs-line fs-artist" id="fs-artist"><span></span></div>
        <div class="fs-line fs-album" id="fs-album"><span></span></div>
      </div>
      <div class="fs-lyrics" id="fs-lyrics"></div>
    </div>
    <div class="fs-bar">
      <div class="fs-prow">
        <span class="fs-time" id="fs-cur">0:00</span>
        <div class="fs-track" id="fs-track" role="slider" tabindex="0" aria-label="播放进度"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="fs-fill"></div><div class="fs-knob"></div>
        </div>
        <span class="fs-time dur" id="fs-dur">0:00</span>
      </div>
      <div class="fs-ctl">
        <div class="fs-ctl-group">
          <button class="fs-iconbtn" id="fs-mute" type="button" aria-label="静音"></button>
          <div class="fs-vol" id="fs-vol" role="slider" tabindex="0" aria-label="音量" aria-valuemin="0" aria-valuemax="100" aria-valuenow="80">
            <div class="fs-volfill"></div>
          </div>
          <span class="fs-volnum" id="fs-volnum">80%</span>
        </div>
        <div class="fs-ctl-group">
          <div class="fs-qwrap">
            <button class="fs-qbtn" id="fs-qbtn" type="button" aria-haspopup="menu" aria-expanded="false" title="音质（本会话生效）">音质</button>
            <div class="fs-pop fs-qpop" id="fs-qpop" role="menu" aria-label="音质"></div>
          </div>
        </div>
      </div>
    </div>`;

  const $ = <T extends HTMLElement>(id: string) => host.querySelector<T>("#" + id)!;
  // 三张卡的 DOM 节点是**固定**的；data-off 才是「它此刻在哪个槽位」的真相。
  // 切歌动画结束时整排身份转一格（见 settleSwitch），所以 node ↔ 槽位的对应关系
  // 必须在运行时按 data-off 现查 —— 之前把 offset 存在闭包里（`cards` + 捕获的 o），
  // 转格后点击就会跳到错的曲目。
  const cardEls = [...host.querySelectorAll<HTMLButtonElement>(".fs-card[data-off]")];
  const cards = new Map<number, HTMLButtonElement>();
  const indexCards = () => {
    cards.clear();
    for (const el of cardEls) cards.set(Number(el.dataset.off), el);
  };
  indexCards();
  const card = (o: number): HTMLButtonElement => cards.get(o)!;
  const covers = $("fs-covers");
  // 「中间卡专属」的三层覆盖（缓冲转圈 / 悬停播放态 / 错误条）：它们是**跟随槽位**
  // 的，动画结算时整体搬进新的中间卡（节点引用不变，所以 paintMeta 里的闭包依然有效）。
  let curMain = card(0);
  const mainSpin = curMain.querySelector<HTMLElement>(".fs-spin")!;
  const mainVeil = curMain.querySelector<HTMLElement>(".fs-veil")!;
  const mainErr = curMain.querySelector<HTMLElement>(".fs-err")!;
  const adoptMain = () => {
    const mc = card(0);
    if (mc === curMain) return;
    for (const el of cardEls) el.classList.remove("loading", "has-err");
    curMain = mc;
    mc.querySelector<HTMLElement>(".fs-art")!.append(mainSpin, mainVeil, mainErr);
  };
  const titleBox = $("fs-title"), artistBox = $("fs-artist"), albumBox = $("fs-album");
  const loveBtn = $<HTMLButtonElement>("fs-love");
  const lyricsBox = $("fs-lyrics");
  const track = $("fs-track"), curT = $("fs-cur"), durT = $("fs-dur");
  const muteBtn = $<HTMLButtonElement>("fs-mute"), volBox = $("fs-vol"), volNum = $("fs-volnum");
  const qBtn = $<HTMLButtonElement>("fs-qbtn"), qPop = $("fs-qpop");
  const collapseBtn = $<HTMLButtonElement>("fs-collapse");
  const moreBtn = $<HTMLButtonElement>("fs-more"), mMenu = $("fs-mmenu");
  const mTrans = $<HTMLInputElement>("fs-mtrans");
  const lyVal = $("fs-ly-val"), lyDec = $<HTMLButtonElement>("fs-ly-dec"), lyInc = $<HTMLButtonElement>("fs-ly-inc");
  const mCollapse = $<HTMLButtonElement>("fs-mcollapse");
  const jumpBox = $("fs-mjump");

  // —— 设置（宿主 storage）——
  //  flow    = 总开关（enabled() 也读它）
  //  lyscale = 歌词字号倍率（更多选项里调；持久化，属于用户偏好）
  // 歌词**只有单行版式**（只显示当前播放的那一句 + 其翻译），不做多档切换：
  // 版式一变就得重建整列歌词 DOM，收益远小于复杂度，而且单行 + 大封面才是
  // 「一张图配一句话」的完整构图。
  let lastLyricKey = "";
  let lyScale = clampNum(Number(store?.get("lyscale")) || 1, LY_MIN, LY_MAX);

  /**
   * 封面请求像素：按**实际显示宽度 × dpr** 取，再由 coverSize() 吸附到 CDN 合法档位。
   *
   * 量 `offsetWidth`（layout 盒）而不是 `getBoundingClientRect().width`：侧封面带
   * rotateY + scale，rect 量到的是**变换后**的投影宽度（被压缩），会低估所需像素。
   * offsetWidth 是未变换的原始尺寸，乘 dpr 后向上吸附，结果总是够用不糊。
   */
  const wantPx = (off: number): number => {
    // 三张卡的封面盒是**同一个宽度**（--fs-cover），所以量哪张卡的结果都一样；
    // 槽位只用来在「没有实体卡的槽位」（±2，预热用）时选一张邻居卡来量。
    const art = card(off === 0 ? 0 : off < 0 ? -1 : 1).querySelector<HTMLElement>(".fs-art")!;
    const shown = Math.max(64, Math.round(art.offsetWidth || (off === 0 ? 300 : 160)));
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    return shown * dpr;
  };

  // —— 弹出层（音质 / 更多选项）：同一时刻只开一个，点外面关 ——
  const pops: { btn: HTMLElement; pop: HTMLElement }[] = [
    { btn: qBtn, pop: qPop },
    { btn: moreBtn, pop: mMenu },
  ];
  const onDocDown = (e: Event) => {
    const t = e.target as Node;
    for (const p of pops) if (p.pop.contains(t) || p.btn.contains(t)) return;
    closePops();
  };
  const closePops = () => {
    for (const p of pops) {
      p.pop.classList.remove("open");
      p.btn.classList.remove("open");
      p.btn.setAttribute("aria-expanded", "false");
    }
    document.removeEventListener("pointerdown", onDocDown, true);
  };
  const togglePop = (btn: HTMLElement, pop: HTMLElement) => {
    if (pop.classList.contains("open")) { closePops(); return; }
    closePops();
    pop.classList.add("open");
    btn.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", onDocDown, true);
  };
  // —— 更多选项里的「跳转」三项：同名搜索 / 跳转歌手 / 跳转专辑 ——
  // 宿主没给视图开路由 API，但整套界面就是 hash 路由 —— 直接写 location.hash 即可
  // （口径与宿主正在播放页的 ⋮ 菜单逐字一致，包括 pmid 取前段、缺 mid 的项禁用）。
  // 关键：**正在播放页是铺满全窗的常驻悬浮层，只换路由它还盖在最上面** ——
  // 跳转前必须先 ctx.collapse()，否则用户点完什么都看不到变。留 140ms 让菜单先收起来。
  const JUMP_MS = 140;
  const jumpTo = (hash: string) => {
    closePops();
    window.setTimeout(() => { ctx.collapse(); location.hash = hash; }, JUMP_MS);
  };
  const jumpRow = (label: string, disabled: boolean, run?: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "fs-qi";
    b.innerHTML = `<span>${esc(label)}</span>`;
    b.disabled = disabled;
    if (run) b.onclick = run;
    return b;
  };
  /** 每次开菜单按当前曲现算（曲目可能缺歌手/专辑信息，逐项禁用；多歌手逐项列出） */
  const renderJumpRows = () => {
    const s = ctx.current();
    jumpBox.innerHTML = "";
    if (!s) {
      const e = document.createElement("div");
      e.className = "fs-qempty";
      e.textContent = "未在播放";
      jumpBox.append(e);
      return;
    }
    jumpBox.append(jumpRow("同名搜索", false, () => jumpTo(`#/search?keyword=${encodeURIComponent(s.name)}`)));
    const singers = (s.singer ?? []).filter((a) => !!a.mid);
    if (!singers.length) jumpBox.append(jumpRow("跳转歌手", true));
    for (const a of singers) {
      jumpBox.append(jumpRow(singers.length > 1 ? `跳转歌手：${a.name}` : "跳转歌手", false,
        () => jumpTo(`#/singer?mid=${encodeURIComponent(a.mid!)}&name=${encodeURIComponent(a.name)}`)));
    }
    const alb = s.album;
    const hasAlb = !!(alb?.mid || alb?.pmid);
    jumpBox.append(hasAlb
      ? jumpRow("跳转专辑", false, () => {
        const base = String(alb!.pmid || alb!.mid).split("_")[0];
        jumpTo(`#/album?mid=${encodeURIComponent(alb!.mid ?? base)}&name=${encodeURIComponent(alb!.name || "专辑")}`);
      })
      : jumpRow("跳转专辑", true));
  };

  qBtn.onclick = () => togglePop(qBtn, qPop);
  moreBtn.onclick = () => { renderJumpRows(); togglePop(moreBtn, mMenu); };

  // 强调色（控制带染色）不在这里读：`--fs-acc` 在 CSS 里直连宿主的 --cvg-accent，见
  // .fs-root 的变量块。JS 抄一次 getComputedStyle 只能拿到「这一刻」的颜色，换曲后
  // 就停在旧色上（而且丢掉宿主那条 .45s 的扫色过渡）。

  // —— 溢出跑马灯：容器宽 < 文本宽才启用；--mx 行程在溢出量外多补 12px 让尾字滚进清晰区。
  //    文本没变不动变量（rAF 每帧跑，重设变量会重启 CSS 动画）；ResizeObserver 覆盖窗口缩放。
  const marquees: { box: HTMLElement; inner: HTMLElement; sig: string }[] = [
    { box: titleBox, inner: titleBox.querySelector("span")!, sig: "" },
    { box: artistBox, inner: artistBox.querySelector("span")!, sig: "" },
    { box: albumBox, inner: albumBox.querySelector("span")!, sig: "" },
  ];
  const measure = () => {
    for (const m of marquees) {
      if (!m.sig) continue;
      // 标题行的盒子现在刚好裹住文字（收藏按钮在盒外），所以不再需要为按钮预留宽度。
      const over = m.inner.scrollWidth - m.box.clientWidth;
      m.box.classList.toggle("over", over > 1);
      if (over > 1) {
        m.box.style.setProperty("--fs-mx", `${-over}px`);
        m.box.style.setProperty("--fs-md", `${Math.max(5, Math.round((over + 20) / 26))}s`);
      }
    }
  };
  const ro = new ResizeObserver(measure);
  ro.observe(titleBox); ro.observe(artistBox); ro.observe(albumBox);
  const setMarquee = (i: number, text: string) => {
    const m = marquees[i];
    if (text === m.sig) return;
    m.sig = text;
    m.inner.textContent = text;
    m.box.classList.remove("over");
    measure();
  };

  // —— 交互：点侧封面跳到那一首（槽位 -1 / +1，两侧各指一首），中间封面点一下播放/暂停 ——
  // 槽位在点击时才读 data-off：卡片身份会随切歌转格，闭包里存下来的 offset 会失效。
  for (const el of cardEls) {
    el.onclick = () => {
      // 换槽动画期间不接受点击：此刻卡片的视觉位置与 data-off 已经错开一格，
      // 点下去算出来的 offset 与用户看到的那张不是同一首歌（连环切歌会越点越离谱）。
      if (animating) return;
      const o = Number(el.dataset.off);
      if (o === 0) ctx.toggle(); else ctx.jumpTo(o);
    };
  }
  loveBtn.onclick = (e) => { e.stopPropagation(); ctx.toggleLove(); };
  muteBtn.onclick = () => ctx.toggleMute();
  // 接管态的出口：宿主把播放条（点封面展开的唯一入口）和 .np-inner（⋮ 菜单在那儿）
  // 都收走了，不给一颗自己的按钮，用户就只能按 ESC 出去。
  collapseBtn.onclick = () => ctx.collapse();
  mCollapse.onclick = () => { closePops(); ctx.collapse(); };

  // 更多选项：翻译开关 + 歌词字号（宿主 np 页那两样的对应物；路由类的
  // 「同名搜索 / 跳转歌手」SDK 没开放，不做假按钮）
  mTrans.onchange = () => ctx.toggleTrans();
  const applyLyScale = () => {
    host.style.setProperty("--fs-ly-scale", lyScale.toFixed(2));
    lyVal.textContent = `${Math.round(lyScale * 100)}%`;
    lyDec.disabled = lyScale <= LY_MIN + 1e-6;
    lyInc.disabled = lyScale >= LY_MAX - 1e-6;
    store?.set("lyscale", lyScale.toFixed(2));
    measure();
  };
  lyDec.onclick = () => { lyScale = clampNum(lyScale - 0.05, LY_MIN, LY_MAX); applyLyScale(); };
  lyInc.onclick = () => { lyScale = clampNum(lyScale + 0.05, LY_MIN, LY_MAX); applyLyScale(); };
  applyLyScale();

  // 键盘可达：封面与滑杆可 Tab 聚焦，Enter/Space 触发按钮；进度条 ←/→ ±5s、音量 ↑/↓
  track.onkeydown = (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); ctx.seek(Math.max(0, ctx.time() - 5)); }
    else if (e.key === "ArrowRight") { e.preventDefault(); ctx.seek(ctx.time() + 5); }
  };
  volBox.onkeydown = (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); ctx.setVolume(ctx.volume() - 0.05); }
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); ctx.setVolume(ctx.volume() + 0.05); }
  };

  // —— 拖拽：进度条 seek / 音量调值。拖中只改视觉（--fs-pf / --fs-v），松手才提交。
  //    监听挂 window：指针可能被拖出元素（setPointerCapture 在跨 iframe/失焦时不可靠）。
  const fracIn = (e: PointerEvent, el: HTMLElement) =>
    clamp01((e.clientX - el.getBoundingClientRect().left) / Math.max(1, el.getBoundingClientRect().width));
  let scrub = 0;
  // 进度百分比签名：paintTransport 与拖拽提交共用（scrub 期间跳过写入，提交后作废签名强制重画）
  let sigProgress = "";
  const onScrubMove = (e: PointerEvent) => {
    scrub = fracIn(e, track);
    track.style.setProperty("--fs-pf", String(scrub));
    curT.textContent = fmtDur(scrub * ctx.duration());
  };
  const onScrubUp = () => {
    window.removeEventListener("pointermove", onScrubMove);
    window.removeEventListener("pointerup", onScrubUp);
    window.removeEventListener("pointercancel", onScrubUp);
    track.classList.remove("scrub");
    ctx.seek(scrub * ctx.duration());
    sigProgress = ""; // scrub 期间 paintTransport 跳过了这组签名，提交后强制下一帧重画
  };
  track.addEventListener("pointerdown", (e) => {
    if (!ctx.duration()) return;
    e.preventDefault();
    track.classList.add("scrub");
    scrub = fracIn(e, track);
    onScrubMove(e);
    window.addEventListener("pointermove", onScrubMove);
    window.addEventListener("pointerup", onScrubUp);
    window.addEventListener("pointercancel", onScrubUp);
  });
  // 键盘 Home/End 也走 seek
  track.addEventListener("keydown", (e) => {
    if (e.key === "Home") { e.preventDefault(); ctx.seek(0); }
    else if (e.key === "End") { e.preventDefault(); const d = ctx.duration(); if (d) ctx.seek(d - 1); }
  });

  let volDrag = 0;
  // 拖动中不让 paintMeta 覆盖音量条（指针按着，正在被写）
  let volDragging = false;
  const onVolMove = (e: PointerEvent) => {
    volDrag = fracIn(e, volBox);
    volBox.style.setProperty("--fs-v", String(volDrag));
    volNum.textContent = `${Math.round(volDrag * 100)}%`;
  };
  const onVolUp = () => {
    window.removeEventListener("pointermove", onVolMove);
    window.removeEventListener("pointerup", onVolUp);
    window.removeEventListener("pointercancel", onVolUp);
    volDragging = false;
    ctx.setVolume(volDrag);
  };
  volBox.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    volDragging = true;
    volDrag = fracIn(e, volBox);
    onVolMove(e);
    window.addEventListener("pointermove", onVolMove);
    window.addEventListener("pointerup", onVolUp);
    window.addEventListener("pointercancel", onVolUp);
  });

  // —— 歌词：单行 —— 只渲染当前这一句（+ 翻译），不建整首列表（用户看不到、每行都
  //    占着内存与解析开销）。两种数据源，由 karaokeActive() 每次 notify 现读决定：
  //      · 逐字：宿主已激活的提供器（AMLL 插件）解析好的词级行 → 逐词染色，一句里
  //        能看出唱到哪个字；用户在设置里关掉逐字，这个开关立刻变 false。
  //      · 行级：没有提供器 / 逐字解析失败 / 该曲无逐字 → ctx.lyrics() 整句高亮。
  //    换句由 rAF 的行号比对触发（见 tick），这里只负责换曲/加载态/模式或翻译切换的重建。
  let lyricLines: SparkleLyricLine[] = [];
  let lineEls: HTMLElement[] = [];
  let lastIdx = -1;
  let lastLineSig: string | null = null;
  let karaOn = false;
  let karaLines: SparkleKaraokeLine[] = [];
  let karaWords: HTMLElement[] = [];
  let lastKaraSig: string | null = null;

  const buildLyrics = (cur: SparkleSongSnapshot | null) => {
    const st = ctx.lyricState();
    const kara = ctx.karaokeActive();
    // 模式也进签名：逐字开关一改就整体重建（否则容器里还挂着上一种模式的 DOM）
    const key = `${cur?.mid ?? ""}|${st}|${ctx.showTrans() ? 1 : 0}|${kara ? "k" : "l"}`;
    if (key === lastLyricKey) return;
    lastLyricKey = key;
    lastIdx = -1;
    lastLineSig = null;
    lastKaraSig = null;
    karaOn = kara;
    karaLines = kara ? ctx.karaoke() : [];
    lyricLines = kara ? [] : ctx.lyrics();
    lineEls = [];
    karaWords = [];
    if (!cur) { lyricsBox.innerHTML = `<div class="fs-ly-empty">未在播放</div>`; return; }
    const count = karaOn ? karaLines.length : lyricLines.length;
    if (st === "loading" || (st === "idle" && !count)) {
      lyricsBox.innerHTML = `<div class="fs-ly-empty">歌词加载中…</div>`;
      return;
    }
    if (!count) { lyricsBox.innerHTML = `<div class="fs-ly-empty">暂无歌词</div>`; return; }
    // 先留空：rAF 首次 tick 会把当前句填进来
    lyricsBox.innerHTML = "";
  };

  /** 把第 idx 句填进单行歌词容器（idx < 0 = 清空）；karaoke 走逐词版 */
  const paintCurrentLine = (idx: number) => {
    const l = idx >= 0 ? lyricLines[idx] : undefined;
    const sig = l ? `${l.t}|${l.text}|${l.trans ?? ""}` : "empty";
    if (sig === lastLineSig) return;
    lastLineSig = sig;
    if (!l) { lyricsBox.innerHTML = lyricLines.length ? "" : `<div class="fs-ly-empty">暂无歌词</div>`; lineEls = []; return; }
    lyricsBox.innerHTML = `<div class="fs-ll cur" title="点击跳到这一句"><span class="t1">${esc(l.text)}</span>${
      l.trans && ctx.showTrans() ? `<span class="t2">${esc(l.trans)}</span>` : ""
    }</div>`;
    lineEls = [...lyricsBox.querySelectorAll<HTMLElement>(".fs-ll")];
    if (lineEls[0]) lineEls[0].onclick = () => { ctx.seek(l.t); };
  };

  /**
   * 逐字：把第 idx 行铺成「每个词一个 span」。词的文本走 textContent 写（不拼 HTML，
   * 免去转义问题），同时把同一份文本塞进 data-t —— CSS 用 `::after{content:attr(data-t)}`
   * 叠一层同字文本，靠 clip-path 按 --p 从左揭开，就是逐字染色。
   */
  const paintKaraLine = (idx: number) => {
    const l = idx >= 0 ? karaLines[idx] : undefined;
    const sig = l ? `${l.startTime}|${l.words.map((w) => w.word).join("\u0001")}|${l.translatedLyric ?? ""}` : "empty";
    if (sig === lastKaraSig) return;
    lastKaraSig = sig;
    if (!l) {
      lyricsBox.innerHTML = karaLines.length ? "" : `<div class="fs-ly-empty">暂无歌词</div>`;
      karaWords = [];
      return;
    }
    lyricsBox.innerHTML = `<div class="fs-ll kara" title="点击跳到这一句">${
      l.words.map(() => `<span class="kw"></span>`).join("")
    }${l.translatedLyric && ctx.showTrans() ? `<span class="t2">${esc(l.translatedLyric)}</span>` : ""}</div>`;
    karaWords = [...lyricsBox.querySelectorAll<HTMLElement>(".kw")];
    l.words.forEach((w, i) => {
      const el = karaWords[i];
      if (!el) return;
      el.textContent = w.word;
      el.dataset.t = w.word;
    });
    const box = lyricsBox.querySelector<HTMLElement>(".fs-ll");
    if (box) box.onclick = () => ctx.seek(l.startTime / 1000);
  };

  /** 逐词进度：--p 是「这个词已经唱了多少」。**只在变化时写**（量化到 2%），
   *  一个句子里 99% 的词是 0 或 1，稳态几乎零写入。 */
  const paintKaraWords = (l: SparkleKaraokeLine, ms: number) => {
    for (let i = 0; i < karaWords.length; i++) {
      const w = l.words[i];
      const el = karaWords[i];
      if (!w || !el) continue;
      const span = Math.max(1, w.endTime - w.startTime);
      const p = ms >= w.endTime ? 1 : ms <= w.startTime ? 0 : (ms - w.startTime) / span;
      const q = Math.round(p * 50) / 50;
      if (el.dataset.p === String(q)) continue;
      el.dataset.p = String(q);
      el.style.setProperty("--p", String(q));
    }
  };

  // —— 状态绘制。刻意分两层：
  //   paintMeta()      封面/信息/歌词/收藏/翻译/画质 —— 4Hz（notify）跑就够；
  //   paintTransport() 进度条/时间/播放态/音量       —— 每帧跑（位置是外推时钟，
  //                     4Hz 上去是台阶），但每项都有签名比对，稳态几乎不写 DOM。
  let sigPlay = "", sigVol = "", sigQLabel = "", sigQTiers = "", sigLove = "", sigErr = "";

  // —— 封面装载：<img> 的 onerror 兜底 ——
  // 封面 404（无图的老专辑 / mid 变更）时退回占位符，绝不给用户一个碎图。
  // 逐个 <img> 挂一次即可（src 换几次都是同一个元素，处理器常驻）。
  for (const el of cardEls) {
    const img = el.querySelector<HTMLImageElement>("img")!;
    const ph = el.querySelector<HTMLElement>(".fs-ph")!;
    img.onerror = () => { img.removeAttribute("src"); img.style.display = "none"; ph.style.display = ""; };
  }

  // 换封面：设 src 前先把占位符亮出来，onload 再藏 —— 否则上一张图会滞留在新歌
  // 的位置上（src 换了但旧帧还在），观感是「封面卡住不换」。
  const setCover = (img: HTMLImageElement, ph: HTMLElement, url: string) => {
    if (!url) { img.removeAttribute("src"); img.style.display = "none"; ph.style.display = ""; return; }
    ph.style.display = "none";
    if (img.getAttribute("src") !== url) { img.src = url; img.style.display = ""; }
  };

  /**
   * 预热封面（只进 HTTP 缓存，不碰 DOM）。
   * 切歌收尾时两侧的新封面是**淡入**的：浏览器在新图解码完成前会继续画旧图，
   * 若那会儿才开始下载，淡入的这张会先显示上一首的封面（错图）。所以换槽一开始
   * 就把它要用的两张图请求出去，440ms 的动画时间足够下载完。
   */
  const warmed = new Set<string>();
  const preloadCover = (s: SparkleSongSnapshot | null, slot: number) => {
    const url = coverOf(s, wantPx(slot));
    if (!url || warmed.has(url)) return;
    warmed.add(url);
    const im = new Image();
    im.decoding = "async";
    im.src = url;
  };

  /** 每张卡当前显示的签名（url + 歌名），4Hz 下比对用 */
  const sigs = new Map<number, string>();

  /** 上一次渲染时的曲 mid 与**它**在播放顺序上的两个邻居。 */
  let lastMid = "", lastPrevMid = "", lastNextMid = "";
  /** 换槽动画进行中：期间不刷封面数据，否则动画刚起步图就换完了，看不出「翻一格」 */
  let animating = false;
  /** 正在跑的动画方向（结算时要用） */
  let pendingDir: 1 | -1 = 1;
  let animTimer = 0;

  /**
   * 动画收尾 = **整排身份转一格**。这一步漏了，整排在动画结束的瞬间会整体弹回去。
   *
   * 三张 DOM 节点是固定的，槽位真相在 data-off 上。动画把「+1 号节点」推到了中间，
   * 收尾若只清 data-to，它会弹回 +1 槽 —— 前面的功夫全废。所以 data-off 也要
   * 跟着减一格，节点带着刚占到的槽位继续往前走，视觉上零位移：
   *     +1 → 0、0 → -1、-1（出画那张）→ 绕到 +1
   * 出画那张此刻 opacity:0（看不见），所以「从 -2 绕到 +1」的瞬移不会被察觉；
   * 但必须**关掉它的位移过渡**（fs-hop），否则它会横穿整排飞回右边。透明度过渡
   * 保留着 —— 它就是靠淡入回到画面里的（图已在不可见时换好）。
   */
  const settleSwitch = (direction: 1 | -1) => {
    covers.classList.remove("fs-anim-next", "fs-anim-prev");
    for (const el of [titleBox, artistBox, albumBox]) el.classList.remove("fs-anim-next", "fs-anim-prev");
    let hopper: HTMLButtonElement | null = null;
    for (const el of cardEls) {
      el.removeAttribute("data-to");
      const n = Number(el.dataset.off) - direction;
      if (n < -1) { el.dataset.off = "1"; hopper = el; }
      else if (n > 1) { el.dataset.off = "-1"; hopper = el; }
      else el.dataset.off = String(n);
    }
    if (hopper) {
      const hp = hopper;
      hp.classList.add("fs-hop");
      requestAnimationFrame(() => requestAnimationFrame(() => hp.classList.remove("fs-hop")));
    }
    indexCards();
    adoptMain();
    sigs.clear(); // 槽位的含义变了：整排重取一次封面
    animating = false;
    // 槽位落定后再刷数据：动画期间换图会被用户看成「图在动」。
    // 走 paintMeta（而不只是 paintSong）：缓冲圈/错误条那几层挂在「谁是中间卡」上，
    // 中间卡刚换了主人，状态也得跟着重新落一遍。
    paintMeta();
  };

  /**
   * 切歌动画 = **整排换槽**（Cover Flow 的三段式全靠它）。方向 +1（点下一首）时：
   *   +1 → 0：转正、放大、升到最前（下一首本来就在右边，滚进来当新中间）
   *    0 → -1：向左转出、后退、压暗（现在的封面滚走）
   *   -1 → -2：继续左移并淡出（它已是「上上首」，离开视野）
   * 上一首镜像。目标槽位 = 当前槽位 **减去**方向 —— 点右边那张，整排就往左挪一格，
   * 滚进来的正是他点的那张。
   *
   * 关键设计：**JS 不量坐标**，只把「目标槽位」写进每张卡的 data-to；
   * 槽位、角度、缩放全是 CSS 里按 --fs-gap / --fs-dir 算的（位移与角度共用同一条
   * transition，不会脱节）。动画期间不动 DOM 顺序，结束后交给 settleSwitch 转格。
   */
  const playSwitchAnim = (direction: 1 | -1) => {
    // 调用方（paintSong）已保证 !animating：点封面在动画期间被挡掉，媒体键/自动切歌
    // 撞上动画时只更新数据、不排队第二段翻滚（数据始终是对的，丢的只是那一格动画）。
    pendingDir = direction;
    animating = true;
    // 收尾后两侧用的两张新封面：趁动画这 440ms 先下下来（见 preloadCover 的注释）
    preloadCover(ctx.songAt(1), 1);
    preloadCover(ctx.songAt(-1), -1);
    const cls = direction > 0 ? "fs-anim-next" : "fs-anim-prev";
    covers.classList.remove("fs-anim-next", "fs-anim-prev");
    void covers.offsetWidth; // 强制 reflow：让浏览器看到 class 真的消失再出现
    for (const el of cardEls) el.dataset.to = String(Number(el.dataset.off) - direction);
    covers.classList.add(cls);
    // 信息三行走「上滑淡入」，与封面翻页错开一点（先动封面、再动字）
    for (const el of [titleBox, artistBox, albumBox]) el.classList.add(cls);

    window.clearTimeout(animTimer);
    animTimer = window.setTimeout(() => {
      if (!host.isConnected) return; // 视图已卸载（停用插件/关掉开关）
      settleSwitch(pendingDir);
    }, ANIM_MS);
  };

  const paintSong = (cur: SparkleSongSnapshot | null) => {
    // 方向判定用**旧的**邻居表。不能用 ctx.songAt() 反查：那是以**新**当前曲为原点
    // 算的，而新曲正是旧邻居之一 —— 换过去之后它变成 current，原来的「下一首」
    // 位置改成了旧 current，反查必然落空（上一版点侧封面因此从不触发动画）。
    if (cur && !animating && lastMid && cur.mid !== lastMid) {
      if (cur.mid === lastNextMid) playSwitchAnim(1);
      else if (cur.mid === lastPrevMid) playSwitchAnim(-1);
    }
    if (cur) {
      lastMid = cur.mid;
      lastNextMid = ctx.songAt(1)?.mid ?? "";
      lastPrevMid = ctx.songAt(-1)?.mid ?? "";
    } else {
      lastMid = ""; lastNextMid = ""; lastPrevMid = "";
    }

    // 动画期间不刷卡面数据（换图会毁掉「整排翻一格」的连续感）；
    // settleSwitch 会再调一次本函数，那时 animating 已复位，数据补齐。
    if (!animating) {
      // —— 封面预热（跟随播放顺序）——
      // 稳态就把左右邻曲各预载一张、再往外各一张：**不等到点下去才请求**。
      // 换槽动画只有 440ms，收尾那张是淡入的，浏览器在新图解码完成前会继续画旧图 ——
      // 于是淡入过程中先露出上一首的封面（用户看到的「因为加载所以难受」）。
      // 顺序与显示同一来源（ctx.songAt 与宿主共用 stepInOrder，随机播放下也是对的）；
      // 越界返回 null，preloadCover 自动跳过。URL 与真正显示时一致 ——
      // 三张卡的封面盒同宽，±1 与 0 的取图像素本来就相同，不会出现「小图换大图」。
      for (const off of [-1, 1, -2, 2]) preloadCover(ctx.songAt(off), off);

      for (const el of cardEls) {
        const o = Number(el.dataset.off);
        const img = el.querySelector<HTMLImageElement>("img")!;
        const ph = el.querySelector<HTMLElement>(".fs-ph")!;
        const cap = el.querySelector<HTMLElement>(".fs-cap")!;
        // 无障碍标签也要跟着槽位走（节点身份会转格）
        const label = o === 0 ? "播放/暂停" : o < 0 ? "上一首" : "下一首";
        if (el.getAttribute("aria-label") !== label) el.setAttribute("aria-label", label);
        const s = o === 0 ? cur : ctx.songAt(o);
        const url = coverOf(s, wantPx(o));
        const name = s?.name ?? "";
        const key = url + "|" + name;
        if (sigs.get(o) === key) continue;
        sigs.set(o, key);
        setCover(img, ph, url);
        if (cap) cap.textContent = name;
        // 邻曲不存在（队列到头）→ 整张卡淡出并禁用点击，别留一个空壳占槽位
        el.classList.toggle("empty", !s);
        el.disabled = !s;
      }
    }

    setMarquee(0, cur?.name ?? "未在播放");
    setMarquee(1, artistsOf(cur) || "未知歌手");
    setMarquee(2, cur?.album?.name || "");
  };

  /** 4Hz 层：曲目元数据 + 歌词 + 收藏 + 翻译 + 画质（这些都不跟手，没必要每帧跑） */
  const paintMeta = () => {
    const cur = ctx.current();
    paintSong(cur);
    buildLyrics(cur);

    // 播放/暂停：spinner（取链/缓冲）、出错（重试图标）、常规
    const loading = ctx.loading(), err = ctx.error();
    // 覆盖层跟着「谁是中间卡」走（节点在 settleSwitch 里搬过家，这里是新主人）
    curMain.classList.toggle("loading", loading);
    curMain.classList.toggle("has-err", !!err && !loading);
    if (err !== sigErr) { sigErr = err; mainErr.textContent = err; }
    //  veil = 悬停才显的播放态图标：**暂停时显示 ▶**（点了是继续播），播放中显示 ⏸
    const playSig = loading ? "load" : err ? "err" : ctx.paused() ? "paused" : "playing";
    if (playSig !== sigPlay) {
      sigPlay = playSig;
      mainVeil.innerHTML = err ? svg('<path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5" stroke-width="2"/>', 'width="30" height="30"')
        : playSig === "paused" ? ICON.play : ICON.pause;
    }

    // 音量：拖动中不跟（指针按着，音量条正在被写）
    const v = ctx.muted() ? 0 : ctx.volume();
    if (!volDragging) {
      const pct = Math.round(v * 100);
      volBox.style.setProperty("--fs-v", String(v));
      if (volNum.textContent !== `${pct}%`) volNum.textContent = `${pct}%`;
    }
    muteBtn.classList.toggle("on", ctx.muted() || v === 0);
    const volKey = `${Math.round(v * 100)}|${ctx.muted() ? 1 : 0}`;
    if (volKey !== sigVol) {
      sigVol = volKey;
      muteBtn.innerHTML = ctx.muted() || v === 0 ? ICON.volMute : v < 0.34 ? ICON.volLow : v < 0.67 ? ICON.volMid : ICON.volHigh;
    }
    volBox.setAttribute("aria-valuenow", String(Math.round(v * 100)));

    // 音质：胶囊文案 + 浮窗条目（档位表异步到，签名变了才重建）
    const ql = ctx.qualityLabel();
    if (ql !== sigQLabel) { sigQLabel = ql; qBtn.textContent = ql; }
    const tiers = ctx.qualityTiers();
    const curQ = ctx.quality();
    const qKey = tiers.map((t2) => t2.id + (t2.locked ? "!" : "")).join(",") + "|" + curQ;
    if (qKey !== sigQTiers) {
      sigQTiers = qKey;
      qPop.innerHTML = "";
      const item = (id: string, label: string, note = "") => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "fs-qi" + (curQ === id ? " sel" : "");
        b.innerHTML = `<span>${esc(label)}</span>${note ? `<em>${esc(note)}</em>` : ""}`;
        b.onclick = () => { ctx.switchQuality(id); closePops(); };
        qPop.append(b);
      };
      item("auto", "自动", "最高可播");
      if (!tiers.length) {
        const e2 = document.createElement("div");
        e2.className = "fs-qempty";
        e2.textContent = "档位读取中…";
        qPop.append(e2);
      } else for (const t2 of tiers) item(t2.id, t2.label, t2.locked ? "🔒 自动回退" : "");
    }

    // 收藏：宿主本地红心是唯一真相源，逐次 notify 现读（loveVersion 会推 notify）
    const loved = !!cur && ctx.loved(cur.mid);
    const lk = `${cur?.mid ?? ""}|${loved ? 1 : 0}`;
    if (lk !== sigLove) {
      sigLove = lk;
      loveBtn.classList.toggle("on", loved);
      loveBtn.innerHTML = loved ? ICON.heartFill : ICON.heart;
      loveBtn.title = loved ? "取消收藏" : "收藏这首歌";
    }

    // 翻译开关：宿主 ⋮ 菜单改了，这里即时跟上（更多选项里的那份也得同步）
    const tr = ctx.showTrans();
    if (mTrans.checked !== tr) mTrans.checked = tr;
    lyricsBox.classList.toggle("no-trans", !tr);
  };

  /** 每帧层：只碰进度条与两个时间读数。签名比对让稳态几乎无写入。 */
  const paintTransport = () => {
    const t = ctx.time(), d = ctx.duration();
    if (d <= 0) {
      if (sigProgress !== "0") {
        sigProgress = "0";
        track.style.setProperty("--fs-pf", "0");
        if (curT.textContent !== "0:00") curT.textContent = "0:00";
        if (durT.textContent !== "0:00") durT.textContent = "0:00";
      }
      return;
    }
    const frac = clamp01(t / d);
    if (!track.classList.contains("scrub")) {
      track.style.setProperty("--fs-pf", frac.toFixed(4));
      const ts = fmtDur(t);
      if (curT.textContent !== ts) curT.textContent = ts;
      const pct = Math.round(frac * 100);
      if (sigProgress !== String(pct)) { sigProgress = String(pct); track.setAttribute("aria-valuenow", String(pct)); }
    }
    const ds = fmtDur(d);
    if (durT.textContent !== ds) durT.textContent = ds;
  };

  // —— rAF 时钟：进度条与歌词高亮要跟手（notify 4Hz 上去是台阶）。
  //    收起即自停；重新展开靠 onNotify 唤醒（自停的 rAF 没人替你重启）。
  let raf = 0, running = false;
  const tick = () => {
    raf = 0;
    if (!ctx.expanded() || !host.isConnected) { running = false; return; }
    // 当前句：逐帧只做「行号比对」，变了才重填 DOM（单行版式没有滚动/高亮切换）。
    // +0.2s 与宿主行级高亮同一处时间补偿。
    if (karaOn) {
      // 逐字：行号比对之外还要**每帧**刷词进度（这正是逐字的意义所在）
      const ms = (ctx.time() + 0.2) * 1000;
      let idx = -1;
      for (let i = 0; i < karaLines.length; i++) { if (karaLines[i].startTime <= ms) idx = i; else break; }
      if (idx !== lastIdx) { lastIdx = idx; paintKaraLine(idx); }
      if (idx >= 0) paintKaraWords(karaLines[idx], ms);
    } else if (lyricLines.length) {
      const t = ctx.time() + 0.2;
      let idx = -1;
      for (let i = 0; i < lyricLines.length; i++) { if (lyricLines[i].t <= t) idx = i; else break; }
      if (idx !== lastIdx) { lastIdx = idx; paintCurrentLine(idx); }
    } else if (lastIdx !== -1) {
      lastIdx = -1;
      paintCurrentLine(-1);
    }
    paintTransport();
    raf = window.requestAnimationFrame(tick);
  };
  const syncRunning = () => {
    if (ctx.expanded() && !running && host.isConnected) { running = true; raf = window.requestAnimationFrame(tick); }
  };

  const offNotify = ctx.onNotify(() => { paintMeta(); syncRunning(); });
  paintMeta();
  paintTransport();
  syncRunning();

  return () => {
    offNotify();
    window.clearTimeout(animTimer);
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    running = false;
    ro.disconnect();
    closePops();
    window.removeEventListener("pointermove", onScrubMove);
    window.removeEventListener("pointerup", onScrubUp);
    window.removeEventListener("pointercancel", onScrubUp);
    window.removeEventListener("pointermove", onVolMove);
    window.removeEventListener("pointerup", onVolUp);
    window.removeEventListener("pointercancel", onVolUp);
    host.innerHTML = "";
  };
}

export default definePlugin({
  id: "flowscape",
  name: "Flowscape 流境",
  version: "1.2.0",
  author: "Team Quaver",
  kind: "third-party",
  description: "把正在播放页变成专辑流：中间大封面、左右相邻封面点切歌，下方歌名/歌手/专辑/当前这一句歌词，底部自绘进度条、音量与音质",
  setup(ctx) {
    ensureStyle();
    store = ctx.storage;

    // 总开关落在 enabled()：宿主每次 notify 重读，关掉即刻卸载接管、回到默认正在播放页
    const on = () => ctx.storage.get("flow") !== "off";
    ctx.registerNowPlayingView({ id: "flowscape", enabled: on, render: renderFlowscape });

    ctx.registerSettingsSection({
      id: "flowscape-main",
      title: "流境模式",
      render(box) {
        box.innerHTML = `
          <div class="set-label">接管正在播放页 <span class="set-note-inline">开启后在正在播放页里隐藏原播放条，控制与进度改由流境自绘</span></div>
          <div class="opt-cards">
            <button class="opt-card" data-opt="on" type="button">开启</button>
            <button class="opt-card" data-opt="off" type="button">关闭</button>
          </div>
          <p class="muted set-hint">流境接管整个正在播放页：封面在中间，上一首在左、下一首在右（点侧封面直接跳到那一首），下方是歌名、歌手、专辑与当前这一句歌词（点歌词跳播）。底部自绘进度条（可拖拽）、音量与音质；左上角是「收起」与「更多选项」—— 接管时原播放条会被隐藏，不从这里收起就只能按 ESC 了。停用本插件或关掉上面的开关，即回到默认正在播放页。</p>`;
        const cards = [...box.querySelectorAll<HTMLButtonElement>("[data-opt]")];
        const sync = () => cards.forEach((b) => b.classList.toggle("sel", (b.dataset.opt === "on") === on()));
        cards.forEach((b) => { b.onclick = () => { ctx.storage.set("flow", b.dataset.opt === "off" ? "off" : "on"); sync(); }; });
        sync();
      },
    });

    return () => {
      store = null; // 停用：断掉 storage 引用，避免旧闭包往已卸载插件的配置里写
      document.querySelector("style[data-sparkle-css='flowscape']")?.remove();
    };
  },
});
