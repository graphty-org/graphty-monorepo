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
import { assert, beforeAll, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { dragAcross } from "../../../test/real-pointer";
import { act, render, screen, waitFor, type Within, within } from "../../../test/test-utils";
import { tooltipOf } from "../../../test/tooltip";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Enough simulation steps for the samples' force layout to settle before it is drawn. */
const PRE_STEPS = 1000;

/** The office email sample: 48 people, 2,102 emails, each edge with its `sent` time in 2025. */
const OFFICE_EMAIL = `${import.meta.env.BASE_URL}samples/office-email.json`;
/** The paper citations sample: 159 papers, each with its `year`. */
const PAPERS = `${import.meta.env.BASE_URL}samples/paper-citations.json`;
/** The Marvel films sample: 210 films and people, each edge with its film's `released` date. */
const MARVEL = `${import.meta.env.BASE_URL}samples/marvel-films.json`;

/**
 * Where every node is, as text to compare.
 * @param session - the element's session.
 * @returns each row's position.
 */
function positions(session: GraphSession): string {
    const out = { x: 0, y: 0, z: 0 };
    const all: number[] = [];
    for (let i = 0; i < session.data.statistics().nodeCount; i++) {
        session.positions.read(i, out);
        all.push(out.x, out.y, out.z);
    }
    return JSON.stringify(all);
}

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
function dataPlace(): Within {
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
        name: `Add to ${row === "Edge time" ? "edge" : "node"} attributes`,
    });
    const entry = dataPlace().queryByRole("combobox", { name: row });
    // A column that does not fit names how many of its values will not convert after its name.
    const name = new RegExp(String.raw`^${column}(\s*[\d,]+ will not convert)?$`);
    if (entry === null) {
        await userEvent.click(plus);
        await userEvent.hover(page.getByRole("menuitem", { name: "Time", exact: true }));
        await userEvent.click(page.getByRole("menuitem", { name, exact: true }));
    } else {
        await userEvent.click(entry);
        await userEvent.click(page.getByRole("option", { name, exact: true }));
    }
}

/**
 * Opens the timeline's settings from the dock's settings button, opening the dock first.
 * @returns queries inside the settings.
 */
async function timeCard(): Promise<Within> {
    if (screen.queryByTestId("time-card") === null) {
        const dock = await openDock();
        await userEvent.click(
            page.elementLocator(dock).getByRole("button", { name: "Timeline settings", exact: true }),
        );
    }
    return within(await screen.findByTestId("time-card"));
}

/**
 * Opens the timeline dock from the canvas toolbar's clock button, as the reader does.
 * @returns the dock.
 */
async function openDock(): Promise<HTMLElement> {
    const toggle = await screen.findByRole("button", { name: "Timeline" });
    if (toggle.getAttribute("aria-pressed") !== "true") {
        await userEvent.click(page.getByRole("button", { name: "Timeline", exact: true }));
    }
    return screen.findByRole("region", { name: "Timeline" });
}

/**
 * Picks `sent` as the time field, then opens the dock.
 * @param session - the element's session.
 * @returns the dock.
 */
async function designateSent(session: GraphSession): Promise<HTMLElement> {
    await pickField("sent");
    await waitFor(() => {
        assert.deepEqual(session.time.field, { edges: { start: "sent" } });
    });
    return openDock();
}

/**
 * Picks an option of a time card menu.
 * @param menu - the menu's name.
 * @param option - the option.
 */
async function pickIn(menu: string, option: string | RegExp): Promise<void> {
    await userEvent.click(await (await timeCard()).findByRole("combobox", { name: menu }));
    await userEvent.click(page.getByRole("option", { name: option, exact: true }));
}

/**
 * The dock's readout text.
 * @param dock - the dock.
 * @returns the text.
 */
function readout(dock: HTMLElement): string {
    return within(dock).getByTestId("time-readout").textContent ?? "";
}

// Both blocks: in Vitest's default 414 x 896 frame the side panels leave the canvas no width and cover
// the canvas toolbar's Timeline button, so a test of the second block run alone (-t) never landed its
// click (#9650, #9677).
beforeAll(async () => {
    await page.viewport(1366, 768);
});

