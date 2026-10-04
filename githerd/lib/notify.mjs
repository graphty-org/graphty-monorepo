/**
 * Owner items, presence and paging (design sections 5.6, 3.7 and 11.3), and the notifier that
 * delivers pages to the owner's phone through `notify.command`.
 *
 * Owner items. An owner item is something only the owner can do: a question with options and what
 * each costs to undo. `raiseItem` records one in `state.ownerItems` (the board reads it there) and
 * `endItem` ends it. An item about an issue or a pull request lives there too: `postItems` writes a
 * comment and the `needs-decision` label through the `owner-items` write group, again only when
 * the item's text changes, and takes the label off when the item ends. `readAnswers` ends an item
 * when the owner comments on it or removes the label.
 *
 * Presence. The owner is present when, in the last 2 hours, he typed into a non-worker session
 * (`lastTypedAt` reads that from a transcript), used the CLI, or acted on GitHub in a way that
 * matches no worker write; the caller reports each with `notePresence`. The days he was present
 * are kept, so a grace period can count only those (`presentDays`).
 *
 * Paging (`planPages`). An item pages once when it becomes actionable and again only when its text
 * changes. Items that come due within 10 minutes of a page wait for the window to end and go out
 * together as one page. While the owner is absent, an item pages only if it blocks every worker
 * start or the release; every other item goes into one digest a day. Nothing else pages: not an
 * outage, not work in progress, not anything githerd is handling. `ownerItemsPoll` runs all of it
 * once per poll.
 *
 * The notifier.
 * `send()` only queues a page under its key; `flush()` delivers the queue and is meant to be
 * started by the poll loop without awaiting it, so a hung command never stalls a poll. A key is
 * delivered at most once. A failed delivery stays queued for the next flush, up to MAX_TRIES
 * attempts per key. After BROKEN_AFTER failures in a row `state.notify.brokenSince` is set, which
 * every status answer and tool result reports until a delivery succeeds.
 *
 * Pages that do not bypass the hourly cap (`notify.maxPerHour`) wait while the cap is used up, and
 * when more of them wait than the hour has room for, the last free slot carries them all as one
 * "and N more" message.
 *
 * A config with `held` set (the daemon sets it while the `owner-items` write group is not acting)
 * records every page in the ledger as `delivered: false` with that reason instead of running the
 * command, except a page sent with `always` (githerd is DOWN), which is still delivered.
 *
 * Everything the notifier remembers lives in the daemon's state object, so it survives a restart:
 * `state.notified[key]` (when a key was delivered, or logged with no command), and
 * `state.notify` = `{brokenSince, lastError, failures, pending, failed, recent}`.
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { homedir } from "node:os";

/** How long one run of the notify command may take before its process group is killed. */
export const TIMEOUT_MS = 15_000;
/** Attempts per key: the first delivery and 3 retries. */
export const MAX_TRIES = 4;
/** Failures in a row that mark notifications broken. */
export const BROKEN_AFTER = 3;
/** The longest message the notify command is given. */
export const MAX_MESSAGE = 200;

const HOUR_MS = 60 * 60 * 1000;
const SEVERITY = ["info", "done", "waiting", "error"];

/**
 * @typedef {"error" | "done" | "waiting" | "info"} NotifyStatus
 * @typedef {{key: string, status: NotifyStatus, message: string, bypass?: boolean, always?: boolean}} Page
 *   `bypass` skips the hourly cap; `always` delivers it even while pages are held
 * @typedef {{command: string[] | null, maxPerHour: number, held?: string}} NotifyConfig `held`: why
 *   pages are recorded instead of delivered
 * @typedef {{status: NotifyStatus, message: string, bypass: boolean, always?: boolean, tries: number,
 *   queuedAt: string}} Pending
 * @typedef {{code: number | null, stderr: string, timedOut: boolean, error?: string}} RunResult
 */

/**
 * Makes a message safe for the command: printable ASCII only, at most MAX_MESSAGE characters.
 * @param {string} message the message
 * @returns {string} the cleaned message
 */
function clean(message) {
    const ascii = message.replaceAll(/\s+/g, " ").replaceAll(/[^\x20-\x7e]/g, "?");
    return ascii.length > MAX_MESSAGE ? `${ascii.slice(0, MAX_MESSAGE - 3)}...` : ascii;
}

/**
 * Builds the argument vector: `~` expanded, `{status}` and `{message}` substituted.
 * @param {string[]} command the configured command
 * @param {string} status the status
 * @param {string} message the cleaned message
 * @returns {string[]} the argv to spawn
 */
