# What Lies Beneath a Row

A properties panel that shows an empty field as "not set here" should say what the element would
get instead: the value the layers beneath give. `styles.agreement(scope, channel, options)` answers
that. With `below` it reads only the layers under one row of the tree; with `over` it reads only
the elements that row matches, so the answer is about the row's own elements and not the whole
graph.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);
await session.styles.add({
    name: "Blue",
    target: "node",
    selector: { match: "everything" },
    set: { "node.color": "#0072b2" },
});
await session.styles.add({
    name: "Orange pair",
    target: "node",
    selector: { match: "ids", nodes: ["a", "b"] },
    set: { "node.color": "#e69f00" },
});
const key = await session.styles.add({
    name: "Key",
    target: "node",
    selector: { match: "ids", nodes: ["c", "d"] },
    set: { "node.size": 3 },
});

const everyNode = { nodes: ["a", "b", "c", "d"] };
const whole = session.styles.agreement(everyNode, "node.color", { below: key.id });
const own = session.styles.agreement(everyNode, "node.color", { below: key.id, over: key.id });
console.log(whole.channels[0]?.state, own.channels[0]?.state, own.readOver);
```

This prints:

```text
mixed agree row
```

Read over the whole graph, the color beneath Key is mixed: orange on a and b, blue on c and d. Read
over Key's own nodes (c and d), it is one answer, blue from the Blue layer, so the panel can show
Key's empty color field with a blue placeholder.

## The answer

Each entry of `channels` is one channel:

- `state: "agree"` -- every element read carries the same `value`, decided by the same layer
  (`layerId`). The value is the resolved one, such as `{ hex: "#0072b2", ... }` for a color.
- `state: "mixed"` -- a `breakdown` of each value, the layer that decided it and how many elements
  carry it, most first.
- `unpainted` -- how many elements nothing painted on that channel.

`readOver` says which elements were read, and is present only when you pass `over`:

- `"row"` -- the elements the row matches, as above.
- `"everyElement"` -- the row matches none of the elements right now. A row that paints the
  selection, with nothing selected, or the hovered element, with nothing under the pointer, is
  like this. The answer is then read from the layers whose selector matches every element: what
  an element gets the moment it enters the row.

## Choosing the scope

`scope` is any scope the session resolves: `"selection"`, a list of node ids, a saved set. Pass
every element of the row's kind, as above, when the answer is for a panel showing the row; `over`
narrows it to the row's own elements for you, so you never compute that list yourself.

To show how one element got its look, layer by layer, use `styles.explain` (see
[Styling](./styling)); to say which rows a color is used by, see
[Colors Across Rows](./colors-across-rows).
