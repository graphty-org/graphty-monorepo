/**
 * @file JSON documents whose elements are not at `nodes` and `edges`: a node-link document whose
 * edges are `links` (NetworkX's `node_link_data`, and d3), and a JGF document of one `graph`. The
 * element loads every node and edge graph-io reads, with the default paths, as it does for every
 * other JSON dialect.
 */

import "../../src/data/index";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { importGraph } from "@graphty/graph-io";
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { DataSource } from "../../src/data/DataSource";

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

describe("graphology and vis.js documents", () => {
    /**
     * Each node's position as the reader hands it to the element, by id.
     * @param doc - The document.
     * @returns The positions.
     */
    async function positionsOf(doc: object): Promise<Map<string, unknown>> {
        const source = DataSource.get("json", { data: JSON.stringify(doc) });
        assert.isNotNull(source);
        const out = new Map<string, unknown>();
        for await (const chunk of source.getData()) {
            for (const node of chunk.nodes) {
                out.set(String(node.id), node.position);
            }
        }

        return out;
    }

    it("hand the element each graphology node's x and y, which the file keeps under attributes", async () => {
        const positions = await positionsOf({
            attributes: {},
            options: { type: "undirected" },
            nodes: [
                { key: "a", attributes: { x: 1, y: 2, size: 3 } },
                { key: "b", attributes: { x: -4, y: 5 } },
            ],
            edges: [{ source: "a", target: "b" }],
        });
        const a = positions.get("a") as { x: number; y: number };
        const b = positions.get("b") as { x: number; y: number };
        assert.isObject(a);
        assert.isObject(b);
        // Relative placement is kept whatever axis convention the reader applies.
        assert.strictEqual(Math.abs(a.x - b.x), 5);
        assert.strictEqual(Math.abs(a.y - b.y), 3);
    });

    it("hand the element each vis.js node's x and y", async () => {
        const positions = await positionsOf({
            nodes: [
                { id: 1, label: "a", x: 10, y: 20 },
                { id: 2, label: "b", x: 30, y: 60 },
            ],
            edges: [{ from: 1, to: 2 }],
        });
        const a = positions.get("1") as { x: number; y: number };
        const b = positions.get("2") as { x: number; y: number };
        assert.isObject(a);
        assert.isObject(b);
        assert.strictEqual(Math.abs(a.x - b.x), 20);
        assert.strictEqual(Math.abs(a.y - b.y), 40);
    });
});
