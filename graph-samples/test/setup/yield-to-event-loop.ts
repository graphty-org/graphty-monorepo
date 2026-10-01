/**
 * One real macrotask turn before every test, so the worker's event loop reaches its poll phase.
 *
 * WHY THIS EXISTS. vitest 3.2.7 answers the main process over birpc, whose call timeout is a
 * hardcoded 60 s -- `DEFAULT_TIMEOUT = 6e4` in vitest/dist/chunks/index.B521nVV-.js, and neither
 * `createRuntimeRpc` nor `createForksRpcOptions` passes an override, so no config option, env var
 * or poolOption can change it. The timer is armed IN THE WORKER, synchronously, each time the
 * runner posts an `onTaskUpdate` (which it does not await; @vitest/runner throttles it to 100 ms).
 *
 * The audit suites are long chains of SYNCHRONOUS test bodies -- graph-format's wire-fuzz.test.ts
 * has 121 tests and not one `await`. Between two synchronous tests the runner only awaits
 * already-resolved promises, and those are MICROTASKS, so an entire file can run as one
 * uninterrupted event-loop block. The worker keeps posting onTaskUpdate over IPC but never reaches
 * the poll phase to READ the acknowledgements. When the file finally ends, libuv runs the timers
 * phase before the poll phase, so the expired 60 s timers fire before the queued acks are read and
 * the run dies with
 *
 *     Error: [vitest-worker]: Timeout calling "onTaskUpdate"
 *
 * with every test passing and exit code 1. The main process is healthy throughout and answers in
 * milliseconds; it simply loses a race it was never in.
 *
 * `setImmediate` runs in the check phase, after poll, so one turn per test lets the queued replies
 * be read and their timers cleared. It MUST be a macrotask: `await Promise.resolve()` is a
 * microtask and does nothing. This bounds any uninterrupted block by the longest SINGLE test
 * rather than by the whole file.
 *
 * Remove this once the monorepo is on vitest >= 4, which sets birpc's `timeout: -1`
 * (vitest-dev/vitest#8297, for issues #8164 and #11082).
 */

import { beforeEach } from "vitest";

/** Captured at module load so a test that installs fake timers cannot replace it. */
const realSetImmediate = setImmediate;

beforeEach(
    () =>
        new Promise<void>((resolve) => {
            realSetImmediate(resolve);
        }),
);
