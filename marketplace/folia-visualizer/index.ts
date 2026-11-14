// Folia 歌词动效 — Marketplace plugin entry.
// AGPL-3.0: the runtime is a port of Folia Major by chthollyphile.
//
// 这一版的控制面整体搬进了**走带控制**（播放条右侧的一颗按钮 + 浮窗）：
//   · 正在播放页不再自绘控制条，只剩一颗返回钮（Folia 播放页同款）；
//   · 走带控件 / 菜单栏项 / Lattice 三个扩展点来自 Sparkle SDK 的新增契约；
//   · 选项与 Folia 本体的播放页设置对齐（样式 17 种 / 背景 6 种 / 播放页两面 / 字幕 /
//     字号 / 静态模式 / 自动隐藏播放条）。
import { definePlugin, type SparkleContext } from "../../sdk/index";
import {
    bindFoliaStorage,
    ensureFoliaControlCss,
    mountFolia,
    mountFoliaControl,
    readFoliaPrefs,
    releaseFoliaControlCss,
    writeFoliaPref,
} from "./runtime.js";
import { FOLIA_BACKGROUNDS, FOLIA_MODES } from "./runtime/catalog.js";

const ID = "folia-visualizer";

const SPARKLE_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7z"/><path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/></svg>';

const LATTICE_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/></svg>';

// —— 正在播放页的开关（宿主播放条在 np 接管时默认被藏起，这个插件要用它当传输） ——
const PLAYER_BAR_CSS = `
body.np-takeover:has(.np-view-root[data-plugin="folia-visualizer"]) #player-bar {
  display: flex !important;
  opacity: 1;
  transform: none;
  transition: opacity .25s ease, transform .25s ease;
}
/* 自动隐藏 / H 键：Folia 播放页「裸歌词」那档 —— 条整体淡出且不吃指针，一动就回来。 */
body.np-takeover.fvr-bar-hidden:has(.np-view-root[data-plugin="folia-visualizer"]) #player-bar {
  opacity: 0;
  transform: translateY(14px);
  pointer-events: none;
}
`;

/** 打开正在播放页：走宿主的封面钮（它就是展开/收起的公开入口），已展开时不重复点。 */
function openNowPlaying(): void {
    const npRoot = document.querySelector<HTMLElement>(".np");
    if (npRoot?.classList.contains("open")) return;
    document.querySelector<HTMLElement>("#pb-cover")?.click();
}

/** 收起正在播放页（已收起时是 no-op）。 */
function closeNowPlaying(): void {
    const npRoot = document.querySelector<HTMLElement>(".np");
    if (!npRoot?.classList.contains("open")) return;
    document.querySelector<HTMLElement>("#pb-cover")?.click();
}

/** 进入某一面（舞台 / Lattice）并打开播放页 —— 菜单栏项与控制面板共用。 */
function openSurface(surface: "stage" | "lattice"): void {
    writeFoliaPref("enabled", true);
    writeFoliaPref("surface", surface);
    openNowPlaying();
}

