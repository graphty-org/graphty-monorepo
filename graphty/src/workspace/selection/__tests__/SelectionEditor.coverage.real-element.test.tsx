/**
 * The selection editor's less traveled paths on the REAL graphty-element, driven by real clicks and
 * keys. In a style layer's workspace: at the card limit "+ Card" is disabled and says how many cards it
 * takes, and a card's Duplicate says there is no room; a card's Start with switches All to
 * None, and a card that then only narrows nothing says it passes none; a card renamed to nothing
 * goes back to its letter; "+ Card" with a value that takes no test adds the card at once; Enter on
 * an empty card's Value opens its picker and a press on the open field keeps it open; and Done
 * after deleting the last card keeps All. In a filter card: switching a new card's side by its arrow keeps
 * focus on the side with the picker shut; the workspace's title keeps a name typed again unchanged and
 * goes back to its cards' name when emptied; and a card whose on box is off says so while edited.
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
import { cardPalette } from "../cardPalette";

// Every experiment stays off here.
withFeatures([]);

const DEGREE_6_TO_10: RuleTree = { kind: "range", attribute: "graphty.degree", min: 6, max: 10 };

/**
 * The workspace on a place, its element up.
 * @param place - the place to open on.
 * @returns the session.
 */
async function openWorkspace(place?: "data"): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({
        project: { name: "Untitled", id: 1 },
        ...(place === undefined ? {} : { place }),
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
    return session;
}

/**
 * Les Miserables with a reader's layer selected in the style tree.
 * @param where - the layer's selection, or everything.
 * @returns the session and the layer.
 */
async function openLayer(where?: UnionLeaf): Promise<{ session: GraphSession; layer: Layer }> {
    const session = await openWorkspace();
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    const layer = await session.styles.add({
        name: "Calm",
        target: "node",
        selector: where === undefined ? { match: "everything" } : { match: "rule", where },
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
 * Opens the workspace with the sidebar's Style Nodes...
 * @returns the workspace.
 */
async function openModal(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: /^Style Nodes\.\.\./ }));
    return modal();
}

/**
 * The open workspace, once it is drawn.
 * @returns the workspace.
 */
function modal(): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        return found;
    });
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

/**
 * One card that keeps nodes of degree 6 to 10 out of All nodes.
 * @param name - the card's name.
 * @returns the selection.
 */
const oneCard = (name?: string): UnionLeaf => ({
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            id: "a",
            ...(name === undefined ? {} : { name }),
            start: "all",
            steps: [{ id: "deg", op: "keep", rule: DEGREE_6_TO_10 }],
        },
    ],
});

/**
 * Closes the workspace with its Done.
 * @param ws - the workspace.
 */
async function done(ws: HTMLElement): Promise<void> {
    await userEvent.click(within(ws).getByRole("button", { name: /^Done/ }));
    await waitFor(() => {
        assert.isNull(document.querySelector(".sel-ws"), "the workspace closed");
    });
}

