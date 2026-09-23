# Styling

How to decide what every node and edge in a graph looks like.

## The one stack

An element's appearance is a **stack of layers**, and every layer is the same shape: a selector
that says which elements it is about, and a set of channel values that says what those elements
look like. Layers paint in order, bottom first, so a layer later in the stack paints over one
earlier in it.

```typescript
const element = document.querySelector("graphty-element");

await element.session.styles.add({
    name: "Servers are blue",
    target: "node",
    selector: { match: "expression", where: "data.type == 'server'" },
    set: { "node.color": "#3B82F6", "node.size": 2 },
});
```

Everything about a layer is addressed by its **id**, which the element mints and which survives
every insertion, removal and reorder around it:

```typescript
const layer = await element.session.styles.add(spec);

await element.session.styles.update(layer.id, { set: { "node.color": "#EF4444" } });
await element.session.styles.move(layer.id, null); // null means "to the top"
await element.session.styles.remove(layer.id);
```

There is no `addLayer(index)`, no `removeLayerByIndex` and no `reorderLayers(from, to)`. An index
is not an identity: it changes under every edit around it, and the one consumer who kept an index
map beside the element deleted the element's own base layer with an off-by-one.

## Reading is free, writing is a command

`list`, `get`, `validate`, `legend` and `explain` answer from what the session already holds and
cost nothing. `add`, `update`, `remove`, `move`, `removeBySource`, `encode` and `highlight`
**validate and repaint**, so each one returns a `Run`: it can report progress on a large graph,
take an `AbortSignal`, and be fired from a click handler and forgotten.

**The model moves only after the paint succeeds.** `add()` followed immediately by `list()` does
not show the new layer; `await add()` does.

**No write verb throws.** A malformed spec, an unknown id or a locked layer arrives as a rejected
run. The door for "is this valid" before anything is committed is `validate()`, which is
synchronous, writes nothing, and reports every problem at once:

```typescript
const verdict = element.session.styles.validate(spec);

if (!verdict.ok) {
    for (const problem of verdict.errors) {
        console.error(problem.message); // names the path and the character it went wrong at
    }
}
```

## Selectors

A selector says which elements a layer is about. There are four kinds, and they are spelled out
rather than implied:

```typescript
{ match: "everything" }                          // every node, or every edge
{ match: "has", path: "results.degree.value" }   // every element that carries a value there
{ match: "ids", nodes: ["alice", "bob"] }        // exactly these
{ match: "expression", where: "data.type == 'server'" }
```

### The expression language

An expression is a declared **subset of JMESPath**, compiled once when the layer is added and
then run as a closure. It supports paths, comparisons (`==`, `!=`, `<`, `<=`, `>`, `>=`), `&&`,
`||`, `!` and parentheses.

It supports **no functions at all** -- no `starts_with`, no `length`, no projections, slices,
pipes, multi-selects or wildcards. Everything outside the subset is refused where it was typed,
by name, with the offset. A selector that is accepted means exactly what JMESPath means by it.

Two spelling rules catch everyone once:

- **A record's own fields live under `data.`** So a node imported as `{id: "n1", type: "server"}`
  is selected with `data.type == 'server'`, not `type == 'server'`.
- **A number or a boolean goes between backticks**, as JMESPath requires: `` data.weight > `0.5` ``
  and `` data.active == `true` ``. A bare `5` is refused with a message saying so. A string
  literal takes single quotes: `'server'`.

An algorithm's results are read the same way, under the id of the run that produced them:

```typescript
const run = await element.run("degree");

await element.session.styles.add({
    name: "Hubs",
    target: "node",
    selector: { match: "expression", where: `results.${run.id}.value > \`10\`` },
    set: { "node.color": "#EF4444" },
});
```

## Channels

A channel is one visual property with one name. These are all of them:

| Node channel      | Takes                                                         |
| ----------------- | ------------------------------------------------------------- |
| `node.color`      | any CSS colour                                                |
| `node.size`       | a number                                                      |
| `node.shape`      | `sphere`, `box`, `cylinder`, `icosphere`, ...                 |
| `node.label`      | the words to draw                                             |
| `node.labelStyle` | `{font, sizePx, weight, color, background, outline, padding, ...}` |
| `node.tooltip`    | the words to show on hover                                    |
| `node.tooltipStyle` | as `node.labelStyle`, for the tooltip                       |
| `node.opacity`    | 0 to 1                                                        |
| `node.outline`    | a colour                                                      |
| `node.glow`       | a colour                                                      |
| `node.glowStrength` | a number                                                    |
| `node.wireframe`  | true or false                                                 |
| `node.flat`       | true or false                                                 |

| Edge channel             | Takes                                        |
| ------------------------ | -------------------------------------------- |
| `edge.color`             | any CSS colour                               |
| `edge.width`             | a number                                     |
| `edge.opacity`           | 0 to 1                                       |
| `edge.style`             | `solid`, `dash`, `dot`, `zigzag`, ...        |
| `edge.patternCount`      | how many dots or dashes to draw, 2 or more   |
| `edge.curvature`         | true or false (a bezier)                     |
| `edge.arrowHead`         | `normal`, `inverted`, `diamond`, `none`, ... |
| `edge.arrowHeadSize`     | a number, 1 being the element's own size     |
| `edge.arrowHeadColor`    | a colour                                     |
| `edge.arrowHeadOpacity`  | 0 to 1                                       |
| `edge.arrowHeadText`     | words drawn beside the head cap              |
| `edge.arrowHeadTextStyle` | as `node.labelStyle`                        |
| `edge.arrowTail`         | the same arrows                              |
| `edge.arrowTailSize`     | a number                                     |
| `edge.arrowTailColor`    | a colour                                     |
| `edge.arrowTailOpacity`  | 0 to 1                                       |
| `edge.arrowTailText`     | words drawn beside the tail cap              |
| `edge.arrowTailTextStyle` | as `node.labelStyle`                        |
| `edge.animationSpeed`    | a number                                     |
| `edge.label`             | the words to draw                            |
| `edge.labelStyle`        | as `node.labelStyle`                         |

Writing `node.label` or `edge.label` is what switches a label on.

### A tooltip on a node

A tooltip is drawn when the pointer rests on a node and taken down when it leaves, which is the
whole difference between a tooltip and a label: a label is part of the picture, a tooltip is an
answer to pointing at something. So a graph at rest shows none, and a layer that writes one
changes nothing on screen until a reader points at the node.

```typescript
await element.session.styles.add({
    name: "What each city is",
    target: "node",
    selector: { match: "everything" },
    encode: { "node.tooltip": { by: "data.note", scale: "passthrough" } },
    set: { "node.tooltipStyle": { sizePx: 32, color: "#FFFFFF", background: "#10B981", cornerRadius: 12 } },
});
```

`node.tooltip` carries the words and `node.tooltipStyle` carries how they are drawn, in the same
vocabulary `node.labelStyle` takes. The words are what switch a tooltip on, so a layer that
writes only the appearance draws nothing.

**An edge has no tooltip.** `edge.tooltip` was published through 1.x and drawn by nothing in any
released version, and it was withdrawn in 2.0: a tooltip needs the pointer to land on the thing
it belongs to, and an edge is not pickable -- the same reason the element emits no `edge-click`.
Put the words on the edge itself with `edge.label`, or at one of its ends with
`edge.arrowHeadText` and `edge.arrowTailText`.

An arrow that is told nothing about its own appearance follows the line it caps, at either end:

```typescript
await element.session.styles.add({
    name: "Big red heads on the heavy edges",
    target: "edge",
    selector: { match: "expression", where: "data.weight > `5`" },
    set: { "edge.arrowHead": "normal", "edge.arrowHeadSize": 2.5, "edge.arrowHeadColor": "#EF4444" },
});
```

Each end is named separately -- `arrowHead` and `arrowTail` -- because each is drawn separately,
and each property is its own channel so it can be bound to a value in the data:
`encode: {"edge.arrowHeadSize": {by: "data.weight", scale: "linear", range: [0.5, 2]}}`.

### Words at the ends of an edge

An edge carries words in three places and they are three different things. `edge.label` puts
words at the MIDDLE of the line. `edge.arrowHeadText` and `edge.arrowTailText` put words at the
two ENDS, hanging from the cap drawn there -- what Graphviz calls a `headlabel` and a `taillabel`
and Cytoscape calls a source and target label. Each end has a second channel carrying the whole
of how those words are drawn, in the same vocabulary `node.labelStyle` takes:

```typescript
await element.session.styles.add({
    name: "Who calls whom",
    target: "edge",
    selector: { match: "everything" },
    set: {
        "edge.arrowTail": "normal",
        "edge.arrowTailText": "caller",
        "edge.arrowHeadText": "callee",
        "edge.arrowHeadTextStyle": { sizePx: 28, color: "#B91C1C", background: "#FEE2E2", padding: 8 },
    },
});
```

Two things are worth knowing before writing one. A caption hangs from a cap, so an end drawn with
no arrow carries none -- an edge's tail has no cap until a layer asks for one, which is why the
example above sets `edge.arrowTail`. And the WORDS are what switch a caption on, so a layer that
writes only a `...TextStyle` draws nothing, exactly as `node.labelStyle` draws nothing without
`node.label`.

A label is sized to the words in it, and there is no automatic wrapping: to draw a label on two
lines, put a newline in the words. The parser measures, aligns and draws each line on its own, so
`textAlign`, `lineHeight` and the four margins all apply across them.

What a label renderer can do beyond the `labelStyle` vocabulary is **not** a channel. That
vocabulary is a closed list named for what a reader can see -- the typeface, the panel, the
margins, the speech-bubble pointer, the outline, the shadow, the badge -- and the renderer's own
canvas settings, such as the resolution of the texture a label is drawn on, are deliberately not
in it. The row above lists the fields a reader reaches for first, not all of them.

## Literal values and bound values

`set` writes the same value to every element the selector matched. `encode` **binds** a channel to
a value in the data, through a scale:

```typescript
await element.session.styles.add({
    name: "Colour by community",
    target: "node",
    selector: { match: "has", path: "data.community" },
    encode: { "node.color": { by: "data.community", scale: "ordinal", palette: "tableau10" } },
});

