/**
 * @file The one input accessor a run reads its graph through (design/sets/sets-design.md section
 * 10.1), and the binding that tells it which scope the run is over.
 *
 * Derivation is SCOPE FIRST: the declared snapshot, then `inducedSubgraph(node bitmap)`, then
 * `filterEdges(edge bitmap)` only when the scope's edges are not all the edges its nodes induce,
 * then `toUndirected` when asked, then `simplified` by the asked merge policy. The scope is applied
 * in declared space before undirecting because `toUndirected` collapses a reciprocal pair into one
 * edge that keeps the lower index's row: undirecting first would hand a thresholded run the weight
 * of a hidden edge. The input is never built by inducing on edge endpoints, so a scope with
 * isolated nodes keeps them.
 *
 * WHOLE-GRAPH SHORTCUT: a scope covering every node and every edge -- or no scope at all -- takes
 * exactly the route the element took before scopes existed: the snapshot unchanged, the store's
 * per-snapshot undirected cache for the undirected view, and the merge of parallel edges.
 *
 * WHO GETS A SCOPED INPUT is decided per algorithm class: only a class declaring
 * `static scopeInput = "subgraph"` is handed its run's scope. Every other class reads the whole
 * graph through the same accessor, because an algorithm that enumerates its nodes from the data
 * manager would otherwise compute over a scoped topology while listing every node.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import {
    type Column,
    type ColumnInput,
    type DerivedGraph,
    type EdgeMask,
    fromEdgeArrays,
    type GraphSnapshot,
    INVALID_INDEX,
    makeMask,
    maskTest,
    type NodeMask,
    type U32,
} from "@graphty/graph-format";

import type { AlgorithmDescriptor, EdgeId, EdgeReading, NodeId } from "../../catalog/types";
import { EDGE_ID_COLUMN, edgeIdOf } from "../../data/edgeIdentity";
import { GraphtyError } from "../../errors";
import type { WeightMeaning } from "../../session/runs/types";
import type { Resolution } from "../../session/sets/resolve";
import type { ColumnValues, InputColumns } from "./columns";
import {
    type DerivedInput,
    DerivedInputs,
    type InputMembership,
    type InputOrientation,
    type SimplifyPolicy,
} from "./derivedInputs";

/** Counts the input tests read: `derivations` is one per graph-format derivation, each a CSR pass. */
export const scopedInputCounters = { derivations: 0 };

/**
 * How an algorithm wants the reader's graph presented: `"directed"` reads the declared
 * orientation, `"undirected"` collapses a reciprocal pair into one edge.
 */
export type AlgorithmGraphMode = "directed" | "undirected";

/** How a run wants its input built. OPEN: may gain members. */
export interface ScopedInputOptions {
    /**
     * How parallel edges merge in `subgraph()`. OPEN UNION. Default "sum", the element's reading
     * of a repeated edge as more connection; shortest paths want "min".
     */
    readonly simplify?: "sum" | "min" | "max" | "none";
    /**
     * The edge attribute that fills the weights, and whether a weight is a distance or a
     * strength. The element fills `graph.weights` (and the subgraph's, merged by `simplify`) from
     * it -- an edge carrying no number there weighs 1 -- and records it as the run's
     * `caveats.weight`. `null` reads the graph unweighted. Absent, the weights are the ones the
     * graph was loaded with (`data.knownFields.edgeWeightPath`), whose meaning the run does not
     * state.
     */
    readonly weight?: WeightMeaning | null;
}

