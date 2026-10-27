// Tests of tools/release-rerun.mjs: which finished runs are re-run once on the same commit.
// Run: node tools/release-rerun.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    it("re-runs a full run that ended cancelled because a CI job hit its timeout (run 40448487922)", () => {
        const timedOut = {
            ...full,
            title: "Release (restart)",
            conclusion: "cancelled",
            record: { deferred: true, red: ["ci"] },
            failed: [
                "CI / Story tests (graph-io-fidelity)",
                "CI / visual (graph-io-fidelity)",
                "CI / Story tests parity (graphty)",
            ],
        };
        assert.equal(decide(timedOut), "rerun");
        assert.equal(decide({ ...timedOut, conclusion: "timed_out" }), "rerun");
        assert.equal(decide({ ...timedOut, failed: [...timedOut.failed, "Publish the release"] }), "file");
        assert.equal(
            decide({ ...timedOut, record: null }),
            "none",
            "cancelled before the verdict: release-watch announces",
        );
    });
    it("re-runs a GPU run that lost its runner only when it failed, never one that was cancelled", () => {
        const gpu = { ...full, workflow: "GPU", title: "GPU", lostRunner: () => true };
        assert.equal(decide({ ...gpu, conclusion: "cancelled" }), "none");
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

// main() in a directory whose gh and tools/ are stubs that log how they were called
function runMain({ failed, rerunFails, record }) {
    const dir = mkdtempSync(join(tmpdir(), "release-rerun-"));
    const log = join(dir, "calls.log");
    writeFileSync(log, "");
    mkdirSync(join(dir, "bin"));
    mkdirSync(join(dir, "tools", "channel"), { recursive: true });
    writeFileSync(join(dir, "record.json"), JSON.stringify(record));
    writeFileSync(
        join(dir, "bin", "gh"),
        [
            "#!/bin/bash",
            `echo "gh $*" >> "${log}"`,
            `if [ "$1" = api ]; then printf '%s\\n' ${failed.map((j) => `'${j}'`).join(" ")}; exit 0; fi`,
            `if [ "$1 $2" = "run download" ]; then while [ $# -gt 0 ]; do [ "$1" = -D ] && cp "${join(dir, "record.json")}" "$2/verdict-1.json"; shift; done; exit 0; fi`,
            `if [ "$1 $2" = "run rerun" ]; then exit ${rerunFails ? 1 : 0}; fi`,
        ].join("\n"),
        { mode: 0o755 },
    );
    const stub = (name) =>
        `import { appendFileSync } from "node:fs";\nappendFileSync(${JSON.stringify(log)}, \`${name} \${process.argv.slice(2).join(" ")} \${process.env.ONLY_IF_FREE ?? ""} \${process.env.SHA ?? ""}\\n\`);\n`;
    writeFileSync(join(dir, "tools", "full-run.mjs"), stub("full-run"));
    writeFileSync(join(dir, "tools", "release-status.mjs"), stub("release-status"));
    writeFileSync(join(dir, "tools", "channel", "hold.mjs"), stub("hold"));
    const r = spawnSync(process.execPath, [new URL("./release-rerun.mjs", import.meta.url).pathname], {
        cwd: dir,
        encoding: "utf8",
        env: {
            ...process.env,
            PATH: `${join(dir, "bin")}:${process.env.PATH}`,
            RUN: "9",
            WORKFLOW: "Release",
            TITLE: "Release (full)",
            ATTEMPT: "1",
            CONCLUSION: "failure",
            RUN_URL: "https://run",
            HEAD_SHA: "a".repeat(40),
            GITHUB_REPOSITORY: "o/r",
            GITHUB_OUTPUT: "",
        },
    });
    return { status: r.status, calls: readFileSync(log, "utf8") };
}

describe("a red run that is not re-run", () => {
    const record = { deferred: true, red: ["t4"], sha: "a".repeat(40) };
    it("files what attempt 1 deferred and holds its commit when a job outside the re-run list failed", () => {
        const r = runMain({ failed: ["Merge fixes into the held candidate", "T4 GPU / T4 tests"], record });
        assert.equal(r.status, 0);
        assert.doesNotMatch(r.calls, /gh run rerun/);
        assert.match(r.calls, /^full-run file-deferred /m);
        assert.match(r.calls, new RegExp(`^hold start true ${"a".repeat(40)}$`, "m"));
    });
    it("does the same when the re-run itself could not start", () => {
        const r = runMain({ failed: ["T4 GPU / T4 tests"], rerunFails: true, record });
        assert.equal(r.status, 0);
        assert.match(r.calls, /gh run rerun 9 --failed/);
        assert.match(r.calls, /^hold start true /m);
    });
    it("starts no hold for a held head past its commit", () => {
        const r = runMain({ failed: ["Merge fixes into the held candidate"], record: { ...record, forward: true } });
        assert.doesNotMatch(r.calls, /^hold /m);
    });
    it("a re-run that starts holds nothing: the second attempt decides", () => {
        const r = runMain({ failed: ["T4 GPU / T4 tests"], record });
        assert.doesNotMatch(r.calls, /^(hold|full-run) /m);
    });
});
