// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { Workspace } from "../Workspace";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

/**
 * Two rings of six joined by one bridge edge, laid out on a flat circle, which places them the
 * same way every time: PageRank ranks the bridge's ends highest and Louvain finds the two rings.
 * Each node carries a name and a team, so the table has attributes to show.
 */
const NAMES = ["Ada", "Ben", "Cal", "Dee", "Eve", "Fay", "Gus", "Hal", "Ivy", "Jo", "Kai", "Lu"];
const NODES = NAMES.map((name, i) => ({ id: `n${String(i)}`, name, team: i < 6 ? "North" : "South" }));
const ring = (from: number): { source: string; target: string }[] =>
    Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(from + i)}`,
        target: `n${String(from + ((i + 1) % 6))}`,
    }));
const EDGES = [...ring(0), ...ring(6), { source: "n0", target: "n6" }, { source: "n1", target: "n3" }];

const OPEN = { project: { name: "Two rings", id: 1 }, dockOpen: true, dockHeight: 320 } as const;

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
    },
};

/** Sorted by PageRank (the element names the run "Influence"), highest first; the caption follows the sort. */
export const SortedByResult: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadAndRun(canvasElement);
        await press(canvasElement, "button", /^Influence/);
    },
};

/** The Edges tab (`#/table-dock/edges`). */
export const Edges: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadAndRun(canvasElement);
        await press(canvasElement, "tab", "Edges");
    },
};

/** The Louvain run's item tab ("Communities"): one row per group with its size (`#/table-dock/communities`). */
export const Communities: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadAndRun(canvasElement);
        await press(canvasElement, "tab", "Communities");
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
    },
};

/** The Columns chooser open (`#/table-dock/columns`). */
export const Columns: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadAndRun(canvasElement);
        await press(canvasElement, "button", /^Columns:/);
    },
};

/** The options menu open, with Export... (`#/table-dock/table-options`). */
export const TableOptions: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadAndRun(canvasElement);
        await press(canvasElement, "button", "Table options");
    },
};

/** The dock closed (`#/table-dock/closed`). */
export const Closed: Story = {
    args: { initialState: { ...OPEN, dockOpen: false } },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
    },
};
