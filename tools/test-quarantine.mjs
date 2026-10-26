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
 * real failure. GPU tests (the webgpu-graph-algorithms families) are never quarantined.
 *
 * An entry leaves the list when its issue closes, when the test passed in 20 consecutive gate runs of its
 * shard, or when it expires (14 days after it was added, design/ci/ci-cd-plan.md 9.3); a test that flakes
 * again is added again, and its issue gets a comment.
 *
 * Where it runs:
 *  - The gate (tools/prepush-tests.mjs) runs every shard through `run ... --via-run-tests`, and after each
 *    shard updates the local state in <main checkout>/tmp/test-quarantine/state.json (afterShard): new
 *    entries and their issues, pass counts, failures by shard input key, closed issues. The gate applies the
 *    checkout's list together with that state, so a new entry holds at once on this machine.
 *  - CI (tools/ci-test-matrix.mjs, plan()) runs every shard through `run`, applying the checkout's list
 *    only: CI never files issues or writes state.
 *  - `node tools/test-quarantine.mjs write` puts the local list into this checkout's
 *    tools/test-quarantine.json; commit that file alone and land it, so CI and every other checkout apply it
 *    too. `status` prints the list and the counts.
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
import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    realpathSync,
    renameSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
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

const DAY = 86_400_000;
export const PASSES_TO_LEAVE = 20;
export const MAX_RETRY_FILES = 5; // more failing files than this is a breakage, not a flake: no retry
const GPU_FAMILY = /^webgpu-graph-algorithms/;
const FILE = "tools/test-quarantine.json";
const RETRY_MARK = "test-quarantine: retrying";

/**
 * Whether the quarantine is switched on: on unless GRAPHTY_TEST_QUARANTINE=0.
 * @param [env] the environment
 * @returns boolean
 */
export const quarantineEnabled = (env = process.env) => env.GRAPHTY_TEST_QUARANTINE !== "0";

const keyOf = (t) => `${t.family}\0${t.file}\0${t.name}`;
const idOf = (t) => `${t.file} > ${t.name}`;
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (date, n) => new Date(Date.parse(date) + n * DAY).toISOString().slice(0, 10);

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
export const quarantined = (list, family, t) => list.find((q) => keyOf(q) === keyOf({ ...t, family }));

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
 * Runs a shell command, its output passed through and kept.
 * @param command the command
 * @param env its environment
 * @param cwd its directory
 * @returns `{ code, text }`
 */
