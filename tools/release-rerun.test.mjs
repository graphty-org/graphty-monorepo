// Tests of tools/release-rerun.mjs: which finished runs are re-run once on the same commit.
// Run: node tools/release-rerun.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decide, modeOf } from "./release-rerun.mjs";

const full = {
    workflow: "Release",
    title: "Release (full)",
    attempt: 1,
    conclusion: "failure",
    record: { deferred: true, red: ["t4"] },
    failed: ["T4 GPU / T4 tests", "Verdict"],
    lostRunner: () => false,
};

describe("decide", () => {
    it("re-runs attempt 1 of a full run whose verdict deferred, when only lanes and the verdict failed", () => {
        assert.equal(decide(full), "rerun");
        assert.equal(decide({ ...full, title: "Release (restart)" }), "rerun");
        assert.equal(
            decide({ ...full, failed: ["CI / test (graphty-1)", "CI / All Checks Pass", "Re-capture (graphty)"] }),
            "rerun",
        );
    });
    it("never re-runs a second attempt, a success, or a verdict that decided at once", () => {
        assert.equal(decide({ ...full, attempt: 2 }), "none");
        assert.equal(decide({ ...full, conclusion: "success" }), "none");
        assert.equal(decide({ ...full, record: { deferred: false } }), "none");
        assert.equal(decide({ ...full, record: null }), "none", "no verdict ran: a failed pick decides itself");
    });
    it("files what the verdict deferred when a release job failed, never re-running version, land or publish", () => {
        for (const job of [
            "Version the release",
            "Land the release on master",
            "Publish the release",
            "Pick the release candidate",
        ]) {
            assert.equal(decide({ ...full, failed: ["Verdict", job] }), "file", job);
        }
    });
    it("re-runs a legacy release, a GPU run or the weekly benchmark only when it lost its runner", () => {
        for (const o of [
            { title: "Release (legacy)" },
            { workflow: "GPU", title: "GPU" },
            { workflow: "GPU weekly paired benchmark" },
        ]) {
            assert.equal(decide({ ...full, ...o }), "none");
            assert.equal(decide({ ...full, ...o, lostRunner: () => true }), "rerun");
        }
    });
    it("reads the mode from the run's display title", () => {
        assert.equal(modeOf("Release (candidate)"), "candidate");
        assert.equal(modeOf("GPU"), "");
    });
});
