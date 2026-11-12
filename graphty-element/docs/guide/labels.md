# Labels

A node label is drawn when a style layer asks for one. When labeled nodes sit close together on
screen, their words land on top of each other. Turn on `layoutBehavior.labels.declutter` and the
element hides a label that would overlap one it keeps. `element.nodeLabelCounts` tells you how
many labels there are and how many were hidden, so your page can say so and offer to show them
all.

## Quick start

Run this as a module script (`<script type="module">`), because it uses top-level `await`:

```typescript
import "@graphty/graphty-element";
import type { NodeLabelCounts } from "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const status = document.querySelector<HTMLElement>("#label-status")!;
const showAll = document.querySelector<HTMLInputElement>("#show-all-labels")!;

// Label every node, with its id as the words.
await element.session.styles.add({
    name: "Labels",
    target: "node",
    selector: { match: "everything" },
    set: { "node.labelStyle": { enabled: true } },
});
element.layoutBehavior = { labels: { declutter: true } }; // off by default

function render({ labeled, nodeHidden, hiddenByOverlap }: NodeLabelCounts): void {
    const drawn = labeled - nodeHidden - hiddenByOverlap;
    status.textContent = `${drawn} labels drawn, ${hiddenByOverlap} hidden to avoid overlap`;
}
render(element.nodeLabelCounts); // the counts so far; the event reports later changes
element.addEventListener("graphty-label-change", (e) => render(e.detail));
showAll.onchange = () => {
    element.layoutBehavior = { labels: { declutter: !showAll.checked } };
};
```

`document.querySelector("graphty-element")` is typed as the element once the package is imported,
so `nodeLabelCounts` and the event's `detail` need no cast. The checkbox starts unchecked, which
matches declutter being on. The element reports numbers only. The words, and whether to show the
line at all, are yours. Style layers are described in [Styling](./styling).

## What the counts mean

`element.nodeLabelCounts` is `{ labeled, nodeHidden, hiddenByOverlap }`. It is a snapshot: a new plain object each time a count changes, never one that updates in place. It
describes the most recent frame the element drew, so a change you make shows up after the next
frame, which is usually within a few milliseconds. All three are zero before a label is drawn, and
reading it never forces a frame.

`nodeHidden` and `hiddenByOverlap` are two separate reasons a label is not drawn, and a label is
counted under one of them at most: a label whose node is hidden is never also counted as hidden by
overlap. So `labeled - nodeHidden - hiddenByOverlap` is how many labels the element draws.

| Field             | What it counts                                                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `labeled`         | Nodes whose label has text to draw. A node counts once, however many lines it has.                                                                                                 |
| `nodeHidden`      | Labels not drawn because their node is not drawn (see below).                                                                                                                      |
| `hiddenByOverlap` | Labels in view that declutter hid because they would overlap a kept one (or, with `avoidNodesAndEdges`, had no place clear of kept labels and other nodes). Never a hidden node's. |

