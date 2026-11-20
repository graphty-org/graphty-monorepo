/**
 * The table dock's columns sit together from the left on a wide screen (issue #9224): the last
 * column is never pushed to the far right edge with a gap before it, whatever it holds.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Few columns, the last one a number (drawn from the end of its cell).
const NODES = [
    { id: "a", name: "Alpha", score: 3 },
    { id: "b", name: "Beta", score: 14 },
    { id: "c", name: "Gamma", score: 159 },
];

/**
 * How far apart a reader may see two neighbouring headers, in pixels: a short number column (as
 * wide as its header) draws its header from the end, about 60px from the column before it.
 */
const NEAR = 100;

describe("the table dock's columns on a wide screen", () => {
    it("sit together from the left, with no gap before the last column", async () => {
        await page.viewport(1920, 1080);
        const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
        render(<Workspace store={store} />);
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        await session.data.addNodes(NODES);
        await session.data.addEdges([{ source: "a", target: "b" }]);

        await userEvent.keyboard("{Shift>}T{/Shift}");
        const grid = await screen.findByRole("grid", { name: "Nodes" });
        await waitFor(() => {
            assert.isNotNull(within(grid).queryByText("Gamma"));
        });

        const headers = within(grid).getAllByRole("columnheader");
        assert.isAtLeast(headers.length, 3, "the key, the name and the score are shown");
        // The text a reader sees in each header, left to right.
        const labels = headers.map((header) => within(header).getByTestId("data-table-header-label"));
        for (let index = 1; index < headers.length; index++) {
            const before = headers[index - 1].getBoundingClientRect();
            const label = labels[index].getBoundingClientRect();
            const name = labels[index].textContent ?? "";
            assert.isAtMost(
                label.left - before.right,
                NEAR,
                `"${name}" sits ${String(Math.round(label.left - before.right))}px after the column before it`,
            );
        }
        // The spare width is after the last column, not inside it.
        const grid0 = grid.getBoundingClientRect();
        const last = headers[headers.length - 1].getBoundingClientRect();
        assert.isBelow(last.right, grid0.left + grid0.width / 2, "the columns end well before the right edge");
    });
});
