/**
 * The canvas's overlays against a stand-in session that publishes progress on cue and answers the
 * legend, run and layer reads the cards make, so each state can be held still.
 * `CanvasOverlays.real-element.test.tsx` covers the element.
 */
import type { GraphSession, LegendBlock, ProgressChange, RunPainting } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, describe, it, vi } from "vitest";

import { act, render, screen, within } from "../../../test/test-utils";
import { type Command, createRegistry, defineRegistration } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceState, type WorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { CanvasOverlays } from "../CanvasOverlays";
import { runNotice } from "../runNotice";

/** What a stand-in session answers. */
interface StandInFacts {
    nodeCount?: number;
    edgeCount?: number;
    blocks?: readonly LegendBlock[];
    runs?: Record<string, string>;
    layers?: Record<string, string>;
    painting?: RunPainting;
}

/**
 * A session that answers the reads the canvas makes and lets the test publish progress.
 * @param facts - what it answers.
 * @returns the session, a function that publishes one progress change, and the style verbs' spies.
 */
function standIn(facts: StandInFacts = {}): {
    session: GraphSession;
    progress: (change: ProgressChange) => void;
    emit: (event: string, payload: unknown) => void;
    encode: ReturnType<typeof vi.fn>;
    highlight: ReturnType<typeof vi.fn>;
} {
    const listeners = new Map<string, Set<(payload: unknown) => void>>();
    const encode = vi.fn();
    const highlight = vi.fn();
    const session = {
        on: (event: string, listener: (payload: unknown) => void) => {
            const set = listeners.get(event) ?? new Set();
            set.add(listener);
            listeners.set(event, set);
            return () => set.delete(listener);
        },
        styles: {
            legend: () => facts.blocks ?? [],
            get: (id: string) => (facts.layers?.[id] === undefined ? undefined : { id, name: facts.layers[id] }),
            encode,
            highlight,
            settled: () => Promise.resolve(),
        },
        catalog: { algorithms: () => [{ key: "pagerank", technicalName: "PageRank" }] },
        runs: {
            get: (id: string) => (facts.runs?.[id] === undefined ? undefined : { id, label: facts.runs[id] }),
            painting: () => facts.painting,
        },
        data: { statistics: () => ({ nodeCount: facts.nodeCount ?? 77, edgeCount: facts.edgeCount ?? 254 }) },
    } as unknown as GraphSession;
    const emit = (event: string, payload: unknown): void => {
        listeners.get(event)?.forEach((listener) => {
            listener(payload);
        });
    };
    return {
        session,
        progress: (change) => {
            emit("progress:changed", change);
        },
        emit,
        encode,
        highlight,
    };
}

/**
 * An Add data command whose disabled reason the test sets.
 * @param disabled - the reason, or null for an enabled command.
 * @returns the command.
 */
function openCommand(disabled: string | null): Command {
    return { id: "data.add", label: "Add data...", group: "Data", disabled: () => disabled, run: vi.fn() };
}

/**
 * Renders the overlays over a session, in a project named "Les Miserables".
 * @param session - the session.
 * @param state - more of the chrome's state.
 * @param commands - commands to register in place of the stubs.
 * @returns the chrome's store.
 */
function renderOver(
    session: GraphSession,
    state: Partial<WorkspaceState> = {},
    commands: Command[] = [],
): WorkspaceStore {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, ...state });
    const registrations =
        commands.length === 0
            ? REGISTRATIONS
            : [
                  ...REGISTRATIONS.map((each) => ({
                      ...each,
                      commands: each.commands.filter((command) => !commands.some((own) => own.id === command.id)),
                  })),
                  defineRegistration({ owner: "test", commands }),
              ];
    const value = makeWorkspaceValue(store, createRegistry(registrations), session, null);
    render(
        <WorkspaceContext.Provider value={value}>
            <CanvasOverlays />
        </WorkspaceContext.Provider>,
    );
    return store;
}

const LOAD = { task: "load", phase: "progress", completed: 197, total: null, fraction: null } as const;

/**
 * A legend block.
 * @param over - the fields to set.
 * @returns the block.
 */
function block(over: Partial<LegendBlock>): LegendBlock {
    return {
        channel: "node.color",
        layerId: "layer-1",
        kind: "categorical",
        swatches: [],
        facts: [],
        departures: [],
        ...over,
    };
}

