// Tests of tools/vitest-time-budget.mjs, the reporter that fails a run for any passing test that used
// more than a quarter of its time limit: which tests it judges and how, what it prints, and -- in a real
// vitest run -- that it reads the per-test and project limits and really fails the process.
//
//   node --test tools/vitest-time-budget.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { BUDGET, enabled, format, judge } from "./vitest-time-budget.mjs";

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
    it("passes a test within budget, the boundary included", () => {
        assert.deepEqual(judge([test({ duration: BUDGET * 1000 })], []), { over: [], removable: [] });
    });

    it("reports a test over budget with its ratio", () => {
        const { over } = judge([test({ duration: 400 })], []);
        assert.equal(over.length, 1);
        assert.equal(over[0].ratio, 0.4);
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
        assert.deepEqual(judge(tests, []), { over: [], removable: [] });
    });

    it("lets an allowlisted test over budget through, and reports one under budget as removable", () => {
        const listed = [{ file: "pkg/test/a.test.ts", name: "suite > case" }];
        assert.deepEqual(judge([test({ duration: 900 })], listed), { over: [], removable: [] });
        const { over, removable } = judge([test({ duration: 10 })], listed);
        assert.equal(over.length, 0);
        assert.equal(removable.length, 1);
    });

    it("matches the allowlist by file and full name together", () => {
        const listed = [{ file: "pkg/test/other.test.ts", name: "suite > case" }];
        assert.equal(judge([test({ duration: 900 })], listed).over.length, 1);
    });
});

describe("format", () => {
    it("says nothing when nothing is over budget or removable", () => {
        assert.equal(format({ over: [], removable: [] }), "");
    });

    it("names the test, its duration, limit and ratio, and what to do", () => {
        const text = format(judge([test({ duration: 30000, limit: 60000 })], []));
        assert.match(text, /pkg\/test\/a\.test\.ts > suite > case \[default\]/);
        assert.match(text, /took 30\.00 s of its 60\.00 s limit \(50%, budget 25%\)/);
        assert.match(text, /Cut the test's work/);
        assert.match(text, /split it/);
        assert.match(text, /Do not raise its\s+timeout/);
    });

    it("tells the reader to remove an allowlisted test that is now within budget", () => {
        const listed = [{ file: "pkg/test/a.test.ts", name: "suite > case" }];
        assert.match(format(judge([test()], listed)), /remove them from\s+tools\/vitest-time-budget-allowlist\.json/);
    });
});

describe("in a vitest run", () => {
    // One file: "slow" sleeps 400 ms under its own 1 s timeout (40%); "steady" sleeps the same under the
    // project's 60 s testTimeout (under 1%), so the reporter must read the per-test limit over the project's.
    function run(allowlist, env) {
        const dir = mkdtempSync(join(tmpdir(), "time-budget-"));
        const sleep = "await new Promise((r) => setTimeout(r, 400));";
        writeFileSync(
            join(dir, "a.test.js"),
            `test("slow", async () => { ${sleep} }, 1000);\ntest("steady", async () => { ${sleep} });\n`,
        );
        writeFileSync(join(dir, "allowlist.json"), JSON.stringify({ tests: allowlist }));
        const options = JSON.stringify({ allowlist: join(dir, "allowlist.json"), root: dir });
        writeFileSync(
            join(dir, "vitest.config.mjs"),
            `export default { test: { globals: true, include: ["*.test.js"], testTimeout: 60000, ` +
                `reporters: ["default", [${JSON.stringify(REPORTER)}, ${options}]] } };\n`,
        );
        const result = spawnSync(process.execPath, [VITEST, "run"], {
            cwd: dir,
            encoding: "utf8",
            env: { ...process.env, VITEST_BUDGET_CHECK: "", GRAPHTY_TEST_SLOTS: "0", ...env },
        });
        return { status: result.status, output: result.stdout + result.stderr };
    }

    it("fails the process for a test over budget, naming only that test", () => {
        const { status, output } = run([], { VITEST_BUDGET_CHECK: "1" });
        assert.equal(status, 1, output);
        assert.match(output, /a\.test\.js > slow/);
        assert.doesNotMatch(output, /a\.test\.js > steady/);
        assert.match(output, /of its 1\.00 s limit/);
    });

    it("passes when the test over budget is allowlisted, and reports a listed test within budget", () => {
        const listed = [
            { file: "a.test.js", name: "slow" },
            { file: "a.test.js", name: "steady" },
        ];
        const { status, output } = run(listed, { VITEST_BUDGET_CHECK: "1" });
        assert.equal(status, 0, output);
        assert.match(output, /1 allowlisted test\(s\) now run within budget/);
        assert.match(output, /a\.test\.js > steady/);
    });

    it("does nothing when the check is off", () => {
        const { status, output } = run([], {});
        assert.equal(status, 0, output);
        assert.doesNotMatch(output, /\[time-budget\]/);
    });
});