/** What a scoped run computes over (design 10.2). OPEN: may gain members. */
export interface ScopedInput {
    /** The full graph, declared orientation. */
    readonly graph: GraphSnapshot;
    /** The scope's nodes; valid in both orientations (undirecting keeps node rows). */
    readonly nodes: NodeMask;
    /** The scope's edges over the declared `graph` only, whatever orientation was asked. */
    readonly edges: EdgeMask;
    /** True when the scope is the whole graph; `subgraph()` then returns `graph` (or its undirected view). */
    readonly whole: boolean;
    /** How many nodes the scope holds: the set bits of `nodes`. */
    readonly nodeCount: number;
    /** How many edges the scope holds: the set bits of `edges`. */
    readonly edgeCount: number;
    /**
     * The derived compact snapshot in the asked orientation. Lazy, cached, shared. It carries every
     * column {@link ScopedInput.column} has handed out so far, under the same name, so ask for the
     * columns first. An edge column merges by the same rule as the weights: a reciprocal pair the
     * undirected view collapses keeps its lower row's value, and a group of parallel edges is
     * combined by the `simplify` policy (a column that is not numeric keeps the group's first).
     */
    subgraph(): GraphSnapshot;
    /** The weight this input was asked for; undefined when it was not asked (see ScopedInputOptions.weight). */
    readonly weight?: WeightMeaning | null;
    /**
     * The element's id of one edge of `graph`: what an edge result is published under.
     * @param row - The edge's row in `graph`.
     * @returns The id.
     */
    edgeId(row: number): EdgeId;
    /**
     * The ids of every edge of `graph` behind one edge of `subgraph()`: more than one when
     * parallel edges were merged, or a reciprocal pair collapsed into one undirected edge. A value
     * computed for the row belongs to each of them, so publish it under every id.
     * @param row - The edge's row in `subgraph()`.
     * @returns The ids, in `graph` row order.
     */
    subgraphEdgeIds(row: number): readonly EdgeId[];
    /**
     * The column behind a declared "attribute" or "partition" option, over the rows of `graph`:
     * node rows or edge rows, whichever the attribute is carried on. An option naming a result
     * path (`results.<run>.<field>`) reads that run's published values. `column.meta.name` is the
     * path, which is also its name in `subgraph()`.
     * @param optionName - The option's name.
     * @returns The column; a row whose element carries no value is unset.
     * @throws A GraphtyError with E_UNKNOWN_OPTION for an option not declared as an attribute or
     *   partition, or E_OPTION_RANGE when nothing in the graph carries what it names.
     */
    column(optionName: string): Column;
}

/**
 * The element's own input, which also carries the maps back to the declared graph.
 * @internal
 */
export interface ElementScopedInput extends ScopedInput {
    /**
     * The derived snapshot with its maps.
     * @returns The input.
     */
    derived(): DerivedInput;
}

/** The two data-manager members the accessor reads. */
interface SnapshotSource {
    getSnapshot(): GraphSnapshot;
    undirected(snapshot: GraphSnapshot): DerivedGraph;
}

/** A scope resolved against the snapshot it covers. */
export interface ResolvedInputScope {
    readonly resolution: Resolution;
    readonly graph: GraphSnapshot;
    /** How the scope reads its edges, when the resolver knows; the run's caveat is worded from it. */
    readonly reading?: EdgeReading;
}

/** What one run hands its algorithm: the scope, the cache it derives into, and its holder identity. */
export interface RunInput {
    readonly inputs: DerivedInputs;
    /** The run, as the cache's holder. */
    readonly holder: object;
    /**
     * The run's scope over the current snapshot, or null for the whole graph.
     * @returns The scope.
     */
    scope(): ResolvedInputScope | null;
}

/** Which classes declare that they compute over their run's scope. OPEN UNION; "mask" is later. */
export type ScopeInputDeclaration = NonNullable<AlgorithmDescriptor["scopeInput"]>;

const bindings = new WeakMap<object, RunInput>();

/**
 * Whether an algorithm's class declares `static scopeInput = "subgraph"`.
 * @param algorithm - The instance.
 * @returns True when it computes over its scope.
 */
export function declaresScopedInput(algorithm: object): boolean {
    return (algorithm.constructor as { scopeInput?: unknown }).scopeInput === "subgraph";
}

/**
 * The run input an algorithm reads through, when its class declares a scoped input.
 * @param algorithm - The instance.
 * @returns The binding, or undefined for the whole graph.
 */
export function runInputOf(algorithm: object): RunInput | undefined {
    return declaresScopedInput(algorithm) ? bindings.get(algorithm) : undefined;
}

/**
 * The scope of the run an algorithm is publishing for, whatever its class declares: what mask-back
 * masks against.
 * @param algorithm - The instance.
 * @returns The scope over the current snapshot, or null outside a run or for the whole graph.
 */
