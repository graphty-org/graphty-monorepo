/**
 * @file What the scoped-adapter tests share: running an algorithm bound to a scope and unbound,
 * building by hand the graph a scope should compute over, and reading a result out as plain data
 * that two graphs with different edge ids can be compared by.
 */

import { maskTest } from "@graphty/graph-format";
import fc from "fast-check";
import { assert, describe, it } from "vitest";

import type { Algorithm } from "../../../src/algorithms/Algorithm";
import { type ResolvedInputScope, withRunInput } from "../../../src/algorithms/input/ScopedInput";
import { detachedRunContext } from "../../../src/algorithms/results";
import type { Graph } from "../../../src/Graph";
import type { RunResult } from "../../../src/session/results";
import { fcParams } from "../../helpers/fc-params";
import { type EdgeSpec, InputGraph } from "../input/harness";

/** Builds one algorithm over a graph. */
export type Build = (graph: Graph) => Algorithm;

/** A run's values as plain data: nodes by id, edges by `source>target#k` (the k-th such kept edge in row order). */
export interface Values {
    readonly nodes: Record<string, unknown>;
    readonly edges: Record<string, unknown>;
}

/**
 * Run an algorithm unbound, over the whole graph.
 * @param build - The algorithm.
 * @param graph - The graph.
 * @returns The result.
 */
export function runWhole(build: Build, graph: InputGraph): Promise<RunResult | undefined> {
    return build(graph.asGraph()).publishResult(detachedRunContext(), "r");
}

/**
 * Run an algorithm bound to a scope, as `AlgorithmManager` binds a run.
 * @param build - The algorithm.
 * @param graph - The graph.
 * @param scope - The scope.
 * @returns The result.
 */
export function runScoped(build: Build, graph: InputGraph, scope: ResolvedInputScope): Promise<RunResult | undefined> {
    const algorithm = build(graph.asGraph());

    return withRunInput(algorithm, graph, () => scope, undefined, () => algorithm.publishResult(detachedRunContext(), "r"));
}

/**
 * The graph a scope should compute over, built by hand: its nodes and its edges in the declared
 * snapshot's row order, with their weights.
 * @param graph - The graph.
 * @param scope - A scope over its current snapshot.
 * @returns The hand-built graph.
 */
export function handBuilt(graph: InputGraph, scope: ResolvedInputScope): InputGraph {
    const snapshot = graph.snapshot();
    const { nodes, edges } = scope.resolution;
    const nodeIds: string[] = [];
    for (let row = 0; row < snapshot.nodeCount; row++) {
        if (maskTest(nodes, row)) {
            nodeIds.push(String(snapshot.ids.idOf(row)));
        }
    }

    const { src, dst, weights } = snapshot.edgeList();
    const edgeSpecs: EdgeSpec[] = [];
    for (let row = 0; row < snapshot.edgeCount; row++) {
        if (maskTest(edges, row)) {
            edgeSpecs.push([String(snapshot.ids.idOf(src[row])), String(snapshot.ids.idOf(dst[row])), weights === null ? 1 : weights[row]]);
        }
    }

    return new InputGraph(nodeIds, edgeSpecs, snapshot.directed);
}

/**
 * The key of every kept edge of a graph, by edge id: `source>target#k`, k counting that ordered
 * pair's kept edges in row order, so two graphs holding the same edges in the same order key them
 * alike.
 * @param graph - The graph.
 * @param keep - Which edge rows to key.
 * @returns Edge id to key, for the kept edges.
 */
function edgeKeys(graph: InputGraph, keep: (row: number) => boolean): Map<string, string> {
    const snapshot = graph.snapshot();
    const { src, dst } = snapshot.edgeList();
    const seen = new Map<string, number>();
    const byRow = new Map<number, string>();
    for (let row = 0; row < snapshot.edgeCount; row++) {
        if (!keep(row)) {
            continue;
        }

        const pair = `${String(snapshot.ids.idOf(src[row]))}>${String(snapshot.ids.idOf(dst[row]))}`;
        const k = seen.get(pair) ?? 0;
        seen.set(pair, k + 1);
        byRow.set(row, `${pair}#${String(k)}`);
    }

    const keys = new Map<string, string>();
    for (const edge of graph.edges.values()) {
        const key = byRow.get(edge.index);
        if (key !== undefined) {
            keys.set(edge.id, key);
        }
    }

    return keys;
}

