/**
 * Pajek's Draw window and export options: what Pajek keeps in its ini file and its Draw menu, not in the network file,
 * and how each one changes the drawing. Every rule here was measured on Pajek 6.02's own SVG export of the Pajek
 * specimen pages (`graph-io/test/fidelity/specimens/pajek/pages.json`, one option per page).
 */

import { GraphFormatError, type GraphSnapshot } from "@graphty/graph-format";

import type { StyleValue } from "../../styles/types.js";

/**
 * How a Pajek network is drawn, which Pajek keeps in its ini file and its Draw menu rather than in the file: the size
 * of the Draw window, the partition and vectors Draw > Network + Partition (+ Vector) uses, and the window's options.
 * @category Built-in formats
 */
export interface PajekDrawOptions {
    /**
     * The Draw window's width in px. Pajek stretches the file's x from 0..1 across it, while vertex sizes, line
     * widths and fonts stay fixed px.
     * @defaultValue 500, the square Pajek's EPS export maps 0..1 to
     */
    readonly width?: number | undefined;
    /**
     * The Draw window's height in px; the file's y from 0..1 is stretched down it.
     * @defaultValue 500
     */
    readonly height?: number | undefined;
    /**
     * Draw > Network + Partition: which `*Partition` of a project file colors the vertices, 1 for its first. Each
     * vertex is filled with the partition color of its cluster (cluster 0 Cyan, 1 Yellow, 2 LimeGreen, 3 Red, ...).
     * Absent or 0 draws the vertices' own colors.
     */
    readonly partition?: number | undefined;
    /**
     * Draw > Network + Vector: which `*Vector` of a project file sizes the vertices, 1 for its first. A vertex is drawn
     * the square root of its value times its own size (0 draws it at no size, a negative value at its own size).
     */
    readonly vector?: number | undefined;
    /**
     * Draw > Network + First Vector + Second Vector: which `*Vector` sets the vertices' heights while `vector` sets
     * their widths, each value then a plain factor of the vertex's own width or height.
     */
    readonly vector2?: number | undefined;
    /**
     * Options of Pajek's ini file by the names its SAVEINI writes; a flag is on when given as "", true, or a value
     * other than "0" or false. Read: `Form8.MarkVerticesUsing` (1 labels, 2 vertex numbers, 3 no labels, 4 no labels
     * and no arrows), `Form8.SizeofVertices` (8), `TransparencyofVertices` and `TransparencyofLines` (the SVG
     * export's opacities, 0 to 1), `Form10.StraightLinesOnly1` (every line straight) and `Form10.ColorGradientLines`
     * (each line a gradient of its end vertices' colors), `Form8.withLabels1` (the lines' labels drawn; without it
     * none is) and `Form10.effect3d` (each vertex filled with a gradient down to half its color). Any other option is
     * ignored.
     */
    readonly ini?: Readonly<Record<string, string | number | boolean>> | undefined;
}

/** The Draw window's size in px. */
export interface DrawWindow {
    readonly width: number;
    readonly height: number;
}

/** The `pajekDraw` option, checked: every field present, each ini value as text. */
export interface PajekDraw extends DrawWindow {
    readonly partition: number;
    readonly vector: number;
    readonly vector2: number;
    readonly ini: ReadonlyMap<string, string>;
}

/** The square Pajek's EPS export maps the file's 0..1 coordinates to, and the Draw window's size by default. */
const PAJEK_WINDOW = 500;

/**
 * The `pajekDraw` import option, checked.
 * @param option - the option as given
 * @returns the draw settings, or null when none are given
 */
export function resolvePajekDraw(option: unknown): PajekDraw | null {
    if (option === undefined) {
        return null;
    }
    const bad = (found: unknown): never => {
        throw new GraphFormatError("E_UNSUPPORTED", "option pajekDraw: not an object of Pajek draw settings", {
            option: "pajekDraw",
            found,
        });
    };
    if (typeof option !== "object" || option === null || Array.isArray(option)) {
        return bad(option);
    }
    const o = option as PajekDrawOptions;
    const num = (v: unknown, fallback: number, positive: boolean): number => {
        if (v === undefined) {
            return fallback;
        }
        if (typeof v !== "number" || !Number.isFinite(v)) {
            return bad(v);
        }
        const inRange = positive ? v > 0 : v >= 0;
        return inRange ? v : bad(v);
    };
    const ini = new Map<string, string>();
    for (const [name, value] of Object.entries(o.ini ?? {})) {
        if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
            return bad(value);
        }
        ini.set(name, String(value));
    }
    return {
        width: num(o.width, PAJEK_WINDOW, true),
        height: num(o.height, PAJEK_WINDOW, true),
        partition: num(o.partition, 0, false),
        vector: num(o.vector, 0, false),
        vector2: num(o.vector2, 0, false),
        ini,
    };
}

