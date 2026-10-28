#!/usr/bin/env node
// Lands finished branches on `golden`, the integration branch, and ships golden to master through one
// standing pull request. Design: design/ci/golden-local.md, with the landing, verification and cut of
// design/ci/fast-pipeline.md (sections 4.2, 4.3, 4.5).
//
//   node tools/land.mjs land <branch> [--dry-run]   merge <branch> into golden, gate it, push it
//   node tools/land.mjs land <b1> <b2> ... [--dry-run]   land several branches in one gate run
//   node tools/land.mjs revert <branch>             take a landed branch back out of golden
//   node tools/land.mjs cut [<commit>]              point golden-cut at a known-good golden commit, open its pull request
//   node tools/land.mjs cut-fix <branch> --reason <issue>|run:<id>   merge a fix for a red master, a failed deploy or
//                                                   a release hold into golden-cut, push it, then land it on golden
//   node tools/land.mjs ship                        mark the cut pull request ready, with auto-merge
//   node tools/land.mjs auto-ship                   ship the cut when its preview of its head changes no image
//                                                   and it is verified (run when a cut's preview ends and when
//                                                   a verification passes; logged to tmp/golden/auto-ship.log)
//   node tools/land.mjs status                      golden, its pull request, the lock, the newest preview, open work
//   node tools/land.mjs prune-branches [--yes]      list (with --yes: delete on GitHub) the branches golden holds
//   --allow-copies <sha>[,<sha>...] (land, one branch)  land despite these listed copies of golden commits (sha
//                                                   prefixes of 7+ characters); the land commit names each one
//   --priority (land, revert, cut, cut-fix)         wait ahead of every ordinary landing: only for fixes that
//                                                   unblock the pipeline (a red master, a broken golden, a blocked cut)
//   --dry-run (cut-fix)                             merge into golden-cut and land on golden as dry runs, push nothing
//   While <main checkout>/tmp/golden/flush exists, land and sync refuse; revert and cut-fix still run.
//   Golden is retired (#3418): land, cut, cut-fix, ship, auto-ship and sync always refuse, pointing to
//   tools/pr-open.sh; revert, status and prune-branches still run.
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
// A landing merges, in a check worktree (.worktrees/land-check-<n>) and without the landing lock, golden,
// origin/golden (the owner's screenshot accept commits) and origin/master (release merges, the merged
// cut) and then <branch> with --no-ff as "land: <branch>", and runs the gate on that commit through
// tools/push-queue.sh as a dry-run push: nothing is sent. Then it takes the lock, and when that commit
// still holds everything GitHub's golden has, golden fast-forwards to it and is pushed; the push finds
// the check's pass on the identical files (tools/prepush-inputs.mjs) and takes no gate slot. When golden
// moved, the check runs again (reusing every pass whose inputs did not change); after three tries the
// landing holds the lock through its check. A failure leaves golden as it was. After a push the standing
// draft pull request golden -> master is created if needed, its description lists the landed branches
// and the issues their commits name, the gate's own screenshot capture of the pushed commit becomes its
// preview (else tools/visual-preview.sh captures it in the background for the review page; see
// defaultPreview), and tools/verify.mjs verifies the new tip in full (the gate with every shard, the GPU,
// the screenshots, SonarQube) beside later landings. `--dry-run` merges under the lock and sends nothing.
//
// What ships is a cut, not golden's tip: `cut` points the branch golden-cut on GitHub at the newest
// verified (golden-verified) first-parent golden commit whose local screenshot preview finished with no
// unstable or failed images (else the commit given, else it refuses), pushes it through the push queue from the worktree
// <main checkout>/.worktrees/golden-cut, opens or refreshes the draft pull request golden-cut -> master
// and starts its preview. The owner's approvals that ship are made on that pull request, and `ship`
// marks it ready with auto-merge, once the cut's head is verified (a cut-fix starts golden-cut's own
// verification). The golden pull request stays open as an early look at golden's tip. While the cut pull
// request awaits the owner (a draft, its preview of its head done, no Finish yet) `cut` refuses to move
// golden-cut, so the owner never reviews a moving target. `ship` takes the verification and the preview of
// a commit whose files the cut's head has outside visual-baselines/ and visual-review-approvals/, so the
// owner's Finish (and an update of the baselines from master) redoes neither. A cut fix is only for a red
// master, a failed deploy or a release hold, which its --reason names and GitHub confirms.
// `auto-ship` does what ship does without the owner when the cut's preview of exactly its head shows only
// unchanged and excluded images, its baselines are master's or carry the owner's signed tree approval, it
// holds no breaking commit and master's build is green; it runs when a cut's preview ends and when a
// verification passes.
//
// Never copy, always merge: a landing refuses a branch whose commits are already on golden under other ids
// (a cherry-pick or rebase of commits golden has), so a copy never lands beside its original. A fix the
// cut needs starts from origin/golden-cut and goes in with `cut-fix`: merged into golden-cut, pushed, then
// landed on golden the normal way, so both hold the same commits. Merged branches stay, on GitHub and here,
// as history; `prune-branches --yes` deletes them from GitHub only when someone runs it by hand.
// `--allow-copies <sha>,...` accepts exactly the listed copies (any other copy, or a listed sha that is not a
// copy, still refuses) and records them in the land commit's message.
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
    symlinkSync,
    watch as watchDir,
    writeFileSync,
} from "node:fs";
import { constants as osConstants, hostname } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { findNote, issueInName, parseNote, readIssues } from "./branch-note.mjs";
import { printRisks } from "./ship-risks.mjs";
import { logWait } from "./wait-log.mjs";

export const GOLDEN = "golden";
export const PR_TITLE = "chore: land golden into master";
export const CUT = "golden-cut";
export const CUT_TITLE = "chore: ship a golden cut into master";
// The newest golden commit verification passed (tools/verify.mjs), on GitHub as a branch.
export const VERIFIED = "golden-verified";
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
// golden's marker keeps its old name; each scratch worktree (landing checks, verification) has its own.
const installedFile = (ctx) =>
    join(
        ctx.main,
        "tmp/golden",
        ctx.golden.endsWith("golden-local") ? "installed-lockfile" : `installed-lockfile-${basename(ctx.golden)}`,
    );
