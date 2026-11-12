/**
 * The workspace's cards as the approved prototype draws them, on the REAL graphty-element and Les
 * Miserables, driven by real clicks and keys: a new selection opens as one empty card ("0 of 77")
 * whose value picker waits shut; a card's header holds its All / No nodes start, count, "..." and x;
 * a picked algorithm shows its output select and settings inline, and its checklist; Add, Keep and
 * Except sit on the card's bottom once it has a value; "+ Card" lists one entry per algorithm; a
 * card counts at once with its control untouched (the owner's path: No nodes, then a Betweenness
 * card, and the same for Degree); Escape cancels; a single card's table rows are tinted; and a
 * filter card is renamed in the workspace's title bar, one undo step.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// The full-screen selection workspace is the `selection-workspace` experiment.
withFeatures(["selection-workspace"]);

/**
 * Les Miserables in the workspace.
 * @returns the session and the store.
 */
async function openApp(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
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
    return { session, store };
}

/**
 * Les Miserables with a reader's layer selected in the style tree.
 * @returns the session and the layer.
 */
async function openLayer(): Promise<{ session: GraphSession; layer: Layer }> {
    const { session } = await openApp();
    const layer = await session.styles.add({
        name: "Calm",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Calm, / }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-rest"));
    });
    return { session, layer };
}

/**
 * Opens the workspace with the sidebar's Edit.
 * @returns the workspace.
 */
async function openWorkspace(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: /^Edit Which nodes/ }));
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        return found;
    });
}

/**
 * The workspace's count, "N of 77", as its header says it.
 * @param modal - the workspace.
 * @returns the count.
 */
function headCount(modal: HTMLElement): number {
    const text = modal.querySelector(".sel-ws-head .sel-count")?.textContent ?? "";
    return Number(/^([\d,]+) of/u.exec(text)?.[1]?.replace(/,/gu, "") ?? Number.NaN);
}

/**
 * Picks a value in the picker a button opens, by typing its name.
 * @param opener - the button.
 * @param name - what to type.
 */
async function pick(opener: HTMLElement, name: string): Promise<void> {
    await userEvent.click(opener);
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard(name);
    await userEvent.keyboard("{Enter}");
}

/**
 * The cards in the workspace.
 * @returns them.
 */
const cards = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(".sel-ws .sel-card")];

/**
 * The layer's selection as the element holds it.
 * @param session - the session.
 * @param id - the layer.
 * @returns the union rule, or undefined.
 */
function unionOf(session: GraphSession, id: string): UnionLeaf | undefined {
    const selector = session.styles.get(id)?.selector;
    return selector?.match === "rule" && selector.where.kind === "union" ? selector.where : undefined;
}

