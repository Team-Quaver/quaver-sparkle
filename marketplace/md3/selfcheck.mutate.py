#!/usr/bin/env python3
"""md3 自检的变异负向测试。

对每条关键断言，把插件源码临时改成「错误版本」→ 重跑 selfcheck.mjs 必须报红 →
还原源码 → 校验 sha256 与改前一致。断言写松（正则兜得太宽）会在这里露馅。

跑法：
    cd vendor/Sparkle/marketplace/md3 && python3 selfcheck.mutate.py
（python3 只是拿来改文件的，逻辑与插件运行时无关。）
"""
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys

PLUGIN = pathlib.Path(__file__).resolve().parent
FILES = ["index.ts", "tokens.ts", "plugin.json"]

# node：优先用 PATH 里的，找不到再试托管的绝对路径
NODE = shutil.which("node") or "/home/ne0w0r1d/.workbuddy/binaries/node/versions/22.22.2/bin/node"


def sha(p: pathlib.Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def run() -> tuple[int, str]:
    r = subprocess.run([NODE, "selfcheck.mjs"], cwd=PLUGIN, capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr


originals = {f: (PLUGIN / f).read_bytes() for f in FILES}

# 版本号那组变异必须跟着当前版本走：写死一个字面量，等真发版那天它会静默匹配不上，
# 于是「找不到待替换片段」——白跑一条断言（真踩过：脚本里的 1.0.0 早就没人用了）。
META_VERSION = json.loads((PLUGIN / "plugin.json").read_text(encoding="utf8"))["version"]
hashes = {f: sha(PLUGIN / f) for f in FILES}

# (说明, 文件, 原文, 替换文, 期望报红的断言关键词)
MUTATIONS = [
    ("暗色少一个角色（亮/暗不同构）", "tokens.ts",
     '  "on-surface-variant": role(80, 6),\n',
     "",
     "亮/暗角色集同构"),
    ("彩度改成跟源色彩度缩放（退回「比 M3 艳得多」那版）", "tokens.ts",
     "  tertiary: role(40, 20, 60),",
     '  tertiary: role(40, "min(c, 46)" , 60),',
     "tone ∈ [0,100]、彩度"),
    ("源色改回 --cvg-accent（自反环）", "index.ts",
     'const SOURCE_VAR = "var(--cvg-bar-line, #6750a4)";',
     'const SOURCE_VAR = "var(--cvg-accent, #6750a4)";',
     "--md-source"),
    ("源色变量名写错成 --md-seed", "index.ts",
     '  --md-source: ${SOURCE_VAR};',
     '  --md-seed: ${SOURCE_VAR};',
     "--md-seed"),
    ("菜单令牌搬回无 [data-theme] 的基作用域（暗色特异性不足）", "index.ts",
     '  &[data-theme] {\n',
     '  & {\n',
     "菜单令牌"),
    ("版本号两处不一致", "plugin.json",
     f'"version": "{META_VERSION}"',
     f'"version": "{META_VERSION}-x"',
     "version 一致"),
    ("把 category 写进插件对象（SDK 没这字段 → tsc 报 TS2353）", "index.ts",
     '  kind: "third-party",\n',
     '  kind: "third-party",\n  category: "theme",\n',
     "SDK 未定义的字段"),
    ("主题去写宿主地盘的 --cvg-*（会被行内样式压掉）", "index.ts",
     "  --md-source: ${SOURCE_VAR};",
     "  --md-source: ${SOURCE_VAR};\n  --cvg-accent: red;",
     "不写 --cvg-*"),
    ("把亮色 primary 的 tone 抬到 75（白字压不住主色）", "tokens.ts",
     "  primary: role(40, 50),\n",
     "  primary: role(75, 50),\n",
     "对比度全部 ≥ 4.5"),
    ("面板改回半透明玻璃（M3 里没有玻璃）", "index.ts",
     "  --panel: var(--md-surface);",
     "  --panel: color-mix(in srgb, var(--md-surface) 72%, transparent);",
     "面板令牌是实底"),
    ("去掉缩态护栏 :not(.side-collapsed)（会把宿主缩态顶掉）", "index.ts",
     "& body:not(.side-collapsed) .nav a { min-height: 40px; padding: 0 14px; gap: 12px; }",
     "& .nav a { min-height: 40px; padding: 0 14px; gap: 12px; }",
     "缩态护栏"),
    ("歌单封面退回 8px 前导轴（与菜单图标的 14px 错开）", "index.ts",
     "& body:not(.side-collapsed) .pl { min-height: 40px; padding: 4px 14px; }",
     "& body:not(.side-collapsed) .pl { min-height: 40px; padding: 4px 8px; }",
     "歌单封面与上方菜单图标共用"),
    ("队列「正在播放」行不脱染（文字回到被 Tint 的紫字压紫底）", "index.ts",
     "  & .qp-item.cur { color: var(--md-on-secondary-container); }\n",
     "",
     "队列「正在播放」行脱染：文字"),
    ("拖拽态护栏去掉（拖着正在播放那行时不浮起）", "index.ts",
     "& .qp-item.cur:not(.dragging) { background: var(--md-secondary-container); }",
     "& .qp-item.cur { background: var(--md-secondary-container); }",
     "排除拖拽态"),
    ("投影颜色改回纯黑 rgba(0,0,0,…)（深色 tone 6 上画不出差别）", "tokens.ts",
     "    ambient: shadowColor(32, 42, 0.50),",
     '    ambient: "rgba(0,0,0,.50)",',
     "每一级投影都由 --md-source 派生"),
    ("深色那层 ambient 洗成无彩灰（看得见的前提没了，字符串层还是 lch()）", "tokens.ts",
     "    ambient: shadowColor(32, 42, 0.50),",
     "    ambient: shadowColor(7, 0, 0.50),",
     "压在同方案 surface 上都看得见"),
    ("封面档退回宿主浅色那一组给深色用（深空黑/深色方案下投影隐形）", "tokens.ts",
     "  dark: `0 20px 60px ${shadowColor(34, 46, 0.55)}, 0 6px 18px ${shadowColor(26, 36, 0.5)}`,",
     "  dark: `0 20px 60px ${shadowColor(24, 8, 0.12)}, 0 6px 18px ${shadowColor(22, 6, 0.1)}`,",
     "每一级投影（含封面档）压在同方案 surface 上都看得见"),
    ("接管态把封面投影规则摘掉（等于沿用宿主的 #0006）", "index.ts",
     "    & .np-cover-wrap::before { box-shadow: var(--md-elev-cover); }\n",
     "",
     "把封面投影换成 --md-elev-cover"),
    ("AMLL 的加光混合留着（浅色 surface 上歌词整层洗白）", "index.ts",
     "    & .np-kara-host .amll-lyric-player { mix-blend-mode: normal; }\n",
     "",
     "关掉 AMLL 的加光混合"),
    ("歌词墨色回到宿主那套掺白亮色（浅底上等于没字）", "index.ts",
     "      --amll-lp-color: color-mix(in srgb, var(--md-primary) 55%, var(--md-on-surface));",
     "      --amll-lp-color: color-mix(in srgb, var(--md-primary) 55%, #fff);",
     "歌词墨色走 on-surface 家族"),
    ("未唱遮罩不抬浓度（保持引擎按自发光设计的 .4 / .3）", "index.ts",
     '    & .np-kara-host [class*="lyricLineWrapper"] { --bright-mask-alpha: 1; --dark-mask-alpha: .65; }',
     '    & .np-kara-host [class*="lyricLineWrapper"] { --bright-mask-alpha: 1; }',
     "未唱遮罩与辅助行浓度"),
    ("深空黑那态不再顶回深色投影（浅色方案下黑底无影）", "index.ts",
     "    --md-elev-cover: ${COVER_ELEVATION.dark};\n",
     "",
     "深空黑那态把投影令牌顶回深色一组"),
]

failures = []
for label, fname, old, new, keyword in MUTATIONS:
    p = PLUGIN / fname
    src = originals[fname].decode("utf8")
    if old not in src:
        failures.append(f"{label}: 找不到待替换片段（变异未生效）")
        continue
    p.write_text(src.replace(old, new, 1), encoding="utf8")
    code, out = run()
    p.write_bytes(originals[fname])
    if code == 0:
        failures.append(f"{label}: 变异后自检仍然全绿 —— 断言写松了，没抓到")
        continue
    hit = [l for l in out.splitlines() if l.startswith("FAIL") and keyword in l]
    if not hit:
        reds = [l for l in out.splitlines() if l.startswith("FAIL")]
        failures.append(f"{label}: 报了红但与期望断言无关 —— 期望含「{keyword}」，实际 {reds}")
        continue
    print(f"OK   {label}\n       → {hit[0]}")

# 还原校验
for f in FILES:
    now = sha(PLUGIN / f)
    if now != hashes[f]:
        failures.append(f"{f}: 还原后 sha256 不一致（{hashes[f][:12]} → {now[:12]}）")
    else:
        print(f"OK   还原 {f} sha256={now[:12]}… 与改前一致")

code, _ = run()
if code != 0:
    failures.append("还原后自检未回到全绿")

print()
if failures:
    for x in failures:
        print(f"FAIL {x}")
    sys.exit(1)
print(f"变异负向测试全部通过（{len(MUTATIONS)} 个变异，均被对应断言抓到）")
