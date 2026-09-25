/**
 * Node Selection Stories
 *
 * Demonstrates the node selection feature across different view modes.
 * Click on a node to select it - selected nodes show a yellow outline.
 * Click on the background to deselect.
 */
import "../index.ts";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { ViewMode } from "../src/config";
import { Graphty } from "../src/graphty-element";
import {
    assertDrawnColour,
    assertGraphLoaded,
    assertLabelsDrawn,
    assertSelectionDrawn,
    drawn,
    holds,
} from "./assertions";
import { eventWaitingDecorator, setLayoutPreSteps, type StoryArgs, waitForGraphSettled } from "./helpers";

// Sample data with named nodes for clarity
const selectionNodeData = [
    { id: "alpha", label: "Alpha" },
    { id: "beta", label: "Beta" },
    { id: "gamma", label: "Gamma" },
    { id: "delta", label: "Delta" },
    { id: "epsilon", label: "Epsilon" },
];

const selectionEdgeData = [
    { src: "alpha", dst: "beta" },
    { src: "alpha", dst: "gamma" },
    { src: "beta", dst: "delta" },
    { src: "gamma", dst: "delta" },
    { src: "delta", dst: "epsilon" },
];

/**
 * Set the graph up for the selection demo: blue spheres, each labelled with its own name.
 *
 * The label is BOUND to a column rather than written out, which is what `encode` is for: the
 * words come from each node's own `label` field. The label's font size and colour are the two
 * fields of `node.labelStyle` this needs; where the label sits relative to the node has no
 * channel, so it is drawn wherever the renderer puts it by default.
 * @param element - The element to set up.
 * @param viewMode - 2D or 3D.
 */
const setUpSelectionDemo = (element: Graphty, viewMode: ViewMode): void => {
    element.viewMode = viewMode;
    setLayoutPreSteps(element, 2000);

    void element.session.styles.add({
        name: "Selection demo - labelled nodes",
        target: "node",
        selector: { match: "everything" },
        set: {
            "node.shape": "sphere",
            "node.size": 1.5,
            "node.color": "#4A90D9",
            "node.labelStyle": { sizePx: 14, color: "#FFFFFF" },
        },
        encode: { "node.label": { by: "data.label", scale: "passthrough" } },
    });
};

/**
 * Render function that creates a selection demo with status display
 */
const renderSelectionDemo = (viewMode: ViewMode): HTMLDivElement => {
    // Prevent document scrolling to avoid browser's focus-scroll behavior.
    // When clicking on the canvas, browsers auto-scroll to bring focused elements into view,
    // which can hide the status bar. For fullscreen stories, the document should never scroll.
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    // Reset any existing scroll position
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Create container - use position: fixed to be independent of document scroll
    const container = document.createElement("div");
    container.style.cssText =
        "position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; overflow: hidden;";

    // Create status bar
    const statusBar = document.createElement("div");
    statusBar.style.cssText = `
        padding: 12px 16px;
        background: #2a2a2a;
        color: #fff;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        border-bottom: 1px solid #444;
        display: flex;
        align-items: center;
        gap: 16px;
        flex-shrink: 0;
    `;
    statusBar.innerHTML = `
        <span style="color: #888;">Selected Node:</span>
        <span id="selected-node-display" style="font-weight: 600; color: #4A90D9;">None</span>
        <span style="margin-left: auto; color: #666; font-size: 12px;">
            Click a node to select • Click background to deselect
        </span>
    `;
    container.appendChild(statusBar);

    // Create graph element
    // min-height: 0 is required for flexbox - without it, flex items have min-height: auto
    // which prevents them from shrinking below their content size
    const graphEl = document.createElement("graphty-element") as Graphty;
    graphEl.style.cssText = "flex: 1; display: block; min-height: 0;";
    graphEl.nodeData = selectionNodeData;
    graphEl.edgeData = selectionEdgeData;
    setUpSelectionDemo(graphEl, viewMode);
    graphEl.layoutConfig = { seed: 42 };
    container.appendChild(graphEl);

    // Set up selection change listener
    graphEl.addEventListener("selection-changed", (event) => {
        const display = container.querySelector("#selected-node-display");
        if (display) {
            const customEvent = event as CustomEvent<{ currentNode: { id: string; data: { label?: string } } | null }>;
            const node = customEvent.detail.currentNode;
            if (node) {
                const label = node.data.label ?? node.id;
                display.textContent = `${label} (${node.id})`;
                (display as HTMLElement).style.color = "#FFFF00";
            } else {
                display.textContent = "None";
                (display as HTMLElement).style.color = "#4A90D9";
            }
        }
    });

    return container;
};

