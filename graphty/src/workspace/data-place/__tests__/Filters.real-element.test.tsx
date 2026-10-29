/**
 * Filter cards on the REAL graphty-element (design/data/filter-cards.md section 5): every card is
 * one of the element's filter conditions (`visibility.conditions`), its chip is the element's count
 * (`conditionCounts`), its Select / Hide toggle writes the condition's effect, its box switches it,
 * and every change is one undo step. Driven by real clicks and keys only.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent as realInput } from "vitest/browser";

import { columnVerb } from "../../../test/column-header";
import { render, screen, waitFor, within } from "../../../test/test-utils";
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

/**
 * The Filters list in the Data place.
 * @returns the list.
 */
const filters = (): HTMLElement =>
    within(screen.getByRole("region", { name: "Data place" })).getByRole("list", { name: "Filters" });

/**
 * One card, by the start of its name.
 * @param name - its words ("value is between 9 and 31").
 * @returns queries inside it.
 */
async function card(name: string): Promise<ReturnType<typeof within>> {
    const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    return within(await within(filters()).findByRole("group", { name: new RegExp(`^${escaped}`) }));
}

/**
 * Picks a row of the Filters "+" list by its name (a field's option reads "label, 8 values").
 * @param name - the row's name.
 */
async function addFromPlus(name: string): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: "Add filter" }));
    const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(`^${escaped}(,|$)`) }));
}

/** Clicks blank space at the foot of the Data place, which cannot take focus. */
async function clickBlank(): Promise<void> {
    const place = screen.getByRole("region", { name: "Data place" });
    await realInput.click(place, { position: { x: 4, y: place.getBoundingClientRect().height - 4 } });
}

/**
 * Opens a resting card by its field's name in its header, as a reader clicks it.
 * @param name - the start of the card's name.
 */
async function openCard(name: string): Promise<void> {
    const header = (await card(name))
        .getAllByRole("button")
        .find((each: HTMLElement) => each.hasAttribute("aria-expanded"));
    assert.isDefined(header);
    if (header?.getAttribute("aria-expanded") === "false") {
        await userEvent.click(header);
    }
}

/** The value card: edges of `value` 9 or more (2 to 31). */
const VALUE = "value is between 9 and 31";

/**
 * Opens a new card on the edge column `value` from its header's Filter to..., types 9 in From and
 * commits it with Enter, which writes the card.
 * @param session - the element's session.
 */
async function addValueCard(session: GraphSession): Promise<void> {
    await columnVerb("edge", "value", "Filter to...");
    const from = await within(filters()).findByRole("textbox", { name: "value from, number" });
    await userEvent.clear(from);
    await userEvent.type(from, "9{Enter}");
    await waitFor(() => {
        assert.lengthOf(session.visibility.conditions, 1);
    });
}

