#!/usr/bin/env node
// Removes the repository's finished worktrees, under the rules the owner approved on 2026-10-18.
// It is githerd's cleanup (githerd/lib/worktree-cleanup.mjs) as a tool of its own, since githerd no longer runs.
//
//   node tools/worktree-cleanup.mjs [--dry-run]        print what would be removed and why the rest are kept
//   node tools/worktree-cleanup.mjs --apply [--max N]  remove at most N (default 50) finished worktrees
//   node tools/worktree-cleanup.mjs --apply --every M  the same every M minutes, forever (the servherd watcher)
//   --recent H   keep a worktree with git activity in the last H hours (default 3)
//
// A worktree is finished when its branch's commits are all on origin/master or origin/golden and its
// tip is off their first-parent lines (a fresh branch sits on the line and is not finished), when its
// branch is gone from origin (`[gone]` after `fetch --prune`), or when it is detached at a commit
// already in origin/master or origin/golden. Never by age. A finished worktree is removed only when
// every check passes; otherwise it is kept and counted by the first reason, in this order:
//
// - not the main checkout, a live tool's worktree (tools/live-tools.json), golden-local, golden-cut,
//   this tool's own checkout, or the working directory of any servherd server;
// - not locked;
// - not named by a `taken` marker (tmp/pipeline-round and tmp/issue-round state) and its branch not
//   reverted from golden (a fix is due on it);
// - no push-queue ticket runs from it, no process has its cwd or an open file inside it, and no live
//   Claude session (~/.claude/sessions) has its cwd there;
// - no git activity (index, HEAD, HEAD reflog) in the last --recent hours;
// - every commit on its HEAD is on a remote;
// - `git status --porcelain` is empty (ignored build output does not count).
//
// Removal: a non-empty ignored tmp/ is first moved to <main>/tmp/worktree-tmp/<name>/ (scratch is
// not rebuildable), then `git worktree remove` without --force, then `git branch -d` (never -D), at
// idle IO priority. Every removal and refusal is appended to <main>/tmp/worktree-cleanup/log.jsonl.
// It never runs git stash, reset, checkout, clean or rebase.
import { spawnSync } from "node:child_process";
import {
    appendFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    readlinkSync,
    renameSync,
    statfsSync,
    statSync,
} from "node:fs";
import { homedir, setPriority } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

/** The reasons a finished worktree is kept, in the order they are checked. */
export const KEEP = {
    tool: "live tool or server worktree",
    locked: "locked",
    held: "taken marker or reverted from golden",
    ticket: "in the push queue",
    process: "a live process or session inside",
    recent: "git activity in the last hours",
    unpushed: "commits not on a remote",
    dirty: "uncommitted or untracked files",
    refused: "git refused to remove it",
};

const BASES = ["origin/master", "origin/golden"];

function git(cwd, args, env) {
    const r = spawnSync("git", ["-c", "core.fsmonitor=false", ...args], {
        cwd,
        env: { ...env, GIT_TERMINAL_PROMPT: "0" },
        encoding: "utf8",
        maxBuffer: 1 << 28,
    });
    return { code: r.status ?? 1, out: r.stdout ?? "", err: (r.stderr || r.error?.message) ?? "" };
}

function lines(cwd, args, env) {
    const r = git(cwd, args, env);
    if (r.code !== 0) throw new Error(`git ${args[0]} failed: ${r.err.trim()}`);
    return r.out.split("\n").filter(Boolean);
}

/**
 * The linked worktrees, the main checkout and prunable ones excluded.
 * @param porcelain the output of `git worktree list --porcelain`
 * @returns each worktree's directory, HEAD, branch and whether it is locked
 */
function parseTrees(porcelain) {
    return porcelain
        .split("\n\n")
        .slice(1)
        .map((block) => block.split("\n"))
        .filter((ls) => ls[0]?.startsWith("worktree ") && !ls.some((l) => l.startsWith("prunable")))
        .map((ls) => {
            const field = (k) => ls.find((l) => l.startsWith(k))?.slice(k.length) ?? null;
            return {
                dir: field("worktree "),
                head: field("HEAD ") ?? "",
                branch: field("branch refs/heads/"),
                locked: ls.some((l) => l === "locked" || l.startsWith("locked ")),
            };
        });
}

