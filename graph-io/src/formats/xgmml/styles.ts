/**
 * The styles of XGMML files and Cytoscape 2.x session networks: Cytoscape writes every element's RESOLVED visual
 * properties into its `<graphics>` (XML attributes in the old spelling, nested `<att>` elements named for the visual
 * property, and the locked ones under `lockedVisualProperties`), and no style. The reader turns those values into
 * the neutral vocabulary; the planner explains them. The writer does the reverse from what graphty draws.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { STYLE_ISSUE } from "../../styles/codes.js";
import { cytoscapeElementProperties, cytoscapeWritableProperties } from "../../styles/cytoscape/emit.js";
import { normalizeVisualProperties } from "../../styles/cytoscape/lexicon.js";
import { emptyCytoscapeStyle } from "../../styles/cytoscape/mappings.js";
import { cytoscapeBackground, type CytoscapeBypass, resolveCytoscapeBypasses } from "../../styles/cytoscape/resolve.js";
import { blockStyles, parseStyleBlock, STYLE_BLOCK_NAME } from "../../styles/io/block.js";
import type { ExporterStyleInput } from "../../styles/io/writer.js";
import { StyleNotes } from "../../styles/notes.js";
import { styleFingerprint } from "../../styles/plan/features.js";
import { plainCell, resolveStyles } from "../../styles/plan/resolve.js";
import type {
    EdgeStyleProperty,
    GraphStyle,
    ImporterStyles,
    NodeStyleProperty,
    ReaderOutput,
    StyleColumn,
    StyleProperty,
    StyleReadContext,
    StyleTarget,
    StyleTool,
    StyleValue,
    StyleWriteCapabilities,
} from "../../styles/types.js";
import type { LossNote } from "../../types.js";
import { lossOf } from "../cx/styles.js";
import { GRAPHICS_COLUMN, XGMML_ORIGIN_NAMESPACE } from "./constants.js";

type Table = GraphSnapshot["nodes"];

/**
 * The name of a table's graphics column: the json column the XGMML reader keeps `<graphics>` in.
 * @param table - the node, edge or graph table
 * @returns the column's name, or null
 */
export function graphicsColumnOf(table: Table): string | null {
    for (const col of table) {
        const { origin } = col.meta;
        if (col.dtype === "json" && origin?.type === "graphics" && origin.namespace === XGMML_ORIGIN_NAMESPACE) {
            return col.meta.name;
        }
    }
    return table.get(GRAPHICS_COLUMN)?.dtype === "json" ? GRAPHICS_COLUMN : null;
}

/**
 * Each element's visual properties from its graphics: the graphics values normalized to visual property names, the
 * locked ones (`lockedVisualProperties`, a session view's bypasses) on top.
 * @param table - the node or edge table
 * @param target - nodes or edges
 * @param n - the element count
 * @param notes - where too-deep nesting is noted
 * @returns per element, its visual properties (null without graphics)
 */
export function graphicsBypasses(table: Table, target: StyleTarget, n: number, notes: StyleNotes): CytoscapeBypass[] {
    const out = new Array<CytoscapeBypass>(n).fill(null);
    const name = graphicsColumnOf(table);
    if (name === null) {
        return out;
    }
    for (let i = 0; i < n; i++) {
        const g = plainCell(table.value(name, i));
        if (g === null || typeof g !== "object" || Array.isArray(g)) {
            continue;
        }
        const map = normalizeVisualProperties(target, g, notes);
        const locked = Object.hasOwn(g, "lockedVisualProperties")
            ? (g as Record<string, unknown>).lockedVisualProperties
            : undefined;
        if (locked !== null && typeof locked === "object") {
            for (const [k, v] of normalizeVisualProperties(target, locked, notes)) {
                map.set(k, v);
            }
        }
        out[i] = map.size > 0 ? map : null;
    }
    return out;
}

/** What the XGMML style reader is told by its caller. */
export interface XgmmlStyleSettings {
    /** Whose defaults fill what the file leaves unset. */
    readonly tool: StyleTool;
    /** A bool column marking hidden elements (a Cytoscape 2.x session's hidden state), or null. */
    readonly hiddenColumn?: string | null;
}

/**
 * The styles of a graph whose elements carry Cytoscape's resolved visual properties in their graphics.
 * @param snapshot - the graph
 * @param context - the budget and cancel signal
 * @param settings - the tool and the hidden-state column
 * @returns the styles (canonical values, no declared rules)
 */
