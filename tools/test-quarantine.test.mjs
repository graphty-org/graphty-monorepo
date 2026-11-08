// Tests of tools/test-quarantine.mjs: a test that fails and then passes on the same inputs is flaky and does not
// fail the shard; one that fails on the retry too does; a quarantined test's failure is let through; the gate's
// bookkeeping files one issue per new entry, counts passes, proves flakiness across two runs of one input key,
// and ends entries whose issue closed, asking GitHub at most once an hour. All of it on by default;
// GRAPHTY_TEST_QUARANTINE=0 switches it off, and then the wrapper only runs the shard's command.
//
//   node --test tools/test-quarantine.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import RunningTests from "./running-tests.mjs";
import {
    activeList,
    blameChange,
    DEADLINE_ENV,
    decide,
    failedFirst,
    emptyState,
    HANG_CODE,
    quarantineEnabled,
    runShard,
    shardOfRun,
    stillRunning,
} from "./test-quarantine.mjs";
import { selectedCommand } from "./test-select.mjs";
import { WAIT_GUARD_MS } from "./test-wait-guard.mjs";

const TMP = mkdtempSync(join(tmpdir(), "test-quarantine-"));
after(() => rmSync(TMP, { recursive: true, force: true }));
let n = 0;
const fresh = () => {
    const d = join(TMP, String(n++));
    mkdirSync(d, { recursive: true });
    return d;
};

// Today, as the module under test reads it, and an expiry 14 days later (the longest a quarantine may last).
const DAY = new Date().toISOString().slice(0, 10);
const LATER = new Date(Date.parse(DAY) + 14 * 86_400_000).toISOString().slice(0, 10);
const T1 = { file: "graphty/src/a.test.tsx", name: "A > opens" };
const T2 = { file: "graphty/src/b.test.tsx", name: "B > closes" };
const fail = (t) => ({ ...t, text: "AssertionError: expected 1 to be 2" });
const entry = (t, extra = {}) => ({
    ...t,
    family: "graphty",
    issue: 7,
    reason: "is flaky",
    since: DAY,
    expires: LATER,
    ...extra,
});

describe("failedFirst", () => {
    it("keeps only the flaky tests that failed on the first run", () => {
        const first = { failures: [{ file: "a.ts", name: "t1" }] };
        const second = { failures: [{ file: "a.ts", name: "t2" }] };
        const d = decide({ family: "graphty", first, firstOutcome: "failed", second, list: [] });
        assert.deepEqual(
            d.flaky.map((f) => f.name),
            ["t1", "t2"],
        );
        assert.deepEqual(
            failedFirst(d.flaky, first).map((f) => f.name),
            ["t1"],
        );
        assert.deepEqual(failedFirst(d.flaky, undefined), []);
    });
});

describe("decide", () => {
    const first = { files: new Set([T1.file, T2.file]), failures: [fail(T1), fail(T2)] };
    it("calls a test that failed and then passed flaky, and one that failed twice a failure", () => {
        const second = { files: new Set([T1.file, T2.file]), failures: [fail(T2)] };
        const d = decide({ family: "graphty", first, firstOutcome: "failed", second, list: [] });
        assert.deepEqual(
            d.flaky.map((f) => f.name),
            [T1.name],
        );
        assert.deepEqual(
            d.failing.map((f) => f.name),
            [T2.name],
        );
        assert.equal(d.pass, false, "a test that failed every time fails the shard");
    });
    it("passes when the only test that failed twice is quarantined, and when every failure passed on the retry", () => {
        const second = { files: new Set([T2.file]), failures: [fail(T2)] };
        const list = [entry(T2)];
        const d = decide({ family: "graphty", first, firstOutcome: "failed", second, list });
        assert.equal(d.pass, true);
        assert.deepEqual(
            d.excused.map((f) => f.name),
            [T2.name],
        );
        const clean = decide({ family: "graphty", first, firstOutcome: "failed", second: { failures: [] }, list: [] });
        assert.equal(clean.pass, true);
        assert.equal(clean.flaky.length, 2);
    });
    it("quarantines nothing in another family, a GPU family, or a run that failed for more than its tests", () => {
        const second = { failures: [] };
        assert.equal(
            decide({ family: "graphty-element-browser", first, firstOutcome: "failed", list: [entry(T1), entry(T2)] })
                .pass,
            false,
            "the entries are graphty's",
        );
        const gpu = decide({ family: "webgpu-graph-algorithms-node", first, firstOutcome: "failed", second, list: [] });
        assert.deepEqual(gpu.flaky, []);
        // a fidelity sample judged differently on the same inputs is a determinism defect to see, not to quarantine
        const fidelity = decide({
            family: "graphty-element-fidelity",
            first,
            firstOutcome: "failed",
            second,
            list: [],
        });
        assert.deepEqual(fidelity.flaky, []);
        const crashed = decide({ family: "graphty", first, firstOutcome: "error", second, list: [] });
        assert.equal(crashed.pass, false, "an unhandled error or a coverage failure is not judged here");
    });
});

