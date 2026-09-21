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

## Supported Formats

| Format  | Extension  | Description                           |
| ------- | ---------- | ------------------------------------- |
| JSON    | `.json`    | Native format with nodes/edges arrays |
| GraphML | `.graphml` | XML-based graph format                |
| GEXF    | `.gexf`    | Gephi exchange format                 |
| GML     | `.gml`     | Graph Modeling Language               |
| DOT     | `.dot`     | Graphviz format                       |
| CSV     | `.csv`     | Comma-separated adjacency             |
| Pajek   | `.net`     | Pajek network format                  |

## Directed or Undirected

Most graph formats state whether their edges point, and the importer reports what the file said.
A GML file with no `directed` key, a GEXF file with no `defaultedgetype`, is not silent: both
formats define that omission as undirected, and so does graphty-element.

| Format | Where it states direction | When it states nothing |
| ------ | ------------------------- | ---------------------- |
| GEXF | `defaultedgetype` on `<graph>`, and `type` per edge | An absent attribute means undirected, unless the edges themselves say otherwise |
| GraphML | `edgedefault` on `<graph>`, and `directed` per edge | An absent attribute states nothing; GraphML requires it |
| GML | the `directed` key, 1 or 0 | An absent key means undirected |
| DOT | the opening `graph` or `digraph` keyword | -- |
| Pajek | `*Arcs` are directed, `*Edges` are not | -- |
| CSV | Gephi's `Type` column: `Directed` or `Undirected` | Every other dialect states nothing |
| JSON | a top-level `"directed"` boolean, as node-link JSON writes it | Any document without that key states nothing |

Read it back from the session:

```typescript
graph.getSession().data.statistics().directedness; // "directed" | "undirected" | "unknown"
```

**You have the last word.** `data.directed` defaults to `"auto"`, which is what lets the file
decide. Set it to a boolean and it settles the question: the file's own header is read, reported
in the log, and does not overrule you.

A format that can state direction per edge as well as per graph can describe a *mixed* graph, and
one graph carries one direction. A graph-level statement the file actually wrote is what the
element adopts: one `type` attribute must not decide how the other quarter of a million edges are
read. Where no graph-level statement was written -- Pajek and Gephi CSV, which have none to write,
and a GEXF file that left `defaultedgetype` out -- the edges are the file's only word on the
subject, and any directed edge among them makes the graph directed. That asymmetry is deliberate:
losing one direction of an undirected edge is countable, and counted, while reading a directed edge
as undirected invents a reverse path the file denies.

Either way each edge keeps its own direction on its record, and the element logs a warning naming
how many edges it overrode. Direction is settled once per graph: a second file loaded into a graph
that already holds edges cannot reinterpret the edges already in it, and that is logged too.

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
await graph.clear();
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

| Policy | What a repeated pair does |
| --- | --- |
| `keep` (default) | becomes a second edge with its own id |
| `first` | is discarded; the edge already present is untouched |
| `last` | replaces the weight and attributes of the edge already present |
| `sum` | adds its weight to the edge already present |
| `min` / `max` | keeps the smaller / larger of the two weights |
| `error` | throws `E_DUPLICATE_EDGE`, naming both endpoints |

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

## Custom Data Sources

Read a format the element does not ship. See [Custom File Formats](./extending/custom-data-sources) for details.

## Interactive Examples

- [Data Loading](https://graphty.app/storybook/element/?path=/story/data--default)
