/**
 * The handlers of the thirteen tools of design section 6, as the daemon serves them to every session:
 * owner sessions and workers. Names, descriptions and schemas are
 * `TOOLS` in mcp.mjs; the session's MCP server forwards calls here with `params._meta.githerd`
 * (the client's protocol, session, job and nonce), and the MCP core refuses a call in a protocol
 * this daemon does not serve before any handler runs.
 *
 * A worker is known by its job and nonce: a call that names a job is refused unless the caller holds
 * it. `githerd_done` checks the claim against GitHub before accepting it (done.mjs);
 * `githerd_ask_owner` and `githerd_record` are the owner layer (owner.mjs).
 */

import { readFileSync } from "node:fs";
import { availableParallelism, loadavg } from "node:os";
import { join } from "node:path";

import * as board from "./board.mjs";
import { githerdDone, namesIssue, numberOf } from "./done.mjs";
import { taskOutputPath } from "./hook.mjs";
import { askOwner, recordOwner } from "./owner.mjs";
import { jobText } from "./job-text.mjs";
import { TOOLS } from "./mcp.mjs";
import { askFor, jobInUse } from "./queue.mjs";
import { statusData, statusText } from "./tools.mjs";

/** The status sections of the old board that the new section names show. */
const SECTION = /** @type {Record<string, string>} */ ({
    all: "all",
    owner: "owner",
    master: "master",
    // ponytail: release state is part of the master section, and jobs, sessions and health have no
    // section of their own yet; they show the whole board until the board text grows them.
    release: "master",
    prs: "prs",
    jobs: "all",
    sessions: "all",
    health: "all",
});

/** What a session that claimed a job is told: how to keep the claim (asks.mjs statusStep). */
export const CLAIMED =
    "Do the job's work in a background subagent or workflow, and keep this conversation free to answer githerd's " +
    "status questions: githerd asks where the job stands every few minutes, you answer with githerd_expect, and a " +
    "question still unanswered when the next one is due puts the job back in the queue.";

/** Kinds a wait may name, as `waitingFor` keys. */
const WAIT_KEYS = /** @type {Record<string, string>} */ ({
    checks: "checks",
    lane: "lane",
    release: "release",
    job: "job",
    local: "local",
});

/**
 * One request's view of the daemon.
 * @typedef {object} SessionToolContext
 * @property {any} state the daemon state; handlers change it in place
 * @property {any} config the normalized config
 * @property {Date} now the current time
 * @property {any} status what `statusData` reads besides the state: config, now, startedAt,
 *   version, mode, polledAt, nextPollAt
 * @property {{request: (args: any, session: string | null) => Promise<any>} | null} push the push
 *   queue, null while githerd cannot push
 * @property {any} github the GitHub client: `get` and `write`
 * @property {() => {worktrees?: any[], ownerSessions?: any[]}} snapshotFacts what the claim
 *   snapshot is built from
 * @property {(entry: {kind: string} & Record<string, unknown>) => Promise<void>} commit persists the
 *   state, then appends the ledger entry
 * @property {number} uid the user id, for a background task's output path
 * @property {string} [home] the home directory holding Claude Code's session registry
 * @property {import("./done.mjs").DoneIo} io what `githerd_done` reads to check a claim
 * @property {(job: any) => Promise<void>} ring rings a job's worker, for a job an answer sent back
 *   to work
 */

/**
 * The session id a call comes from: the one the client identified, else the transport's name.
 * @param {any} caller the transport's context
 * @param {import("./mcp.mjs").ClientMeta} client the client's metadata
 * @returns {string | null} the session
 */
function sessionOf(caller, client) {
    return client.session ?? caller?.session ?? null;
}

/**
 * Where a session works: what its MCP server sends on every call, else, once, the `cwd` of Claude
 * Code's registry entry for the session's process (`<home>/.claude/sessions/<pid>.json`), which an
 * MCP server too old to send it still names by pid. The entry counts only when it names the session.
 * @param {any} client the client's metadata
 * @param {string} session the session
 * @param {string | null | undefined} known the cwd already recorded for it
 * @param {string | undefined} home the home directory
 * @returns {string | undefined} the cwd, or undefined to leave the record as it is
 */
