import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { causesOf, gateReport, gateText, keptLines, matchPush, parseGate, readPushes } from "../lib/prepush.mjs";

const WS = {
    packages: ["graph-format", "graph-io", "graphty-element", "visual-review"],
    deps: { "graph-io": ["graph-format"], "graphty-element": ["graph-format"] },
};
const ESC = String.fromCodePoint(27);

/** The gate output of a push whose graph-io shard failed one test, as tools/prepush.sh prints it. */
const FAILED_GATE = [
    `${ESC}[1;33m> Formatting${ESC}[0m`,
    `${ESC}[0;32m[PASS] Formatting passed${ESC}[0m`,
    "Affected packages: graph-format,graph-io",
    "Shards: graph-format, graph-io",
    "  [PASS] graph-format (31s)",
    "  [FAIL] graph-io (exit 1, 96s); the end of /x/tmp/prepush-tests/graph-io.log:",
    "     × joins a value continued over 200k lines in linear time 5584ms",
    " FAIL  test/robustness/obo.test.ts > robustness: size and time > joins a value continued over 200k lines in linear time",
    " FAIL  test/robustness/obo.test.ts > robustness: size and time > joins a value continued over 200k lines in linear time",
    " Test Files  1 failed | 121 passed (122)",
    `${ESC}[0;31m[FAIL] Tests (the CI shards of the affected packages) failed${ESC}[0m`,
    "Pre-push validation stopped at the first failure: Tests (the CI shards of the affected packages)",
    "error: failed to push some refs to 'https://github.com/graphty-org/graphty-monorepo'",
].join("\n");
const OBO =
    "graph-io/test/robustness/obo.test.ts > robustness: size and time > joins a value continued over 200k lines in linear time";

/**
 * A normalized push.
 * @param {Partial<import("../lib/prepush.mjs").Push>} over its fields
 * @returns {import("../lib/prepush.mjs").Push} the push
 */
const push = (over) => ({
    key: "k",
    at: "2026-10-07T10:00:00Z",
    branch: "fix/a",
    sha: "a".repeat(40),
    exit: 1,
    cwd: "/repo/.worktrees/fix-a",
    waitMs: null,
    gateMs: null,
    elapsedMs: null,
    gate: null,
    changed: null,
    ...over,
});

describe("parseGate", () => {
    it("reads the failed steps, the failed shard and its tests once each, without colors", () => {
        const g = parseGate(keptLines(FAILED_GATE), WS.packages);
        expect(g.steps).toEqual(["Tests (the CI shards of the affected packages)"]);
        expect(g.shards).toEqual([{ shard: "graph-io", secs: 96 }]);
        expect(g.tests.map((t) => [t.id, t.package, t.shard])).toEqual([[OBO, "graph-io", "graph-io"]]);
        expect(g.passed).toBe(false);
    });

    it("keeps only the lines the push queue keeps", () => {
        expect(keptLines(FAILED_GATE)).toEqual([
            "  [FAIL] graph-io (exit 1, 96s); the end of /x/tmp/prepush-tests/graph-io.log:",
            " FAIL  test/robustness/obo.test.ts > robustness: size and time > joins a value continued over 200k lines in linear time",
            " FAIL  test/robustness/obo.test.ts > robustness: size and time > joins a value continued over 200k lines in linear time",
            "[FAIL] Tests (the CI shards of the affected packages) failed",
        ]);
    });

    it("reads the push queue's line for a timed-out shard, whose tests come from the shard's own log", () => {
        // feat/githerd, 2026-10-08T02:42:27Z: the printed tail of the shard log was a process list.
        const g = parseGate(
            [
                "  [FAIL] webgpu-graph-algorithms-node (exit 1, 275s); the end of /w/tmp/prepush-tests/webgpu-graph-algorithms-node.log:",
                " FAIL  |node| test/noise-floor.test.ts > noise floor (benchmarks/results/noise-floor.json) > every tolerance is derived from a recorded basis row: floor <= value <= 10 x floor, factor = value / floor, no seed entry left",
                " FAIL  |node| test/algorithms/all-pairs.test.ts > allPairsShortestPath (design 8.7 / 9.7) > grid30/integer: the matrix against the references, the invariants, run twice bitwise, the snapshot unchanged",
                "[FAIL] Tests (the CI shards of the affected packages) failed",
            ],
            WS.packages.concat("webgpu-graph-algorithms"),
        );
        expect(g.shards).toEqual([{ shard: "webgpu-graph-algorithms-node", secs: 275 }]);
        expect(g.tests.map((t) => [t.file, t.package, t.shard])).toEqual([
            [
                "webgpu-graph-algorithms/test/noise-floor.test.ts",
                "webgpu-graph-algorithms",
                "webgpu-graph-algorithms-node",
            ],
            [
                "webgpu-graph-algorithms/test/algorithms/all-pairs.test.ts",
                "webgpu-graph-algorithms",
                "webgpu-graph-algorithms-node",
            ],
        ]);
    });

    it("reads a background step, a passed gate and GitHub's rejection", () => {
        const g = parseGate(
            [
                "[FAIL] SonarQube (changed lines) failed",
                "[FAIL] Screenshots: the capture failed or timed out (above; the log is x)",
                "All pre-push checks passed!",
                " ! [rejected]        HEAD -> fix/a (fetch first)",
            ],
            WS.packages,
        );
        expect(g.steps).toEqual(["SonarQube (changed lines)", "Screenshots"]);
        expect(g.passed && g.rejected).toBe(true);
    });
});

