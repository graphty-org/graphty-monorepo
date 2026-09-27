# Algorithms

Guide to running graph algorithms and using results for visualization.

## Overview

Graphty includes a comprehensive set of graph algorithms for analysis. Run algorithms to compute metrics like centrality, detect communities, find shortest paths, and more. Results can be visualized using the styling system.

## Running Algorithms

```typescript
// Run an algorithm
await graph.runAlgorithm("graphty", "degree");

// namespace: 'graphty' (built-in algorithms)
// type: algorithm name
```

## Algorithm Categories

### Centrality Algorithms

Measure node importance:

| Algorithm     | Description                             |
| ------------- | --------------------------------------- |
| `degree`      | Number of connections                   |
| `betweenness` | How often a node is on shortest paths   |
| `closeness`   | Average distance to all other nodes     |
| `pagerank`    | Influence based on incoming links       |
| `eigenvector` | Influence from well-connected neighbors |

```typescript
await graph.runAlgorithm("graphty", "degree");
await graph.runAlgorithm("graphty", "pagerank");
await graph.runAlgorithm("graphty", "betweenness");
```

`eigenvector` stops after `maxIterations` power-iteration passes (default 1000, at most 10000). If it
has not met `tolerance` by then the run fails with a `GraphtyError` whose code is
`E_NOT_CONVERGED`, rather than publishing scores that are not the answer. Long paths and large
grids need more passes; raise the param and run it again:

```typescript
await graph.runAlgorithm("graphty", "eigenvector", { algorithmOptions: { maxIterations: 5000 } });
```

### Community Detection

Find clusters of related nodes:

| Algorithm           | Description                    |
| ------------------- | ------------------------------ |
| `louvain`           | Fast community detection       |
| `label-propagation` | Iterative community assignment |
| `modularity`        | Optimize modularity score      |

```typescript
await graph.runAlgorithm("graphty", "louvain");
```

### Component Analysis

Find connected subgraphs:

| Algorithm              | Description                           |
| ---------------------- | ------------------------------------- |
| `connected-components` | Find all connected components         |
| `strongly-connected`   | Strong connectivity (directed graphs) |

```typescript
await graph.runAlgorithm("graphty", "connected-components");
```

### Traversal Algorithms

Explore the graph systematically:

| Algorithm | Description          |
| --------- | -------------------- |
| `bfs`     | Breadth-first search |
| `dfs`     | Depth-first search   |

```typescript
await graph.runAlgorithm("graphty", "bfs", { startNode: "node1" });
```

### Shortest Path

Find optimal paths between nodes:

| Algorithm      | Description                 |
| -------------- | --------------------------- |
| `dijkstra`     | Shortest path (weighted)    |
| `bellman-ford` | Handles negative weights    |
| `a-star`       | Heuristic-based pathfinding |

```typescript
await graph.runAlgorithm("graphty", "dijkstra", {
    source: "node1",
    target: "node5",
});
```

### Spanning Tree

Find minimum spanning trees:

| Algorithm | Description         |
| --------- | ------------------- |
| `prim`    | Prim's algorithm    |
| `kruskal` | Kruskal's algorithm |

```typescript
await graph.runAlgorithm("graphty", "prim");
```

### Flow Algorithms

Network flow analysis:

| Algorithm  | Description                |
| ---------- | -------------------------- |
| `max-flow` | Maximum flow between nodes |
| `min-cut`  | Minimum edge cut           |

```typescript
await graph.runAlgorithm("graphty", "max-flow", {
    source: "source",
    sink: "sink",
});
```

## Accessing Results

A run hands back its own result. Nothing has to be found by walking the graph:

```typescript
const run = await element.run("degree");

// One element
console.log(run.result.node("node1")?.value);

// The shape of the whole thing, computed once
const summary = run.result.summary();
console.log(summary.max, summary.min, summary.top[0].id);
```

The same values are published as columns under the run's id, which is what a style layer and a
filter read: `results.<runId>.value`.

## Suggested Styles

A run paints itself on its first completion. For a run started with `{style: false}`, or to put a
picture back after a reader cleared it, ask for the suggestion again:

```typescript
await element.run("degree");

element.applySuggestedStyles("degree");

// Only when you need the finished picture, for a screenshot or an export:
await element.waitForStableFrame();
```

This automatically maps algorithm results to visual properties like color and size.
`applySuggestedStyles` returns `true` or `false` straight away and paints in the background;
`waitForStableFrame()` settles once the suggested layers are stacked and painted.

## Custom Styling with Algorithm Results

A run publishes its measurements under its own id, so a layer reads them the way it reads any
other column -- `results.<runId>.<field>`:

