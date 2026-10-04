import {
    DEFAULT_ERROR_LIMIT,
    type GraphImporter,
    importGraph,
    ImportReportBuilder,
    LineReader,
    registry,
} from "@graphty/graph-io";

const pairsImporter: GraphImporter = {
    format: "pairs",
    extensions: [".pairs"],
    mimeTypes: [],
    async import(input, sink, options) {
        const report = new ImportReportBuilder("pairs", options?.errorLimit ?? DEFAULT_ERROR_LIMIT);
        sink.setDirected(false);
        const lines = new LineReader(input, report, options);
        for await (const text of lines) {
            const [source, target] = text.trim().split(/\s+/);
            if (target === undefined) {
                report.error("parse-error", "E_PAIRS_BAD_LINE", "expected two node ids", { line: lines.line });
                continue;
            }
            sink.addEdge(source, target);
            report.counts.edges++;
        }
        return report.finish();
    },
};
registry.registerImporter(pairsImporter);

const { snapshot, report } = await importGraph("alice bob\nbob carol\ndave\n", { filename: "friends.pairs" });
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges, ${report.errorCount} error`);
