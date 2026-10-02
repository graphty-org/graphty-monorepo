/**
 * The dispatcher (design sections 9.1, 10 and 10.1): decides which judgment runs to start.
 *
 * It is level-triggered. Every poll it reads the daemon state and works out which runs the state
 * calls for, so events on one target within a poll merge into one item, and a target with a run in
 * flight gets at most one follow-up: the item the state still calls for when that run ends. Items
 * start in priority order (master red, failing PRs, conflicts, release, triage, refresh, backlog,
 * re-triage); the first one admission refuses for budget or concurrency stops the pass, so a lower
 * kind never overtakes a higher one that is waiting for room.
 *
 * Which row of the event table starts which run:
 *
 * | Row | State | Run |
 * |---|---|---|
 * | 1 | open incident, 15 minute hold over, no live session claims `master`, no owner's PR opened after the red | master-red |
 * | 6 | open `release-failed`, `release-stalled` or `lane-stuck:` escalation with no run yet | release |
 * | 8 | the owner's non-draft PR with a failing required check, master green, not in the owner gate | pr-fix |
 * | 9 | the same while master is red | none |
 * | 10 | the owner's non-draft PR conflicting on two sightings, master green | pr-conflict |
 * | 12 | the owner rejected the PR's images | pr-fix with the reject block |
 * | 16 | the owner's open issue missing a type, priority or effort label, changed since its last triage | triage, up to 10, one run per 30 minutes |
 * | 17 | merged PRs changed paths, refresh due | refresh, the top issues by `rankForRefresh` |
 * | 23 | nothing else queued, master not red, under the WIP cap, an agent-ready issue | backlog |
 *
 * Every other row is deterministic and belongs to the daemon or the actor. Re-triage items come
 * from the re-triage module through `extra`.
 *
 * Only the owner's items count: the owner is the account gh is logged in as (`state.trust.login`),
 * and an issue or PR by anyone else, bots included, starts no run of any kind. While that login is
 * unresolved, no run starts at all.
 */

import { byOwner, escalate, holderAlive, resolve } from "./board.mjs";
import { rankForRefresh } from "./merged.mjs";
import { admit, consumesAttempt } from "./runner.mjs";
import { RUN_TEXT } from "./tools.mjs";

/** Start order when several runs are wanted. */
const PRIORITY = Object.freeze([
    "master-red",
    "pr-fix",
    "pr-conflict",
    "release",
    "triage",
    "refresh",
    "backlog",
    "retriage-candidates",
    "retriage-filter",
]);

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
/** A confirmed red master waits this long for a session to take it (row 1). */
const MASTER_RED_HOLD_MS = 15 * MINUTE;
/** A PR head younger than this belongs to whoever pushed it, unless githerd did (section 9.1). */
const RECENT_HEAD_MS = 30 * MINUTE;
const TRIAGE_EVERY_MS = 30 * MINUTE;
const TRIAGE_BATCH = 10;
const BACKLOG_EVERY_MS = 7 * DAY;
/** Section 10.1: runs per PR of each kind until its limits reset, and runs per PR per 24 hours. */
const PR_LIMITS = { "pr-fix": 3, "pr-conflict": 2 };
const PR_RUNS_PER_DAY = 4;
/** Labels that keep an issue out of the backlog, besides every `needs-*` label. */
const NOT_READY = ["blocked", "research", "in-progress"];

/**
 * @typedef {object} Item a run the state calls for; the daemon turns it into a runner request
 * @property {string} kind the run kind
 * @property {string} event what calls for it
 * @property {string} target `master`, `pr:N`, `issue:N` or `task:<slug>`
 * @property {string[]} [batch] further `issue:N` targets the run may act on
 * @property {string} [incident] the open incident (master-red)
 * @property {string[]} [failingJobs] the incident's failing jobs when the run was wanted (master-red)
 * @property {boolean} [rejected] the owner rejected the PR's images: give the run the reject block
 * @property {string} [branch] the branch the run works on (backlog)
 * @property {string} [escalation] the escalation the run answers (release)
 * @property {Record<string, number[]>} [paths] the changed paths and their PRs (refresh)
 */

