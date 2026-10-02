/**
 * Worktrees githerd owns (design sections 5.8 and 9.2). A code-editing run works in
 * `<root>/.worktrees/githerd-<target>`: a new `githerd/<target>-<n>` branch from the green SHA, or
 * a pull request's branch. Every worktree githerd creates is recorded in `state.worktrees`, and
 * only a recorded one is ever removed, with `git worktree remove` and never `--force`.
 *
 * githerd never runs git stash, reset, checkout of a file, clean or rebase.
 */
import { execFile } from "node:child_process";
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
 * @typedef {{code: number, stdout: string, stderr: string}} RunResult
 * @typedef {(entry: {kind: string} & Record<string, unknown>) => unknown} Ledger
 */

/**
 * Runs a command without a shell and never throws.
 * @param {string} file the program
 * @param {string[]} args its arguments
 * @param {{cwd: string, timeoutMs?: number}} options where to run it and the kill timeout
 * @returns {Promise<RunResult>} exit code and output
 */
export function run(file, args, { cwd, timeoutMs = GIT_TIMEOUT_MS }) {
    return new Promise((resolve) => {
        execFile(
            file,
            args,
            { cwd, timeout: timeoutMs, killSignal: "SIGKILL", maxBuffer: 256 * 1024 * 1024 },
            (err, stdout, stderr) => {
                const e = /** @type {any} */ (err);
                resolve({
                    code: e ? (typeof e.code === "number" ? e.code : 1) : 0,
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
    return target.replace(/[^A-Za-z0-9._-]+/g, "-");
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
 *   now?: () => Date,
 * }} options `root` is the main checkout; `prBranch` is the pull request's head branch, fetched
 *   from `remote`; without it a new `githerd/<target>-<n>` branch starts at `greenSha`
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
    now = () => new Date(),
}) {
    state.worktrees ??= {};
    const name = slug(target);
    const dir = join(root, ".worktrees", `githerd-${name}`);
    if (state.worktrees[dir]) return fail(ledger, target, null, `worktree ${dir} is already in use`);

    let branch;
    let start = greenSha;
    try {
        if (prBranch) {
            start = `refs/remotes/${remote}/${prBranch}`;
            await git(root, ["fetch", "--no-tags", remote, `+refs/heads/${prBranch}:${start}`]);
            if ((await run("git", ["cat-file", "-e", `${greenSha}^{commit}`], { cwd: root })).code !== 0) {
                await git(root, ["fetch", "--no-tags", remote, greenSha]);
            }
        }
        // The local branch is always githerd's own, so a branch of the same name checked out
        // elsewhere never blocks the run; the actor pushes it to `pushBranch`.
        branch = await freeBranch(root, `githerd/${name}`);
        await git(root, ["worktree", "add", "-b", branch, dir, start]);
    } catch (err) {
        return fail(ledger, target, null, err.message);
    }
    const base = await git(dir, ["rev-parse", "HEAD"]);
    const pushBranch = prBranch ?? branch;
    state.worktrees[dir] = {
        createdBy: "githerd",
        for: target,
        branch,
        pushBranch,
        base,
        createdAt: now().toISOString(),
    };
    await ledger({ kind: "worktree-created", target, dir, branch, pushBranch, base });

    if (prBranch) {
        const changed = await steeringChanges(dir, greenSha);
        if (changed.length > 0) {
            return fail(ledger, target, dir, `the pull request changed files that steer a run: ${changed.join(", ")}`);
        }
    }
    if (setup && setup.length > 0) {
        const r = await run(setup[0], setup.slice(1), { cwd: dir, timeoutMs: SETUP_TIMEOUT_MS });
        if (r.code !== 0) {
            const tail = (r.stderr || r.stdout).trim().split("\n").slice(-5).join("\n");
            return fail(ledger, target, dir, `worktree setup ${setup.join(" ")} exited ${r.code}: ${tail}`);
        }
    }
    return { ok: true, dir, branch, pushBranch, base };
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
 * The first `<prefix>-<n>` branch that does not exist yet.
 * @param {string} root the repository
 * @param {string} prefix for example `githerd/pr-704`
 * @returns {Promise<string>} the branch name
 */
async function freeBranch(root, prefix) {
    const taken = new Set(
        (await git(root, ["branch", "--list", "--format=%(refname:short)", `${prefix}-*`])).split("\n"),
    );
    let n = 1;
    while (taken.has(`${prefix}-${n}`)) n++;
    return `${prefix}-${n}`;
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
