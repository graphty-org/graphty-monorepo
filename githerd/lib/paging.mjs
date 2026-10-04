/**
 * The paging policy (design section 5.5): which events page the owner's phone, at which status,
 * and under which notifier key. `pagesFor` is pure; the daemon hands each page to the notifier,
 * whose per-key marks make every page go out at most once.
 *
 * Events:
 * - `{type: "master-red-confirmed", incident, runStarting?, restartedSince?}`: pages `waiting` at
 *   once unless a run is starting for the incident and runs are on (`runs.maxConcurrent > 0`). The
 *   dispatcher passes `runStarting: false` when the incident's run limit is spent or the day's
 *   budget cannot fit a master-red run. `restartedSince` (the red run's time, set when the daemon
 *   started on empty state after that run) pages "githerd restarted, master is red since" instead,
 *   under the same key.
 * - `{type: "state-reset", at, summary}`: `error` once, when state.json and its backup were both
 *   unreadable and the daemon started empty.
 * - `{type: "master-red-run-ended", incident, fixed}`: pages `waiting` when the run ended without
 *   a fix.
 * - `{type: "poll", now}`: pages `error` once for each open incident confirmed 2 hours ago or more.
 * - `{type: "master-recovered", incident}`: `info` "master green again", only if a master-red page
 *   went out for that incident.
 * - `{type: "escalations-raised", keys}`: the escalations raised in one poll. `decision`,
 *   `credential` and `approval` page `waiting` one each; `visual-review` pages one batched
 *   `waiting` alert; every other kind never pages, and neither does an escalation raised by an
 *   interactive session (its own `ACTION NEEDED:` line pages the owner).
 * - `{type: "revert-proposed", proposal}`: `waiting` at once with the veto command.
 * - `{type: "daily", date}`: the `info` alive notice, and an `info` notice of new close proposals.
 * - `{type: "digest-written", week}`: an `info` notice.
 *
 * Master-red, recovered and revert pages bypass the hourly cap.
 */

/** How old a confirmed incident is when it pages `error`. */
const ERROR_AFTER_MS = 2 * 60 * 60 * 1000;

/** Escalation kinds that page `waiting`, one page each. */
const PAGING_KINDS = new Set(["decision", "credential", "approval"]);

/** @typedef {import("./notify.mjs").Page} Page */

/**
 * Describes an incident's failing lanes for a message.
 * @param {any} incident the incident record
 * @returns {string} for example "ci (Build, Lint) at abc123456"
 */
function describe(incident) {
    const lanes = Object.entries(incident.lanes ?? {}).map(([lane, l]) =>
        l.failingJobs?.length ? `${lane} (${l.failingJobs.join(", ")})` : lane,
    );
    const where = incident.redSha ? ` at ${incident.redSha.slice(0, 9)}` : "";
    return `${lanes.join(", ") || "a gating lane"}${where}`;
}

/**
 * The waiting page for a red master.
 * @param {string} id the incident id
 * @param {any} incident the incident record
 * @param {string} [why] what makes it the owner's
 * @returns {Page} the page
 */
function masterRed(id, incident, why) {
    const tail = why ? `; ${why}` : "";
    return {
        key: `master-red:${id}`,
        status: "waiting",
        message: `master red: ${describe(incident)}${tail}`,
        bypass: true,
    };
}

/**
 * Whether an escalation was raised by the daemon or a run rather than an interactive session.
 * @param {any} esc the escalation record
 * @returns {boolean} true when it may page
 */
function raisedByGitherd(esc) {
    return esc.raisedBy === "daemon" || String(esc.raisedBy).startsWith("run-");
}

/**
 * The pages one event calls for.
 * @param {{type: string} & Record<string, any>} event the event
 * @param {any} state the daemon state
 * @param {import("./config.mjs").Config} config the normalized config
 * @returns {Page[]} the pages, possibly none
 */