describe("the canvas's state cards", () => {
    it("shows the loading card with the element's counts while it reports a load, then the drawing", () => {
        const { session, progress } = standIn();
        renderOver(session);
        assert.isNull(screen.queryByRole("region", { name: /Reading/ }));

        act(() => {
            progress(LOAD);
        });
        const card = screen.getByRole("region", { name: "Reading Les Miserables" });
        assert.isNotNull(within(card).getByText("77 nodes, 254 edges..."));
        assert.isNotNull(within(card).getByRole("progressbar", { name: "Progress" }));
        // Nothing on the card is live: the toolbar's status line announces the finished load.
        assert.isNull(within(card).queryByRole("status"));

        act(() => {
            progress({ ...LOAD, phase: "end" });
        });
        assert.isNull(screen.queryByRole("region", { name: "Reading Les Miserables" }));
    });

    it("ignores a run's progress", () => {
        const { session, progress } = standIn();
        renderOver(session);
        act(() => {
            progress({ ...LOAD, task: "run" });
        });
        assert.isNull(screen.queryByRole("status"));
    });

    it("shows No nodes to draw over an empty graph, with Add data... and Open a sample", () => {
        renderOver(standIn({ nodeCount: 0 }).session);
        assert.isNotNull(screen.getByRole("region", { name: "No nodes to draw" }));
        assert.deepEqual(
            screen.getAllByRole("button").map((button) => button.textContent),
            ["Add data...", "Open a sample"],
        );
    });

    it("lists every sample under Open a sample, and a row runs that sample's command", async () => {
        const karate: Command = {
            id: "sample.open.karate",
            label: "Open sample: Zachary's karate club",
            group: "Project",
            run: vi.fn(),
        };
        renderOver(standIn({ nodeCount: 0 }).session, {}, [karate]);
        await userEvent.click(screen.getByRole("button", { name: "Open a sample" }));
        const rows = await screen.findAllByRole("menuitem");
        assert.deepEqual(
            rows.map((row) => row.textContent),
            [
                "Les Miserables77 characters",
                "Zachary's karate club34 members",
                "College football115 teams",
                "Florentine families15 families",
            ],
        );
        await userEvent.click(rows[1]);
        assert.equal(vi.mocked(karate.run).mock.calls.length, 1);
    });

    it("offers Add data on the empty card, and runs it", async () => {
        const command = openCommand(null);
        renderOver(standIn({ nodeCount: 0 }).session, {}, [command]);
        const button = screen.getByRole("button", { name: "Add data..." });
        assert.notEqual(button.getAttribute("aria-disabled"), "true");
        await userEvent.click(button);
        assert.equal(vi.mocked(command.run).mock.calls.length, 1);
    });

    it("keeps Add data reachable but disabled, with the reason in a tooltip", async () => {
        const command = openCommand("Close the dialog first");
        renderOver(standIn({ nodeCount: 0 }).session, {}, [command]);
        const button = screen.getByRole("button", { name: "Add data..." });
        assert.equal(button.getAttribute("aria-disabled"), "true");
        await userEvent.click(button);
        assert.equal(vi.mocked(command.run).mock.calls.length, 0);
        await userEvent.hover(button);
        assert.isNotNull(await screen.findByText("Close the dialog first"));
    });
});

describe("the status line", () => {
    it("announces a finished load with the element's counts", () => {
        const { session, progress } = standIn();
        const store = renderOver(session);
        act(() => {
            progress(LOAD);
        });
        assert.equal(store.get().announcement, "");
        act(() => {
            progress({ ...LOAD, phase: "end" });
        });
        assert.equal(store.get().announcement, "Les Miserables: 77 nodes, 254 edges");
    });

    it("announces a run that ended, by the app's name for its method, once", () => {
        const { session, emit } = standIn();
        const store = renderOver(session, { announcement: "PageRank added, running" });
        const run = { id: "run-1", label: "pagerank #1", algorithm: "pagerank", status: "running" };
        act(() => {
            emit("run:changed", { run, phase: "start", cause: "command", generation: 1 });
        });
        assert.equal(store.get().announcement, "PageRank added, running");
        act(() => {
            emit("run:changed", { run: { ...run, status: "succeeded" }, phase: "end", cause: "command", generation: 1 });
        });
        assert.equal(store.get().announcement, "PageRank finished");
        act(() => {
            emit("run:changed", { run: { ...run, status: "failed" }, phase: "end", cause: "command", generation: 2 });
        });
        assert.equal(store.get().announcement, "PageRank failed");
    });
});

