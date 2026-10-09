/**
 * The Graph place on the REAL graphty-element, from the empty app: task T12's find (typing a name
 * that differs from the id fills the list before Enter; a pick selects the node and opens it in
 * the inspector, by mouse and by keyboard alone), and the paint tree after runs (a run row lands
 * on top, its eye switches its layers off and on as one undo step, Delete removes it with Undo).
 * Every assertion reads what the element reports or what the page shows, never canvas pixels.
 *
 * The graph goes in through the element's session: loading a file is the Start screen's and the
 * Data page's, and the karate sample has no names to find by.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent as realInput } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { addLabelRow } from "../../style/row";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** Numeric ids, as karate's are, with names that differ from them. */
const NAMES = ["Mr Hi", "Officer", "Ada", "Bea", "Cy", "Dot", "Eve", "Flo", "Gus", "Hal"];
const NODES = NAMES.map((name, i) => ({ id: i + 1, name, club: i < 5 ? "Mr Hi" : "Officer" }));
const EDGES = [
    ...[1, 2, 3, 4, 5].map((n) => ({ source: n, target: (n % 5) + 1 })),
    ...[6, 7, 8, 9, 10].map((n) => ({ source: n, target: ((n - 5) % 5) + 6 })),
    { source: 1, target: 2 },
    { source: 2, target: 6 },
];

/**
 * A new, empty project, then the graph added through the element's session.
 * @returns the session and the chrome store.
 */
async function openGraph(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
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
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    return { session, store };
}

/**
 * The paint tree's rows, top first, by name.
 * @returns the names.
 */
function treeRows(): string[] {
    const tree = screen.getByRole("tree", { name: "Paint tree" });
    return within(tree)
        .getAllByRole("treeitem")
        .map((row) => row.getAttribute("aria-label") ?? "");
}

/**
 * A menu's command names, without their keys and reasons.
 * @param items - the menu items.
 * @returns the names.
 */
function menuLabels(items: HTMLElement[]): string[] {
    return items.map((item) => /^(Rename|Move up|Move down|Delete)/.exec(item.textContent)?.[0] ?? "");
}

