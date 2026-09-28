/**
 * @file Reading a file through a graph-io importer, and handing the element the records it reads.
 *
 * WHAT THIS PROTECTS. The element's readers are moving onto graph-io's importers one format at a
 * time. Each of them goes through one shared path: the importer fills a scratch builder, the
 * builder is frozen, and the snapshot is turned back into the node and edge records the
 * DataManager has always consumed. The DataManager, the error summary and the direction a load
 * settles on must not be able to tell which path a record came by.
 *
 * The importer here records what it was handed and pushes a fixed graph, so every number below
 * is a fact about the shared path and not about any one format's parser.
 */

import type { GraphSink } from "@graphty/graph-format";
import {
    type CommonImportOptions,
    type GraphImporter,
    type ImportInput,
    type ImportReport,
    ImportReportBuilder,
} from "@graphty/graph-io";
import { assert, describe, it } from "vitest";

import type { AdHocData } from "../../src/config";
import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "../../src/data/DataSource";
import { importRecords, type RecordMapping } from "../../src/data/graphIoImport";
import { isGraphtyError } from "../../src/errors";

/** What the recording importer was handed on its one call. */
interface ImporterCall {
    input: ImportInput;
    options: CommonImportOptions | undefined;
}

/** How the recording importer's run differs from its default one. */
interface Variant {
    /** "abort" throws the importer's error-limit failure instead of returning. */
    ending?: "finish" | "abort";
    /** The two edges' weights; by default two that f32 cannot hold exactly. */
    weights?: [number, number];
    /** How many undirected edges the importer reports it expanded into a directed graph. */
    expandedMixed?: number;
}

/**
 * An importer that writes down its arguments and pushes one fixed graph: an undirected file with
 * two declared nodes, a third node named only by an edge, a label column, two weighted edges
 * with an f32 score, one error and one warning.
 * @param calls - receives each call's arguments
 * @param variant - how this run differs from the default one
 * @returns the importer
 */
function recordingImporter(calls: ImporterCall[], variant: Variant = {}): GraphImporter {
    const { ending = "finish", weights = [0.1, 16777217], expandedMixed = 0 } = variant;
    return {
        format: "recording",
        extensions: [".rec"],
        mimeTypes: ["text/x-recording"],
        import(input: ImportInput, sink: GraphSink, options?: CommonImportOptions): Promise<ImportReport> {
            calls.push({ input, options });
            const report = new ImportReportBuilder("recording", options?.errorLimit ?? 100);

            sink.setDirected(false);
            sink.setMeta({
                weightOrigin: { format: "recording", id: "value", title: null, type: "real", namespace: null },
            });
            const label = sink.declareNodeColumn({ name: "label", dtype: "string", nullable: true });
            const position = sink.declareNodeColumn({ name: "position", dtype: "f64", components: 3, nullable: true });
            sink.setNodeValue(label, sink.addNode("a"), "Alpha");
            sink.setNodeValue(position, sink.addNode("b"), [1, 2, 3]);
            report.counts.nodes += 2;

            const score = sink.declareEdgeColumn({ name: "score", dtype: "f32", nullable: true });
            sink.setEdgeValue(score, sink.addEdge("a", "b", weights[0]), 88.3);
            sink.addEdge("b", "c", weights[1]);
            report.counts.edges += 2;
            report.counts.expandedMixed += expandedMixed;

            report.warning("coercion", "W_WIDENED", "column label widened", { line: 3 });
            report.error("missing-value", "E_MISSING_ID", "a node on line 7 has no id", { line: 7, element: "node" });
            report.counts.skippedNodes++;

            if (ending === "abort") {
                return Promise.reject(report.abort("error limit reached"));
            }

            return Promise.resolve(report.finish());
        },
    };
}

interface ProbeConfig extends BaseDataSourceConfig {
    importer: GraphImporter;
    options?: CommonImportOptions & Record<string, unknown>;
    mapping?: RecordMapping;
}

/** A data source that reads its input through whatever importer it is given, as a built-in reader does. */
class ProbeDataSource extends DataSource {
    static readonly type = "probe";

    constructor(private readonly config: ProbeConfig) {
        super(config.errorLimit ?? 100, config.chunkSize);
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.config;
    }

    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        const { importer, options, mapping } = this.config;
        const imported = await importRecords(importer, await this.getContent(), this.errorAggregator, options, mapping);
        if (imported.direction) {
            const { directed, statedBy, conflictingEdges } = imported.direction;
            this.declareDirection(directed, statedBy, conflictingEdges);
        }

        yield* this.chunkData(imported.nodes, imported.edges);
    }
}

/**
 * Pull every chunk out of a source, the way the DataManager does.
 * @param source - the source
 * @returns every node and edge record, in order
 */
async function drain(source: DataSource): Promise<{ nodes: AdHocData[]; edges: AdHocData[] }> {
    const nodes: AdHocData[] = [];
    const edges: AdHocData[] = [];
    for await (const chunk of source.getData()) {
        nodes.push(...chunk.nodes);
        edges.push(...chunk.edges);
    }

    return { nodes, edges };
}

