/**
 * The timeline in the app, on the real element, with no feature switched on: a reader finds it over
 * a graph with a column of dates and in a project saved with a time field.
 */

import "@graphty/graphty-element";

import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import { act } from "react";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { columnVerb, openColumnMenu } from "../../../test/column-header";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { openDataPage } from "../../data-page/request";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Every edge carries its `sent` date. */
const OFFICE_EMAIL = `${import.meta.env.BASE_URL}samples/office-email.json`;

/** Four edges, a day apart. */
const DATED_EDGES = "source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,2026-01-03\nD,A,2026-01-04\n";
const FIRST_TWO_DAYS = { from: Date.UTC(2026, 0, 1), to: Date.UTC(2026, 0, 3) };

/**
 * A project saved with a time field: a date column as its time field, its Timeline Hidden row, playback, a
 * zone that puts the first day on Dec 31, and a window.
 * @returns the file's text.
 */
async function timedProject(): Promise<string> {
    const saved = createGraphSession();
    await saved.data.import({ type: "csv", config: { data: DATED_EDGES } });
    await saved.config.set({ startingRows: true });
    await saved.data.setType({ kind: "edge", name: "sent" }, "date");
    await saved.time.setField({ edges: { start: "sent", unit: "ms" } });
    await saved.time.setSettings({ mode: "cumulative", outside: "ghost", timeZone: "America/New_York" });
    await saved.time.window(FIRST_TWO_DAYS);
    const { text } = await saved.project.save();
    saved.dispose();
    return text;
}

/**
 * Renders the workspace.
 * @param place - the place it opens on.
 * @param store - the chrome store.
 * @returns the session.
 */
async function mount(
    place: "graph" | "data",
    store: WorkspaceStore = createWorkspaceStore({ project: { name: "Timeline", id: 1 }, place }),
): Promise<GraphSession> {
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * Renders the workspace on the Data place and loads the sample.
 * @param place - the place it opens on.
 * @returns the session.
 */
async function open(place: "graph" | "data" = "data"): Promise<GraphSession> {
    const session = await mount(place);
    await session.data.import({ config: { url: OFFICE_EMAIL }, name: "Sample" });
    return session;
}

/**
 * The names of the style tree's rows, once `Everything` has drawn.
 * @returns the rows' accessible names.
 */
async function styleRows(): Promise<string[]> {
    const tree = within(await screen.findByRole("tree", { name: "Style layers" }));
    await tree.findByRole("treeitem", { name: /^Everything, / });
    return tree.getAllByRole("treeitem").map((row) => row.getAttribute("aria-label") ?? row.textContent);
}

/**
 * Opens the project saved with the timeline, reads the edges' table, and routes the inspector to
 * the Time card's step.
 * @returns the table's words.
 */
async function savedDates(): Promise<string> {
    const store = createWorkspaceStore({ project: { name: "Timeline", id: 1 }, place: "graph" });
    const session = await mount("graph", store);
    await session.project.open(await timedProject(), { discard: true });
    await userEvent.keyboard("{Shift>}T{/Shift}");
    const dock = await screen.findByRole("region", { name: "Table" });
    await userEvent.click(await within(dock).findByRole("tab", { name: "Edges" }));
    const table = await within(dock).findByRole("grid", { name: "Edges" });
    await waitFor(() => {
        assert.match(table.textContent, /[A-Z][a-z]{2} \d+, 202\d/);
    });
    const words = table.textContent;
    // Its settings open from the dock's settings button.
    await openTimelineSettings();
    return words;
}

/**
 * Opens the timeline dock from the toolbar's Timeline button, then its settings from the dock's
 * settings button, as a reader does.
 */
async function openTimelineSettings(): Promise<void> {
    const toggle = await screen.findByRole("button", { name: "Timeline" });
    if (toggle.getAttribute("aria-pressed") !== "true") {
        await userEvent.click(toggle);
    }
    const timeline = await screen.findByRole("region", { name: "Timeline" });
    await userEvent.click(within(timeline).getByRole("button", { name: "Timeline settings" }));
    await screen.findByTestId("time-card");
}

/**
 * The Data place.
 * @returns queries inside it.
 */
function dataPlace(): ReturnType<typeof within> {
    return within(screen.getByRole("region", { name: "Data place" }));
}

/**
 * The commands Quick actions lists for "time".
 * @returns the rows' words, once the palette has closed again.
 */
async function timeCommands(): Promise<string> {
    await userEvent.keyboard("{Control>}k{/Control}");
    await userEvent.type(await screen.findByPlaceholderText("Search commands"), "time");
    const words = screen.queryAllByRole("option").map((option) => option.textContent);
    await userEvent.keyboard("{Escape}");
    return words.join("|");
}

/**
 * What the Keyboard shortcuts dialog lists.
 * @returns the dialog's words, once it has closed again.
 */
async function shortcuts(): Promise<string> {
    await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Keyboard shortcuts/ }));
    const words = (await screen.findByRole("dialog", { name: "Keyboard shortcuts" })).textContent;
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
        assert.isNull(screen.queryByRole("dialog", { name: "Keyboard shortcuts" }));
    });
    return words;
}

/**
 * What Quick actions lists for a timed sample's name.
 * @returns the rows' words, once the palette has closed again.
 */
async function sampleCommands(): Promise<string> {
    await userEvent.keyboard("{Control>}k{/Control}");
    await userEvent.type(await screen.findByPlaceholderText("Search commands"), "Paper citations");
    const words = screen.queryAllByRole("option").map((option) => option.textContent);
    await userEvent.keyboard("{Escape}");
    return words.join("|");
}

