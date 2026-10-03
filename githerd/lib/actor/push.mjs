/**
 * Pushing a run's work (design section 8.3). Runs commit locally and never push; the actor checks
 * the branch and pushes it only when every check passes. A failed check is a `denied` escalation
 * and nothing is pushed. In dry-run, paused, or with `actions.runWrites` off, a passing branch is
 * recorded as a `would-do` ledger line and nothing is pushed.
 *
 * The push is never forced, never to the default branch, and always an explicit refspec.
 *
 * Every git command runs in the main checkout, never in the run's worktree: the run can write that
 * worktree's `.git` file and hook directories, and git would run what they name with the daemon's
 * privileges. The run's head is read from its local branch, which createWorktree named.
 */
import { escalate } from "../board.mjs";
import { checkOutgoing } from "../text.mjs";
import { git as gitIn, run as exec } from "../worktrees.mjs";

/** No hook and no file-system monitor runs while githerd reads or pushes a run's branch. */
const SAFE = ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false"];

/**
 * Runs git in the main checkout with hooks and the file-system monitor off.
 * @param {string} root the main checkout
 * @param {string[]} args git's arguments
 * @returns {Promise<string>} stdout, trimmed
 */
const git = (root, args) => gitIn(root, [...SAFE, ...args]);

/**
 * Whether a path falls under one of the protected entries: a directory entry ends with `/`.
 * @param {string} path a repository-relative path
 * @param {string[]} protectedPaths the config's list
 * @returns {boolean} true when protected
 */
function isProtected(path, protectedPaths) {
    return protectedPaths.some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p));
}

/**
 * Splits git output into non-empty lines.
 * @param {string} out the output
 * @returns {string[]} the lines
 */
const lines = (out) => (out ? out.split("\n") : []);

/**
 * Lists every reason the run's branch must not be pushed.
 * @param {{
 *   root: string,
 *   localBranch: string,
 *   branch: string,
 *   prBranch?: string | null,
 *   defaultBranch: string,
 *   base: string,
 *   greenSha: string,
 *   run: {id: string, kind: string, target: string},
 *   state: any,
 *   protectedPaths: string[],
 *   env?: Record<string, string | undefined>,
 * }} options `root` is the main checkout and `localBranch` the run's branch there (its worktree's
 *   branch); `branch` is the remote branch the push would update; `prBranch` the target pull
 *   request's head branch; `base` the head the run started from (for a pull request) or the green
 *   SHA it was given (for a new branch)
 * @returns {Promise<{head: string, commits: string[], reasons: string[]}>} the head, the run's own
 *   commits (newest first) and the reasons; no reasons means the branch may be pushed
 */
async function checkBranch({
    root: dir,
    localBranch,
    branch,
    prBranch = null,
    defaultBranch,
    base,
    greenSha,
    run,
    state,
    protectedPaths,
    env = process.env,
}) {
    const reasons = [];
    const head = await git(dir, ["rev-parse", "--verify", `refs/heads/${localBranch}^{commit}`]);

    if (branch === defaultBranch) reasons.push(`the branch is the default branch ${defaultBranch}`);
    else if (!branch.startsWith("githerd/") && branch !== prBranch) {
        reasons.push(`the branch ${branch} is neither githerd/<...> nor the pull request's head branch`);
    }
    if (!prBranch && base !== greenSha)
        reasons.push(`a new branch must start at the green SHA ${greenSha}, not ${base}`);
    if ((await exec("git", [...SAFE, "merge-base", "--is-ancestor", base, head], { cwd: dir })).code !== 0) {
        reasons.push(`the branch no longer contains its base ${base}`);
        return { head, commits: [], reasons };
    }

    // The run's own commits: what it added on top of its base, not master's commits a merge of the
    // green SHA brought in.
    const commits = lines(await git(dir, ["rev-list", head, `^${base}`, `^${greenSha}`]));
    for (const sha of commits) reasons.push(...(await commitReasons(dir, sha, greenSha, env)));
    if (run.kind === "pr-conflict" && !(await hasGreenMerge(dir, commits, greenSha))) {
        reasons.push(`a pr-conflict run must merge the green SHA ${greenSha.slice(0, 9)}`);
    }

    reasons.push(...(await diffReasons(dir, { base, head, greenSha, protectedPaths, env })));

    const verdict = state.master?.verdict;
    if (verdict !== "green" && !isIncidentRun(state, run)) {
        reasons.push(`master is ${verdict ?? "unknown"} and this is not the incident's master-red run`);
    }
    return { head, commits, reasons };
}

/**
 * What is wrong with one of the run's commits: its signature, its message, or a merge of anything
 * but the green SHA.
 * @param {string} dir the main checkout
 * @param {string} sha the commit
 * @param {string} greenSha the green SHA
 * @param {Record<string, string | undefined>} env the environment the message check reads
 * @returns {Promise<string[]>} the reasons
 */
async function commitReasons(dir, sha, greenSha, env) {
    const reasons = [];
    const short = sha.slice(0, 9);
    const [sig, ...message] = (await git(dir, ["log", "-1", "--format=%G?%n%B", sha])).split("\n");
    if (sig !== "G") reasons.push(`commit ${short} is not signed with a good signature (${sig})`);
    for (const r of checkOutgoing(message.join("\n"), env)) reasons.push(`commit ${short}'s message ${r}`);
    const parents = (await git(dir, ["rev-list", "--parents", "-n", "1", sha])).split(" ").slice(2);
    for (const p of parents.filter((p) => p !== greenSha)) {
        reasons.push(`merge ${short} merges ${p.slice(0, 9)}, not the green SHA ${greenSha.slice(0, 9)}`);
    }
    return reasons;
}

