# Quick start

This page loads a graph file, looks at what was read, and saves the graph in another format. The
examples load public sample files by URL, so you can run them as they are.

## Install

```bash
npm install @graphty/graph-io
```

graph-io is an ES module: import it with `import`, not `require`. It runs in browsers and in Node
18.19 or later.

In a page or a notebook without a bundler (a plain `<script type="module">`, Observable,
JupyterLite), import it from a CDN instead:

<!-- generated:begin example:quick-start/notebook -->

```js
// A notebook cell or a <script type="module">: nothing to install
import { loadFromUrl } from "https://esm.sh/@graphty/graph-io";

const { snapshot, format, report } = await loadFromUrl(
    "https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-edges.csv",
    // a CSV edge table without a Type column does not say; without this the graph is directed
    { defaultDirected: false },
);
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges, directed: ${snapshot.directed}`);
for (const issue of report.issues) {
    console.log(`${issue.code} (line ${issue.line ?? "-"}): ${issue.message}`);
}
```

<!-- generated:end -->

<!-- generated:begin output:quick-start/notebook -->

```text
csv: 107 nodes, 352 edges, directed: false
```

<!-- generated:end -->

Most programs need eight functions: `loadFromUrl()`, `loadFromFile()` and `importGraph()` read a
graph; `exportGraphToBytes()`, `exportGraphToString()`, `exportGraphToBlob()` and `downloadGraph()`
write one; and `checkExport()` says what a format would not keep. The package exports many more
names. Those are format options, issue codes, and the building blocks for
[adding a format](./extending/new-format.md); you can ignore them until you need them.

## Load a graph from a URL

`loadFromUrl()` downloads a file and reads it. You do not name the format: graph-io works it out
from the file name, the server's `Content-Type` and the file's first bytes.

<!-- generated:begin example:quick-start/load-url -->

```ts
import { GraphFormatError, loadFromUrl } from "@graphty/graph-io";

