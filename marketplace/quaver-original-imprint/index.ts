const name = "原印象";
const playGreen = "#00f268";
const textGreen = "#27af6b";
const themeId = "quaver-original-imprint";
const heartPath = "M12 20s-7-4.6-9-9c-1.3-3 .8-6.5 4-6.5 2 0 3.5 1.2 5 3 1.5-1.8 3-3 5-3 3.2 0 5.3 3.5 4 6.5-2 4.4-9 9-9 9z";
const heartMask = fill => `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${heartPath}" fill="${fill}" stroke="black" stroke-width="1.8"/></svg>`
)}")`;
// 播放页微调：0 是最初位置，0.5 是左右空隙完全对称。
const rightColumnInsetRatio = 0.125;
// 每组歌词上下各留多少空间，随字号一起缩放。
const lyricLinePadding = "0.58em";

const css = `
html:not([data-theme="dark"]) {
  color-scheme: light;
  --bg: #f0f0f0;
  --side: #f0f0f0;
  --card: #f6f6f6;
  --panel: #f6f6f6;
  --glass: #f6f6f6;
  --ink: #202124;
  --ink2: #565861;
  --ink3: #41434a;
  --idx: #666973;
  --hover: #e3e3e3;
  --row-hover: #e9e9e9;
  --nav-active: #d8d8d8;
  --nav-active-line: #cecece;
  --line: #dcdcdc;
  --sep: #d8d8d8;
  --panel-line: transparent;
  --glass-line: transparent;
  --ph: #e3e3e3;
  --ph2: #dadada;
  --pill: #e3e3e3;
  --track: #dadada;
  --press: #00000014;
  --qq-row-stripe: #f1f1f1;
  --qq-panel-opacity: 72%;
}

html[data-theme="dark"] {
  color-scheme: dark;
  --bg: #171718;
  --side: #171718;
  --card: #1e1e20;
  --panel: #1e1e20;
  --glass: #1e1e20;
  --ink: #f5f5f5;
  --ink2: #adadae;
  --ink3: #dededf;
  --idx: #a0a0a2;
  --hover: #343436;
  --row-hover: #2c2c2e;
  --nav-active: #353536;
  --nav-active-line: #4b4b4d;
  --line: #414143;
  --sep: #38383a;
  --panel-line: transparent;
  --glass-line: transparent;
  --ph: #343436;
  --ph2: #3d3d3f;
  --pill: #343436;
  --track: #505052;
  --press: #ffffff1a;
  --qq-row-stripe: #222224;
  --qq-panel-opacity: 74%;
}

html:not([data-theme="dark"]):not([data-menu-glass="off"]) {
  --menu-surface: #f6f6f6dc;
  --menu-edge: #ffffff80;
  --menu-shadow: 0 12px 36px #00000026;
}

html[data-theme="dark"]:not([data-menu-glass="off"]) {
  --menu-surface: #222224e6;
  --menu-edge: #ffffff14;
  --menu-shadow: 0 12px 36px #00000075;
}

:root {
  --sidebar-surface: var(--side);
  --content-surface: var(--panel);
  --qq-accent: var(--cvg-accent, var(--acc));
  --qq-current-song: color-mix(in srgb, var(--qq-accent) 68%, var(--ink));
  --qq-play: var(--qq-accent);
}

.sidebar {
  box-shadow: none;
  backdrop-filter: none;
}

body .sidebar:has(> .side-foot) {
  padding-block-end: 4px;
}

.sidebar .nav a,
.sidebar .pl {
  border-radius: 8px;
}

.sidebar .nav a.active {
  background: var(--nav-active);
}

.sidebar .nav a.active::before {
  content: none;
}

.row.sel {
  box-shadow: none;
}

.content,
.player {
  box-shadow: none;
}

.content {
  --top-band-h: 66px;
  --veil-gentle: none;
  --qq-sticky-cover-height: calc(var(--top-band-h) + var(--stuck-h, 0px) + 4px);
  --stuck-cover: linear-gradient(
    to bottom,
    var(--panel) 0 var(--qq-sticky-cover-height),
    transparent var(--qq-sticky-cover-height)
  );
}

.content.has-stuck::before {
  height: var(--qq-sticky-cover-height);
}

.content.has-stuck .queue-panel.dock {
  background-size: 100% max(112px, var(--qq-sticky-cover-height));
}

.content .route {
  --route-pad-top: 0px;
}

#tint-cards:has([data-opt="default"]:disabled) > .qq-tint-option {
  display: none;
}

#tint-cards:has(> .qq-tint-option.sel) .opt-card[data-opt].sel {
  border-color: var(--line);
  box-shadow: none;
  background: transparent;
  color: var(--ink2);
}

body:has(> .ambient:is([data-mode="cover"], [data-mode="custom"])) {
  --sidebar-surface: color-mix(in srgb, var(--side) 62%, transparent);
  --content-surface: color-mix(in srgb, var(--panel) var(--qq-panel-opacity), transparent);
  --control-bar-surface: color-mix(in srgb, var(--glass) 62%, transparent);
  --qq-row-stripe: transparent;
  --row-hover: color-mix(in srgb, var(--ink) 9%, transparent);
}

body:has(> .ambient:is([data-mode="cover"], [data-mode="custom"])) .sidebar {
  --hover: color-mix(in srgb, var(--ink) 9%, transparent);
  --nav-active: color-mix(in srgb, var(--ink) 14%, transparent);
  backdrop-filter: var(--shell-filter);
}

body:has(> .ambient:is([data-mode="cover"], [data-mode="custom"])):has(:is(#side-collapse, .content-top .top-back):hover) .qtip {
  background: color-mix(in srgb, var(--menu-surface) 85%, var(--card));
  backdrop-filter: none;
}

body:has(> .ambient:is([data-mode="cover"], [data-mode="custom"])) .sb-field {
  background: transparent;
}

.sb-field:not(:focus-within) {
  border-color: color-mix(in srgb, var(--ink) 26%, transparent);
}

body:has(> .ambient:is([data-mode="cover"], [data-mode="custom"])) .sb-field:not(:focus-within) {
  box-shadow: none;
}

body:has(> .ambient:is([data-mode="cover"], [data-mode="custom"])) .content.has-stuck {
  --stuck-cover: none;
}

[data-qq-sticky-clip] {
  clip-path: inset(var(--qq-sticky-clip) -100px -100px);
}

[data-qq-sticky-clip="hidden"] {
  clip-path: inset(50%);
}

.route[data-qq-sticky-scrolling] :is(.sticky-bar, .sticky-head).stuck {
  backdrop-filter: var(--shell-filter);
}

.route[data-qq-sticky-snapshot][data-qq-sticky-scrolling] :is(.sticky-bar, .sticky-head).stuck {
  background:
    linear-gradient(var(--content-surface), var(--content-surface)),
    var(--qq-sticky-snapshot) var(--qq-sticky-x, 0px) var(--qq-sticky-y, 0px) / 100vw 100dvh no-repeat;
  backdrop-filter: none;
}

@media (min-width: 860px) {
  .content-top .top-center {
    margin-inline: 36px auto;
  }

  .content-top .top-back {
    right: calc(100% + 27px);
  }

  body:not(.ssd) .content-top::before {
    flex-basis: 20px;
  }
}

.content-top .searchbar {
  inset-inline-start: -8px;
}

.sb-field > .sb-icon {
  display: grid;
  flex: none;
  place-items: center;
}

.sb-field > .sb-icon svg {
  display: block;
}

.content-top .top-back[hidden] {
  display: grid;
  opacity: .38;
  pointer-events: none;
}

.content-top .top-back {
  border: 0;
  background: transparent;
}

.content-top .top-back:not([hidden]):hover {
  background: var(--hover);
}

.content-top .top-back svg {
  width: 22px;
  height: 22px;
}

.content {
  --qq-page-heading-inset: 10px;
}

.content .home-pagehead.sticky-head {
  padding-top: calc(var(--qq-page-heading-inset) - 7px);
}

.route > .entering:has(> .home-pagehead + .home-lead) {
  padding-inline-start: 14px;
}

.content .pl-head {
  margin-top: var(--qq-page-heading-inset);
}

.pl-head .pl-art:not(.round) {
  border-radius: 6px;
  box-shadow: none;
}

.sticky-bar .sticky-playall {
  border-radius: 999px;
  background: var(--qq-accent);
  border-color: var(--qq-accent);
  color: white;
  font-weight: 600;
}

.sticky-bar .sticky-playall.ghost-btn:hover:not(:disabled) {
  --qq-playall-hover: color-mix(in srgb, var(--qq-accent) 88%, black);
  background: var(--qq-playall-hover);
  border-color: var(--qq-playall-hover);
}

.sticky-bar .sticky-playall.ghost-btn:disabled:hover {
  border-color: var(--qq-accent);
}

.sticky-bar .sticky-playall:focus-visible {
  outline: 2px solid var(--qq-accent);
  outline-offset: 2px;
}

.pl-actions:empty {
  display: none;
}

.pl-info:has(> .pl-desc:not(.open) + .pl-expand) {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.pl-info > .pl-desc:not(.open):has(+ .pl-expand) {
  grid-area: 3 / 1;
  padding-inline-end: 5em;
}

.pl-info > .pl-desc:not(.open) + .pl-expand {
  grid-area: 3 / 1;
  place-self: end;
  margin: 0;
  padding: 0 8px;
  line-height: 1.35;
}

.qq-playlist-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
}

.qq-playlist-actions > :is(.sticky-playall, .fav-btn) {
  box-sizing: border-box;
  height: 32px;
  padding-block: 0;
  white-space: nowrap;
}

.sticky-bar__right:has(> .qq-playlist-actions) {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.route .rows > :where(.entering:has(.pl-head) .row[data-songkey], .cloud-row) {
  display: grid;
  grid-template-columns: 16px auto minmax(0, 1fr) minmax(0, 26%) 24px 40px;
  align-items: center;
  column-gap: 10px;
  padding-inline-start: 12px;
}

.route .rows > :where(.entering:has(.pl-head) .row[data-songkey], .cloud-row) > .rmeta {
  display: grid;
  grid-column: 3 / 5;
  grid-template-columns: subgrid;
  grid-template-rows: auto auto;
  align-items: center;
  row-gap: 1px;
}

.route .rows > :where(.entering:has(.pl-head) .row[data-songkey], .cloud-row) > :is(.idx, .rthumb, .rmeta, .row-love, .dur) {
  grid-row: 1;
}

.route .rows > :where(.entering:has(.pl-head) .row[data-songkey], .cloud-row) > .idx {
  grid-column: 1;
  width: auto;
  text-align: center;
}

.route .rows > :where(.entering:has(.pl-head) .row[data-songkey], .cloud-row) > .rthumb {
  grid-column: 2;
}

.route .rows > :where(.entering:has(.pl-head) .row[data-songkey], .cloud-row) .rt {
  grid-area: 1 / 1;
}

.route .rows > :where(.entering:has(.pl-head) .row[data-songkey], .cloud-row):not(:has(.ra)) .rt {
  grid-row: 1 / span 2;
  align-self: center;
}

.route .rows > :where(.entering:has(.pl-head) .row[data-songkey], .cloud-row) .ra {
  grid-area: 2 / 1;
}

.route .rows > :where(.entering:has(.pl-head) .row[data-songkey], .cloud-row) .ral {
  grid-area: 1 / 2 / span 2;
}

.route .entering:has(.pl-head) .row :is(.ra, .ral) .meta-link:hover {
  text-decoration: none;
}

.route .rows > :where(.entering:has(.pl-head) .row[data-songkey], .cloud-row) > .row-love {
  grid-column: 5;
  font-size: 0;
  padding-inline: 4px;
}

.route .rows > :where(.entering:has(.pl-head) .row[data-songkey], .cloud-row) > .row-love::before {
  content: "";
  display: block;
  width: 16px;
  height: 16px;
  background: currentColor;
  mask: ${heartMask("none")} center / contain no-repeat;
}

.route .rows > :where(.entering:has(.pl-head) .row[data-songkey], .cloud-row) > .row-love.on::before {
  mask-image: ${heartMask("black")};
}

.route .rows > :where(.entering:has(.pl-head) .row[data-songkey], .cloud-row) > .dur {
  grid-column: 6;
}

/* The cloud list uses its status badges in place of the favorite and time columns. */
.route .rows > .row.cloud-row {
  grid-template-columns: 16px auto minmax(0, 1fr) minmax(0, 26%) fit-content(25%);
  padding-inline-start: 18px;
}

.route .cloud-row > .cloud-tags {
  grid-area: 1 / 5;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.route .cloud-row .cloud-pill {
  white-space: nowrap;
}

.route .cloud-row .rt {
  font-weight: 500;
}

.route .local-rows > .muted:only-child {
  margin-inline: 18px;
  padding-block: 6px;
  font-size: 13px;
  line-height: 1.5;
}

.route .cloud-auth {
  margin-inline: 18px;
  padding: 6px 0;
  border: 0;
  background: transparent;
}

.route .cloud-auth-copy {
  gap: 2px;
}

.route .cloud-auth-primary {
  border-radius: 999px;
  border-color: var(--line);
  background: var(--pill);
  color: var(--ink);
}

.route .cloud-auth-primary:hover:not(:disabled) {
  background: var(--hover);
}

.route .sticky-bar.stuck .sticky-bar__lead {
  margin-inline-start: 8px;
}

/* Keep the native sticky toolbar and reuse its play button in the cover area. */
@media (min-width: 1050px) {
  .content {
    --qq-playlist-cover: 150px;
    --qq-playlist-inset: 22px;
    --qq-playlist-gap: 24px;
    --qq-playlist-controls-height: 42px;
  }

  .content:not(:has(.queue-panel.dock.open)) .pl-head:has(+ .sticky-bar .sticky-playall, + .all-source-note[hidden] + .sticky-bar .sticky-playall) {
    margin-inline-start: var(--qq-playlist-inset);
    gap: var(--qq-playlist-gap);
    margin-bottom: 0;
  }

  .content:not(:has(.queue-panel.dock.open)) .pl-head:has(+ .sticky-bar .sticky-playall, + .all-source-note[hidden] + .sticky-bar .sticky-playall) .pl-art {
    width: var(--qq-playlist-cover);
    height: var(--qq-playlist-cover);
  }

  .content:not(:has(.queue-panel.dock.open)) .pl-head:has(+ .sticky-bar .sticky-playall, + .all-source-note[hidden] + .sticky-bar .sticky-playall) .pl-info {
    padding-bottom: var(--qq-playlist-controls-height);
  }

  .content:not(:has(.queue-panel.dock.open)) :is(.pl-head + .sticky-bar, .pl-head + .all-source-note[hidden] + .sticky-bar):has(.sticky-playall) {
    min-height: var(--qq-playlist-controls-height);
    margin-top: calc(-1 * var(--qq-playlist-controls-height));
  }

  .content:not(:has(.queue-panel.dock.open)) :is(.pl-head + .sticky-bar, .pl-head + .all-source-note[hidden] + .sticky-bar):not(.stuck) .sticky-bar__right > :is(.sticky-playall, .qq-playlist-actions) {
    position: absolute;
    inset-inline-start: calc(24px + var(--qq-playlist-inset) + var(--qq-playlist-cover) + var(--qq-playlist-gap));
  }

  .content:not(:has(.queue-panel.dock.open)) :is(.pl-head + .sticky-bar, .pl-head + .all-source-note[hidden] + .sticky-bar):not(.stuck) .sticky-bar__lead {
    visibility: hidden;
    flex: 0 0 0;
  }
}

.row.playing,
.qp-item.cur:not(.dragging) {
  background: transparent;
}

.route .rows > :where(.entering:has(.pl-head) .row[data-songkey], .cloud-row):nth-child(odd):not(:hover, .sel) {
  background: var(--qq-row-stripe);
}

.row.playing:is(:hover, .sel),
.qp-list:not(.reordering) .qp-item.cur:not(.dragging):hover {
  background: var(--row-hover);
}

.row.playing :is(.rt, .ra, .ral, .dur),
.row.playing .meta-link:hover,
.qp-item.cur :is(.qi-n, .qi-a, .qi-i) {
  color: var(--qq-current-song);
}

:is(.row.playing > .rthumb, .qp-item.cur .qi-thumb) {
  position: relative;
}

:is(.row.playing > .rthumb, .qp-item.cur .qi-thumb)::before,
:is(.row.playing > .rthumb, .qp-item.cur .qi-thumb)::after {
  content: "";
  position: absolute;
  pointer-events: none;
}

:is(.row.playing > .rthumb, .qp-item.cur .qi-thumb)::before {
  inset: 0;
  background: #0006;
}

:is(.row.playing > .rthumb, .qp-item.cur .qi-thumb)::after {
  inset: 50% auto auto 50%;
  width: 14px;
  height: 12px;
  transform: translate(-50%, -50%);
  background: white;
  clip-path: polygon(
    0 100%, 0 7px, 2px 7px, 2px 100%,
    6px 100%, 6px 2px, 8px 2px, 8px 100%,
    12px 100%, 12px 5px, 14px 5px, 14px 100%
  );
}

@media (prefers-reduced-motion: no-preference) {
  body:has(> .np.playing) :is(.row.playing > .rthumb, .qp-item.cur .qi-thumb)::after {
    animation: qq-cover-playing .95s ease-in-out infinite;
  }
}

@keyframes qq-cover-playing {
  25% {
    clip-path: polygon(
      0 100%, 0 1px, 2px 1px, 2px 100%,
      6px 100%, 6px 7px, 8px 7px, 8px 100%,
      12px 100%, 12px 3px, 14px 3px, 14px 100%
    );
  }
  50% {
    clip-path: polygon(
      0 100%, 0 5px, 2px 5px, 2px 100%,
      6px 100%, 6px 0, 8px 0, 8px 100%,
      12px 100%, 12px 8px, 14px 8px, 14px 100%
    );
  }
  75% {
    clip-path: polygon(
      0 100%, 0 8px, 2px 8px, 2px 100%,
      6px 100%, 6px 5px, 8px 5px, 8px 100%,
      12px 100%, 12px 0, 14px 0, 14px 100%
    );
  }
}

.home-cards {
  gap: 20px;
}

.home-cards .card .art:not(.round),
.player .pb-cover {
  border-radius: 6px;
}

.player .pb-play {
  width: 40px;
  height: 30px;
  border-radius: 999px;
  color: #101713;
  color: contrast-color(var(--qq-play));
  background: var(--qq-play);
}

.player .pb-play:hover {
  background: color-mix(in srgb, var(--qq-play) 85%, var(--ink));
}

body[data-control-bar="bottom"]:has(.qq-progress) .body {
  margin-bottom: calc(-1 * var(--control-bar-slot));
}

body[data-control-bar="bottom"]:has(.qq-progress) .body > :is(.content, .side-resizer) {
  margin-bottom: var(--control-bar-slot);
}

body[data-control-bar="floating"]:not(:has(> .np.open)) .player {
  border-color: color-mix(in srgb, var(--ink) 16%, transparent);
}

@media (prefers-reduced-motion: no-preference) {
  body[data-control-bar="bottom"] .player {
    transition: margin-inline-start .34s cubic-bezier(.32, .72, .24, 1);
  }
}

body[data-control-bar="bottom"]:not(:has(> .np.open)) .player {
  margin-inline-start: calc(var(--side-w, 216px) + 20px);
}

body[data-control-bar="bottom"].side-collapsed:not(:has(> .np.open)) .player {
  margin-inline-start: 84px;
}

.player:has(.qq-progress) .pb-fill-clip,
.player:has(.qq-progress) .pb-time {
  display: none;
}

.player:has(.qq-progress) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(140px, 300px) minmax(max-content, 1fr);
  align-items: center;
  column-gap: 8px;
}

.player:has(.qq-progress) .pb-left {
  width: 100%;
}

.player:has(.qq-progress) .pb-left .now {
  line-height: 1.35;
}

.player:has(.qq-progress) .pb-left .now .s {
  margin-block-start: 3px;
}

@media (width > 860px) {
  .player:has(.qq-progress) .pb-left .now {
    position: relative;
    inset-block-start: 1.5px;
  }
}

.player:has(.qq-progress) .pb-mid {
  flex-direction: column;
  gap: 0;
  margin: 0;
  inset-block-start: 2px;
}

.player:has(.qq-progress) .pb-right {
  justify-self: end;
}

.qq-transport,
.qq-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.qq-loophost {
  position: relative;
  display: flex;
}

.qq-loophost > .pb-lpop {
  right: auto;
  left: 50%;
  bottom: calc(100% + 16px);
  transform: translateX(-50%);
}

/* The host's third volume arc nearly overlaps the second at full volume. */
.player :is(#pb-mute, #pb-mute2) path[d="M19.6 5.2a10.4 10.4 0 0 1 0 13.6"] {
  d: path("M19.6 5.2Q26 12 19.6 18.8");
}

.qq-progress {
  width: 100%;
  color: var(--ink2);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.qq-progress span {
  min-width: 4ch;
  text-align: center;
}

.qq-progress input {
  appearance: none;
  min-width: 0;
  width: 100%;
  height: 14px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}

.qq-progress input::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 4px;
  background: linear-gradient(to right, var(--ink) var(--qq-progress, 0%), var(--track) 0);
}

.qq-progress input::-webkit-slider-thumb {
  appearance: none;
  width: 8px;
  height: 8px;
  margin-top: -2px;
  border-radius: 50%;
  background: var(--ink);
}

body:has(> .np.open) .player {
  --control-bar-surface: transparent;
  --qq-accent: var(--qq-cover-accent, var(--cvg-accent, var(--acc)));
  --qq-play: var(--qq-accent);
  --ink: #f6f7fa;
  --ink2: #d2d8dd;
  --ink3: #e6ebee;
  --track: #536269;
  --ph2: #344a53;
  --press: #ffffff20;
  --card: #24383f;
  --line: #ffffff24;
  --menu-surface: #24383f;
  --menu-line: #ffffff24;
  border-color: transparent;
}

body:has(> .np.open) .player::before {
  backdrop-filter: none;
}

.winbtns {
  top: 17px;
}

.winbtns button {
  width: 28px;
  height: 28px;
}

.winbtns button svg {
  width: 14px;
  height: 14px;
}

body:not(.ssd) .content-top .top-drag {
  right: 102px;
}

body:not(.ssd):has(> .np.open) .winbtns {
  visibility: visible;
}

body:not(.ssd):has(> .np.open) .winbtns button {
  color: #f6f7fa;
}

body:not(.ssd):has(> .np.open) .winbtns button:hover {
  background: #ffffff24;
}

body:not(.ssd):has(> .np.open) .winbtns button[data-win="close"]:hover {
  background: #e81123;
}

body:not(.ssd) .np.open .np-drag {
  left: 60px;
  right: 122px;
}

.np > .qq-np-collapse {
  display: none;
  position: absolute;
  z-index: 3;
  top: 16px;
  left: 16px;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #fff9;
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.np.open > .qq-np-collapse {
  display: grid;
  place-items: center;
}

.np > .qq-np-collapse:hover {
  color: white;
  background: #ffffff17;
}

.np {
  --qq-playing-lyric: var(--qq-cover-accent, var(--qq-accent));
  --qq-unplayed-lyric: #c6c2cd;
  background: #171b28;
}

.np .np-bg {
  filter: blur(85px) saturate(1.2) brightness(.72);
}

.np .np-scrim,
.np.kara .np-scrim {
  background: linear-gradient(130deg, #181726b0, #111722c9);
}

.np[data-qq-cover-palette] .np-scrim {
  background:
    radial-gradient(ellipse at 15% 74%, var(--qq-cover-left), transparent 72%),
    radial-gradient(ellipse at 90% 25%, var(--qq-cover-right), transparent 78%),
    #191926;
}

.np .np-cover,
.np .np-cover-wrap::before {
  border-radius: 6px;
}

.np .np-ly-line {
  filter: none;
  padding-block: ${lyricLinePadding};
}

.np .np-ly-line.cur {
  color: var(--qq-playing-lyric);
}

.np .np-ly-line .l2 {
  font-size: .85em;
}

.np .np-ly-line.cur .l2 {
  font-size: 1em;
  color: var(--qq-unplayed-lyric);
  opacity: 1;
}

.np .np-kara-host {
  --amll-lp-color: var(--qq-unplayed-lyric);
  text-shadow: none;
}

.np .np-kara-host .amll-lyric-player {
  mix-blend-mode: normal;
}

/* Fade the whole main line after removing per-word masks outside the active line. */
.np .np-kara-host [class*="_lyricMainLine"]:not([class*="_gradientMask"] [class*="_active"]) {
  opacity: .56;
}

.np .np-kara-host [class*="_lyricMainLine"]:not([class*="_gradientMask"] [class*="_active"]) [style*="mask-image"] {
  mask-image: none !important;
}

.np .np-kara-host [data-qq-karaoke-word] {
  mask-image: none !important;
  color: transparent;
  text-shadow: none;
  background: var(--qq-word-gradient) var(--qq-word-position) / var(--qq-word-size) no-repeat;
  background-color: var(--amll-lp-color);
  background-clip: text;
}

.np .np-kara-host [data-qq-karaoke-native] {
  mask-image: none !important;
  color: color-mix(in srgb, var(--qq-playing-lyric) var(--qq-word-played, 0%), var(--amll-lp-color));
}

.np .np-kara-host .amll-lyric-player [class*="lyricSubLine"] {
  font-size: .85em;
}

.np .np-kara-host .amll-lyric-player [class*="_lyricLine"][class*="_active"] > [class*="_lyricSubLine"] {
  color: var(--qq-unplayed-lyric);
  opacity: 1;
}

/* AMLL applies its distance blur inline. Keep neighboring lyrics readable. */
.np .np-kara-host [class*="lyricLineWrapper"] {
  filter: none !important;
}

/* Keep the wrapper's animated position and render the lyric line at its natural size. */
.np .np-kara-host [class*="_lyricLine"]:has(> [class*="_lyricMainLine"]):not([class*="_lyricBgLine"]) {
  transform: none !important;
}

.np .np-kara-host .amll-lyric-player [class*="lyricLineWrapper"] {
  padding-block: ${lyricLinePadding};
}

.np:not(.np-taken-over) .np-inner {
  --qq-cover-size: min(42vh, 440px);
  width: 80%;
  height: min(720px, calc(100dvh - 150px), max(560px, calc(100dvh - 240px)));
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  column-gap: clamp(30px, 8vw, 150px);
  row-gap: 12px;
}

.np.np-lyrics-full:not(.np-taken-over) .np-inner {
  left: 10%;
  right: 10%;
  width: auto;
  height: auto;
}

.np:not(.np-taken-over) .np-side {
  display: contents;
}

.np:not(.np-taken-over) .np-cover-wrap {
  grid-column: 1;
  grid-row: 1 / span 2;
  place-self: center;
  width: min(100%, var(--qq-cover-size));
  max-height: 100%;
}

.np:not(.np-taken-over) .np-lyrics,
.np:not(.np-taken-over) .np-kara-host {
  grid-column: 2;
  grid-row: 2;
  min-height: 0;
}

.np:not(.np-taken-over) :is(.np-lyrics, .np-kara-host, .np-meta) {
  margin-inline-start: max(0px, calc((100% - var(--qq-cover-size)) * ${rightColumnInsetRatio}));
}

.np:not(.np-taken-over) .np-kara-host {
  --amll-lp-font-size: calc(21px * var(--np-ly-scale, 1));
  font-weight: 550;
}

.np:not(.np-taken-over) .np-kara-host .amll-lyric-player {
  --lyric-line-padding-x: 0px;
  --amll-lp-line-padding-x: 0px;
}

.np:not(.np-taken-over) .np-ly-line {
  padding-inline: 0;
}

.np:not(.np-taken-over) .np-meta {
  grid-column: 2;
  grid-row: 1;
  margin-top: 0;
  align-items: flex-start;
  text-align: left;
}

.np:not(.np-taken-over) .np-morewrap {
  align-self: flex-start;
  margin-top: 4px;
}

.np:not(.np-taken-over) .np-morewrap :is(.np-menu, .np-qinfo) {
  inset: calc(100% + 8px) auto auto 0;
}

@media (max-width: 859px), (max-height: 579px) {
  .np:not(.np-taken-over) .np-inner {
    --qq-cover-size: min(36dvh, 440px);
    column-gap: clamp(18px, 6vw, 65px);
    row-gap: 6px;
  }

  .np:not(.np-taken-over) .np-title {
    font-size: 18px;
  }
}
`;

