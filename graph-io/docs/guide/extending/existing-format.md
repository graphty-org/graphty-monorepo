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
cuts those lines off and hands the table to the CSV importer:

<!-- generated:begin example:extending/netscope -->

```ts
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
```

<!-- generated:end -->

<!-- generated:begin example:extending/netscope-usage -->

```ts
import { importGraph } from "@graphty/graph-io";

import "./netscope.js";

const file = "Exported by NetScope 4.2\nInstrument: bench-3\n\nsource,target,weight\nA,B,0.5\nB,C,0.25\n";
const { format, snapshot, report } = await importGraph(file, { filename: "run-12.nsc" });
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(report.issues.map((i) => `${i.code}: ${i.message}`));
```

<!-- generated:end -->

<!-- generated:begin output:extending/netscope-usage -->

```text
netscope: 3 nodes, 2 edges
[
  'W_NETSCOPE_PREAMBLE: skipped the NetScope preamble (instrument bench-3)'
]
```

<!-- generated:end -->

A few things to notice:

- The format has its own name, extension and `sniff()`, so `.nsc` files, and any file that starts
  with the NetScope preamble, are read with it. Its detection outranks CSV's because it recognizes
  the content with more confidence.
- `readText()` decodes the input with the same rules as every built-in format (byte order mark,
  `encoding` option, UTF-8, windows-1252 fallback), so the wrapper handles bytes and streams, not
  only strings.
- The report the CSV importer returns is a plain object. The wrapper returns a copy with its own
  warning added, so the preamble is not dropped silently, and with its own format name.
- Every CSV option still works, and so does every CSV issue code: a bad row in a NetScope file is
  reported as `CSV_ISSUE.FIELD_COUNT`, as it would be in a CSV file.

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
and `check()` (copied from the CSV exporter) is still correct. If your change means the file reads
back differently, wrap `check()` too and add a note that says how; see the rules on
[Writing a format plugin](./new-format.md#rules-every-plugin-keeps).

## Reusing a format's codes and options

Each format's entry point also exports:

- its option types (`CsvImportOptions`, `CsvExportOptions`), to type a wrapper as
  `GraphImporter<CsvImportOptions>` so that callers get the format's options in their editor
- its code tables (`CSV_ISSUE`, `CSV_LOSS`), to recognize codes in a report or in `check()` notes
- for some formats, its capabilities table (`CSV_CAPABILITIES`), to build an exporter that
  supports the same features

The [format pages](../formats/index.md) list each format's options and codes.
