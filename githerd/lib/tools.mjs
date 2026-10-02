/**
 * The six tools every session gets (design section 7.1): githerd_status, githerd_claim,
 * githerd_release, githerd_report, githerd_escalate and githerd_resolve.
 *
 * They are pure functions over the daemon's state object. `sessionTools(ctx)` returns MCP tools
 * bound to one request's context; the write tools change `ctx.state` in place through
 * `board.mjs` and hand a ledger entry to `ctx.commit`, which persists the state before the reply.
 *
 * Text that came from outside the owner's control is never shown as-is: PR and issue titles appear
 * only for `trustedAuthors` (others show number and author), and text a judgment run wrote is
 * prefixed `[run text]` so a reader treats it as data. While phone alerts are broken, every tool
 * result starts with the PHONE ALERTS BROKEN banner.
 */

import * as board from "./board.mjs";
import { assertAscii } from "./text.mjs";

/** The prefix on text a judgment run wrote. */
export const RUN_TEXT = "[run text]";

/** Escalation kinds the owner must act on; others are listed as notes. */
const OWNER_KINDS = new Set(["decision", "credential", "visual-review", "approval", "master-red"]);

const SECTIONS = ["all", "master", "prs", "claims", "owner", "proposals", "runs", "issues"];

/**
 * One request's view of the daemon.
 * @typedef {object} ToolContext
 * @property {any} state the daemon state; the write tools change it in place
 * @property {any} config the normalized config
 * @property {import("./board.mjs").Caller} caller who is calling
 * @property {Date} now the current time
 * @property {Date} startedAt when the daemon started
 * @property {string} version the githerd version
 * @property {string} mode the effective mode
 * @property {string | null} [polledAt] when the last poll started
 * @property {string | null} [nextPollAt] when the next poll is due
 * @property {(entry: object) => void | Promise<void>} [commit] persists the state and appends the
 *   ledger entry; awaited before the reply
 */

/**
 * Whether a holder or author id names a judgment run.
 * @param {string | null | undefined} id a holder, a session or a `raisedBy`
 * @returns {boolean} it is a run id
 */
function isRun(id) {
    return typeof id === "string" && id.startsWith("run-");
}

/**
 * Marks text a run wrote.
 * @param {string | null | undefined} text the text
 * @param {string | null | undefined} by who wrote it
 * @returns {string | null} the text, prefixed when a run wrote it
 */
function marked(text, by) {
    if (text === null || text === undefined) return null;
    return isRun(by) ? `${RUN_TEXT} ${text}` : text;
}

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
    const fixRun = Object.entries(state.runs ?? {}).find(
        ([, r]) => r.status === "running" && r.target === "master",
    )?.[0];
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
                  fixRun: fixRun ?? null,
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
 * @param {Set<string>} trusted the trusted authors
 * @param {boolean} full include the check list
 * @returns {object} the PR, titled only when its author is trusted
 */
function prData(number, pr, trusted, full) {
    const out = {
        number: Number(number),
        author: pr.author ?? null,
        ...(trusted.has(pr.author) ? { title: pr.title ?? null } : {}),
        draft: Boolean(pr.draft),
        autoMerge: Boolean(pr.autoMerge),
        stuck: pr.stuck ?? [],
    };
    if (full) {
        Object.assign(out, {
            headSha: pr.headSha ?? null,
            required: pr.required ?? {},
            failingChecks: pr.failingChecks ?? [],
            mergeable: pr.mergeable ?? null,
            breaking: pr.breaking ?? null,
        });
    }
    return out;
}

/**
 * Builds the status answer as data: every untrusted title is already dropped and every run-written
 * string already marked, so the text and JSON forms show the same thing.
 * @param {any} state the daemon state
 * @param {ToolContext} ctx the request context
 * @param {{section?: string, pr?: number}} [args] which part to include
 * @returns {Record<string, any>} the status
 */
