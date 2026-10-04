/**
 * Worktrees githerd owns (design sections 5.8 and 9.2). A code-editing run works in
 * `<root>/.worktrees/githerd-<target>-<n>` on its own local branch `githerd/<target>-<n>`, started
 * from the green SHA or from a pull request's head. Read-only runs read a detached tree of the green
 * SHA, `<stateDir>/trees/<sha>`, shared by every read-only run at that SHA. Every worktree githerd
 * creates is recorded in `state.worktrees` before it is made, and only a recorded one is ever
 * removed, with `git worktree remove` and never `--force`: once no running run uses it
 * (`sweepWorktrees`).
 *
 * The reference worktree, `.worktrees/githerd-ref`, is the daemon's own tree at the green commit for
 * the local checks that must match CI (design section 4.9; `refreshReference` and the `reference*`
 * checks below).
 *
 * githerd never runs git stash, reset, checkout of a file, clean or rebase.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";

import { classify } from "./classify.mjs";
import { parseDryRun } from "./release.mjs";

const GIT_TIMEOUT_MS = 5 * 60_000;
// ponytail: one fixed limit for the setup command (graphty's is pnpm install); make it a config
// key if a repository's setup needs longer.
const SETUP_TIMEOUT_MS = 20 * 60_000;

/**
 * Files that steer a run (instructions, settings, MCP servers). A pull request that changed any of
 * them gets no run, because the run would follow the pull request's instructions.
 */
const STEERING_PATHS = [".claude", ".mcp.json", ":(glob)**/CLAUDE.md"];

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
 *   input?: string}} options where to run it, the kill timeout, the environment (the daemon's by
 *   default) and what to write to its standard input
 * @returns {Promise<RunResult>} exit code and output; `timedOut` when the timeout killed it
 */
