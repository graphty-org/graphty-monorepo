/**
 * The palette guide's toy example, live: two brand palettes defined with `definePalette`, made the
 * element's defaults with `setDefaultPalettes`, and a layer that names no palette painting the
 * graph in the brand colours.
 *
 * The story runs the guide's own example files (docs/examples/simple-tier/palette/), so what it
 * draws is what a reader who copies the guide gets.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { useBrandPalettes } from "../../docs/examples/simple-tier/palette/use-brand-palettes";
import { type Graphty } from "../../src/graphty-element";
import { assertDrawnColour, assertGraphLoaded, drawn } from "../assertions";
import { eventWaitingDecorator, setLayoutPreSteps, waitForGraphSettled } from "../helpers";

/** Three teams of four, three and two people, joined in a chain. */
const TEAMS = { alpha: ["a1", "a2", "a3", "a4"], bravo: ["b1", "b2", "b3"], charlie: ["c1", "c2"] };

const NODES = Object.entries(TEAMS).flatMap(([team, ids]) => ids.map((id) => ({ id, team })));
const EDGES = NODES.slice(1).map((node, index) => ({ src: NODES[index].id, dst: node.id }));

/** The first three colours of the guide's acme-brand palette: one per team, largest team first. */
const BRAND = { alpha: "#0b1d51", bravo: "#1b7f79", charlie: "#f2a65a" };

/**
 * Build the element, laid out the same way every time.
 * @returns The element.
 */
function render(): Element {
    const element = document.createElement("graphty-element");
    setLayoutPreSteps(element, 2000);
    element.nodeData = NODES.map((node) => ({ ...node }));
    element.edgeData = EDGES.map((edge) => ({ ...edge }));
    element.layout = "ngraph";
    element.layoutConfig = { seed: 42 };

    return element;
}

const meta: Meta = {
    title: "Extending/Simple tier/Palette",
    component: "graphty-element",
    render,
    decorators: [eventWaitingDecorator],
};
export default meta;

type Story = StoryObj;

/** The brand palettes as the element's defaults: a layer naming no palette paints each team a brand colour. */
export const BrandPalettes: Story = {
    play: async ({ canvasElement }) => {
        await import("../../docs/examples/simple-tier/palette/brand-palettes");
        await waitForGraphSettled(canvasElement);
        const element = canvasElement.querySelector("graphty-element") as Graphty;

        useBrandPalettes(element);
        await element.session.styles.add({
            name: "Teams",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.team", scale: "ordinal" } },
        });

        const scene = await drawn(canvasElement, "Extending/Simple tier/Palette BrandPalettes");
        await assertGraphLoaded(scene, { nodes: NODES.length, edges: EDGES.length });
        await assertDrawnColour(
            scene,
            Object.fromEntries(NODES.map((node) => [node.id, BRAND[node.team as keyof typeof BRAND]])),
        );
    },
};
