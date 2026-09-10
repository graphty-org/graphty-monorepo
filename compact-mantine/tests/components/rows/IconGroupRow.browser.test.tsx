/**
 * An icon group is a set of radio buttons, and two of the things that makes
 * true are invisible to a simulated DOM.
 *
 * The first is the keyboard. A browser moves between radios of one group
 * itself, and it follows the direction the text runs: ArrowRight advances under
 * `dir="ltr"` and goes back under `dir="rtl"`, so the selection always moves
 * the way the key points. Nothing in a simulated DOM implements that, and the
 * testing library's own approximation of it is direction-blind, so the only way
 * to know it holds is to press the key in a real browser.
 *
 * The second is the track itself. The row promises a 108px or 224px track of
 * 22px tiles that share the width by what they hold, and every one of those
 * numbers is a layout result rather than a style declaration.
 */
import { DirectionProvider, MantineProvider } from "@mantine/core";
import { userEvent } from "@vitest/browser/context";
import { act, cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { compactTheme, IconGroupRow, PANEL_GRID } from "../../../src";
import type { IconGroupOption } from "../../../src/components/rows/IconGroupRow";

/** The two directions every measurement is repeated in. */
const DIRECTIONS = ["ltr", "rtl"] as const;

/** Which way text runs in one measurement. */
type Direction = (typeof DIRECTIONS)[number];

/** How far one measured box may sit from where it is expected, in pixels. */
const TOLERANCE = 1;

/**
 * A drawing at the size the register draws at, with no colour of its own.
 * @returns The glyph node
 */
function glyph(): React.ReactNode {
    return (
        <svg
            width={PANEL_GRID.GLYPH}
            height={PANEL_GRID.GLYPH}
            viewBox="0 0 16 16"
            aria-hidden="true"
            focusable="false"
            style={{ display: "block" }}
        >
            <rect x="3" y="3" width="10" height="10" rx="1" fill="currentColor" />
        </svg>
    );
}

/** The three node shapes a cat can be drawn as. */
const SHAPES: IconGroupOption[] = [
    { value: "box", label: "Box", icon: glyph() },
    { value: "sphere", label: "Sphere", icon: glyph() },
    { value: "disc", label: "Disc", icon: glyph() },
];

/** Six shapes: the ceiling of the range. */
const SIX_SHAPES: IconGroupOption[] = [
    ...SHAPES,
    { value: "diamond", label: "Diamond", icon: glyph() },
    { value: "ring", label: "Ring", icon: glyph() },
    { value: "cross", label: "Cross", icon: glyph() },
];

/** The layouts, whose names the panel cannot afford to hide. */
const LAYOUTS: IconGroupOption[] = [
    { value: "force", label: "Force directed", icon: glyph() },
    { value: "hierarchical", label: "Hierarchical", icon: glyph() },
    { value: "radial", label: "Radial", icon: glyph() },
];

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
        <MantineProvider theme={compactTheme}>
            <DirectionProvider initialDirection={dir}>
                <div data-testid="band" style={{ width: PANEL_GRID.CONTENT }}>
                    {row}
                </div>
            </DirectionProvider>
        </MantineProvider>,
    );
}

/**
 * The tile of one option: the label a person clicks, which is the drawn
 * segment.
 * @param label - The option's word
 * @returns The tile element
 */
function tile(label: string): HTMLElement {
    const content = screen.getByTitle(label);
    const element = content.closest("label");

    if (element === null) {
        throw new Error(`no tile found for ${label}`);
    }

    return element;
}

/**
 * Which option is checked, by its word.
 * @returns The word of the checked option, or undefined when none is
 */
function checkedLabel(): string | undefined {
    return screen
        .getAllByRole("radio")
        .filter((radio) => (radio as HTMLInputElement).checked)
        .map((radio) => radio.getAttribute("value") ?? "")[0];
}

/**
 * Press one key, letting React settle before the assertion reads the DOM.
 * @param key - The key to press, in the testing library's own spelling
 */
async function press(key: string): Promise<void> {
    await act(async () => {
        await userEvent.keyboard(key);
    });
}

afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute("dir");
});

