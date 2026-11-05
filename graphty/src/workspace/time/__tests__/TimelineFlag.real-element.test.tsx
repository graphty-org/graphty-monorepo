/**
 * The timeline behind its experiment, on the real element: with it off a reader finds no trace of
 * it over a graph with a column of dates, or in a project saved with it on, and the same clicks
 * find it with it on. A window that project saved still applies, so the reader sees it and clears it.
 */

import "@graphty/graphty-element";

import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { siteFeatures } from "../../../test/siteFeatures";
import { render, screen, waitFor, within } from "../../../test/test-utils";
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

        await userEvent.click(await dataPlace().findByRole("button", { name: "Add to node fields" }));
        const offered = (await screen.findAllByRole("menuitem")).map((item) => item.textContent);
        assert.include(offered, "City");
        assert.notInclude(offered, "Time", "no Time in Fields");
        await userEvent.keyboard("{Escape}");

        assert.isNull(screen.queryByRole("region", { name: "Timeline" }), "no dock");
        assert.isNull(screen.queryByRole("button", { name: "Timeline" }), "no toolbar button");
        assert.isNull(screen.queryByRole("button", { name: /^Time: / }), "no header chip");

        await userEvent.click(await dataPlace().findByRole("button", { name: "Add filter" }));
        await screen.findAllByRole("menuitem");
        assert.isNull(screen.queryByRole("menuitem", { name: "Time window" }), "no Filters entry");
        await userEvent.keyboard("{Escape}");

        // The timeline's key does nothing.
        await userEvent.keyboard("t");
        assert.isNull(screen.queryByRole("region", { name: "Timeline" }));
        assert.include(
            session.data.attributes().map((each) => each.name),
            "sent",
        );
    });

    it("offers the same reader the timeline with the experiment on", async () => {
        await siteFeatures(["timeline"]);
        const session = await open();
        assert.deepEqual(session.features.enabled, ["timeline"]);

        await userEvent.click(await dataPlace().findByRole("button", { name: "Add to edge fields" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Time" }));
        await userEvent.click(await screen.findByRole("option", { name: "sent" }));

        await screen.findByRole("region", { name: "Timeline" });
        assert.deepEqual(session.time.field, { edges: { start: "sent" } });
        await screen.findByRole("button", { name: "Timeline" });

        await userEvent.click(await dataPlace().findByRole("button", { name: "Add filter" }));
        await screen.findByRole("menuitem", { name: "Time window" });
    });

    it("offers Set as time in the Overview with the experiment on", async () => {
        await siteFeatures(["timeline"]);
        await open("graph");
        const overview = within(screen.getByRole("complementary", { name: "Inspector" }));
        await overview.findByRole("button", { name: "Set as time" });
    });

    it("offers no Set as time in the Overview with the experiment off", async () => {
        await siteFeatures([]);
        await open("graph");
        const overview = within(screen.getByRole("complementary", { name: "Inspector" }));
        await overview.findByText("Direction");
        assert.isNull(overview.queryByRole("button", { name: "Set as time" }));
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
        await screen.findByRole("region", { name: "Timeline" });
    });
});
