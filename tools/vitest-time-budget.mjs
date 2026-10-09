// vitest-time-budget.mjs -- a Vitest reporter that fails the run when a passing test used more than
// a quarter of its time limit.
//
// A test whose cost creeps toward its limit passes until the day its machine is busy, then fails as
// a "flake". This reporter reports the creep while the test still passes: for each passed test it
// compares the duration with the test's effective limit (its own timeout if it sets one, otherwise
// the project's testTimeout, otherwise Vitest's default -- Vitest resolves all three into the test's
// `timeout` option) and fails the run for any test over BUDGET of it. A quarter leaves the 4x headroom
// four test runs sharing one machine need.
//
// On when VITEST_BUDGET_CHECK=1: ci.yml's test job sets it, and a local run can set it to check before
// pushing. Off otherwise, the pre-push gate included (it shares the machine with other runs, so its
// durations measure the machine). Every package's vitest config adds it through ciReporters()
// (vitest.ci-junit.mjs); a shard command that passes its own --reporter flags names it too
// (tools/ci-test-matrix.mjs).
//
// Not checked: tests that did not pass (a timeout already fails), tests with no limit (timeout 0),
// and the timing projects that gate nothing (bench projects, *.bench.test.ts, llm-regression).
//
// tools/vitest-time-budget-allowlist.json lists the tests over budget when the reporter landed, each
// with the issue that tracks cutting it. A listed test does not fail the run; a listed test that comes
// in under budget is reported as removable. The list only shrinks: never add a test to it, and never
// raise a timeout to get under budget.
//
//   node --test tools/vitest-time-budget.test.mjs
import { readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const BUDGET = 0.25;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWLIST = join(ROOT, "tools/vitest-time-budget-allowlist.json");
const EXEMPT_PROJECT = /bench|^llm-regression$/;
const EXEMPT_FILE = /\.bench(-browser)?\.(test\.)?[cm]?[jt]sx?$/;

/**
 * Whether the budget check is on.
 * @param [env] - the environment to read, process.env by default
 * @returns true when VITEST_BUDGET_CHECK is "1"
 */
export function enabled(env = process.env) {
    return env.VITEST_BUDGET_CHECK === "1";
}

/**
 * Sorts finished tests against the budget.
 * @param tests - { file, name, project, state, duration, limit } per finished test; file is repo-relative
 * @param allowlist - { file, name } entries
 * @returns over: tests over budget and not listed; removable: listed tests that ran under budget
 */
export function judge(tests, allowlist) {
    const key = (t) => `${t.file}\0${t.name}`;
    const listed = new Set(allowlist.map(key));
    const over = [];
    const removable = [];
    for (const t of tests) {
        if (
            t.state !== "passed" ||
            typeof t.limit !== "number" ||
            t.limit <= 0 ||
            EXEMPT_PROJECT.test(t.project) ||
            EXEMPT_FILE.test(t.file)
        ) {
            continue;
        }
        const ratio = t.duration / t.limit;
        const entry = { ...t, ratio };
        if (ratio > BUDGET && !listed.has(key(t))) {
            over.push(entry);
        } else if (ratio <= BUDGET && listed.has(key(t))) {
            removable.push(entry);
        }
    }
    return { over, removable };
}

const seconds = (ms) => `${(ms / 1000).toFixed(2)} s`;
const projectTag = (t) => (t.project ? " [" + t.project + "]" : "");
const line = (t) =>
    `  ${t.file} > ${t.name}${projectTag(t)}\n` +
    `    took ${seconds(t.duration)} of its ${seconds(t.limit)} limit (${Math.round(t.ratio * 100)}%, budget ${BUDGET * 100}%)`;

/**
 * The report for a judged run, empty when there is nothing to say.
 * @param result - judge()'s result
 * @param result.over - the tests over budget
 * @param result.removable - the allowlisted tests within budget
 * @returns the text to print
 */
export function format({ over, removable }) {
    const parts = [];
    if (over.length > 0) {
        parts.push(
            `[time-budget] ${over.length} test(s) used more than ${BUDGET * 100}% of their time limit:\n` +
                over.map(line).join("\n") +
                "\n  A test this close to its limit fails when the machine is busy. Cut the test's work (a smaller" +
                "\n  graph, fewer iterations, no needless waiting) or split it into several tests. Do not raise its" +
                "\n  timeout, and do not add it to tools/vitest-time-budget-allowlist.json.",
        );
    }
    if (removable.length > 0) {
        parts.push(
            `[time-budget] ${removable.length} allowlisted test(s) now run within budget; remove them from` +
                " tools/vitest-time-budget-allowlist.json:\n" +
                removable.map(line).join("\n"),
        );
    }
    return parts.join("\n\n");
}

/** The reporter: collects every finished test, then judges them all when the run ends. */
export default class TimeBudgetReporter {
    /**
     * Reads nothing until the run ends.
     * @param [options] - allowlist: path of the allowlist file; root: the directory test files are named relative to
     */
    constructor(options = {}) {
        this.on = enabled();
        this.root = options.root ?? ROOT;
        this.allowlistPath = options.allowlist ?? ALLOWLIST;
        this.tests = [];
    }

    /**
     * Records one finished test.
     * @param testCase - Vitest's TestCase
     */
    onTestCaseResult(testCase) {
        if (!this.on) {
            return;
        }
        this.tests.push({
            file: relative(this.root, testCase.module.moduleId).split(sep).join("/"),
            name: testCase.fullName,
            project: testCase.project.name,
            state: testCase.result().state,
            duration: testCase.diagnostic()?.duration ?? 0,
            limit: testCase.options.timeout,
        });
    }

    /** Judges the run, prints the report, and fails the process for a test over budget. */
    onTestRunEnd() {
        if (!this.on) {
            return;
        }
        const allowlist = JSON.parse(readFileSync(this.allowlistPath, "utf8")).tests;
        const result = judge(this.tests, allowlist);
        const text = format(result);
        if (text) {
            console.error(`\n${text}\n`);
        }
        if (result.over.length > 0) {
            process.exitCode = 1;
        }
    }
}