function sh(command, env, cwd) {
    return new Promise((resolve) => {
        const child = spawn("sh", ["-c", command], { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
        const chunks = [];
        for (const s of [child.stdout, child.stderr]) {
            s.on("data", (d) => {
                chunks.push(d);
                (s === child.stdout ? process.stdout : process.stderr).write(d);
            });
        }
        child.on("close", (code, signal) =>
            resolve({ code: code ?? (signal ? 128 : 1), text: Buffer.concat(chunks).toString("utf8") }),
        );
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
 * @param [o.judge] `(decision, { firstOutcome }) => decision` in place of blameChange(): the pull request rules of
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
        const shard = shardOfRun(
            root,
            SHARDS.find((s) => s.shard === shardName),
            command,
        );
        reports.pkg = shard?.package;
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
        const d = judge ? judge(raw, { firstOutcome }) : blameChange(raw, root, family, env);
        result = { ...result, flaky: brief(d.flaky), excused: brief(d.excused), failing: brief(d.failing) };
        result.suspects = d.suspects;
        printDecision(shardName, d, env, retry ? "" : notRetried(firstOutcome, first, list, family));
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
    return "not retried: its command cannot be narrowed to the failed files";
}

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
    const cmd = shard && open.length > 0 && open.length <= MAX_RETRY_FILES ? selectedCommand(root, shard, files) : null;
    if (!cmd) return null;
    console.log(`${RETRY_MARK} the ${files.length} failed test file(s) of ${shard.shard} once: ${files.join(", ")}`);
    const retryId = reports.id ? `${reports.id}.retry` : null;
    const retryEnv = retryId ? { ...env, TEST_LEDGER_RUN: retryId } : env;
    const run = viaRunTests ? `bash tools/run-tests.sh --command ${shard.shard} ${shQuote(cmd)}` : cmd;
    const retryAt = Date.now();
    const r2 = await sh(run, retryEnv, root);
    const second = newReports(reports, ".retry");
    return { second, facts: { retried: true, retryCode: r2.code, retryRunId: retryId, retryFiles: files, retryAt } };
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
            `test-quarantine: [NEW-FLAKY] ${shard}: ${idOf(f)} failed and passed on its retry, and the ledger has no failure of it before this change: the change made it intermittent`,
        );
    }
    const how = unretried ? `failed (${unretried})` : "failed every time";
    for (const f of d.failing.filter((x) => !d.caused?.includes(x))) {
        console.log(`test-quarantine: [FAIL] ${shard}: ${idOf(f)} ${how}`);
    }
}

/**
 * The part of a shard's log before its retry (the ledger records the two runs apart).
 * @param log the whole log
 * @returns `{ first, retry }`
 */
export function splitLog(log) {
    const at = log.indexOf(RETRY_MARK);
    return at === -1 ? { first: log, retry: "" } : { first: log.slice(0, at), retry: log.slice(at) };
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
 * Changes the state under a lock (several gates run at once), atomically.
 * @param main the main checkout
 * @param change `(state) => void`, changes it in place
 * @returns the new state
 */
export function updateState(main, change) {
    const file = stateFile(main);
    mkdirSync(dirname(file), { recursive: true });
    const lock = `${file}.lock`;
    for (let i = 0; ; i++) {
        try {
            mkdirSync(lock);
            break;
        } catch {
            // ponytail: a busy-wait lock; a holder that died leaves it, so one older than 30 s is taken over
            let stale = i > 3000;
            try {
                stale ||= Date.now() - statSync(lock).mtimeMs > 30_000;
            } catch {
                // released meanwhile
            }
            if (stale) rmSync(lock, { recursive: true, force: true });
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
        }
    }
    try {
        const state = readState(main);
        change(state);
        writeFileSync(`${file}.tmp`, JSON.stringify(state, null, 1));
        renameSync(`${file}.tmp`, file);
        return state;
    } finally {
        rmSync(lock, { recursive: true, force: true });
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

const ghCli = (args) => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/**
 * The gate's bookkeeping after one shard: quarantines its flaky tests (filing their issues), counts passes of
 * quarantined tests, and remembers failures by input key so a later run of the same inputs that passes them
 * proves them flaky. Never throws.
 * @param o the facts
 * @param o.main the main checkout
 * @param o.root the checkout under test
 * @param o.shard the shard
 * @param o.inputKey the shard's input key, or undefined
 * @param o.result the wrapper's result (runShard)
 * @param [o.gh] `(args) => stdout`
 * @param [o.day] ISO date
 * @returns `{ added: entries, left: [{ id, why }] }`
 */
export function afterShard({ main, root, shard, inputKey, result, gh = ghCli, day = today() }) {
    const family = familyOf(shard);
    const out = { added: [], left: [] };
    if (GPU_FAMILY.test(family) || !result) return out;
    try {
        const committed = committedList(root, day);
        const failedNow = new Set([...(result.failed ?? []), ...(result.failing ?? [])].map(idOf));
        const proven = provenFlaky(result, inputKey ? readState(main).failedByKey[inputKey] : [], failedNow);
        const fresh = [];
        updateState(main, (state) => {
            const list = activeList(committed, state, day);
            for (const f of proven) {
                if (quarantined(list, family, f) || fresh.some((e) => idOf(e) === idOf(f))) continue;
                fresh.push({
                    file: f.file,
                    name: f.name,
                    family,
                    issue: state.issues[idOf(f)] ?? 0,
                    reason: `is flaky: it ${f.how}`,
                    since: day,
                    expires: plusDays(day, 14),
                    excerpt: f.excerpt,
                    suspects: result.suspects,
                });
            }
            if (inputKey && result.failing?.length) state.failedByKey[inputKey] = result.failing;
            else if (inputKey) delete state.failedByKey[inputKey];
            const ran = list.filter((e) => e.family === family && result.ran?.includes(e.file));
            out.left = countPasses(state, ran, failedNow, day);
        });
        out.added.push(...addEntries(main, fresh, gh));
    } catch (e) {
        console.log(`test-quarantine: ${shard}: bookkeeping failed (${e.message.split("\n")[0]})`);
    }
    return out;
}

// Files each new entry's issue (one call each, outside the state lock) and adds the entry to this machine's list;
// an entry GitHub refused is left out. Returns the entries added.
function addEntries(main, fresh, gh) {
    const added = [];
    for (const { suspects, ...e } of fresh) {
        const issue = fileIssue({ ...e, suspects }, e.issue || undefined, gh);
        if (!issue) continue;
        const entry = { ...e, issue };
        updateState(main, (state) => {
            state.added[keyOf(entry)] = entry;
            state.issues[idOf(entry)] = issue;
            delete state.removed[keyOf(entry)];
            state.passes[keyOf(entry)] = 0;
        });
        added.push(entry);
    }
    return added;
}

/**
 * Quarantines tests another tool proved flaky (verification's confirming runs: a test that failed, then passed on
 * the same commit), as afterShard does for the gate's own: an entry and its issue each. GPU tests never.
 * @param main the main checkout
 * @param tests `[{ file, name, family, how, excerpt, suspects }]`; `suspects`, `[{ sha, branch }]`, go in the issue
 * @param [gh] `(args) => stdout`
 * @param [day] ISO date
 * @returns the tests' entries now in force (added now or already listed); a test left out was refused
 */
export function quarantineTests(main, tests, gh = ghCli, day = today()) {
    const list = activeList(committedList(main, day), readState(main), day);
    const state = readState(main);
    const listed = [];
    const fresh = [];
    for (const t of tests.filter((x) => !GPU_FAMILY.test(x.family))) {
        const had = quarantined(list, t.family, t);
        if (had) listed.push(had);
        else if (!fresh.some((e) => keyOf(e) === keyOf(t))) {
            const { file, name, family, excerpt, suspects } = t;
            const reason = `is flaky: it ${t.how}`;
            fresh.push({
                file,
                name,
                family,
                suspects,
                issue: state.issues[idOf(t)] ?? 0,
                reason,
                since: day,
                expires: plusDays(day, 14),
                excerpt,
            });
        }
    }
    return [...listed, ...addEntries(main, fresh, gh)];
}

/**
 * The tests one shard run proves flaky: those its retry disagreed with, and those an earlier run of the same
 * input key failed every time that passed in this one.
 * @param result the wrapper's result
 * @param earlier the earlier run's failing tests (state.failedByKey), or undefined
 * @param failedNow the ids of the tests that failed in this run
 * @returns tests, each with `how`
 */
function provenFlaky(result, earlier, failedNow) {
    const within = (result.flaky ?? []).map((f) => ({
        ...f,
        how: "failed and passed within one gate run (the retry)",
    }));
    const across = (earlier ?? [])
        .filter((f) => result.ran?.includes(f.file) && !failedNow.has(idOf(f)))
        .map((f) => ({ ...f, how: "failed in one gate run and passed in another of the same inputs" }));
    return [...within, ...across];
}

/**
 * Counts one gate run of quarantined tests whose file ran: a pass adds one, a failure starts again from 0; an
 * entry at PASSES_TO_LEAVE leaves the list.
 * @param state the state, changed in place
 * @param ran the active entries whose file ran
 * @param failedNow the ids of the tests that failed in this run
 * @param day ISO date
 * @returns the entries that left, `{ id, why }`
 */
function countPasses(state, ran, failedNow, day) {
    const left = [];
    for (const q of ran) {
        const k = keyOf(q);
        state.passes[k] = failedNow.has(idOf(q)) ? 0 : (state.passes[k] ?? 0) + 1;
        if (state.passes[k] < PASSES_TO_LEAVE) continue;
        state.removed[k] = { at: day, why: `passed ${PASSES_TO_LEAVE} gate runs in a row` };
        delete state.added[k];
        delete state.passes[k];
        left.push({ id: idOf(q), why: state.removed[k].why });
    }
    return left;
}

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

/**
 * Ends the entries whose issue was closed: at most once an hour, one GraphQL query for every issue on the list.
 * Never throws.
 * @param main the main checkout
 * @param root the checkout under test
 * @param [gh] `(args) => stdout`
 * @param [now] ms
 * @returns the ids that left
 */
export function closeFinished(main, root, gh = ghCli, now = Date.now()) {
    const state = readState(main);
    if (now - (state.issueCheck.at ?? 0) < 3_600_000) return [];
    const list = activeList(committedList(root), state);
    const issues = [...new Set(list.map((q) => Number(q.issue)).filter((n) => n > 0))];
    updateState(main, (s) => (s.issueCheck = { at: now }));
    if (issues.length === 0) return [];
    const closed = closedIssues(issues, gh);
    if (!closed) return [];
    const left = list.filter((q) => closed.has(Number(q.issue)));
    if (left.length === 0) return [];
    const day = today();
    updateState(main, (s) => {
        for (const q of left) {
            s.removed[keyOf(q)] = { at: day, why: `issue #${q.issue} closed` };
            delete s.added[keyOf(q)];
            delete s.passes[keyOf(q)];
        }
    });
    return left.map((q) => `${idOf(q)} (issue #${q.issue} closed)`);
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
