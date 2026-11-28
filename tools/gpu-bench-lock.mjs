/**
 * gpu-bench-lock.mjs -- the machine-wide GPU benchmark lock, taken in arrival order, with a bounded wait, a cap
 * on each hold and a visible queue (issue #10342).
 *
 *   node tools/gpu-bench-lock.mjs [--wait <minutes>] [--cap <minutes>] <command...>
 *   node tools/gpu-bench-lock.mjs status
 *
 * GPU timing runs share one NVIDIA card, so they take turns on one lock file, <main checkout>/tmp/cosmos-impl/
 * gpu-bench.lock (GPU_BENCH_LOCK overrides). Plain `flock <lock> <cmd>` has no order, no limit on a hold and no
 * way to see who holds it: on 2026-11-27 it had 18 waiters and jobs waited for hours. This wrapper:
 *
 *  - Queues in arrival order: a ticket per run in <main checkout>/tmp/gpubench-slots (GRAPHTY_GPUBENCH_SLOTS_DIR
 *    overrides; tools/test-slots.mjs's ticket queue with one slot), holding the run's pid, command and since when.
 *    A ticket whose process is gone is removed by the next run that looks.
 *  - Then takes the same flock, so a run started with plain `flock <lock> ...` still excludes it and is excluded.
 *    Those runs do not queue in order; `status` lists them from /proc/locks.
 *  - Waits at most --wait minutes (default 30) in all: past it, it prints LOCK-TIMEOUT and exits 75 without
 *    running the command.
 *  - Ends the command (SIGTERM to its process group, SIGKILL 10 s later) once it has held the lock for --cap minutes
 *    (default 20), prints CAP and exits 124. The cap is a runaway guard so one hold cannot keep the card for an
 *    hour, not a test timeout: a run that needs longer passes a larger --cap.
 *
 * Exit: the command's exit code, 75 on LOCK-TIMEOUT, 124 on CAP, 2 on a usage error.
 */
import { spawn } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { acquire, liveTickets, slotDir } from "./test-slots.mjs";

export const DEFAULT_WAIT_MIN = 30;
export const DEFAULT_CAP_MIN = 20;
export const LOCK_TIMEOUT_EXIT = 75;
export const CAP_EXIT = 124;
const KILL_GRACE_MS = 10_000;
const POLL_MS = 1000;

export const queueDir = () => slotDir("gpubench");
export const lockPath = () => process.env.GPU_BENCH_LOCK || join(dirname(queueDir()), "cosmos-impl/gpu-bench.lock");