export function pagesFor(event, state, config) {
    const incidents = state.incidents ?? {};
    switch (event.type) {
        case "master-red-confirmed": {
            if (event.restartedSince) {
                const inc = incidents[event.incident] ?? {};
                return [
                    {
                        ...masterRed(event.incident, inc),
                        message: `githerd restarted, master is red since ${event.restartedSince.slice(0, 16)} UTC: ${describe(inc)}`,
                    },
                ];
            }
            const runsOn = config.runs.maxConcurrent > 0;
            if (runsOn && event.runStarting) return [];
            return [masterRed(event.incident, incidents[event.incident] ?? {}, "no fix run will handle it")];
        }
        case "master-red-run-ended":
            if (event.fixed) return [];
            return [masterRed(event.incident, incidents[event.incident] ?? {}, "the fix run ended without a fix")];
        case "poll": {
            const now = new Date(event.now).getTime();
            return Object.entries(incidents)
                .filter(([, inc]) => inc.status === "open")
                .filter(([, inc]) => now - Date.parse(inc.confirmedAt ?? inc.openedAt) >= ERROR_AFTER_MS)
                .map(([id, inc]) => ({
                    key: `master-red-error:${id}`,
                    status: "error",
                    message: `master still red after 2 hours: ${describe(inc)}`,
                    bypass: true,
                }));
        }
        case "master-recovered": {
            const id = event.incident;
            const notified = state.notified ?? {};
            if (!notified[`master-red:${id}`] && !notified[`master-red-error:${id}`]) return [];
            return [{ key: `recovered:${id}`, status: "info", message: `master green again (${id})`, bypass: true }];
        }
        case "escalations-raised":
            return escalationPages(event.keys, state);
        case "revert-proposed": {
            const p = state.proposals?.[event.proposal] ?? {};
            const what = String(p.target ?? "the suspect").replace(/^pr:/, "#");
            return [
                {
                    key: `revert:${event.proposal}`,
                    status: "waiting",
                    message: `master red: revert ${what} in ${config.grace.revertMinutes} min unless you run githerd veto ${event.proposal} or comment on the incident issue`,
                    bypass: true,
                },
            ];
        }
        case "daily":
            return dailyPages(event.date, state);
        case "state-reset":
            return [{ key: `state-reset:${event.at}`, status: "error", message: event.summary }];
        case "digest-written":
            return [
                {
                    key: `digest:${event.week}`,
                    status: "info",
                    message: `githerd weekly digest ${event.week} is in .githerd/digests/${event.week}.md`,
                },
            ];
        default:
            return [];
    }
}

/**
 * Pages for the escalations raised in one poll.
 * @param {string[]} keys the escalation keys
 * @param {any} state the daemon state
 * @returns {Page[]} the pages
 */
function escalationPages(keys, state) {
    const open = keys
        .map((key) => state.escalations?.[key])
        .filter((esc) => esc && !esc.resolvedAt && !esc.paged && raisedByGitherd(esc));
    /** @type {Page[]} */
    const pages = open
        .filter((esc) => PAGING_KINDS.has(esc.kind))
        .map((esc) => ({ key: `escalation:${esc.key}`, status: "waiting", message: esc.summary }));
    const visual = open.filter((esc) => esc.kind === "visual-review");
    if (visual.length === 1) {
        pages.push({ key: `escalation:${visual[0].key}`, status: "waiting", message: visual[0].summary });
    } else if (visual.length > 1) {
        const targets = visual.map((esc) => String(esc.target).replace(/^pr:/, "#")).join(", ");
        pages.push({
            key: `escalation:${visual
                .map((esc) => esc.key)
                .sort((a, b) => a.localeCompare(b))
                .join("+")}`,
            status: "waiting",
            message: `${visual.length} PRs await visual review (${targets}): ${visual[0].summary}`,
        });
    }
    return pages;
}

/**
 * The daily notices.
 * @param {string} date YYYY-MM-DD
 * @param {any} state the daemon state
 * @returns {Page[]} the alive notice, and the new-proposals notice when there are any
 */
function dailyPages(date, state) {
    const open = Object.values(state.escalations ?? {}).filter((esc) => !esc.resolvedAt).length;
    const verdict = state.master?.verdict ?? "unknown";
    /** @type {Page[]} */
    const pages = [
        {
            key: `alive:${date}`,
            status: "info",
            message: `githerd alive: master ${verdict}, ${open} open escalation${open === 1 ? "" : "s"}`,
        },
    ];
    const fresh = Object.values(state.proposals ?? {}).filter(
        (p) => p.kind === "close-issue" && ["pending", "dry-run"].includes(p.status) && !p.shownToOwnerAt,
    );
    if (fresh.length > 0) {
        const ends = fresh
            .map((p) => p.graceUntil)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
        const earliest = ends.length ? `; earliest closes ${ends[0].slice(5, 10)}` : "";
        pages.push({
            key: `proposals:${date}`,
            status: "info",
            message: `${fresh.length} new close proposal${fresh.length === 1 ? "" : "s"} in githerd status${earliest}`,
        });
    }
    return pages;
}
