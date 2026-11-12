// No #! line: every vitest config imports this through test-slots.mjs, and Vite's config loader
// prepends code to line 1, which turns a #! into a syntax error. Run it as `node tools/wait-log.mjs`.
/**
 * wait-log.mjs -- one machine-readable log of every wait in the pipeline, so the time a change spends
 * queued (for the landing lock, a gate slot, a browser slot, a test or GPU slot, a screenshot preview)
 * can be measured instead of guessed (design/ci/fast-pipeline.md, build order step 1).
 *
 * Each wait that ended is one JSON line in <main checkout>/tmp/waits.jsonl:
 *   { kind, start, end, ms, waiter, pid, heldBy, ...extra }
 * - kind: what was waited for: "land-lock" and "cut-lock" (tools/land.mjs), "gate-slot"
 *   (tools/push-queue.sh), "browser-slot" (tools/with-browser.sh), "test-slot" and "gpu-slot"
 *   (tools/test-slots.mjs), "preview-lock" (tools/visual-preview.sh). "land-lock-held" and
 *   "cut-lock-held" are the time a landing held the lock, from taking it to giving it back;
 *   "test-slot-held" and "gpu-slot-held" the time a test run held its slot, with `what` (its package
 *   or shard family) and `exit` (its exit code, null when unknown): every local test run, waited or not.
 * - start, end: ISO times; ms: end - start.
 * - waiter: who waited (its checkout and command); pid: its process.
 * - heldBy: who held what it waited for when the wait began, as each tool describes its holders.
 * Slots log a wait only when one happened, and every hold; the landing locks log every taking and every hold.
 *
 * PIPELINE_WAIT_LOG names another file (tests), and "off" turns the log off. A log that cannot be
 * written never fails or delays the waiter.
 *
 * Usage from a shell script, once the wait is over:
 *   node tools/wait-log.mjs <kind> <start, epoch milliseconds> <waiter> [<held by> ...]
 */

import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The log file: PIPELINE_WAIT_LOG, else tmp/waits.jsonl of the main checkout this file is in.
 * @param env the environment
 * @returns its path, or null when the log is off or there is no checkout
 */
export function waitLogFile(env = process.env) {
    if (env.PIPELINE_WAIT_LOG) {
        return env.PIPELINE_WAIT_LOG === "off" ? null : env.PIPELINE_WAIT_LOG;
    }
    try {
        const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
            cwd: dirname(fileURLToPath(import.meta.url)),
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
        return join(dirname(common), "tmp/waits.jsonl");
    } catch {
        return null;
    }
}

/**
 * Appends one wait to the log.
 * @param entry the wait
 * @param entry.kind what was waited for
 * @param entry.start when the wait began (epoch milliseconds)
 * @param [entry.end] when it ended (default now)
 * @param [entry.waiter] who waited (default: the working directory)
 * @param [entry.heldBy] who held it when the wait began
 * @param [entry.extra] more fields for the line
 * @param [file] the log file (default waitLogFile())
 */
export function logWait({ kind, start, end = Date.now(), waiter = process.cwd(), heldBy = [], extra = {} }, file) {
    const target = file === undefined ? waitLogFile() : file;
    if (!target) return;
    const line = {
        kind,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        ms: end - start,
        waiter,
        pid: process.pid,
        heldBy,
        ...extra,
    };
    try {
        mkdirSync(dirname(target), { recursive: true });
        appendFileSync(target, `${JSON.stringify(line)}\n`);
    } catch {
        // the log is for measuring; the waiter goes on without it
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const [kind, start, waiter, ...heldBy] = process.argv.slice(2);
    if (!kind || !/^\d+$/.test(start ?? "")) {
        console.error("usage: node tools/wait-log.mjs <kind> <start, epoch milliseconds> <waiter> [<held by> ...]");
        process.exit(2);
    }
    // The shell script that waited is the waiter, not this short-lived process.
    const extra = { pid: process.ppid };
    logWait({ kind, start: Number(start), waiter: waiter || process.cwd(), heldBy, extra });
}
