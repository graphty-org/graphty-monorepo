// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { Workspace } from "../Workspace";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

/**
 * Two named rings of six joined by one bridge edge, laid out on a flat circle, which places them
 * the same way every time: PageRank ranks the bridge's ends highest and Louvain finds the rings.
 */
const NAMES = ["Ada", "Bea", "Cy", "Dot", "Eve", "Flo", "Gus", "Hal", "Ivy", "Jo", "Kit", "Lou"];
const NODES = NAMES.map((name, i) => ({ id: `n${String(i)}`, name, ring: i < 6 ? "east" : "west" }));
const ring = (from: number): { source: string; target: string }[] =>
    Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(from + i)}`,
        target: `n${String(from + ((i + 1) % 6))}`,
    }));
const EDGES = [...ring(0), ...ring(6), { source: "n0", target: "n6" }];

const OPEN = { project: { name: "Two rings", id: 1 } } as const;

/**
 * Loads the two rings into the story's element and waits for a stable frame.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function loadRings(canvasElement: HTMLElement): Promise<GraphtyElement> {
    await customElements.whenDefined("graphty-element");
    const element = canvasElement.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("circular", { options: { scale: 0.2 } });
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.waitForStableFrame();
    return element;
}

/**
 * Runs one algorithm and waits for the picture to catch up.
 * @param element - the element.
 * @param algorithm - the algorithm key.
 */
async function run(element: GraphtyElement, algorithm: string): Promise<void> {
    await element.session.runs.start(algorithm);
    await element.waitForStableFrame();
}

/**
 * Types into the find box.
 * @param canvasElement - the story's root.
 * @param text - what to type.
 */
async function find(canvasElement: HTMLElement, text: string): Promise<void> {
    await userEvent.type(await within(canvasElement).findByRole("combobox", { name: "Find" }), text);
}

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Graph place",
    component: Workspace,
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** No data yet: Selection and Everything, and "Add data to start" (`#/graph-place/empty`). */
export const Empty: Story = { args: { initialState: OPEN } };

/** A graph just loaded, nothing run: the footer points at Analyze (`#/graph-place/karate`). */
export const AtRest: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
    },
};

/** PageRank finished: its row on top, under Selection, with its ramp and count (`#/graph-place/finished`). */
export const Finished: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await run(await loadRings(canvasElement), "pagerank");
    },
};

/** PageRank's paint hidden by its eye: the row dimmed, the eye closed. */
export const Hidden: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await run(element, "pagerank");
        const label = element.session.runs.list()[0]?.label ?? "";
        const eye = await within(canvasElement).findByRole("button", { name: `Hide ${label}` });
        await userEvent.click(eye);
        await userEvent.unhover(eye);
        await element.waitForStableFrame();
    },
};

/** Louvain over PageRank: a run row with its groups open, each with its color and size (`#/graph-place/louvain-open`). */
export const LouvainOpen: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await run(element, "pagerank");
        await run(element, "louvain");
    },
};

/** The find list while typing: Elements and Values, nothing selected yet (`#/graph-place/find`). */
export const Find: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
        await find(canvasElement, "Ev");
    },
};

/** Nothing matches (`#/graph-place/find-no-match`). */
export const FindNoMatch: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
        await find(canvasElement, "xyz");
    },
};