describe("Filter cards on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("Filter to... opens a card with no count that Escape drops; its first value writes it as one step", async () => {
        const { session, store } = await openWithGraph();
        await columnVerb("edge", "value", "Filter to...");
        assert.equal(store.get().place, "data");
        const draft = await card("value");
        // No count before a value, and nothing written.
        assert.isNull(draft.queryByText(/ of /));
        assert.lengthOf(session.visibility.conditions, 0);
        // Escape drops it: no condition, focus on "+".
        await userEvent.click(draft.getByRole("textbox", { name: "value from, number" }));
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(
                within(screen.getByRole("region", { name: "Data place" })).queryByRole("list", { name: "Filters" }),
            );
        });
        assert.lengthOf(session.visibility.conditions, 0);
        assert.equal(document.activeElement?.getAttribute("aria-label"), "Add filter");

        const before = session.history.position;
        await addValueCard(session);
        // One undo step, and the element picks the edge reading: no `ends` written by the app.
        assert.equal(session.history.position, before + 1);
        const [written] = session.visibility.conditions;
        assert.deepEqual(
            { on: written.on, effect: written.effect, rule: written.rule },
            { on: true, effect: "keep", rule: { kind: "range", attribute: "data.value", min: 9, max: 31 } },
        );
        // Keep on an edge value keeps the matched edges and the nodes at their ends.
        const { visibleNodes, visibleEdges } = session.visibility.summary;
        assert.deepEqual([visibleNodes, visibleEdges], [5, 4]);
        // The card's chip is the element's count; the header chip says what is visible.
        const [count] = session.visibility.conditionCounts();
        assert.isNull(count.nodes);
        assert.deepEqual(count.edges, { matched: 4, total: 9 });
        const valueCard = await card(VALUE);
        await valueCard.findByText("4 of 9");
        await screen.findByRole("button", { name: "Filter: 5 of 8 nodes, 4 of 9 edges" });
    });

    it("Select selects the matches and hides nothing; Hide again empties that selection, and Undo restores it", async () => {
        const { session } = await openWithGraph();
        await addValueCard(session);
        const valueCard = await card(VALUE);
        await userEvent.click(valueCard.getByRole("radio", { name: "Select" }));
        await waitFor(() => {
            assert.equal(session.visibility.conditions[0]?.effect, "select");
        });
        assert.equal(session.visibility.summary.visibleNodes, 8);
        assert.lengthOf(session.selection.edges, 4);
        assert.isNull(screen.queryByRole("button", { name: /^Filter: / }));
        // The card's name says what it does.
        await within(filters()).findByRole("group", { name: `${VALUE}, Select` });

        await userEvent.click((await card(VALUE)).getByRole("radio", { name: "Hide edges that do not match" }));
        await waitFor(() => {
            assert.equal(session.visibility.conditions[0]?.effect, "keep");
        });
        assert.lengthOf(session.selection.edges, 0);
        assert.equal(session.visibility.summary.visibleNodes, 5);

        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(session.visibility.conditions[0]?.effect, "select");
        });
        assert.lengthOf(session.selection.edges, 4);
    });

    it("the box switches the card, Undo and Redo name it, and an off card keeps its count", async () => {
        const { session, store } = await openWithGraph();
        await addValueCard(session);
        const valueCard = await card(VALUE);
        await userEvent.click(valueCard.getByRole("checkbox", { name: `Apply ${VALUE}` }));
        await waitFor(() => {
            assert.isFalse(session.visibility.conditions[0]?.on);
        });
        assert.equal(session.visibility.summary.visibleNodes, 8);
        await waitFor(() => {
            assert.isNull(screen.queryByRole("button", { name: /^Filter: / }));
            assert.equal(store.get().announcement, "Filter off");
        });
        await valueCard.findByText("4 of 9");

        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.isTrue(session.visibility.conditions[0]?.on);
            assert.equal(store.get().notice?.message, `Undid turning off the filter "${VALUE}".`);
        });
        await userEvent.click(screen.getByRole("button", { name: /^Redo( |$)/ }));
        await waitFor(() => {
            assert.isFalse(session.visibility.conditions[0]?.on);
            assert.equal(store.get().notice?.message, `Redid turning off the filter "${VALUE}".`);
        });
    });

    it("editing the value is one step that Undo puts back, and the card reads the rule back", async () => {
        const { session } = await openWithGraph();
        await addValueCard(session);
        const from = (await card(VALUE)).getByRole("textbox", { name: "value from, number" });
        await userEvent.clear(from);
        await userEvent.type(from, "20{Enter}");
        await within(filters()).findByRole("group", { name: /^value is between 20 and 31/ });
        assert.deepEqual(session.visibility.conditions[0]?.rule, {
            kind: "range",
            attribute: "data.value",
            min: 20,
            max: 31,
        });
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        const back = await card(VALUE);
        await waitFor(() => {
            const from = back.getByRole("textbox", { name: "value from, number" });
            assert.equal(from instanceof HTMLInputElement ? from.value : "", "9");
        });
    });

    it("the header chip's x switches every hiding card off in one step; Undo turns them back on", async () => {
        const { session } = await openWithGraph();
        await addValueCard(session);
        await addFromPlus("Largest component");
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 2);
        });
        const before = session.history.position;
        await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
        await waitFor(() => {
            assert.isTrue(session.visibility.conditions.every((c) => !c.on));
        });
        assert.equal(session.history.position, before + 1);
        // Cards are kept, off.
        assert.lengthOf(session.visibility.conditions, 2);
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.isTrue(session.visibility.conditions.every((c) => c.on));
        });
    });

    it("+ opens the Style panel's attribute list: search focused, Nodes, Edges and Structure groups, kind glyphs and facts", async () => {
        const { session } = await openWithGraph();
        const add = screen.getByRole("button", { name: "Add filter" });
        assert.equal(add.getAttribute("aria-haspopup"), "listbox");
        assert.equal(add.getAttribute("aria-expanded"), "false");
        await userEvent.click(add);
        const list = within(await screen.findByRole("listbox", { name: "Attributes" }));
        const nodes = list.getByRole("group", { name: "Nodes" });
        const edges = list.getByRole("group", { name: "Edges" });
        const structure = list.getByRole("group", { name: "Structure" });
        assert.equal(add.getAttribute("aria-expanded"), "true");
        // The search has focus, so typing narrows the list at once.
        assert.equal(document.activeElement?.getAttribute("role"), "combobox");
        assert.isNotNull(within(edges).queryByRole("option", { name: /^value(,|$)/ }));
        assert.isNull(within(nodes).queryByRole("option", { name: /^value(,|$)/ }));
        // Each field is drawn with its kind's glyph, and says its fact ("2 to 31").
        const value = within(edges).getByRole("option", { name: /^value, / });
        assert.isNotNull(value.querySelector("svg"));
        assert.isNotNull(within(structure).queryByRole("option", { name: "Largest component" }));
        // Typing narrows every group; the search keeps the Structure rows it names.
        await userEvent.keyboard("lab");
        await waitFor(() => {
            assert.isNull(list.queryByRole("group", { name: "Edges" }));
        });
        assert.isNotNull(screen.getByRole("option", { name: /^label(,|$)/ }));
        // Enter takes the first match: a card on it.
        await userEvent.keyboard("{Enter}");
        await card("label");
        assert.lengthOf(session.visibility.conditions, 0);
    });

    it("Remove takes the card out and moves focus to the next card, the one above, then +", async () => {
        const { session } = await openWithGraph();
        await addValueCard(session);
        await addFromPlus("Largest component");
        await within(filters()).findByRole("group", { name: "in the largest component, Hide" });
        // The largest-component card counts every node of the one component.
        await (await card("in the largest component")).findByText("8 of 8");

        await userEvent.click((await card(VALUE)).getByRole("button", { name: `Remove ${VALUE}` }));
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1);
            assert.equal(document.activeElement?.getAttribute("aria-label"), "in the largest component, Hide");
        });
        await userEvent.click(
            (await card("in the largest component")).getByRole("button", { name: "Remove in the largest component" }),
        );
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 0);
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Add filter");
        });
        // Undo puts it back.
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await within(filters()).findByRole("group", { name: "in the largest component, Hide" });
    });

    it("Neighbors of selection writes a card whose depth and seeds are edited in place", async () => {
        const { session } = await openWithGraph();
        // Marius, whatever type the file's ids read as.
        const marius = session.data.nodes().find((node) => String(node.id) === "4")?.id;
        assert.isDefined(marius);
        await session.selection.apply({ nodes: marius === undefined ? [] : [marius] });
        await addFromPlus("Neighbors of selection");
        await waitFor(() => {
            assert.deepEqual(session.visibility.conditions[0]?.rule, {
                kind: "neighborhood",
                seeds: [marius],
                depth: 1,
            });
        });
        const neighbors = await card("within 1 hop of 4");
        await userEvent.click(neighbors.getByRole("radio", { name: "3" }));
        await waitFor(() => {
            const rule = session.visibility.conditions[0]?.rule;
            assert.equal(rule?.kind === "neighborhood" ? rule.depth : 0, 3);
        });
        // Removing the last seed removes the card.
        await userEvent.click((await card("within 3 hops of 4")).getByRole("button", { name: "Remove 4" }));
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 0);
        });
    });

    it("an exclude condition is named Exclude and has no Select / Hide toggle that could turn it into keep", async () => {
        const { session } = await openWithGraph();
        // Written by another consumer or a later version: the app has no control that writes exclude.
        await session.visibility.addCondition({
            effect: "exclude",
            rule: { kind: "range", attribute: "data.value", min: 9 },
        });
        await waitFor(() => {
            assert.equal(session.visibility.summary.visibleEdges, 5);
        });
        const excluded = within(await within(filters()).findByRole("group", { name: /, Exclude$/ }));
        assert.isNull(excluded.queryByRole("radio", { name: "Select" }));
        assert.isNull(excluded.queryByRole("radio", { name: /^Hide/ }));
        assert.equal(session.visibility.conditions[0]?.effect, "exclude");
    });

    it("a text edit is written when focus leaves the card for blank space, and an empty new card stays until Escape", async () => {
        const { session } = await openWithGraph();
        await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "text", reads: "data.label", mode: "substring", text: "Ma" },
        });
        await openCard("label contains Ma");
        const box = (await card("label contains Ma")).getByRole("combobox", { name: "label: text to match" });
        await realInput.click(box);
        await realInput.keyboard("{End}r");
        // Blank space under the sections cannot take focus: focus falls to the page.
        await clickBlank();
        await waitFor(() => {
            const rule = session.visibility.conditions[0]?.rule;
            assert.equal(rule?.kind === "text" ? rule.text : "", "Mar");
        });
        await within(filters()).findByRole("group", { name: "label contains Mar, Hide" });

        // A new card left empty the same way stays, unwritten: only Escape takes a card back.
        await realInput.click(screen.getByRole("button", { name: "Add filter" }));
        await realInput.click(await screen.findByRole("option", { name: /^label(,|$)/ }));
        const drafts = (): number => within(filters()).getAllByRole("listitem").length;
        await waitFor(() => {
            assert.equal(drafts(), 2);
        });
        await realInput.click(within(filters()).getAllByRole("combobox", { name: "label: text to match" })[0]);
        await clickBlank();
        assert.equal(drafts(), 2);
        assert.lengthOf(session.visibility.conditions, 1);
        await realInput.click(within(filters()).getAllByRole("combobox", { name: "label: text to match" })[0]);
        await realInput.keyboard("{Escape}");
        await waitFor(() => {
            assert.equal(drafts(), 1);
        });
        assert.lengthOf(session.visibility.conditions, 1);
    });

    it("an old Hide step opens as a read-only card that still hides what it hid", async () => {
        const { session } = await openWithGraph();
        // A project saved before cards: one Hide step, read as one keep condition with its rule.
        await session.visibility.setSteps([
            {
                id: "step-1",
                on: true,
                rule: { kind: "not", of: { kind: "text", reads: "data.label", mode: "substring", text: "Cos" } },
            },
        ]);
        const old = await card("not: label contains Cos");
        assert.isNull(old.queryByRole("textbox"));
        assert.equal(session.visibility.summary.visibleNodes, 7);
        // Its box and remove still work.
        await userEvent.click(old.getByRole("checkbox", { name: "Apply not: label contains Cos" }));
        await waitFor(() => {
            assert.equal(session.visibility.summary.visibleNodes, 8);
        });
    });

    it("editing a card read from an old edge step keeps every node, as the step did", async () => {
        const { session } = await openWithGraph();
        // A project saved before cards: a Keep step on the edge field `value`, which hid edges only.
        await session.visibility.setSteps([
            { id: "step-1", on: true, rule: { kind: "range", attribute: "data.value", min: 9 } },
        ]);
        await waitFor(() => {
            assert.deepEqual(
                [session.visibility.summary.visibleNodes, session.visibility.summary.visibleEdges],
                [8, 4],
            );
        });
        await openCard("value");
        const from = (await card("value")).getByRole("textbox", { name: "value from, number" });
        await userEvent.clear(from);
        await userEvent.type(from, "10{Enter}");
        await waitFor(() => {
            const [edited] = session.visibility.conditions;
            assert.equal(edited.rule.kind === "range" ? edited.rule.min : undefined, 10);
        });
        // Still every node: the edit kept the step's reading, not the ends of the matched edges.
        assert.equal(session.visibility.summary.visibleNodes, 8);
        assert.isBelow(session.visibility.summary.visibleEdges, 4);
    });

    it("the toolbar's Filters opens +, and Tab reaches each control of a card by its name", async () => {
        const { session, store } = await openWithGraph();
        await addValueCard(session);
        store.set({ place: "graph" });
        await userEvent.click(await screen.findByRole("button", { name: "Filters" }));
        await screen.findByRole("option", { name: "Largest component" });
        await userEvent.keyboard("{Escape}");

        // In the order drawn: the header (field, remove), then Select / Hide and the on box.
        const valueCard = await card(VALUE);
        valueCard.getByRole("button", { name: "value" }).focus();
        await userEvent.tab();
        assert.equal(document.activeElement?.getAttribute("aria-label"), `Remove ${VALUE}`);
        await userEvent.tab();
        assert.equal(
            document.activeElement?.getAttribute("role") ?? document.activeElement?.getAttribute("type"),
            "radio",
        );
        await userEvent.tab();
        assert.equal(document.activeElement?.getAttribute("aria-label"), `Apply ${VALUE}`);
        // The toggle is named for the card.
        assert.isNotNull(valueCard.getByRole("radiogroup", { name: `${VALUE} action` }));
    });

    it("a text card's count follows the typing and writes nothing until Enter; Escape with a value writes it and goes to the on box", async () => {
        const { session } = await openWithGraph();
        await addFromPlus("label");
        const box = await within(filters()).findByRole("combobox", { name: "label: text to match" });
        assert.equal(document.activeElement, box);
        const before = session.history.position;
        await realInput.keyboard("Ma");
        // Marius alone, counted as typed, with nothing written.
        const draft = await card("label");
        await draft.findByText("1 of 8");
        await realInput.keyboard("{Backspace}{Backspace}e");
        // Every name with an e but Marius.
        await draft.findByText("7 of 8");
        assert.lengthOf(session.visibility.conditions, 0);
        assert.equal(session.history.position, before);
        // The first Escape closes the list of names the typing opened; the next, holding a value,
        // writes it once, keeps the card and puts focus on its on box.
        await realInput.keyboard("{Escape}");
        assert.lengthOf(session.visibility.conditions, 0);
        await realInput.keyboard("{Escape}");
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1);
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Apply label contains e");
        });
        assert.equal(session.history.position, before + 1);
        await (await card("label contains e")).findByText("7 of 8");
    });

    it("Tab out of an empty new card keeps it; Tab out of a typed one writes it", async () => {
        const { session } = await openWithGraph();
        await addFromPlus("label");
        await within(filters()).findByRole("combobox", { name: "label: text to match" });
        await realInput.keyboard("{Tab}");
        assert.isNotNull(within(filters()).queryByRole("group", { name: /^label/ }));
        assert.lengthOf(session.visibility.conditions, 0);
        await realInput.click(within(filters()).getByRole("combobox", { name: "label: text to match" }));
        await realInput.keyboard("Cos{Tab}");
        await waitFor(() => {
            const rule = session.visibility.conditions[0]?.rule;
            assert.equal(rule?.kind === "text" ? rule.text : "", "Cos");
        });
    });

    it("a written card rests as its summary when another opens; one card is open at a time", async () => {
        const { session } = await openWithGraph();
        await addValueCard(session);
        // The value card is open: its From box is drawn.
        assert.isNotNull((await card(VALUE)).queryByRole("textbox", { name: "value from, number" }));
        await addFromPlus("label");
        await card("label");
        // The value card now rests: its header and summary, no body.
        const resting = await card(VALUE);
        assert.isNull(resting.queryByRole("textbox", { name: "value from, number" }));
        assert.equal(resting.getByRole("button", { name: "value" }).getAttribute("aria-expanded"), "false");
        assert.isNotNull(resting.getByText(VALUE));
        // Enter on the resting card's field opens it and closes the other.
        resting.getByRole("button", { name: "value" }).focus();
        await userEvent.keyboard("{Enter}");
        await (await card(VALUE)).findByRole("textbox", { name: "value from, number" });
        // The new label card was left empty: it stays, resting, with nothing written.
        assert.isNull((await card("label")).queryByRole("combobox", { name: "label: text to match" }));
        assert.lengthOf(session.visibility.conditions, 1);
    });
});
