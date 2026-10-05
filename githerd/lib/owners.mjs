/**
 * Whose is a pull request, inferred with nobody asked (the owner's rule of 2026-10-05: githerd
 * keeps running with no command from the owner). Every session commits as the same author, so
 * commits name no session; two other facts do:
 *
 * 1. The push log: `tools/push-queue.sh`, which every push on this machine goes through, appends
 *    one JSON line per push to the main checkout's `tmp/push-log.jsonl`, naming the Claude Code
 *    session that launched it (the first ancestor process with a registry entry).
 * 2. Claude Code's transcripts: a live session's Bash tool calls that ran `git push` (directly or
 *    through the queue script) or `gh pr create --head`, naming a branch. The push log began on
 *    2026-10-05; the transcripts cover a session's pushes from before it. Only branch names and
 *    times are extracted, read incrementally (`scanTranscripts`).
 * 3. Worktree presence: a live session, or any process under it, whose cwd is inside the worktree
 *    that has a pull request's branch checked out.
 *
 * A pull request is owned by the session that last pushed its branch while that session is live,
 * else by the live session whose transcript last pushed it (no earlier than the push log's last
 * push of it), else by a live session present in its worktree. The result, `state.prInferred[<pr>]`, is
 * recomputed every poll, so ownership lapses the poll after the session exits. `prInUse` reads it
 * after the explicit records of `githerd_mine` and `githerd mine` (`state.prOwners`), which win.
 */