/** @typedef {{number: number, title?: string, body?: string | null}} IssueText */

/**
 * @typedef {object} DispatchContext
 * @property {any} state the daemon state; attempt counters and schedules are written here
 * @property {import("./config.mjs").Config} config the normalized config
 * @property {string} mode the effective mode
 * @property {Date} now the current time
 * @property {Date} startedAt when the daemon started (session liveness)
 * @property {(item: Item) => Promise<{ok: true, id: string} | {ok: false, reason: string}>} launch
 *   prepares and starts the run (worktree, prompt, `runner.start`); a refusal leaves the item
 *   waiting and the pass goes on
 * @property {(args: {key: string, kind: string, summary: string, detail?: string, target?: string})
 *   => void} [raise] raises a daemon escalation; defaults to recording it in `state.escalations`
 * @property {(numbers: number[]) => Promise<IssueText[]>} [issueTexts] reads issue titles and
 *   bodies; without it no refresh run starts
 * @property {Item[]} [extra] items from elsewhere (re-triage), queued by their kind's priority
 * @property {Date | null} [holdUntil] no run starts before this (after an empty-state start)
 */

/**
 * @typedef {object} DispatchResult
 * @property {{item: Item, id: string}[]} started the runs started
 * @property {{item: Item | {kind: string, target: string}, reason: string}[]} waiting items not
 *   started this pass, and why
 * @property {string[]} masterRedUnhandled open incidents no run will handle: their limit is spent or
 *   the day's budget cannot fit a master-red run. The daemon pages these per section 5.5.
 * @property {boolean} slotsFull admission refused an item this pass, so nothing lower in the queue
 *   (re-triage) may start either
 */

/**
 * Whether a run still counts against its target's limits: running, or ended in a way that consumes
 * an attempt. A run no longer in the state is counted.
 * @param {any} state the daemon state
 * @param {string} id the run id
 * @returns {boolean} true when it counts
 */
function counts(state, id) {
    const run = state.runs?.[id];
    return !run || run.status === "running" || consumesAttempt(run);
}

/**
 * Whether a live holder other than one of githerd's runs claims `target`.
 * @param {any} state the daemon state
 * @param {string} target the target
 * @param {Date} now the current time
 * @param {Date} startedAt when the daemon started
 * @returns {boolean} true when a live session holds it
 */
function sessionClaims(state, target, now, startedAt) {
    const claim = state.claims?.[target];
    return !!claim && !claim.holder.startsWith("run-") && holderAlive(state, claim.holder, now, startedAt);
}

/**
 * Whether a live session reports working on `branch`.
 * @param {any} state the daemon state
 * @param {string} branch the branch
 * @param {Date} now the current time
 * @param {Date} startedAt when the daemon started
 * @returns {boolean} true when one does
 */
function sessionOnBranch(state, branch, now, startedAt) {
    return Object.entries(state.sessions ?? {}).some(
        ([id, s]) => s.branch === branch && holderAlive(state, id, now, startedAt),
    );
}

/**
 * The incident's failing jobs across its lanes, sorted and unique.
 * @param {any} incident the incident record
 * @returns {string[]} the jobs
 */
function failingJobs(incident) {
    const jobs = Object.values(incident.lanes ?? {}).flatMap((/** @type {any} */ l) => l.failingJobs ?? []);
    return [...new Set(jobs)].sort();
}

/**
 * Resets a PR's run counters when someone other than githerd pushed a new head (section 10.1), and
 * clears the limit escalation with them.
 * @param {any} state the daemon state
 * @param {string} number the PR number
 * @param {any} rec the PR record
 * @param {Date} now the current time
 * @returns {any} the PR's attempts record
 */
