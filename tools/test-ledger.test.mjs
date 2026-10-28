// Tests of tools/test-ledger.mjs in temporary directories: a throwaway git repository for golden's chain and a
// land commit, record files written the way the gate writes them, and the index rebuilt from them.
//
//   node tools/test-ledger.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";
import { mayExcuse } from "./prepush-tests.mjs";

const dir = mkdtempSync(join(tmpdir(), "test-ledger-"));
const ledgerHome = join(dir, "ledger");
process.env.TEST_LEDGER_DIR = ledgerHome;
const L = await import("./test-ledger.mjs");
const { importHistory } = await import("./test-ledger-import.mjs");
const env = { ...isolatedGitEnv(), TEST_LEDGER_DIR: ledgerHome };
after(() => rmSync(dir, { recursive: true, force: true }));

const repo = join(dir, "repo");
const git = (...args) => {
    const r = spawnSync("git", args, { cwd: repo, env, encoding: "utf8" });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
};
const commit = (file, text, msg = `change ${file}`) => {
    mkdirSync(join(repo, file, ".."), { recursive: true });
    writeFileSync(join(repo, file), text);
    git("add", ".");
    git("commit", "-q", "-m", msg);
    return git("rev-parse", "HEAD");
};
mkdirSync(repo);
git("init", "-q", "-b", "golden");
const g0 = commit("graphty/src/a.ts", "a");

const FILE = "graphty/src/a.test.ts";
const NAME = "panel > opens";
const failure = (text, file = FILE, name = NAME) => ({ file, name, ...L.failureHashes(text, file), message: text });
let seq = 1_800_000_000_000;
/**
 * A record as the gate writes it.
 * @param over the fields that differ
 * @returns the record, written
 */
const rec = (over) => {
    const id = `${seq++}-1-${over.shard ?? "graphty-2"}`;
    const r = {
        v: 1,
        id,
        kind: "verify",
        branch: "golden",
        commit: g0,
        tree: "t0",
        base: null,
        dirty: false,
        shard: "graphty-2",
        family: "graphty",
        variant: "graphty",
        selected: null,
        outcome: "failed",
        reused_from: null,
        started_at: new Date(seq).toISOString(),
        secs: 60,
        log: null,
        files: [[FILE, 3, 1, 0, 10, 0]],
        failures: [],
        exonerations: [],
        ...over,
    };
    L.writeRecord(ledgerHome, r);
    return r;
};
// A land check of a branch changing `file`: HEAD is the land commit, HEAD^1 golden's tip.
const landCheck = (file = "graphty/src/other.ts") => {
    const tip = git("rev-parse", "HEAD");
    const b = `b${seq++}`;
    git("update-ref", "refs/remotes/origin/golden", tip);
    git("checkout", "-q", "-b", b);
    commit(file, b);
    git("checkout", "-q", "golden");
    git("merge", "-q", "--no-ff", "-m", `land: ${b}`, b);
    const landed = git("rev-parse", "HEAD");
    return { landed, base: tip };
};

