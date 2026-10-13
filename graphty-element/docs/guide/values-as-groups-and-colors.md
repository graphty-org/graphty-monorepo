# Numbers as Groups, Colors as Colors, and Edge Ends

`session.data.readableValues()` (see [Listing Readable Values](./readable-values)) says three
more things about a value, so a "color by" picker can offer the right choice without reading the
data itself:

- `valueCount` on a number: how many distinct values it holds, when there are 256 or fewer. A
  column of codes such as a conference number (0 to 11) is a set of groups, not an amount, so you
  can offer "one color per value" through the `ordinal` scale.
- `valuesAreColors`: every value is text the element reads as a color, so the `passthrough` scale
  paints each value as it is.
- `end` on an edge entry: the value is read from the node at one end of each edge, `"source"` or
  `"target"`, so edges can be selected or painted by a value their nodes carry.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
await session.data.addNodes([
    { id: "a", conference: 0, tint: "#d55e00" },
    { id: "b", conference: 1, tint: "#0072b2" },
    { id: "c", conference: 1, tint: "#009e73" },
]);
await session.data.addEdges([
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
]);

const values = session.data.readableValues();
const conference = values.find((v) => v.path === "data.conference");
const tint = values.find((v) => v.path === "data.tint");
const edgeEnd = values.find((v) => v.on === "edge" && v.end === "source" && v.plainName === "conference");
console.log(conference?.kind, conference?.valueCount);
console.log(tint?.valuesAreColors);
console.log(edgeEnd?.path);

// One color per conference, and each edge painted by its source's conference.
await session.styles.add({
    name: "Conference",
    target: "node",
    selector: { match: "everything" },
    encode: { "node.color": { by: "data.conference", scale: "ordinal" } },
});
await session.styles.add({
    name: "Edges by source",
    target: "edge",
    selector: { match: "everything" },
    encode: { "edge.color": { by: "graphty.source.data.conference", scale: "ordinal" } },
});
```

This prints:

```text
number 2
true
graphty.source.data.conference
```

## Painting colors as they are

When `valuesAreColors` is set, bind the column with the `passthrough` scale, and each node is
painted the color it names:

```ts
await session.styles.add({
    name: "Own tint",
    target: "node",
    selector: { match: "everything" },
    encode: { "node.color": { by: "data.tint", scale: "passthrough" } },
});
```

## What an edge-end entry says

An edge-end entry's `plainName`, `technicalName`, `kind`, `range` and `valueCount` are those of the
node value it reads, measured over the nodes. Its `path` is `graphty.source.<node path>` or
`graphty.target.<node path>`, and it works anywhere a path does: as a binding's `by`, as above, or
in a rule, such as edges whose source is named "Valjean":

```ts
const rule = { kind: "text", reads: "graphty.source.data.name", mode: "exact", text: "Valjean" } as const;
```

Rules are described in [Rules & Text Matching](./style-rules).
