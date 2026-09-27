/**
 * @file Synchronous bitmap resolution of every `Scope` form and of fixed definitions, and the
 * edge-member binding a listed set and a path share (design/sets/sets-design.md sections 4.1,
 * 4.2, 6.1, 6.3, 6.4 and 12.3).
 *
 * A resolution is two packed bitmaps in graph-format's mask layout, one over the context
 * snapshot's nodes and one over its edges, tagged with the snapshot serial and the store it was
 * resolved against. It is synchronous because the style and visibility passes need an answer
 * inside the pass; the doors that resolve asynchronously wrap it.
 *
 * Every resolution satisfies the ENDPOINT INVARIANT: an edge bit is set only when both of its
 * endpoints' node bits are. Readings are applied once, at the root: a chain of saved scopes
 * resolves to a node half (plus the visible scope's edge constraint), and the root derives the
 * edges from it.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import {
    type GraphSnapshot,
    INVALID_INDEX,
    makeMask,
    maskCount,
    type U32,
} from "@graphty/graph-format";

import { EMPTY_SUM, hashEdgeMember, type LanePair, membershipDigestOf } from "../../catalog/sets/hash";
import { readingOfScope } from "../../catalog/sets/parse";
import type { EdgeId, EdgeMember, Filter, NodeId, Path, Query, RunId, Scope, ScopeId, SetDefinition, SetId } from "../../catalog/types";
import { EDGE_ID_COLUMN, identityColumnsOf, pairsOrdered } from "../../data/edgeIdentity";
import { GraphtyError, isGraphtyError } from "../../errors";
import type { AttributeRevisions, InputTick } from "../attributes";
import { canonicalize } from "../runs/runId";
import type { ElementMask } from "../scope/ElementMask";
import { compileFilter, type FilterSources, type FilterValueSource, type ScopeLeaf } from "../visibility/filter";
import type { SetsCache } from "./cache";
import { referentReading } from "./dependencies";
import { resolvePath } from "./path";
import { opaqueName } from "./prepare";
import { scopeSignature } from "./signature";

/**
 * Invocation counts the complexity tests read (design/sets plan 1.4). Internal; never reset here.
 * - `edgePasses`: full passes over the edge list; `edgeRowVisits`: edge rows those passes read.
 * - `maskPacks`: byte masks packed into bitmaps.
 * - `digestSums`: masked sums over the hash columns.
 * - `idSetBuilds`: id `Set`s materialised from a bitmap.
 */
export const resolveCounters = {
    edgePasses: 0,
    edgeRowVisits: 0,
    maskPacks: 0,
    digestSums: 0,
    idSetBuilds: 0,
    /** Binding plans built: one per definition and seed version. */
    bindingPlans: 0,
    /** Edge-id column scans that merged against the sorted seeded counters. */
    bindMerges: 0,
    /** Edge-id column scans that binary-searched them, because the column was not monotonic. */
    bindSearches: 0,
    /** Edge passes matching unseeded members by stable identity. */
    identityPasses: 0,
};

/** One resolution: what a scope or a definition covers in one snapshot. */
export interface Resolution {
    /** Node bitmap over the context snapshot's nodes. */
    readonly nodes: U32;
    /** Edge bitmap over the context snapshot's edges. Every set edge has both endpoints set. */
    readonly edges: U32;
    /** How many node bits are set. */
    readonly nodeCount: number;
    /** How many edge bits are set. */
    readonly edgeCount: number;
    /** The serial of the snapshot this was resolved against. */
    readonly serial: number;
    /** The store instance this was resolved against, or null when the context named none. */
    readonly store: object | null;
    /** Named node ids the graph does not hold, one per unresolved entry. */
    readonly missingNodes: number;
    /**
     * Named edge members no edge matches; for a path, the steps none of whose edges are there.
     */
    readonly missingEdges: number;
    /**
     * Of the unmatched edge members, those more than one edge carries (`ambiguous-parallel-edge`):
     * two loads gave two edges the same pair, ordinal and among, and neither is bound.
     */
    readonly ambiguousEdges: number;
    /**
     * Why this resolution is empty when its definition could not be evaluated (a cycle, a missing
     * referent, a capability the session lacks). Only a quiet resolution carries one; a door throws
     * the same error instead.
     */
    readonly problem?: GraphtyError;
}

/** Which connected component each node belongs to. */
export interface ComponentLabels {
    /** One component number per dense node index. */
    readonly labels: ArrayLike<number>;
    /** How many components there are, so the labels are `[0, count)`. */
    readonly count: number;
}

