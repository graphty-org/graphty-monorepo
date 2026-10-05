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
    type GraphSink,
    type GraphSnapshot,
    IdCoercer,
    ImportReportBuilder,
    INVALID_INDEX,
    joinText,
    LineReader,
    type LossNote,
    pairFolding,
    parseWeightText,
    refusedSave,
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

/** The format's own import options, next to the ones every importer takes, as the built-in formats declare them. */
export interface PairsImportOptions extends CommonImportOptions {
    /** The character between the ids and the weight of an edge line; whitespace by default. */
    separator?: string | undefined;
}

/** The format's own export options, next to the ones every exporter takes. */
export interface PairsExportOptions extends CommonExportOptions {
    /** The character written between the ids and the weight of an edge line; a space by default. */
    separator?: string | undefined;
}

/** The codes the pairs importer records, keyed like the built-in tables. */
export const PAIRS_ISSUE = Object.freeze({
    BAD_LINE: "E_PAIRS_BAD_LINE",
});

/** The codes the pairs exporter's check() returns besides the shared ones. */
export const PAIRS_LOSS = Object.freeze({
    BAD_ID: "E_PAIRS_BAD_ID",
    BAD_LABEL: "E_PAIRS_BAD_LABEL",
});

/** The error a save throws for each of the format's own refusals, as for the built-in formats. */
const REFUSALS = { [PAIRS_LOSS.BAD_ID]: "E_INVALID_ID", [PAIRS_LOSS.BAD_LABEL]: "E_COLUMN_TYPE" } as const;

/** The common options the importer reads; any other one the caller sets is reported as ignored. */
const USED = new Set<keyof CommonImportOptions>(["ids", "defaultDirected", "onMixedDirection"]);

/**
 * The separator option, checked.
 * @param options - the caller's options
 * @returns the separator, or null for whitespace
 */
