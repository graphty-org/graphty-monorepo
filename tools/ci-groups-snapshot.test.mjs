// The pipeline health dashboard's copy of the test groups (tools/pipeline-health/config/ci-groups.json) must match
// tools/ci-test-matrix.mjs (GROUPS, GROUP_MEMBER_SECONDS) and tools/results/run-group.mjs (TEST_STEP_LIMIT_MS):
// its Lambda cannot import those modules, so it reads this copy to sum each group's member times per full run (#7855).
//
//   node tools/ci-groups-snapshot.test.mjs
//   UPDATE_CI_GROUPS=1 node tools/ci-groups-snapshot.test.mjs   # rewrites the copy
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { it } from "node:test";

import { GROUP_MEMBER_SECONDS, GROUPS } from "./ci-test-matrix.mjs";
import { TEST_STEP_LIMIT_MS } from "./results/run-group.mjs";

const file = new URL("pipeline-health/config/ci-groups.json", import.meta.url);

it("the dashboard's copy of the test groups matches the test matrix", () => {
    const want = { testStepLimitMs: TEST_STEP_LIMIT_MS, groups: GROUPS, memberSeconds: GROUP_MEMBER_SECONDS };
    const text = `${JSON.stringify(want, null, 4)}\n`;
    if (process.env.UPDATE_CI_GROUPS === "1") writeFileSync(file, text);
    assert.deepEqual(
        JSON.parse(readFileSync(file, "utf8")),
        want,
        "run: UPDATE_CI_GROUPS=1 node tools/ci-groups-snapshot.test.mjs",
    );
});
