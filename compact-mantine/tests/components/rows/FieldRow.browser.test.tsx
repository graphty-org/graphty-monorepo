/**
 * A field row lays out the same way whichever way the text runs.
 *
 * The row spends its content band as `108 + 8 + 108 + 8 + 24 = 256`: two
 * fields, the gutter between them, the trail gap, and the trailing slot. Under
 * `dir="rtl"` a flex row reverses itself, so spacing written as a physical
 * margin keeps its size and loses its place -- the gutter lands outside the
 * pair and the trail gap lands between the two fields. Reading the style
 * declaration cannot tell the two apart; only a layout engine can, so every
 * assertion here is a `getBoundingClientRect` taken in a real browser, in both
 * directions, against one set of expectations measured along the inline axis.
 */
import { DirectionProvider, MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { FieldRow, PanelField, PANEL_GRID, PanelLabelsProvider } from "../../../src";
import { AdvancedButton } from "../../../src/components/rows/TrailingSlot";

/** The two directions every measurement is repeated in. */
const DIRECTIONS = ["ltr", "rtl"] as const;

/** Which way text runs in one measurement. */
type Direction = (typeof DIRECTIONS)[number];

/** Where an element sits along the inline axis, and how wide it is. */
interface InlineBox {
    /** Distance from the content band's inline start edge, in pixels. */
    start: number;
    /** The element's own width, in pixels. */
    width: number;
}

/**
 * Render one row in the 256px band a panel gives it, with the text direction
 * set the way a consumer sets it: `dir` on the document, which is where
 * Mantine's `DirectionProvider` reads it from and what CSS resolves logical
 * properties against.
 * @param row - The row under test
 * @param dir - Which way text runs
 * @returns The testing-library render result
 */
function renderInBand(row: React.ReactElement, dir: Direction): ReturnType<typeof render> {
    document.documentElement.setAttribute("dir", dir);

    return render(
        <MantineProvider>
            <DirectionProvider initialDirection={dir}>
                <div data-testid="band" style={{ width: PANEL_GRID.CONTENT }}>
                    {row}
                </div>
            </DirectionProvider>
        </MantineProvider>,
    );
}

/**
 * Measure one element along the inline axis of the content band.
 *
 * The inline start of a box is its left edge when text runs left to right and
 * its right edge when text runs right to left, so one set of expected numbers
 * describes a correct layout in both directions and a row that mirrors its
 * spacing wrongly fails in exactly one of them.
 * @param element - The element to measure
 * @param dir - Which way text runs
 * @returns The element's inline offset and width, rounded to whole pixels
 */
function inlineBox(element: Element, dir: Direction): InlineBox {
    const band = screen.getByTestId("band").getBoundingClientRect();
    const box = element.getBoundingClientRect();

    return {
        start: Math.round(dir === "rtl" ? band.right - box.right : box.left - band.left),
        width: Math.round(box.width),
    };
}

/**
 * Measure every field slot of the row, in the order the row was given them.
 * @param dir - Which way text runs
 * @returns One inline box per field slot
 */
function slotBoxes(dir: Direction): InlineBox[] {
    return screen.getAllByTestId("field-row-slot").map((slot) => inlineBox(slot, dir));
}

/**
 * Measure the row's trailing slot.
 * @param dir - Which way text runs
 * @returns The trailing slot's inline box
 */
function trailingBox(dir: Direction): InlineBox {
    return inlineBox(screen.getAllByTestId("trailing-slot")[0], dir);
}

/**
 * Where a box ends along the inline axis.
 * @param box - A measured box
 * @returns The distance from the band's inline start to the box's inline end
 */
function inlineEnd(box: InlineBox): number {
    return box.start + box.width;
}

afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute("dir");
});

