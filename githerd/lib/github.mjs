/**
 * The only path from githerd to GitHub (design sections 4.2, 3.2 and 4.11). Every call goes
 * through `gh api` with `-i`, so status and rate headers are read from each response. Reads keep an
 * ETag and body per path in a record the caller persists (`etags.json`), so a restart costs 304s.
 * Every write goes through one gate (`write()` for REST, `mutate()` for GraphQL, design 10.2): the
 * write names its write group, and unless that group is `acting` it records a `would-do` ledger
 * line and never calls `gh`. Before a write is sent the caller's state is saved (`persist`), so what
 * the caller recorded about the write survives a crash between the send and its own save. A write
 * that is sent is read back at once and again by the next poll (`confirm()`); only a write declared
 * `retry` (it sets a state, so a second send does no harm) is sent once more when it does not hold,
 * and a write that still does not hold stays in the persisted `writes` record marked as a mismatch,
 * for the board, for 24 hours (design 3.6). Every call is checked against the shared rate budget
 * first.
 */
import { execFile } from "node:child_process";

import { assertAscii, checkOutgoing } from "./text.mjs";

const TIMEOUT_MS = 60_000;
/** Paths whose ETag and body are kept; the oldest are dropped first. */
export const MAX_ETAGS = 200;
/**
 * The rate tiers of design 3.2: below each count, githerd spends less. The budget is the owner's,
 * shared with every session, and at zero even a 304 poll is refused [PF 9.3].
 */
const ESSENTIAL_BELOW = 1500;
const NO_SUCCESS_BELOW = 500;
const RESERVE = 300;
/**
 * The lowest remaining count each purpose may spend down to. `essential` polls are master's runs
 * and the open pull request list; `hold` is a non-success `githerd/merge` status; the last 300
 * calls are kept for those two.
 * @type {Record<string, number>}
 */
const FLOORS = {
    essential: 0,
    hold: 0,
    poll: ESSENTIAL_BELOW,
    success: NO_SUCCESS_BELOW,
    read: RESERVE,
    write: RESERVE,
};
const SECONDARY_MIN_MS = 60_000;
const SECONDARY_MAX_MS = 15 * 60_000;
/** Counters the poll pace follows; search has its own small budget, paced by re-triage. */
const PACED_RESOURCES = ["core", "graphql"];
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
/** How long a write that did not stick stays on the board. */
const MISMATCH_KEPT_MS = 24 * 3_600_000;

/**
 * @typedef {{code: number, stdout: string, stderr: string, timedOut?: boolean}} ExecResult
 * @typedef {(args: string[], options: {input?: string, timeoutMs: number}) => Promise<ExecResult>} Exec
 * @typedef {{status: number, headers: Record<string, string>, body: any}} Response
 * @typedef {{limit: number, remaining: number, used: number, reset: number}} Counter
 * @typedef {{counters: Record<string, Counter>, backoffUntil: number, secondaryMs: number,
 *   downSince: string | null}} RateState
 * @typedef {"essential" | "hold" | "poll" | "success" | "read" | "write"} Purpose
 * @typedef {Record<string, {etag: string, body: any}>} EtagRecord
 * @typedef {{path: string, expect?: unknown, lacks?: unknown}} Check where a write is read back
 *   (a GET path) and what the answer must hold (`expect`) and must not (`lacks`), in the sense of
 *   `holds`; a 404 reads as a null body
 * @typedef {Check | "created"} CheckSpec a check, or `created`: read back the resource the write's
 *   answer names in its `url`, expecting its `id`
 * @typedef {{method: string, path: string, body?: unknown} | {query: string, variables: Record<string, unknown>}} Request
 * @typedef {{op: string, group: string, purpose: Purpose, request: Request, spec: CheckSpec,
 *   check: Check | null, at: string, retry: boolean, retried: boolean, held?: boolean,
 *   retryHeld?: boolean, mismatch?: string}} SentWrite a write waiting for the next poll's
 *   confirmation; `held` is whether it held when it was sent, `retryHeld` that a retry waits for its
 *   group to act again, `mismatch` when it was found not to stick
 * @typedef {{pending?: SentWrite[]}} WriteRecord the persisted record of sent writes
 * @typedef {{group: string, check: CheckSpec, retry?: boolean, fields?: Record<string, unknown>}}
 *   WriteOptions the write group whose mode gates the write, how to read it back, whether it may be
 *   sent again when the read-back misses (only a write that sets a state), and extra ledger fields
 *   (such as `situation`, which `githerd mode` counts)
 * @typedef {{performed: boolean, op: string, status?: number, body?: any, stuck?: boolean | null}} WriteResult
 *   whether it was sent, GitHub's answer, and whether the read-back saw it (null: unknown yet)
 */

