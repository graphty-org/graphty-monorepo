#!/usr/bin/env node
/**
 * test-quarantine.mjs -- intermittent tests stop failing the gate and CI without being hidden.
 *
 * A test is FLAKY when it both failed and passed on the same inputs: in one shard run (it failed, and the
 * automatic retry of only the failed test files passed it, or the other way round), or in two gate runs of
 * one shard with the same input key (tools/prepush-inputs.mjs). A flaky test goes on the quarantine list,
 * tools/test-quarantine.json, and gets one GitHub issue (bug, priority:critical, effort:medium: the owner's rule of
 * 2026-10-22, a test that fails because of load or timing is a critical defect). A
 * quarantined test still runs and its result is printed loudly, but its failure does not fail the shard.
 * A test that fails on the first run AND on the retry, and is not quarantined, fails the shard: that is a
 * real failure. GPU tests (the webgpu-graph-algorithms families) and the style fidelity slices are never quarantined.
 *
 * An entry leaves the list when its issue closes, when the test passed in 20 consecutive gate runs of its
 * shard, or when it expires (14 days after it was added, design/ci/ci-cd-plan.md 9.3); a test that flakes
 * again is added again, and its issue gets a comment.
 *
 * Where it runs:
 *  - CI (tools/ci-test-matrix.mjs, plan(); tools/results/run-group.mjs) runs every shard through `run`, applying
 *    the checkout's list; run-group files the flaky tests' issues and ends the entries whose issue closed.
 *  - Run locally, `run` also applies the entries in <main checkout>/tmp/test-quarantine/state.json, if any.
 *  - `node tools/test-quarantine.mjs write` puts the active list into this checkout's
 *    tools/test-quarantine.json. `status` prints the list and the counts.
 *
 * ON by default (the owner's decision of 2026-10-22, design/ci/ci-cd-plan.md 9). GRAPHTY_TEST_QUARANTINE=0
 * switches it off, for debugging: then `run` runs the shard's command and returns its exit code, nothing more:
 * no retry, no let-through, no result file, no state, no issues.
 *
 * Usage:
 *   node tools/test-quarantine.mjs run <shard> <command> [--via-run-tests]
 *   node tools/test-quarantine.mjs status | write
 */

import { execFileSync, spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stripVTControlCharacters } from "node:util";

import { expectedRuns, LOG_BUDGET_BYTES, overBudget } from "./shard-verdict.mjs";
import {
    checkQuarantine,
    failuresBefore,
    familyOf,
    headFacts,
    openLedger,
    outcomeOf,
    parseJunit,
} from "./test-ledger.mjs";
import { selectedCommand } from "./test-select.mjs";
import { WAIT_GUARD_MS } from "./test-wait-guard.mjs";

export const PASSES_TO_LEAVE = 20;
export const MAX_RETRY_FILES = 5; // more failing files than this is a breakage, not a flake: no retry
// never quarantined: GPU tests, and the style fidelity gate's samples (a sample judged differently on the same inputs
// is a determinism defect in the drawing or the comparator, #4270)
const GPU_FAMILY = /^(webgpu-graph-algorithms|graphty-element-fidelity)/;
const FILE = "tools/test-quarantine.json";
const RETRY_MARK = "test-quarantine: retrying";
/** The environment variable holding the time, in ms since the epoch, a run must be stopped by. */
export const DEADLINE_ENV = "GRAPHTY_TEST_DEADLINE";
/** A run stopped at its deadline exits with GNU timeout's code, which outcomeOf() reads as not the tests' verdict. */
export const HANG_CODE = 124;
/** How long a command's pipes may stay open after it exited; what it wrote is read in far less. */
const PIPE_DRAIN_MS = 5000;
/** How long a run stopped at its deadline gets to end, and write what it can, before the KILL. */
const KILL_GRACE_MS = 10_000;

/**
 * Whether the quarantine is switched on: on unless GRAPHTY_TEST_QUARANTINE=0.
 * @param [env] the environment
 * @returns boolean
 */
export const quarantineEnabled = (env = process.env) => env.GRAPHTY_TEST_QUARANTINE !== "0";

const keyOf = (t) => `${t.family}\0${t.file}\0${t.name}`;
const idOf = (t) => `${t.file} > ${t.name}`;
const today = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------- the list

/**
 * The checkout's committed entries that are valid and not expired.
 * @param root the checkout
 * @param [day] ISO date
 * @returns entries
 */
export function committedList(root, day = today()) {
    try {
        const all = JSON.parse(readFileSync(join(root, FILE), "utf8")).quarantine ?? [];
        return all.filter((q) => checkQuarantine([q]).length === 0 && q.expires >= day);
    } catch {
        return [];
    }
}

