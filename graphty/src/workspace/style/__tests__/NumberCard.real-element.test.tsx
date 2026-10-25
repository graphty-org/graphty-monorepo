/**
 * The number card on the REAL graphty-element and Les Miserables, typed with real keys. A box is
 * committed on Enter or on leaving it, never per keystroke: a from above its to is held in the card
 * with a message only once committed and never reaches the element (which refuses it); focus put
 * into a box, by a click or by choosing an attribute with Enter, selects its value so typing
 * replaces it; Escape keeps what was typed and the picker open; a digit after a starting 0 replaces the 0;
 * grouping separators are read and any other text is refused with the text kept and an example
 * from the column's own range; leaving the card with refused text says the bound went back; a
 * rule the layer takes clears the notice a refused one left; Highest above the node count is
 * refused and every node reads "all"; a closed Highest chip names its count; a from above its to is
 * named as the reason when the card closes; a refusal goes once the box reads as a number.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, RuleTree } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { cardFields } from "../cards";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Les Miserables in the workspace with a degree run and one blank layer "Busy" selected, its Which
 * picker open on a degree card.
 * @returns The session, the store, the layer's id, the card and the degree field's name.
 */
async function openCard(): Promise<{
    session: GraphSession;
    store: WorkspaceStore;
    id: string;
    card: HTMLElement;
    name: string;
}> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    await session.runs.start("degree", undefined, { style: false });
    const degree = cardFields(session, "node").find((field) => field.path.endsWith(".value"));
    if (degree === undefined) {
        throw new Error("no degree field");
    }
    const layer = await session.styles.add({
        name: "Busy",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Busy, / }));
    await userEvent.click(await screen.findByRole("button", { name: /^Which nodes, / }, { timeout: TIMEOUT_MS }));
    const region = await screen.findByRole("group", { name: "Which nodes" });
    await openConditions(region);
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(`^${degree.name}(,|$)`) }));
    const card = await waitFor(() => within(region).getByRole("group", { name: new RegExp(`^${degree.name}(,|$)`) }));
    return { session, store, id: layer.id, card, name: degree.name };
}

/**
 * Opens "Add a condition"'s list, unless it opened on its own.
 * @param region - the Which nodes group.
 */
async function openConditions(region: HTMLElement): Promise<void> {
    if (screen.queryByRole("listbox") === null) {
        await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
    }
    await screen.findByRole("listbox");
}

/**
 * The range a layer's rule holds.
 * @param session - The session.
 * @param id - The layer.
 * @returns min and max, or undefined when the rule is no range.
 */
function rangeOf(session: GraphSession, id: string): { min?: number; max?: number } | undefined {
    const selector = session.styles.get(id)?.selector;
    const leaf: RuleTree | undefined = selector?.match === "rule" ? selector.where : undefined;
    return leaf?.kind === "range" ? { min: leaf.min, max: leaf.max } : undefined;
}

/**
 * The count a layer's Highest rule keeps.
 * @param session - The session.
 * @param id - The layer.
 * @returns the count, or undefined when the rule is no Highest.
 */
function topOf(session: GraphSession, id: string): number | undefined {
    const selector = session.styles.get(id)?.selector;
    const leaf: RuleTree | undefined = selector?.match === "rule" ? selector.where : undefined;
    return leaf?.kind === "threshold" ? leaf.top : undefined;
}

/** The inspector never fell to its fallback. */
function panelShown(): void {
    assert.isNull(screen.queryByText("This panel could not be shown"), "the inspector is still drawn");
}

