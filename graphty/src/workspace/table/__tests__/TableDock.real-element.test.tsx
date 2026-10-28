/**
 * The table dock on the REAL graphty-element: Shift+T opens it on Nodes; a run's result is a
 * column the element sorts and fills; the Columns chooser hides a column; a group run gets an item
 * tab whose "Show members in table" narrows Nodes; a column moves from its header menu; a row click selects a node or an edge through
 * the element; Export... opens the one Export dialog on the table that is showing; closing and
 * reopening the dock keeps the reader's arrangement. Every assertion reads what the element
 * reports or what the table draws from it, never pixels.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Two rings of six joined by a bridge: Louvain finds the rings. */
const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}`, team: i < 6 ? "North" : "South" }));
const ring = (from: number): { source: string; target: string }[] =>
    Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(from + i)}`,
        target: `n${String(from + ((i + 1) % 6))}`,
    }));
const EDGES = [...ring(0), ...ring(6), { source: "n0", target: "n6" }];

/**
 * The cells of a table's drawn rows, top to bottom.
 * @param name - the table: "Nodes" or "Edges".
 * @returns each row's cell texts.
 */
function drawnRows(name: string): string[][] {
    const grid = screen.getByRole("grid", { name });
    return (
        within(grid)
            .getAllByRole("row")
            .slice(1)
            // The key column's cells are row headers, the rest grid cells, in column order.
            .map((row) =>
                [...row.querySelectorAll("[role=rowheader], [role=gridcell]")].map((cell) => cell.textContent ?? ""),
            )
    );
}

/**
 * The ids in the Nodes table's first column, top to bottom.
 * @returns the ids drawn.
 */
function drawnIds(): string[] {
    return drawnRows("Nodes").map((cells) => cells[0] ?? "");
}

