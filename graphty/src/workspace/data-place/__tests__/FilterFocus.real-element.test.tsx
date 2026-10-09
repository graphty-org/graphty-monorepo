/**
 * Focus and keys in the Filters section and its step editor, on the REAL graphty-element: Enter
 * adds or saves a step and focus goes to its row; Escape closes the editor back to the row;
 * deleting a step moves focus to the next row, or to "+" when none is left. Focus never falls to
 * the page (WCAG 2.4.3).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { GRAPH_FILE_GML } from "../fixtures";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * Renders the workspace on the Data place and loads the small graph file (8 nodes; edge `value`
 * 9 or more on 4 edges whose ends are 5 nodes).
 * @returns the session and the chrome store.
 */
async function openWithGraph(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
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
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: GRAPH_FILE_GML } });
    return { session, store };
}

/**
 * The Filters tree.
 * @returns the tree.
 */
const filters = (): HTMLElement =>
    within(screen.getByRole("region", { name: "Data place" })).getByRole("tree", { name: "Filters" });

describe("Filters focus and keys on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("Enter adds and saves a step, Escape closes the editor, and focus lands on a row or +", async () => {
        const { session, store } = await openWithGraph();

        // Add: Enter in the value field adds the step, and focus goes to its row.
        const attribute = await screen.findByRole("treeitem", { name: "value, edge attribute" });
        attribute.focus();
        await userEvent.keyboard("{Shift>}{F10}{/Shift}");
        await userEvent.click(await screen.findByRole("menuitem", { name: "Filter to..." }));
        await userEvent.type(await screen.findByRole("textbox", { name: "Value" }), "9{Enter}");
        await waitFor(() => {
            assert.equal(session.visibility.summary.visibleNodes, 5);
        });
        const row = await within(filters()).findByRole("treeitem", { name: "value is at least 9" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, row);
        });
        assert.isNull(store.get().inspected);

        // Edit: Enter saves, and the new count is the element's.
        await userEvent.click(row);
        const value = await screen.findByRole("textbox", { name: "Value" });
        await userEvent.clear(value);
        await userEvent.type(value, "10{Enter}");
        await waitFor(() => {
            assert.deepEqual(session.visibility.steps[0]?.rule, {
                kind: "range",
                attribute: "data.value",
                min: 10,
                nodes: "ends",
            });
        });
        const saved = await within(filters()).findByRole("treeitem", { name: "value is at least 10" });
        await within(saved).findByText(`8 to ${String(session.visibility.summary.visibleNodes)} nodes`);
        await waitFor(() => {
            assert.strictEqual(document.activeElement, saved);
        });

        // Escape closes the editor and returns focus to the step's row; the selection stays.
        await userEvent.click(saved);
        await screen.findByRole("textbox", { name: "Value" });
        screen.getByRole("textbox", { name: "Value" }).focus();
        await userEvent.keyboard("{Escape}");
        assert.isNull(store.get().inspected);
        assert.strictEqual(document.activeElement, saved);
        assert.isNull(screen.queryByRole("textbox", { name: "Value" }));

        // Escape in a new step's editor returns focus to "+".
        const plus = screen.getByRole("button", { name: "Add filter step" });
        await userEvent.click(plus);
        await screen.findByRole("combobox", { name: "Keep" });
        screen.getByRole("combobox", { name: "Keep" }).focus();
        await userEvent.keyboard("{Escape}");
        assert.isNull(store.get().inspected);
        assert.strictEqual(document.activeElement, plus);
    });

    it("deleting a step moves focus to the next row, the one above for the last, then +", async () => {
        const { session } = await openWithGraph();
        await session.visibility.setSteps([
            { id: "a", on: true, rule: { kind: "range", attribute: "data.value", min: 2, nodes: "ends" } },
            { id: "b", on: true, rule: { kind: "range", attribute: "data.value", min: 5, nodes: "ends" } },
            { id: "c", on: true, rule: { kind: "range", attribute: "data.value", min: 9, nodes: "ends" } },
        ]);
        const remove = async (name: string): Promise<void> => {
            within(filters()).getByRole("treeitem", { name }).focus();
            await userEvent.keyboard("{Shift>}{F10}{/Shift}");
            await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
        };

        await within(filters()).findByRole("treeitem", { name: "value is at least 2" });
        await remove("value is at least 2");
        await waitFor(() => {
            assert.equal(document.activeElement?.getAttribute("data-id"), "b");
        });
        await remove("value is at least 9");
        await waitFor(() => {
            assert.equal(document.activeElement?.getAttribute("data-id"), "b");
        });
        await remove("value is at least 5");
        await waitFor(() => {
            assert.lengthOf(session.visibility.steps, 0);
            assert.strictEqual(document.activeElement, screen.getByRole("button", { name: "Add filter step" }));
        });
    });
});
