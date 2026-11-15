import { assert, describe, test } from "vitest";

import type { AdHocData } from "../../src/config";
import { JsonDataSource } from "../../src/data/JsonDataSource";

/**
 * Reads a JSON document with the default paths and returns its node records.
 * @param doc - the document
 * @returns the nodes
 */
async function nodesOf(doc: unknown): Promise<AdHocData[]> {
    const source = new JsonDataSource({ data: JSON.stringify(doc) });
    const nodes: AdHocData[] = [];
    for await (const chunk of source.getData()) {
        nodes.push(...chunk.nodes);
    }
    return nodes;
}

// The dialect is read from the parsed document, never from a head of its text: a vis-network document's first edge
// and its `options` may come after more node records than any head holds.
describe("JsonDataSource: the JSON dialect of the whole document", () => {
    const padding = Array.from({ length: 400 }, (_, i) => ({ id: `pad-${i}`, x: i, y: i, label: "p".repeat(200) }));

    test("a vis-network document reads the same with 80 KB of nodes before its first edge", async () => {
        const small = { nodes: [{ id: "a", x: 10, y: 20 }, { id: "b" }], edges: [{ from: "a", to: "b" }] };
        const large = { nodes: [...small.nodes, ...padding], edges: small.edges };
        assert.isAbove(JSON.stringify(large).indexOf('"from"'), 65536);
        const want = (await nodesOf(small)).find((n) => n.id === "a")?.position;
        const got = (await nodesOf(large)).find((n) => n.id === "a")?.position;
        assert.isDefined(want);
        assert.deepEqual(got, want);
    });

    test("a vis-network document with no edges is told by its options", async () => {
        const withEdge = { nodes: [{ id: "a", x: 10, y: 20 }, { id: "b" }], edges: [{ from: "a", to: "b" }] };
        const edgeless = { nodes: [...withEdge.nodes, ...padding], edges: [], options: { physics: false } };
        const want = (await nodesOf(withEdge)).find((n) => n.id === "a")?.position;
        const got = (await nodesOf(edgeless)).find((n) => n.id === "a")?.position;
        assert.deepEqual(got, want);
    });
});

/**
 * Reads a JSON document with the default paths and returns its node and edge records.
 * @param doc - the document
 * @returns the records
 */
async function recordsOf(doc: unknown): Promise<{ nodes: AdHocData[]; edges: AdHocData[] }> {
    const source = new JsonDataSource({ data: JSON.stringify(doc) });
    const nodes: AdHocData[] = [];
    const edges: AdHocData[] = [];
    for await (const chunk of source.getData()) {
        nodes.push(...chunk.nodes);
        edges.push(...chunk.edges);
    }
    return { nodes, edges };
}

// One path for every document graph-io reads as records: the reader holds no branch on the program that wrote it.
describe("JsonDataSource: the same graph from any program's JSON", () => {
    const cytoscape = {
        elements: {
            nodes: [
                { data: { id: "a" }, position: { x: 10, y: 20 } },
                { data: { id: "b" }, position: { x: 30, y: 40 } },
            ],
            edges: [{ data: { source: "a", target: "b" } }],
        },
    };
    const graphology = {
        options: { type: "directed" },
        nodes: [
            { key: "a", attributes: { x: 10, y: -20 } },
            { key: "b", attributes: { x: 30, y: -40 } },
        ],
        edges: [{ source: "a", target: "b" }],
    };
    const vis = {
        nodes: [
            { id: "a", x: 10, y: 20 },
            { id: "b", x: 30, y: 40 },
        ],
        edges: [{ from: "a", to: "b" }],
    };

    test("gives identical ids, positions and endpoints for Cytoscape.js, graphology and vis.js", async () => {
        const shape = async (doc: unknown): Promise<unknown> => {
            const { nodes, edges } = await recordsOf(doc);
            return {
                nodes: nodes.map((node) => ({ id: node.id, position: node.position })),
                edges: edges.map((edge) => ({ source: edge.source, target: edge.target })),
            };
        };
        const want = await shape(vis);
        assert.deepEqual(want, {
            nodes: [
                { id: "a", position: { x: 10, y: -20, z: 0 } },
                { id: "b", position: { x: 30, y: -40, z: 0 } },
            ],
            edges: [{ source: "a", target: "b" }],
        });
        assert.deepEqual(await shape(cytoscape), want);
        assert.deepEqual(await shape(graphology), want);
    });
});
