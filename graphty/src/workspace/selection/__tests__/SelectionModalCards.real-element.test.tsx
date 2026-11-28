/**
 * The selection editor as a modal over the whole app (the owner, 2026-11-04), on the REAL
 * graphty-element and Les Miserables, driven by real clicks and keys: Edit opens one modal with a
 * scrim, colored group cards on the left (each step's controls inside its card, the card's
 * actions along its bottom) and the drawing over the matches table on the right; Except adds a step
 * to its card; "+ Card" starts a new colored card; a node clicked on the drawing is a step's reference;
 * Done keeps every edit and Cancel restores the selection as it was. The owner's review of
 * 2026-11-04: cards fold to their header (a new card folds the others), reorder by their grip or
 * by Ctrl+] and Ctrl+[ as their "..." menu shows them (the grip takes no arrow keys), no "or"
 * between them; a new number step passes its whole range at once; the
 * matches table tints each row in its group's color, with no Group column; and the preview draws
 * the edges between a group's members in its color.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import karate from "../../../../public/samples/karate.gml?raw";
import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { clickCardBlank } from "../../../test/cards";
import { withFeatures } from "../../../test/features";
import { dragTo } from "../../../test/real-pointer";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Every experiment stays off here.
withFeatures([]);

/** A graph to load: Les Miserables unless a test names another. */
interface Sample {
    type: "gml" | "json";
    name: string;
    data: string;
}

const LES_MISERABLES: Sample = { type: "gml", name: "les-miserables.gml", data: lesMiserables };

/**
 * A graph in the workspace (Les Miserables unless told), with a reader's layer selected in the
 * style tree.
 * @param graph - the graph to load.
 * @param layerName - the layer's name.
 * @param where - the layer's selection, or everything.
 * @returns the session, the layer and every announcement heard.
 */
