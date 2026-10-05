import {
    capabilities,
    checkCapabilities,
    type CommonExportOptions,
    encodeChunks,
    type GraphExporter,
    type GraphImporter,
    type GraphSink,
    type GraphSnapshot,
    ImportReportBuilder,
    INVALID_INDEX,
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

/** What the importer keeps while it reads: where nodes go, what went wrong, and each written id's node. */
interface ReadState {
    sink: GraphSink;
    report: ImportReportBuilder;
    restoreMangledIds: boolean;
    nodeOf: Map<string, string | number>; // the id written in the file -> the node's id
}

/**
 * Read a node line: "node <number>", then the original id as JSON when there is one (it can hold spaces).
 * @param state - the import state
 * @param written - the number the line gives the node
 * @param json - the original id as JSON, or undefined
 */
function readNode(state: ReadState, written: string, json: string | undefined): void {
    const { sink, report } = state;
    const original = json === undefined ? null : (JSON.parse(json) as string | number);
    // restoreMangledIds (on by default) gives the node its original id back
    const id = original !== null && state.restoreMangledIds ? original : Number(written);
    state.nodeOf.set(written, id);
    if (sink.indexOf(id) === INVALID_INDEX) {
        report.counts.nodes++; // a node listed twice is one node
    }
    const index = sink.addNode(id);
    if (original !== null && !state.restoreMangledIds) {
        // keep the original where every format keeps it, so nothing is lost
        const column = sink.declareNodeColumn({ name: "graphty.originalId", dtype: "string", role: "originalId" });
        sink.setNodeValue(column, index, String(original));
    }
}

/**
 * Read an edge line. An edge names nodes by their written ids: look up the id each node was given.
 * @param state - the import state
 * @param from - the written id of the source
 * @param to - the written id of the target
 * @param line - the line number, for the report
 */
function readEdge(state: ReadState, from: string, to: string, line: number): void {
    const source = state.nodeOf.get(from);
    const target = state.nodeOf.get(to);
    if (source === undefined || target === undefined) {
        state.report.error("missing-value", "E_UNKNOWN_NODE", "the edge names a node no node line declares", { line });
        state.report.counts.skippedEdges++;
        return;
    }
    state.sink.addEdge(source, target);
    state.report.counts.edges++;
}

/**
 * Read one line of a numbers file.
 * @param state - the import state
 * @param text - the line, trimmed
 * @param line - the line number
 */
function readLine(state: ReadState, text: string, line: number): void {
    const node = /^node (-?\d+)(?: (.+))?$/.exec(text);
    const edge = /^edge (-?\d+) (-?\d+)$/.exec(text);
    if (text === "directed" || text === "undirected") {
        state.sink.setDirected(text === "directed");
    } else if (node !== null) {
        readNode(state, node[1], node[2]);
    } else if (edge !== null) {
        readEdge(state, edge[1], edge[2], line);
    } else if (text !== "") {
        state.report.error("parse-error", "E_NUMBERS_BAD_LINE", "expected a node line or an edge between two nodes", {
            line,
        });
    }
}

export const numbersImporter: GraphImporter = {
    format: "numbers",
    extensions: [".numbers"],
    mimeTypes: [],

    async import(input, sink, options) {
        const opts = resolveImportOptions(options, { ids: "number", defaultDirected: false, weightFrom: null });
        const report = new ImportReportBuilder("numbers", opts.errorLimit);
        reportUnusedOptions(options, report, new Set(["restoreMangledIds"]));
        const state: ReadState = { sink, report, restoreMangledIds: opts.restoreMangledIds, nodeOf: new Map() };
        const lines = new LineReader(input, report, opts);
        for await (const raw of lines) {
            const { line } = lines;
            if (line % 64 === 0) {
                throwIfAborted(opts.signal);
            }
            try {
                readLine(state, raw.trim(), line);
            } catch (err) {
                report.recordError(err, { line }); // rethrows anything that is not a problem with this line
            }
        }
        throwIfAborted(opts.signal);
        return report.finish();
    },
};
