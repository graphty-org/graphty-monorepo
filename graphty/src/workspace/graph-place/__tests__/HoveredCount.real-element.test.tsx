/**
 * The Hovered row counts the node under the pointer, on the REAL graphty-element with the real
 * pointer: pointing at a node makes it count one, and moving off the drawing onto the panel
 * makes it count none again.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { openSampleFromStart } from "../../../test/open";
import { screen, waitFor, within } from "../../../test/test-utils";

/**
 * Whether the Hovered row's name, which carries its count, says it counts one node.
 * @returns true while it counts one.
 */
function countsOne(): boolean {
    const tree = screen.getByRole("tree", { name: "Style layers" });
    within(tree).getByRole("treeitem", { name: /^Hovered, / });
    return within(tree).queryByRole("treeitem", { name: /^Hovered, .*\b1 node\b/ }) !== null;
}

describe("the Hovered row", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("counts the node under the pointer, and none once the pointer leaves the drawing", async () => {
        const { session } = await openSampleFromStart("Les Miserables");
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        if (element === null) {
            return;
        }
        await element.waitForSettled();
        await element.waitForStableFrame();
        const at = await waitFor(() => {
            assert.isFalse(countsOne(), "nothing is hovered yet");
            const drawn = element.nodeScreenPosition("Valjean");
            assert.isDefined(drawn, "the node is drawn");
            return drawn;
        });

        await userEvent.hover(element, { position: { x: at?.x ?? 0, y: at?.y ?? 0 } });
        await waitFor(() => {
            assert.strictEqual(session.selection.hovered, "Valjean", "the element hovers the node");
            assert.isTrue(countsOne(), "the row counts it");
        });

        await userEvent.hover(screen.getByRole("tree", { name: "Style layers" }));
        await waitFor(() => {
            assert.isNull(session.selection.hovered, "the pointer left the drawing");
            assert.isFalse(countsOne(), "the row counts nothing");
        });
    });
});
