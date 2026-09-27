/**
 * @file Synchronous bitmap resolution of every `Scope` form and of fixed definitions
 * (design/sets/sets-design.md sections 4.1, 4.2, 6.1, 6.3 and 6.4).
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

import type { EdgeId, NodeId, Query, Scope, ScopeId, SetDefinition } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { canonicalize } from "../runs/runId";
import type { ElementMask } from "../scope/ElementMask";

/**
 * Invocation counts the complexity tests read (design/sets plan 1.4). Internal; never reset here.
 * - `edgePasses`: full passes over the edge list; `edgeRowVisits`: edge rows those passes read.
 * - `maskPacks`: byte masks packed into bitmaps.
 * - `idSetBuilds`: id `Set`s materialised from a bitmap.
 */
export const resolveCounters = { edgePasses: 0, edgeRowVisits: 0, maskPacks: 0, idSetBuilds: 0 };

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
    /** Named edge members no edge matches. */
    readonly missingEdges: number;
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
    /** The saved scopes `{ set }` names. Absent: no scope is saved. */
    readonly saved?: ReadonlyMap<ScopeId, { readonly spec: Scope }>;
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
            nodes: packMask(visibility.nodes(), n),
            constraint: packMask(visibility.edges(), context.snapshot.edgeCount),
            all: false,
            missingNodes: 0,
        };
    }

    if (scope === "selection") {
        if (context.selection === undefined) {
            throw unsupported(scope, "a selection");
        }

        return { nodes: packMask(context.selection.nodes(), n), constraint: null, all: false, missingNodes: 0 };
    }

    if (scope === "largest-component") {
        if (context.components === undefined) {
            throw unsupported(scope, "the connected components");
        }

        return { nodes: largestComponent(context.components(), n), constraint: null, all: false, missingNodes: 0 };
    }

    if ("set" in scope) {
        const record = context.saved?.get(scope.set);
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
 * The induced (or, with a constraint, clipped) edges of a node half: one pass over the edge list.
 * @param half - The node half.
 * @param snapshot - The context snapshot.
 * @returns The edge bitmap.
 */
function deriveEdges(half: NodeHalf, snapshot: GraphSnapshot): U32 {
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
 * @returns The resolution.
 */
function resolutionOf(half: NodeHalf, edges: U32, context: ResolveContext, missingEdges: number): Resolution {
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
    });
}

/**
 * What one `Scope` covers, synchronously. Its edges are the ones with both endpoints in its
 * nodes, narrowed by the visible edges for `"visible"` (the clipped reading).
 * @param scope - The specification.
 * @param context - What the resolution reads.
 * @returns The resolution.
 * @throws A `GraphtyError` as {@link resolveNodeHalf} does.
 */
export function resolveScope(scope: Scope, context: ResolveContext): Resolution {
    const half = resolveNodeHalf(scope, context);

    return resolutionOf(half, deriveEdges(half, context.snapshot), context, 0);
}

/**
 * What a fixed definition covers. Its node half is its nodes plus the endpoints of its edges;
 * `induced` derives the edges between them, `listed` with no edge members has none.
 * @param definition - A canonical fixed definition.
 * @param context - What the resolution reads.
 * @returns The resolution.
 * @throws A `GraphtyError` with `E_UNSUPPORTED` for listed edge members, which bind through the
 *     edge binding table rather than by endpoints.
 */
export function resolveFixed(definition: Extract<SetDefinition, { kind: "fixed" }>, context: ResolveContext): Resolution {
    const { snapshot } = context;
    const nodes = makeMask(snapshot.nodeCount);
    const missingNodes = addIds(definition.nodes, nodes, context);
    const listed = definition.edges ?? [];

    if (definition.reading === "listed" && listed.length > 0) {
        // ponytail: listed edge members bind through the session's edge binding table, which the
        // next plan phase builds; nothing reaches this before then.
        throw new GraphtyError({
            code: "E_UNSUPPORTED",
            message: "A fixed set's listed edge members cannot be resolved yet.",
            source: "run",
            details: { edges: listed.length },
        });
    }

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
    const edges = definition.reading === "induced" ? deriveEdges(half, snapshot) : makeMask(snapshot.edgeCount);

    return resolutionOf(half, edges, context, 0);
}
