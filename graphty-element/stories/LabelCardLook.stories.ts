/**
 * A label drawn as an info card: the clicked node's label is a rounded white panel with a title
 * and rows of facts, and every other node has none.
 *
 * Made only of public style options, through two style layers: one colors the nodes by
 * community, and one, scoped to `{ match: "member", of: "selection" }`, writes the selected
 * node's label and its look. Click another node and the card follows the selection.
 *
 * The card's words are one column per node (`card`), written with label markup -- `<bold>`,
 * `<size>`, `<color>` -- and a line break between rows. The column is built here from the
 * fixture because a label reads one field: there is no way yet to compose a label from several
 * fields or from algorithm results.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { assertGraphLoaded, drawn, holds } from "./assertions";
import { eventWaitingDecorator, setLayoutPreSteps, waitForGraphSettled } from "./helpers";

/** Two communities joined by one bridge. */
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
    ["Child 1", 1],
    ["Child 2", 1],
];

/** Who knows whom. */
const LINKS: readonly (readonly [string, string])[] = [
    ["Valjean", "Javert"],
    ["Valjean", "Fantine"],
    ["Valjean", "Cosette"],
    ["Valjean", "Thenardier"],
    ["Fantine", "Cosette"],
    ["Thenardier", "Cosette"],
    ["Javert", "Thenardier"],
    ["Valjean", "Marius"],
    ["Marius", "Cosette"],
    ["Marius", "Enjolras"],
    ["Marius", "Courfeyrac"],
    ["Enjolras", "Courfeyrac"],
    ["Enjolras", "Gavroche"],
    ["Courfeyrac", "Gavroche"],
    ["Gavroche", "Child 1"],
    ["Gavroche", "Child 2"],
    ["Child 1", "Child 2"],
];

/** The landing page's community colors, and its two text colors. */
const COMMUNITY_COLORS = ["#e8833a", "#5b8fd9"];
const TITLE_INK = "#14161f";
const BODY_INK = "#4f566b";

/** The node the story selects, so the picture always has a card on it. */
const SELECTED = "Child 2";

/**
 * The card's words for one person, in label markup: a title, then one fact per line.
 * @param id - The person.
 * @returns The markup.
 */
function cardOf(id: string): string {
    const linked = LINKS.flatMap(([a, b]) => [a === id ? b : "", b === id ? a : ""]).filter(Boolean);
    const community = PEOPLE.find(([name]) => name === id)?.[1] ?? 0;
    const shown = linked.slice(0, 3).join(", ");
    const more = linked.length > 3 ? ` and ${String(linked.length - 3)} more` : "";

    return [
        `<bold><size='120'><color='${TITLE_INK}'>${id}</color></size></bold>`,
        `<bold><color='${TITLE_INK}'>${String(linked.length)}</color></bold> connection${linked.length === 1 ? "" : "s"}`,
        `<color='${COMMUNITY_COLORS[community]}'>●</color> Community ${String(community + 1)} of ${String(COMMUNITY_COLORS.length)}`,
        `Linked to ${shown}${more}`,
    ].join("\n");
}

/**
 * Build the graph: nodes colored by community, and a card on whichever node is selected.
 * @returns The element.
 */
function render(): Element {
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
                font: "Inter, system-ui, sans-serif",
                sizePx: 92,
                color: BODY_INK,
                lineHeight: 1.5,
                textAlign: "left",
                background: "#ffffff",
                // Margins, not `padding`: padding grows the panel but does not move the words,
                // so left-aligned text sits against the left edge (a renderer defect).
                marginTop: 44,
                marginBottom: 44,
                marginLeft: 56,
                marginRight: 56,
                cornerRadius: 80,
                borderWidth: 6,
                borderColor: "#c5cad6",
                location: "right",
            },
        },
        encode: { "node.label": { by: "data.card", scale: "passthrough" } },
    });

    element.nodeData = PEOPLE.map(([id, community]) => ({ id, color: COMMUNITY_COLORS[community], card: cardOf(id) }));
    element.edgeData = LINKS.map(([src, dst]) => ({ src, dst }));
    element.layout = "ngraph";
    element.layoutConfig = { seed: 42 };

    // Selected by the story itself, so the picture is of a card and not of a bare graph.
    element.addEventListener("graph-settled", () => {
        element.selectNode(SELECTED);
    });

    return element;
}

const meta: Meta = {
    title: "Labels",
    component: "graphty-element",
    render,
    decorators: [eventWaitingDecorator],
    parameters: { chromatic: { delay: 800 } },
};
export default meta;

type Story = StoryObj;

/** The selected node carries the card; no other node has a label. */
export const CardLook: Story = {
    name: "Card look",
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);

        const scene = await drawn(canvasElement, "Labels CardLook");
        await assertGraphLoaded(scene, { nodes: PEOPLE.length, edges: LINKS.length });

        scene.graph.selectNode(SELECTED);
        await new Promise((resolve) => setTimeout(resolve, 400));

        const card = scene.graph.getNode(SELECTED)?.label?.labelMesh;
        await holds(card !== undefined && card !== null, `Labels CardLook: "${SELECTED}" is selected and has no card`);

        const others = PEOPLE.filter(([id]) => id !== SELECTED && scene.graph.getNode(id)?.label?.labelMesh);
        await holds(others.length === 0, `Labels CardLook: unselected nodes have labels: ${others.join(", ")}`);
    },
};
