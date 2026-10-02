# Data Sources

Guide to loading data from various sources and formats.

## Overview

Graphty supports multiple data formats and loading methods. Data can be provided inline, loaded from URLs, or read from files.

## Inline Data

The simplest way to provide data via HTML attributes:

```html
<graphty-element node-data='[{"id": "a"}, {"id": "b"}]' edge-data='[{"source": "a", "target": "b"}]'> </graphty-element>
```

Or via JavaScript properties:

```typescript
element.nodeData = [{ id: "a" }, { id: "b" }];
element.edgeData = [{ source: "a", target: "b" }];
```

Assigning either property REPLACES what it describes. A node missing from a new `nodeData` array
is removed along with the edges attached to it; a node that is still there keeps its position and,
for now, its OLD data -- a changed field on a retained node is not applied. `edgeData` replaces
edge records outright. To add to the graph instead, call `addNodes` and `addEdges`.

## Loading from URL

Load graph data from a remote JSON file:

```typescript
await graph.loadFromUrl("https://example.com/graph.json");
```

The JSON file should contain `nodes` and `edges` arrays:

```json
{
    "nodes": [
        { "id": "node1", "label": "First" },
        { "id": "node2", "label": "Second" }
    ],
    "edges": [{ "source": "node1", "target": "node2" }]
}
```

## Loading from File

Load from a user-uploaded file:

```typescript
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    await graph.loadFromFile(file);
});
```

## Text or Bytes

A file is read as bytes, and the format's reader decodes them: a byte-order mark names the
encoding, and so does an XML (`encoding="ISO-8859-1"`) or DOT (`charset`) declaration; anything
else is read as UTF-8. Inline `data` can be text or bytes -- a `Uint8Array` or an `ArrayBuffer` --
so a file you already hold in memory loads exactly as the file itself would:

```typescript
const bytes = new Uint8Array(await response.arrayBuffer());
await element.session.data.import({ type: "graphml", config: { data: bytes } });

// The same element property, as bytes:
element.dataSource = "graphml";
element.dataSourceConfig = { data: bytes };
```

Text you pass as a string is read as it is. Prefer bytes when the data came from a file or a
download: decoding it to a string yourself fixes its encoding before the reader can read the
file's own declaration, and a binary format (a zip) does not survive being turned into text.

## Files That Hold Several Graphs

Some formats can hold more than one graph in a file. Ask which graphs a file holds with
`listGraphs` from `@graphty/graphty-element/catalog`, then load one by position or by name:

```typescript
import { listGraphs } from "@graphty/graphty-element/catalog";

const graphs = await listGraphs({ config: { file } });
// [{ index: 0, name: "Network 1", nodes: 120, edges: 340 }, ...], or null

await element.loadFromFile(file, { graphIndex: 1 });
await element.loadFromFile(file, { graphName: "Network 1" });
await element.session.data.import({ config: { file, graphIndex: 1 } });
```

`listGraphs` takes the same source `session.data.import` does -- an optional `type` and a `config`
with `data`, a `file` or a `url` -- and detects the format the same way. It answers `null` for a
format whose file holds one graph. Cytoscape sessions, CX files, XGMML files (which can nest networks)
and JSON documents with a `graphs` array (JGF, OBO Graphs) list their graphs; a format registered with
`DataSource.fromImporter` answers it when its importer has `listGraphs`.

Without a choice the first graph is loaded. A `graphIndex` that is not a non-negative integer, a
`graphName` that is not a string, both at once, or a choice other than `graphIndex: 0` for a
format whose file holds one graph, fails with `E_OPTION_RANGE` before anything is read. A name or
an index that matches no graph in the file fails with `E_PARSE_FAILED`, and the message names
what the file holds.

## Loading as One Undoable Step

`session.data.import` loads a file, a URL or inline text as one step that undo takes back whole.
Name the format with `type`, or leave it out and the element detects it the same way
`loadFromUrl` and `loadFromFile` do: from the file name or the URL's extension first, then from
the first bytes, fetching a URL once when its name says nothing. Data no format recognises
rejects with `E_UNKNOWN_FORMAT`, and the error lists the formats the element reads.

