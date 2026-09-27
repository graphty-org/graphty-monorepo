/**
 * @file The identity columns through the element's own import paths (design/sets/sets-design.md
 * 12.2, 12.3): every data source kind, a record push, a Clear and a replacing import, driven through
 * a real `Graph` and its `DataManager`.
 */

import type { DuplicatePolicy, GraphSnapshot } from "@graphty/graph-format";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { hashEdgeMember, hashNodeId } from "../../../src/catalog/sets/hash";
import { IDENTITY_COLUMNS, identityColumnsOf, pairsOrdered, stableEdgeMember } from "../../../src/data/edgeIdentity";
import { Graph } from "../../../src/Graph";
import dataManagerSource from "../../../src/managers/DataManager.ts?raw";
import simpleCsv from "../../helpers/corpus/csv/simple-edges.csv?raw";
import helloDot from "../../helpers/corpus/dot/hello.gv?raw";
import minimalGexf from "../../helpers/corpus/gexf/minimal.gexf?raw";
import karateGml from "../../helpers/corpus/gml/karate.gml?raw";
import simpleGraphml from "../../helpers/corpus/graphml/simple.graphml?raw";
import dolphinsPajek from "../../helpers/corpus/pajek/dolphins.net?raw";

/** A JSON document with a parallel pair and its reverse, so ordinals above 0 appear. */
const JSON_DOCUMENT = JSON.stringify({
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [
        { source: "a", target: "b" },
        { source: "b", target: "a" },
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ],
});

const SOURCES: readonly (readonly [kind: string, data: string])[] = [
    ["json", JSON_DOCUMENT],
    ["csv", simpleCsv],
    ["gml", karateGml],
    ["graphml", simpleGraphml],
    ["gexf", minimalGexf],
    ["dot", helloDot],
    ["pajek", dolphinsPajek],
];

/**
 * Assert a snapshot carries all four columns on every row, with hashes equal to the hash
 * functions of each row's stable identity.
 * @param snapshot - the snapshot
 * @param label - what was loaded, for the messages
 */
function assertIdentity(snapshot: GraphSnapshot, label: string): void {
    assert.isAbove(snapshot.edgeCount, 0, `${label} has edges`);
    assert.strictEqual(snapshot.nodes.get(IDENTITY_COLUMNS.nodeHash)?.nullCount, 0, `${label} node hashes`);
    for (const name of [IDENTITY_COLUMNS.edgeHash, IDENTITY_COLUMNS.edgeOrdinal, IDENTITY_COLUMNS.edgeAmong]) {
        assert.strictEqual(snapshot.edges.get(name)?.nullCount, 0, `${label} ${name}`);
    }

    const { nodeHash, edgeHash } = identityColumnsOf(snapshot);
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const { a, b } = hashNodeId(snapshot.ids.idOf(i));
        assert.deepEqual([nodeHash[2 * i], nodeHash[2 * i + 1]], [a, b], `${label} node ${i}`);
    }

    for (let e = 0; e < snapshot.edgeCount; e++) {
        const { a, b } = hashEdgeMember(stableEdgeMember(snapshot, e), pairsOrdered(snapshot));
        assert.deepEqual([edgeHash[2 * e], edgeHash[2 * e + 1]], [a, b], `${label} edge ${e}`);
    }
}

describe("DataManager fills the identity columns", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    for (const [kind, data] of SOURCES) {
        it(`after a ${kind} load, every edge carries its ordinal within the load`, async () => {
            await graph.addDataFromSource(kind, { data });
            await graph.operationQueue.waitForCompletion();

            const snapshot = graph.getDataManager().getSnapshot();
            assertIdentity(snapshot, kind);
            const { edgeOrdinal, edgeAmong } = identityColumnsOf(snapshot);
            for (let e = 0; e < snapshot.edgeCount; e++) {
                assert.isAtLeast(edgeOrdinal[e], 0, `${kind} edge ${e} is a load edge`);
                assert.isBelow(edgeOrdinal[e], edgeAmong[e]);
            }
        });
    }

    it("after addNodes and addEdges, gives the pushed edges minted ids", async () => {
        await graph.addNodes([{ id: "a" }, { id: "b" }]);
        await graph.addEdges([
            { source: "a", target: "b" },
            { source: "a", target: "b" },
        ]);
        await graph.operationQueue.waitForCompletion();

        const snapshot = graph.getDataManager().getSnapshot();
        assertIdentity(snapshot, "records");
        const minted = [0, 1].map((e) => stableEdgeMember(snapshot, e).id);
        assert.deepEqual(minted.sort(), ["graphty:e0", "graphty:e1"]);
    });

    it("never reissues an edge id after a Clear or a replacing import", async () => {
        const json = (edges: number): string =>
            JSON.stringify({
                nodes: [{ id: "a" }, { id: "b" }],
                edges: Array.from({ length: edges }, () => ({ source: "a", target: "b" })),
            });
        const counters = (): number[] => [
            ...graph.getDataManager().getSnapshot().edges.requireTyped("graphty.edgeId", "u32").data,
        ];

        await graph.addDataFromSource("json", { data: json(3) });
        assert.deepEqual(counters(), [0, 1, 2]);

        graph.getDataManager().clear();
        await graph.addDataFromSource("json", { data: json(1) });
        assert.deepEqual(counters(), [3]);

        await graph.addDataFromSource("json", { data: json(2) }, { replace: true });
        assert.deepEqual(counters(), [4, 5]);
        assert.deepEqual([...identityColumnsOf(graph.getDataManager().getSnapshot()).edgeAmong], [2, 2]);
    });

    it("decides repeated edges through the Node-safe survivorship function", async () => {
        // The source says so: one decision function, no second copy of the policy switch.
        assert.include(dataManagerSource, "decideRepeat(");
        assert.notInclude(dataManagerSource, 'policy === "first"');

        const expectedAmong: Record<Exclude<DuplicatePolicy, "error">, number[]> = {
            keep: [3, 3, 3],
            first: [1],
            last: [1],
            sum: [1],
            min: [1],
            max: [1],
        };
        const data = JSON.stringify({
            nodes: [{ id: "a" }, { id: "b" }],
            edges: [1, 2, 3].map((weight) => ({ source: "a", target: "b", weight })),
        });
        for (const [policy, among] of Object.entries(expectedAmong)) {
            graph.styles.config.data.knownFields.repeatedEdges = policy as DuplicatePolicy;
            await graph.addDataFromSource("json", { data }, { replace: true });
            await graph.operationQueue.waitForCompletion();
            const snapshot = graph.getDataManager().getSnapshot();
            assert.deepEqual([...identityColumnsOf(snapshot).edgeAmong], among, policy);
            assertIdentity(snapshot, policy);
        }
    });
});
