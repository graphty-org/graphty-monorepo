/**
 * Claude Code session messaging, as githerd uses it to talk to the sessions working in this
 * repository (design section 8.2): finding them, and sending each a short message.
 *
 * Claude Code records every session in `~/.claude/sessions/<pid>.json`. A session that speaks the
 * peer protocol (`peerProtocol` 1) carries `messagingSocketPath`, a Unix socket that takes
 * newline-delimited JSON: a line `{"type":"user","message":{"role":"user","content":"..."}}` is
 * queued into the session as a message from a peer. The session's own startup log documents the
 * line (`[uds-messaging] Inject messages ...`). An `{"type":"auth","token":...}` line may come
 * first; on Linux the inbox reports the auth line as optional, and githerd sends none: it never
 * reads a session's key file.
 *
 * Sending goes through a transport (`send(socket, text)`), so tests use a fake one and the daemon
 * the socket one. The answer does not come back on the socket: a session answers through
 * githerd's MCP tools (`githerd_mine`, or `githerd_claim`).
 */

import { readdirSync, readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { join, sep } from "node:path";

/** How long one send may take before it counts as failed. */
const SEND_TIMEOUT_MS = 5000;

/**
 * @typedef {{pid: number, sessionId: string, name: string, cwd: string, socket: string,
 *   status: string | null}} PeerSession a live Claude Code session that can take a message
 * @typedef {{send: (socket: string, text: string) => Promise<void>}} Transport delivers one
 *   message to one session's socket, rejecting when it could not
 */

/**
 * Whether a process is running.
 * @param {number} pid the process
 * @returns {boolean} true while it runs
 */
function pidAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (err) {
        return /** @type {NodeJS.ErrnoException} */ (err).code === "EPERM";
    }
}

/**
 * The live sessions working in a repository: their registry entry names a running process, a
 * messaging socket, and a cwd that is the main checkout or under it. githerd's own workers (in
 * `.worktrees/githerd-*`) are left out: their job is theirs already.
 * @param {{sessionsDir: string, root: string, alive?: (pid: number) => boolean}} opts the registry
 *   directory, the main checkout, and the liveness test
 * @returns {PeerSession[]} the sessions, by pid
 */
export function liveSessions({ sessionsDir, root, alive = pidAlive }) {
    let files;
    try {
        files = readdirSync(sessionsDir).filter((f) => /^\d+\.json$/.test(f));
    } catch {
        return [];
    }
    const workers = join(root, ".worktrees", "githerd-");
    /** @type {PeerSession[]} */
    const out = [];
    for (const file of files) {
        let e;
        try {
            e = JSON.parse(readFileSync(join(sessionsDir, file), "utf8"));
        } catch {
            continue;
        }
        const cwd = typeof e?.cwd === "string" ? e.cwd : "";
        const inRepo = cwd === root || cwd.startsWith(root + sep);
        if (!inRepo || cwd.startsWith(workers) || typeof e.messagingSocketPath !== "string") continue;
        if (!Number.isInteger(e.pid) || typeof e.peerProtocol !== "number" || e.peerProtocol < 1) continue;
        if (!alive(e.pid)) continue;
        out.push({
            pid: e.pid,
            sessionId: String(e.sessionId ?? ""),
            name: typeof e.name === "string" ? e.name : `pid ${e.pid}`,
            cwd,
            socket: e.messagingSocketPath,
            status: typeof e.status === "string" ? e.status : null,
        });
    }
    return out.sort((a, b) => a.pid - b.pid);
}

/**
 * The transport over Claude Code's messaging sockets: one connection per message, one JSON line.
 * @returns {Transport} the transport
 */
export function socketTransport() {
    return {
        send: (socket, text) =>
            new Promise((resolve, reject) => {
                const line = JSON.stringify({ type: "user", message: { role: "user", content: text } });
                const c = createConnection({ path: socket });
                c.setTimeout(SEND_TIMEOUT_MS, () => c.destroy(new Error("timed out")));
                c.on("error", reject);
                c.on("close", (failed) => (failed ? undefined : resolve()));
                c.on("connect", () => c.end(`${line}\n`));
            }),
    };
}

/**
 * Sends one message to each session; a session that cannot be reached is reported, not thrown.
 * @param {PeerSession[]} sessions the sessions
 * @param {string} text the message
 * @param {Transport} transport the transport
 * @returns {Promise<{sent: string[], failed: {name: string, error: string}[]}>} the names reached
 *   and those not
 */
export async function tellSessions(sessions, text, transport) {
    const sent = [];
    const failed = [];
    for (const s of sessions) {
        try {
            await transport.send(s.socket, text);
            sent.push(s.name);
        } catch (err) {
            failed.push({ name: s.name, error: /** @type {Error} */ (err).message });
        }
    }
    return { sent, failed };
}