```typescript
const { session } = element;
await session.data.import({ config: { file } }); // detected from the file name
await session.data.import({ name: "Flights", config: { url: "/api/graph" } }); // from the content
await session.data.import({ type: "csv", config: { data: text } }); // named
```

The element keeps where the graph came from, and undo and redo move it with the graph:

```typescript
session.data.source(); // { type: "json", name: "Flights", config: { url: "/api/graph" } }
```

`name` is what the reader knows the data by: the file's name or the last part of the URL unless
you give one. A file read also records its `size` in bytes. The inline text and the file itself
are never kept; the loaded rows already hold them. After `session.data.clear()`, `source()`
answers `null`.

## Replacing the Graph

A load ADDS to the graph unless you pass `replace: true`. A replacing load swaps the graph as one
undoable step, and a load that fails rolls its whole step back, so a malformed or empty file
rejects and leaves the current graph exactly as it was:

```typescript
try {
    const { loadId } = await graph.loadFromFile(file, { replace: true });
} catch (error) {
    // The previous graph is still on screen.
    console.error(error.code, error.message);
}
```

`replace` is accepted by `loadFromFile`, `loadFromUrl` and, as a third argument, by
`addDataFromSource(type, opts, { replace: true })`. A source that holds no nodes and no edges at
all fails with `E_EMPTY_LOAD`, whether or not it was replacing; when every row was rejected by
the format's schema, `data-loading-error-summary` still reports why. A replacing load that stops at
the source's `errorLimit` has read only part of the file, so it fails with `E_PARSE_FAILED` and
keeps the current graph.

GML, DOT and Pajek files are read by `@graphty/graph-io`. A file of one of those formats that
cannot be read at all -- a GML list or DOT brace still open when the text ends, a Pajek file with
no `*Vertices` section -- fails with
`E_PARSE_FAILED` instead of loading whatever came before the break. The `data-loading-error` event
carries `context: "parsing"` and, when the reader can name one, the `line` where the problem
starts; a replacing load keeps the current graph. Problems a reader can skip past, such as one
malformed vertex line, are reported in `data-loading-error-summary` and the rest of the file loads.

GML is read as NetworkX reads it, so three things the element's 2.x reader accepted fail with
`E_PARSE_FAILED` naming the line: an unquoted word as a value (`id A`; quote it, `id "A"`), a
`directed` written as `true` or `false` (write `1` or `0`), and a string that runs onto the next
line (write the line break as `&#10;`).

When loads overlap, the one that STARTED last wins. Once a replacing load has started, every
load started before it adds nothing more and rejects with `E_SUPERSEDED`, even if its source
finishes later; it emits no `data-loading-error`, because nothing was wrong with its source.
A load starts when you call it: `loadFromFile` and `loadFromUrl` take their place, and their
`loadId`, before they read the file or fetch the URL, so a slow read cannot overtake a later call.
`clearData()` abandons every load in flight the same way, so a load finishing after it does not
bring its data back.

Assigning the `dataSource` / `dataSourceConfig` pair a second time starts a replacing load of the
new source in the same way. Assigning the pair already loaded -- the same type and the same config
object -- starts no load, so a host that re-assigns its props on every render does not reload.
If that pair's load failed, assigning it again retries it.

## Supported Formats

| Format            | Extensions                                    | Description                                              |
| ----------------- | --------------------------------------------- | -------------------------------------------------------- |
| JSON              | `.json`                                       | Native format with nodes/edges arrays                    |
| GraphML           | `.graphml`, `.xml`                            | XML-based graph format                                   |
| GEXF              | `.gexf`, `.xml`                               | Gephi exchange format                                    |
| GML               | `.gml`                                        | Graph Modeling Language                                  |
| DOT               | `.dot`, `.gv`                                 | Graphviz format                                          |
| CSV               | `.csv`, `.tsv`, `.tab`, `.edges`, `.edgelist` | Delimited edge or node list, including neo4j-admin files |
| Pajek             | `.net`, `.paj`                                | Pajek network format                                     |
| XGMML             | `.xgmml`, `.xml`                              | Cytoscape's XML network format                           |
| CX2               | `.cx2`                                        | The NDEx / Cytoscape exchange format                     |
| CX                | `.cx`                                         | Version 1 of CX, read only                               |
| Cytoscape Session | `.cys`                                        | A saved Cytoscape session, read only                     |
| OBO               | `.obo`                                        | The Gene Ontology's ontology format, read only           |

