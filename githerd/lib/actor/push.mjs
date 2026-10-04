/**
 * Pushing a run's work (design section 8.3). Runs commit locally and never push; the actor checks
 * the branch and pushes it only when every check passes. A failed check is a `denied` escalation
 * and nothing is pushed. In dry-run, paused, or with `actions.runWrites` off, a passing branch is
 * recorded as a `would-do` ledger line and nothing is pushed. `pushRunBranch` serves the headless
 * runs and goes when they do (design section 13).
 *
 * The push queue (design section 4.8, `createPushQueue`) is what workers push through: the daemon
 * runs each push in the job's worktree with the normal hooks, so the pre-push gate runs exactly as
 * for a person, as its own child in its own process group, one at a time, in priority order.
 *
 * The push is never forced, never to the default branch, and always an explicit refspec.
 *
 * `pushRunBranch` runs every git command in the main checkout, never in the run's worktree: the run
 * can write that worktree's `.git` file and hook directories, and git would run what they name with
 * the daemon's privileges. The run's head is read from its local branch, which createWorktree named.
 * The queue instead pushes from the job's worktree, because the gate must run as a hook there, but
 * with the main checkout's hooks (`-c core.hooksPath`), and it refuses a push whose new commits or
 * uncommitted changes touch a path the gate runs: the guard refuses Edit and Write to them, not
 * Bash. The push and its gate run the branch's code, so they get an allow-listed environment,
 * never the daemon's own. The commit checks run in the main checkout with hooks off.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";

import { escalate, move, TERMINAL } from "../board.mjs";
import { classify, SHARED_WINDOW_MS } from "../classify.mjs";
import { identify } from "../proc.mjs";
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
 * but the green SHA (not checked when `greenSha` is null).
 * @param {string} dir the main checkout
 * @param {string} sha the commit
 * @param {string | null} greenSha the green SHA
 * @param {Record<string, string | undefined>} env the environment the message check reads
 * @returns {Promise<string[]>} the reasons
 */
