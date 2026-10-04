/**
 * Process identity (design section 5.8). A pid alone is never trusted: pids are reused, and after a
 * container restart every recorded pid may name an unrelated process. A recorded process is
 * `{pid, startTime, bootId}`, and it is the same process only if all three still match.
 *
 * A container restart keeps the boot id (the host did not reboot) but gives PID 1 a new start time
 * (evidence/platform-facts.md section 8.3), so `containerStart` is what tells the daemon that every
 * pid and tmux pane it recorded is void.
 */

import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

/** @typedef {{pid: number, startTime: string, bootId: string}} ProcessIdentity */

/**
 * The kernel boot id, which changes on every boot (and every container host reboot).
 * @returns {string} the boot id
 */
export function bootId() {
    return readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
}

/**
 * Identifies a live process.
 * @param {number} pid the process id
 * @returns {ProcessIdentity | null} its identity, or null when no such process exists
 */
export function identify(pid) {
    let stat;
    try {
        stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    } catch (err) {
        if (err.code === "ENOENT" || err.code === "ESRCH") return null;
        throw err;
    }
    // Field 2 (the command name) is parenthesized and may contain spaces and parentheses, so
    // count fields from the last ")". What follows starts at field 3; field 22 is the start time
    // in clock ticks since boot.
    const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    return { pid, startTime: fields[22 - 3], bootId: bootId() };
}

/**
 * Whether a recorded process is still the same process.
 * @param {ProcessIdentity} record the identity recorded when the process was started
 * @param {{cmdlineIncludes?: string}} [options] also require the command line to contain this text
 *   (a run's id, for runs)
 * @returns {boolean} true only if pid, start time and boot id all match (and the command line, when
 *   asked)
 */
export function sameProcess(record, { cmdlineIncludes } = {}) {
    const now = identify(record.pid);
    if (now?.startTime !== record.startTime || now?.bootId !== record.bootId) return false;
    if (cmdlineIncludes === undefined) return true;
    let cmdline;
    try {
        cmdline = readFileSync(`/proc/${record.pid}/cmdline`, "utf8");
    } catch {
        return false;
    }
    return cmdline.split("\0").join(" ").includes(cmdlineIncludes);
}

/**
 * When this container's PID 1 started, in clock ticks since the host booted. It changes on every
 * container restart and every host reboot.
 * @returns {string | null} the start time, or null when PID 1 cannot be read
 */
export function containerStart() {
    try {
        return identify(1)?.startTime ?? null;
    } catch {
        return null;
    }
}

/** Pushes `tools/push-queue.sh` lets run at once unless `PUSH_QUEUE_SLOTS` says otherwise. */
const PUSH_QUEUE_SLOTS = 3;

/**
 * The push queue every session pushes through (`tools/push-queue.sh`, design section 4.8): its
 * tickets in `tmp/push-queue/` of the main checkout, each named `<rank>-<arrival ns>-<pid>` and
 * holding `<cwd> :: <command>`. A ticket whose process is gone is dropped, as the script drops it;
 * the first three live ones, critical first, then by arrival, are running.
 * @param {string} root the main checkout
 * @returns {{holder: string | null, waiters: number}} the running pushes' worktrees (null when none
 *   runs), and the number waiting behind them
 */
export function pushQueueTickets(root) {
    const dir = join(root, "tmp", "push-queue");
    let names;
    try {
        names = readdirSync(dir);
    } catch {
        return { holder: null, waiters: 0 };
    }
    const live = names
        .map((name) => {
            const parts = name.split("-");
            // A ticket from before ranks existed is `<ns>-<pid>`, a normal push.
            const [rank, at, pid] = parts.length === 2 ? ["1", ...parts] : parts;
            return { name, rank: Number(rank), at: BigInt(at), pid: Number(pid) };
        })
        .filter((t) => Number.isInteger(t.pid) && alive(t.pid))
        .sort((a, b) => a.rank - b.rank || (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
    const running = live.slice(0, PUSH_QUEUE_SLOTS).map((t) => {
        const cwd = (readFileSync(join(dir, t.name), "utf8").split(" :: ")[0] ?? "").trim();
        return `pid ${t.pid} (${basename(cwd)})`;
    });
    return { holder: running.length ? running.join(", ") : null, waiters: Math.max(0, live.length - PUSH_QUEUE_SLOTS) };
}

/**
 * Whether a process exists.
 * @param {number} pid the process id
 * @returns {boolean} true while it runs
 */
function alive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (err) {
        return /** @type {NodeJS.ErrnoException} */ (err).code === "EPERM";
    }
}