An OBO Graphs document (the JSON form of an ontology, such as `go-basic.json`) is JSON: it is
recognised by its content and read with the `json` format.

### Cytoscape and ontology files

XGMML, CX, CX2, Cytoscape sessions and OBO are read by `@graphty/graph-io` with nothing to wire
up: hand the element the file and it loads. The format is recognised from the file name or, failing
that, from the bytes:

```typescript
const element = document.querySelector("graphty-element");

// A Cytoscape session, drawn where Cytoscape saved it. Cytoscape's coordinates are pixels, so
// positionScale shrinks them to scene units (one unit per fifty pixels suits nodes of size one).
element.layout = "fixed";
element.positionScale = 0.02;
await element.loadFromUrl("https://example.org/sessions/galFiltered.cys");

// The Gene Ontology: about 48,000 terms and 71,000 is_a and part_of relations. The file has no
// saved drawing, so pick a layout that computes one.
element.layout = "ngraph";
await element.loadFromUrl("https://release.geneontology.org/2026-08-05/ontology/go-basic.obo", {
    replace: true,
});
```

`loadFromFile(file)` and `dataSourceConfig = { data: bytes }` load the same files the same way. Every column of the file arrives on the node and edge
records under the name the file gave it (`name`, `shared name`, `interaction`, an OBO term's
`name`, `namespace`, `def`, `is_obsolete`, ...).

- **Positions.** A node's saved position arrives as `position` on its record and seeds the layout;
  choose the `fixed` layout to draw a session or a CX2 network exactly as it was saved. Cytoscape
  writes screen coordinates, whose y grows downward; they are stored with y growing upward, like
  every other format's, so the drawing is not upside down. Cytoscape's z is a drawing order, kept
  as a `z` value on the record; the `zAs: "position"` option makes it the z coordinate instead.
- **Styles are not imported yet.** A file's visual style rules (mappings, defaults) are reported
  in the load report and not applied; the per-node and per-edge visual values a file holds arrive
  as ordinary values on the records. Exporting to XGMML or CX2 writes the graph and its values,
  never the element's style layers.
- **Several networks.** A session and a CX collection can hold several networks: list them with
  `listGraphs` and load one with `graphIndex` or `graphName` (see "Files That Hold Several Graphs").
  So can a JGF or OBO Graphs document with a `graphs` array.
- **Bytes.** A session is a zip archive: load it from a file, a URL or a `Uint8Array`, never as text.

| Format  | Options                                                                                      |
| ------- | -------------------------------------------------------------------------------------------- |
| XGMML   | `labelAliases`, `repairBareAmpersands`, `graphName`, `zAs`                                   |
| CX2     | `zAs`                                                                                        |
| CX      | `graphName`, `zAs`                                                                           |
| Session | `graphName`, `zAs`                                                                           |
| OBO     | `obsolete` (`"keep"` or `"drop"`), `typedefs` (`"metadata"` or `"nodes"`), `addMissingNodes` |
| JSON    | `oboIds` (`"curie"` or `"iri"`), for an OBO Graphs document                                  |

`session.catalog.formats()` describes each option for a settings form.

### How the format is chosen

`loadFromFile` and `loadFromUrl` pick the format from the file name first. When two formats claim
the extension (`.xml` is GraphML or GEXF), or the name has no extension the element knows, the
first bytes decide, using the content checks of the matching
`@graphty/graph-io` importers. Any table whose first line is split by a comma, tab, semicolon or
pipe is read as CSV, whatever its column names. A space-separated table is not detected: name the
format and pass `delimiter: " "`. When neither the name nor the bytes settle it, name the format
explicitly.

