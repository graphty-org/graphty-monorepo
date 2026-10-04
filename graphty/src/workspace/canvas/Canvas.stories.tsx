// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { within } from "storybook/test";

import { Workspace } from "../Workspace";
import { StateCard } from "./StateCard";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

/**
 * Two rings of six joined by one bridge edge, laid out on a flat circle, which places them the
 * same way every time: PageRank ranks the bridge's ends highest and Louvain finds the two rings.
 */
const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}` }));
const ring = (from: number): { source: string; target: string }[] =>
    Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(from + i)}`,
        target: `n${String(from + ((i + 1) % 6))}`,
    }));
const EDGES = [...ring(0), ...ring(6), { source: "n0", target: "n6" }, { source: "n1", target: "n3" }];

const OPEN = { project: { name: "Two rings", id: 1 } } as const;

/**
 * The story's element, once it has upgraded.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function elementOf(canvasElement: HTMLElement): Promise<GraphtyElement> {
    await customElements.whenDefined("graphty-element");
    const element = canvasElement.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    return element;
}

/**
 * Loads the two rings into the story's element.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function loadRings(canvasElement: HTMLElement): Promise<GraphtyElement> {
    const element = await elementOf(canvasElement);
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("circular", { options: { scale: 0.2 } });
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    return element;
}

/**
 * Waits until the element has painted and the legend card shows a section.
 * @param canvasElement - the story's root.
 * @param element - the element.
 * @param section - the section title to wait for.
 */
async function settle(canvasElement: HTMLElement, element: GraphtyElement, section: string): Promise<void> {
    await element.session.styles.settled();
    await element.waitForStableFrame();
    await within(canvasElement).findByRole("group", { name: section }, { timeout: 30_000 });
}

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Canvas",
    component: Workspace,
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** A new project with nothing loaded: "No nodes to draw" (`#/canvas-and-states/empty`). */
export const Empty: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await elementOf(canvasElement);
        await within(canvasElement).findByRole("status", { name: "No nodes to draw" }, { timeout: 30_000 });
    },
};

/** A graph drawn, nothing run: no legend card, no state card (`#/graph-place/karate`). */
export const AtRest: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await element.waitForStableFrame();
    },
};

/** PageRank painted its color ramp: "Color: PageRank" with its reading sentence (`#/graph-place/finished`). */
export const PageRankColor: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        const run = element.session.runs.start("pagerank");
        await run;
        await settle(canvasElement, element, `Color: ${run.label}`);
    },
};

/** PageRank sized as well as colored: two sections, the size range in the element's units (`#/inspector-measure-row/painted-size`). */
export const PageRankColorAndSize: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        const run = element.session.runs.start("pagerank", {}, { style: { size: true } });
        await run;
        await settle(canvasElement, element, `Size: ${run.label}`);
    },
};

/** Louvain painted one color per group, one row each (`#/graph-place/louvain-open`). */
export const LouvainGroups: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        const run = element.session.runs.start("louvain");
        await run;
        await settle(canvasElement, element, `Color: ${run.label}`);
    },
};

/** The legend switched off: the drawing alone. */
export const LegendHidden: Story = {
    args: { initialState: { ...OPEN, legendShown: false } },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await element.session.runs.start("pagerank");
        await element.session.styles.settled();
        await element.waitForStableFrame();
    },
};

/**
 * Louvain held back by the reader's own layer that colors everything: the notice "Hidden by your
 * layer My gray" with Show anyway.
 */
export const RunHiddenByLayer: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await element.session.styles.add({
            name: "My gray",
            selector: { match: "everything" },
            set: { "node.color": "#888888" },
        });
        await element.session.runs.start("louvain");
        await element.waitForStableFrame();
        await within(canvasElement).findByText("Hidden by your layer My gray", {}, { timeout: 30_000 });
    },
};

/**
 * The loading card as the element's progress event fills it: the project name and how many records
 * were read, with an indeterminate bar (`#/canvas-and-states/loading`). Drawn alone, because a real
 * load of a small file is over before a capture.
 */
export const Loading: StoryObj<typeof StateCard> = {
    render: () => (
        <div style={{ padding: 24 }}>
            <StateCard title="Reading Les Miserables" sentence="197 records read" progress={null} />
        </div>
    ),
};
