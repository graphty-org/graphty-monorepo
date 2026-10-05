/**
 * The status every session and hook reads (design section 11.1): `statusData` builds it as data,
 * `statusText` renders it, `alertBanner` is the PHONE ALERTS BROKEN line that leads every tool
 * result. Pure functions over the daemon's state object.
 *
 * Text that came from outside the owner's control is never shown as-is: PR and issue titles appear
 * only for the owner, the account gh is logged in as (others show number and author).
 */

import * as board from "./board.mjs";
import { GRACE_DAYS } from "./proposals.mjs";
import { jobInUse, jobOrder, ownerWaitingPrs, prInUse, prOf } from "./queue.mjs";

/** Escalation kinds the owner must act on; others are listed as notes. */
const OWNER_KINDS = new Set(["decision", "credential", "visual-review", "approval", "master-red"]);

/** The proposal states status lists. */
const OPEN_PROPOSALS = new Set(["pending", "dry-run", "unconfirmed", "confirmed", "commenting", "commented"]);
const SECTIONS = new Set(["all", "master", "prs", "queue", "sessions", "owner", "proposals", "issues"]);

/**
 * One request's view of the daemon.
 * @typedef {object} ToolContext
 * @property {any} config the normalized config
 * @property {Date} now the current time
 * @property {Date} startedAt when the daemon started
 * @property {string} version the githerd version
 * @property {string} mode the effective mode
 * @property {string | null} [polledAt] when the last poll started
 * @property {string | null} [nextPollAt] when the next poll is due
 */

/**
 * Shortens a commit SHA.
 * @param {string | null | undefined} sha the SHA
 * @returns {string} its first 7 characters, or "?"
 */
function short(sha) {
    return sha ? sha.slice(0, 7) : "?";
}

/**
 * Formats a time as HH:MM UTC.
 * @param {string} iso an ISO time
 * @returns {string} "HH:MM"
 */
function hhmm(iso) {
    return new Date(iso).toISOString().slice(11, 16);
}

/**
 * Formats a time as YYYY-MM-DD HH:MM UTC.
 * @param {string} iso an ISO time
 * @returns {string} the date and time
 */
function dayTime(iso) {
    return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}

/**
 * Formats a span of time briefly.
 * @param {number} ms milliseconds, never negative in practice
 * @returns {string} "40 s", "2 min", "3 h" or "4 d"
 */
function span(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return `${s} s`;
    if (s < 3600) return `${Math.round(s / 60)} min`;
    if (s < 48 * 3600) return `${Math.round(s / 3600)} h`;
    return `${Math.round(s / 86400)} d`;
}

/**
 * The PHONE ALERTS BROKEN banner, or null while the notifier works.
 * @param {any} state the daemon state
 * @returns {string | null} the banner line
 */
export function alertBanner(state) {
    const since = state.notify?.brokenSince;
    if (!since) return null;
    return `PHONE ALERTS BROKEN since ${since}: ${state.notify.lastError ?? "unknown error"}`;
}

/**
 * The master part of status.
 * @param {any} state the daemon state
 * @returns {object} the verdict, the open incident and what is in flight
 */
function masterData(state) {
    const m = state.master ?? {};
    const incident = Object.values(state.incidents ?? {})
        .filter((i) => i.status === "open")
        .sort((a, b) => String(b.openedAt).localeCompare(String(a.openedAt)))[0];
    const inFlight = new Set();
    for (const lane of Object.values(m.lanes ?? {})) {
        for (const run of Object.values(lane.inFlight ?? {})) inFlight.add(run.sha);
    }
    return {
        verdict: m.verdict ?? "unknown",
        since: m.since ?? null,
        headSha: m.headSha ?? null,
        greenSha: m.greenSha ?? null,
        pending: Boolean(m.pending),
        newerInFlight: inFlight.size,
        lastRelease: m.lastRelease ?? null,
        incident: incident
            ? {
                  id: incident.id,
                  lanes: Object.entries(incident.lanes ?? {}).map(([lane, l]) => ({ lane, ...l })),
                  suspects: incident.suspects ?? [],
                  rangeNote: incident.rangeNote ?? null,
                  fixJob:
                      Object.values(state.jobs ?? {}).find(
                          (j) => j.kind === "incident" && j.facts?.scope === "master" && j.holder,
                      )?.id ?? null,
              }
            : null,
        githubDownSince: state.github?.downSince ?? null,
        githubError: state.github?.lastError ?? null,
    };
}

