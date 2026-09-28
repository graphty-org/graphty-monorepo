/**
 * @file The shared path the graph-io data sources read through: a graph-io importer into a scratch
 * builder, the report's errors into the source's aggregator, and records rebuilt from the rows.
 *
 * The importer here records what it was handed and pushes a fixed graph, so every number below is
 * a fact about the shared path and not about any one format's parser.
 */
import type { GraphSink } from "@graphty/graph-format";
import { type CommonImportOptions, type GraphImporter, ImportError, ImportReportBuilder } from "@graphty/graph-io";
import { assert, describe, it } from "vitest";

import type { AdHocData } from "../../src/config/common.js";
import { type BaseDataSourceConfig, DataSource, type DataSourceChunk } from "../../src/data/DataSource.js";
import { ErrorAggregator } from "../../src/data/ErrorAggregator.js";
import { aggregateErrors, importDocument, type RecordMapping, toRecords } from "../../src/data/graph-io-import.js";

/** How the recording importer's run differs from its default one. */
interface Variant {
    /** "abort" throws the importer's error-limit failure instead of returning. */
    ending?: "finish" | "abort";
    /** The two edges' weights; by default two that f32 cannot hold exactly. */
    weights?: [number, number];
    /** How many undirected edges the importer reports it expanded into a directed graph. */
    expandedMixed?: number;
    /** What the importer's sniff answers; absent means the importer has no sniff. */
    sniff?: number;
    /**
     * Store the graph directed, with the first edge expanded into two halves joined by a pair
     * column, the way graph-io holds an undirected edge of a mixed-direction file.
     */
    expanded?: boolean;
}

type RecordingImporter = GraphImporter & { calls: { text: string; options: CommonImportOptions | undefined }[] };

/**
 * An importer that records what it was asked to read and pushes one fixed undirected graph: node
 * "b" is named by an edge before the file declares it, node "z" is never declared, both edges are
 * weighted, and the report holds one error and one warning.
 * @param variant - how this run differs from the default one
 * @returns the importer, with the arguments of each call in `calls`
 */
function recordingImporter(variant: Variant = {}): RecordingImporter {
    const { ending = "finish", weights = [0.1, 16777217], expandedMixed = 0, sniff, expanded = false } = variant;
    const calls: RecordingImporter["calls"] = [];
    return {
        calls,
        format: "test",
        extensions: [],
        mimeTypes: [],
        ...(sniff === undefined ? {} : { sniff: () => sniff }),
        import(input, sink: GraphSink, options) {
            calls.push({ text: input as string, options });
            const report = new ImportReportBuilder("test", Infinity);
            sink.setDirected(expanded);
            sink.addNode("a");
            const first = sink.addEdge("a", "b", weights[0]);
            sink.addEdge("b", "z", weights[1]);
            sink.addNode("b");
            if (expanded) {
                const pair = sink.declareEdgeColumn({ name: "graphty.pair", dtype: "u32", role: "pair", refersTo: "edge" });
                const mirror = sink.addEdge("b", "a", weights[0]);
                sink.setEdgeValue(pair, first, mirror);
                sink.setEdgeValue(pair, mirror, first);
            }
            report.counts.nodes += 2;
            report.counts.edges += 2;
            report.counts.expandedMixed += expandedMixed;
            report.warning("coercion", "W_TEST", "a warning stays in the report");
            report.error("validation-error", "E_TEST", "a skipped element", { line: 7, element: "q" });
            if (ending === "abort") {
                return Promise.reject(report.abort("error limit reached"));
            }

            return Promise.resolve(report.finish());
        },
    };
}

/** A mapping that adds no keys of its own. */
const plain: RecordMapping = { node() {}, edge() {} };

/** A data source that reads through the helper the way the GEXF and GraphML sources do. */
class ProbeDataSource extends DataSource {
    static readonly type = "probe";

    constructor(
        private readonly config: BaseDataSourceConfig,
        private readonly importer: GraphImporter,
    ) {
        super(config.errorLimit ?? 100, config.chunkSize);
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.config;
    }

    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        const imported = await importDocument(this.importer, await this.getContent(), {
            errorLimit: this.config.errorLimit ?? 100,
        });
        aggregateErrors(imported.report, this.errorAggregator);
        this.declareDirection(imported.snapshot.directed, "the test file", imported.report.counts.expandedMixed);
        const { nodes, edges } = toRecords(imported, plain);
        yield* this.chunkData(nodes, edges);
    }
}