/**
 * Settle a selection story, then select a node and check that the picture says so.
 *
 * WHAT THESE FOUR STORIES ARE FOR: clicking a node selects it, the element draws a highlight
 * around it, and the status bar above the canvas names it. Every one of those three is a fact
 * something can be asked for, and until now none of them was.
 * @param canvasElement - Where the story was rendered.
 * @param story - How to name it in a failure message.
 */
const selects = async (canvasElement: HTMLElement, story: string): Promise<void> => {
    await waitForGraphSettled(canvasElement);

    const scene = await drawn(canvasElement, `Selection ${story}`);

    await assertGraphLoaded(scene, { nodes: 5, edges: 5 });
    await assertDrawnColour(scene, "#4a90d9");
    await assertLabelsDrawn(scene);
    await assertSelectionDrawn(scene, "alpha");

    // The status bar is the story's own chrome, and it is driven by the element's
    // `selection-changed` event rather than by anything the story polls.
    const display = canvasElement.querySelector("#selected-node-display");

    await holds(display !== null, `Selection ${story}: the story's status bar is not on the page`);

    await holds(
        display?.textContent === "Alpha (alpha)",
        `Selection ${story}: node "alpha" is selected and the status bar reads ` +
            `"${String(display?.textContent)}" rather than "Alpha (alpha)"`,
    );
};

const meta: Meta = {
    title: "Selection",
    component: "graphty-element",
    decorators: [eventWaitingDecorator],
    parameters: {
        layout: "fullscreen",
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * 2D Mode Selection
 *
 * Click on nodes to select them in 2D orthographic view.
 * Selected nodes display a yellow outline.
 */
export const Mode2D: Story = {
    name: "2D Mode",
    render: () => renderSelectionDemo("2d"),
    play: async ({ canvasElement }) => {
        await selects(canvasElement, "2D Mode");
    },
};

/**
 * 3D Mode Selection
 *
 * Click on nodes to select them in 3D perspective view.
 * You can orbit the camera while maintaining selection.
 */
export const Mode3D: Story = {
    name: "3D Mode",
    render: () => renderSelectionDemo("3d"),
    play: async ({ canvasElement }) => {
        await selects(canvasElement, "3D Mode");
    },
};

/**
 * VR Mode Selection
 *
 * Enter VR mode to select nodes using VR controllers.
 * Requires a WebXR-compatible browser and VR headset.
 *
 * Note: VR selection uses controller raycasting instead of mouse clicks.
 */
export const ModeVR: Story = {
    name: "VR Mode",
    render: () => {
        const container = renderSelectionDemo("vr");

        // Add VR-specific instructions
        const statusBar = container.querySelector("div");
        if (statusBar) {
            const vrNote = document.createElement("span");
            vrNote.style.cssText = "color: #ff9800; font-size: 12px; margin-left: 8px;";
            vrNote.textContent = "⚠️ Requires VR headset";
            statusBar.appendChild(vrNote);
        }

        return container;
    },
    play: async ({ canvasElement }) => {
        await selects(canvasElement, "VR Mode");
    },
};

/**
 * AR Mode Selection
 *
 * Enter AR mode to select nodes in augmented reality.
 * Requires a WebXR-compatible browser and AR-capable device.
 */
export const ModeAR: Story = {
    name: "AR Mode",
    render: () => {
        const container = renderSelectionDemo("ar");

        // Add AR-specific instructions
        const statusBar = container.querySelector("div");
        if (statusBar) {
            const arNote = document.createElement("span");
            arNote.style.cssText = "color: #ff9800; font-size: 12px; margin-left: 8px;";
            arNote.textContent = "⚠️ Requires AR-capable device";
            statusBar.appendChild(arNote);
        }

        return container;
    },
    play: async ({ canvasElement }) => {
        await selects(canvasElement, "AR Mode");
    },
};
