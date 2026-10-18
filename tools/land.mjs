#!/usr/bin/env node
// Lands finished branches on `golden`, the integration branch, and ships golden to master through one
// standing pull request. Design: design/ci/golden-local.md.
//
//   node tools/land.mjs land <branch> [--dry-run]   merge <branch> into golden, gate it, push it
//   node tools/land.mjs revert <branch>             take a landed branch back out of golden
//   node tools/land.mjs ship                        mark the golden pull request ready, with auto-merge
//   node tools/land.mjs status                      golden, its pull request, the lock, the newest preview
//
// Golden is the local branch `golden` in the worktree <main checkout>/.worktrees/golden-local (made on
// first use), pushed to `golden` on GitHub after every landing. One landing, revert or ship runs at a
// time (a lock in <main checkout>/tmp/golden/); the others wait and say who holds it.
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
// Exit codes: 0 done, 1 refused or failed, 2 the branch conflicts with golden, 3 the gate failed,
// 4 golden could not take origin/golden or origin/master (before the merge, or after a gate it passed).
import { spawn, spawnSync } from "node:child_process";
import {
    closeSync,
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    openSync,
    readdirSync,
    readFileSync,
    renameSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const GOLDEN = "golden";
export const PR_TITLE = "chore: land golden into master";
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
 * Takes the exclusive lock, waiting while another process holds it.
 * ponytail: one lock for every landing, revert and ship; per-branch locks only if landings must overlap.
 * @param dir the lock directory (made with mkdir, which is atomic)
 * @param info what to record about this holder (the command and branch)
 * @param [opts] `pollMs` between looks (15 s); `onWait(owner)` once per holder seen waiting
 * @returns a function that releases it
 */
export async function acquireLock(dir, info, opts = {}) {
    const pollMs = opts.pollMs ?? 15_000;
    const onWait = opts.onWait ?? ((o) => console.log(`land: waiting for the lock, held by ${describeOwner(o)}`));
    mkdirSync(dirname(dir), { recursive: true });
    let seen = "";
    for (;;) {
        try {
            mkdirSync(dir);
            const owner = { ...info, pid: process.pid, host: hostname(), since: new Date().toISOString() };
            writeFileSync(join(dir, "owner.json"), `${JSON.stringify(owner)}\n`);
            return () => {
                if (readLock(dir)?.pid === process.pid) rmSync(dir, { recursive: true, force: true });
            };
        } catch (e) {
            if (e.code !== "EEXIST") throw e;
        }
        const owner = readLock(dir) ?? {};
        if (stale(dir, owner)) {
            // Renamed first, then checked: when another waiter took the stale lock over and made its own
            // in the meantime, the renamed directory is that new holder's, and it is put back.
            // ponytail: a third process taking the lock while it is moved away still slips through.
            const gone = `${dir}.stale-${process.pid}`;
            try {
                renameSync(dir, gone);
            } catch {
                continue; // another waiter took it first
            }
            const moved = readLock(gone) ?? {};
            if (moved.pid !== owner.pid || moved.since !== owner.since) {
                try {
                    renameSync(gone, dir);
                } catch {
                    // the third process above
                }
                continue;
            }
            rmSync(gone, { recursive: true, force: true });
            console.log(`land: took over a stale lock from ${describeOwner(owner)}`);
            continue;
        }
        const key = `${owner.pid}:${owner.since}`;
        if (key !== seen) onWait(owner);
        seen = key;
        await new Promise((r) => setTimeout(r, pollMs));
    }
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

/**
 * The golden pull request's description: each landed branch with its commits, the reverted ones, and
 * the issue references (or the line "No issue", which the Link PR Issue check accepts instead).
 * @param landed `landedBranches()`
 * @returns the description, Markdown
 */
export function prBody(landed) {
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

const commitGit = (ctx, args, opts) =>
    git(ctx, ctx.golden, [...(ctx.hooks ? ["-c", `core.hooksPath=${ctx.hooks}`] : []), ...args], opts);

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
    const r = spawnSync(join(ctx.main, "tools/worktree-new.sh"), [GOLDEN, base, "golden-local"], {
        cwd: ctx.main,
        env: ctx.env,
        stdio: "inherit",
    });
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
    const r = spawnSync("pnpm", ["install", "--frozen-lockfile"], { cwd: ctx.golden, env: ctx.env, stdio: "inherit" });
    if (r.status !== 0) throw new Error("pnpm install --frozen-lockfile failed in the golden worktree");
    markInstalled(ctx);
}

/**
 * Brings golden up to origin/golden (the owner's accept commits) and origin/master (release merges,
 * the merged golden pull request). On a conflict golden is put back as it was.
 * @param ctx the run's context
 * @returns null when synced, else `{ ref, files, error }`: what conflicted, or git's message when nothing did
 */
export function sync(ctx) {
    git(ctx, ctx.golden, ["fetch", "-q", "origin"]);
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

const conflicted = (ctx) =>
    git(ctx, ctx.golden, ["diff", "--name-only", "--diff-filter=U"], { ok: true }).stdout.split("\n").filter(Boolean);

// ---------------------------------------------------------------- GitHub and the gate

/**
 * Pushes golden through the push queue, which runs the full pre-push gate.
 * @param ctx the run's context
 * @returns `{ code, output }`
 */
function defaultPush(ctx) {
    // Measured from master: everything on golden that master does not have yet is this push's change.
    const env = { ...ctx.env, PUSH_BASE_REF: "origin/master" };
    const child = spawn(join(ctx.golden, "tools/push-queue.sh"), ["git", "push", "origin", `${GOLDEN}:${GOLDEN}`], {
        cwd: ctx.golden,
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
    const r = spawnSync("gh", args, { cwd: ctx.golden, env: ctx.env, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`gh ${args.slice(0, 2).join(" ")} failed: ${r.stderr?.trim() || r.error}`);
    return r.stdout.trim();
}

/**
 * Starts tools/visual-preview.sh for the golden pull request, detached, unless the gate already
 * captured this head for it.
 * @param ctx the run's context
 * @param pr the golden pull request's number
 */
function defaultPreview(ctx, pr) {
    const head = git(ctx, ctx.golden, ["rev-parse", "HEAD"]);
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
    spawn("setsid", [join(ctx.golden, "tools/visual-preview.sh"), String(pr)], {
        cwd: ctx.golden,
        env: ctx.env,
        detached: true,
        stdio: ["ignore", fd, fd],
    }).unref();
    closeSync(fd);
    console.log(`land: screenshots of #${pr} are being captured for the review page (log: ${log})`);
}

/**
 * The open golden -> master pull request, from GitHub (one call).
 * @param ctx the run's context
 * @returns `{ number, isDraft, url }` or null
 */
function goldenPr(ctx) {
    const out = ctx.gh(ctx, [
        "pr",
        "list",
        "--head",
        GOLDEN,
        "--base",
        "master",
        "--state",
        "open",
        "--json",
        "number,isDraft,url",
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
    const body = prBody(landedBranches(ctx, ctx.golden));
    const file = join(ctx.main, "tmp/golden/pr-body.md");
    writeFileSync(file, body);
    const pr = goldenPr(ctx);
    if (pr) {
        ctx.gh(ctx, ["pr", "edit", String(pr.number), "--body-file", file]);
        return pr.number;
    }
    const url = ctx.gh(ctx, [
        "pr",
        "create",
        "--draft",
        "--base",
        "master",
        "--head",
        GOLDEN,
        "--title",
        PR_TITLE,
        "--body-file",
        file,
    ]);
    const n = /\/pull\/(\d+)/.exec(url)?.[1];
    if (n) console.log(`land: opened the golden pull request ${url}`);
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
 * Whether a failed push was GitHub refusing it because golden moved there (the owner's Finish pushes
 * accept commits to golden), rather than the gate refusing it.
 * @param ctx the run's context
 * @param output what the push printed
 * @returns true when origin/golden has commits golden does not
 */
function goldenMoved(ctx, output) {
    if (!/\[(remote )?rejected\]|non-fast-forward|fetch first/.test(output)) return false;
    git(ctx, ctx.golden, ["fetch", "-q", "origin"], { ok: true });
    const ref = `origin/${GOLDEN}`;
    if (hasRef(ctx, ctx.golden, ref).status !== 0) return false;
    return git(ctx, ctx.golden, ["merge-base", "--is-ancestor", ref, "HEAD"], { ok: true }).status !== 0;
}

/**
 * Pushes golden and, on success, refreshes the pull request and its preview. When GitHub's golden
 * moved during the gate, merges it and pushes again (the gate skips the shards it already passed). On a
 * failure golden is reset to `before` (it was never pushed).
 * @param ctx the run's context
 * @param before golden's commit to go back to on a failure
 * @returns the exit code
 */
async function publish(ctx, before) {
    ctx.rollback = before;
    let sha;
    for (let tries = 1; ; tries++) {
        sha = git(ctx, ctx.golden, ["rev-parse", "HEAD"]);
        const { code, output } = await ctx.push(ctx);
        if (code === 0) break;
        const moved = goldenMoved(ctx, output);
        if (moved && tries < 3) {
            console.log("land: golden moved on GitHub during the gate; merging origin/golden and pushing again");
            if (commitGit(ctx, ["merge", "--no-edit", `origin/${GOLDEN}`], { ok: true }).status === 0) continue;
            git(ctx, ctx.golden, ["merge", "--abort"], { ok: true });
        }
        ctx.rollback = null;
        git(ctx, ctx.golden, ["reset", "-q", "--hard", before]);
        if (moved) {
            console.error(
                `land: golden moved on GitHub and could not be merged and pushed again; golden is back at ${before.slice(0, 10)}.\n` +
                    "Nothing is wrong with the branch: land it again.",
            );
            return 4;
        }
        console.error(`land: the gate refused golden; golden is back at ${before.slice(0, 10)}.`);
        console.error(`land: gate log: ${gateLog(ctx, sha, output)}`);
        return 3;
    }
    ctx.rollback = null;
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
    return 0;
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
    const ref = [`refs/heads/${branch}`, `refs/remotes/origin/${branch}`].find(
        (r) => hasRef(ctx, ctx.golden, r).status === 0,
    );
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
 * Offers golden to master: marks the pull request ready and turns on auto-merge, so CI runs on it
 * once and GitHub merges it when the required checks pass.
 * @param ctx the run's context
 * @returns the exit code
 */
export async function ship(ctx) {
    git(ctx, ctx.golden, ["fetch", "-q", "origin"]);
    if (hasRef(ctx, ctx.golden, `origin/${GOLDEN}`).status !== 0) return fail("nothing is on GitHub's golden yet");
    // Picks up the owner's accept commits; anything golden has that GitHub does not must land first.
    git(ctx, ctx.golden, ["merge", "-q", "--ff-only", `origin/${GOLDEN}`], { ok: true });
    const local = git(ctx, ctx.golden, ["rev-parse", "HEAD"]);
    if (local !== git(ctx, ctx.golden, ["rev-parse", `origin/${GOLDEN}`])) {
        return fail("local golden and origin/golden differ; land (or reset) first so GitHub has what ships");
    }
    const pr = goldenPr(ctx);
    if (!pr) return fail("there is no open golden pull request; land something first");
    ctx.gh(ctx, ["pr", "ready", String(pr.number)]);
    ctx.gh(ctx, ["pr", "merge", String(pr.number), "--auto", "--merge"]);
    console.log(
        `land: #${pr.number} is ready with auto-merge on (${pr.url}).\n` +
            "CI (ci.yml) now runs the affected suite on it once, on clean machines, and the visual gate checks\n" +
            "CI's screenshots against the owner's approvals. When All Checks Pass and Lint PR Title are green,\n" +
            "GitHub merges it into master with a merge commit. If CI fails, find the culprit from the failure,\n" +
            "`node tools/land.mjs revert <branch>` it (or land a fix), and `gh pr ready --undo` while you do.",
    );
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
    return 0;
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
        lock: join(main, "tmp/golden/lock"),
        push: defaultPush,
        gh: defaultGh,
        preview: defaultPreview,
        addWorktree: defaultAddWorktree,
        ...base,
    };
}

const USAGE = "usage: node tools/land.mjs land <branch> [--dry-run] | revert <branch> | ship | status";

/**
 * Runs one command under the lock.
 * @param argv the arguments after the script
 * @param [ctx] the context
 * @returns the exit code
 */
export async function main(argv, ctx = context(process.cwd())) {
    const [command, branch] = argv.filter((a) => !a.startsWith("--"));
    const dryRun = argv.includes("--dry-run");
    if (command === "status") return status(ctx);
    if (!["land", "revert", "ship"].includes(command) || (command !== "ship" && !branch)) return fail(USAGE);
    const release = await acquireLock(ctx.lock, { command, branch }, ctx.lockOptions);
    const onInt = onSignal(ctx, "SIGINT", 130);
    const onTerm = onSignal(ctx, "SIGTERM", 143);
    ctx.release = () => {
        process.off("SIGINT", onInt).off("SIGTERM", onTerm);
        release();
    };
    process.once("SIGINT", onInt).once("SIGTERM", onTerm);
    try {
        ensureGolden(ctx);
        if (git(ctx, ctx.golden, ["status", "--porcelain", "--untracked-files=no"])) {
            return fail(`the golden worktree ${ctx.golden} has uncommitted changes; nothing was done`);
        }
        ctx.hooks = hooksDir(ctx);
        if (command === "land") return await land(ctx, branch, { dryRun });
        if (command === "revert") return await revert(ctx, branch);
        return await ship(ctx);
    } finally {
        cleanup(ctx);
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    process.exitCode = await main(process.argv.slice(2));
}
