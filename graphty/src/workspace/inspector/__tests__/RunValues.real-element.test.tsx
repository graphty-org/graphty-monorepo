/**
 * A run row's and a group row's Values tab on the REAL graphty-element, reached by real clicks:
 * a set run says how many it holds; a measure's top entry, a route's node and a group's member each
 * select what they name; a route that read a distance
 * weight totals it under the weight's own name; and the Overview's Largest component selects it.
 * Every figure asserted is the element's.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type GraphSession, RESULT_SHAPE_CONTRACTS } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { act, render, screen, waitFor, type Within, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { groupKey } from "../inspected";
import { formatNumber } from "../words";

/** Two rings of six joined by one bridge. */
const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}` }));
const ring = (from: number): { source: string; target: string }[] =>
    Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(from + i)}`,
        target: `n${String(from + ((i + 1) % 6))}`,
    }));
const EDGES = [...ring(0), ...ring(6), { source: "n0", target: "n6" }];

/** A running club whose weight is a distance: the long way round is fewer hops but farther. */
const CLUB = "source,target,km\nAva,Ben,3\nBen,Lee,2\nAva,Lee,9\nLee,Zed,1\n";

/**
 * The workspace, once the element's session has come up.
 * @returns the session and the store.
 */
async function openWorkspace(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Runs", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return { session, store };
}

/**
 * The workspace holding the two rings.
 * @returns the session and the store.
 */
async function openRings(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const opened = await openWorkspace();
    await opened.session.data.addNodes(NODES);
    await opened.session.data.addEdges(EDGES);
    return opened;
}

/**
 * Runs an algorithm to the end, as Analyze > Run does.
 * @param session - the session.
 * @param algorithm - its key.
 * @param params - its settings.
 * @returns the run's id.
 */
async function runToEnd(
    session: GraphSession,
    algorithm: string,
    params: Record<string, unknown> = {},
): Promise<string> {
    const run = session.runs.start(algorithm, params);
    await act(async () => {
        await run;
        await session.styles.settled();
    });
    return run.id;
}

/**
 * Opens a run's row on its Values tab.
 * @param store - the store.
 * @param id - the run.
 */
function openRun(store: WorkspaceStore, id: string): void {
    act(() => {
        store.set({ inspected: { kind: "measure-row", id }, tabs: { "measure-row": "values" } });
    });
}

/**
 * The inspector region.
 * @returns queries scoped to it.
 */
const inspector = (): Within => within(screen.getByRole("complementary", { name: "Inspector" }));

/**
 * The rows of a section that are links, leaving out the section's own open-and-close toggle.
 * @param section - the section.
 * @returns the rows.
 */
const rowButtons = (section: HTMLElement): HTMLElement[] =>
    within(section)
        .getAllByRole("button")
        .filter((button) => !button.hasAttribute("aria-expanded"));

/**
 * A stat row's value.
 * @param scope - where the row is.
 * @param name - the row's name.
 * @returns its value's text.
 */
function statValue(scope: HTMLElement, name: string): string {
    return within(scope).getByRole("group", { name }).querySelector("[data-testid=data-row-value]")?.textContent ?? "";
}

