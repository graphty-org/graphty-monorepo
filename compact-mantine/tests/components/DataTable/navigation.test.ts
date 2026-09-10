import { describe, expect, it } from "vitest";

import {
    clampGridPosition,
    type GridBounds,
    HEADER_ROW,
    nextGridPosition,
    samePosition,
} from "../../../src/components/DataTable/navigation";

const BOUNDS: GridBounds = { rowCount: 10, columnCount: 3, pageSize: 4 };
const NO_MODIFIERS = { jumpToEnd: false };
const JUMP = { jumpToEnd: true };

/**
 * Moves from one cell, in a table of ten rows and three columns.
 * @param row - Which row focus starts on
 * @param column - Which column focus starts on
 * @param key - The key pressed
 * @param direction - Which way the text runs
 * @param modifiers - Which modifier keys the press carried
 * @returns Where focus lands
 */
function move(
    row: number,
    column: number,
    key: string,
    direction: "ltr" | "rtl" = "ltr",
    modifiers = NO_MODIFIERS,
): ReturnType<typeof nextGridPosition> {
    return nextGridPosition({ row, column }, key, BOUNDS, direction, modifiers);
}

describe("nextGridPosition", () => {
    it("moves one cell along the row with the inline arrows", () => {
        expect(move(0, 0, "ArrowRight")).toEqual({ row: 0, column: 1 });
        expect(move(0, 1, "ArrowLeft")).toEqual({ row: 0, column: 0 });
    });

    it("follows the direction of the text, so Arrow Right advances only where text runs left to right", () => {
        expect(move(0, 1, "ArrowRight", "rtl")).toEqual({ row: 0, column: 0 });
        expect(move(0, 1, "ArrowLeft", "rtl")).toEqual({ row: 0, column: 2 });
    });

    it("stops at the ends of the row rather than wrapping", () => {
        expect(move(0, 0, "ArrowLeft")).toEqual({ row: 0, column: 0 });
        expect(move(0, 2, "ArrowRight")).toEqual({ row: 0, column: 2 });
    });

    it("moves between the rows with the block arrows", () => {
        expect(move(0, 1, "ArrowDown")).toEqual({ row: 1, column: 1 });
        expect(move(5, 1, "ArrowUp")).toEqual({ row: 4, column: 1 });
    });

    it("reaches the column headers from the first row and leaves them again", () => {
        expect(move(0, 2, "ArrowUp")).toEqual({ row: HEADER_ROW, column: 2 });
        expect(move(HEADER_ROW, 2, "ArrowDown")).toEqual({ row: 0, column: 2 });
        expect(move(HEADER_ROW, 2, "ArrowUp")).toEqual({ row: HEADER_ROW, column: 2 });
    });

    it("stops at the last row", () => {
        expect(move(9, 0, "ArrowDown")).toEqual({ row: 9, column: 0 });
    });

    it("moves to the ends of the row with Home and End", () => {
        expect(move(4, 1, "Home")).toEqual({ row: 4, column: 0 });
        expect(move(4, 1, "End")).toEqual({ row: 4, column: 2 });
    });

    it("moves to the ends of the table when Control is held", () => {
        expect(move(4, 1, "Home", "ltr", JUMP)).toEqual({ row: HEADER_ROW, column: 0 });
        expect(move(4, 1, "End", "ltr", JUMP)).toEqual({ row: 9, column: 2 });
    });

    it("moves by a page, and lands in the data even when it starts on the headers", () => {
        expect(move(1, 0, "PageDown")).toEqual({ row: 5, column: 0 });
        expect(move(8, 0, "PageDown")).toEqual({ row: 9, column: 0 });
        expect(move(6, 0, "PageUp")).toEqual({ row: 2, column: 0 });
        expect(move(1, 0, "PageUp")).toEqual({ row: 0, column: 0 });
        expect(move(HEADER_ROW, 0, "PageDown")).toEqual({ row: 4, column: 0 });
    });

    it("moves nothing for a key that is not a movement key", () => {
        expect(move(0, 0, "a")).toBeUndefined();
        expect(move(0, 0, "Enter")).toBeUndefined();
        expect(move(0, 0, " ")).toBeUndefined();
    });

    it("moves nothing when every column is hidden", () => {
        expect(nextGridPosition({ row: 0, column: 0 }, "ArrowRight", { ...BOUNDS, columnCount: 0 }, "ltr", NO_MODIFIERS)).toBeUndefined();
    });
});

describe("clampGridPosition", () => {
    it("leaves a position that exists alone", () => {
        expect(clampGridPosition({ row: 4, column: 1 }, { rowCount: 10, columnCount: 3 })).toEqual({
            row: 4,
            column: 1,
        });
    });

    it("brings a position back into range when a search shortens the table", () => {
        expect(clampGridPosition({ row: 40, column: 1 }, { rowCount: 3, columnCount: 3 })).toEqual({
            row: 2,
            column: 1,
        });
    });

    it("brings a position back into range when a column is hidden", () => {
        expect(clampGridPosition({ row: 1, column: 5 }, { rowCount: 3, columnCount: 2 })).toEqual({
            row: 1,
            column: 1,
        });
    });

    it("falls back to the header row when a search leaves no rows at all", () => {
        expect(clampGridPosition({ row: 4, column: 0 }, { rowCount: 0, columnCount: 2 })).toEqual({
            row: HEADER_ROW,
            column: 0,
        });
    });
});

describe("samePosition", () => {
    it("compares both halves of a position", () => {
        expect(samePosition({ row: 1, column: 2 }, { row: 1, column: 2 })).toBe(true);
        expect(samePosition({ row: 1, column: 2 }, { row: 1, column: 3 })).toBe(false);
        expect(samePosition({ row: 1, column: 2 }, { row: 2, column: 2 })).toBe(false);
    });
});