The same detection is published, so a drop target can ask before it loads anything:

```ts
import { detectFormat } from "@graphty/graphty-element/catalog";

detectFormat({ filename: "graph.xml", sample: firstKilobytes }); // "graphml" or "gexf"
```

## Directed or Undirected

Most graph formats state whether their edges point, and the importer reports what the file said.
A GML file with no `directed` key, a GEXF file with no `defaultedgetype`, is not silent: both
formats define that omission as undirected, and so does graphty-element.

| Format  | Where it states direction                                             | When it states nothing                                                                             |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| GEXF    | `defaultedgetype` on `<graph>`, and `type` per edge                   | An absent attribute means undirected, unless the edges themselves say otherwise                    |
| GraphML | `edgedefault` on `<graph>`, and `directed` per edge                   | An absent attribute states nothing; GraphML requires it                                            |
| GML     | the `directed` key, 1 or 0 (a quoted `"1"` is read too)               | An absent key means undirected                                                                     |
| DOT     | the opening `graph` or `digraph` keyword                              | A body with no keyword (`{ a -> b }`) states nothing; every edge, `->` or `--`, follows `directed` |
| Pajek   | `*Arcs` are directed, `*Edges` are not; an empty section still counts | A file with no edge section states nothing                                                         |
| CSV     | Gephi's `Type` column: `Directed` or `Undirected`                     | Every other dialect states nothing                                                                 |
| JSON    | a top-level `"directed"` boolean, as node-link JSON writes it         | Any document without that key states nothing                                                       |
| XGMML   | `directed` on `<graph>`, and Cytoscape's `cy:directed` per edge       | An absent attribute means undirected, unless every edge says otherwise                             |
| CX, CX2 | every edge points from `s` to `t`                                     | Always directed                                                                                    |
| Session | each edge's `cy:directed`                                             | Directed                                                                                           |
| OBO     | a relation points from a term to its parent                           | Always directed                                                                                    |

Read it back from the session:

```typescript
graph.getSession().data.statistics().directedness; // "directed" | "undirected" | "unknown"
```

**You have the last word.** `data.directed` defaults to `"auto"`, which is what lets the file
decide. Set it to a boolean and it settles the question: the file's own header is read, reported
in the log, and does not overrule you.

A format that can state direction per edge as well as per graph can describe a _mixed_ graph, and
one graph carries one direction. A graph-level statement the file actually wrote is what the
element adopts: one `type` attribute must not decide how the other quarter of a million edges are
read. Where no graph-level statement was written -- Pajek and Gephi CSV, which have none to write,
and a GEXF file that left `defaultedgetype` out -- the edges are the file's only word on the
subject, and any directed edge among them makes the graph directed. That asymmetry is deliberate:
losing one direction of an undirected edge is countable, and counted, while reading a directed edge
as undirected invents a reverse path the file denies.

Either way an edge whose own direction differs from the graph's keeps it on its record -- a GEXF
edge as `type` (`"directed"`, `"undirected"`, or `"mutual"`, which is always kept), a GraphML edge
as `directed` -- and the element logs a warning naming how many edges it overrode. An edge whose
own `type` or `directed` agrees with the graph carries no such key: it is drawn like every other
edge. GEXF keywords are read in any case, so `defaultedgetype="Directed"` is directed. Direction is settled once per graph: a second file loaded into a graph
that already holds edges cannot reinterpret the edges already in it, and that is logged too.

## GEXF and GraphML Records

GEXF and GraphML files are read by `@graphty/graph-io`, and each node and edge record carries the
attributes the file declared, under their titles (GEXF) or `attr.name` (GraphML), typed by their
declared type:

- a GEXF `liststring` (or GEXF 1.3 `list<...>`) attribute is an array of its items;
- a GEXF `date` or `dateTime` attribute is its ISO text;
- a GraphML key declared `for="all"` applies to nodes and edges alike;
- a value that does not parse as its declared type -- `3.7` for an `int` key, a GraphML `<data>`
  holding XML elements rather than text -- is left off the record and reported as a loading error;
