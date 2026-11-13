/**
 * Calendar steps, bins and text with no offset read in a named zone: the day a daylight-saving
 * change shortens, a midnight it removes, and BCE years, on a real session over imported data.
 */

import { afterAll, afterEach, assert, beforeAll, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { GraphtyError } from "../../../src/errors";
import { setDefaultFeatures } from "../../../src/features/resolve";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { addSteps, alignTo, readInstant } from "../../../src/session/time/parse";
import { wallClock } from "../../../src/session/time/zone";

const NEW_YORK = "America/New_York";
const KOLKATA = "Asia/Kolkata";
const LOS_ANGELES = "America/Los_Angeles";
const TOKYO = "Asia/Tokyo";
/** Clocks here went forward at midnight, so some days have no 00:00. */
const HAVANA = "America/Havana";
const APIA = "Pacific/Apia";
/** A name no engine knows as a zone. */
const BAD_ZONE = "Mars/Olympus";
const HOUR = 3_600_000;
const OFF = { features: [] };

// The timeline is an experiment: this file's sessions switch it on, unless they name their own.
beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

/**
 * A session whose edges each carry one value in the column `at`.
 * @param values - The values.
 * @param options - The session's options.
 * @param options.features - The experiments it runs with.
 * @returns The session.
 */
async function edgesAt(
    values: readonly (number | string)[],
    options: { readonly features?: readonly string[] } = {},
): Promise<GraphSession> {
    const session = createGraphSession(options);
    const edges = values.map((at, index) => ({ source: `n${String(index)}`, target: "hub", at }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ edges }) } });

    return session;
}

/** Four clock times over two days, and the first of those days as text bounds. */
const DAY_ROWS = ["2026-01-15T00:00:00", "2026-01-15T03:00:00", "2026-01-15T08:00:00", "2026-01-16T02:00:00"];
const DAY_WINDOW = { attribute: "at", from: "2026-01-15", to: "2026-01-16" };

/** A half year of instants, a few hours apart from midnight in several zones. */
const SPREAD = Array.from({ length: 180 }, (_, day) => Date.UTC(2026, 0, 1 + day, (day * 7) % 24));

/**
 * A stand-in algorithm with one value.
 * @param context - The run.
 * @returns Its outcome.
 */
