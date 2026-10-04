/**
 * Filling worker slots (design sections 7.1, 7.4, 8.1 and 8.3): once per reconcile the daemon
 * admits queued jobs in the order of design 5.4 while a slot is free, prepares each one's worktree,
 * writes its settings, MCP config and guard files, and opens its tmux window. It also continues a
 * working job whose session is gone (a death, a restart), ends the oldest waiting session past the
 * waiting cap and a parked job's session, and lifts a usage stop with one canary worker after the
 * reset.
 *
 * The slow steps (the worktree's install and build, the session's registry entry) run as tracked
 * background tasks, so the reconcile keeps running. Worktrees are prepared in parallel; sessions
 * start one at a time, and an urgent job skips that line.
 *
 * Starts happen only while the `workers` write group acts. In dry-run, paused or before the group is
 * switched on, each job the queue would start is a `would-do` ledger line, once per job.
 */

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { availableParallelism, homedir, loadavg } from "node:os";
import { join } from "node:path";

import * as board from "./board.mjs";
import { LAUNCH_PROMPT } from "./hook.mjs";
import { endItem, raiseItem } from "./notify.mjs";
import { jobOrder } from "./queue.mjs";
import { resumeVerified } from "./selftest.mjs";
import { startWorker } from "./tmux.mjs";
import { codeEnv, loginPath, readSigningEnv, workerArgv, workerEnv, writeJobFiles } from "./worker-settings.mjs";
import { prepareJobWorktree, run, signingProbe } from "./worktrees.mjs";

/** The machine limits of design 8.1: load under this share of the cores, memory over this share. */
const LOAD_SHARE = 0.75;
const MEMORY_SHARE = 0.15;
/** Subagents per worker and Chromium trees machine-wide, enforced by the guard (design 8.1). */
const SUBAGENTS = 2;
const BROWSERS = 4;
/** Real start failures after a passed self-test that stop every start until the owner looks. */
const START_FAILURES = 2;
/** With no reset time, a usage stop is probed this long after it began (design 8.3). */
const PROBE_HOURS = [1, 3, 6];
/** How long a `claude --version` answer and a signing probe are reused. */
const CACHE_MS = 10 * 60_000;
const HOUR = 3_600_000;
/** How long a faulted job waits before it goes back to the queue (design 5.3). */
const FAULT_RETRY_MS = 30 * 60_000;

/**
 * @typedef {object} Platform what a start touches outside the state; tests replace it
 * @property {() => Promise<string>} claudeVersion the installed Claude Code version
 * @property {() => any} selftest the last self-test record (`selftest.json`), or null
 * @property {() => Promise<boolean>} resumeVerified the self-test verified resume on this version
 * @property {() => {load: number, cores: number, memory: number}} machine load, cores and the share
 *   of memory available
 * @property {() => string} loginPath the owner's interactive login PATH
 * @property {() => Record<string, string>} signingEnv the owner's signing variables
 * @property {(env: Record<string, string>) => Promise<{ok: boolean, reason?: string}>} signing the
 *   signing probe with a worker's environment
 * @property {typeof prepareJobWorktree} prepare prepares a job's worktree
 * @property {typeof startWorker} start opens a worker's window and waits for its registry entry
 */

/**
 * @typedef {object} StartContext one reconcile's view
 * @property {any} state the daemon state; changed in place
 * @property {any} config the normalized config
 * @property {string} root the main checkout
 * @property {string} stateDir githerd's state directory
 * @property {Record<string, string | undefined>} env the daemon's environment
 * @property {() => Date} now the clock
 * @property {(entry: {kind: string} & Record<string, unknown>) => Promise<void> | void} ledger the ledger
 * @property {() => Promise<void>} save persists the state
 * @property {string} mode the `workers` write group's mode
 * @property {Platform} platform the outside world
 * @property {Map<string, Promise<void>>} tasks start tasks in flight, by job; kept by the caller
 */

/**
 * The real platform.
 * @param {{env: Record<string, string | undefined>, stateDir: string}} where the daemon's
 *   environment and state directory
 * @returns {Platform} it
 */