function sessionCwd(client, session, known, home) {
    if (typeof client?.cwd === "string") return client.cwd;
    if (known || !home || !Number.isInteger(client?.pid)) return undefined;
    try {
        const entry = JSON.parse(readFileSync(join(home, ".claude", "sessions", `${client.pid}.json`), "utf8"));
        return entry.sessionId === session && typeof entry.cwd === "string" ? entry.cwd : undefined;
    } catch {
        return undefined;
    }
}

/**
 * A session's name as Claude Code's registry shows it (`/rename`, or the derived name), when its
 * entry names the session.
 * @param {string | undefined} home the home directory
 * @param {unknown} pid the session's claude process
 * @param {string} session the session
 * @returns {string | null} the name
 */
function registryName(home, pid, session) {
    const n = Number(pid);
    if (!home || !Number.isInteger(n)) return null;
    try {
        const entry = JSON.parse(readFileSync(join(home, ".claude", "sessions", `${n}.json`), "utf8"));
        return entry.sessionId === session && typeof entry.name === "string" ? entry.name : null;
    } catch {
        return null;
    }
}

/**
 * The refusal of a worker whose start is no longer its job's.
 * @param {string} id the job
 * @returns {string} the message
 */
const STALE = (id) => `githerd no longer runs this window for ${id}: end this session (/exit)`;

/**
 * Whether a worker's window is the one githerd opened for its job now: the job's holder carries the
 * worker's nonce. A window whose job was requeued without it (githerd restarted during its start)
 * has no holder to match, and is refused rather than taken for an owner session.
 * @param {any} job the job
 * @param {import("./mcp.mjs").ClientMeta} client the client's metadata
 * @returns {boolean} the worker holds the job
 */
function startedFor(job, client) {
    return Boolean(client.nonce) && job?.holder?.nonce === client.nonce;
}

/**
 * The job a call names, when the caller holds it: a worker must name its own job and carry its
 * nonce, and the job's session must be the caller's.
 * @param {any} state the daemon state
 * @param {string} id the job
 * @param {string | null} session the calling session
 * @param {import("./mcp.mjs").ClientMeta} client the client's metadata
 * @returns {any} the job
 */
function heldJob(state, id, session, client) {
    const job = state.jobs?.[id];
    if (!job) throw new Error(`no job ${id}`);
    if (client.job && client.job !== id) throw new Error(`this worker is started for job ${client.job}, not ${id}`);
    if (!session || job.holder?.session !== session) {
        throw new Error(`this session does not hold ${id}; claim it with githerd_claim first`);
    }
    if (client.job && !startedFor(job, client)) throw new Error(STALE(id));
    return job;
}

/**
 * The claim snapshot now (design 8.2).
 * @param {SessionToolContext} ctx the context
 * @returns {{version: number, inFlight: any[], ownerSessions: any[]}} the snapshot
 */
function snapshot(ctx) {
    return board.claimSnapshot(ctx.state, ctx.snapshotFacts());
}

/**
 * The thirteen tools with their handlers, bound to one request.
 * @param {SessionToolContext} ctx the request context
 * @returns {import("./mcp.mjs").Tool[]} the tools
 */