function markInstalled(ctx) {
    const blob = lockBlob(ctx);
    if (blob.status === 0) writeFileSync(installedFile(ctx), `${blob.stdout}\n`);
}
function installIfNeeded(ctx) {
    const blob = lockBlob(ctx);
    if (blob.status !== 0) return;
    const installed = existsSync(installedFile(ctx)) ? readFileSync(installedFile(ctx), "utf8").trim() : "";
    if (installed === blob.stdout) return;
    console.log(`land: pnpm-lock.yaml changed; pnpm install --frozen-lockfile in ${ctx.golden}`);
    (ctx.install ?? defaultInstall)(ctx);
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

// The branch the main checkout follows: master, so new sessions read master's .claude/settings.json, skills
// and CLAUDE.md (channels pipeline, #3421). To follow golden-verified again, set this to VERIFIED: the next
// update switches the main checkout over.
export const MAIN_FOLLOWS = "master";
const FOLLOWABLE = new Set(["master", VERIFIED]);

/**
 * Brings the main checkout to origin/<MAIN_FOLLOWS> (origin/master while GitHub lacks that branch)
 * after a fetch: fast-forwards that branch when it is checked out, or switches to it from the other one
 * of master and golden-verified. Changes nothing, with one warning line, when it is on any other branch,
 * has tracked changes, would overwrite an untracked or ignored file, or either branch has commits its
 * origin lacks; untracked files stay as they are. Never throws.
 * @param ctx the run's context
 */
export function updateMainCheckout(ctx) {
    try {
        const target = hasRef(ctx, ctx.main, `origin/${MAIN_FOLLOWS}`).status === 0 ? MAIN_FOLLOWS : "master";
        const branch = git(ctx, ctx.main, ["symbolic-ref", "-q", "--short", "HEAD"], { ok: true }).stdout;
        const from = git(ctx, ctx.main, ["rev-parse", "HEAD"]);
        const to = git(ctx, ctx.main, ["rev-parse", `origin/${target}`]);
        if (branch === target && from === to) return;
        const why = mainCheckoutBlocker(ctx, branch, target);
        if (why) {
            console.error(`land: warning: left the main checkout ${ctx.main} alone: ${why}`);
            return;
        }
        const [a, b] = [from.slice(0, 10), to.slice(0, 10)];
        if (branch === target) {
            git(ctx, ctx.main, ["merge", "-q", "--ff-only", "--no-overwrite-ignore", `origin/${target}`]);
            console.log(`land: moved the main checkout's ${target} from ${a} to ${b}`);
        } else {
            git(ctx, ctx.main, ["switch", "-q", "--no-overwrite-ignore", "-C", target, `origin/${target}`]);
            console.log(`land: switched the main checkout from ${branch} (${a}) to ${target} (${b})`);
        }
    } catch (e) {
        console.error(`land: warning: could not update the main checkout ${ctx.main}: ${e.message}`);
    }
}

/**
 * Why the main checkout cannot be brought to origin/<target>.
 * @param ctx the run's context
 * @param branch the branch it has checked out ("" for a detached HEAD)
 * @param target the branch it should follow
 * @returns the reason, or null when it can be
 */
function mainCheckoutBlocker(ctx, branch, target) {
    if (!FOLLOWABLE.has(branch)) return `it is on ${branch || "a detached HEAD"}, not ${target}`;
    if (git(ctx, ctx.main, ["status", "--porcelain", "--untracked-files=no"])) return "it has uncommitted changes";
    for (const b of new Set([branch, target])) {
        if (hasRef(ctx, ctx.main, `refs/heads/${b}`).status !== 0) continue;
        const ff = git(ctx, ctx.main, ["merge-base", "--is-ancestor", `refs/heads/${b}`, `origin/${b}`], { ok: true });
        if (ff.status !== 0) return `its ${b} has commits origin/${b} does not`;
    }
    return null;
}

const conflicted = (ctx) =>
    git(ctx, ctx.golden, ["diff", "--name-only", "--diff-filter=U"], { ok: true }).stdout.split("\n").filter(Boolean);

// ---------------------------------------------------------------- GitHub and the gate

/**
 * Whether pushes run the light gate (tools/prepush.sh PREPUSH_LIGHT=1: no test shard, no screenshot): only
 * while CI verifies golden (`node tools/verify.mjs backend ci`), which then runs every shard on each landing.
 * The backend is in golden's verification state file; with none it is local, and the gate stays full.
 * @param ctx the run's context
 * @returns "1" (light) or "0" (full)
 */
export function lightGate(ctx) {
    return readJson(join(ctx.main, "tmp/golden/verify.json"))?.backend?.name === "ci" ? "1" : "0";
}

/**
 * The snapshot of the gate's live copy this run's pushes all use (tools/gate-snapshot.sh --hold), taken at the
 * first push and held until this process ends: a landing's check and its push run one version of the gate,
 * so a `tools/live.sh gate` between them cannot re-run the check under a new rule (2026-10-23, #3284). Without
 * the script in the live copy, the pushes run the live copy as before.
 * @param ctx the run's context
 * @returns the snapshot's directory, or null
 */
export async function gateSnapshot(ctx) {
    if (ctx.gateSnapshot !== undefined) return ctx.gateSnapshot;
    const live = ctx.env.PUSH_QUEUE_GATE || join(ctx.main, ".worktrees/gate-live");
    const script = join(live, "tools/gate-snapshot.sh");
    ctx.gateSnapshot = null;
    if (existsSync(join(live, ".gate-snapshot"))) ctx.gateSnapshot = live;
    else if (existsSync(script)) {
        const holder = spawn(script, ["--hold", live], { stdio: ["pipe", "pipe", "inherit"] });
        let out = "";
        const line = await new Promise((resolve) => {
            holder.stdout.on("data", (d) => {
                out += d;
                if (out.includes("\n")) resolve(out.trim());
            });
            holder.on("exit", () => resolve(null));
        });
        // The holder lets the snapshot go when this process's end closes its stdin.
        holder.stdout.destroy();
        holder.stdin.unref?.();
        holder.unref();
        ctx.gateSnapshot = line || null;
        if (!line) console.error(`land: no snapshot of the live gate ${live}; the pushes use the live copy`);
    }
    return ctx.gateSnapshot;
}

/**
 * What the gate's screenshot capture (tools/visual-preview.sh --head, started by tools/prepush.sh beside
 * the tests) needs to make its capture the pull request's preview: the branch the push goes to, whose
 * open pull request it captures for, since a landing's check worktree is detached. The capture then stays
 * staged under the commit (local/.pending-<sha>) when the gate passes, which the review page offers as
 * "pending push" while the gate still runs; defaultPreview makes it the pull request's preview once the
 * push landed.
 * @param dst the branch pushed to
 * @returns the environment to add
 */
export const previewEnv = (dst) => ({ VISUAL_PREVIEW_BRANCH: dst });

/**
 * Pushes through the push queue, which runs the pre-push gate: light while CI verifies golden (lightGate).
 * @param ctx the run's context
 * @param [cwd] the worktree to push from (golden's)
 * @param [refspec] what to push (golden to golden)
 * @param [dryRun] run the gate and send nothing (a landing's check)
 * @returns `{ code, output }`
 */
async function defaultPush(ctx, cwd = ctx.golden, refspec = `${GOLDEN}:${GOLDEN}`, dryRun = false) {
    // A golden push is measured from the tip it replaces: golden's earlier landings were checked when they
    // landed, and verification runs the full suite on golden's tip after every landing. A cut is measured
    // from master, as CI measures it.
    const dst = refspec.split(":").pop().replace("refs/heads/", "");
    // The test ledger's kind (tools/test-ledger.mjs): a golden push is a land check, which may excuse a failure
    // golden's tip has too; set only in the gate child's environment, so nothing else inherits it.
    const kind = dst === CUT ? "cut" : "land-check";
    const env = {
        ...ctx.env,
        PUSH_BASE_REF: dst === GOLDEN ? `origin/${GOLDEN}` : "origin/master",
        PREPUSH_SELECT_BASE: `origin/${dst}`,
        PREPUSH_LIGHT: lightGate(ctx),
    };
    const snap = await gateSnapshot(ctx);
    if (snap) env.PUSH_QUEUE_GATE = snap;
    Object.assign(env, { TEST_LEDGER_KIND: kind, TEST_LEDGER_BRANCH: dst }, previewEnv(dst));
    const args = ["git", "push", ...(dryRun ? ["--dry-run"] : []), "origin", refspec];
    // A landing's check runs in its own process group, so a newer landing of the same branch can stop it alone
    // (cancelChecks); a signal to this process still reaches it (checkLanding forwards it).
    const child = spawn(join(cwd, "tools/push-queue.sh"), args, {
        cwd,
        env,
        detached: dryRun,
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
    return new Promise((resolve) =>
        child.on("close", (code) => {
            // The shards the gate excused, again at the end where the summary follows.
            const known = output.split("\n").map((l) => l.trim());
            for (const l of known.filter((k) => k.startsWith("[KNOWN]"))) console.log(`land: ${l}`);
            resolve({ code: code ?? 1, output });
        }),
    );
}

function defaultGh(ctx, args) {
    const r = spawnSync("gh", args, { cwd: ctx.main, env: ctx.env, encoding: "utf8" });
    // A GraphQL answer with errors (one asked-for issue does not exist) still carries the rest.
    if (r.status !== 0 && !r.stdout?.startsWith('{"data":{'))
        throw new Error(`gh ${args.slice(0, 2).join(" ")} failed: ${r.stderr?.trim() || r.error}`);
    return r.stdout.trim();
}

const readStatus = (dir) => {
    try {
        return JSON.parse(readFileSync(join(dir, "status.json"), "utf8"));
    } catch {
        return null;
    }
};

/**
 * Makes the pull request's preview the one the gate captured of the pushed head (already in place, or staged
 * under the commit), or starts
 * tools/visual-preview.sh for it, detached, when the gate captured none. The gate's capture ran beside
 * the gate on exactly the commit pushed (previewEnv) and is staged under it; it becomes the pull request's
 * preview here, after the push, so a candidate that never lands never replaces the preview of the head on
 * GitHub. A fresh capture is of `cwd`'s HEAD, the commit just pushed: the script waits until GitHub lists
 * it as the pull request's head (--expect), since GitHub can still report the old head for a while.
 * @param ctx the run's context
 * @param pr the pull request's number
 * @param [cwd] the worktree holding its head (golden's)
 */
export function defaultPreview(ctx, pr, cwd = ctx.golden) {
    const head = git(ctx, cwd, ["rev-parse", "HEAD"]);
    const local = join(ctx.main, "tmp/visual-review/local");
    const s = readStatus(join(local, String(pr)));
    if (s?.head === head && s.state !== "failed") {
        console.log(`land: the gate's screenshot preview of ${head.slice(0, 10)} is already on #${pr}`);
        return;
    }
    const staged = join(local, `.pending-${head}`);
    const g = readStatus(staged);
    if (g?.head === head && g.pr === Number(pr) && g.state === "done") {
        const dest = join(local, String(pr));
        rmSync(`${dest}.old`, { recursive: true, force: true });
        if (existsSync(dest)) renameSync(dest, `${dest}.old`);
        renameSync(staged, dest);
        rmSync(`${dest}.old`, { recursive: true, force: true });
        console.log(`land: the gate's screenshot preview of ${head.slice(0, 10)} is now #${pr}'s (${dest})`);
        return;
    }
    const log = join(ctx.main, `tmp/golden/preview-${pr}.log`);
    const fd = openSync(log, "w");
    // The live gate copy, as every other preview runs (the pre-push gate's), so all of them share one
    // queue; the worktree's own copy only where there is none. The cut's previews go first.
    const live = join(ctx.main, ".worktrees/gate-live/tools/visual-preview.sh");
    const script = existsSync(live) ? live : join(cwd, "tools/visual-preview.sh");
    const env = cwd === ctx.cut ? { ...ctx.env, VISUAL_PREVIEW_PRIORITY: "cut" } : ctx.env;
    spawn("setsid", [script, String(pr), "--expect", head], {
        cwd,
        env,
        detached: true,
        stdio: ["ignore", fd, fd],
    }).unref();
    closeSync(fd);
    console.log(`land: screenshots of #${pr} are being captured for the review page (log: ${log})`);
}

/**
 * Starts the cut's preview and, beside it, a watcher that runs auto-ship once that preview of the cut's
 * head ends: a preview ending is one of the events auto-ship decides on.
 * @param ctx the run's context
 * @param pr the cut pull request's number
 */
function previewCut(ctx, pr) {
    ctx.preview(ctx, pr, ctx.cut);
    ctx.watchPreview(ctx, pr, git(ctx, ctx.cut, ["rev-parse", "HEAD"]));
}

function defaultWatchPreview(ctx, pr, head) {
    const fd = openSync(join(ctx.main, `tmp/golden/auto-ship-watch-${pr}.log`), "w");
    const args = [fileURLToPath(import.meta.url), "auto-ship", "--after-preview", String(pr), head];
    spawn(process.execPath, args, { cwd: ctx.main, env: ctx.env, detached: true, stdio: ["ignore", fd, fd] }).unref();
    closeSync(fd);
}

/**
 * Waits for the preview of a pull request's head to end (done, failed or stale). An older head's status
 * is a leftover to wait past; another head's preview means a newer one replaced this one.
 * @param ctx the run's context
 * @param pr the pull request's number
 * @param head the head whose preview is awaited
 * @returns true when that preview ended, false when another replaced it
 */
export function previewSettled(ctx, pr, head) {
    const dir = join(ctx.main, `tmp/visual-review/local/${pr}`);
    mkdirSync(dir, { recursive: true });
    return new Promise((resolve) => {
        const look = () => {
            const s = readJson(join(dir, "status.json"));
            if (!s?.head || (s.head === head && s.state === "running")) return;
            const older =
                s.head !== head && git(ctx, ctx.main, ["merge-base", "--is-ancestor", s.head, head], { ok: true });
            if (older && older.status === 0) return;
            watcher.close();
            resolve(s.head === head);
        };
        const watcher = watchDir(dir, (_e, f) => (!f || f === "status.json") && look());
        look();
    });
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
        const cancelled = ctx.cancelled?.();
        if (cancelled) {
            ctx.rollback = null;
            git(ctx, wt.dir, ["reset", "-q", "--hard", before]);
            console.error(`land: this check was cancelled by ${cancelled}; nothing was landed.`);
            return { code: 1, sha };
        }
        const moved = goldenMoved(ctx, output, wt);
        if (moved && tries < 3 && mergeMoved(ctx, wt)) continue;
        ctx.rollback = null;
        git(ctx, wt.dir, ["reset", "-q", "--hard", before]);
        return refusedPush(ctx, wt, before, sha, output, moved);
    }
}

/**
 * Merges the branch's GitHub copy, which moved during the gate, into the worktree.
 * @param ctx the run's context
 * @param wt the worktree and branch
 * @returns whether the merge succeeded (a failed one is aborted)
 */
function mergeMoved(ctx, wt) {
    console.log(`land: ${wt.branch} moved on GitHub during the gate; merging origin/${wt.branch} and pushing again`);
    const args = withHooks(ctx, ["merge", "--no-edit", `origin/${wt.branch}`]);
    if (git(ctx, wt.dir, args, { ok: true }).status === 0) return true;
    git(ctx, wt.dir, ["merge", "--abort"], { ok: true });
    return false;
}

/**
 * Reports a push that did not go through, after the worktree was reset to `before`.
 * @param ctx the run's context
 * @param wt the worktree and branch
 * @param before the commit the branch is back at
 * @param sha the commit that was pushed
 * @param output the push's output
 * @param moved whether the branch moved on GitHub during the gate
 * @returns `{ code, sha, log }`: 4 the branch moved, 3 the gate refused it (`log` names its log)
 */
function refusedPush(ctx, wt, before, sha, output, moved) {
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

/**
 * Pushes golden and, on success, refreshes the pull request and its preview.
 * @param ctx the run's context
 * @param before golden's commit to go back to on a failure
 * @returns the exit code
 */
async function publish(ctx, before) {
    const r = await pushGolden(ctx, before);
    if (r.code === 0) await announce(ctx, r.sha);
    return r.code;
}

/**
 * After a push: refreshes the golden pull request's description, starts its preview and asks for its
 * verification. A landing's check (`ctx.checking`) pushed nothing, so it announces nothing.
 * @param ctx the run's context
 * @param sha the commit golden was pushed at
 */
async function announce(ctx, sha) {
    if (ctx.checking) return;
    let pr = null;
    try {
        pr = refreshPr(ctx);
    } catch (e) {
        console.error(`land: ${e.message}`);
    }
    if (pr) ctx.preview(ctx, pr);
    else console.error("land: the golden pull request was not updated; the next land or revert updates it");
    const where = pr ? `, pull request #${pr}` : "";
    console.log(`land: golden is ${sha.slice(0, 10)} on GitHub${where}.`);
    await requestVerify(ctx, sha, GOLDEN);
}

/**
 * Asks tools/verify.mjs to verify a pushed commit (it starts a run when none is live). Never fails the
 * landing: the pipeline round starts a run that was not started.
 * @param ctx the run's context
 * @param sha the pushed commit
 * @param branch golden or golden-cut
 */
async function requestVerify(ctx, sha, branch) {
    try {
        await ctx.verify(ctx, sha, branch);
    } catch (e) {
        console.error(
            `land: verification of ${sha.slice(0, 10)} was not started (${e.message}); the pipeline round starts it`,
        );
    }
}

async function defaultVerify(ctx, sha, branch) {
    const { requestVerification, verifyContext } = await import("./verify.mjs");
    console.log(`land: ${await requestVerification(verifyContext(ctx.main, { env: ctx.env, branch }), sha)}`);
}

// ---------------------------------------------------------------- commands

/**
 * Lands a branch on golden.
 * @param ctx the run's context
 * @param branch the branch to land
 * @param [opts] `dryRun`: merge, report, undo; no push, no GitHub; `allowCopies`: sha prefixes of copies
 *   of golden commits to land anyway
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
    const { refusal, allowed } = screenCopies(ctx, branch, ref, opts.allowCopies ?? []);
    if (refusal) {
        git(ctx, ctx.golden, ["reset", "-q", "--hard", start]);
        return fail(refusal);
    }
    const merged = reapply(ctx, branch, ref) || mergeBranch(ctx, branch, ref, allowed);
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
    return copiedShas(ctx, ref).map((sha) => describeCommit(ctx, sha));
}

const copiedShas = (ctx, ref) =>
    git(ctx, ctx.golden, ["cherry", "HEAD", ref])
        .split("\n")
        .filter((l) => l.startsWith("- "))
        .map((l) => l.slice(2));
const describeCommit = (ctx, sha) => git(ctx, ctx.golden, ["log", "-1", "--format=%h %s", "--abbrev=10", sha]);

/**
 * Checks a branch's copies of golden commits against the ones `--allow-copies` accepted.
 * @param ctx the run's context
 * @param branch the branch
 * @param ref its ref
 * @param allow the accepted sha prefixes (7+ characters each)
 * @returns `{ refusal }` when anything is not accepted (a copy not listed, a listed sha that is no copy),
 *   else `{ allowed }`: the accepted copies as "<sha10> <subject>" lines
 */
export function screenCopies(ctx, branch, ref, allow) {
    const short = allow.filter((p) => !/^[0-9a-f]{7,40}$/i.test(p));
    if (short.length)
        return { refusal: `--allow-copies takes sha prefixes of 7 to 40 hex characters: ${short.join(", ")}` };
    const shas = copiedShas(ctx, ref);
    const listed = (sha) => allow.some((p) => sha.startsWith(p.toLowerCase()));
    const notCopies = allow.filter((p) => !shas.some((sha) => sha.startsWith(p.toLowerCase())));
    if (notCopies.length) {
        return {
            refusal:
                `--allow-copies names commits that are not copies of golden commits on ${branch}: ` +
                `${notCopies.join(", ")}\nNothing was landed; list only the copies the refusal names.`,
        };
    }
    const refused = shas.filter((sha) => !listed(sha)).map((sha) => describeCommit(ctx, sha));
    if (refused.length) return { refusal: copyRefusal(branch, refused) };
    return { allowed: shas.map((sha) => describeCommit(ctx, sha)) };
}

const copyRefusal = (branch, copies) =>
    `${branch} holds copies of commits golden already has (a cherry-pick or a rebase), so it is not landed:\n  ` +
    `${copies.join("\n  ")}\nNever copy, always merge: start again from the original branch, or merge it.\n` +
    `If the copies were made on purpose, land it alone with --allow-copies <sha>[,<sha>...] naming each one.`;
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
    const run = await landRun(ctx, branches, opts);
    return typeof run === "number" ? run : summarize(run, branches);
}

/**
 * landMany without its summary: the landing's state, for landShort to finish.
 * @param ctx the run's context (in a landing's check, `golden` is the check's worktree and a push sends nothing)
 * @param branches the branches, in landing order
 * @param [opts] `dryRun`
 * @returns the run (`outcomes`, `pushed`, `stopped`), or an exit code when it stopped before merging
 */
async function landRun(ctx, branches, opts = {}) {
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
    const run = { refs, start, outcomes: new Map(), pushed: false, stopped: 0, siblings: siblingConflicts(ctx, refs) };
    const merged = mergeEach(ctx, run, branches);
    if (opts.dryRun && merged.length) {
        const log = git(ctx, ctx.golden, ["log", "--oneline", `${start}..HEAD`]);
        const what = git(ctx, ctx.golden, ["diff", "--stat", before, "HEAD"]);
        console.log(`land: dry run -- would push to golden:\n${log}\n${what}`);
    }
    if (!opts.dryRun && merged.length) await landGroup(ctx, run, merged, before);
    if (run.pushed) await announce(ctx, goldenHead(ctx));
    else git(ctx, ctx.golden, ["reset", "-q", "--hard", start]);
    return run;
}

// ---------------------------------------------------------------- the short lock (fast-pipeline 4.2)

const ATTEMPTS = 3;
const CHECK_SLOTS = 4;
const MOVED = "moved";

/**
 * Lands branches with the landing lock held only to confirm golden and push. First, without the lock, the
 * branches are merged with golden as it is now in a check worktree and the gate runs on that commit (a
 * dry-run push: nothing is sent; passes are kept by input key, tools/prepush-inputs.mjs). Then, under the
 * lock, golden fast-forwards to exactly that commit when it still contains GitHub's golden, and is pushed:
 * the push finds the check's pass on the identical files and takes no gate slot. When golden moved, the
 * lock is released and the check runs again on the new golden, reusing every shard whose inputs did not
 * change; after three such tries the landing holds the lock through its check.
 * @param ctx the run's context
 * @param branches the branches, in landing order
 * @param lockOptions the lock's options
 * @returns the exit code, as landMany's
 */
async function landShort(ctx, branches, lockOptions) {
    const info = { command: "land", branch: branches.join(" ") };
    const locked = () => underLock(ctx, info, lockOptions, () => landMany(ctx, branches));
    if (!existsSync(ctx.golden) || hasRef(ctx, ctx.main, `origin/${GOLDEN}`).status !== 0) return locked();
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        const checked = await checkLanding(ctx, branches, lockOptions);
        if (!checked.commit) return checked.code;
        const code = await underLock(ctx, info, lockOptions, () => publishChecked(ctx, branches, checked));
        if (code !== MOVED) return code;
        console.log(
            `land: golden moved during the check (try ${attempt} of ${ATTEMPTS}); checking again on the new golden`,
        );
    }
    console.log(`land: golden moved during ${ATTEMPTS} checks; this landing holds the lock through its check`);
    return locked();
}

/**
 * The landing's check, without the lock: the branches merged onto origin/golden (and origin/master) in a
 * check worktree, as their landing would merge them, and the gate run on the result without sending it.
 * @param ctx the run's context
 * @param branches the branches
 * @param lockOptions the lock's options (`pollMs` for the check slots)
 * @returns `{ commit, run }` when some branches passed, else `{ code }` (the summary is printed)
 */
async function checkLanding(ctx, branches, lockOptions) {
    git(ctx, ctx.main, ["fetch", "-q", "origin"]);
    const tips = branches.map((b) => ({ branch: b, tip: tipOf(ctx, b) }));
    cancelChecks(ctx, tips);
    const slot = await takeCheckSlot(ctx, lockOptions, tips);
    const marker = join(slot.lock, "cancelled");
    const cancelled = () => (existsSync(marker) ? readFileSync(marker, "utf8").trim() : null);
    const push = async (c) => {
        if (cancelled()) return { code: 1, output: "" };
        const pending = ctx.check(c, c.golden);
        const gate = c.child?.pid;
        if (gate) noteSlot(slot.lock, { gate });
        // A cancel that read the slot before the gate's group was recorded wrote its marker first: stop it here.
        if (gate && cancelled()) killGroup(gate);
        const forward = (signal) => {
            killGroup(gate, signal);
            process.kill(process.pid, signal);
        };
        if (gate) for (const s of ["SIGINT", "SIGTERM"]) process.once(s, forward);
        try {
            return await pending;
        } finally {
            for (const s of ["SIGINT", "SIGTERM"]) process.off(s, forward);
        }
    };
    const check = { ...ctx, golden: slot.dir, checking: true, push, cancelled };
    try {
        // From local golden, which a hand-made merge (exit 4) leaves ahead of GitHub's; the sync merges GitHub's.
        prepareScratch(check, slot.dir, GOLDEN);
        check.hooks = hooksDir(ctx); // golden's own hooks, as a landing under the lock uses
        console.log(`land: checking ${branches.join(", ")} on golden in ${slot.dir}, without the landing lock`);
        const run = await landRun(check, branches);
        if (typeof run === "number") return { code: run };
        if (!run.pushed) return { code: summarize(run, branches) };
        return { commit: goldenHead(check), run };
    } finally {
        if (check.hooks) rmSync(check.hooks, { recursive: true, force: true });
        slot.release();
    }
}

const tipOf = (ctx, branch) => {
    const ref = branchRef(ctx, branch);
    return ref ? git(ctx, ctx.main, ["rev-parse", ref]) : null;
};

const killGroup = (pgid, signal = "SIGTERM") => {
    try {
        process.kill(-pgid, signal);
    } catch {
        // already gone
    }
};

// Adds fields to a check slot's owner record.
const noteSlot = (lock, fields) =>
    writeFileSync(join(lock, "owner.json"), `${JSON.stringify({ ...readLock(lock), ...fields })}\n`);

/**
 * Cancels the land checks this machine is still running that a new landing makes pointless: one of the same
 * branch, or of a branch whose tip the new landing holds (folded into one of its branches). Only checks in
 * land.mjs's check slots: each is marked cancelled (its landing stops and says by whom) and its gate's own
 * process group is stopped. The cancelled landing then puts its check worktree back and frees the slot, as after
 * any failed check; a slot whose landing is gone is taken over by the next landing as before.
 * @param ctx the run's context
 * @param tips the new landing's `{ branch, tip }`
 * @returns the cancelled landings' pids
 */
export function cancelChecks(ctx, tips) {
    const covers = (old) =>
        tips.some((t) => t.branch === old.branch || (old.tip && t.tip && isAncestor(ctx, old.tip, t.tip)));
    const by = `a newer landing of ${tips.map((t) => t.branch).join(", ")} (pid ${process.pid})`;
    const cancelled = [];
    for (let n = 1; n <= CHECK_SLOTS; n++) {
        const lock = join(ctx.main, `tmp/golden/check-slot-${n}`);
        const owner = readLock(lock);
        if (!owner?.pid || owner.host !== hostname() || !alive(owner.pid) || !owner.tips?.some(covers)) continue;
        writeFileSync(join(lock, "cancelled"), `${by}\n`);
        // Read again: the gate's group may have been recorded meanwhile (the landing also looks for the marker).
        const gate = readLock(lock)?.gate;
        if (gate) killGroup(gate);
        console.log(`land: cancelled the check of ${owner.tips.map((t) => t.branch).join(", ")} (pid ${owner.pid})`);
        cancelled.push(owner.pid);
    }
    return cancelled;
}

/**
 * Under the lock: golden fast-forwards to the checked commit and is pushed, when that commit still holds
 * everything GitHub's golden has (compare and swap); else nothing changes.
 * @param ctx the run's context
 * @param branches the branches
 * @param checked checkLanding's `{ commit, run }`
 * @returns the exit code, or MOVED
 */
async function publishChecked(ctx, branches, checked) {
    const { commit, run } = checked;
    git(ctx, ctx.golden, ["fetch", "-q", "origin"]);
    const start = goldenHead(ctx);
    if (!isAncestor(ctx, `origin/${GOLDEN}`, commit) || !isAncestor(ctx, start, commit)) return MOVED;
    git(ctx, ctx.golden, ["merge", "-q", "--ff-only", commit]);
    installIfNeeded(ctx);
    const r = await pushGolden(ctx, start);
    if (r.code === 0) {
        await announce(ctx, r.sha);
    } else {
        run.stopped = r.code === 3 ? 0 : r.code;
        const state = r.code === 3 ? `gate failure, log: ${r.log}` : "not tried (the landing stopped)";
        for (const [b, o] of run.outcomes) if (o.state === "landed") run.outcomes.set(b, { state });
    }
    return summarize(run, branches);
}

const isAncestor = (ctx, a, b) => git(ctx, ctx.main, ["merge-base", "--is-ancestor", a, b], { ok: true }).status === 0;

/**
 * One of CHECK_SLOTS check worktrees (<main checkout>/.worktrees/land-check-<n>), each with its own lock
 * in tmp/golden/check-slot-<n>, so landings check side by side and each worktree keeps its install.
 * @param ctx the run's context
 * @param [opts] `pollMs` between looks when every slot is taken
 * @param [tips] the landing's `{ branch, tip }`, recorded for cancelChecks
 * @returns `{ dir, lock, release }`
 */
async function takeCheckSlot(ctx, opts = {}, tips = []) {
    mkdirSync(join(ctx.main, "tmp/golden"), { recursive: true });
    for (;;) {
        for (let n = 1; n <= CHECK_SLOTS; n++) {
            const lock = join(ctx.main, `tmp/golden/check-slot-${n}`);
            const owner = readLock(lock);
            if (owner && stale(lock, owner)) removeStaleLock(lock, owner);
            const release = tryLock(lock, { command: "land check", tips });
            if (release) return { dir: join(ctx.main, `.worktrees/land-check-${n}`), lock, release };
        }
        await new Promise((r) => setTimeout(r, opts.pollMs ?? 15_000));
    }
}

/**
 * Puts a tool's own scratch worktree (a landing check, verification, a bisect point) at a commit:
 * makes it, detached, with the main checkout's .env linked in, or resets and cleans it (ignored files,
 * node_modules among them, stay); installs when its lockfile changed.
 * @param ctx the run's context
 * @param dir the worktree
 * @param ref the commit
 */
export function prepareScratch(ctx, dir, ref) {
    const wt = { ...ctx, golden: dir };
    if (existsSync(dir)) {
        git(ctx, dir, ["reset", "-q", "--hard", ref]);
        git(ctx, dir, ["clean", "-fdq"]);
    } else {
        git(ctx, ctx.main, ["worktree", "add", "-q", "--detach", dir, ref]);
        if (existsSync(join(ctx.main, ".env"))) symlinkSync(join(ctx.main, ".env"), join(dir, ".env"));
        rmSync(installedFile(wt), { force: true });
    }
    installIfNeeded(wt);
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
        const sibling = run.siblings?.find((p) => p.second === b && merged.includes(p.first))?.first;
        let state = code === 2 ? "conflict" : "refused (see above)";
        if (code === 2 && sibling) state = `conflict with ${sibling}, merged before it in this batch`;
        run.outcomes.set(b, { state });
    }
    return merged;
}

