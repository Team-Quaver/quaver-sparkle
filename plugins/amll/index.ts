// Quaver Sparkle — 官方插件：Apple Music-like Lyrics（AMLL）
//
// 用 @applemusic-like-lyrics/lyric 解析逐字歌词（QQ 音乐 QRC——含上游 qrc=1 返回的
// XML 信封、纯文本 QRC、TTML），用 @applemusic-like-lyrics/core 的 DomLyricPlayer
// 渲染正在播放页的逐字歌词。停用插件 = 宿主移除 provider，正在播放页自动回退行级歌词。
// 上游 roma 字段是音译（romaji/拼音，词级 QRC 与行级 LRC 都可能）：归一成行级 romanLyric，
// 与翻译共用歌词**下方**的子行（Apple Music 的排版没有「词上方 romaji」）。两路各存一份，
// 上屏的那一路由宿主「翻译选项」决定：翻译档优先翻译、音译档优先音译，本行缺则回落另一路。
//
// 上游 qrc=1 的 lyric 字段是 3DES+zlib 解密后的 QRC XML：
//   <?xml …><QrcInfos>…<Lyric_1 Lyrics="[st,dur]词(st,dur)…&#10;…"/>…</QrcInfos>
// AMLL 的 parseQrc 只认纯文本 QRC（行首 [st,dur]），所以 XML 信封要先抽 Lyrics 属性
// 并解码 HTML 实体；QRC 本身不带翻译，翻译（普通 LRC）按行起始时间就近对齐。
import { parseLrc, parseQrc, parseTTML, type LyricLine as AmlLyricLine } from "@applemusic-like-lyrics/lyric";
import { LyricPlayer, type LyricLine as CoreLyricLine } from "@applemusic-like-lyrics/core";
import "@applemusic-like-lyrics/core/style.css";
import { definePlugin, type SparkleKaraokeLine, type SparkleKaraokeRenderCtx } from "@quaver/sparkle";

// —— 解析 ——

const NAMED_ENTITIES: Record<string, string> = { quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };

/** XML 属性值实体解码（&amp; 最后替换，避免二次解码） */
function decodeEntities(s: string): string {
  return s
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_m, body: string) => {
      if (body.startsWith("#")) {
        const n = /^#x/i.test(body) ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        return Number.isFinite(n) && n >= 0 ? String.fromCodePoint(n) : "";
      }
      return NAMED_ENTITIES[body.toLowerCase()] ?? "";
    })
    .replaceAll("&amp;", "&");
}

function tryParseQrc(src: string): AmlLyricLine[] | null {
  try {
    const lines = parseQrc(src);
    return lines.length ? lines : null;
  } catch {
    return null;
  }
}

/** 视为「有逐字时间轴」：至少一行存在时长非零的词（纯行级时间轴的假 QRC 不算） */
const hasWordTiming = (lines: AmlLyricLine[]) =>
  lines.some((l) => l.words.some((w) => w.endTime > w.startTime));

/** 辅助源（翻译 / 音译两路）：可能是普通 LRC，音译还可能是词级 QRC 或上游 qrc=1 的
 *  XML 信封。取「整行文本」用不上词级时间轴，但必须先认得这些形状 —— 否则 parseLrc
 *  读不懂 QRC/XML，音译档就永远是空的。 */
const QRC_WORD_LINE = /^\[\d+,\d+\]/m; // 纯文本 QRC 的行首：[起始,时长]

/** 逐字形态的辅助源（XML 信封 / 纯文本 QRC）；普通 LRC 返回 null，交回 parseLrc */
function parseQrcAuxSource(src: string): AmlLyricLine[] | null {
  const c = (src ?? "").trim();
  if (!c) return null;
  if (/<QrcInfos|<LyricInfo/i.test(c)) {
    const payload = [...c.matchAll(/(?:Lyrics|LyricContent)\s*=\s*"([^"]*)"/g)]
      .map((m) => decodeEntities(m[1]))
      .join("\n");
    return payload.trim() ? tryParseQrc(payload) : null;
  }
  return QRC_WORD_LINE.test(c) ? tryParseQrc(c) : null;
}

/** 辅助源 → 行列表：先按逐字解，解不出来退回行级 LRC；空源给空表 */
function auxLines(src: string): AmlLyricLine[] {
  const c = (src ?? "").trim();
  if (!c) return [];
  const q = parseQrcAuxSource(c);
  if (q?.length) return q;
  try { return parseLrc(c); } catch { return []; }
}

/** 按行起始时间就近取辅助文本（1.5s 容忍，同宿主 src/lyric.ts 的口径） */
function nearestAuxText(aux: AmlLyricLine[], line: AmlLyricLine): string {
  let best: AmlLyricLine | undefined;
  let bd = 1500;
  for (const t of aux) {
    const d = Math.abs(t.startTime - line.startTime);
    if (d < bd) { bd = d; best = t; }
  }
  return best ? best.words.map((w) => w.word).join("").trim() : "";
}

