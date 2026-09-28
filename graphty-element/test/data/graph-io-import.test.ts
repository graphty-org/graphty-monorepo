/**
 * @file The shared path the XML data sources read through: a graph-io importer into a scratch
 * builder, the report's errors into the source's aggregator, and records rebuilt from the rows.
 */
import type { GraphSink } from "@graphty/graph-format";
import { type CommonImportOptions, type GraphImporter, ImportError, ImportReportBuilder } from "@graphty/graph-io";
import { assert, describe, it } from "vitest";

import { ErrorAggregator } from "../../src/data/ErrorAggregator.js";
import { aggregateErrors, cell, components, importDocument, toRecords } from "../../src/data/graph-io-import.js";

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

    it("hands the importer the caller's options, and lets the caller choose the id kind", async () => {
        const seen: (CommonImportOptions | undefined)[] = [];
        const importer: GraphImporter = {
            format: "test",
            extensions: [],
            mimeTypes: [],
            import(_input, _sink, options) {
                seen.push(options);
                return Promise.resolve(new ImportReportBuilder("test", Infinity).finish());
            },
        };

        await importDocument(importer, "doc", { errorLimit: 5 });
        await importDocument(importer, "doc", { ids: "number" });

        assert.strictEqual(seen[0]?.errorLimit, 5);
        assert.strictEqual(seen[0]?.ids, "string");
        assert.strictEqual(seen[1]?.ids, "number");
    });

    it("keeps every weight exactly, and gives an edge the file left unweighted no weight", async () => {
        const importer = weightedImporter([0.1, 16777217, undefined]);
        const { edges } = toRecords(await importDocument(importer, "doc", {}), { node() {}, edge() {} });

        assert.deepEqual(
            edges.map((edge) => edge.weight),
            [0.1, 16777217, undefined],
        );
        assert.isFalse("weight" in edges[2]);
    });

    it("keeps the weights when every edge has one and they live in the arc arrays alone", async () => {
        const importer = weightedImporter([2, 0.5]);
        const { edges } = toRecords(await importDocument(importer, "doc", {}), { node() {}, edge() {} });

        assert.deepEqual(
            edges.map((edge) => edge.weight),
            [2, 0.5],
        );
    });

    it("hands each format's mapping the row of every record it writes", async () => {
        const imported = await importDocument(cellImporter(), "doc", {});
        const label = imported.snapshot.nodes.get("label");
        const score = imported.snapshot.edges.get("score");
        assert.isNotNull(label);
        assert.isNotNull(score);
        if (label === null || score === null) {
            return;
        }

        const { nodes, edges } = toRecords(imported, {
            node(row, record) {
                if (label.isSet(row)) {
                    record.label = cell(label, row);
                }
            },
            edge(row, record) {
                record.score = cell(score, row);
            },
        });

        assert.deepEqual<unknown>(nodes, [{ id: "a", label: "Alpha" }, { id: "b" }]);
        assert.deepEqual<unknown>(edges, [{ source: "a", target: "b", score: 88.3 }]);
    });

    it("widens an f32 cell to the decimal the file wrote, and copies a multi-component cell", async () => {
        const { snapshot } = await importDocument(cellImporter(), "doc", {});
        const score = snapshot.edges.get("score");
        const position = snapshot.nodes.get("position");
        const color = snapshot.nodes.get("color");
        assert.isNotNull(score);
        assert.isNotNull(position);
        assert.isNotNull(color);
        if (score === null || position === null || color === null) {
            return;
        }

        const row = snapshot.ids.indexOf("b");
        assert.strictEqual(cell(score, 0), 88.3);
        assert.deepEqual(components(position, row), [1, 2, 3]);
        assert.deepEqual(components(color, row), [0.1, 0.2, 0.3]);
        assert.isTrue(Array.isArray(components(position, row)));
    });

    it("keeps what a recognisable document gave before the importer gave up", async () => {
        const imported = await importDocument(abortingImporter(1), "doc", {});

        assert.deepEqual<unknown>(toRecords(imported, { node() {}, edge() {} }).nodes, [{ id: "a" }]);
        assert.strictEqual(imported.report.errorCount, 1);
    });

    it("throws the importer's failure for a document it does not recognise, or for a fatal issue", async () => {
        let unrecognised: unknown;
        try {
            await importDocument(abortingImporter(0), "doc", {});
        } catch (error) {
            unrecognised = error;
        }

        let fatal: unknown;
        try {
            await importDocument(abortingImporter(1), "doc", {}, ["E_TEST"]);
        } catch (error) {
            fatal = error;
        }

        assert.instanceOf(unrecognised, ImportError);
        assert.instanceOf(fatal, ImportError);
    });
});

/**
 * An importer that pushes a path of weighted edges; an `undefined` weight is an edge the file gave none.
 * @param weights - one weight per edge, edge i joining node i to node i + 1
 * @returns the importer
 */
function weightedImporter(weights: (number | undefined)[]): GraphImporter {
    return {
        format: "test",
        extensions: [],
        mimeTypes: [],
        import(_input, sink: GraphSink) {
            weights.forEach((weight, i) => {
                sink.addEdge(`n${i}`, `n${i + 1}`, weight);
            });
            return Promise.resolve(new ImportReportBuilder("test", Infinity).finish());
        },
    };
}

/**
 * An importer that pushes columns of every cell shape: a string label, an f64 and an f32 vector,
 * and an f32 score that f32 cannot hold exactly.
 * @returns the importer
 */
function cellImporter(): GraphImporter {
    return {
        format: "test",
        extensions: [],
        mimeTypes: [],
        import(_input, sink: GraphSink) {
            const label = sink.declareNodeColumn({ name: "label", dtype: "string", nullable: true });
            const position = sink.declareNodeColumn({ name: "position", dtype: "f64", components: 3, nullable: true });
            const color = sink.declareNodeColumn({ name: "color", dtype: "f32", components: 3, nullable: true });
            const score = sink.declareEdgeColumn({ name: "score", dtype: "f32", nullable: true });
            sink.setNodeValue(label, sink.addNode("a"), "Alpha");
            const b = sink.addNode("b");
            sink.setNodeValue(position, b, [1, 2, 3]);
            sink.setNodeValue(color, b, [0.1, 0.2, 0.3]);
            sink.setEdgeValue(score, sink.addEdge("a", "b"), 88.3);
            return Promise.resolve(new ImportReportBuilder("test", Infinity).finish());
        },
    };
}

/**
 * An importer that declares one node and then gives up on the document.
 * @param recognised - the confidence its sniff reports for the document
 * @returns the importer
 */
function abortingImporter(recognised: number): GraphImporter {
    return {
        format: "test",
        extensions: [],
        mimeTypes: [],
        sniff: () => recognised,
        import(_input, sink: GraphSink) {
            const report = new ImportReportBuilder("test", Infinity);
            sink.addNode("a");
            report.error("parse-error", "E_TEST", "a tag left open", { line: 3 });
            return Promise.reject(report.abort("the document breaks off"));
        },
    };
}