describe("causesOf", () => {
    const gate = parseGate(keptLines(FAILED_GATE), WS.packages);

    it("names the failing test, not the test step, related when the push changes the package or a dependency", () => {
        const one = (/** @type {string[] | null} */ changed) => causesOf(push({ gate, changed }), WS);
        expect(one(["graph-io/"])).toEqual([{ cause: OBO, kind: "test", package: "graph-io", related: true }]);
        expect(one(["graph-format/"])[0].related).toBe(true);
        // The lockfile and tools/ are no change of the test's own code: unrelated.
        expect(one(["graphty-element/", "pnpm-lock.yaml", "tools/"])[0].related).toBe(false);
        expect(one(null)[0].related).toBe(null);
    });

    it("falls back to the shard, then the step, then what the gate said", () => {
        const shardOnly = parseGate(["  [FAIL] graphty-element-browser-2 (exit 124, 1800s)"], WS.packages);
        expect(causesOf(push({ gate: shardOnly, changed: ["tools/"] }), WS)).toEqual([
            {
                cause: "shard graphty-element-browser-2 (no failing test named)",
                kind: "shard",
                package: "graphty-element",
                related: false,
            },
        ]);
        const steps = parseGate(
            ["[FAIL] Knip (dead code detection) failed", "[FAIL] Bundle size (graphty-element) failed"],
            WS.packages,
        );
        expect(
            causesOf(push({ gate: steps, changed: ["graphty-element/"] }), WS).map((c) => [c.cause, c.related]),
        ).toEqual([
            ["step Knip (dead code detection)", null],
            ["step Bundle size (graphty-element)", true],
        ]);
        const rejected = parseGate(["All pre-push checks passed!", " ! [rejected] x"], WS.packages);
        expect(causesOf(push({ gate: rejected }), WS)[0].cause).toBe("GitHub rejected the push after the gate passed");
        expect(causesOf(push({ gate: parseGate([], WS.packages) }), WS)[0].cause).toMatch(/^failed before the gate/);
        expect(causesOf(push({}), WS)[0].cause).toMatch(/^no gate output survived/);
        expect(causesOf(push({ exit: 0 }), WS)).toEqual([]);
    });
});