async function oneNodeResult(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
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

/**
 * The code and reason a call was refused with.
 * @param call - The call.
 * @returns The code and reason, or null when it was not refused.
 */
async function refusal(call: () => unknown): Promise<readonly [string, unknown] | null> {
    try {
        await call();
    } catch (error) {
        assert.instanceOf(error, GraphtyError);
        return [error.code, error.details?.reason];
    }

    return null;
}

/**
 * The fields of an instant in a zone, read straight from `Intl` and not through the code under test.
 * @param at - The instant.
 * @param zone - The zone.
 * @returns The day of the month and the time of day as hh:mm:ss.
 */
function readInZone(at: number, zone: string): { readonly day: number; readonly time: string } {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(at);
    const part = (type: string): string => parts.find((each) => each.type === type)?.value ?? "";

    return { day: Number(part("day")), time: `${part("hour")}:${part("minute")}:${part("second")}` };
}

describe("calendar steps in a zone", () => {
    it("clamps a month to the last day, at midnight in the zone", async () => {
        const session = await edgesAt(SPREAD);
        await session.time.setField({ edges: { start: "at" } });
        await session.time.window({
            from: Date.UTC(2025, 11, 31, 5),
            to: Date.UTC(2026, 0, 31, 5),
            step: "month",
            timeZone: NEW_YORK,
        });
        const moved = await session.time.stepBy(1);
        assert.strictEqual(moved.from, Date.UTC(2026, 0, 31, 5));
        assert.strictEqual(moved.to, Date.UTC(2026, 1, 28, 5));
        session.dispose();
    });

    it("moves a week on the wall clock, so one across the change is 167 hours", async () => {
        const session = await edgesAt(SPREAD);
        await session.time.setField({ edges: { start: "at" } });
        await session.time.window({
            from: Date.UTC(2026, 1, 23, 5),
            to: Date.UTC(2026, 2, 2, 5),
            step: "week",
            timeZone: NEW_YORK,
        });
        const moved = await session.time.stepBy(1);
        assert.strictEqual(moved.to - moved.from, 167 * HOUR);
        assert.strictEqual(moved.index, Math.round((moved.from - alignTo(SPREAD[0], "week", NEW_YORK)) / (168 * HOUR)));
        session.dispose();
    });

    it("keeps an hour absolute, and on the zone's whole hours", () => {
        const beforeChange = Date.UTC(2026, 2, 8, 6, 30);
        assert.strictEqual(addSteps(beforeChange, "hour", 1, NEW_YORK), beforeChange + HOUR);
        assert.strictEqual(alignTo(Date.UTC(2026, 0, 1, 12, 10), "hour", KOLKATA), Date.UTC(2026, 0, 1, 11, 30));
    });

    it("steps back over a day the zone skipped", () => {
        // Samoa crossed the date line: December 30, 2011 never happened there.
        const dec31 = Date.UTC(2011, 11, 30, 10);
        assert.strictEqual(addSteps(dec31, "day", -1, APIA), Date.UTC(2011, 11, 29, 10));
        assert.strictEqual(addSteps(Date.UTC(2011, 11, 29, 10), "day", 1, APIA), dec31);
    });

    it("keeps a day's first moment on the first moment of the next, where midnight was removed", () => {
        // Havana went from 23:59 on March 7, 2026 to 01:00 on March 8.
        const first = alignTo(Date.UTC(2026, 2, 8, 12), "day", HAVANA);
        assert.strictEqual(readInZone(first, HAVANA).time, "01:00:00");
        assert.strictEqual(readInZone(addSteps(first, "day", 1, HAVANA), HAVANA).time, "00:00:00");
    });

    it("walks 400 years of months onto day 1 at 00:00, or the first moment of a day with no midnight", () => {
        let seed = 20_260_308;
        const next = (limit: number): number => {
            seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;

            return seed % limit;
        };
        for (const zone of [NEW_YORK, KOLKATA, HAVANA, "Asia/Beirut", "Australia/Lord_Howe", "Europe/London"]) {
            let at = alignTo(Date.UTC(1700 + next(100), next(12), 15), "month", zone);
            for (let step = 0; step < 4800; step++) {
                const { day, time } = readInZone(at, zone);
                const firstMoment = readInZone(at - 1, zone).day !== day;
                assert.isTrue(
                    day === 1 && (time === "00:00:00" || firstMoment),
                    `${zone} ${new Date(at).toISOString()}`,
                );
                at = addSteps(at, "month", 1, zone);
            }
        }
    });

    it("takes the call's zone, then the window's, then the setting's", async () => {
        const session = await edgesAt(SPREAD);
        await session.time.setField({ edges: { start: "at" } });
        await session.time.setSettings({ timeZone: LOS_ANGELES });
        const start = (zone?: string): number | undefined =>
            session.time.bins({ step: "day", ...(zone === undefined ? {} : { timeZone: zone }) })?.[0].start;

        assert.strictEqual(start(), alignTo(SPREAD[0], "day", LOS_ANGELES));
        await session.time.window({ from: SPREAD[0], to: SPREAD[1], timeZone: NEW_YORK });
        assert.strictEqual(start(), alignTo(SPREAD[0], "day", NEW_YORK));
        assert.strictEqual(start(KOLKATA), alignTo(SPREAD[0], "day", KOLKATA));
        session.dispose();
    });

    it("snaps a sliding window to a new zone as to a new step", async () => {
        const session = await edgesAt(SPREAD);
        await session.time.setField({ edges: { start: "at" } });
        await session.time.setSettings({ step: "month" });
        const first = await session.time.stepBy(1);
        assert.strictEqual(first.from, Date.UTC(2026, 0, 1));

        await session.time.stepBy(1);
        await session.time.setSettings({ timeZone: NEW_YORK });
        assert.strictEqual(session.time.current?.timeZone, NEW_YORK);
        assert.strictEqual(session.time.current?.from, Date.UTC(2026, 0, 1, 5));
        assert.strictEqual(session.time.current?.to, Date.UTC(2026, 1, 1, 5));
        session.dispose();
    });

    it("opens the first calendar month of the example, midnight to midnight in New York", async () => {
        const session = await edgesAt(["2026-01-15T12:00:00", "2026-03-20T12:00:00"]);
        await session.time.setField({ edges: { start: "at", parseZone: NEW_YORK } });
        await session.time.setSettings({ step: "month", timeZone: NEW_YORK });
        const moved = await session.time.stepBy(1);
        assert.strictEqual(moved.from, Date.UTC(2026, 0, 1, 5));
        assert.strictEqual(moved.to, Date.UTC(2026, 1, 1, 5));
        session.dispose();
    });

    it("plays in the zone it was given, and writes it on the window", async () => {
        const session = await edgesAt(SPREAD);
        await session.time.setField({ edges: { start: "at" } });
        const stepped = new Promise((resolve) => {
            session.on("time:step", resolve);
        });
        session.time.play({ step: "day", timeZone: KOLKATA, motion: "steps" });
        await stepped;
        session.time.pause();
        assert.strictEqual(session.time.current?.timeZone, KOLKATA);
        assert.strictEqual(session.time.current?.from, alignTo(SPREAD[0], "day", KOLKATA));
        session.dispose();
    });
});

describe("a window in its own zone, under another setting", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    /**
     * A session whose window reads in Kolkata while the setting says Los Angeles.
     * @returns The session.
     */
    async function kolkataWindow(): Promise<GraphSession> {
        const session = await edgesAt(SPREAD);
        await session.time.setField({ edges: { start: "at" } });
        await session.time.setSettings({ timeZone: LOS_ANGELES });
        await session.time.window({ from: SPREAD[0], to: SPREAD[1], step: "day", timeZone: KOLKATA });

        return session;
    }

    /**
     * The next `count` steps a session takes.
     * @param session - The session.
     * @param count - How many.
     * @returns A promise that settles on the last of them.
     */
    function steps(session: GraphSession, count: number): Promise<void> {
        let left = count;

        return new Promise((resolve) => {
            session.on("time:step", () => {
                left--;
                if (left === 0) {
                    resolve();
                }
            });
        });
    }

    it("seeks to the start and the end on the window's day boundaries", async () => {
        const session = await kolkataWindow();
        await session.time.seek("start");
        assert.strictEqual(session.time.current?.from, alignTo(SPREAD[0], "day", KOLKATA));
        assert.strictEqual(session.time.current?.timeZone, KOLKATA);
        await session.time.seek("end");
        assert.strictEqual(session.time.current?.from, alignTo(SPREAD[179], "day", KOLKATA));
        assert.strictEqual(session.time.current?.timeZone, KOLKATA);
        session.dispose();
    });

    it("keeps the window's zone when play at the end starts again", async () => {
        const session = await kolkataWindow();
        await session.time.seek("end");
        const restarted = steps(session, 1);
        session.time.play({ motion: "steps" });
        await restarted;
        session.time.pause();
        assert.strictEqual(session.time.current?.from, alignTo(SPREAD[0], "day", KOLKATA));
        assert.strictEqual(session.time.current?.timeZone, KOLKATA);
        session.dispose();
    });

    it("keeps the window's zone when a loop starts again", async () => {
        const session = await kolkataWindow();
        await session.time.seek("end");
        await session.time.stepBy(-1);
        const looped = steps(session, 2);
        session.time.play({ motion: "steps", loop: true, interval: 1 });
        await looped;
        session.time.pause();
        assert.strictEqual(session.time.current?.from, alignTo(SPREAD[0], "day", KOLKATA));
        assert.strictEqual(session.time.current?.timeZone, KOLKATA);
        session.dispose();
    });

    it("keeps the window's zone when a smooth loop starts again", async () => {
        const frames: FrameRequestCallback[] = [];
        vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame));
        vi.stubGlobal("cancelAnimationFrame", () => undefined);
        const session = await kolkataWindow();
        await session.time.seek("end");
        await session.time.stepBy(-1);
        session.time.play({ motion: "smooth", loop: true, interval: 100 });
        // One frame a tenth of a second on moves a whole step, past the last window's end.
        frames[0](performance.now() + 100);
        assert.strictEqual(session.time.current?.from, alignTo(SPREAD[0], "day", KOLKATA));
        assert.strictEqual(session.time.current?.timeZone, KOLKATA);
        const recorded = steps(session, 1);
        session.time.pause();
        await recorded;
        session.dispose();
    });

    it("records a visible run's text bounds as the column reads them", async () => {
        const session = createGraphSession({ runs: { execute: oneNodeResult } });
        const edges = DAY_ROWS.map((at, index) => ({ source: "A", target: `n${String(index)}`, at }));
        await session.data.import({ type: "json", config: { data: JSON.stringify({ edges }) } });
        await session.time.setField({ edges: { start: "at", parseZone: NEW_YORK } });
        await session.visibility.setWindow(DAY_WINDOW);
        const run = session.runs.start("degree", undefined, { style: false });
        await run;
        assert.deepInclude(session.runs.get(run.id)?.caveats.window, {
            from: Date.UTC(2026, 0, 15, 5),
            to: Date.UTC(2026, 0, 16, 5),
        });
        session.dispose();
    });
});