/**
 * Whether an ini flag is on.
 * @param draw - the settings
 * @param name - the option
 * @returns true when given as "", "true" or any value but "0" and "false"
 */
function flag(draw: PajekDraw, name: string): boolean {
    const v = draw.ini.get(name);
    return v !== undefined && v !== "0" && v !== "false";
}

/**
 * Whether Pajek draws the lines' labels: only under Options / Lines / Mark Lines / with Labels (`Form8.withLabels1`);
 * its default, Mark Lines / No, draws none (`pajek-specimen-edge-labels` against `-p2`, `pajek-synth-lines`: 28 `l`
 * labels, none drawn).
 * @param draw - the settings, or null when the import names none (Pajek's defaults)
 * @returns true when the line labels are drawn
 */
export function drawsLineLabels(draw: PajekDraw | null): boolean {
    return draw !== null && flag(draw, "Form8.withLabels1");
}

/**
 * An ini number.
 * @param draw - the settings
 * @param name - the option
 * @returns the number, or null when not given or not a number
 */
function iniNumber(draw: PajekDraw, name: string): number | null {
    const v = draw.ini.get(name);
    const n = v === undefined || v.trim() === "" ? Number.NaN : Number(v);
    return Number.isFinite(n) ? n : null;
}

/**
 * Pajek's 40 partition colors, cluster k drawn in entry k modulo 40 (a negative cluster as its absolute value): the
 * fills Pajek 6.02's SVG export draws for clusters 0 to 39 (`pajek-specimen-mappings-bypass.svg`, `part-*`; the
 * manual's Figure 20 names them Cyan, Yellow, LimeGreen, Red, Blue, ...).
 */
const PARTITION_COLORS: readonly string[] = [
    "#00ffff",
    "#ffff00",
    "#7fff00",
    "#ff0000",
    "#0000ff",
    "#ffd8f2",
    "#ffffff",
    "#ff6321",
    "#8c23ff",
    "#606dc4",
    "#1ef9a3",
    "#009900",
    "#7f7f7f",
    "#000000",
    "#ad0000",
    "#ccffb2",
    "#ffff99",
    "#ff00ff",
    "#007091",
    "#ffb528",
    "#ff0a9b",
    "#00e000",
    "#ff779e",
    "#d8f2ff",
    "#d8ff4f",
    "#ff84ff",
    "#e5ffcc",
    "#ccccff",
    "#59ddff",
    "#ffd9bc",
    "#db9370",
    "#ccffff",
    "#d8d8d8",
    "#666666",
    "#a5a5a5",
    "#3f3f3f",
    "#e5e5e5",
    "#262626",
    "#bfbfbf",
    "#595959",
];

/** Pajek's vertex size (`styles.ts`) and its fill where a vertex sets none. */
const VERTEX_SIZE = 20;
const VERTEX_FILL = "#ffd9bc";

/** The Draw window's default `Form8.SizeofVertices`. */
const SIZE_OF_VERTICES = 8;

/** Per-element values by property, as the style reader builds them. */
type Values = Record<string, (StyleValue | null)[]>;

/**
 * The node column a project file's n-th object of a kind went to (`meta.extra.pajek.objects`).
 * @param snapshot - the graph
 * @param kind - "partition" or "vector"
 * @param n - 1 for the first
 * @returns the column's values, or null
 */
function objectValues(snapshot: GraphSnapshot, kind: string, n: number): ((i: number) => number | null) | null {
    if (n < 1) {
        return null;
    }
    const pajek = snapshot.meta.extra.pajek as { objects?: { kind: string; column: string }[] } | undefined;
    const name = pajek?.objects?.filter((o) => o.kind === kind)[n - 1]?.column;
    if (name === undefined || !snapshot.nodes.has(name)) {
        return null;
    }
    return (i) => {
        const v = snapshot.nodes.value(name, i);
        return typeof v === "number" && Number.isFinite(v) ? v : null;
    };
}

/**
 * One property's column, made when first written.
 * @param values - the values
 * @param property - the property
 * @param n - the element count
 * @returns the column
 */
function column(values: Values, property: string, n: number): (StyleValue | null)[] {
    values[property] ??= new Array<StyleValue | null>(n).fill(null);
    return values[property];
}

/**
 * Draws the vertices under the Draw window's options and Draw > Network + Partition (+ Vector), in place.
 * @param draw - the settings
 * @param snapshot - the graph
 * @param node - the vertices' values, as the file sets them
 */