async function openLayer(
    graph: Sample = LES_MISERABLES,
    layerName = "Calm",
    where?: UnionLeaf,
): Promise<{ session: GraphSession; layer: Layer; heard: string[] }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    const heard: string[] = [];
    store.subscribe(() => {
        const said = store.get().announcement;
        if (typeof said === "string" && said !== "" && heard.at(-1) !== said) {
            heard.push(said);
        }
    });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: graph.type, name: graph.name, config: { data: graph.data } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    const layer = await session.styles.add({
        name: layerName,
        target: "node",
        selector: where === undefined ? { match: "everything" } : { match: "rule", where },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(page.elementLocator(tree).getByRole("treeitem", { name: new RegExp(`^${layerName}, `) }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-rest"));
    });
    return { session, layer, heard };
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
    await userEvent.click(page.getByRole("button", { name: /^Style Nodes\.\.\./ }));
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
        await userEvent.click(page.elementLocator(cards()[0]).getByRole("button", { name: /^Except$/ }));
        await pickValue("Isolated");
        await waitFor(() => {
            assert.lengthOf(cards()[0].querySelectorAll(".sel-card-step [data-step-pane]"), 2);
            assert.deepEqual(
                unionOf(session, layer.id)?.branches[0]?.steps.map((step) => step.op),
                ["add", "except"],
            );
        });

        await userEvent.click(page.elementLocator(modal).getByRole("button", { name: /^Card$/ }));
        await pickValue("Degree");
        await waitFor(() => {
            assert.lengthOf(cards(), 2, "a second card");
        });
        const [first, second] = cards();
        const color = (card: HTMLElement): string => getComputedStyle(card).getPropertyValue("--sel-card-color").trim();
        assert.notStrictEqual(color(first), "", "a card has its group's color");
        assert.notEqual(color(first), color(second), "each card in its group's own color");
        await userEvent.click(page.elementLocator(modal).getByRole("button", { name: /^Done/ }));
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
        await userEvent.click(page.elementLocator(modal).getByRole("button", { name: /^Cancel/ }));
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
        await userEvent.click(
            page.elementLocator(cards()[0]).getByRole("button", { name: "Pick on canvas", exact: true }),
        );
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
        await userEvent.click(page.getByCss("graphty-element").first(), { position: { x: at?.x ?? 0, y: at?.y ?? 0 } });
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
 * @returns the session, the layer, the modal and every announcement heard.
 */
async function twoCards(): Promise<{ session: GraphSession; layer: Layer; modal: HTMLElement; heard: string[] }> {
    const { session, layer, heard } = await openLayer();
    const modal = await openModal();
    await pickValue("Degree");
    const min = page.elementLocator(cards()[0]).getByRole("textbox", { name: "Degree from, number", exact: true });
    await userEvent.clear(min);
    await userEvent.type(min, "10{Enter}");
    await waitFor(() => {
        assert.strictEqual(
            (unionOf(session, layer.id)?.branches[0]?.steps[0]?.rule as { min?: number } | undefined)?.min,
            10,
        );
    });
    await userEvent.click(page.elementLocator(modal).getByRole("button", { name: /^Card$/ }));
    await pickValue("Degree");
    await waitFor(() => {
        assert.lengthOf(unionOf(session, layer.id)?.branches[1]?.steps ?? [], 1);
    });
    return { session, layer, modal, heard };
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
    it("a matches table that takes the place of No matches fills the strip (#6062)", async () => {
        // Degree 1000 and up: nothing in Les Miserables, so the strip opens on No matches.
        const { session, layer } = await openLayer(LES_MISERABLES, "Calm", {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    id: "a",
                    start: "none",
                    steps: [{ id: "deg", op: "add", rule: { kind: "range", attribute: "graphty.degree", min: 1000 } }],
                },
            ],
        });
        const modal = await openModal();
        const strip = await within(modal).findByRole("region", { name: "Matches" });
        await within(strip).findByText("No matches");
        const min = page.elementLocator(cards()[0]).getByRole("textbox", { name: "Degree from, number", exact: true });
        await userEvent.clear(min);
        await userEvent.type(min, "10{Enter}");
        await waitFor(() => {
            assert.strictEqual(
                (unionOf(session, layer.id)?.branches[0]?.steps[0]?.rule as { min?: number } | undefined)?.min,
                10,
            );
        });
        // The table is drawn as tall as the strip leaves it, with its rows showing.
        await waitFor(() => {
            const box = strip.querySelector<HTMLElement>(".sel-ws-strip-table");
            assert.isNotNull(box, "the table's box");
            assert.isAbove(box?.getBoundingClientRect().height ?? 0, 0, "the box has room");
            assert.isAbove(
                box?.querySelectorAll("[data-testid='data-table-row']").length ?? 0,
                0,
                "the matches are listed",
            );
        });
    });
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
        const list = screen.getByRole("group", { name: "Cards" });
        assert.notMatch(list.textContent ?? "", /\bor\b/u, "no or between the cards");
        // The chevron unfolds it again.
        await userEvent.click(page.elementLocator(cards()[0]).getByRole("button", { name: "Expand A", exact: true }));
        await waitFor(() => {
            assert.lengthOf(cards()[0].querySelectorAll(".sel-card-step"), 1);
        });
        await userEvent.click(page.elementLocator(cards()[0]).getByRole("button", { name: "Collapse A", exact: true }));
        await waitFor(() => {
            assert.isTrue(cards()[0].hasAttribute("data-folded"));
        });
    });

    it("a card added after deleting the top card is named after the last letter, never the deleted one", async () => {
        const { session, layer, modal } = await twoCards();
        await userEvent.click(page.elementLocator(modal).getByRole("button", { name: /^Card$/ }));
        await pickValue("Degree");
        await waitFor(() => {
            assert.lengthOf(unionOf(session, layer.id)?.branches ?? [], 3);
        });
        await userEvent.click(page.elementLocator(cards()[0]).getByRole("button", { name: "Delete A", exact: true }));
        await waitFor(() => {
            assert.lengthOf(cards(), 2);
        });
        await userEvent.click(page.elementLocator(modal).getByRole("button", { name: /^Card$/ }));
        await pickValue("Degree");
        await waitFor(() => {
            assert.deepEqual(
                (unionOf(session, layer.id)?.branches ?? []).map((each) => each.name),
                ["B", "C", "D"],
                "the new card is last and named D",
            );
        });
        assert.match(cards().at(-1)?.getAttribute("aria-label") ?? "", /^D, /, "the last card reads D");
    });

    it("a card the reader named like a letter keeps its name when the other card is deleted", async () => {
        const { session, layer } = await twoCards();
        await userEvent.click(page.elementLocator(cards()[1]).getByRole("button", { name: /^Rename B/ }));
        await userEvent.keyboard("{Control>}a{/Control}NY{Enter}");
        await waitFor(() => {
            assert.strictEqual(unionOf(session, layer.id)?.branches[1]?.name, "NY");
        });
        await userEvent.click(page.elementLocator(cards()[0]).getByRole("button", { name: "Delete A", exact: true }));
        await waitFor(() => {
            assert.deepEqual(
                (unionOf(session, layer.id)?.branches ?? []).map((each) => each.name),
                ["NY"],
                "the typed name stays",
            );
        });
        assert.match(cards()[0]?.getAttribute("aria-label") ?? "", /^NY, /, "the card still reads NY");
    });

    it("the last card left loses only the letter it was given", async () => {
        const { session, layer } = await twoCards();
        await userEvent.click(page.elementLocator(cards()[0]).getByRole("button", { name: "Delete A", exact: true }));
        await waitFor(() => {
            const branches = unionOf(session, layer.id)?.branches ?? [];
            assert.lengthOf(branches, 1);
            assert.isUndefined(branches[0]?.name, "B was a given letter");
            assert.isUndefined(branches[0]?.autoName);
        });
    });

    it("a card dragged by its grip, or moved with Ctrl+[ and Ctrl+] on it, takes its new place; arrows do not", async () => {
        const { session, layer } = await twoCards();
        const idsNow = (): string[] => (unionOf(session, layer.id)?.branches ?? []).map((each) => each.id ?? "");
        const [first, second] = idsNow();
        const grip = within(cards()[1]).getByRole("button", { name: "Move B" });
        const top = cards()[0].getBoundingClientRect();
        await dragTo(grip, { x: top.left + 20, y: top.top + 2 });
        await waitFor(() => {
            assert.deepEqual(idsNow(), [second, first], "dragged above A");
        });
        // The keyboard, with the grip focused: the arrows move nothing (no button shows them).
        const moved = within(cards()[0]).getByRole("button", { name: /^Move / });
        moved.focus();
        await userEvent.keyboard("{ArrowDown}");
        assert.deepEqual(idsNow(), [second, first], "the arrows leave the order");
        // Ctrl+[ (Move down, as the card's menu shows it) moves it back down, focus kept on its grip.
        await userEvent.keyboard("{Control>}[[{/Control}");
        await waitFor(() => {
            assert.deepEqual(idsNow(), [first, second], "moved down by Ctrl+[");
        });
        await waitFor(() => {
            assert.strictEqual(document.activeElement?.getAttribute("data-card-grip"), second);
        });
        await userEvent.keyboard("{Control>}]{/Control}");
        await waitFor(() => {
            assert.deepEqual(idsNow(), [second, first], "moved up by Ctrl+]");
        });
    });

    it("a card clicked on its blank space moves with Ctrl+], as its menu shows it", async () => {
        const { session, layer } = await twoCards();
        const idsNow = (): string[] => (unionOf(session, layer.id)?.branches ?? []).map((each) => each.id ?? "");
        const [first, second] = idsNow();
        await clickCardBlank(cards()[1]);
        await userEvent.keyboard("{Control>}]{/Control}");
        await waitFor(() => {
            assert.deepEqual(idsNow(), [second, first], "moved up by Ctrl+]");
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
        await userEvent.click(
            page.elementLocator(cards()[0]).getByRole("button", { name: "Pick on canvas", exact: true }),
        );
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
        await userEvent.click(page.getByCss("graphty-element").first(), { position: { x: at?.x ?? 0, y: at?.y ?? 0 } });
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

describe("a card's settings pop-out closes like Figma's (the owner, 2026-11-04)", () => {
    /**
     * Opens the Degree card's settings.
     * @returns the settings panel.
     */
    async function openSettings(): Promise<HTMLElement> {
        await userEvent.click(page.getByRole("button", { name: "Settings for Degree", exact: true }));
        return screen.findByRole("dialog", { name: "Degree" });
    }

    it("a click on the workspace's empty card list or its header closes the settings and leaves the workspace open", async () => {
        await openLayer();
        const modal = await openModal();
        await pickValue("Degree");

        await openSettings();
        const list = modal.querySelector<HTMLElement>(".sel-ws-cards");
        assert.isNotNull(list);
        const { height } = list.getBoundingClientRect();
        // The bottom of the card list, below the one card: empty space.
        await userEvent.click(page.elementLocator(modal).getByCss(".sel-ws-cards").first(), {
            position: { x: 12, y: height - 12 },
        });
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Degree" }), "the empty card list closes it");
        });
        assert.isTrue(modal.isConnected, "the workspace stays open");

        await openSettings();
        const count = modal.querySelector<HTMLElement>(".sel-ws-head .sel-count");
        assert.isNotNull(count);
        await userEvent.click(page.elementLocator(modal).getByCss(".sel-ws-head .sel-count").first());
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Degree" }), "the header closes it");
        });
        assert.isTrue(modal.isConnected);

        await openSettings();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Degree" }), "Escape closes it");
        });
        assert.isNotNull(document.querySelector(".sel-ws"), "and only it");
    });
});