export function realPlatform({ env, stateDir }) {
    const home = env.HOME ?? homedir();
    /** @type {{at: number, value: string} | null} */
    let path = null;
    /** @type {{at: number, value: string} | null} */
    let version = null;
    const login = () => {
        if (!path || Date.now() - path.at > CACHE_MS) {
            const value = loginPath({ shell: env.SHELL ?? "/bin/bash", home, user: env.USER ?? "", lang: env.LANG });
            path = { at: Date.now(), value };
        }
        return path.value;
    };
    return {
        async claudeVersion() {
            if (version && Date.now() - version.at < CACHE_MS) return version.value;
            const r = await run("claude", ["--version"], { cwd: home, env: { HOME: home, PATH: login() } });
            const value = /^(\d+\.\d+\.\d+)/.exec(r.stdout.trim())?.[1];
            if (r.code !== 0 || !value) throw new Error(`claude --version: ${(r.stderr || r.stdout).trim()}`);
            version = { at: Date.now(), value };
            return value;
        },
        selftest: () => readJson(join(stateDir, "selftest.json")),
        resumeVerified: () => resumeVerified(stateDir),
        machine: () => ({ load: loadavg()[0], cores: availableParallelism(), memory: memoryShare() }),
        loginPath: login,
        signingEnv: () => readSigningEnv(home),
        signing: (workerVars) => signingProbe({ env: workerVars }),
        prepare: prepareJobWorktree,
        start: startWorker,
    };
}

/**
 * A JSON file, or null.
 * @param {string} file the path
 * @returns {any} its value
 */
function readJson(file) {
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    } catch {
        return null;
    }
}

/**
 * The share of memory available, from `/proc/meminfo`; 1 when it cannot be read.
 * @returns {number} from 0 to 1
 */
function memoryShare() {
    try {
        const info = readFileSync("/proc/meminfo", "utf8");
        const kb = (/** @type {string} */ name) => Number(new RegExp(`^${name}:\\s+(\\d+)`, "m").exec(info)?.[1] ?? 0);
        return kb("MemTotal") ? kb("MemAvailable") / kb("MemTotal") : 1;
    } catch {
        return 1;
    }
}

/**
 * Whether a job takes the urgent slot: an incident on master, the release or a shared key, or the
 * review of an incident's fix (design 8.1).
 * @param {any} job the job
 * @returns {boolean} urgent
 */
export function isUrgent(job) {
    return (job.kind === "incident" && job.facts?.scope !== "low") || (job.kind === "review" && job.facts?.urgent);
}

/** States in which a job holds a working slot. */
const WORKING = new Set(["starting", "working"]);

/**
 * When a usage stop may be probed with one canary worker: the reset time the limit screen showed,
 * or 1, 3 and then 6 hours after the stop began (design 8.3).
 * @param {any} stop `state.apiStop` of kind `usage`
 * @param {number} probes canaries started since the stop began
 * @returns {Date} the time
 */
export function canaryAt(stop, probes) {
    const reset = stop.resets ? resetAt(stop.resets, new Date(stop.at)) : null;
    if (reset && probes === 0) return reset;
    const hours = PROBE_HOURS[Math.min(probes, PROBE_HOURS.length - 1)];
    return new Date(Date.parse(stop.at) + hours * HOUR * (reset ? 2 : 1));
}

/**
 * The next time a wall-clock reset such as `3pm (America/Los_Angeles)` comes after `at`.
 * ponytail: the zone's offset is taken at `at`, so a reset across a daylight-saving change is off by
 * an hour; the next probe catches it.
 * @param {string} text the reset as the limit screen shows it
 * @param {Date} at when the screen showed it
 * @returns {Date | null} the time, or null when the text is not a time
 */
