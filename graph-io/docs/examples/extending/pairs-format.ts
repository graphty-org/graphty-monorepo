import {
    capabilities,
    checkCapabilities,
    type CommonExportOptions,
    type CommonImportOptions,
    DirectionResolver,
    encodeChunks,
    explicitWeights,
    type GraphExporter,
    GraphFormatError,
    type GraphImporter,
    type GraphSnapshot,
    IdCoercer,
    ImportReportBuilder,
    joinText,
    LineReader,
    LOSS,
    type LossNote,
    pairFolding,
    parseWeightText,
    reportSinkOptions,
    reportUnusedOptions,
    resolveExportOptions,
    resolveImportOptions,
    throwIfAborted,
} from "@graphty/graph-io";

// The "pairs" format: one node or one edge per line, a "# undirected" line for undirected graphs.
//
//   # undirected
//   alice
//   alice bob 2.5
//   bob carol

/** The codes the pairs importer records, keyed like the built-in tables. */
export const PAIRS_ISSUE = Object.freeze({
    BAD_LINE: "E_PAIRS_BAD_LINE",
});

/** The codes the pairs exporter's check() returns besides the shared ones. */
export const PAIRS_LOSS = Object.freeze({
    BAD_ID: "E_PAIRS_BAD_ID",
    COLUMN_DROPPED: "W_PAIRS_COLUMN_DROPPED",
});

/** Column roles the format writes (the weight) or that only describe how edges are stored. */
const STRUCTURAL_ROLES = new Set(["weight", "directed", "pair", "mutual", "id"]);

/** The common options the importer reads; any other one the caller sets is reported as ignored. */
const USED = new Set<keyof CommonImportOptions>(["ids", "defaultDirected", "onMixedDirection"]);

export const pairsImporter: GraphImporter = {
    format: "pairs",
    extensions: [".pairs"],
    mimeTypes: ["text/x-pairs"],

    sniff(head) {
        // only a file that starts with the direction line is recognized by its content
        const first = new TextDecoder().decode(head).split("\n", 1)[0].trim();
        return first === "# directed" || first === "# undirected" ? 0.8 : 0;
    },

    async import(input, sink, options) {
        const opts = resolveImportOptions(options, { ids: "canonical", defaultDirected: true, weightFrom: null });
        const report = new ImportReportBuilder("pairs", opts.errorLimit);
        reportSinkOptions(sink, options, report);
        reportUnusedOptions(options, report, USED);
        const ids = new IdCoercer(opts.ids);
        const edges = new DirectionResolver(sink, report, opts.onMixedDirection);
        const lines = new LineReader(input, report, opts);
        let kind: "directed" | "undirected" = opts.defaultDirected ? "directed" : "undirected";

        for await (const raw of lines) {
            const line = lines.line;
            const text = raw.trim();
            if (line === 1) {
                // a direction line, when there is one, is the first line
                const declared = /^# (directed|undirected)$/.exec(text);
                if (declared !== null) {
                    kind = declared[1] === "directed" ? "directed" : "undirected";
                }
                edges.setHeader(kind === "directed", { line });
            }
            if (line % 64 === 0) {
                throwIfAborted(opts.signal);
            }
            if (text.length === 0 || text.startsWith("#")) {
                continue;
            }
            const fields = text.split(/\s+/);
            try {
                if (fields.length === 1) {
                    sink.addNode(ids.text(fields[0]));
                    report.counts.nodes++;
                } else if (fields.length <= 3) {
                    const weight = fields.length === 3 ? parseWeightText(fields[2]) : undefined;
                    edges.addEdge(ids.text(fields[0]), ids.text(fields[1]), kind, weight, { line });
                    report.counts.edges++;
                } else {
                    report.error("parse-error", PAIRS_ISSUE.BAD_LINE, `${fields.length} fields; expected 1 to 3`, {
                        line,
                    });
                    report.counts.skippedEdges++;
                }
            } catch (err) {
                report.recordError(err, { line }); // rethrows anything that is not a problem with this line
                report.counts.skippedEdges++;
            }
        }
        throwIfAborted(opts.signal);
        return report.finish();
    },
};

