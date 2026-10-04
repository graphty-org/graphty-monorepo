// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { within } from "storybook/test";

import { Workspace } from "../Workspace";
import { LoadingCard } from "./CanvasOverlays";
import KARATE from "./fixtures/karate.json";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

const OPEN = { project: { name: "Karate Club", id: 1 } } as const;

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
 * Loads the karate club at the positions in the checked-in fixture, with the element's fixed
 * layout, so no layout runs and every capture is the same.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function loadKarate(canvasElement: HTMLElement): Promise<GraphtyElement> {
    const element = await elementOf(canvasElement);
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("fixed");
    await element.session.data.addNodes(KARATE.nodes);
    await element.session.data.addEdges(KARATE.edges);
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

/** `#/canvas-and-states/empty`: a new project with nothing loaded, "No nodes to draw". */
export const Empty: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await elementOf(canvasElement);
        await within(canvasElement).findByRole("region", { name: "No nodes to draw" }, { timeout: 30_000 });
    },
};

/**
 * `#/canvas-and-states/loading`: a load in progress, with the node and edge counts read so far.
 *
 * Drawn from fixed values, not a live element: a load held open keeps an element operation
 * pending, so the element never reaches a stable frame to capture. CanvasOverlays.test.tsx checks
 * that the canvas shows this card while the element reports a load.
 */
export const Loading: Story = {
    render: () => (
        <div className="ws-canvas-overlays" style={{ position: "relative", height: "100vh" }}>
            <div className="ws-state-card-slot">
                <LoadingCard projectName={OPEN.project.name} nodeCount={34} edgeCount={78} fraction={0.4} />
            </div>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByRole("region", { name: "Reading Karate Club" });
    },
};

/** `#/canvas-and-states/karate`: a graph drawn, nothing run; no legend card, no state card. */
export const Karate: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadKarate(canvasElement);
        await element.waitForStableFrame();
    },
};

/** `#/graph-place/finished`: PageRank painted its color ramp, "Color: <run>". */
export const Finished: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadKarate(canvasElement);
        const run = element.session.runs.start("pagerank");
        await run;
        await settle(canvasElement, element, `Color: ${run.label}`);
    },
};

/** `#/inspector-measure-row/painted-size`: PageRank sized as well as colored, two sections. */
export const PaintedSize: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadKarate(canvasElement);
        const run = element.session.runs.start("pagerank", {}, { style: { size: true } });
        await run;
        await settle(canvasElement, element, `Size: ${run.label}`);
    },
};

/** `#/graph-place/louvain-open`: Louvain painted one color per group, one row each. */
export const LouvainOpen: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadKarate(canvasElement);
        const run = element.session.runs.start("louvain");
        await run;
        await settle(canvasElement, element, `Color: ${run.label}`);
    },
};

/** `#/toolbar/legend-off`: the legend switched off, the drawing alone. */
export const LegendOff: Story = {
    args: { initialState: { ...OPEN, legendShown: false } },
    play: async ({ canvasElement }) => {
        const element = await loadKarate(canvasElement);
        await element.session.runs.start("pagerank");
        await element.session.styles.settled();
        await element.waitForStableFrame();
    },
};

/**
 * Louvain held back by the reader's own layer that colors everything: the notice "Hidden by your
 * layer My gray" with Show anyway. The mock has no route for it: the notice was decided after the
 * mocks were drawn (tier1-design.md section 3, item 9).
 */
export const HiddenByYourLayer: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadKarate(canvasElement);
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
