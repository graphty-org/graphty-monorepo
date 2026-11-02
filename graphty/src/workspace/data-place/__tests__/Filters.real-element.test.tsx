/**
 * Filter cards on the REAL graphty-element (design/ui/selection-groups/spec.md, section 3.3): every
 * card is one of the element's filter conditions (`visibility.conditions`) and says what stays,
 * All nodes (or edges) narrowed by Keep and Except, with no effect word; one card is open, every
 * other is one row of on box, name and count; its box switches it; its "..." holds Select N,
 * Duplicate and Delete; and every change is one undo step. Driven by real clicks and keys only.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, UnionLeaf } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { columnVerb } from "../../../test/column-header";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { GRAPH_FILE_GML } from "../fixtures";

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

/**
 * The Filters list in the Data place.
 * @returns the list.
 */
const filters = (): HTMLElement =>
    within(screen.getByRole("region", { name: "Data place" })).getByRole("list", { name: "Filters" });

/**
 * One card, by its name.
 * @param name - its name.
 * @returns queries inside it.
 */
async function card(name: RegExp): Promise<ReturnType<typeof within>> {
    // The card itself, never a group inside it (an open card's step pane is a group too).
    const found = await waitFor(() => {
        const each = [...filters().querySelectorAll<HTMLElement>(":scope > li > [role=group]")].find((group) =>
            name.test(group.getAttribute("aria-label") ?? ""),
        );
        assert.isDefined(each);
        return each;
    });
    return within(found);
}

/**
 * Opens a new card on the edge column `value` from its header's Filter to..., types 9 in From and
 * commits it with Enter, which writes the card.
 * @param session - the element's session.
 */
async function addValueCard(session: GraphSession): Promise<void> {
    await columnVerb("edge", "value", "Filter to...");
    // A new card's step is edited in the selection workspace (selection spec 3.0).
    const from = await screen.findByRole("textbox", { name: "value from, number" });
    await userEvent.clear(from);
    await userEvent.type(from, "9{Enter}");
    await waitFor(() => {
        assert.lengthOf(session.visibility.conditions, 1);
    });
}

/**
 * The open selection workspace (selection spec 3.0), waited for.
 * @returns it.
 */
async function workspace(): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        return found;
    });
}

/**
 * The first condition's selection.
 * @param session - the element's session.
 * @returns the union rule, or undefined.
 */
function unionOf(session: GraphSession): UnionLeaf | undefined {
    const rule = session.visibility.conditions[0]?.rule;
    return rule?.kind === "union" ? rule : undefined;
}