/**
 * What a column's header menu offers as its role.
 * @param kind - nodes or edges.
 * @param name - the column.
 * @returns the roles' words, once the menu has closed again.
 */
async function headerRoles(kind: "node" | "edge", name: string): Promise<(string | null)[]> {
    await openColumnMenu(kind, name);
    await userEvent.hover(await screen.findByRole("menuitem", { name: "Role" }));
    const roles = (await screen.findAllByRole("menuitemradio")).map((item) => item.textContent);
    await userEvent.keyboard("{Escape}");
    await userEvent.keyboard("{Escape}");
    return roles;
}

/**
 * Opens a CSV of dated edges on the Data page (a drop, which a page cannot start any other way)
 * and reads what the `sent` column's role select offers.
 * @returns the options' words.
 */
async function loadRoles(): Promise<(string | null)[]> {
    const store = createWorkspaceStore({ project: { name: "Timeline", id: 1 } });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    act(() => {
        openDataPage(store, { intent: "new" });
    });
    const dataPage = await screen.findByRole("region", { name: "Data page" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([DATED_EDGES], "dated.csv"));
    for (const type of ["dragenter", "dragover", "drop"]) {
        dataPage.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
    await userEvent.click(await screen.findByRole("combobox", { name: "Role of sent" }));
    return (await screen.findAllByRole("option")).map((option) => option.textContent);
}

/** The commands of the timeline that have a key, as the Keyboard shortcuts dialog lists them. */
const TIME_KEYS = ["Timeline", "Step time back", "Step time forward", "Jump time to the start", "Jump time to the end"];

/** What Quick actions lists for the timeline. */
const TIME_COMMANDS = [
    "Step time back",
    "Step time forward",
    "Jump time to the start",
    "Jump time to the end",
    "Jump time to the selection",
    "Play or pause time",
];

describe("the timeline in the app", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("offers the timeline over a column of dates", async () => {
        const session = await open();

        await userEvent.click(await dataPlace().findByRole("button", { name: "Add to edge attributes" }));
        // "sent" reads as time: it leads Time's submenu.
        await userEvent.hover(await screen.findByRole("menuitem", { name: "Time" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^sent/ }));

        await screen.findByRole("button", { name: "Timeline" });
        assert.deepEqual(session.time.field, { edges: { start: "sent" } });

        await userEvent.click(await dataPlace().findByRole("button", { name: "Add filter" }));
        // The new card opens in the selection workspace: its Value list holds the filterable values.
        await userEvent.click(await screen.findByRole("button", { name: "Value" }));
        await screen.findAllByRole("option");
        assert.isNull(screen.queryByRole("option", { name: "Time window" }), "the window is no filter");
        await userEvent.keyboard("{Escape}");
        await openTimelineSettings();
        await screen.findByRole("radiogroup", { name: "Mode" });
        await userEvent.keyboard("{Escape}");

        const commands = await timeCommands();
        for (const label of TIME_COMMANDS) {
            assert.include(commands, label);
        }
        const listed = await shortcuts();
        for (const label of TIME_KEYS) {
            assert.include(listed, label);
        }
        assert.include(await sampleCommands(), "Paper citations");
        assert.include(await headerRoles("node", "team"), "Time");
        await columnVerb("node", "team", "Details");
        await userEvent.click(await screen.findByRole("button", { name: "Attribute actions" }));
        await screen.findByRole("menuitem", { name: "Set in Data" });
    });

    it("offers the time role on the Data page", async () => {
        assert.include(await loadRoles(), "Date or time (suggested)");
    });

    it("offers Set in Data in the Overview", async () => {
        await open("graph");
        const overview = within(screen.getByRole("complementary", { name: "Inspector" }));
        await overview.findByRole("button", { name: "Set in Data" });
    });

    it("reads a saved project's dates in its saved zone", async () => {
        assert.include(await savedDates(), "Dec 31, 2025");
        await screen.findByRole("radiogroup", { name: "Zone" });
    });

    it("shows a saved project's Timeline Hidden row", async () => {
        const session = await mount("graph");
        await session.project.open(await timedProject(), { discard: true });
        await waitFor(async () => {
            assert.include((await styleRows()).join(), "Timeline Hidden");
        });
        await screen.findByRole("button", { name: "Timeline" });
    });
});

describe("the timeline on a phone", () => {
    beforeAll(async () => {
        await page.viewport(390, 844);
    });

    /**
     * Opens the project saved with the timeline, with the dock asked for.
     * @returns the session.
     */
    async function openOnPhone(): Promise<GraphSession> {
        const store = createWorkspaceStore({ project: { name: "Phone", id: 1 }, place: "graph", timelineOpen: true });
        const session = await mount("graph", store);
        await session.project.open(await timedProject(), { discard: true });
        // The saved window is back (it narrows only the drawing).
        await waitFor(() => {
            assert.strictEqual(session.data.statistics().edgeCount, 4);
            assert.isNotNull(session.visibility.window);
        });
        return session;
    }

    it("moves the side panels aside for a saved project's dock", async () => {
        await openOnPhone();

        await screen.findByRole("region", { name: "Timeline" });

        assert.isNotNull(document.querySelector(".tl-phone"));
        assert.isNull(screen.queryByRole("complementary", { name: "Left panel" }));
    });
});
