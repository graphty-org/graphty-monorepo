/**
 * The Hovered layer's Values tab follows the pointer, on the REAL graphty-element with the real
 * pointer: its Now section names the node the pointer rests on, and says nothing is hovered once
 * the pointer leaves the drawing (#9813).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { openSampleFromStart } from "../../../test/open";
import { screen, waitFor, within } from "../../../test/test-utils";

describe("the Hovered layer's Values tab", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("names the hovered node in its Now section, and none once the pointer leaves", async () => {
        const { session } = await openSampleFromStart("Les Miserables");
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        if (element === null) {
            return;
        }
        await element.waitForSettled();
        await element.waitForStableFrame();

        const tree = screen.getByRole("tree", { name: "Style layers" });
        await userEvent.click(page.elementLocator(tree).getByRole("treeitem", { name: /^Hovered, / }));
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        await userEvent.click(page.elementLocator(inspector).getByRole("tab", { name: "Values", exact: true }));
        const now = (): HTMLElement => within(inspector).getByRole("group", { name: "Now" });
        await waitFor(() => {
            within(now()).getByText("Nothing hovered");
        });

        const at = await waitFor(() => {
            const drawn = element.nodeScreenPosition("Valjean");
            assert.isDefined(drawn, "the node is drawn");
            return drawn;
        });
        await userEvent.hover(page.getByCss("graphty-element").first(), { position: { x: at?.x ?? 0, y: at?.y ?? 0 } });
        await waitFor(() => {
            assert.strictEqual(session.selection.hovered, "Valjean", "the element hovers the node");
            within(now()).getByText("Valjean");
        });

        await userEvent.hover(page.getByRole("tree", { name: "Style layers", exact: true }));
        await waitFor(() => {
            assert.isNull(session.selection.hovered, "the pointer left the drawing");
            within(now()).getByText("Nothing hovered");
        });
    });
});
