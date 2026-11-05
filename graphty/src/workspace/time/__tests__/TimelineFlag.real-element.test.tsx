/**
 * The timeline behind its experiment, on the real element: with it off a reader finds no trace of
 * it over a graph with a column of dates, or in a project saved with it on, and the same clicks
 * find it with it on. A window that project saved still applies, so the reader sees it and clears it.
 */

import "@graphty/graphty-element";

import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import { act } from "react";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { columnVerb, openColumnMenu } from "../../../test/column-header";
import { siteFeatures } from "../../../test/siteFeatures";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { openDataPage } from "../../data-page/request";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Every edge carries its `sent` date. */
const OFFICE_EMAIL = `${import.meta.env.BASE_URL}samples/office-email.json`;

/** Four edges, a day apart. */
const DATED_EDGES = "source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,2026-01-03\nD,A,2026-01-04\n";
const FIRST_TWO_DAYS = { from: Date.UTC(2026, 0, 1), to: Date.UTC(2026, 0, 3) };

/**
 * A project saved with the timeline on: a time field, its Ghost row, playback and a window.
 * @returns the file's text.
 */
async function timedProject(): Promise<string> {
    const saved = createGraphSession({ features: ["timeline"] });
    await saved.data.import({ type: "csv", config: { data: DATED_EDGES } });
    await saved.config.set({ startingRows: true });
    await saved.time.setField({ edges: { start: "sent", unit: "ms" } });
    await saved.time.setSettings({ mode: "cumulative", outside: "ghost" });
    await saved.time.window(FIRST_TWO_DAYS);
    const { text } = await saved.project.save();
    saved.dispose();
    return text;
}

/**
 * Renders the workspace.
 * @param place - the place it opens on.
 * @returns the session.
 */