export function sessionToolSet(ctx) {
    const { state, now } = ctx;

    /** @type {Record<string, (args: any, caller: any, client: import("./mcp.mjs").ClientMeta) => any>} */
    const handlers = {
        githerd_status: (args) => {
            const query = { section: SECTION[args.section ?? "all"], pr: args.pr };
            // The banner starts every result already (the MCP core's `banner`).
            const data = statusData(state, ctx.status, query);
            delete data.banner;
            return args.format === "json" ? JSON.stringify(data, null, 2) : statusText(data, now);
        },
        githerd_next: async (_args, caller, client) => {
            const session = sessionOf(caller, client);
            const load = { loadavg: loadavg(), cores: availableParallelism() };
            const snap = snapshot(ctx);
            if (client.job) {
                const job = state.jobs?.[client.job];
                if (!job) throw new Error(`no job ${client.job} for this worker`);
                if (!startedFor(job, client)) throw new Error(STALE(client.job));
                const news = job.news.filter((/** @type {any} */ n) => !n.acked).map((/** @type {any} */ n) => n.text);
                for (const n of job.news) n.acked = true;
                // The worker read its issue's current revision (merge decision line 8).
                if (job.kind === "issue") {
                    job.acknowledgedRevision = state.issues?.byNumber?.[String(job.target).slice(1)]?.updatedAt ?? null;
                }
                if (job.holder?.session === session) job.steeredAt = null;
                await ctx.commit({ kind: "next", job: job.id, session, news: news.length });
                const instructions =
                    jobText(job, { policies: state.policies }) +
                    (job.state === "starting"
                        ? "Judge overlap against the snapshot, then call githerd_claim before any edit."
                        : "Continue your job; your news is above.");
                return JSON.stringify({ job, snapshot: snap, news, load, instructions });
            }
            // A job whose pull request another session works on is listed apart, with why (8.2).
            const queued = Object.values(state.jobs ?? {}).filter((/** @type {any} */ j) => j.state === "queued");
            const inUse = queued
                .map((/** @type {any} */ j) => ({ job: j.id, reason: jobInUse(state, j, ctx) }))
                .filter((u) => u.reason);
            const offered = queued.filter((/** @type {any} */ j) => !inUse.some((u) => u.job === j.id));
            // What githerd told this session, such as a worker's push that overlaps its files (8.2).
            const record = session ? state.sessions?.[session] : null;
            const news = (record?.news ?? [])
                .filter((/** @type {any} */ n) => !n.acked)
                .map((/** @type {any} */ n) => n.text);
            for (const n of record?.news ?? []) n.acked = true;
            return JSON.stringify({
                job: null,
                offered,
                inUse,
                snapshot: snap,
                news,
                load,
                instructions: "To take a queued job, call githerd_claim with it and your overlap judgment.",
            });
        },
        githerd_claim: async (args, caller, client) => {
            const session = sessionOf(caller, client);
            if (!session) throw new Error("this session is not identified yet; try again in a moment");
            if (client.job && client.job !== args.job) throw new Error(`this worker is started for job ${client.job}`);
            if (client.job && !startedFor(state.jobs?.[args.job], client)) throw new Error(STALE(args.job));
            const queued = state.jobs?.[args.job]?.state === "queued" ? state.jobs[args.job] : null;
            const inUse = queued && jobInUse(state, queued, ctx);
            if (inUse)
                return {
                    text: JSON.stringify({ ok: false, reason: `${args.job} is in use: ${inUse}` }),
                    isError: true,
                };
            const result = board.claimJob(state, args, { session }, snapshot(ctx), now);
            if (!result.ok) return { text: JSON.stringify(result), isError: true };
            await ctx.commit({ kind: "job-claim", job: args.job, session, decision: args.overlap.decision });
            const created = result.created ? { created: result.created } : {};
            return JSON.stringify({
                ok: true,
                job: { id: result.job.id, state: result.job.state },
                ...created,
                // githerd's own workers have the watchdog, not the status question.
                ...(board.ownerHeld(result.job) ? { instructions: CLAIMED } : {}),
            });
        },
        githerd_wait: async (args, caller, client) => {
            const session = sessionOf(caller, client);
            const job = heldJob(state, args.job, session, client);
            if (job.state !== "working") throw new Error(`${job.id} is ${job.state}, not working`);
            const key = WAIT_KEYS[args.for];
            /** @type {Record<string, unknown>} */
            const waitingFor = { [key]: args.target, reason: args.reason };
            if (args.for === "job") {
                const other = state.jobs?.[args.target];
                if (!other || board.TERMINAL.includes(other.state)) {
                    return { text: JSON.stringify({ ok: false, reason: `${args.target} is settled` }), isError: true };
                }
                if (board.closesCycle(state, job.id, other.id)) {
                    throw new Error(`waiting on ${other.id} closes a cycle: it already waits on ${job.id}`);
                }
            }
            if (args.for === "local") {
                // A task's directory is named after the session's own directory: an owner session's
                // is the checkout it started in, never the job's worktree.
                const cwd = state.sessions?.[session ?? ""]?.cwd ?? job.worktree ?? "";
                waitingFor.output = taskOutputPath(ctx.uid, cwd, session ?? "", args.target);
            }
            // ponytail: only a job wait is checked for being settled; checks, lanes and releases are
            // settled by the next poll, which ends the wait with the doorbell.
            board.move(job, "waiting", now, { waitingFor });
            await ctx.commit({ kind: "wait", job: job.id, for: args.for, target: args.target });
            return JSON.stringify({ ok: true, until: job.deadline });
        },
        githerd_expect: async (args, caller, client) => {
            const job = heldJob(state, args.job, sessionOf(caller, client), client);
            const until = new Date(now.getTime() + args.minutes * 60_000).toISOString();
            job.expect = { until, reason: args.reason };
            // The reason is the holder's status too: it answers githerd's status question (asks.mjs).
            job.status = { at: now.toISOString(), text: args.reason };
            await ctx.commit({ kind: "expect", job: job.id, until, reason: args.reason });
            return JSON.stringify({ ok: true, until });
        },
        githerd_push: async (args, caller, client) => {
            if (!ctx.push) throw new Error("githerd cannot push now: no valid config or it is in fatal mode");
            const session = sessionOf(caller, client);
            heldJob(state, args.job, session, client);
            const answer = await ctx.push.request(args, session);
            return answer.ok === false ? { text: JSON.stringify(answer), isError: true } : JSON.stringify(answer);
        },
        githerd_rerun: async (args, caller, client) =>
            rerun(ctx, heldJob(state, args.job, sessionOf(caller, client), client), args, sessionOf(caller, client)),
        githerd_read: async (args) => read(ctx, args),
        githerd_done: async (args, caller, client) => {
            const session = sessionOf(caller, client);
            return githerdDone(ctx, heldJob(state, args.job, session, client), args, session);
        },
        githerd_ask_owner: async (args, caller, client) => {
            const session = sessionOf(caller, client);
            const { result, entry } = askOwner(state, heldJob(state, args.job, session, client), args, {
                session,
                now,
            });
            if (entry) await ctx.commit(entry);
            return JSON.stringify(result);
        },
        githerd_record: async (args, caller, client) => {
            const r = recordOwner(state, args, {
                session: sessionOf(caller, client),
                worker: client.job ?? null,
                now,
                typed: client.typed ?? null,
            });
            await ctx.commit(r.entry);
            for (const back of r.resumed) await ctx.ring(state.jobs[back.job]);
            return r.text;
        },
        githerd_mine: async (args, caller, client) => {
            const session = sessionOf(caller, client);
            if (!session) throw new Error("this session is not identified yet; try again in a moment");
            if (client.job) throw new Error(`this worker works on ${client.job}; its pull request is its job's`);
            const rec = state.prs?.[String(args.pr)];
            if (!rec) throw new Error(`githerd knows no open pull request #${args.pr}`);
            state.asks ??= {};
            const ask = askFor(state, args.pr) ?? (state.asks[String(args.pr)] = { head: rec.headSha, sessions: [] });
            if (ask.owner && ask.owner.session !== session) {
                return {
                    text: JSON.stringify({
                        ok: false,
                        reason: `session ${ask.owner.name} already said #${args.pr} is its`,
                    }),
                    isError: true,
                };
            }
            const name = registryName(ctx.home, client.pid ?? state.sessions?.[session]?.pid, session) ?? session;
            ask.owner = { session, name, at: now.toISOString() };
            await ctx.commit({ kind: "pr-mine", pr: args.pr, head: rec.headSha, session });
            return JSON.stringify({
                ok: true,
                pr: args.pr,
                head: rec.headSha,
                until: "this session ends or a new push",
            });
        },
        githerd_verdict: async (args, caller, client) => {
            const session = sessionOf(caller, client);
            if (!session) throw new Error("this session is not identified yet; try again in a moment");
            const found = unjudged(state, args.key);
            if (!found) throw new Error(`${args.key} is not a red failure on master that waits for a verdict`);
            const verdicts = (found.lane.verdicts ??= {});
            const had = verdicts[args.key];
            if (had) {
                const text = `${args.key} was already judged ${had.verdict} at ${had.at}: ${had.reason}`;
                return { text: JSON.stringify({ ok: false, reason: text }), isError: true };
            }
            const at = now.toISOString();
            verdicts[args.key] = {
                verdict: args.verdict,
                reason: args.reason,
                by: session,
                at,
                runId: found.lane.runId,
            };
            await ctx.commit({ kind: "verdict", key: args.key, verdict: args.verdict, reason: args.reason, session });
            const effect =
                args.verdict === "code"
                    ? "the incident procedure goes on, its revert step included"
                    : "the merge hold lifts at the next poll; the owner is told if the failure persists";
            return JSON.stringify({ ok: true, key: args.key, verdict: args.verdict, effect });
        },
    };

    return TOOLS.map((tool) => ({
        ...tool,
        handler: async (/** @type {any} */ args, /** @type {any} */ caller, /** @type {any} */ client) => {
            const session = sessionOf(caller, client ?? {});
            // The protocol of an accepted call: the daemon serves the previous one while a live
            // session still speaks it (design 9.8).
            if (session) {
                const cwd = sessionCwd(client, session, state.sessions?.[session]?.cwd, ctx.home);
                const record = board.heartbeat(state, { session, cwd }, now);
                record.protocol = client?.protocol;
                // An owner session's claude process, whose registry entry names the session.
                if (!client?.job && client?.pid) record.pid = client.pid;
            }
            return handlers[tool.name](args, caller, client ?? {});
        },
    }));
}

