/**
 * Cytoscape desktop's charts (`NODE_CUSTOMGRAPHICS_1` .. `_9` holding `org.cytoscape.PieChart:{...}`,
 * `org.cytoscape.RingChart:{...}`, `BarChart`, `LineChart`, `BoxChart` or `HeatMapChart`), read per node from the
 * node's own data as the neutral `pie*` properties (pie and ring) and `chart*` properties (the others)
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
    readonly cy_range?: unknown;
    readonly cy_globalRange?: unknown;
    readonly cy_type?: unknown;
    readonly cy_orientation?: unknown;
    readonly cy_separation?: unknown;
    readonly cy_borderWidth?: unknown;
    readonly cy_borderColor?: unknown;
    readonly cy_lineWidth?: unknown;
    readonly cy_showItemLabels?: unknown;
    readonly cy_itemLabels?: unknown;
    readonly cy_itemLabelsColumn?: unknown;
    readonly cy_itemLabelFontSize?: unknown;
}

/** The charts Cytoscape draws, by the name of their class. */
type ChartKind = "PieChart" | "RingChart" | "BarChart" | "LineChart" | "BoxChart" | "HeatMapChart";

/** A Cytoscape chart class name, without its package. */
const CHART_CLASS = /^org\.cytoscape\.(PieChart|RingChart|BarChart|LineChart|BoxChart|HeatMapChart)$/;

/**
 * The chart a custom graphics value holds, or null for anything else.
 * @param raw - the value
 * @returns the chart's kind and options
 */
function chartOf(raw: unknown): { kind: ChartKind; ring: boolean; options: ChartOptions } | null {
    // CX2 writes the chart as an object, the desktop, CX and sessions as `<class>:<options as JSON>`
    if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
        const o = raw as { type?: unknown; name?: unknown; properties?: unknown };
        const kind = CHART_CLASS.exec(typeof o.name === "string" ? o.name : "")?.[1] as ChartKind | undefined;
        return kind !== undefined && typeof o.properties === "object" && o.properties !== null
            ? { kind, ring: kind === "RingChart", options: o.properties }
            : null;
    }
    if (typeof raw !== "string") {
        return null;
    }
    const m = /^(org\.cytoscape\.\w+):(\{.*\})\s*$/s.exec(raw.trim());
    const kind = m === null ? undefined : (CHART_CLASS.exec(m[1])?.[1] as ChartKind | undefined);
    if (m === null || kind === undefined) {
        return null;
    }
    try {
        const options = JSON.parse(m[2]) as unknown;
        return typeof options === "object" && options !== null
            ? { kind, ring: kind === "RingChart", options: options }
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
        if (chart.kind !== "PieChart" && chart.kind !== "RingChart") {
            const [w, h] = [out.width?.[i], out.height?.[i]];
            const own = Number(graphicOf(`NODE_CUSTOMGRAPHICS_SIZE_${String(slot + 1)}`, i));
            const side = typeof w === "number" && typeof h === "number" ? Math.min(w, h) : null;
            const disc = side === null ? null : CHART_ACROSS * (sizeSync || !(own > 0) ? side : own);
            const set = plotChart(
                chart.kind,
                options,
                values,
                colors,
                disc === null || side === null ? null : { disc, side },
            );
            for (const [property, v] of Object.entries(set)) {
                col(property)[i] = v;
            }
            continue;
        }
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
        const texts = pieItemLabels(options, values, colors, (c) => value(c, i), {
            start: Number.isFinite(start) ? start : 0,
            radius: (CHART_ACROSS * (fitted || side === null ? 1 : own / side) * (side ?? 0)) / 2,
            dx: Number(out.pieOffsetX?.[i] ?? 0),
            dy: Number(out.pieOffsetY?.[i] ?? 0),
            w: typeof w === "number" ? w : null,
            h: typeof h === "number" ? h : null,
        });
        if (texts !== null && (out.shapeTexts?.[i] ?? null) === null) {
            col("shapeTexts")[i] = texts;
        }
        if (chart.ring) {
            const hole = Number(options.cy_holeSize ?? RING_HOLE);
            col("pieHole")[i] = Number.isFinite(hole) ? Math.max(0, Math.min(1, hole)) : RING_HOLE;
        }
    }
}

