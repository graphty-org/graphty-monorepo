import { describe, expect, it } from "vitest";

import { STATUS_BAR_HEIGHT, TOP_BAR_HEIGHT } from "../../constants";
import {
    HISTORY_HEADER_HEIGHT,
    HISTORY_POPOVER_CONTENT_WIDTH,
    HISTORY_POPOVER_GAP,
    HISTORY_POPOVER_HEIGHT_RESERVE,
    HISTORY_POPOVER_WIDTH,
    HISTORY_ROW_GRID_WIDTH,
    HISTORY_ROW_HEIGHT,
    HISTORY_ROW_WIDTH,
    KEY_CHIP_HEIGHT,
    KEY_CHIP_RADIUS,
    MENU_CARET_SIZE,
    MENU_CARET_STROKE,
    PALETTE_PILL_HEIGHT,
    PALETTE_PILL_WIDTH,
    SPLIT_BUTTON_HEIGHT,
    SPLIT_CARET_GLYPH_SIZE,
    SPLIT_CARET_WIDTH,
    SPLIT_DIVIDER_HEIGHT,
    SPLIT_DIVIDER_WIDTH,
    SPLIT_MAIN_WIDTH,
    TOP_BAR_GLYPH_SIZE,
    TOP_BAR_GROUP_GAP,
    TOP_BAR_ICON_BUTTON,
    TOP_BAR_PADDING_X,
    TOP_BAR_RIGHT_GROUP_GAP,
    TOP_BAR_SMALL_GLYPH_SIZE,
} from "../topBarGeometry";

describe("topBarGeometry", () => {
    describe("the bar", () => {
        it("is 40 tall with 12 px of horizontal padding", () => {
            expect(TOP_BAR_HEIGHT).toBe(40);
            expect(TOP_BAR_PADDING_X).toBe(12);
        });

        it("puts 8 between the three slot groups and 4 inside the right one", () => {
            expect(TOP_BAR_GROUP_GAP).toBe(8);
            expect(TOP_BAR_RIGHT_GROUP_GAP).toBe(4);
        });

        it("draws a 24 x 24 icon button with a glyph in the library's 24 px slot", () => {
            expect(TOP_BAR_ICON_BUTTON).toBe(24);
            expect(TOP_BAR_GLYPH_SIZE).toBe(24);
        });

        it("draws a text trigger's glyph at the register's default 12", () => {
            expect(TOP_BAR_SMALL_GLYPH_SIZE).toBe(12);
        });

        it("draws the menu-affordance caret at 8 with a heavier stroke", () => {
            expect(MENU_CARET_SIZE).toBe(8);
            expect(MENU_CARET_STROKE).toBe(2);
        });
    });

    describe("the undo split button", () => {
        it("is one 24 tall group of two 24 halves", () => {
            expect(SPLIT_BUTTON_HEIGHT).toBe(24);
            expect(SPLIT_MAIN_WIDTH).toBe(24);
            expect(SPLIT_CARET_WIDTH).toBe(24);
        });

        it("draws the caret half's glyph at the library's 10 px chevron", () => {
            expect(SPLIT_CARET_GLYPH_SIZE).toBe(10);
        });

        it("divides the two halves with a full-height 1 x 24 rule", () => {
            expect(SPLIT_DIVIDER_WIDTH).toBe(1);
            expect(SPLIT_DIVIDER_HEIGHT).toBe(24);
        });
    });

    describe("the command palette pill", () => {
        it("is 300 x 24", () => {
            expect(PALETTE_PILL_WIDTH).toBe(300);
            expect(PALETTE_PILL_HEIGHT).toBe(24);
        });

        it("carries a 16 tall chip at radius 3", () => {
            expect(KEY_CHIP_HEIGHT).toBe(16);
            expect(KEY_CHIP_RADIUS).toBe(3);
        });
    });

    describe("the History pop-out", () => {
        it("takes the middle rung of the 280 / 360 / 480 ladder and touches the bar", () => {
            expect(HISTORY_POPOVER_WIDTH).toBe(360);
            expect(HISTORY_POPOVER_GAP).toBe(0);
        });

        it("holds 358 inside its border and lays a 350 px row inside that", () => {
            expect(HISTORY_POPOVER_CONTENT_WIDTH).toBe(358);
            expect(HISTORY_ROW_WIDTH).toBe(350);
        });

        it("adds its four columns and three gaps up to a 336 px row grid", () => {
            expect(HISTORY_ROW_GRID_WIDTH).toBe(336);
        });

        it("draws the library's 40 px section header over 32 px entry rows", () => {
            expect(HISTORY_HEADER_HEIGHT).toBe(40);
            expect(HISTORY_ROW_HEIGHT).toBe(32);
        });

        it("caps its height at 804 on the drawn 900 px board", () => {
            expect(HISTORY_POPOVER_HEIGHT_RESERVE).toBe(
                TOP_BAR_HEIGHT + STATUS_BAR_HEIGHT + 32,
            );
            expect(900 - HISTORY_POPOVER_HEIGHT_RESERVE).toBe(804);
        });
    });
});
