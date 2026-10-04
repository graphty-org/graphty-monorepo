/**
 * Worktrees githerd owns (design sections 4.9 and 7.1).
 *
 * A job's worktree, `.worktrees/githerd-<job>`, is detached, locked, built and smoke-tested before
 * its worker starts (design section 7.1; `prepareJobWorktree` and `removeJobWorktree` below). It is
 * removed with `git worktree remove`, never `--force`.
 *
 * The reference worktree, `.worktrees/githerd-ref`, is the daemon's own tree at the green commit for
 * the local checks that must match CI (design section 4.9; `refreshReference` and the `reference*`
 * checks below).
 *
 * githerd never runs git stash, reset, checkout of a file, clean or rebase.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";

import { classify } from "./classify.mjs";
import { parseDryRun } from "./release.mjs";

const GIT_TIMEOUT_MS = 5 * 60_000;
// ponytail: one fixed limit for the setup command (graphty's is pnpm install); make it a config
// key if a repository's setup needs longer.
const SETUP_TIMEOUT_MS = 20 * 60_000;

/**
 * The environment githerd starts a command with: its own, without `NX_CACHE_DIRECTORY`. Every
 * worktree already shares the main checkout's Nx cache; with the variable set, Nx reported cache
 * hits and restored no output (evidence/platform-facts.md section 8.1).
 * @param {Record<string, string | undefined>} env the environment
 * @returns {Record<string, string | undefined>} the same without the variable
 */
function withoutNxCache(env) {
    const out = { ...env };
    delete out.NX_CACHE_DIRECTORY;
    return out;
}

/**
 * The packages one level under `dir` that have a `build` script but no `dist` directory: a setup
 * that reports success with any of them is a broken build, not a prepared worktree.
 * @param {string} dir the worktree
 * @returns {string[]} the package directories, sorted
 */
function missingDist(dir) {
    return readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !existsSync(join(dir, d.name, "dist")))
        .map((d) => d.name)
        .filter((name) => {
            try {
                return Boolean(JSON.parse(readFileSync(join(dir, name, "package.json"), "utf8")).scripts?.build);
            } catch {
                return false;
            }
        })
        .sort((a, b) => a.localeCompare(b));
}

/**
 * @typedef {{code: number, stdout: string, stderr: string, timedOut?: boolean}} RunResult
 * @typedef {(entry: {kind: string} & Record<string, unknown>) => unknown} Ledger
 */

/**
 * Runs a command without a shell and never throws. The command leads a process group of its own,
 * and the timeout kills that whole group: a setup's `sh -c` or the pre-push gate leaves no child
 * behind holding a lock or a port.
 * @param {string} file the program
 * @param {string[]} args its arguments
 * @param {{cwd: string, timeoutMs?: number, env?: Record<string, string | undefined>,
 *   input?: string, onSpawn?: (pgid: number) => void}} options where to run it, the kill timeout,
 *   the environment (the daemon's by default), what to write to its standard input, and who is
 *   told the child's process group once it started (to kill it from outside)
 * @returns {Promise<RunResult>} exit code and output; `timedOut` when the timeout killed it
 */
export function run(file, args, { cwd, timeoutMs = GIT_TIMEOUT_MS, env = process.env, input, onSpawn }) {
    return new Promise((resolve) => {
        let timedOut = false;
        let stdout = "";
        let stderr = "";
        const child = spawn(file, args, { cwd, env, detached: true });
        if (child.pid) onSpawn?.(child.pid);
        const timer = setTimeout(() => {
            timedOut = true;
            try {
                process.kill(-(/** @type {number} */ (child.pid)), "SIGKILL");
            } catch {
                // The group is already gone.
            }
        }, timeoutMs);
        child.stdout.on("data", (d) => (stdout += d));
        child.stderr.on("data", (d) => (stderr += d));
        child.stdin.on("error", () => {});
        child.stdin.end(input);
        const done = (/** @type {number} */ code, /** @type {string} */ message = "") => {
            clearTimeout(timer);
            resolve({ code, stdout, stderr: stderr || message, ...(timedOut ? { timedOut } : {}) });
        };
        child.on("error", (err) => done(1, err.message));
        child.on("close", (code) => done(code ?? 1, code === 0 ? "" : `${file} exited ${code ?? "on a signal"}`));
    });
}

/**
 * Runs git and returns its trimmed output, throwing with git's message on failure.
 * @param {string} cwd the repository
 * @param {string[]} args git's arguments
 * @returns {Promise<string>} stdout, trimmed
 */
