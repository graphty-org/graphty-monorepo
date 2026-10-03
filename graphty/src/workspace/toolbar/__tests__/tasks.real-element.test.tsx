/**
 * The tier 1 tasks this package delivers, each walked from the empty app on the REAL
 * graphty-element: T7 (rank nodes), T8 (find groups) and T11 (a readable layout), plus the View
 * flyout and the selection bar. Every assertion reads what the element reports, never pixels.
 *
 * Opening the sample goes through the element's own import by URL, as the Start screen package
 * will; until that package lands its sample cards are not drawn, so the walk calls the same door.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { RunId } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * From the empty app: New project, then Zachary's karate club opened through the element's
 * import, with the layout the element recommends for it.
 * @returns the session, with the sample loaded.
 */
async function openKarate(): Promise<GraphSession> {
    render(<Workspace />);
    await userEvent.click(screen.getByRole("button", { name: "New project" }));
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
    await session.data.import({ config: { url: "/samples/karate.gml" } }, { layout: "recommended" });
    const loaded = session;
    await waitFor(() => {
        assert.equal(loaded.data.statistics().nodeCount, 34);
        assert.equal(screen.getByRole("button", { name: "Analyze" }).getAttribute("aria-disabled"), "false");
    });
    return loaded;
}

/**
 * Opens Analyze, filters, picks an entry and runs it with its defaults.
 * @param filter - what to type in Filter analyses.
 * @param entry - the entry's name.
 */
async function analyze(filter: string, entry: string): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: "Analyze" }));
    const box = await screen.findByRole("searchbox", { name: "Filter analyses" });
    await userEvent.type(box, filter);
    await userEvent.click(await screen.findByRole("button", { name: new RegExp(`^${entry}`) }));
    await userEvent.click(await screen.findByRole("button", { name: "Run" }));
}

/**
 * Waits for the run of an algorithm to finish.
 * @param session - the session.
 * @param algorithm - the algorithm key.
 * @returns the run's id (not the run: a run is awaitable, so returning it would await its result).
 */
async function finished(session: GraphSession, algorithm: string): Promise<RunId> {
    let found: RunId | undefined;
    await waitFor(
        () => {
            const run = session.runs.list().find((r) => r.algorithm === algorithm);
            assert.equal(run?.status, "succeeded");
            found = run?.id;
        },
        { timeout: TIMEOUT_MS },
    );
    if (found === undefined) {
        throw new Error(`no ${algorithm} run`);
    }
    return found;
}

describe("tier 1 tasks from the toolbar, on the real element", () => {
    // The design's frame, 1366 x 768. At the runner's default 414 px the panels leave the canvas
    // no width, the toolbar is clipped, and Mantine hides a popover whose anchor is hidden.
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it(
        "T7: Analyze > PageRank runs, lands painted, and Analyze then offers to update its row",
        async () => {
            const session = await openKarate();

            await analyze("PageRank", "PageRank");
            // Running closes the popover; a screen reader hears the run start.
            await waitFor(() => {
                assert.isNull(screen.queryByRole("searchbox", { name: "Filter analyses" }));
            });
            assert.isNotNull(screen.getByText("PageRank added, running"));

            const runId = await finished(session, "pagerank");
            // The run's suggested style landed as a layer bound to the run: it paints.
            await waitFor(() => {
                assert.isAbove(session.runs.bindings(runId).length, 0);
            });

            // Picking it again revises the same row, so the button says so.
            await userEvent.click(screen.getByRole("button", { name: "Analyze" }));
            const recent = await screen.findByRole("region", { name: "Recent" });
            await userEvent.click(within(recent).getByRole("button", { name: /^PageRank/ }));
            assert.isNotNull(await screen.findByRole("button", { name: "Update PageRank row" }));
            await userEvent.keyboard("{Escape}");
            assert.isNotNull(await screen.findByRole("searchbox", { name: "Filter analyses" }));
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.isNull(screen.queryByRole("searchbox", { name: "Filter analyses" }));
            });
        },
        TIMEOUT_MS,
    );

    it(
        "T8: after Betweenness, Analyze > Find groups > Louvain runs and paints",
        async () => {
            const session = await openKarate();

            // "brokers" finds Betweenness, the design's filter example.
            await analyze("brokers", "Betweenness");
            await finished(session, "betweenness");
            await analyze("communities", "Louvain");
            const louvain = await finished(session, "louvain");
            await waitFor(() => {
                assert.isAbove(session.runs.bindings(louvain).length, 0);
            });
        },
        TIMEOUT_MS,
    );

    it(
        "T11: the Layout popover shows the recommended layout and choosing another lays out again, one undo step",
        async () => {
            const session = await openKarate();
            const before = session.layout.id;

            await userEvent.click(screen.getByRole("button", { name: "Layout" }));
            // The graph's inspector shows the same group; this one is the popover's.
            const popover = await screen.findByRole("dialog", { name: "Layout" });
            const method = within(popover).getByRole("combobox", { name: "Method" });
            // The sample opened on the layout the element recommends, and the group says so.
            assert.match((method as HTMLInputElement).value, / - Recommended$/);

            await userEvent.click(method);
            await userEvent.click(await within(popover).findByRole("option", { name: /^Circle/ }));
            await waitFor(() => {
                assert.equal(session.layout.id, "circular");
            });

            // Re-run layout, from Quick actions, lays the same method out again.
            await userEvent.keyboard("{Escape}");
            const { generation } = session.positions;
            await userEvent.keyboard("{Control>}k{/Control}");
            await userEvent.click(await screen.findByRole("option", { name: /Re-run layout/ }));
            await waitFor(() => {
                assert.notEqual(session.positions.generation, generation);
            });
            assert.equal(session.layout.id, "circular");

            // Undo takes back the re-run, then the change of method.
            await session.undo();
            await session.undo();
            assert.equal(session.layout.id, before);
        },
        TIMEOUT_MS,
    );

    it(
        "switches to 2D with 5, and selects a node's neighbors from the selection bar",
        async () => {
            const session = await openKarate();

            // The graph's inspector holds the Layout group, whose closed Select stays mounted; a
            // single-key shortcut must still fire beside it.
            await userEvent.keyboard("5");
            await waitFor(() => {
                assert.equal(session.layout.dimension, "2d");
            });

            const node = session.data.nodes()[0].id;
            await session.selection.apply({ nodes: [node] });
            const bar = await screen.findByRole("toolbar", { name: "Selection" });
            await userEvent.click(within(bar).getByRole("button", { name: "Neighborhood" }));
            await waitFor(() => {
                assert.isAbove(session.selection.nodes.length, 1);
            });
        },
        TIMEOUT_MS,
    );
});