function syncAttempts(state, number, rec, now) {
    const a = (rec.attempts ??= {});
    a.runs ??= [];
    if (a.headSha !== rec.headSha) {
        if (a.headSha !== undefined && !state.pushedByGitherd?.[rec.headSha]) {
            a.runs = [];
            a.resetBy = rec.headSha;
            const key = `run-limit:pr:${number}`;
            if (state.escalations?.[key] && !state.escalations[key].resolvedAt) resolve(state, { key }, now);
        }
        a.headSha = rec.headSha;
    }
    return a;
}

/**
 * The labels an issue is missing: one of each configured set it has none of.
 * @param {string[]} labels the issue's labels
 * @param {import("./config.mjs").Config} config the normalized config
 * @returns {boolean} true when a type, priority or effort label is missing
 */
function missingLabels(labels, config) {
    const { types, priorities, efforts } = config.labels;
    return [types, priorities, efforts].some((set) => set.length > 0 && !labels.some((l) => set.includes(l)));
}

/**
 * Whether an issue is agent-ready (section 10, row 23). Only the issue's author counts as trust:
 * githerd's own labels are made as the owner, so who labeled it proves nothing, and the author must
 * be the owner.
 * @param {number} number the issue number
 * @param {any} issue the issue record
 * @param {{state: any, config: import("./config.mjs").Config, now: Date}} ctx the state, config
 *   and clock
 * @returns {boolean} true when a backlog run may take it
 */
export function agentReady(number, issue, { state, config, now }) {
    const labels = issue.labels ?? [];
    const { types, priorities, efforts } = config.labels;
    const has = (/** @type {string[]} */ set) => labels.some((l) => set.includes(l));
    const referenced = Object.values(state.prs ?? {}).some(
        (/** @type {any} */ p) =>
            (p.references ?? []).includes(number) ||
            new RegExp(`#${number}(?!\\d)`).test(p.title ?? "") ||
            p.headRef === `githerd/issue-${number}`,
    );
    return (
        issue.state === "open" &&
        byOwner(state, issue.author) &&
        has(types) &&
        has(priorities) &&
        has(efforts) &&
        has(config.backlog.efforts) &&
        !labels.some((l) => NOT_READY.includes(l) || l.startsWith("needs-")) &&
        !referenced &&
        !state.claims?.[`issue:${number}`] &&
        !(issue.lastBacklogAt && now.getTime() - Date.parse(issue.lastBacklogAt) < BACKLOG_EVERY_MS)
    );
}

/**
 * Works out the runs the state calls for (every kind but backlog and refresh, which need the
 * others' answer or issue text), raising the limit escalations it finds on the way.
 * @param {DispatchContext} ctx the context
 * @param {(args: any) => void} raise raises an escalation
 * @param {string[]} unhandled collects incidents no run will handle
 * @param {DispatchResult["waiting"]} waiting collects items not wanted yet, and why
 * @returns {Item[]} the items
 */