/**
 * Where Cytoscape's pie draws an item label: centered on its slice's middle, this share of the radius out (measured
 * from its SVG export of xgmml-specimen-images-charts-p5 and -p7: 16.4 to 17.3 px from the center of a 27.2 px disc,
 * at 1, 10 and 20 px).
 */
const ITEM_LABEL_RADIUS = 0.62;

/**
 * The size of a chart's item labels, in the file's lengths, when its options name none: Cytoscape 3.10.5 draws them 1
 * px tall (xgmml-specimen-images-charts-p5 `pie-item-labels`).
 */
const ITEM_LABEL_FONT_SIZE = 1;

/** The color JFreeChart draws Cytoscape's chart labels in. */
const CHART_LABEL_COLOR = "#404040";

/**
 * A chart's item labels: `cy_itemLabels`, or the node's list in `cy_itemLabelsColumn`, one per data column; none
 * unless `cy_showItemLabels` is on.
 * @param options - the chart's options
 * @param value - reads the node's value of a column
 * @returns the labels, or null
 */
function itemLabelsOf(options: ChartOptions, value: (column: string) => unknown): string[] | null {
    if (options.cy_showItemLabels !== true) {
        return null;
    }
    const column = typeof options.cy_itemLabelsColumn === "string" ? value(options.cy_itemLabelsColumn) : undefined;
    const list = Array.isArray(column) ? column : options.cy_itemLabels;
    return Array.isArray(list) ? list.map((v) => (v === null || v === undefined ? "" : String(v))) : null;
}

/**
 * A pie's or a ring's item labels as the node's further texts (`shapeTexts`), as Cytoscape 3.10.5 draws them
 * (measured from its SVG export of the specimen sheets): each slice's label centered on the middle of its slice, a
 * share of the disc's radius out from its center, in `cy_itemLabelFontSize` (the file's lengths) and JFreeChart's
 * dark gray.
 * @param options - the chart's options
 * @param values - the node's values, one per data column
 * @param colors - the chart's colors, one per data column
 * @param value - reads the node's value of a column
 * @param at - where the disc is: its start angle (degrees counter-clockwise from 3 o'clock), radius and offset from
 * the node's center (y down), and the node's width and height
 * @param at.start - start angle
 * @param at.radius - the disc's radius
 * @param at.dx - offset right
 * @param at.dy - offset down
 * @param at.w - the node's width
 * @param at.h - the node's height
 * @returns the texts as JSON, or null for none
 */
function pieItemLabels(
    options: ChartOptions,
    values: readonly number[],
    colors: readonly string[],
    value: (column: string) => unknown,
    at: { start: number; radius: number; dx: number; dy: number; w: number | null; h: number | null },
): string | null {
    const labels = itemLabelsOf(options, value);
    const { w, h } = at;
    if (labels === null || w === null || h === null || !(w > 0 && h > 0) || !(at.radius > 0)) {
        return null;
    }
    const shown = values.map((v, k) => Number.isFinite(v) && v > 0 && colors[k] !== undefined);
    const total = values.reduce((sum, v, k) => sum + (shown[k] ? v : 0), 0);
    const size = Number(options.cy_itemLabelFontSize ?? ITEM_LABEL_FONT_SIZE);
    const texts: [number, number, string, { size: number; color: string }][] = [];
    let from = at.start;
    values.forEach((v, k) => {
        if (!shown[k]) {
            return;
        }
        const sweep = (360 * v) / total;
        const mid = ((from + sweep / 2) * Math.PI) / 180;
        from += sweep;
        const text = labels[k] ?? "";
        if (text === "") {
            return;
        }
        // counter-clockwise from 3 o'clock, y up in the node's frame
        const x = at.dx + ITEM_LABEL_RADIUS * at.radius * Math.cos(mid);
        const y = -at.dy + ITEM_LABEL_RADIUS * at.radius * Math.sin(mid);
        texts.push([
            num6(x / (w / 2)),
            num6(y / (h / 2)),
            text,
            {
                size: num6((Number.isFinite(size) && size > 0 ? size : ITEM_LABEL_FONT_SIZE) / h),
                color: CHART_LABEL_COLOR,
            },
        ]);
    });
    return texts.length === 0 ? null : JSON.stringify(texts);
}

