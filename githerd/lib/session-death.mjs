/**
 * What githerd does when a worker session dies (design sections 7.7 and 5.5). The session's own
 * processes may outlive it: a test run, a dev server or a gate the worker started by hand lose their
 * parent and keep the worktree busy. So every process whose working directory is inside the job's
 * worktree is ended (SIGTERM, then SIGKILL), except the daemon's own push, which runs there too and
 * must survive the worker (design 4.8). A stale `index.lock` is removed once nothing uses the
 * worktree. GitHub is read again for the job's branch and its pull requests, and what it shows goes
 * into the job's news, so the next session starts from what is really there. Then the death is
 * counted: the job continues by resume when the self-test verified resume on the running Claude
 * Code version (platform facts 10.2), fresh after a second death within 30 minutes or when resume is
 * unverified, and the third death faults it.
 */

import { existsSync, readdirSync, readFileSync, readlinkSync, rmSync } from "node:fs";
import { isAbsolute, join, sep } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { death } from "./board.mjs";
import { run } from "./worktrees.mjs";

/** How long the processes get to end after SIGTERM before SIGKILL. */
const GRACE_MS = 5000;
/** How many times within the grace the survivors are looked at. */
const GRACE_CHECKS = 10;

/**
 * @typedef {{pid: number, ppid: number, pgid: number, startTime: string, zombie: boolean}} ProcStat
 */

/**
 * The fields of `/proc/<pid>/stat` githerd needs, or null when the process is gone.
 * @param {number} pid the process
 * @returns {ProcStat | null} its parent, process group, start time and whether it is a zombie
 */
function procStat(pid) {
    let stat;
    try {
        stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    } catch {
        return null;
    }
    // Field 2, the command name, may hold spaces and parentheses: count from the last ")". What
    // follows starts at field 3 (state); 4 is the parent, 5 the process group, 22 the start time.
    const f = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    return { pid, ppid: Number(f[1]), pgid: Number(f[2]), startTime: f[19], zombie: f[0] === "Z" };
}

/**
 * Whether a path is the directory or inside it.
 * @param {string} path the path
 * @param {string} dir the directory
 * @returns {boolean} true when inside
 */
const inside = (path, dir) => path === dir || path.startsWith(dir + sep);

/**
 * The live processes whose working directory is inside a worktree, without the spared ones: this
 * process, the process groups named in `spareGroups`, and every descendant of a process in them
 * (a gate's step that left the push's group).
 * @param {string} dir the worktree
 * @param {{spareGroups?: number[]}} [options] the process groups to leave alone (running pushes)
 * @returns {{users: ProcStat[], spared: ProcStat[]}} the processes to end, and the spared ones that
 *   use the worktree
 */
export function worktreeProcesses(dir, { spareGroups = [] } = {}) {
    /** @type {Map<number, ProcStat>} */
    const all = new Map();
    for (const name of readdirSync("/proc")) {
        if (!/^\d+$/.test(name)) continue;
        const s = procStat(Number(name));
        if (s && !s.zombie) all.set(s.pid, s);
    }
    const groups = new Set(spareGroups);
    /**
     * Whether a process is this one, in a spared group, or descends from a spared process.
     * @param {ProcStat | undefined} s the process
     * @returns {boolean} true when spared
     */
    const spare = (s) => {
        if (s?.pid === process.pid) return true;
        for (let p = s, hops = 0; p && hops < 64; p = all.get(p.ppid), hops++) {
            if (groups.has(p.pgid) || groups.has(p.pid)) return true;
        }
        return false;
    };
    /** @type {ProcStat[]} */
    const users = [];
    /** @type {ProcStat[]} */
    const spared = [];
    for (const s of all.values()) {
        let cwd;
        try {
            cwd = readlinkSync(`/proc/${s.pid}/cwd`);
        } catch {
            continue; // gone, or not ours to read
        }
        if (!inside(cwd, dir)) continue;
        (spare(s) ? spared : users).push(s);
    }
    return { users, spared };
}

/**
 * Whether a process found earlier is still running: same pid, same start time, not a zombie.
 * @param {ProcStat} s the process as found
 * @returns {boolean} true while it runs
 */
function stillRunning(s) {
    const now = procStat(s.pid);
    return Boolean(now && !now.zombie && now.startTime === s.startTime);
}

/**
 * Sends a signal, ignoring a process that is already gone.
 * @param {number} pid the process
 * @param {NodeJS.Signals} sig the signal
 */
function signal(pid, sig) {
    try {
        process.kill(pid, sig);
    } catch {
        // Gone.
    }
}

/**
 * Ends every process using a worktree except the spared ones: SIGTERM, up to `graceMs` for them to
 * go, then SIGKILL for the rest.
 * @param {string} dir the worktree
 * @param {{spareGroups?: number[], graceMs?: number, sleep?: (ms: number) => Promise<unknown>}} [options]
 *   the process groups to spare, the grace, and the wait (injected by tests)
 * @returns {Promise<{ended: number[], killed: number[], spared: number[]}>} the pids that ended on
 *   SIGTERM, those that needed SIGKILL, and the spared ones still using the worktree
 */
export async function sweepWorktree(dir, { spareGroups = [], graceMs = GRACE_MS, sleep = delay } = {}) {
    const { users, spared } = worktreeProcesses(dir, { spareGroups });
    for (const s of users) signal(s.pid, "SIGTERM");
    let left = users;
    for (let i = 0; i < GRACE_CHECKS && left.length > 0; i++) {
        await sleep(graceMs / GRACE_CHECKS);
        left = left.filter(stillRunning);
    }
    for (const s of left) signal(s.pid, "SIGKILL");
    const killed = new Set(left.map((s) => s.pid));
    return {
        ended: users.filter((s) => !killed.has(s.pid)).map((s) => s.pid),
        killed: [...killed],
        spared: spared.map((s) => s.pid),
    };
}

