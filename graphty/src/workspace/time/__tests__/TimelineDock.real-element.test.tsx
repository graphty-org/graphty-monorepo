/**
 * The timeline dock's reach on the REAL graphty-element, by real input: zooming the histogram by
 * wheel and two fingers, jumping to the selection, reading in the reader's zone, the words a
 * screen reader gets, a tap on a bar, the keys, and a reload. Every assertion reads the element or
 * what the reader sees.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { openBy } from "../../../test/open";
import { inBrowserZone, pinchOver, tap, wheelOver } from "../../../test/real-pointer";
import { pickSample } from "../../../test/samples-dialog";
import { siteFeatures } from "../../../test/siteFeatures";
import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

type ElementUnderTest = import("@graphty/graphty-element").Graphty;

/** Enough simulation steps for the samples' force layout to settle before it is drawn. */
const PRE_STEPS = 1000;
/** The office email sample: 48 people, 2,102 emails, each edge with its `sent` time in 2025. */
const OFFICE_EMAIL = `${import.meta.env.BASE_URL}samples/office-email.json`;
/** The zone the browser is put in: never UTC, and five hours from it in January. */
const NEW_YORK = "America/New_York";
/** autosave's database (graphty-element's AUTOSAVE_DATABASE). */
const AUTOSAVE_DATABASE = "graphty-autosave";

/**
 * Waits for the workspace's element.
 * @returns its session.
 */
async function sessionOf(): Promise<GraphSession> {
    return waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        if (found === undefined) {
            throw new Error("the element never came up");
        }
        return found;
    });
}

/**
 * Renders the workspace on the graph with a time field set, and opens the dock from its button.
 * @param data - CSV to load in place of the office email sample.
 * @returns the session, the chrome store and the dock.
 */
