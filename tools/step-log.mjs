/**
 * step-log.mjs -- how long the agent's pre-pull-request steps take, so they can be measured instead of guessed:
 * every step of `pnpm run check:quick` (tools/check-quick.sh) and tools/pr-open.sh with its fresh review.
 *
 * Each step that ended is one JSON line in <main checkout>/tmp/step-times.jsonl, in tmp/waits.jsonl's format
 * and written by its writer (tools/wait-log.mjs logWait):
 *   { kind, start, end, ms, waiter, pid, heldBy: [], what, exit }
 * - kind: "check-quick-step" (one step; `what` is its name), "check-quick" (the whole run),
 *   "pr-open" (the whole script), "pr-open-review" (its fresh-context review, tools/pr-review.sh).
 * - waiter: the checkout it ran in; pid: the script that ran it; exit: the step's exit code.
 *
 * PIPELINE_STEP_LOG names another file (tests), and "off" turns the log off. A log that cannot be
 * written never fails the step: this exits 0 whatever happens.
 *
 * Usage from a shell script, once the step is over:
 *   node tools/step-log.mjs <kind> <start, epoch milliseconds> <what> <exit code>
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { logWait, waitLogFile } from "./wait-log.mjs";

/**
 * The log file: PIPELINE_STEP_LOG, else tmp/step-times.jsonl beside the main checkout's tmp/waits.jsonl.
 * @param env the environment
 * @returns its path, or null when the log is off or there is no checkout
 */
export function stepLogFile(env = process.env) {
    if (env.PIPELINE_STEP_LOG) {
        return env.PIPELINE_STEP_LOG === "off" ? null : env.PIPELINE_STEP_LOG;
    }
    const waits = waitLogFile({});
    return waits ? join(dirname(waits), "step-times.jsonl") : null;
}

/**
 * Appends one step to the log, or nothing when its arguments are not a step.
 * @param argv kind, start (epoch milliseconds), what, exit code
 * @param env the environment
 * @returns whether a line was written (or the log is off)
 */
export function logStep(argv, env = process.env) {
    const [kind, start, what = "", exit = ""] = argv;
    if (!kind || !/^\d+$/.test(start ?? "")) return false;
    const file = stepLogFile(env);
    if (!file) return true;
    // The shell script that ran the step is the one to name, not this short-lived process.
    const extra = { pid: process.ppid, what, exit: /^\d+$/.test(exit) ? Number(exit) : null };
    logWait({ kind, start: Number(start), extra }, file);
    return true;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    try {
        logStep(process.argv.slice(2));
    } catch {
        // the log is for measuring; the step goes on without it
    }
}