/** Everything a resolution reads that it does not compute. */
export interface ResolveContext {
    /** The context snapshot: the full graph today; a future `within` evaluates here. */
    readonly snapshot: GraphSnapshot;
    /** The node id map; the snapshot's own unless a caller (a counting test) wraps it. */
    readonly ids?: { indexOf(id: NodeId): number };
    /** The store instance the resolution is tagged with. */
    readonly store?: object | null;
    /** What is visible. Absent means nothing hides anything. */
    readonly visibility?: {
        nodes(): ElementMask<NodeId>;
        edges(): ElementMask<EdgeId>;
    };
    /** What is selected. Absent refuses `"selection"`. */
    readonly selection?: { nodes(): ElementMask<NodeId> };
    /** The connected components. Absent refuses `"largest-component"`. */
    readonly components?: () => ComponentLabels;
    /** The nodes a predicate matches. Absent refuses `{ where }`. */
    readonly match?: (where: Query) => Iterable<NodeId>;
    /** The edges a predicate matches. Absent refuses a rule's `edges` leaf. */
    readonly matchEdges?: (where: Query) => Iterable<EdgeId>;
    /** Attribute values. Absent refuses a rule's `range` and `categories` leaves. */
    readonly values?: FilterValueSource;
    /** A run's current result. Absent refuses a rule's `item` leaf and a `threshold` over `results.*`. */
    readonly result?: FilterSources["result"];
    /** What a held item's re-run captured (`./captures`). Absent: nothing was captured. */
    readonly captured?: FilterSources["captured"];
    /**
     * The saved scopes `{ set }` names. Absent: no scope is saved. Replaced, never mutated, on
     * every write, so its identity says whether it moved.
     */
    readonly saved?: ReadonlyMap<ScopeId, { readonly spec: Scope }>;
    /** The kept sets, and the seeds their edge members bind through. */
    readonly sets?: {
        list(): readonly unknown[];
        get(id: SetId): unknown;
        seedsOf(id: SetId): EdgeSeeds | undefined;
    };
    // What an input signature reads (./signature). Without them a query is resolved, never cached.
    /**
     * The paths a query's compiled expression reads.
     * @param where - The query.
     * @returns The paths.
     */
    readonly pathsOf?: (where: Query) => readonly Path[];
    /** The node attribute revisions. */
    readonly revisions?: AttributeRevisions;
    /** The edge attribute revisions, which a rule's `edges` leaf is keyed on. */
    readonly edgeRevisions?: AttributeRevisions;
    /**
     * The token of a run's current result, or undefined when it has none.
     * @param run - The run.
     * @returns The token.
     */
    readonly executionOf?: (run: RunId) => string | undefined;
    /** The session input tick, which scopes the signature memo. Absent: nothing is memoised. */
    readonly tick?: InputTick;
    /** The resolution cache. Absent: every resolution is computed. */
    readonly cache?: SetsCache;
}

/** The node half of a resolution, before the root applies the reading. */
export interface NodeHalf {
    /** The node bitmap. */
    readonly nodes: U32;
    /** The edges the specification allows beyond the induced rule (the visible edges), or null. */
    readonly constraint: U32 | null;
    /** True when the node half is every node and there is no constraint: every edge is in. */
    readonly all: boolean;
    /** Unresolved node entries. */
    readonly missingNodes: number;
}

/**
 * The refusal a scope the session cannot honour yet gets, naming what would honour it.
 * @param spec - What was asked for.
 * @param needs - The capability whose absence is the reason.
 * @returns The error to throw.
 */
function unsupported(spec: Scope, needs: string): GraphtyError {
    return new GraphtyError({
        code: "E_UNSUPPORTED",
        message:
            `This session cannot resolve the ${canonicalize(spec)} scope, because ${needs} is not ` +
            "attached to it. Resolving it anyway would label a result as covering a subset while it " +
            "covered the whole graph.",
        source: "run",
        details: { scope: spec, needs },
    });
}

const packed = new WeakMap<ElementMask<unknown>, { version: number; length: number; bits: U32 }>();

/**
 * A session byte mask as a bitmap, packed once per mask version and length.
 * @param mask - The byte mask.
 * @param length - The element count of the context snapshot.
 * @returns The bitmap. Shared: never written.
 */
function packMask(mask: ElementMask<unknown>, length: number): U32 {
    const cached = packed.get(mask);
    if (cached !== undefined && cached.version === mask.version && cached.length === length) {
        return cached.bits;
    }

    resolveCounters.maskPacks++;
    const bits = mask.pack(length);
    packed.set(mask, { version: mask.version, length, bits });

    return bits;
}

/**
 * Set the bit of every id the graph holds; count the ones it does not.
 * @param ids - The ids.
 * @param mask - The node bitmap to write.
 * @param context - Where the id map is.
 * @returns How many entries the graph does not hold.
 */
function addIds(ids: Iterable<NodeId>, mask: U32, context: ResolveContext): number {
    const map = context.ids ?? context.snapshot.ids;
    let missing = 0;
    for (const id of ids) {
        const index = map.indexOf(id);
        if (index === INVALID_INDEX) {
            missing++;
        } else {
            mask[index >>> 5] |= 1 << (index & 31);
        }
    }

    return missing;
}