describe("parsing, outcomes and hashes", () => {
    const junit = `<?xml version="1.0" encoding="UTF-8" ?><testsuites name="vitest tests" tests="3">
    <testsuite name="test/a.test.ts"><testcase classname="test/a.test.ts" name="A &gt; works" time="0.5"></testcase>
        <testcase classname="test/a.test.ts" name="A &gt; breaks" time="0.25">
            <failure message="z.url is not a function" type="TypeError">TypeError: z.url is not a function
 ❯ src/config/common.ts:67:19
 ❯ test/a.test.ts:33:1</failure></testcase>
        <testcase classname="test/a.test.ts" name="A &gt; later" time="0"><skipped/></testcase></testsuite></testsuites>`;

    it("reads files and failures from Vitest's JUnit, and refuses what is not one", () => {
        const p = L.parseJunit(junit, "graphty-element");
        const f = p.files.get("graphty-element/test/a.test.ts");
        assert.deepEqual([f.passed, f.failed, f.skipped, f.ms, f.dup], [1, 1, 1, 750, 0]);
        assert.deepEqual(
            [p.failures[0].name, p.failures[0].text.split("\n")[0]],
            ["A > breaks", "TypeError: z.url is not a function"],
        );
        assert.throws(() => L.parseJunit("<html>", "x"));
    });

    it("keys keep numbers, signatures mask them and the checkout, timeouts are grouped by file", () => {
        const main = "/home/u/repo";
        const a = L.failureHashes(
            `expected 3 to be 4\n ❯ ${main}/.worktrees/land-check-2/graphty/a.ts:10:2`,
            "f",
            main,
        );
        const b = L.failureHashes(`expected 0 to be 4\n ❯ ${main}/graphty/a.ts:99:9`, "f", main);
        assert.notEqual(a.key, b.key);
        assert.equal(a.signature, b.signature);
        assert.equal(L.failureHashes("x /tmp/abc-123/y 1234abcd", "f").line, "x <tmp> <hex>");
        const t = L.failureHashes("Test timed out in 5000ms.", "f");
        assert.equal(t.status, "timeout");
        assert.equal(t.signature, L.failureHashes("Test timed out in 30000ms.", "f").signature);
        assert.equal(L.failureHashes('TestingLibraryElementError: Unable to find role="grid"', "f").status, "timeout");
    });

    it("keys a failure by what it says, past a bare error name and Storybook's debug link", () => {
        // Two failures of AllNodeShapes from the ledger: one key would let the second hide behind the first.
        const story = (n) =>
            `AssertionError: \nClick to debug the error directly in Storybook: https://localhost:6006/?path=/story/styles-node--all-node-shapes\n\nStyles/Node AllNodeShapes: the story promises ${n} different node shapes and the scene draws ${n - 1} distinct geometries\n ❯ src/x.ts:1:1`;
        const [a, b] = [L.failureHashes(story(43), "f"), L.failureHashes(story(51), "f")];
        assert.notEqual(a.key, b.key);
        assert.equal(a.signature, b.signature);
        assert.match(a.line, /^Styles\/Node AllNodeShapes: the story promises 43/);
        const play = "Error: \nClick to debug the error directly in Storybook: http://x\n\nTest timed out in 15000ms.";
        assert.equal(L.failureHashes(play, "f").status, "timeout");
    });

    it("tells failed from error, infra and unattributed", () => {
        const sum = " Test Files  1 failed | 2 passed (3)\n      Tests  1 failed | 9 passed (10)\n";
        const junitOf = (n) => ({ failures: Array.from({ length: n }), bad: false });
        assert.equal(L.outcomeOf({ code: 1, log: sum, junit: junitOf(1) }), "failed");
        assert.equal(L.outcomeOf({ code: 1, log: `${sum}      Errors  1 error\n`, junit: junitOf(1) }), "error");
        assert.equal(
            L.outcomeOf({ code: 1, log: `${sum}ERROR: Coverage for lines (79%)`, junit: junitOf(1) }),
            "error",
        );
        assert.equal(L.outcomeOf({ code: 1, log: sum, junit: junitOf(2) }), "error");
        // a file that failed as a whole (a setup hook timed out): vitest's Tests line counts no failed test (#3323)
        const bar = "⎯".repeat(6);
        const suites = `${bar} Failed Suites 2 ${bar}\n Test Files  2 failed | 31 passed (33)\n      Tests  184 passed (184)\n`;
        assert.equal(L.outcomeOf({ code: 1, log: suites, junit: junitOf(2) }), "failed");
        assert.equal(
            L.outcomeOf({ code: 1, log: `${bar} Failed Suites 1 ${bar}\n${sum}`, junit: junitOf(2) }),
            "failed",
        );
        assert.equal(L.outcomeOf({ code: 137, log: sum, junit: junitOf(1) }), "infra");
        assert.equal(L.outcomeOf({ code: 0, log: "no summary", junit: junitOf(0) }), "infra");
        assert.equal(L.outcomeOf({ code: 0, log: sum, junit: null }), "unattributed");
        assert.equal(L.outcomeOf({ code: 0, log: sum, junit: junitOf(0) }), "passed");
    });

    it("records a run from the JUnit files carrying its run id, and deletes them", () => {
        const id = L.newRunId("graphty-element-default");
        mkdirSync(join(repo, "test-results"), { recursive: true });
        writeFileSync(join(repo, "test-results", `junit-graphty-element-${id}-77.xml`), junit);
        writeFileSync(join(repo, "test-results", "junit-graphty-element-99.xml"), junit);
        const log = " Test Files  1 failed (1)\n      Tests  1 failed | 1 passed (3)\n";
        const r = L.record({ shard: "graphty-element-default", code: 1, log, root: repo, runId: id, env });
        assert.equal(r.outcome, "failed");
        assert.equal(r.failures[0].file, "graphty-element/test/a.test.ts");
        assert.deepEqual(readdirSync(join(repo, "test-results")), ["junit-graphty-element-99.xml"]);
        assert.equal(L.readRecord(ledgerHome, id).failures.length, 1);
        rmSync(join(repo, "test-results"), { recursive: true });
    });
});

