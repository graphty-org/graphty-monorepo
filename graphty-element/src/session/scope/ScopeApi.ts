/**
 * @file Turning a scope specification into the elements it names, and into a digest that says
 * whether two answers are the same answer.
 *
 * A scope is a PARAMETER: every run, layout and export takes one, and it is a noun only when
 * somebody saves it under a name. Resolving one produces the nodes and edges it covers, their
 * counts, the specification it came from, and a digest.
 *
 * THE DIGEST IS OVER THE MEMBERSHIP, AND OVER NOTHING ELSE. Equal digests mean the same nodes
 * and the same edges, whichever specification produced them, and a digest moves the moment the
 * membership does. That is what lets a finished run answer "computed on 200 of 200, now showing
 * 120" with the consumer tracking nothing at all: the run keeps the digest it ran over, the same
 * specification is resolved again, and the two either fold together or they do not. Folding the
 * specification into the digest as well would make `{ set: "core" }` and the specification that
 * set holds two different scopes over one set of elements, which is the opposite of what the
 * digest is for.
 *
 * WHAT A SCOPE'S EDGES ARE, in one rule: the edges whose BOTH endpoints are in the scope's node
 * set, narrowed by the scope's own edge constraint where it has one. Only visibility has such a
 * constraint -- an edge filter can hide an edge whose endpoints are both visible -- and every
 * other specification names nodes, so its edges are induced. An edge with one endpoint outside
 * the scope is not in the scope, because no algorithm can follow it there.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type GraphSnapshot, INVALID_INDEX, makeMask, maskCount, maskTest, maskToIndices, type U32 } from "@graphty/graph-format";

import { parseScope, readingOfScope, stabiliseEdgeRefs } from "../../catalog/sets/parse";
import type {
    EdgeId,
    EdgeMember,
    EdgeReading,
    EdgeRef,
    NodeId,
    Path,
    Query,
    ResultItem,
    RunId,
    Scope,
    ScopeId,
    ScopeInput,
    SetDefinition,
    SetDefinitionInput,
} from "../../catalog/types";
import { canonicalEdgeEnds, edgeCounterOf, edgeIdOf, pairsOrdered } from "../../data/edgeIdentity";
import { GraphtyError, isGraphtyError } from "../../errors";
import type { AttributeRevisions, InputTick } from "../attributes";
import type { ResolvedScope } from "../runs/types";
import { resolveSet, SetsCache } from "../sets/cache";
import { type Capture,capturedHalves } from "../sets/captures";
import { assertIssued, referentReading } from "../sets/dependencies";
import {
    type ComponentLabels,
    deriveEdges,
    digestOf,
    type NodeHalf,
    type Resolution,
    type ResolveContext,
    resolveCounters,
    resolveNodeHalf,
    resolveScope,
    scopeLeafIn,
} from "../sets/resolve";
import { createSetsApi, sessionEdgeMember, setsStoreOf } from "../sets/SetsApi";
import type { ElementSet, SetsApi } from "../sets/types";
import type { FilterSources, FilterValueSource, ScopeLeaf } from "../visibility/filter";
import type { ElementMask, MaskIdSpace } from "./ElementMask";

export type { ComponentLabels } from "../sets/resolve";

/** How many edges {@link ScopeApi.count} looks at when it is allowed to answer approximately. */
export const DEFAULT_SCOPE_SAMPLE = 10_000;

// ---------------------------------------------------------------------------------------------
// The identity spaces
// ---------------------------------------------------------------------------------------------

/**
 * One snapshot's node identity space, for a mask over its nodes.
 * @param snapshot - The snapshot to read.
 * @returns The space, which is the snapshot's own id map.
 */
export function nodeSpaceOf(snapshot: GraphSnapshot): MaskIdSpace<NodeId> {
    return {
        indexOf: (id: NodeId): number => snapshot.ids.indexOf(id),
        idOf: (index: number): NodeId => snapshot.ids.idOf(index),
    };
}

/**
 * One snapshot's edge identity space, for a mask over its edges.
 *
 * It READS the element-assigned counter the store stamped into every edge's `graphty.edgeId`
 * column rather than minting an id out of the endpoints, and that is the whole difference. A
 * minted pair string could not name two edges between one pair -- so under parallel edges only the
 * last of a repeated pair was addressable at all -- and it collided for any node id containing a
 * colon.
 *
 * The reverse lookup is `snapshot.edgeIndexOf`, a lazily built index graph-format already owns
 * over the same column, so there is no hand-built map here to fall out of step with it.
 * @param snapshot - The snapshot to read.
 * @returns The space.
 */
