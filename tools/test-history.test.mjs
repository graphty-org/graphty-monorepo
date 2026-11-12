// Tests of tools/test-history.mjs on a fixture ledger in a temporary directory (records written the way the gate
// and verification write them, the index rebuilt from them), and of its use in tools/test-changed.mjs.
//
//   node tools/test-history.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { SHARDS } from "./ci-test-matrix.mjs";
import { rankPlan } from "./test-changed.mjs";
import { budget, rank, rankFiles, replay, score, scoreFromPlan, UNMEASURED_MS, writeMiss } from "./test-history.mjs";
import { failureHashes, openLedger, rebuild, relFile, writeRecord } from "./test-ledger.mjs";

const dir = mkdtempSync(join(tmpdir(), "test-history-"));
after(() => rmSync(dir, { recursive: true, force: true }));

const HOUR = 3_600_000;
const NOW = Date.now();
let seq = NOW - 40 * 24 * HOUR;
/**
 * A record of one shard run, written to a ledger directory.
 * @param ledger the ledger directory
 * @param o `kind`, `at` (ms), `files` (`[file, passed, failed, ms]`), `fail` (failing files), `commit`
 */
const rec = (ledger, o) => {
    const id = `${seq++}-1-layout`;
    const failures = (o.fail ?? []).map((file) => ({
        file,
        name: "t",
        ...failureHashes("boom", file),
        message: "boom",
    }));
    writeRecord(ledger, {
        v: 1,
        id,
        kind: o.kind,
        branch: o.kind === "verify" ? "golden" : "b",
        commit: o.commit ?? `c${seq}`,
        tree: null,
        base: null,
        dirty: false,
        shard: "layout",
        family: "layout",
        variant: "layout",
        selected: null,
        outcome: failures.length ? "failed" : "passed",
        reused_from: null,
        started_at: new Date(o.at).toISOString(),
        secs: 1,
        log: null,
        files: o.files.map(([f, p, x, ms]) => [f, p, x, 0, ms, 0]),
        failures,
        exonerations: [],
    });
};
const ledgerAt = (name, fill) => {
    const env = { TEST_LEDGER_DIR: join(dir, name) };
    fill(env.TEST_LEDGER_DIR);
    rebuild(env);
    return env;
};

const A = "layout/test/a.test.ts";
const B = "layout/test/b.test.ts";
const C = "layout/test/c.test.ts";

describe("score", () => {
    const env = ledgerAt("main", (l) => {
        // B failed on golden 2 hours ago; C failed only on a branch's land check, which golden-side history ignores.
        rec(l, { kind: "verify", at: NOW - 2 * HOUR, files: [[B, 0, 1, 4000]], fail: [B] });
        rec(l, { kind: "land-check", at: NOW - HOUR, files: [[C, 0, 1, 9000]], fail: [C] });
        for (const ms of [1000, 3000, 2000]) rec(l, { kind: "verify", at: NOW - 3 * HOUR, files: [[A, 1, 0, ms]] });
        writeMiss(l, {
            culprit: "f00dfeed",
            branch: "fix/1-x",
            changed: ["layout/src/x.ts"],
            tests: [{ file: C, ran: false }],
        });
    });

    it("adds 2 for an edited file, 1 for a golden failure in 7 days, 3 per culprit whose miss shares a changed file", () => {
        const ledger = openLedger(env);
        try {
            const { scores, why } = score(ledger, [A, B, C], [A, "layout/src/x.ts"]);
            assert.equal(why, null);
            assert.deepEqual(
                [A, B, C].map((f) => scores.get(f).score),
                [2, 1, 3],
            );
            assert.match(scores.get(C).why[0], /failed after landing fix\/1-x, which also changed layout\/src\/x\.ts/);
            assert.match(scores.get(B).why[0], /failed on golden 1x in 7 days/);
            assert.equal(scores.get(A).ms, 2000, "the median of the recorded runs");
            assert.equal(scores.get(C).score, 3, "a land check's failure is not golden-side history");
        } finally {
            ledger.db.close();
        }
    });

    it("sees only rows before the time it ranks for", () => {
        const ledger = openLedger(env);
        try {
            const { scores } = score(ledger, [B], [], new Date(NOW - 5 * HOUR).toISOString());
            assert.equal(scores.get(B).score, 0);
            assert.equal(scores.get(B).ms, UNMEASURED_MS);
        } finally {
            ledger.db.close();
        }
    });

    it("ranks by score, then the shorter file, and a budget always takes the first", () => {
        const ranked = rankFiles([A, B, C], [A, "layout/src/x.ts"], env).ranked;
        assert.deepEqual(
            ranked.map((r) => r.file),
            [C, A, B],
        );
        assert.deepEqual(
            budget(ranked, 1).taken.map((r) => r.file),
            [C],
            "one file even past the budget",
        );
        assert.deepEqual(
            budget(ranked, 12).taken.map((r) => r.file),
            [C, A],
        );
    });
});

