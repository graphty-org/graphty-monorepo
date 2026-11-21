import type { Vector3 } from "@babylonjs/core/Maths/math.vector.js";

import type { RowTable } from "../render/RowTable";
import { TRIM_CLOSED, type TrimEnd } from "./edgeTrim";

/**
 * @file Placing what the row table pulls on the CPU once the rows are at rest (renderPath "batched"). A pulled
 * arrowhead (`ArrowCapBatch.setPulled`) and the line under it (`PulledLineBatch.setCapBack`) are stood by the shader in float32,
 * which differs from the objects path's float64 placement by an anti-aliasing sample where a head meets its node. At
 * rest they are placed by the objects path's own arithmetic over the row table, so a still graph draws the objects
 * picture; a frame that moves a row hands them back to the shader, so a moving graph writes no byte for them.
 */

/**
 * How a pulled head is drawn, shared by every head of one style: what `ArrowCapBatch` places one by at rest, and
 * `PulledLineBatch` the line under it.
 */
export interface PulledCapLook {
    /** Its length at node scale 1. */
    readonly size: number;
    /** Where its center stands for a tip, a direction and a length (`EdgeMesh.calculateArrowPosition`). */
    readonly centreAt: (tip: Vector3, direction: Vector3, length: number) => Vector3;
    /** How far before the tip the line stops for a length (`EdgeMesh.lineStopOf`). */
    readonly lineStopAt: (length: number) => number;
}

/** What a batch reads to place its pieces at rest. */
export interface RestSource {
    /** The row table the pieces stand on. */
    readonly rows: RowTable;
    /** Whether no layout is moving the rows. */
    readonly settled: () => boolean;
}

/** Follows the row table's moves, and says when a batch should place its pieces. */
export class RestWatch {
    /** Whether the pieces' CPU places are current, so the shader draws them there. */
    placed = false;

    /** The row table's moves and extent writes when the pieces were last placed, or seen changing. */
    private seen = -1;

    /** Whether a piece was written since the last placing. */
    private pending = true;

    /**
     * Called once a frame, before the batch uploads.
     * @param rest - The rows and whether a layout moves them.
     * @returns True when the batch should place every piece now.
     */
    due(rest: RestSource): boolean {
        const version = rest.rows.moves + rest.rows.extentWrites;
        if (version !== this.seen) {
            this.seen = version;
            this.placed = false;
            this.pending = true;
            return false;
        }

        return this.pending && rest.settled();
    }

    /**
     * The batch placed its pieces.
     * @param rows - The row table, whose reads can repack its lane: that counts as a move but moves nothing drawn.
     */
    done(rows: RowTable): void {
        this.seen = rows.moves + rows.extentWrites;
        this.placed = true;
        this.pending = false;
    }

    /** A piece was written: the next rest places it. */
    touch(): void {
        this.pending = true;
    }
}

/**
 * A round row's closed end, as `Edge.interceptPointsFromColumns` gives it, or null for a row that is not round.
 * @param rows - The row table.
 * @param row - The node row.
 * @param gap - The edge's gap at that end.
 * @returns The end.
 */
export function roundRowEnd(rows: RowTable, row: number, gap: number): TrimEnd | null {
    const { round, half, border } = rows.extentOf(row);
    return round === null
        ? null
        : { radius: round, half, flat: false, border, gap, measured: TRIM_CLOSED, leaves: false, group: false };
}

/**
 * A row's scale, as `Edge.capScaleAt` reads it: 1 when it has none.
 * @param rows - The row table.
 * @param row - The node row.
 * @returns The scale.
 */
export function rowCapScale(rows: RowTable, row: number): number {
    const { scale } = rows.extentOf(row);
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
}