describe("number card", () => {
    it("holds a from above its to in the card once committed, writes nothing, and takes a valid range", async () => {
        const { session, store, id, card, name } = await openCard();
        const from = within(card).getByRole("textbox", { name: `${name} from, number` });
        const to = within(card).getByRole("textbox", { name: `${name} to, number` });
        await userEvent.click(from);
        await userEvent.keyboard("20");
        assert.notStrictEqual(rangeOf(session, id)?.min, 20, "typing alone writes nothing");
        await userEvent.tab();
        await waitFor(() => {
            assert.strictEqual(rangeOf(session, id)?.min, 20);
        });
        const before = rangeOf(session, id);

        // Control+A in "to", then 15: below from, but nothing is said until it is committed.
        await userEvent.click(to);
        await userEvent.keyboard("{Control>}a{/Control}15");
        assert.isNull(within(card).queryByRole("alert"), "no message while typing");
        assert.notStrictEqual(to.getAttribute("aria-invalid"), "true");
        await userEvent.tab();
        const alert = await within(card).findByRole("alert");
        assert.match(alert.textContent ?? "", /From is above to/);
        assert.match(alert.textContent ?? "", /The count and drawing still use 20 to /, "says what is still drawn");
        assert.strictEqual((to as HTMLInputElement).value, "15", "the typed text is kept");
        assert.strictEqual(to.getAttribute("aria-invalid"), "true");
        panelShown();
        assert.deepEqual(rangeOf(session, id), before, "the layer keeps the last range it took");
        assert.isNull(store.get().notice, "no refusal notice: nothing was refused");

        // A click back in selects the refused text; 30 is above from: written, message gone.
        await userEvent.click(to);
        await userEvent.keyboard("30");
        await userEvent.tab();
        await waitFor(() => {
            assert.deepEqual(rangeOf(session, id), { min: 20, max: 30 });
        });
        assert.isNull(within(card).queryByRole("alert"));
        panelShown();
    });

    it("selects the value on a click, replaces a starting 0, reads grouping and refuses other text", async () => {
        const { session, id, card, name } = await openCard();
        const from = within(card).getByRole("textbox", { name: `${name} from, number` });
        const to = within(card).getByRole("textbox", { name: `${name} to, number` });

        // A click from outside selects the value: typing replaces it.
        await userEvent.click(to);
        await userEvent.keyboard("30");
        await userEvent.tab();
        await waitFor(() => {
            assert.strictEqual(rangeOf(session, id)?.max, 30);
        });

        // A digit after a starting 0 replaces the 0.
        await userEvent.click(from);
        await userEvent.keyboard("0");
        assert.strictEqual((from as HTMLInputElement).value, "0");
        await userEvent.keyboard("5");
        assert.strictEqual((from as HTMLInputElement).value, "5");
        await userEvent.tab();
        await waitFor(() => {
            assert.strictEqual(rangeOf(session, id)?.min, 5);
        });

        // Grouping separators are read.
        await userEvent.click(to);
        await userEvent.keyboard("1,000");
        await userEvent.tab();
        await waitFor(() => {
            assert.strictEqual(rangeOf(session, id)?.max, 1000);
        });
        assert.strictEqual((to as HTMLInputElement).value, "1000", "leaving shows the number it took");

        // Anything else is refused on commit, the text kept, nothing written, and the message asks
        // for a number with an example from the column's own range.
        await userEvent.click(to);
        await userEvent.keyboard("$1,000");
        assert.isNull(within(card).queryByRole("alert"), "no message while typing");
        await userEvent.tab();
        const alert = await within(card).findByRole("alert");
        const words = alert.textContent ?? "";
        assert.match(words, /"\$1,000" is not a number\. Type a number, like /);
        assert.notMatch(words, /digits only|10000/);
        const field = cardFields(session, "node").find((each) => each.name === name);
        const example = Number(/like ([\d.,]+)\./.exec(words)?.[1]?.replaceAll(",", ""));
        assert.isAtLeast(example, field?.range?.min ?? Number.NaN, "the example is in the column's range");
        assert.isAtMost(example, field?.range?.max ?? Number.NaN);
        assert.strictEqual((to as HTMLInputElement).value, "$1,000", "leaving keeps the refused text");
        assert.strictEqual(rangeOf(session, id)?.max, 1000);
        panelShown();
    });

    it("selects the from box when choosing an attribute by Enter puts focus there: typing 20 gives 20", async () => {
        const { session, id, card, name } = await openCard();
        await userEvent.click(within(card).getByRole("button", { name: `Remove ${name}` }));
        const region = screen.getByRole("group", { name: "Which nodes" });
        await openConditions(region);
        await userEvent.keyboard(`${name}{Enter}`);
        const again = await waitFor(() => within(region).getByRole("group", { name: new RegExp(`^${name}(,|$)`) }));
        const from = within(again).getByRole("textbox", { name: `${name} from, number` });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, from, "focus is in the from box");
        });
        await userEvent.keyboard("20");
        assert.strictEqual((from as HTMLInputElement).value, "20", "the old value was replaced, not added to");
        await userEvent.tab();
        await waitFor(() => {
            assert.strictEqual(rangeOf(session, id)?.min, 20);
        });
    });

    it("Escape keeps what was typed, focus and the picker open, and takes the bound", async () => {
        const { session, id, card, name } = await openCard();
        const from = within(card).getByRole("textbox", { name: `${name} from, number` });
        await userEvent.dblClick(from);
        await userEvent.keyboard("5");
        await userEvent.keyboard("{Escape}");
        assert.strictEqual((from as HTMLInputElement).value, "5", "the typed bound stays");
        assert.strictEqual(document.activeElement, from, "focus stays in the box");
        assert.isTrue(card.isConnected, "the picker stays open");
        await waitFor(() => {
            assert.strictEqual(rangeOf(session, id)?.min, 5);
        });
        // A count it cannot take stays as typed too, with its reason, and the picker stays open.
        await userEvent.click(within(card).getByRole("combobox", { name: new RegExp(`^${name}(: how to match)?$`) }));
        await userEvent.click(await screen.findByRole("option", { name: "Highest" }));
        const top = await within(card).findByRole("textbox", { name: `${name}: how many` });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, top);
        });
        await userEvent.keyboard("10000{Escape}");
        assert.strictEqual((top as HTMLInputElement).value, "10000");
        assert.isTrue(card.isConnected, "the picker stays open");
        await within(card).findByRole("alert");
    });

    it("says the bound went back when the card closes on text it could not take", async () => {
        const { session, store, id, card, name } = await openCard();
        const from = within(card).getByRole("textbox", { name: `${name} from, number` });
        const before = rangeOf(session, id);
        await userEvent.click(from);
        await userEvent.keyboard("abc");
        await userEvent.click(screen.getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.match(store.get().notice?.message ?? "", new RegExp(`^${name}: .* went back to `));
        });
        assert.deepEqual(rangeOf(session, id), before);
    });

    it("clears the refusal notice once a rule is taken", async () => {
        const { session, store, id, card, name } = await openCard();
        store.set({ notice: { message: "That rule could not be used for this layer", error: true } });
        const from = within(card).getByRole("textbox", { name: `${name} from, number` });
        await userEvent.click(from);
        await userEvent.keyboard("3");
        await userEvent.tab();
        await waitFor(() => {
            assert.strictEqual(rangeOf(session, id)?.min, 3);
            assert.isNull(store.get().notice);
        });
    });

    it("refuses a Highest count above the node count, saying how to keep all of them", async () => {
        const { session, id, card, name } = await openCard();
        await userEvent.click(within(card).getByRole("combobox", { name: new RegExp(`^${name}(: how to match)?$`) }));
        await userEvent.click(await screen.findByRole("option", { name: "Highest" }));
        const top = await within(card).findByRole("textbox", { name: `${name}: how many` });
        await waitFor(() => {
            assert.strictEqual(topOf(session, id), 10);
        });
        await userEvent.click(top);
        await userEvent.keyboard("10000");
        await userEvent.tab();
        const total = String(session.data.statistics().nodeCount);
        const alert = await within(card).findByRole("alert");
        assert.include(
            alert.textContent ?? "",
            `There are only ${total} nodes. Type ${total} to keep all ${total}, or fewer.`,
        );
        assert.strictEqual(topOf(session, id), 10, "the layer keeps the count it took");
        const words = within(card).getByText("of all nodes");
        const size = Number.parseFloat(getComputedStyle(words).fontSize);
        assert.isBelow(words.getBoundingClientRect().height, size * 2, "one line");

        // Every node, typed as a count, says "all".
        await userEvent.click(top);
        await userEvent.keyboard(total);
        await userEvent.tab();
        await waitFor(() => {
            assert.strictEqual(topOf(session, id), Number(total));
        });
        await userEvent.click(screen.getByRole("button", { name: "Done" }));
        const row = await screen.findByRole("button", { name: /^Which nodes, / });
        assert.include((row.textContent ?? "").replaceAll("\u00a0", " "), `${name}: all ${total}, ${total} nodes`);
        panelShown();
    });

    it("names both numbers on a closed Highest chip: the count asked for and the nodes it keeps", async () => {
        const { session, id, card, name } = await openCard();
        await userEvent.click(within(card).getByRole("combobox", { name: new RegExp(`^${name}(: how to match)?$`) }));
        await userEvent.click(await screen.findByRole("option", { name: "Highest" }));
        await waitFor(() => {
            assert.strictEqual(topOf(session, id), 10);
        });
        await userEvent.click(screen.getByRole("button", { name: "Done" }));
        const row = await screen.findByRole("button", { name: /^Which nodes, / });
        const kept = session.styles.counts(id).matched;
        await waitFor(() => {
            assert.include(
                (row.textContent ?? "").replaceAll("\u00a0", " "),
                `top 10 by ${name}, ${String(kept)} nodes`,
            );
        });
        assert.include(row.getAttribute("aria-label") ?? "", `top 10 by ${name}, ${String(kept)} nodes`);
    });

    it("says a from above its to was the reason when the card closes on it", async () => {
        const { session, store, id, card, name } = await openCard();
        const from = within(card).getByRole("textbox", { name: `${name} from, number` });
        const to = within(card).getByRole("textbox", { name: `${name} to, number` });
        await userEvent.click(to);
        await userEvent.keyboard("25");
        await userEvent.tab();
        await waitFor(() => {
            assert.strictEqual(rangeOf(session, id)?.max, 25);
        });
        const before = rangeOf(session, id);
        await userEvent.click(from);
        await userEvent.keyboard("30");
        await userEvent.keyboard("{Enter}");
        await within(card).findByRole("alert");
        await userEvent.click(screen.getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.match(
                store.get().notice?.message ?? "",
                new RegExp(`^${name}: from is above to \\(30 is more than 25\\), so it went back to `),
            );
        });
        assert.notMatch(store.get().notice?.message ?? "", /not a number/);
        assert.deepEqual(rangeOf(session, id), before);
    });

    it("clears a refusal as soon as the box reads as a number, and raises none while typing", async () => {
        const { card, name } = await openCard();
        const to = within(card).getByRole("textbox", { name: `${name} to, number` });
        await userEvent.click(to);
        await userEvent.keyboard("$30");
        await userEvent.keyboard("{Enter}");
        await within(card).findByRole("alert");
        assert.strictEqual(to.getAttribute("aria-invalid"), "true");
        // Still no number: the refusal stays.
        await userEvent.keyboard("{End}x{Home}{Delete}");
        assert.strictEqual((to as HTMLInputElement).value, "30x");
        assert.isNotNull(within(card).queryByRole("alert"), "30x is still no number");
        await userEvent.keyboard("{End}{Backspace}");
        assert.strictEqual((to as HTMLInputElement).value, "30");
        await waitFor(() => {
            assert.isNull(within(card).queryByRole("alert"), "30 reads as a number: the message is gone");
        });
        assert.notStrictEqual(to.getAttribute("aria-invalid"), "true");
        // A new problem while typing is not said until it is committed.
        await userEvent.keyboard("{Control>}a{/Control}abc");
        assert.isNull(within(card).queryByRole("alert"), "no message while typing");
    });

    it("names the slider's thumbs apart from the boxes", async () => {
        const { card, name } = await openCard();
        assert.lengthOf(within(card).getAllByRole("slider"), 2);
        assert.lengthOf(within(card).queryAllByRole("slider", { name: new RegExp(`${name} (from|to)`) }), 0);
        assert.lengthOf(within(card).getAllByRole("textbox", { name: new RegExp(`^${name} from`) }), 1);
    });
});