describe("exoneration of a failure golden's tip has too", () => {
    const text = "AssertionError: expected 3 to be 4\n ❯ graphty/src/a.test.ts:9:1";
    let n = 100;
    // each case its own test file, so no case's evidence is another's
    const fresh = () => {
        const file = `graphty/src/t${n++}.test.ts`;
        return { file, fl: failure(text, file) };
    };
    const gh = () => "https://github.com/o/r/issues/42";
    // A re-run on golden's tip that answers with `answers` in turn (a list of failures, or null for a pass).
    const reruns = (...answers) => {
        const calls = [];
        const rerun = async (base, files) => {
            calls.push({ base, files });
            const fails = answers[calls.length - 1] ?? null;
            return rec({ kind: "base", commit: base, outcome: fails ? "failed" : "passed", failures: fails ?? [] });
        };
        return { rerun, calls };
    };
    const excused = async (r, rerun) => (await L.exonerate(r, repo, { env, rerun, gh })).map((e) => e.reason);
    const landed = (fl, file, changes) => {
        const { landed: c, base } = landCheck(changes);
        return {
            base,
            r: rec({ kind: "land-check", commit: c, base, files: [[file, 3, 1, 0, 1, 0]], failures: [fl] }),
        };
    };

    it("excuses a test that fails the same way when re-run on golden's tip, and files its issue", async () => {
        const { file, fl } = fresh();
        const { base, r } = landed(fl, file);
        const { rerun, calls } = reruns([fl]);
        const out = await L.exonerate(r, repo, { env, rerun, gh });
        assert.deepEqual(calls, [{ base, files: [file] }]);
        assert.deepEqual(
            out.map((e) => [e.reason, e.commit, e.issue]),
            [["fails-on-golden", base, 42]],
        );
        assert.match(
            L.knownLines({ ...r, exonerations: out })[0],
            /\[KNOWN\] graphty-2: graphty\/src\/t\d+\.test\.ts > panel > opens fails the same way on golden's tip .* issue #42/,
        );
    });

    it("takes golden's own failing run of exactly that commit as the answer, with no re-run", async () => {
        const { file, fl } = fresh();
        const { landed: c, base } = landCheck();
        rec({ kind: "verify", commit: base, files: [[file, 3, 1, 0, 1, 0]], failures: [fl] });
        L.rebuild(env, repo);
        const r = rec({ kind: "land-check", commit: c, base, files: [[file, 3, 1, 0, 1, 0]], failures: [fl] });
        const { rerun, calls } = reruns();
        assert.deepEqual(await excused(r, rerun), ["fails-on-golden"]);
        assert.equal(calls.length, 0);
    });

    it("never excuses another key, a test golden's tip passes twice, a changed file, a duplicated name, or no answer", async () => {
        const other = (fl) => ({ ...fl, ...L.failureHashes("AssertionError: expected 0 to be 4", fl.file) });
        for (const [what, answers, changes, dup = 0] of [
            ["another key", (fl) => [[other(fl)], [other(fl)]]],
            ["passes twice", () => [null, null]],
            ["a changed file", (fl) => [[fl]], true],
            ["a duplicated name", (fl) => [[fl]], false, 1],
        ]) {
            const { file, fl } = fresh();
            const { landed: c, base } = landCheck(changes ? file : undefined);
            const r = rec({ kind: "land-check", commit: c, base, files: [[file, 3, 1, 0, 1, dup]], failures: [fl] });
            const { rerun, calls } = reruns(...answers(fl));
            assert.deepEqual(await excused(r, rerun), [], what);
            assert.equal(calls.length, changes || dup ? 0 : 2, what);
        }
        const { file, fl } = fresh();
        const { r } = landed(fl, file);
        assert.deepEqual(await excused(r, async () => null), [], "the re-run could not run");
    });

    it("excuses an expired wait that golden's tip fails in either of two tries, but not the other way round", async () => {
        const wait = (fl) => ({ ...fl, ...L.failureHashes("Error: Test timed out in 5000ms.", fl.file) });
        let { file, fl } = fresh();
        let { r } = landed(wait(fl), file);
        assert.deepEqual(await excused(r, reruns(null, [fl]).rerun), ["fails-on-golden"]);
        ({ file, fl } = fresh());
        ({ r } = landed(fl, file));
        assert.deepEqual(await excused(r, reruns([wait(fl)], [wait(fl)]).rerun), []);
    });

    it("asks golden's tip below every landing of a group, so an earlier branch of the group is not excused", () => {
        const tip = git("rev-parse", "HEAD");
        landCheck();
        landCheck();
        git("update-ref", "refs/remotes/origin/golden", tip);
        assert.equal(L.goldenTip(repo), tip);
    });

    it("is allowed only in a land check, never in verification, strict mode, the cut or master", () => {
        assert.equal(mayExcuse({ TEST_LEDGER_KIND: "land-check", PREPUSH_SELECT_BASE: "origin/golden" }), true);
        assert.equal(mayExcuse({ TEST_LEDGER_KIND: "push" }), false);
        assert.equal(mayExcuse({ TEST_LEDGER_KIND: "land-check", PREPUSH_ALL: "1" }), false);
        assert.equal(mayExcuse({ TEST_LEDGER_KIND: "land-check", PREPUSH_EXONERATE: "0" }), false);
        assert.equal(mayExcuse({ TEST_LEDGER_KIND: "land-check", PREPUSH_SELECT_BASE: "origin/golden-cut" }), false);
    });
});

