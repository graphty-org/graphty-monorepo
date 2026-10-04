/**
 * The board as text (design section 11.1), and what `githerd why` and `githerd mode` print
 * (section 11.2). Pure functions over a view of githerd's state; the CLI builds the view from the
 * state directory when the daemon is down, and the daemon builds it with its in-memory GitHub facts.
 */

import { effectiveMode } from "./config.mjs";
import { TERMINAL } from "./board.mjs";

/** The board's sections, in order; banners and faults always come first. */
export const SECTIONS = [
    "master",
    "release",
    "incidents",
    "owner",
    "prs",
    "push",
    "jobs",
    "sessions",
    "orders",
    "limits",
    "health",
];

/** The write groups of the rollout, each with the config switch that lets it act. */
const GROUPS = {
    statuses: "statuses",
    upkeep: "prUpkeep",
    incidents: "incidents",
    "owner-items": "ownerItems",
    proposals: "proposals",
    workers: "workers",
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * @typedef {{incidents: {reason: string}[], propagating: {name: string, version: string}[]}} ReleaseView
 *   release truth: half-states and versions npm does not serve yet
 * @typedef {{number: number, title?: string, decision: {state: string, description: string,
 *   line: number | null}}} PrView an open pull request and its `githerd/merge` decision
 */

/**
 * @typedef {object} BoardView what the board shows. Everything but `state` and `liveness` comes
 *   from the daemon's memory and is null when the daemon is down.
 * @property {any} state `state.json`: jobs, owner items, sessions, orders, policies
 * @property {{alive: any, progress: any, fatal: string | null}} liveness the liveness files
 * @property {string | null} down why the board is read from files, or null when the daemon answered
 * @property {import("./lanes.mjs").LaneFacts | null} [lanes] the lane facts
 * @property {ReleaseView | null} [release] release truth
 * @property {PrView[] | null} [prs] each open pull request's `githerd/merge` decision
 * @property {{holder: string | null, waiters: number} | null} [pushQueue] the push queue
 *   (`tools/push-queue.sh`): the pushes running, and how many wait
 * @property {Record<string, {used: number, max: number, measured: string}> | null} [limits] the
 *   machine limits and the measurement that set each
 * @property {{rate?: string, workerHoursToday?: number, phone?: string, hidden?: number,
 *   stopGatesFailedOpen?: number} | null} [health] the daemon's own health facts
 * @property {Record<string, string> | null} [modes] each write group's mode
 * @property {{record: string, problem: string}[]} [faults] invariant violations
 * @property {string[]} [banners] banners
 */

/**
 * A duration in words, coarse enough to read at a glance.
 * @param {number} ms the duration
 * @returns {string} such as `45 s`, `12 min`, `3 h 5 min`, `2 d 4 h`
 */
export function span(ms) {
    const t = Math.max(0, ms);
    if (t < MINUTE) return `${Math.floor(t / 1000)} s`;
    if (t < HOUR) return `${Math.floor(t / MINUTE)} min`;
    if (t < DAY) return `${Math.floor(t / HOUR)} h ${Math.floor((t % HOUR) / MINUTE)} min`;
    return `${Math.floor(t / DAY)} d ${Math.floor((t % DAY) / HOUR)} h`;
}

/**
 * A time as `MM-DD HH:MM` UTC.
 * @param {string | number | Date} at the time
 * @returns {string} the words
 */
function when(at) {
    return new Date(at).toISOString().slice(5, 16).replace("T", " ");
}

/**
 * How long ago a time was.
 * @param {string | null | undefined} at the time
 * @param {Date} now the current time
 * @returns {string} `12 min ago`, or `never`
 */
function ago(at, now) {
    return at ? `${span(now.getTime() - Date.parse(at))} ago` : "never";
}

/**
 * Banners and faults: always first, whatever section was asked for.
 * @param {BoardView} v the view
 * @returns {string[]} the lines
 */
function bannerLines(v) {
    const lines = [];
    if (v.liveness.fatal) lines.push(`githerd is DOWN: ${v.liveness.fatal}`);
    if (v.down) lines.push(`DAEMON DOWN: ${v.down}; read from state.json, GitHub facts unknown`);
    // The merge gate's checks are kept in the state by each reconcile (design 9.5).
    const gate = v.state?.mergeGate?.checks;
    for (const b of [...(v.banners ?? []), ...(gate?.banners ?? [])]) lines.push(`BANNER: ${b}`);
    for (const w of v.state?.writes?.pending ?? []) {
        if (w.mismatch)
            lines.push(
                `WRITE DID NOT STICK: ${w.op} (${w.group}), sent ${w.retried ? "twice" : "once"}, wrong since ${when(w.mismatch)}`,
            );
    }
    for (const f of [...(v.faults ?? []), ...(v.state?.invariants?.faults ?? []), ...(gate?.faults ?? [])])
        lines.push(`FAULT ${f.record}: ${f.problem} (githerd why ${f.record.split(" ").at(-1)})`);
    return lines;
}

/**
 * One lane's line: its verdict, red-since and failure keys.
 * @param {string} name the workflow
 * @param {import("./lanes.mjs").Lane} lane its facts
 * @returns {string[]} the lines
 */
function laneLines(name, lane) {
    const newest = lane.newest ? ` (run ${lane.newest.runId} at ${lane.newest.sha.slice(0, 8)})` : "";
    if (lane.verdict !== "red") return [`  ${name}: ${lane.verdict}${newest}`];
    const since = lane.redSince ? ` since ${when(lane.redSince.createdAt)}` : "";
    const keys = Object.keys(lane.keys);
    return [`  ${name}: RED${since}${newest}`, ...keys.map((k) => `    ${k}`)];
}

/** @type {Record<string, (v: BoardView, now: Date) => string[]>} */
const RENDER = {
    master(v) {
        if (!v.lanes) return ["MASTER: unknown"];
        const names = Object.keys(v.lanes.lanes).sort((a, b) => a.localeCompare(b));
        const red = names.filter((n) => v.lanes?.lanes[n].verdict === "red");
        const verdict = red.length ? "red on " + red.join(", ") : "green";
        const lines = [`MASTER: ${verdict}`];
        for (const n of names) lines.push(...laneLines(n, v.lanes.lanes[n]));
        const short = (/** @type {string | null} */ s) => s?.slice(0, 8) ?? "none";
        lines.push(`  green commit ${short(v.lanes.greenSha)}; CI-green commit ${short(v.lanes.ciGreenSha)}`);
        return lines;
    },

    release(v) {
        if (!v.release) return ["RELEASE: unknown"];
        const { incidents, propagating } = v.release;
        if (!incidents.length && !propagating.length) return ["RELEASE: npm has every tagged version"];
        return [
            "RELEASE:",
            ...incidents.map((i) => `  half-state: ${i.reason}`),
            ...propagating.map((p) => `  waiting for npm to serve ${p.name}@${p.version}`),
        ];
    },

    incidents(v, now) {
        const open = openJobs(v.state).filter((j) => j.kind === "incident");
        if (!open.length) return ["INCIDENTS: none"];
        return [
            `INCIDENTS (${open.length}):`,
            ...open.map((j) => {
                const how = [j.facts?.class && `class ${j.facts.class}`, j.facts?.step && `step ${j.facts.step}`];
                return `  ${j.target} -- ${[...how, jobState(j, now)].filter(Boolean).join("; ")}`;
            }),
        ];
    },

    owner(v, now) {
        const items = Object.values(v.state.ownerItems ?? {}).filter((i) => !i.endedAt);
        if (!items.length) return ["OWNER: nothing is waiting on you"];
        return [
            `OWNER (${items.length}):`,
            ...items.map((i) => {
                const where = i.target ? ` (${i.target})` : "";
                const age = i.raisedAt ? ", " + ago(i.raisedAt, now) : "";
                return `  ${i.id} [${i.kind}] ${i.question}${where}${age}`;
            }),
        ];
    },

    prs(v) {
        if (!v.prs) return ["PULL REQUESTS: unknown"];
        if (!v.prs.length) return ["PULL REQUESTS: none open"];
        return [
            "PULL REQUESTS:",
            ...v.prs.map((p) => `  #${[p.number, p.title].filter(Boolean).join(" ")} -- ${mergeWords(p.decision)}`),
        ];
    },

    push(v) {
        if (!v.pushQueue) return ["PUSH QUEUE: unknown"];
        const { holder, waiters } = v.pushQueue;
        const who = holder ? "running " + holder : "free";
        return [`PUSH QUEUE: ${who}, ${waiters} waiting`];
    },

    jobs(v, now) {
        const jobs = openJobs(v.state).filter((j) => j.kind !== "incident");
        if (!jobs.length) return ["JOBS: none"];
        return [
            `JOBS (${jobs.length}):`,
            ...jobs.map((j) => `  ${j.id} ${jobState(j, now)} -- ${j.reason || "no reason recorded"}`),
        ];
    },

    sessions(v, now) {
        const sessions = Object.entries(v.state.sessions ?? {});
        if (!sessions.length) return ["SESSIONS: none"];
        return [
            `SESSIONS (${sessions.length}):`,
            ...sessions.map(([id, s]) => {
                const bits = [
                    s.job && `job ${s.job}`,
                    s.window && `window ${s.window}`,
                    s.seenAt && `seen ${ago(s.seenAt, now)}`,
                ].filter(Boolean);
                const extra = bits.length ? " (" + bits.join(", ") + ")" : "";
                return `  ${s.name ?? id}${extra}`;
            }),
        ];
    },

    orders(v) {
        const orders = v.state.orders ?? [];
        const policies = (v.state.policies ?? []).filter((/** @type {any} */ p) => !p.endedAt);
        if (!orders.length && !policies.length) return ["ORDERS AND POLICIES: none"];
        return [
            "ORDERS AND POLICIES:",
            ...orders.map(
                (/** @type {any} */ o) => `  order ${o.id}: ${(o.issues ?? []).map((n) => "#" + n).join(" ")}`,
            ),
            ...policies.map((/** @type {any} */ p) => `  policy ${p.id}: ${p.text}`),
        ];
    },

    limits(v) {
        if (!v.limits) return ["LIMITS: unknown"];
        return [
            "LIMITS:",
            ...Object.entries(v.limits).map(([n, l]) => `  ${n}: ${l.used} of ${l.max} (${l.measured})`),
        ];
    },

    health(v, now) {
        const { alive, progress } = v.liveness;
        const lines = [
            "HEALTH:",
            `  alive written ${ago(alive?.at, now)}${alive ? " by pid " + alive.pid + ", version " + alive.version : ""}`,
            `  progress: ${progress ? progress.step + " for " + span(now.getTime() - Date.parse(progress.since)) : "none"}`,
        ];
        const h = v.health;
        if (h) {
            if (h.rate) lines.push(`  rate: ${h.rate}`);
            lines.push(
                `  worker hours today ${h.workerHoursToday ?? 0}; phone alerts ${h.phone ?? "unknown"}; hidden other-account items ${h.hidden ?? 0}; Stop gates failed open ${h.stopGatesFailedOpen ?? 0}`,
            );
        }
        if (v.modes)
            lines.push(
                `  modes: ${Object.entries(v.modes)
                    .map(([g, m]) => `${g} ${m}`)
                    .join(", ")}`,
            );
        lines.push(`  faults: ${(v.faults ?? []).length}`);
        return lines;
    },
};

/**
 * Words for a `githerd/merge` decision.
 * @param {{state: string, description: string, line: number | null}} d the decision
 * @returns {string} why it is or is not merging
 */
function mergeWords(d) {
    if (d.state === "failure") return `line ${d.line}: ${d.description}`;
    if (d.state === "pending") return "githerd is evaluating";
    return "safe to merge; waiting on Mergify's queue";
}

/**
 * The jobs not yet ended, oldest state first.
 * @param {any} state the state
 * @returns {import("./board.mjs").Job[]} the jobs
 */
function openJobs(state) {
    return Object.values(state.jobs ?? {})
        .filter((j) => !TERMINAL.includes(j.state))
        .sort((a, b) => a.stateSince.localeCompare(b.stateSince) || a.id.localeCompare(b.id));
}

/**
 * A job's state, age, deadline and holder.
 * @param {import("./board.mjs").Job} j the job
 * @param {Date} now the current time
 * @returns {string} the words
 */
function jobState(j, now) {
    const parts = [`${j.state} ${span(now.getTime() - Date.parse(j.stateSince))}`];
    if (j.pausedBy?.length) parts.push(`clock paused by ${j.pausedBy.join(", ")}`);
    else if (j.deadline) parts.push(`${j.deadlineAction} in ${span(Date.parse(j.deadline) - now.getTime())}`);
    if (j.holder?.session) parts.push(`held by ${j.holder.window ?? j.holder.session}`);
    return parts.join(", ");
}

/**
 * The board, or one section of it, as text. Banners and faults are always first.
 * @param {BoardView} view what to show
 * @param {Date} now the current time
 * @param {string} [section] one of SECTIONS, or every section
 * @returns {string} the text
 */
export function renderBoard(view, now, section) {
    if (section !== undefined && !SECTIONS.includes(section)) {
        throw new Error(`unknown section ${section}; one of ${SECTIONS.join(", ")}`);
    }
    const lines = [`githerd board at ${when(now)} UTC`, ...bannerLines(view)];
    for (const name of section ? [section] : SECTIONS) lines.push(...RENDER[name](view, now));
    return lines.join("\n");
}

/**
 * Each write group's mode: the config's mode lowered by the local override, and `dry-run` for a
 * group the config does not switch on, so a group is never shown acting when it cannot act.
 * @param {{mode: string, actions?: Record<string, boolean>}} config the config
 * @param {string | null} override the local override's mode
 * @returns {Record<string, string>} mode by group
 */
export function groupModes(config, override) {
    const mode = effectiveMode(config, override);
    return Object.fromEntries(
        Object.entries(GROUPS).map(([group, action]) => {
            const on = config.actions?.[action] === true;
            return [group, mode === "acting" && !on ? "dry-run" : mode];
        }),
    );
}

/**
 * `githerd mode`: each write group's mode and what its ledger covered. Coverage counts the
 * `would-do` and `action` lines that name the group, and the situations they name.
 * @param {Record<string, string>} modes mode by group (groupModes)
 * @param {any[]} ledger every ledger entry
 * @returns {string} the text
 */
export function modeText(modes, ledger) {
    return Object.entries(modes)
        .map(([group, mode]) => {
            const lines = ledger.filter((e) => e.group === group && (e.kind === "would-do" || e.kind === "action"));
            const situations = new Set(lines.map((e) => e.situation).filter(Boolean));
            const last = lines.at(-1)?.ts;
            const covered = lines.length
                ? `${lines.length} lines, ${situations.size} situations, last ${when(last)}`
                : "no ledger lines yet";
            return `${group.padEnd(12)} ${mode.padEnd(8)} ${covered}`;
        })
        .join("\n");
}

/**
 * The names an item goes by: `#412`, `pr:412` and `issue:412` are one number.
 * @param {string} item what the owner typed
 * @returns {Set<string>} every spelling
 */
function aliases(item) {
    const n = /^(?:#|pr:|issue:)?(\d+)$/.exec(item)?.[1];
    return new Set(n ? [`#${n}`, `pr:${n}`, `issue:${n}`, n] : [item]);
}

/**
 * Whether a ledger entry concerns one of the names.
 * @param {any} e the entry
 * @param {Set<string>} names the item's names
 * @returns {boolean} true when it names the item
 */
function concerns(e, names) {
    const fields = [e.target, e.job, e.id, e.item, e.key, ...(Array.isArray(e.targets) ? e.targets : [])];
    return fields.some((f) => names.has(String(f)));
}

/** At most this many ledger lines are printed by `githerd why`; the rest are counted. */
const WHY_LINES = 30;

/**
 * `githerd why <item>`: the records that hold the item, the facts and reason they carry, and the
 * ledger lines that put it where it is.
 * @param {string} item a job id, an owner item id, `#412`, `pr:412`, `issue:412` or a failure key
 * @param {any} state the state
 * @param {any[]} ledger every ledger entry, oldest first
 * @param {Date} now the current time
 * @returns {string | null} the text, or null when nothing names the item
 */
export function whyText(item, state, ledger, now) {
    const names = aliases(item);
    const jobs = Object.values(state.jobs ?? {}).filter((j) => names.has(j.id) || names.has(j.target));
    const items = Object.values(state.ownerItems ?? {}).filter((i) => names.has(i.id) || names.has(String(i.target)));
    // The records' own ids name the item too: a job's record lines carry its id, not its target.
    for (const r of [...jobs, ...items]) names.add(r.id);
    const lines = ledger.filter((e) => concerns(e, names));
    if (!jobs.length && !items.length && !lines.length) return null;
    const out = jobs.flatMap((j) => jobWhy(j, now));
    for (const i of items) {
        const status = i.endedAt ? `ended ${when(i.endedAt)}` : "open";
        out.push(`owner item ${i.id} [${i.kind}], ${status}: ${i.question}`);
    }
    out.push(...ledgerWhy(lines, item));
    return out.join("\n");
}

/**
 * A job's part of `githerd why`: its state, reason, wait, attempts and facts.
 * @param {import("./board.mjs").Job} j the job
 * @param {Date} now the current time
 * @returns {string[]} the lines
 */
function jobWhy(j, now) {
    const out = [
        `job ${j.id} (${j.kind}, ${j.target}): ${jobState(j, now)}`,
        `  reason: ${j.reason || "none recorded"}`,
    ];
    if (j.waitingFor) out.push(`  waiting for: ${JSON.stringify(j.waitingFor)}`);
    for (const a of j.attempts ?? []) out.push(`  attempt ended ${when(a.endedAt)}: ${a.outcome}`);
    if (j.facts && Object.keys(j.facts).length) out.push(`  facts: ${JSON.stringify(j.facts)}`);
    return out;
}

/**
 * The ledger part of `githerd why`: the last `WHY_LINES` lines, and how many earlier ones there are.
 * @param {any[]} lines the ledger lines that name the item
 * @param {string} item what the owner typed
 * @returns {string[]} the lines
 */
function ledgerWhy(lines, item) {
    if (!lines.length) return [];
    const head =
        lines.length > WHY_LINES
            ? `ledger: ${lines.length - WHY_LINES} earlier lines not shown (githerd ledger --target ${item})`
            : "ledger:";
    return [
        head,
        ...lines.slice(-WHY_LINES).map((e) => {
            const { ts, kind, ...rest } = e;
            return `  ${ts ? when(ts) : "?"} ${kind} ${JSON.stringify(rest)}`;
        }),
    ];
}
