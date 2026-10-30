/**
 * Keys in the condition cards, on the REAL graphty-element and Les Miserables, by real keys and
 * clicks: a card's remove button comes first in its Tab order, where it is drawn; opening a card
 * leaves its suggestion list closed, so ArrowDown and Enter cannot rewrite its rule; Undo shows the
 * undone value in the open card; letters typed and Tab take the attribute they highlight; Enter on
 * a ticked value presses Done; a chip opens its card with focus drawn on its first field; Highest
 * hands focus to its number box, as Starts with does to its text box; a single layer's count names
 * its noun, a number committed with Enter says the new count, and typing says the count once, when
 * it pauses; Escape in a text card's box keeps the text and the picker open.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Selector } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { cardFields } from "../cards";

/** The rule of the layer most tests open: names holding "Mlle" (3 of 77). */
const POSTER: Selector = {
    match: "rule",
    where: { kind: "text", reads: "data.name", mode: "substring", text: "Mlle" },
};

/**
 * Les Miserables in the workspace with one layer, selected in the layer tree.
 * @param name - the layer's name.
 * @param selector - its rule.
 * @param run - a run to start first ("degree", "louvain").
 * @returns The session, the store and the layer's id.
 */
async function openLayer(
    name: string,
    selector: Selector,
    run?: string,
): Promise<{ session: GraphSession; store: WorkspaceStore; id: string }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    if (run !== undefined) {
        await session.runs.start(run, undefined, { style: false, seed: 1 });
    }
    const layer = await session.styles.add({ name, target: "node", selector, set: { "node.color": "#d55e00" } });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    return { session, store, id: layer.id };
}

/**
 * The collapsed Which nodes row.
 * @returns The row button.
 */
async function whichRow(): Promise<HTMLElement> {
    return screen.findByRole("button", { name: /^Which nodes, / });
}

/**
 * Opens the cards from the Which row and waits for focus to land in them.
 * @returns The open cards.
 */
async function openCards(): Promise<HTMLElement> {
    await userEvent.click(await whichRow());
    const region = await screen.findByRole("group", { name: "Which nodes" });
    await waitFor(() => {
        assert.isTrue(region.contains(document.activeElement), "focus is in the cards");
    });
    return region;
}

/**
 * The text a layer's one text rule holds.
 * @param session - The session.
 * @param id - The layer.
 * @returns the text.
 */
function textOf(session: GraphSession, id: string): string | undefined {
    const selector = session.styles.get(id)?.selector;
    return selector?.match === "rule" && selector.where.kind === "text" ? selector.where.text : undefined;
}

/**
 * Adds a card on a field from Add a condition, by its name.
 * @param region - the open cards.
 * @param field - the field's name.
 * @returns The card.
 */
async function addCard(region: HTMLElement, field: string): Promise<HTMLElement> {
    await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(`^${field}(,|$)`) }));
    return waitFor(() => within(region).getByRole("group", { name: new RegExp(`^${field}(,|$)`) }));
}