describe("the list", () => {
    it("drops expired entries and ones that left on this machine after they were added; a later add holds again", () => {
        const state = emptyState();
        const old = entry(T1, { since: "2026-10-01", expires: "2026-10-15" });
        assert.deepEqual(activeList([old], state, "2026-10-16"), []);
        state.removed[`graphty\0${T1.file}\0${T1.name}`] = { at: "2026-10-10", why: "issue closed" };
        assert.deepEqual(activeList([old], state, "2026-10-12"), []);
        const again = entry(T1, { since: "2026-10-11", expires: "2026-10-25" });
        state.added[`graphty\0${T1.file}\0${T1.name}`] = again;
        assert.deepEqual(activeList([old], state, "2026-10-12"), [again]);
    });
});

// A stand-in for a checkout: its CI matrix names one plain vitest shard, and tools/run-tests.sh (the retry's
// runner) writes the JUnit report the scenario asks for instead of running vitest.
// `suite`: the first run fails as a whole file (a hook timed out), so vitest counts it under "Failed Suites", not
// under "Tests N failed". `oldNaming`: the checkout predates the run-id JUnit names (vitest.ci-junit.mjs before
// e3f94aced7) and writes junit-<package>-<pid>.xml whatever TEST_LEDGER_RUN says.
// `firstSeconds`: how long T1 ran in the first run (its JUnit time).
function checkout({
    retryFails,
    quarantine = [],
    suite = false,
    oldNaming = false,
    retryReport = "full",
    firstSeconds = 0,
}) {
    const root = fresh();
    mkdirSync(join(root, "tools"));
    mkdirSync(join(root, "test-results"));
    writeFileSync(
        join(root, "tools/ci-test-matrix.mjs"),
        `export const SHARDS = [{ shard: "graphty-1", package: "graphty", "test-command": "cd graphty && pnpm exec vitest run --project=x --shard=1/3 --coverage" }];`,
    );
    writeFileSync(join(root, "tools/test-quarantine.json"), JSON.stringify({ quarantine }));
    const run = oldNaming ? "" : "$TEST_LEDGER_RUN-";
    const junit = (failures, seconds = 0) =>
        `<testsuites><testsuite>${[T1, T2]
            .map(
                (t) =>
                    `<testcase classname="${t.file.slice(8)}" name="${t.name.replace(">", "&gt;")}" time="${t === T1 ? seconds : 0}">${failures.includes(t) ? '<failure message="boom">AssertionError: boom</failure>' : ""}</testcase>`,
            )
            .join("")}</testsuite></testsuites>`;
    writeFileSync(join(root, "first.xml"), junit([T1], firstSeconds));
    writeFileSync(
        join(root, "retry.xml"),
        retryReport === "empty" ? "<testsuites></testsuites>" : junit(retryFails ? [T1] : []),
    );
    // the retry: `bash tools/run-tests.sh --command graphty-1 '<files command>'`
    writeFileSync(
        join(root, "tools/run-tests.sh"),
        `echo "$3" > retry-command; ${retryReport === "none" ? "true" : "cp"} retry.xml "test-results/junit-graphty-${run}2.xml"; ${retryFails ? "echo ' Test Files  1 failed (1)'; echo '      Tests  1 failed (1)'; exit 1" : "echo ' Test Files  1 passed (1)'"}`,
    );
    const counts = suite
        ? "echo ' Failed Suites 1 '; echo ' Test Files  1 failed | 1 passed (2)'; echo '      Tests  1 passed (1)'"
        : "echo ' Test Files  1 failed (2)'; echo '      Tests  1 failed | 1 passed (2)'";
    const first = `cp first.xml "test-results/junit-graphty-${run}1.xml"; ${counts}; exit 1`;
    return { root, first };
}

