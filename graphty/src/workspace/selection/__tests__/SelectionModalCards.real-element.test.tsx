/**
 * The selection editor as a modal over the whole app (the owner, 2026-11-04), on the REAL
 * graphty-element and Les Miserables, driven by real clicks and keys: Edit opens one modal with a
 * scrim, colored group cards on the left (each step's controls inside its card, the card's
 * actions along its bottom) and the drawing over the matches table on the right; Except adds a step
 * to its card; "+ Card" starts a new colored card; a node clicked on the drawing is a step's reference;
 * Done keeps every edit and Cancel restores the selection as it was. The owner's review of
 * 2026-11-04: cards fold to their header (a new card folds the others), reorder by their grip or
 * the arrow keys, no "or" between them; a new number step passes its whole range at once; the
 * matches table tints each row in its group's color, with no Group column; and the preview draws
 * the edges between a group's members in its color.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { dragTo } from "../../../test/real-pointer";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// The full-screen selection workspace is the `selection-workspace` experiment.
withFeatures(["selection-workspace"]);

/**
 * Les Miserables in the workspace, with a reader's layer selected in the style tree.
 * @returns the session and the layer.
 */
async function openLayer(): Promise<{ session: GraphSession; layer: Layer }> {
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
 * The layer's selection as the element holds it.
 * @param session - the session.
 * @param id - the layer.
 * @returns the union rule, or undefined.
 */
function unionOf(session: GraphSession, id: string): UnionLeaf | undefined {
    const selector = session.styles.get(id)?.selector;
    return selector?.match === "rule" && selector.where.kind === "union" ? selector.where : undefined;
}

/**
 * Opens the modal with the sidebar's Edit.
 * @returns the modal.
 */
async function openModal(): Promise<HTMLElement> {
    await userEvent.click(screen.getByRole("button", { name: /^Edit Which nodes/ }));
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the modal is open");
        return found;
    });
}

/**
 * Picks a value in the open value picker by typing its name.
 * @param name - what to type.
 */
async function pickValue(name: string): Promise<void> {
    // An empty card waits with its value picker shut: its Value opens it. A picker opened by a
    // card's Add, Keep or Except, or by "+ Card", is open already.
    if (screen.queryByRole("combobox", { name: "Find attributes, results" }) === null) {
        const empty = [...document.querySelectorAll<HTMLElement>(".sel-ws [data-new-step] [data-first-focus]")].at(-1);
        assert.isDefined(empty, "an empty card's Value");
        await userEvent.click(empty);
    }
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard(name);
    await userEvent.keyboard("{Enter}");
}

/**
 * The group cards in the modal.
 * @returns them.
 */
const cards = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(".sel-ws .sel-card")];