/**
 * Removes the worktree's `index.lock`, which a git command killed mid-write leaves behind and which
 * makes every later git command in the worktree fail.
 * @param {string} dir the worktree
 * @returns {Promise<boolean>} true when one was removed
 */
async function removeIndexLock(dir) {
    const r = await run("git", ["rev-parse", "--git-path", "index.lock"], { cwd: dir });
    if (r.code !== 0) return false;
    const rel = r.stdout.trim();
    const path = isAbsolute(rel) ? rel : join(dir, rel);
    if (!existsSync(path)) return false;
    rmSync(path, { force: true });
    return true;
}

/**
 * What GitHub shows for the job's branch, as news lines: the remote head and every pull request
 * whose head is that branch. Sets `job.pr` when an open pull request exists and the job had none.
 * @param {any} job the job
 * @param {string} repo `owner/name`
 * @param {{get: (path: string, options?: {fresh?: boolean}) => Promise<{body: any}>}} github the client
 * @returns {Promise<string[]>} the lines
 */
async function githubNews(job, repo, github) {
    const branch = job.branch;
    if (!branch) return ["nothing was pushed yet: the job has no branch on GitHub"];
    try {
        let head = null;
        try {
            head =
                (await github.get(`repos/${repo}/git/ref/heads/${branch}`, { fresh: true })).body?.object?.sha ?? null;
        } catch (err) {
            if (/** @type {{status?: number}} */ (err).status !== 404) throw err;
        }
        if (!head) return [`branch ${branch} is not on GitHub`];
        const owner = repo.split("/")[0];
        const q = `repos/${repo}/pulls?head=${owner}:${encodeURIComponent(branch)}&state=all&per_page=100`;
        const prs = (await github.get(q, { fresh: true })).body ?? [];
        const open = prs.find((/** @type {any} */ p) => p.state === "open");
        if (open && !job.pr) job.pr = open.number;
        if (prs.length === 0) return [`branch ${branch} is on GitHub at ${head}; no pull request has it as head`];
        return prs.map(
            (/** @type {any} */ p) => `PR #${p.number} (${p.state}) exists for ${branch}, remote head ${head}`,
        );
    } catch (err) {
        const why = /** @type {Error} */ (err).message;
        return [`GitHub could not be read after the session died (${why}); check ${branch} before pushing`];
    }
}

/**
 * Handles one worker session's death (design 7.7): ends the processes left in the job's worktree,
 * removes a stale `index.lock` once nothing uses it, reads GitHub again for the job's branch, puts
 * what it found into the job's news, and counts the death. A push the daemon runs for the job keeps
 * running; its result reaches the job's news when it ends.
 *
 * A waiting or parked job keeps its state with no session; the caller starts the next session when
 * the job needs one, by resume (`session`) or fresh.
 * @param {{
 *   job: any,
 *   state: any,
 *   repo: string,
 *   github: {get: (path: string, options?: {fresh?: boolean}) => Promise<{body: any}>},
 *   ledger: (entry: {kind: string} & Record<string, unknown>) => unknown,
 *   resumeVerified: boolean,
 *   capture?: string | null,
 *   now?: () => Date,
 *   graceMs?: number,
 *   sleep?: (ms: number) => Promise<unknown>,
 * }} options the job, the daemon state (for the push queue), the repository, the GitHub client,
 *   the ledger, whether the self-test verified resume on the running Claude Code version, the
 *   dead session's last pane capture, and the clock and wait (injected by tests)
 * @returns {Promise<{action: "resume" | "fresh" | "faulted" | "failed", job: string,
 *   session: string | null, ended: number, killed: number, indexLock: boolean}>} what follows: the
 *   session to resume (null unless `resume`), and what the sweep did
 */
export async function recoverDeath({
    job,
    state,
    repo,
    github,
    ledger,
    resumeVerified,
    capture = null,
    now = () => new Date(),
    graceMs,
    sleep,
}) {
    const session = job.holder?.session ?? job.sessions?.at(-1) ?? null;
    const pushes = (state.pushQueue?.entries ?? []).filter((/** @type {any} */ e) => e.job === job.id);
    const spareGroups = pushes.map((/** @type {any} */ e) => e.pid).filter(Boolean);
    let sweep = { ended: /** @type {number[]} */ ([]), killed: /** @type {number[]} */ ([]), spared: [] };
    let indexLock = false;
    if (job.worktree && existsSync(job.worktree)) {
        sweep = await sweepWorktree(job.worktree, { spareGroups, graceMs, sleep });
        // A running push may be inside a git command; its lock is not stale.
        if (sweep.spared.length === 0 && worktreeProcesses(job.worktree).users.length === 0) {
            indexLock = await removeIndexLock(job.worktree);
        }
    }
    const lines = await githubNews(job, repo, github);
    for (const p of pushes) {
        lines.push(`your push of ${p.head} to ${p.branch} is still ${p.status}; githerd rings you with its result`);
    }
    const at = now();
    job.news.push({ at: at.toISOString(), text: `your session died; ${lines.join("; ")}`, acked: false });
    const next = death(job, { capture }, at);
    let action = next.action;
    if (action === "resume" && (!resumeVerified || !session)) {
        job.fresh = true;
        action = "fresh";
    }
    await ledger({
        kind: "session-death",
        job: job.id,
        session,
        action,
        ended: sweep.ended.length,
        killed: sweep.killed.length,
        indexLock,
    });
    return {
        action,
        job: job.id,
        session: action === "resume" ? session : null,
        ended: sweep.ended.length,
        killed: sweep.killed.length,
        indexLock,
    };
}