- a node id declared twice is one node, with the later declaration's values winning.

The GEXF `label=` attribute is overridden by a declared attribute titled `label`, and the
`viz:` position, colour and size override attributes titled `position`, `color` or `size`.
Nodes arrive in the order the file declares them. A GraphML document with no `<graph>` element
loads nothing and reports a loading error.

## CSV, JSON, GML, DOT and Pajek Records

These are read by `@graphty/graph-io` too, and each record keeps the keys the file wrote:

- a CSV cell is typed on its own, as before: `true` and `false` are booleans and a number is a
  number, so one `NA` in a `weight` column leaves the other weights numbers. Node ids and
  endpoints stay the text the file wrote;
- a JSON record graph-io cannot read under the id and endpoint keys the element resolved -- a node
  without the key or repeating an earlier id, an edge without both keys -- reaches the element as
  the file wrote it, and the element reads it with its own keys;
- a GML node declared twice keeps its first declaration, as the element keeps the first record
  of a repeated id. A Pajek vertex written on two lines is one node: the first line's values win,
  and the later line fills in only what the first left out (`1 0.1 0.2` then `1 "z"` is a node at
  0.1, 0.2 labelled `z`). A DOT node written in several statements has the attributes of all of
  them, the later ones winning, as Graphviz draws it;
- a DOT cluster subgraph is a node only when an edge names it, and `pos` stays the text the file
  wrote.

### Changes in graphty-element 3.1

Up to 3.0 the element read DOT, GML and Pajek with parsers of its own. From 3.1 graph-io reads
them as Graphviz, NetworkX and Pajek define them, which fixes how some files load. Random graphs in
all three formats load exactly as before; these are the edge cases that do not.

DOT:

- a text with no `graph` or `digraph` header, an unclosed brace or string, a malformed attribute
  list, and a `#` comment that does not start its line fail with `E_PARSE_FAILED`;
- a `strict` graph merges parallel edges, as Graphviz does (`strict digraph { a -> b; a -> b }` has
  one edge; it had two);
- `node [ ... ]` and `edge [ ... ]` defaults now reach the nodes and edges after them;
- `"x" + "y"` is the one id `xy`, and a line ended by a backslash continues on the next;
- nodes arrive in the order they are first named: `{a b} -> {c d}` gives a, b, c, d (it gave
  a, c, d, b).

GML:

- the three refusals above (an unquoted word as a value, `directed true`, a string spanning lines);
- a node whose `id` is not an integer or a string (`id 1.5`) is left out and reported;
- character entities are decoded (`a&amp;b` is `a&b`), and a bare `NAN` or `INF` is a number, not
  the text it was;
- a quoted number stays a string, an integer beyond 2^53 becomes a string, and a key repeated in
  one list becomes an array;
- when a file holds a second top-level `graph` block the first one loads (before, nothing did).

Pajek:

- a file with no `*Vertices` section fails with `E_PARSE_FAILED`. `*Vertices 3` declares vertices
  1 to 3 whether or not they have lines, so a vertex with no line is a node with no attributes,
  and nodes arrive in vertex-number order whatever order the lines are in;
- an edge is dropped and reported when it names a vertex outside that range, carries a weight that
  is not a number (`1 2 abc`), or names its ends by label (`"a" "b"`); 2.x kept all three;
- a vertex line with a single coordinate (`1 "a" 0.5`) is reported and keeps only its id, and an
  unquoted word after the number (`1 5`) is the label, not x;
- coordinates are stored as 32-bit floats, so a value with more than about seven significant
  digits changes (`0.123456789` loads as `0.12345679`);
- Pajek keywords after the coordinates (`ic Red`, `c Blue`, `l "x"`) are kept on the record under
  those keys, and `*Matrix` and `*Edgeslist` sections are read.

## Dynamic GEXF

A GEXF file with `mode="dynamic"` keeps its time data on each node's and edge's data, as the
strings the file wrote:

