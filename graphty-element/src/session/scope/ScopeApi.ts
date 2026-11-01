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

import {
    type GraphSnapshot,
    INVALID_INDEX,
    makeMask,
    maskCount,
    maskTest,
    maskToIndices,
    type U32,
} from "@graphty/graph-format";

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
    RuleTree,
    RunId,
    Scope,
    ScopeId,
    ScopeInput,
    SetDefinition,
    SetDefinitionInput,
    UnionLeaf,
    UnionStep,
} from "../../catalog/types";
import { canonicalEdgeEnds, pairsOrdered } from "../../data/edgeIdentity";
import { otherIdSpelling } from "../../data/nodeIdSpelling";
import { GraphtyError, isGraphtyError } from "../../errors";
import type { AttributeRevisions, InputTick } from "../attributes";
import { buildHistogram } from "../results/statistics";
import type { ResolvedScope } from "../runs/types";
import { sealedSet } from "../sealed";
import { resolveSet, SetsCache } from "../sets/cache";
import { type Capture, capturedHalves } from "../sets/captures";
import { assertIssued, referentReading, refuseNotePaths } from "../sets/dependencies";
import type { SetWatch } from "../sets/notify";
import {
    type ComponentLabels,
    deriveEdges,
    digestOf,
    filterSourcesIn,
    type NodeHalf,
    type Resolution,
    type ResolveContext,
    resolveCounters,
    resolveNodeHalf,
    resolveScope,
    scopeLeafIn,
} from "../sets/resolve";
import { createSetsApi, sessionEdgeMember, setsStoreOf } from "../sets/SetsApi";
import { scopeSignature } from "../sets/signature";
import type { ElementSet, SetsApi } from "../sets/types";
import type { CodedFact } from "../shared";
import {
    type FilterSources,
    type FilterValueSource,
    readersOf,
    readUnionLeaf,
    type ScopeLeaf,
    type UnionStepSource,
} from "../visibility/filter";
import type { ElementMask } from "./ElementMask";
import { edgeSpaceOf } from "./spaces";
import type { StepRuns } from "./stepRuns";
import {
    canonicalUnion,
    createScopeSteps,
    DEFAULT_BRANCH_PALETTE,
    mapUnions,
    type ScopeStepOptions,
    type StepCheckOptions,
    type StepsReading,
    type StepsWatch,
    type ValueHistogram,
    valueHistogram,
    type ValueHistogramOptions,
} from "./steps";

export type { ComponentLabels } from "../sets/resolve";

/** How many edges {@link ScopeApi.count} looks at when it is allowed to answer approximately. */
export const DEFAULT_SCOPE_SAMPLE = 10_000;

// ---------------------------------------------------------------------------------------------
// The identity spaces
// ---------------------------------------------------------------------------------------------