describe("the 2026-10-22 replay", () => {
    it("reads that day's waits as timeouts, and excuses at least the runs whose tests golden failed the same way", () => {
        // Each failing run of the day as a land check, with golden's tip assumed to fail each test as it last failed
        // there: a lower bound, since the re-run asks golden's tip itself, under the same load.
        const runs = JSON.parse(readFileSync(new URL("./test-ledger.replay-2026-10-22.json", import.meta.url), "utf8"));
        const last = new Map();
        let excusedRuns = 0;
        let waits = 0;
        let failures = 0;
        for (const run of runs) {
            const fs = run.failures.map(([file, name, , , line]) => ({ file, name, ...L.failureHashes(line, file) }));
            failures += fs.length;
            waits += fs.filter((f) => f.status === "timeout").length;
            const same = (f) =>
                last.get(`${f.file}>${f.name}`) &&
                (last.get(`${f.file}>${f.name}`).key === f.key || f.status === "timeout");
            if (fs.every(same)) excusedRuns++;
            fs.forEach((f) => last.set(`${f.file}>${f.name}`, f));
        }
        assert.deepEqual([runs.length, failures, waits], [18, 23, 14]);
        assert.equal(excusedRuns, 3); // KeyboardStopsEscape twice, GraphPlace once; the rest were other tests each time
    });
});

