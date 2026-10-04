# Quick start

This page loads a graph file, looks at what was read, and saves the graph in another format. The
examples load a [sample file](#sample-files) from this site, so you can run them as they are: the
Node examples in Node 20 or later, the browser examples in a page or a notebook.

## Install

```bash
npm install @graphty/graph-io
```

graph-io is an ES module. Import it with `import`, not `require`. The examples are TypeScript,
except the two browser ones, which are plain JavaScript.

## Load a graph from a URL

`loadFromUrl()` downloads a file and reads it. You do not name the format: graph-io works it out
from the file name, the server's `Content-Type` and the file's first bytes.

<!-- generated:begin example:quick-start/load-url -->

```ts
import { GraphFormatError, loadFromUrl } from "@graphty/graph-io";

try {
    const { snapshot, format, report } = await loadFromUrl(
        "https://graphty.app/docs/graph-io/samples/got-network.graphml",
    );
    console.log(`Read ${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
    for (const issue of report.issues) {
        console.warn(`${issue.severity} ${issue.code} (line ${issue.line ?? "-"}): ${issue.message}`);
    }
} catch (err) {
    if (err instanceof GraphFormatError) {
        console.error(`Could not load the graph: ${err.message}`);
    } else {
        throw err;
    }
}
```

<!-- generated:end -->

This prints:

<!-- generated:begin output:quick-start/load-url -->

```text
Read graphml: 107 nodes, 352 edges
```

<!-- generated:end -->

The result has three parts:

- `snapshot` is the graph. Its type comes from
  [`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format), which is installed
  with graph-io.
- `format` is the format the file was read as, such as `"graphml"`.
- `report` says what happened while reading. `report.issues` lists every element that was skipped
  or changed, with a code, a message and a line number. This file reads cleanly, so it prints none.

## Use the graph data

Nodes and edges are numbered from 0. `snapshot.ids.idOf(i)` gives node `i`'s id,
`snapshot.edgeSource(e)` and `snapshot.edgeTarget(e)` give the nodes at the ends of edge `e`, and
the attributes are columns you read by name. This turns the graph into the `{ nodes, links }`
arrays that d3, react-force-graph and similar libraries take:

<!-- generated:begin example:quick-start/use-data -->

```ts
import { loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl("https://graphty.app/docs/graph-io/samples/got-network.graphml");

// the attribute the file marks as each node's label (null when there is none)
const label = snapshot.nodes.byRole("label");
// edge weights, one per edge (null for an unweighted graph)
const weights = snapshot.edgeList().weights;

const nodes = Array.from({ length: snapshot.nodeCount }, (_, i) => ({
    id: snapshot.ids.idOf(i),
    label: label ? snapshot.nodes.value(label.meta.name, i) : undefined,
}));
const links = Array.from({ length: snapshot.edgeCount }, (_, e) => ({
    source: snapshot.ids.idOf(snapshot.edgeSource(e)),
    target: snapshot.ids.idOf(snapshot.edgeTarget(e)),
    weight: weights ? weights[e] : 1,
}));

console.log(nodes[0], links[0]);
```

<!-- generated:end -->

<!-- generated:begin output:quick-start/use-data -->

```text
{ id: 'Aemon', label: 'Aemon' } { source: 'Aemon', target: 'Grenn', weight: 5 }
```

<!-- generated:end -->

[Reading the graph](./reading.md) covers attributes, weights, degrees and the rest of the snapshot.

## Load a file the user picks

In a browser, `loadFromFile()` reads a `File` from an `<input type="file">` or a drop event. The
file name tells graph-io the likely format, and `listFormats()` gives you every extension graph-io
reads, for the input's `accept` attribute.

<!-- generated:begin example:quick-start/load-file -->

```js
import { GraphFormatError, listFormats, loadFromFile } from "@graphty/graph-io";

// <input type="file" id="graph-file">
const input = document.querySelector("#graph-file");
const extensions = listFormats()
    .filter((f) => f.canImport)
    .flatMap((f) => f.extensions);
input.accept = [...new Set(extensions)].join(",");

input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) {
        return;
    }
    try {
        const { snapshot, report } = await loadFromFile(file);
        console.log(`${file.name}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
        if (report.errorCount > 0) {
            console.warn(`${report.errorCount} elements could not be read and were skipped`);
        }
    } catch (err) {
        if (err instanceof GraphFormatError) {
            console.error(`Could not read ${file.name}: ${err.message}`);
        } else {
            throw err;
        }
    }
});
```

<!-- generated:end -->

In Node, the same function reads a file from disk. A Blob from `fs.openAsBlob(path)` has no file
name, so pass one: `loadFromFile(await openAsBlob(path), { filename: path })`. You can also pass
the file's bytes to `importGraph()`, as the next example does.

## Save it in another format

`exportGraphToBytes()` writes the graph in any format and returns the file's bytes. Before you
save, `checkExport()` tells you what the file will not keep. It returns a list of notes, and an
empty list means the saved file reads back as the same graph.

<!-- generated:begin example:quick-start/save-node -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-network.graphml"), { filename: "got-network.graphml" });

for (const note of checkExport(snapshot, "csv")) {
    console.warn(`${note.code}: ${note.message}`);
}
await writeFile("got-edges-out.csv", await exportGraphToBytes(snapshot, "csv"));
```

