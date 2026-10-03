# Labels

A node label is drawn when a style layer asks for one. When labelled nodes sit close together on
screen, their words land on top of each other. The element can hide a label that would overlap one
it keeps, and it tells you how many it hid and which, so you can say so to the reader.

## Quick start

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { session } = element;
const status = document.querySelector("#label-status")!;

// Label every node with its name
await session.styles.add({
    name: "Names",
    target: "node",
    selector: { match: "everything" },
    encode: { "node.label": { by: "data.name", scale: "passthrough" } },
});

// Hide a name that would be drawn on top of another, and say how many are hidden
await session.labels.setDeclutter(true);
session.on("labels:changed", ({ requested, hiddenByOverlap }) => {
    status.textContent = `${requested} names, ${hiddenByOverlap} hidden to avoid overlap`;
});

// Is this node's name one of the hidden ones?
const hidden = session.labels.hiddenIds().includes("javert");

// Show every name again. One step, which undo takes back
await session.labels.setDeclutter(false);
```

- **Which label stays.** A selected node's label is kept first, then the label of the node with
  more edges, then the node with the smaller id. Select a node and its name is drawn.
- **The counts follow the picture.** `labels:changed` fires whenever what is hidden changes: the
  camera moves, a node moves, a label layer is added or removed, the selection changes, or the
  switch is flipped. `session.labels.counts()` reads the same numbers at any time.
- **What the numbers mean.** `requested` is every label a style asks for on a node that is
  showing, `hiddenByOverlap` is how many of those the rule hid, and `drawn` is the difference. A
  label outside the view is not hidden by the rule, so it counts as drawn.
- **The switch is saved with the project.** `setDeclutter` writes the same setting as
  `session.config.set({ layoutBehavior: { labels: { declutter } } })` and as the element's
  `layoutBehavior` property. It is off by default, so a graph draws every label a style asks for
  until you turn it on.
- **Without a screen there is nothing to hide.** A session with no element drawing it (one made
  with `createGraphSession` in Node) counts zero.

## Reference

| Member                             | What it is                                                           |
| ---------------------------------- | -------------------------------------------------------------------- |
| `session.labels.counts()`          | `{ requested, drawn, hiddenByOverlap }` as of the last frame         |
| `session.labels.hiddenIds()`       | The ids of the nodes whose label is hidden, the most important first |
| `session.labels.declutter`         | Whether the overlap rule is on                                       |
| `session.labels.setDeclutter(on)`  | Turn the rule on or off; one undoable step                           |
| `session.on("labels:changed", fn)` | `fn` gets the new counts whenever they or the hidden ids change      |
