#!/usr/bin/env node
// Lands finished branches on `golden`, the integration branch, and ships golden to master through one
// standing pull request. Design: design/ci/golden-local.md.
//
//   node tools/land.mjs land <branch> [--dry-run]   merge <branch> into golden, gate it, push it
//   node tools/land.mjs land <b1> <b2> ... [--dry-run]   land several branches in one gate run
//   node tools/land.mjs revert <branch>             take a landed branch back out of golden
//   node tools/land.mjs cut [<commit>]              point golden-cut at a known-good golden commit, open its pull request
//   node tools/land.mjs cut-fix <branch>            merge a fix the cut needs into golden-cut, push it, then land it on golden
//   node tools/land.mjs ship                        mark the cut pull request ready, with auto-merge
//   node tools/land.mjs status                      golden, its pull request, the lock, the newest preview, open work
//   node tools/land.mjs prune-branches [--yes]      list (with --yes: delete on GitHub) the branches golden holds
//   node tools/land.mjs sync [--branch <b>] [--dry-run] [--if-due] [--active-days N]
//                                                   merge golden into every branch in progress (tools/branch-sync.mjs)
//   --priority (land, revert, cut, cut-fix)         wait ahead of every ordinary landing: only for fixes that
//                                                   unblock the pipeline (a red master, a broken golden, a blocked cut)
//
// Every run executes one copy of this tool, the live copy in <main checkout>/.worktrees/land-live (put a new
// version there with `tools/live.sh land <branch>`), whichever checkout's copy was called: it re-runs the live
// copy with the same arguments and passes its exit code through. Without a live copy it runs itself and says so.
//
// Golden is the local branch `golden` in the worktree <main checkout>/.worktrees/golden-local (made on
// first use), pushed to `golden` on GitHub after every landing. One landing or revert runs at a time
// (a lock in <main checkout>/tmp/golden/); the others wait and say who holds it. `ship` takes no lock: it
// only marks the cut pull request ready, and refuses while a cut is pushing golden-cut.
//
// A landing first merges origin/golden (the owner's screenshot accept commits) and origin/master
// (release merges, the merged golden pull request) into golden, then merges <branch> with --no-ff as
// "land: <branch>", then pushes through tools/push-queue.sh, which runs the full pre-push gate. A
// failure puts golden back as it was before the sync: nothing unpushed stays on it. When GitHub's
// golden moved during the gate (the owner's accept commits), it is merged and pushed again. After a push
// the standing draft pull request golden -> master is created if needed, its description lists the
// landed branches and the issues their commits name, and tools/visual-preview.sh captures it in the
// background for the review page.
//
// What ships is a cut, not golden's tip: `cut` points the branch golden-cut on GitHub at the newest
// first-parent golden commit whose local screenshot preview finished with no unstable or failed images
// (else the commit given, else it refuses), pushes it through the push queue from the worktree
// <main checkout>/.worktrees/golden-cut, opens or refreshes the draft pull request golden-cut -> master
// and starts its preview. The owner's approvals that ship are made on that pull request, and `ship`
// marks it ready with auto-merge. The golden pull request stays open as an early look at golden's tip.
//
// Never copy, always merge: a landing refuses a branch whose commits are already on golden under other ids
// (a cherry-pick or rebase of commits golden has), so a copy never lands beside its original. A fix the
// cut needs starts from origin/golden-cut and goes in with `cut-fix`: merged into golden-cut, pushed, then
// landed on golden the normal way, so both hold the same commits. Merged branches stay, on GitHub and here,
// as history; `prune-branches --yes` deletes them from GitHub only when someone runs it by hand.
//
// Several branches land under the one lock and sync, each merged in order as its own "land: <branch>",
// and pushed once. A branch that conflicts (or is already on golden) is skipped and the rest land; when
// the gate fails, the merged branches are split in halves to find the culprit, and every half that
// passes stays landed. A summary lists each branch's outcome.
//
// Exit codes: 0 done, 1 refused or failed, 2 the branch conflicts with golden (several: only conflicts
// kept some out), 3 the gate failed (several: a gate failure kept some out), 4 golden could not take
// origin/golden or origin/master (before the merge, or after a gate it passed), 5 several branches: both
// conflicts and gate failures kept some out.
import { spawn, spawnSync } from "node:child_process";
import {
    appendFileSync,
    closeSync,
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    openSync,
    readdirSync,
    readFileSync,
    realpathSync,
    renameSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { constants as osConstants, hostname } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { findNote, issueInName, parseNote, readIssues } from "./branch-note.mjs";
import { ACTIVE_DAYS, defaultCheck, moveGoldenGood, syncCommand } from "./branch-sync.mjs";
import { logWait } from "./wait-log.mjs";

export const GOLDEN = "golden";
export const PR_TITLE = "chore: land golden into master";
export const CUT = "golden-cut";
export const CUT_TITLE = "chore: ship a golden cut into master";
const BROKEN = new Set(["failed", "unstable"]);
const LAND_SUBJECT = /^land: (\S+)$/;
// git 2.43+ names a revert of a revert "Reapply"; older versions nest the quotes.
const REVERT_SUBJECT = /^Revert "land: (\S+)"$/;
const REAPPLY_SUBJECT = /^(?:Reapply "land: (\S+)"|Revert "Revert "land: (\S+)"")$/;
const ISSUE_REF = /\b(fix(?:es|ed)?|close[sd]?|resolve[sd]?|refs?|part of):?\s+((?:[\w.-]+\/[\w.-]+)?#\d+)\b/gi;

// ---------------------------------------------------------------- git

/**
 * Runs git and returns what it printed.
 * @param ctx the run's context (`env`)
 * @param cwd where to run it
 * @param args git's arguments
 * @param [opts] `ok: true` returns `{ status, stdout, stderr }` instead of throwing on a failure
 * @returns stdout, trimmed
 */
export function git(ctx, cwd, args, opts = {}) {
    const r = spawnSync("git", args, { cwd, env: ctx.env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.error) throw new Error(`git ${args.join(" ")} could not run in ${cwd}: ${r.error.message}`);
    if (opts.ok) return { status: r.status, stdout: r.stdout.trim(), stderr: r.stderr.trim() };
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed in ${cwd}:\n${r.stderr.trim()}`);
    return r.stdout.trim();
}

/**
 * The main checkout: the parent of the git common directory, so any worktree finds the same one.
 * @param ctx the run's context
 * @param cwd any directory of the repository
 * @returns its absolute path
 */
export function mainCheckout(ctx, cwd) {
    return dirname(git(ctx, cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"]));
}

const hasRef = (ctx, cwd, ref) => git(ctx, cwd, ["rev-parse", "--verify", "-q", `${ref}^{commit}`], { ok: true });

// ---------------------------------------------------------------- the lock

const alive = (pid) => {
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return e.code === "EPERM";
    }
};

/**
 * Who holds the lock, if anyone.
 * @param dir the lock directory
 * @returns its owner record, `{}` while it is being written, or null when it is free
 */
export function readLock(dir) {
    if (!existsSync(dir)) return null;
    try {
        return JSON.parse(readFileSync(join(dir, "owner.json"), "utf8"));
    } catch {
        return {};
    }
}

/**
 * Whether a held lock's holder is gone: its process is dead, or the directory has had no owner
 * record for a minute (a holder killed between making it and writing the record).
 * @param dir the lock directory
 * @param owner its owner record
 * @returns true when the lock can be taken over
 */
function stale(dir, owner) {
    if (owner.pid) return owner.host === hostname() && !alive(owner.pid);
    try {
        return Date.now() - statSync(dir).mtimeMs > 60_000;
    } catch {
        return false;
    }
}

/**
 * Takes the exclusive lock, waiting while another process holds it. Waiters queue in the order they
 * asked, each with a ticket file in `<dir>.queue/`, and only the oldest live ticket tries the lock.
 * ponytail: one lock for every landing and revert; per-branch locks only if landings must overlap.
 * @param dir the lock directory (made with mkdir, which is atomic)
 * @param info what to record about this holder (the command and branch)
 * @param [opts] `pollMs` between looks (15 s); `onWait(owner)` once per holder seen waiting;
 * `onQueue(position)` when this waiter's place in line (1 = next) is first known and when it changes;
 * `priority: true` to wait ahead of every ordinary waiter (never ahead of the holder); `waitLog` records
 * the wait and the hold (tools/wait-log.mjs, by default)
 * @returns a function that releases it
 */
export async function acquireLock(dir, info, opts = {}) {
    const pollMs = opts.pollMs ?? 15_000;
    const waitLog = opts.waitLog ?? logWait;
    // "lock" is the landing lock, "cut-lock" the cut's.
    const kind = basename(dir) === "lock" ? "land-lock" : basename(dir);
    const waiter = [info.command, info.branch].filter(Boolean).join(" ");
    const heldBy = new Set();
    const start = Date.now();
    const tell = waitReporter(opts);
    mkdirSync(dirname(dir), { recursive: true });
    const ticket = enqueue(dir, info, opts.priority);
    try {
        for (;;) {
            const position = queuePosition(ticket.file);
            const release = position === 1 ? tryLock(dir, info) : null;
            if (release) {
                const taken = Date.now();
                waitLog({ kind, start, end: taken, waiter, heldBy: [...heldBy] });
                return () => {
                    release();
                    waitLog({ kind: `${kind}-held`, start: taken, waiter });
                };
            }
            const owner = readLock(dir);
            if (owner && stale(dir, owner)) {
                removeStaleLock(dir, owner);
                continue;
            }
            if (owner?.pid) heldBy.add(describeOwner(owner));
            tell(owner, position);
            await new Promise((r) => setTimeout(r, pollMs));
        }
    } finally {
        ticket.drop();
    }
}

/**
 * Says who holds the lock, once per holder, and this waiter's place in line, once per change.
 * @param opts acquireLock's options (`onWait`, `onQueue`)
 * @returns a function of the holder (or null) and the place in line
 */
function waitReporter(opts) {
    const onWait = opts.onWait ?? ((o) => console.log(`land: waiting for the lock, held by ${describeOwner(o)}`));
    const onQueue = opts.onQueue ?? ((n) => console.log(`land: number ${n} in line for the lock`));
    let seen = "";
    let place = 0;
    return (owner, position) => {
        if (position !== place) onQueue(position);
        place = position;
        const key = owner ? `${owner.pid}:${owner.since}` : "";
        if (key && key !== seen) onWait(owner);
        seen = key;
    };
}

const QUEUE_SIGNALS = { SIGINT: 130, SIGTERM: 143 };

/**
 * Puts this waiter's ticket in the queue next to the lock. It is removed when the lock is taken, and
 * on exit or SIGINT/SIGTERM while waiting.
 * Tickets sort by name: a rank (0 priority, 1 ordinary), then process.hrtime, so priority tickets go
 * first and each rank keeps its arrival order.
 * ponytail: process.hrtime is the machine-wide monotonic clock, so there is no clock skew between
 * processes; the lock is in one checkout on one machine, so hosts never mix.
 * @param dir the lock directory
 * @param info what to record about this waiter
 * @param [priority] true for the priority lane
 * @returns `{ file, drop }`: the ticket and a function that removes it
 */
function enqueue(dir, info, priority = false) {
    const queue = `${dir}.queue`;
    mkdirSync(queue, { recursive: true });
    const rank = priority ? 0 : 1;
    const file = join(queue, `${rank}-${String(process.hrtime.bigint()).padStart(20, "0")}-${process.pid}.json`);
    const owner = { ...info, pid: process.pid, host: hostname(), since: new Date().toISOString() };
    writeFileSync(file, `${JSON.stringify(owner)}\n`);
    const remove = () => rmSync(file, { force: true });
    const signals = Object.entries(QUEUE_SIGNALS).map(([signal, code]) => [
        signal,
        () => {
            remove();
            process.exit(code);
        },
    ]);
    process.once("exit", remove);
    for (const [signal, handler] of signals) process.once(signal, handler);
    const drop = () => {
        remove();
        process.off("exit", remove);
        for (const [signal, handler] of signals) process.off(signal, handler);
    };
    return { file, drop };
}

/**
 * This waiter's place in line among the live tickets; a ticket whose process is gone is removed.
 * @param file this waiter's ticket
 * @returns 1 for the oldest live ticket, 2 for the next, and so on
 */
function queuePosition(file) {
    const queue = dirname(file);
    const mine = basename(file);
    const live = [];
    for (const name of readdirSync(queue).sort()) {
        const pid = Number(/-(\d+)\.json$/.exec(name)?.[1]);
        if (name === mine || (pid && alive(pid))) live.push(name);
        else rmSync(join(queue, name), { force: true });
    }
    return live.indexOf(mine) + 1;
}

/**
 * Makes the lock directory if nobody holds it.
 * @param dir the lock directory
 * @param info what to record about this holder
 * @returns a function that releases it, or null when it is held
 */
export function tryLock(dir, info) {
    try {
        mkdirSync(dir);
    } catch (e) {
        if (e.code !== "EEXIST") throw e;
        return null;
    }
    const owner = { ...info, pid: process.pid, host: hostname(), since: new Date().toISOString() };
    writeFileSync(join(dir, "owner.json"), `${JSON.stringify(owner)}\n`);
    return () => {
        if (readLock(dir)?.pid === process.pid) rmSync(dir, { recursive: true, force: true });
    };
}

/**
 * Removes a lock whose holder is gone. Renamed first, then checked: when another waiter took the
 * stale lock over and made its own in the meantime, the renamed directory is that new holder's, and
 * it is put back.
 * ponytail: a third process taking the lock while it is moved away still slips through.
 * @param dir the lock directory
 * @param owner the stale holder this waiter saw
 */
function removeStaleLock(dir, owner) {
    const gone = `${dir}.stale-${process.pid}`;
    try {
        renameSync(dir, gone);
    } catch {
        return; // another waiter took it first
    }
    const moved = readLock(gone) ?? {};
    if (moved.pid !== owner.pid || moved.since !== owner.since) {
        try {
            renameSync(gone, dir);
        } catch {
            // the third process above
        }
        return;
    }
    rmSync(gone, { recursive: true, force: true });
    console.log(`land: took over a stale lock from ${describeOwner(owner)}`);
}

const describeOwner = (o) =>
    o?.pid
        ? `pid ${o.pid} (${[o.command, o.branch].filter(Boolean).join(" ")}, since ${o.since})`
        : "a process starting up";

// ---------------------------------------------------------------- golden's history

/**
 * The branches landed on golden that are not on master yet, oldest first, from golden's first-parent
 * history: each "land: <branch>" merge, marked reverted when a later revert took it out (and active
 * again when that revert was itself reverted).
 * @param ctx the run's context
 * @param cwd the golden worktree
 * @param [base] what is already shipped (origin/master)
 * @param [head] golden's tip
 * @returns `[{ branch, sha, reverted: <revert sha> | null, subjects: [...], refs: [...] }]`
 */
export function landedBranches(ctx, cwd, base = "origin/master", head = "HEAD") {
    const out = git(ctx, cwd, ["log", "--first-parent", "--reverse", "--format=%H%x00%P%x00%s", `${base}..${head}`]);
    const entries = [];
    const last = (branch, reverted) =>
        entries.findLast((e) => e.branch === branch && Boolean(e.reverted) === reverted) ?? null;
    for (const line of out.split("\n").filter(Boolean)) {
        const [sha, parents, subject] = line.split("\0");
        const landed = LAND_SUBJECT.exec(subject);
        const reverted = REVERT_SUBJECT.exec(subject);
        const reapplied = REAPPLY_SUBJECT.exec(subject);
        if (landed && parents.split(" ").length === 2) {
            entries.push({ branch: landed[1], sha, reverted: null, ...branchCommits(ctx, cwd, sha) });
        } else if (reverted) {
            const e = last(reverted[1], false);
            if (e) e.reverted = sha;
        } else if (reapplied) {
            const e = last(reapplied[1] ?? reapplied[2], true);
            if (e) e.reverted = null;
        }
    }
    return entries;
}

/**
 * The commits a land merge brought in, and the issue references in their messages.
 * @param ctx the run's context
 * @param cwd the golden worktree
 * @param merge the "land: <branch>" merge commit
 * @returns `{ subjects, refs }`
 */
function branchCommits(ctx, cwd, merge) {
    const log = git(ctx, cwd, ["log", "--no-merges", "--reverse", "--format=%s%x00%B%x01", `${merge}^1..${merge}^2`]);
    const subjects = [];
    const refs = [];
    for (const record of log.split("\x01").filter((r) => r.trim())) {
        const [subject, body] = record.replace(/^\n/, "").split("\0");
        subjects.push(subject);
        refs.push(...issueRefs(body));
    }
    return { subjects, refs };
}

/**
 * The issue references in a commit message: Fixes / Closes / Resolves #N (which close the issue when
 * the commit reaches master) and Refs / Part of #N (which do not).
 * @param text a commit message
 * @returns "Fixes #12"-style lines, keyword normalized
 */
export function issueRefs(text) {
    const refs = [];
    for (const [, keyword, ref] of text.matchAll(ISSUE_REF)) {
        const k = keyword.toLowerCase();
        let word = "Refs";
        if (k.startsWith("fix")) word = "Fixes";
        else if (k.startsWith("close")) word = "Closes";
        else if (k.startsWith("resolve")) word = "Resolves";
        else if (k === "part of") word = "Part of";
        refs.push(`${word} ${ref}`);
    }
    return refs;
}

const GOLDEN_INTRO = [
    "This pull request is an early look at golden's tip and does not ship. What ships is the cut pull request",
    `(branch \`${CUT}\`, made by \`node tools/land.mjs cut\`): approvals that ship are made there.`,
    "",
];

/**
 * The golden pull request's description: each landed branch with its commits, the reverted ones, and
 * the issue references (or the line "No issue", which the Link PR Issue check accepts instead).
 * @param landed `landedBranches()`
 * @param [intro] lines after the opening paragraph (the golden pull request's: it does not ship)
 * @returns the description, Markdown
 */
export function prBody(landed, intro = GOLDEN_INTRO) {
    const active = landed.filter((e) => !e.reverted);
    const byBranch = new Map();
    for (const e of active) {
        const subjects = byBranch.get(e.branch) ?? new Set();
        e.subjects.forEach((s) => subjects.add(s));
        byBranch.set(e.branch, subjects);
    }
    const lines = [
        "Changes landed on `golden` with `node tools/land.mjs land <branch>`. Each passed the full pre-push gate",
        "before it was pushed. Design: `design/ci/golden-local.md`.",
        "",
        ...intro,
    ];
    if (byBranch.size === 0) lines.push("Nothing is landed: every landing here was reverted.", "");
    for (const [branch, subjects] of byBranch) {
        lines.push(`### ${branch}`, "", ...[...subjects].map((s) => `- ${s}`), "");
    }
    const reverted = [...new Set(landed.filter((e) => e.reverted).map((e) => e.branch))].filter(
        (b) => !byBranch.has(b),
    );
    const quoted = reverted.map((b) => "`" + b + "`");
    if (reverted.length) lines.push(`Reverted from golden: ${quoted.join(", ")}`, "");
    const refs = [...new Set(active.flatMap((e) => e.refs))];
    lines.push("### Issues", "", ...(refs.length ? refs : ["No issue"]), "");
    return lines.join("\n");
}

// ---------------------------------------------------------------- golden's worktree

/**
 * The hooks directory merges and reverts on golden run with: the repository's hooks without
 * prepare-commit-msg, whose Commitizen wizard would take over a terminal. commit-msg (commitlint)
 * and pre-commit (the secret scan) still run.
 * @param ctx the run's context
 * @returns its path
 */
function hooksDir(ctx) {
    const dir = mkdtempSync(join(ctx.main, "tmp/golden/hooks-"));
    const husky = join(ctx.golden, ".husky");
    if (existsSync(husky)) {
        for (const f of readdirSync(husky, { withFileTypes: true })) {
            if (f.isFile() && f.name !== "prepare-commit-msg") copyFileSync(join(husky, f.name), join(dir, f.name));
        }
    }
    return dir;
}

const commitGit = (ctx, args, opts) => git(ctx, ctx.golden, withHooks(ctx, args), opts);

/**
 * Makes the golden worktree when it does not exist, from origin/golden when GitHub has it, else
 * from origin/master, with tools/worktree-new.sh (which links .env and installs).
 * @param ctx the run's context
 */
function ensureGolden(ctx) {
    if (existsSync(ctx.golden)) return;
    git(ctx, ctx.main, ["fetch", "-q", "origin"]);
    const base = hasRef(ctx, ctx.main, `origin/${GOLDEN}`).status === 0 ? `origin/${GOLDEN}` : "origin/master";
    console.log(`land: making the golden worktree ${ctx.golden} from ${base}`);
    ctx.addWorktree(ctx, base);
    markInstalled(ctx);
}

function defaultAddWorktree(ctx, base) {
    const r = spawnSync(
        join(dirname(fileURLToPath(import.meta.url)), "worktree-new.sh"),
        [GOLDEN, base, "golden-local"],
        {
            cwd: ctx.main,
            env: ctx.env,
            stdio: "inherit",
        },
    );
    if (r.status !== 0) throw new Error("tools/worktree-new.sh could not make the golden worktree");
}

// The lockfile golden's node_modules were installed from, so a landing installs only when it changed.
const lockBlob = (ctx) => git(ctx, ctx.golden, ["rev-parse", "-q", "--verify", "HEAD:pnpm-lock.yaml"], { ok: true });
const installedFile = (ctx) => join(ctx.main, "tmp/golden/installed-lockfile");
function markInstalled(ctx) {
    const blob = lockBlob(ctx);
    if (blob.status === 0) writeFileSync(installedFile(ctx), `${blob.stdout}\n`);
}
function installIfNeeded(ctx) {
    const blob = lockBlob(ctx);
    if (blob.status !== 0) return;
    const installed = existsSync(installedFile(ctx)) ? readFileSync(installedFile(ctx), "utf8").trim() : "";
    if (installed === blob.stdout) return;
    console.log("land: pnpm-lock.yaml changed; pnpm install --frozen-lockfile");
    ctx.install(ctx);
    markInstalled(ctx);
}
function defaultInstall(ctx, cwd = ctx.golden) {
    const r = spawnSync("pnpm", ["install", "--frozen-lockfile"], { cwd, env: ctx.env, stdio: "inherit" });
    if (r.status !== 0) throw new Error(`pnpm install --frozen-lockfile failed in ${cwd}`);
}

/**
 * Brings golden up to origin/golden (the owner's accept commits) and origin/master (release merges,
 * the merged golden pull request). On a conflict golden is put back as it was.
 * @param ctx the run's context
 * @returns null when synced, else `{ ref, files, error }`: what conflicted, or git's message when nothing did
 */
export function sync(ctx) {
    git(ctx, ctx.golden, ["fetch", "-q", "origin"]);
    updateMainCheckout(ctx);
    const start = git(ctx, ctx.golden, ["rev-parse", "HEAD"]);
    for (const ref of [`origin/${GOLDEN}`, "origin/master"]) {
        if (hasRef(ctx, ctx.golden, ref).status !== 0) continue;
        const r = commitGit(ctx, ["merge", "--no-edit", ref], { ok: true });
        if (r.status === 0) continue;
        const files = conflicted(ctx);
        git(ctx, ctx.golden, ["merge", "--abort"], { ok: true });
        git(ctx, ctx.golden, ["reset", "-q", "--hard", start]);
        return { ref, files, error: r.stderr || r.stdout };
    }
    return null;
}

/**
 * Fast-forwards the main checkout's master to origin/master after a fetch, so new sessions read
 * current instructions (CLAUDE.md) from it. Changes nothing, with one warning line, when it is on
 * another branch, has tracked changes or has commits origin/master lacks; never throws.
 * @param ctx the run's context
 */
export function updateMainCheckout(ctx) {
    try {
        const from = git(ctx, ctx.main, ["rev-parse", "HEAD"]);
        const to = git(ctx, ctx.main, ["rev-parse", "origin/master"]);
        if (from === to) return;
        const why = mainCheckoutBlocker(ctx, from);
        if (why) {
            console.error(`land: warning: left the main checkout ${ctx.main} alone: ${why}`);
            return;
        }
        git(ctx, ctx.main, ["merge", "-q", "--ff-only", "origin/master"]);
        console.log(`land: moved the main checkout's master from ${from.slice(0, 10)} to ${to.slice(0, 10)}`);
    } catch (e) {
        console.error(`land: warning: could not update the main checkout ${ctx.main}: ${e.message}`);
    }
}

/**
 * Why the main checkout cannot be fast-forwarded to origin/master.
 * @param ctx the run's context
 * @param head its HEAD commit
 * @returns the reason, or null when it can be
 */
function mainCheckoutBlocker(ctx, head) {
    const branch = git(ctx, ctx.main, ["symbolic-ref", "-q", "--short", "HEAD"], { ok: true }).stdout;
    if (branch !== "master") return `it is on ${branch || "a detached HEAD"}, not master`;
    if (git(ctx, ctx.main, ["status", "--porcelain", "--untracked-files=no"])) return "it has uncommitted changes";
    const ff = git(ctx, ctx.main, ["merge-base", "--is-ancestor", head, "origin/master"], { ok: true });
    return ff.status === 0 ? null : "its master has commits origin/master does not";
}

const conflicted = (ctx) =>
    git(ctx, ctx.golden, ["diff", "--name-only", "--diff-filter=U"], { ok: true }).stdout.split("\n").filter(Boolean);

// ---------------------------------------------------------------- GitHub and the gate

/**
 * Pushes through the push queue, which runs the full pre-push gate.
 * @param ctx the run's context
 * @param [cwd] the worktree to push from (golden's)
 * @param [refspec] what to push (golden to golden)
 * @returns `{ code, output }`
 */
function defaultPush(ctx, cwd = ctx.golden, refspec = `${GOLDEN}:${GOLDEN}`) {
    // Measured from master: everything on golden that master does not have yet is this push's change.
    const env = { ...ctx.env, PUSH_BASE_REF: "origin/master" };
    const child = spawn(join(cwd, "tools/push-queue.sh"), ["git", "push", "origin", refspec], {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
    });
    ctx.child = child;
    let output = "";
    const copy = (to) => (d) => {
        output += d;
        to.write(d);
    };
    child.stdout.on("data", copy(process.stdout));
    child.stderr.on("data", copy(process.stderr));
    return new Promise((resolve) => child.on("close", (code) => resolve({ code: code ?? 1, output })));
}

function defaultGh(ctx, args) {
    const r = spawnSync("gh", args, { cwd: ctx.main, env: ctx.env, encoding: "utf8" });
    // A GraphQL answer with errors (one asked-for issue does not exist) still carries the rest.
    if (r.status !== 0 && !r.stdout?.startsWith('{"data":{'))
        throw new Error(`gh ${args.slice(0, 2).join(" ")} failed: ${r.stderr?.trim() || r.error}`);
    return r.stdout.trim();
}

/**
 * Starts tools/visual-preview.sh for a pull request, detached, unless the gate already captured this
 * head for it. It captures `cwd`'s HEAD, the commit just pushed: the script waits until GitHub lists
 * it as the pull request's head (--expect), since GitHub can still report the old head for a while.
 * @param ctx the run's context
 * @param pr the pull request's number
 * @param [cwd] the worktree holding its head (golden's)
 */
export function defaultPreview(ctx, pr, cwd = ctx.golden) {
    const head = git(ctx, cwd, ["rev-parse", "HEAD"]);
    const done = join(ctx.main, `tmp/visual-review/local/${pr}/status.json`);
    try {
        const s = JSON.parse(readFileSync(done, "utf8"));
        if (s.head === head && s.state !== "failed") {
            console.log(`land: the gate's screenshot preview of ${head.slice(0, 10)} is already on #${pr}`);
            return;
        }
    } catch {
        // no preview of this pull request yet
    }
    const log = join(ctx.main, `tmp/golden/preview-${pr}.log`);
    const fd = openSync(log, "w");
    spawn("setsid", [join(cwd, "tools/visual-preview.sh"), String(pr), "--expect", head], {
        cwd,
        env: ctx.env,
        detached: true,
        stdio: ["ignore", fd, fd],
    }).unref();
    closeSync(fd);
    console.log(`land: screenshots of #${pr} are being captured for the review page (log: ${log})`);
}

/**
 * The open golden -> master (or golden-cut -> master) pull request, from GitHub (one call).
 * @param ctx the run's context
 * @param [head] its branch (golden)
 * @returns `{ number, isDraft, url, headRefOid }` or null
 */
function goldenPr(ctx, head = GOLDEN) {
    const out = ctx.gh(ctx, [
        "pr",
        "list",
        "--head",
        head,
        "--base",
        "master",
        "--state",
        "open",
        "--json",
        "number,isDraft,url,headRefOid",
    ]);
    try {
        return JSON.parse(out || "[]")[0] ?? null;
    } catch {
        return null;
    }
}

/**
 * Makes sure the standing draft pull request exists and its description lists what golden holds.
 * @param ctx the run's context
 * @returns its number, or null when GitHub did not answer
 */
function refreshPr(ctx) {
    return upsertPr(ctx, GOLDEN, PR_TITLE, prBody(landedBranches(ctx, ctx.golden)));
}

/**
 * Opens a draft pull request from `head` into master, or rewrites the open one's description (and,
 * with `retitle`, its title).
 * @param ctx the run's context
 * @param head the branch
 * @param title the title of a new pull request
 * @param body the description
 * @param [retitle] also set the title of an existing one
 * @returns its number, or null when GitHub did not answer
 */
function upsertPr(ctx, head, title, body, retitle = false) {
    const file = join(ctx.main, `tmp/golden/pr-body-${head}.md`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
    const pr = goldenPr(ctx, head);
    if (pr) {
        // gh pr edit fails on this repository while GitHub retires classic Projects; the REST call does not.
        const fields = ["-F", `body=@${file}`, ...(retitle ? ["-f", `title=${title}`] : [])];
        ctx.gh(ctx, ["api", "-X", "PATCH", `repos/{owner}/{repo}/pulls/${pr.number}`, ...fields]);
        return pr.number;
    }
    const url = ctx.gh(ctx, [
        "pr",
        "create",
        "--draft",
        "--base",
        "master",
        "--head",
        head,
        "--title",
        title,
        "--body-file",
        file,
    ]);
    const n = /\/pull\/(\d+)/.exec(url)?.[1];
    if (n) console.log(`land: opened the ${head} pull request ${url}`);
    return n ? Number(n) : null;
}

function gateLog(ctx, sha, output) {
    try {
        const lines = readFileSync(join(ctx.main, "tmp/push-log.jsonl"), "utf8").trim().split("\n");
        const entry = lines.map((l) => JSON.parse(l)).findLast((e) => e.sha === sha);
        if (entry?.gateLog) return entry.gateLog;
    } catch {
        // no push log
    }
    const named = output.split(/\s/).find((w) => w.includes("push-gate-logs/") && w.endsWith(".log"));
    return named ?? "(the push output above)";
}

/**
 * Whether a failed push was GitHub refusing it because the branch moved there (the owner's Finish pushes
 * accept commits to golden or golden-cut), rather than the gate refusing it.
 * @param ctx the run's context
 * @param output what the push printed
 * @param [wt] the worktree and branch pushed (golden's)
 * @returns true when origin has commits of the branch that the worktree does not
 */
function goldenMoved(ctx, output, wt = goldenTree(ctx)) {
    if (!/\[(remote )?rejected\]|non-fast-forward|fetch first/.test(output)) return false;
    git(ctx, wt.dir, ["fetch", "-q", "origin"], { ok: true });
    const ref = `origin/${wt.branch}`;
    if (hasRef(ctx, wt.dir, ref).status !== 0) return false;
    return git(ctx, wt.dir, ["merge-base", "--is-ancestor", ref, "HEAD"], { ok: true }).status !== 0;
}

const goldenTree = (ctx) => ({ dir: ctx.golden, branch: GOLDEN });
const withHooks = (ctx, args) => [...(ctx.hooks ? ["-c", `core.hooksPath=${ctx.hooks}`] : []), ...args];

/**
 * Pushes golden (or golden-cut) through the gate. When the branch moved on GitHub during the gate, merges
 * it and pushes again (the gate skips the shards it already passed). On a failure the worktree is reset
 * to `before` (it was never pushed).
 * @param ctx the run's context
 * @param before the commit to go back to on a failure
 * @param [rollback] where an interrupted push puts golden back (`before`)
 * @param [wt] the worktree and branch to push (golden's)
 * @returns `{ code, sha, log }`: code 0 pushed, 3 the gate refused it (`log` names its log), 4 the branch moved
 */
async function pushGolden(ctx, before, rollback = before, wt = goldenTree(ctx)) {
    const isGolden = wt.dir === ctx.golden;
    if (isGolden) ctx.rollback = rollback;
    for (let tries = 1; ; tries++) {
        const sha = git(ctx, wt.dir, ["rev-parse", "HEAD"]);
        const { code, output } = isGolden
            ? await ctx.push(ctx)
            : await ctx.push(ctx, wt.dir, `HEAD:refs/heads/${wt.branch}`);
        if (code === 0) {
            ctx.rollback = null;
            return { code, sha };
        }
        const moved = goldenMoved(ctx, output, wt);
        if (moved && tries < 3) {
            console.log(
                `land: ${wt.branch} moved on GitHub during the gate; merging origin/${wt.branch} and pushing again`,
            );
            const args = withHooks(ctx, ["merge", "--no-edit", `origin/${wt.branch}`]);
            if (git(ctx, wt.dir, args, { ok: true }).status === 0) continue;
            git(ctx, wt.dir, ["merge", "--abort"], { ok: true });
        }
        ctx.rollback = null;
        git(ctx, wt.dir, ["reset", "-q", "--hard", before]);
        if (moved) {
            console.error(
                `land: ${wt.branch} moved on GitHub and could not be merged and pushed again; it is back at ${before.slice(0, 10)}.\n` +
                    "Nothing is wrong with the branch: land it again.",
            );
            return { code: 4, sha };
        }
        const log = gateLog(ctx, sha, output);
        console.error(`land: the gate refused ${wt.branch}; it is back at ${before.slice(0, 10)}.`);
        console.error(`land: gate log: ${log}`);
        return { code: 3, sha, log };
    }
}

/**
 * Pushes golden and, on success, refreshes the pull request and its preview.
 * @param ctx the run's context
 * @param before golden's commit to go back to on a failure
 * @returns the exit code
 */
async function publish(ctx, before) {
    const r = await pushGolden(ctx, before);
    if (r.code === 0) announce(ctx, r.sha);
    return r.code;
}

/**
 * After a push: refreshes the golden pull request's description and starts its preview.
 * @param ctx the run's context
 * @param sha the commit golden was pushed at
 */
function announce(ctx, sha) {
    let pr = null;
    try {
        pr = refreshPr(ctx);
    } catch (e) {
        console.error(`land: ${e.message}`);
    }
    if (pr) ctx.preview(ctx, pr);
    else console.error("land: the golden pull request was not updated; the next land or revert updates it");
    try {
        moveGoldenGood(ctx);
    } catch (e) {
        console.error(`land: golden-good was not moved: ${e.message.split("\n")[0]}`);
    }
    const where = pr ? `, pull request #${pr}` : "";
    console.log(`land: golden is ${sha.slice(0, 10)} on GitHub${where}.`);
}

// ---------------------------------------------------------------- commands

/**
 * Lands a branch on golden.
 * @param ctx the run's context
 * @param branch the branch to land
 * @param [opts] `dryRun`: merge, report, undo; no push, no GitHub
 * @returns the exit code
 */
export async function land(ctx, branch, opts = {}) {
    const ref = branchRef(ctx, branch);
    if (!ref) return fail(`no branch ${branch} here or on origin`);
    // Every failure goes back to `start`, before the sync, so no unpushed sync merge stays on golden
    // (ship refuses while golden differs from GitHub's); the next landing syncs again.
    const start = git(ctx, ctx.golden, ["rev-parse", "HEAD"]);
    const synced = syncOrReport(ctx);
    if (synced !== 0) return synced;
    const before = git(ctx, ctx.golden, ["rev-parse", "HEAD"]);
    if (git(ctx, ctx.golden, ["merge-base", "--is-ancestor", ref, "HEAD"], { ok: true }).status === 0) {
        git(ctx, ctx.golden, ["reset", "-q", "--hard", start]);
        console.log(`land: ${branch} is already on golden; nothing to land.`);
        return 0;
    }
    const copies = copiedCommits(ctx, ref);
    if (copies.length) {
        git(ctx, ctx.golden, ["reset", "-q", "--hard", start]);
        return fail(copyRefusal(branch, copies));
    }
    const merged = reapply(ctx, branch, ref) || mergeBranch(ctx, branch, ref);
    if (merged !== 0) {
        git(ctx, ctx.golden, ["reset", "-q", "--hard", start]);
        return merged;
    }
    if (opts.dryRun) {
        const what = git(ctx, ctx.golden, ["diff", "--stat", before, "HEAD"]);
        const log = git(ctx, ctx.golden, ["log", "--oneline", `${start}..HEAD`]);
        git(ctx, ctx.golden, ["reset", "-q", "--hard", start]);
        console.log(`land: dry run -- ${branch} merges cleanly. Would push to golden:\n${log}\n${what}`);
        return 0;
    }
    installIfNeeded(ctx);
    return publish(ctx, start);
}

const branchRef = (ctx, branch) =>
    [`refs/heads/${branch}`, `refs/remotes/origin/${branch}`].find((r) => hasRef(ctx, ctx.main, r).status === 0);

/**
 * The commits of a branch that golden already has under other ids: `git cherry` marks a commit "-" when
 * golden holds one with the same patch, which only a copy (a cherry-pick or a rebase) makes.
 * @param ctx the run's context
 * @param ref the branch's ref
 * @returns "<sha10> <subject>" lines, empty when there are none
 */
export function copiedCommits(ctx, ref) {
    const marked = git(ctx, ctx.golden, ["cherry", "HEAD", ref]).split("\n");
    const shas = marked.filter((l) => l.startsWith("- ")).map((l) => l.slice(2));
    return shas.map((sha) => git(ctx, ctx.golden, ["log", "-1", "--format=%h %s", "--abbrev=10", sha]));
}

const copyRefusal = (branch, copies) =>
    `${branch} holds copies of commits golden already has (a cherry-pick or a rebase), so it is not landed:\n  ` +
    `${copies.join("\n  ")}\nNever copy, always merge: start again from the original branch, or merge it.`;
const goldenHead = (ctx) => git(ctx, ctx.golden, ["rev-parse", "HEAD"]);

/**
 * Lands several branches on golden in one gate run: one sync, each branch merged in order as its own
 * "land: <branch>" (a conflicting one skipped), one push. When the gate refuses it, the merged branches
 * are split in halves until the culprit is found; every half that passes stays landed.
 * @param ctx the run's context
 * @param branches the branches, in landing order
 * @param [opts] `dryRun`: merge, report, undo; no push, no GitHub
 * @returns the exit code: 0 all landed (or already on golden), 2 conflicts kept some out, 3 a gate
 *   failure did, 5 both; 1 and 4 as for one branch
 */
export async function landMany(ctx, branches, opts = {}) {
    const refs = new Map();
    for (const b of branches) {
        const ref = branchRef(ctx, b);
        if (!ref) return fail(`no branch ${b} here or on origin`);
        refs.set(b, ref);
    }
    const start = goldenHead(ctx);
    const synced = syncOrReport(ctx);
    if (synced !== 0) return synced;
    const before = goldenHead(ctx);
    const run = { refs, start, outcomes: new Map(), pushed: false, stopped: 0 };
    const merged = mergeEach(ctx, run, branches);
    if (opts.dryRun && merged.length) {
        const log = git(ctx, ctx.golden, ["log", "--oneline", `${start}..HEAD`]);
        const what = git(ctx, ctx.golden, ["diff", "--stat", before, "HEAD"]);
        console.log(`land: dry run -- would push to golden:\n${log}\n${what}`);
    }
    if (!opts.dryRun && merged.length) await landGroup(ctx, run, merged, before);
    if (run.pushed) announce(ctx, goldenHead(ctx));
    else git(ctx, ctx.golden, ["reset", "-q", "--hard", start]);
    return summarize(run, branches);
}

/**
 * Merges each branch onto golden in order, skipping (and undoing) one that conflicts or is already there.
 * @param ctx the run's context
 * @param run the landing's state: `refs` and `outcomes` by branch
 * @param list the branches to merge
 * @returns the branches that merged
 */
function mergeEach(ctx, run, list) {
    const merged = [];
    for (const b of list) {
        const ref = run.refs.get(b);
        const pre = goldenHead(ctx);
        if (git(ctx, ctx.golden, ["merge-base", "--is-ancestor", ref, "HEAD"], { ok: true }).status === 0) {
            run.outcomes.set(b, { state: "already on golden" });
            continue;
        }
        const copies = copiedCommits(ctx, ref);
        if (copies.length) {
            console.error(`land: ${copyRefusal(b, copies)}`);
            run.outcomes.set(b, { state: "refused (copies of golden commits)" });
            continue;
        }
        const code = reapply(ctx, b, ref) || mergeBranch(ctx, b, ref);
        if (code === 0) {
            merged.push(b);
            continue;
        }
        git(ctx, ctx.golden, ["reset", "-q", "--hard", pre]);
        run.outcomes.set(b, { state: code === 2 ? "conflict" : "refused (see above)" });
    }
    return merged;
}

/**
 * Pushes a group of branches; when the gate refuses it, lands each half of the group in turn.
 * ponytail: each split runs the whole gate again (about 2 log2(n) extra gate runs for one culprit);
 * cache gate verdicts per merged tree if landings of many branches become common.
 * @param ctx the run's context
 * @param run the landing's state
 * @param list the branches of this group
 * @param [merged] golden's commit before the group when the group is already merged on it (the first)
 */
async function landGroup(ctx, run, list, merged) {
    const base = merged ?? goldenHead(ctx);
    const group = merged ? list : mergeEach(ctx, run, list);
    if (!group.length) return;
    // Each group's own lockfile: a half without the branch that changed it would fail the gate's
    // node_modules check in a second, and blame a branch that never touched the lockfile.
    installIfNeeded(ctx);
    const r = await pushGolden(ctx, base, run.pushed ? base : run.start);
    if (r.code === 0) {
        run.pushed = true;
        for (const b of group) run.outcomes.set(b, { state: "landed" });
    } else if (r.code !== 3) {
        run.stopped = r.code;
    } else if (group.length === 1) {
        run.outcomes.set(group[0], { state: `gate failure, log: ${r.log}` });
    } else {
        const mid = Math.ceil(group.length / 2);
        console.log(`land: finding the branch the gate refused: trying ${group.slice(0, mid).join(", ")} first`);
        await landGroup(ctx, run, group.slice(0, mid));
        if (!run.stopped) await landGroup(ctx, run, group.slice(mid));
    }
}

/**
 * Prints every branch's outcome and works out the exit code.
 * @param run the landing's state
 * @param branches the branches, in landing order
 * @returns the exit code
 */
function summarize(run, branches) {
    const states = branches.map((b) => run.outcomes.get(b)?.state ?? "not tried (the landing stopped)");
    const width = Math.max(...branches.map((b) => b.length));
    const rows = branches.map((b, i) => "  " + b.padEnd(width) + "  " + states[i]);
    console.log(["land: summary", ...rows].join("\n"));
    if (states.includes("conflict")) {
        console.log(
            "land: for each conflict, in that branch's own worktree:\n" +
                "  git fetch origin\n" +
                `  git merge origin/${GOLDEN}     # resolve any conflicts, then commit\n` +
                "  git merge origin/master     # the same\n" +
                "  node tools/land.mjs land <branch>",
        );
    }
    if (run.stopped) return run.stopped;
    if (states.some((s) => s.startsWith("refused"))) return 1;
    const conflict = states.includes("conflict");
    const gate = states.some((s) => s.startsWith("gate failure"));
    if (conflict && gate) return 5;
    if (gate) return 3;
    return conflict ? 2 : 0;
}

function syncOrReport(ctx) {
    const conflict = sync(ctx);
    if (!conflict) return 0;
    console.error(
        (conflict.files.length
            ? `land: golden cannot take ${conflict.ref}: it conflicts in\n  ${conflict.files.join("\n  ")}\n`
            : `land: golden cannot take ${conflict.ref} (not a conflict):\n${conflict.error}\n`) +
            "Golden is unchanged. Merge it by hand in the golden worktree, or ask the owner.",
    );
    return 4;
}

/**
 * When a branch whose earlier landing was reverted lands again, reverts that revert first: git
 * would otherwise merge only the branch's new commits and leave the old ones out of golden.
 * @param ctx the run's context
 * @param branch the branch
 * @param ref its ref
 * @returns 0 when done, 2 on a conflict, 1 when git refused otherwise
 */
function reapply(ctx, branch, ref) {
    // ponytail: sees only reverts master does not have yet; a branch reverted and shipped, then landed
    // again, needs its revert reverted by hand (git revert <revert commit> in its own branch).
    const old = landedBranches(ctx, ctx.golden).findLast((e) => e.branch === branch && e.reverted);
    if (!old) return 0;
    const tip = git(ctx, ctx.golden, ["rev-parse", `${old.sha}^2`]);
    if (git(ctx, ctx.golden, ["merge-base", "--is-ancestor", tip, ref], { ok: true }).status !== 0) return 0;
    console.log(`land: ${branch} was reverted from golden; reapplying its earlier landing first`);
    return gitStep(ctx, branch, "revert", ["--no-edit", old.reverted]);
}

const mergeBranch = (ctx, branch, ref) =>
    gitStep(ctx, branch, "merge", ["--no-ff", "--no-edit", "-m", `land: ${branch}`, ref]);

/**
 * Runs a merge or revert on golden; on a failure reports a conflict, or git's own message when nothing
 * conflicted (a commit-msg hook that refused the message), and aborts it.
 * @param ctx the run's context
 * @param branch the branch being landed
 * @param op "merge" or "revert"
 * @param args the rest of git's arguments
 * @returns 0 when done, 2 on a conflict, 1 when git refused otherwise
 */
function gitStep(ctx, branch, op, args) {
    const r = commitGit(ctx, [op, ...args], { ok: true });
    if (r.status === 0) return 0;
    const files = conflicted(ctx);
    if (files.length) reportConflict(branch, files);
    else console.error(`land: git ${op} for ${branch} failed on golden (not a conflict):\n${r.stderr || r.stdout}`);
    git(ctx, ctx.golden, [op, "--abort"], { ok: true });
    return files.length ? 2 : 1;
}

function reportConflict(branch, files) {
    console.error(
        `land: ${branch} conflicts with golden in\n  ${files.join("\n  ")}\n` +
            "Golden is unchanged. In the branch's own worktree:\n" +
            "  git fetch origin\n" +
            `  git merge origin/${GOLDEN}     # resolve any conflicts, then commit\n` +
            "  git merge origin/master     # the same\n" +
            `  node tools/land.mjs land ${branch}`,
    );
}

/**
 * Takes a landed branch back out of golden: reverts its newest "land: <branch>" merge that master
 * does not have yet, and pushes that through the gate.
 * @param ctx the run's context
 * @param branch the branch
 * @returns the exit code
 */
export async function revert(ctx, branch) {
    const start = git(ctx, ctx.golden, ["rev-parse", "HEAD"]);
    const synced = syncOrReport(ctx);
    if (synced !== 0) return synced;
    const entry = landedBranches(ctx, ctx.golden).findLast((e) => e.branch === branch && !e.reverted);
    if (!entry) {
        git(ctx, ctx.golden, ["reset", "-q", "--hard", start]);
        return fail(`no landing of ${branch} on golden that master does not have`);
    }
    const r = commitGit(ctx, ["revert", "-m", "1", "--no-edit", entry.sha], { ok: true });
    if (r.status !== 0) {
        const files = conflicted(ctx);
        console.error(
            files.length
                ? `land: reverting ${entry.sha.slice(0, 10)} conflicts in ${files.join(", ")}`
                : `land: git revert of ${entry.sha.slice(0, 10)} failed (not a conflict):\n${r.stderr || r.stdout}`,
        );
        git(ctx, ctx.golden, ["revert", "--abort"], { ok: true });
        git(ctx, ctx.golden, ["reset", "-q", "--hard", start]);
        return files.length ? 2 : 1;
    }
    console.log(`land: reverted ${branch} (${entry.sha.slice(0, 10)}) on golden`);
    installIfNeeded(ctx);
    return publish(ctx, start);
}

/**
 * Offers the cut to master: marks the cut pull request ready and turns on auto-merge, so CI runs on
 * it once and GitHub merges it when the required checks pass. Refuses when the pull request's head
 * moved since its last finished preview by anything but the owner's accept commits.
 * @param ctx the run's context
 * @returns the exit code
 */
export async function ship(ctx) {
    const cutting = readLock(ctx.cutLock);
    if (cutting && !stale(ctx.cutLock, cutting)) {
        return fail(`a cut is pushing ${CUT} now (${describeOwner(cutting)}); ship after it`);
    }
    git(ctx, ctx.main, ["fetch", "-q", "origin"]);
    updateMainCheckout(ctx);
    const pr = goldenPr(ctx, CUT);
    if (!pr) return fail(`there is no open ${CUT} pull request; make one with node tools/land.mjs cut`);
    const moved = cutMoved(ctx, pr);
    if (moved) return fail(`#${pr.number} ${moved}; run tools/visual-preview.sh ${pr.number} and ship after it`);
    ctx.gh(ctx, ["pr", "ready", String(pr.number)]);
    ctx.gh(ctx, ["pr", "merge", String(pr.number), "--auto", "--merge"]);
    console.log(
        `land: #${pr.number} is ready with auto-merge on (${pr.url}).\n` +
            "CI (ci.yml) now runs the affected suite on it once, on clean machines, and the visual gate checks\n" +
            "CI's screenshots against the owner's approvals. When All Checks Pass and Lint PR Title are green,\n" +
            "GitHub merges it into master with a merge commit. If CI fails, find the culprit from the failure,\n" +
            "`node tools/land.mjs revert <branch>` it, cut again, and `gh pr ready --undo` while you do.",
    );
    return 0;
}

/**
 * Whether the cut pull request's head moved since its last finished preview: anything between the
 * preview's head and the pull request's head other than a Finish's own commits (finishCommit).
 * @param ctx the run's context
 * @param pr the cut pull request (`number`, `headRefOid`)
 * @returns what is wrong, or null when the preview is of this head
 */
function cutMoved(ctx, pr) {
    const status = readJson(join(ctx.main, `tmp/visual-review/local/${pr.number}/status.json`));
    if (status?.state !== "done" || !status.head) return "has no finished screenshot preview";
    const head = pr.headRefOid;
    if (status.head === head) return null;
    if (git(ctx, ctx.main, ["merge-base", "--is-ancestor", status.head, head], { ok: true }).status !== 0) {
        return `moved from ${status.head.slice(0, 10)} (its preview) to ${head.slice(0, 10)}`;
    }
    const other = commitsSince(ctx, status.head, head).filter((c) => !finishCommit(ctx, c));
    return other.length
        ? `moved since its preview of ${status.head.slice(0, 10)}: ${other.map((c) => c.subject).join("; ")}`
        : null;
}

/**
 * The commits of `from..to`, each with its parents, subject and the files it changed.
 * @param ctx the run's context
 * @param from the older commit
 * @param to the newer one
 * @returns `[{ parents, subject, files }]`
 */
function commitsSince(ctx, from, to) {
    const log = git(ctx, ctx.main, ["log", "--format=%x01%P%x00%s", "--name-only", `${from}..${to}`]);
    return log
        .split("\x01")
        .filter(Boolean)
        .map((record) => {
            const [first, ...files] = record.split("\n");
            const [parents, subject] = first.split("\0");
            return { parents: parents.split(" "), subject, files: files.filter(Boolean) };
        });
}

/**
 * Whether a commit is one a screenshot Finish makes (its accept, approval or signing commit): one
 * parent, and nothing changed outside the baselines and approvals directories of
 * visual-review.config.json. Such a commit changes no capture, so a preview stays current across it.
 * @param ctx the run's context
 * @param commit as commitsSince returns it
 * @returns true when it is
 */
function finishCommit(ctx, commit) {
    const config = readJson(join(ctx.main, "visual-review.config.json")) ?? {};
    const dirs = [config.baselines ?? "visual-baselines", config.approvals ?? "visual-review-approvals"];
    return commit.parents.length === 1 && commit.files.every((f) => dirs.some((d) => f.startsWith(`${d}/`)));
}

function readJson(file) {
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    } catch {
        return null;
    }
}

/**
 * Whether a finished local preview has no unstable or failed images: every project it captured has a
 * complete results.json without them. A preview that captured nothing because of a conflict is not.
 * @param dir the preview's directory (tmp/visual-review/local/<key>)
 * @param status its status.json
 * @returns true when it is stable
 */
export function stablePreview(dir, status) {
    if (status?.state !== "done" || !status.head || /^nothing captured/.test(status.step ?? "")) return false;
    return (status.projects ?? []).every((p) => {
        const r = readJson(join(dir, p, "results.json"));
        return r?.complete === true && !r.items.some((i) => BROKEN.has(i.status));
    });
}

/**
 * The newest first-parent golden commit master does not have whose local preview is stable.
 * @param ctx the run's context
 * @returns its sha, or null
 */
export function newestStableCut(ctx) {
    const root = join(ctx.main, "tmp/visual-review/local");
    const stable = new Set();
    for (const name of existsSync(root) ? readdirSync(root) : []) {
        const status = readJson(join(root, name, "status.json"));
        if (stablePreview(join(root, name), status)) stable.add(status.head);
    }
    const line = git(ctx, ctx.main, ["rev-list", "--first-parent", `origin/master..origin/${GOLDEN}`]);
    return line.split("\n").find((sha) => stable.has(sha)) ?? null;
}

/**
 * Which commit to cut: the newest stable one, else the one given; it must be on origin/golden, and
 * GitHub's golden-cut must not hold commits it lacks.
 * @param ctx the run's context
 * @param [given] the commit to fall back to
 * @returns `{ sha }` or `{ error }`
 */
function pickCut(ctx, given) {
    let sha = null;
    if (given) {
        const r = hasRef(ctx, ctx.main, given);
        if (r.status !== 0) return { error: `no commit ${given}` };
        sha = r.stdout;
        console.log(`land: cutting the commit given, ${given}`);
    } else {
        sha = newestStableCut(ctx);
        if (sha) console.log(`land: the newest golden commit with a stable preview is ${sha.slice(0, 10)}`);
    }
    if (!sha) {
        return {
            error:
                "no golden commit since master has a finished screenshot preview without unstable or failed images.\n" +
                "Give a known-good commit: node tools/land.mjs cut <commit>",
        };
    }
    if (git(ctx, ctx.main, ["merge-base", "--is-ancestor", sha, `origin/${GOLDEN}`], { ok: true }).status !== 0) {
        return { error: `${sha.slice(0, 10)} is not on origin/${GOLDEN}; a cut must be a golden commit` };
    }
    const remote = `origin/${CUT}`;
    if (
        hasRef(ctx, ctx.main, remote).status === 0 &&
        git(ctx, ctx.main, ["merge-base", "--is-ancestor", remote, sha], { ok: true }).status !== 0
    ) {
        return {
            error:
                `${remote} has commits ${sha.slice(0, 10)} does not (the owner's approvals on the cut pull request?).\n` +
                "Ship that cut first, or cut a golden commit that contains it.",
        };
    }
    return { sha };
}

/**
 * Puts the golden-cut worktree at `sha`: makes it with tools/worktree-new.sh, or moves the existing
 * one, only when it is clean and on golden-cut. Installs when the lockfile changed.
 * @param ctx the run's context
 * @param sha the cut
 * @returns null when done, else why not
 */
function cutWorktree(ctx, sha) {
    if (!existsSync(ctx.cut)) ctx.addCutWorktree(ctx, sha);
    const branch = git(ctx, ctx.cut, ["symbolic-ref", "-q", "--short", "HEAD"], { ok: true }).stdout;
    if (branch !== CUT) return `${ctx.cut} is on ${branch || "a detached HEAD"}, not ${CUT}; nothing was done`;
    if (git(ctx, ctx.cut, ["status", "--porcelain", "--untracked-files=no"])) {
        return `${ctx.cut} has uncommitted changes; nothing was done`;
    }
    const from = git(ctx, ctx.cut, ["rev-parse", "HEAD"]);
    if (from === sha) return null;
    git(ctx, ctx.cut, ["reset", "-q", "--hard", sha]);
    if (git(ctx, ctx.cut, ["diff", "--quiet", from, sha, "--", "pnpm-lock.yaml"], { ok: true }).status !== 0) {
        ctx.install(ctx, ctx.cut);
    }
    return null;
}

function defaultAddCutWorktree(ctx, sha) {
    const r = spawnSync(join(dirname(fileURLToPath(import.meta.url)), "worktree-new.sh"), [CUT, sha, CUT], {
        cwd: ctx.main,
        env: ctx.env,
        stdio: "inherit",
    });
    if (r.status !== 0) throw new Error("tools/worktree-new.sh could not make the golden-cut worktree");
}

/**
 * Points golden-cut on GitHub at a known-good golden commit through the push queue, opens or
 * refreshes the draft pull request golden-cut -> master, and starts its preview.
 * @param ctx the run's context
 * @param [given] the commit to cut when no golden commit has a stable preview
 * @returns the exit code
 */
export async function cut(ctx, given) {
    git(ctx, ctx.main, ["fetch", "-q", "origin"]);
    if (hasRef(ctx, ctx.main, `origin/${GOLDEN}`).status !== 0) return fail("nothing is on GitHub's golden yet");
    const picked = pickCut(ctx, given);
    if (picked.error) return fail(picked.error);
    const { sha } = picked;
    const why = cutWorktree(ctx, sha);
    if (why) return fail(why);
    const { code, output } = await ctx.push(ctx, ctx.cut, `${sha}:refs/heads/${CUT}`);
    if (code !== 0) return fail(`the push of ${sha.slice(0, 10)} to ${CUT} failed; log: ${gateLog(ctx, sha, output)}`);
    const intro = [
        `A cut of \`golden\` at ${sha.slice(0, 10)}: this is what ships. Approvals that ship are made here.`,
        "",
    ];
    const pr = upsertPr(ctx, CUT, CUT_TITLE, prBody(landedBranches(ctx, ctx.main, "origin/master", sha), intro), true);
    if (pr) ctx.preview(ctx, pr, ctx.cut);
    const where = pr ? `, pull request #${pr}` : "";
    console.log(`land: ${CUT} is ${sha.slice(0, 10)} on GitHub${where}.`);
    return 0;
}

/**
 * Why a branch cannot go into the cut: it would bring commits of golden or master that golden-cut does
 * not have. A cut fix starts from origin/golden-cut and holds only its own commits.
 * @param ctx the run's context
 * @param ref the branch's ref
 * @returns the reason, or null when only its own commits would go in
 */
function notOnCut(ctx, ref) {
    const count = (...not) => Number(git(ctx, ctx.main, ["rev-list", "--count", ref, `^origin/${CUT}`, ...not]));
    const extra = count() - count(`^origin/${GOLDEN}`, "^origin/master");
    if (extra === 0) return null;
    return (
        `it would bring ${extra} commits of golden or master that ${CUT} does not have.\n` +
        `A fix for the cut starts from the cut: ./tools/worktree-new.sh <branch> origin/${CUT}`
    );
}

/**
 * Merges a fix the cut needs into golden-cut and pushes it through the gate (measured from master), then
 * refreshes the cut pull request and starts its preview of the pushed head. The caller then lands the same
 * branch on golden, so both branches hold the same commits.
 * @param ctx the run's context
 * @param branch the fix, started from origin/golden-cut
 * @returns the exit code: 0 done (or already on golden-cut), 1 refused, 2 a conflict, 3 the gate refused it
 */
export async function cutFix(ctx, branch) {
    git(ctx, ctx.main, ["fetch", "-q", "origin"]);
    const ref = branchRef(ctx, branch);
    if (!ref) return fail(`no branch ${branch} here or on origin`);
    const cutRef = `origin/${CUT}`;
    if (hasRef(ctx, ctx.main, cutRef).status !== 0) return fail(`there is no ${CUT} on GitHub; cut first`);
    if (git(ctx, ctx.main, ["merge-base", "--is-ancestor", ref, cutRef], { ok: true }).status === 0) {
        console.log(`land: ${branch} is already on ${CUT}`);
        return 0;
    }
    const why = notOnCut(ctx, ref);
    if (why) return fail(`${branch} cannot go into the cut: ${why}`);
    const before = git(ctx, ctx.main, ["rev-parse", cutRef]);
    const moved = cutWorktree(ctx, before);
    if (moved) return fail(moved);
    mkdirSync(join(ctx.main, "tmp/golden"), { recursive: true });
    ctx.hooks = hooksDir(ctx);
    try {
        const merge = withHooks(ctx, ["merge", "--no-ff", "--no-edit", "-m", `land: ${branch}`, ref]);
        const r = git(ctx, ctx.cut, merge, { ok: true });
        if (r.status !== 0) {
            const files = git(ctx, ctx.cut, ["diff", "--name-only", "--diff-filter=U"], { ok: true }).stdout;
            git(ctx, ctx.cut, ["merge", "--abort"], { ok: true });
            git(ctx, ctx.cut, ["reset", "-q", "--hard", before]);
            console.error(`land: ${branch} does not merge into ${CUT}:\n${files || r.stderr || r.stdout}`);
            return files ? 2 : 1;
        }
        const pushed = await pushGolden(ctx, before, before, { dir: ctx.cut, branch: CUT });
        if (pushed.code !== 0) return pushed.code;
    } finally {
        rmSync(ctx.hooks, { recursive: true, force: true });
        ctx.hooks = null;
    }
    const head = git(ctx, ctx.cut, ["rev-parse", "HEAD"]);
    try {
        const intro = [
            `A cut of \`golden\` at ${before.slice(0, 10)}, with fixes. Approvals that ship are made here.`,
            "",
        ];
        const pr = upsertPr(
            ctx,
            CUT,
            CUT_TITLE,
            prBody(landedBranches(ctx, ctx.main, "origin/master", head), intro),
            true,
        );
        if (pr) ctx.preview(ctx, pr, ctx.cut);
    } catch (e) {
        console.error(`land: the cut pull request was not updated: ${e.message}`);
    }
    console.log(`land: ${branch} is on ${CUT} (${head.slice(0, 10)}); now landing it on golden`);
    return 0;
}

/**
 * Prints golden's state: against origin/golden and origin/master, what is landed, the pull request,
 * the lock and the newest preview log.
 * @param ctx the run's context
 * @returns the exit code
 */
export function status(ctx) {
    if (!existsSync(ctx.golden)) return fail(`no golden worktree yet (${ctx.golden}); the first landing makes it`);
    git(ctx, ctx.golden, ["fetch", "-q", "origin"], { ok: true });
    updateMainCheckout(ctx);
    const counts = (ref) => {
        if (hasRef(ctx, ctx.golden, ref).status !== 0) return `${ref} does not exist`;
        const [ahead, behind] = git(ctx, ctx.golden, ["rev-list", "--left-right", "--count", `HEAD...${ref}`]).split(
            /\s+/,
        );
        return `${ahead} ahead, ${behind} behind ${ref}`;
    };
    const short = git(ctx, ctx.golden, ["rev-parse", "--short", "HEAD"]);
    console.log(`golden ${short}: ${counts("origin/" + GOLDEN)}; ${counts("origin/master")}`);
    const landed = landedBranches(ctx, ctx.golden);
    console.log(landed.length ? "landed, not on master yet:" : "nothing landed that master does not have");
    for (const e of landed) console.log(`  ${e.branch} ${e.sha.slice(0, 10)}${e.reverted ? " (reverted)" : ""}`);
    console.log(prLine(ctx));
    const owner = readLock(ctx.lock);
    console.log(owner ? `lock: held by ${describeOwner(owner)}` : "lock: free");
    const logs = existsSync(join(ctx.main, "tmp/golden"))
        ? readdirSync(join(ctx.main, "tmp/golden")).filter((f) => /^preview-\d+\.log$/.test(f))
        : [];
    const newest = logs
        .map((f) => join(ctx.main, "tmp/golden", f))
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
    if (newest)
        console.log(
            `newest preview log ${newest}:\n${readFileSync(newest, "utf8").trimEnd().split("\n").slice(-10).join("\n")}`,
        );
    console.log(openWork(ctx));
    return 0;
}

/**
 * Every branch on GitHub that golden does not hold, as a table: its issue, the owner its progress note
 * names, its last commit, whether a `ready` marker names its tip, and its worktree here. The issues come
 * from one GraphQL query.
 * @param ctx the run's context
 * @returns the table
 */
export function openWork(ctx) {
    const refs = git(ctx, ctx.main, [
        "for-each-ref",
        `--no-merged=origin/${GOLDEN}`,
        "--sort=-committerdate",
        "--format=%(refname:lstrip=3)%00%(objectname)%00%(committerdate:short)%00%(committerdate:unix)",
        "refs/remotes/origin",
    ]);
    const branches = refs
        .split("\n")
        .filter(Boolean)
        .map((l) => l.split("\0"))
        .filter(([b]) => b !== "HEAD");
    if (!branches.length) return "open work: none (every branch on GitHub is on golden)";
    const set = new Map(
        git(ctx, ctx.main, ["config", "--get-regexp", String.raw`^branch\..*\.issue$`], { ok: true })
            .stdout.split("\n")
            .filter(Boolean)
            .map((l) => /^branch\.(.+)\.issue (\d+)$/.exec(l))
            .filter(Boolean)
            .map(([, b, n]) => [b, Number(n)]),
    );
    const trees = worktrees(ctx);
    const issueOf = (b) => set.get(b) ?? issueInName(b);
    let issues = new Map();
    let error = "";
    try {
        issues = readIssues(
            (args) => ctx.gh(ctx, args),
            branches.map(([b]) => issueOf(b)),
        );
    } catch (e) {
        error = `\n(issues unknown: ${e.message})`;
    }
    const rows = branches.map(([b, sha, date]) => {
        const n = issueOf(b);
        const issue = issues.get(n);
        const note = findNote(issue, b);
        const fields = note ? parseNote(note.body) : {};
        const ready = issue?.comments.some((c) => {
            const m = /^pipeline-round: ready (\S+) ([0-9a-f]{7,40})\b/.exec(c.body);
            return m?.[1] === b && sha.startsWith(m[2]);
        });
        const owner = fields.owner ?? "-";
        return [b, n ? `#${n}` : "-", owner, date, ready ? "yes" : "no", trees.get(b) ?? "-", fields.sync ?? "-"];
    });
    const head = ["branch", "issue", "owner", "last commit", "ready", "worktree", "sync"];
    return `open work (branches on GitHub that golden does not have):\n${table([head, ...rows])}${error}${staleList(branches)}`;
}

/**
 * The open branches with no commit in the sync's active window: the nightly sync skips them, and each needs
 * its owner to land it, close it or park it. A report only; nothing is deleted.
 * @param branches openWork's rows: name, tip, date, unix time
 * @param [now] the time
 * @returns the list, or "" when there are none
 */
export function staleList(branches, now = Date.now()) {
    const stale = branches.filter(
        ([b, , , unix]) => !NOT_WORK.test(b) && now - Number(unix) * 1000 >= ACTIVE_DAYS * 864e5,
    );
    if (!stale.length) return "";
    const lines = stale.map(([b, , date]) => `  ${b} (last commit ${date})`);
    return (
        `\nstale (no commit in ${ACTIVE_DAYS}+ days, so the nightly sync skips them): land, close or park each\n` +
        lines.join("\n")
    );
}

const table = (rows) => {
    const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
    return rows.map((r) => `  ${r.map((c, i) => String(c).padEnd(widths[i])).join("  ")}`.trimEnd()).join("\n");
};

/**
 * The worktrees by the branch they have checked out.
 * @param ctx the run's context
 * @returns a Map from branch to its worktree's path
 */
function worktrees(ctx) {
    const map = new Map();
    let dir = null;
    for (const line of git(ctx, ctx.main, ["worktree", "list", "--porcelain"]).split("\n")) {
        if (line.startsWith("worktree ")) dir = line.slice(9);
        if (line.startsWith("branch refs/heads/")) map.set(line.slice(18), dir);
    }
    return map;
}

// Branches that are not work in progress, never pruned and never synced: the integration and release
// branches, revert pull requests, Dependabot.
export const NOT_WORK = /^(HEAD|master|golden|golden-cut|gh-pages)$|^(release|revert)\b|^dependabot\//;

/**
 * The branches on GitHub that golden already holds, and with `yes`, deletes them there. Run by hand only:
 * merged branches are history and stay unless someone asks. Worktrees and local branches are never
 * touched. A branch with no commits of its own (its tip on the first-parent line of golden, golden-cut or
 * master: it was just made) is left alone while it has a worktree here. Before deleting, every branch's
 * name and tip go into tmp/pruned-branches.log in the main checkout, so any of them can be restored.
 * @param ctx the run's context
 * @param [opts] `yes: true` deletes; otherwise it only lists
 * @returns the branches listed (or deleted)
 */
export function pruneBranches(ctx, opts = {}) {
    git(ctx, ctx.main, ["fetch", "-q", "--prune", "origin"], { ok: true });
    const trees = worktrees(ctx);
    // The branches the local tools run from (tools/live-tools.json) stay, wherever they point.
    const live = new Set(
        Object.values(readJson(join(ctx.main, "tools/live-tools.json")) ?? {}).map((t) => join(ctx.main, t.worktree)),
    );
    const merged = git(ctx, ctx.main, ["branch", "-r", "--format=%(refname:lstrip=3)", "--merged", `origin/${GOLDEN}`])
        .split("\n")
        .filter((b) => b && !NOT_WORK.test(b) && !live.has(trees.get(b)));
    const lines = new Set();
    for (const base of [GOLDEN, CUT, "master"]) {
        const r = git(ctx, ctx.main, ["rev-list", "--first-parent", `origin/${base}`], { ok: true });
        for (const sha of r.stdout.split("\n")) lines.add(sha);
    }
    const tips = merged.map((b) => [b, git(ctx, ctx.main, ["rev-parse", `refs/remotes/origin/${b}`])]);
    const gone = tips.filter(([b, sha]) => !lines.has(sha) || !trees.has(b));
    if (!gone.length) {
        console.log("land: no branch on GitHub to prune");
        return [];
    }
    const list = gone.map(([b, sha]) => `  ${b} ${sha.slice(0, 10)}`).join("\n");
    if (!opts.yes) {
        console.log(`land: dry run -- would delete from GitHub (already on golden):\n${list}\nDelete them: --yes`);
        return gone.map(([b]) => b);
    }
    const log = join(ctx.main, "tmp/pruned-branches.log");
    mkdirSync(dirname(log), { recursive: true });
    const now = new Date().toISOString();
    appendFileSync(log, gone.map(([b, sha]) => `${now} ${b} ${sha}\n`).join(""));
    // No gate for a deletion: it carries no code. A hundred at a time keeps each push small.
    for (let i = 0; i < gone.length; i += 100) {
        const names = gone.slice(i, i + 100).map(([b]) => b);
        const r = git(ctx, ctx.main, ["push", "--no-verify", "-q", "origin", "--delete", ...names], { ok: true });
        if (r.status !== 0) throw new Error(`git push --delete failed: ${r.stderr}`);
    }
    console.log(`land: deleted from GitHub (names and tips in ${log}):\n${list}`);
    return gone.map(([b]) => b);
}

function prLine(ctx) {
    try {
        const file = JSON.parse(readFileSync(join(ctx.main, "tmp/pr-status/status.json"), "utf8"));
        const pr = file.pullRequests?.find((p) => p.head === GOLDEN && p.base === "master");
        if (pr) {
            const tally = {};
            for (const c of Object.values(pr.checks ?? {})) tally[c] = (tally[c] ?? 0) + 1;
            const checks =
                Object.entries(tally)
                    .map(([k, n]) => `${n} ${k}`)
                    .join(", ") || "no checks";
            return `pull request #${pr.number}: ${pr.draft ? "draft" : "ready"}, ${pr.state ?? "no rollup"} (${checks}); as of ${file.fetchedAt}`;
        }
    } catch {
        // no broker file; ask GitHub once
    }
    let pr;
    try {
        pr = goldenPr(ctx);
    } catch (e) {
        return `pull request: unknown (${e.message})`;
    }
    if (!pr) return "no open golden pull request";
    return `pull request #${pr.number}: ${pr.isDraft ? "draft" : "ready"} (${pr.url})`;
}

function fail(message) {
    console.error(`land: ${message}`);
    return 1;
}

// ---------------------------------------------------------------- the command line

/**
 * The context every command runs with; tests replace `push`, `gh`, `preview` and `addWorktree`.
 * @param cwd any directory of the repository
 * @param [overrides] replacements
 * @returns the context
 */
export function context(cwd, overrides = {}) {
    const base = { env: process.env, ...overrides };
    const main = mainCheckout(base, cwd);
    return {
        main,
        golden: join(main, ".worktrees/golden-local"),
        cut: join(main, `.worktrees/${CUT}`),
        lock: join(main, "tmp/golden/lock"),
        cutLock: join(main, "tmp/golden/cut-lock"),
        push: defaultPush,
        gh: defaultGh,
        preview: defaultPreview,
        addWorktree: defaultAddWorktree,
        addCutWorktree: defaultAddCutWorktree,
        install: defaultInstall,
        check: defaultCheck,
        ...base,
    };
}

const USAGE =
    "usage: node tools/land.mjs land <branch> [<branch> ...] [--dry-run] | revert <branch> | cut [<commit>] |" +
    " cut-fix <branch> | ship | status | prune-branches [--yes] |" +
    " sync [--branch <b>] [--dry-run] [--if-due] [--active-days N] (land, revert, cut and cut-fix also take --priority)";

/**
 * Runs one command under the lock.
 * @param argv the arguments after the script
 * @param [ctx] the context
 * @returns the exit code
 */
export async function main(argv, ctx = context(process.cwd())) {
    const [command, ...branches] = argv.filter((a) => !a.startsWith("--"));
    if (command === "sync") return syncCommand(ctx, argv);
    const branch = branches[0];
    const dryRun = argv.includes("--dry-run");
    // The priority lane: only for fixes that unblock the pipeline (a red master, a broken golden, a blocked cut).
    const lockOptions = { ...ctx.lockOptions, priority: argv.includes("--priority") };
    const unlocked = UNLOCKED[command];
    if (unlocked) return unlocked(ctx, branch, argv, lockOptions);
    if (!["land", "revert"].includes(command) || !branch) return fail(USAGE);
    const release = await acquireLock(ctx.lock, { command, branch: branches.join(" ") }, lockOptions);
    const onInt = onSignal(ctx, "SIGINT", 130);
    const onTerm = onSignal(ctx, "SIGTERM", 143);
    ctx.release = () => {
        process.off("SIGINT", onInt).off("SIGTERM", onTerm);
        release();
    };
    // on, not once: a second copy of the signal (the process group's and the hand-off's) must not kill
    // this process half way through putting golden back.
    process.on("SIGINT", onInt).on("SIGTERM", onTerm);
    try {
        ensureGolden(ctx);
        if (git(ctx, ctx.golden, ["status", "--porcelain", "--untracked-files=no"])) {
            return fail(`the golden worktree ${ctx.golden} has uncommitted changes; nothing was done`);
        }
        ctx.hooks = hooksDir(ctx);
        if (command === "land" && branches.length > 1) return await landMany(ctx, branches, { dryRun });
        if (command === "land") return await land(ctx, branch, { dryRun });
        return await revert(ctx, branch);
    } finally {
        cleanup(ctx);
    }
}

// The commands that do not take the landing lock (cut and cut-fix take the cut's own). Ship only marks the
// cut pull request ready: it never waits behind a landing's gate.
const UNLOCKED = {
    status: (ctx) => status(ctx),
    ship: (ctx) => ship(ctx),
    cut: (ctx, given, _argv, lockOptions) => cutLocked(ctx, given, lockOptions),
    "cut-fix": cutFixThenLand,
    "prune-branches": (ctx, _branch, argv) => {
        try {
            pruneBranches(ctx, { yes: argv.includes("--yes") });
            return 0;
        } catch (e) {
            return fail(e.message);
        }
    },
};

/**
 * `cut-fix`: the fix into golden-cut under the cut's lock, then the same branch onto golden.
 * @param ctx the run's context
 * @param branch the fix
 * @param argv the command line (for --priority)
 * @param lockOptions the lock's options
 * @returns the exit code
 */
async function cutFixThenLand(ctx, branch, argv, lockOptions) {
    if (!branch) return fail(USAGE);
    const code = await cutLocked(ctx, branch, lockOptions, cutFix);
    // The same branch, the same commits, on golden: a landing like any other.
    return code === 0 ? main(["land", branch, ...argv.filter((a) => a === "--priority")], ctx) : code;
}

// The cut (or a cut fix) under its own lock: its push runs the gate without holding up landings.
async function cutLocked(ctx, given, lockOptions, run = cut) {
    const command = run === cut ? "cut" : "cut-fix";
    const release = await acquireLock(ctx.cutLock, { command, branch: given ?? "" }, lockOptions);
    try {
        return await run(ctx, given);
    } finally {
        release();
    }
}

// Puts back an unpushed merge (a push killed half way), removes the hooks copy, frees the lock.
function cleanup(ctx) {
    if (ctx.rollback) git(ctx, ctx.golden, ["reset", "-q", "--hard", ctx.rollback], { ok: true });
    if (ctx.hooks) rmSync(ctx.hooks, { recursive: true, force: true });
    ctx.rollback = ctx.hooks = null;
    ctx.release?.();
}

const onSignal = (ctx, signal, code) => () => {
    ctx.child?.kill(signal);
    cleanup(ctx);
    process.exit(code);
};

// ---------------------------------------------------------------- the live copy

const LIVE_MARK = "LAND_LIVE_COPY";

/**
 * The live copy's land.mjs: `$LAND_LIVE/tools/land.mjs` when LAND_LIVE names its worktree (tests), else
 * the one in <main checkout>/.worktrees/land-live, found from this file's own repository.
 * @param [env] the environment
 * @returns its path, or null when this file is in no repository
 */
export function liveCopy(env = process.env) {
    if (env.LAND_LIVE) return join(env.LAND_LIVE, "tools/land.mjs");
    const here = dirname(fileURLToPath(import.meta.url));
    const r = spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
        cwd: here,
        env,
        encoding: "utf8",
    });
    return r.status === 0 ? join(dirname(r.stdout.trim()), ".worktrees/land-live/tools/land.mjs") : null;
}

/**
 * Hands the run to the live copy, so every session runs the same version of this tool whichever
 * checkout's copy it called: the live copy runs with the same arguments, environment and working
 * directory, and its exit code is passed through. It does not hand off when this file is the live copy,
 * or when it was itself started by a hand-off (LAND_LIVE_COPY is set), so it never loops. The live copy
 * removes the mark from its environment once read, so the commands it runs (the pre-push gate, whose
 * tests run this tool) start as fresh sessions would.
 * @param argv the arguments after the script
 * @param [env] the environment
 * @returns the live copy's exit code, or null when this copy should run itself
 */
export async function handOff(argv, env = process.env) {
    if (env[LIVE_MARK]) {
        delete env[LIVE_MARK];
        return null;
    }
    const self = fileURLToPath(import.meta.url);
    const live = liveCopy(env);
    if (!live || !existsSync(live)) {
        console.error(`land: no live copy at ${live ?? ".worktrees/land-live"}; running ${self} instead`);
        return null;
    }
    if (realpathSync(live) === realpathSync(self)) return null;
    const child = spawn(process.execPath, [live, ...argv], { stdio: "inherit", env: { ...env, [LIVE_MARK]: live } });
    // A signal sent to this process alone reaches the live copy, which cleans up golden and the lock.
    const forward = (signal) => child.kill(signal);
    const signals = ["SIGINT", "SIGTERM", "SIGHUP"];
    for (const s of signals) process.on(s, forward);
    return new Promise((resolve) =>
        child.on("close", (code, signal) => {
            for (const s of signals) process.off(s, forward);
            resolve(code ?? 128 + (osConstants.signals[signal] ?? 0));
        }),
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const argv = process.argv.slice(2);
    process.exitCode = (await handOff(argv)) ?? (await main(argv));
}
