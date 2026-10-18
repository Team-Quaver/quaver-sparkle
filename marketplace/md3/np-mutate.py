#!/usr/bin/env python3
"""Lumen 正在播放页回归（ui/scripts/verify-lumen-np.ts）的变异负向测试。

selfcheck.mutate.py 只能证明「CSS 字符串还在」；浅色歌词到底读不读得出、封面投影到底
看不看得见，是浏览器里算出来的 —— 所以那批断言也要各配一个「改坏 → 必须报红 → 还原」：
把插件源码临时改成错误版本 → 重新打包 → 跑真浏览器回归 → 期望非零退出且报的是**对应**那条
→ 还原并校验 sha256 与改前一致（顺手证明 dist 里那份是被还原后的构建覆盖的）。

跑法：cd vendor/Sparkle/marketplace/md3 && python3 np-mutate.py
（慢，约十几次 esbuild + 无头 Chrome；改动 verify-lumen-np.ts 的断言后跑一遍。）
"""
import hashlib
import pathlib
import shutil
import subprocess
import sys

PLUGIN = pathlib.Path(__file__).resolve().parent
SPARKLE = PLUGIN.parents[1]
UI = SPARKLE.parents[1] / "ui"   # vendor/Sparkle → 仓库根 → ui
FILES = ["index.ts", "tokens.ts"]
NODE = shutil.which("node") or "node"


def sha(p: pathlib.Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def build() -> None:
    r = subprocess.run([NODE, str(SPARKLE / "scripts/build-marketplace.mjs")], cwd=SPARKLE,
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit("打包失败：\n" + r.stdout + r.stderr)


def verify() -> tuple[int, str]:
    r = subprocess.run([NODE, "scripts/verify-lumen-np.ts"], cwd=UI, capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr


originals = {f: (PLUGIN / f).read_bytes() for f in FILES}
hashes = {f: sha(PLUGIN / f) for f in FILES}

# (说明, 文件, 原文, 替换文, 期望报红的断言关键词)
MUTATIONS = [
    ("留着 AMLL 的 plus-lighter 加光混合（浅色 surface 上歌词洗白）", "index.ts",
     "    & .np-kara-host .amll-lyric-player { mix-blend-mode: normal; }\n", "",
     "AMLL 仍在 plus-lighter 混合"),
    ("歌词墨色退回宿主那套掺白亮色", "index.ts",
     "--amll-lp-color: color-mix(in srgb, var(--md-primary) 55%, var(--md-on-surface));",
     "--amll-lp-color: color-mix(in srgb, var(--md-primary) 55%, #fff);",
     "已唱部分对比"),
    ("未唱遮罩 / 辅助行浓度不抬（引擎的自发光档位留在浅色页上）", "index.ts",
     '    & .np-kara-host [class*="lyricLineWrapper"] { --bright-mask-alpha: 1; --dark-mask-alpha: .65; }\n'
     '    & .np-kara-host [class*="lyricSubLine"] { opacity: .7; }\n', "",
     "未唱部分对比"),
    ("歌词留着深色页的 text-shadow", "index.ts",
     "      text-shadow: none;\n", "",
     "接管态歌词还挂着深色页的 text-shadow"),
    ("封面不换成 Tint 派生投影（沿用宿主那条 rgba(0,0,0,.4)）", "index.ts",
     "    & .np-cover-wrap::before { box-shadow: var(--md-elev-cover); }\n", "",
     "封面投影不是 Tint 派生的 lch()"),
    # 写成「合法形状但没浓度」的灰：字符串检查放行，深色像素那把尺必须把它拦下 ——
    # 这条才是「投影改回近黑」在浏览器层的等价回归（rgba(0,0,0,…) 那种写法由 selfcheck 拦，
    # 它连 lch(from var(--md-source)) 的形状都不满足，早就红了，轮不到这里）。
    ("深色封面档洗成无彩灰（形状仍是 Tint 派生，但 tone 6 底上没差别）", "tokens.ts",
     "  dark: `0 20px 60px ${shadowColor(34, 46, 0.55)}, 0 6px 18px ${shadowColor(26, 36, 0.5)}`,",
     "  dark: `0 20px 60px ${shadowColor(7, 0, 0.5)}, 0 6px 18px ${shadowColor(6, 0, 0.4)}`,",
     "封面投影看不出差别"),
    ("投影颜色不跟源色（写死一个色相）", "tokens.ts",
     "const shadowColor = (tone: number, chroma: number, alpha: number) =>\n"
     "  `lch(from var(--md-source) ${tone} ${chroma} h / ${alpha})`;",
     "const shadowColor = (tone: number, chroma: number, alpha: number) =>\n"
     "  `lch(${tone} ${chroma} 300 / ${alpha})`;",
     "投影色相不跟 Tint"),
    ("播放/暂停的开关被主题改写（暂停也留影）", "index.ts",
     "    & .np-cover-wrap::before { box-shadow: var(--md-elev-cover); }",
     "    & .np-cover-wrap::before { box-shadow: var(--md-elev-cover); opacity: 1; }",
     "暂停后投影没收回"),
    ("浅底上的音质胶囊没翻面（白字压浅底）", "index.ts",
     "      color: var(--md-on-surface-variant);\n    }\n    & .np-qpill:hover",
     "      color: #fffb;\n    }\n    & .np-qpill:hover",
     "音质胶囊文字对比"),
    ("深空黑那态也吃浅色的歌词翻面（引擎默认口径被误伤）", "index.ts",
     '&[data-md3-np="on"][data-md3-np-color="theme"] .np {',
     '&[data-md3-np="on"] .np {',
     "深空黑"),
]

failures = []
for label, fname, old, new, keyword in MUTATIONS:
    path = PLUGIN / fname
    src = originals[fname].decode("utf8")
    if old not in src:
        failures.append(f"{label}: 找不到待替换片段（变异未生效）")
        continue
    path.write_text(src.replace(old, new, 1), encoding="utf8")
    try:
        build()
        code, out = verify()
    finally:
        path.write_bytes(originals[fname])
        build()
    if code == 0:
        failures.append(f"{label}: 变异后回归仍然全绿 —— 断言写松了，没抓到")
        continue
    hit = [l for l in out.splitlines() if "AssertionError" in l or l.startswith("AssertionError")]
    msg = "\n".join(out.splitlines())
    if keyword not in msg:
        first = next((l for l in out.splitlines() if "Error" in l or "assert" in l.lower()), "")
        failures.append(f"{label}: 报了红但与期望断言无关 —— 期望含「{keyword}」，实际首行 {first[:120]}")
        continue
    print(f"OK   {label}\n       → 报红含「{keyword}」")

for f in FILES:
    now = sha(PLUGIN / f)
    if now != hashes[f]:
        failures.append(f"{f}: 还原后 sha256 不一致（{hashes[f][:12]} → {now[:12]}）")
    else:
        print(f"OK   还原 {f} sha256={now[:12]}… 与改前一致")

code, _ = verify()
if code != 0:
    failures.append("还原后回归未回到全绿")

print()
if failures:
    for x in failures:
        print(f"FAIL {x}")
    sys.exit(1)
print(f"变异负向测试全部通过（{len(MUTATIONS)} 个变异，均被对应断言抓到）")
