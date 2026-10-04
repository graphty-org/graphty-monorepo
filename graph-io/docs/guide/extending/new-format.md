# Writing a format plugin

A format plugin teaches graph-io to read or write a file format it does not know. A plugin is two
plain objects: an importer, which reads a file into a graph, and an exporter, which writes a graph
to a file. You can write either one or both. Once you register them, every graph-io function works
with your format: `loadFromUrl()`, `loadFromFile()`, `importGraph()`, format detection,
`checkExport()`, the export functions, `downloadGraph()` and `listFormats()`.

This page builds a plugin for a small made-up format called "pairs":

```text
# undirected
alice
alice bob 2.5
bob carol
```

Each line is a node (one id) or an edge (two ids and an optional weight). An optional first line,
`# directed` or `# undirected`, gives the direction.

## The smallest importer

An importer has a `format` name, the file `extensions` and `mimeTypes` it is for, and an `import()`
method. `import()` reads the input, adds nodes and edges to the `sink` it is given, and returns an
import report. graph-io creates the sink, which is a `GraphBuilder` from `@graphty/graph-format`,
and turns it into a snapshot when `import()` returns.

<!-- generated:begin example:extending/pairs-minimal -->

```ts
import { type GraphImporter, importGraph, ImportReportBuilder, LineReader, registry } from "@graphty/graph-io";

const pairsImporter: GraphImporter = {
    format: "pairs",
    extensions: [".pairs"],
    mimeTypes: [],
    async import(input, sink, options) {
        const report = new ImportReportBuilder("pairs", options?.errorLimit ?? 100);
        sink.setDirected(false);
        const lines = new LineReader(input, report, options);
        for await (const text of lines) {
            const [source, target] = text.trim().split(/\s+/);
            if (target === undefined) {
                report.error("parse-error", "E_PAIRS_BAD_LINE", "expected two node ids", { line: lines.line });
                continue;
            }
            sink.addEdge(source, target);
            report.counts.edges++;
        }
        return report.finish();
    },
};
registry.registerImporter(pairsImporter);

const { snapshot, report } = await importGraph("alice bob\nbob carol\ndave\n", { filename: "friends.pairs" });
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges, ${report.errorCount} error`);
```

<!-- generated:end -->

<!-- generated:begin output:extending/pairs-minimal -->

```text
3 nodes, 2 edges, 1 error
```

<!-- generated:end -->

Two helpers do most of the work:

- `LineReader` reads any input graph-io accepts (a string, bytes, a stream) one line at a time. It
  decodes bytes the way every built-in format does, reports progress, honors the `signal` option,
  and refuses empty or binary input with the usual codes.
- `ImportReportBuilder` collects issues. `report.error()` records an error, and throws the
  `ImportError` for you once there are more errors than `errorLimit`. `report.warning()` records a
  warning. `report.counts` holds the counts, and `report.finish()` returns the finished report.

This importer works, but it ignores the common options: `ids`, `defaultDirected`,
`onMixedDirection`, and a sink that is already directed. It also never checks the abort signal
between lines of a string input. The complete plugin below handles all of that.

## The complete plugin

<!-- generated:begin example:extending/pairs-format -->

```ts
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
```

<!-- generated:end -->

### Options

`resolveImportOptions(options, defaults)` fills in every common option, with the defaults your
format chooses for `ids`, `defaultDirected` and `weightFrom`, and throws `E_UNSUPPORTED` for an
invalid value. Two calls report options that have no effect, so a user is never left guessing:

- `reportSinkOptions()` warns when the caller asks for something the sink cannot do, such as a
  different `duplicateEdges` policy on a builder created with another one.
- `reportUnusedOptions()` warns `W_OPTION_IGNORED` for each common option the caller set that your
  importer does not read. List the ones you read in its last argument.

Options of your own format arrive in the same object. Give the importer a type parameter,
`GraphImporter<PairsImportOptions>`, to type them.

### Ids, edges and direction

- `IdCoercer` turns id text into a node id under the `ids` option, so `"42"` becomes the number 42
  by default, exactly as in the built-in formats.
- `DirectionResolver` adds edges for you. Call `setHeader()` once, with the direction the file
  declares, before the first edge, then `addEdge(source, target, kind, weight, location)` for each
  edge, where `kind` is the edge's own direction. It sets the graph's direction, and when edges
  disagree it applies `onMixedDirection`: by default the graph becomes directed and each undirected
  edge is stored as a marked pair, which exporters write back as one edge.
- `parseWeightText()` reads a weight and throws `E_INVALID_WEIGHT` for text that is not a number.

### Errors

Wrap the work for one element in `try` and pass anything it throws to `report.recordError()`.
A `GraphFormatError` about that element, such as an invalid weight or an id the `ids` option
refuses, becomes an error issue, and the element is skipped. Anything else is thrown again,
because it is a bug or an abort, not a problem with the file. Count what you skip in
`report.counts.skippedNodes` and `report.counts.skippedEdges`.

For a problem that makes the rest of the file unreadable, call `report.fail(code, message,
location)`. It records the issue and throws the `ImportError` at once.

### Cancelling

Call `throwIfAborted(signal)` every few dozen elements and once more before `report.finish()`. A
large string input arrives as one chunk, so the reader alone cannot stop between its lines.

### Detection

`sniff(head)` receives the first 8 KiB of the input as bytes and returns a confidence from 0 to 1
that they are your format. Return 0 when you cannot tell. A content match always outranks a match
on the file extension alone, so only claim content you are sure of. Without `sniff()` your format
is still chosen by its extension or MIME type, or when the caller passes `format`.

### The exporter

An exporter has a `format`, a `capabilities` table, and three methods:

- `check(snapshot, options)` returns the loss notes: everything the file would not keep.
- `export(snapshot, options)` returns the file as an async iterable of UTF-8 byte chunks.
- `exportToString(snapshot, options)` returns the file as one string.

`capabilities()` builds the table from the features your format supports; anything you leave out
is not supported. `checkCapabilities()` compares a graph with that table and returns the shared
notes: mixed direction, parallel edges, self-loops, edge ids, node ids and column types. Add your
format's own notes after them.

Write the file as a generator of text parts, one line or element at a time. `encodeChunks()` turns
the parts into the byte chunks `export()` returns, and `joinText()` into the string
`exportToString()` returns, so the two can never differ.

Two more helpers keep your exporter correct:

- `pairFolding(snapshot).folded(e)` is true for the second half of an undirected edge stored as a
  pair in a mixed graph. Skip those edges, so each undirected edge is written once.
- `explicitWeights(snapshot).text(e)` gives an edge's weight as text, or `null` when the edge has no
  weight of its own, so a graph without weights is not written with a weight of 1 on every edge.

`export()` must throw for every `E_` note `check()` returns, and only for those. The example does
this by running `check()` first. Ids are the most common case: `sanitizeIds()` rewrites the ids a
charset cannot hold (or throws under `sanitizeIds: "error"`) for the built-in charsets, `nmtoken`,
`integer` and `dense-1-based`.

## Registering the plugin

<!-- generated:begin example:extending/pairs-usage -->

```ts
import { checkExport, exportGraphToString, importGraph, listFormats, registry } from "@graphty/graph-io";

