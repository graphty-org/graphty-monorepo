/**
 * Removes the repository's finished worktrees (the owner's go of 2026-10-17). Nothing else removes
 * a session's worktree, and each holds hundreds of megabytes of installs and builds.
 *
 * A worktree is finished when the event that ends its use has happened: its branch is merged into
 * the default branch (its tip is in it, off the first-parent line, as `tools/worktree-prune.sh`
 * judges it), its branch was deleted on origin (`[gone]` after a `fetch --prune`), or it is
 * detached at a commit already in the default branch. A finished worktree is removed only when ALL
 * of these hold, and is otherwise left alone and counted by the first reason it is kept:
 *
 * - it is not the main checkout, a live tool's worktree (`tools/live-tools.json`) or locked (the
 *   job and reference worktrees githerd itself owns are locked);
 * - no non-terminal job, claim or open pull request names its directory or branch;
 * - no push-queue ticket runs from it, and no process has its cwd or an open file inside it;
 * - its git index, HEAD and HEAD reflog are what they were at the previous pass (activity is an
 *   event; the first pass after a start only records them);
 * - every commit on its HEAD is on origin (`--not --remotes`, after the prune);
 * - `git status --porcelain` is empty (ignored build output does not count).
 *
 * Removal is `git worktree remove` without `--force`, then `git branch -d` (never `-D`), then one
 * `git worktree prune`. At most `removePerPoll` are removed a pass, so a backlog drains over several
 * polls. Without `acting`, nothing is removed and the batch is `would-do` ledger lines.
 *
 * githerd never runs git stash, reset, checkout of a file, clean or rebase.
 */