/**
 * The red master lane with a failing job on a key that matched no unambiguous pattern (design 4.4),
 * or null.
 * @param {any} state the daemon state
 * @param {string} key the failure key
 * @returns {{name: string, lane: any} | null} the lane
 */
function unjudged(state, key) {
    for (const [name, lane] of Object.entries(state.master?.lanes ?? {})) {
        const l = /** @type {any} */ (lane);
        if (l.verdict !== "red") continue;
        if ((l.redJobs ?? []).some((/** @type {any} */ j) => j.key === key && j.textClass === "unclassified"))
            return { name, lane: l };
    }
    return null;
}

/**
 * `githerd_rerun`: one re-run of a failed CI job on a pull request head, granted once per head and
 * job name, through the write gate of group `worker-writes` (a `would-do` line until it acts). The
 * pull request is the job's, or `args.pr` when that is the job's, one the calling session took with
 * `githerd_mine`, or an open one that names the job's issue (an issue job's partial pull requests).
 * @param {SessionToolContext} ctx the context
 * @param {any} job the caller's job
 * @param {{run: number, jobId: number, reason: string, pr?: number}} args the request
 * @param {string | null} session the calling session
 * @returns {Promise<string>} what happened
 */
async function rerun(ctx, job, args, session) {
    const repo = ctx.config.repo;
    const pr = args.pr ?? job.pr;
    const rec = pr ? ctx.state.prs?.[String(pr)] : null;
    const head = rec?.headSha;
    if (!head) {
        throw new Error(
            args.pr === undefined
                ? `${job.id} has no pull request githerd knows the head of; name one with pr`
                : `githerd knows no open pull request #${args.pr}`,
        );
    }
    if (args.pr !== undefined && args.pr !== job.pr && askFor(ctx.state, args.pr)?.owner?.session !== session) {
        const issue = job.kind === "issue" ? numberOf(job.target) : null;
        const body = issue ? (await ctx.github.get(`repos/${repo}/pulls/${args.pr}`)).body?.body : null;
        if (!issue || !namesIssue(rec, body, issue)) {
            throw new Error(
                `#${args.pr} is not ${job.id}'s pull request, one this session took, nor one naming its issue`,
            );
        }
    }
    const run = (await ctx.github.get(`repos/${repo}/actions/runs/${args.run}`)).body ?? {};
    if (run.head_sha !== head) throw new Error(`run ${args.run} is not on the head ${head.slice(0, 9)}`);
    const failed = (await ctx.github.get(`repos/${repo}/actions/jobs/${args.jobId}`)).body ?? {};
    if (failed.run_id !== args.run || !["failure", "timed_out"].includes(failed.conclusion)) {
        throw new Error(`job ${args.jobId} is not a failed job of run ${args.run}`);
    }
    const key = `${head}:${failed.name}`;
    ctx.state.reruns ??= {};
    if (ctx.state.reruns[key]) throw new Error(`${failed.name} was already re-run once on this head`);
    ctx.state.reruns[key] = { at: ctx.now.toISOString(), job: job.id, reason: args.reason };
    await ctx.commit({ kind: "rerun-granted", job: job.id, run: args.run, name: failed.name, head });
    const r = await ctx.github.write(
        "POST",
        `repos/${repo}/actions/jobs/${args.jobId}/rerun`,
        {},
        {
            group: "worker-writes",
            check: {
                path: `repos/${repo}/actions/runs/${args.run}`,
                expect: { run_attempt: (run.run_attempt ?? 1) + 1 },
            },
            fields: { job: job.id },
        },
    );
    return r.performed ? `re-run of ${failed.name} started` : `would re-run ${failed.name} (dry-run)`;
}

