/**
 * The legend `<graphty-element legend>` draws over the graph from its own style layers: a list of
 * color chips for a categorical encoding, and a color ramp with its domain's ends for a continuous
 * one. Every word in it is the data's.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { Binding } from "../src/catalog/types";
import type { Graphty } from "../src/graphty-element";
import { drawn, eventually } from "./assertions";
import { eventWaitingDecorator, setLayoutPreSteps } from "./helpers";

/** Six nodes on a ring, each in one of three groups and with a score. */
const NODES = Array.from({ length: 6 }, (_, i) => ({
    id: `n${String(i)}`,
    group: ["red team", "blue team", "green team"][i % 3],
    score: i * 2,
    position: { x: 5 * Math.cos((i / 6) * Math.PI * 2), y: 5 * Math.sin((i / 6) * Math.PI * 2), z: 0 },
}));

/** A ring of edges. */
const EDGES = NODES.map((node, i) => ({ src: node.id, dst: NODES[(i + 1) % NODES.length].id }));

/**
 * Build the graph with the legend on and one color encoding.
 * @param encode - The node color binding.
 * @returns The element.
 */
function render(encode: Binding): Graphty {
    const element = document.createElement("graphty-element");
    element.legend = true;
    setLayoutPreSteps(element, 0);
    void element.session.styles.add({
        name: "Color",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.color": encode },
    });
    element.nodeData = NODES;
    element.edgeData = EDGES;
    element.layout = "fixed";
    element.layoutConfig = { dim: 2 };
    return element;
}

/**
 * Waits for the drawn graph and its legend, and returns the legend.
 * @param canvasElement - The story's root.
 * @param story - The story's name, for failure messages.
 * @returns The legend part.
 */
async function legendOf(canvasElement: HTMLElement, story: string): Promise<HTMLElement> {
    const { element } = await drawn(canvasElement, story);
    const part = (): HTMLElement | null | undefined => element.shadowRoot?.querySelector<HTMLElement>("[part=legend]");
    await eventually(() => part()?.hidden === false, `${story}: the legend never showed`);
    const legend = part();
    if (!legend) {
        throw new Error(`${story}: no legend part`);
    }
    return legend;
}

const meta: Meta = {
    title: "Legend",
    component: "graphty-element",
    decorators: [eventWaitingDecorator],
};
export default meta;

type Story = StoryObj;

/** A categorical encoding: one chip per group, named by the data's own values. */
export const Categorical: Story = {
    render: () => render({ by: "data.group", scale: "ordinal", palette: "okabe-ito" }),
    play: async ({ canvasElement }) => {
        const legend = await legendOf(canvasElement, "Legend Categorical");
        const rows = [...legend.querySelectorAll("li")].map((row) => row.textContent).sort();
        if (rows.join() !== "blue team,green team,red team") {
            throw new Error(`Legend Categorical: rows are ${rows.join()}`);
        }
    },
};

/** A continuous encoding: a ramp between the ends of the score's domain. */
export const Continuous: Story = {
    render: () => render({ by: "data.score", scale: "linear", palette: "viridis" }),
    play: async ({ canvasElement }) => {
        const legend = await legendOf(canvasElement, "Legend Continuous");
        const ends = [...legend.querySelectorAll(".ends span")].map((end) => end.textContent).join();
        if (legend.querySelector(".ramp") === null || ends !== "0,10") {
            throw new Error(`Legend Continuous: ramp ends are ${ends}`);
        }
    },
};
