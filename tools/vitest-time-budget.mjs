// vitest-time-budget.mjs -- a Vitest reporter that warns when a passing test used more than a quarter of
// its time limit, and fails a pull request's run when a test file the pull request changed has a test
// that used more than half.
//
// A test whose cost creeps toward its limit passes until the day its machine is busy, then fails as
// a "flake". This reporter reports the creep while the test still passes: for each passed test it
// compares the duration with the test's effective limit (its own timeout if it sets one, otherwise
// the project's testTimeout, otherwise Vitest's default -- Vitest resolves all three into the test's
// `timeout` option).
//
// - Over WARN_RATIO: a warning (a log block, and a GitHub Actions ::warning annotation on the file).
// - Over FAIL_RATIO, in a test file the pull request changed: the run fails (and an ::error annotation).
// - Over FAIL_RATIO in any other file: a warning only.
//
// Why only changed files fail: the same test's duration varies about 2x from one CI run to the next, and
// on three runs in a row different, untouched tests crossed whichever line was the hard one. A gate on
// every test would fail unrelated pull requests at random -- the flakiness this exists to prevent. The
// author who changes a slow test owns making it cheap; nobody else is blocked by it.
//
// VITEST_BUDGET_BASE names the git ref the pull request merges into (ci.yml sets origin/<base branch>
// on a pull request run, and leaves it empty on a merge-queue run, the release train and a dispatch).
// The changed files are `git diff --name-only <base>...HEAD`, computed once. With no base, or one git
// cannot resolve, nothing fails: every test over a line only warns.
//
// On when VITEST_BUDGET_CHECK=1: ci.yml's test job sets it, and a local run can set it to check before
// pushing (with VITEST_BUDGET_BASE=origin/master to fail as a pull request would). Off otherwise, the
// pre-push gate included (it shares the machine with other runs, so its durations measure the machine).
// Every package's vitest config adds it through ciReporters() (vitest.ci-junit.mjs); a shard command
// that passes its own --reporter flags names it too (tools/ci-test-matrix.mjs).
//
// Not checked: tests that did not pass (a timeout already fails), tests with no limit (timeout 0),
// and the timing projects that gate nothing (bench projects, *.bench.test.ts, llm-regression).
//
// tools/vitest-time-budget-allowlist.json lists slow tests in changed files that could not be cut in
// their pull request, each with the issue that tracks cutting it. A listed test never fails the run (it
// still warns); a listed test that comes in under FAIL_RATIO is reported as removable. Never raise a
// timeout to get under either line.
//
//   node --test tools/vitest-time-budget.test.mjs
import { spawnSync } from "node:child_process";
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
 * The files a pull request changed: `git diff --name-only <base>...HEAD`, relative to root.
 * @param base - the ref the pull request merges into, or empty on a run that is not a pull request's
 * @param root - the repository directory to run git in
 * @returns the changed paths, or null when there is no base or git cannot diff against it
 */
export function changedFiles(base, root) {
    if (!base) {
        return null;
    }
    const result = spawnSync("git", ["diff", "--name-only", "--relative", `${base}...HEAD`], {
        cwd: root,
        encoding: "utf8",
    });
    if (result.status !== 0) {
        return null;
    }
    return new Set(result.stdout.split("\n").filter(Boolean));
}

/**
 * Sorts finished tests against the two lines.
 * @param tests - { file, name, project, state, duration, limit } per finished test; file is repo-relative
 * @param allowlist - { file, name } entries
 * @param [changed] - the files the pull request changed; null (the default) when it is not a pull request's run
 * @returns fail: tests over FAIL_RATIO, in a changed file and not listed; warn: every other test over
 *   WARN_RATIO; removable: listed tests that ran at or under FAIL_RATIO
 */
export function judge(tests, allowlist, changed = null) {
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
        if (ratio > FAIL_RATIO && !isListed && changed?.has(t.file)) {
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
            `[time-budget] ${fail.length} test(s) in files this pull request changed used more than ${percent(FAIL_RATIO)} of their time limit, which fails the run:\n` +
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
                `\n  These pass, but are drifting toward their limit. A test over ${percent(FAIL_RATIO)} fails the run of a pull` +
                "\n  request that changes its file.",
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
        this.base = process.env.VITEST_BUDGET_BASE ?? "";
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

    /** Judges the run, prints the report, and fails the process for a changed file's test over the fail line. */
    onTestRunEnd() {
        if (!this.on) {
            return;
        }
        const allowlist = JSON.parse(readFileSync(this.allowlistPath, "utf8")).tests;
        const changed = changedFiles(this.base, this.root);
        if (this.base && !changed) {
            console.error(
                `\n[time-budget] git cannot diff against ${this.base}, so no test fails the run; all only warn.`,
            );
        }
        const result = judge(this.tests, allowlist, changed);
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