import { readdirSync, readFileSync, readlinkSync } from "node:fs";
import { open, readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/** @typedef {{session: string, name: string, evidence: string}} InferredOwner */
/**
 * @typedef {{at?: string, branch?: string | null, sha?: string | null, exit?: number,
 *   sessionId?: string | null, name?: string | null}} PushLine
 */
/** @typedef {{pid: number, ppid: number, cwd: string | null}} Proc */
/** @typedef {{pid: number, sessionId: string, name: string, cwd?: string}} Registered */
/**
 * What the transcripts of one session have shown so far: the bytes read of each file (by path
 * relative to the session's transcript, `""` for the transcript itself) and the latest push time of
 * each branch.
 * @typedef {{files: Record<string, number>, pushes: Record<string, string>}} TranscriptScan
 */

/** Bytes of transcript read per poll, across every session. */
export const TRANSCRIPT_BUDGET = 256 * 1024 * 1024;
const CHUNK = 8 * 1024 * 1024;
/** A line longer than this (a giant tool result) is skipped unread. */
const MAX_LINE = 64 * 1024 * 1024;

/**
 * The branches a shell command pushes: the destination of each refspec after `git push <remote>`,
 * and `gh pr create --head <branch>`. A deletion, a bare HEAD and a flag's value are not branches.
 * @param {string} cmd the command
 * @returns {string[]} the branches
 */
export function pushedBranches(cmd) {
    const out = new Set();
    for (const m of cmd.matchAll(/\bgit\s+(?:-[Cc]\s+\S+\s+)*push\b([^;&|\n<>]*)/g)) {
        const words = m[1].trim().split(/\s+/);
        if (words.includes("--delete") || words.includes("-d")) continue;
        const args = words.filter((a) => a && !a.startsWith("-")).map((a) => a.replace(/^["']|["']$/g, ""));
        for (const ref of args.slice(1)) {
            if (ref.startsWith(":")) continue;
            const dst = /** @type {string} */ (ref.replace(/^\+/, "").split(":").pop()).replace(/^refs\/heads\//, "");
            if (dst !== "HEAD" && /[A-Za-z]/.test(dst) && /^[\w./-]+$/.test(dst)) out.add(dst);
        }
    }
    for (const m of cmd.matchAll(/\bgh\s+pr\s+create\b[^;&|\n]*?--head[=\s]+["']?([\w./-]+)/g)) out.add(m[1]);
    return [...out];
}

/**
 * Records the pushes in complete transcript lines: Bash tool calls of assistant messages. Only
 * lines that mention a push are parsed.
 * @param {Buffer} buf whole lines
 * @param {Record<string, string>} pushes the latest push time by branch, updated
 */
function pushesIn(buf, pushes) {
    const seen = new Set();
    for (const needle of ["git push", "gh pr create"]) {
        for (let i = buf.indexOf(needle); i !== -1; i = buf.indexOf(needle, i + 1)) {
            const start = buf.lastIndexOf(10, i) + 1;
            if (seen.has(start)) continue;
            seen.add(start);
            const end = buf.indexOf(10, i);
            let e;
            try {
                e = JSON.parse(buf.toString("utf8", start, end === -1 ? buf.length : end));
            } catch {
                continue;
            }
            if (e?.type !== "assistant" || typeof e.timestamp !== "string") continue;
            for (const c of Array.isArray(e.message?.content) ? e.message.content : []) {
                if (c?.type !== "tool_use" || c.name !== "Bash" || typeof c.input?.command !== "string") continue;
                for (const b of pushedBranches(c.input.command)) {
                    if (!pushes[b] || Date.parse(pushes[b]) < Date.parse(e.timestamp)) pushes[b] = e.timestamp;
                }
            }
        }
    }
}

/**
 * Every transcript file of a session: `<sessionId>.jsonl` and its subagents' under `<sessionId>/subagents`.
 * @param {string} base the transcript without `.jsonl`
 * @returns {Promise<string[]>} the paths relative to `base`, `""` for the transcript itself
 */
async function transcriptFiles(base) {
    /** @type {string[]} */
    let subs = [];
    try {
        const names = await readdir(join(base, "subagents"), { recursive: true });
        subs = names.filter((n) => n.endsWith(".jsonl")).map((n) => join("subagents", n));
    } catch {
        // No subagents.
    }
    return ["", ...subs];
}

/**
 * Reads what was appended to the transcripts of each live session since the last poll, at most
 * `budget` bytes in all, the most recently changed files first, and records the branches each
 * session pushed. A session no longer live is forgotten. githerd's own workers are not scanned.
 * Claude Code keeps a session's transcript at `<projectsDir>/<cwd with every character other than
 * a letter or digit as "-">/<sessionId>.jsonl`.
 * ponytail: one offset per file in state; a 10k-file session is ~1 MB of state.json.
 * @param {Record<string, TranscriptScan>} scans the scans by session, updated in place
 * @param {Registered[]} sessions the live sessions
 * @param {{root: string, projectsDir: string, budget?: number}} opts the main checkout, Claude
 *   Code's projects directory and the byte budget
 */
export async function scanTranscripts(scans, sessions, { root, projectsDir, budget = TRANSCRIPT_BUDGET }) {
    const workers = join(root, ".worktrees", "githerd-");
    const live = sessions.filter((s) => s.cwd && !s.cwd.startsWith(workers));
    const ids = new Set(live.map((s) => s.sessionId));
    for (const id of Object.keys(scans)) if (!ids.has(id)) delete scans[id];
    /** @type {{scan: TranscriptScan, rel: string, path: string, size: number, mtime: number}[]} */
    const todo = [];
    for (const s of live) {
        const scan = (scans[s.sessionId] ??= { files: {}, pushes: {} });
        const base = join(projectsDir, /** @type {string} */ (s.cwd).replace(/[^A-Za-z0-9]/g, "-"), s.sessionId);
        for (const rel of await transcriptFiles(base)) {
            const path = rel ? join(base, rel) : `${base}.jsonl`;
            const st = await stat(path).catch(() => null);
            if (!st) continue;
            if (st.size < (scan.files[rel] ?? 0)) scan.files[rel] = 0;
            if (st.size > (scan.files[rel] ?? 0)) todo.push({ scan, rel, path, size: st.size, mtime: st.mtimeMs });
        }
    }
    todo.sort((a, b) => b.mtime - a.mtime);
    for (const { scan, rel, path, size } of todo) {
        if (budget <= 0) break;
        const fh = await open(path, "r").catch(() => null);
        if (!fh) continue;
        try {
            let offset = scan.files[rel] ?? 0;
            let carry = Buffer.alloc(0);
            while (offset + carry.length < size && budget > 0) {
                const want = Math.min(CHUNK, size - offset - carry.length, budget);
                const chunk = Buffer.alloc(want);
                const { bytesRead } = await fh.read(chunk, 0, want, offset + carry.length);
                if (!bytesRead) break;
                budget -= bytesRead;
                const buf = Buffer.concat([carry, chunk.subarray(0, bytesRead)]);
                const cut = buf.lastIndexOf(10) + 1;
                pushesIn(buf.subarray(0, cut), scan.pushes);
                offset += cut;
                carry = buf.subarray(cut);
                if (carry.length > MAX_LINE) {
                    offset += carry.length;
                    carry = Buffer.alloc(0);
                }
            }
            scan.files[rel] = offset;
        } finally {
            await fh.close();
        }
    }
}

/**
 * The push log's lines, oldest first; a torn line is skipped.
 * ponytail: read whole every poll; rotate the file if it ever grows past a few MB.
 * @param {string} file the log
 * @returns {PushLine[]} the pushes
 */
export function readPushLog(file) {
    let text;
    try {
        text = readFileSync(file, "utf8");
    } catch {
        return [];
    }
    const out = [];
    for (const line of text.split("\n")) {
        try {
            if (line.trim()) out.push(JSON.parse(line));
        } catch {
            // A torn line is no push.
        }
    }
    return out;
}

/**
 * Every process with its parent and cwd (null when unreadable).
 * @param {string} [procDir] the proc file system
 * @returns {Proc[]} the processes
 */
export function processTable(procDir = "/proc") {
    /** @type {Proc[]} */
    const out = [];
    for (const name of readdirSync(procDir)) {
        if (!/^\d+$/.test(name)) continue;
        try {
            const stat = readFileSync(join(procDir, name, "stat"), "utf8");
            const ppid = Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1]);
            let cwd = null;
            try {
                cwd = readlinkSync(join(procDir, name, "cwd"));
            } catch {
                // Another user's process, or gone.
            }
            out.push({ pid: Number(name), ppid, cwd });
        } catch {
            // Exited while read.
        }
    }
    return out;
}

/**
 * The worktrees with a branch checked out, from `git worktree list --porcelain`.
 * @param {string} porcelain git's output
 * @returns {{dir: string, branch: string}[]} the worktrees
 */
export function parseWorktrees(porcelain) {
    return porcelain
        .split("\n\n")
        .map((block) => block.split("\n"))
        .map((lines) => ({
            dir: (lines.find((l) => l.startsWith("worktree ")) ?? "").slice("worktree ".length),
            branch: (lines.find((l) => l.startsWith("branch refs/heads/")) ?? "").slice("branch refs/heads/".length),
        }))
        .filter((w) => w.dir && w.branch);
}

/**
 * The inferred owner of each open pull request that has one.
 * @param {Record<string, {headRef?: string}>} prs the open pull requests
 * @param {{root: string, pushLog: PushLine[], sessions: Registered[], procs: Proc[],
 *   worktrees: {dir: string, branch: string}[], transcripts?: Record<string, TranscriptScan>}} facts
 *   the main checkout, the push log, the live registered Claude Code sessions, the process table,
 *   the worktrees and what their transcripts showed (`scanTranscripts`)
 * @returns {Record<string, InferredOwner>} the owners, by pull request
 */
export function inferOwners(prs, { root, pushLog, sessions, procs, worktrees, transcripts = {} }) {
    const live = new Map(sessions.map((s) => [s.sessionId, s]));
    /** @type {Map<string, PushLine>} */
    const lastPush = new Map();
    for (const p of pushLog) if (p.branch) lastPush.set(p.branch, p);
    const children = new Map();
    for (const p of procs) children.set(p.ppid, [...(children.get(p.ppid) ?? []), p]);
    const cwdOf = new Map(procs.map((p) => [p.pid, p.cwd]));
    /**
     * The cwds of a session's process and every process under it.
     * @param {number} pid the session's process
     * @returns {string[]} the cwds
     */
    const cwds = (pid) => {
        const out = [cwdOf.get(pid)];
        for (const stack = [pid]; stack.length; ) {
            for (const c of children.get(stack.pop()) ?? []) {
                out.push(c.cwd);
                stack.push(c.pid);
            }
        }
        return /** @type {string[]} */ (out.filter(Boolean));
    };
    // The main checkout is everyone's, and githerd's own workers have their jobs.
    const ownWorktrees = worktrees.filter(
        (w) => w.dir !== root && !w.dir.startsWith(join(root, ".worktrees", "githerd-")),
    );
    const byPid = [...sessions].sort((a, b) => a.pid - b.pid);
    /** @type {Record<string, InferredOwner>} */
    const out = {};
    for (const [n, rec] of Object.entries(prs ?? {})) {
        if (!rec?.headRef) continue;
        const push = lastPush.get(rec.headRef);
        const pusher = push?.sessionId ? live.get(push.sessionId) : undefined;
        if (pusher && push) {
            const sha = push.sha ? ` ${push.sha.slice(0, 7)}` : "";
            const verb = push.exit === 0 ? "pushed" : "tried to push";
            const at = push.at ? ` at ${push.at.slice(11, 16)} UTC` : "";
            out[n] = { session: pusher.sessionId, name: pusher.name, evidence: `${verb}${sha}${at}` };
            continue;
        }
        const since = push?.at ? Date.parse(push.at) : -Infinity;
        let best = /** @type {{s: Registered, at: string} | undefined} */ (undefined);
        for (const [id, scan] of Object.entries(transcripts)) {
            const at = scan.pushes[rec.headRef];
            const s = live.get(id);
            if (!s || !at || Date.parse(at) < since) continue;
            if (!best || Date.parse(at) > Date.parse(best.at)) best = { s, at };
        }
        if (best) {
            const at = `${best.at.slice(0, 10)} ${best.at.slice(11, 16)} UTC`;
            out[n] = {
                session: best.s.sessionId,
                name: best.s.name,
                evidence: `pushed ${rec.headRef} (transcript, ${at})`,
            };
            continue;
        }
        for (const w of ownWorktrees.filter((x) => x.branch === rec.headRef)) {
            const s = byPid.find((x) => cwds(x.pid).some((c) => c === w.dir || c.startsWith(w.dir + sep)));
            if (s) {
                out[n] = { session: s.sessionId, name: s.name, evidence: `working in ${relative(root, w.dir)}` };
                break;
            }
        }
    }
    return out;
}
