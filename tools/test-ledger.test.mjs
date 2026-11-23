// Tests of tools/test-ledger.mjs in temporary directories: a throwaway git repository, record files written the
// way a test run writes them, and the index rebuilt from them.
//
//   node tools/test-ledger.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";

const dir = mkdtempSync(join(tmpdir(), "test-ledger-"));
const ledgerHome = join(dir, "ledger");
process.env.TEST_LEDGER_DIR = ledgerHome;
const L = await import("./test-ledger.mjs");
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
git("init", "-q", "-b", "master");
const g0 = commit("graphty/src/a.ts", "a");
L.rebuild(env, repo);

const FILE = "graphty/src/a.test.ts";
const NAME = "panel > opens";
const failure = (text, file = FILE, name = NAME) => ({ file, name, ...L.failureHashes(text, file), message: text });
let seq = 1_800_000_000_000;
/**
 * A record as a test run writes it.
 * @param over the fields that differ
 * @returns the record, written
 */
const rec = (over) => {
    const id = `${seq++}-1-${over.shard ?? "graphty-2"}`;
    const r = {
        v: 1,
        id,
        kind: "verify",
        branch: "master",
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

describe("flaky", () => {
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
        const c = L.classify(l.db, test.file, test.name, variant);
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
        assert.equal(classify(skips).verdicts, 3);
    });
});

describe("storage", () => {
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
});
