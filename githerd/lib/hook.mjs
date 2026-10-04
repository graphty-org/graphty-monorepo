/**
 * The hooks of design section 4.10, both halves.
 *
 * The hook side (`runHook`) is what `bin/githerd-hook.mjs <event>` runs, from the daemon-installed
 * copy of the default branch's githerd, so a worktree's edits never change its own hooks. It sends
 * the event to the daemon's `POST /hook` on 127.0.0.1 and turns the answer into Claude Code's hook
 * output. It never makes a network call: the daemon answers from its cache. PostToolUse does not
 * even ask the daemon: it reads the job's news file. When the daemon gives no answer within 2 s
 * the hook spools the event, starts a restart if the restart rule allows one, prints one line and
 * exits 0, so a broken githerd never blocks a session. A worker's Stop that gets no answer is
 * counted: those stops were allowed unchecked.
 *
 * The daemon side (`answerHook`) decides from the daemon's state: it registers sessions, links a
 * worker to its job, runs the Stop gate of section 7.3, records steering (7.6), API failures (8.3)
 * and permission prompts. It mutates the state; the daemon persists it and writes the ledger lines.
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { endAttempt, heartbeat, move } from "./board.mjs";
import { repoRoot } from "./config.mjs";
import { jobText } from "./job-text.mjs";
import { daemonDown, launcherContext } from "./launcher.mjs";
import { raiseItem } from "./notify.mjs";
import { defaultStateDir, spoolEvent } from "./store.mjs";

/** How long the hook waits for the daemon's answer. */
const DAEMON_WAIT_MS = 2000;

/** The file in the state directory with one line per worker stop allowed unchecked. */
export const UNCHECKED_STOPS = "stop-unchecked.log";

/** The CLI the hook starts, detached, to restart a dead daemon under the restart lock. */
const CLI = fileURLToPath(new URL("../bin/githerd.mjs", import.meta.url));

/**
 * The launch prompt every worker starts with (design section 7.1). It counts as the user's words,
 * so it is not steering.
 */
export const LAUNCH_PROMPT =
    "You are a githerd worker. Call githerd_next for your job. Decide reversible questions yourself " +
    "and say why; ask the owner only through githerd_ask_owner.";

const MINUTE = 60 * 1000;

/** StopFailure reasons that stop every start until the owner acts (design 8.3). */
const CREDENTIAL = new Set([
    "authentication_failed",
    "billing_error",
    "oauth_org_not_allowed",
    "account_on_hold",
    "verification_required",
    "cloud_credential_error",
]);

/** StopFailure reasons retried after 2 minutes, then 5; a 529 arrives as `server_error`. */
const TRANSIENT = new Set(["overloaded", "server_error"]);

/** Minutes before a transient API failure is retried, by how many came in a row. */
const RETRY_MINUTES = [2, 5];

/** The block reason for a last message that asks the owner something (design 7.3). */
const ASK_REASON =
    "githerd: your last message asks the owner something. Decide this yourself and record why, " +
    "or call githerd_ask_owner if it is owner-only.";

/**
 * @typedef {object} HookRequest what the hook sends to the daemon's `POST /hook`
 * @property {string} [id] made once per event, before the first attempt, and spooled with it: a
 *   daemon that was only slow handles the live request, and the spooled copy is then skipped
 * @property {string} [ts] when the event happened; set on a spooled event
 * @property {string} event the hook event
 * @property {string | null} job the worker's job (`GITHERD_JOB`), null in an owner session
 * @property {string | null} nonce the worker's start nonce (`GITHERD_NONCE`)
 * @property {any} input Claude Code's hook input
 */

/**
 * @typedef {object} HookAnswer what the daemon answers
 * @property {string} [message] one line for the person (`systemMessage`)
 * @property {string} [context] text for the session (SessionStart `additionalContext`)
 * @property {string} [block] the Stop gate's block reason
 */

/**
 * @typedef {object} HookFacts what the daemon knows that is not in its state
 * @property {any} status its `githerd_status` answer in JSON, for the status line
 * @property {string[]} models the models a worker may run
 * @property {string | null} githubUnknownSince since when GitHub is unreachable, or null
 * @property {(job: any) => boolean} doneHolds whether the job's done-condition holds on GitHub
 * @property {(job: any) => string} missing what GitHub still shows missing for the job
 * @property {number} uid the user id in a background task's output path
 */

