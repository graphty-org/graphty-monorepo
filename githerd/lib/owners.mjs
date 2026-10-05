/**
 * Whose is a pull request, inferred with nobody asked (the owner's rule of 2026-10-05: githerd
 * keeps running with no command from the owner). Every session commits as the same author, so
 * commits name no session; two other facts do:
 *
 * 1. The push log: `tools/push-queue.sh`, which every push on this machine goes through, appends
 *    one JSON line per push to the main checkout's `tmp/push-log.jsonl`, naming the Claude Code
 *    session that launched it (the first ancestor process with a registry entry).
 * 2. Worktree presence: a live session, or any process under it, whose cwd is inside the worktree
 *    that has a pull request's branch checked out.
 *
 * A pull request is owned by the session that last pushed its branch while that session is live,
 * else by a live session present in its worktree. The result, `state.prInferred[<pr>]`, is
 * recomputed every poll, so ownership lapses the poll after the session exits. `prInUse` reads it
 * after the explicit records of `githerd_mine` and `githerd mine` (`state.prOwners`), which win.
 */

import { readdirSync, readFileSync, readlinkSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** @typedef {{session: string, name: string, evidence: string}} InferredOwner */
/**
 * @typedef {{at?: string, branch?: string | null, sha?: string | null, exit?: number,
 *   sessionId?: string | null, name?: string | null}} PushLine
 */
/** @typedef {{pid: number, ppid: number, cwd: string | null}} Proc */
/** @typedef {{pid: number, sessionId: string, name: string}} Registered */

/**
 * The push log's lines, oldest first; a torn line is skipped.
 * ponytail: read whole every poll; rotate the file if it ever grows past a few MB.
 * @param {string} file the log
 * @returns {PushLine[]} the pushes
 */
export function readPushLog(file) {
    let text;
    try {
        text = readFileSync(file, "utf8");
    } catch {
        return [];
    }
    const out = [];
    for (const line of text.split("\n")) {
        try {
            if (line.trim()) out.push(JSON.parse(line));
        } catch {
            // A torn line is no push.
        }
    }
    return out;
}

/**
 * Every process with its parent and cwd (null when unreadable).
 * @param {string} [procDir] the proc file system
 * @returns {Proc[]} the processes
 */
export function processTable(procDir = "/proc") {
    /** @type {Proc[]} */
    const out = [];
    for (const name of readdirSync(procDir)) {
        if (!/^\d+$/.test(name)) continue;
        try {
            const stat = readFileSync(join(procDir, name, "stat"), "utf8");
            const ppid = Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1]);
            let cwd = null;
            try {
                cwd = readlinkSync(join(procDir, name, "cwd"));
            } catch {
                // Another user's process, or gone.
            }
            out.push({ pid: Number(name), ppid, cwd });
        } catch {
            // Exited while read.
        }
    }
    return out;
}

/**
 * The worktrees with a branch checked out, from `git worktree list --porcelain`.
 * @param {string} porcelain git's output
 * @returns {{dir: string, branch: string}[]} the worktrees
 */
export function parseWorktrees(porcelain) {
    return porcelain
        .split("\n\n")
        .map((block) => block.split("\n"))
        .map((lines) => ({
            dir: (lines.find((l) => l.startsWith("worktree ")) ?? "").slice("worktree ".length),
            branch: (lines.find((l) => l.startsWith("branch refs/heads/")) ?? "").slice("branch refs/heads/".length),
        }))
        .filter((w) => w.dir && w.branch);
}

/**
 * The inferred owner of each open pull request that has one.
 * @param {Record<string, {headRef?: string}>} prs the open pull requests
 * @param {{root: string, pushLog: PushLine[], sessions: Registered[], procs: Proc[],
 *   worktrees: {dir: string, branch: string}[]}} facts the main checkout, the push log, the live
 *   registered Claude Code sessions, the process table and the worktrees
 * @returns {Record<string, InferredOwner>} the owners, by pull request
 */
export function inferOwners(prs, { root, pushLog, sessions, procs, worktrees }) {
    const live = new Map(sessions.map((s) => [s.sessionId, s]));
    /** @type {Map<string, PushLine>} */
    const lastPush = new Map();
    for (const p of pushLog) if (p.branch) lastPush.set(p.branch, p);
    const children = new Map();
    for (const p of procs) children.set(p.ppid, [...(children.get(p.ppid) ?? []), p]);
    const cwdOf = new Map(procs.map((p) => [p.pid, p.cwd]));
    /**
     * The cwds of a session's process and every process under it.
     * @param {number} pid the session's process
     * @returns {string[]} the cwds
     */
    const cwds = (pid) => {
        const out = [cwdOf.get(pid)];
        for (const stack = [pid]; stack.length; ) {
            for (const c of children.get(stack.pop()) ?? []) {
                out.push(c.cwd);
                stack.push(c.pid);
            }
        }
        return /** @type {string[]} */ (out.filter(Boolean));
    };
    // The main checkout is everyone's, and githerd's own workers have their jobs.
    const ownWorktrees = worktrees.filter(
        (w) => w.dir !== root && !w.dir.startsWith(join(root, ".worktrees", "githerd-")),
    );
    const byPid = [...sessions].sort((a, b) => a.pid - b.pid);
    /** @type {Record<string, InferredOwner>} */
    const out = {};
    for (const [n, rec] of Object.entries(prs ?? {})) {
        if (!rec?.headRef) continue;
        const push = lastPush.get(rec.headRef);
        const pusher = push?.sessionId ? live.get(push.sessionId) : undefined;
        if (pusher && push) {
            const sha = push.sha ? ` ${push.sha.slice(0, 7)}` : "";
            const verb = push.exit === 0 ? "pushed" : "tried to push";
            const at = push.at ? ` at ${push.at.slice(11, 16)} UTC` : "";
            out[n] = { session: pusher.sessionId, name: pusher.name, evidence: `${verb}${sha}${at}` };
            continue;
        }
        for (const w of ownWorktrees.filter((x) => x.branch === rec.headRef)) {
            const s = byPid.find((x) => cwds(x.pid).some((c) => c === w.dir || c.startsWith(w.dir + sep)));
            if (s) {
                out[n] = { session: s.sessionId, name: s.name, evidence: `working in ${relative(root, w.dir)}` };
                break;
            }
        }
    }
    return out;
}
