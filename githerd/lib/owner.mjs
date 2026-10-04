/**
 * The owner layer (design sections 5.6 and 5.7): what a session asks the owner, and what the owner
 * says back, as pure functions over the daemon state. The caller holds the job (the MCP layer
 * checks that), persists the state and appends the ledger entry each function returns.
 *
 * - `askOwner` (`githerd_ask_owner`): raises one owner item for the job and parks the job on it.
 *   Asking again while the job is parked on an open item returns that item: no new item, no page.
 * - `recordOwner` (`githerd_record`, and the owner's CLI through `ownerCommand`): an order, a
 *   policy, or an answer to an open item, counted as the owner's words only where his typing is
 *   evident: from a session, within 30 minutes of a prompt he typed there, whose words are kept
 *   with the record (`said`); from a worker, within 30 minutes of his steering it, with the
 *   steering prompt; from the CLI, only on his own terminal (the daemon's `/owner` checks that).
 * - An answer ends the item and moves every job parked on it back to `working` with the answer in
 *   its news; "not yet" keeps the item open and the job parked on it, and pages nobody.
 *   `resumeAnswered` does the same for items that ended any other way (a comment, the label taken
 *   off, the condition clearing), so the daemon calls it after each owner-item poll.
 */

import { move } from "./board.mjs";
import { deferItem, endItem, isNotYet, itemText, notePresence, raiseItem } from "./notify.mjs";

/**
 * How long after the owner steered a worker, or typed into a session, it may record what he said
 * (design 6, tool 11).
 */
export const STEERED_RECORD_MS = 30 * 60 * 1000;
/** How much of the prompt the owner typed is kept with a record. */
const SAID_CHARS = 500;

/** The policy switches the daemon enforces, and whether each names a lane, service or package. */
const SWITCHES = /** @type {Record<string, boolean>} */ ({
    "freeze-merges": false,
    "park-gate": true,
    "hold-package": true,
});

/**
 * @typedef {{choice: string, undoCost: string}} AskOption
 * @typedef {{job: string, kind: string, question: string, options: AskOption[], target?: number}} AskArgs
 * @typedef {{kind: "order" | "policy" | "answer", text: string, issues?: number[], switch?: string,
 *   value?: string, item?: string}} RecordArgs
 * @typedef {{kind: string} & Record<string, unknown>} LedgerEntry
 * @typedef {{job: string, session: string | null}} Resumed a job back at work: the session to
 *   resume or ring, null when it has none and starts fresh
 */

/**
 * Where an item about a job lives: the number the worker named (the job's pull request or an
 * issue), else the job's own pull request or issue, else the board.
 * @param {any} job the job
 * @param {number | undefined} target the number the worker named
 * @returns {string | null} `pr:<n>`, `issue:<n>` or null
 */
function itemTarget(job, target) {
    if (target !== undefined) return target === job.pr ? `pr:${target}` : `issue:${target}`;
    if (job.pr) return `pr:${job.pr}`;
    if (job.kind === "pr" || job.kind === "issue") return `${job.kind}:${job.target}`;
    return null;
}

/**
 * `githerd_ask_owner`: raises the job's owner item and parks the job on it (design 5.3, 5.6).
 * @param {any} state the daemon state, mutated
 * @param {any} job the caller's job
 * @param {AskArgs} args the question, its options with their undo costs, and the issue or pull
 *   request it concerns
 * @param {{session: string | null, now: Date}} at the calling session and the time
 * @returns {{result: {item: string, parked: true}, entry: LedgerEntry | null}} the answer, and the
 *   ledger entry when an item was raised (null when the open one was returned)
 */
export function askOwner(state, job, args, { session, now }) {
    const open = job.waitingFor?.owner;
    if (job.state === "parked" && open && state.ownerItems?.[open] && !state.ownerItems[open].endedAt) {
        return { result: { item: open, parked: true }, entry: null };
    }
    if (job.state !== "working") throw new Error(`${job.id} is ${job.state}; ask the owner while working on it`);
    const id = `ask-${job.id}`;
    raiseItem(
        state,
        {
            id,
            kind: args.kind,
            question: args.question,
            options: args.options.map((o) => ({ choice: o.choice, undo: o.undoCost })),
            target: itemTarget(job, args.target),
        },
        now,
    );
    move(job, "parked", now, { waitingFor: { owner: id }, reason: "waiting on the owner" });
    return {
        result: { item: id, parked: true },
        entry: { kind: "owner-item", item: id, event: "raised", job: job.id, by: session, ownerKind: args.kind },
    };
}