// The theme's color preset only overrides rendered tokens.
const themeCss = css + `
:root[data-original-imprint-green] {
  --cvg-accent: ${textGreen} !important;
  --cvg-glow: ${textGreen} !important;
  --cvg-bar-line: ${textGreen} !important;
  --cvg-bar-fill: ${textGreen} !important;
  --np-hl: ${textGreen} !important;
  --qq-play: ${playGreen};
  --qq-current-song: ${textGreen};
}

:root[data-original-imprint-green] .sidebar {
  --cvg-accent: ${playGreen};
  --cvg-glow: ${playGreen};
}
`;

function mountStickyClip(route) {
  const content = route.closest(".content");
  const ambient = document.querySelector("body > .ambient");
  if (!content || !ambient) return;
  const clipped = new Set();
  const art = ambient.querySelector(".ambient-art");
  const artImage = new Image();
  const snapshot = document.createElement("canvas");
  let frame = 0;
  let scrollTimer;
  let artSource;
  const hasImageBackground = () => ["cover", "custom"].includes(ambient.dataset.mode);
  const clearSnapshot = () => {
    delete route.dataset.qqStickySnapshot;
    for (const property of ["--qq-sticky-snapshot", "--qq-sticky-x", "--qq-sticky-y"]) {
      route.style.removeProperty(property);
    }
  };
  const captureBackground = () => {
    if (!hasImageBackground() || route.hasAttribute("data-qq-sticky-scrolling")) return;
    const mesh = ambient.querySelector(".ambient-host.ready canvas");
    const source = art?.style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
    if (ambient.dataset.renderer === "quaver" && source && source !== artSource) {
      artSource = source;
      const url = new URL(source, location.href);
      artImage.src = /^https?:$/.test(url.protocol) && url.origin !== location.origin
        ? "/api/img?u=" + encodeURIComponent(url.href)
        : url.href;
    }
    const image = ambient.dataset.renderer === "quaver" ? artImage : mesh;
    const width = image?.naturalWidth ?? image?.width;
    const height = image?.naturalHeight ?? image?.height;
    if (!width || !height) return;
    snapshot.width = 192;
    snapshot.height = Math.max(1, Math.round(snapshot.width * innerHeight / innerWidth));
    const context = snapshot.getContext("2d", { alpha: false });
    if (!context) return;
    try {
      context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
      context.fillRect(0, 0, snapshot.width, snapshot.height);
      const base = context.getImageData(0, 0, 1, 1).data;
      const isArt = image === artImage;
      if (isArt) {
        const scale = Math.max(snapshot.width / width, snapshot.height / height) * 1.15;
        const w = width * scale, h = height * scale;
        const blur = parseFloat(getComputedStyle(art).getPropertyValue("--bg-blur")) || 70;
        context.filter = `blur(${blur * snapshot.width / innerWidth}px) saturate(1.5) brightness(1.06)`;
        context.globalAlpha = ambient.dataset.mode === "custom" ? 1 : .55;
        context.drawImage(image, (snapshot.width - w) / 2, (snapshot.height - h) / 2, w, h);
      } else {
        context.globalAlpha = ambient.dataset.mode === "custom" ? 1 : .9;
        context.drawImage(image, 0, 0, snapshot.width, snapshot.height);
      }
      const pixels = context.getImageData(0, 0, snapshot.width, snapshot.height).data;
      if (!pixels.some((value, i) => value !== base[i % 4])) return;
      route.style.setProperty("--qq-sticky-snapshot", `url("${snapshot.toDataURL("image/webp")}")`);
      route.dataset.qqStickySnapshot = "";
    } catch {
      // Leave the existing transparent treatment if the host image cannot be copied.
    }
  };
  artImage.onload = captureBackground;
  const clear = element => {
    delete element.dataset.qqStickyClip;
    element.style.removeProperty("--qq-sticky-clip");
    clipped.delete(element);
  };
  const sync = () => {
    frame = 0;
    const sticky = content.classList.contains("has-stuck") && hasImageBackground()
      ? route.querySelector(":scope > .entering > :is(.sticky-bar, .sticky-head).stuck")
      : null;
    const next = new Map();
    if (sticky) {
      const stickyBounds = sticky.getBoundingClientRect();
      const bottom = stickyBounds.bottom;
      if (route.hasAttribute("data-qq-sticky-snapshot")) {
        for (const [property, coordinate] of [["--qq-sticky-x", stickyBounds.left], ["--qq-sticky-y", stickyBounds.top]]) {
          const offset = -coordinate + "px";
          if (route.style.getPropertyValue(property) !== offset) route.style.setProperty(property, offset);
        }
      }
      const top = route.getBoundingClientRect().top;
      for (const element of sticky.parentElement.children) {
        if (element === sticky || element.matches(".list-fabs, [hidden]")) continue;
        const bounds = element.getBoundingClientRect();
        if (bounds.bottom <= top || bounds.top >= bottom) continue;
        if (["absolute", "fixed", "sticky"].includes(getComputedStyle(element).position)) continue;
        next.set(element, bounds.bottom <= bottom ? "hidden" : Math.ceil(bottom - bounds.top) + "px");
      }
    }
    for (const element of clipped) if (!next.has(element)) clear(element);
    for (const [element, inset] of next) {
      const mode = inset === "hidden" ? "hidden" : "";
      const offset = mode ? "0px" : inset;
      if (element.dataset.qqStickyClip !== mode) element.dataset.qqStickyClip = mode;
      if (element.style.getPropertyValue("--qq-sticky-clip") !== offset) {
        element.style.setProperty("--qq-sticky-clip", offset);
      }
      clipped.add(element);
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
  const onScroll = () => {
    if (!hasImageBackground()) return;
    route.dataset.qqStickyScrolling = "";
    cancelAnimationFrame(frame);
    sync();
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      delete route.dataset.qqStickyScrolling;
      sync();
      captureBackground();
    }, 110);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(content, { attributes: true, attributeFilter: ["class"] });
  const backgroundObserver = new MutationObserver(() => {
    if (!hasImageBackground()) {
      clearTimeout(scrollTimer);
      delete route.dataset.qqStickyScrolling;
      clearSnapshot();
    } else {
      captureBackground();
    }
    schedule();
  });
  backgroundObserver.observe(ambient, { attributes: true, attributeFilter: ["data-mode", "data-renderer"] });
  if (art) backgroundObserver.observe(art, { attributes: true, attributeFilter: ["style", "class"] });
  const ambientHost = ambient.querySelector(".ambient-host");
  if (ambientHost) backgroundObserver.observe(ambientHost, { childList: true, attributes: true, attributeFilter: ["class"] });
  observer.observe(route, { childList: true, subtree: true });
  route.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", schedule);
  schedule();
  captureBackground();
  return () => {
    observer.disconnect();
    backgroundObserver.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(scrollTimer);
    delete route.dataset.qqStickyScrolling;
    artImage.onload = null;
    clearSnapshot();
    route.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", schedule);
    clipped.forEach(clear);
  };
}

function mountPlaylistActions(route) {
  let restore;
  let group;
  const sync = () => {
    if (group?.isConnected) return;
    const page = route.querySelector(":scope > .entering");
    const favorite = page?.querySelector(".pl-head .pl-actions > .fav-btn");
    const play = page?.querySelector(".sticky-bar__right > .sticky-playall");
    if (!favorite || !play) return;

    const origin = document.createComment("Playlist favorite position");
    favorite.before(origin);
    group = document.createElement("div");
    group.className = "qq-playlist-actions";
    play.before(group);
    group.append(play, favorite);
    restore = () => {
      origin.replaceWith(favorite);
      group.replaceWith(play);
    };
  };
  const observer = new MutationObserver(sync);
  observer.observe(route, { childList: true, subtree: true });
  sync();
  return () => {
    observer.disconnect();
    if (group?.isConnected) restore();
  };
}

function mountTintOption(route, isGreen, setGreen) {
  let cards;
  let button;
  const selectNativeTint = event => {
    if (event.target.closest("button[data-opt]") && isGreen()) {
      setGreen(false);
    }
  };
  const detach = () => {
    cards?.removeEventListener("click", selectNativeTint);
    button?.remove();
  };
  const sync = () => {
    const next = route.querySelector("#tint-cards");
    if (next !== cards) {
      detach();
      cards = next;
      if (!cards) return;
      button = document.createElement("button");
      button.type = "button";
      button.className = "opt-card qq-tint-option";
      button.textContent = "原印象·绿";
      button.onclick = () => setGreen(true);
      cards.append(button);
      cards.addEventListener("click", selectNativeTint);
    }
    if (!button?.isConnected) return;
    const selected = isGreen();
    button.classList.toggle("sel", selected);
    button.setAttribute("aria-pressed", String(selected));
  };
  const observer = new MutationObserver(sync);
  observer.observe(route, { childList: true, subtree: true });
  sync();
  return {
    sync,
    dispose() {
      observer.disconnect();
      detach();
    },
  };
}

function mountProgress(bar) {
  const middle = bar.querySelector(".pb-mid");
  const time = bar.querySelector("#pb-time");
  const loopMenu = bar.querySelector(".pb-lpop");
  const controls = ["#pb-loop", "#pb-prev", "#pb-play", "#pb-next", ".pb-volhost"]
    .map(selector => bar.querySelector(selector));
  if (!middle || !time || controls.some(control => !control)) return;

  const transport = document.createElement("div");
  transport.className = "qq-transport";
  const slots = controls.map(control => {
    const slot = document.createComment("Original player control position");
    control.before(slot);
    transport.append(control);
    return slot;
  });
  const loopSlot = document.createComment("Original playback mode menu position");
  if (loopMenu) {
    const loopHost = document.createElement("div");
    loopHost.className = "qq-loophost";
    loopMenu.before(loopSlot);
    controls[0].before(loopHost);
    loopHost.append(controls[0], loopMenu);
  }

  const progress = document.createElement("div");
  progress.className = "qq-progress";
  const elapsed = document.createElement("span");
  const duration = document.createElement("span");
  const slider = document.createElement("input");
  slider.type = "range";
  slider.max = "100";
  slider.step = "0.1";
  slider.setAttribute("aria-label", "播放进度");
  progress.append(elapsed, slider, duration);
  middle.append(transport, progress);

  let forwarding = false;
  const events = new AbortController();
  const options = { signal: events.signal };
  const paint = () => slider.style.setProperty("--qq-progress", slider.value + "%");
  const sync = () => {
    const [current = "0:00", total = "0:00"] = time.textContent.split(" / ");
    elapsed.textContent = current;
    duration.textContent = total;
    slider.disabled = !total.split(":").some(part => Number(part) > 0);
    if (!slider.matches(":active")) {
      slider.value = String(100 * (Number(bar.style.getPropertyValue("--pf")) || 0));
      slider.setAttribute("aria-valuetext", current + " / " + total);
      paint();
    }
  };

  bar.addEventListener("pointerdown", event => {
    if (!forwarding && !event.target.closest("button, input, .pb-volpop, .pb-qpop, .pb-lpop")) {
      event.stopImmediatePropagation();
    }
  }, { ...options, capture: true });
  slider.addEventListener("input", paint, options);
  slider.addEventListener("change", () => {
    const bounds = bar.getBoundingClientRect();
    const clientX = bounds.left + 1 + (bounds.width - 2) * Number(slider.value) / 100;
    // Delegate the seek and transport settling to the existing player bar.
    forwarding = true;
    try {
      for (const type of ["pointerdown", "pointerup"]) {
        bar.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX, pointerId: -1 }));
      }
    } finally {
      forwarding = false;
    }
  }, options);

  const observer = new MutationObserver(sync);
  observer.observe(bar, { attributes: true, attributeFilter: ["style"] });
  observer.observe(time, { childList: true, subtree: true, characterData: true });
  sync();

  return () => {
    observer.disconnect();
    events.abort();
    slots.forEach((slot, index) => slot.replaceWith(controls[index]));
    if (loopMenu) loopSlot.replaceWith(loopMenu);
    transport.remove();
    progress.remove();
  };
}

