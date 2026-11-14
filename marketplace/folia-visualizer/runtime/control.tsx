// Folia 歌词动效 —— 走带控制浮窗（播放条右侧那颗按钮的内容）
//
// 这里就是原先「正在播放页里的控制条」：按用户要求整条搬进走带控制，以「一颗按钮 + 浮窗」
// 存在。选项按 Folia 本体的设置面板组织（歌词样式 / 背景 / 播放页 / 字幕 / 字号 / 自动隐藏），
// 文案沿用 Folia 的叫法；改完即时生效（writeFoliaPref 广播，播放页自己跟上）。
//
// 浮窗的生命周期归宿主：首次打开 render 一次，之后常驻；点浮窗外 / Esc 由宿主关闭。
// 所以这里不需要 onClose，只有「需要主动收起」的动作（打开播放页 / 跳设置）才调 ctx.setOpen(false)。
import React from "react";
import type { SparkleTransportCtx } from "@quaver/sparkle";
import { FOLIA_BACKGROUNDS, FOLIA_MODES } from "./catalog";
import { FOLIA_FONT_SCALES, useFoliaPrefs, writeFoliaPref } from "./prefs";

const openSurface = (ctx: SparkleTransportCtx, surface: "stage" | "lattice") => {
    writeFoliaPref("enabled", true);
    writeFoliaPref("surface", surface);
    ctx.expand();
    // 没歌时 expand() 是空操作：别把面板也收掉，否则用户点完什么都没发生又没了入口。
    if (ctx.expanded()) ctx.setOpen(false);
};

export function FoliaControl({ ctx }: { ctx: SparkleTransportCtx }) {
    const prefs = useFoliaPrefs();

    return (
        <div className="fvr-panel">
            <div className="fvr-panel-head">
                <div>
                    <b>Folia 辞境</b>
                    <small>Folia Major · 歌词动效 / Lattice</small>
                </div>
                <span className={`fvr-panel-tag${prefs.enabled ? "" : " is-off"}`}>
                    {prefs.enabled ? "已启用" : "已关闭"}
                </span>
            </div>

            <div className="fvr-row">
                <div className="fvr-row-text">
                    <b>启用歌词动效</b>
                    <small>关闭后正在播放页回到宿主默认布局</small>
                </div>
                <button
                    type="button"
                    className="fvr-sw"
                    role="switch"
                    aria-checked={prefs.enabled}
                    aria-label="启用歌词动效"
                    onClick={() => writeFoliaPref("enabled", !prefs.enabled)}
                />
            </div>

            <div className="fvr-panel-label">播放页</div>
            <div className="fvr-grid">
                <button
                    type="button"
                    className={`fvr-chip${prefs.surface === "stage" ? " sel" : ""}`}
                    onClick={() => openSurface(ctx, "stage")}
                >
                    <b>舞台</b>
                    <small>全身歌词动效</small>
                </button>
                <button
                    type="button"
                    className={`fvr-chip${prefs.surface === "lattice" ? " sel" : ""}`}
                    onClick={() => openSurface(ctx, "lattice")}
                >
                    <b>Lattice</b>
                    <small>队列海报墙</small>
                </button>
            </div>

            <div className="fvr-panel-label">歌词样式 <small>{FOLIA_MODES.length} 种</small></div>
            <div className="fvr-grid">
                {FOLIA_MODES.map(item => (
                    <button
                        key={item.id}
                        type="button"
                        className={`fvr-chip${prefs.style === item.id ? " sel" : ""}`}
                        aria-pressed={prefs.style === item.id}
                        title={item.hint}
                        onClick={() => {
                            writeFoliaPref("style", item.id);
                            if (!prefs.enabled) writeFoliaPref("enabled", true);
                        }}
                    >
                        <b>{item.label}</b>
                        <small>{item.hint}</small>
                    </button>
                ))}
            </div>

            <div className="fvr-panel-label">背景 <small>{FOLIA_BACKGROUNDS.length} 种共享背景</small></div>
            <div className="fvr-grid fvr-grid--bg">
                {FOLIA_BACKGROUNDS.map(item => (
                    <button
                        key={item.id}
                        type="button"
                        className={`fvr-chip fvr-chip--pill${prefs.background === item.id ? " sel" : ""}`}
                        aria-pressed={prefs.background === item.id}
                        onClick={() => writeFoliaPref("background", item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="fvr-panel-label">选项</div>
            <div className="fvr-row">
                <div className="fvr-row-text">
                    <b>显示翻译 / 音译</b>
                    <small>歌词下方辅助行</small>
                </div>
                <button
                    type="button"
                    className="fvr-sw"
                    role="switch"
                    aria-checked={prefs.translation}
                    aria-label="显示翻译或音译"
                    onClick={() => writeFoliaPref("translation", !prefs.translation)}
                />
            </div>
            <div className="fvr-row">
                <div className="fvr-row-text">
                    <b>静态模式</b>
                    <small>降低动效开销（省电 / 低配机）</small>
                </div>
                <button
                    type="button"
                    className="fvr-sw"
                    role="switch"
                    aria-checked={prefs.staticMode}
                    aria-label="静态模式"
                    onClick={() => writeFoliaPref("staticMode", !prefs.staticMode)}
                />
            </div>
            <div className="fvr-row">
                <div className="fvr-row-text">
                    <b>自动隐藏播放条</b>
                    <small>指针静止 3 秒后收起，和 Folia 一致</small>
                </div>
                <button
                    type="button"
                    className="fvr-sw"
                    role="switch"
                    aria-checked={prefs.autoHideChrome}
                    aria-label="自动隐藏播放条"
                    onClick={() => writeFoliaPref("autoHideChrome", !prefs.autoHideChrome)}
                />
            </div>
            <div className="fvr-row">
                <div className="fvr-row-text">
                    <b>Lattice 暗角</b>
                    <small>海报墙四周压暗</small>
                </div>
                <button
                    type="button"
                    className="fvr-sw"
                    role="switch"
                    aria-checked={prefs.vignette}
                    aria-label="Lattice 暗角"
                    onClick={() => writeFoliaPref("vignette", !prefs.vignette)}
                />
            </div>

            <div className="fvr-panel-label">歌词字号</div>
            <div className="fvr-seg" role="group" aria-label="歌词字号">
                {FOLIA_FONT_SCALES.map(scale => (
                    <button
                        key={scale}
                        type="button"
                        className={prefs.fontScale === scale ? "sel" : ""}
                        aria-pressed={prefs.fontScale === scale}
                        onClick={() => writeFoliaPref("fontScale", scale)}
                    >
                        {Math.round(scale * 100)}%
                    </button>
                ))}
            </div>

            <div className="fvr-panel-foot">
                <button
                    type="button"
                    className="fvr-panel-btn"
                    onClick={() => openSurface(ctx, prefs.surface)}
                >
                    打开播放页
                </button>
                <button
                    type="button"
                    className="fvr-panel-btn is-quiet"
                    onClick={() => {
                        ctx.setOpen(false);
                        location.hash = "#/settings";
                    }}
                >
                    设置
                </button>
                <button
                    type="button"
                    className="fvr-panel-btn is-danger"
                    onClick={() => {
                        writeFoliaPref("enabled", false);
                        ctx.collapse();
                    }}
                >
                    恢复默认播放页
                </button>
            </div>
        </div>
    );
}
