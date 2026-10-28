// Tests of scripts/size-budgets.mjs: raising one part's budget raises the total with it, and a nearly full total
// is reported before it blocks an unrelated change.
//
//   node scripts/size-budgets.test.mjs   (run first by `npm run size`)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { matchParts, rebaseline, TOTAL, totalWarning } from "./size-budgets.mjs";

const PART = "file formats, all of them (on the first graphtyImport or graphtyExport)";
const OTHER = "main entry (loaded up front)";
const budgets = {
    headroomPercent: 10,
    minimumHeadroomBytes: 1024,
    parts: { [OTHER]: 110_000, [PART]: 220_000, [TOTAL]: 330_000 },
};

describe("rebaseline", () => {
    it("raises the total with the one part asked for, and leaves every other part", () => {
        const parts = { [OTHER]: { gz: 100_500 }, [PART]: { gz: 270_000 }, [TOTAL]: { gz: 370_000 } };
        const out = rebaseline(budgets, parts, PART);
        assert.equal(out[PART], 297_000);
        assert.equal(out[TOTAL], 407_000);
        assert.equal(out[OTHER], 110_000);
    });

    it("rewrites every part when none is named", () => {
        const parts = { [OTHER]: { gz: 5_000 }, [TOTAL]: { gz: 5_000 } };
        assert.deepEqual(rebaseline(budgets, parts), { [OTHER]: 6_024, [TOTAL]: 6_024 });
    });
});

describe("matchParts", () => {
    it("takes an exact name, else every name starting with the argument", () => {
        const names = [OTHER, PART, TOTAL];
        assert.deepEqual(matchParts(names, PART), [PART]);
        assert.deepEqual(matchParts(names, "File Formats"), [PART]);
        assert.deepEqual(matchParts(names, "e"), [TOTAL]);
        assert.deepEqual(matchParts(names, "x"), []);
    });
});

describe("totalWarning", () => {
    it("warns when the total has under a quarter of its headroom left (the 39 bytes of 2026-10-14)", () => {
        const warning = totalWarning({ ...budgets, parts: { [TOTAL]: 887_476 } }, { [TOTAL]: { gz: 887_437 } });
        assert.match(warning ?? "", /only 39 B left/);
    });

    it("is silent with the headroom a fresh budget gives, and when the total is over (the check fails then)", () => {
        assert.equal(totalWarning(budgets, { [TOTAL]: { gz: 300_000 } }), undefined);
        assert.equal(totalWarning(budgets, { [TOTAL]: { gz: 340_000 } }), undefined);
    });
});