function mountLikedAlbums(route, log) {
  const entry = document.querySelector('script[type="module"][src]')?.src;
  if (!entry || new URL(entry).origin !== location.origin) return;

  let player;
  let stopped = false;
  const sync = () => {
    if (!player || !route.querySelector(".pl-head .liked-cover")) return;
    const albums = new Map(player.likedCache?.map(song => [String(song.mid), song.album]));
    for (const row of route.querySelectorAll(".rows > .row[data-songkey]")) {
      const meta = row.querySelector(".rmeta");
      const album = albums.get(row.dataset.songkey);
      if (!meta || meta.querySelector(".ral") || !album?.name) continue;
      const cell = document.createElement("span");
      cell.className = "ral qq-liked-album";
      if (album.mid) {
        const link = document.createElement("a");
        link.className = "meta-link";
        link.dataset.link = `album:${album.mid}:${album.name}`;
        link.title = album.name;
        link.textContent = album.name;
        cell.append(link);
      } else {
        cell.textContent = album.name;
      }
      meta.append(cell);
    }
  };

  const observer = new MutationObserver(sync);
  import(entry).then(module => {
    if (stopped) return;
    player = Object.values(module).find(value => typeof value?.loadLoved === "function" && "likedCache" in value);
    if (!player) return;
    observer.observe(route, { childList: true, subtree: true });
    sync();
  }).catch(error => log?.warn("无法读取 Quaver 收藏缓存", error));

  return () => {
    stopped = true;
    observer.disconnect();
    route.querySelectorAll(".qq-liked-album").forEach(cell => cell.remove());
  };
}

