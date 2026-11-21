/**
 * Style panel v2's edge Tooltip on the REAL graphty-element and real input (ia-design 5, fix 2): graphty-element
 * draws an edge's tooltip (`edge.tooltip`) while the pointer is over its line, so the edge tab's Text "+" lists
 * Tooltip in the node tab's place and the two Text "+" menus match, less the node-only items. A reader adds an edge
 * tooltip from "+", gives it words, points at a line on the canvas and sees the tooltip drawn.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { findValuePicker, screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openStyle, picture, pixelsApart, sectionOf, written } from "./v2Harness";

/** Each tab's Text "+" items, "|" where a divider sits: the edge tab's adds End caption, an edge's own text. */
const TEXT_ITEMS = {
    node: ["Label", "|", "Tooltip", "|", "Record", "External label"],
    edge: ["Label", "|", "Tooltip", "|", "End caption", "Record", "External label"],
} as const;

/**
 * A "+" menu's items and dividers, top to bottom, as a reader sees them.
 * @param menu - the open menu.
 * @returns the item names, "|" for a divider.
 */
function menuItems(menu: HTMLElement): string[] {
    return [...menu.querySelectorAll('[role="menuitem"], .mantine-Menu-divider')].map((element) =>
        element.getAttribute("role") === "menuitem" ? element.textContent : "|",
    );
}

describe("Style panel v2's edge Tooltip", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("lists Tooltip in each Text '+' menu in the same place", async () => {
        await openGraph();
        for (const [kind, layer] of [
            ["node", "Key people"],
            ["edge", "Links"],
        ] as const) {
            const tab = await openStyle(layer);
            await showKind(kind);
            const text = sectionOf(tab, `${kind}-text`);
            await userEvent.click(within(text).getByRole("button", { name: `Add to ${kind} text` }));
            const menu = await screen.findByRole("menu");
            assert.deepEqual(menuItems(menu), [...TEXT_ITEMS[kind]], `the ${kind} tab's Text "+"`);
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.isNull(screen.queryByRole("menu"));
            });
        }
    });

    it("'+' Tooltip on the edge tab writes edge.tooltip, and pointing at a line draws it", async () => {
        const { session, element, edges } = await openGraph();
        const tab = await openStyle("Links");
        await showKind("edge");
        const text = sectionOf(tab, "edge-text");
        await userEvent.click(within(text).getByRole("button", { name: "Add to edge text" }));
        await userEvent.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: "Tooltip" }));
        // A tooltip's words come from its source list, open at once; Fixed text opens the words' own field.
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: "Fixed text" }));
        await userEvent.click(await screen.findByRole("textbox", { name: /tooltip/i }));
        await userEvent.keyboard("busy line{Enter}");
        await waitFor(() => {
            assert.equal(written(session, edges, "edge.tooltip"), "busy line");
            assert.isNotNull(text.querySelector('[data-thing="tooltip"]'), "the Tooltip row");
        });
        await session.styles.settled();

        // The pointer over empty canvas, then over the middle of the line from a to b.
        const [from, to] = ["a", "b"].map((id) => element.nodeScreenPosition(id));
        assert.isDefined(from);
        assert.isDefined(to);
        await userEvent.hover(element, { position: { x: 4, y: 4 } });
        const resting = await picture(element);
        await userEvent.hover(element, { position: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 } });
        const pointed = await picture(element);
        assert.isAbove(
            pixelsApart(resting, pointed),
            0,
            "the edge's tooltip is drawn while the pointer is on the line",
        );
        await userEvent.hover(element, { position: { x: 4, y: 4 } });
        assert.equal(pixelsApart(resting, await picture(element)), 0, "and taken down when it leaves");
    });
});
