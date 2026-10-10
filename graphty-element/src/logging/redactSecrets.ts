/** What a removed secret is replaced with. */
const REDACTED = "[redacted]";

/**
 * The shapes a credential takes in text: provider key prefixes, an Authorization value, a named
 * pair (`api_key: ...`, `"x-api-key":"..."`, `?key=...`), and any long run of letters and digits
 * holding both (a token whose provider is not listed here; a long identifier with no digit is
 * left alone). A named pair keeps its name and loses only its value.
 */
const PATTERNS: readonly [RegExp, string][] = [
    [/\b(?:sk|pk|rk)-[\w-]{8,}/g, REDACTED],
    [/\bAIza[\w-]{20,}/g, REDACTED],
    [/\b(Bearer|Basic)\s+[\w.~+/=-]+/gi, `$1 ${REDACTED}`],
    [/\b((?:x-goog-|x-)?api[_-]?key)(["']?\s*[:=]\s*["']?)[^\s"'&,;}]+/gi, `$1$2${REDACTED}`],
    [/\b((?:access[_-]?)?token|secret|password|authorization)(["']?\s*[:=]\s*["']?)[^\s"'&,;}]+/gi, `$1$2${REDACTED}`],
    [/([?&]key=)[^&#\s]+/gi, `$1${REDACTED}`],
    [/(?<![\w-])(?=[\w-]*\d)(?=[\w-]*[A-Za-z])[\w-]{32,}(?![\w-])/g, REDACTED],
];

/**
 * Removes credentials from a piece of text before it leaves the page: an error message, a stack,
 * a URL, a log line. Every exact `secrets` value is removed first, then anything shaped like a
 * key, so a key the caller knows is caught whatever its shape.
 * @param text - the text to clean.
 * @param secrets - values known to be secret, such as the configured API key.
 * @returns the text with each secret replaced by `[redacted]`.
 * @example
 * ```typescript
 * redactSecrets("401: bad key sk-ant-api03-abcdefgh"); // "401: bad key [redacted]"
 * ```
 */
export function redactSecrets(text: string, secrets: readonly (string | undefined)[] = []): string {
    let out = text;
    for (const secret of secrets) {
        if (secret) {
            out = out.split(secret).join(REDACTED);
        }
    }
    for (const [pattern, replacement] of PATTERNS) {
        out = out.replaceAll(pattern, replacement);
    }
    return out;
}