export function runScopeOf(algorithm: object): ResolvedInputScope | null {
    return bindings.get(algorithm)?.scope() ?? null;
}

/**
 * The orientation an algorithm-graph mode reads.
 * @param mode - `"directed"` or `"undirected"`.
 * @returns The orientation.
 */
export function orientationOf(mode: "directed" | "undirected"): InputOrientation {
    return mode === "undirected" ? "undirected" : "declared";
}

/**
 * One map from the declared edge space onto a derived one, composed from two steps. A step that
 * changed nothing publishes no map, so either may be null.
 * @param first - Declared -> middle, or null.
 * @param second - Middle -> final, or null.
 * @returns The composed map, or null when neither renumbered anything.
 */
function composeEdgeRemap(first: U32 | null, second: U32 | null): U32 | null {
    if (second === null) {
        return first;
    }

    if (first === null) {
        return second;
    }

    const composed = new Uint32Array(first.length);
    for (let edge = 0; edge < first.length; edge++) {
        const middle = first[edge];
        // A dropped edge has nowhere to land in the second space.
        composed[edge] = middle === INVALID_INDEX ? INVALID_INDEX : second[middle];
    }

    return composed;
}

/**
 * Count one derivation.
 * @param derived - What graph-format derived.
 * @returns It.
 */
function counted(derived: DerivedGraph): DerivedGraph {
    scopedInputCounters.derivations++;
    return derived;
}

/**
 * The whole graph in an orientation, merged by a policy: the route every run took before scopes.
 * @param data - The data manager.
 * @param declared - Its snapshot.
 * @param orientation - The orientation.
 * @param simplify - The merge policy.
 * @returns The input.
 */
function wholeInput(
    data: SnapshotSource,
    declared: GraphSnapshot,
    orientation: InputOrientation,
    simplify: SimplifyPolicy,
): DerivedInput {
    // The store derives the undirected view once per snapshot and caches it.
    const oriented = orientation === "undirected" ? data.undirected(declared) : null;
    const base = oriented === null ? declared : oriented.snapshot;
    const collapsed = simplify !== "none" && base.flags.multigraph ? base.simplified({ weights: simplify }) : null;

    return {
        snapshot: collapsed === null ? base : collapsed.snapshot,
        edgeRemap: composeEdgeRemap(oriented?.edgeRemap ?? null, collapsed?.edgeRemap ?? null),
        nodeOrigin: null,
    };
}

/**
 * One derivation step on top of an input: the node space is unchanged, the edge maps compose.
 * @param previous - The input so far.
 * @param next - What graph-format derived from its snapshot.
 * @returns The input after the step.
 */
function chained(previous: DerivedInput, next: DerivedGraph): DerivedInput {
    return {
        snapshot: next.snapshot,
        edgeRemap: composeEdgeRemap(previous.edgeRemap, next.edgeRemap),
        nodeOrigin: previous.nodeOrigin,
    };
}

/**
 * The scope's declared intermediate: induced on its nodes, then filtered to its edges when they are
 * not all the edges those nodes induce.
 * @param membership - The scope's bitmaps.
 * @param declared - The declared snapshot.
 * @returns The intermediate.
 */
function intermediateOf(membership: InputMembership, declared: GraphSnapshot): DerivedInput {
    const induced = counted(declared.inducedSubgraph({ mask: membership.nodes }));
    const remap = induced.edgeRemap;
    const keep = makeMask(induced.snapshot.edgeCount);
    let kept = 0;
    const { edges } = membership;
    for (let word = 0; word < edges.length; word++) {
        let bits = edges[word];
        while (bits !== 0) {
            const low = bits & -bits;
            const edge = word * 32 + (31 - Math.clz32(low));
            bits ^= low;
            if (edge >= declared.edgeCount) {
                continue;
            }

            const target = remap === null ? edge : remap[edge];
            if (target !== INVALID_INDEX) {
                keep[target >>> 5] |= 1 << (target & 31);
                kept++;
            }
        }
    }

    const start: DerivedInput = { snapshot: induced.snapshot, edgeRemap: remap, nodeOrigin: induced.nodeOrigin };
    if (kept === induced.snapshot.edgeCount) {
        return start;
    }

    return chained(start, counted(induced.snapshot.filterEdges(keep)));
}

