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
        // Decode the input the way every graph-io importer does, keeping what decoding reports
        const opts = resolveImportOptions(options, { ids: "canonical", defaultDirected: true, weightFrom: "weight" });
        const decoding = new ImportReportBuilder("netscope", opts.errorLimit);
        const text = await readText(input, decoding, opts);

        // Turn the preamble into comment lines, which the CSV importer skips; the lines keep their numbers
        const blank = /\r?\n\s*\r?\n/.exec(text);
        const end = blank === null ? 0 : blank.index + blank[0].length;
        const instrument = /^Instrument: (.*)$/m.exec(text.slice(0, end))?.[1] ?? "unknown";
        const lines = text.slice(0, end).split("\n"); // the last entry is the empty rest after the blank line
        const table = lines.map((line, i) => (i < lines.length - 1 ? "#" : line)).join("\n") + text.slice(end);

        // The text is already decoded and its progress reported: the CSV importer gets neither option again
        const csv = await csvImporter.import(table, sink, { ...options, onProgress: undefined, encoding: undefined });

        // One report: the decoding warnings, the preamble, then the table's issues
        const preamble: ImportIssue = {
            category: "unsupported",
            severity: "warning",
            code: "W_NETSCOPE_PREAMBLE",
            message: `skipped the NetScope preamble (instrument ${instrument})`,
            line: 1,
            element: null,
        };
        const decoded = decoding.finish();
        return {
            ...csv,
            format: "netscope",
            issues: [...decoded.issues, preamble, ...csv.issues],
            errorCount: csv.errorCount + decoded.errorCount,
            warningCount: csv.warningCount + decoded.warningCount + 1,
        };
    },
};

registry.registerImporter(netscopeImporter);
