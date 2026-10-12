/**
 * JSON styles: each dialect read the way the program that draws it draws it, and a graph's styles written back into
 * each dialect's own style keys.
 *
 * - Cytoscape.js: the stylesheet (an array or a CSS-like text) over the raw element JSON, through graph-io's
 *   Cytoscape.js engine, with Cytoscape.js's defaults beneath it; an element's own `style` is a bypass. Cytoscape
 *   desktop's export without a stylesheet gets Cytoscape desktop's default style instead.
 * - graphology: the keys sigma.js draws (`color`, `size`, `label`, `hidden`), with sigma's defaults. Gephi's JSON
 *   export for sigma.js is read the same way.
 * - vis.js: the keys vis-network draws, `options.nodes` and `options.edges` as declared defaults and
 *   `options.groups` as group rules, with vis-network's defaults, its palette for groups the file does not define,
 *   and an edge without a color of its own in its source node's border color.
 * - NetworkX node-link: no style keys, NetworkX's drawing defaults.
 *
 * Writing: Cytoscape.js gets a stylesheet with the element data its selectors read and a bypass where no rule gives
 * the value; graphology and vis.js get their per-element keys; node-link, d3 and JGF only the `graphty.styles` block
 * and the tagged per-element values. The block is a graph attribute where the dialect has graph attributes
 * (node-link, JGF, graphology) and a top-level key elsewhere (d3, vis.js, Cytoscape.js).
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { canonColor } from "../../styles/canon/color.js";
import { canonEnum } from "../../styles/canon/enums.js";
import { canonBoolean, canonNumber, canonOpacity } from "../../styles/canon/number.js";
import type { CanonSite } from "../../styles/canon/site.js";
import { canonText } from "../../styles/canon/text.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import { cytoscapeJsStyles } from "../../styles/cyjs/cascade.js";
import {
    cyjsHoldsExactly,
    CYTOSCAPE_IMPORT_KEY,
    type CytoscapeStylesheetRule,
    toCytoscapeStylesheet,
} from "../../styles/cyjs/emit.js";
import { CYJS_EDGE_PROPERTIES, CYJS_NODE_PROPERTIES } from "../../styles/cyjs/mappers.js";
import { toolDefaults } from "../../styles/defaults.js";
import { blockStyles, parseStyleBlock, STYLE_BLOCK_NAME } from "../../styles/io/block.js";
import type { ExporterStyleInput } from "../../styles/io/writer.js";
import { StyleNotes } from "../../styles/notes.js";
import { styleFingerprint } from "../../styles/plan/features.js";
import { plainCell, resolveStyles } from "../../styles/plan/resolve.js";
import type {
    ColumnRef,
    EdgeStyleProperty,
    ImporterStyles,
    NodeStyleProperty,
    Predicate,
    StyleColumn,
    StyleNote,
    StyleReadContext,
    StyleRule,
    StyleTarget,
    StyleValue,
    StyleWriteCapabilities,
} from "../../styles/types.js";
import type { LossNote } from "../../types.js";
import { isJsonObject, type JsonDialect, type JsonImportDialect } from "./dialect.js";

/**
 * What a JSON import keeps for its styles (`report.keepForStyles()`): the dialect, a `graphty.styles` block the
 * document holds as a top-level key, and what each dialect's reader needs beyond the graph.
 */
export interface JsonStyleSource {
    /** The dialect the document was read as. */
    readonly dialect: JsonImportDialect;
    /** A `graphty.styles` block held as a top-level key, or null. */
    readonly block: string | null;
    /** Cytoscape.js: the elements as the file holds them. */
    readonly elements?: unknown;
    /** Cytoscape.js: the stylesheet, as the file holds it. */
    readonly style?: unknown;
    /** Cytoscape.js: the `generated_by` of Cytoscape desktop's export, or null. */
    readonly generatedBy?: string | null;
    /** Cytoscape.js: the id graph-io gave each node element without a `data.id`. */
    readonly generatedIds?: ReadonlyMap<object, string>;
    /** vis.js: the document's `options`. */
    readonly options?: unknown;
    /** vis.js: a top-level `groups` object. */
    readonly groups?: unknown;
    /** graphology: whether the document is Gephi's JSON export (`id` instead of `key`). */
    readonly gephi?: boolean;
    /** node-link: whether the document has NetworkX's `directed`, `multigraph` and `graph` keys. */
    readonly networkx?: boolean;
}

/** The writable values of one row. */
type Row = Record<string, StyleValue | null>;
/** Per-property values of one target, by element index. */
type Values = Record<string, (StyleValue | null)[]>;

const TARGETS: readonly StyleTarget[] = ["node", "edge"];

// ============================================================ reading

/**
 * The styles of a JSON document, read by its dialect's reader from what the import kept.
 * @param snapshot - the graph the import built
 * @param context - the work budget and what the import kept
 * @returns the styles, or null when the dialect has none (a block held as a graph attribute is read by graph-io)
 */
export function jsonStyles(snapshot: GraphSnapshot, context: StyleReadContext): ImporterStyles | null {
    const src = context.kept as JsonStyleSource | undefined;
    if (!isJsonObject(src)) {
        return null;
    }
    switch (src.dialect) {
        case "cytoscape":
            return cytoscapeStyles(snapshot, src, context);
        case "graphology":
            return graphologyStyles(snapshot, src, context);
        case "vis":
            return visStyles(snapshot, src, context);
        case "node-link":
            if (src.networkx === true) {
                return networkxStyles(snapshot);
            }
            return src.block === null ? null : { canonical: true, block: src.block };
        default:
            return src.block === null ? null : { canonical: true, block: src.block };
    }
}

/**
 * Cytoscape.js: the stylesheet over the raw elements. A file graphty wrote is read without Cytoscape.js's own default
 * rules (its block holds graphty's defaults); Cytoscape desktop's export without a stylesheet gets Cytoscape desktop's
 * default style.
 * @param snapshot - the graph
 * @param src - what the import kept
 * @param context - the work budget
 * @returns the styles
 */
function cytoscapeStyles(snapshot: GraphSnapshot, src: JsonStyleSource, context: StyleReadContext): ImporterStyles {
    const sheetless =
        (src.style === undefined || src.style === null) && src.generatedBy?.startsWith("cytoscape-") === true;
    // a file graphty wrote: its stylesheet states graphty's styles, beneath which graphty draws its own defaults
    const graphty = src.block !== null && parseStyleBlock(src.block, styleFingerprint(snapshot)).ok;
    const read = cytoscapeJsStyles({
        elements: withGeneratedIds(src.elements, src.generatedIds),
        style: sheetless ? [] : (src.style ?? []),
        snapshot,
        toolDefaults: !graphty && !sheetless,
        budget: context.budget,
        signal: context.signal,
    });
    if (!("canonical" in read)) {
        return read;
    }
    let tool: string | null = "cytoscape-js";
    if (graphty) {
        tool = null;
        exactFromBlock(
            snapshot,
            src.block,
            { node: (read.node?.values ?? {}) as Values, edge: (read.edge?.values ?? {}) as Values },
            CYJS_WRITTEN,
            cyjsHoldsExactly,
        );
    } else if (sheetless) {
        tool = "cytoscape";
    }
    return { ...read, tool, block: src.block };
}

/**
 * Cytoscape.js trims every text it draws: a label with blanks around it reads back trimmed.
 * @param property - the text property
 * @returns what a written value reads back as
 */
const trimmed =
    (property: string) =>
    (want: (p: string) => StyleValue | null): StyleValue | null => {
        const v = want(property);
        return typeof v === "string" ? v.trim() : null;
    };

/** The text properties Cytoscape.js trims. */
const CYJS_TEXT: Readonly<Record<StyleTarget, readonly string[]>> = {
    node: ["label"],
    edge: ["label", "sourceLabel", "targetLabel"],
};

const CYJS_WRITTEN: Written = {
    node: Object.fromEntries(CYJS_TEXT.node.map((p) => [p, trimmed(p)])),
    edge: Object.fromEntries(CYJS_TEXT.edge.map((p) => [p, trimmed(p)])),
};

/**
 * The elements with the ids graph-io gave the nodes that have none, so the engine matches them to the graph.
 * @param elements - the elements as the file holds them
 * @param ids - the generated ids
 * @returns the elements, copied only where an id is added
 */