/**
 * The scope's input in an orientation and merge policy, through the run's cache. Both orientations
 * share the declared intermediate, which the run holds with its finals.
 * @param run - The run.
 * @param membership - The scope's bitmaps.
 * @param declared - The declared snapshot.
 * @param orientation - The orientation.
 * @param simplify - The merge policy.
 * @returns The input.
 */
function scopedInput(
    run: RunInput,
    membership: InputMembership,
    declared: GraphSnapshot,
    orientation: InputOrientation,
    simplify: SimplifyPolicy,
): DerivedInput {
    const { inputs, holder } = run;
    const hit = inputs.get(holder, membership, orientation, simplify);
    if (hit !== undefined) {
        return hit;
    }

    const base =
        inputs.get(holder, membership, "declared", "none") ??
        inputs.put(holder, membership, "declared", "none", intermediateOf(membership, declared), declared);
    let current = base;
    if (orientation === "undirected" && current.snapshot.directed) {
        current = chained(current, counted(current.snapshot.toUndirected()));
    }

    if (simplify !== "none" && current.snapshot.flags.multigraph) {
        current = chained(current, counted(current.snapshot.simplified({ weights: simplify })));
    }

    return current === base ? base : inputs.put(holder, membership, orientation, simplify, current, declared);
}

/**
 * The declared graph with its weights read from an edge attribute: the same nodes, and the same
 * edges in the same rows, so a row of it is a row of the store's snapshot and every mask and edge
 * id carries over.
 * @param declared - The store's snapshot.
 * @param values - The attribute, by edge row; null for an unweighted graph.
 * @returns The snapshot.
 */
function reweighted(declared: GraphSnapshot, values: readonly unknown[] | null): GraphSnapshot {
    const { src, dst } = declared.edgeList();
    const ids = Array.from({ length: declared.nodeCount }, (_, row) => declared.ids.idOf(row));
    const weights =
        values === null
            ? undefined
            : Float64Array.from(values, (value) => (typeof value === "number" && Number.isFinite(value) ? value : 1));

    return fromEdgeArrays({ directed: declared.directed, ids, src, dst, weights });
}

/**
 * The input over a snapshot the run cache does not hold -- a reweighted one, or one carrying the
 * columns a run named -- by the same derivation steps, uncached. A named edge column merges by
 * the same rule as the weights: the lower row of a collapsed reciprocal pair, then the `simplify`
 * policy over a group of parallel edges (a column that is not numeric keeps the group's first).
 * @param declared - The snapshot.
 * @param membership - The scope's bitmaps, or null for the whole graph.
 * @param orientation - The orientation.
 * @param simplify - The merge policy.
 * @param numeric - The named edge columns that hold numbers.
 * @returns The input.
 */
function uncachedInput(
    declared: GraphSnapshot,
    membership: InputMembership | null,
    orientation: InputOrientation,
    simplify: SimplifyPolicy,
    numeric: readonly string[] = [],
): DerivedInput {
    let current: DerivedInput =
        membership === null
            ? { snapshot: declared, edgeRemap: null, nodeOrigin: null }
            : intermediateOf(membership, declared);
    if (orientation === "undirected" && current.snapshot.directed) {
        current = chained(current, counted(current.snapshot.toUndirected()));
    }

    if (simplify !== "none" && current.snapshot.flags.multigraph) {
        const edgeReducers = Object.fromEntries(numeric.map((name) => [name, simplify]));
        current = chained(current, counted(current.snapshot.simplified({ weights: simplify, edgeReducers })));
    }

    return current;
}

/**
 * The rows of `graph` behind each edge row of a derived input.
 * @param derived - The input.
 * @param declaredEdges - How many edges `graph` has.
 * @returns The groups, by derived edge row.
 */
