/**
 * The githerd daemon (design section 3.2): one long-lived process per repository that polls
 * GitHub (design section 6), keeps `state.json` and the ledger, answers the session tools over
 * HTTP and pages the owner only through owner items (design 11.3): something only the owner can
 * do, paged by `planPages` in notify.mjs by his presence, batched, and again only on a change.
 *
 * HTTP, on 127.0.0.1 only:
 * - `GET /health`: the fields launchers use to decide whether this daemon is usable.
 * - `POST /rpc`: MCP JSON-RPC; `X-Githerd-Session` names the calling session.
 * - `POST /heartbeat`: `{session, cwd, branch, typedAt}` registers or refreshes a session;
 *   `typedAt`, when the owner last typed into a session there, counts as presence.
 * - `POST /owner`: the owner's CLI. `{op: "ack", key}` clears an escalation, `{op: "veto", id}`
 *   vetoes closing an issue or pull request (`issue:<n>` or `pr:<n>`) for good.
 *
 * Presence (design 11.3) is recorded only from a request whose `X-Githerd-Caller` is `owner`, which
 * the CLI sends for an owner command (`status`, `ack`, `veto`) run from a plain terminal and never
 * from inside Claude Code, and never for the board's redraws.
 *
 * With `GITHERD_DEV` set (the development daemon of `githerd dev`), the mode never rises above
 * dry-run, whatever the config says, and pages go to the ledger only (as `delivered: false`), so
 * a second daemon never duplicates the shared daemon's pages; `GITHERD_DEV_NOTIFY=1` delivers
 * them, for testing the notifier. The `quiet` option (the one-poll check) does the same.
 *
 * Pages reach the owner's phone only while the `owner-items` write group is acting; until then
 * each one is recorded in the ledger as `delivered: false`, held. The one exception is the fatal
 * page ("githerd is DOWN"), which bypasses the hold: it is the owner's to act on. Owner items come
 * from: a red master found after a restart on rebuilt state, a failed urgent job, a state file
 * githerd could not read, and the escalations of kinds `decision`, `credential`, `approval` and
 * `visual-review` raised by the daemon. Nothing else pages: not an outage, not work in
 * progress, not anything githerd is handling.
 *
 * Trust: the only author githerd acts on is the account gh is logged in as. Every poll asks GitHub
 * for that login (`gh api user`) and keeps it in `state.trust.login`; it starts null at every start
 * and is never read from the config. While it is unresolved no worker starts and a `blocked`
 * escalation stays open.
 *
 * State lives in `~/.githerd/<repository>/` (design section 9.1), whatever the cwd.
 *
 * Start (design section 9.2): take the lock (`lock`: pid, start time, cwd), or exit when a live
 * daemon holds it; a stale lock is taken. Then record the start in `starts`: the third start within
 * 10 minutes boots straight into fatal mode with the last exception as the reason. A PID 1 start
 * time other than the one in the previous `alive` means the container restarted, and every recorded
 * worker pid and pane is void. After loading state, the spool of hook events left while the daemon was down is
 * drained into the ledger.
 *
 * Fencing: before every poll and every state write the daemon reads the lock again; when it names
 * another live process, this daemon stops without writing anything. After binding it writes
 * `daemon.json` with its identity and port for the launcher and the CLI.
 *
 * Liveness (design section 9.4): `alive` is rewritten every 10 s by a timer of its own, so slow
 * work never looks like death; `progress` names the step the daemon is in and since when.
 *
 * Fatal mode (design section 9.6): on a crash loop, or an uncaught exception or rejection when
 * `fatalOnUncaught` is set (the daemon process sets it), the daemon writes `FATAL`, stops polling,
 * keeps answering `/health` with the reason, answers every other request with 503 "githerd is
 * DOWN: <reason>", and pages once. The next start that is not a crash loop clears it.
 */

