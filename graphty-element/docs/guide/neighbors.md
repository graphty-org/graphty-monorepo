# Neighbors

`session.data.neighbors(id)` lists the nodes joined to one node, one row per neighbor, with how
strongly they are tied. Two nodes joined by several edges are one row: their edges are listed
together and their weights add up to one tie. It is what an inspector reads to show "Valjean, 17
shared chapters".

## Quick start

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { session } = element;
await session.data.addNodes([{ id: "Javert" }, { id: "Valjean" }, { id: "Cosette" }]);
await session.data.addEdges([
    { source: "Javert", target: "Valjean", "shared chapters": 10 },
    { source: "Valjean", target: "Javert", "shared chapters": 7 },
    { source: "Javert", target: "Cosette", "shared chapters": 2 },
]);

// Javert's neighbors, strongest tie first
const page = session.data.neighbors("Javert", { weight: "shared chapters" });
for (const row of page.records) {
    console.log(`${String(row.node.id)}, ${String(row.tie)} shared chapters`);
}
// Valjean, 17 shared chapters
// Cosette, 2 shared chapters
page.total; // 2
```

## Options

Every option is optional.

| Option      | Default | What it does                                                                                                                                                    |
| ----------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weight`    | none    | The edge attribute whose values add up to the tie. Without it, each edge counts 1, so the tie is the number of edges. A value that is not a number adds 0.      |
| `direction` | `"all"` | On a directed graph, `"out"` follows only edges leaving the node and `"in"` only edges arriving at it. An undirected graph follows every edge whatever it says. |
| `sort`      | `"tie"` | `"tie"` lists the strongest tie first; `"graph"` lists neighbors in the order they were added. Equal ties keep that order too.                                  |
| `offset`    | `0`     | Where the page starts.                                                                                                                                          |
| `limit`     | `100`   | How many rows the page holds; `Infinity` reads them all.                                                                                                        |

Each row holds `node` (the neighbor's record), `edges` (the ids of the edges between the two,
which `session.data.edge(id)` reads) and `tie`. The page also carries `total`, for "17
connections", and `revision`, which changes whenever the graph does, as for
[`nodePage`](./javascript-api.md#reading-records-a-page-at-a-time).

A node joined only to itself has no neighbors, and a node the graph does not hold answers an
empty page rather than an error.