| In the file                                    | On the record                                                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `start`, `end`, `timestamp` on a node or edge  | `start`, `end`, `timestamp`                                                                                                |
| `startopen` / `endopen` (GEXF 1.2 open bounds) | `start` / `end`, plus `startOpen: true` / `endOpen: true`                                                                  |
| `<spells><spell .../></spells>`                | `spells`: a list of `{ start, end }`, each with `startOpen` / `endOpen` for an open bound                                  |
| several timed `<attvalue>`s for one attribute  | that attribute as a list of `{ value, start, end }` slices; an untimed `<attvalue>` among them comes first, as `{ value }` |

An attribute with no timed `attvalue` keeps its plain value, so a static file reads as it always
has. Timed `viz:*` elements (a position, colour or size that changes over time) are not read.

### JSON Format (Native)

```json
{
    "nodes": [
        { "id": "a", "label": "Node A", "category": "type1" },
        { "id": "b", "label": "Node B", "category": "type2" }
    ],
    "edges": [{ "source": "a", "target": "b", "weight": 1.5 }]
}
```

### GraphML Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph id="G" edgedefault="directed">
    <node id="n0"/>
    <node id="n1"/>
    <edge source="n0" target="n1"/>
  </graph>
</graphml>
```

### CSV Format

Simple edge list:

```csv
source,target,weight
a,b,1.0
b,c,2.0
c,a,1.5
```

The column separator is worked out from the first line -- comma, tab, semicolon or pipe -- so a
tab-separated or semicolon-separated file loads with no options. Pass `delimiter` to override it.

## Custom ID Paths

The element finds an edge's endpoints on its own. It looks for `source` and `target`, then `src`
and `dst`, then `from` and `to`, and it decides once for a whole batch of records rather than once
per record. A file that answers none of them fails the load with `E_EDGE_ENDPOINTS_UNRESOLVED`,
naming the columns the file does carry -- it never loads a graph with no edges in silence.

`session.data.lastImport()` says which pair was used, along with every count the load produced.

Name the columns yourself when your data uses something else. Naming them turns the probe off: a
record that does not answer a column you named is rejected and counted, not guessed at again.

```typescript
// Data uses 'nodeId', 'start' and 'end' instead of 'id', 'source' and 'target'
await graph.loadFromUrl("https://example.com/data.json", {
    nodeIdPath: "nodeId",
    edgeSource: "start",
    edgeTarget: "end",
});
```

Example data:

```json
{
    "nodes": [
        { "nodeId": "a", "name": "First" },
        { "nodeId": "b", "name": "Second" }
    ],
    "edges": [{ "start": "a", "end": "b" }]
}
```

## Incremental Loading

Add data without replacing existing nodes:

```typescript
// Initial load
await graph.addNodes([{ id: "a" }]);
await graph.addEdges([]);

// Later, add more data
await graph.addNodes([{ id: "b" }, { id: "c" }]);
await graph.addEdges([
    { source: "a", target: "b" },
    { source: "b", target: "c" },
]);
```

## Clearing Data

Remove all nodes and edges:

```typescript
graph.clearData();
```

## Data Validation

Graphty validates data using Zod schemas. Invalid data will throw descriptive errors:

```typescript
try {
    await graph.addNodes([
        {
            /* missing id */
        },
    ]);
} catch (error) {
    console.error("Invalid node data:", error.message);
}
```

## Node Data Structure

Nodes require an `id` property. All other properties are optional:

```typescript
interface NodeData {
    id: string | number; // Required, unique identifier
    label?: string; // Display label
    category?: string; // For styling/grouping
    x?: number; // Position (for fixed layout)
    y?: number;
    z?: number;
    [key: string]: any; // Any additional properties
}
```

## Edge Data Structure

Edges require `source` and `target` properties:

```typescript
interface EdgeData {
    source: string | number; // Source node ID
    target: string | number; // Target node ID
    weight?: number; // Edge weight
    label?: string; // Display label
    [key: string]: any; // Any additional properties
}
```

A record's own `id` key is just another attribute. The element assigns every edge its identifier,
as described next, and will only treat a key of yours as an edge identity if you name it -- see
"When your data carries real edge identifiers" below.

## Every edge has an id, and the element assigns it

`Edge.id` is a counter the element hands out in the order records arrive, printed as a string:
`"0"`, `"1"`, `"2"`. It is the id every surface that names an edge uses, so an id taken from one
of them is accepted by all the others:

```typescript
const session = element.session;

