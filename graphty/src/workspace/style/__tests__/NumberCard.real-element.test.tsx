/**
 * The number card on the REAL graphty-element and Les Miserables, typed with real keys: a from
 * above its to is held in the card with a message and never reaches the element (which refuses
 * it), a click selects the box's value so typing replaces it, a digit after a starting 0 replaces
 * the 0, grouping separators are read and any other text is refused with the text kept, a rule the
 * layer takes clears the notice a refused one left, and Highest above the node count says so.
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
    await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
    await userEvent.click(await screen.findByRole("option", { name: degree.name }));
    const card = await waitFor(() => within(region).getByRole("group", { name: new RegExp(`^${degree.name}(,|$)`) }));
    return { session, store, id: layer.id, card, name: degree.name };
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

/** The inspector never fell to its fallback. */
function panelShown(): void {
    assert.isNull(screen.queryByText("This panel could not be shown"), "the inspector is still drawn");
}

describe("number card", () => {
    it("holds a from above its to in the card, writes nothing, and takes the range once it is valid", async () => {
        const { session, store, id, card, name } = await openCard();
        const from = within(card).getByRole("textbox", { name: `${name} from, number` });
        const to = within(card).getByRole("textbox", { name: `${name} to, number` });
        await userEvent.click(from);
        await userEvent.keyboard("20");
        await waitFor(() => {
            assert.strictEqual(rangeOf(session, id)?.min, 20);
        });
        const before = rangeOf(session, id);

        // Control+A in "to", then 1: "to" is 1, below from.
        await userEvent.click(to);
        await userEvent.keyboard("{Control>}a{/Control}1");
        const alert = await within(card).findByRole("alert");
        assert.match(alert.textContent ?? "", /From is above to/);
        assert.strictEqual((to as HTMLInputElement).value, "1", "the typed text is kept");
        assert.strictEqual(to.getAttribute("aria-invalid"), "true");
        // 15 is still below 20: held, nothing written.
        await userEvent.keyboard("5");
        assert.strictEqual((to as HTMLInputElement).value, "15");
        panelShown();
        assert.deepEqual(rangeOf(session, id), before, "the layer keeps the last range it took");
        assert.isNull(store.get().notice, "no refusal notice: nothing was refused");

        // 30 is above from: written, message gone.
        await userEvent.keyboard("{Backspace}{Backspace}30");
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
        await waitFor(() => {
            assert.strictEqual(rangeOf(session, id)?.max, 30);
        });

        // A digit after a starting 0 replaces the 0.
        await userEvent.click(from);
        await userEvent.keyboard("0");
        assert.strictEqual((from as HTMLInputElement).value, "0");
        await userEvent.keyboard("5");
        assert.strictEqual((from as HTMLInputElement).value, "5");
        await waitFor(() => {
            assert.strictEqual(rangeOf(session, id)?.min, 5);
        });

        // Grouping separators are read.
        await userEvent.click(to);
        await userEvent.keyboard("1,000");
        await waitFor(() => {
            assert.strictEqual(rangeOf(session, id)?.max, 1000);
        });

        // Anything else is refused, the text kept, nothing written. Leaving the box shows the
        // number it took; coming back with a click selects it again.
        await userEvent.click(from);
        assert.strictEqual((to as HTMLInputElement).value, "1000");
        await userEvent.click(to);
        await userEvent.keyboard("$1,000");
        const alert = await within(card).findByRole("alert");
        assert.match(alert.textContent ?? "", /"\$1,000" is not a number/);
        assert.strictEqual((to as HTMLInputElement).value, "$1,000");
        await userEvent.tab();
        assert.strictEqual((to as HTMLInputElement).value, "$1,000", "leaving keeps the refused text");
        assert.strictEqual(rangeOf(session, id)?.max, 1000);
        panelShown();
    });

    it("clears the refusal notice once a rule is taken", async () => {
        const { session, store, id, card, name } = await openCard();
        store.set({ notice: { message: "That rule could not be used for this layer", error: true } });
        const from = within(card).getByRole("textbox", { name: `${name} from, number` });
        await userEvent.click(from);
        await userEvent.keyboard("3");
        await waitFor(() => {
            assert.strictEqual(rangeOf(session, id)?.min, 3);
            assert.isNull(store.get().notice);
        });
    });

    it("says when Highest asks for more than there are", async () => {
        const { session, card, name } = await openCard();
        await userEvent.click(within(card).getByRole("combobox", { name }));
        await userEvent.click(await screen.findByRole("option", { name: "Highest" }));
        const top = await within(card).findByRole("textbox", { name: `${name}: how many` });
        await userEvent.click(top);
        await userEvent.keyboard("10000");
        const total = session.data.statistics().nodeCount;
        await within(card).findByText(`There are only ${String(total)} nodes, so this keeps all of them.`);
        panelShown();
    });
});