function wanted(ctx, raise, unhandled, waiting) {
    const { state, config, now, startedAt } = ctx;
    const t = now.getTime();
    /** @type {Item[]} */
    const items = [];
    const verdict = state.master?.verdict ?? "unknown";

    // Row 1: master red.
    const incident = Object.values(state.incidents ?? {}).find((/** @type {any} */ i) => i.status === "open");
    if (incident && verdict === "red") {
        const confirmed = Date.parse(incident.confirmedAt ?? incident.openedAt);
        incident.holdUntil ??= new Date(confirmed + MASTER_RED_HOLD_MS).toISOString();
        const fixPrOpened = Object.values(state.prs ?? {}).some(
            (/** @type {any} */ p) => byOwner(state, p.author) && p.createdAt && p.createdAt > incident.openedAt,
        );
        const jobs = failingJobs(incident);
        const runs = (incident.runs ?? []).filter((/** @type {any} */ r) => counts(state, r.run));
        const target = { kind: "master-red", target: "master" };
        if (t < Date.parse(incident.holdUntil)) waiting.push({ item: target, reason: "15 minute hold" });
        else if (sessionClaims(state, "master", now, startedAt)) {
            waiting.push({ item: target, reason: "a session claims master" });
        } else if (fixPrOpened) waiting.push({ item: target, reason: "an owner's PR was opened after the red" });
        else if (runs.length === 0 || (runs.length === 1 && runs[0].failingJobs.join("\n") !== jobs.join("\n"))) {
            items.push({ ...target, event: "master-red-confirmed", incident: incident.id, failingJobs: jobs });
        } else if (!runs.some((/** @type {any} */ r) => state.runs?.[r.run]?.status === "running")) {
            const last = state.runs?.[runs.at(-1).run];
            const summary = last?.structured?.summary;
            raise({
                key: `master-red:${incident.id}`,
                kind: "master-red",
                target: "master",
                summary: `master red (${incident.id}): the fix runs ended without a fix`,
                detail: typeof summary === "string" ? `${RUN_TEXT} ${summary}` : undefined,
            });
            unhandled.push(incident.id);
        }
    }

    // Rows 8, 10 and 12: pull requests. Row 9: nothing while master is red.
    for (const [number, rec] of Object.entries(state.prs ?? {})) {
        const attempts = syncAttempts(state, number, rec, now);
        if (verdict !== "green" || rec.draft || !byOwner(state, rec.author)) continue;
        /** @type {Item | null} */
        let item = null;
        const failing = Object.values(rec.required ?? {}).includes("FAILURE");
        if (rec.ownerRejected)
            item = { kind: "pr-fix", event: "owner-rejected", target: `pr:${number}`, rejected: true };
        else if (failing && !rec.ownerGate) item = { kind: "pr-fix", event: "pr-check-failed", target: `pr:${number}` };
        else if (rec.conflictSightings >= 2)
            item = { kind: "pr-conflict", event: "pr-conflicting", target: `pr:${number}` };
        if (!item) continue;

        const runs = attempts.runs.filter((/** @type {any} */ r) => counts(state, r.id));
        const limit = PR_LIMITS[/** @type {"pr-fix" | "pr-conflict"} */ (item.kind)];
        if (runs.filter((/** @type {any} */ r) => r.kind === item.kind).length >= limit) {
            raise({
                key: `run-limit:pr:${number}`,
                kind: "blocked",
                target: item.target,
                summary: `#${number}: ${limit} ${item.kind} runs did not get it moving; it needs a person`,
            });
            continue;
        }
        if (runs.filter((/** @type {any} */ r) => t - Date.parse(r.at) < DAY).length >= PR_RUNS_PER_DAY) {
            waiting.push({ item, reason: `${PR_RUNS_PER_DAY} runs in 24 hours` });
        } else if (
            sessionClaims(state, item.target, now, startedAt) ||
            sessionClaims(state, `branch:${rec.headRef}`, now, startedAt)
        ) {
            waiting.push({ item, reason: "claimed by a session" });
        } else if (sessionOnBranch(state, rec.headRef, now, startedAt)) {
            waiting.push({ item, reason: `a session works on ${rec.headRef}` });
        } else if (t - Date.parse(rec.headChangedAt) < RECENT_HEAD_MS && !state.pushedByGitherd?.[rec.headSha]) {
            waiting.push({ item, reason: "head changed in the last 30 minutes" });
        } else {
            items.push(item);
        }
    }

    // Row 6: release trouble.
    for (const esc of Object.values(state.escalations ?? {})) {
        const release =
            esc.kind === "release-failed" || esc.kind === "release-stalled" || esc.key.startsWith("lane-stuck:");
        if (release && !esc.resolvedAt && !esc.run) {
            items.push({ kind: "release", event: esc.kind, target: "task:release", escalation: esc.key });
        }
    }

    // Row 16: triage.
    const lastTriage = Date.parse(state.schedule?.lastTriageAt ?? "") || 0;
    const untriaged = Object.entries(state.issues?.byNumber ?? {})
        .filter(
            ([n, i]) =>
                i.state === "open" &&
                byOwner(state, i.author) &&
                missingLabels(i.labels ?? [], config) &&
                !(i.lastTriagedAt && i.lastTriagedAt >= i.updatedAt) &&
                !sessionClaims(state, `issue:${n}`, now, startedAt),
        )
        .map(([n]) => Number(n))
        .sort((a, b) => a - b)
        .slice(0, TRIAGE_BATCH);
    if (untriaged.length) {
        const [first, ...rest] = untriaged.map((n) => `issue:${n}`);
        const item = { kind: "triage", event: "issue-unlabeled", target: first, batch: rest };
        if (t - lastTriage < TRIAGE_EVERY_MS) waiting.push({ item, reason: "one triage run per 30 minutes" });
        else items.push(item);
    }
    return items;
}