export function run(file, args, { cwd, timeoutMs = GIT_TIMEOUT_MS, env = process.env, input }) {
    return new Promise((resolve) => {
        let timedOut = false;
        let stdout = "";
        let stderr = "";
        const child = spawn(file, args, { cwd, env, detached: true });
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

/**
 * Lists the steering files a pull request branch changed relative to where it left the green SHA.
 * @param {string} dir the worktree, with the pull request's branch checked out
 * @param {string} greenSha the green SHA the run is given
 * @returns {Promise<string[]>} the changed paths; empty when the run may start
 */
async function steeringChanges(dir, greenSha) {
    const out = await git(dir, ["diff", "--name-only", `${greenSha}...HEAD`, "--", ...STEERING_PATHS]);
    return out ? out.split("\n") : [];
}

/**
 * Creates a githerd worktree for a code-editing run, records it, checks a pull request's steering
 * files and runs the config's `worktreeSetup`.
 * @param {{
 *   root: string,
 *   state: any,
 *   target: string,
 *   greenSha: string,
 *   prBranch?: string,
 *   setup?: string[] | null,
 *   remote?: string,
 *   ledger: Ledger,
 *   save?: () => unknown,
 *   now?: () => Date,
 * }} options `root` is the main checkout; `prBranch` is the pull request's head branch, fetched
 *   from `remote`; without it a new `githerd/<target>-<n>` branch starts at `greenSha`; `save`
 *   persists the record before the worktree is made, so a crash leaves it for removal
 * @returns {Promise<{ok: true, dir: string, branch: string, pushBranch: string, base: string} |
 *   {ok: false, dir: string | null, reason: string}>} the worktree, its local branch, the remote
 *   branch the actor pushes it to and the base the push check compares against; or why the run
 *   must not start
 */
export async function createWorktree({
    root,
    state,
    target,
    greenSha,
    prBranch,
    setup = null,
    remote = "origin",
    ledger,
    save = () => {},
    now = () => new Date(),
}) {
    state.worktrees ??= {};
    const name = slug(target);

    let branch;
    let dir;
    let start = greenSha;
    const pushBranch = prBranch ?? "";
    try {
        if (prBranch) {
            start = `refs/remotes/${remote}/${prBranch}`;
            await git(root, ["fetch", "--no-tags", remote, `+refs/heads/${prBranch}:${start}`]);
            if ((await run("git", ["cat-file", "-e", `${greenSha}^{commit}`], { cwd: root })).code !== 0) {
                await git(root, ["fetch", "--no-tags", remote, greenSha]);
            }
        }
        // The local branch is always githerd's own, so a branch of the same name checked out
        // elsewhere never blocks the run; the actor pushes it to `pushBranch`. Each run gets a new
        // branch and directory, so a worktree that could not be removed never blocks its target.
        branch = await freeBranch(root, `githerd/${name}`, (n) => {
            const d = join(root, ".worktrees", `githerd-${name}-${n}`);
            return !existsSync(d) && !state.worktrees[d];
        });
        dir = join(root, ".worktrees", `githerd-${branch.slice("githerd/".length)}`);
    } catch (err) {
        return fail(ledger, target, null, err.message);
    }
    state.worktrees[dir] = {
        createdBy: "githerd",
        for: target,
        branch,
        pushBranch: pushBranch || branch,
        base: null,
        createdAt: now().toISOString(),
    };
    await save();
    try {
        await git(root, ["worktree", "add", "-b", branch, dir, start]);
    } catch (err) {
        // git removes what it made when `worktree add` fails; nothing is left to record.
        delete state.worktrees[dir];
        return fail(ledger, target, null, err.message);
    }
    const base = await git(dir, ["rev-parse", "HEAD"]);
    state.worktrees[dir].base = base;
    await ledger({ kind: "worktree-created", target, dir, branch, pushBranch: pushBranch || branch, base });

    if (prBranch) {
        const changed = await steeringChanges(dir, greenSha);
        if (changed.length > 0) {
            return fail(ledger, target, dir, `the pull request changed files that steer a run: ${changed.join(", ")}`);
        }
    }
    if (setup && setup.length > 0) {
        const r = await run(setup[0], setup.slice(1), {
            cwd: dir,
            timeoutMs: SETUP_TIMEOUT_MS,
            env: withoutNxCache(process.env),
        });
        if (r.code !== 0) {
            const tail = (r.stderr || r.stdout).trim().split("\n").slice(-5).join("\n");
            return fail(ledger, target, dir, `worktree setup ${setup.join(" ")} exited ${r.code}: ${tail}`);
        }
        const missing = missingDist(dir);
        if (missing.length > 0) {
            return fail(ledger, target, dir, `worktree setup left no dist in ${missing.join(", ")}`);
        }
    }
    return { ok: true, dir, branch, pushBranch: pushBranch || branch, base };
}

/**
 * Logs why a worktree could not be prepared.
 * @param {Ledger} ledger the ledger
 * @param {string} target the run's target
 * @param {string | null} dir the worktree, when one was created (it stays recorded for removal)
 * @param {string} reason why
 * @returns {Promise<{ok: false, dir: string | null, reason: string}>} the failure
 */
async function fail(ledger, target, dir, reason) {
    await ledger({ kind: "worktree-failed", target, dir, reason });
    return { ok: false, dir, reason };
}

/**
 * The first `<prefix>-<n>` branch that does not exist yet and whose `n` is `free`.
 * @param {string} root the repository
 * @param {string} prefix for example `githerd/pr-704`
 * @param {(n: number) => boolean} free whether `n` is otherwise unused
 * @returns {Promise<string>} the branch name
 */
async function freeBranch(root, prefix, free) {
    const taken = new Set(
        (await git(root, ["branch", "--list", "--format=%(refname:short)", `${prefix}-*`])).split("\n"),
    );
    let n = 1;
    while (taken.has(`${prefix}-${n}`) || !free(n)) n++;
    return `${prefix}-${n}`;
}

/**
 * The detached tree of `sha` that read-only runs read (design section 9.2): created on first use
 * and shared by every read-only run at that SHA. Git LFS files stay pointers.
 * @param {{root: string, state: any, stateDir: string, sha: string, ledger: Ledger,
 *   save?: () => unknown, now?: () => Date}} options the main checkout, the daemon state, the
 *   .githerd directory and the verified green SHA
 * @returns {Promise<string>} the tree's directory
 */
export async function readTree({ root, state, stateDir, sha, ledger, save = () => {}, now = () => new Date() }) {
    if (!/^[0-9a-f]{7,64}$/.test(sha)) throw new Error(`not a commit sha: ${sha}`);
    state.worktrees ??= {};
    const dir = join(stateDir, "trees", sha);
    if (state.worktrees[dir] && existsSync(dir)) return dir;
    state.worktrees[dir] = { createdBy: "githerd", for: "read-only", base: sha, createdAt: now().toISOString() };
    await save();
    const r = await run("git", ["worktree", "add", "--detach", dir, sha], {
        cwd: root,
        env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" },
    });
    if (r.code !== 0) {
        delete state.worktrees[dir];
        throw new Error(`git worktree add ${sha} failed: ${(r.stderr || r.stdout).trim()}`);
    }
    await ledger({ kind: "worktree-created", target: "read-only", dir, base: sha });
    return dir;
}

/**
 * Removes every recorded worktree no running run uses and that `keep` does not name. A worktree
 * whose removal failed stays recorded and is not retried (`removeWorktree`).
 * @param {{root: string, state: any, ledger: Ledger, keep?: string[], now?: () => Date}} options the
 *   main checkout, the daemon state, and directories to keep (the current green SHA's tree)
 * @returns {Promise<string[]>} the directories removed
 */
export async function sweepWorktrees({ root, state, ledger, keep = [], now = () => new Date() }) {
    const used = new Set(keep);
    for (const r of Object.values(state.runs ?? {})) {
        const record = /** @type {any} */ (r);
        if (record.status !== "running") continue;
        if (record.cwd) used.add(record.cwd);
        if (record.worktree?.dir) used.add(record.worktree.dir);
    }
    const removed = [];
    for (const [dir, record] of Object.entries(state.worktrees ?? {})) {
        if (used.has(dir) || record.removeFailed) continue;
        if ((await removeWorktree({ root, state, dir, ledger, now })).ok) removed.push(dir);
    }
    return removed;
}

/**
 * Removes a worktree githerd recorded, without `--force`. A worktree githerd did not create is
 * never touched. A failure is logged once and left recorded, so the digest lists it; later calls
 * do not retry it until the record's `removeFailed` is cleared.
 * @param {{root: string, state: any, dir: string, ledger: Ledger, now?: () => Date}} options the
 *   main checkout, the daemon state and the worktree directory
 * @returns {Promise<{ok: boolean, reason?: string}>} whether it was removed
 */
export async function removeWorktree({ root, state, dir, ledger, now = () => new Date() }) {
    const record = state.worktrees?.[dir];
    if (record?.createdBy !== "githerd") return { ok: false, reason: `${dir} is not a worktree githerd created` };
    if (record.removeFailed) return { ok: false, reason: record.removeFailed.reason };
    if (!existsSync(dir)) {
        // Recorded, but never made: the daemon stopped between the record and `git worktree add`.
        delete state.worktrees[dir];
        await ledger({ kind: "worktree-removed", dir, target: record.for, note: "never created" });
        return { ok: true };
    }
    const r = await run("git", ["worktree", "remove", dir], { cwd: root });
    if (r.code !== 0) {
        const reason = (r.stderr || r.stdout).trim();
        record.removeFailed = { at: now().toISOString(), reason };
        await ledger({ kind: "worktree-remove-failed", dir, target: record.for, reason });
        return { ok: false, reason };
    }
    delete state.worktrees[dir];
    await ledger({ kind: "worktree-removed", dir, target: record.for });
    return { ok: true };
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
 * @typedef {{root: string, state: any, env?: Record<string, string | undefined>,
 *   ledger: Ledger}} RefOptions the main checkout, the daemon state (its `reference` record), the
 *   environment checks run in (the daemon's by default; the owner's signing variables for a merge)
 *   and the ledger
 */

/**
 * The environment of every command in the reference worktree: without `NX_CACHE_DIRECTORY`, and
 * with the Nx daemon off as on CI, so no background Nx process outlives a check.
 * @param {Record<string, string | undefined>} env the base environment
 * @returns {Record<string, string | undefined>} the environment to run with
 */
function refEnv(env) {
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
    if (typeof r !== "string") reason = `${check} ${r.timedOut ? "timed out" : `exited ${r.code}`}: ${tail(r, 5)}`;
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
    env = process.env,
    remote = "origin",
    ledger,
    now = () => new Date(),
}) {
    const dir = join(root, REFERENCE_DIR);
    if (state.reference?.ready && state.reference.sha === sha && existsSync(dir)) {
        return { verdict: "ready", dir, sha };
    }
    state.reference = { sha, ready: false, gate: null };
    const fetched = await haveCommit(root, sha, remote, undefined, env);
    if (fetched.code !== 0) return refFault(ledger, "fetch", fetched);
    if (existsSync(dir)) {
        const r = await run("git", ["switch", "--detach", sha], { cwd: dir, env });
        if (r.code !== 0) return refFault(ledger, "switch", r);
    } else {
        const add = await run("git", ["worktree", "add", "--detach", dir, sha], { cwd: root, env });
        if (add.code !== 0) return refFault(ledger, "worktree add", add);
        const lock = await run("git", ["worktree", "lock", "--reason", "githerd reference worktree", dir], {
            cwd: root,
            env,
        });
        if (lock.code !== 0) return refFault(ledger, "worktree lock", lock);
    }
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
        env: refEnv(options.env ?? process.env),
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
        env: refEnv(options.env ?? process.env),
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
    const env = refEnv(options.env ?? process.env);
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
 * (the classifier's `failsOnGreen`). The gate takes the machine's gate lock like any other.
 * @param {RefOptions & {timeoutMs?: number}} options the options
 * @returns {Promise<{verdict: "pass", sha: string} | {verdict: "fail", sha: string, steps: string[]} |
 *   Fault>} the verdict, with the gate's failed steps
 */
export async function referenceGate(options) {
    const at = await prepared(options, "gate");
    if ("verdict" in at) return at;
    const cached = options.state.reference.gate;
    if (cached?.sha === at.sha) return cached;
    const r = await run("bash", ["tools/prepush.sh"], {
        cwd: at.dir,
        timeoutMs: options.timeoutMs ?? GATE_TIMEOUT_MS,
        env: { ...refEnv(options.env ?? process.env), PREPUSH_ALL: "1" },
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
