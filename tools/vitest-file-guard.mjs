// A vitest globalSetup (every config gets it through baseTest() in vitest.base.mjs) that ends a run
// when one test file has run for FILE_GUARD_MS, naming the file and the test it had reached (#5816).
//
// The test and wait guards are timers in the test's own thread (tools/test-wait-guard.mjs). A page
// blocked on a synchronous call never runs them, and a file of slow tests that each stay under the
// test guard never reaches them, and vitest has no limit of its own on either: both held a machine
// test slot for hours. This one runs in vitest's own process, which neither can block.
//
// It stops the process rather than cancelling the run: a cancel waits for the page to answer, which a
// blocked page never does. So this run writes no summary and no junit report, and tools/shard-verdict.mjs
// and tools/test-quarantine.mjs read it as a failed run.

import { spawnSync } from "node:child_process";
import process from "node:process";

import { FILE_GUARD_MS } from "./test-wait-guard.mjs";

const ATTACHED = Symbol.for("graphty.vitest-file-guard");

/**
 * What to print when a file outlasts its guard. The first test with no result is the one the file had
 * reached: a file's tests run in order, and a page sends a test's result whenever it can. A page
 * blocked within 100 ms of a test ending may not have sent that one, so then this is the test before.
 * @param testModule - vitest's TestModule
 * @param limit - the guard, in milliseconds
 * @returns the line
 */
export function hangMessage(testModule, limit) {
    const [reached] = testModule.children.allTests("pending");
    const where = reached ? `test: ${reached.fullName}` : "no test: it never finished importing";
    return `[HANG] ${testModule.relativeModuleId} ran past the ${limit / 1000} s file guard; it had reached ${where}`;
}

/** Tracks the running files; a vitest reporter, so it sees them from outside the page. */
export class FileGuard {
    /** Each running file by id: the latest TestModule, and when it was handed to its page or worker. */
    running = new Map();

    /**
     * Sets the limit and the clock.
     * @param options - the guard's parts
     * @param options.limit - how long a file may run, in milliseconds
     * @param options.now - the clock
     */
    constructor({ limit = FILE_GUARD_MS, now = Date.now } = {}) {
        this.limit = limit;
        this.now = now;
    }

    /**
     * A file started. A measurement carries no guard (tools/test-wait-guard.mjs).
     * @param testModule - vitest's TestModule
     */
    onTestModuleQueued(testModule) {
        if (!testModule.project.name.startsWith("bench")) {
            this.running.set(testModule.id, { testModule, since: this.now() });
        }
    }

    /**
     * A file's tests are known. Vitest makes a new TestModule for this: the queued one stays empty.
     * @param testModule - vitest's TestModule
     */
    onTestModuleCollected(testModule) {
        const entry = this.running.get(testModule.id);
        if (entry) {
            entry.testModule = testModule;
        }
    }

    /**
     * A file ended.
     * @param testModule - vitest's TestModule
     */
    onTestModuleEnd(testModule) {
        this.running.delete(testModule.id);
    }

    /**
     * Looks for a file past the guard.
     * @returns the message of the first one, or undefined
     */
    overdue() {
        for (const { testModule, since } of this.running.values()) {
            if (this.now() - since >= this.limit) {
                return hangMessage(testModule, this.limit);
            }
        }
        return undefined;
    }
}

/**
 * Ends this process with a failure: the browser and the workers first, since a worker in a loop never
 * sees its parent go.
 * @param logger - the vitest logger
 * @param message - what hung
 */
function stopRun(logger, message) {
    logger.error(message);
    spawnSync("pkill", ["-KILL", "-P", String(process.pid)]);
    process.exit(1);
}

/**
 * Puts the guard on a vitest instance, once.
 * @param vitest - the Vitest instance
 * @param options - FileGuard's options
 * @param every - how often to look, in milliseconds
 */
export function attach(vitest, options, every = 30_000) {
    if (vitest[ATTACHED]) {
        return;
    }
    vitest[ATTACHED] = true;
    const guard = new FileGuard(options);
    vitest.reporters.push(guard);
    setInterval(() => {
        const message = guard.overdue();
        if (message) {
            stopRun(vitest.logger, message);
        }
    }, every).unref();
}

/**
 * The globalSetup. Watch mode is an interactive developer, who can stop it.
 * @param project - the vitest TestProject
 */
export default function setup(project) {
    if (project?.vitest && !project.vitest.config?.watch) {
        attach(project.vitest);
    }
}
