// The one git runner the tools/ scripts share. `git` throws when git fails, so a failed call never looks like empty
// output; `gitOrNull` is for calls that may fail on purpose (`rev-parse -q --verify`, an unset config key); `gitRun`
// keeps the exit code and both streams for a caller that reads them.
import { execFileSync, spawnSync } from "node:child_process";

const MAX_BUFFER = 1 << 30;

/**
 * Run git; throws (execFileSync's error, with its status, stdout and stderr) when it fails.
 * @param args git's arguments
 * @param [opts] execFileSync's options (`cwd`, `env`, `input`, `stdio`, `timeout`, ...), plus `trim` (default true)
 * @returns its output, trimmed unless `trim` is false
 */
export function git(args, opts = {}) {
    const { trim = true, ...rest } = opts;
    const out = execFileSync("git", args, { encoding: "utf8", maxBuffer: MAX_BUFFER, ...rest });
    return trim ? out.trim() : out;
}

/**
 * Run git when failing is an answer. Its stderr is dropped unless `stdio` says otherwise.
 * @param args git's arguments
 * @param [opts] as for `git`
 * @returns its output, or null when it failed
 */
export function gitOrNull(args, opts = {}) {
    try {
        return git(args, { stdio: ["ignore", "pipe", "ignore"], ...opts });
    } catch {
        return null;
    }
}

/**
 * Run git and keep everything it said.
 * @param args git's arguments
 * @param [opts] spawnSync's options (`cwd`, `env`, `input`, ...)
 * @returns `{ code, out, err }`, out untrimmed
 */
export function gitRun(args, opts = {}) {
    const r = spawnSync("git", args, { encoding: "utf8", maxBuffer: MAX_BUFFER, ...opts });
    return { code: r.status ?? 1, out: r.stdout ?? "", err: (r.stderr || r.error?.message) ?? "" };
}
