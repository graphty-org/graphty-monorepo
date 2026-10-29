// Tests of tools/llm-spend.mjs: the month's spend on release.yml's LLM regression lane.
//
//   node --test tools/llm-spend.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { paidSteps, spendWarning, STEP } from "./llm-spend.mjs";

const job = (steps) => ({ name: "LLM regression", steps });

describe("paidSteps", () => {
    it("counts passed, failed and cancelled test steps, since each sent paid calls", () => {
        const jobs = [
            job([{ name: STEP, conclusion: "failure", completed_at: "2026-10-24T01:00:00Z" }]),
            job([{ name: STEP, conclusion: "cancelled", completed_at: "2026-10-24T03:00:00Z" }]),
            job([{ name: STEP, conclusion: "skipped", completed_at: "2026-10-24T05:00:00Z" }]),
            job([{ name: STEP, conclusion: "success", completed_at: "2026-10-24T07:00:00Z" }]),
            { name: "Hosts", steps: [{ name: "Run", conclusion: "success", completed_at: "2026-10-24T07:00:00Z" }] },
            { name: "Pick" },
        ];
        assert.deepEqual(paidSteps(jobs), ["2026-10-24T01:00:00Z", "2026-10-24T03:00:00Z", "2026-10-24T07:00:00Z"]);
    });
});

describe("spendWarning", () => {
    it("stays quiet under $60 in a month and warns at it", () => {
        assert.equal(spendWarning(63, "2026-10"), null);
        assert.match(spendWarning(64, "2026-10"), /^spend:llm: 64 LLM regression runs in 2026-10 is about \$60\.16/);
    });
});