function coverPalette(image) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, 32, 32);
  const { data } = context.getImageData(0, 0, 32, 32);
  const hues = Array(24).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = data.subarray(i, i + 3);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const chroma = max - min;
    if (data[i + 3] < 128 || chroma < 22 || max < 48) continue;
    const hue = max === r ? (g - b) / chroma : max === g ? 2 + (b - r) / chroma : 4 + (r - g) / chroma;
    const bucket = Math.floor(((hue + 6) % 6) * 4);
    hues[bucket] += (chroma / 255) ** 1.7;
  }
  const scores = hues.map((weight, i) => weight + .5 * (hues[(i + 23) % 24] + hues[(i + 1) % 24]));
  const primary = scores.indexOf(Math.max(...scores));
  if (scores[primary] < .35) return null;
  const secondary = scores.reduce((best, weight, i) => {
    const distance = Math.abs(i - primary);
    return distance >= 3 && distance <= 21 && weight > (scores[best] ?? scores[primary] * .12) ? i : best;
  }, -1);
  const hue = primary * 15 + 7.5;
  const secondHue = secondary < 0 ? hue : secondary * 15 + 7.5;
  return {
    accent: `hsl(${hue} 83% 64%)`,
    left: `hsl(${hue} 42% 17%)`,
    right: `hsl(${secondHue} 36% 19%)`,
  };
}