function edgeGroups(derived: DerivedInput, declaredEdges: number): number[][] {
    const groups = Array.from({ length: derived.snapshot.edgeCount }, (): number[] => []);
    const { edgeRemap } = derived;
    for (let row = 0; row < declaredEdges; row++) {
        const target = edgeRemap === null ? row : edgeRemap[row];
        if (target !== INVALID_INDEX && target < groups.length) {
            groups[target].push(row);
        }
    }

    return groups;
}

/**
 * Refuse a path nothing carries.
 * @param what - What named it: an option, or the weight.
 * @param path - The path.
 * @returns The error.
 */
function nothingCarries(what: string, path: string): GraphtyError {
    return new GraphtyError({
        code: "E_OPTION_RANGE",
        message: `no node or edge carries "${path}", which ${what} names`,
        source: "run",
        details: { option: what, path },
    });
}

/**
 * The input one algorithm reads, in one orientation.
 * @param data - The data manager.
 * @param orientation - The orientation.
 * @param options - The merge policy and the weight.
 * @param run - The run's binding, when the algorithm declares a scoped input and runs as a run.
 * @param columns - Where attribute and result columns are read; absent, `column()` refuses.
 * @returns The input.
 * @throws An Error when the run's scope was resolved against another snapshot than the current one.
 */
export function createScopedInput(
    data: SnapshotSource,
    orientation: InputOrientation,
    options?: ScopedInputOptions,
    run?: RunInput,
    columns?: InputColumns,
): ElementScopedInput {
    const store = data.getSnapshot();
    const simplify = options?.simplify ?? "sum";
    const scope = run?.scope() ?? null;
    if (scope !== null && scope.graph !== store) {
        throw new Error("A run's scope was resolved against a snapshot that is no longer the graph.");
    }

    const resolution = scope?.resolution;
    const membership =
        resolution === undefined ||
        (resolution.nodeCount === store.nodeCount && resolution.edgeCount === store.edgeCount)
            ? null
            : resolution;

    let edgeCounters: U32 | null = null;
    const edgeId = (row: number): EdgeId => {
        if (edgeCounters === null) {
            const column = store.edges.typed(EDGE_ID_COLUMN, "u32");
            if (column === null) {
                throw new Error(`The graph carries no "${EDGE_ID_COLUMN}" column to name its edges by.`);
            }
            edgeCounters = column.data;
        }

        if (!Number.isInteger(row) || row < 0 || row >= store.edgeCount) {
            throw new RangeError(`edge row ${String(row)} is outside the graph's ${String(store.edgeCount)} edges`);
        }

        return edgeIdOf(edgeCounters[row]);
    };

    const weight = options?.weight;
    let declared = store;
    if (weight !== undefined) {
        const values = weight === null ? null : columns?.read(store, weight.attribute, "edge", edgeId)?.values;
        if (values === undefined) {
            throw nothingCarries("the weight", weight?.attribute ?? "");
        }
        declared = reweighted(store, values);
    }

    let derived: DerivedInput | null = null;
    let groups: number[][] | null = null;
    let nodes: U32 | null = membership?.nodes ?? null;
    let edges: U32 | null = membership?.edges ?? null;
    /** Every column handed out, by path, with its values over `graph`. */
    const named = new Map<string, ColumnValues & { column: Column }>();
    let withNamed: { size: number; snapshot: GraphSnapshot } | null = null;

    const input = {
        graph: declared,
        whole: membership === null,
        nodeCount: membership?.nodeCount ?? declared.nodeCount,
        edgeCount: membership?.edgeCount ?? declared.edgeCount,
        ...(weight === undefined ? {} : { weight }),
        derived(): DerivedInput {
            if (derived === null && declared !== store) {
                derived = uncachedInput(declared, membership, orientation, simplify);
            }

            derived ??=
                membership === null || run === undefined
                    ? wholeInput(data, declared, orientation, simplify)
                    : scopedInput(run, membership, declared, orientation, simplify);
            return derived;
        },
        subgraph(): GraphSnapshot {
            if (named.size === 0) {
                return input.derived().snapshot;
            }

            if (withNamed?.size !== named.size) {
                const nodeColumns: Record<string, ColumnInput> = {};
                const edgeColumns: Record<string, ColumnInput> = {};
                const numeric: string[] = [];
                for (const [path, { kind, values }] of named) {
                    (kind === "node" ? nodeColumns : edgeColumns)[path] = { data: values, decl: {} };
                    if (kind === "edge" && values.every((value) => value === undefined || typeof value === "number")) {
                        numeric.push(path);
                    }
                }

                const carrier = declared.withColumns(nodeColumns, edgeColumns);
                withNamed = {
                    size: named.size,
                    snapshot: uncachedInput(carrier, membership, orientation, simplify, numeric).snapshot,
                };
            }

            return withNamed.snapshot;
        },
        edgeId,
        subgraphEdgeIds(row: number): readonly EdgeId[] {
            const all = groupsOf();
            if (!Number.isInteger(row) || row < 0 || row >= all.length) {
                throw new RangeError(`edge row ${String(row)} is outside the subgraph's ${String(all.length)} edges`);
            }

            return all[row].map(edgeId);
        },
        column(optionName: string): Column {
            if (columns === undefined) {
                throw new GraphtyError({
                    code: "E_UNKNOWN_OPTION",
                    message: `"${optionName}" is not an attribute or partition option of this algorithm`,
                    source: "run",
                    details: { option: optionName },
                });
            }

            const { path, on } = columns.option(optionName);
            const held = named.get(path);
            if (held !== undefined) {
                return held.column;
            }

            const read = columns.read(declared, path, on, edgeId);
            if (read === null) {
                throw nothingCarries(`"${optionName}"`, path);
            }

            const cell = { data: read.values, decl: {} };
            const carrier =
                read.kind === "node"
                    ? declared.withColumns({ [path]: cell })
                    : declared.withColumns(undefined, { [path]: cell });
            const column = (read.kind === "node" ? carrier.nodes : carrier.edges).require(path);
            named.set(path, { ...read, column });

            return column;
        },
    };

    /**
     * The rows of `graph` behind each edge of the subgraph, built on first use.
     * @returns The groups.
     */
    const groupsOf = (): number[][] => {
        groups ??= edgeGroups(input.derived(), declared.edgeCount);
        return groups;
    };

    Object.defineProperties(input, {
        nodes: {
            enumerable: true,
            get: (): NodeMask => {
                nodes ??= makeMask(declared.nodeCount, true);
                return nodes;
            },
        },
        edges: {
            enumerable: true,
            get: (): EdgeMask => {
                edges ??= makeMask(declared.edgeCount, true);
                return edges;
            },
        },
    });

    return input as ElementScopedInput;
}

