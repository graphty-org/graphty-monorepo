# One Color for One Value

A layer that colors by a category -- a team, a community, a relationship -- takes its colors from
a palette. To give one value its own color, set an entry for it. Every other value keeps following
the palette, so changing the palette later still recolors them.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
await session.data.addNodes([
    { id: "a", team: "red" },
    { id: "b", team: "red" },
    { id: "c", team: "blue" },
    { id: "d", team: "green" },
]);
const layer = await session.styles.add({
    name: "Teams",
    target: "node",
    selector: { match: "has", path: "data.team" },
    encode: { "node.color": { by: "data.team", scale: "ordinal" } },
});

await session.styles.setValueEntry(layer.id, "node.color", "blue", "#0072b2"); // blue's own color
await session.styles.setValueHidden(layer.id, "node.color", "green", true); // green not painted here

for (const value of session.styles.categories(layer.id, "node.color")) {
    console.log(value.value, value.count, value.entry ?? "palette", value.hidden ? "hidden" : "");
}
```

## The calls

- `styles.categories(layerId, channel)` lists the values of that channel's binding, largest first:
  each `value`, its `count`, whether it is `hidden`, and its `entry` when it has one. A channel the
  layer does not bind by a category returns an empty list.
- `styles.setValueEntry(layerId, channel, value, entry)` sets one value's entry. Passing
  `undefined` clears it, and the value goes back to the palette.
- `styles.setValueHidden(layerId, channel, value, hidden)` stops the layer painting one value, so
  those elements show what the layers beneath give them.

Each call is one undo step, and entries are saved with the layer. They work on any category: a
data column, a run's community, a k-core shell.

## When a run runs again

A community run numbers its groups afresh every time, so community 3 may come back as community 1.
When a run re-runs, the element matches each old group to the new group that shares the most
members, and moves everything that names the group along with it: value entries, hidden values,
and the rules of other layers (`{ kind: "categories", attribute: "results.louvain.group", values: ["3"] }`).
A value that is not a run's group, such as a team name, is matched by name.

A group the element cannot match is reported on the layer, as `layer.unmatched`: a list of
`{ code, params }` with code `"group.new"` (a group with no old counterpart) or `"group.gone"` (an
old group with no new one), and `params` naming the value and what it was a value of.

## A layer for one value

To do more for one value than recolor it -- a larger size, a label, a glow -- add a layer whose
rule holds that value, and put it above:

```ts
await session.styles.add({
    name: "Team blue",
    target: "node",
    selector: { match: "rule", where: { kind: "categories", attribute: "data.team", values: ["blue"] } },
    set: { "node.size": 2 },
});
```