import { readdirSync, readFileSync, readlinkSync, statfsSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { liveTickets } from "./proc.mjs";
import { run } from "./worktrees.mjs";

/**
 * @typedef {{dir: string, head: string, branch: string | null, locked: boolean}} Tree
 * @typedef {{fp: Map<string, string>, would: string}} Seen what the previous pass saw, kept by
 *   the caller between passes: each finished worktree's fingerprint, and the batch it would remove
 */

/** The reasons a finished worktree is kept, in the order they are checked. */
export const KEEP = {
    tool: "live tool worktree",
    locked: "locked",
    held: "named by a job, claim or open pull request",
    ticket: "in the push queue",
    process: "a live process inside",
    changed: "changed since the last poll",
    unpushed: "commits not on origin",
    dirty: "uncommitted or untracked files",
    refused: "git refused to remove it",
};

/**
 * The linked worktrees, from `git worktree list --porcelain`; one whose directory is gone
 * (`prunable`) is left to `git worktree prune`.
 * @param {string} porcelain git's output
 * @returns {Tree[]} the worktrees, the main checkout excluded
 */
function parseTrees(porcelain) {
    return porcelain
        .split("\n\n")
        .slice(1)
        .map((block) => block.split("\n"))
        .filter((lines) => lines[0]?.startsWith("worktree ") && !lines.some((l) => l.startsWith("prunable")))
        .map((lines) => {
            const field = (/** @type {string} */ k) => lines.find((l) => l.startsWith(k))?.slice(k.length) ?? null;
            const ref = field("branch refs/heads/");
            return {
                dir: /** @type {string} */ (field("worktree ")),
                head: field("HEAD ") ?? "",
                branch: ref,
                locked: lines.some((l) => l === "locked" || l.startsWith("locked ")),
            };
        });
}

/**
 * The directories of the live tools' worktrees (`tools/live-tools.json`), absolute.
 * @param {string} root the main checkout
 * @returns {Set<string>} the directories; none when the repository has no such file
 */
function liveToolDirs(root) {
    try {
        const tools = JSON.parse(readFileSync(join(root, "tools", "live-tools.json"), "utf8"));
        return new Set(Object.values(tools).map((t) => resolve(root, /** @type {any} */ (t).worktree)));
    } catch {
        return new Set();
    }
}

/**
 * Whether `path` is `dir` or inside it, for each candidate directory: walks the path's ancestors.
 * @param {string} path a path
 * @param {Set<string>} dirs the candidate directories
 * @returns {string | null} the directory holding it
 */
function holderOf(path, dirs) {
    for (let p = path; ; p = dirname(p)) {
        if (dirs.has(p)) return p;
        if (dirname(p) === p) return null;
    }
}

/**
 * The candidate directories some process has its cwd or an open file in.
 * ponytail: cwd and open file descriptors only; a process running a file mapped from a worktree
 * with its cwd elsewhere is missed. Read /proc/<pid>/maps too if that ever bites.
 * @param {Set<string>} dirs the candidate directories
 * @param {string[]} extra more paths in use (the registered sessions' working directories)
 * @param {string} procDir the proc file system
 * @returns {Set<string>} the busy directories
 */
function busyDirs(dirs, extra, procDir) {
    const busy = new Set();
    const mark = (/** @type {string} */ p) => {
        const d = isAbsolute(p) ? holderOf(p, dirs) : null;
        if (d) busy.add(d);
    };
    for (const p of extra) mark(p);
    for (const pid of readdirSync(procDir)) {
        if (!/^\d+$/.test(pid)) continue;
        try {
            mark(readlinkSync(join(procDir, pid, "cwd")));
        } catch {
            // Another user's process, or gone.
        }
        let fds = [];
        try {
            fds = readdirSync(join(procDir, pid, "fd"));
        } catch {
            continue;
        }
        for (const fd of fds) {
            try {
                mark(readlinkSync(join(procDir, pid, "fd", fd)));
            } catch {
                // Closed while read.
            }
        }
    }
    return busy;
}

/**
 * A worktree's activity fingerprint: its HEAD and the modification times of its index, HEAD and
 * HEAD reflog in its git directory. A commit, a switch, a staged change or a pull changes it.
 * @param {Tree} t the worktree
 * @returns {string} the fingerprint
 */
function fingerprint(t) {
    let gitdir;
    try {
        gitdir = readFileSync(join(t.dir, ".git"), "utf8")
            .replace(/^gitdir: /, "")
            .trim();
    } catch {
        return `${t.head}:unreadable`;
    }
    const m = (/** @type {string} */ f) => {
        try {
            return statSync(join(gitdir, f)).mtimeMs;
        } catch {
            return 0;
        }
    };
    return [t.head, m("index"), m("HEAD"), m(join("logs", "HEAD"))].join(":");
}

/**
 * Free bytes on the file system holding `dir`.
 * @param {string} dir a directory
 * @returns {number} the bytes
 */
function freeBytes(dir) {
    const s = statfsSync(dir);
    return s.bavail * s.bsize;
}

/**
 * One pass: finds the finished worktrees, removes up to `removePerPoll` that pass every check
 * (only when `acting`), and says what it did and why the rest were kept.
 * @param {{root: string, base: string, remote?: string, acting: boolean, removePerPoll: number,
 *   holds?: {dirs: string[], branches: string[]}, busyPaths?: string[], seen: Seen,
 *   env?: Record<string, string | undefined>, ledger: (e: {kind: string} & Record<string, unknown>) => unknown,
 *   procDir?: string, fetch?: boolean}} options the main checkout; the default branch's remote ref (`origin/master`);
 *   whether to remove; the cap; the directories and branches githerd's records name; more paths in
 *   use; the previous pass's fingerprints (updated); the environment; the ledger; and whether to
 *   `fetch --prune` first (off only for a read-only report)
 * @returns {Promise<{removed: {dir: string, branch: string | null, freedBytes: number}[],
 *   would: string[], kept: Record<string, number>, unchecked: number, text: string}>} the outcome
 */
export async function cleanupWorktrees({
    root,
    base,
    remote = "origin",
    acting,
    removePerPoll,
    holds = { dirs: [], branches: [] },
    busyPaths = [],
    seen,
    env = process.env,
    ledger,
    procDir = "/proc",
    fetch = true,
}) {
    const sh = async (/** @type {string} */ cwd, /** @type {string[]} */ args) =>
        run("git", ["-c", "core.fsmonitor=false", ...args], { cwd, env: { ...env, GIT_TERMINAL_PROMPT: "0" } });
    const out = async (/** @type {string[]} */ args) => {
        const r = await sh(root, args);
        if (r.code !== 0) throw new Error(`git ${args[0]} failed: ${(r.stderr || r.stdout).trim()}`);
        return r.stdout;
    };
    // `[gone]` and "on origin" are only true after a prune; a failed fetch judges by the last one.
    if (fetch) await sh(root, ["fetch", "-q", "--prune", "--no-tags", remote]);
    const trees = parseTrees(await out(["worktree", "list", "--porcelain"]));
    const merged = new Set(
        (await out(["for-each-ref", "--merged", base, "--format=%(refname)", "refs/heads"])).split("\n"),
    );
    const firstParent = new Set((await out(["rev-list", "--first-parent", base])).split("\n"));
    const gone = new Set(
        (await out(["for-each-ref", "--format=%(refname) %(upstream:track)", "refs/heads"]))
            .split("\n")
            .filter((l) => l.endsWith(" [gone]"))
            .map((l) => l.slice(0, -" [gone]".length)),
    );

    const unpushed = async (/** @type {string} */ dir) => {
        const r = await sh(dir, ["rev-list", "--count", "HEAD", "--not", "--remotes"]);
        return r.code !== 0 || Number(r.stdout.trim()) > 0;
    };
    /** @type {Tree[]} */
    const finished = [];
    for (const t of trees) {
        if (t.branch) {
            const ref = `refs/heads/${t.branch}`;
            if (gone.has(ref) || (merged.has(ref) && !firstParent.has(t.head))) finished.push(t);
        } else if (t.head && (await sh(root, ["merge-base", "--is-ancestor", t.head, base])).code === 0) {
            finished.push(t);
        }
    }
    finished.sort((a, b) => a.dir.localeCompare(b.dir));

    const dirs = new Set(finished.map((t) => t.dir));
    const tools = liveToolDirs(root);
    const heldDirs = new Set(holds.dirs);
    const heldBranches = new Set(holds.branches);
    const tickets = new Set(liveTickets(root).map((t) => holderOf(t.cwd, dirs)));
    const busy = finished.length ? busyDirs(dirs, busyPaths, procDir) : new Set();
    for (const d of seen.fp.keys()) if (!dirs.has(d)) seen.fp.delete(d);

    /** @type {Record<string, number>} */
    const kept = {};
    const keep = (/** @type {keyof typeof KEEP} */ why) => (kept[KEEP[why]] = (kept[KEEP[why]] ?? 0) + 1);
    /** @type {Tree[]} */
    const batch = [];
    let unchecked = 0;
    for (const t of finished) {
        const fp = fingerprint(t);
        const changed = seen.fp.get(t.dir) !== fp;
        seen.fp.set(t.dir, fp);
        if (t.dir === root || tools.has(t.dir)) keep("tool");
        else if (t.locked) keep("locked");
        else if (heldDirs.has(t.dir) || (t.branch && heldBranches.has(t.branch))) keep("held");
        else if (tickets.has(t.dir)) keep("ticket");
        else if (busy.has(t.dir)) keep("process");
        else if (changed) keep("changed");
        else if (batch.length >= removePerPoll) unchecked++;
        else if (await unpushed(t.dir)) keep("unpushed");
        else {
            // No index refresh: a write to the index would read as activity at the next pass.
            const status = await sh(t.dir, ["--no-optional-locks", "status", "--porcelain"]);
            if (status.code !== 0 || status.stdout.trim() !== "") keep("dirty");
            else batch.push(t);
        }
    }

    /** @type {{dir: string, branch: string | null, freedBytes: number}[]} */
    const removed = [];
    /** @type {string[]} */
    const would = [];
    if (!acting) {
        would.push(...batch.map((t) => t.dir));
        const key = would.join("\n");
        if (key !== seen.would) {
            for (const t of batch) {
                await ledger({
                    kind: "would-do",
                    group: "worktrees",
                    op: `git worktree remove ${t.dir}`,
                    branch: t.branch,
                });
            }
        }
        seen.would = key;
    } else {
        for (const t of batch) {
            const before = freeBytes(root);
            const r = await sh(root, ["worktree", "remove", t.dir]);
            if (r.code !== 0) {
                keep("refused");
                await ledger({
                    kind: "worktree-remove-failed",
                    dir: t.dir,
                    branch: t.branch,
                    error: (r.stderr || r.stdout).trim(),
                });
                continue;
            }
            seen.fp.delete(t.dir);
            const freedBytes = Math.max(0, freeBytes(root) - before);
            const branchDeleted = t.branch ? (await sh(root, ["branch", "-d", t.branch])).code === 0 : null;
            removed.push({ dir: t.dir, branch: t.branch, freedBytes });
            await ledger({ kind: "worktree-removed", dir: t.dir, branch: t.branch, branchDeleted, freedBytes });
        }
        if (removed.length) await sh(root, ["worktree", "prune"]);
    }
    return { removed, would, kept, unchecked, text: summary({ acting, removed, would, kept, unchecked }) };
}

/**
 * The pass as one board line.
 * @param {{acting: boolean, removed: {freedBytes: number}[], would: string[], kept: Record<string, number>,
 *   unchecked: number}} r the outcome
 * @returns {string} the line
 */
function summary({ acting, removed, would, kept, unchecked }) {
    const gb = (removed.reduce((s, r) => s + r.freedBytes, 0) / 1e9).toFixed(1);
    const parts = [
        acting ? `removed ${removed.length} (about ${gb} GB freed)` : `would remove ${would.length} (dry-run)`,
    ];
    if (unchecked) parts.push(`${unchecked} more wait for the next polls`);
    const reasons = Object.entries(kept).sort((a, b) => b[1] - a[1]);
    const total = reasons.reduce((s, [, n]) => s + n, 0);
    if (total) parts.push(`kept ${total}: ${reasons.map(([why, n]) => `${n} ${why}`).join(", ")}`);
    return `finished worktrees: ${parts.join("; ")}`;
}
