import type { RowTable } from "../render/RowTable";

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
    /** How far behind its tip its center stands for a length (`EdgeMesh.calculateArrowPosition`). */
    readonly centreBackAt: (length: number) => number;
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

    /** The row table's drawn writes when the pieces were last placed, or seen changing. */
    private seen = -1;

    /** Whether a piece was written since the last placing. */
    private pending = true;

    /**
     * Called once a frame, before the batch uploads.
     * @param rest - The rows and whether a layout moves them.
     * @returns True when the batch should place every piece now.
     */
    due(rest: RestSource): boolean {
        const version = rest.rows.drawnWrites;
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
        this.seen = rows.drawnWrites;
        this.placed = true;
        this.pending = false;
    }

    /** A piece was written: the next rest places it. */
    touch(): void {
        this.pending = true;
    }
}

/** What {@link roundEnds} writes: the line's start, where it meets its target, and where it stops, x, y, z each. */
export const placedEnds = new Float64Array(9);

/**
 * `trimEnds` for two round rows, as `Edge.interceptPointsFromColumns` asks it, step for step in the same float64
 * arithmetic, with nothing allocated: a rest places a hundred thousand ends at once.
 * @param positions - The rows' places, x, y, z and w a row (`RowTable.restingPositions`).
 * @param from - The source row.
 * @param to - The target row.
 * @param radii - Each end's round radius and how far past it the line starts (its border), source first.
 * @param back - The head's own gap, then how far before it the line stops (`Edge.capBack`); 0, 0 for no head.
 * @param out - Written with the three points.
 * @returns False when the line has no ends (the nodes overlap).
 */
export function roundEnds(
    positions: Float32Array,
    from: number,
    to: number,
    radii: readonly [number, number, number, number],
    back: readonly [number, number],
    out: Float64Array,
): boolean {
    const [r1, reach1, r2, reach2] = radii;
    const [sx, sy, sz] = [positions[from * 4], positions[from * 4 + 1], positions[from * 4 + 2]];
    const [tx, ty, tz] = [positions[to * 4], positions[to * 4 + 1], positions[to * 4 + 2]];
    const [dx, dy, dz] = [tx - sx, ty - sy, tz - sz];
    const span = Math.sqrt(dx * dx + dy * dy + dz * dz); // eslint-disable-line unicorn/prefer-modern-math-apis -- trimEnds's own arithmetic, which this must match to the bit
    // as trimEnds asks it, so a NaN span has no ends either
    const apart = span > r1 + r2;
    if (!apart) {
        return false;
    }

    const [ux, uy, uz] = [dx / span, dy / span, dz / span];
    let [ax, ay, az] = [sx + ux * r1, sy + uy * r1, sz + uz * r1];
    let [bx, by, bz] = [tx + -ux * r2, ty + -uy * r2, tz + -uz * r2];
    // pastBorders
    const [ex, ey, ez] = [bx - ax, by - ay, bz - az];
    const reached = Math.sqrt(ex * ex + ey * ey + ez * ez); // eslint-disable-line unicorn/prefer-modern-math-apis -- as above
    if (!((reach1 === 0 && reach2 === 0) || reached <= reach1 + reach2)) {
        const inverse = 1 / reached;
        const [px, py, pz] = [ex * inverse, ey * inverse, ez * inverse];
        [ax, ay, az] = [ax + px * reach1, ay + py * reach1, az + pz * reach1];
        [bx, by, bz] = [bx + px * -reach2, by + py * -reach2, bz + pz * -reach2];
    }

    const [lx, ly, lz] = [bx - ax, by - ay, bz - az];
    const length = Math.sqrt(lx * lx + ly * ly + lz * lz); // eslint-disable-line unicorn/prefer-modern-math-apis -- as above
    const inverse = length > 0 ? 1 / length : 0;
    const [vx, vy, vz] = length > 0 ? [lx * inverse, ly * inverse, lz * inverse] : [0, 0, 0];
    const [capGap, capBack] = back;
    const [gx, gy, gz] = [bx + vx * -capGap, by + vy * -capGap, bz + vz * -capGap];
    out[0] = ax;
    out[1] = ay;
    out[2] = az;
    out[3] = bx;
    out[4] = by;
    out[5] = bz;
    out[6] = gx + vx * -capBack;
    out[7] = gy + vy * -capBack;
    out[8] = gz + vz * -capBack;
    return true;
}

/** Scratch for {@link roundRowsEnds}: each end's scale, radius and border. */
const fromExtent = new Float64Array(3);
const toExtent = new Float64Array(3);

/**
 * {@link roundEnds} between two rows, when both are round, reading their extents from the row table.
 * @param rows - The row table.
 * @param from - The source row.
 * @param to - The target row.
 * @param lineStop - How far before the target's outline the line stops for a target scale; null for no head.
 * @param out - Written with the three points.
 * @returns The target's scale (1 when it has none), or 0 for no ends: an end not round, or the nodes overlapping.
 */
export function roundRowsEnds(
    rows: RowTable,
    from: number,
    to: number,
    lineStop: ((scale: number) => number) | null,
    out: Float64Array,
): number {
    if (!rows.roundExtentOf(from, fromExtent) || !rows.roundExtentOf(to, toExtent)) {
        return 0;
    }

    // Edge.capScaleAt
    const scale = Number.isFinite(toExtent[0]) && toExtent[0] > 0 ? toExtent[0] : 1;
    const back = [0, lineStop === null ? 0 : lineStop(scale)] as const;
    const radii = [fromExtent[1], fromExtent[2], toExtent[1], toExtent[2]] as const;
    return roundEnds(rows.restingPositions, from, to, radii, back, out) ? scale : 0;
}
