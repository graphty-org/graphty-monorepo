/**
 * @file The shared path the XML data sources read through: a graph-io importer into a scratch
 * builder, the report's errors into the source's aggregator, and records rebuilt from the rows.
 */
import type { GraphSink } from "@graphty/graph-format";
import { type GraphImporter, ImportReportBuilder } from "@graphty/graph-io";
import { assert, describe, it } from "vitest";

import { ErrorAggregator } from "../../src/data/ErrorAggregator.js";
import { aggregateErrors, importDocument, toRecords } from "../../src/data/graph-io-import.js";

/**
 * An importer that records what it was asked to read and pushes a fixed graph: node "b" is named
 * by an edge before the file declares it, node "z" is never declared, and one element is an error.
 */
function recordingImporter(): GraphImporter & { calls: { text: string; ids: unknown }[] } {
    const calls: { text: string; ids: unknown }[] = [];
    return {
        calls,
        format: "test",
        extensions: [],
        mimeTypes: [],
        import(input, sink: GraphSink, options) {
            calls.push({ text: input as string, ids: options?.ids });
            const report = new ImportReportBuilder("test", Infinity);
            sink.addNode("a");
            sink.addEdge("a", "b");
            sink.addEdge("b", "z");
            sink.addNode("b");
            report.warning("coercion", "W_TEST", "a warning stays in the report");
            report.error("validation-error", "E_TEST", "a skipped element", { line: 7, element: "q" });
            return Promise.resolve(report.finish());
        },
    };
}

describe("the graph-io import helper", () => {
    it("reads the text with string ids and rebuilds declared nodes in declaration order", async () => {
        const importer = recordingImporter();
        const imported = await importDocument(importer, "doc", {});
        const { nodes, edges } = toRecords(imported, { node() {}, edge() {} });

        assert.deepEqual(importer.calls, [{ text: "doc", ids: "string" }]);
        assert.deepEqual(
            nodes.map((node) => node.id),
            ["a", "b"],
        );
        assert.deepEqual(
            edges.map((edge) => [edge.source, edge.target]),
            [
                ["a", "b"],
                ["b", "z"],
            ],
        );
    });

    it("copies only the report's errors into the aggregator", async () => {
        const imported = await importDocument(recordingImporter(), "doc", {});
        const errors = new ErrorAggregator(100);
        aggregateErrors(imported.report, errors);

        assert.strictEqual(errors.getErrorCount(), 1);
        const [error] = errors.getErrors();
        assert.strictEqual(error.message, "a skipped element");
        assert.strictEqual(error.line, 7);
        assert.strictEqual(error.field, "q");
    });
});
