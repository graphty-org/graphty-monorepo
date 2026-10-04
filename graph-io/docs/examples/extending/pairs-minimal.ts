import { type GraphImporter, importGraph, ImportReportBuilder, LineReader, registry, resolveImportOptions } from "@graphty/graph-io";

const pairsImporter: GraphImporter = {
    format: "pairs",
    extensions: [".pairs"],
    mimeTypes: [],
    async import(input, sink, options) {
        // the common options with this format's defaults; errorLimit among them
        const opts = resolveImportOptions(options, { ids: "canonical", defaultDirected: false, weightFrom: null });
        const report = new ImportReportBuilder("pairs", opts.errorLimit);
        sink.setDirected(false); // this first version reads every file as undirected
        const lines = new LineReader(input, report, opts);
        for await (const text of lines) {
            const ids = text.trim().split(/\s+/);
            if (ids.length === 1 && ids[0] !== "") {
                sink.addNode(ids[0]); // a node line
                report.counts.nodes++;
            } else if (ids.length === 2) {
                sink.addEdge(ids[0], ids[1]); // an edge line
                report.counts.edges++;
            } else if (ids.length > 2) {
                report.error("parse-error", "E_PAIRS_BAD_LINE", "expected one or two node ids", { line: lines.line });
            }
        }
        return report.finish();
    },
};
registry.registerImporter(pairsImporter);

const { snapshot, report } = await importGraph("alice bob\nbob carol\ndave\nerin frank gus\n", {
    filename: "friends.pairs",
});
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(report.issues.map((i) => `${i.code} (line ${i.line ?? "-"}): ${i.message}`));