/**
 * The list in force: the committed entries plus the ones this machine added, less the ones that left here.
 * @param committed committedList()
 * @param state the local state (emptyState() in CI)
 * @param [day] ISO date
 * @returns entries, one per test
 */
export function activeList(committed, state, day = today()) {
    const out = new Map();
    for (const q of [...committed, ...Object.values(state.added)]) {
        const gone = state.removed[keyOf(q)];
        if (q.expires < day || (gone && gone.at >= q.since)) continue;
        const had = out.get(keyOf(q));
        if (!had || had.since < q.since) out.set(keyOf(q), q);
    }
    return [...out.values()];
}

/**
 * Whether a failing test is quarantined in a family.
 * @param list activeList()
 * @param family the shard's family
 * @param t `{ file, name }`
 * @returns the entry, or undefined
 */
export const quarantined = (list, family, t) => {
    // an On shard (tools/features-on.mjs) runs its Off family's tests: that family's entries excuse them too
    const off = family.replace(/-features-on$/u, "");
    return list.find((q) => keyOf(q) === keyOf({ ...t, family }) || keyOf(q) === keyOf({ ...t, family: off }));
};

// ---------------------------------------------------------------- one shard run

/**
 * The failures and the files of the JUnit reports one vitest run wrote.
 * @param dir the test-results directory
 * @param names the report file names
 * @param id the run's TEST_LEDGER_RUN, or "" (then the package is the name before the pid)
 * @returns `{ files: Set, failures: [{ file, name, text }] }`, or null when there is none or one is unreadable
 */
export function readReports(dir, names, id) {
    if (names.length === 0) return null;
    const into = { files: new Map(), failures: [] };
    try {
        for (const n of names) {
            const pkg = id ? n.slice(6, n.indexOf(`-${id}-`)) : n.slice(6, n.lastIndexOf("-"));
            parseJunit(readFileSync(join(dir, n), "utf8"), pkg, into);
        }
    } catch {
        return null;
    }
    return { files: new Set(into.files.keys()), failures: into.failures };
}

/**
 * What a shard run with its one retry means (the decision, with no I/O).
 * @param o the facts
 * @param o.family the shard's family
 * @param o.first readReports() of the run
 * @param o.firstOutcome outcomeOf() of the run: only "failed" (test failures and nothing else) is judged here
 * @param o.second readReports() of the retry, null when it wrote none, undefined when there was no retry
 * @param o.list activeList()
 * @returns `{ pass, flaky, excused, failing }`: flaky tests both failed and passed; excused are quarantined
 *   tests that failed every time; failing are the rest that failed every time (a real failure)
 */
export function decide({ family, first, firstOutcome, second, list }) {
    const fails = first?.failures ?? [];
    const same = (a) => (b) => a.file === b.file && a.name === b.name;
    let flaky = [];
    let persistent = fails;
    if (second) {
        persistent = fails.filter((f) => second.failures.some(same(f)));
        flaky = [
            ...fails.filter((f) => !second.failures.some(same(f))),
            ...second.failures.filter((f) => !fails.some(same(f))),
        ];
    }
    if (GPU_FAMILY.test(family)) flaky = [];
    const excused = persistent.filter((f) => quarantined(list, family, f));
    const failing = persistent.filter((f) => !quarantined(list, family, f));
    // A shard that failed for anything but its tests (a crash, an unhandled error, coverage, a timeout) is not judged here.
    const judged = firstOutcome === "failed" && fails.length > 0;
    return {
        pass: judged && failing.length === 0,
        flaky: judged ? flaky : [],
        excused: judged ? excused : [],
        failing,
    };
}

/**
 * The flaky tests that failed on the first run and passed on the retry: decide()'s flaky list also holds tests
 * that passed first and failed only on the retry, which are not that run's failures.
 * @param flaky decide()'s flaky tests
 * @param first the first run's reports (readReports())
 * @returns the flaky tests among the first run's failures
 */
export const failedFirst = (flaky, first) =>
    flaky.filter((f) => (first?.failures ?? []).some((g) => g.file === f.file && g.name === f.name));

const ESCAPED_QUOTE = String.raw`'\''`;
/**
 * A word for sh, single-quoted.
 * @param s the text
 * @returns the quoted text
 */
export const shQuote = (s) => `'${s.replaceAll("'", ESCAPED_QUOTE)}'`;