/**
 * The largest connected component. A tie goes to the lowest label, so two resolutions of one
 * graph always answer with the same component.
 * @param labels - One component number per node index.
 * @param nodeCount - The snapshot's node count.
 * @returns The node bitmap.
 */
function largestComponent(labels: ComponentLabels, nodeCount: number): U32 {
    const sizes = new Uint32Array(labels.count);
    for (let index = 0; index < nodeCount; index++) {
        sizes[labels.labels[index]] += 1;
    }

    let largest = -1;
    let largestSize = 0;
    for (let component = 0; component < labels.count; component++) {
        if (sizes[component] > largestSize) {
            largestSize = sizes[component];
            largest = component;
        }
    }

    const mask = makeMask(nodeCount);
    for (let index = 0; index < nodeCount; index++) {
        if (labels.labels[index] === largest) {
            mask[index >>> 5] |= 1 << (index & 31);
        }
    }

    return mask;
}

/**
 * The node half of one `Scope`, following saved scopes to what they hold.
 * @param scope - The specification.
 * @param context - What the resolution reads.
 * @param seen - The saved ids already followed, which is how a cycle is caught.
 * @returns The node half.
 * @throws A `GraphtyError` when the specification needs a capability the context lacks, names an
 *     unknown saved scope, or a ring of saved scopes.
 */
export function resolveNodeHalf(scope: Scope, context: ResolveContext, seen: Set<ScopeId> = new Set()): NodeHalf {
    const n = context.snapshot.nodeCount;

    if (scope === "graph") {
        return { nodes: makeMask(n, true), constraint: null, all: true, missingNodes: 0 };
    }

    if (scope === "visible") {
        const { visibility } = context;
        if (visibility === undefined) {
            return { nodes: makeMask(n, true), constraint: null, all: true, missingNodes: 0 };
        }

        return {
            // A copy: a resolution owns its bitmaps, so the cache can count and drop them.
            nodes: packMask(visibility.nodes(), n).slice(),
            constraint: packMask(visibility.edges(), context.snapshot.edgeCount),
            all: false,
            missingNodes: 0,
        };
    }

    if (scope === "selection") {
        if (context.selection === undefined) {
            throw unsupported(scope, "a selection");
        }

        return { nodes: packMask(context.selection.nodes(), n).slice(), constraint: null, all: false, missingNodes: 0 };
    }

    if (scope === "largest-component") {
        if (context.components === undefined) {
            throw unsupported(scope, "the connected components");
        }

        return { nodes: largestComponent(context.components(), n), constraint: null, all: false, missingNodes: 0 };
    }

    if ("define" in scope) {
        return halfOf(resolveDefinitionIn(scope.define, context, [...seen]));
    }

    if ("set" in scope) {
        const record = context.saved?.get(scope.set);
        const kept = record === undefined ? keptDefinition(scope.set, context) : undefined;
        if (kept !== undefined) {
            return halfOf(resolveKept(scope.set, kept, context, [...seen]));
        }

        if (record === undefined) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `No saved scope is called "${scope.set}".`,
                source: "run",
                target: { kind: "scope", id: scope.set },
                details: { scope, available: [...(context.saved?.keys() ?? [])] },
            });
        }

        if (seen.has(scope.set)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `The saved scope "${scope.set}" contains itself, so it names no elements.`,
                source: "run",
                target: { kind: "scope", id: scope.set },
                details: { scope, chain: [...seen, scope.set] },
            });
        }

        seen.add(scope.set);

        return resolveNodeHalf(record.spec, context, seen);
    }

    const nodes = makeMask(n);
    if ("where" in scope) {
        if (context.match === undefined) {
            throw unsupported(scope, "a query engine");
        }

        // A predicate's matches are all held by the graph; one it names that is gone is ignored.
        addIds(context.match(scope.where), nodes, context);

        return { nodes, constraint: null, all: false, missingNodes: 0 };
    }

    return { nodes, constraint: null, all: false, missingNodes: addIds(scope.nodes, nodes, context) };
}

/**
 * A full resolution as a node half: its edges become the constraint, which the endpoint invariant
 * makes exact (the induced edges of its nodes, narrowed to its edges, are its edges).
 * @param resolution - The resolution.
 * @returns The node half.
 */
function halfOf(resolution: Resolution): NodeHalf {
    return { nodes: resolution.nodes, constraint: resolution.edges, all: false, missingNodes: resolution.missingNodes };
}

/**
 * The definition of the kept set an id names, when the context holds one.
 * @param id - The id.
 * @param context - What the resolution reads.
 * @returns The definition, or undefined.
 */
function keptDefinition(id: SetId, context: ResolveContext): SetDefinition | undefined {
    return (context.sets?.get(id) as { readonly definition?: SetDefinition } | undefined)?.definition;
}

/**
 * The refusal of a chain of references that reaches a set already on it.
 * @param id - The set met again.
 * @param seen - The sets followed so far, outermost first.
 * @returns The error; `details.through` is the references followed from `id`, ending with `id`.
 */
