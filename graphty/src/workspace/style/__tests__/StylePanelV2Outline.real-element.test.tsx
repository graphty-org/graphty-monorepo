/**
 * Style panel v2's edge Outline item (C7, ia-design 2, E496, E675) on the REAL graphty-element and real input: every
 * band along an edge's line is one Outline item in the Line section, of kind Under line (`edge.outline*`, an opaque
 * casing beside the line) or Over line (`edge.overlay*`, a translucent wash over it, 2D only). "+" starts Under line,
 * a switch to Over line starts translucent and as wide as the Under line's start, a switch carries a band whatever
 * the line's width (an imported overlay's padding) across exactly, a second "+" adds the kind no row draws, the
 * Selected row's casing scale is a line a reader lowers, and at their start values the two kinds and a plain line
 * color draw three different pictures.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

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

/**
 * Types a number into a line of the Outline row's settings and commits it with Enter.
 * @param row - the Outline row.
 * @param channel - the line's channel.
 * @param text - what to type.
 */
async function typeWidth(row: HTMLElement, channel: string, text: string): Promise<void> {
    await userEvent.click(within(row).getByRole("button", { name: / settings/ }));
    const input = await waitFor(() => {
        const each = document.querySelector<HTMLInputElement>(
            `[data-thing-popover] .ws-row[data-line="${channel}"] input`,
        );
        assert.isNotNull(each, channel);
        return each;
    });
    await userEvent.click(input);
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.keyboard(`${text}{Enter}`);
    await userEvent.keyboard("{Escape}");
}

/**
 * Switches an Outline row to a kind from its Switch to menu.
 * @param row - the row.
 * @param kind - the kind's name.
 */
async function switchTo(row: HTMLElement, kind: string): Promise<void> {
    await userEvent.click(within(row).getByRole("button", { name: /^Switch .* to/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: kind }));
}

/**
 * A line of an Outline row, by its channel.
 * @param row - the row.
 * @param channel - the line's channel.
 * @returns the line, or null.
 */