/**
 * What is still running, from the record of tools/running-tests.mjs.
 * @param file the record
 * @returns the tests that started and did not end, and the files that did not end with no such test; a browser page
 *   blocked before it sent its test's start shows as its file
 */
export function stillRunning(file) {
    const open = new Set();
    const lines = existsSync(file) ? readFileSync(file, "utf8").split("\n") : [];
    for (const line of lines) {
        if (line.startsWith("+ ")) open.add(line.slice(2));
        else open.delete(line.slice(2));
    }
    const ids = [...open];
    return ids.filter((id) => !ids.some((other) => other.startsWith(`${id} > `)));
}

/** The failure name of a hung file no test of which had started, or of a run no test of which is named. */
export const HANG_NAME = "(still running at the job's deadline)";

/**
 * The failures a run stopped at its deadline leaves: each test or file still running, so the results store, and the
 * bisect of a red full run that reads it (tools/full-run.mjs bisectPlan()), name what hung (#6374). With none
 * named (no test running, or the run never started) the package stands for the whole shard: the bisect runs a
 * target whose file is not under the shard's directory as the whole shard (tools/test-select.mjs selectedCommand()).
 * @param names stillRunning()'s ids, relative to the package
 * @param pkg the shard's package directory, or undefined
 * @returns `[{ file, name, text }]`, repo-relative files as parseJunit() names them
 */
export function hangFailures(names, pkg) {
    if (!pkg) return [];
    const text = `[HANG] the run reached the job's deadline and was stopped`;
    if (names.length === 0) return [{ file: pkg, name: HANG_NAME, text }];
    return names.map((id) => {
        const at = id.indexOf(" > ");
        return at === -1
            ? { file: `${pkg}/${id}`, name: HANG_NAME, text }
            : { file: `${pkg}/${id.slice(0, at)}`, name: id.slice(at + 3), text };
    });
}

/**
 * Reports a run stopped at its deadline. It is an annotation as well as a log line because GitHub keeps no log of
 * a job it cancels, which is why this stops the run before the job's limit does.
 * @param running the record of tools/running-tests.mjs
 * @param chunks the run's output so far
 * @returns the ids still running
 */
function reportHang(running, chunks) {
    const names = stillRunning(running);
    const output = stripVTControlCharacters(Buffer.concat(chunks).toString("utf8")).trim().split("\n");
    const what =
        names.length > 0 ? `still running: ${names.join("; ")}` : `no test running; last output: ${output.at(-1)}`;
    console.log(`::error::[HANG] the run reached the job's deadline and was stopped; ${what}`);
    return names;
}

/**
 * Signals a detached command's process group, which may be gone.
 * @param child the command
 * @param signal the signal
 */
function signalGroup(child, signal) {
    try {
        process.kill(-child.pid, signal);
    } catch {
        // the group has already ended
    }
}

/**
 * Runs a shell command, its output passed through and kept. It ends when the command has exited and its output is
 * read; a process the command left behind can hold the pipes open for ever, so that wait is PIPE_DRAIN_MS at most.
 * With DEADLINE_ENV set (run-group.mjs, in CI's test job) the command is stopped at that time and exits HANG_CODE,
 * with what was running named (and returned as `hung`); past that time it does not start (`hung` is empty).
 * @param command the command
 * @param env its environment
 * @param cwd its directory
 * @returns `{ code, text, hung }`: `hung` the ids still running when it was stopped, undefined when it was not
 */
function sh(command, env, cwd) {
    const deadline = Number(env[DEADLINE_ENV] ?? 0);
    if (deadline && Date.now() >= deadline) {
        console.log(`::error::[HANG] not run, the job's deadline has passed: ${command}`);
        return Promise.resolve({ code: HANG_CODE, text: "", hung: [] });
    }
    const running = deadline ? join(tmpdir(), `running-tests-${process.pid}-${Date.now()}.log`) : null;
    return new Promise((resolve) => {
        const child = spawn("sh", ["-c", command], {
            cwd,
            env: running ? { ...env, GRAPHTY_RUNNING_TESTS: running } : env,
            stdio: ["ignore", "pipe", "pipe"],
            // its own process group, so one signal reaches what it started; never locally, where Ctrl-C must reach it
            detached: Boolean(deadline),
        });
        const chunks = [];
        for (const s of [child.stdout, child.stderr]) {
            s.on("data", (d) => {
                chunks.push(d);
                (s === child.stdout ? process.stdout : process.stderr).write(d);
            });
        }
        const timers = [];
        let hung = false;
        let finished = false;
        const finish = (code, signal) => {
            if (finished) return;
            finished = true;
            timers.forEach(clearTimeout);
            child.stdout.destroy();
            child.stderr.destroy();
            const names = hung ? reportHang(running, chunks) : undefined;
            if (running) rmSync(running, { force: true });
            const own = code ?? (signal ? 128 : 1);
            resolve({ code: hung ? HANG_CODE : own, text: Buffer.concat(chunks).toString("utf8"), hung: names });
        };
        child.on("close", finish);
        child.on("exit", (code, signal) => {
            const leftBehind = () => {
                console.log("test-quarantine: the command exited, but a process it started still holds its output");
                finish(code, signal);
            };
            timers.push(setTimeout(leftBehind, PIPE_DRAIN_MS));
        });
        if (!deadline) return;
        const stop = () => {
            hung = true;
            // the report waits for the run to stop: vitest gets a live page's last test start only as it shuts down
            signalGroup(child, "SIGTERM");
            const kill = () => {
                signalGroup(child, "SIGKILL");
                finish();
            };
            timers.push(setTimeout(kill, KILL_GRACE_MS));
        };
        timers.push(setTimeout(stop, deadline - Date.now()));
    });
}

