// Builds the self-contained runtime that index.ts imports. Run from this folder:
//   pnpm install && node build.mjs && node ../../scripts/build-marketplace.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, lstatSync, renameSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';

const plugin = dirname(fileURLToPath(import.meta.url));
const sparkle = join(plugin, '../..');
const runtime = join(plugin, 'runtime');
const modules = join(plugin, 'node_modules');
const out = join(plugin, '.runtime-build');

if (!existsSync(modules)) {
    // 旧提交里误留过指向绝对路径的 node_modules 符号链接；断链时先清掉再重建。
    try {
        if (lstatSync(modules).isSymbolicLink()) unlinkSync(modules);
    } catch { /* 路径不存在 */ }
    // 在主仓库里开发时可直接借用 ui/node_modules；独立 checkout（CI）要求先在该目录安装依赖。
    const hostModules = join(plugin, '../../../../ui/node_modules');
    if (!existsSync(hostModules)) {
        throw new Error('缺少构建依赖：先在 marketplace/folia-visualizer 执行 pnpm install');
    }
    symlinkSync(hostModules, modules, process.platform === 'win32' ? 'junction' : 'dir');
}

const { build } = await import('vite');
const { default: tailwindcss } = await import('@tailwindcss/vite');

rmSync(out, { recursive: true, force: true });

await build({
    configFile: false,
    root: plugin,
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
        outDir: out,
        emptyOutDir: true,
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

const bundled = join(out, 'runtime.js');
if (!existsSync(bundled)) throw new Error('构建完成但找不到 runtime.js');
rmSync(join(plugin, 'runtime.js'), { force: true });
renameSync(bundled, join(plugin, 'runtime.js'));
rmSync(out, { recursive: true, force: true });

console.log('folia-visualizer runtime built');