describe("blameChange", () => {
    // A ledger whose failuresBefore() count is `prior[file]`.
    const ledgerOf = (prior) => () => ({
        db: { prepare: () => ({ get: (file) => ({ n: prior[file] ?? 0 }) }), close: () => {} },
    });
    const d = { pass: true, flaky: [fail(T1), fail(T2)], excused: [], failing: [] };
    const landCheck = { TEST_LEDGER_KIND: "land-check", TEST_LEDGER_BRANCH: "fix/1-x" };

    it("fails a land check on a flaky test with no failure before the change, and names the landing", () => {
        const r = blameChange(d, fresh(), "graphty", landCheck, ledgerOf({ [T2.file]: 3 }));
        assert.equal(r.pass, false);
        assert.deepEqual(
            r.caused.map((f) => f.name),
            [T1.name],
        );
        assert.deepEqual(
            r.flaky.map((f) => f.name),
            [T2.name],
            "flaky before the change: quarantined",
        );
        assert.deepEqual(
            r.failing.map((f) => f.name),
            [T1.name],
        );
        assert.equal(r.suspects[0].branch, "fix/1-x");
    });

    it("changes nothing outside a land check, and with no ledger only names the suspect", () => {
        assert.equal(blameChange(d, fresh(), "graphty", {}, ledgerOf({})).pass, true);
        const none = blameChange(d, fresh(), "graphty", landCheck, () => ({ why: "no database yet" }));
        assert.equal(none.pass, true);
        assert.equal(none.flaky.length, 2);
        assert.equal(none.suspects[0].branch, "fix/1-x");
    });
});

describe("shardOfRun", () => {
    const layout = {
        shard: "layout",
        package: "layout",
        "test-command": "pnpm exec nx run layout:coverage --exclude-task-dependencies",
    };

    it("retries a story-tests leg's failed story files with the leg's own config, not the unit shard's", () => {
        const command = "cd layout && pnpm exec vitest run --config vitest.storybook.config.ts";
        const shard = shardOfRun(fresh(), layout, command);
        assert.equal(shard["test-command"], command);
        assert.equal(
            selectedCommand(fresh(), shard, ["layout/stories/3d/Spring3D.stories.ts"]),
            "cd layout && pnpm exec vitest run --config=vitest.storybook.config.ts 'stories/3d/Spring3D.stories.ts'",
        );
    });

    it("keeps the shard's own command for a command that is not a plain vitest run of its package", () => {
        assert.equal(shardOfRun(fresh(), layout, "bash tools/run-tests.sh layout"), layout);
        assert.equal(shardOfRun(fresh(), layout, "cd algorithms && pnpm exec vitest run"), layout);
        assert.equal(shardOfRun(fresh(), undefined, "cd layout && pnpm exec vitest run"), undefined);
    });
});