function lineOf(row: HTMLElement, channel: string): HTMLElement | null {
    return row.querySelector<HTMLElement>(`[data-line="${channel}"]`);
}

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
            // as wide as the Under line's start at the default line: 2 past 8 is 5 either side of the middle
            assert.equal(written(session, edges, "edge.overlayPadding"), 5);
        });

        await plusOutline(line);
        await waitFor(() => {
            assert.isDefined(written(session, edges, "edge.outlineColor"), "the second '+' adds Under line back");
            assert.isDefined(written(session, edges, "edge.overlayColor"), "beside the Over line");
            assert.lengthOf(outlineRows(line), 2);
        });
    });

    it("an imported overlay drawn from its padding switches to an Under line as wide, and back", async () => {
        const { session, element, edges } = await openGraph();
        await switchView("2D");
        const plain = await picture(element);
        // What graph-io writes for a Cytoscape.js overlay: a color, an opacity and a padding, no width.
        await session.styles.update(edges, {
            set: {
                "edge.color": "#E8590C",
                "edge.overlayColor": "#1971c2",
                "edge.overlayOpacity": 0.5,
                "edge.overlayPadding": 9,
            },
        });
        const tab = await openStyle("Links");
        await showKind("edge");
        const line = sectionOf(tab, "edge-line");
        const [row] = await waitFor(() => {
            const rows = outlineRows(line);
            assert.lengthOf(rows, 1);
            return rows;
        });

        await switchTo(row, "Under line");
        await waitFor(() => {
            assert.isUndefined(written(session, edges, "edge.overlayPadding"), "the wash comes off");
            // twice its padding across whatever the line's width, the same band
            assert.equal(written(session, edges, "edge.outlineScale"), 0);
            assert.equal(written(session, edges, "edge.outlineWidth"), 18);
        });
        const under = await picture(element);
        assert.isAbove(pixelsApart(plain, under), LOOKS_APART, "the Under line draws a band");

        // switching back brings the Over line's own values back
        const [again] = outlineRows(line);
        await switchTo(again, "Over line");
        await waitFor(() => {
            assert.equal(written(session, edges, "edge.overlayPadding"), 9, "the held Over line comes back");
        });
    });

    it("the Selected row's casing scale is a line: lowering it narrows the selected edges' casing", async () => {
        const { session, element } = await openGraph();
        await session.config.set({ startingRows: true });
        await switchView("2D");
        await session.selection.apply({ edges: session.data.edges().map((edge) => edge.id) });
        await session.styles.settled();
        const selected = session.styles
            .list()
            .find(
                (layer) =>
                    layer.name === "Selected" &&
                    (layer.set as Record<string, unknown> | undefined)?.["edge.outlineScale"] !== undefined,
            );
        assert.isDefined(selected, "the starting Selected row draws the edge casing with a scale");
        const { id } = selected;
        assert.equal(written(session, id, "edge.outlineScale"), 5);
        const wide = await picture(element);

        const tab = await openStyle("Selected");
        await showKind("edge");
        const line = sectionOf(tab, "edge-line");
        const [row] = await waitFor(() => {
            const rows = outlineRows(line);
            assert.lengthOf(rows, 1);
            // the row shows the scale it draws, not a Width of 0 alone
            assert.isNotNull(lineOf(rows[0], "edge.outlineScale"), "a Scale line on the row");
            return rows;
        });
        await typeWidth(row, "edge.outlineScale", "2");
        await waitFor(() => {
            assert.equal(written(session, id, "edge.outlineScale"), 2);
        });
        const narrow = await picture(element);
        await session.selection.apply({ edges: [] }, "replace");
        await session.styles.settled();
        const none = await picture(element);
        assert.isAbove(
            pixelsApart(none, wide),
            pixelsApart(none, narrow) + LOOKS_APART,
            "a scale of 2 draws a narrower casing than 5",
        );
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
    it("the starting Selected row's Outline switches to an Over line as wide as its Under line, on a line set beneath", async () => {
        const { session, edges } = await openGraph();
        await session.config.set({ startingRows: true });
        await switchView("2D");
        // The line's width comes from the layer beneath the Selected row, which sets none of its own.
        await session.styles.update(edges, { set: { "edge.width": 16 } });
        await session.selection.apply({ edges: session.data.edges().map((edge) => edge.id) });
        await session.styles.settled();
        const selected = session.styles
            .list()
            .find(
                (layer) =>
                    layer.name === "Selected" &&
                    (layer.set as Record<string, unknown> | undefined)?.["edge.outlineScale"] !== undefined,
            );
        assert.isDefined(selected);
        const { id } = selected;
        assert.isUndefined(written(session, id, "edge.width"), "the Selected row sets no line width");

        const tab = await openStyle("Selected");
        await showKind("edge");
        const line = sectionOf(tab, "edge-line");
        const [row] = await waitFor(() => {
            const rows = outlineRows(line);
            assert.lengthOf(rows, 1);
            return rows;
        });
        await switchTo(row, "Over line");
        await waitFor(() => {
            assert.isDefined(written(session, id, "edge.overlayColor"));
        });
        // the Under line was 5 line widths across, 80 on the 16 line: the Over line is the same 80
        assert.equal(written(session, id, "edge.overlayPadding"), 40);
        assert.equal(written(session, id, "edge.overlayOpacity"), 0.3);
    });

    it("'+' again adds an Over line at the switch's start: 30% and reaching past the line's sides", async () => {
        const { session, edges } = await openGraph();
        await switchView("2D");
        await session.styles.update(edges, { set: { "edge.width": 16 } });
        await session.styles.settled();
        const tab = await openStyle("Links");
        await showKind("edge");
        const line = sectionOf(tab, "edge-line");

        await plusOutline(line);
        await waitFor(() => {
            assert.isDefined(written(session, edges, "edge.outlineColor"), "the first '+' is Under line");
        });
        await plusOutline(line);
        await waitFor(() => {
            assert.isDefined(written(session, edges, "edge.overlayColor"), "the second '+' is the free Over line");
            assert.lengthOf(outlineRows(line), 2);
        });
        assert.equal(written(session, edges, "edge.overlayOpacity"), 0.3, "at 30%, as a switch starts it");
        // as wide as an Under line's start beside the 16 line: 2 past it is 9 either side of the middle
        assert.equal(written(session, edges, "edge.overlayPadding"), 9);
    });

    it("on a line wider than the Over line's own start, Switch to Over line still reaches past the line's sides", async () => {
        const { session, element, edges } = await openGraph();
        await switchView("2D");
        // A layer whose line is 16 wide: the Over line's own start (padding 5) would be 10 across, inside the line.
        await session.styles.update(edges, { set: { "edge.width": 16 } });
        await session.styles.settled();
        const tab = await openStyle("Links");
        await showKind("edge");
        const line = sectionOf(tab, "edge-line");
        const plain = await picture(element);

        await plusOutline(line);
        await waitFor(() => {
            assert.isDefined(written(session, edges, "edge.outlineColor"));
        });
        const color = String(written(session, edges, "edge.outlineColor"));
        const [row] = outlineRows(line);
        await switchTo(row, "Over line");
        await waitFor(() => {
            assert.isDefined(written(session, edges, "edge.overlayColor"));
        });
        assert.isAbove(Number(written(session, edges, "edge.overlayPadding")) * 2, 16, "wider than the line");
        const over = await picture(element);

        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.lengthOf(outlineRows(line), 0);
        });
        await session.styles.update(edges, { set: { "edge.width": 16, "edge.color": color } });
        await session.styles.settled();
        const recolored = await picture(element);

        assert.isAbove(pixelsApart(plain, over), pixelsApart(plain, recolored), "the wash reaches past the line");
    });
});