const readJson = (file) => {
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    } catch {
        return null;
    }
};

/**
 * Directories never removed: live tools, golden's worktrees, this checkout, servherd servers' cwds.
 * @param root the main checkout
 * @param home the home directory (servherd's registry)
 * @returns the directories
 */
function protectedDirs(root, home) {
    const here = git(dirname(fileURLToPath(import.meta.url)), ["rev-parse", "--show-toplevel"], process.env);
    const dirs = [root, join(root, ".worktrees/golden-local"), join(root, ".worktrees/golden-cut")];
    if (here.code === 0) dirs.push(here.out.trim());
    for (const base of new Set([root, ...dirs.slice(3)])) {
        for (const t of Object.values(readJson(join(base, "tools/live-tools.json")) ?? {})) {
            if (t?.worktree) dirs.push(resolve(root, t.worktree));
        }
    }
    for (const s of readJson(join(home, ".servherd/registry.json"))?.servers ?? []) if (s?.cwd) dirs.push(s.cwd);
    return dirs;
}

/**
 * The candidate directory holding a path.
 * @param path an absolute path
 * @param dirs the candidate directories
 * @returns the directory that is `path` or an ancestor of it, or null
 */
function holderOf(path, dirs) {
    if (!path || !isAbsolute(path)) return null;
    for (let p = path; ; p = dirname(p)) {
        if (dirs.has(p)) return p;
        if (dirname(p) === p) return null;
    }
}

const alive = (pid) => {
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return e.code === "EPERM";
    }
};

/**
 * The candidate directories some process has its cwd or an open file in, or a live push-queue ticket
 * or Claude session names. ponytail: cwd, fds, tickets and session cwds; a process running a file
 * mapped from a worktree with its cwd elsewhere is missed. Read /proc/<pid>/maps if that ever bites.
 * @param dirs the candidate directories
 * @param root the main checkout (its push-queue tickets)
 * @param home the home directory (Claude's session files)
 * @param procDir the proc file system
 * @returns the busy directories, each with its reason
 */
function busyDirs(dirs, root, home, procDir) {
    const busy = new Map();
    const mark = (p, why) => {
        const d = holderOf(p, dirs);
        if (d && !busy.has(d)) busy.set(d, why);
    };
    markTickets(join(root, "tmp/push-queue"), mark);
    markSessions(join(home, ".claude/sessions"), mark);
    for (const pid of readdirSync(procDir)) {
        if (/^\d+$/.test(pid)) markProcess(join(procDir, pid), mark);
    }
    return busy;
}

const listDir = (dir) => (existsSync(dir) ? readdirSync(dir) : []);

/**
 * Marks the directory each live push-queue ticket names.
 * @param tickets the ticket directory
 * @param mark marks a path busy for a reason
 */
function markTickets(tickets, mark) {
    for (const name of listDir(tickets)) {
        if (!alive(Number(name.split("-").at(-1)))) continue;
        try {
            mark(readFileSync(join(tickets, name), "utf8").split(" :: ")[0].trim(), "ticket");
        } catch {
            // The push ended while read.
        }
    }
}

/**
 * Marks the working directory of each live Claude session.
 * @param sessions Claude's session directory
 * @param mark marks a path busy for a reason
 */
function markSessions(sessions, mark) {
    for (const name of listDir(sessions)) {
        const s = name.endsWith(".json") ? readJson(join(sessions, name)) : null;
        if (s?.pid && alive(s.pid)) mark(s.cwd, "process");
    }
}

/**
 * Marks a process's cwd and every file it has open.
 * @param dir the process's /proc directory
 * @param mark marks a path busy for a reason
 */
