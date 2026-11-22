/**
 * @file The timeline's playback paths the rest of test/session/time leaves alone: smooth frames
 * that move nothing, a cumulative glide, a glide reaching the end, reduced motion, a play started
 * twice, a play whose window is cleared, and a re-run that fails under `results: "rerun"`. Frames
 * come from a stubbed `requestAnimationFrame` the test calls itself, and stepped plays from fake
 * timers, so no test waits on the wall clock. Also the one catalog branch of `defineLayout` that
 * needs no rendered graph: an "ordering" option.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { layoutDescriptor } from "../../catalog";
import { defineLayout } from "../../extend";
import { createGraphSession, type GraphSession, type RunChange } from "../../session";
import { GraphtyError } from "../../src/errors";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);
const CSV = "source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,2026-01-03\nD,E,2026-01-04\n";
/** A frame time far past any play's start: the glide clamps it to a tenth of a second. */
const LONG_AFTER = Number.MAX_SAFE_INTEGER;

/**
 * Stub the animation frame clock: frames are queued and the test runs them.
 * @returns The queued frames.
 */
function frameClock(): FrameRequestCallback[] {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame));
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    return frames;
}

/**
 * A session with four daily edges, `sent` designated and a one-day window.
 * @param window - Extra window fields.
 * @param window.from - Where the window starts.
 * @param window.mode - Sliding or cumulative.
 * @returns The session.
 */
async function daily(window: { from?: number; mode?: "sliding" | "cumulative" } = {}): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: "csv", config: { data: CSV } });
    await session.time.setField({ edges: { start: "sent" } });
    const from = window.from ?? T0;
    await session.time.window({
        from,
        to: from + DAY,
        step: "day",
        ...(window.mode === undefined ? {} : { mode: window.mode }),
    });
    return session;
}

/**
 * The next event of a kind.
 * @param session - The session.
 * @param name - The event.
 * @returns Its detail.
 */
function next(
    session: GraphSession,
    name: "time:end" | "time:pause" | "time:step" | "time:rerun-failed",
): Promise<unknown> {
    return new Promise((resolve) => {
        const off = session.on(name, (detail: unknown) => {
            off();
            resolve(detail);
        });
    });
}

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("session.time: a smooth play's frames", () => {
    it("grows a cumulative window's end by the frame's share of a step, keeping its start", async () => {
        const frames = frameClock();
        const session = await daily({ mode: "cumulative" });
        session.time.play({ motion: "smooth", interval: 200 });
        // A tenth of a second of a 200 ms interval: half a day.
        frames[0](LONG_AFTER);
        assert.strictEqual(session.time.current?.from, T0);
        assert.strictEqual(session.time.current?.to, T0 + DAY + DAY / 2);
        const recorded = next(session, "time:step");
        session.time.pause();
        await recorded;
        session.dispose();
    });

    it("moves nothing on a frame no later than the last, and asks for another", async () => {
        const frames = frameClock();
        const session = await daily();
        session.time.play({ motion: "smooth", interval: 100 });
        const before = session.time.current;
        frames[0](0);
        assert.deepEqual(session.time.current, before);
        assert.lengthOf(frames, 2);
        const recorded = next(session, "time:step");
        session.time.pause();
        await recorded;
        session.dispose();
    });

    it("stops at the last window and says so when it reaches the end without loop", async () => {
        const frames = frameClock();
        const session = await daily();
        await session.time.seek("end");
        const last = session.time.current;
        await session.time.stepBy(-1);
        const ended = next(session, "time:end");
        const paused = next(session, "time:pause");
        session.time.play({ motion: "smooth", interval: 100 });
        frames[0](LONG_AFTER);
        const end = (await ended) as { window: { from: number; to: number } };
        assert.strictEqual(end.window.from, last?.from);
        assert.strictEqual(end.window.to, last?.to);
        await paused;
        assert.isFalse(session.time.playing);
        assert.lengthOf(frames, 1, "no frame after the end");
        session.dispose();
    });

    it("ignores a frame that arrives after the play paused", async () => {
        const frames = frameClock();
        const session = await daily();
        session.time.play({ motion: "smooth", interval: 100 });
        const recorded = next(session, "time:step");
        session.time.pause();
        await recorded;
        const before = session.time.current;
        frames[0](LONG_AFTER);
        assert.deepEqual(session.time.current, before);
        assert.lengthOf(frames, 1);
        session.dispose();
    });
});