describe("readPushes and gateReport", () => {
    it("merges the backfill, times each push and charges a failure its gate plus the re-push's wait", () => {
        const dir = mkdtempSync(join(tmpdir(), "prepush-"));
        const line = (/** @type {any} */ o) => `${JSON.stringify(o)}\n`;
        const sha = (/** @type {string} */ c) => c.repeat(40);
        writeFileSync(
            join(dir, "push-log.jsonl"),
            [
                // Before the queue recorded timings: its gate output comes from the backfill.
                line({ at: "2026-10-06T09:00:00Z", branch: "fix/old", sha: sha("o"), exit: 1, cwd: "/w/old" }),
                // A failure (30 min wait, 60 min gate), then its re-push (90 min wait, passes).
                line({
                    at: "2026-10-07T11:30:00Z",
                    branch: "fix/a",
                    sha: sha("a"),
                    exit: 1,
                    cwd: "/w/a",
                    queuedAt: "2026-10-07T10:00:00Z",
                    startedAt: "2026-10-07T10:30:00Z",
                    gate: keptLines(FAILED_GATE),
                    changed: ["tools/"],
                }),
                "{torn\n",
                line({
                    at: "2026-10-07T14:00:00Z",
                    branch: "fix/a",
                    sha: sha("b"),
                    exit: 0,
                    cwd: "/w/a",
                    queuedAt: "2026-10-07T11:40:00Z",
                    startedAt: "2026-10-07T13:10:00Z",
                    gate: ["All pre-push checks passed!"],
                    changed: ["tools/"],
                }),
            ].join(""),
        );
        writeFileSync(
            join(dir, "push-log-backfill.jsonl"),
            line({
                key: `2026-10-06T09:00:00Z ${sha("o")}`,
                gate: ["[FAIL] Knip (dead code detection) failed"],
                elapsedMs: 1_800_000,
                changed: ["graph-io/"],
            }),
        );
        const pushes = readPushes(dir, WS.packages);
        expect(pushes.map((p) => [p.branch, p.waitMs, p.gateMs, p.elapsedMs])).toEqual([
            ["fix/old", null, null, 1_800_000],
            ["fix/a", 1_800_000, 3_600_000, null],
            ["fix/a", 5_400_000, 3_000_000, null],
        ]);
        const r = gateReport(pushes, WS);
        expect(r).toMatchObject({
            pushes: 3,
            failed: 2,
            timed: 2,
            costedFailures: 2,
            medianWaitMinutes: 60,
            medianGateMinutes: 55,
        });
        expect(r.days).toEqual([
            { day: "2026-10-06", pushes: 1, failed: 1 },
            { day: "2026-10-07", pushes: 2, failed: 1 },
        ]);
        // 60 min gate + the re-push's 90 min wait = 2.5 h; the backfilled push's own 30 min.
        expect(
            r.causes.map((/** @type {any} */ c) => [c.cause, c.unrelated, c.related, c.unknown, c.queueHours]),
        ).toEqual([
            [OBO, 1, 0, 0, 2.5],
            ["step Knip (dead code detection)", 0, 0, 1, 0.5],
        ]);
        const text = gateText(r);
        expect(text).toContain("3 pushes, 2 failed (67%); median queue wait 60 min, median gate 55 min");
        expect(text).toContain(`      2.5      1          1        0        0  ${OBO}`);
        expect(gateText(gateReport([], WS))).toMatch(/no push recorded/);
    });
});

describe("matchPush", () => {
    const log = [
        { at: "2026-10-07T10:05:00Z", branch: "fix/a", sha: "1", sessionId: "s1", cwd: "/w/a" },
        { at: "2026-10-07T10:06:00Z", branch: "fix/b", sha: "2", sessionId: "s2", cwd: "/w/b" },
        { at: "2026-10-07T10:30:00Z", branch: "fix/b", sha: "3", sessionId: "s2", cwd: "/w/b" },
    ];
    const run = (/** @type {any} */ over) => ({
        sessionId: "s2",
        cwd: "/w/b",
        command: "tmp/push-queue.sh git push origin HEAD",
        start: "2026-10-07T10:00:00Z",
        end: "2026-10-07T10:06:30Z",
        ...over,
    });

    it("takes the session's earliest push that ended after the command started, and each push once", () => {
        expect(matchPush(log, run({}), new Map())?.sha).toBe("2");
        expect(matchPush(log, run({}), new Map([["2026-10-07T10:06:00Z 2", {}]]))).toBeUndefined();
        expect(matchPush(log, run({ end: null }), new Map([["2026-10-07T10:06:00Z 2", {}]]))?.sha).toBe("3");
    });

    it("needs the branch or the directory, and refuses another session's push", () => {
        expect(matchPush(log, run({ cwd: "/elsewhere" }), new Map())).toBeUndefined();
        expect(
            matchPush(log, run({ cwd: "/elsewhere", command: "cd /w/b && tmp/push-queue.sh git push" }), new Map())
                ?.sha,
        ).toBe("2");
        expect(matchPush(log, run({ sessionId: "s9" }), new Map())).toBeUndefined();
    });
});
