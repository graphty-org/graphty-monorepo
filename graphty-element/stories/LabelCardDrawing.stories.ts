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

import type { Graphty } from "../src/graphty-element";
import { assertGraphLoaded, assertLabelsDrawn, clickNode, type Drawn, drawn, holds } from "./assertions";
import { eventWaitingDecorator, realInput, setLayoutPreSteps, waitForGraphSettled } from "./helpers";

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

/** Two communities joined by one bridge, for the Card look story. */
const PEOPLE: readonly (readonly [string, number])[] = [
    ["Valjean", 0],
    ["Javert", 0],
    ["Fantine", 0],
    ["Cosette", 0],
    ["Thenardier", 0],
    ["Gavroche", 1],
    ["Enjolras", 1],
    ["Marius", 1],
    ["Courfeyrac", 1],
];

/** Who knows whom. */
const LINKS: readonly (readonly [string, string])[] = [
    ["Valjean", "Javert"],
    ["Valjean", "Fantine"],
    ["Valjean", "Cosette"],
    ["Valjean", "Thenardier"],
    ["Fantine", "Cosette"],
    ["Thenardier", "Cosette"],
    ["Valjean", "Marius"],
    ["Marius", "Cosette"],
    ["Marius", "Enjolras"],
    ["Marius", "Courfeyrac"],
    ["Enjolras", "Courfeyrac"],
    ["Enjolras", "Gavroche"],
    ["Courfeyrac", "Gavroche"],
];

/** The two communities' colors. */
const COMMUNITY_COLORS = ["#e8833a", "#5b8fd9"];

/** The node the card is drawn on. */
const SELECTED = "Marius";

/**
 * Build the graph: nodes colored by community, and a card on whichever node is selected, made only
 * of public label options: a template for the words, and the card's panel, shadow, screen size,
 * keep-in-view and close button.
 * @returns The element.
 */
function renderCardLook(): Element {
    const element = document.createElement("graphty-element");

    setLayoutPreSteps(element, 2000);

    void element.session.styles.add({
        name: "Community colors",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shape": "sphere", "node.size": 0.8 },
        encode: { "node.color": { by: "data.color", scale: "passthrough" } },
    });

    void element.session.styles.add({
        name: "Card on the selected node",
        target: "node",
        selector: { match: "member", of: "selection" },
        set: {
            "node.labelStyle": {
                enabled: true,
                color: "#14161f",
                textAlign: "left",
                background: "#ffffff",
                padding: 16,
                cornerRadius: 24,
                borderWidth: 2,
                borderColor: "#c5cad6",
                panelShadow: true,
                sizeMode: "screen",
                sizePx: 14,
                keepInView: true,
                closeButton: true,
                location: "right",
            },
        },
        encode: {
            "node.label": {
                template: [
                    "<bold>{data.id}</bold>",
                    "Connections: {data.connections}",
                    "Community {data.community|rank} of {data.community|count}",
                ],
            },
        },
    });

    element.nodeData = PEOPLE.map(([id, community]) => ({
        id,
        community,
        color: COMMUNITY_COLORS[community],
        connections: LINKS.filter(([a, b]) => a === id || b === id).length,
    }));
    element.edgeData = LINKS.map(([src, dst]) => ({ src, dst }));
    element.layout = "ngraph";
    element.layoutConfig = { seed: 42 };

    // Selected as soon as the graph settles, so the picture is of a card and not of a bare graph.
    element.addEventListener("graph-settled", () => {
        void element.session.selection.apply({ nodes: [SELECTED] });
    });

    return element;
}

/**
 * Wait until what the last input changed is on screen.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await element.session.styles.settled();
    await element.waitForStableFrame();
}

/**
 * Click a node: the browser's own pointer under the test runner, else pointer events on the canvas.
 * @param scene - What the story drew.
 * @param id - The node.
 * @param parameters - The story's parameters.
 */
async function clickOn(scene: Drawn, id: string, parameters: Record<string, unknown>): Promise<void> {
    const input = realInput(parameters);
    const at = scene.element.nodeScreenPosition(id);
    if (input === undefined || at === undefined) {
        await clickNode(scene, id);
    } else {
        await input.click(scene.element, { x: at.x, y: at.y });
    }

    await settled(scene.element);
}

/** The selected node carries a card; clicking its x clears the selection and the card goes. */
export const CardLook: Story = {
    name: "Card look",
    render: renderCardLook,
    play: async ({ canvasElement, parameters }) => {
        await waitForGraphSettled(canvasElement);
        const scene = await drawn(canvasElement, "Labels CardLook");
        await assertGraphLoaded(scene, { nodes: PEOPLE.length, edges: LINKS.length });

        await clickOn(scene, SELECTED, parameters);
        const card = scene.element.labelOf(SELECTED);
        await holds(
            card?.drawn === true && card.text.split("\n").length === 3 && card.closeRect !== undefined,
            `Labels CardLook: "${SELECTED}" is selected and its card is ${JSON.stringify(card)}`,
        );

        const unselected = PEOPLE.filter(([id]) => id !== SELECTED && scene.element.labelOf(id)?.drawn === true);
        await holds(unselected.length === 0, `Labels CardLook: unselected nodes have labels: ${unselected.join(", ")}`);

        // The x clears the selection, and the card with it. Only the browser's own pointer can hit
        // the label plane, so this half runs under the test runner.
        const input = realInput(parameters);
        const x = card?.closeRect;
        if (input !== undefined && x !== undefined) {
            await input.click(scene.element, { x: x.x + x.width / 2, y: x.y + x.height / 2 });
            await settled(scene.element);
            await holds(
                scene.session.selection.nodes.length === 0,
                `Labels CardLook: a click on the x left [${scene.session.selection.nodes.join(", ")}] selected`,
            );

            // Selected again, so the picture shows the card.
            await clickOn(scene, SELECTED, parameters);
        }
    },
};
