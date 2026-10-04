/**
 * The watchdog (design section 7.5): while a worker githerd started exists, one pass every 60 s
 * looks at each worker through local files, `/proc` and tmux only, and decides whether to ring its
 * doorbell, interrupt it, park its job on a permission prompt, recycle it, or leave it alone.
 *
 * Progress is any of: the session's transcript grew (its subagents' transcripts included); its
 * descendant processes used CPU; a declared local task's output grew; a push of the job is in the
 * queue; a `githerd_expect` window is open. CPU time is counted for the commands a session runs,
 * never for the claude process itself, which spends CPU redrawing while its command hangs
 * (platform facts 10.7), and never for its MCP servers, which are children of claude too and run
 * for the whole session.
 *
 * The rules (design 7.5, 3.5 and 5.5):
 * - a permission prompt, plan approval or picker is never answered: the job parks on one owner
 *   item and the window stays open for the owner;
 * - the usage-limit screen stops every start and is never typed into (design 8.3);
 * - idle while working: a doorbell; delivery counts only with progress within 15 minutes; two
 *   rings without progress recycle the session fresh;
 * - busy with no progress for 20 minutes: Escape (the next pass rings, as a status request); 10
 *   minutes later, still nothing, recycle fresh;
 * - no doorbell, Escape or recycle while a client views the window or the box holds the owner's
 *   unsent text; after 30 minutes of that, or at once when the session is due for recycling, the
 *   job continues in a new window and the old one is the owner's;
 * - a steered job is left alone; steering ends after 2 hours idle;
 * - an idle session that compacted 3 times or lived 12 hours is recycled fresh.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

import { livePushGroups } from "./actor/push.mjs";
import { endAttempt, move } from "./board.mjs";
import { raiseItem } from "./notify.mjs";
import { readScreen } from "./screen.mjs";
import { sweepWorktree } from "./session-death.mjs";
import { capturePane, endSession, interrupt, readRegistry, ring, running, viewed } from "./tmux.mjs";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
/** Busy with no progress this long: Escape. */
const STALL_MS = 20 * MINUTE;
/** After the Escape, still no progress this long: recycle. */
const AFTER_ESCAPE_MS = 10 * MINUTE;
/** A doorbell counts as delivered only with progress within this long. */
const RING_MS = 15 * MINUTE;
/** Rings without progress before the session is recycled. */
const RINGS = 2;
/** The owner's window or unsent text blocks the doorbell this long before the job moves on. */
const BLOCKED_MS = 30 * MINUTE;
/** A steered session idle this long is no longer steered (design 7.6). */
const STEERED_IDLE_MS = 2 * HOUR;
/** A session lives at most this long, and compacts at most this often, before it is recycled. */
const LIFETIME_MS = 12 * HOUR;
const COMPACTIONS = 3;

/** Shells: a direct child of claude running one is a Bash tool command or a hook. */
const SHELLS = new Set(["sh", "bash", "dash", "zsh"]);

/** The news a worker gets with the doorbell after an Escape. */
const STATUS_REQUEST =
    "githerd interrupted you: no progress for 20 minutes. Say what you were doing and continue, or " +
    "declare a long step with githerd_expect.";

/**
 * @typedef {{transcript: number, cpu: number, task: number}} Sample a worker's progress counters:
 *   transcript bytes, descendant CPU ticks, local task output bytes
 * @typedef {object} Look what one pass saw of a worker
 * @property {boolean} alive the session's process is the one githerd started
 * @property {any} registry its registry entry, or null
 * @property {import("./screen.mjs").Screen} screen its pane
 * @property {boolean} progressed it made progress since the last pass
 * @property {boolean} viewed a client views its window
 * @typedef {{action: "none" | "dead" | "usage-limit" | "park" | "ring" | "escape" | "recycle" |
 *   "hand-over" | "steering-ended", reason?: string}} Decision what to do
 */

/**
 * The transcripts of a session: its own and its subagents'.
 * @param {string} projectsDir Claude Code's projects directory (`~/.claude/projects`)
 * @param {string} cwd the session's working directory
 * @param {string} session the session id
 * @returns {string[]} the paths, existing or not
 */
export function transcriptFiles(projectsDir, cwd, session) {
    const dir = join(projectsDir, cwd.replaceAll(/[^A-Za-z0-9]/g, "-"));
    const subagents = join(dir, session, "subagents");
    let names = [];
    try {
        names = readdirSync(subagents).filter((n) => n.endsWith(".jsonl"));
    } catch {
        // no subagent has run
    }
    return [join(dir, `${session}.jsonl`), ...names.map((n) => join(subagents, n))];
}