describe("a style layer's workspace", () => {
    it("at the card limit, + Card is disabled and says how many it takes, and Duplicate says there is no room", async () => {
        const session = await openWorkspace();
        const most = cardPalette(session.catalog.palettes()).length;
        // Each card holds one degree, so every card is a real group of its own.
        const full: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: Array.from({ length: most }, (_, at) => ({
                id: `c${String(at)}`,
                start: "none" as const,
                steps: [
                    {
                        id: `s${String(at)}`,
                        op: "add" as const,
                        rule: { kind: "range" as const, attribute: "graphty.degree", min: at + 1, max: at + 1 },
                    },
                ],
            })),
        };
        await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
        await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
        await session.styles.add({
            name: "Calm",
            target: "node",
            selector: { match: "rule", where: full },
            set: { "node.color": "#d55e00" },
        });
        await session.styles.settled();
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Calm, / }));
        const ws = await openModal();
        await waitFor(() => {
            assert.lengthOf(cards(), most);
        });

        const add = within(ws).getByRole("button", { name: /^Card$/ });
        await waitFor(() => {
            assert.strictEqual(add.getAttribute("aria-disabled"), "true", "+ Card takes no more");
        });
        within(ws).getByText(`${String(most)} cards at most`);
        assert.strictEqual(add.getAttribute("aria-description"), `At most ${String(most)} cards`);

        await userEvent.click(within(ws).getByRole("button", { name: "More for A" }));
        const duplicate = await screen.findByRole("menuitem", { name: /^Duplicate/ });
        assert.include(duplicate.textContent, "No more cards");
        assert.strictEqual(duplicate.getAttribute("aria-disabled"), "true", "Duplicate cannot run");
        await userEvent.keyboard("{Escape}");
    });

    it("Start with switches a card from All to None, and the card that then only narrows nothing passes none", async () => {
        const { session, layer } = await openLayer(oneCard());
        const ws = await openModal();
        const card = await waitFor(() => {
            const [found] = cards();
            assert.isDefined(found);
            return found;
        });
        assert.notInclude(card.textContent, "Passes none");
        await userEvent.click(within(card).getByRole("button", { name: "All nodes" }));
        await within(card).findByRole("button", { name: "No nodes" });
        await waitFor(() => {
            assert.include(card.textContent, "Passes none", "Keep from nothing keeps nothing");
        });
        await done(ws);
        await waitFor(() => {
            assert.strictEqual(unionOf(session, layer.id)?.branches[0]?.start, "none");
        });
    });

    it("a card renamed to nothing goes back to its letter", async () => {
        const { session, layer } = await openLayer(oneCard("Busy"));
        const ws = await openModal();
        await userEvent.click(await within(ws).findByRole("button", { name: "More for Busy" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Rename/ }));
        // The card's name turns into a box in its header, its name selected.
        await waitFor(() => {
            const box = ws.querySelector(".cm-card-head input");
            assert.isNotNull(box);
            assert.strictEqual(document.activeElement, box);
        });
        await userEvent.keyboard("{Control>}a{/Control}{Backspace}{Enter}");
        await within(ws).findByRole("button", { name: "More for A" });
        await done(ws);
        await waitFor(() => {
            const branch = unionOf(session, layer.id)?.branches[0];
            assert.isDefined(branch);
            assert.isUndefined(branch?.name, "the card has no name of its own");
        });
    });

    it("+ Card with a value that takes no test adds the card at once", async () => {
        const { session, layer } = await openLayer(oneCard());
        const ws = await openModal();
        await waitFor(() => {
            assert.lengthOf(cards(), 1);
        });
        await userEvent.click(within(ws).getByRole("button", { name: /^Card$/ }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Largest component{Enter}");
        await waitFor(() => {
            assert.lengthOf(cards(), 2);
        });
        assert.isNull(screen.queryByRole("combobox", { name: "Find attributes, results" }), "the picker closed");
        await done(ws);
        await waitFor(() => {
            const rule = unionOf(session, layer.id)?.branches[1]?.steps[0]?.rule;
            assert.strictEqual(rule?.kind, "member");
            assert.strictEqual(rule?.kind === "member" ? rule.of : undefined, "largest-component");
        });
    });

    it("Enter on an empty card's Value opens its picker, and a press on the open field keeps it open", async () => {
        await openLayer();
        const ws = await openModal();
        const field = await within(ws).findByRole("button", { name: "Value" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field, "the empty card's Value has focus");
        });
        await userEvent.keyboard("{Enter}");
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        assert.strictEqual(field.getAttribute("aria-expanded"), "true");

        await userEvent.click(field);
        await waitFor(() => {
            assert.strictEqual(field.getAttribute("aria-expanded"), "true", "the list stays open");
            assert.isNotNull(screen.queryByRole("combobox", { name: "Find attributes, results" }));
        });
        assert.lengthOf(cards(), 1, "the empty card stays");
    });

    it("Done after deleting the only card keeps All", async () => {
        const { session, layer } = await openLayer(oneCard());
        const ws = await openModal();
        await userEvent.click(await within(ws).findByRole("button", { name: "More for A" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Delete/ }));
        await waitFor(() => {
            const [card] = cards();
            assert.isDefined(card);
            assert.lengthOf(cards(), 1, "one empty card is left");
            within(card).getByRole("button", { name: "Value" });
        });
        await done(ws);
        await waitFor(() => {
            const selector = session.styles.get(layer.id)?.selector;
            const union = unionOf(session, layer.id);
            const all =
                selector?.match === "everything" ||
                (union?.branches.length === 1 &&
                    union.branches[0]?.start === "all" &&
                    union.branches[0].steps.length === 0);
            assert.isTrue(all, `the layer selects every node: ${JSON.stringify(selector)}`);
        });
    });
});

/** Who holds each role, by place: 3 board, 5 staff, 16 volunteers. */
const ROLES = [
    ...Array<string>(3).fill("board"),
    ...Array<string>(5).fill("staff"),
    ...Array<string>(16).fill("volunteer"),
];

