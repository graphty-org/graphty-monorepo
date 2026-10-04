# Quick start

This page loads a graph file, checks what happened while it was read, and saves the graph in
another format. Every example runs as written in Node 20 or later, and the browser examples run
in any current browser.

## Install

```bash
npm install @graphty/graph-io
```

graph-io is an ES module. Import it with `import`, not `require`.

## Load a graph from a URL

`loadFromUrl()` downloads a file and reads it. You do not name the format: graph-io works it out
from the file name, the server's `Content-Type` and the file's first bytes.

<!-- generated:begin example:quick-start/load-url -->

```ts
import { GraphFormatError, loadFromUrl } from "@graphty/graph-io";

try {
    const { snapshot, format, report } = await loadFromUrl("https://example.com/data/karate.gml");
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
Read gml: 34 nodes, 78 edges
```

<!-- generated:end -->

The result has three parts you will use:

- `snapshot` is the graph. `snapshot.nodeCount` and `snapshot.edgeCount` count it, and
  `snapshot.nodes` and `snapshot.edges` hold the node and edge attributes as columns. The snapshot
  type comes from [`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format),
  which is installed with graph-io.
- `format` is the format graph-io read the file as, such as `"gml"` or `"graphml"`.
- `report` says what happened while reading. `report.issues` lists every element that was skipped
  or changed, with a code, a message and a line number.

## Load a file the user picks

In a browser, `loadFromFile()` reads a `File` from an `<input type="file">` or a drop event. The
file name tells graph-io the likely format, and `listFormats()` gives you every extension graph-io
reads, for the input's `accept` attribute.

<!-- generated:begin example:quick-start/load-file -->

```ts
import { GraphFormatError, listFormats, loadFromFile } from "@graphty/graph-io";

const input = document.querySelector("#graph-file") as HTMLInputElement;
input.accept = listFormats()
    .filter((f) => f.canImport)
    .flatMap((f) => f.extensions)
    .join(",");

input.addEventListener("change", async () => {
    const file = input.files?.[0];
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

In Node, the same function reads a file from disk: pass it `await fs.openAsBlob(path)`. You can
also pass the file's bytes to `importGraph()`, as the next example does.

## Save it in another format

`exportGraphToBytes()` writes the graph in any format and returns the file's bytes. Before you
save, `checkExport()` tells you what the file will not keep. It returns a list of notes, and an
empty list means the saved file reads back as the same graph.

<!-- generated:begin example:quick-start/save-node -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("lesmiserables.gexf"), { filename: "lesmiserables.gexf" });

for (const note of checkExport(snapshot, "csv")) {
    console.warn(`${note.code}: ${note.message}`);
}
await writeFile("lesmiserables.csv", await exportGraphToBytes(snapshot, "csv"));
```

<!-- generated:end -->

This prints two notes, then writes the file:

<!-- generated:begin output:quick-start/save-node -->

```text
W_CSV_NODE_ORDER: 8 node(s) are first mentioned by an edge row out of index order; a re-import numbers nodes by first appearance
W_CSV_NODE_TABLE: 1 node column(s) are written by a table: "nodes" export only
```

<!-- generated:end -->

A CSV file holds one table. By default graph-io writes the edge table, so the node labels are not
in it, and the nodes come back in a different order when the file is read again. The
[CSV page](./formats/csv.md) shows how to write the node table too.

A note's code tells you how serious it is:

- A code starting with `W_` is a warning. The file is written, but this part of the graph does not
  read back the same.
- A code starting with `E_` means the format cannot hold the graph with these options, and the
  export throws instead of writing. The note's message says which option fixes it, when one does.

Pass the same options object to `checkExport()` and to the export, so the check describes the file
you actually write.

## Download it from the browser

`downloadGraph()` saves a graph as a file in the browser, as if the user clicked a download link.
This example offers the graph as a Pajek file. Pajek numbers its nodes 1, 2, 3, ..., so
`sanitizeIds: "mangle"` lets graph-io renumber them and keep the original ids in the file.

<!-- generated:begin example:quick-start/download -->

```ts
import { checkExport, downloadGraph, loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl("https://example.com/data/lesmiserables.gexf");

const button = document.querySelector("#save") as HTMLButtonElement;
button.addEventListener("click", async () => {
    const options = { sanitizeIds: "mangle", filename: "les-miserables.net" } as const;
    const notes = checkExport(snapshot, "pajek", options);
    const refused = notes.filter((n) => n.code.startsWith("E_"));
    const lossy = notes.filter((n) => n.code.startsWith("W_"));
    if (refused.length > 0) {
        console.error(refused.map((n) => n.message).join("\n"));
    } else if (lossy.length === 0 || confirm(lossy.map((n) => n.message).join("\n"))) {
        await downloadGraph(snapshot, "pajek", options);
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
  `err.issue` is the problem that stopped the import, so `err.issue.code` is `"E_FETCH"`,
  `"E_UNKNOWN_FORMAT"`, `"E_PARSE"` and so on, and `err.report` holds everything read up to that
  point.
- Any other `GraphFormatError` is a problem with the call itself: a `format` that names no format
  graph-io knows (`E_UNSUPPORTED`), or a graph the chosen format cannot hold under your options
  (the `E_` note `checkExport()` reports).
- If you pass a `signal` and it aborts, the signal's reason is thrown unchanged: a `DOMException`
  named `"AbortError"`, or `"TimeoutError"` for `AbortSignal.timeout()`.

Warnings are never thrown and never logged. They are in `result.report.issues`.

To show one message for any failure, catch `GraphFormatError` and display `err.message`, as the
examples above do. [The import report and errors](./report.md) shows how to branch on the codes.

## Next steps

- [Loading graphs](./loading.md): strings, bytes, streams, format options, files that hold several
  graphs, and cancelling a slow load.
- [Saving graphs](./saving.md): streaming large graphs to a file, choosing a format from a file
  name, and ids or edge directions a format cannot hold.
- [All formats](./formats/index.md): what each format keeps, and which one to pick.
