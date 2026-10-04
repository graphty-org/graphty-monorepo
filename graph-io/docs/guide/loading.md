# Loading graphs

graph-io has three functions that read a graph. They take the same options and return the same
result:

| Function                      | Reads                                                                     |
| ----------------------------- | ------------------------------------------------------------------------- |
| `loadFromUrl(url, options)`   | a file at a URL, downloaded with `fetch()`                                |
| `loadFromFile(file, options)` | a `File` or `Blob`: a file the user picked or dropped, or a Blob you made |
| `importGraph(input, options)` | a string, bytes, or a stream you already have                             |

Each returns a promise of `{ snapshot, format, report }`: the graph, the format it was read as, and
the [import report](./report.md). The result also has `sniff` and `freeze`, which say how the
format was detected and how the graph was built; most programs ignore them.

## What you can pass in

<!-- generated:begin example:loading/inputs -->

```ts
import { createReadStream, openAsBlob } from "node:fs";
import { readFile } from "node:fs/promises";

import { importGraph, loadFromFile } from "@graphty/graph-io";

// A string
const fromText = await importGraph("graph G { a -- b; b -- c }");
console.log(`text: ${fromText.format}, ${fromText.snapshot.edgeCount} edges`);

// Bytes: a Uint8Array or a Node Buffer
const fromBytes = await importGraph(await readFile("karate.gml"), { filename: "karate.gml" });
console.log(`bytes: ${fromBytes.format}, ${fromBytes.snapshot.nodeCount} nodes`);

// A Node stream, or any async iterable of strings or bytes
const fromStream = await importGraph(createReadStream("dolphins.net"), { filename: "dolphins.net" });
console.log(`stream: ${fromStream.format}, ${fromStream.snapshot.nodeCount} nodes`);

// A Blob or File
const fromBlob = await loadFromFile(await openAsBlob("miserables.json"), { filename: "miserables.json" });
console.log(`blob: ${fromBlob.format}, ${fromBlob.snapshot.nodeCount} nodes`);
```

<!-- generated:end -->

<!-- generated:begin output:loading/inputs -->

```text
text: dot, 2 edges
bytes: gml, 34 nodes
stream: pajek, 62 nodes
blob: json, 77 nodes
```

<!-- generated:end -->

`importGraph()` accepts:

- a string: the whole file as text
- a `Uint8Array`, which includes a Node `Buffer`: the file's bytes
- a `ReadableStream<Uint8Array>`, such as a `fetch()` response body or `file.stream()`
- an async iterable of strings or byte chunks, such as a Node `fs.createReadStream()`

Anything else is refused with a message that says what to pass instead. For an `ArrayBuffer`, wrap
it as `new Uint8Array(buffer)`. For a `Blob` or a `File`, call `loadFromFile()`. For a `fetch()`
`Response`, call `loadFromUrl()` instead of `fetch()`, or pass `response.body`.

Streams are read as they arrive, and most formats are parsed as they stream in. JSON, DOT and GML
documents are decoded whole before they are parsed, so a file in one of those formats is held in
memory as one string while it is read.

`fs.openAsBlob()` needs Node 20 or later. In Node 18, read the file with `readFile()` and pass the
bytes to `importGraph()`.

## Downloading with headers or credentials

`loadFromUrl()` passes its `request` option to `fetch()` as the second argument, so headers,
credentials and the request mode go there. The `signal` option cancels the download as well as the
reading.

<!-- generated:begin example:loading/url-request -->

```ts
import { loadFromUrl } from "@graphty/graph-io";

const { snapshot, format } = await loadFromUrl("https://example.com/api/graphs/42/export", {
    request: { headers: { Authorization: "Bearer my-token" } }, // passed to fetch()
    format: "graphml", // the URL has no file extension, so say what the file is
    signal: AbortSignal.timeout(30_000), // also cancels the download
});
console.log(`${format}: ${snapshot.nodeCount} nodes`);
```

<!-- generated:end -->

A failed download throws an `ImportError` whose `err.issue.code` is `"E_FETCH"`. `err.details.status`
holds the HTTP status, or `null` when the request never got a response (a network failure or a
CORS refusal). A relative URL works in a browser, where it is resolved against the page. In Node,
pass an absolute URL.

## Choosing the format