/**
 * One PR as status shows it.
 * @param {string} number the PR number
 * @param {any} pr the PR record
 * @param {boolean} owned the owner wrote it
 * @param {boolean} full include the check list
 * @param {string | null} inUse why another session may not take it now, or null
 * @returns {object} the PR, titled only when the owner wrote it
 */
function prData(number, pr, owned, full, inUse) {
    const out = {
        number: Number(number),
        author: pr.author ?? null,
        ...(owned ? { title: pr.title ?? null } : {}),
        draft: Boolean(pr.draft),
        autoMerge: Boolean(pr.autoMerge),
        stuck: pr.stuck ?? [],
        inUse,
    };
    if (full) {
        // A fork's own workflow names its checks, so another author's PR shows only how many fail.
        const failing = pr.failingChecks ?? [];
        Object.assign(out, {
            headSha: pr.headSha ?? null,
            required: pr.required ?? {},
            ...(owned ? { failingChecks: failing } : { failingCheckCount: failing.length }),
            mergeable: pr.mergeable ?? null,
            breaking: pr.breaking ?? null,
        });
    }
    return out;
}

/**
 * Builds the status answer as data: every title by another author is already dropped, so the text
 * and JSON forms show the same thing.
 * @param {any} state the daemon state
 * @param {ToolContext} ctx the request context
 * @param {{section?: string, pr?: number}} [args] which part to include
 * @returns {Record<string, any>} the status
 */
export function statusData(state, ctx, { section = "all", pr } = {}) {
    if (!SECTIONS.has(section)) throw new Error(`unknown section: ${section}`);
    const { now, startedAt } = ctx;
    const owned = (/** @type {string | null | undefined} */ who) => board.byOwner(state, who);
    const want = (/** @type {string} */ name) => pr === undefined && (section === "all" || section === name);
    // Only a pull request githerd would otherwise offer is "in use"; CI runs on every other one too.
    const queued = new Set(
        Object.values(state.jobs ?? {})
            .filter((/** @type {any} */ j) => j.state === "queued")
            .map((/** @type {any} */ j) => String(prOf(j))),
    );
    const inUse = (/** @type {string} */ n) =>
        queued.has(String(n)) ? prInUse(state, n, { config: ctx.config, now }) : null;
    /** @type {Record<string, any>} */
    const out = {
        banner: alertBanner(state),
        // The invariant check's faults (design 9.5) lead every surface.
        faults: [...(state.invariants?.faults ?? []), ...(state.mergeGate?.checks?.faults ?? [])],
        githerd: {
            version: ctx.version,
            mode: ctx.mode,
            polledAt: ctx.polledAt ?? null,
            nextPollAt: ctx.nextPollAt ?? null,
            api: {
                lastPoll: state.github?.lastPoll ?? null,
                hour: state.rate?.usage?.hour ? apiCounts(state.rate.usage) : null,
                lastHour: state.rate?.usage?.lastHour ?? null,
            },
        },
    };
    if (pr !== undefined) {
        const record = state.prs?.[String(pr)];
        out.prs = record ? [prData(String(pr), record, owned(record.author), true, inUse(String(pr)))] : [];
    }
    if (want("master")) out.master = masterData(state);
    if (want("prs")) {
        out.prs = Object.entries(state.prs ?? {})
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([n, p]) => prData(n, p, owned(p.author), false, inUse(n)));
    }
    if (want("queue")) {
        const order = jobOrder(state.jobs ?? {}, { inUse: (j) => jobInUse(state, j, { config: ctx.config, now }) });
        const inFlight = Object.values(state.jobs ?? {})
            .filter((j) => j.state !== "queued" && !board.TERMINAL.includes(j.state))
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((j) => ({ job: j.id, state: j.state, reason: j.reason ?? "" }));
        out.queue = {
            items: order.items,
            skipped: order.skipped,
            inUse: order.inUse,
            inFlight,
            ownerWaiting: ownerWaitingPrs(state, now),
            invited: state.invited ?? null,
        };
    }
    if (want("sessions")) {
        out.sessions = Object.entries(state.sessions ?? {})
            .filter(([id]) => board.holderAlive(state, id, now, startedAt))
            .map(([id, s]) => ({ id, name: s.name ?? id, branch: s.branch ?? null }));
    }
    if (want("owner")) {
        out.owner = Object.values(state.escalations ?? {})
            .filter((e) => !e.resolvedAt)
            .sort((a, b) => String(a.raisedAt).localeCompare(String(b.raisedAt)))
            .map((e) => ({
                key: e.key,
                kind: e.kind,
                summary: e.summary,
                target: e.target ?? null,
                raisedBy: e.raisedBy,
                raisedAt: e.raisedAt,
            }));
    }
    if (want("proposals")) {
        out.proposals = Object.values(state.proposals ?? {})
            .filter((p) => OPEN_PROPOSALS.has(p.status))
            .map((p) => ({
                id: p.id,
                kind: p.kind,
                target: p.target,
                closeAs: p.closeAs ?? null,
                of: p.of ?? null,
                reason: p.reason ?? p.evidence ?? "",
                graceUntil: p.graceUntil ?? null,
                presentDays: p.presentDays ?? null,
                dryRun: p.dryRun === true,
                status: p.status,
            }));
    }
    if (want("issues")) {
        const issues = Object.values(state.issues?.byNumber ?? {}).filter((i) => i.state !== "closed");
        out.issues = {
            open: issues.length,
            since: state.issues?.since ?? null,
        };
        // What githerd leaves alone because someone other than the owner wrote it.
        out.trust = {
            login: state.trust?.login ?? null,
            error: state.trust?.error ?? null,
            skippedIssues: issues.filter((i) => !owned(i.author)).length,
            skippedPrs: Object.values(state.prs ?? {}).filter((p) => !owned(p.author)).length,
            hiddenComments: Object.values(state.trust?.hidden ?? {}).reduce((sum, n) => sum + n, 0),
        };
    }
    return out;
}

