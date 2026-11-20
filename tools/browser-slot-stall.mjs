/**
 * browser-slot-stall.mjs -- finds a browser slot holder that has stopped making progress, so a waiter of
 * tools/with-browser.sh can say so loudly instead of waiting in silence.
 *
 * On 2026-11-19 a hung command held browser slot 4 for 16 hours and three dry runs queued behind it for over
 * 3 hours with nobody told (#9046). A holder counts as stalled when, for `ms`, its whole process tree has used
 * under `ms / 60` of CPU (10 s in 10 minutes, as test-slots.mjs's IDLE) and its standard output and error
 * have not been written. Nothing here ends the holder or frees its slot: the holder may be another session's
 * work, and only a person decides it is dead. It is reported, nothing more.
 *
 * What a holder did since it was last looked at is kept beside its slot (<slot dir>/slotN.progress), so every
 * waiter, however recently it began, sees the same "no progress since". The first waiter to find a holder
 * stalled writes one "browser-slot-stalled" line to the wait log (tools/wait-log.mjs): start is the holder's
 * last progress, waiter the holder's checkout and command, heldBy its holder line.
 *
 * Usage (tools/with-browser.sh runs it while it waits):
 *   node tools/browser-slot-stall.mjs <slot dir> <slots> [<stall seconds, default 600>]
 * prints one line per stalled holder and exits 0.
 */

import { readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { treeCpuMs } from "./test-slots.mjs";
import { logWait } from "./wait-log.mjs";

/**
 * When the holder's standard output or error was last written.
 * @param pid the holder
 * @returns epoch milliseconds, or 0 when neither can be read
 */
function outputAt(pid) {
    let at = 0;
    for (const fd of [1, 2]) {
        try {
            at = Math.max(at, statSync(`/proc/${pid}/fd/${fd}`).mtimeMs);
        } catch {
            // closed, gone, or not ours to read
        }
    }
    return at;
}

const readJson = (file) => {
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    } catch {
        return null;
    }
};

/**
 * What is known about a holder after one more look.
 * @param prev the state before (null when there was none)
 * @param fresh the state of a holder that made progress at this look
 * @param ms how long without progress counts as stalled
 * @returns prev when the holder made no progress since, else fresh
 */
function nextState(prev, fresh, ms) {
    if (prev?.pid !== fresh.pid) return fresh;
    // A child that exited before its parent reaped it takes its time out of the sum: count again from there.
    const progressed = fresh.cpuMs - prev.cpuMs >= ms / 60 || fresh.cpuMs < prev.cpuMs || fresh.out > prev.out;
    return progressed ? fresh : prev;
}

/**
 * Looks at every slot's holder once and records what it did since the last look.
 * @param options the slots and the readers
 * @param options.dir the slot directory
 * @param options.slots how many slots to look at
 * @param [options.ms] how long without progress counts as stalled
 * @param [options.now] the time of this look
 * @param [options.cpu] reads a process tree's CPU time (milliseconds, null once gone)
 * @param [options.output] reads when a process last wrote its output (epoch milliseconds)
 * @returns the stalled holders: slot, pid, cwd, command, ageMs, idleMs, since, holder line, and first (true
 *   for the look that found it stalled first)
 */
export function stalledSlots({ dir, slots, ms = 600_000, now = Date.now(), cpu = treeCpuMs, output = outputAt }) {
    const stalled = [];
    for (let slot = 1; slot <= slots; slot++) {
        let line;
        try {
            line = readFileSync(`${dir}/slot${slot}.holder`, "utf8").split("\n")[0];
        } catch {
            continue;
        }
        const m = /^(\d+) (\S+) (.*?) :: (.*)$/.exec(line);
        if (!m) continue;
        const pid = Number(m[1]);
        const used = cpu(pid);
        if (used === null) continue;
        const out = output(pid);
        const file = `${dir}/slot${slot}.progress`;
        const state = nextState(readJson(file), { pid, cpuMs: used, out, busyAt: now, reported: false }, ms);
        const idleMs = now - state.busyAt;
        let first = false;
        if (idleMs >= ms) {
            first = !state.reported;
            state.reported = true;
            const started = Date.parse(m[2]);
            stalled.push({
                slot,
                pid,
                cwd: m[3],
                command: m[4],
                ageMs: Number.isNaN(started) ? null : now - started,
                idleMs,
                since: state.busyAt,
                holder: line,
                first,
            });
        }
        try {
            writeFileSync(file, JSON.stringify(state));
        } catch {
            // the next look starts again; a stall is reported late, never wrongly
        }
    }
    return stalled;
}

const minutes = (msValue) => `${Math.round(msValue / 60_000)} min`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const [dir, slots, seconds = "600"] = process.argv.slice(2);
    if (!dir || !/^\d+$/.test(slots ?? "") || !/^\d+(\.\d+)?$/.test(seconds)) {
        console.error("usage: node tools/browser-slot-stall.mjs <slot dir> <slots> [<stall seconds>]");
        process.exit(2);
    }
    for (const s of stalledSlots({ dir, slots: Number(slots), ms: Number(seconds) * 1000 })) {
        console.log(
            `with-browser: STUCK? browser slot ${s.slot} holder pid ${s.pid} has made no progress (no CPU, no output) ` +
                `for ${minutes(s.idleMs)}; held for ${s.ageMs === null ? "?" : minutes(s.ageMs)} by ${s.cwd} :: ${s.command}. ` +
                `It is not stopped for you: ask its session, or end it if it is yours.`,
        );
        if (s.first) {
            logWait({
                kind: "browser-slot-stalled",
                start: s.since,
                waiter: `${s.cwd} :: ${s.command}`,
                heldBy: [s.holder],
                extra: { slot: s.slot, pid: s.pid, ageMs: s.ageMs },
            });
        }
    }
}