const reportNames = (dir) => (existsSync(dir) ? readdirSync(dir).filter((n) => /^junit-.*\.xml$/.test(n)) : []);
const failureText = (f) =>
    stripVTControlCharacters(f.text ?? "")
        .split("\n")
        .slice(0, 6)
        .join("\n")
        .slice(0, 600);
const brief = (list) => list.map((f) => ({ file: f.file, name: f.name, excerpt: failureText(f) }));

/**
 * The shard a run is retried and counted as. A run of another command under a shard's name (ci.yml's
 * story-tests legs run a package's story config under its unit shard's name) is retried with that command
 * when it is a plain vitest run of the shard's package; any other command, the shard's own.
 * @param root the checkout
 * @param listed the SHARDS entry of that name, or undefined
 * @param command the command the run ran
 * @returns the SHARDS entry, with the run's command when that is the one to retry
 */
export function shardOfRun(root, listed, command) {
    const own = listed && { ...listed, "test-command": command };
    return own && selectedCommand(root, own, null) ? own : listed;
}

/**
 * The shard wrapper: runs the shard's command; when only tests failed, runs the failed test files once more;
 * decides with decide(); prints what it decided; writes the facts to TEST_QUARANTINE_RESULT when set.
 * @param shardName the shard (tools/ci-test-matrix.mjs)
 * @param command its command, for sh
 * @param o options
 * @param o.root the checkout
 * @param o.viaRunTests retry through `bash tools/run-tests.sh --command` (the gate) instead of plain sh (CI)
 * @param o.env the environment
 * @param o.state the local state (emptyState() in CI)
 * @param [o.logBudget] the most bytes the first run's output may hold (shard-verdict.mjs); a larger one fails
 *   the shard whatever it exited with, here as in CI, whose test job judges shards only through this wrapper
 * @param [o.list] the quarantine in force, in place of the committed list and the local state (the results store's)
 * @param [o.judge] `(decision, { firstOutcome, unretried }) => decision` in place of blameChange(): the pull request rules of
 *   tools/results/run-group.mjs; a decision with `lines` prints those instead of the [FLAKY] and [FAIL] lines
 * @param [o.family] the family the quarantine list is matched by, in place of the shard's own (run-group.mjs's
 *   groupFamily(), which keeps a screenshot run apart)
 * @returns the exit code
 */
