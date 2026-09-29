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
import {
    aggregateErrors,
    cell,
    components,
    importDocument,
    type RecordMapping,
    toRecords,
} from "../../src/data/graph-io-import.js";
import { GraphtyError } from "../../src/errors/GraphtyError.js";

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
                const pair = sink.declareEdgeColumn({
                    name: "graphty.pair",
                    dtype: "u32",
                    role: "pair",
                    refersTo: "edge",
                });
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

    it("throws E_PARSE_FAILED, caused by the importer's error, for a document the importer does not recognise", async () => {
        let thrown: unknown;
        try {
            await importDocument(recordingImporter({ ending: "abort" }), "doc", {});
        } catch (error) {
            thrown = error;
        }

        assert.instanceOf(thrown, GraphtyError);
        assert.strictEqual(thrown.code, "E_PARSE_FAILED");
        assert.instanceOf(thrown.cause, ImportError);
    });

    it("keeps what a recognised document held before it broke off, with the failure in the report", async () => {
        const imported = await importDocument(recordingImporter({ ending: "abort", sniff: 1 }), "doc", {});
        const { nodes, edges } = toRecords(imported, plain);

        assert.strictEqual(nodes.length, 2);
        assert.strictEqual(edges.length, 2);
        assert.strictEqual(imported.report.errorCount, 1);
    });

    it("still throws E_PARSE_FAILED for a recognised document whose report holds a fatal code", async () => {
        let thrown: unknown;
        try {
            await importDocument(recordingImporter({ ending: "abort", sniff: 1 }), "doc", {}, ["E_TEST"]);
        } catch (error) {
            thrown = error;
        }

        assert.instanceOf(thrown, GraphtyError);
        assert.strictEqual(thrown.code, "E_PARSE_FAILED");
        assert.instanceOf(thrown.cause, ImportError);
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

describe("the graph-io import helper's options, weights, cells and failures", () => {
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

    it("turns an importer failure on an unreadable document into E_PARSE_FAILED naming the line", async () => {
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

        for (const error of [unrecognised, fatal]) {
            assert.instanceOf(error, GraphtyError);
            assert.strictEqual(error.code, "E_PARSE_FAILED");
            assert.instanceOf(error.cause, ImportError);
            assert.deepEqual(error.details, { format: "test", line: 3, errors: 1, sourceCode: "E_IMPORT" });
        }

        assert.include((unrecognised as GraphtyError).message, "at line 3");
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