function cycleAt(id: SetId, seen: readonly SetId[]): GraphtyError {
    const through = [...seen.slice(seen.indexOf(id) + 1), id];

    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message: `The set "${id}" reaches itself through ${through.map((step) => `"${step}"`).join(", ")}, so it names no elements.`,
        source: "run",
        target: { kind: "scope", id },
        details: { reason: "cycle", through },
    });
}

/**
 * What a kept set covers, followed from a reference: refused when the chain already holds it.
 * @param id - The set.
 * @param definition - Its definition.
 * @param context - What the resolution reads.
 * @param seen - The sets followed so far.
 * @returns The resolution.
 * @throws A `GraphtyError` with `details.reason: "cycle"`, or as the definition's resolution does.
 */
function resolveKept(id: SetId, definition: SetDefinition, context: ResolveContext, seen: readonly SetId[]): Resolution {
    if (seen.includes(id)) {
        throw cycleAt(id, seen);
    }

    return resolveDefinitionIn(definition, context, [...seen, id], id);
}

/**
 * An empty resolution over the context snapshot.
 * @param context - What the resolution reads.
 * @param problem - Why it is empty, when it is empty because it could not be evaluated.
 * @returns The resolution.
 */
function emptyResolution(context: ResolveContext, problem?: GraphtyError): Resolution {
    const { snapshot } = context;
    const empty = resolutionOf(
        { nodes: makeMask(snapshot.nodeCount), constraint: null, all: false, missingNodes: 0 },
        makeMask(snapshot.edgeCount),
        context,
        0,
    );

    return problem === undefined ? empty : Object.freeze({ ...empty, problem });
}

/**
 * Resolve without throwing: a definition that cannot be evaluated resolves to nothing, carrying
 * the refusal as its `problem`. What a pass (the visibility filter, a kept set counted in a panel)
 * uses, because inside a pass nothing throws.
 * @param resolve - The resolution to attempt.
 * @param context - What the resolution reads.
 * @returns The resolution, or an empty one with its problem.
 */
export function resolveQuietly(resolve: () => Resolution, context: ResolveContext): Resolution {
    try {
        return resolve();
    } catch (error) {
        if (!isGraphtyError(error)) {
            throw error;
        }

        return emptyResolution(context, error);
    }
}

/**
 * How a scope reads, following `{ set }` to what it names: `induced` unless the set speaks edges.
 * @param scope - The scope.
 * @param context - What the resolution reads.
 * @returns The reading.
 */
function readingIn(scope: Scope, context: ResolveContext): string {
    return readingOfScope(scope, referentReading({ referent: (id) => context.saved?.get(id)?.spec ?? keptDefinition(id, context) }));
}

/**
 * What a `scope` leaf speaks: the referenced set's nodes, and its edges when its reading is
 * `listed` or `clipped`.
 * @param scope - The referenced set.
 * @param context - What the resolution reads.
 * @param seen - The sets followed so far.
 * @returns The leaf.
 * @throws A `GraphtyError` as the scope's resolution does.
 */
export function scopeLeafIn(scope: Scope, context: ResolveContext, seen: readonly SetId[] = []): ScopeLeaf {
    const resolution = resolveIn(scope, context, seen);

    return { nodes: resolution.nodes, edges: readingIn(scope, context) === "induced" ? null : resolution.edges };
}

/**
 * What a scope covers, following references with the chain so far. Uncached.
 * @param scope - The scope.
 * @param context - What the resolution reads.
 * @param seen - The sets followed so far.
 * @returns The resolution.
 */
function resolveIn(scope: Scope, context: ResolveContext, seen: readonly SetId[]): Resolution {
    if (typeof scope === "object" && "define" in scope) {
        return resolveDefinitionIn(scope.define, context, seen);
    }

    if (typeof scope === "object" && "set" in scope && context.saved?.get(scope.set) === undefined) {
        const kept = keptDefinition(scope.set, context);
        if (kept !== undefined) {
            return resolveKept(scope.set, kept, context, seen);
        }
    }

    const half = resolveNodeHalf(scope, context, new Set(seen));

    return resolutionOf(half, deriveEdges(half, context.snapshot), context, 0);
}

/**
 * A rule's two halves, with the reading applied at the root (design 4.3): a silent node half is
 * every node except under `listed`; `induced` derives the edges; `listed` takes the edge half and
 * its endpoints; `clipped` takes the edge half (every edge when silent) between member nodes.
 * @param definition - A canonical rule.
 * @param context - What the resolution reads.
 * @param seen - The sets followed so far.
 * @returns The resolution.
 * @throws A `GraphtyError` when a leaf needs a capability the context lacks or a reference fails.
 */