export function edgeSpaceOf(snapshot: GraphSnapshot): MaskIdSpace<EdgeId> {
    const column = snapshot.edges.byRole("id");

    return {
        indexOf: (id: EdgeId): number => {
            const counter = edgeCounterOf(id);
            return counter === INVALID_INDEX ? INVALID_INDEX : snapshot.edgeIndexOf(counter);
        },
        idOf: (edge: number): EdgeId => {
            const counter = column !== null && column.isSet(edge) ? column.value(edge) : undefined;
            return edgeIdOf(typeof counter === "number" ? counter : INVALID_INDEX);
        },
    };
}

// ---------------------------------------------------------------------------------------------
// What the resolver needs from the rest of the session
// ---------------------------------------------------------------------------------------------

/** The visible data scope: what filters and the time window have left showing. */
export interface ScopeVisibilitySource {
    /**
     * The visible nodes.
     * @returns The mask.
     */
    nodes(): ElementMask<NodeId>;
    /**
     * The visible edges, which an edge filter can narrow below the induced set.
     * @returns The mask.
     */
    edges(): ElementMask<EdgeId>;
}

/** The current selection. */
export interface ScopeSelectionSource {
    /**
     * The selected nodes. There is deliberately no edge member: a scope's edges are induced from
     * its nodes, and a selected edge with an unselected endpoint is not an edge any algorithm
     * running over the selection could follow.
     * @returns The mask.
     */
    nodes(): ElementMask<NodeId>;
}

/**
 * Where the resolver reads everything it does not compute itself.
 *
 * Each optional member is a capability that does not exist yet, and its absence is a REFUSAL
 * rather than a quiet widening: a run whose caveats said it covered the largest component while
 * it actually covered the whole graph is a wrong number with a confident label on it, which is
 * worse than an error a consumer can read and act on.
 */
export interface ScopeSources {
    /**
     * The snapshot every scope resolves against.
     * @returns The current snapshot.
     */
    snapshot(): GraphSnapshot;
    /** The store instance every resolution is tagged with. Absent tags them with null. */
    readonly store?: object;
    /** What is visible. Absent means nothing hides anything, so `visible` is the whole graph. */
    readonly visibility?: ScopeVisibilitySource;
    /** What is selected. Absent refuses the `selection` scope. */
    readonly selection?: ScopeSelectionSource;
    /**
     * The connected components. Absent refuses the `largest-component` scope.
     * @returns One component number per node index, and how many there are.
     */
    readonly components?: () => ComponentLabels;
    /**
     * The nodes a predicate matches. Absent refuses a `{ where }` scope.
     *
     * Synchronous, because a run's staleness is read on every progress event and a comparison
     * cannot await.
     * @param where - The predicate.
     * @returns The matching node ids; ones the graph no longer holds are ignored.
     */
    readonly match?: (where: Query) => Iterable<NodeId>;
    /**
     * The paths a predicate's compiled expression reads. With {@link revisions} and
     * {@link executionOf}, what lets a `{ where }` answer be cached: absent, it is resolved on
     * every read.
     * @param where - The predicate.
     * @returns The paths.
     */
    readonly pathsOf?: (where: Query) => readonly Path[];
    /** The node attribute revisions a predicate's cached answer is keyed on. */
    readonly revisions?: AttributeRevisions;
    /** The edge attribute revisions a rule's `edges` leaf is keyed on. */
    readonly edgeRevisions?: AttributeRevisions;
    /**
     * The execution token of a run's current result, which a predicate over its results is keyed
     * on.
     * @param run - The run.
     * @returns The token, or undefined when the run has no result.
     */
    readonly executionOf?: (run: RunId) => string | undefined;
    /** The session input tick; saving or removing a scope advances it. */
    readonly tick?: InputTick;
    /** The resolution cache. A private one when absent. */
    readonly cache?: SetsCache;
    /** The kept sets `{ set }` and a rule's `member` leaf may name, beside the saved scopes. */
    readonly sets?: SetsApi;
    /** The edges a predicate matches. Absent refuses a rule's `edges` leaf. */
    readonly matchEdges?: (where: Query) => Iterable<EdgeId>;
    /** Attribute values. Absent refuses a rule's `range` and `categories` leaves. */
    readonly values?: FilterValueSource;
    /** A run's current result. Absent refuses a rule's `item` leaf and a `threshold` over `results.*`. */
    readonly result?: FilterSources["result"];
    /**
     * What a held item's re-run captured (design/sets 5.2). Absent: nothing was captured.
     * @param item - The item, with its execution.
     * @returns The capture, or undefined.
     */
    readonly captured?: (item: ResultItem) => Capture | undefined;
    /**
     * A session edge's stable identity, so an inline `{ define }` may name edges by session id.
     * Absent refuses a session edge id inside `{ define }`.
     * @param id - The session edge id.
     * @returns The member, or undefined when the graph holds no such edge.
     */
    readonly edgeMember?: (id: EdgeId) => EdgeMember | undefined;
    /**
     * Which halves carry a value path, so an `induced` rule over an edge field resolves to nothing
     * as its status says. Absent: such a leaf is not known to speak edges.
     * @param path - The path.
     * @returns `"node"`, `"edge"`, or both.
     */
    readonly fieldKinds?: (path: Path) => readonly string[];
}