export async function git(cwd, args) {
    const r = await run("git", args, { cwd });
    if (r.code !== 0) throw new Error(`git ${args[0]} failed: ${(r.stderr || r.stdout).trim()}`);
    return r.stdout.trim();
}

/**
 * Turns a target (`pr:704`, `master`, `issue:643`) into a name safe for a directory and a branch.
 * @param {string} target the target
 * @returns {string} for example `pr-704`
 */
export function slug(target) {
    return target.replaceAll(/[^A-Za-z0-9._-]+/g, "-");
}

/*
 * The reference worktree (design section 4.9): `.worktrees/githerd-ref`, a locked worktree the
 * daemon owns, detached at the green commit, installed and built. It answers the local checks that
 * must match CI: the dependency audit, commitlint on a pull request title, the release dry-run (on
 * the green commit, or on a local merge of a pull request's head that is never pushed) and the
 * pre-push gate on the green commit. A check that cannot run there is a platform fault (class 3,
 * or a credential when its text says so), never a verdict on a pull request.
 */

/** The reference worktree, relative to the main checkout. */
const REFERENCE_DIR = join(".worktrees", "githerd-ref");
// ponytail: one fixed bound for the full gate on the green commit; derive it from measured gate
// durations once the push queue records them.
const GATE_TIMEOUT_MS = 90 * 60_000;

/**
 * @typedef {{verdict: "fault", check: string, class: "outside" | "credential", reason: string}} Fault
 * @typedef {{root: string, state: any, env: Record<string, string | undefined>,
 *   ledger: Ledger}} RefOptions the main checkout, the daemon state (its `reference` record), the
 *   environment checks run in, and the ledger. The checks run the repository's code, a pull
 *   request's after a merge, so `env` is an allow-list (`codeEnv` in worker-settings.mjs, with the
 *   owner's signing variables for a merge), never the daemon's own, which holds the notify keys
 */

/**
 * The environment of every command in the reference worktree: without `NX_CACHE_DIRECTORY`, and
 * with the Nx daemon off as on CI, so no background Nx process outlives a check.
 * @param {Record<string, string | undefined>} env the base environment
 * @returns {Record<string, string | undefined>} the environment to run with
 */
function refEnv(env) {
    if (!env) throw new TypeError("code githerd runs needs its allow-listed environment");
    return { ...withoutNxCache(env), NX_DAEMON: "false" };
}

/**
 * The last lines of a command's output, colors removed.
 * @param {RunResult} r the result
 * @param {number} n how many lines
 * @returns {string} the tail
 */
function tail(r, n) {
    return stripVTControlCharacters(`${r.stderr}\n${r.stdout}`).trim().split("\n").slice(-n).join("\n");
}

/**
 * A check that could not run, classified as the classifier would: a credential when its text names
 * one, otherwise outside or platform.
 * @param {Ledger} ledger the ledger
 * @param {string} check what was run
 * @param {RunResult | string} r its result, or why it was not run
 * @returns {Promise<Fault>} the fault
 */
async function refFault(ledger, check, r) {
    const log = typeof r === "string" ? r : stripVTControlCharacters(`${r.stderr}\n${r.stdout}`);
    const v = classify({ workflow: "local", job: "reference", steps: [check], log }, { where: "master" });
    let reason = r;
    if (typeof r !== "string") {
        const outcome = r.timedOut ? "timed out" : `exited ${r.code}`;
        reason = `${check} ${outcome}: ${tail(r, 5)}`;
    }
    const f = /** @type {Fault} */ ({
        verdict: "fault",
        check,
        class: v.class === "credential" ? "credential" : "outside",
        reason,
    });
    await ledger({ kind: "reference-fault", ...f });
    return f;
}

/**
 * The reference worktree's directory and commit when it is prepared, or the fault when it is not.
 * @param {RefOptions} options the options
 * @param {string} check the check about to run
 * @returns {Promise<{dir: string, sha: string} | Fault>} where to run, or why not
 */
async function prepared({ root, state, ledger }, check) {
    const dir = join(root, REFERENCE_DIR);
    if (state.reference?.ready && existsSync(dir)) return { dir, sha: state.reference.sha };
    return refFault(ledger, check, "the reference worktree is not prepared");
}