describe.each(DIRECTIONS)("an icon group under dir=%s", (dir) => {
    it("draws a 108px track of 22px tiles for three options", () => {
        renderInBand(<IconGroupRow options={SHAPES} label="Node shape" />, dir);

        const track = screen.getByTestId("icon-group-track").getBoundingClientRect();
        expect(Math.round(track.width)).toBe(PANEL_GRID.FIELD);
        expect(Math.round(track.height)).toBe(PANEL_GRID.CONTROL_HEIGHT);

        for (const option of SHAPES) {
            const box = tile(option.label).getBoundingClientRect();
            expect(Math.round(box.height)).toBe(PANEL_GRID.CONTROL_HEIGHT - 2);
            // Every tile is inside the track's 1px padding, on both edges.
            expect(box.top - track.top).toBeCloseTo(1, TOLERANCE);
            expect(track.bottom - box.bottom).toBeCloseTo(1, TOLERANCE);
        }
    });

    it("draws a 224px track for six options, and still fits every drawing", () => {
        renderInBand(<IconGroupRow options={SIX_SHAPES} label="Node shape" />, dir);

        const track = screen.getByTestId("icon-group-track").getBoundingClientRect();
        expect(Math.round(track.width)).toBe(PANEL_GRID.BODY);

        for (const option of SIX_SHAPES) {
            const box = tile(option.label).getBoundingClientRect();
            expect(box.width).toBeGreaterThanOrEqual(PANEL_GRID.GLYPH);
        }
    });

    it("keeps the row's trailing slot at the end of the band", () => {
        renderInBand(<IconGroupRow options={SHAPES} trailing={<span>x</span>} />, dir);

        const band = screen.getByTestId("band").getBoundingClientRect();
        const slot = screen.getByTestId("trailing-slot").getBoundingClientRect();
        const inlineEnd = dir === "rtl" ? slot.left - band.left : band.right - slot.right;

        expect(inlineEnd).toBeCloseTo(0, TOLERANCE);
        expect(Math.round(slot.width)).toBe(PANEL_GRID.TRAIL);
    });

    it("paints the selected ground exactly over the selected tile", () => {
        const { container } = renderInBand(<IconGroupRow options={SHAPES} defaultValue="sphere" />, dir);

        const indicator = container.querySelector(".mantine-SegmentedControl-indicator");
        if (indicator === null) {
            throw new Error("no indicator drawn");
        }

        const painted = indicator.getBoundingClientRect();
        const selected = tile("Sphere").getBoundingClientRect();

        expect(painted.left).toBeCloseTo(selected.left, TOLERANCE);
        expect(painted.width).toBeCloseTo(selected.width, TOLERANCE);
    });

    it("gives the named option more of the track than a drawing alone, in hybrid", () => {
        renderInBand(<IconGroupRow options={LAYOUTS} defaultValue="force" hybrid width={PANEL_GRID.BODY} />, dir);

        const named = tile("Force directed").getBoundingClientRect().width;
        const drawn = tile("Radial").getBoundingClientRect().width;

        expect(named).toBeGreaterThan(drawn);

        // The whole word is drawn rather than cut off: the point of naming the
        // current choice is that its name can be read.
        const word = screen.getByTestId("icon-group-word");
        expect(word.scrollWidth).toBeLessThanOrEqual(word.clientWidth);
    });

    it("moves the selection the way the arrow points", async () => {
        renderInBand(<IconGroupRow options={SHAPES} defaultValue="sphere" label="Node shape" />, dir);

        await act(async () => {
            await userEvent.tab();
        });
        expect(screen.getByRole("radio", { name: "Sphere" })).toHaveFocus();

        const toTheRight = dir === "rtl" ? "box" : "disc";
        const toTheLeft = dir === "rtl" ? "disc" : "box";

        await press("{ArrowRight}");
        expect(checkedLabel()).toBe(toTheRight);

        await press("{ArrowLeft}");
        expect(checkedLabel()).toBe("sphere");

        await press("{ArrowLeft}");
        expect(checkedLabel()).toBe(toTheLeft);
    });

    it("draws a focus ring on the tile the keyboard reaches", async () => {
        renderInBand(<IconGroupRow options={SHAPES} defaultValue="box" label="Node shape" />, dir);

        await act(async () => {
            await userEvent.tab();
        });

        const outline = window.getComputedStyle(tile("Box")).outlineWidth;
        expect(Number.parseFloat(outline)).toBeGreaterThan(0);
    });
});