export function resetAt(text, at) {
    const m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)(?:\s*\(([^)]+)\))?/i.exec(text);
    if (!m) return null;
    const hour = (Number(m[1]) % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0);
    let parts;
    try {
        parts = new Intl.DateTimeFormat("en-US", {
            timeZone: m[4] ?? "UTC",
            hourCycle: "h23",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        }).formatToParts(at);
    } catch {
        return null;
    }
    const get = (/** @type {string} */ type) => Number(parts.find((p) => p.type === type)?.value);
    const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    const offset = wall - Math.floor(at.getTime() / 60_000) * 60_000;
    let target = Date.UTC(get("year"), get("month") - 1, get("day"), hour, Number(m[2] ?? 0)) - offset;
    if (target <= at.getTime()) target += 24 * HOUR;
    return new Date(target);
}

/**
 * Why no worker may start now, or null. A usage stop admits one canary once its time comes.
 * @param {StartContext} ctx the context
 * @param {string | null} version the installed Claude Code version, null when unknown
 * @returns {{reason: string | null, canary: boolean}} the reason, and whether only a canary may start
 */
function blocker(ctx, version) {
    const { state, now } = ctx;
    const stop = state.apiStop;
    if (state.settings?.paused) return { reason: "githerd pause (githerd resume ends it)", canary: false };
    if (state.settings?.stopped)
        return { reason: "githerd workers --stop (githerd workers <n> ends it)", canary: false };
    if (stop?.kind === "credential") return { reason: `credential stop: ${stop.error}`, canary: false };
    const item = Object.values(state.ownerItems ?? {}).find((i) => !i.endedAt && i.blocks === "workers");
    if (item) return { reason: `owner item ${item.id} blocks every worker start`, canary: false };
    const test = ctx.platform.selftest();
    if (state.startsStopped && test?.passed && test.at > state.startsStopped.at) {
        // A self-test that passed after the failed starts clears the stop.
        state.startsStopped = null;
        endItem(state, "worker-start-failed", "cleared", now());
    }
    if (state.startsStopped) return { reason: state.startsStopped.reason, canary: false };
    if (!test?.passed) return { reason: "the platform self-test has not passed (githerd selftest)", canary: false };
    if (!version) return { reason: "claude --version did not answer", canary: false };
    if (test.claudeVersion !== version) {
        return { reason: `the self-test ran on Claude Code ${test.claudeVersion}, not ${version}`, canary: false };
    }
    if (stop?.kind === "usage") {
        const at = canaryAt(stop, stop.probes ?? 0);
        if (stop.canary || now() < at)
            return { reason: `usage stop; a canary starts at ${at.toISOString()}`, canary: false };
        return { reason: null, canary: true };
    }
    return { reason: null, canary: false };
}

/**
 * Adds the time live routine sessions ran since the last call to today's worker hours.
 * @param {any} state the daemon state
 * @param {Date} now the clock
 * @returns {number} today's worker hours
 */
function workerHours(state, now) {
    const day = now.toISOString().slice(0, 10);
    const h = (state.workerHours ??= { day, ms: 0, at: now.toISOString() });
    if (h.day !== day) Object.assign(h, { day, ms: 0 });
    const live = Object.values(state.jobs ?? {}).filter((j) => j.holder?.pane && !isUrgent(j)).length;
    h.ms += Math.max(0, now.getTime() - Date.parse(h.at)) * live;
    h.at = now.toISOString();
    return h.ms / HOUR;
}

/**
 * Ends the sessions githerd does not keep (design 7.4): every parked job's, unless a permission
 * prompt keeps its window for the owner, and the oldest waiting ones past the waiting cap. A job
 * whose session ends keeps its state; it continues later by resume or fresh.
 * @param {StartContext} ctx the context
 * @returns {string[]} the jobs whose session was put on `state.retiring`
 */
export function endIdleSessions(ctx) {
    const { state, config, now } = ctx;
    const retire = (/** @type {any} */ job, /** @type {string} */ reason) => {
        state.retiring = [
            ...(state.retiring ?? []),
            { job: job.id, holder: job.holder, reason, at: now().toISOString() },
        ];
        job.holder = null;
        return job.id;
    };
    const ended = [];
    for (const job of Object.values(state.jobs ?? {})) {
        if (
            job.state === "parked" &&
            job.holder?.pane &&
            !String(job.waitingFor?.owner ?? "").startsWith("permission-")
        ) {
            ended.push(retire(job, "parked on an owner item"));
        }
    }
    const waiting = Object.values(state.jobs ?? {})
        .filter((j) => j.state === "waiting" && j.holder?.pane)
        .sort((a, b) => String(a.stateSince).localeCompare(String(b.stateSince)));
    const cap = config.workers?.waiting ?? 6;
    for (const job of waiting.slice(0, Math.max(0, waiting.length - cap))) {
        ended.push(retire(job, `more than ${cap} sessions waiting`));
    }
    return ended;
}

