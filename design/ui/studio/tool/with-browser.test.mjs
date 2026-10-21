// node --test design/ui/studio/tool/with-browser.test.mjs
// The browser gate with no browser: waiting starts take the slot in the order they asked for it
// (round 1's tool dry run 2 saw one start wait 14 minutes while later ones got slots), a waiter that
// died leaves no ticket in the way, and bars.mjs is passed through without holding a slot.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const gate = join(dirname(fileURLToPath(import.meta.url)), "with-browser.sh");
const until = async (cond) => {
    while (!cond()) await new Promise((ok) => setTimeout(ok, 50));
};

test("waiting starts get the one slot first come, first served; a dead waiter is skipped", async () => {
    const pool = mkdtempSync(join(tmpdir(), "with-browser-test-"));
    const env = { ...process.env, BROWSER_SLOT_DIR: pool, BROWSER_SLOTS: "1" };
    const order = join(pool, "order");
    // flock hands its lock to the sleep it runs, so the holder is let go by its process group
    const holder = spawn("flock", [join(pool, "slot1"), "sleep", "600"], { stdio: "ignore", detached: true });
    try {
        await until(() => spawnSync("flock", ["-n", join(pool, "slot1"), "true"]).status !== 0);
        const tickets = () => (existsSync(join(pool, "queue")) ? readdirSync(join(pool, "queue")).length : 0);
        const waiters = [];
        // each asks only once the one before it holds its ticket, so the asking order is known
        for (const n of ["one", "dead", "two", "three"]) {
            const before = tickets();
            const w = spawn(gate, ["sh", "-c", `echo ${n} >> ${order}`], { env, stdio: "ignore" });
            waiters.push(new Promise((ok) => w.on("exit", ok)));
            await until(() => tickets() > before);
            // killed while it waits: its ticket must not hold up the ones behind it
            if (n === "dead") {
                w.kill("SIGKILL");
                waiters.pop();
            }
        }
        process.kill(-holder.pid);
        await Promise.all(waiters);
        assert.deepEqual(readFileSync(order, "utf8").trim().split("\n"), ["one", "two", "three"]);
        assert.equal(tickets(), 0, "a ticket was left in the queue");
    } finally {
        try {
            process.kill(-holder.pid);
        } catch {
            // already let go
        }
        rmSync(pool, { recursive: true, force: true });
    }
});

test("bars.mjs runs at once with every slot full, holding none (its sessions take their own)", async () => {
    const pool = mkdtempSync(join(tmpdir(), "with-browser-test-"));
    const holder = spawn("flock", [join(pool, "slot1"), "sleep", "600"], { stdio: "ignore", detached: true });
    try {
        await until(() => spawnSync("flock", ["-n", join(pool, "slot1"), "true"]).status !== 0);
        const env = { ...process.env, BROWSER_SLOT_DIR: pool, BROWSER_SLOTS: "1" };
        // a stand-in command whose words name bars.mjs, as "node .../bars.mjs <out> --tier 3" does
        const r = spawnSync(gate, ["sh", "-c", 'echo "slot=${BROWSER_SLOT:-none}"', "bars.mjs", "--tier", "3"], {
            env,
            encoding: "utf8",
        });
        assert.equal(r.status, 0, r.stderr);
        assert.equal(r.stdout.trim(), "slot=none");
        // its tier 1 screens (--inner) still wait for the slot: a ticket, then the slot once it frees
        const inner = spawn(gate, ["sh", "-c", 'echo "slot=$BROWSER_SLOT"', "bars.mjs", "--inner"], { env });
        let said = "";
        inner.stdout.on("data", (d) => (said += d));
        await until(() => existsSync(join(pool, "queue")) && readdirSync(join(pool, "queue")).length === 1);
        assert.equal(said, "", "bars.mjs --inner ran with every slot full");
        process.kill(-holder.pid);
        await new Promise((ok) => inner.on("exit", ok));
        assert.equal(said.trim(), "slot=1");
    } finally {
        try {
            process.kill(-holder.pid);
        } catch {
            // already let go
        }
        rmSync(pool, { recursive: true, force: true });
    }
});

test("a GPU command may take slots 5 to 8; any other waits behind the four", async () => {
    const pool = mkdtempSync(join(tmpdir(), "with-browser-test-"));
    const holders = [1, 2, 3, 4].map((i) =>
        spawn("flock", [join(pool, `slot${i}`), "sleep", "600"], { stdio: "ignore", detached: true }),
    );
    try {
        await until(() =>
            [1, 2, 3, 4].every((i) => spawnSync("flock", ["-n", join(pool, `slot${i}`), "true"]).status !== 0),
        );
        const gpu = spawnSync(gate, ["sh", "-c", 'echo "$BROWSER_SLOT"'], {
            env: { ...process.env, BROWSER_SLOT_DIR: pool, BROWSER_GPU: "1" },
            encoding: "utf8",
        });
        assert.equal(gpu.status, 0, gpu.stderr);
        assert.equal(gpu.stdout.trim(), "5");
        // the same command drawn in software queues for one of the four
        const sw = spawn(gate, ["true"], { env: { ...process.env, BROWSER_SLOT_DIR: pool }, stdio: "ignore" });
        await until(() => existsSync(join(pool, "queue")) && readdirSync(join(pool, "queue")).length === 1);
        sw.kill("SIGTERM");
        await new Promise((ok) => sw.on("exit", ok));
    } finally {
        for (const h of holders) process.kill(-h.pid);
        rmSync(pool, { recursive: true, force: true });
    }
});

test("the try mode takes only a spare slot above 4, at once, and never while a start waits", () => {
    const pool = mkdtempSync(join(tmpdir(), "with-browser-test-"));
    const env = { ...process.env, BROWSER_SLOT_DIR: pool, BROWSER_GPU: "1", BROWSER_SLOT_TRY: "1" };
    try {
        // every slot free: it takes the highest, leaving 1 to 4 to the shared users
        let r = spawnSync(gate, ["sh", "-c", 'echo "$BROWSER_SLOT"'], { env, encoding: "utf8" });
        assert.equal(r.status, 0, r.stderr);
        assert.equal(r.stdout.trim(), "8");
        // a start waiting in the queue: the try mode gives up at once
        mkdirSync(join(pool, "queue"), { recursive: true });
        writeFileSync(join(pool, "queue", `1-${process.pid}`), "");
        r = spawnSync(gate, ["true"], { env, encoding: "utf8" });
        assert.equal(r.status, 75);
        rmSync(join(pool, "queue", `1-${process.pid}`));
        // only slots 1 to 4 to take: it gives up rather than take a shared one
        r = spawnSync(gate, ["true"], { env: { ...env, BROWSER_SLOTS: "4" }, encoding: "utf8" });
        assert.equal(r.status, 75);
    } finally {
        rmSync(pool, { recursive: true, force: true });
    }
});

test("BROWSER_SLOTS above 16 is refused", () => {
    const r = spawnSync(gate, ["true"], { env: { ...process.env, BROWSER_SLOTS: "17" }, encoding: "utf8" });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /1 to 16/);
});