/**
 * The refresh run, when one is due (row 17): the owner's open issues that name the most changed paths,
 * leaving out issues refreshed in the last `refresh.minDaysBetween` days and issues a merged PR
 * closes.
 * @param {DispatchContext} ctx the context
 * @returns {Promise<Item | null>} the item, or null when none is due
 */
async function refreshItem(ctx) {
    const { state, config, now } = ctx;
    const paths = state.merged?.pendingPaths ?? {};
    const last = Date.parse(state.schedule?.lastRefreshAt ?? "") || 0;
    if (!ctx.issueTexts || Object.keys(paths).length === 0) return null;
    if (now.getTime() - last < config.refresh.everyHours * 60 * MINUTE) return null;
    const minAge = config.refresh.minDaysBetween * DAY;
    const open = Object.entries(state.issues?.byNumber ?? {})
        .filter(([, i]) => i.state === "open" && byOwner(state, i.author))
        .filter(([, i]) => !(i.lastRefreshedAt && now.getTime() - Date.parse(i.lastRefreshedAt) < minAge))
        .map(([n]) => Number(n));
    const ranked = open.length
        ? rankForRefresh(await ctx.issueTexts(open), Object.keys(paths), state.merged.closed ?? [])
        : [];
    const top = ranked.slice(0, config.refresh.maxIssuesPerRun).map((r) => `issue:${r.number}`);
    if (top.length === 0) {
        // Nothing names a changed path: the paths are spent.
        state.schedule ??= {};
        state.schedule.lastRefreshAt = now.toISOString();
        state.merged.pendingPaths = {};
        return null;
    }
    const [first, ...rest] = top;
    return { kind: "refresh", event: "merged-paths", target: first, batch: rest, paths };
}

/**
 * The backlog run (row 23), when capacity is free: master not red, nothing else queued, fewer open
 * githerd PRs and running backlog runs than `backlog.wipCap`. Highest priority first, then oldest.
 * @param {DispatchContext} ctx the context
 * @returns {Item | null} the item, or null
 */
function backlogItem(ctx) {
    const { state, config } = ctx;
    if ((state.master?.verdict ?? "unknown") === "red") return null;
    const wip =
        Object.values(state.prs ?? {}).filter((/** @type {any} */ p) => p.headRef?.startsWith("githerd/issue-"))
            .length +
        Object.values(state.runs ?? {}).filter((/** @type {any} */ r) => r.kind === "backlog" && r.status === "running")
            .length;
    if (wip >= config.backlog.wipCap) return null;
    const rank = (/** @type {string[]} */ labels) => {
        const i = config.labels.priorities.findIndex((p) => labels.includes(p));
        return i === -1 ? config.labels.priorities.length : i;
    };
    const ready = Object.entries(state.issues?.byNumber ?? {})
        .filter(([n, i]) => agentReady(Number(n), i, ctx))
        .sort(([a, x], [b, y]) => rank(x.labels) - rank(y.labels) || Number(a) - Number(b));
    if (ready.length === 0) return null;
    const n = ready[0][0];
    return { kind: "backlog", event: "capacity-free", target: `issue:${n}`, branch: `githerd/issue-${n}` };
}

/**
 * Records a started run against its target's limits and schedules.
 * @param {any} state the daemon state
 * @param {Item} item the item
 * @param {string} id the run id
 * @param {Date} now the current time
 */
