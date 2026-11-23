/**
 * Derived graphs (design section 7.3): `toUndirected`, `transpose`, `simplified`, `withoutSelfLoops`,
 * `filterEdges`, `inducedSubgraph`, `contract`, `relabel` and `withColumns`, each returning the
 * `SnapshotParts` of a NEW snapshot plus the index maps back to the source (`DerivedParts`), and the
 * `renumberPartition` helper of design section 7.5. GraphSnapshot wraps the parts with
 * `createSnapshot()`; these modules import the class type only, so there is no runtime cycle.
 *
 * This module holds what every derivation shares (the result shape, the core builder, assembling
 * parts, edge grouping) and `withColumns`; the families live beside it: derive-subsets.ts
 * (filterEdges, withoutSelfLoops, inducedSubgraph, relabel), derive-direction.ts (toUndirected,
 * transpose, simplified), derive-contract.ts (contract, renumberPartition) and derive-reduce.ts
 * (the edge column reducers of simplified and contract).
 *
 * Every derived core is built by `buildCore()`, the two stable counting-sort passes of design section
 * 6.3 steps 3-6 over a per-logical-edge list (src, dst, weight) in declared orientation, into a fresh
 * 256-aligned arena (section 10.3), so every derived snapshot inherits invariants I1-I10 by
 * construction and `flags` are computed by the one predicate set in validate.ts (I9).
 *
 * Index-map conventions (design section 7.3): `nodeOrigin` / `edgeOrigin` are NEW -> SOURCE,
 * `nodeRemap` / `edgeRemap` SOURCE -> NEW with INVALID_INDEX for a dropped row and the SURVIVOR's new
 * index for a merged edge; each map is null exactly when its index space is unchanged (same length,
 * identity). New edges are numbered in ascending order of their survivor's source index, so relative
 * edge order is preserved (I14). Attribute tables follow the propagation table of design section
 * 5.11: same node space -> the SAME `AttributeTable` instance; gathered otherwise; `refersTo` values
 * rewritten through the matching remap.
 */

import { sortIntoCore } from "../builder/counting-sort.js";
import { remapTable } from "../columns/remap.js";
import { tableWithColumns } from "../columns/table.js";
import { INVALID_INDEX } from "../constants.js";
import { GraphFormatError } from "../errors.js";
import {
    type ArenaLayout,
    type AttributeTable,
    type ColumnInput,
    type EdgeListView,
    type F32,
    type GraphSnapshot,
    type NodeIdMap,
    type SnapshotFlags,
    type TypedArrayData,
    type U32,
    type WeightReducer,
} from "../types/index.js";
import { type SnapshotParts } from "../types/internal.js";
import { assertOneOf, COLUMN_REDUCERS } from "../util/options.js";
import { isIdentity } from "./validate.js";

// ============================================================ result shape

/** The report of a derived graph: how many source edges were dropped and how many merged into a survivor. */
interface DerivedReport {
    /** Source edges with no counterpart in the derived graph. */
    readonly droppedEdges: number;
    /** Source edges collapsed into another edge (the survivor). */
    readonly mergedEdges: number;
}

/**
 * What a derive function returns: the parts of the new snapshot (null when the operation is the
 * identity and the caller returns the source itself) and the maps of `DerivedGraph`.
 */
export interface DerivedParts {
    /** The parts of the new snapshot, or null for "return this". */
    readonly parts: SnapshotParts | null;
    /** New node index -> source node index, or null when the node space is unchanged. */
    readonly nodeOrigin: U32 | null;
    /** New edge index -> source edge index (survivor), or null when the edge space is unchanged. */
    readonly edgeOrigin: U32 | null;
    /** Source node index -> new node index or INVALID_INDEX, or null when unchanged. */
    readonly nodeRemap: U32 | null;
    /** Source edge index -> new edge index (survivor) or INVALID_INDEX, or null when unchanged. */
    readonly edgeRemap: U32 | null;
    /** contract only: source nodes per block. */
    readonly blockSizes: U32 | null;
    /** Dropped and merged edge counts. */
    readonly report: DerivedReport;
}

export const NO_REPORT: DerivedReport = Object.freeze({ droppedEdges: 0, mergedEdges: 0 });

/**
 * The DerivedParts of an identity operation: the caller returns the source snapshot itself.
 * @returns parts null, every map null, an empty report
 */
export function identityDerived(): DerivedParts {
    return {
        parts: null,
        nodeOrigin: null,
        edgeOrigin: null,
        nodeRemap: null,
        edgeRemap: null,
        blockSizes: null,
        report: NO_REPORT,
    };
}

// ============================================================ core builder (6.3 steps 3-6, 10.3)