/**
 * Moves every job parked on an ended item back to `working`, with the owner's answer in its news.
 * A job parked on an open item stays parked.
 * @param {any} state the daemon state, mutated
 * @param {Date} now the current time
 * @returns {Resumed[]} the jobs back at work
 */
export function resumeAnswered(state, now) {
    /** @type {Resumed[]} */
    const resumed = [];
    for (const job of Object.values(state.jobs ?? {})) {
        const id = job.state === "parked" ? job.waitingFor?.owner : null;
        const item = id ? state.ownerItems?.[id] : null;
        if (!id || (item && !item.endedAt)) continue;
        const said = item?.answer ? `: ${item.answer}` : ` (${item?.endedBy ?? "the item is gone"})`;
        job.news.push({ at: now.toISOString(), text: `the owner answered ${id}${said}`, acked: false });
        move(job, "working", now, { reason: `the owner answered ${id}` });
        resumed.push({ job: job.id, session: job.holder?.session ?? job.sessions?.at(-1) ?? null });
    }
    return resumed;
}

/**
 * Whether the caller may record what the owner said, and the owner's own words it records them
 * from: a worker within 30 minutes of the owner steering it (the steering prompt); a session
 * within 30 minutes of a prompt the owner typed there (that prompt, which its MCP server read from
 * the session's transcript); the CLI, which the daemon accepts only from the owner's terminal.
 * An agent with no owner prompt behind it records nothing.
 * @param {any} state the daemon state
 * @param {object} caller who calls
 * @param {string | null} [caller.worker] the calling worker's job
 * @param {"session" | "cli"} [caller.via] how the call came
 * @param {{at?: string, text?: string} | null} [caller.typed] the session's last typed prompt
 * @param {Date} now the current time
 * @returns {string | null} the owner's words behind the record, null from the CLI
 */
function checkRecorder(state, { worker, via = "session", typed }, now) {
    const recent = (/** @type {string | null | undefined} */ at) => {
        const t = Date.parse(at ?? "");
        return t <= now.getTime() + 60_000 && now.getTime() - t <= STEERED_RECORD_MS;
    };
    if (worker) {
        const job = state.jobs?.[worker];
        if (!recent(job?.steeredAt)) {
            throw new Error("a worker records what the owner said only within 30 minutes of the owner steering it");
        }
        return String(job.steeredText ?? "").slice(0, SAID_CHARS) || null;
    }
    if (via === "cli") return null;
    if (!recent(typed?.at) || !typed?.text) {
        throw new Error(
            "githerd_record takes the owner's words only from a session he typed into in the last 30 minutes; " +
                "none is in this session's transcript. Ask him, or let him run githerd answer, order or policy in his terminal",
        );
    }
    return String(typed.text).slice(0, SAID_CHARS);
}

/**
 * The next id of a list kept in the state: `order-3`, `policy-7`.
 * @param {any[]} list the orders or policies
 * @param {string} prefix the prefix
 * @returns {string} the id
 */
function nextId(list, prefix) {
    return `${prefix}-${list.length + 1}`;
}

/**
 * Records an order: its issue list fixed now, each issue's job ordered after every earlier order.
 * @param {any} state the daemon state, mutated
 * @param {RecordArgs} args the order
 * @param {string} at when, ISO
 * @param {string} by who recorded it
 * @returns {{text: string, entry: LedgerEntry}} what happened
 */
function recordOrder(state, args, at, by) {
    if (!args.issues?.length) throw new Error("an order lists its issues");
    if (args.switch) throw new Error("a switch belongs to a policy, not an order");
    const orders = (state.orders ??= []);
    const order = { id: nextId(orders, "order"), text: args.text, issues: [...args.issues], reasons: {}, at, by };
    orders.push(order);
    for (const job of Object.values(state.jobs ?? {})) {
        if (job.kind !== "issue") continue;
        const position = orderPosition(state, Number(job.target));
        if (position !== null) job.facts = { ...job.facts, order: position };
    }
    return {
        text: `recorded ${order.id}: ${order.issues.map((n) => "#" + n).join(" ")}`,
        entry: { kind: "order", id: order.id, issues: order.issues, text: args.text, by },
    };
}

/**
 * An issue's place across every order, in the order they were recorded: what the queue's
 * `facts.order` holds for its job (design 5.4).
 * @param {any} state the daemon state
 * @param {number} issue the issue number
 * @returns {number | null} its position, null when no order lists it
 */
