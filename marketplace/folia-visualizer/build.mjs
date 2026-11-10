// Builds the self-contained runtime that index.ts imports. Run from this folder:
//   node build.mjs && node ../../scripts/build-marketplace.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, symlinkSync } from 'node:fs';

const plugin = dirname(fileURLToPath(import.meta.url));
const ui = join(plugin, '../../../../ui');
const sparkle = join(plugin, '../..');
const runtime = join(plugin, 'runtime');
const modules = join(plugin, 'node_modules');

if (!existsSync(modules)) {
    symlinkSync(join(ui, 'node_modules'), modules, process.platform === 'win32' ? 'junction' : 'dir');
}

const { build } = await import('vite');
const { default: tailwindcss } = await import('@tailwindcss/vite');

await build({
    configFile: false,
    root: ui,
    publicDir: false,
    plugins: [tailwindcss()],
    resolve: {
        alias: [
            { find: /^@quaver\/sparkle\//, replacement: sparkle + '/' },
            { find: '@quaver/sparkle', replacement: join(sparkle, 'sdk/index.ts') },
            { find: /^@\//, replacement: join(runtime, 'vendor/Folia/src/') },
            { find: 'virtual:folia-locale-zh-TW', replacement: join(runtime, 'vendor/Folia/src/i18n/locales/zh-CN.ts') },
        ],
    },
    define: {
        __BUILD_COMMIT__: JSON.stringify('folia-port'),
        __BUILD_REPO__: JSON.stringify('quaver'),
        'process.env.NODE_ENV': JSON.stringify('production'),
        'process.env': JSON.stringify({}),
        global: 'globalThis',
    },
    build: {
        outDir: plugin,
        emptyOutDir: false,
        cssCodeSplit: false,
        assetsInlineLimit: 1_000_000_000,
        minify: 'esbuild',
        target: 'chrome120',
        lib: {
            entry: join(runtime, 'index.tsx'),
            formats: ['es'],
            fileName: () => 'runtime.js',
        },
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
            },
        },
    },
    logLevel: 'warn',
});

console.log('folia-visualizer runtime built');
