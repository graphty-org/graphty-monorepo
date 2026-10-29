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

import { DIALOG_LINE_HEIGHT, dialogWidth } from "../../formats/gexf/dialog-metrics.js";
import { num6 } from "../canon/number.js";
import type { StyleColumn, StyleValue } from "../types.js";
import { colorSchemeColors } from "./color-schemes.js";

/** How far across the node Cytoscape draws a pie, measured from its SVG export. */
const CHART_ACROSS = 0.9;

/** A ring chart's hole when its options name none (Cytoscape's `RingChart` default). */
const RING_HOLE = 0.4;

/** The custom graphics slots, in the order Cytoscape stacks them. */
const SLOTS = Array.from({ length: 9 }, (_, k) => `NODE_CUSTOMGRAPHICS_${String(k + 1)}`);

/** A chart's options as Cytoscape writes them. */
interface ChartOptions {
    readonly cy_colors?: unknown;
    readonly cy_colorScheme?: unknown;
    readonly cy_values?: unknown;
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
    readonly cy_showRangeAxis?: unknown;
    readonly cy_showDomainAxis?: unknown;
    readonly cy_axisLabelFontSize?: unknown;
    readonly cy_domainLabelPosition?: unknown;
    readonly cy_domainLabelsColumn?: unknown;
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
        const [w, h] = [out.width?.[i], out.height?.[i]];
        chartOnNode(
            chart,
            {
                put: (property, v) => {
                    col(property)[i] = v;
                },
                get: (property) => out[property]?.[i],
                graphic: (name) => graphicOf(`${name}_${String(slot + 1)}`, i),
                value: (column) => value(column, i),
                w: typeof w === "number" ? w : null,
                h: typeof h === "number" ? h : null,
            },
            sizeSync,
        );
    }
}

/** A node with a chart: what it reads, and where its values go. */
interface ChartNode {
    /** sets one of the node's values */
    readonly put: (property: string, v: StyleValue) => void;
    /** one of the node's values as set so far */
    readonly get: (property: string) => StyleValue | null | undefined;
    /** the node's value of one of its chart slot's custom graphics properties, by name without the slot number */
    readonly graphic: (name: string) => unknown;
    /** the node's value of a data column */
    readonly value: (column: string) => unknown;
    /** the node's width, or null when it is not a number */
    readonly w: number | null;
    /** the node's height, or null when it is not a number */
    readonly h: number | null;
}

/**
 * A node's shorter side, when its width and height are known.
 * @param node - the node
 * @returns the side, or null
 */
function shorterSide(node: ChartNode): number | null {
    return node.w !== null && node.h !== null ? Math.min(node.w, node.h) : null;
}

/**
 * Sets a node's `pie*` or `chart*` properties from its chart.
 * @param chart - the chart
 * @param chart.kind - its class
 * @param chart.ring - whether it is a ring
 * @param chart.options - its options
 * @param node - the node
 * @param sizeSync - whether charts are fitted to their node
 */
function chartOnNode(
    chart: { kind: ChartKind; ring: boolean; options: ChartOptions },
    node: ChartNode,
    sizeSync: boolean,
): void {
    const { options } = chart;
    const columns = Array.isArray(options.cy_dataColumns) ? options.cy_dataColumns.map(String) : [];
    // the chart's own values, when it holds any, before its data columns (`AbstractChart.getData`)
    const own = Array.isArray(options.cy_values) && options.cy_values.length > 0 ? options.cy_values : null;
    const values = own === null ? valuesOf(columns, node.value) : own.map(Number);
    const named = Array.isArray(options.cy_colors) ? options.cy_colors.map(String) : [];
    // no colors named: the scheme's, one per value (`AbstractChart.getColors`)
    const colors = named.length > 0 ? named : colorSchemeColors(options.cy_colorScheme, values.length);
    if (chart.kind === "PieChart" || chart.kind === "RingChart") {
        pieOnNode(chart.ring, options, values, colors, node, sizeSync);
        return;
    }
    const ownSize = Number(node.graphic("NODE_CUSTOMGRAPHICS_SIZE"));
    const side = shorterSide(node);
    const fitted = sizeSync || Number.isNaN(ownSize) || ownSize <= 0;
    const box = side === null ? null : { disc: CHART_ACROSS * (fitted ? side : ownSize), side };
    const plotted = plotChart(chart.kind, options, values, colors, box);
    const names = domainNames(options, columns, own !== null, node.value);
    const axes = box === null ? null : chartAxes(options, plotted, box.disc, node, (k) => names[k]);
    for (const [property, v] of Object.entries({ ...plotted, ...axes?.plot })) {
        node.put(property, v);
    }
    if (axes !== null && axes.texts.length > 0 && (node.get("shapeTexts") ?? null) === null) {
        node.put("shapeTexts", JSON.stringify(axes.texts));
    }
}