function recordStart(state, item, id, now) {
    const iso = now.toISOString();
    state.schedule ??= {};
    const issue = (/** @type {string} */ target) => state.issues?.byNumber?.[target.slice("issue:".length)];
    const targets = [item.target, ...(item.batch ?? [])];
    switch (item.kind) {
        case "master-red":
            (state.incidents[/** @type {string} */ (item.incident)].runs ??= []).push({
                run: id,
                failingJobs: item.failingJobs ?? [],
            });
            break;
        case "pr-fix":
        case "pr-conflict":
            state.prs[item.target.slice(3)].attempts.runs.push({ id, kind: item.kind, at: iso });
            state.prs[item.target.slice(3)].attempts.lastRunAt = iso;
            break;
        case "release":
            state.escalations[/** @type {string} */ (item.escalation)].run = id;
            break;
        case "triage":
            state.schedule.lastTriageAt = iso;
            for (const t of targets) if (issue(t)) issue(t).lastTriagedAt = iso;
            break;
        case "refresh":
            state.schedule.lastRefreshAt = iso;
            state.merged.pendingPaths = {};
            for (const t of targets) if (issue(t)) issue(t).lastRefreshedAt = iso;
            break;
        case "backlog":
            if (issue(item.target)) issue(item.target).lastBacklogAt = iso;
            break;
        default:
            break;
    }
}

/**
 * One dispatcher pass: works out the runs the state calls for and starts them in priority order.
 * @param {DispatchContext} ctx the context
 * @returns {Promise<DispatchResult>} what started, what waits, and which incidents no run handles
 */
export async function dispatch(ctx) {
    const { state, config, mode, now } = ctx;
    const raise = ctx.raise ?? ((args) => escalate(state, args, { daemon: true }, now));
    /** @type {DispatchResult} */
    const result = { started: [], waiting: [], masterRedUnhandled: [], slotsFull: false };
    if (!state.trust?.login) {
        result.slotsFull = true;
        return result;
    }
    const items = wanted(ctx, raise, result.masterRedUnhandled, result.waiting);
    const refresh = await refreshItem(ctx);
    if (refresh) items.push(refresh);
    items.push(...(ctx.extra ?? []));
    if (!items.some((i) => !i.kind.startsWith("retriage-"))) {
        const backlog = backlogItem(ctx);
        if (backlog) items.push(backlog);
    }
    items.sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));

    // Targets with a run in flight: their follow-up waits for that run to end.
    const busy = new Set(
        Object.values(state.runs ?? {})
            .filter((/** @type {any} */ r) => r.status === "running")
            .flatMap((/** @type {any} */ r) => [r.target, ...(r.batch ?? [])]),
    );
    const held = ctx.holdUntil && now.getTime() < ctx.holdUntil.getTime();
    let stopped = held ? "runs are held after a restart" : null;
    for (const item of items) {
        const targets = [item.target, ...(item.batch ?? [])];
        if (targets.some((t) => busy.has(t))) {
            result.waiting.push({ item, reason: "a run on this target is in flight" });
            continue;
        }
        const admitted = stopped ? null : admit(state, config, mode, item.kind, now);
        if (admitted && !admitted.ok) {
            stopped = /** @type {{reason: string}} */ (admitted).reason;
            result.slotsFull = true;
        }
        if (!admitted?.ok) {
            result.waiting.push({ item, reason: /** @type {string} */ (stopped) });
            if (item.kind === "master-red" && !held) {
                result.masterRedUnhandled.push(/** @type {string} */ (item.incident));
            }
            continue;
        }
        const launched = await ctx.launch(item);
        if (!launched.ok) {
            result.waiting.push({ item, reason: /** @type {{reason: string}} */ (launched).reason });
            if (item.kind === "master-red") result.masterRedUnhandled.push(/** @type {string} */ (item.incident));
            continue;
        }
        for (const t of targets) busy.add(t);
        recordStart(state, item, launched.id, now);
        result.started.push({ item, id: launched.id });
    }
    return result;
}
