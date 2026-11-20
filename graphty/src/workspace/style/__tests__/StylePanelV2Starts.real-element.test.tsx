/**
 * What a new Glow and a new Label start at, on the REAL graphty-element and real clicks (owner, 2026-11-20):
 * "+" Glow draws in graphty-element's yellow default (E670), and "+" Label writes no size, so the label is drawn
 * at graphty-element's default size, 1 (E671).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openStyle, picture, pixelsApart, sectionOf, written } from "./v2Harness";

/**
 * Clicks a section's "+" and one of its items.
 * @param tab - the Style tab.
 * @param section - the section's id.
 * @param item - the item's name.
 */
async function add(tab: HTMLElement, section: string, item: string): Promise<void> {
    const plus = sectionOf(tab, section).querySelector<HTMLElement>("[data-plus]");
    assert.isNotNull(plus, `${section}'s "+"`);
    await userEvent.click(plus);
    await userEvent.click(await screen.findByRole("menuitem", { name: item }));
}

/**
 * How many rows of the canvas changed between two pictures: the height of what was drawn.
 * @param before - the picture without it.
 * @param after - the picture with it.
 * @returns the rows from the first changed one to the last.
 */
function tallness(before: ImageData, after: ImageData): number {
    let top = Infinity;
    let bottom = -Infinity;
    for (let i = 0; i < after.data.length; i += 4) {
        if ([0, 1, 2].some((c) => Math.abs((after.data[i + c] ?? 0) - (before.data[i + c] ?? 0)) > 1)) {
            const y = Math.floor(i / 4 / after.width);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
        }
    }
    return bottom - top + 1;
}

/**
 * How warm a picture is: over every pixel, red and green above blue. A yellow glow raises it.
 * @param image - the picture.
 * @returns the sum.
 */
function warmth(image: ImageData): number {
    let sum = 0;
    for (let i = 0; i < image.data.length; i += 4) {
        sum += (image.data[i] ?? 0) + (image.data[i + 1] ?? 0) - 2 * (image.data[i + 2] ?? 0);
    }
    return sum;
}

describe("what a new Glow and a new Label start at", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it('"+" Glow writes and draws the yellow default, #FFC800 (E670)', async () => {
        const { session, element, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        await showKind("node");
        await session.styles.settled();
        const before = await picture(element);
        await add(tab, "node-effects", "Glow");
        await waitFor(() => {
            assert.equal(String(written(session, nodes, "node.glow")).toUpperCase(), "#FFC800");
        });
        await userEvent.keyboard("{Escape}");
        await session.styles.settled();
        const after = await picture(element);
        assert.isAbove(pixelsApart(before, after), 0, "the glow draws");
        assert.isAbove(warmth(after), warmth(before), "and it draws yellow");
    });

    it('"+" Label writes no size: the label draws as a label of size 1 does (E671)', async () => {
        const { session, element, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        await showKind("node");
        await session.styles.settled();
        const bare = await picture(element);
        await add(tab, "node-text", "Label");
        const list = await screen.findByRole("group", { name: "Node label" });
        await userEvent.click(await within(list).findByRole("option", { name: /^Node id(,|$)/ }));
        await waitFor(() => {
            assert.isNotNull(sectionOf(tab, "node-text").querySelector('[data-thing="label"]'), "the Label row");
        });
        await userEvent.keyboard("{Escape}");
        const style = written(session, nodes, "node.labelStyle");
        const fields = typeof style === "object" && style !== null ? (style as Record<string, unknown>) : {};
        assert.deepEqual(
            Object.keys(fields).filter((key) => /size/i.test(key)),
            [],
            "no size is written over the default",
        );
        await session.styles.settled();
        const added = await picture(element);
        await session.styles.update(nodes, { set: { "node.labelStyle": { ...fields, size: 1 } } });
        await session.styles.settled();
        const sized = await picture(element);
        const drawn = tallness(bare, added);
        assert.isAbove(drawn, 0, "the new label draws");
        // Measured over every label on the canvas, whose edges antialias a little differently once
        // the style is written again: the same size within 2 percent, where size 2 would double it.
        const one = tallness(bare, sized);
        assert.closeTo(drawn / one, 1, 0.02, "the new label is as tall as a label of size 1");
    });
});