/**
 * The names a chart's categories carry on its domain axis, one per value: the node's list in
 * `cy_domainLabelsColumn`, else the data columns' names when there is one column per value; none for a list column's
 * values or the chart's own, whose names Cytoscape makes up itself.
 * @param options - the chart's options
 * @param columns - its data columns
 * @param own - whether it draws its own values
 * @param value - reads the node's value of a column
 * @returns the names by value, an empty string where there is none
 */
function domainNames(
    options: ChartOptions,
    columns: readonly string[],
    own: boolean,
    value: (column: string) => unknown,
): string[] {
    const listed = typeof options.cy_domainLabelsColumn === "string" ? value(options.cy_domainLabelsColumn) : null;
    if (Array.isArray(listed)) {
        return listed.map((v) => (v === null || v === undefined ? "" : String(v)));
    }
    // ponytail: a list column's categories are named by Cytoscape (the line chart's fourth and fifth show as "..."),
    // left unnamed until a sample shows what it calls them
    return own || (columns.length === 1 && Array.isArray(value(columns[0]))) ? [] : [...columns];
}

/**
 * Each slice of a pie: a value above 0 with a color, its share of the values above 0.
 * @param values - the node's values
 * @param colors - the chart's colors
 * @returns the slices in order
 */
function pieSlices(values: readonly number[], colors: readonly string[]): { color: string; size: number }[] {
    const total = values.reduce((sum, v) => sum + (Number.isFinite(v) && v > 0 ? v : 0), 0);
    return values.flatMap((v, k) =>
        Number.isFinite(v) && v > 0 && colors[k] !== undefined
            ? [{ color: colors[k].toLowerCase(), size: v / total }]
            : [],
    );
}

/**
 * Sets a node's `pie*` properties from a pie or ring chart.
 * @param ring - whether it is a ring
 * @param options - the chart's options
 * @param values - the node's values
 * @param colors - the chart's colors
 * @param node - the node
 * @param sizeSync - whether charts are fitted to their node
 */
function pieOnNode(
    ring: boolean,
    options: ChartOptions,
    values: readonly number[],
    colors: readonly string[],
    node: ChartNode,
    sizeSync: boolean,
): void {
    const slices = pieSlices(values, colors);
    if (slices.length === 0) {
        return;
    }
    const start = Number(options.cy_startAngle ?? 0);
    const from = Number.isFinite(start) ? start : 0;
    // counter-clockwise from `start` past 3 o'clock is clockwise from 12 o'clock at 90 - start, slices reversed
    const reversed = [...slices].reverse();
    node.put("pieColors", reversed.map((s) => s.color).join(" "));
    node.put("pieSizes", reversed.map((s) => String(num6(s.size))).join(" "));
    // fitted to the node, or with `nodeCustomGraphicsSizeSync` off at the slot's own size
    const own = Number(node.graphic("NODE_CUSTOMGRAPHICS_SIZE"));
    const side = shorterSide(node);
    const ownSize = own > 0;
    const fitted = sizeSync || !ownSize || side === null || side <= 0;
    node.put("pieRadius", fitted ? CHART_ACROSS : num6((CHART_ACROSS * own) / side));
    pieOffset(node, fitted, own);
    node.put("pieRotation", num6((((90 - from) % 360) + 360) % 360));
    const texts = pieItemLabels(options, values, colors, node.value, {
        start: from,
        radius: (CHART_ACROSS * (fitted || side === null ? 1 : own / side) * (side ?? 0)) / 2,
        dx: Number(node.get("pieOffsetX") ?? 0),
        dy: Number(node.get("pieOffsetY") ?? 0),
        w: node.w,
        h: node.h,
    });
    if (texts !== null && (node.get("shapeTexts") ?? null) === null) {
        node.put("shapeTexts", texts);
    }
    if (ring) {
        const hole = Number(options.cy_holeSize ?? RING_HOLE);
        node.put("pieHole", Number.isFinite(hole) ? Math.max(0, Math.min(1, hole)) : RING_HOLE);
    }
}