// ---------------------------------------------------------------------------------------------
// The surface
// ---------------------------------------------------------------------------------------------

/** One scope somebody saved under a name. */
export interface SavedScope {
    /** The element-minted id, which is what `{ set: id }` names. */
    readonly id: ScopeId;
    /** The name it was saved under, unique within the session. */
    readonly name: string;
    /** The specification it holds. */
    readonly spec: Scope;
    /**
     * Whether everything the specification refers to is still here: the saved set it names still
     * exists, the capability it needs is present, at least one of its literal node ids is still
     * in the graph. False means resolving it would throw or would answer with nothing.
     */
    readonly bound: boolean;
}

/** How many elements a scope covers. */
export interface ScopeCount {
    /** Nodes in the scope. Always exact -- counting them never needs a sample. */
    readonly nodes: number;
    /** Edges in the scope, estimated when `exact` is false. */
    readonly edges: number;
    /** Whether the edge count was counted rather than estimated. */
    readonly exact: boolean;
    /** How many edges were looked at, when the answer was estimated from a sample. */
    readonly sampled?: number;
    /** For a kept fixed or path set: the node ids it names that the graph does not hold. */
    readonly missingNodes?: number;
    /** For a kept fixed or path set: the edge members (a path's steps) no edge of the graph matches. */
    readonly missingEdges?: number;
}

/** What {@link ScopeApi.count} accepts. */
export interface ScopeCountOptions {
    /** Allow an estimate instead of a walk over every edge. */
    readonly approximate?: boolean;
    /** How many edges to look at when estimating. Defaults to {@link DEFAULT_SCOPE_SAMPLE}. */
    readonly sample?: number;
}

/** Resolving a scope, counting one, and keeping one under a name. */
export interface ScopeApi {
    /**
     * The elements a specification covers.
     * @param spec - What to resolve.
     * @returns The resolved scope.
     */
    resolve(spec: ScopeInput): Promise<ResolvedScope>;
    /**
     * How many elements a specification covers, without materialising them.
     * @param spec - What to count.
     * @param options - Whether an estimate is acceptable, and how big a sample to take.
     * @returns The counts, saying whether the edge count was exact.
     */
    count(spec: ScopeInput, options?: ScopeCountOptions): Promise<ScopeCount>;
    /**
     * Keep a specification under a name, so `{ set: id }` can name it later.
     *
     * It is kept as a set, created from `user`: `{ where }` as a rule, `{ nodes }` as a fixed
     * set, `{ define }` as its definition, `"graph"`, `"largest-component"` and `{ set }` as a
     * rule naming them. `"selection"` and `"visible"` are kept as their current members.
     * @deprecated Use {@link SetsApi.create | session.sets.create}, which takes a definition.
     * @param name - The name, unique among kept sets.
     * @param spec - The specification to keep.
     * @returns The minted id, never one issued before.
     */
    save(name: string, spec: Scope): ScopeId;
    /**
     * Every kept set, as the specification it holds and whether it still refers to anything.
     * @deprecated Use {@link SetsApi.list | session.sets.list}, which returns the definitions.
     * @returns The kept sets, in the order they were created.
     */
    list(): readonly SavedScope[];
    /**
     * Remove a kept set. Anything that named it becomes unbound rather than silently empty.
     * @deprecated Use {@link SetsApi.remove | session.sets.remove}.
     * @param id - The id to remove.
     */
    remove(id: ScopeId): void;
}

/**
 * The resolver a session holds: {@link ScopeApi} plus the synchronous door.
 *
 * `resolve` is a promise because the published surface has to stay the same shape when a session
 * is hosted in a worker. The staleness comparison behind `run.stale` cannot await, so it needs
 * the synchronous answer, and everything under here is synchronous anyway.
 */