export function readXgmmlStyles(
    snapshot: GraphSnapshot,
    context: StyleReadContext,
    settings: XgmmlStyleSettings,
): ImporterStyles {
    const notes = new StyleNotes();
    const out: Record<StyleTarget, ReaderOutput> = { node: { values: {} }, edge: { values: {} } };
    for (const target of ["node", "edge"] as const) {
        context.signal?.throwIfAborted();
        const table = target === "node" ? snapshot.nodes : snapshot.edges;
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const maps = graphicsBypasses(table, target, n, notes);
        const values = maps.some((m) => m !== null)
            ? resolveCytoscapeBypasses(target, maps, { notes, budget: context.budget })
            : {};
        hiddenToVisible(table, settings.hiddenColumn ?? null, n, values);
        exactFromBlock(snapshot, target, values);
        out[target] = { values: nonEmpty(values) };
    }
    return {
        canonical: true,
        dialect: "cytoscape",
        tool: settings.tool,
        units: "px",
        node: out.node,
        edge: out.edge,
        graph: graphStyleOf(snapshot, notes),
        notes: notes.list(),
    };
}

/**
 * The styles of an XGMML file: its elements' resolved values, with Cytoscape desktop's default style beneath.
 * @param snapshot - the graph
 * @param context - the budget and cancel signal
 * @returns the styles
 */
export function readXgmmlFileStyles(snapshot: GraphSnapshot, context: StyleReadContext): ImporterStyles {
    return readXgmmlStyles(snapshot, context, { tool: "cytoscape" });
}

/**
 * For a file graphty wrote: where an element's value is what the writer's nearest Cytoscape value of the
 * `graphty.styles` block's value reads back as (a font family list written as its first family, a shape Cytoscape
 * does not have), the block's exact value is the truth, so a re-import gives the same rules. A value that differs
 * from what graphty wrote (another program edited it) stays the truth.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @param values - the values per property, changed in place
 */
function exactFromBlock(
    snapshot: GraphSnapshot,
    target: StyleTarget,
    values: Partial<Record<string, StyleColumn>>,
): void {
    const text = snapshot.graph.has(STYLE_BLOCK_NAME) ? plainCell(snapshot.graph.value(STYLE_BLOCK_NAME, 0)) : null;
    if (typeof text !== "string") {
        return;
    }
    const parsed = parseStyleBlock(text, styleFingerprint(snapshot));
    const ex = parsed.ok ? blockStyles(parsed.block, snapshot, "xgmml") : null;
    if (ex === null) {
        return;
    }
    const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
    const want = new Map<string, readonly (StyleValue | null)[]>();
    const exact = (property: string): readonly (StyleValue | null)[] => {
        let held = want.get(property);
        if (held === undefined) {
            held = resolveStyles(ex, target, property as StyleProperty, snapshot);
            want.set(property, held);
        }
        return held;
    };
    // What each element's exact values are written as, read back the way the file is read.
    const written = Array.from({ length: n }, (_v, i) =>
        cytoscapeElementProperties(
            target,
            (property) => exact(property)[i] ?? null,
            "desktop",
            () => undefined,
        ),
    );
    const readBack = resolveCytoscapeBypasses(target, written, { notes: new StyleNotes() });
    for (const [property, native] of Object.entries(values)) {
        const back = readBack[property];
        if (native === undefined || back === undefined) {
            continue;
        }
        const w = exact(property);
        let changed: (StyleValue | null)[] | null = null;
        for (let i = 0; i < n; i++) {
            if (w[i] !== null && native[i] !== w[i] && native[i] === back[i]) {
                changed ??= [...native];
                changed[i] = w[i];
            }
        }
        if (changed !== null) {
            values[property] = changed;
        }
    }
}

/**
 * Marks the elements a hidden-state column holds true as not visible.
 * @param table - the node or edge table
 * @param column - the bool column, or null
 * @param n - the element count
 * @param values - the values per property, changed in place
 */
export function hiddenToVisible(
    table: Table,
    column: string | null,
    n: number,
    values: Partial<Record<string, StyleColumn>>,
): void {
    if (column === null || !table.has(column)) {
        return;
    }
    let visible: (StyleValue | null)[] | null = null;
    for (let i = 0; i < n; i++) {
        if (plainCell(table.value(column, i)) === true) {
            visible ??= values.visible === undefined ? new Array<StyleValue | null>(n).fill(null) : [...values.visible];
            visible[i] = false;
        }
    }
    if (visible !== null) {
        values.visible = visible;
    }
}

/**
 * The properties with at least one value.
 * @param values - per property, each element's value
 * @returns the same without all-null properties
 */
export function nonEmpty(values: Partial<Record<string, StyleColumn>>): Partial<Record<StyleProperty, StyleColumn>> {
    const out: Partial<Record<string, StyleColumn>> = {};
    for (const [p, col] of Object.entries(values)) {
        if (col?.some((v) => v !== null) === true) {
            out[p] = col;
        }
    }
    return out;
}

/**
 * The graph's background from its own graphics (`NETWORK_BACKGROUND_PAINT`).
 * @param snapshot - the graph
 * @param notes - where a bad value is noted
 * @returns the graph style
 */