describe("the selection modal with colored group cards", () => {
    it("opens over the whole app with a scrim, the drawing in its preview and the panels inert", async () => {
        await openLayer();
        const modal = await openModal();
        assert.isNotNull(document.querySelector(".sel-ws-scrim"), "a scrim lies behind it");
        const box = modal.getBoundingClientRect();
        assert.isAbove(box.width, 1440 - 80, "it takes the window, minus a margin");
        assert.isAbove(box.height, 900 - 80);
        await waitFor(() => {
            assert.isTrue(document.querySelector<HTMLElement>(".ws-left")?.inert, "the left panel takes no input");
            assert.isTrue(document.querySelector<HTMLElement>(".ws-right")?.inert, "nor the inspector");
        });
        // The drawing lies over the preview cell.
        const cell = modal.querySelector(".sel-ws-preview")?.getBoundingClientRect();
        await waitFor(() => {
            const drawing = document.querySelector(".ws-canvas-surface")?.getBoundingClientRect();
            assert.isDefined(cell);
            assert.isDefined(drawing);
            assert.approximately(drawing?.left ?? 0, cell?.left ?? -1, 1);
            assert.approximately(drawing?.width ?? 0, cell?.width ?? -1, 1);
        });
        assert.isNotNull(within(modal).queryByRole("region", { name: "Matches" }), "the matches table is drawn");
    });

    it("a step and the card's Except go inside its card, + Card starts a new colored card, and Done keeps both", async () => {
        const { session, layer } = await openLayer();
        const modal = await openModal();
        assert.lengthOf(cards(), 1);
        // A selection with no step opens as one empty card; its Value opens the picker.
        await pickValue("Degree");
        await waitFor(() => {
            assert.lengthOf(
                cards()[0].querySelectorAll(".sel-card-step [data-step-pane]"),
                1,
                "the step is in its card",
            );
        });
        // Its controls are inside the step, in the card: no separate settings column.
        assert.isNotNull(cards()[0].querySelector('[data-step-pane] input[aria-label="Degree from, number"]'));
        // The card's Except, along its bottom, adds the next step to the same card.
        await userEvent.click(within(cards()[0]).getByRole("button", { name: /^Except$/ }));
        await pickValue("Isolated");
        await waitFor(() => {
            assert.lengthOf(cards()[0].querySelectorAll(".sel-card-step [data-step-pane]"), 2);
            assert.deepEqual(
                unionOf(session, layer.id)?.branches[0]?.steps.map((step) => step.op),
                ["add", "except"],
            );
        });

        await userEvent.click(within(modal).getByRole("button", { name: /^Card$/ }));
        await pickValue("Degree");
        await waitFor(() => {
            assert.lengthOf(cards(), 2, "a second card");
        });
        const [first, second] = cards();
        assert.notEqual(
            first.style.getPropertyValue("--sel-card-color"),
            second.style.getPropertyValue("--sel-card-color"),
            "each card in its group's own color",
        );
        await userEvent.click(within(modal).getByRole("button", { name: /^Done/ }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"), "Done closes it");
            assert.lengthOf(unionOf(session, layer.id)?.branches ?? [], 2, "both groups kept");
        });
    });

    it("Cancel restores the selection as it was when the modal opened", async () => {
        const { session, layer } = await openLayer();
        const before = session.styles.get(layer.id)?.selector;
        const modal = await openModal();
        await pickValue("Degree");
        await waitFor(() => {
            assert.lengthOf(unionOf(session, layer.id)?.branches[0]?.steps ?? [], 1, "the edit is live");
        });
        await userEvent.click(within(modal).getByRole("button", { name: /^Cancel/ }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
            const steps = unionOf(session, layer.id)?.branches.flatMap((branch) => branch.steps) ?? [];
            assert.lengthOf(steps, 0, `restored from ${JSON.stringify(before)}`);
        });
    });

    it("a node clicked on the drawing in the modal is a step's reference", async () => {
        const { session, layer } = await openLayer();
        await openModal();
        await pickValue("Within hops of");
        const reference = await within(cards()[0]).findByRole("button", { name: /^Reference/ });
        await userEvent.click(reference);
        await userEvent.click(await screen.findByRole("option", { name: /Pick on canvas/ }));
        const element = document.querySelector("graphty-element");
        if (element === null) {
            throw new Error("no element");
        }
        await element.waitForStableFrame();
        let at = element.nodeScreenPosition("Valjean");
        await waitFor(() => {
            at = element.nodeScreenPosition("Valjean");
            assert.isTrue(at?.visible);
        });
        await userEvent.click(element, { position: { x: at?.x ?? 0, y: at?.y ?? 0 } });
        await waitFor(() => {
            const step = unionOf(session, layer.id)?.branches[0]?.steps[0];
            assert.include(JSON.stringify(step?.rule), "Valjean", "the clicked node is the reference");
        });
        // The pick leaves focus on the step's reference field, inside the modal.
        await waitFor(() => {
            const field = within(cards()[0]).getByRole("button", { name: /^Reference/ });
            assert.strictEqual(document.activeElement, field, "focus is on the reference field");
        });
    });
});

/**
 * Two cards: A holds degree 10 and up; B adds Degree, as the owner built it (with Louvain first).
 * @returns the session, the layer and the modal.
 */
async function twoCards(): Promise<{ session: GraphSession; layer: Layer; modal: HTMLElement }> {
    const { session, layer } = await openLayer();
    const modal = await openModal();
    await pickValue("Degree");
    const min = await within(cards()[0]).findByRole("textbox", { name: "Degree from, number" });
    await userEvent.clear(min);
    await userEvent.type(min, "10{Enter}");
    await waitFor(() => {
        assert.strictEqual(
            (unionOf(session, layer.id)?.branches[0]?.steps[0]?.rule as { min?: number } | undefined)?.min,
            10,
        );
    });
    await userEvent.click(within(modal).getByRole("button", { name: /^Card$/ }));
    await pickValue("Degree");
    await waitFor(() => {
        assert.lengthOf(unionOf(session, layer.id)?.branches[1]?.steps ?? [], 1);
    });
    return { session, layer, modal };
}

/**
 * The color an edge between two nodes is drawn with now.
 * @param session - the session.
 * @param a - one end.
 * @param b - the other.
 * @returns the color, as the element merged it.
 */
function edgeColor(session: GraphSession, a: string, b: string): string {
    const edge = session.data
        .edges()
        .find((each) => [a, b].includes(String(each.source)) && [a, b].includes(String(each.target)));
    assert.isDefined(edge, `an edge ${a} - ${b}`);
    return JSON.stringify(
        (session.styles.explain({ edge: edge?.id ?? "" }).merged as Record<string, unknown>)["edge.color"],
    );
}