/**
 * Makes sure `sha` is in the repository, fetching it from `remote` (by `ref` when given) if not.
 * @param {string} cwd a worktree of the repository
 * @param {string} sha the commit
 * @param {string} remote the remote
 * @param {string} [ref] the ref that names it on the remote (a pull request's `refs/pull/<n>/head`)
 * @param {Record<string, string | undefined>} [env] the environment
 * @returns {Promise<RunResult>} the fetch, or a success when it was already there
 */
async function haveCommit(cwd, sha, remote, ref, env = process.env) {
    if ((await run("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd, env })).code === 0) {
        return { code: 0, stdout: "", stderr: "" };
    }
    const r = await run("git", ["fetch", "--no-tags", remote, ref ?? sha], { cwd, env });
    if (r.code !== 0) return r;
    return run("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd, env });
}

/**
 * Puts the reference worktree at `sha`: switches it when it exists, otherwise adds and locks it.
 * @param {string} root the repository's main worktree
 * @param {string} dir the reference worktree's directory
 * @param {string} sha the commit
 * @param {Record<string, string | undefined>} env the environment
 * @returns {Promise<{check: string, r: RunResult} | null>} the step that failed, or null
 */
async function placeReference(root, dir, sha, env) {
    if (existsSync(dir)) {
        const r = await run("git", ["switch", "--detach", sha], { cwd: dir, env });
        return r.code === 0 ? null : { check: "switch", r };
    }
    const add = await run("git", ["worktree", "add", "--detach", dir, sha], { cwd: root, env });
    if (add.code !== 0) return { check: "worktree add", r: add };
    const lock = await run("git", ["worktree", "lock", "--reason", "githerd reference worktree", dir], {
        cwd: root,
        env,
    });
    return lock.code === 0 ? null : { check: "worktree lock", r: lock };
}

/**
 * Moves the reference worktree to the green commit when it moved (creating and locking it the
 * first time), then installs and builds it with `setup`. Nothing runs when it is already prepared
 * at `sha`. A worktree with local changes is not moved: git refuses, and that is a fault.
 * @param {RefOptions & {sha: string, setup?: string[] | null, remote?: string,
 *   now?: () => Date}} options `sha` is the green commit; `setup` the config's `worktreeSetup`
 * @returns {Promise<{verdict: "ready", dir: string, sha: string} | Fault>} the prepared worktree,
 *   or why it is not
 */
export async function refreshReference({
    root,
    state,
    sha,
    setup = null,
    env,
    remote = "origin",
    ledger,
    now = () => new Date(),
}) {
    const dir = join(root, REFERENCE_DIR);
    if (state.reference?.ready && state.reference.sha === sha && existsSync(dir)) {
        return { verdict: "ready", dir, sha };
    }
    state.reference = { sha, ready: false, gate: null };
    const fetched = await haveCommit(root, sha, remote, undefined, refEnv(env));
    if (fetched.code !== 0) return refFault(ledger, "fetch", fetched);
    const placed = await placeReference(root, dir, sha, env);
    if (placed) return refFault(ledger, placed.check, placed.r);
    if (setup && setup.length > 0) {
        const r = await run(setup[0], setup.slice(1), { cwd: dir, timeoutMs: SETUP_TIMEOUT_MS, env: refEnv(env) });
        if (r.code !== 0) return refFault(ledger, "setup", r);
        const missing = missingDist(dir);
        if (missing.length > 0) return refFault(ledger, "setup", `setup left no dist in ${missing.join(", ")}`);
    }
    state.reference = { sha, ready: true, at: now().toISOString(), gate: null };
    await ledger({ kind: "reference-refreshed", dir, sha });
    return { verdict: "ready", dir, sha };
}

/**
 * The dependency audit exactly as `ci.yml`'s `Security audit` step runs it, `pnpm audit
 * --audit-level=high`, on the green commit's lockfile; `package.json`'s `ignoreGhsas` apply as on
 * CI. Its exit code is the verdict. A failure that does not report vulnerabilities (the registry
 * unreachable) is a fault.
 * @param {RefOptions} options the options
 * @returns {Promise<{verdict: "pass", sha: string} |
 *   {verdict: "fail", sha: string, advisories: string[], summary: string} | Fault>} the verdict,
 *   with the advisories it names
 */
export async function referenceAudit(options) {
    const at = await prepared(options, "audit");
    if ("verdict" in at) return at;
    const r = await run("pnpm", ["audit", "--audit-level=high"], {
        cwd: at.dir,
        timeoutMs: SETUP_TIMEOUT_MS,
        env: refEnv(options.env),
    });
    if (r.code === 0) return { verdict: "pass", sha: at.sha };
    const text = `${r.stdout}\n${r.stderr}`;
    const found = /^\d+ vulnerabilit(?:y|ies) found.*$/m.exec(text);
    if (!found || r.timedOut) return refFault(options.ledger, "audit", r);
    const severity = /^Severity: .*$/m.exec(text);
    return {
        verdict: "fail",
        sha: at.sha,
        advisories: [...new Set(text.match(/GHSA(?:-[0-9a-z]{4}){3}/g))],
        summary: severity ? `${found[0]}; ${severity[0]}` : found[0],
    };
}

/**
 * The repository's commitlint on a pull request title, as `pr-title.yml` runs it: the title on
 * standard input to `pnpm exec commitlint`.
 * @param {RefOptions & {title: string}} options the options and the title
 * @returns {Promise<{verdict: "pass"} | {verdict: "fail", problems: string[]} | Fault>} the
 *   verdict, with one line per rule the title breaks
 */
export async function referenceCommitlint(options) {
    const at = await prepared(options, "commitlint");
    if ("verdict" in at) return at;
    const r = await run("pnpm", ["exec", "commitlint"], {
        cwd: at.dir,
        env: refEnv(options.env),
        input: `${options.title}\n`,
    });
    if (r.code === 0) return { verdict: "pass" };
    const problems = `${r.stdout}\n${r.stderr}`
        .split("\n")
        .filter((l) => /\[[\w-]+\]\s*$/.test(l))
        .map((l) => l.replace(/^[^\w]*/, "").trim());
    if (problems.length === 0 || !/found \d+ problems?/.test(r.stdout + r.stderr)) {
        return refFault(options.ledger, "commitlint", r);
    }
    return { verdict: "fail", problems };
}

/**
 * The release dry-run (design 4.3 and 4.6 line 7): `node tools/release-hold.mjs apply`, as
 * `release.yml` does, then `pnpm exec nx release --dry-run`, then `nx.json` put back. With `merge`,
 * it first makes a local, signed merge commit of the pull request's head on the green commit, never
 * pushed, and afterwards returns the worktree to the green commit. The answer is the per-project
 * bumps `parseDryRun` reads; none means nothing would publish.
 * @param {RefOptions & {merge?: {sha: string, ref?: string}, remote?: string}} options the options;
 *   `merge.sha` is the pull request head, fetched by `merge.ref` (`refs/pull/<n>/head`) when absent
 * @returns {Promise<{verdict: "answer", sha: string, head: string | null,
 *   bumps: {dir: string, version: string}[]} | {verdict: "conflict", head: string, files: string[]} |
 *   Fault>} the bumps; a merge conflict; or why there is no answer
 */
export async function referenceDryRun(options) {
    const at = await prepared(options, "release dry-run");
    if ("verdict" in at) return at;
    const { ledger, merge, remote = "origin" } = options;
    const env = refEnv(options.env);
    if (merge) {
        const fetched = await haveCommit(at.dir, merge.sha, remote, merge.ref, env);
        if (fetched.code !== 0) return refFault(ledger, "fetch", fetched);
        const m = await run("git", ["merge", "-S", "--no-ff", "--no-edit", merge.sha], { cwd: at.dir, env });
        if (m.code !== 0) {
            const unmerged = await run("git", ["diff", "--name-only", "--diff-filter=U"], { cwd: at.dir, env });
            await run("git", ["merge", "--abort"], { cwd: at.dir, env });
            const files = unmerged.stdout.split("\n").filter(Boolean);
            if (files.length > 0) return { verdict: "conflict", head: merge.sha, files };
            return refFault(ledger, "merge", m);
        }
    }
    const nxJson = join(at.dir, "nx.json");
    const original = readFileSync(nxJson, "utf8");
    try {
        const hold = await run("node", ["tools/release-hold.mjs", "apply"], { cwd: at.dir, env });
        if (hold.code !== 0) return await refFault(ledger, "release hold", hold);
        const r = await run("pnpm", ["exec", "nx", "release", "--dry-run"], {
            cwd: at.dir,
            timeoutMs: SETUP_TIMEOUT_MS,
            env,
        });
        const bumps = parseDryRun(stripVTControlCharacters(`${r.stdout}\n${r.stderr}`));
        if (r.code !== 0 || bumps === null) return await refFault(ledger, "release dry-run", r);
        return { verdict: "answer", sha: at.sha, head: merge?.sha ?? null, bumps };
    } finally {
        writeFileSync(nxJson, original);
        if (merge && (await run("git", ["switch", "--detach", at.sha], { cwd: at.dir, env })).code !== 0) {
            // Prepared again on the next refresh, which reports the fault if it cannot move it.
            options.state.reference.ready = false;
        }
    }
}

/**
 * The pre-push gate on the green commit, every package (`PREPUSH_ALL=1`), once per green commit:
 * a gate step that fails here fails for every job, so a job's failure of the same step is shared
 * (the classifier's `failsOnGreen`). The gate waits in the machine's push queue like any other.
 * @param {RefOptions & {timeoutMs?: number}} options the options
 * @returns {Promise<{verdict: "pass", sha: string} | {verdict: "fail", sha: string, steps: string[]} |
 *   Fault>} the verdict, with the gate's failed steps
 */
export async function referenceGate(options) {
    const at = await prepared(options, "gate");
    if ("verdict" in at) return at;
    const cached = options.state.reference.gate;
    if (cached?.sha === at.sha) return cached;
    // Through the machine's push queue, like every session's gate, when the repository has one.
    const queue = join(options.root, "tools", "push-queue.sh");
    const gate = existsSync(queue) ? [queue, "bash", "tools/prepush.sh"] : ["tools/prepush.sh"];
    const r = await run("bash", gate, {
        cwd: at.dir,
        timeoutMs: options.timeoutMs ?? GATE_TIMEOUT_MS,
        env: { ...refEnv(options.env), PREPUSH_ALL: "1" },
    });
    let result;
    if (r.code === 0) {
        result = { verdict: /** @type {const} */ ("pass"), sha: at.sha };
    } else {
        const text = stripVTControlCharacters(`${r.stdout}\n${r.stderr}`);
        if (r.timedOut || !text.includes("Pre-push validation failed")) return refFault(options.ledger, "gate", r);
        const steps = [...text.matchAll(/^\[FAIL\] (.+)$/gm)].map((m) => m[1].trim());
        result = { verdict: /** @type {const} */ ("fail"), sha: at.sha, steps };
    }
    options.state.reference.gate = result;
    return result;
}

/*
 * Job worktrees (design section 7.1, step 2): `.worktrees/githerd-<job>`, one per job, detached at
 * the green commit for new work or at the pull request's head for `pr` and `review` jobs, so a
 * branch the owner has checked out elsewhere is never a conflict. Locked with the reason
 * `githerd job <id>`, installed, built with Nx, checked for `dist` and smoke-tested before a
 * session is started in it. A preparation that fails is a fault for the job, never a session.
 */

/** The default preparation steps, each run without a shell in the job's worktree. */
const JOB_STEPS = {
    install: ["pnpm", "install", "--frozen-lockfile"],
    build: ["pnpm", "exec", "nx", "run-many", "-t", "build"],
    // graph-io's tests resolve graph-format through its `dist`, so they fail on an unbuilt tree.
    smoke: ["pnpm", "--filter", "@graphty/graph-io", "run", "test:run"],
};

/**
 * @typedef {{dir: string, dirty: boolean, unpushed: number}} Holder a worktree that has a branch
 *   checked out with work on it: uncommitted changes, or commits no remote has
 * @typedef {{verdict: "faulted", step: string, dir: string | null, reason: string}} JobFault
 */

/**
 * A job's worktree directory.
 * @param {string} root the main checkout
 * @param {string} job the job id
 * @returns {string} `<root>/.worktrees/githerd-<job>`
 */
export function jobWorktreeDir(root, job) {
    return join(root, ".worktrees", `githerd-${slug(job)}`);
}

/**
 * Commits reachable from `rev` that neither `base` nor any remote-tracking branch has.
 * @param {string} cwd a worktree of the repository
 * @param {string} rev the revision
 * @param {Record<string, string | undefined>} env the environment
 * @param {string} [base] a commit whose history counts as pushed
 * @returns {Promise<number>} the count
 */
async function unpushedCount(cwd, rev, env, base) {
    const r = await run("git", ["rev-list", "--count", rev, "--not", "--remotes", ...(base ? [base] : [])], {
        cwd,
        env,
    });
    if (r.code !== 0) throw new Error(`git rev-list failed: ${(r.stderr || r.stdout).trim()}`);
    return Number(r.stdout.trim());
}

/**
 * The worktrees that have `branch` checked out with work on it, live session or not (design 7.1):
 * a `pr` job on that branch does not start, and the board names them. A worktree with the branch
 * checked out, clean and fully pushed, is no holder; a worktree whose state cannot be read is one.
 * @param {{root: string, branch: string, env?: Record<string, string | undefined>}} options the
 *   main checkout, the pull request's head branch and the environment
 * @returns {Promise<Holder[]>} the holders
 */
export async function branchHolders({ root, branch, env = process.env }) {
    const list = await run("git", ["worktree", "list", "--porcelain"], { cwd: root, env });
    if (list.code !== 0) throw new Error(`git worktree list failed: ${(list.stderr || list.stdout).trim()}`);
    const dirs = list.stdout
        .split("\n\n")
        .map((block) => block.split("\n"))
        .filter((lines) => lines.includes(`branch refs/heads/${branch}`))
        .map((lines) => lines[0].slice("worktree ".length))
        .filter((dir) => existsSync(dir));
    /** @type {Holder[]} */
    const holders = [];
    for (const dir of dirs) {
        const status = await run("git", ["status", "--porcelain"], { cwd: dir, env });
        const dirty = status.code !== 0 || status.stdout.trim() !== "";
        const unpushed = await unpushedCount(root, `refs/heads/${branch}`, env);
        if (dirty || unpushed > 0) holders.push({ dir, dirty, unpushed });
    }
    return holders;
}

/**
 * Records and returns a failed preparation.
 * @param {Ledger} ledger the ledger
 * @param {string} job the job id
 * @param {string} step the step that failed
 * @param {string | null} dir the worktree, when one exists
 * @param {RunResult | string} r the step's result, or why it failed
 * @returns {Promise<JobFault>} the fault
 */
async function jobFault(ledger, job, step, dir, r) {
    let reason = r;
    if (typeof r !== "string") {
        const outcome = r.timedOut ? "timed out" : `exited ${r.code}`;
        reason = `${step} ${outcome}: ${tail(r, 5)}`;
    }
    const f = /** @type {JobFault} */ ({ verdict: "faulted", step, dir, reason });
    await ledger({ kind: "job-worktree-faulted", job, ...f });
    return f;
}

/**
 * Prepares a job's worktree (design 7.1, step 2): checks that no worktree holds a `pr` job's
 * branch, fetches the start commit, adds the worktree detached at it, locks it, then installs,
 * builds, checks that every built package has its `dist` and runs the smoke test. When a step
 * after the worktree was added fails, the worktree is removed again (`removeJobWorktree`), so a
 * later attempt starts clean; the fault names it when it could not be removed. A worktree a
 * preparation left behind when githerd stopped halfway (locked for this job, and not the job's
 * prepared worktree) is removed first, its unpushed commits salvaged; githerd's own crash is never
 * the job's fault.
 * @param {{root: string, job: string, sha: string, ref?: string, branch?: string, remote?: string,
 *   steps?: {install: string[], build: string[], smoke: string[]},
 *   env: Record<string, string | undefined>, prepared?: string | null, ledger: Ledger}} options
 *   `sha` is the green commit or the pull request's head, fetched by `ref` (`refs/pull/<n>/head`)
 *   when absent; `branch` is a `pr` job's head branch, checked for holders; `env` is the
 *   allow-listed environment the steps run the branch's code with (`codeEnv`, with the owner's
 *   signing variables), never the daemon's own; `prepared` is the job record's worktree, if it has
 *   one
 * @returns {Promise<{verdict: "ready", dir: string, sha: string} |
 *   {verdict: "held", holders: Holder[]} | JobFault>} the prepared worktree; the worktrees holding
 *   the branch; or the fault
 */
export async function prepareJobWorktree({
    root,
    job,
    sha,
    ref,
    branch,
    remote = "origin",
    steps = JOB_STEPS,
    env,
    prepared = null,
    ledger,
}) {
    const dir = jobWorktreeDir(root, job);
    if (!env) throw new TypeError("prepareJobWorktree needs the steps' allow-listed environment");
    if (branch) {
        const held = await heldBy({ root, job, branch, env, ledger });
        if (held) return held;
    }
    const leftover = await clearLeftover({ root, job, dir, sha, prepared, env, ledger });
    if (leftover) return leftover;
    const fetched = await haveCommit(root, sha, remote, ref, env);
    if (fetched.code !== 0) return jobFault(ledger, job, "fetch", null, fetched);
    const add = await run("git", ["worktree", "add", "--detach", dir, sha], { cwd: root, env });
    if (add.code !== 0) return jobFault(ledger, job, "worktree add", null, add);
    const lock = await run("git", ["worktree", "lock", "--reason", `githerd job ${job}`, dir], { cwd: root, env });
    const failed = lock.code === 0 ? await runSteps(dir, steps, env) : { step: "worktree lock", r: lock };
    if (failed) {
        const removed = await removeJobWorktree({ root, job, dir, base: sha, env, ledger });
        const fault = await jobFault(ledger, job, failed.step, removed.ok ? null : dir, failed.r);
        if (!("reason" in removed)) return fault;
        return { ...fault, reason: `${fault.reason}; not removed: ${removed.reason}` };
    }
    await ledger({ kind: "job-worktree-ready", job, dir, sha });
    return { verdict: "ready", dir, sha };
}

/**
 * Removes the directory a preparation left when githerd stopped halfway: one locked for this job
 * that is not the job's prepared worktree. Its unpushed commits are salvaged.
 * @param {{root: string, job: string, dir: string, sha: string, prepared: string | null,
 *   env: Record<string, string | undefined>, ledger: Ledger}} options where, for which job, and the
 *   job record's worktree
 * @returns {Promise<JobFault | null>} the fault when the directory stays, null when it is free
 */
async function clearLeftover({ root, job, dir, sha, prepared, env, ledger }) {
    if (!existsSync(dir)) return null;
    const left = prepared !== dir && (await lockReason(root, dir, env)) === `githerd job ${job}`;
    const removed = left ? await removeJobWorktree({ root, job, dir, base: sha, salvage: true, env, ledger }) : null;
    if (removed?.ok) return null;
    const why = removed && "reason" in removed ? `; not removed: ${removed.reason}` : "";
    return jobFault(ledger, job, "worktree add", dir, `${dir} already exists${why}`);
}

/**
 * Why git has a worktree locked.
 * @param {string} root the main checkout
 * @param {string} dir the worktree
 * @param {Record<string, string | undefined>} env the environment
 * @returns {Promise<string | null>} the lock reason, or null when it is not a locked worktree
 */
async function lockReason(root, dir, env) {
    const list = await run("git", ["worktree", "list", "--porcelain"], { cwd: root, env });
    const block = list.stdout.split("\n\n").find((b) => b.split("\n")[0] === `worktree ${dir}`);
    const locked = block?.split("\n").find((l) => l.startsWith("locked"));
    return locked === undefined ? null : locked.slice("locked ".length);
}

/**
 * The holders of a `pr` job's branch, as the answer `prepareJobWorktree` gives.
 * @param {{root: string, job: string, branch: string, env: Record<string, string | undefined>,
 *   ledger: Ledger}} options the main checkout, the job, its branch, the environment, the ledger
 * @returns {Promise<{verdict: "held", holders: Holder[]} | JobFault | null>} held, a fault when
 *   the worktrees could not be read, or null when nothing holds the branch
 */
async function heldBy({ root, job, branch, env, ledger }) {
    let holders;
    try {
        holders = await branchHolders({ root, branch, env });
    } catch (err) {
        return jobFault(ledger, job, "holders", null, /** @type {Error} */ (err).message);
    }
    if (holders.length === 0) return null;
    await ledger({ kind: "job-worktree-held", job, branch, holders });
    return { verdict: "held", holders };
}

/**
 * Runs install, build and smoke in order in a job's worktree, stopping at the first that fails. A
 * build that leaves a built package without `dist` has failed, whatever its exit code.
 * @param {string} dir the worktree
 * @param {{install: string[], build: string[], smoke: string[]}} steps the commands
 * @param {Record<string, string | undefined>} env the environment
 * @returns {Promise<{step: string, r: RunResult | string} | null>} the failed step, or null
 */
async function runSteps(dir, steps, env) {
    for (const step of /** @type {const} */ (["install", "build", "smoke"])) {
        const [file, ...args] = steps[step];
        const r = await run(file, args, { cwd: dir, timeoutMs: SETUP_TIMEOUT_MS, env: refEnv(env) });
        if (r.code !== 0) return { step, r };
        const missing = step === "build" ? missingDist(dir) : [];
        if (missing.length > 0) return { step, r: `build left no dist in ${missing.join(", ")}` };
    }
    return null;
}

/**
 * Removes a job's worktree with `git worktree remove`, never `--force`: git refuses one with
 * uncommitted changes. Commits on its detached head that neither `base` nor any remote has are
 * kept first: with `salvage`, on a local branch `githerd/<job>-salvage` (`-2`, `-3` when taken),
 * which the job record lists; without it the removal is refused. The lock is taken again when the
 * removal fails, so no session can remove it either.
 * @param {{root: string, job: string, dir?: string, base: string, salvage?: boolean,
 *   env?: Record<string, string | undefined>, ledger: Ledger}} options the main checkout, the job
 *   id, its worktree (the job's directory by default), the commit it was prepared at, and whether
 *   unpushed commits are salvaged (a cancelled job) or block the removal
 * @returns {Promise<{ok: true, salvage: string | null} | {ok: false, reason: string}>} whether it
 *   was removed, and the salvage branch it left
 */
export async function removeJobWorktree({
    root,
    job,
    dir = jobWorktreeDir(root, job),
    base,
    salvage = false,
    env = process.env,
    ledger,
}) {
    if (!existsSync(dir)) return { ok: true, salvage: null };
    const refuse = async (/** @type {string} */ reason) => {
        await ledger({ kind: "job-worktree-remove-failed", job, dir, reason });
        return /** @type {{ok: false, reason: string}} */ ({ ok: false, reason });
    };
    let kept = null;
    try {
        const unpushed = await unpushedCount(dir, "HEAD", env, base);
        if (unpushed > 0 && !salvage) return await refuse(`${unpushed} unpushed commits on its head`);
        if (unpushed > 0) {
            kept = await freeSalvageBranch(root, `githerd/${slug(job)}-salvage`);
            await git(root, ["branch", kept, await git(dir, ["rev-parse", "HEAD"])]);
            await ledger({ kind: "job-salvaged", job, dir, branch: kept, commits: unpushed });
        }
    } catch (err) {
        return refuse(/** @type {Error} */ (err).message);
    }
    // Unlocking a worktree that is not locked fails harmlessly; the removal decides.
    await run("git", ["worktree", "unlock", dir], { cwd: root, env });
    const r = await run("git", ["worktree", "remove", dir], { cwd: root, env });
    if (r.code !== 0) {
        await run("git", ["worktree", "lock", "--reason", `githerd job ${job}`, dir], { cwd: root, env });
        return refuse((r.stderr || r.stdout).trim());
    }
    await ledger({ kind: "job-worktree-removed", job, dir });
    return { ok: true, salvage: kept };
}

/**
 * The first of `name`, `name-2`, `name-3`, ... that is not a branch yet.
 * @param {string} root the repository
 * @param {string} name the branch name
 * @returns {Promise<string>} a free name
 */
async function freeSalvageBranch(root, name) {
    const taken = new Set((await git(root, ["branch", "--list", "--format=%(refname:short)", `${name}*`])).split("\n"));
    if (!taken.has(name)) return name;
    let n = 2;
    while (taken.has(`${name}-${n}`)) n++;
    return `${name}-${n}`;
}

/**
 * The signing probe (design 7.1, step 1): `git commit-tree -S` of the empty tree in a scratch
 * repository, with exactly the environment a worker gets (its signing variables and PATH). The
 * owner's SSH signing key answers in milliseconds; without the signing variables git falls back to
 * his gpg key, whose pinentry fails without a terminal (platform facts 8.6).
 * @param {{env: Record<string, string>, timeoutMs?: number}} options the worker's environment
 * @returns {Promise<{ok: true} | {ok: false, reason: string}>} whether a signed commit was made
 */
export async function signingProbe({ env, timeoutMs = 30_000 }) {
    const dir = mkdtempSync(join(tmpdir(), "githerd-sign-probe-"));
    try {
        const opts = { cwd: dir, env, timeoutMs };
        const init = await run("git", ["init", "-q"], opts);
        if (init.code !== 0) return { ok: false, reason: `git init: ${tail(init, 3)}` };
        const tree = await run("git", ["hash-object", "-t", "tree", "-w", "--stdin"], { ...opts, input: "" });
        const commit = await run("git", ["commit-tree", "-S", "-m", "githerd signing probe", tree.stdout.trim()], opts);
        if (commit.code !== 0) {
            return {
                ok: false,
                reason: `git commit-tree -S ${commit.timedOut ? "timed out" : "failed"}: ${tail(commit, 3)}`,
            };
        }
        const body = await run("git", ["cat-file", "commit", commit.stdout.trim()], opts);
        return body.stdout.includes("\ngpgsig") ? { ok: true } : { ok: false, reason: "the commit is not signed" };
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}
