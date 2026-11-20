/**
 * A long sort on the REAL graphty-element: the table keeps drawing the old order while the element
 * prepares the new one, the notice shows the sort's progress with Cancel, and Cancel leaves the old
 * order and its caption in place. How long the element takes is held by the test (the real
 * `preparePage` starts only when the test lets it), so nothing here depends on the machine's speed.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { Workspace } from "../../Workspace";

const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}`, name: `item ${String(11 - i)}` }));

/**
 * The ids in the Nodes table's first column, top to bottom.
 * @returns the ids drawn.
 */
function drawnIds(): string[] {
    const grid = screen.getByRole("grid", { name: "Nodes" });
    return within(grid)
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.querySelector("[role=rowheader], [role=gridcell]")?.textContent ?? "");
}

describe("a long table sort", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it("keeps the old order while it runs, shows its progress, and Cancel keeps the old order", async () => {
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
        await userEvent.keyboard("{Shift>}T{/Shift}");
        const dock = await screen.findByRole("region", { name: "Table" });
        await within(dock).findByText("12 nodes");
        const loaded = NODES.map((node) => node.id);
        await waitFor(() => {
            assert.deepEqual(drawnIds(), loaded);
        });

        // The element's own preparation, started only when the test releases it.
        const real = live.data.preparePage.bind(live.data);
        let release = (): void => undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        const prepare = vi.spyOn(live.data, "preparePage").mockImplementation(async (...args) => {
            await gate;
            return real(...args);
        });

        await userEvent.click(within(dock).getByRole("button", { name: /^(?!Options for).*\bname$/u }));
        // The notice is the toast; a live region repeats its words for a screen reader.
        const notice = await screen.findByTestId("toast");
        await within(notice).findByText(/^Sorting \d+%$/u);
        assert.deepEqual(drawnIds(), loaded, "the old order stays drawn while the element sorts");
        assert.strictEqual(prepare.mock.calls.length, 1);

        await userEvent.click(within(notice).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isFalse(notice.isConnected);
        });
        await within(dock).findByText("In the order loaded");
        release();
        assert.deepEqual(drawnIds(), loaded, "Cancel kept the old order");

        // Without the hold, the same sort finishes and the rows take the new order.
        prepare.mockRestore();
        await userEvent.click(within(dock).getByRole("button", { name: /^(?!Options for).*\bname$/u }));
        await waitFor(() => {
            assert.deepEqual(drawnIds(), [...loaded].reverse());
        });
    });
});
