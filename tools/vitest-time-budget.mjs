// vitest-time-budget.mjs -- a Vitest reporter that reports slow passing tests and never fails a run.
//
// A test's time limit is no longer a measure of it: every test runs under the one hang guard (minutes,
// set for every vitest config), so a ratio of duration to limit says nothing. What stays useful is
// whether a test is slow, or slower than it used to be. For each passed test the reporter compares the
// duration with
//
// - SLOW_MS (10 s): a test that slow is reported whatever its history, and
// - its median over the last KEEP runs recorded in the history file: a test over MEDIAN_RATIO (3) times
//   its median, and over MIN_MS (1 s, so a 2 ms test taking 7 ms is not news), is reported.
//
// The report is a log block and, in GitHub Actions, a ::warning annotation on the file. Nothing here
// sets the exit code: a duration varies about 2x between runs of the same commit, and a gate on it
// failed unrelated changes at random (it used to fail a pull request's test over half its limit).
//
// VITEST_DURATION_HISTORY names the history file (JSON: "<project>\0<file>\0<test>" -> the last KEEP
// durations in ms). The reporter reads it, judges, adds this run's durations and writes it back. ci.yml's
// test job keeps one file per shard in the Actions cache. Without it, only the SLOW_MS line applies.
// With the results store configured (tools/results/client.mjs: RESULTS_URL and a credential), the same JSON
// is read from and written to `/v1/durations/tests/<history file name>` first (only master's own runs may
// write it; a pull request's write is refused and changes nothing); the file stays the fallback
// and is still written, so a store that does not answer within 5 s costs nothing but the wait.
//
// On when VITEST_BUDGET_CHECK=1: ci.yml's test job sets it, and a local run can set it. Every package's
// vitest config adds it through ciReporters() (vitest.ci-junit.mjs); a shard command that passes its own
// --reporter flags names it too (tools/ci-test-matrix.mjs).
//
// Not reported: tests that did not pass, and the timing projects (bench projects, *.bench.test.ts,
// llm-regression).
//
//   node --test tools/vitest-time-budget.test.mjs
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { call, config } from "./results/client.mjs";

export const SLOW_MS = 10_000;
export const MEDIAN_RATIO = 3;
export const MIN_MS = 1000;
export const KEEP = 9;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXEMPT_PROJECT = /bench|^llm-regression$/;
const EXEMPT_FILE = /\.bench(-browser)?\.(test\.)?[cm]?[jt]sx?$/;

/**
 * Whether the report is on.
 * @param [env] - the environment to read, process.env by default
 * @returns true when VITEST_BUDGET_CHECK is "1"
 */
export function enabled(env = process.env) {
    return env.VITEST_BUDGET_CHECK === "1";
}

const keyOf = (t) => `${t.project}\0${t.file}\0${t.name}`;
const judged = (t) => t.state === "passed" && !EXEMPT_PROJECT.test(t.project) && !EXEMPT_FILE.test(t.file);

/**
 * The median of some numbers.
 * @param xs - the numbers
 * @returns the median, or null for none
 */
export function median(xs) {
    if (!xs?.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * The slow tests of a run.
 * @param tests - { file, name, project, state, duration } per finished test; file is repo-relative
 * @param [history] - the history file's content
 * @returns the reported tests, each with its median (null without history), slowest first
 */
export function judge(tests, history = {}) {
    const slow = [];
    for (const t of tests.filter(judged)) {
        const m = median(history[keyOf(t)]);
        const regressed = m !== null && t.duration > MIN_MS && t.duration > MEDIAN_RATIO * m;
        if (t.duration > SLOW_MS || regressed) slow.push({ ...t, median: m });
    }
    return slow.sort((a, b) => b.duration - a.duration);
}

/**
 * The history with this run's durations added, each test keeping its last KEEP.
 * @param history - the history file's content
 * @param tests - the finished tests
 * @returns the new content
 */
export function remember(history, tests) {
    const out = { ...history };
    for (const t of tests.filter(judged)) {
        out[keyOf(t)] = [...(out[keyOf(t)] ?? []), Math.round(t.duration)].slice(-KEEP);
    }
    return out;
}

const seconds = (ms) => `${(ms / 1000).toFixed(2)} s`;
const projectTag = (t) => (t.project ? ` [${t.project}]` : "");
const against = (t) => (t.median === null ? "no recorded median" : `median ${seconds(t.median)}`);
const line = (t) => `  ${t.file} > ${t.name}${projectTag(t)}\n    took ${seconds(t.duration)} (${against(t)})`;

/**
 * The report for a run, empty when there is nothing to say.
 * @param slow - judge()'s result
 * @returns the text to print
 */
export function format(slow) {
    if (slow.length === 0) return "";
    return (
        `[time-budget] ${slow.length} slow test(s): over ${seconds(SLOW_MS)}, or over ${MEDIAN_RATIO} times ` +
        `their recorded median. This does not fail the run.\n${slow.map(line).join("\n")}`
    );
}

/**
 * GitHub Actions warnings, one per slow test.
 * @param slow - judge()'s result
 * @returns the lines to print to stdout
 */
export function annotations(slow) {
    const escape = (text) => text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
    return slow.map(
        (t) =>
            `::warning file=${t.file},title=slow test::` +
            escape(`${t.name} took ${seconds(t.duration)} (${against(t)})`),
    );
}

function readHistory(file) {
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    } catch {
        return {};
    }
}

/** The reporter: collects every finished test, then reports the slow ones when the run ends. */
export default class TimeBudgetReporter {
    /**
     * Reads nothing until the run ends.
     * @param [options] - root: the directory test files are named relative to; history: the history file
     */
    constructor(options = {}) {
        this.on = enabled();
        this.root = options.root ?? ROOT;
        this.history = options.history ?? process.env.VITEST_DURATION_HISTORY ?? "";
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
        });
    }

    /** Prints the report and adds this run to the history; never changes the exit code. */
    async onTestRunEnd() {
        if (!this.on) {
            return;
        }
        const store = this.history ? storeOf(this.history) : null;
        const read = store ? await call(store.cfg, "GET", store.path) : null;
        const fromStore = read?.ok && read.data && Object.keys(read.data).length > 0 ? read.data : null;
        const history = fromStore ?? (this.history ? readHistory(this.history) : {});
        const slow = judge(this.tests, history);
        const text = format(slow);
        if (text) {
            console.error(`\n${text}\n`);
        }
        if (process.env.GITHUB_ACTIONS === "true") {
            for (const annotation of annotations(slow)) {
                console.log(annotation);
            }
        }
        if (this.history) {
            const next = remember(history, this.tests);
            writeHistory(this.history, next);
            // A store that did not answer the read is not asked again: one timeout at most. A pull request's
            // run never writes (the store refuses it), so it sends nothing.
            if (read?.ok && process.env.GITHUB_EVENT_NAME !== "pull_request")
                await call(store.cfg, "PUT", store.path, next);
        }
    }
}

function storeOf(history) {
    const cfg = config();
    // No retry: the history file is the fallback, and a dead store must cost a shard one timeout, not three.
    return cfg
        ? {
              cfg: { ...cfg, retryMs: [] },
              path: `/v1/durations/tests/${encodeURIComponent(basename(history, ".json"))}`,
          }
        : null;
}

function writeHistory(file, history) {
    try {
        mkdirSync(dirname(file), { recursive: true });
        const tmp = `${file}.${process.pid}`;
        writeFileSync(tmp, JSON.stringify(history));
        renameSync(tmp, file);
    } catch (e) {
        console.error(`[time-budget] could not write ${file}: ${e.message}`);
    }
}