/**
 * CPU ticks used by the commands a session ran: every process under a direct child of claude that
 * runs a shell, plus what claude's reaped children used. Claude's own time is left out, and so are
 * its other direct children, the MCP servers.
 * ponytail: a command child is recognized by its shell; an MCP server started through a shell
 * wrapper would count as work. Record each server's pid at SessionStart if one ever does.
 * @param {number} pid the session's pid
 * @param {string} [procRoot] `/proc`
 * @returns {number} the ticks
 */
export function descendantTicks(pid, procRoot = "/proc") {
    /** @type {Map<number, {ppid: number, own: number, reaped: number}>} */
    const procs = new Map();
    for (const name of readdirSync(procRoot)) {
        if (!/^\d+$/.test(name)) continue;
        let stat;
        try {
            stat = readFileSync(join(procRoot, name, "stat"), "utf8");
        } catch {
            continue;
        }
        // Fields after the parenthesized command name start at field 3: ppid is 4, utime 14,
        // stime 15, cutime 16, cstime 17.
        const f = stat
            .slice(stat.lastIndexOf(")") + 2)
            .split(" ")
            .map(Number);
        procs.set(Number(name), { ppid: f[1], own: f[11] + f[12], reaped: f[13] + f[14] });
    }
    const self = procs.get(pid);
    if (!self) return 0;
    /** @type {Map<number, number[]>} */
    const children = new Map();
    for (const [p, info] of procs) children.set(info.ppid, [...(children.get(info.ppid) ?? []), p]);
    const subtree = (/** @type {number} */ p) => {
        const info = /** @type {{own: number, reaped: number}} */ (procs.get(p));
        let sum = info.own + info.reaped;
        for (const c of children.get(p) ?? []) sum += subtree(c);
        return sum;
    };
    let ticks = self.reaped;
    for (const child of children.get(pid) ?? []) if (isCommand(procRoot, child)) ticks += subtree(child);
    return ticks;
}

/**
 * Whether a direct child of claude runs a command (a shell) rather than an MCP server.
 * @param {string} procRoot `/proc`
 * @param {number} pid the child
 * @returns {boolean} true for a shell
 */
function isCommand(procRoot, pid) {
    try {
        const argv0 = readFileSync(join(procRoot, String(pid), "cmdline"), "utf8").split("\0")[0];
        return SHELLS.has(basename(argv0));
    } catch {
        return false;
    }
}

/**
 * A file's size, 0 when it does not exist.
 * @param {string} path the file
 * @returns {number} bytes
 */
function size(path) {
    try {
        return statSync(path).size;
    } catch {
        return 0;
    }
}

/**
 * A worker's progress counters now.
 * @param {{pid: number, transcripts: string[], taskOutput?: string | null, procRoot?: string}} worker
 *   the session's pid, its transcripts, and a declared local task's output file
 * @returns {Sample} the counters
 */
export function sample({ pid, transcripts, taskOutput = null, procRoot = "/proc" }) {
    return {
        transcript: transcripts.reduce((sum, p) => sum + size(p), 0),
        cpu: descendantTicks(pid, procRoot),
        task: taskOutput ? size(taskOutput) : 0,
    };
}

/**
 * Whether any counter grew.
 * @param {Sample | undefined} before the last pass's counters
 * @param {Sample} after this pass's
 * @returns {boolean} true on growth
 */
function grew(before, after) {
    return (
        Boolean(before) && (after.transcript > before.transcript || after.cpu > before.cpu || after.task > before.task)
    );
}

/**
 * Decides what to do with one worker, and keeps the watchdog's bookkeeping in `job.watch`
 * (`progressAt`, `rings`, `escapedAt`, `blockedSince`). Carrying the decision out is the caller's.
 * @param {any} job the job
 * @param {Look} look what this pass saw
 * @param {Date} now the current time
 * @returns {Decision} what to do
 */