/** 翻译与音译都挂成**行级**辅助文本（translatedLyric / romanLyric），显示哪一路交给档位。
 *  音译不挂词上 Ruby：romaji/拼音是「整行换一套读音」，Apple Music 的排版里它和翻译共用
 *  歌词下方那一行子行（AMLL 的 lyricSubLine）；词上方的 Ruby 是日文振假名那种逐词注音，
 *  语义不同，还要和逐字扫色抢版面。 */
function alignAux(lines: AmlLyricLine[], translation: string, romanization: string) {
  const tr = auxLines(translation);
  const ro = auxLines(romanization);
  if (!tr.length && !ro.length) return;
  for (const l of lines) {
    if (tr.length) { const t = nearestAuxText(tr, l); if (t) l.translatedLyric = t; }
    if (ro.length) { const r = nearestAuxText(ro, l); if (r) l.romanLyric = r; }
  }
}

/** 原始歌词 → 逐字行；认不出的格式 / 无词级时间轴返回 null（宿主回退行级 LRC） */
function parseKaraoke(content: string, translation: string, romanization = ""): SparkleKaraokeLine[] | null {
  const c = (content ?? "").trim();
  if (!c) return null;
  let lines: AmlLyricLine[] | null = null;
  if (/<QrcInfos|<LyricInfo/i.test(c)) {
    // QRC XML 信封：抽出全部歌词正文属性（实测为 LyricContent="…"，旧格式为 Lyrics="…"，
    // 属性内以原文换行/&#10; 分行），实体解码后拼回纯文本 QRC（[ti:]/[offset:0] 等
    // 元数据行不匹配词级行首格式，parseQrc 会自然过滤）
    const payload = [...c.matchAll(/(?:Lyrics|LyricContent)\s*=\s*"([^"]*)"/g)]
      .map((m) => decodeEntities(m[1]))
      .join("\n");
    if (payload.trim()) lines = tryParseQrc(payload);
  } else if (/<tt[\s>]/i.test(c)) {
    try {
      const r = parseTTML(c);
      lines = r?.lines?.length ? r.lines : null;
    } catch {
      lines = null;
    }
  } else {
    lines = tryParseQrc(c);
  }
  if (!lines || !hasWordTiming(lines)) return null;
  alignAux(lines, translation, romanization);
  return lines;
}

// —— 渲染 ——

/** 辅助行取哪一路：翻译档优先翻译、音译档优先音译，本行缺哪一路就回落到另一路
 *  （off = 不显示）。与宿主行级视图 src/lyric.ts 的 pickAux 同规则 —— 插件 import 不到宿主，
 *  两边各自实现，改规则必须一起改。 */
type AuxMode = "off" | "translation" | "romanization";

function pickAuxLine(l: SparkleKaraokeLine, mode: AuxMode): string {
  if (mode === "off") return "";
  const prefer = (mode === "romanization" ? l.romanLyric : l.translatedLyric) ?? "";
  const fallback = (mode === "romanization" ? l.translatedLyric : l.romanLyric) ?? "";
  return prefer.trim() || fallback.trim();
}

/** SDK 逐字行 → core 渲染行（显式补齐 core 必填字段）。
 *  辅助行只占**一格**：挑好的一路写进第一子行 translatedLyric，romanLyric 恒空。
 *  AMLL 两个子行同样式、空则塌缩，固定用一格 → 切档时辅助行不上下跳，也不会两路同时上屏。 */
function toCoreLines(lines: SparkleKaraokeLine[], mode: AuxMode): CoreLyricLine[] {
  return lines.map((l) => ({
    words: l.words.map((w) => ({ word: w.word, startTime: w.startTime, endTime: w.endTime, romanWord: "" })),
    startTime: l.startTime,
    endTime: l.endTime,
    translatedLyric: pickAuxLine(l, mode),
    romanLyric: "",
    isBG: !!l.isBG,
    isDuet: !!l.isDuet,
  }));
}

/** 接管逐字歌词容器：DomLyricPlayer + 自驱 rAF 时钟。
 *  宿主 notify 只有 4Hz，逐字扫色要逐帧时间；播放态/翻译开关/展开收起每帧轮询
 *  ctx 闭包（读到的永远是当前态），收起时停表冻结、展开即恢复。 */
