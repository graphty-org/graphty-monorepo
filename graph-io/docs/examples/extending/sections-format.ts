import {
    chooseGraph,
    type CommonImportOptions,
    type GraphChoiceOptions,
    type GraphImporter,
    type GraphSink,
    type ImportInput,
    type ImportReport,
    ImportReportBuilder,
    MULTIPLE_GRAPHS_CODE,
    readText,
    resolveImportOptions,
} from "@graphty/graph-io";

// The "sections" format: several graphs in one file, each an "== name" line and then its edges.
//
//   == first
//   a b
//   == second
//   x y
//   y z

/** One graph of a file: its name and its edge lines. */
interface Section {
    readonly name: string;
    readonly edges: readonly (readonly [string, string])[];
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
    const sections: { name: string; edges: [string, string][] }[] = [];
    for (const line of text.split("\n")) {
        const header = /^== (.+)$/.exec(line.trim());
        if (header !== null) {
            sections.push({ name: header[1], edges: [] });
        } else if (line.trim() !== "" && sections.length > 0) {
            const [source, target] = line.trim().split(/\s+/);
            sections[sections.length - 1].edges.push([source, target]);
        }
    }
    return sections;
}

/**
 * Add one graph to a sink.
 * @param section - the graph
 * @param sink - the sink to fill
 * @param report - the graph's report
 * @returns the finished report
 */
function fill(section: Section, sink: GraphSink, report: ImportReportBuilder): ImportReport {
    sink.setDirected(false);
    sink.setMeta({ name: section.name }); // graphName matches this name
    for (const [source, target] of section.edges) {
        sink.addEdge(source, target);
        report.counts.edges++;
    }
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
        const report = new ImportReportBuilder("sections", resolveImportOptions(options, DEFAULTS).errorLimit);
        const sections = await readSections(input, options, report);
        const index = chooseGraph(
            sections.map((s) => s.name),
            options,
            report,
        );
        if (sections.length > 1) {
            report.warning(
                "unsupported",
                MULTIPLE_GRAPHS_CODE,
                `the file holds ${sections.length} graphs; read "${sections[index].name}"`,
            );
        }
        return fill(sections[index], sink, report);
    },

    // every graph, each into its own sink with its own report; importAllGraphs() calls this
    async importAll(input, sinkFor, options) {
        const decoding = new ImportReportBuilder("sections", resolveImportOptions(options, DEFAULTS).errorLimit);
        const sections = await readSections(input, options, decoding);
        // fork() starts each graph's report with what decoding recorded
        return sections.map((s, i) => fill(s, sinkFor(i), decoding.fork()));
    },
};