/**
 * Relabel a partition by first appearance in row order, so two runs that group alike and number
 * differently read equal.
 * @param nodes - Node values in row order.
 * @param field - The label field.
 * @returns The relabelled values.
 */
export function canonicalGroups(nodes: Record<string, unknown>, field = "group"): Record<string, unknown> {
    const relabel = new Map<unknown, number>();
    return Object.fromEntries(
        Object.entries(nodes).map(([id, value]) => {
            if (value === undefined || !(field in (value as object))) {
                return [id, value];
            }

            const label = (value as Record<string, unknown>)[field];
            if (!relabel.has(label)) {
                relabel.set(label, relabel.size);
            }

            return [id, { ...(value as object), [field]: relabel.get(label) }];
        }),
    );
}

/**
 * A result's values over some nodes and edges of a graph, in row order.
 * @param result - The result.
 * @param graph - The graph it ran on.
 * @param keepNode - Which node ids to read; all of them by default.
 * @param keepEdge - Which edge rows to read; all of them by default.
 * @returns The values; a partition's labels canonicalised.
 */
export function valuesOf(
    result: RunResult | undefined,
    graph: InputGraph,
    keepNode: (id: string) => boolean = () => true,
    keepEdge: (row: number) => boolean = () => true,
): Values {
    assert.isDefined(result, "the run published a result");
    const snapshot = graph.snapshot();
    const nodes: Record<string, unknown> = {};
    for (let row = 0; row < snapshot.nodeCount; row++) {
        const id = String(snapshot.ids.idOf(row));
        if (keepNode(id)) {
            nodes[id] = result.node(id);
        }
    }

    const edges: Record<string, unknown> = {};
    const keys = edgeKeys(graph, keepEdge);
    const ordered = [...graph.edges.values()].sort((a, b) => a.index - b.index);
    for (const edge of ordered) {
        const key = keys.get(edge.id);
        if (key !== undefined) {
            edges[key] = result.edge(edge.id);
        }
    }

    return { nodes: result.shape === "community" ? canonicalGroups(nodes) : nodes, edges };
}

/**
 * The node ids and edge rows a scope covers.
 * @param graph - The graph.
 * @param scope - The scope.
 * @returns Two predicates.
 */
export function coveredBy(graph: InputGraph, scope: ResolvedInputScope): { node: (id: string) => boolean; edge: (row: number) => boolean } {
    const snapshot = graph.snapshot();
    const { nodes, edges } = scope.resolution;

    return {
        node: (id) => maskTest(nodes, snapshot.ids.indexOf(id)),
        edge: (row) => maskTest(edges, row),
    };
}

/**
 * Assert a scoped run publishes, over its scope, exactly what the same algorithm publishes on the
 * graph of that scope built by hand.
 * @param build - The algorithm.
 * @param graph - The graph.
 * @param scope - The scope.
 * @returns The scoped result.
 */
export async function assertComputesOverScope(build: Build, graph: InputGraph, scope: ResolvedInputScope): Promise<RunResult | undefined> {
    const scoped = await runScoped(build, graph, scope);
    const hand = handBuilt(graph, scope);
    const expected = await runWhole(build, hand);
    if (expected === undefined) {
        assert.isUndefined(scoped, "nothing to compute on the scope's graph, so nothing over the scope");
        return undefined;
    }

    const covered = coveredBy(graph, scope);

    assert.deepStrictEqual(valuesOf(scoped, graph, covered.node, covered.edge), valuesOf(expected, hand));
    assert.deepStrictEqual(scoped?.measured, expected?.measured);
    assert.deepStrictEqual(scoped?.graph, expected?.graph);

    return scoped;
}

/**
 * A result's values and graph-level fields over a scope, for telling two runs apart.
 * @param result - The result.
 * @param graph - The graph it ran on.
 * @param scope - The scope.
 * @returns The values.
 */