function withGeneratedIds(elements: unknown, ids: ReadonlyMap<object, string> | undefined): unknown {
    if (ids === undefined || ids.size === 0) {
        return elements;
    }
    const patch = (e: unknown): unknown => {
        const id = isJsonObject(e) ? ids.get(e) : undefined;
        return id === undefined || !isJsonObject(e) ? e : { ...e, data: { ...(e.data as object), id } };
    };
    if (Array.isArray(elements)) {
        return elements.map(patch);
    }
    if (isJsonObject(elements) && Array.isArray(elements.nodes)) {
        return { ...elements, nodes: elements.nodes.map(patch) };
    }
    return elements;
}

/**
 * NetworkX node-link: no style keys, NetworkX's drawing defaults, and an arrow at the target of every directed edge.
 * @param snapshot - the graph
 * @returns the styles
 */
function networkxStyles(snapshot: GraphSnapshot): ImporterStyles {
    return {
        canonical: true,
        dialect: null,
        tool: "networkx",
        units: "px",
        node: { values: {} },
        edge: directedArrows(snapshot),
    };
}

/**
 * The edge output marking directed edges with the tool's target arrow.
 * @param snapshot - the graph
 * @returns the edge output
 */
function directedArrows(snapshot: GraphSnapshot): {
    values: Values;
    rules: StyleRule[];
    columns: Map<string, StyleColumn>;
} {
    if (!snapshot.directed || snapshot.edgeCount === 0) {
        return { values: {}, rules: [], columns: new Map() };
    }
    const col = snapshot.edges.byRole("directed");
    const flags = Array.from({ length: snapshot.edgeCount }, (_v, e) =>
        col === null || plainCell(col.value(e)) !== false ? true : null,
    );
    return {
        values: {},
        rules: [
            {
                id: "edge.tool.arrow",
                target: "edge",
                role: "group",
                origin: "tool",
                where: { has: { style: "directed" } },
                set: { targetArrow: "triangle" },
            },
        ],
        columns: new Map([["directed", flags]]),
    };
}

/**
 * One element's values of a column, with a reader per value.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @param name - the column
 * @returns the cell reader, or null when the graph has no such column
 */
function cells(snapshot: GraphSnapshot, target: StyleTarget, name: string): ((i: number) => unknown) | null {
    const table = target === "node" ? snapshot.nodes : snapshot.edges;
    return table.has(name) ? (i: number) => plainCell(table.value(name, i)) : null;
}

/**
 * A values table that makes each property's column on first use.
 * @param n - the element count
 * @returns the values and a setter
 */
function valuesOf(n: number): { values: Values; put: (p: string, i: number, v: StyleValue | null) => void } {
    const values: Values = {};
    return {
        values,
        put: (p, i, v) => {
            if (v !== null) {
                (values[p] ??= new Array<StyleValue | null>(n).fill(null))[i] = v;
            }
        },
    };
}

/**
 * graphology: the keys sigma.js draws, with sigma's defaults.
 * @param snapshot - the graph
 * @param src - what the import kept
 * @param context - the work budget
 * @returns the styles
 */
function graphologyStyles(snapshot: GraphSnapshot, src: JsonStyleSource, context: StyleReadContext): ImporterStyles {
    const notes = new StyleNotes();
    const out: Record<StyleTarget, Values> = { node: {}, edge: {} };
    const readFrom: Record<StyleTarget, string[]> = { node: [], edge: [] };
    for (const target of TARGETS) {
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const { values, put } = valuesOf(n);
        const [fill, opacity] = target === "node" ? ["fill", "fillOpacity"] : ["color", "opacity"];
        const color = cells(snapshot, target, "color");
        const size = cells(snapshot, target, "size");
        const label = cells(snapshot, target, "label");
        const hidden = cells(snapshot, target, "hidden");
        for (const [name, c] of [
            ["color", color],
            ["size", size],
            ["label", label],
            ["hidden", hidden],
        ] as const) {
            if (c !== null) {
                readFrom[target].push(name);
            }
        }
        for (let i = 0; i < n; i++) {
            const site = (property: string): CanonSite => ({
                notes,
                target,
                property,
                element: i,
                budget: context.budget,
            });
            if (color !== null) {
                putColor(put, fill, opacity, i, color(i), site(fill));
            }
            if (size !== null) {
                const v = canonNumber(size(i), site("width"));
                put("width", i, v);
                if (target === "node") {
                    put("height", i, v);
                }
            }
            if (label !== null) {
                put("label", i, canonText(label(i), site("label")));
            }
            if (hidden !== null && canonBoolean(hidden(i), site("visible")) === true) {
                put("visible", i, false);
            }
        }
        out[target] = values;
    }
    exactFromBlock(snapshot, blockText(snapshot, src), out, GRAPHOLOGY_WRITTEN);
    return {
        canonical: true,
        dialect: "graphology",
        tool: "sigma",
        units: "relative",
        node: { values: out.node },
        edge: { values: out.edge },
        notes: notes.list(),
        readFrom,
    };
}

/**
 * A CSS color into a property and its opacity.
 * @param put - the setter
 * @param property - the color property
 * @param opacity - its opacity property, or null when it has none
 * @param i - the element
 * @param raw - the value
 * @param site - where it was read
 */
function putColor(
    put: (p: string, i: number, v: StyleValue | null) => void,
    property: string,
    opacity: string | null,
    i: number,
    raw: unknown,
    site: CanonSite,
): void {
    if (raw === null || raw === undefined || raw === "") {
        return;
    }
    const c = canonColor(raw, "css", site);
    if (c === null) {
        return;
    }
    put(property, i, c.color);
    if (c.alpha < 1) {
        if (opacity === null) {
            site.notes.add(STYLE_ISSUE.ALPHA_DROPPED, site.target, property, { sample: raw, element: i });
        } else {
            put(opacity, i, c.alpha);
        }
    }
}

/**
 * The text of the block a document holds, as a top-level key or as a graph attribute, or null.
 * @param snapshot - the graph
 * @param src - what the import kept
 * @returns the block's text
 */
function blockText(snapshot: GraphSnapshot, src: JsonStyleSource): string | null {
    if (src.block !== null) {
        return src.block;
    }
    if (!snapshot.graph.has(STYLE_BLOCK_NAME)) {
        return null;
    }
    const v = plainCell(snapshot.graph.value(STYLE_BLOCK_NAME, 0));
    return typeof v === "string" ? v : null;
}

/** What a writer writes for a value that its dialect holds only approximately, per target and property. */
type Written = Partial<
    Record<StyleTarget, Record<string, (want: (p: string) => StyleValue | null) => StyleValue | null>>
>;

/**
 * For a file graphty wrote: where a native value is what the writer writes for the block's value (a width and a
 * height written as one size, a shape written as the nearest one the dialect has), the block's exact value is the
 * truth, so a re-import gives the same rules. A value another program changed stays the truth.
 * @param snapshot - the graph
 * @param text - the block's text, or null
 * @param values - the native values per target, changed in place
 * @param written - what the writer writes for each approximated property
 * @param holdsExactly - whether the dialect holds a value as it is; where it does not, the native value tells
 *     nothing about the block's (the writer never wrote it), so the block's value is the truth
 */
function exactFromBlock(
    snapshot: GraphSnapshot,
    text: string | null,
    values: Record<StyleTarget, Values>,
    written: Written,
    holdsExactly?: (target: StyleTarget, property: string, value: StyleValue) => boolean,
): void {
    if (text === null) {
        return;
    }
    const parsed = parseStyleBlock(text, styleFingerprint(snapshot));
    const ex = parsed.ok ? blockStyles(parsed.block, snapshot, "json") : null;
    if (ex === null) {
        return;
    }
    for (const target of TARGETS) {
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const cache = new Map<string, readonly (StyleValue | null)[]>();
        const resolved = (p: string): readonly (StyleValue | null)[] => {
            let r = cache.get(p);
            if (r === undefined) {
                r = resolveStyles(ex, target, p as never, snapshot);
                cache.set(p, r);
            }
            return r;
        };
        if (holdsExactly !== undefined) {
            const properties = new Set(
                ex.styles.rules
                    .filter((r) => r.target === target)
                    .flatMap((r) => [...Object.keys(r.set ?? {}), ...Object.keys(r.map ?? {})]),
            );
            for (const property of properties) {
                const want = resolved(property);
                for (let i = 0; i < n; i++) {
                    const w = want[i];
                    if (w !== null && !holdsExactly(target, property, w)) {
                        (values[target][property] ??= new Array<StyleValue | null>(n).fill(null))[i] = w;
                    }
                }
            }
        }
        for (const [property, write] of Object.entries(written[target] ?? {})) {
            const want = resolved(property);
            for (let i = 0; i < n; i++) {
                const w = want[i];
                const native = values[target][property]?.[i] ?? null;
                // a native value the writer made from the block's other values (vis.js's one size for a width) is the
                // block's own value, none included
                if (native !== w && native !== null && native === write((p) => resolved(p)[i])) {
                    (values[target][property] ??= new Array<StyleValue | null>(n).fill(null))[i] = w;
                }
            }
        }
    }
}

