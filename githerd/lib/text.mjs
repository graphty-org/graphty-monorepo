/**
 * Checks on text that leaves githerd: everything sent to GitHub or the owner's phone must be plain
 * ASCII, and nothing that reaches GitHub (a body, a comment, a pushed diff) may carry a credential
 * or an attribution line (design section 14).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Credential prefixes and key material, matched anywhere in the text.
 * @type {[string, RegExp][]}
 */
const SECRET_PATTERNS = [
    ["GitHub personal access token", /ghp_/],
    ["GitHub OAuth token", /gho_/],
    ["GitHub app token", /ghs_/],
    ["GitHub fine-grained token", /github_pat_/],
    ["Anthropic API key", /sk-ant-/],
    ["npm access token", /\bnpm_[A-Za-z0-9]{30,}/],
    ["sk- secret key", /\bsk-(?!ant-)[A-Za-z0-9_-]{20,}/],
    ["Google API key", /\bAIza[0-9A-Za-z_-]{30,}/],
    ["Slack token", /\bxox[bap]-[0-9A-Za-z-]{10,}/],
    ["AWS access key id", /\bAKIA[0-9A-Z]{16}\b/],
    ["PEM key block", /-----BEGIN/],
];

/**
 * Attribution lines the owner forbids in commits, pull requests and comments.
 * @type {[string, RegExp][]}
 */
const ATTRIBUTION_PATTERNS = [
    ["Co-Authored-By line", /co-authored-by/i],
    ["Claude-Session line", /claude-session/i],
    ['"Generated with" line', /Generated with/],
];

/** Environment variables whose values are secrets: the name contains one of these words. */
const SECRET_NAME = /TOKEN|KEY|SECRET|COOKIE|PASSWORD/i;

// ponytail: values shorter than this are not credentials ("1", "true") and would match nearly any
// text; raise it if a real secret that short ever appears.
const MIN_SECRET_LENGTH = 8;

/**
 * Throws when `text` contains a character outside 7-bit ASCII.
 * @param {string} text the text to check
 * @param {string} [what] names the text in the message
 */
export function assertAscii(text, what = "text") {
    const at = text.search(/[\u0080-\uffff]/);
    if (at !== -1) {
        const code = text.codePointAt(at).toString(16).toUpperCase().padStart(4, "0");
        throw new Error(`${what} is not plain ASCII: U+${code} at offset ${at}`);
    }
}

/**
 * Lists why `text` must not be sent to GitHub. The reasons name what matched and never quote a
 * secret's value.
 * @param {string} text a body, a comment or a diff
 * @param {Record<string, string | undefined>} [env] the environment whose secret values are
 *   refused; the daemon's own by default
 * @returns {string[]} one reason per match; empty when the text may be sent
 */
export function checkOutgoing(text, env = process.env) {
    const reasons = [];
    for (const [label, pattern] of [...SECRET_PATTERNS, ...ATTRIBUTION_PATTERNS]) {
        if (pattern.test(text)) reasons.push(`contains a ${label}`);
    }
    for (const [name, value] of Object.entries(env)) {
        if (
            SECRET_NAME.test(name) &&
            value !== undefined &&
            value.length >= MIN_SECRET_LENGTH &&
            text.includes(value)
        ) {
            reasons.push(`contains the value of environment variable ${name}`);
        }
    }
    return reasons;
}

/**
 * The secret values the outgoing-text check refuses for a daemon started under `env -i`: every
 * variable of `env` whose name marks a secret (TOKEN, KEY, SECRET, COOKIE, PASSWORD), and every such entry of the
 * repository's `.env` (KEY=VALUE lines, never exported). A run can read `.env` through Bash, so its
 * values must be refused even though the daemon's own environment no longer holds them.
 * @param {string} root the repository's main checkout
 * @param {Record<string, string | undefined>} env the daemon's environment
 * @returns {Record<string, string>} variable name to secret value
 */
export function secretValues(root, env) {
    /** @type {Record<string, string>} */
    const out = {};
    let text = "";
    try {
        text = readFileSync(join(root, ".env"), "utf8");
    } catch {
        // no .env: only the environment's secrets
    }
    for (const line of text.split("\n")) {
        const eq = line.indexOf("=");
        const name = line
            .slice(0, Math.max(eq, 0))
            .trim()
            .replace(/^export\s+/, "");
        let value = line.slice(eq + 1).trim();
        const quote = value[0];
        if (value.length >= 2 && (quote === '"' || quote === "'") && value.at(-1) === quote) value = value.slice(1, -1);
        if (/^[A-Za-z_]\w*$/.test(name) && SECRET_NAME.test(name) && value) out[name] = value;
    }
    for (const [name, value] of Object.entries(env)) {
        if (SECRET_NAME.test(name) && value) out[name] = value;
    }
    return out;
}