function mountPlaybackAppearance(page) {
  const cover = page.querySelector(".np-cover");
  if (!cover) return;
  const root = document.body;
  const collapse = document.createElement("button");
  collapse.className = "qq-np-collapse";
  collapse.type = "button";
  collapse.title = "收起播放页";
  collapse.setAttribute("aria-label", collapse.title);
  collapse.innerHTML = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path d="m3 8 9 9 9-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  collapse.onclick = () => {
    const coverButton = document.getElementById("pb-cover");
    coverButton?.click();
    coverButton?.focus({ preventScroll: true });
  };
  page.append(collapse);
  const paletteProperties = ["--qq-cover-accent", "--qq-cover-left", "--qq-cover-right"];
  const clearPalette = () => {
    paletteProperties.forEach(property => root.style.removeProperty(property));
    delete page.dataset.qqCoverPalette;
  };
  let source;
  let stopped = false;
  let frame;
  let lastPaint = -Infinity;
  let words = new Set();

  const clearWord = word => {
    delete word.dataset.qqKaraokeWord;
    delete word.dataset.qqKaraokeNative;
    for (const property of ["--qq-word-gradient", "--qq-word-position", "--qq-word-size", "--qq-word-played"]) {
      word.style.removeProperty(property);
    }
  };

  const paintLyrics = now => {
    frame = requestAnimationFrame(paintLyrics);
    if (now - lastPaint < 30) return;
    lastPaint = now;
    const next = new Set();
    for (const word of page.querySelectorAll('.np-kara-host [class*="_gradientMask"] [style*="mask-image"]')) {
      const line = word.closest('[class*="_lyricMainLine"]');
      if (!line?.matches('[class*="_active"]')) continue;
      const mask = word.style.maskImage;
      if (!mask.includes("--bright-mask-alpha") || !mask.includes("--dark-mask-alpha")) continue;
      const { maskPosition, maskSize } = getComputedStyle(word);
      // Layered glyphs keep their native layout, with color driven by mask progress.
      if (word.childElementCount) {
        const position = maskPosition.split(" ")[0];
        const size = maskSize.split(" ")[0];
        const width = word.offsetWidth;
        const progress = width && position.endsWith("px") && size.endsWith("%")
          ? (parseFloat(position) / width + parseFloat(size) / 200) * 100
          : 0;
        const played = Math.round(Math.max(0, Math.min(100, progress))) + "%";
        if (word.style.getPropertyValue("--qq-word-played") !== played) {
          word.style.setProperty("--qq-word-played", played);
        }
        if (!word.hasAttribute("data-qq-karaoke-native")) word.dataset.qqKaraokeNative = "";
        if (word.hasAttribute("data-qq-karaoke-word")) delete word.dataset.qqKaraokeWord;
        next.add(word);
        continue;
      }
      const gradient = mask
        .replace(/rgba?\([^)]*var\(--bright-mask-alpha[^)]*\)\)/g, "var(--qq-playing-lyric)")
        .replace(/rgba?\([^)]*var\(--dark-mask-alpha[^)]*\)\)/g, "var(--amll-lp-color)");
      if (gradient.includes("-mask-alpha")) continue;
      if (word.style.getPropertyValue("--qq-word-gradient") !== gradient) {
        word.style.setProperty("--qq-word-gradient", gradient);
      }
      if (word.style.getPropertyValue("--qq-word-position") !== maskPosition) {
        word.style.setProperty("--qq-word-position", maskPosition);
      }
      if (!words.has(word) || word.style.getPropertyValue("--qq-word-size") !== maskSize) {
        word.style.setProperty("--qq-word-size", maskSize);
      }
      if (!word.hasAttribute("data-qq-karaoke-word")) word.dataset.qqKaraokeWord = "";
      if (word.hasAttribute("data-qq-karaoke-native")) delete word.dataset.qqKaraokeNative;
      next.add(word);
    }
    for (const word of words) if (!next.has(word)) clearWord(word);
    words = next;
  };

  const sync = () => {
    if (!page.classList.contains("open")) {
      cancelAnimationFrame(frame);
      frame = undefined;
      words.forEach(clearWord);
      words.clear();
      return;
    }
    if (frame === undefined) frame = requestAnimationFrame(paintLyrics);
    const url = cover.querySelector("img")?.src;
    if (url === source) return;
    source = url;
    clearPalette();
    if (!url) return;
    const image = new Image();
    const coverUrl = new URL(url);
    image.src = /^https?:$/.test(coverUrl.protocol) && coverUrl.origin !== location.origin
      ? "/api/img?u=" + encodeURIComponent(url)
      : url;
    image.decode().then(() => {
      if (stopped || source !== url) return;
      const palette = coverPalette(image);
      if (!palette) return;
      paletteProperties.forEach((property, i) => root.style.setProperty(property, Object.values(palette)[i]));
      page.dataset.qqCoverPalette = "";
    }).catch(() => {}); // Keep the blurred host background when the image cannot be sampled.
  };

  const observer = new MutationObserver(sync);
  observer.observe(page, { attributes: true, attributeFilter: ["class"] });
  observer.observe(cover, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  sync();
  return () => {
    stopped = true;
    observer.disconnect();
    cancelAnimationFrame(frame);
    collapse.remove();
    words.forEach(clearWord);
    clearPalette();
  };
}

