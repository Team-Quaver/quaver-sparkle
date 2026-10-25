#!/usr/bin/env python3
"""Lumen 正在播放页回归（ui/scripts/verify-lumen-np.ts）的变异负向测试。

曾经用于主题化播放页的浅色歌词 / 封面投影回归：改坏插件源码 → 重新打包 → 跑真浏览器
回归 → 期望非零退出 → 还原并校验 sha256。当前口径是 Lumen 不接管正在播放页，保留
流程骨架。

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

# 正在播放页固定 Quaver Design 后没有可变异的主题化片段；保留骨架，未来重新引入
# 主题化播放页时按「改坏 → 必须报红 → 还原」补回对应样例。
MUTATIONS = []
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