/**
 * The pairs of a batch's branches that conflict with each other (git merge-tree of the two tips), printed
 * before anything is merged: the later of such a pair cannot land beside the earlier, whatever golden holds,
 * and merging golden into it does not help. The rest of the batch still lands.
 * @param ctx the run's context
 * @param refs the batch's refs by branch, in landing order
 * @returns `[{ first, second, files }]`
 */
export function siblingConflicts(ctx, refs) {
    const list = [...refs];
    const pairs = [];
    for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
            const args = ["merge-tree", "--write-tree", "--name-only", "--no-messages", list[i][1], list[j][1]];
            const r = git(ctx, ctx.main, args, { ok: true });
            if (r.status !== 1) continue;
            pairs.push({ first: list[i][0], second: list[j][0], files: r.stdout.split("\n").slice(1).filter(Boolean) });
        }
    }
    if (pairs.length) {
        const lines = pairs.map((p) => `  ${p.first} and ${p.second}: ${p.files.join(", ")}`);
        console.log(`land: these branches of the batch conflict with each other:\n${lines.join("\n")}`);
    }
    return pairs;
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
        // The gate log names the group's last land commit; the failure may be any branch's.
        console.log(
            `land: the gate refused ${group.join(", ")} together (its log names the last, land: ${group.at(-1)}, ` +
                `but any of them may be the cause); finding the branch: trying ${group.slice(0, mid).join(", ")} first`,
        );
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
    if (states.some((s) => s.startsWith("conflict with "))) {
        console.log(
            "land: for each conflict with another branch of this batch: merge the earlier branch into the later\n" +
                "  in the later one's worktree (git merge origin/<earlier>, resolve, commit) and land it again,\n" +
                "  or land it alone once the earlier one is on golden",
        );
    }
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
    const conflict = states.some((s) => s.startsWith("conflict"));
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