/**
 * A pie's offset from its node's center, as Cytoscape 3.10.5 draws a chart's position (measured from its SVG export
 * of the specimen sheets, every anchor pair they hold, fitted and at a size of its own): the node anchor scales by
 * the drawn disc and the chart anchor by the node, so on a 60 node NW,NW moves a fitted 54 disc 3 px down and right
 * and a 21.6 disc 19 px, C,NW puts either one's center 30 px down and right, and E,W puts a fitted disc 57 px right;
 * then the position's offsets (y down).
 * @param node - the node
 * @param fitted - whether the pie is fitted to the node
 * @param own - the slot's own size
 */
function pieOffset(node: ChartNode, fitted: boolean, own: number): void {
    const at = positionOf(node.graphic("NODE_CUSTOMGRAPHICS_POSITION"));
    const { w, h } = node;
    if (at === null || w === null || h === null) {
        return;
    }
    const disc = CHART_ACROSS * (fitted ? Math.min(w, h) : own);
    const dx = (at.node[0] * disc) / 2 - (at.chart[0] * w) / 2 + at.x;
    const dy = (at.node[1] * disc) / 2 - (at.chart[1] * h) / 2 + at.y;
    if (dx !== 0 || dy !== 0) {
        node.put("pieOffsetX", num6(dx));
        node.put("pieOffsetY", num6(dy));
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

/** The color Cytoscape gives a bar its chart has no color for (`AbstractChartLayer.DEFAULT_ITEM_BG_COLOR`). */
const ITEM_BG_COLOR = "#c0c0c0";

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
    if (labels === null || w === null || h === null) {
        return null;
    }
    // a size that is not a number, like one of 0, draws nothing
    const drawn = w > 0 && h > 0 && at.radius > 0;
    if (!drawn) {
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
    if (v >= 0) {
        return mix(zero, up, range[1] > 0 ? v / range[1] : 0);
    }
    return mix(zero, down, range[0] < 0 ? v / range[0] : 0);
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
    // never empty: the middle values lie between the quartiles
    return [inside[0], q1, median(v), q3, inside.at(-1) ?? q3];
}

/**
 * How large a chart's plot is drawn: inside the disc a pie fills, as a share of the node.
 * @param kind - the chart's class
 * @param box - the pie's width and the node's shorter side, or null when the node's size is unknown
 * @returns `chartSize`, or nothing when the node's size is unknown
 */
function plotSize(
    kind: Exclude<ChartKind, "PieChart" | "RingChart">,
    box: { disc: number; side: number } | null,
): Record<string, StyleValue> {
    const sized = box !== null && box.side > 0;
    if (!sized) {
        return {};
    }
    // ponytail: the insets are measured on 60 nodes only; whether they scale with the node is not known
    const inset = CHART_INSET + (kind === "HeatMapChart" ? HEAT_MAP_INSET : PLOT_INSET);
    return { chartSize: num6(Math.max(0, box.disc - inset) / box.side) };
}

/**
 * The outline Cytoscape draws round each bar and box.
 * @param options - the chart's options
 * @returns `chartBorderColor` and `chartBorderWidth`
 */
function chartOutline(options: ChartOptions): Record<string, StyleValue> {
    const color = typeof options.cy_borderColor === "string" ? options.cy_borderColor : BAR_OUTLINE.color;
    return {
        chartBorderColor: color.toLowerCase(),
        chartBorderWidth: num6(CHART_UNIT * (Number(options.cy_borderWidth ?? BAR_OUTLINE.width) || 0)),
    };
}

/**
 * A bar chart's own properties: grouped, stacked, up and down (the first color up, the third or second down) or heat strips
 * (each bar colored on the three-color scale).
 * @param options - its options
 * @param finite - the node's values that are numbers
 * @param colors - its colors
 * @param range - its range
 * @param horizontal - whether its orientation is horizontal
 * @returns the properties
 */
function barChart(
    options: ChartOptions,
    finite: readonly number[],
    colors: readonly string[],
    range: readonly [number, number],
    horizontal: boolean,
): Record<string, StyleValue> {
    const type = typeof options.cy_type === "string" ? options.cy_type : "GROUPED";
    const stacked = type === "STACKED";
    return {
        chartKind: stacked ? "stacked-bar" : "bar",
        chartValues: finite.join(" "),
        chartColors: finite.map((v, k) => barColor(type, colors, v, k, range)).join(" "),
        chartMin: range[0],
        chartMax: range[1],
        // Cytoscape lays a stacked bar's values across the node when its orientation says up
        chartHorizontal: stacked ? !horizontal : horizontal,
        chartMargin: BAR_MARGIN,
        chartGap: num6(Math.max(0, Math.min(1, Number(options.cy_separation ?? 0) || 0))),
    };
}

/**
 * One bar's color.
 * @param type - the bar chart's type
 * @param colors - its colors
 * @param v - the bar's value
 * @param k - the bar's place
 * @param range - the chart's range
 * @returns the color
 */
function barColor(
    type: string,
    colors: readonly string[],
    v: number,
    k: number,
    range: readonly [number, number],
): string {
    if (type === "HEAT_STRIPS" || type === "UP_DOWN") {
        // `BarLayer`: colors[1] is zero only among three or more colors, else black; down is colors[2], else
        // colors[1], else gray; up is colors[0], else light gray
        const many = colors.length > 2;
        const scale = [colors[0] ?? ITEM_BG_COLOR, many ? colors[1] : "#000000", colors[many ? 2 : 1] ?? "#808080"];
        if (type === "HEAT_STRIPS") {
            return scaleColor(scale, v, range);
        }
        return scale[v < 0 ? 2 : 0].toLowerCase();
    }
    // a bar past the chart's colors is JFreeChart's light gray (`BarLayer`, DEFAULT_ITEM_BG_COLOR)
    return (colors[k] ?? ITEM_BG_COLOR).toLowerCase();
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
        // no colors (a RANDOM or CUSTOM scheme, or a palette from a provider): not drawn
        return {};
    }
    const given = Array.isArray(options.cy_range) ? options.cy_range.map(Number) : [];
    const global = options.cy_globalRange !== false && given.length === 2 && given.every((v) => Number.isFinite(v));
    // an automatic range holds zero and the values, with headroom above
    const auto: [number, number] = [Math.min(0, ...finite), Math.max(0, ...finite)];
    auto[1] += RANGE_HEADROOM * (auto[1] - auto[0]);
    const range: [number, number] = global ? [given[0], given[1]] : auto;
    const horizontal = options.cy_orientation === "HORIZONTAL";
    const out: Record<string, StyleValue> = plotSize(kind, box);
    const outline = chartOutline(options);
    switch (kind) {
        case "BarChart":
            Object.assign(out, outline, barChart(options, finite, colors, range, horizontal));
            break;
        case "LineChart":
            // drawn up the node whatever its orientation, with headroom above its range
            Object.assign(out, {
                chartKind: "line",
                chartValues: finite.join(" "),
                chartColors: colors[0].toLowerCase(),
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
                chartColors: `${colors[0].toLowerCase()} #000000`,
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

/**
 * JFreeChart's room round a chart's axis labels, in the file's lengths (its chart units are half of one): 4 beyond a
 * label's own size for the tick, the axis' offset from the plot and the label's insets, the label's near edge 3.5 from
 * the plot (measured from Cytoscape 3.10.5's SVG export of xgmml-specimen-images-charts-p7 at label sizes 1, 10 and
 * 20), and 2 above and below a tick label when JFreeChart picks how far apart the ticks are.
 */
const AXIS_ROOM = 4;
const AXIS_LABEL_GAP = 3.5;
const TICK_LABEL_INSETS = 2;

/** The size of a chart's axis labels when its options name none (Cytoscape's `cy_axisLabelFontSize` default). */
const AXIS_LABEL_FONT_SIZE = 1;

/**
 * How JFreeChart turns a category's name for each `cy_domainLabelPosition`: the turn (degrees clockwise on screen)
 * and the point of the name's box it pins to the category's middle under the plot, from the box's middle as
 * fractions of its width and height (`CategoryLabelPositions`: STANDARD the top's middle, UP_45 the top right corner,
 * UP_90 the right end's middle, DOWN_45 the top left, DOWN_90 the left end's middle).
 */
const DOMAIN_LABEL_POSITIONS: Readonly<Record<string, { turn: number; pin: readonly [number, number] }>> = {
    STANDARD: { turn: 0, pin: [0, -0.5] },
    UP_45: { turn: -45, pin: [0.5, -0.5] },
    UP_90: { turn: -90, pin: [0.5, 0] },
    DOWN_45: { turn: 45, pin: [-0.5, -0.5] },
    DOWN_90: { turn: 90, pin: [-0.5, 0] },
};

/** The steps JFreeChart's standard tick units take in each power of ten (`NumberAxis.createStandardTickUnits`). */
const TICK_STEPS = [1, 2.5, 5];

/**
 * The tick unit JFreeChart picks for a vertical number axis (`NumberAxis.selectVerticalAutoTickUnit`): from a unit of
 * 1, the smallest standard unit at least as far apart as a tick label is tall, the next one up when that is still too
 * close.
 * @param span - the axis' range
 * @param length - the plot's height
 * @param label - a tick label's height with its insets
 * @returns the unit, or NaN when the axis has no length
 */
function tickUnit(span: number, length: number, label: number): number {
    const per = length / span;
    if (!(per > 0) || !Number.isFinite(per)) {
        return Number.NaN;
    }
    const units = (from: number): number[] => {
        const decade = 10 ** Math.floor(Math.log10(from));
        return [decade / 10, decade, decade * 10].flatMap((d) => TICK_STEPS.map((k) => k * d));
    };
    const guess = label / per;
    const all = units(guess);
    const at = all.findIndex((u) => u >= guess * (1 - 1e-9));
    return label > all[at] * per ? all[at + 1] : all[at];
}

/**
 * A number as a tick unit's format writes it: as many decimals as the unit has, thousands grouped (`#,##0.0`).
 * @param v - the number
 * @param unit - the tick unit
 * @returns the text
 */
function tickText(v: number, unit: number): string {
    // ponytail: the decimals of a unit like 2.5 follow its own digits; only units 5 and 25 are measured
    const decimals = Math.max(0, Math.min(6, -Math.floor(Math.log10(unit - Math.trunc(unit) || 1) + 1e-9) + 1));
    const digits = Number.isInteger(unit) ? 0 : decimals;
    return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** A chart's further text: `[x, y, text, look]` in the node's frame (shares of its half sides, y up). */
type ChartText = [number, number, string, { size: number; color: string; rotation?: number }];

/**
 * The axes Cytoscape draws on a bar or line chart standing up (`cy_showRangeAxis`, `cy_showDomainAxis`), as JFreeChart
 * lays them out: the plot shrunk by the room the range axis' widest end value and the domain axis' tallest name take,
 * the range axis' tick numbers right-aligned left of the plot, each one's middle on its tick, and each category's name
 * under it, turned as `cy_domainLabelPosition` says, all `cy_axisLabelFontSize` tall in the measures of Java's Dialog
 * (DejaVu Sans). The axis lines and tick marks are a quarter of a chart unit wide, under a pixel, and not drawn.
 * @param options - the chart's options
 * @param plotted - its properties so far
 * @param disc - how far across a pie would be drawn on the node
 * @param node - the node
 * @param nameOf - a category's name by its value's place
 * @returns the plot's box and the texts, or null for a chart without axes
 */
function chartAxes(
    options: ChartOptions,
    plotted: Record<string, StyleValue>,
    disc: number,
    node: ChartNode,
    nameOf: (k: number) => string | undefined,
): { plot: Record<string, StyleValue>; texts: ChartText[] } | null {
    const [range, domain] = [options.cy_showRangeAxis === true, options.cy_showDomainAxis === true];
    const { w, h } = node;
    const upright = (plotted.chartKind === "bar" || plotted.chartKind === "line") && plotted.chartHorizontal !== true;
    if (!(range || domain) || !upright || w === null || h === null || !(w > 0 && h > 0)) {
        return null;
    }
    const [lo, hi] = [Number(plotted.chartMin), Number(plotted.chartMax)];
    const values = String(plotted.chartValues).split(" ");
    const size = Number(options.cy_axisLabelFontSize ?? AXIS_LABEL_FONT_SIZE);
    const f = Number.isFinite(size) && size > 0 ? size : AXIS_LABEL_FONT_SIZE;
    const line = f * DIALOG_LINE_HEIGHT;
    const half = Math.max(0, disc - CHART_INSET - PLOT_INSET) / 2;
    const plot = { x0: -half, y0: -half, x1: half, y1: half };
    const look = { size: num6(f / h), color: CHART_LABEL_COLOR };
    const put = (x: number, y: number, text: string, turn = 0): ChartText => [
        num6(x / (w / 2)),
        num6(-y / (h / 2)),
        text,
        turn === 0 ? look : { ...look, rotation: turn },
    ];
    const width = (text: string): number => f * dialogWidth(text);
    // the domain axis first: the range axis' ticks depend on the plot's height
    const position = DOMAIN_LABEL_POSITIONS[String(options.cy_domainLabelPosition)] ?? DOMAIN_LABEL_POSITIONS.STANDARD;
    const names = values.map((_, k) => nameOf(k) ?? "");
    if (domain) {
        const r = (position.turn * Math.PI) / 180;
        const tall = (text: string): number =>
            text === "" ? 0 : Math.abs(Math.sin(r)) * width(text) + Math.abs(Math.cos(r)) * line;
        plot.y1 -= Math.max(0, ...names.map(tall)) + AXIS_ROOM;
    }
    // ponytail: the range's ends as JFreeChart's default number format writes them (up to 3 decimals, grouped)
    const endText = (v: number): string => v.toLocaleString("en-US", { maximumFractionDigits: 3 });
    if (range) {
        plot.x0 += Math.max(width(endText(lo)), width(endText(hi))) + AXIS_ROOM;
    }
    const [pw, ph] = [plot.x1 - plot.x0, plot.y1 - plot.y0];
    const texts: ChartText[] = [];
    if (range && pw > 0 && ph > 0 && hi > lo) {
        const unit = tickUnit(hi - lo, ph, line + 2 * TICK_LABEL_INSETS);
        for (let k = Math.ceil(lo / unit - 1e-9); Number.isFinite(unit) && k * unit <= hi + 1e-9 * unit; k++) {
            // never "-0"
            const tick = k * unit || 0;
            const text = tickText(tick, unit);
            const y = plot.y1 - ((tick - lo) / (hi - lo)) * ph;
            texts.push(put(plot.x0 - AXIS_LABEL_GAP - width(text) / 2, y, text));
        }
    }
    if (domain && pw > 0) {
        const margin = Number(plotted.chartMargin ?? 0);
        const gap = Number(plotted.chartGap ?? 0);
        const n = values.length;
        const band = Math.max(0, 1 - 2 * margin - gap) / n;
        const step = band + (n > 1 ? gap / (n - 1) : 0);
        const r = (position.turn * Math.PI) / 180;
        names.forEach((text, k) => {
            if (text === "") {
                return;
            }
            // from the pinned point to the box's middle, turned with the box
            const [dx, dy] = [-position.pin[0] * width(text), -position.pin[1] * line];
            const x = plot.x0 + (margin + k * step + band / 2) * pw;
            const y = plot.y1 + AXIS_LABEL_GAP;
            texts.push(
                put(
                    x + Math.cos(r) * dx - Math.sin(r) * dy,
                    y + Math.sin(r) * dx + Math.cos(r) * dy,
                    text,
                    position.turn,
                ),
            );
        });
    }
    return {
        plot: {
            chartWidth: num6(Math.max(0, pw) / w),
            chartHeight: num6(Math.max(0, ph) / h),
            chartOffsetX: num6((plot.x0 + plot.x1) / 2),
            chartOffsetY: num6((plot.y0 + plot.y1) / 2),
        },
        texts,
    };
}