describe("a number card's slider reaches both ends of its values (the owner, 2026-11-04)", () => {
    it("Zachary's karate club's Betweenness keeps its highest node: the end dragged back keeps 34, the start at the end keeps 1", async () => {
        await openLayer({ type: "gml", name: "karate.gml", data: karate });
        await openModal();
        await pickValue("Betweenness");
        await waitFor(() => {
            assert.match(cards()[0].getAttribute("aria-label") ?? "", /^A, 34 of 34/);
        });
        const thumb = (which: "start" | "end"): HTMLElement =>
            within(cards()[0]).getByRole("slider", { name: new RegExp(`range ${which}$`) });
        // The end thumb dragged left, then back past the scale's right end.
        const right = thumb("end").getBoundingClientRect();
        await dragTo(thumb("end"), { x: right.left - 150, y: right.top + right.height / 2 });
        await waitFor(() => {
            assert.notMatch(cards()[0].getAttribute("aria-label") ?? "", /^A, 34 of 34/, "the drag took some away");
        });
        await dragTo(thumb("end"), { x: right.right + 300, y: right.top + right.height / 2 });
        await waitFor(() => {
            assert.match(
                cards()[0].getAttribute("aria-label") ?? "",
                /^A, 34 of 34/,
                "back at the end keeps every node",
            );
        });
        // The start thumb dragged past the right end holds the highest node alone.
        await dragTo(thumb("start"), { x: right.right + 300, y: right.top + right.height / 2 });
        await waitFor(() => {
            assert.match(cards()[0].getAttribute("aria-label") ?? "", /^A, 1 of 34/);
        });
    });

    it("a column of halves from 0 to 10 steps by less than 1", async () => {
        const nodes = Array.from({ length: 21 }, (_, i) => ({ id: `n${String(i)}`, half: i / 2, count: i }));
        const edges = nodes.slice(1).map((node, i) => ({ source: `n${String(i)}`, target: node.id }));
        await openLayer({ type: "json", name: "halves.json", data: JSON.stringify({ nodes, edges }) });
        await openModal();
        await pickValue("half");
        const start = await within(cards()[0]).findByRole("slider", { name: /range start$/ });
        start.focus();
        await userEvent.keyboard("{ArrowRight}");
        await waitFor(() => {
            const at = Number(start.getAttribute("aria-valuenow"));
            assert.isAbove(at, 0, "the key moved it");
            assert.isBelow(at, 1, "by less than a whole: halves can be picked");
        });
    });
});