function resolveRule(definition: Extract<SetDefinition, { kind: "rule" }>, context: ResolveContext, seen: readonly SetId[]): Resolution {
    const { snapshot } = context;
    const { reading } = definition;
    const tree: Filter = typeof definition.where === "string" ? { kind: "expression", where: definition.where } : definition.where;
    const halves = compileFilter(snapshot, tree, {
        ...(context.match === undefined ? {} : { match: context.match }),
        ...(context.matchEdges === undefined ? {} : { matchEdges: context.matchEdges }),
        ...(context.values === undefined ? {} : { values: context.values }),
        ...(context.result === undefined ? {} : { result: context.result }),
        ...(context.captured === undefined ? {} : { captured: context.captured }),
        ...(context.components === undefined ? {} : { components: context.components }),
        scope: (scope: Scope) => scopeLeafIn(scope, context, seen),
    });

    const n = snapshot.nodeCount;
    const nodes = makeMask(n, halves.node === null && reading !== "listed");
    if (halves.node !== null) {
        for (let index = 0; index < n; index++) {
            if (halves.node(index)) {
                nodes[index >>> 5] |= 1 << (index & 31);
            }
        }
    }

    const half: NodeHalf = { nodes, constraint: null, all: false, missingNodes: 0 };
    if (reading === "induced" || (reading === "clipped" && halves.edge === null)) {
        return resolutionOf(half, deriveEdges(half, snapshot), context, 0);
    }

    const edges = makeMask(snapshot.edgeCount);
    const test = halves.edge;
    if (test !== null) {
        const { src, dst } = snapshot.edgeList();
        resolveCounters.edgePasses++;
        resolveCounters.edgeRowVisits += snapshot.edgeCount;
        for (let edge = 0; edge < snapshot.edgeCount; edge++) {
            if (!test(edge)) {
                continue;
            }

            if (reading === "listed") {
                addEdgeRow(edge, snapshot, nodes, edges);
            } else if ((nodes[src[edge] >>> 5] & (1 << (src[edge] & 31))) !== 0 && (nodes[dst[edge] >>> 5] & (1 << (dst[edge] & 31))) !== 0) {
                edges[edge >>> 5] |= 1 << (edge & 31);
            }
        }
    }

    return resolutionOf(half, edges, context, 0);
}

/**
 * What a definition covers. Opaque content resolves to nothing (design 12.5).
 * @param definition - A canonical definition.
 * @param context - What the resolution reads.
 * @param seen - The kept sets followed so far, this one last when it is kept.
 * @param id - The kept set, whose seeds its edge members bind through; absent for an inline one.
 * @returns The resolution.
 * @throws A `GraphtyError` when a rule cannot be evaluated: a cycle, a missing referent, a
 * capability the context lacks.
 */
export function resolveDefinitionIn(definition: SetDefinition, context: ResolveContext, seen: readonly SetId[] = [], id?: SetId): Resolution {
    if (opaqueName(definition) !== null) {
        return emptyResolution(context);
    }

    const seeds = id === undefined ? undefined : context.sets?.seedsOf(id);
    switch (definition.kind) {
        case "fixed":
            return resolveFixed(definition, context, seeds);
        case "path":
            return resolvePath(definition, context, seeds);
        case "rule":
            return resolveRule(definition, context, seen);
        default:
            return emptyResolution(context);
    }
}

/**
 * The induced (or, with a constraint, clipped) edges of a node half: one pass over the edge list.
 * @param half - The node half.
 * @param snapshot - The context snapshot.
 * @returns The edge bitmap.
 */
export function deriveEdges(half: NodeHalf, snapshot: GraphSnapshot): U32 {
    const count = snapshot.edgeCount;
    if (half.all) {
        return makeMask(count, true);
    }

    const edges = makeMask(count);
    const { nodes, constraint } = half;
    const { src, dst } = snapshot.edgeList();
    resolveCounters.edgePasses++;
    resolveCounters.edgeRowVisits += count;
    for (let edge = 0; edge < count; edge++) {
        const s = src[edge];
        const d = dst[edge];
        if (
            (nodes[s >>> 5] & (1 << (s & 31))) !== 0 &&
            (nodes[d >>> 5] & (1 << (d & 31))) !== 0 &&
            (constraint === null || (constraint[edge >>> 5] & (1 << (edge & 31))) !== 0)
        ) {
            edges[edge >>> 5] |= 1 << (edge & 31);
        }
    }

    return edges;
}

/**
 * Dress a node half and its edges as a resolution.
 * @param half - The node half.
 * @param edges - The edge bitmap.
 * @param context - What was resolved against.
 * @param missingEdges - Unmatched edge members.
 * @param ambiguousEdges - Of those, the ones more than one edge carries.
 * @returns The resolution.
 */
export function resolutionOf(half: NodeHalf, edges: U32, context: ResolveContext, missingEdges: number, ambiguousEdges = 0): Resolution {
    const { snapshot } = context;

    return Object.freeze({
        nodes: half.nodes,
        edges,
        nodeCount: half.all ? snapshot.nodeCount : maskCount(half.nodes, snapshot.nodeCount),
        edgeCount: half.all ? snapshot.edgeCount : maskCount(edges, snapshot.edgeCount),
        serial: snapshot.serial,
        store: context.store ?? null,
        missingNodes: half.missingNodes,
        missingEdges,
        ambiguousEdges,
    });
}