const mergeBranch = (ctx, branch, ref, allowed = []) =>
    gitStep(ctx, branch, "merge", [
        "--no-ff",
        "--no-edit",
        "-m",
        `land: ${branch}`,
        ...(allowed.length
            ? ["-m", `Copies of golden commits landed on purpose (--allow-copies):\n${allowed.join("\n")}`]
            : []),
        ref,
    ]);

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
    const r = shipReady(ctx);
    if (r.error) return fail(r.error);
    printRisks(ctx.main, { cut: r.pr.headRefOid, golden: `origin/${GOLDEN}`, master: "origin/master" });
    markReady(ctx, r.pr);
    console.log(
        "CI (ci.yml) now runs the affected suite on it once, on clean machines, and the visual gate checks\n" +
            "CI's screenshots against the owner's approvals. When All Checks Pass and Lint PR Title are green,\n" +
            "GitHub merges it into master with a merge commit. If CI fails, find the culprit from the failure,\n" +
            "`node tools/land.mjs revert <branch>` it, cut again, and `gh pr ready --undo` while you do.",
    );
    return 0;
}

/**
 * What ship checks before marking the cut pull request ready: no cut pushing golden-cut, an open cut pull
 * request whose preview is current and whose head is verified.
 * @param ctx the run's context
 * @returns `{ pr }` when it can ship, else `{ error, pr? }` (`pr` once the pull request is known)
 */
