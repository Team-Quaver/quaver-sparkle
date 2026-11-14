// Folia 歌词动效 — Marketplace plugin entry.
// AGPL-3.0: the runtime is a port of Folia Major by chthollyphile.
import { definePlugin, type SparkleContext } from "../../sdk/index";
import { mountFolia } from "./runtime.js";
import { FOLIA_BACKGROUNDS, FOLIA_MODES, isBackground, isMode, labelOf } from "./runtime/catalog.js";

const ID = "folia-visualizer";
const ENABLED = "enabled";
const STYLE = "style";
const BACKGROUND = "background";

const currentStyle = (ctx: SparkleContext) => {
  const saved = ctx.storage.get(STYLE) ?? "";
  return isMode(saved) ? saved : "classic";
};

const currentBackground = (ctx: SparkleContext) => {
  const saved = ctx.storage.get(BACKGROUND) ?? "";
  return isBackground(saved) ? saved : "latent";
};

function settingsSection(ctx: SparkleContext) {
  const box = document.createElement("div");
  const intro = document.createElement("p");
  intro.className = "muted";
  intro.style.cssText = "margin:4px 0 12px;font-size:.88em;line-height:1.6";
  intro.textContent = "播放页交给 Folia 的歌词动效：17 种样式、6 种背景。";
  box.append(intro);

  const status = document.createElement("p");
  status.style.cssText = "margin:0 0 10px;font-size:.9em";
  const syncStatus = () => {
    status.textContent = ctx.storage.get(ENABLED) === "0" ? "当前：已关闭（默认播放页）" : "当前：已启用";
  };
  syncStatus();
  box.append(status);

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:8px;margin-bottom:14px";
  const on = document.createElement("button");
  on.type = "button";
  on.className = "ghost-btn";
  on.textContent = "启用";
  on.onclick = () => { ctx.storage.set(ENABLED, "1"); syncStatus(); };
  const off = document.createElement("button");
  off.type = "button";
  off.className = "ghost-btn ghost-btn--quiet";
  off.textContent = "恢复默认播放页";
  off.onclick = () => { ctx.storage.set(ENABLED, "0"); syncStatus(); };
  actions.append(on, off);
  box.append(actions);

  const styleTitle = document.createElement("p");
  styleTitle.style.cssText = "margin:0 0 6px;font-size:.85em;color:var(--ink2)";
  styleTitle.textContent = "歌词样式";
  box.append(styleTitle);

  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;margin-bottom:14px";
  for (const item of FOLIA_MODES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost-btn ghost-btn--quiet";
    button.dataset.style = item.id;
    button.textContent = item.label;
    button.title = item.hint;
    button.onclick = () => {
      ctx.storage.set(STYLE, item.id);
      ctx.storage.set(ENABLED, "1");
      syncStatus();
      syncSelection();
    };
    grid.append(button);
  }
  box.append(grid);

  const bgTitle = document.createElement("p");
  bgTitle.style.cssText = "margin:0 0 6px;font-size:.85em;color:var(--ink2)";
  bgTitle.textContent = "背景";
  box.append(bgTitle);

  const bgGrid = document.createElement("div");
  bgGrid.style.cssText = "display:flex;flex-wrap:wrap;gap:6px";
  for (const item of FOLIA_BACKGROUNDS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost-btn ghost-btn--quiet";
    button.dataset.background = item.id;
    button.textContent = item.label;
    button.onclick = () => {
      ctx.storage.set(BACKGROUND, item.id);
      syncSelection();
    };
    bgGrid.append(button);
  }
  box.append(bgGrid);

  function syncSelection() {
    const style = currentStyle(ctx);
    const background = currentBackground(ctx);

    grid.querySelectorAll<HTMLElement>("[data-style]").forEach(button => {
      button.classList.toggle("active", button.dataset.style === style);
    });
    bgGrid.querySelectorAll<HTMLElement>("[data-background]").forEach(button => {
      button.classList.toggle("active", button.dataset.background === background);
    });
  }
  syncSelection();

  return box;
}

export default definePlugin({
  id: ID,
  name: "Folia 辞境",
  version: "1.0.9",
  minHostVersion: "1.4.0",
  kind: "third-party",
  author: "Team Quaver",
  description: "Folia 播放器的 Quaver Music 移植版本。（Folia by chthollyphile，使用 AGPLv3 协议开源）",
  allowBeta: true,
  setup(ctx) {
    ctx.log.info("loaded");

    // The transport inside Folia is Quaver's own #player-bar, not a redrawn bar. The host hides it
    // for every np takeover; show it only for this plugin. It stays visible at all times — the
    // plugin only auto-hides its own control pill (which floats right above the bar).
    ctx.registerStyleLayer({
      id: "folia-host-player-bar",
      order: 100,
      css: `
body.np-takeover:has(.np-view-root[data-plugin="folia-visualizer"]) #player-bar {
  display: flex !important;
  opacity: 1;
  transform: none;
  transition: opacity .25s ease, transform .25s ease;
}
`,
    });

    ctx.registerNowPlayingView({
      id: ID,
      enabled: () => ctx.storage.get(ENABLED) !== "0",
      render(host, np) {
        const mounted = mountFolia(host, np, ctx.storage, () => {
          ctx.storage.set(ENABLED, "0");
          np.collapse();
        }, () => np.collapse());

        return () => mounted.destroy();
      },
    });

    ctx.registerNowPlayingMenuItem(() => ({
      label: "启用 Folia 歌词动效",
      note: "把播放页换成 Folia 的全套歌词动效",
      run: () => {
        ctx.storage.set(ENABLED, "1");
        ctx.storage.set(STYLE, currentStyle(ctx));
        ctx.storage.set(BACKGROUND, currentBackground(ctx));
        ctx.toast(`已启用 Folia 歌词动效（${labelOf(currentStyle(ctx))}）`, "ok");
      },
    }));

    ctx.registerSettingsSection({
      id: ID,
      title: "Folia 歌词动效",
      render: () => settingsSection(ctx),
    });

    return () => {
      ctx.log.info("disposed");
    };
  },
});
