# Everything, Selected and Hovered

A layers panel usually starts with three rows: one at the bottom for the whole graph, and two at
the top for what the reader has selected and what the pointer is over. Turn on the project setting
`startingRows` and the element adds them for you, as ordinary rows you can edit, hide, delete and
bring back.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
await session.data.addNodes([{ id: "a" }, { id: "b" }]);

await session.config.set({ startingRows: true });
for (const row of session.styles.tree()) console.log(row.name, row.pin);
// Everything bottom, Selected top, Hovered top

// Hovered is an ordinary row: give it a glow, and it follows the pointer.
const hovered = session.styles.tree().find((row) => row.name === "Hovered")!;
await session.styles.writeRow(hovered.id, { set: { "node.glow": "#ffcc00" } });

session.selection.hover("a");
console.log(session.styles.counts(hovered.id).matched); // 1
```

## The three rows

| Row        | Paints                       | Pinned | Starts out writing                                             |
| ---------- | ---------------------------- | ------ | -------------------------------------------------------------- |
| Everything | every node and edge          | bottom | nothing                                                        |
| Selected   | the selected nodes and edges | top    | a halo on nodes and a band on edges, at today's selection look |
| Hovered    | the node under the pointer   | top    | nothing                                                        |

Selected and Hovered use the selector `{ match: "state", state: "selected" }` (or `"hovered"`),
which you can use in any layer of your own. They follow the selection and the pointer as they
change, and following them is not an undo step.

With `startingRows` on, the selection look is drawn by the Selected row, so recoloring the halo is
a write to that row (`"node.haloColor"`, `"edge.bandColor"`), and the `selectionStyle` setting
draws nothing itself. With it off (the default), nothing changes: there are no starting rows and
`selectionStyle` draws the selection as before.

A layer you add lands between them: above Everything, below Selected and Hovered.

## Deleting and restoring

The three rows are deleted like any other row, with `styles.deleteRow`. `styles.restoreStartingRows()`
adds back whichever of them are missing, in their places, as one undo step, and returns the rows it
added.

## Where a run's layer lands

A finished run that paints a suggested layer puts it beneath your own layers by default. Set
`runPlacement: "top"` and it lands on top of the unpinned stack instead, so a run you just started
is never hidden by a layer of yours:

```ts
await session.config.set({ startingRows: true, runPlacement: "top" });
```
