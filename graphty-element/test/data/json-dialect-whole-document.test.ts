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