function buildArgv(command, status, message) {
    return command.map((arg) => {
        const expanded = arg === "~" || arg.startsWith("~/") ? homedir() + arg.slice(1) : arg;
        return expanded.replaceAll(/\{(status|message)\}/g, (_, name) => (name === "status" ? status : message));
    });
}

/**
 * Runs the command without a shell in its own process group, killing the whole group at the
 * timeout.
 * @param {string[]} argv the command and its arguments
 * @param {number} timeoutMs the timeout
 * @returns {Promise<RunResult>} how it ended
 */
function runCommand(argv, timeoutMs) {
    return new Promise((resolve) => {
        let stderr = "";
        let timedOut = false;
        let settled = false;
        /**
         * Resolves once, whichever of error and close comes first.
         * @param {RunResult} result the outcome
         */
        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(result);
        };
        const child = spawn(argv[0], argv.slice(1), { detached: true, stdio: ["ignore", "ignore", "pipe"] });
        const timer = setTimeout(() => {
            timedOut = true;
            try {
                process.kill(-child.pid, "SIGKILL");
            } catch {
                // the group is already gone
            }
        }, timeoutMs);
        child.stderr.setEncoding("utf8");
        child.stderr.on("data", (chunk) => {
            if (stderr.length < 4096) stderr += chunk;
        });
        child.on("error", (err) => finish({ code: null, stderr, timedOut, error: err.message }));
        child.on("close", (code) => finish({ code, stderr, timedOut }));
    });
}

/**
 * Says why a run failed, or null when it succeeded.
 * @param {RunResult} result the outcome
 * @param {number} timeoutMs the timeout it ran under
 * @returns {string | null} the reason
 */
function failure(result, timeoutMs) {
    if (result.timedOut) return `timed out after ${timeoutMs / 1000} s`;
    if (result.error) return result.error;
    if (result.code !== 0) return result.stderr.trim() || `exited with code ${result.code}`;
    return null;
}

/**
 * Creates the notifier.
 * @param {{
 *   notify: NotifyConfig | (() => NotifyConfig),
 *   state: any,
 *   ledger: (entry: {kind: string} & Record<string, unknown>) => unknown,
 *   now?: () => Date,
 *   timeoutMs?: number,
 * }} options `notify` is the config's `notify` section or a function returning the current one;
 *   `state` is the daemon state, mutated in place; `ledger` appends one ledger entry
 * @returns {{send: (page: Page) => boolean, flush: () => Promise<void>}} `send` queues a page and
 *   returns false when its key was already queued, delivered or given up; `flush` delivers the
 *   queue, and a call while one is running returns the running one
 */
