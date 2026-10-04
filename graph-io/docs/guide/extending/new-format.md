# Writing a format plugin

A format plugin teaches graph-io to read or write a file format it does not know. A plugin is two
plain objects: an importer, which reads a file into a graph, and an exporter, which writes a graph
to a file. You can write either one or both. Once you register them, every graph-io function works
with your format: `loadFromUrl()`, `loadFromFile()`, `importGraph()`, format detection,
`checkExport()`, the save functions, `downloadGraph()` and `listFormats()`.

This page builds a plugin for a small made-up format called "pairs":

```text
# undirected
alice = Alice Liddell
alice bob 2.5
bob carol
```

Each line is a node (an id, and an optional label after `=`) or an edge (two ids and an optional
weight). An optional first line, `# directed` or `# undirected`, gives the direction.

The helpers this page uses are exported from `@graphty/graph-io` and listed under "Plugin helpers"
in the [API reference](https://graphty.app/docs/graph-io/api/generated/). The graph your importer
fills is a `GraphBuilder` from [`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format),
and the graph your exporter writes is a snapshot, which [Reading the graph](../reading.md) explains.

To change how a built-in format reads or writes instead, see
[Extending an existing format](./existing-format.md).

## The smallest importer

An importer has a `format` name, the file `extensions` and `mimeTypes` it is for, and an `import()`
method. `import()` reads the input, adds nodes and edges to the `sink` it is given, and returns an
import report. graph-io creates the sink, a `GraphBuilder`, and turns it into a snapshot when
`import()` returns.

<!-- generated:begin example:extending/pairs-minimal -->

```ts
import {
    DEFAULT_ERROR_LIMIT,
    type GraphImporter,
    importGraph,
    ImportReportBuilder,
    LineReader,
    registry,
} from "@graphty/graph-io";

const pairsImporter: GraphImporter = {
    format: "pairs",
    extensions: [".pairs"],
    mimeTypes: [],
    async import(input, sink, options) {
        const report = new ImportReportBuilder("pairs", options?.errorLimit ?? DEFAULT_ERROR_LIMIT);
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
- `ImportReportBuilder` collects issues. `report.error(category, code, message, location)` records
  an error, and throws the `ImportError` for you once there are more errors than `errorLimit`
  (`DEFAULT_ERROR_LIMIT`, 100, when the caller sets none). `report.warning()` records a warning.
  The categories are the ones [the import report](../report.md#issues) lists. `report.counts` holds
  the counts, and `report.finish()` returns the finished report.

This importer works, but it ignores the common options (`ids`, `defaultDirected`,
`onMixedDirection`), reads no attributes, and never checks the abort signal between lines of a
string input. The complete plugin below handles all of that.

## The complete plugin

Save this as `pairs-format.ts`:

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
```

<!-- generated:end -->

### Options

`resolveImportOptions(options, defaults)` fills in every common option, with the defaults your
format chooses for `ids`, `defaultDirected` and `weightFrom`, and throws `E_UNSUPPORTED` for an
invalid value. Two calls report the common options that have no effect:

- `reportSinkOptions()` warns when the caller asks for something the sink cannot do, such as a
  different `duplicateEdges` policy on a builder created with another one.
- `reportUnusedOptions()` warns `W_OPTION_IGNORED` for each common option the caller set that your
  importer does not read. List the ones you read in its last argument.

Your format's own options arrive in the same object. Declare their type (`PairsOptions` here) and
pass it as the type parameter, `GraphImporter<PairsOptions>` and `GraphExporter<PairsOptions>`.
Check each value yourself and throw `GraphFormatError("E_UNSUPPORTED", ...)` with
`details.option` for one you cannot use, as `separatorOf()` does; the built-in formats do the same.
`reportUnusedOptions()` knows nothing about your options, and a misspelled name is not reported, so
tell your users to check their options with `satisfies PairsOptions`, as the usage example below
does.

### Ids, edges, direction and attributes

- `IdCoercer` turns id text into a node id under the `ids` option, so `"42"` becomes the number 42
  by default, exactly as in the built-in formats.
- `DirectionResolver` adds edges for you. Call `setHeader()` once, with the direction the file
  declares or the `defaultDirected` default, then `addEdge(source, target, kind, weight, location)`
  for each edge, where `kind` is the edge's own direction. Call `setHeader()` even when the file has
  no edges, so a graph of nodes alone still gets its direction. When edges disagree it applies
  `onMixedDirection`: by default the graph becomes directed and each undirected edge is stored as a
  marked pair, which exporters write back as one edge.
- `parseWeightText()` reads a weight and throws `E_INVALID_WEIGHT` for text that is not a number.
- `sink.addNode(id)` returns the node's index, whether the node is new or already there.
- Attributes are columns. `sink.declareNodeColumn({ name, dtype, role })` declares one and returns
  its handle (declaring the same column again returns the same handle), and
  `sink.setNodeValue(column, index, value)` sets a value; `declareEdgeColumn()` and
  `setEdgeValue(column, edge, value)` do the same for edges, with the edge index `addEdge()`
  returned. Give a column the role that says what it is (`"label"`, `"color"`, `"position"`) so
  other formats and `byRole()` find it. For text whose type you do not know, `TextCellWriter` infers
  numbers and booleans the way CSV does.

A format with no direction marker at all, such as a plain edge list, calls `setHeader()` with
`defaultDirected` and nothing else. Its exporter cannot record an undirected graph, so its
`check()` adds a `W_DIRECTION_DROPPED` note when the graph is undirected (the code is exported as
`DIRECTION_DROPPED_CODE`).

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

`sniff(head)` receives up to the first 8 KiB of the input as bytes and returns a confidence from 0
to 1 that they are your format. Return 0 when you cannot tell. A confidence of 0.5 or more beats any
file extension, so only return that for content you are sure of; below 0.5 is a guess that loses
to another format's extension. Without `sniff()` your format is still chosen by its extension or
MIME type, or when the caller passes `format`.

### Files that hold several graphs

If one file of your format can hold several graphs, add `importAll(input, sinkFor, options)`: it
reads every graph, asking `sinkFor(index)` for a fresh sink before each one, and returns one report
per graph. `importAllGraphs()` calls it, and `importGraph()` then also honors `graphIndex` and
`graphName`, by reading every graph and returning the chosen one; `graphName` matches the graph's
name, which you set with `sink.setMeta({ name })`. Your `import()`
should read the first graph and warn `W_MULTIPLE_GRAPHS` with the number it skipped.

To let callers list the graphs without reading them, also add `listGraphs(input, options)`,
returning `{ index, name, nodes, edges }` per graph (the counts `null` when unknown). An importer
with `listGraphs()` must apply `graphIndex` and `graphName` in `import()` itself;
`chooseGraph(names, options, report)` does it and fails with the right codes.

### The exporter

An exporter has a `format`, a `capabilities` table, three methods, and optionally `extensions` and
`mimeTypes`:

- `check(snapshot, options)` returns the loss notes: everything the file would not keep. It is
  what `checkExport()` calls.
- `export(snapshot, options)` returns the file as an async iterable of byte chunks.
- `exportToString(snapshot, options)` returns the file as one string.
- `extensions` and `mimeTypes` matter for a format you can write but not read: `listFormats()`,
  `exportGraphToBlob()` and `downloadGraph()` take the file extension and MIME type from them.

Write the file as a generator of text parts, one line or element at a time. `encodeChunks()` turns
the parts into the UTF-8 byte chunks `export()` returns, and `joinText()` into the string
`exportToString()` returns, so the two can never differ. A binary format yields its bytes from
`export()` directly, and its `exportToString()` rejects with
`GraphFormatError("E_UNSUPPORTED", ..., { reason: "binary" })`.

### Reading the graph in an exporter

Nodes are `0` to `snapshot.nodeCount - 1`, with ids from `snapshot.ids.idOf(i)`; edges are `0` to
`snapshot.edgeCount - 1`, with ends `snapshot.edgeSource(e)` and `snapshot.edgeTarget(e)`.
Attributes are the columns of `snapshot.nodes` and `snapshot.edges`: iterate a table for its
columns, read `column.meta.name`, `column.meta.dtype` and `column.meta.role`, and read a value
with `snapshot.nodes.value(name, i)` (`undefined` when it has none). `byRole("label")` finds the
column that has a role. [Reading the graph](../reading.md) has more.

Some columns describe how the graph is stored rather than holding data, and an exporter never
writes them as attributes: the roles `"weight"` (write it with `explicitWeights()`), `"directed"`,
`"pair"` and `"mutual"` (how undirected edges of a mixed graph are stored; `pairFolding()` reads
them), `"originalId"` (the original ids of a mangled file) and the edge `"id"` column (edge ids,
which `capabilities.edgeIds` covers). `checkCapabilities()` skips them for you.

Two helpers handle the stored structure:

- `pairFolding(snapshot).folded(e)` is true for the second half of an undirected edge stored as a
  pair in a mixed graph. Skip those edges, so each undirected edge is written once.
- `explicitWeights(snapshot).text(e)` gives an edge's weight as text, or `null` when the edge has no
  weight of its own, so a graph without weights is not written with a weight of 1 on every edge.

### Checking what a save loses

`capabilities()` builds the table of what your format can store: anything you leave out is not
supported, and `dtypes` lists the attribute types it keeps exactly (`"string"`, `"i32"`, `"f64"`,
`"bool"` and the others the [All formats](../formats/index.md) page explains). `checkCapabilities()`
compares a graph with that table and returns the shared notes: mixed direction, parallel edges,
self-loops, edge ids, node ids, attribute types and roles. Its last argument tells it what the table
cannot:

- `attributes: false` for a format that writes no attributes; each attribute becomes one
  `W_COLUMN_DROPPED` note.
- `roles`: the roles your format has a place for, such as `"label"`. With `attributes: false`
  those columns are still written. A column with any other role is written as a plain attribute
  and noted `W_ROLE_DROPPED`.
- `roleNames`: the name your importer gives each role's column, so a label column called `Name`
  is noted as coming back as `label`.
- `idsReadBack`: how your importer turns id text back into ids (`"canonical"` here), so an id
  that comes back with another type is noted `W_ID_TEXT_TYPE`.

Add your format's own notes after them, like `E_PAIRS_BAD_TEXT`. `export()` must throw for every
`E_` note `check()` returns, and only for those; the example runs `check()` first.

When your format's ids follow one of the built-in id rules (`idCharset` `"nmtoken"`, `"integer"`
or `"dense-1-based"`), `sanitizeIds(snapshot, charset, mode)` gives the ids to write: under
`"error"` it throws for an id the rule cannot hold, and under `"mangle"` it rewrites them and tells
you, per node, whether the id changed (`isChanged(i)`) and what it was (`originalAt(i)`). Write the
original of each changed id to the file, in a column with the role `"originalId"`, and have your
importer use that value as the node's id when `restoreMangledIds` is true; that is what makes a
round trip keep the ids, and what the `W_ID_MANGLED` note promises. A format that cannot store the
originals uses `idCharset: "any"` and refuses ids it cannot write with a note of its own, as pairs
does.

## Registering the plugin

<!-- generated:begin example:extending/pairs-usage -->

```ts
import { checkExport, exportGraphToString, importGraph, listFormats, registry } from "@graphty/graph-io";

import { pairsExporter, pairsImporter, type PairsOptions } from "./pairs-format.js";

registry.registerImporter(pairsImporter).registerExporter(pairsExporter);

// The new format now works everywhere a built-in one does
const info = listFormats().find((f) => f.format === "pairs");
console.log(`${info?.format} ${info?.extensions.join(" ")}: read ${info?.canImport}, write ${info?.canExport}`);

const text = "# undirected\nalice = Alice Liddell\nalice bob 2.5\nbob carol\ncarol dave x\n";
const { snapshot, format, report } = await importGraph(text);
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(report.issues.map((i) => `${i.code} line ${i.line}`));

// The plugin's own options go in the same object; `satisfies` checks their names
const csvStyle = { separator: "," } satisfies PairsOptions;
console.log(await exportGraphToString(snapshot, "pairs", csvStyle));

// Convert another format to pairs, checking first
const gml = await importGraph(
    'graph [ node [ id 1 label "one" ] node [ id 2 color "red" ] edge [ source 1 target 2 ] ]',
);
console.log(checkExport(gml.snapshot, "pairs").map((n) => `${n.code}: ${n.message}`));
```

<!-- generated:end -->

<!-- generated:begin output:extending/pairs-usage -->

```text
pairs .pairs: read true, write true
pairs: 3 nodes, 2 edges
[ 'E_INVALID_WEIGHT line 5' ]
# undirected
alice = Alice Liddell
bob
carol
alice,bob,2.5
bob,carol

[ 'W_COLUMN_DROPPED: node column "color" is not written' ]
```

<!-- generated:end -->

`registry` is the registry behind every top-level function. `registerImporter()` and
`registerExporter()` add a format, or replace the format of the same name. Register once, when
your application starts, before the first load.

To keep a format away from the rest of your application, make a registry of your own:
`createRegistry()` returns a new registry with every built-in format, and `new FormatRegistry()` an
empty one. A registry has the same methods as the top-level functions: `importGraph()`,
`loadFromUrl()`, `loadFromFile()`, `exportGraphToBytes()`, `checkExport()`, `listFormats()` and the
rest. `downloadGraph()` is not one of them; [Saving graphs](../saving.md#uploads-and-downloads)
shows the few lines that replace it.

## Choosing codes

- When a problem is one graph-io already has a code for, use that code: `E_MISSING_ID`,
  `E_UNKNOWN_NODE`, `W_DUPLICATE_NODE` and the others on [Issue and loss codes](../codes.md). The
  shared codes are exported as constants (`LOSS.ID_TEXT_TYPE`, `DIRECTION_DROPPED_CODE`, ...). A
  user who handles `E_UNKNOWN_NODE` for GEXF then handles it for your format too.
- Otherwise make a code of your own: `E_` for an error and `W_` for a warning, then your format's
  name, then the problem (`E_PAIRS_BAD_LINE`).
- Export your codes as two frozen objects, `PAIRS_ISSUE` for the import report and `PAIRS_LOSS` for
  `check()`, keyed by the code without its `E_` / `W_` prefix and format name, like the built-in
  `CSV_ISSUE` and `CSV_LOSS`. Users can then switch on `PAIRS_ISSUE.BAD_LINE` instead of a string.
- A code means one thing. Do not reuse a code for a different problem, and do not give one problem
  two codes.

## Rules every plugin keeps

- Nothing is dropped silently. Every element your importer skips is an error in the report, and
  every change it makes (a value converted, an id merged, a construct it does not support) is a
  warning. Every part of a graph your exporter does not write is a note from `check()`.
- `check()` predicts every difference. Import a file, export it, and import the result: every way
  the second graph differs from the first must be announced by a `check()` note. That includes
  differences your own importer introduces, such as text ids that read back as numbers.
- The importer does not finish the graph. Add nodes and edges to the sink and return the report;
  never call `freeze()`. That lets a caller read several files into one builder.
- Check the abort signal every few dozen elements and before returning.
- Write plain messages. An issue message is shown to people: say what was wrong and where, in one
  sentence.

To test a plugin, read each of your sample files, export it, read the result, and compare the two
graphs; every difference should match a `check()` note.
