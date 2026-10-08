#!/usr/bin/env node
/**
 * test-slots.mjs -- a machine-wide limit on how many test runs execute at once (issue #1316).
 *
 * Several sessions share one dev machine. Each pre-push gate runs several vitest shards side by side,
 * and agents run test suites of their own besides, so the machine ran two to four times more test
 * work than it has cores and tests whose own work is a large part of their time limit failed at
 * random. Every vitest run therefore takes one of GRAPHTY_TEST_SLOTS slots before its tests start
 * (default: one per 8 cores, at least 2 -- 4 on a 32-thread machine) and gives it back
 * when it ends. A browser run and a Node run count the same: a Node run forks one worker per core,
 * so it can fill the machine on its own while it runs; a browser run uses fewer cores at a time
 * (Chromium, its GPU process and SwiftShader) but for longer.
 *
 * How it is taken:
 *  - As a vitest globalSetup: every package's vitest config lists this file, so every `vitest run`
 *    in every package waits for a slot without anyone remembering to. Watch mode (an interactive
 *    developer) does not take one.
 *  - As a command wrapper: `node tools/test-slots.mjs <command...>` holds one slot for the whole
 *    command. tools/prepush-tests.mjs wraps each gate shard in it, so a shard's several vitest runs
 *    share one slot and its wait does not count against the shard's time limit.
 *
 * Mechanism: a directory of tickets (<main checkout>/tmp/test-slots, shared by every worktree), one
 * per run, named by arrival time and pid. A run proceeds once its ticket is among the oldest
 * GRAPHTY_TEST_SLOTS live tickets, so runs start in arrival order. A ticket whose process is gone
 * (killed, crashed) is removed by the next run that looks, so a killed run never keeps its slot.
 *
 * It never deadlocks:
 *  - A run inside a run that holds a slot (a test that runs vitest, a shard's second vitest
 *    command) does not take another: it finds GRAPHTY_TEST_SLOT_HELD in its environment, or, on
 *    Linux, an ancestor process holding a ticket. Only a holder ever waits on nothing else.
 *  - A gate shard that needs a browser takes the browser slot (tmp/with-browser.sh) BEFORE this
 *    one, and nothing holding a test slot ever waits for a browser slot, so the two never wait on
 *    each other. The push queue is outside both.
 *  - Liveness is a signal-0 check of the pid plus its start time from /proc, never pgrep (whose
 *    pattern matches its own command line).
 *
 * Off on GitHub Actions (GITHUB_ACTIONS=true: one job per runner, nothing to share) and when
 * GRAPHTY_TEST_SLOTS=0. Not keyed on CI: tools/run-tests.sh sets CI=true for every local shard.
 */

import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Set in the environment of everything a slot holder runs, so a nested run takes no second slot. */
export const HELD = "GRAPHTY_TEST_SLOT_HELD";

/**
 * How many runs may hold a slot at once.
 * @param env the environment (GRAPHTY_TEST_SLOTS)
 * @param cores the machine's cores
 * @returns the slot count; 0 means no limit
 */
export function slotCount(env = process.env, cores = availableParallelism()) {
    const set = env.GRAPHTY_TEST_SLOTS;
    if (set === undefined || set === "") {
        return Math.max(2, Math.floor(cores / 8));
    }
    const n = Number(set);
    if (!Number.isInteger(n) || n < 0) {
        throw new Error(`GRAPHTY_TEST_SLOTS must be a whole number (0 turns the limit off), not "${set}"`);
    }
    return n;
}

/**
 * The ticket directory: GRAPHTY_TEST_SLOTS_DIR, else the main checkout's tmp/test-slots (every
 * worktree shares it), else one under the system temp directory.
 * @returns an absolute path
 */
export function slotDir() {
    if (process.env.GRAPHTY_TEST_SLOTS_DIR) {
        return process.env.GRAPHTY_TEST_SLOTS_DIR;
    }
    try {
        const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
            cwd: dirname(fileURLToPath(import.meta.url)),
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
        return join(dirname(common), "tmp/test-slots");
    } catch {
        return join(tmpdir(), "graphty-test-slots");
    }
}

/**
 * A process's fields from /proc/<pid>/stat after the command name.
 * @param pid the process
 * @returns the fields, or null off Linux or once it is gone
 */
function statOf(pid) {
    try {
        return readFileSync(`/proc/${pid}/stat`, "utf8")
            .replace(/^.*\) /s, "")
            .split(" ");
    } catch {
        return null;
    }
}

/**
 * A process's start time, so a reused pid is not taken for the holder.
 * @param pid the process
 * @returns clock ticks since boot, or null
 */
const startOf = (pid) => statOf(pid)?.[19] ?? null;

/**
 * Whether a ticket's process still runs.
 * @param ticket a parsed ticket
 * @returns true while its process (the same one, not a reuse of its pid) is alive
 */
function alive(ticket) {
    try {
        process.kill(ticket.pid, 0);
    } catch (err) {
        if (err.code === "ESRCH") {
            return false;
        }
    }
    const start = startOf(ticket.pid);
    return ticket.start === null || start === null || start === ticket.start;
}

