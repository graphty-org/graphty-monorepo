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
    type LossNote,
    pairFolding,
    parseWeightText,
    reportSinkOptions,
    reportUnusedOptions,
    resolveExportOptions,
    resolveImportOptions,
    throwIfAborted,
} from "@graphty/graph-io";

// The "pairs" format: one node or one edge per line, and a first line that gives the direction.
//
//   # undirected
//   alice = Alice Liddell
//   alice bob 2.5
//   bob carol

/** The format's own options, for reading and writing. */
export interface PairsOptions {
    /** The character between the ids and the weight of an edge line; whitespace by default. */
    separator?: string | undefined;
}

/** The codes the pairs importer records, keyed like the built-in tables. */
export const PAIRS_ISSUE = Object.freeze({
    BAD_LINE: "E_PAIRS_BAD_LINE",
});

/** The codes the pairs exporter's check() returns besides the shared ones. */
export const PAIRS_LOSS = Object.freeze({
    BAD_TEXT: "E_PAIRS_BAD_TEXT",
});

/** The common options the importer reads; any other one the caller sets is reported as ignored. */
const USED = new Set<keyof CommonImportOptions>(["ids", "defaultDirected", "onMixedDirection"]);

/**
 * The separator option, checked.
 * @param options - the caller's options
 * @returns the separator, or null for whitespace
 */
function separatorOf(options: PairsOptions | undefined): string | null {
    const separator = options?.separator;
    if (separator === undefined) {
        return null;
    }
    if (typeof separator !== "string" || separator.length !== 1 || /[\s#=]/.test(separator)) {
        throw new GraphFormatError(
            "E_UNSUPPORTED",
            `option separator: ${JSON.stringify(separator)} is not one character`,
            {
                option: "separator",
                found: separator,
            },
        );
    }
    return separator;
}

export const pairsImporter: GraphImporter<PairsOptions> = {
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
        const separator = separatorOf(options);
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
                // the direction line, when there is one, is the first line; set the direction either way
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
            try {
                const node = /^(\S+)(?:\s*=\s*(.*))?$/.exec(text);
                const fields = separator === null ? text.split(/\s+/) : text.split(separator).map((f) => f.trim());
                if (node !== null && (fields.length === 1 || node[2] !== undefined)) {
                    // a node line: an id, and an optional label after "="
                    const index = sink.addNode(ids.text(node[1])); // the node's index, new or existing
                    if (node[2] !== undefined) {
                        // declaring the same column again returns the same column
                        const label = sink.declareNodeColumn({ name: "label", dtype: "string", role: "label" });
                        sink.setNodeValue(label, index, node[2]);
                    }
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

/** What a pairs file can hold: one direction, parallel edges, self-loops, text labels. */
const PAIRS_CAPABILITIES = capabilities({
    mixedDirection: false,
    multiEdges: true,
    selfLoops: true,
    edgeIds: "none",
    idCharset: "any",
    dtypes: ["string"],
});

/**
 * What a pairs file would not keep.
 * @param snapshot - the graph to write
 * @param options - the export options
 * @returns the loss notes; any E_ note makes export() throw
 */
function check(snapshot: GraphSnapshot, options?: PairsOptions & CommonExportOptions): LossNote[] {
    const notes = checkCapabilities(snapshot, PAIRS_CAPABILITIES, resolveExportOptions(options), {
        attributes: false, // the format writes no attributes...
        roles: new Set(["label"]), // ...except the node label, which it has a place for
        roleNames: { label: "label" }, // and which the importer reads back as "label"
        idsReadBack: "canonical", // the importer turns the id text "7" into the number 7
    });
    const separator = separatorOf(options) ?? " ";
    const label = snapshot.nodes.byRole("label");
    let bad = 0;
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const id = String(snapshot.ids.idOf(i));
        const text = label === null ? undefined : snapshot.nodes.value(label.meta.name, i);
        if (id === "" || /[\s#=]/.test(id) || id.includes(separator) || /[\r\n]/.test(String(text ?? ""))) {
            bad++;
        }
    }
    if (bad > 0) {
        notes.push({
            code: PAIRS_LOSS.BAD_TEXT,
            message: `${bad} node(s) have an id that is empty or holds a space, "#", "=" or the separator, or a label with a line break`,
            column: null,
            count: bad,
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
function* lines(snapshot: GraphSnapshot, options?: PairsOptions & CommonExportOptions): Generator<string> {
    const refused = check(snapshot, options).find((n) => n.code.startsWith("E_"));
    if (refused !== undefined) {
        throw new GraphFormatError("E_UNSUPPORTED", refused.message, { code: refused.code });
    }
    const separator = separatorOf(options) ?? " ";
    const { onMixedDirection } = resolveExportOptions(options);
    const directed = snapshot.directed && onMixedDirection !== "undirected";
    yield directed ? "# directed\n" : "# undirected\n";
    const label = snapshot.nodes.byRole("label");
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const id = String(snapshot.ids.idOf(i));
        const text = label === null ? undefined : snapshot.nodes.value(label.meta.name, i);
        yield text === undefined ? `${id}\n` : `${id} = ${String(text)}\n`;
    }
    const weights = explicitWeights(snapshot);
    const folding = pairFolding(snapshot); // an undirected edge of a mixed graph is stored twice; write it once
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (folding.folded(e)) {
            continue;
        }
        const ends = [snapshot.edgeSource(e), snapshot.edgeTarget(e)].map((i) => String(snapshot.ids.idOf(i)));
        const weight = weights.text(e);
        yield `${[...ends, ...(weight === null ? [] : [weight])].join(separator)}\n`;
    }
}

export const pairsExporter: GraphExporter<PairsOptions> = {
    format: "pairs",
    extensions: [".pairs"],
    mimeTypes: ["text/x-pairs"],
    capabilities: PAIRS_CAPABILITIES,
    check,
    export: (snapshot, options) => encodeChunks(lines(snapshot, options)),
    exportToString: (snapshot, options) => joinText(lines(snapshot, options)),
};