describe("long names in the selection modal (the owner, 2026-11-04)", () => {
    it("a long layer name truncates in the title and Cancel and Done stay inside the modal", async () => {
        await openLayer(LES_MISERABLES, "Members of the organisation with long names and a longer layer name still");
        const modal = await openModal();
        const box = modal.getBoundingClientRect();
        for (const name of ["Cancel", "Done"]) {
            const button = within(modal)
                .getByRole("button", { name: new RegExp(`^${name}`) })
                .getBoundingClientRect();
            assert.isAtMost(button.right, box.right, `${name} lies inside the modal`);
            assert.isAbove(button.width, 20, `${name} keeps its width`);
        }
        const preview = modal.querySelector(".sel-ws-body")?.getBoundingClientRect();
        assert.isAtMost(preview?.right ?? Infinity, box.right + 1, "the body ends at the modal's edge");
    });

    it("a card renamed to a long name truncates before its start chip", async () => {
        await openLayer();
        await openModal();
        await pickValue("Degree");
        await userEvent.click(page.elementLocator(cards()[0]).getByRole("button", { name: /^Rename A/ }));
        await userEvent.keyboard("Members of the organisation with long names{Enter}");
        const name = await waitFor(() => {
            const found = cards()[0].querySelector<HTMLElement>(".cm-card-name");
            assert.include(found?.textContent ?? "", "Members of the organisation");
            return found;
        });
        const after = name?.nextElementSibling?.getBoundingClientRect();
        assert.isAtMost(
            name?.getBoundingClientRect().right ?? Infinity,
            after?.left ?? -1,
            "the name ends before the chip",
        );
        const text = name?.querySelector<HTMLElement>(".cm-card-title") ?? name;
        assert.isAbove(text?.scrollWidth ?? 0, text?.clientWidth ?? 0, "the name is cut with an ellipsis");
    });
});

