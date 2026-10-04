/**
 * A fake `gh` for tests: an `exec` to inject into `createGitHub` that records every argument list
 * and answers from a responder. It never runs a process.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

/**
 * Reads a fixture holding raw `gh api -i` output.
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
 * True when an argument list would change something on GitHub: a non-GET method, a field flag on
 * a REST path, or a GraphQL mutation.
 * @param {{args: string[], input?: string}} call one recorded call
 * @returns {boolean} true for a write
 */
function isWrite({ args, input }) {
    const x = args.indexOf("-X");
    if (x !== -1 && args[x + 1] !== "GET") return true;
    if (args.includes("graphql")) return /\bmutation\b/.test(`${args.join(" ")} ${input ?? ""}`);
    return args.some((a) => a === "-f" || a === "-F" || a.startsWith("--field") || a.startsWith("--raw-field"));
}

/**
 * Creates the fake.
 * @param {(call: {args: string[], input?: string}) => ({code: number, stdout: string, stderr: string, timedOut?: boolean} | string)} respond
 *   returns an exec result, or raw `gh api -i` output for a successful call
 * @returns {{calls: {args: string[], input?: string}[], writes: () => {args: string[], input?: string}[], exec: Function}}
 *   the recorded calls, the writes among them, and the `exec` to inject
 */
export function createFakeGh(respond) {
    /** @type {{args: string[], input?: string}[]} */
    const calls = [];
    return {
        calls,
        writes: () => calls.filter(isWrite),
        exec: async (/** @type {string[]} */ args, /** @type {{input?: string}} */ options = {}) => {
            const { input } = options;
            const call = { args, input };
            calls.push(call);
            const out = respond(call);
            return typeof out === "string" ? { code: 0, stdout: out, stderr: "" } : out;
        },
    };
}
