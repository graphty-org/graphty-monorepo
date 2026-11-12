/**
 * The styles of CX version 1 and CX2 files. Both hold one Cytoscape visual style (defaults, mappings and
 * dependencies) and per-element bypasses. The readers resolve every element the way Cytoscape draws it (bypass over
 * mapping over default) and translate the style into neutral rules, with Cytoscape desktop's default style beneath
 * (Cytoscape starts every imported CX or CX2 style as a copy of it). The writers do the reverse: neutral rules
 * become Cytoscape defaults and mappings, everything else per-element bypasses, so Cytoscape draws what graphty
 * draws; the `graphty.styles` block is an aspect of its own and the style values its rules read are attributes.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { type ExplicitWeights, explicitWeights } from "../../common/weights.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import {
    type CytoscapeDialect,
    type CytoscapeEmitted,
    cytoscapeWritableProperties,
    emitCytoscapeStyle,
} from "../../styles/cytoscape/emit.js";
import {
    type CytoscapeStyle,
    cytoscapeStyleFromCx,
    dropMismatchedKeys,
    sharedColumnFallback,
    weightColumnFallback,
} from "../../styles/cytoscape/mappings.js";
import {
    cytoscapeBackground,
    type CytoscapeBypass,
    type CytoscapeElements,
    edgeEnds,
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
import { exactFromBlock, nonEmpty } from "../xgmml/styles.js";

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
    const value = column?.isSet(0) ? column.value(0) : null;
    return typeof value === "string" ? value : null;
}

/** What a CX version 1 import keeps for its styles: the `cyVisualProperties` entries of the imported view. */
export interface CxStyleSource {
    /** The entries, in file order. */
    readonly entries: readonly unknown[];
    /** How many other views the file styles, whose entries were left out. */
    readonly otherViews?: number;
    /** The edge attribute the import read as the weight (its `weightFrom`), or null. */
    readonly weightFrom?: string | null;
    /** Whether the file is a collection (it has `cySubNetworks`), whose elements desktop creates in list order. */
    readonly collection?: boolean;
}

/** What a CX2 import keeps for its styles. */
export interface Cx2StyleSource {
    /** The `visualProperties` aspect. */
    readonly visualProperties: unknown;
    /** The `visualEditorProperties` aspect. */
    readonly visualEditorProperties: unknown;
    /** The edge attribute the import read as the weight (its `weightFrom`), or null. */
    readonly weightFrom?: string | null;
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
 * Points a target's mappings at the columns the import keeps them in (a shared column's plain one, the edge weight
 * column), empties the CX version 1 mappings whose key type the column cannot match, and notes a mapping over a
 * column the graph does not have.
 * @param style - the style, changed in place
 * @param target - nodes or edges
 * @param table - the target's table
 * @param read - where problems are noted, the dialect, and the attribute the import read as the edge weight
 * @param read.notes - where problems are noted
 * @param read.dialect - the Cytoscape dialect the file is written in
 * @param read.weightFrom - the edge attribute the import read as the weight, or null
 * @param read.weights - the weights a mapping over that attribute reads when no column holds them, or null
 */
function fitMappingsToColumns(
    style: CytoscapeStyle,
    target: StyleTarget,
    table: Table,
    read: {
        readonly notes: StyleNotes;
        readonly dialect: CytoscapeDialect;
        readonly weightFrom: string | null;
        readonly weights: ExplicitWeights | null;
    },
): void {
    const { notes } = read;
    sharedColumnFallback(style[target], (column) => table.has(column));
    if (target === "edge") {
        weightColumnFallback(style.edge, read.weightFrom, table);
    }
    // CX2's reader types a mapping's keys by the column; CX version 1 keeps the mapping's own type
    if (read.dialect !== "cx2") {
        dropMismatchedKeys(style[target], (column) => table.get(column)?.meta.origin?.type ?? null, notes, target);
    }
    for (const m of style[target].mappings.values()) {
        if (!table.has(m.column) && !(target === "edge" && read.weights !== null && m.column === read.weightFrom)) {
            notes.add(STYLE_ISSUE.MAPPING_COLUMN_MISSING, target, m.column, { sample: m.kind });
        }
    }
}