function markProcess(dir, mark) {
    const link = (p) => {
        try {
            mark(readlinkSync(p), "process");
        } catch {
            // Another user's process, gone, or closed while read.
        }
    };
    link(join(dir, "cwd"));
    let fds = [];
    try {
        fds = readdirSync(join(dir, "fd"));
    } catch {
        return;
    }
    for (const fd of fds) link(join(dir, "fd", fd));
}

/**
 * The worktree's last git activity: its index's or HEAD's mtime, or its newest reflog entry.
 * @param dir the worktree
 * @returns the time in ms
 */
function lastActivity(dir) {
    let gitdir;
    try {
        gitdir = readFileSync(join(dir, ".git"), "utf8")
            .replace(/^gitdir: /, "")
            .trim();
    } catch {
        return Date.now(); // Unreadable: treat as active, so it is kept.
    }
    const m = (f) => {
        try {
            return statSync(join(gitdir, f)).mtimeMs;
        } catch {
            return 0;
        }
    };
    // The reflog's newest entry, not the file's mtime: git gc rewrites every reflog file at once.
    let logged = 0;
    try {
        const last = readFileSync(join(gitdir, "logs/HEAD"), "utf8").trimEnd().split("\n").at(-1) ?? "";
        logged = Number(/> (\d+) [+-]\d{4}\t/.exec(last)?.[1] ?? 0) * 1000;
    } catch {
        // No reflog.
    }
    return Math.max(m("index"), m("HEAD"), logged);
}

const freeBytes = (dir) => {
    const s = statfsSync(dir);
    return s.bavail * s.bsize;
};

/**
 * Branches named by a `taken` marker in the round skills' state, and branches reverted from golden.
 * @param root the main checkout
 * @param env git's environment
 * @returns whether a branch is held
 */
function heldBranches(root, env) {
    const text = ["tmp/pipeline-round/state.json", "tmp/issue-round/state.json"]
        .map((f) => {
            try {
                return readFileSync(join(root, f), "utf8");
            } catch {
                return "";
            }
        })
        .join("\n");
    const reverted = new Set();
    const log = git(root, ["log", "origin/golden", "--format=%s", '--grep=^Revert "land: '], env);
    for (const s of log.out.split("\n")) {
        const m = /^Revert "land: (.+)"$/.exec(s);
        if (m) reverted.add(m[1]);
    }
    return (branch) => reverted.has(branch) || text.includes(`branch ${branch},`);
}

/**
 * The finished worktrees: a branch gone upstream, or a head reachable from master or golden that is not
 * on their first-parent line; a detached head when reachable.
 * @param trees the worktrees
 * @param root the main checkout
 * @param env git's environment
 * @returns the finished worktrees
 */
function finishedTrees(trees, root, env) {
    const bases = BASES.filter((b) => git(root, ["rev-parse", "-q", "--verify", b], env).code === 0);
    const firstParent = new Set(bases.flatMap((b) => lines(root, ["rev-list", "--first-parent", b], env)));
    const gone = new Set(
        lines(root, ["for-each-ref", "--format=%(refname:lstrip=2) %(upstream:track)", "refs/heads"], env)
            .filter((l) => l.endsWith(" [gone]"))
            .map((l) => l.slice(0, -" [gone]".length)),
    );
    const inBases = (sha) =>
        Boolean(sha) && git(root, ["rev-list", "--count", sha, "--not", ...bases], env).out.trim() === "0";
    return trees.filter((t) => {
        if (!t.branch) return inBases(t.head);
        return gone.has(t.branch) || (!firstParent.has(t.head) && inBases(t.head));
    });
}

const WAIT = "wait";

/**
 * Why a finished worktree is kept, if it is.
 * @param t the worktree
 * @param c the checks: `prot` protected directories, `busy` busy directories with their reasons, `held`
 *   whether a branch is held, `recentMs` the activity window, `env` git's environment
 * @param full whether this run's batch is already full
 * @returns a `KEEP` key, `WAIT` when it waits for a later run, or null to remove it
 */