describe.each(DIRECTIONS)("a field row under dir=%s", (dir) => {
    it("spends its band as 108 + 8 + 108 + 8 + 24", () => {
        renderInBand(
            <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={() => undefined} />}>
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
            </FieldRow>,
            dir,
        );

        const [first, second] = slotBoxes(dir);
        expect(first).toEqual({ start: 0, width: PANEL_GRID.FIELD });
        expect(second).toEqual({ start: 116, width: PANEL_GRID.FIELD });
        expect(trailingBox(dir)).toEqual({ start: 232, width: PANEL_GRID.TRAIL });
        expect(inlineEnd(trailingBox(dir))).toBe(PANEL_GRID.CONTENT);
    });

    it("puts the gutter between the two fields and nowhere else", () => {
        renderInBand(
            <FieldRow>
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
            </FieldRow>,
            dir,
        );

        const [first, second] = slotBoxes(dir);
        // Nothing before the first field: the gutter has not escaped the pair.
        expect(first.start).toBe(0);
        expect(second.start - inlineEnd(first)).toBe(PANEL_GRID.GUTTER);
    });

    it("puts the trail gap between the pair and the trailing slot", () => {
        renderInBand(
            <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={() => undefined} />}>
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
            </FieldRow>,
            dir,
        );

        const [, second] = slotBoxes(dir);
        expect(trailingBox(dir).start - inlineEnd(second)).toBe(PANEL_GRID.TRAIL_GAP);
    });

    it("keeps the trail gap when the slot is empty, so a pair sits where a pair always sits", () => {
        renderInBand(
            <FieldRow>
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
            </FieldRow>,
            dir,
        );

        expect(trailingBox(dir)).toEqual({ start: 232, width: PANEL_GRID.TRAIL });
    });

    it("spends its band as 224 + 8 + 24 for one field beside a trailing control", () => {
        renderInBand(
            <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={() => undefined} />}>
                <PanelField label="Size by attribute" glyph="attribute" value="Betweenness" bound kind="select" />
            </FieldRow>,
            dir,
        );

        const [only] = slotBoxes(dir);
        expect(only).toEqual({ start: 0, width: PANEL_GRID.BODY });
        expect(trailingBox(dir)).toEqual({ start: 232, width: PANEL_GRID.TRAIL });
    });

    it("gives the trail gap to a field that is alone, which spans 232", () => {
        renderInBand(
            <FieldRow>
                <PanelField label="Layout" value="Force directed" kind="select" />
            </FieldRow>,
            dir,
        );

        const [only] = slotBoxes(dir);
        expect(only).toEqual({ start: 0, width: PANEL_GRID.BODY + PANEL_GRID.TRAIL_GAP });
        expect(trailingBox(dir)).toEqual({ start: 232, width: PANEL_GRID.TRAIL });
        expect(inlineEnd(trailingBox(dir))).toBe(PANEL_GRID.CONTENT);
    });

    it("draws the field itself edge to edge in its slot", () => {
        renderInBand(
            <FieldRow>
                <PanelField label="Layout" value="Force directed" kind="select" />
            </FieldRow>,
            dir,
        );

        expect(inlineBox(screen.getByTestId("panel-field"), dir)).toEqual({
            start: 0,
            width: PANEL_GRID.BODY + PANEL_GRID.TRAIL_GAP,
        });
    });

    it("spends its band as 76 + 8 + 140 + 8 + 24 once the labels preference splits the pair", () => {
        renderInBand(
            <PanelLabelsProvider showLabels>
                <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={() => undefined} />}>
                    <PanelField label="Smallest" glyph="sizeSmallest" value="1.0" />
                    <PanelField label="Largest" glyph="sizeLargest" value="4.0" />
                </FieldRow>
            </PanelLabelsProvider>,
            dir,
        );

        const [word] = screen.getAllByTestId("field-row-label").map((label) => inlineBox(label, dir));
        const [field] = slotBoxes(dir);

        // The word first, then the gutter, then the field, then the trail gap,
        // then the slot: the same order in both directions.
        expect(word).toEqual({ start: 0, width: PANEL_GRID.LABEL_COLUMN });
        expect(field.start - inlineEnd(word)).toBe(PANEL_GRID.GUTTER);
        expect(field).toEqual({ start: 84, width: 140 });
        expect(trailingBox(dir).start - inlineEnd(field)).toBe(PANEL_GRID.TRAIL_GAP);
        expect(trailingBox(dir)).toEqual({ start: 232, width: PANEL_GRID.TRAIL });
    });

    it("stands both of the split rows on the row pitch", () => {
        renderInBand(
            <PanelLabelsProvider showLabels>
                <FieldRow>
                    <PanelField label="Smallest" glyph="sizeSmallest" value="1.0" />
                    <PanelField label="Largest" glyph="sizeLargest" value="4.0" />
                </FieldRow>
            </PanelLabelsProvider>,
            dir,
        );

        const rows = screen.getAllByTestId("field-row");
        expect(rows).toHaveLength(2);
        for (const row of rows) {
            expect(Math.round(row.getBoundingClientRect().height)).toBe(PANEL_GRID.ROW_PITCH);
        }
    });
});

describe("a field row measured against itself", () => {
    it("draws the mirror image of the layout it draws left to right", () => {
        const row = (
            <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={() => undefined} />}>
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
            </FieldRow>
        );

        renderInBand(row, "ltr");
        const leftToRight = [...slotBoxes("ltr"), trailingBox("ltr")];
        cleanup();

        renderInBand(row, "rtl");
        const rightToLeft = [...slotBoxes("rtl"), trailingBox("rtl")];

        expect(rightToLeft).toEqual(leftToRight);
    });
});
