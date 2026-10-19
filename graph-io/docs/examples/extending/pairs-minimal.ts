import {
    type GraphImporter,
    importGraph,
    ImportReportBuilder,
    INVALID_INDEX,
    LineReader,
    registry,
    resolveImportOptions,
} from "@graphty/graph-io";

const pairsImporter: GraphImporter = {
    format: "pairs",
    extensions: [".pairs"],
    mimeTypes: [],
    async import(input, sink, options) {
        // the common options with this format's defaults; errorLimit among them
        const opts = resolveImportOptions(options, { ids: "canonical", defaultDirected: false, weightFrom: null });
        const report = new ImportReportBuilder("pairs", opts.errorLimit);
        sink.setDirected(false); // this first version reads every file as undirected
        // add a node and count it if it is new; the count includes the nodes edge lines bring in
        const addNode = (id: string): void => {
            if (sink.indexOf(id) === INVALID_INDEX) {
                report.counts.nodes++;
            }
            sink.addNode(id);
        };
        const lines = new LineReader(input, report, opts);
        for await (const text of lines) {
            const ids = text.trim().split(/\s+/);
            if (ids.length === 1 && ids[0] !== "") {
                addNode(ids[0]); // a node line
            } else if (ids.length === 2) {
                addNode(ids[0]); // an edge line
                addNode(ids[1]);
                sink.addEdge(ids[0], ids[1]);
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
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges; the report counts ${report.counts.nodes} nodes`);
console.log(report.issues.map((i) => `${i.code} (line ${i.line ?? "-"}): ${i.message}`));