export function decide(job, look, now) {
    if (!look.alive) return { action: "dead" };
    const at = now.getTime();
    const since = (/** @type {string | null | undefined} */ iso) => (iso ? at - Date.parse(iso) : 0);
    job.watch ??= { progressAt: now.toISOString(), rings: [], escapedAt: null, blockedSince: null };
    const w = job.watch;
    if (look.progressed)
        Object.assign(w, { progressAt: now.toISOString(), rings: [], escapedAt: null, blockedSince: null });
    const { screen, registry } = look;
    const status = registry?.status;
    if (screen.kind === "usage-limit") return { action: "usage-limit" };
    if (job.steeredAt) {
        const quiet = Math.min(since(w.progressAt), since(job.steeredAt));
        return status === "idle" && quiet >= STEERED_IDLE_MS ? { action: "steering-ended" } : { action: "none" };
    }
    const dialog = ["permission", "plan", "picker"].includes(screen.kind) || status === "waiting";
    if (dialog) return job.state === "working" ? { action: "park" } : { action: "none" };
    const reason = status === "idle" ? worn(job, since) : null;
    if (reason) return recycleOrHandOver(look, reason);
    return job.state === "working" ? working(w, look, since, now) : { action: "none" };
}

/**
 * Whether the owner is at the window: a client views it, or his unsent text is in the box.
 * @param {Look} look what this pass saw
 * @returns {string | null} which, in words, or null when he is not
 */
function ownerAt(look) {
    if (look.viewed) return "the owner is viewing it";
    return look.screen.kind === "owner-text" ? "the owner's unsent text is in it" : null;
}

/**
 * A recycle, unless the owner is at the window: then the job moves to a new window and the old one
 * is left to him, never ended under his view or his unsent text (design 7.5).
 * @param {Look} look what this pass saw
 * @param {string} reason why the session should go
 * @returns {Decision} recycle or hand-over
 */
function recycleOrHandOver(look, reason) {
    const owner = ownerAt(look);
    return owner ? { action: "hand-over", reason: `${reason}; ${owner}` } : { action: "recycle", reason };
}

/**
 * Why an idle session has served long enough (design 5.5): 3 compactions in this job, or 12 hours.
 * Only a working or waiting job's session is recycled for it.
 * @param {any} job the job
 * @param {(iso: string | null | undefined) => number} since milliseconds since a time
 * @returns {string | null} the reason, or null
 */
function worn(job, since) {
    if (!["working", "waiting"].includes(job.state)) return null;
    if ((job.compactions ?? 0) >= COMPACTIONS) return `compacted ${job.compactions} times`;
    return since(job.holder?.startedAt) >= LIFETIME_MS ? "lived 12 hours" : null;
}

/**
 * The rules for a working job's session that shows no dialog: interrupt a stall, ring when idle,
 * recycle when neither helped, hand over a window the owner holds.
 * @param {any} w the job's watchdog bookkeeping
 * @param {Look} look what this pass saw
 * @param {(iso: string | null | undefined) => number} since milliseconds since a time
 * @param {Date} now the current time
 * @returns {Decision} what to do
 */
function working(w, look, since, now) {
    const status = look.registry?.status;
    if (w.escapedAt && since(w.escapedAt) >= AFTER_ESCAPE_MS) {
        return recycleOrHandOver(look, "no progress for 10 minutes after an interrupt");
    }
    if (status === "busy") {
        const stalled = !w.escapedAt && since(w.progressAt) >= STALL_MS;
        return stalled && !ownerAt(look) ? { action: "escape" } : { action: "none" };
    }
    if (status !== "idle") return { action: "none" };
    const last = w.rings.at(-1);
    if (last && since(last) < RING_MS) return { action: "none" };
    if (w.rings.length >= RINGS) return recycleOrHandOver(look, `${w.rings.length} doorbells brought no progress`);
    const owner = ownerAt(look);
    if (!owner) return { action: "ring" };
    w.blockedSince ??= now.toISOString();
    if (since(w.blockedSince) < BLOCKED_MS) return { action: "none" };
    return { action: "hand-over", reason: owner };
}

/**
 * @typedef {object} PassOptions where to look (tests replace them)
 * @property {string} [sessionsDir] the session registry, `~/.claude/sessions`
 * @property {string} [projectsDir] the transcripts, `~/.claude/projects`
 * @property {string} [procRoot] `/proc`
 * @property {(job: any) => boolean} [pushQueued] a push of the job is in the push queue
 * @property {(ms: number) => Promise<unknown>} [sleep] waits while typing
 */

/**
 * One watchdog pass over every worker githerd started (a job whose holder has a pane). Mutates the
 * state; the caller persists it and appends the ledger lines. A dead session is reported, not
 * handled: death and recovery are design 7.7.
 * @param {any} state the daemon state
 * @param {Date} now the current time
 * @param {PassOptions} [options] where to look
 * @returns {Promise<{workers: number, ledger: any[], dead: string[]}>} how many workers it looked
 *   at (the daemon stops the pass at none), the ledger lines and the jobs whose session is gone
 */