```typescript
const run = await element.run("degree");

// Highlight high-degree nodes
await element.session.styles.add({
    name: "Hubs",
    target: "node",
    selector: { match: "expression", where: `results.${run.id}.value > \`10\`` },
    set: { "node.color": "#E74C3C", "node.size": 2 },
});
```

**Select only the elements the run measured.** A layer that matched everything would run its
expression over nodes the algorithm has nothing to say about, and whatever the expression
returned for them would be painted onto them.

## Encoding a result onto a channel

For a ramp or a palette across everything a run measured, bind the channel to it rather than
writing out a rule per element. The scale, the palette and the extent all default to something
that suits the field:

```typescript
const run = await element.run("pagerank");

// Size every measured node by its rank, on one call
await element.session.styles.encode({ run, channel: "node.size" });

// And colour it, through a palette of your choosing
await element.session.styles.encode({ run, channel: "node.color", palette: "viridis" });
```

`encode()` replaces the layer already painting that channel from that run, so running the
algorithm again leaves one layer and one legend block rather than two.

### Sizing by a measurement in one flag

A node measurement -- PageRank, degree, betweenness and the rest -- can size the nodes as well as
colour them, asked for when the run starts:

```typescript
// Colour AND size by PageRank. Sizes run from 1 (the default node size) to 3.
element.run("pagerank", {}, { style: { size: true } });

// Or pick the range
element.run("pagerank", {}, { style: { size: [1, 5] } });
```

`style: true` (the default) paints the colour alone and `style: false` paints nothing. `size` is
ignored for a result that is not a node measurement -- a community has no amount to size by. The
size layer paints only the nodes the run measured and is removed with the run.

### Running algorithms when the data loads

`algorithmsOnLoad` lists algorithms to run once the data has loaded, and `runAlgorithmsOnLoad`
switches the list on. An entry is an algorithm name -- a catalogue key such as `"degree"` or a
1.x address such as `"graphty:degree"` -- or an object carrying the same run options
`element.run()` takes. The list is a property, set from script; the switch is also the
`run-algorithms-on-load` attribute:

```typescript
element.algorithmsOnLoad = ["degree", { algorithm: "pagerank", style: { size: [1, 5] } }];
element.runAlgorithmsOnLoad = true;
```

| Option      | Meaning                                                               |
| ----------- | --------------------------------------------------------------------- |
| `algorithm` | Required. The algorithm, as a name above                              |
| `params`    | Its parameters, as `run()` takes them                                 |
| `style`     | What it paints: `true`, `false`, or `{ size: true \| [min, max] }`    |
| `seed`      | The seed for a randomised method, so the load is reproducible         |
| `as`        | The run's id, for a saved document or a later `session.runs.get()`    |

The other `run()` options are not accepted here, because each one answers a question nobody can
ask before the data arrives: `signal`, `onProgress` and `queue` steer a run someone is watching,
`scope` names a view of data that does not exist yet, and `timeBoxMs`, `exact` and `sample`
respond to a cost estimate. Start the run yourself when you need them. A misspelled or malformed
entry is refused with a `GraphtyError` coded `E_BAD_COMMAND` that names the entry and its position.

### More groups than colours

The default palette for groups, Okabe-Ito, has eight colours that stay apart for every kind of
colour vision. When a community run finds more groups than that, `encode()` decides with
`overflow`:

```typescript
// Default: the 8 largest groups keep their colours; the rest share one grey,
// and the legend's last row reads "other: K groups"
await element.session.styles.encode({ run, channel: "node.color" });

// Cycle the colours and change node shape on each cycle: group 9 is orange again, as a box
await element.session.styles.encode({ run, channel: "node.color", overflow: "shape" });

// A colour per group, however many -- past eight they are not guaranteed to be told apart
await element.session.styles.encode({ run, channel: "node.color", overflow: "extend" });
```

`"shape"` is for nodes only; an edge encoding refuses it. If you name a `palette` and no
`overflow`, a palette too small for the groups is refused with `E_CAP_EXCEEDED` rather than
folded, because you asked for exactly those colours; name an `overflow` as well to apply it.

## Multiple Algorithms

Run several and let each paint a channel of its own:

```typescript
const degree = await element.run("degree");
const communities = await element.run("louvain");

await element.session.styles.encode({ run: communities, channel: "node.color" });
await element.session.styles.encode({ run: degree, channel: "node.size" });
```

Layers stack, so the two do not fight: one decides colour, the other decides size, and
`session.styles.legend()` describes both.

## Custom Algorithms

Create your own algorithms. See [Custom Algorithms](./extending/custom-algorithms) for details.

## Interactive Examples

- [Centrality Algorithms](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-centrality--degree)
- [Community Detection](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-community--louvain)
- [Components](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-component--connected-components)
- [Shortest Path](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-shortest-path--dijkstra)
- [Traversal](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-traversal--bfs)
- [Spanning Tree](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-spanning-tree--prim)
- [Combined Algorithms](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-combined--centrality-vs-community)
