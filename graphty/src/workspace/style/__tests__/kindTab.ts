/**
 * The Style tab's Node and Edge tabs, as a reader switches between them: a click on the tab.
 */

import { assert } from "vitest";
import { userEvent } from "vitest/browser";

import { screen, waitFor, within } from "../../../test/test-utils";

/**
 * Show one kind's tab of the open Style tab by clicking it; a row that draws one kind has no tabs.
 * @param kind - nodes or edges.
 */
export async function showKind(kind: "node" | "edge"): Promise<void> {
    const list = screen.queryByRole("tablist", { name: "Style for" });
    if (list === null) {
        return;
    }
    const tab = within(list).getByRole("tab", { name: kind === "node" ? /^Node/ : /^Edge/ });
    if (tab.getAttribute("aria-selected") !== "true") {
        await userEvent.click(tab);
    }
    await waitFor(() => {
        assert.strictEqual(tab.getAttribute("aria-selected"), "true");
    });
}