/**
 * The edge weights a mapping over the attribute read as the weight reads, when the import kept them as the graph's
 * weights only: no column of that name and no weight column (a CX2 file's integer `weight`). Null otherwise, when
 * the mapping reads a column.
 * @param snapshot - the graph
 * @param weightFrom - the attribute read as the weight, or null
 * @returns the weights, or null
 */
function keptWeights(snapshot: GraphSnapshot, weightFrom: string | null): ExplicitWeights | null {
    if (weightFrom === null || snapshot.edges.has(weightFrom) || snapshot.edges.byRole("weight") !== null) {
        return null;
    }
    const weights = explicitWeights(snapshot);
    return weights.weighted ? weights : null;
}

/**
 * Where a Java `HashMap<Long, ...>` holding these keys (inserted in this order) iterates each, first at 0: its
 * buckets in order (the key's `Long.hashCode` spread by `HashMap.hash`, masked by a capacity grown from 16 until the
 * keys fill at most three quarters of it), each bucket in insertion order. Null when a key is not a non-negative
 * integer (or its digits).
 * @param ids - the keys, in insertion order
 * @returns each key's rank, by insertion index, or null
 */
function javaHashOrder(ids: readonly unknown[]): number[] | null {
    // an id read as text under the `ids` option is still the file's integer
    const keys = ids.map((k) => (typeof k === "string" && /^\d{1,15}$/.test(k) ? Number(k) : k));
    if (!keys.every((k) => typeof k === "number" && Number.isSafeInteger(k) && k >= 0)) {
        return null;
    }
    let capacity = 16;
    while (keys.length > 0.75 * capacity) {
        capacity *= 2;
    }
    const bucket = (k: number): number => {
        // (int) (v ^ (v >>> 32)), then h ^ (h >>> 16)
        const h = ((k % 2 ** 32) ^ Math.floor(k / 2 ** 32)) >>> 0;
        return (h ^ (h >>> 16)) & (capacity - 1);
    };
    const order = keys.map((_, i) => i).sort((a, b) => bucket(keys[a] as number) - bucket(keys[b] as number) || a - b);
    const rank = new Array<number>(keys.length);
    order.forEach((i, r) => {
        rank[i] = r;
    });
    return rank;
}

/**
 * The order Cytoscape desktop creates a CX graph's nodes and edges in when it creates them in hash order: its CX
 * reader files them in `HashMap`s keyed by their ids and creates them as those iterate (`NiceCyRootNetwork.handleNodes`,
 * `addElements`, cx-support 2.8.4), which decides the side it fans parallel edges to. Null when an id is not an
 * integer or an edge has no id.
 * @param snapshot - the graph
 * @returns each node's and edge's rank, or null
 */
export function hashCreationOrder(snapshot: GraphSnapshot): NonNullable<CytoscapeElements["ends"]>["created"] | null {
    const ids = snapshot.edges.byRole("id");
    if (ids === null) {
        return null;
    }
    const node = javaHashOrder(Array.from({ length: snapshot.nodeCount }, (_, i) => snapshot.ids.idOf(i)));
    const edge = javaHashOrder(Array.from({ length: snapshot.edgeCount }, (_, i) => ids.value(i)));
    return node === null || edge === null ? null : { node, edge };
}

/**
 * The styles of a graph from its Cytoscape style and its bypass columns.
 * @param snapshot - the graph
 * @param context - the budget and cancel signal
 * @param style - the file's style
 * @param namespace - the importer's bypass namespace
 * @param notes - where problems are noted
 * @param dialect - the Cytoscape dialect the file is written in
 * @param read - what the import read: the edge attribute it read as the weight (`weightFrom`, or null), and whether
 * Cytoscape desktop creates the file's elements in hash order (`hashOrder`: a CX version 1 file without subnetworks)
 * @param read.weightFrom - the weight attribute, or null
 * @param read.hashOrder - whether desktop creates the elements in hash order
 * @returns the styles
 */