function shipReady(ctx) {
    const cutting = readLock(ctx.cutLock);
    if (cutting && !stale(ctx.cutLock, cutting)) {
        return { error: `a cut is pushing ${CUT} now (${describeOwner(cutting)}); ship after it`, cutting: true };
    }
    git(ctx, ctx.main, ["fetch", "-q", "origin"]);
    updateMainCheckout(ctx);
    const pr = goldenPr(ctx, CUT);
    if (!pr) return { error: `there is no open ${CUT} pull request; make one with node tools/land.mjs cut` };
    const moved = cutMoved(ctx, pr);
    if (moved)
        return { pr, error: `#${pr.number} ${moved}; run tools/visual-preview.sh ${pr.number} and ship after it` };
    const unverified = cutUnverified(ctx, pr.headRefOid);
    if (unverified) return { pr, error: `#${pr.number} ${unverified}` };
    const drawnOtherwise = ciScreenshots(ctx, pr.headRefOid);
    if (drawnOtherwise) return { pr, error: `#${pr.number} ${drawnOtherwise}` };
    return { pr };
}

/**
 * What CI's own capture of the cut's verified commit found (verify.mjs captureChanges, #3363), printed: the images
 * CI draws differently from the baselines it compared with, and the flaky ones. A changed image whose baseline at
 * the cut's head is still the one CI compared with fails the cut's visual gate, so ship and auto-ship refuse it
 * (auto-ship ships only cuts with no changed screenshot); one whose baseline the owner replaced since is the
 * gate's to judge. A cut with no CI capture (local verification, a tree CI cannot run) is refused nothing here.
 * @param ctx the run's context
 * @param head the cut pull request's head
 * @returns the refusal, or null
 */
function ciScreenshots(ctx, head) {
    const record = cutCaptures(ctx, head);
    if (!record?.changed) return null;
    const [baselines] = reviewDirs(ctx);
    const oid = (i) => {
        const pointer = git(ctx, ctx.main, ["show", `${head}:${baselines}/${i.project}/${i.file}`], { ok: true });
        return /^oid sha256:(\w+)$/m.exec(pointer.stdout ?? "")?.[1] ?? null;
    };
    const name = (i) => `${i.project}/${i.file} ${i.status}`;
    const open = record.changed.filter((i) => oid(i) === (i.baseline ?? null));
    for (const i of record.changed) {
        console.log(
            `land: CI screenshot ${open.includes(i) ? "changed" : "changed, approved again since"}: ${name(i)}`,
        );
    }
    for (const i of record.flaky ?? []) console.log(`land: CI screenshot flaky: ${name(i)}`);
    if (!open.length) return null;
    const list = open.slice(0, 5).map(name).join("; ");
    return (
        `draws ${open.length} screenshot(s) differently in CI (${record.run}) from the approved baselines, so ` +
        `its visual gate would fail: ${list}. Fix the story and cut-fix it, or have the owner approve CI's picture`
    );
}

// The CI capture record (verify.mjs passedCommit) of a commit with the cut head's files outside the screenshot
// review's own directories: golden-cut's own verification first, then golden's, newest first.
function cutCaptures(ctx, head) {
    const of = (file) => Object.entries(readJson(join(ctx.main, `tmp/golden/${file}`))?.captures ?? {}).reverse();
    const found = [...of(`verify-${CUT}.json`), ...of("verify.json")].find(([c]) => sameOutsideReview(ctx, c, head));
    return found?.[1] ?? null;
}

function markReady(ctx, pr) {
    ctx.gh(ctx, ["pr", "ready", String(pr.number)]);
    ctx.gh(ctx, ["pr", "merge", String(pr.number), "--auto", "--merge"]);
    console.log(`land: #${pr.number} is ready with auto-merge on (${pr.url}).`);
}

// The statuses of a preview item that need no one's decision.
const CLEAN = new Set(["unchanged", "excluded"]);

/**
 * Ships the cut pull request without the owner when nothing in it needs the owner's eyes: its preview of
 * exactly its head shows only unchanged and excluded images, its baselines are master's (or the owner signed that tree), and ship's own
 * checks pass. Called when a cut's preview finishes and when a verification passes; a second call, or one
 * while another decides, does nothing. Every decision goes to tmp/golden/auto-ship.log.
 * @param ctx the run's context
 * @returns 0
 */
