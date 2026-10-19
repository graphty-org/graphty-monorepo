# Counting What a Layer Paints

Ask any style layer how many elements it covers and on how many it is the color, size or shape
a reader actually sees. The answer is numbers only, so you write the sentence ("Colors 2 of 4
nodes") in your own words and language.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
await session.data.addNodes([{ id: "a", score: 2 }, { id: "b", score: 8 }, { id: "c", score: 0 }, { id: "d" }]);

// Color every node by its score, on a logarithmic scale.
const layer = await session.styles.add({
    name: "By score",
    target: "node",
    selector: { match: "everything" },
    encode: { "node.color": { by: "data.score", scale: "log", palette: "viridis" } },
});

const counts = session.styles.counts(layer.id);
console.log(`Colors ${String(counts.painted["node.color"])} of ${String(counts.matched)} nodes`);
console.log(counts.noValue, "have no score;", counts.outsideScale, "cannot be placed on a log scale");
```

This prints `Colors 2 of 4 nodes`, then `1 have no score; 1 cannot be placed on a log scale`.

## What each number means

- `matched` -- how many elements the layer's selector picks. A hidden layer still matches them.
- `painted` -- one entry per channel the layer writes: on how many of the matched elements this
  layer is the one the picture shows. A layer higher in the list that paints the same channel on
  the same element takes that element away, so two overlapping layers each count only the
  elements they win. A hidden layer wins nothing, so every entry is 0. This is the same answer
  `styles.explain()` gives one element at a time.
- `noValue` -- matched elements that have no value (absent or null) for the field the layer reads.
- `outsideScale` -- matched elements whose value the scale has no place for, such as 0 or a
  negative number on a logarithmic scale.
- `revision` -- changes whenever the counts may have changed. Keep it beside a number you show and
  read the counts again when it would differ.

A layer id the list does not hold throws a `GraphtyError` with code `E_UNKNOWN_LAYER`.

## Keeping the numbers current

The counts follow the data, the run results and the layers. Read them again after a
`style:changed` event and after a data change:

```ts
session.on("style:changed", () => {
    const { painted, matched } = session.styles.counts(layer.id);
    console.log(painted["node.color"], matched);
});
```

## Showing a layer's paint

`session.styles.legendOf(layer.id)` returns the legend blocks of that one layer, the same blocks
`styles.legend()` draws, but for any layer, including the element's own base layers. A layer that
sets a fixed color answers one block with one swatch, so a layer list can draw a color chip
beside the count. A hidden layer paints nothing and answers no blocks.
