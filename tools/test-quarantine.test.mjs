// Tests of tools/test-quarantine.mjs: a test that fails and then passes on the same inputs is flaky and does not
// fail the shard; one that fails on the retry too does; a quarantined test's failure is let through; the gate's
// bookkeeping files one issue per new entry, counts passes, proves flakiness across two runs of one input key,
// and ends entries whose issue closed, asking GitHub at most once an hour. All of it on by default;
// GRAPHTY_TEST_QUARANTINE=0 switches it off, and then the wrapper only runs the shard's command.
//
//   node --test tools/test-quarantine.test.mjs
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import {
    activeList,
    afterShard,
    blameChange,
    closeFinished,
    decide,
    emptyState,
    PASSES_TO_LEAVE,
    quarantineEnabled,
    quarantineTests,
    readState,
    runShard,
    shardOfRun,
    splitLog,
} from "./test-quarantine.mjs";
import { selectedCommand } from "./test-select.mjs";

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
function checkout({ retryFails, quarantine = [], suite = false, oldNaming = false, retryReport = "full" }) {
    const root = fresh();
    mkdirSync(join(root, "tools"));
    mkdirSync(join(root, "test-results"));
    writeFileSync(
        join(root, "tools/ci-test-matrix.mjs"),
        `export const SHARDS = [{ shard: "graphty-1", package: "graphty", "test-command": "cd graphty && pnpm exec vitest run --project=x --shard=1/3 --coverage" }];`,
    );
    writeFileSync(join(root, "tools/test-quarantine.json"), JSON.stringify({ quarantine }));
    const run = oldNaming ? "" : "$TEST_LEDGER_RUN-";
    const junit = (failures) =>
        `<testsuites><testsuite>${[T1, T2]
            .map(
                (t) =>
                    `<testcase classname="${t.file.slice(8)}" name="${t.name.replace(">", "&gt;")}">${failures.includes(t) ? '<failure message="boom">AssertionError: boom</failure>' : ""}</testcase>`,
            )
            .join("")}</testsuite></testsuites>`;
    writeFileSync(join(root, "first.xml"), junit([T1]));
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

describe("runShard", () => {
    const run = async (c, env = {}) => {
        const result = join(c.root, "result.json");
        const code = await runShard("graphty-1", c.first, {
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

    it("fails a run whose output is over the log budget, whatever it exited with, quarantine on or off", async () => {
        const flood = `for i in 1 2 3 4 5 6 7 8; do echo 'Warning: An update was not wrapped in act(...)'; done; echo ' Test Files  1 passed (1)'`;
        const opts = (env) => ({ root: fresh(), env: { ...process.env, ...env }, state: emptyState(), logBudget: 200 });
        for (const env of [{ GRAPHTY_TEST_QUARANTINE: undefined }, { GRAPHTY_TEST_QUARANTINE: "0" }]) {
            assert.equal(await runShard("graphty-1", flood, opts(env)), 1, JSON.stringify(env));
            assert.equal(await runShard("graphty-1", "echo ok", opts(env)), 0, "within the budget it passes");
        }
    });

    it("splits a log at the retry for the ledger", () => {
        assert.deepEqual(splitLog("a\ntest-quarantine: retrying x\nb"), {
            first: "a\n",
            retry: "test-quarantine: retrying x\nb",
        });
    });
});

describe("afterShard", () => {
    const flaky = { flaky: [{ ...T1, excerpt: "boom" }], excused: [], failing: [], failed: [T1], ran: [T1.file] };
    const calls = [];
    const gh = (args) => {
        calls.push(args);
        return "https://github.com/graphty-org/graphty-monorepo/issues/321\n";
    };

    it("quarantines a flaky test and files one issue for it, once", () => {
        const main = fresh();
        const root = checkout({}).root;
        const done = afterShard({ main, root, shard: "graphty-2", result: flaky, gh, day: DAY });
        assert.equal(done.added.length, 1);
        assert.equal(calls.length, 1);
        assert.deepEqual(calls[0].slice(0, 2), ["issue", "create"]);
        for (const l of ["bug", "priority:critical", "effort:medium"]) assert.ok(calls[0].includes(l), l);
        const added = Object.values(readState(main).added)[0];
        assert.deepEqual([added.family, added.issue, added.since, added.expires], ["graphty", 321, DAY, LATER]);
        afterShard({ main, root, shard: "graphty-3", result: flaky, gh, day: DAY });
        assert.equal(calls.length, 1, "a test already quarantined files nothing");
        const gpu = afterShard({ main, root, shard: "webgpu-graph-algorithms-node", result: flaky, gh, day: DAY });
        assert.deepEqual(gpu.added, [], "GPU tests are never quarantined");
    });

    it("names a land check's landing as suspect in the issue", () => {
        const main = fresh();
        const root = checkout({}).root;
        const suspects = [{ sha: "abc123", branch: "fix/1-x" }];
        afterShard({ main, root, shard: "graphty-2", result: { ...flaky, suspects }, gh, day: DAY });
        assert.match(calls.at(-1).at(-1), /- abc123 fix\/1-x/);
        assert.equal(Object.values(readState(main).added)[0].suspects, undefined, "kept out of the entry");
    });

    it(`ends an entry after ${PASSES_TO_LEAVE} gate runs in a row that passed it; a failure starts the count again`, () => {
        const main = fresh();
        const root = checkout({ quarantine: [entry(T1)] }).root;
        const pass = { flaky: [], excused: [], failing: [], failed: [], ran: [T1.file] };
        for (let i = 0; i < PASSES_TO_LEAVE - 1; i++)
            afterShard({ main, root, shard: "graphty-1", result: pass, gh, day: DAY });
        afterShard({ main, root, shard: "graphty-1", result: { ...pass, failed: [T1] }, gh, day: DAY });
        assert.equal(Object.values(readState(main).passes)[0], 0);
        let left = [];
        for (let i = 0; i < PASSES_TO_LEAVE; i++)
            left = afterShard({ main, root, shard: "graphty-1", result: pass, gh, day: DAY }).left;
        assert.equal(left.length, 1);
        assert.deepEqual(activeList([entry(T1)], readState(main), DAY), []);
    });

    it("proves a test flaky when a later gate run of the same inputs passes what an earlier one failed", () => {
        const main = fresh();
        const root = checkout({}).root;
        const before = calls.length;
        const failed = { flaky: [], excused: [], failing: [{ ...T2, excerpt: "x" }], failed: [T2], ran: [T2.file] };
        afterShard({ main, root, shard: "graphty-1", inputKey: "k1", result: failed, gh, day: DAY });
        assert.equal(calls.length, before, "a failure alone quarantines nothing");
        const other = { flaky: [], excused: [], failing: [], failed: [], ran: [T2.file] };
        afterShard({ main, root, shard: "graphty-1", inputKey: "k2", result: other, gh, day: DAY });
        assert.equal(calls.length, before, "a pass of other inputs proves nothing");
        const done = afterShard({ main, root, shard: "graphty-1", inputKey: "k1", result: other, gh, day: DAY });
        assert.deepEqual(
            done.added.map((e) => e.name),
            [T2.name],
        );
        assert.match(done.added[0].reason, /another of the same inputs/);
    });
});

describe("quarantineTests", () => {
    it("files a critical issue that lists the range's landings as suspects, and keeps them out of the entry", () => {
        const main = fresh();
        const calls = [];
        const gh = (args) => (calls.push(args), "https://github.com/graphty-org/graphty-monorepo/issues/55\n");
        const suspects = [
            { sha: "a".repeat(40), branch: "fix/one" },
            { sha: "b".repeat(40), branch: "feat/two" },
        ];
        const t = { ...T1, family: "graphty", how: "failed, then passed", excerpt: "boom", suspects };
        const held = quarantineTests(main, [t], gh, DAY);
        assert.deepEqual(
            held.map((e) => e.issue),
            [55],
        );
        assert.ok(calls[0].includes("priority:critical"));
        const body = calls[0][calls[0].indexOf("--body") + 1];
        assert.match(body, new RegExp(`- ${"a".repeat(40)} fix/one\n- ${"b".repeat(40)} feat/two`));
        assert.equal(Object.values(readState(main).added)[0].suspects, undefined, "the list holds no suspects");
    });
});

describe("closeFinished", () => {
    it("ends the entries whose issue closed, with one query, at most once an hour", () => {
        const main = fresh();
        const root = checkout({
            quarantine: [entry(T1), entry(T2, { issue: 8 })],
        }).root;
        const asked = [];
        const gh = (args) => {
            asked.push(args);
            return JSON.stringify({ data: { repository: { i7: { state: "CLOSED" }, i8: { state: "OPEN" } } } });
        };
        assert.deepEqual(closeFinished(main, root, gh, 10_000_000), [`${T1.file} > ${T1.name} (issue #7 closed)`]);
        assert.equal(asked.length, 1);
        assert.match(asked[0].at(-1), /i7: issue\(number: 7\).*i8: issue\(number: 8\)/);
        assert.deepEqual(closeFinished(main, root, gh, 10_000_000 + 60_000), []);
        assert.equal(asked.length, 1, "not again within the hour");
        assert.deepEqual(
            activeList([entry(T1), entry(T2, { issue: 8 })], readState(main)).map((e) => e.issue),
            [8],
        );
    });
});
