// Quaver Sparkle — 官方插件：Apple Music-like Lyrics（AMLL）
//
// **正在播放页的唯一歌词渲染器**：逐字（QQ 音乐 QRC——含上游 qrc=1 返回的 XML 信封、
// 纯文本 QRC、TTML）与行级（普通 LRC）都交给 @applemusic-like-lyrics/core 的
// DomLyricPlayer 渲染；LRC 没有词级时间轴，按「整行一个音节」喂进去，AMLL 用它自己的
// 行级扫色/滚动/弹簧排版。本插件是内置且**不可停用**的（宿主强启 + 设置页开关锁死），
// 因为宿主已不再自带行级歌词的完整渲染——摘掉它，LRC 也没有渲染器了。
//
// 上游 roma 字段是音译（romaji/拼音，词级 QRC 与行级 LRC 都可能）：归一成行级 romanLyric，
// 与翻译共用歌词**下方**的子行（Apple Music 的排版没有「词上方 romaji」）。两路各存一份，
// 上屏的那一路由宿主「翻译选项」决定：翻译档优先翻译、音译档优先音译，本行缺则回落另一路。
// 无设置项：逐字扫色恒开，翻译/音译档位归宿主 ⋮ 菜单，本插件不接受任何配置。
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

/** 普通 LRC（[mm:ss.xx] 行级）。AMLL 的 parseLrc 给每行一个覆盖整行的单音节，
 *  词级时间轴为空 —— 正是行级渲染要的形状。 */
function tryParseLrc(src: string): AmlLyricLine[] | null {
  try {
    const lines = parseLrc(src);
    return lines.length ? lines : null;
  } catch {
    return null;
  }
}

/** 视为「有逐字时间轴」：至少一行存在时长非零的词（纯行级时间轴的假 QRC 不算） */
const hasWordTiming = (lines: AmlLyricLine[]) =>
  lines.some((l) => l.words.some((w) => w.endTime > w.startTime));

/** 行级收尾时长：末行没有「下一行」可用，给一段自然时长的整行扫色收尾。
 *  parseLrc 给末行的是 MAX 时间戳（≈16.6h），照单全收会让扫色慢到几乎静止。 */
const LINE_TAIL_MS = 4000;
/** 单行整行扫色的时长上限：长间奏里一行唱完后停在亮态，别拖成慢镜头 */
const LINE_MAX_MS = 12000;

/** 把任意行列表整形为**行级**（每行一个覆盖整行的音节）：普通 LRC，或没有词级时间轴
 *  的伪 QRC 都走这里。行结束 = 下一行开始（末行给固定收尾），再对超长行设上限。 */
function toLineLevel(lines: AmlLyricLine[]): SparkleKaraokeLine[] {
  const sorted = [...lines].sort((a, b) => a.startTime - b.startTime);
  return sorted.map((l, i) => {
    const text = l.words.map((w) => w.word).join("");
    const next = sorted[i + 1]?.startTime;
    let end = next ?? l.startTime + LINE_TAIL_MS;
    if (end - l.startTime > LINE_MAX_MS) end = l.startTime + LINE_MAX_MS;
    end = Math.max(end, l.startTime + 1);
    return {
      words: [{ word: text, startTime: l.startTime, endTime: end }],
      startTime: l.startTime,
      endTime: end,
      isBG: l.isBG,
      isDuet: l.isDuet,
    };
  });
}

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
function nearestAuxText(aux: AmlLyricLine[], line: { startTime: number }): string {
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
function alignAux(
  lines: Array<{ startTime: number; translatedLyric?: string; romanLyric?: string }>,
  translation: string,
  romanization: string,
) {
  const tr = auxLines(translation);
  const ro = auxLines(romanization);
  if (!tr.length && !ro.length) return;
  for (const l of lines) {
    if (tr.length) { const t = nearestAuxText(tr, l); if (t) l.translatedLyric = t; }
    if (ro.length) { const r = nearestAuxText(ro, l); if (r) l.romanLyric = r; }
  }
}

/** 原始歌词 → AMLL 行；认不出的格式返回 null。
 *
 *  逐字形态（XML 信封 / TTML / 纯文本 QRC）**有词级时间轴**时直接返回逐字行；
 *  否则按行级处理：普通 LRC（本体就是 [mm:ss.xx]）整形成单音节覆盖整行，交给 AMLL
 *  的行级渲染；没有词级时间轴的伪 QRC 同样折成行级，行为与老宿主行级视图一致。 */
function parseKaraoke(content: string, translation: string, romanization = ""): SparkleKaraokeLine[] | null {
  const c = (content ?? "").trim();
  if (!c) return null;
  // ① 逐字候选：XML 信封 / TTML / 纯文本 QRC
  let word: AmlLyricLine[] | null = null;
  if (/<QrcInfos|<LyricInfo/i.test(c)) {
    // QRC XML 信封：抽出全部歌词正文属性（实测为 LyricContent="…"，旧格式为 Lyrics="…"，
    // 属性内以原文换行/&#10; 分行），实体解码后拼回纯文本 QRC（[ti:]/[offset:0] 等
    // 元数据行不匹配词级行首格式，parseQrc 会自然过滤）
    const payload = [...c.matchAll(/(?:Lyrics|LyricContent)\s*=\s*"([^"]*)"/g)]
      .map((m) => decodeEntities(m[1]))
      .join("\n");
    if (payload.trim()) word = tryParseQrc(payload);
  } else if (/<tt[\s>]/i.test(c)) {
    try {
      const r = parseTTML(c);
      word = r?.lines?.length ? r.lines : null;
    } catch {
      word = null;
    }
  } else {
    word = tryParseQrc(c);
  }
  if (word?.length && hasWordTiming(word)) {
    alignAux(word, translation, romanization);
    return word;
  }
  // ② 行级：优先普通 LRC，其次是没有词级时间轴的伪 QRC
  const lrc = tryParseLrc(c);
  const lineLevel = toLineLevel(lrc?.length ? lrc : (word ?? []));
  if (!lineLevel.length) return null;
  alignAux(lineLevel, translation, romanization);
  return lineLevel;
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

/** SDK 行 → core 渲染行（显式补齐 core 必填字段）。
 *  辅助行只占**一格**：挑好的一路写进第一子行 translatedLyric，romanLyric 恒空。
 *  AMLL 两个子行同样式、空则塌缩，固定用一格 → 切档时辅助行不上下跳，也不会两路同时上屏。
 *  逐字行原样喂进去（QRC/TTML 的词级时间轴驱动逐词扫色；LRC 本就是单音节覆盖整行）。 */
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

/** 接管歌词容器：DomLyricPlayer + 自驱 rAF 时钟。
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
  version: "1.3.0",
  author: "quaver",
  description: "正在播放页的歌词渲染器（AMLL）：逐字（QRC/TTML）与行级（LRC）都交给它，翻译/音译共用行级子行；内置且不可停用",
  kind: "official",
  setup(ctx) {
    ctx.log.info("loaded");
    // 只注册歌词提供器，不带任何设置项：逐字扫色恒开（逐字歌曲逐词点亮、LRC 整行点亮），
    // 翻译/音译档位归宿主的 ⋮ 菜单。不注册 enabled() —— AMLL 是唯一歌词渲染器，宿主摘不掉。
    ctx.registerKaraokeProvider({ parse: parseKaraoke, render: renderAmll });
  },
});