// In their own module, so a caller that needs only these does not load the resolver.
export { edgeSpaceOf, nodeSpaceOf } from "./spaces";

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
    /** What each load supplied. Absent refuses a rule's `source` leaf. */
    readonly supplied?: FilterSources["supplied"];
    /** The hovered node, else a lone selected node. Absent refuses a step's `"hovered-or-selected"`. */
    readonly focus?: FilterSources["focus"];
    /** The runs a union step's `measure` leaf reads, once built. Absent refuses `measure`. */
    readonly stepRuns?: () => StepRuns | undefined;
    /**
     * Watch the session's inputs, for `watchSteps`. Absent: a watch never hears a change.
     * @param watch - The watch.
     * @returns Stops it.
     */
    readonly subscribe?: (watch: SetWatch<unknown>) => () => void;
    /**
     * The scope a session run read, so a filter step reading a filtered-graph run is refused.
     * @param run - The run.
     * @returns Its scope, or undefined.
     */
    readonly runScopeOf?: (run: RunId) => Scope | undefined;
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

    /**
     * Read a selection live: every branch's and step's count, state, reason and members. `current`
     * is synchronous; the element calls `onChange` itself when data, runs, sets, the hovered node
     * or the selection change what the rule holds. The app never decides when to recount.
     * @param rule - A `union` leaf, or any rule `asUnion` converts (then `options` names the side
     *     and the base).
     * @param onChange - Hears each new reading.
     * @param options - The side and the base, for a rule that is not a union.
     * @param options.side - The side.
     * @param options.within - The base.
     * @returns The watch.
     * @throws `E_BAD_COMMAND` for a malformed rule, or one `asUnion` cannot convert.
     * @beta
     */
    watchSteps(
        rule: RuleTree,
        onChange: (reading: StepsReading) => void,
        options?: { readonly side?: UnionLeaf["side"]; readonly within?: UnionLeaf["within"] },
    ): StepsWatch;
    /**
     * A flat rule as one union leaf (see {@link asUnion}). Writing it back is the caller's choice.
     * With `effect: "exclude"` the leaf holds what the rule leaves (a filter condition that
     * removes, read as what stays): a leaf `r` is all except `r`, an `any` of leaves is all except
     * each, and an `all` of leaves and `not`s is one branch per member. A `union` has no such form.
     * @param rule - The rule.
     * @param options - The side and base.
     * @param options.side - The side.
     * @param options.within - The base.
     * @param options.effect - `"exclude"` for what the rule leaves; absent or `"keep"`, what it holds.
     * @returns The leaf, or null when the rule has no single-union form.
     * @beta
     */
    asUnion(
        rule: RuleTree,
        options: {
            readonly side: UnionLeaf["side"];
            readonly within: UnionLeaf["within"];
            readonly effect?: "keep" | "exclude";
        },
    ): UnionLeaf | null;
    /**
     * The refusal the element would give writing a step on a host, so a picker can grey a value
     * with the element's reason: `circular-scope` for a filter that reads the filtered graph,
     * `reference-outside-union`, `nested-union`, or the error code of any other refusal.
     * @param step - The step.
     * @param options - Where it would be written.
     * @returns The refusal, or null when the step would be accepted.
     * @beta
     */
    checkStep(step: UnionStep, options: StepCheckOptions): CodedFact | null;
    /**
     * Change the run limits and the branch palette. A key absent keeps its value; `undefined`
     * clears it. Not saved, and not an undo step.
     * @param options - The options.
     * @throws `E_OPTION_RANGE` for a negative limit or an empty palette.
     * @beta
     */
    setOptions(options: ScopeStepOptions): void;
    /**
     * The run limits and branch palette in force.
     * @beta
     */
    readonly options: ScopeStepOptions;
    /**
     * How one readable value is distributed over a scope: a data column, a run's field or a
     * structure value (`graphty.degree`), binned when it holds numbers, else counted by value.
     * What a histogram brush and a counted checklist in a step's card read.
     * @param path - The value path.
     * @param options - The scope counted (`within`, the whole graph when absent), the bins and the
     *     reading.
     * @returns The histogram.
     * @beta
     */
    histogram(path: Path, options?: ValueHistogramOptions): ValueHistogram;
    /**
     * The reader's Run: a step that waits on its estimate may start, until its definition changes.
     * @param rule - The union leaf holding the step.
     * @param stepId - The step.
     * @beta
     */
    allowRun(rule: UnionLeaf, stepId: string): void;
    /**
     * Cancel a step's computing run; the step waits again (`run-needed`).
     * @param rule - The union leaf holding the step.
     * @param stepId - The step.
     * @beta
     */
    cancelRun(rule: UnionLeaf, stepId: string): void;
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
     * A rule tree with every union leaf in it given its branch and step ids and branch colors, as
     * a write door stores it.
     * @param value - A rule tree.
     * @returns The tree; the same object when nothing was missing.
     * @throws `E_CAP_EXCEEDED` when a branch needs a color and the palette is used up.
     */
    canonicalUnions<T>(value: T): T;
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

/**
 * The compiler's step source over step runs built later than the resolver.
 * @param stepRuns - The step runs, once built.
 * @returns The source.
 */
