/**
 * The inspector's summaries and the table on the REAL graphty-element tell the whole truth: a
 * selection names every value of a column with its count, says a column none of it holds, and
 * gives its degree range; no label is cut; a histogram's one-value bin reads as that value; an
 * attribute lists its values; a score reads alike in the inspector and the table; an undirected
 * graph's edge ends are Node A and Node B.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, NodeId } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { columnVerb } from "../../../test/column-header";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Five people on an undirected graph: four on staff or board with no phone, one with a phone. */
const PEOPLE = `graph [
  directed 0
  node [ id 1 label "Ana" role "staff" ]
  node [ id 2 label "Ben" role "staff" ]
  node [ id 3 label "Cy" role "board" ]
  node [ id 4 label "Di" role "board" ]
  node [ id 5 label "Ed" role "staff" phone "555-0100" ]
  edge [ source 1 target 2 score 0.09654 ]
  edge [ source 2 target 3 score 0.5 ]
  edge [ source 3 target 4 score 0.25 ]
  edge [ source 4 target 5 score 0.125 ]
  edge [ source 1 target 3 score 0.75 ]
]`;

/**
 * The workspace at 1440 x 900 with the five people loaded.
 * @returns The store and the session.
 */
async function openPeople(): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "people.gml", config: { data: PEOPLE } });
    return { store, session };
}

/**
 * The ids of the named nodes.
 * @param session - the session.
 * @param names - the nodes' names.
 * @returns their ids.
 */
function idsOf(session: GraphSession, names: readonly string[]): NodeId[] {
    const { records } = session.data.nodePage({ limit: 100 });
    return names.map((name) => {
        const found = records.find((record) => session.data.name(record.id) === name);
        assert.isDefined(found, name);
        return found.id;
    });
}

/**
 * Whether a stat row's name is drawn whole: never cut to an ellipsis.
 * @param row - the stat row's group.
 * @returns true when the name fits its box.
 */
function nameWhole(row: HTMLElement): boolean {
    const name = within(row).getByTestId("data-row-name");
    return name.scrollWidth <= name.clientWidth;
}

describe("summaries that tell the whole truth", () => {
    it("names every value with its count, says the column none holds, gives the degree range, cuts no name", async () => {
        const { session } = await openPeople();
        await session.selection.apply({ nodes: idsOf(session, ["Ana", "Ben", "Cy", "Di"]) });
        await userEvent.click(await screen.findByRole("tab", { name: "Values" }));

        await waitFor(() => {
            const role = screen.getByRole("group", { name: "role" });
            assert.include(role.textContent ?? "", "staff (2)");
            assert.include(role.textContent ?? "", "board (2)");
            assert.include(screen.getByRole("group", { name: "phone" }).textContent ?? "", "0 of 4 have a value");
            // Ana 2, Ben 2, Cy 3, Di 2 edges.
            assert.include(screen.getByRole("group", { name: "Degree" }).textContent ?? "", "2 to 3");
        });
        const joining = screen.getByRole("group", { name: "Edges joining these nodes" });
        assert.isTrue(nameWhole(joining), "the long name wraps, never cut");
    });

    it("reads a one-value bin as its value, and lists an attribute's values with counts", async () => {
        const { store, session } = await openPeople();
        await userEvent.click(await screen.findByRole("tab", { name: "Values" }));
        // Degrees 2, 2, 3, 2, 1: the bin of degree 1 holds one node.
        await waitFor(() => {
            assert.include(document.body.textContent ?? "", "1: 1 node");
        });
        assert.notInclude(document.body.textContent ?? "", "1 to 1");

        // An attribute's Details, from its column header in the table (the Data place lists no attributes).
        await columnVerb("node", "role", "Details");
        await waitFor(() => {
            assert.equal(store.get().inspected?.kind, "attribute");
            assert.include(screen.getByRole("group", { name: "staff" }).textContent ?? "", "3");
            assert.include(screen.getByRole("group", { name: "board" }).textContent ?? "", "2");
            // The measurement row is named for what it is, not like a column called "kind".
            assert.isNotNull(screen.queryByRole("group", { name: "Value type" }));
            assert.isNull(screen.queryByRole("group", { name: "Kind" }));
        });
        assert.isDefined(session);
    });

    it("heads an undirected graph's edge ends Node A and Node B, and spells a score as the inspector does", async () => {
        const { session } = await openPeople();
        await userEvent.keyboard("{Shift>}T{/Shift}");
        await userEvent.click(await screen.findByRole("tab", { name: /^Edges/ }));
        const grid = await screen.findByRole("grid", { name: "Edges" });
        await waitFor(() => {
            const headers = within(grid)
                .getAllByRole("columnheader")
                .map((header) => header.textContent ?? "");
            assert.isTrue(
                headers.some((text) => text.includes("Node A")),
                headers.join(" | "),
            );
            assert.isTrue(headers.some((text) => text.includes("Node B")));
            assert.isFalse(headers.some((text) => /^From/.test(text)));
            // Four significant digits, as the inspector and the key write it; not "0.097".
            assert.include(grid.textContent ?? "", "0.09654");
        });
        assert.isDefined(session);
    });
});