export async function watchPass(state, now, options = {}) {
    const {
        sessionsDir = join(homedir(), ".claude", "sessions"),
        projectsDir = join(homedir(), ".claude", "projects"),
        procRoot = "/proc",
        pushQueued = () => false,
        sleep,
    } = options;
    /** @type {any[]} */
    const ledger = [];
    /** @type {string[]} */
    const dead = [];
    let workers = 0;
    for (const job of Object.values(state.jobs ?? {})) {
        const h = job.holder;
        if (!h?.pane) continue;
        workers += 1;
        // A window can vanish between a capture and a keystroke, and tmux then fails: that worker
        // is left for the next pass, and the others are still looked at.
        try {
            const { window, look, counters } = lookAt(job, now, { sessionsDir, projectsDir, procRoot, pushQueued });
            const decision = decide(job, look, now);
            if (job.watch) job.watch.sample = counters;
            if (decision.action === "dead") dead.push(job.id);
            else await carryOut(state, job, window, { decision, screen: look.screen, now, sleep }, ledger);
        } catch (err) {
            ledger.push({
                kind: "watch-error",
                job: job.id,
                error: String(/** @type {Error} */ (err)?.message ?? err),
            });
        }
    }
    return { workers, ledger, dead };
}

/**
 * Looks at one worker: its process, registry entry, progress counters and pane.
 * @param {any} job the job, with a holder that has a pane
 * @param {Date} now the current time
 * @param {{sessionsDir: string, projectsDir: string, procRoot: string, pushQueued: (job: any) => boolean}} where
 *   where to look
 * @returns {{window: import("./tmux.mjs").Window, look: Look, counters: Sample}} the window, what was
 *   seen and this pass's counters
 */
function lookAt(job, now, { sessionsDir, projectsDir, procRoot, pushQueued }) {
    const h = job.holder;
    /** @type {import("./tmux.mjs").Window} */
    const window = { socket: h.socket, window: h.window, pane: h.pane, pid: h.pid, name: h.name };
    const alive = running(h.pid, h.startTime);
    const registry = alive ? readRegistry(sessionsDir, h.pid) : null;
    const session = registry?.sessionId ?? h.session;
    const cwd = registry?.cwd ?? job.worktree ?? "";
    const counters = sample({
        pid: h.pid,
        transcripts: session ? transcriptFiles(projectsDir, cwd, session) : [],
        taskOutput: job.waitingFor?.output ?? null,
        procRoot,
    });
    const expecting = Boolean(job.expect?.until) && Date.parse(job.expect.until) > now.getTime();
    const progressed = grew(job.watch?.sample, counters) || pushQueued(job) || expecting;
    /** @type {import("./screen.mjs").Screen} */
    const screen = alive ? readScreen(capturePane(window), h.name) : { kind: "unknown" };
    return { window, counters, look: { alive, registry, screen, progressed, viewed: alive && viewed(window) } };
}

/**
 * Carries out one decision.
 * @param {any} state the daemon state
 * @param {any} job the job
 * @param {import("./tmux.mjs").Window} window its window
 * @param {{decision: Decision, screen: import("./screen.mjs").Screen, now: Date,
 *   sleep?: (ms: number) => Promise<unknown>}} what the decision, the pane and the clock
 * @param {any[]} ledger where the ledger lines go
 */