/**
 * The nodes an input covers, in declared row order: the order of the compact snapshot's rows, and
 * the order an adapter lists what it publishes in.
 * @param input - The input.
 * @returns The node ids.
 */
export function scopeNodeIds(input: ScopedInput): NodeId[] {
    const { graph, nodes, whole } = input;
    const ids: NodeId[] = [];
    for (let row = 0; row < graph.nodeCount; row++) {
        if (whole || maskTest(nodes, row)) {
            ids.push(graph.ids.idOf(row));
        }
    }

    return ids;
}

/** One declared edge an input covers: its session id, its row in the declared graph, and its ends. */
interface ScopeEdge {
    readonly id: EdgeId;
    /** The row in `ScopedInput.graph`, which is what an edge remap is indexed by. */
    readonly row: number;
    /** The source node, in the declared orientation. */
    readonly source: NodeId;
    /** The target node, in the declared orientation. */
    readonly target: NodeId;
}

/**
 * The declared edges an input covers, in row order.
 * @param input - The input.
 * @returns The edges.
 * @throws An Error when the graph carries no edge id column, which every store declares.
 */
export function scopeEdges(input: ScopedInput): ScopeEdge[] {
    const { graph, edges, whole } = input;
    const counters = graph.edges.typed(EDGE_ID_COLUMN, "u32");
    if (counters === null) {
        throw new Error(`The graph carries no "${EDGE_ID_COLUMN}" column to name its edges by.`);
    }

    const { src, dst } = graph.edgeList();
    const list: ScopeEdge[] = [];
    for (let row = 0; row < graph.edgeCount; row++) {
        if (whole || maskTest(edges, row)) {
            list.push({
                id: edgeIdOf(counters.data[row]),
                row,
                source: graph.ids.idOf(src[row]),
                target: graph.ids.idOf(dst[row]),
            });
        }
    }

    return list;
}