describe("the legend card", () => {
    const pagerank = block({
        layerId: "layer-pr",
        runId: "run-pr",
        kind: "sequential",
        swatches: [
            { label: "0.01", value: 0.01, color: "#f0f0f0" },
            { label: "0.1", value: 0.1, color: "#202020" },
        ],
    });
    const groups = block({
        layerId: "layer-groups",
        swatches: [
            { label: "Group 1", value: 1, color: "#ff0000", count: 12 },
            { label: "Other: 3 groups", value: [7, 8, 9], color: "#888888", count: 5, role: "other" },
        ],
        overflow: { hidden: 28 },
    });
    const facts: StandInFacts = {
        blocks: [pagerank, groups],
        runs: { "run-pr": "PageRank" },
        layers: { "layer-groups": "My groups" },
    };

    it("puts the row that wins first, titled by the run or the layer", () => {
        renderOver(standIn(facts).session);
        const legend = screen.getByRole("region", { name: "Legend" });
        const titles = within(legend)
            .getAllByRole("group")
            .map((group) => group.getAttribute("aria-label"));
        assert.deepEqual(titles, ["Color: My groups", "Color: PageRank"]);
    });

    it("draws the Other row and the overflow line in the app's words", () => {
        renderOver(standIn(facts).session);
        const section = screen.getByRole("group", { name: "Color: My groups" });
        assert.isNotNull(within(section).getByText("Other"));
        assert.isNull(within(section).queryByText("Other: 3 groups"));
        assert.isNotNull(within(section).getByText("28 more"));
    });

    it("names the shape a category paints", () => {
        const shapes = block({
            channel: "node.shape",
            swatches: [{ label: "Group 1", value: 1, paints: "box" }],
        });
        renderOver(standIn({ blocks: [shapes], layers: { "layer-1": "Shapes" } }).session);
        const section = screen.getByRole("group", { name: "Shape: Shapes" });
        assert.isNotNull(within(section).getByText("Box"));
    });

    it("prints none of the element's English departures", () => {
        const confessing = block({ departures: ["Values above p98 are drawn at the top color."] });
        renderOver(standIn({ blocks: [confessing], layers: { "layer-1": "Mine" } }).session);
        assert.isNull(screen.queryByText(/p98/));
    });

    it("is hidden when the reader switched the legend off", () => {
        renderOver(standIn(facts).session, { legendShown: false });
        assert.isNull(screen.queryByRole("region", { name: "Legend" }));
    });
});

describe("the notice a held-back run gives", () => {
    const suppressed = (as: "encoding" | "highlight"): RunPainting =>
        ({
            state: "decided",
            suggestions: [{ outcome: "suppressed", suggestion: { as, spec: { name: "x" } }, byLayerId: "mine" }],
        }) as unknown as RunPainting;

    it("names the layer and hands an encoding back to the element", () => {
        const { session, encode } = standIn({ painting: suppressed("encoding"), layers: { mine: "My gray" } });
        const notice = runNotice(session, "run-1");
        assert.equal(notice?.message, "Hidden by your layer My gray");
        notice?.action?.run();
        assert.equal(encode.mock.calls.length, 1);
    });

    it("hands a highlight back as a highlight", () => {
        const { session, encode, highlight } = standIn({ painting: suppressed("highlight"), layers: { mine: "Mine" } });
        runNotice(session, "run-1")?.action?.run();
        assert.equal(highlight.mock.calls.length, 1);
        assert.equal(encode.mock.calls.length, 0);
    });

    it("still says what happened when the layer is gone", () => {
        const { session } = standIn({ painting: suppressed("encoding") });
        assert.equal(runNotice(session, "run-1")?.message, "Hidden by your layer above it");
    });

    it("gives no notice for a run that painted or is not decided", () => {
        const added = { state: "decided", suggestions: [{ outcome: "added" }] } as unknown as RunPainting;
        assert.isNull(runNotice(standIn({ painting: added }).session, "run-1"));
        const pending = { state: "pending", suggestions: [] } as RunPainting;
        assert.isNull(runNotice(standIn({ painting: pending }).session, "run-1"));
    });
});
