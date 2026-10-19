/**
 * The label's Plain / Card choice and the card's contents on the REAL graphty-element: a reader
 * labels nodes by an attribute, switches the label to Card, adds a row from the data list, gives
 * it words, moves it up from the keyboard, and the node's label reads the card's lines. A line
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
 * The visible face of one Label kind (Plain or Card): the label of its radio, which is what a
 * reader clicks.
 * @param name - the kind.
 * @returns the label.
 */
async function kind(name: string): Promise<HTMLElement> {
    const radio = within(await labelSection()).getByRole<HTMLInputElement>("radio", { name });
    const face = radio.labels?.[0];
    if (face === undefined) {
        throw new Error(`${name} has no label`);
    }
    return face;
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
    const layer = session.styles.list().find((l) => l.userData?.graphtyEverything === true);
    const bound = layer?.encode?.["node.label"];
    return bound !== undefined && "template" in bound ? bound.template : undefined;
}

describe("the label's Card choice on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("switches Plain to Card, adds and moves a row, and the node's label reads the card", async () => {
        const { session, element } = await opened();
        await userEvent.click(within(await labelSection()).getByRole("button", { name: "Add label line" }));
        await pick("name");
        await waitFor(() => {
            assert.isNotNull(within(screen.getByTestId("style-tab")).queryByRole("radio", { name: "Card" }));
        });

        // Card: the look goes on, and the plain label's value becomes the first row, in bold.
        await userEvent.click(await kind("Card"));
        await waitFor(() => {
            assert.deepEqual(template(session), ["<bold>{data.name}</bold>"]);
        });
        const layer = session.styles.list().find((l) => l.userData?.graphtyEverything === true);
        const style = layer?.set?.["node.labelStyle"];
        assert.isTrue(typeof style === "object" && "panelShadow" in style && style.panelShadow === true);
        assert.isNotNull(within(await labelSection()).getByRole("checkbox", { name: "Close button" }));

        // A second row from the data list, then its words.
        await userEvent.click(within(await labelSection()).getByRole("button", { name: "Add card row" }));
        await pick("dept");
        await waitFor(() => {
            assert.deepEqual(template(session), ["<bold>{data.name}</bold>", "{data.dept}"]);
        });
        await userEvent.type(
            within(await labelSection()).getByRole("textbox", { name: "Card row 2 words" }),
            "Dept: {Enter}",
        );
        await waitFor(() => {
            assert.deepEqual(template(session), ["<bold>{data.name}</bold>", "Dept: {data.dept}"]);
        });

        // Move it up from the keyboard: focus its menu, open it, walk to Move up.
        within(await labelSection())
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

        // Plain again: the look comes off and the label reads the first row's value.
        await userEvent.click(await kind("Plain"));
        await waitFor(() => {
            const bound = session.styles.list().find((l) => l.userData?.graphtyEverything === true)?.encode?.[
                "node.label"
            ];
            assert.equal(bound !== undefined && "by" in bound ? bound.by : undefined, "data.dept");
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
            const kind = within(await labelSection()).getByRole("radio", { name: "Card" });
            assert.isTrue((kind as HTMLInputElement).checked);
        });
        const label = await labelSection();
        const community = "Community {results.louvain.group|rank} of {results.louvain.group|count}";
        assert.isNotNull(within(label).getByLabelText(`Card row 3, written by hand: ${community}`));

        // An edit elsewhere on the card keeps the hand-written line exactly.
        await userEvent.click(within(label).getByRole("button", { name: "Add card row" }));
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
