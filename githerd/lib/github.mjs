/**
 * The only path from githerd to GitHub (design sections 4.2, 3.2 and 4.11). Every call goes
 * through `gh api` with `-i`, so status and rate headers are read from each response. Reads keep an
 * ETag and body per path in a record the caller persists (`etags.json`), so a restart costs 304s;
 * writes go through `write()` and `mutate()`, which in dry-run and paused record a `would-do`
 * ledger line and never call `gh`. Every call is checked against the shared rate budget first.
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

/**
 * @typedef {{code: number, stdout: string, stderr: string, timedOut?: boolean}} ExecResult
 * @typedef {(args: string[], options: {input?: string, timeoutMs: number}) => Promise<ExecResult>} Exec
 * @typedef {{status: number, headers: Record<string, string>, body: any}} Response
 * @typedef {{limit: number, remaining: number, used: number, reset: number}} Counter
 * @typedef {{counters: Record<string, Counter>, backoffUntil: number, secondaryMs: number,
 *   downSince: string | null}} RateState
 * @typedef {"essential" | "hold" | "poll" | "success" | "read" | "write"} Purpose
 * @typedef {Record<string, {etag: string, body: any}>} EtagRecord
 */

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
            "gh",
            args,
            {
                timeout: timeoutMs,
                killSignal: "SIGKILL",
                maxBuffer: 64 * 1024 * 1024,
                env: { ...process.env, GH_PROMPT_DISABLED: "1", GH_NO_UPDATE_NOTIFIER: "1", NO_COLOR: "1" },
            },
            (err, stdout, stderr) => {
                const e = /** @type {any} */ (err);
                resolve({
                    code: e ? (typeof e.code === "number" ? e.code : 1) : 0,
                    stdout: String(stdout),
                    stderr: String(stderr),
                    timedOut: Boolean(e && e.killed),
                });
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
 * Creates the GitHub client the daemon and the actor share.
 * @param {{
 *   repo: string,
 *   exec?: Exec,
 *   mode: string | (() => string),
 *   ledger: (entry: {kind: string} & Record<string, unknown>) => unknown,
 *   rate?: Partial<RateState>,
 *   etags?: EtagRecord,
 *   env?: Record<string, string | undefined>,
 *   now?: () => number,
 * }} options `repo` is `owner/name`; `mode` is the effective mode or a function returning it
 *   (anything but `acting` records instead of writing); `ledger` appends one ledger entry; `rate`
 *   is the persisted rate record, mutated in place so `downSince` survives a restart; `etags` is
 *   the persisted ETag record (`etags.json`), mutated in place; `env` is the environment whose
 *   secret values `checkOutgoing` refuses.
 * @returns the client: `get`, `login`, `graphql`, `write`, `mutate`, `pace`, and the `rate` and
 *   `etags` records
 */
export function createGitHub({
    repo,
    exec = ghExec,
    mode,
    ledger,
    rate = {},
    etags = {},
    env = process.env,
    now = Date.now,
}) {
    /** @type {RateState} */
    const r = /** @type {RateState} */ (rate);
    r.counters ??= {};
    r.backoffUntil ??= 0;
    r.secondaryMs ??= 0;
    r.downSince ??= null;
    const currentMode = () => (typeof mode === "function" ? mode() : mode);

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
        if (!res) {
            markDown();
            if (result.timedOut) throw new GitHubError("timeout", `gh timed out after ${TIMEOUT_MS / 1000} s`);
            if (/auth login|authentication|not logged/i.test(result.stderr)) {
                throw new GitHubError("credential", `gh is not logged in: ${result.stderr.trim()}`);
            }
            throw new GitHubError("network", `gh failed without a response: ${result.stderr.trim()}`);
        }
        recordCounter(res.headers);
        const { status, headers } = res;
        if ((status >= 200 && status < 300) || status === 304) {
            r.downSince = null;
            r.secondaryMs = 0;
            return res;
        }
        if (status >= 500) {
            markDown();
            throw new GitHubError("server", `GitHub answered ${status}`, { status });
        }
        if (status === 403 || status === 429) {
            const text = typeof res.body === "string" ? res.body : JSON.stringify(res.body ?? "");
            const hasRate = headers["x-ratelimit-remaining"] !== undefined;
            const remaining = Number(headers["x-ratelimit-remaining"]);
            // Every authenticated answer carries rate headers, so remaining > 0 alone says nothing:
            // a plain permission refusal has them too.
            const secondary =
                /secondary rate limit/i.test(text) || headers["retry-after"] !== undefined || status === 429;
            let until = 0;
            if (headers["retry-after"] !== undefined) until = at + Number(headers["retry-after"]) * 1000;
            if (hasRate && remaining === 0) until = Math.max(until, Number(headers["x-ratelimit-reset"]) * 1000);
            if (secondary && !(hasRate && remaining === 0)) {
                r.secondaryMs = Math.min(Math.max(SECONDARY_MIN_MS, r.secondaryMs * 2), SECONDARY_MAX_MS);
                until = Math.max(until, at + r.secondaryMs);
            }
            if (until > 0) {
                r.backoffUntil = until;
                markDown();
                const kind = secondary && !(hasRate && remaining === 0) ? "secondary" : "rate";
                throw new GitHubError(
                    kind,
                    `GitHub rate limit (${status}); waiting until ${new Date(until).toISOString()}`,
                    {
                        status,
                        retryAt: until,
                    },
                );
            }
        }
        if (status === 401 || status === 403) {
            markDown();
            throw new GitHubError("credential", `GitHub refused the credential (${status})`, { status });
        }
        throw new GitHubError("http", `GitHub answered ${status}: ${JSON.stringify(res.body)}`, { status });
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
     * Records or performs one write, depending on the mode.
     * @param {string} op ledger label
     * @param {unknown} body what would be sent
     * @param {() => Promise<Response>} perform sends it
     * @returns {Promise<{performed: boolean, op: string, status?: number, body?: any}>} whether it
     *   was sent, and GitHub's answer when it was
     */
    async function gated(op, body, perform) {
        guardOutgoing(JSON.stringify(body ?? null), op);
        if (currentMode() !== "acting") {
            await ledger({ kind: "would-do", op, body });
            return { performed: false, op };
        }
        let res;
        try {
            res = await perform();
        } catch (err) {
            const e = /** @type {GitHubError} */ (err);
            await ledger({ kind: "action", op, result: e.status ?? e.kind, error: e.message });
            throw err;
        }
        await ledger({ kind: "action", op, result: res.status });
        return { performed: true, op, status: res.status, body: res.body };
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

    return {
        /** The persisted rate record (counters, back-off, `downSince`). */
        rate: r,

        /** The persisted ETag record: per path, the last 200's ETag and body. */
        etags,

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
         * A REST write on the configured repository. Dry-run and paused record `would-do`;
         * acting performs it and records `action`. Both refuse secrets and attribution lines, and
         * both are held back by the rate tiers: a commit status is a `success` or a `hold` by its
         * state, anything else a `write`.
         * @param {string} method POST, PUT, PATCH or DELETE
         * @param {string} path a path under `repos/<repo>/`
         * @param {unknown} [body] the JSON body
         * @returns {Promise<{performed: boolean, op: string, status?: number, body?: any}>} see `gated`
         */
        async write(method, path, body) {
            if (!WRITE_METHODS.has(method)) throw new GitHubError("refused", `write() does not send ${method}`);
            if (!path.startsWith(prefix) || path.includes("..")) {
                throw new GitHubError("refused", `write() only writes under ${prefix}: ${path}`);
            }
            const op = `${method} ${path.slice(prefix.length)}`;
            /** @type {Purpose} */
            let purpose = "write";
            if (path.startsWith(`${prefix}statuses/`)) {
                const state = /** @type {{state?: string} | undefined} */ (body)?.state;
                purpose = state === "success" ? "success" : "hold";
            }
            spend("core", purpose);
            const args = ["-X", method, path];
            const input = body === undefined ? undefined : JSON.stringify(body);
            return gated(op, body, () => call(input === undefined ? args : [...args, "--input", "-"], input));
        },

        /**
         * A GraphQL mutation, gated exactly like `write()`.
         * @param {string} query the mutation document
         * @param {Record<string, unknown>} [variables] its variables
         * @returns {Promise<{performed: boolean, op: string, status?: number, body?: any}>} see `gated`
         */
        async mutate(query, variables = {}) {
            const name = /mutation\s+(\w+)/.exec(query)?.[1] ?? "anonymous";
            const op = `graphql mutation ${name}`;
            spend("graphql", "write");
            return gated(op, { query, variables }, () => graphqlCall(query, variables, "write"));
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
}
