// quaver-sparkle — Marketplace 构建脚本
//
// 扫描 marketplace/<id>/（plugin.json 元数据 + index.ts 入口），用 esbuild 打成单文件
// ESM（default export 插件对象），汇总产出可直接整树拷进 quaver-doc 站点
// （Team-Quaver/quaver-website，即 quaver.0w0.red）的 dist/site/：
//
//   dist/site/marketplace.json          ← 索引（宿主固定拉 https://quaver.0w0.red/marketplace.json）
//   dist/site/sparkle/plugins/<id>.js   ← 各插件安装包（索引 download 字段指向这里）
//
// 用法：node scripts/build-marketplace.mjs [--base https://quaver.0w0.red/]
//   --base / QUAVER_MARKET_BASE 覆盖 download 的站点前缀（默认官方站点，需带尾斜杠）。
// 任何插件校验/构建失败 → 非零退出（CI 门禁：坏插件不许上站）。
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MARKET_DIR = join(ROOT, "marketplace");
const OUT = join(ROOT, "dist", "site");

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const CATEGORIES = ["theme", "plugin", "extension"];

// esbuild 是本仓库唯一 devDependency（CI 里 pnpm install 提供）。作为 submodule 挂在
// quaver 检出里本地验证时，退回宿主的 ui/node_modules 借一份。
function loadEsbuild() {
  const bases = [join(ROOT, "node_modules"), join(ROOT, "..", "ui", "node_modules")];
  for (const base of bases) {
    try {
      return createRequire(join(base, "noop.js"))("esbuild");
    } catch { /* 试下一个位置 */ }
  }
  throw new Error("找不到 esbuild —— 在本仓库根 pnpm install，或挂在 quaver 检出内借 ui/node_modules");
}

// --base / QUAVER_MARKET_BASE：索引里 download 字段的站点前缀
const argvBase = (() => {
  const at = process.argv.indexOf("--base");
  return at >= 0 ? process.argv[at + 1] : undefined;
})();
const BASE = String(argvBase ?? process.env.QUAVER_MARKET_BASE ?? "https://quaver.0w0.red/");
if (!BASE.endsWith("/")) throw new Error(`--base 必须带尾斜杠（当前：${BASE}）`);

const fail = (msg) => {
  console.error(`FAIL ${msg}`);
  process.exit(1);
};

if (!existsSync(MARKET_DIR)) fail("marketplace/ 目录不存在");
await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, "sparkle", "plugins"), { recursive: true });

const esbuild = loadEsbuild();
const plugins = [];

for (const name of (await readdir(MARKET_DIR, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)) {
  const dir = join(MARKET_DIR, name);
  const metaPath = join(dir, "plugin.json");
  if (!ID_RE.test(name)) fail(`${name}: 目录名必须匹配 ${ID_RE}`);
  if (!existsSync(metaPath)) fail(`${name}: 缺 plugin.json`);
  let meta;
  try {
    meta = JSON.parse(await readFile(metaPath, "utf8"));
  } catch (e) {
    fail(`${name}: plugin.json 不是合法 JSON —— ${e.message}`);
  }
  if (meta.id !== name) fail(`${name}: plugin.json 的 id（${meta.id}）必须与目录名一致`);
  if (typeof meta.name !== "string" || !meta.name.trim()) fail(`${name}: 缺 name`);
  if (typeof meta.version !== "string" || !meta.version.trim()) fail(`${name}: 缺 version`);
  const category = meta.category ?? "plugin";
  if (!CATEGORIES.includes(category)) fail(`${name}: category 必须是 ${CATEGORIES.join(" / ")}（当前：${category}）`);

  const entry = join(dir, "index.ts");
  if (!existsSync(entry)) fail(`${name}: 缺入口 index.ts`);
  const outfile = join(OUT, "sparkle", "plugins", `${name}.js`);
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "chrome120",
    minify: true,
    legalComments: "none",
    outfile,
    logLevel: "warning",
  });
  const buf = await readFile(outfile);
  if (!buf.length) fail(`${name}: 构建产物为空`);
  const hash = createHash("sha256").update(buf).digest("hex");
  plugins.push({
    id: name,
    name: meta.name,
    version: meta.version,
    author: meta.author ?? undefined,
    description: meta.description ?? undefined,
    category,
    download: `${BASE}sparkle/plugins/${name}.js`,
    homepage: meta.homepage ?? undefined,
    hash,
  });
  console.log(`BUILD ${name} v${meta.version} [${category}] ${(buf.length / 1024).toFixed(1)} KB sha256=${hash.slice(0, 12)}…`);
}

plugins.sort((a, b) => a.id.localeCompare(b.id));
const index = {
  version: 1,
  updated: new Date().toISOString(),
  plugins,
};
const indexPath = join(OUT, "marketplace.json");
await writeFile(indexPath, JSON.stringify(index, null, 2) + "\n");
console.log(`\nOK ${plugins.length} 个插件 → ${indexPath}`);
console.log(`   站点树 ${OUT}/ 可整树拷进 quaver-doc 的 public/`);
