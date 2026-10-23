/**
 * @file A file's label grid (graph-io's `labelGridCellSize`, sigma.js's label grid) turned into the
 * node screen sizes below which each label is hidden. The grid is laid over the drawing as the
 * program first frames it: the positions fitted into the canvas the element draws on. Each cell
 * keeps the label of its largest node (then the lesser id) and shows `ceil(z * z)` of its labels at
 * `z` times that framing's zoom, so the label ranked `r` in its cell shows once its node is drawn
 * `sqrt(r)` times as large as the framing draws it. That is a minimum node screen size per label,
 * which the element already draws (`node.labelMinNodeScreenSize`), so it follows the camera.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import { type ExtractedStyles, resolveStyles, type StyleRule } from "@graphty/graph-io/styles";

/** The style column the grid's sizes are written to. */
const GRID_KEY = "labelGrid.minNodeScreenSize";

/** Where the file's positions are drawn when the program first frames them. */
export interface LabelGridFrame {
    /** Each node's stored position, three numbers per node (NaN where it has none), in the file's unit. */
    readonly coords: ArrayLike<number>;
    /** The middle of the positions' bounding box, in the file's unit. */
    readonly center: readonly [number, number];
    /** The canvas px one unit of the positions is drawn as. */
    readonly pxPerUnit: number;
    /** The canvas, in CSS px. */
    readonly viewport: { readonly width: number; readonly height: number };
}

/**
 * The styles with their label grid drawn as minimum node screen sizes, and the grid's own property
 * taken out of every rule (no channel draws it).
 * @param extracted - The file's styles.
 * @param snapshot - The graph the styles' element indexes refer to.
 * @param frame - The program's first framing, or null when there is no canvas or no fitted positions.
 * @returns The styles unchanged when no rule sets a grid; else the styles with the grid applied (or
 *     only taken out, without a frame).
 */
export function withLabelGrid(
    extracted: ExtractedStyles,
    snapshot: GraphSnapshot,
    frame: LabelGridFrame | null,
): ExtractedStyles {
    const { rules } = extracted.styles;
    if (!rules.some((rule) => rule.set?.labelGridCellSize !== undefined || rule.map?.labelGridCellSize !== undefined)) {
        return extracted;
    }

    const sizes = frame === null ? null : gridSizes(extracted, snapshot, frame);
    const stripped = rules.map(withoutGrid);
    if (sizes === null) {
        return { ...extracted, styles: { ...extracted.styles, rules: stripped } };
    }
    const rule: StyleRule = {
        id: "node.tool.label-grid",
        target: "node",
        role: "group",
        origin: "tool",
        where: { has: { style: GRID_KEY } },
        map: { labelMinNodeScreenSize: { kind: "passthrough", by: { style: GRID_KEY } } },
    };
    return {
        ...extracted,
        styles: { ...extracted.styles, rules: [...stripped, rule] },
        columns: { ...extracted.columns, node: new Map([...extracted.columns.node, [GRID_KEY, sizes]]) },
    };
}

/**
 * A rule without the grid's property.
 * @param rule - The rule.
 * @returns The rule, or a copy without `labelGridCellSize`.
 */
function withoutGrid(rule: StyleRule): StyleRule {
    if (rule.set?.labelGridCellSize === undefined && rule.map?.labelGridCellSize === undefined) {
        return rule;
    }
    const { labelGridCellSize: _set, ...set } = rule.set ?? {};
    const { labelGridCellSize: _map, ...map } = rule.map ?? {};
    return { ...rule, ...(rule.set === undefined ? {} : { set }), ...(rule.map === undefined ? {} : { map }) };
}

/**
 * Each node's minimum screen size under the grid: null for the label its cell shows first.
 * @param extracted - The file's styles.
 * @param snapshot - The graph.
 * @param frame - The program's first framing.
 * @returns The sizes by node index, or null when no node has a label and a cell.
 */
function gridSizes(
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
        const key = `${cell} ${Math.floor(sy / cell) * Math.ceil(viewport.width / cell) + Math.floor(sx / cell)}`;
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
