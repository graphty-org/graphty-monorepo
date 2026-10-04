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

function render({ labeled, hiddenByOverlap }: NodeLabelCounts): void {
    status.textContent = `${labeled} labels, ${hiddenByOverlap} hidden to avoid overlap`;
}
render(element.nodeLabelCounts);
element.addEventListener("graphty-label-change", (e) => render(e.detail));
showAll.onchange = () => {
    element.layoutBehavior = { labels: { declutter: !showAll.checked } };
};
```

The checkbox starts unchecked, which matches declutter being on. The element reports numbers
only. The words, and whether to show the line at all, are yours. Style layers are described in
[Styling](./styling).

## What the counts mean

`element.nodeLabelCounts` is `{ labeled, nodeHidden, hiddenByOverlap }`. It is a snapshot: a new
plain object each time a count changes, never one that updates in place. It describes the most
recent frame the element drew, so a change you make shows up after the next frame, which is
usually within a few milliseconds. All three are zero before a label is drawn, and reading it
never forces a frame.

| Field             | What it counts                                                                     |
| ----------------- | ---------------------------------------------------------------------------------- |
| `labeled`         | Nodes whose label has text to draw. A node counts once, however many lines it has. |
| `nodeHidden`      | Of those, nodes that are not drawn at all, so neither is their label (see below).  |
| `hiddenByOverlap` | Of those, labels in view that declutter hid because they would overlap a kept one. |

- A node is not drawn when a filter hides it or when it falls outside the time window (the range
  of dates the graph is showing). The `graphty-visibility-change` event reports both: see [Events](./events#three-more-the-element-mirrors-on-its-own-account).
- `labeled - nodeHidden - hiddenByOverlap` is how many labels the element draws. It is not how
  many are on screen: a label outside the view still counts as drawn, and is never counted as
  hidden. The element does not count labels in view.
- `hiddenByOverlap` is always 0 while declutter is off. It depends on the camera and the size of
  the canvas, so an image exported at another size can hide a different number.
- Edge labels are not counted. The element never hides an edge label to avoid overlap.
- A later minor release may add another `hiddenBy...` count for a new reason. Each is a separate
  part of `labeled`.

## When `graphty-label-change` fires

The event's `detail` is the same `NodeLabelCounts` object `element.nodeLabelCounts` returns, and
TypeScript types it as `CustomEvent<NodeLabelCounts>`. It fires when a count changes, once the
view has stopped changing: never during a camera gesture or while a layout is still moving nodes.
That includes turning declutter on or off on a still graph, and a filter that hides labeled nodes.
It also fires once after the first frame that has labels.

## The switch

`layoutBehavior.labels.declutter` is off by default, so a graph draws every label a style asks for
until you turn it on. Setting it is merged over the rest of `layoutBehavior` and takes effect on the
next frame. It is a preference of the view: it is not an undo step and a saved project does not keep it, so
your page sets it again after loading one.
Which label stays is described in [Styling](./styling#labels-that-would-overlap).
