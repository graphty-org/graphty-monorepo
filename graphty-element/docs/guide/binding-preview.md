# Previewing a Binding

Before you color or size the graph by a value, you can ask what that would paint.
`styles.preview` takes the binding you are about to write and answers with a histogram in the
scale's own space, what each bar paints, the steps of a stepped scale with their counts, and how
many elements would fall outside the scale or have no value. Nothing is written.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
const scores = [1, 2, 3, 5, 8, 13, 21, 34, 55, undefined];
await session.data.addNodes(scores.map((score, i) => ({ id: i, score })));

// What would coloring by score, in three steps, paint?
const preview = session.styles.preview({ by: "data.score", scale: "bins", bins: 3 }, { channel: "node.color" });

console.log(preview.steps); // where one step ends and the next begins
console.log(preview.stepCounts); // how many nodes each step paints, lowest first
for (const bar of preview.bins) console.log(bar.from, bar.to, bar.count, bar.paints);
console.log(preview.noValue, "nodes have no score"); // 1
```

## What comes back

| Field                      | What it is                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `bins`                     | the histogram: each bar's `from` and `to` in the value's units, its `count`, and what it `paints` |
| `steps`, `stepCounts`      | for a stepped scale (`bins`, `quantile`), the cuts and the elements per step; empty otherwise     |
| `domain`                   | the value range the scale covers, or `null` when nothing has a value                              |
| `below`, `above`           | elements outside a `clamp`, painted with the ends' values                                         |
| `noValue`, `noValuePaints` | elements with no value, and what they are painted                                                 |
| `outsideScale`             | elements whose value the scale has no place for, such as zero on a log scale                      |

The bars are equal stretches of the scale's space, so on a log scale each bar is a decade. Pass
`{ bins: 20 }` for a finer histogram. The preview runs the same preparation a repaint does, so the
layer you then write paints what the preview showed.

## Your own colors

A binding can carry its own colors in place of a named palette, with `stops`, and they are saved
with the layer:

```ts
session.styles.preview({ by: "data.score", stops: ["#f7fbff", "#08306b"] }, { channel: "node.color" });
```

## What lies beneath a row

A panel that shows an empty field as "not set here" can say what the layers beneath give instead:
`styles.agreement(scope, channel, { below: rowId })` reads only the layers under that row, and
answers with the shared value and the layer that paints it, or with a breakdown when they differ.
