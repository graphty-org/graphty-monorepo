// reporter.mjs -- a Vitest reporter that sends each failed test to the results store as it happens
// (design/ci/channels-pipeline/results-service.md 5.2), so a job that dies later keeps its evidence.
//
// On when GRAPHTY_RESULTS_INVOCATION is set (tools/results/run-group.mjs sets it; vitest.ci-junit.mjs then adds
// this reporter). The invocation is `<GRAPHTY_RESULTS_INVOCATION>.<try>`, try 2 when TEST_LEDGER_RUN ends in
// `.retry` (tools/test-quarantine.mjs names its retry so). The first 20 failures go one event each, at once;
// after that one event every 5 s carries every failure since the last, so a broken setup failing thousands of
// tests sends a few events a minute. Nothing waits on the store: events are not awaited until the run ends, and
// each gives up after 2 s (client.mjs). Never changes the run's result.

import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { failureHashes } from "../results-service/src/signature.js";
import { config, flushHealth, postFailures } from "./client.mjs";

export const IMMEDIATE = 20;
export const BATCH_MS = 5000;
const MESSAGE_CHARS = 2000;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * The invocation id failure events belong to, or "" when the reporter is off.
 * @param [env] the environment
 * @returns the id
 */
export function invocationOf(env = process.env) {
    const base = env.GRAPHTY_RESULTS_INVOCATION;
    if (!base) return "";
    return `${base}.${env.TEST_LEDGER_RUN?.endsWith(".retry") ? 2 : 1}`;
}

/** The reporter. */
export default class ResultsReporter {
    /**
     * Reads its settings; sends nothing yet.
     * @param [options] `root` (test files are named relative to it, default the repository), `cfg` and `send`
     *   (tests replace the client), `env`
     */
    constructor(options = {}) {
        const env = options.env ?? process.env;
        this.invocation = invocationOf(env);
        this.cfg = options.cfg ?? (this.invocation ? config(env) : null);
        this.send = options.send ?? postFailures;
        this.root = options.root ?? ROOT;
        this.sent = 0;
        this.queue = [];
        this.pending = [];
        this.timer = null;
    }

    /**
     * Whether failures are sent: an invocation and a configured store.
     * @returns boolean
     */
    get on() {
        return Boolean(this.invocation && this.cfg);
    }

    /**
     * Sends or queues one failed test.
     * @param testCase Vitest's TestCase
     */
    onTestCaseResult(testCase) {
        const result = testCase.result();
        if (!this.on || result.state !== "failed") return;
        const error = result.errors?.[0];
        const file = relative(this.root, testCase.module.moduleId).split(sep).join("/");
        const message = `${error?.message ?? ""}\n${error?.stack ?? ""}`.trim().slice(0, MESSAGE_CHARS);
        // The store computes the status again from the message; the same function names it here.
        const failure = { file, name: testCase.fullName, status: failureHashes(message, file).status, message };
        if (this.sent < IMMEDIATE) {
            this.sent++;
            this.pending.push(this.send(this.cfg, this.invocation, [failure]));
            return;
        }
        this.queue.push(failure);
        this.timer ??= setTimeout(() => this.flush(), BATCH_MS);
        this.timer.unref?.();
    }

    /** Sends every queued failure as one event. */
    flush() {
        clearTimeout(this.timer);
        this.timer = null;
        if (this.queue.length === 0) return;
        this.pending.push(this.send(this.cfg, this.invocation, this.queue));
        this.queue = [];
    }

    /** Sends what is queued and settles every event; the run's result is never changed. */
    async onTestRunEnd() {
        this.flush();
        await Promise.allSettled(this.pending);
        await flushHealth();
    }
}