export function createNotifier({ notify, state, ledger, now = () => new Date(), timeoutMs = TIMEOUT_MS }) {
    state.notified ??= {};
    state.notify ??= {};
    const n = state.notify;
    n.brokenSince ??= null;
    n.lastError ??= null;
    n.failures ??= 0;
    /** @type {Record<string, Pending>} */
    n.pending ??= {};
    n.failed ??= {};
    /** @type {string[]} delivery times of capped pages in the last hour */
    n.recent ??= [];
    const config = () => (typeof notify === "function" ? notify() : notify);
    /** @type {Promise<void> | null} */
    let running = null;

    /**
     * Delivers one message that stands for one or more keys.
     * @param {string[]} keys the keys it delivers
     * @param {NotifyStatus} status the status
     * @param {string} message the message
     * @param {boolean} capped whether it counts toward the hourly cap
     * @returns {Promise<boolean>} true when delivered (or logged with no command)
     */
    async function deliver(keys, status, message, capped) {
        const { command, held } = config();
        const at = now().toISOString();
        let hold = held && !keys.every((k) => n.pending[k]?.always) ? held : null;
        if (command === null) hold = "notify.command is null";
        if (hold) {
            for (const key of keys) {
                state.notified[key] = at;
                delete n.pending[key];
            }
            await ledger({ kind: "notify", keys, status, message, delivered: false, reason: hold });
            return true;
        }
        const result = await runCommand(buildArgv(command, status, message), timeoutMs);
        const reason = failure(result, timeoutMs);
        const done = now().toISOString();
        if (reason === null) {
            for (const key of keys) {
                state.notified[key] = done;
                delete n.pending[key];
            }
            if (capped) n.recent.push(done);
            n.failures = 0;
            n.brokenSince = null;
            n.lastError = null;
            ledger({ kind: "notify", keys, status, message, delivered: true });
            return true;
        }
        n.failures += 1;
        n.lastError = reason;
        if (n.failures >= BROKEN_AFTER) n.brokenSince ??= done;
        const gaveUp = [];
        for (const key of keys) {
            n.pending[key].tries += 1;
            if (n.pending[key].tries >= MAX_TRIES) {
                delete n.pending[key];
                n.failed[key] = done;
                gaveUp.push(key);
            }
        }
        ledger({ kind: "notify", keys, status, message, delivered: false, error: reason, gaveUp });
        return false;
    }

    /** Delivers the queue, stopping at the first failure so a broken command is tried once. */
    async function run() {
        const cutoff = now().getTime() - HOUR_MS;
        n.recent = n.recent.filter((t) => Date.parse(t) > cutoff);
        const entries = Object.entries(n.pending);
        for (const [key, page] of entries.filter(([, p]) => p.bypass)) {
            if (!(await deliver([key], page.status, page.message, false))) return;
        }
        const capped = entries.filter(([, p]) => !p.bypass);
        let slots = Math.max(0, config().maxPerHour - n.recent.length);
        while (capped.length > 0 && slots > 0) {
            const batch = slots === 1 ? capped.splice(0) : capped.splice(0, 1);
            const [, first] = batch[0];
            const status = batch.reduce(
                (worst, [, p]) => (SEVERITY.indexOf(p.status) > SEVERITY.indexOf(worst) ? p.status : worst),
                first.status,
            );
            const message =
                batch.length === 1
                    ? first.message
                    : `${first.message} (and ${batch.length - 1} more in githerd status)`;
            if (
                !(await deliver(
                    batch.map(([k]) => k),
                    status,
                    clean(message),
                    true,
                ))
            )
                return;
            slots -= 1;
        }
    }

    return {
        send({ key, status, message, bypass = false, always = false }) {
            if (state.notified[key] || n.failed[key] || n.pending[key]) return false;
            const queuedAt = now().toISOString();
            n.pending[key] = { status, message: clean(message), bypass, ...(always && { always }), tries: 0, queuedAt };
            return true;
        },
        flush() {
            running ??= run().finally(() => {
                running = null;
            });
            return running;
        },
    };
}

/* ------------------------------------------------------------------------------------------------
 * Owner items, presence and paging
 * --------------------------------------------------------------------------------------------- */

/** How long after his last sign of activity the owner counts as present. */
export const PRESENT_MS = 2 * HOUR_MS;
/** Items that come due within this long after a page go out together as one page. */
export const BATCH_MS = 10 * 60 * 1000;
/** The label an owner item puts on the issue or pull request it concerns. */
export const LABEL = "needs-decision";
/** Present days kept, enough for any grace period. */
const DAYS_KEPT = 60;

/**
 * @typedef {{choice: string, undo: string}} ItemOption one answer and what undoing it costs
 * @typedef {{id: string, kind: string, question: string, options?: ItemOption[], target?: string | null,
 *   blocks?: "workers" | "release" | null}} ItemInput what raises an owner item; `target` is
 *   `pr:<n>` or `issue:<n>`, `blocks` says it blocks every worker start or the release
 * @typedef {ItemInput & {options: ItemOption[], target: string | null, blocks: "workers" | "release" | null,
 *   raisedAt: string, updatedAt: string, endedAt?: string, endedBy?: string,
 *   paged?: {text: string, at: string, via: "page" | "digest"},
 *   github?: {text: string, performed: boolean, at: string, unlabeled?: boolean}}} OwnerItem
 */

/**
 * The text an item is paged and posted with; a change of it is what pages again.
 * @param {Pick<OwnerItem, "question" | "options">} item the item
 * @returns {string} the question and its options with their undo costs
 */
export function itemText(item) {
    const options = (item.options ?? []).map((o) => `${o.choice} (undo: ${o.undo})`);
    return options.length ? `${item.question} Options: ${options.join("; ")}` : item.question;
}

/**
 * Records an owner item, or updates the open one with the same id. An ended item with the same id
 * is raised again as new.
 * @param {any} state the daemon state, mutated
 * @param {ItemInput} input the item
 * @param {Date} now the current time
 * @returns {"raised" | "changed" | "same"} what happened
 */
