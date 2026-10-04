/**
 * A fake GitHub for tests: a `fetch` and a `token` to inject into `createGitHub` (or the daemon)
 * that record every request and answer it from a responder. It never opens a connection.
 *
 * Each request is recorded, and handed to the responder, as the argument list `gh api -i` takes
 * for it (`["api", "-i", "-X", "POST", path, "--input", "-"]`, with the JSON body as `input`), and
 * the responder answers in the form `gh api -i` prints (`httpOutput`, or a recorded `.http`
 * fixture). That one vocabulary serves the unit tests, the recorded fixtures and the replay of the
 * recorded month alike.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const API_URL = "https://api.github.com/";
/** Statuses whose answer carries no body. */
const NO_BODY = new Set([204, 205, 304]);

/**
 * Reads a fixture holding a raw HTTP answer as `gh api -i` printed it.
 * @param {string} name file name under test/fixtures
 * @returns {string} the file's text
 */
export function fixture(name) {
    return readFileSync(join(FIXTURES, name), "utf8");
}

/**
 * Formats a response the way `gh api -i` prints it; gh exits 1 on any status above 299.
 * @param {{status: number, headers?: Record<string, string>, body?: unknown}} res the response
 * @returns {{code: number, stdout: string, stderr: string}} an exec result
 */
export function httpOutput({ status, headers = {}, body }) {
    const lines = [`HTTP/2.0 ${status} X`, ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`)];
    const text = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
    return { code: status > 299 ? 1 : 0, stdout: `${lines.join("\r\n")}\r\n\r\n${text}`, stderr: "" };
}

/**
 * Splits a raw answer into status, headers and body text; null when it holds no status line.
 * @param {string} out the raw answer
 * @returns {{status: number, headers: [string, string][], text: string} | null} the parts
 */
function parseHttp(out) {
    const match = /^HTTP\/[\d.]+ (\d{3})/.exec(out);
    if (!match) return null;
    const end = /\r?\n\r?\n/.exec(out);
    const head = end ? out.slice(0, end.index) : out;
    /** @type {[string, string][]} */
    const headers = [];
    for (const line of head.split(/\r?\n/).slice(1)) {
        const colon = line.indexOf(":");
        if (colon > 0) headers.push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
    }
    return { status: Number(match[1]), headers, text: end ? out.slice(end.index + end[0].length) : "" };
}

/**
 * True when a recorded request would change something on GitHub: a non-GET method, or a GraphQL
 * mutation.
 * @param {{args: string[], input?: string}} call one recorded request
 * @returns {boolean} true for a write
 */
function isWrite({ args, input }) {
    const x = args.indexOf("-X");
    if (x !== -1 && args[x + 1] !== "GET") return true;
    if (args.includes("graphql")) return /\bmutation\b/.test(`${args.join(" ")} ${input ?? ""}`);
    return false;
}

/**
 * The argument list `gh api -i` would take for an HTTP request.
 * @param {string} url the request URL
 * @param {RequestInit} init its method, headers and body
 * @returns {{args: string[], input?: string}} the recorded request
 */
function asGhCall(url, init) {
    const path = url.startsWith(API_URL) ? url.slice(API_URL.length) : url;
    const method = (init.method ?? "GET").toUpperCase();
    const headers = /** @type {Record<string, string>} */ (init.headers ?? {});
    const etag = Object.entries(headers).find(([k]) => k.toLowerCase() === "if-none-match")?.[1];
    const input = typeof init.body === "string" ? init.body : undefined;
    if (path === "graphql") return { args: ["api", "-i", "graphql", "--input", "-"], input };
    const args = ["api", "-i"];
    if (method !== "GET") args.push("-X", method);
    if (etag) args.push("-H", `If-None-Match: ${etag}`);
    args.push(path);
    if (input !== undefined) args.push("--input", "-");
    return { args, input };
}

/**
 * Creates the fake.
 * @param {(call: {args: string[], input?: string}) => ({code: number, stdout: string, stderr: string, timedOut?: boolean} | string)} respond
 *   returns an exec result, or the raw answer of a successful request; an exec result without an
 *   HTTP status line is a request that got no answer (`timedOut` for a timeout)
 * @returns {{calls: {args: string[], input?: string}[], writes: () => {args: string[], input?: string}[],
 *   exec: (args: string[], options?: {input?: string}) => Promise<any>, fetch: typeof globalThis.fetch,
 *   token: () => Promise<string>}}
 *   the recorded requests, the writes among them, the responder in `gh` form (replace it to change
 *   the answers), and the `fetch` and `token` to inject
 */
export function createFakeGh(respond) {
    /** @type {{args: string[], input?: string}[]} */
    const calls = [];
    const fake = {
        calls,
        writes: () => calls.filter(isWrite),
        token: async () => "fake-token",
        exec: async (/** @type {string[]} */ args, /** @type {{input?: string}} */ options = {}) => {
            const { input } = options;
            const call = { args, input };
            calls.push(call);
            const out = respond(call);
            return typeof out === "string" ? { code: 0, stdout: out, stderr: "" } : out;
        },
        fetch: /** @type {typeof globalThis.fetch} */ (/** @type {unknown} */ (answer)),
    };
    /**
     * Answers one request from the responder, as `fetch` would.
     * @param {string | URL | Request} url the request URL
     * @param {RequestInit} [init] its method, headers and body
     * @returns {Promise<Response>} the answer
     */
    async function answer(url, init = {}) {
        const { args, input } = asGhCall(String(url), init);
        const out = await fake.exec(args, { input });
        const res = parseHttp(out.stdout);
        if (!res) {
            if (out.timedOut) throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
            throw new TypeError("fetch failed", { cause: new Error(out.stderr || "no answer") });
        }
        const headers = new Headers(res.headers);
        if (!headers.has("content-type")) {
            let json = true;
            try {
                JSON.parse(res.text);
            } catch {
                json = false;
            }
            headers.set("content-type", json ? "application/json; charset=utf-8" : "text/plain; charset=utf-8");
        }
        return new Response(NO_BODY.has(res.status) ? null : res.text, { status: res.status, headers });
    }
    return fake;
}
