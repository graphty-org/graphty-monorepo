/**
 * Checks on text that leaves githerd: everything sent to GitHub or the owner's phone must be plain
 * ASCII, and nothing that reaches GitHub (a body, a comment, a pushed diff) may carry a credential
 * or an attribution line (design section 14).
 */

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
const SECRET_NAME = /TOKEN|KEY|SECRET/i;

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