<!-- generated:end -->

This prints one note, then writes the file:

<!-- generated:begin output:quick-start/save-node -->

```text
W_CSV_NODE_TABLE: 1 node column(s) are written by a table: "nodes" export only
```

<!-- generated:end -->

A CSV file holds one table. By default graph-io writes the edge table, so the node labels are not
in it. The [CSV page](./formats/csv.md) shows how to write the node table too.

A note's code tells you how serious it is:

- A code starting with `W_` is a warning. The file is written, but this part of the graph does not
  read back the same.
- A code starting with `E_` means the format cannot hold the graph with these options, and the
  save throws instead of writing. The note's message says which option fixes it, when one does.

Pass the same options object to `checkExport()` and to the save, so the check describes the file
you actually write.

## Download it from the browser

`downloadGraph()` saves a graph as a file in the browser, as if the user clicked a download link.
This example offers the graph as GML. GML node ids must be integers and its attribute names cannot
contain spaces, so `checkExport()` returns `E_` notes until the example passes `"mangle"` for both.
The originals are written to the file, and graph-io reads them back.

<!-- generated:begin example:quick-start/download -->

```js
import { checkExport, downloadGraph, loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl("https://graphty.app/docs/graph-io/samples/got-network.graphml");

// <button id="save">Save as GML</button>
document.querySelector("#save").addEventListener("click", async () => {
    // GML ids are integers and its keys have no spaces: "mangle" rewrites both, keeping the originals
    const options = { sanitizeIds: "mangle", sanitizeKeys: "mangle", filename: "got.gml" };
    const notes = checkExport(snapshot, "gml", options);
    const refused = notes.filter((n) => n.code.startsWith("E_"));
    const lossy = notes.filter((n) => n.code.startsWith("W_"));
    if (refused.length > 0) {
        console.error(refused.map((n) => n.message).join("\n"));
    } else if (lossy.length === 0 || confirm(lossy.map((n) => n.message).join("\n"))) {
        await downloadGraph(snapshot, "gml", options);
    }
});
```

<!-- generated:end -->

To upload a graph instead, use `exportGraphToBlob()` and put the blob in a `FormData`. See
[Saving graphs](./saving.md).

## When something goes wrong

Everything graph-io throws on purpose is a `GraphFormatError`. It has a `code` (a stable string), a
`message` (plain English) and `details` (an object, possibly empty).

- `ImportError` is the `GraphFormatError` you get when the input could not be loaded: the URL
  failed, the format was not recognized, the file could not be parsed, or there were more errors
  than the `errorLimit` option allows (100 by default). Its `code` is always `"E_IMPORT"`.
  `err.issue?.code` is the problem that stopped the import (`"E_FETCH"`, `"E_UNKNOWN_FORMAT"`,
  `"E_GML_SYNTAX"` and so on), and `err.report` holds everything read up to that point.
- Any other `GraphFormatError` comes from the call itself: `E_UNSUPPORTED` for a format name
  graph-io does not know or an option value that is not allowed, and `E_INVALID_ID`, `E_DIRECTED`
  or `E_COLUMN_TYPE` when the format cannot hold the graph under your options (the save's
  `checkExport()` returned an `E_` note).
- If you pass a `signal` and it aborts, the signal's reason is thrown unchanged: a `DOMException`
  named `"AbortError"`, or `"TimeoutError"` for `AbortSignal.timeout()`.

Warnings are never thrown and never logged. They are in `result.report.issues`.

To show one message for any failure, catch `GraphFormatError` and display `err.message`, as the
examples above do. [The import report and errors](./report.md) shows how to branch on the codes.

## Sample files

The examples use the Game of Thrones character network by Melanie Walsh
([sample-social-network-datasets](https://github.com/melaniewalsh/sample-social-network-datasets),
public domain). Download them to run the Node examples:

- [got-network.graphml](https://graphty.app/docs/graph-io/samples/got-network.graphml): 107
  characters and 352 weighted edges.
- [got-edges.csv](https://graphty.app/docs/graph-io/samples/got-edges.csv): the same edges as a CSV
  edge table.
- [got-nodes.csv](https://graphty.app/docs/graph-io/samples/got-nodes.csv): the characters as a CSV
  node table.

The format pages read other files by name, such as `karate.gml`. Use any file of that format.

## Next steps

- [Reading the graph](./reading.md): attributes, labels, weights and degrees.
- [Loading graphs](./loading.md): strings, bytes, streams, format options, files that hold several
  graphs, and cancelling a slow load.
- [Saving graphs](./saving.md): streaming large graphs to a file, choosing a format from a file
  name, and ids or edge directions a format cannot hold.
- [All formats](./formats/index.md): what each format keeps, and which one to pick.

If you display graphs with [graphty-element](https://graphty.app/docs/graphty-element/), you
already use graph-io: `element.loadFromUrl()` and `element.loadFromFile()` read files through it.
Use graph-io directly when you want the graph data yourself, for example to convert files, analyze a
graph, or draw it with your own renderer.
