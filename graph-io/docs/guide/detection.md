# Format detection

When you do not pass `format`, graph-io works out what a file is from three clues:

- the file name's extension: the `filename` option, the last path segment of a URL, or a `File`'s
  name. Only the extension is used, so a full path is fine.
- the MIME type: the `mimeType` option, the server's `Content-Type`, or a `Blob`'s `type`
- the first 8 KiB of the content (`SNIFF_HEAD_BYTES`). For a stream, graph-io reads those bytes
  first and then hands the whole stream, those bytes included, to the importer.

## Content beats names

Every format looks at the first bytes and says how sure it is that they are its own. A format that
recognizes the content always outranks a format that only matches the extension or the MIME type.
So:

- a `.csv` file whose header is `:ID,name` is read as Neo4j CSV, not as plain CSV
- a `.xml` file is read as GraphML, GEXF or XGMML according to its root element
- a `.txt` file that starts with `graph [` is read as GML
- a file named `graph.graphml` that is really an HTML error page is refused with `E_UNKNOWN_FORMAT`
  and the message "it is an HTML document (likely an error page saved in place of the file)"

When the content is not recognized, the extension and the MIME type decide on their own. When
nothing matches, the load throws an `ImportError` whose `err.issue.code` is `E_UNKNOWN_FORMAT`.
graph-io also refuses PDF files, images and compressed or archived data by their first bytes, and
says what they are; a Cytoscape session is the one zip file it reads.

## Asking without loading

`sniff()` runs the same detection without reading the file. It returns the best match, or `null`
when no format matches:

<!-- generated:begin example:detection/sniff -->

```ts
import { readFile } from "node:fs/promises";

import { sniff, SNIFF_HEAD_BYTES } from "@graphty/graph-io";

const bytes = await readFile("karate-neo4j.csv");

// The content outranks the name: this .csv file has a neo4j-admin header
console.log(sniff({ filename: "karate-neo4j.csv", head: bytes.subarray(0, SNIFF_HEAD_BYTES) }));

// A name alone is a weak hint, but it is enough when nothing contradicts it
console.log(sniff({ filename: "graph.gexf" }));

// For JSON, the result also names the dialect the document looks like
console.log(sniff({ head: '{ "elements": { "nodes": [ { "data": { "id": "a" } } ] } }' })?.dialect);
```

<!-- generated:end -->

<!-- generated:begin output:detection/sniff -->

```text
{
  format: 'neo4j',
  confidence: 0.9325,
  content: 0.95,
  extension: true,
  mimeType: false,
  dialect: null
}
{
  format: 'gexf',
  confidence: 0.3,
  content: 0,
  extension: true,
  mimeType: false,
  dialect: null
}
cytoscape
```

<!-- generated:end -->

The result has:

- `format`: the format name
- `confidence`: from 0 to 1. A content match scores between 0.5 and 1. A name or MIME type alone
  scores at most 0.4.
- `content`: how sure the format was about the content, from 0 to 1; 0 when no content was given
  or the format did not recognize it
- `extension` and `mimeType`: whether the file name and the MIME type matched
- `dialect`: for JSON, which kind of JSON document the head looks like (`"node-link"`, `"d3"`,
  `"jgf"`, `"cytoscape"`, `"graphology"`, `"vis"`, `"adjacency"`, `"tree"` or `"obographs"`); `null`
  for every other format

`rankFormats()` returns every candidate, best first, if you want to offer the user a choice.

## JSON dialects

All JSON graph documents share the format name `json`. After the file is parsed, the JSON importer
decides which dialect it is from the document's shape: a `nodes` array with `links`, an `elements`
object, a `graphs` array, and so on. The `dialect` that `sniff()` reports from the first 8 KiB is a
guess; the importer's decision on the whole document is the one that counts. Pass the `dialect`
option to choose the dialect yourself. The [JSON page](./formats/json.md) describes each one.

## When to name the format

Detection is right for files that carry their own clues. Pass `format` when:

- the input has no file name and could be several formats, such as a short CSV or edge list
  pasted into a text box
- the URL has no extension and the server sends a generic `Content-Type` such as
  `application/octet-stream`
- you only accept one format and want any other file refused

An adjacency-list CSV (each row a node followed by its neighbors) is never detected, because
nothing in its rows tells it apart from an edge list. Read it with `format: "csv"` and
`table: "adjacency"`.
