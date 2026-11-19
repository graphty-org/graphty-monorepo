/**
 * Editing the selection workspace's cards on the REAL graphty-element and Les Miserables, by real
 * clicks and keys: a card's Keep with nothing picked adds no step; a narrowing step's x removes it;
 * Delete on the only card leaves one empty card; a card's own keys (Shift+Ctrl+H, Ctrl+D, Delete)
 * do what its "..." menu says; and the Preview's Styled choice is kept for the next opening.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, RuleTree, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Every experiment stays off here.
withFeatures([]);

const DEGREE_6_TO_10: RuleTree = { kind: "range", attribute: "graphty.degree", min: 6, max: 10 };
const VALJEAN: RuleTree = { kind: "hops", of: { nodes: ["Valjean"] }, max: 0 };

/** One card: degree 6 to 10, except Valjean. */
const ONE_CARD: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            id: "a",
            start: "none",
            steps: [
                { id: "deg", op: "add", rule: DEGREE_6_TO_10 },
                { id: "val", op: "except", rule: VALJEAN },
            ],
        },
    ],
};

/** Two cards: A, degree 6 to 10; B, Valjean alone. */
const TWO_CARDS: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        { id: "a", start: "none", steps: [{ id: "deg", op: "add", rule: DEGREE_6_TO_10 }] },
        { id: "b", start: "none", steps: [{ id: "val", op: "add", rule: VALJEAN }] },
    ],
};

/**
 * Les Miserables in the workspace with a reader's layer selected in the style tree, its selection
 * open in the workspace, and every announcement made.
 * @param where - the layer's selection.
 * @returns the session, the layer, the workspace and the announcements heard.
 */
async function openCards(
    where: UnionLeaf,
): Promise<{ session: GraphSession; layer: Layer; modal: HTMLElement; heard: string[] }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    const heard: string[] = [];
    const set = store.set.bind(store);
    store.set = (patch) => {
        const said = (patch as { announcement?: unknown }).announcement;
        if (typeof said === "string" && said !== "") {
            heard.push(said);
        }
        set(patch);
    };
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
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
    const layer = await session.styles.add({
        name: "Calm",
        target: "node",
        selector: { match: "rule", where },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Calm, / }));
    const modal = await openModal();
    return { session, layer, modal, heard };
}

/**
 * Opens the workspace with the sidebar's Style Nodes...
 * @returns the workspace.
 */
async function openModal(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: /^Style Nodes\.\.\./ }));
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        return found;
    });
}

/**
 * The layer's selection as the element holds it.
 * @param session - the session.
 * @param layer - the layer.
 * @returns its groups.
 */
function branchesOf(session: GraphSession, layer: Layer): UnionLeaf["branches"] {
    const selector = session.styles.get(layer.id)?.selector;
    return selector?.match === "rule" && selector.where.kind === "union" ? selector.where.branches : [];
}

/**
 * The cards in the workspace.
 * @returns them.
 */
const cards = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(".sel-ws .sel-card")];

/**
 * Runs one item of a card's "..." menu.
 * @param letter - the card's letter.
 * @param item - the item's label.
 */
async function runItem(letter: string, item: RegExp): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: `More for ${letter}` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: item }));
    await waitFor(() => {
        assert.isNull(screen.queryByRole("menu"), "the menu closed");
    });
}

/**
 * Clicks a card on its blank space, which focuses the card, as a reader does before its keys.
 * @param card - the card.
 */
async function focusCard(card: HTMLElement): Promise<void> {
    const box = card.getBoundingClientRect();
    const head = card.querySelector(".cm-card-head");
    let blank: { x: number; y: number } | undefined;
    for (let y = 2; y < box.height && blank === undefined; y += 3) {
        for (let x = 2; x < box.width && blank === undefined; x += 3) {
            const hit = document.elementFromPoint(box.left + x, box.top + y);
            if (hit === card || hit === head) {
                blank = { x, y };
            }
        }
    }
    assert.isDefined(blank, "the card has blank space to click");
    await userEvent.click(card, { position: blank });
    await waitFor(() => {
        assert.strictEqual(document.activeElement, card, "the click focuses the card");
    });
}

