// NowPlaying 推送 — Marketplace 收录插件
//
// 对齐 SPlayer 的 now-playing-webhook：曲目变化时 POST 当前播放信息，支持
// Discord Webhook 与通用 JSON，并做同曲去重。Quaver 的 trackChange 在 SDK 里
// 表现为 player.on 通知 + current 快照变化，所以这里比较曲目 key 而不是监听同名事件。
import {
  definePlugin,
  type SparkleContext,
  type SparkleSongSnapshot,
} from "../../sdk/index";

type WebhookFormat = "discord" | "json";

interface WebhookSettings {
  webhook: string;
  format: WebhookFormat;
  template: string;
}

interface TrackPayload {
  title: string;
  artists: string;
  album: string;
  cover: string;
  duration: number;
  mid: string;
  source: "online" | "local" | "nas";
}

const DEFAULT_TEMPLATE = "🎵 正在收听：{title} - {artists}";
const REQUEST_TIMEOUT_MS = 15_000;

const SAMPLE_TRACK: TrackPayload = {
  title: "NowPlaying 推送测试",
  artists: "Team Quaver",
  album: "Quaver Music",
  cover: "",
  duration: 0,
  mid: "",
  source: "online",
};

const clean = (value: unknown): string => String(value ?? "").trim();

const clip = (value: string, max: number): string =>
  value.length > max ? value.slice(0, Math.max(0, max - 1)) + "…" : value;

const artistsOf = (song: SparkleSongSnapshot): string =>
  (song.singer ?? [])
    .map((singer) => clean(singer?.name))
    .filter(Boolean)
    .join(" / ");

/** 只接受外部服务真的能取到的绝对 http(s) 封面。 */
const httpCover = (cover: unknown): string => {
  const value = clean(cover);
  return /^https?:\/\//i.test(value) ? value : "";
};

/** 与宿主 lib/api:coverUrl 同口径；本地曲优先公开本地封面，其次回落刮削命中的 CDN。 */
const coverOf = (song: SparkleSongSnapshot): string => {
  const local = httpCover(song.localCover);
  if (local) return local;
  const pmid = clean(song.album?.pmid);
  const base = pmid ? pmid.split("_")[0] : clean(song.album?.mid);
  return base
    ? `https://y.gtimg.cn/music/photo_new/T002R500x500M000${base}.jpg`
    : "";
};

const trackOf = (song: SparkleSongSnapshot): TrackPayload => ({
  title: clean(song.name) || "未知歌曲",
  artists: artistsOf(song) || "未知歌手",
  album: clean(song.album?.name),
  cover: coverOf(song),
  duration: Math.max(0, Math.round(Number(song.interval) || 0)),
  mid: clean(song.mid),
  source: song.src === "local" || song.src === "nas" ? song.src : "online",
});

const trackKey = (song: SparkleSongSnapshot): string => {
  const track = trackOf(song);
  return `${track.source}|${track.mid}|${track.title}|${track.artists}|${track.album}`;
};

const renderTemplate = (template: string, track: TrackPayload): string => {
  const values: Record<string, string> = {
    title: track.title,
    artists: track.artists,
    album: track.album,
  };
  return String(template || "").replace(
    /\{(title|artists|album)\}/g,
    (_, key: string) => values[key] ?? "",
  );
};

const readSettings = (ctx: SparkleContext): WebhookSettings => ({
  webhook: clean(ctx.storage.get("webhook")),
  format: ctx.storage.get("format") === "json" ? "json" : "discord",
  template: ctx.storage.get("template") ?? DEFAULT_TEMPLATE,
});

const webhookUrl = (value: string): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

const bodyFor = (
  format: WebhookFormat,
  template: string,
  track: TrackPayload,
): Record<string, unknown> => {
  const text = clip(renderTemplate(template, track), 2_000);
  if (format === "discord") {
    const embed: Record<string, unknown> = {
      title: clip(track.title, 256),
      description: clip(track.artists, 4_096),
    };
    if (track.album) embed.footer = { text: clip(track.album, 2_048) };
    if (track.cover) embed.thumbnail = { url: track.cover };
    return {
      content: text,
      embeds: [embed],
      // 曲名/歌手属于外部输入，别让 Webhook 里的 @everyone 借插件拿到 mention 权限。
      allowed_mentions: { parse: [] },
    };
  }
  return {
    text,
    title: track.title,
    artists: track.artists,
    album: track.album,
    cover: track.cover,
    duration: track.duration,
    mid: track.mid,
    source: track.source,
  };
};

const responseDetail = async (res: Response): Promise<string> => {
  try {
    const text = clean(await res.text());
    return text ? `：${clip(text, 180)}` : "";
  } catch {
    return "";
  }
};

