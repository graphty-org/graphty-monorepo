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

Everything this page uses is exported from `@graphty/graph-io`, including `GraphBuilder`, the
types `GraphSink` and `GraphSnapshot` and the constant `INVALID_INDEX`. The importer adds nodes and
edges to a graph under construction, called the sink; the exporter reads a finished graph, the
snapshot that [Reading the graph](../reading.md) explains.

To change how a built-in format reads or writes instead, see
[Extending an existing format](./existing-format.md).

## A line format in one function

For a format with one node or one edge per line, `defineLineFormat()` makes the importer from one
function, `parseLine`, which gets each line split on whitespace and adds what the line holds. Blank
lines and lines starting with `#` are skipped. A line it throws for is skipped and reported as
`E_BAD_LINE`, with the message it threw and the line number:

<!-- generated:begin example:extending/line-format -->

```ts
import { defineLineFormat, importGraph, registry } from "@graphty/graph-io";

const pairs = defineLineFormat({
    format: "pairs",
    extensions: [".pairs"],
    parseLine(fields, graph) {
        if (fields[1] === "=") {
            graph.node(fields[0], { label: fields.slice(2).join(" ") }); // alice = Alice Liddell
        } else if (fields.length === 1) {
            graph.node(fields[0]); // alice
        } else if (fields.length <= 3) {
            graph.edge(fields[0], fields[1], { weight: fields[2] }); // alice bob 2.5
        } else {
            throw new Error("expected an id, an id = label, or two ids and a weight");
        }
    },
});
registry.registerImporter(pairs);

const text = "# friends\nalice = Alice Liddell\nalice bob 2.5\nbob carol\nerin frank gus hal\n";
const { snapshot, report } = await importGraph(text, { filename: "friends.pairs" });
console.log(
    `${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges, label of alice: ${snapshot.nodes.byRole("label")?.value(0)}`,
);
console.log(report.issues.map((i) => `${i.code} (line ${i.line ?? "-"}): ${i.message}`));
```

<!-- generated:end -->

<!-- generated:begin output:extending/line-format -->

```text
3 nodes, 2 edges, label of alice: Alice Liddell
[
  'E_BAD_LINE (line 5): expected an id, an id = label, or two ids and a weight'
]
```

<!-- generated:end -->

The importer takes every option the built-in importers take (`ids`, `defaultDirected`,
`weightFrom` and the rest), reads strings, bytes and streams, and fills in the report's counts. A
`label` attribute is the label that `byRole("label")` finds, the attribute that `weightFrom` names
(`weight` by default) is the edge weight, and any other attribute's type is worked out from its
values. Pass `directed: true` for a format whose edges are directed, `comment` for a different
comment marker (or `null` for none), and `sniff` to recognize your files by their content
([Detection](#detection) explains how).

`parseLine` sees one line at a time. A format whose lines mean different things in different parts
of the file (a node section, then an edge section) needs the full importer that the rest of this
page builds, as does a format that is not line based.

## The smallest importer

An importer has a `format` name, the file `extensions` and `mimeTypes` it is for, and an `import()`
method. `import()` reads the input, adds nodes and edges to the `sink` it is given, and returns an
import report. graph-io creates the sink, a `GraphBuilder`, and turns it into a snapshot when
`import()` returns.

<!-- generated:begin example:extending/pairs-minimal -->

```ts
import {
    type GraphImporter,
    importGraph,
    ImportReportBuilder,
    INVALID_INDEX,
    LineReader,
    registry,
    resolveImportOptions,
} from "@graphty/graph-io";

const pairsImporter: GraphImporter = {
    format: "pairs",
    extensions: [".pairs"],
    mimeTypes: [],
    async import(input, sink, options) {
        // the common options with this format's defaults; errorLimit among them
        const opts = resolveImportOptions(options, { ids: "canonical", defaultDirected: false, weightFrom: null });
        const report = new ImportReportBuilder("pairs", opts.errorLimit);
        sink.setDirected(false); // this first version reads every file as undirected
        // add a node and count it if it is new; the count includes the nodes edge lines bring in
        const addNode = (id: string): void => {
            if (sink.indexOf(id) === INVALID_INDEX) {
                report.counts.nodes++;
            }
            sink.addNode(id);
        };
        const lines = new LineReader(input, report, opts);
        for await (const text of lines) {
            const ids = text.trim().split(/\s+/);
            if (ids.length === 1 && ids[0] !== "") {
                addNode(ids[0]); // a node line
            } else if (ids.length === 2) {
                addNode(ids[0]); // an edge line
                addNode(ids[1]);
                sink.addEdge(ids[0], ids[1]);
                report.counts.edges++;
            } else if (ids.length > 2) {
                report.error("parse-error", "E_PAIRS_BAD_LINE", "expected one or two node ids", { line: lines.line });
            }
        }
        return report.finish();
    },
};
registry.registerImporter(pairsImporter);

const { snapshot, report } = await importGraph("alice bob\nbob carol\ndave\nerin frank gus\n", {
    filename: "friends.pairs",
});
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges; the report counts ${report.counts.nodes} nodes`);
console.log(report.issues.map((i) => `${i.code} (line ${i.line ?? "-"}): ${i.message}`));
```

<!-- generated:end -->

<!-- generated:begin output:extending/pairs-minimal -->

```text
4 nodes, 2 edges; the report counts 4 nodes
[ 'E_PAIRS_BAD_LINE (line 4): expected one or two node ids' ]
```

<!-- generated:end -->

Three helpers do most of the work:

- `resolveImportOptions(options, defaults)` fills in every common option the caller left out, with
  your format's defaults for `ids`, `defaultDirected` and `weightFrom`.
- `LineReader` reads any input graph-io accepts (a string, bytes, a stream) one line at a time. It
  decodes bytes the way every built-in format does, reports progress, checks the `signal` option
  between chunks of input, and refuses empty or binary input with the usual codes.
- `ImportReportBuilder` collects issues. `report.error(category, code, message, location)` records
  an error, and throws the `ImportError` for you once there are more errors than `errorLimit`.
  `report.warning()` records a warning. The categories are the ones
  [the import report](../report.md#issues) lists. `report.counts` holds the counts, which you fill
  in, and `report.finish()` returns the finished report.

Count in `report.counts.nodes` every node the file adds, once, including a node that `addEdge()`
creates because an edge names it, as the built-in formats do (`defineLineFormat()` does this for
you). `sink.indexOf(id)` is `INVALID_INDEX` for an
id the sink does not have yet, which is how the example's `addNode()` tells a new node from one it
has seen. Do not compare it with `-1` or `null`.

This importer works, but it reads every file as undirected, reads no labels or weights, and cannot
be cancelled while it reads a string: `LineReader` checks the `signal` option only between chunks
of input, and a string arrives as one chunk. The complete plugin below handles all of that.

## The smallest exporter

An exporter has a `format`, a `capabilities` table that says what the file can hold, and three
methods: `check()` returns what a save would lose, and `export()` and `exportToString()` write the
file. This one writes the pairs format without labels, weights or a direction line:

<!-- generated:begin example:extending/pairs-minimal-export -->

```ts
import {
    capabilities,
    checkCapabilities,
    checkExport,
    type CommonExportOptions,
    DIRECTION_DROPPED_CODE,
    encodeChunks,
    exportGraphToString,
    type GraphExporter,
    type GraphSnapshot,
    importGraph,
    joinText,
    type LossNote,
    pairFolding,
    refusedSave,
    registry,
    resolveExportOptions,
} from "@graphty/graph-io";

// What the file can hold: no direction marker, no attributes, no weights. idCharset "any" refuses no id,
// so this first version writes an id with a space as it is (it reads back as an edge line); the
// complete plugin refuses such ids with a note of its own
const CAPABILITIES = capabilities({ multiEdges: true, selfLoops: true, edgeIds: "none", idCharset: "any" });

function check(snapshot: GraphSnapshot, options?: CommonExportOptions): LossNote[] {
    const notes = checkCapabilities(snapshot, CAPABILITIES, resolveExportOptions(options), {
        attributes: false,
        weights: false,
    });
    if (!snapshot.directed && snapshot.edgeCount > 0) {
        // the format cannot say "undirected"; this is the note the built-in formats give
        notes.push({
            code: DIRECTION_DROPPED_CODE,
            message: "the file has no direction marker; the edges read back as the reader's default direction",
            column: null,
            count: snapshot.edgeCount,
        });
    }
    return notes;
}

function* lines(snapshot: GraphSnapshot, options?: CommonExportOptions): Generator<string> {
    const refused = refusedSave(check(snapshot, options)); // throw for an E_ note, before writing anything
    if (refused !== null) {
        throw refused;
    }
    for (let i = 0; i < snapshot.nodeCount; i++) {
        yield `${String(snapshot.ids.idOf(i))}\n`;
    }
    const folding = pairFolding(snapshot); // an undirected edge of a mixed graph is stored twice: write it once
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (!folding.folded(e)) {
            yield `${String(snapshot.ids.idOf(snapshot.edgeSource(e)))} ${String(snapshot.ids.idOf(snapshot.edgeTarget(e)))}\n`;
        }
    }
}

const pairsExporter: GraphExporter = {
    format: "pairs",
    extensions: [".pairs"],
    mimeTypes: [],
    capabilities: CAPABILITIES,
    check,
    export: (snapshot, options) => encodeChunks(lines(snapshot, options)),
    exportToString: (snapshot, options) => joinText(lines(snapshot, options)),
};
registry.registerExporter(pairsExporter);

const { snapshot } = await importGraph("source,target,weight\na,b,2\nb,c,1\n", {
    format: "csv",
    defaultDirected: false,
});
console.log(checkExport(snapshot, "pairs").map((n) => n.code));
console.log(await exportGraphToString(snapshot, "pairs"));
```

<!-- generated:end -->

<!-- generated:begin output:extending/pairs-minimal-export -->

```text
[ 'W_WEIGHTS_DROPPED', 'W_DIRECTION_DROPPED' ]
a
b
c
a b
b c
```

<!-- generated:end -->

- `capabilities()` builds the table; anything you leave out is not supported.
- `checkCapabilities()` compares a graph with the table and returns the notes graph-io knows how to
  make: here `W_WEIGHTS_DROPPED`, because the graph has weights and `weights: false` says the file
  has no place for them.
- Your format's own notes come after them. This format has no direction marker, so an undirected
  graph gets the `W_DIRECTION_DROPPED` note the built-in formats give: `column` is `null` because
  the note is about the whole graph, and `count` is the number of edges it affects.
- `refusedSave()` turns the `E_` notes, if any, into the error the save throws, so `export()` refuses
  exactly what `check()` predicts.
- `pairFolding()` writes each undirected edge of a mixed graph once.
- `encodeChunks()` and `joinText()` turn the lines into the two outputs, so they never differ.

The rest of this page explains each piece, and the [complete plugin](#the-complete-plugin) puts
them together.

### The sink

The sink is a `GraphBuilder` from
[`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format), which graph-io
creates for each import and turns into a snapshot when `import()` returns. Its type is
`GraphSink`, which you can import from `@graphty/graph-io` for helper functions that take it. These
are the methods an importer calls:

<!-- generated:begin sink -->

- `addNode(id: NodeId): number`: Adds a node, or finds the node with this id. Returns its index.
- `addEdge(source: NodeId, target: NodeId, weight?: number | undefined): number`: Adds an edge between two node ids, in the direction set with `setDirected()`, and returns its index. A node the graph does not have yet is created, unless `addMissingNodes` is false. Call it directly when your format always has one direction; when a file's edges carry their own direction, or `defaultDirected` and `onMixedDirection` should apply, add edges through `DirectionResolver.addEdge()`, which calls this.
- `setEdgeWeight(edge: number, weight: number): void`: Sets the weight of an edge already added.
- `setDirected(directed: boolean, options?: SetDirectedOptions | undefined): void`: Sets whether the graph is directed. `DirectionResolver.setHeader()` calls it for you.
- `declareNodeColumn(decl: ColumnDecl): ColumnHandle`: Declares a node attribute, `{ name, dtype, role }` (for example `{ name: "label", dtype: "string", role: "label" }`), and returns its handle. Declaring the same attribute again returns the same handle.
- `declareEdgeColumn(decl: ColumnDecl): ColumnHandle`: Declares an edge attribute, the same way.
- `setNodeValue(column: string | ColumnHandle, index: number, value: unknown): void`: Sets a node's value of an attribute, by handle or by name.
- `setEdgeValue(column: string | ColumnHandle, edge: number, value: unknown): void`: Sets an edge's value of an attribute, by handle or by name.
- `setGraphValue(name: string, value: unknown, decl?: Loose<ColumnDecl> | undefined): void`: Sets an attribute of the whole graph.
- `setMeta(meta: Loose<GraphMeta>): void`: Sets the graph's `name`, `description` and other details, which `snapshot.meta` returns.
- `indexOf(id: NodeId): number`: The index of the node with this id, or `INVALID_INDEX` (4294967295).
- `reserve(nodes?: number | undefined, edges?: number | undefined): void`: Makes room for this many nodes and edges, for a file that states its size up front.