describe("the start button of an empty card", () => {
    it("takes All nodes before the first value, and the value then narrows All", async () => {
        const { session, layer } = await openLayer();
        await userEvent.click(page.getByRole("button", { name: /^Style Nodes\.\.\./ }));
        const modal = await screen.findByRole("dialog", { name: /Which nodes/ });
        await userEvent.click(page.elementLocator(modal).getByRole("button", { name: "No nodes", exact: true }));
        await within(modal).findByRole("button", { name: "All nodes" });
        await waitFor(() => {
            assert.strictEqual(modal.querySelector(".sel-ws-head .sel-count")?.textContent, "77 of 77");
        });
        await userEvent.click(page.elementLocator(modal).getByRole("button", { name: "Value", exact: true }));
        await userEvent.click(page.getByRole("option", { name: "Isolated", exact: true }));
        await within(modal).findByRole("button", { name: "All nodes" });
        await userEvent.click(page.elementLocator(modal).getByRole("button", { name: "Done", exact: true }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
            const held = session.styles.list().find((each) => each.id === layer.id)?.selector;
            const where = (held as { where?: UnionLeaf } | undefined)?.where;
            assert.strictEqual(where?.branches[0]?.start, "all");
            assert.strictEqual(where?.branches[0]?.steps[0]?.op, "keep");
        });
    });
});

describe("Escape on the workspace, wherever focus was left", () => {
    it("cancels after a press on the drawing or on the title bar's empty space", async () => {
        await openLayer();
        for (const spot of [".sel-ws-preview", ".sel-ws-head"]) {
            await userEvent.click(page.getByRole("button", { name: /^Style Nodes\.\.\./ }));
            await screen.findByRole("dialog", { name: /Which nodes/ });
            const box = document.querySelector(spot);
            if (box === null) {
                throw new Error(`no ${spot}`);
            }
            await userEvent.click(page.getByCss(spot).first(), { position: { x: 300, y: 8 }, force: true });
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.isNull(document.querySelector(".sel-ws"), "Cancel's key, Esc, cancels");
            });
        }
    });

    it("cancels after a press outside the workspace, on the status bar", async () => {
        const { session, layer } = await openLayer();
        const modal = await openModal();
        await pickValue("Degree");
        await waitFor(() => {
            assert.lengthOf(unionOf(session, layer.id)?.branches[0]?.steps ?? [], 1, "a step is drawn");
        });
        const bar = screen.getAllByRole("contentinfo").find((each) => !modal.contains(each));
        if (bar === undefined) {
            throw new Error("no status bar outside the workspace");
        }
        await userEvent.click(bar, { position: { x: 2, y: 2 }, force: true });
        assert.isFalse(modal.contains(document.activeElement), "focus is outside the workspace");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"), "Esc cancels from outside too");
        });
        // Cancel puts the selection back as it was: no step.
        await waitFor(() => {
            const steps = unionOf(session, layer.id)?.branches.flatMap((branch) => branch.steps) ?? [];
            assert.lengthOf(steps, 0);
        });
    });
});

