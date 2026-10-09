import type { AttributeDescriptor } from "@graphty/graphty-element/catalog";
import type { ImportReport, LoadedSource } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import {
    attributeRows,
    columnOf,
    count,
    fillOf,
    leftOutRow,
    leftOutSentence,
    loadIndexOf,
    noNodeRow,
    sourceRowOf,
    sourceRows,
    sourcesWords,
} from "../words";

/**
 * An import report with these counts; the rest of the report is not read.
 * @param counts - the counts.
 * @returns the report.
 */
function report(counts: Partial<ImportReport["counts"]>): ImportReport {
    return {
        counts: { nodes: 0, edges: 0, nodeRecords: 0, edgeRecords: 0, rejected: 0, ...counts },
    } as ImportReport;
}

/**
 * One load as `data.sources()` lists it.
 * @param name - the source's name.
 * @param tables - the tables it read.
 * @param added - the nodes and edges it added.
 * @param url - the address it was read from; null for a file.
 * @returns the entry.
 */
function loaded(
    name: string | undefined,
    tables: readonly string[],
    added: LoadedSource["added"],
    url: string | null = null,
): LoadedSource {
    return { ...(name === undefined ? {} : { name }), ...(url === null ? {} : { config: { url } }), tables, added };
}

/**
 * An attribute descriptor with what the Data place reads.
 * @param kind - node or edge.
 * @param name - the column name.
 * @param measurement - what it measures.
 * @param completeness - the share of elements with a value.
 * @returns the descriptor.
 */
function attribute(
    kind: "node" | "edge",
    name: string,
    measurement: string | undefined,
    completeness = 1,
): AttributeDescriptor {
    return { kind, name, measurement, completeness } as AttributeDescriptor;
}