// ---------------------------------------------------------------------------------------------
// The hook side
// ---------------------------------------------------------------------------------------------

/**
 * The one line a new session sees: banners first, then master, the owner's list, the open pull
 * requests and the mode.
 * @param {any} data the daemon's `githerd_status` answer in JSON
 * @returns {string} the line
 */
export function statusLine(data) {
    const master = data.master ?? {};
    const since = master.since ? ` since ${master.since}` : "";
    const parts = [
        ...(data.banner ? [data.banner] : []),
        `master ${master.verdict ?? "unknown"}${since}`,
        `${data.owner?.length ?? 0} waiting on the owner`,
        `${data.prs?.length ?? 0} open pull requests`,
        `mode ${data.githerd?.mode ?? "unknown"}`,
    ];
    return `githerd: ${parts.join("; ")}`;
}

/**
 * Writes a job's news for its PostToolUse hook: the job record's `news` list, whole, renamed into
 * place so the hook never reads half a file.
 * @param {string} jobDir `jobs/<id>/` under the state directory
 * @param {{at: string, text: string, acked: boolean}[]} news the news
 */
export function writeNews(jobDir, news) {
    mkdirSync(jobDir, { recursive: true });
    const tmp = join(jobDir, `news.${process.pid}.tmp`);
    writeFileSync(tmp, `${JSON.stringify(news)}\n`);
    renameSync(tmp, join(jobDir, "news"));
}

/**
 * Reads a small file, missing or unreadable counting as empty.
 * @param {string} file the path
 * @returns {string} the text
 */
function readText(file) {
    try {
        return readFileSync(file, "utf8");
    } catch {
        return "";
    }
}

/**
 * The PostToolUse news (design 4.10): the job's unacknowledged news not yet shown to this job's
 * session, as `additionalContext`. What was shown is remembered in `news.seen`, so a line reaches
 * the session once, not after every tool call; `githerd_next` acknowledges it.
 * @param {string} jobDir `jobs/<id>/` under the state directory
 * @param {string} job the job id
 * @returns {string | null} the hook's JSON, or null when there is nothing new
 */
export function newsOutput(jobDir, job) {
    let news;
    try {
        news = JSON.parse(readText(join(jobDir, "news")) || "[]");
    } catch {
        return null;
    }
    const seen = readText(join(jobDir, "news.seen")).trim();
    const fresh = news.filter((/** @type {any} */ n) => !n.acked && n.at > seen);
    if (fresh.length === 0) return null;
    writeFileSync(join(jobDir, "news.seen"), `${fresh.at(-1).at}\n`);
    const lines = fresh.map((/** @type {any} */ n) => `- ${n.text}`).join("\n");
    const context = `githerd news for job ${job}:\n${lines}\nCall githerd_next to acknowledge it.`;
    return JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: context } });
}

/**
 * Claude Code's hook output for the daemon's answer.
 * @param {string} event the hook event
 * @param {HookAnswer} answer the answer
 * @returns {string | null} the JSON to print, or null for nothing
 */
export function hookOutput(event, answer) {
    /** @type {Record<string, unknown>} */
    const out = {};
    if (answer.message) out.systemMessage = answer.message;
    if (event === "Stop" && answer.block) Object.assign(out, { decision: "block", reason: answer.block });
    if (event === "SessionStart" && answer.context) {
        out.hookSpecificOutput = { hookEventName: "SessionStart", additionalContext: answer.context };
    }
    return Object.keys(out).length ? JSON.stringify(out) : null;
}

/**
 * Starts `githerd ensure`, detached, when the restart rule allows a restart: `alive` is stale and
 * the daemon's lock names no live process. `ensure` takes the restart lock itself.
 * @param {{cwd: string, env: Record<string, string | undefined>, stateDir: string}} where the
 *   repository, the environment and the state directory
 * @returns {boolean} whether a restart was started
 */
export function restartIfDown({ cwd, env, stateDir }) {
    const found = launcherContext({ cwd, env, stateDir });
    if (found.kind !== "ready" || !daemonDown(found.ctx)) return false;
    spawn(process.execPath, [CLI, "ensure"], { cwd: found.ctx.root, env, detached: true, stdio: "ignore" }).unref();
    return true;
}

