/**
 * Tests of tools/shard-verdict.mjs: a test shard passes only when it exits 0 AND its output shows each
 * vitest run finished AND the reports it asks for were written (issue #2116).
 */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { SHARDS } from "./ci-test-matrix.mjs";
import { checkShard, expectedReports, expectedRuns, shardVerdict } from "./shard-verdict.mjs";

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
