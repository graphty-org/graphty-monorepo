/**
 * @file What the scoped-adapter tests share: running an algorithm bound to a scope and unbound,
 * building by hand the graph a scope should compute over, and reading a result out as plain data
 * that two graphs with different edge ids can be compared by.
 */

import { maskTest } from "@graphty/graph-format";
import { assert } from "vitest";

import type { Algorithm } from "../../../src/algorithms/Algorithm";
import { type ResolvedInputScope, withRunInput } from "../../../src/algorithms/input/ScopedInput";
import { detachedRunContext } from "../../../src/algorithms/results";
import type { Graph } from "../../../src/Graph";
import type { RunResult } from "../../../src/session/results";
import { type EdgeSpec, InputGraph } from "../input/harness";

/** Builds one algorithm over a graph. */
export type Build = (graph: Graph) => Algorithm;

/** A run's values as plain data: nodes by id, edges by `source>target#k` (the k-th such edge in row order). */
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
 * The key of every edge of a graph, by edge id: `source>target#k`, k counting that ordered pair's
 * edges in row order, so two graphs holding the same edges in the same order key them alike.
 * @param graph - The graph.
 * @returns Edge id to key.
 */
function edgeKeys(graph: InputGraph): Map<string, string> {
    const snapshot = graph.snapshot();
    const { src, dst } = snapshot.edgeList();
    const seen = new Map<string, number>();
    const byRow = new Map<number, string>();
    for (let row = 0; row < snapshot.edgeCount; row++) {
        const pair = `${String(snapshot.ids.idOf(src[row]))}>${String(snapshot.ids.idOf(dst[row]))}`;
        const k = seen.get(pair) ?? 0;
        seen.set(pair, k + 1);
        byRow.set(row, `${pair}#${String(k)}`);
    }

    const keys = new Map<string, string>();
    for (const edge of graph.edges.values()) {
        keys.set(edge.id, byRow.get(edge.index) ?? edge.id);
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
 * @param keepEdge - Which edge keys to read; all of them by default.
 * @returns The values; a partition's labels canonicalised.
 */
export function valuesOf(
    result: RunResult | undefined,
    graph: InputGraph,
    keepNode: (id: string) => boolean = () => true,
    keepEdge: (key: string) => boolean = () => true,
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
    const keys = edgeKeys(graph);
    const ordered = [...graph.edges.values()].sort((a, b) => a.index - b.index);
    for (const edge of ordered) {
        const key = keys.get(edge.id) ?? edge.id;
        if (keepEdge(key)) {
            edges[key] = result.edge(edge.id);
        }
    }

    return { nodes: result.shape === "community" ? canonicalGroups(nodes) : nodes, edges };
}

/**
 * The node ids and edge keys a scope covers.
 * @param graph - The graph.
 * @param scope - The scope.
 * @returns Two predicates.
 */
export function coveredBy(graph: InputGraph, scope: ResolvedInputScope): { node: (id: string) => boolean; edge: (key: string) => boolean } {
    const snapshot = graph.snapshot();
    const { nodes, edges } = scope.resolution;
    const keys = edgeKeys(graph);
    const inEdges = new Set<string>();
    for (const edge of graph.edges.values()) {
        if (maskTest(edges, edge.index)) {
            inEdges.add(keys.get(edge.id) ?? edge.id);
        }
    }

    return {
        node: (id) => maskTest(nodes, snapshot.ids.indexOf(id)),
        edge: (key) => inEdges.has(key),
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
    const covered = coveredBy(graph, scope);

    assert.deepStrictEqual(valuesOf(scoped, graph, covered.node, covered.edge), valuesOf(expected, hand));
    assert.deepStrictEqual(scoped?.measured, expected?.measured);
    assert.deepStrictEqual(scoped?.graph, expected?.graph);

    return scoped;
}
