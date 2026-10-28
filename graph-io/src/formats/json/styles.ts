/**
 * JSON styles: each dialect read the way the program that draws it draws it, and a graph's styles written back into
 * each dialect's own style keys.
 *
 * - Cytoscape.js: the stylesheet (an array or a CSS-like text) over the raw element JSON, through graph-io's
 *   Cytoscape.js engine, with Cytoscape.js's defaults beneath it; an element's own `style` is a bypass. Cytoscape
 *   desktop's export without a stylesheet gets Cytoscape desktop's default style instead.
 * - graphology: the keys sigma.js draws (`color`, `size` (a radius), `label`), with sigma's defaults. Gephi's JSON
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
import { StyleApproximations } from "../../styles/io/approximations.js";
import { parseStyleBlock, STYLE_BLOCK_NAME } from "../../styles/io/block.js";
import { takeFromBlock } from "../../styles/io/round-trip.js";
import type { ExporterStyleInput } from "../../styles/io/writer.js";
import { StyleNotes } from "../../styles/notes.js";
import { styleFingerprint } from "../../styles/plan/features.js";
import { plainCell } from "../../styles/plan/resolve.js";
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
    /** graphology: the sigma.js settings the drawing uses (the `sigmaSettings` import option). */
    readonly sigma?: SigmaSettings;
    /** node-link: whether the document has NetworkX's `directed`, `multigraph` and `graph` keys. */
    readonly networkx?: boolean;
}

/** The sigma.js settings that change what graph-io reads from a graphology document; the rest are the application's. */
export interface SigmaSettings {
    /** Whether sigma draws edge labels (`renderEdgeLabels`, off by default). */
    readonly renderEdgeLabels: boolean;
    /** Whose edge labels it draws (`edgeLabelAnchors`): between two labeled nodes ("nodeLabels", the default), or every edge's. */
    readonly edgeLabelAnchors: "nodeLabels" | "allNodes";
}

/** sigma.js's own settings. */
export const SIGMA_DEFAULT_SETTINGS: SigmaSettings = { renderEdgeLabels: false, edgeLabelAnchors: "nodeLabels" };

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
    edge: {
        ...Object.fromEntries(CYJS_TEXT.edge.map((p) => [p, trimmed(p)])),
        // Cytoscape.js draws a loop curved whatever its curve style says
        curved: (want, e, snapshot) =>
            snapshot.edgeSource(e) === snapshot.edgeTarget(e) && want("curved") !== null ? true : want("curved"),
    },
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
                setValue(values, p, n, i, v);
            }
        },
    };
}

/**
 * Sets one element's value of a property, making the property's column on first use.
 * @param values - the values per property
 * @param property - the property
 * @param n - the element count
 * @param i - the element
 * @param v - the value; null clears it
 */
function setValue(values: Values, property: string, n: number, i: number, v: StyleValue | null): void {
    values[property] ??= new Array<StyleValue | null>(n).fill(null);
    values[property][i] = v;
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
    const edgeLabel = sigmaEdgeLabels(snapshot, src.sigma ?? SIGMA_DEFAULT_SETTINGS);
    for (const target of TARGETS) {
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const { values, put } = valuesOf(n);
        const keys: SigmaKeys = {
            color: cells(snapshot, target, "color"),
            size: cells(snapshot, target, "size"),
            // sigma 4's default styles bind nothing else: it draws an element marked `hidden: true` (sigma 3's key)
            // or `visibility: "hidden"` (its own display-data name) like any other (specimen sheets
            // graphology-specimen-node-sizes-opacity, -edges-lines)
            label: cells(snapshot, target, "label"),
        };
        readFrom[target].push(...Object.entries(keys).flatMap(([name, c]) => (c === null ? [] : [name])));
        for (let i = 0; i < n; i++) {
            const site = (property: string): CanonSite => ({
                notes,
                target,
                property,
                element: i,
                budget: context.budget,
            });
            readSigmaRow(keys, target, target === "node" || edgeLabel(i), i, put, site);
        }
        out[target] = values;
    }
    exactFromBlock(snapshot, blockText(snapshot, src), out, GRAPHOLOGY_WRITTEN);
    return {
        canonical: true,
        dialect: "graphology",
        tool: "sigma",
        opacityInColor: true,
        units: "relative",
        node: { values: out.node },
        edge: { values: out.edge },
        notes: notes.list(),
        readFrom,
    };
}

/**
 * Which edges sigma.js draws the label of: none unless `renderEdgeLabels` is on; then, under `edgeLabelAnchors`
 * "nodeLabels", only an edge whose two end nodes show a label.
 * @param snapshot - the graph
 * @param settings - sigma's settings
 * @returns whether edge `i`'s label is drawn
 */
function sigmaEdgeLabels(snapshot: GraphSnapshot, settings: SigmaSettings): (i: number) => boolean {
    if (!settings.renderEdgeLabels) {
        return () => false;
    }
    if (settings.edgeLabelAnchors === "allNodes") {
        return () => true;
    }
    // ponytail: a node "shows" its label when it has one; sigma also hides labels by its label grid and
    // labelRenderedSizeThreshold, which depend on its framing. Model those once graphty frames a sigma file as sigma does.
    const label = cells(snapshot, "node", "label");
    const shows = (node: number): boolean => {
        const text = label?.(node);
        return typeof text === "string" ? text !== "" : text !== null && text !== undefined;
    };
    return (i) => shows(snapshot.edgeSource(i)) && shows(snapshot.edgeTarget(i));
}

/** The cell readers of the keys sigma.js draws, null for a key the graph does not have. */
interface SigmaKeys {
    readonly color: ((i: number) => unknown) | null;
    readonly size: ((i: number) => unknown) | null;
    readonly label: ((i: number) => unknown) | null;
}

/**
 * Reads one element's sigma.js keys.
 * @param keys - the cell readers
 * @param target - nodes or edges
 * @param labeled - whether sigma draws the element's label
 * @param i - the element
 * @param put - the setter
 * @param site - where a value of a property was read
 */
function readSigmaRow(
    keys: SigmaKeys,
    target: StyleTarget,
    labeled: boolean,
    i: number,
    put: (p: string, i: number, v: StyleValue | null) => void,
    site: (property: string) => CanonSite,
): void {
    const { color, size, label } = keys;
    if (color !== null) {
        const [fill, opacity] = target === "node" ? ["fill", "fillOpacity"] : ["color", "opacity"];
        putColor(put, fill, opacity, i, color(i), site(fill));
    }
    if (size !== null) {
        putSigmaSize(put, target, i, size(i), site);
    }
    // an edge's label is drawn only under sigma's renderEdgeLabels setting, which a document never carries (the
    // `sigmaSettings` import option); otherwise it is data (graphology-specimen-edge-labels, -p2, -p3)
    if (label !== null && labeled) {
        const text = canonText(label(i), site("label"));
        // sigma draws a label with the canvas's fillText, which draws each ASCII whitespace as a space: one line
        // (graphology-specimen-labels, label-multiline)
        put("label", i, text === null ? null : text.replaceAll(/[\t\n\f\r]/g, " "));
    }
}

/**
 * One element's sigma.js size, as its width (and a node's height).
 * @param put - the setter
 * @param target - nodes or edges
 * @param i - the element
 * @param raw - the size value
 * @param site - where a value of a property was read
 */
function putSigmaSize(
    put: (p: string, i: number, v: StyleValue | null) => void,
    target: StyleTarget,
    i: number,
    raw: unknown,
    site: (property: string) => CanonSite,
): void {
    if (target === "node") {
        // sigma draws a node's size as its radius, and a node of negative size not at all
        // (graphology-specimen-node-sizes-opacity, size-negative)
        const v = Number(raw) < 0 ? 0 : canonNumber(raw, site("width"));
        const d = v === null ? null : v * 2;
        put("width", i, d);
        put("height", i, d);
    } else {
        // sigma's edge shader draws an edge half as wide as a node of the same size is in radius: size 6 draws
        // 3 px where a node of size 6 is 5.8 px in radius (graphology-specimen-arrows edge-size-6)
        const w = canonNumber(raw, site("width"));
        put("width", i, w === null ? null : w / 2);
    }
}

/**
 * A color as sigma.js reads it, into a property and its opacity.
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
    // sigma draws a missing color with its default, and any string it cannot read ("" too) black
    if (raw === null || raw === undefined) {
        return;
    }
    const c = canonColor(raw, "graphology", site);
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
    Record<
        StyleTarget,
        Record<
            string,
            (want: (p: string) => StyleValue | null, i: number, snapshot: GraphSnapshot) => StyleValue | null
        >
    >
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
    takeFromBlock(snapshot, text, "json", (target, block, ex) => {
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        if (holdsExactly !== undefined) {
            const properties = new Set(
                ex.styles.rules
                    .filter((r) => r.target === target)
                    .flatMap((r) => [...Object.keys(r.set ?? {}), ...Object.keys(r.map ?? {})]),
            );
            for (const property of properties) {
                const held = (w: StyleValue): boolean => holdsExactly(target, property, w);
                takeUnheld(values[target], property, block(target, property), n, held);
            }
        }
        const writes = written[target] ?? {};
        return {
            values: values[target],
            properties: Object.keys(writes),
            // a native value the writer made from the block's other values (vis.js's one size for a width) is the
            // block's own value, none included
            readBack: (i, want) => (property) => writes[property](want, i, snapshot),
            take: (_property, _wanted, native) => native !== null,
        };
    });
}

/**
 * Takes the block's value of a property wherever the dialect does not hold it exactly.
 * @param values - the native values of the target, changed in place
 * @param property - the property
 * @param want - the block's values
 * @param n - the element count
 * @param held - whether the dialect holds a value exactly
 */