/**
 * Asks the daemon. Any failure is thrown with a short reason.
 * @param {string} stateDir the state directory holding `daemon.json`
 * @param {HookRequest} request the request
 * @param {typeof fetch} fetcher the fetch function
 * @returns {Promise<HookAnswer>} the answer
 */
async function askDaemon(stateDir, request, fetcher) {
    let port;
    try {
        port = JSON.parse(readFileSync(join(stateDir, "daemon.json"), "utf8")).port;
    } catch {
        throw new Error("no daemon.json");
    }
    const session = request.input.session_id;
    const res = await fetcher(`http://127.0.0.1:${port}/hook`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(session ? { "x-githerd-session": session } : {}) },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(DAEMON_WAIT_MS),
    });
    const reply = await res.json();
    if (!res.ok) throw new Error(`daemon answered ${res.status}: ${reply?.error ?? ""}`.trim());
    return reply;
}

/**
 * What the hook does when the daemon gave no answer: spools the event, restarts the daemon if it
 * is down, counts a worker's unchecked stop, and says so in one line.
 * @param {HookRequest} request the request
 * @param {string} reason why there is no answer
 * @param {{cwd: string, env: Record<string, string | undefined>, stateDir: string,
 *   restart: typeof restartIfDown}} where the repository, environment, state directory and restarter
 * @returns {Promise<HookAnswer>} the one line
 */
async function noAnswer(request, reason, { cwd, env, stateDir, restart }) {
    await spoolEvent(stateDir, { ...request });
    restart({ cwd, env, stateDir });
    if (request.event !== "Stop" || !request.job) {
        return { message: `githerd: daemon not reachable (${reason}); the event was kept for it` };
    }
    const file = join(stateDir, UNCHECKED_STOPS);
    appendFileSync(file, `${new Date().toISOString()} ${request.job} ${request.input.session_id ?? "-"} ${reason}\n`);
    const count = readText(file).split("\n").filter(Boolean).length;
    return { message: `githerd: Stop gate unreachable: ${count} stops allowed unchecked (${reason})` };
}

/**
 * Runs one hook: reads Claude Code's JSON from `input` and returns what to print.
 * @param {string} event the hook event
 * @param {string} input the hook's standard input
 * @param {{cwd: string, env: Record<string, string | undefined>, fetch?: typeof fetch,
 *   restart?: typeof restartIfDown}} options the fallback working directory, the environment
 *   (`HOME`, `GITHERD_STATE_DIR`, `GITHERD_JOB`, `GITHERD_NONCE`), and for tests the fetch
 *   function and the restarter
 * @returns {Promise<string | null>} the JSON to print, or null for nothing
 */
export async function runHook(event, input, { cwd, env, fetch: fetcher = fetch, restart = restartIfDown }) {
    let hookInput = {};
    try {
        hookInput = JSON.parse(input);
    } catch {
        // no input: use the process's own directory
    }
    const at = /** @type {any} */ (hookInput).cwd ?? cwd;
    let root;
    try {
        root = repoRoot(at);
    } catch {
        return null;
    }
    const stateDir = env.GITHERD_STATE_DIR ?? defaultStateDir(root, env.HOME);
    const job = env.GITHERD_JOB || null;
    if (event === "PostToolUse") return job ? newsOutput(join(stateDir, "jobs", job), job) : null;
    const source = /** @type {any} */ (hookInput).source;
    // A new or resumed process runs no subagent yet; the guard's count starts again from none.
    if (event === "SessionStart" && job && (source === "startup" || source === "resume")) {
        rmSync(join(stateDir, "jobs", job, "agents"), { recursive: true, force: true });
    }
    /** @type {HookRequest} */
    const request = { id: randomUUID(), event, job, nonce: env.GITHERD_NONCE || null, input: hookInput };
    let answer;
    try {
        answer = await askDaemon(stateDir, request, fetcher);
    } catch (err) {
        const reason = /** @type {any} */ (err).cause?.code ?? /** @type {Error} */ (err).message;
        answer = await noAnswer(request, reason, { cwd: at, env, stateDir, restart });
    }
    return hookOutput(event, answer);
}

// ---------------------------------------------------------------------------------------------
// The daemon side
// ---------------------------------------------------------------------------------------------

/**
 * A job's record in plain words, for a session whose context was compacted (design 4.10).
 * @param {any} job the job
 * @returns {string} the text
 */
