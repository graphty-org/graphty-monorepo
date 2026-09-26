import { readFileSync } from "node:fs";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { JSON_ISSUE, jsonImporter, type JsonImportOptions } from "../../../src/formats/json/index.js";
import { sniffJsonDialectHead } from "../../../src/sniff.js";
import { type CommonImportOptions, type ImportReport } from "../../../src/types.js";

type Options = JsonImportOptions & CommonImportOptions;

async function load(
    text: string,
    options?: Options,
    directed = false,
): Promise<{ s: GraphSnapshot; report: ImportReport }> {
    const b = new GraphBuilder({ directed, weightDtype: "f64" });
    const report = await jsonImporter.import(text, b, options);
    return { s: b.freeze(), report };
}

function edges(s: GraphSnapshot): string[] {
    const list = s.edgeList();
    return Array.from(
        { length: s.edgeCount },
        (_, e) => `${String(s.ids.idOf(list.src[e]))}-${String(s.ids.idOf(list.dst[e]))}`,
    );
}

function errors(report: ImportReport): string[] {
    return report.issues.filter((i) => i.severity === "error").map((i) => i.code);
}

const ADJACENCY =
    '{"directed":false,"multigraph":false,"graph":[],"nodes":[{"id":1},{"id":2},{"id":3}],"adjacency":[[{"id":2}],[{"id":1},{"id":3}],[{"id":2}]]}';
const TREE = '{"id":1,"children":[{"id":2,"children":[{"id":4}]},{"id":3,"color":"red"}]}';

describe("networkx adjacency_data (issue 68)", () => {
    it("reads each undirected edge once from its two mirrored entries", async () => {
        const { s, report } = await load(ADJACENCY);
        expect(s.nodeCount).toBe(3);
        expect(edges(s)).toEqual(["1-2", "2-3"]);
        expect(s.directed).toBe(false);
        expect(errors(report)).toEqual([]);
    });

    it("reads a directed multigraph: keys and attributes, parallel edges, self-loops", async () => {
        const doc = JSON.stringify({
            directed: true,
            multigraph: true,
            graph: { name: "g" },
            nodes: [{ id: "a", c: 1 }, { id: "b" }],
            adjacency: [
                [
                    { id: "b", key: 0, weight: 2 },
                    { id: "b", key: 1, weight: 3 },
                    { id: "a", key: 0 },
                ],
                [{ id: "a", key: 0, label: "back" }],
            ],
        });
        const { s } = await load(doc, undefined, true);
        expect(edges(s)).toEqual(["a-b", "a-b", "a-a", "b-a"]);
        expect(s.edges.require("key").value(1)).toBe(1);
        expect(s.edges.require("label").value(3)).toBe("back");
        expect(s.nodes.require("c").value(0)).toBe(1);
        expect(s.graph.require("name").value(0)).toBe("g");
    });

    it("reads an undirected multigraph once per key, and a self-loop once", async () => {
        const doc = JSON.stringify({
            directed: false,
            multigraph: true,
            graph: {},
            nodes: [{ id: 0 }, { id: 1 }],
            adjacency: [
                [
                    { id: 1, key: 0 },
                    { id: 1, key: 1 },
                    { id: 0, key: 0 },
                ],
                [
                    { id: 0, key: 0 },
                    { id: 0, key: 1 },
                ],
            ],
        });
        const { s } = await load(doc);
        expect(edges(s)).toEqual(["0-1", "0-1", "0-0"]);
    });

    it("pairs keyless parallel entries of an undirected multigraph with their mirrors", async () => {
        const doc = JSON.stringify({
            multigraph: true,
            nodes: [{ id: 0 }, { id: 1 }],
            adjacency: [
                [
                    { id: 1, c: "x" },
                    { id: 1, c: "y" },
                ],
                [
                    { id: 0, c: "x" },
                    { id: 0, c: "y" },
                ],
            ],
        });
        const { s } = await load(doc);
        expect(edges(s)).toEqual(["0-1", "0-1"]);
        expect([s.edges.require("c").value(0), s.edges.require("c").value(1)]).toEqual(["x", "y"]);
    });

    it("reads the graph attributes networkx writes as [key, value] pairs", async () => {
        const text = readFileSync(
            new URL("../../conformance/fixtures/json/networkx/karate.adjacency.json", import.meta.url),
            "utf8",
        );
        const { s, report } = await load(text);
        expect(s.graph.require("name").value(0)).toBe("Zachary's Karate Club");
        expect(report.issues.map((i) => i.code)).not.toContain(JSON_ISSUE.BAD_FLAG);
        const empty = await load(ADJACENCY);
        expect(empty.report.issues.map((i) => i.code)).not.toContain(JSON_ISSUE.BAD_FLAG);
    });

    it("reports a list without a node and an entry without an id", async () => {
        const doc = JSON.stringify({ nodes: [{ id: 0 }], adjacency: [[{ id: 0 }, { x: 1 }], [{ id: 0 }]] });
        const { s, report } = await load(doc);
        expect(s.edgeCount).toBe(1);
        expect(errors(report)).toEqual([JSON_ISSUE.MISSING_ENDPOINT, JSON_ISSUE.BAD_INDEX]);
    });

    it("is sniffed, and can be forced", async () => {
        expect(sniffJsonDialectHead(ADJACENCY)).toBe("adjacency");
        // a head cut before the adjacency key reads as node-link; the importer decides on the whole document
        expect(sniffJsonDialectHead(ADJACENCY.slice(0, ADJACENCY.indexOf("adjacency") + 14))).toBe("adjacency");
        const { s } = await load(ADJACENCY, { dialect: "adjacency" });
        expect(s.edgeCount).toBe(2);
    });
});

describe("networkx tree_data (issue 68)", () => {
    it("reads a directed tree with parent-to-child edges", async () => {
        const { s, report } = await load(TREE, undefined, true);
        expect(s.nodeCount).toBe(4);
        expect(Array.from({ length: 4 }, (_, i) => s.ids.idOf(i))).toEqual([1, 2, 4, 3]);
        expect(edges(s)).toEqual(["1-2", "2-4", "1-3"]);
        expect(s.directed).toBe(true);
        expect(s.nodes.require("color").value(3)).toBe("red");
        expect(s.nodes.has("children")).toBe(false);
        expect(errors(report)).toEqual([]);
    });

    it("is sniffed, and can be forced", async () => {
        expect(sniffJsonDialectHead(TREE)).toBe("tree");
        expect(sniffJsonDialectHead(TREE.slice(0, 20))).toBe("tree");
        const { s } = await load(TREE, { dialect: "tree" }, true);
        expect(s.edgeCount).toBe(3);
    });

    it("keeps the subtree of a node without an id, and reports a bad children value", async () => {
        const doc = JSON.stringify({ id: "r", children: [{ children: [{ id: "c" }] }, { id: "d", children: 5 }] });
        const { s, report } = await load(doc, undefined, true);
        expect(Array.from({ length: s.nodeCount }, (_, i) => s.ids.idOf(i))).toEqual(["r", "c", "d"]);
        expect(edges(s)).toEqual(["r-d"]);
        expect(errors(report)).toEqual([JSON_ISSUE.MISSING_ID, JSON_ISSUE.BAD_VALUE]);
    });
});
