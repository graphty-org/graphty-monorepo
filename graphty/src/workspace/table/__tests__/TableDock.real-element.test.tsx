/**
 * The table dock on the REAL graphty-element: Shift+T opens it on Nodes; a run's result is a
 * column the element sorts; a group run gets an item tab whose "Show members in table" narrows
 * Nodes; a row click selects through the element; Export... opens the one Export dialog on the
 * table that is showing. Every assertion reads what the element reports or what the table draws
 * from it, never pixels.
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
 * The ids in the Nodes table's first column, top to bottom.
 * @returns the ids drawn.
 */
function drawnIds(): string[] {
    const grid = screen.getByRole("grid", { name: "Nodes" });
    return within(grid)
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("gridcell")[0]?.textContent ?? "");
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

            // A row click selects that node through the element.
            await userEvent.click(within(dock).getAllByRole("gridcell", { name: expected[0] })[0]);
            await waitFor(() => {
                assert.deepEqual(live.selection.nodes.map(String), [expected[0]]);
            });

            // The group run's item tab: one row per group; Show members narrows Nodes with a chip.
            const groups = live.runs.list().find((run) => run.algorithm === "louvain")?.result?.summary().groups;
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

            // Export... from the Edges tab opens the Export dialog on Data with the edge table.
            await userEvent.click(within(dock).getByRole("tab", { name: "Edges" }));
            await within(dock).findByText(`${String(EDGES.length)} edges`);
            await userEvent.click(within(dock).getByRole("button", { name: "Table options" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Export..." }));
            const dialog = await screen.findByRole("dialog", { name: "Export" });
            await within(dialog).findByText(/^One row per edge/);

            // Shift+T again closes the dock.
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.isNull(screen.queryByRole("dialog", { name: "Export" }));
            });
            await userEvent.keyboard("{Shift>}T{/Shift}");
            await waitFor(() => {
                assert.isNull(screen.queryByRole("region", { name: "Table" }));
            });
        },
        TIMEOUT_MS * 2,
    );
});
