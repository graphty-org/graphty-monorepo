/**
 * Style panel v2's second-level pop-over on the REAL graphty-element, opened by real clicks: a group pop-over
 * opened from a settings pop-over's "..." sits directly against it, with no gap between the two, as Figma docks
 * one panel against another (design/ui/figma/popovers-and-menus).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { waitFor, within } from "../../../test/test-utils";
import { openGroup, openProject, openStyle, sectionOf } from "./v2Harness";

/**
 * The pop-out panel an element is in.
 * @param element - an element in the panel.
 * @returns the panel.
 */
function panelOf(element: HTMLElement): HTMLElement {
    const panel = element.closest<HTMLElement>("[data-popout-id]");
    assert.isNotNull(panel, "the element is in a pop-out panel");
    return panel;
}

describe("Style panel v2 docks a group pop-over against its settings pop-over", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("a label's Box size group opens with 0 px between it and the label settings", async () => {
        const { session, id } = await openProject();
        await session.styles.update(id, { set: { "node.color": "#E8590C", "node.label": "Hello" } });
        const tab = await openStyle("Key people");
        const row = await waitFor(() => {
            const found = sectionOf(tab, "node-text").querySelector<HTMLElement>('[data-thing="label"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(within(row).getByRole("button", { name: /^Node label settings/ }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        const parent = panelOf(pop);
        const group = panelOf(await openGroup(pop, "Box size"));
        /**
         * The space between the facing edges: the group opens on whichever side of its parent has room.
         * @returns 0 flush, a positive value a gap, a negative one an overlap.
         */
        const gap = (): number => {
            const a = parent.getBoundingClientRect();
            const b = group.getBoundingClientRect();
            return b.left >= a.left ? b.left - a.right : a.left - b.right;
        };
        // Placed beside its parent (within a panel's margin of it), not still where it first rendered.
        await waitFor(() => {
            assert.isBelow(Math.abs(gap()), 40, "the group pop-over is placed beside its parent");
        });
        // Half a pixel for subpixel layout.
        assert.isAtMost(Math.abs(gap()), 0.5, `the gap between the pop-overs is ${String(gap())} px`);
    });
});