export function orderPosition(state, issue) {
    const position = (state.orders ?? []).flatMap((/** @type {any} */ o) => o.issues).indexOf(issue);
    return position < 0 ? null : position;
}

/**
 * Records a policy: free text added to every worker's job text, or a switch the daemon enforces.
 * @param {any} state the daemon state, mutated
 * @param {RecordArgs} args the policy
 * @param {string} at when, ISO
 * @param {string} by who recorded it
 * @returns {{text: string, entry: LedgerEntry}} what happened
 */
function recordPolicy(state, args, at, by) {
    const name = args.switch;
    if (name && !(name in SWITCHES)) throw new Error(`no policy switch ${name}`);
    if (name && SWITCHES[name] && !args.value) throw new Error(`${name} names a lane, service or package in "value"`);
    if (name && !SWITCHES[name] && args.value) throw new Error(`${name} takes no value`);
    if (!name && args.value) throw new Error(`"value" belongs to a switch`);
    const policies = (state.policies ??= []);
    const policy = {
        id: nextId(policies, "policy"),
        text: args.text,
        switch: name ?? null,
        value: args.value ?? null,
        at,
        by,
    };
    policies.push(policy);
    const what = name ? ` (${[name, policy.value].filter(Boolean).join(" ")})` : "";
    return {
        text: `recorded ${policy.id}${what}: ${args.text}`,
        entry: { kind: "policy", id: policy.id, switch: policy.switch, value: policy.value, text: args.text, by },
    };
}

/**
 * Records the owner's answer to an open item. "not yet" keeps it open and its jobs parked, with no
 * page; any other answer ends it and sends its jobs back to work.
 * @param {any} state the daemon state, mutated
 * @param {RecordArgs} args the answer, naming its item
 * @param {Date} now the current time
 * @param {string} by who recorded it
 * @returns {{text: string, entry: LedgerEntry, resumed: Resumed[]}} what happened
 */
function recordAnswer(state, args, now, by) {
    const id = args.item;
    if (!id) throw new Error(`an answer names its item in "item"`);
    const item = state.ownerItems?.[id];
    if (!item || item.endedAt) throw new Error(`no open owner item ${id}`);
    const at = now.toISOString();
    if (isNotYet(args.text)) {
        deferItem(state, id, at);
        for (const job of Object.values(state.jobs ?? {})) {
            if (job.state === "parked" && job.waitingFor?.owner === id) {
                move(job, "parked", now, { waitingFor: job.waitingFor, reason: "waiting on the owner: not yet" });
            }
        }
        return {
            text: `${id} stays open: ${itemText(item)}`,
            entry: { kind: "owner-item", item: id, event: "not-yet", by },
            resumed: [],
        };
    }
    endItem(state, id, "record", now);
    item.answer = args.text;
    const resumed = resumeAnswered(state, now);
    const back = resumed.length ? "; back at work: " + resumed.map((r) => r.job).join(", ") : "";
    return {
        text: `answered ${id}${back}`,
        entry: {
            kind: "owner-item",
            item: id,
            event: "ended",
            by,
            answer: args.text,
            resumed: resumed.map((r) => r.job),
        },
        resumed,
    };
}

/**
 * `githerd_record`: what the owner said, as an order, a policy or an answer (design 5.6, 5.7).
 * Counts as the owner's presence. The owner's words behind it are kept with the record and in its
 * ledger entry as `said`.
 * @param {any} state the daemon state, mutated
 * @param {RecordArgs} args what to record
 * @param {{session: string | null, worker?: string | null, now: Date, via?: "session" | "cli",
 *   typed?: {at?: string, text?: string} | null}} caller the calling session, the job a calling
 *   worker was started for, the time, how the call came (default a session), and the session's
 *   last prompt the owner typed
 * @returns {{text: string, entry: LedgerEntry, resumed: Resumed[]}} what happened, the ledger
 *   entry, and the jobs an answer sent back to work
 */
export function recordOwner(state, args, { session, worker, now, via = "session", typed = null }) {
    const said = checkRecorder(state, { worker, via, typed }, now);
    const at = now.toISOString();
    const by = session ?? "owner";
    if (args.kind !== "answer" && args.item) throw new Error(`"item" belongs to an answer`);
    let out;
    if (args.kind === "order") out = { ...recordOrder(state, args, at, by), resumed: [] };
    else if (args.kind === "policy") out = { ...recordPolicy(state, args, at, by), resumed: [] };
    else if (args.kind === "answer") out = recordAnswer(state, args, now, by);
    else throw new Error(`kind is order, policy or answer, not ${args.kind}`);
    if (said) {
        out.entry.said = said;
        const kept =
            args.kind === "order"
                ? state.orders.at(-1)
                : args.kind === "policy"
                  ? state.policies.at(-1)
                  : state.ownerItems[/** @type {string} */ (args.item)];
        kept.said = said;
    }
    notePresence(state, via === "cli" ? "cli" : "session", at);
    return out;
}

