// Tests of tools/stuck-report.mjs: each unlanded pull request gets the first blocker that applies.
//
//   node tools/stuck-report.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classify } from "./stuck-report.mjs";

const GREEN = {
    Build: "SUCCESS",
    "All Checks Pass": "SUCCESS",
    "Queue Checks Pass": "SUCCESS",
    "Mergify Merge Queue": "NEUTRAL",
};
// Shaped like status.json's pullRequests records.
const pr = (over = {}) => ({
    number: 1,
    head: "feat/x",
    base: "master",
    draft: false,
    mergeable: "MERGEABLE",
    labels: [],
    checks: { ...GREEN },
    ...over,
});

describe("classify", () => {
    it("names each blocker in order", () => {
        assert.equal(classify(null), "no pull request");
        assert.equal(classify(pr({ draft: true, mergeable: "CONFLICTING" })), "draft");
        assert.equal(classify(pr({ mergeable: "CONFLICTING", checks: { Lint: "FAILURE" } })), "conflicts with master");
        assert.equal(
            classify(pr({ checks: { ...GREEN, Lint: "FAILURE", Docs: "FAILURE", "All Checks Pass": "FAILURE" } })),
            "failing check: Lint (+1 more)",
        );
        assert.equal(
            classify(pr({ checks: { ...GREEN, "All Checks Pass": "FAILURE", "Queue Checks Pass": "FAILURE" } })),
            "waiting for the owner's screenshot review",
        );
        assert.equal(
            classify(pr({ checks: { ...GREEN, "Queue Checks Pass": "FAILURE" } })),
            "failing check: Queue Checks Pass",
        );
        assert.equal(classify(pr({ checks: { ...GREEN, Build: "IN_PROGRESS" } })), "checks running");
        assert.equal(
            classify(pr({ labels: ["queued"], checks: { ...GREEN, "Mergify Merge Queue": "IN_PROGRESS" } })),
            "queued",
        );
        assert.equal(classify(pr({ labels: ["hold"], base: "feat/y" })), "held");
        assert.equal(classify(pr({ base: "feat/y" })), "stacked on feat/y");
        assert.match(classify(pr()), /^ready but not queued/);
    });
});