export async function autoShip(ctx) {
    const lock = join(ctx.main, "tmp/golden/auto-ship-lock");
    mkdirSync(dirname(lock), { recursive: true });
    const owner = readLock(lock);
    if (owner && stale(lock, owner)) removeStaleLock(lock, owner);
    const release = tryLock(lock, { command: "auto-ship" });
    if (!release) return 0;
    try {
        const r = shipReady(ctx);
        if (r.pr && !r.pr.isDraft) return 0;
        if (!r.pr && !r.cutting) return 0;
        const changed = r.error ? [] : await previewChanges(ctx, r.pr);
        let why = r.error;
        if (!why && typeof changed === "string") why = `#${r.pr.number} ${changed}`;
        else if (!why && changed.length) {
            why = `#${r.pr.number} waits for the owner: ${changed.length} changed (${changed.slice(0, 5).join("; ")})`;
        }
        why ??= shipBlocker(ctx, r.pr);
        if (why) {
            logAutoShip(ctx, `waiting: ${why}`);
            return 0;
        }
        markReady(ctx, r.pr);
        logAutoShip(
            ctx,
            `shipped #${r.pr.number} at ${r.pr.headRefOid.slice(0, 10)}: no changed screenshots, verified`,
        );
        return 0;
    } finally {
        release();
    }
}

/**
 * What in the cut needs the owner: every preview item that is not unchanged or excluded, and a baselines
 * tree that differs from master's without the owner's signed approval of exactly that tree, checked as the CI
 * gate checks it (visual-review/trusted/gate.mjs treeApprovalProblems, with master's passkeys).
 * @param ctx the run's context
 * @param pr the cut pull request (`number`, `headRefOid`)
 * @returns the list (empty: nothing), or why the preview cannot tell
 */
async function previewChanges(ctx, pr) {
    const dir = join(ctx.main, `tmp/visual-review/local/${pr.number}`);
    const status = readJson(join(dir, "status.json"));
    if (status?.state !== "done" || status.head !== pr.headRefOid) {
        return `has no finished screenshot preview of its head ${pr.headRefOid.slice(0, 10)}`;
    }
    if (/^nothing captured/.test(status.step ?? "")) return `captured nothing: ${status.step}`;
    const changed = [];
    for (const p of status.projects ?? []) {
        const results = readJson(join(dir, p, "results.json"));
        if (results?.complete !== true) return `has no complete preview of ${p}`;
        for (const i of results.items) if (!CLEAN.has(i.status)) changed.push(`${p}/${i.file} ${i.status}`);
    }
    // Loaded here, not at the top: the land tool runs without visual-review beside it everywhere else.
    const { approvalKeys, treeApprovalProblems } = await import("../visual-review/trusted/gate.mjs");
    const [baselines, approvals] = reviewDirs(ctx);
    const at = { base: "origin/master", head: pr.headRefOid, cwd: ctx.main, baselines, approvals };
    const { keys, problems } = approvalKeys(at.base, at.head, ctx.main);
    for (const why of [...problems, ...treeApprovalProblems({ ...at, keys })]) changed.push(`baselines: ${why}`);
    return changed;
}

/**
 * What else keeps a cut from shipping without the owner: a breaking commit needs the owner's go, and a red
 * master build ships nothing but its fix (the pipeline round ships that by hand).
 * @param ctx the run's context
 * @param pr the cut pull request
 * @returns the reason, or null
 */
function shipBlocker(ctx, pr) {
    const subjects = git(ctx, ctx.main, ["log", "--format=%s", `origin/master..${pr.headRefOid}`]).split("\n");
    const breaking = subjects.filter((t) => /^[a-z]+(\([^)]*\))?!:/.test(t));
    if (breaking.length) return `#${pr.number} waits for the owner's go on a breaking commit: ${breaking[0]}`;
    const runs = ctx.gh(ctx, [
        "run",
        "list",
        "--workflow",
        "ci.yml",
        "--branch",
        "master",
        "--event",
        "push",
        "--status",
        "completed",
        "--limit",
        "1",
        "--json",
        "conclusion",
    ]);
    const conclusion = JSON.parse(runs || "[]")[0]?.conclusion;
    return conclusion === "success" ? null : `#${pr.number} waits: master's last build is ${conclusion ?? "unknown"}`;
}

function logAutoShip(ctx, line) {
    console.log(`land: auto-ship: ${line}`);
    appendFileSync(join(ctx.main, "tmp/golden/auto-ship.log"), `${new Date().toISOString()} ${line}\n`);
}

/**
 * Whether the cut pull request's head moved since its last finished preview: its files differ from the
 * preview's head outside the screenshot review's own directories (sameOutsideReview).
 * @param ctx the run's context
 * @param pr the cut pull request (`number`, `headRefOid`)
 * @returns what is wrong, or null when the preview is of this head
 */
function cutMoved(ctx, pr) {
    const status = readJson(join(ctx.main, `tmp/visual-review/local/${pr.number}/status.json`));
    if (status?.state !== "done" || !status.head) return "has no finished screenshot preview";
    if (sameOutsideReview(ctx, status.head, pr.headRefOid)) return null;
    const what = reviewDirs(ctx).join(" and ");
    return `moved since its preview of ${status.head.slice(0, 10)}: ${pr.headRefOid.slice(0, 10)} changes more than ${what}`;
}

/** What ship and status say of a cut whose verification is its pull request's own CI run (verify.mjs). */
export const CUT_CI_VERIFIES = "the cut pull request's CI is the verification (its tree predates golden-verify.yml)";

/**
 * Whether the cut's head is verified: its files are those of a commit golden-verified holds, or of the
 * commit golden-cut's own verification passed (after a cut-fix), outside the screenshot review's own
 * directories (sameOutsideReview), so the owner's Finish and an update of the baselines from master
 * need no new verification. A cut CI cannot run golden-verify.yml on (verify.mjs records `ciCannotRun`;
 * its fixes went in through cut-fix gates) is verified by its pull request's own CI run, which ship starts.
 * @param ctx the run's context
 * @param head the cut pull request's head
 * @returns what is wrong, or null when it is verified
 */
function cutUnverified(ctx, head) {
    const state = readJson(join(ctx.main, `tmp/golden/verify-${CUT}.json`));
    const byItsCi = state?.last?.status === "ciCannotRun" ? state.last.commit : null;
    for (const v of [`origin/${VERIFIED}`, state?.verified, byItsCi]) {
        if (!v || hasRef(ctx, ctx.main, v).status !== 0) continue;
        const base = git(ctx, ctx.main, ["merge-base", head, v], { ok: true }).stdout;
        if (!base || !sameOutsideReview(ctx, base, head)) continue;
        if (v === byItsCi) console.log(`land: verification: ${CUT_CI_VERIFIES}`);
        return null;
    }
    return `is not verified yet at ${head.slice(0, 10)} (node tools/verify.mjs status --branch ${CUT}); ship once it is`;
}

/**
 * The screenshot review's own directories (the baselines and the approvals of visual-review.config.json):
 * what a Finish, or an update of the baselines from master, writes. Nothing in them changes a capture or a test.
 * @param ctx the run's context
 * @returns the two directories
 */
function reviewDirs(ctx) {
    const config = readJson(join(ctx.main, "visual-review.config.json")) ?? {};
    return [config.baselines ?? "visual-baselines", config.approvals ?? "visual-review-approvals"];
}

/**
 * Whether two commits hold the same files outside the screenshot review's own directories (reviewDirs),
 * whatever commits lie between them (accept and approval commits, merges of master's baselines).
 * @param ctx the run's context
 * @param a one commit
 * @param b the other
 * @returns true when they do
 */