/**
 * What one `Scope` covers, synchronously. Its edges are the ones with both endpoints in its
 * nodes, narrowed by the visible edges for `"visible"` (the clipped reading). Served from
 * `context.cache` while the scope's input signature holds.
 * @param scope - The specification.
 * @param context - What the resolution reads.
 * @returns The resolution.
 * @throws A `GraphtyError` as {@link resolveNodeHalf} does.
 */
export function resolveScope(scope: Scope, context: ResolveContext): Resolution {
    const { cache } = context;
    const signature = cache === undefined ? null : scopeSignature(scope, context, cache.memo);
    const key = signature === null ? "" : canonicalize(scope);
    const cached = signature === null ? undefined : cache?.lookup(key, signature);
    if (cached !== undefined) {
        return cached;
    }

    const resolution = resolveIn(scope, context, []);
    if (signature !== null) {
        cache?.store(key, signature, resolution);
    }

    return resolution;
}

// ---------------------------------------------------------------------------------------------
// Edge-member binding (design/sets/sets-design.md sections 4.2, 6.3 and 12.3).
//
// A member names an edge by its stable identity; a resolution needs the edge's row. Two routes:
//
// - SEEDED: a door that turned a session edge id into a member recorded the counter it came
//   through (the set's seeds). While the snapshot holds that counter, the member is that edge.
//   Counters are never reissued in a session, so a seed can never name a different edge; one
//   whose edge is gone (deleted, or its store replaced) simply is not found.
// - BY IDENTITY: any other member, and a seeded one whose counter is not in the snapshot, binds
//   the one edge whose stable identity it is -- an `id` member the edge whose hash column equals
//   the member's hash, an ordinal member the edge of its pair with that ordinal and among. No
//   edge: missing. More than one: missing, `ambiguous-parallel-edge`, never a guess.
//
// Seeds are what keep two identical-looking edges apart inside a session (two Add data loads each
// giving one id-less edge to one pair have the same identity); by identity is what rebinds after
// a replacing import, a reload or an undo that rebuilds the store.
// ---------------------------------------------------------------------------------------------

/** A member no edge carries. */
const EDGE_MISSING = -1;
/** A member more than one edge carries. */
export const EDGE_AMBIGUOUS = -2;

/**
 * One set's seeds: member key to the session edge counter the member entered the set through.
 * `version` moves on every write, so a binding plan built from an older version is rebuilt.
 */
export interface EdgeSeeds {
    readonly counters: ReadonlyMap<string, number>;
    readonly version: number;
}

/**
 * The key a seed is filed under: the member's fields, types kept, so `1` and `"1"` differ.
 * @param member - The member.
 * @returns The key.
 */
export function edgeMemberKey(member: EdgeMember): string {
    return JSON.stringify([member.source, member.target, member.id ?? null, member.key ?? null, member.ordinal ?? null, member.among ?? null]);
}

/**
 * The binding table's entry for one definition: which members have seeds, sorted by counter, and
 * which do not. Built once per definition and seed version; the snapshot is read per resolution.
 */
interface BindingPlan {
    readonly seeds: EdgeSeeds | undefined;
    readonly version: number;
    /** Seeded counters, ascending. */
    readonly counters: Float64Array;
    /** The member each entry of `counters` belongs to. */
    readonly seeded: Uint32Array;
    /** Members with no seed. */
    readonly unseeded: Uint32Array;
}

const plans = new WeakMap<object, BindingPlan>();
const monotonic = new WeakMap<GraphSnapshot, boolean>();

/**
 * A definition's binding plan, from the table or built.
 * @param key - The frozen definition the members belong to.
 * @param members - Its edge members.
 * @param seeds - Its seeds, if any.
 * @returns The plan.
 */
function planOf(key: object, members: readonly EdgeMember[], seeds: EdgeSeeds | undefined): BindingPlan {
    const cached = plans.get(key);
    if (cached !== undefined && cached.seeds === seeds && cached.version === (seeds?.version ?? 0)) {
        return cached;
    }

    resolveCounters.bindingPlans++;
    const pairs: [counter: number, member: number][] = [];
    const unseeded: number[] = [];
    for (let i = 0; i < members.length; i++) {
        const counter = seeds === undefined || seeds.counters.size === 0 ? undefined : seeds.counters.get(edgeMemberKey(members[i]));
        if (counter === undefined) {
            unseeded.push(i);
        } else {
            pairs.push([counter, i]);
        }
    }

    pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const plan: BindingPlan = {
        seeds,
        version: seeds?.version ?? 0,
        counters: Float64Array.from(pairs, (pair) => pair[0]),
        seeded: Uint32Array.from(pairs, (pair) => pair[1]),
        unseeded: Uint32Array.from(unseeded),
    };
    plans.set(key, plan);

    return plan;
}

