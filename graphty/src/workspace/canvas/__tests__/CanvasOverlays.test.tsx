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
import { createWorkspaceStore, type WorkspaceState } from "../../state/store";
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
        },
        runs: {
            get: (id: string) => (facts.runs?.[id] === undefined ? undefined : { id, label: facts.runs[id] }),
            painting: () => facts.painting,
        },
        data: { statistics: () => ({ nodeCount: facts.nodeCount ?? 77, edgeCount: facts.edgeCount ?? 254 }) },
    } as unknown as GraphSession;
    return {
        session,
        progress: (change) => {
            listeners.get("progress:changed")?.forEach((listener) => {
                listener(change);
            });
        },
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
    return { id: "file.open", label: "Add data...", group: "Data", disabled: () => disabled, run: vi.fn() };
}

/**
 * Renders the overlays over a session, in a project named "Les Miserables".
 * @param session - the session.
 * @param state - more of the chrome's state.
 * @param commands - commands to register in place of the stubs.
 */
function renderOver(session: GraphSession, state: Partial<WorkspaceState> = {}, commands: Command[] = []): void {
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
}

const LOAD = { task: "load", phase: "progress", completed: 197, total: null, fraction: null } as const;

/**
 * A legend block.
 * @param over - the fields to set.
 * @returns the block.
 */
function block(over: Partial<LegendBlock>): LegendBlock {
    return { channel: "node.color", layerId: "layer-1", kind: "categorical", swatches: [], departures: [], ...over };
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
        // Only the title is live, so the counts are not read out on every chunk.
        assert.equal(within(card).getByRole("status").textContent, "Reading Les Miserables");

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

    it("shows No nodes to draw over an empty graph, with no door until Open is built", () => {
        renderOver(standIn({ nodeCount: 0 }).session);
        assert.isNotNull(screen.getByRole("region", { name: "No nodes to draw" }));
        assert.isNull(screen.queryByRole("button"));
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

describe("the legend card", () => {
    const pagerank = block({
        layerId: "layer-pr",
        runId: "run-pr" as LegendBlock["runId"],
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
        const notice = runNotice(session, "run-1" as never);
        assert.equal(notice?.message, "Hidden by your layer My gray");
        notice?.action?.run();
        assert.equal(encode.mock.calls.length, 1);
    });

    it("hands a highlight back as a highlight", () => {
        const { session, encode, highlight } = standIn({ painting: suppressed("highlight"), layers: { mine: "Mine" } });
        runNotice(session, "run-1" as never)?.action?.run();
        assert.equal(highlight.mock.calls.length, 1);
        assert.equal(encode.mock.calls.length, 0);
    });

    it("still says what happened when the layer is gone", () => {
        const { session } = standIn({ painting: suppressed("encoding") });
        assert.equal(runNotice(session, "run-1" as never)?.message, "Hidden by your layer above it");
    });

    it("gives no notice for a run that painted or is not decided", () => {
        const added = { state: "decided", suggestions: [{ outcome: "added" }] } as unknown as RunPainting;
        assert.isNull(runNotice(standIn({ painting: added }).session, "run-1" as never));
        const pending = { state: "pending", suggestions: [] } as RunPainting;
        assert.isNull(runNotice(standIn({ painting: pending }).session, "run-1" as never));
    });
});
