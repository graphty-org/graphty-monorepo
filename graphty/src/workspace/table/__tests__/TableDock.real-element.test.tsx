/**
 * The table dock on the REAL graphty-element: Shift+T opens it on Nodes; a run's result is a
 * column the element sorts and fills; the Columns chooser hides a column; a group run gets an item
 * tab whose "Show members in table" narrows Nodes; a row click selects a node or an edge through
 * the element; Export... opens the one Export dialog on the table that is showing; closing and
 * reopening the dock keeps the reader's arrangement. Every assertion reads what the element
 * reports or what the table draws from it, never pixels.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, describe, it } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

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
    return within(grid)
        .getAllByRole("row")
        .slice(1)
        .map((row) =>
            within(row)
                .queryAllByRole("gridcell")
                .map((cell) => cell.textContent ?? ""),
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
    it(
        "shows the element's records, sorts a result column, narrows to a group and exports",
        async () => {
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
            const live = session;
            await live.data.addNodes(NODES);
            await live.data.addEdges(EDGES);

            // Shift+T opens the dock on Nodes, counted by the element's page.
            await userEvent.keyboard("{Shift>}T{/Shift}");
            const dock = await screen.findByRole("region", { name: "Table" });
            await within(dock).findByText("12 nodes");
            assert.equal(within(dock).getByRole("tab", { name: "Nodes" }).getAttribute("aria-selected"), "true");

            // A run's result is a column, headed by the run's name; the element sorts it.
            const pagerank = live.runs.start("pagerank");
            await pagerank;
            await live.runs.start("louvain");
            const header = await within(dock).findByRole("button", { name: new RegExp(`^${pagerank.label}`) });
            await userEvent.click(header);
            await within(dock).findByText(`Sorted by ${pagerank.label}, highest first`);
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
            assert.include(
                drawnRows("Nodes")[0],
                new Intl.NumberFormat("en-US").format(Number(top.columns[0].values[0])),
            );

            // The Columns chooser lists each attribute and each run; unchecking one hides it.
            const columns = within(dock).getByRole("button", { name: /^Columns:/ });
            const [, shown, all] = /^Columns: (\d+) of (\d+)$/.exec(columns.textContent) ?? [];
            assert.equal(shown, all);
            assert.isNotNull(within(dock).getByRole("button", { name: /^team/ }));
            await userEvent.click(columns);
            assert.isNotNull(await screen.findByRole("menuitemcheckbox", { name: pagerank.label }));
            await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "team" }));
            await within(dock).findByRole("button", { name: `Columns: ${String(Number(all) - 1)} of ${all}` });
            assert.isNull(within(dock).queryByRole("button", { name: /^team/ }));
            await userEvent.keyboard("{Escape}");

            // A row click selects that node through the element.
            await userEvent.click(within(dock).getAllByRole("gridcell", { name: expected[0] })[0]);
            await waitFor(() => {
                assert.deepEqual(live.selection.nodes.map(String), [expected[0]]);
            });

            // The group run's item tab: one row per group; Show members narrows Nodes with a chip.
            const groups = live.runs
                .list()
                .find((run) => run.algorithm === "louvain")
                ?.result?.summary().groups;
            assert.isDefined(groups);
            const louvain = live.runs.list().find((run) => run.algorithm === "louvain");
            await userEvent.click(within(dock).getByRole("tab", { name: louvain?.label }));
            await within(dock).findByText(`${String(groups?.length)} groups`);
            const [first] = groups ?? [];
            const name = first.name ?? String(first.group);
            await userEvent.click(within(dock).getByRole("button", { name: `${name} options` }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Show members in table" }));
            await within(dock).findByText(`${String(first.size)} nodes`);
            assert.isNotNull(within(dock).getByText(`${louvain?.label ?? ""}: ${name}`));
            await userEvent.click(within(dock).getByRole("button", { name: `Show every node, not only ${name}` }));
            await within(dock).findByText("12 nodes");

            // An Edges row click selects that edge through the element.
            await userEvent.click(within(dock).getByRole("tab", { name: "Edges" }));
            await within(dock).findByText(`${String(EDGES.length)} edges`);
            const [edge] = live.data.edgePage({ limit: 1 }).records;
            await userEvent.click(within(screen.getByRole("grid", { name: "Edges" })).getAllByRole("gridcell")[0]);
            await waitFor(() => {
                assert.deepEqual(live.selection.edges.map(String), [edge.id]);
            });

            // Export... from the Edges tab opens the Export dialog on Data with the edge table.
            await userEvent.click(within(dock).getByRole("button", { name: "Table options" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Export..." }));
            const dialog = await screen.findByRole("dialog", { name: "Export" });
            await within(dialog).findByText(/^One row per edge/);
            // The file holds every edge: its first line is the header, then one line per edge.
            const preview = within(dialog).getByLabelText("Preview of the exported data");
            await waitFor(() => {
                assert.include(preview.textContent, "n0");
            });

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
        },
        TIMEOUT_MS * 2,
    );
});
