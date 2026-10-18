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
 * @typedef {(cwd: string, args: string[]) => Promise<import("./worktrees.mjs").RunResult>} Git
 * @typedef {(e: {kind: string} & Record<string, unknown>) => unknown} Ledger
 */

/**
 * Runs git with the step's environment: no fsmonitor, no prompt.
 * @param {Record<string, string | undefined>} env the environment
 * @returns {Git} the runner
 */
function gitWith(env) {
    return (cwd, args) =>
        run("git", ["-c", "core.fsmonitor=false", ...args], { cwd, env: { ...env, GIT_TERMINAL_PROMPT: "0" } });
}

/**
 * Lines of git's output, throwing with its message on failure.
 * @param {Git} sh the runner
 * @param {string} cwd where
 * @param {string[]} args git's arguments
 * @returns {Promise<string[]>} the lines
 */
async function lines(sh, cwd, args) {
    const r = await sh(cwd, args);
    if (r.code !== 0) throw new Error(`git ${args[0]} failed: ${(r.stderr || r.stdout).trim()}`);
    return r.stdout.split("\n");
}

/**
 * The finished worktrees, by directory: merged into `base` off its first-parent line, branch gone
 * from origin, or detached at a commit in `base`.
 * @param {Git} sh the runner
 * @param {string} root the main checkout
 * @param {string} base the default branch's remote ref
 * @param {Tree[]} trees the linked worktrees
 * @returns {Promise<Tree[]>} the finished ones, sorted by directory
 */
async function findFinished(sh, root, base, trees) {
    const merged = new Set(
        await lines(sh, root, ["for-each-ref", "--merged", base, "--format=%(refname)", "refs/heads"]),
    );
    const firstParent = new Set(await lines(sh, root, ["rev-list", "--first-parent", base]));
    const gone = new Set(
        (await lines(sh, root, ["for-each-ref", "--format=%(refname) %(upstream:track)", "refs/heads"]))
            .filter((l) => l.endsWith(" [gone]"))
            .map((l) => l.slice(0, -" [gone]".length)),
    );
    /** @type {Tree[]} */
    const finished = [];
    for (const t of trees) {
        const ref = t.branch ? `refs/heads/${t.branch}` : null;
        const done = ref
            ? gone.has(ref) || (merged.has(ref) && !firstParent.has(t.head))
            : Boolean(t.head) && (await sh(root, ["merge-base", "--is-ancestor", t.head, base])).code === 0;
        if (done) finished.push(t);
    }
    return finished.sort((a, b) => a.dir.localeCompare(b.dir));
}

/**
 * The first cheap reason to keep a finished worktree, or null. Records its fingerprint.
 * @param {Tree} t the worktree
 * @param {{root: string, tools: Set<string>, heldDirs: Set<string>, heldBranches: Set<string>,
 *   tickets: Set<string | null>, busy: Set<string>, seen: Seen}} c what the pass read
 * @returns {keyof typeof KEEP | null} the reason
 */
function cheapKeep(t, c) {
    const fp = fingerprint(t);
    const changed = c.seen.fp.get(t.dir) !== fp;
    c.seen.fp.set(t.dir, fp);
    if (t.dir === c.root || c.tools.has(t.dir)) return "tool";
    if (t.locked) return "locked";
    if (c.heldDirs.has(t.dir) || (t.branch && c.heldBranches.has(t.branch))) return "held";
    if (c.tickets.has(t.dir)) return "ticket";
    if (c.busy.has(t.dir)) return "process";
    return changed ? "changed" : null;
}

/**
 * Why a worktree holds work git would lose, or null: a commit no remote has, or local changes.
 * @param {Git} sh the runner
 * @param {string} dir the worktree
 * @returns {Promise<"unpushed" | "dirty" | null>} the reason
 */
async function workKeep(sh, dir) {
    const count = await sh(dir, ["rev-list", "--count", "HEAD", "--not", "--remotes"]);
    if (count.code !== 0 || Number(count.stdout.trim()) > 0) return "unpushed";
    // No index refresh: a write to the index would read as activity at the next pass.
    const status = await sh(dir, ["--no-optional-locks", "status", "--porcelain"]);
    return status.code !== 0 || status.stdout.trim() !== "" ? "dirty" : null;
}

/**
 * Removes each worktree of the batch, then deletes its branch when git calls it merged.
 * @param {Git} sh the runner
 * @param {string} root the main checkout
 * @param {Tree[]} batch the worktrees
 * @param {Ledger} ledger the ledger
 * @param {Seen} seen the fingerprints, from which removed ones are dropped
 * @returns {Promise<{dir: string, branch: string | null, freedBytes: number}[]>} what was removed
 */
