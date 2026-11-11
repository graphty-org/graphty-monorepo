/**
 * APOC exports read by the Neo4j importer: apoc.export.json (JSON Lines, one array, a
 * {nodes, rels} object, query records) and apoc.export.csv (one table of node and relationship
 * rows), and the sniffing that sends both to the neo4j format.
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { NEO4J_ISSUE, neo4jImporter } from "../../../src/formats/neo4j/index.js";
import { registry } from "../../../src/registry.js";
import { type ImportReport } from "../../../src/types.js";

async function load(input: string): Promise<{ s: GraphSnapshot; report: ImportReport }> {
    const b = new GraphBuilder({ directed: true, weightDtype: "f64" });
    const report = await neo4jImporter.import(input, b);
    return { s: b.freeze(), report };
}

function cell(s: GraphSnapshot, table: "nodes" | "edges", name: string, row: number): unknown {
    const column = s[table].require(name);
    return column.dtype === "json" ? column.values[row] : column.value(row);
}

function sniffed(filename: string | null, text: string): string | null {
    return registry.sniff({ filename, head: new TextEncoder().encode(text) })?.format ?? null;
}

const NODE_A =
    '{"type":"node","id":"0","labels":["User","Admin"],"properties":{"name":"Adam","age":42,"place":{"x":1,"y":2}}}';
const NODE_B = '{"type":"node","id":"1","labels":["User"],"properties":{"name":"Jim"}}';
const REL =
    '{"id":"0","type":"relationship","label":"KNOWS","properties":{"since":1993,"weight":2.5},"start":{"id":"0","labels":["User"]},"end":{"id":"1","labels":["User"]}}';

describe("neo4j importer: apoc.export.json", () => {
    it("reads JSON Lines: labels to the labels role, the relationship label to the kind role", async () => {
        const { s, report } = await load([NODE_A, NODE_B, REL].join("\n"));
        expect(report.issues).toEqual([]);
        expect(s.directed).toBe(true);
        expect(s.ids.toArray()).toEqual([0, 1]);
        expect(s.nodes.require("labels").meta.role).toBe("labels");
        expect(cell(s, "nodes", "labels", 0)).toEqual(["User", "Admin"]);
        expect(cell(s, "nodes", "name", 1)).toBe("Jim");
        expect(cell(s, "nodes", "place", 0)).toEqual({ x: 1, y: 2 });
        expect(s.edges.require("type").meta.role).toBe("kind");
        expect(cell(s, "edges", "type", 0)).toBe("KNOWS");
        expect(cell(s, "edges", "since", 0)).toBe(1993);
        expect(s.flags.weighted).toBe(true);
        expect(s.edges.has("weight")).toBe(false);
    });

    it("reads one array, a {nodes, rels} object and query records as the same graph", async () => {
        for (const text of [
            `[${NODE_A},${NODE_B},${REL}]`,
            `{"nodes":[${NODE_A},${NODE_B}],"rels":[${REL}]}`,
            `{"u":${NODE_A},"r":${REL},"p":{"length":1,"rels":[${REL}],"nodes":[${NODE_A},${NODE_B}]}}`,
        ]) {
            const { s } = await load(text);
            expect([s.nodes.rowCount, s.edges.rowCount]).toEqual([2, 1]);
        }
    });

    it("makes nodes of relationship endpoints no node record names", async () => {
        const { s } = await load(REL);
        expect(s.ids.toArray()).toEqual([0, 1]);
        expect(s.edges.rowCount).toBe(1);
    });
});

describe("neo4j importer: apoc.export.json problems", () => {
    it("records a node without an id, a relationship without an end and one without a label", async () => {
        const { s, report } = await load(
            [
                '{"type":"node","id":null}',
                '{"type":"relationship","label":"R","start":{"id":"1"}}',
                '{"type":"relationship","start":{"id":"1"},"end":{"id":"2"}}',
            ].join("\n"),
        );
        expect(report.issues.map((i) => i.code)).toEqual([
            NEO4J_ISSUE.MISSING_ID,
            NEO4J_ISSUE.MISSING_ENDPOINT,
            NEO4J_ISSUE.MISSING_TYPE,
        ]);
        expect([s.nodes.rowCount, s.edges.rowCount]).toEqual([2, 1]);
    });

    it("renames a property named like the labels column", async () => {
        const { s } = await load('{"type":"node","id":"1","labels":["A"],"properties":{"labels":"x"}}');
        expect(cell(s, "nodes", "labels", 0)).toEqual(["A"]);
        expect(cell(s, "nodes", "labels#labels", 0)).toBe("x");
    });
});

describe("neo4j importer: apoc.export.csv", () => {
    it("reads node rows and relationship rows from one table, splitting :A:B labels", async () => {
        const { s, report } = await load(
            '"_id","_labels","name","_start","_end","_type","since"\n"10",":User:Admin","Adam",,,,\n"11",":User","Jim",,,,\n,,,"10","11","KNOWS","1993"\n',
        );
        expect(report.issues).toEqual([]);
        expect(s.ids.toArray()).toEqual([10, 11]);
        expect(cell(s, "nodes", "labels", 0)).toEqual(["User", "Admin"]);
        expect(s.nodes.has("since")).toBe(false);
        expect(s.edges.has("name")).toBe(false);
        expect(cell(s, "edges", "type", 0)).toBe("KNOWS");
        expect(cell(s, "edges", "since", 0)).toBe("1993");
    });

    it("reads quotes:none output", async () => {
        const { s } = await load(
            "_id,_labels,title,_start,_end,_type\n0,:Movie,The Matrix,,,\n1,:Person,Keanu,,,\n,,,1,0,ACTED_IN\n",
        );
        expect([s.nodes.rowCount, s.edges.rowCount]).toEqual([2, 1]);
        expect(cell(s, "nodes", "title", 0)).toBe("The Matrix");
    });
});

describe("sniffing APOC exports", () => {
    it("sends an APOC JSON or CSV export to neo4j, by name and by content", () => {
        for (const filename of ["export.json", null]) {
            expect(sniffed(filename, [NODE_A, REL].join("\n"))).toBe("neo4j");
            expect(sniffed(filename, `{"nodes":[${NODE_A}],"rels":[${REL}]}`)).toBe("neo4j");
        }
        expect(sniffed("export.csv", '"_id","_labels","name","_start","_end","_type"\n')).toBe("neo4j");
    });

    it("leaves other JSON graphs to the json format", () => {
        const nodeLink = '{"nodes":[{"id":1,"type":"node","properties":{"a":1}}],"links":[{"source":1,"target":1}]}';
        expect(sniffed("graph.json", nodeLink)).toBe("json");
        expect(sniffed("graph.json", '{"nodes":[{"id":"a"}],"edges":[]}')).toBe("json");
        expect(sniffed("graph.json", '[{"data":{"id":"a"}}]')).toBe("json");
    });
});
