/**
 * The table's rows with issues on the REAL graphty-element, with the airline sample: the `id`
 * header is its key glyph and name with no role pill; "With issues" narrows the Nodes table to the
 * one row its case variant is on, BRISTOL, drawn in the warning's tint; "Ignore all" on the
 * header's hover clears the warning, and Undo brings it back. Every assertion reads what the
 * element reports or what the table draws from it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { datasetBase } from "../../start/open";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * The workspace on the airline sample's airports, laid out in a still layout in the 2D view. Its
 * 37,000 routes are removed once it has loaded: the tests are about the Nodes table, and every
 * frame the element draws with them (one after each command, the ignore and the undo included) is
 * 77,000 instanced shapes, which a software GPU takes 2.5 s to draw on 4 CPUs (0.2 s without).
 * @returns the element's session.
 */
async function openAirlines(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Airlines", id: 1 } })} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.layout.set("circular");
    await session.layout.setDimension("2d");
    await session.data.loadDataset("openflights", datasetBase());
    await session.data.removeEdges(session.data.edges().map((edge) => edge.id));
    return session;
}

/**
 * A header cell of the Nodes table, by its column's name.
 * @param dock - the table dock.
 * @param name - the column.
 * @returns the cell.
 */
function headerCell(dock: HTMLElement, name: string): HTMLElement {
    const label = within(dock)
        .getAllByTestId("data-table-header-label")
        .find((each) => each.textContent === name);
    const cell = label?.closest<HTMLElement>('[data-testid="data-table-header"]');
    if (cell === null || cell === undefined) {
        throw new Error(`no header ${name}`);
    }
    return cell;
}

describe("the table's rows with issues", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it("shows BRISTOL alone with issues, and Ignore all clears the warning until Undo", async () => {
        const session = await openAirlines();
        await userEvent.keyboard("{Shift>}T{/Shift}");
        const dock = await screen.findByRole("region", { name: "Table" });

        // The key column says it with its glyph: no "id" pill beside the name "id".
        const id = await waitFor(() => headerCell(dock, "id"));
        assert.isNull(id.querySelector(".ws-th-role"), "no role pill on the key");

        const chip = await within(dock).findByRole("checkbox", { name: /^With issues/ });
        // A Chip's checkbox is hidden; the reader clicks its label.
        const label = (chip as HTMLInputElement).labels?.[0];
        assert.isDefined(label, "the chip has a label");
        await userEvent.click(label);
        await waitFor(() => {
            const grid = within(dock).getByRole("grid", { name: "Nodes" });
            const rows = within(grid).getAllByRole("row").slice(1);
            assert.lengthOf(rows, 1, "one row has an issue");
            const tinted = [...(rows[0]?.querySelectorAll('[data-tone="warning"]') ?? [])].map(
                (cell) => cell.textContent,
            );
            assert.deepEqual(tinted, ["BRISTOL"], "its affected cell is tinted");
        });

        const warning = within(headerCell(dock, "city")).getByRole("img", { name: "Issues in city" });
        await userEvent.hover(warning);
        await userEvent.click(await screen.findByRole("button", { name: "Ignore all issues in city" }));
        await waitFor(() => {
            assert.isNull(within(headerCell(dock, "city")).queryByRole("img", { name: "Issues in city" }));
            assert.lengthOf(session.data.issues(), 0);
        });

        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            within(headerCell(dock, "city")).getByRole("img", { name: "Issues in city" });
        });
    });
});