/** A per-logical-edge description of a graph in declared orientation: the input of `buildCore()`. */
interface EdgeArrays {
    /** Whether the graph is directed. */
    readonly directed: boolean;
    /** The node count. */
    readonly nodeCount: number;
    /** The logical edge count. */
    readonly edgeCount: number;
    /** Declared source of every edge. */
    readonly src: U32;
    /** Declared target of every edge. */
    readonly dst: U32;
    /** Per-edge f32 weights, or null when unweighted. */
    readonly weights: F32 | null;
}

/** The core a `buildCore()` call produces: exactly the core fields of SnapshotParts. */
interface BuiltCore {
    /** colIdx.length. */
    readonly arcCount: number;
    /** Logical edges with source === target. */
    readonly selfLoopCount: number;
    /** nodeCount + 1 row offsets. */
    readonly rowPtr: U32;
    /** Sorted targets. */
    readonly colIdx: U32;
    /** Per-arc weights, or null. */
    readonly weights: F32 | null;
    /** arcCount entries, or null when the permutation is the identity. */
    readonly arcToEdge: U32 | null;
    /** edgeCount entries, or null when the permutation is the identity. */
    readonly edgeToArc: U32 | null;
    /** The truthful flags (I9). */
    readonly flags: SnapshotFlags;
    /** The arena the arrays are views into, or null when `arena: false`. */
    readonly arena: ArenaLayout | null;
}

/** Options of `buildCore()`. */
interface BuildCoreOptions {
    /** Allocate the arrays inside one 256-aligned arena (default true) or as separate buffers. */
    readonly arena?: boolean | undefined;
}

/**
 * Build the core of a derived graph from a per-logical-edge list in declared orientation: the two
 * stable counting-sort passes of design section 6.3 steps 3-6 (`sortIntoCore` of the builder module,
 * so derived graphs and freezes share one implementation), into a fresh 256-aligned arena unless
 * `arena: false`. Invariants I1-I10 hold by construction and the flags are computed from the stored
 * values (I9). A NaN weight (a reducer summing +Infinity and -Infinity) is E_INVALID_WEIGHT (I8).
 * @param edges - the per-edge arrays; only the first `edgeCount` entries are read
 * @param options - arena or separate buffers
 * @returns the core, the counts and the flags
 */
export function buildCore(edges: EdgeArrays, options: BuildCoreOptions = {}): BuiltCore {
    const result = sortIntoCore(edges, options.arena !== false);
    const { core } = result;
    return {
        arcCount: result.arcCount,
        selfLoopCount: result.selfLoopCount,
        rowPtr: core.rowPtr,
        colIdx: core.colIdx,
        weights: core.weights,
        arcToEdge: core.arcToEdge,
        edgeToArc: core.edgeToArc,
        flags: result.flags,
        arena: core.arena,
    };
}

// ============================================================ assembling parts

/** The side structures of a derived snapshot. */
interface DerivedSides {
    readonly directed: boolean;
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly ids: NodeIdMap;
    readonly nodes: AttributeTable;
    readonly edges: AttributeTable;
    readonly extensions: ReadonlyMap<string, AttributeTable>;
}

/**
 * Combine a built core with the side structures into SnapshotParts (serial null: a new core identity;
 * checksum false: the caller substitutes its own setting).
 * @param source - the source snapshot (label, meta and graph table are carried over)
 * @param core - the built core
 * @param sides - the side structures
 * @returns the parts
 */
export function assembleParts(source: GraphSnapshot, core: BuiltCore, sides: DerivedSides): SnapshotParts {
    return {
        label: source.label,
        serial: null,
        directed: sides.directed,
        nodeCount: sides.nodeCount,
        edgeCount: sides.edgeCount,
        arcCount: core.arcCount,
        selfLoopCount: core.selfLoopCount,
        rowPtr: core.rowPtr,
        colIdx: core.colIdx,
        weights: core.weights,
        arcToEdge: core.arcToEdge,
        edgeToArc: core.edgeToArc,
        flags: core.flags,
        ids: sides.ids,
        nodes: sides.nodes,
        edges: sides.edges,
        graph: source.graph,
        extensions: sides.extensions,
        meta: source.meta,
        arena: core.arena,
        checksum: false,
    };
}

/**
 * Extension tables with refersTo values rewritten through the remaps; the source map itself when
 * neither space changed.
 * @param source - the source snapshot
 * @param nodeRemap - the node remap or null
 * @param edgeRemap - the edge remap or null
 * @returns the extension map to use
 */