describe("Filter cards on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("Filter to... opens a card as All + Keep; its first value writes it as one step; it reads no effect word", async () => {
        const { session, store } = await openWithGraph();
        const before = session.history.position;
        await addValueCard(session);
        assert.equal(store.get().place, "data");
        assert.equal(session.history.position, before + 1, "one undo step");
        const rule = unionOf(session);
        assert.equal(rule?.side, "edges");
        assert.equal(rule?.branches[0]?.start, "all");
        assert.equal(rule?.branches[0]?.steps[0]?.op, "keep");
        assert.equal(session.visibility.conditions[0]?.effect, "keep");
        assert.equal(session.visibility.summary.visibleEdges, 4);
        for (const word of ["Select", "Filter to", "Filter out"]) {
            assert.isNull(within(filters()).queryByText(word), word);
        }
        await screen.findByRole("button", { name: /^Filter: / });
    });

    it("the box switches the card, Undo and Redo name it, and an off card keeps its count", async () => {
        const { session, store } = await openWithGraph();
        await addValueCard(session);
        const valueCard = await card(/value/);
        await userEvent.click(valueCard.getByRole("checkbox", { name: /^Use / }));
        await waitFor(() => {
            assert.isFalse(session.visibility.conditions[0]?.on);
        });
        assert.equal(session.visibility.summary.visibleEdges, 9);
        await waitFor(() => {
            assert.isNull(screen.queryByRole("button", { name: /^Filter: / }));
        });
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.isTrue(session.visibility.conditions[0]?.on);
            assert.match(store.get().notice?.message ?? "", /^Undid turning off the filter /);
        });
        await userEvent.click(screen.getByRole("button", { name: /^Redo( |$)/ }));
        await waitFor(() => {
            assert.isFalse(session.visibility.conditions[0]?.on);
        });
    });

    it("the header chip's x switches every hiding card off in one step; Undo turns them back on", async () => {
        const { session } = await openWithGraph();
        await addValueCard(session);
        await session.visibility.addCondition({ effect: "keep", rule: { kind: "member", of: "largest-component" } });
        const before = session.history.position;
        await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
        await waitFor(() => {
            assert.isTrue(session.visibility.conditions.every((c) => !c.on));
        });
        assert.equal(session.history.position, before + 1);
        assert.lengthOf(session.visibility.conditions, 2, "cards are kept, off");
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.isTrue(session.visibility.conditions.every((c) => c.on));
        });
    });

    it("one card is open at a time; every other is one row: its on box, name and count", async () => {
        const { session } = await openWithGraph();
        await addValueCard(session);
        await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "text", reads: "data.label", mode: "substring", text: "e" },
        });
        const label = await card(/label/);
        await userEvent.click(label.getByRole("button", { name: /^label/ }));
        await waitFor(() => {
            assert.lengthOf(document.querySelectorAll(".sel-rest"), 1);
        });
        const resting = await card(/value/);
        assert.equal(resting.getByRole("button", { name: /^value/ }).getAttribute("aria-expanded"), "false");
        assert.isNotNull(resting.getByText("4 of 9"));
        assert.isNotNull(resting.getByRole("checkbox", { name: /^Use / }));
    });

    it("Delete in the card's menu takes it out; Undo puts it back", async () => {
        const { session } = await openWithGraph();
        await addValueCard(session);
        const valueCard = await card(/value/);
        await userEvent.click(valueCard.getByRole("treeitem", { name: /^value / }));
        await userEvent.click(await within(await workspace()).findByRole("button", { name: /^More for / }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Delete/ }));
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 0);
        });
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await card(/value/);
    });

    it("Duplicate in the card's menu adds a copy that is opened", async () => {
        const { session } = await openWithGraph();
        await addValueCard(session);
        const valueCard = await card(/value/);
        await userEvent.click(valueCard.getByRole("treeitem", { name: /^value / }));
        await userEvent.click(await within(await workspace()).findByRole("button", { name: /^More for / }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Duplicate/ }));
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 2);
        });
        assert.deepEqual(session.visibility.conditions[1]?.rule, session.visibility.conditions[0]?.rule);
    });

    it("a Filter out card reads as All / Except; an edit writes it as what stays, the picture unchanged", async () => {
        const { session } = await openWithGraph();
        await session.visibility.addCondition({
            effect: "exclude",
            rule: { kind: "range", attribute: "data.value", min: 9 },
        });
        await waitFor(() => {
            assert.equal(session.visibility.summary.visibleEdges, 5);
        });
        const excluded = await card(/value/);
        // A card that removes is named with its verb (repolish 2): "Except value min 9".
        await userEvent.click(excluded.getByRole("button", { name: /value min 9/ }));
        const row = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".sel-step-row[data-row]");
            assert.isNotNull(found);
            return found;
        });
        assert.match(row?.getAttribute("aria-label") ?? "", /^Except, value min 9/);
        await userEvent.click(row?.querySelector(".sel-value") ?? document.body);
        const from = await screen.findByRole("textbox", { name: "value from, number" });
        await userEvent.clear(from);
        await userEvent.type(from, "10{Enter}");
        await waitFor(() => {
            assert.equal(session.visibility.conditions[0]?.effect, "keep");
            assert.equal(unionOf(session)?.branches[0]?.steps[0]?.op, "except");
        });
        // Edges of value 10 or more go, as Filter out took them: 17, 31 and 21.
        assert.equal(session.visibility.summary.visibleEdges, 6);
    });

    it("an old Hide step opens as All / Except and still hides what it hid", async () => {
        const { session } = await openWithGraph();
        await session.visibility.setSteps([
            {
                id: "step-1",
                on: true,
                rule: { kind: "not", of: { kind: "text", reads: "data.label", mode: "substring", text: "Cos" } },
            },
        ]);
        const old = await card(/label/);
        assert.equal(session.visibility.summary.visibleNodes, 7);
        await userEvent.click(old.getByRole("checkbox", { name: /^Use / }));
        await waitFor(() => {
            assert.equal(session.visibility.summary.visibleNodes, 8);
        });
    });

    it("an open card is named by its first step; Space on its title row switches it, its box no Tab stop", async () => {
        const { session } = await openWithGraph();
        await addValueCard(session);
        const title = await waitFor(() => {
            const found = filters().querySelector<HTMLElement>('[data-row="title"]');
            assert.isNotNull(found);
            return found;
        });
        assert.match(title?.getAttribute("aria-label") ?? "", /^value min 9, /);
        const box = within(filters()).getByRole("checkbox", { name: /^Use value min 9/ });
        assert.equal(box.getAttribute("tabindex"), "-1");
        title?.focus();
        await userEvent.keyboard(" ");
        await waitFor(() => {
            assert.isFalse(session.visibility.conditions[0]?.on);
        });
        await waitFor(() => {
            assert.match(title?.getAttribute("aria-label") ?? "", /, off$/);
        });
        // The Filters header says what the cards leave together, only while one hides.
        assert.isNull(document.querySelector("[data-filters-count]"));
    });

    it("a saved keep card on an edge value stays read-only, so no edit brings back the nodes it hid", async () => {
        const { session } = await openWithGraph();
        await session.visibility.addCondition({
            id: "heavy",
            effect: "keep",
            rule: { kind: "range", attribute: "data.value", min: 9 },
        });
        await waitFor(() => {
            assert.equal(session.visibility.summary.visibleNodes, 5);
        });
        const kept = await card(/value/);
        await userEvent.click(kept.getAllByRole("button")[0] ?? document.body);
        await waitFor(() => {
            assert.isNotNull(within(filters()).queryByRole("button", { name: "Delete" }), "its read-only body");
        });
        assert.isNull(filters().querySelector(".sel-editor"), "no editor that would write it as an edges selection");
        assert.equal(session.visibility.summary.visibleNodes, 5);
    });

    it("a saved Select card that is on reads on; a removing card no editor reads counts what stays", async () => {
        const { session } = await openWithGraph();
        await session.visibility.addCondition({
            id: "busy",
            effect: "select",
            rule: { kind: "degree", min: 3 },
        });
        await session.visibility.addCondition({
            id: "out",
            effect: "exclude",
            rule: {
                kind: "union",
                side: "nodes",
                within: "graph",
                branches: [{ start: "none", steps: [{ op: "add", rule: { kind: "degree", min: 3 } }] }],
            },
        });
        const selects = await card(/^Degree min 3/);
        assert.isTrue((selects.getByRole("checkbox", { name: /^Use / }) as HTMLInputElement).checked);
        const matched = session.visibility.conditionCounts().find((each) => each.id === "out")?.nodes?.matched ?? 0;
        const total = session.data.statistics().nodeCount;
        assert.isAbove(matched, 0);
        const removes = [...filters().querySelectorAll<HTMLElement>(":scope > li > [role=group]")][1];
        await waitFor(() => {
            assert.include(removes?.textContent ?? "", `${String(total - matched)} of ${String(total)}`);
        });
    });

    it("the toolbar's Filters opens a new card's value picker", async () => {
        const { store } = await openWithGraph();
        store.set({ place: "graph" });
        await userEvent.click(await screen.findByRole("button", { name: "Filters" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await screen.findByRole("option", { name: "Largest component" });
    });
});
