/**
 * @file The overview of a graph: every placed node seen along the current view direction, laid
 * flat in a unit frame, plus the part of that frame the camera shows. The element's own minimap
 * draws from it, and so can a consumer's (issue #293).
 *
 * NOTHING HERE NAMES A BABYLON TYPE: the caller passes the view as plain numbers, so the
 * arithmetic runs and is tested in Node.
 */

/** Above this many placed nodes the overview is a density grid instead of points, by default. */
const OVERVIEW_MAX_POINTS = 5000;

/** The density grid's columns and rows, by default. */
const OVERVIEW_GRID_SIZE = 64;

/** A rectangle in the overview frame: x right, y down, the frame spanning 0 to 1. */
export interface OverviewRect {
    /** Left edge. */
    x: number;
    /** Top edge. */
    y: number;
    /** Width. */
    width: number;
    /** Height. */
    height: number;
}

/**
 * What `getOverview()` returns: the graph laid flat along the current view, in a unit frame
 * where x runs right and y runs down from 0 to 1. The frame is the box around every placed node,
 * scaled the same on both axes so the longer side spans 0 to 1 and the shorter one is centred.
 */
export interface GraphOverview {
    /** `"points"` up to `maxPoints` placed nodes, `"density"` above it. */
    kind: "points" | "density";
    /** x, y pairs, one per placed node, in node order; empty when `kind` is `"density"`. */
    points: Float32Array;
    /**
     * How many placed nodes fall in each cell of a `size` by `size` grid over the frame, row by
     * row from the top; null when `kind` is `"points"`.
     */
    density: { size: number; counts: Uint32Array } | null;
    /**
     * The part of the frame the camera shows, at the depth of what it looks at. It may reach past
     * 0 to 1 when the view shows more than the graph. All zero when no node is placed.
     */
    viewport: OverviewRect;
}

/** How `getOverview()` chooses between points and a density grid. */
export interface OverviewOptions {
    /** The most points returned before a density grid replaces them. Default {@link OVERVIEW_MAX_POINTS}. */
    maxPoints?: number;
    /** The density grid's columns and rows. Default {@link OVERVIEW_GRID_SIZE}. */
    gridSize?: number;
}

/** Where the nodes lie along the view, and how they map onto the unit frame. */
export interface OverviewFrame {
    /** Placed nodes measured. */
    placed: number;
    /** View-axis bounds of the placed nodes (rotation only, no translation). */
    minX: number;
    maxY: number;
    /** Middle depth of the placed nodes along the view axis (rotation only). */
    midZ: number;
    /** View units per frame unit. */
    size: number;
    /** Frame-unit offsets that centre the shorter side. */
    offX: number;
    offY: number;
}

/** The nodes laid flat: the frame plus points or a density grid. */
export interface OverviewProjection {
    frame: OverviewFrame;
    kind: GraphOverview["kind"];
    points: Float32Array;
    density: GraphOverview["density"];
}

/**
 * Lay every placed node flat along the view. One pass to measure, one to place: linear in the
 * node count, and the output is bounded by `maxPoints` pairs or a `gridSize` squared grid.
 * @param positions - x, y, z per node; a NaN x is an unplaced node and is skipped.
 * @param count - Nodes in `positions`.
 * @param m - The 4x4 matrix (Babylon's row-vector order) taking a graph point to view space.
 * @param options - Point limit and grid size.
 * @returns The frame and the points or grid.
 */
export function projectOverview(
    positions: ArrayLike<number>,
    count: number,
    m: ArrayLike<number>,
    options: OverviewOptions = {},
): OverviewProjection {
    const maxPoints = options.maxPoints ?? OVERVIEW_MAX_POINTS;
    const gridSize = Math.max(1, Math.floor(options.gridSize ?? OVERVIEW_GRID_SIZE));
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let placed = 0;
    for (let i = 0; i < count; i++) {
        const px = positions[3 * i];
        if (!Number.isFinite(px)) {
            continue;
        }

        const py = positions[3 * i + 1];
        const pz = positions[3 * i + 2];
        const x = px * m[0] + py * m[4] + pz * m[8];
        const y = px * m[1] + py * m[5] + pz * m[9];
        const z = px * m[2] + py * m[6] + pz * m[10];
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
        placed++;
    }

    if (placed === 0) {
        const frame = { placed, minX: 0, maxY: 0, midZ: 0, size: 1, offX: 0, offY: 0 };
        return { frame, kind: "points", points: new Float32Array(0), density: null };
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const size = Math.max(width, height) || 1;
    const frame: OverviewFrame = {
        placed,
        minX,
        maxY,
        midZ: (minZ + maxZ) / 2,
        size,
        offX: (size - width) / 2,
        offY: (size - height) / 2,
    };

    const dense = placed > maxPoints;
    const points = new Float32Array(dense ? 0 : 2 * placed);
    const counts = dense ? new Uint32Array(gridSize * gridSize) : null;
    let at = 0;
    for (let i = 0; i < count; i++) {
        const px = positions[3 * i];
        if (!Number.isFinite(px)) {
            continue;
        }

        const py = positions[3 * i + 1];
        const pz = positions[3 * i + 2];
        const { x, y } = toFrame(frame, px * m[0] + py * m[4] + pz * m[8], px * m[1] + py * m[5] + pz * m[9]);
        if (counts === null) {
            points[at++] = x;
            points[at++] = y;
        } else {
            const column = Math.min(gridSize - 1, Math.floor(x * gridSize));
            const row = Math.min(gridSize - 1, Math.floor(y * gridSize));
            counts[row * gridSize + column]++;
        }
    }

    return {
        frame,
        kind: dense ? "density" : "points",
        points,
        density: counts === null ? null : { size: gridSize, counts },
    };
}

/**
 * A view-axis point (rotation only) in frame units.
 * @param frame - The frame.
 * @param x - View-axis x.
 * @param y - View-axis y (up).
 * @returns The frame point (y down).
 */
export function toFrame(frame: OverviewFrame, x: number, y: number): { x: number; y: number } {
    return { x: (x - frame.minX + frame.offX) / frame.size, y: (frame.maxY - y + frame.offY) / frame.size };
}

/**
 * A frame point back on the view axes (rotation only).
 * @param frame - The frame.
 * @param x - Frame x.
 * @param y - Frame y (down).
 * @returns The view-axis point (y up).
 */
export function fromFrame(frame: OverviewFrame, x: number, y: number): { x: number; y: number } {
    return { x: x * frame.size + frame.minX - frame.offX, y: frame.maxY + frame.offY - y * frame.size };
}
