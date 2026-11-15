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
// run under tools/low-priority.sh, every waiter here would be in the low lane
delete process.env.BROWSER_SLOT_PRIORITY;
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

test("a planted pool with BROWSER_SLOT_ALSO also waits for, and holds, a slot of that pool", async () => {
    const [planted, machine] = [0, 1].map(() => mkdtempSync(join(tmpdir(), "with-browser-test-")));
    const held = (pool) => spawnSync("flock", ["-n", join(pool, "slot1"), "true"]).status !== 0;
    // the other pool full: its four slots (a command not drawn on the GPU takes one of 1 to 4)
    const hold = [1, 2, 3, 4].flatMap((i) => ["flock", join(machine, `slot${i}`)]);
    const holder = spawn(hold[0], [...hold.slice(1), "sleep", "600"], { stdio: "ignore", detached: true });
    const said = join(planted, "said");
    const go = join(planted, "go");
    spawnSync("mkfifo", [go]);
    try {
        await until(() => spawnSync("flock", ["-n", join(machine, "slot4"), "true"]).status !== 0);
        const env = { ...process.env, BROWSER_SLOT_DIR: planted, BROWSER_SLOTS: "1", BROWSER_SLOT_ALSO: machine };
        // the command says which slot it holds, then runs until the test lets it go
        const w = spawn(gate, ["sh", "-c", `echo "$BROWSER_SLOT_FILE" > ${said}; read x < ${go}`], {
            env,
            stdio: "ignore",
        });
        const done = new Promise((ok) => w.on("exit", ok));
        // its own slot taken, it queues in the other pool and runs nothing while that one is full
        await until(() => existsSync(join(machine, "queue")) && readdirSync(join(machine, "queue")).length === 1);
        assert.ok(held(planted), "the planted slot was let go while waiting");
        assert.ok(!existsSync(said), "the command ran with the other pool full");
        process.kill(-holder.pid);
        await until(() => existsSync(said) && readFileSync(said, "utf8").trim());
        assert.equal(readFileSync(said, "utf8").trim(), join(machine, "slot1"));
        assert.ok(held(planted) && held(machine), "a slot was let go while the command ran");
        writeFileSync(go, "\n");
        assert.equal(await done, 0);
        assert.ok(!held(planted) && !held(machine), "a slot outlived the command");
    } finally {
        try {
            process.kill(-holder.pid);
        } catch {
            // already let go
        }
        for (const p of [planted, machine]) rmSync(p, { recursive: true, force: true });
    }
});

test("a warm browser of --prove's warm-pool check (REAL_WARM_HOLD=1) waits in the queue for a slot", async () => {
    // in try mode it gave up at once with every spare slot busy, so the check's verdict followed how
    // busy the machine was, not whether a warm browser is taken over
    const pool = mkdtempSync(join(tmpdir(), "with-browser-test-"));
    const build = mkdtempSync(join(tmpdir(), "with-browser-build-"));
    const holder = spawn("flock", [join(pool, "slot1"), "sleep", "600"], { stdio: "ignore", detached: true });
    const queue = join(pool, "queue");
    const tickets = () => (existsSync(queue) ? readdirSync(queue) : []);
    try {
        await until(() => spawnSync("flock", ["-n", join(pool, "slot1"), "true"]).status !== 0);
        // an --end that names its build tops the warm pool up; the session it names does not exist
        const real = join(dirname(gate), "real.mjs");
        const env = {
            ...process.env,
            BROWSER_SLOT_DIR: pool,
            BROWSER_SLOTS: "1",
            REAL_DIST: build,
            REAL_WARM_POOL: "1",
            REAL_WARM_HOLD: "1",
        };
        const r = spawnSync(process.execPath, [real, "--end", join(build, "no-session")], { env, encoding: "utf8" });
        assert.equal(r.status, 0, r.stderr);
        await until(() => tickets().length > 0);
        assert.equal(tickets().length, 1);
    } finally {
        for (const t of tickets()) {
            try {
                process.kill(-Number(t.split("-").pop()));
            } catch {
                // already gone
            }
        }
        try {
            process.kill(-holder.pid);
        } catch {
            // already let go
        }
        for (const p of [pool, build]) rmSync(p, { recursive: true, force: true });
    }
});

test("the studio's waits keep the shared gate's lanes: a low-lane waiter never holds up an ordinary one, a high mark holds both", async () => {
    // the studio's own copy of the gate let only the oldest ticket look, so a low-lane waiter for slots
    // 4 to 8 kept an ordinary one from a free slot 1, and it never looked at the high lane's marks
    const pool = mkdtempSync(join(tmpdir(), "with-browser-test-"));
    const holders = [4, 5, 6, 7, 8].map((i) =>
        spawn("flock", [join(pool, `slot${i}`), "sleep", "600"], { stdio: "ignore", detached: true }),
    );
    const env = { ...process.env, BROWSER_SLOT_DIR: pool, BROWSER_GPU: "1" };
    const high = join(pool, `.high-${process.pid}`);
    let low;
    try {
        await until(() => spawnSync("flock", ["-n", join(pool, "slot8"), "true"]).status !== 0);
        low = spawn(gate, ["true"], { env: { ...env, BROWSER_SLOT_PRIORITY: "low" }, stdio: "ignore" });
        await until(() => readdirSync(pool).some((f) => f.startsWith(".low-")));
        writeFileSync(high, "");
        const said = join(pool, "said");
        const ordinary = spawn(
            gate,
            ["sh", "-c", `cp "$BROWSER_SLOT_FILE.holder" ${said}.holder; echo $BROWSER_SLOT > ${said}`],
            { env },
        );
        let err = "";
        ordinary.stderr.on("data", (d) => (err += d));
        const done = new Promise((ok) => ordinary.on("exit", ok));
        await until(() => /waiting for one of 8 browser slots/.test(err));
        assert.ok(!existsSync(said), "an ordinary waiter took a slot while a high-lane mark was live");
        rmSync(high);
        assert.equal(await done, 0, err);
        assert.equal(readFileSync(said, "utf8").trim(), "1");
        assert.match(readFileSync(`${said}.holder`, "utf8"), /^\d+ \S+ .* :: sh -c cp /);
    } finally {
        low?.kill("SIGTERM");
        for (const h of holders) process.kill(-h.pid);
        rmSync(pool, { recursive: true, force: true });
    }
});