/**
 * One size for a width and a height: the larger, as graphology and vis.js write it.
 * @param want - the block's values of the element
 * @returns the size
 */
const oneSize = (want: (p: string) => StyleValue | null): StyleValue | null => {
    const w = want("width");
    const h = want("height");
    return typeof w === "number" && typeof h === "number" ? Math.max(w, h) : (w ?? h);
};

const GRAPHOLOGY_WRITTEN: Written = { node: { width: oneSize, height: oneSize } };

// ------------------------------------------------------------ vis.js

/** vis-network's node shapes that take their size from `size` (the others are sized by their label). */
const VIS_SIZED: ReadonlySet<string> = new Set([
    "image",
    "circularImage",
    "diamond",
    "dot",
    "star",
    "triangle",
    "triangleDown",
    "hexagon",
    "square",
    "icon",
]);

/**
 * vis-network's palette for a group the file does not define, in the order groups first appear (vis-network
 * 10.1.2, `Groups._defaultGroups`): border, background.
 */
const VIS_GROUP_PALETTE: readonly (readonly [string, string])[] = [
    ["#2B7CE9", "#97C2FC"],
    ["#FFA500", "#FFFF00"],
    ["#FA0A10", "#FB7E81"],
    ["#41A906", "#7BE141"],
    ["#E129F0", "#EB7DF4"],
    ["#7C29F0", "#AD85E4"],
    ["#C37F00", "#FFA807"],
    ["#4220FB", "#6E6EFD"],
    ["#FD5A77", "#FFC0CB"],
    ["#4AD63A", "#C2FABC"],
    ["#990000", "#EE0000"],
    ["#FF6000", "#FF6000"],
    ["#97C2FC", "#2B7CE9"],
    ["#399605", "#255C03"],
    ["#B70054", "#FF007E"],
    ["#AD85E4", "#7C29F0"],
    ["#4557FA", "#000EA1"],
    ["#FFC0CB", "#FD5A77"],
    ["#C2FABC", "#74D66A"],
    ["#EE0000", "#990000"],
];

/** vis-network's edge color when an edge inherits none (vis-network 10.1.2, `color.color`). */
const VIS_EDGE_COLOR = "#848484";

/**
 * vis-network's reading of a node color given as text (vis-util `parseColor`): a hex or `rgb()` color gets a border
 * 20% darker and 25% more saturated; any other text is both.
 * @param text - the color
 * @returns the background and the border
 */
