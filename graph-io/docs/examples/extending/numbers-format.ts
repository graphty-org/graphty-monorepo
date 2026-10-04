import {
    capabilities,
    checkCapabilities,
    type CommonExportOptions,
    DEFAULT_ERROR_LIMIT,
    encodeChunks,
    type GraphExporter,
    type GraphImporter,
    type GraphSnapshot,
    ImportReportBuilder,
    joinText,
    LineReader,
    refusedSave,
    reportUnusedOptions,
    resolveExportOptions,
    resolveImportOptions,
    sanitizeIds,
} from "@graphty/graph-io";

// The "numbers" format: node ids must be integers. With sanitizeIds: "mangle" the exporter numbers the other
// nodes and writes each original id after its number, as JSON, so the importer can give it back.
//
//   undirected
//   node 0 "alice"
//   node 1 "bob"
//   node 7
//   edge 0 1
//   edge 1 7

const NUMBERS_CAPABILITIES = capabilities({ idCharset: "integer", multiEdges: true, selfLoops: true });

/**
 * The lines of a numbers file.
 * @param snapshot - the graph to write
 * @param options - the export options
 * @yields one line at a time
 */
function* lines(snapshot: GraphSnapshot, options?: CommonExportOptions): Generator<string> {
    const refused = refusedSave(numbersExporter.check(snapshot, options));
    if (refused !== null) {
        throw refused;
    }
    // the id to write for each node; under "mangle", the ids that are not integers are renumbered
    const ids = sanitizeIds(snapshot, "integer", resolveExportOptions(options).sanitizeIds);
    yield snapshot.directed ? "directed\n" : "undirected\n";
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const original = ids.isChanged(i) ? ` ${JSON.stringify(ids.originalAt(i))}` : "";
        yield `node ${String(ids.idAt(i))}${original}\n`;
    }
    for (let e = 0; e < snapshot.edgeCount; e++) {
        yield `edge ${String(ids.idAt(snapshot.edgeSource(e)))} ${String(ids.idAt(snapshot.edgeTarget(e)))}\n`;
    }
}

export const numbersExporter: GraphExporter = {
    format: "numbers",
    extensions: [".numbers"],
    mimeTypes: [],
    capabilities: NUMBERS_CAPABILITIES,
    // the format writes no attributes and no weights
    check: (snapshot, options) =>
        checkCapabilities(snapshot, NUMBERS_CAPABILITIES, resolveExportOptions(options), {
            attributes: false,
            weights: false,
        }),
    export: (snapshot, options) => encodeChunks(lines(snapshot, options)),
    exportToString: (snapshot, options) => joinText(lines(snapshot, options)),
};

export const numbersImporter: GraphImporter = {
    format: "numbers",
    extensions: [".numbers"],
    mimeTypes: [],

    async import(input, sink, options) {
        const opts = resolveImportOptions(options, { ids: "number", defaultDirected: false, weightFrom: null });
        const report = new ImportReportBuilder("numbers", options?.errorLimit ?? DEFAULT_ERROR_LIMIT);
        reportUnusedOptions(options, report, new Set(["restoreMangledIds"]));
        const nodeOf = new Map<string, string | number>(); // the id written in the file -> the node's id
        for await (const text of new LineReader(input, report, opts)) {
            const [kind, a, ...rest] = text.trim().split(" ");
            if (kind === "directed" || kind === "undirected") {
                sink.setDirected(kind === "directed");
            } else if (kind === "node") {
                const original = rest.length > 0 ? (JSON.parse(rest.join(" ")) as string | number) : null;
                // restoreMangledIds (on by default) gives the node its original id back
                const id = original !== null && opts.restoreMangledIds ? original : Number(a);
                nodeOf.set(a, id);
                const index = sink.addNode(id);
                if (original !== null && !opts.restoreMangledIds) {
                    // keep the original as a plain attribute instead, so nothing is lost
                    sink.setNodeValue(
                        sink.declareNodeColumn({ name: "originalId", dtype: "string" }),
                        index,
                        String(original),
                    );
                }
                report.counts.nodes++;
            } else if (kind === "edge") {
                // an edge names nodes by their written ids: look up the id each node was given
                sink.addEdge(nodeOf.get(a) ?? Number(a), nodeOf.get(rest[0]) ?? Number(rest[0]));
                report.counts.edges++;
            }
        }
        return report.finish();
    },
};
