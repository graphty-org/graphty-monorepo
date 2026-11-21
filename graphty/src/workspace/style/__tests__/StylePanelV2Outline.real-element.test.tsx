/**
 * Style panel v2's edge Outline item (C7, ia-design 2, E496, E675) on the REAL graphty-element and real input: every
 * band along an edge's line is one Outline item in the Line section, of kind Under line (`edge.outline*`, an opaque
 * casing beside the line) or Over line (`edge.overlay*`, a translucent wash over it, 2D only). "+" starts Under line,
 * a switch to Over line starts translucent and past the line's sides, a second "+" adds the kind no row draws, and
 * at their start values the two kinds and a plain line color draw three different pictures.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { channelDescriptor } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openStyle, picture, pixelsApart, sectionOf, switchView, written } from "./v2Harness";

/**
 * The Outline rows in the edge Line section.
 * @param section - the section.
 * @returns the rows.
 */
function outlineRows(section: HTMLElement): HTMLElement[] {
    return [...section.querySelectorAll<HTMLElement>('[data-thing="outline"]')];
}

/**
 * Opens the edge Line section's "+" and picks Outline.
 * @param section - the section.
 */
async function plusOutline(section: HTMLElement): Promise<void> {
    await userEvent.click(within(section).getByRole("button", { name: /^Add to edge line/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /^Outline/ }));
    await userEvent.keyboard("{Escape}");
}

/** What graphty-element writes beside the Over line's color when a layer starts it. */
const OVER_START = Object.fromEntries(
    (channelDescriptor("edge.overlayColor")?.needs ?? []).map((need) => [need.channel, need.value]),
);

/** Enough pixels apart that two pictures are two looks, not a seam of anti-aliasing. */
const LOOKS_APART = 50;

describe("Style panel v2's edge Outline", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("'+' starts Under line, Switch to Over line starts it translucent and wide, '+' again adds the free kind", async () => {
        const { session, edges } = await openGraph();
        await switchView("2D");
        const tab = await openStyle("Links");
        await showKind("edge");
        const line = sectionOf(tab, "edge-line");

        await plusOutline(line);
        await waitFor(() => {
            assert.isDefined(written(session, edges, "edge.outlineColor"), "the first '+' is Under line");
            assert.isAbove(Number(written(session, edges, "edge.outlineWidth")), 0, "wider than the line");
            assert.isUndefined(written(session, edges, "edge.overlayColor"));
            assert.lengthOf(outlineRows(line), 1);
        });
        const color = written(session, edges, "edge.outlineColor");

        const [row] = outlineRows(line);
        await userEvent.click(within(row).getByRole("button", { name: /^Switch .* to/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Over line" }));
        await waitFor(() => {
            assert.isUndefined(written(session, edges, "edge.outlineColor"), "the casing comes off");
            assert.equal(written(session, edges, "edge.overlayColor"), color, "its color moves to the wash");
            assert.equal(written(session, edges, "edge.overlayOpacity"), 0.3, "at 30%");
            assert.equal(
                written(session, edges, "edge.overlayPadding"),
                OVER_START["edge.overlayPadding"],
                "as wide as graphty-element starts it",
            );
            assert.isAbove(Number(written(session, edges, "edge.overlayPadding")), 0);
        });

        await plusOutline(line);
        await waitFor(() => {
            assert.isDefined(written(session, edges, "edge.outlineColor"), "the second '+' adds Under line back");
            assert.isDefined(written(session, edges, "edge.overlayColor"), "beside the Over line");
            assert.lengthOf(outlineRows(line), 2);
        });
    });

    it("at start values, Under line, Over line and a plain line color draw three different pictures", async () => {
        const { session, element, edges } = await openGraph();
        await switchView("2D");
        const tab = await openStyle("Links");
        await showKind("edge");
        const line = sectionOf(tab, "edge-line");
        const plain = await picture(element);

        await plusOutline(line);
        await waitFor(() => {
            assert.isDefined(written(session, edges, "edge.outlineColor"));
        });
        const under = await picture(element);
        const color = String(written(session, edges, "edge.outlineColor"));

        const [row] = outlineRows(line);
        await userEvent.click(within(row).getByRole("button", { name: /^Switch .* to/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Over line" }));
        await waitFor(() => {
            assert.isDefined(written(session, edges, "edge.overlayColor"));
        });
        const over = await picture(element);

        // The line in the Outline's own color, with no band at all: Undo takes back the switch, then the "+".
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.lengthOf(outlineRows(line), 0);
            assert.isUndefined(written(session, edges, "edge.overlayColor"));
        });
        await session.styles.update(edges, { set: { "edge.color": color } });
        await session.styles.settled();
        const recolored = await picture(element);

        assert.isAbove(pixelsApart(plain, under), LOOKS_APART, "Under line draws a band");
        assert.isAbove(pixelsApart(plain, over), LOOKS_APART, "Over line draws a wash");
        assert.isAbove(pixelsApart(under, over), LOOKS_APART, "Under line and Over line are two looks");
        assert.isAbove(pixelsApart(under, recolored), LOOKS_APART, "Under line is no line color");
        assert.isAbove(pixelsApart(over, recolored), LOOKS_APART, "Over line is no line color");
        // Recoloring the line changes the line's own pixels; the wash changes more, so it reaches past its sides.
        assert.isAbove(pixelsApart(plain, over), pixelsApart(plain, recolored), "Over line is wider than the line");
    });
});