describe("the table dock", () => {
    beforeAll(async () => {
        // Wide enough for the canvas, the dock and both side panels side by side.
        await page.viewport(1366, 900);
    });

    it("shows the element's records, sorts a result column, narrows to a group and exports", async () => {
        render(<Workspace initialState={{ project: { name: "Untitled", id: 1 } }} />);
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        const live = session;
        await live.data.addNodes(NODES);

        // Shift+T opens the dock on Nodes, counted by the element's page. With no edges yet there
        // is no Edges tab; it comes with the first edges.
        await userEvent.keyboard("{Shift>}T{/Shift}");
        const dock = await screen.findByRole("region", { name: "Table" });
        await within(dock).findByText("12 nodes");
        assert.isNull(within(dock).queryByRole("tab", { name: "Edges" }));
        await live.data.addEdges(EDGES);
        await within(dock).findByRole("tab", { name: "Edges" });

        // In a narrow dock (a tablet held upright) the tabs keep one row; the count and the
        // Columns label give way first, and only then do the tabs scroll sideways.
        const { innerWidth, innerHeight } = window;
        await page.viewport(820, 1180);
        const [nodesTab, edgesTab] = within(dock).getAllByRole("tab");
        const nodesBox = nodesTab?.getBoundingClientRect();
        const edgesBox = edgesTab?.getBoundingClientRect();
        assert.strictEqual(edgesBox?.top, nodesBox?.top, "the tabs share one row");
        await page.viewport(innerWidth, innerHeight);
        assert.equal(within(dock).getByRole("tab", { name: "Nodes" }).getAttribute("aria-selected"), "true");

        // A run's result is a column, headed by the run's name; the element sorts it.
        const pagerank = live.runs.start("pagerank");
        await pagerank;
        const louvainRun = live.runs.start("louvain");
        await louvainRun;
        // The sort button reads the header's icons first: its type and its origin.
        const header = await within(dock).findByRole("button", { name: /^number, computed PageRank/ });
        await userEvent.click(header);
        await within(dock).findByText("Sorted by PageRank, highest first");
        const expected = live.data
            .nodePage({ columns: [pagerank.id], sort: { run: pagerank.id, descending: true }, limit: 3 })
            .records.map((record) => String(record.id));
        await waitFor(() => {
            assert.deepEqual(drawnIds().slice(0, 3), expected);
        });
        // The result cell is the element's value for that node.
        const top = live.data.nodePage({
            columns: [pagerank.id],
            sort: { run: pagerank.id, descending: true },
            limit: 1,
        });
        assert.include(drawnRows("Nodes")[0], new Intl.NumberFormat("en-US").format(Number(top.columns[0].values[0])));
        // A partition's cell names the group as the key does ("Group 3", by size), not by its raw id.
        const louvain = live.runs.list().find((run) => run.id === louvainRun.id);
        assert.isDefined(louvain);
        const topId = String(top.records[0]?.id);
        const value = live.data.nodePage({ columns: [louvain?.id ?? ""], limit: 100 });
        const at = value.records.findIndex((record) => String(record.id) === topId);
        const rank = louvain?.result
            ?.summary()
            .groups?.find((group) => String(group.group) === String(value.columns[0].values[at]))?.rank;
        assert.isDefined(rank);
        assert.include(drawnRows("Nodes")[0], `Group ${String(rank)}`);

        // The Columns chooser lists each attribute and each run; unchecking one hides it.
        const columns = within(dock).getByRole("button", { name: /^Columns:/ });
        const [, shown, all] = /^Columns: (\d+) of (\d+)$/.exec(columns.textContent) ?? [];
        assert.equal(shown, all);
        assert.isNotNull(within(dock).getByRole("button", { name: /^category team/ }));
        await userEvent.click(columns);
        assert.isNotNull(await screen.findByRole("menuitemcheckbox", { name: "PageRank" }));
        await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "team" }));
        await within(dock).findByRole("button", { name: `Columns: ${String(Number(all) - 1)} of ${all}` });
        assert.isNull(within(dock).queryByRole("button", { name: /^category team/ }));
        await userEvent.keyboard("{Escape}");

        // A column moves from its header menu (a finger reaches it too); the key stays first.
        const grid = screen.getByRole("grid", { name: "Nodes" });
        const headers = (): string[] =>
            within(grid)
                .getAllByRole("columnheader")
                .map((cell) => cell.textContent ?? "");
        const before = headers();
        assert.isAtLeast(before.length, 3);
        // The key's header has a menu of its own too (Role, Type): open the first movable column's.
        const firstMovable = within(grid).getAllByRole("columnheader")[1];
        await userEvent.click(within(firstMovable).getByTestId("data-table-header-menu"));
        const left = await screen.findByRole("menuitem", { name: "Move left" });
        assert.isTrue(left.hasAttribute("disabled") || left.getAttribute("data-disabled") === "true");
        await userEvent.click(screen.getByRole("menuitem", { name: "Move right" }));
        await waitFor(() => {
            assert.deepEqual(headers(), [before[0], before[2], before[1], ...before.slice(3)]);
        });

        // A row click selects that node through the element.
        await userEvent.click(within(dock).getAllByRole("rowheader", { name: expected[0] })[0]);
        await waitFor(() => {
            assert.deepEqual(live.selection.nodes.map(String), [expected[0]]);
        });

        // The group run's item tab: one row per group; Show members narrows Nodes with a chip.
        const groups = live.runs
            .list()
            .find((run) => run.algorithm === "louvain")
            ?.result?.summary().groups;
        assert.isDefined(groups);
        await userEvent.click(within(dock).getByRole("tab", { name: "Louvain" }));
        await within(dock).findByText(`${String(groups?.length)} groups`);
        const [first] = groups ?? [];
        const name = first.name ?? String(first.group);
        await userEvent.click(within(dock).getByRole("button", { name: `${name} options` }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Show members in table" }));
        await within(dock).findByText(`${String(first.size)} nodes`);
        assert.isNotNull(within(dock).getByText(`Louvain: ${name}`));
        await userEvent.click(within(dock).getByRole("button", { name: `Show every node, not only ${name}` }));
        await within(dock).findByText("12 nodes");
        // The chip and its x went; focus goes to the tab it narrowed.
        assert.strictEqual(document.activeElement, within(dock).getByRole("tab", { name: "Nodes" }));

        // An Edges row click selects that edge through the element.
        await userEvent.click(within(dock).getByRole("tab", { name: "Edges" }));
        await within(dock).findByText(`${String(EDGES.length)} edges`);
        const [edge] = live.data.edgePage({ limit: 1 }).records;
        await userEvent.click(within(screen.getByRole("grid", { name: "Edges" })).getAllByRole("rowheader")[0]);
        await waitFor(() => {
            assert.deepEqual(live.selection.edges.map(String), [edge.id]);
        });

        // Export... from the Edges tab opens the Export dialog on Data with the edge table.
        await userEvent.click(within(dock).getByRole("button", { name: "Table options" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Export..." }));
        const dialog = await screen.findByRole("dialog", { name: "Export" });
        // The CSV's Table option is on Edges.
        const edgesTable = await within(dialog).findByLabelText("Table", { selector: "input" });
        assert.equal((edgesTable as HTMLInputElement).value, "Edges");
        // The file holds every edge: its first line is the header, then one line per edge.
        // The preview is written once exportGraph resolves, which first waits for the element's
        // whole operation queue (layout, styles) to drain: wait on the preview itself, with no
        // deadline of its own, so the test's timeout is the only backstop (#3021).
        const preview = within(dialog).getByLabelText("Preview of the exported data");
        await waitFor(() => {
            assert.notEqual(preview.textContent, "Writing the preview...");
        });
        assert.include(preview.textContent, "n0");

        // Shift+T again closes the dock.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Export" }));
        });
        await userEvent.keyboard("{Shift>}T{/Shift}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "Table" }));
        });

        // Reopened, the dock is as the reader left it: on Edges, with team hidden on Nodes.
        await userEvent.keyboard("{Shift>}T{/Shift}");
        const reopened = await screen.findByRole("region", { name: "Table" });
        assert.equal(within(reopened).getByRole("tab", { name: "Edges" }).getAttribute("aria-selected"), "true");
        await userEvent.click(within(reopened).getByRole("tab", { name: "Nodes" }));
        await within(reopened).findByRole("button", { name: `Columns: ${String(Number(all) - 1)} of ${all}` });
    });
    it("lists only what an on filter step keeps, counted against the whole graph", async () => {
        const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" });
        render(<Workspace store={store} />);
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        const live = session;
        await live.data.addNodes(NODES);
        // Weights 0 to 12: "weight is at least 7" keeps 6 of the 13 edges.
        await live.data.addEdges(EDGES.map((edge, i) => ({ ...edge, weight: i })));
        await live.visibility.setSteps([
            { id: "w", on: false, rule: { kind: "range", attribute: "data.weight", min: 7, nodes: "ends" } },
        ]);

        await userEvent.keyboard("{Shift>}T{/Shift}");
        const dock = await screen.findByRole("region", { name: "Table" });
        await userEvent.click(within(dock).getByRole("tab", { name: "Edges" }));
        await within(dock).findByText("13 edges");
        assert.lengthOf(drawnRows("Edges"), 13);

        // The step turned on from its checkbox: the table lists the 6 edges it keeps.
        await userEvent.click(await screen.findByRole("checkbox", { name: /^Apply step: / }));
        await within(dock).findByText("6 of 13 edges");
        await waitFor(() => {
            assert.lengthOf(drawnRows("Edges"), 6);
        });
        assert.equal(live.visibility.summary.visibleEdges, 6);

        // Off again: every edge, and the count says only that.
        await userEvent.click(screen.getByRole("checkbox", { name: /^Apply step: / }));
        await within(dock).findByText("13 edges");
        await waitFor(() => {
            assert.lengthOf(drawnRows("Edges"), 13);
        });
    });
});