/** How many of the file's lengths one of Cytoscape's chart units is: it draws a chart at twice the node's scale. */
const CHART_UNIT = 0.5;

/**
 * How far in from the disc a pie would fill Cytoscape draws a chart's plot, in the file's lengths, measured from its
 * SVG export of the specimen sheets (60 nodes): the chart's own box is 0.9 of the node less 0.9, its plot 1 less
 * again, a heat map's 2 less.
 */
const CHART_INSET = 0.9;
const PLOT_INSET = 1;
const HEAT_MAP_INSET = 2;

/** The default outline Cytoscape draws round each bar and box, in chart units: JFreeChart's dark gray, a quarter wide. */
const BAR_OUTLINE = { color: "#404040", width: 0.25 };

/** How much of the category side JFreeChart leaves at each end of a bar and a box chart, and of a line chart. */
const BAR_MARGIN = 0.025;
const LINE_MARGIN = -0.0125;

/** The share of its range JFreeChart adds above a line chart's, and above an automatic range's top. */
const RANGE_HEADROOM = 0.1;

/**
 * A color between two `#rrggbb` colors, each channel rounded, as Cytoscape interpolates a heat map's.
 * @param a - the color at 0
 * @param b - the color at 1
 * @param t - how far, 0..1
 * @returns the color
 */
function mix(a: string, b: string, t: number): string {
    const rgb = (c: string): number[] => [1, 3, 5].map((k) => Number.parseInt(c.slice(k, k + 2), 16));
    const [x, y] = [rgb(a), rgb(b)];
    if ([...x, ...y].some((v) => !Number.isFinite(v))) {
        return a;
    }
    const u = Math.max(0, Math.min(1, t));
    return `#${x
        .map((v, k) =>
            Math.round(v + (y[k] - v) * u)
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")}`;
}

/**
 * A value's color on Cytoscape's three-color scale (`[up, zero, down]`): from the zero color toward the up color as
 * the value nears the top of the range, toward the down color as it nears the bottom (`cy-heat-map`: 5 of 0..10
 * half way from #F7F7F7 to #2166AC).
 * @param colors - the three colors
 * @param v - the value
 * @param range - the range
 * @returns the color
 */
function scaleColor(colors: readonly string[], v: number, range: readonly [number, number]): string {
    const [up, zero, down] = [colors[0], colors[1] ?? colors[0], colors[2] ?? colors[0]];
    return v >= 0 ? mix(zero, up, range[1] > 0 ? v / range[1] : 0) : mix(zero, down, range[0] < 0 ? v / range[0] : 0);
}

/**
 * The quartiles, median and whiskers JFreeChart draws a box chart's values as (`BoxAndWhiskerCalculator`): the
 * quartiles are the medians of each half, the middle value in both halves of an odd count; each whisker reaches the
 * furthest value within 1.5 times the quartiles' spread.
 * @param values - the values
 * @returns low whisker, lower quartile, median, upper quartile, high whisker
 */
function boxStats(values: readonly number[]): number[] {
    const v = [...values].sort((a, b) => a - b);
    const median = (list: readonly number[]): number => {
        const m = list.length / 2;
        return list.length % 2 === 1 ? list[Math.floor(m)] : (list[m - 1] + list[m]) / 2;
    };
    const half = Math.ceil(v.length / 2);
    const [q1, q3] = [median(v.slice(0, half)), median(v.slice(v.length - half))];
    const reach = 1.5 * (q3 - q1);
    const inside = v.filter((x) => x >= q1 - reach && x <= q3 + reach);
    return [inside[0], q1, median(v), q3, inside[inside.length - 1]];
}

/**
 * A bar, line, box or heat map chart as the neutral `chart*` properties, as Cytoscape 3.10.5 draws it (measured from
 * its own SVG export of the specimen sheets: JFreeChart plots in a square box inset from the disc a pie fills).
 * @param kind - the chart's class
 * @param options - its options
 * @param values - the node's values for its data columns
 * @param colors - its colors
 * @param box - how far across a pie would be drawn on the node and the node's shorter side, in the file's lengths;
 *     null when the node's size is unknown
 * @param box.disc - the pie's width
 * @param box.side - the node's shorter side
 * @returns the properties to set
 */