describe("the graph-io import helper", () => {
    it("reads the text with string ids and the options it was given", async () => {
        const importer = recordingImporter();
        await importDocument(importer, "doc", { errorLimit: 5 });

        assert.strictEqual(importer.calls.length, 1);
        assert.strictEqual(importer.calls[0].text, "doc");
        assert.strictEqual(importer.calls[0].options?.ids, "string");
        assert.strictEqual(importer.calls[0].options?.errorLimit, 5);
    });

    it("rebuilds one record per declared node, in declaration order, and one per edge with its weight", async () => {
        const { nodes, edges } = toRecords(await importDocument(recordingImporter(), "doc", {}), plain);

        // "z" is a node of the snapshot, but the file never declared it: no record is handed over
        // for it, and the DataManager counts it as an endpoint-only node.
        assert.deepEqual(nodes, [{ id: "a" }, { id: "b" }] as unknown as AdHocData[]);
        assert.deepEqual(edges, [
            { source: "a", target: "b", weight: 0.1 },
            { source: "b", target: "z", weight: 16777217 },
        ] as unknown as AdHocData[]);
    });

    it("hands over one record for an edge the importer expanded into two halves", async () => {
        const imported = await importDocument(recordingImporter({ expanded: true }), "doc", {});
        const { edges } = toRecords(imported, plain);

        // three arcs in the snapshot; the mirror half of the expanded a-b edge is not a record
        assert.strictEqual(imported.snapshot.edgeCount, 3);
        assert.deepEqual(edges, [
            { source: "a", target: "b", weight: 0.1 },
            { source: "b", target: "z", weight: 16777217 },
        ] as unknown as AdHocData[]);
    });

    it("applies the format's mapping to every record", async () => {
        const mapping: RecordMapping = {
            node(row, record) {
                record.row = row;
            },
            edge(row, record) {
                record.row = row;
            },
        };
        const { nodes, edges } = toRecords(await importDocument(recordingImporter(), "doc", {}), mapping);

        // "b" was added by the first edge, before its declaration: its row is 1 either way, and
        // "z" (row 2) is never declared.
        assert.deepEqual(
            nodes.map((node) => node.row),
            [0, 1],
        );
        assert.deepEqual(
            edges.map((edge) => edge.row),
            [0, 1],
        );
    });

    it("copies only the report's errors into the aggregator", async () => {
        const imported = await importDocument(recordingImporter(), "doc", {});
        const errors = new ErrorAggregator(100);
        aggregateErrors(imported.report, errors);

        assert.deepEqual(errors.getErrors(), [
            { message: "a skipped element", category: "validation-error", line: 7, field: "q" },
        ]);
    });

    it("carries the file's direction and the edges the importer expanded", async () => {
        const imported = await importDocument(recordingImporter({ expandedMixed: 2 }), "doc", {});

        assert.isFalse(imported.snapshot.directed);
        assert.strictEqual(imported.report.counts.expandedMixed, 2);
    });

    it("throws the importer's error for a document the importer does not recognise", async () => {
        let thrown: unknown;
        try {
            await importDocument(recordingImporter({ ending: "abort" }), "doc", {});
        } catch (error) {
            thrown = error;
        }

        assert.instanceOf(thrown, ImportError);
    });

    it("keeps what a recognised document held before it broke off, with the failure in the report", async () => {
        const imported = await importDocument(recordingImporter({ ending: "abort", sniff: 1 }), "doc", {});
        const { nodes, edges } = toRecords(imported, plain);

        assert.strictEqual(nodes.length, 2);
        assert.strictEqual(edges.length, 2);
        assert.strictEqual(imported.report.errorCount, 1);
    });

    it("still throws for a recognised document whose report holds a fatal code", async () => {
        let thrown: unknown;
        try {
            await importDocument(recordingImporter({ ending: "abort", sniff: 1 }), "doc", {}, ["E_TEST"]);
        } catch (error) {
            thrown = error;
        }

        assert.instanceOf(thrown, ImportError);
    });
});

describe("a data source reading through the graph-io import helper", () => {
    it("yields the records, aggregates the errors and declares the direction before the first chunk", async () => {
        const source = new ProbeDataSource({ data: "the file" }, recordingImporter({ expandedMixed: 2 }));

        const iterator = source.getData()[Symbol.asyncIterator]();
        const first = await iterator.next();

        assert.deepEqual(source.declaredDirection, { directed: false, statedBy: "the test file", conflictingEdges: 2 });
        assert.isFalse(first.done);
        const chunk = first.value;
        assert.strictEqual(chunk.nodes.length, 2);
        assert.strictEqual(chunk.edges.length, 2);
        assert.strictEqual(source.getErrorAggregator().getErrorCount(), 1);
    });
});
