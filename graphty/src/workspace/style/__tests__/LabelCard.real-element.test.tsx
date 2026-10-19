/**
 * The Label section's card row on the REAL graphty-element: a reader adds a card from the Label
 * "+", opens its settings popover, switches the shadow off, adds a row from the data list, gives
 * it words, moves it up from the keyboard, closes the popover with Escape, and the node's label
 * reads the card's lines; "-" removes the card, and "+" swaps a label for a card and back. A line
 * written by hand (the selected-node card's Community line) is shown as written and kept.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { SELECTED_CARD_TEMPLATE_ID } from "../../canvas/selectedCard";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and painting, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

const NODES = [
    { id: "1", name: "Alpha", dept: "east" },
    { id: "2", name: "Beta", dept: "west" },
];

type Element = HTMLElementTagNameMap["graphty-element"];

/**
 * Renders the workspace on the Everything row, waits for the element and loads two nodes.
 * @returns the session, the element and the store.
 */
async function opened(): Promise<{ session: GraphSession; element: Element; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Card", id: 1 }, inspected: { kind: "everything-row" } });
    render(<Workspace store={store} />);
    let element: Element | null = null;
    await waitFor(
        () => {
            element = document.querySelector("graphty-element");
            assert.isDefined(element?.session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (element === null) {
        throw new Error("the element never came up");
    }
    const { session } = element as Element;
    await session.data.addNodes(NODES);
    return { session, element, store };
}

/**
 * The Label section of the Style tab.
 * @returns it.
 */
async function labelSection(): Promise<HTMLElement> {
    const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
    return within(tab).getByRole("group", { name: "Label" });
}

/**
 * Opens the Label "+" and picks one of its kinds.
 * @param name - the menu item's name, or a pattern for it.
 */
async function add(name: string | RegExp): Promise<void> {
    await userEvent.click(within(await labelSection()).getByRole("button", { name: "Add label or card" }));
    await userEvent.click(await screen.findByRole("menuitem", { name }));
}

/**
 * Opens the card's settings popover from its row's settings button.
 * @returns the popover.
 */
async function openSettings(): Promise<HTMLElement> {
    await userEvent.click(within(await labelSection()).getByRole("button", { name: "Card settings" }));
    return screen.findByRole("dialog", { name: "Card settings" });
}

/**
 * The reader's Everything layer.
 * @param session - the element's session.
 * @returns it, if it exists.
 */
function everything(session: GraphSession): ReturnType<GraphSession["styles"]["list"]>[number] | undefined {
    return session.styles.list().find((l) => l.userData?.graphtyEverything === true);
}

/**
 * The node label style the reader's Everything layer sets.
 * @param session - the element's session.
 * @returns it, or undefined.
 */
function labelStyle(session: GraphSession): Record<string, unknown> | undefined {
    const style = everything(session)?.set?.["node.labelStyle"];
    return typeof style === "object" ? (style as Record<string, unknown>) : undefined;
}

/**
 * Picks an attribute from the open From data list.
 * @param name - the attribute.
 */
async function pick(name: string): Promise<void> {
    const list = await screen.findByRole("dialog", { name: "From data" });
    await userEvent.click(within(list).getByRole("option", { name }));
}

/**
 * The template the reader's Everything layer writes for the node label.
 * @param session - the element's session.
 * @returns its lines, or undefined.
 */
function template(session: GraphSession): readonly string[] | undefined {
    const bound = everything(session)?.encode?.["node.label"];
    return bound !== undefined && "template" in bound ? bound.template : undefined;
}

describe("the Label section's card row on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("+ Card makes one card row whose settings popover edits the look and the contents", async () => {
        const { session, element } = await opened();
        // "+" -> Card: an empty row with its attribute list open; the pick is the card's first row.
        await add("Card");
        assert.isNotNull(within(await labelSection()).getByRole("button", { name: /^Card, Above: no attribute/ }));
        await pick("name");
        await waitFor(() => {
            assert.deepEqual(template(session), ["<bold>{data.name}</bold>"]);
        });
        assert.equal(labelStyle(session)?.panelShadow, true);
        // One row at rest: position, color, first value, settings button and "-"; no options shown.
        const section = await labelSection();
        assert.isNotNull(within(section).getByRole("group", { name: "Card, Above: name" }));
        assert.isNull(within(section).queryByRole("checkbox", { name: "Shadow" }));

        // The settings popover: switching the shadow off writes the element's label style.
        let settings = await openSettings();
        await userEvent.click(within(settings).getByRole("checkbox", { name: "Shadow" }));
        await waitFor(() => {
            assert.equal(labelStyle(session)?.panelShadow, false);
        });

        // A second row from the data list, then its words.
        settings = await screen.findByRole("dialog", { name: "Card settings" });
        await userEvent.click(within(settings).getByRole("button", { name: "Add card row" }));
        await pick("dept");
        await waitFor(() => {
            assert.deepEqual(template(session), ["<bold>{data.name}</bold>", "{data.dept}"]);
        });
        settings = await screen.findByRole("dialog", { name: "Card settings" });
        await userEvent.type(within(settings).getByRole("textbox", { name: "Card row 2 words" }), "Dept: {Enter}");
        await waitFor(() => {
            assert.deepEqual(template(session), ["<bold>{data.name}</bold>", "Dept: {data.dept}"]);
        });

        // Move it up from the keyboard: focus its menu, open it, walk to Move up.
        within(await screen.findByRole("dialog", { name: "Card settings" }))
            .getByRole("button", { name: "Card row 2 actions" })
            .focus();
        await userEvent.keyboard("{Enter}");
        const moveUp = await screen.findByRole("menuitem", { name: "Move up" });
        moveUp.focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepEqual(template(session), ["Dept: {data.dept}", "<bold>{data.name}</bold>"]);
        });

        // Escape closes the popover and focus goes back to its button.
        within(await screen.findByRole("dialog", { name: "Card settings" }))
            .getByRole("checkbox", { name: "Shadow" })
            .focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Card settings" }));
        });
        assert.equal(document.activeElement?.getAttribute("aria-label"), "Card settings");

        // The element draws the card's lines, in order.
        await session.styles.settled();
        await waitFor(
            () => {
                assert.equal(element.labelOf("1")?.text, "Dept: east\nAlpha");
            },
            { timeout: TIMEOUT_MS },
        );

        // "-" removes the card: its lines and its look.
        await userEvent.click(within(await labelSection()).getByRole("button", { name: "Remove card" }));
        await waitFor(() => {
            assert.isUndefined(template(session));
            assert.isUndefined(labelStyle(session)?.panelShadow);
        });
        assert.isNull(within(await labelSection()).queryByRole("button", { name: "Card settings" }));
    });

    it("+ offers the other kind once a row is there, which replaces it and keeps what it reads", async () => {
        const { session } = await opened();
        await add("Label");
        await pick("name");
        await waitFor(() => {
            const bound = everything(session)?.encode?.["node.label"];
            assert.equal(bound !== undefined && "by" in bound ? bound.by : undefined, "data.name");
        });

        await add(/^Card/);
        await waitFor(() => {
            assert.deepEqual(template(session), ["<bold>{data.name}</bold>"]);
            assert.equal(labelStyle(session)?.panelShadow, true);
        });

        await add(/^Label/);
        await waitFor(() => {
            const bound = everything(session)?.encode?.["node.label"];
            assert.equal(bound !== undefined && "by" in bound ? bound.by : undefined, "data.name");
            assert.isUndefined(labelStyle(session)?.panelShadow);
        });
    });

    it("keeps a line written by hand and shows it as written", async () => {
        const { session, store } = await opened();
        let card: ReturnType<GraphSession["styles"]["list"]>[number] | undefined;
        await waitFor(
            () => {
                card = session.styles
                    .list()
                    .find((l) => l.source.by === "template" && l.source.templateId === SELECTED_CARD_TEMPLATE_ID);
                assert.isDefined(card);
            },
            { timeout: TIMEOUT_MS },
        );
        if (card === undefined) {
            throw new Error("no card layer");
        }
        store.set({ inspected: { kind: "layer-row", id: card.id } });
        await waitFor(async () => {
            assert.isNotNull(within(await labelSection()).getByRole("button", { name: "Card settings" }));
        });
        const settings = await openSettings();
        const community = "Community {results.louvain.group|rank} of {results.louvain.group|count}";
        assert.isNotNull(within(settings).getByLabelText(`Card row 3, written by hand: ${community}`));

        // An edit elsewhere on the card keeps the hand-written line exactly.
        await userEvent.click(within(settings).getByRole("button", { name: "Add card row" }));
        await pick("name");
        await waitFor(() => {
            const bound = session.styles.get(card?.id ?? "")?.encode?.["node.label"];
            const lines = bound !== undefined && "template" in bound ? bound.template : [];
            assert.lengthOf(lines, 4);
            assert.equal(lines[2], community);
            assert.equal(lines[3], "{data.name}");
        });
    });
});
