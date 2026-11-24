// Folia 歌词动效 — marketplace runtime. Self-contained: React, Pixi, three and the CSS
// are bundled here; the plugin entry only wires it to Sparkle's now-playing view API.
// The host CSP forbids unsafe-eval; Pixi 8's polyfill removes its eval-based shader/uniform
// code generation and must be installed before any renderer is initialized.
import 'pixi.js/unsafe-eval';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { SparkleNpViewCtx, SparkleStorage, SparkleTransportCtx } from '@quaver/sparkle';
import { FoliaView } from './view';
import { FoliaControl } from './control';
import { bindFoliaStorage } from './prefs';
import visualizerCss from './visualizer.css?inline';
import pluginCss from './plugin.css?inline';
import controlCss from './control.css?inline';

export interface FoliaMount {
    destroy(): void;
}

/** 正在播放页：整页接管（舞台 / Lattice 两面由插件偏好在内部切换）。 */
export function mountFolia(
    host: HTMLElement,
    np: SparkleNpViewCtx,
    storage: SparkleStorage,
    onCollapse: () => void,
): FoliaMount {
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    shadow.replaceChildren();

    const style = document.createElement('style');
    style.textContent = `${visualizerCss}\n${pluginCss}`;
    const mount = document.createElement('div');
    mount.className = 'fvr-stage';
    shadow.append(style, mount);

    const root: Root = createRoot(mount);
    root.render(createElement(FoliaView, { np, storage, onCollapse }));

    return {
        destroy() {
            root.unmount();
            shadow.replaceChildren();
        },
    };
}

// —— 控制面板样式：走带浮窗与设置页共用同一份（引用计数，最后一位用户摘掉） ——

let controlCssRefs = 0;
let controlCssEl: HTMLStyleElement | null = null;

/** 需要 `.fvr-panel` 那套样式时调一次（与 releaseFoliaControlCss 成对）。 */
export function ensureFoliaControlCss(): void {
    controlCssRefs += 1;

    if (controlCssEl) return;
    controlCssEl = document.createElement('style');
    controlCssEl.dataset.foliaControlCss = '';
    controlCssEl.textContent = controlCss;
    document.head.append(controlCssEl);
}

/** 释放一次引用；归零时把那张 <style> 摘掉（停用插件不留残渣）。 */
export function releaseFoliaControlCss(): void {
    controlCssRefs = Math.max(0, controlCssRefs - 1);

    if (controlCssRefs > 0) return;
    controlCssEl?.remove();
    controlCssEl = null;
}

/**
 * 走带控制浮窗：把控制面板挂进宿主播放条上那颗按钮的浮窗。
 *
 * 浮窗不在插件的 Shadow DOM 里（它属于宿主播放条），所以 panel 的 CSS 单独注入
 * document.head —— 选择器统一 `.fvr-panel` 前缀，颜色走宿主令牌，停用时精确摘掉。
 * 返回的 destroy 由宿主在插件停用时调用（React root 卸载 + 摘 CSS）。
 */
export function mountFoliaControl(
    host: HTMLElement,
    storage: SparkleStorage,
    ctx: SparkleTransportCtx,
): FoliaMount {
    bindFoliaStorage(storage);
    ensureFoliaControlCss();

    host.replaceChildren();
    const root: Root = createRoot(host);
    root.render(createElement(FoliaControl, { ctx }));

    return {
        destroy() {
            root.unmount();
            host.replaceChildren();
            releaseFoliaControlCss();
        },
    };
}

// 设置页（宿主设置面板）复用同一套偏好 API；这里转出去，插件入口就不用再猜路径。
export { bindFoliaStorage, onFoliaPrefs, readFoliaPrefs, writeFoliaPref } from './prefs';
export type { FoliaPrefs, FoliaSurface } from './prefs';