describe("a style layer's scope at the top of its panel (the owner, 2026-11-04)", () => {
    it("a new layer shows Style Nodes... and Style Edges... with no hover, and each opens the modal", async () => {
        await openLayer();
        await userEvent.click(page.getByRole("button", { name: "Add a layer or a folder", exact: true }));
        await userEvent.click(page.getByRole("menuitem", { name: "Layer", exact: true }));
        await screen.findByRole("textbox", { name: "Layer name" });
        await userEvent.keyboard("{Escape}");
        const tab = await screen.findByTestId("style-tab");
        for (const [side, word] of [
            ["Node", "nodes"],
            ["Edge", "edges"],
        ]) {
            await userEvent.click(page.elementLocator(tab).getByRole("tab", { name: new RegExp(`^${side}`) }));
            const edit = await within(tab).findByRole("button", { name: `Style ${side}s...` });
            assert.strictEqual(getComputedStyle(edit).opacity, "1", `Style ${side}s... is drawn at rest`);
            assert.isAbove(edit.getBoundingClientRect().width, 0);
            await userEvent.click(
                page.elementLocator(tab).getByRole("button", { name: `Style ${side}s...`, exact: true }),
            );
            const modal = await screen.findByRole("dialog", { name: new RegExp(`Which ${word}`) });
            await userEvent.click(page.elementLocator(modal).getByRole("button", { name: /^Cancel/ }));
            await waitFor(() => {
                assert.isNull(document.querySelector(".sel-ws"));
            });
        }
    });
});