describe("bins in a zone", () => {
    it("starts day bins at local midnight", async () => {
        const session = await edgesAt(SPREAD);
        await session.time.setField({ edges: { start: "at" } });
        const bins = session.time.bins({ step: "day", timeZone: KOLKATA }) ?? [];
        assert.strictEqual(bins[0].start, Date.UTC(2025, 11, 31, 18, 30));
        assert.strictEqual(bins[1].start, Date.UTC(2026, 0, 1, 18, 30));
        session.dispose();
    });

    it("sums to the timed total in every zone", async () => {
        const session = await edgesAt(SPREAD);
        await session.time.setField({ edges: { start: "at" } });
        for (const timeZone of ["UTC", NEW_YORK, KOLKATA, HAVANA, APIA]) {
            for (const step of ["hour", "day", "week", "month", "quarter", "year"] as const) {
                const bins = session.time.bins({ step, timeZone }) ?? [];
                assert.strictEqual(
                    bins.reduce((sum, bin) => sum + bin.edges, 0),
                    SPREAD.length,
                    `${timeZone} ${step}`,
                );
            }

            const budget = session.time.bins({ maxCount: 40, timeZone }) ?? [];
            assert.strictEqual(
                budget.reduce((sum, bin) => sum + bin.edges, 0),
                SPREAD.length,
                timeZone,
            );
        }
        session.dispose();
    });
});

