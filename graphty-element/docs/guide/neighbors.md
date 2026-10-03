# Neighbors

`session.data.neighbors(id)` lists the nodes joined to one node, each once, with the combined
weight of the edges between them, strongest first. Two nodes joined by several edges are one
row. It is what an inspector reads when a node is clicked. `element.session` is the element's
session (see [the JavaScript API](./javascript-api.md)); `neighbors` answers at once, with no
`await`.

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
            li.classList.toggle("hidden", n.excludedBy !== undefined);
            return li;
        }),
    );
    list.setAttribute("aria-label", `${String(page.total)} connections`);
});
```

Importing the package registers the tag, so `querySelector("graphty-element")` is typed as the
element, with `session` and the `graphty-node-*` events on it. `e.detail.nodeId` is the clicked
node's id, a `NodeId` (`string | number`, exported from both entry points; `NodeIdType` is the
same type). The words, the `"hidden"` class and the aria-label are the example's own; the page
gives you only values.

With no `weight` option, the neighbors are weighed by the column the graph was loaded with: the
element's `edgeWeightPath` setting (`data.knownFields.edgeWeightPath`), `"weight"` unless you set
it. `page.measuredBy` then says `{ attribute: "weight", meaning: "strength" }`. When the graph
was loaded with no weight column, the page counts edges instead: `page.measuredBy` is `null`,
each row's `weight` equals its `edgeCount`, and the list is in name order.

The types are exported from both `@graphty/graphty-element` and
`@graphty/graphty-element/session`: `Neighbor`, `NeighborPage`, `NeighborOptions`,
`NeighborSort`, `WeightMeaning` and `NodeId`.

## What you get back

Each row is a `Neighbor`:

| Field        | What it holds                                                                                                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node`       | The neighbor's record, as `session.data.node(id)` returns it.                                                                                                                                                                                           |
| `name`       | The value of the node's label column (`data.knownFields.nodeLabelPath`) as text, or its id when it has none. Render as text.                                                                                                                            |
| `weight`     | A number: the combined weight of the edges between the two. When `page.measuredBy` is `null` it is the number of edges, the same as `edgeCount`.                                                                                                        |
| `edgeCount`  | A number: how many edges join the two, each counted once.                                                                                                                                                                                               |
| `excludedBy` | `{ kind: "filter" }` when the session's visibility hides the neighbor -- `visibility.set()` or `visibility.setWindow()`, which are one filter -- and absent otherwise. `"filter"` is the only kind. Hidden neighbors are listed, marked, never dropped. |

The page is a `NeighborPage`: `records`, `offset`, `total` (how many neighbors, not edges) and
`revision`, as [`nodePage`](./javascript-api.md#reading-records-a-page-at-a-time) returns, plus:

- `measuredBy`: the weight the rows were combined by, a `WeightMeaning`
  `{ attribute: string, meaning: "strength" | "distance" }`, or `null` when the rows count edges.
- `missing`: how many EDGES (not neighbors) had no number in the weight column. Each of them
  weighed 1, as it does in an algorithm run. Always 0 when `measuredBy` is `null`. So a column
  only some edges carry is fine: the rest show up here.

## Options

Every option is optional.

| Option      | Default                       | What it does                                                                                                                                                                                                                                                                                                                                                       |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `direction` | `"all"`                       | `"out"` follows only edges leaving the node and `"in"` only edges arriving at it. On an undirected graph all three are the same.                                                                                                                                                                                                                                   |
| `weight`    | the loaded weight, a strength | A `WeightMeaning`: `{ attribute: "calls", meaning: "strength" }`. `attribute` is an edge column; `meaning` is `"strength"` (larger is a stronger tie; several edges add up) or `"distance"` (smaller is closer; the shortest edge counts). `null` counts edges. A column no edge has throws `E_UNKNOWN_ATTRIBUTE`, with the nearest names in `details.candidates`. |
| `scope`     | `"graph"`                     | Which neighbors are listed: any scope, such as `"visible"`, `"selection"` or `{ set: id }`. The [scope table](./sets.md#kept-sets-and-inline-sets) lists them all. With `"graph"`, hidden neighbors are listed and marked; with `"visible"` they are left out.                                                                                                     |
| `sort`      | strongest first, else by name | `{ by: "weight" }` or `{ by: "name" }`: smallest first, or largest first with `descending: true`, whatever the weight means. So the default is `{ by: "weight", descending: true }` for a strength and `{ by: "weight" }` for a distance, and to reverse it you flip `descending`. Equal rows keep the order the nodes were added in.                              |
| `offset`    | `0`                           | Where the page starts.                                                                                                                                                                                                                                                                                                                                             |
| `limit`     | `100`                         | How many rows the page holds; `Infinity` reads them all, and `0` reads only `total`.                                                                                                                                                                                                                                                                               |

```ts
// Nearest first, by road distance, following only outgoing edges:
session.data.neighbors("depot", { weight: { attribute: "km", meaning: "distance" }, direction: "out" });

// How many edges join each neighbor, alphabetically:
session.data.neighbors("alice", { weight: null });
```

## The rules

- A neighbor is a node joined to this one by at least one edge along `direction`, other than
  the node itself: a self-loop never makes a node its own neighbor. These are exactly the nodes
  `selection.apply({ neighborsOf: [id], direction })` selects.
- A->B and B->A, read with `direction: "all"`, are one neighbor with `edgeCount` 2.
- A node the graph does not hold throws a `GraphtyError` with code `E_UNKNOWN_ELEMENT` and
  `details: { kind: "node", id }`. A node with no edges answers an empty page.
- A page you keep for later is current while its `revision` matches
  `session.data.nodePage({ limit: 0 }).revision`; once it differs, read again. A page read in the
  same handler that uses it never needs the check.
