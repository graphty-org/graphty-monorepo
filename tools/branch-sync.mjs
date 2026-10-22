// The nightly branch sync: merges golden into every branch in progress, so a long-running branch never
// drifts weeks behind (design: design/ci/branch-sync.md). Run through tools/land.mjs:
//
//   node tools/land.mjs sync [--branch <b>] [--dry-run] [--if-due] [--active-days N]
//
// It merges from the tag `golden-good` on origin: the newest golden commit that verification passed and whose
// screenshot preview has no unstable or failed images (the test `land.mjs cut` uses). land.mjs moves the
// tag forward after a landing and at the start of every sync, never back.
//
// Each branch on origin that golden lacks and that has a commit in the last 7 days (--active-days) gets the
// newest landing on golden's first-parent line, at or before golden-good, that merges cleanly into it
// (git merge-tree, in memory) and passes its affected checks on the merge (build, lint and the test shards
// of the packages the branch changes, in the scratch worktree .worktrees/branch-sync, at the lowest
// priority). When the newest fails, a binary search over the landings finds the newest that passes. The
// merge is a signed merge commit pushed to the branch on origin (a fast-forward of it; the owner's worktree
// is never touched: tools/branch-push.sh merges it there at the next commit). The result goes in the
// branch's progress note (tools/branch-note.mjs) as its `sync` line, which `land.mjs status` shows: synced
// up to a landing, or blocked at one by a conflict or a failing check. A new block is also commented on
// the branch's issue for its owner. The sync never resolves a conflict.
//
// A branch marked busy (`branch-note.mjs busy`) gets only the conflict check. Branches with no commit in
// the active window are stale: not synced, listed by `land.mjs status`, and once a week their issues are
// asked to land, close or park them. Nothing is ever deleted.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { busyNow, findNote, issueInName, parseNote, readIssues, writeNote } from "./branch-note.mjs";
import { git, GOLDEN, newestStableCut, NOT_WORK, readLock, tryLock } from "./land.mjs";

export const GOOD_TAG = "golden-good";
export const ACTIVE_DAYS = 7;
const LAND_SUBJECT = /^land: \S+$/;
const DAY = 86400e3;
const short = (sha) => sha.slice(0, 10);

// ---------------------------------------------------------------- golden-good

const tagSha = (ctx) =>
    git(ctx, ctx.main, ["rev-parse", "-q", "--verify", `refs/tags/${GOOD_TAG}^{commit}`], { ok: true }).stdout || null;
const isAncestor = (ctx, a, b) => git(ctx, ctx.main, ["merge-base", "--is-ancestor", a, b], { ok: true }).status === 0;

/**
 * Moves golden-good on origin forward to the newest verified golden commit with a stable screenshot preview (every
 * one passed the full gate after landing). Never moves it back or sideways.
 * @param ctx the land.mjs context
 * @param [opts] `dryRun`: work it out, push nothing
 * @returns the commit golden-good is (or would be) at, or null when there is none yet
 */
export function moveGoldenGood(ctx, opts = {}) {
    git(ctx, ctx.main, ["fetch", "-q", "origin", `+refs/tags/${GOOD_TAG}:refs/tags/${GOOD_TAG}`], { ok: true });
    const current = tagSha(ctx);
    const newest = newestStableCut(ctx);
    if (!newest || newest === current || (current && isAncestor(ctx, newest, current))) return current;
    if (current && !isAncestor(ctx, current, newest)) return current;
    if (opts.dryRun) return newest;
    git(ctx, ctx.main, ["push", "--no-verify", "-q", "origin", `+${newest}:refs/tags/${GOOD_TAG}`]);
    git(ctx, ctx.main, ["tag", "-f", GOOD_TAG, newest]);
    console.log(`sync: ${GOOD_TAG} is now ${short(newest)}`);
    return newest;
}

// ---------------------------------------------------------------- one branch

/**
 * The landings a branch could be synced to, newest first: golden-good itself, then each "land: <branch>"
 * merge on golden's first-parent line before it, down to the newest one the branch already holds.
 * @param ctx the land.mjs context
 * @param good golden-good's commit
 * @param tip the branch's tip
 * @returns `[{ sha, subject }]`, empty when the branch already holds golden-good
 */