/**
 * Admits jobs into free slots (design 7.1 and 8.1) and starts their preparation in the background.
 * The order: working jobs whose session is gone (incidents first), then the queue of design 5.4.
 * @param {StartContext} ctx the context
 * @returns {Promise<{blocked: string | null, admitted: string[]}>} why nothing may start (null when
 *   starts are open), and the jobs admitted this call
 */
export async function fillSlots(ctx) {
    const { state, config, now } = ctx;
    const t = now();
    // ponytail: a fault clears by waiting 30 minutes; read the fault's cause (load, the platform)
    // and requeue when it clears if a fixed wait proves too slow or too eager.
    for (const job of Object.values(state.jobs ?? {})) {
        if (job.state === "faulted" && t.getTime() - Date.parse(job.stateSince) >= FAULT_RETRY_MS) {
            board.move(job, "queued", t, { reason: `retry after: ${job.reason}` });
        }
    }
    const hours = workerHours(state, t);
    const candidates = [
        ...Object.values(state.jobs ?? {})
            .filter((j) => j.state === "working" && !j.holder && !ctx.tasks.has(j.id))
            .sort((a, b) => Number(isUrgent(b)) - Number(isUrgent(a)) || a.id.localeCompare(b.id)),
        ...jobOrder(state.jobs ?? {}).items.map((i) => state.jobs[i.job]),
    ];
    if (!candidates.length) return { blocked: null, admitted: [] };
    if (ctx.mode !== "acting") return wouldStart(ctx, candidates);

    let version = null;
    try {
        version = await ctx.platform.claudeVersion();
    } catch (err) {
        void ctx.ledger({ kind: "error", where: "claude --version", error: /** @type {Error} */ (err).message });
    }
    const block = blocker(ctx, version);
    if (block.reason) return { blocked: block.reason, admitted: [] };

    const { load, cores, memory } = ctx.platform.machine();
    const busy = load >= LOAD_SHARE * cores || memory <= MEMORY_SHARE;
    const held = Object.values(state.jobs ?? {}).filter(
        (j) => WORKING.has(j.state) && (j.holder || ctx.tasks.has(j.id)),
    );
    let routine = held.filter((j) => !isUrgent(j)).length;
    let urgent = held.filter((j) => isUrgent(j)).length;
    const slots = state.settings?.slots ?? config.workers?.slots ?? 3;
    const overflow = config.workers?.urgent ?? 1;
    const admitted = [];
    for (const job of candidates) {
        const isU = isUrgent(job);
        // Over the machine limits no worker starts, but one urgent may when none runs (design 8.1).
        if (busy && !(isU && urgent === 0)) break;
        // Routine work fills the working slots; urgent work may also take the overflow slot.
        if (isU ? routine + urgent >= slots + overflow : routine >= slots) continue;
        if (!isU && hours >= (config.workers?.hoursPerDay ?? 24)) continue;
        if (!startCommit(state, job)) continue;
        admit(ctx, job, { busy });
        admitted.push(job.id);
        if (isU) urgent += 1;
        else routine += 1;
        // A canary is one worker; the rest wait for its turn to complete (design 8.3).
        if (block.canary) {
            state.apiStop.canary = job.id;
            state.apiStop.probes = (state.apiStop.probes ?? 0) + 1;
            break;
        }
    }
    for (const id of admitted) void ctx.ledger({ kind: "job-admitted", job: id });
    if (admitted.length) await ctx.save();
    return { blocked: null, admitted };
}

/**
 * The commit a job's worktree starts at: the pull request's head for `pr` and `review` jobs, the
 * green commit for the rest. Null while it is not known.
 * @param {any} state the daemon state
 * @param {any} job the job
 * @returns {{sha: string, ref?: string, branch?: string} | null} where to start
 */
