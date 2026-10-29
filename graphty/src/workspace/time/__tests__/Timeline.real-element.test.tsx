/**
 * The timeline on the REAL graphty-element, driven by real input: the Data place's Fields designate
 * the time field, the Filters section's time card sets how windows move, the dock's brush is
 * dragged with the mouse, Play and Pause run the element's smooth playback, the step buttons and keys move the window, and the header chip,
 * the Filters list, the Overview and Undo speak about it. Every assertion reads the element or
 * what the reader sees.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, TimeStepEvent } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it, vi } from "vitest";
import { page } from "vitest/browser";

import { dragAcross } from "../../../test/real-pointer";
import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Enough simulation steps for the samples' force layout to settle before it is drawn. */
const PRE_STEPS = 1000;

/** The office email sample: 48 people, 2,102 emails, each edge with its `sent` time in 2025. */
const OFFICE_EMAIL = `${import.meta.env.BASE_URL}samples/office-email.json`;
/** The paper citations sample: 159 papers, each with its `year`. */
const PAPERS = `${import.meta.env.BASE_URL}samples/paper-citations.json`;

/**
 * Renders the workspace on a place and loads a sample.
 * @param url - the sample.
 * @param place - where the workspace opens.
 * @returns the session and the chrome store.
 */
async function open(
    url: string = OFFICE_EMAIL,
    place: "data" | "graph" = "data",
): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Timeline", id: 1 }, place });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    // The force layout settled before the first frame: these tests are about time, not the
    // layout, and a layout left to settle on screen draws a frame per step -- about 80 frames of
    // 2,102 edges on a software GPU, each one holding up the next click or keystroke.
    await session.config.set({ layoutBehavior: { preSteps: PRE_STEPS } });
    await session.data.import({ config: { url }, name: "Sample" });
    return { session, store };
}

/**
 * The Data place.
 * @returns queries inside it.
 */
function dataPlace(): ReturnType<typeof within> {
    return within(screen.getByRole("region", { name: "Data place" }));
}

/**
 * Picks a column as the Data place's Fields entry Edge time (or Node time), as the reader does:
 * in the entry's list, or, with no entry yet, from the side's "+" and then the list it opens.
 * @param column - the option's name.
 * @param row - the Fields entry.
 */
async function pickField(column: string, row: "Edge time" | "Node time" = "Edge time"): Promise<void> {
    const plus = await dataPlace().findByRole("button", {
        name: `Add to ${row === "Edge time" ? "edge" : "node"} fields`,
    });
    const entry = dataPlace().queryByRole("combobox", { name: row });
    if (entry === null) {
        await userEvent.click(plus);
        await userEvent.click(await screen.findByRole("menuitem", { name: "Time" }));
    } else {
        await userEvent.click(entry);
    }
    await userEvent.click(await screen.findByRole("option", { name: column }));
}

/**
 * Opens the time window's card from the Filters section's Time row.
 * @returns queries inside the card.
 */
async function timeCard(): Promise<ReturnType<typeof within>> {
    if (screen.queryByTestId("time-card") === null) {
        await userEvent.click(await dataPlace().findByRole("treeitem", { name: /^Time/ }));
    }
    return within(await screen.findByTestId("time-card"));
}

/**
 * Picks `sent` as the time field.
 * @param session - the element's session.
 * @returns the dock.
 */
async function designateSent(session: GraphSession): Promise<HTMLElement> {
    await pickField("sent");
    await waitFor(() => {
        assert.deepEqual(session.time.field, { edges: { start: "sent" } });
    });
    return screen.findByRole("region", { name: "Timeline" });
}

/**
 * Picks an option of a time card menu.
 * @param menu - the menu's name.
 * @param option - the option.
 */
async function pickIn(menu: string, option: string | RegExp): Promise<void> {
    await userEvent.click(await (await timeCard()).findByRole("combobox", { name: menu }));
    await userEvent.click(await screen.findByRole("option", { name: option }));
}

/**
 * The dock's readout text.
 * @param dock - the dock.
 * @returns the text.
 */