export async function runShard(
    shardName,
    command,
    { root, viaRunTests, env = process.env, state, logBudget = LOG_BUDGET_BYTES, list: given, judge, family: fam },
) {
    if (!quarantineEnabled(env)) {
        const r = await sh(command, env, root);
        return r.code || floodCode(shardName, r.text, logBudget, env);
    }
    const reports = { dir: join(root, "test-results"), id: env.TEST_LEDGER_RUN ?? "" };
    reports.seen = new Set(reportNames(reports.dir));
    const r1 = await sh(command, env, root);
    const flood = floodCode(shardName, r1.text, logBudget, env);
    let result = { shard: shardName, firstCode: r1.code, retried: false, flaky: [], excused: [], failing: [] };
    let code = r1.code;
    try {
        const { SHARDS } = await import(pathToFileURL(join(root, "tools/ci-test-matrix.mjs")).href);
        // a pull request's light-check bin (`<family>-<n>`, tools/test-select.mjs lightPlan()) is no SHARDS entry:
        // it is retried as a shard of its family, whose slices differ only by --shard, which a retry drops (#5128)
        const listed =
            SHARDS.find((s) => s.shard === shardName) ?? SHARDS.find((s) => familyOf(s.shard) === familyOf(shardName));
        const shard = shardOfRun(root, listed, command);
        reports.pkg = shard?.package;
        if (r1.hung) result.hung = hangFailures(r1.hung, shard?.package);
        const first = newReports(reports, "");
        result.ran = [...(first?.files ?? [])];
        result.failed = brief(first?.failures ?? []);
        if (r1.code === 0) return flood;
        const family = fam ?? familyOf(shardName);
        const list = given ?? activeList(committedList(root), state);
        const runs = expectedRuns(shard?.["test-command"] ?? command);
        const firstOutcome = outcomeOf({ code: r1.code, log: r1.text, runs, junit: first });
        result.firstOutcome = firstOutcome;
        const retry =
            firstOutcome === "failed"
                ? await retryFailed({ root, shard, first, family, list, env, viaRunTests, reports })
                : null;
        if (retry) result = { ...result, ...retry.facts };
        const raw = decide({ family, first, firstOutcome, second: retry?.second, list });
        // every detection, before a judge moves the change's own into failing
        // imported only when it can post: the gate's tests run this file from a scratch tools/ without results/
        if (env.HEALTH_API_URL) {
            const { flushHealth, postFlaky } = await import("./results/client.mjs");
            postFlaky(env, shardName, family, failedFirst(raw.flaky, first));
            await flushHealth();
        }
        const unretried = retry ? "" : notRetried(firstOutcome, first, list, family);
        const d = judge ? judge(raw, { firstOutcome, unretried }) : blameChange(raw, root, family, env);
        result = { ...result, flaky: brief(d.flaky), excused: brief(d.excused), failing: brief(d.failing) };
        result.suspects = d.suspects;
        printDecision(shardName, d, env, unretried);
        if (d.pass) code = flood;
    } catch (e) {
        console.log(
            `test-quarantine: ${shardName}: no decision (${e.message.split("\n")[0]}); the shard's own result stands`,
        );
    } finally {
        if (env.TEST_QUARANTINE_RESULT) writeFileSync(env.TEST_QUARANTINE_RESULT, JSON.stringify(result));
    }
    return code || flood;
}

/**
 * A land check's flaky tests that the ledger has no failure of before this change: the change made them
 * intermittent, so they fail the land check (`[NEW-FLAKY]`) instead of going to the quarantine, and the rest are
 * quarantined with the landing as suspect (design/ci/history-selection.md, section 6). Elsewhere, or with no
 * ledger, decide() stands, with the landing still named as suspect.
 * ponytail: an earlier land check of the same branch counts as a failure before; a re-land after a retry is
 * quarantined, not blamed.
 * @param d decide()
 * @param root the checkout
 * @param family the shard's family
 * @param env the environment (TEST_LEDGER_KIND)
 * @param [ledger] openLedger (tests replace it)
 * @returns decide() with `caused` and `suspects`
 */
export function blameChange(d, root, family, env, ledger = openLedger) {
    if (env.TEST_LEDGER_KIND !== "land-check" || d.flaky.length === 0) return { ...d, caused: [] };
    const head = headFacts(root, env);
    const suspects = [{ sha: head.commit, branch: head.branch }];
    const l = ledger(env, root);
    if (!l.db) return { ...d, caused: [], suspects };
    let caused;
    try {
        const range = { from: "", before: new Date().toISOString(), commits: [head.commit] };
        caused = d.flaky.filter((f) => failuresBefore(l.db, { ...f, family }, range) === 0);
    } finally {
        l.db.close();
    }
    if (caused.length === 0) return { ...d, caused, suspects };
    const flaky = d.flaky.filter((f) => !caused.includes(f));
    return { ...d, pass: false, flaky, failing: [...d.failing, ...caused], caused, suspects };
}

/**
 * Fails a run whose output is over the budget (a warning flood), naming its most repeated lines.
 * @param shard the shard
 * @param text the run's output
 * @param budget the most bytes it may hold
 * @param env the environment (GITHUB_ACTIONS makes the first line an error annotation)
 * @returns 1 when it is over, else 0
 */
function floodCode(shard, text, budget, env) {
    const over = overBudget(text, budget);
    if (!over) return 0;
    const [first, ...rest] = `${shard} FAILED: ${over}`.split("\n");
    console.log(env.GITHUB_ACTIONS === "true" ? `::error::${first}` : `test-quarantine: ${first}`);
    console.log(rest.join("\n"));
    return 1;
}

