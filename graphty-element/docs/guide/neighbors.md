# Neighbors

`session.data.neighbors(id)` lists the nodes joined to one node, each once, with the combined
weight of the edges between them, strongest first. Two nodes joined by several edges are one
row. It is what an inspector reads when a node is clicked.

## Quick start

Click a node and list its ten strongest neighbors:

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const list = document.querySelector("#neighbors")!;

element.addEventListener("graphty-node-click", (e) => {
    const page = element.session.data.neighbors(e.detail.nodeId, { limit: 10 });
    list.replaceChildren(
        ...page.records.map((n) => {
            const li = document.createElement("li");
            li.textContent = page.measuredBy ? `${n.name}: ${String(n.weight)}` : n.name;
            return li;
        }),
    );
    list.setAttribute("aria-label", `${String(page.total)} connections`);
});
```

With no options, the weight is the one the graph was loaded with (a `weight` column, for most
files), and `page.measuredBy` says which column that was. A graph loaded with no weight counts
edges instead: `page.measuredBy` is `null` and the list is in name order. The words around the
numbers are yours to choose; the page gives you only the values.

## What you get back

Each row is a `Neighbor`:

| Field        | What it holds                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `node`       | The neighbor's record, as `session.data.node(id)` returns it.                                                                    |
| `name`       | The value of the node's label column (`data.knownFields.nodeLabelPath`) as text, or its id when it has none. Render as text.     |
| `weight`     | The combined weight of the edges between the two; the number of edges when the page counts edges.                                |
| `edgeCount`  | How many edges join the two, each counted once.                                                                                  |
| `excludedBy` | `{ kind: "filter" }` when a filter or the time window hides the neighbor; absent otherwise. Hidden neighbors are listed, marked. |

The page is a `NeighborPage`: `records`, `offset`, `total` (how many neighbors, not edges) and
`revision`, as [`nodePage`](./javascript-api.md#reading-records-a-page-at-a-time) returns, plus:

- `measuredBy`: the weight the rows were combined by, `{ attribute, meaning }`, or `null` when
  they count edges.
- `missing`: how many of the edges had no number in the weight column. Each of them weighed 1,
  as it does in an algorithm run.

## Options

Every option is optional.

| Option      | Default                       | What it does                                                                                                                                                                                                              |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `direction` | `"all"`                       | `"out"` follows only edges leaving the node and `"in"` only edges arriving at it. On an undirected graph all three are the same.                                                                                          |
| `weight`    | the loaded weight, a strength | `{ attribute, meaning }`, as algorithm runs take it. A `"strength"` adds its edges up; a `"distance"` takes the shortest. `null` counts edges. A column no edge has throws `E_UNKNOWN_ATTRIBUTE`, with the nearest names. |
| `scope`     | `"graph"`                     | Which neighbors are listed, such as `"selection"` or `{ set: id }`.                                                                                                                                                       |
| `sort`      | strongest first, else by name | `{ by: "weight" }` or `{ by: "name" }`, smallest first, or largest first with `descending: true`. "Strongest" is the largest strength or the smallest distance. Equal rows keep the order the nodes were added in.        |
| `offset`    | `0`                           | Where the page starts.                                                                                                                                                                                                    |
| `limit`     | `100`                         | How many rows the page holds; `Infinity` reads them all.                                                                                                                                                                  |

```ts
// Nearest first, by road distance, following only outgoing edges:
session.data.neighbors("depot", { weight: { attribute: "km", meaning: "distance" }, direction: "out" });

// How many edges join each neighbor, alphabetically:
session.data.neighbors("alice", { weight: null });
```

## The rules

- A neighbor is exactly a node `selection.apply({ neighborsOf: [id], direction })` selects,
  other than the node itself. A self-loop never makes a node its own neighbor.
- A->B and B->A, read with `direction: "all"`, are one neighbor with `edgeCount` 2.
- A node the graph does not hold throws a `GraphtyError` with code `E_UNKNOWN_ELEMENT` and
  `details: { kind: "node", id }`. A node with no edges answers an empty page.
- Hold a page as long as `revision` matches `session.data.nodePage({ limit: 0 }).revision`; once
  it differs, read again.