export function drawVertices(draw: PajekDraw, snapshot: GraphSnapshot, node: Values): void {
    const n = snapshot.nodeCount;
    const width = column(node, "width", n);
    const height = column(node, "height", n);
    scaleVertexSizes(draw, width, height);
    sizeByVectors(draw, snapshot, width, height);
    colorByPartition(draw, snapshot, node);
    // SVG Opacity of Vertices: Pajek writes it as the vertex's opacity and its stroke-opacity both, so the fill is
    // drawn at it and the border at its square (`pajek-specimen-node-sizes-opacity-p3`: 0.5 fills at 0.5, strokes at
    // 0.25); the label is drawn opaque
    const opacity = iniNumber(draw, "TransparencyofVertices");
    if (opacity !== null && opacity < 1) {
        const o = Math.max(0, opacity);
        const fill = column(node, "fillOpacity", n);
        fill.forEach((v, i) => {
            fill[i] = (typeof v === "number" ? v : 1) * o;
        });
        column(node, "borderOpacity", n).fill(o * o);
    }
    if (flag(draw, "Form10.effect3d")) {
        effect3d(snapshot, node);
    }
    markVertices(draw, node, n);
    for (const property of ["width", "height"]) {
        if (node[property].every((v) => v === null)) {
            Reflect.deleteProperty(node, property);
        }
    }
}

/**
 * Options / Size / of Vertices s scales each axis by f = s / 8: an axis the file sizes (x_fact, y_fact) by f, and
 * an axis it does not by f squared, each on its own (`pajek-specimen-node-sizes-opacity-p2` at 16; probed at 4, 16
 * and 24: `x_fact 1.8 y_fact 1.8` 18, 72, 108 across; no parameters 5, 80, 180; `x_fact 2` alone 20 x 5, 80 x 80,
 * 120 x 180).
 * @param draw - the settings
 * @param width - the vertices' widths, changed in place
 * @param height - the vertices' heights, changed in place
 */
function scaleVertexSizes(draw: PajekDraw, width: (StyleValue | null)[], height: (StyleValue | null)[]): void {
    const size = iniNumber(draw, "Form8.SizeofVertices");
    if (size === null || size === SIZE_OF_VERTICES) {
        return;
    }
    const f = size / SIZE_OF_VERTICES;
    const scaled = (v: StyleValue | null): number => (typeof v === "number" ? v * f : VERTEX_SIZE * f * f);
    for (let i = 0; i < width.length; i++) {
        width[i] = scaled(width[i]);
        height[i] = scaled(height[i]);
    }
}

/**
 * Draw > Network + Partition: fills each vertex in its class's color.
 * @param draw - the settings
 * @param snapshot - the graph
 * @param node - the vertices' values, changed in place
 */
function colorByPartition(draw: PajekDraw, snapshot: GraphSnapshot, node: Values): void {
    const partition = objectValues(snapshot, "partition", draw.partition);
    if (partition === null) {
        return;
    }
    const fill = column(node, "fill", snapshot.nodeCount);
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const k = partition(i);
        if (k !== null) {
            fill[i] = PARTITION_COLORS[Math.abs(k) % PARTITION_COLORS.length];
        }
    }
}

/**
 * Options / Mark Vertices Using: 2 labels each vertex with its number, 3 and 4 with nothing.
 * @param draw - the settings
 * @param node - the vertices' values, changed in place
 * @param n - the vertex count
 */
function markVertices(draw: PajekDraw, node: Values, n: number): void {
    const mark = iniNumber(draw, "Form8.MarkVerticesUsing");
    if (mark === 2) {
        // ponytail: a vertex's number is its place in the file, as in every file Pajek writes
        column(node, "label", n).forEach((_, i, a) => {
            a[i] = String(i + 1);
        });
    } else if (mark === 3 || mark === 4) {
        column(node, "label", n).fill("");
    }
}

/**
 * SVG Vertices 3D Effect (`Form10.effect3d`): Pajek 6.02's SVG export fills each vertex with a linear gradient from
 * its color at the top to half of it at the bottom (`pajek-specimen-node-shapes-p2`: `#ffd9bc` to rgb(128,108,94),
 * `#c8c8c8` to rgb(100,100,100); each channel halved and rounded half to even, as Delphi's Round does). The gradient
 * turns with the vertex: `phi 90` runs it from left to right (`phi-90-box`, `phi-90-triangle`).
 * @param snapshot - the graph
 * @param node - the vertices' values, changed in place
 */