const PAIRS_CAPABILITIES = capabilities({
    mixedDirection: false,
    multiEdges: true,
    selfLoops: true,
    edgeIds: "none",
    idCharset: "any",
});

/**
 * What a pairs file would not keep: the shared checks, plus the ids the format cannot spell.
 * @param snapshot - the graph to write
 * @param options - the export options
 * @returns the loss notes; any E_ note makes export() throw
 */
function check(snapshot: GraphSnapshot, options?: CommonExportOptions): LossNote[] {
    // checkCapabilities() covers direction, edge ids and node ids. Its column notes describe columns written
    // with another type or role; this format writes no columns at all, so it reports each one itself.
    const notes = checkCapabilities(snapshot, PAIRS_CAPABILITIES, resolveExportOptions(options)).filter(
        (n) => n.code !== LOSS.DTYPE && n.code !== LOSS.ROLE,
    );
    for (const [what, table] of [
        ["node", snapshot.nodes],
        ["edge", snapshot.edges],
    ] as const) {
        for (const column of table) {
            if (!STRUCTURAL_ROLES.has(column.meta.role ?? "")) {
                notes.push({
                    code: PAIRS_LOSS.COLUMN_DROPPED,
                    message: `${what} column "${column.meta.name}" is not written`,
                    column: column.meta.name,
                    count: column.length - column.nullCount,
                });
            }
        }
    }
    let bad = 0;
    let retyped = 0;
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const id = snapshot.ids.idOf(i);
        const text = String(id);
        if (text === "" || /\s/.test(text) || text.startsWith("#")) {
            bad++;
        } else if (new IdCoercer("canonical").text(text) !== id) {
            retyped++;
        }
    }
    if (bad > 0) {
        notes.push({
            code: PAIRS_LOSS.BAD_ID,
            message: `${bad} node id(s) are empty, hold whitespace or start with #`,
            column: null,
            count: bad,
        });
    }
    if (retyped > 0) {
        notes.push({
            code: LOSS.ID_TEXT_TYPE,
            message: `${retyped} node id(s) read back as the other type (a number as text, or the reverse)`,
            column: null,
            count: retyped,
        });
    }
    return notes;
}

/**
 * The lines of a pairs file: the direction, every node (so isolated nodes and the node order
 * survive), then every edge.
 * @param snapshot - the graph to write
 * @param options - the export options
 * @yields one line at a time
 */
function* lines(snapshot: GraphSnapshot, options?: CommonExportOptions): Generator<string> {
    const refused = check(snapshot, options).find((n) => n.code.startsWith("E_"));
    if (refused !== undefined) {
        throw new GraphFormatError("E_UNSUPPORTED", refused.message, { code: refused.code });
    }
    const { onMixedDirection } = resolveExportOptions(options);
    const directed = snapshot.directed && onMixedDirection !== "undirected";
    yield directed ? "# directed\n" : "# undirected\n";
    for (let i = 0; i < snapshot.nodeCount; i++) {
        yield `${String(snapshot.ids.idOf(i))}\n`;
    }
    const weights = explicitWeights(snapshot);
    const folding = pairFolding(snapshot); // an undirected edge of a mixed graph is stored twice; write it once
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (folding.folded(e)) {
            continue;
        }
        const source = String(snapshot.ids.idOf(snapshot.edgeSource(e)));
        const target = String(snapshot.ids.idOf(snapshot.edgeTarget(e)));
        const weight = weights.text(e);
        yield weight === null ? `${source} ${target}\n` : `${source} ${target} ${weight}\n`;
    }
}

export const pairsExporter: GraphExporter = {
    format: "pairs",
    extensions: [".pairs"],
    mimeTypes: ["text/x-pairs"],
    capabilities: PAIRS_CAPABILITIES,
    check,
    export: (snapshot, options) => encodeChunks(lines(snapshot, options)),
    exportToString: (snapshot, options) => joinText(lines(snapshot, options)),
};
