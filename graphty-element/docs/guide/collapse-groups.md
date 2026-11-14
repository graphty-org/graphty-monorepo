# Collapsing Groups

> **Experimental.** `session.groups` and the `_group.` attributes may change in a minor release.

A group of nodes -- a community a run found, a connected piece, or every node sharing a value such
as a team -- can be collapsed to one node and expanded again. Each call is one undoable step, and a
collapsed group is saved with the project.

## Collapse and expand

```ts
const element = document.querySelector("graphty-element");
const session = element.session;

// Find the communities, then collapse the first one to a single node.
const run = await session.runs.start("louvain");
const node = await session.groups.collapse({ run, group: 0 });

// Make collapsed nodes bigger the more members they stand for.
await session.styles.add({
    name: "Collapsed groups",
    target: "node",
    selector: { match: "has", path: "data._group.size" },
    encode: {
        "node.size": {
            by: "data._group.size",
            stops: [
                { at: 1, value: 1 },
                { at: 50, value: 4 },
            ],
        },
    },
});

// Put every member back where it was.
await session.groups.expand({ run, group: 0 });
```

A group is named in one of two ways:

| Form                                     | Means                                                            |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `{ run, group }`                         | the nodes a grouping run put in `group` (its primary field)      |
| `{ groupBy: "data.team", group: "red" }` | the nodes holding `"red"` at that path, a column or a run's path |

`session.groups.list()` gives every group collapsed now: `{ groupBy, group, node, size }`.

## What a collapse does

- The members leave the graph and one node takes their place, at the centre of where they stood.
- Their edges to each node outside the group become one edge to that node. Edges among the members
  go with them.
- Expanding puts every member back with its record, its coordinates, its pin and its edges, exactly
  as they were.
- Two groups can be collapsed at once; an edge between them becomes one edge between the two
  collapsed nodes, and expanding them in either order gives back the same graph.

## What the collapsed node and its edges carry

These are values, like any column, for style layers and filters to read. graphty-element draws a
collapsed node like any other node until a layer says otherwise.

| Attribute       | On                  | Value                                                   |
| --------------- | ------------------- | ------------------------------------------------------- |
| `_group.size`   | the collapsed node  | how many members it stands for                          |
| `_group.by`     | the collapsed node  | the path its members were grouped by                    |
| `_group.value`  | the collapsed node  | their value at that path                                |
| `_group.count`  | an edge standing in | how many edges it stands for                            |
| `_group.weight` | an edge standing in | their summed `weight` (an edge without one counts as 1) |

## Undo, transactions and saving

`session.undo()` takes a collapse or an expand back in one step; its history fact is
`groups.collapse` or `groups.expand` with `{ groupBy, group, size }`. Called through
`session.transaction`, `tx.groups.collapse` joins the transaction's step.

A collapse is part of the graph's data, so `session.project.save()` keeps it and
`session.project.open()` brings it back ready to expand.

Refusals are `GraphtyError`s coded `E_BAD_COMMAND`: a group with no member in the graph, collapsing a
group collapsed already, or expanding one that is not collapsed.
