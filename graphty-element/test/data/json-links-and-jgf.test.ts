/**
 * @file JSON documents whose elements are not at `nodes` and `edges`: a node-link document whose
 * edges are `links` (NetworkX's `node_link_data`, and d3), and a JGF document of one `graph`. The
 * element loads every node and edge graph-io reads, with the default paths, as it does for every
 * other JSON dialect.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { importGraph } from "@graphty/graph-io";
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

const FIXTURES = join(__dirname, "..", "..", "..", "graph-io", "test", "conformance", "fixtures", "json");

const encode = (text: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(text);

/**
 * The node and edge counts the element loads, and graph-io's.
 * @param data - The document.
 * @returns Both counts.
 */
async function counts(data: Uint8Array<ArrayBuffer>): Promise<{ element: number[]; graphIo: number[] }> {
    const session = createGraphSession();
    try {
        await session.data.import({ type: "json", config: { data } });
        const { snapshot } = await importGraph(data, { format: "json" });
        return {
            element: [session.data.nodes().length, session.data.edges().length],
            graphIo: [snapshot.nodeCount, snapshot.edgeCount],
        };
    } finally {
        session.dispose();
    }
}

describe("JSON documents graph-io reads whole", () => {
    it("loads every link of a NetworkX node-link file", async () => {
        const data = new Uint8Array(readFileSync(join(FIXTURES, "networkx", "karate.node_link.json")));
        const { element, graphIo } = await counts(data);
        assert.deepEqual(element, [34, 78]);
        assert.deepEqual(element, graphIo);
    });

    it("loads every link of a d3 file, whose links may name nodes by position", async () => {
        const data = encode(
            JSON.stringify({
                nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
                links: [
                    { source: 0, target: 1 },
                    { source: "b", target: "c" },
                ],
            }),
        );
        const { element, graphIo } = await counts(data);
        assert.deepEqual(element, graphIo);
        assert.strictEqual(element[1], 2);
    });

    it("loads a JGF document of one graph, in the direction it states", async () => {
        const data = encode(
            JSON.stringify({
                graph: {
                    directed: false,
                    nodes: { a: { label: "A" }, b: {}, c: {} },
                    edges: [
                        { source: "a", target: "b" },
                        { source: "b", target: "c" },
                    ],
                },
            }),
        );
        const session = createGraphSession();
        try {
            await session.data.import({ type: "json", config: { data } });
            assert.strictEqual(session.data.nodes().length, 3);
            assert.strictEqual(session.data.edges().length, 2);
            assert.strictEqual(session.data.snapshot().directed, false);
        } finally {
            session.dispose();
        }
    });
});
