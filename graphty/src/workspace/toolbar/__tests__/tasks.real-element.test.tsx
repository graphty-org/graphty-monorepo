/**
 * The tier 1 tasks this package delivers, each walked from the empty app on the REAL
 * graphty-element: T7 (rank nodes), T8 (find groups) and T11 (a readable layout), plus the View
 * flyout, the Legend and Table tools, and a node's neighborhood. Every assertion reads what the element reports, never pixels.
 *
 * Opening the sample goes through the element's own import by URL, as the Start screen package
 * will; until that package lands its sample cards are not drawn, so the walk calls the same door.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { RunId } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { readableName } from "../../style/words";
import { Workspace } from "../../Workspace";

/** A segmented control's visible label, which a reader presses: the radio itself is drawn invisible. */
function segment(radio: HTMLInputElement): HTMLElement {
    const label = radio.labels?.[0];
    assert.isDefined(label);
    return label;
}

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * A new, empty project, then Zachary's karate club opened through the element's
 * import, with the layout the element recommends for it.
 * @param place - the place to open on ("data" shows Filters), or the default one.
 * @returns the session, with the sample loaded.
 */
async function openKarate(place?: "data"): Promise<GraphSession> {
    render(<Workspace initialState={{ project: { name: "Untitled", id: 1 }, place }} />);
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
    await userEvent.click(await screen.findByRole("button", { name: /^Run\b/ }));
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

    it("Table on the toolbar opens the table dock and closes it; no Timeline without a time column", async () => {
        await openKarate();
        const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
        const table = within(toolbar).getByRole("button", { name: "Table" });
        assert.isNull(screen.queryByRole("region", { name: "Table" }));

        await userEvent.click(table);
        assert.isNotNull(await screen.findByRole("region", { name: "Table" }));
        assert.equal(table.getAttribute("aria-pressed"), "true");
        // Karate has no column with the time role, so the clock is not drawn.
        assert.isNull(within(toolbar).queryByRole("button", { name: "Timeline" }));

        await userEvent.click(table);
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "Table" }));
        });
    });

    it("T7: Analyze > PageRank runs, lands painted, and Analyze then offers to update its row", async () => {
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

        const steps = session.history.steps.length;
        // Picking it again revises the same row, so the button says so; with the settings the
        // layer already shows, pressing it would change nothing, so it is not offered.
        await userEvent.click(analyzeTool());
        const recent = await screen.findByRole("group", { name: "Recent" });
        await userEvent.click(within(recent).getByRole("option", { name: /^PageRank/ }));
        const update = await screen.findByRole("button", { name: "Update PageRank layer" });
        assert.strictEqual(update.getAttribute("aria-disabled"), "true");
        await userEvent.keyboard("{Enter}");
        assert.strictEqual(session.history.steps.length, steps, "pressing it records nothing");
        assert.isNotNull(screen.getByText("PageRank is up to date with these settings."));
        await userEvent.keyboard("{Escape}");
        assert.isNotNull(await screen.findByRole("combobox", { name: "Filter analyses" }));
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("combobox", { name: "Filter analyses" }));
        });
    });

    it("Analyze picks and runs from the keyboard alone: a single match on Enter, Arrow keys otherwise", async () => {
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
    });

    it("T8: after Betweenness, Analyze > Find groups > Louvain runs and paints", async () => {
        const session = await openKarate();

        // "brokers" finds Betweenness, the design's filter example.
        await analyze("brokers", "Betweenness");
        await finished(session, "betweenness");
        await analyze("communities", "Louvain");
        const louvain = await finished(session, "louvain");
        await waitFor(() => {
            assert.isAbove(session.runs.bindings(louvain).length, 0);
        });
    });

    it("a run whose folder of groups was deleted: the notice keeps its results, and Add Louvain layers puts it back without a rerun", async () => {
        const session = await openKarate();
        await analyze("communities", "Louvain");
        const louvain = await finished(session, "louvain");
        await waitFor(() => {
            assert.isAbove(session.runs.bindings(louvain).length, 0);
        });
        if (screen.queryByRole("tree", { name: "Style layers" }) === null) {
            await userEvent.click(screen.getByRole("button", { name: "Graph" }));
        }
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        // A grouping run's groups are layers in a folder named for it.
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Louvain, folder, / }));
        await userEvent.keyboard("{Delete}");
        await waitFor(() => {
            assert.isNull(within(tree).queryByRole("treeitem", { name: /^Louvain, folder, / }));
            assert.lengthOf(session.runs.bindings(louvain), 0);
        });
        // The toast; the workspace's status line speaks the same words.
        await screen.findByText("Deleted Louvain. Its results are kept.", { selector: ".cm-toast-message" });
        const computedAt = session.runs.get(louvain)?.startedAt;

        await userEvent.click(analyzeTool());
        await userEvent.type(await screen.findByRole("combobox", { name: "Filter analyses" }), "communities");
        await userEvent.click(await screen.findByRole("option", { name: /^Louvain/ }));
        const form = await screen.findByRole("form", { name: "Louvain" });
        await userEvent.click(within(form).getByRole("button", { name: "Add Louvain layers" }));
        // Nothing needs computing again, so the run settles once whatever Analyze asked of it has.
        await session.runs.get(louvain)?.then(
            () => undefined,
            () => undefined,
        );
        await session.styles.settled();
        assert.isAbove(session.runs.bindings(louvain).length, 0, "the run painted its layer again");
        assert.equal(session.runs.get(louvain)?.startedAt, computedAt, "restored from the stored result");
        await within(tree).findByRole("treeitem", { name: /^Louvain, folder, / }, { timeout: TIMEOUT_MS });
    });

    it("a run's layer, its key entry and its values go by the algorithm's name: Closeness, not Reach", async () => {
        const session = await openKarate();
        await analyze("Closeness", "Closeness");
        const closeness = await finished(session, "closeness");
        await waitFor(() => {
            assert.isAbove(session.runs.bindings(closeness).length, 0);
        });
        if (screen.queryByRole("tree", { name: "Style layers" }) === null) {
            await userEvent.click(screen.getByRole("button", { name: "Graph" }));
        }
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        await within(tree).findByRole(
            "treeitem",
            { name: /^Closeness, (node |edge |node and edge )?layer/ },
            { timeout: TIMEOUT_MS },
        );
        assert.notMatch(tree.textContent ?? "", /Reach/);
        const legend = await screen.findByRole("region", { name: "Legend" }, { timeout: TIMEOUT_MS });
        await within(legend).findByRole("group", { name: "Color: Closeness" });
        const names = session.data
            .readableValues()
            .filter((value) => value.runId === closeness)
            .map((value) => readableName(session, value).name);
        assert.include(names, "Closeness");
        assert.include(names, "Closeness rank (1 = highest)");
        assert.notInclude(names.join(), "Reach");
    });

    it("T11: the Layout popover shows the recommended layout and choosing another lays out again, one undo step", async () => {
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

        await userEvent.click(within(popover).getByRole("option", { name: /^Circle(?!s)/ }));
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
    });

    it("names the view mode on the View tool and offers 2D, 3D and VR or AR from its menu", async () => {
        const session = await openKarate();
        const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
        // Named with the mode it shows (WCAG 2.5.3).
        const view = within(toolbar).getByRole("button", { name: "View, 3D" });
        assert.equal(view.textContent, "3D");
        // No XR buttons on the canvas: the menu is the one way in.
        assert.isNull(document.querySelector("graphty-element .xr-button-container, .xr-button-container"));

        await userEvent.click(view);
        const menu = await screen.findByRole("menu", { name: /^View/ });
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
        // The workspace turns XR on (graphty-element leaves it off unless a page asks), so a
        // missing mode is the browser's answer, never "disabled".
        const { reasons } = session.capabilities.xr;
        assert.notEqual(reasons.vr, "disabled");
        assert.notEqual(reasons.ar, "disabled");

        await userEvent.click(twoD);
        await waitFor(() => {
            assert.equal(session.layout.dimension, "2d");
            assert.equal(view.textContent, "2D");
        });
        await userEvent.click(view);
        const flat = await screen.findByRole("menu", { name: /^View/ });
        // One row says why the camera views are gone, instead of four disabled ones.
        assert.isNull(within(flat).queryByRole("menuitem", { name: /^Front/ }));
        assert.include(within(flat).getByRole("menuitem", { name: /^Camera views/ }).textContent, "Only in 3D");
        assert.include(within(flat).getByRole("menuitemradio", { name: /^3D/ }).textContent, "5");
    });

    it("frames a selected edge's two ends with Frame selection, and disables it with nothing selected", async () => {
        const session = await openKarate();
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        if (element === null) {
            return;
        }
        // Frame selection frames the ends where they are when it is pressed, and the layout is
        // still moving them after the queue empties: wait for the drawing to stop.
        await element.waitForStableFrame();
        const view = within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", {
            name: /^View, /,
        });
        const frameRow = async (): Promise<HTMLElement> => {
            await userEvent.click(view);
            const menu = await screen.findByRole("menu", { name: /^View/ });
            return within(menu).getByRole("menuitem", { name: /^Frame selection/ });
        };

        assert.equal((await frameRow()).getAttribute("aria-disabled"), "true", "nothing selected");
        await userEvent.keyboard("{Escape}");

        const edge = session.data.edges()[0];
        await session.selection.apply({ edges: [edge.id] });
        assert.lengthOf(session.selection.nodes, 0, "only the edge is selected");
        const ends = { nodes: [edge.source, edge.target] };
        assert.notDeepEqual(
            element.resolveCameraPreset("fitToGraph", ends),
            element.resolveCameraPreset("fitToGraph"),
            "the ends frame differently",
        );

        const row = await frameRow();
        assert.notEqual(row.getAttribute("aria-disabled"), "true", "an edge is selected");
        await userEvent.click(row);
        await waitFor(
            () => {
                // Measured when compared, so a canvas resized by the inspector opening counts. From
                // the angle the camera looks from: framing keeps it.
                const expected = element.resolveCameraPreset("fitToGraph", { ...ends, params: { keepAngle: true } });
                const now = element.getCameraState();
                const { position, target } = expected;
                assert.isDefined(position);
                assert.isDefined(target);
                for (const axis of ["x", "y", "z"] as const) {
                    assert.closeTo(now.target?.[axis] ?? Number.NaN, target?.[axis] ?? 0, 1e-3, `target.${axis}`);
                }
                // The reported position carries the shift that centers the view on the part the
                // toolbar leaves free; the distance from what it looks at is the framing.
                const span = (axis: "x" | "y" | "z"): number => (position?.[axis] ?? 0) - (target?.[axis] ?? 0);
                assert.closeTo(now.cameraDistance ?? Number.NaN, Math.hypot(span("x"), span("y"), span("z")), 1e-3);
            },
            { timeout: 10_000 },
        );
    });

    it("says what f framed, by the node's name", async () => {
        const session = await openKarate();
        const node = session.data.nodes()[0].id;
        await session.selection.apply({ nodes: [node] });
        const name = session.data.name(node) ?? String(node);
        await userEvent.keyboard("f");
        // Said once the framing's camera animation (a second long) has finished.
        await waitFor(
            () => {
                assert.include(
                    screen.getAllByRole("status").map((status) => status.textContent),
                    `Framed ${name}`,
                );
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("switches to 2D with 5, and opens a node's neighborhood from its Degree row, reaches two hops and filters to it", async () => {
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
        await userEvent.click(segment(within(hops).getByRole<HTMLInputElement>("radio", { name: "2" })));
        await waitFor(() => {
            assert.isAbove(session.selection.nodes.length, neighborhood);
            assert.isNotNull(document.querySelector('[data-inspected="neighborhood"]'));
        });
        const grown = session.selection.nodes.length - 1;
        const heading = `${session.data.name(node) ?? String(node)} and ${String(grown)} connections`;
        const words = `${heading} within 2 hops`;
        await screen.findByRole("group", { name: heading });
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

        // Filter to neighbors adds one card keeping the same two hops.
        await userEvent.click(screen.getByRole("button", { name: "Filter to neighbors" }));
        await waitFor(() => {
            assert.deepEqual(
                session.visibility.conditions.map((c) => c.rule),
                [{ kind: "neighborhood", seeds: [node], depth: 2 }],
            );
            assert.equal(session.visibility.summary.visibleNodes, grown + 1);
        });
        // A command, not a toggle: pressed again it leaves the one card, on.
        await userEvent.click(screen.getByRole("button", { name: "Filter to neighbors" }), { force: true });
        await waitFor(() => {
            assert.deepEqual(
                session.visibility.conditions.map((c) => [c.on, c.rule]),
                [[true, { kind: "neighborhood", seeds: [node], depth: 2 }]],
            );
        });
    });

    it("Filter to neighbors pressed twice keeps one card on; its box in Filters turns it off and keeps it listed", async () => {
        const session = await openKarate("data");
        const node = session.data.nodes()[0].id;
        const name = session.data.name(node) ?? String(node);
        await session.selection.apply({ nodes: [node] });
        const degree = async (): Promise<void> => {
            const values = await screen.findByRole("group", { name: "Summary values" });
            await userEvent.click(within(values).getByRole("button", { name: /Degree/ }));
        };

        // Open at one hop, reach two, filter to it, twice.
        await degree();
        const hops = await screen.findByRole("radiogroup", { name: "Hops" });
        await userEvent.click(segment(within(hops).getByRole<HTMLInputElement>("radio", { name: "2" })));
        await waitFor(() => {
            assert.isTrue(
                screen.getAllByRole("status").some((status) => /within 2 hops$/.test(status.textContent ?? "")),
            );
        });
        const command = screen.getByRole("button", { name: "Filter to neighbors" });
        // A plain command: never drawn as pressed.
        assert.isNull(command.getAttribute("aria-pressed"));
        const grown = session.selection.nodes.length - 1;
        await userEvent.click(command);
        await waitFor(() => {
            assert.equal(session.visibility.summary.visibleNodes, grown + 1);
        });
        // Its card is on at this reach, so a second press would change nothing: the command is
        // drawn disabled, and its tooltip, still shown on hover, says why.
        await waitFor(() => {
            assert.equal(command.getAttribute("data-disabled"), "true");
            assert.equal(command.getAttribute("aria-disabled"), "true");
        });
        await userEvent.hover(command);
        await screen.findByText("The drawing already shows only this neighborhood. Its card in Filters turns it off");
        await userEvent.click(command, { force: true });
        await waitFor(() => {
            assert.deepEqual(
                session.visibility.conditions.map((c) => [c.on, c.rule]),
                [[true, { kind: "neighborhood", seeds: [node], depth: 2 }]],
            );
            assert.equal(session.visibility.summary.visibleNodes, grown + 1);
        });
        assert.isNull(command.getAttribute("aria-pressed"));

        // Back to the node, then its Degree row again: the list opens at the filter's two hops.
        await userEvent.click(screen.getByRole("button", { name: `Back to ${name}` }));
        await degree();
        const words = `${name} and ${String(grown)} connections`;
        await screen.findByRole("group", { name: words });
        const reopened = await screen.findByRole("radiogroup", { name: "Hops" });
        assert.isTrue(within(reopened).getByRole<HTMLInputElement>("radio", { name: "2" }).checked);
        // Reopened under its own filter, the command is still disabled.
        assert.equal(screen.getByRole("button", { name: "Filter to neighbors" }).getAttribute("data-disabled"), "true");
        assert.equal(session.selection.nodes.length, grown + 1);
        // The heading is drawn whole: wrapped, never cut.
        const heading = screen
            .getByRole("group", { name: words })
            .querySelector<HTMLElement>('[data-testid="control-section-name"]');
        assert.isNotNull(heading);
        assert.equal(heading?.scrollWidth, heading?.clientWidth);
        assert.isAtMost(heading?.scrollHeight ?? 0, heading?.clientHeight ?? 0);

        // The card's box in Filters turns it off: every node is drawn again, and the card stays
        // listed.
        const filters = within(screen.getByRole("region", { name: "Data place" })).getByRole("list", {
            name: "Filters",
        });
        const cardWords = `within 2 hops of ${name}`;
        await userEvent.click(within(filters).getByRole("checkbox", { name: `Apply ${cardWords}` }));
        await waitFor(() => {
            assert.equal(session.visibility.summary.visibleNodes, 34);
            assert.deepEqual(
                session.visibility.conditions.map((c) => c.on),
                [false],
            );
        });
        assert.isNotNull(within(filters).getByRole("listitem", { name: `${cardWords}, Hide` }));
        // With the card off, the command is enabled again.
        await waitFor(() => {
            assert.isNull(screen.getByRole("button", { name: "Filter to neighbors" }).getAttribute("data-disabled"));
        });

        // Pressed again, the command turns that same card back on.
        await userEvent.click(screen.getByRole("button", { name: "Filter to neighbors" }));
        await waitFor(() => {
            assert.deepEqual(
                session.visibility.conditions.map((c) => [c.on, c.rule]),
                [[true, { kind: "neighborhood", seeds: [node], depth: 2 }]],
            );
        });
    });

    it("opens Filters from the Graph place with the toolbar's Filters, its + list open", async () => {
        await openKarate();
        assert.isNull(screen.queryByRole("region", { name: "Data place" }));
        const filters = within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", {
            name: "Filters",
        });

        await userEvent.click(filters);
        await screen.findByRole("region", { name: "Data place" });
        await screen.findByRole("menuitem", { name: "Largest component" });
    });
});
it("shows and hides the legend and the table from their own toolbar buttons, pressed while showing", async () => {
    const session = await openKarate();
    const run = session.runs.start("pagerank");
    await run;
    await screen.findByRole("region", { name: "Legend" }, { timeout: TIMEOUT_MS });
    const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
    const legend = within(toolbar).getByRole("button", { name: "Legend" });
    const table = within(toolbar).getByRole("button", { name: "Table" });
    assert.equal(legend.getAttribute("aria-pressed"), "true");
    assert.equal(table.getAttribute("aria-pressed"), "false");
    assert.isNull(screen.queryByRole("region", { name: "Table" }));

    await userEvent.click(legend);
    await waitFor(() => {
        assert.isNull(screen.queryByRole("region", { name: "Legend" }));
    });
    assert.equal(legend.getAttribute("aria-pressed"), "false");
    await userEvent.click(legend);
    await screen.findByRole("region", { name: "Legend" });
    assert.equal(legend.getAttribute("aria-pressed"), "true");

    await userEvent.click(table);
    await screen.findByRole("region", { name: "Table" });
    assert.equal(table.getAttribute("aria-pressed"), "true");
    await userEvent.click(table);
    await waitFor(() => {
        assert.isNull(screen.queryByRole("region", { name: "Table" }));
    });
    assert.equal(table.getAttribute("aria-pressed"), "false");
});