function readout(dock: HTMLElement): string {
    return within(dock).getByTestId("time-readout").textContent ?? "";
}

describe("the timeline on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("designates the time field from the Data place's Fields, and the dock shows the data's span", async () => {
        const { session } = await open();
        assert.isNull(screen.queryByRole("region", { name: "Timeline" }));
        assert.isNull(dataPlace().queryByRole("region", { name: "Time" }), "no Time section beside Fields");
        await pickField("sent");

        const dock = await screen.findByRole("region", { name: "Timeline" });
        const extent = session.time.extent();
        assert.equal(extent?.edges.timed, 2102);
        await waitFor(() => {
            assert.equal(readout(dock), "Jan 1, 2025 - Jun 30, 2025");
        });
        assert.isNull(session.time.current, "no window until the reader makes one");
        within(dock).getByRole("button", { name: "Play" });
        within(dock).getByRole("slider", { name: "Window end" });
        // With no window, no bar is marked either way.
        const bars = within(dock).getAllByTestId("histogram-bar");
        assert.isFalse(bars.some((bar) => bar.dataset.highlighted === "true" || bar.dataset.dimmed === "true"));
    });

    it("dragging the brush's end sets the element's window, as one undoable step", async () => {
        const { session } = await open();
        const dock = await designateSent(session);
        const extent = session.time.extent();
        const before = session.history.position;

        const end = within(dock).getByRole("slider", { name: "Window end" });
        const track = end.parentElement ?? end;
        await dragAcross(end, -track.getBoundingClientRect().width / 2);

        await waitFor(() => {
            const window = session.time.current;
            assert.isNotNull(window);
            assert.isBelow(Number(window?.to), Number(extent?.to));
        });
        assert.equal(session.history.position, before + 1);
        // The thumbs read as dates, not numbers.
        assert.match(end.getAttribute("aria-valuetext") ?? "", /2025/);
        await screen.findByRole("button", { name: /^Time: / });
    });

    it("plays and pauses at the dock's speed, and one Undo returns to where it started", async () => {
        const { session, store } = await open();
        const dock = await designateSent(session);
        await pickIn("Step", "Week");
        await waitFor(() => {
            assert.equal(session.time.settings.step, "week");
        });
        // A step with no window only stores the step: every edge still shows.
        assert.isNull(session.time.current);
        assert.equal(session.visibility.summary.visibleEdges, 2102);
        // Speed cycles 1x, 2x, 4x in the dock; the time card has no Speed row.
        assert.isNull((await timeCard()).queryByText("Speed"));
        await userEvent.click(within(dock).getByRole("button", { name: "Speed 1x" }));
        await userEvent.click(within(dock).getByRole("button", { name: "Speed 2x" }));
        assert.equal(store.get().timeSpeed, 4);
        const { position } = session.history;

        await userEvent.click(within(dock).getByRole("button", { name: "Play" }));
        await waitFor(() => {
            assert.isTrue(session.time.playing);
            assert.isAbove(Number(session.time.current?.from), Date.UTC(2024, 11, 30));
        });
        await userEvent.click(within(dock).getByRole("button", { name: "Pause" }));
        assert.isFalse(session.time.playing);
        await waitFor(() => {
            assert.equal(session.history.position, position + 1, "a play is one step");
        });
        await act(async () => {
            await session.undo();
        });
        assert.isNull(session.time.current);
    });

    it("steps by button and key, opening the first window, and stops at the end of the data", async () => {
        const { session } = await open();
        const dock = await designateSent(session);
        await pickIn("Step", "Day");
        const DAY = 86_400_000;
        const start = Date.UTC(2025, 0, 1);

        await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));
        await waitFor(() => {
            assert.equal(Number(session.time.current?.from), start, "the first window, not the second");
            assert.equal(readout(dock), "Jan 1, 2025");
        });
        assert.isTrue(within(dock).getByRole<HTMLButtonElement>("button", { name: "Step back" }).disabled);
        await userEvent.keyboard(".");
        await waitFor(() => {
            assert.equal(Number(session.time.current?.from), start + DAY);
        });
        await userEvent.keyboard(",");
        await waitFor(() => {
            assert.equal(Number(session.time.current?.from), start);
        });

        // Shift+period jumps to the last window, and Step forward is disabled there.
        await userEvent.keyboard(">");
        await waitFor(() => {
            assert.equal(readout(dock), "Jun 30, 2025");
        });
        assert.isTrue(within(dock).getByRole<HTMLButtonElement>("button", { name: "Step forward" }).disabled);
        // The disabled button can hold no keys: the reader's next key goes to the drawing.
        document.querySelector<HTMLElement>("graphty-element")?.focus();
        await userEvent.keyboard("<");
        await waitFor(() => {
            assert.equal(readout(dock), "Jan 1, 2025");
        });
    });

    it("keeps Results, Mode and Step through Show all time", async () => {
        const { session } = await open();
        const dock = await designateSent(session);
        await pickIn("Results", "Keep");
        await userEvent.click(
            within((await timeCard()).getByRole("radiogroup", { name: "Mode" })).getByText("Cumulative"),
        );
        await pickIn("Step", "Week");
        await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));
        await waitFor(() => {
            assert.isNotNull(session.time.current);
        });

        await userEvent.click(within(dock).getByRole("button", { name: "Show all time" }));
        await waitFor(() => {
            assert.isNull(session.time.current);
        });
        assert.deepInclude(session.time.settings, { results: "keep", mode: "cumulative", step: "week" });
        const card = await timeCard();
        assert.equal(card.getByRole("combobox", { name: "Results" }).getAttribute("value"), "Keep");
        assert.equal(card.getByRole("combobox", { name: "Step" }).getAttribute("value"), "Week");
    });

    it("refuses a column with no times, leaving the field as it was", async () => {
        const { session, store } = await open();
        await designateSent(session);
        await pickField("team", "Node time");
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "team has no times");
        });
        assert.deepEqual(session.time.field, { edges: { start: "sent" } });
    });

    it("reads a typed range from the readout's popover", async () => {
        const { session } = await open();
        const dock = await designateSent(session);
        await userEvent.click(within(dock).getByTestId("time-readout"));
        const from = await screen.findByRole("textbox", { name: "From" });
        await userEvent.clear(from);
        await userEvent.type(from, "Mar 9, 2025");
        const to = screen.getByRole("textbox", { name: "To" });
        await userEvent.clear(to);
        await userEvent.type(to, "Mar 19, 2025{Enter}");
        await waitFor(() => {
            assert.equal(readout(dock), "Mar 9, 2025 - Mar 19, 2025");
        });
    });

    it("names the window in the header chip, the Filters list and Undo; the chip focuses the brush and clears", async () => {
        const { session, store } = await open();
        await designateSent(session);
        await userEvent.click(screen.getByRole("button", { name: /^Undo/ }));
        await waitFor(() => {
            assert.equal(store.get().announcement, "Undid setting the time field.");
        });
        await userEvent.click(screen.getByRole("button", { name: /^Redo/ }));
        // The dock went with the field and came back with it.
        const dock = await screen.findByRole("region", { name: "Timeline" });
        await pickIn("Step", "Week");
        await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));

        // Filters lists the window as a row.
        await waitFor(() => {
            assert.isNotNull(session.time.current);
        });
        await dataPlace().findByRole("treeitem", { name: /^Time / });
        const chip = await screen.findByRole("button", { name: /^Time: / });
        await userEvent.click(chip);
        assert.equal(document.activeElement?.getAttribute("aria-label"), "Window start");
        await userEvent.click(screen.getByRole("button", { name: "Clear the time window" }));
        await waitFor(() => {
            assert.isNull(session.time.current);
        });
    });

    it("F6 from the drawing lands on the brush", async () => {
        const { session } = await open();
        const dock = await designateSent(session);
        const drawing = document.querySelector<HTMLElement>("graphty-element");
        drawing?.focus();
        await userEvent.keyboard("{F6}");
        assert.isTrue(dock.contains(document.activeElement), "focus is in the dock");
        assert.equal(document.activeElement?.getAttribute("role"), "slider");
    });

    it("keeps the header still while time plays", async () => {
        const { session } = await open();
        const dock = await designateSent(session);
        await pickIn("Step", "Day");
        await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));
        // The chips after the time chip start where it ends: that edge stays put.
        const chip = (await screen.findByRole("button", { name: /^Time: / })).closest(".tl-chip");
        const xs = new Set<number>();
        for (let step = 0; step < 4; step++) {
            const before = Number(session.time.current?.from);
            await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));
            await waitFor(() => {
                assert.isAbove(Number(session.time.current?.from), before);
            });
            xs.add(Math.round(chip?.getBoundingClientRect().right ?? 0));
        }
        assert.equal(xs.size, 1, "the header after the time chip did not move");
    });

    it("lines up the time card's controls on one right edge", async () => {
        const { session } = await open();
        await designateSent(session);
        const place = await timeCard();
        const rights = [
            place.getByRole("combobox", { name: "Time field" }),
            place.getByRole("combobox", { name: "Step" }),
            place.getByRole("radiogroup", { name: "Mode" }),
            place.getByRole("combobox", { name: "Results" }),
        ].map((control) => control.getBoundingClientRect().right);
        // One edge, to the subpixel a segmented track's border rounds to.
        assert.isBelow(Math.max(...rights) - Math.min(...rights), 1.5, `right edges ${rights.join(", ")}`);
    });

    it("marks a run out of date with its window, and Rerun under its id brings it current", async () => {
        const { session } = await open(OFFICE_EMAIL, "graph");
        await act(async () => {
            await session.time.setField({ edges: { start: "sent" } });
            await session.time.setSettings({ step: "week" });
        });
        const dock = await screen.findByRole("region", { name: "Timeline" });
        await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));
        await waitFor(() => {
            assert.isNotNull(session.time.current);
        });
        const run = session.runs.start("degree", undefined, { as: "degree" });
        await act(async () => {
            await run;
            await session.styles.settled();
        });

        await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));
        await waitFor(() => {
            assert.equal(run.stale?.reason, "window-moved");
        });
        // The layer row says it is out of date and names the window the run was computed in.
        const row = await screen.findByRole("treeitem", { name: /^Connections, / });
        await waitFor(() => {
            assert.include(row.textContent, "Out of date: ran on Dec 30, 2024 - Jan 5, 2025");
        });
        // ...and shows it: a mark beside its count, named with the same words.
        within(row).getByRole("img", { name: "Out of date: ran on Dec 30, 2024 - Jan 5, 2025" });
        await userEvent.click(row);
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        await inspector.findByText(/^Out of date: ran on /);
        const errors: unknown[] = [];
        const onError = (event: PromiseRejectionEvent): void => {
            errors.push(event.reason);
        };
        window.addEventListener("unhandledrejection", onError);
        await userEvent.click(inspector.getByRole("button", { name: "Rerun" }));
        await waitFor(() => {
            assert.isNull(session.runs.get("degree")?.stale);
        });
        window.removeEventListener("unhandledrejection", onError);
        assert.deepEqual(errors, [], "no page error");
        assert.equal(session.runs.get("degree")?.status, "succeeded");
    });

    it("calls nodes by their label in the Edges table and the inspector, and a time column by its dates", async () => {
        const { session } = await open(OFFICE_EMAIL, "graph");
        await act(async () => {
            await session.time.setField({ edges: { start: "sent" } });
        });
        await userEvent.keyboard("{Shift>}T{/Shift}");
        const dock = await screen.findByRole("region", { name: "Table" });
        await userEvent.click(await within(dock).findByRole("tab", { name: "Edges" }));
        const [edge] = session.data.edgePage({ limit: 1 }).records;
        const from = session.data.name(edge.source) ?? "";
        assert.notEqual(from, String(edge.source), "the sample labels its nodes");
        const grid = screen.getByRole("grid", { name: "Edges" });
        await waitFor(() => {
            const first = within(grid).getAllByRole("rowheader")[0];
            assert.equal(first.textContent, from);
        });
        // A row click selects the edge; the inspector names its ends the same way.
        await userEvent.click(within(grid).getAllByRole("rowheader")[0]);
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        await inspector.findByText(new RegExp(`^${from} `));
    });

    it("leaves the canvas as it is when the selection is drawn over the histogram", async () => {
        const { session } = await open();
        const dock = await designateSent(session);
        const canvas = document.querySelector("graphty-element")?.getBoundingClientRect();
        await act(async () => {
            await session.selection.apply({ nodes: ["p01"] });
        });
        await within(dock).findByRole("img", { name: "Selection over time" });
        assert.deepEqual(document.querySelector("graphty-element")?.getBoundingClientRect(), canvas);
    });
});

