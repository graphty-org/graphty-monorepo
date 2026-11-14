# Hidden Nodes

`session.hidden` takes nodes off the canvas and nothing else. A hidden node is not drawn, and
neither is any edge that touches it, but it stays in the data, in every result, in the visible
counts, in layout and in exports. That is the difference from a filter
([Filter Conditions](./filter-conditions.md)), which takes elements out of everything.
`element.session` is the element's session (see [the JavaScript API](./javascript-api.md)).

## Quick start

Hide a node when it is clicked, and bring every hidden node back with a button:

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const showAll = document.querySelector("#show-all")!;

element.addEventListener("graphty-node-click", (e) => {
    void element.session.hidden.add([e.detail.nodeId]);
});

showAll.addEventListener("click", () => {
    void element.session.hidden.remove([...element.session.hidden.ids]);
});
```

## What to know

- `add` and `remove` are each one undoable step; `session.undo()` puts the picture back.
- `hidden.ids` lists the hidden nodes. An integer id may be written either way: hiding `"34"`
  hides node `34`.
- A saved project keeps the hidden nodes, and opening it hides them again.
- An id the graph does not hold hides nothing.
