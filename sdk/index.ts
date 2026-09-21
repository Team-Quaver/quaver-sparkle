// Quaver Sparkle — SDK 入口
//
// 插件作者唯一需要 import 的模块：
//   import { definePlugin } from "@quaver/sparkle";
//   export default definePlugin({ id, name, version, kind, setup(ctx) { ... } });
export type * from "./types";
export * from "./types";

/** 插件定义辅助：当前恒等返回，作用是给作者提供类型标注与未来演进锚点 */
export const definePlugin = (plugin: SparklePlugin): SparklePlugin => plugin;
