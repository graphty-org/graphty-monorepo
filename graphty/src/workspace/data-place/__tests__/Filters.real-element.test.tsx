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

import { columnVerb } from "../../../test/column-header";
import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { GRAPH_FILE_GML } from "../fixtures";
import { addStepCondition, openStepPicker, stepPicker } from "./stepCards";

/**
 * Renders the workspace on the Data place, waits for the session and loads the small graph file
 * (8 nodes, 9 edges; edge `value` 9 or more on 4 edges whose ends are 5 nodes).
 * @returns the session and the chrome store.
 */
async function openWithGraph(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: GRAPH_FILE_GML } });
    return { session, store };
}

/** The number condition card's From box, on the edge column `value` (2 to 31). */
const FROM = "value from, number";

describe("Filters on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("adds an edge-attribute step from Filter to..., and the row, chip and status agree with the element", async () => {
        const { session, store } = await openWithGraph();
        const filters = (): HTMLElement =>
            within(screen.getByRole("region", { name: "Data place" })).getByRole("tree", { name: "Filters" });

        // Filter to... from the column's header in the table (the Data place lists no attributes).
        await columnVerb("edge", "value", "Filter to...");
        assert.deepEqual(store.get().inspected, { kind: "filter-step", id: "new:edge:data.value" });

        // The editor says what an edge-attribute step keeps.
        await screen.findByText("Keeps edges that pass and the nodes at their ends.");
        const from = screen.getByRole("textbox", { name: FROM });
        await userEvent.clear(from);
        await userEvent.type(from, "9");
        await userEvent.click(screen.getByRole("button", { name: "Add step" }));

        await waitFor(() => {
            assert.equal(session.visibility.steps.length, 1);
        });
        const [step] = session.visibility.steps;
        assert.deepEqual(step.rule, { kind: "range", attribute: "data.value", min: 9, max: 31, nodes: "ends" });
        const { visibleNodes, totalNodes, visibleEdges, totalEdges } = session.visibility.summary;
        assert.deepEqual([visibleNodes, totalNodes, visibleEdges], [5, 8, 4]);
        // A step over an edge column names both counts, on its row and on the header chip.
        const edgesShown = `5 of 8 nodes, ${String(visibleEdges)} of ${String(totalEdges)} edges`;

        const stepRow = await within(filters()).findByRole("treeitem", { name: "value is between 9 and 31" });
        // The outcome shows under the sentence, on the row's second line.
        await waitFor(() => {
            const outcome = within(stepRow).getByText(
                `8 to 5 nodes, ${String(totalEdges)} to ${String(visibleEdges)} edges`,
            );
            assert.isTrue(outcome.checkVisibility());
        });
        assert.isNull(stepRow.getAttribute("data-dimmed"));
        // The chip's tooltip names the step that is on.
        const chip = screen.getByRole("button", { name: `Filter: ${edgesShown}` });
        await userEvent.hover(chip);
        await screen.findByText(
            'Showing only: "value is between 9 and 31". Click to open Filters, where you can turn it off.',
            {},
        );
        await userEvent.unhover(chip);
        await waitFor(() => {
            assert.equal(store.get().announcement, "Filter on: 5 of 8 nodes, 4 edges");
        });

        // The step's own editor says it is on, as its row does.
        act(() => {
            store.set({ inspected: { kind: "filter-step", id: step.id } });
        });
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        await inspector.findByText("On");
        // The step whose editor is open is marked in the list, as an inspected row is.
        assert.equal(
            within(filters())
                .getByRole("treeitem", { name: "value is between 9 and 31" })
                .getAttribute("aria-selected"),
            "true",
        );

        // The checkbox's tooltip says what a click does.
        const tick = screen.getByRole("checkbox", { name: "Apply step: value is between 9 and 31" });
        await userEvent.hover(tick);
        await screen.findByText("Turn this step off", {});
        await userEvent.unhover(tick);

        // Untick: the full graph, the chip gone, the row and the editor say off.
        await userEvent.click(tick);
        await waitFor(() => {
            assert.isFalse(session.visibility.steps[0]?.on);
        });
        await inspector.findByText("Off");
        assert.equal(session.visibility.summary.visibleNodes, 8);
        await waitFor(() => {
            assert.isNull(screen.queryByRole("button", { name: /^Filter: / }));
            const offRow = within(filters()).getByRole("treeitem");
            assert.isTrue(within(offRow).getByText("off").checkVisibility());
            assert.equal(offRow.getAttribute("data-dimmed"), "");
        });
        assert.equal(store.get().announcement, "Filter off");

        // Editing the step while it is off: the button says saving turns it on.
        act(() => {
            store.set({ inspected: { kind: "filter-step", id: step.id } });
        });
        const save = await inspector.findByRole("button", { name: "Save and turn on" });
        // The step's card is in its Which edges picker, folded to a chip until clicked.
        await openStepPicker("edge");
        const value = inspector.getByRole("textbox", { name: FROM });
        await userEvent.clear(value);
        await userEvent.type(value, "10");
        await waitFor(() => {
            assert.isFalse(save.hasAttribute("disabled"));
        });
        await userEvent.click(save);
        await waitFor(() => {
            assert.equal(store.get().announcement, 'Saved "value is between 10 and 31". The step is on.');
            assert.isTrue(session.visibility.steps[0]?.on);
        });
        await within(filters()).findByRole("treeitem", { name: "value is between 10 and 31" });
        // Undo restores the step as it was: the old rule, off.
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await within(filters()).findByRole("treeitem", { name: "value is between 9 and 31" });
        assert.isFalse(session.visibility.steps[0]?.on);

        // Undo puts the step back on and the notice names it.
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.isTrue(session.visibility.steps[0]?.on);
            assert.equal(store.get().notice?.message, 'Undid turning off the filter step "value is between 9 and 31".');
        });
        await screen.findByRole("button", { name: `Filter: ${edgesShown}` });

        // The chip opens the Data place.
        store.set({ place: "graph" });
        await userEvent.click(screen.getByRole("button", { name: `Filter: ${edgesShown}` }));
        assert.equal(store.get().place, "data");

        // The row menu deletes the step.
        const again = within(filters()).getByRole("treeitem", { name: "value is between 9 and 31" });
        again.focus();
        await userEvent.keyboard("{Shift>}{F10}{/Shift}");
        await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
        await waitFor(() => {
            assert.lengthOf(session.visibility.steps, 0);
        });
    });

    it("the toolbar's Filters tool opens an editor whose disabled Add step says what is missing", async () => {
        const { session, store } = await openWithGraph();
        store.set({ place: "graph" });
        await userEvent.click(await screen.findByRole("button", { name: "Filters" }));
        const add = await screen.findByRole("button", { name: "Add step" });
        assert.equal(add.getAttribute("aria-disabled"), "true");

        // Hover names the missing attribute; a click adds nothing.
        await userEvent.hover(add);
        await screen.findByText("Add a condition first", {});
        await userEvent.click(add);
        assert.lengthOf(session.visibility.steps, 0);
        await userEvent.unhover(add);

        // With a condition and no text, focus names the missing value; Enter adds nothing.
        await addStepCondition("label");
        await userEvent.click(screen.getByRole("combobox", { name: "label: text to match" }));
        await userEvent.keyboard("{Enter}");
        assert.lengthOf(session.visibility.steps, 0);
        // Enter folded the cards to the Which nodes row; past Which edges, to Add step.
        await waitFor(() => {
            assert.match(document.activeElement?.getAttribute("aria-label") ?? "", /^Which nodes/);
        });
        await userEvent.tab();
        await userEvent.tab();
        assert.equal(document.activeElement, add);
        await screen.findByText("Type a value first", {});

        // A whole rule enables it, and it adds the step.
        await openStepPicker("node");
        await userEvent.type(screen.getByRole("combobox", { name: "label: text to match" }), "Cos");
        assert.isNull(add.getAttribute("aria-disabled"));
        await userEvent.click(add);
        await waitFor(() => {
            assert.lengthOf(session.visibility.steps, 1);
        });
    });

    it("builds a step from a node card and an edge card, Hide hides what they keep, and Undo turns it back on", async () => {
        const { session } = await openWithGraph();
        await userEvent.click(screen.getByRole("button", { name: "Add filter step" }));
        // The cards a style layer's Which nodes and Which edges pickers draw.
        await addStepCondition("label");
        await userEvent.type(screen.getByRole("combobox", { name: "label: text to match" }), "Cos");
        await addStepCondition("value", "edge");
        const from = await screen.findByRole("textbox", { name: FROM });
        await userEvent.clear(from);
        await userEvent.type(from, "9");
        await userEvent.click(screen.getByText("Hide"));
        await userEvent.click(screen.getByRole("button", { name: "Add step" }));

        await waitFor(() => {
            assert.deepEqual(session.visibility.steps[0]?.rule, {
                kind: "not",
                of: {
                    kind: "all",
                    of: [
                        { kind: "text", reads: "data.label", mode: "substring", text: "Cos" },
                        { kind: "range", attribute: "data.value", min: 9, max: 31, nodes: "ends" },
                    ],
                },
            });
        });
        const name = "not: label contains Cos and value is between 9 and 31";
        await screen.findByRole("treeitem", { name });

        // Its box turns it off; Undo turns it back on.
        await userEvent.click(screen.getByRole("checkbox", { name: `Apply step: ${name}` }));
        await waitFor(() => {
            assert.isFalse(session.visibility.steps[0]?.on);
        });
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.isTrue(session.visibility.steps[0]?.on);
        });

        // Its editor reads the cards back into their pickers, Hide still chosen.
        await userEvent.click(screen.getByRole("treeitem", { name }));
        const nodes = await stepPicker("node");
        const edges = await stepPicker("edge");
        assert.match(within(nodes).getByRole("button").getAttribute("aria-label") ?? "", /label contains Cos/);
        assert.match(within(edges).getByRole("button").getAttribute("aria-label") ?? "", /value/);
        assert.isTrue(screen.getByRole<HTMLInputElement>("radio", { name: "Hide" }).checked);
    });

    it("adds a largest-component step from the section's +", async () => {
        const { session } = await openWithGraph();
        await userEvent.click(screen.getByRole("button", { name: "Add filter step" }));
        await userEvent.click(screen.getByRole("combobox", { name: "Filter by" }));
        await userEvent.click(await screen.findByRole("option", { name: "Largest component" }));
        await userEvent.click(screen.getByRole("button", { name: "Add step" }));
        await waitFor(() => {
            assert.deepEqual(session.visibility.steps[0]?.rule, { kind: "member", of: "largest-component" });
        });
        await screen.findByRole("treeitem", { name: "in the largest component" });
    });
    it("drops a new step left without Add step, says so, and never writes it", async () => {
        const { session, store } = await openWithGraph();
        await userEvent.click(screen.getByRole("button", { name: "Add filter step" }));
        await addStepCondition("label");

        // Opening an attribute's Details moves the inspector off the editor: the half-made
        // step adds nothing, the notice says so, and "+" starts again.
        await columnVerb("edge", "value", "Details");
        await waitFor(() => {
            assert.equal(store.get().inspected?.kind, "attribute");
        });
        assert.lengthOf(session.visibility.steps, 0);
        assert.equal(store.get().notice?.message, "Filter step not added. Press Add step to use a step.");
        await userEvent.click(screen.getByRole("button", { name: "Add filter step" }));
        // A fresh editor: no card.
        await screen.findByRole("button", { name: "Add a condition" });
        assert.isNull(screen.queryByRole("group", { name: /^label/ }));

        // Escape in the editor cancels it and says so once.
        await addStepCondition("label");
        screen.getByRole("combobox", { name: "Filter by" }).focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(store.get().inspected);
        });
        assert.equal(store.get().announcement, "Step not added.");

        // A whole rule is not added when a click leaves the editor either: it is named.
        await userEvent.click(screen.getByRole("button", { name: "Add filter step" }));
        await addStepCondition("label");
        await userEvent.type(screen.getByRole("combobox", { name: "label: text to match" }), "Cos");
        await screen.findByText("8 to 1 nodes");
        await columnVerb("edge", "value", "Details");
        await waitFor(() => {
            assert.equal(
                store.get().notice?.message,
                'Filter step not added: "label contains Cos". Press Add step to use a step.',
            );
        });
        assert.equal(store.get().inspected?.kind, "attribute");
        assert.lengthOf(session.visibility.steps, 0);
        assert.equal(session.visibility.summary.visibleNodes, 8);
    });

    it("the text box is named, Enter takes a highlighted value, and a step that matches no node is never added", async () => {
        const { session, store } = await openWithGraph();
        const chooseLabel = async (): Promise<HTMLElement> => {
            await userEvent.click(await screen.findByRole("button", { name: "Add filter step" }));
            await addStepCondition("label");
            return screen.findByRole("combobox", { name: "label: text to match" });
        };

        // Text no label holds: Enter adds nothing, the step says it matches none, and Add
        // step waits.
        const box = await chooseLabel();
        await userEvent.type(box, "Zzz");
        await screen.findByText("8 to 0 nodes");
        const spoken: string[] = [];
        const stop = store.subscribe(() => {
            spoken.push(store.get().announcement ?? "");
        });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.include(spoken, "No node matches this step");
        });
        stop();
        assert.equal(session.visibility.steps.length, 0);
        assert.equal(screen.getByRole("button", { name: "Add step" }).getAttribute("aria-disabled"), "true");
        // Escape in a box holding text keeps the text and the editor; from the editor's other
        // controls, with no list open, Escape closes the editor.
        screen.getByRole("combobox", { name: "Filter by" }).focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(store.get().inspected);
        });

        // A value highlighted in the list: Enter takes it, the next adds the step.
        const again = await chooseLabel();
        await userEvent.type(again, "Cos");
        await screen.findByRole("option", { name: "Cosette" });
        await userEvent.keyboard("{ArrowDown}{Enter}");
        await waitFor(() => {
            assert.equal((again as HTMLInputElement).value, "Cosette");
        });
        assert.equal(session.visibility.steps.length, 0);
        await screen.findByText("8 to 1 nodes");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepEqual(session.visibility.steps[0]?.rule, {
                kind: "text",
                reads: "data.label",
                mode: "substring",
                text: "Cosette",
            });
        });
        assert.equal(session.visibility.summary.visibleNodes, 1);
    });
});
