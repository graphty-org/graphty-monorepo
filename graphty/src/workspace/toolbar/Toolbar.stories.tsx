// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { Workspace } from "../Workspace";

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
 * Loads the two rings into the story's element and waits for a stable frame.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function loadRings(canvasElement: HTMLElement): Promise<GraphtyElement> {
    const element = await elementOf(canvasElement);
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("circular", { options: { scale: 0.2 } });
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.waitForStableFrame();
    return element;
}

/**
 * Clicks a toolbar button by its accessible name.
 * @param canvasElement - the story's root.
 * @param name - the button's name.
 */
async function press(canvasElement: HTMLElement, name: string): Promise<void> {
    await userEvent.click(await within(canvasElement).findByRole("button", { name }));
}

/** The body, where popovers render. */
const body = (): ReturnType<typeof within> => within(document.body);

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Toolbar",
    component: Workspace,
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing drawn: Analyze, Layout, View and Legend grayed; Quick actions live (`#/toolbar/nothing-drawn`). */
export const NothingDrawn: Story = { args: { initialState: OPEN } };

/** A graph drawn, nothing open; the legend on (`#/toolbar/at-rest`). */
export const AtRest: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
    },
};

/** The legend switched off: Legend not pressed (`#/toolbar/legend-off`). */
export const LegendOff: Story = {
    args: { initialState: { ...OPEN, legendShown: false } },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
    },
};

/** The Analyze popover open on its list (`#/analyze-popover/open`). */
export const AnalyzeOpen: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
        await press(canvasElement, "Analyze");
    },
};

/** Filter analyses: "brokers" finds Betweenness (`#/analyze-popover/search`). */
export const AnalyzeFiltered: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
        await press(canvasElement, "Analyze");
        await userEvent.type(await body().findByRole("searchbox", { name: "Filter analyses" }), "brokers");
    },
};

/** PageRank picked: its short form, the cost line and Run (`#/analyze-popover/essentials`). */
export const AnalyzeEssentials: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
        await press(canvasElement, "Analyze");
        await userEvent.click(await body().findByRole("button", { name: /^PageRank/ }));
    },
};

/** PageRank has run: Analyze lists it under Recent and offers to update its row (`#/analyze-popover/revise`). */
export const AnalyzeRevise: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await element.session.runs.start("pagerank");
        await element.waitForStableFrame();
        await press(canvasElement, "Analyze");
        const recent = await body().findByRole("region", { name: "Recent" });
        await userEvent.click(within(recent).getByRole("button", { name: /^PageRank/ }));
    },
};

/** Louvain has run from Analyze: the canvas painted with its groups (`#/graph-place/louvain-open`). */
export const AfterLouvain: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await press(canvasElement, "Analyze");
        await userEvent.click(await body().findByRole("button", { name: /^Louvain/ }));
        await userEvent.click(await body().findByRole("button", { name: "Run" }));
        await Promise.all(element.session.runs.list());
        await element.waitForStableFrame();
    },
};

/** The Layout popover: Method with its notes, and Seed where the method takes one (`#/toolbar/layout-open`). */
export const LayoutOpen: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
        await press(canvasElement, "Layout");
    },
};

/** The View flyout in 2D: Fit, Frame selection, zoom, Switch (`#/view-flyout/2d`). */
export const ViewFlyout2D: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
        await press(canvasElement, "View");
    },
};

/** The View flyout in 3D: Fit, Frame selection, the standard views, Switch (`#/view-flyout/3d`). */
export const ViewFlyout3D: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await element.session.layout.setDimension("3d");
        await element.waitForStableFrame();
        await press(canvasElement, "View");
    },
};

/** Quick actions: every built command by its home (`#/commands-and-search/quick-actions`). */
export const QuickActions: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
        await press(canvasElement, "Quick actions");
    },
};

/** One node selected: the selection bar with Neighborhood above the toolbar (`#/selection-bar/one-node`). */
export const SelectionBar: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await element.session.selection.apply({ nodes: ["n0"] });
        await element.waitForStableFrame();
    },
};