function separatorOf(options: { separator?: string | undefined } | undefined): string | null {
    const separator = options?.separator;
    if (separator === undefined) {
        return null;
    }
    if (typeof separator !== "string" || separator.length !== 1 || /[\s#=]/.test(separator)) {
        throw new GraphFormatError(
            "E_UNSUPPORTED",
            `option separator: ${JSON.stringify(separator)} is not one character other than a space, "#" or "="`,
            { option: "separator", found: separator },
        );
    }
    return separator;
}

/**
 * The direction a first line declares.
 * @param text - the first line, trimmed
 * @returns the direction, or null when the line is not a direction line
 */
function directionOf(text: string): "directed" | "undirected" | null {
    if (text === "# directed") {
        return "directed";
    }
    return text === "# undirected" ? "undirected" : null;
}

/**
 * A node line ("id" or "id = label").
 * @param text - the line, trimmed
 * @returns the id and the label, or null when the line is not a node line
 */
function nodeLine(text: string): { id: string; label?: string } | null {
    const eq = text.indexOf("=");
    const id = (eq < 0 ? text : text.slice(0, eq)).trim();
    if (id === "" || /\s/.test(id)) {
        return null;
    }
    return eq < 0 ? { id } : { id, label: text.slice(eq + 1).trim() };
}

/** What the importer needs to add one line to the graph. */
interface LineTarget {
    sink: GraphSink;
    report: ImportReportBuilder;
    ids: IdCoercer;
    edges: DirectionResolver;
    kind: "directed" | "undirected";
    addNode: (id: string | number) => number;
}

/**
 * Add one line, a node or an edge, to the graph.
 * @param to - where the line goes
 * @param text - the line, trimmed
 * @param separator - the separator option, or null for whitespace
 * @param line - the line number
 */
function readLine(to: LineTarget, text: string, separator: string | null, line: number): void {
    const node = nodeLine(text);
    const fields = separator === null ? text.split(/\s+/) : text.split(separator).map((f) => f.trim());
    if (node !== null && (fields.length === 1 || node.label !== undefined)) {
        const index = to.addNode(to.ids.text(node.id)); // the node's index, new or existing
        if (node.label !== undefined) {
            // declaring the same column again returns the same column
            const label = to.sink.declareNodeColumn({ name: "label", dtype: "string", role: "label" });
            to.sink.setNodeValue(label, index, node.label);
        }
    } else if (fields.length === 2 || fields.length === 3) {
        const weight = fields.length === 3 ? parseWeightText(fields[2]) : undefined;
        const [source, target] = [to.ids.text(fields[0]), to.ids.text(fields[1])];
        to.addNode(source);
        to.addNode(target);
        to.edges.addEdge(source, target, to.kind, weight, { line });
        to.report.counts.edges++;
    } else {
        // also a line written with another separator than the one passed ("a b 2" under ",")
        to.report.error("parse-error", PAIRS_ISSUE.BAD_LINE, "expected a node id, or two ids and a weight", { line });
        to.report.counts.skippedEdges++;
    }
}

export const pairsImporter: GraphImporter<PairsImportOptions> = {
    format: "pairs",
    extensions: [".pairs"],
    mimeTypes: ["text/x-pairs"],
    options: ["separator"], // so a misspelled option is reported as W_UNKNOWN_OPTION

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
        // add a node and count it if it is new; the count includes the nodes edge lines bring in
        const addNode = (id: string | number): number => {
            if (sink.indexOf(id) === INVALID_INDEX) {
                report.counts.nodes++;
            }
            return sink.addNode(id);
        };

        for await (const raw of lines) {
            const line = lines.line;
            const text = raw.trim();
            if (line === 1) {
                // the direction line, when there is one, is the first line; set the direction either way
                kind = directionOf(text) ?? kind;
                edges.setHeader(kind === "directed", { line });
            }
            if (line % 64 === 0) {
                throwIfAborted(opts.signal);
            }
            if (text.length === 0 || text.startsWith("#")) {
                continue;
            }
            try {
                readLine({ sink, report, ids, edges, kind, addNode }, text, separator, line);
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
 * A node's label as text.
 * @param snapshot - the graph
 * @param label - the label column, or null when the graph has none
 * @param i - the node's index
 * @returns the label, or undefined when the node has none
 */
function labelOf(snapshot: GraphSnapshot, label: { meta: { name: string } } | null, i: number): string | undefined {
    const value = label === null ? undefined : snapshot.nodes.value(label.meta.name, i);
    if (value === undefined || value === null) {
        return undefined;
    }
    return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * What a pairs file would not keep.
 * @param snapshot - the graph to write
 * @param options - the export options
 * @returns the loss notes; any E_ note makes export() throw
 */
function check(snapshot: GraphSnapshot, options?: PairsExportOptions): LossNote[] {
    const notes = checkCapabilities(snapshot, PAIRS_CAPABILITIES, resolveExportOptions(options), {
        attributes: false, // the format writes no attributes...
        roles: new Set(["label"]), // ...except the node label, which it has a place for
        roleNames: { label: "label" }, // and which the importer reads back as "label"
        idsReadBack: "canonical", // the importer turns the id text "7" into the number 7
    });
    const separator = separatorOf(options) ?? " ";
    const label = snapshot.nodes.byRole("label");
    let badIds = 0;
    let badLabels = 0;
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const id = String(snapshot.ids.idOf(i));
        if (id === "" || /[\s#=]/.test(id) || id.includes(separator)) {
            badIds++;
        }
        if (/[\r\n]/.test(labelOf(snapshot, label, i) ?? "")) {
            badLabels++;
        }
    }
    if (badIds > 0) {
        notes.push({
            code: PAIRS_LOSS.BAD_ID,
            message: `${badIds} of the node ids are empty or hold a space, "#", "=" or the separator`,
            column: null,
            count: badIds,
        });
    }
    if (badLabels > 0) {
        notes.push({
            code: PAIRS_LOSS.BAD_LABEL,
            message: `${badLabels} of the labels hold a line break`,
            column: label?.meta.name ?? null,
            count: badLabels,
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
function* lines(snapshot: GraphSnapshot, options?: PairsExportOptions): Generator<string> {
    // throw for an E_ note before writing anything: E_INVALID_ID for ids, E_DIRECTED for direction, ...
    const refused = refusedSave(check(snapshot, options), REFUSALS);
    if (refused !== null) {
        throw refused;
    }
    const separator = separatorOf(options) ?? " ";
    const { onMixedDirection } = resolveExportOptions(options);
    const directed = snapshot.directed && onMixedDirection !== "undirected";
    yield directed ? "# directed\n" : "# undirected\n";
    const label = snapshot.nodes.byRole("label");
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const id = String(snapshot.ids.idOf(i));
        const text = labelOf(snapshot, label, i);
        yield text === undefined ? `${id}\n` : `${id} = ${text}\n`;
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

export const pairsExporter: GraphExporter<PairsExportOptions> = {
    format: "pairs",
    extensions: [".pairs"],
    mimeTypes: ["text/x-pairs"],
    options: ["separator"],
    capabilities: PAIRS_CAPABILITIES,
    check,
    export: (snapshot, options) => encodeChunks(lines(snapshot, options)),
    exportToString: (snapshot, options) => joinText(lines(snapshot, options)),
};