export function jobRecordText(job) {
    const lines = [
        `githerd job record (re-injected after compaction): job ${job.id}, ${job.kind} ${job.target}, state ${job.state}.`,
        ...(job.claim?.plan ? [`Your plan: ${job.claim.plan}`] : []),
        ...(job.waitingFor ? [`Waiting for: ${JSON.stringify(job.waitingFor)}`] : []),
        ...(job.branch ? [`Branch: ${job.branch}`] : []),
        ...(job.pr ? [`Pull request: #${job.pr}`] : []),
        ...unacked(job).map((t) => `News: ${t}`),
    ];
    return lines.join("\n");
}

/**
 * A job's news the worker has not acknowledged.
 * @param {any} job the job
 * @returns {string[]} the lines
 */
function unacked(job) {
    return (job.news ?? []).filter((/** @type {any} */ n) => !n.acked).map((/** @type {any} */ n) => n.text);
}

/**
 * Where a background task's output lives (platform facts 10.10): Claude Code's task directory for
 * the session, the cwd with every character but a letter or digit made `-`.
 * @param {number} uid the user id
 * @param {string} cwd the session's working directory
 * @param {string} session the session id
 * @param {string} task the task id
 * @returns {string} the path
 */
export function taskOutputPath(uid, cwd, session, task) {
    return `/tmp/claude-${uid}/${cwd.replaceAll(/[^A-Za-z0-9]/g, "-")}/${session}/tasks/${task}.output`;
}

/**
 * Whether a worker's last message asks the owner something: an `ACTION NEEDED` line, or a
 * question at its end.
 * @param {string | undefined} text the last assistant message
 * @returns {boolean} true when it does
 */
export function asksOwner(text) {
    const t = (text ?? "").trim();
    return /^ACTION NEEDED:/m.test(t) || t.endsWith("?");
}

/**
 * SessionStart: registers the session; for a worker links it to its job and checks the model;
 * prints the status line at startup, the news at resume, and after compaction the job text (with
 * the owner's free-text policies, design 5.7) and the job record.
 * @param {any} state the daemon state, for the owner's policies
 * @param {any} job the worker's job, or null
 * @param {HookRequest} req the request
 * @param {HookFacts} facts what the daemon knows
 * @returns {{answer: HookAnswer, ledger: any[]}} the answer and ledger lines
 */
function sessionStart(state, job, req, facts) {
    const { session_id: session, source, model } = req.input;
    const line = statusLine(facts.status ?? {});
    if (!job) return { answer: { message: line, context: line }, ledger: [] };
    if (!job.sessions.includes(session)) job.sessions.push(session);
    if (job.holder) job.holder.session = session;
    /** @type {any[]} */
    const ledger = [{ kind: "hook-session", job: job.id, session, source }];
    if (source === "compact" || source === "clear") {
        job.compactions = (job.compactions ?? 0) + 1;
        return { answer: { context: `${jobText(job, { policies: state.policies })}${jobRecordText(job)}` }, ledger };
    }
    if (source === "resume") {
        const news = unacked(job);
        return {
            answer: news.length ? { context: `githerd news for job ${job.id}:\n- ${news.join("\n- ")}` } : {},
            ledger,
        };
    }
    if (model && facts.models?.length && !facts.models.includes(model)) {
        const wrong = `githerd: this worker runs ${model}; workers run only ${facts.models.join(" or ")}`;
        ledger.push({ kind: "wrong-model", job: job.id, session, model });
        return { answer: { message: `${wrong}; ${line}`, context: `${wrong}; ${line}` }, ledger };
    }
    return { answer: { message: line, context: line }, ledger };
}

/**
 * UserPromptSubmit in a worker (design 7.6): the nonce means a doorbell was delivered; the launch
 * prompt and a background task's `<task-notification>` are nothing; anything else is the owner
 * steering. Prints nothing.
 * @param {any} job the worker's job
 * @param {HookRequest} req the request
 * @param {Date} now the current time
 * @returns {{answer: HookAnswer, ledger: any[]}} the answer and ledger lines
 */
