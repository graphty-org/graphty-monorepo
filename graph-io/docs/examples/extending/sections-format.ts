import {
    chooseGraph,
    type CommonImportOptions,
    graphChosen,
    type GraphChoiceOptions,
    type GraphImporter,
    type GraphSink,
    type ImportInput,
    type ImportReport,
    ImportReportBuilder,
    MULTIPLE_GRAPHS_CODE,
    readText,
    resolveImportOptions,
    throwIfAborted,
} from "@graphty/graph-io";

// The "sections" format: several graphs in one file, each an "== name" line and then its edges.
//
//   == first
//   a b
//   == second
//   x y
//   y z

/** One graph of a file: its name and its edge lines, each with its line number. */
interface Section {
    readonly name: string;
    readonly edges: readonly { readonly ids: readonly string[]; readonly line: number }[];
}

// the format's defaults for the common options
const DEFAULTS = { ids: "string", defaultDirected: false, weightFrom: null } as const;

/**
 * Decode the input once and split it into its graphs. Decoding warnings go into `report`.
 * @param input - the file
 * @param options - the caller's options
 * @param report - where decoding issues are recorded
 * @returns every graph of the file, in order
 */
async function readSections(
    input: ImportInput,
    options: CommonImportOptions | undefined,
    report: ImportReportBuilder,
): Promise<Section[]> {
    const opts = resolveImportOptions(options, DEFAULTS);
    const text = await readText(input, report, opts);
    const sections: { name: string; edges: { ids: string[]; line: number }[] }[] = [];
    text.split("\n").forEach((raw, i) => {
        const line = raw.trim();
        const header = /^== (.+)$/.exec(line);
        if (header !== null) {
            sections.push({ name: header[1], edges: [] });
        } else if (line !== "") {
            sections.at(-1)?.edges.push({ ids: line.split(/\s+/), line: i + 1 });
        }
    });
    return sections;
}

/**
 * Add one graph to a sink.
 * @param section - the graph
 * @param sink - the sink to fill
 * @param report - the graph's report
 * @param signal - the caller's cancellation signal
 * @returns the finished report
 */
function fill(
    section: Section,
    sink: GraphSink,
    report: ImportReportBuilder,
    signal: AbortSignal | null,
): ImportReport {
    sink.setDirected(false); // the format is always undirected, so edges go to the sink directly
    sink.setMeta({ name: section.name }); // graphName matches this name
    section.edges.forEach(({ ids, line }, i) => {
        if (i % 64 === 0) {
            throwIfAborted(signal);
        }
        if (ids.length !== 2) {
            report.error("parse-error", "E_SECTIONS_BAD_LINE", "expected two node ids", { line });
            report.counts.skippedEdges++;
            return;
        }
        try {
            sink.addEdge(ids[0], ids[1]);
            report.counts.edges++;
        } catch (err) {
            report.recordError(err, { line }); // rethrows anything that is not a problem with this edge
            report.counts.skippedEdges++;
        }
    });
    throwIfAborted(signal);
    return report.finish();
}

// GraphChoiceOptions adds graphIndex and graphName to the options import() receives
export const sectionsImporter: GraphImporter<GraphChoiceOptions> = {
    format: "sections",
    extensions: [".sections"],
    mimeTypes: [],

    // the graphs without reading them: listGraphs() calls this
    async listGraphs(input, options) {
        const sections = await readSections(input, options, new ImportReportBuilder("sections", Infinity));
        return sections.map((s, index) => ({ index, name: s.name, nodes: null, edges: s.edges.length }));
    },

    // one graph: the one graphIndex or graphName chooses, else the first
    async import(input, sink, options) {
        const opts = resolveImportOptions(options, DEFAULTS);
        const report = new ImportReportBuilder("sections", opts.errorLimit);
        const sections = await readSections(input, options, report);
        const index = chooseGraph(
            sections.map((s) => s.name),
            options,
            report,
        );
        if (sections.length > 1 && !graphChosen(options)) {
            // the caller did not choose, so say that the other graphs were skipped
            report.warning(
                "unsupported",
                MULTIPLE_GRAPHS_CODE,
                `the file holds ${sections.length} graphs; read the first, "${sections[index].name}" (graphIndex or graphName chooses another)`,
            );
        }
        return fill(sections[index], sink, report, opts.signal);
    },

    // every graph, each into its own sink with its own report; importAllGraphs() calls this
    async importAll(input, sinkFor, options) {
        const opts = resolveImportOptions(options, DEFAULTS);
        const decoding = new ImportReportBuilder("sections", opts.errorLimit);
        const sections = await readSections(input, options, decoding);
        // fork() starts each graph's report with what decoding recorded
        return sections.map((s, i) => fill(s, sinkFor(i), decoding.fork(), opts.signal));
    },
};
