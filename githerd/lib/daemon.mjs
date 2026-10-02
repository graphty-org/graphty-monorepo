/**
 * The githerd daemon (design section 3.2): one long-lived process per repository that polls
 * GitHub (design section 6), keeps `state.json` and the ledger, answers the session tools over
 * HTTP and pages the owner by the paging policy.
 *
 * HTTP, on 127.0.0.1 only:
 * - `GET /health`: the fields launchers use to decide whether this daemon is usable.
 * - `POST /rpc`: MCP JSON-RPC; `X-Githerd-Session` names the calling session.
 * - `POST /heartbeat`: `{session, cwd, branch}` registers or refreshes a session.
 *
 * Fencing: after binding, the daemon writes `daemon.json` with its process identity. Before every
 * poll and every state write it reads the file again; when the file names another live process,
 * this daemon stops without writing anything. A daemon that finds such a file at startup never
 * binds at all.
 */

import { execFile } from "node:child_process";
import { accessSync, constants, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { delimiter, join } from "node:path";
import { homedir } from "node:os";

import * as board from "./board.mjs";
import { effectiveMode, resolveConfig } from "./config.mjs";
import { createGitHub } from "./github.mjs";
import { pollIssues } from "./issues.mjs";
import { findSuspects, masterVerdict, releaseState, updateLane } from "./master.mjs";
import { createMcpServer } from "./mcp.mjs";
import { accumulateMerged, searchMerged } from "./merged.mjs";
import { createNotifier } from "./notify.mjs";
import { pagesFor } from "./paging.mjs";
import { identify, sameProcess } from "./proc.mjs";
import { updatePrs, whyStuck } from "./prs.mjs";
import { appendLedger, loadState, saveState } from "./store.mjs";
import { sessionTools } from "./tools.mjs";
import { readVersion } from "./version.mjs";

/** The /health protocol; a launcher uses a daemon only when the major matches. */
export const PROTOCOL = 1;

/** Every git and gh call is killed after this long. */
const GIT_TIMEOUT_MS = 60_000;
/** GitHub unreachable this long raises a `blocked` escalation. */
const GITHUB_DOWN_MS = 30 * 60_000;
/** Largest request body accepted. */
const MAX_BODY = 1024 * 1024;
/** Where the issue poll starts on a fresh state: the whole history, read 10 pages per poll. */
const ISSUES_START = "1970-01-01T00:00:00Z";

const RED_JOB = new Set(["failure", "timed_out", "startup_failure"]);

/**
 * The open pull requests and the default branch's head (design section 6.1).
 * ponytail: first 50 PRs only; page with `after` when the open queue grows past 50
 */
const PRS_QUERY = `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef { name target { oid } }
    pullRequests(states: OPEN, first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        number title isDraft updatedAt headRefName headRefOid baseRefName
        mergeable mergeStateStatus
        autoMergeRequest { enabledAt }
        labels(first: 20) { nodes { name } }
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
        execFile("git", args, { cwd, env, timeout: timeoutMs, killSignal: "SIGKILL" }, (err, stdout, stderr) => {
            const e = /** @type {any} */ (err);
            resolve({
                code: e ? (typeof e.code === "number" ? e.code : 1) : 0,
                stdout: String(stdout),
                stderr: String(stderr),
            });
        });
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
 * Reads `daemon.json`.
 * @param {string} dir the state directory
 * @returns {any} its contents, or null when missing or unreadable
 */
function readDaemonFile(dir) {
    try {
        return JSON.parse(readFileSync(join(dir, "daemon.json"), "utf8"));
    } catch {
        return null;
    }
}

/**
 * Whether `daemon.json` names a live process other than this one.
 * @param {string} dir the state directory
 * @param {{pid: number, startTime: string, bootId: string}} self this process
 * @returns {any} the other daemon's record, or null
 */
function otherLiveDaemon(dir, self) {
    const rec = readDaemonFile(dir);
    if (!rec || !Number.isInteger(rec.pid)) return null;
    if (rec.pid === self.pid && rec.startTime === self.startTime && rec.bootId === self.bootId) return null;
    return sameProcess(rec) ? rec : null;
}

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
 * Starts the daemon.
 * @param {object} options what it runs on
 * @param {string} options.root the repository's main checkout
 * @param {number} options.port the port to bind on 127.0.0.1; 0 picks a free one
 * @param {import("./github.mjs").Exec} [options.exec] runs `gh`; the real one by default
 * @param {GitExec} [options.git] runs git; the real one by default
 * @param {() => Date} [options.now] the clock
 * @param {Record<string, string | undefined>} [options.env] the environment: `GITHERD_CONFIG`,
 *   `PATH`, and the secrets the outgoing-text check refuses
 * @param {string} [options.stateDir] where state lives; `<root>/.githerd` by default
 * @param {boolean} [options.autoPoll] poll at once and then on the timer; tests call `poll()`
 * @param {(line: string) => void} [options.log] one plain-ASCII line per event; stdout by default
 * @returns {Promise<Daemon>} the running daemon
 */
export async function startDaemon({
    root,
    port,
    exec,
    git = gitExec,
    now = () => new Date(),
    env = process.env,
    stateDir = join(root, ".githerd"),
    autoPoll = true,
    log = (line) => process.stdout.write(`${line}\n`),
}) {
    const startedAtDate = now();
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
    const other = otherLiveDaemon(stateDir, self);
    if (other) {
        say("error", `daemon.json names live daemon pid ${other.pid} on port ${other.port}; exiting without writing`);
        finish({ reason: "fenced" });
        return /** @type {Daemon} */ ({ fenced: true, done });
    }

    const loaded = await loadState(stateDir, { now });
    const state = loaded.state;
    for (const err of loaded.errors) say("error", `state: ${err}`);
    state.master ??= { lanes: {} };
    state.master.lanes ??= {};
    state.incidents ??= {};
    state.issues ??= { since: null, byNumber: {} };
    state.merged ??= { lastScanAt: null, pendingPaths: {}, closed: [] };
    state.rate ??= {};
    state.github ??= { downSince: null, lastError: null };
    state.schedule ??= {};

    let fenced = false;
    /** @type {Set<Promise<void>>} ledger appends not yet on disk */
    const writes = new Set();
    let stopping = false;
    /** @type {any} */
    let config = null;
    /** @type {string | null} */
    let configError = null;
    /** @type {string[]} raised during the current poll, or by startup */
    const raised = [];
    /** @type {any[]} the default branch's recent commits, head first; memory only */
    let commits = [];
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
    let intervalFactor = 1;

    const mode = () => (config ? effectiveMode(config, readOverride(stateDir)) : "dry-run");

    /**
     * Stops this daemon because another one owns the state directory.
     * @param {any} rec the other daemon's record
     */
    function fence(rec) {
        if (fenced) return;
        fenced = true;
        say("error", `daemon.json now names live daemon pid ${rec.pid} on port ${rec.port}; exiting without writing`);
        void halt({ reason: "fenced" });
    }

    /**
     * Whether this daemon may still write: not stopped by the fence, and not fenced now.
     * @returns {boolean} true when writing is allowed
     */
    function mayWrite() {
        if (fenced || loaded.readOnly) return false;
        const rec = otherLiveDaemon(stateDir, self);
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

    /**
     * Saves the state unless fenced or read-only.
     * @returns {Promise<void>} resolves once saved
     */
    async function save() {
        if (!mayWrite()) return;
        await saveState(stateDir, state);
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
        raised.push(args.key);
        say("info", `escalation ${args.kind} ${args.key}: ${args.summary}`);
        void ledger({
            kind: "escalation",
            key: args.key,
            escalationKind: args.kind,
            summary: args.summary,
            raisedBy: "daemon",
        });
    }

    /**
     * Reads the config (design section 3.4). A valid one replaces the running config and is saved
     * as the last valid one; an invalid one keeps the last valid config and raises one escalation.
     */
    function readConfig() {
        let problem;
        try {
            const r = resolveConfig(root, env);
            if (r.configured) {
                config = r.config;
                configError = null;
                state.config = r.config;
                if (state.escalations?.["config-invalid"] && !state.escalations["config-invalid"].resolvedAt) {
                    board.resolve(state, { key: "config-invalid" }, now());
                }
                return;
            }
            problem = /** @type {{reason: string}} */ (r).reason;
        } catch (err) {
            problem = /** @type {Error} */ (err).message;
        }
        if (state.config) {
            config = state.config;
            raise({
                key: "config-invalid",
                kind: "blocked",
                summary: "githerd.config.json is invalid; githerd keeps running on the last valid config",
                detail: problem,
            });
        } else {
            configError = problem;
        }
        say("error", `config: ${problem}`);
    }

    readConfig();

    const notifier = createNotifier({
        notify: () => config?.notify ?? { command: null, maxPerHour: 6 },
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
            mode,
            ledger,
            rate: state.rate,
            env,
            now: () => now().getTime(),
        }));

    /**
     * Sends the pages one event calls for.
     * @param {{type: string} & Record<string, any>} event the event
     */
    function page(event) {
        if (!config) return;
        for (const p of pagesFor(event, state, config)) notifier.send(p);
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
     * @param {Record<string, unknown>} fields what it is about
     */
    function event(name, fields) {
        void ledger({ kind: "event", event: name, ...fields });
        const lane = fields.lane ? ` ${fields.lane}` : "";
        const run = fields.runId ? ` ${fields.runId}/${fields.attempt ?? 1}` : "";
        const sha = typeof fields.sha === "string" ? ` ${fields.sha.slice(0, 9)}` : "";
        say("info", `${name}${lane}${run}${fields.conclusion ? ` ${fields.conclusion}` : ""}${sha}`);
    }

    /**
     * The failing job names of a workflow run.
     * @param {number} runId the run
     * @returns {Promise<string[]>} the jobs that failed
     */
    async function failingJobs(runId) {
        const res = await github().get(`repos/${config.repo}/actions/runs/${runId}/jobs?filter=latest&per_page=100`);
        return (res.body?.jobs ?? []).filter((j) => RED_JOB.has(j.conclusion)).map((j) => j.name);
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
            detail.files = (await pages(`repos/${repo}/pulls/${n}/files?per_page=100`, 30)).items.map(
                (f) => f.filename,
            );
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
                    detail.comments = (res.body ?? []).map((c) => ({ body: c.body ?? "", createdAt: c.created_at }));
                }
            }
        }
        node.detail = detail;
    }

    /**
     * Moves the incident record along with the verdict, and pages.
     * @param {any} m the master record
     * @param {{lane: string, runId: number, jobs?: string[]}[]} reds this poll's lane-red events
     * @param {string | null} previousGreen the green SHA before this poll
     * @param {string} iso the poll's time
     */
    async function track(m, reds, previousGreen, iso) {
        let open = Object.values(state.incidents).find((i) => i.status === "open");
        for (const red of reds) red.jobs = await failingJobs(red.runId);
        if (m.verdict === "red") {
            const gatingRed = Object.entries(m.lanes).filter(
                ([name, l]) => config.lanes[name] && config.lanes[name].gating !== "watch" && l.verdict === "red",
            );
            const opened = !open;
            if (!open) {
                const [, first] = gatingRed[0];
                const id = nextIncidentId(state.incidents, iso);
                open = state.incidents[id] = {
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
            }
            for (const [name, l] of gatingRed) {
                const jobs = reds.find((r) => r.lane === name && r.runId === l.runId)?.jobs;
                if (open.lanes[name]?.runId === l.runId && !jobs) continue;
                open.lanes[name] = {
                    runId: l.runId,
                    attempt: l.attempt,
                    sha: l.sha,
                    failingJobs: jobs ?? open.lanes[name]?.failingJobs ?? [],
                };
            }
            if (opened) {
                event("master-red-confirmed", {
                    incident: open.id,
                    lane: gatingRed[0][0],
                    runId: open.lanes[gatingRed[0][0]].runId,
                    sha: open.redSha,
                });
                // No judgment runs yet, so nothing else will handle it.
                page({ type: "master-red-confirmed", incident: open.id, runStarting: false });
            }
        } else if (m.verdict === "green" && open) {
            open.status = "resolved";
            open.resolvedAt = iso;
            const fix = commits.find((c) => c.sha === m.greenSha);
            m.fixedAt = fix?.commit?.committer?.date ?? iso;
            event("master-recovered", { incident: open.id, sha: m.greenSha });
            page({ type: "master-recovered", incident: open.id });
        }
        page({ type: "poll", now: iso });
    }

    /**
     * One poll of GitHub (design section 6).
     * @returns {Promise<string | null>} why nothing was asked of GitHub (a back-off), or null
     */
    async function pollGitHub() {
        const t = now();
        const ms = t.getTime();
        const iso = t.toISOString();
        const repo = config.repo;
        const [owner, name] = repo.split("/");
        const m = state.master;
        const gh = github();
        const pace = gh.pace();
        intervalFactor = pace.intervalFactor;
        if (pace.level === "wait") return `GitHub back-off until ${new Date(pace.until).toISOString()}`;
        const full = pace.level !== "masters-only";
        /** @type {Set<string>} derived escalations whose condition held this poll */
        const holding = new Set();
        const derived = (/** @type {any} */ args) => {
            holding.add(args.key);
            raise(args);
        };

        let headSha = m.headSha ?? null;
        /** @type {any[] | null} */
        let nodes = null;
        if (full) {
            const data = await gh.graphql(PRS_QUERY, { owner, name });
            m.branch = data.repository.defaultBranchRef.name;
            headSha = data.repository.defaultBranchRef.target.oid;
            nodes = data.repository.pullRequests.nodes;
        }
        const branch = m.branch ?? "master";

        /** @type {any[]} */
        const reds = [];
        for (const [lane, { workflow }] of Object.entries(config.lanes)) {
            const res = await gh.get(
                `repos/${repo}/actions/workflows/${workflow}/runs?branch=${branch}&per_page=10&exclude_pull_requests=true`,
            );
            const updated = updateLane(lane, m.lanes[lane], res.body?.workflow_runs ?? [], config, ms);
            m.lanes[lane] = updated.lane;
            for (const e of updated.events) {
                const { event: kind, ...fields } = e;
                event(kind, fields);
                if (kind === "lane-red" && config.lanes[lane].gating !== "watch") reds.push({ lane, runId: e.runId });
            }
        }
        for (const [lane, l] of Object.entries(m.lanes)) {
            for (const [runId, run] of Object.entries(l.inFlight ?? {})) {
                if (run.reportedAt) {
                    derived({
                        key: `lane-stuck:${lane}:${runId}`,
                        kind: "blocked",
                        summary: `${lane} run ${runId} queued or running since ${run.firstSeenAt.slice(0, 16)} UTC`,
                        clearWhen: "lane-run-done",
                    });
                }
            }
        }

        const moved = headSha !== null && headSha !== m.headSha;
        if (moved || (commits.length === 0 && headSha)) {
            commits = (await gh.get(`repos/${repo}/commits?sha=${branch}&per_page=30`)).body ?? [];
        }
        if (moved) {
            m.headSha = headSha;
            m.configPending = true;
            const merged = await searchMerged(gh, repo, state.merged.lastScanAt ?? iso);
            state.merged = accumulateMerged(state.merged, merged);
            state.merged.lastScanAt ??= iso;
        }
        if (m.configPending) {
            const fetched = await runGit(["fetch", "origin", branch]);
            if (fetched.code === 0) m.configPending = false;
            else say("error", `git fetch origin ${branch}: ${fetched.stderr.trim() || `exit ${fetched.code}`}`);
            readConfig();
        }

        const previousGreen = m.greenSha ?? null;
        const previousVerdict = m.verdict ?? "unknown";
        if (m.headSha)
            Object.assign(m, masterVerdict(m.lanes, config, { headSha: m.headSha, commits, greenSha: previousGreen }));
        else m.verdict = "unknown";
        if (m.verdict !== previousVerdict) m.since = iso;
        await track(m, reds, previousGreen, iso);

        if (config.lanes.release || config.release) {
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

        if (nodes) {
            state.prs ??= {};
            for (const node of nodes) await prDetail(node, state.prs[node.number]);
            const view = {
                verdict: m.verdict,
                branch,
                fixPr: state.claims?.master?.fixPr ?? null,
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
            for (const [n, rec] of Object.entries(prs)) {
                rec.stuck = whyStuck(Number(n), rec, {
                    master: view,
                    config,
                    now: ms,
                    claims: state.claims,
                    sessions: state.sessions,
                });
            }
            state.prs = prs;

            const issues = await pollIssues(gh, repo, state.issues, ISSUES_START);
            state.issues = { since: issues.since, byNumber: issues.byNumber };
        }

        if (state.rate.downSince && ms - Date.parse(state.rate.downSince) >= GITHUB_DOWN_MS) {
            derived({
                key: "github-down",
                kind: "blocked",
                summary: `GitHub unreachable since ${state.rate.downSince.slice(0, 16)} UTC`,
                clearWhen: "github-up",
            });
        }
        for (const key of board.resolveDerived(state, (esc) => holding.has(esc.key), t)) {
            void ledger({ kind: "escalation", key, resolved: true, by: "daemon" });
        }
        return null;
    }

    /**
     * One poll attempt: skipped while another runs. `loopTickAt` is set whether or not GitHub
     * answers.
     * @returns {Promise<{skipped?: true, fenced?: true, ok?: boolean}>} what happened
     */
    async function poll() {
        if (busy || stopping || fenced || loaded.readOnly) return { skipped: true };
        busy = true;
        const t = now();
        loopTickAt = t.toISOString();
        try {
            if (!mayWrite()) return { fenced: true };
            if (!config) {
                readConfig();
                return { ok: false };
            }
            raised.length = 0;
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
            if (raised.length) page({ type: "escalations-raised", keys: [...raised] });
            const today = loopTickAt.slice(0, 10);
            if (String(state.schedule.lastAliveAt ?? "").slice(0, 10) !== today) {
                state.schedule.lastAliveAt = loopTickAt;
                page({ type: "daily", date: today });
            }
            await save();
            if (!fenced) void notifier.flush();
            return { ok: lastPollOkAt === loopTickAt };
        } finally {
            busy = false;
        }
    }

    /** Polls, then schedules the next poll. */
    async function tick() {
        timer = null;
        try {
            await poll();
        } catch (err) {
            say("error", `poll: ${/** @type {Error} */ (err).message}`);
        }
        if (stopping || fenced) return;
        const ms = (config?.pollSeconds ?? 180) * 1000 * intervalFactor;
        nextPollAt = new Date(now().getTime() + ms).toISOString();
        timer = setTimeout(tick, ms);
    }

    const mcp = createMcpServer({
        serverInfo: { name: "githerd", version },
        tools: (/** @type {any} */ caller) => {
            if (!config) {
                return [
                    {
                        name: "githerd_status",
                        description: "githerd's state for this repository.",
                        inputSchema: { type: "object", properties: {} },
                        handler: () => `githerd is not running a valid config: ${configError}`,
                    },
                ];
            }
            return sessionTools({
                state,
                config,
                caller,
                now: now(),
                startedAt: startedAtDate,
                version,
                mode: mode(),
                polledAt: loopTickAt,
                nextPollAt,
                commit: async (entry) => {
                    await save();
                    await ledger(/** @type {any} */ (entry));
                },
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
        runsInFlight: Object.values(state.runs ?? {}).filter((r) => r.status === "running").length,
        notifyBrokenSince: state.notify?.brokenSince ?? null,
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

    const server = createServer(async (req, res) => {
        const send = (/** @type {number} */ status, /** @type {unknown} */ value) => {
            res.writeHead(status, { "content-type": "application/json" });
            res.end(value === undefined ? "" : JSON.stringify(value));
        };
        try {
            if (req.method === "GET" && req.url === "/health") return send(200, health());
            if (req.method === "POST" && req.url === "/rpc") {
                const session = String(req.headers["x-githerd-session"] ?? "unknown");
                const reply = await mcp.handle(await body(req), { session });
                return reply === null ? send(202) : send(200, reply);
            }
            if (req.method === "POST" && req.url === "/heartbeat") {
                const beat = JSON.parse(await body(req));
                if (typeof beat?.session !== "string" || beat.session === "")
                    return send(400, { error: "session is required" });
                board.heartbeat(state, { session: beat.session, cwd: beat.cwd, branch: beat.branch }, now());
                await save();
                return send(200, { ok: true });
            }
            return send(404, { error: "not found" });
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

    const notifyProblem = notifyCommandProblem(config?.notify?.command ?? null, env);
    if (notifyProblem) {
        state.notify.brokenSince ??= startedAt;
        state.notify.lastError = notifyProblem;
        say("error", notifyProblem);
    }
    if (loaded.readOnly) {
        raise({
            key: "state-newer-schema",
            kind: "blocked",
            summary: `state.json has schema ${state.schema}, newer than this githerd; serving status only`,
        });
    }
    await save();
    if (autoPoll && !loaded.readOnly) timer = setTimeout(tick, 0);

    /**
     * Stops polling and closes the server.
     * @param {{reason: string}} reason why
     * @returns {Promise<void>} resolves once closed
     */
    async function halt(reason) {
        stopping = true;
        if (timer) clearTimeout(timer);
        timer = null;
        await Promise.all(writes);
        server.closeAllConnections();
        await new Promise((resolve) => server.close(() => resolve(undefined)));
        finish(reason);
    }

    /**
     * The SIGTERM path (design section 3.2): stop the poll timer, mark running runs
     * `interrupted`, flush the state and close.
     * @returns {Promise<void>} resolves once the state is saved and the server closed
     */
    async function shutdown() {
        if (stopping) return done.then(() => {});
        stopping = true;
        if (timer) clearTimeout(timer);
        timer = null;
        for (const run of Object.values(state.runs ?? {})) {
            if (run.status === "running") run.status = "interrupted";
        }
        await save();
        await halt({ reason: "shutdown" });
    }

    return {
        fenced: false,
        done,
        port: boundPort,
        url: `http://127.0.0.1:${boundPort}`,
        stateDir,
        state,
        poll,
        shutdown,
        rpc: (message, context = { session: "local" }) => mcp.handle(message, context),
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
 * @property {() => Promise<{skipped?: true, fenced?: true, ok?: boolean}>} [poll] one poll now
 * @property {() => Promise<void>} [shutdown] the SIGTERM path
 * @property {(message: unknown, context?: any) => Promise<any>} [rpc] answers one JSON-RPC message
 * @property {() => Promise<void>} [flushNotifications] delivers queued pages
 */
