/**
 * Filters on the REAL graphty-element: a step added from an attribute's Filter to... is the
 * element's (`visibility.steps`), the row, the chip and the status line read the element's counts,
 * the checkbox switches the step, and Undo names the step.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { GRAPH_FILE_GML } from "../fixtures";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * Renders the workspace on the Data place, waits for the session and loads the small graph file
 * (8 nodes, 9 edges; edge `value` 9 or more on 4 edges whose ends are 5 nodes).
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

describe("Filters on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it(
        "adds an edge-attribute step from Filter to..., and the row, chip and status agree with the element",
        async () => {
            const { session, store } = await openWithGraph();
            const filters = (): HTMLElement =>
                within(screen.getByRole("region", { name: "Data place" })).getByRole("tree", { name: "Filters" });

            const row = await screen.findByRole("treeitem", { name: "value, edge attribute" });
            row.focus();
            await userEvent.keyboard("{Shift>}{F10}{/Shift}");
            await userEvent.click(await screen.findByRole("menuitem", { name: "Filter to..." }));
            assert.deepEqual(store.get().inspected, { kind: "filter-step", id: "new:edge:data.value" });
            // The attribute it was opened from stays marked.
            assert.equal(row.getAttribute("aria-selected"), "true");

            // The editor says what an edge-attribute step keeps.
            await screen.findByText("Keeps edges that pass and the nodes at their ends.");
            await userEvent.type(screen.getByRole("textbox", { name: "Value" }), "9");
            await userEvent.click(screen.getByRole("button", { name: "Add step" }));

            await waitFor(() => {
                assert.equal(session.visibility.steps.length, 1);
            });
            const [step] = session.visibility.steps;
            assert.deepEqual(step.rule, { kind: "range", attribute: "data.value", min: 9, nodes: "ends" });
            const { visibleNodes, totalNodes, visibleEdges } = session.visibility.summary;
            assert.deepEqual([visibleNodes, totalNodes, visibleEdges], [5, 8, 4]);

            const stepRow = await within(filters()).findByRole("treeitem", { name: "value is at least 9" });
            // The sentence has the row to itself; the outcome is its description.
            await waitFor(() => {
                assert.isNull(within(stepRow).queryByTestId("tree-count"));
                assert.include(stepRow.textContent, "8 to 5 nodes");
            });
            assert.isNotNull(screen.getByRole("button", { name: "Filter: 5 of 8 nodes" }));
            await waitFor(() => {
                assert.equal(store.get().announcement, "Filter on: 5 of 8 nodes, 4 edges");
            });

            // The step's own editor says it is on, as its row does.
            act(() => {
                store.set({ inspected: { kind: "filter-step", id: step.id } });
            });
            const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
            await inspector.findByText("On");

            // Untick: the full graph, the chip gone, the row and the editor say off.
            await userEvent.click(screen.getByRole("checkbox", { name: "Apply step: value is at least 9" }));
            await waitFor(() => {
                assert.isFalse(session.visibility.steps[0]?.on);
            });
            await inspector.findByText("Off");
            assert.equal(session.visibility.summary.visibleNodes, 8);
            await waitFor(() => {
                assert.isNull(screen.queryByRole("button", { name: /^Filter: / }));
                assert.include(within(filters()).getByRole("treeitem").textContent, "off");
            });
            assert.equal(store.get().announcement, "Filter off");

            // Editing the step while it is off: Save step waits for a change, and the save is said.
            act(() => {
                store.set({ inspected: { kind: "filter-step", id: step.id } });
            });
            const save = await inspector.findByRole("button", { name: "Save step" });
            assert.isTrue(save.hasAttribute("disabled"));
            const value = inspector.getByRole("textbox", { name: "Value" });
            await userEvent.clear(value);
            await userEvent.type(value, "10");
            await waitFor(() => {
                assert.isFalse(save.hasAttribute("disabled"));
            });
            await userEvent.click(save);
            await waitFor(() => {
                assert.equal(store.get().announcement, 'Saved "value is at least 10" (off).');
            });
            await within(filters()).findByRole("treeitem", { name: "value is at least 10" });
            await userEvent.click(screen.getByRole("button", { name: "Undo" }));
            await within(filters()).findByRole("treeitem", { name: "value is at least 9" });

            // Undo puts the step back on and the notice names it.
            await userEvent.click(screen.getByRole("button", { name: "Undo" }));
            await waitFor(() => {
                assert.isTrue(session.visibility.steps[0]?.on);
                assert.equal(store.get().notice?.message, 'Undid turning off "value is at least 9".');
            });
            await screen.findByRole("button", { name: "Filter: 5 of 8 nodes" });

            // The chip opens the Data place.
            store.set({ place: "graph" });
            await userEvent.click(screen.getByRole("button", { name: "Filter: 5 of 8 nodes" }));
            assert.equal(store.get().place, "data");

            // The row menu deletes the step.
            const again = within(filters()).getByRole("treeitem", { name: "value is at least 9" });
            again.focus();
            await userEvent.keyboard("{Shift>}{F10}{/Shift}");
            await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
            await waitFor(() => {
                assert.lengthOf(session.visibility.steps, 0);
            });
        },
        TIMEOUT_MS,
    );

    it(
        "adds a largest-component step from the section's +",
        async () => {
            const { session } = await openWithGraph();
            await userEvent.click(screen.getByRole("button", { name: "Add filter step" }));
            await userEvent.click(screen.getByRole("combobox", { name: "Keep" }));
            await userEvent.click(await screen.findByRole("option", { name: "the largest component" }));
            await userEvent.click(screen.getByRole("button", { name: "Add step" }));
            await waitFor(() => {
                assert.deepEqual(session.visibility.steps[0]?.rule, { kind: "member", of: "largest-component" });
            });
            await screen.findByRole("treeitem", { name: "in the largest component" });
        },
        TIMEOUT_MS,
    );
});