try {
    const { snapshot, format, report } = await loadFromUrl(
        "https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-network.graphml",
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

- `snapshot` is the graph, a `GraphSnapshot`. In TypeScript, import its type from graph-io:
  `import type { GraphSnapshot } from "@graphty/graph-io"`, then
  `useState<GraphSnapshot | null>(null)`. Its nodes, edges and ids never change, so you can keep it
  in application state and share it between components. Its attribute tables can change; see
  [Changing attributes](./reading.md#changing-attributes) before you rename one in a snapshot that
  other code holds.
- `format` is the format the file was read as, such as `"graphml"`.
- `report` says what happened while reading. `report.issues` lists every element that was skipped
  or changed, with a code, a message and a line number. This file reads cleanly, so it prints none.

## Use the graph data

Nodes and edges are numbered from 0. `snapshot.ids.idOf(i)` gives node `i`'s id, and
`snapshot.edgeSource(e)` and `snapshot.edgeTarget(e)` give the nodes at the ends of edge `e`.
Attributes are columns. Formats name the label column differently (`label`, `name`, `Label`), so
`snapshot.nodes.byRole("label")` finds it whatever its name, and its `value(i)` reads node `i`'s
label. This turns the graph into the `{ nodes, links }` arrays that d3, react-force-graph and
similar libraries take:

<!-- generated:begin example:quick-start/use-data -->

```ts
import { loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl(
    "https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-network.graphml",
);

// the column the file marks as the node labels, whatever it is named (null when there is none)
const label = snapshot.nodes.byRole("label");
// edge weights, one per edge (null for an unweighted graph)
const weights = snapshot.edgeList().weights;

const nodes = Array.from({ length: snapshot.nodeCount }, (_, i) => ({
    id: snapshot.ids.idOf(i),
    label: label?.value(i),
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

`edgeList().weights` holds 32-bit numbers, so a weight such as 0.1 comes back as
0.10000000149011612. [Reading the graph](./reading.md#weights) shows how to read the exact values,
and covers attributes by name, degrees and the rest of the snapshot.

## Load a file the user picks

In a browser, `loadFromFile()` reads a `File` from an `<input type="file">` or a drop event. The
file name tells graph-io the likely format, and `listFormats()` gives you every extension graph-io
reads, for the input's `accept` attribute. Each entry of `listFormats()` has the format's name in
`format`, its `extensions`, and `canImport` and `canExport`.

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
        if (snapshot.nodeCount === 0) {
            // catches an empty result only: any text with commas can read as a small CSV graph
            console.error(`${file.name} holds no graph`);
            return;
        }
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

A load that does not throw can still hold a meaningless graph, because almost any text with commas
reads as a CSV edge list ([Format detection](./detection.md#content-beats-names) explains why). When
you know which format the user should pick, pass it as `format` (for example
`loadFromFile(file, { format: "graphml" })`), and any other file is refused with an `ImportError`
whose message says the file could not be read as that format.

In Node 20 or later, the same function reads a file from disk. A Blob from `fs.openAsBlob(path)`
has no file name, so pass one: `loadFromFile(await openAsBlob(path), { filename: path })`. In any
Node version you can pass the file's bytes to `importGraph()`:
`importGraph(await readFile(path), { filename: path })`.

## Save it in another format

`exportGraphToBytes()` writes the graph in any format and returns the file's bytes, which Node's
`writeFile()` saves. Before you save, `checkExport()` tells you what the file will not keep. It
returns a list of notes, and each note's `column` names the attribute it is about.

<!-- generated:begin example:quick-start/save-node -->

```ts
import { writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl(
    "https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-network.graphml",
);

for (const note of checkExport(snapshot, "csv")) {
    // `column` names the attribute a note is about (null for the graph as a whole)
    console.warn(`${note.code} (${note.column ?? "graph"}): ${note.message}`);
}
await writeFile("got-edges-out.csv", await exportGraphToBytes(snapshot, "csv"));
```

<!-- generated:end -->

This prints one note, then writes the file:

<!-- generated:begin output:quick-start/save-node -->

```text
W_CSV_NODE_TABLE (graph): the edge table has no room for node attributes: 1 node column ("label") is written only by a second export with table: "nodes"
```

<!-- generated:end -->

A CSV file holds one table. By default graph-io writes the edge table, so the node labels are not
in it. The [CSV page](./formats/csv.md) shows how to write the node table too.

An empty list means graph-io reads the file back as the same graph. Read it back with the same
format options you saved it with, since a file does not record them (a CSV `delimiter`, say).
[Check before you save](./saving.md#check-before-you-save) lists the cases this does not cover.

A note's code tells you how serious it is:

- A code starting with `W_` is a warning. The file is written, but this part of the graph does not
  read back the same.
- A code starting with `E_` means the format cannot hold the graph with these options, and the
  save throws instead of writing. When an option fixes it, the note's message names the option and
  the value to pass, such as `sanitizeIds: "mangle"`.

Pass the same options object to `checkExport()` and to the save, so the check describes the file
you actually write. `checkExport()` walks every node and edge, so call it when the user chooses a
format, not on every render.

## Download it from the browser

`downloadGraph()` saves a graph as a file in the browser, as if the user clicked a download link.
GML ids must be integers and its attribute names cannot contain spaces, so this example passes
`"mangle"` for both.

<!-- generated:begin example:quick-start/download -->

```js
import { checkExport, downloadGraph, loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl(
    "https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-network.graphml",
);

// <button id="save">Save as GML</button>
document.querySelector("#save").addEventListener("click", async () => {
    const options = {
        sanitizeIds: "mangle", // any format: rewrite ids the format cannot hold (GML ids are integers)
        sanitizeKeys: "mangle", // GML only: rewrite attribute names with spaces ("Edge Label")
        filename: "got.gml", // downloadGraph() only: the saved file's name
    };
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

Saving in the format a file came from can need the same option. Two ids in got-network.graphml,
"Jon Arryn" and "Robert Arryn", contain a space, which graph-io does not write in a GraphML id. So
`downloadGraph(snapshot, "graphml")` is refused with `E_INVALID_ID`, and
`downloadGraph(snapshot, "graphml", { sanitizeIds: "mangle" })` writes the file with the original ids
kept in it. A "save as" button that offers every format should pass `sanitizeIds: "mangle"`; see
[Ids the format cannot hold](./saving.md#ids-the-format-cannot-hold).

To upload a graph instead, use `exportGraphToBlob()` and put the blob in a `FormData`. To get the
file as text, for example to show it in a page, use `exportGraphToString()`:
`const gml = await exportGraphToString(snapshot, "gml", options)`. See [Saving graphs](./saving.md).

## When something goes wrong

Everything graph-io throws on purpose is a `GraphFormatError`. It has a `code` (a stable string), a
`message` (plain English) and `details` (an object, possibly empty).

- `ImportError` is the `GraphFormatError` you get when the input could not be loaded: the URL
  failed, the format was not recognized, the file could not be parsed, or there were more errors
  than the `errorLimit` option allows (100 by default). Its `code` is always `"E_IMPORT"`.
  `err.issue.code` is the problem that stopped the import (`"E_FETCH"`, `"E_UNKNOWN_FORMAT"`,
  `"E_SYNTAX"`, `"E_CSV_UNCLOSED_QUOTE"` and so on), and `err.report` holds everything read up to
  that point.
- Any other `GraphFormatError` comes from the call itself: `E_UNSUPPORTED` for a format name
  graph-io does not know or an option value that is not allowed, and `E_INVALID_ID`, `E_DIRECTED`
  or `E_COLUMN_TYPE` when the format cannot hold the graph under your options (the save's
  `checkExport()` returned an `E_` note).
- If you pass a `signal` and it aborts, the signal's reason is thrown unchanged.
  `isAbortError(err)` tells a cancelled load from a failed one.

Warnings are never thrown and never logged. They are in `result.report.issues`.

To show one message for any failure, catch `GraphFormatError` and display `err.message`, as the
examples above do. [The import report and errors](./report.md) shows how to branch on the codes.

## Sample files

The examples read these files. They are published with this guide, and they are also in the
graph-io repository, in
[graph-io/docs/samples](https://github.com/graphty-org/graphty-monorepo/tree/master/graph-io/docs/samples).
To run a Node example, download the files it reads into the directory you run it from. To load a
local copy in a browser, serve the directory (`npx serve`) and pass `loadFromUrl()` a URL relative
to the page, such as `"/got.gml"`.

The Game of Thrones character network by Melanie Walsh
([sample-social-network-datasets](https://github.com/melaniewalsh/sample-social-network-datasets),
public domain): 107 characters and 352 weighted edges. The examples that load it by URL read it
from that repository.

- [got-network.graphml](https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-network.graphml):
  the network as GraphML.
- [got-edges.csv](https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-edges.csv)
  and
  [got-nodes.csv](https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-nodes.csv):
  the edges and the characters as CSV tables.
- The same network saved by graph-io in other formats:
  [got.gml](https://graphty.app/docs/graph-io/samples/got.gml),
  [got.gexf](https://graphty.app/docs/graph-io/samples/got.gexf),
  [got.net](https://graphty.app/docs/graph-io/samples/got.net) (Pajek),
  [got.json](https://graphty.app/docs/graph-io/samples/got.json) (d3, with the weights in `value`),
  [got.cx2](https://graphty.app/docs/graph-io/samples/got.cx2) and
  [got.cx](https://graphty.app/docs/graph-io/samples/got.cx).

Small files written for this guide:

- [teams.gv](https://graphty.app/docs/graph-io/samples/teams.gv): a DOT graph with two clusters.
- [vehicles.obo](https://graphty.app/docs/graph-io/samples/vehicles.obo): a four-term OBO
  ontology.
- [networks.cys](https://graphty.app/docs/graph-io/samples/networks.cys): a Cytoscape session
  with two networks, Alpha and Beta.
- [proteins.xgmml](https://graphty.app/docs/graph-io/samples/proteins.xgmml): a three-node network
  as Cytoscape writes XGMML.
- [movies-nodes.csv](https://graphty.app/docs/graph-io/samples/movies-nodes.csv) and
  [movies-rels.csv](https://graphty.app/docs/graph-io/samples/movies-rels.csv): a Neo4j bulk import
  of movies and the people in them.

## Next steps

- [Reading the graph](./reading.md): attributes, labels, weights and degrees.
- [Loading graphs](./loading.md): strings, bytes, streams, format options, files that hold several
  graphs, cancelling a slow load, and loading in a React component.
- [Saving graphs](./saving.md): streaming large graphs to a file, choosing a format from a file
  name, and ids or edge directions a format cannot hold.
- [All formats](./formats/index.md): what each format keeps, and which one to pick.