describe("session.time: choosing smooth or stepped motion", () => {
    it("steps on the timer when the reader asks for reduced motion", async () => {
        const frames = frameClock();
        vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)" }));
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const session = await daily();
        const stepped = next(session, "time:step");
        session.time.play({ motion: "smooth", interval: 100 });
        assert.lengthOf(frames, 0);
        await vi.advanceTimersByTimeAsync(100);
        const step = (await stepped) as { from: number; cause: string };
        assert.strictEqual(step.cause, "play");
        assert.strictEqual(step.from, T0 + DAY);
        session.time.pause();
        session.dispose();
    });

    it("keeps stepped motion for a later play that names none", async () => {
        const frames = frameClock();
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const session = await daily();
        session.time.play({ motion: "steps", interval: 100 });
        session.time.pause();
        session.time.play();
        assert.isTrue(session.time.playing);
        assert.lengthOf(frames, 0, "no frame loop: the play steps");
        session.time.pause();
        session.dispose();
    });

    it("does nothing when played while already playing", async () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const session = await daily();
        let plays = 0;
        session.on("time:play", () => plays++);
        session.time.play({ motion: "steps", interval: 100 });
        session.time.play({ motion: "steps", interval: 100, step: "nonsense" as never });
        assert.strictEqual(plays, 1);
        session.time.pause();
        session.dispose();
    });
});

describe("session.time: a stepped play whose window goes", () => {
    it("pauses at the next step when the window was cleared", async () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const session = await daily();
        session.time.play({ motion: "steps", interval: 100 });
        await session.time.window(null);
        const paused = next(session, "time:pause");
        await vi.advanceTimersByTimeAsync(100);
        await paused;
        assert.isFalse(session.time.playing);
        assert.isNull(session.time.current);
        session.dispose();
    });
});

describe("session.time: moving before any window is set", () => {
    /**
     * A session with `sent` designated and no window.
     * @returns The session.
     */
    async function unwindowed(): Promise<GraphSession> {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: CSV } });
        await session.time.setField({ edges: { start: "sent" } });
        return session;
    }

    it("opens the last window on a step back", async () => {
        const session = await unwindowed();
        const event = await session.time.stepBy(-1);
        assert.strictEqual(event.from, Date.UTC(2026, 0, 4));
        assert.isTrue(event.atEnd);
        session.dispose();
    });

    it("opens the first and the last window on seek to start and end", async () => {
        const first = await unwindowed();
        assert.strictEqual((await first.time.seek("start")).from, T0);
        first.dispose();
        const last = await unwindowed();
        assert.strictEqual((await last.time.seek("end")).from, Date.UTC(2026, 0, 4));
        last.dispose();
    });

    it("moves only the end of a cumulative window on a seek, never before its start", async () => {
        const session = await daily({ mode: "cumulative" });
        await session.time.seek(T0 + 2 * DAY);
        assert.strictEqual(session.time.current?.from, T0);
        assert.strictEqual(session.time.current?.to, T0 + 2 * DAY);
        await session.time.seek(T0 - DAY);
        assert.strictEqual(session.time.current?.to, T0, "an instant before the start ends it at the start");
        session.dispose();
    });
});

/**
 * A stand-in algorithm with one value per node.
 * @param context - The run.
 * @returns The outcome.
 */