/**
 * Formats a count and its list as ` (n): a; b`, or ` (0)` when the list is empty.
 * @param {string[]} items the entries
 * @returns {string} the counted list
 */
function countedList(items) {
    const list = items.length ? `: ${items.join("; ")}` : "";
    return ` (${items.length})${list}`;
}

/**
 * Renders the red-master lines of status.
 * @param {any} inc the open incident, if any
 * @param {string} since the " since hh:mm UTC" text
 * @returns {string[]} the lines
 */
function redLines(inc, since) {
    const lanes = (inc?.lanes ?? []).map((l) => {
        const jobs = (l.failingJobs ?? []).join(", ");
        return ` ${l.lane} run ${l.runId} failed at ${short(l.sha)} (${jobs}).`;
    });
    const id = inc ? ` (${inc.id})` : "";
    const second = [];
    if (inc?.suspects.length) {
        const list = inc.suspects.map((s) => (s.pr ? `#${s.pr} ` : "") + short(s.sha)).join(", ");
        second.push(`${inc.suspects.length === 1 ? "Suspect" : "Suspects"}: ${list}.`);
    }
    if (inc?.rangeNote) second.push(`No code suspects: ${inc.rangeNote}.`);
    if (inc?.fixJob) second.push(`Incident job ${inc.fixJob} at work.`);
    second.push("Hold merges; pushes to pull request branches are fine.");
    return [`MASTER: RED${since}${id}.${lanes.join("")}`, `  ${second.join(" ")}`];
}

/**
 * Renders the verification line of the master part of status.
 * @param {any} m the master data
 * @param {Date} now the current time
 * @returns {string[]} the sentences
 */
function verifiedSentences(m, now) {
    const out = [];
    if (m.greenSha) out.push(`Verified green: ${short(m.greenSha)}.`);
    if (m.pending && m.newerInFlight > 0) {
        const plural = m.newerInFlight === 1 ? "" : "s";
        out.push(`CI in flight on ${m.newerInFlight} newer commit${plural}.`);
    } else if (m.pending) {
        out.push("Newer commits not yet verified.");
    }
    if (m.lastRelease) {
        const age = span(now.getTime() - Date.parse(m.lastRelease.at));
        out.push(`Last release ${short(m.lastRelease.sha)}, ${age} ago.`);
    }
    return out;
}

/**
 * Renders the master part of status.
 * @param {any} m the master data
 * @param {Date} now the current time
 * @returns {string[]} the lines
 */
function masterLines(m, now) {
    const since = m.since ? ` since ${hhmm(m.since)} UTC` : "";
    const lines = [];
    if (m.verdict === "red") lines.push(...redLines(m.incident, since));
    else if (m.verdict === "green") lines.push(`MASTER: green${since}.`);
    else lines.push("MASTER: unknown (no complete poll yet).");
    const third = verifiedSentences(m, now);
    if (third.length) lines.push(`  ${third.join(" ")}`);
    if (m.githubDownSince) {
        const why = m.githubError ? ` (${m.githubError})` : "";
        lines.push(`GITHUB: unreachable since ${hhmm(m.githubDownSince)} UTC${why}`);
    }
    return lines;
}

