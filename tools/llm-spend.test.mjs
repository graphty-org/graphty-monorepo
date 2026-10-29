// Tests of tools/llm-spend.mjs: the month's spend on release.yml's LLM regression lane.
//
//   node --test tools/llm-spend.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { COST_PER_RUN, logCost, paidSteps, spendWarning, STEP } from "./llm-spend.mjs";

const job = (steps) => ({ name: "LLM regression", steps });

describe("paidSteps", () => {
    it("counts passed, failed and cancelled test steps, since each sent paid calls, at the flat estimate", () => {
        const jobs = [
            job([{ name: STEP, conclusion: "failure", completed_at: "2026-10-24T01:00:00Z" }]),
            job([{ name: STEP, conclusion: "cancelled", completed_at: "2026-10-24T03:00:00Z" }]),
            job([{ name: STEP, conclusion: "skipped", completed_at: "2026-10-24T05:00:00Z" }]),
            job([{ name: STEP, conclusion: "success", completed_at: "2026-10-24T07:00:00Z" }]),
            { name: "Hosts", steps: [{ name: "Run", conclusion: "success", completed_at: "2026-10-24T07:00:00Z" }] },
            { name: "Pick" },
        ];
        assert.deepEqual(
            paidSteps(jobs).map((r) => [r.at, r.usd]),
            [
                ["2026-10-24T01:00:00Z", COST_PER_RUN],
                ["2026-10-24T03:00:00Z", COST_PER_RUN],
                ["2026-10-24T07:00:00Z", COST_PER_RUN],
            ],
        );
    });

    it("takes a run's logged cost from the cost step after its tests", () => {
        const jobs = [
            job([
                { name: STEP, conclusion: "failure", completed_at: "2026-10-30T01:00:00Z" },
                { name: "LLM regression cost: 0.2871 USD", conclusion: "success" },
            ]),
            // a run whose cost step did not run keeps the estimate
            job([
                { name: STEP, conclusion: "success", completed_at: "2026-10-30T07:00:00Z" },
                { name: "LLM regression cost:  USD", conclusion: "skipped" },
            ]),
        ];
        assert.deepEqual(paidSteps(jobs), [
            { at: "2026-10-30T01:00:00Z", usd: 0.2871 },
            { at: "2026-10-30T07:00:00Z", usd: COST_PER_RUN },
        ]);
    });
});

describe("logCost", () => {
    it("sums the costs of a run's per-file lines", () => {
        const log = [
            "stdout | test/ai/llm-regression/camera-commands.test.ts",
            "[llm-regression] API calls: 27, prompt tokens 151200 (cached 120000), output tokens 810, thinking tokens 3240, flex 27/27, caches 1 (5000 tokens), cost $0.0310",
            " ✓ |llm-regression| test/ai/llm-regression/camera-commands.test.ts (12 tests) 61234ms",
            "[llm-regression] API calls: 3, prompt tokens 16800 (cached 0), output tokens 90, thinking tokens 360, flex 3/3, caches 0 (0 tokens), cost $0.0071",
        ].join("\n");
        assert.equal(logCost(log).toFixed(4), "0.0381");
    });

    it("is null when no line carries a cost: an older harness, or a provider it has no price for", () => {
        assert.equal(logCost("[llm-regression] API calls: 27\n[llm-regression] API calls: 3, cost unknown"), null);
        assert.equal(logCost(""), null);
    });
});

describe("spendWarning", () => {
    it("stays quiet under $60 in a month and warns at it", () => {
        assert.equal(spendWarning(59.99, 63, "2026-10"), null);
        assert.match(
            spendWarning(60.16, 64, "2026-10"),
            /^spend:llm: 64 LLM regression runs in 2026-10 is about \$60\.16/,
        );
    });
});
