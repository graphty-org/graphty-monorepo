# Where a Node Is on Screen

`element.nodeScreenPosition(id)` says where a node is drawn, how big it is drawn, and whether the
reader can see it. Use it to put an HTML marker or a popover over a node, or to click a node by
name in an automated test.

## Quick start

Put a ring over the node with id `"Valjean"` and keep it there as the camera and the layout move:

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const ring = document.querySelector<HTMLElement>("#ring")!; // absolutely positioned in the element's parent

function place(): void {
    const at = element.nodeScreenPosition("Valjean");
    ring.hidden = !at?.visible;
    if (at?.visible) {
        ring.style.left = `${at.x - at.radius}px`;
        ring.style.top = `${at.y - at.radius}px`;
        ring.style.width = ring.style.height = `${2 * at.radius}px`;
    }
    requestAnimationFrame(place);
}
place();
```

The ring's parent must have the same top-left corner as the element (for example, the element and
the ring share a `position: relative` wrapper).

## What you get back

`undefined` when the graph has no node with that id. Otherwise a `NodeScreenPosition`, exported
from `@graphty/graphty-element`:

| Field     | What it holds                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x`, `y`  | The node's centre in CSS pixels from the element's top-left corner, the same pixels `worldToScreen` returns. A click there selects the node.                                        |
| `visible` | `true` when the centre is inside the element, in front of the camera and the node is not hidden by the visibility filter. A node drawn behind another node still counts as visible. |
| `radius`  | How big the node is drawn: its largest half-extent, in pixels. A click within this distance of the centre lands on the node. `0` when the node is behind the camera.                |

The answer is a snapshot. Ask again after the camera, the layout or the element's size changes.
`x` and `y` are given even when `visible` is `false`, so you can point toward a node that is off
screen; for a node behind the camera they are not meaningful.

## Clicking a node by name

To drive the element from a Playwright test the way a reader would, ask the page where the node is
and click the canvas there:

```ts
import type { Graphty } from "@graphty/graphty-element";

const tag = page.locator("graphty-element");
const at = await tag.evaluate((el: Graphty) => el.nodeScreenPosition("Valjean"));
const box = await tag.boundingBox();
if (at?.visible && box) {
    await page.mouse.click(box.x + at.x, box.y + at.y);
}
```
