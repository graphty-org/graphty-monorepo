// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import {
    createGraphSession,
    type GraphSession,
    GraphtyError,
    type RunExecutionContext,
    type RunOutcome,
} from "@graphty/graphty-element/session";
import { Box } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { createRegistry } from "../commands/registry";
import { REGISTRATIONS } from "../registrations";
import { createWorkspaceStore, type WorkspaceState, type WorkspaceStore } from "../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../state/WorkspaceContext";
import { Workspace } from "../Workspace";
import { groupKey } from "./inspected";
import { Inspector } from "./Inspector";
import { TWO_RINGS_EDGES, TWO_RINGS_NODES, TWO_RINGS_POSITIONS } from "./two-rings.fixture";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

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
 * Loads the two rings from the checked-in fixture, named by their labels and placed by the
 * element's `fixed` layout at the fixture's positions, so no layout runs; then waits for a stable
 * frame.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function loadRings(canvasElement: HTMLElement): Promise<GraphtyElement> {
    const element = await elementOf(canvasElement);
    const { session } = element;
    await session.layout.setDimension("2d");
    await session.layout.set("fixed");
    await session.config.set({ data: { knownFields: { nodeLabelPath: "label" } } });
    await session.data.addNodes(TWO_RINGS_NODES);
    await session.data.addEdges(TWO_RINGS_EDGES);
    await session.positions.set(TWO_RINGS_POSITIONS);
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
function withStore(initial: Partial<WorkspaceState> = OPEN): {
    args: { store: WorkspaceStore };
    store: WorkspaceStore;
} {
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
export const NothingSelectedEmptyGraph: Story = { args: { initialState: OPEN } };

/** Nothing selected: the graph's Overview (`#/inspector-nothing-selected/overview`). */
export const NothingSelectedOverview: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
    },
};

/** Nothing selected, the Style tab: Canvas, then the Layout group (`#/inspector-nothing-selected/canvas`). */
export const NothingSelectedCanvas: Story = {
    args: { initialState: { ...OPEN, tabs: { graph: "style" } } },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
    },
};

/** One node after PageRank and Louvain: Values, with results by rank and its group (`#/inspector-node/data`). */
export const NodeData: Story = {
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
export const NodeWhyThisLook: Story = {
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
export const SeveralElementsNeighborhood: Story = {
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
export const SeveralElementsSummary: Story = {
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
export const MeasureRowData: Story = {
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
export const RunRowData: Story = {
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
export const RunRowSettingsChanged: Story = {
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
export const GroupSetPathRowCommunity: Story = {
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
export const SelectionAndEverythingEverything: Story = {
    args: { initialState: { ...OPEN, inspected: { kind: "everything-row" }, tabs: { "everything-row": "values" } } },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
    },
};

/** An attribute from Data > Attributes: its table, roles and completeness (`#/inspector-attribute-and-filter-step/lesmis-field`). */
export const AttributeAndFilterStepField: Story = {
    args: { initialState: { ...OPEN, inspected: { kind: "attribute", id: "data.team" } } },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
        await inspector(canvasElement).findByRole("group", { name: "Table" });
    },
};

/** One edge, picked as the Edges table picks it: its two ends and the file's attributes. */
export const EdgeData: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        const bridge = element.session.data.edges().find((edge) => edge.source === "n0" && edge.target === "n6");
        if (bridge !== undefined) {
            await element.session.selection.apply({ edges: [bridge.id] });
        }
        await inspector(canvasElement).findByRole("button", { name: /^From/ });
        await element.waitForStableFrame();
    },
};

/** The Selection row: its one body, the Style tab's sections (`#/inspector-selection-and-everything/selection`). */
export const SelectionAndEverythingSelection: Story = {
    args: { initialState: { ...OPEN, inspected: { kind: "selection-row" } } },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
    },
};

/**
 * A headless session holding the two rings, whose runs never finish on their own: graphty-element
 * finishes a run on twelve nodes before a capture, so the running, queued and failed state bars
 * are drawn on a session whose executor the story controls.
 * @param execute - how the session runs an algorithm.
 * @returns the session.
 */
async function heldSession(execute: (context: RunExecutionContext) => Promise<RunOutcome>): Promise<GraphSession> {
    const session = createGraphSession({ runs: { execute } });
    await session.data.addNodes(TWO_RINGS_NODES);
    await session.data.addEdges(TWO_RINGS_EDGES);
    return session;
}

/** Runs until it is cancelled. */
const untilCancelled = (context: RunExecutionContext): Promise<RunOutcome> =>
    new Promise((_resolve, reject) => {
        context.signal.addEventListener("abort", () => {
            reject(new Error("canceled"));
        });
    });

/**
 * The inspector alone, at the panel's width, on a session the story built.
 * @param session - the session.
 * @param store - the chrome state.
 * @returns the panel.
 */
function InspectorOn({ session, store }: { session: GraphSession; store: WorkspaceStore }): React.JSX.Element {
    return (
        <WorkspaceContext.Provider value={makeWorkspaceValue(store, createRegistry(REGISTRATIONS), session, null)}>
            <Box w={280} h={600} style={{ display: "flex" }}>
                <Inspector />
            </Box>
        </WorkspaceContext.Provider>
    );
}

/** A run still going: the state bar says so and offers Cancel. */
export const RunRowRunning: Story = {
    loaders: [
        async () => {
            const session = await heldSession(untilCancelled);
            const run = session.runs.start("pagerank");
            run.then(undefined, () => undefined);
            return {
                session,
                store: createWorkspaceStore({ ...OPEN, inspected: { kind: "measure-row", id: run.id } }),
            };
        },
    ],
    render: (_args, { loaded }) => (
        <InspectorOn session={loaded.session as GraphSession} store={loaded.store as WorkspaceStore} />
    ),
};

/** A run waiting behind another: "Queued, 1st". */
export const RunRowQueued: Story = {
    loaders: [
        async () => {
            const session = await heldSession(untilCancelled);
            session.runs.start("pagerank").then(undefined, () => undefined);
            const run = session.runs.start("degree");
            run.then(undefined, () => undefined);
            return {
                session,
                store: createWorkspaceStore({ ...OPEN, inspected: { kind: "measure-row", id: run.id } }),
            };
        },
    ],
    render: (_args, { loaded }) => (
        <InspectorOn session={loaded.session as GraphSession} store={loaded.store as WorkspaceStore} />
    ),
};

/** A run that failed: the state bar says why, in the app's words. */
export const RunRowFailed: Story = {
    loaders: [
        async () => {
            const session = await heldSession(() =>
                Promise.reject(
                    new GraphtyError({ code: "E_NOT_CONVERGED", message: "did not converge", source: "run" }),
                ),
            );
            const run = session.runs.start("pagerank");
            await run.then(undefined, () => undefined);
            return {
                session,
                store: createWorkspaceStore({ ...OPEN, inspected: { kind: "measure-row", id: run.id } }),
            };
        },
    ],
    render: (_args, { loaded }) => (
        <InspectorOn session={loaded.session as GraphSession} store={loaded.store as WorkspaceStore} />
    ),
};