async function openDock(data?: string): Promise<{ session: GraphSession; store: WorkspaceStore; dock: HTMLElement }> {
    const store = createWorkspaceStore({ project: { name: "Dock", id: 1 }, place: "graph" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await sessionOf();
    await session.config.set({ layoutBehavior: { preSteps: PRE_STEPS } });
    await (data === undefined
        ? session.data.import({ config: { url: OFFICE_EMAIL }, name: "Sample" })
        : session.data.import({ type: "csv", config: { data } }));
    await session.time.setField({ edges: { start: "sent" } });
    await session.time.ready;
    await userEvent.click(await screen.findByRole("button", { name: "Timeline" }));
    return { session, store, dock: await screen.findByRole("region", { name: "Timeline" }) };
}

/**
 * The brush's body, which reads the axis it sits on.
 * @param dock - the dock.
 * @returns the axis's ends and the range the brush shows.
 */
function brushOf(dock: HTMLElement): { min: number; max: number; start: number } {
    const body = within(dock).getByRole("slider", { name: "Window" });
    return {
        min: Number(body.getAttribute("aria-valuemin")),
        max: Number(body.getAttribute("aria-valuemax")),
        start: Number(body.getAttribute("aria-valuenow")),
    };
}

/**
 * The bars' drawing, which the wheel and fingers land on.
 * @param dock - the dock.
 * @returns the plot.
 */
function plotOf(dock: HTMLElement): HTMLElement {
    return within(dock).getByTestId("histogram-plot");
}

/**
 * Waits for the axis to narrow.
 * @param dock - the dock.
 * @param whole - the axis before.
 * @param whole.min - its start.
 * @param whole.max - its end.
 */
async function axisNarrowed(dock: HTMLElement, whole: { min: number; max: number }): Promise<void> {
    await waitFor(() => {
        const now = brushOf(dock);
        assert.isBelow(now.max - now.min, whole.max - whole.min);
    });
}

/**
 * Sets a window and waits for the dock to show it.
 * @param session - the session.
 * @param from - its start.
 * @param to - its end.
 */
async function windowOn(session: GraphSession, from: number, to: number): Promise<void> {
    await act(async () => {
        await session.time.window({ from, to });
    });
}

describe("the timeline dock on the real element", () => {
    beforeAll(async () => {
        await siteFeatures(["timeline"]);
        await page.viewport(1366, 768);
    });

    it("zooms by wheel over the bars, the brush keeping its window, until the reset button", async () => {
        const { session, dock } = await openDock();
        const whole = brushOf(dock);
        const span = whole.max - whole.min;
        const from = whole.min + span * 0.4;
        const to = whole.min + span * 0.6;
        await windowOn(session, from, to);
        assert.isNull(within(dock).queryByRole("button", { name: "Show whole timeline" }));

        await wheelOver(plotOf(dock), -300);

        await axisNarrowed(dock, whole);
        assert.equal(Number(session.time.current?.from), from);
        assert.equal(Number(session.time.current?.to), to);
        assert.isAtMost(brushOf(dock).min, from);

        await userEvent.click(within(dock).getByRole("button", { name: "Show whole timeline" }));
        await waitFor(() => {
            assert.equal(brushOf(dock).max - brushOf(dock).min, span);
        });
        assert.isNull(within(dock).queryByRole("button", { name: "Show whole timeline" }));
    });

    it("stops zooming with bars of one step on the axis, however far the wheel turns", async () => {
        const { dock } = await openDock();
        const whole = brushOf(dock);
        await wheelOver(plotOf(dock), -600);
        await axisNarrowed(dock, whole);
        for (let turn = 0; turn < 30; turn++) {
            await wheelOver(plotOf(dock), -600);
        }
        await waitFor(() => {
            assert.isAtLeast(within(dock).getAllByTestId("histogram-bar").length, 2);
        });
        const { min, max } = brushOf(dock);
        assert.isAtLeast(max - min, 2 * 3_600_000);
    });

    it("zooms by two fingers on the dock, and not by two on the canvas", async () => {
        const { session, dock } = await openDock();
        const whole = brushOf(dock);
        const canvas = document.querySelector("graphty-element");
        if (canvas === null) {
            throw new Error("no canvas");
        }

        await pinchOver(canvas, 60);
        assert.equal(brushOf(dock).max - brushOf(dock).min, whole.max - whole.min);

        await pinchOver(plotOf(dock), 120);
        await axisNarrowed(dock, whole);
        assert.isNull(session.time.current);
    });

    it("jumps to the selection's span from its button, the window set to it", async () => {
        const { session, dock } = await openDock();
        assert.isNull(within(dock).queryByRole("button", { name: "Jump to selection" }));
        await act(async () => {
            await session.selection.apply({ nodes: ["p01"] });
        });
        const span = session.time.spanOf({ nodes: ["p01"], incident: true });

        await userEvent.click(await within(dock).findByRole("button", { name: "Jump to selection" }));

        await waitFor(() => {
            assert.equal(Number(session.time.current?.from), span?.from);
            assert.equal(Number(session.time.current?.to), span?.to);
        });
    });

    it("jumps from Quick actions too, and does nothing there with no selection", async () => {
        const { session } = await openDock();
        const jump = async (): Promise<void> => {
            await userEvent.keyboard("{Control>}k{/Control}");
            await userEvent.type(await screen.findByPlaceholderText("Search commands"), "Jump time to the selection");
            await userEvent.click(await screen.findByRole("option", { name: /Jump time to the selection/ }));
        };
        const before = session.history.position;
        await jump();
        assert.isNull(session.time.current);
        assert.equal(session.history.position, before);

        await act(async () => {
            await session.selection.apply({ nodes: ["p01"] });
        });
        await jump();
        const span = session.time.spanOf({ nodes: ["p01"], incident: true });
        await waitFor(() => {
            assert.equal(Number(session.time.current?.from), span?.from);
        });
    });

    it("has no jump for a selection with no time, and leaves the window", async () => {
        const { session, dock } = await openDock(
            "source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,2026-01-03\nD,E,\n",
        );
        const whole = brushOf(dock);
        await windowOn(session, whole.min, whole.max - 1);
        const before = session.time.current;
        await act(async () => {
            await session.selection.apply({ nodes: ["E"] });
        });
        await waitFor(() => {
            assert.deepEqual(session.selection.nodes, ["E"]);
        });
        assert.isNull(within(dock).queryByRole("button", { name: "Jump to selection" }));
        assert.deepEqual(session.time.current, before);
    });

    it("reads in the reader's zone: day bars, typed dates and the zone's name", async () => {
        await inBrowserZone(NEW_YORK, async () => {
            const { session, store, dock } = await openDock();
            act(() => {
                store.set({ place: "data" });
            });
            await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
            await userEvent.click(await screen.findByRole("option", { name: "Time window" }));
            const zone = await screen.findByRole("radiogroup", { name: "Zone" });
            assert.equal(session.time.settings.timeZone, "UTC");

            await userEvent.click(within(zone).getByText("Local"));

            await waitFor(() => {
                assert.equal(session.time.settings.timeZone, NEW_YORK);
            });
            // A day bar starts at midnight in New York, and the brush starts on a bar.
            await session.time.window(null);
            await waitFor(() => {
                const hour = new Intl.DateTimeFormat("en-US", {
                    timeZone: NEW_YORK,
                    hour: "numeric",
                    hourCycle: "h23",
                }).format(brushOf(dock).min);
                assert.equal(Number(hour), 0);
            });

            await userEvent.click(within(dock).getByTestId("time-readout"));
            const from = await screen.findByRole("textbox", { name: "From" });
            const to = screen.getByRole("textbox", { name: "To" });
            await userEvent.clear(from);
            await userEvent.type(from, "Mar 10, 2025");
            await userEvent.clear(to);
            await userEvent.type(to, "Mar 12, 2025{Enter}");
            await waitFor(() => {
                assert.equal(within(dock).getByTestId("time-readout").textContent, "Mar 10, 2025 - Mar 12, 2025");
            });

            await act(async () => {
                await session.time.setSettings({ step: "hour" });
            });
            await waitFor(() => {
                assert.match(within(dock).getByTestId("time-readout").textContent, / E[DS]T$/);
            });
        });
    });

    it("keeps UTC on an hour's readout under the default zone", async () => {
        const { session, dock } = await openDock();
        await act(async () => {
            await session.time.setSettings({ step: "hour" });
            await session.time.stepBy(1);
        });
        await waitFor(() => {
            assert.match(within(dock).getByTestId("time-readout").textContent, / UTC$/);
        });
    });

    it("names the total and the busiest bar in the histogram's accessible name", async () => {
        const { dock } = await openDock();
        await within(dock).findByRole("img", { name: /^Edges over time, 2,102 edges, busiest .+: [\d,]+ edges?$/ });
    });

    it("says what entered and left on the status line after a step", async () => {
        const { session, store, dock } = await openDock();
        await act(async () => {
            await session.time.setSettings({ step: "week" });
        });
        await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));
        await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));
        await waitFor(() => {
            const { entered, left } = session.time.changes();
            const counted = (ids: typeof entered): number => ids.nodes.length + ids.edges.length;
            assert.isAbove(counted(entered) + counted(left), 0);
            assert.include(
                store.get().announcement ?? "",
                `${String(counted(entered))} entered, ${String(counted(left))} left`,
            );
        });
    });

    it("jumps the window to a tapped bar outside the brush, as one step", async () => {
        const { session, dock } = await openDock();
        const whole = brushOf(dock);
        const span = whole.max - whole.min;
        await windowOn(session, whole.min, whole.min + span * 0.1);
        // Window moves in quick succession merge: a step of another kind keeps the tap's its own.
        await act(async () => {
            await session.time.setSettings({ results: "keep" });
        });
        const before = session.history.position;

        await tap(plotOf(dock));

        await waitFor(() => {
            assert.isAbove(Number(session.time.current?.from), whole.min + span * 0.3);
        });
        assert.equal(session.history.position, before + 1);
    });

    it("steps by comma and period until single keys are switched off", async () => {
        const { session, store } = await openDock();
        await act(async () => {
            await session.time.setSettings({ step: "week" });
        });
        await userEvent.keyboard(".");
        await waitFor(() => {
            assert.isNotNull(session.time.current);
        });
        const at = session.time.current?.from;
        await userEvent.keyboard(".");
        await waitFor(() => {
            assert.notEqual(session.time.current?.from, at);
        });

        act(() => {
            store.set({ singleKeyShortcuts: false });
        });
        const held = session.time.current?.from;
        const moves = session.history.position;
        await userEvent.keyboard(".,");
        // F2 goes through the same key handler after them, so they have been read.
        await userEvent.keyboard("{F2}");
        await screen.findByRole("textbox", { name: "Project name" });
        assert.equal(session.time.current?.from, held);
        assert.equal(session.history.position, moves);
    });

    it("plays and pauses by Space in the dock, and not in its text fields", async () => {
        const { session, dock } = await openDock();
        const body = within(dock).getByRole("slider", { name: "Window" });
        body.focus();
        await userEvent.keyboard(" ");
        await waitFor(() => {
            assert.isTrue(session.time.playing);
        });
        await userEvent.keyboard(" ");
        await waitFor(() => {
            assert.isFalse(session.time.playing);
        });

        await userEvent.click(within(dock).getByTestId("time-readout"));
        const from = await screen.findByRole("textbox", { name: "From" });
        await userEvent.clear(from);
        await userEvent.type(from, "1 2");
        assert.equal((from as HTMLInputElement).value, "1 2");
        assert.isFalse(session.time.playing);
    });
});

