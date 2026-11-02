// Tests of tools/test-slots.mjs, the machine-wide limit on concurrent test runs: a slot is taken and
// given back, waiters start in arrival order, a dead holder's slot is reclaimed, a nested run takes
// no second slot, --gpu takes the one GPU slot instead of a test slot, the GPU browser runner queues before its time limit starts, and every package's
// vitest config takes a slot, caps its Node workers at its share of the cores and adds ciReporters().
//
//   node --test tools/test-slots.test.mjs
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
    acquire,
    commandWhat,
    HELD,
    laneOf,
    liveTickets,
    packageName,
    shardCacheDir,
    slotCount,
    workerShare,
} from "./test-slots.mjs";

// The temporary directories this file makes go inside this one, removed when the file finishes.
const TMP = mkdtempSync(join(tmpdir(), "test-slots-"));
after(() => rmSync(TMP, { recursive: true, force: true }));
// The wrapped commands below log their waits and holds here, never to the machine's wait log.
const WAIT_LOG = join(TMP, "waits.jsonl");
process.env.PIPELINE_WAIT_LOG = WAIT_LOG;
const holds = () =>
    readFileSync(WAIT_LOG, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
        .filter((w) => w.kind.endsWith("-slot-held"));

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "tools/test-slots.mjs");
const BROWSER_RUNNER = join(ROOT, "webgpu-graph-algorithms/scripts/run-browser-project.js");

// Long-lived processes to stand in for the runs that hold slots.
const children = [];
function sleeper() {
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 600000)"], { stdio: "ignore" });
    children.push(child);
    return child;
}
after(() => children.forEach((c) => c.kill("SIGKILL")));

const fresh = () => mkdtempSync(join(TMP, "test-slots-"));
const quiet = { env: {}, poll: 10, log: () => {}, waitLog: () => {} };
// Ticket names carry the millisecond they were written in, so a run asked for after this gets a later place in line.
async function nextMillisecond() {
    const now = Date.now();
    while (Date.now() === now) {
        await new Promise((r) => setImmediate(r));
    }
}
// Resolves once a spawned command wrapper has written the line that says it is waiting for a slot.
function queuedLine(child) {
    return new Promise((resolve, reject) => {
        let text = "";
        child.stderr.on("data", (d) => {
            text += d;
            if (/waiting for one of/.test(text)) resolve();
        });
        child.once("exit", (code) => reject(new Error(`exited (${code}) before it waited for a slot: ${text}`)));
    });
}
// acquire(), counting its reads of the tickets, so a test waits on the polls it needs and not on the clock.
function queue(options) {
    const read = options.list ?? liveTickets;
    let polls = 0;
    const waiting = [];
    const promise = acquire({
        ...options,
        list: (d) => {
            polls++;
            waiting.filter((w) => polls >= w.at).forEach((w) => w.wake());
            return read(d);
        },
    });
    promise.polls = (n) => new Promise((wake) => waiting.push({ at: polls + n, wake }));
    return promise;
}
// Whether a queue() promise has settled by its second read of the tickets from now: the first may be under
// way already, so the second is the first to see everything the test did before asking.
async function settled(promise) {
    let done = false;
    const mark = () => (done = true);
    await Promise.race([promise.then(mark, mark), promise.polls(2)]);
    return done;
}