export function remapExtensions(
    source: GraphSnapshot,
    nodeRemap: U32 | null,
    edgeRemap: U32 | null,
): ReadonlyMap<string, AttributeTable> {
    if ((nodeRemap === null && edgeRemap === null) || source.extensions.size === 0) {
        return source.extensions;
    }
    const out = new Map<string, AttributeTable>();
    for (const [name, table] of source.extensions) {
        out.set(name, remapTable(table, null, table.rowCount, { node: nodeRemap, edge: edgeRemap }));
    }
    return out;
}

// ============================================================ edge selection and grouping

/**
 * A grouping of source edges into new edges: `remap` (source -> new or INVALID_INDEX), `origin` (new
 * -> survivor = lowest source index of the group) and the new count. Null maps mean "unchanged".
 */
export interface EdgeGrouping {
    readonly count: number;
    readonly remap: U32 | null;
    readonly origin: U32 | null;
    readonly dropped: number;
    readonly merged: number;
}

/**
 * Build the new -> survivor map and count from a source -> new remap whose survivors are numbered in
 * ascending source order.
 * @param remap - source edge -> new edge or INVALID_INDEX, survivors ascending
 * @param count - the new edge count
 * @returns the origin map
 */
function originOf(remap: U32, count: number): U32 {
    const origin = new Uint32Array(count).fill(INVALID_INDEX);
    for (let e = 0; e < remap.length; e++) {
        const d = remap[e];
        if (d !== INVALID_INDEX && origin[d] === INVALID_INDEX) {
            origin[d] = e;
        }
    }
    return origin;
}

/**
 * Turn a per-edge "survivor of e" array (`INVALID_INDEX` = dropped, `e` itself = survivor, another
 * index = merged into that survivor) into an EdgeGrouping with new indices in ascending survivor order.
 * @param survivorOf - source edge -> its survivor, or INVALID_INDEX
 * @returns the grouping; maps null when every edge survives on its own
 */
export function groupingFromSurvivors(survivorOf: U32): EdgeGrouping {
    const edgeCount = survivorOf.length;
    const newIndex = new Uint32Array(edgeCount).fill(INVALID_INDEX);
    let count = 0;
    let dropped = 0;
    let merged = 0;
    for (let e = 0; e < edgeCount; e++) {
        if (survivorOf[e] === e) {
            newIndex[e] = count++;
        } else if (survivorOf[e] === INVALID_INDEX) {
            dropped++;
        } else {
            merged++;
        }
    }
    if (dropped === 0 && merged === 0) {
        return { count, remap: null, origin: null, dropped, merged };
    }
    const remap = new Uint32Array(edgeCount);
    for (let e = 0; e < edgeCount; e++) {
        const s = survivorOf[e];
        remap[e] = s === INVALID_INDEX ? INVALID_INDEX : newIndex[s];
    }
    return { count, remap, origin: originOf(remap, count), dropped, merged };
}

/**
 * Whether two arrays of node indices are the identity selection.
 * @param origin - new -> source
 * @param nodeCount - the source node count
 * @returns true when origin is 0..nodeCount-1
 */
export function isIdentitySelection(origin: U32, nodeCount: number): boolean {
    return origin.length === nodeCount && isIdentity(origin);
}

/**
 * The declared endpoints and weights of the surviving edges, endpoints mapped through `nodeRemap`
 * when given, in new-index order.
 * @param list - the source edge list
 * @param grouping - the grouping (origin null = all edges in order)
 * @param nodeRemap - source node -> new node, or null
 * @returns the edge arrays without weights (weights are reduced separately)
 */
export function gatherEndpoints(
    list: EdgeListView,
    grouping: EdgeGrouping,
    nodeRemap: U32 | null,
): { src: U32; dst: U32 } {
    const { count, origin } = grouping;
    const src = new Uint32Array(count);
    const dst = new Uint32Array(count);
    for (let d = 0; d < count; d++) {
        const e = origin === null ? d : origin[d];
        src[d] = nodeRemap === null ? list.src[e] : nodeRemap[list.src[e]];
        dst[d] = nodeRemap === null ? list.dst[e] : nodeRemap[list.dst[e]];
    }
    return { src, dst };
}

/**
 * Check every reducer of a per-column reducer record (design section 7.3) before anything is built.
 * @param field - the option name
 * @param reducers - the record, or undefined
 */
export function checkReducers(field: string, reducers: Readonly<Record<string, unknown>> | undefined): void {
    if (reducers === undefined) {
        return;
    }
    for (const name of Object.keys(reducers)) {
        assertOneOf(`${field}.${name}`, reducers[name], COLUMN_REDUCERS);
    }
}