for (const id of (await session.scope.resolve("graph")).edges) {
    session.data.edge(id); // the record, with its endpoints resolved to source/target
    session.selection.apply({ edges: [id] });
    session.styles.explain({ edge: id });
    result.edge(id); // what an algorithm run published for it
}
```

In 1.x an edge's id was its two endpoint ids joined with a colon. That could not tell `a:b -> c`
apart from `a -> b:c`, and it could not represent two edges between the same pair at all. A saved
selection or a saved scope from 1.x carries the old ids and will match nothing; there is no
translation, because the old id was ambiguous.

## Two edges between the same pair

The element keeps both, by default. A file that lists Alice knowing Bob twice produces two edges,
each with its own id, weight and attributes:

```typescript
await graph.addEdges([
    { source: "alice", target: "bob", since: 2019 },
    { source: "alice", target: "bob", since: 2024 },
]);

element.session.data.statistics().edgeCount; // 2
element.session.data.statistics().repeatedEdgeCount; // 1
```

Choose something else with `data.knownFields.repeatedEdges`:

| Policy           | What a repeated pair does                                      |
| ---------------- | -------------------------------------------------------------- |
| `keep` (default) | becomes a second edge with its own id                          |
| `first`          | is discarded; the edge already present is untouched            |
| `last`           | replaces the weight and attributes of the edge already present |
| `sum`            | adds its weight to the edge already present                    |
| `min` / `max`    | keeps the smaller / larger of the two weights                  |
| `error`          | throws `E_DUPLICATE_EDGE`, naming both endpoints               |

Per call, `addEdges` takes the same choice as an option, which is what an incremental load wants:
re-fetching a node's neighbourhood legitimately re-supplies edges the graph already holds.

```typescript
await graph.addEdges(neighbourhood, { repeated: "first" });
```

What the policy did is on the load report:

```typescript
const report = element.session.data.lastImport();
report.repeated; // { seen, kept, dropped, merged }
report.counts; // { nodes, edges, nodeRecords, edgeRecords, rejected }
report.policy; // the policy that was in force
report.endpoints; // { source, target, resolvedFrom }
```

### What runs over a multigraph

An algorithm cannot represent two edges between one pair, so the element simplifies first --
summing the weights of a parallel group -- and says so in the run's caveats rather than letting
the result quietly describe a different graph than the one on screen. The run's per-edge values
land on every member of a merged group, so a style layer bound to the run paints both lines.

Two parallel edges currently draw as two coincident lines. That is a known limitation of the
renderer, not of the model.

### When your data carries real edge identifiers

Some formats give each edge its own identifier, and two records sharing one are the same edge
rather than two edges between the same pair. Name the key and the element uses it to decide what
a repeat is:

```typescript
element.session.config.set("data.knownFields.edgeIdPath", "edgeId");
```

Left unset -- the default -- a repeat is decided by the ordered endpoint pair alone.

## Large Dataset Tips

The element holds at most `DEFAULT_LIMITS.renderCeiling` nodes (50,000) and
`DEFAULT_LIMITS.edgesDrawn` edges (100,000), exported from `@graphty/graphty-element/session`. A
load that would cross either fails with `E_TOO_LARGE`; `details` carry the limit, the count the
load would have reached and the counts the graph holds. The refusal is decided before the graph
is touched: nothing from the refused batch is held, and assigning `edgeData` past the ceiling
leaves the edges the graph had. Past those figures the renderer runs out of memory rather than
slowing down, so the error is the element declining what it cannot draw. The figures were measured
with the default edge style; a patterned line style (dots, dashes) costs more memory per edge, so
under one the renderer can run out before the ceiling. Load a subset, or explore a large graph a
neighbourhood at a time (see [Incremental Loading](#incremental-loading)).

1. **Batch loading**: Load nodes before edges
2. **Progressive loading**: Load in chunks for very large graphs
3. **Simplify data**: Only include properties you need
4. **Pre-compute positions**: Use fixed layout for huge graphs

```typescript
// Load in batches
const BATCH_SIZE = 1000;
for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
    await graph.addNodes(nodes.slice(i, i + BATCH_SIZE));
}
```

## Exporting the Graph

`exportGraph(format, options?)` writes the graph in any format the catalogue lists with
`canExport: true` -- every built-in format, and any format a writer was registered for.

```typescript
const result = await element.exportGraph("gexf");
for (const note of result.lossNotes) {
    console.warn(`${note.code}: ${note.message}`);
}
const text = await result.text(); // or iterate result.bytes for a large file
```

An export carries whatever the format can represent: every node and edge with its attributes,
the current positions, every published algorithm result (as attributes named
`results.<runId>.<field>`, the element's rank and percentile included) and the colour, size and
edge width and node shape each element is drawn with. Edge weights are the weights the element
runs on -- read through `edgeWeightPath` or the legacy `value` key, and folded under
`repeatedEdges` -- and positions are written in file units (divided by `positionScale`), so a
reload puts every node back where it was. Whatever the format has no place for -- positions in CSV,
colours in GraphML, node attributes in an edge-list CSV -- is listed in `lossNotes`, one note per
kind of omission, naming the column. A value an algorithm did not measure is left absent, never
written as zero. The element's own edge ids and internal columns are not written.

| Format     | Positions     | Colour and size | Node attributes | Notes                                                                                                                                                                                |
| ---------- | ------------- | --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GEXF       | yes           | yes             | yes             |                                                                                                                                                                                      |
| GML        | yes           | no              | yes             | node ids must be integers; pass `{ sanitizeIds: "mangle" }` to rewrite the others                                                                                                    |
| DOT, Pajek | yes           | no              | yes             |                                                                                                                                                                                      |
| GraphML    | no            | no              | yes             | node ids must be XML name tokens; pass `{ sanitizeIds: "mangle" }` to rewrite the others                                                                                             |
| JSON       | as attributes | as attributes   | yes             |                                                                                                                                                                                      |
| CSV        | no            | no              | no (edge table) | `{ table: "nodes" }` writes the node table instead; `{ variant: "neo4j" }` writes a Neo4j admin-import file; a number id and the same text id (`1` and `"1"`) cannot both be written |

A CSV export puts an apostrophe before every text cell, id and header that starts with `=`, `+`,
`-`, `@`, a tab or a carriage return, so a spreadsheet does not run an imported value as a
formula. Numbers, and texts that are numbers such as `-2.31`, are never touched. Pass
`{ neutraliseFormulas: false }` for a pipeline that reads the file with a CSV parser.

Each format's options are listed in its catalogue entry's `writerOptions`, graph-io's
`sanitizeIds` and `onMixedDirection` included; an option not listed there is refused with
`E_UNKNOWN_OPTION`, and a value outside its choices with `E_OPTION_RANGE`.

A writer that cannot represent the graph under the options given refuses with `E_UNSUPPORTED`,
and `details.sourceCode` carries graph-io's own code (`E_INVALID_ID` for an id the format cannot
hold). Where the refusal lands depends on when graph-io finds the problem: what the writer's
`check()` finds up front (GML's integer ids, CSV's clashing ids) rejects `exportGraph` itself;
what it finds only while writing (GraphML's id tokens) rejects `text()` or the iteration of
`bytes`. Handle both. A format nothing writes is `E_UNKNOWN_FORMAT`, naming the ones that can be
written.

## Custom Data Sources

Read a format the element does not ship, or wrap a graph-io importer as one. See [Custom File Formats](./extending/custom-data-sources) for details.

## Interactive Examples

- [Data Loading](https://graphty.app/storybook/graphty-element/?path=/story/data--basic)