await element.session.styles.add({
    name: "Label every node with its own name",
    target: "node",
    selector: { match: "everything" },
    encode: { "node.label": { by: "data.name", scale: "passthrough" } },
});
```

A binding takes `by` (the path), `scale` (`linear`, `log`, `sqrt`, `bins`, `quantile`, `ordinal`,
`passthrough`, ...), and optionally a `palette`, a `domain`, a `clamp`, a `range`, a `map` and a
`missing` rule. `missing` defaults to `skip`, which leaves an element with no value exactly as the
layers underneath painted it.

## Painting an algorithm's result

A finished run knows what it measured, so the shortest route from a result to a picture is to let
it suggest one:

```typescript
const run = await element.run("betweenness");

await element.session.styles.encode({ run, channel: "node.size" });
```

`encode()` REPLACES the layer already painting that channel from that run rather than stacking a
second one on it, so running an algorithm twice does not leave two legend blocks on one channel
with one of them invisible under the other.

For an algorithm that chooses a subset -- a route, a cut, a matching -- the verb is `highlight()`,
and a highlight is exclusive: a second route replaces the first rather than being painted beside
it.

## The element's own layers

Every graph starts with two layers the element owns: the defaults every node and edge is drawn
from, and the one that paints the selection. They are `locked`: removing, editing or moving one is
refused with `E_PROTECTED`, and `add()` will not mint an element source at all. You paint over
them by adding your own layer on top, which is what a layer on top is for.

## What is not a style

A layer says what the elements of a graph look like. Four things that look like styling are
properties of the element instead, because they are about the whole picture rather than about any
element in it:

```html
<graphty-element
    view-mode="2d"
    background='{"backgroundType":"color","color":"#101014"}'
    starting-camera-distance="60"
    layout="ngraph"
></graphty-element>
```

```typescript
element.viewMode = "2d";
element.background = { backgroundType: "skybox", data: "https://example.com/sky.jpg" };
element.startingCameraDistance = 60;
element.layout = "ngraph";
```

## Reading the picture back

```typescript
element.session.styles.list(); // every layer, bottom first
element.session.styles.legend(); // what a reader needs to interpret the picture
element.session.styles.explain({ kind: "node", id: "alice" }); // why this node looks like this
```

`explain()` answers the question a screenshot cannot: which layer decided each channel of one
element, and what the layers under it had said before it did.

## Interactive Examples

- [Node Styles](https://graphty.app/storybook/element/?path=/story/styles-node--default)
- [Edge Styles](https://graphty.app/storybook/element/?path=/story/styles-edge--default)
- [Label Styles](https://graphty.app/storybook/element/?path=/story/styles-label--default)
- [All Node Shapes](https://graphty.app/storybook/element/?path=/story/styles-node--all-node-shapes)
- [Bezier Edges](https://graphty.app/storybook/element/?path=/story/styles-edge--bezier)
- [Bidirectional Arrows](https://graphty.app/storybook/element/?path=/story/styles-edge--bidirectional)
- [Layered Styles](https://graphty.app/storybook/element/?path=/story/styles-layered--two-layer-node-colors)