describe("the timeline on the real element", () => {
    it("designates the time field from the Data place's Fields, and the dock shows the data's span", async () => {
        const { session } = await open();
        assert.isNull(screen.queryByRole("region", { name: "Timeline" }));
        assert.isNull(dataPlace().queryByRole("region", { name: "Time" }), "no Time section beside Fields");
        const canvas = document.querySelector("graphty-element");
        assert.isNotNull(canvas);
        const before = canvas?.getBoundingClientRect().height;
        await pickField("sent");
        await waitFor(() => {
            assert.deepEqual(session.time.field, { edges: { start: "sent" } });
        });

        // Setting the role sets only the role: no dock, no Time window card, the canvas keeps its size.
        const toggle = await screen.findByRole("button", { name: "Timeline" });
        assert.equal(toggle.getAttribute("aria-pressed"), "false");
        assert.isNull(screen.queryByRole("region", { name: "Timeline" }));
        assert.isNull(dataPlace().queryByRole("group", { name: /^Time window/ }));
        assert.equal(canvas?.getBoundingClientRect().height, before);

        const dock = await openDock();
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
        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Speed 1x", exact: true }));
        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Speed 2x", exact: true }));
        assert.equal(store.get().timeSpeed, 4);
        const { position } = session.history;

        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Play", exact: true }));
        await waitFor(() => {
            assert.isTrue(session.time.playing);
            assert.isAbove(Number(session.time.current?.from), Date.UTC(2024, 11, 30));
        });
        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Pause", exact: true }));
        assert.isFalse(session.time.playing);
        await waitFor(() => {
            assert.equal(session.history.position, position + 1, "a play is one step");
        });
        await act(async () => {
            await session.undo();
        });
        assert.isNull(session.time.current);
    });

    it("waits for each frame through a stepped play, and through a change of speed", async () => {
        const { session } = await open();
        const dock = await designateSent(session);
        await pickIn("Step", "Week");
        await act(async () => {
            await session.time.setSettings({ results: "rerun" });
        });
        // Each wait for a frame listens for the page being hidden: the one sign of it outside the
        // element, and session.time is frozen. A play on the timer alone adds none.
        const listening = vi.spyOn(document, "addEventListener");
        const waits = (): number => listening.mock.calls.filter(([type]) => type === "visibilitychange").length;

        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Speed 1x", exact: true }));
        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Play", exact: true }));
        await waitFor(() => {
            assert.isAbove(waits(), 0);
        });
        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Speed 2x", exact: true }));
        const before = waits();
        await waitFor(() => {
            assert.isAtLeast(waits(), before + 2);
        });
        // The sample is about 26 weeks, so on a slow machine the play can reach the end of the data
        // before a click on Pause lands, and the button reads Play again. Stop it whichever way it
        // stands: pausing an ended play does nothing. The Pause button has its own test above.
        act(() => {
            session.time.pause();
        });
        listening.mockRestore();
    });

    it("steps by button and key, opening the first window, and stops at the end of the data", async () => {
        const { session } = await open();
        const dock = await designateSent(session);
        await pickIn("Step", "Day");
        const DAY = 86_400_000;
        const start = Date.UTC(2025, 0, 1);

        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Step forward", exact: true }));
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

    it("keeps the results rule, Mode and Step through Show all time", async () => {
        const { session } = await open();
        const dock = await designateSent(session);
        await pickIn("When window moves", "Keep");
        await userEvent.click(
            page
                .elementLocator((await timeCard()).getByRole("radiogroup", { name: "Mode" }))
                .getByText("Grow", { exact: true }),
        );
        await pickIn("Step", "Week");
        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Step forward", exact: true }));
        await waitFor(() => {
            assert.isNotNull(session.time.current);
        });

        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Show all time", exact: true }));
        await waitFor(() => {
            assert.isNull(session.time.current);
        });
        assert.deepInclude(session.time.settings, { results: "keep", mode: "cumulative", step: "week" });
        const card = await timeCard();
        assert.equal(card.getByRole("combobox", { name: "When window moves" }).getAttribute("value"), "Keep");
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
        await userEvent.click(page.elementLocator(dock).getByTestId("time-readout"));
        const from = page.getByRole("textbox", { name: "From", exact: true });
        await userEvent.clear(from);
        await userEvent.type(from, "Mar 9, 2025");
        const to = page.getByRole("textbox", { name: "To", exact: true });
        await userEvent.clear(to);
        await userEvent.type(to, "Mar 19, 2025{Enter}");
        await waitFor(() => {
            assert.equal(readout(dock), "Mar 9, 2025 - Mar 19, 2025");
        });
    });

    it("names the window in the header chip, the Filters list and Undo; the chip focuses the brush and clears", async () => {
        const { session, store } = await open();
        await designateSent(session);
        await userEvent.click(page.getByRole("button", { name: /^Undo/ }));
        await waitFor(() => {
            assert.equal(store.get().announcement, "Undid setting the time field");
        });
        await userEvent.click(page.getByRole("button", { name: /^Redo/ }));
        // The dock went with the field and came back with it.
        const dock = await openDock();
        await pickIn("Step", "Week");
        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Step forward", exact: true }));

        await waitFor(() => {
            assert.isNotNull(session.time.current);
        });
        const chip = page.getByRole("button", { name: /^Time: / });
        await userEvent.click(chip);
        assert.equal(document.activeElement?.getAttribute("aria-label"), "Window start");
        // The dock's icon controls say their names on hover, whatever the window's state.
        const settings = within(dock).getByRole("button", { name: "Timeline settings" });
        assert.equal(await tooltipOf(settings), "Timeline settings");
        const clear = screen.getByRole("button", { name: "Clear the time window" });
        assert.equal(await tooltipOf(clear), "Clear the time window");
        await userEvent.click(page.getByRole("button", { name: "Clear the time window", exact: true }));
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
        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Step forward", exact: true }));
        // The chips after the time chip start where it ends: that edge stays put.
        const chip = (await screen.findByRole("button", { name: /^Time: / })).closest(".tl-chip");
        const xs = new Set<number>();
        for (let step = 0; step < 4; step++) {
            const before = Number(session.time.current?.from);
            await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Step forward", exact: true }));
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
            place.getByRole("combobox", { name: "When window moves" }),
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
        const dock = await openDock();
        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Step forward", exact: true }));
        await waitFor(() => {
            assert.isNotNull(session.time.current);
        });
        const run = session.runs.start("degree", undefined, { as: "degree" });
        await act(async () => {
            await run;
            await session.styles.settled();
        });

        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Step forward", exact: true }));
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
        await userEvent.click(page.getByRole("treeitem", { name: /^Connections, / }));
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        await inspector.findByText(/^Out of date: ran on /);
        const errors: unknown[] = [];
        const onError = (event: PromiseRejectionEvent): void => {
            errors.push(event.reason);
        };
        window.addEventListener("unhandledrejection", onError);
        await userEvent.click(
            page
                .getByRole("complementary", { name: "Inspector", exact: true })
                .getByRole("button", { name: "Rerun", exact: true }),
        );
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
        await userEvent.click(page.elementLocator(dock).getByRole("tab", { name: "Edges", exact: true }));
        const [edge] = session.data.edgePage({ limit: 1 }).records;
        const from = session.data.name(edge.source) ?? "";
        assert.notEqual(from, String(edge.source), "the sample labels its nodes");
        const grid = screen.getByRole("grid", { name: "Edges" });
        await waitFor(() => {
            const first = within(grid).getAllByRole("rowheader")[0];
            assert.equal(first.textContent, from);
        });
        // A row click selects the edge; the inspector names its ends the same way.
        await userEvent.click(page.elementLocator(grid).getByRole("rowheader").nth(0));
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
    it("offers the column that reads as time as a door to Fields, and reads the whole graph while a window is on", async () => {
        const { session } = await open(OFFICE_EMAIL, "graph");
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        await userEvent.click(
            page
                .getByRole("complementary", { name: "Inspector", exact: true })
                .getByRole("button", { name: "Set in Data", exact: true }),
        );
        // The door opens the Time entry's home, Data > Fields, with the column chosen and focused.
        const place = await screen.findByRole("region", { name: "Data place" });
        await waitFor(() => {
            assert.deepEqual(session.time.field, { edges: { start: "sent" } });
            const time = within(place).getByRole<HTMLInputElement>("combobox", { name: "Edge time" });
            assert.equal(time.value, "sent");
            assert.strictEqual(document.activeElement, time);
        });
        await act(async () => {
            await session.time.setSettings({ step: "week" });
            await session.time.stepBy(1);
        });
        // The window narrows only the drawing: the Overview counts no "showing" subset.
        assert.isNotNull(session.time.current);
        await inspector.findByText("Direction");
        assert.isNull(inspector.queryByRole("group", { name: "Edges showing" }));
    });

    it("reads a year column as years, steps a year at a time, and reads it as numbers on request", async () => {
        const { session } = await open(PAPERS);
        await pickField("year", "Node time");
        const dock = await openDock();
        await waitFor(() => {
            assert.equal(session.time.field?.nodes?.unit, "year");
            assert.equal(readout(dock), "1995 - 2024");
        });

        // The window moves along the real years, not stuck in January 1970.
        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Step forward", exact: true }));
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
        await userEvent.click(page.getByRole("option", { name: "Number", exact: true }));
        await waitFor(() => {
            assert.equal(session.time.field?.nodes?.unit, "ordinal");
            assert.equal(readout(dock), "1995 - 2024");
        });
        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Step forward", exact: true }));
        await waitFor(() => {
            assert.isTrue(Number.isInteger(Number(session.time.current?.from)));
            assert.isAtLeast(Number(session.time.current?.from), 1990);
        });
    });

    it("makes the field one of intervals from the End row, and the window holds what spans it", async () => {
        const store = createWorkspaceStore({ project: { name: "Spans", id: 1 }, place: "data" });
        render(<Workspace store={store} registrations={REGISTRATIONS} />);
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        const data = "source,target,began,ended\na,b,2025-01-01,2025-03-01\nb,c,2025-02-01,2025-02-02\n";
        await session.data.import({ type: "csv", config: { data }, name: "Spans" });
        await pickField("began");
        await userEvent.click(await dataPlace().findByRole("combobox", { name: "Edge time end" }));
        await userEvent.click(page.getByRole("option", { name: "ended", exact: true }));
        const live = session;
        await waitFor(() => {
            assert.deepEqual(live.time.field?.edges, { start: "began", end: "ended" });
        });

        // Feb 15 is inside the first edge's span and after the second one ended.
        await live.time.window({ from: Date.UTC(2025, 1, 15), to: Date.UTC(2025, 1, 16) });
        assert.strictEqual(live.time.inside?.edges, 1);
    });

    it("keeps the Unit picked when the End row changes", async () => {
        const store = createWorkspaceStore({ project: { name: "Steps", id: 1 }, place: "data" });
        render(<Workspace store={store} registrations={REGISTRATIONS} />);
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        const data = "source,target,began,ended\na,b,1,5\nb,c,2,3\n";
        await session.data.import({ type: "csv", config: { data }, name: "Steps" });
        await pickField("began");
        await userEvent.click(await dataPlace().findByRole("combobox", { name: "Edge time unit" }));
        await userEvent.click(page.getByRole("option", { name: "Number", exact: true }));
        const live = session;
        await waitFor(() => {
            assert.equal(live.time.field?.edges?.unit, "ordinal");
        });
        await userEvent.click(await dataPlace().findByRole("combobox", { name: "Edge time end" }));
        await userEvent.click(page.getByRole("option", { name: "ended", exact: true }));
        await waitFor(() => {
            assert.deepEqual(live.time.field?.edges, { start: "began", unit: "ordinal", end: "ended" });
        });
        await userEvent.click(await dataPlace().findByRole("combobox", { name: "Edge time end" }));
        await userEvent.click(page.getByRole("option", { name: "None", exact: true }));
        await waitFor(() => {
            assert.deepEqual(live.time.field?.edges, { start: "began", unit: "ordinal" });
        });
    });

    it("picks the time field in the time card, and None takes the timeline away", async () => {
        const { session, store } = await open();
        await designateSent(session);
        // A node column with no times is refused, and the field stays as it was.
        await pickIn("Time field", "team");
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "team has no times");
        });
        assert.deepEqual(session.time.field, { edges: { start: "sent" } });
        await pickIn("Time field", "None");
        await waitFor(() => {
            assert.isNull(session.time.field);
            assert.isNull(screen.queryByRole("region", { name: "Timeline" }));
        });
    });

    it("sets a number column's unit, the step, Untimed and Mode from the time card, both ways", async () => {
        const store = createWorkspaceStore({ project: { name: "Numbers", id: 1 }, place: "data" });
        render(<Workspace store={store} registrations={REGISTRATIONS} />);
        const session = await waitFor(() => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        });
        // One edge has no time, so the card offers Untimed.
        const data = "source,target,t\na,b,1\nb,c,7\nc,d,20\nd,e,\n";
        await session.data.import({ type: "csv", config: { data }, name: "Numbers" });
        await pickField("t");
        await openDock();
        const radio = async (group: string, label: string): Promise<void> => {
            await userEvent.click(
                page
                    .elementLocator((await timeCard()).getByRole("radiogroup", { name: group }))
                    .getByText(label, { exact: true }),
            );
        };

        await radio("Unit", "Epoch s");
        await waitFor(() => {
            assert.deepEqual(session.time.field, { edges: { start: "t", unit: "s" } });
        });
        await radio("Unit", "Number");
        await waitFor(() => {
            assert.deepEqual(session.time.field, { edges: { start: "t", unit: "ordinal" } });
        });

        // A number column steps by counts; Auto hands the step back to the element.
        await pickIn("Step", "5");
        await waitFor(() => {
            assert.strictEqual(session.time.settings.step, 5);
        });
        await pickIn("Step", /^Auto/);
        await waitFor(() => {
            assert.strictEqual(session.time.settings.step, "auto");
        });

        await radio("Untimed", "Hide");
        await waitFor(() => {
            assert.strictEqual(session.time.settings.missing, "outside");
        });
        await radio("Untimed", "Show");
        await waitFor(() => {
            assert.strictEqual(session.time.settings.missing, "inside");
        });

        await radio("Mode", "Grow");
        await waitFor(() => {
            assert.strictEqual(session.time.settings.mode, "cumulative");
        });
        await radio("Mode", "Slide");
        await waitFor(() => {
            assert.strictEqual(session.time.settings.mode, "sliding");
        });
    });

    it("shows and hides the timeline from its toolbar button and the T key", async () => {
        const { session } = await open();
        assert.isNull(screen.queryByRole("button", { name: "Timeline" }), "no toggle without a time field");
        await pickField("sent");
        const toggle = await screen.findByRole("button", { name: "Timeline" });
        assert.equal(toggle.getAttribute("aria-pressed"), "false", "setting the field leaves the dock shut");
        assert.isNull(screen.queryByRole("region", { name: "Timeline" }));
        await userEvent.click(page.getByRole("button", { name: "Timeline", exact: true }));
        await screen.findByRole("region", { name: "Timeline" });
        assert.equal(toggle.getAttribute("aria-pressed"), "true");

        await userEvent.click(page.getByRole("button", { name: "Timeline", exact: true }));
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

    it("hides the elements outside the window through the Timeline Hidden row, which follows the window", async () => {
        const { session } = await open(PAPERS);
        await session.config.set({ startingRows: true });
        await pickField("year", "Node time");
        const dock = await openDock();
        await waitFor(() => {
            assert.include(
                session.styles.list().map((layer) => layer.name),
                "Timeline Hidden",
            );
        });
        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Step forward", exact: true }));
        await waitFor(() => {
            assert.isNotNull(session.time.current);
        });
        // How what lies outside draws is the row's style, edited like any other row: the Time card
        // has no control of its own for it.
        assert.isNull((await timeCard()).queryByRole("radiogroup", { name: "Outside" }));
        await userEvent.click(page.getByRole("button", { name: "Close Timeline settings", exact: true }));
        const graph = session.data.snapshot();
        const ghostLayer = session.styles
            .list()
            .find((layer) => layer.name === "Timeline Hidden" && layer.target === "node");
        assert.isDefined(ghostLayer);
        // What the Timeline Hidden layer selects: every node outside the window.
        const ghosts = (): number => session.styles.counts(ghostLayer?.id ?? "", { scope: "graph" }).matched;
        // What lies outside the window: the window narrows only the drawing, never the visible count.
        const outsideCount = (): number => graph.nodeCount - (session.time.inside?.nodes ?? graph.nodeCount);
        // Hidden by default: the layer selects what lies outside and leaves it undrawn.
        assert.equal(session.time.settings.outside, "hide");
        assert.isFalse(ghostLayer?.set?.["node.visible"], "hidden, not ghosted, by default");
        await waitFor(() => {
            assert.isAbove(ghosts(), 0);
            assert.equal(ghosts(), outsideCount());
        });
        // The window narrows nothing visible: every node stays in the visible count.
        assert.equal(session.visibility.summary.visibleNodes, graph.nodeCount);
        assert.deepEqual(session.visibility.notDrawn, [], "nothing asked for is kept from drawing");

        // Scrub: step forward, and what the row selects follows the window.
        const first = Number(session.time.current?.from);
        await userEvent.keyboard(".");
        await waitFor(() => {
            assert.isAbove(Number(session.time.current?.from), first);
            assert.equal(ghosts(), outsideCount());
        });
    });

    it("plays the Marvel films with no layout running: no node and no camera moves, and the Timeline Hidden row holds the rest", async () => {
        const { session } = await open(MARVEL, "graph");
        await session.config.set({ startingRows: true });
        await userEvent.click(
            page
                .getByRole("complementary", { name: "Inspector", exact: true })
                .getByRole("button", { name: "Set in Data", exact: true }),
        );
        await waitFor(() => {
            assert.deepEqual(session.time.field, { edges: { start: "released" } });
        });
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        await element?.waitForSettled();
        const before = positions(session);
        const camera = JSON.stringify(element?.getCameraState());
        const dock = await openDock();

        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Play", exact: true }));
        await waitFor(() => {
            assert.isNotNull(session.time.current);
        });
        const first = Number(session.time.current?.from);
        // Two steps on, the window has moved twice.
        await waitFor(() => {
            assert.isAbove(Number(session.time.current?.from), first);
        });
        const second = Number(session.time.current?.from);
        await waitFor(() => {
            assert.isAbove(Number(session.time.current?.from), second);
        });
        if (session.time.playing) {
            await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Pause", exact: true }));
        }
        await element?.waitForSettled();
        assert.isBelow(session.time.inside?.nodes ?? Infinity, session.data.statistics().nodeCount);
        assert.equal(positions(session), before, "no node moved");
        assert.equal(JSON.stringify(element?.getCameraState()), camera, "the camera stayed");

        // The Timeline Hidden layer selects what lies outside the window, and counts it.
        const ghostLayer = session.styles
            .list()
            .find((layer) => layer.name === "Timeline Hidden" && layer.target === "node");
        await waitFor(() => {
            assert.isAbove(session.styles.counts(ghostLayer?.id ?? "").matched, 0);
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
        await userEvent.click(
            page
                .elementLocator(await openDock())
                .getByCss("[aria-label='Step forward']")
                .first(),
        );
        const shown = live.time.inside?.edges ?? 0;
        const untimed = await (await timeCard()).findByRole("radiogroup", { name: "Untimed" });
        await userEvent.click(page.elementLocator(untimed).getByText("Hide", { exact: true }));
        await waitFor(() => {
            assert.equal(live.time.inside?.edges, shown - 1);
        });
    });

    it("opens the timeline's settings from the dock, and Filters offers no Time window", async () => {
        const { session } = await open();
        await pickField("sent");
        await waitFor(() => {
            assert.isNotNull(session.time.field);
        });
        const card = await timeCard();
        card.getByRole("radiogroup", { name: "Zone" });
        // How a play moves the window has a section of its own, and says what each mode does.
        const animation = card.getByRole("group", { name: "Animation", description: /^Slide moves .* Grow keeps/ });
        const settings = card.getByRole("group", { name: "Time" });
        // So does what a window move does to algorithm results.
        const results = card.getByRole("group", { name: "Algorithm results", description: /^When window moves: / });
        within(results).getByRole("combobox", { name: "When window moves" });
        assert.isNull(within(settings).queryByRole("radiogroup", { name: "Mode" }), "Mode is not a Time setting");
        within(animation).getByRole("button", { name: "About Animation" });
        await userEvent.click(
            page
                .elementLocator(animation)
                .getByRole("radiogroup", { name: "Mode", exact: true })
                .getByText("Grow", { exact: true }),
        );
        await waitFor(() => {
            assert.equal(session.time.settings.mode, "cumulative");
        });

        assert.isNull(dataPlace().queryByRole("group", { name: /^Time window/ }), "no Filters card");
        await userEvent.click(dataPlace().getByRole("button", { name: "Add filter" }));
        // The new card opens in the selection workspace: its Value list holds the filterable values.
        await userEvent.click(page.getByRole("button", { name: "Value", exact: true }));
        await screen.findByRole("option", { name: "Largest component" });
        assert.isNull(screen.queryByRole("option", { name: "Time window" }));
        await userEvent.keyboard("{Escape}");
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
            // Consecutive window edits merge into one step; an undo and a redo end that, so the
            // drag below is counted on its own.
            await session.undo();
            await session.redo();
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

        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Play", exact: true }));
        await waitFor(() => {
            assert.isAtLeast(frames.length, 12, "frames played");
        });
        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Pause", exact: true }));
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

        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Play", exact: true }));
        await waitFor(() => {
            assert.isAtLeast(frames, 12, "frames played");
        });
        await userEvent.click(page.elementLocator(dock).getByRole("button", { name: "Pause", exact: true }));
        off();
        attributes.mockRestore();

        const reads = (readsAt.get(12) ?? 0) - (readsAt.get(4) ?? 0);
        assert.isBelow(reads, 8, `the columns were read ${String(reads)} times in 8 frames`);
    });
});

// #9677: in a 1200 x 900 window with both side panels open, every canvas toolbar button lies inside
// the canvas the panels leave, and nothing covers it: Timeline's click lands and opens the dock.
describe("the canvas toolbar in a 1200 x 900 window with the side panels open", () => {
    beforeAll(async () => {
        await page.viewport(1200, 900);
    });

    it("leaves every toolbar button uncovered, and Timeline opens the dock", async () => {
        const { session } = await open(MARVEL, "graph");
        await userEvent.click(
            page
                .getByRole("complementary", { name: "Inspector", exact: true })
                .getByRole("button", { name: "Set in Data", exact: true }),
        );
        await waitFor(() => {
            assert.deepEqual(session.time.field, { edges: { start: "released" } });
        });
        assert.isAbove(screen.getByRole("complementary", { name: "Left panel" }).clientWidth, 0);
        const canvas = screen.getByTestId("canvas").getBoundingClientRect();
        const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
        const buttons = within(toolbar).getAllByRole("button");
        assert.isNotEmpty(buttons);
        for (const button of buttons) {
            const box = button.getBoundingClientRect();
            const name = button.getAttribute("aria-label") ?? button.textContent ?? "";
            assert.isAtLeast(box.left, canvas.left, `${name} starts inside the canvas`);
            assert.isAtMost(box.right, canvas.right, `${name} ends inside the canvas`);
            const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            assert.isTrue(button.contains(top), `nothing lies over ${name}`);
        }

        await userEvent.click(page.getByRole("button", { name: "Timeline", exact: true }));
        await screen.findByRole("region", { name: "Timeline" });
    });
});