function visParseColor(text: string): { background: string; border: string } {
    let hex = text;
    const rgb = /^rgb\( *(\d{1,3}) *, *(\d{1,3}) *, *(\d{1,3}) *\)$/i.exec(text);
    if (rgb !== null && rgb.slice(1).every((c) => Number(c) <= 255)) {
        hex = `#${((1 << 24) + (Number(rgb[1]) << 16) + (Number(rgb[2]) << 8) + Number(rgb[3])).toString(16).slice(1)}`;
    }
    if (!/^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(hex)) {
        return { background: text, border: text };
    }
    const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
    const n = Number.parseInt(full.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    if (max !== min) {
        let d = b - r;
        let k = 5;
        if (r === min) {
            d = g - b;
            k = 3;
        } else if (b === min) {
            d = r - g;
            k = 1;
        }
        h = (60 * (k - d / (max - min))) / 360;
        s = (max - min) / max;
    }
    const sv = Math.min(1, s * 1.25);
    const vv = max * 0.8;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = vv * (1 - sv);
    const q = vv * (1 - f * sv);
    const t = vv * (1 - (1 - f) * sv);
    const rgbOut = [
        [vv, t, p],
        [q, vv, p],
        [p, vv, t],
        [p, q, vv],
        [t, p, vv],
        [vv, p, q],
    ][i % 6].map((c) => Math.floor(c * 255));
    const border = `#${((1 << 24) + (rgbOut[0] << 16) + (rgbOut[1] << 8) + rgbOut[2]).toString(16).slice(1)}`;
    return { background: full, border };
}

/** One layer of vis.js options for an element: the file's raw values, before canonicalization. */
interface VisLayer {
    fill?: unknown;
    border?: unknown;
    shape?: unknown;
    size?: unknown;
    borderWidth?: unknown;
    opacity?: unknown;
    hidden?: unknown;
    label?: unknown;
    title?: unknown;
    fontColor?: unknown;
    fontSize?: unknown;
    fontFace?: unknown;
    width?: unknown;
    dashes?: unknown;
    arrows?: unknown;
    edgeColor?: unknown;
    edgeOpacity?: unknown;
    inherit?: unknown;
}

/**
 * The vis.js options of one node or edge record (or of `options.nodes`, `options.edges`, a group) as a layer.
 * @param o - the options
 * @param target - nodes or edges
 * @returns the layer
 */
function visLayer(o: unknown, target: StyleTarget): VisLayer {
    if (!isJsonObject(o)) {
        return {};
    }
    const layer: VisLayer = {};
    const set = (k: keyof VisLayer, v: unknown): void => {
        if (v !== undefined && v !== null) {
            layer[k] = v;
        }
    };
    const { color, font } = o;
    if (target === "node") {
        if (typeof color === "string") {
            const parsed = visParseColor(color.trim());
            set("fill", parsed.background);
            set("border", parsed.border);
        } else if (isJsonObject(color)) {
            set("fill", color.background);
            set("border", color.border);
        }
        set("shape", o.shape);
        set("size", o.size);
        set("borderWidth", o.borderWidth);
        set("opacity", o.opacity);
    } else {
        if (typeof color === "string") {
            set("edgeColor", color);
            layer.inherit = false;
        } else if (isJsonObject(color)) {
            set("edgeColor", color.color);
            set("edgeOpacity", color.opacity);
            if (color.color !== undefined || color.highlight !== undefined || color.hover !== undefined) {
                layer.inherit = false;
            } else {
                set("inherit", color.inherit);
            }
        }
        set("width", o.width);
        set("dashes", o.dashes);
        set("arrows", o.arrows);
    }
    set("hidden", o.hidden);
    set("label", o.label);
    set("title", o.title);
    if (isJsonObject(font)) {
        set("fontColor", font.color);
        set("fontSize", font.size);
        set("fontFace", font.face);
    } else if (typeof font === "string") {
        const m = /^\s*(\d+(?:\.\d+)?)(?:px)?\s+(\S+)(?:\s+(\S+))?/.exec(font.slice(0, 256));
        if (m !== null) {
            layer.fontSize = Number(m[1]);
            layer.fontFace = m[2];
            set("fontColor", m[3]);
        }
    }
    return layer;
}

/**
 * The canonical values of one vis.js layer.
 * @param layer - the layer
 * @param target - nodes or edges
 * @param site - where its values are read
 * @param sized - nodes: whether the shape takes its size from `size`
 * @returns the values
 */
function visValues(layer: VisLayer, target: StyleTarget, site: (property: string) => CanonSite, sized: boolean): Row {
    const out: Row = {};
    const put = (p: string, v: StyleValue | null): void => {
        if (v !== null) {
            out[p] = v;
        }
    };
    const color = (p: string, opacity: string | null, raw: unknown): void => {
        if (raw === undefined || raw === null || raw === "") {
            return;
        }
        const c = canonColor(raw, "vis", site(p));
        if (c !== null) {
            put(p, c.color);
            if (c.alpha < 1 && opacity !== null) {
                put(opacity, c.alpha);
            }
        }
    };
    if (target === "node") {
        color("fill", "fillOpacity", layer.fill);
        color("borderColor", null, layer.border);
        if (layer.shape !== undefined) {
            put("shape", canonEnum("shape", layer.shape, "vis", site("shape")));
        }
        if (sized && layer.size !== undefined) {
            const v = canonNumber(layer.size, site("width"));
            put("width", v);
            put("height", v);
        }
        if (layer.borderWidth !== undefined) {
            put("borderWidth", canonNumber(layer.borderWidth, site("borderWidth")));
        }
        if (layer.opacity !== undefined) {
            put("opacity", canonOpacity(layer.opacity, "vis", site("opacity")));
        }
    } else {
        color("color", "opacity", layer.edgeColor);
        if (layer.edgeOpacity !== undefined) {
            put("opacity", canonOpacity(layer.edgeOpacity, "vis", site("opacity")));
        }
        if (layer.width !== undefined) {
            put("width", canonNumber(layer.width, site("width")));
        }
        if (layer.dashes !== undefined) {
            put("lineStyle", layer.dashes === false || layer.dashes === "false" ? "solid" : "dashed");
        }
        if (layer.arrows !== undefined) {
            const [to, from] = visArrows(layer.arrows, site);
            put("targetArrow", to);
            put("sourceArrow", from);
        }
    }
    if (layer.hidden !== undefined && canonBoolean(layer.hidden, site("visible")) === true) {
        put("visible", false);
    }
    if (layer.label !== undefined) {
        put("label", canonText(layer.label, site("label")));
    }
    if (layer.title !== undefined) {
        put("tooltip", canonText(layer.title, site("tooltip")));
    }
    color("labelColor", null, layer.fontColor);
    if (layer.fontSize !== undefined) {
        put("labelSize", canonNumber(layer.fontSize, site("labelSize")));
    }
    if (layer.fontFace !== undefined) {
        put("labelFont", canonText(layer.fontFace, site("labelFont")));
    }
    return out;
}

/**
 * vis.js `arrows` as the target and source arrows: `"to"`, `"to, from"`, or `{ to: true | { enabled, type } }`.
 * @param arrows - the value
 * @param site - where it is read
 * @returns the target arrow and the source arrow
 */
function visArrows(arrows: unknown, site: (property: string) => CanonSite): [string | null, string | null] {
    const end = (name: string, property: string): string | null => {
        if (typeof arrows === "string") {
            return new RegExp(`\\b${name}\\b`).test(arrows.slice(0, 256)) ? "triangle" : "none";
        }
        if (!isJsonObject(arrows)) {
            return null;
        }
        const a = arrows[name];
        if (a === true) {
            return "triangle";
        }
        if (!isJsonObject(a) || a.enabled === false) {
            return "none";
        }
        return canonEnum("arrow", a.type ?? "arrow", "vis", site(property));
    };
    return [end("to", "targetArrow"), end("from", "sourceArrow")];
}

/**
 * vis.js: the per-element keys over the file's groups and `options.nodes` / `options.edges`, beneath them
 * vis-network's defaults. The defaults and groups the file declares become declared rules; a group the file does not
 * define gets vis-network's palette, as a rule of the tool's; an edge without a color of its own takes its source
 * node's border color (its target's under `inherit: "to"`).
 * @param snapshot - the graph
 * @param src - what the import kept
 * @param context - the work budget
 * @returns the styles
 */
function visStyles(snapshot: GraphSnapshot, src: JsonStyleSource, context: StyleReadContext): ImporterStyles {
    const notes = new StyleNotes();
    const options = isJsonObject(src.options) ? src.options : {};
    let groupDefs: Record<string, unknown> = {};
    if (isJsonObject(options.groups)) {
        groupDefs = options.groups;
    } else if (isJsonObject(src.groups)) {
        groupDefs = src.groups;
    }
    const n = snapshot.nodeCount;
    const ruleSite =
        (target: StyleTarget) =>
        (property: string): CanonSite => ({ notes, target, property });
    const nodeRules: StyleRule[] = [];
    const nodeColumns = new Map<string, StyleColumn>();

    // the node defaults and groups the file declares
    const nodeDefaults = visLayer(options.nodes, "node");
    const groupCol = cells(snapshot, "node", "group");
    const groupOf = (i: number): string | null => {
        const g = groupCol?.(i);
        return typeof g === "string" || typeof g === "number" ? String(g) : null;
    };
    const groupLayers = new Map<string, VisLayer>();
    let palette = 0;
    const paletteRows = new Map<string, Row>();
    for (let i = 0; i < n; i++) {
        const g = groupOf(i);
        if (g === null || groupLayers.has(g)) {
            continue;
        }
        if (Object.hasOwn(groupDefs, g)) {
            groupLayers.set(g, visLayer(groupDefs[g], "node"));
        } else {
            const [border, background] = VIS_GROUP_PALETTE[palette++ % VIS_GROUP_PALETTE.length];
            groupLayers.set(g, { fill: background, border });
            paletteRows.set(g, { fill: background.toLowerCase(), borderColor: border.toLowerCase() });
        }
    }
    context.budget.spend("node", n);

    // what vis-network draws per node: its own keys over its group over options.nodes
    const node = valuesOf(n);
    const records = nodeRecords(snapshot);
    const rawShape = (layer: VisLayer): string | null => (typeof layer.shape === "string" ? layer.shape : null);
    for (let i = 0; i < n; i++) {
        const g = groupOf(i);
        const own = records(i);
        const group = g === null ? {} : (groupLayers.get(g) ?? {});
        const shape = rawShape(own) ?? rawShape(group) ?? rawShape(nodeDefaults) ?? "ellipse";
        const site = (property: string): CanonSite => ({
            notes,
            target: "node",
            property,
            element: i,
            budget: context.budget,
        });
        const merged = { ...nodeDefaults, ...group, ...own };
        for (const [p, v] of Object.entries(visValues(merged, "node", site, VIS_SIZED.has(shape)))) {
            node.put(p, i, v);
        }
    }
    const declaredNode = visValues(nodeDefaults, "node", ruleSite("node"), true);
    if (Object.keys(declaredNode).length > 0) {
        nodeRules.push(rule("node.vis.defaults", "node", "defaults", "declared", { all: true }, declaredNode));
    }
    let k = 0;
    for (const [g, layer] of groupLayers) {
        const set = paletteRows.get(g) ?? visValues(layer, "node", ruleSite("node"), true);
        if (Object.keys(set).length === 0) {
            continue;
        }
        const key = `group.${String(k)}`;
        nodeColumns.set(
            key,
            Array.from({ length: n }, (_v, i) => (groupOf(i) === g ? true : null)),
        );
        const origin = paletteRows.has(g) ? "tool" : "declared";
        const r = rule(`node.vis.group.${String(k++)}`, "node", "group", origin, { has: { style: key } }, set);
        nodeRules.push({ ...r, facts: { names: [[key, g]] } });
    }

    const toolNode = toolDefaults("vis-network")?.node;
    const borderOf = (i: number): StyleValue =>
        node.values.borderColor?.[i] ?? (toolNode?.borderColor?.value as StyleValue | undefined) ?? "#2b7ce9";
    const edge = visEdges(snapshot, visLayer(options.edges, "edge"), borderOf, notes, context);
    const values = { node: node.values, edge: edge.values };
    exactFromBlock(snapshot, src.block, values, VIS_WRITTEN);
    return {
        canonical: true,
        dialect: "vis",
        tool: "vis-network",
        units: "px",
        node: { values: values.node, rules: nodeRules, columns: nodeColumns },
        edge: { values: values.edge, rules: edge.rules, columns: edge.columns },
        notes: notes.list(),
        block: src.block,
        readFrom: {
            node: VIS_KEYS.node.filter((x) => snapshot.nodes.has(x)),
            edge: VIS_KEYS.edge.filter((x) => snapshot.edges.has(x)),
        },
    };
}

/**
 * vis.js edges: their own keys over `options.edges`; an edge without a color of its own takes its source node's
 * border color (its target's under `inherit: "to"`).
 * @param snapshot - the graph
 * @param edgeDefaults - `options.edges`
 * @param borderOf - each node's drawn border color
 * @param notes - where problems are noted
 * @param context - the work budget
 * @returns the edge values, rules and style columns
 */
function visEdges(
    snapshot: GraphSnapshot,
    edgeDefaults: VisLayer,
    borderOf: (node: number) => StyleValue,
    notes: StyleNotes,
    context: StyleReadContext,
): { values: Values; rules: StyleRule[]; columns: Map<string, StyleColumn> } {
    const m = snapshot.edgeCount;
    const edge = valuesOf(m);
    const edgeRecords = elementRecords(snapshot, "edge");
    const inherited: (StyleValue | null)[] = new Array<StyleValue | null>(m).fill(null);
    let inheriting = 0;
    for (let e = 0; e < m; e++) {
        const own = edgeRecords(e);
        const merged = { ...edgeDefaults, ...own };
        const site = (property: string): CanonSite => ({
            notes,
            target: "edge",
            property,
            element: e,
            budget: context.budget,
        });
        const vals = visValues(merged, "edge", site, true);
        for (const [p, v] of Object.entries(vals)) {
            edge.put(p, e, v);
        }
        const inherit = own.inherit ?? edgeDefaults.inherit ?? "from";
        if (inherit === false || inherit === "false") {
            if (vals.color === undefined) {
                edge.put("color", e, VIS_EDGE_COLOR);
            }
            continue;
        }
        if (inherit === "both") {
            notes.add(STYLE_ISSUE.GRADIENT, "edge", "color", { sample: "inherit both", element: e });
        }
        inherited[e] = borderOf(inherit === "to" ? snapshot.edgeTarget(e) : snapshot.edgeSource(e));
        inheriting++;
    }
    context.budget.spend("edge", m);
    const edgeRules: StyleRule[] = [];
    const edgeColumns = new Map<string, StyleColumn>();
    const declaredEdge = visValues(edgeDefaults, "edge", (property) => ({ notes, target: "edge", property }), true);
    if (Object.keys(declaredEdge).length > 0) {
        edgeRules.push(rule("edge.vis.defaults", "edge", "defaults", "declared", { all: true }, declaredEdge));
    }
    if (inheriting > 0) {
        // vis-network draws such an edge in its source node's color. graphty-element cannot bind an edge's color to
        // its source node's drawn color yet, so the color is frozen here; replace this column with that binding once
        // the element has it (tracking issue "graphty-element: bind an edge's color to its source node's drawn color").
        edgeColumns.set("source-color", inherited);
        edgeRules.push({
            id: "edge.tool.source-color",
            target: "edge",
            role: "passthrough",
            origin: "tool",
            where: { has: { style: "source-color" } },
            map: { color: { kind: "passthrough", by: { style: "source-color" } } },
            facts: { elements: inheriting, reason: "SOURCE_NODE_COLOR" },
        });
    }
    return { values: edge.values, rules: edgeRules, columns: edgeColumns };
}

/** The vis.js keys the reader reads, per target. */
const VIS_KEYS: Readonly<Record<StyleTarget, readonly string[]>> = {
    node: ["color", "shape", "size", "borderWidth", "opacity", "hidden", "label", "title", "font"],
    edge: ["color", "width", "dashes", "arrows", "hidden", "label", "title", "font"],
};

/**
 * Each node's own vis.js keys as a layer.
 * @param snapshot - the graph
 * @returns the layer of a node
 */
function nodeRecords(snapshot: GraphSnapshot): (i: number) => VisLayer {
    return elementRecords(snapshot, "node");
}

/**
 * Each element's own vis.js keys as a layer, read from the graph's columns.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @returns the layer of an element
 */
function elementRecords(snapshot: GraphSnapshot, target: StyleTarget): (i: number) => VisLayer {
    const readers = VIS_KEYS[target]
        .map((name) => [name, cells(snapshot, target, name)] as const)
        .filter((x): x is readonly [string, (i: number) => unknown] => x[1] !== null);
    return (i) => {
        const record: Record<string, unknown> = {};
        for (const [name, read] of readers) {
            const v = read(i);
            if (v !== null) {
                record[name] = v;
            }
        }
        return visLayer(record, target);
    };
}

/**
 * A rule.
 * @param id - its id
 * @param target - nodes or edges
 * @param role - what it is
 * @param origin - where it came from
 * @param where - which elements
 * @param set - the values
 * @returns the rule
 */
function rule(
    id: string,
    target: StyleTarget,
    role: StyleRule["role"],
    origin: StyleRule["origin"],
    where: StyleRule["where"],
    set: Row,
): StyleRule {
    const values: Record<string, StyleValue> = {};
    for (const [p, v] of Object.entries(set)) {
        if (v !== null) {
            values[p] = v;
        }
    }
    return { id, target, role, origin, where, set: values };
}

// ============================================================ writing

/** The neutral node shape to vis-network's shape; the boolean says whether it is exact. */
const VIS_SHAPES: ReadonlyMap<string, readonly [string, boolean]> = new Map([
    ["ellipse", ["dot", true]],
    ["rectangle", ["square", true]],
    ["round-rectangle", ["box", true]],
    ["triangle", ["triangle", true]],
    ["diamond", ["diamond", true]],
    ["star", ["star", true]],
    ["hexagon", ["hexagon", true]],
    ["none", ["text", true]],
    ["pentagon", ["hexagon", false]],
    ["octagon", ["hexagon", false]],
    ["parallelogram", ["box", false]],
    ["trapezoid", ["box", false]],
    ["vee", ["triangle", false]],
]);

/** The neutral arrow to vis-network's arrow type; the boolean says whether it is exact. */
const VIS_ARROW_TYPES: ReadonlyMap<string, readonly [string, boolean]> = new Map([
    ["triangle", ["arrow", true]],
    ["tee", ["bar", true]],
    ["circle", ["circle", true]],
    ["square", ["box", true]],
    ["crow", ["crow", true]],
    ["diamond", ["diamond", true]],
    ["vee", ["vee", true]],
    ["inverted", ["inv_triangle", true]],
    ["triangle-open", ["arrow", false]],
    ["diamond-open", ["diamond", false]],
    ["circle-open", ["circle", false]],
    ["half", ["arrow", false]],
]);

/**
 * A neutral shape as vis-network's: the shape, and whether it is exact.
 * @param shape - the neutral shape
 * @returns the vis-network shape and whether it is exact
 */
function visShape(shape: string): readonly [string, boolean] {
    const known = VIS_SHAPES.get(shape);
    if (known !== undefined) {
        return known;
    }
    return shape.startsWith("other:") ? [shape.slice(6), true] : ["dot", false];
}

/**
 * A neutral arrow as vis-network's arrow type: the type (null for none), and whether it is exact.
 * @param arrow - the neutral arrow
 * @returns the type and whether it is exact
 */
function visArrowType(arrow: string): readonly [string | null, boolean] {
    if (arrow === "none") {
        return [null, true];
    }
    const known = VIS_ARROW_TYPES.get(arrow);
    if (known !== undefined) {
        return known;
    }
    return arrow.startsWith("other:") ? [arrow.slice(6), true] : ["arrow", false];
}

/** What reading a written vis.js file gives back for the values vis.js holds only approximately. */
/**
 * A node size as a written vis.js file gives it back: one size for both, and none for a shape vis-network sizes by
 * its label.
 * @param want - the block's values of the element
 * @returns the size read back
 */
const visSize = (want: (p: string) => StyleValue | null): StyleValue | null => {
    const s = want("shape");
    return VIS_SIZED.has(typeof s === "string" ? visShape(s)[0] : "ellipse") ? oneSize(want) : null;
};

const VIS_WRITTEN: Written = {
    node: {
        width: visSize,
        height: visSize,
        shape: (want) => {
            const s = want("shape");
            if (typeof s !== "string") {
                return null;
            }
            const site = { notes: new StyleNotes(), target: "node" as const, property: "shape" };
            return canonEnum("shape", visShape(s)[0], "vis", site);
        },
    },
    edge: {
        lineStyle: (want) => {
            const s = want("lineStyle");
            if (s === null) {
                return null;
            }
            return s === "solid" ? "solid" : "dashed";
        },
        targetArrow: (want) => arrowBack(want("targetArrow")),
        sourceArrow: (want) => arrowBack(want("sourceArrow")),
    },
};

/**
 * What a written arrow reads back as.
 * @param a - the neutral arrow
 * @returns the arrow read back
 */
function arrowBack(a: StyleValue | null): StyleValue | null {
    if (typeof a !== "string") {
        return null;
    }
    const [type] = visArrowType(a);
    const site = { notes: new StyleNotes(), target: "edge" as const, property: "targetArrow" };
    return type === null ? "none" : canonEnum("arrow", type, "vis", site);
}

/**
 * The neutral properties Cytoscape.js holds natively, per target (what the stylesheet emitter writes).
 * @param map - the emitter's Cytoscape.js properties
 * @param extra - the neutral properties written by a rule of their own
 * @returns the properties
 */
function cyjsProperties(map: ReadonlyMap<string, { readonly property: string }>, extra: readonly string[]): string[] {
    const out = new Set<string>();
    for (const spec of map.values()) {
        if (!spec.property.startsWith("_")) {
            out.add(spec.property);
        }
    }
    for (const p of extra) {
        out.add(p);
    }
    return [...out];
}

/**
 * The neutral properties each style-writing dialect holds natively. Not part of the published entry points: the
 * documentation's per-dialect tables read it.
 */
export const NATIVE: Readonly<
    Record<"cytoscape" | "graphology" | "vis", Readonly<Record<StyleTarget, readonly string[]>>>
> = {
    cytoscape: {
        node: cyjsProperties(CYJS_NODE_PROPERTIES, ["labelPosition", "labelItalic", "visible"]),
        edge: cyjsProperties(CYJS_EDGE_PROPERTIES, ["curved", "labelItalic", "visible"]),
    },
    graphology: {
        node: ["fill", "fillOpacity", "width", "height", "label", "visible"],
        edge: ["color", "opacity", "width", "label", "visible"],
    },
    vis: {
        node: [
            "fill",
            "fillOpacity",
            "borderColor",
            "borderWidth",
            "shape",
            "width",
            "height",
            "opacity",
            "label",
            "tooltip",
            "labelColor",
            "labelSize",
            "labelFont",
            "visible",
        ],
        edge: [
            "color",
            "opacity",
            "width",
            "lineStyle",
            "targetArrow",
            "sourceArrow",
            "label",
            "tooltip",
            "labelColor",
            "labelSize",
            "labelFont",
            "visible",
        ],
    },
};

/**
 * What the JSON writer holds natively, over every dialect: Cytoscape.js's stylesheet, vis.js's and graphology's
 * per-element keys. A dialect that holds less (node-link, d3, JGF hold none) reports the rest from `check()`. The
 * block goes where each dialect keeps extra data.
 * @category Built-in formats
 */
export const JSON_STYLE_CAPABILITIES: StyleWriteCapabilities = Object.freeze({
    node: Object.freeze([
        ...new Set([...NATIVE.cytoscape.node, ...NATIVE.vis.node, ...NATIVE.graphology.node]),
    ]) as readonly NodeStyleProperty[],
    edge: Object.freeze([
        ...new Set([...NATIVE.cytoscape.edge, ...NATIVE.vis.edge, ...NATIVE.graphology.edge]),
    ]) as readonly EdgeStyleProperty[],
    block: "native",
});

/** A JSON export with styles worked out. */
export interface JsonStyledExport {
    /** The graph to write: the per-element style keys, the tagged values and, where it belongs there, the block. */
    readonly snapshot: GraphSnapshot;
    /** The block to write as a top-level key (d3, vis.js, Cytoscape.js), or null. */
    readonly topLevelBlock: string | null;
    /** Cytoscape.js: the stylesheet to write as `style`, or null. */
    readonly stylesheet: readonly CytoscapeStylesheetRule[] | null;
    /**
     * vis.js: the `groups` to write, one empty definition per value of the nodes' `group` key, or null. vis-network
     * colors a node of a group the file does not define from its own palette; a defined group draws nothing of its
     * own, so the nodes look as graphty draws them.
     */
    readonly groups?: Readonly<Record<string, Readonly<Record<string, never>>>> | null;
    /** What the dialect does not hold, or holds only approximately. */
    readonly notes: readonly LossNote[];
}

/** The graph attribute the block is written as, in the dialects with graph attributes. */
const BLOCK_AS_ATTRIBUTE: ReadonlySet<JsonDialect> = new Set(["node-link", "jgf", "graphology"]);

/**
 * Works out a JSON export with styles for one dialect.
 * @param snapshot - the graph handed to the exporter
 * @param dialect - the dialect written
 * @param input - the styles, or undefined when none are written
 * @returns the styled export, or null without styles
 */
export function jsonStyledExport(
    snapshot: GraphSnapshot,
    dialect: JsonDialect,
    input: ExporterStyleInput | undefined,
): JsonStyledExport | null {
    if (input === undefined) {
        return null;
    }
    const notes: LossNote[] = [];
    const native = dialect === "cytoscape" || dialect === "graphology" || dialect === "vis" ? NATIVE[dialect] : null;
    notes.push(...notWritten(input, dialect, native));
    if (dialect === "jgf" && !jgfKeepsNodes(snapshot)) {
        notes.push(
            Object.freeze({
                code: STYLE_ISSUE.RULES_NOT_KEPT,
                message:
                    "the style rules are not kept: JGF changes the node ids' type or order (number ids become text, integer-like ids are read first), so the graphty.styles block no longer matches the graph read back",
                column: null,
                count: input.rules.styles.rules.length,
            }),
        );
    }
    if (dialect === "obographs") {
        notes.push(
            Object.freeze({
                code: STYLE_ISSUE.RULES_NOT_KEPT,
                message: "the style rules are not kept: OBO Graphs has no place for them",
                column: null,
                count: input.rules.styles.rules.length,
            }),
        );
        return { snapshot, topLevelBlock: null, stylesheet: null, groups: null, notes };
    }
    const out = snapshot.withColumns();
    const read = dataColumnsRead(input.rules.styles.rules);
    for (const [table, target] of [
        [out.nodes, "node"],
        [out.edges, "edge"],
    ] as const) {
        // the style values an earlier write left in the data, unless the styles themselves read them as data
        for (const name of Array.from(table.names())) {
            const styleKey =
                name.startsWith("graphty.style.") || name.startsWith("graphty_style_") || name === CYTOSCAPE_IMPORT_KEY;
            if (styleKey && !read[target].has(name)) {
                table.remove(name);
            }
        }
        if (dialect === "cytoscape") {
            for (const name of ["style#element", "css#element"]) {
                if (table.has(name)) {
                    table.remove(name);
                }
            }
        }
        for (const [name, col] of input.tags[target]) {
            setColumn(table, name, col);
        }
    }
    if (out.graph.has(STYLE_BLOCK_NAME)) {
        out.graph.remove(STYLE_BLOCK_NAME);
    }
    if (BLOCK_AS_ATTRIBUTE.has(dialect)) {
        out.graph.set(STYLE_BLOCK_NAME, [input.block], { dtype: "string" });
    }
    let stylesheet: readonly CytoscapeStylesheetRule[] | null = null;
    const approximated = new Approximations();
    const replaced = new Replaced(out.nodes);
    if (dialect === "cytoscape") {
        // the element data the stylesheet is checked against is the data written: without the style values of an
        // earlier write, which are not written again
        const features = {
            node: input.rules.features.node.filter((f) => !("data" in f.ref) || out.nodes.has(f.ref.data)),
            edge: input.rules.features.edge.filter((f) => !("data" in f.ref) || out.edges.has(f.ref.data)),
        };
        const emitted = toCytoscapeStylesheet({ ...input.rules, features });
        ({ stylesheet } = emitted);
        for (const [table, target] of [
            [out.nodes, "node"],
            [out.edges, "edge"],
        ] as const) {
            const rows = emitted.elementData[target];
            const keys = new Set<string>();
            for (const row of rows) {
                for (const key of Object.keys(row ?? {})) {
                    keys.add(key);
                }
            }
            for (const key of keys) {
                setColumn(
                    table,
                    key,
                    rows.map((row) => row?.[key] ?? null),
                );
            }
            const bypass = emitted.bypass[target];
            if (bypass.some((b) => b !== null && Object.keys(b).length > 0)) {
                setColumn(
                    table,
                    "style#element",
                    bypass.map((b) => (b === null || Object.keys(b).length === 0 ? null : b)),
                );
            }
        }
        notes.push(...emitted.notes.map(lossOf));
        for (const target of TARGETS) {
            for (const property of CYJS_TEXT[target]) {
                for (const v of input.picture(target, property as never)) {
                    if (typeof v === "string" && v.trim() !== v) {
                        approximated.add(target, property, JSON.stringify(v));
                    }
                }
            }
        }
    } else if (dialect === "graphology") {
        writeGraphology(out, input, approximated, replaced);
    } else if (dialect === "vis") {
        writeVis(out, input, approximated, replaced);
    }
    notes.push(...approximated.notes(dialect), ...replaced.notes(dialect));
    return {
        snapshot: out,
        topLevelBlock: BLOCK_AS_ATTRIBUTE.has(dialect) ? null : input.block,
        stylesheet,
        groups: dialect === "vis" ? visGroups(out) : null,
        notes,
    };
}

/**
 * vis.js: one empty group definition per value of the nodes' `group` key, so vis-network draws none of its palette.
 * @param snapshot - the graph written
 * @returns the definitions, or null when no node names a group
 */
function visGroups(snapshot: GraphSnapshot): Record<string, Record<string, never>> | null {
    const column = snapshot.nodes.get("group");
    if (column === null || column === undefined) {
        return null;
    }
    const groups = new Map<string, Record<string, never>>();
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const value = column.isSet(i) ? column.value(i) : null;
        if (typeof value === "string" || typeof value === "number") {
            groups.set(String(value), {});
        }
    }
    return groups.size === 0 ? null : Object.fromEntries(groups);
}

