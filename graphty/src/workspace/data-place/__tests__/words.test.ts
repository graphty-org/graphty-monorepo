import type { AttributeDescriptor } from "@graphty/graphty-element/catalog";
import type { ImportReport } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { attributeRows, columnOf, count, sourceRows } from "../words";

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
        assert.deepEqual(sourceRows(null, null), []);
        assert.deepEqual(sourceRows({ name: "a.gml" }, null), []);
    });

    it("draws a graph file as one row that expands to its node table and edge table", () => {
        const [file] = sourceRows(
            { type: "gml", name: "karate.gml" },
            report({ nodes: 34, edges: 78, nodeRecords: 34, edgeRecords: 78 }),
        );
        assert.equal(file.kind, "file");
        assert.equal(file.name, "karate.gml");
        assert.equal(file.quiet, "34 nodes, 78 edges");
        assert.deepEqual(
            file.children?.map((t) => [t.kind, t.name, t.quiet]),
            [
                ["nodes", "Nodes", "34 rows, 34 nodes"],
                ["edges", "Edges", "78 rows, 78 edges"],
            ],
        );
    });

    it("draws an edge list as one edge table", () => {
        const rows = sourceRows({ name: "edges.csv" }, report({ nodes: 30, edges: 254, edgeRecords: 254 }));
        assert.deepEqual(
            rows.map((r) => [r.kind, r.name, r.quiet, r.children]),
            [["edges", "edges.csv", "254 rows, 254 edges", undefined]],
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
        assert.deepEqual(
            attributeRows(attributes, "edge").map((r) => r.id),
            ["edge:weight"],
        );
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