describe("reading text in a zone", () => {
    it("reads zone-less text in parseZone, and leaves an offset alone", async () => {
        const session = await edgesAt([
            "2026-01-15T12:00:00",
            "2026-01-15",
            "2026-01",
            "2026",
            "Jan 15, 2026 12:00",
            "2026-01-15T12:00:00Z",
            "2026-01-15T12:00:00+01:00",
        ]);
        const result = await session.time.setField({ edges: { start: "at", parseZone: NEW_YORK } });
        assert.strictEqual(result.field?.edges?.parseZone, NEW_YORK);
        assert.strictEqual(session.time.field?.edges?.parseZone, NEW_YORK);

        assert.strictEqual(session.time.extent()?.from, Date.UTC(2026, 0, 1, 5));
        assert.strictEqual(session.time.parse("2026-01-15T12:00:00"), Date.UTC(2026, 0, 15, 17));
        assert.strictEqual(session.time.parse("Jan 15, 2026 12:00"), Date.UTC(2026, 0, 15, 17));
        assert.strictEqual(session.time.parse("2026-01-15T12:00:00Z"), Date.UTC(2026, 0, 15, 12));
        assert.strictEqual(readInstant("Jan 15, 2026 12:00", "ms", NEW_YORK).at, Date.UTC(2026, 0, 15, 17));
        assert.strictEqual(readInstant("2026-01-15T12:00:00+01:00", "ms", NEW_YORK).at, Date.UTC(2026, 0, 15, 11));
        session.dispose();
    });

    it("reads a time that does not exist as the moment after the gap, and a repeated one as the first", () => {
        assert.strictEqual(readInstant("2026-03-08T02:30:00", "ms", NEW_YORK).at, Date.UTC(2026, 2, 8, 7, 30));
        assert.strictEqual(readInstant("2026-11-01T01:30:00", "ms", NEW_YORK).at, Date.UTC(2026, 10, 1, 5, 30));
    });

    it("gives a BCE year back in a zone", () => {
        const { at } = readInstant("-000500", "ms", NEW_YORK);
        assert.strictEqual(new Date(wallClock(at, NEW_YORK)).getUTCFullYear(), -500);
        assert.strictEqual(new Date(wallClock(at, NEW_YORK)).getUTCMonth(), 0);
    });

    it("reads a year column in UTC whatever the zone", async () => {
        const session = await edgesAt([1995, 2001]);
        await session.time.setField({ edges: { start: "at", unit: "year", parseZone: LOS_ANGELES } });
        assert.strictEqual(session.time.extent()?.from, Date.UTC(1995, 0, 1));
        assert.strictEqual(session.time.parse("1995-06"), Date.UTC(1995, 5, 1));
        session.dispose();
    });

    it("names the zone it reads in: the window's, then the setting's, and UTC over a year column", async () => {
        const session = await edgesAt(SPREAD);
        await session.time.setField({ edges: { start: "at" } });
        assert.strictEqual(session.time.timeZone, "UTC");
        await session.time.setSettings({ timeZone: LOS_ANGELES });
        assert.strictEqual(session.time.timeZone, LOS_ANGELES);
        await session.time.window({ from: SPREAD[0], to: SPREAD[1], timeZone: NEW_YORK });
        assert.strictEqual(session.time.timeZone, NEW_YORK);
        session.dispose();

        const years = await edgesAt([1995, 2001]);
        await years.time.setSettings({ timeZone: LOS_ANGELES });
        await years.time.setField({ edges: { start: "at", unit: "year" } });
        assert.strictEqual(years.time.timeZone, "UTC");
        years.dispose();
    });

    it("reads a year column's text in UTC whatever the zone", async () => {
        const session = await edgesAt(["1995-06", "2001-01"]);
        await session.time.setField({ edges: { start: "at", unit: "year", parseZone: LOS_ANGELES } });
        assert.strictEqual(session.time.extent()?.from, Date.UTC(1995, 5, 1));
        assert.strictEqual(session.time.parse("1995-06", { timeZone: LOS_ANGELES }), Date.UTC(1995, 5, 1));
        session.dispose();
    });

    it("keeps a year column's calendar steps and bins in UTC whatever the zone", async () => {
        const session = await edgesAt([1995, 2001]);
        await session.time.setField({ edges: { start: "at", unit: "year" } });
        const bins = session.time.bins({ step: "year", timeZone: LOS_ANGELES }) ?? [];
        assert.strictEqual(bins[0].start, Date.UTC(1995, 0, 1));
        assert.strictEqual(bins[0].edges, 1);

        await session.time.setSettings({ step: "year", timeZone: LOS_ANGELES });
        const moved = await session.time.stepBy(1);
        assert.strictEqual(moved.from, Date.UTC(1995, 0, 1));
        assert.strictEqual(moved.to, Date.UTC(1996, 0, 1));
        session.dispose();
    });

    it("reads a window's text bounds on a year column in UTC, as parse does", async () => {
        const session = await edgesAt([1995, 2001]);
        await session.time.setField({ edges: { start: "at", unit: "year", parseZone: LOS_ANGELES } });
        await session.time.window({ from: "1995-01-01", to: "1995-02-01" });
        assert.strictEqual(session.time.current?.from, session.time.parse("1995-01-01"));
        assert.deepEqual([...session.visibility.edgeMask()], [1, 0]);
        session.dispose();
    });

    it("leaves loose text that says its own zone alone, in the column and in parse", async () => {
        const said: readonly (readonly [string, number])[] = [
            ["Jan 15, 2026 12:00 +0100", Date.UTC(2026, 0, 15, 11)],
            ["Jan 15, 2026 12:00 GMT+0100 (CET)", Date.UTC(2026, 0, 15, 11)],
            ["Thu, 15 Jan 2026 12:00:00 GMT", Date.UTC(2026, 0, 15, 12)],
            ["Jan 15, 2026 12:00 PST", Date.UTC(2026, 0, 15, 20)],
            ["2026-01-15 12:00 +01:00", Date.UTC(2026, 0, 15, 11)],
        ];
        const session = await edgesAt(said.map(([text]) => text));
        await session.time.setField({ edges: { start: "at", parseZone: KOLKATA } });
        for (const [text, at] of said) {
            assert.strictEqual(readInstant(text, "ms", KOLKATA).at, at, text);
            assert.strictEqual(session.time.parse(text), at, text);
        }

        assert.strictEqual(session.time.extent()?.from, Date.UTC(2026, 0, 15, 11));
        session.dispose();
    });

    it("reads a dashed date, a note in parentheses and a loose time as text with no zone", () => {
        const noon = Date.UTC(2026, 0, 15, 6, 30);
        assert.strictEqual(readInstant("01-15-2026 12:00", "ms", KOLKATA).at, noon);
        assert.strictEqual(readInstant("Jan 15, 2026 12:00 (GMT)", "ms", KOLKATA).at, noon);
        assert.strictEqual(readInstant("Jan 15, 2026 12:00 pm", "ms", KOLKATA).at, noon);
    });

    it("reads a date in the zone a caller names, and keeps reading in parseZone without one", async () => {
        const session = await edgesAt(["2026-01-15T12:00:00"]);
        await session.time.setField({ edges: { start: "at", parseZone: NEW_YORK } });
        assert.strictEqual(session.time.parse("2026-03-08", { timeZone: KOLKATA }), Date.UTC(2026, 2, 7, 18, 30));
        assert.strictEqual(session.time.parse("2026-03-08"), Date.UTC(2026, 2, 8, 5));
        session.dispose();
    });

    it("reads a window's text bounds in the field's zone", async () => {
        const session = await edgesAt(SPREAD);
        await session.time.setField({ edges: { start: "at", parseZone: NEW_YORK } });
        await session.time.window({ from: "2026-02-01", to: "2026-03-01", timeZone: KOLKATA });
        assert.strictEqual(session.time.current?.from, Date.UTC(2026, 1, 1, 5));
        session.dispose();
    });

    it("reads text bounds set through visibility.setWindow in the field's zone, for the mask and the steps", async () => {
        const session = await edgesAt(DAY_ROWS);
        await session.time.setField({ edges: { start: "at", parseZone: KOLKATA } });
        await session.visibility.setWindow(DAY_WINDOW);
        assert.deepEqual([...session.visibility.edgeMask()], [1, 1, 1, 0]);

        await session.visibility.setWindow({ ...DAY_WINDOW, step: "day", timeZone: KOLKATA });
        const moved = await session.time.stepBy(1);
        assert.strictEqual(moved.from, Date.UTC(2026, 0, 15, 18, 30));
        assert.deepEqual([...session.visibility.edgeMask()], [0, 0, 0, 1]);
        session.dispose();
    });

    it("takes a new parseZone as another timeline: the window goes and the instants move", async () => {
        const session = await edgesAt(["2026-01-15T12:00:00"]);
        await session.time.setField({ edges: { start: "at" } });
        await session.time.stepBy(1);
        assert.strictEqual(session.time.extent()?.from, Date.UTC(2026, 0, 15, 12));
        await session.time.setField({ edges: { start: "at", parseZone: NEW_YORK } });
        assert.isNull(session.time.current);
        assert.strictEqual(session.time.extent()?.from, Date.UTC(2026, 0, 15, 17));
        session.dispose();
    });

    it("moves a node column's instants with a new parseZone too", async () => {
        const session = createGraphSession();
        await session.data.import({
            type: "json",
            config: { data: JSON.stringify({ nodes: [{ id: "a", at: "2026-01-15T12:00:00" }], edges: [] }) },
        });
        await session.time.setField({ nodes: { start: "at" } });
        assert.strictEqual(session.time.extent()?.from, Date.UTC(2026, 0, 15, 12));
        await session.time.setField({ nodes: { start: "at", parseZone: NEW_YORK } });
        assert.strictEqual(session.time.extent()?.from, Date.UTC(2026, 0, 15, 17));
        session.dispose();
    });
});