function lateStepRuns(stepRuns: () => StepRuns | undefined): UnionStepSource {
    return {
        gate: (step, frame) => stepRuns()?.gate(step, frame) ?? null,
        result: (leaf, frame) => stepRuns()?.result(leaf, frame),
    };
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
 * @param alias - The other spelling of an id, which `has` also answers for.
 * @returns The set.
 */
function idSetOf<TId>(
    mask: U32,
    length: number,
    idOf: (index: number) => TId,
    alias?: (id: TId) => unknown,
): ReadonlySet<TId> {
    resolveCounters.idSetBuilds++;
    // Sealed: a resolved scope is an answer, and a write into it would change nothing it answers.
    return sealedSet(
        (function* ids(): Generator<TId> {
            for (const index of maskToIndices(mask, length)) {
                yield idOf(index);
            }
        })(),
        SCOPE_HINT,
        alias,
    );
}

/** What a caller writing into a resolved scope is told to do instead. */
const SCOPE_HINT = "A resolved scope is an answer; call sets.redefine() to change what a kept set holds.";

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
                nodes ??= idSetOf(resolution.nodes, graph.nodeCount, (index) => graph.ids.idOf(index), otherIdSpelling);
                return nodes;
            },
        },
        edges: {
            enumerable: true,
            get: (): ReadonlySet<EdgeId> => {
                if (edges === null) {
                    const space = edgeSpaceOf(graph);
                    edges = idSetOf(resolution.edges, graph.edgeCount, (index) => space.idOf(index), otherIdSpelling);
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
function frozenDefinition(
    resolution: Resolution,
    graph: GraphSnapshot,
): Extract<SetDefinitionInput, { kind: "fixed" }> {
    const nodes = Array.from(maskToIndices(resolution.nodes, graph.nodeCount), (index) => graph.ids.idOf(index));
    const induced = deriveEdges({ nodes: resolution.nodes, constraint: null, all: false, missingNodes: 0 }, graph);
    if (maskCount(induced, graph.edgeCount) === resolution.edgeCount) {
        return { kind: "fixed", nodes, reading: "induced" };
    }

    const space = edgeSpaceOf(graph);

    return {
        kind: "fixed",
        nodes,
        edges: Array.from(maskToIndices(resolution.edges, graph.edgeCount), (edge) => space.idOf(edge)),
        reading: "listed",
    };
}

/**
 * An exact count of a resolution, with the missing members of a fixed or path set.
 * @param resolution - The resolution.
 * @param kind - The kind of set it resolved, when it resolved one.
 * @returns The count.
 */
function countOf(resolution: Resolution, kind: string | undefined): ScopeCount {
    const count = { nodes: resolution.nodeCount, edges: resolution.edgeCount, exact: true };

    return kind === "fixed" || kind === "path"
        ? { ...count, missingNodes: resolution.missingNodes, missingEdges: resolution.missingEdges }
        : count;
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
                sources.edgeMember === undefined
                    ? sessionEdgeMember(sources.snapshot(), id, () => undefined, null)
                    : sources.edgeMember(id),
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
        ...(sources.supplied === undefined ? {} : { supplied: sources.supplied }),
        ...(sources.focus === undefined ? {} : { focus: sources.focus }),
        ...(sources.stepRuns === undefined ? {} : { steps: lateStepRuns(sources.stepRuns) }),
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
        const member =
            sources.edgeMember === undefined
                ? sessionEdgeMember(sources.snapshot(), ref, () => undefined, null)
                : sources.edgeMember(ref);
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
    const keptRecordOf = (spec: Scope): ElementSet | undefined =>
        typeof spec === "object" && "set" in spec ? kept.get(spec.set) : undefined;

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

        return {
            nodes: maskCount(half.nodes, graph.nodeCount),
            edges: Math.round((found / take) * total),
            exact: false,
            sampled: take,
        };
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
            const named =
                scope === "graph" || scope === "largest-component" || (typeof scope === "object" && "set" in scope);
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

    /**
     * A value with every union leaf in it canonical: a rule tree, or a rule set's definition
     * inside a scope.
     * @param value - The value.
     * @returns The value; the same object when nothing was missing.
     */
    const canonicalUnions = <T>(value: T): T => {
        const palette = steps.options.branchPalette ?? DEFAULT_BRANCH_PALETTE;
        const tree = (where: RuleTree): RuleTree => mapUnions(where, (leaf) => canonicalUnion(leaf, palette));
        const loose = value as { kind?: unknown; where?: unknown; define?: { kind?: unknown; where?: unknown } };
        if (typeof value !== "object" || value === null) {
            return value;
        }

        if (loose.kind === "rule" && typeof loose.where === "object" && loose.where !== null) {
            const where = tree(loose.where as RuleTree);
            return where === loose.where ? value : { ...value, where };
        }

        if (typeof loose.kind === "string") {
            return tree(value as unknown as RuleTree) as T;
        }

        if (loose.define !== undefined) {
            const define = canonicalUnions(loose.define);
            return define === loose.define ? value : { ...value, define };
        }

        return value;
    };

    const steps = createScopeSteps({
        read: (leaf) => readUnionLeaf(sources.snapshot(), leaf, filterSourcesIn(context())),
        reading: {
            scopeOf: (side, bytes) => {
                const graph = sources.snapshot();
                if (side === "nodes") {
                    const nodes: NodeId[] = [];
                    bytes.forEach((byte, index) => {
                        if (byte === 1) {
                            nodes.push(graph.ids.idOf(index));
                        }
                    });
                    return { nodes };
                }

                const space = edgeSpaceOf(graph);
                const edges: EdgeMember[] = [];
                bytes.forEach((byte, index) => {
                    if (byte === 1) {
                        edges.push(stable(space.idOf(index)));
                    }
                });
                return { define: { kind: "fixed", nodes: [], edges, reading: "listed" } };
            },
            indexOf: (side, id) => {
                const graph = sources.snapshot();
                const index = side === "nodes" ? graph.ids.indexOf(id) : edgeSpaceOf(graph).indexOf(id as EdgeId);
                return index === INVALID_INDEX ? -1 : index;
            },
        },
        assertRule: (tree) => {
            parseScope({ define: { kind: "rule", where: tree, reading: "clipped" } });
        },
        signature: (leaf) => scopeSignature({ define: { kind: "rule", where: leaf, reading: "clipped" } }, context()),
        ...(sources.subscribe === undefined ? {} : { subscribe: sources.subscribe }),
        ...(sources.stepRuns === undefined ? {} : { stepRuns: sources.stepRuns }),
        ...(sources.runScopeOf === undefined ? {} : { runScopeOf: sources.runScopeOf }),
        histogramOf: (side, read, within) => {
            const graph = sources.snapshot();
            return valueHistogram({
                count: side === "nodes" ? graph.nodeCount : graph.edgeCount,
                read,
                within,
                unstable: false,
                bin: (column, binning) => buildHistogram(column, binning),
            });
        },
    });

    return {
        resolveNow,

        canonical: scopeOf,

        watchSteps: (rule, onChange, given) => steps.watchSteps(rule, onChange, given),
        asUnion: (rule, given) => steps.asUnion(rule, given),
        checkStep: (step, where) => steps.checkStep(step, where),
        setOptions: (next) => {
            steps.setOptions(next);
        },
        get options(): ScopeStepOptions {
            return steps.options;
        },
        histogram(path: Path, options: ValueHistogramOptions = {}): ValueHistogram {
            const active = context();
            const graph = active.snapshot;
            const sourcesNow = filterSourcesIn(active);
            const { src, dst } = graph.edgeList();
            const leaf = options.within === undefined ? undefined : scopeLeafIn(scopeOf(options.within), active);
            // An induced scope's edges are those between its nodes.
            const edgeIn = (index: number): boolean =>
                leaf !== undefined &&
                (leaf.edges === null
                    ? maskTest(leaf.nodes, src[index]) && maskTest(leaf.nodes, dst[index])
                    : maskTest(leaf.edges, index));
            const scopeEdges =
                leaf === undefined
                    ? undefined
                    : Uint8Array.from({ length: graph.edgeCount }, (_, at) => (edgeIn(at) ? 1 : 0));
            // A structure value (degree) is counted over the scope's own edges, as a step reads it.
            const readers = readersOf(graph, path, sourcesNow, scopeEdges);
            const onNodes = readers.node !== null || readers.edge === null;
            const read = readers.node ?? readers.edge ?? ((): unknown => undefined);
            let within: Uint8Array | null = null;
            if (leaf !== undefined && scopeEdges !== undefined) {
                within = onNodes
                    ? Uint8Array.from({ length: graph.nodeCount }, (_, at) => (maskTest(leaf.nodes, at) ? 1 : 0))
                    : scopeEdges;
            }

            const run = path.startsWith("results.") ? path.split(".")[1] : undefined;
            const field = path.split(".").at(-1);
            const unstable =
                run !== undefined &&
                sourcesNow
                    .result?.(run)
                    ?.fields.some((each) => each.name === field && (each as { unstable?: true }).unstable === true) ===
                    true;
            const degrees = graph.degree();
            return valueHistogram(
                {
                    count: onNodes ? graph.nodeCount : graph.edgeCount,
                    read,
                    within,
                    unstable,
                    ...(onNodes
                        ? { node: (index: number) => ({ degree: degrees[index], id: graph.ids.idOf(index) }) }
                        : {}),
                    bin: (column, binning) => buildHistogram(column, binning),
                },
                options,
            );
        },

        allowRun: (rule, stepId) => {
            steps.allowRun(rule, stepId);
        },
        cancelRun: (rule, stepId) => {
            steps.cancelRun(rule, stepId);
        },

        admit<T>(value: T): T {
            const admitted = stabiliseEdgeRefs(value, stable);
            assertIssued(admitted as Scope, kept);
            refuseNotePaths(admitted as Scope, sources.pathsOf);

            return canonicalUnions(admitted);
        },

        canonicalUnions,

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
                    Object.freeze({
                        id: record.id,
                        name: record.name,
                        spec: projectionOf(record.definition),
                        bound: bound(record),
                    }),
                ),
            );
        },

        remove(id: ScopeId): void {
            sets.remove(id);
        },
    };
}
