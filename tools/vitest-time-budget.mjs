// vitest-time-budget.mjs -- a Vitest reporter that warns when a passing test used more than a quarter of
// its time limit, and fails the run when it used more than half.
//
// A test whose cost creeps toward its limit passes until the day its machine is busy, then fails as
// a "flake". This reporter reports the creep while the test still passes: for each passed test it
// compares the duration with the test's effective limit (its own timeout if it sets one, otherwise
// the project's testTimeout, otherwise Vitest's default -- Vitest resolves all three into the test's
// `timeout` option). Over WARN_RATIO it prints a warning (and a GitHub Actions annotation); over
// FAIL_RATIO it fails the run. The two lines are apart because the same test's duration varies about
// 2x from one CI run to the next: a hard line at a quarter failed unrelated pull requests at random,
// while half still leaves 2x headroom under the timeout and is crossed by real regressions, not noise.
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
// tools/vitest-time-budget-allowlist.json lists the tests over FAIL_RATIO that could not be cut yet,
// each with the issue that tracks cutting it. A listed test does not fail the run (it still warns); a
// listed test that comes in under FAIL_RATIO is reported as removable. Never raise a timeout to get
// under either line.
//
//   node --test tools/vitest-time-budget.test.mjs
import { readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const WARN_RATIO = 0.25;
export const FAIL_RATIO = 0.5;
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
 * Sorts finished tests against the two lines.
 * @param tests - { file, name, project, state, duration, limit } per finished test; file is repo-relative
 * @param allowlist - { file, name } entries
 * @returns fail: tests over FAIL_RATIO and not listed; warn: every other test over WARN_RATIO;
 *   removable: listed tests that ran at or under FAIL_RATIO
 */
export function judge(tests, allowlist) {
    const key = (t) => `${t.file}\0${t.name}`;
    const listed = new Set(allowlist.map(key));
    const fail = [];
    const warn = [];
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
        const isListed = listed.has(key(t));
        if (ratio > FAIL_RATIO && !isListed) {
            fail.push(entry);
        } else if (ratio > WARN_RATIO) {
            warn.push(entry);
        }
        if (ratio <= FAIL_RATIO && isListed) {
            removable.push(entry);
        }
    }
    return { fail, warn, removable };
}

const seconds = (ms) => `${(ms / 1000).toFixed(2)} s`;
const percent = (r) => `${Math.round(r * 100)}%`;
const projectTag = (t) => (t.project ? " [" + t.project + "]" : "");
const line = (t) =>
    `  ${t.file} > ${t.name}${projectTag(t)}\n` +
    `    took ${seconds(t.duration)} of its ${seconds(t.limit)} limit (${percent(t.ratio)}; warn ${percent(WARN_RATIO)}, fail ${percent(FAIL_RATIO)})`;

/**
 * The report for a judged run, empty when there is nothing to say.
 * @param result - judge()'s result
 * @param result.fail - the tests that fail the run
 * @param result.warn - the tests that only warn
 * @param result.removable - the allowlisted tests under the fail line
 * @returns the text to print
 */
export function format({ fail, warn, removable }) {
    const parts = [];
    if (fail.length > 0) {
        parts.push(
            `[time-budget] ${fail.length} test(s) used more than ${percent(FAIL_RATIO)} of their time limit, which fails the run:\n` +
                fail.map(line).join("\n") +
                "\n  A test this close to its limit fails when the machine is busy. Cut the test's work (a smaller" +
                "\n  graph, fewer iterations, no needless waiting) or split it into several tests. If it cannot be" +
                "\n  cut in this pull request, add it to tools/vitest-time-budget-allowlist.json with the issue that" +
                "\n  tracks cutting it. Do not raise its timeout.",
        );
    }
    if (warn.length > 0) {
        parts.push(
            `[time-budget] warning: ${warn.length} test(s) used more than ${percent(WARN_RATIO)} of their time limit:\n` +
                warn.map(line).join("\n") +
                `\n  These pass, but are drifting toward their limit. A test over ${percent(FAIL_RATIO)} fails the run.`,
        );
    }
    if (removable.length > 0) {
        parts.push(
            `[time-budget] ${removable.length} allowlisted test(s) now run under ${percent(FAIL_RATIO)} of their limit; remove them from` +
                " tools/vitest-time-budget-allowlist.json:\n" +
                removable.map(line).join("\n"),
        );
    }
    return parts.join("\n\n");
}

/**
 * GitHub Actions workflow commands, one per test over a line: an error for a failing test, a warning
 * for the rest.
 * @param result - judge()'s result
 * @param result.fail - the tests that fail the run
 * @param result.warn - the tests that only warn
 * @returns the lines to print to stdout
 */
export function annotations({ fail, warn }) {
    const escape = (text) => text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
    const one = (level, t) =>
        `::${level} file=${t.file},title=time budget::` +
        escape(`${t.name} took ${seconds(t.duration)} of its ${seconds(t.limit)} limit (${percent(t.ratio)})`);
    return [...fail.map((t) => one("error", t)), ...warn.map((t) => one("warning", t))];
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

    /** Judges the run, prints the report, and fails the process for a test over the fail line. */
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
        if (process.env.GITHUB_ACTIONS === "true") {
            for (const annotation of annotations(result)) {
                console.log(annotation);
            }
        }
        if (result.fail.length > 0) {
            process.exitCode = 1;
        }
    }
}