// —— 设置页分组（设置 → 花火插件 → Folia 辞境） ——
// 与走带浮窗同源：都读/写同一份偏好（runtime/prefs.ts），改哪边另一处都即时跟上。
function settingsSection(ctx: SparkleContext) {
    ensureFoliaControlCss();

    const box = document.createElement("div");
    box.className = "fvr-panel";
    box.style.maxWidth = "560px";

    const head = document.createElement("div");
    head.className = "fvr-panel-head";
    head.innerHTML = `
      <div>
        <b>Folia 辞境</b>
        <small>Folia Major 的 Quaver 移植：歌词动效 17 种 + Lattice 队列海报墙</small>
      </div>`;
    const tag = document.createElement("span");
    tag.className = "fvr-panel-tag";
    head.append(tag);
    box.append(head);

    const syncTag = () => {
        const prefs = readFoliaPrefs();

        tag.textContent = prefs.enabled
            ? `已启用 · ${FOLIA_MODES.find(m => m.id === prefs.style)?.label ?? "流光"}${prefs.surface === "lattice" ? " · Lattice" : ""}`
            : "已关闭";
        tag.classList.toggle("is-off", !prefs.enabled);
    };
    syncTag();

    // —— 启用 / 恢复 ——
    const enableRow = document.createElement("div");
    enableRow.className = "fvr-row";
    enableRow.innerHTML = `<div class="fvr-row-text"><b>启用歌词动效</b><small>控制项同时在播放条的走带控制里</small></div>`;
    const enableSwitch = document.createElement("button");
    enableSwitch.type = "button";
    enableSwitch.className = "fvr-sw";
    enableSwitch.setAttribute("role", "switch");
    enableSwitch.setAttribute("aria-label", "启用歌词动效");
    const syncEnable = () => {
        enableSwitch.setAttribute("aria-checked", String(readFoliaPrefs().enabled));
        syncTag();
        paintSelection();
    };
    enableSwitch.onclick = () => {
        const next = !readFoliaPrefs().enabled;
        writeFoliaPref("enabled", next);

        if (next) openNowPlaying();
        else closeNowPlaying();
        syncEnable();
    };
    enableRow.append(enableSwitch);
    box.append(enableRow);

    // —— 播放页两面 ——
    const surfaceLabel = document.createElement("div");
    surfaceLabel.className = "fvr-panel-label";
    surfaceLabel.innerHTML = "播放页 <small>舞台 = 歌词动效；Lattice = 队列海报墙</small>";
    const surfaceGrid = document.createElement("div");
    surfaceGrid.className = "fvr-grid";
    const surfaceBtns = new Map<"stage" | "lattice", HTMLButtonElement>();

    for (const [id, title, hint] of [
        ["stage", "舞台", "全身歌词动效"],
        ["lattice", "Lattice", "队列海报墙（建在播放页上）"],
    ] as const) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "fvr-chip";
        b.innerHTML = `<b>${title}</b><small>${hint}</small>`;
        b.onclick = () => { openSurface(id); syncEnable(); };
        surfaceBtns.set(id, b);
        surfaceGrid.append(b);
    }

    box.append(surfaceLabel, surfaceGrid);

    // —— 歌词样式 ——
    const styleLabel = document.createElement("div");
    styleLabel.className = "fvr-panel-label";
    styleLabel.innerHTML = `歌词样式 <small>Folia Major · ${FOLIA_MODES.length} 种</small>`;
    const styleGrid = document.createElement("div");
    styleGrid.className = "fvr-grid";
    const styleBtns = new Map<string, HTMLButtonElement>();

    for (const item of FOLIA_MODES) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "fvr-chip";
        b.title = item.hint;
        b.innerHTML = `<b>${item.label}</b><small>${item.hint}</small>`;
        b.onclick = () => { writeFoliaPref("style", item.id as typeof item.id); writeFoliaPref("enabled", true); syncEnable(); };
        styleBtns.set(item.id, b);
        styleGrid.append(b);
    }

    box.append(styleLabel, styleGrid);

    // —— 背景 ——
    const bgLabel = document.createElement("div");
    bgLabel.className = "fvr-panel-label";
    bgLabel.innerHTML = `共享背景 <small>${FOLIA_BACKGROUNDS.length} 种</small>`;
    const bgGrid = document.createElement("div");
    bgGrid.className = "fvr-grid fvr-grid--bg";
    const bgBtns = new Map<string, HTMLButtonElement>();

    for (const item of FOLIA_BACKGROUNDS) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "fvr-chip fvr-chip--pill";
        b.textContent = item.label;
        b.onclick = () => { writeFoliaPref("background", item.id as typeof item.id); syncEnable(); };
        bgBtns.set(item.id, b);
        bgGrid.append(b);
    }

    box.append(bgLabel, bgGrid);

    // —— 选项（与 Folia 播放页设置同口径） ——
    const optLabel = document.createElement("div");
    optLabel.className = "fvr-panel-label";
    optLabel.textContent = "选项";
    box.append(optLabel);

    const opts: { key: "translation" | "staticMode" | "autoHideChrome" | "vignette"; title: string; hint: string }[] = [
        { key: "translation", title: "显示翻译 / 音译", hint: "歌词下方辅助行（跟随宿主翻译选项的数据）" },
        { key: "staticMode", title: "静态模式", hint: "降低动效开销，适合低配机 / 省电" },
        { key: "autoHideChrome", title: "自动隐藏播放条", hint: "指针静止 3 秒收起，与 Folia 的 autoHidePlayerChrome 同义" },
        { key: "vignette", title: "Lattice 暗角", hint: "海报墙四周压暗" },
    ];
    const optSwitches = new Map<(typeof opts)[number]["key"], HTMLButtonElement>();

    for (const opt of opts) {
        const row = document.createElement("div");
        row.className = "fvr-row";
        row.innerHTML = `<div class="fvr-row-text"><b></b><small></small></div>`;
        row.querySelector("b")!.textContent = opt.title;
        row.querySelector("small")!.textContent = opt.hint;

        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "fvr-sw";
        sw.setAttribute("role", "switch");
        sw.setAttribute("aria-label", opt.title);
        sw.onclick = () => {
            writeFoliaPref(opt.key, !readFoliaPrefs()[opt.key]);
            syncEnable();
        };
        optSwitches.set(opt.key, sw);
        row.append(sw);
        box.append(row);
    }

    // —— 字号 ——
    const scaleLabel = document.createElement("div");
    scaleLabel.className = "fvr-panel-label";
    scaleLabel.textContent = "歌词字号";
    const seg = document.createElement("div");
    seg.className = "fvr-seg";
    const scaleBtns = new Map<number, HTMLButtonElement>();

    for (const scale of [0.8, 1, 1.2, 1.4]) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = `${Math.round(scale * 100)}%`;
        b.onclick = () => { writeFoliaPref("fontScale", scale); syncEnable(); };
        scaleBtns.set(scale, b);
        seg.append(b);
    }

    box.append(scaleLabel, seg);

    // —— 尾部动作 ——
    const foot = document.createElement("div");
    foot.className = "fvr-panel-foot";
    const openStage = document.createElement("button");
    openStage.type = "button";
    openStage.className = "fvr-panel-btn";
    openStage.textContent = "打开播放页";
    openStage.onclick = () => openSurface(readFoliaPrefs().surface);

    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "fvr-panel-btn is-danger";
    reset.textContent = "恢复默认播放页";
    reset.onclick = () => {
        writeFoliaPref("enabled", false);
        closeNowPlaying();
        syncEnable();
    };

    const note = document.createElement("span");
    note.className = "fvr-panel-note";
    note.textContent = "走带控制 · 播放条右侧按钮";

    foot.append(openStage, reset, note);
    box.append(foot);

    function paintSelection() {
        const prefs = readFoliaPrefs();

        for (const [id, b] of surfaceBtns) b.classList.toggle("sel", prefs.surface === id);
        for (const [id, b] of styleBtns) b.classList.toggle("sel", prefs.style === id);
        for (const [id, b] of bgBtns) b.classList.toggle("sel", prefs.background === id);
        for (const [scale, b] of scaleBtns) b.classList.toggle("sel", prefs.fontScale === scale);

        for (const [key, sw] of optSwitches) sw.setAttribute("aria-checked", String(prefs[key]));
    }

    paintSelection();

    return () => releaseFoliaControlCss();
}

