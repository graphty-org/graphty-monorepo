# One Row for Nodes and Edges

A style layer paints nodes or edges. When one idea covers both -- "team A, and the edges touching
it" -- add a row with `styles.addRow` and `target: "both"`. The row shares one rule between its
nodes and its edges, and each value you write goes to whichever kind has it.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
await session.data.addNodes([
    { id: "a", team: "A" },
    { id: "b", team: "A" },
    { id: "c", team: "B" },
]);
await session.data.addEdges([
    { source: "a", target: "b" },
    { source: "b", target: "c" },
]);

const row = await session.styles.addRow({
    name: "Team A",
    target: "both",
    selector: {
        match: "rule",
        where: { kind: "categories", attribute: "data.team", values: ["A"] },
        edges: "incident",
    },
    set: { color: "#d55e00", width: 2 }, // color reaches nodes and edges; width only edges
});

console.log(session.styles.counts(row.node!).matched, "nodes"); // 2 nodes
console.log(session.styles.counts(row.edge!).matched, "edges"); // 2 edges
```

## Writing to a row

`set` and `encode` take either a property (`color`, `size`, `width`) or a full channel
(`"node.color"`). A property goes to every kind that has it: `color` paints the nodes and the edges,
`size` only the nodes, `width` only the edges. A full channel goes to that kind alone.

To change a row later, `styles.writeRow(row.id, { set: { color: "#009e73" } })`. A key set to
`undefined` clears it, so the layers beneath show again. `name` and `enabled` reach the whole row.

## Which edges

`edges` says which edges a rule about nodes holds:

- `"induced"` -- the edges between two matched nodes ("between them").
- `"incident"` -- the edges with at least one matched end ("touching them").
- `"clipped"` (the default) -- the edges between matched nodes, read as the visibility filter
  reads them.

In the example, `"incident"` holds both edges, because each touches team A; `"induced"` would hold
only `a`-`b`.

## One row, two layers

`styles.list()` still returns one layer per kind, each with its own `target`, so code that reads
layers is unchanged. The row is what a layers panel shows: `styles.tree()` lists it once,
`styles.parts(id)` returns its `node` and `edge` layers, and moving, hiding, locking or deleting the
row acts on both, in one undo step.