/**
 * The JUnit reports a run wrote since the last look: with a TEST_LEDGER_RUN id, those that carry it (other
 * shards write beside them), else every new one (CI: one shard at a time). A checkout older than the run-id
 * names (vitest.ci-junit.mjs before e3f94aced7) writes junit-<package>-<pid>.xml: then the new ones of the
 * shard's package.
 * @param reports `{ dir, id, seen, pkg }`; `seen` grows by the names read
 * @param tag "" for the first run, ".retry" for the retry
 * @returns readReports()
 */
function newReports(reports, tag) {
    let id = reports.id ? `${reports.id}${tag}` : "";
    const fresh = reportNames(reports.dir).filter((n) => !reports.seen.has(n));
    let names = fresh.filter((n) => !id || n.includes(`-${id}-`));
    if (id && names.length === 0 && reports.pkg) {
        const prefix = `junit-${reports.pkg}-`;
        names = fresh.filter((n) => n.startsWith(prefix) && /^\d+\.xml$/.test(n.slice(prefix.length)));
        id = "";
    }
    names.forEach((n) => reports.seen.add(n));
    return readReports(reports.dir, names, id);
}

/**
 * Why a failed shard's tests were not run again, for its [FAIL] lines.
 * @param outcome outcomeOf() of the run
 * @param first readReports() of the run
 * @param list activeList()
 * @param family the shard's family
 * @returns the reason
 */
function notRetried(outcome, first, list, family) {
    if (outcome !== "failed") return `not retried: the run ended "${outcome}", not in test failures alone`;
    const open = new Set((first?.failures ?? []).filter((f) => !quarantined(list, family, f)).map((f) => f.file));
    if (open.size > MAX_RETRY_FILES) return `not retried: ${open.size} files failed, more than ${MAX_RETRY_FILES}`;
    const hung = waitedOutGuard(first?.failures ?? []);
    if (hung.length > 0) {
        const s = Math.round(WAIT_GUARD_MS / 1000);
        return `not retried: ${hung.map((f) => f.name).join(", ")} waited out the ${s} s hang guard, and a retry would wait it out again`;
    }
    return "not retried: its command cannot be narrowed to the failed files";
}

/**
 * The failures that ran as long as the wait guard (tools/test-wait-guard.mjs): a wait that never came true.
 * Their retry waits the guard out again, and two guards do not fit in a CI test job, which GitHub then
 * cancels with no result recorded (#5255: 15 min first, the retry cancelled at the job's 30 min).
 * @param failures parseJunit() failures
 * @returns those that hit the guard
 */
export const waitedOutGuard = (failures) => failures.filter((f) => (f.ms ?? 0) >= WAIT_GUARD_MS);

/**
 * Runs the failed test files of a shard once more, when there are a few and one of them is not quarantined.
 * @param o the facts
 * @param o.root the checkout
 * @param o.shard its SHARDS entry, or undefined
 * @param o.first readReports() of the run
 * @param o.family the shard's family
 * @param o.list activeList()
 * @param o.env the environment
 * @param o.viaRunTests through tools/run-tests.sh --command (the gate)
 * @param o.reports where the reports are (newReports)
 * @returns `{ second, facts }`, or null when there is nothing to retry or the command cannot be narrowed
 */
async function retryFailed({ root, shard, first, family, list, env, viaRunTests, reports }) {
    const failed = first?.failures ?? [];
    const open = [...new Set(failed.filter((f) => !quarantined(list, family, f)).map((f) => f.file))];
    const files = [...new Set(failed.map((f) => f.file))];
    const retryable = open.length > 0 && open.length <= MAX_RETRY_FILES && waitedOutGuard(failed).length === 0;
    const cmd = shard && retryable ? selectedCommand(root, shard, files) : null;
    if (!cmd) return null;
    console.log(`${RETRY_MARK} the ${files.length} failed test file(s) of ${shard.shard} once: ${files.join(", ")}`);
    const retryId = reports.id ? `${reports.id}.retry` : null;
    const retryEnv = retryId ? { ...env, TEST_LEDGER_RUN: retryId } : env;
    const run = viaRunTests ? `bash tools/run-tests.sh --command ${shard.shard} ${shQuote(cmd)}` : cmd;
    const retryAt = Date.now();
    const r2 = await sh(run, retryEnv, root);
    const read = newReports(reports, ".retry");
    // A retry that wrote no report, or one without the failed files (they matched no test file under its
    // command), ran nothing: it cannot excuse a failure, so the first run's failures stand.
    const ranThem = read && files.every((f) => read.files.has(f));
    if (!ranThem) console.log(`${RETRY_MARK} the retry reported no run of the failed file(s): its failures stand`);
    const second = ranThem ? read : null;
    return {
        second,
        facts: {
            retried: true,
            retryCode: r2.code,
            retryRunId: retryId,
            retryFiles: files,
            retryAt,
            retryRan: !!ranThem,
        },
    };
}