/**
 * Renders one PR line.
 * @param {any} p the PR data
 * @returns {string} the line
 */
function prLine(p) {
    const name = p.title === undefined ? `(author: ${p.author})` : p.title;
    const why = p.stuck.length ? p.stuck.join("; ") : "no blockers";
    const used = p.inUse ? ` [in use: ${p.inUse}]` : "";
    return `  #${p.number} ${name} -- ${why}${p.autoMerge ? " [auto-merge on]" : ""}${used}`;
}

/**
 * Renders the PR part of status.
 * @param {any[]} prs the PR data
 * @returns {string[]} the lines
 */
function prLines(prs) {
    const lines = [`PRS (${prs.length}):`];
    for (const p of prs) {
        lines.push(prLine(p));
        if (!p.required) continue;
        const req = Object.entries(p.required).map(([k, v]) => `${k}: ${v}`);
        lines.push(`    required: ${req.length ? req.join(", ") : "none reported"}`);
        if (p.failingChecks?.length) lines.push(`    failing: ${p.failingChecks.join(", ")}`);
        if (p.failingCheckCount) lines.push(`    failing: ${p.failingCheckCount} (names hidden: another author)`);
    }
    return lines;
}

/**
 * Renders the queue part of status: the queued jobs in order, the jobs in flight, and the pull
 * requests that wait on the owner.
 * @param {{items: {job: string, reason: string}[], skipped: {job: string, reason: string}[],
 *   inUse?: {job: string, reason: string}[],
 *   inFlight: {job: string, state: string, reason: string}[], ownerWaiting: {target: string, reason: string}[],
 *   invited?: {at: string, count: number, acting: boolean} | null}} queue the queue data, with the last
 *   invitation of idle sessions
 * @returns {string[]} the lines
 */
function queueLines({ items, skipped, inUse = [], inFlight, ownerWaiting, invited = null }) {
    const lines = [`QUEUE (${items.length})${items.length ? ":" : ": nothing to do"}`];
    for (const i of items) lines.push(`  ${i.job} -- ${i.reason}`);
    if (invited) {
        const did = invited.acting ? "invited" : "would have invited";
        lines.push(`  ${did} ${invited.count} idle sessions at ${String(invited.at).slice(11, 16)} UTC`);
    }
    for (const i of skipped) lines.push(`  ${i.job} -- skipped: ${i.reason}`);
    for (const i of inUse) lines.push(`  ${i.job} -- in use: ${i.reason}`);
    if (inFlight.length) {
        const jobs = inFlight.map((j) => (j.reason ? `${j.job} ${j.state} (${j.reason})` : `${j.job} ${j.state}`));
        lines.push(`IN FLIGHT${countedList(jobs)}`);
    }
    if (ownerWaiting.length) {
        const list = ownerWaiting.map(
            (i) => `${i.target.replace("pr:", "#")} ${i.reason.replace("waiting on owner: ", "")}`,
        );
        lines.push(`PRS WAITING ON OWNER (${ownerWaiting.length}): ${list.join("; ")}`);
    }
    return lines;
}

/**
 * Renders the sessions part of status.
 * @param {any[]} sessions the live sessions
 * @returns {string} the line
 */
function sessionLine(sessions) {
    const named = sessions.map((s) => `${s.name} (${s.branch ?? "no branch"})`);
    return `SESSIONS: ${named.length ? named.join(", ") : "none"}`;
}

/**
 * Renders one close proposal of the two-session kind (proposals.mjs).
 * @param {any} p the proposal
 * @returns {string} the entry
 */
function closeEntry(p) {
    const of = p.of ? ` of #${p.of}` : "";
    const reason = p.reason ? `: ${p.reason}` : "";
    const what = `close ${p.target.replace(/^(issue|pr):/, "#")} (${p.kind}${of}${reason})`;
    const grace = GRACE_DAYS[/** @type {"issue" | "pr"} */ (p.target.split(":")[0])];
    /** @type {Record<string, string>} */
    const when = {
        unconfirmed: "waits for a second session to agree",
        confirmed: "the proposal comment is next",
        commenting: "the proposal comment is going out",
        commented: `${p.presentDays ?? 0} of ${grace} owner-present days of grace, unless vetoed`,
    };
    return `${what} -- ${when[p.status]}${p.dryRun ? " (dry-run)" : ""}`;
}