describe("the Overview and the import of time", () => {
    it("offers the column that reads as time, and reads the visible graph while a window is on", async () => {
        const { session } = await open(OFFICE_EMAIL, "graph");
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        await userEvent.click(await inspector.findByRole("button", { name: "Set as time" }));
        await waitFor(() => {
            assert.deepEqual(session.time.field, { edges: { start: "sent" } });
        });
        await act(async () => {
            await session.time.setSettings({ step: "week" });
            await session.time.stepBy(1);
        });
        const edges = await inspector.findByRole("group", { name: "Edges showing" });
        assert.include(edges.textContent, `${session.visibility.summary.visibleEdges.toLocaleString()} of 2,102`);
    });

    it("reads a year column as years, steps a year at a time, and reads it as numbers on request", async () => {
        const { session } = await open(PAPERS);
        await pickField("year", "Node time");
        const dock = await screen.findByRole("region", { name: "Timeline" });
        await waitFor(() => {
            assert.equal(session.time.field?.nodes?.unit, "year");
            assert.equal(readout(dock), "1995 - 2024");
        });

        // The window moves along the real years, not stuck in January 1970.
        await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));
        await userEvent.keyboard(".");
        await waitFor(() => {
            assert.equal(new Date(Number(session.time.current?.from)).getUTCFullYear(), 1996);
            assert.equal(readout(dock), "1996");
        });
        await userEvent.keyboard(">");
        await waitFor(() => {
            assert.equal(readout(dock), "2024");
        });

        // The same years as plain numbers: Unit, Number.
        await userEvent.click(await dataPlace().findByRole("combobox", { name: "Node time unit" }));
        await userEvent.click(await screen.findByRole("option", { name: "Number" }));
        await waitFor(() => {
            assert.equal(session.time.field?.nodes?.unit, "ordinal");
            assert.equal(readout(dock), "1995 - 2024");
        });
        await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));
        await waitFor(() => {
            assert.isTrue(Number.isInteger(Number(session.time.current?.from)));
            assert.isAtLeast(Number(session.time.current?.from), 1990);
        });
    });

    it("shows and hides the timeline from its toolbar button and the T key", async () => {
        const { session } = await open();
        assert.isNull(screen.queryByRole("button", { name: "Timeline" }), "no toggle without a time field");
        await designateSent(session);
        const toggle = await screen.findByRole("button", { name: "Timeline" });
        assert.equal(toggle.getAttribute("aria-pressed"), "true");

        await userEvent.click(toggle);
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "Timeline" }));
            assert.equal(toggle.getAttribute("aria-pressed"), "false");
        });
        assert.isNotNull(session.time.field, "hiding the timeline keeps the field");

        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("t");
        await screen.findByRole("region", { name: "Timeline" });
        assert.equal(toggle.getAttribute("aria-pressed"), "true");
        await userEvent.keyboard("t");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "Timeline" }));
        });
    });

    it("draws the elements outside the window as ghosts with Outside: Ghost, and moves them as the window moves", async () => {
        const { session } = await open(PAPERS);
        await session.config.set({ startingRows: true });
        await pickField("year", "Node time");
        const dock = await screen.findByRole("region", { name: "Timeline" });
        await waitFor(() => {
            assert.include(
                session.styles.list().map((layer) => layer.name),
                "Ghost",
            );
        });
        await userEvent.click(within(dock).getByRole("button", { name: "Step forward" }));
        await waitFor(() => {
            assert.isNotNull(session.time.current);
        });
        const outside = await (await timeCard()).findByRole("radiogroup", { name: "Outside" });
        const graph = session.data.snapshot();
        const ghostLayer = session.styles.list().find((layer) => layer.name === "Ghost" && layer.target === "node");
        assert.isDefined(ghostLayer);
        const ghosts = (): number => session.styles.counts(ghostLayer?.id ?? "").matched;
        assert.equal(ghosts(), 0, "hidden, not ghosted, by default");

        await userEvent.click(within(outside).getByText("Ghost"));
        await waitFor(() => {
            assert.equal(session.time.settings.outside, "ghost");
            assert.isAbove(ghosts(), 0);
            assert.equal(ghosts(), graph.nodeCount - session.visibility.summary.visibleNodes);
        });
        // Ghosts are drawn but not visible: the counts are the window's.
        const visibleBefore = [...session.visibility.nodes].sort();

        // Scrub: step forward, and the ghosts follow the window.
        const first = Number(session.time.current?.from);
        await userEvent.keyboard(".");
        await waitFor(() => {
            assert.isAbove(Number(session.time.current?.from), first);
            assert.notDeepEqual([...session.visibility.nodes].sort(), visibleBefore);
            assert.equal(ghosts(), graph.nodeCount - session.visibility.summary.visibleNodes);
        });

        await userEvent.click(within(outside).getByText("Hide"));
        await waitFor(() => {
            assert.equal(ghosts(), 0);
        });
    });

    it("shows an Untimed control for a file with blank times, and Hide leaves them out", async () => {
        const store = createWorkspaceStore({ project: { name: "Blanks", id: 1 }, place: "data" });
        render(<Workspace store={store} registrations={REGISTRATIONS} />);
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
        const live = session as GraphSession;
        await live.data.import({
            type: "csv",
            config: { data: "source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,\n" },
        });
        await pickField("sent");
        const untimed = await (await timeCard()).findByRole("radiogroup", { name: "Untimed" });
        await userEvent.click(
            screen.getByRole("region", { name: "Timeline" }).querySelector("[aria-label='Step forward']") as Element,
        );
        const shown = live.visibility.summary.visibleEdges;
        await userEvent.click(within(untimed).getByText("Hide"));
        await waitFor(() => {
            assert.equal(live.visibility.summary.visibleEdges, shown - 1);
        });
    });

    it("adds a time window as a filter step: Filter by Time window, its field, Add step", async () => {
        const { session } = await open();
        await userEvent.click(await dataPlace().findByRole("button", { name: "Add filter step" }));
        await userEvent.click(await screen.findByRole("combobox", { name: "Filter by" }));
        await userEvent.click(await screen.findByRole("option", { name: "Time window" }));
        const card = within(await screen.findByTestId("time-card"));
        await userEvent.click(card.getByRole("combobox", { name: "Time field" }));
        await userEvent.click(await screen.findByRole("option", { name: "sent" }));
        await waitFor(() => {
            assert.deepEqual(session.time.field, { edges: { start: "sent" } });
        });
        await userEvent.click(screen.getByRole("button", { name: "Add step" }));

        await waitFor(() => {
            assert.isNotNull(session.visibility.window, "the window is on");
        });
        assert.isBelow(session.visibility.summary.visibleEdges, 2102);
        // The Filters list holds it as a row, and the card stays open on it.
        await dataPlace().findByRole("treeitem", { name: /^Time / });
        await screen.findByTestId("time-card");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("button", { name: "Add step" }), "the row's card has nothing to add");
        });
        // The same field reads in Fields.
        assert.equal(dataPlace().getByRole("combobox", { name: "Edge time" }).getAttribute("value"), "sent");
    });

    it("drags the whole window from between its two handles, the graph following, as one step", async () => {
        const { session } = await open();
        const dock = await designateSent(session);
        const extent = session.time.extent();
        assert.isNotNull(extent);
        const start = extent?.from ?? 0;
        const span = (extent?.to ?? 0) - start;
        const from = start + span * 0.45;
        const to = from + span * 0.1;
        await act(async () => {
            await session.time.window({ from, to, step: "week" });
        });
        const before = session.history.position;
        const live: TimeStepEvent[] = [];
        const off = session.on("time:step", (step) => {
            live.push(step);
        });

        // The row under the bars, between the two handles: the middle of the brush.
        const row = within(dock).getByTestId("histogram-brush");
        await dragAcross(row, -row.getBoundingClientRect().width / 5);
        off();

        await waitFor(() => {
            assert.isBelow(Number(session.visibility.window?.from), from - span / 10);
        });
        const { window } = session.visibility;
        assert.closeTo(Number(window?.to) - Number(window?.from), to - from, 1, "the window keeps its width");
        assert.isAbove(
            live.filter((step) => step.cause === "seek").length,
            1,
            "the graph followed the drag before the release",
        );
        assert.equal(session.history.position, before + 1, "one drag, one step");
        await act(async () => {
            await session.undo();
        });
        assert.equal(Number(session.visibility.window?.from), from);
    });

    it("plays smoothly: the window slides by slivers of a step and elements come and go a few at a time", async () => {
        const { session } = await open();
        const dock = await designateSent(session);
        await pickIn("Step", "Week");
        const frames: TimeStepEvent[] = [];
        const off = session.on("time:step", (step) => {
            if (step.cause === "play") {
                frames.push(step);
            }
        });

        await userEvent.click(within(dock).getByRole("button", { name: "Play" }));
        await waitFor(() => {
            assert.isAtLeast(frames.length, 12, "frames played");
        });
        await userEvent.click(within(dock).getByRole("button", { name: "Pause" }));
        off();

        const WEEK = 7 * 86_400_000;
        const moves = frames.slice(1).map((frame, at) => frame.from - frames[at].from);
        assert.isTrue(
            moves.every((by) => by >= 0 && by < WEEK / 4),
            `every frame moves a sliver of a week: ${moves.join(", ")}`,
        );
        assert.isTrue(
            frames.some((frame) => (frame.from - frames[0].from) % WEEK !== 0),
            "the window sits between whole steps",
        );
        // Each frame shows and hides only the edges its moving edges passed.
        assert.isTrue(frames.slice(1).every((frame) => frame.entered.edges + frame.left.edges < 2102 / 4));
        await waitFor(() => {
            assert.equal(Number(session.visibility.window?.from), frames.at(-1)?.from, "paused where it slid to");
        });
    });

    // Re-rendered on every frame of a play, Fields and the time card read every column's values
    // again for each one: on a loaded software-GPU page, part of what timed the play out (#4196).
    it("plays without the Data place reading the columns again for each frame", async () => {
        const { session } = await open();
        const dock = await designateSent(session);
        await pickIn("Step", "Week");
        const attributes = vi.spyOn(session.data, "attributes");
        // The reads made between the 4th and the 12th frame: none of the play's own start or stop.
        const readsAt = new Map<number, number>();
        let frames = 0;
        const off = session.on("time:step", (step) => {
            if (step.cause === "play") {
                frames++;
                readsAt.set(frames, attributes.mock.calls.length);
            }
        });

        await userEvent.click(within(dock).getByRole("button", { name: "Play" }));
        await waitFor(
            () => {
                assert.isAtLeast(frames, 12, "frames played");
            },
            { timeout: TIMEOUT_MS },
        );
        await userEvent.click(within(dock).getByRole("button", { name: "Pause" }));
        off();
        attributes.mockRestore();

        const reads = (readsAt.get(12) ?? 0) - (readsAt.get(4) ?? 0);
        assert.isBelow(reads, 8, `the columns were read ${String(reads)} times in 8 frames`);
    });
});
