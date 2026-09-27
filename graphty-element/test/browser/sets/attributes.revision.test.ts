/**
 * @file Attribute revisions through the element's own write paths (design/sets/sets-design.md
 * 6.2): `Graph.updateNodes` on both queue paths, ingest, and the repeated-edge policies, driven
 * through a real `Graph` and its `DataManager`.
 */

import type { DuplicatePolicy } from "@graphty/graph-format";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../../src/Graph";
import { type InputCounters, inputCountersOf } from "../../../src/session/attributes";
import { inputCountersOfSession } from "../../../src/session/GraphSession";

describe("attribute revisions through the element", () => {
    let container: HTMLDivElement;
    let graph: Graph;
    let counters: InputCounters;

    /**
     * The revision of each field.
     * @param kind - nodes or edges
     * @param fields - the fields
     * @returns their revisions, in order
     */
    const revisions = (kind: "nodes" | "edges", ...fields: string[]): number[] =>
        fields.map((f) => counters[kind].of(f));

    /**
     * Load a JSON document through the element's data source path.
     * @param document - nodes and edges
     * @param document.nodes - node records
     * @param document.edges - edge records
     * @param policy - the repeated-edge policy
     */
    const load = async (document: { nodes: object[]; edges: object[] }, policy: DuplicatePolicy): Promise<void> => {
        graph.styles.config.data.knownFields.repeatedEdges = policy;
        await graph.addDataFromSource("json", { data: JSON.stringify(document) });
        await graph.operationQueue.waitForCompletion();
    };

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        counters = inputCountersOf(graph.getDataManager());
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("are the counters the element's session reads", () => {
        assert.strictEqual(inputCountersOfSession(graph.getSession()), counters);
    });

    it("ingest bumps every field it writes, on nodes and on edges", async () => {
        await graph.addNodes([
            { id: "a", label: "A" },
            { id: "b", weight: 2 },
        ]);
        await graph.addEdges([{ source: "a", target: "b", kind: "x" }]);
        await graph.operationQueue.waitForCompletion();

        assert.deepEqual(revisions("nodes", "id", "label", "weight", "kind"), [1, 1, 1, 0]);
        assert.deepEqual(revisions("edges", "source", "target", "kind", "label"), [1, 1, 1, 0]);
    });

    for (const skipQueue of [true, false]) {
        it(`updateNodes ${skipQueue ? "without" : "through"} the queue bumps only the fields it writes`, async () => {
            await graph.addNodes([{ id: "a", label: "A", weight: 1 }]);
            await graph.operationQueue.waitForCompletion();
            const [label, weight, id] = revisions("nodes", "label", "weight", "id");

            await graph.updateNodes([{ id: "a", label: "B" }], { skipQueue });
            assert.deepEqual(revisions("nodes", "label", "weight", "id"), [label + 1, weight, id]);
            assert.strictEqual(graph.getDataManager().getNode("a")?.data.label, "B");

            await graph.updateNodes([{ id: "a", weight: 5 }], { skipQueue });
            assert.deepEqual(revisions("nodes", "label", "weight", "id"), [label + 1, weight + 1, id]);

            const tick = counters.tick.value;
            await graph.updateNodes([{ id: "a", weight: 5 }], { skipQueue });
            assert.strictEqual(counters.nodes.of("weight"), weight + 2, "a write that changes no value still bumps");
            assert.isAbove(counters.tick.value, tick);
        });
    }

    it("a second load under `last` replaces a live edge's record and bumps every field of both", async () => {
        await load({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b", colour: "red" }] }, "last");
        const edge = graph.getDataManager().getEdgesBetween("a", "b")[0];
        const before = revisions("edges", "colour", "size");

        await load({ nodes: [], edges: [{ source: "a", target: "b", size: 3 }] }, "last");

        assert.strictEqual(graph.getDataManager().getEdgesBetween("a", "b").length, 1);
        assert.strictEqual(edge.data.size, 3);
        assert.notProperty(edge.data, "colour");
        const after = revisions("edges", "colour", "size");
        assert.isAbove(after[0], before[0], "the field that left changed too");
        assert.isAbove(after[1], before[1]);
    });

    for (const policy of ["sum", "last"] as const) {
        it(`the snapshot serial covers a pre-freeze merge under \`${policy}\``, async () => {
            // Edges pushed before their nodes exist wait as pending records: the merge then writes
            // the builder's weight and replaces the pending record, neither of which is a `.data`.
            graph.styles.config.data.knownFields.repeatedEdges = policy;
            await graph.addEdges([{ source: "p", target: "q", weight: 1 }]);
            await graph.operationQueue.waitForCompletion();
            const { serial } = graph.getDataManager().getSnapshot();

            await graph.addEdges([{ source: "p", target: "q", weight: 2 }]);
            await graph.operationQueue.waitForCompletion();
            const snapshot = graph.getDataManager().getSnapshot();

            assert.notStrictEqual(snapshot.serial, serial, "a cache keyed on the serial misses");
            assert.strictEqual(snapshot.edgeCount, 1);
            assert.strictEqual(snapshot.totalWeight(), policy === "sum" ? 3 : 2);
        });
    }
});
