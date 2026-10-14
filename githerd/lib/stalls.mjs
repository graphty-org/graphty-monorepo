/**
 * Tells the owner when a session githerd works with is stuck, and when Claude's usage limit stops
 * the sessions, through owner items (notify.mjs), which page his phone. githerd never steers,
 * restarts or answers a session here: it only tells the owner.
 *
 * A stall is one of two facts, each judged on the status question's own cadence
 * (`workers.statusMinutes`), never on a time constant of its own:
 * - silent: the status question released a claim of the session for no answer (asks.mjs), and the
 *   session has called no githerd tool and given no capacity answer since that question;
 * - dialog: Claude Code's session registry has shown the session `waiting` (a dialog waiting on
 *   the user) for a full cadence.
 * Each stall raises one owner item, `stalled:<session>`, whose text never changes while the stall
 * lasts, so it pages once. It ends when the session recovers (out of the dialog, and for a silent
 * stall a githerd tool call or capacity answer since) or ends; a later stall raises it again.
 *
 * The usage limit: a session's transcript shows Claude Code's "You've hit your ... limit" message
 * (owners.mjs records the newest in `state.transcripts[<session>].limit`). Each limit that has not
 * reset yet raises one item, `usage-limit:<reset>`, at once, naming the reset time; it ends when
 * that time passes. While it is open no silent stall is raised: a limited session cannot answer.
 * Usage can come back before the reset (the owner raised the limit): while an item is open, a probe
 * (one minimal Claude call, `Platform.usageProbe`) runs once per status cadence, and when it
 * succeeds the items end and each session whose limit had not reset is told to carry on, so none
 * waits for the printed reset time (issue #2596).
 */

import { endItem, raiseItem } from "./notify.mjs";
import { tellSessions } from "./peers.mjs";
import { resetAt } from "./start.mjs";

const MINUTE = 60_000;

/**
 * `MM-DD HH:MM UTC` of an ISO time, for a message read on a phone.
 * @param {string} iso the time
 * @returns {string} the short form
 */
const short = (iso) => `${iso.slice(5, 10)} ${iso.slice(11, 16)} UTC`;

/**
 * Whether an open usage-limit item has not reset yet.
 * @param {any} state the daemon state
 * @param {Date} now the clock
 * @returns {boolean} the sessions are limited
 */
function limited(state, now) {
    return Object.values(state.ownerItems ?? {}).some(
        (/** @type {any} */ i) => i.kind === "usage-limit" && !i.endedAt && Date.parse(i.resets) > now.getTime(),
    );
}

/**
 * The owner item text of a stall.
 * @param {string} name the session's name
 * @param {{kind: "silent" | "dialog", since: string}} stall the stall
 * @returns {string} the question
 */
function stallText(name, stall) {
    return stall.kind === "dialog"
        ? `Session ${name} has sat on a dialog waiting for user input since ${short(stall.since)}; it cannot answer githerd. Answer it in that session.`
        : `Session ${name} stopped answering githerd's status questions (unanswered since ${short(stall.since)}); githerd released its claims. Look at that session.`;
}

/**
 * Whether a session itself acted since a time: a githerd tool call or a capacity answer.
 * @param {any} state the daemon state
 * @param {string} id the session
 * @param {string} since the time, ISO
 * @returns {boolean} it called or answered since
 */
const heardSince = (state, id, since) =>
    (state.sessions?.[id]?.calledAt ?? "") > since || (state.capacity?.[id]?.at ?? "") > since;

/**
 * Records since when each live session has shown a dialog (`state.dialogs`), forgetting the rest.
 * @param {any} state the daemon state, changed in place
 * @param {import("./peers.mjs").PeerSession[]} sessions the live sessions
 * @param {string} at now, ISO
 * @returns {Record<string, string>} the dialogs
 */