function keepReason(t, c, full) {
    if (c.prot.some((p) => p === t.dir || p.startsWith(t.dir + "/"))) return "tool";
    if (t.locked) return "locked";
    if (t.branch && c.held(t.branch)) return "held";
    if (c.busy.has(t.dir)) return c.busy.get(t.dir);
    if (Date.now() - lastActivity(t.dir) < c.recentMs) return "recent";
    if (full) return WAIT;
    const n = git(t.dir, ["rev-list", "--count", "HEAD", "--not", "--remotes"], c.env);
    if (n.code !== 0 || n.out.trim() !== "0") return "unpushed";
    // No index refresh: --no-optional-locks keeps this a read.
    const st = git(t.dir, ["--no-optional-locks", "status", "--porcelain"], c.env);
    return st.code !== 0 || st.out.trim() !== "" ? "dirty" : null;
}

/**
 * Removes one worktree (its non-empty tmp/ moved to the main checkout's tmp/worktree-tmp first) and,
 * when merged, its branch.
 * @param t the worktree
 * @param root the main checkout
 * @param env git's environment
 * @param record appends an entry to the log
 * @param say prints a line
 * @returns whether it was removed
 */
function removeTree(t, root, env, record, say) {
    const scratch = join(t.dir, "tmp");
    let movedTmp = null;
    if (existsSync(scratch) && readdirSync(scratch).length) {
        movedTmp = join(root, "tmp/worktree-tmp", basename(t.dir));
        if (existsSync(movedTmp)) movedTmp += `-${Date.now()}`;
        mkdirSync(dirname(movedTmp), { recursive: true });
        renameSync(scratch, movedTmp);
    }
    const r = git(root, ["worktree", "remove", t.dir], env);
    if (r.code !== 0) {
        record({ kind: "worktree-remove-failed", dir: t.dir, branch: t.branch, movedTmp, error: r.err.trim() });
        say(`refused: ${t.dir}: ${r.err.trim()}`);
        return false;
    }
    const branchDeleted = t.branch ? git(root, ["branch", "-d", t.branch], env).code === 0 : null;
    record({ kind: "worktree-removed", dir: t.dir, branch: t.branch, branchDeleted, movedTmp });
    let what = "";
    if (t.branch) what = ` (${t.branch}${branchDeleted ? ", branch deleted" : ""})`;
    say(`removed ${t.dir}${what}`);
    return true;
}

/**
 * Splits the finished worktrees into this run's batch, the ones kept (counted through `bump`) and the
 * ones that wait for a later run.
 * @param finished the finished worktrees
 * @param checks the checks `keepReason` takes
 * @param max the most to put in the batch
 * @param bump counts one kept worktree under a reason
 * @returns `{ batch, waiting }`
 */
function pickBatch(finished, checks, max, bump) {
    const batch = [];
    let waiting = 0;
    for (const t of finished) {
        const why = keepReason(t, checks, batch.length >= max);
        if (why === WAIT) waiting++;
        else if (why) bump(KEEP[why]);
        else batch.push(t);
    }
    return { batch, waiting };
}

/**
 * Removes every worktree of the batch; a refused one is counted through `bump`.
 * @param batch the worktrees
 * @param c `root` the main checkout, `env` git's environment, `record` the log, `say` prints a line
 * @param bump counts one kept worktree under a reason
 * @returns the removed directories
 */
function removeBatch(batch, c, bump) {
    const removed = [];
    for (const t of batch) {
        if (removeTree(t, c.root, c.env, c.record, c.say)) removed.push(t.dir);
        else bump(KEEP.refused);
    }
    if (removed.length) git(c.root, ["worktree", "prune"], c.env);
    return removed;
}

/**
 * One pass: finds the finished worktrees and, with `apply`, removes up to `max` that pass every check.
 * @param o the options: `root` the main checkout, `apply` whether to remove, `max` the most to remove,
 *   `recentHours` the activity window; for tests `env`, `home`, `procDir`, `fetch` and `log`
 * @returns the removed directories, the ones a dry run would remove (`would`), the kept counts by
 *   reason, how many wait for a later run, the bytes freed and a one-line summary
 */