describe("the timeline across a reload", () => {
    /**
     * Forgets everything kept, so each test starts with nothing to restore.
     * @returns settles once the database is gone.
     */
    function forgetAutosave(): Promise<void> {
        sessionStorage.clear();
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(AUTOSAVE_DATABASE);
            request.onsuccess = () => {
                resolve();
            };
            request.onerror = () => {
                reject(request.error ?? new Error("the autosave database was not deleted"));
            };
        });
    }

    beforeAll(async () => {
        await siteFeatures(["timeline"]);
    });
    beforeEach(forgetAutosave);
    afterEach(forgetAutosave);

    it("restores the window and the settings, paused", async () => {
        const store = createWorkspaceStore({ autosave: true });
        const view = render(<Workspace store={store} />);
        await openBy(store, () => pickSample("Campus contacts"));
        const opened = document.querySelector<ElementUnderTest>("graphty-element:not([data-start-page])");
        if (opened === null) {
            throw new Error("no opened element");
        }
        const { session, autosaver } = opened;
        const column = session.time.candidates().find((each) => each.kind === "edge")?.column ?? "";
        await session.time.setField({ edges: { start: column } });
        await session.time.ready;
        await session.time.setSettings({ results: "keep", outside: "ghost" });
        await session.time.stepBy(3);
        const window = session.time.current;
        session.time.play({ interval: 60_000, motion: "steps" });
        assert.isTrue(session.time.playing);
        await waitFor(() => {
            assert.strictEqual(autosaver.status.state, "saved");
        });
        view.unmount();

        const again = createWorkspaceStore({ autosave: true });
        render(<Workspace store={again} />);
        const back = await waitFor(() => {
            const found = document.querySelector<ElementUnderTest>("graphty-element:not([data-start-page])")?.session;
            assert.isDefined(found);
            assert.equal(found?.time.field?.edges?.start, column);
            return found;
        });
        await back.time.ready;
        await waitFor(() => {
            assert.equal(back.time.current?.from, window?.from);
        });
        assert.equal(back.time.current?.to, window?.to);
        assert.equal(back.time.settings.results, "keep");
        assert.equal(back.time.settings.outside, "ghost");
        assert.isFalse(back.time.playing);
    });
});
