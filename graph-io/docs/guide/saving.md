# Saving graphs

Every function that saves a graph takes the snapshot, a format name and an options object:

| Function                                         | Returns                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `exportGraphToBytes(snapshot, format, options)`  | `Promise<Uint8Array>`: the file, for `fs.writeFile()` or a request body |
| `exportGraphToString(snapshot, format, options)` | `Promise<string>`: the file as text                                     |
| `exportGraphToBlob(snapshot, format, options)`   | `Promise<Blob>`: the file with its MIME type, for uploads               |
| `downloadGraph(snapshot, format, options)`       | `Promise<void>`: the browser saves the file                             |
| `exportGraph(snapshot, format, options)`         | `AsyncIterable<Uint8Array>`: the file in chunks, for streaming          |
| `checkExport(snapshot, format, options)`         | `readonly LossNote[]`: what the file would not keep, without writing it |

All of them write the same bytes for the same arguments. Text formats are written as UTF-8.

## Check before you save

A format can rarely hold everything a graph can. Pajek has no edge ids, CSV holds one table per
file, GML node ids must be integers, and so on. `checkExport()` compares your graph with the format
and returns one note per difference, before anything is written. An empty list means the saved
file reads back as the same graph.

Each note has a `code`, a `message`, the attribute `column` it is about (or `null`), and a `count`
of the nodes, edges or values affected (or `null`).

- A code starting with `W_` is a warning: the file is written, and this part of it will not read
  back the same.
- A code starting with `E_` means the format cannot hold the graph with these options. The save
  functions throw a `GraphFormatError` instead of writing. Most `E_` notes go away with an option,
  and the message says which.

<!-- generated:begin example:saving/check -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-edges.csv"), {
    filename: "got-edges.csv",
    nodes: await readFile("got-nodes.csv"),
});

// Without options: two ids ("Jon Arryn", "Robert Arryn") contain a space, which a GraphML id cannot
for (const note of checkExport(snapshot, "graphml")) {
    console.log(`${note.code}: ${note.message}`);
}

// sanitizeIds: "mangle" rewrites those ids and keeps the originals in the file
const options = { sanitizeIds: "mangle" } as const;
const notes = checkExport(snapshot, "graphml", options);
console.log(notes.map((n) => n.code));
if (notes.some((n) => n.code.startsWith("E_"))) {
    throw new Error("still cannot write this graph as GraphML");
}
await writeFile("got.graphml", await exportGraphToBytes(snapshot, "graphml", options));
```

<!-- generated:end -->

<!-- generated:begin output:saving/check -->

```text
E_ID_CHARSET: 2 node id(s) outside the nmtoken charset; the save fails unless sanitizeIds is "mangle"
W_COLUMN_NAME_CHANGED: node column "Label" (label) is written into the format's label slot and reads back as "label"
[ 'W_ID_MANGLED', 'W_COLUMN_NAME_CHANGED' ]
```

<!-- generated:end -->

Pass the same options object to `checkExport()` and to the export function. The notes depend on
the options: with `sanitizeIds: "mangle"` the `E_ID_CHARSET` note becomes `W_ID_MANGLED`, because
the ids are now rewritten instead of refused.

The meaning of every code is listed on [Issue and loss codes](./codes.md), and each format page
lists the codes that format can return. A format's own `check()` method, such as
`csvExporter.check(snapshot, options)`, returns the same notes as
`checkExport(snapshot, "csv", options)`.

### What a refused save throws

The error a save throws names the kind of failure, not the note, so one `catch` handles every
format:

| `checkExport()` note                       | The save throws                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `E_ID_CHARSET`, `E_ID_TEXT_COLLISION`      | `E_INVALID_ID`                                                                                        |
| `E_MIXED_DIRECTION`                        | `E_DIRECTED`                                                                                          |
| `E_XML_ILLEGAL_CHAR` and other value notes | `E_COLUMN_TYPE` or `E_UNSUPPORTED`; the note's entry on [Issue and loss codes](./codes.md) says which |

An option value the format does not allow is not a note: `checkExport()` throws it as
`E_UNSUPPORTED`, the same as the save would, with the option's name in `err.details.option`.

<!-- generated:begin example:saving/options-error -->

```ts
import { readFile } from "node:fs/promises";