describe.each([LOS_ANGELES, TOKYO])("on a machine in %s", (machineZone) => {
    const machine = process.env.TZ;

    beforeAll(() => {
        process.env.TZ = machineZone;
        // Without this the tests below would pass on a clock they never moved.
        assert.notStrictEqual(new Date(2026, 0, 15).getTimezoneOffset(), 0);
    });

    afterAll(() => {
        if (machine === undefined) {
            Reflect.deleteProperty(process.env, "TZ");
        } else {
            process.env.TZ = machine;
        }
    });

    describe("with the timeline on", () => {
        const NOON = "Jan 15, 2026 12:00";

        it("reads loose text in UTC when no zone is named", async () => {
            const session = await edgesAt([NOON]);
            await session.time.setField({ edges: { start: "at" } });
            assert.strictEqual(session.time.extent()?.from, Date.UTC(2026, 0, 15, 12));
            assert.strictEqual(session.time.parse(NOON), Date.UTC(2026, 0, 15, 12));
            session.dispose();
        });

        it("reads loose text in UTC when UTC is named", async () => {
            const session = await edgesAt([NOON]);
            await session.time.setField({ edges: { start: "at", parseZone: "UTC" } });
            assert.strictEqual(session.time.extent()?.from, Date.UTC(2026, 0, 15, 12));
            session.dispose();
        });

        it("reads a year column's loose text in UTC, so January 1 stays in its year", async () => {
            const session = await edgesAt(["Jan 1, 1995", "Jan 15, 2001 12:00"]);
            await session.time.setField({ edges: { start: "at", unit: "year", parseZone: KOLKATA } });
            assert.strictEqual(session.time.extent()?.from, Date.UTC(1995, 0, 1));
            assert.strictEqual(session.time.parse("Jan 1, 1995"), Date.UTC(1995, 0, 1));
            session.dispose();
        });

        it("reads a window's loose bounds in UTC, for the window and the mask", async () => {
            const session = await edgesAt(DAY_ROWS.map((row) => `${row}Z`));
            await session.time.setField({ edges: { start: "at" } });
            await session.visibility.setWindow({
                attribute: "at",
                from: "Jan 15, 2026 00:00",
                to: "Jan 15, 2026 09:00",
            });
            assert.deepEqual([...session.visibility.edgeMask()], [1, 1, 1, 0]);

            await session.time.window({ from: NOON, to: "Jan 16, 2026 12:00" });
            assert.strictEqual(session.time.current?.from, Date.UTC(2026, 0, 15, 12));
            session.dispose();
        });
    });

    describe("with the timeline off", () => {
        /** Instants on either side of a morning: the bounds below hold one or the other by zone. */
        const ROWS = ["2026-01-15T03:00:00Z", "2026-01-15T12:00:00Z"];

        /**
         * The edge mask of a designated column under a window.
         * @param values - The column's values.
         * @param from - The window's start.
         * @param to - The window's end.
         * @returns The mask.
         */
        async function maskOf(
            values: readonly string[],
            from: number | string,
            to: number | string,
        ): Promise<readonly number[]> {
            const session = await edgesAt(values, OFF);
            await session.config.set({ data: { knownFields: { edgeTimePath: "at" } } });
            await session.visibility.setWindow({ attribute: "at", from, to });
            const mask = [...session.visibility.edgeMask()];
            session.dispose();

            return mask;
        }

        it("reads a zone-less date-time bound as Date.parse does", async () => {
            const from = "2026-01-15T00:00:00";
            const to = "2026-01-15T09:00:00";
            assert.deepEqual(await maskOf(ROWS, from, to), await maskOf(ROWS, Date.parse(from), Date.parse(to)));
        });

        it("reads a column's loose text as Date.parse does, under a window a project saved", async () => {
            const text = "Jan 15, 2026 12:00";
            const at = Date.parse(text);
            const session = await edgesAt([text]);
            await session.time.setField({ edges: { start: "at" } });
            await session.visibility.setWindow({ attribute: "at", from: at, to: at + 1 });
            const saved = await session.project.save();
            const reopened = createGraphSession(OFF);
            await reopened.project.open(saved.text);
            assert.deepEqual([...reopened.visibility.edgeMask()], [1]);
            session.dispose();
            reopened.dispose();
        });
    });
});

