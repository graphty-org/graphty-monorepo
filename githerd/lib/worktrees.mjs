/**
 * Worktrees githerd owns (design sections 5.8 and 9.2). A code-editing run works in
 * `<root>/.worktrees/githerd-<target>-<n>` on its own local branch `githerd/<target>-<n>`, started
 * from the green SHA or from a pull request's head. Read-only runs read a detached tree of the green
 * SHA, `<stateDir>/trees/<sha>`, shared by every read-only run at that SHA. Every worktree githerd
 * creates is recorded in `state.worktrees` before it is made, and only a recorded one is ever
 * removed, with `git worktree remove` and never `--force`: once no running run uses it
 * (`sweepWorktrees`).
 *
 * githerd never runs git stash, reset, checkout of a file, clean or rebase.
 */
import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
 * @typedef {{code: number, stdout: string, stderr: string}} RunResult
 * @typedef {(entry: {kind: string} & Record<string, unknown>) => unknown} Ledger
 */

/**
 * Runs a command without a shell and never throws.
 * @param {string} file the program
 * @param {string[]} args its arguments
 * @param {{cwd: string, timeoutMs?: number, env?: Record<string, string | undefined>}} options where
 *   to run it, the kill timeout, and the environment (the daemon's by default)
 * @returns {Promise<RunResult>} exit code and output
 */
export function run(file, args, { cwd, timeoutMs = GIT_TIMEOUT_MS, env = process.env }) {
    return new Promise((resolve) => {
        execFile(
            file,
            args,
            { cwd, env, timeout: timeoutMs, killSignal: "SIGKILL", maxBuffer: 256 * 1024 * 1024 },
            (err, stdout, stderr) => {
                const e = /** @type {any} */ (err);
                let code = 0;
                if (e) code = typeof e.code === "number" ? e.code : 1;
                resolve({
                    code,
                    stdout: String(stdout),
                    stderr: String(stderr) || (e && !stderr ? String(e.message) : ""),
                });
            },
        );
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
