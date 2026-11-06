/**
 * The layout form's Transition on the REAL graphty-element, driven by real input (shader-styles
 * design, section 6.5): choosing Glide writes the graph's `layoutTransition`; switching layout
 * then moves the nodes through the frames between the two layouts instead of jumping in one; and
 * Undo returns the layout.
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
    await element.waitForStableFrame();
    return { element, session };
}

/**
 * Records where a node is drawn on every animation frame, until stopped.
 * @param element - the element.
 * @param id - the node.
 * @returns stops it, giving the drawn centers.
 */
function trackDrawn(element: Element, id: string): () => { x: number; y: number }[] {
    const seen: { x: number; y: number }[] = [];
    let frame = 0;
    const tick = (): void => {
        const at = element.nodeScreenPosition(id);
        if (at !== undefined) {
            seen.push({ x: at.x, y: at.y });
        }
        frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
        cancelAnimationFrame(frame);
        return seen;
    };
}

describe("the layout form's Transition", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it("choosing Glide and switching layout moves the nodes there; Undo returns the layout", async () => {
        const { element, session } = await openRing();
        const before = session.layout.id;
        const start = element.nodeScreenPosition("n3");
        assert.isDefined(start);

        await userEvent.click(screen.getByRole("button", { name: "Layout" }));
        const popover = await screen.findByRole("dialog", { name: "Layout" });
        await userEvent.click(within(popover).getByRole("option", { name: /^Circle(?!s)/ }));
        const transition = await within(popover).findByRole("combobox", { name: "Transition" });
        assert.strictEqual((transition as HTMLInputElement).value, "None", "no transition by default");
        await userEvent.click(transition);
        await userEvent.click(await within(popover).findByRole("option", { name: "Glide" }));
        await waitFor(() => {
            assert.deepEqual(session.config.layoutTransition, { transition: "glide" });
        });

        // Its settings: the easing, written with it.
        await userEvent.click(within(popover).getByRole("button", { name: "Glide settings" }));
        const easing = await screen.findByRole("combobox", { name: "Easing" });
        await userEvent.click(easing);
        await userEvent.click(await screen.findByRole("option", { name: "Linear" }));
        await waitFor(() => {
            assert.deepEqual(session.config.layoutTransition, { transition: "glide", params: { easing: "linear" } });
        });
        assert.isTrue(document.body.contains(popover), "the layout form stays open");

        const stop = trackDrawn(element, "n3");
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
        await waitFor(() => {
            assert.strictEqual(session.layout.id, "circular");
        });
        await element.waitForSettled();
        await element.waitForStableFrame();
        const seen = stop();
        const end = element.nodeScreenPosition("n3");
        assert.isDefined(end);
        const far = (a: { x: number; y: number }, b: { x: number; y: number }): boolean =>
            Math.hypot(a.x - b.x, a.y - b.y) > 2;
        assert.isTrue(far(start ?? { x: 0, y: 0 }, end ?? { x: 0, y: 0 }), "the node has somewhere to go");
        const between = seen.filter((at) => far(at, start ?? at) && far(at, end ?? at));
        assert.isAbove(between.length, 1, "the node is drawn on its way, over several frames");

        await session.undo();
        await waitFor(() => {
            assert.strictEqual(session.layout.id, before, "Undo returns the layout");
        });
    });
});