<!-- generated:end -->

## The complete plugin

The complete plugin reads and writes everything the pairs format holds. Its `import()` does, in
order:

1. `resolveImportOptions()` fills in the common options, and `separatorOf()` checks the format's
   own `separator` option.
2. `reportSinkOptions()` and `reportUnusedOptions()` warn about options that have no effect.
3. `IdCoercer` turns id text into ids, and `DirectionResolver` adds edges in the direction the
   first line declares.
4. `LineReader` hands over one line at a time. A node line adds a node and its label column; an
   edge line reads the weight with `parseWeightText()` and adds the edge.
5. Each line runs inside `try`, and `report.recordError()` turns a bad line into an error issue.
   `throwIfAborted()` stops a cancelled import.

The exporter's `check()` calls `checkCapabilities()` and adds the format's own notes, and its
`lines()` generator writes the file: `refusedSave()` first, then the direction line, each node
with its label, and each edge (once, through `pairFolding()`) with its weight from
`explicitWeights()`. The sections after the listing explain each helper.

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
                    const index = addNode(ids.text(node[1])); // the node's index, new or existing
                    if (node[2] !== undefined) {
                        // declaring the same column again returns the same column
                        const label = sink.declareNodeColumn({ name: "label", dtype: "string", role: "label" });
                        sink.setNodeValue(label, index, node[2]);
                    }
                } else if (fields.length === 2 || fields.length === 3) {
                    const weight = fields.length === 3 ? parseWeightText(fields[2]) : undefined;
                    const [source, target] = [ids.text(fields[0]), ids.text(fields[1])];
                    addNode(source);
                    addNode(target);
                    edges.addEdge(source, target, kind, weight, { line });
                    report.counts.edges++;
                } else {
                    // also a line written with another separator than the one passed ("a b 2" under ",")
                    report.error("parse-error", PAIRS_ISSUE.BAD_LINE, "expected a node id, or two ids and a weight", {
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
        const text = label === null ? undefined : snapshot.nodes.value(label.meta.name, i);
        if (/[\r\n]/.test(String(text ?? ""))) {
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
```

<!-- generated:end -->

### Options

`resolveImportOptions(options, defaults)` fills in every common option, with the defaults your
format chooses for `ids`, `defaultDirected` and `weightFrom`, and throws `E_UNSUPPORTED` for an
invalid value. `weightFrom` is the name of an attribute column to read as the weight, for formats
whose weights are named attributes (GraphML, CSV). Pairs has no named attributes: the weight is the
third field of an edge line, which the importer reads itself, so its default is `null`. Two calls
report the common options that have no effect:

- `reportSinkOptions()` warns when the caller asks for something the sink cannot do, such as a
  different `duplicateEdges` policy on a builder created with another one.
- `reportUnusedOptions()` warns `W_OPTION_IGNORED` for each common option the caller set that your
  importer does not read. List the ones you read in its last argument.

Your format's own options arrive in the same object. Declare them as the built-in formats do: an
import options type that extends `CommonImportOptions` (`PairsImportOptions`) and an export options
type that extends `CommonExportOptions` (`PairsExportOptions`), passed as the type parameters
`GraphImporter<PairsImportOptions>` and `GraphExporter<PairsExportOptions>`. Your users can then
give an options object that type and have its names checked by the compiler, as the usage example
below does. List the names in the importer's and the exporter's `options` too, so a misspelled
option is reported as `W_UNKNOWN_OPTION`, as it is for the built-in formats.

Check each value yourself and throw `GraphFormatError("E_UNSUPPORTED", ...)` with
`details.option` for one you cannot use, as `separatorOf()` does; the built-in formats do the same.
Throw it from `check()` too: `check()` returns notes about the graph, and throws for options it
cannot use, as `checkExport()` does for the built-in formats.

### Ids, edges, direction and attributes

- `IdCoercer` turns id text into a node id under the `ids` option, so `"42"` becomes the number 42
  by default, exactly as in the built-in formats.
- `DirectionResolver` adds edges for you when direction is not fixed. (A format that always has
  one direction, like the smallest importer above, calls `sink.setDirected()` and
  `sink.addEdge()` itself.) Call `setHeader()` once, with the direction the file
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
  `setEdgeValue(column, edge, value)` do the same for edges, with the edge index that
  `DirectionResolver.addEdge()` returned. When that edge was undirected in a directed graph, it is
  stored as two edges, and `resolver.lastMirror` is the index of the second: set the value on both,
  or only one of them carries it. When the edge was stored once, `lastMirror` is `INVALID_INDEX`,
  so test `resolver.lastMirror !== INVALID_INDEX` before you use it. Give a column
  the role that says what it is (`"label"`, `"color"`, `"position"`) so other formats and
  `byRole()` find it.

For a text format whose values carry no type, `TextCellWriter` turns each cell's text into a
number, a boolean or text, choosing one type for the whole attribute the way CSV does: whole
numbers make an `i32` attribute, any decimal makes it `f64`, and one cell that is not a number turns
the whole attribute into text, the cells before it included (`2.5` then `x` gives the strings
`"2.5"` and `"x"`). The type matters to your exporter, since `checkCapabilities()` compares it with
the types the format keeps. Make one writer per attribute and call `write()` with the node or edge
index and the cell text:

<!-- generated:begin example:extending/text-cells -->

```ts
import { GraphBuilder, ImportReportBuilder, TextCellWriter } from "@graphty/graph-io";

// In an importer, `sink` and `report` are the ones import() works with
const sink = new GraphBuilder({ directed: false });
const report = new ImportReportBuilder("pairs", 100);

// one writer per attribute; it chooses the attribute's type from all of its cells
const size = new TextCellWriter("size", "node", sink, report);
size.write(sink.addNode("a"), "2");
size.write(sink.addNode("b"), "2.5");
sink.addNode("c"); // an empty cell: write nothing, and the node has no value

const snapshot = sink.freeze();
console.log(
    snapshot.nodes.get("size")?.meta.dtype,
    [0, 1, 2].map((i) => snapshot.nodes.value("size", i)),
);
```

<!-- generated:end -->

<!-- generated:begin output:extending/text-cells -->

```text
f64 [ 2, 2.5, undefined ]
```

<!-- generated:end -->

A format with no direction marker at all, such as a plain edge list, calls `setHeader()` with
`defaultDirected` and nothing else. Its exporter cannot record an undirected graph, so its
`check()` adds a `W_DIRECTION_DROPPED` note when the graph is undirected, as
[the smallest exporter](#the-smallest-exporter) does.

### Errors

Wrap the work for one element in `try` and pass anything it throws to `report.recordError()`.
A `GraphFormatError` about that element, such as an invalid weight or an id the `ids` option
refuses, becomes an error issue, and the element is skipped. Anything else is thrown again,
because it is a bug or an abort, not a problem with the file. Count what you skip in
`report.counts.skippedNodes` and `report.counts.skippedEdges`.

For a problem that makes the rest of the file unreadable, call `report.fail(code, message,
location)`. It records the issue and throws the `ImportError` at once.

### Cancelling

Call `throwIfAborted(signal)` every few dozen elements (the complete plugin does it every 64 lines)
and once more before `report.finish()`. A large string input arrives as one chunk, so the reader
alone cannot stop between its lines.

### Detection

`sniff(head)` receives up to the first 8 KiB of the input as bytes and returns a confidence from 0
to 1 that they are your format. Return 0 when you cannot tell. graph-io combines your value with
the file name and the MIME type, by one rule: a confidence of 0.5 or more beats any file extension,
and a confidence below 0.5 is a guess that loses to another format's extension. So return 0.5 or
more only for content you are sure of. Between two formats that both recognize the content, the
higher confidence wins, and a matching extension adds a little.

Make `sniff()` tolerant. The 8 KiB can end in the middle of a line, and a real file can have a bad
line near the top, so judge most of the lines you see rather than every line, and ignore the last
one. A sniffer that returns 0 for one bad line hands the file to another format.

Formats with equal scores rank in the order they were registered. `rankFormats(hints, importers)`
computes the ranking over any list of importers; `registry.sniffAll()` calls it with the
registry's.

Content beats names: when a built-in format recognizes the content, it wins over your extension.
Without `sniff()`, your format is chosen by its extension or MIME type only when no other format
claims the content. That matters when your files look like another format. JSON claims any JSON
object or JSON Lines text with 0.9, and XML formats claim their root elements. CSV claims two or
more lines that split the same way, on commas, tabs or two or three words on spaces, with 0.3, a
guess that your extension beats; so a whitespace-separated format such as TGF needs no `sniff()`
to keep its own files, but does need one above 0.3 to be found by content alone. A `.gjsonl` file
of JSON Lines without a `sniff()` is read by the JSON importer, which refuses it. Either give your
importer a `sniff()` that returns more than the format that would take your files (above 0.9 for
JSON-shaped files), or tell your users to pass `format`. `registry.sniffAll({ head, filename })`
shows the confidence of every format for a sample of your files.

Register the plugin before you test it on your files. Until then graph-io does not know your
extension, and a file of words or ids can load as a small CSV graph with errors, which looks like a
bug in your importer.

### Files that hold several graphs

If one file of your format can hold several graphs, give the importer two more methods:

- `importAll(input, sinkFor, options)` reads every graph. It asks `sinkFor(index)` for a fresh sink
  before each graph and returns one report per graph. `importAllGraphs()` calls it.
- `listGraphs(input, options)` returns `{ index, name, nodes, edges }` per graph, without building
  them (`null` for a count you do not know). `listGraphs()` calls it.

`import()` then reads one graph: the one the caller's `graphIndex` or `graphName` chooses, else the
first. `chooseGraph(names, options, report)` makes that choice and fails with `E_GRAPH_NOT_FOUND`
or `E_AMBIGUOUS_GRAPH_NAME` for you. `graphIndex` and `graphName` are not among the options every
importer takes, so declare the importer as `GraphImporter<GraphChoiceOptions>` (or give your own
options type `extends GraphChoiceOptions`), and `options` has them. When the file holds more than
one graph and the caller did not choose one (`graphChosen(options)` is false), warn
`W_MULTIPLE_GRAPHS` (`MULTIPLE_GRAPHS_CODE`), so the caller learns that graphs were skipped. A
graph the caller chose gets no warning.

This "sections" format holds graphs one after another, each under an `== name` line. Save it as
`sections-format.ts`:

<!-- generated:begin example:extending/sections-format -->

```ts
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
```

<!-- generated:end -->

<!-- generated:begin example:extending/sections-usage -->

```ts
import { importAllGraphs, importGraph, listGraphs, registry } from "@graphty/graph-io";

import { sectionsImporter } from "./sections-format.js";

registry.registerImporter(sectionsImporter);

const file = "== first\na b\nb c\n== second\nx y\ny z\nz x\n";
const options = { filename: "two.sections" };

console.log(await listGraphs(file, options));

const second = await importGraph(file, { ...options, graphName: "second" });
console.log(`${second.snapshot.meta.name}: ${second.snapshot.edgeCount} edges`);

for (const { snapshot, report } of await importAllGraphs(file, options)) {
    console.log(`${snapshot.meta.name}: ${snapshot.edgeCount} edges, ${report.warningCount} warnings`);
}
```

<!-- generated:end -->

<!-- generated:begin output:extending/sections-usage -->

```text
[
  { index: 0, name: 'first', nodes: null, edges: 2 },
  { index: 1, name: 'second', nodes: null, edges: 3 }
]
second: 3 edges
first: 2 edges, 0 warnings
second: 3 edges, 0 warnings
```

<!-- generated:end -->

The file is decoded once, and the decoding warnings (for example, a guessed encoding) belong to every
graph: `report.fork()` starts each graph's report with them. `graphIndex` and `graphName` are never
reported as `W_OPTION_IGNORED`, so you do not list them in `reportUnusedOptions()`. Without
`listGraphs()`, `importGraph()` still honors `graphIndex` and `graphName`, by reading every graph
with `importAll()` and returning the chosen one.

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
- `pairFolding(snapshot).sourceDirected(e)` says whether edge `e` was directed. A format that writes
  a direction per edge (`mixedDirection: true` in its capabilities, like Mermaid's `-->` and `---`)
  writes edge `e` as directed when `snapshot.directed && folding.sourceDirected(e)` is true. A
  format that holds one direction per file reads `onMixedDirection` from `resolveExportOptions()`
  instead, as the pairs exporter does.
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
  `W_COLUMN_DROPPED` note. `nodeAttributes: false` or `edgeAttributes: false` says the same for
  one kind only, for a format that writes node attributes but not edge attributes, or the reverse.
- `weights: false` for a format that writes no edge weights; a weighted graph gets a
  `W_WEIGHTS_DROPPED` note.
- `roles`: the roles your format has a place for, such as `"label"`. They apply to node and edge
  columns alike: `"label"` covers a node label and an edge label. With `attributes: false`
  those columns are still written, and their type is still checked against `dtypes`, so list the
  types of the role columns you write (pairs lists `"string"` for its labels). A column with any
  other role is written as a plain attribute and noted `W_ROLE_DROPPED`.
- `roleNames`: the name your importer gives each role's column, so a label column called `Name`
  is noted as coming back as `label`.
- `writtenColumns`: columns you write by name although `attributes` is false, such as the column
  a format option of yours names (`{ edge: [options.edgeLabelColumn] }`). They get no
  `W_COLUMN_DROPPED` note.
- `idsReadBack`: how your importer turns id text back into ids (`"canonical"` here), so an id
  that comes back with another type is noted `W_ID_TEXT_TYPE`.

An option that names a column needs checking too. `snapshot.edges.get(name)` returns `null` (not
`undefined`) for a column the graph does not have, and `snapshot.edges.value(name, e)` throws
`E_UNKNOWN_COLUMN`. Test `get(name) === null` in `check()` and throw `E_UNSUPPORTED` with
`details.option`, so the caller learns which option is wrong before anything is written.

Add your format's own notes after them, like `E_PAIRS_BAD_ID`. `export()` must throw for every `E_`
note `check()` returns, and only for those, before it writes anything. `refusedSave(notes, codes)`
gives you the error to throw, with the same error codes the built-in formats use, so one `catch`
handles every format: `E_INVALID_ID` for an id note, `E_DIRECTED` for `E_MIXED_DIRECTION`,
`E_COLUMN_TYPE` for a value the format cannot write, and `E_UNSUPPORTED` otherwise. Its second
argument maps your own codes, as pairs maps `E_PAIRS_BAD_ID` to `E_INVALID_ID`. The error's
`details` holds the note: `details.code` (`"E_PAIRS_BAD_ID"`), `details.column` and
`details.count`.

When your format's ids follow one of the built-in id rules (`idCharset` `"nmtoken"`, `"integer"`
or `"dense-1-based"`), `sanitizeIds(snapshot, charset, mode)` gives the ids to write. Under
`"error"` it throws for an id the rule cannot hold; under `"mangle"` it renumbers those ids and tells
you, per node, whether the id changed (`isChanged(i)`) and what it was (`originalAt(i)`). Write the
original of each changed id into the file, and have your importer give it back when the
`restoreMangledIds` option is true (the default). That is what makes a round trip keep the ids, and
what the `W_ID_MANGLED` note promises. Edges in the file name nodes by their written ids, so the
importer keeps a map from the written id to the id it gave the node. This "numbers" format, whose
ids must be integers, does all of that. Save it as `numbers-format.ts`:

<!-- generated:begin example:extending/numbers-format -->

```ts
import {
    capabilities,
    checkCapabilities,
    type CommonExportOptions,
    encodeChunks,
    type GraphExporter,
    type GraphImporter,
    type GraphSnapshot,
    ImportReportBuilder,
    INVALID_INDEX,
    joinText,
    LineReader,
    pairFolding,
    refusedSave,
    reportUnusedOptions,
    resolveExportOptions,
    resolveImportOptions,
    sanitizeIds,
    throwIfAborted,
} from "@graphty/graph-io";

// The "numbers" format: node ids must be integers. With sanitizeIds: "mangle" the exporter numbers the other
// nodes and writes each original id after its number, as JSON, so the importer can give it back.
//
//   undirected
//   node 0 "alice"
//   node 1 "bob"
//   node 7
//   edge 0 1
//   edge 1 7

const NUMBERS_CAPABILITIES = capabilities({ idCharset: "integer", multiEdges: true, selfLoops: true });

/**
 * The lines of a numbers file.
 * @param snapshot - the graph to write
 * @param options - the export options
 * @yields one line at a time
 */
function* lines(snapshot: GraphSnapshot, options?: CommonExportOptions): Generator<string> {
    const refused = refusedSave(numbersExporter.check(snapshot, options));
    if (refused !== null) {
        throw refused;
    }
    const { sanitizeIds: idPolicy, onMixedDirection } = resolveExportOptions(options);
    // the id to write for each node; under "mangle", the ids that are not integers are renumbered
    const ids = sanitizeIds(snapshot, "integer", idPolicy);
    // the format holds one direction: a graph with both is written the way onMixedDirection says
    yield snapshot.directed && onMixedDirection !== "undirected" ? "directed\n" : "undirected\n";
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const original = ids.isChanged(i) ? ` ${JSON.stringify(ids.originalAt(i))}` : "";
        yield `node ${String(ids.idAt(i))}${original}\n`;
    }
    const folding = pairFolding(snapshot); // an undirected edge of a mixed graph is stored twice; write it once
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (folding.folded(e)) {
            continue;
        }
        yield `edge ${String(ids.idAt(snapshot.edgeSource(e)))} ${String(ids.idAt(snapshot.edgeTarget(e)))}\n`;
    }
}

export const numbersExporter: GraphExporter = {
    format: "numbers",
    extensions: [".numbers"],
    mimeTypes: [],
    capabilities: NUMBERS_CAPABILITIES,
    // the format writes no attributes and no weights
    check: (snapshot, options) =>
        checkCapabilities(snapshot, NUMBERS_CAPABILITIES, resolveExportOptions(options), {
            attributes: false,
            weights: false,
        }),
    export: (snapshot, options) => encodeChunks(lines(snapshot, options)),
    exportToString: (snapshot, options) => joinText(lines(snapshot, options)),
};

export const numbersImporter: GraphImporter = {
    format: "numbers",
    extensions: [".numbers"],
    mimeTypes: [],

    async import(input, sink, options) {
        const opts = resolveImportOptions(options, { ids: "number", defaultDirected: false, weightFrom: null });
        const report = new ImportReportBuilder("numbers", opts.errorLimit);
        reportUnusedOptions(options, report, new Set(["restoreMangledIds"]));
        const nodeOf = new Map<string, string | number>(); // the id written in the file -> the node's id
        const lines = new LineReader(input, report, opts);
        for await (const raw of lines) {
            const { line } = lines;
            if (line % 64 === 0) {
                throwIfAborted(opts.signal);
            }
            const text = raw.trim();
            // "node <number>", then the original id as JSON when there is one (it can hold spaces)
            const node = /^node (-?\d+)(?: (.+))?$/.exec(text);
            const edge = /^edge (-?\d+) (-?\d+)$/.exec(text);
            try {
                if (text === "directed" || text === "undirected") {
                    sink.setDirected(text === "directed");
                } else if (node !== null) {
                    const original = node[2] === undefined ? null : (JSON.parse(node[2]) as string | number);
                    // restoreMangledIds (on by default) gives the node its original id back
                    const id = original !== null && opts.restoreMangledIds ? original : Number(node[1]);
                    nodeOf.set(node[1], id);
                    if (sink.indexOf(id) === INVALID_INDEX) {
                        report.counts.nodes++; // a node listed twice is one node
                    }
                    const index = sink.addNode(id);
                    if (original !== null && !opts.restoreMangledIds) {
                        // keep the original where every format keeps it, so nothing is lost
                        const column = sink.declareNodeColumn({
                            name: "graphty.originalId",
                            dtype: "string",
                            role: "originalId",
                        });
                        sink.setNodeValue(column, index, String(original));
                    }
                } else if (edge !== null) {
                    // an edge names nodes by their written ids: look up the id each node was given
                    const source = nodeOf.get(edge[1]);
                    const target = nodeOf.get(edge[2]);
                    if (source === undefined || target === undefined) {
                        report.error("missing-value", "E_UNKNOWN_NODE", "the edge names a node no node line declares", {
                            line,
                        });
                        report.counts.skippedEdges++;
                    } else {
                        sink.addEdge(source, target);
                        report.counts.edges++;
                    }
                } else if (text !== "") {
                    report.error(
                        "parse-error",
                        "E_NUMBERS_BAD_LINE",
                        "expected a node line or an edge between two nodes",
                        {
                            line,
                        },
                    );
                }
            } catch (err) {
                report.recordError(err, { line }); // rethrows anything that is not a problem with this line
            }
        }
        throwIfAborted(opts.signal);
        return report.finish();
    },
};
```

<!-- generated:end -->

<!-- generated:begin example:extending/numbers-usage -->

```ts
import { checkExport, exportGraphToString, importGraph, registry } from "@graphty/graph-io";

import { numbersExporter, numbersImporter } from "./numbers-format.js";

registry.registerImporter(numbersImporter).registerExporter(numbersExporter);

const { snapshot } = await importGraph("graph { alice -- bob; bob -- 7 }", { format: "dot" });

// "alice" and "bob" are not integers: refused by default, renumbered under "mangle"
console.log(checkExport(snapshot, "numbers").map((n) => n.code));
const text = await exportGraphToString(snapshot, "numbers", { sanitizeIds: "mangle" });
console.log(text);

// reading the file back gives the original ids again
const back = await importGraph(text, { format: "numbers" });
console.log([0, 1, 2].map((i) => back.snapshot.ids.idOf(i)));
```

<!-- generated:end -->

<!-- generated:begin output:extending/numbers-usage -->

```text
[ 'E_ID_CHARSET' ]
undirected
node 0 "alice"
node 1 "bob"
node 7
edge 0 1
edge 1 7

[ 'alice', 'bob', 7 ]
```

<!-- generated:end -->

With `restoreMangledIds: false` the importer keeps the numbers as the ids and the originals in an
ordinary attribute, so nothing is lost either way.

A format whose ids follow none of the built-in rules has two choices:

- Use `idCharset: "any"` and refuse the ids it cannot write with a note of its own, as pairs does.
  Nothing is renamed, and a user with such ids must rename them or pick another format:
  `sanitizeIds: "mangle"` does nothing for it.
- Use a built-in rule that is stricter than the format needs, and `sanitizeIds()`. TGF ids cannot
  hold spaces, and `"nmtoken"` refuses spaces (and some other characters TGF would accept), so a
  TGF plugin with `"nmtoken"` offers `sanitizeIds: "mangle"`. Some ids are then rewritten that TGF
  could have held. `W_ID_MANGLED` promises that the originals read back, so the file must store
  them and the importer restore them; when the format has no place for them, take the first
  choice.

## Registering the plugin

<!-- generated:begin example:extending/pairs-usage -->

```ts
import { checkExport, exportGraphToString, importGraph, listFormats, registry } from "@graphty/graph-io";

import { type PairsExportOptions, pairsExporter, pairsImporter } from "./pairs-format.js";

registry.registerImporter(pairsImporter).registerExporter(pairsExporter);

// The new format now works everywhere a built-in one does
const info = listFormats().find((f) => f.format === "pairs");
console.log(`${info?.format} ${info?.extensions.join(" ")}: read ${info?.canImport}, write ${info?.canExport}`);

const text = "# undirected\nalice = Alice Liddell\nalice bob 2.5\nbob carol\ncarol dave x\n";
const { snapshot, format, report } = await importGraph(text);
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(report.issues.map((i) => `${i.code} line ${i.line}`));

// The plugin's own options go in the same object; the options type checks their names
const csvStyle: PairsExportOptions = { separator: "," };
const written = await exportGraphToString(snapshot, "pairs", csvStyle);
console.log(written);

// The file does not record its separator, so read it back with the same option
const back = await importGraph(written, { format: "pairs", ...csvStyle });
console.log(`read back: ${back.snapshot.nodeCount} nodes, ${back.snapshot.edgeCount} edges`);

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

read back: 3 nodes, 2 edges
[ 'W_COLUMN_DROPPED: node column "color" is not written' ]
```

<!-- generated:end -->

The pairs file does not record its separator, so a file saved with `separator: ","` must be read
back with the same option; without it, `alice,bob,2.5` is one node id. Tell your users which
options a file needs to be read back, or record them in the file.

`registry` is the registry behind every top-level function. `registerImporter()` and
`registerExporter()` add a format, or replace the format of the same name. Register once, when
your application starts, before the first load.

To keep a format away from the rest of your application, make a registry of your own:
`createRegistry()` returns a new registry with every built-in format, and `new FormatRegistry()` an
empty one. A registry has the same methods as the top-level functions: `importGraph()`,
`loadFromUrl()`, `loadFromFile()`, `exportGraphToBytes()`, `checkExport()`, `listFormats()` and the
rest, `downloadGraph()` included.

## Helpers by task

Every helper is exported from `@graphty/graph-io`; the
[API reference](https://graphty.app/docs/graph-io/api/generated/) has each signature.

| To do this                                                  | Use                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read text line by line                                      | `LineReader`                                                                                                                                                                                                                                                                                                                                        |
| Make a line-based importer from one function                | `defineLineFormat()`                                                                                                                                                                                                                                                                                                                                |
| Read the whole input as one string                          | `readText(input, report, options)`. Its options (`ReadOptions`) also take `declaredEncoding` (a function that reads the encoding a file declares from its first `declarationBytes` bytes, 1024 by default), `allowEmpty`, `xml` (an XML format), `nulIsBinary` and `bomlessUtf16` (UTF-16 without a byte order mark)                                |
| Read an XML format                                          | `tokenizeXml(textChunks(input, report, options), handler)`, with an `XmlHandler` of `start(name, attributes, line)`, `end(name, line)` and `text(text, line)` callbacks, called as the document streams in; it throws `XmlSyntaxError`, with the line, for malformed XML. Pass `xml: true` in the options so the XML declaration's encoding is read |
| Read a binary format                                        | `collectBytes()` gathers the input's bytes when it is a stream; check the first bytes in `sniff()` (a zip file starts with `PK`), and report a damaged file with `report.fail()`                                                                                                                                                                    |
| Turn a string `head` into the bytes `sniff()` sees          | `headBytes()`                                                                                                                                                                                                                                                                                                                                       |
| Fill in and check the common options                        | `resolveImportOptions()`, `reportSinkOptions()`, `reportUnusedOptions()`                                                                                                                                                                                                                                                                            |
| Turn id text into ids under the `ids` option                | `IdCoercer` (reports merged ids); `coerceIdText()` and `coerceId()` for one value                                                                                                                                                                                                                                                                   |
| Add edges whose direction can vary                          | `DirectionResolver`                                                                                                                                                                                                                                                                                                                                 |
| Read a weight                                               | `parseWeightText()`                                                                                                                                                                                                                                                                                                                                 |
| Type untyped text cells                                     | `TextCellWriter` per column; `inferTextDtype()` and `parseTextCell()` for one cell                                                                                                                                                                                                                                                                  |
| Declare a typed attribute the file names                    | `declareResolved(sink, domain, decl, report)` declares a column of the type the file gives it, and when that name is taken by a column of another type, declares `<name>#<the attribute's id in the file>` (or `<name>#2`) instead and reports the rename; `declareCompanion()` declares the column that keeps the original text of a date column   |
| Choose one graph of several                                 | `chooseGraph()`                                                                                                                                                                                                                                                                                                                                     |
| Hand part of the work to another importer                   | `report.include(otherReport)`; see [Extending an existing format](./existing-format.md)                                                                                                                                                                                                                                                             |
| Stop a cancelled import                                     | `throwIfAborted()`; `isAbortError()` to let a cancellation through a `catch`                                                                                                                                                                                                                                                                        |
| Describe what a file can hold, and check a graph against it | `capabilities()`, `checkCapabilities()`, `refusedSave()`                                                                                                                                                                                                                                                                                            |
| Write ids a format restricts                                | `sanitizeIds()`                                                                                                                                                                                                                                                                                                                                     |
| Write each edge once, with its direction                    | `pairFolding()` (`foldMutual: true` writes a GEXF mutual edge once, as undirected)                                                                                                                                                                                                                                                                  |
| Write nesting                                               | `childrenCsr(snapshot)` gives each node's children from the parent column                                                                                                                                                                                                                                                                           |
| Write weights and numbers                                   | `explicitWeights()`, `formatF32()`, `formatF64()`, `formatDecimal()`                                                                                                                                                                                                                                                                                |
| Produce the output                                          | `encodeChunks()`, `joinText()`, `collectBytes()` (the chunks as one `Uint8Array`), `toReadableStream()`                                                                                                                                                                                                                                             |
| Compare a MIME type with your list                          | `normalizeMimeType()` lowercases it and drops parameters such as `; charset=utf-8`                                                                                                                                                                                                                                                                  |
| Test a plugin                                               | `compareSnapshots()`, `describeDiffs()`                                                                                                                                                                                                                                                                                                             |

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

## The importer never calls freeze()

Add nodes and edges to the sink and return the report; never call `freeze()`. That lets a caller
read several files into one builder.

## Messages are for people

An issue message is shown to people: say what was wrong in one sentence, and leave the line number
to the issue's `line` field.

## Testing a plugin

Read each of your sample files, save it in your format, read the saved file back, and compare the
two graphs with `compareSnapshots()`. Every difference it finds should match a note that
`checkExport()` returned for the save; a difference without a note is a bug in `check()` or in the
importer.

<!-- generated:begin example:extending/test-plugin -->

```ts
import { readFile } from "node:fs/promises";

import {
    checkExport,
    compareSnapshots,
    describeDiffs,
    exportGraphToString,
    importGraph,
    registry,
} from "@graphty/graph-io";

import { pairsExporter, pairsImporter } from "./pairs-format.js";

registry.registerImporter(pairsImporter).registerExporter(pairsExporter);

// Read a sample, save it as pairs, read the saved file back, and compare the two graphs
for (const file of ["teams.gv", "proteins.xgmml"]) {
    const { snapshot } = await importGraph(await readFile(file), { filename: file });
    const notes = checkExport(snapshot, "pairs");
    const saved = await exportGraphToString(snapshot, "pairs");
    const back = await importGraph(saved, { format: "pairs" });
    console.log(`${file}: notes ${[...new Set(notes.map((n) => n.code))].join(", ") || "none"}`);
    console.log(describeDiffs(compareSnapshots(snapshot, back.snapshot, { limit: 3 })));
}
```

<!-- generated:end -->

<!-- generated:begin output:extending/test-plugin -->

```text
teams.gv: notes W_COLUMN_DROPPED, W_GRAPH_ATTRIBUTES_DROPPED
  - nodes.graphty.cluster: column missing after round trip
  - nodes.style: column missing after round trip
  - nodes.color: column missing after round trip
proteins.xgmml: notes W_EDGE_IDS_DROPPED, W_ID_TEXT_TYPE, W_COLUMN_DROPPED, W_GRAPH_ATTRIBUTES_DROPPED
  - ids[0]: expected "1", got 1
  - ids[1]: expected "2", got 2
  - ids[2]: expected "3", got 3
```

<!-- generated:end -->

Each difference has a `path` (`"ids[0]"`, `"nodes.color"`, `"edges.weight[3]"`), the `expected`
and `actual` values, and a `message`. `compareSnapshots()` stops after 50 differences; pass
`{ limit }` to change that.