function outcome(context: RunExecutionContext): RunOutcome {
    return {
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [
                {
                    name: "value",
                    plainName: "Value",
                    technicalName: "value",
                    kind: "node",
                    type: "number",
                    path: `results.${context.runId}.value`,
                },
            ],
            measured: { nodes: 1, edges: 0 },
            nodes: [{ id: "A", values: { value: 1 } }],
            edges: [],
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

describe("session.time: a re-run that fails under results: rerun", () => {
    /**
     * A session whose algorithm runs once, then throws what it is given on every re-run.
     * @param thrown - What a re-run throws.
     * @returns The session, after its first run.
     */
    async function failingRerun(thrown: unknown): Promise<{ session: GraphSession; id: string }> {
        let count = 0;
        const session = createGraphSession({
            runs: {
                execute: async (context) => {
                    count++;
                    await Promise.resolve();
                    if (count > 1) {
                        throw thrown;
                    }

                    return outcome(context);
                },
            },
        });
        await session.data.import({ type: "csv", config: { data: CSV } });
        await session.time.setField({ edges: { start: "sent" } });
        await session.time.setSettings({ results: "rerun" });
        await session.time.window({ from: T0, to: T0 + DAY, step: "day" });
        const run = session.runs.start("degree", undefined, { style: false });
        await run;
        return { session, id: run.id };
    }

    it("says which run failed, with the error's code and details", async () => {
        const error = new GraphtyError({
            code: "E_EXTENSION_FAILED",
            message: "degree: the re-run failed",
            source: "run",
            details: { extension: "degree", member: "run" },
        });
        const { session, id } = await failingRerun(error);
        const failed = next(session, "time:rerun-failed");
        const ended = new Promise<RunChange>((resolve) => {
            session.on("run:changed", (change) => {
                if (change.run.id === id && change.phase !== "start") {
                    resolve(change);
                }
            });
        });
        await session.time.stepBy(1);
        const detail = (await failed) as { run: string; error: { code: string; params: Record<string, unknown> } };
        assert.strictEqual(detail.run, id);
        assert.strictEqual(detail.error.code, "E_EXTENSION_FAILED");
        assert.strictEqual(detail.error.params.extension, "degree");
        await ended;
        session.dispose();
    });

    it("says a failure that is no GraphtyError is an internal one", async () => {
        const { session, id } = await failingRerun(new TypeError("not a function"));
        const failed = next(session, "time:rerun-failed");
        await session.time.stepBy(1);
        const detail = (await failed) as { run: string; error: { code: string } };
        assert.strictEqual(detail.run, id);
        assert.strictEqual(detail.error.code, "E_INTERNAL");
        session.dispose();
    });

    it("says nothing about a re-run canceled while it runs", async () => {
        let count = 0;
        let started!: () => void;
        const begun = new Promise<void>((resolve) => (started = resolve));
        const session = createGraphSession({
            runs: {
                execute: async (context) => {
                    count++;
                    if (count > 1) {
                        started();
                        return new Promise<RunOutcome>(() => undefined);
                    }

                    await Promise.resolve();
                    return outcome(context);
                },
            },
        });
        await session.data.import({ type: "csv", config: { data: CSV } });
        await session.time.setField({ edges: { start: "sent" } });
        await session.time.setSettings({ results: "rerun" });
        await session.time.window({ from: T0, to: T0 + DAY, step: "day" });
        const run = session.runs.start("degree", undefined, { style: false });
        await run;
        const failures: unknown[] = [];
        session.on("time:rerun-failed", (detail) => failures.push(detail));
        // A step waits for the re-runs it started, so the cancel has been handled once it settles.
        const stepped = session.time.stepBy(1);
        await begun;
        run.cancel();
        await stepped;
        assert.strictEqual(run.status, "canceled");
        assert.deepEqual(failures, []);
        session.dispose();
    });
});

describe("defineLayout: the catalog entry of an ordering option", () => {
    it("lists ordering among the structural inputs", () => {
        defineLayout({
            id: "test-ordering-input",
            options: { order: { type: "ordering" } },
            place: () => new Map(),
        });

        assert.deepEqual(layoutDescriptor("test-ordering-input")?.structuralInputs, ["ordering"]);
    });
});
