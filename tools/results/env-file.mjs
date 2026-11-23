// Reads one KEY=value from the repository's .env, line by line, never sourcing the file: the results
// client's token and the channel scripts' RESULTS_URL.

/**
 * One KEY=value from .env text, without running or exporting anything else in it.
 * @param text the file's text
 * @param key the key
 * @returns the value, or undefined
 */
export function parseEnvFile(text, key) {
    for (const raw of text.split("\n")) {
        const eq = raw.indexOf("=");
        if (
            eq < 0 ||
            raw
                .slice(0, eq)
                .trim()
                .replace(/^export /, "")
                .trim() !== key
        )
            continue;
        const v = raw.slice(eq + 1).trim();
        const quoted = v.length > 1 && (v[0] === '"' || v[0] === "'") && v.endsWith(v[0]);
        if (quoted) return v.slice(1, -1);
        const comment = v.indexOf(" #");
        return (comment < 0 ? v : v.slice(0, comment)).trim();
    }
    return undefined;
}