describe("the owner's review of the cards (2026-11-04)", () => {
    it("a new Degree card counts at once, the cards before it fold, and no or is drawn between them", async () => {
        const { session, layer } = await twoCards();
        const degree = unionOf(session, layer.id)?.branches[1]?.steps[0]?.rule as { min?: number; max?: number };
        // No bounds written: graphty-element reads an unbounded range as every measured node, as
        // the untouched slider shows (the app no longer copies the range into the rule).
        assert.isUndefined(degree.min, "a new number step writes no bound");
        assert.isUndefined(degree.max);
        await waitFor(() => {
            assert.match(cards()[1].getAttribute("aria-label") ?? "", /^B, 77 of 77/, "B passes every node at once");
        });
        assert.isTrue(cards()[0].hasAttribute("data-folded"), "adding B folded A");
        assert.lengthOf(cards()[0].querySelectorAll(".sel-card-step"), 0, "a folded card shows only its header");
        assert.include(
            cards()[0].querySelector(".sel-card-summary")?.textContent ?? "",
            "Degree",
            "its one-line summary",
        );
        assert.notMatch(document.querySelector(".sel-cards")?.textContent ?? "", /\bor\b/u, "no or between the cards");
        // The chevron unfolds it again.
        await userEvent.click(within(cards()[0]).getByRole("button", { name: "Expand A" }));
        await waitFor(() => {
            assert.lengthOf(cards()[0].querySelectorAll(".sel-card-step"), 1);
        });
        await userEvent.click(within(cards()[0]).getByRole("button", { name: "Collapse A" }));
        await waitFor(() => {
            assert.isTrue(cards()[0].hasAttribute("data-folded"));
        });
    });

    it("a card dragged by its grip, or moved with the arrow keys, takes its new place", async () => {
        const { session, layer } = await twoCards();
        const idsNow = (): string[] => (unionOf(session, layer.id)?.branches ?? []).map((each) => each.id ?? "");
        const [first, second] = idsNow();
        const grip = within(cards()[1]).getByRole("button", { name: "Move B" });
        const top = cards()[0].getBoundingClientRect();
        await dragTo(grip, { x: top.left + 20, y: top.top + 2 });
        await waitFor(() => {
            assert.deepEqual(idsNow(), [second, first], "dragged above A");
        });
        // The keyboard: Down on the first card's grip moves it back down.
        const moved = within(cards()[0]).getByRole("button", { name: /^Move / });
        moved.focus();
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            assert.deepEqual(idsNow(), [first, second], "moved down by its key");
        });
    });

    it("the matches table tints each row in its group's color, with no Group column", async () => {
        const { modal } = await twoCards();
        const table = within(modal).getByRole("region", { name: "Matches" });
        await waitFor(() => {
            const rows = table.querySelectorAll<HTMLElement>("[data-testid='data-table-row'][data-row-color]");
            assert.isAbove(rows.length, 0, "rows carry their group's color");
            assert.notStrictEqual(rows[0]?.style.getPropertyValue("--cm-dt-row-color"), "");
        });
        assert.isNull(within(table).queryByRole("columnheader", { name: /^Group/ }), "no Group column");
    });

    it("the preview draws the edges between a group's members in its color", async () => {
        const { session } = await openLayer();
        await openModal();
        await pickValue("Within hops of");
        const reference = await within(cards()[0]).findByRole("button", { name: /^Reference/ });
        await userEvent.click(reference);
        await userEvent.click(await screen.findByRole("option", { name: /Pick on canvas/ }));
        const element = document.querySelector("graphty-element");
        if (element === null) {
            throw new Error("no element");
        }
        await element.waitForStableFrame();
        let at = element.nodeScreenPosition("Valjean");
        await waitFor(() => {
            at = element.nodeScreenPosition("Valjean");
            assert.isTrue(at?.visible);
        });
        await userEvent.click(element, { position: { x: at?.x ?? 0, y: at?.y ?? 0 } });
        const nodeColor = (id: unknown): string =>
            JSON.stringify(
                (session.styles.explain({ node: String(id) }).merged as Record<string, unknown>)["node.color"],
            );
        await waitFor(() => {
            const group = nodeColor("Valjean");
            assert.strictEqual(edgeColor(session, "Valjean", "Myriel"), group, "an edge between members");
            // Every edge is in the group's color exactly when both its ends are members.
            const wrong = session.data
                .edges()
                .filter(
                    (edge) =>
                        (edgeColor(session, String(edge.source), String(edge.target)) === group) !==
                        (nodeColor(edge.source) === group && nodeColor(edge.target) === group),
                );
            assert.lengthOf(wrong, 0, "only the edges between members");
        });
    });
});
