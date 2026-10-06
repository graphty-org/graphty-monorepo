import {
    DataSource,
    type FormatDescriptor,
    type GraphImporter,
    type ImporterReport,
    ImportError,
    type ImportIssue,
} from "../../../extend";

/** One line per shipment: `exporter<TAB>importer<TAB>value`. */
const tradeFlowsImporter: GraphImporter = {
    format: "trade-flows",
    extensions: [".trade"],
    mimeTypes: ["text/vnd.acme.trade-flows"],

    import(input, sink) {
        // Inline text arrives as it was given; a file or a URL arrives as its bytes.
        if (typeof input !== "string" && !(input instanceof Uint8Array)) {
            return Promise.reject(new TypeError("the trade-flows importer reads text or bytes"));
        }

        const text = typeof input === "string" ? input : new TextDecoder().decode(input);

        const issues: ImportIssue[] = [];
        const report = (): ImporterReport => ({
            format: "trade-flows",
            counts: { nodes: 0, edges: sink.edgeCount, skippedNodes: 0, skippedEdges: issues.length, expandedMixed: 0 },
            issues,
            errorCount: issues.length,
            warningCount: 0,
            truncated: false,
            lossy: [],
            durationMs: 0,
        });

        // A shipment goes one way: the file states that the graph is directed.
        sink.setDirected(true);
        for (const [index, line] of text.split("\n").entries()) {
            if (line.trim() === "") {
                continue;
            }

            const [from, to, value] = line.split("\t");
            if (!from || !to) {
                issues.push({
                    category: "missing-value",
                    severity: "error",
                    code: "E_TRADE_NO_COUNTRY",
                    message: `line ${index + 1} is missing a country`,
                    line: index + 1,
                    element: null,
                });
                continue;
            }

            // `weight` becomes the edge's weight; any other key stays an attribute of the record.
            sink.addEdgeRecord(from, to, { weight: Number(value) });
        }

        // Giving up on the whole file: reject with graph-io's ImportError, taken from ./extend.
        if (sink.edgeCount === 0) {
            return Promise.reject(new ImportError("no shipment could be read", report()));
        }

        return Promise.resolve(report());
    },
};

const TRADE_FLOWS: FormatDescriptor = {
    id: "trade-flows",
    plainName: "Trade Flows",
    extensions: [".trade"],
    mimeTypes: ["text/vnd.acme.trade-flows"],
    canImport: true,
    canExport: false,
    options: [],
};

DataSource.register(
    DataSource.fromImporter(tradeFlowsImporter, TRADE_FLOWS, {
        // The words shown beside the graph's direction.
        statedBy: () => "a trade-flows file (shipments go one way)",
    }),
);
