/**
 * Golden output of the adjacency, graphology, JGF and Cytoscape readers over documents that reach
 * every branch of their import functions: the whole snapshot (ids, edges, columns, meta) and the
 * whole report, so a refactoring of those functions cannot change what they read or report.
 */
import { type AttributeTable, GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { jsonImporter, type JsonImportOptions } from "../../../src/formats/json/index.js";

function table(t: AttributeTable, rows: number): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const name of t.names()) {
        const column = t.require(name);
        out[name] = {
            meta: column.meta,
            values: Array.from({ length: rows }, (_, r) => (t.isSet(name, r) ? t.value(name, r) : "<unset>")),
        };
    }
    return out;
}

function dump(s: GraphSnapshot): unknown {
    const list = s.edgeList();
    return {
        directed: s.directed,
        ids: Array.from({ length: s.nodeCount }, (_, i) => s.ids.idOf(i)),
        edges: Array.from({ length: s.edgeCount }, (_, e) => [s.ids.idOf(list.src[e]), s.ids.idOf(list.dst[e])]),
        nodes: table(s.nodes, s.nodeCount),
        edgeColumns: table(s.edges, s.edgeCount),
        graph: table(s.graph, 1),
        meta: s.meta,
    };
}

function replacer(key: string, value: unknown): unknown {
    // the one field that is not the importer's output
    if (key === "durationMs") {
        return undefined;
    }
    if (ArrayBuffer.isView(value)) {
        return Array.from(value as unknown as ArrayLike<number>);
    }
    if (typeof value === "bigint") {
        return `${value}n`;
    }
    return value;
}

/** A lone surrogate: an id the builder refuses. */
const LONE = String.fromCharCode(0xd800);

async function golden(doc: unknown, options: JsonImportOptions, addMissingNodes: boolean): Promise<unknown> {
    const b = new GraphBuilder({ directed: false, weightDtype: "f64", addMissingNodes });
    let result: unknown;
    try {
        const report = await jsonImporter.import(JSON.stringify(doc), b, options);
        result = { snapshot: dump(b.freeze()), report };
    } catch (err) {
        result = { thrown: err instanceof Error ? `${err.name}: ${err.message}` : String(err) };
    }
    return JSON.parse(JSON.stringify(result, replacer)) as unknown;
}

const ADJACENCY: Record<string, unknown> = {
    "undirected mirrors": {
        directed: false,
        multigraph: false,
        graph: [["name", "g"]],
        nodes: [{ id: 1, c: "x" }, { id: 2 }, { id: 3 }],
        adjacency: [[{ id: 2, w: 1 }], [{ id: 1, w: 1 }, { id: 3 }], [{ id: 2, other: true }]],
    },
    "directed multigraph with weights": {
        directed: true,
        multigraph: true,
        graph: { name: "g" },
        nodes: [{ id: "a" }, { id: "b" }],
        adjacency: [
            [
                { id: "b", key: 0, weight: 2 },
                { id: "b", key: 1, weight: 3 },
                { id: "a", key: 0 },
            ],
            [{ id: "a", key: 0, label: "back" }],
        ],
    },
    "no adjacency, no nodes, extra keys": { directed: "yes", multigraph: 3, graph: 5, extra: 1 },
    "bad nodes and lists": {
        directed: false,
        nodes: [5, { name: "no id" }, { id: "a" }, { id: "a" }, { id: true }, { id: "b" }],
        adjacency: [
            [{ id: "b" }],
            [{ id: "b" }],
            "not a list",
            [{ id: "a" }],
            [],
            [7, { name: 1 }, { id: null }, { id: "a" }, { id: "zz" }],
            [{ id: "a" }],
            [{ id: "b" }],
        ],
    },
    "short adjacency": { directed: false, nodes: [{ id: 1 }, { id: 2 }, { id: 3 }], adjacency: [[{ id: 2 }]] },
    "nodes not an array": { nodes: { id: 1 }, adjacency: [[]] },
    "refused ids": {
        directed: true,
        nodes: [{ id: "a" }, { id: LONE }, { id: "b" }],
        adjacency: [[{ id: LONE }, { id: "b" }, { id: "zz" }], [{ id: "a" }], [{ id: "a" }]],
    },
    "adjacency not an array": { nodes: [{ id: 1 }], adjacency: { x: 1 } },
};

const GRAPHOLOGY: Record<string, unknown> = {
    "mixed with flags": {
        attributes: { name: "g" },
        options: { type: "mixed", multi: false, allowSelfLoops: false },
        nodes: [
            { key: "a", attributes: { x: 1 } },
            { key: "b", extra: 2 },
            4,
            { attributes: {} },
            { key: "c", attributes: 5 },
        ],
        edges: [
            { key: "e1", source: "a", target: "b", undirected: true, attributes: { weight: 2 } },
            { key: "e2", source: "a", target: "b", undirected: true },
            { source: "a", target: "a", attributes: "bad" },
            { source: "a" },
            { target: "b" },
            7,
            { source: true, target: "b" },
            { source: "a", target: "zz", undirected: "maybe" },
        ],
    },
    "directed with contrary flags": {
        options: { type: "directed", multi: true },
        nodes: [{ key: 1 }, { key: 2 }],
        edges: [
            { source: 1, target: 2, undirected: true },
            { source: 2, target: 1, undirected: false },
            { source: 1, target: 2 },
        ],
    },
    "undirected no multi": {
        options: { type: "undirected", multi: false, allowSelfLoops: true },
        nodes: [{ key: 1 }, { key: 2 }],
        edges: [
            { source: 1, target: 2 },
            { source: 2, target: 1, undirected: false },
        ],
    },
    "bad options": { options: 5, nodes: [{ key: 1 }], edges: [] },
    "bad type": {
        options: { type: "weird", multi: "x", allowSelfLoops: 2 },
        nodes: [{ key: 1 }],
        edges: [{ source: 1, target: 1 }],
    },
    "mixed all undirected": {
        options: {},
        nodes: [{ key: 1 }, { key: 2 }],
        edges: [{ source: 1, target: 2, undirected: true }],
    },
    "mixed no edges, no sections": { options: { type: null }, other: 1 },
};

