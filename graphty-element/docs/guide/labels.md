# Labels

A node label is drawn when a style layer asks for one. When labeled nodes sit close together on
screen, their words land on top of each other. Turn on `layoutBehavior.labels.declutter` and the
element hides a label that would overlap one it keeps. `element.nodeLabelCounts` tells you how
many labels there are and how many were hidden, so your page can say so and offer to show them
all.

## Quick start

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const status = document.querySelector<HTMLElement>("#label-status")!;
const showAll = document.querySelector<HTMLInputElement>("#show-all-labels")!;

function render(): void {
    const { labeled, hiddenByOverlap } = element.nodeLabelCounts;
    status.textContent = `${labeled} labels, ${hiddenByOverlap} hidden to avoid overlap`;
}

render();
element.addEventListener("graphty-label-change", render);
showAll.onchange = () => {
    element.layoutBehavior = { labels: { declutter: !showAll.checked } };
};
```

The element reports numbers only. The words, and whether to show the line at all, are yours.

## What the counts mean

`element.nodeLabelCounts` is `{ labeled, nodeHidden, hiddenByOverlap }`, as of the last drawn
frame. All three are zero before a label is drawn, and reading it never forces a frame.

| Field             | What it counts                                                                     |
| ----------------- | ---------------------------------------------------------------------------------- |
| `labeled`         | Nodes whose label has text to draw. A node counts once, however many lines it has. |
| `nodeHidden`      | Of those, nodes not drawn themselves: a filter or the time window hides them.      |
| `hiddenByOverlap` | Of those, labels in view that declutter hid because they would overlap a kept one. |

- `labeled - nodeHidden - hiddenByOverlap` is how many labels the element would draw. Some of
  those may be outside the view: a label outside the view is never counted as hidden.
- `hiddenByOverlap` is always 0 while declutter is off. It depends on the camera and the size of
  the canvas, so an image exported at another size can hide a different number.
- Edge labels are not counted. The element never hides an edge label to avoid overlap.
- A later minor release may add another `hiddenBy...` count for a new reason. Each is a separate
  part of `labeled`.

## When `graphty-label-change` fires

The event's `detail` is the same counts. It fires when a count changes, once the view has
stopped changing: never during a camera gesture or while a layout is still moving nodes. It also
fires once after the first frame that has labels.

## The switch

`layoutBehavior.labels.declutter` is off by default, so a graph draws every label a style asks for
until you turn it on. Setting it is merged over the rest of `layoutBehavior` and takes effect on the
next frame. It is a preference of the view: it is not an undo step and a project does not save it.
Which label stays is described in [Styling](./styling#labels-that-would-overlap).
