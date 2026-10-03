/**
 * The notifier: delivers pages to the owner's phone through `notify.command` (design sections 5.5
 * and 13).
 *
 * `send()` only queues a page under its key; `flush()` delivers the queue and is meant to be
 * started by the poll loop without awaiting it, so a hung command never stalls a poll. A key is
 * delivered at most once. A failed delivery stays queued for the next flush, up to MAX_TRIES
 * attempts per key. After BROKEN_AFTER failures in a row `state.notify.brokenSince` is set, which
 * every status answer and tool result reports until a delivery succeeds.
 *
 * Pages that do not bypass the hourly cap (`notify.maxPerHour`) wait while the cap is used up, and
 * when more of them wait than the hour has room for, the last free slot carries them all as one
 * "and N more" message.
 *
 * A config with `held` set (the daemon sets it while the `owner-items` write group is not acting)
 * records every page in the ledger as `delivered: false` with that reason instead of running the
 * command, except a page sent with `always` (githerd is DOWN), which is still delivered.
 *
 * Everything the notifier remembers lives in the daemon's state object, so it survives a restart:
 * `state.notified[key]` (when a key was delivered, or logged with no command), and
 * `state.notify` = `{brokenSince, lastError, failures, pending, failed, recent}`.
 */

import { spawn } from "node:child_process";
import { homedir } from "node:os";

/** How long one run of the notify command may take before its process group is killed. */
export const TIMEOUT_MS = 15_000;
/** Attempts per key: the first delivery and 3 retries. */
export const MAX_TRIES = 4;
/** Failures in a row that mark notifications broken. */
export const BROKEN_AFTER = 3;
/** The longest message the notify command is given. */
export const MAX_MESSAGE = 200;

const HOUR_MS = 60 * 60 * 1000;
const SEVERITY = ["info", "done", "waiting", "error"];

/**
 * @typedef {"error" | "done" | "waiting" | "info"} NotifyStatus
 * @typedef {{key: string, status: NotifyStatus, message: string, bypass?: boolean, always?: boolean}} Page
 *   `bypass` skips the hourly cap; `always` delivers it even while pages are held
 * @typedef {{command: string[] | null, maxPerHour: number, held?: string}} NotifyConfig `held`: why
 *   pages are recorded instead of delivered
 * @typedef {{status: NotifyStatus, message: string, bypass: boolean, always?: boolean, tries: number,
 *   queuedAt: string}} Pending
 * @typedef {{code: number | null, stderr: string, timedOut: boolean, error?: string}} RunResult
 */

/**
 * Makes a message safe for the command: printable ASCII only, at most MAX_MESSAGE characters.
 * @param {string} message the message
 * @returns {string} the cleaned message
 */
function clean(message) {
    const ascii = message.replace(/\s+/g, " ").replace(/[^\x20-\x7e]/g, "?");
    return ascii.length > MAX_MESSAGE ? `${ascii.slice(0, MAX_MESSAGE - 3)}...` : ascii;
}

/**
 * Builds the argument vector: `~` expanded, `{status}` and `{message}` substituted.
 * @param {string[]} command the configured command
 * @param {string} status the status
 * @param {string} message the cleaned message
 * @returns {string[]} the argv to spawn
 */
function buildArgv(command, status, message) {
    return command.map((arg) => {
        const expanded = arg === "~" || arg.startsWith("~/") ? homedir() + arg.slice(1) : arg;
        return expanded.replace(/\{(status|message)\}/g, (_, name) => (name === "status" ? status : message));
    });
}

/**
 * Runs the command without a shell in its own process group, killing the whole group at the
 * timeout.
 * @param {string[]} argv the command and its arguments
 * @param {number} timeoutMs the timeout
 * @returns {Promise<RunResult>} how it ended
 */
function runCommand(argv, timeoutMs) {
    return new Promise((resolve) => {
        let stderr = "";
        let timedOut = false;
        let settled = false;
        /**
         * Resolves once, whichever of error and close comes first.
         * @param {RunResult} result the outcome
         */
        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(result);
        };
        const child = spawn(argv[0], argv.slice(1), { detached: true, stdio: ["ignore", "ignore", "pipe"] });
        const timer = setTimeout(() => {
            timedOut = true;
            try {
                process.kill(-child.pid, "SIGKILL");
            } catch {
                // the group is already gone
            }
        }, timeoutMs);
        child.stderr.setEncoding("utf8");
        child.stderr.on("data", (chunk) => {
            if (stderr.length < 4096) stderr += chunk;
        });
        child.on("error", (err) => finish({ code: null, stderr, timedOut, error: err.message }));
        child.on("close", (code) => finish({ code, stderr, timedOut }));
    });
}

/**
 * Says why a run failed, or null when it succeeded.
 * @param {RunResult} result the outcome
 * @param {number} timeoutMs the timeout it ran under
 * @returns {string | null} the reason
 */
