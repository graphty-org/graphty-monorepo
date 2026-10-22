/**
 * The timeline on the REAL graphty-element, driven by real input: the Time section designates the
 * time field and sets how windows move, the dock's brush is dragged with the mouse, Play and Pause
 * run the element's playback, the step buttons and keys move the window, and the header chip,
 * the Filters list, the Overview and Undo speak about it. Every assertion reads the element or
 * what the reader sees.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { dragAcross } from "../../../test/real-pointer";
import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

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
    await waitFor(
        () => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
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
 * Picks a column in the Time section's Time field menu, as the reader does.
 * @param column - the option's name.
 */
async function pickField(column: string): Promise<void> {
    await userEvent.click(await dataPlace().findByRole("combobox", { name: "Time field" }));
    await userEvent.click(await screen.findByRole("option", { name: column }));
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
 * Picks an option of a Time section menu.
 * @param menu - the menu's name.
 * @param option - the option.
 */
async function pickIn(menu: string, option: string | RegExp): Promise<void> {
    await userEvent.click(await dataPlace().findByRole("combobox", { name: menu }));
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

    it("designates the time field from the Time section, and the dock shows the data's span", async () => {
        const { session } = await open();
        assert.isNull(screen.queryByRole("region", { name: "Timeline" }));
        // The column that reads as time comes first in the menu.
        await userEvent.click(await dataPlace().findByRole("combobox", { name: "Time field" }));
        const options = await screen.findAllByRole("option");
        assert.equal(options[1].textContent, "sent", "after None, the time column");
        await userEvent.click(options[1]);

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
        // Speed cycles 1x, 2x, 4x in the dock; the Time section no longer has a Speed row.
        assert.isNull(dataPlace().queryByText("Speed"));
        await userEvent.click(within(dock).getByRole("button", { name: "Speed 1x" }));
        await userEvent.click(within(dock).getByRole("button", { name: "Speed 2x" }));
        assert.equal(store.get().timeSpeed, 4);
        const { position } = session.history;

        await userEvent.click(within(dock).getByRole("button", { name: "Play" }));
        await waitFor(
            () => {
                assert.isTrue(session.time.playing);
                assert.isAbove(Number(session.time.current?.from), Date.UTC(2024, 11, 30));
            },
            { timeout: TIMEOUT_MS },
        );
        await userEvent.click(within(dock).getByRole("button", { name: "Pause" }));
        assert.isFalse(session.time.playing);
        assert.equal(session.history.position, position + 1, "a play is one step");
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
        await userEvent.click(within(dataPlace().getByRole("radiogroup", { name: "Mode" })).getByText("Cumulative"));
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
        assert.equal(dataPlace().getByRole("combobox", { name: "Results" }).getAttribute("value"), "Keep");
        assert.equal(dataPlace().getByRole("combobox", { name: "Step" }).getAttribute("value"), "Week");
    });

    it("refuses a column with no times, leaving the field as it was", async () => {
        const { session, store } = await open();
        await designateSent(session);
        await pickField("team");
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

    it("lines up the Time section's controls on one right edge", async () => {
        const { session } = await open();
        await designateSent(session);
        const place = dataPlace();
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

    it("suggests Number for a year column, and one press reads it as years", async () => {
        const { session, store } = await open(PAPERS);
        await pickField("year");
        await waitFor(() => {
            assert.equal(store.get().notice?.action?.label, "Number");
        });
        act(() => {
            store.get().notice?.action?.run();
        });
        const dock = await screen.findByRole("region", { name: "Timeline" });
        await waitFor(() => {
            assert.equal(session.time.field?.nodes?.unit, "ordinal");
            assert.equal(readout(dock), "1995 - 2024");
        });
    });

    it("shows an Untimed control for a file with blank times, and Hide leaves them out", async () => {
        const store = createWorkspaceStore({ project: { name: "Blanks", id: 1 }, place: "data" });
        render(<Workspace store={store} registrations={REGISTRATIONS} />);
        let session: GraphSession | undefined;
        await waitFor(
            () => {
                session = document.querySelector("graphty-element")?.session;
                assert.isDefined(session);
            },
            { timeout: TIMEOUT_MS },
        );
        const live = session as GraphSession;
        await live.data.import({
            type: "csv",
            config: { data: "source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,\n" },
        });
        await pickField("sent");
        const untimed = await dataPlace().findByRole("radiogroup", { name: "Untimed" });
        await userEvent.click(
            screen.getByRole("region", { name: "Timeline" }).querySelector("[aria-label='Step forward']") as Element,
        );
        const shown = live.visibility.summary.visibleEdges;
        await userEvent.click(within(untimed).getByText("Hide"));
        await waitFor(() => {
            assert.equal(live.visibility.summary.visibleEdges, shown - 1);
        });
    });
});