import { checkExport, GraphFormatError, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-network.graphml"), { filename: "got-network.graphml" });

// An option value the format does not allow throws, from checkExport() as from the save
try {
    checkExport(snapshot, "obo", { ontology: "game of thrones" });
} catch (err) {
    if (err instanceof GraphFormatError) {
        console.log(`${err.code} (${String(err.details.option)}): ${err.message}`);
    } else {
        throw err;
    }
}
```

<!-- generated:end -->

<!-- generated:begin output:saving/options-error -->

```text
E_UNSUPPORTED (ontology): option ontology: "game of thrones" is not an ontology id (letters, digits, _ . - /)
```

<!-- generated:end -->

## Ids the format cannot hold

Some formats restrict node ids: GraphML ids cannot contain spaces, GML, CX, CX2 and Cytoscape
session ids are integers, and OBO ids cannot contain spaces or `!`. By default
(`sanitizeIds: "error"`) a save never renames a node: `checkExport()` returns `E_ID_CHARSET` and the
save throws `E_INVALID_ID`.

With `sanitizeIds: "mangle"` the exporter rewrites the ids the format cannot hold and writes each
original id to the file too, in an attribute each format page names (`graphty:originalId` in
GraphML, `graphty_originalId` in GML, for example). When graph-io reads that file back, it puts the
original ids back (`restoreMangledIds`, on by default), so a round trip through the format keeps
your ids. Other programs see the rewritten ids.

Pajek is the exception: its nodes are always numbered 1 to N, so a Pajek save renumbers any other
ids whatever `sanitizeIds` says, and `checkExport()` returns the warning `W_ID_RENUMBERED`. The old
ids become the node labels where a node has no label. With `sanitizeIds: "mangle"` they are also
written in full, and an import puts them back. The [Pajek page](./formats/pajek.md) has a complete
round trip.

## Graphs with directed and undirected edges

A graph can mix directed and undirected edges, for example after reading a GraphML or GEXF file
that does. Most formats hold one direction per file. For those, the export throws by default, and
`checkExport()` returns `E_MIXED_DIRECTION`. The `onMixedDirection` option chooses what to write:

- `"directed"` writes a directed file. Each undirected edge is written once, as one directed edge
  from its first node to its second.
- `"undirected"` writes an undirected file, so the directed edges lose their direction.

<!-- generated:begin example:saving/mixed -->

```ts
import { checkExport, exportGraphToString, importGraph } from "@graphty/graph-io";

// A GraphML file with one directed and one undirected edge
const graphml = `<graphml><graph edgedefault="undirected">
  <node id="1"/><node id="2"/><node id="3"/>
  <edge source="1" target="2" directed="true"/>
  <edge source="2" target="3"/>
</graph></graphml>`;
const { snapshot } = await importGraph(graphml, { format: "graphml" });

// GML holds one direction per file
console.log(checkExport(snapshot, "gml").map((n) => n.code));
console.log(await exportGraphToString(snapshot, "gml", { onMixedDirection: "directed" }));
```

<!-- generated:end -->

<!-- generated:begin output:saving/mixed -->

```text
[ 'E_MIXED_DIRECTION' ]
graph [
  directed 1
  node [
    id 1
  ]
  node [
    id 2
  ]
  node [
    id 3
  ]
  edge [
    source 1
    target 2
  ]
  edge [
    source 2
    target 3
  ]
]
```

<!-- generated:end -->

GraphML, GEXF, CSV, Pajek, XGMML, Cytoscape sessions and some JSON dialects keep mixed direction,
so they need no option. The [All formats](./formats/index.md) table lists them under
`mixedDirection`.

## Format options

Each format has options of its own, such as `version` for GEXF, `table` for CSV or `dialect` for
JSON. They go in the same options object as `sanitizeIds` and `onMixedDirection`; the
[CSV example](./formats/csv.md#loading-and-saving) passes `table: "nodes"` this way. Each
[format page](./formats/index.md) lists its options.

An option the chosen format does not have is ignored without a warning, so one options object can
serve several formats. That also means a misspelled option is ignored. In TypeScript, check the
names with `satisfies` and the format's options type (`CsvExportOptions` from
`@graphty/graph-io/csv`, and so on), as [Loading graphs](./loading.md#options) shows for import
options.

## Large graphs: stream to a file

`exportGraph()` returns the file as an async iterable of byte chunks. Write the chunks as they come
and the whole file is never in memory at once.

<!-- generated:begin example:saving/stream -->

```ts
import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

import { exportGraph, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("airlines-sample.gexf"), { filename: "airlines-sample.gexf" });

// The file is written chunk by chunk; the whole document is never held in memory
await pipeline(exportGraph(snapshot, "graphml"), createWriteStream("airlines.graphml"));
```

<!-- generated:end -->

For a `ReadableStream` (a `Response` body, or a file opened with the File System Access API), wrap
the chunks with `toReadableStream(exportGraph(snapshot, format, options))`.

## Choosing the format from a file name

`listFormats()` describes every format: its name, its extensions with the leading dot, its MIME
types, and whether graph-io can read it (`canImport`) and write it (`canExport`). Together with
`extensionOf()` it picks the format for a path:

<!-- generated:begin example:saving/pick-format -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToBytes, extensionOf, importGraph, listFormats } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("karate.gml"), { filename: "karate.gml" });

for (const path of ["karate.gexf", "karate.dot", "karate.xyz"]) {
    const extension = extensionOf(path) ?? "";
    const target = listFormats().find((f) => f.canExport && f.extensions.includes(extension));
    if (target === undefined) {
        console.error(`${path}: no format writes ${extension} files`);
        continue;
    }
    await writeFile(path, await exportGraphToBytes(snapshot, target.format));
}
```

<!-- generated:end -->

<!-- generated:begin output:saving/pick-format -->

```text
karate.xyz: no format writes .xyz files
```

<!-- generated:end -->

Some extensions belong to more than one format: `.csv` is CSV and Neo4j CSV, and `.xml` is GraphML
and XGMML. `listFormats()` returns the formats in a fixed order (JSON, GraphML, GEXF, CSV, GML, DOT,
Pajek, Neo4j, XGMML, CX2, CX, OBO, Cytoscape session), so `find()` picks the more common one.

## Uploads and downloads

`exportGraphToBlob()` returns a `Blob` whose `type` is the format's MIME type, ready for a
`FormData` or a `fetch()` body:

<!-- generated:begin example:saving/upload -->

```ts
import { exportGraphToBlob, loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl("https://graphty.app/docs/graph-io/samples/got-network.graphml");

// your server's upload endpoint
const body = new FormData();
body.append("file", await exportGraphToBlob(snapshot, "gexf"), "got.gexf");
await fetch("https://example.com/api/graphs", { method: "POST", body });
```

<!-- generated:end -->

`downloadGraph()` has the browser save the file, as if the user clicked a download link. Its
`filename` option names the file; without it the file is called `graph` plus the format's first
extension, such as `graph.graphml`. Call it from a click handler. Awaiting other work before the
call is fine. The promise resolves when the browser has the file; there is no way to learn whether
the user then canceled the save. Outside a browser it throws `E_UNSUPPORTED` instead of doing
nothing. The [Quick start](./quick-start.md#download-it-from-the-browser) has an example.

`downloadGraph()` uses the formats of the `@graphty/graph-io` entry point. If you made your own
`FormatRegistry` to [keep your bundle small](./loading.md#keeping-your-bundle-small), build the file
with the registry's `exportGraphToBlob()` and start the download yourself:

<!-- generated:begin example:saving/download-own -->

```js
import { FormatRegistry } from "@graphty/graph-io";
import { csvExporter, csvImporter } from "@graphty/graph-io/csv";

const io = new FormatRegistry().registerImporter(csvImporter).registerExporter(csvExporter);
const { snapshot } = await io.loadFromUrl("https://graphty.app/docs/graph-io/samples/got-edges.csv");

// <button id="save">Save as CSV</button>
document.querySelector("#save").addEventListener("click", async () => {
    const blob = await io.exportGraphToBlob(snapshot, "csv");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "edges.csv";
    link.click();
    // let the browser start the download before the URL goes away
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
});
```

<!-- generated:end -->

## Binary formats

A Cytoscape session (`.cys`) is a zip file, not text. Write it with `exportGraphToBytes()`,
`exportGraphToBlob()`, `downloadGraph()` or `exportGraph()`. `exportGraphToString()` rejects with
`E_UNSUPPORTED` for it.
