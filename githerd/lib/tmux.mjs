/**
 * Worker windows on githerd's own tmux server (design sections 7.1, 7.5 and 7.8): starting a
 * worker, waiting for its registry entry, capturing its pane, the doorbell, and ending a session.
 *
 * githerd's server is `tmux -L githerd`, session `githerd`, one window per job named after it. The
 * registry's `tmux` field has no socket (platform facts 2.2), so githerd records the socket, window,
 * pane and pid itself when it starts a window. The window's command is `env -i ... claude ...`;
 * `env` execs claude, so the pane's pid is the session's pid and its registry file is
 * `~/.claude/sessions/<pid>.json`.
 *
 * No key reaches a pane before the pane is captured and read (`lib/screen.mjs`): text is typed only
 * into the empty prompt box, and Enter only once the typed text sits in the box.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { identify } from "./proc.mjs";
import { readScreen } from "./screen.mjs";

/** githerd's tmux server (`tmux -L githerd`). */
const SOCKET = "githerd";
/** The tmux session holding every worker window. */
const SESSION = "githerd";
/**
 * The size of githerd's session while no client is attached. A detached tmux session is 80 by 24
 * by default, which wraps a doorbell for a long job id onto a second line, and then the doorbell
 * never verifies; the captures of platform facts 7.3 were taken at this size.
 */
const SIZE = ["-x", "200", "-y", "50"];
/** How long a new session has to write its registry entry (design 7.1, step 5). */
const REGISTRY_MS = 30_000;
/** How long an idle session has to exit after `/exit` before it gets SIGTERM (design 7.8). */
const EXIT_MS = 30_000;
/** Between two looks at a registry file, a typed line or a process. */
const POLL_MS = 1000;
/** Looks at the pane after typing, before deciding the text did not land in the box. */
const TYPE_LOOKS = 10;
const TYPE_LOOK_MS = 200;

/**
 * @typedef {object} Window a worker's window, as recorded in the job's holder
 * @property {string} socket the tmux server (`-L`)
 * @property {string} window the window id (`@n`)
 * @property {string} pane the pane id (`%n`)
 * @property {number} pid the session's pid (the pane's)
 * @property {string} name the session's name, `githerd-<job>`
 */

/**
 * @typedef {object} Options how to reach tmux, the registry and the clock (tests replace them)
 * @property {string} [socket] the tmux server, default `githerd`
 * @property {string} [sessionsDir] the registry directory, default `~/.claude/sessions`
 * @property {(ms: number) => Promise<unknown>} [sleep] waits
 */

/**
 * Runs one tmux command on githerd's server.
 * @param {string} socket the server
 * @param {string[]} args the command and its arguments
 * @returns {string} what it printed
 */