/**
 * Ends a policy (`githerd policy end <id>`).
 * @param {any} state the daemon state, mutated
 * @param {string} id the policy id
 * @param {Date} now the current time
 * @returns {{text: string, entry: LedgerEntry}} what happened
 */
export function endPolicy(state, id, now) {
    const policy = (state.policies ?? []).find((/** @type {any} */ p) => p.id === id);
    if (!policy || policy.endedAt) throw new Error(`no active policy ${id}`);
    policy.endedAt = now.toISOString();
    return { text: `ended ${id}: ${policy.text}`, entry: { kind: "policy", id, ended: true, by: "owner" } };
}

/**
 * The active policies: every free-text one goes into each worker's job text; a switch is enforced
 * by the daemon where it applies (`freeze-merges` by the merge gate, `park-gate` by the incident
 * code, `hold-package` by the merge gate).
 * @param {any} state the daemon state
 * @param {string} [name] only the policies with this switch
 * @returns {any[]} the policies, oldest first
 */
export function activePolicies(state, name) {
    return (state.policies ?? []).filter(
        (/** @type {any} */ p) => !p.endedAt && (name === undefined || p.switch === name),
    );
}

/**
 * The owner's CLI commands of the owner layer, as the daemon's `POST /owner` takes them:
 * `{op: "answer", item, text}`, `{op: "order", issues, text}`, `{op: "policy", text, switch?,
 * value?}` and `{op: "policy-end", id}`.
 * A worker's command (`worker` names its job) is held to `githerd_record`'s rule: only within 30
 * minutes of the owner steering it.
 * @param {any} state the daemon state, mutated
 * @param {any} cmd the command
 * @param {Date} now the current time
 * @param {string | null} [worker] the calling worker's job, null for the owner
 * @returns {{status: number, text: string, entry?: LedgerEntry, resumed?: Resumed[]}} the answer
 */
export function ownerCommand(state, cmd, now, worker = null) {
    try {
        if (cmd?.op === "policy-end") return { status: 200, ...endPolicy(state, String(cmd.id), now) };
        const kind = cmd?.op === "answer" || cmd?.op === "order" || cmd?.op === "policy" ? cmd.op : null;
        if (!kind) return { status: 400, text: "op must be answer, order, policy or policy-end" };
        const args = {
            kind,
            text: String(cmd.text ?? ""),
            issues: cmd.issues,
            switch: cmd.switch,
            value: cmd.value,
            item: cmd.item,
        };
        if (!args.text) return { status: 400, text: `${kind} needs words` };
        return {
            status: 200,
            ...recordOwner(state, args, { session: null, worker, now, via: worker ? "session" : "cli" }),
        };
    } catch (err) {
        return { status: 409, text: /** @type {Error} */ (err).message };
    }
}

/** The owner's control commands (design 7.6 and 11.2). */
export const CONTROL_OPS = new Set(["pause", "resume", "workers", "keep", "release"]);

/**
 * Hands a session to the owner (design 7.6): a worker's session githerd started is put on
 * `state.retiring` and the job leaves it, keeping its state; it continues in a new window.
 * @param {any} state the daemon state, mutated
 * @param {any} job the job
 * @param {string} reason why, for the ledger
 * @param {Date} now the current time
 */
function retireSession(state, job, reason, now) {
    state.retiring = [...(state.retiring ?? []), { job: job.id, holder: job.holder, reason, at: now.toISOString() }];
    job.holder = null;
    job.fresh = true;
}

/**
 * The job whose window is `name`: a window id (`@3`), its name (`githerd-<job>`) or the job id.
 * @param {any} state the daemon state
 * @param {string} name what the owner typed
 * @returns {any} the job, or undefined
 */
function jobOfWindow(state, name) {
    return Object.values(state.jobs ?? {}).find(
        (j) => j.holder?.pane && (j.holder.window === name || j.holder.name === name || j.id === name),
    );
}

