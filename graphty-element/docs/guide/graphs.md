# Several Graphs

A session can hold several graphs and show one at a time. Copy the graph shown, or only the part
of it a reader selected, into a new graph; then switch between them. Each graph keeps its own
attributes, algorithm results, styles, sets, saved views and notes.

## Quick start

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { session } = element;
await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
await session.data.addEdges([
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
]);

// Copy the selected nodes, and the edges between them, into a new graph, and show it
await session.selection.apply({ ids: ["a", "b"] });
const picked = await session.graphs.create({ from: "selection", name: "Picked" });

// Back to the first graph, then to the copy again
await session.graphs.switch("graph-1");
await session.graphs.switch(picked.id);

// For a switcher: every graph, and which one is shown
session.graphs.list(); // [{ id: "graph-1", name: null, current: false }, { id: "graph-2", name: "Picked", current: true }]
```

## What to know

| Call                   | What it does                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `graphs.list()`        | Every graph, in the order they were made: `{ id, name, current }`. A session starts with one, `graph-1`.                                           |
| `graphs.currentId`     | The id of the graph shown.                                                                                                                         |
| `graphs.create(opts?)` | Copies the graph shown into a new graph and shows it. `from` takes any scope (`"selection"`, `{ set: id }`, `{ where }`); default the whole graph. |
| `graphs.switch(id)`    | Shows another graph. An id no graph has is refused with `E_BAD_COMMAND`.                                                                           |

- Every other part of the session (`session.data`, `session.styles`, `session.runs`, ...) reads and
  writes the graph shown.
- A copy keeps the nodes `from` covers and every edge between two of them.
- Switching starts the shown graph's undo history afresh, as opening a project does; a copy's
  history starts at the copy.
- A project file holds the graph shown.
