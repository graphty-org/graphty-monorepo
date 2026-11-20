/**
 * Renumbering a row-indexed list after a freeze: a removal closes the list up in place, and an undo that puts
 * rows back between the others moves each kept row up to its new place (issue #9164).
 */
import { INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { RowRenumbering } from "../../src/managers/RowRenumbering";

const X = INVALID_INDEX;

describe("RowRenumbering.remapRows", () => {
    it("closes a removal up in place", () => {
        const rows = ["a", "b", undefined, "d", "e"];
        const moved = RowRenumbering.remapRows(rows, Uint32Array.from([0, X, 1, 2, X]));
        assert.strictEqual(moved, rows, "the same array");
        assert.deepEqual(moved, ["a", undefined, "d"]);
    });

    it("moves rows up past rows put back between them", () => {
        const rows = ["a", "b", "c"];
        // An undo put a row back at 1 and another at 3.
        const moved = RowRenumbering.remapRows(rows, Uint32Array.from([0, 2, 4]));
        assert.deepEqual([...moved], ["a", undefined, "b", undefined, "c"]);
    });

    it("drops and moves at once", () => {
        const moved = RowRenumbering.remapRows(["a", "b", "c", "d"], Uint32Array.from([X, 0, 2, 3]));
        assert.deepEqual([...moved], ["b", undefined, "c", "d"]);
    });
});
