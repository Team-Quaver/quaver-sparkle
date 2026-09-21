// Quaver Sparkle — 官方示例插件：Die For You
//
// 在设置页 Sparkle tab 展示一句《Die For You》（Grabbitz，VALORANT Champions 2022
// 主题曲）的随机歌词行，点击「换一句」随机切换。本插件同时是 SDK 用法示例：
// 演示 registerSettingsSection 的最小集成与 dispose 的写法。
import { definePlugin } from "@quaver/sparkle";

/** 歌词节选（原文片段，仅作随机展示用） */
const LINES: readonly string[] = [
  "Time slows down when it can get no worse",
  "I can feel it running out on me",
  "Now there's only one thing I can do",
  "Fight until the end like I promised to",
  "Wishin' there was something left to lose",
  "This could be the day I die for you",
  "What do you see before it's over?",
  "Blinding flashes getting closer",
  "Everything I know, everything I hold tight",
  "When I gotta live, when I gotta die",
  "Feeling like there's nothing I can do",
  "This could be the end, it's mine to choose",
  "Don't let it be the day…",
];

const randomLine = (exclude?: string): string => {
  // 避免连续两次抽到同一句（列表里挑一个不同的）
  if (LINES.length <= 1) return LINES[0] ?? "";
  let line = exclude;
  while (line === exclude) line = LINES[Math.floor(Math.random() * LINES.length)];
  return line ?? "";
};

export default definePlugin({
  id: "die-for-you",
  name: "Die For You 歌词",
  version: "1.0.0",
  author: "quaver",
  description: "在设置页随机展示一句《Die For You》（VALORANT Champions 2022 主题曲）歌词",
  kind: "official",
  setup(ctx) {
    ctx.log.info("loaded");
    ctx.registerSettingsSection({
      id: "dfy-line",
      title: "Die For You",
      render(box) {
        const quote = document.createElement("p");
        quote.style.cssText = "margin:4px 0 10px;font-size:1.05em;letter-spacing:.02em";
        quote.textContent = randomLine();

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ghost-btn ghost-btn--quiet";
        btn.textContent = "换一句";
        btn.onclick = () => {
          quote.textContent = randomLine(quote.textContent ?? undefined);
        };

        const note = document.createElement("p");
        note.className = "muted";
        note.style.cssText = "margin:8px 0 0;font-size:.85em";
        note.textContent = "Grabbitz — VALORANT Champions 2022 主题曲";

        box.append(quote, btn, note);
        // 本插件无需要清理的资源；有监听/定时器时在这里返回清理函数
      },
    });
  },
});