describe("the workspace's cards, as the approved prototype", () => {
    it("opens a new selection as one empty card, 0 of 77, its value picker shut, and Done keeps All", async () => {
        const { session, layer } = await openLayer();
        const modal = await openWorkspace();
        await waitFor(() => {
            assert.lengthOf(cards(), 1);
            assert.strictEqual(headCount(modal), 0, "nothing is chosen yet");
        });
        assert.isNull(screen.queryByRole("combobox", { name: "Find attributes, results" }), "the picker waits shut");
        const card = cards()[0];
        assert.isNotNull(within(card).queryByRole("button", { name: "Value" }), "one value picker");
        assert.isNotNull(within(card).queryByRole("button", { name: "Delete A" }), "an x on the header");
        assert.isNotNull(within(card).queryByRole("button", { name: "More for A" }), "a ... on the header");
        assert.isNull(within(card).queryByRole("button", { name: "Keep" }), "no Keep before a value");
        await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
        });
        const selector = session.styles.get(layer.id)?.selector;
        const rule = unionOf(session, layer.id);
        assert.isTrue(
            selector?.match === "everything" ||
                (rule?.branches[0]?.start === "all" && rule.branches[0].steps.length === 0),
            "a workspace left with no value keeps All",
        );
    });

    it("draws an algorithm's output and settings inline, its checklist, then Add, Keep and Except", async () => {
        await openLayer();
        const modal = await openWorkspace();
        await pick(within(cards()[0]).getByRole("button", { name: "Value" }), "Louvain");
        const card = cards()[0];
        await waitFor(() => {
            assert.isAbove(card.querySelectorAll("input[type=checkbox]").length, 1, "a checklist of the groups");
        });
        assert.isNotNull(card.querySelector('input[aria-label="Louvain output"]'), "the output select");
        assert.isNotNull(within(card).queryByRole("button", { name: /^Settings for Louvain/u }), "the settings button");
        assert.strictEqual(headCount(modal), 0, "nothing ticked selects nothing");
        const first = card.querySelector<HTMLInputElement>("input[type=checkbox]");
        if (first === null) {
            throw new Error("no checkbox");
        }
        await userEvent.click(first);
        await waitFor(() => {
            assert.isAbove(headCount(modal), 0, "a ticked group counts");
        });
        for (const verb of ["Add", "Keep", "Except"]) {
            assert.isNotNull(within(card).queryByRole("button", { name: verb }), `${verb} on the card's bottom`);
        }
        // A single card's table rows take its color.
        const table = within(modal).getByRole("region", { name: "Matches" });
        await waitFor(() => {
            const rows = table.querySelectorAll<HTMLElement>("[data-testid='data-table-row'][data-row-color]");
            assert.isAbove(rows.length, 0, "the one card's rows carry its color");
            assert.notStrictEqual(rows[0]?.style.getPropertyValue("--cm-dt-row-color"), "");
        });
    });

    it("puts every Leiden setting in the card's one settings popover (the owner's path)", async () => {
        await openLayer();
        await openWorkspace();
        await pick(within(cards()[0]).getByRole("button", { name: "Value" }), "Leiden");
        await userEvent.click(await within(cards()[0]).findByRole("button", { name: /^Settings for Leiden/u }));
        const panel = await screen.findByRole("dialog", { name: "Leiden" });
        for (const name of [/^Resolution/u, /^Seed/u, /^Max iterations/u, /^Tolerance/u]) {
            assert.isNotNull(within(panel).getByRole("spinbutton", { name }));
        }
        assert.lengthOf(
            within(panel)
                .getAllByRole("button")
                .filter((button) => button.getAttribute("aria-haspopup") === "dialog"),
            0,
            "no setting opens another popover",
        );
    });

    it("opens the settings beside the cards, over the drawing, and Escape there closes only them", async () => {
        await openLayer();
        const modal = await openWorkspace();
        await pick(within(cards()[0]).getByRole("button", { name: "Value" }), "Louvain");
        const settings = await within(cards()[0]).findByRole("button", { name: /^Settings for Louvain/u });
        await userEvent.click(settings);
        const panel = await screen.findByRole("dialog", { name: "Louvain" });
        const box = panel.getBoundingClientRect();
        const room = modal.getBoundingClientRect();
        assert.isAtLeast(box.left, room.left, "inside the workspace");
        assert.isAtMost(box.right, room.right, "inside the workspace");
        const middle = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        assert.isTrue(panel.contains(middle), "drawn above the drawing, never under it");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Louvain" }));
        });
        assert.isNotNull(document.querySelector(".sel-ws"), "the workspace stays open");
    });

    it("counts a Betweenness card at once from a No nodes start, its brush untouched (the owner's path)", async () => {
        await openLayer();
        const modal = await openWorkspace();
        const start = within(cards()[0]).getByRole("button", { name: "No nodes" });
        assert.strictEqual(start.dataset.start, "none");
        await pick(within(cards()[0]).getByRole("button", { name: "Value" }), "Betweenness");
        await waitFor(() => {
            assert.strictEqual(headCount(modal), 77, "every node has a betweenness, and the slider shows them all");
        });
    });

    it("counts a Degree card at once, its brush untouched", async () => {
        await openLayer();
        const modal = await openWorkspace();
        await pick(within(cards()[0]).getByRole("button", { name: "Value" }), "Degree");
        await waitFor(() => {
            assert.strictEqual(headCount(modal), 77);
        });
    });

    it("lists one entry per algorithm under + Card, and the value picked is a new card's", async () => {
        await openLayer();
        await openWorkspace();
        await pick(within(cards()[0]).getByRole("button", { name: "Value" }), "Degree");
        await userEvent.click(screen.getByRole("button", { name: "Card" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Louvain");
        const options = await screen.findAllByRole("option");
        const louvains = options.filter((each) => /^Louvain/u.test(each.textContent ?? ""));
        assert.lengthOf(louvains, 1, "Louvain once, never once per output");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.lengthOf(cards(), 2);
        });
        assert.isDefined(cards()[0].dataset.folded, "the card before folds");
    });

    it("switches a card's start between No nodes and All nodes", async () => {
        const { session, layer } = await openLayer();
        const modal = await openWorkspace();
        await pick(within(cards()[0]).getByRole("button", { name: "Value" }), "Degree");
        await userEvent.click(within(cards()[0]).getByRole("button", { name: "No nodes" }));
        await waitFor(() => {
            assert.isNotNull(within(cards()[0]).queryByRole("button", { name: "All nodes" }));
            assert.strictEqual(unionOf(session, layer.id)?.branches[0]?.start, "all");
        });
        assert.strictEqual(headCount(modal), 77);
    });

    it("cancels on Escape, its key shown on Cancel", async () => {
        const { session, layer } = await openLayer();
        const modal = await openWorkspace();
        assert.match(within(modal).getByRole("button", { name: /Cancel/u }).textContent ?? "", /Esc/u);
        await pick(within(cards()[0]).getByRole("button", { name: "Value" }), "Degree");
        await waitFor(() => {
            assert.strictEqual(headCount(modal), 77);
        });
        within(modal).getByRole("button", { name: "Done" }).focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
        });
        const rule = unionOf(session, layer.id);
        assert.isTrue(
            session.styles.get(layer.id)?.selector.match === "everything" ||
                (rule?.branches.every((branch) => branch.steps.length === 0) ?? false),
            "the Degree card was not kept",
        );
    });

    it("renames a filter in the workspace's title bar, one undo step, and keeps it", async () => {
        const { session } = await openApp();
        await userEvent.click(await screen.findByRole("button", { name: /^Data/u }));
        await userEvent.click(await screen.findByRole("button", { name: /Add filter/u }));
        const modal = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".sel-ws");
            assert.isNotNull(found);
            return found;
        });
        await pick(within(cards()[0]).getByRole("button", { name: "Value" }), "Degree");
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1);
        });
        const before = session.history.steps.length;
        await userEvent.click(within(modal).getByRole("button", { name: /, rename$/u }));
        await userEvent.keyboard("{Control>}a{/Control}Busy people{Enter}");
        await waitFor(() => {
            assert.strictEqual(session.visibility.conditions[0]?.name, "Busy people");
        });
        assert.strictEqual(session.history.steps.length, before + 1, "one undo step");
        assert.match(modal.querySelector(".sel-ws-title")?.textContent ?? "", /Busy people/u);
    });
});