function startCommit(state, job) {
    if (job.worktree && existsSync(job.worktree)) return { sha: job.base ?? "" };
    const pr = job.kind === "pr" ? job.pr : job.kind === "review" ? job.facts?.pr : null;
    if (pr) {
        const rec = state.prs?.[String(pr)];
        if (!rec?.headSha) return null;
        return { sha: rec.headSha, ref: `refs/pull/${pr}/head`, ...(job.kind === "pr" ? { branch: rec.headRef } : {}) };
    }
    const green = state.master?.greenSha;
    return green ? { sha: green } : null;
}

/**
 * The `would-do` line of each job the queue would start, once per job: what dry-run shows.
 * @param {StartContext} ctx the context
 * @param {any[]} candidates the jobs, in order
 * @returns {{blocked: string, admitted: string[]}} the answer
 */
function wouldStart(ctx, candidates) {
    const slots = (ctx.config.workers?.slots ?? 3) + (ctx.config.workers?.urgent ?? 1);
    for (const job of candidates.slice(0, slots)) {
        if (job.wouldStart) continue;
        job.wouldStart = ctx.now().toISOString();
        void ctx.ledger({ kind: "would-do", group: "workers", op: `start a worker for ${job.id}`, job: job.id });
    }
    return { blocked: `workers are ${ctx.mode}`, admitted: [] };
}

/**
 * Moves a queued job to `starting` and runs its preparation and session start in the background.
 * @param {StartContext} ctx the context
 * @param {any} job the job
 * @param {{busy: boolean}} facts whether the machine was over its limits (faults are not counted)
 */
function admit(ctx, job, { busy }) {
    if (job.state === "queued") {
        board.move(job, "starting", ctx.now(), { reason: "admitted", phase: "worktree" });
        job.phase = "worktree";
    }
    const task = startTask(ctx, job, busy)
        .catch((err) => {
            void ctx.ledger({
                kind: "error",
                where: "worker start",
                job: job.id,
                error: /** @type {Error} */ (err).message,
            });
        })
        .finally(() => {
            ctx.tasks.delete(job.id);
            void ctx.save();
        });
    ctx.tasks.set(job.id, task);
}

/** Session starts in flight, one at a time per state (design 7.1). */
const chains = new WeakMap();

/**
 * Runs `step` after every session start queued before it; an urgent job skips the line.
 * @param {any} state the daemon state
 * @param {boolean} urgent the job is urgent
 * @param {() => Promise<void>} step the start
 * @returns {Promise<void>} once it ran
 */
function serially(state, urgent, step) {
    if (urgent) return step();
    const next = (chains.get(state) ?? Promise.resolve()).then(step, step);
    chains.set(
        state,
        next.catch(() => {}),
    );
    return next;
}

/**
 * Whether a job is still the one this task started: it may have been cancelled, faulted by its
 * worktree deadline or taken over meanwhile.
 * @param {any} job the job
 * @returns {boolean} still in a state that wants a session
 */
const wanted = (job) => WORKING.has(job.state) && !job.holder;

/**
 * One job's start: its worktree (unless it has one), its files, then its session.
 * @param {StartContext} ctx the context
 * @param {any} job the job
 * @param {boolean} busy whether the machine was over its limits
 * @returns {Promise<void>} once started or given up
 */