/** 24 people in a chain. */
const PEOPLE = JSON.stringify({
    nodes: ROLES.map((role, at) => ({ id: `p${String(at + 1)}`, role })),
    edges: Array.from({ length: 23 }, (_, at) => ({ source: `p${String(at + 1)}`, target: `p${String(at + 2)}` })),
});

/**
 * The Data place with the 24 people loaded.
 * @returns the session.
 */
async function openPeople(): Promise<GraphSession> {
    const session = await openWorkspace("data");
    await session.data.import({ type: "json", name: "people.json", config: { data: PEOPLE } });
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".dp-source-sections [data-filters-plus]"), "the load's Filters");
    });
    return session;
}

/**
 * A new filter card on role, board ticked.
 * @returns the workspace.
 */
async function boardCard(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
    await userEvent.click(await screen.findByRole("button", { name: "Value" }));
    await userEvent.click(await screen.findByRole("option", { name: /^role(,|$)/ }));
    const values = await screen.findByRole("group", { name: "role values" });
    await userEvent.click(within(values).getByRole("checkbox", { name: /^board/ }));
    return modal();
}

describe("a filter card's workspace", () => {
    it("switching a new card's side by its arrow keeps focus on the side, its value picker shut", async () => {
        await openPeople();
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        // The new card arrives with its Value field focused, its picker shut.
        await within(await modal()).findByRole("button", { name: "Value" });
        // A press on the side chosen puts focus on it; the arrow switches the side.
        const nodes = await within(await modal()).findByRole<HTMLInputElement>("radio", { name: "Nodes" });
        const label = nodes.labels?.[0];
        assert.isDefined(label, "the Nodes radio has a label");
        await userEvent.click(label ?? nodes);
        await userEvent.keyboard("{ArrowRight}");
        await waitFor(() => {
            const checked = document.querySelector<HTMLInputElement>(".sel-ws-cards input[type=radio]:checked");
            assert.strictEqual(checked?.value, "edge");
            assert.strictEqual(document.activeElement, checked, "focus stays on the side chosen");
        });
        assert.isNull(screen.queryByRole("combobox", { name: "Find attributes, results" }), "the picker waits shut");
        const field = within(await modal()).getByRole("button", { name: "Value" });
        assert.strictEqual(field.getAttribute("aria-expanded"), "false");
    });

    it("the title keeps a name typed again unchanged, and goes back to its cards' name when emptied", async () => {
        const session = await openPeople();
        const ws = await boardCard();
        const head = (): HTMLElement => {
            const found = ws.querySelector<HTMLElement>(".sel-ws-head");
            assert.isNotNull(found);
            return found;
        };
        // The card is named after what it holds until it is given a name of its own.
        const original = "role board, rename";
        const first = await within(head()).findByRole("button", { name: original });
        await userEvent.click(first);
        await userEvent.keyboard("{Enter}");
        await within(head()).findByRole("button", { name: original });

        await userEvent.click(within(head()).getByRole("button", { name: original }));
        await userEvent.keyboard("{Control>}a{/Control}Board{Enter}");
        await within(head()).findByRole("button", { name: "Board, rename" });
        await userEvent.click(within(head()).getByRole("button", { name: "Board, rename" }));
        await userEvent.keyboard("{Control>}a{/Control}{Backspace}{Enter}");
        await within(head()).findByRole("button", { name: original });

        await done(ws);
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1);
        });
        assert.notStrictEqual(session.visibility.conditions[0]?.name, "Board", "the emptied name is not kept");
        assert.match(document.querySelector(".dp-filter-name")?.textContent ?? "", /^role board/);
    });

    it("a card whose on box is off says so while it is edited", async () => {
        await openPeople();
        await done(await boardCard());
        const list = await screen.findByRole("list", { name: "Filters" });
        await userEvent.click(within(list).getByRole("checkbox", { name: /^Use/ }));
        await waitFor(() => {
            assert.isFalse(within(list).getByRole<HTMLInputElement>("checkbox", { name: /^Use/ }).checked);
        });
        await userEvent.click(list.querySelector<HTMLElement>(".dp-filter-name") ?? document.body);
        await modal();
        await waitFor(() => {
            const title = document.querySelector<HTMLElement>('.sel-outline [data-row="title"]');
            assert.match(title?.getAttribute("aria-label") ?? "", /, being edited, off$/);
        });
    });
});
