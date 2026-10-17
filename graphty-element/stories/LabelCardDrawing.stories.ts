/**
 * A label panel drawn as a card: padding around the words, a thin border with large rounded
 * corners, and a drop shadow under the panel.
 *
 * Made only of public style options. It shows three things the label canvas draws: `padding`
 * moves the words in from the border (it used to grow the panel and leave the words where they
 * were), the border is as light at its corners as along its edges, and `panelShadow` throws a
 * shadow that is not cut off at the label's edge.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { assertGraphLoaded, assertLabelsDrawn, drawn } from "./assertions";
import { eventWaitingDecorator, setLayoutPreSteps, waitForGraphSettled } from "./helpers";

/** Three nodes in a row, far enough apart that their cards do not overlap. */
const NODES = [
    { id: "Valjean", position: { x: -6, y: 0, z: 0 } },
    { id: "Cosette", position: { x: 0, y: 0, z: 0 } },
    { id: "Marius", position: { x: 6, y: 0, z: 0 } },
];

/** The edges between them. */
const EDGES = [
    { src: "Valjean", dst: "Cosette" },
    { src: "Cosette", dst: "Marius" },
];

/**
 * Build the graph with a card label on every node.
 * @returns The element.
 */
function render(): Element {
    const element = document.createElement("graphty-element");

    setLayoutPreSteps(element, 0);

    void element.session.styles.add({
        name: "Card labels",
        target: "node",
        selector: { match: "everything" },
        set: {
            "node.labelStyle": {
                color: "#14161f",
                textAlign: "left",
                background: "#ffffff",
                padding: 16,
                marginTop: 0,
                marginBottom: 0,
                marginLeft: 0,
                marginRight: 0,
                cornerRadius: 24,
                borderWidth: 2,
                borderColor: "#c5cad6",
                panelShadow: true,
                panelShadowColor: "rgba(20, 22, 31, 0.25)",
                panelShadowBlur: 12,
                panelShadowOffsetY: 4,
                location: "top",
            },
        },
        encode: { "node.label": { by: "data.id", scale: "passthrough" } },
    });

    element.nodeData = NODES;
    element.edgeData = EDGES;
    element.layout = "fixed";
    element.layoutConfig = { dim: 3 };

    return element;
}

const meta: Meta = {
    title: "Labels",
    component: "graphty-element",
    render,
    decorators: [eventWaitingDecorator],
};
export default meta;

type Story = StoryObj;

/** Every node carries a card label with padding, rounded border and drop shadow. */
export const CardDrawing: Story = {
    name: "Card drawing",
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);

        const scene = await drawn(canvasElement, "Labels CardDrawing");
        await assertGraphLoaded(scene, { nodes: NODES.length, edges: EDGES.length });
        await assertLabelsDrawn(scene);
    },
};