const postWebhook = async (
  settings: WebhookSettings,
  track: TrackPayload,
): Promise<void> => {
  const url = webhookUrl(settings.webhook);
  if (!url) throw new Error("Webhook 地址无效，请填写完整的 http(s) URL");

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyFor(settings.format, settings.template, track)),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("Webhook 请求超时");
    }
    throw new Error(
      "Webhook 请求失败（请确认地址可达，且目标服务允许跨域 POST）",
    );
  }

  if (!res.ok) {
    throw new Error(`Webhook 返回 HTTP ${res.status}${await responseDetail(res)}`);
  }
};

const pushTrack = async (
  ctx: SparkleContext,
  track: TrackPayload,
): Promise<void> => {
  try {
    await postWebhook(readSettings(ctx), track);
    ctx.log.info(`Now Playing 已推送：${track.title}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.log.warn(`Now Playing 推送失败：${message}`);
  }
};

const mountSettings = (ctx: SparkleContext): void => {
  ctx.registerSettingsSection({
    id: "nowplaying-push-settings",
    title: "NowPlaying 推送",
    render(box) {
      box.innerHTML = `
        <div class="set-label">Webhook 地址 <span class="set-note-inline">Discord Webhook 或通用 JSON 接收端</span></div>
        <div class="set-row">
          <div class="set-row__ctrl" style="flex:1">
            <input data-field="webhook" type="url" inputmode="url" autocomplete="off" spellcheck="false"
              placeholder="https://discord.com/api/webhooks/..." style="flex:1;min-width:0;width:100%" />
          </div>
        </div>
        <p class="muted set-hint">目标服务需允许来自 Quaver 的跨域 POST；留空时不会发送。</p>

        <div class="set-label" style="margin-top:14px">推送格式</div>
        <div class="set-row">
          <div class="set-row__ctrl" style="flex:1">
            <select data-field="format" style="min-width:180px">
              <option value="discord">Discord Webhook</option>
              <option value="json">通用 JSON</option>
            </select>
          </div>
        </div>

        <div class="set-label" style="margin-top:14px">消息模板</div>
        <div class="set-row">
          <div class="set-row__ctrl" style="flex:1">
            <input data-field="template" type="text" autocomplete="off"
              style="flex:1;min-width:0;width:100%" />
          </div>
        </div>
        <p class="muted set-hint">占位符：<code>{title}</code> <code>{artists}</code> <code>{album}</code></p>

        <div class="set-row" style="margin-top:14px;align-items:center">
          <button class="ghost-btn" data-act="test" type="button">发送测试</button>
          <span class="muted set-hint" data-role="status" role="status" aria-live="polite"></span>
        </div>
        <p class="muted set-hint">测试会发送当前正在播放的曲目；没有播放时发送一条样例。切歌推送按曲目去重，每首只发一次。</p>`;

      const webhook = box.querySelector<HTMLInputElement>('[data-field="webhook"]')!;
      const format = box.querySelector<HTMLSelectElement>('[data-field="format"]')!;
      const template = box.querySelector<HTMLInputElement>('[data-field="template"]')!;
      const test = box.querySelector<HTMLButtonElement>('[data-act="test"]')!;
      const status = box.querySelector<HTMLElement>('[data-role="status"]')!;

      const settings = readSettings(ctx);
      webhook.value = settings.webhook;
      format.value = settings.format;
      template.value = settings.template;

      const setStatus = (message: string, kind?: "ok" | "err") => {
        status.textContent = message;
        status.style.color = kind === "err" ? "var(--danger, #e5484d)" : "";
      };

      const save = () => {
        ctx.storage.set("webhook", webhook.value.trim());
        ctx.storage.set("format", format.value === "json" ? "json" : "discord");
        ctx.storage.set("template", template.value);
        setStatus("设置已保存");
      };

      webhook.addEventListener("input", save);
      template.addEventListener("input", save);
      format.addEventListener("change", save);

      test.addEventListener("click", async () => {
        if (test.disabled) return;
        test.disabled = true;
        test.textContent = "发送中…";
        setStatus("正在发送测试…");
        const current = ctx.player.current;
        try {
          await postWebhook(readSettings(ctx), current ? trackOf(current) : SAMPLE_TRACK);
          setStatus("测试推送已发送", "ok");
          ctx.toast("NowPlaying 测试推送已发送", "ok");
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          setStatus(message, "err");
          ctx.log.warn(`Now Playing 测试推送失败：${message}`);
        } finally {
          test.disabled = false;
          test.textContent = "发送测试";
        }
      });
    },
  });
};

export default definePlugin({
  id: "nowplaying-push",
  name: "NowPlaying 推送",
  version: "1.0.0",
  kind: "third-party",
  author: "Team Quaver",
  description: "切歌时把当前播放信息推送到 Discord 或通用 JSON Webhook",
  setup(ctx) {
    mountSettings(ctx);

    let lastKey = "";

    const checkTrack = () => {
      const song = ctx.player.current;
      if (!song) {
        lastKey = "";
        return;
      }
      if (!readSettings(ctx).webhook) return;
      const key = trackKey(song);
      if (key === lastKey) return;
      lastKey = key;
      void pushTrack(ctx, trackOf(song));
    };

    checkTrack();
    return ctx.player.on(checkTrack);
  },
});
