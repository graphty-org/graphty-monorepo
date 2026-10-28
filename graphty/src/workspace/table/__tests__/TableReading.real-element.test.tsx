/**
 * Reading the table dock on the REAL graphty-element: a short column is drawn whole while the
 * last one holds the room left over, a sort is spoken in the caption's words and the sorted
 * header says how it sorts, and a node with no value for a column reads "No value" there.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, describe, it } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

const NODES = [
    { id: "MlleBaptistine", name: "Mademoiselle Baptistine", email: "baptistine@example.org" },
    { id: "Myriel", name: "Myriel" },
    { id: "Napoleon", name: "Napoleon", email: "n@example.org" },
];

describe("reading the table dock", () => {
    it("draws short columns whole, speaks a sort and names an empty cell", async () => {
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
        await session.data.addEdges([{ source: "Myriel", target: "Napoleon" }]);

        await userEvent.keyboard("{Shift>}T{/Shift}");
        const grid = await screen.findByRole("grid", { name: "Nodes" });

        // The id and the name are drawn whole.
        await waitFor(() => {
            for (const text of ["MlleBaptistine", "Mademoiselle Baptistine"]) {
                const span = within(grid).getByText(text, { selector: ".cm-dt-text" });
                assert.isAtMost(span.scrollWidth, span.clientWidth, `${text} is cut`);
            }
        });

        // Myriel has no email: the cell reads "No value".
        const myriel = within(grid)
            .getAllByRole("row")
            .find((row) => row.textContent?.startsWith("Myriel"));
        assert.isDefined(myriel);
        const cells = within(myriel).getAllByRole("gridcell");
        assert.equal(cells.at(-1)?.textContent, "No value");

        // Sorting by name is spoken in the caption's words, and the header says how it sorts.
        const header = within(grid)
            .getAllByTestId("data-table-sort-button")
            .find((button) => button.textContent === "name");
        assert.isDefined(header);
        await userEvent.click(header);
        await waitFor(() => {
            assert.equal(store.get().announcement, "Sorted by name, A to Z");
        });
        assert.equal(header?.getAttribute("aria-label"), "name, sorted ascending");
    });
});