describe("zone names", () => {
    it("refuses a bad name at every door", async () => {
        const session = await edgesAt(SPREAD);
        await session.time.setField({ edges: { start: "at" } });
        const expected = ["E_BAD_COMMAND", "time-zone"] as const;
        const bad = "Mars/Olympus";
        const window = { attribute: "data.at", from: SPREAD[0], to: SPREAD[1], timeZone: bad };

        assert.deepEqual(
            await refusal(() => session.time.setField({ edges: { start: "at", parseZone: bad } })),
            expected,
        );
        assert.deepEqual(await refusal(() => session.time.setSettings({ timeZone: bad })), expected);
        assert.deepEqual(await refusal(() => session.time.window({ step: "day", timeZone: bad })), expected);
        assert.deepEqual(await refusal(() => session.time.bins({ step: "day", timeZone: bad })), expected);
        const play = (): void => {
            session.time.play({ timeZone: bad });
        };
        assert.deepEqual(await refusal(play), expected);
        assert.deepEqual(await refusal(() => session.time.parse("2026", { timeZone: bad })), expected);
        assert.deepEqual(await refusal(() => session.visibility.setWindow(window)), expected);
        assert.isFalse(session.time.playing);
        session.dispose();
    });
});

describe("what is saved", () => {
    it("restores timeZone and parseZone with the project", async () => {
        const session = await edgesAt(SPREAD);
        await session.time.setField({ edges: { start: "at", parseZone: NEW_YORK } });
        await session.time.setSettings({ timeZone: KOLKATA, step: "day" });
        await session.time.stepBy(1);
        const { text } = await session.project.save();
        const reopened = createGraphSession();
        await reopened.project.open(text);
        assert.strictEqual(reopened.time.settings.timeZone, KOLKATA);
        assert.strictEqual(reopened.time.field?.edges?.parseZone, NEW_YORK);
        assert.strictEqual(reopened.time.current?.timeZone, KOLKATA);
        session.dispose();
        reopened.dispose();
    });

    it("keeps a saved parseZone this engine cannot read, and reads the column in UTC", async () => {
        const session = await edgesAt(["2026-01-15T12:00:00"]);
        await session.time.setField({ edges: { start: "at", parseZone: NEW_YORK } });
        const { text } = await session.project.save();
        const reopened = createGraphSession();
        await reopened.project.open(text.replaceAll(NEW_YORK, BAD_ZONE));
        assert.strictEqual(reopened.config.data.knownFields.edgeTimeParseZone, BAD_ZONE);
        assert.strictEqual(reopened.time.extent()?.from, Date.UTC(2026, 0, 15, 12));
        session.dispose();
        reopened.dispose();
    });

    it("keeps UTC out of the file: a default setting is no setting", async () => {
        const session = await edgesAt(SPREAD);
        await session.time.setField({ edges: { start: "at" } });
        await session.time.setSettings({ timeZone: NEW_YORK });
        await session.time.setSettings({ timeZone: "UTC" });
        await session.time.stepBy(1);
        assert.strictEqual(session.time.settings.timeZone, "UTC");
        assert.isUndefined(session.time.current?.timeZone);
        session.dispose();
    });
});

