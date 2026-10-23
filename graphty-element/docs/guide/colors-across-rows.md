# Colors Across Rows

When several layers use one color, you can list the colors a group of rows writes and change one
of them everywhere it is written, in one step. `styles.colors` reads them; `styles.replaceColor`
changes one.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);

const first = await session.styles.add({
    name: "First",
    target: "node",
    selector: { match: "ids", nodes: ["a"] },
    set: { "node.color": "#d55e00" },
});
const second = await session.styles.add({
    name: "Second",
    target: "node",
    selector: { match: "ids", nodes: ["b"] },
    set: { "node.color": "#D55E00" },
});

// One color, #d55e00, written by both layers.
for (const { color, writes } of session.styles.colors([first.id, second.id])) {
    console.log(
        color,
        writes.map((write) => write.layer),
    );
}

// Change it in exactly those two layers, as one undo step.
await session.styles.replaceColor([first.id, second.id], "#d55e00", "#009e73");
```

## What counts

`colors(rowIds)` takes rows of the style tree -- layers or folders, whose layers are included --
and lists the fixed colors they write: a color set on a channel, and a value's own color in a
category binding (see [One Color for One Value](./value-entries.md)). Colors that come from a
palette or a ramp are not listed; they follow the palette. Two spellings of one color are one
entry, and each entry says which layer and channel write it, with `value` naming the category when
the color is a value's own.

`replaceColor(rowIds, from, to)` writes `to` wherever those rows write `from`, and nowhere else: a
layer outside the rows you name keeps the color. It returns the layers it changed. A `to` that is
not a color is refused, and nothing changes.

## Turning an effect off

A layer covers the layers beneath it only where it writes a value. To cover an effect a layer
beneath writes -- a glow, an outline, edge motion -- with nothing, write the effect's off value: the
channel's catalog descriptor names it as `off` (`"none"` for a glow or an outline, `0` for edge
motion).

```ts
await session.styles.add({
    name: "No glow",
    target: "node",
    selector: { match: "ids", nodes: ["a"] },
    set: { "node.glow": "none" },
});
```
