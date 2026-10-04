import {
    capabilities,
    checkCapabilities,
    type CommonExportOptions,
    encodeChunks,
    type GraphExporter,
    type GraphImporter,
    type GraphSnapshot,
    ImportReportBuilder,
    joinText,
    LineReader,
    pairFolding,
    refusedSave,
    reportUnusedOptions,
    resolveExportOptions,
    resolveImportOptions,
    sanitizeIds,
    throwIfAborted,
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
    const { sanitizeIds: idPolicy, onMixedDirection } = resolveExportOptions(options);
    // the id to write for each node; under "mangle", the ids that are not integers are renumbered
    const ids = sanitizeIds(snapshot, "integer", idPolicy);
    // the format holds one direction: a graph with both is written the way onMixedDirection says
    yield snapshot.directed && onMixedDirection !== "undirected" ? "directed\n" : "undirected\n";
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const original = ids.isChanged(i) ? ` ${JSON.stringify(ids.originalAt(i))}` : "";
        yield `node ${String(ids.idAt(i))}${original}\n`;
    }
    const folding = pairFolding(snapshot); // an undirected edge of a mixed graph is stored twice; write it once
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (folding.folded(e)) {
            continue;
        }
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
        const report = new ImportReportBuilder("numbers", opts.errorLimit);
        reportUnusedOptions(options, report, new Set(["restoreMangledIds"]));
        const nodeOf = new Map<string, string | number>(); // the id written in the file -> the node's id
        const lines = new LineReader(input, report, opts);
        for await (const text of lines) {
            const { line } = lines;
            if (line % 64 === 0) {
                throwIfAborted(opts.signal);
            }
            const [kind, a, ...rest] = text.trim().split(" ");
            try {
                if (kind === "directed" || kind === "undirected") {
                    sink.setDirected(kind === "directed");
                } else if (kind === "node" && /^-?\d+$/.test(a ?? "")) {
                    const original = rest.length > 0 ? (JSON.parse(rest.join(" ")) as string | number) : null;
                    // restoreMangledIds (on by default) gives the node its original id back
                    const id = original !== null && opts.restoreMangledIds ? original : Number(a);
                    nodeOf.set(a, id);
                    const index = sink.addNode(id);
                    if (original !== null && !opts.restoreMangledIds) {
                        // keep the original where every format keeps it, so nothing is lost
                        const column = sink.declareNodeColumn({
                            name: "graphty.originalId",
                            dtype: "string",
                            role: "originalId",
                        });
                        sink.setNodeValue(column, index, String(original));
                    }
                    report.counts.nodes++;
                } else if (kind === "edge" && rest.length === 1 && nodeOf.has(a) && nodeOf.has(rest[0])) {
                    // an edge names nodes by their written ids: look up the id each node was given
                    sink.addEdge(nodeOf.get(a) ?? a, nodeOf.get(rest[0]) ?? rest[0]);
                    report.counts.edges++;
                } else if (text.trim() !== "") {
                    report.error("parse-error", "E_NUMBERS_BAD_LINE", "expected a node line or an edge between two nodes", {
                        line,
                    });
                }
            } catch (err) {
                report.recordError(err, { line }); // rethrows anything that is not a problem with this line
            }
        }
        throwIfAborted(opts.signal);
        return report.finish();
    },
};