/**
 * True when `actual` holds everything `expected` says: equal primitives; for an object, every key
 * of `expected` holds in `actual`; for an array, every element of `expected` holds in some
 * element of `actual`.
 * @param {unknown} actual what GitHub answered
 * @param {unknown} expected the subset it must contain
 * @returns {boolean} true when it holds
 */
export function holds(actual, expected) {
    if (Array.isArray(expected)) {
        return Array.isArray(actual) && expected.every((e) => actual.some((a) => holds(a, e)));
    }
    if (expected !== null && typeof expected === "object") {
        if (actual === null || typeof actual !== "object") return false;
        const a = /** @type {Record<string, unknown>} */ (actual);
        return Object.entries(expected).every(([k, v]) => holds(a[k], v));
    }
    return actual === expected;
}

const API_URL = "https://api.github.com/";

/**
 * A failed GitHub call. `kind` is one of: `network`, `timeout`, `server`, `credential`, `rate`
 * (wait until `retryAt`), `secondary` (secondary limit, wait until `retryAt`), `http` (any other
 * 4xx), `graphql` (errors in a 200 answer), `refused` (githerd refused to send it).
 */
export class GitHubError extends Error {
    /**
     * Creates the error.
     * @param {string} kind what went wrong, as listed above
     * @param {string} message a sentence for the log
     * @param {{status?: number, retryAt?: number}} [extra] the HTTP status, and when to call again
     */
    constructor(kind, message, { status, retryAt } = {}) {
        super(message);
        this.name = "GitHubError";
        this.kind = kind;
        this.status = status;
        this.retryAt = retryAt;
    }
}

/**
 * Runs the real `gh` with a timeout and no prompts.
 * @param {string[]} args arguments after `gh`
 * @param {{input?: string, timeoutMs: number}} options stdin text and the kill timeout
 * @returns {Promise<ExecResult>} exit code, output, and whether the timeout killed it
 */
function ghExec(args, { input, timeoutMs }) {
    return new Promise((resolve) => {
        const child = execFile(
            "gh", // NOSONAR(S4036): the owner's gh from his own PATH, as tools/ runs it
            args,
            {
                timeout: timeoutMs,
                killSignal: "SIGKILL",
                maxBuffer: 64 * 1024 * 1024,
                env: { ...process.env, GH_PROMPT_DISABLED: "1", GH_NO_UPDATE_NOTIFIER: "1", NO_COLOR: "1" },
            },
            (err, stdout, stderr) => {
                const e = /** @type {any} */ (err);
                let code = 0;
                if (e) code = typeof e.code === "number" ? e.code : 1;
                resolve({ code, stdout: String(stdout), stderr: String(stderr), timedOut: e?.killed === true });
            },
        );
        // gh may exit before reading its input; the write's EPIPE must not crash the daemon.
        child.stdin.on("error", () => {});
        child.stdin.end(input ?? "");
    });
}

/**
 * Splits `gh api -i` output into status, lower-cased headers and the parsed body. Returns null
 * when the output has no HTTP status line (gh failed before or without a response).
 * @param {string} out what `gh api -i` printed
 * @returns {Response | null} the response, or null when there was none
 */
function parseResponse(out) {
    const match = /^HTTP\/[\d.]+ (\d{3})/.exec(out);
    if (!match) return null;
    const end = /\r?\n\r?\n/.exec(out);
    const head = end ? out.slice(0, end.index) : out;
    const text = end ? out.slice(end.index + end[0].length) : "";
    /** @type {Record<string, string>} */
    const headers = {};
    for (const line of head.split(/\r?\n/).slice(1)) {
        const colon = line.indexOf(":");
        if (colon > 0) headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
    }
    let body = null;
    if (text.trim() !== "") {
        try {
            body = JSON.parse(text);
        } catch {
            body = text;
        }
    }
    return { status: Number(match[1]), headers, body };
}

/**
 * True when a GraphQL document contains a mutation. Fails closed: the word anywhere counts.
 * @param {string} query the GraphQL document
 * @returns {boolean} true for a mutation
 */
