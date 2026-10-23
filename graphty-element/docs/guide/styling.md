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

`list`, `get`, `validate`, `legend`, `explain` and `agreement` answer from what the session already holds and
cost nothing. `add`, `update`, `remove`, `move`, `removeBySource`, `encode`, `mark` and `highlight`
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

A selector says which elements a layer is about. There are seven kinds, and they are spelled out
rather than implied:

```typescript
{ match: "everything" }                          // every node, or every edge
{ match: "has", path: "results.degree.value" }   // every element that carries a value there
{ match: "ids", nodes: ["alice", "bob"] }        // exactly these
{ match: "top", path: "results.degree.value", n: 10 } // the top 10 by a run's field, whole ties only
{ match: "expression", where: "data.type == 'server'" }
{ match: "member", of: { set: id } }           // the members of a set, or any other scope
{ match: "hover", reach: "neighbors" }          // the node under the pointer, and its neighbors
```

An `ids` selector finds an integer id in either spelling, as every other id lookup does: `["1", "3"]`
paints nodes `1` and `3` of a graph whose ids are numbers. An id that names nothing paints nothing,
and `styles.validate()` and the `style:changed` change report it as a `W_UNKNOWN_ID` warning, with
`params.target` and `params.ids` (the ids as the layer named them).

### A set

`{ match: "member", of: scope }` paints the members of a kept [set](./sets), or of anything else a
scope names (`"selection"`, `{ define }`). The layer follows its scope: redefine the set, change
the data a rule set reads, or re-run the run a followed set reads, and the layer repaints the
elements that joined or left without being touched. A set has no colour of its own -- colouring
one is this layer. A layer naming a set that was removed keeps painting the members the set's
kept record names, so removing a set never blanks a layer.

### What the pointer is over

`{ match: "hover" }` paints the node under the pointer. With `reach: "neighbors"` it also paints
that node's neighbors; for an edge layer it paints the edges that touch the hovered node, whatever
the reach. `invert: true` paints everything else instead -- but only while a node is hovered, so
the layer paints nothing at rest. That is the usual "fade what this node is not linked to" look:

```typescript
await session.styles.add({
    name: "Fade the rest",
    target: "node",
    selector: { match: "hover", reach: "neighbors", invert: true },
    set: { "node.opacity": 0.25 },
});
await session.styles.add({
    name: "Fade the other links",
    target: "edge",
    selector: { match: "hover", invert: true },
    set: { "edge.opacity": 0.15 },
});
```

`orSelected: true` keeps the look on the node the reader clicked: while no node is under the
pointer, a lone selected node stands in for the hovered one. With several nodes selected, or none,
the layer paints nothing until the pointer is over a node again.

The element tells the session which node the pointer is over as it moves, and the layer repaints
with no undo step: pointing is view state. `session.selection.hovered` reads the node (or `null`),
and `session.selection.hover(id)` sets it, for a page that draws its own pointer or a test. Pointing
at a node selects nothing.

To mark the node under the pointer the way a selected node is marked, give it a halo: the
selection highlight, drawn around the node in the node's own shape, so it stays on the node from
any angle.

```ts
await session.styles.add({
    name: "Halo on the pointed-at node",
    target: "node",
    selector: { match: "hover", orSelected: true },
    set: { "node.halo": true },
});
```

`node.halo` alone draws the selection's look (`selectionStyle`); `node.haloColor`,
`node.haloScale` and `node.haloOpacity` change it for the nodes the layer picks, and writing any of
them switches the halo on. A selected node a layer gives a halo shows one halo: each value the
layer sets wins and the selection style gives the rest. `node.halo: false` takes the halo off a
node, even a selected one. Unset, a node has a halo only while it is selected, as before.

### The top N

`{ match: "top", path, n }` paints the `n` highest elements by one field a run published, such as
"label the ten best-connected nodes". The path is a run's field, `results.<run>.<field>`: build it
with `session.results.path(run, field)`. The layer follows the run: it reads the run's values each
time it paints, so after a re-run the top is taken again from the new values.

**Ties are never split.** Elements with equal values are painted as a group or not at all, and a
group is painted only when ALL of it fits inside `n`. So a top-10 layer never paints more than
ten elements, but it can paint fewer -- and it paints none on a graph whose highest value is
shared by more than ten elements (every node of a ring has the same degree). To find out why, ask
the run: `result.top(field, n)` returns the same elements, plus `leftOut` (the tie group that did
not fit), `reason` (a sentence saying so) and `threshold` (the `above` value that selects exactly
the same elements). A `{ top }` selection target
(`session.selection.apply({ top: { run, field, n } })`) uses the same rule, so a layer and a
selection never disagree about which elements are the top `n`.

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