describe("flaky, broken and the flaky bisect", () => {
    const t = (n) => ({ file: `graphty/src/f${n}.test.ts`, name: "x" });
    const verdicts = (test, list, variant = "graphty") => {
        for (const [tree, failed, c = g0] of list) {
            const fl = failure("Error: boom", test.file, test.name);
            rec({
                tree,
                commit: c,
                variant,
                outcome: failed ? "failed" : "passed",
                files: [[test.file, 1, failed ? 1 : 0, 0, 1, 0]],
                failures: failed ? [fl] : [],
            });
        }
    };
    const classify = (test, variant = "graphty") => {
        const l = L.openLedger(env, repo);
        const c = L.classify(l.db, test.file, test.name, variant, [g0]);
        l.db.close();
        return c;
    };

    it("proves flaky only by two runs of one tree in the same variant", () => {
        verdicts(t(1), [
            ["a", true],
            ["a", false],
            ["b", true],
            ["b", false],
            ["c", false],
        ]);
        assert.deepEqual([classify(t(1)).proofs, classify(t(1)).flaky], [2, true]);
        verdicts(t(2), [
            ["a", true],
            ["b", true],
        ]);
        verdicts(
            t(2),
            [
                ["a", false],
                ["b", false],
            ],
            "graphty+files",
        );
        assert.equal(classify(t(2)).flaky, false);
    });

    it("calls a test broken from 4 golden verdicts, 80% failing", () => {
        verdicts(t(3), [
            ["a", true],
            ["b", true],
            ["c", true],
            ["d", false],
        ]);
        assert.equal(classify(t(3)).broken, false);
        verdicts(t(3), [["e", true]]);
        assert.equal(classify(t(3)).broken, true);
    });

    it("sets the bad threshold of a flaky test from its old rate", () => {
        assert.equal(L.badThreshold(0.02), 2);
        assert.equal(L.badThreshold(0), 1);
        assert.ok(L.badThreshold(0.3) > 4);
    });

    it("counts a reused pass once, not once per copy, and a file's usual skip as no skip", () => {
        const test = t(4);
        verdicts(test, [
            ["r", true],
            ["s", true],
        ]);
        const pass = rec({ tree: "p", outcome: "passed", files: [[test.file, 1, 0, 0, 1, 0]] });
        for (let i = 0; i < 5; i++) rec({ tree: "p", outcome: "passed", reused_from: pass.id, files: pass.files });
        assert.deepEqual([classify(test).verdicts, classify(test).fails], [3, 2]);
        // a file that always skips one test still passes the others
        const skips = t(5);
        for (const [tree, failed] of [
            ["u", true],
            ["v", false],
            ["w", false],
        ]) {
            const fl = failure("Error: boom", skips.file, skips.name);
            const files = [[skips.file, 2, failed ? 1 : 0, 1, 1, 0]];
            rec({ tree, outcome: failed ? "failed" : "passed", files, failures: failed ? [fl] : [] });
        }
        assert.deepEqual([classify(skips).verdicts, classify(skips).broken], [3, false]);
    });

    it("never needs more bad runs than it makes", () => {
        assert.equal(L.badThreshold(0.9), 10);
    });
});

