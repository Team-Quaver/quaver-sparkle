// 世界格模板与让位表 —— 直接取自 Folia Major 的
// src/components/wall/blockTemplates.ts 与 blockReflows.ts（AGPL-3.0，见插件根 AGPL 声明）。
// 只做了机械拼接：类型前置、import 去掉，数值与注释原样保留。
//
// 4 套 12×8 模板（每块恰好铺满、无空洞），每套 4 种镜像；BLOCK_REFLOWS 是「展开某一槽位时
// 其余 11 张如何重新齿轮」的精确覆盖表（生成数据，不要手改）。

export type BlockSlot = { x: number; y: number; cols: number; rows: number };



// Generated data. For each base template, one layout per slot that could be expanded: the
// expanded card takes the 6x6 gear and the other eleven fall back to smaller gears so the
// block stays exactly covered. Indexed by the ORIGINAL slot, so a card keeps its identity
// through the change; the solver picked, out of every exact cover, the arrangement that moves
// the existing cards least. Do not hand-edit - regenerate if the templates or gears change.

export const BLOCK_REFLOWS: BlockSlot[][][] = [
    // 变体 0 的 12 张让位表，下标 = 被展开的槽位
    [
        // 展开槽位 0
        [
            { x: 0, y: 0, cols: 6, rows: 6 },
            { x: 6, y: 0, cols: 4, rows: 4 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 2, cols: 2, rows: 4 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 6, y: 4, cols: 2, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 1
        [
            { x: 0, y: 0, cols: 3, rows: 2 },
            { x: 3, y: 0, cols: 6, rows: 6 },
            { x: 9, y: 0, cols: 3, rows: 2 },
            { x: 0, y: 2, cols: 3, rows: 2 },
            { x: 9, y: 2, cols: 3, rows: 2 },
            { x: 0, y: 4, cols: 3, rows: 2 },
            { x: 3, y: 6, cols: 3, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 0, y: 6, cols: 3, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
            { x: 9, y: 4, cols: 3, rows: 2 },
        ],
        // 展开槽位 2
        [
            { x: 0, y: 0, cols: 3, rows: 2 },
            { x: 3, y: 0, cols: 3, rows: 4 },
            { x: 6, y: 0, cols: 6, rows: 6 },
            { x: 0, y: 2, cols: 3, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
            { x: 0, y: 4, cols: 2, rows: 4 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 4, cols: 2, rows: 2 },
        ],
        // 展开槽位 3
        [
            { x: 2, y: 0, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 6, rows: 2 },
            { x: 8, y: 2, cols: 2, rows: 2 },
            { x: 0, y: 2, cols: 6, rows: 6 },
            { x: 10, y: 0, cols: 2, rows: 6 },
            { x: 0, y: 0, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 2, rows: 2 },
            { x: 6, y: 4, cols: 2, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 4
        [
            { x: 0, y: 0, cols: 3, rows: 2 },
            { x: 3, y: 0, cols: 4, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 2, cols: 2, rows: 3 },
            { x: 6, y: 2, cols: 6, rows: 6 },
            { x: 0, y: 5, cols: 2, rows: 3 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 7, y: 0, cols: 3, rows: 2 },
            { x: 2, y: 2, cols: 4, rows: 2 },
        ],
        // 展开槽位 5
        [
            { x: 0, y: 0, cols: 3, rows: 2 },
            { x: 5, y: 0, cols: 4, rows: 2 },
            { x: 9, y: 0, cols: 3, rows: 2 },
            { x: 3, y: 0, cols: 2, rows: 2 },
            { x: 8, y: 2, cols: 4, rows: 2 },
            { x: 0, y: 2, cols: 6, rows: 6 },
            { x: 6, y: 2, cols: 2, rows: 2 },
            { x: 6, y: 4, cols: 2, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 4, cols: 2, rows: 4 },
            { x: 10, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 4, cols: 2, rows: 2 },
        ],
        // 展开槽位 6
        [
            { x: 0, y: 0, cols: 4, rows: 2 },
            { x: 4, y: 0, cols: 3, rows: 2 },
            { x: 9, y: 0, cols: 3, rows: 2 },
            { x: 0, y: 2, cols: 2, rows: 3 },
            { x: 10, y: 2, cols: 2, rows: 2 },
            { x: 0, y: 5, cols: 2, rows: 3 },
            { x: 4, y: 2, cols: 6, rows: 6 },
            { x: 10, y: 4, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
            { x: 7, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 2, cols: 2, rows: 4 },
        ],
        // 展开槽位 7
        [
            { x: 0, y: 0, cols: 4, rows: 2 },
            { x: 4, y: 0, cols: 4, rows: 2 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 2, cols: 2, rows: 3 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 5, cols: 2, rows: 3 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 6, rows: 6 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 2, y: 2, cols: 4, rows: 2 },
        ],
        // 展开槽位 8
        [
            { x: 0, y: 0, cols: 4, rows: 2 },
            { x: 4, y: 0, cols: 3, rows: 2 },
            { x: 9, y: 0, cols: 3, rows: 2 },
            { x: 0, y: 2, cols: 2, rows: 3 },
            { x: 10, y: 2, cols: 2, rows: 2 },
            { x: 0, y: 5, cols: 2, rows: 3 },
            { x: 2, y: 2, cols: 2, rows: 4 },
            { x: 10, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 2, cols: 6, rows: 6 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
            { x: 7, y: 0, cols: 2, rows: 2 },
        ],
        // 展开槽位 9
        [
            { x: 0, y: 0, cols: 4, rows: 2 },
            { x: 4, y: 0, cols: 4, rows: 2 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 2, cols: 2, rows: 3 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 5, cols: 2, rows: 3 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 6, rows: 6 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 2, cols: 4, rows: 2 },
        ],
        // 展开槽位 10
        [
            { x: 0, y: 0, cols: 4, rows: 2 },
            { x: 4, y: 0, cols: 4, rows: 2 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 2, cols: 2, rows: 3 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 5, cols: 2, rows: 3 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 6, rows: 6 },
            { x: 2, y: 2, cols: 4, rows: 2 },
        ],
        // 展开槽位 11
        [
            { x: 0, y: 0, cols: 4, rows: 2 },
            { x: 4, y: 0, cols: 4, rows: 2 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 2, cols: 2, rows: 3 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 5, cols: 2, rows: 3 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 2, cols: 4, rows: 2 },
            { x: 6, y: 2, cols: 6, rows: 6 },
        ],
    ],
    // 变体 1 的 12 张让位表，下标 = 被展开的槽位
    [
        // 展开槽位 0
        [
            { x: 0, y: 0, cols: 6, rows: 6 },
            { x: 6, y: 0, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 2, rows: 2 },
            { x: 8, y: 0, cols: 4, rows: 4 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 6, y: 4, cols: 2, rows: 4 },
            { x: 8, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 4, cols: 2, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 1
        [
            { x: 0, y: 0, cols: 2, rows: 3 },
            { x: 2, y: 0, cols: 6, rows: 6 },
            { x: 8, y: 2, cols: 4, rows: 2 },
            { x: 8, y: 0, cols: 4, rows: 2 },
            { x: 0, y: 3, cols: 2, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 4, cols: 2, rows: 4 },
            { x: 10, y: 4, cols: 2, rows: 2 },
            { x: 0, y: 5, cols: 2, rows: 3 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 2
        [
            { x: 0, y: 0, cols: 2, rows: 3 },
            { x: 2, y: 0, cols: 2, rows: 3 },
            { x: 4, y: 0, cols: 6, rows: 6 },
            { x: 10, y: 0, cols: 2, rows: 4 },
            { x: 0, y: 3, cols: 4, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 4, cols: 2, rows: 2 },
            { x: 0, y: 5, cols: 2, rows: 3 },
            { x: 2, y: 5, cols: 2, rows: 3 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 3
        [
            { x: 0, y: 0, cols: 2, rows: 3 },
            { x: 2, y: 0, cols: 2, rows: 3 },
            { x: 4, y: 0, cols: 2, rows: 4 },
            { x: 6, y: 0, cols: 6, rows: 6 },
            { x: 0, y: 3, cols: 4, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
            { x: 0, y: 5, cols: 2, rows: 3 },
            { x: 2, y: 5, cols: 2, rows: 3 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
        ],
        // 展开槽位 4
        [
            { x: 0, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 0, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 4, rows: 2 },
            { x: 8, y: 0, cols: 4, rows: 4 },
            { x: 0, y: 2, cols: 6, rows: 6 },
            { x: 6, y: 4, cols: 2, rows: 2 },
            { x: 8, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 4, cols: 2, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 5
        [
            { x: 0, y: 0, cols: 2, rows: 4 },
            { x: 2, y: 0, cols: 2, rows: 3 },
            { x: 4, y: 0, cols: 4, rows: 2 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 3, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 6, rows: 6 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 4, cols: 2, rows: 4 },
            { x: 2, y: 5, cols: 2, rows: 3 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 2, cols: 2, rows: 2 },
        ],
        // 展开槽位 6
        [
            { x: 0, y: 0, cols: 2, rows: 4 },
            { x: 2, y: 0, cols: 2, rows: 3 },
            { x: 4, y: 0, cols: 4, rows: 2 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 3, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 6, rows: 6 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 4, cols: 2, rows: 4 },
            { x: 2, y: 5, cols: 2, rows: 3 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 2, cols: 2, rows: 2 },
        ],
        // 展开槽位 7
        [
            { x: 0, y: 0, cols: 2, rows: 4 },
            { x: 2, y: 0, cols: 2, rows: 3 },
            { x: 4, y: 0, cols: 4, rows: 2 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 3, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 6, rows: 6 },
            { x: 0, y: 4, cols: 2, rows: 4 },
            { x: 2, y: 5, cols: 2, rows: 3 },
            { x: 4, y: 2, cols: 2, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 2 },
        ],
        // 展开槽位 8
        [
            { x: 0, y: 0, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 2, rows: 2 },
            { x: 6, y: 0, cols: 2, rows: 3 },
            { x: 8, y: 0, cols: 4, rows: 4 },
            { x: 2, y: 0, cols: 2, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 4, cols: 2, rows: 2 },
            { x: 0, y: 2, cols: 6, rows: 6 },
            { x: 6, y: 3, cols: 2, rows: 3 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 9
        [
            { x: 0, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 0, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 4, rows: 2 },
            { x: 8, y: 0, cols: 4, rows: 4 },
            { x: 0, y: 2, cols: 2, rows: 2 },
            { x: 8, y: 4, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 4, cols: 2, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 2, cols: 6, rows: 6 },
            { x: 0, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 10
        [
            { x: 0, y: 0, cols: 2, rows: 3 },
            { x: 2, y: 0, cols: 2, rows: 4 },
            { x: 4, y: 0, cols: 4, rows: 2 },
            { x: 8, y: 0, cols: 4, rows: 2 },
            { x: 0, y: 3, cols: 2, rows: 3 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 2, cols: 2, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 2, cols: 6, rows: 6 },
            { x: 10, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 11
        [
            { x: 0, y: 0, cols: 2, rows: 4 },
            { x: 2, y: 0, cols: 2, rows: 3 },
            { x: 4, y: 0, cols: 4, rows: 2 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 3, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 4, cols: 2, rows: 4 },
            { x: 2, y: 5, cols: 2, rows: 3 },
            { x: 4, y: 2, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 6, rows: 6 },
        ],
    ],
    // 变体 2 的 12 张让位表，下标 = 被展开的槽位
    [
        // 展开槽位 0
        [
            { x: 0, y: 0, cols: 6, rows: 6 },
            { x: 6, y: 0, cols: 6, rows: 2 },
            { x: 8, y: 2, cols: 2, rows: 4 },
            { x: 10, y: 2, cols: 2, rows: 3 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 6, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 5, cols: 2, rows: 3 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 2, rows: 2 },
        ],
        // 展开槽位 1
        [
            { x: 0, y: 0, cols: 4, rows: 4 },
            { x: 6, y: 0, cols: 6, rows: 6 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 0, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 2, rows: 4 },
        ],
        // 展开槽位 2
        [
            { x: 0, y: 0, cols: 4, rows: 4 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 6, rows: 6 },
            { x: 6, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 2, rows: 4 },
        ],
        // 展开槽位 3
        [
            { x: 0, y: 0, cols: 4, rows: 4 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 6, rows: 6 },
            { x: 0, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 2, cols: 2, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 4, rows: 2 },
        ],
        // 展开槽位 4
        [
            { x: 2, y: 0, cols: 4, rows: 2 },
            { x: 6, y: 0, cols: 6, rows: 2 },
            { x: 6, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 4, cols: 2, rows: 2 },
            { x: 0, y: 2, cols: 6, rows: 6 },
            { x: 6, y: 2, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
            { x: 0, y: 0, cols: 2, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 4, cols: 2, rows: 2 },
            { x: 8, y: 2, cols: 4, rows: 2 },
        ],
        // 展开槽位 5
        [
            { x: 0, y: 0, cols: 4, rows: 4 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 10, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 2, cols: 2, rows: 2 },
            { x: 0, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 2, cols: 6, rows: 6 },
            { x: 10, y: 6, cols: 2, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 4, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 2 },
        ],
        // 展开槽位 6
        [
            { x: 0, y: 0, cols: 4, rows: 4 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 2, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 6, rows: 6 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 4, rows: 2 },
        ],
        // 展开槽位 7
        [
            { x: 0, y: 0, cols: 4, rows: 2 },
            { x: 6, y: 0, cols: 6, rows: 2 },
            { x: 6, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 2, cols: 2, rows: 3 },
            { x: 4, y: 0, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 2, rows: 2 },
            { x: 10, y: 5, cols: 2, rows: 3 },
            { x: 0, y: 2, cols: 6, rows: 6 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 4, cols: 2, rows: 2 },
            { x: 8, y: 2, cols: 2, rows: 2 },
        ],
        // 展开槽位 8
        [
            { x: 0, y: 0, cols: 6, rows: 2 },
            { x: 6, y: 0, cols: 6, rows: 2 },
            { x: 8, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 2, cols: 2, rows: 2 },
            { x: 0, y: 4, cols: 2, rows: 2 },
            { x: 0, y: 2, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 2, cols: 6, rows: 6 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 2, cols: 2, rows: 2 },
            { x: 10, y: 4, cols: 2, rows: 2 },
        ],
        // 展开槽位 9
        [
            { x: 0, y: 0, cols: 4, rows: 4 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 10, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 2, cols: 2, rows: 2 },
            { x: 0, y: 4, cols: 2, rows: 2 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 2, cols: 6, rows: 6 },
            { x: 4, y: 0, cols: 4, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 2 },
        ],
        // 展开槽位 10
        [
            { x: 0, y: 0, cols: 4, rows: 4 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 6, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 4, cols: 2, rows: 2 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 6, rows: 6 },
            { x: 4, y: 0, cols: 2, rows: 4 },
        ],
        // 展开槽位 11
        [
            { x: 0, y: 0, cols: 4, rows: 4 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 4, rows: 2 },
            { x: 0, y: 4, cols: 2, rows: 2 },
            { x: 4, y: 2, cols: 2, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 6, rows: 6 },
        ],
    ],
    // 变体 3 的 12 张让位表，下标 = 被展开的槽位
    [
        // 展开槽位 0
        [
            { x: 0, y: 0, cols: 6, rows: 6 },
            { x: 6, y: 2, cols: 2, rows: 2 },
            { x: 6, y: 0, cols: 2, rows: 2 },
            { x: 8, y: 0, cols: 2, rows: 6 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 6, y: 4, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 2, cols: 2, rows: 6 },
            { x: 2, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 1
        [
            { x: 0, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 0, cols: 6, rows: 6 },
            { x: 8, y: 0, cols: 2, rows: 3 },
            { x: 8, y: 3, cols: 2, rows: 3 },
            { x: 10, y: 0, cols: 2, rows: 4 },
            { x: 0, y: 2, cols: 2, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 4, cols: 2, rows: 4 },
            { x: 0, y: 4, cols: 2, rows: 4 },
            { x: 2, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 2
        [
            { x: 0, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 0, cols: 2, rows: 3 },
            { x: 4, y: 0, cols: 6, rows: 6 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 10, y: 2, cols: 2, rows: 3 },
            { x: 0, y: 2, cols: 2, rows: 2 },
            { x: 2, y: 3, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 6, rows: 2 },
            { x: 0, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 5, cols: 2, rows: 3 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 5, cols: 2, rows: 3 },
        ],
        // 展开槽位 3
        [
            { x: 0, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 0, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 2, rows: 4 },
            { x: 6, y: 0, cols: 6, rows: 6 },
            { x: 7, y: 6, cols: 2, rows: 2 },
            { x: 0, y: 2, cols: 2, rows: 4 },
            { x: 2, y: 2, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 2, y: 4, cols: 2, rows: 4 },
            { x: 9, y: 6, cols: 3, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 3, rows: 2 },
        ],
        // 展开槽位 4
        [
            { x: 0, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 0, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 2, rows: 4 },
            { x: 7, y: 6, cols: 2, rows: 2 },
            { x: 6, y: 0, cols: 6, rows: 6 },
            { x: 0, y: 2, cols: 2, rows: 4 },
            { x: 2, y: 2, cols: 2, rows: 2 },
            { x: 4, y: 4, cols: 2, rows: 2 },
            { x: 2, y: 4, cols: 2, rows: 4 },
            { x: 9, y: 6, cols: 3, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 4, y: 6, cols: 3, rows: 2 },
        ],
        // 展开槽位 5
        [
            { x: 3, y: 0, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 2, rows: 2 },
            { x: 5, y: 0, cols: 2, rows: 2 },
            { x: 8, y: 2, cols: 2, rows: 3 },
            { x: 9, y: 0, cols: 3, rows: 2 },
            { x: 0, y: 2, cols: 6, rows: 6 },
            { x: 7, y: 0, cols: 2, rows: 2 },
            { x: 6, y: 4, cols: 2, rows: 2 },
            { x: 8, y: 5, cols: 2, rows: 3 },
            { x: 10, y: 2, cols: 2, rows: 6 },
            { x: 0, y: 0, cols: 3, rows: 2 },
            { x: 6, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 6
        [
            { x: 0, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 0, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 6, rows: 2 },
            { x: 8, y: 2, cols: 2, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 3 },
            { x: 0, y: 2, cols: 2, rows: 3 },
            { x: 2, y: 2, cols: 6, rows: 6 },
            { x: 8, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 3, cols: 2, rows: 2 },
            { x: 10, y: 5, cols: 2, rows: 3 },
            { x: 0, y: 5, cols: 2, rows: 3 },
            { x: 8, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 7
        [
            { x: 0, y: 0, cols: 2, rows: 3 },
            { x: 2, y: 0, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 3, rows: 2 },
            { x: 7, y: 0, cols: 3, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 6 },
            { x: 0, y: 3, cols: 2, rows: 2 },
            { x: 2, y: 2, cols: 2, rows: 2 },
            { x: 4, y: 2, cols: 6, rows: 6 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 6, cols: 2, rows: 2 },
            { x: 0, y: 5, cols: 2, rows: 3 },
            { x: 2, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 8
        [
            { x: 0, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 0, cols: 2, rows: 2 },
            { x: 4, y: 0, cols: 6, rows: 2 },
            { x: 8, y: 2, cols: 2, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 3 },
            { x: 0, y: 2, cols: 2, rows: 3 },
            { x: 10, y: 3, cols: 2, rows: 2 },
            { x: 8, y: 4, cols: 2, rows: 2 },
            { x: 2, y: 2, cols: 6, rows: 6 },
            { x: 10, y: 5, cols: 2, rows: 3 },
            { x: 0, y: 5, cols: 2, rows: 3 },
            { x: 8, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 9
        [
            { x: 0, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 0, cols: 3, rows: 2 },
            { x: 5, y: 0, cols: 3, rows: 2 },
            { x: 8, y: 0, cols: 2, rows: 2 },
            { x: 10, y: 0, cols: 2, rows: 2 },
            { x: 0, y: 2, cols: 2, rows: 3 },
            { x: 2, y: 2, cols: 2, rows: 2 },
            { x: 4, y: 2, cols: 2, rows: 6 },
            { x: 2, y: 4, cols: 2, rows: 2 },
            { x: 6, y: 2, cols: 6, rows: 6 },
            { x: 0, y: 5, cols: 2, rows: 3 },
            { x: 2, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 10
        [
            { x: 2, y: 0, cols: 3, rows: 2 },
            { x: 6, y: 2, cols: 2, rows: 2 },
            { x: 5, y: 0, cols: 3, rows: 2 },
            { x: 8, y: 0, cols: 4, rows: 3 },
            { x: 10, y: 3, cols: 2, rows: 2 },
            { x: 0, y: 0, cols: 2, rows: 2 },
            { x: 8, y: 3, cols: 2, rows: 3 },
            { x: 6, y: 4, cols: 2, rows: 2 },
            { x: 8, y: 6, cols: 2, rows: 2 },
            { x: 10, y: 5, cols: 2, rows: 3 },
            { x: 0, y: 2, cols: 6, rows: 6 },
            { x: 6, y: 6, cols: 2, rows: 2 },
        ],
        // 展开槽位 11
        [
            { x: 0, y: 0, cols: 2, rows: 2 },
            { x: 2, y: 0, cols: 4, rows: 2 },
            { x: 6, y: 0, cols: 2, rows: 2 },
            { x: 8, y: 0, cols: 2, rows: 4 },
            { x: 10, y: 0, cols: 2, rows: 3 },
            { x: 0, y: 2, cols: 2, rows: 2 },
            { x: 0, y: 4, cols: 2, rows: 2 },
            { x: 8, y: 4, cols: 2, rows: 2 },
            { x: 10, y: 3, cols: 2, rows: 3 },
            { x: 8, y: 6, cols: 4, rows: 2 },
            { x: 0, y: 6, cols: 2, rows: 2 },
            { x: 2, y: 2, cols: 6, rows: 6 },
        ],
    ],];



// Slot layouts for one 12x8 block. Each template covers the block exactly - no gaps - because
// expansion makes room by re-gearing the cards rather than by shoving them aside.

export type BlockSlot = { x: number; y: number; cols: number; rows: number };

export const BLOCK_COLS = 12;
export const BLOCK_ROWS = 8;
export const SLOTS_PER_BLOCK = 12;

/** Gear an expanded card takes. The only size for which every slot has an exact re-cover. */
export const EXPANSION_SPAN = { cols: 6, rows: 6 };

const TEMPLATES: BlockSlot[][] = [
    // 变体 0
    [
        { x: 0, y: 0, cols: 3, rows: 2 },
        { x: 3, y: 0, cols: 6, rows: 4 },
        { x: 9, y: 0, cols: 3, rows: 2 },
        { x: 0, y: 2, cols: 3, rows: 2 },
        { x: 9, y: 2, cols: 3, rows: 4 },
        { x: 0, y: 4, cols: 4, rows: 4 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 6, y: 4, cols: 3, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
    ],
    // 变体 1
    [
        { x: 0, y: 0, cols: 2, rows: 3 },
        { x: 2, y: 0, cols: 2, rows: 3 },
        { x: 4, y: 0, cols: 2, rows: 3 },
        { x: 6, y: 0, cols: 6, rows: 4 },
        { x: 0, y: 3, cols: 6, rows: 2 },
        { x: 6, y: 4, cols: 2, rows: 4 },
        { x: 8, y: 4, cols: 2, rows: 4 },
        { x: 10, y: 4, cols: 2, rows: 2 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 2, y: 5, cols: 2, rows: 3 },
        { x: 4, y: 5, cols: 2, rows: 3 },
        { x: 10, y: 6, cols: 2, rows: 2 },
    ],
    // 变体 2
    [
        { x: 0, y: 0, cols: 6, rows: 4 },
        { x: 6, y: 0, cols: 6, rows: 3 },
        { x: 6, y: 3, cols: 4, rows: 3 },
        { x: 10, y: 3, cols: 2, rows: 2 },
        { x: 0, y: 4, cols: 4, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 5, cols: 2, rows: 3 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
    ],
    // 变体 3
    [
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 0, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 4, rows: 3 },
        { x: 8, y: 0, cols: 2, rows: 4 },
        { x: 10, y: 0, cols: 2, rows: 4 },
        { x: 0, y: 2, cols: 2, rows: 3 },
        { x: 2, y: 2, cols: 2, rows: 2 },
        { x: 4, y: 3, cols: 4, rows: 3 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 8, y: 4, cols: 4, rows: 4 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 2, y: 6, cols: 6, rows: 2 },
    ],];

const flipX = (slots: BlockSlot[]): BlockSlot[] => slots.map(slot => ({
    ...slot,
    x: BLOCK_COLS - slot.x - slot.cols,
}));

const flipY = (slots: BlockSlot[]): BlockSlot[] => slots.map(slot => ({
    ...slot,
    y: BLOCK_ROWS - slot.y - slot.rows,
}));

// Reflections preserve slot order, so a card keeps its index in every orientation.
const REFLECTIONS: Array<(slots: BlockSlot[]) => BlockSlot[]> = [
    slots => slots,
    flipX,
    flipY,
    slots => flipX(flipY(slots)),
];

const ORIENTED_TEMPLATES: BlockSlot[][] = TEMPLATES.flatMap(
    template => REFLECTIONS.map(reflect => reflect(template)),
);

const ORIENTED_REFLOWS: BlockSlot[][][] = BLOCK_REFLOWS.flatMap(
    perSlot => REFLECTIONS.map(reflect => perSlot.map(reflect)),
);

export const BLOCK_ORIENTATION_COUNT = ORIENTED_TEMPLATES.length;

// Integer hash; picks the reflection so the field never settles into a visible period.
const mixBlockCoords = (blockColumn: number, blockRow: number): number => {
    let value = Math.imul(blockColumn, 0x9e3779b1) ^ Math.imul(blockRow, 0x85ebca6b);
    value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
    value ^= value >>> 12;
    return value >>> 0;
};

/**
 * Resolves a block's orientation from its own coordinates, with no state to thread through.
 * The template steps linearly (+1 across, +2 down) so neighbouring blocks can never share one,
 * while the reflection comes from a hash, which keeps the field from reading as a grid.
 */
const getBlockOrientation = (blockColumn: number, blockRow: number): number => {
    const count = TEMPLATES.length;
    const template = ((blockColumn + blockRow * 2) % count + count) % count;
    return template * REFLECTIONS.length + mixBlockCoords(blockColumn, blockRow) % REFLECTIONS.length;
};

export const getBlockTemplate = (blockColumn: number, blockRow: number): BlockSlot[] => (
    ORIENTED_TEMPLATES[getBlockOrientation(blockColumn, blockRow)]
);

/** Where every card in this block sits while `expandedSlot` is open. */
export const getBlockReflow = (
    blockColumn: number,
    blockRow: number,
    expandedSlot: number,
): BlockSlot[] | null => {
    if (expandedSlot < 0 || expandedSlot >= SLOTS_PER_BLOCK) return null;
    return ORIENTED_REFLOWS[getBlockOrientation(blockColumn, blockRow)][expandedSlot];
};
