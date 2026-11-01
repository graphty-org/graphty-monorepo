/**
 * The bounded lists of the selection editor (design/ui/selection-groups/spec.md, section 4.3): a
 * checklist draws 8 rows in all, checked values first; a row names up to three values, else the
 * first two and how many more.
 */

import { assert, describe, it } from "vitest";

import { checklistRows } from "../../style/cards";
import { valuesWords } from "../words";

const VALUES = Array.from({ length: 5000 }, (_, at) => ({
    value: String(at),
    label: String(at),
    count: 5000 - at,
}));

describe("bounded lists", () => {
    it("a checklist draws checked values first, never more than 8 rows", () => {
        const checked = new Set(VALUES.slice(100, 2184).map((each) => each.value));
        const rest = checklistRows(VALUES, checked, "");
        assert.lengthOf(rest.rows, 8);
        assert.isTrue(rest.rows.every((each) => checked.has(each.value)));
        assert.equal(rest.moreChecked, 2084 - 8);
        const few = checklistRows(VALUES, new Set(["7"]), "");
        assert.deepEqual(
            few.rows.map((each) => each.value),
            ["7", "0", "1", "2", "3", "4", "5", "6"],
        );
        assert.equal(few.unchecked, 4999);
        const found = checklistRows(VALUES, new Set(), "12");
        assert.lengthOf(found.rows, 8);
        assert.isAbove(found.matches.length, 8);
    });

    it("a row names up to three values, else two and how many more", () => {
        assert.equal(valuesWords(["1", "3", "4"]), "1, 3, 4");
        assert.equal(
            valuesWords(["1", "3", ...Array.from({ length: 2083 }, (_, at) => String(at + 10))]),
            "1, 3 and 2,083 more",
        );
    });
});