function tmux(socket, args) {
    return execFileSync(
        "tmux", // NOSONAR(S4036): the owner's tmux from his own PATH, as tools/ runs git
        ["-L", socket, ...args],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
}

/**
 * Starts a worker's window and waits for its registry entry (design 7.1, steps 4 and 5). With no
 * entry within 30 s, the pane is captured and the window killed: a start failure, whose capture
 * shows the dialog that blocked it (design 3.5, "Session start blocked on a dialog").
 * @param {{job: string, cwd: string, argv: string[]} & Options} options the job, its worktree and
 *   the command line from `workerArgv`
 * @returns {Promise<{ok: true, window: Window, startTime: string, registry: any} |
 *   {ok: false, window: Window, capture: string}>} the window and its registry entry, or the
 *   capture of a failed start
 */
export async function startWorker({ job, cwd, argv, socket = SOCKET, sessionsDir = defaultSessions(), sleep = delay }) {
    try {
        tmux(socket, ["has-session", "-t", SESSION]);
    } catch {
        tmux(socket, ["new-session", "-d", "-s", SESSION, ...SIZE]);
    }
    const format = "#{window_id} #{pane_id} #{pane_pid}";
    const out = tmux(socket, [
        "new-window",
        "-d",
        "-P",
        "-F",
        format,
        "-t",
        `${SESSION}:`,
        "-n",
        job,
        "-c",
        cwd,
        ...argv,
    ]);
    const [id, pane, pid] = out.trim().split(" ");
    /** @type {Window} */
    const window = { socket, window: id, pane, pid: Number(pid), name: `githerd-${job}` };
    const startTime = identify(window.pid)?.startTime ?? "";
    for (let waited = 0; ; waited += POLL_MS) {
        const registry = readRegistry(sessionsDir, window.pid);
        if (registry) return { ok: true, window, startTime, registry };
        if (waited >= REGISTRY_MS) break;
        await sleep(POLL_MS);
    }
    const capture = capturePane(window);
    killWindow(window);
    return { ok: false, window, capture };
}

/**
 * The owner's session registry directory.
 * @returns {string} the path
 */
function defaultSessions() {
    return join(homedir(), ".claude", "sessions");
}

/**
 * A session's registry entry: `status` is `busy`, `idle` or `waiting` (with `waitingFor`).
 * @param {string} sessionsDir the registry directory
 * @param {number} pid the session's pid
 * @returns {any} the entry, or null when there is none
 */
export function readRegistry(sessionsDir, pid) {
    try {
        return JSON.parse(readFileSync(join(sessionsDir, `${pid}.json`), "utf8"));
    } catch {
        return null;
    }
}

/**
 * Whether the session githerd started is still running: same pid and start time, and not a zombie.
 * A session that exited stays a zombie until tmux reaps it, with its start time intact.
 * @param {number} pid the session's pid
 * @param {string} startTime its recorded start time
 * @returns {boolean} true while it runs
 */
export function running(pid, startTime) {
    let stat;
    try {
        stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    } catch {
        return false;
    }
    return !stat.slice(stat.lastIndexOf(")") + 2).startsWith("Z") && identify(pid)?.startTime === startTime;
}

/**
 * The pane's text as a person sees it, without colors.
 * @param {Window} window the window
 * @returns {string} the capture, or "" when the pane is gone
 */
export function capturePane(window) {
    try {
        return tmux(window.socket, ["capture-pane", "-p", "-t", window.pane]);
    } catch {
        return "";
    }
}

/**
 * Whether an attached client is looking at the window (platform facts 10.8): no doorbell then,
 * because the owner may be typing.
 * @param {Window} window the window
 * @returns {boolean} true when a client views it
 */
export function viewed(window) {
    const out = tmux(window.socket, ["list-windows", "-t", SESSION, "-F", "#{window_id} #{window_active_clients}"]);
    return out.split("\n").some((line) => {
        const [id, clients] = line.split(" ");
        return id === window.window && Number(clients) > 0;
    });
}

/**
 * Kills the window, if it is still there.
 * @param {Window} window the window
 */
function killWindow(window) {
    try {
        tmux(window.socket, ["kill-window", "-t", window.window]);
    } catch {
        // already gone
    }
}

/**
 * Types one line into the empty prompt box and submits it (design 7.5): the pane is read first and
 * nothing is typed unless it shows the empty box; the text is typed literally; the pane is read
 * again and Enter is sent only when the text sits in the box. Otherwise the line is cleared with
 * C-u and nothing is submitted.
 * @param {Window} window the window
 * @param {string} text the line
 * @param {(ms: number) => Promise<unknown>} sleep waits
 * @returns {Promise<{sent: boolean, why?: string, capture?: string}>} whether it was submitted,
 *   and if not, why, with the capture that decided it
 */
async function typeLine(window, text, sleep) {
    const before = capturePane(window);
    const screen = readScreen(before, window.name);
    if (screen.kind !== "empty-box") return { sent: false, why: screen.kind, capture: before };
    tmux(window.socket, ["send-keys", "-t", window.pane, "-l", text]);
    let after = "";
    for (let look = 0; look < TYPE_LOOKS; look++) {
        await sleep(TYPE_LOOK_MS);
        after = capturePane(window);
        const now = readScreen(after, window.name);
        if (now.kind === "owner-text" && now.text === text) {
            tmux(window.socket, ["send-keys", "-t", window.pane, "Enter"]);
            return { sent: true };
        }
        if (now.kind !== "empty-box" && now.kind !== "owner-text") break;
    }
    tmux(window.socket, ["send-keys", "-t", window.pane, "C-u"]);
    return { sent: false, why: "blocked by dialog", capture: after };
}

/**
 * The doorbell line (design 7.5). It carries no GitHub text; the nonce tells the UserPromptSubmit
 * hook it is githerd's and not the owner steering.
 * @param {string} nonce the worker's nonce (`GITHERD_NONCE`)
 * @param {string} job the job id
 * @returns {string} the line
 */
export function doorbellText(nonce, job) {
    return `[githerd ${nonce}] job ${job} has news. Call githerd_next.`;
}

/**
 * Rings a worker's doorbell (design 7.5): never while a client views the window, and only into
 * the empty prompt box; a doorbell that does not land in the box is cleared and recorded as
 * "doorbell blocked by dialog" with the capture.
 * @param {Window} window the window
 * @param {{nonce: string, job: string, sleep?: (ms: number) => Promise<unknown>}} bell the nonce
 *   and job
 * @returns {Promise<{rung: boolean, why?: string, capture?: string}>} whether it was rung; `why`
 *   is `viewed`, the screen's kind, or `doorbell blocked by dialog`
 */
export async function ring(window, { nonce, job, sleep = delay }) {
    if (viewed(window)) return { rung: false, why: "viewed" };
    const typed = await typeLine(window, doorbellText(nonce, job), sleep);
    if (typed.sent) return { rung: true };
    const why = typed.why === "blocked by dialog" ? "doorbell blocked by dialog" : typed.why;
    return { rung: false, why, capture: typed.capture };
}

/**
 * Sends Escape to a busy session that makes no progress (design 7.5), only when its pane shows no
 * dialog: a dialog takes the permission path and gets no key.
 * @param {Window} window the window
 * @returns {{sent: boolean, why?: string, capture?: string}} whether Escape was sent
 */
export function interrupt(window) {
    const capture = capturePane(window);
    const screen = readScreen(capture, window.name);
    if (screen.kind !== "empty-box" && screen.kind !== "owner-text") return { sent: false, why: screen.kind, capture };
    tmux(window.socket, ["send-keys", "-t", window.pane, "Escape"]);
    return { sent: true };
}

/**
 * Ends a worker's session (design 7.8): `/exit` when its pane shows the empty prompt box, SIGTERM
 * when it has not exited 30 s later or when it could not be typed to, then the window is killed.
 * Processes left in the worktree are the caller's to sweep.
 * @param {Window & {startTime: string}} window the window and the session's start time
 * @param {Options} [options] the clock
 * @returns {Promise<"exit" | "sigterm" | "gone">} how it ended
 */
export async function endSession(window, { sleep = delay } = {}) {
    const alive = () => running(window.pid, window.startTime);
    if (!alive()) {
        killWindow(window);
        return "gone";
    }
    let how = /** @type {"exit" | "sigterm"} */ ("sigterm");
    if ((await typeLine(window, "/exit", sleep)).sent) {
        for (let waited = 0; waited < EXIT_MS && alive(); waited += POLL_MS) await sleep(POLL_MS);
        if (!alive()) how = "exit";
    }
    if (how === "sigterm") {
        try {
            process.kill(window.pid, "SIGTERM");
        } catch {
            // exited meanwhile
        }
    }
    killWindow(window);
    return how;
}