describe("editing a card's steps", () => {
    it("Keep with nothing picked adds no step, and the workspace stays open", async () => {
        const { session, layer, heard } = await openCards(TWO_CARDS);
        await userEvent.click(within(cards()[0]).getByRole("button", { name: /^Keep$/ }));
        const find = await screen.findByRole("combobox", { name: "Find attributes, results" });
        assert.isNotNull(cards()[0].querySelector("[data-new-step]"), "the new step waits for its value");
        await userEvent.click(find);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("combobox", { name: "Find attributes, results" }), "the picker closed");
            assert.isNull(cards()[0].querySelector("[data-new-step]"), "no step waits");
        });
        assert.include(heard, "No step added");
        assert.isNotNull(document.querySelector(".sel-ws"), "the workspace is still open");
        assert.lengthOf(cards()[0].querySelectorAll("[data-step-pane]"), 1, "the card keeps its one step");
        assert.lengthOf(branchesOf(session, layer)[0]?.steps ?? [], 1);
    });

    it("a narrowing step's x removes it, and Delete on the only card leaves one empty card", async () => {
        const { session, layer, heard } = await openCards(ONE_CARD);
        const card = cards()[0];
        await waitFor(() => {
            assert.lengthOf(card.querySelectorAll("[data-step-pane]"), 2);
        });
        // The card's value has no x; only the step under it does.
        const removes = within(card).getAllByRole("button", { name: /^Remove / });
        assert.lengthOf(removes, 1);
        await userEvent.click(removes[0]);
        await waitFor(() => {
            assert.deepEqual(
                branchesOf(session, layer)[0]?.steps.map((step) => step.id),
                ["deg"],
            );
            assert.lengthOf(cards()[0].querySelectorAll("[data-step-pane]"), 1);
        });
        assert.isTrue(
            heard.some((said) => said.startsWith("Removed ")),
            "the removal is said",
        );

        await runItem("A", /^Delete/);
        await waitFor(() => {
            assert.lengthOf(cards(), 1, "one card is left");
            assert.isNotNull(cards()[0].querySelector("[data-new-step]"), "it is empty, waiting for a value");
            assert.isTrue(branchesOf(session, layer).every((branch) => branch.steps.length === 0));
        });
        assert.include(heard, "Removed A");
    });

    it("Escape in a card's box leaves the box and keeps the edit; a second Escape cancels (issue #8937)", async () => {
        const { session, layer, modal } = await openCards(ONE_CARD);
        const card = cards()[0];
        const from = await within(card).findByRole("textbox", { name: /from, number$/ });
        await userEvent.click(from);
        await userEvent.clear(from);
        await userEvent.type(from, "8");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, card, "focus left the box for its card");
        });
        assert.isNotNull(document.querySelector(".sel-ws"), "the workspace is still open");
        assert.strictEqual((from as HTMLInputElement).value, "8", "the typed value is kept");
        await waitFor(() => {
            const rule = branchesOf(session, layer)[0]?.steps[0]?.rule;
            assert.strictEqual(rule?.kind === "range" ? rule.min : undefined, 8, "the edit is applied");
        });
        assert.isTrue(modal.isConnected);

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"), "Escape outside any box cancels");
        });
    });
});

describe("a card's keys, as its menu shows them", () => {
    it("Shift+Ctrl+H turns the card off and on, Ctrl+D copies it and Delete removes it", async () => {
        const { session, layer } = await openCards(TWO_CARDS);
        await focusCard(cards()[1]);
        await userEvent.keyboard("{Shift>}{Control>}h{/Control}{/Shift}");
        await waitFor(() => {
            assert.isFalse(branchesOf(session, layer)[1]?.on, "B is off");
            assert.include(cards()[1].textContent ?? "", "Off");
        });
        await userEvent.keyboard("{Shift>}{Control>}h{/Control}{/Shift}");
        await waitFor(() => {
            assert.notStrictEqual(branchesOf(session, layer)[1]?.on, false, "B is on again");
        });

        await userEvent.keyboard("{Control>}d{/Control}");
        await waitFor(() => {
            assert.lengthOf(branchesOf(session, layer), 3, "B is copied");
            assert.lengthOf(cards(), 3);
        });
        const copy = branchesOf(session, layer)[2];
        assert.deepEqual(copy?.steps[0]?.rule, VALJEAN);

        await focusCard(cards()[2]);
        await userEvent.keyboard("{Delete}");
        await waitFor(() => {
            assert.deepEqual(
                branchesOf(session, layer).map((branch) => branch.id),
                ["a", "b"],
            );
            assert.lengthOf(cards(), 2);
        });
    });
});

describe("the Preview segment", () => {
    it("Styled is kept for the next opening, and Card colors comes back the same way", async () => {
        const { modal } = await openCards(TWO_CARDS);
        const preview = within(modal).getByRole("radiogroup", { name: "Preview" });
        assert.isTrue(within(preview).getByRole("radio", { name: "Card colors" }).matches(":checked"));
        await userEvent.click(within(preview).getByText("Styled"));
        await waitFor(() => {
            assert.isTrue(within(preview).getByRole("radio", { name: "Styled" }).matches(":checked"));
        });
        await userEvent.click(within(modal).getByRole("button", { name: /^Cancel/ }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
        });

        const again = await openModal();
        const kept = within(again).getByRole("radiogroup", { name: "Preview" });
        assert.isTrue(within(kept).getByRole("radio", { name: "Styled" }).matches(":checked"), "Styled is kept");
        await userEvent.click(within(kept).getByText("Card colors"));
        await waitFor(() => {
            assert.isTrue(within(kept).getByRole("radio", { name: "Card colors" }).matches(":checked"));
        });
    });
});