export function cleanup(o) {
    const { root, apply, max, recentHours } = o;
    const env = o.env ?? process.env;
    const home = o.home ?? homedir();
    const say = o.log ?? console.log;
    if (o.fetch !== false) git(root, ["fetch", "-q", "--prune", "--no-tags", "origin"], env);
    const list = git(root, ["worktree", "list", "--porcelain"], env);
    if (list.code !== 0) throw new Error(`git worktree list failed: ${list.err.trim()}`);
    const trees = parseTrees(list.out);
    const finished = finishedTrees(trees, root, env);

    const dirs = new Set(finished.map((t) => t.dir));
    const prot = [...new Set(protectedDirs(root, home))];
    const busy = busyDirs(dirs, root, home, o.procDir ?? "/proc");
    const held = heldBranches(root, env);
    const recentMs = recentHours * 3600e3;
    const kept = {};
    const bump = (k) => {
        kept[k] = (kept[k] ?? 0) + 1;
    };
    const { batch, waiting } = pickBatch(finished, { prot, busy, held, recentMs, env }, max, bump);

    const logFile = join(root, "tmp/worktree-cleanup/log.jsonl");
    const record = (e) => {
        mkdirSync(dirname(logFile), { recursive: true });
        appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), ...e }) + "\n");
    };
    const start = freeBytes(root);
    const removed = apply ? removeBatch(batch, { root, env, record, say }, bump) : [];
    const freedBytes = Math.max(0, freeBytes(root) - start);
    const done = apply
        ? `removed ${removed.length} (${(freedBytes / 1e9).toFixed(1)} GB freed)`
        : `would remove ${batch.length} (dry run)`;
    const parts = [
        `${trees.length} worktrees, ${trees.length - finished.length} not finished, ${finished.length} finished`,
        done,
    ];
    if (waiting) parts.push(`${waiting} more wait for the next run (--max ${max})`);
    const reasons = Object.entries(kept).sort((a, b) => b[1] - a[1]);
    const keptTotal = reasons.reduce((sum, [, n]) => sum + n, 0);
    const keptList = reasons.map(([w, n]) => `${n} ${w}`).join(", ");
    if (keptTotal) parts.push(`kept ${keptTotal}: ${keptList}`);
    const text = `worktree-cleanup: ${parts.join("; ")}`;
    if (apply) record({ kind: "pass", text });
    return { removed, would: apply ? [] : batch.map((t) => t.dir), kept, waiting, freedBytes, text };
}

function mainCheckout(cwd) {
    const r = git(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"], process.env);
    if (r.code !== 0) throw new Error(`not in a git repository: ${cwd}`);
    return dirname(r.out.trim());
}

async function main(argv) {
    const opt = (name, d) => {
        const i = argv.indexOf(name);
        if (i < 0) return d;
        const n = Number(argv[i + 1]);
        if (Number.isNaN(n) || n < 0) throw new Error(`${name} needs a number`);
        return n;
    };
    const known = new Set(["--dry-run", "--apply", "--max", "--every", "--recent"]);
    const bad = argv.find((a) => a.startsWith("--") && !known.has(a));
    if (bad) {
        console.error(
            `unknown option ${bad}\nusage: worktree-cleanup.mjs [--dry-run | --apply] [--max N] [--every M] [--recent H]`,
        );
        return 2;
    }
    const apply = argv.includes("--apply");
    const max = opt("--max", 50);
    const every = opt("--every", 0);
    const recentHours = opt("--recent", 3);
    // Idle IO and lowest CPU priority, inherited by every git this process starts.
    setPriority(19);
    spawnSync("ionice", ["-c3", "-p", String(process.pid)]);
    const root = mainCheckout(process.cwd());
    for (;;) {
        try {
            const r = cleanup({ root, apply, max, recentHours });
            for (const d of r.would) console.log(`would remove ${d}`);
            console.log(r.text);
        } catch (e) {
            console.error(`worktree-cleanup: ${e.message}`);
            if (!every) return 1;
        }
        if (!every) return 0;
        await sleep(every * 60e3);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
