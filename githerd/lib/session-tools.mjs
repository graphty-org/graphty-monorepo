/**
 * The handlers of the eleven tools of design section 6, as the daemon serves them to every session
 * that is not a judgment run: owner sessions and workers. Names, descriptions and schemas are
 * `TOOLS` in mcp.mjs; the session's MCP server forwards calls here with `params._meta.githerd`
 * (the client's protocol, session, job and nonce), and the MCP core refuses a call in a protocol
 * this daemon does not serve before any handler runs.
 *
 * A worker is known by its job and nonce: a call that names a job is refused unless the caller holds
 * it. `githerd_done` checks the claim against GitHub before accepting it (done.mjs);
 * `githerd_ask_owner` and `githerd_record` are the owner layer (owner.mjs).
 */

import { availableParallelism, loadavg } from "node:os";

import * as board from "./board.mjs";
import { githerdDone } from "./done.mjs";
import { taskOutputPath } from "./hook.mjs";
import { askOwner, recordOwner } from "./owner.mjs";
import { jobText } from "./job-text.mjs";
import { TOOLS } from "./mcp.mjs";
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
    if (client.job && (client.job !== id || (job.holder?.nonce && job.holder.nonce !== client.nonce))) {
        throw new Error(`this worker is started for job ${client.job}, not ${id}`);
    }
    if (!session || job.holder?.session !== session) {
        throw new Error(`this session does not hold ${id}; claim it with githerd_claim first`);
    }
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
 * The eleven tools with their handlers, bound to one request.
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
                if (!job || (job.holder?.nonce && job.holder.nonce !== client.nonce)) {
                    throw new Error(`no job ${client.job} for this worker`);
                }
                const news = job.news.filter((/** @type {any} */ n) => !n.acked).map((/** @type {any} */ n) => n.text);
                for (const n of job.news) n.acked = true;
                if (job.holder?.session === session) job.steeredAt = null;
                await ctx.commit({ kind: "next", job: job.id, session, news: news.length });
                const instructions =
                    jobText(job, { policies: state.policies }) +
                    (job.state === "starting"
                        ? "Judge overlap against the snapshot, then call githerd_claim before any edit."
                        : "Continue your job; your news is above.");
                return JSON.stringify({ job, snapshot: snap, news, load, instructions });
            }
            const offered = Object.values(state.jobs ?? {}).filter((/** @type {any} */ j) => j.state === "queued");
            return JSON.stringify({
                job: null,
                offered,
                snapshot: snap,
                load,
                instructions: "To take a queued job, call githerd_claim with it and your overlap judgment.",
            });
        },
        githerd_claim: async (args, caller, client) => {
            const session = sessionOf(caller, client);
            if (!session) throw new Error("this session is not identified yet; try again in a moment");
            if (client.job && client.job !== args.job) throw new Error(`this worker is started for job ${client.job}`);
            const result = board.claimJob(state, args, { session }, snapshot(ctx), now);
            if (!result.ok) return { text: JSON.stringify(result), isError: true };
            await ctx.commit({ kind: "job-claim", job: args.job, session, decision: args.overlap.decision });
            return JSON.stringify({ ok: true, job: { id: result.job.id, state: result.job.state } });
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
                waitingFor.output = taskOutputPath(ctx.uid, job.worktree ?? "", session ?? "", args.target);
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
            rerun(ctx, heldJob(state, args.job, sessionOf(caller, client), client), args),
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
            const r = recordOwner(state, args, { session: sessionOf(caller, client), worker: client.job ?? null, now });
            await ctx.commit(r.entry);
            for (const back of r.resumed) await ctx.ring(state.jobs[back.job]);
            return r.text;
        },
    };

    return TOOLS.map((tool) => ({
        ...tool,
        handler: async (/** @type {any} */ args, /** @type {any} */ caller, /** @type {any} */ client) => {
            const session = sessionOf(caller, client ?? {});
            // The protocol of an accepted call: the daemon serves the previous one while a live
            // session still speaks it (design 9.8).
            if (session) board.heartbeat(state, { session }, now).protocol = client?.protocol;
            return handlers[tool.name](args, caller, client ?? {});
        },
    }));
}

/**
 * `githerd_rerun`: one re-run of a failed CI job on the job's pull request head, granted once per
 * head and job name, through the write gate of group `workers` (a `would-do` line until it acts).
 * @param {SessionToolContext} ctx the context
 * @param {any} job the caller's job
 * @param {{run: number, jobId: number, reason: string}} args the request
 * @returns {Promise<string>} what happened
 */
async function rerun(ctx, job, args) {
    const repo = ctx.config.repo;
    const head = job.pr ? ctx.state.prs?.[String(job.pr)]?.headSha : null;
    if (!head) throw new Error(`${job.id} has no pull request githerd knows the head of`);
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
            group: "workers",
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