async function mount(place: "graph" | "data"): Promise<GraphSession> {
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
 * The samples the main menu's Open sample list offers.
 * @returns the items' words, once the menu has closed again.
 */
async function menuSamples(): Promise<string> {
    await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
    await userEvent.hover(await screen.findByRole("menuitem", { name: "Open sample" }));
    await screen.findByRole("menuitem", { name: /Les Miserables/ });
    const words = screen.getAllByRole("menuitem").map((item) => item.textContent);
    await userEvent.keyboard("{Escape}");
    await userEvent.keyboard("{Escape}");
    return words.join("|");
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
    "Play or pause time",
];

describe("the timeline's switch in the app", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("shows no timeline with the experiment off, and the data stays", async () => {
        await siteFeatures([]);
        const session = await open();
        assert.deepEqual(session.features.enabled, []);
        await waitFor(() => {
            assert.isAbove(session.data.statistics().edgeCount, 0);
        });

        await userEvent.click(await dataPlace().findByRole("button", { name: "Add to node attributes" }));
        const offered = (await screen.findAllByRole("menuitem")).map((item) => item.textContent);
        assert.include(offered, "City");
        assert.notInclude(offered, "Time", "no Time in Fields");
        await userEvent.keyboard("{Escape}");

        assert.isNull(screen.queryByRole("region", { name: "Timeline" }), "no dock");
        assert.isNull(screen.queryByRole("button", { name: "Timeline" }), "no toolbar button");
        assert.isNull(screen.queryByRole("button", { name: /^Time: / }), "no header chip");

        await userEvent.click(await dataPlace().findByRole("button", { name: "Add filter" }));
        await screen.findAllByRole("option");
        assert.isNull(screen.queryByRole("option", { name: "Time window" }), "no Filters entry");
        await userEvent.keyboard("{Escape}");

        // The timeline's key does nothing.
        await userEvent.keyboard("t");
        assert.isNull(screen.queryByRole("region", { name: "Timeline" }));
        assert.include(
            session.data.attributes().map((each) => each.name),
            "sent",
        );

        const listed = await shortcuts();
        assert.include(listed, "Quick actions", "the dialog lists the other commands");
        for (const label of TIME_KEYS) {
            assert.notInclude(listed, label);
        }
        assert.notInclude(await menuSamples(), "Paper citations");
        assert.notInclude(await sampleCommands(), "Paper citations");
    });

    it("offers the same reader the timeline with the experiment on", async () => {
        await siteFeatures(["timeline"]);
        const session = await open();
        assert.deepEqual(session.features.enabled, ["timeline"]);

        await userEvent.click(await dataPlace().findByRole("button", { name: "Add to edge attributes" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Time" }));
        await userEvent.click(await screen.findByRole("option", { name: "sent" }));

        await screen.findByRole("button", { name: "Timeline" });
        assert.deepEqual(session.time.field, { edges: { start: "sent" } });

        await userEvent.click(await dataPlace().findByRole("button", { name: "Add filter" }));
        await screen.findByRole("option", { name: "Time window" });
        await userEvent.keyboard("{Escape}");

        const commands = await timeCommands();
        for (const label of TIME_COMMANDS) {
            assert.include(commands, label);
        }
        const listed = await shortcuts();
        for (const label of TIME_KEYS) {
            assert.include(listed, label);
        }
        assert.include(await menuSamples(), "Paper citations");
        assert.include(await sampleCommands(), "Paper citations");
        assert.include(await headerRoles("node", "team"), "Time");
        await columnVerb("node", "team", "Details");
        await userEvent.click(await screen.findByRole("button", { name: "Attribute actions" }));
        await screen.findByRole("menuitem", { name: "Set in Data" });
    });

    it("offers no time role on the Data page with the experiment off", async () => {
        await siteFeatures([]);
        assert.notInclude(await loadRoles(), "Date or time");
    });

    it("offers no time role in a header with the experiment off", async () => {
        await siteFeatures([]);
        await open();
        assert.notInclude(await headerRoles("edge", "sent"), "Time");
    });

    it("offers the time role on the Data page with the experiment on", async () => {
        await siteFeatures(["timeline"]);
        assert.include(await loadRoles(), "Date or time (suggested)");
    });

    it("offers nothing that works the timeline over a project's time field with the experiment off", async () => {
        await siteFeatures([]);
        const session = await mount("data");
        await session.project.open(await timedProject(), { discard: true });
        await waitFor(() => {
            assert.strictEqual(session.visibility.summary.visibleEdges, 2);
        });

        await userEvent.click(await dataPlace().findByRole("button", { name: "Add filter" }));
        await screen.findAllByRole("option");
        assert.isNull(screen.queryByRole("option", { name: "Time window" }), "no Filters entry");
        await userEvent.keyboard("{Escape}");

        const commands = await timeCommands();
        for (const label of TIME_COMMANDS) {
            assert.notInclude(commands, label);
        }

        await columnVerb("edge", "sent", "Details");
        await userEvent.click(await screen.findByRole("button", { name: "Attribute actions" }));
        await screen.findAllByRole("menuitem");
        assert.isNull(screen.queryByRole("menuitem", { name: "Set in Data" }), "no column verb");
    });

    it("offers Set in Data in the Overview with the experiment on", async () => {
        await siteFeatures(["timeline"]);
        await open("graph");
        const overview = within(screen.getByRole("complementary", { name: "Inspector" }));
        await overview.findByRole("button", { name: "Set in Data" });
    });

    it("offers no Set in Data in the Overview with the experiment off", async () => {
        await siteFeatures([]);
        await open("graph");
        const overview = within(screen.getByRole("complementary", { name: "Inspector" }));
        await overview.findByText("Direction");
        assert.isNull(overview.queryByRole("button", { name: "Set in Data" }));
    });

    it("shows nothing of a project saved with the timeline, and lets the reader clear its window", async () => {
        await siteFeatures([]);
        const session = await mount("graph");
        const report = await session.project.open(await timedProject(), { discard: true });
        assert.isNotEmpty(report.problems);
        await waitFor(() => {
            assert.strictEqual(session.visibility.summary.visibleEdges, 2);
        });

        assert.notInclude((await styleRows()).join(), "Ghost");
        assert.isNull(screen.queryByRole("region", { name: "Timeline" }), "no dock");
        assert.isNull(screen.queryByRole("button", { name: "Timeline" }), "no toolbar button");
        assert.isNull(screen.queryByRole("button", { name: /^Time: / }), "no header chip");
        await userEvent.keyboard("t");
        assert.isNull(screen.queryByRole("region", { name: "Timeline" }), "no key");

        await screen.findByRole("button", { name: /^Filter: .*"Time window"/ });
        await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
        await waitFor(() => {
            assert.isNull(session.visibility.window);
            assert.strictEqual(session.visibility.summary.visibleEdges, 4);
            assert.isNull(screen.queryByRole("button", { name: "Clear filters" }));
        });
    });

    it("shows the same project's Ghost row with the experiment on", async () => {
        await siteFeatures(["timeline"]);
        const session = await mount("graph");
        await session.project.open(await timedProject(), { discard: true });
        await waitFor(async () => {
            assert.include((await styleRows()).join(), "Ghost");
        });
        await screen.findByRole("button", { name: "Timeline" });
    });
});
