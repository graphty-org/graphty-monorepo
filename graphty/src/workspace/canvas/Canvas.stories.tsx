// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import {
    type AdHocData,
    DataSource,
    type DataSourceChunk,
    type FormatDescriptor,
    registeredFormatDescriptors,
} from "@graphty/graphty-element/extend";
import type { Meta, StoryObj } from "@storybook/react";
import { within } from "storybook/test";

import { Workspace } from "../Workspace";
import KARATE from "./fixtures/karate.json";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

const OPEN = { project: { name: "Karate Club", id: 1 } } as const;

/**
 * A reader that hands over the karate club in one chunk and then waits forever, so a story can
 * hold a real load in progress: the element publishes the load's progress after the first chunk
 * and never its end.
 */
class HeldLoad extends DataSource {
    static override type = "story-held-load";
    static override descriptor: FormatDescriptor = {
        id: "story-held-load",
        plainName: "Held load",
        extensions: [".held"],
        mimeTypes: ["application/json"],
        canImport: true,
        canExport: false,
        options: [],
    };

    /**
     * @param _opts - What the load passed; nothing here reads it.
     */
    constructor(_opts: object) {
        super();
    }

    /**
     * The whole graph, then a wait that never ends.
     * @yields The karate club's nodes and edges.
     */
    override async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        // A plain record needs a cast to the element's branded record type (#914).
        yield { nodes: KARATE.nodes as unknown as AdHocData[], edges: KARATE.edges as unknown as AdHocData[] };
        await new Promise<never>(() => undefined);
    }

    protected override getConfig(): object {
        return {};
    }
}

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

/** `#/canvas-and-states/loading`: a load in progress, with the element's node and edge counts. */
export const Loading: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await elementOf(canvasElement);
        // Once per page: a story rerun finds the reader already registered.
        if (!registeredFormatDescriptors().some((descriptor) => descriptor.id === HeldLoad.type)) {
            DataSource.register(HeldLoad);
        }
        await element.session.layout.setDimension("2d");
        await element.session.layout.set("fixed");
        // Never settles: the reader holds the load open.
        void element.session.data.import({ type: HeldLoad.type, config: {}, name: "karate.held" });
        // No waitForStableFrame: the open load keeps the graph changing, so it would never return.
        await within(canvasElement).findByRole("region", { name: "Reading Karate Club" }, { timeout: 30_000 });
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
