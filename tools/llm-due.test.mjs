// Tests of tools/llm-due.mjs: release.yml's LLM regression lane runs once per UTC day, and on a person's dispatch.
//
//   node --test tools/llm-due.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isDue, llmPasses, PAID, spendWarning, STEP } from "./llm-due.mjs";

const job = (steps) => ({ name: "LLM regression", steps });

describe("llmPasses", () => {
    it("reads the completion time of each passed test step, in every attempt", () => {
        const jobs = [
            job([{ name: STEP, conclusion: "failure", completed_at: "2026-10-24T01:00:00Z" }]),
            job([{ name: STEP, conclusion: "success", completed_at: "2026-10-24T07:00:00Z" }]),
            { name: "Hosts", steps: [{ name: "Run", conclusion: "success", completed_at: "2026-10-24T07:00:00Z" }] },
        ];
        assert.deepEqual(llmPasses(jobs), ["2026-10-24T07:00:00Z"]);
    });

    it("counts failed and cancelled test steps toward the month's spend, since they sent paid calls", () => {
        const jobs = [
            job([{ name: STEP, conclusion: "failure", completed_at: "2026-10-24T01:00:00Z" }]),
            job([{ name: STEP, conclusion: "cancelled", completed_at: "2026-10-24T03:00:00Z" }]),
            job([{ name: STEP, conclusion: "skipped", completed_at: "2026-10-24T05:00:00Z" }]),
            job([{ name: STEP, conclusion: "success", completed_at: "2026-10-24T07:00:00Z" }]),
        ];
        assert.deepEqual(llmPasses(jobs, PAID), [
            "2026-10-24T01:00:00Z",
            "2026-10-24T03:00:00Z",
            "2026-10-24T07:00:00Z",
        ]);
    });

    it("ignores a skipped test step (a run where the lane was not due) and a job with no steps", () => {
        assert.deepEqual(
            llmPasses([job([{ name: STEP, conclusion: "skipped", completed_at: "x" }]), { name: "Pick" }]),
            [],
        );
    });
});

describe("isDue", () => {
    const day = "2026-10-25";
    it("is due on the first run of a UTC day", () => {
        assert.equal(isDue({ trigger: "schedule", passes: ["2026-10-24T23:59:00Z"], day }), true);
    });

    it("is not due on a later scheduled run or a restart the same day", () => {
        for (const trigger of ["schedule", "workflow_run"]) {
            assert.equal(isDue({ trigger, passes: ["2026-10-25T00:40:00Z"], day }), false);
        }
    });

    it("is always due on a person's dispatch", () => {
        for (const mode of ["full", "shadow", "legacy", undefined]) {
            assert.equal(isDue({ trigger: "workflow_dispatch", mode, passes: ["2026-10-25T00:40:00Z"], day }), true);
        }
    });

    it("is not due on a restart release-due.mjs dispatched, once the tests passed that day", () => {
        const passes = ["2026-10-25T00:40:00Z"];
        assert.equal(isDue({ trigger: "workflow_dispatch", mode: "restart", passes, day }), false);
        assert.equal(isDue({ trigger: "workflow_dispatch", mode: "restart", passes: [], day }), true);
    });

    it("two days of six-hour slots run exactly one LLM pass a day", () => {
        const passes = [];
        for (const d of ["2026-10-25", "2026-10-26"]) {
            for (const h of ["00", "06", "12", "18"]) {
                if (isDue({ trigger: "schedule", passes, day: d })) passes.push(`${d}T${h}:50:00Z`);
            }
        }
        assert.deepEqual(passes, ["2026-10-25T00:50:00Z", "2026-10-26T00:50:00Z"]);
    });
});

describe("spendWarning", () => {
    it("stays quiet under $60 in a month and warns at it", () => {
        assert.equal(spendWarning(63, "2026-10"), null);
        assert.match(spendWarning(64, "2026-10"), /^spend:llm: 64 LLM regression runs in 2026-10 is about \$60\.16/);
    });
});
