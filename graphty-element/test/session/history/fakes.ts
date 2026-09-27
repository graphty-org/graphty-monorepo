/**
 * @file What the random-sequence model runs a session on instead of the real queue and the wall
 * clock, so every interleaving it finds replays from its seed, on any machine, under coverage.
 *
 * - The clock of the coalescing window moves only when the model says so: "advance within the
 *   window" and "advance past it" are generated commands like any other.
 * - The scheduler hands every queued command's turn to fast-check's scheduler, which decides
 *   when each turn comes and shrinks the order with the seed. fast-check releases a scheduled
 *   promise only between commands, never while a command's `run` is still going, so a command
 *   must not await a queued dispatch it made itself: it dispatches, and a later command (or the
 *   end of the sequence) observes the result.
 *
 * The fake accelerator whose completion the scheduler controls arrives with runs as steps
 * (design/undo/undo-plan.md, phase 15): until then no op in the model computes anything.
 */

import type fc from "fast-check";

import type { Scheduler } from "../../../src/session/project/Dispatcher";

/** A clock that stands still until it is moved. */
export interface FakeClock {
    /** @returns The time, in milliseconds. */
    now(): number;
    /**
     * Move the clock on.
     * @param ms - How far.
     */
    advance(ms: number): void;
}

/**
 * A clock starting at zero.
 * @returns The clock.
 */
export function fakeClock(): FakeClock {
    let time = 0;

    return {
        now: () => time,
        advance: (ms) => {
            time += ms;
        },
    };
}

/**
 * A queue whose every turn is a promise fast-check's scheduler releases, except for the
 * categories named, whose turn comes at the next microtask: a command can then await its own
 * dispatch of one of them.
 * @param s - The scheduler of the property run.
 * @param immediate - The queue categories whose turn is not left to fast-check.
 * @returns The queue, as the dispatcher takes it.
 */
export function fakeScheduler(s: fc.Scheduler, immediate: ReadonlySet<string> = new Set()): Scheduler {
    return {
        enqueue(category, onTurn) {
            const controller = new AbortController();
            const turn = immediate.has(category) ? Promise.resolve() : s.schedule(Promise.resolve(), `turn:${category}`);
            void turn.then(async () => {
                if (!controller.signal.aborted) {
                    await onTurn();
                }
            });

            return {
                signal: controller.signal,
                cancel: () => {
                    controller.abort(new DOMException("The queue dropped this turn.", "AbortError"));
                },
            };
        },
    };
}
