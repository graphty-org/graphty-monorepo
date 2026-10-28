/**
 * A label drawn as a card, in the Style panel's Text list, on the REAL graphty-element: a reader
 * adds a Card from the Text "+", picks its first value, opens the label's settings, switches the
 * panel shadow off, adds a row from the value list, gives it words, moves it up from the keyboard,
 * closes the settings with Escape, and the node's label reads the card's lines; the minus removes
 * the card. A line written by hand (a Community line in a card a project file saved) is shown as
 * written and kept.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { findValuePicker, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { CARD_LOOK } from "../cardLook";

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
 * The Text list of the Style panel's Nodes group.
 * @returns it.
 */
async function textList(): Promise<HTMLElement> {
    const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
    const nodes = tab.querySelector<HTMLElement>('[data-group="node"]');
    if (nodes === null) {
        throw new Error("the Style panel draws no Nodes group");
    }
    return within(nodes).getByRole("group", { name: "Text" });
}

/**
 * Opens the label's settings pop-out from its settings button.
 * @returns the pop-out.
 */
async function openSettings(): Promise<HTMLElement> {
    await userEvent.click(within(await textList()).getByRole("button", { name: "Node label settings" }));
    return screen.findByRole("dialog", { name: "Label settings" });
}

/**
 * The label layer the reader's rows write.
 * @param session - the element's session.
 * @returns it, if it exists.
 */
function labelLayer(session: GraphSession): ReturnType<GraphSession["styles"]["list"]>[number] | undefined {
    return session.styles
        .list()
        .filter((l) => l.source.by !== "element")
        .find((l) => l.encode?.["node.label"] !== undefined || l.set?.["node.labelStyle"] !== undefined);
}

/**
 * The node label style the reader's layer sets.
 * @param session - the element's session.
 * @returns it, or undefined.
 */
function labelStyle(session: GraphSession): Record<string, unknown> | undefined {
    const style = labelLayer(session)?.set?.["node.labelStyle"];
    return typeof style === "object" ? (style as Record<string, unknown>) : undefined;
}

/**
 * Picks an attribute from the open value list.
 * @param name - the attribute.
 */
async function pick(name: string): Promise<void> {
    const list = await findValuePicker();
    await userEvent.click(within(list).getByRole("option", { name: new RegExp(`^${name}(,|$)`) }));
}

/**
 * The template the reader's layer writes for the node label.
 * @param session - the element's session.
 * @returns its lines, or undefined.
 */
function template(session: GraphSession): readonly string[] | undefined {
    const bound = labelLayer(session)?.encode?.["node.label"];
    return bound !== undefined && "template" in bound ? bound.template : undefined;
}

describe("a label drawn as a card on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("Text + Card makes a card whose settings edit its contents and its look", async () => {
        const { session, element } = await opened();
        // "+" -> Card: the value list opens; the pick is the card's first row, in bold.
        await userEvent.click(within(await textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Card" }));
        await pick("name");
        await waitFor(() => {
            assert.deepEqual(template(session), ["<bold>{data.name}</bold>"]);
        });
        assert.equal(labelStyle(session)?.panelShadow, true);
        assert.isNotNull(within(await textList()).getByRole("button", { name: "Label source: name" }));

        // The settings pop-out: switching the panel shadow off writes the element's label style.
        let settings = await openSettings();
        await userEvent.click(within(settings).getByRole("combobox", { name: /^Panel shadow/ }));
        await userEvent.click(await screen.findByRole("option", { name: "Off" }));
        await waitFor(() => {
            assert.equal(labelStyle(session)?.panelShadow, false);
        });

        // A second row from the value list, then its words.
        settings = await screen.findByRole("dialog", { name: "Label settings" });
        await userEvent.click(within(settings).getByRole("button", { name: "Add card row" }));
        await pick("dept");
        await waitFor(() => {
            assert.deepEqual(template(session), ["<bold>{data.name}</bold>", "{data.dept}"]);
        });
        settings = await screen.findByRole("dialog", { name: "Label settings" });
        await userEvent.type(within(settings).getByRole("textbox", { name: "Card row 2 words" }), "Dept: {Enter}");
        await waitFor(() => {
            assert.deepEqual(template(session), ["<bold>{data.name}</bold>", "Dept: {data.dept}"]);
        });

        // Move it up from the keyboard: focus its menu, open it, walk to Move up.
        within(await screen.findByRole("dialog", { name: "Label settings" }))
            .getByRole("button", { name: "Card row 2 actions" })
            .focus();
        await userEvent.keyboard("{Enter}");
        const moveUp = await screen.findByRole("menuitem", { name: "Move up" });
        moveUp.focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepEqual(template(session), ["Dept: {data.dept}", "<bold>{data.name}</bold>"]);
        });

        // The element draws the card's lines, in order.
        await session.styles.settled();
        await waitFor(
            () => {
                assert.equal(element.labelOf("1")?.text, "Dept: east\nAlpha");
            },
            { timeout: TIMEOUT_MS },
        );

        // The minus removes the card: its lines and its look.
        await userEvent.keyboard("{Escape}");
        await userEvent.click(within(await textList()).getByRole("button", { name: "Remove label" }));
        await waitFor(() => {
            assert.isUndefined(template(session));
            assert.isUndefined(labelStyle(session)?.panelShadow);
        });
    });

    it("keeps a line written by hand and shows it as written", async () => {
        const { session, store } = await opened();
        const community = "Community {results.louvain.group|rank} of {results.louvain.group|count}";
        // A card layer as a project file saved it, its third line written by hand.
        const card = await session.styles.add({
            name: "Selected card",
            target: "node",
            selector: { match: "member", of: "selection" },
            set: { "node.labelStyle": { enabled: true, ...CARD_LOOK } },
            encode: {
                "node.label": {
                    template: ["<bold>{data.id}</bold>", "Connections: {results.degree.value}", community],
                },
            },
        });
        store.set({ inspected: { kind: "layer-row", id: card.id } });
        await waitFor(async () => {
            assert.isNotNull(within(await textList()).getByRole("button", { name: "Node label settings" }));
        });
        const settings = await openSettings();
        assert.isNotNull(within(settings).getByLabelText(`Card row 3, written by hand: ${community}`));

        // An edit elsewhere on the card keeps the hand-written line exactly.
        await userEvent.click(within(settings).getByRole("button", { name: "Add card row" }));
        await pick("name");
        await waitFor(() => {
            const bound = session.styles.get(card.id)?.encode?.["node.label"];
            const lines = bound !== undefined && "template" in bound ? bound.template : [];
            assert.lengthOf(lines, 4);
            assert.equal(lines[2], community);
            assert.equal(lines[3], "{data.name}");
        });
    });
});