export function readDeclaredStyles(
    snapshot: GraphSnapshot,
    context: StyleReadContext,
    style: CytoscapeStyle,
    namespace: string,
    notes: StyleNotes,
    dialect: CytoscapeDialect = "desktop",
    read: { readonly weightFrom?: string | null; readonly hashOrder?: boolean } = {},
): ImporterStyles {
    const weightFrom = read.weightFrom ?? null;
    const created = read.hashOrder === true ? (hashCreationOrder(snapshot) ?? undefined) : undefined;
    const out: Record<StyleTarget, ReaderOutput> = { node: { values: {} }, edge: { values: {} } };
    const readFrom: Record<StyleTarget, string[]> = { node: [], edge: [] };
    for (const target of ["node", "edge"] as const) {
        context.signal?.throwIfAborted();
        const table = target === "node" ? snapshot.nodes : snapshot.edges;
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const weights = target === "edge" ? keptWeights(snapshot, weightFrom) : null;
        fitMappingsToColumns(style, target, table, { notes, dialect, weightFrom, weights });
        const { maps, names } = bypassesOf(table, n, namespace);
        readFrom[target] = names;
        const elements: CytoscapeElements = {
            count: n,
            value: (column, i) => {
                if (weights !== null && column === weightFrom) {
                    return weights.isExplicit(i) ? weights.value(i) : null;
                }
                return table.has(column) ? plainCell(table.value(column, i)) : null;
            },
            bypasses: maps,
            ...(target === "edge"
                ? { ends: { ...edgeEnds(snapshot, out.node.values), ...(created === undefined ? {} : { created }) } }
                : {}),
        };
        const values = resolveCytoscape(target, style, elements, { notes, budget: context.budget });
        // a file graphty wrote: a value its style writes as the nearest Cytoscape value is the block's
        exactFromBlock(snapshot, target, values, dialect, created);
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
    return readDeclaredStyles(snapshot, context, style, "cx.bypass", notes, "desktop", {
        weightFrom: kept?.weightFrom ?? null,
        hashOrder: kept?.collection !== true,
    });
}

/**
 * The neutral properties a Cytoscape dialect writes, and the graph's background, as writer capabilities.
 * @param dialect - the dialect
 * @returns the capabilities
 */
export function cytoscapeWriteCapabilities(dialect: CytoscapeDialect): StyleWriteCapabilities {
    return Object.freeze({
        tool: "cytoscape",
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
export function lossOf(n: StyleNote): LossNote {
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
    return { snapshot: withMappedColumns(snapshot, styled), styled, notes: notes.list().map(lossOf) };
}

/**
 * The snapshot with the columns the emitted mappings read and it lacks added.
 * @param snapshot - the graph handed to the exporter
 * @param styled - the emitted style
 * @returns the snapshot itself when it lacks none
 */
function withMappedColumns(snapshot: GraphSnapshot, styled: CytoscapeEmitted): GraphSnapshot {
    const missing = (["node", "edge"] as const).flatMap((target) =>
        [...styled.columns[target]]
            .filter(([name]) => !(target === "node" ? snapshot.nodes : snapshot.edges).has(name))
            .map(([name, values]) => ({ target, name, values })),
    );
    if (missing.length === 0) {
        return snapshot;
    }
    const out = snapshot.withColumns();
    for (const { target, name, values } of missing) {
        const dtype = valuesDtype(values);
        const col = dtype === "string" ? values.map((v) => (v === null ? null : String(v))) : values;
        (target === "node" ? out.nodes : out.edges).set(name, col, { dtype });
    }
    return out;
}