export default {
  id: themeId,
  name,
  version: "0.1.81",
  minHostVersion: "1.7.0",
  kind: "third-party",
  description: "原印象，复刻熟悉的桌面音乐播放器外观。",
  setup(ctx) {
    ctx.registerTheme({
      id: themeId,
      name,
      css: "",
      tint: { mode: "host" },
      background: { mode: "host" },
      menus: { mode: "host" },
      controlBar: { mode: "host" },
      playlistMode: { mode: "host" },
    });

    const root = document.documentElement;
    let disposeAppearance;
    const isGreen = () => ctx.storage.get("highlight") !== "host";
    const syncTheme = () => {
      if (root.dataset.sparkleTheme !== themeId) {
        disposeAppearance?.();
        disposeAppearance = undefined;
        return;
      }
      if (disposeAppearance) return;

      const removeStyles = ctx.style.register({ id: themeId, css: themeCss, order: 1000 });
      const applyHighlight = () => root.toggleAttribute("data-original-imprint-green", isGreen());
      applyHighlight();

      const bar = document.getElementById("player-bar");
      const route = document.getElementById("route");
      const page = document.querySelector("body > .np");
      const tintOption = route && mountTintOption(route, isGreen, enabled => {
        ctx.storage.set("highlight", enabled ? "green" : "host");
        applyHighlight();
        tintOption?.sync();
      });
      const cleanup = [
        bar && mountProgress(bar),
        route && mountLikedAlbums(route, ctx.log),
        route && mountStickyClip(route),
        route && mountPlaylistActions(route),
        page && mountPlaybackAppearance(page),
      ];
      disposeAppearance = () => {
        for (const dispose of cleanup) dispose?.();
        tintOption?.dispose();
        root.removeAttribute("data-original-imprint-green");
        removeStyles();
      };
    };
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-sparkle-theme"] });
    syncTheme();
    return () => {
      observer.disconnect();
      disposeAppearance?.();
    };
  },
};