/**
 * The data columns rules read, per target.
 * @param rules - the rules
 * @returns the column names
 */
function dataColumnsRead(rules: readonly StyleRule[]): Record<StyleTarget, Set<string>> {
    const out: Record<StyleTarget, Set<string>> = { node: new Set(), edge: new Set() };
    for (const rule of rules) {
        const add = (ref: ColumnRef): void => {
            if ("data" in ref) {
                out[rule.target].add(ref.data);
            }
        };
        const stack: Predicate[] = [rule.where];
        while (stack.length > 0) {
            const p = stack.pop() as Predicate;
            if ("has" in p) {
                add(p.has);
            } else if ("eq" in p) {
                add(p.eq[0]);
            } else if ("in" in p) {
                add(p.in[0]);
            } else if ("and" in p) {
                stack.push(...p.and);
            } else if ("or" in p) {
                stack.push(...p.or);
            } else if ("not" in p) {
                stack.push(p.not);
            }
        }
        for (const m of Object.values(rule.map ?? {})) {
            if (m !== undefined) {
                add(m.by);
            }
        }
    }
    return out;
}

/**
 * Whether JGF reads the nodes back with the same ids in the same order: no number ids (JGF keys nodes by text), and
 * the integer-like ids (which JSON parsers enumerate first, ascending) already first and ascending.
 * @param snapshot - the graph
 * @returns true when the block's fingerprint survives
 */