async function commitReasons(dir, sha, greenSha, env) {
    const reasons = [];
    const short = sha.slice(0, 9);
    const [sig, ...message] = (await git(dir, ["log", "-1", "--format=%G?%n%B", sha])).split("\n");
    if (sig !== "G") reasons.push(`commit ${short} is not signed with a good signature (${sig})`);
    for (const r of checkOutgoing(message.join("\n"), env)) reasons.push(`commit ${short}'s message ${r}`);
    if (greenSha === null) return reasons;
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

/**
 * The gate's duration before one has been measured, and the least a push is bounded by: a push is
 * bounded at twice the longest of this and the recent successful gates, so a gate the Nx cache
 * made fast never cuts the next, cold one short.
 */
const DEFAULT_GATE_MS = 30 * 60_000;
/** How many recent successful gate durations are kept. */
const GATE_RUNS = 5;

/**
 * Paths that decide what the pre-push gate runs, or that githerd and its hooks are made of. A push
 * whose new commits change one, or whose worktree has uncommitted changes to one, is refused: the
 * gate must run exactly as for a person (design 4.8), and the guard refuses only Edit and Write to
 * them, not a Bash command.
 * ponytail: the root package.json's `prepush:fast` script also points at the gate; it is not on the
 * list because jobs change package.json for dependencies. Compare that one script if it matters.
 */
const GATE_PATHS = [
    ".husky/",
    "tools/prepush.sh",
    "tools/lfs-pre-push.sh",
    "tools/scan-secrets.sh",
    "tools/sonar-gate.mjs",
    "tools/sonar/",
    "githerd/",
    ".claude/",
    ".github/workflows/",
];

/**
 * @typedef {object} PushEntry one push in the queue, kept in `state.pushQueue.entries`
 * @property {string} id `push-<n>`, what the job's `waitingFor.push` names
 * @property {string} job the job
 * @property {string} branch the remote branch
 * @property {string} head the commit pushed: the worker's `expectHead`
 * @property {string} worktree the job's worktree, where git push runs
 * @property {number} rank 0 incident fixes, 1 pushes to an open pull request, 2 the rest
 * @property {string} queuedAt when it was queued
 * @property {"queued" | "running"} status where it is
 * @property {number | null} pid the running push's process group, null while queued
 * @property {string | null} [startTime] that process's start time, so a pid a later process reuses
 *   is never taken for the push
 */

/**
 * The process groups of a job's pushes that are running now: each recorded pid whose process still
 * has the recorded start time. A pid from before a githerd restart, since reused, is not one.
 * @param {any} state the daemon state
 * @param {string} job the job
 * @returns {number[]} the groups' leaders
 */
export function livePushGroups(state, job) {
    return (state.pushQueue?.entries ?? [])
        .filter((/** @type {PushEntry} */ e) => e.job === job && livePush(e))
        .map((/** @type {PushEntry} */ e) => /** @type {number} */ (e.pid));
}

/**
 * Whether an entry's recorded push process still runs.
 * @param {PushEntry} e the entry
 * @returns {boolean} true when its pid has its recorded start time
 */
function livePush(e) {
    return Boolean(e.pid && e.startTime && identify(e.pid)?.startTime === e.startTime);
}

/**
 * A worktree's HEAD, or null when it cannot be read.
 * @param {string} dir the worktree
 * @returns {Promise<string | null>} the commit
 */
async function worktreeHead(dir) {
    const r = await exec("git", [...SAFE, "rev-parse", "HEAD"], { cwd: dir });
    return r.code === 0 ? r.stdout.trim() : null;
}

/**
 * The queue rank of a job's push (design 4.8): incident fixes first, then pushes to a job's open
 * pull request, which finish work that only waits on them, then the rest.
 * @param {any} job the job
 * @returns {number} the rank, lowest first
 */
const rank = (job) => {
    if (job.kind === "incident") return 0;
    return job.pr ? 1 : 2;
};

/**
 * The push queue (design section 4.8). Its entries, the measured gate duration and the recent gate
 * failures live in `state.pushQueue`, so the board shows them and they are saved with the state.
 * Entries saved as `running` by a githerd that has since stopped are recovered when the queue is
 * made: the push is killed if its process still runs, the job is told it was interrupted and goes
 * back to work, and the queued entries start.
 * @param {{
 *   root: string,
 *   state: any,
 *   ledger: (entry: {kind: string} & Record<string, unknown>) => unknown,
 *   save?: () => Promise<unknown>,
 *   mode: (group: string) => string,
 *   ring?: (job: any, text: string) => Promise<unknown>,
 *   credentialBlocked?: () => string | null,
 *   defaultBranch?: string,
 *   remote?: string,
 *   env: Record<string, string>,
 *   secrets?: Record<string, string | undefined>,
 *   hooksPath?: string,
 *   protectedPaths?: () => string[],
 *   defaultGateMs?: number,
 *   now?: () => Date,
 * }} options `root` is the main checkout, where commits are checked; `mode` answers a write
 *   group's mode (pushes are group `workers`); `ring` delivers a result to the job's session (the
 *   doorbell); `credentialBlocked` names a blocked credential, or null; `env` is the whole
 *   environment of the push and its gate, which run the branch's code: an allow-list
 *   (`codeEnv` in worker-settings.mjs), never the daemon's own, which holds the notify keys;
 *   `secrets` are the values the outgoing check refuses; `hooksPath` the hooks the push runs, the
 *   main checkout's `.husky/_` by default, never the worktree's; `protectedPaths` reads the
 *   config's list, refused like the gate's own paths
 * @returns {{
 *   request: (args: {job: string, branch: string, expectHead: string}, session: string | null) =>
 *     Promise<{queued: true, position: number, estimateMinutes: number} | {ok: false, reason: string}>,
 *   depth: () => number,
 *   drain: () => Promise<void>,
 *   stop: () => void,
 * }} `request` is `githerd_push`; `depth` counts pushes waiting to run; `drain` resolves when the
 *   queue is empty; `stop` kills a running push's process group
 */
export function createPushQueue({
    root,
    state,
    ledger,
    save = async () => {},
    mode,
    ring = async () => {},
    credentialBlocked = () => null,
    defaultBranch = "master",
    remote = "origin",
    env,
    secrets = {},
    hooksPath = join(root, ".husky", "_"),
    protectedPaths = () => [],
    defaultGateMs = DEFAULT_GATE_MS,
    now = () => new Date(),
}) {
    if (!env) throw new TypeError("createPushQueue needs the push's allow-listed environment");
    state.pushQueue ??= { next: 1, entries: [], failures: [] };
    const q = state.pushQueue;
    q.gateRuns ??= [];
    /** @type {Promise<unknown> | null} */
    let running = null;

    const gateMs = () => Math.max(defaultGateMs, ...q.gateRuns);
    /**
     * The entries in the order they run: by rank, then by when they were queued.
     * @returns {PushEntry[]} the entries
     */
    const ordered = () =>
        [...q.entries].sort((a, b) => a.rank - b.rank || Date.parse(a.queuedAt) - Date.parse(b.queuedAt));

    /**
     * Why a push request is refused, or null.
     * @param {any} job the job, if it exists
     * @param {{job: string, branch: string, expectHead: string}} args the request
     * @param {string | null} session the calling session
     * @returns {Promise<string | null>} the reason
     */
    async function refusal(job, { job: id, branch, expectHead }, session) {
        if (!job) return `no job ${id}`;
        if (!job.claim || !session || job.holder?.session !== session) {
            return `no claim: this session does not hold ${id}; claim it with githerd_claim first`;
        }
        if (job.state !== "working") return `${id} is ${job.state}, not working`;
        if (job.news.some((/** @type {any} */ n) => !n.acked)) return "unacknowledged news: read your news first";
        const blocked = credentialBlocked();
        if (blocked) return `credential blocked: ${blocked}`;
        if (branch === defaultBranch) return `wrong branch: never the default branch ${defaultBranch}`;
        if (job.branch && job.branch !== branch) return `wrong branch: ${id} pushes ${job.branch}`;
        if (!job.branch && !branch.startsWith("githerd/")) return "wrong branch: a new branch is githerd/<name>";
        if (q.entries.some((/** @type {PushEntry} */ e) => e.job === id)) return `${id} already has a push queued`;
        if (!job.worktree) return `${id} has no worktree`;
        const head = await worktreeHead(job.worktree);
        if (head !== expectHead) return `expectHead ${expectHead} is not the worktree's HEAD ${head ?? "(none)"}`;
        return null;
    }

    /**
     * `githerd_push`: checks the request, queues the push and sets the job waiting on it.
     * @type {ReturnType<typeof createPushQueue>["request"]}
     */
    async function request(args, session) {
        const job = state.jobs?.[args.job];
        const reason = await refusal(job, args, session);
        if (reason) return { ok: false, reason };
        /** @type {PushEntry} */
        const entry = {
            id: `push-${q.next++}`,
            job: job.id,
            branch: args.branch,
            head: args.expectHead,
            worktree: job.worktree,
            rank: rank(job),
            queuedAt: now().toISOString(),
            status: "queued",
            pid: null,
            startTime: null,
        };
        q.entries.push(entry);
        job.branch = args.branch;
        const position =
            ordered()
                .filter((e) => e.status === "queued")
                .indexOf(entry) + (running === null ? 1 : 2);
        // The worker is idle while its push waits and runs; the wait is bounded by the gate.
        move(job, "waiting", now(), { waitingFor: { push: entry.id }, boundMs: 2 * gateMs() * position });
        await ledger({ kind: "push-queued", job: job.id, branch: entry.branch, head: entry.head, position });
        await save();
        pump();
        return { queued: true, position, estimateMinutes: Math.ceil((position * gateMs()) / 60_000) };
    }

    /** Starts the next push when none runs. */
    function pump() {
        if (running !== null) return;
        const next = ordered().find((e) => e.status === "queued");
        if (!next) return;
        running = runEntry(next)
            .catch((err) => ledger({ kind: "fault", what: "push queue", error: String(err?.message ?? err) }))
            .finally(() => {
                running = null;
                pump();
            });
    }

    /**
     * Runs one push and delivers its result.
     * @param {PushEntry} e the entry
     */
    async function runEntry(e) {
        e.status = "running";
        await save();
        const job = state.jobs?.[e.job];
        let text;
        if (!job) text = `${e.job} is gone; nothing was pushed`;
        else if (TERMINAL.includes(job.state)) text = `${e.job} is ${job.state}; nothing was pushed`;
        else {
            try {
                text = await attempt(e, job);
            } catch (err) {
                text = `push failed: githerd could not run it: ${/** @type {Error} */ (err).message}`;
            }
        }
        q.entries = q.entries.filter((/** @type {PushEntry} */ x) => x !== e);
        if (job) {
            const t = now();
            job.news.push({ at: t.toISOString(), text, acked: false });
            if (job.state === "waiting" && job.waitingFor?.push === e.id) move(job, "working", t);
            await ring(job, text);
        }
        await save();
    }

    /**
     * Checks and pushes one entry.
     * @param {PushEntry} e the entry
     * @param {any} job its job
     * @returns {Promise<string>} the result, as the job's news line
     */
    async function attempt(e, job) {
        const head = await worktreeHead(e.worktree);
        if (head !== e.head) return `push refused: the worktree's HEAD moved from ${e.head} to ${head}; push again`;
        const reasons = [];
        const shas = lines(await git(root, ["rev-list", e.head, "--not", `--remotes=${remote}`]));
        for (const sha of shas) {
            reasons.push(...(await commitReasons(root, sha, null, secrets)));
            const patch = await git(root, ["show", "--format=", "--no-color", "--no-ext-diff", "-U0", sha]);
            const added = patch.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++ "));
            for (const r of checkOutgoing(added.join("\n"), secrets)) {
                reasons.push(`commit ${sha.slice(0, 9)}'s diff ${r}`);
            }
        }
        reasons.push(...(await gateReasons(e, shas)));
        if (reasons.length) {
            await ledger({ kind: "push-refused", job: job.id, branch: e.branch, head: e.head, reasons });
            return `push refused: ${reasons.join("; ")}`;
        }
        const op = `push ${e.head} to ${remote} ${e.branch}`;
        if (mode("workers") !== "acting") {
            await ledger({ kind: "would-do", op, job: job.id, target: job.target });
            return `would push ${e.head} to ${e.branch} (dry-run): nothing was pushed`;
        }
        const started = performance.now();
        const r = await pushChild(e);
        if (r.code === 0) {
            q.gateRuns = [...q.gateRuns, Math.round(performance.now() - started)].slice(-GATE_RUNS);
            job.pushedHead = e.head;
            state.pushedByGitherd ??= {};
            state.pushedByGitherd[e.head] = job.target;
            await ledger({ kind: "action", op, job: job.id, target: job.target });
            return `pushed ${e.head} to ${e.branch}`;
        }
        return failed(e, job, r);
    }

    /**
     * Why the gate would not run as for a person: a new commit changes a path the gate runs or
     * githerd is made of (a path whose content equals the default branch's is the branch's merge
     * of it, not a change), or the worktree has uncommitted changes to one.
     * @param {PushEntry} e the entry
     * @param {string[]} shas the commits the remote does not have
     * @returns {Promise<string[]>} the reasons
     */
    async function gateReasons(e, shas) {
        const guarded = [...GATE_PATHS, ...protectedPaths()];
        const changed = new Set();
        for (const sha of shas) {
            const out = await git(root, [
                "diff-tree",
                "-r",
                "-m",
                "--first-parent",
                "--no-commit-id",
                "--name-only",
                sha,
            ]);
            for (const p of lines(out)) if (isProtected(p, guarded)) changed.add(p);
        }
        const reasons = [];
        const master = `refs/remotes/${remote}/${defaultBranch}`;
        for (const p of changed) {
            const at = (/** @type {string} */ rev) =>
                exec("git", [...SAFE, "rev-parse", "-q", "--verify", `${rev}:${p}`], { cwd: root });
            const [mine, theirs] = await Promise.all([at(e.head), at(master)]);
            // The same blob, or absent from both: the default branch's content, not this branch's change.
            if (mine.code === theirs.code && mine.stdout === theirs.stdout) continue;
            reasons.push(`it changes ${p}, which decides what the gate runs or is githerd's own`);
        }
        const dirty = await exec("git", [...SAFE, "status", "--porcelain", "--", ...guarded], { cwd: e.worktree });
        if (dirty.code !== 0 || dirty.stdout.trim()) {
            const what = dirty.stdout.trim().split("\n").slice(0, 3).join(", ") || dirty.stderr.trim();
            reasons.push(`the worktree has uncommitted changes to gate paths: ${what}`);
        }
        if (!existsSync(join(hooksPath, "pre-push"))) reasons.push(`no pre-push hook in ${hooksPath}`);
        return reasons;
    }

    /**
     * Runs `git push` in the job's worktree with the main checkout's hooks (never the worktree's,
     * which the worker can write), as a child of the daemon leading its own process group, so a
     * worker's death never touches it and a timeout or `stop` kills the gate with every child it
     * started. Bounded at twice the longest recent gate, never less than twice the default.
     * @param {PushEntry} e the entry
     * @returns {Promise<{code: number, out: string, timedOut: boolean}>} the exit code and output
     */
    function pushChild(e) {
        return new Promise((resolve) => {
            let out = "";
            let timedOut = false;
            const child = spawn(
                "git", // NOSONAR(S4036): the owner's git from his own PATH, as tools/ runs it
                ["-c", `core.hooksPath=${hooksPath}`, "push", remote, `${e.head}:refs/heads/${e.branch}`],
                { cwd: e.worktree, env, detached: true, stdio: ["ignore", "pipe", "pipe"] },
            );
            e.pid = child.pid ?? null;
            e.startTime = e.pid ? (identify(e.pid)?.startTime ?? null) : null;
            const timer = setTimeout(() => {
                timedOut = true;
                kill(e.pid);
            }, 2 * gateMs());
            child.stdout.on("data", (d) => (out += d));
            child.stderr.on("data", (d) => (out += d));
            const done = (/** @type {number} */ code) => {
                clearTimeout(timer);
                e.pid = null;
                e.startTime = null;
                resolve({ code, out: stripVTControlCharacters(out), timedOut });
            };
            child.on("error", (err) => {
                out += err.message;
                done(1);
            });
            child.on("close", (code) => done(code ?? 1));
        });
    }

    /**
     * Classifies a failed push (design 4.4) under a local failure key: the gate's first failed step,
     * or the push itself when the gate passed or never ran. A key that failed for another job within
     * the shared window, or that also fails on the green commit, is shared.
     * @param {PushEntry} e the entry
     * @param {any} job its job
     * @param {{code: number, out: string, timedOut: boolean}} r the push's result
     * @returns {Promise<string>} the news line
     */
    async function failed(e, job, r) {
        const gate = r.out.includes("Pre-push validation failed");
        const steps = [...r.out.matchAll(/^\[FAIL\] (.+)$/gm)].map((m) => m[1].trim());
        const name = gate ? "gate" : "push";
        const f = { workflow: "local", job: name, steps: steps.length ? steps : [name], log: r.out };
        const t = now().getTime();
        q.failures = q.failures.filter((/** @type {any} */ x) => t - x.at < SHARED_WINDOW_MS);
        const { key } = classify(f);
        const others = new Set(
            q.failures
                .filter((/** @type {any} */ x) => x.key === key && x.job !== job.id)
                .map((/** @type {any} */ x) => x.job),
        ).size;
        const green = state.reference?.gate;
        const failsOnGreen = green?.verdict === "fail" && green.steps.includes(f.steps[0]);
        const v = r.timedOut
            ? { class: "outside", key, reason: `timed out after ${Math.round((2 * gateMs()) / 60_000)} minutes` }
            : classify(f, { others, failsOnGreen });
        q.failures.push({ key, job: job.id, at: t });
        const last = r.out.trim().split("\n").at(-1) ?? "";
        await ledger({ kind: "push-failed", job: job.id, branch: e.branch, head: e.head, ...v, tail: last });
        return gate
            ? `gate failed ${v.key} (${v.class}: ${v.reason})`
            : `push failed (${v.class}: ${v.reason}): ${last}`;
    }

    /**
     * Kills a process group, ignoring one that is already gone.
     * @param {number | null} pid the group's leader
     */
    function kill(pid) {
        if (!pid) return;
        try {
            process.kill(-pid, "SIGKILL");
        } catch {
            // Already gone.
        }
    }

    /**
     * Resolves once no push runs and none is queued behind it.
     * @returns {Promise<void>} when the queue is empty
     */
    async function drain() {
        if (running === null) return;
        await running;
        await drain();
    }

    /**
     * Recovers the entries a stopped githerd left `running`: their result is lost with it, so the
     * push is killed if it still runs, the entry dropped, and the job told to check the remote and
     * push again. Then the queued entries start, which nothing else would start until a new request.
     */
    function recover() {
        const t = now();
        const interrupted = q.entries.filter((/** @type {PushEntry} */ x) => x.status === "running");
        for (const e of interrupted) {
            if (livePush(e)) kill(e.pid);
            q.entries = q.entries.filter((/** @type {PushEntry} */ x) => x !== e);
            const job = state.jobs?.[e.job];
            void ledger({ kind: "push-interrupted", job: e.job, branch: e.branch, head: e.head });
            if (!job) continue;
            job.news.push({
                at: t.toISOString(),
                text:
                    `your push of ${e.head} to ${e.branch} was interrupted by a githerd restart; ` +
                    "check the remote head and push again",
                acked: false,
            });
            if (job.state === "waiting" && job.waitingFor?.push === e.id) move(job, "working", t);
        }
        for (const e of q.entries) Object.assign(e, { pid: null, startTime: null });
        // Saved only when something changed; a pump that starts a push saves on its own.
        if (interrupted.length) void save();
        pump();
    }
    recover();

    return {
        request,
        depth: () => q.entries.filter((/** @type {PushEntry} */ e) => e.status === "queued").length,
        drain,
        stop() {
            for (const e of q.entries) if (livePush(e)) kill(e.pid);
        },
    };
}
