// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Workspace } from "../Workspace";
import { EDGES, NODES } from "./twoRings.fixture";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

const OPEN = { project: { name: "Two rings", id: 1 } } as const;

/**
 * The story's element, laid out flat with the fixture's fixed positions.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function fixedElement(canvasElement: HTMLElement): Promise<GraphtyElement> {
    await customElements.whenDefined("graphty-element");
    const element = canvasElement.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("fixed");
    return element;
}

/**
 * Loads the two rings into the story's element and waits for a stable frame.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function loadRings(canvasElement: HTMLElement): Promise<GraphtyElement> {
    const element = await fixedElement(canvasElement);
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

/** No data yet: an empty style tree, and "Add data to start" (`#/graph-place/empty`). */
export const Empty: Story = { args: { initialState: OPEN } };

/**
 * A graph just loaded, nothing run: the footer points at Analyze (`#/graph-place/karate`, and
 * `#/graph-place/ppi`, which is the same state over another sample).
 */
export const AtRest: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
    },
};

/** PageRank finished: its layer on top of the style tree (`#/graph-place/finished`). */
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
        const [listed] = element.session.runs.list();
        const layer = listed === undefined ? undefined : element.session.runs.bindings(listed.id)[0];
        const eye = await within(canvasElement).findByRole("button", {
            name: `Hide ${layer === undefined ? "" : (element.session.styles.get(layer)?.name ?? "")}`,
        });
        await userEvent.click(eye);
        await userEvent.unhover(eye);
        await element.waitForStableFrame();
    },
};

/**
 * Louvain over PageRank: two layers, Louvain on top; its groups are the categories of its color,
 * not rows of the tree (`#/graph-place/louvain-open`).
 */
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

/** Nothing matches, with an example rule over the data (`#/graph-place/find-no-match`). */
export const FindNoMatch: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
        await find(canvasElement, "xyz");
        // The box asks the element whether the text reads as a rule once typing pauses, and only
        // its answer ("no") brings the example: until then the line is a bare "No match". Ended at
        // the answer, the story draws the same line however late it is shot.
        await waitFor(() => {
            expect(canvasElement.querySelector(".ws-find-example")).not.toBeNull();
        });
    },
};

/** A graph read from a file: the title line names the file (`#/graph-place/file-loaded`). */
export const FileLoaded: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await fixedElement(canvasElement);
        const json = JSON.stringify({ nodes: NODES, edges: EDGES });
        await element.session.data.import({ config: { file: new File([json], "two-rings.json") } });
        await element.waitForStableFrame();
    },
};