export function landings(ctx, good, tip) {
    const out = git(ctx, ctx.main, ["log", "--first-parent", "--format=%H%x00%s", good, `^${tip}`]);
    return out
        .split("\n")
        .filter(Boolean)
        .map((l) => l.split("\0"))
        .filter(([sha, subject]) => sha === good || LAND_SUBJECT.test(subject))
        .map(([sha, subject]) => ({ sha, subject }));
}

/**
 * Merges a landing into a branch in memory.
 * @param ctx the land.mjs context
 * @param tip the branch's tip
 * @param landing the landing's commit
 * @returns `{ tree }` when it merges cleanly, else `{ files }`: the conflicted paths
 */
export function mergeInMemory(ctx, tip, landing) {
    const r = git(ctx, ctx.main, ["merge-tree", "--write-tree", "--name-only", "--no-messages", tip, landing], {
        ok: true,
    });
    const [tree, ...files] = r.stdout.split("\n").filter(Boolean);
    if (r.status === 0) return { tree };
    if (r.status === 1) return { files };
    throw new Error(`git merge-tree ${short(tip)} ${short(landing)} failed: ${r.stderr}`);
}

/**
 * The first index in [from, n) for which `ok` holds, given that it fails for a run of the newest landings
 * and holds for every older one: `from` first (usually the answer), then a binary search.
 * @param from the newest index to try
 * @param n how many landings
 * @param ok an async predicate of an index
 * @returns the index, or n when none passes
 */