export interface ScopeResolver extends ScopeApi {
    /**
     * A write position's scope in canonical form: session edge ids inside `{ define }` replaced by
     * their stable members, the definition validated.
     * @param spec - The scope as given.
     * @returns The canonical scope.
     * @throws `E_BAD_COMMAND` when it is not a scope.
     */
    canonical(spec: ScopeInput): Scope;
    /**
     * What a write door stores, before it validates it: session edge ids inside any nested inline
     * definition replaced by their stable members, and every `{ set }` it names checked as issued
     * in this session (a removed set's id is accepted and reads as detached).
     * @param value - A scope, a rule tree or a set definition, as given.
     * @returns The value, stable; the same object when it held no session edge id.
     * @throws `E_BAD_COMMAND` for a session edge id the graph lacks, or a set id never issued.
     */
    admit<T>(value: T): T;
    /**
     * The elements a specification covers, answered without a promise.
     * @param spec - What to resolve.
     * @returns The resolved scope.
     */
    resolveNow(spec: Scope): ResolvedScope;
    /**
     * The node ids a specification covers, read from its node bitmap: no id `Set` is built.
     * @param spec - What to resolve.
     * @returns The ids, in dense index order.
     */
    nodeIdsOf(spec: Scope): readonly NodeId[];
    /**
     * What a rule's `member` leaf speaks, for a pass: never throws, and a reference that cannot be
     * resolved (a cycle, a missing set) speaks nothing.
     * @param spec - The referenced set.
     * @returns The leaf.
     */
    leafOf(spec: Scope): ScopeLeaf;
    /**
     * A specification's bitmaps, through the resolution cache, with the snapshot they cover.
     * @param spec - What to resolve.
     * @returns The resolution and its snapshot.
     */
    resolutionOf(spec: Scope): { readonly resolution: Resolution; readonly graph: GraphSnapshot };
    /**
     * How a specification reads, following a `{ set }` to its definition.
     * @param spec - The specification.
     * @returns The reading.
     */
    readingOf(spec: Scope): EdgeReading;
    /** The kept sets `save`, `list` and `remove` delegate to. */
    readonly sets: SetsApi;
    /**
     * What a resolution reads now, for an internal reader that resolves through the cache itself.
     * @returns The context over the current snapshot.
     */
    contextNow(): ResolveContext;
}

// ---------------------------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------------------------

/**
 * Check a value is a scope before anything tries to resolve it.
 * @param spec - The value to check.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` when it is not.
 */
function assertScope(spec: Scope): void {
    parseScope(spec);
}

// ---------------------------------------------------------------------------------------------
// The resolver
// ---------------------------------------------------------------------------------------------

/**
 * The ids a bitmap holds, as a frozen `Set`.
 * @param mask - The bitmap.
 * @param length - How many indices it covers.
 * @param idOf - The id at an index.
 * @returns The set.
 */
function idSetOf<TId>(mask: U32, length: number, idOf: (index: number) => TId): ReadonlySet<TId> {
    resolveCounters.idSetBuilds++;
    const ids = new Set<TId>();
    for (const index of maskToIndices(mask, length)) {
        ids.add(idOf(index));
    }

    return ids;
}

/** A resolution and the snapshot it covers. */
interface Membership {
    readonly resolution: Resolution;
    readonly graph: GraphSnapshot;
}

/** What stands behind a resolved scope: its bitmaps, and how to resolve the same spec again now. */
interface ScopeBehind extends Membership {
    /** How the scope reads its edges. */
    readonly reading: EdgeReading;
    /**
     * The same specification resolved against the graph as it stands now.
     * @returns The resolution and its snapshot.
     */
    now(): Membership;
}

/** The resolution behind each resolved scope a resolver dressed, for the internal readers of its bitmaps. */
const resolutionsBehind = new WeakMap<ResolvedScope, ScopeBehind>();

/**
 * The bitmaps behind a resolved scope, and the snapshot they cover. Internal: a run hands its
 * algorithm these rather than the id sets.
 * @param scope - A resolved scope.
 * @returns What stands behind it, or undefined for a scope no resolver dressed.
 */
export function resolutionBehind(scope: ResolvedScope): ScopeBehind | undefined {
    return resolutionsBehind.get(scope);
}

/**
 * Dress a resolution as the published {@link ResolvedScope}. `nodes`, `edges` and `digest` are
 * lazy: each is built on its first read and kept by this object; the digest is memoised on the
 * resolution, so every object dressing one resolution shares one digest computation.
 * @param resolution - The resolution.
 * @param graph - The snapshot it was resolved against.
 * @param spec - What was asked for.
 * @returns The resolved scope, frozen.
 */
