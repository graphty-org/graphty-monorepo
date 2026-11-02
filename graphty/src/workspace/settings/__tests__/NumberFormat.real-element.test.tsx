/**
 * Settings > General > Number format on the REAL graphty-element: the reader's choice changes how
 * the table spells numbers at once, and the inspector's graph overview counts too.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { NUMBER_FORMAT } from "../preferences";

let unmount: (() => void) | undefined;

afterEach(() => {
    unmount?.();
    unmount = undefined;
    localStorage.removeItem(NUMBER_FORMAT.key);
});

/**
 * The texts of the table's number cells, in row order.
 * @param grid - the Nodes grid.
 * @returns the texts of the cells that hold a digit.
 */
function numberCells(grid: HTMLElement): string[] {
    return within(grid)
        .getAllByRole("gridcell")
        .map((cell) => cell.textContent)
        .filter((text) => /\d/.test(text));
}

describe("Settings > Number format", () => {
    it("spells the table's numbers in the chosen format as soon as it is picked", async () => {
        const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
        ({ unmount } = render(<Workspace store={store} />));
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        await session.data.addNodes([
            { id: "first", score: 12345.5 },
            { id: "second", score: 0.25 },
        ]);

        await userEvent.keyboard("{Shift>}T{/Shift}");
        const grid = await screen.findByRole("grid", { name: "Nodes" });
        await waitFor(() => {
            assert.deepEqual(numberCells(grid), ["12,346", "0.25"]);
        });

        await userEvent.keyboard("{Control>},{/Control}");
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        await userEvent.click(within(dialog).getByText("1.234,5"));
        assert.equal(localStorage.getItem(NUMBER_FORMAT.key), "comma");
        await userEvent.keyboard("{Escape}");

        await waitFor(() => {
            assert.deepEqual(numberCells(grid), ["12.346", "0,25"]);
        });
    });
});