/**
 * Renders one proposal of status.
 * @param {any} p the proposal
 * @returns {string} the entry
 */
function proposalEntry(p) {
    if (p.kind !== "revert" && p.kind !== "close-issue") return closeEntry(p);
    const revert = p.kind === "revert";
    const what = `${revert ? "revert" : "close"} ${p.target.replace(/^(issue|pr):/, "#")}`;
    let whenText = "grace starts when the owner is shown it";
    if (p.status === "dry-run") whenText = "dry-run, nothing will happen";
    else if (p.graceUntil) whenText = `${revert ? "reverts" : "closes"} ${dayTime(p.graceUntil)} unless vetoed`;
    return `${what} (${p.reason}) -- ${whenText}`;
}

/**
 * One hour's or one poll's GitHub calls, by what they cost.
 * @param {any} u a usage record
 * @returns {{hour?: string, core: number, notModified: number, graphql: number, search: number}} the counts
 */
function apiCounts(u) {
    return { hour: u.hour, core: u.core, notModified: u.notModified, graphql: u.graphql, search: u.search };
}

/**
 * Renders what githerd's own GitHub calls cost: the last poll, this UTC hour and the hour before.
 * A 304 is free; core, GraphQL and search each spend their own hourly budget.
 * @param {any} api the api data
 * @returns {string | null} the line, or null before the first call
 */
function apiLine(api) {
    if (!api?.lastPoll && !api?.hour) return null;
    const words = (/** @type {any} */ c) => {
        const search = c.search ? `, ${c.search} search` : "";
        return `${c.core} core, ${c.notModified} not modified (304, free), ${c.graphql} GraphQL${search}`;
    };
    const parts = [];
    if (api.lastPoll) parts.push(`last poll ${words(api.lastPoll)}`);
    if (api.hour) parts.push(`hour ${api.hour.hour.slice(11)}:00 UTC so far ${words(api.hour)}`);
    if (api.lastHour) parts.push(`hour ${api.lastHour.hour.slice(11)}:00 UTC ${words(api.lastHour)}`);
    return `API: ${parts.join("; ")}`;
}

/**
 * Renders the trust part of status.
 * @param {any} t the trust data
 * @returns {string} the line
 */
function trustLine(t) {
    const why = t.error ? ` (${t.error})` : "";
    const who = t.login ? `acting only on ${t.login}'s issues and PRs` : `login unresolved, no workers start${why}`;
    return `TRUST: ${who}; skipped ${t.skippedIssues} open issues and ${t.skippedPrs} PRs by other authors; hid ${t.hiddenComments} comments by other authors from workers`;
}

/**
 * Renders status data as text.
 * @param {Record<string, any>} data from statusData
 * @param {Date} now the current time
 * @returns {string} the status text
 */
export function statusText(data, now) {
    const g = data.githerd;
    const polled = g.polledAt ? `polled ${span(now.getTime() - Date.parse(g.polledAt))} ago` : "not polled yet";
    const next = g.nextPollAt ? `, next in ${span(Date.parse(g.nextPollAt) - now.getTime())}` : "";
    const lines = [`githerd ${g.version} (${g.mode}) -- ${polled}${next}`];
    const api = apiLine(g.api);
    if (api) lines.push(api);
    for (const f of data.faults ?? []) lines.push(`FAULT ${f.record}: ${f.problem}`);
    if (data.master) lines.push(...masterLines(data.master, now));
    if (data.prs) lines.push(...prLines(data.prs));
    if (data.queue) lines.push(...queueLines(data.queue));
    if (data.sessions) lines.push(sessionLine(data.sessions));
    if (data.owner) {
        const items = data.owner.map((e) => (OWNER_KINDS.has(e.kind) ? e.summary : `${e.kind}: ${e.summary}`));
        lines.push(`WAITING ON OWNER${countedList(items)}`);
    }
    if (data.proposals) lines.push(`PROPOSALS${countedList(data.proposals.map(proposalEntry))}`);
    if (data.issues) {
        const i = data.issues;
        const since = i.since ? `, polled since ${i.since}` : "";
        lines.push(`ISSUES: ${i.open} open${since}`);
    }
    if (data.trust) lines.push(trustLine(data.trust));
    return lines.join("\n");
}
