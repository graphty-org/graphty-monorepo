# Extending an existing format

You do not have to write a format from scratch to change how one is read or written. Every
built-in importer and exporter is a plain object, exported from its format's entry point
(`csvImporter` and `csvExporter` from `@graphty/graph-io/csv`, and so on). Wrap one in an object of
your own, change what you need, and register the result. Three patterns cover most needs.

## Different defaults for one source

When the files from one source always need the same options, wrap the importer so they are the
defaults. Options the caller passes still win, because they are spread last.

<!-- generated:begin example:extending/csv-defaults -->

```ts
import { createRegistry, type GraphImporter } from "@graphty/graph-io";
import { csvImporter, type CsvImportOptions } from "@graphty/graph-io/csv";

// Our partner's files always use semicolons, and their ids are codes such as "007", not numbers
const partnerCsv: GraphImporter<CsvImportOptions> = {
    ...csvImporter,
    import: (input, sink, options) => csvImporter.import(input, sink, { delimiter: ";", ids: "string", ...options }),
};

// A registry of your own: same formats, but "csv" now means the partner's dialect
const partner = createRegistry().registerImporter(partnerCsv);

const { snapshot } = await partner.importGraph("source;target\n007;008\n008;010\n", { filename: "partner.csv" });
console.log([0, 1, 2].map((i) => JSON.stringify(snapshot.ids.idOf(i))).join(" "));
```

<!-- generated:end -->

<!-- generated:begin output:extending/csv-defaults -->

```text
"007" "008" "010"
```

<!-- generated:end -->

`{ ...csvImporter }` copies the format name, extensions, MIME types and detection, so the wrapper
is a drop-in replacement. Registered under the same name, `"csv"`, it replaces the built-in CSV
importer in that registry.

This example registers it in a registry of its own, made with `createRegistry()`, so the rest of
the application keeps reading CSV the standard way. A registry has the same methods as the
top-level functions: `importGraph()`, `loadFromUrl()`, `loadFromFile()`, the export functions,
`checkExport()` and `listFormats()`. To change CSV everywhere instead, register the wrapper in the
default `registry`, as the next examples do.

## A new format built on an existing one

Some tools write a known format with something extra around it. NetScope, an imaginary lab
instrument, writes a CSV edge table after a few lines about the run. A new format, `netscope`,
hides those lines from the CSV importer and hands it the table. Save this as `netscope.ts`:

<!-- generated:begin example:extending/netscope -->

```ts
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
const PREAMBLE = "Exported by NetScope";

export const netscopeImporter: GraphImporter<CsvImportOptions> = {
    format: "netscope",
    extensions: [".nsc"],
    mimeTypes: [],

    sniff: (head) => (new TextDecoder().decode(head).startsWith(PREAMBLE) ? 0.9 : 0),

    async import(input, sink, options) {
        // Decode the input the way every graph-io importer does, into this importer's own report
        const opts = resolveImportOptions(options, { ids: "canonical", defaultDirected: true, weightFrom: "weight" });
        const report = new ImportReportBuilder("netscope", opts.errorLimit);
        const text = await readText(input, report, opts);

        // Turn the preamble (the lines before the first blank line) into comment lines, which the CSV importer
        // skips; the lines keep their numbers. A file without a preamble is passed on as it is.
        let table = text;
        if (text.startsWith(PREAMBLE)) {
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
```

<!-- generated:end -->

Then load a NetScope file:

<!-- generated:begin example:extending/netscope-usage -->

```ts
import { importGraph } from "@graphty/graph-io";

import "./netscope.js";

const file = [
    "Exported by NetScope 4.2",
    "Instrument: bench-3",
    "",
    "source,target,weight",
    "A,B,0.5",
    "B,C,0.25",
    "C,D", // a row with a missing cell, on line 7 of the file
].join("\n");
const { format, snapshot, report } = await importGraph(file, { filename: "run-12.nsc" });
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(report.issues.map((i) => `${i.code} (line ${i.line ?? "-"}): ${i.message}`));
```

<!-- generated:end -->

<!-- generated:begin output:extending/netscope-usage -->