describe("a data source reading through a graph-io importer", () => {
    it("hands the importer the source's text and its error limit", async () => {
        const calls: ImporterCall[] = [];
        const source = new ProbeDataSource({
            data: "the file",
            errorLimit: 5,
            importer: recordingImporter(calls),
            options: { ids: "string" },
        });

        await drain(source);

        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0].input, "the file");
        assert.strictEqual(calls[0].options?.errorLimit, 5);
        assert.strictEqual(calls[0].options?.ids, "string");
    });

    it("keeps the source's error limit when the options name none", async () => {
        const calls: ImporterCall[] = [];
        const source = new ProbeDataSource({
            data: "",
            errorLimit: 5,
            importer: recordingImporter(calls),
            options: { errorLimit: undefined },
        });

        await drain(source);

        assert.strictEqual(calls[0].options?.errorLimit, 5);
    });

    it("yields one record per declared node and one per edge", async () => {
        const source = new ProbeDataSource({ data: "", importer: recordingImporter([]) });

        const { nodes, edges } = await drain(source);

        // "c" is a node of the snapshot, but the file never declared it: today's readers hand
        // over no record for it, and the DataManager counts it as an endpoint-only node.
        assert.deepEqual(nodes, [
            { label: "Alpha", id: "a" },
            { position: [1, 2, 3], id: "b" },
        ] as unknown as AdHocData[]);
        assert.deepEqual(edges, [
            { value: 0.1, score: 88.3, source: "a", target: "b" },
            { value: 16777217, source: "b", target: "c" },
        ] as unknown as AdHocData[]);
    });

    it("yields a record for a node only an edge named, when the format's reader always did", async () => {
        const source = new ProbeDataSource({ data: "", importer: recordingImporter([]), mapping: { endpointNodes: true } });

        const { nodes } = await drain(source);

        assert.deepEqual(
            nodes.map((node) => node.id),
            ["a", "b", "c"],
        );
    });

    it("keeps the weights when f32 holds every one of them exactly", async () => {
        // graph-format keeps no weight column for these: the weights are in the CSR arrays only.
        const source = new ProbeDataSource({ data: "", importer: recordingImporter([], { weights: [2, 0.5] }) });

        const { edges } = await drain(source);

        assert.deepEqual(
            edges.map((edge) => (edge as unknown as Record<string, unknown>).value),
            [2, 0.5],
        );
    });

    it("names the weight after the file's own attribute, and 'weight' when the file names none", async () => {
        const importer = recordingImporter([]);
        const plain: GraphImporter = {
            ...importer,
            async import(input, sink, options) {
                const report = await importer.import(input, sink, options);
                sink.setMeta({ weightOrigin: null });
                return report;
            },
        };

        const { edges } = await drain(new ProbeDataSource({ data: "", importer: plain }));

        assert.deepEqual(
            edges.map((edge) => (edge as unknown as Record<string, unknown>).weight),
            [0.1, 16777217],
        );
    });

    it("applies the format's mapping to every record", async () => {
        const mapping: RecordMapping = {
            node: ({ id, ...rest }) => ({ ...rest, name: id }),
            edge: ({ source, target, ...rest }) => ({ ...rest, src: source, dst: target }),
        };

        const { nodes, edges } = await drain(
            new ProbeDataSource({ data: "", importer: recordingImporter([]), mapping }),
        );

        assert.deepEqual(
            nodes.map((node) => (node as unknown as Record<string, unknown>).name),
            ["a", "b"],
        );
        assert.deepEqual(
            edges.map((edge) => {
                const record = edge as unknown as Record<string, unknown>;
                return [record.src, record.dst];
            }),
            [
                ["a", "b"],
                ["b", "c"],
            ],
        );
    });

    it("reports the importer's errors, and only its errors, through the error aggregator", async () => {
        const source = new ProbeDataSource({ data: "", importer: recordingImporter([]) });

        await drain(source);

        const errors = source.getErrorAggregator().getErrors();
        assert.deepEqual(errors, [{ message: "a node on line 7 has no id", category: "missing-value", line: 7 }]);
    });

    it("declares the direction the file stated, with every expanded edge a conflict, before the first chunk", async () => {
        const source = new ProbeDataSource({
            data: "",
            importer: recordingImporter([], { expandedMixed: 2 }),
            mapping: { statedBy: () => "the recording file" },
        });

        const iterator = source.getData()[Symbol.asyncIterator]();
        await iterator.next();

        assert.deepEqual(source.declaredDirection, {
            directed: false,
            statedBy: "the recording file",
            conflictingEdges: 2,
        });
    });

    it("declares no direction unless the format says the file stated one", async () => {
        const source = new ProbeDataSource({ data: "", importer: recordingImporter([]) });

        await drain(source);

        assert.isNull(source.declaredDirection);
    });

    it("turns an importer that gave up into a parse failure naming the line, with the errors aggregated", async () => {
        const source = new ProbeDataSource({ data: "", importer: recordingImporter([], { ending: "abort" }) });

        let thrown: unknown;
        try {
            await drain(source);
        } catch (error) {
            thrown = error;
        }

        assert.isTrue(isGraphtyError(thrown));
        if (!isGraphtyError(thrown)) {
            return;
        }

        assert.strictEqual(thrown.code, "E_PARSE_FAILED");
        assert.strictEqual(thrown.details.line, 7);
        assert.strictEqual(thrown.details.sourceCode, "E_IMPORT");
        assert.include(thrown.message, "line 7");
        assert.strictEqual(source.getErrorAggregator().getErrorCount(), 1);
    });
});
