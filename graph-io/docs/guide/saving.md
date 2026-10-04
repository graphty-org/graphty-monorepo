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
- A code starting with `E_` means the format cannot hold the graph with these options. The export
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
E_ID_CHARSET: 2 node id(s) outside the nmtoken charset; export() will throw unless sanitizeIds is "mangle"
W_COLUMN_NAME_CHANGED: node column "Label" (label) is written into the format's label slot and reads back as "label"
[ 'W_ID_MANGLED', 'W_COLUMN_NAME_CHANGED' ]
```

<!-- generated:end -->

Pass the same options object to `checkExport()` and to the export function. The notes depend on
the options: with `sanitizeIds: "mangle"` the `E_ID_CHARSET` note becomes `W_ID_MANGLED`, because
the ids are now rewritten instead of refused.

The meaning of every code is listed on [Issue and loss codes](./codes.md), and each format page
lists the codes that format can return.

## Ids the format cannot hold

Some formats restrict node ids: GraphML ids cannot contain spaces, GML, CX and CX2 ids are
integers, and Pajek numbers its nodes 1 to N. By default (`sanitizeIds: "error"`) an export never
renames a node; it throws, and `checkExport()` returns `E_ID_CHARSET`.

With `sanitizeIds: "mangle"` the exporter rewrites the ids the format cannot hold and stores each
original id in the file. When graph-io reads that file back, it puts the original ids back
(`restoreMangledIds`, on by default), so a round trip through the format keeps your ids. Other
programs see the rewritten ids.

The [Pajek page](./formats/pajek.md) has a complete round trip.

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
[format page](./formats/index.md) lists its options. An option the chosen format does not have is
ignored, so one options object can serve several formats.

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

const { snapshot } = await loadFromUrl("https://example.com/data/karate.gml");

const body = new FormData();
body.append("file", await exportGraphToBlob(snapshot, "graphml"), "karate.graphml");
await fetch("https://example.com/api/graphs", { method: "POST", body });
```

<!-- generated:end -->

`downloadGraph()` has the browser save the file, as if the user clicked a download link. Its
`filename` option names the file; without it the file is called `graph` plus the format's first
extension, such as `graph.graphml`. Call it from a click handler. Awaiting other work before the
call is fine. The promise resolves when the browser has the file; there is no way to learn whether
the user then cancelled the save. Outside a browser it throws `E_UNSUPPORTED` instead of doing
nothing. The [Quick start](./quick-start.md#download-it-from-the-browser) has an example.

## Binary formats

A Cytoscape session (`.cys`) is a zip file, not text. Write it with `exportGraphToBytes()`,
`exportGraphToBlob()`, `downloadGraph()` or `exportGraph()`. `exportGraphToString()` rejects with
`E_UNSUPPORTED` for it.
