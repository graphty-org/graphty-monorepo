/**
 * @file Runs on a session with no element: the session's own queue runs them one at a time, a
 * canceled run stops without stranding the runs behind it, and progress still reaches the run.
 */

import { afterEach, assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import {
    createLocalRunQueue,
    type Progress,
    type RunExecutionContext,
    type RunOutcome,
} from "../../../src/session/runs";
import { finishAtOnce } from "./harness";

const sessions: GraphSession[] = [];

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * A headless session over three nodes whose runs use the given executor.
 * @param execute - The executor.
 * @returns The session.
 */
async function headless(execute: (context: RunExecutionContext) => Promise<RunOutcome>): Promise<GraphSession> {
    const session = createGraphSession({ runs: { execute } });
    sessions.push(session);
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    return session;
}

describe("runs on a session with no element", () => {
    it("stop when canceled while running, and the run queued behind still runs", async () => {
        let markRunning: () => void = () => undefined;
        const running = new Promise<void>((resolve) => {
            markRunning = resolve;
        });
        const session = await headless(async (context) => {
            if (context.algorithm === "degree") {
                markRunning();
                // Works until it is told to stop, as a long algorithm does.
                await new Promise<void>((resolve) => {
                    context.signal.addEventListener("abort", () => {
                        resolve();
                    });
                });
                throw new DOMException("stopped", "AbortError");
            }
            return finishAtOnce(context);
        });

        const first = session.runs.start("degree");
        const second = session.runs.start("pagerank");
        await running;
        first.cancel();

        try {
            await first;
            assert.fail("a canceled run must not resolve");
        } catch (error) {
            assert.strictEqual((error as DOMException).name, "AbortError");
        }
        await second;
        assert.strictEqual(first.status, "canceled");
        assert.strictEqual(second.status, "succeeded");
    });

    it("drop a run canceled while it waits, without ever starting its work", async () => {
        let release: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        const started: string[] = [];
        const session = await headless(async (context) => {
            started.push(context.algorithm);
            if (context.algorithm === "degree") {
                await gate;
            }
            return finishAtOnce(context);
        });

        const first = session.runs.start("degree");
        const waiting = session.runs.start("pagerank");
        const last = session.runs.start("closeness");
        waiting.cancel();
        release();
        await first;
        await last;

        assert.strictEqual(waiting.status, "canceled");
        assert.deepStrictEqual(started, ["degree", "closeness"], "the canceled run's work never began");
    });

    it("publish a determinate step and its message on the run", async () => {
        const session = await headless(async (context) => {
            context.report({ completed: 1, total: 4, message: "counting" });
            await Promise.resolve();
            return finishAtOnce(context);
        });
        const seen: Progress[] = [];

        await session.runs.start("degree", {}, { onProgress: (progress) => seen.push(progress) });

        assert.isTrue(
            seen.some((progress) => progress.fraction === 0.25 && progress.message === "counting"),
            "a quarter done, with what it was doing, was published on the run",
        );
    });
});

describe("the queue a session with no element builds", () => {
    it("takes a canceled operation out before its turn, and runs the rest in order", async () => {
        const queue = createLocalRunQueue();
        const ran: string[] = [];
        const signals: AbortSignal[] = [];

        queue.queueOperation("algorithm-run", () => {
            ran.push("first");
        });
        const second = queue.queueOperation("algorithm-run", (context) => {
            signals.push(context.signal);
            ran.push("second");
        });
        queue.queueOperation("style-edit", () => {
            ran.push("third");
        });

        assert.isTrue(queue.cancelOperation(second), "there was something to stop");
        assert.isFalse(queue.cancelOperation(second), "and nothing the second time");
        await queue.settled();

        assert.deepStrictEqual(ran, ["first", "third"]);
        assert.lengthOf(signals, 0);
    });
});