export function sameOutsideReview(ctx, a, b) {
    const exclude = reviewDirs(ctx).map((d) => `:(exclude)${d}`);
    return git(ctx, ctx.main, ["diff", "--quiet", a, b, "--", ".", ...exclude], { ok: true }).status === 0;
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
 * The newest verified first-parent golden commit master does not have whose local preview is stable:
 * only commits up to golden-verified, the newest one verification passed (tools/verify.mjs).
 * @param ctx the run's context
 * @returns its sha, or null
 */
export function newestStableCut(ctx) {
    if (hasRef(ctx, ctx.main, `origin/${VERIFIED}`).status !== 0) return null;
    const root = join(ctx.main, "tmp/visual-review/local");
    const stable = new Set();
    for (const name of existsSync(root) ? readdirSync(root) : []) {
        const status = readJson(join(root, name, "status.json"));
        if (stablePreview(join(root, name), status)) stable.add(status.head);
    }
    const line = git(ctx, ctx.main, ["rev-list", "--first-parent", `origin/master..origin/${VERIFIED}`]);
    const clean = capturesClean(ctx);
    return line.split("\n").find((sha) => stable.has(sha) && clean(sha)) ?? null;
}

/**
 * Verification's screenshot verdict (tools/verify.mjs passedCommit): while CI verifies golden, a commit is cut only
 * when the captures of its CI verification were clean (no crashed capture job, no unstable or failed image), so a
 * commit CI did not verify itself, or whose captures were not clean, is never cut. With local verification the
 * local preview alone decides, as before.
 * @param ctx the run's context
 * @returns `(sha) => boolean`
 */
export function capturesClean(ctx) {
    const state = readJson(join(ctx.main, "tmp/golden/verify.json"));
    if (state?.backend?.name !== "ci") return () => true;
    return (sha) => state.captures?.[sha]?.clean === true;
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
        if (sha) console.log(`land: the newest verified golden commit with a stable preview is ${sha.slice(0, 10)}`);
    }
    if (!sha) {
        return {
            error:
                "no verified golden commit since master has a finished screenshot preview without unstable or failed images\n" +
                "(and, while CI verifies golden, clean captures in its CI run: node tools/verify.mjs status).\n" +
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
    const frozen = frozenCut(ctx);
    if (frozen) return fail(frozen);
    const picked = pickCut(ctx, given);
    if (picked.error) return fail(picked.error);
    const { sha } = picked;
    printRisks(ctx.main, { cut: sha, golden: `origin/${GOLDEN}`, master: "origin/master" });
    const why = cutWorktree(ctx, sha);
    if (why) return fail(why);
    const { code, output } = await ctx.push(ctx, ctx.cut, `${sha}:refs/heads/${CUT}`);
    if (code !== 0) return fail(`the push of ${sha.slice(0, 10)} to ${CUT} failed; log: ${gateLog(ctx, sha, output)}`);
    const intro = [
        `A cut of \`golden\` at ${sha.slice(0, 10)}: this is what ships. Approvals that ship are made here.`,
        "",
    ];
    const pr = upsertPr(ctx, CUT, CUT_TITLE, prBody(landedBranches(ctx, ctx.main, "origin/master", sha), intro), true);
    if (pr) previewCut(ctx, pr);
    const where = pr ? `, pull request #${pr}` : "";
    console.log(`land: ${CUT} is ${sha.slice(0, 10)} on GitHub${where}.`);
    // A verified commit passes at once; a named one gets the full verification ship waits for.
    await requestVerify(ctx, sha, CUT);
    return 0;
}

/**
 * Why the cut must not move now, by `cut` or by `cut-fix`. It is frozen while its pull request is shipped
 * (ready: its CI is running or it is about to merge, and a new head would cancel that run), and while it
 * awaits the owner -- a draft whose screenshot preview of its head is done (cutMoved) and whose baselines
 * carry no Finish yet (no signed approval of the head's visual-baselines tree): a new head would make the
 * owner review a target that moved under them.
 * @param ctx the run's context (origin fetched)
 * @returns the refusal, or null when the cut may move
 */
function frozenCut(ctx) {
    const pr = goldenPr(ctx, CUT);
    if (!pr?.headRefOid) return null;
    const after =
        "Every other fix lands on golden and ships with the next cut; a fix for a red master, a failed deploy " +
        "or a release hold goes in with cut-fix once the cut is no longer frozen.";
    if (!pr.isDraft) {
        return (
            `#${pr.number} is shipped (ready, its CI running or about to merge), so ${CUT} stays frozen: a new ` +
            `head would cancel that run.\nCut again after it merges. If its CI failed, it goes back to draft ` +
            `first (gh pr ready --undo ${pr.number}). ${after}`
        );
    }
    if (cutMoved(ctx, pr)) return null;
    const [baselines, approvals] = reviewDirs(ctx);
    const tree = git(ctx, ctx.main, ["rev-parse", "-q", "--verify", `${pr.headRefOid}:${baselines}`], { ok: true });
    const signed = `${pr.headRefOid}:${approvals}/${tree.stdout}.json`;
    if (tree.status === 0 && git(ctx, ctx.main, ["cat-file", "-e", signed], { ok: true }).status === 0) return null;
    return (
        `#${pr.number} awaits the owner's review: its preview of ${pr.headRefOid.slice(0, 10)} is done and it has ` +
        `no Finish yet, so ${CUT} stays frozen.\nCut again after the owner's Finish, or after the cut ` +
        `pull request is closed. ${after}`
    );
}

/**
 * Why a branch cannot go into the cut: it would bring commits of golden or master that golden-cut does
 * not have, so it was not started from origin/golden-cut. A cut fix starts there and holds only its own
 * commits; every other fix lands on golden.
 * @param ctx the run's context
 * @param ref the branch's ref
 * @returns the reason, or null when only its own commits would go in
 */
function notOnCut(ctx, ref) {
    const list = (...not) =>
        git(ctx, ctx.main, ["rev-list", ref, `^origin/${CUT}`, ...not])
            .split("\n")
            .filter(Boolean);
    const own = new Set(list(`^origin/${GOLDEN}`, "^origin/master"));
    const extra = list().filter((sha) => !own.has(sha));
    if (extra.length === 0) return null;
    const named = extra.slice(0, 5).map((sha) => `  ${describeCommit({ ...ctx, golden: ctx.main }, sha)}`);
    const more = extra.length > 5 ? [`  ... and ${extra.length - 5} more`] : [];
    return [
        `it was not started from origin/${CUT}: it would bring ${extra.length} commits of golden or master that ${CUT} does not have:`,
        ...named,
        ...more,
        `A fix for the cut starts from the cut: ./tools/worktree-new.sh <branch> origin/${CUT}`,
        "Any other fix lands on golden: node tools/land.mjs land <branch>",
    ].join("\n");
}

const FAILED = new Set(["failure", "timed_out", "startup_failure"]);
const CUT_FIX_USAGE =
    "a cut fix is only for a red master, a failed deploy or a release hold. Name it with --reason <issue> " +
    '(an open priority:critical or "Release held" issue) or --reason run:<id> (a failed release.yml or ' +
    "deploy-pages.yml run, or a failed ci.yml run on master). Every other fix lands on golden: " +
    "node tools/land.mjs land <branch>";

/**
 * Checks the reason a cut fix gives against GitHub: an open issue labelled priority:critical (a red
 * master's alarm) or titled "Release held", or a failed run of release.yml, deploy-pages.yml or of
 * ci.yml on master. One REST call.
 * @param ctx the run's context
 * @param reason the --reason value: "<issue>", "#<issue>" or "run:<id>"
 * @returns `{ ok }` naming what was found, or `{ error }`
 */
export function cutFixReason(ctx, reason) {
    if (!reason) return { error: CUT_FIX_USAGE };
    const run = /^run:(\d+)$/.exec(reason);
    const issue = /^#?(\d+)$/.exec(reason);
    if (!run && !issue) return { error: `--reason ${reason} names neither an issue nor run:<id>; ${CUT_FIX_USAGE}` };
    try {
        return run ? failedRun(ctx, run[1]) : alarmIssue(ctx, issue[1]);
    } catch (e) {
        return { error: `could not check --reason ${reason}: ${e.message}` };
    }
}

function alarmIssue(ctx, n) {
    const i = JSON.parse(ctx.gh(ctx, ["api", `repos/{owner}/{repo}/issues/${n}`]) || "{}");
    const critical = (i.labels ?? []).some((l) => l.name === "priority:critical");
    if (i.state === "open" && (critical || /^Release held/.test(i.title ?? "")))
        return { ok: `issue #${n}: ${i.title}` };
    return { error: `issue #${n} is not an open priority:critical or "Release held" issue; ${CUT_FIX_USAGE}` };
}

function failedRun(ctx, id) {
    const r = JSON.parse(ctx.gh(ctx, ["api", `repos/{owner}/{repo}/actions/runs/${id}`]) || "{}");
    const path = r.path ?? "";
    const lane = /\/(release|deploy-pages)\.yml$/.test(path) || (/\/ci\.yml$/.test(path) && r.head_branch === "master");
    if (FAILED.has(r.conclusion) && lane) return { ok: `run ${id}: ${path} ${r.conclusion}` };
    return {
        error: `run ${id} (${path || "unknown"}, ${r.conclusion ?? "not finished"}) is not a failed release, deploy or master run; ${CUT_FIX_USAGE}`,
    };
}

/**
 * Merges a fix the cut needs into golden-cut and pushes it through the gate (measured from master), then
 * refreshes the cut pull request and starts its preview of the pushed head. The caller then lands the same
 * branch on golden, so both branches hold the same commits.
 * @param ctx the run's context
 * @param branch the fix, started from origin/golden-cut
 * @param [opts] `reason`: the --reason value, checked by cutFixReason; `dryRun`: merge, report, undo, push nothing
 * @returns the exit code: 0 done (or already on golden-cut), 1 refused, 2 a conflict, 3 the gate refused it
 */
export async function cutFix(ctx, branch, opts = {}) {
    const reason = cutFixReason(ctx, opts.reason);
    if (reason.error) return fail(`${branch} is not a cut fix: ${reason.error}`);
    console.log(`land: cut fix for ${reason.ok}`);
    git(ctx, ctx.main, ["fetch", "-q", "origin"]);
    const ref = branchRef(ctx, branch);
    if (!ref) return fail(`no branch ${branch} here or on origin`);
    const cutRef = `origin/${CUT}`;
    if (hasRef(ctx, ctx.main, cutRef).status !== 0) return fail(`there is no ${CUT} on GitHub; cut first`);
    if (git(ctx, ctx.main, ["merge-base", "--is-ancestor", ref, cutRef], { ok: true }).status === 0) {
        console.log(`land: ${branch} is already on ${CUT}`);
        return 0;
    }
    const frozen = frozenCut(ctx);
    if (frozen) return fail(`${branch} cannot go into the cut now: ${frozen}`);
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
        if (opts.dryRun) {
            git(ctx, ctx.cut, ["reset", "-q", "--hard", before]);
            console.log(`land: dry run: ${branch} merges into ${CUT}; nothing pushed`);
            return 0;
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
        if (pr) previewCut(ctx, pr);
    } catch (e) {
        console.error(`land: the cut pull request was not updated: ${e.message}`);
    }
    await requestVerify(ctx, head, CUT);
    console.log(`land: ${branch} is on ${CUT} (${head.slice(0, 10)}); now landing it on golden`);
    return 0;
}

/**
 * Prints golden's state: against origin/golden and origin/master, what is landed, the pull request,
 * the lock and the newest preview log.
 * @param ctx the run's context
 * @returns the exit code
 */
export async function status(ctx) {
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
    console.log(
        lightGate(ctx) === "1"
            ? "gate: light (no test shard, no screenshot; CI verification runs the tests)"
            : "gate: full (the test shards and the screenshots run here)",
    );
    const { describe, verifyContext } = await import("./verify.mjs");
    for (const branch of [GOLDEN, CUT]) {
        const v = verifyContext(ctx.main, { env: ctx.env, branch });
        if (branch === GOLDEN || existsSync(v.stateFile)) console.log(describe(v));
    }
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
    const shipLog = join(ctx.main, "tmp/golden/auto-ship.log");
    if (existsSync(shipLog)) console.log(`auto-ship: ${readFileSync(shipLog, "utf8").trimEnd().split("\n").at(-1)}`);
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
        return [b, n ? `#${n}` : "-", owner, date, ready ? "yes" : "no", trees.get(b) ?? "-"];
    });
    const head = ["branch", "issue", "owner", "last commit", "ready", "worktree"];
    return `open work (branches on GitHub that golden does not have):\n${table([head, ...rows])}${error}`;
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
        // A landing's check: the gate on golden's next commit in a check worktree, sending nothing.
        check: (c, cwd) => defaultPush(c, cwd, `HEAD:refs/heads/${GOLDEN}`, true),
        verify: defaultVerify,
        gh: defaultGh,
        preview: defaultPreview,
        watchPreview: defaultWatchPreview,
        addWorktree: defaultAddWorktree,
        addCutWorktree: defaultAddCutWorktree,
        install: defaultInstall,
        // Golden is retired (#3418): every change reaches master through its own pull request.
        retired: true,
        ...base,
    };
}