function noteDialogs(state, sessions, at) {
    const dialogs = (state.dialogs ??= {});
    const ids = new Set(sessions.map((s) => s.sessionId));
    for (const id of Object.keys(dialogs)) if (!ids.has(id)) delete dialogs[id];
    for (const s of sessions) {
        if (s.status === "waiting") dialogs[s.sessionId] ??= at;
        else delete dialogs[s.sessionId];
    }
    return dialogs;
}

/**
 * The earliest question each session left unanswered when this pass released its claims for it,
 * when the session has not acted since.
 * @param {any} state the daemon state
 * @param {({kind: string} & Record<string, unknown>)[]} lines this pass's lines from statusStep
 * @returns {Map<string, string>} the question's time, by session
 */
function silentSessions(state, lines) {
    const silent = new Map();
    for (const l of lines) {
        if (l.kind !== "claim-released" && l.kind !== "pr-released") continue;
        const id = /** @type {string} */ (l.session);
        const asked = /** @type {string | undefined} */ (l.asked);
        if (!asked || heardSince(state, id, asked)) continue;
        if (!silent.has(id) || asked < silent.get(id)) silent.set(id, asked);
    }
    return silent;
}

/**
 * Raises and ends the stall items for this pass of the status question.
 * @param {any} state the daemon state, changed in place (`stalls`, `dialogs`, `ownerItems`)
 * @param {{now: Date, minutes: number, sessions: import("./peers.mjs").PeerSession[],
 *   lines: ({kind: string} & Record<string, unknown>)[]}} opts the clock, the cadence, the live
 *   sessions githerd works with, and this pass's ledger lines from statusStep
 * @returns {({kind: string} & Record<string, unknown>)[]} the ledger lines
 */
export function stallStep(state, { now, minutes, sessions, lines }) {
    const at = now.toISOString();
    const stalls = (state.stalls ??= {});
    const dialogs = noteDialogs(state, sessions, at);
    const live = new Set(sessions.map((s) => s.sessionId));
    const out = [];
    for (const [id, stall] of Object.entries(stalls)) {
        const here = live.has(id);
        if (here && (dialogs[id] || (stall.kind === "silent" && !heardSince(state, id, stall.since)))) continue;
        delete stalls[id];
        endItem(state, `stalled:${id}`, "cleared", now);
        out.push({ kind: "stall-ended", session: stall.name, why: here ? "recovered" : "session ended" });
    }
    const silent = silentSessions(state, lines);
    const quiet = limited(state, now);
    for (const s of sessions) {
        const id = s.sessionId;
        const dialog = dialogs[id];
        const onDialog = dialog && (silent.has(id) || now.getTime() - Date.parse(dialog) >= minutes * MINUTE);
        if (stalls[id] || (!onDialog && (!silent.has(id) || quiet))) continue;
        /** @type {{kind: "silent" | "dialog", since: string}} */
        const stall = onDialog ? { kind: "dialog", since: dialog } : { kind: "silent", since: silent.get(id) };
        stalls[id] = { ...stall, name: s.name, at };
        raiseItem(
            state,
            { id: `stalled:${id}`, kind: "stalled-session", question: stallText(s.name, stall), blocks: "sessions" },
            now,
        );
        out.push({ kind: "stall", session: s.name, stall: stall.kind, since: stall.since });
    }
    return out;
}

/**
 * Raises one owner item for each usage limit seen in a session's transcript that has not reset
 * yet, and ends each whose reset time passed.
 * @param {any} state the daemon state, changed in place (`ownerItems`)
 * @param {Date} now the clock
 * @returns {({kind: string} & Record<string, unknown>)[]} the ledger lines
 */
