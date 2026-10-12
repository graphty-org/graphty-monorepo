/**
 * The styles of CX version 1 and CX2 files. Both hold one Cytoscape visual style (defaults, mappings and
 * dependencies) and per-element bypasses. The readers resolve every element the way Cytoscape draws it (bypass over
 * mapping over default) and translate the style into neutral rules, with Cytoscape desktop's default style beneath
 * (Cytoscape starts every imported CX or CX2 style as a copy of it). The writers do the reverse: neutral rules
 * become Cytoscape defaults and mappings, everything else per-element bypasses, so Cytoscape draws what graphty
 * draws; the `graphty.styles` block is an aspect of its own and the style values its rules read are attributes.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { STYLE_ISSUE } from "../../styles/codes.js";
import {
    type CytoscapeDialect,
    type CytoscapeEmitted,
    cytoscapeWritableProperties,
    emitCytoscapeStyle,
} from "../../styles/cytoscape/emit.js";
import { type CytoscapeStyle, cytoscapeStyleFromCx } from "../../styles/cytoscape/mappings.js";
import {
    cytoscapeBackground,
    type CytoscapeBypass,
    type CytoscapeElements,
    resolveCytoscape,
} from "../../styles/cytoscape/resolve.js";
import { cytoscapeRules } from "../../styles/cytoscape/translate.js";
import { STYLE_BLOCK_NAME } from "../../styles/io/block.js";
import type { ExporterStyleInput } from "../../styles/io/writer.js";
import { StyleNotes } from "../../styles/notes.js";
import { plainCell } from "../../styles/plan/resolve.js";
import type {
    EdgeStyleProperty,
    ImporterStyles,
    NodeStyleProperty,
    ReaderOutput,
    StyleColumn,
    StyleNote,
    StyleReadContext,
    StyleTarget,
    StyleWriteCapabilities,
} from "../../styles/types.js";
import type { LossNote } from "../../types.js";
import { nonEmpty } from "../xgmml/styles.js";

type Table = GraphSnapshot["nodes"];

/**
 * The block text of a `graphty.styles` aspect (`[{ "block": "<json>" }]`, the aspect a CX or CX2 file graphty wrote
 * keeps its block in), or null when it holds none.
 * @param elements - the aspect's elements
 * @returns the text
 */
export function blockOfAspect(elements: readonly unknown[] | undefined): string | null {
    const first: unknown = elements?.[0];
    if (first === null || typeof first !== "object" || !Object.hasOwn(first, "block")) {
        return null;
    }
    const text = (first as { block: unknown }).block;
    return typeof text === "string" ? text : null;
}

/**
 * The `graphty.styles` aspect's elements for a block.
 * @param block - the block's text
 * @returns the elements
 */
export function blockAspect(block: string): Record<string, unknown>[] {
    return [{ block }];
}

/**
 * The `graphty.styles` block a snapshot carries as a graph attribute (an import of a file graphty wrote, or the one
 * graph-io adds for a styled export), or null.
 * @param snapshot - the graph
 * @returns the block's text
 */
export function snapshotBlock(snapshot: GraphSnapshot): string | null {
    const column = snapshot.graph.get(STYLE_BLOCK_NAME);
    const value = column !== null && column.isSet(0) ? column.value(0) : null;
    return typeof value === "string" ? value : null;
}

/** What a CX version 1 import keeps for its styles: the `cyVisualProperties` entries of the imported view. */
export interface CxStyleSource {
    /** The entries, in file order. */
    readonly entries: readonly unknown[];
    /** How many other views the file styles, whose entries were left out. */
    readonly otherViews?: number;
}

/** What a CX2 import keeps for its styles. */
export interface Cx2StyleSource {
    /** The `visualProperties` aspect. */
    readonly visualProperties: unknown;
    /** The `visualEditorProperties` aspect. */
    readonly visualEditorProperties: unknown;
}

/**
 * Each element's bypasses: the columns of an importer's bypass namespace, keyed by the visual property's own name.
 * @param table - the node or edge table
 * @param n - the element count
 * @param namespace - the bypass namespace
 * @returns per element, its bypasses, and the bypass columns' names
 */
function bypassesOf(table: Table, n: number, namespace: string): { maps: CytoscapeBypass[]; names: string[] } {
    const columns = [...table].filter((c) => c.meta.origin?.namespace === namespace);
    const maps = new Array<CytoscapeBypass>(n).fill(null);
    for (let i = 0; i < n; i++) {
        let m: Map<string, unknown> | null = null;
        for (const c of columns) {
            const v = plainCell(c.isSet(i) ? c.value(i) : null);
            if (v !== null) {
                m ??= new Map();
                const id = c.meta.origin?.id;
                m.set(typeof id === "string" && id.length > 0 ? id : c.meta.name, v);
            }
        }
        maps[i] = m;
    }
    return { maps, names: columns.map((c) => c.meta.name) };
}

/**
 * The styles of a graph from its Cytoscape style and its bypass columns.
 * @param snapshot - the graph
 * @param context - the budget and cancel signal
 * @param style - the file's style
 * @param namespace - the importer's bypass namespace
 * @param notes - where problems are noted
 * @returns the styles
 */
