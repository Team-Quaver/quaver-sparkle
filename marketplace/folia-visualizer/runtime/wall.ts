// 墙体几何 —— 从 Folia Major 的 src/components/wall/layout.ts 搬来（AGPL-3.0）。
// 只保留队列墙需要的部分：世界格几何、实例构建、按视口裁剪、以及「某一格展开时的让位表」。
import {
    BLOCK_COLS,
    BLOCK_ROWS,
    SLOTS_PER_BLOCK,
    getBlockReflow,
    getBlockTemplate,
    type BlockSlot,
} from "./wallTemplates";

export const CELL = 128;
export const GAP = 8;
export const PITCH = CELL + GAP;
export const MAX_RENDERED = 420;

const FIELD_ASPECT = 2.2;

export type WorldGeometry = {
    blocksPerRow: number;
    blockRows: number;
    blockWidth: number;
    blockHeight: number;
    cellWidth: number;
    cellHeight: number;
};

export type WallInstance = {
    instanceId: string;
    queueIndex: number;
    cellSlot: number;
    repeatX: number;
    repeatY: number;
    x: number;
    y: number;
    width: number;
    height: number;
};

export type WorldRect = { x: number; y: number; width: number; height: number };

/** 队列墙的重复单元：一个装下一整遍队列的块阵。 */
export const getLatticeGeometry = (total: number): WorldGeometry => {
    const blockWidth = BLOCK_COLS * PITCH;
    const blockHeight = BLOCK_ROWS * PITCH;
    const blocks = Math.max(1, Math.ceil(Math.max(0, total) / SLOTS_PER_BLOCK));
    const blocksPerRow = blocks <= 1
        ? 1
        : Math.max(1, Math.round(Math.sqrt((FIELD_ASPECT * blocks * BLOCK_ROWS) / BLOCK_COLS)));
    const blockRows = Math.ceil(blocks / blocksPerRow);

    return {
        blocksPerRow,
        blockRows,
        blockWidth,
        blockHeight,
        cellWidth: blocksPerRow * blockWidth,
        cellHeight: blockRows * blockHeight,
    };
};

/**
 * 一块格子里某一槽位的海报（原版 buildInstance）：模板按块在单元内的位置选，坐标给到
 * 无限重复的块坐标；`queueIndex = cellSlot % totalEntries` 把短队列循环补满。
 */
export const buildInstance = (
    geometry: WorldGeometry,
    total: number,
    absoluteColumn: number,
    absoluteRow: number,
    slotIndex: number,
): WallInstance | null => {
    if (total <= 0) return null;

    const repeatX = Math.floor(absoluteColumn / geometry.blocksPerRow);
    const repeatY = Math.floor(absoluteRow / geometry.blockRows);
    const localColumn = absoluteColumn - repeatX * geometry.blocksPerRow;
    const localRow = absoluteRow - repeatY * geometry.blockRows;
    const blockInCell = localRow * geometry.blocksPerRow + localColumn;
    const cellSlot = blockInCell * SLOTS_PER_BLOCK + slotIndex;
    const slot: BlockSlot | undefined = getBlockTemplate(localColumn, localRow)[slotIndex];

    if (!slot) return null;

    return {
        instanceId: `${cellSlot}:${repeatX}:${repeatY}`,
        queueIndex: cellSlot % total,
        cellSlot,
        repeatX,
        repeatY,
        x: repeatX * geometry.cellWidth + localColumn * geometry.blockWidth + slot.x * PITCH,
        y: repeatY * geometry.cellHeight + localRow * geometry.blockHeight + slot.y * PITCH,
        width: slot.cols * PITCH - GAP,
        height: slot.rows * PITCH - GAP,
    };
};

/** 实例所在的绝对块坐标与槽位。 */
export const getInstanceBlock = (geometry: WorldGeometry, instance: WallInstance) => {
    const blockInCell = Math.floor(instance.cellSlot / SLOTS_PER_BLOCK);

    return {
        column: instance.repeatX * geometry.blocksPerRow + (blockInCell % geometry.blocksPerRow),
        row: instance.repeatY * geometry.blockRows + Math.floor(blockInCell / geometry.blocksPerRow),
        slotIndex: instance.cellSlot % SLOTS_PER_BLOCK,
    };
};

/** 视口内的海报（世界坐标的矩形由相机反算）。 */
export const layoutLattice = (
    geometry: WorldGeometry,
    total: number,
    bounds: { left: number; right: number; top: number; bottom: number },
    overscan: number,
): WallInstance[] => {
    if (total <= 0) return [];

    const view = {
        left: bounds.left - overscan,
        right: bounds.right + overscan,
        top: bounds.top - overscan,
        bottom: bounds.bottom + overscan,
    };
    const fromColumn = Math.floor(view.left / geometry.blockWidth);
    const toColumn = Math.floor(view.right / geometry.blockWidth);
    const fromRow = Math.floor(view.top / geometry.blockHeight);
    const toRow = Math.floor(view.bottom / geometry.blockHeight);
    const result: WallInstance[] = [];

    for (let row = fromRow; row <= toRow; row++) {
        for (let column = fromColumn; column <= toColumn; column++) {
            for (let slotIndex = 0; slotIndex < SLOTS_PER_BLOCK; slotIndex++) {
                const instance = buildInstance(geometry, total, column, row, slotIndex);

                if (!instance) continue;
                if (instance.x + instance.width < view.left || instance.x > view.right) continue;
                if (instance.y + instance.height < view.top || instance.y > view.bottom) continue;
                result.push(instance);
                if (result.length >= MAX_RENDERED) return result;
            }
        }
    }

    return result;
};

/**
 * 某个实例展开时的让位表：同一块里的 12 张重新齿轮，块占位不变（原版 layoutExpandedBlock）。
 * 返回 instanceId → 新矩形。
 */
export const layoutExpandedBlock = (
    geometry: WorldGeometry,
    total: number,
    active: WallInstance,
): Map<string, WorldRect> => {
    const result = new Map<string, WorldRect>();

    if (total <= 0) return result;

    const block = getInstanceBlock(geometry, active);
    const localColumn = block.column - active.repeatX * geometry.blocksPerRow;
    const localRow = block.row - active.repeatY * geometry.blockRows;
    const reflow = getBlockReflow(localColumn, localRow, block.slotIndex);

    if (!reflow) return result;

    const originX = active.repeatX * geometry.cellWidth + localColumn * geometry.blockWidth;
    const originY = active.repeatY * geometry.cellHeight + localRow * geometry.blockHeight;
    const blockInCell = localRow * geometry.blocksPerRow + localColumn;

    for (let slotIndex = 0; slotIndex < SLOTS_PER_BLOCK; slotIndex++) {
        const slot = reflow[slotIndex];

        if (!slot) continue;
        const cellSlot = blockInCell * SLOTS_PER_BLOCK + slotIndex;

        result.set(`${cellSlot}:${active.repeatX}:${active.repeatY}`, {
            x: originX + slot.x * PITCH,
            y: originY + slot.y * PITCH,
            width: slot.cols * PITCH - GAP,
            height: slot.rows * PITCH - GAP,
        });
    }

    return result;
};
