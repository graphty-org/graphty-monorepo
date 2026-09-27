/**
 * A replacing load keeps the current graph until the new data has parsed, and a load that
 * produces nothing is a failure with its own code rather than a success.
 */
import { assert, beforeEach, describe, test } from "vitest";

import { type GraphtyError, isGraphtyError } from "../../extend";
import type { Graph } from "../../src/Graph.js";

const GOOD = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ src: "a", dst: "b" }] });
const OTHER = JSON.stringify({ nodes: [{ id: "x" }, { id: "y" }, { id: "z" }], edges: [{ src: "x", dst: "y" }] });

async function graphWith(data: string): Promise<Graph> {
    document.body.innerHTML = '<canvas id="test-canvas"></canvas>';
    const { Graph } = await import("../../src/Graph.js");
    const graph = new Graph(document.getElementById("test-canvas") as HTMLCanvasElement);
    await graph.loadFromFile(new File([data], "first.json"));
    return graph;
}

function ids(graph: Graph): { nodes: string[]; edges: number } {
    const dm = graph.getDataManager();
    return { nodes: [...dm.nodes.keys()].map(String).sort(), edges: dm.edges.size };
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
    let failure: unknown = null;
    await promise.catch((error: unknown) => {
        failure = error;
    });
    assert.isNotNull(failure, "the load should have rejected");
    return failure;
}

describe("loadFromFile with replace", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    test("a malformed file rejects and leaves the previous graph exactly as it was", async () => {
        const graph = await graphWith(GOOD);

        await rejection(graph.loadFromFile(new File(["{ not json"], "bad.json"), { replace: true }));

        assert.deepStrictEqual(ids(graph), { nodes: ["a", "b"], edges: 1 });
    });

    test("an empty file rejects with E_EMPTY_LOAD and leaves the previous graph", async () => {
        const graph = await graphWith(GOOD);

        const error = await rejection(graph.loadFromFile(new File(['{"nodes": []}'], "empty.json"), { replace: true }));

        assert.isTrue(isGraphtyError(error));
        assert.strictEqual((error as GraphtyError).code, "E_EMPTY_LOAD");
        assert.deepStrictEqual(ids(graph), { nodes: ["a", "b"], edges: 1 });
    });

    test("a good file replaces the graph, and only the new ids remain", async () => {
        const graph = await graphWith(GOOD);

        await graph.loadFromFile(new File([OTHER], "other.json"), { replace: true });

        assert.deepStrictEqual(ids(graph), { nodes: ["x", "y", "z"], edges: 1 });
    });

    test("without replace, a good file is added to what is there", async () => {
        const graph = await graphWith(GOOD);

        await graph.loadFromFile(new File([OTHER], "other.json"));

        assert.deepStrictEqual(ids(graph), { nodes: ["a", "b", "x", "y", "z"], edges: 2 });
    });

    test("an additive load that adds nothing at all is an E_EMPTY_LOAD failure too", async () => {
        const graph = await graphWith(GOOD);

        const error = await rejection(graph.loadFromFile(new File(['{"nodes": []}'], "empty.json")));

        assert.strictEqual((error as GraphtyError).code, "E_EMPTY_LOAD");
        assert.deepStrictEqual(ids(graph), { nodes: ["a", "b"], edges: 1 });
    });
});

/** A file big enough that reading and parsing it spans many tasks. */
function bigFile(nodes: number): File {
    const records = Array.from({ length: nodes }, (_, i) => ({ id: `n${i}` }));
    return new File([JSON.stringify({ nodes: records, edges: [] })], "big.json");
}

describe("the load CALLED last wins", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    test("a file load started first is superseded by a later replacing load, however long it reads", async () => {
        const graph = await graphWith(GOOD);

        const fileLoad = graph.loadFromFile(bigFile(20000), { replace: true });
        const lateLoad = graph.addDataFromSource(
            "json",
            { data: JSON.stringify({ nodes: [{ id: "late" }] }) },
            { replace: true },
        );

        const [file, late] = await Promise.allSettled([fileLoad, lateLoad]);

        assert.strictEqual(late.status, "fulfilled");
        assert.strictEqual(file.status, "rejected");
        const reason = (file as PromiseRejectedResult).reason as unknown;
        assert.isTrue(isGraphtyError(reason));
        assert.strictEqual((reason as GraphtyError).code, "E_SUPERSEDED");
        assert.deepStrictEqual(ids(graph), { nodes: ["late"], edges: 0 });
    });

    test("load ids rise in call order, not in the order the reads finish", async () => {
        const graph = await graphWith(GOOD);

        const fileLoad = graph.loadFromFile(bigFile(20000));
        const lateLoad = graph.addDataFromSource("json", { data: JSON.stringify({ nodes: [{ id: "late" }] }) });

        const [file, late] = await Promise.all([fileLoad, lateLoad]);

        assert.isBelow(file.loadId, late.loadId);
    });

    test("clearData abandons a load in flight, so it cannot bring its data back", async () => {
        const graph = await graphWith(GOOD);

        const fileLoad = graph.loadFromFile(bigFile(20000), { replace: true });
        graph.clearData();

        const error = await rejection(fileLoad);

        assert.strictEqual((error as GraphtyError).code, "E_SUPERSEDED");
        assert.deepStrictEqual(ids(graph), { nodes: [], edges: 0 });
    });
});