function userPrompt(job, req, now) {
    const prompt = String(req.input.prompt ?? "");
    const session = req.input.session_id;
    if (req.nonce && prompt.includes(`[githerd ${req.nonce}]`)) {
        job.doorbellDeliveredAt = now.toISOString();
        return { answer: {}, ledger: [{ kind: "doorbell-delivered", job: job.id, session }] };
    }
    if (prompt.trim() === LAUNCH_PROMPT || prompt.trimStart().startsWith("<task-notification>")) {
        return { answer: {}, ledger: [] };
    }
    if (job.steeredAt) return { answer: {}, ledger: [] };
    job.steeredAt = now.toISOString();
    return { answer: {}, ledger: [{ kind: "steered", job: job.id, session }] };
}

/**
 * The Stop gate for a worker (design 7.3), its rows in order. A block happens at most once per
 * turn: the call after a block has `stop_hook_active` and is allowed.
 * @param {any} job the worker's job
 * @param {HookRequest} req the request
 * @param {HookFacts} facts what the daemon knows
 * @param {Date} now the current time
 * @returns {{answer: HookAnswer, ledger: any[], end?: boolean}} the answer, the ledger lines, and
 *   `end` when the daemon should end the session because the job is done
 */
function stopGate(job, req, facts, now) {
    const { input } = req;
    const note = (/** @type {string} */ why, extra = {}) => [{ kind: "stop-gate", job: job.id, allow: why, ...extra }];
    if (job.steeredAt) return { answer: {}, ledger: note("steered") };
    if (facts.doneHolds?.(job)) return { answer: {}, ledger: note("done"), end: true };
    if (["waiting", "parked", "verifying"].includes(job.state) || job.claim?.overlap?.decision === "wait") {
        return { answer: {}, ledger: note("waiting") };
    }
    if (facts.githubUnknownSince) {
        if (job.state === "working") move(job, "waiting", now, { waitingFor: { github: facts.githubUnknownSince } });
        const message =
            `githerd: GitHub unreachable since ${facts.githubUnknownSince}; githerd will ring you; ` +
            "do not retry or work around it";
        return { answer: { message }, ledger: note("github-unknown") };
    }
    const tasks = input.background_tasks ?? [];
    if (tasks.length) {
        const task = tasks[0].id;
        const output = taskOutputPath(facts.uid, input.cwd ?? "", input.session_id, task);
        if (job.state === "working") move(job, "waiting", now, { waitingFor: { local: task, output } });
        return { answer: {}, ledger: note("local-task", { task }) };
    }
    if (input.stop_hook_active) return { answer: {}, ledger: note("second-stop") };
    if (asksOwner(input.last_assistant_message)) {
        return { answer: { block: ASK_REASON }, ledger: note("", { block: "asks-owner" }) };
    }
    const missing = facts.missing?.(job) || "the job's done-condition";
    const block =
        `githerd: job ${job.id} is not done; GitHub still shows missing: ${missing}. Continue the work, ` +
        "or call githerd_wait for a condition, githerd_ask_owner for what only the owner can do, or " +
        "githerd_done with outcome failed and your findings.";
    return { answer: { block }, ledger: note("", { block: "not-done" }) };
}

/**
 * StopFailure (design 8.3): a usage limit stops every start; a credential reason stops starts and
 * raises one owner item; `overloaded` and `server_error` are retried after 2 minutes, then 5, and a
 * third in a row ends the attempt. Prints nothing.
 * @param {any} state the daemon state
 * @param {any} job the worker's job, or null
 * @param {HookRequest} req the request
 * @param {Date} now the current time
 * @returns {{answer: HookAnswer, ledger: any[]}} the answer and ledger lines
 */
function stopFailure(state, job, req, now) {
    const { error, session_id: session, last_assistant_message: text = "" } = req.input;
    const entry = { kind: "api-failure", error, job: job?.id ?? null, session };
    const at = now.toISOString();
    if (error === "rate_limit") {
        state.apiStop = { kind: "usage", error, at, session };
    } else if (CREDENTIAL.has(error) || /Consumer Terms/.test(text)) {
        state.apiStop = { kind: "credential", error, at, session };
        raiseItem(
            state,
            {
                id: "api-credential",
                kind: "credential",
                question: `Claude sessions are failing with ${error}. Fix the account; githerd starts no worker until then.`,
                blocks: "workers",
            },
            now,
        );
    } else if (TRANSIENT.has(error) && job) {
        const count = (job.apiErrors?.count ?? 0) + 1;
        const wait = RETRY_MINUTES[count - 1];
        job.apiErrors = { count, at, retryAt: wait ? new Date(now.getTime() + wait * MINUTE).toISOString() : null };
        if (!wait && job.state === "working") {
            const next = endAttempt(job, { outcome: `API ${error} three times in a row` }, now);
            job.apiErrors = null;
            return { answer: {}, ledger: [entry, { kind: "attempt-ended", ...next }] };
        }
    }
    return { answer: {}, ledger: [entry] };
}