async function startTask(ctx, job, busy) {
    const { state, root, stateDir, now } = ctx;
    const signing = ctx.platform.signingEnv();
    const path = ctx.platform.loginPath();
    const code = codeEnv({ env: ctx.env, path, signing });
    if (!(job.worktree && existsSync(job.worktree))) {
        const at = /** @type {{sha: string, ref?: string, branch?: string}} */ (startCommit(state, job));
        const prep = await ctx.platform.prepare({
            root,
            job: job.id,
            ...at,
            env: code,
            prepared: job.worktree ?? null,
            ledger: ctx.ledger,
        });
        if (!wanted(job)) return;
        if (prep.verdict === "held") {
            const names = prep.holders.map((h) => h.dir).join(", ");
            if (job.state === "starting") board.move(job, "queued", now(), { reason: `branch held by ${names}` });
            return;
        }
        if (prep.verdict === "faulted") {
            const result = board.fault(job, `${prep.step}: ${prep.reason}`, now(), { counted: !busy });
            void ctx.ledger({ kind: "job-faulted", ...result, reason: prep.reason });
            return;
        }
        job.worktree = prep.dir;
        job.base = prep.sha;
    }
    const jobDir = join(stateDir, "jobs", job.id);
    writeJobFiles(jobDir, { stateDir, overlay: state.settings?.allow ?? [] });
    writeGuard(state, ctx.config, job, jobDir);
    const vars = workerEnv({ env: ctx.env, path, signing, job: job.id, nonce: "probe" });
    const probe = await ctx.platform.signing(vars);
    if (!probe.ok) {
        if (job.state === "starting")
            board.move(job, "queued", now(), { reason: `signing probe failed: ${probe.reason}` });
        void ctx.ledger({ kind: "signing-probe-failed", job: job.id, reason: probe.reason ?? null });
        return;
    }
    await serially(state, isUrgent(job), () => openSession(ctx, job, { jobDir, path, signing }));
}

/**
 * Writes the guard's `guard.json` for a job (design 10.1): its worktree, the repository, the
 * issues and pull requests with an open owner item, the subagent and browser limits, and whether it
 * is an incident's.
 * @param {any} state the daemon state
 * @param {any} config the normalized config
 * @param {any} job the job, with its worktree
 * @param {string} jobDir its directory under the state directory
 */
