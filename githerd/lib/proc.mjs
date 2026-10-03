/**
 * Process identity (design section 5.8). A pid alone is never trusted: pids are reused, and after a
 * container restart every recorded pid may name an unrelated process. A recorded process is
 * `{pid, startTime, bootId}`, and it is the same process only if all three still match.
 *
 * A container restart keeps the boot id (the host did not reboot) but gives PID 1 a new start time
 * (evidence/platform-facts.md section 8.3), so `containerStart` is what tells the daemon that every
 * pid and tmux pane it recorded is void.
 */

import { readFileSync } from "node:fs";

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