async function carryOut(state, job, window, { decision, screen, now, sleep }, ledger) {
    const line = (/** @type {string} */ kind, extra = {}) => {
        ledger.push({ kind, job: job.id, ...extra });
    };
    /** @type {Record<string, () => Promise<void> | void>} */
    const handlers = {
        "usage-limit": () => {
            usageLimit(state, screen, now);
            line("usage-limit-screen", { resets: screen.resets ?? null, extraUsage: Boolean(screen.extraUsage) });
        },
        "steering-ended": () => {
            job.steeredAt = null;
            line("steering-ended");
        },
        park: () => {
            line("parked-on-permission", { item: park(state, job, screen, now) });
        },
        escape: () => {
            const sent = interrupt(window);
            if (sent.sent) {
                job.watch.escapedAt = now.toISOString();
                job.news.push({ at: now.toISOString(), text: STATUS_REQUEST, acked: false });
                line("escaped");
            } else {
                line("escape-blocked", { why: sent.why, capture: sent.capture });
            }
        },
        ring: async () => {
            const rang = await ring(window, { nonce: job.holder.nonce, job: job.id, sleep });
            if (rang.rung) {
                job.watch.rings.push(now.toISOString());
                line("doorbell");
            } else {
                line("doorbell-blocked", { why: rang.why, capture: rang.capture });
            }
        },
        recycle: async () => {
            const swept = await recycle(state, job, window, /** @type {string} */ (decision.reason), { now, sleep });
            line("recycled", { reason: decision.reason, ended: swept.ended.length, killed: swept.killed.length });
        },
        "hand-over": () => {
            job.holder = null;
            job.fresh = true;
            job.watch = null;
            // A waiting job keeps waiting with no session; `waiting` has no exit to `queued`.
            if (job.state === "working") {
                move(job, "queued", now, { reason: `continues in a new window: ${decision.reason}` });
            }
            line("window-left-to-owner", { window: window.name, reason: decision.reason });
        },
    };
    await handlers[decision.action]?.();
}

/**
 * The usage-limit screen (design 8.3): a usage stop, and with extra usage in use one owner item.
 * @param {any} state the daemon state
 * @param {import("./screen.mjs").Screen} screen the screen
 * @param {Date} now the current time
 */
function usageLimit(state, screen, now) {
    if (state.apiStop?.kind !== "usage") {
        state.apiStop = {
            kind: "usage",
            error: "usage-limit screen",
            at: now.toISOString(),
            resets: screen.resets ?? null,
        };
    }
    if (screen.extraUsage) {
        raiseItem(
            state,
            {
                id: "extra-usage",
                kind: "money",
                question: "A worker's screen says extra usage is in use. githerd starts no worker until you look.",
                blocks: "workers",
            },
            now,
        );
    }
}

/**
 * Parks a working job on a permission prompt (design 3.5): one owner item naming the exact allow
 * rule when the dialog shows one; the window stays open so the owner can answer it in tmux.
 * @param {any} state the daemon state
 * @param {any} job the job
 * @param {import("./screen.mjs").Screen} screen the screen
 * @param {Date} now the current time
 * @returns {string} the item id
 */
function park(state, job, screen, now) {
    const id = `permission-${job.id}`;
    const from = screen.agent ? ` from its ${screen.agent} subagent` : "";
    const asks = screen.rule ? ` for ${screen.rule}` : "";
    const what = screen.kind === "permission" ? "permission prompt" : "dialog";
    raiseItem(
        state,
        {
            id,
            kind: "permission rule",
            question:
                `The worker for job ${job.id} is waiting on a ${what}${from}${asks}. Answer it in its window ` +
                "(githerd attach), or allow it for every worker.",
            options: screen.rule
                ? [
                      {
                          choice: `githerd answer ${id} allow (adds ${screen.rule} for every worker)`,
                          undo: "remove the rule from the allow overlay",
                      },
                  ]
                : [],
        },
        now,
    );
    move(job, "parked", now, { waitingFor: { owner: id }, reason: "waiting on a permission prompt" });
    return id;
}

/**
 * Recycles a session fresh (design 5.5): a working job's attempt ends with the reason; a waiting
 * job keeps waiting with no session; the session is ended, and then every process it left in the
 * worktree (design 7.8), except the daemon's own push for the job, which must survive it.
 * ponytail: a waiting job's recycle ends no attempt, because `waiting` has no exit to `queued`;
 * count it once waiting jobs can be requeued.
 * @param {any} state the daemon state, for the job's running push
 * @param {any} job the job
 * @param {import("./tmux.mjs").Window} window its window
 * @param {string} reason why
 * @param {{now: Date, sleep?: (ms: number) => Promise<unknown>}} when the clock and the wait
 * @returns {Promise<{ended: number[], killed: number[]}>} what the sweep ended
 */
async function recycle(state, job, window, reason, { now, sleep }) {
    const holder = job.holder;
    if (job.state === "working") endAttempt(job, { outcome: `session recycled: ${reason}` }, now);
    job.holder = null;
    job.fresh = true;
    job.watch = null;
    await endSession({ ...window, startTime: holder.startTime }, sleep ? { sleep } : {});
    if (!job.worktree || !existsSync(job.worktree)) return { ended: [], killed: [] };
    return sweepWorktree(job.worktree, { spareGroups: livePushGroups(state, job.id), ...(sleep ? { sleep } : {}) });
}