/**
 * Whether a spooled Stop or StopFailure happened before the API record it would change: a Stop
 * older than the current usage or credential stop must not lift it, and a failure older than the
 * job's retry count must not add to it.
 * @param {any} state the daemon state
 * @param {HookRequest} req the spooled request
 * @returns {boolean} true when it is too old to apply
 */
export function staleSpooled(state, req) {
    if (req.event !== "Stop" && req.event !== "StopFailure") return false;
    const ts = Date.parse(req.ts ?? "");
    if (Number.isNaN(ts)) return false;
    const job = req.job ? state.jobs?.[req.job] : null;
    const records = [state.apiStop?.at, job?.apiErrors?.at].map((at) => Date.parse(at ?? ""));
    return records.some((at) => ts < at);
}

/**
 * Answers one hook event from the daemon's state (design 4.10). Mutates `state`; the caller saves
 * it and appends the ledger lines. Called for live events and for spooled ones.
 * @param {any} state the daemon state
 * @param {HookRequest} req the request
 * @param {HookFacts} facts what the daemon knows that is not in its state
 * @param {Date} now the current time
 * @returns {{answer: HookAnswer, ledger: any[], end?: boolean}} the answer for the hook, the
 *   ledger lines, and `end` when the worker's session should be ended
 */
export function answerHook(state, req, facts, now) {
    const input = req.input ?? {};
    const session = input.session_id;
    if (typeof session === "string" && session) heartbeat(state, { session, cwd: input.cwd }, now);
    const job = req.job ? (state.jobs?.[req.job] ?? null) : null;
    const retired = (state.retiring ?? []).find(
        (/** @type {any} */ r) =>
            r.job === req.job && (r.holder?.session ? r.holder.session === session : !job?.holder),
    );
    if (retired) {
        // A session its job has left: nothing it says changes the job, and the daemon ends it now.
        return {
            answer: {},
            ledger: [{ kind: "hook-retired-session", event: req.event, job: req.job, session }],
            end: true,
        };
    }
    const request = { ...req, input };
    switch (req.event) {
        case "SessionStart":
            return sessionStart(state, job, request, facts);
        case "UserPromptSubmit":
            return job ? userPrompt(job, request, now) : { answer: {}, ledger: [] };
        case "Stop":
            return stop(state, job, request, facts, now);
        case "StopFailure":
            return stopFailure(state, job, request, now);
        case "Notification":
            if (job && input.notification_type === "permission_prompt") {
                job.permissionPrompt = { at: now.toISOString(), message: input.message ?? "" };
                return { answer: {}, ledger: [{ kind: "permission-prompt", job: job.id, session }] };
            }
            return { answer: {}, ledger: [] };
        default:
            return { answer: {}, ledger: [] };
    }
}

/**
 * Stop from any session: a normal stop lifts a credential stop (design 8.3), then a worker's
 * stop goes through the gate.
 * ponytail: any session's normal stop lifts the credential stop, not only one on the same account;
 * reading a session's account waits on the usage-limit screen spike.
 * @param {any} state the daemon state
 * @param {any} job the worker's job, or null
 * @param {HookRequest} req the request
 * @param {HookFacts} facts what the daemon knows
 * @param {Date} now the current time
 * @returns {{answer: HookAnswer, ledger: any[], end?: boolean}} the answer and ledger lines
 */
function stop(state, job, req, facts, now) {
    /** @type {any[]} */
    const lifted = [];
    if (state.apiStop?.kind === "credential") {
        lifted.push({ kind: "api-stop-lifted", error: state.apiStop.error, session: req.input.session_id });
        state.apiStop = null;
    }
    if (!job) return { answer: {}, ledger: lifted };
    const gate = stopGate(job, req, facts, now);
    return { ...gate, ledger: [...lifted, ...gate.ledger] };
}