**An edge's endpoints are `data.source` and `data.target`**, the ids of the nodes it leaves and
reaches, whatever keys the edge record used for them (`src`/`dst` by default). So
`data.source == 'A'` selects the edges leaving `A`, and `{ match: "has", path: "data.target" }`
matches every edge.

The same expression works outside a style layer, and matches the same elements there:
`session.scope.count({ where })`, `session.selection.apply({ where })` and a visibility filter
`{ kind: "expression", where }` (nodes) or `{ kind: "edges", where }` (edges) all evaluate it
with the same engine.

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

### Values the element provides

A path that starts `graphty.` reads a value the element itself provides, not a column of your
data:

| Path                                        | Value                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `graphty.notes.count`                       | How many notes name a node or an edge; no value when none do                                                              |
| `graphty.notes.latest`                      | The text of the newest of those notes                                                                                     |
| `graphty.notes.latestTime`                  | The `time` of the newest of those notes                                                                                   |
| `graphty.degree`                            | How many edges a node has, as the graph stands now; no value on an edge                                                   |
| `graphty.inDegree`, `graphty.outDegree`     | How many edges reach a node, and how many leave it                                                                        |
| `graphty.style.<format>.<node\|edge>.<key>` | A value a load with `styles: "file"` wrote for the element; see [Styles from Files](./file-styles#values-the-load-writes) |

They work in a layer's `selector` and in a binding's `by`. A label or tooltip bound to one is drawn
as literal text: a note reading `<bold>x</bold>` shows the tags, never bold text. See
[Notes](./notes#notes-in-styles).

The degrees follow the graph: add an edge and a layer that selects
`` graphty.degree > `2` `` repaints the nodes it now reaches, with nothing recomputed by hand.

```typescript
await element.session.styles.add({
    name: "Hubs",
    target: "node",
    selector: { match: "expression", where: "graphty.degree > `10`" },
    encode: { "node.size": { by: "graphty.degree", scale: "sqrt", range: [1, 4] } },
});
```

The whole `graphty.` root is reserved for the element, now and in later releases. A data column
whose name starts `graphty.` is still reachable, as `data.graphty.<name>`, and
`session.styles.validate(spec)` lists a bare `graphty.` path that a column of the same name would
have answered in `shadowedPaths`. A `graphty.` path this release does not know has no value, and
the layer is reported unbound rather than painting anything.

## Channels

A channel is one visual property with one name. These are all of them:

| Node channel                  | Takes                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `node.color`                  | any CSS colour                                                                                                                                   |
| `node.gradientColor`          | any CSS colour: fills the node with a gradient from `node.color` into it                                                                         |
| `node.gradientDirection`      | 0 to 360: which way that gradient runs; 0 left to right, 90 downward                                                                             |
| `node.gradientColors`         | CSS colours separated by spaces: every colour the gradient runs through, start to end, in place of the two above                                 |
| `node.gradientStops`          | fractions 0 to 1 separated by spaces, one per gradient colour: where each sits (otherwise evenly spaced)                                         |
| `node.gradientKind`           | `linear` (the default) or `radial`: out from the node's middle to its edge                                                                       |
| `node.size`                   | 0 or more; what it measures is `node.sizeMode`'s                                                                                                 |
| `node.sizeMode`               | `scale` (the default), `diameter` or `uniform`: what `node.size` measures                                                                        |
| `node.shape`                  | `sphere`, `box`, `icosphere`, ..., or a flat `rectangle`, `ellipse`, ...                                                                         |
| `node.width`                  | 0 or more: the width, in the units of `node.size`                                                                                                |
| `node.height`                 | 0 or more: the height, in the units of `node.size`                                                                                               |
| `node.depth`                  | 0 or more: the depth (3D), in the units of `node.size`                                                                                           |
| `node.planar`                 | true or false: draw the node thin, as a flat shape, even in 3D                                                                                   |
| `node.zIndex`                 | -1000 to 0: in 2D, below 0 draws the node behind edges and higher nodes                                                                          |
| `node.drawOrder`              | 0 to 100: in 2D, which of two overlapping nodes is drawn on top                                                                                  |
| `node.borderColor`            | a colour; black when unset                                                                                                                       |
| `node.borderWidth`            | 0 or more, in the units of `node.size`; 0 draws no border                                                                                        |
| `node.borderStyle`            | `solid`, `dashed`, `dotted`, `dash-dot`, `double`, `zigzag`, `sinewave`, `forward-slash`, `backward-slash`, `vertical-slash` or `separate-arrow` |
| `node.cornerRadius`           | 0 or more: a round-rectangle's largest corner radius, in `node.size` units                                                                       |
| `node.shapePoints`            | a `polygon`'s corners, `x,y` pairs as fractions of its half width and height                                                                     |
| `node.shapeParts`             | further pieces of the node's body: polygons as `node.shapePoints` writes them, separated by `;`, filled and outlined as the node is              |
| `node.shapeLines`             | lines over the node in its border's color: polylines as `node.shapeParts` writes polygons; one that ends where it starts is closed               |
| `node.shapeLineWidth`         | 0 or more: how wide `node.shapeLines` are, in the units of `node.borderWidth`; unset, the border's width                                         |
| `node.label`                  | the words to draw                                                                                                                                |
| `node.labelStyle`             | `{font, sizePx, weight, color, background, outline, padding, ...}`                                                                               |
| `node.labelColor`             | any CSS colour: the label's colour                                                                                                               |
| `node.labelSize`              | a number: the label's font size                                                                                                                  |
| `node.labelLetterSize`        | a number: how tall the letters (one font size) are drawn, in scene units                                                                         |
| `node.labelFont`              | a font family                                                                                                                                    |
| `node.labelWeight`            | `normal` or `bold`                                                                                                                               |
| `node.labelItalic`            | true or false                                                                                                                                    |
| `node.labelWrapWidth`         | a number: how wide a line may be before its words wrap, in scene units                                                                           |
| `node.labelWrapTrailingSpace` | true or false: a word must fit with the space after it, as Cytoscape wraps                                                                       |
| `node.labelWrapEllipsis`      | true or false: a line wider than the wrap width is cut to fit with an ellipsis, in place of wrapping                                             |
| `node.labelWrapAnywhere`      | true or false: a line may break between any two letters, not only at spaces                                                                      |
| `node.labelWrapSpaceCount`    | 0 or more: how many blanks a blank between two words counts as against the wrap width (vis-network counts 3)                                     |
| `node.labelRunAlign`          | `baseline`, `hanging` or `middle`: where runs of different sizes in one line of label markup meet                                                |
| `node.labelMinScreenSize`     | a number of screen pixels: the label is hidden while its letters are drawn smaller                                                               |
| `node.labelOnTop`             | true or false: draw the label over every node and edge                                                                                           |
| `node.labelDeclutter`         | `degree` or `size`: hide the label where it overlaps one kept before it                                                                          |
| `node.labelRotation`          | degrees, clockwise as the reader sees it: how far the label is turned                                                                            |
| `node.tooltip`                | the words to show on hover                                                                                                                       |
| `node.tooltipStyle`           | as `node.labelStyle`, for the tooltip                                                                                                            |
| `node.opacity`                | 0 to 1                                                                                                                                           |
| `node.outline`                | a colour                                                                                                                                         |
| `node.glow`                   | a colour                                                                                                                                         |
| `node.glowStrength`           | 0 or more, scaling `node.glow`; 0 or on its own it draws no glow                                                                                 |
| `node.halo`                   | true or false: the selection highlight around the node, in its own shape                                                                         |
| `node.haloColor`              | a colour; the selection highlight's when unset (gold)                                                                                            |
| `node.haloScale`              | above 0: how many times the node's size the halo is drawn at (1.45)                                                                              |
| `node.haloOpacity`            | 0 to 1 (0.4)                                                                                                                                     |
| `node.wireframe`              | true or false                                                                                                                                    |
| `node.flat`                   | true or false: one normal per face, so a sphere looks faceted (3D)                                                                               |
| `node.unlit`                  | true or false: drawn in its own color with no light, as a flat dot (3D)                                                                          |

| Edge channel                  | Takes                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `edge.color`                  | any CSS colour                                                                                               |
| `edge.width`                  | 0 or more; 0 draws no line (the caps and label still draw)                                                   |
| `edge.opacity`                | 0 to 1                                                                                                       |
| `edge.style`                  | `solid`, `dash`, `dot`, `zigzag`, `double`, `forward-slash`, `separate-arrow`, ... (`EdgeLineTypes.options`) |
| `edge.patternCount`           | how many dots or dashes to draw, 2 or more (zigzag and sinewave ignore it)                                   |
| `edge.curvature`              | true or false (a bezier)                                                                                     |
| `edge.bends`                  | points the line runs through, `"along,across ..."` from source to target                                     |
| `edge.fanSpacing`             | 0 or more: how far apart curved parallel edges are at their middle                                           |
| `edge.fanned`                 | false draws a curved edge as its own curve, ignoring the edges beside it                                     |
| `edge.arrowHead`              | `normal`, `inverted`, `diamond`, `none`, ...                                                                 |
| `edge.arrowHeadSize`          | 0 or more, 1 being the element's own size; 0 draws no head                                                   |
| `edge.arrowHeadPosition`      | 0 to 1: how far back along the line the head sits; 0 at the node, 0.5 mid                                    |
| `edge.arrowHeadColor`         | a colour                                                                                                     |
| `edge.arrowHeadOpacity`       | 0 to 1                                                                                                       |
| `edge.arrowHeadText`          | words drawn beside the head cap                                                                              |
| `edge.arrowHeadTextStyle`     | as `node.labelStyle`                                                                                         |
| `edge.arrowHeadTextRotation`  | degrees clockwise the head's caption is turned about its middle                                              |
| `edge.arrowHeadTextOffsetX`   | how far right the head's caption is moved, in scene units on screen                                          |
| `edge.arrowHeadTextOffsetY`   | how far down the head's caption is moved, in scene units on screen                                           |
| `edge.arrowTail`              | the same arrows                                                                                              |
| `edge.arrowTailSize`          | 0 or more; 0 draws no tail                                                                                   |
| `edge.arrowTailPosition`      | 0 to 1: how far along the line from the source the tail sits                                                 |
| `edge.arrowTailColor`         | a colour                                                                                                     |
| `edge.arrowTailOpacity`       | 0 to 1                                                                                                       |
| `edge.arrowTailText`          | words drawn beside the tail cap                                                                              |
| `edge.arrowTailTextStyle`     | as `node.labelStyle`                                                                                         |
| `edge.arrowTailTextRotation`  | as `edge.arrowHeadTextRotation`                                                                              |
| `edge.arrowTailTextOffsetX`   | as `edge.arrowHeadTextOffsetX`                                                                               |
| `edge.arrowTailTextOffsetY`   | as `edge.arrowHeadTextOffsetY`                                                                               |
| `edge.animationSpeed`         | a number                                                                                                     |
| `edge.label`                  | the words to draw                                                                                            |
| `edge.labelStyle`             | as `node.labelStyle`                                                                                         |
| `edge.labelColor`             | as `node.labelColor`                                                                                         |
| `edge.labelSize`              | as `node.labelSize`                                                                                          |
| `edge.labelLetterSize`        | as `node.labelLetterSize`                                                                                    |
| `edge.labelFont`              | as `node.labelFont`                                                                                          |
| `edge.labelWeight`            | as `node.labelWeight`                                                                                        |
| `edge.labelItalic`            | as `node.labelItalic`                                                                                        |
| `edge.labelWrapWidth`         | as `node.labelWrapWidth`                                                                                     |
| `edge.labelWrapTrailingSpace` | as `node.labelWrapTrailingSpace`                                                                             |
| `edge.labelWrapEllipsis`      | as `node.labelWrapEllipsis`                                                                                  |
| `edge.labelWrapAnywhere`      | as `node.labelWrapAnywhere`                                                                                  |
| `edge.labelWrapSpaceCount`    | as `node.labelWrapSpaceCount`                                                                                |
| `edge.labelRunAlign`          | as `node.labelRunAlign`                                                                                      |
| `edge.labelMinScreenSize`     | as `node.labelMinScreenSize`                                                                                 |
| `edge.labelOnTop`             | as `node.labelOnTop`                                                                                         |
| `edge.labelRotation`          | as `node.labelRotation`                                                                                      |

A color may carry an alpha (`#ff000080`, `rgba(255, 0, 0, 0.5)`). On `node.color`,
`edge.color` and the two arrow colors the alpha multiplies the matching opacity channel, so
`#ff000080` draws as `#ff0000` at opacity 0.5; an arrow with no color of its own takes its line's
color, alpha included. On `node.glow` it fades the glow. An outline cannot be drawn translucent:
`node.outline` draws the color opaque, and `styles.validate()` and the `style:changed` change
report it as a `W_ALPHA_IGNORED` warning, with `params.channel` and `params.path`. The selection
halo's color (`setSelectionStyle`) works the same way, multiplied with its `opacity`.

Writing `node.label` or `edge.label` is what switches a label on. To switch node labels on
without choosing the words, write `{ enabled: true }` to `node.labelStyle`: each node is labelled
with its own id.

```typescript
await element.session.styles.add({
    name: "Labels",
    target: "node",
    selector: { match: "everything" },
    set: { "node.labelStyle": { enabled: true } },
});
```

The five `...Style` channels merge field by field across layers instead of replacing each other.
A layer that writes `{ color: "#FF0000" }` over one that wrote `{ sizePx: 24 }` draws a red label
at 24 px, and each field takes the value from the highest layer that set it.

A whole label style can only be `set`. To draw each label from your data -- a size from a column,
a color per group -- bind one of the label field channels (`node.labelColor`, `node.labelSize`, `node.labelLetterSize`,
`node.labelFont`, `node.labelWeight`, `node.labelItalic`, `node.labelWrapWidth`,
`node.labelWrapTrailingSpace`, `node.labelWrapEllipsis`, `node.labelWrapAnywhere`, `node.labelWrapSpaceCount`, `node.labelRunAlign`, `node.labelMinScreenSize`, `node.labelOnTop`, `node.labelDeclutter`, `node.labelRotation`, and the same on
edges but `labelDeclutter`). Each lands
in the same label style, field by field, in layer order, beside whatever `node.labelStyle` layers
write. A binding on the whole `node.labelStyle` paints nothing, and `validate()` warns about it with
the code `W_LABEL_STYLE_BOUND`, naming the field channels to bind instead.

Two label fields decide whether a label is drawn at all, the way many graph programs thin out
their labels. `node.labelMinScreenSize` hides a label while its letters are drawn smaller than that
many pixels on screen, and shows it again when the reader zooms in. `node.labelDeclutter` hides a
node label where its words would overlap a label kept before it: a selected node's first, then the
node with more edges (`degree`) or the larger label and then the larger node (`size`). Both are
decided again whenever the camera moves. `layoutBehavior.labels.declutter` does the same for every
node label at once, as a preference of the view rather than a style.

```typescript
await element.session.styles.add({
    name: "Readable labels only",
    target: "node",
    selector: { match: "everything" },
    set: { "node.labelMinScreenSize": 6, "node.labelDeclutter": "size" },
});
```

```typescript
await element.session.styles.add({
    name: "Label size by weight",
    target: "node",
    selector: { match: "has", path: "data.weight" },
    encode: { "node.labelSize": { by: "data.weight", scale: "linear", range: [12, 32] } },
});
```

### Node shapes, sizes and borders

`node.size` measures how wide a node is across the view: at size 1 every shape -- a sphere, a
box, an octahedron, a diamond -- is drawn 1.5 units wide (the default icosphere's width), so a
diamond and a sphere of one size look one size. `node.width`, `node.height` and `node.depth` set
the extent along one axis in the same units, so a node of width 4 is as wide as a node of size 4;
an axis left unset keeps the shape's own proportions at `node.size`.

The flat shapes -- `rectangle`, `round-rectangle`, `ellipse`, `diamond`, `triangle`, `pentagon`,
`hexagon`, `octagon`, `parallelogram`, `trapezoid`, `star`, `vee`, and Pajek's `cross`, `house`,
`man` and `woman` (`FLAT_NODE_SHAPES` in `@graphty/graphty-element/schema`) -- are the shapes graph
files from 2D tools name. `none` is a node with no body: it keeps its size, for its label and the
edges that meet it, and draws only its label. They are
drawn flat in every view: in a 3D view, a thin card facing the 2D camera, with its border drawn
round its faces. `node.depth` makes one deeper, and `node.planar` makes a solid shape thin too.
Edges end at their outline.

In a 2D view, `node.zIndex` puts a node behind the rest of the drawing: a node below 0 is drawn
behind every edge and every node with a higher value, so a group (compound) node at -1 never
hides the nodes inside it, and an outer group at -2 stays behind an inner one. Loading a file
with `styles: "file"` sets it on the file's group nodes. A 3D view draws by real depth and
ignores it.

`node.drawOrder` decides which of two overlapping nodes is drawn on top in a 2D view: the one with
the higher value, from 0 to 100. A node with a draw order is drawn in front of every edge and of
every node without one; a node without one is drawn as before. Loading a file with
`styles: "file"` sets it from the file's own order, so a node later in the file is drawn on top,
as the program that wrote it draws it. Each distinct value is its own source mesh, so use a few
levels on a large graph. A 3D view draws by real depth and ignores it.

A border is a ring drawn outside the node's outline, so it never covers the fill, and an edge
ends at its outer edge. Its width is in the units of `node.size`, so it scales with the node:

```typescript
await element.session.styles.add({
    name: "Boxes",
    target: "node",
    selector: { match: "everything" },
    set: {
        "node.shape": "round-rectangle",
        "node.width": 4,
        "node.height": 1,
        "node.borderWidth": 0.1,
        "node.borderStyle": "dashed",
        "node.borderColor": "#1A202C",
    },
});
```

A border is not `node.outline`: an outline is a screen-space glow of one fixed width, drawn for
emphasis, while a border is part of the node's shape. Each distinct border is one more mesh,
shared by every node drawn with it.

Glowing nodes are drawn through one mesh per distinct `node.glow` and `node.glowStrength`
pair. A handful of glow styles costs nothing; a strength encoded from data, with a different value
on every node, gives up instancing for the glowing nodes.

### What a node's size measures

`node.sizeMode` says how `node.size` is read: `scale`, `diameter` or `uniform`. With `scale`, the default, the size multiplies each
shape's own geometry, so shapes of one size are drawn at different extents. With `diameter`, the
size is the largest width, height or depth of the drawn shape, the same for every shape: a size-1
octahedron is as wide as a size-1 sphere.

```typescript
await element.session.styles.add({
    name: "Same extent for every shape",
    target: "node",
    selector: { match: "everything" },
    set: { "node.sizeMode": "diameter" },
});
```

A node that sets `node.width`, `node.height`, `node.depth` or `node.planar`, and every flat shape
(`rectangle`, `round-rectangle`, `ellipse`, ...), is drawn at the common node extent instead: 1.5
units across per unit, the default icosphere's diameter. `node.width`, `node.height`, `node.depth`
and `node.borderWidth` are read in the same units as `node.size`. With `uniform`, every node is
drawn that way, so every shape of one size is the same width across the view. Styles read from
another program's file set `uniform`, so a file's ellipse and diamond of one size are drawn the
same width.

Under `scale`, any other node's largest extent is its size times:

| Shape                                                    | Factor |
| -------------------------------------------------------- | ------ |
| `sphere`, `box`, `capsule`                               | 1      |
| `torus-knot`                                             | 1.25   |
| `goldberg`, `icosphere`, `torus`                         | 1.5    |
| `square_pyramid`                                         | 1.51   |
| `cylinder`, `cone`                                       | 1.62   |
| `geodesic`                                               | 1.7    |
| `triangular_dipyramid`, `elongated_pentagonal_dipyramid` | 1.96   |
| `pentagonal_pyramid`                                     | 2.01   |
| `pentagonal_dipyramid`                                   | 2.06   |
| `elongated_pentagonal_cupola`                            | 2.07   |
| `dodecahedron`, `rhombicuboctahedron`                    | 2.14   |
| `pentagonal_prism`                                       | 2.16   |
| `hexagonal_prism`                                        | 2.24   |
| `triangular_prism`                                       | 2.29   |
| `icosahedron`                                            | 2.35   |
| `elongated_square_dipyramid`                             | 2.43   |
| `tetrahedron`, `octahedron`                              | 2.83   |

### Drawing a style editor

`CHANNEL_DESCRIPTORS`, from `@graphty/graphty-element/catalog`, describes every channel as plain
data, so an editor can draw a row per channel without restating anything the element knows:

```typescript
import { channelsFor } from "@graphty/graphty-element/catalog";

for (const channel of channelsFor("edge")) {
    // e.g. "Head size", "arrows", 1
    console.log(channel.shortName, channel.group, channel.default);
}
```

| Field               | What it holds                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `plainName`         | the full name, "Arrow Head Size"                                                                                                   |
| `shortName`         | the name once the target is already said, in sentence case: "Head size"                                                            |
| `group`             | `shape`, `color`, `effects` or `text` for a node; `line`, `arrows` or `text` for an edge                                           |
| `accepts`           | the kind of control: `color`, `number`, `text`, `boolean`, `enum`, `labelStyle`, `nothing`                                         |
| `values`            | every choice, for an `enum`                                                                                                        |
| `min`, `max`        | the bounds, for a `number`                                                                                                         |
| `default`           | what the element draws when no layer sets the channel (absent when that is nothing); an unset arrow cap color follows `edge.color` |
| `unsupportedReason` | why the channel cannot be set, for a disabled control; present only when it cannot                                                 |

### Labels that would overlap

By default every label a style asks for is drawn, so labeled nodes that sit close together on
screen draw their words over each other. Turn on `labelDeclutter` to thin them out:

```javascript
element.labelDeclutter = true;
```

```html
<graphty-element label-declutter></graphty-element>
```

It is a preference of the view, not part of the project: switching it records no undo step and is
not saved in a project file, so it suits a reader's "Show all labels" checkbox
(`element.labelDeclutter = !showAll.checked`). It is the same switch as
`layoutBehavior.labels.declutter`.

With it on, the element keeps the label of a selected node first, then the label of the node
with more edges, and hides any label whose words would cover the words of a label it has already
kept. Only the words count: two labels whose padding or background overlap, but whose text does
not, are both drawn. A hidden label comes back as soon as its node is clear, for example after
the camera or the layout moves. Nothing in the style changes when this happens, and setting
`labelDeclutter` back to `false` shows every label again on the next frame.

The element works this out again only when something that decides it changes -- the camera, the
size of the viewport, a label, a node's position or visibility, the selection or the edges -- so a
still graph pays almost nothing for it. On a camera that is moving it costs roughly 1 to 1.5 ms a
frame per thousand labels. It is a preference of the view, so a saved project does not keep it.
`element.nodeLabelCounts` says how many labels it hid: see [Labels](./labels).

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
writes only a `...TextStyle` draws nothing.

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
`passthrough`, ...), and optionally a `palette`, a `domain`, a `clamp`, a `range`, a `map`, an
`overflow` policy and a `missing` rule. `missing` defaults to `skip`, which leaves an element with
no value exactly as the layers underneath painted it. `overflow` (`"other"`, `"shape"`,
`"pattern"` or `"extend"`) says what a categorical colour does with more groups than its palette has colours;
`encode()` writes `"other"` by default -- see [Algorithms](./algorithms#more-groups-than-colours).

### A table of values, and what it leaves alone

`map` gives a value per key. With `scale: "passthrough"`, a key the table does not hold goes on
through the scale as before, so an unmapped `"green"` is painted green. Add `unmapped: "skip"` and
an element whose key the table does not hold is left exactly as the layers beneath paint it:

```typescript
await element.session.styles.add({
    name: "Known teams",
    target: "node",
    selector: { match: "has", path: "data.team" },
    encode: {
        "node.color": {
            by: "data.team",
            scale: "passthrough",
            map: { red: "#EF4444", blue: "#3B82F6" },
            unmapped: "skip",
        },
    },
});
```

An element with no `data.team` at all still follows `missing`.

### Stops

A numeric or color channel can read a number against `stops` instead of a scale: points at
uneven spacing, each with the value drawn exactly at it, and between two points the value moves
from one to the next (numbers linearly, colors per red, green, blue and alpha). Below the first
point every value paints the first point's `below`, and above the last point, the last point's
`above`. Both default to the point's `value`; giving them separately draws a jump at the point:

```typescript
await element.session.styles.add({
    name: "Expression",
    target: "node",
    selector: { match: "has", path: "data.expression" },
    encode: {
        "node.color": {
            by: "data.expression",
            stops: [
                { at: -2, value: "#2166AC" },
                { at: 0, value: "#F7F7F7", below: "#D1E5F0", above: "#FDDBC7" },
                { at: 3, value: "#B2182B" },
            ],
        },
    },
});
```

`stops` takes the place of `scale`, `domain`, `range` and `palette` (leave `scale` out or set it to
`"linear"`); the others are refused beside it, because the points already say what each would. It
is how a Cytoscape continuous mapping is drawn when a file's styles are loaded (see
[Styles from Files](./file-styles)).

A number outside what a channel can draw (a negative size, an opacity above 1) is still clamped,
and a node color with alpha is still drawn opaque; `styles.counts(id)` reports both per layer, as
`style.out-of-range` and `style.alpha-not-drawn` with the channel and how many elements.

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

For an algorithm that chooses a subset -- a route, a spanning tree, a cut, a matching -- the verb
is `mark()`. It adds an ordinary layer per half the run chose, scoped to the elements it chose, that
sets exactly the channels you name:

```typescript
const route = await element.run("shortest-path", { source: "a", target: "f" }, { style: false });

await element.session.styles.mark({
    run: route,
    set: { "node.color": "#D55E00", "edge.color": "#D55E00", "edge.width": 24 },
});
```

Marks stack like any other layer: a second algorithm's mark is painted beside the first, and the
one higher in the stack wins only on the elements both chose. Marking the same run again replaces
its earlier mark. This is what an algorithm paints by itself when it finishes: vermilion on the
chosen nodes and edges, with each chosen edge three times the default width.

`highlight()` takes the same run but is exclusive: a second highlight replaces the first rather
than being painted beside it, and with no `set` it uses the element's own highlight color. Use it
for a selection-like "show me this one" view; an algorithm's own picture never goes through it.

## Folders, pins, locks and hiding

`styles.tree()` reads your layers as rows of a tree, the way a layers panel shows them: folders,
pins, a reader's lock and hidden rows. The tree is the paint order. See
[Folders, Pins and Locks](./style-tree.md), and for the rest of what a layers panel needs:
[One Row for Nodes and Edges](./style-rows-both-kinds.md),
[Everything, Selected and Hovered](./starting-rows.md), [Rules and Text Matching](./style-rules.md),
[Previewing a Binding](./binding-preview.md), [One Color for One Value](./value-entries.md) and
[Colors Across Rows](./colors-across-rows.md).

## Layers the element owns

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
element.session.styles.explain({ node: "alice" }); // why this node looks like this
element.session.styles.counts(layerId); // how many elements one layer covers and wins
```

See [Counting What a Layer Paints](./layer-counts) for `counts()`.

`explain()` answers the question a screenshot cannot: which layer decided each channel of one
element, and what the layers under it had said before it did.

Each entry of `channels` says whether a control may write that channel on the layer that won it
(`editable`). When it may not, `fact` says why, as a code and its values for your application to
word:

| `fact.code`       | Why the channel cannot be edited there                                   | `fact.params`                        |
| ----------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| `layer.locked`    | The layer belongs to the element; add a layer above it instead           | `layerId`, `name`                    |
| `channel.encoded` | The layer works the channel out from the data; `resolveToStatic()` first | `layerId`, `name`, `channel`, `path` |

```typescript
const { channels } = element.session.styles.explain({ node: "alice" });

for (const entry of channels) {
    if (entry.fact?.code === "channel.encoded") {
        showHint(`${entry.fact.params.name} works this out from ${entry.fact.params.path}`);
    }
}
```

`styles.applyTemplate()` reports the layers it could not bind in `unbound`, each with a `fact`:
`layer.unanswered` (`layerId`, `name`, `paths`: what the layer reads that nothing in this session
answers) or `layer.detached` (`layerId`, `name`, `error`: the error code its set scope was refused
with). New codes may be added in a minor release: word an unknown one generically. The English
`reason` on both is deprecated and goes in the next major release.

### Several elements at once

`agreement()` answers the same question for many elements: the selection, a saved set, or a list
of node ids. For each channel it says whether they all look the same, and if not, how they split.

```typescript
const { channels } = element.session.styles.agreement("selection");

for (const entry of channels) {
    if (entry.state === "agree") {
        // every selected element has entry.value, decided by the layer entry.layerId
        console.log(entry.channel, entry.value, entry.layerId);
    } else {
        // entry.breakdown: one { value, layerId, count } per look, most common first
        console.log(entry.channel, entry.breakdown);
    }
    // entry.unpainted: how many elements no layer painted on this channel
}

element.session.styles.agreement({ nodes: ["alice", "bob"] }, "node.color"); // one channel only
```

Two elements agree only when they show the same value **and** the same layer decided it, so a
layer that repeats the value of the layer under it still reads as mixed. The answer holds counts,
never lists of ids, so it stays small however many elements are selected.

## Interactive Examples

- [Node Styles](https://graphty.app/storybook/graphty-element/?path=/story/styles-node--default)
- [Edge Styles](https://graphty.app/storybook/graphty-element/?path=/story/styles-edge--default)
- [Label Styles](https://graphty.app/storybook/graphty-element/?path=/story/styles-label--default)
- [All Node Shapes](https://graphty.app/storybook/graphty-element/?path=/story/styles-node--all-node-shapes)
- [Flat Shapes in 2D](https://graphty.app/storybook/graphty-element/?path=/story/styles-node--shapes-in-2-d)
- [Node Borders](https://graphty.app/storybook/graphty-element/?path=/story/styles-node--border-widths-and-styles)
- [Node Width and Height](https://graphty.app/storybook/graphty-element/?path=/story/styles-node--width-and-height)
- [Bezier Edges](https://graphty.app/storybook/graphty-element/?path=/story/styles-edge--bezier)
- [Bidirectional Arrows](https://graphty.app/storybook/graphty-element/?path=/story/styles-edge--bidirectional)
- [Layered Styles](https://graphty.app/storybook/graphty-element/?path=/story/styles-layered--two-layer-node-colors)