describe("with the timeline off", () => {
    it("accepts and saves a window's timeZone, even a bad one, and its masks are today's", async () => {
        const window = { attribute: "at", from: SPREAD[0], to: SPREAD[30] };
        const plain = await edgesAt(SPREAD, OFF);
        const zoned = await edgesAt(SPREAD, OFF);
        await plain.visibility.setWindow(window);
        await zoned.visibility.setWindow({ ...window, timeZone: "Mars/Olympus" });
        assert.strictEqual(zoned.visibility.window?.timeZone, "Mars/Olympus");
        assert.deepEqual([...zoned.visibility.edgeMask()], [...plain.visibility.edgeMask()]);
        assert.deepEqual([...zoned.visibility.nodeMask()], [...plain.visibility.nodeMask()]);
        plain.dispose();
        zoned.dispose();
    });

    it("keeps a saved parseZone and does not read it", async () => {
        const session = await edgesAt(["2026-01-15T12:00:00"], OFF);
        await session.config.set({ data: { knownFields: { edgeTimePath: "at", edgeTimeParseZone: KOLKATA } } });
        assert.strictEqual(session.config.data.knownFields.edgeTimeParseZone, KOLKATA);
        assert.strictEqual(session.time.parse("2026-01-15T12:00:00"), Date.UTC(2026, 0, 15, 12));
        session.dispose();
    });

    it("does not read a saved parseZone on nodes either", async () => {
        const session = createGraphSession();
        await session.data.import({
            type: "json",
            config: { data: JSON.stringify({ nodes: [{ id: "a", at: "2026-01-15T12:00:00" }], edges: [] }) },
        });
        await session.time.setField({ nodes: { start: "at", parseZone: KOLKATA } });
        const from = Date.UTC(2026, 0, 15, 11);
        await session.visibility.setWindow({ attribute: "at", from, to: from + 2 * HOUR });
        assert.deepEqual([...session.visibility.nodeMask()], [0]);
        const { text } = await session.project.save();
        const reopened = createGraphSession(OFF);
        await reopened.project.open(text);
        assert.strictEqual(reopened.config.data.knownFields.nodeTimeParseZone, KOLKATA);
        assert.strictEqual(reopened.time.parse("2026-01-15T12:00:00"), Date.UTC(2026, 0, 15, 12));
        assert.deepEqual([...reopened.visibility.nodeMask()], [1]);
        session.dispose();
        reopened.dispose();
    });

    it("reads parse as before: a passed timeZone, good or bad, changes nothing", async () => {
        const session = await edgesAt(SPREAD, OFF);
        const plain = session.time.parse("2026-03-08");
        assert.strictEqual(plain, Date.UTC(2026, 2, 8));
        assert.strictEqual(session.time.parse("2026-03-08", { timeZone: KOLKATA }), plain);
        assert.strictEqual(session.time.parse("2026-03-08", { timeZone: BAD_ZONE }), plain);
        session.dispose();
    });

    it("reads a window's text bounds as before, in whatever zone the field saved", async () => {
        const plain = await edgesAt(DAY_ROWS, OFF);
        const zoned = await edgesAt(DAY_ROWS, OFF);
        await zoned.config.set({ data: { knownFields: { edgeTimePath: "at", edgeTimeParseZone: KOLKATA } } });
        await plain.visibility.setWindow(DAY_WINDOW);
        await zoned.visibility.setWindow(DAY_WINDOW);
        assert.deepEqual([...zoned.visibility.edgeMask()], [...plain.visibility.edgeMask()]);
        plain.dispose();
        zoned.dispose();
    });

    it("reads a bound of plain digits as Date.parse does, not as an epoch", async () => {
        const session = createGraphSession(OFF);
        const edges = [{ source: "a", target: "b", at: 5 }];
        await session.data.import({ type: "json", config: { data: JSON.stringify({ edges }) } });
        await session.config.set({ data: { knownFields: { edgeTimePath: "at" } } });
        await session.visibility.setWindow({ attribute: "at", from: "1", to: "2030" });
        assert.deepEqual([...session.visibility.edgeMask()], [0]);
        session.dispose();
    });

    it("saves and opens a project with every zone it holds unchanged, even a bad one", async () => {
        const session = await edgesAt(SPREAD, OFF);
        await session.config.set({
            data: { knownFields: { nodeTimeParseZone: KOLKATA, edgeTimeParseZone: BAD_ZONE, edgeTimePath: "at" } },
        });
        await session.visibility.setWindow({ attribute: "at", from: SPREAD[0], to: SPREAD[30], timeZone: BAD_ZONE });
        const { text } = await session.project.save();
        const reopened = createGraphSession(OFF);
        await reopened.project.open(text);
        const { knownFields } = reopened.config.data;
        assert.strictEqual(knownFields.edgeTimePath, "at");
        assert.strictEqual(knownFields.nodeTimeParseZone, KOLKATA);
        assert.strictEqual(knownFields.edgeTimeParseZone, BAD_ZONE);
        assert.strictEqual(reopened.visibility.window?.timeZone, BAD_ZONE);
        session.dispose();
        reopened.dispose();
    });

    it("keeps a saved playback whole when its zone is one this engine cannot read", async () => {
        const session = await edgesAt(SPREAD);
        await session.time.setField({ edges: { start: "at" } });
        await session.time.setSettings({ step: "day", outside: "ghost", timeZone: NEW_YORK });
        const { text } = await session.project.save();
        const reopened = createGraphSession(OFF);
        await reopened.project.open(text.replaceAll(NEW_YORK, BAD_ZONE));
        const saved = await reopened.project.save();
        assert.include(saved.text, BAD_ZONE);
        assert.include(saved.text, '"step":"day"');
        session.dispose();
        reopened.dispose();
    });
});