export async function newestPassing(from, n, ok) {
    if (from >= n || (await ok(from))) return from;
    let lo = from + 1;
    let hi = n;
    while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (await ok(mid)) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

const describeLanding = (l) => `${short(l.sha)} (${l.subject})`;
const conflictIn = (files) => {
    const more = files.length > 5 ? ` and ${files.length - 5} more` : "";
    return `a conflict in ${files.slice(0, 5).join(", ")}${more}`;
};

/**
 * Syncs one branch: finds the newest landing that merges and passes, pushes the merge.
 * @param ctx the land.mjs context
 * @param b `{ name, tip, busy }` (busy: the note's busy marker, or null)
 * @param good golden-good's commit
 * @param [opts] `dryRun`
 * @returns `{ state, line, blocked? }`: state is "current", "synced", "blocked", "busy", "moved" or "would sync"
 */
export async function syncBranch(ctx, b, good, opts = {}) {
    if (git(ctx, ctx.main, ["merge-base", good, b.tip], { ok: true }).status !== 0) {
        return { state: "unrelated", line: "not synced: it shares no history with golden" };
    }
    const list = landings(ctx, good, b.tip);
    if (!list.length) return { state: "current", line: `up to date with ${GOOD_TAG} ${short(good)}` };
    const merges = new Map();
    const merge = (i) => merges.get(i) ?? merges.set(i, mergeInMemory(ctx, b.tip, list[i].sha)).get(i);
    const clean = await newestPassing(0, list.length, (i) => merge(i).tree !== undefined);
    const why = new Map(); // index -> what failed there
    for (const [i, m] of merges) if (m.files) why.set(i, conflictIn(m.files));
    if (b.busy) return busyResult(list, clean, why);
    if (opts.dryRun) return dryRunResult(ctx, b, list, clean, why, good);
    const passing = await newestPassing(clean, list.length, async (i) => {
        const m = merge(i);
        if (!m.tree) {
            why.set(i, conflictIn(m.files));
            return false;
        }
        const sha = commitMerge(ctx, b, list[i], m.tree, false);
        await waitForLandings(ctx);
        const r = await ctx.syncCheck(ctx, { sha, base: list[i].sha, branch: b.name });
        if (!r.ok) why.set(i, `a failing check ${r.what}`);
        return r.ok;
    });
    const block = passing > 0 ? { landing: list[passing - 1], why: why.get(passing - 1) } : null;
    const blocked = block && `blocked at ${describeLanding(block.landing)} by ${block.why}`;
    if (passing === list.length) return { state: "blocked", line: `${blocked}; nothing merged`, blocked };
    const sha = commitMerge(ctx, b, list[passing], merge(passing).tree, true);
    const pushed = git(ctx, ctx.main, ["push", "--no-verify", "-q", "origin", `${sha}:refs/heads/${b.name}`], {
        ok: true,
    });
    if (pushed.status !== 0) {
        return {
            state: "moved",
            line: `not synced: the branch moved during the sync (${pushed.stderr.split("\n")[0]})`,
        };
    }
    const synced = `synced up to ${describeLanding(list[passing])}`;
    return blocked ? { state: "blocked", line: `${synced}; ${blocked}`, blocked } : { state: "synced", line: synced };
}

function busyResult(list, clean, why) {
    if (clean === 0)
        return { state: "busy", line: `busy, not synced; merges cleanly with ${describeLanding(list[0])}` };
    const blocked = `blocked at ${describeLanding(list[clean - 1])} by ${why.get(clean - 1)}`;
    return { state: "busy", line: `busy, not synced; ${blocked}`, blocked };
}

function dryRunResult(ctx, b, list, clean, why, good) {
    const range = `${good}...${b.tip}`;
    const changed = git(ctx, ctx.main, ["diff", "--name-only", range]).split("\n").filter(Boolean);
    const dirs = [...new Set(changed.map((f) => (f.includes("/") ? f.split("/")[0] : "(root)")))];
    const checks = `then the checks of what it changes (${dirs.join(", ") || "no files"}), and push a signed merge`;
    const blocked = clean > 0 ? `; blocked at ${describeLanding(list[clean - 1])} by ${why.get(clean - 1)}` : "";
    if (clean === list.length) return { state: "would sync", line: `would merge nothing${blocked}` };
    return {
        state: "would sync",
        line: `${list.length} landing(s) behind; would merge ${describeLanding(list[clean])}, ${checks}${blocked}`,
    };
}

/**
 * A merge commit of the branch's tip and a landing, from the tree merge-tree wrote: no worktree, no rebase.
 * @param ctx the land.mjs context
 * @param b the branch
 * @param landing the landing
 * @param tree the merged tree
 * @param sign sign it (the one that is pushed) when this repository signs commits (commit.gpgSign, which
 * commit-tree does not read itself); a merge only checked is never signed
 * @returns its sha
 */
function commitMerge(ctx, b, landing, tree, sign) {
    sign &&= git(ctx, ctx.main, ["config", "--bool", "commit.gpgSign"], { ok: true }).stdout === "true";
    const message =
        `Merge golden at ${short(landing.sha)} into ${b.name}\n\n` +
        `The nightly branch sync (tools/branch-sync.mjs): golden up to "${landing.subject}".`;
    const args = ["commit-tree", ...(sign ? ["-S"] : []), "-p", b.tip, "-p", landing.sha, "-m", message, tree];
    return git(ctx, ctx.main, args);
}

/**
 * Waits while a landing holds the landing lock: a landing always goes first.
 * @param ctx the land.mjs context (`lock`, `syncPollMs`)
 */
async function waitForLandings(ctx) {
    for (let said = false; ; said = true) {
        const owner = readLock(ctx.lock);
        if (!owner?.pid || !alive(owner.pid)) return;
        if (!said) console.log(`sync: waiting for the landing (pid ${owner.pid}) to finish first`);
        await new Promise((r) => setTimeout(r, ctx.syncPollMs ?? 60_000));
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

// ---------------------------------------------------------------- the checks

/**
 * The branch's affected checks on a merge, in the scratch worktree <main>/.worktrees/branch-sync: install,
 * build, lint and the CI test shards of the affected packages (tools/prepush-tests.mjs, the gate's own test
 * stage, from the gate's live copy when there is one), all under `nice -n 19`, with the test and browser slots
 * in their low-priority lanes. Logs go to <main>/tmp/branch-sync/.
 * @param ctx the land.mjs context
 * @param job `{ sha, base, branch }`: the merge to check and the landing it merged (the affected base)
 * @returns `{ ok, what? }`: what names the failed step, or the shard and test
 */
export function defaultCheck(ctx, job) {
    const dir = join(ctx.main, ".worktrees/branch-sync");
    if (existsSync(dir)) {
        if (git(ctx, dir, ["status", "--porcelain", "--untracked-files=no"])) {
            return { ok: false, what: `(the scratch worktree ${dir} has uncommitted changes)` };
        }
        git(ctx, dir, ["switch", "-q", "--detach", job.sha]);
    } else {
        git(ctx, ctx.main, ["worktree", "add", "-q", "--detach", dir, job.sha]);
        if (existsSync(join(ctx.main, ".env"))) symlinkSync(join(ctx.main, ".env"), join(dir, ".env"));
    }
    const logDir = join(ctx.main, "tmp/branch-sync");
    mkdirSync(logDir, { recursive: true });
    const log = join(logDir, `${job.branch.replaceAll("/", "-")}.log`);
    writeFileSync(log, `${new Date().toISOString()} checks of ${job.sha} (merge of ${job.base})\n`);
    const env = { ...ctx.env, GRAPHTY_SLOT_PRIORITY: "low", BROWSER_SLOT_PRIORITY: "low", NX_DAEMON: "false" };
    const step = (cmd, extra = {}) => {
        appendFileSync(log, `\n$ ${cmd}\n`);
        const r = spawnSync("nice", ["-n", "19", "bash", "-c", cmd], {
            cwd: dir,
            env: { ...env, ...extra },
            encoding: "utf8",
            maxBuffer: 256 * 1024 * 1024,
        });
        appendFileSync(log, `${r.stdout ?? ""}${r.stderr ?? ""}\nexit ${r.status}\n`);
        return { status: r.status, out: r.stdout ?? "" };
    };
    if (step("pnpm install --frozen-lockfile").status !== 0) return { ok: false, what: `install (log: ${log})` };
    const shown = step(`pnpm exec nx show projects --affected --base=${job.base} --head=HEAD --json`);
    const projects = shown.status === 0 ? JSON.parse(shown.out.trim().split("\n").pop() || "null") : null;
    if (!Array.isArray(projects)) return { ok: false, what: `nx show projects (log: ${log})` };
    if (!projects.length) return { ok: true };
    const list = projects.join(",");
    if (step(`pnpm exec nx run-many -t build --projects=${list} --parallel=3`).status !== 0) {
        return { ok: false, what: `build (log: ${log})` };
    }
    if (projects.includes("webgpu-graph-algorithms")) step("cd webgpu-graph-algorithms && npm run build:bundle");
    const lint = `pnpm exec nx run-many -t lint --projects=${list} --parallel=3 --exclude-task-dependencies`;
    if (step(lint).status !== 0) return { ok: false, what: `lint (log: ${log})` };
    const live = join(ctx.main, ".worktrees/gate-live/tools/prepush-tests.mjs");
    const runner = existsSync(live) ? live : "tools/prepush-tests.mjs";
    const tests = step(`node '${runner}' '${JSON.stringify(projects)}' '${job.base}'`, { PREPUSH_ROOT: dir });
    if (tests.status === 0) return { ok: true };
    return { ok: false, what: `${failedTest(tests.out)} (log: ${log})` };
}

/**
 * The failing shard and test in prepush-tests.mjs's output.
 * @param out its output
 * @returns "<shard>: <test>", or "<shard>", or "tests"
 */
export function failedTest(out) {
    const shard = /\[FAIL\] (\S+)/.exec(out)?.[1];
    // vitest marks a failed test "FAIL" or with a multiplication sign.
    const line = out
        .split("\n")
        .map((l) => l.trim())
        .find((l) => /^(FAIL|\u00d7) /.test(l));
    const test = line?.replace(/^\S+ +/, "");
    return [shard, test].filter(Boolean).join(": ") || "tests";
}

// ---------------------------------------------------------------- every branch

/**
 * The branches on origin that golden lacks, with their tips and last commit times, newest first.
 * @param ctx the land.mjs context
 * @returns `[{ name, tip, time }]` (time in ms)
 */
export function openBranches(ctx) {
    return git(ctx, ctx.main, [
        "for-each-ref",
        `--no-merged=origin/${GOLDEN}`,
        "--sort=-committerdate",
        "--format=%(refname:lstrip=3)%00%(objectname)%00%(committerdate:unix)",
        "refs/remotes/origin",
    ])
        .split("\n")
        .filter(Boolean)
        .map((l) => l.split("\0"))
        .filter(([name]) => !NOT_WORK.test(name))
        .map(([name, tip, time]) => ({ name, tip, time: Number(time) * 1000 }));
}

/**
 * A branch's issue: its `branch.<b>.issue` setting, else the number in its name.
 * @param ctx the land.mjs context
 * @param name the branch
 * @returns the number, or null
 */
export function issueOf(ctx, name) {
    const set = git(ctx, ctx.main, ["config", `branch.${name}.issue`], { ok: true }).stdout;
    return set ? Number(set) : issueInName(name);
}

/**
 * Whether a nightly sync is due: none started today (local time), and it is 01:00 or later.
 * @param ctx the land.mjs context
 * @param [now] the time
 * @returns true when due
 */
export function syncDue(ctx, now = new Date()) {
    const last = readStamp(ctx, "last-run");
    const today = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return now.getHours() >= 1 && (!last || today(new Date(last)) !== today(now));
}

const stampFile = (ctx, name) => join(ctx.main, "tmp/branch-sync", name);
function readStamp(ctx, name) {
    try {
        return Number(readFileSync(stampFile(ctx, name), "utf8"));
    } catch {
        return 0;
    }
}
function writeStamp(ctx, name, now) {
    mkdirSync(join(ctx.main, "tmp/branch-sync"), { recursive: true });
    writeFileSync(stampFile(ctx, name), String(now));
}

/**
 * `land.mjs sync`: syncs every active branch, or the one given.
 * @param ctx the land.mjs context (`check` runs a merge's checks; tests replace it)
 * @param [opts] `branch`, `dryRun`, `ifDue`, `activeDays`, `now` (ms)
 * @returns the exit code: 0 done (whatever each branch's state), 1 refused
 */
export async function syncAll(ctx, opts = {}) {
    const now = opts.now ?? Date.now();
    if (opts.ifDue && !syncDue(ctx, new Date(now))) return 0;
    const lock = join(ctx.main, "tmp/golden/sync-lock");
    mkdirSync(join(ctx.main, "tmp/golden"), { recursive: true });
    const held = readLock(lock);
    if (held?.pid && alive(held.pid)) {
        console.log(`sync: a sync is already running (pid ${held.pid}); nothing to do`);
        return 0;
    }
    // A lock whose holder is gone is taken over.
    if (held) rmSync(lock, { recursive: true, force: true });
    const release = tryLock(lock, { command: "sync" });
    if (!release) return 0;
    try {
        if (!opts.dryRun) writeStamp(ctx, "last-run", now);
        return await syncLocked(ctx, opts, now);
    } finally {
        release();
    }
}

async function syncLocked(ctx, opts, now) {
    git(ctx, ctx.main, ["fetch", "-q", "--prune", "origin"]);
    const good = moveGoldenGood(ctx, opts);
    if (!good) {
        console.log(`sync: there is no ${GOOD_TAG} yet (no golden commit has a stable preview); nothing to sync`);
        return 0;
    }
    const days = opts.activeDays ?? ACTIVE_DAYS;
    const all = openBranches(ctx);
    if (opts.branch && !all.some((b) => b.name === opts.branch)) {
        console.error(`sync: ${opts.branch} is not a branch on origin that golden lacks`);
        return 1;
    }
    const active = all.filter((b) => (opts.branch ? b.name === opts.branch : now - b.time < days * DAY));
    const stale = opts.branch ? [] : all.filter((b) => now - b.time >= days * DAY);
    console.log(
        `sync: ${GOOD_TAG} is ${short(good)}; ${active.length} active branch(es), ${stale.length} stale` +
            (opts.dryRun ? " (dry run: no checks, no push, no notes)" : ""),
    );
    const notes = readNotes(ctx, [...active, ...stale]);
    const issues = notes ?? new Map();
    for (const b of active) {
        const issue = issues.get(issueOf(ctx, b.name));
        const fields = parseNote(findNote(issue, b.name)?.body);
        // Without the notes a busy marker cannot be seen, so that night every branch is treated as busy.
        const busy = notes ? busyNow(fields, now) : { reason: "the notes could not be read" };
        let result;
        try {
            result = await syncBranch(ctx, { ...b, busy }, good, opts);
        } catch (e) {
            result = { state: "error", line: `not synced: ${e.message.split("\n")[0]}` };
        }
        const day = new Date(now).toISOString().slice(0, 10);
        console.log(`  ${b.name}: ${result.line}`);
        if (!opts.dryRun) record(ctx, b, issue, fields, { ...result, line: `${result.line} (${day})` });
    }
    if (!opts.dryRun && stale.length) askStale(ctx, stale, issues, now);
    return 0;
}

function readNotes(ctx, branches) {
    try {
        return readIssues(
            (args) => ctx.gh(ctx, args),
            branches.map((b) => issueOf(ctx, b.name)),
        );
    } catch (e) {
        console.error(`sync: the branches' notes could not be read (${e.message}); only conflict checks tonight`);
        return null;
    }
}

/**
 * Writes the result into the branch's note, and tells its owner on the issue when it is newly blocked.
 * @param ctx the land.mjs context
 * @param b the branch
 * @param issue its issue (readIssues), or undefined
 * @param fields its note's fields before this sync
 * @param result syncBranch's result, its line dated
 */
function record(ctx, b, issue, fields, result) {
    if (!issue) return;
    const run = (args) => ctx.gh(ctx, args);
    try {
        writeNote(run, issue.number, b.name, { sync: result.line });
        if (result.blocked && !fields.sync?.includes(result.blocked)) {
            const body =
                `pipeline-round: sync blocked ${b.name} -- ${result.blocked}. The nightly branch sync never resolves ` +
                `conflicts or fixes checks: merge golden up to that landing in the branch's worktree ` +
                `(\`git fetch origin && git merge ${result.blocked.split(" ")[2]}\`), fix it and commit.`;
            run(["api", "-X", "POST", `repos/{owner}/{repo}/issues/${issue.number}/comments`, "-f", `body=${body}`]);
        }
    } catch (e) {
        console.error(`sync: the note of ${b.name} was not written: ${e.message}`);
    }
}

/**
 * Once a week, asks each stale branch's issue to land, close or park the branch. Deletes nothing.
 * @param ctx the land.mjs context
 * @param stale the stale branches
 * @param issues their issues
 * @param now the time
 */
function askStale(ctx, stale, issues, now) {
    if (now - readStamp(ctx, "stale-asked") < 7 * DAY) return;
    writeStamp(ctx, "stale-asked", now);
    for (const b of stale) {
        const issue = issues.get(issueOf(ctx, b.name));
        if (!issue || issue.state === "CLOSED") continue;
        const since = new Date(b.time).toISOString().slice(0, 10);
        const body =
            `pipeline-round: stale branch ${b.name} -- no commit since ${since}, so the nightly branch sync skips it. ` +
            'Land it, close it, or park it (say so in its note: `node tools/branch-note.mjs update --next "parked: <why>"`).';
        try {
            ctx.gh(ctx, [
                "api",
                "-X",
                "POST",
                `repos/{owner}/{repo}/issues/${issue.number}/comments`,
                "-f",
                `body=${body}`,
            ]);
        } catch (e) {
            console.error(`sync: could not ask about ${b.name}: ${e.message}`);
        }
    }
}

/**
 * Parses `sync`'s command line and runs it.
 * @param ctx the land.mjs context
 * @param argv the arguments after `sync`'s command name
 * @returns the exit code
 */
export function syncCommand(ctx, argv) {
    const value = (flag) => {
        const i = argv.indexOf(flag);
        return i === -1 ? undefined : argv[i + 1];
    };
    const days = value("--active-days");
    const n = Number(days);
    if (days !== undefined && (!Number.isFinite(n) || n <= 0)) {
        console.error(`sync: --active-days takes a number of days, not ${days}`);
        return 1;
    }
    return syncAll(ctx, {
        branch: value("--branch"),
        dryRun: argv.includes("--dry-run"),
        ifDue: argv.includes("--if-due"),
        activeDays: days === undefined ? undefined : n,
    });
}
