/**
 * Process identity (design section 5.8). A pid alone is never trusted: pids are reused, and after a
 * container restart every recorded pid may name an unrelated process. A recorded process is
 * `{pid, startTime, bootId}`, and it is the same process only if all three still match.
 *
 * A container restart keeps the boot id (the host did not reboot) but gives PID 1 a new start time
 * (evidence/platform-facts.md section 8.3), so `containerStart` is what tells the daemon that every
 * pid and tmux pane it recorded is void.
 */

import { readdirSync, readFileSync, readlinkSync } from "node:fs";
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

/**
 * Reads a file under `/proc`, or null when the process or file is gone or not ours.
 * @param {string} path the path
 * @returns {string | null} the text
 */
function readProc(path) {
    try {
        return readFileSync(path, "utf8");
    } catch {
        return null;
    }
}

/**
 * The open descriptor of `pid` on `target`, or null.
 * @param {string} pid the process id
 * @param {string} target the file's absolute path
 * @returns {string | null} the descriptor number
 */
function fdOn(pid, target) {
    let fds;
    try {
        fds = readdirSync(`/proc/${pid}/fd`);
    } catch {
        return null;
    }
    for (const fd of fds) {
        try {
            if (readlinkSync(`/proc/${pid}/fd/${fd}`) === target) return fd;
        } catch {
            // closed while we looked
        }
    }
    return null;
}

/**
 * Who holds the pre-push gate's lock (`tools/prepush.sh`, design section 4.8) and how many gates
 * wait for it. The lock is `prepush.lock` in the git common directory. `/proc/locks` cannot be
 * used: it hides a lock whose `flock` command has exited, which is how a script takes it
 * (evidence/platform-facts.md section 8.2). So every process with the file open is looked at:
 * its `fdinfo` has a `lock:` line when it holds the lock, and a gate waiting for it is a `flock`
 * process with the file open and no such line. The holder's name comes from the `.holder` file
 * the gate writes, trusted only when its pid is one of the holding processes.
 * @param {string} root the main checkout
 * @returns {{holder: string | null, waiters: number}} `pid <n> (<worktree> <branch>)`, or null
 *   when the lock is free; and the number of waiting gates
 */
export function gateLock(root) {
    const file = join(root, ".git", "prepush.lock");
    /** @type {string[]} */
    const holders = [];
    let waiters = 0;
    for (const pid of readdirSync("/proc").filter((n) => /^\d+$/.test(n))) {
        const fd = fdOn(pid, file);
        if (fd === null) continue;
        const info = readProc(`/proc/${pid}/fdinfo/${fd}`);
        if (info === null) continue;
        if (/^lock:/m.test(info)) holders.push(pid);
        else if (readProc(`/proc/${pid}/comm`)?.trim() === "flock") waiters++;
    }
    if (holders.length === 0) return { holder: null, waiters };
    const [pid, dir, branch] = (readProc(`${file}.holder`) ?? "").trim().split(" ");
    const holder = holders.includes(pid) ? `pid ${pid} (${basename(dir)} ${branch})` : `pid ${holders[0]}`;
    return { holder, waiters };
}
