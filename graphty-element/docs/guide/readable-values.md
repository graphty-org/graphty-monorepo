# Listing the Values a Style Can Read

A "color by", "size by" or "which nodes" picker needs one list: every value a binding or a rule can
read. `session.data.readableValues()` returns it, the node id first, then each data column, then
each field a finished algorithm run published per node or edge. Each entry is facts only (a path,
a kind, a range or a count), so you choose how to word, group and order the list.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
await session.data.addNodes([
    { id: "a", age: 30, team: "red" },
    { id: "b", age: 45, team: "blue" },
    { id: "c", age: 52 },
    { id: "d", age: 61, team: "red" },
]);

for (const value of session.data.readableValues()) {
    console.log(value.path, value.kind, value.range ?? value.valueCount, value.completeness);
}
```

This prints:

```text
id text undefined 1
data.id text undefined 1
data.age number { min: 30, max: 61 } 1
data.team category 2 0.75
```

The first line is the node id itself, which a rule can match on; the second is the `id` column
the data carried, a separate entry. `team` is missing on one node in four, so its `completeness`
is 0.75.

## What each entry says

- `path` -- what a binding's `by` or a rule's leaf reads: `"id"`, `data.<column>`, or
  `results.<run>.<field>`. Every entry has its own path.
- `plainName`, `technicalName` -- the column's own name, or the run field's catalog names.
- `on` -- `"node"` or `"edge"`: which kind carries the value.
- `from` -- `"element"` for the node id, `"data"` for a column, `"run"` for a run's field, with
  `runId` naming the run.
- `kind` -- `"number"`, `"category"`, `"text"` or `"yes-no"`. A community run's group is a category
  however its ids are spelled.
- `range` -- the lowest and highest value of a number. `valueCount` -- how many distinct values a
  category or a yes-or-no has, and a number too when it holds 256 or fewer.
- `valuesAreColors` -- present when every value is a color, and `end` -- present on an edge entry
  that reads a value of the node at one end; see
  [Numbers as Groups, Colors as Colors, and Edge Ends](./values-as-groups-and-colors).
- `completeness` -- the share of nodes (or edges) that carry a value, from 0 to 1.
- `fits` -- the kinds of style channel the value can drive with no scale named (`"color"`,
  `"number"`, `"enum"`, `"text"`, `"boolean"`): exactly the channels
  `styles.proposeEncoding({ column })` proposes a binding for. Empty for the node id, which only a
  rule reads.
- `usedBy` -- what reads the value now: each style layer that selects or paints by it, then (for a
  data column) each run that weighed its edges by it. Absent when nothing does, so a picker can
  list the values already in use first.

```ts
const layer = await session.styles.add({
    name: "By age",
    target: "node",
    selector: { match: "everything" },
    encode: { "node.size": { by: "data.age" } },
});
session.data.readableValues().find((v) => v.path === "data.age")?.usedBy;
// [{ kind: "layer", id: layer.id }]
```

## Keeping the list current

The list follows the data, the runs and the layers: a new column or a finished run adds entries,
and a new layer changes `usedBy`. Read it again after a data change or a `style:changed` event, as you would
[the counts of a layer](./layer-counts).

To bind a value, pass its `path` as the `by` of an encoding (see
[Coloring by a Column](./column-encoding)); to select by it, use it in a rule (see
[Rules & Text Matching](./style-rules)).