// ---------------------------------------------------------------------------------------------
// Running an algorithm over its scope
// ---------------------------------------------------------------------------------------------

/** What owns a graph's derived inputs: the graph, and the accelerator its release goes to. */
interface InputOwner {
    readonly acceleration: { readonly accelerator: Readonly<Record<string, unknown>> | null };
}

const caches = new WeakMap<object, DerivedInputs>();

/**
 * A graph's derived inputs, built on first use. Released snapshots go to the attached
 * accelerator's `release`, when it has one.
 * @param owner - The graph.
 * @returns Its cache.
 */
export function derivedInputsOf(owner: InputOwner): DerivedInputs {
    let inputs = caches.get(owner);
    if (inputs === undefined) {
        inputs = new DerivedInputs({
            release: (snapshot) => {
                releaseOnAccelerator(owner, snapshot);
            },
        });
        caches.set(owner, inputs);
    }

    return inputs;
}

/**
 * Frees the attached accelerator's device buffers for a snapshot nothing will read again, when the
 * accelerator has a `release`. Safe for a snapshot the accelerator never saw.
 * @param owner - The graph.
 * @param snapshot - The snapshot to release.
 */
export function releaseOnAccelerator(owner: InputOwner, snapshot: GraphSnapshot): void {
    const { accelerator } = owner.acceleration;
    const release = accelerator?.release;
    if (typeof release !== "function") {
        return;
    }

    try {
        (release as (target: GraphSnapshot) => void).call(accelerator, snapshot);
    } catch (error) {
        // A third party's release is untrusted code; a throw must not fail the run.
        console.warn("graphty: an accelerator threw while releasing a derived input", error);
    }
}

/**
 * A graph's derived inputs, if any were ever built. For the freeze and dispose hooks.
 * @param owner - The graph.
 * @returns Its cache, or undefined.
 */
export function peekDerivedInputs(owner: object): DerivedInputs | undefined {
    return caches.get(owner);
}

/**
 * The bytes a scoped derivation is expected to take: the full snapshot's, in proportion to the
 * elements in scope.
 * @param scope - The scope.
 * @returns The estimate.
 */
function estimateOf(scope: ResolvedInputScope): number {
    const { graph, resolution } = scope;
    const total = graph.nodeCount + graph.edgeCount;
    const bytes = graph.byteLength({ columns: true, ids: true });

    return total === 0 ? 0 : Math.ceil((bytes * (resolution.nodeCount + resolution.edgeCount)) / total);
}

/**
 * Run one algorithm's work with its run's scope bound: a class declaring a scoped input reads the
 * scope through `Algorithm.input`, and every input it derives is held until the work settles --
 * published or aborted -- and only then may be released.
 * @param algorithm - The instance.
 * @param owner - The graph it runs on.
 * @param scope - The run's scope over the current snapshot, or null for the whole graph.
 * @param signal - Aborts a wait for room.
 * @param work - The work.
 * @returns What the work returned.
 */
export async function withRunInput<T>(
    algorithm: object,
    owner: InputOwner & { getDataManager(): SnapshotSource },
    scope: () => ResolvedInputScope | null,
    signal: AbortSignal | undefined,
    work: () => Promise<T>,
): Promise<T> {
    const inputs = derivedInputsOf(owner);
    const holder = {};
    bindings.set(algorithm, { inputs, holder, scope });
    try {
        if (declaresScopedInput(algorithm)) {
            const resolved = scope();
            if (
                resolved !== null &&
                (resolved.resolution.nodeCount !== resolved.graph.nodeCount ||
                    resolved.resolution.edgeCount !== resolved.graph.edgeCount)
            ) {
                await inputs.reserve(holder, estimateOf(resolved), resolved.graph, signal);
            }
        }

        return await work();
    } finally {
        bindings.delete(algorithm);
        inputs.releaseHolder(holder);
    }
}