function takeUnheld(
    values: Values,
    property: string,
    want: readonly (StyleValue | null)[],
    n: number,
    held: (w: StyleValue) => boolean,
): void {
    for (let i = 0; i < n; i++) {
        const w = want[i];
        if (w !== null && !held(w)) {
            setValue(values, property, n, i, w);
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

/** vis-network's node shapes sized by their label, as the `labelFit` facts of each (vis-network 9.1.9 `resize`). */
const VIS_LABEL_FIT: ReadonlyMap<string, { readonly square: boolean; readonly ellipse: boolean }> = new Map([
    ["box", { square: false, ellipse: false }],
    ["text", { square: false, ellipse: false }],
    ["circle", { square: true, ellipse: false }],
    ["database", { square: true, ellipse: false }],
    ["ellipse", { square: false, ellipse: true }],
]);

/** vis-network's default `margin` and font size (vis-network.esm.js NodesHandler defaults). */
const VIS_MARGIN = 5;
const VIS_FONT_SIZE = 14;

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

/** vis-network's node colors where nothing sets them (vis-network 9.1.9 `NodesHandler` defaults `color`). */
const VIS_NODE_FILL = "#97C2FC";
const VIS_NODE_BORDER = "#2B7CE9";

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
    if (rgb?.slice(1).every((c) => Number(c) <= 255)) {
        hex = `#${((1 << 24) + (Number(rgb[1]) << 16) + (Number(rgb[2]) << 8) + Number(rgb[3])).toString(16).slice(1)}`;
    }
    if (!/^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(hex)) {
        return { background: text, border: text };
    }
    const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
    return { background: full, border: visBorder(full) };
}

/**
 * vis-util's border of a background color: 20% darker and 25% more saturated, through HSV.
 * @param full - the background, `#rrggbb`
 * @returns the border, `#rrggbb`
 */
function visBorder(full: string): string {
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
    return `#${((1 << 24) + (rgbOut[0] << 16) + (rgbOut[1] << 8) + rgbOut[2]).toString(16).slice(1)}`;
}

/** One layer of vis.js options for an element: the file's raw values, before canonicalization. */
interface VisLayer {
    fill?: unknown;
    border?: unknown;
    shape?: unknown;
    size?: unknown;
    value?: unknown;
    scalingMin?: unknown;
    scalingMax?: unknown;
    borderWidth?: unknown;
    opacity?: unknown;
    hidden?: unknown;
    label?: unknown;
    title?: unknown;
    /** edges: whether `font` was given as text, which leaves the edge's label off the canvas (visValues) */
    fontText?: unknown;
    /** `font.multi`: whether the label's text holds html or markdown markup (visLabelText) */
    fontMulti?: unknown;
    fontStrokeWidth?: unknown;
    fontStrokeColor?: unknown;
    fontBackground?: unknown;
    fontAlign?: unknown;
    fontColor?: unknown;
    fontSize?: unknown;
    fontFace?: unknown;
    /** `font.vadjust`: how far down the label's text is drawn */
    fontVadjust?: unknown;
    /** `font.bold`, `font.ital`, `font.boldital` and `font.mono`: each font modifier's own options */
    fontMods?: unknown;
    margin?: unknown;
    /** `widthConstraint` (a number) or its `maximum`: the width the label's lines wrap at */
    wrapWidth?: unknown;
    /** `scaling.label`: the label's font size from `value` when enabled */
    scalingLabel?: unknown;
    /** nodes: `shapeProperties.borderDashes` */
    borderDashes?: unknown;
    /** nodes: `shapeProperties.borderRadius`, a box's corner radius */
    borderRadius?: unknown;
    widthMin?: unknown;
    heightMin?: unknown;
    /** nodes: `heightConstraint.valign` */
    valign?: unknown;
    width?: unknown;
    dashes?: unknown;
    arrows?: unknown;
    edgeColor?: unknown;
    edgeOpacity?: unknown;
    inherit?: unknown;
    background?: unknown;
    smooth?: unknown;
    selfReference?: unknown;
    selfReferenceSize?: unknown;
    physics?: unknown;
    /** edges: the rest length of its spring (and of its support node's two springs together) */
    length?: unknown;
    image?: unknown;
    brokenImage?: unknown;
    useImageSize?: unknown;
    useBorderWithImage?: unknown;
    interpolation?: unknown;
    imagePadding?: unknown;
    coordinateOrigin?: unknown;
    iconCode?: unknown;
    iconFace?: unknown;
    iconSize?: unknown;
    iconColor?: unknown;
    iconWeight?: unknown;
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
    const set: SetLayer = (k, v) => {
        if (v !== undefined && v !== null) {
            layer[k] = v;
        }
    };
    if (target === "node") {
        visNodeLayer(o, set);
    } else {
        visEdgeLayer(o, set);
    }
    set("hidden", o.hidden);
    set("label", o.label);
    set("title", o.title);
    set("wrapWidth", isJsonObject(o.widthConstraint) ? o.widthConstraint.maximum : o.widthConstraint);
    if (isJsonObject(o.scaling)) {
        set("scalingLabel", o.scaling.label);
    }
    visFontLayer(o.font, set);
    if (target === "edge" && o.font !== undefined && o.font !== null) {
        set("fontText", typeof o.font === "string");
    }
    return layer;
}

/** Sets a key of a vis.js layer when the value is neither undefined nor null. */
type SetLayer = (k: keyof VisLayer, v: unknown) => void;

/**
 * The node keys of a vis.js options object: a color given as text has vis-util's darker border.
 * @param o - the options
 * @param set - the layer's setter
 */
function visNodeLayer(o: Record<string, unknown>, set: SetLayer): void {
    const { color } = o;
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
    set("value", o.value);
    if (isJsonObject(o.scaling)) {
        set("scalingMin", o.scaling.min);
        set("scalingMax", o.scaling.max);
    }
    set("borderWidth", o.borderWidth);
    set("opacity", o.opacity);
    set("margin", o.margin);
    set("widthMin", isJsonObject(o.widthConstraint) ? o.widthConstraint.minimum : o.widthConstraint);
    set("heightMin", isJsonObject(o.heightConstraint) ? o.heightConstraint.minimum : o.heightConstraint);
    set("valign", isJsonObject(o.heightConstraint) ? o.heightConstraint.valign : undefined);
    set("image", isJsonObject(o.image) ? o.image.unselected : o.image);
    set("brokenImage", o.brokenImage);
    set("imagePadding", o.imagePadding);
    if (isJsonObject(o.icon)) {
        set("iconCode", o.icon.code);
        set("iconFace", o.icon.face);
        set("iconSize", o.icon.size);
        set("iconColor", o.icon.color);
        set("iconWeight", o.icon.weight);
    }
    if (isJsonObject(o.shapeProperties)) {
        set("useImageSize", o.shapeProperties.useImageSize);
        set("useBorderWithImage", o.shapeProperties.useBorderWithImage);
        set("interpolation", o.shapeProperties.interpolation);
        set("coordinateOrigin", o.shapeProperties.coordinateOrigin);
        set("borderDashes", o.shapeProperties.borderDashes);
        set("borderRadius", o.shapeProperties.borderRadius);
    }
}

/**
 * What a vis-network `image` or `circularImage` node draws (vis-network 9.1.9 `Image`, `CircularImage`,
 * `CircleImageBase._resizeImage`): its picture, the broken image in its place when it has none, with its shorter
 * side across the node's `2 * size` square (or at its own pixels with `shapeProperties.useImageSize`); an `image`
 * node is the picture alone, reaching past that square, or over a box of its background with
 * `shapeProperties.useBorderWithImage`; a `circularImage` is cut to a circle and ringed by its border. Its
 * `imagePadding` keeps the picture that far inside the node's box on each side, stretched to what is left
 * (`_drawImageAtPosition`); the node's `opacity` fades the picture too; with `shapeProperties.coordinateOrigin`
 * "top-left" an `image` node with no box of its own draws its picture with its top left corner at the node's position.
 * @param layer - the node's merged layer
 * @param shape - its vis-network shape
 * @param box - the node's width and height, in the file's units
 * @param box.width - its width
 * @param box.height - its height
 * @returns the values, none for another shape or a node with no picture
 */
function visImage(layer: VisLayer, shape: string, box: { width: number; height: number }): Row {
    const text = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
    const [own, broken] = [text(layer.image), text(layer.brokenImage)];
    const src = own ?? broken;
    if ((shape !== "image" && shape !== "circularImage") || src === null) {
        return {};
    }
    const circular = shape === "circularImage";
    const row: Row = {
        image: src,
        ...(own !== null && broken !== null ? { imageFallback: broken } : {}),
        imageFit: layer.useImageSize === true ? "none" : "cover",
        imageClip: circular ? "node" : "none",
        shape: "ellipse",
    };
    if (!circular) {
        row.shape = layer.useBorderWithImage === true ? "rectangle" : "none";
    }
    if (layer.interpolation === false) {
        row.imageSmoothing = false;
    }
    const opacity = typeof layer.opacity === "number" && layer.opacity >= 0 && layer.opacity < 1 ? layer.opacity : null;
    if (opacity !== null) {
        row.imageOpacity = opacity;
    }
    visImagePlace(row, layer, box);
    return row;
}

/**
 * Where a vis-network picture sits in its node's box: inside its `imagePadding`, and from the top left corner under
 * `shapeProperties.coordinateOrigin` "top-left" (visImage).
 * @param row - the picture's values so far, written in place
 * @param layer - the node's merged layer
 * @param box - the node's width and height, in the file's units
 * @param box.width - its width
 * @param box.height - its height
 */
function visImagePlace(row: Row, layer: VisLayer, box: { width: number; height: number }): void {
    const pad = visImagePadding(layer.imagePadding);
    if (pad !== null && layer.useImageSize !== true) {
        row.imageFit = "none";
        row.imageWidth = Math.max(0, box.width - pad.left - pad.right);
        row.imageHeight = Math.max(0, box.height - pad.top - pad.bottom);
        row.imageOffsetX = (pad.left - pad.right) / 2;
        row.imageOffsetY = (pad.top - pad.bottom) / 2;
    }
    if (layer.coordinateOrigin === "top-left" && row.shape === "none") {
        row.imageOffsetX = box.width / 2 + (typeof row.imageOffsetX === "number" ? row.imageOffsetX : 0);
        row.imageOffsetY = box.height / 2 + (typeof row.imageOffsetY === "number" ? row.imageOffsetY : 0);
    }
}

/**
 * What a vis-network `icon` node draws (vis-network 9.1.9 `Icon`): its `icon.code` in `icon.face` (FontAwesome
 * unless given) at `icon.size` (50) pixels and `icon.weight`, in `icon.color` (#2B7CE9), centered on the node; no
 * code draws nothing.
 * @param layer - the node's merged layer
 * @param site - where a bad color is noted
 * @returns the values, none for an icon with no code
 */
function visIcon(layer: VisLayer, site: CanonSite): Row {
    const code = typeof layer.iconCode === "string" && layer.iconCode !== "" ? layer.iconCode : null;
    if (code === null) {
        return {};
    }
    const size = typeof layer.iconSize === "number" && layer.iconSize >= 0 ? layer.iconSize : 50;
    const color = typeof layer.iconColor === "string" ? canonColor(layer.iconColor, "vis", site) : null;
    const weight = layer.iconWeight;
    const bold = weight === "bold" || weight === "bolder" || (typeof weight === "number" && weight >= 600);
    return {
        glyph: code,
        glyphFont: typeof layer.iconFace === "string" && layer.iconFace !== "" ? layer.iconFace : "FontAwesome",
        glyphSize: size,
        glyphColor: color?.color ?? "#2b7ce9",
        glyphWeight: bold ? "bold" : "normal",
    };
}

/**
 * vis-network's `imagePadding`: one number for every side, or `{ top, right, bottom, left }` (each 0 unless given).
 * @param raw - the option
 * @returns the four sides, or null for no padding
 */
function visImagePadding(raw: unknown): { top: number; right: number; bottom: number; left: number } | null {
    const side = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
    let pad: { top: number; right: number; bottom: number; left: number } | null = null;
    if (typeof raw === "number") {
        pad = { top: side(raw), right: side(raw), bottom: side(raw), left: side(raw) };
    } else if (isJsonObject(raw)) {
        pad = { top: side(raw.top), right: side(raw.right), bottom: side(raw.bottom), left: side(raw.left) };
    }
    return pad === null || pad.top + pad.right + pad.bottom + pad.left === 0 ? null : pad;
}

/**
 * The edge keys of a vis.js options object: a color of its own stops the edge inheriting its node's.
 * @param o - the options
 * @param set - the layer's setter
 */
function visEdgeLayer(o: Record<string, unknown>, set: SetLayer): void {
    const { color } = o;
    if (typeof color === "string") {
        set("edgeColor", color);
        set("inherit", false);
    } else if (isJsonObject(color)) {
        set("edgeColor", color.color);
        set("edgeOpacity", color.opacity);
        const own = color.color !== undefined || color.highlight !== undefined || color.hover !== undefined;
        set("inherit", own ? false : color.inherit);
    }
    set("width", o.width);
    set("value", o.value);
    if (isJsonObject(o.scaling)) {
        set("scalingMin", o.scaling.min);
        set("scalingMax", o.scaling.max);
    }
    set("dashes", o.dashes);
    set("arrows", o.arrows);
    set("background", o.background);
    set("smooth", o.smooth);
    set("selfReference", o.selfReference);
    set("selfReferenceSize", o.selfReferenceSize);
    set("physics", o.physics);
    set("length", o.length);
}

/**
 * The font keys of a vis.js options object: an object, or text like `"14px arial red"`.
 * @param font - the `font` value
 * @param set - the layer's setter
 */
function visFontLayer(font: unknown, set: SetLayer): void {
    if (isJsonObject(font)) {
        set("fontMulti", font.multi);
        set("fontStrokeWidth", font.strokeWidth);
        set("fontStrokeColor", font.strokeColor);
        set("fontBackground", font.background);
        set("fontAlign", font.align);
        set("fontColor", font.color);
        set("fontSize", font.size);
        set("fontFace", font.face);
        set("fontVadjust", font.vadjust);
        const mods = ["bold", "ital", "boldital", "mono"].filter((m) => font[m] !== undefined && font[m] !== null);
        if (mods.length > 0) {
            set("fontMods", Object.fromEntries(mods.map((m) => [m, font[m]])));
        }
    } else if (typeof font === "string") {
        const m = /^\s*(\d+(?:\.\d+)?)(?:px)?\s+(\S+)(?:\s+(\S+))?/.exec(font.slice(0, 256));
        if (m !== null) {
            set("fontSize", Number(m[1]));
            set("fontFace", m[2]);
            set("fontColor", m[3]);
        }
    }
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
    const put: PutRow = (p, v) => {
        if (v !== null) {
            out[p] = v;
        }
    };
    const color: PutColor = (p, opacity, raw) => {
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
        color("borderColor", "borderOpacity", layer.border);
        visNodeValues(layer, sized, put, site);
    } else {
        color("color", "opacity", layer.edgeColor);
        visEdgeValues(layer, put, site);
        visEdgeBackground(layer, put, color);
    }
    if (layer.hidden !== undefined && canonBoolean(layer.hidden, site("visible")) === true) {
        put("visible", false);
    }
    visLabelValues(layer, target, put, color, site);
    return out;
}

/**
 * An edge's background: a band `size` wide under the line, its outline beyond the line. vis-network draws it only
 * under a smooth (bezier) edge (BezierEdgeBase._bezierCurve calls drawBackground; StraightEdge never does).
 * @param layer - the layer
 * @param put - the row's setter
 * @param color - the row's color setter
 */
function visEdgeBackground(layer: VisLayer, put: PutRow, color: PutColor): void {
    // ponytail: `smooth` is read from this layer alone, else vis-network's default (smooth)
    if (!isJsonObject(layer.background)) {
        return;
    }
    const bg = layer.background;
    const straight = layer.smooth === false || (isJsonObject(layer.smooth) && layer.smooth.enabled === false);
    color("outlineColor", "outlineOpacity", bg.color);
    if (bg.enabled !== undefined) {
        const size = typeof bg.size === "number" ? bg.size : 10;
        const width = typeof layer.width === "number" ? layer.width : 1;
        put("outlineWidth", bg.enabled === true && !straight ? Math.max(0, size - width) : 0);
    }
    const band = visBandStyle(bg, false);
    if (band !== null) {
        put("outlineStyle", band);
    }
}

/** Puts a color of a row, and its alpha as an opacity when it has one (visValues). */
type PutColor = (p: string, opacity: string | null, raw: unknown) => void;

/**
 * The label values of a vis.js layer: its text (markup read), wrap width, font, outline, background and, for an edge,
 * where on the line it sits.
 * @param layer - the layer
 * @param target - nodes or edges
 * @param put - the row's setter
 * @param color - the row's color setter
 * @param site - where its values are read
 */
function visLabelValues(
    layer: VisLayer,
    target: StyleTarget,
    put: PutRow,
    color: PutColor,
    site: (property: string) => CanonSite,
): void {
    if (layer.fontSize !== undefined) {
        put("labelSize", canonNumber(layer.fontSize, site("labelSize")));
    }
    if (layer.fontFace !== undefined) {
        put("labelFont", canonText(layer.fontFace, site("labelFont")));
    }
    if (layer.label !== undefined) {
        visLabelText(layer, target, put, site);
    }
    // vis-network wraps a label's lines at `widthConstraint.maximum` (or a number), margins not taken off:
    // Label.adjustSizes subtracts them only under constrainWidth, which nothing sets. LabelSplitter keeps each blank
    // as a word of its own and joins words with a blank (getLongestFit), so a blank between two words counts three.
    if (typeof layer.wrapWidth === "number" && Number.isFinite(layer.wrapWidth) && layer.wrapWidth > 0) {
        put("labelWrapWidth", layer.wrapWidth);
        put("labelWrapSpaceCount", 3);
    }
    if (layer.title !== undefined) {
        put("tooltip", canonText(layer.title, site("tooltip")));
    }
    // a label drawn under `scaling.label.drawThreshold - 1` px on screen is not drawn (Label.draw)
    const threshold = isJsonObject(layer.scalingLabel) ? layer.scalingLabel.drawThreshold : undefined;
    if (typeof threshold === "number" && Number.isFinite(threshold)) {
        put("labelMinScreenSize", Math.max(0, threshold - 1));
    }
    visLabelLook(layer, target, put, color, site);
}

/**
 * The text of a vis.js layer's label, its markup read into runs.
 * @param layer - the layer
 * @param target - nodes or edges
 * @param put - the row's setter
 * @param site - where its values are read
 */
function visLabelText(layer: VisLayer, target: StyleTarget, put: PutRow, site: (property: string) => CanonSite): void {
    // vis-network 9.1.9 draws no edge label whose `font` is text: Edge.drawLabel reads `options.font.align` (undefined
    // on a string) as not horizontal and moves the context to the label point, while the label module, which
    // parsed the text, still draws at the absolute point, so the label lands off the canvas
    const text = target === "edge" && layer.fontText === true ? "" : canonText(layer.label, site("label"));
    const marked = typeof text === "string" ? visMarkup(text, layer.fontMulti) : null;
    put("label", marked?.text ?? text);
    if (marked !== null) {
        const runs = visRuns(marked.runs, layer, site("labelRuns"));
        put("labelRuns", runs);
        if (runs !== null) {
            put("labelRunAlign", visRunAlign(layer, target));
        }
    }
    // after the face: a label all in mono is drawn in the mono face
    for (const [p, v] of Object.entries(VIS_MOD_VALUES[marked?.mod ?? "normal"] ?? {})) {
        put(p, v);
    }
}

/**
 * The look of a vis.js layer's label: its color, background box, letter outline and, for an edge, where on the line
 * it sits.
 * @param layer - the layer
 * @param target - nodes or edges
 * @param put - the row's setter
 * @param color - the row's color setter
 * @param site - where its values are read
 */
function visLabelLook(
    layer: VisLayer,
    target: StyleTarget,
    put: PutRow,
    color: PutColor,
    site: (property: string) => CanonSite,
): void {
    color("labelColor", null, layer.fontColor);
    // font.background "none" (vis-network's default) draws no box
    color("labelBackground", null, layer.fontBackground === "none" ? undefined : layer.fontBackground);
    // the box is the words' own: as wide as the text and one font size tall a line (Label._drawBackground: getSize)
    if (typeof layer.fontBackground === "string" && layer.fontBackground !== "none") {
        put("labelPadding", 0);
        put("labelLineHeight", 1);
    }
    // a stroke with no color of its own is vis-network's default, white (font.strokeColor "#ffffff")
    const stroked = typeof layer.fontStrokeWidth === "number" && layer.fontStrokeWidth > 0;
    color("labelOutlineColor", null, layer.fontStrokeColor ?? (stroked ? "#ffffff" : undefined));
    if (layer.fontStrokeWidth !== undefined) {
        put("labelOutlineWidth", canonNumber(layer.fontStrokeWidth, site("labelOutlineWidth")));
    }
    if (target === "edge" && typeof layer.fontAlign === "string") {
        // vis-network draws an edge label on the line ("horizontal", "middle"), above it ("top") or below it ("bottom")
        put("labelPosition", layer.fontAlign === "top" || layer.fontAlign === "bottom" ? layer.fontAlign : "center");
    } else if (target === "node" && typeof layer.fontAlign === "string") {
        // a node label's lines are centered on one another, or flush left or right in the label's box (Label._drawText:
        // any align but center and right draws flush left); an edge label's lines are always centered
        put("labelTextAlign", { center: "center", right: "right" }[layer.fontAlign] ?? "left");
    }
    // the text is drawn `font.vadjust` lower than its place (Label._drawText: y + block.vadjust)
    if (typeof layer.fontVadjust === "number" && Number.isFinite(layer.fontVadjust) && layer.fontVadjust !== 0) {
        put("labelOffsetY", layer.fontVadjust);
    }
}

/** The label values of a label whose every word has one vis.js font modifier; vis-network's mono face is monospace. */
const VIS_MOD_VALUES: Readonly<Record<string, Row>> = {
    bold: { labelWeight: "bold" },
    ital: { labelItalic: true },
    boldital: { labelWeight: "bold", labelItalic: true },
    mono: { labelFont: "monospace" },
};

/**
 * Whether vis-network's node `opacity` replaces a color's alpha: a hex color of 3 or 6 digits or an `rgb()` color, and
 * vis-network's own default (overrideOpacity; hexToRGB reads no other text).
 * @param color - the color as the file gives it, or undefined for vis-network's default
 * @returns true when the opacity applies
 */
function visTakesOpacity(color: unknown): boolean {
    if (color === undefined) {
        return true;
    }
    return (
        typeof color === "string" &&
        !color.includes("rgba") &&
        (color.includes("rgb") || /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.trim()))
    );
}

/**
 * The line style of an edge's background band: stroked `size` wide (10 by default) in its own dashes, [5, 5] for true
 * (EdgeBase.drawBackground, setStrokeDashed), with the canvas's line caps.
 * @param bg - the edge's `background`
 * @param round - whether the canvas draws round caps by then (see visStyles' edge loop)
 * @returns the line style, or null for a band with no dashes
 */
function visBandStyle(bg: Readonly<Record<string, unknown>>, round: boolean): string | null {
    if (bg.dashes === undefined || bg.dashes === false) {
        return null;
    }
    return visDashStyle(bg.dashes === true ? [5, 5] : bg.dashes, typeof bg.size === "number" ? bg.size : 10, round);
}

/**
 * vis.js dashes (`dashes`, `shapeProperties.borderDashes`) as the line style they draw at a width, read as a dash
 * array is read anywhere: with round caps each dash a width longer and each gap a width shorter; then gaps under a
 * tenth of the pattern are solid, dashes no longer than 1.5 widths are dotted, dashes of which the longest is twice
 * the shortest dash-dot, others dashed; false is solid.
 * @param dashes - false, or the dash array (dash, gap, dash, gap ...; an odd one repeats)
 * @param width - the line's width
 * @param round - whether the dashes have round caps
 * @returns the line style
 */
function visDashStyle(dashes: unknown, width: number, round: boolean): string {
    if (!Array.isArray(dashes)) {
        return dashes === false ? "solid" : "dashed";
    }
    const lengths = dashes.filter((d): d is number => typeof d === "number" && Number.isFinite(d));
    const pairs = lengths.length % 2 === 1 ? [...lengths, ...lengths] : lengths;
    const grow = round ? width : 0;
    const on = pairs.filter((_d, i) => i % 2 === 0).map((d) => Math.max(0, d) + grow);
    const off = pairs.filter((_d, i) => i % 2 === 1).map((d) => Math.max(0, d - grow));
    const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
    // a gap of exactly a tenth still shows (mappings-bypass edge-default: [5, 5] at width 4)
    if (on.length === 0 || sum(off) < 0.1 * (sum(on) + sum(off))) {
        return "solid";
    }
    if (on.every((d) => d <= 1.5 * Math.max(1, width))) {
        return "dotted";
    }
    return Math.max(...on) >= 2 * Math.min(...on) ? "dash-dot" : "dashed";
}

/**
 * vis.js label markup (`font.multi`): true or "html" reads `<b>`, `<i>` and `<code>` and the entities `&lt;` and
 * `&amp;`; "markdown" or "md" reads `*bold*`, `_ital_` and `` `mono` `` at word edges, with `\` escaping a mark
 * (vis-network 9.1.9 `LabelSplitter.splitHtmlBlocks`, `splitMarkdownBlocks`). The text without its markup, and the
 * one font modifier every word has when they share one.
 * @param text - the label
 * @param multi - `font.multi`
 * @returns the plain text and the shared modifier, or null when the label is not read as markup
 */
function visMarkup(
    text: string,
    multi: unknown,
): { text: string; mod: string | null; runs: { text: string; mod: string }[] } | null {
    const system = VIS_MARKUP_SYSTEM.get(multi);
    if (system === undefined) {
        return null;
    }
    const state: VisMarkState = { bold: false, ital: false, mono: false };
    const runs: { text: string; mod: string }[] = [];
    const source = text.slice(0, 4096);
    let i = 0;
    while (i < source.length) {
        const tagged = visMarkTag(source, i, system, state);
        if (tagged > 0) {
            i += tagged;
            continue;
        }
        const [ch, next] = visMarkChar(source, i, system);
        runs.push({ text: ch, mod: visMarkMod(state) });
        i = next;
    }
    const mods = new Set(runs.filter((r) => /\S/.test(r.text)).map((r) => r.mod));
    const only = mods.size === 1 ? [...mods][0] : null;
    // the characters in runs of one modifier each, as vis-network draws its blocks
    const merged: { text: string; mod: string }[] = [];
    for (const r of runs) {
        const last = merged.at(-1);
        if (last?.mod === r.mod) {
            last.text += r.text;
        } else {
            merged.push({ ...r });
        }
    }
    return { text: runs.map((r) => r.text).join(""), mod: only === "normal" ? null : only, runs: merged };
}

/**
 * vis-network's own options of each font modifier (vis-network 9.1.9 `NodesHandler` defaults, `font.mono`); an option
 * a modifier does not set is the label's own (Label.propagateFonts).
 */
const VIS_MOD_DEFAULTS: Readonly<Record<string, { mod: string; face?: string; size?: number; vadjust?: number }>> = {
    bold: { mod: "bold" },
    ital: { mod: "italic" },
    boldital: { mod: "bold italic" },
    mono: { mod: "", face: "monospace", size: 15, vadjust: 2 },
};

/**
 * vis.js multi-font runs as the neutral `labelRuns`: each run's font as vis-network draws it (its modifier's own
 * `font.bold`, `font.ital`, `font.boldital` or `font.mono` options, an object or text like "16px arial black", over
 * the label's font; mono is 15 px monospace unless given), each field only where it differs from the label's own, and
 * `shift`: how much lower than the label's own words its modifier's `vadjust` draws the run (mono's is 2 unless given;
 * the others' are the label's).
 * @param runs - the runs, each with its modifier
 * @param layer - the element's layer
 * @param site - where a bad color is noted
 * @returns the runs as JSON, or null when every run is drawn in the label's own font
 */
function visRuns(runs: readonly { text: string; mod: string }[], layer: VisLayer, site: CanonSite): string | null {
    const own = {
        face: typeof layer.fontFace === "string" ? layer.fontFace : "arial",
        size: typeof layer.fontSize === "number" ? layer.fontSize : VIS_FONT_SIZE,
        color: typeof layer.fontColor === "string" ? layer.fontColor : null,
        vadjust: typeof layer.fontVadjust === "number" && Number.isFinite(layer.fontVadjust) ? layer.fontVadjust : 0,
    };
    const mods = isJsonObject(layer.fontMods) ? layer.fontMods : {};
    let differs = false;
    const out = runs.map((r) => {
        const run: Record<string, unknown> = { text: r.text };
        const base = VIS_MOD_DEFAULTS[r.mod];
        if (base === undefined) {
            return run;
        }
        const given = visModOptions(mods[r.mod]);
        const modText = typeof given.mod === "string" ? given.mod : base.mod;
        const face = typeof given.face === "string" ? given.face : (base.face ?? own.face);
        const size = typeof given.size === "number" ? given.size : (base.size ?? own.size);
        const vadjust = typeof given.vadjust === "number" ? given.vadjust : (base.vadjust ?? own.vadjust);
        const color = typeof given.color === "string" ? canonColor(given.color, "vis", site)?.color : null;
        if (modText.includes("bold")) {
            run.weight = "bold";
        }
        if (modText.includes("italic")) {
            run.italic = true;
        }
        if (face !== null && face !== own.face) {
            run.font = face;
        }
        if (size !== own.size) {
            run.size = size;
        }
        if (Number.isFinite(vadjust) && vadjust !== own.vadjust) {
            run.shift = vadjust - own.vadjust;
        }
        if (typeof color === "string") {
            run.color = color;
        }
        differs ||= Object.keys(run).length > 1;
        return run;
    });
    return differs ? JSON.stringify(out) : null;
}

/**
 * Where vis-network sets the runs of a label on a line: each block is drawn at the line's place with the label's
 * `textBaseline` (Label._drawText): "hanging" below a node sized by `size` (ShapeBase._drawShape), "middle" inside
 * one sized by its label and on an edge's line, "alphabetic" above an edge (`font.align` top) and "hanging" below it.
 * @param layer - the element's merged layer
 * @param target - nodes or edges
 * @returns the neutral run alignment
 */
function visRunAlign(layer: VisLayer, target: StyleTarget): "baseline" | "hanging" | "middle" {
    if (target === "edge") {
        return (
            ({ top: "baseline", bottom: "hanging" } as Record<string, "baseline" | "hanging">)[
                String(layer.fontAlign)
            ] ?? "middle"
        );
    }
    const shape = typeof layer.shape === "string" ? layer.shape : "ellipse";
    return VIS_SIZED.has(shape) ? "hanging" : "middle";
}

/**
 * How much lower than a neutral `bottom` label vis-network draws the label of a node sized by `size`: it hangs the
 * text's top 4 + size / 2 below the outline, whatever the line count (ShapeBase._drawShape puts the label half its
 * height below the node and Label.calculateLabelSize moves its first line up by that again, then down 4 and half a
 * font size more), where a `bottom` label's words start about 2 + size / 3 below it (a small gap, then the space
 * above the capitals in a line's box). Measured on the vis-network labels sheet, font sizes 6 to 40.
 * @param size - the label's font size
 * @returns the extra distance down
 */
function visBelowGap(size: number): number {
    // ponytail: a fixed fit of the renderer's gap and line box; a neutral "hang the text's top here" anchor would remove it
    return 2 + size / 6;
}

/**
 * How much farther below a node sized by `size` vis-network draws a label in runs than one in its own font alone:
 * half of what its lines are taller (each line as tall as its largest run, Label: line.height) than one font size each
 * (ShapeBase._drawShape centers the label half its height below the node, then draws its first line at the top).
 * @param runs - the label's runs, as `visRuns` writes them
 * @param size - the label's font size
 * @returns the distance, 0 for runs no larger than the label's font
 */
function visRunsDrop(runs: string, size: number): number {
    let parsed: unknown;
    try {
        parsed = JSON.parse(runs);
    } catch {
        return 0;
    }
    if (!Array.isArray(parsed)) {
        return 0;
    }
    const lines: number[] = [size];
    for (const run of parsed as { text?: unknown; size?: unknown }[]) {
        const runSize = typeof run.size === "number" ? run.size : size;
        (typeof run.text === "string" ? run.text : "").split("\n").forEach((piece, i) => {
            if (i > 0) {
                lines.push(size);
            }
            if (piece !== "") {
                lines[lines.length - 1] = Math.max(lines.at(-1) ?? size, runSize);
            }
        });
    }
    return lines.reduce((sum, h) => sum + h - size, 0) / 2;
}

/**
 * A vis.js font modifier's options: an object, or text like "16px arial black" (size, face, color).
 * @param raw - `font.bold`, `font.ital`, `font.boldital` or `font.mono`
 * @returns the options
 */
function visModOptions(raw: unknown): Record<string, unknown> {
    if (isJsonObject(raw)) {
        return raw;
    }
    if (typeof raw === "string") {
        const m = /^\s*(\d+(?:\.\d+)?)(?:px)?\s+(\S+)(?:\s+(\S+))?/.exec(raw.slice(0, 256));
        if (m !== null) {
            return { size: Number(m[1]), face: m[2], ...(m[3] === undefined ? {} : { color: m[3] }) };
        }
    }
    return {};
}

/** vis-network's markup systems by `font.multi`. */
const VIS_MARKUP_SYSTEM: ReadonlyMap<unknown, "html" | "md"> = new Map<unknown, "html" | "md">([
    [true, "html"],
    ["html", "html"],
    ["markdown", "md"],
    ["md", "md"],
]);

/** Which font modifiers are on, part way through a label. */
interface VisMarkState {
    bold: boolean;
    ital: boolean;
    mono: boolean;
}

/** Each system's marks and the modifier each turns on or off. */
const VIS_MARKS: Readonly<Record<"html" | "md", Readonly<Record<string, keyof VisMarkState>>>> = {
    html: { "<b>": "bold", "</b>": "bold", "<i>": "ital", "</i>": "ital", "<code>": "mono", "</code>": "mono" },
    md: { "*": "bold", _: "ital", "`": "mono" },
};

/**
 * Reads a mark at a place in a label, turning its modifier on or off: an html tag opens a modifier that is off and
 * closes one that is on; a markdown mark opens at the start of a word and closes a modifier that is on.
 * @param source - the label
 * @param i - the place
 * @param system - the markup system
 * @param state - the modifiers on, changed in place
 * @returns how many characters the mark takes, 0 for no mark
 */
function visMarkTag(source: string, i: number, system: "html" | "md", state: VisMarkState): number {
    const marks = VIS_MARKS[system];
    const tag = Object.keys(marks).find((m) => source.startsWith(m, i));
    if (tag === undefined) {
        return 0;
    }
    const key = marks[tag];
    const toggles =
        system === "html" ? state[key] === tag.startsWith("</") : state[key] || i === 0 || /\s/.test(source[i - 1]);
    if (!toggles) {
        return 0;
    }
    state[key] = !state[key];
    return tag.length;
}

/**
 * The character at a place in a label, an html entity (`&lt;`, `&amp;`) or a markdown escape read as the character it
 * stands for.
 * @param source - the label
 * @param i - the place
 * @param system - the markup system
 * @returns the character and the place after it
 */
function visMarkChar(source: string, i: number, system: "html" | "md"): [string, number] {
    if (system === "md") {
        return source[i] === "\\" && i + 1 < source.length ? [source[i + 1], i + 2] : [source[i], i + 1];
    }
    const entity = [
        ["&lt;", "<"],
        ["&amp;", "&"],
    ].find(([e]) => source.startsWith(e, i));
    return entity === undefined ? [source[i], i + 1] : [entity[1], i + entity[0].length];
}

/**
 * The font modifier the modifiers on make: mono over the others, bold and italic together boldital.
 * @param state - the modifiers on
 * @returns the modifier
 */
function visMarkMod(state: VisMarkState): string {
    if (state.mono) {
        return "mono";
    }
    if (state.bold) {
        return state.ital ? "boldital" : "bold";
    }
    return state.ital ? "ital" : "normal";
}

/** Sets a value of a row when it is not null. */
type PutRow = (p: string, v: StyleValue | null) => void;

/**
 * The node values of a vis.js layer besides its colors.
 * @param layer - the layer
 * @param sized - whether the shape takes its size from `size`
 * @param put - the row's setter
 * @param site - where its values are read
 */
function visNodeValues(layer: VisLayer, sized: boolean, put: PutRow, site: (property: string) => CanonSite): void {
    if (layer.shape !== undefined) {
        put("shape", canonEnum("shape", layer.shape, "vis", site("shape")));
        // vis-network draws a label inside the shapes sized by their label and below the shapes sized by `size`
        if (typeof layer.shape === "string") {
            put("labelPosition", VIS_SIZED.has(layer.shape) ? "bottom" : "center");
        }
    }
    if (sized && layer.size !== undefined) {
        // vis-network draws `size` as a radius: a dot of size 25 is 50 across
        const v = canonNumber(layer.size, site("width"));
        put("width", v === null ? null : 2 * v);
        put("height", v === null ? null : 2 * v);
    }
    if (layer.borderWidth !== undefined) {
        put("borderWidth", canonNumber(layer.borderWidth, site("borderWidth")));
    }
    visNodeOpacityAndDashes(layer, put, site);
}

/**
 * A vis.js node's opacity and border dashes (visNodeValues).
 * @param layer - the layer
 * @param put - the row's setter
 * @param site - where its values are read
 */
function visNodeOpacityAndDashes(layer: VisLayer, put: PutRow, site: (property: string) => CanonSite): void {
    if (layer.opacity !== undefined) {
        // vis-network's node opacity replaces the alpha of its border color and its background color alike, but only of
        // a hex or rgb() color: overrideOpacity leaves rgba() and any other text (a name) as it is (Node.getFormattingValues)
        const opacity = canonOpacity(layer.opacity, "vis", site("opacity"));
        put("opacity", visTakesOpacity(layer.fill) ? opacity : null);
        put("borderOpacity", visTakesOpacity(layer.border) ? opacity : null);
    }
    if (layer.borderDashes !== undefined) {
        // vis-network's default border dashes are [5, 15]
        const width = typeof layer.borderWidth === "number" ? layer.borderWidth : 1;
        put("borderStyle", visDashStyle(layer.borderDashes === true ? [5, 15] : layer.borderDashes, width, false));
    }
}

/**
 * The edge values of a vis.js layer besides its color.
 * @param layer - the layer
 * @param put - the row's setter
 * @param site - where its values are read
 */
function visEdgeValues(layer: VisLayer, put: PutRow, site: (property: string) => CanonSite): void {
    if (layer.edgeOpacity !== undefined) {
        put("opacity", canonOpacity(layer.edgeOpacity, "vis", site("opacity")));
    }
    if (layer.width !== undefined) {
        put("width", canonNumber(layer.width, site("width")));
    }
    if (layer.dashes !== undefined) {
        // vis-network's default dashes are [5, 5]
        const width = typeof layer.width === "number" ? layer.width : 1;
        const dashes = layer.dashes === true ? [5, 5] : layer.dashes;
        // vis-network draws an edge with round caps (EdgeBase: lineCap "round"), each dash a width longer
        put("lineStyle", layer.dashes === "false" ? "solid" : visDashStyle(dashes, width, true));
    }
    if (layer.arrows !== undefined) {
        const [to, from, middle] = visArrows(layer.arrows, site);
        put("targetArrow", to);
        put("sourceArrow", from);
        put("midTargetArrow", middle);
        // One neutral size for every end: the target's scaleFactor, else the source's, else the middle's.
        const scaled = (name: string): unknown => {
            const a = isJsonObject(layer.arrows) ? layer.arrows[name] : undefined;
            return isJsonObject(a) ? a.scaleFactor : undefined;
        };
        const scale = scaled("to") ?? scaled("from") ?? scaled("middle");
        if (scale !== undefined) {
            put("arrowSize", canonNumber(scale, site("arrowSize")));
        }
        visArrowImages(layer.arrows, put, site);
    }
}

/**
 * The pictures of vis.js `image` arrows (`{ to: { type: "image", src, imageWidth, imageHeight } }`), each with the
 * size it is drawn at where the file gives one (vis-network 9.1.9 `Image.draw`: `imageWidth` across the line,
 * `imageHeight` along it, else the picture's own).
 * @param arrows - the `arrows` value
 * @param put - the row's setter
 * @param site - where its values are read
 */
function visArrowImages(arrows: unknown, put: PutRow, site: (property: string) => CanonSite): void {
    if (!isJsonObject(arrows)) {
        return;
    }
    for (const [name, property] of [
        ["to", "targetArrow"],
        ["from", "sourceArrow"],
        ["middle", "midTargetArrow"],
    ] as const) {
        const a = arrows[name];
        if (!isJsonObject(a) || a.type !== "image" || typeof a.src !== "string" || a.src === "") {
            continue;
        }
        put(`${property}Image`, a.src);
        if (a.imageWidth !== undefined) {
            put(`${property}ImageWidth`, canonNumber(a.imageWidth, site(`${property}ImageWidth`)));
        }
        if (a.imageHeight !== undefined) {
            put(`${property}ImageHeight`, canonNumber(a.imageHeight, site(`${property}ImageHeight`)));
        }
    }
}

/**
 * vis.js `arrows` as the target, source and middle arrows: `"to"`, `"to, from"`, `"middle"`, or
 * `{ to: true | { enabled, type } }`. The middle one points toward the target.
 * @param arrows - the value
 * @param site - where it is read
 * @returns the target arrow, the source arrow and the middle arrow
 */
function visArrows(
    arrows: unknown,
    site: (property: string) => CanonSite,
): [string | null, string | null, string | null] {
    // a middle arrow the file does not mention is no rule at all, so a file that names only its ends carries none
    const end = (name: string, property: string, absent: "none" | null = "none"): string | null => {
        if (typeof arrows === "string") {
            return new RegExp(String.raw`\b${name}\b`).test(arrows.slice(0, 256)) ? "triangle" : absent;
        }
        if (!isJsonObject(arrows)) {
            return null;
        }
        const a = arrows[name];
        if (a === true) {
            return "triangle";
        }
        if (a === undefined) {
            return absent;
        }
        if (!isJsonObject(a) || a.enabled === false) {
            return "none";
        }
        return canonEnum("arrow", a.type ?? "arrow", "vis", site(property));
    };
    return [end("to", "targetArrow"), end("from", "sourceArrow"), end("middle", "midTargetArrow", null)];
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
    const { groupLayers, paletteRows } = visGroupLayers(n, groupOf, visGroupDefs(src, options));
    context.budget.spend("node", n);

    // what vis-network draws per node: its own keys over its group over options.nodes
    const node = valuesOf(n);
    const shapes: string[] = [];
    const rawRecords = elementRaw(snapshot, "node");
    const range = visNodeValueRange(n, groupOf, rawRecords, groupLayers, nodeDefaults);
    const ownGroup = visOwnGroup(groupLayers, visGroupDefs(src, options));
    for (let i = 0; i < n; i++) {
        const g = groupOf(i);
        const raw = rawRecords(i);
        const own = visLayer(raw, "node");
        const group = g === null ? {} : ownGroup(g, raw);
        const shape = visShapeOf(own) ?? visShapeOf(group) ?? visShapeOf(nodeDefaults) ?? "ellipse";
        shapes.push(shape);
        const site = (property: string): CanonSite => ({
            notes,
            target: "node",
            property,
            element: i,
            budget: context.budget,
        });
        const merged = visMergedNode(nodeDefaults, group, own, g !== null && raw.color !== undefined);
        for (const [p, v] of Object.entries(visNodeRow(merged, shape, range, site))) {
            node.put(p, i, v);
        }
    }
    const declaredNode = visValues(nodeDefaults, "node", ruleSite("node"), true);
    if (Object.keys(declaredNode).length > 0) {
        nodeRules.push(rule("node.vis.defaults", "node", "defaults", "declared", { all: true }, declaredNode));
    }
    visGroupRules(n, groupOf, groupLayers, paletteRows, ruleSite("node"), nodeRules, nodeColumns);

    const toolNode = toolDefaults("vis-network")?.node;
    const borderOf = (i: number): StyleValue =>
        node.values.borderColor?.[i] ?? (toolNode?.borderColor?.value as StyleValue | undefined) ?? "#2b7ce9";
    const geometry = visGeometry(snapshot, node.values, shapes);
    const support = visSupport(options.physics, options.layout);
    const edges = visLayer(options.edges, "edge");
    const edge = visEdges(snapshot, edges, borderOf, { ...geometry, support }, notes, context);
    const values = { node: node.values, edge: edge.values };
    exactFromBlock(snapshot, src.block, values, visWritten(snapshot, values.edge));
    return {
        canonical: true,
        dialect: "vis",
        tool: "vis-network",
        opacityInColor: true,
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
 * vis.js: a layer's own shape.
 * @param layer - the layer
 * @returns its `shape`, or null when it gives none
 */
function visShapeOf(layer: VisLayer): string | null {
    return typeof layer.shape === "string" ? layer.shape : null;
}

/**
 * vis.js: the smallest and largest `value` of the nodes, each its own over its group's over `options.nodes`.
 * @param n - the node count
 * @param groupOf - each node's group
 * @param rawRecords - each node's own keys
 * @param groupLayers - each group's layer (visGroupLayers)
 * @param nodeDefaults - `options.nodes`
 * @returns the range, or null when no node has a value
 */
function visNodeValueRange(
    n: number,
    groupOf: (i: number) => string | null,
    rawRecords: (i: number) => Record<string, unknown>,
    groupLayers: ReadonlyMap<string, VisLayer>,
    nodeDefaults: VisLayer,
): readonly [number, number] | null {
    return visValueRange(n, (i) => {
        const g = groupOf(i);
        const own = visLayer(rawRecords(i), "node").value;
        const value = own ?? (g === null ? undefined : groupLayers.get(g)?.value) ?? nodeDefaults.value;
        return typeof value === "number" && Number.isFinite(value) ? value : null;
    });
}

/**
 * vis.js: one node's layer, its own keys over its group's over `options.nodes`.
 * @param nodeDefaults - `options.nodes`
 * @param group - its group's layer
 * @param own - its own layer
 * @param ownColorInGroup - whether it is in a group and gives a color of its own
 * @returns the merged layer
 */
function visMergedNode(nodeDefaults: VisLayer, group: VisLayer, own: VisLayer, ownColorInGroup: boolean): VisLayer {
    const merged: VisLayer = { ...nodeDefaults, ...group, ...own };
    if (ownColorInGroup) {
        // a color of the node's own fills its gaps from options.nodes and vis-network's defaults, never its group's
        merged.fill ??= VIS_NODE_FILL;
        merged.border ??= VIS_NODE_BORDER;
    }
    return merged;
}

/**
 * vis.js: the values one node draws, from its merged layer: its colors and label, then its shape's own.
 * @param merged - the node's merged layer
 * @param shape - its vis-network shape
 * @param range - the smallest and largest `value` of the graph's nodes (visValueRange)
 * @param site - where its values are read
 * @returns the values
 */
function visNodeRow(
    merged: VisLayer,
    shape: string,
    range: readonly [number, number] | null,
    site: (property: string) => CanonSite,
): Row {
    const sized = VIS_SIZED.has(shape);
    const row = visValues(merged, "node", site, sized);
    const shaped = sized
        ? visSizedShape(merged, shape, visRadius(merged, range, site), site)
        : visFitShape(merged, shape);
    if (sized && merged.label !== undefined) {
        const size =
            visLabelScaled(merged, range) ?? (typeof merged.fontSize === "number" ? merged.fontSize : VIS_FONT_SIZE);
        // a label in runs below the node hangs lower by half of what its larger runs make its lines taller
        const drop = typeof row.labelRuns === "string" ? visRunsDrop(row.labelRuns, size) : 0;
        const below = typeof row.labelOffsetY === "number" ? row.labelOffsetY : 0;
        row.labelOffsetY = below + drop + visBelowGap(size);
    }
    // the shape's own label place, then font.vadjust below it
    for (const p of ["labelOffsetX", "labelOffsetY"] as const) {
        const [a, b] = [row[p], shaped[p]];
        if (typeof a === "number" && typeof b === "number") {
            shaped[p] = a + b;
        }
    }
    Object.assign(row, shaped);
    const labelSize = visLabelScaled(merged, range);
    if (labelSize !== null) {
        row.labelSize = labelSize;
    }
    return row;
}

/**
 * vis.js: one rule per node group with values, over a column marking the group's nodes; a group the file does not
 * define is the tool's palette.
 * @param n - the node count
 * @param groupOf - each node's group
 * @param groupLayers - each group's layer (visGroupLayers)
 * @param paletteRows - the palette values of the groups the file does not define
 * @param site - where a group's values are read
 * @param rules - the node rules, appended to
 * @param columns - the node columns, written to
 */
function visGroupRules(
    n: number,
    groupOf: (i: number) => string | null,
    groupLayers: ReadonlyMap<string, VisLayer>,
    paletteRows: ReadonlyMap<string, Row>,
    site: (property: string) => CanonSite,
    rules: StyleRule[],
    columns: Map<string, StyleColumn>,
): void {
    let k = 0;
    for (const [g, layer] of groupLayers) {
        const set = paletteRows.get(g) ?? visValues(layer, "node", site, true);
        if (Object.keys(set).length === 0) {
            continue;
        }
        const key = `group.${String(k)}`;
        columns.set(
            key,
            Array.from({ length: n }, (_v, i) => (groupOf(i) === g ? true : null)),
        );
        const origin = paletteRows.has(g) ? "tool" : "declared";
        const r = rule(`node.vis.group.${String(k++)}`, "node", "group", origin, { has: { style: key } }, set);
        rules.push({ ...r, facts: { names: [[key, g]] } });
    }
}

/**
 * vis.js: what a node of a shape sized by `size` draws besides its colors: its box from its radius, its picture or
 * glyph, and triangleDown turned over.
 * @param merged - the node's merged layer
 * @param shape - its vis-network shape
 * @param radius - its radius (visRadius)
 * @param site - where its values are read
 * @returns the values
 */
function visSizedShape(merged: VisLayer, shape: string, radius: number, site: (property: string) => CanonSite): Row {
    // vis-network's hexagon is regular, its corners `size` from its center on the left and right (drawHexagon): it is
    // 2 * size wide and sqrt(3) * size tall, where the neutral hexagon fills its box
    const row: Row = { width: 2 * radius, height: 2 * radius };
    if (shape === "hexagon") {
        // its label still hangs below the 2 * size square (ShapeBase._drawShape: y + 0.5 * height + half the label)
        row.height = Math.sqrt(3) * radius;
        row.labelOffsetY = ((2 - Math.sqrt(3)) * radius) / 2;
    }
    Object.assign(row, visImage(merged, shape, { width: 2 * radius, height: 2 * radius }));
    if (shape === "icon") {
        // an icon node is its glyph alone: vis-network draws no body, no fill and no border for it (Icon.draw)
        Object.assign(row, { shape: "none" }, visIcon(merged, site("glyphColor")));
    }
    // vis-network's triangleDown: its triangle turned over, a corner down
    if (shape === "triangleDown") {
        row.shape = "polygon";
        row.shapePoints = "-1,1 0,-1 1,1";
    }
    return row;
}

/**
 * vis.js: what a node of a shape sized by its label draws besides its colors: its growth round its label, nothing at
 * all with a margin of 0, and its label at the top or bottom under `heightConstraint.valign`.
 * @param merged - the node's merged layer
 * @param shape - its vis-network shape
 * @returns the values
 */
function visFitShape(merged: VisLayer, shape: string): Row {
    const row = visLabelFit(merged, shape);
    // a margin of 0 leaves vis-network's margins undefined (`_setMargins` tests `if (options.margin)`), so the node's
    // size is NaN and neither it nor its label is drawn
    if (merged.margin === 0 && (shape === "box" || shape === "circle" || shape === "database")) {
        row.visible = false;
    }
    // heightConstraint.valign moves the label to the top or the bottom of a node taller than it (Label._drawText)
    if (merged.valign === "top" || merged.valign === "bottom") {
        row.labelPosition = `inside-${merged.valign}`;
    } else if (shape === "database") {
        // a database draws its label at its top, its top margin down (Database.draw: this.top + margin.top), not in
        // the middle of the square it grows to
        const m = merged.margin;
        const top = isJsonObject(m) ? m.top : m;
        row.labelPosition = "inside-top";
        row.labelOffsetY = typeof top === "number" && Number.isFinite(top) && top >= 0 ? top : VIS_MARGIN;
    }
    // a box's corners are rounded at `shapeProperties.borderRadius`, at most half its shorter side (drawRoundRect)
    if (shape === "box" && typeof merged.borderRadius === "number" && Number.isFinite(merged.borderRadius)) {
        row.cornerRadius = Math.max(0, merged.borderRadius);
    }
    return row;
}

/**
 * vis.js: how a node of a shape sized by its label grows to hold it (each shape's `resize`): its label's box, at
 * least `widthConstraint.minimum` by `heightConstraint.minimum`, plus the `margin` on each side is the node's width
 * and height; a circle and a database stay as wide as they are tall; an ellipse is the box's height taller and
 * wider instead of the margin (`width + height` by twice the height).
 * @param layer - the node's merged layer
 * @param shape - its vis-network shape
 * @returns the values, none for a shape not sized by its label
 */
function visLabelFit(layer: VisLayer, shape: string): Row {
    const fit = VIS_LABEL_FIT.get(shape);
    if (fit === undefined) {
        return {};
    }
    const length = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
    const fontSize = length(layer.fontSize) ?? VIS_FONT_SIZE;
    const lines = typeof layer.label === "string" ? Math.max(1, layer.label.split("\n").length) : 1;
    const minW = length(layer.widthMin) ?? 0;
    const minH = length(layer.heightMin) ?? 0;
    let padX: number;
    let padY: number;
    let offset: Row = {};
    if (fit.ellipse) {
        padX = Math.max(lines * fontSize, minH) / 2;
        padY = padX;
    } else {
        ({ padX, padY, offset } = visMarginPads(layer.margin, fit.square));
    }
    // a node with no label text is sized as if its label were 14 x 14 (NodeBase.getDimensionsFromLabel)
    const empty = typeof layer.label !== "string" || layer.label === "";
    const [boxW, boxH] = empty ? [Math.max(minW, 14), Math.max(minH, 14)] : [minW, minH];
    if (empty && fit.ellipse) {
        padX = boxH / 2;
        padY = padX;
    }
    const row: Row = {
        ...offset,
        labelFit: "bounds",
        labelPaddingX: padX,
        labelPaddingY: padY,
        width: boxW > 0 ? boxW + 2 * padX : 0,
        height: boxH > 0 ? boxH + 2 * padY : 0,
    };
    if (fit.square) {
        row.labelFitSquare = true;
    }
    return row;
}

/**
 * vis.js: the padding a node's `margin` puts round its label (visLabelFit). A box or text node draws its label its
 * left and top margins in from its corner (Box.draw, Text.draw), off center by half the difference of opposite
 * margins.
 * @param m - the `margin`: one number for every side, or `{ top, right, bottom, left }`
 * @param square - whether the shape stays as wide as it is tall
 * @returns the horizontal and vertical padding, and the label's offset
 */
function visMarginPads(m: unknown, square: boolean): { padX: number; padY: number; offset: Row } {
    const length = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
    const side = (key: string): number => (isJsonObject(m) ? length(m[key]) : length(m)) ?? VIS_MARGIN;
    const offset: Row = {};
    if (!square && side("left") !== side("right")) {
        offset.labelOffsetX = (side("left") - side("right")) / 2;
    }
    if (!square && side("top") !== side("bottom")) {
        offset.labelOffsetY = (side("top") - side("bottom")) / 2;
    }
    return { padX: (side("left") + side("right")) / 2, padY: (side("top") + side("bottom")) / 2, offset };
}

/**
 * vis.js `scaling.label`: with `enabled`, the font size of an element with a `value`, mapped as its size is from the
 * value range onto `scaling.label.min` .. `max` (14 .. 30) (vis-network 9.1.9 `Node.setValueRange`, `Edge.setValueRange`).
 * @param layer - the element's merged layer
 * @param range - the value range, or null
 * @returns the font size, or null when the label is not scaled
 */
function visLabelScaled(layer: VisLayer, range: readonly [number, number] | null): number | null {
    const value = finiteValue(layer.value);
    const label = layer.scalingLabel;
    if (value === null || range === null || !isJsonObject(label) || label.enabled !== true) {
        return null;
    }
    const min = typeof label.min === "number" ? label.min : 14;
    const max = typeof label.max === "number" ? label.max : 30;
    return visScaled(value, range, min, max);
}

/** vis-network's default node size, a radius (`size: 25`, vis-network.esm.js NodesHandler defaults). */
const VIS_SIZE = 25;
/** vis-network's default `scaling.min` and `scaling.max`, the radii `value` is mapped onto. */
const VIS_SCALING: readonly [number, number] = [10, 30];

/**
 * vis.js: the smallest and largest `value` of the nodes that have one, as vis-network's
 * `_updateValueRange` takes them; null when no node has one.
 * @param n - the node count
 * @param valueOf - each node's value
 * @returns the range
 */
function visValueRange(n: number, valueOf: (i: number) => number | null): readonly [number, number] | null {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < n; i++) {
        const v = valueOf(i);
        if (v !== null) {
            min = Math.min(min, v);
            max = Math.max(max, v);
        }
    }
    return min <= max ? [min, max] : null;
}

/**
 * A `value` that is a finite number, else null.
 * @param value - the value
 * @returns the number, or null
 */
const finiteValue = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * vis.js: `value` mapped linearly from the value range onto `min` .. `max`, the middle when every value is the same
 * (vis-network's default `customScalingFunction`).
 * @param value - the element's value
 * @param range - the value range
 * @param min - `scaling.min`
 * @param max - `scaling.max`
 * @returns the scaled value
 */
function visScaled(value: number, range: readonly [number, number], min: number, max: number): number {
    const [lo, hi] = range;
    const scale = hi === lo ? 0.5 : Math.max(0, (value - lo) / (hi - lo));
    return min + scale * (max - min);
}

/** vis-network's default edge `scaling.min` and `scaling.max`, the widths `value` is mapped onto. */
const VIS_EDGE_SCALING: readonly [number, number] = [1, 15];

/**
 * vis.js: the width vis-network draws an edge at once any edge has a `value`. Its `_updateValueRange` then sets every
 * edge's width: one with a value to the value mapped onto `scaling`, one without to the width it was created with,
 * which is `options.edges.width` -- an edge's own `width` is dropped (`Edge.baseWidth` is read before the edge's own
 * options are applied, and nothing updates it).
 * @param layer - the edge's merged layer
 * @param defaults - `options.edges`
 * @param range - the value range over the edges, or null when no edge has a value
 * @param site - where its values are read
 * @returns the width, or nothing when no edge has a value (the edge's own width holds)
 */
function visEdgeWidth(
    layer: VisLayer,
    defaults: VisLayer,
    range: readonly [number, number] | null,
    site: (property: string) => CanonSite,
): { width?: number } {
    if (range === null) {
        return {};
    }
    const value = finiteValue(layer.value);
    if (value !== null) {
        const min = typeof layer.scalingMin === "number" ? layer.scalingMin : VIS_EDGE_SCALING[0];
        const max = typeof layer.scalingMax === "number" ? layer.scalingMax : VIS_EDGE_SCALING[1];
        return { width: visScaled(value, range, min, max) };
    }
    return { width: (defaults.width === undefined ? null : canonNumber(defaults.width, site("width"))) ?? 1 };
}

/**
 * vis.js: the radius vis-network draws a node of a sized shape at: its `value` mapped linearly from the value range
 * onto `scaling.min` .. `scaling.max` (the middle when every value is the same), else its `size`, else 25
 * (vis-network's `setValueRange` and `customScalingFunction`).
 * @param layer - the node's merged layer
 * @param range - the value range over the nodes
 * @param site - where its values are read
 * @returns the radius
 */
function visRadius(
    layer: VisLayer,
    range: readonly [number, number] | null,
    site: (property: string) => CanonSite,
): number {
    const value = finiteValue(layer.value);
    if (value !== null && range !== null) {
        const min = typeof layer.scalingMin === "number" ? layer.scalingMin : VIS_SCALING[0];
        const max = typeof layer.scalingMax === "number" ? layer.scalingMax : VIS_SCALING[1];
        return visScaled(value, range, min, max);
    }
    const size = layer.size === undefined ? null : canonNumber(layer.size, site("width"));
    return size ?? VIS_SIZE;
}

/**
 * vis.js: the group definitions, from `options.groups` or a top-level `groups`.
 * @param src - what the import kept
 * @param options - the file's `options`
 * @returns the definitions by group name
 */
function visGroupDefs(src: JsonStyleSource, options: Record<string, unknown>): Record<string, unknown> {
    if (isJsonObject(options.groups)) {
        return options.groups;
    }
    return isJsonObject(src.groups) ? src.groups : {};
}

/**
 * vis.js: each group the nodes name, in the order first named, with its layer; a group the file does not define gets
 * vis-network's palette.
 * @param n - the node count
 * @param groupOf - each node's group
 * @param groupDefs - the group definitions
 * @returns the layers by group, and the palette values of the groups that took them
 */
function visGroupLayers(
    n: number,
    groupOf: (i: number) => string | null,
    groupDefs: Record<string, unknown>,
): { groupLayers: Map<string, VisLayer>; paletteRows: Map<string, Row> } {
    const groupLayers = new Map<string, VisLayer>();
    const paletteRows = new Map<string, Row>();
    let palette = 0;
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
    return { groupLayers, paletteRows };
}

/**
 * vis.js: the group layer one node takes. vis-network merges a group's options into a node only for the keys the node
 * does not set itself, each key whole (vis-network 9.1.9 `Node.updateGroupOptions`: every option of the node's own is
 * skipped, `font` always), so a node with a `color` of its own takes none of its group's colors, not even a border it
 * leaves out.
 * @param groupLayers - each group's whole layer (visGroupLayers)
 * @param groupDefs - the group definitions the file gives
 * @returns the layer of a group for a node of the given own keys
 */
function visOwnGroup(
    groupLayers: ReadonlyMap<string, VisLayer>,
    groupDefs: Record<string, unknown>,
): (g: string, own: Record<string, unknown>) => VisLayer {
    const cache = new Map<string, VisLayer>();
    return (g, own) => {
        const whole = groupLayers.get(g) ?? {};
        const def = Object.hasOwn(groupDefs, g) ? groupDefs[g] : null;
        // a group the file does not define is vis-network's palette color, which a color of the node's own replaces
        const skip = Object.keys(own).filter(
            (k) => k !== "font" && (isJsonObject(def) ? Object.hasOwn(def, k) : k === "color"),
        );
        if (skip.length === 0) {
            return whole;
        }
        const key = `${g}\u0000${skip.join("\u0000")}`;
        let layer = cache.get(key);
        if (layer === undefined) {
            layer = isJsonObject(def)
                ? visLayer(Object.fromEntries(Object.entries(def).filter(([k]) => !skip.includes(k))), "node")
                : {};
            cache.set(key, layer);
        }
        return layer;
    };
}

/**
 * vis.js edges: their own keys over `options.edges`; an edge without a color of its own takes its source node's
 * border color (its target's under `inherit: "to"`).
 * @param snapshot - the graph
 * @param edgeDefaults - `options.edges`
 * @param borderOf - each node's drawn border color
 * @param geometry - the nodes' positions and boxes, for the edges' routes
 * @param notes - where problems are noted
 * @param context - the work budget
 * @returns the edge values, rules and style columns
 */
function visEdges(
    snapshot: GraphSnapshot,
    edgeDefaults: VisLayer,
    borderOf: (node: number) => StyleValue,
    geometry: VisGeometry,
    notes: StyleNotes,
    context: StyleReadContext,
): { values: Values; rules: StyleRule[]; columns: Map<string, StyleColumn> } {
    const m = snapshot.edgeCount;
    const edge = valuesOf(m);
    const edgeRecords = elementRecords(snapshot, "edge");
    const inherited: (StyleValue | null)[] = new Array<StyleValue | null>(m).fill(null);
    let inheriting = 0;
    const range = visValueRange(m, (e) => finiteValue({ ...edgeDefaults, ...edgeRecords(e) }.value));
    // vis-network sets round caps to draw a dashed line (EdgeBase._drawDashedLine) and never sets them back, so every
    // band drawn with or after a dashed edge, in the file's order, has round caps, which close gaps narrower than the
    // band
    let roundCaps = false;
    for (let e = 0; e < m; e++) {
        const own = edgeRecords(e);
        // an array of `options.edges.dashes` reaches the edge through bridgeObject as a plain object, no longer an
        // array, so vis-network draws its default [5, 5] (EdgeBase.setStrokeDashed)
        const bridged = own.dashes === undefined && Array.isArray(edgeDefaults.dashes) ? { dashes: true } : {};
        const merged = { ...edgeDefaults, ...own, ...bridged };
        const site = (property: string): CanonSite => ({
            notes,
            target: "edge",
            property,
            element: e,
            budget: context.budget,
        });
        const [s, t] = [snapshot.edgeSource(e), snapshot.edgeTarget(e)];
        const vals: Row = {
            ...visValues(merged, "edge", site, true),
            ...visEdgeWidth(merged, edgeDefaults, range, site),
            ...visRoute(edgeDefaults, own, s, t, geometry),
            ...visEdgeLabel(merged, range, geometry.at(s), geometry.at(t)),
        };
        // a dashed edge sets them before it draws its own band (BezierEdgeBase._bezierCurve draws the band first)
        roundCaps ||= merged.hidden !== true && ![undefined, false, "false"].includes(merged.dashes as never);
        const band = roundCaps && isJsonObject(merged.background) ? visBandStyle(merged.background, true) : null;
        if (band !== null) {
            vals.outlineStyle = band;
        }
        const from = visEdgeInherit(vals, own.inherit ?? edgeDefaults.inherit ?? "from", borderOf, s, t);
        for (const [p, v] of Object.entries(vals)) {
            edge.put(p, e, v);
        }
        if (from !== null) {
            inherited[e] = from;
            inheriting++;
        }
    }
    context.budget.spend("edge", m);
    const { rules, columns } = visEdgeRules(edgeDefaults, notes, inherited, inheriting);
    return { values: edge.values, rules, columns };
}

/**
 * vis.js: an edge's `inherit`, applied to its values: an edge that inherits draws its node's border color, not a
 * color `options.edges` gives (that only stops inheriting there), and under "both" a gradient between its nodes'; one
 * that does not inherit and has no color draws vis-network's default.
 * @param vals - the edge's values, written in place
 * @param inherit - its `inherit`
 * @param borderOf - each node's drawn border color
 * @param s - its source node
 * @param t - its target node
 * @returns the color it inherits, or null for none
 */
function visEdgeInherit(
    vals: Row,
    inherit: unknown,
    borderOf: (node: number) => StyleValue,
    s: number,
    t: number,
): StyleValue | null {
    const inherits = inherit !== false && inherit !== "false";
    if (inherits) {
        delete vals.color;
    }
    if (inherit === "both") {
        // vis-network: a linear gradient from the source node's border color to the target's
        vals.gradientKind = "linear";
        vals.gradientColors = `${String(borderOf(s))} ${String(borderOf(t))}`;
    }
    if (!inherits) {
        if (vals.color === undefined) {
            vals.color = VIS_EDGE_COLOR;
        }
        return null;
    }
    return borderOf(inherit === "to" ? t : s);
}

/**
 * vis.js: the edge rules: `options.edges` as declared, and the colors edges inherit from their nodes.
 * @param edgeDefaults - `options.edges`
 * @param notes - where problems are noted
 * @param inherited - each edge's inherited color, or null
 * @param inheriting - how many edges inherit one
 * @returns the rules and their style columns
 */
function visEdgeRules(
    edgeDefaults: VisLayer,
    notes: StyleNotes,
    inherited: (StyleValue | null)[],
    inheriting: number,
): { rules: StyleRule[]; columns: Map<string, StyleColumn> } {
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
    return { rules: edgeRules, columns: edgeColumns };
}

/** What a vis.js edge's route is drawn from: its nodes' positions and boxes. */
interface VisGeometry {
    /** A node's position as vis-network draws it (`parseInt` of `x` and `y`, y down), or null. */
    readonly at: (i: number) => readonly [number, number] | null;
    /** A node's half width, half height, border width and vis-network shape, or null for a node sized by its label. */
    readonly box: (i: number) => VisBox | null;
    /** The forces vis-network's physics moves a dynamic edge's support node by, or null where nothing moves it. */
    readonly support?: Row | null;
}

/** A node's half width, half height, border width and vis-network shape. */
type VisBox = readonly [number, number, number, string];

/**
 * vis.js: the positions and boxes of the nodes, for the routes of their edges.
 * @param snapshot - the graph
 * @param nodeValues - the node values read so far (sizes and border widths)
 * @param shapes - each node's vis-network shape
 * @returns the geometry
 */
function visGeometry(snapshot: GraphSnapshot, nodeValues: Values, shapes: readonly string[]): VisGeometry {
    const whole = (v: unknown): number => {
        if (typeof v === "string") {
            return Number.parseInt(v, 10);
        }
        return typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : Number.NaN;
    };
    const [xs, ys] = [cells(snapshot, "node", "x"), cells(snapshot, "node", "y")];
    const num = (v: StyleValue | null | undefined): number | null => (typeof v === "number" && v > 0 ? v : null);
    return {
        at: (i) => {
            const p = [whole(xs?.(i)), whole(ys?.(i))] as const;
            return Number.isNaN(p[0]) || Number.isNaN(p[1]) ? null : p;
        },
        box: (i) => {
            const [w, h] = [num(nodeValues.width?.[i]), num(nodeValues.height?.[i])];
            const bw = nodeValues.borderWidth?.[i];
            return w === null || h === null ? null : [w / 2, h / 2, typeof bw === "number" ? bw : 1, shapes[i]];
        },
    };
}

/** vis-network's `smooth` with every layer applied: booleans set `enabled`, objects their own fields. */
interface VisSmooth {
    enabled: boolean;
    type: string;
    roundness: number;
    forceDirection: unknown;
}

/**
 * vis.js: an edge's `smooth` over `options.edges.smooth` over vis-network's defaults (dynamic, roundness 0.5).
 * @param layers - the layers, the lowest first
 * @returns the smooth options
 */
function visSmooth(...layers: unknown[]): VisSmooth {
    const s: VisSmooth = { enabled: true, type: "dynamic", roundness: 0.5, forceDirection: "none" };
    for (const l of layers) {
        if (typeof l === "boolean") {
            s.enabled = l;
        } else if (isJsonObject(l)) {
            s.enabled = typeof l.enabled === "boolean" ? l.enabled : s.enabled;
            s.type = typeof l.type === "string" ? l.type : s.type;
            s.roundness = typeof l.roundness === "number" && Number.isFinite(l.roundness) ? l.roundness : s.roundness;
            s.forceDirection = l.forceDirection ?? s.forceDirection;
        }
    }
    return s;
}

/**
 * vis.js: an edge label's size under `scaling.label` and its turn along the line.
 * @param merged - the edge's merged layer
 * @param range - the edges' value range
 * @param a - the source node's center, or null
 * @param b - the target node's center, or null
 * @returns the values
 */
function visEdgeLabel(
    merged: VisLayer,
    range: readonly [number, number] | null,
    a: VisPoint | null,
    b: VisPoint | null,
): Row {
    const row: Row = {};
    const size = visLabelScaled(merged, range);
    if (size !== null) {
        row.labelSize = size;
    }
    const turn = visLabelTurn(merged.fontAlign, a, b);
    if (turn !== null) {
        row.labelRotation = turn;
    }
    return row;
}

/**
 * vis.js: how far an edge label whose `font.align` is not "horizontal" is turned to run along its edge, kept readable
 * (vis-network 9.1.9 `Edge._getRotation`), in degrees clockwise on screen.
 * @param align - `font.align`
 * @param a - the source node's center, or null
 * @param b - the target node's center, or null
 * @returns the turn, or null for a level label
 */
function visLabelTurn(align: unknown, a: VisPoint | null, b: VisPoint | null): number | null {
    if (typeof align !== "string" || align === "horizontal" || a === null || b === null) {
        return null;
    }
    const [dx, dy] = [a[0] - b[0], a[1] - b[1]];
    let angle = Math.atan2(dy, dx);
    if ((angle < -1 && dx < 0) || (angle > 0 && dx < 0)) {
        angle += Math.PI;
    }
    const degrees = Math.round(((angle * 180) / Math.PI) * 1e4) / 1e4;
    return degrees < 0 ? degrees + 360 : degrees;
}

/** A point, y down. */
type VisPoint = readonly [number, number];

/**
 * vis-network's control point of a static smooth curve (9.1.9 `BezierEdgeStatic._getViaCoordinates`), from the two
 * node centers.
 * @param from - the source node's center
 * @param to - the target node's center
 * @param smooth - the smooth options
 * @returns the control point
 */
function visStaticVia(from: VisPoint, to: VisPoint, smooth: VisSmooth): VisPoint {
    const f = smooth.roundness;
    const [fx, fy] = from;
    const [tx, ty] = to;
    const dx = Math.abs(fx - tx);
    const dy = Math.abs(fy - ty);
    // the step a discrete, diagonalCross or continuous curve takes from its source, toward its target in x and in y
    // (away from it in y when level: `from.y >= to.y` steps up)
    const step = f * Math.max(dx, dy);
    const sx = step * (Math.sign(tx - fx) || 1);
    const sy = step * (Math.sign(ty - fy) || -1);
    // which way a cross, horizontal or vertical curve's point lies from the target, back toward the source
    const backX = (1 - f) * dx * (Math.sign(fx - tx) || 1);
    const backY = (1 - f) * dy * (Math.sign(fy - ty) || 1);
    switch (smooth.type) {
        case "discrete":
            return visDiscreteVia(from, [fx + sx, fy + sy], dx, dy, f);
        case "diagonalCross":
            return [fx + sx, fy + sy];
        case "straightCross":
            return dx <= dy ? [tx, ty + backY] : [tx + backX, ty];
        case "horizontal":
            return [tx + backX, fy];
        case "vertical":
            return [fx, ty + backY];
        case "curvedCW":
            return visCurvedVia(from, to, f, f * 0.5 + 0.5);
        case "curvedCCW":
            return visCurvedVia(from, to, f, -f * 0.5 + 0.5);
        default:
            // continuous: the diagonal step, no farther than the target along the longer axis
            return dx <= dy
                ? [fx + Math.sign(sx) * Math.min(step, dx), fy + sy]
                : [fx + sx, fy + Math.sign(sy) * Math.min(step, dy)];
    }
}

/**
 * vis-network's discrete curve: the diagonal step, kept at the source's x (or y) when the nodes are nearly in line.
 * @param from - the source node's center
 * @param diagonal - the diagonal step's point
 * @param dx - the distance between the nodes in x
 * @param dy - the distance in y
 * @param f - the roundness
 * @returns the control point
 */
function visDiscreteVia(from: VisPoint, diagonal: VisPoint, dx: number, dy: number, f: number): VisPoint {
    if (dx <= dy) {
        return [dx < f * dy ? from[0] : diagonal[0], diagonal[1]];
    }
    return [diagonal[0], dy < f * dx ? from[1] : diagonal[1]];
}

/**
 * vis-network's curvedCW and curvedCCW: a point `(roundness / 2 + 1 / 2)` of the distance from the source, turned
 * `turn` half turns from the line to the target (vis-network's sin / cos convention, y down).
 * @param from - the source node's center
 * @param to - the target node's center
 * @param f - the roundness
 * @param turn - the turn, in half turns
 * @returns the control point
 */
function visCurvedVia(from: VisPoint, to: VisPoint, f: number, turn: number): VisPoint {
    const ex = to[0] - from[0];
    const ey = from[1] - to[1];
    const r = (f * 0.5 + 0.5) * Math.hypot(ex, ey);
    const angle = (Math.atan2(ey, ex) + turn * Math.PI) % (2 * Math.PI);
    return [from[0] + r * Math.sin(angle), from[1] + r * Math.cos(angle)];
}

/**
 * vis-network's two control points of a cubicBezier curve (9.1.9 `CubicBezierEdge._getViaCoordinates`): each
 * `roundness` of the way across from its own end, horizontally when the nodes are farther apart in x or
 * `forceDirection` is horizontal (or true), else vertically.
 * @param from - the source node's center
 * @param to - the target node's center
 * @param smooth - the smooth options
 * @returns the two control points
 */
function visCubicVia(from: VisPoint, to: VisPoint, smooth: VisSmooth): [VisPoint, VisPoint] {
    const [dx, dy] = [from[0] - to[0], from[1] - to[1]];
    const r = smooth.roundness;
    const force = smooth.forceDirection;
    const across = (Math.abs(dx) > Math.abs(dy) || force === true || force === "horizontal") && force !== "vertical";
    return across
        ? [
              [from[0] - r * dx, from[1]],
              [to[0] + r * dx, to[1]],
          ]
        : [
              [from[0], from[1] - r * dy],
              [to[0], to[1] + r * dy],
          ];
}

/**
 * A point as the neutral `bends` spell it: `along,across` relative to the line between two centers, y down in, y up
 * out.
 * @param a - the source center
 * @param b - the target center
 * @param p - the point
 * @returns `along,across`
 */
function alongAcross(a: VisPoint, b: VisPoint, p: VisPoint): string {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const [qx, qy] = [p[0] - a[0], p[1] - a[1]];
    const l2 = dx * dx + dy * dy;
    return `${fraction((qx * dx + qy * dy) / l2)},${fraction((dy * qx - dx * qy) / l2)}`;
}

/**
 * A number rounded to four places for a bend, with no negative zero.
 * @param v - the number
 * @returns its text
 */
const fraction = (v: number): string => String(Math.round(v * 1e4) / 1e4 || 0);

/**
 * vis.js: the route vis-network draws an edge along. A smooth edge is one Bezier curve through its control points
 * (`bendCurve: "bezier"`): a static type's one point, cubicBezier's two. A dynamic one (vis-network's default) is
 * drawn through a support node the physics simulation moves; where it never moves (physics off for the network or
 * the edge) it stays at the middle and the edge is straight. A self-loop is vis-network's circle of
 * `selfReference.size` (20) centered on its node's outline at `selfReference.angle` (pi / 4).
 * @param defaults - `options.edges`
 * @param own - the edge's own keys
 * @param s - its source node
 * @param t - its target node
 * @param g - the nodes' geometry
 * @returns the route's values, none for a straight edge or a route the file does not decide
 */
function visRoute(defaults: VisLayer, own: VisLayer, s: number, t: number, g: VisGeometry): Row {
    if (s === t) {
        return visLoop(defaults, own, g.box(s));
    }
    const smooth = visSmooth(defaults.smooth, own.smooth);
    if (smooth.enabled && smooth.type === "dynamic") {
        return visDynamic(defaults, own, g.support ?? null);
    }
    const [a, b] = [g.at(s), g.at(t)];
    if (!smooth.enabled || a === null || b === null || (a[0] === b[0] && a[1] === b[1])) {
        return {};
    }
    const controls = smooth.type === "cubicBezier" ? visCubicVia(a, b, smooth) : [visStaticVia(a, b, smooth)];
    return { curved: true, bendCurve: "bezier", bends: controls.map((p) => alongAcross(a, b, p)).join(" ") };
}

/**
 * vis.js: a dynamic smooth edge, drawn through the support node vis-network's physics places, wherever its nodes
 * are (they need no position in the file): its forces, with the edge's own `length` as its springs' rest length.
 * Straight where physics does not run for it (`physics: false` on the network or the edge), as the support node
 * then stays at the middle.
 * @param defaults - `options.edges`
 * @param own - the edge's own keys
 * @param support - the network's forces, or null
 * @returns the route's values
 */
function visDynamic(defaults: VisLayer, own: VisLayer, support: Row | null): Row {
    if (support === null || own.physics === false || (own.physics === undefined && defaults.physics === false)) {
        return {};
    }
    const length = [own.length, defaults.length].find((v) => typeof v === "number" && Number.isFinite(v) && v >= 0);
    return { curved: true, ...support, ...(length === undefined ? {} : { supportSpringLength: length as number }) };
}

/** vis-network 9.1.9's physics defaults for the two solvers whose forces a support node is drawn under. */
const VIS_SOLVERS: Readonly<Record<string, { model: string; g: number; cg: number; length: number; k: number }>> = {
    barnesHut: { model: "barnesHut", g: -2000, cg: 0.3, length: 95, k: 0.04 },
    forceAtlas2Based: { model: "forceAtlas2", g: -50, cg: 0.01, length: 100, k: 0.08 },
};

/**
 * vis.js: the forces a dynamic edge's support node settles under (9.1.9 BarnesHutSolver,
 * ForceAtlas2BasedRepulsionSolver, their central gravity solvers and SpringSolver). None where physics is off, where
 * a hierarchical layout turns every dynamic curve static (`_forceDisableDynamicCurves`), or under the repulsion and
 * hierarchicalRepulsion solvers (ponytail: drawn straight; their force laws when a file uses them).
 * @param physics - `options.physics`
 * @param layout - `options.layout`
 * @returns the neutral support values, or null
 */
function visSupport(physics: unknown, layout: unknown): Row | null {
    const hierarchical = isJsonObject(layout) ? layout.hierarchical : undefined;
    if (hierarchical === true || (isJsonObject(hierarchical) && hierarchical.enabled !== false)) {
        return null;
    }
    if (physics === false || (isJsonObject(physics) && physics.enabled === false)) {
        return null;
    }
    const o = isJsonObject(physics) ? physics : {};
    const solver = typeof o.solver === "string" ? o.solver : "barnesHut";
    const base = VIS_SOLVERS[solver] as (typeof VIS_SOLVERS)[string] | undefined;
    if (base === undefined) {
        return null;
    }
    const given = isJsonObject(o[solver]) ? o[solver] : {};
    const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
    return {
        supportModel: base.model,
        supportSpringLength: Math.max(0, num(given.springLength, base.length)),
        supportSpringConstant: Math.max(0, num(given.springConstant, base.k)),
        supportRepulsion: Math.max(0, -num(given.gravitationalConstant, base.g)),
        supportCentralGravity: Math.max(0, num(given.centralGravity, base.cg)),
    };
}

/**
 * vis.js: a self-loop, vis-network's circle (9.1.9 `EdgeBase._getCircleData`, `getSelfRefCoordinates`) of radius
 * `selfReference.size` (or the older `selfReferenceSize`; 20) centered on the node's outline (visToBorder) along
 * the ray at `selfReference.angle` (pi / 4, counterclockwise from the right). Written as bends at the corners of the
 * square round the circle, drawn through their midpoints, which run along the circle.
 * @param defaults - `options.edges`
 * @param own - the edge's own keys
 * @param box - the node's half width, half height, border width and shape, or null when unknown
 * @returns the loop's values, none for a node whose size is not known here
 */
function visLoop(defaults: VisLayer, own: VisLayer, box: VisBox | null): Row {
    if (box === null) {
        return {};
    }
    const field = (layer: VisLayer, key: string): unknown =>
        isJsonObject(layer.selfReference) ? layer.selfReference[key] : undefined;
    const pick = (...vs: unknown[]): number | null =>
        (vs.find((v) => typeof v === "number" && Number.isFinite(v)) as number | undefined) ?? null;
    const radius =
        pick(field(own, "size"), own.selfReferenceSize, field(defaults, "size"), defaults.selfReferenceSize) ?? 20;
    const angle = pick(field(own, "angle"), field(defaults, "angle")) ?? Math.PI / 4;
    const [hw, hh] = box;
    const reach = visToBorder(box, angle);
    // the circle's center relative to the node's, y up
    const [cx, cy] = [Math.cos(angle) * reach, Math.sin(angle) * reach];
    const behind = [field(own, "renderBehindTheNode"), field(defaults, "renderBehindTheNode")].find(
        (v) => typeof v === "boolean",
    );
    if (behind === false) {
        return visFrontArc(cx, cy, radius, angle, box);
    }
    // the node's farthest reach from its center: its radius when round, its corner otherwise
    const round = box[3] === "dot" || box[3] === "circle" || box[3] === "circularImage";
    if (reach + (round ? hw : Math.hypot(hw, hh)) < radius) {
        return visRing(cx, cy, radius, angle, box);
    }
    // the corners of the square round the circle, the first the one facing the node and again last, so the curve
    // through their midpoints runs the whole circle and its ends, out of and back into the node, bulge as it does
    const corners: string[] = [];
    for (let k = 0; k <= 4; k++) {
        const a = angle + Math.PI + ((k % 4) * Math.PI) / 2;
        const [x, y] = [cx + Math.SQRT2 * radius * Math.cos(a), cy + Math.SQRT2 * radius * Math.sin(a)];
        corners.push(`${fraction(x / hw)},${fraction(y / hh)}`);
    }
    return { curved: true, bendCurve: "midpoints", bends: corners.join(" ") };
}

/** How many points a vis-network self-loop's circle is written through where it does not meet its node. */
const VIS_RING_STEPS = 96;

/**
 * vis.js: a self-loop whose circle holds its whole node, so meets it nowhere (a small node, or a large
 * `selfReference.size`): the circle alone, written as points round it from the side facing the node and back to it,
 * the first and the last the same point, which graphty draws as that closed ring with no line to the node.
 * @param cx - the circle's center across from the node's, y up
 * @param cy - and up from it
 * @param radius - its radius
 * @param angle - the ray its center is on, counterclockwise from the right
 * @param box - the node's half width and half height
 * @returns the loop's values
 */
function visRing(cx: number, cy: number, radius: number, angle: number, box: VisBox): Row {
    const [hw, hh] = box;
    const points: string[] = [];
    for (let k = 0; k <= VIS_RING_STEPS; k++) {
        const a = angle + Math.PI + (2 * Math.PI * (k % VIS_RING_STEPS)) / VIS_RING_STEPS;
        points.push(`${fraction((cx + radius * Math.cos(a)) / hw)},${fraction((cy + radius * Math.sin(a)) / hh)}`);
    }
    return { curved: false, bends: points.join(" ") };
}

/**
 * vis.js: a self-loop drawn in front of its node (`selfReference.renderBehindTheNode: false`): only the arc of its
 * circle between the two points vis-network 9.1.9 searches for (Edge._circle, `_findBorderPositionCircle`: ten
 * halvings of a "position" between the angle and the angle plus pi, read as a fraction of a turn), clockwise on screen
 * from the first to the second, written as points along it.
 * @param cx - the circle's center across from the node's, y up
 * @param cy - and up from it
 * @param radius - its radius
 * @param angle - `selfReference.angle`
 * @param box - the node's half width, half height, border width and shape
 * @returns the loop's values
 */
function visFrontArc(cx: number, cy: number, radius: number, angle: number, box: VisBox): Row {
    // on screen, y down, the node's center at the origin
    const [x, y] = [cx, -cy];
    const search = (direction: -1 | 1): [number, number] => {
        let [low, high] = [angle, angle + Math.PI];
        let pos: [number, number] = [x, y];
        for (let iteration = 0; low <= high && iteration < 10; iteration++) {
            const middle = (low + high) * 0.5;
            const turn = middle * 2 * Math.PI;
            pos = [x + radius * Math.cos(turn), y - radius * Math.sin(turn)];
            const difference = visToBorder(box, Math.atan2(-pos[1], -pos[0])) - Math.hypot(pos[0], pos[1]);
            if (Math.abs(difference) < 0.05) {
                break;
            }
            if (difference > 0 === direction > 0) {
                low = middle;
            } else {
                high = middle;
            }
        }
        return pos;
    };
    const [from, to] = [search(-1), search(1)];
    const start = Math.atan2(from[1] - y, from[0] - x);
    let end = Math.atan2(to[1] - y, to[0] - x);
    if (end < start) {
        end += 2 * Math.PI;
    }
    const [hw, hh] = box;
    const steps = Math.max(2, Math.ceil(((end - start) / (2 * Math.PI)) * VIS_RING_STEPS));
    const points: string[] = [];
    for (let k = 0; k <= steps; k++) {
        const a = start + ((end - start) * k) / steps;
        points.push(`${fraction((x + radius * Math.cos(a)) / hw)},${fraction(-(y + radius * Math.sin(a)) / hh)}`);
    }
    // the arc's two ends are where vis-network starts and stops it, off the node as often as on it: ports, so no line
    // is drawn from the node out to them
    return {
        curved: false,
        sourcePort: points[0],
        bends: points.slice(1, -1).join(" "),
        targetPort: points.at(-1) ?? points[0],
    };
}

/**
 * vis-network 9.1.9's `distanceToBorder` of a node, how far from its center its outline is along a ray: a dot its
 * size, a circle or circularImage half its width, an ellipse its ellipse, all with no border; every other shape its
 * box plus its border width (NodeBase._distanceToBorder, Box).
 * @param box - the node's half width, half height, border width and shape
 * @param angle - the ray, counterclockwise from the right
 * @returns the distance
 */
function visToBorder(box: VisBox, angle: number): number {
    const [hw, hh, bw, shape] = box;
    if (shape === "dot" || shape === "circle" || shape === "circularImage") {
        return hw;
    }
    if (shape === "ellipse") {
        return (hw * hh) / Math.hypot(Math.sin(angle) * hw, Math.cos(angle) * hh);
    }
    return Math.min(Math.abs(hw / Math.cos(angle)), Math.abs(hh / Math.sin(angle))) + bw;
}

/** The vis.js keys the reader reads, per target. */
const VIS_KEYS: Readonly<Record<StyleTarget, readonly string[]>> = {
    node: [
        "color",
        "shape",
        "size",
        "value",
        "scaling",
        "borderWidth",
        "opacity",
        "hidden",
        "label",
        "title",
        "font",
        "margin",
        "widthConstraint",
        "heightConstraint",
        "image",
        "brokenImage",
        "imagePadding",
        "icon",
        "shapeProperties",
    ],
    edge: [
        "color",
        "width",
        "value",
        "scaling",
        "dashes",
        "arrows",
        "hidden",
        "label",
        "title",
        "font",
        "background",
        "smooth",
        "selfReference",
        "selfReferenceSize",
        "physics",
        "length",
        "widthConstraint",
    ],
};

/**
 * Each element's own vis.js keys as a layer, read from the graph's columns.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @returns the layer of an element
 */
function elementRecords(snapshot: GraphSnapshot, target: StyleTarget): (i: number) => VisLayer {
    const raw = elementRaw(snapshot, target);
    return (i) => visLayer(raw(i), target);
}

/**
 * Each element's own vis.js keys as the file gives them, read from the graph's columns.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @returns the keys of an element
 */
function elementRaw(snapshot: GraphSnapshot, target: StyleTarget): (i: number) => Record<string, unknown> {
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
        return record;
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
    const shape = typeof s === "string" ? visShape(s)[0] : "ellipse";
    return VIS_SIZED.has(shape) ? oneSize(want) : null;
};

/**
 * The vis.js shape a written node is read back as.
 * @param want - the block's values of the element
 * @returns the shape
 */
const visShapeBack = (want: (p: string) => StyleValue | null): string => {
    const s = want("shape");
    return typeof s === "string" ? visShape(s)[0] : "ellipse";
};

/**
 * What a written vis.js node of a shape that changes what its size gives back reads as (visSizedShape, visFitShape):
 * a hexagon's height and how far below its square its label hangs, a database's label at its top.
 * @param property - the fact
 * @returns the reading back of the element's values, null where the shape changes nothing
 */
const visShapeFactBack =
    (property: "height" | "labelOffsetY") =>
    (want: (p: string) => StyleValue | null): StyleValue | null => {
        const shape = visShapeBack(want);
        const size = visSize(want);
        if (shape === "hexagon" && typeof size === "number") {
            return property === "height" ? (Math.sqrt(3) * size) / 2 : ((2 - Math.sqrt(3)) * size) / 4;
        }
        return property === "labelOffsetY" && shape === "database" ? VIS_MARGIN : null;
    };

/**
 * What the reader reads back for a fact of a node the writer wrote in a shape vis-network sizes by its label: the
 * shape's own growth, from the label and font size written.
 * @param property - the fact
 * @returns the reading back of the element's values
 */
const visFitBack =
    (property: string) =>
    (want: (p: string) => StyleValue | null): StyleValue | null => {
        const s = want("shape");
        const shape = typeof s === "string" ? visShape(s)[0] : "ellipse";
        return visLabelFit({ fontSize: want("labelSize"), label: want("label") }, shape)[property] ?? null;
    };

/**
 * What reading a file graphty wrote in vis.js gives back: VIS_WRITTEN, and for a self-loop the route the reader draws
 * it along (vis-network's circle, made from vis-network's own defaults and the node's size, never from the block).
 * @param snapshot - the graph
 * @param edgeValues - the edge values the reader read
 * @returns the readings back
 */
function visWritten(snapshot: GraphSnapshot, edgeValues: Values): Written {
    const isLoop = (i: number): boolean => snapshot.edgeSource(i) === snapshot.edgeTarget(i);
    const loop =
        (property: string) =>
        (want: (p: string) => StyleValue | null, i: number): StyleValue | null =>
            isLoop(i) ? (edgeValues[property]?.[i] ?? null) : want(property);
    // the writer writes no `smooth` and no `options.physics`, so every other edge reads back as vis-network's default,
    // a dynamic curve under the default barnesHut physics
    const dynamic = visSupport(undefined, undefined) ?? {};
    const support = (property: string) => (_want: unknown, i: number) =>
        isLoop(i) ? (edgeValues[property]?.[i] ?? null) : (dynamic[property] ?? null);
    const supports = Object.fromEntries(Object.keys(dynamic).map((property) => [property, support(property)]));
    // an edge's own `length`, kept as data, is its springs' rest length again
    const lengths = cells(snapshot, "edge", "length");
    supports.supportSpringLength = (want, i) => {
        const own = lengths?.(i);
        return typeof own === "number" && Number.isFinite(own) && own >= 0 && !isLoop(i)
            ? own
            : support("supportSpringLength")(want, i);
    };
    return {
        node: VIS_WRITTEN.node,
        edge: {
            ...VIS_WRITTEN.edge,
            ...supports,
            bends: loop("bends"),
            bendCurve: loop("bendCurve"),
            curved: (_want, i) => (isLoop(i) ? (edgeValues.curved?.[i] ?? null) : true),
        },
    };
}

const VIS_WRITTEN: Written = {
    node: {
        width: (want) => visSize(want) ?? visFitBack("width")(want),
        height: (want) => visShapeFactBack("height")(want) ?? visSize(want) ?? visFitBack("height")(want),
        labelOffsetY: visShapeFactBack("labelOffsetY"),
        labelFit: visFitBack("labelFit"),
        labelPaddingX: visFitBack("labelPaddingX"),
        labelPaddingY: visFitBack("labelPaddingY"),
        labelFitSquare: visFitBack("labelFitSquare"),
        // the writer writes hex colors, whose alpha vis-network's node opacity replaces, the border's too
        borderOpacity: (want) => {
            const opacity = want("opacity");
            return typeof opacity === "number" ? opacity : want("borderOpacity");
        },
        shape: (want) => {
            const s = want("shape");
            if (typeof s !== "string") {
                return null;
            }
            const site = { notes: new StyleNotes(), target: "node" as const, property: "shape" };
            return canonEnum("shape", visShape(s)[0], "vis", site);
        },
        labelPosition: (want) => {
            const s = want("shape");
            if (typeof s !== "string") {
                return null;
            }
            const shape = visShape(s)[0];
            if (shape === "database") {
                return "inside-top";
            }
            return VIS_SIZED.has(shape) ? "bottom" : "center";
        },
    },
    edge: {
        lineStyle: (want) => {
            const s = want("lineStyle");
            if (s === null) {
                return null;
            }
            // written as `dashes: true`, vis-network's [5, 5], which a wide edge's round caps close up
            if (s === "solid") {
                return "solid";
            }
            const width = want("width");
            return visDashStyle([5, 5], typeof width === "number" ? width : 1, true);
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
 * documentation's per-dialect tables read it, through a dynamic import knip cannot follow (hence public).
 * @public
 */
export const NATIVE: Readonly<
    Record<"cytoscape" | "graphology" | "vis", Readonly<Record<StyleTarget, readonly string[]>>>
> = {
    cytoscape: {
        node: cyjsProperties(CYJS_NODE_PROPERTIES, ["labelPosition", "labelItalic", "visible"]),
        edge: cyjsProperties(CYJS_EDGE_PROPERTIES, ["curved", "labelItalic", "visible"]),
    },
    graphology: {
        node: ["fill", "fillOpacity", "width", "height", "label"],
        edge: ["color", "opacity", "width", "label"],
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
    const native = dialect === "cytoscape" || dialect === "graphology" || dialect === "vis" ? NATIVE[dialect] : null;
    const notes: LossNote[] = [...notWritten(input, dialect, native), ...rulesNotKept(snapshot, dialect, input)];
    if (dialect === "obographs") {
        return { snapshot, topLevelBlock: null, stylesheet: null, groups: null, notes };
    }
    const out = snapshot.withColumns();
    const read = dataColumnsRead(input.rules.styles.rules);
    for (const [table, target] of [
        [out.nodes, "node"],
        [out.edges, "edge"],
    ] as const) {
        removeEarlierStyleKeys(table, dialect, read[target]);
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
    const approximated = new StyleApproximations();
    const replaced = new Replaced(out.nodes);
    if (dialect === "cytoscape") {
        const emitted = writeCytoscapeStyles(out, input);
        ({ stylesheet } = emitted);
        notes.push(...emitted.notes.map(lossOf));
        addUntrimmedText(input, approximated);
    } else if (dialect === "graphology") {
        writeGraphology(out, input, approximated, replaced);
    } else if (dialect === "vis") {
        writeVis(out, input, approximated, replaced);
    }
    notes.push(...approximated.notes(`the ${dialect} dialect of JSON`), ...replaced.notes(dialect));
    return {
        snapshot: out,
        topLevelBlock: BLOCK_AS_ATTRIBUTE.has(dialect) ? null : input.block,
        stylesheet,
        groups: dialect === "vis" ? visGroups(out) : null,
        notes,
    };
}

/**
 * W_STYLE_RULES_NOT_KEPT for a dialect that cannot give the rules back: JGF when it changes the node ids' type or
 * order, OBO Graphs always.
 * @param snapshot - the graph handed to the exporter
 * @param dialect - the dialect written
 * @param input - the styles
 * @returns the notes
 */
function rulesNotKept(snapshot: GraphSnapshot, dialect: JsonDialect, input: ExporterStyleInput): LossNote[] {
    let message: string | null = null;
    if (dialect === "jgf" && !jgfKeepsNodes(snapshot)) {
        message =
            "the style rules are not kept: JGF changes the node ids' type or order (number ids become text, integer-like ids are read first), so the graphty.styles block no longer matches the graph read back";
    } else if (dialect === "obographs") {
        message = "the style rules are not kept: OBO Graphs has no place for them";
    }
    if (message === null) {
        return [];
    }
    return [
        Object.freeze({
            code: STYLE_ISSUE.RULES_NOT_KEPT,
            message,
            column: null,
            count: input.rules.styles.rules.length,
        }),
    ];
}

/**
 * Removes the style values an earlier write left in the data, unless the styles themselves read them as data, and,
 * for Cytoscape.js, the element style an import kept.
 * @param table - the node or edge table, changed in place
 * @param dialect - the dialect written
 * @param read - the data columns the target's rules read
 */
function removeEarlierStyleKeys(table: Table, dialect: JsonDialect, read: ReadonlySet<string>): void {
    for (const name of table.names()) {
        const styleKey =
            name.startsWith("graphty.style.") || name.startsWith("graphty_style_") || name === CYTOSCAPE_IMPORT_KEY;
        if (styleKey && !read.has(name)) {
            table.remove(name);
        }
    }
    if (dialect === "cytoscape") {
        for (const name of ["style#element", "css#element"].filter((c) => table.has(c))) {
            table.remove(name);
        }
    }
}

/**
 * Writes the Cytoscape.js element data and bypasses the stylesheet reads.
 * @param out - the graph written, changed in place
 * @param input - the styles
 * @returns what toCytoscapeStylesheet() emitted
 */
function writeCytoscapeStyles(out: GraphSnapshot, input: ExporterStyleInput): ReturnType<typeof toCytoscapeStylesheet> {
    // the element data the stylesheet is checked against is the data written: without the style values of an
    // earlier write, which are not written again
    const features = {
        node: input.rules.features.node.filter((f) => !("data" in f.ref) || out.nodes.has(f.ref.data)),
        edge: input.rules.features.edge.filter((f) => !("data" in f.ref) || out.edges.has(f.ref.data)),
    };
    const emitted = toCytoscapeStylesheet({ ...input.rules, features });
    for (const [table, target] of [
        [out.nodes, "node"],
        [out.edges, "edge"],
    ] as const) {
        const rows = emitted.elementData[target];
        const keys = new Set(rows.flatMap((row) => Object.keys(row ?? {})));
        for (const key of keys) {
            setColumn(
                table,
                key,
                rows.map((row) => row?.[key] ?? null),
            );
        }
        const bypass = emitted.bypass[target].map((b) => (b === null || Object.keys(b).length === 0 ? null : b));
        if (bypass.some((b) => b !== null)) {
            setColumn(table, "style#element", bypass);
        }
    }
    return emitted;
}

/**
 * Counts as approximated the text values with leading or trailing white space, which Cytoscape.js trims.
 * @param input - the styles
 * @param approximated - where approximations are counted
 */
function addUntrimmedText(input: ExporterStyleInput, approximated: StyleApproximations): void {
    for (const target of TARGETS) {
        for (const property of CYJS_TEXT[target]) {
            for (const v of input.picture(target, property as never)) {
                if (typeof v === "string" && v.trim() !== v) {
                    approximated.add(target, property, JSON.stringify(v));
                }
            }
        }
    }
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
        const refs = [
            ...predicateRefs(rule.where),
            ...Object.values(rule.map ?? {}).flatMap((m) => (m === undefined ? [] : [m.by])),
        ];
        for (const ref of refs) {
            if ("data" in ref) {
                out[rule.target].add(ref.data);
            }
        }
    }
    return out;
}

/**
 * The columns a predicate tests.
 * @param where - the predicate
 * @returns the column references
 */
function predicateRefs(where: Predicate): ColumnRef[] {
    const refs: ColumnRef[] = [];
    const stack: Predicate[] = [where];
    while (stack.length > 0) {
        const p = stack.pop() as Predicate;
        if ("has" in p) {
            refs.push(p.has);
        } else if ("eq" in p) {
            refs.push(p.eq[0]);
        } else if ("in" in p) {
            refs.push(p.in[0]);
        } else if ("and" in p) {
            stack.push(...p.and);
        } else if ("or" in p) {
            stack.push(...p.or);
        } else if ("not" in p) {
            stack.push(p.not);
        }
    }
    return refs;
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
    approximated: StyleApproximations,
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
    approximated: StyleApproximations,
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
            target === "node"
                ? nodeSizes(p("node", "width"), p("node", "height"), approximated).map((d) =>
                      d === null ? null : d / 2,
                  )
                : // sigma draws an edge half as wide as its size (readSigmaRow)
                  p("edge", "width").map((w) => (typeof w === "number" ? w * 2 : w)),
            replaced,
        );
        writeKey(table, "label", p(target, "label"), replaced);
    }
}

/**
 * vis.js: vis-network's keys from the picture.
 * @param out - the graph being written
 * @param input - the styles
 * @param approximated - where approximations are counted
 * @param replaced - where replaced data values are counted
 */
/**
 * vis.js: a scaling range of each written size for the elements with a `value`, which vis-network would otherwise
 * map onto `scaling` instead of drawing the size written (a node's radius, an edge's width).
 * @param table - the node or edge table being written
 * @param sizes - each element's written size, or null
 * @param replaced - the data values replaced so far
 */
function keepScaled(table: Table, sizes: readonly (StyleValue | null)[], replaced: Replaced): void {
    const value = table.get("value");
    if (value === null) {
        return;
    }
    const scaling = sizes.map((v, i) =>
        typeof v !== "number" || typeof plainCell(value.value(i)) !== "number" ? null : { min: v, max: v },
    );
    writeKey(table, "scaling", scaling, replaced);
}

function writeVis(
    out: ReturnType<GraphSnapshot["withColumns"]>,
    input: ExporterStyleInput,
    approximated: StyleApproximations,
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
        const [written, exact] = typeof s === "string" ? visShape(s) : [null, true];
        // an ellipse with no size of its own is vis-network's label-sized `ellipse`, one with a size its `dot`
        const shape = written === "dot" && s === "ellipse" && sizes[i] === null ? "ellipse" : written;
        if (!exact) {
            approximated.add("node", "shape", s);
        }
        if (sizes[i] !== null && !VIS_SIZED.has(shape ?? "ellipse")) {
            approximated.add("node", "width", `${String(s ?? "ellipse")} sized by its label`);
        }
        return shape;
    });
    writeKey(out.nodes, "shape", shapes, replaced);
    // vis-network draws `size` as a radius
    const radii = sizes.map((d) => (d === null ? null : d / 2));
    writeKey(out.nodes, "size", radii, replaced);
    // a node's `value` would scale its size again on reading: a scaling range of its own radius keeps it
    keepScaled(out.nodes, radii, replaced);
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
    const widths = p("edge", "width");
    writeKey(out.edges, "width", widths, replaced);
    // an edge's `value` would scale its width again on reading: a scaling range of its own width keeps it
    keepScaled(out.edges, widths, replaced);
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
