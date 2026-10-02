/**
 * The only path from githerd to GitHub (design sections 4, 6 and 14). Every call goes through
 * `gh api` with `-i`, so status and rate headers are read from each response. Reads keep an
 * in-memory ETag per path; writes go through `write()` and `mutate()`, which in dry-run and paused
 * record a `would-do` ledger line and never call `gh`.
 */
import { execFile } from "node:child_process";

import { assertAscii, checkOutgoing } from "./text.mjs";

const TIMEOUT_MS = 60_000;
const SLOW_BELOW = 1000;
const MASTERS_ONLY_BELOW = 300;
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
 *   env?: Record<string, string | undefined>,
 *   now?: () => number,
 * }} options `repo` is `owner/name`; `mode` is the effective mode or a function returning it
 *   (anything but `acting` records instead of writing); `ledger` appends one ledger entry; `rate`
 *   is the persisted rate record, mutated in place so `downSince` survives a restart; `env` is
 *   the environment whose secret values `checkOutgoing` refuses.
 * @returns the client: `get`, `login`, `graphql`, `write`, `mutate`, `pace` and the `rate` record
 */
export function createGitHub({ repo, exec = ghExec, mode, ledger, rate = {}, env = process.env, now = Date.now }) {
    /** @type {RateState} */
    const r = /** @type {RateState} */ (rate);
    r.counters ??= {};
    r.backoffUntil ??= 0;
    r.secondaryMs ??= 0;
    r.downSince ??= null;
    /** @type {Map<string, {etag: string, body: any}>} */
    const etags = new Map();
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
            const secondary = /secondary rate limit/i.test(text) || (hasRate && remaining > 0) || status === 429;
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
     * @returns {Promise<Response>} the response
     */
    async function graphqlCall(query, variables) {
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

        /**
         * GET a REST path. A repeat sends the ETag of the last 200 and returns that body on 304;
         * `fresh` sends no ETag (use it right before an irreversible action).
         * @param {string} path e.g. `repos/o/r/commits/master`
         * @param {{fresh?: boolean}} [options] `fresh` skips the ETag
         * @returns {Promise<{status: number, headers: Record<string, string>, body: any, changed: boolean}>}
         *   the response; `changed` is false when the body came from the ETag cache
         */
        async get(path, { fresh = false } = {}) {
            const cached = etags.get(path);
            const args = [];
            if (cached && !fresh) args.push("-H", `If-None-Match: ${cached.etag}`);
            const res = await call([...args, path]);
            if (res.status === 304) {
                if (!cached) throw new GitHubError("http", `304 for ${path} without a cached body`, { status: 304 });
                return { ...res, body: cached.body, changed: false };
            }
            if (res.headers.etag) etags.set(path, { etag: res.headers.etag, body: res.body });
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
         * @returns {Promise<any>} the `data` object
         */
        async graphql(query, variables = {}) {
            if (isMutation(query)) throw new GitHubError("refused", "graphql() refuses mutations; use mutate()");
            return (await graphqlCall(query, variables)).body?.data;
        },

        /**
         * A REST write on the configured repository. Dry-run and paused record `would-do`;
         * acting performs it and records `action`. Both refuse secrets and attribution lines.
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
        mutate(query, variables = {}) {
            const name = /mutation\s+(\w+)/.exec(query)?.[1] ?? "anonymous";
            return gated(`graphql mutation ${name}`, { query, variables }, () => graphqlCall(query, variables));
        },

        /**
         * How the poll loop should pace itself (design section 6.3): `wait` during a back-off,
         * `masters-only` below 300 remaining on core or GraphQL until that counter resets,
         * `slow` (double the interval) below 1000, else `normal`.
         * @returns {{level: "normal" | "slow" | "masters-only" | "wait", intervalFactor: number, until: number}}
         *   the level, the interval multiplier, and when the level ends (ms, 0 for normal)
         */
        pace() {
            const at = now();
            if (r.backoffUntil > at) return { level: "wait", intervalFactor: 1, until: r.backoffUntil };
            let low = null;
            for (const name of PACED_RESOURCES) {
                const c = r.counters[name];
                if (c && c.reset * 1000 > at && (low === null || c.remaining < low.remaining)) low = c;
            }
            if (low && low.remaining < MASTERS_ONLY_BELOW) {
                return { level: "masters-only", intervalFactor: 1, until: low.reset * 1000 };
            }
            if (low && low.remaining < SLOW_BELOW) return { level: "slow", intervalFactor: 2, until: low.reset * 1000 };
            return { level: "normal", intervalFactor: 1, until: 0 };
        },
    };
}
