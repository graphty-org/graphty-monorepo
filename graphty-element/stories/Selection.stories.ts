/**
 * Interaction / Selection: click a node to select it, click the background to clear it.
 *
 * The VR and AR variants share this file's component id ("selection") and live in
 * stories/XR/Selection.stories.ts, so their story ids and baselines are unchanged.
 */
import "../index.ts";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { eventWaitingDecorator, type StoryArgs } from "./helpers";
import { renderSelectionDemo, selects } from "./selection-demo";

/** What a consumer writes to get this story: the element, and a listener for its selection event. */
const SELECTION_SOURCE = `<graphty-element id="graph" view-mode="2d"></graphty-element>
<div>Selected node: <span id="selected">None</span></div>
<script type="module">
    import "@graphty/graphty-element";

    const graph = document.querySelector("#graph");
    graph.nodeData = [{ id: "alpha", label: "Alpha" }, { id: "beta", label: "Beta" }];
    graph.edgeData = [{ src: "alpha", dst: "beta" }];

    graph.addEventListener("selection-changed", (event) => {
        const node = event.detail.currentNode;
        document.querySelector("#selected").textContent = node ? node.data.label : "None";
    });
</script>`;

const meta: Meta = {
    title: "Interaction/Selection",
    id: "selection",
    component: "graphty-element",
    tags: ["autodocs"],
    decorators: [eventWaitingDecorator],
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component:
                    "Click a node to select it; the element draws a highlight around it and fires " +
                    "`selection-changed` with the node. Click the background to clear the selection. " +
                    "The bar above the canvas is ordinary page code listening to that event. " +
                    "Selection works the same in 2D and 3D; in 3D you can orbit the camera and the " +
                    "selection stays. To change how the highlight looks, see Styling / Selection highlight. " +
                    "To select from code, call `element.selectNode(id)`; `element.deselectNode()` clears it.",
            },
            source: { code: SELECTION_SOURCE },
        },
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/** Click a node in the flat, top-down 2D view. */
export const Mode2D: Story = {
    name: "2D",
    render: () => renderSelectionDemo("2d"),
    play: async ({ canvasElement }) => {
        await selects(canvasElement, "2D Mode");
    },
};

/** Click a node in the 3D view; drag the background to orbit and the selection stays. */
export const Mode3D: Story = {
    name: "3D",
    render: () => renderSelectionDemo("3d"),
    play: async ({ canvasElement }) => {
        await selects(canvasElement, "3D Mode");
    },
};