function writeGuard(state, config, job, jobDir) {
    const ownerItems = Object.values(state.ownerItems ?? {})
        .filter((i) => !i.endedAt)
        .map((i) => Number(/^(?:pr:|issue:|#)(\d+)$/.exec(i.target ?? "")?.[1]))
        .filter((n) => n > 0);
    const guard = {
        root: job.worktree,
        repo: config.repo,
        ownerItems,
        subagents: SUBAGENTS,
        browsers: BROWSERS,
        // An incident's worker marks its fix priority:critical (design 4.6); no other worker may.
        incident: job.kind === "incident",
    };
    writeFileSync(join(jobDir, "guard.json"), `${JSON.stringify(guard)}\n`);
}

/**
 * Rewrites every live worker's `guard.json`, so a new or ended owner item reaches its guard.
 * @param {any} state the daemon state
 * @param {any} config the normalized config
 * @param {string} stateDir the state directory
 */
export function refreshGuards(state, config, stateDir) {
    for (const job of Object.values(state.jobs ?? {})) {
        const jobDir = join(stateDir, "jobs", job.id);
        if (job.holder?.pane && job.worktree && existsSync(join(jobDir, "guard.json")))
            writeGuard(state, config, job, jobDir);
    }
}

/**
 * Opens the job's window (design 7.1, steps 4 and 5). The holder is set before the window opens,
 * so the SessionStart hook, which may fire before `startWorker` returns, links the session to it.
 * @param {StartContext} ctx the context
 * @param {any} job the job
 * @param {{jobDir: string, path: string, signing: Record<string, string>}} with the job's directory,
 *   the login PATH and the signing variables
 * @returns {Promise<void>} once the session registered or the start failed
 */
async function openSession(ctx, job, { jobDir, path, signing }) {
    const { state, now } = ctx;
    if (!wanted(job)) return;
    const nonce = randomBytes(6).toString("hex");
    job.holder = { nonce, socket: "githerd", startedBy: "githerd", session: null };
    if (job.state === "starting") {
        board.startPhase(job, "registry", now());
        job.phase = "registry";
    }
    await ctx.save();
    const resume = !job.fresh && (await ctx.platform.resumeVerified()) ? (job.sessions.at(-1) ?? null) : null;
    const env = workerEnv({ env: ctx.env, path, signing, job: job.id, nonce });
    const argv = workerArgv({
        env,
        model: ctx.config.workers?.model ?? "claude-opus-5-5",
        job: job.id,
        jobDir,
        prompt: LAUNCH_PROMPT,
        resume,
    });
    const started = await ctx.platform.start({ job: job.id, cwd: job.worktree, argv });
    if (job.holder?.nonce !== nonce) return;
    if (started.ok) {
        const w = started.window;
        const session = job.holder.session ?? started.registry?.sessionId ?? null;
        Object.assign(job.holder, { ...w, startTime: started.startTime, session });
        if (session && !job.sessions.includes(session)) job.sessions.push(session);
        job.fresh = false;
        state.startFailures = 0;
        if (job.state === "starting") {
            board.startPhase(job, "first-call", now());
            job.phase = "first-call";
        }
        void ctx.ledger({ kind: "session-started", job: job.id, session, window: w.window, resume: Boolean(resume) });
        return;
    }
    job.holder = null;
    if (state.apiStop?.canary === job.id) delete state.apiStop.canary;
    void ctx.ledger({ kind: "session-start-failed", job: job.id, capture: /** @type {any} */ (started).capture });
    if (WORKING.has(job.state)) board.move(job, "queued", now(), { reason: "session start failed" });
    state.startFailures = (state.startFailures ?? 0) + 1;
    if (state.startFailures >= START_FAILURES) {
        const reason = `${state.startFailures} worker starts failed in a row after a passed self-test`;
        state.startsStopped = { at: now().toISOString(), reason };
        raiseItem(
            state,
            {
                id: "worker-start-failed",
                kind: "system change",
                question: `${reason}; githerd starts no worker until a self-test passes again (githerd selftest). The last screen is in the ledger (session-start-failed).`,
            },
            now(),
        );
    }
}

/**
 * Removes the worktree of every job that ended (design 7.8): a done job's once its pull request is
 * closed, a cancelled job's at once with its unpushed commits salvaged on a local branch. First the
 * servherd servers running inside it are stopped. A failed job keeps its worktree for the findings.
 * A removal that fails is ledgered and tried again on a later reconcile.
 * @param {StartContext & {servers: () => Promise<{name: string, cwd: string}[]>,
 *   stopServer: (name: string) => Promise<void>, remove: typeof import("./worktrees.mjs").removeJobWorktree}} ctx
 *   the context, with servherd's list and stop and the removal
 * @returns {Promise<string[]>} the jobs whose worktree was removed
 */
export async function tidyEndedJobs(ctx) {
    const { state, root, env } = ctx;
    const ended = Object.values(state.jobs ?? {}).filter(
        (j) =>
            j.worktree &&
            !j.holder &&
            !ctx.tasks.has(j.id) &&
            (j.state === "cancelled" || (j.state === "done" && !state.prs?.[String(j.pr)])),
    );
    if (!ended.length) return [];
    /** @type {{name: string, cwd: string}[]} */
    let servers = [];
    try {
        servers = await ctx.servers();
    } catch (err) {
        void ctx.ledger({ kind: "error", where: "servherd list", error: /** @type {Error} */ (err).message });
        return [];
    }
    const removed = [];
    for (const job of ended) {
        const inside = servers.filter((s) => s.cwd === job.worktree || String(s.cwd).startsWith(`${job.worktree}/`));
        for (const s of inside) {
            try {
                await ctx.stopServer(s.name);
                void ctx.ledger({ kind: "server-stopped", job: job.id, name: s.name, cwd: s.cwd });
            } catch (err) {
                void ctx.ledger({
                    kind: "error",
                    where: "servherd stop",
                    job: job.id,
                    error: /** @type {Error} */ (err).message,
                });
            }
        }
        // Without the commit it was prepared at, unpushed work cannot be told apart: leave it.
        if (!job.base) continue;
        const r = await ctx.remove({
            root,
            job: job.id,
            dir: job.worktree,
            base: job.base,
            salvage: job.state === "cancelled",
            env: codeEnv({ env, path: env.PATH ?? "", signing: {} }),
            ledger: ctx.ledger,
        });
        if (!r.ok) continue;
        if (r.salvage) job.salvage = [...(job.salvage ?? []), r.salvage];
        job.worktree = null;
        removed.push(job.id);
    }
    return removed;
}
