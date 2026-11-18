# Everything, Selected and Hovered

A layers panel usually starts with three rows: one at the bottom for the whole graph, and two at
the top for what the reader has selected and what the pointer is over. Turn on the project setting
`startingRows` and the element writes them once, in that step, as ordinary rows you can edit,
hide, delete or rename like any other.

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

| Row        | Paints                       | Pinned | Starts out writing                          |
| ---------- | ---------------------------- | ------ | ------------------------------------------- |
| Everything | every node and edge          | bottom | nothing                                     |
| Selected   | the selected nodes and edges | top    | a ring on nodes and a band on edges (below) |
| Hovered    | the node under the pointer   | top    | nothing                                     |

The Selected ring is a solid halo and the band a solid band, both in the `selectionStyle` colors
and sizes (blue, `#0077BB`, by default). That blue stands at least 3:1 off the light default
background and off dark ones such as `#202020`, the contrast WCAG 1.4.11 asks of a state
indicator. On a mid-gray background, or for a ring that also stands off the node it surrounds, set
`selectionStyle` (or edit the Selected row) to a color of your own, or add a glow or border to the
row.

To stop drawing the selection, delete the Selected row (or hide it); the selection itself is
unchanged:

```ts
const selected = session.styles.tree().find((row) => row.name === "Selected")!;
await session.styles.deleteRow(selected.id);
```

Selected and Hovered use the selector `{ match: "state", state: "selected" }` (or `"hovered"`),
which you can use in any layer of your own. They follow the selection and the pointer as they
change, and following them is not an undo step. Nothing else sets them apart: each is a style on a
calculated value, so you can rename, move, hide or delete them or narrow them with more conditions
(the `state` rule leaf in [Selections Built From Steps](./selection-steps.md)).

With `startingRows` on, the selection look is drawn by the Selected row, so recoloring the halo is
a write to that row (`"node.haloColor"`, `"edge.bandColor"`), and the `selectionStyle` setting
draws nothing itself. With it off (the default), nothing changes: there are no starting rows and
`selectionStyle` draws the selection as before.

A layer you add lands between them: above Everything, below Selected and Hovered.

## Deleting and changing

The rows are data from the moment they are written. Delete one with `styles.deleteRow`, rename or
rewrite it, and it stays that way: no setting adds, removes or rewrites a starting row afterwards,
and writing `startingRows: true` while it is already on writes nothing. To get a row back, add it
with `styles.addRow` like any other row.

## A Timeline Hidden row

With `startingRows` on, the timeline adds one more row the first time it turns on (a time field is
set with `session.time.setField`, data that declares one is loaded, or `startingRows` turns on
while a field is set): Timeline Hidden, pinned to the top below Pinned, Selected and Hovered. It
paints the nodes and edges outside the time window, with the selector
`{ match: "state", state: "outsideWindow" }`: hidden by default, or grey and faint with
`timelineHiddenLook: "ghost"`. A project without a timeline never gets it.

The row is added once. The project setting `timelineHiddenAdded` records that it was, so turning
the timeline off and on again, or deleting the row, does not bring it back; set it to `true`
beforehand and the row is never added.

## A Pinned row

Set `pinnedStyle` (the same shape as `selectionStyle`; its `color`, `scale` and `opacity` are read)
when `startingRows` turns on -- in the same `config.set`, or before it -- and the starting rows
include a Pinned row, directly below Selected. It paints a halo on every node pinned in place, by
a drag or by `session.positions.pin`, and follows each pin and unpin with no undo step of its own.
Setting, changing or clearing `pinnedStyle` later adds, removes or rewrites no row. It is unset by
default, so a pinned node looks like any other until you choose a look:

```ts
await session.config.set({ startingRows: true, pinnedStyle: { color: "#868e96", scale: 1.12, opacity: 1 } });
await session.positions.pin(["a"]); // "a" now draws the gray ring
```

Any layer of your own can select pinned nodes with `{ match: "state", state: "pinned" }`.

## Keeping the base look in Everything

By default the element draws its base look (the node color, size and shape, the edge color and
width, and the rest) from two layers of its own that sit below every row and cannot be edited.
Turn on `editableBase` with `startingRows` and the Everything row holds that look instead, as
ordinary values you can change or remove like any other row's:

```ts
await session.config.set({ startingRows: true, editableBase: true });
const everything = session.styles.tree().find((row) => row.name === "Everything")!;
await session.styles.writeRow(everything.id, { set: { "node.color": "#2266cc" } });
```

With it on, an element that no shown row paints is not drawn. Hiding Everything then hides the
whole graph, except the elements another shown row paints, which stay drawn in that row's look.
Set it with `startingRows`, as above: turning it on after the rows were written leaves Everything
as it is, so write the values with `styles.writeRow` instead.

## Where a run's layer lands

A finished run that paints a suggested layer puts it beneath your own layers by default. Set
`runPlacement: "top"` and it lands on top of the unpinned stack instead, so a run you just started
is never hidden by a layer of yours:

```ts
await session.config.set({ startingRows: true, runPlacement: "top" });
```