function plotChart(
    kind: Exclude<ChartKind, "PieChart" | "RingChart">,
    options: ChartOptions,
    values: readonly number[],
    colors: readonly string[],
    box: { disc: number; side: number } | null,
): Record<string, StyleValue> {
    const finite = values.filter((v) => Number.isFinite(v));
    if (finite.length === 0 || colors.length === 0) {
        // ponytail: a chart colored by a named scheme (cy_colorScheme) without its colors is not drawn
        return {};
    }
    const given = Array.isArray(options.cy_range) ? options.cy_range.map(Number) : [];
    const global = options.cy_globalRange !== false && given.length === 2 && given.every((v) => Number.isFinite(v));
    // an automatic range holds zero and the values, with headroom above
    const auto: [number, number] = [Math.min(0, ...finite), Math.max(0, ...finite)];
    auto[1] += RANGE_HEADROOM * (auto[1] - auto[0]);
    const range: [number, number] = global ? [given[0], given[1]] : auto;
    const horizontal = options.cy_orientation === "HORIZONTAL";
    const type = typeof options.cy_type === "string" ? options.cy_type : "GROUPED";
    const lower = (c: string): string => c.toLowerCase();
    const out: Record<string, StyleValue> = {};
    // the plot inside the disc a pie fills, as a share of the node
    if (box !== null && box.side > 0) {
        // ponytail: the insets are measured on 60 nodes only; whether they scale with the node is not known
        const inset = CHART_INSET + (kind === "HeatMapChart" ? HEAT_MAP_INSET : PLOT_INSET);
        out.chartSize = num6(Math.max(0, box.disc - inset) / box.side);
    }
    const outline = {
        chartBorderColor: lower(
            typeof options.cy_borderColor === "string" ? options.cy_borderColor : BAR_OUTLINE.color,
        ),
        chartBorderWidth: num6(CHART_UNIT * (Number(options.cy_borderWidth ?? BAR_OUTLINE.width) || 0)),
    };
    switch (kind) {
        case "BarChart": {
            const stacked = type === "STACKED";
            const each = (v: number, k: number): string => {
                if (type === "HEAT_STRIPS") {
                    return scaleColor(colors, v, range);
                }
                return lower(
                    type === "UP_DOWN"
                        ? colors[v >= 0 ? 0 : colors.length - 1]
                        : colors[Math.min(k, colors.length - 1)],
                );
            };
            Object.assign(out, outline, {
                chartKind: stacked ? "stacked-bar" : "bar",
                chartValues: finite.join(" "),
                chartColors: finite.map(each).join(" "),
                chartMin: range[0],
                chartMax: range[1],
                // Cytoscape lays a stacked bar's values across the node when its orientation says up
                chartHorizontal: stacked ? !horizontal : horizontal,
                chartMargin: BAR_MARGIN,
                chartGap: num6(Math.max(0, Math.min(1, Number(options.cy_separation ?? 0) || 0))),
            });
            break;
        }
        case "LineChart":
            // drawn up the node whatever its orientation, with headroom above its range
            Object.assign(out, {
                chartKind: "line",
                chartValues: finite.join(" "),
                chartColors: lower(colors[0]),
                chartMin: range[0],
                chartMax: num6(range[1] + (global ? RANGE_HEADROOM * (range[1] - range[0]) : 0)),
                chartMargin: LINE_MARGIN,
                chartLineWidth: num6(CHART_UNIT * (Number(options.cy_lineWidth ?? 1) || 0)),
            });
            break;
        case "BoxChart":
            Object.assign(out, outline, {
                chartKind: "box",
                chartValues: boxStats(finite).map(num6).join(" "),
                chartColors: `${lower(colors[0])} #000000`,
                chartMin: range[0],
                chartMax: range[1],
                chartHorizontal: horizontal,
                chartMargin: BAR_MARGIN,
                chartLineWidth: num6(CHART_UNIT * BAR_OUTLINE.width),
            });
            break;
        case "HeatMapChart": {
            // one cell per value, top to bottom; laid left to right, the last value first
            const cells = horizontal ? [...finite].reverse() : finite;
            Object.assign(out, {
                chartKind: "cells",
                chartValues: cells.join(" "),
                chartColors: cells.map((v) => scaleColor(colors, v, range)).join(" "),
                chartHorizontal: !horizontal,
            });
            break;
        }
        default:
            break;
    }
    return out;
}
