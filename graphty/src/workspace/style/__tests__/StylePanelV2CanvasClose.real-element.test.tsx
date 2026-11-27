/**
 * A click on the graph while a Style pop-over is open only closes the pop-over, as in Figma (owner, 2026-11-27,
 * #10381): the picked style layer stays picked and the graph's selection does not change. On the REAL
 * graphty-element, with a real click on a node drawn on the canvas.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openGraph, openStyle } from "./v2Harness";

describe("a click on the graph while a Style pop-over is open", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("closes the pop-over only: the layer stays picked and nothing is selected", async () => {
        const { session, element, nodes } = await openGraph();
        await session.styles.update(nodes, { set: { "node.shape": "box" } });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const row = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('[data-thing="shape"]');
            assert.isNotNull(found, "the Shape row");
            return found;
        });
        // The shape's value button opens its list of shapes in a pop-over.
        const more = within(row).getByRole("button", { name: /^Node shape, Box$/ });
        await userEvent.click(more);
        const pop = await waitFor(() => {
            const found = document.getElementById(more.getAttribute("aria-controls") ?? "");
            assert.isNotNull(found, "the pop-over is open");
            return found;
        });

        // A node's center that the pop-over does not cover, where the drawing answers that node: a
        // click there would select it.
        await element.waitForStableFrame();
        const host = element.getBoundingClientRect();
        const covers = pop.getBoundingClientRect();
        let point: { x: number; y: number } | undefined;
        await waitFor(() => {
            const open = ["a", "b", "c"].flatMap((id) => {
                const at = element.nodeScreenPosition(id);
                const x = (at?.x ?? 0) + host.left;
                const y = (at?.y ?? 0) + host.top;
                const under = x >= covers.left && x <= covers.right && y >= covers.top && y <= covers.bottom;
                return at?.visible === true && !under && element.elementAt(at)?.id === id ? [{ id, at }] : [];
            });
            assert.isNotEmpty(open, "a node the pop-over leaves uncovered");
            point = open[0] === undefined ? undefined : { x: open[0].at.x, y: open[0].at.y };
        });
        await userEvent.click(element, { position: point });

        await waitFor(() => {
            assert.isFalse(pop.isConnected, "the pop-over closed");
        });
        await element.waitForStableFrame();
        assert.deepEqual([...session.selection.nodes], [], "the click selected nothing");
        const tree = screen.getByRole("tree", { name: "Style layers" });
        const layer = within(tree).getByRole("treeitem", { name: /^Key people, / });
        assert.equal(layer.getAttribute("aria-selected"), "true", "the layer stays picked");
        assert.isTrue(screen.getByTestId("style-tab").isConnected, "its Style tab stays open");
    });
});
