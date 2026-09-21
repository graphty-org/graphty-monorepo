/**
 * @file The queue a session runs on when nobody hands it one.
 *
 * This is NOT a second operation queue. The element has one -- `OperationQueueManager` -- and a
 * rendered graph hands it in, so a run takes its turn among the loads, the layouts and the style
 * passes that must not interleave with it. What this file answers is the other case: a session
 * with no renderer, in a Node test or on a server, where there is nothing to interleave with and
 * therefore nothing for a queue to order except the runs themselves.
 *
 * So it does exactly one thing the run machinery needs and nothing the element's queue does: it
 * runs one operation at a time, in the order they arrived, and it can stop one. No categories, no
 * triggers, no batching, no obsolescence, no events. If a behaviour beyond that is wanted in a
 * headless session, it belongs in the element's queue and the session should be handed that one.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { RunProgressSink, RunQueueContext } from "./Run";
import type { RunQueue } from "./RunsApi";

/**
 * Where a headless run's progress goes.
 *
 * Nowhere, on purpose. The queue's progress channel exists so the element's operation events carry
 * a run's progress to a consumer watching the graph; with no element there is no such consumer,
 * and the run publishes its own progress on itself regardless.
 */
const NO_PROGRESS: RunProgressSink = Object.freeze({
    setProgress: () => {
        // The run publishes its own progress; a headless queue has no events to carry it.
    },
    setMessage: () => {
        // The run publishes its own progress; a headless queue has no events to carry it.
    },
    setPhase: () => {
        // The run publishes its own progress; a headless queue has no events to carry it.
    },
});

/** One piece of work waiting its turn. */
interface LocalOperation {
    /** Its id, which is what cancelling names. */
    readonly id: string;
    /** The work. */
    readonly execute: (context: RunQueueContext) => Promise<void> | void;
    /** Aborted when the operation is cancelled. */
    readonly controller: AbortController;
    /** Whether its turn has come. */
    started: boolean;
}

/** A sequential queue with the surface a run needs and nothing else. */
class LocalRunQueue implements RunQueue {
    #counter = 0;

    #pending: LocalOperation[] = [];

    #draining = false;

    /**
     * Put work in the queue.
     * @param _category - Always "algorithm-run"; a headless queue orders nothing else.
     * @param execute - The work.
     * @returns The operation id.
     */
    queueOperation(_category: "algorithm-run", execute: (context: RunQueueContext) => Promise<void> | void): string {
        const id = `session-run-${this.#counter++}`;
        this.#pending.push({ id, execute, controller: new AbortController(), started: false });

        // A microtask rather than a synchronous call, so that `runs.start()` returns a queued run
        // before its work begins -- which is what lets a caller attach a progress handler and read
        // a queue position on the object it was just handed.
        queueMicrotask(() => {
            void this.#drain();
        });

        return id;
    }

    /**
     * Stop one queued or running operation.
     * @param operationId - The id `queueOperation` returned.
     * @returns True when there was something to stop.
     */
    cancelOperation(operationId: string): boolean {
        const found = this.#pending.find((operation) => operation.id === operationId);

        if (found === undefined) {
            return false;
        }

        found.controller.abort(new DOMException(`Operation "${operationId}" was canceled.`, "AbortError"));

        if (!found.started) {
            this.#pending.splice(this.#pending.indexOf(found), 1);
        }

        return true;
    }

    /**
     * Resolve once nothing is queued or running.
     *
     * The queue drains on a microtask, so a caller that asks the instant after queueing has to be
     * given a turn before the answer means anything: an empty queue that has not started draining
     * yet is not a settled one. Hence the turn before the check rather than an immediate return.
     * @returns A promise that resolves when the queue is empty.
     */
    async settled(): Promise<void> {
        do {
            await new Promise<void>((resolve) => {
                queueMicrotask(resolve);
            });
        } while (this.#draining || this.#pending.length > 0);
    }

    /** Run what is waiting, one at a time, until nothing is left. */
    async #drain(): Promise<void> {
        if (this.#draining) {
            return;
        }

        this.#draining = true;

        try {
            while (this.#pending.length > 0) {
                const next = this.#pending[0];
                next.started = true;

                try {
                    await next.execute({ signal: next.controller.signal, progress: NO_PROGRESS, id: next.id });
                } catch {
                    // A run records its own failure on itself. The queue's only duty is to keep
                    // going, because one failed run must not strand every run behind it.
                }

                this.#pending.shift();
            }
        } finally {
            this.#draining = false;
        }
    }
}

/**
 * Build the queue a session with no host queue runs on.
 * @returns The queue.
 */
export function createLocalRunQueue(): RunQueue {
    return new LocalRunQueue();
}