function effect3d(snapshot: GraphSnapshot, node: Values): void {
    const n = snapshot.nodeCount;
    const fill = column(node, "fill", n);
    const end = column(node, "fillGradient", n);
    const angle = column(node, "fillGradientAngle", n);
    const half = (v: number): number => {
        const h = v / 2;
        const f = Math.floor(h);
        return h - f === 0.5 && f % 2 === 0 ? f : Math.round(h);
    };
    for (let i = 0; i < n; i++) {
        const color = typeof fill[i] === "string" ? String(fill[i]) : VERTEX_FILL;
        end[i] = `#${[1, 3, 5]
            .map((k) =>
                half(Number.parseInt(color.slice(k, k + 2), 16))
                    .toString(16)
                    .padStart(2, "0"),
            )
            .join("")}`;
        const phi = snapshot.nodes.has("phi") ? Number(snapshot.nodes.value("phi", i)) : 0;
        angle[i] = Number.isFinite(phi) ? (((90 - phi) % 360) + 360) % 360 : 90;
    }
}

/**
 * Sizes the vertices by Draw > Network + Vector (+ Second Vector), in place: with one vector each vertex is the square
 * root of its value times its own size, with two the first is a plain factor of its width and the second of its
 * height; 0 draws it at no size and a negative value at its own (`pajek-specimen-mappings-bypass`, `-p3`).
 * @param draw - the settings
 * @param snapshot - the graph
 * @param width - the widths
 * @param height - the heights
 */
function sizeByVectors(
    draw: PajekDraw,
    snapshot: GraphSnapshot,
    width: (StyleValue | null)[],
    height: (StyleValue | null)[],
): void {
    const first = objectValues(snapshot, "vector", draw.vector);
    if (first === null) {
        return;
    }
    const second = objectValues(snapshot, "vector", draw.vector2);
    const scale = (sizes: (StyleValue | null)[], i: number, v: number | null): void => {
        if (v !== null && v >= 0) {
            sizes[i] = (typeof sizes[i] === "number" ? sizes[i] : VERTEX_SIZE) * v;
        }
    };
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const v = first(i);
        if (second === null) {
            const root = v === null || v < 0 ? null : Math.sqrt(v);
            scale(width, i, root);
            scale(height, i, root);
        } else {
            scale(width, i, v);
            scale(height, i, second(i));
        }
    }
}

/**
 * Draws the lines under the Draw window's options, in place.
 * @param draw - the settings
 * @param snapshot - the graph
 * @param node - the vertices' values, already drawn (`drawVertices`)
 * @param edge - the lines' values
 */
export function drawLines(draw: PajekDraw, snapshot: GraphSnapshot, node: Values, edge: Values): void {
    const m = snapshot.edgeCount;
    // Mark Vertices Using / No Labels no Arrows hides the arrowheads in the Draw window only: the SVG export still
    // draws every one (`pajek-specimen-arrows-p2`), so the arrows are left as the file sets them
    const opacity = iniNumber(draw, "TransparencyofLines");
    if (opacity !== null && opacity < 1) {
        const o = column(edge, "opacity", m);
        o.forEach((v, e) => {
            o[e] = (typeof v === "number" ? v : 1) * Math.max(0, opacity);
        });
    }
    if (flag(draw, "Form10.StraightLinesOnly1")) {
        // Straight Lines draws the two curves of a mutual pair or of parallel lines straight, while a line's own
        // Bezier route (`a1 k1 a2 k2`, which set its bends) stays curved in the SVG export
        // (`pajek-specimen-edges-lines-p4` against `-p2`: only `bidirected` and `parallel-edges` change)
        const curved = column(edge, "curved", m);
        for (let e = 0; e < m; e++) {
            const bends = edge.bends?.[e];
            if (bends === null || bends === undefined) {
                curved[e] = false;
            }
        }
    }
    if (flag(draw, "Form10.ColorGradientLines")) {
        // each line runs from its source vertex's fill to its target's, and an arrowhead is its own end vertex's fill
        // (`pajek-specimen-edges-lines-p5`)
        const fill = node.fill as (StyleValue | null)[] | undefined;
        const fillOf = (i: number): string => (typeof fill?.[i] === "string" ? fill[i] : VERTEX_FILL);
        const colors = column(edge, "gradientColors", m);
        const kind = column(edge, "gradientKind", m);
        const sourceArrow = column(edge, "sourceArrowColor", m);
        const targetArrow = column(edge, "targetArrowColor", m);
        for (let e = 0; e < m; e++) {
            const [s, t] = [fillOf(snapshot.edgeSource(e)), fillOf(snapshot.edgeTarget(e))];
            colors[e] = `${s} ${t}`;
            kind[e] = "linear";
            sourceArrow[e] = s;
            targetArrow[e] = t;
        }
    }
}
