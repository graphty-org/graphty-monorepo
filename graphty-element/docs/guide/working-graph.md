# Reading What Is Shown

A visibility filter and the time window hide part of a graph without deleting it. Set
`working-graph="visible"` and every reader that names no scope -- counts, pages, statistics,
runs, layouts, Fit, the selection -- reads only what is shown. The whole graph is still there, and
any reader gives it back when you ask for it by name with `scope: "graph"`.

```html
<graphty-element working-graph="visible"></graphty-element>
<script type="module">
    import "@graphty/graphty-element";

    const graph = document.querySelector("graphty-element");
    const { session } = graph;
    await session.data.addNodes([
        { id: "a", team: "red" },
        { id: "b", team: "red" },
        { id: "c", team: "blue" },
    ]);
    await session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ]);
    await session.visibility.set({ kind: "categories", attribute: "data.team", values: ["red"] });

    await session.layout.set("circular"); // lays out a and b only
    console.log(session.data.statistics().nodeCount); // 2
    console.log(session.data.statistics({ scope: "graph" }).nodeCount); // 3
    await session.runs.start("pagerank"); // ranks a and b
    await graph.applyCameraView("fitToGraph"); // frames a and b
</script>
```

## The two modes

| `workingGraph`           | A reader that names no scope reads                                         |
| ------------------------ | -------------------------------------------------------------------------- |
| `"documented"` (default) | what that reader documents: runs read what is shown, `nodePage` every node |
| `"visible"`              | what the filter and the time window leave shown                            |

Set it with the `working-graph` attribute, the `workingGraph` property,
`createGraphSession({ workingGraph })` or `session.config.setWorkingGraph(mode)`, and read it back
as `session.config.workingGraph`. It is not saved in a project file, so a project opened by
another page keeps that page's choice. A layout that the switch starts again is finished when
`graph.waitForSettled()` resolves.

## Hidden things keep everything

Nothing is copied. A hidden node keeps its position, its style, its run results, its notes and
its place in the selection. Show it again and it is back as it was. Lookups by id --
`data.node(id)`, `data.edge(id)`, notes, positions -- answer for hidden and shown alike.

## Asking for the whole graph

Name the whole graph with `scope: "graph"`:

```ts
session.data.nodePage({ scope: "graph" }); // every node, hidden ones included
session.find("bob", { scope: "graph" }); // hidden hits are marked
await graph.applyCameraView("fitToGraph", { scope: "graph" }); // frames every node
graph.layoutScope = "graph"; // a layout over the whole graph under a filter
```

A filter's own conditions always read the whole graph: what is shown is what they compute.

## Style rules

Painting matches over the whole graph, since a hidden node draws nothing. Two options choose what
a rule ranks or measures:

- A `threshold` rule ranks the whole column by default. Add `within: "visible"` to rank only what
  is shown, so "the top 3" is the top 3 of what is drawn. It ranks again when the filter changes.
- An encoded style reads its automatic domain (and a clamp's percentiles and the cut points of a
  grouping by equal counts) from the whole column. Add `domainFrom: "visible"` to read it from
  what is shown.

```ts
await session.styles.add({
    name: "Top 3 shown",
    target: "node",
    selector: { match: "rule", where: { kind: "threshold", path: "data.score", top: 3, within: "visible" } },
    encode: { "node.color": { by: "data.score", palette: "viridis", domainFrom: "visible" } },
});
```

`styles.counts(id).visible` says how many shown elements a layer selects and paints; see
[Counting What a Layer Paints](./layer-counts).

## Algorithms you register

A run with no `scope` reads `"visible"`: what the filter and the time window show, in either
mode. An algorithm registered with `Algorithm.register` that does not read scopes is handed the
whole graph in `"documented"` mode, and only what is shown in `"visible"` mode. One built with
`defineAlgorithm` computes over the run's scope in `"visible"` mode.

## Knowing when it changes

`working-graph:changed` fires when what is shown or the mode changes, with
`{ mode, nodeCount, edgeCount, settled }`. `settled` is false while a time window slider is dragged
or a condition is being edited; read topology again when it is true.

```ts
session.on("working-graph:changed", ({ nodeCount, settled }) => {
    if (settled) {
        console.log(`${String(nodeCount)} nodes shown`);
    }
});
```

## The advanced path

`session.data.working()` is the shown graph itself: `nodeCount`, `edgeCount`, `has(id)`,
`nodeIds()`, `edgeIds()`, and `snapshot()`, a compact graph-format snapshot built once per state
and shared by every reader, with `originalNodeRow(row)` and `compactNodeRow(row)` to map rows back
and forth. It answers in either mode, so an extension can read what is shown on its own.
