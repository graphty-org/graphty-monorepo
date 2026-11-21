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
 * arithmetic, with nothing allocated: a rest places a hundred thousand ends at once, so every value is a plain local
 * (no array destructuring, which V8 does not always unpack).
 * @param positions - The rows' places, x, y, z and w a row (`RowTable.restingPositions`).
 * @param from - The source row.
 * @param to - The target row.
 * @param ends - Each end's round radius and how far past it the line starts (its border), source first, in
 *     `ends[0..3]` (`RowTable.roundExtentOf`'s radius and border).
 * @param capBack - How far before the target's outline the line stops (`Edge.capBack`); 0 for no head. A pulled head
 *     has no gap of its own.
 * @param out - Written with the three points.
 * @returns False when the line has no ends (the nodes overlap).
 */
export function roundEnds(
    positions: Float32Array,
    from: number,
    to: number,
    ends: Float64Array,
    capBack: number,
    out: Float64Array,
): boolean {
    const r1 = ends[0];
    const reach1 = ends[1];
    const r2 = ends[2];
    const reach2 = ends[3];
    const sx = positions[from * 4];
    const sy = positions[from * 4 + 1];
    const sz = positions[from * 4 + 2];
    const tx = positions[to * 4];
    const ty = positions[to * 4 + 1];
    const tz = positions[to * 4 + 2];
    const dx = tx - sx;
    const dy = ty - sy;
    const dz = tz - sz;
    const span = Math.sqrt(dx * dx + dy * dy + dz * dz); // eslint-disable-line unicorn/prefer-modern-math-apis -- trimEnds's own arithmetic, which this must match to the bit
    // as trimEnds asks it, so a NaN span has no ends either
    const apart = span > r1 + r2;
    if (!apart) {
        return false;
    }

    const ux = dx / span;
    const uy = dy / span;
    const uz = dz / span;
    let ax = sx + ux * r1;
    let ay = sy + uy * r1;
    let az = sz + uz * r1;
    let bx = tx + -ux * r2;
    let by = ty + -uy * r2;
    let bz = tz + -uz * r2;
    // pastBorders
    const ex = bx - ax;
    const ey = by - ay;
    const ez = bz - az;
    const reached = Math.sqrt(ex * ex + ey * ey + ez * ez); // eslint-disable-line unicorn/prefer-modern-math-apis -- as above
    if (!((reach1 === 0 && reach2 === 0) || reached <= reach1 + reach2)) {
        const inverse = 1 / reached;
        const px = ex * inverse;
        const py = ey * inverse;
        const pz = ez * inverse;
        ax = ax + px * reach1;
        ay = ay + py * reach1;
        az = az + pz * reach1;
        bx = bx + px * -reach2;
        by = by + py * -reach2;
        bz = bz + pz * -reach2;
    }

    const lx = bx - ax;
    const ly = by - ay;
    const lz = bz - az;
    const length = Math.sqrt(lx * lx + ly * ly + lz * lz); // eslint-disable-line unicorn/prefer-modern-math-apis -- as above
    const inverse = length > 0 ? 1 / length : 0;
    const vx = length > 0 ? lx * inverse : 0;
    const vy = length > 0 ? ly * inverse : 0;
    const vz = length > 0 ? lz * inverse : 0;
    out[0] = ax;
    out[1] = ay;
    out[2] = az;
    out[3] = bx;
    out[4] = by;
    out[5] = bz;
    // a pulled head has no gap of its own, so the line stops its own length back from the tip
    out[6] = bx + vx * -capBack;
    out[7] = by + vy * -capBack;
    out[8] = bz + vz * -capBack;
    return true;
}

/** Scratch for {@link roundRowsEnds}: each end's scale, radius and border, and the two ends' radii and borders. */
const fromExtent = new Float64Array(3);
const toExtent = new Float64Array(3);
const bothEnds = new Float64Array(4);

/**
 * {@link roundEnds} between two rows, when both are round, reading their extents from the row table.
 * @param rows - The row table.
 * @param from - The source row.
 * @param to - The target row.
 * @param look - The head the line stops for, its stop scaled by the target (`PulledCapLook.lineStopAt`); null for none.
 * @param out - Written with the three points.
 * @returns The target's scale (1 when it has none), or 0 for no ends: an end not round, or the nodes overlapping.
 */
export function roundRowsEnds(
    rows: RowTable,
    from: number,
    to: number,
    look: PulledCapLook | null,
    out: Float64Array,
): number {
    if (!rows.roundExtentOf(from, fromExtent) || !rows.roundExtentOf(to, toExtent)) {
        return 0;
    }

    // Edge.capScaleAt
    const scale = Number.isFinite(toExtent[0]) && toExtent[0] > 0 ? toExtent[0] : 1;
    bothEnds[0] = fromExtent[1];
    bothEnds[1] = fromExtent[2];
    bothEnds[2] = toExtent[1];
    bothEnds[3] = toExtent[2];
    const capBack = look === null ? 0 : look.lineStopAt(look.size * scale);
    return roundEnds(rows.restingPositions, from, to, bothEnds, capBack, out) ? scale : 0;
}