/**
 * The live tickets, oldest first; tickets of dead processes are removed.
 * @param dir the ticket directory
 * @returns `{ name, pid, start, label, since }` per ticket
 */
export function liveTickets(dir) {
    const live = [];
    for (const name of readdirSync(dir)
        .filter((f) => !f.startsWith("."))
        .sort()) {
        let ticket;
        try {
            ticket = { name, ...JSON.parse(readFileSync(join(dir, name), "utf8")) };
        } catch {
            continue; // removed under us
        }
        if (alive(ticket)) {
            live.push(ticket);
        } else {
            rmSync(join(dir, name), { force: true });
        }
    }
    return live;
}

/**
 * The pids of a process's ancestors.
 * @param pid the process
 * @returns its ancestors (empty off Linux)
 */
function ancestors(pid) {
    const out = new Set();
    for (let p = Number(statOf(pid)?.[1]); p > 1 && !out.has(p); p = Number(statOf(p)?.[1])) {
        out.add(p);
    }
    return out;
}

const age = (ms) => (ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60_000)}m`);

/**
 * Wait for a slot.
 * @param options the run
 * @param options.label what the run is, for the waiting message of others
 * @param options.dir the ticket directory
 * @param options.slots the slot count (0: no limit)
 * @param options.pid the holding process
 * @param options.env its environment (HELD)
 * @param options.poll milliseconds between looks
 * @param options.log where the one waiting line goes
 * @returns a function that gives the slot back (a no-op when none was taken)
 */
export async function acquire({
    label,
    dir = slotDir(),
    slots = slotCount(),
    pid = process.pid,
    env = process.env,
    poll = 2000,
    log = (line) => process.stderr.write(`${line}\n`),
}) {
    const none = () => {};
    if (slots === 0 || env[HELD]) {
        return none;
    }
    mkdirSync(dir, { recursive: true });
    const mine = ancestors(pid).add(pid);
    if (liveTickets(dir).some((t) => mine.has(t.pid))) {
        return none; // this process or one it runs under already holds a slot
    }
    const name = `${String(Date.now()).padStart(15, "0")}-${String(pid).padStart(8, "0")}`;
    const tmp = join(dir, `.${name}`);
    writeFileSync(tmp, JSON.stringify({ pid, start: startOf(pid), label, since: Date.now() }));
    renameSync(tmp, join(dir, name)); // whole or not at all, for readers
    const release = () => rmSync(join(dir, name), { force: true });
    let told = false;
    for (;;) {
        const live = liveTickets(dir);
        const at = live.findIndex((t) => t.name === name);
        if (at === -1) {
            // Our ticket is gone (a cleanup removed the directory): queue again at the back.
            return acquire({ label, dir, slots, pid, env, poll, log });
        }
        if (at < slots) {
            return release;
        }
        if (!told) {
            told = true;
            const holders = live
                .slice(0, slots)
                .map((t) => `pid ${t.pid} ${t.label} (${age(Date.now() - t.since)})`)
                .join("; ");
            log(
                `test-slots: waiting for one of ${slots} machine-wide test slots, ${at - slots} run(s) ahead; ` +
                    `held by: ${holders}. GRAPHTY_TEST_SLOTS sets the count.`,
            );
        }
        await new Promise((r) => setTimeout(r, poll));
    }
}

/**
 * What this process is, for the message other runs print while they wait.
 * @param argv its command
 * @returns the directory and the command, shortened
 */
function labelOf(argv) {
    const words = argv.map((a) => basename(a)).join(" ");
    const short = words.length > 100 ? words.slice(0, 97) + "..." : words;
    return `${basename(process.cwd())}: ${short}`;
}

const off = () => process.env.GITHUB_ACTIONS === "true";

/**
 * The vitest globalSetup: hold a slot for the run, give it back at teardown or exit.
 * @param project the vitest TestProject
 * @returns the teardown
 */
export default async function setup(project) {
    if (off() || project?.vitest?.config?.watch) {
        return undefined;
    }
    const release = await acquire({ label: labelOf(["vitest", ...process.argv.slice(2)]) });
    process.on("exit", release);
    process.env[HELD] = String(process.pid);
    return release;
}

// The command wrapper: node tools/test-slots.mjs <command...>
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const [cmd, ...args] = process.argv.slice(2);
    if (!cmd) {
        console.error("usage: node tools/test-slots.mjs <command...>");
        process.exit(2);
    }
    const release = off() ? () => {} : await acquire({ label: labelOf([cmd, ...args]) });
    process.on("exit", release);
    const child = spawn(cmd, args, { stdio: "inherit", env: { ...process.env, [HELD]: String(process.pid) } });
    child.on("error", (err) => {
        console.error(`test-slots: ${err.message}`);
        process.exit(127);
    });
    child.on("exit", (code, signal) => process.exit(code ?? (signal ? 128 : 1)));
}
