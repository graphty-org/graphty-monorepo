import {
    type GraphImporter,
    ImportReportBuilder,
    type ImportIssue,
    readText,
    registry,
    resolveImportOptions,
} from "@graphty/graph-io";
import { csvImporter, type CsvImportOptions } from "@graphty/graph-io/csv";

// NetScope writes a CSV edge table after a few lines about the instrument:
//
//   Exported by NetScope 4.2
//   Instrument: bench-3
//
//   source,target,weight
//   ...
const PREAMBLE = /^Exported by NetScope/;

export const netscopeImporter: GraphImporter<CsvImportOptions> = {
    format: "netscope",
    extensions: [".nsc"],
    mimeTypes: [],

    sniff: (head) => (PREAMBLE.test(new TextDecoder().decode(head)) ? 0.9 : 0),

    async import(input, sink, options) {
        // Decode the input the way every graph-io importer does, then cut the preamble off
        const opts = resolveImportOptions(options, { ids: "canonical", defaultDirected: true, weightFrom: "weight" });
        const text = await readText(input, new ImportReportBuilder("netscope", opts.errorLimit), opts);
        const blank = text.search(/\r?\n\r?\n/);
        const preamble = blank < 0 ? "" : text.slice(0, blank);
        const table = blank < 0 ? text : text.slice(blank).trimStart();

        const report = await csvImporter.import(table, sink, options);
        const instrument = /^Instrument: (.*)$/m.exec(preamble)?.[1] ?? "unknown";
        const note: ImportIssue = {
            category: "unsupported",
            severity: "warning",
            code: "W_NETSCOPE_PREAMBLE",
            message: `skipped the NetScope preamble (instrument ${instrument})`,
            line: 1,
            element: null,
        };
        return {
            ...report,
            format: "netscope",
            issues: [note, ...report.issues],
            warningCount: report.warningCount + 1,
        };
    },
};

registry.registerImporter(netscopeImporter);