function readingOver(result: RunResult | undefined, graph: InputGraph, scope: ResolvedInputScope): unknown {
    const covered = coveredBy(graph, scope);
    return { values: valuesOf(result, graph, covered.node, covered.edge), graph: result?.graph };
}

/*
 * The listed fixture: a triangle a, b, c with a tail c - d - e, and f outside the scope joined to
 * e and a. The listed scope is a to e without c>a and c>d, which breaks the triangle and cuts the
 * tail off, so a run that read the induced edges instead of the listed ones publishes different
 * values.
 */
const LISTED_NODES = ["a", "b", "c", "d", "e", "f"];
const LISTED_EDGES: readonly EdgeSpec[] = [
    ["a", "b", 1],
    ["b", "c", 2],
    ["c", "a", 3],
    ["c", "d", 1],
    ["d", "e", 2],
    ["e", "f", 1],
    ["f", "a", 1],
];

/*
 * The multigraph fixture: two parallel a>b edges of different weights, a reciprocal pair b>c and
 * c>b, and z outside the scope offering a way round.
 */
const MULTI_NODES = ["a", "z", "b", "c", "d"];
const MULTI_EDGES: readonly EdgeSpec[] = [
    ["a", "b", 1],
    ["a", "b", 4],
    ["b", "c", 2],
    ["c", "b", 3],
    ["c", "d", 1],
    ["a", "z", 1],
    ["z", "d", 1],
];

/**
 * The two cases every adapter that computes over its scope is tested on beyond the registry test:
 * a listed scope, and a multigraph.
 * @param name - The adapter, for the test names.
 * @param build - The adapter.
 */
export function describeScopedAdapter(name: string, build: Build): void {
    describe(`${name} over a scope`, () => {
        it("a listed scope computes over exactly its listed edges", async () => {
            const graph = new InputGraph(LISTED_NODES, LISTED_EDGES, true);
            const members = ["a", "b", "c", "d", "e"];
            const listed = graph.scope(members, (source, target) => !(source === "c" && (target === "a" || target === "d")));
            const induced = graph.scope(members);

            const result = await assertComputesOverScope(build, graph, listed);
            assert.notDeepEqual(
                readingOver(result, graph, listed),
                readingOver(await runScoped(build, graph, induced), graph, listed),
                "the listed edges, not every edge between the members",
            );
        });

        it("a multigraph scope merges its parallel edges as the scope's own graph would", async () => {
            const graph = new InputGraph(MULTI_NODES, MULTI_EDGES, true);
            await assertComputesOverScope(build, graph, graph.scope(["a", "b", "c", "d"]));
        });
    });
}

/** A random directed multigraph over up to ten nodes, and a scope over it. */
const scopedGraphs = fc
    .integer({ min: 1, max: 10 })
    .chain((size) =>
        fc.record({
            size: fc.constant(size),
            edges: fc.array(fc.tuple(fc.nat(size - 1), fc.nat(size - 1), fc.integer({ min: 1, max: 5 })), { maxLength: 30 }),
            members: fc.array(fc.boolean(), { minLength: size, maxLength: size }),
            listed: fc.option(fc.array(fc.boolean(), { minLength: 30, maxLength: 30 }), { nil: undefined }),
        }),
    );

/**
 * A scoped run equals the run on the scope's graph built by hand, for generated graphs and scopes,
 * induced and listed.
 * @param build - The adapter.
 */
export async function assertOverGeneratedScopes(build: Build): Promise<void> {
    await fc.assert(
        fc.asyncProperty(scopedGraphs, async ({ size, edges, members, listed }) => {
            const ids = Array.from({ length: size }, (_, index) => `n${String(index)}`);
            const graph = new InputGraph(
                ids,
                edges.map(([source, target, weight]) => [ids[source], ids[target], weight] as const),
                true,
            );
            const scope = graph.scope(
                ids.filter((_, index) => members[index]),
                listed === undefined ? undefined : (_source, _target, index) => listed[index],
            );
            await assertComputesOverScope(build, graph, scope);
        }),
        fcParams(200),
    );
}
