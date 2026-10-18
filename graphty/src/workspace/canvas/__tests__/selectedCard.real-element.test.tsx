/**
 * The selected node's card on the REAL graphty-element: a real click on a node shows its card, the
 * Connections and Community rows appear only once those results exist, a real click on the card's
 * x clears the selection, and the layer is added once and can be removed.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, waitFor } from "../../../test/test-utils";
import { Workspace } from "../../Workspace";
import { SELECTED_CARD_TEMPLATE_ID } from "../selectedCard";

/** A hang guard for the element coming up and running, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** Two triangles joined by one edge, placed where the fixed layout keeps them. */
const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: -6, y: 2, z: 0 } },
    { id: "c", position: { x: -6, y: -2, z: 0 } },
    { id: "d", position: { x: 4, y: 0, z: 0 } },
    { id: "e", position: { x: 6, y: 2, z: 0 } },
    { id: "f", position: { x: 6, y: -2, z: 0 } },
];
const EDGES = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
    { source: "c", target: "a" },
    { source: "d", target: "e" },
    { source: "e", target: "f" },
    { source: "f", target: "d" },
    { source: "a", target: "d" },
];

type Element = HTMLElementTagNameMap["graphty-element"];

/**
 * Opens a project, waits for its element and loads the graph on the fixed layout.
 * @returns the element and its session.
 */
async function opened(): Promise<{ element: Element; session: GraphSession }> {
    render(<Workspace initialState={{ project: { name: "Card", id: 1 } }} />);
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
    await waitFor(
        () => {
            assert.lengthOf(cards(session), 1, "the card layer is added once");
        },
        { timeout: TIMEOUT_MS },
    );
    await session.layout.set("fixed");
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    await (element as Element).waitForStableFrame();
    return { element, session };
}

/**
 * The card layers in the stack.
 * @param session - the element's session.
 * @returns them.
 */
function cards(session: GraphSession): ReturnType<GraphSession["styles"]["list"]> {
    return session.styles
        .list()
        .filter((layer) => layer.source.by === "template" && layer.source.templateId === SELECTED_CARD_TEMPLATE_ID);
}

/**
 * Click a point on the canvas with the browser's own pointer, and wait for the picture.
 * @param element - the element.
 * @param point - where, in CSS pixels from its top-left corner.
 * @param point.x - across.
 * @param point.y - down.
 */
async function clickAt(element: Element, point: { x: number; y: number }): Promise<void> {
    await userEvent.click(element, { position: point });
    await element.session.styles.settled();
    await element.waitForStableFrame();
}

/**
 * Click a node.
 * @param element - the element.
 * @param id - the node.
 */
async function clickNode(element: Element, id: string): Promise<void> {
    const at = element.nodeScreenPosition(id);
    assert.isTrue(at?.visible, `node ${id} is on screen`);
    await clickAt(element, { x: at?.x ?? 0, y: at?.y ?? 0 });
}

/**
 * The lines of a node's card, as read (its markup taken out).
 * @param element - the element.
 * @param id - the node.
 * @returns them, or undefined when it has no label drawn.
 */
function lines(element: Element, id: string): string[] | undefined {
    const label = element.labelOf(id);
    return label?.drawn === true ? label.text.split("\n") : undefined;
}

beforeAll(async () => {
    await page.viewport(1366, 768);
});

describe("the selected node's card", () => {
    it("shows on a clicked node, grows rows as results arrive, and its x clears the selection", async () => {
        const { element, session } = await opened();

        await clickNode(element, "a");
        assert.deepStrictEqual([...session.selection.nodes].map(String), ["a"]);
        assert.deepStrictEqual(lines(element, "a"), ["a"], "no rows before any result");
        assert.isUndefined(lines(element, "d"), "an unselected node has no card");

        await session.runs.start("degree", {}, { style: false });
        await session.styles.settled();
        await element.waitForStableFrame();
        assert.deepStrictEqual(lines(element, "a"), ["a", "Connections: 3"]);

        await session.runs.start("louvain", {}, { style: false });
        await session.styles.settled();
        await element.waitForStableFrame();
        const card = lines(element, "a");
        assert.lengthOf(card ?? [], 3);
        assert.match(card?.[2] ?? "", /^Community [12] of 2$/);

        const x = element.labelOf("a")?.closeRect;
        assert.isDefined(x, "the card reports where its x is");
        await clickAt(element, { x: x.x + x.width / 2, y: x.y + x.height / 2 });
        assert.deepStrictEqual([...session.selection.nodes], [], "the x cleared the selection");
        assert.isUndefined(lines(element, "a"), "the card went with the selection");
    });

    it("covers a node nearer the camera, so a click there stays the card's", async () => {
        const { element, session } = await opened();
        // g sits in front of a (the camera looks along +z) and just right of it, under its card.
        await session.data.addNodes([{ id: "g", position: { x: -2.5, y: 0, z: -2 } }]);
        await element.waitForStableFrame();
        await clickNode(element, "a");
        assert.deepStrictEqual([...session.selection.nodes].map(String), ["a"]);

        const x = element.labelOf("a")?.closeRect;
        const a = element.nodeScreenPosition("a");
        const g = element.nodeScreenPosition("g");
        assert.isDefined(x);
        assert.isTrue(g?.visible, "g is on screen");
        assert.isTrue(
            (g?.x ?? 0) > (a?.x ?? 0) && (g?.x ?? 0) < x.x && (g?.y ?? 0) > x.y,
            `g is drawn inside the card: ${JSON.stringify({ a, g, x })}`,
        );

        await clickAt(element, { x: g?.x ?? 0, y: g?.y ?? 0 });
        assert.deepStrictEqual(
            [...session.selection.nodes].map(String),
            ["a"],
            "the card covers g, so the click is the card's and selects nothing new",
        );
    });

    it("is not added again once the reader removes it", async () => {
        const { session } = await opened();
        const [card] = cards(session);
        assert.isDefined(card);
        await session.styles.remove(card.id);
        await session.data.addNodes([{ id: "g", position: { x: 0, y: 4, z: 0 } }]);
        await session.styles.settled();
        assert.lengthOf(cards(session), 0);
    });
});