describe("the Graph place on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "finds a node by a name that differs from its id while typing, and a pick selects and inspects it (T12)",
        async () => {
            const { session, store } = await openGraph();

            const box = screen.getByRole("combobox", { name: "Find" });
            await userEvent.type(box, "offic");
            // The list fills while typing, before any Enter, and nothing is selected yet.
            const list = await screen.findByRole("listbox", { name: "Find results" });
            const hit = within(list).getByRole("option", { name: /name: Officer/ });
            assert.isNotNull(hit);
            assert.equal(session.selection.size, 0);
            assert.equal(document.activeElement, box, "focus stays in the box");

            await userEvent.click(hit);
            await waitFor(() => {
                assert.isTrue(session.selection.has(2));
            });
            assert.isNull(store.get().inspected, "the inspector shows what is selected");
            assert.isNull(screen.queryByRole("listbox", { name: "Find results" }));
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "finds and picks with the keyboard alone: / focuses, Down enters the list, Enter picks (T12)",
        async () => {
            const { session, store } = await openGraph();

            (document.activeElement as HTMLElement | null)?.blur();
            await userEvent.keyboard("/");
            const box = screen.getByRole("combobox", { name: "Find" });
            await waitFor(() => {
                assert.equal(document.activeElement, box);
            });
            await userEvent.keyboard("Eve");
            await screen.findByRole("listbox", { name: "Find results" });
            await userEvent.keyboard("{ArrowDown}");
            const active = box.getAttribute("aria-activedescendant");
            assert.isNotNull(active);
            assert.match(document.getElementById(active ?? "")?.textContent ?? "", /Eve/);
            await userEvent.keyboard("{Enter}");
            await waitFor(() => {
                assert.isTrue(session.selection.has(7));
            });
            assert.isNull(store.get().inspected, "the inspector shows what is selected");
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "a click on a drawn name selects that node and opens it in the inspector",
        async () => {
            const { session } = await openGraph();
            const element = document.querySelector("graphty-element");
            assert.isNotNull(element);
            if (element === null) {
                return;
            }
            // Names on, as the Style tab's Label line or a column's Add label line draws them.
            await addLabelRow(session, { kind: "node", name: "name" });
            await element.waitForStableFrame();
            // A point on Officer's name: above the sphere's drawn disc, where the name sits, the
            // first one that answers Officer. Off the disc, only the name can.
            const nameAt = (): { x: number; y: number } | undefined => {
                const at = element.nodeScreenPosition(2);
                if (at?.visible !== true) {
                    return undefined;
                }
                for (let up = Math.ceil(at.radius) + 2; up < at.radius + 120; up++) {
                    const point = { x: at.x, y: at.y - up };
                    if (element.elementAt(point)?.id === 2) {
                        return point;
                    }
                }
                return undefined;
            };
            let point: { x: number; y: number } | undefined;
            await waitFor(
                () => {
                    point = nameAt();
                    assert.isDefined(point, "a point above Officer's sphere answers Officer");
                },
                { timeout: TIMEOUT_MS },
            );

            await realInput.click(element, { position: point });
            await waitFor(() => {
                assert.deepEqual([...session.selection.nodes], [2]);
            });
            const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
            const values = await inspector.findByRole("tab", { name: "Values" });
            assert.equal(values.getAttribute("aria-selected"), "true");
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "leaves the camera alone for a pick already on screen, and turns it to one off screen",
        async () => {
            const { session } = await openGraph();
            const element = document.querySelector("graphty-element");
            assert.isNotNull(element);
            if (element === null) {
                return;
            }
            // The element's own framing after the layout settles has landed: two reads apart agree.
            let last = "";
            await waitFor(
                async () => {
                    const now = JSON.stringify(element.getCameraState());
                    await new Promise((resolve) => setTimeout(resolve, 300));
                    const same = now === last && now === JSON.stringify(element.getCameraState());
                    last = now;
                    assert.isTrue(same && element.nodeScreenPosition(7)?.visible === true);
                },
                { timeout: TIMEOUT_MS, interval: 50 },
            );
            const pick = async (name: string, id: number): Promise<void> => {
                const box = screen.getByRole("combobox", { name: "Find" });
                await userEvent.type(box, name);
                const list = await screen.findByRole("listbox", { name: "Find results" });
                await userEvent.click(within(list).getAllByRole("option", { name: new RegExp(name) })[0]);
                await waitFor(() => {
                    assert.isTrue(session.selection.has(id));
                });
                // Long enough for a camera turn to have landed.
                // eslint-disable-next-line local/no-test-timing -- fixed sleep, to become a wait on the condition it stands in for, tracked in #1636
                await new Promise((resolve) => setTimeout(resolve, 300));
            };

            const before = JSON.stringify(element.getCameraState());
            await pick("Eve", 7);
            assert.equal(JSON.stringify(element.getCameraState()), before, "a pick on screen moves nothing");

            // Turned away from the graph, a pick brings the node back into view.
            const away = element.getCameraState();
            await element.setCameraState({ ...away, target: { x: 500, y: 500, z: 500 } });
            await waitFor(() => {
                assert.isFalse(element.nodeScreenPosition(4)?.visible);
            });
            await pick("Bea", 4);
            await waitFor(() => {
                assert.isTrue(element.nodeScreenPosition(4)?.visible);
            });
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "says when nothing matches, and offers the value rows",
        async () => {
            await openGraph();
            const box = screen.getByRole("combobox", { name: "Find" });

            await userEvent.type(box, "zzz");
            assert.isNotNull(await screen.findByText('No match for "zzz"'));

            await userEvent.clear(box);
            await userEvent.type(box, "Mr Hi");
            const list = await screen.findByRole("listbox", { name: "Find results" });
            const values = within(list).getByRole("group", { name: "Values" });
            assert.isNotNull(within(values).getByRole("option", { name: "Select where club is Mr Hi (5)" }));
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "lists a run on top under Selection, hides and shows its paint as one undo step, and deletes it with Undo",
        async () => {
            const { session, store } = await openGraph();
            assert.deepEqual(treeRows(), ["Selection", "Everything"]);
            assert.isNotNull(screen.getByText(/to add results here/));

            await session.runs.start("pagerank");
            const run = session.runs.list()[0];
            await waitFor(() => {
                assert.deepEqual(treeRows(), ["Selection", "PageRank", "Everything"]);
            });
            assert.isNull(screen.queryByText(/to add results here/), "the footer has nothing to say once a run exists");
            const layerIds = session.runs.bindings(run.id);
            assert.isNotEmpty(layerIds, "the run painted");

            // The eye: every layer of the run off, then one undo brings them all back.
            await userEvent.click(screen.getByRole("button", { name: "Hide PageRank" }));
            await waitFor(() => {
                assert.isTrue(layerIds.every((id) => session.styles.get(id)?.enabled === false));
            });
            await session.undo();
            await waitFor(() => {
                assert.isTrue(layerIds.every((id) => session.styles.get(id)?.enabled === true));
            });

            // Space on the focused row toggles the eye too.
            const row = screen.getByRole("treeitem", { name: "PageRank" });
            await userEvent.click(row);
            assert.deepEqual(store.get().inspected, { kind: "measure-row", id: run.id });
            await userEvent.keyboard(" ");
            await waitFor(() => {
                assert.isTrue(layerIds.every((id) => session.styles.get(id)?.enabled === false));
            });

            // Delete, with an Undo notice.
            await userEvent.keyboard("{Delete}");
            await waitFor(() => {
                assert.deepEqual(treeRows(), ["Selection", "Everything"]);
            });
            assert.equal(store.get().notice?.message, "Deleted PageRank.");
            store.get().notice?.action?.run();
            await waitFor(() => {
                assert.deepEqual(treeRows(), ["Selection", "PageRank", "Everything"]);
            });
            assert.isNull(store.get().notice, "the notice goes once its delete is undone");

            // Once another change is made, the notice goes: its Undo would take back that change.
            const row2 = screen.getByRole("treeitem", { name: "PageRank" });
            await userEvent.click(row2);
            await userEvent.keyboard("{Delete}");
            await waitFor(() => {
                assert.isNotNull(store.get().notice);
            });
            await session.data.addNodes([{ id: 99, name: "Zed" }]);
            await waitFor(() => {
                assert.isNull(store.get().notice);
            });
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "gives a run row and a layer row one command list, in the inspector's ... and the row's menu",
        async () => {
            const { session, store } = await openGraph();
            await session.runs.start("pagerank");
            const run = session.runs.list()[0];
            const layerIds = session.runs.bindings(run.id);
            await waitFor(() => {
                assert.include(treeRows(), "PageRank");
            });

            // Selection and Everything have no commands: no "..." and no menu.
            for (const name of ["Selection", "Everything"]) {
                await userEvent.click(screen.getByRole("treeitem", { name }));
                assert.isNull(screen.queryByRole("button", { name: `${name} actions` }), `${name} has no "..."`);
                await realInput.click(screen.getByRole("treeitem", { name }), { button: "right" });
                assert.isNull(screen.queryByRole("menu"), `${name} has no menu`);
            }

            // The inspector's "..." deletes the run, with an Undo notice that brings it back.
            await userEvent.click(screen.getByRole("treeitem", { name: "PageRank" }));
            await userEvent.click(screen.getByRole("button", { name: "Measure actions" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: /^Delete/ }));
            await waitFor(() => {
                assert.deepEqual(treeRows(), ["Selection", "Everything"]);
            });
            assert.notInclude(
                session.styles.list().map((layer) => layer.id),
                layerIds[0],
                "its layers went with it",
            );
            store.get().notice?.action?.run();
            await waitFor(() => {
                assert.include(treeRows(), "PageRank");
            });
            assert.include(
                session.styles.list().map((layer) => layer.id),
                layerIds[0],
            );

            // The row's own menu holds the same command.
            await realInput.click(screen.getByRole("treeitem", { name: "PageRank" }), { button: "right" });
            const menu = await screen.findByRole("menu");
            assert.deepEqual(menuLabels(within(menu).getAllByRole("menuitem")), ["Move up", "Move down", "Delete"]);
            await userEvent.keyboard("{Escape}");

            // A layer row adds Rename, which opens its name in place.
            const layer = await session.styles.add({
                name: "Mine",
                target: "node",
                selector: { match: "everything" },
                set: { "node.opacity": 1 },
            });
            const mine = await screen.findByRole("treeitem", { name: "Mine" });
            await userEvent.click(mine);
            await userEvent.click(screen.getByRole("button", { name: "Layer actions" }));
            assert.deepEqual(menuLabels(await screen.findAllByRole("menuitem")), [
                "Rename",
                "Move up",
                "Move down",
                "Delete",
            ]);
            await userEvent.click(screen.getByRole("menuitem", { name: /^Rename/ }));
            // The field takes focus with the name selected, so typing replaces it.
            const field = await screen.findByRole("textbox", { name: "Layer name" });
            await waitFor(() => {
                assert.equal(document.activeElement, field);
            });
            await userEvent.keyboard("Hubs{Enter}");
            await waitFor(() => {
                assert.equal(session.styles.get(layer.id)?.name, "Hubs");
            });
            assert.isNull(store.get().renamingRow);
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "moves a run row as one undo step from its menu and Alt+Arrow, never past Selection or Everything",
        async () => {
            const { session } = await openGraph();
            await session.runs.start("degree");
            await session.runs.start("pagerank");
            const [degree, pagerank] = session.runs.list();
            // The runs whose layers paint, top first.
            const paintOrder = (): string[] =>
                [
                    ...new Set(
                        session.styles
                            .list()
                            .flatMap((layer) => (layer.source.by === "run" ? [layer.source.runId] : [])),
                    ),
                ].reverse();
            await waitFor(() => {
                assert.deepEqual(treeRows(), ["Selection", "PageRank", "Degree", "Everything"]);
            });
            assert.deepEqual(paintOrder(), [pagerank.id, degree.id]);

            // The top row's menu: Move up is disabled with its reason; Move down moves it.
            const steps = session.history.position;
            await realInput.click(screen.getByRole("treeitem", { name: "PageRank" }), { button: "right" });
            const up = await screen.findByRole("menuitem", { name: /^Move up/ });
            assert.equal(up.getAttribute("aria-disabled"), "true");
            assert.include(up.textContent, "Already at the top");
            await userEvent.click(screen.getByRole("menuitem", { name: /^Move down/ }));
            await waitFor(() => {
                assert.deepEqual(paintOrder(), [degree.id, pagerank.id]);
            });
            assert.equal(session.history.position, steps + 1, "one move is one undo step");
            await waitFor(() => {
                assert.deepEqual(treeRows(), ["Selection", "Degree", "PageRank", "Everything"]);
            });
            await session.undo();
            await waitFor(() => {
                assert.deepEqual(paintOrder(), [pagerank.id, degree.id]);
            });

            // Alt+ArrowDown on the focused row moves it; at the bottom it stays above Everything.
            await userEvent.click(screen.getByRole("treeitem", { name: "PageRank" }));
            await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
            await waitFor(() => {
                assert.deepEqual(paintOrder(), [degree.id, pagerank.id]);
            });
            const settled = session.history.position;
            await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
            assert.equal(session.history.position, settled, "nothing moves below Everything");
            assert.deepEqual(treeRows(), ["Selection", "Degree", "PageRank", "Everything"]);
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "draws a group run with its groups as children, each with the size the element reports",
        async () => {
            const { session } = await openGraph();

            await session.runs.start("louvain");
            const run = session.runs.list()[0];
            const groups = run.record.summary?.groups ?? [];
            assert.isNotEmpty(groups);
            const groupCount = run.result?.graph.groupCount;
            assert.isNumber(groupCount);
            await waitFor(() => {
                assert.include(treeRows(), "Louvain");
            });
            const tree = screen.getByRole("tree", { name: "Paint tree" });
            const parent = within(tree).getByRole("treeitem", { name: "Louvain" });
            assert.equal(parent.getAttribute("aria-expanded"), "true", "few groups open by default");
            assert.include(parent.textContent, String(groupCount), "the count is the one the run publishes");
            for (const group of groups) {
                const child = within(tree).getByRole("treeitem", { name: group.name ?? String(group.group) });
                assert.include(child.textContent, String(group.size));
            }
        },
        TIMEOUT_MS * 2,
    );
});
