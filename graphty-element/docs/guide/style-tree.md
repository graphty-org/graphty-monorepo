# Folders, Pins and Locks

A layers panel shows style layers as a tree: folders that hold layers, layers pinned to the top or
the bottom, layers a reader has locked or hidden. `styles.tree()` reads your layers that way, and a
handful of calls change the tree. The tree is the paint order: moving a row moves what it paints.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
const { styles } = session;
await session.data.addNodes([{ id: "a" }, { id: "b" }]);

const big = await styles.add({
    name: "Big",
    target: "node",
    selector: { match: "everything" },
    set: { "node.size": 3 },
});
const red = await styles.add({
    name: "Red",
    target: "node",
    selector: { match: "ids", nodes: ["a"] },
    set: { "node.color": "#d55e00" },
});

const notes = await styles.addFolder("Notes");
await styles.moveRow(red.id, { parent: notes.id }); // into the folder, at its top
await styles.pinRow(big.id, "bottom"); // stays below every layer added later
await styles.lockRow(red.id, true); // edits to it are now refused

for (const row of styles.tree()) console.log(row.kind, row.name, row.pin, row.children.length);
// layer Big bottom 0
// folder Notes none 1
```

## What a row is

`tree()` returns rows bottom first, at every level. Each row has an `id`, a `kind` (`"layer"` or
`"folder"`), a `name`, a `pin` (`"top"`, `"bottom"` or `"none"`), `locked`, `hidden` and its
`children`. A layer row's id is its layer's id; a folder has its own. Flattening the tree gives
exactly the order of `styles.list()`.

A folder paints nothing itself. It organizes: hiding a folder stops every layer in it painting,
locking it locks every layer in it, and moving it moves all of them.

## The calls

| Call                             | What it does                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `addFolder(name, place?)`        | adds an empty folder, on top unless `place` says where                                                               |
| `moveRow(id, { parent, index })` | moves a row into a folder (`parent`), to the top level (`parent: null`), or to a position (`index`, 0 is the bottom) |
| `pinRow(id, pin)`                | keeps a row at the top or the bottom as layers are added                                                             |
| `lockRow(id, locked)`            | a reader's lock: `update()` on a locked layer is refused with `E_LOCKED`                                             |
| `hideRow(id, hidden)`            | stops a row painting and keeps its place                                                                             |
| `renameRow(id, name)`            | renames a layer or a folder                                                                                          |
| `deleteRow(id)`                  | removes a row; a folder goes with every layer in it                                                                  |

Each call is one undo step. `toDocument()` saves the tree with the layers, so a saved project
reopens with its folders, pins, locks and hidden rows.

The reader's lock is not `Layer.locked`, which marks the element's own layers (see
[Styling](./styling.md#layers-the-element-owns)).