describe("storage", () => {
    it("files one issue per signature however many verifications ask, and retries a failed filing", () => {
        const calls = [];
        const gh = (args) => (calls.push(args), "https://github.com/o/r/issues/77");
        const fl = [{ ...failure("Error: once", "graphty/src/i.test.ts"), file: "graphty/src/i.test.ts" }];
        const broken = () => {
            throw new Error("offline");
        };
        assert.deepEqual(L.fileIssues(ledgerHome, fl, { commit: g0, log: "l" }, broken), {});
        assert.deepEqual(L.fileIssues(ledgerHome, fl, { commit: g0, log: "l" }, gh), { [fl[0].signature]: 77 });
        L.fileIssues(ledgerHome, fl, { commit: g0, log: "l" }, gh);
        assert.equal(calls.length, 1);
        // a claim another live process made a minute ago is its to file
        const other = [{ ...failure("Error: twice", "graphty/src/j.test.ts"), file: "graphty/src/j.test.ts" }];
        const claim = {
            signature: other[0].signature,
            issue: 0,
            opened_at: new Date().toISOString(),
            pid: process.ppid,
        };
        writeFileSync(join(ledgerHome, "issues", `${other[0].signature}.json`), JSON.stringify(claim));
        assert.deepEqual(L.fileIssues(ledgerHome, other, { commit: g0, log: "l" }, gh), {});
        assert.equal(calls.length, 1);
        assert.match(calls[0].join(" "), /Failing on golden: Error: once .*priority:high.*test-ledger signature=/s);
    });

    it("loses no record when two processes record 200 runs each while reading", async () => {
        const template = {
            kind: "push",
            branch: null,
            commit: "c",
            tree: "t",
            base: null,
            dirty: false,
            shard: "x",
            family: "x",
        };
        Object.assign(template, {
            variant: "x",
            selected: null,
            outcome: "passed",
            reused_from: null,
            started_at: "2030",
        });
        Object.assign(template, { secs: 1, log: null, files: [], failures: [], exonerations: [] });
        const child = (tag) =>
            new Promise((resolve) => {
                const code = `const L = await import(${JSON.stringify(new URL("./test-ledger.mjs", import.meta.url).href)});
                    for (let i = 0; i < 200; i++) { L.writeRecord(process.env.TEST_LEDGER_DIR, { ...${JSON.stringify(template)}, id: (1900000000000 + i) + "-${tag}-x" });
                    if (i % 25 === 0) L.openLedger(process.env, ${JSON.stringify(repo)}).db?.close(); }`;
                const p = spawn(process.execPath, ["--input-type=module", "-e", code], { env });
                let err = "";
                p.stderr.on("data", (d) => (err += d));
                p.on("close", (c) => resolve({ c, err }));
            });
        const out = await Promise.all([child("1"), child("2")]);
        assert.deepEqual(out, [
            { c: 0, err: "" },
            { c: 0, err: "" },
        ]); // and no ExperimentalWarning on stderr
        const l = L.openLedger(env, repo);
        assert.equal(l.db.prepare("SELECT COUNT(*) n FROM invocation WHERE shard = 'x'").get().n, 400);
        l.db.close();
    });

    it("imports kept gate logs and passes, a pass learning its files from a failed run of its tree", async () => {
        const main = join(dir, "main");
        mkdirSync(join(main, "tmp/prepush-passes/shard"), { recursive: true });
        mkdirSync(join(main, "tools"), { recursive: true });
        writeFileSync(
            join(main, "tools/ci-test-matrix.mjs"),
            'export const SHARDS = [{ shard: "graphty-3", package: "graphty", "test-command": "vitest" }];',
        );
        const kept = join(main, "kept.log");
        writeFileSync(
            kept,
            '==> graphty-3: vitest\n ✓ |b| src/ok.test.ts (2 tests) 5ms\n ❯ |b| src/a.test.tsx (2 tests | 1 failed) 9ms\n⎯⎯⎯ Failed Tests 1 ⎯⎯⎯\n\n FAIL  |b| src/a.test.tsx > t > fails\nTestingLibraryElementError: Unable to find role="grid"\n\n Test Files  1 failed | 1 passed (2)\n      Tests  1 failed | 3 passed (4)\n',
        );
        const entry = {
            at: "2026-10-23T03:47:52Z",
            sha: g0,
            branch: "golden-verified",
            cwd: "/x/.worktrees/golden-verify-cut",
            gate: [`  [FAIL] graphty-3: its whole log is kept in ${kept}`],
        };
        writeFileSync(join(main, "tmp/push-log.jsonl"), `${JSON.stringify(entry)}\nnot json\n`);
        writeFileSync(
            join(main, "tmp/prepush-passes/shard/k.json"),
            JSON.stringify({ shard: "graphty-3", branch: null, sha: g0, at: "2026-10-23T05:00:00Z" }),
        );
        const home = join(dir, "imported");
        assert.deepEqual(await importHistory(main, { TEST_LEDGER_DIR: home }), {
            invocations: 2,
            failed: 1,
            results: 8,
            failures: 1,
        });
        L.rebuild({ TEST_LEDGER_DIR: home }, repo);
        const l = L.openLedger({ TEST_LEDGER_DIR: home }, repo);
        const c = L.classify(l.db, "graphty/src/a.test.tsx", "t > fails", "graphty", []);
        assert.deepEqual([c.verdicts, c.fails, c.proofs], [2, 1, 1]);
        l.db.close();
        assert.ok(existsSync(join(home, "CURRENT")));
    });
});
