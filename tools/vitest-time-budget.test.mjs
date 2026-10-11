// Tests of tools/vitest-time-budget.mjs, the reporter that warns about a passing test that used more than
// a quarter of its time limit and fails a pull request's run for one, in a file the pull request changed,
// that used more than half: which tests it judges and how, what it prints, and -- in a real vitest run in
// a real git repository -- that it reads the per-test and project limits and the changed files, warns
// without failing, and really fails the process.
//
//   node --test tools/vitest-time-budget.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { isolatedGitEnv } from "./isolated-git-env.mjs";
import { annotations, changedFiles, enabled, FAIL_RATIO, format, judge, WARN_RATIO } from "./vitest-time-budget.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPORTER = join(ROOT, "tools/vitest-time-budget.mjs");
const VITEST = join(ROOT, "node_modules/vitest/vitest.mjs");

const test = (over) => ({
    file: "pkg/test/a.test.ts",
    name: "suite > case",
    project: "default",
    state: "passed",
    duration: 100,
    limit: 1000,
    ...over,
});

describe("enabled", () => {
    it("is on only with VITEST_BUDGET_CHECK=1", () => {
        assert.equal(enabled({ VITEST_BUDGET_CHECK: "1" }), true);
        assert.equal(enabled({ VITEST_BUDGET_CHECK: "0" }), false);
        assert.equal(enabled({ CI: "true", GITHUB_ACTIONS: "true" }), false);
    });
});

describe("judge", () => {
    const none = { fail: [], warn: [], removable: [] };
    const changed = new Set(["pkg/test/a.test.ts"]);

    it("says nothing about a test at or under the warn line", () => {
        assert.deepEqual(judge([test({ duration: WARN_RATIO * 1000 })], []), none);
    });

    it("warns, without failing, about a test between the warn and fail lines, the fail line included", () => {
        const { fail, warn } = judge([test({ duration: 400 }), test({ duration: FAIL_RATIO * 1000 })], [], changed);
        assert.equal(fail.length, 0);
        assert.deepEqual(
            warn.map((t) => t.ratio),
            [0.4, 0.5],
        );
    });

    it("fails a test over the fail line in a changed file, and does not also warn about it", () => {
        const { fail, warn } = judge([test({ duration: 600 })], [], changed);
        assert.equal(fail.length, 1);
        assert.equal(fail[0].ratio, 0.6);
        assert.equal(warn.length, 0);
    });

    it("only warns about a test over the fail line in a file the pull request did not change", () => {
        const { fail, warn } = judge([test({ file: "pkg/test/b.test.ts", duration: 600 })], [], changed);
        assert.equal(fail.length, 0);
        assert.equal(warn.length, 1);
    });

    it("only warns about a test over the fail line when the run is not a pull request's (no changed files)", () => {
        const { fail, warn } = judge([test({ duration: 600 })], []);
        assert.equal(fail.length, 0);
        assert.equal(warn.length, 1);
    });

    it("skips tests that did not pass, tests with no limit, and timing projects", () => {
        const slow = { duration: 900 };
        const tests = [
            test({ ...slow, state: "failed" }),
            test({ ...slow, state: "skipped" }),
            test({ ...slow, limit: 0 }),
            test({ ...slow, project: "bench" }),
            test({ ...slow, project: "browser-bench" }),
            test({ ...slow, project: "llm-regression" }),
            test({ ...slow, file: "pkg/test/x.bench.test.ts" }),
        ];
        assert.deepEqual(judge(tests, [], changed), none);
    });

    it("only warns about an allowlisted test over the fail line in a changed file, and reports one under it as removable", () => {
        const listed = [{ file: "pkg/test/a.test.ts", name: "suite > case" }];
        const over = judge([test({ duration: 900 })], listed, changed);
        assert.equal(over.fail.length, 0);
        assert.equal(over.warn.length, 1);
        assert.equal(over.removable.length, 0);
        const under = judge([test({ duration: 400 })], listed, changed);
        assert.equal(under.fail.length, 0);
        assert.equal(under.removable.length, 1);
    });

    it("matches the allowlist by file and full name together", () => {
        const listed = [{ file: "pkg/test/other.test.ts", name: "suite > case" }];
        assert.equal(judge([test({ duration: 900 })], listed, changed).fail.length, 1);
    });
});

