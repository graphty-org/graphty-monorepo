/**
 * The canvas's overlays against a stand-in session that publishes progress on cue and answers the
 * legend, run and layer reads the cards make, so each state can be held still.
 * `CanvasOverlays.real-element.test.tsx` covers the element.
 */
import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
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
            get: (id: string) =>
                facts.layers?.[id] === undefined
                    ? undefined
                    : { id, name: facts.layers[id], selector: { match: "everything" } },
            encode,
            highlight,
            settled: () => Promise.resolve(),
        },
        catalog: { algorithms: () => [{ key: "pagerank", technicalName: "PageRank" }] },
        runs: {
            // No catalog entry, so the app names the run by its algorithm: the fact's name.
            get: (id: string) =>
                facts.runs?.[id] === undefined
                    ? undefined
                    : {
                          id,
                          algorithm: facts.runs[id],
                          params: {},
                          distinguishedBy: null,
                          siblingsDifferBy: null,
                          scope: { spec: "visible" },
                      },
            painting: () => facts.painting,
        },
        data: { statistics: () => ({ nodeCount: facts.nodeCount ?? 77, edgeCount: facts.edgeCount ?? 254 }) },
        selection: { nodes: [], edges: [] },
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
    element: GraphtyElement | null = null,
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
    const value = makeWorkspaceValue(store, createRegistry(registrations), session, element);
    // A canvas of a fixed size, as the app's is, so only a test that resizes it resizes it.
    const canvas = document.createElement("div");
    canvas.style.cssText = "position: relative; width: 800px; height: 600px";
    render(
        <WorkspaceContext.Provider value={value}>
            <CanvasOverlays />
        </WorkspaceContext.Provider>,
        { container: document.body.appendChild(canvas) },
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
        const run = {
            id: "run-1",
            label: "pagerank #1",
            algorithm: "pagerank",
            status: "running",
            params: {},
            distinguishedBy: null,
            siblingsDifferBy: null,
            scope: { spec: "visible" },
        };
        act(() => {
            emit("run:changed", { run, phase: "start", cause: "command", generation: 1 });
        });
        assert.equal(store.get().announcement, "PageRank added, running");
        act(() => {
            emit("run:changed", {
                run: { ...run, status: "succeeded" },
                phase: "end",
                cause: "command",
                generation: 1,
            });
        });
        assert.equal(store.get().announcement, "PageRank finished");
        act(() => {
            emit("run:changed", { run: { ...run, status: "failed" }, phase: "end", cause: "command", generation: 2 });
        });
        assert.equal(store.get().announcement, "PageRank failed");
    });

    it("announces what a selection holds, and nothing when it empties", () => {
        const { session, emit } = standIn();
        const store = renderOver(session);
        const { selection } = session as unknown as { selection: { nodes: string[]; edges: string[] } };
        selection.edges = ["e1"];
        act(() => {
            emit("selection:changed", {});
        });
        assert.equal(store.get().announcement, "1 edge selected");
        selection.nodes = ["a", "b"];
        act(() => {
            emit("selection:changed", {});
        });
        assert.equal(store.get().announcement, "2 nodes, 1 edge selected");
        selection.nodes = [];
        selection.edges = [];
        act(() => {
            emit("selection:changed", {});
        });
        assert.equal(store.get().announcement, "2 nodes, 1 edge selected");
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

    it("draws a run's node and edge highlight in one color as one line: the chip and the run", () => {
        const black = [{ label: "#000000", value: "#000000", color: "#000000" }];
        const highlight = { runId: "run-path", kind: "highlight", swatches: black } as const;
        const blocks = [
            block({ ...highlight, layerId: "path-edges", channel: "edge.color" }),
            block({ ...highlight, layerId: "path-nodes", channel: "node.color" }),
        ];
        renderOver(standIn({ blocks, runs: { "run-path": "Shortest path" } }).session);
        const section = screen.getByRole("group", { name: "Shortest path" });
        // No title over a row that only repeats it: the run's name is the row.
        assert.lengthOf(within(section).getAllByText("Shortest path"), 1);
        assert.isNull(within(section).queryByText(/In the result|On the path/));
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

    it("reserves its own box as the element's view inset, and gives it back when it goes", async () => {
        const store = renderOver(standIn(facts).session);
        const card = screen.getByRole("region", { name: "Legend" });
        await vi.waitFor(() => {
            const { left, top } = store.get().viewInsets;
            const reserved = left ?? top ?? 0;
            assert.isAtLeast(reserved, (left === undefined ? card.offsetHeight : card.offsetWidth) + 12);
        });
        act(() => {
            store.set({ legendShown: false });
        });
        assert.deepEqual(store.get().viewInsets, {});
    });

    it("keeps its inset while a page hides the canvas, so the drawing is where it was when it comes back", async () => {
        const store = renderOver(standIn(facts).session);
        const card = screen.getByRole("region", { name: "Legend" });
        await vi.waitFor(() => {
            assert.notDeepEqual(store.get().viewInsets, {});
        });
        const reserved = store.get().viewInsets;
        const canvas = card.parentElement;
        if (canvas === null) {
            throw new Error("the card has no canvas");
        }
        const seen = new Promise<void>((resolve) => {
            const observer = new ResizeObserver(() => {
                observer.disconnect();
                resolve();
            });
            observer.observe(canvas);
        });
        canvas.style.display = "none";
        await seen;
        // The card's own observer fired on the same resize; its report has run by the next frame.
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        assert.deepEqual(store.get().viewInsets, reserved);
    });

    /**
     * An element stand-in whose nodes the card's box does or does not cover.
     * @param covered - The node ids under any rectangle asked about.
     * @param placed - Whether the reader placed the camera.
     * @returns The element and its zoomToFit spy.
     */
    function framing(
        covered: string[],
        placed = false,
    ): { element: GraphtyElement; zoomToFit: ReturnType<typeof vi.fn> } {
        const zoomToFit = vi.fn();
        const element = {
            autoFrame: true,
            cameraPlaced: placed,
            isFrameStable: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            nodesInRect: vi.fn(() => covered),
            zoomToFit,
        } as unknown as GraphtyElement;
        return { element, zoomToFit };
    }

    it("reserves the key's room with no key drawn, so a key that appears needs no move", async () => {
        const store = renderOver(standIn({}).session);
        assert.isNull(screen.queryByRole("region", { name: "Legend" }));
        await vi.waitFor(() => {
            assert.notDeepEqual(store.get().viewInsets, {});
        });
    });

    it("never moves the drawing for the key, even one over a node", async () => {
        const { element, zoomToFit } = framing(["n1"]);
        const store = renderOver(standIn(facts).session, {}, [], element);
        await vi.waitFor(() => {
            assert.notDeepEqual(store.get().viewInsets, {});
        });
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        assert.equal(zoomToFit.mock.calls.length, 0);
    });

    it("frames the drawing again when the canvas changes size, unless the reader placed the camera", async () => {
        for (const placed of [false, true]) {
            const { element, zoomToFit } = framing([], placed);
            const store = renderOver(standIn(facts).session, {}, [], element);
            await vi.waitFor(() => {
                assert.notDeepEqual(store.get().viewInsets, {});
            });
            const canvas = screen.getAllByRole("region", { name: "Legend" }).at(-1)?.parentElement;
            if (!canvas) {
                throw new Error("the card has no canvas");
            }
            canvas.style.height = "300px";
            await vi.waitFor(() => {
                assert.equal(zoomToFit.mock.calls.length, placed ? 0 : 1);
            });
            if (!placed) {
                assert.deepEqual(element.viewInsets, store.get().viewInsets, "the margins reach the element first");
            }
        }
    });

    it("says which layer paints a block of some nodes, and how many", () => {
        const picked = block({ layerId: "picked", scope: { count: 3, of: 24 } });
        renderOver(standIn({ blocks: [picked], layers: { picked: "Picked" } }).session);
        assert.isNotNull(screen.getByText("3 of 24 nodes"), "the title already names the layer");
    });

    it("marks a value a layer above paints over, and reads each chip's color", () => {
        const kinds = block({
            layerId: "kind",
            swatches: [
                { label: "agency", value: "agency", color: "#009e73", count: 4, paintedOverBy: "agencies" },
                { label: "donor", value: "donor", color: "#e69f00", count: 9 },
            ],
        });
        renderOver(standIn({ blocks: [kinds], layers: { kind: "Kind", agencies: "Agencies" } }).session);
        assert.isNotNull(screen.getByText("covered by Agencies"));
        assert.isNotNull(screen.getByText("9"));
        const chips = screen.getAllByRole("img").map((chip) => chip.getAttribute("aria-label") ?? "");
        assert.lengthOf(chips, 2);
        assert.isTrue(
            chips.every((name) => /^[a-z ]+$/.test(name)),
            chips.join(", "),
        );
        assert.notEqual(chips[0], chips[1]);
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