export function raiseItem(state, input, now) {
    if (!input?.id || !input.kind || !input.question) throw new Error("an owner item needs id, kind and question");
    state.ownerItems ??= {};
    const at = now.toISOString();
    const fields = {
        id: input.id,
        kind: input.kind,
        question: input.question,
        options: input.options ?? [],
        target: input.target ?? null,
        blocks: input.blocks ?? null,
    };
    const old = state.ownerItems[input.id];
    if (!old || old.endedAt) {
        state.ownerItems[input.id] = { ...fields, raisedAt: at, updatedAt: at };
        return "raised";
    }
    const same = itemText(old) === itemText(fields) && old.target === fields.target && old.blocks === fields.blocks;
    Object.assign(old, fields);
    if (same) return "same";
    old.updatedAt = at;
    return "changed";
}

/**
 * Ends an open owner item.
 * @param {any} state the daemon state, mutated
 * @param {string} id the item id
 * @param {string} by how it ended: `comment`, `answer`, `record`, `label-removed` or `cleared`
 * @param {Date} now the current time
 * @returns {boolean} false when no open item has that id
 */
export function endItem(state, id, by, now) {
    const item = state.ownerItems?.[id];
    if (!item || item.endedAt) return false;
    item.endedAt = now.toISOString();
    item.endedBy = by;
    return true;
}

/**
 * Records a sign of the owner's presence.
 * @param {any} state the daemon state, mutated
 * @param {"session" | "cli" | "github"} source where it was seen
 * @param {string} at when, ISO
 */
export function notePresence(state, source, at) {
    const p = (state.presence ??= { lastAt: null, source: null, days: [] });
    if (!p.lastAt || at > p.lastAt) Object.assign(p, { lastAt: at, source });
    const day = at.slice(0, 10);
    if (!p.days.includes(day)) {
        p.days.push(day);
        p.days.sort((/** @type {string} */ a, /** @type {string} */ b) => a.localeCompare(b));
        p.days.splice(0, Math.max(0, p.days.length - DAYS_KEPT));
    }
}

/**
 * Whether the owner is present: a sign of him in the last 2 hours.
 * @param {any} state the daemon state
 * @param {Date} now the current time
 * @returns {boolean} true when present
 */
export function isPresent(state, now) {
    const last = state.presence?.lastAt;
    return Boolean(last) && now.getTime() - Date.parse(last) < PRESENT_MS;
}

/**
 * The days with presence on or after a date, for grace periods counted in owner-present days.
 * @param {any} state the daemon state
 * @param {string} since ISO time or YYYY-MM-DD
 * @returns {number} how many
 */
export function presentDays(state, since) {
    const from = since.slice(0, 10);
    return (state.presence?.days ?? []).filter((/** @type {string} */ d) => d >= from).length;
}

/**
 * When the owner last typed into a session, from its transcript (JSON lines). A typed record is a
 * user record whose `origin.kind` is `human`; a transcript without `origin` fields counts a user
 * record with plain text that is not a tool result, a meta record or a tag such as a background
 * task notification.
 * @param {string} transcript the transcript's text
 * @returns {string | null} the newest typed record's timestamp
 */
export function lastTypedAt(transcript) {
    let last = null;
    for (const line of transcript.split("\n")) {
        if (!line.includes('"user"')) continue;
        let r;
        try {
            r = JSON.parse(line);
        } catch {
            continue;
        }
        if (r?.type !== "user" || typeof r.timestamp !== "string") continue;
        const content = r.message?.content;
        const typed = r.origin
            ? r.origin.kind === "human"
            : !r.isMeta && !r.toolUseResult && typeof content === "string" && !content.trimStart().startsWith("<");
        if (typed && (!last || r.timestamp > last)) last = r.timestamp;
    }
    return last;
}

/**
 * A short stable hash for page keys.
 * @param {string} text what to hash
 * @returns {string} 12 hex characters
 */
