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
import { assertDrawnColour, assertGraphLoaded, drawn, renderedElement } from "../assertions";
import { eventWaitingDecorator, setLayoutPreSteps, waitForGraphSettled } from "../helpers";

/** Three teams of four, three and two people, joined in a chain. */
const TEAMS = { alpha: ["a1", "a2", "a3", "a4"], bravo: ["b1", "b2", "b3"], charlie: ["c1", "c2"] };

const NODES = Object.entries(TEAMS).flatMap(([team, ids]) => ids.map((id) => ({ id, team })));
const EDGES = NODES.slice(1).map((node, index) => ({ src: NODES[index].id, dst: node.id }));

/** The first three colors of the guide's acme-brand palette: one per team, largest team first. */
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
    title: "Extending/Custom palette",
    // The component id from before the section was retitled, so every story id (and its
    // approved screenshot) stays the same.
    id: "extending-simple-tier-palette",
    component: "graphty-element",
    tags: ["autodocs"],
    parameters: {
        docs: {
            description: {
                component:
                    "Palettes of your own: `definePalette({ id, kind, colors })` from " +
                    "`@graphty/graphty-element/extend` registers a named set of colors, and " +
                    "`element.setDefaultPalettes(...)` makes them what a style layer uses when it names no palette. " +
                    "Here each team is painted in one of the brand colors. A layer can also name a palette directly " +
                    'with `palette: "acme-brand"`. The full palette descriptor is in ' +
                    "[Custom palettes](https://graphty.app/docs/graphty-element/guide/extending/custom-palettes).",
            },
            source: {
                language: "html",
                code: `<graphty-element id="graph" layout="ngraph" layout-config='{"seed": 42}'></graphty-element>

<script type="module">
    import { definePalette } from "@graphty/graphty-element/extend";

    definePalette({
        id: "acme-brand",
        kind: "categorical",
        colors: ["#0B1D51", "#1B7F79", "#F2A65A", "#E07A1F", "#7A3E9D"],
    });
    definePalette({ id: "acme-brand-ramp", kind: "sequential", colors: ["#E8F1FA", "#1B7F79", "#0B1D51"] });

    const graph = document.getElementById("graph");
    const teams = { alpha: ["a1", "a2", "a3", "a4"], bravo: ["b1", "b2", "b3"], charlie: ["c1", "c2"] };
    const nodes = Object.entries(teams).flatMap(([team, ids]) => ids.map((id) => ({ id, team })));
    graph.nodeData = nodes;
    graph.edgeData = nodes.slice(1).map((node, i) => ({ source: nodes[i].id, target: node.id }));

    graph.setDefaultPalettes({ categorical: "acme-brand", sequential: "acme-brand-ramp" });
    graph.session.styles.add({
        name: "Teams",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.color": { by: "data.team", scale: "ordinal" } },
    });
</script>`,
            },
        },
    },
    render,
    decorators: [eventWaitingDecorator],
};
export default meta;

type Story = StoryObj;

/** The brand palettes as the element's defaults: a layer naming no palette paints each team a brand color. */
export const BrandPalettes: Story = {
    name: "Brand palettes",
    play: async ({ canvasElement }) => {
        await import("../../docs/examples/simple-tier/palette/brand-palettes");
        await waitForGraphSettled(canvasElement);
        const element = await renderedElement(canvasElement, "BrandPalettes: no <graphty-element> rendered");

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
