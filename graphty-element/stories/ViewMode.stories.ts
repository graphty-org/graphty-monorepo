import "../index.ts";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { VIEW_MODE_VALUES, type ViewMode } from "../src/config";
import type { Graphty } from "../src/graphty-element";
import { assertGraphLoaded, assertLayoutPlaced, assertViewMode, drawn } from "./assertions";
import { edgeData, eventWaitingDecorator, nodeData, setLayoutPreSteps } from "./helpers";

/** What a consumer writes: the attribute, or the property, set to "2d", "3d", "vr" or "ar". */
const VIEW_MODE_SOURCE = `<graphty-element view-mode="3d"></graphty-element>
<script type="module">
    import "@graphty/graphty-element";

    const graph = document.querySelector("graphty-element");
    graph.nodeData = [{ id: 0 }, { id: 1 }, { id: 2 }];
    graph.edgeData = [{ src: 0, dst: 1 }, { src: 1, dst: 2 }];

    // Switch at any time; VR and AR need a headset and fall back to 3D without one.
    graph.viewMode = "2d";
</script>`;

const meta: Meta = {
    title: "Interaction/Camera and views/View modes",
    id: "viewmode",
    component: "graphty-element",
    tags: ["autodocs"],
    decorators: [eventWaitingDecorator],
    argTypes: {
        viewMode: {
            control: { type: "select" },
            options: VIEW_MODE_VALUES,
            name: "View mode",
            description: "How the graph is drawn: 2d, 3d, vr or ar",
            table: {
                defaultValue: { summary: "3d" },
            },
        },
    },
    parameters: {
        // Only show viewMode control, hide all other controls
        controls: { include: ["viewMode"] },
        docs: {
            description: {
                component:
                    "`view-mode` picks how the graph is drawn: `2d` is a flat top-down view you pan and " +
                    "zoom, `3d` (the default) is a perspective view you orbit, and `vr` and `ar` draw it " +
                    "in a headset. VR and AR need a VR or AR device and a WebXR browser; without one the " +
                    "element draws 3D. Use the View mode control to switch. For headset features see the " +
                    "XR section.",
            },
            source: { code: VIEW_MODE_SOURCE },
        },
    },
    args: {
        nodeData,
        edgeData,
        viewMode: "3d" as ViewMode,
    },
};
export default meta;

type Story = StoryObj<Graphty & { viewMode: ViewMode }>;

/** Switch between 2D, 3D, VR and AR with the View mode control. */
export const SwitchViewModes: Story = {
    name: "Switch view modes",
    args: {
        viewMode: "3d",
        layoutConfig: {
            seed: 42,
        },
    },
    render: (args) => {
        const graphEl = document.createElement("graphty-element");
        graphEl.id = "graph-viewmode";
        graphEl.style.cssText = "width: 100%; height: 100%; display: block;";
        graphEl.nodeData = args.nodeData;
        graphEl.edgeData = args.edgeData;
        graphEl.layoutConfig = args.layoutConfig;
        setLayoutPreSteps(graphEl, 2000);
        graphEl.viewMode = args.viewMode;

        return graphEl;
    },
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "ViewMode SwitchViewModes");

        await assertGraphLoaded(scene, { nodes: 6, edges: 6 });
        await assertLayoutPlaced(scene, {});

        // The control is the story; its opening position is 3d, and the camera the element
        // actually draws through is how a reader can tell the control did anything.
        await assertViewMode(scene, "3d");
    },
};