/**
 * Whether a snapshot's edge-id column ascends with the row, checked once per snapshot.
 * @param snapshot - The snapshot.
 * @param column - Its edge-id column.
 * @returns True when every row's counter is above the one before.
 */
function isMonotonic(snapshot: GraphSnapshot, column: ArrayLike<number>): boolean {
    let answer = monotonic.get(snapshot);
    if (answer === undefined) {
        answer = true;
        for (let e = 1; e < snapshot.edgeCount; e++) {
            if (column[e] <= column[e - 1]) {
                answer = false;
                break;
            }
        }

        monotonic.set(snapshot, answer);
    }

    return answer;
}

/**
 * Bind seeded members: one scan of the edge-id column against the sorted seeded counters, a
 * linear merge when the column ascends, a binary search per row otherwise.
 * @param plan - The binding plan.
 * @param snapshot - The context snapshot.
 * @param rowOf - Written: the row of each member found.
 */
function bindSeeded(plan: BindingPlan, snapshot: GraphSnapshot, rowOf: Int32Array): void {
    const column = snapshot.edges.typed(EDGE_ID_COLUMN, "u32");
    const { counters, seeded } = plan;
    if (column === null || counters.length === 0) {
        return;
    }

    const ids = column.data;
    const count = snapshot.edgeCount;
    resolveCounters.edgeRowVisits += count;
    if (isMonotonic(snapshot, ids)) {
        resolveCounters.bindMerges++;
        let at = 0;
        for (let e = 0; e < count && at < counters.length; e++) {
            while (at < counters.length && counters[at] < ids[e]) {
                at++;
            }

            for (; at < counters.length && counters[at] === ids[e]; at++) {
                rowOf[seeded[at]] = e;
            }
        }

        return;
    }

    resolveCounters.bindSearches++;
    for (let e = 0; e < count; e++) {
        let low = 0;
        let high = counters.length;
        while (low < high) {
            const mid = (low + high) >>> 1;
            if (counters[mid] < ids[e]) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        for (let at = low; at < counters.length && counters[at] === ids[e]; at++) {
            rowOf[seeded[at]] = e;
        }
    }
}

/**
 * Bind members by stable identity: one edge pass, candidates found by endpoint pair.
 * @param members - Every member.
 * @param which - The members to bind.
 * @param context - What the resolution reads.
 * @param rowOf - Written: each bound member's row, or {@link EDGE_AMBIGUOUS}.
 */
function bindByIdentity(members: readonly EdgeMember[], which: readonly number[], context: ResolveContext, rowOf: Int32Array): void {
    const { snapshot } = context;
    const ids = context.ids ?? snapshot.ids;
    const ordered = pairsOrdered(snapshot);
    const n = snapshot.nodeCount;
    const pairKey = (s: number, t: number): number => (ordered || s <= t ? s * n + t : t * n + s);
    const byPair = new Map<number, number[]>();
    const hashes = new Map<number, LanePair>();
    for (const i of which) {
        const member = members[i];
        const s = ids.indexOf(member.source);
        const t = ids.indexOf(member.target);
        if (s === INVALID_INDEX || t === INVALID_INDEX) {
            continue;
        }

        if (member.id !== undefined) {
            hashes.set(i, hashEdgeMember(member, ordered));
        }

        const key = pairKey(s, t);
        const list = byPair.get(key);
        if (list === undefined) {
            byPair.set(key, [i]);
        } else {
            list.push(i);
        }
    }

    if (byPair.size === 0) {
        return;
    }

    resolveCounters.identityPasses++;
    resolveCounters.edgeRowVisits += snapshot.edgeCount;
    const { edgeHash, edgeOrdinal, edgeAmong } = identityColumnsOf(snapshot);
    const { src, dst } = snapshot.edgeList();
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const candidates = byPair.get(pairKey(src[e], dst[e]));
        if (candidates === undefined) {
            continue;
        }

        for (const i of candidates) {
            const member = members[i];
            const hash = hashes.get(i);
            const match =
                hash === undefined
                    ? member.ordinal !== undefined && edgeOrdinal[e] === member.ordinal && edgeAmong[e] === member.among
                    : edgeHash[2 * e] === hash.a && edgeHash[2 * e + 1] === hash.b;
            if (match) {
                rowOf[i] = rowOf[i] === EDGE_MISSING ? e : EDGE_AMBIGUOUS;
            }
        }
    }
}

/**
 * The row each edge member binds in the context snapshot: seeded first, then by identity.
 * @param key - The frozen definition the members belong to; the binding table is keyed by it.
 * @param members - The members.
 * @param context - What the resolution reads.
 * @param seeds - The set's seeds, if any.
 * @returns One entry per member: its row, {@link EDGE_MISSING} or {@link EDGE_AMBIGUOUS}.
 */
