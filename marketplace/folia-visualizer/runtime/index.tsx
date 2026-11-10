// Folia 歌词动效 — marketplace runtime. Self-contained: React, Pixi, three and the CSS
// are bundled here; the plugin entry only wires it to Sparkle's now-playing view API.
// The host CSP forbids unsafe-eval; Pixi 8's polyfill removes its eval-based shader/uniform
// code generation and must be installed before any renderer is initialized.
import 'pixi.js/unsafe-eval';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { SparkleNpViewCtx, SparkleStorage } from '@quaver/sparkle';
import { FoliaView } from './view';
import visualizerCss from './visualizer.css?inline';
import pluginCss from './plugin.css?inline';

export interface FoliaMount {
    destroy(): void;
}

export function mountFolia(
    host: HTMLElement,
    np: SparkleNpViewCtx,
    storage: SparkleStorage,
    onExit: () => void,
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
    root.render(createElement(FoliaView, { np, storage, onExit, onCollapse }));

    return {
        destroy() {
            root.unmount();
            shadow.replaceChildren();
        },
    };
}
