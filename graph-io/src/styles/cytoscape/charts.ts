/**
 * Cytoscape desktop's pie and ring charts (`NODE_CUSTOMGRAPHICS_1` .. `_9` holding `org.cytoscape.PieChart:{...}` or
 * `org.cytoscape.RingChart:{...}`), read per node from the node's own data as the neutral `pie*` properties
 * (https://manual.cytoscape.org/en/stable/Styles.html#using-graphics-in-styles).
 *
 * As Cytoscape 3.10.5 draws them (measured from its own SVG export): each slice is its data column's share of the
 * node's values, the slices run counter-clockwise from `cy_startAngle` degrees counter-clockwise from 3 o'clock,
 * the disc is 0.9 of the node across (of `NODE_CUSTOMGRAPHICS_SIZE_<slot>` with `nodeCustomGraphicsSizeSync` off),
 * and a ring's hole is `cy_holeSize` (default 0.4) of its radius. The same pie
 * drawn clockwise is its slices in reverse order from where the last one ends.
 */

import { num6 } from "../canon/number.js";
import type { StyleColumn, StyleValue } from "../types.js";

/** How far across the node Cytoscape draws a pie, measured from its SVG export. */
const CHART_ACROSS = 0.9;

/** A ring chart's hole when its options name none (Cytoscape's `RingChart` default). */
const RING_HOLE = 0.4;

/** The custom graphics slots, in the order Cytoscape stacks them. */
const SLOTS = Array.from({ length: 9 }, (_, k) => `NODE_CUSTOMGRAPHICS_${String(k + 1)}`);

/** A chart's options as Cytoscape writes them. */
interface ChartOptions {
    readonly cy_colors?: unknown;
    readonly cy_dataColumns?: unknown;
    readonly cy_startAngle?: unknown;
    readonly cy_holeSize?: unknown;
}

/**
 * The pie or ring chart a custom graphics value holds, or null for anything else.
 * @param raw - the value
 * @returns the chart's kind and options
 */
function chartOf(raw: unknown): { ring: boolean; options: ChartOptions } | null {
    // CX2 writes the chart as an object, the desktop, CX and sessions as `<class>:<options as JSON>`
    if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
        const o = raw as { type?: unknown; name?: unknown; properties?: unknown };
        const kind = /^org\.cytoscape\.(PieChart|RingChart)$/.exec(typeof o.name === "string" ? o.name : "")?.[1];
        return kind !== undefined && typeof o.properties === "object" && o.properties !== null
            ? { ring: kind === "RingChart", options: o.properties }
            : null;
    }
    if (typeof raw !== "string") {
        return null;
    }
    const m = /^org\.cytoscape\.(PieChart|RingChart):(\{.*\})\s*$/s.exec(raw.trim());
    if (m === null) {
        return null;
    }
    try {
        const options = JSON.parse(m[2]) as unknown;
        return typeof options === "object" && options !== null
            ? { ring: m[1] === "RingChart", options: options }
            : null;
    } catch {
        return null;
    }
}

/** Where each of Cytoscape's anchors is on a box, as fractions of its half width and half height, y down. */
const ANCHORS: Readonly<Record<string, readonly [number, number]>> = {
    C: [0, 0],
    N: [0, -1],
    NE: [1, -1],
    E: [1, 0],
    SE: [1, 1],
    S: [0, 1],
    SW: [-1, 1],
    W: [-1, 0],
    NW: [-1, -1],
};

/**
 * A custom graphic's position: `NODE_CUSTOMGRAPHICS_POSITION_<slot>` as the desktop writes it
 * (`<node anchor>,<graphic anchor>,<justification>,<x offset>,<y offset>`) or as CX2 does (an object of
 * `ENTITY_ANCHOR`, `GRAPHICS_ANCHOR`, `MARGIN_X`, `MARGIN_Y`).
 * @param raw - the value
 * @returns the anchors and offsets, or null when it does not read
 */