describe("a run row's Values on the real element", () => {
    it("a set run (Kruskal's tree) says how many edges it holds", async () => {
        const { session, store } = await openRings();
        const id = await runToEnd(session, "kruskal");
        const count = session.runs.get(id)?.result?.graph.count;
        assert.equal(count, NODES.length - 1, "a spanning tree of a connected graph");

        // A set publishes no groups, yet its row is a run row (graph-place/rows.ts runRowKind).
        act(() => {
            store.set({ inspected: { kind: "run-row", id }, tabs: { "run-row": "values" } });
        });
        const summary = await inspector().findByRole("group", { name: "Summary" });
        assert.equal(statValue(summary, "Holds"), `${String(count)} edges`);
        // A set has no histogram and no top 10.
        assert.isNull(inspector().queryByRole("group", { name: "Top 10" }));
    });

    it("a measure's top entry selects the node it names", async () => {
        const { session, store } = await openRings();
        const id = await runToEnd(session, "pagerank");
        const run = session.runs.get(id);
        const field = run === undefined ? null : RESULT_SHAPE_CONTRACTS[run.shape].primaryField;
        assert.isNotNull(field);
        const top = run?.result?.top(field ?? "", 10).entries[0];
        assert.isDefined(top);

        openRun(store, id);
        const section = await inspector().findByRole("group", { name: "Top 10" });
        const first = rowButtons(section)[0];
        assert.include(first.textContent, String(top?.id));
        await userEvent.click(first);
        await waitFor(() => {
            assert.deepEqual(session.selection.nodes.map(String), [String(top?.id)]);
        });
    });

    it("a group's member selects that node", async () => {
        const { session, store } = await openRings();
        const id = await runToEnd(session, "louvain");
        const groups = session.runs.get(id)?.result?.summary().groups ?? [];
        assert.isNotEmpty(groups);
        const { group, size } = groups[0];

        act(() => {
            store.set({ inspected: { kind: "group-row", id: groupKey(id, group) }, tabs: { "group-row": "values" } });
        });
        const members = await inspector().findByRole("group", { name: "Members" });
        assert.isNotNull(within(members).getByText(`First ${String(Math.min(10, size))}`));
        const first = rowButtons(members)[0];
        const name = first.textContent;
        await userEvent.click(first);
        await waitFor(() => {
            assert.lengthOf(session.selection.nodes, 1);
        });
        assert.equal(name, String(session.selection.nodes[0]));
    });

    it("a route that read a distance weight totals it by the weight's name, and its nodes select", async () => {
        const { session, store } = await openWorkspace();
        await session.data.import(
            { type: "csv", config: { data: CLUB } },
            {
                mapping: {
                    rowsAre: "edges",
                    source: "source",
                    target: "target",
                    weight: "km",
                    weightMeaning: "distance",
                },
            },
        );
        const id = await runToEnd(session, "shortest-path", { source: "Ava", target: "Zed" });
        const run = session.runs.get(id);
        assert.equal(run?.caveats.weight?.meaning, "distance");
        const cost = run?.result?.graph.cost;
        // Ava - Ben - Lee - Zed, 3 + 2 + 1, beats the direct 9 km to Lee.
        assert.equal(cost, 6);

        openRun(store, id);
        const summary = await inspector().findByRole("group", { name: "Summary" });
        assert.equal(statValue(summary, "Total km"), formatNumber(6));

        const nodes = await inspector().findByRole("group", { name: "Nodes in order" });
        const names = rowButtons(nodes).map((button) => button.textContent.slice(0, 3));
        assert.deepEqual(names, ["Ava", "Ben", "Lee", "Zed"]);
        await userEvent.click(rowButtons(nodes)[1]);
        await waitFor(() => {
            assert.deepEqual(session.selection.nodes.map(String), ["Ben"]);
        });
    });
});

describe("the graph's Overview on the real element", () => {
    it("the Largest component row selects that component", async () => {
        const { session } = await openWorkspace();
        await session.data.addNodes(["a", "b", "c", "d", "x", "y"].map((id) => ({ id })));
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "b", target: "c" },
            { source: "c", target: "d" },
            { source: "x", target: "y" },
        ]);
        const { components } = session.data.statistics();
        assert.equal(components.count, 2);
        const row = await inspector().findByRole("group", { name: "Largest component" });
        assert.equal(row.querySelector("[data-testid=data-row-value]")?.textContent, "4 nodes");

        await userEvent.click(within(row).getByRole("button"));
        await waitFor(() => {
            assert.sameMembers(session.selection.nodes.map(String), ["a", "b", "c", "d"]);
        });
    });
});