/**
 * A run's deadline on a mocked clock. The run's command runs `ready` once it has done what the test needs done
 * before the deadline; reachDeadline() waits for that and only then moves the clock to the deadline. A wall-clock
 * deadline raced the command's start: on a loaded machine the shell had not written its files when it was stopped.
 * @param t the test context
 * @param root the checkout
 * @returns `{ env, ready, reachDeadline, runAll }`
 */
function deadlineClock(t, root) {
    const DEADLINE_IN = 500;
    t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
    const fifo = join(root, "ready.fifo");
    execFileSync("mkfifo", [fifo]);
    const opened = readFile(fifo); // resolves once the command has written it and closed it
    return {
        env: { [DEADLINE_ENV]: String(DEADLINE_IN) },
        ready: `echo > '${fifo}'`,
        reachDeadline: async () => {
            await opened;
            t.mock.timers.tick(DEADLINE_IN);
        },
        runAll: () => t.mock.timers.runAll(),
    };
}

describe("runShard", () => {
    const run = async (c, env = {}, name = "graphty-1") => {
        const result = join(c.root, "result.json");
        const code = await runShard(name, c.first, {
            root: c.root,
            viaRunTests: true,
            state: emptyState(),
            env: {
                ...process.env,
                GRAPHTY_TEST_QUARANTINE: undefined, // the default: on
                TEST_LEDGER_RUN: "100-1-graphty-1",
                TEST_QUARANTINE_RESULT: result,
                ...env,
            },
        });
        return { code, result: existsSync(result) ? JSON.parse(readFileSync(result, "utf8")) : null };
    };

    it("is on by default and off only with GRAPHTY_TEST_QUARANTINE=0", async () => {
        assert.equal(quarantineEnabled({}), true);
        assert.equal(quarantineEnabled({ GRAPHTY_TEST_QUARANTINE: "1" }), true);
        assert.equal(quarantineEnabled({ GRAPHTY_TEST_QUARANTINE: "" }), true);
        assert.equal(quarantineEnabled({ GRAPHTY_TEST_QUARANTINE: "0" }), false);
        const c = checkout({ retryFails: false, quarantine: [entry(T1)] });
        const { code, result } = await run(c, { GRAPHTY_TEST_QUARANTINE: "0" });
        assert.equal(code, 1, "off, every failure fails the shard");
        assert.equal(result, null, "off, no result for the gate's bookkeeping");
        assert.equal(existsSync(join(c.root, "retry-command")), false, "off, no retry");
        const passing = await runShard("graphty-1", "exit 0", { root: fresh(), env: {}, state: emptyState() });
        assert.equal(passing, 0);
    });

    it("retries only the failed files, once, and passes a test that passed on the retry as flaky", async () => {
        const c = checkout({ retryFails: false });
        const { code, result } = await run(c);
        assert.equal(code, 0);
        assert.equal(
            readFileSync(join(c.root, "retry-command"), "utf8").trim(),
            "cd graphty && pnpm exec vitest run --project=x 'src/a.test.tsx'",
        );
        assert.equal(result.firstCode, 1);
        assert.equal(result.retryRunId, "100-1-graphty-1.retry");
        assert.deepEqual(
            result.flaky.map((f) => f.name),
            [T1.name],
        );
        assert.deepEqual(result.ran.sort(), [T1.file, T2.file]);
    });

    // #5128: a pull request's light-check bin (graphty-7, past the family's shards) found no SHARDS entry of its
    // name, so a test that failed once was never retried and was reported as failing every time.
    it("retries a light-check bin's failed files as a shard of its family", async () => {
        const c = checkout({ retryFails: false });
        const { code, result } = await run(c, {}, "graphty-7");
        assert.equal(result.retried, true);
        assert.equal(code, 0);
        assert.deepEqual(
            result.flaky.map((f) => f.name),
            [T1.name],
        );
    });

    // A story leg once retried its stories under the unit config, which found no test files: with no report
    // the failure was never judged, and an empty report called every failure flaky and passed the leg.
    for (const retryReport of ["none", "empty"]) {
        it(`fails the shard when the retry wrote ${retryReport === "none" ? "no report" : "an empty report"}`, async () => {
            const { code, result } = await run(checkout({ retryFails: false, retryReport }));
            assert.equal(code, 1);
            assert.equal(result.retried, true);
            assert.equal(result.retryRan, false);
            assert.deepEqual(result.flaky, []);
        });
    }

    // #3323: a graphty shard whose file failed as a whole (a setup hook timed out) was never retried: vitest's
    // "Tests" line counts no failed test, so the run looked like an error rather than test failures.
    it("retries a file that failed as a whole suite", async () => {
        const c = checkout({ retryFails: false, suite: true });
        const { code, result } = await run(c);
        assert.equal(result.retried, true);
        assert.equal(code, 0);
        assert.deepEqual(
            result.flaky.map((f) => f.name),
            [T1.name],
        );
    });

    // #3323: a checkout older than the run-id JUnit names wrote reports the wrapper never found, so nothing was
    // retried and nothing was said.
    it("retries a checkout that writes JUnit reports without the run id", async () => {
        const c = checkout({ retryFails: false, oldNaming: true });
        // another shard of the same gate, beside it, in another package
        const other = `<testsuites><testcase classname="x.test.ts" name="y"><failure>no</failure></testcase></testsuites>`;
        c.first = `echo '${other}' > test-results/junit-graphty-element-7.xml; ${c.first}`;
        const { code, result } = await run(c);
        assert.equal(result.retried, true);
        assert.equal(code, 0);
        assert.deepEqual(result.ran.sort(), [T1.file, T2.file], "another package's report is not read");
    });

    it("fails a test that fails on the retry too, unless it is quarantined", async () => {
        const failing = await run(checkout({ retryFails: true }));
        assert.equal(failing.code, 1);
        assert.deepEqual(
            failing.result.failing.map((f) => f.name),
            [T1.name],
        );
        const listed = await run(checkout({ retryFails: true, quarantine: [entry(T1)] }));
        assert.equal(listed.code, 0, "a quarantined test does not fail the shard");
        assert.equal(listed.result.retried, false, "only quarantined tests failed: nothing to retry");
        assert.deepEqual(
            listed.result.excused.map((f) => f.name),
            [T1.name],
        );
    });

    // #5255: a test whose wait never came true failed after the 900 s wait guard, and its retry waited the guard out
    // again until GitHub cancelled the 30-minute job, with no result recorded. It fails once instead.
    it("does not retry a test that waited out the hang guard, and fails it", async () => {
        const c = checkout({ retryFails: false, firstSeconds: WAIT_GUARD_MS / 1000 + 3 });
        const { code, result } = await run(c);
        assert.equal(code, 1);
        assert.equal(result.retried, false);
        assert.equal(existsSync(join(c.root, "retry-command")), false, "no retry ran");
        assert.deepEqual(
            result.failing.map((f) => f.name),
            [T1.name],
        );
    });

    // #5845: `sh` waited for the pipes to close, so a process the command left behind kept the step alive for ever.
    it("ends when the command has exited, though a process it left behind holds its output", async () => {
        const c = checkout({ retryFails: false });
        const first = "setsid sleep 600 & echo $! > survivor.pid; echo ' Test Files  1 passed (1)'; exit 0";
        const { code } = await run({ ...c, first });
        process.kill(Number(readFileSync(join(c.root, "survivor.pid"), "utf8")));
        assert.equal(code, 0);
    });

    // #5845: a browser run hung until GitHub cancelled the job, which keeps no log, so nothing named the test.
    it("stops a stuck run at its deadline, names the test still running and does not retry it", async (t) => {
        const c = checkout({ retryFails: false });
        const log = t.mock.method(console, "log", () => {});
        const clock = deadlineClock(t, c.root);
        const first = [
            `printf '+ a.test.ts\\n+ a.test.ts > done\\n- a.test.ts > done\\n+ a.test.ts > stuck\\n' > "$GRAPHTY_RUNNING_TESTS"`,
            // a stuck child that left the process group and ignores the TERM, holding the output pipes. It says ready
            // itself, once out of the group: said by the parent, the deadline's TERM to the group could reach the
            // child before `setsid` ran and kill it (#6266).
            `setsid sh -c "trap '' TERM; echo \\$\\$ > survivor.pid; ${clock.ready}; exec sleep 600" & wait`,
        ].join("; ");
        const running = run({ ...c, first }, clock.env);
        await clock.reachDeadline();
        clock.runAll(); // the survivor holds the pipes, so the run ends at its KILL
        const { code, result } = await running;
        process.kill(Number(readFileSync(join(c.root, "survivor.pid"), "utf8")), "SIGKILL");
        const printed = log.mock.calls.map((call) => call.arguments[0]).join("\n");
        assert.equal(code, HANG_CODE);
        assert.match(printed, /^::error::\[HANG\] .*still running: a\.test\.ts > stuck$/mu);
        assert.equal(result.retried, false);
        assert.equal(existsSync(join(c.root, "retry-command")), false, "no retry ran");
    });

    it("gives the last output of a stuck run with no test running, and starts nothing past the deadline", async (t) => {
        const c = checkout({ retryFails: false });
        const log = t.mock.method(console, "log", () => {});
        const clock = deadlineClock(t, c.root);
        const env = clock.env;
        const running = run({ ...c, first: `echo installing; ${clock.ready}; exec sleep 600` }, env);
        await clock.reachDeadline();
        const stuck = await running;
        assert.equal(stuck.code, HANG_CODE);
        assert.match(log.mock.calls.map((call) => call.arguments[0]).join("\n"), /last output: installing$/mu);
        const late = await run({ ...c, first: "touch started" }, env);
        assert.equal(late.code, HANG_CODE);
        assert.equal(existsSync(join(c.root, "started")), false);
    });

    it("reads the tests still running, and the files with none, from the running-tests reporter's record", () => {
        const file = join(fresh(), "record");
        assert.deepEqual(stillRunning(file), []);
        const reporter = new RunningTests({ file });
        const testModule = { relativeModuleId: "src/a.test.ts" };
        const testCase = { module: testModule, fullName: "suite works" };
        reporter.onTestModuleQueued(testModule);
        assert.deepEqual(stillRunning(file), ["src/a.test.ts"]);
        reporter.onTestCaseReady(testCase);
        assert.deepEqual(stillRunning(file), ["src/a.test.ts > suite works"]);
        reporter.onTestModuleQueued({ relativeModuleId: "src/b.test.ts" });
        assert.deepEqual(stillRunning(file), ["src/a.test.ts > suite works", "src/b.test.ts"]);
        reporter.onTestModuleEnd({ relativeModuleId: "src/b.test.ts" });
        reporter.onTestCaseResult(testCase);
        reporter.onTestModuleEnd(testModule);
        assert.deepEqual(stillRunning(file), []);
    });

    it("fails a run whose output is over the log budget, whatever it exited with, quarantine on or off", async () => {
        const flood = `for i in 1 2 3 4 5 6 7 8; do echo 'Warning: An update was not wrapped in act(...)'; done; echo ' Test Files  1 passed (1)'`;
        const opts = (env) => ({ root: fresh(), env: { ...process.env, ...env }, state: emptyState(), logBudget: 200 });
        for (const env of [{ GRAPHTY_TEST_QUARANTINE: undefined }, { GRAPHTY_TEST_QUARANTINE: "0" }]) {
            assert.equal(await runShard("graphty-1", flood, opts(env)), 1, JSON.stringify(env));
            assert.equal(await runShard("graphty-1", "echo ok", opts(env)), 0, "within the budget it passes");
        }
    });
});
