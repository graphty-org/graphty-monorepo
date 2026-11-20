/**
 * A file's label grid (`labelGridCellSize`, sigma.js's label grid) settled into the node screen sizes below which each
 * label is hidden. The grid is laid over the drawing as the program first frames it: the positions fitted into the
 * canvas they are drawn on. Each cell keeps the label of its largest node (then the lesser id) and shows `ceil(z * z)`
 * of its labels at `z` times that framing's zoom, so the label ranked `r` in its cell shows once its node is drawn
 * `sqrt(r)` times as large as the framing draws it. That is a minimum node screen size per label
 * (`labelMinNodeScreenSize`), which follows the camera in any viewer that draws that property.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { FilePositions } from "../positions/types.js";
import { resolveStyles } from "./plan/resolve.js";
import type { ExtractedStyles } from "./types.js";

/** The size of the canvas a drawing is first framed in, in CSS px. */
export interface StyleViewport {
    /** The canvas's width. */
    readonly width: number;
    /** The canvas's height. */
    readonly height: number;
}

/** Where the file's positions are drawn when the program first frames them. */
export interface LabelGridFrame {
    /** Each node's stored position, three numbers per node (NaN where it has none), in the file's unit. */
    readonly coords: ArrayLike<number>;
    /** The middle of the positions' bounding box, in the file's unit. */
    readonly center: readonly [number, number];
    /** The canvas px one unit of the positions is drawn as. */
    readonly pxPerUnit: number;
    /** The canvas, in CSS px. */
    readonly viewport: StyleViewport;
}

/**
 * Where a file's positions are drawn when the program that draws it fits them into a canvas, as sigma.js fits them:
 * the canvas's smaller side less `padding` px at each end, stretched by the canvas's aspect along its longer side,
 * holds the bounding box at its own proportions (sigma 4.0.1 draws a 90 x 90 box 540 px tall and a 712 x 485 one 720
 * px wide in an 800 x 600 canvas).
 * @param positions - the file's positions, or null
 * @param viewport - the canvas, or null without one
 * @returns the frame, or null when the positions keep their own length, are unusable, or there is no canvas
 */
export function labelGridFrame(positions: FilePositions | null, viewport: StyleViewport | null): LabelGridFrame | null {
    const fit = positions?.viewerFit;
    const box = positions?.bounds;
    if (positions === null || fit === undefined || box === null || box === undefined || viewport === null) {
        return null;
    }
    const width = box.max[0] - box.min[0];
    const height = box.max[1] - box.min[1];
    const short = Math.min(viewport.width, viewport.height);
    const inside = (short - 2 * fit.padding) / short;
    const across = [(inside * viewport.width) / width, (inside * viewport.height) / height].filter(
        (k) => Number.isFinite(k) && k > 0,
    );
    if (across.length === 0) {
        return null;
    }
    return {
        coords: positions.coords,
        center: [(box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2],
        pxPerUnit: Math.min(...across),
        viewport,
    };
}

/**
 * Each node's minimum screen size under the grid: null for the label its cell shows first.
 * @param extracted - the file's styles
 * @param snapshot - the graph
 * @param frame - the program's first framing
 * @returns the sizes by node index, or null when no node has a label and a cell
 */
export function labelGridSizes(
    extracted: ExtractedStyles,
    snapshot: GraphSnapshot,
    frame: LabelGridFrame,
): (number | null)[] | null {
    const resolve = (
        property: "labelGridCellSize" | "label" | "width" | "height" | "labelMinNodeScreenSize",
    ): readonly unknown[] => resolveStyles(extracted, "node", property, snapshot);
    const [cellSizes, labels, widths, heights, floors] = [
        resolve("labelGridCellSize"),
        resolve("label"),
        resolve("width"),
        resolve("height"),
        resolve("labelMinNodeScreenSize"),
    ];
    const { coords, center, pxPerUnit: k, viewport } = frame;
    const num = (values: readonly unknown[], i: number): number | null => {
        const value = values[i];
        return typeof value === "number" && Number.isFinite(value) ? value : null;
    };
    const cells = new Map<string, number[]>();
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const cell = num(cellSizes, i);
        const [x, y] = [coords[3 * i], coords[3 * i + 1]];
        // sigma files a node by its label being a string, the empty one too (it is then not drawn)
        if (cell === null || cell <= 0 || typeof labels[i] !== "string" || !Number.isFinite(x + y)) {
            continue;
        }
        const sx = viewport.width / 2 + (x - center[0]) * k;
        const sy = viewport.height / 2 - (y - center[1]) * k;
        const key = `${String(cell)} ${String(Math.floor(sy / cell) * Math.ceil(viewport.width / cell) + Math.floor(sx / cell))}`;
        const members = cells.get(key) ?? [];
        members.push(i);
        cells.set(key, members);
    }
    if (cells.size === 0) {
        return null;
    }
    const side = (i: number): number => Math.min(num(widths, i) ?? 0, num(heights, i) ?? num(widths, i) ?? 0);
    const id = (i: number): string => String(snapshot.ids.idOf(i));
    const sizes = new Array<number | null>(snapshot.nodeCount).fill(null);
    for (const members of cells.values()) {
        // the larger node first, then the lesser id compared as text (sigma's LabelCandidate.compare)
        members.sort((a, b) => side(b) - side(a) || (id(a) > id(b) ? 1 : -1));
        members.forEach((i, rank) => {
            if (rank > 0) {
                sizes[i] = Math.max(num(floors, i) ?? 0, side(i) * k * Math.sqrt(rank));
            }
        });
    }
    return sizes;
}
