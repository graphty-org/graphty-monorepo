import { describe, expect, it } from "vitest";

import { readJsonRecords } from "../../../src/formats/json/records.js";

/** One graph, a -> b with a weight attribute, a placed and b placed, written by three programs. */
const CYTOSCAPE = JSON.stringify({
    elements: {
        nodes: [
            { data: { id: "a", kind: "x" }, position: { x: 0, y: 0 } },
            { data: { id: "b", kind: "y" }, position: { x: 10, y: 20 } },
        ],
        edges: [{ data: { id: "e", source: "a", target: "b", w: 2 } }],
    },
});
const GRAPHOLOGY = JSON.stringify({
    options: { type: "directed", multi: false },
    nodes: [
        { key: "a", attributes: { kind: "x", x: 0, y: 0 } },
        { key: "b", attributes: { kind: "y", x: 10, y: 20 } },
    ],
    edges: [{ key: "e", source: "a", target: "b", attributes: { w: 2 } }],
});
const VIS = JSON.stringify({
    nodes: [
        { id: "a", kind: "x", x: 0, y: 0 },
        { id: "b", kind: "y", x: 10, y: 20 },
    ],
    edges: [{ id: "e", from: "a", to: "b", w: 2 }],
});

/**
 * The parts of a read that every dialect shares: node ids and whether each is placed, edge endpoints (under
 * the document's own keys, `source`/`target` or vis.js's `from`/`to`).
 * @param text - the document
 * @returns the common record shape
 */
async function shapeOf(text: string): Promise<unknown> {
    const read = await readJsonRecords(text);
    return {
        nodes: read?.nodes.map((n) => ({ id: n.id, placed: typeof n.position === "object" })),
        edges: read?.edges.map((e) => ({ source: e.source ?? e.from, target: e.target ?? e.to })),
    };
}

describe("readJsonRecords", () => {
    it("returns the same record shape for equivalent Cytoscape.js, graphology and vis documents", async () => {
        const expected = {
            nodes: [
                { id: "a", placed: true },
                { id: "b", placed: true },
            ],
            edges: [{ source: "a", target: "b" }],
        };
        expect(await shapeOf(CYTOSCAPE)).toEqual(expected);
        expect(await shapeOf(GRAPHOLOGY)).toEqual(expected);
        expect(await shapeOf(VIS)).toEqual(expected);
    });

    it("flattens a Cytoscape.js element's data keys onto its record", async () => {
        const read = await readJsonRecords(CYTOSCAPE);
        expect(read?.nodes[0]).toMatchObject({ id: "a", kind: "x" });
        expect(read?.edges[0]).toMatchObject({ source: "a", target: "b", w: 2 });
        expect(read?.path("node", "kind")).toEqual(["kind"]);
    });

    it("keeps a graphology record as written and finds an attribute under attributes", async () => {
        const read = await readJsonRecords(GRAPHOLOGY);
        expect(read?.nodes[0]).toMatchObject({ id: "a", key: "a", attributes: { kind: "x" } });
        expect(read?.path("node", "kind")).toEqual(["attributes", "kind"]);
    });

    it("keeps a vis record's own keys", async () => {
        const read = await readJsonRecords(VIS);
        expect(read?.edges[0]).toMatchObject({ from: "a", to: "b", w: 2 });
        expect(read?.path("edge", "w")).toEqual(["w"]);
    });

    it("hands over only the edges the importer kept", async () => {
        const text = JSON.stringify({
            nodes: [{ id: "a" }, { id: "b" }],
            edges: [
                { from: "a", to: "b", w: 1 },
                { from: "a", w: 2 },
                { from: "b", to: "a", w: 3 },
            ],
        });
        const read = await readJsonRecords(text);
        expect(read?.edges.map((e) => e.w)).toEqual([1, 3]);
        expect(read?.edges[1]).toMatchObject({ from: "b", to: "a" });
    });

    it("answers null for a document of another dialect", async () => {
        expect(await readJsonRecords(JSON.stringify({ nodes: [{ id: "a" }], links: [] }))).toBeNull();
    });
});