function isMutation(query) {
    return /\bmutation\b/.test(query);
}

/**
 * The check a write is read back with, once its answer is known.
 * @param {CheckSpec} spec the write's check
 * @param {any} answer the write's answer body
 * @returns {Check | null} the check, or null when `created` has no resource URL to read
 */
function resolveCheck(spec, answer) {
    if (spec !== "created") return spec;
    const url = answer?.url;
    if (typeof url !== "string" || !url.startsWith(API_URL)) return null;
    return { path: url.slice(API_URL.length), expect: { id: answer.id } };
}

/**
 * Creates the GitHub client the daemon and the actor share.
 * @param {{
 *   repo: string,
 *   exec?: Exec,
 *   mode: string | ((group: string) => string),
 *   ledger: (entry: {kind: string} & Record<string, unknown>) => unknown,
 *   rate?: Partial<RateState>,
 *   etags?: EtagRecord,
 *   writes?: WriteRecord,
 *   env?: Record<string, string | undefined>,
 *   now?: () => number,
 *   persist?: () => unknown,
 * }} options `repo` is `owner/name`; `mode` is one mode for every write group or a function
 *   answering a group's mode (anything but `acting` records instead of writing); `ledger` appends
 *   one ledger entry; `rate` is the persisted rate record, mutated in place so `downSince`
 *   survives a restart; `etags` is the persisted ETag record (`etags.json`), mutated in place;
 *   `writes` is the persisted record of sent writes awaiting confirmation, mutated in place;
 *   `env` is the environment whose secret values `checkOutgoing` refuses; `persist` saves the
 *   caller's state, awaited before every write that is sent.
 * @returns the client: `get`, `login`, `graphql`, `write`, `mutate`, `confirm`, `acting`, `pace`, and the
 *   `rate`, `etags` and `writes` records
 */