describe("test-slots", () => {
    it("lets `slots` runs hold at once, makes the next wait with one line naming the holders, and gives the slot back", async () => {
        const dir = fresh();
        const [a, b, c] = [sleeper(), sleeper(), sleeper()];
        const releaseA = await acquire({ ...quiet, dir, slots: 2, pid: a.pid, label: "run a" });
        await nextMillisecond();
        await acquire({ ...quiet, dir, slots: 2, pid: b.pid, label: "run b" });
        const lines = [];
        const third = queue({ ...quiet, dir, slots: 2, pid: c.pid, label: "run c", log: (l) => lines.push(l) });
        assert.equal(await settled(third), false, "a third run waits while two slots are held");
        assert.equal(lines.length, 1, "one waiting line, not one per poll");
        assert.match(lines[0], new RegExp(`waiting for one of 2 .*pid ${a.pid} run a .*pid ${b.pid} run b`));
        releaseA();
        assert.equal(await settled(third), true, "the freed slot goes to the waiting run");
        assert.deepEqual(
            liveTickets(dir).map((t) => t.label),
            ["run b", "run c"],
        );
    });

    it("starts waiting runs in the order they arrived", async () => {
        const dir = fresh();
        const [h, w1, w2] = [sleeper(), sleeper(), sleeper()];
        const releaseH = await acquire({ ...quiet, dir, slots: 1, pid: h.pid, label: "holder" });
        await nextMillisecond();
        const first = queue({ ...quiet, dir, slots: 1, pid: w1.pid, label: "first" });
        await nextMillisecond();
        const second = queue({ ...quiet, dir, slots: 1, pid: w2.pid, label: "second" });
        releaseH();
        assert.equal(await settled(first), true);
        assert.equal(await settled(second), false, "the later run still waits");
        (await first)();
        assert.equal(await settled(second), true);
    });

    it("puts a low-priority run (GRAPHTY_SLOT_PRIORITY=low) behind later ordinary runs; a low run holding a slot keeps it", async () => {
        const dir = fresh();
        const [h, l1, w, l2, w2] = [sleeper(), sleeper(), sleeper(), sleeper(), sleeper()];
        const low = { ...quiet, env: { GRAPHTY_SLOT_PRIORITY: "low" } };
        const releaseH = await acquire({ ...quiet, dir, slots: 1, pid: h.pid, label: "holder" });
        await nextMillisecond();
        const sync = queue({ ...low, dir, slots: 1, pid: l1.pid, label: "sync" });
        await nextMillisecond();
        const later = queue({ ...quiet, dir, slots: 1, pid: w.pid, label: "later" });
        releaseH();
        assert.equal(await settled(later), true, "the later ordinary run goes first");
        assert.equal(await settled(sync), false, "the low run still waits");
        (await later)();
        assert.equal(await settled(sync), true);
        // Holding a slot, the low run counts against the limit: an ordinary run now waits for it.
        const next = queue({ ...quiet, dir, slots: 1, pid: w2.pid, label: "next" });
        assert.equal(await settled(next), false, "a granted low run is not overtaken");
        const lowAgain = queue({ ...low, dir, slots: 1, pid: l2.pid, label: "sync 2" });
        (await sync)();
        assert.equal(await settled(next), true);
        assert.equal(await settled(lowAgain), false);
        (await next)();
        assert.equal(await settled(lowAgain), true);
    });

    it("names a ticket's lane by GRAPHTY_SLOT_PRIORITY alone", () => {
        assert.equal(laneOf({}), "");
        assert.equal(laneOf({ GRAPHTY_SLOT_PRIORITY: "low" }), "~");
        assert.equal(laneOf({ TEST_SLOT_GATE: "1" }), "", "there is no gate lane");
    });

    it("waits out a full file table (ENFILE, EMFILE) while reading the tickets instead of crashing, and gives up after a bound", async () => {
        const dir = fresh();
        const full = (code) => Object.assign(new Error(code), { code });
        let fails = 2;
        const lines = [];
        const flaky = (d) => {
            if (fails-- > 0) {
                throw full(fails ? "ENFILE" : "EMFILE");
            }
            return liveTickets(d);
        };
        const release = await acquire({
            ...quiet,
            dir,
            slots: 1,
            label: "run",
            list: flaky,
            log: (l) => lines.push(l),
        });
        assert.deepEqual(
            liveTickets(dir).map((t) => t.label),
            ["run"],
            "the slot is taken once handles are free",
        );
        assert.equal(lines.length, 1, "one line says what it waits on");
        assert.match(lines[0], /no free file handle \(ENFILE\)/);
        release();
        const never = () => {
            throw full("ENFILE");
        };
        await assert.rejects(acquire({ ...quiet, dir: fresh(), slots: 1, label: "run", list: never }), {
            code: "ENFILE",
        });
        const broken = () => {
            throw full("EACCES");
        };
        await assert.rejects(acquire({ ...quiet, dir: fresh(), slots: 1, label: "run", list: broken }), {
            code: "EACCES",
        });
    });

    it("reclaims the slot of a run that was killed without giving it back", async () => {
        const dir = fresh();
        const [doomed, waiter] = [sleeper(), sleeper()];
        await acquire({ ...quiet, dir, slots: 1, pid: doomed.pid, label: "killed" });
        const next = queue({ ...quiet, dir, slots: 1, pid: waiter.pid, label: "next" });
        assert.equal(await settled(next), false);
        doomed.kill("SIGKILL");
        await new Promise((r) => doomed.once("exit", r));
        assert.equal(await settled(next), true, "the dead holder's ticket was removed");
        assert.deepEqual(
            liveTickets(dir).map((t) => t.label),
            ["next"],
        );
    });

    it("takes no second slot for a run nested in one that holds a slot, so it cannot wait on its own parent", async () => {
        const dir = fresh();
        // This test process holds the only slot; a child of it asks for one.
        const release = await acquire({ ...quiet, dir, slots: 1, pid: process.pid, label: "parent" });
        const child = sleeper();
        const nested = queue({ ...quiet, dir, slots: 1, pid: child.pid, label: "nested" });
        assert.equal(await settled(nested), true, "a process under a holder does not wait");
        const flagged = queue({ ...quiet, dir, slots: 1, pid: sleeper().pid, env: { [HELD]: "1" }, label: "x" });
        assert.equal(await settled(flagged), true, `${HELD} in the environment skips the queue`);
        assert.equal(readdirSync(dir).length, 1, "neither wrote a ticket");
        release();
    });

    it("takes one slot per 8 cores (at least 2) unless GRAPHTY_TEST_SLOTS says otherwise; 0 is no limit", async () => {
        assert.equal(slotCount({}, 32), 4);
        assert.equal(slotCount({}, 4), 2);
        assert.equal(slotCount({ GRAPHTY_TEST_SLOTS: "6" }, 32), 6);
        assert.throws(() => slotCount({ GRAPHTY_TEST_SLOTS: "many" }, 32), /whole number/);
        const dir = fresh();
        await acquire({ ...quiet, dir, slots: 0, label: "unlimited" });
        assert.deepEqual(readdirSync(dir), []);
    });

    it("gives a Node run at most its share of the cores as workers, and no cap where slots are off", () => {
        assert.equal(workerShare({}, 32), 8);
        assert.equal(workerShare({}, 4), 2);
        assert.equal(workerShare({ GRAPHTY_TEST_SLOTS: "6" }, 32), 5);
        assert.equal(workerShare({ GRAPHTY_TEST_SLOTS: "64" }, 32), 1);
        assert.equal(workerShare({ GRAPHTY_TEST_SLOTS: "0" }, 32), undefined);
        assert.equal(workerShare({ GITHUB_ACTIONS: "true" }, 32), undefined);
    });

    it("gives each gate shard its own Vite cache, and Vite's default outside one", () => {
        assert.equal(
            shardCacheDir({ GRAPHTY_TEST_SHARD: "graphty-element-browser-2" }),
            "node_modules/.vite/shard-graphty-element-browser-2",
        );
        assert.equal(shardCacheDir({}), undefined);
    });

    // Without `force` a second run in the same checkout trusts the old bundle and reloads mid-run on an import
    // added since (#5134, #5240); without the shard directory side-by-side gate shards delete each other's bundles.
    it("bundles afresh into the shard's own Vite cache in every package's storybook config", () => {
        const configs = readdirSync(ROOT, { withFileTypes: true })
            .filter((d) => d.isDirectory() && !d.name.startsWith("."))
            .flatMap((d) =>
                readdirSync(join(ROOT, d.name))
                    .filter((f) => /^vitest\.storybook\.config\.m?[jt]s$/.test(f))
                    .map((f) => join(d.name, f)),
            );
        assert.ok(configs.length >= 5, `found ${configs.length} storybook configs`);
        const missing = configs.filter((f) => {
            const text = readFileSync(join(ROOT, f), "utf8");
            return !/optimizeDeps: \{[^}]*force: true/.test(text) || !/cacheDir: shardCacheDir\(\)/.test(text);
        });
        assert.deepEqual(missing, [], "these storybook configs lack optimizeDeps.force or cacheDir: shardCacheDir()");
    });

    it("wraps a command: holds a slot while it runs, marks its environment, passes its exit code", () => {
        const dir = fresh();
        const r = spawnSync(
            process.execPath,
            [SCRIPT, process.execPath, "-e", `console.log(process.env.${HELD}); process.exit(3)`],
            {
                encoding: "utf8",
                env: {
                    ...process.env,
                    GRAPHTY_TEST_SLOTS_DIR: dir,
                    GRAPHTY_TEST_SLOTS: "1",
                    GITHUB_ACTIONS: "",
                    [HELD]: "",
                },
            },
        );
        assert.equal(r.status, 3);
        assert.match(r.stdout, /^\d+\n$/);
        assert.deepEqual(readdirSync(dir), [], "the slot was given back");
        const held = holds().at(-1);
        assert.equal(held.kind, "test-slot-held");
        assert.equal(held.exit, 3, "the hold carries the command's exit code");
        assert.equal(held.what, "node");
    });

    it("logs each hold once when it ends, with what held it and its exit code; free() gives it back unlogged", async () => {
        const dir = fresh();
        const lines = [];
        const waitLog = (w) => lines.push(w);
        const release = await acquire({
            ...quiet,
            waitLog,
            dir,
            slots: 1,
            pid: sleeper().pid,
            label: "x",
            what: "layout",
        });
        release.free();
        assert.deepEqual(readdirSync(dir), [], "free gives the slot back");
        assert.equal(lines.length, 0, "a teardown before the exit logs nothing");
        release(1);
        release(0);
        assert.equal(lines.length, 1, "one line per hold");
        assert.equal(lines[0].kind, "test-slot-held");
        assert.deepEqual(lines[0].extra, { what: "layout", exit: 1 });
        const unknown = await acquire({ ...quiet, waitLog, dir, slots: 1, pid: sleeper().pid, label: "y" });
        unknown();
        assert.equal(lines[1].extra.exit, null, "no exit code: null, never a pass");
    });

    it("names what a run is: a shard family for run-tests.sh, a package for a vitest run", () => {
        assert.equal(
            commandWhat(["bash", "tools/run-tests.sh", "graphty-element-browser-3"]),
            "graphty-element-browser",
        );
        assert.equal(
            commandWhat(["bash", "tools/run-tests.sh", "--command", "graphty-2", "vitest run a.test.ts"]),
            "graphty",
        );
        assert.equal(commandWhat(["/usr/bin/pnpm", "exec", "vitest"]), "pnpm");
        assert.equal(packageName(join(ROOT, "layout")), "layout");
        assert.equal(packageName(TMP), TMP.split("/").at(-1));
    });

    it("--gpu holds the one GPU slot instead of a test slot, so a run under it takes no test slot", async () => {
        const dirs = { GRAPHTY_TEST_SLOTS_DIR: fresh(), GRAPHTY_GPU_SLOTS_DIR: fresh() };
        const env = { ...process.env, ...dirs, GITHUB_ACTIONS: "", GRAPHTY_TEST_SLOTS: "4", [HELD]: "" };
        // A test slot held elsewhere does not keep a GPU run out (it is a separate queue).
        const releaseTest = await acquire({
            ...quiet,
            dir: dirs.GRAPHTY_TEST_SLOTS_DIR,
            slots: 4,
            pid: sleeper().pid,
            label: "cpu",
        });
        const report = (cmd) =>
            spawn(process.execPath, [SCRIPT, "--gpu", process.execPath, "-e", cmd], {
                env,
                stdio: ["ignore", "pipe", "pipe"],
            });
        // The first GPU run reports its ticket, its environment and the test tickets, then runs until it is ended.
        const first = report(
            `const fs = require("fs");
             console.log(JSON.stringify({ pid: process.pid, held: process.env.${HELD}, gpu: fs.readdirSync(${JSON.stringify(dirs.GRAPHTY_GPU_SLOTS_DIR)}).length,
               test: fs.readdirSync(${JSON.stringify(dirs.GRAPHTY_TEST_SLOTS_DIR)}).length }));
             setTimeout(() => {}, 600000);`,
        );
        children.push(first);
        const line = await new Promise((resolve, reject) => {
            first.stdout.once("data", (d) => resolve(JSON.parse(String(d))));
            first.once("exit", (code) => reject(new Error(`the --gpu run ended (${code}) before its command ran`)));
        });
        assert.ok(line.held, `${HELD} is set, so its vitest runs take no test slot`);
        assert.equal(line.gpu, 1, "one GPU ticket");
        assert.equal(line.test, 1, "no test ticket of its own (only the other run's)");
        // A second GPU run waits for the card even though test slots are free.
        const second = report(`console.log("second ran")`);
        let out = "";
        second.stdout.on("data", (d) => (out += d));
        const exited = new Promise((r) => second.once("exit", r));
        await queuedLine(second);
        assert.equal(out, "", "one GPU run at a time");
        assert.equal(readdirSync(dirs.GRAPHTY_GPU_SLOTS_DIR).length, 2, "the second run has its ticket in line");
        process.kill(line.pid); // its command ends, so the wrapper gives the slot back
        assert.equal(await exited, 0);
        assert.match(out, /second ran/);
        assert.deepEqual(readdirSync(dirs.GRAPHTY_GPU_SLOTS_DIR), [], "the GPU slot was given back");
        releaseTest();
    });

    it("takes the slot before the GPU browser runner's time limit starts, so the wait never counts against it", async () => {
        const dir = fresh();
        const holder = sleeper();
        const releaseHolder = await acquire({ ...quiet, dir, slots: 1, pid: holder.pid, label: "holder" });
        // The timed command takes a slot the way vitest does: if the runner did not hold one, it would queue
        // behind the holder inside the 1 s limit and be killed.
        // The command stands in for vitest, so it writes the JSON report vitest would; without it an exit of 0 fails.
        const report = JSON.stringify({ numTotalTests: 1, numPassedTests: 1, numFailedTests: 0 });
        const command = [
            process.execPath,
            SCRIPT,
            process.execPath,
            "-e",
            `require("fs").writeFileSync("browser-results.json", ${JSON.stringify(report)}); console.log("timed command ran")`,
        ];
        const runner = spawn(
            process.execPath,
            [
                "--input-type=module",
                "-e",
                `const { main } = await import(${JSON.stringify(pathToFileURL(BROWSER_RUNNER).href)});
                 process.exit(await main([], { command: ${JSON.stringify(command)}, limitSeconds: 1 }));`,
            ],
            {
                env: {
                    ...process.env,
                    GRAPHTY_TEST_SLOTS_DIR: dir,
                    GRAPHTY_TEST_SLOTS: "1",
                    GITHUB_ACTIONS: "",
                    [HELD]: "",
                },
                stdio: ["ignore", "pipe", "pipe"],
            },
        );
        let output = "";
        runner.stdout.on("data", (d) => (output += d));
        runner.stderr.on("data", (d) => (output += d));
        const exited = new Promise((r) => runner.once("exit", r));
        // Someone has queued behind the holder. It must be the runner itself: its limit starts only once it holds
        // the slot. Were it the command, it would be waiting inside the limit.
        await queuedLine(runner);
        const queued = liveTickets(dir);
        assert.equal(queued.length, 2, "the holder and one run in line");
        assert.equal(queued[1].pid, runner.pid, "the runner, not its timed command, waits for the slot");
        assert.doesNotMatch(output, /timed command ran|limit hit/, "nothing started while the slot was held");
        releaseHolder();
        assert.equal(await exited, 0, output);
        assert.match(output, /timed command ran/);
        assert.doesNotMatch(output, /limit hit/);
        assert.deepEqual(readdirSync(dir), [], "the runner gave its slot back");
    });

    it("is listed as a globalSetup, caps the Node workers and adds ciReporters(), in every package's vitest config", () => {
        const configs = readdirSync(ROOT, { withFileTypes: true })
            .filter((d) => d.isDirectory() && !d.name.startsWith("."))
            .flatMap((d) =>
                readdirSync(join(ROOT, d.name))
                    .filter((f) => /^vitest\.config\.m?[jt]s$/.test(f))
                    .map((f) => join(d.name, f)),
            );
        assert.ok(configs.length >= 12, `found ${configs.length} configs`);
        // All three come from baseTest() in vitest.base.mjs (tools/vitest-base.test.mjs checks every config imports it).
        const base = readFileSync(join(ROOT, "vitest.base.mjs"), "utf8");
        assert.match(base, /tools\/test-slots\.mjs/, "vitest.base.mjs takes a test slot");
        assert.match(base, /maxWorkers = workerShare\(\)/, "vitest.base.mjs caps the Node workers at workerShare()");
        // The CI JUnit report and the time-budget check (tools/vitest-time-budget.mjs) come from ciReporters().
        assert.match(base, /\.\.\.ciReporters\(/, "vitest.base.mjs adds ciReporters() to the reporters");
        const missing = configs.filter((f) => !/\.\.\.baseTest\(/.test(readFileSync(join(ROOT, f), "utf8")));
        assert.deepEqual(missing, [], "these vitest configs do not spread baseTest() into their test block");
    });
});