function failure(result, timeoutMs) {
    if (result.timedOut) return `timed out after ${timeoutMs / 1000} s`;
    if (result.error) return result.error;
    if (result.code !== 0) return result.stderr.trim() || `exited with code ${result.code}`;
    return null;
}

/**
 * Creates the notifier.
 * @param {{
 *   notify: NotifyConfig | (() => NotifyConfig),
 *   state: any,
 *   ledger: (entry: {kind: string} & Record<string, unknown>) => unknown,
 *   now?: () => Date,
 *   timeoutMs?: number,
 * }} options `notify` is the config's `notify` section or a function returning the current one;
 *   `state` is the daemon state, mutated in place; `ledger` appends one ledger entry
 * @returns {{send: (page: Page) => boolean, flush: () => Promise<void>}} `send` queues a page and
 *   returns false when its key was already queued, delivered or given up; `flush` delivers the
 *   queue, and a call while one is running returns the running one
 */
export function createNotifier({ notify, state, ledger, now = () => new Date(), timeoutMs = TIMEOUT_MS }) {
    state.notified ??= {};
    state.notify ??= {};
    const n = state.notify;
    n.brokenSince ??= null;
    n.lastError ??= null;
    n.failures ??= 0;
    /** @type {Record<string, Pending>} */
    n.pending ??= {};
    n.failed ??= {};
    /** @type {string[]} delivery times of capped pages in the last hour */
    n.recent ??= [];
    const config = () => (typeof notify === "function" ? notify() : notify);
    /** @type {Promise<void> | null} */
    let running = null;

    /**
     * Delivers one message that stands for one or more keys.
     * @param {string[]} keys the keys it delivers
     * @param {NotifyStatus} status the status
     * @param {string} message the message
     * @param {boolean} capped whether it counts toward the hourly cap
     * @returns {Promise<boolean>} true when delivered (or logged with no command)
     */
    async function deliver(keys, status, message, capped) {
        const { command, held } = config();
        const at = now().toISOString();
        let hold = held && !keys.every((k) => n.pending[k]?.always) ? held : null;
        if (command === null) hold = "notify.command is null";
        if (hold) {
            for (const key of keys) {
                state.notified[key] = at;
                delete n.pending[key];
            }
            await ledger({ kind: "notify", keys, status, message, delivered: false, reason: hold });
            return true;
        }
        const result = await runCommand(buildArgv(command, status, message), timeoutMs);
        const reason = failure(result, timeoutMs);
        const done = now().toISOString();
        if (reason === null) {
            for (const key of keys) {
                state.notified[key] = done;
                delete n.pending[key];
            }
            if (capped) n.recent.push(done);
            n.failures = 0;
            n.brokenSince = null;
            n.lastError = null;
            ledger({ kind: "notify", keys, status, message, delivered: true });
            return true;
        }
        n.failures += 1;
        n.lastError = reason;
        if (n.failures >= BROKEN_AFTER) n.brokenSince ??= done;
        const gaveUp = [];
        for (const key of keys) {
            n.pending[key].tries += 1;
            if (n.pending[key].tries >= MAX_TRIES) {
                delete n.pending[key];
                n.failed[key] = done;
                gaveUp.push(key);
            }
        }
        ledger({ kind: "notify", keys, status, message, delivered: false, error: reason, gaveUp });
        return false;
    }

    /** Delivers the queue, stopping at the first failure so a broken command is tried once. */
    async function run() {
        const cutoff = now().getTime() - HOUR_MS;
        n.recent = n.recent.filter((t) => Date.parse(t) > cutoff);
        const entries = Object.entries(n.pending);
        for (const [key, page] of entries.filter(([, p]) => p.bypass)) {
            if (!(await deliver([key], page.status, page.message, false))) return;
        }
        const capped = entries.filter(([, p]) => !p.bypass);
        let slots = Math.max(0, config().maxPerHour - n.recent.length);
        while (capped.length > 0 && slots > 0) {
            const batch = slots === 1 ? capped.splice(0) : capped.splice(0, 1);
            const [, first] = batch[0];
            const status = batch.reduce(
                (worst, [, p]) => (SEVERITY.indexOf(p.status) > SEVERITY.indexOf(worst) ? p.status : worst),
                first.status,
            );
            const message =
                batch.length === 1
                    ? first.message
                    : `${first.message} (and ${batch.length - 1} more in githerd status)`;
            if (
                !(await deliver(
                    batch.map(([k]) => k),
                    status,
                    clean(message),
                    true,
                ))
            )
                return;
            slots -= 1;
        }
    }

    return {
        send({ key, status, message, bypass = false, always = false }) {
            if (state.notified[key] || n.failed[key] || n.pending[key]) return false;
            const queuedAt = now().toISOString();
            n.pending[key] = { status, message: clean(message), bypass, ...(always && { always }), tries: 0, queuedAt };
            return true;
        },
        flush() {
            running ??= run().finally(() => {
                running = null;
            });
            return running;
        },
    };
}