export default definePlugin({
    id: ID,
    name: "Folia 辞境",
    version: "1.1.0",
    minHostVersion: "2.0.0",
    kind: "third-party",
    author: "Team Quaver",
    description: "Folia 播放器的 Quaver Music 移植版本。（Folia by chthollyphile，使用 AGPLv3 协议开源）",
    allowBeta: true,
    setup(ctx) {
        ctx.log.info("loaded");

        // 偏好存储必须在任何读/写之前绑定：菜单栏项与设置页可能在走带浮窗第一次打开之前
        // 就被点击（浮窗的 mount 也会绑定一次，幂等）。
        bindFoliaStorage(ctx.storage);

        // The transport inside Folia is Quaver's own #player-bar, not a redrawn bar. The host hides it
        // for every np takeover; show it only for this plugin (it is the transport — the plugin's own
        // controls live in its transport cluster, see registerTransportControl below). It stays visible
        // unless the user (or Folia's auto-hide) hides it.
        ctx.registerStyleLayer({ id: "folia-host-player-bar", order: 100, css: PLAYER_BAR_CSS });

        // —— 正在播放页：舞台 / Lattice（同一视图内按偏好切换） ——
        ctx.registerNowPlayingView({
            id: ID,
            enabled: () => readFoliaPrefs().enabled,
            render(host, np) {
                const mounted = mountFolia(host, np, ctx.storage, () => np.collapse());

                return () => mounted.destroy();
            },
        });

        // —— 控制面板：走带控制（播放条右侧，音量/音质/队列那一排）的一颗按钮 + 浮窗 ——
        ctx.registerTransportControl({
            id: "folia",
            label: "Folia 辞境",
            hint: "歌词动效 / Lattice",
            iconSvg: SPARKLE_ICON,
            width: 348,
            order: 10,
            render(host, transport) {
                const panel = mountFoliaControl(host, ctx.storage, transport);

                return () => panel.destroy();
            },
        });

        // —— 菜单栏：舞台 / Lattice 两个入口（主菜单列表）+ 一个总开关（侧栏底部调整区） ——
        // 勾选态读的是插件偏好（走带浮窗里改完，菜单栏下一次点击/注册表变化就同步）。
        ctx.registerMenuBarItem({
            id: "folia-stage",
            label: "Folia 播放页",
            hint: "打开歌词动效舞台",
            iconSvg: SPARKLE_ICON,
            slot: "main",
            checked: () => {
                const prefs = readFoliaPrefs();

                return prefs.enabled && prefs.surface === "stage";
            },
            run: () => openSurface("stage"),
        });
        ctx.registerMenuBarItem({
            id: "folia-lattice",
            label: "Lattice",
            hint: "队列海报墙",
            iconSvg: LATTICE_ICON,
            slot: "main",
            checked: () => {
                const prefs = readFoliaPrefs();

                return prefs.enabled && prefs.surface === "lattice";
            },
            run: () => openSurface("lattice"),
        });
        ctx.registerMenuBarItem({
            id: "folia-toggle",
            label: "Folia 动效",
            hint: "正在播放页交给 Folia",
            iconSvg: SPARKLE_ICON,
            slot: "foot",
            checked: () => readFoliaPrefs().enabled,
            run: () => {
                const next = !readFoliaPrefs().enabled;

                writeFoliaPref("enabled", next);

                if (next) openNowPlaying();
                else closeNowPlaying();
            },
        });

        // —— 正在播放页 ⋮ 菜单：保留一个入口（旧用户习惯），语义与菜单栏一致 ——
        ctx.registerNowPlayingMenuItem(() => ({
            label: "Folia 歌词动效",
            note: "打开 Folia 播放页（舞台 / Lattice）",
            run: () => openSurface(readFoliaPrefs().surface),
        }));

        // —— 设置页分组 ——
        ctx.registerSettingsSection({ id: ID, title: "Folia 辞境", render: () => settingsSection(ctx) });

        return () => {
            ctx.log.info("disposed");
        };
    },
});