export function usageLimitStep(state, now) {
    const back = state.usageBackAt ?? "";
    const out = [];
    for (const item of Object.values(state.ownerItems ?? {})) {
        const i = /** @type {any} */ (item);
        if (i.kind !== "usage-limit" || i.clearedAt || Date.parse(i.resets) > now.getTime()) continue;
        // An item the owner answered is cleared too, so the daemon can drop it (droppableItems).
        if (endItem(state, i.id, "cleared", now)) out.push({ kind: "usage-limit-reset", resets: i.resets });
    }
    for (const scan of Object.values(state.transcripts ?? {})) {
        const limit = /** @type {any} */ (scan).limit;
        // A limit from before usage last came back is over, whatever its reset time says.
        if (!limit || limit.at <= back) continue;
        const resets = resetOf(limit);
        if (!resets || Date.parse(resets) <= now.getTime()) continue;
        const id = `usage-limit:${resets}`;
        const old = state.ownerItems?.[id];
        // An item the owner answered stays until the reset; one that ended with usage back is a past limit.
        if (old && !(old.endedBy === "cleared" || old.clearedAt)) continue;
        const name = /** @type {any} */ (scan).name ?? "a session";
        const question =
            `Claude's usage limit stopped the sessions: "${limit.text.replaceAll("\u00B7", "-")}" (seen in ${name} at ${short(limit.at)}). ` +
            "They resume after the reset, or when you raise the limit.";
        raiseItem(state, { id, kind: "usage-limit", question, blocks: "sessions" }, now);
        state.ownerItems[id].resets = resets;
        out.push({ kind: "usage-limit-seen", session: name, resets });
    }
    return out;
}

/**
 * When a transcript's usage limit resets: the API's reset time, else the one the message names,
 * read as the limit screen's is.
 * @param {{at: string, text: string, resets: string | null}} limit the limit
 * @returns {string | undefined} the time, ISO
 */
const resetOf = (limit) => limit.resets ?? resetAt(limit.text, new Date(limit.at))?.toISOString();

/** What a session hears when usage comes back before its limit reset. */
const BACK_TEXT =
    "githerd: Claude's usage limit is over, earlier than its reset time. Carry on with the work the limit " +
    "stopped, and restart any background subagent or workflow that died with the limit error (HTTP 429).";

/**
 * While a usage limit has an open owner item, probes once per cadence whether usage works again;
 * when it does, ends the items and tells each session whose limit had not reset to carry on.
 * @param {any} state the daemon state, changed in place (`usageProbeAt`, `usageBackAt`, `ownerItems`)
 * @param {{now: Date, minutes: number, sessions: import("./peers.mjs").PeerSession[],
 *   transport: import("./peers.mjs").Transport, acting: boolean, probe: () => Promise<boolean>}} opts
 *   the clock, the status cadence, the sessions githerd may message, the transport, whether the
 *   `workers` write group acts, and the probe (true when a Claude call succeeds)
 * @returns {Promise<({kind: string} & Record<string, unknown>)[]>} the ledger lines
 */
export async function usageBackStep(state, { now, minutes, sessions, transport, acting, probe }) {
    const t = now.getTime();
    const open = Object.values(state.ownerItems ?? {}).filter(
        (/** @type {any} */ i) =>
            i.kind === "usage-limit" && i.endedBy !== "cleared" && !i.clearedAt && Date.parse(i.resets) > t,
    );
    if (!open.length || t - Date.parse(state.usageProbeAt ?? "0") < minutes * MINUTE) return [];
    state.usageProbeAt = now.toISOString();
    if (!(await probe())) return [{ kind: "usage-probe", back: false }];
    state.usageBackAt = now.toISOString();
    for (const i of open) endItem(state, i.id, "cleared", now);
    const limited = sessions.filter((s) => {
        const limit = state.transcripts?.[s.sessionId]?.limit;
        return limit && Date.parse(resetOf(limit) ?? "") > t;
    });
    const lines = [];
    if (!acting && limited.length) {
        lines.push({
            kind: "would-do",
            group: "workers",
            op: `tell ${limited.length} session(s) the usage limit is over`,
        });
    }
    const out = acting ? await tellSessions(limited, BACK_TEXT, transport) : { sent: [], failed: [] };
    lines.push({ kind: "usage-back", resets: open.map((i) => i.resets), ...out });
    return lines;
}