describe("without history", () => {
    it("cold start: an empty ledger ranks edited files first, then by name, each at 30 s", () => {
        const env = ledgerAt("empty", () => {});
        const { ranked, why } = rankFiles([C, B, A], [B], env);
        assert.equal(why, null);
        assert.deepEqual(
            ranked.map((r) => [r.file, r.score, r.ms]),
            [
                [B, 2, UNMEASURED_MS],
                [A, 0, UNMEASURED_MS],
                [C, 0, UNMEASURED_MS],
            ],
        );
    });

    it("a missing ledger, or TEST_HISTORY=0, says why and ranks the same way", () => {
        for (const env of [
            { TEST_LEDGER_DIR: join(dir, "nowhere") },
            { TEST_LEDGER_DIR: join(dir, "main"), TEST_HISTORY: "0" },
        ]) {
            const { ranked, why } = rankFiles([C, B, A], [B], env);
            assert.ok(why, "a reason");
            assert.deepEqual(
                ranked.map((r) => r.file),
                [B, A, C],
            );
        }
        assert.equal(
            rankFiles([A], [], { TEST_LEDGER_DIR: join(dir, "main"), TEST_HISTORY: "0" }).why,
            "TEST_HISTORY=0",
        );
    });

    it("score() of no ledger counts edits only", () => {
        assert.equal(rank(score({ why: "x" }, [A], [A]).scores)[0].score, 2);
    });
});

describe("replay", () => {
    it("counts would-drops, their time and a would-miss of the drop rule, and adds of golden failures", () => {
        const env = ledgerAt("replay", (l) => {
            for (let i = 0; i < 20; i++) rec(l, { kind: "verify", at: NOW - 20 * HOUR + i, files: [[A, 1, 0, 1000]] });
            rec(l, { kind: "verify", at: NOW - 3 * HOUR, files: [[B, 0, 1, 5000]], fail: [B] });
            rec(l, { kind: "land-check", at: NOW - HOUR, files: [[A, 0, 1, 1000]], fail: [A] });
        });
        const ledger = openLedger(env);
        try {
            const r = replay(ledger, dir, { misses: [{ file: B, at: new Date(NOW).toISOString() }] });
            assert.equal(r.gateRuns, 1);
            assert.equal(r.dropRuns, 1, "20 passing golden runs, no failure: dropped");
            assert.equal(r.dropMs, 1000);
            assert.deepEqual(
                r.wouldMiss.map((m) => m.file),
                [A],
            );
            assert.equal(r.addFiles, 0, "a change of unknown files touches no package");
            assert.equal(r.missesCaught.length, 1, "B failed on golden before the miss");
        } finally {
            ledger.db.close();
        }
    });
});

describe("relFile", () => {
    it("makes an absolute path relative to its package and keeps the template's prefix", () => {
        const abs =
            "webgpu-graph-algorithms/no-subgroups//home/u/.worktrees/land-check-2/webgpu-graph-algorithms/test/b.test.ts";
        assert.equal(relFile(abs), "webgpu-graph-algorithms/no-subgroups/test/b.test.ts");
        assert.equal(relFile(A), A);
    });
});

describe("test:changed", () => {
    const shard = SHARDS.find((s) => s.shard === "layout");
    const plan = [{ shard, mode: "files", files: [{ file: A }, { file: B }], command: "x", covers: ["layout"] }];
    const fake = (files) => ({
        ranked: rank(new Map(files.map((f, i) => [f, { score: i, ms: 10_000, why: [] }]))),
        why: null,
    });

    it("prints the ranking and runs everything without a budget", () => {
        const r = rankPlan(plan, [], undefined, fake);
        assert.equal(r.plan, plan);
        assert.match(r.lines.join("\n"), /layout\/test\/b\.test\.ts {2}score 1/);
    });

    it("keeps only the ranked files a budget fits, and says history was unavailable", () => {
        const r = rankPlan(plan, [], 10, fake);
        assert.deepEqual(
            r.plan[0].files.map((f) => f.file),
            [B],
        );
        assert.match(r.lines.join("\n"), /\[OUT\] layout\/test\/a\.test\.ts/);
        const none = rankPlan(plan, [], 10, () => ({ ranked: fake([A, B]).ranked, why: "no database yet" }));
        assert.match(none.lines[0], /history: unavailable \(no database yet\); ranking by import selection only/);
    });
});

describe("scoreFromPlan", () => {
    it("ranks by edits and the plan's recent failures, with the plan's durations", () => {
        const plan = { order: ["b.test.ts"], fileMs: { "b.test.ts": 900 } };
        const { scores, why } = scoreFromPlan(plan, ["a.test.ts", "b.test.ts", "c.test.ts"], ["a.test.ts"]);
        assert.equal(why, null);
        assert.deepEqual(scores.get("a.test.ts"), { score: 2, ms: UNMEASURED_MS, why: ["edited by this change"] });
        assert.deepEqual(scores.get("b.test.ts"), { score: 1, ms: 900, why: ["failed on master in 7 days"] });
        const { ranked } = rankFiles(["c.test.ts", "b.test.ts"], [], {}, dir, plan);
        assert.deepEqual(
            ranked.map((r) => r.file),
            ["b.test.ts", "c.test.ts"],
        );
    });
});