You rarely need to name the format. graph-io looks at the file name (`filename`, or the URL's last
path segment, or a `File`'s name), the MIME type (`mimeType`, or the server's `Content-Type`, or a
Blob's `type`), and the first 8 KiB of the content. The content counts most, so a `.xml` file is
read as GraphML or GEXF by its root element, and a `.csv` file with a `neo4j-admin` header is read
as Neo4j CSV. [Format detection](./detection.md) explains the ranking.

Name the format when the input has no file name and its content could be several formats, or when
you want to be sure:

<!-- generated:begin example:loading/options -->

```ts
import { readFile } from "node:fs/promises";

import { importGraph } from "@graphty/graph-io";

const text = "from;to;weight\nA;B;2.5\nB;C;1\n";

const { snapshot, report } = await importGraph(text, {
    format: "csv", // skip detection
    delimiter: ";", // a CSV option, passed through to the CSV importer
    defaultDirected: false, // the file does not say, so choose
});
console.log(`${snapshot.directed ? "directed" : "undirected"}, ${snapshot.edgeCount} edges`);
console.log(`ids: ${[0, 1, 2].map((i) => snapshot.ids.idOf(i)).join(", ")}`);
console.log(`warnings: ${report.warningCount}`);

// ids: "string" keeps every id as text, so "1" stays "1" instead of becoming the number 1
const pajek = await importGraph(await readFile("karate.net"), { filename: "karate.net", ids: "string" });
console.log(`first id: ${JSON.stringify(pajek.snapshot.ids.idOf(0))}`);
```

<!-- generated:end -->

<!-- generated:begin output:loading/options -->

```text
undirected, 2 edges
ids: A, B, C
warnings: 0
first id: "1"
```

<!-- generated:end -->

The format names are `json`, `graphml`, `gexf`, `csv`, `gml`, `dot`, `pajek`, `neo4j`, `xgmml`,
`cx2`, `cx`, `obo` and `cys`. A name graph-io does not know throws a `GraphFormatError` with code
`E_UNSUPPORTED`. `listFormats()` returns every name, including formats you
[registered yourself](./extending/new-format.md).

## Options

Every function takes one options object, and every option goes where it belongs:

- The [options every importer takes](./options.md#every-importer): how ids are read
  (`ids`), which attribute is the edge weight (`weightFrom`), the direction of a file that does not
  say (`defaultDirected`), the error limit, cancelling, progress and the text encoding.
- The [options of the load functions](./options.md#importgraph-and-importallgraphs) themselves:
  `format`, `filename`, `mimeType`, `graphIndex`, `graphName` and `maxEmptyCells`.
- The format's own options, such as `delimiter` for CSV or `dialect` for JSON. Each
  [format page](./formats/index.md) lists them. They go in the same object and reach the
  format's importer unchanged.

You can pass a format's options without knowing the format in advance: an option only matters
when the file turns out to be in that format. A common option that the chosen format has no use
for is reported in the import report as `W_OPTION_IGNORED`, so a typo or a wrong assumption does
not pass silently.

## Text encodings

Bytes are decoded the same way for every format. graph-io uses, in this order:

1. a byte order mark at the start of the file (UTF-8, UTF-16LE or UTF-16BE)
2. the `encoding` option, if you pass one
3. the encoding the file declares: the XML declaration of GraphML, GEXF and XGMML, or DOT's
   `charset` attribute
4. UTF-8

Bytes that are not valid UTF-8, in a file that declares no encoding, are read as windows-1252 (what
Excel and many older tools write), with the warning `W_ENCODING_FALLBACK`. A file that mixes valid
UTF-8 with invalid bytes, or that looks like binary data, fails with `E_INVALID_UTF8` instead of
being read with replacement characters. When two of the sources above disagree, the warning
`W_ENCODING_CONFLICT` names the one that was used.

<!-- generated:begin example:loading/encoding -->

```ts
import { importGraph } from "@graphty/graph-io";

// "source,target\nZoe,Chloe" with accented e's (U+00EB, U+00E9), saved by a spreadsheet as windows-1252
const bytes = new Uint8Array([
    ...new TextEncoder().encode("source,target\nZo"),
    0xeb,
    0x2c,
    0x43,
    0x68,
    0x6c,
    0x6f,
    0xe9,
]);

// Without the encoding option, graph-io reads bytes that are not UTF-8 as windows-1252 and says so
const guessed = await importGraph(bytes, { format: "csv" });
console.log(guessed.report.issues.map((i) => i.code));

// Name the encoding to read the file without a warning
const named = await importGraph(bytes, { format: "csv", encoding: "windows-1252" });
console.log(named.report.issues.length, named.snapshot.ids.has("Zo\u00eb"), named.snapshot.ids.has("Chlo\u00e9"));
```

<!-- generated:end -->

<!-- generated:begin output:loading/encoding -->

```text
[ 'W_ENCODING_FALLBACK' ]
0 true true
```

<!-- generated:end -->

A string input is already text, so `encoding` has no effect on it.

## Files that hold several graphs

Some formats can hold more than one graph in a file: a DOT file with several `graph { }` blocks, a
Pajek `.paj` project, a GML file with several `graph [ ]` blocks, a JSON Graph Format or OBO Graphs
document with a `graphs` array, a CX collection, an XGMML session file, and a Cytoscape session.

- `importGraph()` reads the first graph and adds the warning `W_MULTIPLE_GRAPHS`, which says how
  many it skipped.
- `listGraphs(input, options)` lists the graphs without reading them: each entry has an `index`, a
  `name`, and node and edge counts when the file states them. It returns `null` for a format that
  cannot list its graphs.
- `graphIndex` (0-based) or `graphName` chooses which graph `importGraph()` and the load functions
  read.
- `importAllGraphs(input, options)` reads every graph and returns one result per graph.

<!-- generated:begin example:loading/several-graphs -->

```ts
import { readFile } from "node:fs/promises";

import { importAllGraphs, importGraph, listGraphs } from "@graphty/graph-io";

// A Cytoscape session holds several networks: list them, then read one by name
const session = await readFile("authored-3x.cys");
const graphs = await listGraphs(session, { filename: "authored-3x.cys" });
for (const g of graphs ?? []) {
    console.log(`#${g.index} ${g.name}: ${g.nodes ?? "?"} nodes, ${g.edges ?? "?"} edges`);
}
const alpha = await importGraph(session, { filename: "authored-3x.cys", graphName: "Alpha" });
console.log(`Alpha: ${alpha.snapshot.nodeCount} nodes`);

// Or read every graph of a file at once
const dot = "digraph first { a -> b }\ndigraph second { x -> y; y -> z }";
for (const { snapshot } of await importAllGraphs(dot, { format: "dot" })) {
    console.log(`${snapshot.meta.name}: ${snapshot.edgeCount} edges`);
}
```

<!-- generated:end -->

<!-- generated:begin output:loading/several-graphs -->

```text
#0 Beta: 3 nodes, 2 edges
#1 Alpha: 4 nodes, 2 edges
Alpha: 4 nodes
first: 1 edges
second: 2 edges
```

<!-- generated:end -->

The [All formats](./formats/index.md) table shows which formats can hold several graphs.

## Cancelling and progress

Pass an `AbortSignal` as `signal` to stop a load. The import stops within a few dozen elements and
the promise rejects with the signal's reason: a `DOMException` named `"AbortError"`, or
`"TimeoutError"` for `AbortSignal.timeout()`. Catch it separately from `GraphFormatError`.

`onProgress(bytesDone, bytesTotal)` is called as the input is read. `bytesTotal` is known for a
string or a `Uint8Array` and `undefined` for a stream; when it is known, the last call has
`bytesDone === bytesTotal`.

<!-- generated:begin example:loading/cancel -->

```ts
import { readFile } from "node:fs/promises";

import { importGraph } from "@graphty/graph-io";

const bytes = await readFile("airlines-sample.gexf");

const { snapshot } = await importGraph(bytes, {
    filename: "airlines-sample.gexf",
    signal: AbortSignal.timeout(10_000), // give up after 10 seconds
    onProgress: (done, total) => {
        if (done === total) {
            console.log(`read ${done} bytes`);
        }
    },
});
console.log(`${snapshot.nodeCount} nodes`);

// Cancel a load yourself
const controller = new AbortController();
const loading = importGraph(bytes, { filename: "airlines-sample.gexf", signal: controller.signal });
controller.abort();
try {
    await loading;
} catch (err) {
    console.log(`stopped: ${(err as Error).name}`);
}
```

<!-- generated:end -->

<!-- generated:begin output:loading/cancel -->

```text
read 124686 bytes
235 nodes
stopped: AbortError
```

<!-- generated:end -->

## Loading into your own graph builder

The load functions create a graph builder, read the file into it, and return the finished
snapshot. To combine several files into one graph, or to set builder options yourself, create the
[`GraphBuilder`](https://www.npmjs.com/package/@graphty/graph-format) and call a format's importer
directly. Add `@graphty/graph-format` to your own dependencies for this:

```bash
npm install @graphty/graph-io @graphty/graph-format
```

<!-- generated:begin example:loading/own-builder -->

```ts
import { readFile } from "node:fs/promises";

import { GraphBuilder } from "@graphty/graph-format";
import { csvImporter } from "@graphty/graph-io/csv";

// The importer sets the direction from the file; weightDtype "f32" halves the memory weights take
const builder = new GraphBuilder({ directed: true, weightDtype: "f32" });

// Two files into one graph: the node table with the labels, then the edge table
const nodes = await csvImporter.import(await readFile("got-nodes.csv"), builder, { table: "nodes" });
const edges = await csvImporter.import(await readFile("got-edges.csv"), builder);

const snapshot = builder.freeze();
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(`warnings: ${nodes.warningCount + edges.warningCount}`);
console.log(`node columns: ${snapshot.nodes.names().join(", ")}`);
```

<!-- generated:end -->

<!-- generated:begin output:loading/own-builder -->

```text
107 nodes, 352 edges
warnings: 0
node columns: Label
```

<!-- generated:end -->

Every format has its own entry point, `@graphty/graph-io/<format>`, which exports its importer
(`csvImporter`), its exporter (`csvExporter`), its option types and its code tables. Importing a
format this way keeps the other formats' code out of your bundle. The `@graphty/graph-io` entry
point includes every format, because format detection needs them all.

An importer called directly takes the same options as `importGraph()`, minus the ones that belong
to the load functions (`format`, `filename`, `mimeType`, `builder`, `freeze`, `maxEmptyCells`). It
returns the import report, and you call `builder.freeze()` when you are done adding to the builder.