export function statusData(state, ctx, { section = "all", pr } = {}) {
    if (!SECTIONS.includes(section)) throw new Error(`unknown section: ${section}`);
    const { config, now, startedAt } = ctx;
    const trusted = new Set(config.trustedAuthors ?? []);
    const want = (/** @type {string} */ name) => pr === undefined && (section === "all" || section === name);
    /** @type {Record<string, any>} */
    const out = {
        banner: alertBanner(state),
        githerd: {
            version: ctx.version,
            mode: ctx.mode,
            polledAt: ctx.polledAt ?? null,
            nextPollAt: ctx.nextPollAt ?? null,
        },
    };
    if (pr !== undefined) {
        const record = state.prs?.[String(pr)];
        out.prs = record ? [prData(String(pr), record, trusted, true)] : [];
    }
    if (want("master")) out.master = masterData(state);
    if (want("prs")) {
        out.prs = Object.entries(state.prs ?? {})
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([n, p]) => prData(n, p, trusted, false));
    }
    if (want("claims")) {
        out.claims = Object.values(state.claims ?? {})
            .filter((c) => Date.parse(c.expiresAt) > now.getTime())
            .map((c) => ({
                target: c.target,
                holder: c.holder,
                holderName: c.holderName ?? null,
                purpose: marked(c.purpose, c.holder),
                expiresAt: c.expiresAt,
                fixPr: c.fixPr ?? null,
            }));
        out.sessions = Object.entries(state.sessions ?? {})
            .filter(([id]) => board.holderAlive(state, id, now, startedAt))
            .map(([id, s]) => ({
                id,
                name: s.name ?? id,
                branch: s.branch ?? null,
                doing: s.doing ?? null,
                targets: s.targets ?? [],
            }));
    }
    if (want("owner")) {
        out.owner = Object.values(state.escalations ?? {})
            .filter((e) => !e.resolvedAt)
            .sort((a, b) => String(a.raisedAt).localeCompare(String(b.raisedAt)))
            .map((e) => ({
                key: e.key,
                kind: e.kind,
                summary: marked(e.summary, e.raisedBy),
                target: e.target ?? null,
                raisedBy: e.raisedBy,
                raisedAt: e.raisedAt,
            }));
    }
    if (want("proposals")) {
        out.proposals = Object.values(state.proposals ?? {})
            .filter((p) => p.status === "pending" || p.status === "dry-run")
            .map((p) => ({
                id: p.id,
                kind: p.kind,
                target: p.target,
                closeAs: p.closeAs ?? null,
                reason: marked(p.reason, p.proposedBy),
                graceUntil: p.graceUntil ?? null,
                status: p.status,
            }));
    }
    if (want("runs")) {
        const today = now.toISOString().slice(0, 10);
        const runs = Object.entries(state.runs ?? {});
        out.runs = {
            today: runs.filter(([, r]) => String(r.startedAt ?? "").startsWith(today)).length,
            spendUsd: state.spend?.[today] ?? 0,
            budgetUsd: ctx.mode === "acting" ? config.runs?.dailyBudgetUsd : config.runs?.dryRunDailyBudgetUsd,
            running: runs
                .filter(([, r]) => r.status === "running")
                .map(([id, r]) => ({ id, kind: r.kind ?? null, target: r.target ?? null })),
        };
    }
    if (want("issues")) {
        const issues = Object.values(state.issues?.byNumber ?? {}).filter((i) => i.state !== "closed");
        out.issues = {
            open: issues.length,
            untrusted: issues.filter((i) => !trusted.has(i.author)).length,
            since: state.issues?.since ?? null,
        };
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
    if (m.verdict === "red") {
        const inc = m.incident;
        const lanes = (inc?.lanes ?? []).map(
            (l) => ` ${l.lane} run ${l.runId} failed at ${short(l.sha)} (${(l.failingJobs ?? []).join(", ")}).`,
        );
        lines.push(`MASTER: RED${since}${inc ? ` (${inc.id})` : ""}.${lanes.join("")}`);
        const second = [];
        if (inc?.suspects.length) {
            const list = inc.suspects.map((s) => `${s.pr ? `#${s.pr} ` : ""}${short(s.sha)}`).join(", ");
            second.push(`${inc.suspects.length === 1 ? "Suspect" : "Suspects"}: ${list}.`);
        }
        if (inc?.fixRun) second.push(`Fix run ${inc.fixRun} in progress.`);
        second.push("Hold pushes and merges.");
        lines.push(`  ${second.join(" ")}`);
    } else if (m.verdict === "green") {
        lines.push(`MASTER: green${since}.`);
    } else {
        lines.push("MASTER: unknown (no complete poll yet).");
    }
    const third = [];
    if (m.greenSha) third.push(`Verified green: ${short(m.greenSha)}.`);
    if (m.pending) {
        third.push(
            m.newerInFlight > 0
                ? `CI in flight on ${m.newerInFlight} newer commit${m.newerInFlight === 1 ? "" : "s"}.`
                : "Newer commits not yet verified.",
        );
    }
    if (m.lastRelease) {
        third.push(
            `Last release ${short(m.lastRelease.sha)}, ${span(now.getTime() - Date.parse(m.lastRelease.at))} ago.`,
        );
    }
    if (third.length) lines.push(`  ${third.join(" ")}`);
    if (m.githubDownSince) {
        lines.push(
            `GITHUB: unreachable since ${hhmm(m.githubDownSince)} UTC${m.githubError ? ` (${m.githubError})` : ""}`,
        );
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
    return `  #${p.number} ${name} -- ${why}${p.autoMerge ? " [auto-merge on]" : ""}`;
}

/**
 * Renders status data as text.
 * @param {Record<string, any>} data from statusData
 * @param {Date} now the current time
 * @returns {string} the status text
 */
function statusText(data, now) {
    const g = data.githerd;
    const polled = g.polledAt ? `polled ${span(now.getTime() - Date.parse(g.polledAt))} ago` : "not polled yet";
    const next = g.nextPollAt ? `, next in ${span(Date.parse(g.nextPollAt) - now.getTime())}` : "";
    const lines = [`githerd ${g.version} (${g.mode}) -- ${polled}${next}`];
    if (data.master) lines.push(...masterLines(data.master, now));
    if (data.prs) {
        lines.push(`PRS (${data.prs.length}):`);
        for (const p of data.prs) {
            lines.push(prLine(p));
            if (p.required) {
                const req = Object.entries(p.required).map(([k, v]) => `${k}: ${v}`);
                lines.push(`    required: ${req.length ? req.join(", ") : "none reported"}`);
                if (p.failingChecks.length) lines.push(`    failing: ${p.failingChecks.join(", ")}`);
            }
        }
    }
    if (data.claims) {
        const claims = data.claims.map(
            (c) => `${c.target} -> ${c.holderName ?? c.holder} (until ${hhmm(c.expiresAt)})`,
        );
        lines.push(`CLAIMS: ${claims.length ? claims.join("; ") : "none"}`);
        const sessions = data.sessions.map((s) => {
            const bits = [s.branch ?? "no branch", ...(s.doing ? [`"${s.doing}"`] : [])];
            return `${s.name} (${bits.join(", ")})`;
        });
        lines.push(`SESSIONS: ${sessions.length ? sessions.join(", ") : "none"}`);
    }
    if (data.owner) {
        const items = data.owner.map((e) => (OWNER_KINDS.has(e.kind) ? e.summary : `${e.kind}: ${e.summary}`));
        lines.push(`WAITING ON OWNER (${items.length})${items.length ? `: ${items.join("; ")}` : ""}`);
    }
    if (data.proposals) {
        const items = data.proposals.map((p) => {
            const what = `${p.kind === "revert" ? "revert" : "close"} ${p.target.replace(/^(issue|pr):/, "#")}`;
            const when =
                p.status === "dry-run"
                    ? "dry-run, nothing will happen"
                    : p.graceUntil
                      ? `${p.kind === "revert" ? "reverts" : "closes"} ${dayTime(p.graceUntil)} unless vetoed`
                      : "grace starts when the owner is shown it";
            return `${what} (${p.reason}) -- ${when}`;
        });
        lines.push(`PROPOSALS (${items.length})${items.length ? `: ${items.join("; ")}` : ""}`);
    }
    if (data.runs) {
        const r = data.runs;
        const running = r.running.map((x) => `${x.id} (${[x.kind, x.target].filter(Boolean).join(" ")})`);
        lines.push(
            `RUNS TODAY: ${r.today} ($${r.spendUsd.toFixed(2)} of $${r.budgetUsd})${running.length ? `; running: ${running.join(", ")}` : ""}`,
        );
    }
    if (data.issues) {
        const i = data.issues;
        lines.push(
            `ISSUES: ${i.open} open (${i.untrusted} by untrusted authors)${i.since ? `, polled since ${i.since}` : ""}`,
        );
    }
    return lines.join("\n");
}

/**
 * Formats a claim answer from board.mjs as the tool's JSON text.
 * @param {any} result the board answer
 * @returns {import("./mcp.mjs").ToolResult} the result
 */
function claimResult(result) {
    if (!result.ok && "error" in result) return { text: result.error, isError: true };
    return { text: JSON.stringify(result) };
}

/**
 * Builds the six session tools bound to one request.
 * @param {ToolContext} ctx the request context
 * @returns {import("./mcp.mjs").Tool[]} the tools
 */
export function sessionTools(ctx) {
    const { state, caller, now, startedAt } = ctx;

    /**
     * Wraps a tool body: refreshes the session's heartbeat, persists a change before replying, and
     * puts the alert banner first.
     * @param {(args: any) => {result: string | import("./mcp.mjs").ToolResult, entry?: object, bare?: boolean}} body
     *   the tool; `bare` leaves the banner off a result that carries it as a field
     * @returns {(args: any) => Promise<import("./mcp.mjs").ToolResult>} the handler
     */
    const handler = (body) => async (args) => {
        if (caller.session) board.heartbeat(state, { session: caller.session }, now);
        const { result, entry, bare } = body(args);
        if (entry && ctx.commit) await ctx.commit({ ts: now.toISOString(), ...entry });
        const out = typeof result === "string" ? { text: result } : result;
        const banner = alertBanner(state);
        return banner && !bare ? { ...out, text: `${banner}\n${out.text}` } : out;
    };
    const by = caller.run ?? caller.session ?? "daemon";
    const untrusted = isRun(by) ? { untrusted: true } : {};

    return [
        {
            name: "githerd_status",
            description:
                "Master state and since when, the PR queue with why each PR is stuck, claims, sessions, the owner's list, pending proposals, runs and spend.",
            inputSchema: {
                type: "object",
                properties: {
                    section: { type: "string", enum: SECTIONS, default: "all" },
                    pr: {
                        type: "integer",
                        minimum: 1,
                        description: "Only this pull request, with its full check list.",
                    },
                    format: { type: "string", enum: ["text", "json"], default: "text" },
                },
                additionalProperties: false,
            },
            handler: handler((args) => {
                const { banner, ...data } = statusData(state, ctx, args);
                if (args.format === "json") return { result: JSON.stringify({ banner, ...data }, null, 2), bare: true };
                return { result: statusText(data, now) };
            }),
        },
        {
            name: "githerd_claim",
            description:
                "Claim a target before working on it, so other sessions keep off. Claiming your own target again renews it. Returns {ok:true, claim} or {ok:false, heldBy, holderName, purpose, expiresAt}.",
            inputSchema: {
                type: "object",
                required: ["target", "purpose"],
                properties: {
                    target: {
                        type: "string",
                        pattern:
                            "^(pr:[0-9]+|issue:[0-9]+|master|branch:[A-Za-z0-9._/-]+|path:[A-Za-z0-9._/-]+|task:[a-z0-9-]{3,60})$",
                    },
                    purpose: { type: "string", maxLength: 200 },
                    ttlMinutes: { type: "integer", minimum: 5, maximum: 480, default: 120 },
                    holderName: {
                        type: "string",
                        maxLength: 80,
                        description: "Your ListAgents name, so others can message you.",
                    },
                    fixPr: {
                        type: "integer",
                        minimum: 1,
                        description:
                            "With target master: the PR that fixes master. It is exempt from the red-master hold. Sessions only.",
                    },
                },
                additionalProperties: false,
            },
            handler: handler((args) => {
                const result = board.claim(state, args, caller, now, startedAt);
                return {
                    result: claimResult(result),
                    entry: result.ok
                        ? {
                              kind: "claim",
                              target: args.target,
                              holder: by,
                              purpose: args.purpose,
                              renewed: result.renewed,
                              ...untrusted,
                          }
                        : undefined,
                };
            }),
        },
        {
            name: "githerd_release",
            description:
                "End a claim. Only the holder can release it, except that anyone can release a claim whose holder session is gone.",
            inputSchema: {
                type: "object",
                required: ["target"],
                properties: {
                    target: { type: "string", maxLength: 200 },
                    outcome: { type: "string", enum: ["done", "abandoned", "handed-off"] },
                    note: { type: "string", maxLength: 500 },
                },
                additionalProperties: false,
            },
            handler: handler((args) => {
                const result = board.release(state, args, caller, now, startedAt);
                if ("error" in result) return { result: { text: result.error, isError: true } };
                return {
                    result: `released ${args.target} (${result.outcome})`,
                    entry: {
                        kind: "release",
                        target: args.target,
                        holder: result.claim.holder,
                        by,
                        outcome: result.outcome,
                        note: args.note ?? null,
                        ...untrusted,
                    },
                };
            }),
        },
        {
            name: "githerd_report",
            description: "Say what this session is doing; shown under SESSIONS in githerd_status.",
            inputSchema: {
                type: "object",
                required: ["doing"],
                properties: {
                    doing: { type: "string", maxLength: 200 },
                    targets: { type: "array", maxItems: 10, items: { type: "string", maxLength: 100 } },
                    pr: { type: "integer", minimum: 1 },
                },
                additionalProperties: false,
            },
            handler: handler((args) => {
                const result = board.report(state, args, caller, now);
                if ("error" in result) return { result: { text: result.error, isError: true } };
                return {
                    result: `recorded: ${args.doing}`,
                    entry: { kind: "report", session: caller.session, doing: args.doing, targets: args.targets ?? [] },
                };
            }),
        },
        {
            name: "githerd_escalate",
            description:
                "Put a question or a blocker on the owner's list. Raising the same key again is a no-op. From an interactive session it is recorded and never pages the phone: end your reply with an ACTION NEEDED: line if the owner must act.",
            inputSchema: {
                type: "object",
                required: ["key", "kind", "summary"],
                properties: {
                    key: {
                        type: "string",
                        pattern: "^[a-z0-9:._/-]{3,120}$",
                        description: "Stable id; raising the same key again is a no-op.",
                    },
                    kind: {
                        type: "string",
                        enum: ["decision", "credential", "visual-review", "approval", "blocked", "other"],
                    },
                    summary: {
                        type: "string",
                        maxLength: 140,
                        description: "What the owner must do, actionable from a phone.",
                    },
                    detail: { type: "string", maxLength: 4000 },
                    target: { type: "string", maxLength: 100 },
                },
                additionalProperties: false,
            },
            handler: handler((args) => {
                // A run's escalation can reach the phone, which takes plain ASCII only.
                assertAscii(args.summary, "summary");
                const result = board.escalate(state, args, caller, now);
                if (result.existing) return { result: `already on the owner's list: ${args.key}` };
                const pages = caller.session ? " (recorded; escalations from a session never page)" : "";
                return {
                    result: `on the owner's list: ${args.key}${pages}`,
                    entry: {
                        kind: "escalation",
                        key: args.key,
                        escalationKind: args.kind,
                        summary: args.summary,
                        raisedBy: by,
                        ...untrusted,
                    },
                };
            }),
        },
        {
            name: "githerd_resolve",
            description: "Clear an escalation from the owner's list.",
            inputSchema: {
                type: "object",
                required: ["key"],
                properties: { key: { type: "string", pattern: "^[a-z0-9:._/-]{3,120}$" } },
                additionalProperties: false,
            },
            handler: handler((args) => {
                const result = board.resolve(state, args, now);
                if ("error" in result) return { result: { text: result.error, isError: true } };
                return {
                    result: `resolved ${args.key}`,
                    entry: { kind: "escalation", key: args.key, resolved: true, by },
                };
            }),
        },
    ];
}
