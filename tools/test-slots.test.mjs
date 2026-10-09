// Tests of tools/test-slots.mjs, the machine-wide limit on concurrent test runs: a slot is taken and
// given back, waiters start in arrival order, a dead holder's slot is reclaimed, a nested run takes
// no second slot, the GPU browser runner queues before its time limit starts, and every package's
// vitest config takes a slot.
//
//   node --test tools/test-slots.test.mjs
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { acquire, HELD, liveTickets, slotCount } from "./test-slots.mjs";

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

const fresh = () => mkdtempSync(join(tmpdir(), "test-slots-"));
const quiet = { env: {}, poll: 10, log: () => {} };
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));
// Whether a promise has settled within a few polls.
async function settled(promise) {
    let done = false;
    promise.then(() => (done = true));
    await tick(100);
    return done;
}

describe("test-slots", () => {
    it("lets `slots` runs hold at once, makes the next wait with one line naming the holders, and gives the slot back", async () => {
        const dir = fresh();
        const [a, b, c] = [sleeper(), sleeper(), sleeper()];
        const releaseA = await acquire({ ...quiet, dir, slots: 2, pid: a.pid, label: "run a" });
        await tick();
        await acquire({ ...quiet, dir, slots: 2, pid: b.pid, label: "run b" });
        const lines = [];
        const third = acquire({ ...quiet, dir, slots: 2, pid: c.pid, label: "run c", log: (l) => lines.push(l) });
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
        await tick();
        const first = acquire({ ...quiet, dir, slots: 1, pid: w1.pid, label: "first" });
        await tick();
        const second = acquire({ ...quiet, dir, slots: 1, pid: w2.pid, label: "second" });
        releaseH();
        assert.equal(await settled(first), true);
        assert.equal(await settled(second), false, "the later run still waits");
        (await first)();
        assert.equal(await settled(second), true);
    });

    it("reclaims the slot of a run that was killed without giving it back", async () => {
        const dir = fresh();
        const [doomed, waiter] = [sleeper(), sleeper()];
        await acquire({ ...quiet, dir, slots: 1, pid: doomed.pid, label: "killed" });
        const next = acquire({ ...quiet, dir, slots: 1, pid: waiter.pid, label: "next" });
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
        const nested = acquire({ ...quiet, dir, slots: 1, pid: child.pid, label: "nested" });
        assert.equal(await settled(nested), true, "a process under a holder does not wait");
        const flagged = acquire({ ...quiet, dir, slots: 1, pid: sleeper().pid, env: { [HELD]: "1" }, label: "x" });
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

    it("wraps a command: holds a slot while it runs, marks its environment, passes its exit code", () => {
        const dir = fresh();
        const r = spawnSync(
            process.execPath,
            [SCRIPT, process.execPath, "-e", `console.log(process.env.${HELD}); process.exit(3)`],
            { encoding: "utf8", env: { ...process.env, GRAPHTY_TEST_SLOTS_DIR: dir, GITHUB_ACTIONS: "" } },
        );
        assert.equal(r.status, 3);
        assert.match(r.stdout, /^\d+\n$/);
        assert.deepEqual(readdirSync(dir), [], "the slot was given back");
    });

    it("takes the slot before the GPU browser runner's time limit starts, so the wait never counts against it", async () => {
        const dir = fresh();
        const holder = sleeper();
        const releaseHolder = await acquire({ ...quiet, dir, slots: 1, pid: holder.pid, label: "holder" });
        // The timed command takes a slot the way vitest does: if the runner did not hold one, it would queue
        // behind the holder inside the 1 s limit and be killed.
        const command = [process.execPath, SCRIPT, process.execPath, "-e", "console.log('timed command ran')"];
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
        // Someone has queued behind the holder: the runner itself, or (were it not holding the slot) its command.
        while (liveTickets(dir).length < 2) {
            await tick(20);
        }
        // Queued for longer than the limit.
        await tick(1500);
        assert.doesNotMatch(output, /timed command ran|limit hit/, "nothing started while the slot was held");
        releaseHolder();
        assert.equal(await exited, 0, output);
        assert.match(output, /timed command ran/);
        assert.doesNotMatch(output, /limit hit/);
        assert.deepEqual(readdirSync(dir), [], "the runner gave its slot back");
    });

    it("is listed as a globalSetup by every package's vitest config", () => {
        const configs = readdirSync(ROOT, { withFileTypes: true })
            .filter((d) => d.isDirectory() && !d.name.startsWith("."))
            .flatMap((d) =>
                readdirSync(join(ROOT, d.name))
                    .filter((f) => /^vitest\.config\.m?[jt]s$/.test(f))
                    .map((f) => join(d.name, f)),
            );
        assert.ok(configs.length >= 12, `found ${configs.length} configs`);
        const missing = configs.filter((f) => !readFileSync(join(ROOT, f), "utf8").includes("../tools/test-slots.mjs"));
        assert.deepEqual(missing, [], "these vitest configs do not take a test slot");
    });
});
