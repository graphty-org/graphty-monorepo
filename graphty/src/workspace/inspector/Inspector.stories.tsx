// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { createWorkspaceStore, type WorkspaceState, type WorkspaceStore } from "../state/store";
import { Workspace } from "../Workspace";
import { groupKey } from "./inspected";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

/**
 * Two rings of six joined by one bridge, each node labeled and each edge weighted, laid out on a
 * flat circle, which places them the same way every time: PageRank ranks the bridge's ends
 * highest and Louvain finds the two rings.
 */
const NODES = Array.from({ length: 12 }, (_, i) => ({
    id: `n${String(i)}`,
    label: `Node ${String(i)}`,
    team: i < 6 ? "north" : "south",
}));
const ring = (from: number): { source: string; target: string; weight: number }[] =>
    Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(from + i)}`,
        target: `n${String(from + ((i + 1) % 6))}`,
        weight: i + 1,
    }));
const EDGES = [...ring(0), ...ring(6), { source: "n0", target: "n6", weight: 9 }];

const OPEN: Partial<WorkspaceState> = { project: { name: "Two rings", id: 1 } };

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
 * Loads the two rings, named by their labels, and waits for a stable frame.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function loadRings(canvasElement: HTMLElement): Promise<GraphtyElement> {
    const element = await elementOf(canvasElement);
    const { session } = element;
    await session.layout.setDimension("2d");
    await session.layout.set("circular", { options: { scale: 0.2 } });
    await session.config.set({ data: { knownFields: { nodeLabelPath: "label" } } });
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    await element.waitForStableFrame();
    return element;
}

/**
 * Runs an algorithm to the end and waits for its picture.
 * @param element - the element.
 * @param algorithm - its key.
 * @returns the run's id.
 */
async function runToEnd(element: GraphtyElement, algorithm: string): Promise<string> {
    const run = element.session.runs.start(algorithm);
    await run;
    await element.session.styles.settled();
    await element.waitForStableFrame();
    return run.id;
}

/**
 * A story whose store the play function can write, as another package's row would.
 * @param initial - the chrome state to start from.
 * @returns the story's args and its store.
 */
function withStore(initial: Partial<WorkspaceState> = OPEN): { args: { store: WorkspaceStore }; store: WorkspaceStore } {
    const store = createWorkspaceStore(initial);
    return { args: { store }, store };
}

/**
 * The inspector region.
 * @param canvasElement - the story's root.
 * @returns queries scoped to it.
 */
const inspector = (canvasElement: HTMLElement): ReturnType<typeof within> =>
    within(within(canvasElement).getByRole("complementary", { name: "Inspector" }));

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Inspector",
    component: Workspace,
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** A new project, nothing loaded: the Overview says so (`#/inspector-nothing-selected/empty-graph`). */
export const EmptyGraph: Story = { args: { initialState: OPEN } };

/** Nothing selected: the graph's Overview (`#/inspector-nothing-selected/overview`). */
export const Overview: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
    },
};

/** Nothing selected, the Style tab: Canvas, then the Layout group (`#/inspector-nothing-selected/canvas`). */
export const Canvas: Story = {
    args: { initialState: { ...OPEN, tabs: { graph: "style" } } },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
    },
};

/** One node after PageRank and Louvain: Values, with results by rank and its group (`#/inspector-node/data`). */
export const NodeValues: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await runToEnd(element, "pagerank");
        await runToEnd(element, "louvain");
        await element.session.selection.apply({ nodes: ["n0"] });
        await element.waitForStableFrame();
    },
};

/** One node's Style tab: Why this look (`#/inspector-node/why-this-look`). */
export const WhyThisLook: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await runToEnd(element, "louvain");
        await element.session.selection.apply({ nodes: ["n3"] });
        await userEvent.click(await inspector(canvasElement).findByRole("tab", { name: "Style" }));
        await element.waitForStableFrame();
    },
};

/** Degree picked: the node's connections by name, strongest first (`#/inspector-several-elements/neighborhood`). */
export const Neighborhood: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await element.session.selection.apply({ nodes: ["n0"] });
        await userEvent.click(await inspector(canvasElement).findByRole("button", { name: /Degree/ }));
        await inspector(canvasElement).findByRole("region", { name: "n0's 3 connections" });
        await element.waitForStableFrame();
    },
};

/** Several nodes that are not a neighborhood: what they add up to. */
export const SeveralElements: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await element.session.selection.apply({ nodes: ["n1", "n4", "n9"] });
        await inspector(canvasElement).findByRole("group", { name: "Edges among them" });
        await element.waitForStableFrame();
    },
};

const measure = withStore();
/** PageRank's row: Values with the caption, Top 10 and Made with (`#/inspector-measure-row/data`). */
export const MeasureRow: Story = {
    args: measure.args,
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        const id = await runToEnd(element, "pagerank");
        measure.store.set({ inspected: { kind: "measure-row", id } });
        await inspector(canvasElement).findByRole("group", { name: "Top 10" });
    },
};

const groups = withStore();
/** Louvain's row: Summary, Sizes and Made with (`#/inspector-run-row/data`). */
export const RunRow: Story = {
    args: groups.args,
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        const id = await runToEnd(element, "louvain");
        groups.store.set({ inspected: { kind: "run-row", id } });
        await inspector(canvasElement).findByRole("group", { name: "Sizes" });
    },
};

const retuned = withStore();
/** A setting changed in Made with: the state bar's Rerun and Revert (`#/inspector-run-row/settings-changed`). */
export const SettingsChanged: Story = {
    args: retuned.args,
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        const id = await runToEnd(element, "pagerank");
        retuned.store.set({ inspected: { kind: "measure-row", id } });
        const field = await inspector(canvasElement).findByRole("spinbutton", { name: "Damping Factor" });
        await userEvent.clear(field);
        await userEvent.type(field, "0.5{Enter}");
        await inspector(canvasElement).findByRole("status");
    },
};

const community = withStore();
/** One of Louvain's groups: its size and first members (`#/inspector-group-set-path-row/community-3`). */
export const GroupRow: Story = {
    args: community.args,
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        const id = await runToEnd(element, "louvain");
        const first = element.session.runs.get(id)?.result?.summary().groups?.[0];
        if (first !== undefined) {
            community.store.set({ inspected: { kind: "group-row", id: groupKey(id, first.group) } });
        }
        await inspector(canvasElement).findByRole("group", { name: "Members" });
    },
};

/** The Everything row, on Values: what it covers (`#/inspector-selection-and-everything/everything`). */
export const EverythingRow: Story = {
    args: { initialState: { ...OPEN, inspected: { kind: "everything-row" }, tabs: { "everything-row": "values" } } },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
    },
};

/** An attribute from Data > Attributes: its table, roles and completeness (`#/inspector-attribute-and-filter-step/lesmis-field`). */
export const Attribute: Story = {
    args: { initialState: { ...OPEN, inspected: { kind: "attribute", id: "data.team" } } },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
        await inspector(canvasElement).findByRole("group", { name: "Table" });
    },
};