describe("keys in the condition cards, on the real element", () => {
    it("a card's Tab order is its remove button, its match, its values, then Add a condition and Done", async () => {
        await openLayer("Poster", POSTER);
        const region = await openCards();
        const card = within(region).getByRole("group", { name: /^name/ });
        // The header names its count with its noun.
        assert.include(card.querySelector(".ws-card-head")?.textContent ?? "", "3 nodes");
        // Focus opened on the text box: two steps back is the remove button, drawn first.
        await userEvent.keyboard("{Shift>}{Tab}{Tab}{/Shift}");
        assert.strictEqual(document.activeElement?.getAttribute("aria-label"), "Remove name");
        const order: string[] = [];
        for (let press = 0; press < 5; press++) {
            await userEvent.keyboard("{Tab}");
            const active = document.activeElement as HTMLInputElement | null;
            order.push(
                active?.getAttribute("aria-label") ??
                    active?.labels?.[0]?.textContent?.trim() ??
                    active?.textContent?.trim() ??
                    "",
            );
        }
        assert.deepEqual(order, ["name: how to match", "name: text to match", "Match case", "Add a condition", "Done"]);
    });

    it("opening a card leaves its list closed, so ArrowDown and Enter keep the rule", async () => {
        const { session, id } = await openLayer("Poster", POSTER);
        const before = session.styles.get(id)?.selector;
        await openCards();
        await waitFor(() => {
            assert.strictEqual(document.activeElement?.getAttribute("aria-label"), "name: text to match");
        });
        assert.isNull(screen.queryByRole("listbox"), "the suggestion list opened on its own");
        await userEvent.keyboard("{ArrowDown}{Enter}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: "Which nodes" }), "Enter closed the cards");
        });
        assert.deepEqual(session.styles.get(id)?.selector, before, "the rule changed");
    });

    it("Undo shows the undone value in the open card at once", async () => {
        const { session, id } = await openLayer("Poster", POSTER);
        await openCards();
        const box = await screen.findByRole<HTMLInputElement>("combobox", { name: "name: text to match" });
        // A suggestion taken from the list (not typing, which the box's own undo would take back).
        await userEvent.keyboard("{ArrowDown}");
        await screen.findByRole("listbox");
        await userEvent.keyboard("{ArrowDown}{Enter}");
        await waitFor(() => {
            assert.match(textOf(session, id) ?? "", /^Mlle ./);
        });
        assert.notStrictEqual(box.value, "Mlle");
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.strictEqual(textOf(session, id), "Mlle");
            assert.strictEqual(box.value, "Mlle", "the open card still shows the undone text");
        });
    });

    it("letters typed and Tab take the attribute they highlight", async () => {
        await openLayer("Plain", { match: "everything" });
        const region = await openCards();
        const add = within(region).getByRole("button", { name: "Add a condition" });
        assert.strictEqual(document.activeElement, add, "a layer with no card opens on Add a condition");
        assert.isNull(screen.queryByRole("listbox"), "its list waits for a press");
        await userEvent.keyboard("{Enter}");
        await screen.findByRole("listbox");
        await userEvent.keyboard("nam{Tab}");
        const card = await waitFor(() => within(region).getByRole("group", { name: /^name(,|$)/ }));
        await waitFor(() => {
            assert.strictEqual(
                document.activeElement,
                within(card).getByRole("combobox", { name: "name: text to match" }),
            );
        });
    });

    it("a chip opens its card with focus drawn, and Enter on a ticked value presses Done", async () => {
        const { session } = await openLayer("Groups", { match: "everything" }, "louvain");
        const group = cardFields(session, "node").find((field) => field.path.endsWith(".group"));
        assert.isDefined(group);
        const name = group?.name ?? "";
        const region = await openCards();
        const card = await addCard(region, name);
        await userEvent.click(within(card).getAllByRole("checkbox")[0]);
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: "Which nodes" }), "Enter on the value closed the cards");
        });
        const chip = (await whichRow()).querySelector<HTMLElement>("[data-chip]");
        assert.isNotNull(chip);
        if (chip === null) {
            return;
        }
        await userEvent.click(chip);
        const match = await screen.findByRole("combobox", { name: `${name}: how to match` });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, match, "focus is on the card's first field");
        });
        const field = match.closest<HTMLElement>(".cm-field");
        assert.isNotNull(field);
        assert.notStrictEqual(
            getComputedStyle(field ?? match).outlineColor,
            "rgba(0, 0, 0, 0)",
            "the field draws no focus ring",
        );
    });

    it("Highest hands focus to its number box, and Enter there says the new count in nodes", async () => {
        const { session, store } = await openLayer("Busy", { match: "everything" }, "degree");
        const degree = cardFields(session, "node").find((field) => field.path.endsWith(".value"));
        assert.isDefined(degree);
        const name = degree?.name ?? "";
        assert.match((await whichRow()).getAttribute("aria-label") ?? "", /^Which nodes, 77 of 77 nodes, /);
        const region = await openCards();
        const card = await addCard(region, name);
        await userEvent.click(within(card).getByRole("combobox", { name: `${name}: how to match` }));
        await userEvent.click(await screen.findByRole("option", { name: "Highest" }));
        const box = within(card).getByRole("textbox", { name: `${name}: how many` });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, box, "focus is on the number box");
        });
        await userEvent.keyboard("5{Enter}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: "Which nodes" }), "Enter closed the cards");
            assert.match(store.get().announcement ?? "", /^\d+ of 77 nodes$/);
        });
    });

    it("Starts with hands focus to the text box: the letters land there, and the count is spoken once", async () => {
        const { session, store, id } = await openLayer("Names", { match: "everything" });
        const region = await openCards();
        const card = await addCard(region, "name");
        await userEvent.click(within(card).getByRole("combobox", { name: "name: how to match" }));
        await userEvent.click(await screen.findByRole("option", { name: "Starts with" }));
        const box = within(card).getByRole<HTMLInputElement>("combobox", { name: "name: text to match" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, box, "focus is in the text box");
        });
        const spoken: string[] = [];
        const stop = store.subscribe(() => {
            const words = store.get().announcement ?? "";
            if (/ of 77 nodes$/.test(words) && spoken.at(-1) !== words) {
                spoken.push(words);
            }
        });
        await userEvent.keyboard("Mlle");
        assert.strictEqual(box.value, "Mlle", "the letters are in the box");
        await waitFor(() => {
            assert.strictEqual(textOf(session, id), "Mlle");
            assert.deepEqual(spoken, ["3 of 77 nodes"], "one count, once typing paused");
        });
        stop();
    });

    it("Escape in a text card's box keeps the text and the picker open", async () => {
        const { session, id } = await openLayer("Names", { match: "everything" });
        const region = await openCards();
        const card = await addCard(region, "name");
        const box = within(card).getByRole<HTMLInputElement>("combobox", { name: "name: text to match" });
        await userEvent.click(box);
        await userEvent.keyboard("Mlle");
        // The first Escape closes the list of names holding the text; the next keeps the picker.
        await userEvent.keyboard("{Escape}{Escape}");
        assert.strictEqual(box.value, "Mlle");
        assert.isTrue(region.isConnected, "the picker stays open");
        assert.strictEqual(document.activeElement, box, "focus stays in the box");
        await waitFor(() => {
            assert.strictEqual(textOf(session, id), "Mlle");
        });
    });
});
