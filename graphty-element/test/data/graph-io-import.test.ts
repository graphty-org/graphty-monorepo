/**
 * @file Reading GML, DOT and Pajek through graph-io's importers.
 *
 * The first block drives the shared helper with a scripted importer, so the record counts, the
 * errors that reach the ErrorAggregator and the failure the element throws are checked without
 * depending on any one format's grammar. The rest pin the record shapes the three sources yield
 * where graph-io's own model differs from what the element has always received.
 */

import type { GraphSink } from "@graphty/graph-format";
import { type GraphImporter, ImportReportBuilder } from "@graphty/graph-io";
import { assert, describe, it } from "vitest";

import type { DataSource } from "../../src/data/DataSource";
import { DOTDataSource } from "../../src/data/DOTDataSource";
import { ErrorAggregator } from "../../src/data/ErrorAggregator";
import { GMLDataSource } from "../../src/data/GMLDataSource";
import { importRecords } from "../../src/data/graph-io-import";
import { PajekDataSource } from "../../src/data/PajekDataSource";
import { isGraphtyError } from "../../src/errors";

/**
 * An importer that runs a script against the sink and the report, and fails when told to.
 * @param script - what to push and record
 * @param failAtLine - when set, abort with a fatal issue on this line after the script
 * @returns the importer
 */
function scripted(
    script: (sink: GraphSink, report: ImportReportBuilder) => void,
    failAtLine?: number,
): GraphImporter {
    return {
        format: "scripted",
        extensions: [],
        mimeTypes: [],
        import(_input, sink) {
            const report = new ImportReportBuilder("scripted", 100);
            script(sink, report);
            if (failAtLine !== undefined) {
                report.fail("E_SCRIPTED", "list never closed", { line: failAtLine });
            }

            return Promise.resolve(report.finish());
        },
    };
}

async function records(source: DataSource): Promise<{ nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }> {
    const nodes: Record<string, unknown>[] = [];
    const edges: Record<string, unknown>[] = [];
    for await (const chunk of source.getData()) {
        nodes.push(...(chunk.nodes as Record<string, unknown>[]));
        edges.push(...(chunk.edges as Record<string, unknown>[]));
    }

    return { nodes, edges };
}

describe("importRecords", () => {
    it("rebuilds one record per node and per file edge, and marks declared nodes", async () => {
        const errors = new ErrorAggregator();
        const imported = await importRecords(
            scripted((sink) => {
                sink.addNode("a");
                sink.setDirected(false);
                sink.addEdge("a", "b");
            }),
            "scripted",
            "",
            {},
            errors,
        );
        assert.deepEqual(
            imported.nodes.map((n) => n.id),
            ["a", "b"],
        );
        assert.deepEqual(imported.declared, [true, false]);
        assert.equal(imported.edges.length, 1);
        assert.deepEqual(imported.edges[0], { source: "a", target: "b" });
        assert.equal(imported.directed, false);
        assert.equal(errors.getErrorCount(), 0);
    });

    it("records the importer's errors, with their lines, and not its warnings", async () => {
        const errors = new ErrorAggregator();
        await importRecords(
            scripted((sink, report) => {
                sink.addNode("a");
                report.error("validation-error", "E_SCRIPTED", "bad node", { line: 7 });
                report.warning("coercion", "W_SCRIPTED", "odd value", { line: 8 });
            }),
            "scripted",
            "",
            {},
            errors,
        );
        const recorded = errors.getErrors();
        assert.equal(recorded.length, 1);
        assert.equal(recorded[0].message, "bad node");
        assert.equal(recorded[0].line, 7);
    });

    it("throws E_PARSE_FAILED with the line the importer blamed", async () => {
        const failing = scripted(() => undefined, 12);
        try {
            await importRecords(failing, "scripted", "", {}, new ErrorAggregator());
            assert.fail("expected a parse failure");
        } catch (error) {
            assert.isTrue(isGraphtyError(error));
            if (isGraphtyError(error)) {
                assert.equal(error.code, "E_PARSE_FAILED");
                assert.equal(error.details?.line, 12);
            }
        }
    });
});

describe("GML through graph-io", () => {
    it("reads a directed key written as a quoted integer", async () => {
        const source = new GMLDataSource({ data: 'graph [ directed "1" node [ id 1 ] node [ id 2 ] edge [ source 1 target 2 ] ]' });
        await records(source);
        assert.equal(source.declaredDirection?.directed, true);
        assert.equal(source.declaredDirection?.statedBy, "directed 1");
        assert.equal(source.getErrorAggregator().getErrorCount(), 0);
    });
});

describe("DOT through graph-io", () => {
    it("keeps pos as the text the file wrote, with no pin key", async () => {
        const { nodes } = await records(new DOTDataSource({ data: 'digraph { a [width=1.5, pos="1,2!"] }' }));
        assert.deepEqual(nodes, [{ id: "a", width: 1.5, pos: "1,2!" }]);
    });

    it("gives cluster members the cluster as parent and strips graph-io's own keys", async () => {
        const { nodes } = await records(new DOTDataSource({ data: "digraph { subgraph cluster_a { a } b }" }));
        assert.deepEqual(nodes, [
            { id: "a", parent: "cluster_a" },
            { id: "b" },
        ]);
    });

    it("yields a cluster an edge points at as a node, so the edge has both endpoints", async () => {
        const { nodes, edges } = await records(
            new DOTDataSource({ data: "digraph { subgraph cluster_a { a } cluster_a -> b }" }),
        );
        const ids = new Set(nodes.map((n) => n.id));
        for (const edge of edges) {
            assert.isTrue(ids.has(edge.source), `source ${String(edge.source)} has a node`);
            assert.isTrue(ids.has(edge.target), `target ${String(edge.target)} has a node`);
        }
        assert.isTrue(ids.has("cluster_a"));
    });
});

describe("Pajek through graph-io", () => {
    it("keeps a z the file wrote as 0", async () => {
        const { nodes } = await records(new PajekDataSource({ data: '*Vertices 1\n1 "a" 0.5 0.25 0.0\n' }));
        assert.deepEqual(nodes, [{ id: "1", label: "a", x: 0.5, y: 0.25, z: 0 }]);
    });

    it("leaves z out when the file writes two coordinates", async () => {
        const { nodes } = await records(new PajekDataSource({ data: '*Vertices 1\n1 "a" 0.5 0.25\n' }));
        assert.deepEqual(nodes, [{ id: "1", label: "a", x: 0.5, y: 0.25 }]);
    });

    it("declares direction from an empty *Arcs or *Edges header alike", async () => {
        const arcs = new PajekDataSource({ data: "*Vertices 2\n1\n2\n*Arcs\n" });
        await records(arcs);
        assert.equal(arcs.declaredDirection?.directed, true);
        const plain = new PajekDataSource({ data: "*Vertices 2\n1\n2\n*Edges\n" });
        await records(plain);
        assert.equal(plain.declaredDirection?.directed, false);
        const none = new PajekDataSource({ data: "*Vertices 2\n1\n2\n" });
        await records(none);
        assert.isNull(none.declaredDirection);
    });
});