export function readDeclaredStyles(
    snapshot: GraphSnapshot,
    context: StyleReadContext,
    style: CytoscapeStyle,
    namespace: string,
    notes: StyleNotes,
): ImporterStyles {
    const out: Record<StyleTarget, ReaderOutput> = { node: { values: {} }, edge: { values: {} } };
    const readFrom: Record<StyleTarget, string[]> = { node: [], edge: [] };
    for (const target of ["node", "edge"] as const) {
        context.signal?.throwIfAborted();
        const table = target === "node" ? snapshot.nodes : snapshot.edges;
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        for (const m of style[target].mappings.values()) {
            if (!table.has(m.column)) {
                notes.add(STYLE_ISSUE.MAPPING_COLUMN_MISSING, target, m.column, { sample: m.kind });
            }
        }
        const { maps, names } = bypassesOf(table, n, namespace);
        readFrom[target] = names;
        const elements: CytoscapeElements = {
            count: n,
            value: (column, i) => (table.has(column) ? plainCell(table.value(column, i)) : null),
            bypasses: maps,
        };
        const values = resolveCytoscape(target, style, elements, { notes, budget: context.budget });
        const { rules, columns } = cytoscapeRules(target, style, elements, { notes, budget: context.budget });
        out[target] = { values: nonEmpty(values), rules, columns };
    }
    const background = cytoscapeBackground(style, notes);
    return {
        canonical: true,
        dialect: "cytoscape",
        tool: "cytoscape",
        units: "px",
        node: out.node,
        edge: out.edge,
        graph: background === null ? {} : { background },
        notes: notes.list(),
        readFrom,
    };
}

/**
 * The styles of an imported CX version 1 network: the first view's `cyVisualProperties` (other views noted and
 * skipped), its bypasses, and Cytoscape desktop's default style beneath.
 * @param snapshot - the network
 * @param context - what the import kept, the budget and the cancel signal
 * @returns the styles
 */
export function readCxStyles(snapshot: GraphSnapshot, context: StyleReadContext): ImporterStyles {
    const notes = new StyleNotes();
    const kept = context.kept as CxStyleSource | undefined;
    const style = cytoscapeStyleFromCx(kept?.entries ?? [], notes);
    const otherViews = kept?.otherViews ?? 0;
    if (otherViews > 0) {
        notes.add(STYLE_ISSUE.OTHER_VIEWS, null, "cyVisualProperties", {
            sample: `${otherViews} more`,
            count: otherViews,
        });
    }
    return readDeclaredStyles(snapshot, context, style, "cx.bypass", notes);
}

/**
 * The neutral properties a Cytoscape dialect writes, and the graph's background, as writer capabilities.
 * @param dialect - the dialect
 * @returns the capabilities
 */
export function cytoscapeWriteCapabilities(dialect: CytoscapeDialect): StyleWriteCapabilities {
    return Object.freeze({
        node: Object.freeze(cytoscapeWritableProperties("node", dialect) as NodeStyleProperty[]),
        edge: Object.freeze(cytoscapeWritableProperties("edge", dialect) as EdgeStyleProperty[]),
        graph: Object.freeze(["background"] as const),
        // graph-io adds the block as a graph attribute (the writer moves it into an aspect of its own) and the style
        // values the rules read as element attributes
        block: "attributes",
    });
}

/** What the CX version 1 writer holds of a graph's styles. */
export const CX_STYLE_CAPABILITIES: StyleWriteCapabilities = cytoscapeWriteCapabilities("desktop");

/**
 * The dtype a column of written style values gets: numbers, booleans or text (a mixed column as text).
 * @param col - the values
 * @returns the dtype
 */
function valuesDtype(col: StyleColumn): "f64" | "bool" | "string" {
    const kinds = new Set(col.filter((v) => v !== null).map((v) => typeof v));
    if (kinds.size === 1 && kinds.has("number")) {
        return "f64";
    }
    return kinds.size === 1 && kinds.has("boolean") ? "bool" : "string";
}

/** A CX or CX2 export with styles worked out. */
interface CytoscapeStyledExport {
    /** The graph to write: the columns the style's mappings read that the graph does not hold, added. */
    readonly snapshot: GraphSnapshot;
    /** The style, its bypasses (by element index) and the added columns. */
    readonly styled: CytoscapeEmitted;
    /** Every value written approximately or flattened into bypasses, as loss notes. */
    readonly notes: readonly LossNote[];
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
            n.params.target === null || n.params.property === null || n.params.target === "graph"
                ? undefined
                : Object.freeze({ target: n.params.target, property: n.params.property as never }),
    });
}

/**
 * Works out a CX or CX2 export with styles: the Cytoscape style of the rules, the bypasses that make Cytoscape draw
 * exactly what they give, and the snapshot with the columns its mappings read added.
 * @param snapshot - the graph handed to the exporter
 * @param input - the styles, or undefined when none are written
 * @param dialect - `"desktop"` for CX version 1, `"cx2"` for CX2
 * @returns the styled export, or null without styles
 */
export function cytoscapeStyledExport(
    snapshot: GraphSnapshot,
    input: ExporterStyleInput | undefined,
    dialect: CytoscapeDialect,
): CytoscapeStyledExport | null {
    if (input === undefined) {
        return null;
    }
    const notes = new StyleNotes();
    const styled = emitCytoscapeStyle(input.rules, snapshot, { dialect, notes });
    let out: GraphSnapshot = snapshot;
    for (const target of ["node", "edge"] as const) {
        for (const [name, values] of styled.columns[target]) {
            const table = target === "node" ? snapshot.nodes : snapshot.edges;
            if (table.has(name)) {
                continue;
            }
            if (out === snapshot) {
                out = snapshot.withColumns();
            }
            const dtype = valuesDtype(values);
            const col = dtype === "string" ? values.map((v) => (v === null ? null : String(v))) : values;
            (target === "node" ? out.nodes : out.edges).set(name, col, { dtype });
        }
    }
    return { snapshot: out, styled, notes: notes.list().map(lossOf) };
}