const USAGE =
    "usage: node tools/land.mjs land <branch> [<branch> ...] [--dry-run] [--allow-copies <sha>,...] | revert <branch> | cut [<commit>] |" +
    " cut-fix <branch> --reason <issue>|run:<id> [--dry-run] | ship | auto-ship | status | prune-branches [--yes]" +
    " (land, revert, cut and cut-fix also take --priority)";

/**
 * Runs one command under the lock.
 * @param argv the arguments after the script
 * @param [ctx] the context
 * @returns the exit code
 */
export async function main(argv, ctx = context(process.cwd())) {
    const copies = takeOption(argv, "--allow-copies");
    const reason = takeOption(copies.rest, "--reason");
    const allowCopies = copies.value?.split(",").filter(Boolean) ?? [];
    const [command, ...branches] = reason.rest.filter((a) => !a.startsWith("--"));
    const retired = retiredRefusal(ctx, command);
    if (retired) {
        // A refused command still keeps the main checkout on master, so new sessions read the new flow.
        git(ctx, ctx.main, ["fetch", "-q", "origin"], { ok: true });
        updateMainCheckout(ctx);
        return fail(retired);
    }
    const flushing = flushRefusal(ctx, command, argv);
    if (flushing) return fail(flushing);
    const branch = branches[0];
    const dryRun = argv.includes("--dry-run");
    // The priority lane: only for fixes that unblock the pipeline (a red master, a broken golden, a blocked cut).
    const lockOptions = { ...ctx.lockOptions, priority: argv.includes("--priority") };
    const unlocked = UNLOCKED[command];
    if (unlocked) return unlocked(ctx, branch, argv, lockOptions, { reason: reason.value });
    if (!["land", "revert"].includes(command) || !branch) return fail(USAGE);
    if (copies.given && (command !== "land" || branches.length !== 1 || !allowCopies.length)) {
        return fail("--allow-copies takes a comma-separated list of shas and lands exactly one branch");
    }
    // ponytail: --allow-copies (rare, by hand) lands under the lock the old way instead of in the short-lock check.
    if (command === "land" && !dryRun && !allowCopies.length) return landShort(ctx, branches, lockOptions);
    return underLock(ctx, { command, branch: branches.join(" ") }, lockOptions, () => {
        if (command === "revert") return revert(ctx, branch);
        return branches.length > 1 ? landMany(ctx, branches, { dryRun }) : land(ctx, branch, { dryRun, allowCopies });
    });
}

// Golden is retired (design/ci/channels-pipeline-plan.md, issue #3418): nothing lands on golden or golden-cut
// and nothing ships from them. A change reaches master through its own pull request (tools/pr-open.sh);
// revert, status and prune-branches still run, for what golden already holds.
const RETIRED = new Set(["land", "cut", "cut-fix", "ship", "auto-ship", "sync"]);
function retiredRefusal(ctx, command) {
    if (!ctx.retired || !RETIRED.has(command)) return null;
    return (
        `${command} is retired: golden no longer reaches master (#3418). Open a pull request into master ` +
        'instead: tools/pr-open.sh (see "Shipping a change" in CLAUDE.md). Only revert, status and prune-branches run'
    );
}

// The flush of golden to master (design/ci/channels-pipeline-plan.md, step 0): while the main checkout's
// tmp/golden/flush exists, nothing new lands on golden and the sync moves no branch; revert and cut-fix
// still run, and so does the landing on golden that a cut fix makes after its cut (AFTER_CUT_FIX).
const AFTER_CUT_FIX = "--after-cut-fix";
function flushRefusal(ctx, command, argv) {
    const flush = join(ctx.main, "tmp/golden/flush");
    if (!["land", "sync"].includes(command) || argv.includes(AFTER_CUT_FIX) || !existsSync(flush)) return null;
    return `golden is being flushed to master (${flush} exists): no ${command} until the flush ships; only revert and cut-fix run`;
}

/**
 * Takes an option with a value (`--name v` or `--name=v`) out of the command line.
 * @param argv the arguments
 * @param name the option, with its dashes
 * @returns `{ given, value, rest }`: whether it was there, its value (or null) and the other arguments
 */
function takeOption(argv, name) {
    const at = argv.findIndex((a) => a === name || a.startsWith(`${name}=`));
    if (at < 0) return { given: false, value: null, rest: argv };
    const inline = argv[at].includes("=");
    const value = inline ? argv[at].slice(name.length + 1) : argv[at + 1];
    const rest = argv.filter((_, i) => i !== at && (inline || i !== at + 1));
    return { given: true, value: value ?? null, rest };
}

/**
 * Runs work on golden under the landing lock: the golden worktree made if needed and refused when it
 * has uncommitted changes, golden put back and the lock freed on any exit or signal.
 * @param ctx the run's context
 * @param info what the lock records about this holder
 * @param lockOptions the lock's options
 * @param work the work, a function returning the exit code
 * @returns the exit code
 */
async function underLock(ctx, info, lockOptions, work) {
    const release = await acquireLock(ctx.lock, info, lockOptions);
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
        return await work();
    } finally {
        cleanup(ctx);
    }
}

// The commands that do not take the landing lock (cut and cut-fix take the cut's own). Ship only marks the
// cut pull request ready: it never waits behind a landing's gate.
const UNLOCKED = {
    status: (ctx) => status(ctx),
    ship: (ctx) => ship(ctx),
    "auto-ship": async (ctx, pr, argv) => {
        if (!argv.includes("--after-preview")) return autoShip(ctx);
        const head = argv.findLast((a) => !a.startsWith("--"));
        return (await previewSettled(ctx, pr, head)) ? autoShip(ctx) : 0;
    },
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
 * @param [opts] `reason`: the --reason value
 * @returns the exit code
 */
async function cutFixThenLand(ctx, branch, argv, lockOptions, opts = {}) {
    if (!branch) return fail(USAGE);
    const code = await cutLocked(ctx, branch, lockOptions, cutFix, { ...opts, dryRun: argv.includes("--dry-run") });
    // The same branch, the same commits, on golden: a landing like any other, even during a flush.
    const passOn = argv.filter((a) => a === "--priority" || a === "--dry-run");
    return code === 0 ? main(["land", branch, AFTER_CUT_FIX, ...passOn], ctx) : code;
}

// The cut (or a cut fix) under its own lock: its push runs the gate without holding up landings.
async function cutLocked(ctx, given, lockOptions, run = cut, opts = {}) {
    const command = run === cut ? "cut" : "cut-fix";
    const release = await acquireLock(ctx.cutLock, { command, branch: given ?? "" }, lockOptions);
    try {
        return await run(ctx, given, opts);
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
 * @param [self] the script that is running (tools/verify.mjs hands off to the live copy's verify.mjs)
 * @returns the live copy's exit code, or null when this copy should run itself
 */
export async function handOff(argv, env = process.env, self = fileURLToPath(import.meta.url)) {
    if (env[LIVE_MARK]) {
        delete env[LIVE_MARK];
        return null;
    }
    const landLive = liveCopy(env);
    const live = landLive && join(dirname(landLive), basename(self));
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
    // Not a top-level await: land.mjs must finish loading before main runs, or the dynamic import of
    // verify.mjs (which imports land.mjs) waits on it forever and node exits with nothing done.
    const run = async () => {
        process.exitCode = (await handOff(argv)) ?? (await main(argv));
    };
    run(); // NOSONAR(S7785): a top-level await here deadlocks the import of verify.mjs
}
