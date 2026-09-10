import { describe, expect, it } from "vitest";

import { applySelectionGesture, selectAll } from "../../../src/components/DataTable/selection";
import type { SelectionModifiers } from "../../../src/components/DataTable/selection";

const IDS = ["a", "b", "c", "d", "e"];

const PLAIN: SelectionModifiers = { extend: false, toggle: false };
const EXTEND: SelectionModifiers = { extend: true, toggle: false };
const TOGGLE: SelectionModifiers = { extend: false, toggle: true };
const EXTEND_AND_TOGGLE: SelectionModifiers = { extend: true, toggle: true };

describe("applySelectionGesture", () => {
    it("replaces the selection on a plain activation", () => {
        const result = applySelectionGesture({
            ids: IDS,
            index: 2,
            selected: ["a", "b"],
            anchor: "a",
            modifiers: PLAIN,
            mode: "multiple",
        });

        expect(result.selected).toEqual(["c"]);
        expect(result.anchor).toBe("c");
    });

    it("extends from the anchor to the activated row", () => {
        const result = applySelectionGesture({
            ids: IDS,
            index: 3,
            selected: ["b"],
            anchor: "b",
            modifiers: EXTEND,
            mode: "multiple",
        });

        expect(result.selected).toEqual(["b", "c", "d"]);
    });

    it("extends backwards as well as forwards", () => {
        const result = applySelectionGesture({
            ids: IDS,
            index: 0,
            selected: ["c"],
            anchor: "c",
            modifiers: EXTEND,
            mode: "multiple",
        });

        expect(result.selected).toEqual(["a", "b", "c"]);
    });

    it("leaves the anchor where it is, so a range can be grown and shrunk", () => {
        const grown = applySelectionGesture({
            ids: IDS,
            index: 4,
            selected: ["b"],
            anchor: "b",
            modifiers: EXTEND,
            mode: "multiple",
        });
        expect(grown.anchor).toBe("b");

        const shrunk = applySelectionGesture({
            ids: IDS,
            index: 2,
            selected: grown.selected,
            anchor: grown.anchor,
            modifiers: EXTEND,
            mode: "multiple",
        });
        expect(shrunk.selected).toEqual(["b", "c"]);
    });

    it("falls back to a plain selection when there is no anchor to extend from", () => {
        const result = applySelectionGesture({
            ids: IDS,
            index: 2,
            selected: [],
            anchor: undefined,
            modifiers: EXTEND,
            mode: "multiple",
        });

        expect(result.selected).toEqual(["c"]);
        expect(result.anchor).toBe("c");
    });

    it("adds a row that is not selected and removes one that is", () => {
        const added = applySelectionGesture({
            ids: IDS,
            index: 1,
            selected: ["d"],
            anchor: "d",
            modifiers: TOGGLE,
            mode: "multiple",
        });
        expect(added.selected).toEqual(["b", "d"]);
        expect(added.anchor).toBe("b");

        const removed = applySelectionGesture({
            ids: IDS,
            index: 1,
            selected: added.selected,
            anchor: added.anchor,
            modifiers: TOGGLE,
            mode: "multiple",
        });
        expect(removed.selected).toEqual(["d"]);
    });

    it("reports the selection in the order the rows are drawn", () => {
        const result = applySelectionGesture({
            ids: IDS,
            index: 0,
            selected: ["e", "c"],
            anchor: "c",
            modifiers: TOGGLE,
            mode: "multiple",
        });

        expect(result.selected).toEqual(["a", "c", "e"]);
    });

    it("adds a whole range to the selection when Shift and Control are held together", () => {
        const result = applySelectionGesture({
            ids: IDS,
            index: 4,
            selected: ["a", "c"],
            anchor: "c",
            modifiers: EXTEND_AND_TOGGLE,
            mode: "multiple",
        });

        expect(result.selected).toEqual(["a", "c", "d", "e"]);
    });

    it("keeps exactly one row selected in single mode, whatever the modifiers", () => {
        for (const modifiers of [PLAIN, EXTEND, TOGGLE, EXTEND_AND_TOGGLE]) {
            const result = applySelectionGesture({
                ids: IDS,
                index: 3,
                selected: ["a", "b"],
                anchor: "a",
                modifiers,
                mode: "single",
            });

            expect(result.selected).toEqual(["d"]);
        }
    });

    it("changes nothing when the table has no selection", () => {
        const result = applySelectionGesture({
            ids: IDS,
            index: 3,
            selected: ["a"],
            anchor: "a",
            modifiers: PLAIN,
            mode: "none",
        });

        expect(result.selected).toEqual(["a"]);
    });

    it("keeps a selection made before a search hid the rows it was made from", () => {
        // "x" is selected but is no longer on show. Selecting a visible row must
        // not quietly discard it.
        const result = applySelectionGesture({
            ids: IDS,
            index: 1,
            selected: ["x"],
            anchor: undefined,
            modifiers: TOGGLE,
            mode: "multiple",
        });

        expect(result.selected).toEqual(["x", "b"]);
    });
});

describe("selectAll", () => {
    it("selects every row on show", () => {
        const result = selectAll(IDS, [], "multiple");

        expect(result.selected).toEqual(IDS);
        expect(result.anchor).toBe("a");
    });

    it("keeps rows that a search has hidden", () => {
        const result = selectAll(IDS, ["x"], "multiple");

        expect(result.selected).toEqual(["x", ...IDS]);
    });

    it("does nothing when only one row may be selected", () => {
        const result = selectAll(IDS, ["c"], "single");

        expect(result.selected).toEqual(["c"]);
    });
});
