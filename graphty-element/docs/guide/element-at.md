# What Is Under a Point

`element.elementAt({ x, y })` tells you which node is drawn at a point on the element: the node a
click at that point would select, or `null` when a click there would land on empty canvas. Use it
for a context menu, a custom hover readout, or a script that reports what a click landed on.

## Quick start

Show which node a right-click landed on:

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const readout = document.querySelector("#under-pointer")!;

element.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const rect = element.getBoundingClientRect();
    const hit = element.elementAt({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (hit === null) {
        readout.textContent = "Nothing here";
    } else if (hit.kind === "node") {
        readout.textContent = `Node ${String(hit.id)}`;
    } else {
        readout.textContent = `Edge ${hit.id}`;
    }
});
```

The words are the example's own; `elementAt` gives you only values.

## The point

`x` and `y` are CSS pixels from the element's top-left corner, the same space
`element.worldToScreen()` returns. For a mouse or pointer event, subtract the element's
`getBoundingClientRect()` from the event's `clientX` and `clientY`, as above. A point anywhere on
the element works in both 2D and 3D; the answer follows the camera as it is drawn now.

## What you get back

An `ElementAtResult`, or `null` when no node is at the point:

| `kind`   | `id`                                                             |
| -------- | ---------------------------------------------------------------- |
| `"node"` | The node's id as it was loaded (a `NodeId`, `string \| number`). |
| `"edge"` | An edge id (a `string`). Not returned yet; see below.            |

When nodes overlap on screen, you get the one in front, as a click would.

## Edges

Edges cannot be clicked yet, so `elementAt` does not return them: a point on an edge gives
whatever is behind it, usually `null`. The result's `kind` already includes `"edge"` so that
edges can be returned there later without a breaking change. Handle the `"edge"` case now, as the
example does, and your code keeps working when they arrive.

The `ElementAtResult` and `NodeId` types are exported from `@graphty/graphty-element`.