// A judge's own lines (runShard()'s `judge`), warnings as annotations in GitHub Actions.
function printLines(lines, gh) {
    for (const l of lines) console.log(gh && l.warn ? `::warning::${l.text}` : `test-quarantine: ${l.text}`);
}

/**
 * The loud lines, and in GitHub Actions a warning annotation per test.
 * @param shard the shard
 * @param d decide()
 * @param env the environment
 * @param unretried why the failed files were not run again, "" when they were
 */
function printDecision(shard, d, env, unretried) {
    const gh = env.GITHUB_ACTIONS === "true";
    if (d.lines) {
        printLines(d.lines, gh);
        return;
    }
    for (const f of d.flaky) {
        const line = `[FLAKY] ${shard}: ${idOf(f)} failed and passed on the same inputs, so it does not fail the shard`;
        console.log(gh ? `::warning::${line}` : `test-quarantine: ${line}`);
    }
    for (const f of d.excused) {
        const line = `[QUARANTINED] ${shard}: ${idOf(f)} failed again; it is quarantined, so it does not fail the shard`;
        console.log(gh ? `::warning::${line}` : `test-quarantine: ${line}`);
    }
    for (const f of d.caused ?? []) {
        console.log(
            `test-quarantine: [NEW-FLAKY] ${shard}: ${idOf(f)} failed and passed on its retry, and ${d.causedWhy ?? "the ledger has no failure of it before this change"}: the change made it intermittent`,
        );
    }
    const how = unretried ? `failed (${unretried})` : "failed every time";
    for (const f of d.failing.filter((x) => !d.caused?.includes(x))) {
        console.log(`test-quarantine: [FAIL] ${shard}: ${idOf(f)} ${how}`);
    }
}

// ---------------------------------------------------------------- the local state

/**
 * An empty state: `added` (entries this machine added, by key), `removed` (key: { at, why }), `passes`
 * (key: consecutive passing gate runs), `failedByKey` (shard input key: tests that failed every time),
 * `issues` (test id: issue), `issueCheck` ({ at }).
 * @returns the state
 */
export const emptyState = () => ({ added: {}, removed: {}, passes: {}, failedByKey: {}, issues: {}, issueCheck: {} });

/**
 * The state file: <main checkout>/tmp/test-quarantine/state.json (TEST_QUARANTINE_DIR names another directory).
 * @param main the main checkout
 * @returns a path
 */
export const stateFile = (main) =>
    join(process.env.TEST_QUARANTINE_DIR || join(main, "tmp/test-quarantine"), "state.json");

/**
 * Reads the state, or an empty one.
 * @param main the main checkout
 * @returns the state
 */
export function readState(main) {
    try {
        return { ...emptyState(), ...JSON.parse(readFileSync(stateFile(main), "utf8")) };
    } catch {
        return emptyState();
    }
}

/**
 * A quarantined test's issue text.
 * @param t the entry; `where` replaces the line naming the list, `extra` lines are appended
 * @returns the body
 */
export function issueBody(t) {
    return [
        `\`${idOf(t)}\` (shard family \`${t.family}\`) ${t.reason}.`,
        "",
        ...(t.where ?? [
            "It is quarantined (`tools/test-quarantine.json`, `tools/test-quarantine.mjs`): it still runs and is",
            "reported loudly, but its failures no longer fail the pre-push gate or CI. It leaves the list when this",
            `issue closes, after ${PASSES_TO_LEAVE} consecutive passing gate runs, or on ${t.expires}.`,
        ]),
        "Find the mechanism: timing or load is not an accepted cause without one.",
        "",
        "First failure:",
        "```",
        t.excerpt,
        "```",
        ...(t.suspects?.length
            ? [
                  "",
                  "Suspects, the landings that may have made it intermittent:",
                  ...t.suspects.map((l) => `- ${l.sha} ${l.branch}`),
              ]
            : []),
        ...(t.extra ?? []),
    ].join("\n");
}

/**
 * Files the issue for a newly quarantined test, or comments on its earlier one. One call to GitHub.
 * @param t the entry
 * @param had the test's earlier issue, or undefined
 * @param gh `(args) => stdout`
 * @returns the issue number, or 0 when GitHub refused
 */
