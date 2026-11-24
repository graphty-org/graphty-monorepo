// tools/coverage-badges.mjs: a package's badge shows its own line coverage, counted from DA records.
//
//   node --test tools/coverage-badges.test.mjs
import assert from "node:assert/strict";
import { it } from "node:test";

import { color, render } from "./coverage-badges.mjs";

const lcov = [
    "SF:pkg/src/a.ts",
    "DA:1,3",
    "DA:2,0",
    "end_of_record",
    "SF:pkg/src/b.ts",
    "DA:1,1",
    "DA:2,1",
    "end_of_record",
].join("\n");

it("counts line coverage over every file's DA records", () => {
    const { badge, report } = render("pkg", lcov, "abc123");
    assert.deepEqual(badge, { schemaVersion: 1, label: "coverage", message: "75.0%", color: "yellowgreen" });
    assert.match(report, /75\.0% \(3 of 4 lines\) on abc123/);
    assert.match(report, /\| pkg\/src\/a\.ts \| 1 \/ 2 \| 50\.0% \|/);
});

it("colors by shields.io's coverage bands", () => {
    assert.equal(color(95), "brightgreen");
    assert.equal(color(80), "green");
    assert.equal(color(10), "red");
});
