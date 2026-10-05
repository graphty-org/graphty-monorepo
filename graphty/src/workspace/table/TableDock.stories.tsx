// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";

import { Workspace } from "../Workspace";
import { EDGES, NODES } from "./twoRings.fixture";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

const OPEN = { project: { name: "Two rings", id: 1 }, dockOpen: true, dockHeight: 320 } as const;

/**
 * Loads the two rings into the story's element, laid out flat at the fixture's fixed positions so
 * no layout runs, and waits for a stable frame.
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
    await element.session.layout.set("fixed");
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.waitForStableFrame();
    return element;
}

/**
 * Loads the rings and runs PageRank and Louvain.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function loadAndRun(canvasElement: HTMLElement): Promise<GraphtyElement> {
    const element = await loadRings(canvasElement);
    await element.session.runs.start("pagerank");
    await element.session.runs.start("louvain");
    await element.waitForStableFrame();
    return element;
}

/**
 * Clicks a control by its role and accessible name.
 * @param canvasElement - the story's root.
 * @param role - the control's role.
 * @param name - its name.
 */
async function press(canvasElement: HTMLElement, role: string, name: string | RegExp): Promise<void> {
    await userEvent.click(await within(canvasElement).findByRole(role, { name }));
}

/**
 * The dock's region.
 * @param canvasElement - the story's root.
 * @returns queries inside the dock.
 */
const dock = async (canvasElement: HTMLElement): Promise<ReturnType<typeof within>> =>
    within(await within(canvasElement).findByRole("region", { name: "Table" }));

/** The body, where menus render. */
const body = (): ReturnType<typeof within> => within(document.body);

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Table dock",
    component: Workspace,
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** The Nodes tab: the key, the attributes, each run's result (`#/table-dock/nodes`). */
export const Nodes: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadAndRun(canvasElement);
        const table = await dock(canvasElement);
        await expect(await table.findByText("12 nodes")).toBeVisible();
        await expect(table.getByText("In the order loaded")).toBeVisible();
        await expect(await table.findByRole("button", { name: /^Influence/ })).toBeVisible();
    },
};

/** Sorted by PageRank (the element names the run "Influence"), highest first; the caption follows the sort. */
export const SortedByResult: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadAndRun(canvasElement);
        await press(canvasElement, "button", /^Influence/);
        const table = await dock(canvasElement);
        await expect(await table.findByText("Sorted by Influence, highest first")).toBeVisible();
    },
};

/** The Edges tab (`#/table-dock/edges`). */
export const Edges: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadAndRun(canvasElement);
        await press(canvasElement, "tab", "Edges");
        const table = await dock(canvasElement);
        await expect(await table.findByText(`${String(EDGES.length)} edges`)).toBeVisible();
        await expect(table.getByRole("grid", { name: "Edges" })).toBeVisible();
    },
};

/** The Louvain run's item tab ("Communities"): one row per group with its size (`#/table-dock/communities`). */
export const Communities: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadAndRun(canvasElement);
        await press(canvasElement, "tab", "Communities");
        const table = await dock(canvasElement);
        await expect(await table.findByText("2 groups")).toBeVisible();
        await expect(table.getByText("Largest group first")).toBeVisible();
    },
};

/** "Show members in table" from a group row: Nodes narrowed, with its chip (`#/table-dock/members-of-row`). */
export const MembersOfRow: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadAndRun(canvasElement);
        await press(canvasElement, "tab", "Communities");
        await press(canvasElement, "button", "Group 1 options");
        await userEvent.click(await body().findByRole("menuitem", { name: "Show members in table" }));
        const table = await dock(canvasElement);
        await expect(await table.findByText("Communities: Group 1")).toBeVisible();
        await expect(await table.findByText("6 nodes")).toBeVisible();
    },
};

/** The Columns chooser open (`#/table-dock/columns`). */
export const Columns: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadAndRun(canvasElement);
        await press(canvasElement, "button", /^Columns:/);
        const table = await dock(canvasElement);
        await expect(table.getByRole("button", { name: /^Columns: (\d+) of \1$/ })).toBeVisible();
        await expect(await body().findByRole("menuitemcheckbox", { name: "Influence" })).toBeVisible();
    },
};

/** The options menu open, with Export... (`#/table-dock/table-options`). */
export const TableOptions: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadAndRun(canvasElement);
        await press(canvasElement, "button", "Table options");
        await expect(await body().findByRole("menuitem", { name: "Export..." })).toBeVisible();
    },
};

/** The dock closed (`#/table-dock/closed`). */
export const Closed: Story = {
    args: { initialState: { ...OPEN, dockOpen: false } },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
        await expect(within(canvasElement).queryByRole("region", { name: "Table" })).toBeNull();
    },
};