import { execFile } from "node:child_process";
import { accessSync, constants, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { basename, delimiter, join } from "node:path";
import { homedir } from "node:os";
import { inspect } from "node:util";

import { createPushQueue } from "./actor/push.mjs";
import * as board from "./board.mjs";
import { groupModes } from "./board-text.mjs";
import { createConfigGate, openConfigRevert } from "./config-adopt.mjs";
import { effectiveMode, MODELS } from "./config.mjs";
import { createGitHub, GitHubError } from "./github.mjs";
import { answerHook, staleSpooled, writeNews } from "./hook.mjs";
import { pollIssues } from "./issues.mjs";
import { syncJobs } from "./jobs.mjs";
import { checkFaults, noteGitHubChanges, settleWaits, tickJobs, waitNews } from "./advance.mjs";
import { endIdleSessions, fillSlots, isUrgent, realPlatform, refreshGuards, tidyEndedJobs } from "./start.mjs";
import { findSuspects, masterVerdict, releaseState, updateLane } from "./master.mjs";
import { gateLocked, launcherContext, prepareUpdate, reapStaleGate, servherd, targetCode } from "./launcher.mjs";
import { doneIo, pollVerifying } from "./done.mjs";
import { classify } from "./classify.mjs";
import { createIncidentActions, laneNotProgressing } from "./incident-actions.mjs";
import { failureKey, notePickups, queueAges } from "./lanes.mjs";
import { createMcpServer, servedProtocols } from "./mcp.mjs";
import { accumulateMerged, searchMerged } from "./merged.mjs";
import { sessionWriteCheck } from "./session-writes.mjs";
import { foldHead, mergeGateChecks, npmLookup, openPr, postMergeStatuses, readDependencies } from "./merge-status.mjs";
import { createNotifier, endItem, notePresence, ownerItemsPoll, presentDays, raiseItem } from "./notify.mjs";
import { activePolicies, CONTROL_OPS, controlCommand, ownerCommand, resumeAnswered } from "./owner.mjs";
import { containerStart, identify } from "./proc.mjs";
import { advanceProposals, veto } from "./proposals.mjs";
import { patchId, RELEASE_INPUTS, touches, updatePrs, whyStuck } from "./prs.mjs";
import { nextStackRecord, upkeepStacks } from "./upkeep.mjs";
import { NEXT, SKIP } from "./queue.mjs";
import {
    appendLedger,
    clearFatal,
    CRASH_LOOP,
    defaultStateDir,
    drainSpool,
    loadState,
    otherHolder,
    readLedger,
    readLiveness,
    recordLines,
    recordStart,
    releaseLock,
    saveState,
    takeLock,
    writeAlive,
    writeFatal,
    writeProgress,
} from "./store.mjs";
import { recoverDeath } from "./session-death.mjs";
import { resumeVerified } from "./selftest.mjs";
import { stopGating, updateGate } from "./self-update.mjs";
import { secretValues } from "./text.mjs";
import { sessionToolSet } from "./session-tools.mjs";
import { alertBanner, statusData } from "./tools.mjs";
import { ring as ringWorker, running } from "./tmux.mjs";
import { readVersion } from "./version.mjs";
import { endRetired, watchPass, watchWanted } from "./watchdog.mjs";
import { codeEnv, readSigningEnv } from "./worker-settings.mjs";
import {
    changedFiles,
    referenceAudit,
    referenceDryRun,
    referenceGate,
    refreshReference,
    removeJobWorktree,
} from "./worktrees.mjs";

/** A green commit older than this, while merges go on past it, holds merges (design 4.7). */
const STARVATION_MS = 6 * 3_600_000;
/** How the reference worktree is installed and built (design 4.9). */
const REFERENCE_SETUP = ["sh", "-c", "pnpm install --frozen-lockfile && pnpm exec nx run-many -t build"];
/** How often the watchdog looks at the workers (design 7.5). */
const WATCH_MS = 60_000;

/** The /health protocol; a launcher uses a daemon only when the major matches. */
export const PROTOCOL = 1;

/** Every git and gh call is killed after this long. */
const GIT_TIMEOUT_MS = 60_000;
/** GitHub unreachable this long raises a `blocked` escalation. */
const GITHUB_DOWN_MS = 30 * 60_000;
/** Largest request body accepted. */
/** How many handled hook event ids are remembered, to skip a spooled copy of one. */
const HOOK_IDS = 500;
/** `POST /owner` ops that put the owner's words or decisions on record: only from his terminal. */
const OWNER_WORDS = new Set(["answer", "order", "policy", "policy-end", "veto", "ack"]);
/** How the news of a refused `githerd_done` starts (board.verifyResult). */
const NOT_DONE = "not done yet: ";
const MAX_BODY = 1024 * 1024;
/** Where the issue poll starts on a fresh state: the whole history, read 10 pages per poll. */
const ISSUES_START = "1970-01-01T00:00:00Z";

const RED_JOB = new Set(["failure", "timed_out", "startup_failure"]);
/**
 * The least a queued job waits before its lane counts as not progressing: the worst pickup seen on
 * the rented GPU label from 09-18 to 10-03, 926 s (design 3.10). A label whose worst pickup is
 * longer is held to that.
 */
const PICKUP_FLOOR_MS = 926_000;
/** The owner item of each failure class on a master lane that is not code (design 4.4). */
const PARKED_ITEMS = /** @type {Record<string, string>} */ ({
    "paid-capacity": "cannot get a rented runner",
    credential: "fails on a credential",
});
/** Escalation kinds that are owner items, and what each blocks (design 11.3). */
const ITEM_KINDS = /** @type {Record<string, "workers" | null>} */ ({
    decision: null,
    credential: "workers",
    approval: null,
    "visual-review": null,
});
/**
 * The labels honored only when the owner's account applied them (the issue's events): the owner's
 * overrides, and `priority:critical`, which Mergify puts first and a red lane's hold lets through.
 * Workers act as the owner's account too; the guard lets only an incident's worker set it.
 */
const CRITICAL = "priority:critical";
const OVERRIDES = new Set([NEXT, SKIP, CRITICAL]);

/**
 * The open pull requests and the default branch's head (design section 6.1).
 * ponytail: first 50 PRs only; page with `after` when the open queue grows past 50
 */
const PRS_QUERY = `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef { name target { oid } }
    pullRequests(states: OPEN, first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        id number title isDraft createdAt updatedAt headRefName headRefOid baseRefName
        mergeable mergeStateStatus
        autoMergeRequest { enabledAt }
        labels(first: 20) { nodes { name } }
        closingIssuesReferences(first: 10) { nodes { number } }
        author { login }
        commits(last: 1) { nodes { commit {
          committedDate
          statusCheckRollup { contexts(first: 100) { nodes {
            __typename
            ... on CheckRun { name status conclusion startedAt databaseId }
            ... on StatusContext { context state }
          } } }
        } } }
      }
    }
  }
}`;

/**
 * @typedef {(args: string[], options: {cwd: string, env: Record<string, string | undefined>,
 *   timeoutMs: number}) => Promise<{code: number, stdout: string, stderr: string}>} GitExec
 */

/**
 * Runs git with no prompts and a timeout.
 * @type {GitExec}
 */
function gitExec(args, { cwd, env, timeoutMs }) {
    return new Promise((resolve) => {
        const options = { cwd, env, timeout: timeoutMs, killSignal: /** @type {const} */ ("SIGKILL") };
        execFile(
            "git", // NOSONAR(S4036): the owner's git from his own PATH, as tools/ runs it
            args,
            options,
            (err, stdout, stderr) => {
                const e = /** @type {any} */ (err);
                let code = 0;
                if (e) code = typeof e.code === "number" ? e.code : 1;
                resolve({ code, stdout: String(stdout), stderr: String(stderr) });
            },
        );
    });
}

/**
 * Whether the notify command can be run: the doctor's check of design section 5.5.
 * @param {string[] | null} command the configured command
 * @param {Record<string, string | undefined>} env the environment, for PATH
 * @returns {string | null} why it cannot run, or null when it can (or none is configured)
 */
export function notifyCommandProblem(command, env) {
    if (command === null) return null;
    let bin = command[0];
    if (bin === "~" || bin.startsWith("~/")) bin = homedir() + bin.slice(1);
    const candidates = bin.includes("/")
        ? [bin]
        : (env.PATH ?? "")
              .split(delimiter)
              .filter(Boolean)
              .map((dir) => join(dir, bin));
    for (const path of candidates) {
        try {
            accessSync(path, constants.X_OK);
            return null;
        } catch {
            // try the next one
        }
    }
    return `notify command not found or not executable: ${command[0]}`;
}

/**
 * Reads the local mode override, `<state dir>/override.json`.
 * @param {string} dir the state directory
 * @returns {string | null} the override's mode
 */
function readOverride(dir) {
    try {
        return JSON.parse(readFileSync(join(dir, "override.json"), "utf8")).mode ?? null;
    } catch {
        return null;
    }
}

/**
 * The first line of a text, for surfaces that show one line.
 * @param {string} text the text
 * @returns {string} its first line
 */
const firstLine = (text) => text.split("\n", 1)[0];

/**
 * Today's next incident id.
 * @param {Record<string, any>} incidents the incident records
 * @param {string} iso the current time
 * @returns {string} for example inc-20261002-1
 */
function nextIncidentId(incidents, iso) {
    const prefix = `inc-${iso.slice(0, 10).replaceAll("-", "")}-`;
    const used = Object.keys(incidents).filter((id) => id.startsWith(prefix)).length;
    return `${prefix}${used + 1}`;
}

/**
 * The crash-loop check of design 9.2: only a start that found a stale lock follows an unclean
 * exit (a clean stop releases the lock), so only such a start is recorded, and the third within
 * 10 minutes boots into fatal mode. Any other start clears `FATAL`.
 * @param {string} stateDir the state directory
 * @param {any} stale the stale lock record taken, or null
 * @param {Date} at the start time
 * @returns {Promise<string | null>} the fatal reason to boot with, or null
 */
async function crashLoop(stateDir, stale, at) {
    if (!stale || !recordStart(stateDir, at).crashLoop) {
        clearFatal(stateDir);
        return null;
    }
    const exceptions = (await readLedger(stateDir)).filter((e) => e.kind === "exception");
    const last = exceptions.at(-1)?.stack ?? "none recorded";
    return `crash loop: ${CRASH_LOOP.starts} starts within 10 minutes; last exception: ${last}`;
}

/**
 * Keeps what the merge decision needs on a lane record: the workflow's own name (CI, GPU,
 * Hosts), which is how the decision knows a lane, and when its red stretch began.
 * @param {any} lane the lane record, changed in place
 * @param {string | undefined} runName the name on the lane's newest run
 * @param {number} ms the poll's time
 */
function noteLaneName(lane, runName, ms) {
    if (runName) lane.workflowName = runName;
    if (lane.verdict !== "red") {
        delete lane.redSince;
        delete lane.redClass;
        delete lane.redReason;
        delete lane.redJobs;
        delete lane.classifiedFor;
    } else lane.redSince ??= lane.updatedAt ?? new Date(ms).toISOString();
}

/**
 * Whether a red lane counts as code red: classified `code`, or not classified yet (fail closed).
 * Paid capacity, credential, outside and drift park the lane instead (design 4.4).
 * @param {any} lane the lane record
 * @returns {boolean} true for code red
 */
const codeRed = (lane) => (lane.redClass ?? "code") === "code";

/**
 * Describes an incident's failing lanes for an owner item.
 * @param {any} incident the incident record
 * @returns {string} for example "ci (Build, Lint) at abc123456"
 */
function describeIncident(incident) {
    const lanes = Object.entries(incident?.lanes ?? {}).map(([lane, l]) =>
        /** @type {any} */ (l).failingJobs?.length
            ? `${lane} (${/** @type {any} */ (l).failingJobs.join(", ")})`
            : lane,
    );
    const where = incident?.redSha ? ` at ${incident.redSha.slice(0, 9)}` : "";
    return `${lanes.join(", ") || "a gating lane"}${where}`;
}

/**
 * Whether a code-red key's procedure is done for the daemon: an outcome other than waiting, with
 * the issue or revert pull request it calls for already made (a would-do or a failed try leaves it
 * to be made on a later reconcile).
 * @param {{outcome?: string, issue?: number | null, revertPr?: number | null}} rec the key's record
 * @returns {boolean} true when nothing is left to do
 */
function settled(rec) {
    if (!rec.outcome || rec.outcome === "waiting") return false;
    if (rec.outcome === "intermittent") return Boolean(rec.issue);
    if (rec.outcome === "revert") return Boolean(rec.revertPr);
    return true;
}

/**
 * Clears every job's holder after a container restart: its pid, pane and window belong to a
 * process that no longer exists, and its loss is the platform's, not the job's.
 * @param {any} state the daemon state
 * @param {boolean} restarted the container restarted since the last daemon
 * @returns {string[]} the jobs whose holder was cleared
 */
function voidHolders(state, restarted) {
    if (!restarted) return [];
    const voided = [];
    for (const job of Object.values(state.jobs ?? {})) {
        if (!job.holder) continue;
        job.holder = null;
        job.watch = null;
        voided.push(job.id);
    }
    return voided;
}

/**
 * Starts the daemon.
 * @param {object} options what it runs on
 * @param {string} options.root the repository's main checkout
 * @param {number} options.port the port to bind on 127.0.0.1; 0 picks a free one
 * @param {import("./github.mjs").Exec} [options.exec] runs `gh`; the real one by default
 * @param {GitExec} [options.git] runs git; the real one by default
 * @param {() => Date} [options.now] the clock
 * @param {Record<string, string | undefined>} [options.env] the environment: `GITHERD_CONFIG`,
 *   `PATH`, and the secrets the outgoing-text check refuses
 * @param {string} [options.stateDir] where state lives; `~/.githerd/<root's name>` by default
 * @param {number} [options.aliveMs] how often `alive` is rewritten
 * @param {boolean} [options.fatalOnUncaught] enter fatal mode on an uncaught exception or rejection
 *   of this process instead of exiting; the daemon process sets it, tests that run in-process do not
 * @param {boolean} [options.autoPoll] poll at once and then on the timer; tests call `poll()`
 * @param {(line: string) => void} [options.log] one plain-ASCII line per event; stdout by default
 * @param {boolean} [options.quiet] record pages in the ledger without running the notify command
 * @param {boolean} [options.workers] false starts no worker session (the one-poll check and the
 *   self-update's protocol test); true by default
 * @param {Partial<import("./start.mjs").Platform>} [options.platform] overrides for what a worker
 *   start touches (tests pass fakes)
 * @param {import("./merge-status.mjs").NpmLookup} [options.npm] whether npm knows a package; the
 *   registry by default
 * @returns {Promise<Daemon>} the running daemon
 */
export async function startDaemon({
    root,
    port,
    exec,
    git = gitExec,
    now = () => new Date(),
    env = process.env,
    stateDir = defaultStateDir(root, env.HOME),
    aliveMs = 10_000,
    fatalOnUncaught = false,
    autoPoll = true,
    log = (line) => process.stdout.write(`${line}\n`),
    quiet = Boolean(env.GITHERD_DEV) && env.GITHERD_DEV_NOTIFY !== "1",
    workers: workersOn = true,
    platform: platformOptions = {},
    npm = npmLookup(),
}) {
    const startedAtDate = now();
    // The values every outgoing text is checked against: under env -i the daemon's own environment
    // no longer holds the repository's .env secrets a worker could read and quote.
    const secrets = secretValues(root, env);
    const startedAt = startedAtDate.toISOString();
    const self = identify(process.pid);
    const { version, codeHash } = readVersion();
    /** Resolves `done`. @type {(reason: {reason: string}) => void} */
    let finish = () => {};
    /** @type {Promise<{reason: string}>} */
    const done = new Promise((resolve) => {
        finish = resolve;
    });
    const say = (/** @type {string} */ level, /** @type {string} */ text) =>
        log(
            `${now()
                .toISOString()
                .replace(/\.\d{3}Z$/, "Z")} ${level} ${text}`,
        );

    mkdirSync(stateDir, { recursive: true });
    const lock = takeLock(stateDir, self);
    if (!lock.ok) {
        const { holder } = /** @type {{holder: any}} */ (lock);
        say("error", `the lock names live daemon pid ${holder.pid} (cwd ${holder.cwd}); exiting without writing`);
        finish({ reason: "fenced" });
        return /** @type {Daemon} */ ({ fenced: true, done });
    }
    const { stale } = /** @type {{stale: any}} */ (lock);
    if (stale) say("info", `took a stale lock from pid ${stale.pid ?? "unknown"}`);
    const previous = readLiveness(stateDir);
    /** @type {string | null} the fatal reason, the first line of which every refusal shows */
    let fatal = null;
    /** @type {string | null} set when booting into fatal mode, entered once the notifier exists */
    const bootFatal = await crashLoop(stateDir, stale, startedAtDate);
    const pid1Start = containerStart();
    const containerRestarted = Boolean(previous.alive?.pid1Start && previous.alive.pid1Start !== pid1Start);
    /**
     * Rewrites `progress`.
     * @param {string} name the step
     */
    const step = (name) => {
        try {
            writeProgress(stateDir, name, now().toISOString());
        } catch (err) {
            say("error", `progress: ${/** @type {Error} */ (err).message}`);
        }
    };
    /** Rewrites `alive`. */
    const beat = () => {
        try {
            writeAlive(stateDir, {
                pid: self.pid,
                startTime: self.startTime,
                version,
                pid1Start,
                at: now().toISOString(),
            });
        } catch (err) {
            say("error", `alive: ${/** @type {Error} */ (err).message}`);
        }
    };
    beat();
    step("start");

    const loaded = await loadState(stateDir, { now });
    const state = loaded.state;
    for (const err of loaded.errors) say("error", `state: ${err}`);
    board.resumeClocks(state, now());
    // When state was rebuilt, a red run older than the restart is not news (trackRed).
    if (loaded.recovery) state.recovery = loaded.recovery;
    state.master ??= { lanes: {} };
    state.master.lanes ??= {};
    state.incidents ??= {};
    state.issues ??= { since: null, byNumber: {} };
    state.merged ??= { lastScanAt: null, pending: [], closed: [] };
    state.rate ??= {};
    state.writes ??= { pending: [] };
    state.github ??= { downSince: null, lastError: null };
    state.schedule ??= {};
    // Resolved again by the first poll; a login saved by an earlier process is not trusted.
    state.trust = { login: null, resolvedAt: null, error: null, hidden: state.trust?.hidden ?? {} };
    if (containerRestarted)
        say("info", `the container restarted (PID 1 start time ${previous.alive.pid1Start} -> ${pid1Start})`);
    // After a container restart every recorded pid and pane is void (design 3.5, 9.2): a worker's
    // session did not die of anything the job did, so no death is counted; the job continues.
    const voided = voidHolders(state, containerRestarted);
    // A start this process did not finish (its preparation or its window, before the registry
    // answered) is githerd's own loss, not the job's: the job goes back to the queue.
    for (const job of Object.values(state.jobs ?? {})) {
        if (job.state === "starting" && !job.holder?.pane) {
            board.move(job, "queued", startedAtDate, { reason: "githerd restarted during the start" });
        }
    }

    let fenced = false;
    /** set once halt releases the lock: work that ends later must not write the state */
    let released = false;
    /** @type {Set<Promise<void>>} ledger appends not yet on disk */
    const writes = new Set();
    let stopping = false;
    /** @type {any} */
    let config = null;
    /** @type {string | null} */
    let configError = null;
    /** @type {any[]} the default branch's recent commits, head first; memory only */
    let commits = [];
    /** @type {string | null | undefined} `.mergify.yml` on the default branch; undefined until read */
    let mergify;
    let busy = false;
    /** @type {string | null} */
    let loopTickAt = null;
    /** @type {string | null} */
    let lastPollOkAt = null;
    /** @type {string | null} */
    let lastPollError = null;
    /** @type {string | null} */
    let nextPollAt = null;
    /** @type {NodeJS.Timeout | null} */
    let timer = null;
    /** @type {NodeJS.Timeout | null} the watchdog's interval, on only while a worker exists */
    let watchTimer = null;
    let intervalFactor = 1;
    /** @type {ReturnType<typeof createPushQueue> | null} the push queue, once made (ensurePushQueue) */
    let pushQueue = null;

    const mode = () => {
        if (!config) return "dry-run";
        const local = effectiveMode(config, readOverride(stateDir));
        return env.GITHERD_DEV ? effectiveMode({ mode: local }, "dry-run") : local;
    };
    /**
     * One write group's mode: the daemon's mode, lowered to `dry-run` for a group the config does
     * not switch on.
     * @param {string} group the write group
     * @returns {string} the mode
     */
    const writeMode = (group) => {
        const m = mode();
        return m === "acting" ? (groupModes(config, null)[group] ?? "dry-run") : m;
    };

    /**
     * Stops this daemon because another one owns the state directory.
     * @param {any} rec the other daemon's record
     */
    function fence(rec) {
        if (fenced) return;
        fenced = true;
        say("error", `the lock now names live daemon pid ${rec.pid}; exiting without writing`);
        void halt({ reason: "fenced" });
    }

    /**
     * Whether this daemon may still write: not stopped by the fence, not fenced now, and still
     * holding the lock (not halted).
     * @returns {boolean} true when writing is allowed
     */
    function mayWrite() {
        if (fenced || released || loaded.readOnly) return false;
        const rec = otherHolder(stateDir, self);
        if (rec) fence(rec);
        return !fenced;
    }

    /**
     * Appends a ledger entry unless fenced.
     * @param {{kind: string} & Record<string, unknown>} entry the entry
     * @returns {Promise<void>} resolves once written
     */
    const ledger = (entry) => {
        if (fenced) return Promise.resolve();
        const write = appendLedger(stateDir, entry, { now }).catch((err) => say("error", `ledger: ${err.message}`));
        writes.add(write);
        void write.finally(() => writes.delete(write));
        return write;
    };

    /** @type {Record<string, Map<string, string>>} the recorded collections as last put in the ledger */
    const recorded = {};

    /**
     * Saves the state unless fenced or read-only, after appending a record line to the ledger for
     * every record that changed since the last save, so the state can be rebuilt from the ledger
     * when both state files are lost. The first save of a process records every record once.
     * @returns {Promise<void>} resolves once saved
     */
    async function save() {
        if (!mayWrite()) return;
        for (const line of recordLines(state, recorded)) void ledger(line);
        await saveState(stateDir, state);
        writeChangedNews();
        if (client) {
            const file = join(stateDir, "etags.json");
            writeFileSync(`${file}.tmp`, JSON.stringify(client.etags));
            renameSync(`${file}.tmp`, file);
        }
    }

    /** @type {Map<string, string>} each job's news as last written to `jobs/<id>/news` */
    const newsWritten = new Map();

    /**
     * Writes the news file of every job whose news changed since it was last written, for the
     * job's PostToolUse hook (design 4.10).
     */
    function writeChangedNews() {
        for (const job of Object.values(state.jobs ?? {})) {
            const text = JSON.stringify(job.news ?? []);
            if (newsWritten.get(job.id) === text) continue;
            writeNews(join(stateDir, "jobs", job.id), job.news ?? []);
            newsWritten.set(job.id, text);
        }
    }

    /**
     * The ETags kept across restarts (`etags.json`), so a restarted daemon is answered with 304s.
     * @returns {Record<string, {etag: string, body: unknown}>} the record, empty when absent or unreadable
     */
    function readEtags() {
        try {
            return JSON.parse(readFileSync(join(stateDir, "etags.json"), "utf8"));
        } catch {
            return {};
        }
    }

    /**
     * Raises a daemon escalation; a key already open changes nothing.
     * @param {{key: string, kind: string, summary: string, detail?: string, target?: string,
     *   clearWhen?: string}} args the escalation
     * @returns {void}
     */
    function raise(args) {
        const r = board.escalate(state, args, { daemon: true }, now());
        if (r.existing) return;
        say("info", `escalation ${args.kind} ${args.key}: ${args.summary}`);
        void ledger({
            kind: "escalation",
            key: args.key,
            escalationKind: args.kind,
            summary: args.summary,
            raisedBy: "daemon",
        });
    }

    const configGate = createConfigGate({
        root,
        stateDir,
        env,
        readLedger: () => readLedger(stateDir, { since: new Date(0) }),
    });

    /**
     * Reads the config (design sections 3.4 and 9.7) through the adoption gate. An adopted config
     * replaces the running one; a refused or invalid one keeps the last good config, with a
     * `config-refused` escalation on the board, and a refused one gets its revert pull request once.
     * @returns {Promise<string | null>} the fatal reason when no good config was ever loaded, else null
     */
    async function readConfig() {
        const r = await configGate.check();
        if (r.fatal) {
            configError = r.fatal;
            say("error", `config: ${r.fatal}`);
            return r.fatal;
        }
        config = r.config;
        state.config = r.config;
        configError = null;
        let revertError = r.revertError;
        if (r.revert && r.refusal) {
            const branch = state.master.branch ?? "master";
            try {
                const number = await openConfigRevert({
                    github: github(),
                    repo: config.repo,
                    root,
                    branch,
                    reasons: r.revert,
                });
                configGate.recordRevert(r.refusal, { number, error: null });
                revertError = null;
            } catch (err) {
                revertError = /** @type {Error} */ (err).message;
                configGate.recordRevert(r.refusal, { number: null, error: revertError });
                say("error", `config revert: ${revertError}`);
            }
        }
        if (r.banner) {
            raise({ key: "config-refused", kind: "blocked", summary: r.banner, detail: r.banner });
            // The revert's failure shows on the board, not only in the log; the next check tries again.
            const open = state.escalations["config-refused"];
            open.detail = revertError
                ? `${r.banner}; the revert pull request failed to open: ${revertError}`
                : r.banner;
            say("error", `config: ${r.banner}`);
        } else if (state.escalations?.["config-refused"] && !state.escalations["config-refused"].resolvedAt) {
            board.resolve(state, { key: "config-refused" }, now());
        }
        return null;
    }

    const notifier = createNotifier({
        notify: () => {
            const notify = config?.notify ?? { command: null, maxPerHour: 6 };
            if (quiet) return { ...notify, command: null };
            if (env.GITHERD_DEV && env.GITHERD_DEV_NOTIFY === "1") return notify;
            const owner = config ? groupModes(config, readOverride(stateDir))["owner-items"] : "dry-run";
            return owner === "acting" ? notify : { ...notify, held: `held: owner items are ${owner}` };
        },
        state,
        ledger,
        now,
    });
    /** @type {ReturnType<typeof createGitHub> | null} */
    let client = null;
    /**
     * The GitHub client, made once a valid config names the repository.
     * @returns {ReturnType<typeof createGitHub>} the client
     */
    const github = () =>
        (client ??= createGitHub({
            repo: config.repo,
            exec,
            mode: writeMode,
            ledger,
            rate: state.rate,
            etags: readEtags(),
            writes: state.writes,
            env: secrets,
            now: () => now().getTime(),
            // What a caller recorded about a write is on disk before GitHub sees the write.
            persist: async () => {
                if (!mayWrite()) throw new GitHubError("refused", "another daemon owns the state directory");
                await save();
            },
        }));

    /** @type {string | null} set when no good config was ever loaded; entered at the end of the start */
    const configFatal = await readConfig();

    /**
     * What `githerd_done` and the verification poll read: git in the root, the GitHub client, npm.
     * @returns {import("./done.mjs").DoneIo} the reader
     */
    const doneReader = () =>
        doneIo({
            root,
            repo: config.repo,
            github: github(),
            branch: state.master.branch ?? "master",
            // A release incident's key is its escalation's; it holds while the escalation is open.
            releaseOpen: () =>
                Object.values(state.escalations ?? {})
                    .filter((e) => !e.resolvedAt && ["release-failed", "release-stalled"].includes(e.kind))
                    .map((e) => e.key),
            localGate: () => {
                const gate = state.reference?.gate;
                return gate ? { sha: gate.sha, passed: gate.verdict === "pass" } : null;
            },
        });

    /**
     * Raises the owner item of a red master that needs him: no worker can take its incident job, or
     * githerd restarted on rebuilt state into a red master. It blocks the release, so it pages even
     * while he is away.
     * @param {string} id the incident
     * @param {string} why what makes it his, appended to the incident's lanes
     */
    function masterRedItem(id, why) {
        const question = why.startsWith("githerd restarted")
            ? `${why}: ${describeIncident(state.incidents[id])}`
            : `master red: ${describeIncident(state.incidents[id])}; ${why}`;
        raiseItem(state, { id: `master-red:${id}`, kind: "master-red", question, blocks: "release" }, now());
    }

    /**
     * Keeps the escalation owner items in step with the escalations: one item per open escalation
     * of a kind in `ITEM_KINDS` raised by the daemon (an interactive session's own
     * escalation reaches the owner through that session), ended when the escalation resolves.
     */
    function escalationItems() {
        for (const esc of Object.values(state.escalations ?? {})) {
            const e = /** @type {any} */ (esc);
            const id = `escalation:${e.key}`;
            if (e.resolvedAt) {
                endItem(state, id, "cleared", now());
                continue;
            }
            if (!(e.kind in ITEM_KINDS) || e.raisedBy !== "daemon") continue;
            raiseItem(
                state,
                { id, kind: e.kind, question: e.summary, target: e.target ?? null, blocks: ITEM_KINDS[e.kind] },
                now(),
            );
        }
    }

    /**
     * Runs git in the root with no prompts.
     * @param {string[]} args the arguments
     * @returns {Promise<{code: number, stdout: string, stderr: string}>} the result
     */
    const runGit = (args) =>
        git(args, { cwd: root, env: { ...env, GIT_TERMINAL_PROMPT: "0" }, timeoutMs: GIT_TIMEOUT_MS });

    /**
     * Records one event in the ledger and the log.
     * @param {string} name the event name
     * @param {{lane?: string, runId?: number, attempt?: number, conclusion?: string | null, sha?: string | null}
     *   & Record<string, unknown>} fields what it is about
     */
    function event(name, fields) {
        void ledger({ kind: "event", event: name, ...fields });
        const words = [name];
        if (fields.lane) words.push(fields.lane);
        if (fields.runId) words.push(`${fields.runId}/${fields.attempt ?? 1}`);
        if (fields.conclusion) words.push(fields.conclusion);
        if (typeof fields.sha === "string") words.push(fields.sha.slice(0, 9));
        say("info", words.join(" "));
    }

    /**
     * The failing jobs of a workflow run's latest attempt.
     * @param {number} runId the run
     * @returns {Promise<any[]>} the jobs that failed, as the REST API answers them
     */
    async function failingJobs(runId) {
        const res = await github().get(`repos/${config.repo}/actions/runs/${runId}/jobs?filter=latest&per_page=100`);
        return (res.body?.jobs ?? []).filter((/** @type {any} */ j) => RED_JOB.has(j.conclusion));
    }

    /**
     * Reads every page of a REST list, up to `maxPages`.
     * @param {string} path the path, with a query string
     * @param {number} maxPages the most pages to read
     * @returns {Promise<{items: any[], full: boolean}>} the items, and whether the last page was full
     */
    async function pages(path, maxPages) {
        const items = [];
        let full = false;
        for (let p = 1; p <= maxPages; p++) {
            const body = (await github().get(`${path}&page=${p}`)).body ?? [];
            items.push(...body);
            full = body.length === 100;
            if (!full) break;
        }
        return { items, full };
    }

    /**
     * Fetches what a PR's verdict needs beyond the GraphQL node (design section 6.2): the commit
     * list and files of a new head, the failed steps of a lone failing required check, and the
     * comments since the head while that check is the only failure.
     * @param {any} node the GraphQL node
     * @param {any} prev the saved record
     */
    async function prDetail(node, prev) {
        const repo = config.repo;
        const n = node.number;
        /** @type {Record<string, any>} */
        const detail = {};
        if (prev?.breakingCheckedFor !== node.headRefOid) {
            const list = await pages(`repos/${repo}/pulls/${n}/commits?per_page=100`, 3);
            detail.commits = { messages: list.items.map((c) => c.commit.message), truncated: list.items.length >= 250 };
            const files = (await pages(`repos/${repo}/pulls/${n}/files?per_page=100`, 30)).items;
            detail.files = files.map((f) => f.filename);
            // GitHub lists at most 3000 files; past that an unseen file may touch anything.
            detail.filesTruncated = files.length >= 3000;
            detail.packagePatches = files
                .filter((f) => f.filename === "package.json" || f.filename.endsWith("/package.json"))
                .map((f) => f.patch ?? null);
        }
        if (config.ownerGate) {
            const contexts = node.commits?.nodes?.[0]?.commit?.statusCheckRollup?.contexts?.nodes ?? [];
            const failing = contexts.filter(
                (c) =>
                    c.__typename === "CheckRun" &&
                    config.requiredChecks.includes(c.name) &&
                    c.status === "COMPLETED" &&
                    !["SUCCESS", "NEUTRAL", "SKIPPED"].includes(c.conclusion),
            );
            if (failing.length === 1 && failing[0].databaseId) {
                const job = failing[0].databaseId;
                if (prev?.gateJob !== job || prev?.headSha !== node.headRefOid) {
                    const res = await github().get(`repos/${repo}/actions/jobs/${job}`);
                    detail.failedSteps = (res.body?.steps ?? [])
                        .filter((s) => s.conclusion === "failure")
                        .map((s) => s.name);
                }
                detail.gateJob = job;
                if (config.ownerGate.rejectMarker) {
                    const since = node.commits?.nodes?.[0]?.commit?.committedDate ?? "1970-01-01T00:00:00Z";
                    const res = await github().get(`repos/${repo}/issues/${n}/comments?since=${since}&per_page=100`);
                    // Only the owner can reject: another account's comment never counts.
                    detail.comments = (res.body ?? [])
                        .filter((c) => board.byOwner(state, c.user?.login))
                        .map((c) => ({ body: c.body ?? "", createdAt: c.created_at }));
                }
            }
        }
        node.detail = detail;
    }

    /**
     * Classifies each red gating lane's newest run attempt once (design 4.4): every failing job,
     * by its failed step names, its annotations and its runner labels, on master. The lane is code
     * red when any job is `code`; otherwise it takes the first job's class and is parked, with no
     * incident and no merge hold.
     * @param {any} m the master record
     */
    async function classifyLanes(m) {
        for (const [name, l] of Object.entries(m.lanes)) {
            const lane = /** @type {any} */ (l);
            // A cancelled or skipped run after the red one leaves the verdict, and its class, as they were.
            if (!gatingLane(name) || lane.verdict !== "red" || !lane.runId || !RED_JOB.has(lane.conclusion)) continue;
            const at = `${lane.runId}/${lane.attempt}`;
            if (lane.classifiedFor === at) continue;
            const workflow = lane.workflowName ?? name;
            const refs = [];
            for (const j of await failingJobs(lane.runId)) {
                const steps = (j.steps ?? []).filter((/** @type {any} */ x) => RED_JOB.has(x.conclusion));
                const annotations = (
                    (await github().get(`repos/${config.repo}/check-runs/${j.id}/annotations?per_page=100`)).body ?? []
                ).map((/** @type {any} */ a) => String(a.message ?? ""));
                const verdict = classify(
                    {
                        workflow,
                        job: j.name,
                        steps: steps.map((/** @type {any} */ x) => x.name),
                        annotations,
                        labels: j.labels,
                    },
                    { where: "master" },
                );
                refs.push({
                    id: j.id,
                    runId: lane.runId,
                    attempt: j.run_attempt ?? 1,
                    name: j.name,
                    step: steps[0]?.name ?? "",
                    class: verdict.class,
                    reason: verdict.reason,
                });
            }
            const first = refs.find((r) => r.class === "code") ?? refs[0];
            Object.assign(lane, {
                redJobs: refs,
                redClass: first?.class ?? "code",
                redReason: first ? `${first.name}: ${first.step || first.reason}` : "no failing job",
                classifiedFor: at,
            });
            event("lane-classified", { lane: name, runId: lane.runId, attempt: lane.attempt, class: lane.redClass });
        }
    }

    /**
     * Whether a configured lane gates master. A `park-gate` policy naming the lane or its workflow
     * parks it: its failures stop being incidents and holds until the owner ends the policy.
     * ponytail: a park-gate naming a paid service rather than a lane matches no lane; map services
     * to the lanes that use them when one is configured.
     * @param {string} name the lane
     * @returns {boolean} true unless it is unknown, only watched or parked
     */
    const gatingLane = (name) =>
        Boolean(config.lanes[name]) &&
        config.lanes[name].gating !== "watch" &&
        !activePolicies(state, "park-gate").some(
            (/** @type {any} */ p) => p.value === name || p.value === state.master.lanes?.[name]?.workflowName,
        );

    /**
     * Moves the incident record along with the code-red lanes: opens it (and raises its owner item
     * after a restart on rebuilt state) while any is red, and resolves it once none is.
     * @param {any} m the master record
     * @param {string | null} previousGreen the green SHA before this poll
     * @param {string} iso the poll's time
     */
    async function track(m, previousGreen, iso) {
        const open = Object.values(state.incidents).find((i) => i.status === "open");
        await classifyLanes(m);
        const codeLanes = Object.entries(m.lanes).filter(
            ([name, l]) => gatingLane(name) && /** @type {any} */ (l).verdict === "red" && codeRed(l),
        );
        if (m.verdict === "red" && codeLanes.length) trackRed(codeLanes, open, previousGreen, iso);
        else if (m.verdict !== "unknown" && open) {
            open.status = "resolved";
            open.resolvedAt = iso;
            const fix = commits.find((c) => c.sha === m.greenSha);
            m.fixedAt = fix?.commit?.committer?.date ?? iso;
            event("master-recovered", { incident: open.id, sha: m.greenSha });
            endItem(state, `master-red:${open.id}`, "cleared", now());
        }
    }

    /**
     * The daemon's own incident steps, write group `incidents` (design 4.5 and 3.10): for each
     * code-red key of the open incident, from the reconcile after its first sighting, the red-head
     * re-run and the parent re-test and what their outcome calls for (an `intermittent` issue, or
     * the revert pull request of the one merge between green and red); and the CI re-run that
     * recreates a release's expired artifacts; and for each lane parked for paid capacity, its
     * owner item and its backoff re-run (design 3.2). A failure is ledgered and tried again next
     * reconcile.
     */
    async function incidentSteps() {
        const spent = (state.incidentActions ??= {});
        const actions = createIncidentActions({
            github: github(),
            repo: config.repo,
            spent,
            now: () => now().getTime(),
        });
        try {
            const open = Object.values(state.incidents).find((i) => i.status === "open");
            if (open) await codeRedKeys(open, actions);
            await parkedLanes(actions);
            if (config.lanes.release) await releaseArtifacts(actions, spent);
        } catch (err) {
            void ledger({ kind: "error", where: "incidents", error: /** @type {Error} */ (err).message });
        }
    }

    /**
     * Runs the incident procedure for each failure key of an open incident. A summary job (a
     * required check that only reports the others) is a key only when nothing else failed.
     * @param {any} incident the open incident, its `keys` record updated in place
     * @param {ReturnType<typeof createIncidentActions>} actions the incident actions
     */
    async function codeRedKeys(incident, actions) {
        const keys = (incident.keys ??= {});
        for (const [name, lane] of Object.entries(incident.lanes)) {
            const workflow = state.master.lanes[name]?.workflowName ?? name;
            const refs = lane.jobRefs ?? [];
            const own = refs.filter((/** @type {any} */ j) => !config.requiredChecks.includes(j.name));
            for (const job of own.length ? own : refs) {
                const key = failureKey(workflow, job.name, job.step);
                const rec = (keys[key] ??= { seen: 0 });
                rec.seen++;
                rec.lane = name;
                if (settled(rec)) continue;
                const out = await actions.codeRed({
                    key,
                    redSha: lane.sha,
                    redJob: job,
                    parentSha: incident.lastGreenSha,
                    parentJob: await parentJob(incident, name, job.name),
                    suspects: incident.suspects,
                    confirmed: rec.seen > 1,
                    excerpt: "",
                });
                Object.assign(rec, { outcome: out.outcome }, "issue" in out ? { issue: out.issue } : {});
                if ("revertPr" in out) rec.revertPr = out.revertPr;
            }
        }
    }

    /**
     * The owner item of each gating lane parked for a class only the owner can clear (paid
     * capacity, a credential), ended once the lane is no longer red for it; and the backoff re-run
     * of a lane parked for paid capacity, never while one of its runs is in flight or no runner
     * picks its jobs up.
     * ponytail: outside and drift lanes are parked (no incident, no hold) and only ledgered; their
     * re-run after 15 minutes and the drift incident come with the worker platform.
     * @param {ReturnType<typeof createIncidentActions>} actions the incident actions
     */
    async function parkedLanes(actions) {
        for (const name of Object.keys(config.lanes)) {
            const l = state.master.lanes[name];
            for (const [cls, what] of Object.entries(PARKED_ITEMS)) {
                const id = `${cls}:${name}`;
                if (!gatingLane(name) || l?.verdict !== "red" || l.redClass !== cls) {
                    endItem(state, id, "cleared", now());
                    continue;
                }
                raiseItem(
                    state,
                    {
                        id,
                        kind: cls,
                        question: `${name} ${what} (${l.redReason}); merges continue and the release waits until it runs`,
                        blocks: "release",
                    },
                    now(),
                );
                if (cls !== "paid-capacity") continue;
                await actions.backoff({
                    lane: name,
                    openedAt: Date.parse(state.ownerItems[id].raisedAt),
                    run: { id: l.runId, attempt: l.attempt },
                    running: Object.keys(l.inFlight ?? {}).length > 0,
                    notProgressing: Boolean(l.notProgressing),
                });
            }
        }
    }

    /**
     * Reads the jobs of each gating lane's runs in flight, keeps the worst pickup per runner label,
     * and raises the lane-not-progressing owner item while a job waits for a runner past its bound
     * (design 3.10); ends it once every job is within its bound or the lane has nothing in flight.
     * @param {ReturnType<typeof createGitHub>} gh the client
     * @param {number} ms the poll's time
     */
    async function laneProgress(gh, ms) {
        const m = state.master;
        m.pickups ??= {};
        for (const [name, l] of Object.entries(m.lanes)) {
            const lane = /** @type {any} */ (l);
            if (!gatingLane(name)) continue;
            const jobs = [];
            for (const runId of Object.keys(lane.inFlight ?? {})) {
                const res = await gh.get(`repos/${config.repo}/actions/runs/${runId}/jobs?filter=latest&per_page=100`);
                jobs.push(...(res.body?.jobs ?? []));
            }
            m.pickups = notePickups(m.pickups, jobs);
            const bounds = Object.fromEntries(
                Object.entries(m.pickups).map(([label, worst]) => [label, Math.max(Number(worst), PICKUP_FLOOR_MS)]),
            );
            const item = laneNotProgressing(name, queueAges(jobs, { ...bounds, "": PICKUP_FLOOR_MS }, ms));
            lane.notProgressing = item !== null;
            if (!item) {
                endItem(state, `lane-not-progressing:${name}`, "cleared", now());
                continue;
            }
            raiseItem(
                state,
                { id: item.key, kind: "lane-not-progressing", question: item.summary, blocks: "release" },
                now(),
            );
        }
    }

    /**
     * The same job in the last green commit's green run of a lane, read once per incident.
     * @param {any} incident the incident, its lane's `parentJobs` cache updated in place
     * @param {string} name the lane
     * @param {string} jobName the job
     * @returns {Promise<{id: number, runId: number, attempt: number, name: string} | null>} the job,
     *   or null when there is no green commit or its run has no such job
     */
    async function parentJob(incident, name, jobName) {
        const cache = (incident.lanes[name].parentJobs ??= {});
        if (jobName in cache) return cache[jobName];
        cache[jobName] = null;
        if (!incident.lastGreenSha) return null;
        const runs =
            (
                await github().get(
                    `repos/${config.repo}/actions/workflows/${config.lanes[name].workflow}/runs?head_sha=${incident.lastGreenSha}&per_page=10&exclude_pull_requests=true`,
                )
            ).body?.workflow_runs ?? [];
        const run = runs
            .filter((/** @type {any} */ r) => r.conclusion === "success")
            .sort((/** @type {any} */ a, /** @type {any} */ b) => b.id - a.id)[0];
        if (!run) return null;
        const jobs =
            (await github().get(`repos/${config.repo}/actions/runs/${run.id}/jobs?filter=latest&per_page=100`)).body
                ?.jobs ?? [];
        const job = jobs.find((/** @type {any} */ j) => j.name === jobName);
        if (job) cache[jobName] = { id: job.id, runId: run.id, attempt: job.run_attempt ?? 1, name: jobName };
        return cache[jobName];
    }

    /**
     * Reads the annotations of each new completed release run once, and re-runs the CI run whose
     * expired artifacts made the release skip.
     * @param {ReturnType<typeof createIncidentActions>} actions the incident actions
     * @param {any} spent the persisted record; `releaseRunRead` names the run attempt last read
     */
    async function releaseArtifacts(actions, spent) {
        const rel = state.master.lanes.release;
        const id = `${rel?.runId}/${rel?.attempt}`;
        if (!rel?.runId || spent.releaseRunRead === id) return;
        const jobs =
            (await github().get(`repos/${config.repo}/actions/runs/${rel.runId}/jobs?filter=latest&per_page=100`)).body
                ?.jobs ?? [];
        const annotations = [];
        for (const j of jobs) {
            const res = await github().get(`repos/${config.repo}/check-runs/${j.id}/annotations?per_page=100`);
            annotations.push(...(res.body ?? []));
        }
        await actions.recreateArtifacts(annotations);
        spent.releaseRunRead = id;
    }

    /**
     * A code-red master: opens the incident when none is open (and raises its owner item), and
     * records each code-red lane's run and its code failing jobs on it.
     * @param {[string, any][]} gatingRed the code-red gating lanes
     * @param {any} open the open incident, if any
     * @param {string | null} previousGreen the green SHA before this poll
     * @param {string} iso the poll's time
     */
    function trackRed(gatingRed, open, previousGreen, iso) {
        const incident = open ?? openIncident(gatingRed[0][1], previousGreen, iso);
        for (const [name, l] of gatingRed) {
            if (incident.lanes[name]?.classifiedFor === l.classifiedFor) continue;
            const refs = (l.redJobs ?? []).filter((/** @type {any} */ j) => (j.class ?? "code") === "code");
            incident.lanes[name] = {
                runId: l.runId,
                attempt: l.attempt,
                sha: l.sha,
                classifiedFor: l.classifiedFor,
                failingJobs: refs.map((/** @type {any} */ j) => j.name),
                jobRefs: refs,
            };
        }
        if (open) return;
        event("master-red-confirmed", {
            incident: incident.id,
            lane: gatingRed[0][0],
            runId: incident.lanes[gatingRed[0][0]].runId,
            sha: incident.redSha,
        });
        // After an empty-state start, a red run older than the restart is not news.
        const recovery = loaded.recovery;
        const since = gatingRed
            .map(([, l]) => l.updatedAt)
            .filter(Boolean)
            .sort((/** @type {string} */ a, /** @type {string} */ b) => a.localeCompare(b))[0];
        const restartedSince = recovery && since && since < recovery.at ? since : undefined;
        // An incident job takes the red master (jobs.mjs); the owner hears of it when no worker
        // can take it or the job fails. After an empty-state start he hears of it at once.
        if (restartedSince) {
            masterRedItem(incident.id, `githerd restarted, master is red since ${restartedSince.slice(0, 16)} UTC`);
        }
    }

    /**
     * Opens an incident for a red master.
     * @param {any} first the first red gating lane
     * @param {string | null} previousGreen the green SHA before this poll
     * @param {string} iso the poll's time
     * @returns {any} the incident
     */
    function openIncident(first, previousGreen, iso) {
        const id = nextIncidentId(state.incidents, iso);
        state.incidents[id] = {
            id,
            status: "open",
            openedAt: iso,
            confirmedAt: iso,
            resolvedAt: null,
            lanes: {},
            redSha: first.sha,
            lastGreenSha: previousGreen,
            suspects: findSuspects(commits, previousGreen, first.sha),
            runs: [],
            escalated: false,
            issue: null,
        };
        return state.incidents[id];
    }

    /**
     * Asks GitHub which account gh is logged in as. An outage keeps a login already resolved (it
     * says nothing about who is logged in); a refused or empty answer clears it.
     * @param {ReturnType<typeof createGitHub>} gh the client
     * @param {string} iso the poll's time
     * @param {(args: any) => void} derived raises an escalation that clears when it stops holding
     */
    async function resolveLogin(gh, iso, derived) {
        const trust = state.trust;
        try {
            const login = await gh.login();
            if (login !== trust.login) say("info", `trusted author: ${login}, the account gh is logged in as`);
            Object.assign(trust, { login, resolvedAt: iso, error: null });
        } catch (err) {
            const e = /** @type {import("./github.mjs").GitHubError} */ (err);
            if (!["network", "timeout", "server", "rate", "secondary"].includes(e.kind)) trust.login = null;
            trust.error = e.message;
        }
        if (!trust.login) {
            derived({
                key: "login-unresolved",
                kind: "blocked",
                summary: "githerd cannot tell which GitHub account gh is logged in as, so it starts no workers",
                detail: trust.error ?? undefined,
                clearWhen: "login-resolved",
            });
        }
    }

    /**
     * One poll of GitHub (design section 6).
     * @returns {Promise<string | null>} why nothing was asked of GitHub (a back-off), or null
     */
    async function pollGitHub() {
        const t = now();
        const ms = t.getTime();
        const iso = t.toISOString();
        const [owner, name] = config.repo.split("/");
        const m = state.master;
        const gh = github();
        const pace = gh.pace();
        intervalFactor = pace.intervalFactor;
        if (pace.level === "wait") return `GitHub back-off until ${new Date(pace.until).toISOString()}`;
        /** @type {Set<string>} derived escalations whose condition held this poll */
        const holding = new Set();
        const derived = (/** @type {any} */ args) => {
            holding.add(args.key);
            raise(args);
        };
        await resolveLogin(gh, iso, derived);
        // The next poll's confirmation of every write the last reconciles sent (design 3.6).
        await gh.confirm();

        // The pull request list is essential (design 3.2); its per-pull-request reads are not.
        const prList = await gh.graphql(PRS_QUERY, { owner, name }, { purpose: "essential" });
        m.branch = prList.repository.defaultBranchRef.name;
        const branch = m.branch ?? "master";
        await pollLanes(gh, branch, ms, derived);
        if (pace.level === "normal") await laneProgress(gh, ms);
        await followHead(gh, branch, prList.repository.defaultBranchRef.target.oid, iso);

        const previousGreen = m.greenSha ?? null;
        const previousVerdict = m.verdict ?? "unknown";
        if (m.headSha)
            Object.assign(m, masterVerdict(m.lanes, config, { headSha: m.headSha, commits, greenSha: previousGreen }));
        else m.verdict = "unknown";
        if (m.verdict !== previousVerdict) m.since = iso;
        await track(m, previousGreen, iso);
        await incidentSteps();
        if (config.lanes.release || config.release) checkRelease(m, ms, derived);
        if (pace.level === "normal") await pollPrs(gh, prList.repository.pullRequests.nodes, branch, t);
        // Holds post at every rate tier; the client's budget refuses a success below its floor.
        // The merge gate reads each githerd-made pull request's patch id (decision line 6).
        await linkJobPrs(branch, t);
        await mergeGate(gh, prList.repository.pullRequests.nodes, branch);
        // No owner, no jobs: every job acts only on the owner's issues and pull requests.
        if (state.trust.login) jobsFromFacts(t);
        referenceWork();
        await workerPass();
        escalationItems();
        await ownerItemsPoll({
            api: gh,
            repo: config.repo,
            state,
            notifier,
            acting: writeMode("owner-items") === "acting",
            login: state.trust.login,
            now: t,
            digestHourUtc: config.digest.hourUtc,
            ledger,
            isSessionWrite: sessionWriteCheck(stateDir),
        });
        for (const r of resumeAnswered(state, t)) {
            void ledger({ kind: "owner-answered", job: r.job });
            await ringJob(state.jobs[r.job]);
        }
        for (const change of await pollVerifying(state, { config, io: doneReader(), now: t })) {
            void ledger({ kind: "done-verify", ...change });
            if (change.action === "working") await ringJob(state.jobs[change.job]);
        }
        await stacks(prList.repository.pullRequests.nodes, branch);
        if (state.trust.login) {
            await advanceProposals(state, {
                gitHub: gh,
                repo: config.repo,
                login: state.trust.login,
                now: t,
                presentDays: (/** @type {string} */ from) => presentDays(state, from),
                isWorkerWrite: sessionWriteCheck(stateDir),
                ledger,
            });
        }

        for (const key of board.resolveDerived(state, (esc) => holding.has(esc.key), t)) {
            void ledger({ kind: "escalation", key, resolved: true, by: "daemon" });
        }
        return null;
    }

    /**
     * Links each job to the pull request on the branch it pushed, reads the patch id of each new
     * head of a pull request a job made (a review job and merge line 6 are keyed on it), and tells
     * an issue job's worker when its issue changed.
     * @param {string} branch the default branch
     * @param {Date} t the poll's time
     */
    async function linkJobPrs(branch, t) {
        for (const job of Object.values(state.jobs ?? {})) {
            if (job.pr || !job.branch) continue;
            const hit = Object.entries(state.prs ?? {}).find(([, p]) => p.headRef === job.branch);
            if (hit) job.pr = Number(hit[0]);
        }
        for (const job of Object.values(state.jobs ?? {})) {
            const rec = job.pr && job.kind !== "pr" && job.kind !== "review" ? state.prs?.[String(job.pr)] : null;
            if (!rec || rec.patchFor === rec.headSha) continue;
            const fetched = await runGit(["fetch", "-q", "--no-tags", "origin", `refs/pull/${job.pr}/head`]);
            try {
                if (fetched.code !== 0) throw new Error(fetched.stderr.trim() || `git fetch exited ${fetched.code}`);
                rec.patchId = patchId(root, `origin/${branch}`, rec.headSha);
                rec.patchFor = rec.headSha;
            } catch (err) {
                void ledger({
                    kind: "error",
                    where: "patch-id",
                    pr: job.pr,
                    error: /** @type {Error} */ (err).message,
                });
            }
        }
        // An issue edited since its worker last read it: the worker reads it again (line 8).
        for (const job of Object.values(state.jobs ?? {})) {
            if (job.kind !== "issue" || board.TERMINAL.includes(job.state) || job.state === "queued") continue;
            const at = state.issues?.byNumber?.[String(job.target).slice(1)]?.updatedAt;
            if (!at || at === job.acknowledgedRevision || at === job.revisionNews) continue;
            job.revisionNews = at;
            job.news.push({
                at: t.toISOString(),
                text: `issue ${job.target} changed; read it again with githerd_read`,
                acked: false,
            });
        }
    }

    /**
     * Turns this poll's facts into job records (jobs.mjs).
     * @param {Date} t the poll's time
     */
    function jobsFromFacts(t) {
        const synced = syncJobs(state, { config, now: t });
        for (const id of synced.created) {
            void ledger({ kind: "job-created", job: id, reason: state.jobs[id].reason, target: state.jobs[id].target });
        }
        for (const c of synced.cancelled) void ledger({ kind: "job-cancelled", ...c });
    }

    /**
     * Reads every lane's recent runs on the default branch, records their events, and raises a
     * stuck-run escalation for each run in flight too long.
     * @param {ReturnType<typeof createGitHub>} gh the client
     * @param {string} branch the default branch
     * @param {number} ms the poll's time
     * @param {(args: any) => void} derived raises an escalation that clears when it stops holding
     */
    async function pollLanes(gh, branch, ms, derived) {
        const m = state.master;
        for (const [lane, { workflow }] of Object.entries(config.lanes)) {
            const res = await gh.get(
                `repos/${config.repo}/actions/workflows/${workflow}/runs?branch=${branch}&per_page=10&exclude_pull_requests=true`,
                { purpose: "essential" },
            );
            const updated = updateLane(lane, m.lanes[lane], res.body?.workflow_runs ?? [], config, ms);
            m.lanes[lane] = updated.lane;
            noteLaneName(updated.lane, res.body?.workflow_runs?.[0]?.name, ms);
            for (const e of updated.events) {
                const { event: kind, ...fields } = e;
                event(kind, fields);
            }
        }
        for (const [lane, l] of Object.entries(m.lanes)) {
            for (const [runId, run] of Object.entries(l.inFlight ?? {})) {
                if (!run.reportedAt) continue;
                derived({
                    key: `lane-stuck:${lane}:${runId}`,
                    kind: "blocked",
                    summary: `${lane} run ${runId} queued or running since ${run.firstSeenAt.slice(0, 16)} UTC`,
                    clearWhen: "lane-run-done",
                });
            }
        }
    }

    /**
     * Follows the default branch's head: its recent commits, the pull requests merged since the
     * last scan, and the config at the new head (fetched until a fetch succeeds).
     * @param {ReturnType<typeof createGitHub>} gh the client
     * @param {string} branch the default branch
     * @param {string | null} headSha its head now
     * @param {string} iso the poll's time
     */
    async function followHead(gh, branch, headSha, iso) {
        const m = state.master;
        const moved = headSha !== null && headSha !== m.headSha;
        if (moved || (commits.length === 0 && headSha)) {
            commits = (await gh.get(`repos/${config.repo}/commits?sha=${branch}&per_page=30`)).body ?? [];
        }
        if (moved) {
            m.headSha = headSha;
            m.configPending = true;
            const merged = await searchMerged(gh, config.repo, state.merged.lastScanAt ?? iso);
            // A stacked child of a merged pull request is retargeted to the default branch.
            const upkeep = (state.upkeep ??= { lastHeads: {}, mergedHeads: [] });
            const heads = merged.map((pr) => pr.headRef).filter((h) => h !== null);
            upkeep.mergedHeads = [...new Set([...upkeep.mergedHeads, ...heads])];
            state.merged = accumulateMerged(state.merged, merged);
            state.merged.lastScanAt ??= iso;
        }
        if (m.configPending) {
            const fetched = await runGit(["fetch", "origin", branch]);
            if (fetched.code === 0) {
                m.configPending = false;
                mergify = undefined;
            } else say("error", `git fetch origin ${branch}: ${fetched.stderr.trim() || "exit " + fetched.code}`);
            const configFatal = await readConfig();
            if (configFatal) enterFatal(configFatal);
        }
        if (mergify === undefined) mergify = await readMergify(branch);
    }

    /**
     * `.mergify.yml` on the default branch as last fetched.
     * @param {string} branch the default branch
     * @returns {Promise<string | null>} the file, or null when it could not be read
     */
    async function readMergify(branch) {
        const shown = await runGit(["show", `origin/${branch}:.mergify.yml`]);
        return shown.code === 0 ? shown.stdout : null;
    }

    /**
     * Keeps stacked pull requests moving (design 4.6, "Stacks"): a child whose base merged is
     * retargeted to the default branch, and a child whose base's head moved is updated from it.
     * A base's new head is remembered only once its child's update settled (`SETTLED`), so an
     * update that was refused, failed or threw is tried again next reconcile; a merged branch is
     * forgotten once its child's retarget went through (or was recorded as a would-do). A conflict
     * with the base is an owner item on the child until a `pr` job can take it.
     * @param {any[]} nodes the open pull requests
     * @param {string} branch the default branch
     */
    async function stacks(nodes, branch) {
        const upkeep = (state.upkeep ??= { lastHeads: {}, mergedHeads: [] });
        const prs = nodes.map((n) => ({
            number: n.number,
            base: n.baseRefName,
            headRef: n.headRefName,
            head: n.headRefOid,
        }));
        const poll = { prs, lastHeads: upkeep.lastHeads, mergedHeads: upkeep.mergedHeads };
        const steps = await upkeepStacks(
            {
                gh: github(),
                repo: config.repo,
                root,
                mode: writeMode,
                ledger,
                env: { ...env, GIT_TERMINAL_PROMPT: "0" },
                branch,
            },
            poll,
        );
        for (const s of steps) {
            const r = /** @type {any} */ (s.result);
            if (r?.result !== "conflict") continue;
            raiseItem(
                state,
                {
                    id: `stack-conflict:${s.pr}`,
                    kind: "conflict",
                    question: `#${s.pr} conflicts with its base #${s.base} in ${(r.conflicts ?? []).join(", ")}; merge #${s.base} into it by hand`,
                    target: `pr:${s.pr}`,
                },
                now(),
            );
        }
        Object.assign(upkeep, nextStackRecord(poll, steps));
    }

    /**
     * Posts `githerd/merge` on every open pull request into the default branch (design 4.6) and
     * keeps the merge gate's invariant faults and banner in `state.mergeGate.checks`.
     * @param {ReturnType<typeof createGitHub>} gh the client
     * @param {any[]} nodes the open pull requests, with `detail` when this poll read it
     * @param {string} branch the default branch
     */
    async function mergeGate(gh, nodes, branch) {
        const m = state.master;
        const gate = (state.mergeGate ??= { heads: {}, posted: {}, disarmed: {} });
        const open = new Set(nodes.map((n) => String(n.number)));
        for (const n of Object.keys(gate.heads)) if (!open.has(n)) delete gate.heads[n];
        const items = Object.values(state.ownerItems ?? {}).filter((i) => !i.endedAt);
        const prs = [];
        for (const node of nodes) {
            gate.heads[node.number] = foldHead(gate.heads[node.number], node);
            await readDependencies(gate.heads[node.number], npm);
            const head = gate.heads[node.number];
            const ownerItemOpen = items.some((i) => i.target === `pr:${node.number}`);
            const job = madeBy(node.number, head);
            prs.push(openPr(node, head, { ownerItemOpen, job, releaseBumps: head.releaseBumps ?? null }));
        }
        const fixPrs = incidentFixPrs();
        // Only a code-red lane holds merges; a lane parked for paid capacity, a credential, an
        // outside failure or drift does not (design 4.4).
        const redLanes = Object.entries(m.lanes)
            .filter(([name, l]) => gatingLane(name) && l.verdict === "red" && codeRed(l))
            .map(([name, l]) => ({
                workflow: l.workflowName ?? name,
                since: l.redSince ?? l.updatedAt,
                fixPrs,
            }));
        const ctx = {
            login: state.trust.login,
            redLanes,
            releaseRunning: Object.keys(m.lanes.release?.inFlight ?? {}).length > 0,
            freezeMerges: activePolicies(state, "freeze-merges").length > 0,
            heldPackages: activePolicies(state, "hold-package").map((/** @type {any} */ p) => String(p.value)),
            starvation: starvation(),
        };
        const posted = await postMergeStatuses({ github: gh, repo: config.repo, branch, prs, ctx, record: gate });
        for (const error of posted.errors) void ledger({ kind: "error", where: "githerd/merge", error });
        for (const p of prs) if (state.prs?.[p.number]) state.prs[p.number].mergeStatus = gate.posted[p.number];
        gate.checks = mergeGateChecks({
            prs,
            branch,
            record: gate,
            mergify: mergify ?? null,
            acting: gh.acting("statuses"),
        });
    }

    /**
     * The merge decision's facts about the githerd job that made a pull request (design 4.6, lines
     * 6 and 8): its kind, the head's patch id (null until read), the patch ids a review passed on,
     * whether it changes githerd's own code or settings, and for an issue job the issue's current
     * revision and the one its worker read. Null for a pull request no job made: the owner's own,
     * and the owner's pull requests a `pr` job only fixed.
     * ponytail: a passing review counts as the security review too; the rubric holds a security
     * finding as its own verdict. Split them if a reviewer ever passes a diff with a security note.
     * @param {number} n the pull request
     * @param {any} head its head facts
     * @returns {import("./prs.mjs").JobFacts | null} the facts
     */
    function madeBy(n, head) {
        const jobs = Object.values(state.jobs ?? {});
        const maker = jobs.find((j) => j.pr === n && j.kind !== "review" && j.kind !== "pr" && j.kind !== "title");
        if (!maker) return null;
        const rec = state.prs?.[String(n)];
        const reviewed = jobs
            .filter((j) => j.kind === "review" && j.facts?.pr === n && j.state === "done")
            .filter((j) => j.report?.result?.verdict === "pass")
            .map((j) => j.facts.patchId);
        const issue = maker.kind === "issue" ? state.issues?.byNumber?.[String(maker.target).slice(1)] : null;
        return {
            kind: maker.kind,
            patchId: rec && rec.patchFor === rec.headSha ? (rec.patchId ?? null) : null,
            reviewed,
            securityReviewed: reviewed,
            workerPushedOwnerPaths: Boolean(head.files && touches(head.files, ["githerd/", ".claude/"])),
            issueRevision: issue?.updatedAt ?? null,
            acknowledgedRevision: maker.kind === "issue" ? (maker.acknowledgedRevision ?? null) : null,
        };
    }

    /**
     * The starvation hold (design 4.7): the green commit is older than 6 hours while merges go on
     * past it and every gating lane is progressing, so merges wait until the slowest lane completes
     * on master's head. A lane that is not progressing (queued past its bound, out of balance, an
     * outage) never causes it.
     * @returns {string | null} the hold's reason, or null
     */
    function starvation() {
        const m = state.master;
        if (!m.greenSha || !m.pending || m.verdict === "red") return null;
        const green = commits.find((c) => c.sha === m.greenSha);
        // Not among the recent commits: more merges than the commit list holds went on past it.
        const at = Date.parse(green?.commit?.committer?.date ?? "");
        if (green && !(now().getTime() - at >= STARVATION_MS)) return null;
        const lanes = Object.entries(m.lanes).filter(([name]) => gatingLane(name));
        const stuck = lanes.some(([, l]) => l.notProgressing || (l.verdict === "red" && !codeRed(l)));
        if (stuck) return null;
        return `the green commit ${m.greenSha.slice(0, 9)} is over 6 hours old; merges wait for every lane on master's head`;
    }

    /** @type {Promise<void> | null} the reference worktree's work, while it runs */
    let refWork = null;

    /**
     * The reference worktree's work (design 4.9), in the background so the reconcile goes on: when
     * the green commit moves it is moved, installed and built, and the audit runs on it; the
     * release dry-run runs for each open pull request head that changes release inputs (merge line
     * 7); and once a push's gate failed, the gate runs once on the green commit, so a failure that
     * is the green commit's own becomes a shared local incident. A check that cannot run is a
     * platform fault, ledgered by the check. It runs only while the statuses or workers group acts,
     * the two that read its answers.
     */
    function referenceWork() {
        const sha = state.master.greenSha;
        // Only what acts reads its answers: the posted merge statuses and the workers' incidents.
        const acting = writeMode("statuses") === "acting" || writeMode("workers") === "acting";
        if (refWork || !sha || !config || env.GITHERD_DEV || !workersOn || !acting) return;
        const heads = state.mergeGate?.heads ?? {};
        const dryRuns = Object.entries(heads).filter(
            ([, h]) => h.files && h.releaseFor !== h.sha && touches(h.files, RELEASE_INPUTS),
        );
        const ref = state.reference;
        const fresh = ref?.ready && ref.sha === sha;
        const gate = state.referenceGateWanted && ref?.gate?.sha !== sha;
        if (fresh && ref.audit?.sha === sha && !dryRuns.length && !gate) return;
        const opts = { root, state, env: pushEnv(), ledger };
        refWork = (async () => {
            const ready = await refreshReference({ ...opts, sha, setup: REFERENCE_SETUP });
            if (ready.verdict !== "ready") return;
            if (state.reference.audit?.sha !== sha) state.reference.audit = { sha, ...(await referenceAudit(opts)) };
            for (const [n, h] of dryRuns) {
                const head = h.sha;
                const d = await referenceDryRun({ ...opts, merge: { sha: head, ref: `refs/pull/${n}/head` } });
                if (h.sha !== head) continue;
                h.releaseFor = head;
                h.releaseBumps =
                    d.verdict === "conflict" ? [] : d.verdict === "answer" ? bumps(ready.dir, d.bumps) : null;
            }
            if (gate) {
                await referenceGate(opts);
                state.referenceGateWanted = false;
            }
        })()
            .catch(
                (err) => void ledger({ kind: "error", where: "reference", error: /** @type {Error} */ (err).message }),
            )
            .finally(() => {
                refWork = null;
                if (!stopping) void save();
            });
    }

    /**
     * The release dry-run's bumps as the merge decision reads them: each project's directory, its
     * version on the green commit and the version it would publish.
     * @param {string} dir the reference worktree
     * @param {{dir: string, version: string}[]} list the dry-run's bumps
     * @returns {{project: string, from: string, to: string}[]} the bumps
     */
    function bumps(dir, list) {
        return list.map((b) => {
            let from = "0.0.0";
            try {
                from = JSON.parse(readFileSync(join(dir, b.dir, "package.json"), "utf8")).version ?? from;
            } catch {
                // a new package: from nothing
            }
            return { project: b.dir, from, to: b.version };
        });
    }

    /**
     * The pull requests that are a red master's fix, exempt from its merge hold (design 4.6, line
     * 2), which Mergify's priority rule puts first: every open incident job's pull request, every
     * revert pull request the open incident's procedure opened, and every owner pull request
     * labelled `priority:critical` by the owner's account (the owner, or an incident's worker: the
     * guard refuses the label to every other worker).
     * @returns {number[]} their numbers
     */
    function incidentFixPrs() {
        const jobs = Object.values(state.jobs ?? {})
            .filter((j) => j.kind === "incident" && !board.TERMINAL.includes(j.state))
            .map((j) => Number(j.pr ?? 0));
        const open = Object.values(state.incidents).find((i) => i.status === "open");
        const reverts = Object.values(open?.keys ?? {}).map((k) => Number(/** @type {any} */ (k).revertPr ?? 0));
        const critical = Object.entries(state.prs ?? {})
            .filter(([, p]) => board.byOwner(state, p.author) && (p.ownerLabels ?? []).includes(CRITICAL))
            .map(([n]) => Number(n));
        return [...new Set([...jobs, ...reverts, ...critical].filter((n) => n > 0))];
    }

    /**
     * Release truth: records the last release and raises a failed or stalled release.
     * @param {any} m the master record
     * @param {number} ms the poll's time
     * @param {(args: any) => void} derived raises an escalation that clears when it stops holding
     */
    function checkRelease(m, ms, derived) {
        const rs = releaseState(m, m.lanes, config, commits, ms);
        m.lastRelease = rs.lastRelease;
        m.releaseEligibleSince = rs.releaseEligibleSince;
        if (rs.failed) {
            derived({
                key: `release-failed:${m.lanes.release.runId}`,
                kind: "release-failed",
                summary: `release run ${m.lanes.release.runId} failed`,
                clearWhen: "release-green",
            });
        }
        if (rs.stalled) {
            derived({
                key: `release-stalled:${rs.lastRelease?.sha ?? "none"}`,
                kind: "release-stalled",
                summary: `release-eligible since ${rs.releaseEligibleSince.slice(0, 16)} UTC with no new release`,
                clearWhen: "released",
            });
        }
    }

    /**
     * The non-essential reads: each open pull request's record and why-stuck reasons, expired
     * claims, the open issues and the owner's override labels.
     * @param {ReturnType<typeof createGitHub>} gh the client
     * @param {any[]} nodes the open pull requests
     * @param {string} branch the default branch
     * @param {Date} t the poll's time
     */
    async function pollPrs(gh, nodes, branch, t) {
        const m = state.master;
        const iso = t.toISOString();
        state.prs ??= {};
        for (const node of nodes) await prDetail(node, state.prs[node.number]);
        const view = {
            verdict: m.verdict,
            branch,
            fixedAt: m.fixedAt ?? null,
        };
        const prs = updatePrs(state.prs, nodes, view, config, iso);
        for (const node of nodes) if (node.detail.gateJob) prs[node.number].gateJob = node.detail.gateJob;
        for (const ended of board.expire(state, t, startedAtDate)) {
            void ledger({
                kind: "release",
                target: ended.target,
                holder: ended.holder,
                by: "daemon",
                outcome: ended.reason,
            });
        }
        const ctx = {
            master: view,
            config,
            login: state.trust.login,
            now: t.getTime(),
            claims: state.claims,
            sessions: state.sessions,
        };
        for (const [n, rec] of Object.entries(prs)) rec.stuck = whyStuck(Number(n), rec, ctx);
        state.prs = prs;

        const issues = await pollIssues(gh, config.repo, state.issues, ISSUES_START);
        state.issues = { since: issues.since, byNumber: issues.byNumber };
        await checkOverrides();
    }

    /**
     * Records which of the owner's override labels (`githerd:next`, `githerd:skip`) on an open
     * issue or PR the owner applied, from the issue's events: a label anyone else added is
     * ignored (design section 10.2). Read again only when the record changed.
     */
    async function checkOverrides() {
        const records = [
            ...Object.entries(state.prs ?? {}).map(([n, r]) => [n, r, r.lastActivityAt]),
            ...Object.entries(state.issues.byNumber)
                .filter(([, i]) => i.state === "open")
                .map(([n, i]) => [n, i, i.updatedAt]),
        ];
        for (const [n, rec, stamp] of records) {
            const labels = (rec.labels ?? []).filter((/** @type {string} */ l) => OVERRIDES.has(l));
            if (!labels.length) {
                delete rec.ownerLabels;
                continue;
            }
            if (rec.ownerLabelsFor === stamp) continue;
            const { items } = await pages(`repos/${config.repo}/issues/${n}/events?per_page=100`, 10);
            rec.ownerLabels = labels.filter((/** @type {string} */ l) => {
                const last = items.findLast((e) => e.event === "labeled" && e.label?.name === l);
                return board.byOwner(state, last?.actor?.login);
            });
            rec.ownerLabelsFor = stamp;
        }
    }

    /**
     * One poll attempt: skipped while another runs. `loopTickAt` is set whether or not GitHub
     * answers. In fatal mode it only sets `loopTickAt` and returns the reason.
     * @returns {Promise<{skipped?: true, fenced?: true, fatal?: string, ok?: boolean}>} what happened
     */
    async function poll() {
        if (fatal) {
            // Never polls, but the loop still ticks: a launcher must see a daemon that is up and
            // DOWN, not a wedged one to restart, or fatal mode ends without its cause changing.
            loopTickAt = now().toISOString();
            if (fatal === configError) await retryConfig();
            if (fatal) return { fatal: firstLine(fatal) };
        }
        if (busy || stopping || fenced) return { skipped: true };
        if (loaded.readOnly) {
            // Never polls, but the loop still ticks, so launchers do not take it for wedged.
            loopTickAt = now().toISOString();
            return { skipped: true };
        }
        busy = true;
        const t = now();
        loopTickAt = t.toISOString();
        step("poll");
        try {
            if (!mayWrite()) return { fenced: true };
            try {
                const waited = await pollGitHub();
                if (waited) {
                    lastPollError = waited;
                } else {
                    lastPollOkAt = loopTickAt;
                    lastPollError = null;
                    state.github.lastError = null;
                }
            } catch (err) {
                lastPollError = /** @type {Error} */ (err).message;
                state.github.lastError = lastPollError;
                say("error", `poll: ${lastPollError}`);
                void ledger({ kind: "error", where: "poll", error: lastPollError });
            }
            state.github.downSince = state.rate.downSince ?? null;
            // Checked after the poll, which throws while GitHub is down; a poll that completes has
            // cleared downSince, and its resolveDerived clears this escalation.
            if (state.rate.downSince && t.getTime() - Date.parse(state.rate.downSince) >= GITHUB_DOWN_MS) {
                raise({
                    key: "github-down",
                    kind: "blocked",
                    summary: `GitHub unreachable since ${state.rate.downSince.slice(0, 16)} UTC`,
                    clearWhen: "github-up",
                });
            }
            await save();
            if (!fenced) void notifier.flush();
            return { ok: lastPollOkAt === loopTickAt };
        } finally {
            busy = false;
            if (!fenced) step("idle");
        }
    }

    /**
     * Fatal mode for want of a good config ends when the default branch brings one (design 9.6):
     * fetch it, gate it, and leave fatal mode once it is adopted.
     */
    async function retryConfig() {
        const branch = state.master.branch ?? "master";
        const fetched = await runGit(["fetch", "origin", branch]);
        if (fetched.code !== 0) return;
        if (await readConfig()) return;
        fatal = null;
        clearFatal(stateDir);
        say("info", "config: a good config is in use; fatal mode ends");
        void ledger({ kind: "fatal-cleared", reason: "a good config was adopted" });
    }

    let watching = false;
    let retiring = false;
    let passing = false;
    /** @type {Map<string, Promise<void>>} worker starts in flight, by job (start.mjs) */
    const tasks = new Map();
    const platform = { ...realPlatform({ env, stateDir }), ...platformOptions };
    /** @type {string} the open owner items' targets as last written to the guards */
    let guardItems = "";

    /**
     * What every worker step reads: the state, the config and the clock, the ledger, and the
     * `workers` group's mode.
     * @returns {import("./start.mjs").StartContext} the context
     */
    const startContext = () => ({
        state,
        config,
        root,
        stateDir,
        env,
        now,
        ledger,
        save,
        mode: writeMode("workers"),
        platform,
        tasks,
    });

    /**
     * The worker steps of every reconcile and watchdog pass (design 9.3): every deadline clock
     * ticks, settled waits ring their workers, the invariant check runs, sessions githerd does not
     * keep are ended, free slots are filled, and ended jobs' worktrees removed. Skipped while one
     * runs, in fatal mode, without a config or the owner's login, or when the daemon cannot write.
     */
    async function workerPass() {
        if (passing || stopping || fatal || !config || !state.trust.login || !mayWrite()) return;
        passing = true;
        try {
            const t = now();
            const pauses = {
                unknown: Boolean(state.github.downSince),
                usage: state.apiStop?.kind === "usage",
                paused: mode() === "paused" || Boolean(state.settings?.paused),
            };
            const steps = [...tickJobs(state, t, pauses), ...settleWaits(state, t)];
            noteGitHubChanges(state, t);
            for (const s of steps) void ledger(/** @type {any} */ (s.line));
            for (const s of steps) if (s.ring) await ringJob(state.jobs[s.job]);
            checkFaults(state, invariantReads(), t);
            const ctx = startContext();
            const ended = endIdleSessions(ctx);
            for (const id of ended) void ledger({ kind: "session-parked", job: id });
            if (state.retiring?.length) setImmediate(() => void retire());
            const items = JSON.stringify(
                Object.values(state.ownerItems ?? {})
                    .filter((i) => !i.endedAt)
                    .map((i) => i.target),
            );
            if (items !== guardItems) {
                refreshGuards(state, config, stateDir);
                guardItems = items;
            }
            const filled = workersOn && !state.github.downSince ? await fill(ctx) : [];
            const removed = await tidyEndedJobs({
                ...ctx,
                servers: async () => {
                    const found = launcherContext({ cwd: root, env, stateDir });
                    if (found.kind !== "ready") return [];
                    const data = await servherd(found.ctx, ["list"]);
                    return (data.servers ?? []).map((/** @type {any} */ x) => ({
                        name: x.server?.name,
                        cwd: x.server?.cwd,
                    }));
                },
                stopServer: async (name) => {
                    const found = launcherContext({ cwd: root, env, stateDir });
                    if (found.kind === "ready") await servherd(found.ctx, ["stop", name]);
                },
                remove: removeJobWorktree,
            });
            if (steps.length || ended.length || filled.length || removed.length) await save();
        } catch (err) {
            say("error", `workers: ${/** @type {Error} */ (err).message}`);
            void ledger({ kind: "error", where: "workers", error: /** @type {Error} */ (err).message });
        } finally {
            passing = false;
            syncWatch();
        }
    }

    /**
     * Fills free slots; when no worker may start, the owner hears of a red master no worker will take
     * (design 4.5: the incident job is the fix, and he is paged only when it cannot start or fails).
     * @param {import("./start.mjs").StartContext} ctx the context
     * @returns {Promise<string[]>} the jobs admitted
     */
    async function fill(ctx) {
        const r = await fillSlots(ctx);
        const open = Object.values(state.incidents).find((i) => i.status === "open");
        const waits = Object.values(state.jobs ?? {}).some(
            (j) => j.state === "queued" && isUrgent(j) && j.facts?.incident === open?.id,
        );
        // An item already open for this incident (a restart into a red master) is not raised again.
        const item = open && state.ownerItems?.[`master-red:${open.id}`];
        if (r.blocked && open && waits && (!item || item.endedAt)) {
            masterRedItem(open.id, `no worker will take it: ${r.blocked}`);
        }
        return r.admitted;
    }

    /**
     * What the invariant check reads (design 9.5).
     * @returns {import("./board.mjs").Reads} the reads
     */
    function invariantReads() {
        const t = now();
        return {
            sessionAlive: (session) => {
                const job = Object.values(state.jobs ?? {}).find((j) => j.holder?.session === session);
                if (job?.holder?.pid) return running(job.holder.pid, job.holder.startTime);
                return board.holderAlive(state, session, t, startedAtDate);
            },
            recovering: (id) => tasks.has(id) || !state.jobs?.[id]?.holder,
            waitPending: (job) =>
                Boolean(job.waitingFor?.push || job.waitingFor?.verify || job.waitingFor?.local) ||
                waitNews(state, job) === null,
            itemOpen: (item) =>
                item.startsWith("stopped-by-owner:") ||
                Boolean(state.ownerItems?.[item] && !state.ownerItems[item].endedAt),
        };
    }

    /**
     * Ends the sessions on `state.retiring`: those of jobs that ended done, failed or back in the
     * queue (design 5.3 and 7.3). Run by every watchdog pass, and at once when such a session's
     * hook fires. Skipped while one runs or the daemon cannot write.
     */
    async function retire() {
        if (retiring || stopping || !mayWrite() || !state.retiring?.length) return;
        retiring = true;
        try {
            const lines = await endRetired(state);
            for (const line of lines) void ledger(line);
            if (lines.length) await save();
        } catch (err) {
            say("error", `retire: ${/** @type {Error} */ (err).message}`);
        } finally {
            retiring = false;
        }
    }

    /**
     * Runs the watchdog's minute interval only while a worker exists (design 7.5): a start in
     * flight, a session githerd runs, or one still to be ended. The poll, the hooks and the tool
     * calls drive starts while there is none. Called after every worker and watchdog pass.
     */
    function syncWatch() {
        const wanted = autoPoll && !stopping && watchWanted(state, tasks);
        if (wanted && !watchTimer) {
            watchTimer = setInterval(() => void watch(), WATCH_MS);
            watchTimer.unref();
        } else if (!wanted && watchTimer) {
            clearInterval(watchTimer);
            watchTimer = null;
        }
    }

    /**
     * One watchdog pass over the workers githerd started (design 7.5), then the death and recovery
     * of each session it found dead (7.7). Skipped while a pass runs or the daemon cannot write.
     */
    async function watch() {
        if (watching || stopping || fatal || !config || !mayWrite()) return;
        watching = true;
        try {
            await retire();
            const queued = (/** @type {any} */ job) =>
                (state.pushQueue?.entries ?? []).some((/** @type {any} */ e) => e.job === job.id);
            const pass = await watchPass(state, now(), { pushQueued: queued });
            for (const line of pass.ledger) void ledger(line);
            for (const id of pass.dead) {
                const job = state.jobs[id];
                // A steered session the owner ended parks its job until githerd release (design 7.6).
                if (job.steeredAt && job.state === "working") {
                    job.holder = null;
                    board.move(job, "parked", now(), {
                        waitingFor: { owner: `stopped-by-owner:${id}` },
                        reason: "stopped by the owner; githerd release gives it back",
                    });
                    void ledger({ kind: "stopped-by-owner", job: id });
                    continue;
                }
                // Resume only when the last self-test verified it on the installed Claude Code
                // (design 11.4); otherwise the next session starts fresh.
                await recoverDeath({
                    job: state.jobs[id],
                    state,
                    repo: config.repo,
                    github: github(),
                    ledger,
                    resumeVerified: await resumeVerified(stateDir),
                    now,
                });
            }
            if (pass.ledger.length || pass.dead.length) await save();
            await workerPass();
        } catch (err) {
            const error = /** @type {Error} */ (err).message;
            say("error", `watchdog: ${error}`);
            void ledger({ kind: "watch-error", job: null, error });
        } finally {
            watching = false;
            syncWatch();
        }
    }

    /** @type {Promise<void> | null} the gating of a new version of githerd, while it runs */
    let updating = null;
    /** @type {{abort: AbortController, ctx: import("./launcher.mjs").LauncherContext} | null} how to stop it */
    let gatingNow = null;
    /** Whether this daemon looked for an unfinished gate's leftovers yet. */
    let reaped = false;

    /**
     * Gates the default branch's version of githerd when it differs from the running one and has no
     * verdict yet (design 9.8). The gates are child processes, so the reconcile goes on meanwhile; a
     * restarter adopts a version that passed. Never in the development daemon, in fatal mode (the
     * restarter gates then), when fenced, while another process gates, or when the running code is
     * not an archived copy (no code hash). The first call removes what an unfinished gate left.
     */
    async function selfUpdate() {
        if (env.GITHERD_DEV || !codeHash || updating !== null || fenced || stopping) return;
        const found = launcherContext({ cwd: root, env, stateDir });
        if (found.kind !== "ready") return;
        if (!reaped) {
            // A gate a crashed daemon or launcher left: its processes, worktrees and self-test.
            reaped = true;
            const left = await reapStaleGate(found.ctx);
            if (left?.length) say("error", `self-update: left behind: ${left.join("; ")}`);
        }
        if (fatal) return;
        // Another process (a restarter, while this daemon was fatal) gates already.
        if (gateLocked(found.ctx)) return;
        const target = await targetCode(found.ctx);
        if (target.hash === codeHash || updateGate(stateDir, target.hash) !== "pending") return;
        const abort = new AbortController();
        gatingNow = { abort, ctx: found.ctx };
        updating = prepareUpdate(found.ctx, target, undefined, { signal: abort.signal })
            .then(() => {})
            .catch((err) => say("error", `self-update: ${err.message}`))
            .finally(() => {
                updating = null;
                gatingNow = null;
            });
    }

    /** Polls, then schedules the next poll. */
    async function tick() {
        timer = null;
        // Events a hook spooled while this daemon was up but slow land now, not at the next start.
        await drainHooks();
        ensurePushQueue();
        try {
            await poll();
        } catch (err) {
            say("error", `poll: ${/** @type {Error} */ (err).message}`);
        }
        await selfUpdate().catch((err) => say("error", `self-update: ${err.message}`));
        if (stopping || fenced) return;
        const ms = (config?.pollSeconds ?? 180) * 1000 * intervalFactor;
        nextPollAt = new Date(now().getTime() + ms).toISOString();
        timer = setTimeout(tick, ms);
    }

    /**
     * The one tool githerd offers without a valid config.
     * @returns {import("./mcp.mjs").Tool[]} the tool
     */
    const unconfigured = () => [
        {
            name: "githerd_status",
            description: "githerd's state for this repository.",
            inputSchema: { type: "object", properties: {} },
            handler: () => `githerd is not running a valid config: ${configError}`,
        },
    ];

    /**
     * The eleven tools of design section 6, for every session. It serves
     * the current tool protocol, and the previous one while a live session may still speak it; a
     * call in any other protocol is refused before anything runs (design 9.8).
     */
    const sessionMcp = createMcpServer({
        serverInfo: { name: "githerd", version },
        protocols: () => servedProtocols(state.sessions),
        banner: () => alertBanner(state) ?? "",
        tools: () => {
            if (!config) return unconfigured();
            const t = now();
            return sessionToolSet({
                state,
                config,
                now: t,
                status: {
                    config,
                    now: t,
                    startedAt: startedAtDate,
                    version,
                    mode: mode(),
                    polledAt: loopTickAt,
                    nextPollAt,
                },
                push: ensurePushQueue(),
                github: github(),
                // ponytail: the snapshot lists the live sessions without the files each worktree
                // changes; read every worktree's diff here once overlap judgments need it.
                snapshotFacts: () => ({
                    ownerSessions: Object.entries(state.sessions ?? {}).map(([name, s]) => ({
                        name,
                        cwd: /** @type {any} */ (s).cwd,
                        branch: /** @type {any} */ (s).branch,
                    })),
                }),
                commit: async (entry) => {
                    await save();
                    await ledger(entry);
                },
                uid: process.getuid?.() ?? 0,
                io: doneReader(),
                ring: ringJob,
            });
        },
    });

    /**
     * The /health answer (design section 3.2).
     * @returns {Record<string, unknown>} the fields
     */
    const health = () => ({
        name: "githerd",
        protocol: PROTOCOL,
        version,
        codeHash,
        root,
        pid: process.pid,
        port: boundPort,
        mode: mode(),
        startedAt,
        loopTickAt,
        lastPollOkAt,
        lastPollError: lastPollError ?? configError,
        githubDownSince: state.github.downSince ?? null,
        notifyBrokenSince: state.notify?.brokenSince ?? null,
        fatal: fatal && firstLine(fatal),
    });

    /**
     * Reads a request body as JSON.
     * @param {import("node:http").IncomingMessage} req the request
     * @returns {Promise<any>} the parsed body, or a string the JSON-RPC core reports as a parse error
     */
    function body(req) {
        return new Promise((resolve, reject) => {
            let text = "";
            req.setEncoding("utf8");
            req.on("data", (chunk) => {
                text += chunk;
                if (text.length > MAX_BODY) {
                    reject(new Error("request body too large"));
                    req.destroy();
                }
            });
            req.on("end", () => resolve(text));
            req.on("error", reject);
        });
    }

    /**
     * The owner's CLI commands that change state: `ack`, `veto`, and the owner layer's `answer`,
     * `order`, `policy` and `policy-end` (owner.mjs).
     * A worker (the request names its job) may record an answer, order or policy only as
     * `githerd_record` allows it, within 30 minutes of the owner steering it; `ack`, `veto` and
     * `policy-end` are refused to it outright.
     * @param {any} cmd `{op: "ack", key}`, `{op: "veto", id}` with `id` `issue:<n>` or `pr:<n>`, or
     *   an owner-layer command
     * @param {string | null} worker the calling worker's job, null for the owner
     * @returns {{status: number, text: string, entry?: {kind: string} & Record<string, unknown>,
     *   resumed?: {job: string}[]}} the answer, the ledger entry when something changed, and the
     *   jobs an answer sent back to work
     */
    function owner(cmd, worker) {
        if (worker && ["ack", "veto", "policy-end"].includes(cmd?.op)) {
            return { status: 403, text: `${cmd.op} is the owner's: a worker cannot run it` };
        }
        if (cmd?.op === "ack") {
            const result = board.resolve(state, { key: String(cmd.key) }, now());
            if (!result.ok) return { status: 404, text: /** @type {any} */ (result).error };
            return {
                status: 200,
                text: `resolved ${cmd.key}`,
                entry: { kind: "escalation", key: cmd.key, resolved: true, by: "owner" },
            };
        }
        if (cmd?.op === "veto") {
            const target = String(cmd.id);
            if (!/^(issue|pr):\d+$/.test(target))
                return { status: 400, text: `veto takes issue:<n> or pr:<n>, not ${target}` };
            if (state.vetoes?.[target]) return { status: 409, text: `${target} is already vetoed` };
            const ended = veto(state, target, { by: "owner", reason: "githerd veto", at: now().toISOString() });
            const what = ended ? `: its ${ended.kind} proposal ended` : "";
            return {
                status: 200,
                text: `vetoed ${target}${what}; githerd will never propose closing it`,
                entry: { kind: "veto", target, by: "owner" },
            };
        }
        if (["answer", "order", "policy", "policy-end"].includes(cmd?.op))
            return ownerCommand(state, cmd, now(), worker);
        if (CONTROL_OPS.has(cmd?.op)) {
            if (worker) return { status: 403, text: `${cmd.op} is the owner's: a worker cannot run it` };
            return controlCommand(state, cmd, now());
        }
        return {
            status: 400,
            text: "op must be ack, veto, answer, order, policy, policy-end, pause, resume, workers, keep or release",
        };
    }

    /**
     * `POST /rpc`: one JSON-RPC message. A caller without a session header (the owner's CLI) is
     * not registered as a session.
     * @param {import("node:http").IncomingMessage} req the request
     * @returns {Promise<[number, unknown?]>} the status and the reply
     */
    async function rpcRoute(req) {
        const session = req.headers["x-githerd-session"];
        if (!session) ownerPresent(req);
        const caller = session ? { session: String(session) } : {};
        const reply = await sessionMcp.handle(await body(req), caller);
        return reply === null ? [202] : [200, reply];
    }

    /**
     * Records the owner's presence for a CLI request that says it comes from him.
     * @param {import("node:http").IncomingMessage} req the request
     */
    function ownerPresent(req) {
        if (req.headers["x-githerd-caller"] === "owner") notePresence(state, "cli", now().toISOString());
    }

    /**
     * `POST /heartbeat`: registers or refreshes a session.
     * @param {import("node:http").IncomingMessage} req the request
     * @returns {Promise<[number, unknown?]>} the status and the reply
     */
    async function heartbeatRoute(req) {
        const beat = JSON.parse(await body(req));
        if (typeof beat?.session !== "string" || beat.session === "") return [400, { error: "session is required" }];
        board.heartbeat(state, { session: beat.session, cwd: beat.cwd, branch: beat.branch }, now());
        const typed = typeof beat.typedAt === "string" ? Date.parse(beat.typedAt) : Number.NaN;
        if (typed <= now().getTime()) notePresence(state, "session", new Date(typed).toISOString());
        await save();
        return [200, { ok: true }];
    }

    /**
     * `POST /owner`: the owner's CLI.
     * @param {import("node:http").IncomingMessage} req the request
     * @returns {Promise<[number, unknown?]>} the status and the reply
     */
    async function ownerRoute(req) {
        ownerPresent(req);
        const job = req.headers["x-githerd-job"];
        const cmd = JSON.parse(await body(req));
        // The owner's words count only from his own terminal: an agent's Bash tool has none.
        const terminal = req.headers["x-githerd-caller"] === "owner" && req.headers["x-githerd-tty"] === "1";
        if (!job && !terminal && OWNER_WORDS.has(cmd?.op)) {
            const text =
                `githerd ${cmd.op} counts as the owner's words only from his own terminal; ` +
                "a Claude session records what he typed there with githerd_record";
            return [403, { ok: false, text }];
        }
        const answer = owner(cmd, job ? String(job) : null);
        if (answer.entry) {
            await save();
            await ledger(answer.entry);
        }
        for (const r of answer.resumed ?? []) await ringJob(state.jobs[r.job]);
        if (answer.entry?.kind === "control") setImmediate(() => void retire().then(() => workerPass()));
        return [answer.status, { ok: answer.status === 200, text: answer.text }];
    }

    /**
     * What the hooks need to know that is not in the state (design 4.10). The done-condition was
     * checked when the worker called `githerd_done`: a job that holds is `done`, and what was missing
     * is the last "not done yet" news.
     * @returns {import("./hook.mjs").HookFacts} the facts
     */
    function hookFacts() {
        const ctx = {
            state,
            config,
            caller: {},
            now: now(),
            startedAt: startedAtDate,
            version,
            mode: mode(),
            polledAt: loopTickAt,
            nextPollAt,
        };
        return /** @type {any} */ ({
            status: config ? statusData(state, ctx) : { banner: `githerd has no valid config: ${configError}` },
            models: MODELS,
            githubUnknownSince: state.github.downSince ?? null,
            uid: process.getuid?.() ?? 0,
            doneHolds: (/** @type {any} */ job) => job.state === "done",
            missing: (/** @type {any} */ job) =>
                job.news.findLast((/** @type {any} */ n) => n.text.startsWith(NOT_DONE))?.text.slice(NOT_DONE.length) ??
                "",
        });
    }

    /**
     * Answers one hook event, live or spooled, and records what it changed. An event is applied
     * once: its id is remembered, and the spooled copy of an event the daemon already answered live
     * is skipped. A spooled event is applied at the time it happened, and a spooled Stop or
     * StopFailure older than the API record it would change is dropped.
     * @param {import("./hook.mjs").HookRequest} req the event
     * @param {boolean} [spooled] it comes from the spool
     * @returns {Promise<import("./hook.mjs").HookAnswer>} the answer for the hook
     */
    async function handleHook(req, spooled = false) {
        const seen = (state.hookIds ??= []);
        const skip = async (/** @type {string} */ kind) => {
            await ledger({ kind, event: req.event, job: req.job ?? null, id: req.id ?? null, ts: req.ts ?? null });
            return {};
        };
        if (req.id && seen.includes(req.id)) return skip("hook-duplicate");
        const remember = () => {
            if (!req.id) return;
            seen.push(req.id);
            if (seen.length > HOOK_IDS) seen.splice(0, seen.length - HOOK_IDS);
        };
        if (spooled && staleSpooled(state, req)) {
            remember();
            await save();
            return skip("hook-stale");
        }
        const at = spooled && req.ts && !Number.isNaN(Date.parse(req.ts)) ? new Date(req.ts) : now();
        const result = answerHook(state, req, hookFacts(), at);
        remember();
        await save();
        for (const line of result.ledger) await ledger(line);
        // The job is done or left this session: end it once the hook has its answer.
        if (result.end && !spooled) {
            setImmediate(() => {
                void retire().then(() => workerPass());
            });
        }
        return result.answer;
    }

    /**
     * `POST /hook`: one hook event (design 4.10).
     * @param {import("node:http").IncomingMessage} req the request
     * @returns {Promise<[number, unknown?]>} the status and the reply
     */
    async function hookRoute(req) {
        const event = JSON.parse(await body(req));
        if (typeof event?.event !== "string") return [400, { error: "event is required" }];
        return [200, await handleHook(event)];
    }

    /** @type {Record<string, (req: import("node:http").IncomingMessage) => Promise<[number, unknown?]>>} */
    const routes = {
        "POST /rpc": rpcRoute,
        "POST /heartbeat": heartbeatRoute,
        "POST /owner": ownerRoute,
        "POST /hook": hookRoute,
    };

    const server = createServer(async (req, res) => {
        const send = (/** @type {number} */ status, /** @type {unknown} */ value) => {
            res.writeHead(status, { "content-type": "application/json" });
            res.end(value === undefined ? "" : JSON.stringify(value));
        };
        try {
            if (req.method === "GET" && req.url === "/health") return send(200, health());
            if (fatal) return send(503, { error: `githerd is DOWN: ${firstLine(fatal)}` });
            const route = routes[`${req.method} ${req.url}`];
            if (!route) return send(404, { error: "not found" });
            const [status, value] = await route(req);
            return send(status, value);
        } catch (err) {
            return send(400, { error: /** @type {Error} */ (err).message });
        }
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => resolve(undefined));
    });
    const boundPort = /** @type {import("node:net").AddressInfo} */ (server.address()).port;

    const daemonFile = join(stateDir, "daemon.json");
    const tmp = `${daemonFile}.${process.pid}.tmp`;
    writeFileSync(tmp, `${JSON.stringify({ ...self, port: boundPort, root, codeHash, startedAt })}\n`);
    renameSync(tmp, daemonFile);
    say("info", `githerd ${version} listening on 127.0.0.1:${boundPort} for ${root} (${mode()})`);

    /**
     * The owner item for state githerd could not read: what it knew about incidents, proposals
     * and runs is gone, and runs wait. It blocks every worker start, so it pages while he is away.
     * @param {string} summary what happened
     */
    function stateItem(summary) {
        raiseItem(
            state,
            { id: `state-reset:${startedAt}`, kind: "state-reset", question: summary, blocks: "workers" },
            now(),
        );
    }

    /**
     * Raises what a start found wrong: a notify command that cannot run, and state that was not
     * read whole from state.json.
     */
    function reportStart() {
        const notifyProblem = notifyCommandProblem(config?.notify?.command ?? null, env);
        if (notifyProblem) {
            state.notify.brokenSince ??= startedAt;
            state.notify.lastError = notifyProblem;
            say("error", notifyProblem);
        }
        const kept = loaded.kept.map((f) => basename(f)).join(", ") || "nothing";
        const detail = loaded.errors.join("\n");
        if (loaded.source === "empty") {
            const summary = `state.json unreadable; githerd started empty (files kept as ${kept})`;
            raise({ key: "state-reset", kind: "blocked", summary, detail });
            stateItem(summary);
        } else if (loaded.source === "ledger") {
            const summary = `state.json and its backup unreadable; githerd rebuilt jobs, claims and sessions from the ledger (files kept as ${kept})`;
            raise({ key: "state-from-ledger", kind: "blocked", summary, detail });
            stateItem(summary);
        } else if (loaded.source === "bak") {
            const summary = `state.json unreadable; githerd started from state.json.bak (file kept as ${kept})`;
            raise({ key: "state-from-backup", kind: "other", summary, detail });
        }
        if (loaded.readOnly) {
            raise({
                key: "state-newer-schema",
                kind: "blocked",
                summary: `state.json has schema ${state.schema}, newer than this githerd; serving status only`,
            });
        }
    }

    reportStart();
    await save();
    if (containerRestarted) {
        ledger({ kind: "event", event: "container-restart", from: previous.alive.pid1Start, to: pid1Start });
    }
    voided.forEach((job) => ledger({ kind: "holder-voided", job, reason: "container restarted" }));
    const aliveTimer = setInterval(() => {
        if (!fenced) beat();
    }, aliveMs);
    aliveTimer.unref();
    syncWatch();

    /**
     * Enters fatal mode (design section 9.6): `FATAL`, no more polls (the loop still ticks, so
     * launchers see it up), every request but /health refused with the reason, one page.
     * @param {string} reason why; its first line is what every surface shows
     */
    function enterFatal(reason) {
        if (fatal || fenced) return;
        fatal = reason;
        say("error", `fatal: ${firstLine(reason)}`);
        try {
            writeFatal(stateDir, reason);
        } catch (err) {
            say("error", `FATAL: ${/** @type {Error} */ (err).message}`);
        }
        ledger({ kind: "fatal", reason });
        notifier.send({
            key: `fatal:${firstLine(reason)}`,
            status: "error",
            message: `githerd is DOWN: ${firstLine(reason)}`,
            bypass: true,
            always: true,
        });
        notifier
            .flush()
            .then(save)
            .catch((err) => say("error", `fatal page: ${err.message}`));
    }

    /**
     * An uncaught exception or rejection: recorded, then fatal mode instead of exiting.
     * @param {unknown} err what was thrown
     */
    const onUncaught = (err) => {
        const stack = err instanceof Error ? (err.stack ?? err.message) : inspect(err);
        ledger({ kind: "exception", stack });
        enterFatal(`uncaught exception: ${stack}`);
    };
    if (fatalOnUncaught) {
        process.on("uncaughtException", onUncaught);
        process.on("unhandledRejection", onUncaught);
    }

    /**
     * Records the hook events left while the daemon was down and answers each one, so its effect
     * on the state lands late rather than never. Appended directly, so a failed append throws and
     * leaves the event in the spool.
     */
    async function drainHooks() {
        if (loaded.readOnly || fenced) return;
        try {
            const drained = await drainSpool(stateDir, async (e) => {
                await appendLedger(stateDir, { kind: "spooled", spooled: e }, { now });
                if (typeof e.event === "string") await handleHook(e, true);
            });
            for (const name of drained.bad) say("error", `spool: ${name} did not parse and was removed`);
        } catch (err) {
            say("error", `spool: left for the next start: ${/** @type {Error} */ (err).message}`);
        }
    }

    /**
     * The push queue (design 4.8), made once, when githerd may write and has a config: making it
     * recovers the pushes a stopped githerd left and starts the queued ones. Its pushes run the
     * branch's code, so they get the allow-listed environment of `codeEnv`, never this one.
     * @returns {ReturnType<typeof createPushQueue> | null} the queue, or null while it cannot run
     */
    function ensurePushQueue() {
        if (pushQueue || !config || fatal || loaded.readOnly || fenced || stopping) return pushQueue;
        pushQueue = createPushQueue({
            root,
            state,
            ledger,
            save,
            mode: writeMode,
            ring: ringJob,
            credentialBlocked: () => (state.apiStop?.kind === "credential" ? state.apiStop.error : null),
            defaultBranch: state.master.branch ?? "master",
            env: pushEnv(),
            secrets,
            protectedPaths: () => config?.protectedPaths ?? [],
            now,
            others: overlapFacts,
        });
        return pushQueue;
    }

    /**
     * Every other in-flight job's worktree and every owner session, with the files each is changing
     * (design 8.2), for the overlap check at a push. A session in a job's worktree is that job's.
     * @param {string} except the job that pushed
     * @returns {Promise<{job?: string, session?: string, files: string[]}[]>} the holders and files
     */
    async function overlapFacts(except) {
        const base = `origin/${state.master.branch ?? "master"}`;
        // A checkout git cannot read (gone, not a repository) is left out, not the whole check.
        const files = (/** @type {string} */ dir) =>
            existsSync(dir) ? changedFiles(dir, base).catch(() => null) : Promise.resolve(null);
        const jobTrees = new Set();
        /** @type {{job?: string, session?: string, files: string[]}[]} */
        const out = [];
        for (const j of Object.values(state.jobs ?? {})) {
            if (!j.worktree) continue;
            jobTrees.add(j.worktree);
            if (j.id === except || j.state === "queued" || board.TERMINAL.includes(j.state)) continue;
            const changed = await files(j.worktree);
            if (changed) out.push({ job: j.id, files: changed });
        }
        /** @type {Map<string, string[] | null>} */
        const byCwd = new Map();
        for (const [name, s] of Object.entries(state.sessions ?? {})) {
            const cwd = /** @type {any} */ (s).cwd;
            if (!cwd || [...jobTrees].some((t) => cwd === t || cwd.startsWith(`${t}/`))) continue;
            if (!byCwd.has(cwd)) byCwd.set(cwd, await files(cwd));
            const changed = byCwd.get(cwd);
            if (changed) out.push({ session: name, files: changed });
        }
        return out;
    }

    /**
     * The environment of anything that runs a branch's code for githerd (a push and its gate, the
     * reference worktree's checks): `codeEnv`, with the owner's signing variables, never the
     * daemon's own environment, which holds the notify command's keys.
     * @returns {Record<string, string>} the environment
     */
    function pushEnv() {
        /** @type {Record<string, string>} */
        let signing = {};
        try {
            signing = readSigningEnv(env.HOME ?? homedir());
        } catch (err) {
            say("error", `no signing variables: ${/** @type {Error} */ (err).message}`);
        }
        return codeEnv({ env, path: env.PATH ?? "", signing });
    }

    /**
     * Rings a job's worker with a push result, when it has a window (design 4.8, step 6).
     * @param {any} job the job
     * @returns {Promise<void>} once rung or found not ringable
     */
    async function ringJob(job) {
        const h = job.holder;
        // `githerd pause` stops every doorbell (design 7.6).
        if (!h?.pane || !h.nonce || state.settings?.paused) return;
        try {
            const window = { socket: h.socket, window: h.window, pane: h.pane, pid: h.pid, name: h.name };
            await ringWorker(window, { nonce: h.nonce, job: job.id });
        } catch (err) {
            void ledger({ kind: "doorbell-failed", job: job.id, error: /** @type {Error} */ (err).message });
        }
    }

    const bootReason = bootFatal ?? configFatal;
    if (bootReason) enterFatal(bootReason);
    else await drainHooks();
    ensurePushQueue();
    if (autoPoll) timer = setTimeout(tick, 0);

    /**
     * Stops polling and closes the server.
     * @param {{reason: string}} reason why
     * @returns {Promise<void>} resolves once closed
     */
    async function halt(reason) {
        stopping = true;
        if (timer) clearTimeout(timer);
        timer = null;
        clearInterval(aliveTimer);
        if (watchTimer) clearInterval(watchTimer);
        watchTimer = null;
        process.off("uncaughtException", onUncaught);
        process.off("unhandledRejection", onUncaught);
        released = true;
        if (!fenced) releaseLock(stateDir, self);
        await Promise.all(writes);
        server.closeAllConnections();
        await new Promise((resolve) => server.close(() => resolve(undefined)));
        finish(reason);
    }

    /**
     * The SIGTERM path (design section 3.2): stop the poll timer, the self-update gate and the push
     * queue, flush the state and close.
     * @returns {Promise<void>} resolves once the state is saved and the server closed
     */
    async function shutdown() {
        if (stopping) return done.then(() => {});
        stopping = true;
        if (timer) clearTimeout(timer);
        timer = null;
        // A gate in flight is killed, and what it left removed, so none outlives the daemon.
        if (updating !== null && gatingNow) {
            const { abort, ctx } = gatingNow;
            const left = await stopGating({
                root: ctx.root,
                stateDir: ctx.stateDir,
                pkgDir: ctx.pkgDir,
                env: ctx.env,
                abort,
                running: updating,
            });
            if (left.length) say("error", `self-update: left behind: ${left.join("; ")}`);
        }
        await refWork;
        await Promise.all(tasks.values());
        // A push killed here reaches its job as a failed push; the next start finds nothing running.
        pushQueue?.stop();
        await pushQueue?.drain();
        await save();
        await halt({ reason: "shutdown" });
    }

    return {
        fenced: false,
        fatal: () => fatal,
        containerRestarted,
        done,
        port: boundPort,
        url: `http://127.0.0.1:${boundPort}`,
        stateDir,
        state,
        poll,
        watch,
        drainHooks,
        shutdown,
        rpc: (message, context) => sessionMcp.handle(message, context ?? { session: "local" }),
        flushNotifications: () => notifier.flush(),
    };
}

/**
 * @typedef {object} Daemon
 * @property {boolean} fenced true when another live daemon owns the state directory; nothing else
 *   is set then except `done`
 * @property {Promise<{reason: string}>} done resolves when the daemon stops: "shutdown" or "fenced"
 * @property {number} [port] the bound port
 * @property {string} [url] `http://127.0.0.1:<port>`
 * @property {string} [stateDir] the state directory
 * @property {any} [state] the live state object
 * @property {() => Promise<{skipped?: true, fenced?: true, fatal?: string, ok?: boolean}>} [poll] one
 *   poll now
 * @property {() => Promise<void>} [watch] one watchdog pass now
 * @property {() => Promise<void>} [drainHooks] answers the spooled hook events now, as every poll does
 * @property {() => Promise<void>} [shutdown] the SIGTERM path
 * @property {() => string | null} [fatal] the fatal reason, null while not in fatal mode
 * @property {boolean} [containerRestarted] true when PID 1 started since the previous daemon's
 *   last `alive`
 * @property {(message: unknown, context?: any) => Promise<any>} [rpc] answers one JSON-RPC message
 * @property {() => Promise<void>} [flushNotifications] delivers queued pages
 */