/**
 * What is wrong with the run's own changes: a protected path, or added text the outgoing check
 * refuses. A path whose content equals the green SHA's byte for byte is master's, not the run's:
 * that is how taking master's side of a visual-baseline conflict passes.
 * @param {string} dir the main checkout
 * @param {{base: string, head: string, greenSha: string, protectedPaths: string[],
 *   env: Record<string, string | undefined>}} range what to compare and check against
 * @returns {Promise<string[]>} the reasons
 */
async function diffReasons(dir, { base, head, greenSha, protectedPaths, env }) {
    const reasons = [];
    const fromGreen = new Set(lines(await git(dir, ["diff", "--no-renames", "--name-only", greenSha, head])));
    const own = lines(await git(dir, ["diff", "--no-renames", "--name-only", base, head])).filter((p) =>
        fromGreen.has(p),
    );
    for (const p of own.filter((p) => isProtected(p, protectedPaths))) {
        reasons.push(`it changes the protected path ${p}`);
    }
    if (own.length === 0) return reasons;
    const diff = await git(dir, [
        "diff",
        "--no-renames",
        "--no-color",
        "--no-ext-diff",
        "-U0",
        base,
        head,
        "--",
        ...own,
    ]);
    const added = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++ "));
    for (const r of checkOutgoing(added.join("\n"), env)) reasons.push(`the diff ${r}`);
    return reasons;
}

/**
 * Whether one of the run's commits is a merge whose second parent is the green SHA.
 * @param {string} dir the main checkout
 * @param {string[]} commits the run's commits
 * @param {string} greenSha the green SHA
 * @returns {Promise<boolean>} true when the green SHA was merged
 */
async function hasGreenMerge(dir, commits, greenSha) {
    for (const sha of commits) {
        const parents = (await git(dir, ["rev-list", "--parents", "-n", "1", sha])).split(" ");
        if (parents[2] === greenSha) return true;
    }
    return false;
}

/**
 * Whether the run is the master-red run of an open incident.
 * @param {any} state the daemon state
 * @param {{id: string, kind: string}} run the run
 * @returns {boolean} true for the incident's own run
 */
function isIncidentRun(state, run) {
    if (run.kind !== "master-red") return false;
    return Object.values(state.incidents ?? {}).some(
        (inc) => inc.status === "open" && (inc.runs ?? []).some((r) => r.run === run.id),
    );
}

/**
 * Checks the branch and pushes it from the main checkout with `--no-verify`, hooks off, and the
 * refspec `<head sha>:refs/heads/<branch>`.
 * The pushed head is recorded in `state.pushedByGitherd`.
 * @param {Parameters<typeof checkBranch>[0] & {
 *   mode: string,
 *   runWrites: boolean,
 *   remote?: string,
 *   ledger: (entry: {kind: string} & Record<string, unknown>) => unknown,
 *   now?: () => Date,
 * }} options the checks' inputs, plus the effective mode, whether `actions.runWrites` is on, the
 *   remote and the ledger
 * @returns {Promise<{pushed: boolean, head: string, reasons: string[], wouldDo?: boolean}>} what
 *   happened; `reasons` is empty unless the push was refused or failed
 */
export async function pushRunBranch(options) {
    const { root, branch, run, state, mode, runWrites, remote = "origin", ledger, now = () => new Date() } = options;
    const { head, commits, reasons } = await checkBranch(options);
    if (reasons.length === 0 && commits.length === 0) {
        await ledger({ kind: "push-skipped", run: run.id, target: run.target, branch, head, reason: "no new commits" });
        return { pushed: false, head, reasons: [] };
    }
    if (reasons.length > 0) return deny(state, ledger, run, branch, head, reasons, now());

    if (mode !== "acting" || !runWrites) {
        await ledger({ kind: "would-do", op: `push ${head} to ${remote} ${branch}`, run: run.id, target: run.target });
        return { pushed: false, head, reasons: [], wouldDo: true };
    }
    const r = await exec("git", [...SAFE, "push", "--no-verify", remote, `${head}:refs/heads/${branch}`], {
        cwd: root,
    });
    if (r.code !== 0) {
        return deny(state, ledger, run, branch, head, [`git push failed: ${(r.stderr || r.stdout).trim()}`], now());
    }
    state.pushedByGitherd ??= {};
    state.pushedByGitherd[head] = run.target;
    await ledger({ kind: "action", op: `push ${head} to ${remote} ${branch}`, run: run.id, target: run.target });
    return { pushed: true, head, reasons: [] };
}

/**
 * Raises the `denied` escalation for a refused push and logs it.
 * @param {any} state the daemon state
 * @param {(entry: {kind: string} & Record<string, unknown>) => unknown} ledger the ledger
 * @param {{id: string, target: string}} run the run
 * @param {string} branch the branch
 * @param {string} head its head
 * @param {string[]} reasons why
 * @param {Date} now the current time
 * @returns {Promise<{pushed: false, head: string, reasons: string[]}>} the refusal
 */
async function deny(state, ledger, run, branch, head, reasons, now) {
    escalate(
        state,
        {
            key: `push-denied:${run.id}`,
            kind: "denied",
            summary: `githerd did not push ${branch} for ${run.target}: ${reasons[0]}`,
            detail: reasons.join("\n"),
            target: run.target,
        },
        { daemon: true },
        now,
    );
    await ledger({ kind: "push-refused", run: run.id, target: run.target, branch, head, reasons });
    return { pushed: false, head, reasons };
}
