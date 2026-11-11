/**
 * The layout form's "Shown nodes only" on the REAL graphty-element, driven by real input: on by
 * default, a filter lays out only the nodes it shows and leaves the hidden ones where they were;
 * unticked, the layout runs over the whole graph again, the hidden nodes keeping their slots.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A ring of twelve nodes. */
const IDS = Array.from({ length: 12 }, (_, i) => `n${String(i)}`);
const RING = IDS.map((src, i) => ({ src, dst: IDS[(i + 1) % IDS.length] }));

/** What the filter shows: the first half of the ring. */
const SHOWN = IDS.slice(0, 6);

/** What it hides. */
const HIDDEN = IDS.slice(6);

type Element = HTMLElementTagNameMap["graphty-element"];

/**
 * The workspace on the ring, its element up, laid out and the Layout tool enabled.
 * @returns the element and its session.
 */
async function openRing(): Promise<{ element: Element; session: GraphSession }> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Ring", id: 1 } })} />);
    const element = await waitFor(() => {
        const found = document.querySelector("graphty-element");
        assert.isDefined(found?.session);
        return found;
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    const { session } = element;
    await session.data.addNodes(IDS.map((id) => ({ id })));
    await session.data.addEdges(RING);
    const tool = screen.getByRole("button", { name: "Layout" });
    await waitFor(() => {
        assert.isFalse(tool.hasAttribute("aria-disabled"));
    });
    await element.waitForSettled();
    return { element, session };
}

/**
 * Where some nodes are, in the graph's own coordinates.
 * @param session - the element's session.
 * @param ids - the nodes.
 * @returns each node's x, y and z, in order.
 */
function placesOf(session: GraphSession, ids: readonly string[]): number[][] {
    const { ids: rows } = session.data.snapshot();
    const at = { x: 0, y: 0, z: 0 };
    return ids.map((id) => {
        session.positions.read(rows.indexOf(id), at);
        return [at.x, at.y, at.z];
    });
}

describe("the layout form's Shown nodes only", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it("lays out only what the filter shows, and the whole graph once unticked", async () => {
        const { element, session } = await openRing();

        await userEvent.click(screen.getByRole("button", { name: "Layout" }));
        const popover = await screen.findByRole("dialog", { name: "Layout" });
        await userEvent.click(within(popover).getByRole("option", { name: /^Circle(?!s)/ }));
        const shownOnly = await within(popover).findByRole("checkbox", { name: "Shown nodes only" });
        assert.isTrue((shownOnly as HTMLInputElement).checked, "on by default");
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
        await waitFor(() => {
            assert.strictEqual(session.layout.id, "circular");
        });
        await element.waitForSettled();

        const hiddenBefore = placesOf(session, HIDDEN);
        const shownBefore = placesOf(session, SHOWN);
        await session.visibility.set({ kind: "member", of: { nodes: SHOWN } });
        await element.waitForSettled();
        assert.notDeepEqual(placesOf(session, SHOWN), shownBefore, "the shown nodes are laid out again");
        assert.deepEqual(placesOf(session, HIDDEN), hiddenBefore, "the hidden nodes stay where they were");

        await userEvent.click(screen.getByRole("button", { name: "Layout" }));
        const again = await screen.findByRole("dialog", { name: "Layout" });
        await userEvent.click(within(again).getByRole("option", { name: /^Circle(?!s)/ }));
        await userEvent.click(await within(again).findByRole("checkbox", { name: "Shown nodes only" }));
        await waitFor(() => {
            assert.isFalse(element.layoutBehavior?.layout?.visibleOnly ?? false);
        });
        await element.waitForSettled();
        // The whole ring again: the shown nodes go back to the slots it gives them among the hidden ones.
        assert.deepEqual(placesOf(session, SHOWN), shownBefore, "the whole graph is laid out again");
    });
});