import { pairsExporter, pairsImporter } from "./pairs-format.js";

registry.registerImporter(pairsImporter).registerExporter(pairsExporter);

// The new format now works everywhere a built-in one does
const info = listFormats().find((f) => f.format === "pairs");
console.log(`${info?.format} ${info?.extensions.join(" ")}: read ${info?.canImport}, write ${info?.canExport}`);

const { snapshot, format, report } = await importGraph("# undirected\nalice\nalice bob 2.5\nbob carol\ncarol dave x\n");
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(report.issues.map((i) => `${i.code} line ${i.line}`));

// Convert another format to pairs, checking first
const gml = await importGraph('graph [ node [ id 1 label "one" ] node [ id 2 ] edge [ source 1 target 2 ] ]');
console.log(checkExport(gml.snapshot, "pairs"));
console.log(await exportGraphToString(gml.snapshot, "pairs"));
```

<!-- generated:end -->

<!-- generated:begin output:extending/pairs-usage -->

```text
pairs .pairs: read true, write true
pairs: 3 nodes, 2 edges
[ 'E_INVALID_WEIGHT line 5' ]
[
  {
    code: 'W_PAIRS_COLUMN_DROPPED',
    message: 'node column "label" is not written',
    column: 'label',
    count: 1
  }
]
# undirected
1
2
1 2
```

<!-- generated:end -->

`registry` is the registry behind every top-level function. `registerImporter()` and
`registerExporter()` add a format, or replace the format of the same name. Register once, when
your application starts, before the first load.

To keep a format away from the rest of your application, make a registry of your own:
`createRegistry()` returns a new registry with every built-in format, and `new FormatRegistry()` an
empty one. A registry has the same methods as the top-level functions: `importGraph()`,
`loadFromUrl()`, `loadFromFile()`, `exportGraphToBytes()`, `checkExport()`, `listFormats()` and the
rest. `downloadGraph()` uses the default registry only.

## Choosing codes

- When a problem is one graph-io already has a code for, use that code: `E_MISSING_ID`,
  `E_UNKNOWN_NODE`, `W_DUPLICATE_NODE` and the others on [Issue and loss codes](../codes.md). The
  shared codes are exported as constants (`LOSS.ID_TEXT_TYPE`, `PARSE_ERROR_CODE`, ...). A user
  who handles `E_UNKNOWN_NODE` for GEXF then handles it for your format too.
- Otherwise make a code of your own: `E_` for an error and `W_` for a warning, then your format's
  name, then the problem (`E_PAIRS_BAD_LINE`).
- Export your codes as two frozen objects, `PAIRS_ISSUE` for the import report and `PAIRS_LOSS` for
  `check()`, keyed by the code without its `E_` / `W_` prefix and format name, like the built-in
  `CSV_ISSUE` and `CSV_LOSS`. Users can then switch on `PAIRS_ISSUE.BAD_LINE` instead of a string.
- A code means one thing. Do not reuse a code for a different problem, and do not give one problem
  two codes.

## Rules every plugin keeps

- **Nothing is dropped silently.** Every element your importer skips is an error in the report,
  and every change it makes (a value converted, an id merged, a construct it does not support) is a
  warning. Every part of a graph your exporter does not write is a note from `check()`.
- **`check()` predicts every difference.** Import a file, export it, and import the result: every
  way the second graph differs from the first must be announced by a `check()` note. That includes
  differences your own importer introduces, such as text ids that read back as numbers.
- **The importer does not finish the graph.** Add nodes and edges to the sink and return the report;
  never call `freeze()`. That lets a caller read several files into one builder.
- **Check the abort signal** every few dozen elements and before returning.
- **Write plain messages.** An issue message is shown to people: say what was wrong and where, in
  one sentence.

A good test of a plugin reads each of your sample files, exports it, reads the result, and
compares the two graphs, with `check()` announcing every difference.