export function fileIssue(t, had, gh) {
    const body = issueBody(t);
    try {
        if (had) {
            gh(["issue", "comment", String(had), "--body", `Quarantined again on ${t.since}.\n\n${body}`]);
            raiseToCritical(had, gh);
            return had;
        }
        const url = gh([
            "issue",
            "create",
            "--title",
            `Flaky test quarantined: ${idOf(t)}`.slice(0, 200),
            "--label",
            "bug",
            "--label",
            "priority:critical",
            "--label",
            "effort:medium",
            "--body",
            body,
        ]);
        return Number(/\/issues\/(\d+)/.exec(url)?.[1]) || 0;
    } catch (e) {
        console.log(`test-quarantine: could not file the issue for ${idOf(t)} (${e.message.split("\n")[0]})`);
        return 0;
    }
}

/**
 * A quarantine issue is priority:critical (owner, 2026-10-22: a test that fails under load or timing is a critical
 * defect), so a repeat quarantine raises an earlier issue that was filed or re-triaged lower (#3311). Never throws:
 * the comment has already landed.
 * @param number the issue
 * @param gh `(args) => stdout`
 */
function raiseToCritical(number, gh) {
    try {
        const lower = ["priority:high", "priority:medium", "priority:low"].flatMap((l) => ["--remove-label", l]);
        gh(["issue", "edit", String(number), "--add-label", "priority:critical", ...lower]);
    } catch (e) {
        console.log(`test-quarantine: could not raise #${number} to priority:critical (${e.message.split("\n")[0]})`);
    }
}

const ghCli = (args) => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/**
 * The closed ones among some issues, in one GraphQL query.
 * @param issues issue numbers
 * @param [gh] `(args) => stdout`
 * @returns a Set of the closed numbers, or null when GitHub could not be read
 */
export function closedIssues(issues, gh = ghCli) {
    if (issues.length === 0) return new Set();
    try {
        const fields = issues.map((n) => `i${n}: issue(number: ${n}) { state }`).join(" ");
        const query = `{ repository(owner: "graphty-org", name: "graphty-monorepo") { ${fields} } }`;
        const repo = JSON.parse(gh(["api", "graphql", "-f", `query=${query}`])).data.repository;
        return new Set(issues.filter((n) => repo[`i${n}`]?.state === "CLOSED"));
    } catch (e) {
        console.log(`test-quarantine: could not read the quarantine issues (${e.message.split("\n")[0]})`);
        return null;
    }
}

// ---------------------------------------------------------------- the command line

const mainCheckout = (cwd) =>
    dirname(
        execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
            cwd,
            encoding: "utf8",
        }).trim(),
    );

async function cli(argv) {
    const [cmd, ...rest] = argv;
    const root = process.cwd();
    if (cmd === "run") {
        const [shard, command] = rest;
        if (!shard || !command) {
            console.error("usage: node tools/test-quarantine.mjs run <shard> <command> [--via-run-tests]");
            return 2;
        }
        const local = process.env.GITHUB_ACTIONS !== "true";
        const state = local ? readState(mainCheckout(root)) : emptyState();
        return runShard(shard, command, { root, viaRunTests: rest.includes("--via-run-tests"), state });
    }
    if (cmd === "status" || cmd === "write") {
        const main = mainCheckout(root);
        const state = readState(main);
        const list = activeList(committedList(root), state).sort((a, b) => idOf(a).localeCompare(idOf(b)));
        if (cmd === "write") {
            const entries = list.map(({ file, name, family, issue, reason, since, expires, excerpt }) => ({
                file,
                name,
                family,
                issue,
                reason,
                since,
                expires,
                excerpt,
            }));
            writeFileSync(join(root, FILE), `${JSON.stringify({ quarantine: entries }, null, 4)}\n`);
            console.log(`wrote ${entries.length} entries to ${FILE}; commit it alone and land it`);
            return 0;
        }
        console.log(`quarantine: ${list.length} active (committed in this checkout, plus this machine's state)`);
        for (const q of list) {
            const n = state.passes[keyOf(q)] ?? 0;
            console.log(
                `  ${idOf(q)} [${q.family}] issue #${q.issue}, since ${q.since}, expires ${q.expires}, ${n}/${PASSES_TO_LEAVE} passes`,
            );
        }
        for (const [k, r] of Object.entries(state.removed))
            console.log(`  left: ${k.split("\0").slice(1).join(" > ")}: ${r.why} (${r.at})`);
        return 0;
    }
    console.error("usage: node tools/test-quarantine.mjs run <shard> <command> [--via-run-tests] | status | write");
    return 2;
}

// Run only as the entry point, not when imported.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exit(await cli(process.argv.slice(2)));
}
