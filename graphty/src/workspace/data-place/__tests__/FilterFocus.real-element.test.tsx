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

import { columnVerb } from "../../../test/column-header";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { GRAPH_FILE_GML } from "../fixtures";
import { openStepPicker } from "./stepCards";

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
/** The number condition card's From box, on the edge column `value`. */
const FROM = "value from, number";

const filters = (): HTMLElement =>
    within(screen.getByRole("region", { name: "Data place" })).getByRole("tree", { name: "Filters" });

describe("Filters focus and keys on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("Enter adds and saves a step, Escape closes the editor, and focus lands on a row or +", async () => {
        const { session, store } = await openWithGraph();

        // Add: Enter in the value field adds the step, and focus goes to its row.
        await columnVerb("edge", "value", "Filter to...");
        const from = await screen.findByRole("textbox", { name: FROM });
        await userEvent.clear(from);
        await userEvent.type(from, "9{Enter}");
        await waitFor(() => {
            assert.equal(session.visibility.summary.visibleNodes, 5);
        });
        const row = await within(filters()).findByRole("treeitem", { name: "value is between 9 and 31" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, row);
        });
        assert.isNull(store.get().inspected);

        // Edit: Enter saves, and the new count is the element's. The card is in Which edges.
        await userEvent.click(row);
        await openStepPicker("edge");
        const value = await screen.findByRole("textbox", { name: FROM });
        await userEvent.clear(value);
        await userEvent.type(value, "10{Enter}");
        await waitFor(() => {
            assert.deepEqual(session.visibility.steps[0]?.rule, {
                kind: "range",
                attribute: "data.value",
                min: 10,
                max: 31,
                nodes: "ends",
            });
        });
        const saved = await within(filters()).findByRole("treeitem", { name: "value is between 10 and 31" });
        // A step over an edge column names both counts.
        const { visibleNodes, totalEdges, visibleEdges } = session.visibility.summary;
        await within(saved).findByText(
            `8 to ${String(visibleNodes)} nodes, ${String(totalEdges)} to ${String(visibleEdges)} edges`,
        );
        await waitFor(() => {
            assert.strictEqual(document.activeElement, saved);
        });

        // Escape closes the editor and returns focus to the step's row; the selection stays. (Escape
        // in a number box holding text keeps the text and the editor, so it is pressed on Filter by.)
        await userEvent.click(saved);
        await openStepPicker("edge");
        await screen.findByRole("textbox", { name: FROM });
        screen.getByRole("combobox", { name: "Filter by" }).focus();
        await userEvent.keyboard("{Escape}");
        assert.isNull(store.get().inspected);
        assert.strictEqual(document.activeElement, saved);
        assert.isNull(screen.queryByRole("textbox", { name: FROM }));

        // Escape in a new step's editor returns focus to "+".
        const plus = screen.getByRole("button", { name: "Add filter step" });
        await userEvent.click(plus);
        await screen.findByRole("combobox", { name: "Filter by" });
        screen.getByRole("combobox", { name: "Filter by" }).focus();
        await userEvent.keyboard("{Escape}");
        assert.isNull(store.get().inspected);
        assert.strictEqual(document.activeElement, plus);
    });

    it("Tab out of the step editor saves the edit; Escape saves nothing and says so", async () => {
        const { session, store } = await openWithGraph();
        await session.visibility.setSteps([
            { id: "a", on: true, rule: { kind: "range", attribute: "data.value", min: 2, nodes: "ends" } },
        ]);
        await userEvent.click(await within(filters()).findByRole("treeitem", { name: "value is at least 2" }));
        await openStepPicker("edge");
        const value = await screen.findByRole("textbox", { name: FROM });
        await userEvent.clear(value);
        await userEvent.type(value, "9");
        // Past the card's To box, Add a condition and Done to Save step, which waits for a change;
        // the next Tab leaves the editor.
        await userEvent.tab();
        await userEvent.tab();
        await userEvent.tab();
        await userEvent.tab();
        assert.strictEqual(document.activeElement, screen.getByRole("button", { name: "Save step" }));
        assert.equal(session.visibility.steps[0]?.rule.kind === "range" && session.visibility.steps[0].rule.min, 2);
        await userEvent.tab();
        await waitFor(() => {
            assert.deepEqual(session.visibility.steps[0]?.rule, {
                kind: "range",
                attribute: "data.value",
                min: 9,
                nodes: "ends",
            });
        });
        assert.equal(store.get().announcement, 'Saved "value is at least 9". The step is on.');

        // Escape after another change leaves the step as it was, and the status line says so. In
        // the box, Escape keeps what was typed and the editor open, as in every card; from the
        // editor's Filter by menu it closes the editor, saving nothing.
        await openStepPicker("edge");
        const again = screen.getByRole("textbox", { name: FROM });
        await userEvent.clear(again);
        await userEvent.type(again, "10");
        await userEvent.keyboard("{Escape}");
        assert.equal((again as HTMLInputElement).value, "10");
        assert.isNotNull(store.get().inspected);
        screen.getByRole("combobox", { name: "Filter by" }).focus();
        await userEvent.keyboard("{Escape}");
        assert.isNull(store.get().inspected);
        assert.equal(store.get().announcement, 'Not saved: "value is at least 9" is as it was.');
        assert.equal(session.visibility.steps[0]?.rule.kind === "range" && session.visibility.steps[0].rule.min, 9);
    });

    it("leaving an off step's editor with no edit leaves the step off", async () => {
        const { session, store } = await openWithGraph();
        const rule = { kind: "range", attribute: "data.value", min: 9, nodes: "ends" } as const;
        await session.visibility.setSteps([{ id: "a", on: false, rule }]);
        await userEvent.click(await within(filters()).findByRole("treeitem", { name: "value is at least 9" }));
        await screen.findByRole("button", { name: "Save and turn on" });
        await userEvent.click(screen.getByRole("button", { name: "Graph" }));
        await waitFor(() => {
            assert.equal(store.get().place, "graph");
        });
        assert.deepEqual(session.visibility.steps, [{ id: "a", on: false, rule }]);
        assert.equal(session.visibility.summary.visibleNodes, 8);
        assert.isNull(screen.queryByRole("button", { name: /^Filter: / }));
    });

    it("a step deleted while its editor is open stays deleted when the editor closes", async () => {
        const { session, store } = await openWithGraph();
        await session.visibility.setSteps([
            { id: "a", on: false, rule: { kind: "range", attribute: "data.value", min: 2, nodes: "ends" } },
        ]);
        // An edited step's editor would save it on leaving.
        await userEvent.click(await within(filters()).findByRole("treeitem", { name: "value is at least 2" }));
        await openStepPicker("edge");
        const value = await screen.findByRole("textbox", { name: FROM });
        await userEvent.clear(value);
        await userEvent.type(value, "9");
        within(filters()).getByRole("treeitem", { name: "value is at least 2" }).focus();
        await userEvent.keyboard("{Shift>}{F10}{/Shift}");
        await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
        await waitFor(() => {
            assert.lengthOf(session.visibility.steps, 0);
        });
        // Something else selected closes the editor: the deleted step is not written back.
        await columnVerb("edge", "value", "Details");
        await waitFor(() => {
            assert.equal(store.get().inspected?.kind, "attribute");
        });
        assert.lengthOf(session.visibility.steps, 0);
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
