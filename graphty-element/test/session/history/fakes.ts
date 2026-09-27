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
 * - The layout is a fake engine (`fakeLayout`) that moves the lane only when told to: a step,
 *   a rest point and a GPU-style readback landing late are generated commands too.
 */

import type fc from "fast-check";

import type { NodeId } from "../../../src/catalog/types";
import { dispatcherOf } from "../../../src/session/GraphSession";
import type { ArrangementEngine } from "../../../src/session/project/arrangement";
import type { Scheduler } from "../../../src/session/project/Dispatcher";
import type { GraphSession } from "../../../src/session/types";

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
            const turn = immediate.has(category)
                ? Promise.resolve()
                : s.schedule(Promise.resolve(), `turn:${category}`);
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

/** A layout engine that moves the lane only when told to. */
export interface FakeLayout extends ArrangementEngine {
    /** Whether it is playing: a step moves nothing while it is not. */
    running: boolean;
    /** How many times it took the lane as its own. */
    readonly loads: number;
    /** The pins it was told of, in order. */
    readonly pins: readonly [NodeId, boolean][];
    /** Play, as `setRunning(true)` does. */
    play(): void;
    /** One frame: every unpinned row moves by one along each axis, written through the lane. */
    step(): void;
    /** Come to rest, as a settle or a pause does: a rest point. */
    settle(): void;
    /**
     * Submit a readback of the next frame, as a GPU layout does.
     * @returns Lands it: writes the rows straight into the lane, unless a restore has happened
     *     since it was submitted. True when it wrote.
     */
    readback(): () => boolean;
}

/**
 * A fake layout, registered as the session's arrangement engine. A row with no coordinate is
 * placed at its row number on its first step.
 * @param session - The session.
 * @returns The engine.
 */
export function fakeLayout(session: GraphSession): FakeLayout {
    const { arrangement } = dispatcherOf(session);
    const lane = session.data.store.positions;
    let generation = 0;
    let loads = 0;
    const pins: [NodeId, boolean][] = [];

    /**
     * The next frame's coordinates for every row.
     * @returns Stride 3.
     */
    const next = (): Float32Array => {
        const rows = session.snapshot().nodeCount;
        const out = new Float32Array(3 * rows);
        const at = { x: 0, y: 0, z: 0 };
        for (let row = 0; row < rows; row++) {
            lane.read(row, at);
            if (Number.isNaN(at.x)) {
                out.set([row, row, row], 3 * row);
            } else {
                const step = lane.isPinned(row) ? 0 : 1;
                out.set([at.x + step, at.y + step, at.z + step], 3 * row);
            }
        }

        return out;
    };

    /**
     * Write a frame straight into the lane, as a readback does, and say the lane moved.
     * @param frame - The coordinates.
     */
    const land = (frame: Float32Array): void => {
        lane.view(frame.length / 3).set(frame);
        lane.moved();
    };

    const engine: FakeLayout = {
        running: false,
        get loads() {
            return loads;
        },
        pins,
        suspend() {
            // A history call stops the layout and nothing computed before it may land after it.
            engine.running = false;
            generation++;
        },
        loadArrangement(restoring) {
            loads++;
            generation++;
            if (restoring) {
                engine.running = false;
            }
        },
        pin(id, pinned) {
            pins.push([id, pinned]);
        },
        play() {
            engine.running = true;
        },
        step() {
            if (engine.running) {
                land(next());
            }
        },
        settle() {
            engine.running = false;
            arrangement.rest();
        },
        readback() {
            const submitted = generation;
            const frame = next();
            return () => {
                if (submitted !== generation || frame.length !== 3 * session.snapshot().nodeCount) {
                    return false;
                }

                land(frame);
                return true;
            };
        },
    };
    arrangement.engine = engine;
    return engine;
}