describe("format", () => {
    it("says nothing when nothing is over a line or removable", () => {
        assert.equal(format({ fail: [], warn: [], removable: [] }), "");
    });

    it("names a failing test, its duration, limit and ratio, and what to do", () => {
        const text = format(judge([test({ duration: 36000, limit: 60000 })], [], new Set(["pkg/test/a.test.ts"])));
        assert.match(text, /pkg\/test\/a\.test\.ts > suite > case \[default\]/);
        assert.match(text, /took 36\.00 s of its 60\.00 s limit \(60%; warn 25%, fail 50%\)/);
        assert.match(text, /which fails the run/);
        assert.match(text, /Cut the test's work/);
        assert.match(text, /split it/);
        assert.match(text, /add it to tools\/vitest-time-budget-allowlist\.json with the issue/);
        assert.match(text, /Do not raise its timeout/);
    });

    it("labels a test between the lines as a warning", () => {
        const text = format(judge([test({ duration: 400 })], []));
        assert.match(text, /\[time-budget\] warning: 1 test\(s\) used more than 25%/);
        assert.doesNotMatch(text, /fails the run:/);
    });

    it("tells the reader to remove an allowlisted test that is now under the fail line", () => {
        const listed = [{ file: "pkg/test/a.test.ts", name: "suite > case" }];
        assert.match(format(judge([test()], listed)), /remove them from\s+tools\/vitest-time-budget-allowlist\.json/);
    });
});

describe("annotations", () => {
    it("emits an error for a failing test and a warning for one between the lines, on one line each", () => {
        const lines = annotations(
            judge(
                [test({ duration: 600 }), test({ file: "pkg/test/b.test.ts", name: "50%\nnext", duration: 400 })],
                [],
                new Set(["pkg/test/a.test.ts", "pkg/test/b.test.ts"]),
            ),
        );
        assert.deepEqual(lines, [
            "::error file=pkg/test/a.test.ts,title=time budget::suite > case took 0.60 s of its 1.00 s limit (60%25)",
            "::warning file=pkg/test/b.test.ts,title=time budget::50%25%0Anext took 0.40 s of its 1.00 s limit (40%25)",
        ]);
    });
});

const GIT_ENV = isolatedGitEnv();
function git(dir, ...args) {
    const result = spawnSync("git", args, {
        cwd: dir,
        encoding: "utf8",
        env: GIT_ENV,
    });
    assert.equal(result.status, 0, result.stderr);
}

describe("changedFiles", () => {
    it("names the files changed since the base, and is null with no base or a base git cannot resolve", () => {
        const dir = mkdtempSync(join(tmpdir(), "time-budget-"));
        git(dir, "init", "-q");
        writeFileSync(join(dir, "old.test.js"), "");
        git(dir, "add", ".");
        git(dir, "commit", "-q", "-m", "base");
        git(dir, "tag", "base");
        writeFileSync(join(dir, "new.test.js"), "");
        git(dir, "add", ".");
        git(dir, "commit", "-q", "-m", "change");
        assert.deepEqual([...changedFiles("base", dir)], ["new.test.js"]);
        assert.equal(changedFiles("", dir), null);
        assert.equal(changedFiles("no-such-ref", dir), null);
    });
});

describe("in a vitest run", () => {
    // One file in a git repository whose tag "base" stands for the branch a pull request merges into:
    // "slow" sleeps 400 ms under its own 1 s timeout (40%: warns); "slower" sleeps 800 ms under its own
    // 1.2 s timeout (67%: fails when the file changed since base); "steady" sleeps 400 ms under the
    // project's 60 s testTimeout (under 1%), so the reporter must read the per-test limit over the
    // project's. With changed false the test file is already in base, so the pull request did not change it.
    function run(allowlist, env, { slower = true, changed = true } = {}) {
        const dir = mkdtempSync(join(tmpdir(), "time-budget-"));
        const sleep400 = "await new Promise((r) => setTimeout(r, 400));";
        const sleep800 = "await new Promise((r) => setTimeout(r, 800));";
        const writeTest = () =>
            writeFileSync(
                join(dir, "a.test.js"),
                `test("slow", async () => { ${sleep400} }, 1000);\n` +
                    (slower ? `test("slower", async () => { ${sleep800} }, 1200);\n` : "") +
                    `test("steady", async () => { ${sleep400} });\n`,
            );
        writeFileSync(join(dir, "allowlist.json"), JSON.stringify({ tests: allowlist }));
        const options = JSON.stringify({ allowlist: join(dir, "allowlist.json"), root: dir });
        writeFileSync(
            join(dir, "vitest.config.mjs"),
            `export default { test: { globals: true, include: ["*.test.js"], testTimeout: 60000, ` +
                `reporters: ["default", [${JSON.stringify(REPORTER)}, ${options}]] } };\n`,
        );
        git(dir, "init", "-q");
        if (!changed) {
            writeTest();
        }
        git(dir, "add", ".");
        git(dir, "commit", "-q", "-m", "base");
        git(dir, "tag", "base");
        if (changed) {
            writeTest();
            git(dir, "add", ".");
        }
        git(dir, "commit", "-q", "--allow-empty", "-m", "the pull request");
        const result = spawnSync(process.execPath, [VITEST, "run"], {
            cwd: dir,
            encoding: "utf8",
            env: {
                ...GIT_ENV,
                VITEST_BUDGET_CHECK: "",
                VITEST_BUDGET_BASE: "",
                GITHUB_ACTIONS: "",
                GRAPHTY_TEST_SLOTS: "0",
                ...env,
            },
        });
        return { status: result.status, output: result.stdout + result.stderr };
    }

    const pr = { VITEST_BUDGET_CHECK: "1", VITEST_BUDGET_BASE: "base" };

    it("warns without failing for a test between the lines, with an annotation in GitHub Actions", () => {
        const { status, output } = run([], { ...pr, GITHUB_ACTIONS: "true" }, { slower: false });
        assert.equal(status, 0, output);
        assert.match(output, /\[time-budget\] warning: 1 test/);
        assert.match(output, /a\.test\.js > slow/);
        assert.doesNotMatch(output, /a\.test\.js > steady/);
        assert.match(output, /of its 1\.00 s limit/);
        assert.match(output, /::warning file=a\.test\.js,title=time budget::slow took/);
    });

    it("fails the process for a test over the fail line in a file the pull request changed, naming it", () => {
        const { status, output } = run([], pr);
        assert.equal(status, 1, output);
        assert.match(
            output,
            /1 test\(s\) in files this pull request changed used more than 50% of their time limit, which fails the run:\n {2}a\.test\.js > slower/,
        );
        assert.match(output, /of its 1\.20 s limit/);
        assert.doesNotMatch(output, /::(error|warning)/);
    });

    it("only warns for a test over the fail line in a file the pull request did not change", () => {
        const { status, output } = run([], pr, { changed: false });
        assert.equal(status, 0, output);
        assert.match(output, /\[time-budget\] warning: 2 test/);
        assert.match(output, /a\.test\.js > slower/);
    });

    it("only warns for a test over the fail line when there is no base, or git cannot resolve it", () => {
        for (const base of ["", "no-such-ref"]) {
            const { status, output } = run([], { ...pr, VITEST_BUDGET_BASE: base });
            assert.equal(status, 0, output);
            assert.match(output, /\[time-budget\] warning: 2 test/);
        }
    });

    it("passes when the changed file's test over the fail line is allowlisted, and reports a listed test under it", () => {
        const listed = [
            { file: "a.test.js", name: "slower" },
            { file: "a.test.js", name: "steady" },
        ];
        const { status, output } = run(listed, pr);
        assert.equal(status, 0, output);
        assert.match(output, /1 allowlisted test\(s\) now run under 50% of their limit/);
        assert.match(output, /a\.test\.js > steady/);
    });

    it("does nothing when the check is off", () => {
        const { status, output } = run([], { VITEST_BUDGET_BASE: "base" });
        assert.equal(status, 0, output);
        assert.doesNotMatch(output, /\[time-budget\]/);
    });
});