export function bindEdgeMembers(key: object, members: readonly EdgeMember[], context: ResolveContext, seeds?: EdgeSeeds): Int32Array {
    const rowOf = new Int32Array(members.length).fill(EDGE_MISSING);
    if (members.length === 0) {
        return rowOf;
    }

    const plan = planOf(key, members, seeds);
    bindSeeded(plan, context.snapshot, rowOf);
    const rest: number[] = Array.from(plan.unseeded);
    for (const i of plan.seeded) {
        if (rowOf[i] === EDGE_MISSING) {
            rest.push(i);
        }
    }

    bindByIdentity(members, rest, context, rowOf);

    return rowOf;
}

/**
 * Set a row's edge bit and its endpoints' node bits.
 * @param row - The edge row.
 * @param snapshot - The context snapshot.
 * @param nodes - The node bitmap.
 * @param edges - The edge bitmap.
 */
export function addEdgeRow(row: number, snapshot: GraphSnapshot, nodes: U32, edges: U32): void {
    const s = snapshot.edgeSource(row);
    const t = snapshot.edgeTarget(row);
    edges[row >>> 5] |= 1 << (row & 31);
    nodes[s >>> 5] |= 1 << (s & 31);
    nodes[t >>> 5] |= 1 << (t & 31);
}

/**
 * What a fixed definition covers. Its node half is its nodes plus the endpoints of its edges;
 * `induced` derives the edges between them, `listed` binds its edge members.
 * @param definition - A canonical fixed definition.
 * @param context - What the resolution reads.
 * @param seeds - The set's seeds, for a kept set.
 * @returns The resolution.
 */
export function resolveFixed(definition: Extract<SetDefinition, { kind: "fixed" }>, context: ResolveContext, seeds?: EdgeSeeds): Resolution {
    const { snapshot } = context;
    const nodes = makeMask(snapshot.nodeCount);
    const missingNodes = addIds(definition.nodes, nodes, context);
    const listed = definition.edges ?? [];

    for (const member of listed) {
        // Endpoints join the node half; one the graph no longer holds is simply not there.
        for (const end of [member.source, member.target]) {
            const index = (context.ids ?? snapshot.ids).indexOf(end);
            if (index !== INVALID_INDEX) {
                nodes[index >>> 5] |= 1 << (index & 31);
            }
        }
    }

    const half: NodeHalf = { nodes, constraint: null, all: false, missingNodes };
    if (definition.reading === "induced") {
        return resolutionOf(half, deriveEdges(half, snapshot), context, 0);
    }

    const edges = makeMask(snapshot.edgeCount);
    let missing = 0;
    let ambiguous = 0;
    for (const row of bindEdgeMembers(definition, listed, context, seeds)) {
        if (row >= 0) {
            addEdgeRow(row, snapshot, nodes, edges);
        } else {
            missing++;
            ambiguous += row === EDGE_AMBIGUOUS ? 1 : 0;
        }
    }

    return resolutionOf(half, edges, context, missing, ambiguous);
}

/**
 * The member sum of a bitmap over one hash column (two uint32 lanes per row).
 * @param mask - The bitmap.
 * @param length - How many indices it covers.
 * @param column - The hash column.
 * @returns The count and the lane-wise sum.
 */
function maskedSum(mask: U32, length: number, column: Uint32Array): { count: number; sum: LanePair } {
    let a = 0;
    let b = 0;
    let count = 0;
    const words = (length + 31) >>> 5;
    for (let word = 0; word < words; word++) {
        let bits = mask[word];
        while (bits !== 0) {
            const low = bits & -bits;
            const index = (word << 5) + (31 - Math.clz32(low));
            a = (a + column[2 * index]) >>> 0;
            b = (b + column[2 * index + 1]) >>> 0;
            count++;
            bits ^= low;
        }
    }

    return { count, sum: count === 0 ? EMPTY_SUM : { a, b } };
}

const digests = new WeakMap<Resolution, string>();

/**
 * A resolution's `d1:` membership digest: one masked sum over each hash column, computed on first
 * read and memoised on the resolution.
 * @param resolution - The resolution.
 * @param snapshot - The snapshot it was resolved against.
 * @returns The digest.
 * @throws An Error when the snapshot is not the one the resolution was resolved against.
 */
export function digestOf(resolution: Resolution, snapshot: GraphSnapshot): string {
    const cached = digests.get(resolution);
    if (cached !== undefined) {
        return cached;
    }

    if (snapshot.serial !== resolution.serial) {
        throw new Error("A digest must be read against the snapshot its resolution came from.");
    }

    resolveCounters.digestSums++;
    const { nodeHash, edgeHash } = identityColumnsOf(snapshot);
    const digest = membershipDigestOf(
        maskedSum(resolution.nodes, snapshot.nodeCount, nodeHash),
        maskedSum(resolution.edges, snapshot.edgeCount, edgeHash),
    );
    digests.set(resolution, digest);

    return digest;
}
