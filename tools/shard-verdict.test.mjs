/**
 * Tests of tools/shard-verdict.mjs: a test shard passes only when it exits 0 AND its output shows each
 * vitest run finished AND the reports it asks for were written (issue #2116).
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { SHARDS } from "./ci-test-matrix.mjs";
import {
    checkShard,
    expectedReports,
    expectedRuns,
    LOG_BUDGET_BYTES,
    shardVerdict,
    topRepeated,
} from "./shard-verdict.mjs";

const SUMMARY = " Test Files  12 passed (12)\n      Tests  80 passed (80)\n";

describe("shardVerdict", () => {
    it("passes an exit 0 whose output holds the vitest summary, colored or not", () => {
        assert.deepEqual(shardVerdict({ code: 0, log: `running\n${SUMMARY}` }), { pass: true });
        assert.deepEqual(
            shardVerdict({ code: 0, log: "\u001b[2m Test Files \u001b[22m \u001b[32m3 passed\u001b[39m (3)\n" }),
            {
                pass: true,
            },
        );
    });

    it("fails an exit 0 without a summary, naming the cause", () => {
        const v = shardVerdict({ code: 0, log: "RUN  v4\n stdout | test/a.test.ts\n" });
        assert.equal(v.pass, false);
        assert.match(v.cause, /^exit 0 but 0 of 1 vitest run summaries \("Test Files" line\)/);
    });

    it("fails an exit 0 with fewer summaries than the command makes vitest runs", () => {
        const v = shardVerdict({ code: 0, log: SUMMARY, runs: 2 });
        assert.match(v.cause, /1 of 2 vitest run summaries/);
        assert.equal(shardVerdict({ code: 0, log: SUMMARY + SUMMARY, runs: 2 }).pass, true);
    });

    it("fails a non-zero or signal exit whatever the output says", () => {
        assert.deepEqual(shardVerdict({ code: 1, log: SUMMARY }), { pass: false, cause: "exit 1" });
        assert.deepEqual(shardVerdict({ code: null, log: SUMMARY }), { pass: false, cause: "exit null" });
    });

    it("fails a passing run whose output is over the log budget, naming the most repeated lines", () => {
        // Tier 3's act() flood: 85 to 108 MB of one repeated warning per shard, which passed every gate.
        const warning = "Warning: An update to GraphPlace inside a test was not wrapped in act(...).";
        const flood = `${`${warning}\n    at GraphPlace (src/GraphPlace.tsx:12:3)\n`.repeat(2000)}${SUMMARY}`;
        const v = shardVerdict({ code: 0, log: flood, logBudget: 64 * 1024 });
        assert.equal(v.pass, false);
        assert.match(v.cause, /^exit 0 but its output is 0\.\d MB, over the 0\.1 MB budget/);
        assert.match(v.cause, /\n {4}2000 x Warning: An update to GraphPlace/);
        assert.equal(shardVerdict({ code: 0, log: flood, logBudget: flood.length }).pass, true);
        // The default sits above every normal shard (the largest, compact-mantine, writes about 3.5 MB).
        assert.ok(LOG_BUDGET_BYTES >= 3 * 3.5 * 1024 * 1024);
        assert.equal(shardVerdict({ code: 0, log: `${"x".repeat(4 * 1024 * 1024)}\n${SUMMARY}` }).pass, true);
    });

    it("names only lines that repeat, most repeated first", () => {
        assert.deepEqual(topRepeated("a\nb\n\u001b[33mb\u001b[39m\nc\nc\nc\n\n\n"), ["3 x c", "2 x b"]);
    });

    it("fails an exit 0 whose expected report was not written", () => {
        const v = shardVerdict({ code: 0, log: SUMMARY, missingReports: ["pkg/.vitest-reports/blob.json"] });
        assert.match(v.cause, /no report written by this run: pkg\/\.vitest-reports\/blob\.json/);
    });
});

describe("what each CI shard command is expected to produce", () => {
    it("expects one summary per command, and one per version from the Cytoscape versions script", () => {
        for (const s of SHARDS) {
            const cyto = s["test-command"].includes("test-cytoscape-versions.sh");
            assert.equal(expectedRuns(s["test-command"]), cyto ? s["test-command"].split(" ").length - 1 : 1, s.shard);
        }
        assert.equal(expectedRuns("cytoscape-extensions/scripts/test-cytoscape-versions.sh 3.31.0 3"), 2);
    });

    it("expects vitest's blob report where a command asks for one", () => {
        const cmd = (name) => SHARDS.find((s) => s.shard === name)["test-command"];
        assert.deepEqual(expectedReports(cmd("graphty-element-browser-3")), [
            "graphty-element/.vitest-reports/blob-3-5.json",
        ]);
        assert.deepEqual(expectedReports(cmd("graphty-element-default")), [
            "graphty-element/.vitest-reports/blob.json",
        ]);
        assert.deepEqual(expectedReports(cmd("layout")), []);
    });

    it("counts a report left by an earlier run as missing", () => {
        const root = mkdtempSync(join(tmpdir(), "shard-verdict-"));
        try {
            const shard = { shard: "x", "test-command": "cd pkg && pnpm exec vitest run --reporter=blob" };
            mkdirSync(join(root, "pkg/.vitest-reports"), { recursive: true });
            const blob = join(root, "pkg/.vitest-reports/blob.json");
            assert.match(checkShard(shard, 0, SUMMARY, root, 0).cause, /no report written/);
            writeFileSync(blob, "{}");
            utimesSync(blob, 1000, 1000);
            assert.match(checkShard(shard, 0, SUMMARY, root, 2_000_000).cause, /no report written/);
            assert.deepEqual(checkShard(shard, 0, SUMMARY, root, 0), { pass: true });
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

describe("tools/run-tests.sh", () => {
    // Issue #2197: the shard log lived in /tmp, another process removed it while the shard ran, and
    // the verdict failed a passing shard with ENOENT. The fake shard below empties TMPDIR mid-run.
    it("keeps the shard log in the checkout's tmp/, so emptying TMPDIR mid-run cannot fail the shard", () => {
        const here = dirname(fileURLToPath(import.meta.url));
        const root = mkdtempSync(join(tmpdir(), "run-tests-"));
        try {
            mkdirSync(join(root, "tools"));
            for (const f of ["run-tests.sh", "shard-verdict.mjs"]) copyFileSync(join(here, f), join(root, "tools", f));
            const command = [
                'rm -rf "$TMPDIR"/* "$TMPDIR"/.[!.]*',
                // The log's directory, not output.log: tee opens the file beside this command, so the
                // file may not exist yet when the command runs.
                "ls -d tmp/run-tests/fake.*",
                "printf ' Test Files  1 passed (1)\\n'",
            ].join("; ");
            writeFileSync(
                join(root, "tools/ci-test-matrix.mjs"),
                `export const SHARDS = [{ shard: "fake", "test-command": ${JSON.stringify(command)} }];\n`,
            );
            const temp = join(root, "system-tmp");
            mkdirSync(temp);
            const r = spawnSync("bash", [join(root, "tools/run-tests.sh"), "fake"], {
                encoding: "utf8",
                env: { ...process.env, TMPDIR: temp },
            });
            assert.equal(r.status, 0, r.stdout + r.stderr);
            assert.match(r.stdout, /^tmp\/run-tests\/fake\.[^/]+$/m);
            assert.deepEqual(readdirSync(join(root, "tmp/run-tests")), [], "the run removes its own log");
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});
