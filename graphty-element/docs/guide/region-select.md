# Rectangle and Lasso Selection

Select every node drawn inside a shape on the canvas, by dragging or from a script.

## Let readers drag a region

Off by default. Turn it on, and Shift with a drag that starts on empty canvas draws the shape;
releasing adds the nodes inside to the selection. A drag that starts on a node still moves the node.

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
element.layoutBehavior = { selection: { region: "lasso" } }; // or "rectangle"; "off" by default
element.addEventListener("selection-changed", () => {
    console.log(element.session.selection.nodes);
});
```

## Select a region from a script

A region is a polygon in CSS pixels from the canvas's top-left corner, the same pixels
`worldToScreen` returns and a pointer's `offsetX` and `offsetY` use. A rectangle is its four corners.

```ts
const delta = await element.session.selection.apply({
    region: {
        polygon: [
            { x: 40, y: 40 },
            { x: 240, y: 40 },
            { x: 240, y: 180 },
            { x: 40, y: 180 },
        ],
    },
});
console.log(delta.nodes, delta.truncated);
```

- A node is inside when its center is. A node drawn behind another is selected; a hidden,
  filtered-out or unplaced node is not.
- A region names nodes only. Follow it with `{ edgesBetween: true }` and `"add"` to take the
  edges among them.
- Past the selection's cap (5,000 elements) the selection is cut short and `truncated` is true.
- Fewer than three points, or a point that is not a finite number, is refused with
  `E_OPTION_RANGE`. A session with no canvas (`createGraphSession()`) refuses a region with
  `E_UNSUPPORTED`.