function jgfKeepsNodes(snapshot: GraphSnapshot): boolean {
    let last = -1;
    let other = false;
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const id = snapshot.ids.idOf(i);
        if (typeof id === "number") {
            return false;
        }
        if (/^(0|[1-9]\d*)$/.test(id) && Number(id) < 4294967295) {
            if (other || Number(id) <= last) {
                return false;
            }
            last = Number(id);
        } else {
            other = true;
        }
    }
    return true;
}

/**
 * W_STYLE_NOT_WRITTEN for each property the styles use that the dialect does not hold but some other dialect does
 * (graph-io reports the properties no dialect holds).
 * @param input - the styles
 * @param dialect - the dialect
 * @param native - what it holds, or null for none
 * @returns the notes
 */
function notWritten(
    input: ExporterStyleInput,
    dialect: JsonDialect,
    native: Readonly<Record<StyleTarget, readonly string[]>> | null,
): LossNote[] {
    const out: LossNote[] = [];
    for (const target of TARGETS) {
        const all = new Set<string>(JSON_STYLE_CAPABILITIES[target]);
        const held = new Set<string>(native?.[target] ?? []);
        const used = new Set<string>();
        for (const r of input.rules.styles.rules) {
            if (r.target === target) {
                for (const p of [...Object.keys(r.set ?? {}), ...Object.keys(r.map ?? {})]) {
                    used.add(p);
                }
            }
        }
        for (const property of used) {
            if (!all.has(property) || held.has(property)) {
                continue;
            }
            const count = input.picture(target, property as never).filter((v) => v !== null).length;
            out.push(
                Object.freeze({
                    code: STYLE_ISSUE.NOT_WRITTEN,
                    message: `${target} ${property} is not written: the ${dialect} dialect of JSON has no place for it`,
                    column: null,
                    count,
                    style: Object.freeze({ target, property: property as never }),
                }),
            );
        }
    }
    return out;
}