function resolvedScopeOf(resolution: Resolution, graph: GraphSnapshot, spec: Scope): ResolvedScope {
    // ponytail: the object keeps its snapshot so a late read of `nodes` still answers for the
    // membership it describes; keep only the id map and the id column if retention matters.
    let nodes: ReadonlySet<NodeId> | null = null;
    let edges: ReadonlySet<EdgeId> | null = null;
    const scope = {};

    Object.defineProperties(scope, {
        nodes: {
            enumerable: true,
            get: (): ReadonlySet<NodeId> => {
                nodes ??= idSetOf(resolution.nodes, graph.nodeCount, (index) => graph.ids.idOf(index));
                return nodes;
            },
        },
        edges: {
            enumerable: true,
            get: (): ReadonlySet<EdgeId> => {
                if (edges === null) {
                    const space = edgeSpaceOf(graph);
                    edges = idSetOf(resolution.edges, graph.edgeCount, (index) => space.idOf(index));
                }

                return edges;
            },
        },
        nodeCount: { enumerable: true, value: resolution.nodeCount },
        edgeCount: { enumerable: true, value: resolution.edgeCount },
        digest: { enumerable: true, get: (): string => digestOf(resolution, graph) },
        spec: { enumerable: true, value: spec },
        // A fresh object per call, so `resolvedAt` is when it was asked rather than when the
        // resolution behind it happened to be cached.
        resolvedAt: { enumerable: true, value: new Date().toISOString() },
    });

    return Object.freeze(scope) as ResolvedScope;
}

/**
 * A resolution's current members as a fixed definition: its nodes read `induced` when its edges
 * are exactly the ones its nodes induce, else its nodes and its edges read `listed`, which holds
 * the same members (design/sets 4.1). Edges are named by session id; the door that keeps the
 * definition turns them into stable members.
 * @param resolution - The resolution.
 * @param graph - The snapshot it was resolved against.
 * @returns The definition.
 */
function frozenDefinition(resolution: Resolution, graph: GraphSnapshot): Extract<SetDefinitionInput, { kind: "fixed" }> {
    const nodes = Array.from(maskToIndices(resolution.nodes, graph.nodeCount), (index) => graph.ids.idOf(index));
    const induced = deriveEdges({ nodes: resolution.nodes, constraint: null, all: false, missingNodes: 0 }, graph);
    if (maskCount(induced, graph.edgeCount) === resolution.edgeCount) {
        return { kind: "fixed", nodes, reading: "induced" };
    }

    const space = edgeSpaceOf(graph);

    return { kind: "fixed", nodes, edges: Array.from(maskToIndices(resolution.edges, graph.edgeCount), (edge) => space.idOf(edge)), reading: "listed" };
}

/**
 * An exact count of a resolution, with the missing members of a fixed or path set.
 * @param resolution - The resolution.
 * @param kind - The kind of set it resolved, when it resolved one.
 * @returns The count.
 */
function countOf(resolution: Resolution, kind: string | undefined): ScopeCount {
    const count = { nodes: resolution.nodeCount, edges: resolution.edgeCount, exact: true };

    return kind === "fixed" || kind === "path" ? { ...count, missingNodes: resolution.missingNodes, missingEdges: resolution.missingEdges } : count;
}

/**
 * Build the scope resolver one session uses.
 *
 * Each specification is resolved through the session's resolution cache
 * (`session/sets/cache.ts`), keyed by its input signature: exactly the inputs it reads -- the
 * snapshot, a mask version, a saved scope's record, the attribute revisions and run results a
 * predicate reads. The reader that asks most often is the staleness check on a finished run, and
 * the digest is memoised on the resolution, so a staleness read over unchanged inputs sums nothing.
 * @param sources - Where to read the graph and the capabilities a narrowing scope needs.
 * @returns The resolver.
 */
