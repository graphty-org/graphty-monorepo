# Print Look

A drawing that is printed in grayscale, or read by someone who sees no color, shows each color as
a gray. Two colors that are easy to tell apart on screen can fall on the same gray. Marks drawn at
size 0 vanish. graphty-element can list the colors that collide, and draw every mark at least a
minimum size.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
await session.data.addNodes([
    { id: "a", kind: "x" },
    { id: "b", kind: "y" },
]);
await session.styles.add({
    name: "Kinds",
    target: "node",
    selector: { match: "everything" },
    encode: { "node.color": { by: "data.kind", scale: "ordinal", map: { x: "#ff0000", y: "#008000" } } },
});

// Red and green print as nearly the same gray: about 7 apart on a 0 to 100 scale.
for (const {
    colors: [darker, lighter],
    difference,
} of session.styles.grayCollisions()) {
    console.log(darker.color, lighter.color, difference.toFixed(1));
}

// Draw nodes at least 0.5 and edges at least 1 wide, even where a layer paints 0.
await session.config.set({ minMarkSize: { node: 0.5, edge: 1 } });
```

## Colors on the same gray

`styles.grayCollisions(options?)` checks every pair of colors the shown layers draw, on every
color channel: fills, outlines, edges, glows and label colors. It reads fixed colors and each row
of a category palette. It leaves out a color ramp, whose steps are meant to blend, a row a layer
above paints over, a layer that is turned off, and a layer that paints nothing right now.

Each color's gray is its CIE L* lightness: 0 is black and 100 is white, with a D65 white point.
Two colors collide when their lightness differs by less than the threshold: 10 by default, or
`grayCollisions({ threshold })`. The result lists each pair once, closest first. Each entry holds:

- `colors`: the two colors, darker first. Each has its `color` (hex), its `lightness`, and `uses`:
  every layer and channel that draws it, with the data `value` for a palette row.
- `difference`: how far apart the two lightness values are.

An empty list means every color in use stands apart.

## A minimum mark size

The project setting `minMarkSize` sets the smallest a mark is drawn. `node` is in the units of the
`node.size` channel, and `edge` in the units of `edge.width`. A node or edge painted smaller is
drawn at the minimum, and that includes a size or width of 0. Only the drawing changes. What the
layers wrote stays as it was, and so do `styles.explain()` and the legend.

The setting is off by default, and so is a minimum of 0: every mark is drawn at the size its layers
paint, and an edge of width 0 draws no line. Set it to `undefined` to turn it off again. Like every
project setting, it is one undo step and is saved in the project.
