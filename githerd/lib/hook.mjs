/**
 * The hooks the committed project settings register (design section 4.10). Claude Code runs them
 * from `~/.githerd/<checkout>/current/bin/githerd-hook.mjs`, the daemon-installed copy of the
 * default branch's githerd, so a worktree's edits never change its own hooks.
 *
 * Only SessionStart is here: one status line for a new session, banners first. A hook never blocks
 * a session because githerd is broken: it gives the daemon 2 s, says in its one line why there is
 * no answer, and exits 0.
 */

import { probe } from "./launcher.mjs";
import { repoRoot } from "./config.mjs";
import { defaultStateDir } from "./store.mjs";

/** How long the hook waits for the daemon's answer. */
const DAEMON_WAIT_MS = 2000;

/**
 * The one line a new session sees: banners first, then master, the owner's list, the open pull
 * requests and the mode.
 * @param {any} data the daemon's `githerd_status` answer in JSON
 * @returns {string} the line
 */
export function statusLine(data) {
    const master = data.master ?? {};
    const since = master.since ? ` since ${master.since}` : "";
    const parts = [
        ...(data.banner ? [data.banner] : []),
        `master ${master.verdict ?? "unknown"}${since}`,
        `${data.owner?.length ?? 0} waiting on the owner`,
        `${data.prs?.length ?? 0} open pull requests`,
        `mode ${data.githerd?.mode ?? "unknown"}`,
    ];
    return `githerd: ${parts.join("; ")}`;
}

/**
 * The SessionStart line for the repository at `cwd`.
 * @param {{cwd: string, session?: string, env: Record<string, string | undefined>}} options where
 *   the session started, its id, and the environment (`HOME`, `GITHERD_STATE_DIR`)
 * @returns {Promise<string | null>} the line, or null outside a git repository
 */
export async function sessionStartLine({ cwd, session, env }) {
    let root;
    try {
        root = repoRoot(cwd);
    } catch {
        return null;
    }
    const stateDir = env.GITHERD_STATE_DIR ?? defaultStateDir(root, env.HOME);
    const { record, health, error } = await probe(/** @type {any} */ ({ stateDir }));
    if (!health) return `githerd: daemon not reachable (${error}); run githerd ensure`;
    try {
        const res = await fetch(`http://127.0.0.1:${record.port}/rpc`, {
            method: "POST",
            headers: { "content-type": "application/json", ...(session ? { "x-githerd-session": session } : {}) },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: { name: "githerd_status", arguments: { format: "json" } },
            }),
            signal: AbortSignal.timeout(DAEMON_WAIT_MS),
        });
        const reply = await res.json();
        const text = reply.result?.content?.[0]?.text;
        if (reply.result?.isError || typeof text !== "string") {
            return `githerd: the daemon could not give its status: ${text ?? reply.error?.message ?? res.status}`;
        }
        return statusLine(JSON.parse(text));
    } catch (err) {
        return `githerd: no usable answer from the daemon (${/** @type {Error} */ (err).message})`;
    }
}

/**
 * Runs one hook: reads Claude Code's JSON from `input` and returns what to print. SessionStart
 * prints its line both to the person (`systemMessage`) and to the session (`additionalContext`).
 * @param {string} event the hook event
 * @param {string} input the hook's standard input
 * @param {{cwd: string, env: Record<string, string | undefined>}} options the fallback working
 *   directory and the environment
 * @returns {Promise<string | null>} the JSON to print, or null for nothing
 */
export async function runHook(event, input, { cwd, env }) {
    if (event !== "SessionStart") return null;
    let hookInput = {};
    try {
        hookInput = JSON.parse(input);
    } catch {
        // no input: use the process's own directory
    }
    const { cwd: at = cwd, session_id: session } = /** @type {{cwd?: string, session_id?: string}} */ (hookInput);
    const line = await sessionStartLine({ cwd: at, session, env });
    if (line === null) return null;
    return JSON.stringify({
        systemMessage: line,
        hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: line },
    });
}