/**
 * The owner's control commands, from the CLI (design 7.6 and 11.2):
 * - `pause` / `resume`: stop / restart every worker start and doorbell.
 * - `workers <n>`: the working sessions (0 keeps only the urgent slot); `workers --stop` ends every
 *   worker githerd started without charging an attempt, and starts none until `workers <n>`.
 * - `keep <window>`: hands the window to the owner for good; the job continues in a new window.
 *   With `withJob` the job goes with it: the owner's session holds it, and githerd neither rings
 *   nor ends that session.
 * - `release <job>`: a job the owner stopped (or kept with its window) goes back to githerd.
 * @param {any} state the daemon state, mutated
 * @param {any} cmd `{op, slots?, stop?, window?, withJob?, job?}`
 * @param {Date} now the current time
 * @returns {{status: number, text: string, entry?: LedgerEntry}} the answer
 */
export function controlCommand(state, cmd, now) {
    const settings = (state.settings ??= {});
    const entry = (/** @type {Record<string, unknown>} */ fields) => ({ kind: "control", op: cmd.op, ...fields });
    if (cmd.op === "pause" || cmd.op === "resume") {
        settings.paused = cmd.op === "pause";
        const text = settings.paused
            ? "paused: no worker starts and no doorbell rings until githerd resume"
            : "resumed: workers start and doorbells ring again";
        return { status: 200, text, entry: entry({}) };
    }
    if (cmd.op === "workers") return workersCommand(state, settings, cmd, now, entry);
    if (cmd.op === "keep") {
        const job = jobOfWindow(state, String(cmd.window ?? ""));
        if (!job) return { status: 404, text: `no worker window ${cmd.window}` };
        const window = job.holder.name ?? job.holder.window;
        if (cmd.withJob) {
            job.holder = { session: job.holder.session ?? null, window: job.holder.window, startedBy: "owner" };
            job.kept = true;
            return {
                status: 200,
                text: `${window} and job ${job.id} are yours; githerd release ${job.id} gives the job back`,
                entry: entry({ job: job.id, withJob: true }),
            };
        }
        state.kept = [...(state.kept ?? []), { job: job.id, window: job.holder.window, at: now.toISOString() }];
        job.holder = null;
        job.fresh = true;
        return {
            status: 200,
            text: `${window} is yours; job ${job.id} continues in a new window`,
            entry: entry({ job: job.id }),
        };
    }
    if (cmd.op === "release") {
        const job = state.jobs?.[String(cmd.job ?? "")];
        if (!job) return { status: 404, text: `no job ${cmd.job}` };
        const stopped = job.state === "parked" && String(job.waitingFor?.owner ?? "").startsWith("stopped-by-owner:");
        if (!stopped && !job.kept)
            return { status: 409, text: `${job.id} is ${job.state}: neither stopped by you nor kept` };
        if (stopped) move(job, "working", now, { reason: "released by the owner" });
        if (job.kept) job.holder = null;
        job.kept = false;
        job.steeredAt = null;
        job.fresh = true;
        return { status: 200, text: `released ${job.id}; githerd continues it`, entry: entry({ job: job.id }) };
    }
    return { status: 400, text: `op must be one of ${[...CONTROL_OPS].join(", ")}` };
}

/**
 * `workers <n>` and `workers --stop`.
 * @param {any} state the daemon state, mutated
 * @param {any} settings `state.settings`
 * @param {any} cmd the command
 * @param {Date} now the current time
 * @param {(fields: Record<string, unknown>) => LedgerEntry} entry makes the ledger entry
 * @returns {{status: number, text: string, entry?: LedgerEntry}} the answer
 */
function workersCommand(state, settings, cmd, now, entry) {
    if (cmd.stop) {
        const ended = Object.values(state.jobs ?? {}).filter((j) => j.holder?.pane && j.holder.startedBy === "githerd");
        for (const job of ended) retireSession(state, job, "githerd workers --stop", now);
        settings.stopped = true;
        return {
            status: 200,
            text: `ended ${ended.length} workers without charging an attempt; none starts until githerd workers <n>`,
            entry: entry({ ended: ended.map((j) => j.id) }),
        };
    }
    const n = Number(cmd.slots);
    if (!Number.isInteger(n) || n < 0 || n > 8)
        return { status: 400, text: "workers takes a count from 0 to 8, or --stop" };
    settings.slots = n;
    settings.stopped = false;
    const urgent = n === 0 ? "; only the urgent slot stays" : "";
    return { status: 200, text: `${n} working sessions${urgent}`, entry: entry({ slots: n }) };
}