/**
 * A style note as a loss note.
 * @param n - the note
 * @returns the loss note
 */
function lossOf(n: StyleNote): LossNote {
    return Object.freeze({
        code: n.code,
        message: n.message,
        column: null,
        count: n.params.count,
        style:
            n.params.target === null || n.params.property === null
                ? undefined
                : Object.freeze({ target: n.params.target, property: n.params.property as never }),
    });
}

/** Counts the values written as the nearest value a dialect holds, per target and property. */
class Approximations {
    readonly #seen = new Map<string, { count: number; samples: Set<string> }>();

    /**
     * Records one value written approximately.
     * @param target - nodes or edges
     * @param property - the property
     * @param value - the exact value
     */
    add(target: StyleTarget, property: string, value: unknown): void {
        const key = `${target}.${property}`;
        const a = this.#seen.get(key) ?? { count: 0, samples: new Set<string>() };
        a.count++;
        if (a.samples.size < 8) {
            a.samples.add(String(value));
        }
        this.#seen.set(key, a);
    }

    /**
     * The W_STYLE_APPROXIMATED notes.
     * @param dialect - the dialect, for the message
     * @returns the notes
     */
    notes(dialect: JsonDialect): LossNote[] {
        return Array.from(this.#seen, ([key, a]) => {
            const [target, property] = key.split(".") as [StyleTarget, string];
            return Object.freeze({
                code: STYLE_ISSUE.APPROXIMATED,
                message: `${target} ${property} is written as the nearest value the ${dialect} dialect of JSON has for ${String(a.count)} ${target}${a.count === 1 ? "" : "s"} (${[...a.samples].join(", ")}); the graphty.styles block keeps the exact value`,
                column: null,
                count: a.count,
                style: Object.freeze({ target, property: property as never }),
            });
        });
    }
}

/** An editable attribute table of `snapshot.withColumns()`. */
type Table = ReturnType<GraphSnapshot["withColumns"]>["nodes"];

/**
 * Sets a column, with the dtype its values have: numbers, booleans, text, else JSON.
 * @param table - the table
 * @param name - the column
 * @param values - the values by row, null where unset
 */
function setColumn(table: Table, name: string, values: readonly unknown[]): void {
    const kinds = new Set(values.filter((v) => v !== null && v !== undefined).map((v) => typeof v));
    let dtype: "f64" | "bool" | "string" | "json" = "json";
    if (kinds.size === 1) {
        if (kinds.has("number")) {
            dtype = "f64";
        } else if (kinds.has("boolean")) {
            dtype = "bool";
        } else if (kinds.has("string")) {
            dtype = "string";
        }
    }
    // an unset row is undefined: null is a value in a json column
    table.set(
        name,
        values.map((v) => (v === null ? undefined : v)),
        { dtype },
    );
}

/**
 * Writes a picture into a style key: every element gets the picture's value, and an element the picture gives none
 * loses the key, so a program reading the file draws what graphty draws. A value the column held before that differs
 * is counted, for the loss note.
 * @param table - the table
 * @param name - the column
 * @param values - the picture, null where it has no value
 * @param replaced - counts the values replaced, per column
 */
function writeKey(table: Table, name: string, values: readonly unknown[], replaced: Replaced): void {
    const old = table.get(name);
    let changed = 0;
    if (old !== null) {
        for (let i = 0; i < values.length; i++) {
            const before = plainCell(old.value(i));
            const after = values[i] ?? null;
            if (before !== null && JSON.stringify(before) !== JSON.stringify(after)) {
                changed++;
            }
        }
    }
    if (changed > 0) {
        replaced.add(table === replaced.nodes ? "node" : "edge", name, changed);
    }
    if (values.every((v) => v === null || v === undefined)) {
        if (old !== null) {
            table.remove(name);
        }
        return;
    }
    setColumn(table, name, values);
}

/**
 * The code of the note that a data value held under a style key is replaced by what graphty draws.
 * @category Built-in formats
 */