function positionOf(
    raw: unknown,
): { node: readonly [number, number]; chart: readonly [number, number]; x: number; y: number } | null {
    let parts: [unknown, unknown, unknown, unknown];
    if (typeof raw === "string") {
        const p = raw.split(",");
        parts = [p[0], p[1], p[3], p[4]];
    } else if (typeof raw === "object" && raw !== null) {
        const o = raw as Record<string, unknown>;
        parts = [o.ENTITY_ANCHOR, o.GRAPHICS_ANCHOR, o.MARGIN_X, o.MARGIN_Y];
    } else {
        return null;
    }
    const anchor = (v: unknown): readonly [number, number] | undefined =>
        typeof v === "string" ? ANCHORS[v.trim().toUpperCase()] : undefined;
    const [node, chart] = [anchor(parts[0]), anchor(parts[1])];
    const [x, y] = [Number(parts[2] ?? 0), Number(parts[3] ?? 0)];
    return node === undefined || chart === undefined
        ? null
        : { node, chart, x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
}

/**
 * A node's values for a chart's data columns: one per column, or the items of a single list column.
 * @param columns - the chart's data columns
 * @param value - reads the node's value of a column
 * @returns the values, NaN where one is not a number
 */
function valuesOf(columns: readonly string[], value: (column: string) => unknown): number[] {
    const first = columns.length === 1 ? value(columns[0]) : undefined;
    const raw = Array.isArray(first) ? (first as unknown[]) : columns.map((c) => value(c));
    return raw.map((v) => (typeof v === "number" ? v : Number(v)));
}

/**
 * Sets each node's `pie*` properties from the first pie or ring chart among its custom graphics.
 * @param out - the node values per property, changed in place
 * @param n - the node count
 * @param graphicOf - a node's resolved value of a custom graphics slot
 * @param value - a node's value of a data column
 * @param sizeSync - whether charts are fitted to their node (`nodeCustomGraphicsSizeSync`, true by default)
 */
export function readCytoscapeCharts(
    out: Partial<Record<string, StyleColumn>>,
    n: number,
    graphicOf: (slot: string, i: number) => unknown,
    value: (column: string, i: number) => unknown,
    sizeSync: boolean,
): void {
    const col = (property: string): (StyleValue | null)[] => {
        const existing = out[property];
        if (existing !== undefined) {
            return existing as (StyleValue | null)[];
        }
        const fresh = new Array<StyleValue | null>(n).fill(null);
        out[property] = fresh;
        return fresh;
    };
    for (let i = 0; i < n; i++) {
        const slot = SLOTS.findIndex((vp) => chartOf(graphicOf(vp, i)) !== null);
        const chart = slot < 0 ? null : chartOf(graphicOf(SLOTS[slot], i));
        if (chart === null) {
            continue;
        }
        const { options } = chart;
        const colors = Array.isArray(options.cy_colors) ? options.cy_colors.map(String) : [];
        const columns = Array.isArray(options.cy_dataColumns) ? options.cy_dataColumns.map(String) : [];
        const values = valuesOf(columns, (c) => value(c, i));
        const total = values.reduce((sum, v) => sum + (Number.isFinite(v) && v > 0 ? v : 0), 0);
        const slices = values.flatMap((v, k) =>
            Number.isFinite(v) && v > 0 && colors[k] !== undefined
                ? [{ color: colors[k].toLowerCase(), size: v / total }]
                : [],
        );
        if (slices.length === 0) {
            continue;
        }
        const start = Number(options.cy_startAngle ?? 0);
        // counter-clockwise from `start` past 3 o'clock is clockwise from 12 o'clock at 90 - start, slices reversed
        const reversed = [...slices].reverse();
        col("pieColors")[i] = reversed.map((s) => s.color).join(" ");
        col("pieSizes")[i] = reversed.map((s) => String(num6(s.size))).join(" ");
        // fitted to the node, or with `nodeCustomGraphicsSizeSync` off at the slot's own size
        const own = Number(graphicOf(`NODE_CUSTOMGRAPHICS_SIZE_${String(slot + 1)}`, i));
        const [w, h] = [out.width?.[i], out.height?.[i]];
        const side = typeof w === "number" && typeof h === "number" ? Math.min(w, h) : null;
        const fitted = sizeSync || !(own > 0) || side === null || side <= 0;
        col("pieRadius")[i] = fitted ? CHART_ACROSS : num6((CHART_ACROSS * own) / side);
        // as Cytoscape 3.10.5 draws a chart's position (measured from its SVG export of the specimen sheets, every
        // anchor pair they hold, fitted and at a size of its own): the node anchor scales by the drawn disc and the
        // chart anchor by the node, so on a 60 node NW,NW moves a fitted 54 disc 3 px down and right and a 21.6 disc
        // 19 px, C,NW puts either one's center 30 px down and right, and E,W puts a fitted disc 57 px right; then
        // the position's offsets (y down)
        const at = positionOf(graphicOf(`NODE_CUSTOMGRAPHICS_POSITION_${String(slot + 1)}`, i));
        if (at !== null && typeof w === "number" && typeof h === "number") {
            const disc = CHART_ACROSS * (fitted ? Math.min(w, h) : own);
            const dx = (at.node[0] * disc) / 2 - (at.chart[0] * w) / 2 + at.x;
            const dy = (at.node[1] * disc) / 2 - (at.chart[1] * h) / 2 + at.y;
            if (dx !== 0 || dy !== 0) {
                col("pieOffsetX")[i] = num6(dx);
                col("pieOffsetY")[i] = num6(dy);
            }
        }
        col("pieRotation")[i] = num6((((90 - (Number.isFinite(start) ? start : 0)) % 360) + 360) % 360);
        if (chart.ring) {
            const hole = Number(options.cy_holeSize ?? RING_HOLE);
            col("pieHole")[i] = Number.isFinite(hole) ? Math.max(0, Math.min(1, hole)) : RING_HOLE;
        }
    }
}