function hash(text) {
    return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

/**
 * The issue or pull request number an item's target names.
 * @param {string | null} target `pr:<n>`, `issue:<n>` or `#<n>`
 * @returns {number | null} the number, or null for a board-only item
 */
function targetNumber(target) {
    const m = /^(?:pr:|issue:|#)(\d+)$/.exec(target ?? "");
    return m ? Number(m[1]) : null;
}

/**
 * One line naming an item for a page.
 * @param {OwnerItem} item the item
 * @returns {string} the question and where it is
 */
function pageLine(item) {
    const n = targetNumber(item.target);
    return n === null ? item.question : `#${n}: ${item.question}`;
}

/**
 * Decides this poll's owner pages and marks what they cover. An item is due when it is open and
 * was never paged with its current text. While the owner is present every due item pages; while
 * he is absent only blocking ones do, and the rest wait for the day's digest, which goes out at
 * most once per UTC day, at or after `digestHourUtc`. Due items within 10 minutes of the last page
 * wait for the window to end and then go out as one page.
 * @param {any} state the daemon state, mutated (`ownerItems[*].paged`, `paging`)
 * @param {Date} now the current time
 * @param {{digestHourUtc?: number}} [options] the digest hour (default 16)
 * @returns {Page[]} the pages to hand to the notifier
 */
export function planPages(state, now, { digestHourUtc = 16 } = {}) {
    const paging = (state.paging ??= { lastPageAt: null, digestDay: null });
    const at = now.toISOString();
    /** @type {OwnerItem[]} */
    const due = Object.values(state.ownerItems ?? {}).filter(
        (/** @type {OwnerItem} */ i) => !i.endedAt && i.paged?.text !== itemText(i),
    );
    const present = isPresent(state, now);
    /** @type {Page[]} */
    const pages = [];
    const windowOpen = !paging.lastPageAt || now.getTime() - Date.parse(paging.lastPageAt) >= BATCH_MS;
    const pageable = due.filter((i) => present || i.blocks);
    if (pageable.length > 0 && windowOpen) {
        const texts = pageable.map((i) => `${i.id}:${itemText(i)}`).sort((a, b) => a.localeCompare(b));
        const message =
            pageable.length === 1
                ? pageLine(pageable[0])
                : `${pageable.length} items wait on you: ${pageable.map(pageLine).join("; ")}`;
        pages.push({
            key: `owner:${hash(texts.join("\n"))}`,
            status: "waiting",
            message,
            bypass: pageable.some((i) => i.blocks),
        });
        for (const i of pageable) i.paged = { text: itemText(i), at, via: "page" };
        paging.lastPageAt = at;
    }
    const day = at.slice(0, 10);
    const digest = present ? [] : due.filter((i) => !i.blocks);
    if (digest.length > 0 && paging.digestDay !== day && now.getUTCHours() >= digestHourUtc) {
        const count = digest.length === 1 ? "1 item" : `${digest.length} items`;
        pages.push({
            key: `digest:${day}`,
            status: "info",
            message: `githerd digest: ${count} wait on you: ${digest.map(pageLine).join("; ")}`,
        });
        for (const i of digest) i.paged = { text: itemText(i), at, via: "digest" };
        paging.digestDay = day;
    }
    return pages;
}

/**
 * The comment an item posts on its issue or pull request. The marker tells githerd's own comment
 * from the owner's answer.
 * @param {OwnerItem} item the item
 * @returns {string} the comment body
 */
function commentBody(item) {
    const options = item.options.map((o) => `- **${o.choice}**: to undo, ${o.undo}`);
    return [
        `<!-- githerd:owner-item ${item.id} -->`,
        `**Waiting on you** (${item.kind}): ${item.question}`,
        ...(options.length ? ["", ...options] : []),
        "",
        `Answer with a comment here, \`githerd answer ${item.id} <words>\`, or remove the \`${LABEL}\` label.`,
    ].join("\n");
}

/**
 * Puts open items on the issue or pull request they concern (a comment and the `needs-decision`
 * label, through the `owner-items` write group) when their text changed since the last post, or
 * when the last post was only a would-do and the group now acts. Takes the label off an ended item
 * unless another open item on the same target still needs it. A failed write is left for the next
 * poll.
 * @param {{api: any, repo: string, state: any, acting: boolean, now: Date}} options the GitHub
 *   client, `owner/name`, the daemon state (mutated), whether the `owner-items` group acts
 * @returns {Promise<void>}
 */
export async function postItems({ api, repo, state, acting, now }) {
    /** @type {OwnerItem[]} */
    const items = Object.values(state.ownerItems ?? {});
    for (const item of items) {
        const n = targetNumber(item.target);
        if (n === null) continue;
        const write = (
            /** @type {string} */ method,
            /** @type {string} */ path,
            /** @type {unknown} */ body,
            /** @type {any} */ check,
        ) =>
            api.write(method, `repos/${repo}/issues/${n}/${path}`, body, {
                group: "owner-items",
                check,
                fields: { situation: `owner-item:${item.kind}`, item: item.id, target: item.target },
            });
        const labels = `repos/${repo}/issues/${n}/labels`;
        try {
            if (item.endedAt) {
                const others = items.some((o) => o !== item && !o.endedAt && o.target === item.target);
                await unlabel(item, others, () =>
                    write("DELETE", `labels/${LABEL}`, undefined, { path: labels, lacks: [{ name: LABEL }] }),
                );
                continue;
            }
            const text = itemText(item);
            if (item.github?.text === text && (item.github.performed || !acting)) continue;
            const res = await write("POST", "comments", { body: commentBody(item) }, "created");
            await write("POST", "labels", { labels: [LABEL] }, { path: labels, expect: [{ name: LABEL }] });
            item.github = { text, performed: res.performed, at: now.toISOString() };
        } catch {
            // the gate has ledgered the failure; the next poll tries again
        }
    }
}

/**
 * Takes the label off an ended item once, unless the owner already removed it or another open
 * item on the same target still needs it. A 404 means it is already gone.
 * @param {OwnerItem} item the ended item
 * @param {boolean} others whether another open item has the same target
 * @param {() => Promise<unknown>} remove sends the removal
 * @returns {Promise<void>}
 */
async function unlabel(item, others, remove) {
    if (!item.github || item.github.unlabeled || item.endedBy === "label-removed") return;
    if (!others) {
        await remove().catch((/** @type {any} */ e) => {
            if (e?.status !== 404) throw e;
        });
    }
    item.github.unlabeled = true;
}

/**
 * Ends open items the owner answered on GitHub: a comment by him after the item's post that is
 * not one of githerd's own, or the `needs-decision` label gone. Only items whose post was
 * performed are read; each read is a conditional GET, free when nothing changed. Every answer also
 * counts as presence.
 * @param {{api: any, repo: string, state: any, login: string, now: Date}} options the GitHub
 *   client, `owner/name`, the daemon state (mutated), the trusted login
 * @returns {Promise<string[]>} the ids of the items that ended
 */
export async function readAnswers({ api, repo, state, login, now }) {
    const ended = [];
    for (const item of /** @type {OwnerItem[]} */ (Object.values(state.ownerItems ?? {}))) {
        const n = targetNumber(item.target);
        if (item.endedAt || n === null || !item.github?.performed) continue;
        const base = `repos/${repo}/issues/${n}`;
        try {
            const comments = (await api.get(`${base}/comments?since=${item.github.at}&per_page=100`)).body ?? [];
            const answer = comments.find(
                (/** @type {any} */ c) =>
                    c.user?.login === login &&
                    c.created_at > item.github.at &&
                    !String(c.body).includes("<!-- githerd"),
            );
            if (answer) {
                notePresence(state, "github", answer.created_at);
                endItem(state, item.id, "comment", now);
                ended.push(item.id);
                continue;
            }
            const labels = (await api.get(`${base}/labels`)).body ?? [];
            if (!labels.some((/** @type {any} */ l) => l.name === LABEL)) {
                endItem(state, item.id, "label-removed", now);
                ended.push(item.id);
            }
        } catch {
            // unknown is not an answer; the next poll reads again
        }
    }
    return ended;
}

/**
 * One poll's owner-item work: reads answers on GitHub, posts open items there, and hands this
 * poll's pages to the notifier. Without a client or a trusted login only the pages are planned.
 * @param {{api?: any, repo?: string, state: any, notifier: {send: (page: Page) => boolean},
 *   acting: boolean, login?: string | null, now: Date, digestHourUtc?: number,
 *   ledger?: (entry: {kind: string} & Record<string, unknown>) => unknown}} options the GitHub
 *   client and `owner/name`, the daemon state (mutated), the notifier, whether the `owner-items`
 *   group acts, the trusted login, the time, the digest hour and the ledger
 * @returns {Promise<{ended: string[], pages: Page[]}>} the items that ended and the pages sent
 */
export async function ownerItemsPoll({ api, repo, state, notifier, acting, login, now, digestHourUtc, ledger }) {
    let ended = [];
    if (api && repo && login) {
        ended = await readAnswers({ api, repo, state, login, now });
        for (const id of ended)
            await ledger?.({ kind: "owner-item", item: id, event: "ended", by: state.ownerItems[id].endedBy });
        await postItems({ api, repo, state, acting, now });
    }
    const pages = planPages(state, now, { digestHourUtc });
    for (const page of pages) notifier.send(page);
    return { ended, pages };
}
