import {
    forDecodedText,
    type GraphImporter,
    ImportReportBuilder,
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
        // Decode the input the way every graph-io importer does, into this importer's own report
        const opts = resolveImportOptions(options, { ids: "canonical", defaultDirected: true, weightFrom: "weight" });
        const report = new ImportReportBuilder("netscope", opts.errorLimit);
        const text = await readText(input, report, opts);

        // Turn the preamble (the lines before the first blank line) into comment lines, which the CSV importer
        // skips; the lines keep their numbers. A file without a preamble is passed on as it is.
        let table = text;
        if (PREAMBLE.test(text)) {
            const blank = /\r?\n\s*\r?\n/.exec(text);
            const end = blank === null ? text.length : blank.index + blank[0].length;
            const instrument = /^Instrument: (.*)$/m.exec(text.slice(0, end))?.[1] ?? "unknown";
            const lines = text.slice(0, end).split("\n"); // the last entry is the empty rest after the blank line
            table = lines.map((line, i) => (i < lines.length - 1 ? "#" : line)).join("\n") + text.slice(end);
            report.warning(
                "unsupported",
                "W_NETSCOPE_PREAMBLE",
                `skipped the NetScope preamble (instrument ${instrument})`,
                {
                    line: 1,
                },
            );
        }

        // The CSV importer reads the decoded table; its issues and counts join this report
        report.include(await csvImporter.import(table, sink, forDecodedText(options)));
        return report.finish();
    },
};

registry.registerImporter(netscopeImporter);