/**
 * Reduce per-edge weights over a grouping (design section 7.3): `"first"` keeps the survivor's
 * (lowest index) weight, `"last"` the highest index's, `"sum"` / `"min"` / `"max"` combine the group.
 * On an unweighted source `"sum"` yields the multiplicities as an F32 and every other reducer null.
 * @param weights - the per-edge source weights, or null
 * @param grouping - the grouping
 * @param reducer - the weight reducer
 * @returns the per-new-edge weights, or null
 */
export function reduceWeights(weights: F32 | null, grouping: EdgeGrouping, reducer: WeightReducer): F32 | null {
    const { count, remap, origin } = grouping;
    if (weights === null) {
        return reducer === "sum" ? groupMultiplicities(count, remap) : null;
    }
    if (remap === null || origin === null) {
        return weights;
    }
    const out = new Float32Array(count);
    for (let d = 0; d < count; d++) {
        out[d] = weights[origin[d]];
    }
    if (reducer === "first") {
        return out;
    }
    for (let e = 0; e < remap.length; e++) {
        const d = remap[e];
        if (d === INVALID_INDEX || origin[d] === e) {
            continue;
        }
        foldWeight(out, d, weights[e], reducer);
    }
    return out;
}

/**
 * The group sizes as F32 weights: what `"sum"` yields on an unweighted source.
 * @param count - the new edge count
 * @param remap - old edge -> new edge (INVALID_INDEX when dropped), or null for the identity
 * @returns the per-new-edge multiplicities
 */
function groupMultiplicities(count: number, remap: U32 | null): F32 {
    const out = new Float32Array(count);
    if (remap === null) {
        out.fill(1);
        return out;
    }
    for (let e = 0; e < remap.length; e++) {
        if (remap[e] !== INVALID_INDEX) {
            out[remap[e]]++;
        }
    }
    return out;
}

/**
 * Fold one non-survivor member's weight into its group's weight.
 * @param out - the per-new-edge weights
 * @param d - the group
 * @param w - the member's weight
 * @param reducer - the weight reducer
 */
function foldWeight(out: F32, d: number, w: number, reducer: Exclude<WeightReducer, "first">): void {
    switch (reducer) {
        case "last":
            out[d] = w;
            break;
        case "sum":
            out[d] += w;
            break;
        case "min":
            if (w < out[d]) {
                out[d] = w;
            }
            break;
        case "max":
            if (w > out[d]) {
                out[d] = w;
            }
            break;
        default: {
            const unknown: never = reducer;
            throw new GraphFormatError("E_UNSUPPORTED", `unknown weight reducer ${String(unknown)}`, {
                reducer: unknown,
            });
        }
    }
}

/**
 * The grouping of a per-edge keep predicate: kept edges survive on their own in order, others are
 * dropped.
 * @param edgeCount - the source edge count
 * @param keep - whether edge e is kept
 * @returns the grouping
 */
export function groupingFromPredicate(edgeCount: number, keep: (e: number) => boolean): EdgeGrouping {
    const survivorOf = new Uint32Array(edgeCount);
    for (let e = 0; e < edgeCount; e++) {
        survivorOf[e] = keep(e) ? e : INVALID_INDEX;
    }
    return groupingFromSurvivors(survivorOf);
}

// ============================================================ withColumns

/**
 * `withColumns(nodes, edges)` (design section 7.3): the parts of a snapshot sharing the core, the id
 * map and the SERIAL of the source with a CLONED column set plus the given columns (the graph table is
 * cloned too; extension tables are shared).
 * @param source - the source snapshot
 * @param nodes - node columns to add, keyed by name
 * @param edges - edge columns to add, keyed by name
 * @param arcToEdge - the source's permutation arrays as the constructor holds them (null when identity)
 * @param edgeToArc - see arcToEdge
 * @returns the parts
 */
export function withColumnsParts(
    source: GraphSnapshot,
    nodes: Readonly<Record<string, TypedArrayData | ColumnInput>> | undefined,
    edges: Readonly<Record<string, TypedArrayData | ColumnInput>> | undefined,
    arcToEdge: U32 | null,
    edgeToArc: U32 | null,
): SnapshotParts {
    return {
        label: source.label,
        serial: source.serial,
        directed: source.directed,
        nodeCount: source.nodeCount,
        edgeCount: source.edgeCount,
        arcCount: source.arcCount,
        selfLoopCount: source.selfLoopCount,
        rowPtr: source.rowPtr,
        colIdx: source.colIdx,
        weights: source.weights,
        arcToEdge,
        edgeToArc,
        flags: source.flags,
        ids: source.ids,
        nodes: tableWithColumns(source.nodes, nodes ?? {}),
        edges: tableWithColumns(source.edges, edges ?? {}),
        graph: source.graph.clone(),
        extensions: source.extensions,
        meta: source.meta,
        arena: source.arena,
        checksum: false,
    };
}
