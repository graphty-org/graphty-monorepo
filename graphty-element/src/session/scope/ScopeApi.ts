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

import { parseScope } from "../../catalog/sets/parse";
import type { EdgeId, EdgeMember, EdgeRef, NodeId, Path, Query, RunId, Scope, ScopeId, ScopeInput } from "../../catalog/types";
import { edgeCounterOf, edgeIdOf } from "../../data/edgeIdentity";
import { GraphtyError, isGraphtyError } from "../../errors";
import type { AttributeRevisions, InputTick } from "../attributes";
import type { ResolvedScope } from "../runs/types";
import { SetsCache } from "../sets/cache";
import {
    type ComponentLabels,
    digestOf,
    type NodeHalf,
    type Resolution,
    type ResolveContext,
    resolveCounters,
    resolveNodeHalf,
    resolveQuietly,
    resolveScope,
    scopeLeafIn,
} from "../sets/resolve";
import { setsStoreOf } from "../sets/SetsApi";
import type { SetsApi } from "../sets/types";
import type { FilterValueSource, ScopeLeaf } from "../visibility/filter";
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
    /** The kept sets `{ set }` and a rule's `scope` leaf may name, beside the saved scopes. */
    readonly sets?: SetsApi;
    /** The edges a predicate matches. Absent refuses a rule's `edges` leaf. */
    readonly matchEdges?: (where: Query) => Iterable<EdgeId>;
    /** Attribute values. Absent refuses a rule's `range` and `categories` leaves. */
    readonly values?: FilterValueSource;
    /**
     * A session edge's stable identity, so an inline `{ define }` may name edges by session id.
     * Absent refuses a session edge id inside `{ define }`.
     * @param id - The session edge id.
     * @returns The member, or undefined when the graph holds no such edge.
     */
    readonly edgeMember?: (id: EdgeId) => EdgeMember | undefined;
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
     * @param name - The name, unique within the session.
     * @param spec - The specification to keep.
     * @returns The minted id.
     */
    save(name: string, spec: Scope): ScopeId;
    /**
     * Every saved scope, with whether it still refers to anything.
     * @returns The saved scopes, in the order they were saved.
     */
    list(): readonly SavedScope[];
    /**
     * Forget a saved scope. Anything that named it becomes unbound rather than silently empty.
     * @param id - The id to forget.
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
     * What a rule's `scope` leaf speaks, for a pass: never throws, and a reference that cannot be
     * resolved (a cycle, a missing set) speaks nothing.
     * @param spec - The referenced set.
     * @returns The leaf.
     */
    leafOf(spec: Scope): ScopeLeaf;
    /**
     * What a saved scope holds.
     * @param id - Its id.
     * @returns The specification, or undefined when no scope is saved under the id.
     */
    specOf(id: ScopeId): Scope | undefined;
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

/** A saved scope as the resolver holds it, before `bound` is worked out. */
interface SavedRecord {
    /** The minted id. */
    readonly id: ScopeId;
    /** The name it was saved under. */
    readonly name: string;
    /** The specification. */
    readonly spec: Scope;
}

/**
 * The name a minted scope id is built from.
 * @param name - The name the caller saved under.
 * @returns A slug of lower-case letters, digits and hyphens.
 */