export function createScopeApi(sources: ScopeSources): ScopeResolver {
    const cache = sources.cache ?? new SetsCache();
    // A resolver built on its own keeps its own sets, reading edges off the snapshot alone.
    const sets =
        sources.sets ??
        createSetsApi({
            edgeMember: (id: EdgeId) =>
                sources.edgeMember === undefined ? sessionEdgeMember(sources.snapshot(), id, () => undefined, null) : sources.edgeMember(id),
        });
    const kept = setsStoreOf(sets);

    /**
     * What a resolution reads now.
     * @returns The context over the current snapshot.
     */
    const context = (): ResolveContext => {
        const active: ResolveContext = {
            ...base(),
            ...(sources.captured === undefined
                ? {}
                : {
                      captured: (item: ResultItem) => {
                          const capture = sources.captured?.(item);
                          return capture === undefined ? undefined : capturedHalves(capture, active);
                      },
                  }),
        };

        return active;
    };

    /**
     * What a resolution reads now, but the captures.
     * @returns The context over the current snapshot.
     */
    const base = (): ResolveContext => ({
        snapshot: sources.snapshot(),
        store: sources.store ?? null,
        cache,
        ...(sources.visibility === undefined ? {} : { visibility: sources.visibility }),
        ...(sources.selection === undefined ? {} : { selection: sources.selection }),
        ...(sources.components === undefined ? {} : { components: sources.components }),
        ...(sources.match === undefined ? {} : { match: sources.match }),
        ...(sources.pathsOf === undefined ? {} : { pathsOf: sources.pathsOf }),
        ...(sources.revisions === undefined ? {} : { revisions: sources.revisions }),
        ...(sources.edgeRevisions === undefined ? {} : { edgeRevisions: sources.edgeRevisions }),
        ...(sources.executionOf === undefined ? {} : { executionOf: sources.executionOf }),
        ...(sources.tick === undefined ? {} : { tick: sources.tick }),
        sets: kept,
        ...(sources.matchEdges === undefined ? {} : { matchEdges: sources.matchEdges }),
        ...(sources.values === undefined ? {} : { values: sources.values }),
        ...(sources.result === undefined ? {} : { result: sources.result }),
        ...(sources.fieldKinds === undefined ? {} : { fieldKinds: sources.fieldKinds }),
    });

    /**
     * An edge reference in stable form.
     * @param ref - A session edge id or a member.
     * @returns The member.
     * @throws `E_BAD_COMMAND` for a session edge id the graph does not hold.
     */
    const stable = (ref: EdgeRef): EdgeMember => {
        if (typeof ref !== "string") {
            return canonicalEdgeEnds(ref, pairsOrdered(sources.snapshot()));
        }

        // A resolver built without the session's reader reads the snapshot alone: no file ids.
        const member = sources.edgeMember === undefined ? sessionEdgeMember(sources.snapshot(), ref, () => undefined, null) : sources.edgeMember(ref);
        if (member === undefined) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `The graph holds no edge "${ref}". An edge member needs its stable identity, which only a held edge has.`,
                source: "run",
                details: { edge: ref },
            });
        }

        return member;
    };

    /**
     * A write position's scope, canonical: session edge ids inside `{ define }`, at any depth,
     * replaced by their stable members, the definition validated and canonicalised.
     * @param spec - The scope as given.
     * @returns The scope.
     * @throws `E_BAD_COMMAND` when it is not a scope.
     */
    const scopeOf = (spec: ScopeInput): Scope => parseScope(stabiliseEdgeRefs(spec, stable));

    /**
     * The nodes one specification covers, and the edge constraint it came with. Uncached: only an
     * approximate count reads it, and it costs a node pass, not an edge pass.
     * @param spec - The specification.
     * @returns The node half of the resolution.
     */
    const nodesOf = (spec: Scope): NodeHalf => resolveNodeHalf(spec, context());

    /**
     * Everything one specification resolves to, through the cache.
     * @param spec - The specification.
     * @returns The resolution, and the snapshot it was resolved against.
     */
    const membershipOf = (spec: Scope): { resolution: Resolution; graph: GraphSnapshot } => {
        const active = context();
        const record = keptRecordOf(spec);
        if (record === undefined) {
            return { resolution: resolveScope(spec, active), graph: active.snapshot };
        }

        // A kept set resolves through its own entry, which records the pass's outcome for status.
        const resolution = resolveSet(record, active);
        if (resolution.problem !== undefined) {
            throw resolution.problem;
        }

        return { resolution, graph: active.snapshot };
    };

    /**
     * The live kept set a `{ set }` scope names.
     * @param spec - The scope.
     * @returns The record, or undefined for any other scope.
     */
    const keptRecordOf = (spec: Scope): ElementSet | undefined => (typeof spec === "object" && "set" in spec ? kept.get(spec.set) : undefined);

    /**
     * Whether one edge is in scope: both endpoints in the node half, and allowed by the
     * constraint where there is one.
     * @param half - The node half of the resolution.
     * @param edge - The logical edge index.
     * @param source - The edge's source node index.
     * @param target - The edge's target node index.
     * @returns True when the edge is in scope.
     */
    const edgeInScope = (half: NodeHalf, edge: number, source: number, target: number): boolean =>
        maskTest(half.nodes, source) &&
        maskTest(half.nodes, target) &&
        (half.constraint === null || maskTest(half.constraint, edge));

    /**
     * Estimate the edges in scope from an evenly spaced sample.
     *
     * Systematic rather than random, so two counts of one graph agree: a reader who sees 1,203
     * and then 1,198 for a graph nothing touched learns to distrust both numbers.
     * @param spec - The specification.
     * @param graph - The snapshot.
     * @param sample - How many edges to look at.
     * @returns The estimate, and how many edges it was taken from.
     */
    const estimateEdges = (spec: Scope, graph: GraphSnapshot, sample: number): ScopeCount => {
        const total = graph.edgeCount;
        const take = Math.min(sample, total);

        if (take === total) {
            const { resolution } = membershipOf(spec);

            return { nodes: resolution.nodeCount, edges: resolution.edgeCount, exact: true };
        }

        const half = nodesOf(spec);
        const list = graph.edgeList();
        let found = 0;

        for (let step = 0; step < take; step++) {
            const edge = Math.floor((step * total) / take);

            if (edgeInScope(half, edge, list.src[edge], list.dst[edge])) {
                found += 1;
            }
        }

        return { nodes: maskCount(half.nodes, graph.nodeCount), edges: Math.round((found / take) * total), exact: false, sampled: take };
    };

    /**
     * Whether a kept set still refers to anything: it resolves without a problem, and a fixed or
     * path set still has at least one member in the graph.
     * @param record - The set.
     * @returns True when resolving it would answer rather than throw or come back empty.
     */
    const bound = (record: ElementSet): boolean => {
        const resolution = resolveSet(record, context());

        return resolution.problem === undefined && (record.definition.kind === "rule" || resolution.nodeCount > 0);
    };

    /**
     * How a scope reads, following the set it names.
     * @param spec - The scope.
     * @returns The reading.
     */
    const readingOf = (spec: Scope): EdgeReading =>
        readingOfScope(spec, referentReading({ referent: (id) => kept.get(id)?.definition })) as EdgeReading;

    /**
     * The definition `save` keeps a specification as (design/sets 16). The live keywords are
     * frozen into their current members: a kept set that followed the selection would change on
     * every click.
     * @param spec - A checked specification.
     * @returns The definition.
     */
    const definitionOf = (spec: Scope): SetDefinitionInput => {
        if (spec === "selection" || spec === "visible") {
            const { resolution, graph } = membershipOf(spec);
            // The same refusal as createFrom: a save freezes the members, so an empty one would be
            // a set that stays empty, not one that follows later clicks as it did in 2.x.
            if (resolution.nodeCount === 0 && resolution.edgeCount === 0) {
                throw new GraphtyError({
                    code: "E_SCOPE_EMPTY",
                    message: `The ${spec} holds no nodes and no edges, so there is nothing to save. A saved "${spec}" keeps the members it has now.`,
                    source: "run",
                    details: { scope: spec },
                });
            }

            return frozenDefinition(resolution, graph);
        }

        if (spec === "graph" || spec === "largest-component" || "set" in spec) {
            return { kind: "rule", where: { kind: "member", of: spec }, reading: readingOf(spec) };
        }

        if ("where" in spec) {
            return { kind: "rule", where: spec.where, reading: "induced" };
        }

        if ("define" in spec) {
            return spec.define;
        }

        return { kind: "fixed", nodes: spec.nodes, reading: "induced" };
    };

    /**
     * The specification `list` shows for a definition: the form `save` keeps it as, else
     * `{ define }`.
     * @param definition - A kept definition.
     * @returns The specification.
     */
    const projectionOf = (definition: SetDefinition): Scope => {
        if (definition.kind === "fixed" && definition.reading === "induced" && definition.edges === undefined) {
            return { nodes: definition.nodes };
        }

        if (definition.kind === "rule" && definition.reading === "induced" && typeof definition.where === "string") {
            return { where: definition.where };
        }

        if (definition.kind === "rule" && typeof definition.where === "object" && definition.where.kind === "member") {
            const { of: scope } = definition.where;
            const named = scope === "graph" || scope === "largest-component" || (typeof scope === "object" && "set" in scope);
            if (named && definition.reading === readingOf(scope)) {
                return scope;
            }
        }

        return { define: definition };
    };

    /**
     * The elements a specification covers, answered without a promise.
     * @param spec - What to resolve.
     * @returns The resolved scope.
     */
    const resolveNow = (spec: Scope): ResolvedScope => {
        assertScope(spec);
        const { resolution, graph } = membershipOf(spec);
        const resolved = resolvedScopeOf(resolution, graph, spec);
        resolutionsBehind.set(resolved, { resolution, graph, reading: readingOf(spec), now: () => membershipOf(spec) });

        return resolved;
    };

    return {
        resolveNow,

        canonical: scopeOf,

        admit<T>(value: T): T {
            const admitted = stabiliseEdgeRefs(value, stable);
            assertIssued(admitted as Scope, kept);

            return admitted;
        },

        sets,

        resolutionOf(spec: Scope): { resolution: Resolution; graph: GraphSnapshot } {
            assertScope(spec);

            return membershipOf(spec);
        },

        readingOf,

        contextNow: context,

        leafOf(spec: Scope): ScopeLeaf {
            const active = context();
            try {
                return scopeLeafIn(spec, active);
            } catch (error) {
                if (!isGraphtyError(error)) {
                    throw error;
                }

                // Nothing throws in a pass: a reference that cannot be resolved speaks nothing.
                return { nodes: makeMask(active.snapshot.nodeCount), edges: null };
            }
        },

        nodeIdsOf(spec: Scope): readonly NodeId[] {
            assertScope(spec);
            const { resolution, graph } = membershipOf(spec);

            return Array.from(maskToIndices(resolution.nodes, graph.nodeCount), (index) => graph.ids.idOf(index));
        },

        resolve(input: ScopeInput): Promise<ResolvedScope> {
            return Promise.resolve(resolveNow(scopeOf(input)));
        },

        count(input: ScopeInput, options: ScopeCountOptions = {}): Promise<ScopeCount> {
            const spec = scopeOf(input);
            const sample = options.sample ?? DEFAULT_SCOPE_SAMPLE;

            if (!Number.isInteger(sample) || sample <= 0) {
                throw new GraphtyError({
                    code: "E_OPTION_RANGE",
                    message: `A scope count's sample must be a positive integer, not ${String(sample)}.`,
                    source: "run",
                    details: { sample },
                });
            }

            // A kept set is counted from its resolution, which says what it names that is gone. A
            // removed set counts from its kept record; one whose record was dropped, or whose
            // definition cannot be evaluated, counts nothing rather than throwing, so a panel
            // counting every row never throws; an id never issued refuses.
            if (typeof spec === "object" && "set" in spec) {
                const record = kept.get(spec.set);
                if (record !== undefined) {
                    return Promise.resolve(countOf(resolveSet(record, context()), record.definition.kind));
                }

                if (kept.register().has(spec.set) && kept.tombstone(spec.set)?.record === undefined) {
                    return Promise.resolve({ nodes: 0, edges: 0, exact: true });
                }
            }

            const graph = sources.snapshot();

            // The whole graph is two numbers the snapshot already holds, and a session with
            // nothing hidden reaches the same two numbers through "visible".
            if (spec === "graph" || (spec === "visible" && sources.visibility === undefined)) {
                return Promise.resolve({ nodes: graph.nodeCount, edges: graph.edgeCount, exact: true });
            }

            if (options.approximate === true) {
                return Promise.resolve(estimateEdges(spec, graph, sample));
            }

            const { resolution } = membershipOf(spec);

            return Promise.resolve(countOf(resolution, undefined));
        },

        save(name: string, spec: Scope): ScopeId {
            const trimmed = name.trim();
            assertScope(spec);

            if (trimmed === "") {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: "A saved scope needs a name, because the name is what a person finds it by.",
                    source: "run",
                    details: { name },
                });
            }

            for (const record of kept.values()) {
                if (record.name === trimmed) {
                    throw new GraphtyError({
                        code: "E_DUPLICATE_ID",
                        message: `A scope called "${trimmed}" is already saved.`,
                        source: "run",
                        target: { kind: "scope", id: record.id },
                        details: { name: trimmed, id: record.id },
                    });
                }
            }

            // A saved set that names a set nothing holds can only be a mistake, and it is one the
            // caller can still fix at this point.
            if (typeof spec === "object" && "set" in spec && kept.get(spec.set) === undefined) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: `No saved scope is called "${spec.set}".`,
                    source: "run",
                    target: { kind: "scope", id: spec.set },
                    details: { scope: spec, available: kept.list().map((record) => record.id) },
                });
            }

            return sets.create(definitionOf(spec), { name: trimmed });
        },

        list(): readonly SavedScope[] {
            return Object.freeze(
                kept.list().map((record) =>
                    Object.freeze({ id: record.id, name: record.name, spec: projectionOf(record.definition), bound: bound(record) }),
                ),
            );
        },

        remove(id: ScopeId): void {
            sets.remove(id);
        },
    };
}