- A node is not drawn when a filter hides it or when it falls outside the time window (the range
  of dates the graph is showing). The `graphty-visibility-change` event reports both: see [Events](./events#three-more-the-element-mirrors-on-its-own-account).
- The number drawn is not how many labels are on screen: a label outside the view still counts as
  drawn, and is never counted as hidden. The element does not count labels in view.
- `hiddenByOverlap` is always 0 while declutter is off. It depends on the camera and the size of
  the canvas, so an image exported at another size can hide a different number.
- Edge labels are not counted. The element never hides an edge label to avoid overlap.
- A later minor release may add another `hiddenBy...` count for a new reason, separate from these
  two. When it does, the number drawn is `labeled` less every `hidden` count, so code that
  subtracts only these two will overstate it. Check the release notes before upgrading a minor.

## When `graphty-label-change` fires

The event's `detail` is the same `NodeLabelCounts` object `element.nodeLabelCounts` returns, and
TypeScript types it as `CustomEvent<NodeLabelCounts>`. It bubbles and is composed, so a listener on
an ancestor or outside a shadow root hears it too. It fires when a count changes, once the view has
stopped changing: never during a camera gesture or while a layout is still moving nodes. That
includes turning declutter on or off on a still graph, and a filter that hides labeled nodes. It
also fires once after the first frame that has labels. It does not fire when a label's text changes
and no count does.

Read `element.nodeLabelCounts` once when you attach the listener, as the quick start does: if the
counts were published before your listener existed, the event will not repeat them.

## The switch

`layoutBehavior.labels.declutter` is off by default, so a graph draws every label a style asks for
until you turn it on. Setting it is merged over the rest of `layoutBehavior` and takes effect on the
next frame. It is a preference of the view: it is not an undo step and a saved project does not keep it, so
your page sets it again after loading one.
Which label stays is described in [Styling](./styling#labels-that-would-overlap).

## Labels that cover nodes and edges

A label is drawn where its style puts it -- above its node, by default -- even when another node or
an edge is there. Turn on `layoutBehavior.labels.avoidNodesAndEdges` and the element moves a label
that would cover one: it tries the label's own place first, then above, below, right, left and the
four corners of its node, and draws it at the first place that covers no other label, node or edge.
When every place covers something, it takes the one that covers least (another label is worst, then
a node, then an edge).

```typescript
element.layoutBehavior = { labels: { declutter: true, avoidNodesAndEdges: true } }; // both off by default
```

- With `declutter` on, a label with no place clear of other labels and nodes is hidden and counted in
  `hiddenByOverlap`. A label that can only be placed over an edge is drawn there.
- With `declutter` off, no label is hidden: each one is moved to the place that covers least, which
  may still be over something.
- Turning it off puts every label back where its style puts it. It is decided again whenever the
  camera, the canvas size, a node's position, size or visibility, or the labels change, and it is a
  preference of the view like `declutter`.
- It costs more than `declutter` alone, because every node and edge is placed on screen as well:
  about 5 ms a pass at 1,000 nodes and 60 to 80 ms at 10,000, on a workstation. A pass runs only on
  a frame where something above changed.

## A label on every node of a large graph

Building a label costs far more than drawing a node, so a graph with a label on every one of
100,000 nodes is slow to draw even though only a few hundred of them can be read at once. Set
`layoutBehavior.labels.sampleCell` to a size in CSS pixels and the element divides the canvas into
square cells of that size and builds the label of one node per cell: a selected node first, then
the node with more edges. The other labels are not built at all.

```typescript
element.layoutBehavior = { labels: { sampleCell: 96 } }; // unset by default: every label is built
element.layoutBehavior = { labels: { sampleCell: undefined } }; // back to every label
```

- The cells are chosen again once the view settles: when the camera, the canvas size and the node
  positions have held still for a frame. Nothing is built during a gesture or while a layout moves
  nodes, so zooming in shows more labels when the zoom stops.
- `nodeLabelCounts` gains `hiddenBySampling` while it is on: labels not built because another
  node's label was kept in their cell, or because their node is outside the view. A hidden node's
  label is counted in `nodeHidden` as before. Unset, the counts have no `hiddenBySampling` field.
- `declutter` and `avoidNodesAndEdges` work on the labels sampling built.
- `labelOf(id)` returns undefined for a node whose label was not built.
- A preference of the view, like `declutter`: not an undo step, and a saved project does not keep it.

### Drawing many labels in one draw

Set `layoutBehavior.labels.labelText` to `"glyphs"` and the element draws every plain node label
from one shared atlas of glyphs, all of them in a single draw, instead of drawing each label on a
canvas of its own. Thousands of labels then cost little more to draw than one.

```typescript
element.layoutBehavior = { labels: { labelText: "glyphs" } }; // "canvas" by default
```

- Its letters are drawn from a distance field, so their edges differ slightly from the canvas's.
  Where each glyph sits, and how lines wrap and align, are the same.
- A label the atlas cannot draw is drawn on its own canvas as before, label by label: one with a
  panel, border, pointer, badge, table, close button, shadow, outline, animation, depth fade or
  `onTop`; words in a right-to-left or Indic script, emoji or combining marks; a pair its font
  draws as a ligature (such as "fi" in DejaVu Sans); a glyph that no longer fits in the atlas; or a
  web font that has not loaded yet.
- `declutter`, `avoidNodesAndEdges` and `sampleCell` work on glyph labels as on any other.
- It applies to labels built after it is set. A preference of the view, like `declutter`.

## Label markup

A label's words may carry markup tags, each closed by its own end tag: `<bold>`, `<italic>`,
`<color='#ff0000'>`, `<font='monospace'>`, `<size='150%'>` (or a size in pixels), `<bg='#ffd700'>`
and `<shift='60%'>`, which draws the run that far below the line (a share of the label's own size;
negative is above), the line growing to hold it. `<nudge='60%'>` moves a run the same way and leaves
the line where it was, as superscripts do. Where runs of different sizes meet on one line is the label style's `runAlign`
(`node.labelRunAlign`): on their alphabetic baselines (the default), on their hanging baselines so
their tops line up, or on their middles.

## Long labels

A long name drawn on one line covers its neighbors. `wrapWidth` breaks it onto more lines at the
spaces between words, and `maxLines` keeps at most that many lines, ending the last one with an
ellipsis where the rest was cut. `maxLines` also cuts a label that has more lines of its own, with
no `wrapWidth`. Markup runs keep their style across the breaks.

```typescript
await element.session.styles.add({
    name: "Short names",
    target: "node",
    selector: { match: "everything" },
    set: {
        "node.label": "Department of Health and Human Services",
        "node.labelStyle": { wrapWidth: 4, maxLines: 2 },
    },
});
```

`wrapWidth` is in the scene's units, the same as a node's `size`.

## A control for every label field

`LABEL_STYLE_DESCRIPTORS` describes every field of a label style: its name, the kind of value it
takes, its choices or bounds, and what is drawn while nothing sets it. A settings panel can draw a
control for each field from it without listing any of them itself.

```typescript
import { LABEL_STYLE_DESCRIPTORS } from "@graphty/graphty-element/catalog";

for (const field of LABEL_STYLE_DESCRIPTORS) {
    // field.field: "maxLines"; field.plainName: "Max Lines"
    // field.accepts: "number"; field.min: 1; field.integer: true
    // field.values: the choices of an "enum" field; field.default: the value drawn when unset
    console.log(field.field, field.accepts, field.default);
}
```

A label that stays the same size on screen at any distance is `sizeMode: "screen"`: its `sizePx`
is then measured in CSS pixels.

## Text from several values

A `template` binding builds a label from several values, one string per line. `{path}` reads a
value with the same paths `by` takes. `{path|count}` is how many distinct values that path holds
across the nodes, and `{path|rank}` is this node's value's place among them, counting from 1 in
sorted order. A line with any value missing is left out, so a row about a result appears only once
the result exists:

```typescript
await element.session.styles.add({
    name: "Card",
    target: "node",
    selector: { match: "everything" },
    encode: {
        "node.label": {
            template: [
                "<bold>{data.name}</bold>",
                "Connections: {results.degree.value}",
                "Community {results.louvain.group|rank} of {results.louvain.group|count}",
            ],
        },
    },
});
```

Louvain numbers its groups by id, not from 1, so `rank` and `count` are what give "Community 2 of
5". Every word is yours; the element adds none. A value is drawn as written: a name holding
`<bold>` shows the tag, and only the template's own markup is read. Templates work on `node.label`,
`edge.label` (where `count` and `rank` are taken across the edges) and `node.tooltip`.

## One node's label

`element.labelOf(id)` returns the label of one node as the element draws it: `{ text, drawn }`, or
`undefined` when there is no node with that id or the node has no label. Use it to check what a
reader sees, for example in an end-to-end test or a guided tour.

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;

await element.addNodes([{ id: "v", name: "<bold>Jean</bold> Valjean" }]);
await element.session.styles.add({
    name: "Names",
    target: "node",
    selector: { match: "has", path: "data.name" },
    encode: { "node.label": { by: "data.name" } },
});
await element.waitForStableFrame(); // labels are built and placed as frames are drawn

const label = element.labelOf("v");
console.log(label?.text); // "Jean Valjean"
console.log(label?.drawn); // true, or false when the label is hidden
```

- `text` is the words on screen: the value the label was bound to, with its markup (`<bold>`,
  `<color='...'>`) applied, so the tags are not part of it. `<lt>` in markup draws a literal `<`. A label of several lines has them
  joined with `"\n"`.
- `drawn` is `false` when the label is not on screen because its node is hidden (a filter or the
  time window), or because declutter hid it to avoid an overlap (with `avoidNodesAndEdges`, also
  an overlap with a node). Like the counts above, a label
  outside the view still reads `drawn: true`.
- It reads the most recent frame and never forces one, so after a change, wait for
  `element.waitForStableFrame()` before reading it.