async function removeBatch(sh, root, batch, ledger, seen) {
    const removed = [];
    for (const t of batch) {
        const before = freeBytes(root);
        const r = await sh(root, ["worktree", "remove", t.dir]);
        if (r.code !== 0) {
            const error = (r.stderr || r.stdout).trim();
            await ledger({ kind: "worktree-remove-failed", dir: t.dir, branch: t.branch, error });
            continue;
        }
        seen.fp.delete(t.dir);
        const freedBytes = Math.max(0, freeBytes(root) - before);
        const branchDeleted = t.branch ? (await sh(root, ["branch", "-d", t.branch])).code === 0 : null;
        removed.push({ dir: t.dir, branch: t.branch, freedBytes });
        await ledger({ kind: "worktree-removed", dir: t.dir, branch: t.branch, branchDeleted, freedBytes });
    }
    if (removed.length) await sh(root, ["worktree", "prune"]);
    return removed;
}

/**
 * The batch as would-do lines, written only when it differs from the last pass's.
 * @param {Tree[]} batch the worktrees
 * @param {Ledger} ledger the ledger
 * @param {Seen} seen the last batch
 * @returns {Promise<string[]>} the directories
 */
async function reportBatch(batch, ledger, seen) {
    const would = batch.map((t) => t.dir);
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
    return would;
}

/**
 * Sorts the finished worktrees into the batch to remove (at most `cap`), the ones kept, counted by
 * reason, and the ones left unchecked for a later pass once the batch is full.
 * @param {Git} sh the runner
 * @param {Tree[]} finished the finished worktrees
 * @param {Parameters<typeof cheapKeep>[1]} c what the pass read
 * @param {number} cap the batch's size
 * @returns {Promise<{batch: Tree[], kept: Record<string, number>, unchecked: number}>} the outcome
 */
async function sortOut(sh, finished, c, cap) {
    /** @type {Record<string, number>} */
    const kept = {};
    /** @type {Tree[]} */
    const batch = [];
    let unchecked = 0;
    for (const t of finished) {
        const why = cheapKeep(t, c) ?? (batch.length < cap ? await workKeep(sh, t.dir) : null);
        if (why) kept[KEEP[why]] = (kept[KEEP[why]] ?? 0) + 1;
        else if (batch.length < cap) batch.push(t);
        else unchecked++;
    }
    return { batch, kept, unchecked };
}

/**
 * One pass: finds the finished worktrees, removes up to `removePerPoll` that pass every check
 * (only when `acting`), and says what it did and why the rest were kept.
 * @param {{root: string, base: string, remote?: string, acting: boolean, removePerPoll: number,
 *   holds?: {dirs: string[], branches: string[]}, busyPaths?: string[], seen: Seen,
 *   env?: Record<string, string | undefined>, ledger: Ledger, procDir?: string, fetch?: boolean}} options
 *   the main checkout; the default branch's remote ref (`origin/master`); whether to remove; the
 *   cap; the directories and branches githerd's records name; more paths in use; the previous
 *   pass's fingerprints (updated); the environment; the ledger; and whether to `fetch --prune`
 *   first (off only for a read-only report)
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
    const sh = gitWith(env);
    // Read first, so a repository with no linked worktree (or none git can list) costs no fetch.
    const list = await sh(root, ["worktree", "list", "--porcelain"]);
    if (list.code !== 0 || !parseTrees(list.stdout).length) {
        return { removed: [], would: [], kept: {}, unchecked: 0, text: "finished worktrees: none" };
    }
    // `[gone]` and "on origin" are only true after a prune; a failed fetch judges by the last one.
    if (fetch) await sh(root, ["fetch", "-q", "--prune", "--no-tags", remote]);
    const trees = parseTrees((await lines(sh, root, ["worktree", "list", "--porcelain"])).join("\n"));
    const finished = await findFinished(sh, root, base, trees);
    const dirs = new Set(finished.map((t) => t.dir));
    for (const d of seen.fp.keys()) if (!dirs.has(d)) seen.fp.delete(d);
    const c = {
        root,
        seen,
        tools: liveToolDirs(root),
        heldDirs: new Set(holds.dirs),
        heldBranches: new Set(holds.branches),
        tickets: new Set(liveTickets(root).map((t) => holderOf(t.cwd, dirs))),
        busy: finished.length ? busyDirs(dirs, busyPaths, procDir) : new Set(),
    };

    const { batch, kept, unchecked } = await sortOut(sh, finished, c, removePerPoll);
    const removed = acting ? await removeBatch(sh, root, batch, ledger, seen) : [];
    if (batch.length > removed.length && acting) kept[KEEP.refused] = batch.length - removed.length;
    const would = acting ? [] : await reportBatch(batch, ledger, seen);
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
    const each = reasons.map(([why, n]) => n + " " + why).join(", ");
    if (total) parts.push(`kept ${total}: ${each}`);
    return `finished worktrees: ${parts.join("; ")}`;
}
