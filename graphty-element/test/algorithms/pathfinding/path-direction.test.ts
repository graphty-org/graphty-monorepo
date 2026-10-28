import { assert, describe, it } from "vitest";

import { BellmanFordAlgorithm } from "../../../src/algorithms/BellmanFordAlgorithm";
import { DijkstraAlgorithm } from "../../../src/algorithms/DijkstraAlgorithm";
import { createMockGraph } from "../../helpers/mockGraph";

const chain = {
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [
        { srcId: "a", dstId: "b" },
        { srcId: "b", dstId: "c" },
    ],
};

for (const [Algo, type] of [
    [DijkstraAlgorithm, "dijkstra"],
    [BellmanFordAlgorithm, "bellman-ford"],
] as const) {
    /**
     * Runs a path search from c to a over the chain a -> b -> c.
     * @param direction - The direction option, or undefined for the default.
     * @param directed - Whether the graph is loaded directed.
     * @returns The route length and whether the a -> b edge is on it, from the run's result.
     */
    async function route(direction?: "out" | "in" | "all", directed = true): Promise<{ length: number; ab: unknown }> {
        const graph = await createMockGraph({ ...chain, directed });
        const algo = new Algo(graph, { source: "c", target: "a", ...(direction ? { direction } : {}) });
        await algo.run();
        const ab = [...graph.getDataManager().edges.values()].find((edge) => edge.srcId === "a");
        return {
            length: algo.result?.graph.length as number,
            ab: ab === undefined ? undefined : algo.result?.edge(ab.id)?.onPath,
        };
    }

    describe(`${type} direction`, () => {
        it("defaults to all", () => {
            assert.strictEqual(Algo.getOptionsSchema().direction.default, "all");
        });

        it("all crosses edges either way on a directed chain", async () => {
            assert.strictEqual((await route("all")).length, 3);
        });

        it("the default finds the same route as all", async () => {
            assert.deepEqual(await route(), await route("all"));
        });

        it("out follows edges only source to target", async () => {
            assert.strictEqual((await route("out")).length, 0);
        });

        it("in follows edges only target to source", async () => {
            const { length, ab } = await route("in");
            assert.strictEqual(length, 3);
            assert.strictEqual(ab, true);
        });

        it("an undirected graph is read either way whatever the value", async () => {
            assert.strictEqual((await route("out", false)).length, 3);
        });
    });
}