function renderAmll(host: HTMLElement, lines: SparkleKaraokeLine[], ctx: SparkleKaraokeRenderCtx): () => void {
  const player = new LyricPlayer();
  const el = player.getElement();
  el.style.position = "absolute";
  el.style.inset = "0";
  el.style.fontFamily = "inherit";
  host.append(el);
  player.setEnableBlur(true);   // 非当前行距离模糊，对齐行级视图的模糊语言
  player.setEnableScale(true);

  let shownMode = ctx.lyricAux();
  player.setLyricLines(toCoreLines(lines, shownMode), ctx.time());

  // —— 时钟去抖 ——
  // 引擎传输的 position 是外推时钟（~4Hz 快照重同步），重同步瞬间可能回跳几十毫秒；
  // AMLL 对任何倒退都无条件按跳转处理（间奏点/滚动全重置）→ 小幅倒退钳平为原值，
  // 只有超过阈值（真·回退 seek）才放行倒退。
  let lastFedMs = -1;
  const feedTime = (): number => {
    const raw = ctx.time();
    if (lastFedMs >= 0 && raw < lastFedMs && raw > lastFedMs - 250) return lastFedMs;
    lastFedMs = raw;
    return raw;
  };
  // 播放态只在变化时同步（每帧反复 pause/resume 会持续扰动 AMLL 的跳转推算）
  let lastPaused: boolean | null = null;
  const applyPlayState = () => {
    const p = ctx.paused();
    if (p === lastPaused) return;
    lastPaused = p;
    if (p) player.pause(); else player.resume();
  };
  applyPlayState();

  const ac = new AbortController();
  player.addEventListener("line-click", (e: Event) => {
    const ce = e as MouseEvent & { line: { getLine(): { startTime: number } } | undefined };
    const ms = ce.line?.getLine()?.startTime ?? 0;
    if (Number.isFinite(ms)) ctx.seek(Math.max(0, ms));
  }, { signal: ac.signal });

  let raf = 0;
  let lastFrame = 0;
  let running = false;
  function tick(now: number) {
    raf = 0;
    if (!ctx.expanded()) { running = false; lastFrame = 0; return; } // 收起：冻结渲染循环
    const dt = lastFrame ? Math.min(now - lastFrame, 50) : 16.7;    // 帧增量钳制（标签页切回等）
    lastFrame = now;
    const wantMode = ctx.lyricAux();
    if (wantMode !== shownMode) {                                    // 翻译/音译选项变化：重建行表
      shownMode = wantMode;
      player.setLyricLines(toCoreLines(lines, shownMode), feedTime());
    }
    applyPlayState();
    player.setCurrentTime(feedTime());
    player.update(dt);
    raf = window.requestAnimationFrame(tick);
  }
  function syncRunning() {
    // 收起时 tick 自停；重新展开必须由宿主 notify 唤醒（否则 AMLL 永久冻结：
    // 时间不跟、歌词不刷，seek 后滚动状态错乱）
    if (ctx.expanded() && !running) { running = true; lastFrame = 0; raf = window.requestAnimationFrame(tick); }
  }
  syncRunning();
  const offNotify = ctx.onNotify(syncRunning);

  return () => {
    offNotify();
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    ac.abort();
    player.dispose();
    el.remove();
  };
}

export default definePlugin({
  id: "amll",
  name: "Apple Music-like Lyrics",
  version: "1.2.0",
  author: "quaver",
  description: "用 AMLL（applemusic-like-lyrics）渲染逐字歌词（QRC/TTML，翻译/音译共用行级子行）；停用后回到行级歌词",
  kind: "official",
  setup(ctx) {
    ctx.log.info("loaded");
    // 逐字歌词总开关：插件设置区（花火插件面板）里的卡片选项，持久化在插件 storage；
    // 宿主每次 notify 重读 enabled()，切换即时生效（最迟下一个播放事件/4Hz）
    const enabled = () => ctx.storage.get("wordbyword") !== "off";
    ctx.registerKaraokeProvider({
      parse: parseKaraoke,
      render: renderAmll,
      enabled,
    });
    ctx.registerSettingsSection({
      id: "amll-wordbyword",
      title: "逐字歌词",
      render(box) {
        box.innerHTML = `
          <div class="set-label">逐字歌词 <span class="set-note-inline">仅对带逐字时间轴（QRC/TTML）的歌曲生效，其余歌曲不受影响</span></div>
          <div class="opt-cards">
            <button class="opt-card" data-opt="on" type="button">开启</button>
            <button class="opt-card" data-opt="off" type="button">关闭</button>
          </div>
          <p class="muted set-hint">开启后正在播放页以卡拉OK扫色逐字点亮歌词（AMLL 渲染），高亮色跟随封面染色（掺白提亮保证可读）；关闭或停用本插件即回到行级歌词。</p>`;
        const cards = [...box.querySelectorAll<HTMLButtonElement>("[data-opt]")];
        const sync = () => cards.forEach((b) => b.classList.toggle("sel", (b.dataset.opt === "on") === enabled()));
        cards.forEach((b) => {
          b.onclick = () => {
            ctx.storage.set("wordbyword", b.dataset.opt === "off" ? "off" : "on");
            sync();
          };
        });
        sync();
      },
    });
  },
});
