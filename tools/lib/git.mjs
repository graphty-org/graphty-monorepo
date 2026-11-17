// The one git runner the tools/ scripts share. `git` throws when git fails, so a failed call never looks like empty
// output; `gitOrNull` is for calls that may fail on purpose (`rev-parse -q --verify`, an unset config key).
import { spawnSync } from "node:child_process";

const MAX_BUFFER = 1 << 30;

/**
 * Run git and keep everything it said.
 * @param args git's arguments
 * @param [opts] `cwd`, `env`
 * @returns `{ code, out, err }`
 */
export function gitRun(args, opts = {}) {
    const r = spawnSync("git", args, { cwd: opts.cwd, env: opts.env, encoding: "utf8", maxBuffer: MAX_BUFFER });
    return { code: r.status ?? 1, out: r.stdout ?? "", err: (r.stderr || r.error?.message) ?? "" };
}

/**
 * Run git; throws when it fails.
 * @param args git's arguments
 * @param [opts] `cwd`, `env`
 * @returns its output, trimmed
 */
export function git(args, opts) {
    const r = gitRun(args, opts);
    if (r.code !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.err.trim()}`);
    return r.out.trim();
}

/**
 * Run git when failing is an answer.
 * @param args git's arguments
 * @param [opts] `cwd`, `env`
 * @returns its output, trimmed, or null when it failed
 */
export function gitOrNull(args, opts) {
    const r = gitRun(args, opts);
    return r.code === 0 ? r.out.trim() : null;
}