describe("a card's More menu and the title's", () => {
    /**
     * Runs one item of a "..." menu.
     * @param name - whose menu: a card's letter or the title.
     * @param item - the item's label.
     */
    async function runItem(name: string, item: RegExp): Promise<void> {
        await userEvent.click(page.getByRole("button", { name: `More for ${name}`, exact: true }));
        await userEvent.click(page.getByRole("menuitem", { name: item, exact: true }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu"), "the menu closed");
        });
    }

    it("Turn off, Duplicate, Move up, Save as set and Delete act on their card, and each is said", async () => {
        const { session, layer, heard } = await twoCards();
        const branches = (): UnionLeaf["branches"] => unionOf(session, layer.id)?.branches ?? [];
        const [a, b] = branches().map((each) => each.id ?? "");

        await runItem("B", /^Turn off/);
        await waitFor(() => {
            assert.isFalse(branches()[1]?.on, "B is off");
        });
        await waitFor(() => {
            assert.include(heard, "B off", "the card menu's words, shared with the join workspace");
        });
        await runItem("B", /^Turn on/);
        await waitFor(() => {
            assert.notStrictEqual(branches()[1]?.on, false, "B is on again");
        });
        await waitFor(() => {
            assert.include(heard, "B on");
        });

        await runItem("B", /^Move up/);
        await waitFor(() => {
            assert.deepEqual(
                branches().map((each) => each.id),
                [b, a],
            );
        });
        await waitFor(() => {
            assert.include(heard, "Moved up B", "said by which way it moved, never by the card it passed");
        });

        await runItem("A", /^Duplicate/);
        await waitFor(() => {
            assert.lengthOf(branches(), 3);
        });
        const copy = branches().find((each) => each.id !== a && each.id !== b);
        assert.deepEqual(copy?.steps[0]?.rule, branches().find((each) => each.id === a)?.steps[0]?.rule);

        await runItem("A", /^Save as set/);
        await waitFor(() => {
            assert.isTrue(
                session.sets.list().some((set) => set.name === "A"),
                "a set named after the card",
            );
        });

        await runItem("A", /^Delete/);
        await waitFor(() => {
            assert.isFalse(
                branches().some((each) => each.id === a),
                "A is gone",
            );
        });
        assert.lengthOf(branches(), 2);
    });

    it("the title's Clear takes the selection back to one empty card", async () => {
        const { session, layer, modal } = await twoCards();
        const title = modal.querySelector<HTMLElement>("[aria-label^='More for ']")?.getAttribute("aria-label") ?? "";
        await runItem(title.replace(/^More for /, ""), /^Clear/);
        await waitFor(() => {
            const branches = unionOf(session, layer.id)?.branches ?? [];
            assert.isTrue(
                branches.every((each) => each.steps.length === 0),
                "no step is left",
            );
        });
        await waitFor(() => {
            assert.lengthOf(cards(), 1);
        });
    });
    it("names keys in tooltips and to a screen reader, never drawn in a menu (#10394)", async () => {
        await twoCards();
        await userEvent.click(page.getByRole("button", { name: "More for B" }));
        const menu = await screen.findByRole("menu");
        const items = within(menu).getAllByRole("menuitem");
        const withKeys = items.filter((item) => item.hasAttribute("aria-keyshortcuts"));
        assert.isNotEmpty(withKeys, "the card's menu has keyed items");
        for (const item of withKeys) {
            // As a menu draws a key: "Control+D" is "Ctrl+D", "Delete" is "Del".
            const drawn = (item.getAttribute("aria-keyshortcuts") ?? "")
                .replace("Control", "Ctrl")
                .replace("Meta", "Cmd")
                .replace("Delete", "Del");
            // A drawn key ends its row ("DeleteDel"); a label may hold its letters ("Delete").
            assert.isFalse((item.textContent ?? "").endsWith(drawn), `${drawn} is not drawn on its row`);
        }
        const keyed = items.find(
            (item) => item.hasAttribute("aria-keyshortcuts") && item.getAttribute("aria-disabled") !== "true",
        );
        if (keyed === undefined) {
            throw new Error("no enabled menu item has a key");
        }
        // Arrow down to it: the item's tooltip then names its label and its key.
        for (const _ of items) {
            if (document.activeElement === keyed) {
                break;
            }
            await userEvent.keyboard("{ArrowDown}");
        }
        assert.strictEqual(document.activeElement, keyed, "the keyed item has keyboard focus");
        const tip = await screen.findByRole("tooltip", { name: new RegExp(`^${keyed.textContent ?? ""}`, "u") });
        assert.notStrictEqual(tip.textContent, keyed.textContent, "the tooltip adds the key to the label");
        await userEvent.keyboard("{Escape}");
    });

    it("the title's Frame the matches frames what the cards match, from the angle the camera looks", async () => {
        await openLayer(LES_MISERABLES, "Calm", {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    id: "a",
                    start: "none",
                    steps: [{ id: "v", op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 0 } }],
                },
            ],
        });
        const modal = await openModal();
        const element = document.querySelector("graphty-element");
        if (element === null) {
            throw new Error("no element");
        }
        await element.waitForStableFrame();
        const valjean = { nodes: ["Valjean"], params: { keepAngle: true } };
        assert.notDeepEqual(
            element.resolveCameraPreset("fitToGraph", valjean),
            element.resolveCameraPreset("fitToGraph", { params: { keepAngle: true } }),
            "one node frames differently from the graph",
        );
        const title = modal.querySelector<HTMLElement>("[aria-label^='More for ']")?.getAttribute("aria-label") ?? "";
        await runItem(title.replace(/^More for /, ""), /^Frame the matches/);
        await waitFor(() => {
            // Measured when compared, as the preview's cell is the canvas the camera frames.
            const { position, target } = element.resolveCameraPreset("fitToGraph", valjean);
            const now = element.getCameraState();
            assert.isDefined(position);
            assert.isDefined(target);
            for (const axis of ["x", "y", "z"] as const) {
                assert.closeTo(now.target?.[axis] ?? Number.NaN, target?.[axis] ?? 0, 1e-3, `target.${axis}`);
            }
            const span = (axis: "x" | "y" | "z"): number => (position?.[axis] ?? 0) - (target?.[axis] ?? 0);
            assert.closeTo(now.cameraDistance ?? Number.NaN, Math.hypot(span("x"), span("y"), span("z")), 1e-3);
        });
        assert.isTrue(modal.isConnected, "the workspace stays open");
    });

    it("the title's Select N selects what the cards match", async () => {
        const { session, layer, modal } = await twoCards();
        const title = modal.querySelector<HTMLElement>("[aria-label^='More for ']")?.getAttribute("aria-label") ?? "";
        const where = session.styles.get(layer.id)?.selector;
        assert.strictEqual(where?.match, "rule");
        const count =
            where?.match === "rule"
                ? (await session.scope.count({ define: { kind: "rule", where: where.where, reading: "clipped" } }))
                      .nodes
                : -1;
        assert.isAbove(count, 0);
        await runItem(title.replace(/^More for /, ""), new RegExp(`^Select ${String(count)}`));
        await waitFor(() => {
            assert.equal(session.selection.nodes.length, count);
        });
    });

    it("Tab keeps focus inside the workspace, both ways", async () => {
        const { modal } = await twoCards();
        const stops = modal.querySelectorAll("button, input, [tabindex='0']").length + 2;
        for (let i = 0; i < stops; i++) {
            await userEvent.keyboard("{Tab}");
            assert.isTrue(modal.contains(document.activeElement), `Tab ${String(i + 1)} stays in the workspace`);
        }
        for (let i = 0; i < stops; i++) {
            await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
            assert.isTrue(modal.contains(document.activeElement), `Shift+Tab ${String(i + 1)} stays in the workspace`);
        }
    });
});