function slugOf(name: string): string {
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");

    return slug === "" ? "set" : slug;
}

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
    // Replaced, never mutated, on every write: its identity is part of every signature's epoch.
    let saved = new Map<ScopeId, SavedRecord>();
    const cache = sources.cache ?? new SetsCache();
    const kept = sources.sets === undefined ? undefined : setsStoreOf(sources.sets);

    /**
     * What a resolution reads now.
     * @returns The context over the current snapshot.
     */
    const context = (): ResolveContext => ({
        snapshot: sources.snapshot(),
        store: sources.store ?? null,
        saved,
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
        ...(kept === undefined ? {} : { sets: kept }),
        ...(sources.matchEdges === undefined ? {} : { matchEdges: sources.matchEdges }),
        ...(sources.values === undefined ? {} : { values: sources.values }),
    });

    /**
     * An edge reference in stable form.
     * @param ref - A session edge id or a member.
     * @returns The member.
     * @throws `E_BAD_COMMAND` for a session edge id the graph does not hold.
     */
    const stable = (ref: EdgeRef): EdgeMember => {
        if (typeof ref !== "string") {
            return ref;
        }

        const member = sources.edgeMember?.(ref);
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
     * A write position's scope, canonical: session edge ids inside `{ define }` replaced by their
     * stable members, the definition validated and canonicalised.
     * @param spec - The scope as given.
     * @returns The scope.
     * @throws `E_BAD_COMMAND` when it is not a scope.
     */
    const scopeOf = (spec: ScopeInput): Scope => {
        const {define} = (spec as { define?: { kind?: unknown; edges?: unknown } });
        if (typeof define !== "object" || define === null || !Array.isArray(define.edges) || (define.kind !== "fixed" && define.kind !== "path")) {
            return parseScope(spec);
        }

        const edges = (define.edges as unknown[]).map((step) => {
            if (typeof step === "string") {
                return stable(step);
            }

            return Array.isArray(step) ? step.map((ref: EdgeRef) => stable(ref)) : step;
        });

        return parseScope({ define: { ...define, edges } });
    };

    /**
     * Replace the saved map after a write.
     * @param next - The new map.
     */
    const commit = (next: Map<ScopeId, SavedRecord>): void => {
        saved = next;
        sources.tick?.advance();
    };

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

        return { resolution: resolveScope(spec, active), graph: active.snapshot };
    };

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
     * Whether a saved specification still refers to anything this session can resolve.
     * @param spec - The specification.
     * @param seen - The saved ids already followed.
     * @returns True when resolving it would answer rather than throw or come back empty.
     */
    const canBind = (spec: Scope, seen: Set<ScopeId>): boolean => {
        if (spec === "graph" || spec === "visible") {
            return true;
        }

        if (spec === "selection") {
            return sources.selection !== undefined;
        }

        if (spec === "largest-component") {
            return sources.components !== undefined;
        }

        if ("set" in spec) {
            const record = saved.get(spec.set);

            if (record === undefined || seen.has(spec.set)) {
                return false;
            }

            seen.add(spec.set);

            return canBind(record.spec, seen);
        }

        if ("where" in spec) {
            return sources.match !== undefined;
        }

        if ("define" in spec) {
            return resolveQuietly(() => resolveScope(spec, context()), context()).problem === undefined;
        }

        const graph = sources.snapshot();

        return spec.nodes.some((id) => graph.ids.indexOf(id) !== INVALID_INDEX);
    };

    /**
     * The elements a specification covers, answered without a promise.
     * @param spec - What to resolve.
     * @returns The resolved scope.
     */
    const resolveNow = (spec: Scope): ResolvedScope => {
        assertScope(spec);
        const { resolution, graph } = membershipOf(spec);

        return resolvedScopeOf(resolution, graph, spec);
    };

    return {
        resolveNow,

        specOf: (id: ScopeId) => saved.get(id)?.spec,

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
            // removed set, or one whose definition cannot be evaluated, counts nothing rather than
            // throwing, so a panel counting every row never throws; an id never issued refuses.
            if (typeof spec === "object" && "set" in spec && !saved.has(spec.set)) {
                const record = kept?.get(spec.set);
                if (record !== undefined) {
                    const active = context();

                    return Promise.resolve(countOf(resolveQuietly(() => resolveScope(spec, active), active), record.definition.kind));
                }

                if (kept?.register().has(spec.set) === true) {
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

            for (const record of saved.values()) {
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
            if (typeof spec === "object" && "set" in spec && !saved.has(spec.set)) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: `No saved scope is called "${spec.set}".`,
                    source: "run",
                    target: { kind: "scope", id: spec.set },
                    details: { scope: spec, available: [...saved.keys()] },
                });
            }

            const base = `set_${slugOf(trimmed)}`;
            let id = base;
            let suffix = 2;

            while (saved.has(id)) {
                id = `${base}_${suffix}`;
                suffix += 1;
            }

            commit(new Map(saved).set(id, { id, name: trimmed, spec }));

            return id;
        },

        list(): readonly SavedScope[] {
            return Object.freeze(
                [...saved.values()].map((record) =>
                    Object.freeze({
                        id: record.id,
                        name: record.name,
                        spec: record.spec,
                        bound: canBind(record.spec, new Set<ScopeId>()),
                    }),
                ),
            );
        },

        remove(id: ScopeId): void {
            const next = new Map(saved);
            if (!next.delete(id)) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: `No saved scope is called "${id}", so there is nothing to remove.`,
                    source: "run",
                    target: { kind: "scope", id },
                    details: { available: [...saved.keys()] },
                });
            }

            commit(next);
        },
    };
}
