/**
 * The tier 1 tasks this package delivers, each walked from the empty app on the REAL
 * graphty-element: T7 (rank nodes), T8 (find groups) and T11 (a readable layout), plus the View
 * flyout and a node's neighborhood. Every assertion reads what the element reports, never pixels.
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
 * A new, empty project, then Zachary's karate club opened through the element's
 * import, with the layout the element recommends for it.
 * @returns the session, with the sample loaded.
 */
async function openKarate(): Promise<GraphSession> {
    render(<Workspace initialState={{ project: { name: "Untitled", id: 1 } }} />);
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
        assert.isFalse(analyzeTool().hasAttribute("aria-disabled"));
    });
    return loaded;
}

/**
 * The toolbar's Analyze tool. The Graph place's footer line carries an Analyze link too.
 * @returns the tool.
 */
function analyzeTool(): HTMLElement {
    return within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", { name: "Analyze" });
}

/**
 * Opens Analyze, filters, picks an entry and runs it with its defaults.
 * @param filter - what to type in Filter analyses.
 * @param entry - the entry's name.
 */
async function analyze(filter: string, entry: string): Promise<void> {
    await userEvent.click(analyzeTool());
    const box = await screen.findByRole("combobox", { name: "Filter analyses" });
    await userEvent.type(box, filter);
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(`^${entry}`) }));
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
            // The finished load is announced with its size, read from the element.
            await screen.findByText("Untitled: 34 nodes, 78 edges");

            await analyze("PageRank", "PageRank");
            // Running closes the popover; a screen reader hears the run start, then, on the same
            // line, that it finished (on Karate it may already have).
            await waitFor(() => {
                assert.isNull(screen.queryByRole("combobox", { name: "Filter analyses" }));
            });
            assert.isNotNull(screen.getByText(/^PageRank (added, running|finished)$/));
            // Focus goes back to Analyze, not to the page.
            await waitFor(() => {
                assert.equal(document.activeElement, analyzeTool());
            });

            const runId = await finished(session, "pagerank");
            await screen.findByText("PageRank finished");
            // The run's suggested style landed as a layer bound to the run: it paints.
            await waitFor(() => {
                assert.isAbove(session.runs.bindings(runId).length, 0);
            });

            // Picking it again revises the same row, so the button says so.
            await userEvent.click(analyzeTool());
            const recent = await screen.findByRole("group", { name: "Recent" });
            await userEvent.click(within(recent).getByRole("option", { name: /^PageRank/ }));
            assert.isNotNull(await screen.findByRole("button", { name: "Update PageRank row" }));
            await userEvent.keyboard("{Escape}");
            assert.isNotNull(await screen.findByRole("combobox", { name: "Filter analyses" }));
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.isNull(screen.queryByRole("combobox", { name: "Filter analyses" }));
            });
        },
        TIMEOUT_MS,
    );

    it(
        "Analyze picks and runs from the keyboard alone: a single match on Enter, Arrow keys otherwise",
        async () => {
            const session = await openKarate();

            // A single match: typing then Enter opens it, and Enter again runs it.
            await userEvent.click(analyzeTool());
            await userEvent.type(await screen.findByRole("combobox", { name: "Filter analyses" }), "brokers{Enter}");
            assert.isNotNull(await screen.findByRole("form", { name: /^Betweenness/ }));
            await userEvent.keyboard("{Enter}");
            await finished(session, "betweenness");

            // No filter: ArrowDown moves the active entry, ArrowUp moves it back, Enter opens it.
            await userEvent.click(analyzeTool());
            const box = await screen.findByRole("combobox", { name: "Filter analyses" });
            assert.isNull(box.getAttribute("aria-activedescendant"));
            await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowUp}");
            const options = screen.getAllByRole("option");
            const activeId = box.getAttribute("aria-activedescendant");
            assert.equal(activeId, options[1].id);
            assert.equal(options[1].getAttribute("aria-selected"), "true");
            assert.equal(document.activeElement, box);
            const name = within(options[1]).getAllByText(/./)[0].textContent ?? "";
            await userEvent.keyboard("{Enter}");
            assert.isNotNull(await screen.findByRole("form", { name }));
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
            // The sample opened on the layout the element recommends: checked, and the list says so.
            const current = within(popover)
                .getAllByRole("option")
                .find((row) => row.getAttribute("aria-selected") === "true");
            assert.include(current?.textContent, "Recommended");

            await userEvent.click(within(popover).getByRole("option", { name: /^Circle/ }));
            await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
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
        "names the view mode on the View tool and offers 2D, 3D and VR or AR from its menu",
        async () => {
            const session = await openKarate();
            const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
            const view = within(toolbar).getByRole("button", { name: "View" });
            assert.equal(view.textContent, "3D");
            // No XR buttons on the canvas: the menu is the one way in.
            assert.isNull(document.querySelector("graphty-element .xr-button-container, .xr-button-container"));

            await userEvent.click(view);
            const menu = await screen.findByRole("menu", { name: "View" });
            const twoD = within(menu).getByRole("menuitemradio", { name: /^2D/ });
            const threeD = within(menu).getByRole("menuitemradio", { name: /^3D/ });
            assert.equal(threeD.getAttribute("aria-checked"), "true");
            // Key 5 is shown on the row it switches to, not on the current one.
            assert.include(twoD.textContent, "5");
            assert.notInclude(threeD.textContent, "5");
            // Without a headset (the test browser), VR and AR are drawn, disabled, with a reason.
            await waitFor(() => {
                const xr = within(menu)
                    .getAllByRole("menuitemradio")
                    .filter((row) => /^(VR|AR)/.test(row.textContent));
                assert.isAbove(xr.length, 0);
                for (const row of xr) {
                    assert.equal(row.getAttribute("aria-disabled"), "true");
                    assert.notInclude(row.textContent, "Checking");
                }
            });
            assert.isNotNull(within(menu).getByRole("menuitem", { name: /^Front/ }));

            await userEvent.click(twoD);
            await waitFor(() => {
                assert.equal(session.layout.dimension, "2d");
                assert.equal(view.textContent, "2D");
            });
            await userEvent.click(view);
            const flat = await screen.findByRole("menu", { name: "View" });
            // One row says why the camera views are gone, instead of four disabled ones.
            assert.isNull(within(flat).queryByRole("menuitem", { name: /^Front/ }));
            assert.include(within(flat).getByRole("menuitem", { name: /^Camera views/ }).textContent, "Only in 3D");
            assert.include(within(flat).getByRole("menuitemradio", { name: /^3D/ }).textContent, "5");
        },
        TIMEOUT_MS,
    );

    it(
        "switches to 2D with 5, and opens a node's neighborhood from its Degree row, reaches two hops and filters to it",
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
            // A selection changes nothing about the toolbar: no bar appears above it.
            const values = await screen.findByRole("group", { name: "Summary values" });
            assert.isNull(screen.queryByRole("toolbar", { name: "Selection" }));

            await userEvent.click(within(values).getByRole("button", { name: /Degree/ }));
            let neighborhood = 0;
            await waitFor(() => {
                neighborhood = session.selection.nodes.length;
                assert.isAbove(neighborhood, 1);
                // The inspector shows the node's neighborhood, not a plain selection.
                assert.isNotNull(document.querySelector('[data-inspected="neighborhood"]'));
            });

            // Hops 2 in the list's header reselects two hops out and relists; the list, the
            // selection and the status line agree on the count.
            const hops = await screen.findByRole("radiogroup", { name: "Hops" });
            await userEvent.click(within(hops).getByRole("radio", { name: "2" }));
            await waitFor(() => {
                assert.isAbove(session.selection.nodes.length, neighborhood);
                assert.isNotNull(document.querySelector('[data-inspected="neighborhood"]'));
            });
            const grown = session.selection.nodes.length - 1;
            const words = `${String(grown)} nodes within 2 hops of ${String(node)}`;
            await screen.findByRole("region", { name: words });
            await waitFor(() => {
                assert.include(
                    screen.getAllByRole("status").map((status) => status.textContent),
                    words,
                );
            });
            // Karate is undirected, so there is no way to choose to follow.
            assert.isNull(screen.queryByRole("radiogroup", { name: "Follow" }));
            // The neighborhood has one home: no Grow by one hop in its "...".
            await userEvent.click(screen.getByRole("button", { name: "Neighborhood actions" }));
            await screen.findByRole("menuitem", { name: /Frame selection/ });
            assert.isNull(screen.queryByRole("menuitem", { name: /Grow by one hop/ }));
            await userEvent.keyboard("{Escape}");

            // Filter to neighbors adds one step keeping the same two hops.
            await userEvent.click(screen.getByRole("button", { name: "Filter to neighbors" }));
            await waitFor(() => {
                assert.deepEqual(
                    session.visibility.steps.map((step) => step.rule),
                    [{ kind: "neighborhood", seeds: [node], depth: 2 }],
                );
                assert.equal(session.visibility.summary.visibleNodes, grown + 1);
            });
        },
        TIMEOUT_MS,
    );
});