function graphStyleOf(snapshot: GraphSnapshot, notes: StyleNotes): GraphStyle {
    const name = graphicsColumnOf(snapshot.graph);
    const g = name === null ? null : plainCell(snapshot.graph.value(name, 0));
    if (g === null || typeof g !== "object") {
        return {};
    }
    const style = emptyCytoscapeStyle();
    for (const [k, v] of normalizeVisualProperties("node", g, notes)) {
        if (k.startsWith("NETWORK_")) {
            style.network.defaults.set(k, v);
        }
    }
    const background = cytoscapeBackground(style, notes);
    return background === null ? {} : { background };
}

// ------------------------------------------------------------------ writing

/**
 * What the XGMML writer holds natively: every visual property Cytoscape keeps per element, and the graph's
 * background. The block and the tagged values go into graph and element `<att>`s.
 */
export const XGMML_STYLE_CAPABILITIES: StyleWriteCapabilities = Object.freeze({
    node: Object.freeze(cytoscapeWritableProperties("node", "desktop") as NodeStyleProperty[]),
    edge: Object.freeze(cytoscapeWritableProperties("edge", "desktop") as EdgeStyleProperty[]),
    graph: Object.freeze(["background"] as const),
    block: "attributes",
});

/** The visual properties Cytoscape also writes as `<graphics>` XML attributes, in its old spelling. */
const XML_ATTRIBUTES: Readonly<Record<StyleTarget, readonly (readonly [vp: string, attribute: string])[]>> = {
    node: [
        ["NODE_SHAPE", "type"],
        ["NODE_HEIGHT", "h"],
        ["NODE_WIDTH", "w"],
        ["NODE_FILL_COLOR", "fill"],
        ["NODE_BORDER_WIDTH", "width"],
        ["NODE_BORDER_PAINT", "outline"],
    ],
    edge: [
        ["EDGE_WIDTH", "width"],
        ["EDGE_STROKE_UNSELECTED_PAINT", "fill"],
    ],
};

/**
 * One element's graphics record for a file written with styles: what graphty draws as Cytoscape visual properties,
 * the six classic ones also as XML attributes (the importer reads both alike), over the kept graphics' visual
 * properties no neutral property carries (custom graphics, label widths) and edge bends.
 * @param target - nodes or edges
 * @param styles - the exporter's style input
 * @param i - the element index
 * @param kept - the element's kept graphics record, or null
 * @returns the record, or null when there is nothing to write
 */
export function styledGraphics(
    target: StyleTarget,
    styles: ExporterStyleInput,
    i: number,
    kept: Record<string, unknown> | null,
): Record<string, unknown> | null {
    const vps = cytoscapeElementProperties(
        target,
        (p) => styles.picture(target, p as StyleProperty)[i] ?? null,
        "desktop",
        () => undefined,
    );
    const out: Record<string, unknown> = {};
    for (const [vp, attribute] of XML_ATTRIBUTES[target]) {
        if (vps.has(vp)) {
            out[attribute] = String(vps.get(vp));
        }
    }
    for (const [k, v] of Object.entries(kept ?? {})) {
        // a kept visual property the picture does not write, or the edge's bends; old-spelling and nested keys
        // would be read before the picture's values and contradict them
        if (k === "Line" || (/^[A-Z][A-Z_0-9]+$/.test(k) && !vps.has(k))) {
            out[k] = v;
        }
    }
    for (const [vp, v] of vps) {
        out[vp] = String(v);
    }
    return Object.keys(out).length === 0 ? null : out;
}

/**
 * What writing every element's graphics with styles loses: each value written as the nearest one Cytoscape allows,
 * counted per element.
 * @param styles - the exporter's style input
 * @param snapshot - the graph
 * @returns the loss notes
 */
export function styledGraphicsNotes(styles: ExporterStyleInput, snapshot: GraphSnapshot): LossNote[] {
    const notes = new StyleNotes();
    for (const target of ["node", "edge"] as const) {
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        for (let i = 0; i < n; i++) {
            cytoscapeElementProperties(
                target,
                (p) => styles.picture(target, p as StyleProperty)[i] ?? null,
                "desktop",
                (p) => {
                    notes.add(STYLE_ISSUE.APPROXIMATED, target, p, { element: i });
                },
            );
        }
    }
    return notes.list().map(lossOf);
}

/**
 * The graph's graphics record for a file written with styles: the kept record with the background replaced.
 * @param styles - the exporter's style input
 * @param kept - the kept graph graphics, or null
 * @returns the record, or null
 */
export function styledGraphGraphics(
    styles: ExporterStyleInput,
    kept: Record<string, unknown> | null,
): Record<string, unknown> | null {
    const { background } = styles.rules.styles.graph;
    const out: Record<string, unknown> = { ...(kept ?? {}) };
    if (background !== undefined) {
        out.NETWORK_BACKGROUND_PAINT = background.toUpperCase();
    }
    return Object.keys(out).length === 0 ? null : out;
}