describe("the Data place's words", () => {
    it("counts with a singular for one", () => {
        assert.equal(count(1, "node"), "1 node");
        assert.equal(count(1234, "edge"), "1,234 edges");
    });

    it("lists nothing before an import", () => {
        assert.deepEqual(sourceRows([], null), []);
        assert.equal(sourcesWords([]), undefined);
    });

    it("draws a graph file as one row that expands to its node table and edge table", () => {
        const [file] = sourceRows(
            [loaded("karate.gml", ["karate.gml"], { nodes: 34, edges: 78 })],
            report({ nodes: 34, edges: 78, nodeRecords: 34, edgeRecords: 78 }),
        );
        assert.equal(file.kind, "file");
        assert.equal(file.name, "karate.gml");
        assert.equal(file.quiet, "34 nodes, 78 edges");
        assert.deepEqual(
            file.children?.map((t) => [t.kind, t.name, t.quiet]),
            [
                ["nodes", "Node table", "34 rows, 34 nodes"],
                ["edges", "Edge table", "78 rows, 78 edges"],
            ],
        );
    });

    it("draws an edge list as one edge table", () => {
        const rows = sourceRows(
            [loaded("edges.csv", ["edges.csv"], { nodes: 30, edges: 254 })],
            report({ nodes: 30, edges: 254, edgeRecords: 254 }),
        );
        assert.deepEqual(
            rows.map((r) => [r.kind, r.name, r.quiet, r.children]),
            [["edges", "edges.csv", "30 nodes, 254 edges", undefined]],
        );
    });

    it("draws a lone node table with its node count only", () => {
        const rows = sourceRows(
            [loaded("les miserables", [], { nodes: 77, edges: 0 })],
            report({ nodes: 77, nodeRecords: 77 }),
        );
        assert.deepEqual(
            rows.map((r) => [r.kind, r.name, r.quiet]),
            [["nodes", "les miserables", "77 nodes"]],
        );
    });

    it("says how many rows a load left out, and why, in the reader's words", () => {
        const load = {
            ...loaded(undefined, ["people.csv", "passes.csv"], { nodes: 12, edges: 22 }),
            leftOut: { rows: 1, values: 1 },
        };
        const [row] = sourceRows([load, loaded("more.csv", ["more.csv"], { nodes: 1, edges: 1 })], null);
        assert.equal(row.quiet, "12 nodes, 22 edges");
        assert.deepEqual(
            row.children?.map((t) => [t.id, t.kind, t.name]),
            [
                ["source:0:0", "file", "people.csv"],
                ["source:0:1", "file", "passes.csv"],
                ["source:0:left-out", "left-out", "1 row left out"],
            ],
        );
        const [lone] = sourceRows([load], null);
        assert.equal(lone.children?.at(-1)?.name, "1 row left out", "a lone load shows it too");
        // A load that says what each table held draws each as a node or an edge table.
        const [kinds] = sourceRows([{ ...load, tableRows: ["nodes", "edges"] }], null);
        assert.deepEqual(
            kinds.children?.map((t) => t.kind),
            ["nodes", "edges", "left-out"],
        );
        assert.equal(sourceRowOf([load], null, "source:0:left-out")?.name, "1 row left out");
        assert.isUndefined(sourceRowOf([load], null, "source:0:9"));
        assert.equal(
            sourceRows([load, loaded("passes.csv", ["passes.csv"], { nodes: 0, edges: 17 })], null)[1].quiet,
            "17 edges",
        );
        assert.equal(
            leftOutSentence({ rows: 1, values: 1 }),
            "1 edge row was left out: it names a node missing from the node rows.",
        );
        assert.equal(
            leftOutSentence({ rows: 3, values: 2 }),
            "3 edge rows were left out: they name 2 nodes missing from the node rows.",
        );
        assert.equal(
            leftOutRow(
                { source: "p11", target: "p13", line: 24, values: { emails: 6 } },
                { source: "from", target: "to" },
            ),
            "Line 24: from p11, to p13, emails 6",
        );
        assert.equal(
            leftOutRow({ source: "p11", target: "p13", values: { emails: 6 } }),
            "p11, p13, emails 6",
            "a project saved before lines and end columns were kept",
        );
        assert.equal(
            leftOutRow(
                { source: "s04", target: "s11", line: 17, values: { passes: 3 }, missingEnds: ["target"] },
                { source: "from", target: "to" },
            ),
            "Line 17: s11 has no node row; from s04, to s11, passes 3",
            "the end that names no node is marked",
        );
        assert.equal(
            leftOutRow({ source: "x", target: "y", values: {}, missingEnds: ["source", "target"] }),
            "x and y have no node rows; x, y",
        );
        assert.equal(noNodeRow(["s11"]), "s11 has no node row");
        assert.equal(noNodeRow(["s11", "p13", "s11"]), "s11 and p13 have no node rows");
        assert.equal(noNodeRow(["a", "b", "c", "d"]), "a, b and 2 more have no node rows");
        assert.equal(loadIndexOf("source:1:0"), 1);
        assert.isUndefined(loadIndexOf("node:age"));
    });

    it("lists every load, oldest first, a load of two tables expanding to them", () => {
        const loads = [
            loaded(undefined, ["people.csv", "messages.csv"], { nodes: 12, edges: 30 }),
            loaded("friends.csv", ["friends.csv"], { nodes: 3, edges: 41 }),
        ];
        const rows = sourceRows(loads, report({ nodes: 3, edges: 41, edgeRecords: 41 }));
        assert.deepEqual(
            rows.map((r) => [r.id, r.kind, r.name, r.quiet, r.children?.map((t) => [t.id, t.name])]),
            [
                [
                    "source:0",
                    "file",
                    "people.csv and messages.csv",
                    "12 nodes, 30 edges",
                    [
                        ["source:0:0", "people.csv"],
                        ["source:0:1", "messages.csv"],
                    ],
                ],
                ["source:1", "file", "friends.csv", "3 nodes, 41 edges", undefined],
            ],
        );
    });

    it("names the one file the graph came from, or counts them", () => {
        assert.equal(
            sourcesWords([loaded("friends.csv", ["friends.csv"], { nodes: 20, edges: 41 })]),
            "From friends.csv",
        );
        const two = loaded(undefined, ["people.csv", "messages.csv"], { nodes: 12, edges: 30 });
        assert.equal(sourcesWords([two]), "From 2 files");
        assert.equal(sourcesWords([two, loaded("more.csv", ["more.csv"], { nodes: 1, edges: 2 })]), "From 3 files");
        assert.equal(
            sourcesWords([two, loaded("g.json", [], { nodes: 1, edges: 2 }, "https://a.org/g.json")]),
            "From 3 sources",
        );
    });

    it("lists one kind's attributes by name, with the glyph for what each measures and a fill below 100%", () => {
        const attributes = [
            attribute("node", "zeta", "quantitative"),
            attribute("edge", "weight", "quantitative"),
            attribute("node", "group", "categorical", 0.2),
            attribute("node", "born", "time"),
            attribute("node", "rank", "ordinal"),
            attribute("node", "empty", undefined, 0),
        ];
        const rows = attributeRows(attributes, "node");
        assert.deepEqual(
            rows.map((r) => [r.name, r.glyph, r.fill]),
            [
                ["born", "time", null],
                ["empty", "unknown", "0%"],
                ["group", "category", "20%"],
                ["rank", "ordinal", null],
                ["zeta", "number", null],
            ],
        );
        assert.deepEqual(rows[2].column, { kind: "node", name: "group" });
        assert.equal(rows[2].label, "group, node attribute");
        assert.equal(rows[2].description, "Category, 20% have a value");
        assert.deepEqual(
            attributeRows(attributes, "edge").map((r) => r.id),
            ["edge:weight"],
        );
    });

    it("lists the results of runs first, marked by their run, then the rest by name", () => {
        const pagerank = { ...attribute("node", "pagerank", "quantitative"), origin: "result", runId: "r1" };
        const rows = attributeRows(
            [attribute("node", "age", "quantitative"), pagerank as AttributeDescriptor],
            "node",
            "",
            (id) => (id === "r1" ? "PageRank" : undefined),
        );
        assert.deepEqual(
            rows.map((r) => [r.name, r.glyph, r.typeWord]),
            [
                ["pagerank", "result", "Result of PageRank"],
                ["age", "number", "Number"],
            ],
        );
    });

    it("never shows a few values as 0% or a missing value as 100%", () => {
        assert.isNull(fillOf(1));
        assert.equal(fillOf(0), "0%");
        assert.equal(fillOf(0.004), "<1%");
        assert.equal(fillOf(0.999), "99%");
        assert.equal(fillOf(0.25), "25%");
    });

    it("filters by name, ignoring case", () => {
        const attributes = [attribute("node", "Degree", "quantitative"), attribute("node", "group", "categorical")];
        assert.deepEqual(
            attributeRows(attributes, "node", " deg").map((r) => r.name),
            ["Degree"],
        );
    });

    it("reads a column back from an inspected id, even one with a colon in its name", () => {
        assert.deepEqual(columnOf("node:a:b"), { kind: "node", name: "a:b" });
        assert.deepEqual(columnOf("edge:shared chapters"), { kind: "edge", name: "shared chapters" });
        assert.isNull(columnOf("nodes"));
        assert.isNull(columnOf("source:nodes"));
    });
});