```text
netscope: 3 nodes, 2 edges
[
  'W_NETSCOPE_PREAMBLE (line 1): skipped the NetScope preamble (instrument bench-3)',
  'E_CSV_FIELD_COUNT (line 7): 2 fields, expected 3'
]
```

<!-- generated:end -->

The format has its own name, extension and `sniff()`, so `.nsc` files, and any file that starts
with the NetScope preamble, are read with it. Its detection outranks CSV's because it recognizes
the content with more confidence.

`readText()` decodes the input with the same rules as every built-in format (byte order mark,
`encoding` option, UTF-8, windows-1252 fallback), so the wrapper handles bytes and streams, not
only strings. It records what it noticed, such as `W_ENCODING_FALLBACK`, in the wrapper's report,
and reports the reading progress. The CSV importer then reads a string that is already decoded,
so the wrapper passes it `forDecodedText(options)`: the caller's options without `encoding` and
`onProgress`, which would otherwise add a warning and report the progress twice.

The preamble lines are replaced by `#` lines rather than cut off. The CSV importer skips leading
`#` lines as comments, and every row keeps its line number, so the bad row above is reported on
line 7, where it is in the file. A `.nsc` file that does not start with the preamble is passed to
the CSV importer unchanged, without the warning.

`report.include()` adds the CSV importer's report to the wrapper's: its issues after the preamble
warning, and its counts. The wrapper returns one report under its own format name. Every CSV
option still works, and so does every CSV issue code: a bad row in a NetScope file is reported as
`CSV_ISSUE.FIELD_COUNT`, as it would be in a CSV file.

## Changing what an exporter writes

An exporter can be wrapped the same way. This one starts every CSV file with a comment line. Both
output methods are wrapped, so `exportGraph()`, `exportGraphToBytes()` and `exportGraphToString()`
agree:

<!-- generated:begin example:extending/csv-stamp -->

```ts
import { exportGraphToString, type GraphExporter, importGraph, registry } from "@graphty/graph-io";
import { csvExporter, type CsvExportOptions } from "@graphty/graph-io/csv";

// Every CSV file this application writes starts with a comment line naming it.
// graph-io's CSV importer skips leading # lines, so the files read back unchanged.
const STAMP = "# written by Acme Graph Studio\n";

const stampedCsv: GraphExporter<CsvExportOptions> = {
    ...csvExporter,
    async *export(snapshot, options) {
        yield new TextEncoder().encode(STAMP);
        yield* csvExporter.export(snapshot, options);
    },
    async exportToString(snapshot, options) {
        return STAMP + (await csvExporter.exportToString(snapshot, options));
    },
};
registry.registerExporter(stampedCsv); // replaces the built-in CSV exporter

const { snapshot } = await importGraph("digraph { a -> b; b -> c }");
const csv = await exportGraphToString(snapshot, "csv");
console.log(csv);
console.log((await importGraph(csv, { format: "csv" })).snapshot.edgeCount);
```

<!-- generated:end -->

<!-- generated:begin output:extending/csv-stamp -->

```text
# written by Acme Graph Studio
Source,Target,Type
a,b,Directed
b,c,Directed

2
```

<!-- generated:end -->

The CSV importer skips leading `#` lines, so the stamped file still reads back as the same graph,
and `check()` (copied from the CSV exporter, and what `checkExport()` calls) is still correct. If
your change means the file reads back differently, wrap `check()` too and add a note that says how,
as [Writing a format plugin](./new-format.md#checking-what-a-save-loses) explains.

## Reusing a format's codes and options

Each format's entry point also exports:

- its option types (`CsvImportOptions`, `CsvExportOptions`), to type a wrapper as
  `GraphImporter<CsvImportOptions>` so that callers get the format's options in their editor
- its code tables (`CSV_ISSUE`, `CSV_LOSS`), to recognize codes in a report or in `checkExport()`
  notes
- for some formats, its capabilities table (`CSV_CAPABILITIES`), to build an exporter that
  supports the same features

The [format pages](../formats/index.md) list each format's options and codes.