/**
 * `githerd_read`: an issue or pull request with only the text the owner's account wrote; other
 * accounts' items are counted, not shown.
 * @param {SessionToolContext} ctx the context
 * @param {{issue?: number, pr?: number, include?: string[]}} args the request
 * @returns {Promise<string>} the text, as JSON
 */
async function read(ctx, args) {
    const number = args.pr ?? args.issue;
    if (number === undefined) throw new Error("name an issue or a pr");
    const repo = ctx.config.repo;
    const include = new Set(args.include ?? ["body", "comments"]);
    const mine = (/** @type {any} */ x) => board.byOwner(ctx.state, x?.user?.login);
    const item = (await ctx.github.get(`repos/${repo}/issues/${number}`)).body ?? {};
    let hidden = mine(item) ? 0 : 1;
    /** @type {Record<string, unknown>} */
    const out = { number, author: item.user?.login ?? null, state: item.state ?? null };
    if (include.has("body")) out.body = mine(item) ? item.body : null;
    out.title = mine(item) ? item.title : null;
    /**
     * The owner's items of a list, counting the others.
     * @param {string} path the list
     * @returns {Promise<any[]>} the owner's items
     */
    const owned = async (path) => {
        const all = (await ctx.github.get(path)).body ?? [];
        const kept = all.filter(mine);
        hidden += all.length - kept.length;
        return kept.map((/** @type {any} */ c) => ({
            at: c.created_at ?? c.submitted_at,
            body: c.body,
            state: c.state,
        }));
    };
    if (include.has("comments")) out.comments = await owned(`repos/${repo}/issues/${number}/comments?per_page=100`);
    if (args.pr !== undefined && include.has("reviews")) {
        out.reviews = await owned(`repos/${repo}/pulls/${number}/reviews?per_page=100`);
    }
    if (args.pr !== undefined && include.has("files")) {
        const files = (await ctx.github.get(`repos/${repo}/pulls/${number}/files?per_page=100`)).body ?? [];
        out.files = files.map((/** @type {any} */ f) => f.filename);
    }
    out.hidden = hidden;
    return JSON.stringify(out);
}