export function createGitHub({
    repo,
    exec = ghExec,
    mode,
    ledger,
    rate = {},
    etags = {},
    writes = {},
    env = process.env,
    now = Date.now,
    persist = () => {},
}) {
    /** @type {RateState} */
    const r = /** @type {RateState} */ (rate);
    r.counters ??= {};
    r.backoffUntil ??= 0;
    r.secondaryMs ??= 0;
    r.downSince ??= null;

    /**
     * Keeps the counter a response reported, by resource (core, graphql, search).
     * @param {Record<string, string>} headers lower-cased response headers
     */
    function recordCounter(headers) {
        const resource = headers["x-ratelimit-resource"];
        if (!resource || headers["x-ratelimit-remaining"] === undefined) return;
        r.counters[resource] = {
            limit: Number(headers["x-ratelimit-limit"]),
            remaining: Number(headers["x-ratelimit-remaining"]),
            used: Number(headers["x-ratelimit-used"]),
            reset: Number(headers["x-ratelimit-reset"]),
        };
    }

    /**
     * A counter that still applies: one whose window has not reset yet.
     * @param {string} name the resource, `core` or `graphql`
     * @returns {Counter | null} the counter, or null when none is known for this window
     */
    function live(name) {
        const c = r.counters[name];
        return c && c.reset * 1000 > now() ? c : null;
    }

    /**
     * Refuses a call its purpose may not spend at the resource's remaining count (design 3.2).
     * @param {string} resource `core` or `graphql`
     * @param {Purpose} purpose what the call is for
     */
    function spend(resource, purpose) {
        const c = live(resource);
        if (!c || c.remaining >= FLOORS[purpose]) return;
        throw new GitHubError(
            "rate",
            `${purpose} call held back: ${c.remaining} ${resource} calls left, below ${FLOORS[purpose]}`,
            { retryAt: c.reset * 1000 },
        );
    }

    /**
     * Stores a path's ETag and body, newest last, dropping the oldest beyond `MAX_ETAGS`.
     * @param {string} path the REST path
     * @param {{etag: string, body: any}} entry what to keep
     */
    function remember(path, entry) {
        delete etags[path];
        etags[path] = entry;
        const keys = Object.keys(etags);
        for (const k of keys.slice(0, Math.max(0, keys.length - MAX_ETAGS))) delete etags[k];
    }

    /** Records when GitHub first became unreachable; kept until a call succeeds. */
    function markDown() {
        r.downSince ??= new Date(now()).toISOString();
    }

    /**
     * Sends one `gh api` call and classifies the answer (design section 6.3).
     * @param {string[]} args arguments after `gh api -i`
     * @param {string} [input] the request body, sent on stdin
     * @returns {Promise<Response>} the response, for 2xx and 304
     */
    async function call(args, input) {
        const at = now();
        if (r.backoffUntil > at) {
            throw new GitHubError("rate", `GitHub back-off until ${new Date(r.backoffUntil).toISOString()}`, {
                retryAt: r.backoffUntil,
            });
        }
        const result = await exec(["api", "-i", ...args], { input, timeoutMs: TIMEOUT_MS });
        const res = parseResponse(result.stdout);
        if (!res) throw noResponse(result);
        recordCounter(res.headers);
        if ((res.status >= 200 && res.status < 300) || res.status === 304) {
            r.downSince = null;
            r.secondaryMs = 0;
            return res;
        }
        throw refusal(res, at);
    }

    /**
     * The error for a `gh` run that printed no HTTP response.
     * @param {ExecResult} result the run
     * @returns {GitHubError} a timeout, credential or network error
     */
    function noResponse(result) {
        markDown();
        if (result.timedOut) return new GitHubError("timeout", `gh timed out after ${TIMEOUT_MS / 1000} s`);
        if (/auth login|authentication|not logged/i.test(result.stderr)) {
            return new GitHubError("credential", `gh is not logged in: ${result.stderr.trim()}`);
        }
        return new GitHubError("network", `gh failed without a response: ${result.stderr.trim()}`);
    }

    /**
     * The error for an answer that is not 2xx or 304 (design section 6.3).
     * @param {Response} res the answer
     * @param {number} at when the call was sent
     * @returns {GitHubError} a server, rate, secondary, credential or http error
     */
    function refusal(res, at) {
        const { status } = res;
        if (status >= 500) {
            markDown();
            return new GitHubError("server", `GitHub answered ${status}`, { status });
        }
        const limited = status === 403 || status === 429 ? rateLimited(res, at) : null;
        if (limited) return limited;
        if (status === 401 || status === 403) {
            markDown();
            return new GitHubError("credential", `GitHub refused the credential (${status})`, { status });
        }
        return new GitHubError("http", `GitHub answered ${status}: ${JSON.stringify(res.body)}`, { status });
    }

    /**
     * Reads a 403 or 429 as a rate limit, and backs the client off when it is one.
     * @param {Response} res the answer
     * @param {number} at when the call was sent
     * @returns {GitHubError | null} the rate or secondary error, or null when it is not a limit
     */
    function rateLimited(res, at) {
        const { status, headers } = res;
        const text = typeof res.body === "string" ? res.body : JSON.stringify(res.body ?? "");
        const exhausted =
            headers["x-ratelimit-remaining"] !== undefined && Number(headers["x-ratelimit-remaining"]) === 0;
        // Every authenticated answer carries rate headers, so remaining > 0 alone says nothing:
        // a plain permission refusal has them too.
        const secondary =
            !exhausted &&
            (/secondary rate limit/i.test(text) || headers["retry-after"] !== undefined || status === 429);
        let until = 0;
        if (headers["retry-after"] !== undefined) until = at + Number(headers["retry-after"]) * 1000;
        if (exhausted) until = Math.max(until, Number(headers["x-ratelimit-reset"]) * 1000);
        if (secondary) {
            r.secondaryMs = Math.min(Math.max(SECONDARY_MIN_MS, r.secondaryMs * 2), SECONDARY_MAX_MS);
            until = Math.max(until, at + r.secondaryMs);
        }
        if (until === 0) return null;
        r.backoffUntil = until;
        markDown();
        return new GitHubError(
            secondary ? "secondary" : "rate",
            `GitHub rate limit (${status}); waiting until ${new Date(until).toISOString()}`,
            { status, retryAt: until },
        );
    }

    /**
     * Refuses text that must not reach GitHub.
     * @param {string} text the serialized body
     * @param {string} op names the write in the error
     */
    function guardOutgoing(text, op) {
        try {
            assertAscii(text, op);
        } catch (err) {
            throw new GitHubError("refused", /** @type {Error} */ (err).message);
        }
        const reasons = checkOutgoing(text, env);
        if (reasons.length > 0) throw new GitHubError("refused", `${op} refused: ${reasons.join("; ")}`);
    }

    /**
     * Sends a GraphQL document; errors in a 200 answer are thrown.
     * @param {string} query the document
     * @param {Record<string, unknown>} variables its variables
     * @param {Purpose} purpose what the call is for
     * @returns {Promise<Response>} the response
     */
    async function graphqlCall(query, variables, purpose) {
        spend("graphql", purpose);
        const res = await call(["graphql", "--input", "-"], JSON.stringify({ query, variables }));
        if (res.body?.errors) {
            throw new GitHubError("graphql", `GraphQL errors: ${JSON.stringify(res.body.errors)}`, {
                status: res.status,
            });
        }
        return res;
    }

    const prefix = `repos/${repo}/`;
    writes.pending ??= [];
    const sent = writes.pending;

    /**
     * The mode of one write group: the `mode` option's answer for it.
     * @param {string} group the write group
     * @returns {string} `acting`, `dry-run` or `paused`
     */
    const modeOf = (group) => (typeof mode === "function" ? mode(group) : mode);

    /**
     * Sends a write's request once, logging the attempt as an `action` ledger line.
     * @param {SentWrite} entry the write
     * @returns {Promise<Response>} GitHub's answer
     */
    async function send(entry) {
        const { op, group, request } = entry;
        let res;
        try {
            if ("query" in request) {
                spend("graphql", entry.purpose);
                res = await graphqlCall(request.query, request.variables, entry.purpose);
            } else {
                spend("core", entry.purpose);
                const args = ["-X", request.method, request.path];
                const input = request.body === undefined ? undefined : JSON.stringify(request.body);
                res = await call(input === undefined ? args : [...args, "--input", "-"], input);
            }
        } catch (err) {
            const e = /** @type {GitHubError} */ (err);
            await ledger({ kind: "action", op, group, result: e.status ?? e.kind, error: e.message });
            throw err;
        }
        await ledger({ kind: "action", op, group, result: res.status });
        entry.check = resolveCheck(entry.spec, res.body);
        return res;
    }

    /**
     * Reads a write back.
     * @param {SentWrite} entry the write
     * @param {boolean} fresh true to skip the ETag (right after sending)
     * @returns {Promise<boolean | null>} whether it holds; null when the read failed
     */
    async function readBack(entry, fresh) {
        const { check } = entry;
        if (!check) return false;
        let body;
        try {
            body = (await api.get(check.path, { fresh, purpose: entry.purpose })).body;
        } catch (err) {
            const e = /** @type {GitHubError} */ (err);
            if (e.status !== 404) return null;
            body = null;
        }
        const has = check.expect === undefined || holds(body, check.expect);
        return has && (check.lacks === undefined || !holds(body, check.lacks));
    }

    /**
     * Sends a retryable write once more, unless its group no longer acts: then a `would-do` line
     * (once) stands for the retry and the write stays pending.
     * @param {SentWrite} entry the write
     * @returns {Promise<boolean | null>} whether it holds after the retry; null when not sent
     */
    async function resend(entry) {
        if (modeOf(entry.group) !== "acting") {
            if (!entry.retryHeld) await ledger({ kind: "would-do", op: entry.op, group: entry.group, retry: true });
            entry.retryHeld = true;
            return null;
        }
        entry.retried = true;
        await ledger({ kind: "write-retry", op: entry.op, group: entry.group });
        try {
            await send(entry);
            return await readBack(entry, true);
        } catch {
            return false;
        }
    }

    /**
     * Marks a write that did not hold as a mismatch, once, for the board.
     * @param {SentWrite} entry the write
     */
    async function mismatch(entry) {
        if (entry.mismatch) return;
        entry.mismatch = new Date(now()).toISOString();
        await ledger({ kind: "write-mismatch", op: entry.op, group: entry.group, check: entry.check });
    }

    /**
     * The write gate (design 10.2): refuses what must not reach GitHub, records a `would-do` unless
     * the write's group is `acting`, and otherwise saves the caller's state (`persist`), sends the
     * write, reads it back, and keeps it for the next poll's confirmation. Only a write declared
     * `retry` (one that sets a state, so sending it twice does no harm) is sent again when the
     * read-back misses; any other write (a create, a re-run, an asynchronous update) is left for the
     * next poll, because GitHub's reads lag its writes. A newer write of the same op read back at the
     * same path replaces an older one.
     * @param {string} op the ledger label
     * @param {Purpose} purpose how far down the rate budget it may go
     * @param {Request} request what to send
     * @param {unknown} body what would be sent, for the ledger and the outgoing-text checks
     * @param {WriteOptions} options the write group, the check, extra ledger fields
     * @returns {Promise<WriteResult>} whether it was sent, the answer, and whether it stuck
     */
    async function gate(op, purpose, request, body, options) {
        const { group, check, retry = false, fields = {} } = options ?? /** @type {Partial<WriteOptions>} */ ({});
        if (typeof group !== "string" || group === "") throw new GitHubError("refused", `${op}: no write group`);
        if (check !== "created" && typeof check?.path !== "string") {
            throw new GitHubError("refused", `${op}: no read-back check`);
        }
        guardOutgoing(JSON.stringify(body ?? null), op);
        if (modeOf(group) !== "acting") {
            await ledger({ kind: "would-do", op, group, body, ...fields });
            return { performed: false, op };
        }
        /** @type {SentWrite} */
        const entry = {
            op,
            group,
            purpose,
            request,
            spec: check,
            check: null,
            at: new Date(now()).toISOString(),
            retry,
            retried: false,
        };
        await persist();
        const res = await send(entry);
        let ok = await readBack(entry, true);
        if (ok === false && retry) {
            ok = await resend(entry);
            if (ok === false) await mismatch(entry);
        }
        entry.held = ok === true;
        const old = sent.findIndex((w) => w.op === entry.op && w.check?.path === entry.check?.path);
        if (old !== -1 && entry.check) sent.splice(old, 1);
        sent.push(entry);
        return { performed: true, op, status: res.status, body: res.body, stuck: ok };
    }

    /**
     * Removes a sent write from the pending list, if it is still there.
     * @param {SentWrite} entry the write
     */
    function drop(entry) {
        const i = sent.indexOf(entry);
        if (i !== -1) sent.splice(i, 1);
    }

    /**
     * The next poll's look at one pending write (see `confirm`).
     * @param {SentWrite} entry the write
     */
    async function confirmOne(entry) {
        if (entry.mismatch) {
            if (now() - Date.parse(entry.mismatch) < MISMATCH_KEPT_MS) return;
            drop(entry);
            await ledger({ kind: "write-mismatch-expired", op: entry.op, group: entry.group });
            return;
        }
        let ok = await readBack(entry, false);
        if (ok === false && entry.held) {
            drop(entry);
            await ledger({ kind: "write-overridden", op: entry.op, group: entry.group, check: entry.check });
            return;
        }
        if (ok === false && entry.retry && !entry.retried) ok = await resend(entry);
        if (ok === false) await mismatch(entry);
        if (ok !== true) return;
        drop(entry);
        await ledger({ kind: "write-confirmed", op: entry.op, group: entry.group, after: "sent" });
    }

    const api = {
        /** The persisted rate record (counters, back-off, `downSince`). */
        rate: r,

        /** The persisted ETag record: per path, the last 200's ETag and body. */
        etags,

        /** The persisted record of sent writes awaiting the next poll's confirmation. */
        writes,

        /**
         * GET a REST path. A repeat sends the ETag of the last 200 and returns that body on 304;
         * `fresh` sends no ETag (use it right before an irreversible action).
         * @param {string} path e.g. `repos/o/r/commits/master`
         * @param {{fresh?: boolean, purpose?: Purpose}} [options] `fresh` skips the ETag; `purpose`
         *   (default `read`) decides how far down the rate budget the call may go
         * @returns {Promise<{status: number, headers: Record<string, string>, body: any, changed: boolean}>}
         *   the response; `changed` is false when the body came from the ETag cache
         */
        async get(path, { fresh = false, purpose = "read" } = {}) {
            spend("core", purpose);
            const cached = etags[path];
            const args = [];
            if (cached && !fresh) args.push("-H", `If-None-Match: ${cached.etag}`);
            const res = await call([...args, path]);
            if (res.status === 304) {
                if (!cached) throw new GitHubError("http", `304 for ${path} without a cached body`, { status: 304 });
                return { ...res, body: cached.body, changed: false };
            }
            if (res.headers.etag) remember(path, { etag: res.headers.etag, body: res.body });
            return { ...res, changed: true };
        },

        /**
         * The login of the account gh is logged in as (`gh api user`): the only author githerd
         * trusts. Asked fresh every time, so a change of `gh auth` shows on the next poll.
         * @returns {Promise<string>} the login
         */
        async login() {
            const login = (await call(["user"])).body?.login;
            if (typeof login !== "string" || login === "") {
                throw new GitHubError("credential", "gh api user answered without a login");
            }
            return login;
        },

        /**
         * Runs a GraphQL query. Mutations are refused; they go through `mutate()`.
         * @param {string} query the GraphQL document
         * @param {Record<string, unknown>} [variables] its variables
         * @param {{purpose?: Purpose}} [options] how far down the budget it may go (default `read`)
         * @returns {Promise<any>} the `data` object
         */
        async graphql(query, variables = {}, { purpose = "read" } = {}) {
            if (isMutation(query)) throw new GitHubError("refused", "graphql() refuses mutations; use mutate()");
            return (await graphqlCall(query, variables, purpose)).body?.data;
        },

        /**
         * A REST write on the configured repository, through the write gate. A commit status is a
         * `success` or a `hold` by its state for the rate tiers, anything else a `write`.
         * @param {string} method POST, PUT, PATCH or DELETE
         * @param {string} path a path under `repos/<repo>/`
         * @param {unknown} body the JSON body, or undefined for none
         * @param {WriteOptions} options the write group, the read-back check, ledger fields
         * @returns {Promise<WriteResult>} see `gate`
         */
        async write(method, path, body, options) {
            if (!WRITE_METHODS.has(method)) throw new GitHubError("refused", `write() does not send ${method}`);
            if (!path.startsWith(prefix) || path.includes("..")) {
                throw new GitHubError("refused", `write() only writes under ${prefix}: ${path}`);
            }
            /** @type {Purpose} */
            let purpose = "write";
            if (path.startsWith(`${prefix}statuses/`)) {
                const state = /** @type {{state?: string} | undefined} */ (body)?.state;
                purpose = state === "success" ? "success" : "hold";
            }
            return gate(`${method} ${path.slice(prefix.length)}`, purpose, { method, path, body }, body, options);
        },

        /**
         * A GraphQL mutation, through the same gate as `write()`.
         * @param {string} query the mutation document
         * @param {Record<string, unknown>} variables its variables
         * @param {WriteOptions} options the write group, the read-back check, ledger fields
         * @returns {Promise<WriteResult>} see `gate`
         */
        async mutate(query, variables, options) {
            const name = /mutation\s+(\w+)/.exec(query)?.[1] ?? "anonymous";
            return gate(`graphql mutation ${name}`, "write", { query, variables }, { query, variables }, options);
        },

        /**
         * The next poll's confirmation: reads back every sent write (with its ETag, so an unchanged
         * answer is a free 304). One that holds is done. One that held when it was sent and no
         * longer holds was changed by someone else since: logged as `write-overridden` and dropped,
         * never sent again. One that never held is sent once more when it is retryable and not yet
         * retried, and is a mismatch otherwise. A read that fails leaves the write for the poll
         * after. A mismatch is not read again: it stays on the board for 24 hours, then expires.
         * @returns {Promise<void>}
         */
        async confirm() {
            for (const entry of sent.slice()) await confirmOne(entry);
        },

        /**
         * Whether a write group's writes go out now.
         * @param {string} group the write group
         * @returns {boolean} true when the group is `acting`
         */
        acting(group) {
            return modeOf(group) === "acting";
        },

        /**
         * The rate tier the poll loop follows (design 3.2): `wait` during a back-off; else by the
         * lowest live core or GraphQL counter, `reserve` below 300 (only essential polls and
         * holds), `holds` below 500 (no new `success`), `essential` below 1500 (only master's runs
         * and the open pull request list are polled), else `normal`.
         * @returns {{level: "normal" | "essential" | "holds" | "reserve" | "wait", intervalFactor: number, until: number}}
         *   the tier, the interval multiplier (always 1), and when the tier ends (ms, 0 for normal)
         */
        pace() {
            if (r.backoffUntil > now()) return { level: "wait", intervalFactor: 1, until: r.backoffUntil };
            let low = null;
            for (const name of PACED_RESOURCES) {
                const c = live(name);
                if (c && (low === null || c.remaining < low.remaining)) low = c;
            }
            const tiers = /** @type {const} */ ([
                ["reserve", RESERVE],
                ["holds", NO_SUCCESS_BELOW],
                ["essential", ESSENTIAL_BELOW],
            ]);
            const tier = low && tiers.find(([, below]) => low.remaining < below);
            if (low && tier) return { level: tier[0], intervalFactor: 1, until: low.reset * 1000 };
            return { level: "normal", intervalFactor: 1, until: 0 };
        },
    };
    return api;
}