const age = (ms) => (ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60_000)}m`);

function cmdline(pid) {
    try {
        return readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0").filter(Boolean).join(" ").slice(0, 160);
    } catch {
        return "?";
    }
}

// How long a process has run (/proc start time plus boot time), for the plain flock entries in `status`.
function ageOf(pid) {
    try {
        const ticks = Number(
            readFileSync(`/proc/${pid}/stat`, "utf8")
                .replace(/^.*\) /s, "")
                .split(" ")[19],
        );
        const boot = Number(/btime (\d+)/.exec(readFileSync("/proc/stat", "utf8"))[1]);
        return age(Date.now() - (boot * 1000 + ticks * 10));
    } catch {
        return "?";
    }
}

function parentOf(pid) {
    try {
        return Number(
            readFileSync(`/proc/${pid}/stat`, "utf8")
                .replace(/^.*\) /s, "")
                .split(" ")[1],
        );
    } catch {
        return null;
    }
}

/**
 * The processes holding and waiting on the lock's flock, from /proc/locks (Linux only).
 * @param lock the lock file
 * @returns `{ holder, waiters }` pids; empty when the file or /proc/locks is missing
 */
export function flockUsers(lock = lockPath()) {
    let ino;
    let text;
    try {
        ino = statSync(lock).ino;
        text = readFileSync("/proc/locks", "utf8");
    } catch {
        return { holder: null, waiters: [] };
    }
    let holder = null;
    const waiters = [];
    for (const line of text.split("\n")) {
        const m = /^\d+:\s+(->\s+)?FLOCK\s+\S+\s+\S+\s+(\d+)\s+[\da-f]+:[\da-f]+:(\d+)\s/.exec(line);
        if (!m || Number(m[3]) !== ino) continue;
        if (m[1]) waiters.push(Number(m[2]));
        else holder = Number(m[2]);
    }
    return { holder, waiters };
}

/**
 * `status`: the holder and the queue.
 * @param dir the ticket directory
 * @param lock the lock file
 * @returns lines
 */
export function statusLines(dir = queueDir(), lock = lockPath()) {
    let tickets = [];
    try {
        tickets = liveTickets(dir);
    } catch {
        // no directory yet: nobody queued
    }
    const { holder, waiters } = flockUsers(lock);
    const holderParent = holder && parentOf(holder);
    const ours = new Set(tickets.map((t) => t.pid));
    const lines = [`gpu bench lock: ${lock}`];
    tickets.forEach((t, i) => {
        let state = `waits ${i}`;
        if (t.pid === holderParent) state = "holds";
        else if (i === 0) state = "next (waits on the flock)";
        lines.push(`${state}: pid ${t.pid} ${t.label} (${age(Date.now() - t.since)})`);
    });
    if (holder && !ours.has(holderParent))
        lines.push(`holds (plain flock): pid ${holder} (${ageOf(holder)}) ${cmdline(holder)}`);
    const plain = waiters.filter((p) => !ours.has(parentOf(p)));
    for (const p of plain) lines.push(`waits (plain flock, no order): pid ${p} (${ageOf(p)}) ${cmdline(p)}`);
    if (lines.length === 1) lines.push("free: nobody holds or waits");
    return lines;
}

/**
 * Reads `[--wait m] [--cap m] <command...>`.
 * @param argv the arguments after the script
 * @returns `{ waitMin, capMin, cmd }`, or null on a usage error
 */
export function parseArgs(argv) {
    const out = { waitMin: DEFAULT_WAIT_MIN, capMin: DEFAULT_CAP_MIN, cmd: [] };
    let i = 0;
    for (; i < argv.length && argv[i].startsWith("--"); i += 2) {
        const key = { "--wait": "waitMin", "--cap": "capMin" }[argv[i]];
        const n = Number(argv[i + 1]);
        if (!key || Number.isNaN(n) || n <= 0) return null;
        out[key] = n;
    }
    out.cmd = argv.slice(i);
    return out.cmd.length ? out : null;
}

async function run({ waitMin, capMin, cmd }) {
    const say = (line) => process.stderr.write(`gpu-bench-lock: ${line}\n`);
    const deadline = Date.now() + waitMin * 60_000;
    const label = cmd.join(" ").slice(0, 200);
    const timedOut = () => {
        say(`LOCK-TIMEOUT after ${waitMin} min waiting; not run: ${label}. \`node tools/gpu-bench-lock.mjs status\``);
        process.exit(LOCK_TIMEOUT_EXIT);
    };
    const waitTimer = setTimeout(timedOut, waitMin * 60_000);
    const release = await acquire({
        label,
        dir: queueDir(),
        slots: 1,
        env: {},
        kind: "gpu-bench",
        poll: POLL_MS,
        log: () => say("queued behind another GPU timing run; `node tools/gpu-bench-lock.mjs status` shows the line"),
        idle: null,
    });
    clearTimeout(waitTimer);
    process.on("exit", (code) => release(code));
    const left = Math.max(0.1, (deadline - Date.now()) / 1000).toFixed(1);
    // flock holds the lock on an fd every process under it inherits; fd 3 tells us the moment it is taken.
    const script = 'echo held >&3; exec 3>&-; exec "$@"';
    const child = spawn(
        "flock",
        ["-E", String(LOCK_TIMEOUT_EXIT), "-w", left, lockPath(), "sh", "-c", script, "sh", ...cmd],
        { stdio: ["inherit", "inherit", "inherit", "pipe"], detached: true },
    );
    let held = false;
    let capped = false;
    const killGroup = (signal) => {
        try {
            process.kill(-child.pid, signal);
        } catch {
            // already gone
        }
    };
    child.stdio[3].once("data", () => {
        held = true;
        setTimeout(() => {
            capped = true;
            say(`CAP: held the lock for ${capMin} min, ending: ${label}. Pass --cap <minutes> for a longer run.`);
            killGroup("SIGTERM");
            setTimeout(() => killGroup("SIGKILL"), KILL_GRACE_MS).unref();
        }, capMin * 60_000).unref();
    });
    for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        process.on(sig, () => {
            killGroup("SIGTERM");
            process.exit(143);
        });
    }
    child.on("error", (err) => {
        say(err.message);
        process.exit(127);
    });
    child.on("exit", (code, signal) => {
        if (capped) process.exit(CAP_EXIT);
        if (!held && code === LOCK_TIMEOUT_EXIT) timedOut();
        process.exit(code ?? 128 + (signal === "SIGKILL" ? 9 : 15));
    });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
const cliArgs = process.argv.slice(2);
if (isMain && cliArgs[0] === "status") {
    for (const line of statusLines()) console.log(line);
} else if (isMain) {
    const args = parseArgs(cliArgs);
    if (!args) {
        console.error(
            "usage: node tools/gpu-bench-lock.mjs [--wait <minutes>] [--cap <minutes>] <command...> | status",
        );
        process.exit(2);
    }
    await run(args);
}
