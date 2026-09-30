/**
 * @file Who gets a scoped input (design/sets/sets-design.md section 10.1): only a class that
 * declares `static scopeInput = "subgraph"`, through both seams, and only while it runs as a run.
 * Every other class reads the whole graph and is masked back to its scope: each built-in, with its
 * declaration taken off, is run bound to a scope and unbound, and the bound run publishes the
 * unbound values for the scope only.
 */

import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { withRunInput } from "../../../src/algorithms/input/ScopedInput";
import { detachedRunContext } from "../../../src/algorithms/results";
import type { Graph } from "../../../src/Graph";
import type { RunResult } from "../../../src/session/results";
import { createFakeAccelerator } from "../../../src/testing/fakeAccelerator";
import {
    idsOf,
    InputGraph,
    WholeBFS,
    WholeComponents,
    WholeDegree,
    WholeDijkstra,
    WholeKruskal,
    WholePageRank,
} from "./harness";

/** What the two seams handed one algorithm. */
interface Seen {
    readonly subgraph: number;
    readonly accelerated: readonly string[];
}

/** Reads its input through both seams, and declares nothing. */
class WholeReader extends Algorithm {
    static namespace = "test";
    static type = "whole-reader";

    run(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * What both seams hand over.
     * @returns The node count of the input subgraph and the ids of the accelerated snapshot.
     */
    seams(): Seen {
        return {
            subgraph: this.input("declared").subgraph().nodeCount,
            accelerated: idsOf(this.accelerated("pageRank", "undirected").snapshot),
        };
    }
}

/** The same, declaring that it computes over its scope. */
class ScopedReader extends WholeReader {
    static type = "scoped-reader";
    static scopeInput = "subgraph" as const;
}

/** Six nodes in a ring, so a scope of three cuts it. */
function ring(): InputGraph {
    const ids = ["a", "b", "c", "d", "e", "f"];

    return new InputGraph(
        ids,
        ids.map((id, index) => [id, ids[(index + 1) % ids.length], index + 1] as const),
    );
}

describe("the declaration decides what both seams hand over", () => {
    it("a declaring algorithm reads its scope from both seams", async () => {
        const graph = ring();
        const scope = graph.scope(["a", "b", "c"]);
        const algorithm = new ScopedReader(graph.asGraph());
        const seen = await withRunInput(
            algorithm,
            graph,
            () => scope,
            undefined,
            () => Promise.resolve(algorithm.seams()),
        );

        assert.deepStrictEqual(seen, { subgraph: 3, accelerated: ["a", "b", "c"] });
    });

    it("the same algorithm without the declaration reads the whole snapshot under the same scoped run", async () => {
        const graph = ring();
        const scope = graph.scope(["a", "b", "c"]);
        const algorithm = new WholeReader(graph.asGraph());
        const seen = await withRunInput(
            algorithm,
            graph,
            () => scope,
            undefined,
            () => Promise.resolve(algorithm.seams()),
        );

        assert.deepStrictEqual(seen, { subgraph: 6, accelerated: ["a", "b", "c", "d", "e", "f"] });
    });

    it("a declaring algorithm outside a run reads the whole graph, and so does one after its run", async () => {
        const graph = ring();
        const algorithm = new ScopedReader(graph.asGraph());
        assert.strictEqual(algorithm.seams().subgraph, 6);

        await withRunInput(
            algorithm,
            graph,
            () => graph.scope(["a", "b"]),
            undefined,
            () => Promise.resolve(),
        );
        assert.strictEqual(algorithm.seams().subgraph, 6, "the binding ends with the run");
    });
});

/** What a run published, as plain data: every node's values and every edge's. */
interface Published {
    readonly nodes: Record<string, unknown>;
    readonly edges: Record<string, unknown>;
}

/**
 * Read a result out as plain data.
 * @param result - The result.
 * @param graph - The graph it ran on.
 * @returns Its node and edge values.
 */
function publishedOf(result: RunResult | undefined, graph: InputGraph): Published {
    assert.isDefined(result);
    const nodes: Record<string, unknown> = {};
    const edges: Record<string, unknown> = {};
    for (const id of graph.nodes.keys()) {
        nodes[id] = result.node(id);
    }

    for (const id of graph.edges.keys()) {
        edges[id] = result.edge(id);
    }

    return { nodes, edges };
}

/** Fields the result fills from the population it publishes, rather than the algorithm. */
const FILLED_FROM_POPULATION = new Set(["groupSize", "levelSize"]);

/**
 * Published values without the fields filled from the population.
 * @param published - The values.
 * @returns The algorithm's own fields.
 */
function ownFields(published: Published): Published {
    const strip = (values: Record<string, unknown>): Record<string, unknown> =>
        Object.fromEntries(
            Object.entries(values).map(([id, value]) => [
                id,
                value === undefined
                    ? undefined
                    : Object.fromEntries(
                          Object.entries(value as object).filter(([name]) => !FILLED_FROM_POPULATION.has(name)),
                      ),
            ]),
        );

    return { nodes: strip(published.nodes), edges: strip(published.edges) };
}

/** Every built-in with an accelerated seam, and Degree, each undeclared, with the options each needs. */
const BUILT_INS: readonly (readonly [string, (g: Graph) => Algorithm])[] = [
    ["pagerank", (g) => new WholePageRank(g)],
    ["degree", (g) => new WholeDegree(g)],
    ["connected components", (g) => new WholeComponents(g)],
    ["dijkstra", (g) => new WholeDijkstra(g, { source: "a", target: "d" })],
    ["bfs", (g) => new WholeBFS(g, { source: "a" })],
    ["kruskal", (g) => new WholeKruskal(g)],
];

describe("an algorithm that declares no scoped input computes on the whole graph and is masked back", () => {
    for (const [name, build] of BUILT_INS) {
        it(`${name} bound to a three-node scope publishes its whole-graph values for the scope only`, async () => {
            const graph = ring();
            const unbound = publishedOf(await build(graph.asGraph()).publishResult(detachedRunContext(), "r"), graph);

            const scoped = build(graph.asGraph());
            const members = new Set(["a", "b", "c"]);
            const scope = graph.scope([...members]);
            const bound = publishedOf(
                await withRunInput(
                    scoped,
                    graph,
                    () => scope,
                    undefined,
                    () => scoped.publishResult(detachedRunContext(), "r"),
                ),
                graph,
            );

            const expected: Published = {
                nodes: Object.fromEntries(
                    Object.entries(unbound.nodes).map(([id, value]) => [id, members.has(id) ? value : undefined]),
                ),
                edges: Object.fromEntries(
                    [...graph.edges.values()].map((edge) => [
                        edge.id,
                        members.has(edge.srcId) && members.has(edge.dstId) ? unbound.edges[edge.id] : undefined,
                    ]),
                ),
            };
            // The fields the element fills from the published population (a group's size, a
            // level's size) are counted over the scope, which is the point of masking first.
            assert.deepStrictEqual(ownFields(bound), ownFields(expected));
            const filled = [...Object.values(unbound.nodes), ...Object.values(unbound.edges)].filter(
                (value) => value !== undefined,
            );
            assert.isAbove(filled.length, 3, "values outside the scope too, so the mask has something to drop");
        });
    }

    it("the accelerated ones hand the accelerator the whole graph under a scoped run", async () => {
        const graph = ring();
        const fake = createFakeAccelerator();
        graph.acceleration.setAccelerator(fake);
        const pagerank = new WholePageRank(graph.asGraph());
        const scope = graph.scope(["a", "b", "c"]);
        await withRunInput(
            pagerank,
            graph,
            () => scope,
            undefined,
            () => pagerank.publishResult(detachedRunContext(), "r"),
        );

        assert.lengthOf(fake.calls.uploaded, 1);
        assert.strictEqual(fake.calls.uploaded[0], graph.snapshot());
    });
});
