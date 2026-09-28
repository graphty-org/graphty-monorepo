/**
 * The log destination guide's toy example, registered live through the simple tier.
 *
 * `showLayoutLog` is the file the guide includes (docs/examples/simple-tier/log-destination-panel.ts):
 * one `defineLogDestination` call that writes every layout record at info and above into a panel
 * beside the graph. The story defines it before the element is created, so the panel shows what
 * the element said while it laid the graph out, and nothing from the rest of the element.
 */

// Importing the module is what defines the <graphty-element> custom element.
import "../../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { showLayoutLog } from "../../docs/examples/simple-tier/log-destination-panel";
import { holds } from "../assertions";
import { eventWaitingDecorator, waitForGraphSettled } from "../helpers";

/** A small ring. */
const NODES = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }));
const EDGES = NODES.map((node, index) => ({ src: node.id, dst: NODES[(index + 1) % NODES.length].id }));

/**
 * The graph and, beside it, the panel the log destination writes into.
 * @returns The story's root.
 */
function render(): HTMLElement {
    const root = document.createElement("div");
    root.style.display = "flex";
    root.style.gap = "16px";

    const panel = document.createElement("pre");
    panel.dataset.testid = "log-panel";
    panel.style.width = "280px";
    panel.style.margin = "0";
    panel.style.font = "12px monospace";

    // Defined before the element exists: records made before a destination is attached are not replayed.
    void showLayoutLog(panel);

    const element = document.createElement("graphty-element");
    element.nodeData = [...NODES];
    element.edgeData = [...EDGES];
    element.layout = "circular";
    element.style.width = "480px";
    element.style.height = "360px";

    root.append(element, panel);
    return root;
}

const meta: Meta = {
    title: "Extending/Simple tier/Logging",
    component: "graphty-element",
    render,
    decorators: [eventWaitingDecorator],
};
export default meta;

type Story = StoryObj;

/** Layout records at info and above, shown in a panel beside the graph. */
export const LayoutLogPanel: Story = {
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);

        const panel = canvasElement.querySelector<HTMLElement>("[data-testid=log-panel]");
        const lines = (panel?.textContent ?? "").split("\n").filter((line) => line !== "");

        await holds(
            lines.includes("info: Setting layout"),
            `the panel shows the layout being set; it shows: ${lines.join(" | ")}`,
        );
        await holds(
            lines.every((line) => /^(info|warn|error): /.test(line)),
            `the panel shows only info and above; it shows: ${lines.join(" | ")}`,
        );
        await holds(!lines.includes("info: Initializing managers"), "and nothing from outside the layout");
    },
};
