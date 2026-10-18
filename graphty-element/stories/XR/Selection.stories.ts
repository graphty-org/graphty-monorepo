/**
 * XR / Selection: the selection demo in VR and AR, where a controller ray picks the node.
 *
 * These two stories share the component id "selection" with Interaction / Selection
 * (stories/Selection.stories.ts), so their story ids -- and their baselines -- are the ones they
 * have always had. That file declares the Docs page; this one does not, so the id has one.
 */
import "../../index.ts";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { ViewMode } from "../../src/config";
import { eventWaitingDecorator, type StoryArgs } from "../helpers";
import { renderSelectionDemo, selects } from "../selection-demo";

/** What a consumer writes: the same element and listener as in 2D or 3D, in a headset view mode. */
const XR_SELECTION_SOURCE = `<graphty-element id="graph" view-mode="vr"></graphty-element>
<script type="module">
    import "@graphty/graphty-element";

    const graph = document.querySelector("#graph");
    graph.nodeData = [{ id: "alpha", label: "Alpha" }, { id: "beta", label: "Beta" }];
    graph.edgeData = [{ src: "alpha", dst: "beta" }];

    // A controller ray that picks a node fires the same event a mouse click does.
    graph.addEventListener("selection-changed", (event) => {
        console.log(event.detail.currentNode?.id ?? "nothing selected");
    });
</script>`;

const meta: Meta = {
    title: "XR/Selection",
    id: "selection",
    component: "graphty-element",
    // Interaction / Selection declares the Docs page for the shared id "selection".
    tags: ["!autodocs"],
    decorators: [eventWaitingDecorator],
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component:
                    "Selection in a headset. Needs a VR or AR device: point a controller at a node and " +
                    "press the trigger to select it. The element fires the same `selection-changed` " +
                    "event a mouse click fires, so the page code is the same as in 2D or 3D. Without " +
                    "a device the element draws the 3D view and a 'not available' notice.",
            },
            source: { code: XR_SELECTION_SOURCE },
        },
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * Render the selection demo in a headset view mode, with a note on the bar saying what it needs.
 * @param viewMode - "vr" or "ar".
 * @returns The story's container.
 */
const renderXrSelection = (viewMode: ViewMode): HTMLDivElement => {
    const container = renderSelectionDemo(viewMode);
    const statusBar = container.querySelector("div");
    if (statusBar) {
        const note = document.createElement("span");
        note.style.cssText = "color: #ff9800; font-size: 12px; margin-left: 8px;";
        note.textContent = "Needs a VR or AR device";
        statusBar.appendChild(note);
    }

    return container;
};

/** Select a node with a VR controller's ray. Needs a VR headset and a WebXR browser. */
export const ModeVR: Story = {
    name: "VR",
    render: () => renderXrSelection("vr"),
    play: async ({ canvasElement }) => {
        await selects(canvasElement, "VR Mode");
    },
};

/** Select a node in AR. Needs an AR-capable phone or headset and a WebXR browser. */
export const ModeAR: Story = {
    name: "AR",
    render: () => renderXrSelection("ar"),
    play: async ({ canvasElement }) => {
        await selects(canvasElement, "AR Mode");
    },
};