export const STYLE_KEY_REPLACED_CODE = "W_JSON_STYLE_KEY_REPLACED";

/** Counts the data values a style key's picture replaces, per target and key. */
class Replaced {
    readonly #counts = new Map<string, number>();

    /**
     * Counts the replaced values of one export.
     * @param nodes - the node table being written, which tells node columns from edge columns
     */
    constructor(readonly nodes: Table) {}

    /**
     * Counts replaced values.
     * @param target - nodes or edges
     * @param key - the key
     * @param count - how many
     */
    add(target: StyleTarget, key: string, count: number): void {
        this.#counts.set(`${target}\u0000${key}`, (this.#counts.get(`${target}\u0000${key}`) ?? 0) + count);
    }

    /**
     * The notes, one per key.
     * @param dialect - the dialect, for the message
     * @returns the notes
     */
    notes(dialect: JsonDialect): LossNote[] {
        return Array.from(this.#counts, ([key, count]) => {
            const [target, name] = key.split("\u0000");
            return Object.freeze({
                code: STYLE_KEY_REPLACED_CODE,
                message: `${target} column "${name}" is the ${dialect} dialect's style key: ${String(count)} ${target}${count === 1 ? "" : "s"} get what graphty draws instead of the value the column held`,
                column: name,
                count,
            });
        });
    }
}

/**
 * A color with its alpha as CSS text: `#rrggbb`, or `rgba()` below full opacity.
 * @param color - the color
 * @param alpha - the opacity, or null
 * @returns the text, or null
 */
function cssColor(color: StyleValue | null, alpha: StyleValue | null): string | null {
    if (typeof color !== "string") {
        return null;
    }
    if (typeof alpha !== "number" || alpha >= 1) {
        return color;
    }
    const n = Number.parseInt(color.slice(1), 16);
    return `rgba(${String((n >> 16) & 255)},${String((n >> 8) & 255)},${String(n & 255)},${String(alpha)})`;
}

/**
 * One size for a node's width and height, noting a node whose two differ.
 * @param width - the widths
 * @param height - the heights
 * @param approximated - where approximations are counted
 * @returns the sizes
 */
function nodeSizes(
    width: readonly (StyleValue | null)[],
    height: readonly (StyleValue | null)[],
    approximated: Approximations,
): (number | null)[] {
    return width.map((_v, i) => {
        const w = width[i];
        const h = height[i];
        if (typeof w === "number" && typeof h === "number" && w !== h) {
            approximated.add("node", w > h ? "height" : "width", `${String(w)} x ${String(h)}`);
            return Math.max(w, h);
        }
        if (typeof w === "number") {
            return w;
        }
        return typeof h === "number" ? h : null;
    });
}

/**
 * graphology: sigma.js's keys from the picture.
 * @param out - the graph being written
 * @param input - the styles
 * @param approximated - where approximations are counted
 * @param replaced - where replaced data values are counted
 */
function writeGraphology(
    out: ReturnType<GraphSnapshot["withColumns"]>,
    input: ExporterStyleInput,
    approximated: Approximations,
    replaced: Replaced,
): void {
    const p = (target: StyleTarget, property: string): readonly (StyleValue | null)[] =>
        input.picture(target, property as never);
    for (const [table, target] of [
        [out.nodes, "node"],
        [out.edges, "edge"],
    ] as const) {
        const [fill, opacity] = target === "node" ? ["fill", "fillOpacity"] : ["color", "opacity"];
        const colors = p(target, fill);
        const alphas = p(target, opacity);
        writeKey(
            table,
            "color",
            colors.map((c, i) => cssColor(c, alphas[i])),
            replaced,
        );
        writeKey(
            table,
            "size",
            target === "node" ? nodeSizes(p("node", "width"), p("node", "height"), approximated) : p("edge", "width"),
            replaced,
        );
        writeKey(table, "label", p(target, "label"), replaced);
        writeKey(
            table,
            "hidden",
            p(target, "visible").map((v) => (v === false ? true : null)),
            replaced,
        );
    }
}

/**
 * vis.js: vis-network's keys from the picture.
 * @param out - the graph being written
 * @param input - the styles
 * @param approximated - where approximations are counted
 * @param replaced - where replaced data values are counted
 */
function writeVis(
    out: ReturnType<GraphSnapshot["withColumns"]>,
    input: ExporterStyleInput,
    approximated: Approximations,
    replaced: Replaced,
): void {
    const p = (target: StyleTarget, property: string): readonly (StyleValue | null)[] =>
        input.picture(target, property as never);
    const font = (target: StyleTarget): (Record<string, StyleValue> | null)[] => {
        const color = p(target, "labelColor");
        const size = p(target, "labelSize");
        const face = p(target, "labelFont");
        return color.map((_v, i) => {
            const f: Record<string, StyleValue> = {};
            if (color[i] !== null) {
                f.color = color[i];
            }
            if (size[i] !== null) {
                f.size = size[i];
            }
            if (face[i] !== null) {
                f.face = face[i];
            }
            return Object.keys(f).length === 0 ? null : f;
        });
    };
    const label = (table: Table, target: StyleTarget): void => {
        writeKey(table, "label", p(target, "label"), replaced);
        writeKey(table, "title", p(target, "tooltip"), replaced);
        writeKey(table, "font", font(target), replaced);
        writeKey(
            table,
            "hidden",
            p(target, "visible").map((v) => (v === false ? true : null)),
            replaced,
        );
    };

    const fill = p("node", "fill");
    const fillOpacity = p("node", "fillOpacity");
    const border = p("node", "borderColor");
    writeKey(
        out.nodes,
        "color",
        fill.map((_v, i) => {
            const c: Record<string, string> = {};
            const bg = cssColor(fill[i], fillOpacity[i]);
            if (bg !== null) {
                c.background = bg;
            }
            if (typeof border[i] === "string") {
                c.border = border[i];
            }
            return Object.keys(c).length === 0 ? null : c;
        }),
        replaced,
    );
    const sizes = nodeSizes(p("node", "width"), p("node", "height"), approximated);
    const shapes = p("node", "shape").map((s, i) => {
        const [shape, exact] = typeof s === "string" ? visShape(s) : [null, true];
        if (!exact) {
            approximated.add("node", "shape", s);
        }
        if (sizes[i] !== null && !VIS_SIZED.has(shape ?? "ellipse")) {
            approximated.add("node", "width", `${String(s ?? "ellipse")} sized by its label`);
        }
        return shape;
    });
    writeKey(out.nodes, "shape", shapes, replaced);
    writeKey(out.nodes, "size", sizes, replaced);
    writeKey(out.nodes, "borderWidth", p("node", "borderWidth"), replaced);
    writeKey(out.nodes, "opacity", p("node", "opacity"), replaced);
    label(out.nodes, "node");

    const color = p("edge", "color");
    const opacity = p("edge", "opacity");
    writeKey(
        out.edges,
        "color",
        color.map((_v, e) => {
            const c: Record<string, StyleValue> = {};
            if (typeof color[e] === "string") {
                c.color = color[e];
            }
            if (typeof opacity[e] === "number") {
                c.opacity = opacity[e];
            }
            return Object.keys(c).length === 0 ? null : c;
        }),
        replaced,
    );
    writeKey(out.edges, "width", p("edge", "width"), replaced);
    writeKey(
        out.edges,
        "dashes",
        p("edge", "lineStyle").map((s) => {
            if (typeof s !== "string") {
                return null;
            }
            if (s !== "solid" && s !== "dashed") {
                approximated.add("edge", "lineStyle", s);
            }
            return s !== "solid";
        }),
        replaced,
    );
    const to = p("edge", "targetArrow");
    const from = p("edge", "sourceArrow");
    writeKey(
        out.edges,
        "arrows",
        to.map((_v, e) => {
            const a: Record<string, { enabled: boolean; type?: string }> = {};
            for (const [end, value, property] of [
                ["to", to[e], "targetArrow"],
                ["from", from[e], "sourceArrow"],
            ] as const) {
                if (typeof value !== "string") {
                    continue;
                }
                const [type, exact] = visArrowType(value);
                if (!exact) {
                    approximated.add("edge", property, value);
                }
                a[end] = type === null ? { enabled: false } : { enabled: true, type };
            }
            return Object.keys(a).length === 0 ? null : a;
        }),
        replaced,
    );
    label(out.edges, "edge");
}