const JGF: Record<string, unknown> = {
    "keyed nodes": {
        graph: {
            id: "g1",
            type: "t",
            label: "L",
            directed: true,
            metadata: { m: 1 },
            nodes: {
                a: { label: "A", metadata: { x: 1 } },
                b: { id: "other", label: 3 },
                c: null,
                d: 5,
                "": {},
            },
            edges: [
                { id: "e1", source: "a", target: "b", relation: "r", label: "l", metadata: { weight: 2 } },
                { source: "a", target: "c", directed: false, metadata: 4 },
                { source: "a" },
                9,
                { source: "a", target: null },
                { source: "a", target: false },
                { source: "zz", target: "a" },
            ],
            hyperedges: [{ nodes: ["a", "b", "c"], relation: "h" }],
        },
    },
    "v1 array nodes": {
        graph: {
            directed: "x",
            nodes: [{ id: "a", label: "A" }, { label: "no id" }, 3, { id: "b" }],
            edges: [{ source: "a", target: "b", directed: false }],
        },
    },
    "all edges undirected": {
        graph: { nodes: { a: {}, b: {} }, edges: [{ source: "a", target: "b", directed: false }] },
    },
    "bad nodes": { graph: { nodes: 5 } },
    "no nodes": { graph: { edges: [{ source: "a", target: "b" }] } },
    "graphs array": {
        graphs: [
            { id: "one", nodes: { a: {} }, edges: [] },
            { id: "two", nodes: { b: {} }, edges: [] },
        ],
    },
};

const CYTOSCAPE: Record<string, unknown> = {
    "sections with everything": {
        data: { name: "g" },
        style: [],
        zoom: 2,
        elements: {
            nodes: [
                {
                    data: { id: "a", label: "A", parent: "p" },
                    position: { x: 1, y: 2 },
                    classes: "c1 c2",
                    selected: true,
                },
                { data: { id: "p", parent: null }, position: { x: 1, y: 2, z: 3 } },
                { data: { id: "b", parent: true }, position: { x: "bad" } },
                { data: { id: "c", parent: "nope", source: "a", target: "b" }, position: null, locked: false },
                { data: { id: "a" } },
                { data: { name: "no id" } },
                { nodata: 1 },
                5,
                { data: { id: "x1", parent: "x2" } },
                { data: { id: "x2", parent: "x1" } },
                { data: { id: "big", n: null } },
                { data: { id: "z", parent: "a" }, position: { x: 0, y: 0, z: "q" }, classes: ["k"] },
                { data: { id: "q" }, position: 5 },
                { data: { id: LONE } },
            ],
            edges: [{ data: { id: "e", source: "a", target: "b", weight: 2 }, classes: ["k"] }],
        },
    },
    "flat array": [{ group: "nodes", data: { id: 1 } }, { data: { id: 2 } }, { data: { source: 1, target: 2 } }],
    "bad positions": {
        elements: {
            nodes: [
                { data: { id: "a" }, position: 1 },
                { data: { id: "b" }, position: 2 },
                { data: { id: "c" }, position: 3 },
            ],
        },
    },
    "not an object": 5,
    "object without elements": { data: { x: 1 } },
};

const DIALECTS: [string, NonNullable<JsonImportOptions["dialect"]>, Record<string, unknown>][] = [
    ["adjacency", "adjacency", ADJACENCY],
    ["graphology", "graphology", GRAPHOLOGY],
    ["jgf", "jgf", JGF],
    ["cytoscape", "cytoscape", CYTOSCAPE],
];

const OPTION_SETS: [string, JsonImportOptions][] = [
    ["defaults", {}],
    ["defaultDirected and string ids", { defaultDirected: true, ids: "string" }],
    ["nodeIdKey name, weightFrom w", { nodeIdKey: "name", weightFrom: "w" }],
    ["number ids", { ids: "number" }],
    ["error limit 2", { errorLimit: 2 }],
];

describe("JSON importer golden output", () => {
    for (const [name, dialect, docs] of DIALECTS) {
        for (const [docName, doc] of Object.entries(docs)) {
            for (const [optionName, options] of OPTION_SETS) {
                it(`${name}: ${docName} (${optionName})`, async () => {
                    expect(await golden(doc, { ...options, dialect }, true)).toMatchSnapshot();
                });
            }
            it(`${name}: ${docName} (no missing nodes added)`, async () => {
                expect(await golden(doc, { dialect }, false)).toMatchSnapshot();
            });
        }
    }
});
