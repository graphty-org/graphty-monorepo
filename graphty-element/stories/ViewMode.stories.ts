import "../index.ts";

import type { Decorator, Meta, StoryObj } from "@storybook/web-components-vite";

import { VIEW_MODE_VALUES, type ViewMode } from "../src/config";
import { Graphty } from "../src/graphty-element";
import { assertGraphLoaded, assertLayoutPlaced, assertViewMode, drawn } from "./assertions";
import { edgeData, eventWaitingDecorator, nodeData, setLayoutPreSteps } from "./helpers";

/**
 * What a reader sees when the chosen XR mode is not available, so the fallback to 3D is not silent.
 */
const XR_UNAVAILABLE: Record<"vr" | "ar", string> = {
    vr: "VR mode unavailable: this browser or device has no WebXR VR, so the view stays in 3D. VR needs a WebXR browser, a connected headset and HTTPS.",
    ar: "AR mode unavailable: this browser or device has no WebXR AR, so the view stays in 3D. AR needs a WebXR browser, an ARCore or ARKit device and HTTPS.",
};

/**
 * Asks the story's own element whether the chosen XR mode is supported, and shows a banner over
 * it when not. The element's methods are safe before it is ready, so nothing waits first; a probe
 * that fails is shown and rethrown rather than read as "unsupported".
 * @param graphEl - The story's element.
 * @param mode - The XR mode the control chose.
 * @param banner - The banner to fill and show.
 */
async function reportXrAvailability(graphEl: Graphty, mode: "vr" | "ar", banner: HTMLElement): Promise<void> {
    try {
        const supported = await (mode === "vr" ? graphEl.isVRSupported() : graphEl.isARSupported());
        if (supported) {
            return;
        }

        banner.textContent = XR_UNAVAILABLE[mode];
    } catch (error) {
        banner.textContent = `${mode.toUpperCase()} support check failed: ${String(error)}`;
        throw error;
    } finally {
        banner.hidden = banner.textContent === "";
    }
}

/**
 * Decorator that says, in a banner over the graph, when AR or VR is chosen but WebXR cannot run it.
 * Only those two modes get the banner's wrapper, so every other story renders as it always has.
 */
const xrAvailabilityDecorator: Decorator = (story, context) => {
    const rendered = story();
    const viewMode = context.args.viewMode as ViewMode;
    if ((viewMode !== "vr" && viewMode !== "ar") || !(rendered instanceof Graphty)) {
        return rendered;
    }

    const banner = document.createElement("div");
    banner.setAttribute("role", "status");
    banner.hidden = true;
    banner.style.cssText =
        "position: absolute; top: 8px; left: 8px; right: 8px; padding: 8px 12px; background: #fff3cd; color: #664d03; border: 1px solid #ffecb5; border-radius: 4px; font: 13px sans-serif; z-index: 1;";
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position: relative; width: 100%; height: 100%;";
    wrapper.append(rendered, banner);
    void reportXrAvailability(rendered, viewMode, banner);
    return wrapper;
};

const meta: Meta = {
    title: "ViewMode",
    component: "graphty-element",
    decorators: [eventWaitingDecorator, xrAvailabilityDecorator],
    argTypes: {
        viewMode: {
            control: { type: "select" },
            options: VIEW_MODE_VALUES,
            description: "The rendering mode for the graph visualization",
            table: {
                defaultValue: { summary: "3d" },
            },
        },
    },
    parameters: {
        // Only show viewMode control, hide all other controls
        controls: { include: ["viewMode"] },
    },
    args: {
        nodeData,
        edgeData,
        viewMode: "3d" as ViewMode,
    },
};
export default meta;

type Story = StoryObj<Graphty & { viewMode: ViewMode }>;

/**
 * Interactive demo for switching between view modes (2D, 3D, AR, VR).
 *
 * ViewMode determines the rendering dimension and camera system:
 * - **2D**: Orthographic camera with pan/zoom controls, Z-axis locked to 0
 * - **3D**: Perspective camera with orbit controls, full 3D rendering
 * - **AR**: Augmented reality mode (requires WebXR AR support)
 * - **VR**: Virtual reality mode (requires WebXR VR support)
 *
 * Use the Storybook controls panel to switch between modes.
 * AR/VR modes require compatible hardware and browser support.
 */
export const SwitchViewModes: Story = {
    name: "Switch View Modes",
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
